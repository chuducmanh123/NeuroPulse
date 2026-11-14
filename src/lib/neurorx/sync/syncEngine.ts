import { applyChanges } from "./applyChanges.ts";
import type { LocalStore } from "./localStore.ts";
import type { SyncRow } from "./types.ts";

export type SyncStatus = "idle" | "syncing" | "ready" | "offline" | "error";

export interface SyncEngineSnapshot {
  rows: ReadonlyMap<string, SyncRow>;
  status: SyncStatus;
  lastSeq: number;
  rootHash: string;
  eTag: string;
  lastSyncAt: string | null;
  lastChangeCount: number;
  error: string | null;
}

export interface FetchChangesParams {
  since: number;
  limit?: number;
  ifNoneMatch?: string;
}

export interface FetchChangesResponseBody {
  changes: SyncRow[];
  maxSeq: number;
  rootHash: string;
  hasMore: boolean;
  reset: boolean;
}

export type FetchChangesResult =
  | {
      status: 304;
      eTag?: string | null;
    }
  | {
      status: 200;
      eTag?: string | null;
      body: FetchChangesResponseBody;
    };

export type FetchChangesFn = (params: FetchChangesParams) => Promise<FetchChangesResult>;

export type SyncSignal =
  | { type: "loaded"; rowCount: number; lastSeq: number }
  | { type: "not_modified"; lastSeq: number }
  | { type: "applied"; appliedCount: number; removedCount: number; lastSeq: number }
  | { type: "reset" }
  | { type: "offline"; error: string }
  | { type: "error"; error: string };

export interface CreateSyncEngineOptions {
  store: LocalStore;
  fetchChanges?: FetchChangesFn;
  limit?: number;
  now?: () => Date;
  onSignal?: (signal: SyncSignal) => void;
}

export interface SyncEngine {
  start(): Promise<SyncEngineSnapshot>;
  pull(): Promise<SyncEngineSnapshot>;
  applyLocalWrite(row: SyncRow): Promise<SyncEngineSnapshot>;
  subscribe(listener: (snapshot: SyncEngineSnapshot) => void): () => void;
  getSnapshot(): SyncEngineSnapshot;
  stop(): void;
}

export async function defaultFetchChanges(params: FetchChangesParams): Promise<FetchChangesResult> {
  if (typeof globalThis.fetch !== "function") {
    throw new Error("globalThis.fetch is not available in this environment");
  }
  const search = new URLSearchParams();
  search.set("since", String(params.since));
  if (params.limit !== undefined) {
    search.set("limit", String(params.limit));
  }
  const headers: Record<string, string> = {};
  if (params.ifNoneMatch) {
    headers["If-None-Match"] = params.ifNoneMatch;
  }

  const response = await globalThis.fetch(`/api/neurorx/sync/changes?${search.toString()}`, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  const eTag = response.headers.get("ETag");
  if (response.status === 304) {
    return { status: 304, eTag };
  }
  if (!response.ok) {
    throw new Error(`Sync fetch failed with HTTP ${response.status}`);
  }
  const body = (await response.json()) as FetchChangesResponseBody;
  return { status: 200, eTag, body };
}

class SyncStoreCommitError extends Error {
  constructor(cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause));
    this.name = "SyncStoreCommitError";
  }
}

function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Creates the offline-first, single-flight NeuroRx client sync engine.
 */
export function createSyncEngine(options: CreateSyncEngineOptions): SyncEngine {
  const { store, limit, now = () => new Date(), onSignal } = options;
  const fetchChanges = options.fetchChanges ?? defaultFetchChanges;

  const listeners = new Set<(snapshot: SyncEngineSnapshot) => void>();
  const tombstoneRevs = new Map<string, number>();

  let rows = new Map<string, SyncRow>();
  let status: SyncStatus = "idle";
  let lastSeq = 0;
  let rootHash = "";
  let eTag = "";
  let lastSyncAt: string | null = null;
  let lastChangeCount = 0;
  let lastError: string | null = null;

  let loaded = false;
  let loadPromise: Promise<void> | null = null;
  let inFlightPull: Promise<SyncEngineSnapshot> | null = null;
  let queuedFollowUp = false;
  let stopped = false;

  let currentSnapshot: SyncEngineSnapshot = buildSnapshot();

  function buildSnapshot(): SyncEngineSnapshot {
    return {
      rows: new Map(rows),
      status,
      lastSeq,
      rootHash,
      eTag,
      lastSyncAt,
      lastChangeCount,
      error: lastError,
    };
  }

  function emit(): SyncEngineSnapshot {
    currentSnapshot = buildSnapshot();
    for (const listener of Array.from(listeners)) {
      listener(currentSnapshot);
    }
    return currentSnapshot;
  }

  function filterStaleResurrections(incoming: readonly SyncRow[]): SyncRow[] {
    const filtered: SyncRow[] = [];
    for (const row of incoming) {
      const tombstoneRev = tombstoneRevs.get(row.uid);
      if (tombstoneRev !== undefined) {
        if (row.deletedAt === null) {
          if (row.rev <= tombstoneRev) {
            continue;
          }
          // Genuine restore at a strictly newer revision supersedes the tombstone watermark.
          tombstoneRevs.delete(row.uid);
        } else if (row.rev > tombstoneRev) {
          tombstoneRevs.set(row.uid, row.rev);
        }
      } else if (row.deletedAt !== null) {
        tombstoneRevs.set(row.uid, row.rev);
      }
      filtered.push(row);
    }
    return filtered;
  }

  async function ensureLoaded(): Promise<void> {
    if (loaded) {
      return;
    }
    if (!loadPromise) {
      loadPromise = (async () => {
        const snapshot = await store.load();
        rows = new Map(snapshot.rows);
        lastSeq = snapshot.lastSeq;
        rootHash = snapshot.rootHash;
        eTag = snapshot.eTag;
        lastSyncAt = snapshot.lastSyncAt;
        loaded = true;
        emit();
        onSignal?.({ type: "loaded", rowCount: rows.size, lastSeq });
      })().finally(() => {
        loadPromise = null;
      });
    }
    await loadPromise;
  }

  async function commitToStore(
    applied: readonly SyncRow[],
    removedUids: readonly string[],
    nextLastSeq: number,
    nextRootHash: string,
    nextETag: string,
    syncTime: string,
  ): Promise<void> {
    try {
      await store.commit(applied, removedUids, nextLastSeq, nextRootHash, nextETag, syncTime);
    } catch (error) {
      throw new SyncStoreCommitError(error);
    }
  }

  async function runSinglePullCycle(): Promise<void> {
    if (stopped) {
      return;
    }

    if (
      typeof globalThis.navigator === "object" &&
      globalThis.navigator !== null &&
      globalThis.navigator.onLine === false
    ) {
      status = "offline";
      lastError = "Browser reports offline";
      emit();
      onSignal?.({ type: "offline", error: lastError });
      return;
    }

    status = "syncing";
    lastError = null;
    emit();

    let cursorSince = lastSeq;
    let didResetThisCycle = false;
    let totalChangesInCycle = 0;

    try {
      while (!stopped) {
        const sendETag = cursorSince === lastSeq && eTag ? eTag : undefined;
        const result = await fetchChanges({
          since: cursorSince,
          limit,
          ifNoneMatch: sendETag,
        });

        if (stopped) {
          return;
        }

        const syncTime = now().toISOString();

        if (result.status === 304) {
          if (result.eTag) {
            eTag = result.eTag;
          }
          lastSyncAt = syncTime;
          lastChangeCount = 0;
          lastError = null;
          status = "ready";
          emit();
          onSignal?.({ type: "not_modified", lastSeq });
          return;
        }

        const { body } = result;
        if (body.reset) {
          if (didResetThisCycle) {
            status = "error";
            lastError = "Repeated server reset signal within single pull cycle";
            emit();
            onSignal?.({ type: "error", error: lastError });
            return;
          }
          try {
            await store.reset();
          } catch (error) {
            throw new SyncStoreCommitError(error);
          }
          rows = new Map();
          lastSeq = 0;
          rootHash = "";
          eTag = "";
          lastSyncAt = null;
          lastChangeCount = 0;
          tombstoneRevs.clear();
          cursorSince = 0;
          didResetThisCycle = true;
          onSignal?.({ type: "reset" });
          continue;
        }

        const changes = Array.isArray(body.changes) ? body.changes : [];
        let pageMaxSeq = cursorSince;
        for (const change of changes) {
          if (typeof change.changeSeq === "number" && change.changeSeq > pageMaxSeq) {
            pageMaxSeq = change.changeSeq;
          }
        }

        const filteredChanges = filterStaleResurrections(changes);
        const deltaResult = applyChanges(rows, filteredChanges);
        totalChangesInCycle += deltaResult.applied.length + deltaResult.removed.length;

        const hasMore = Boolean(body.hasMore);
        const targetSeq = hasMore
          ? Math.max(lastSeq, pageMaxSeq)
          : Math.max(lastSeq, pageMaxSeq, typeof body.maxSeq === "number" ? body.maxSeq : 0);

        const isOutdatedResponse =
          !hasMore && typeof body.maxSeq === "number" && body.maxSeq < lastSeq;

        // During multi-page pulls, checkpoint durable rows + page watermark without
        // prematurely claiming final rootHash/ETag until hasMore is false.
        const nextRootHash = hasMore
          ? ""
          : isOutdatedResponse
            ? rootHash
            : body.rootHash || rootHash;
        const nextETag = hasMore
          ? ""
          : isOutdatedResponse
            ? eTag
            : (result.eTag ?? eTag);

        const needsCommit =
          deltaResult.applied.length > 0 ||
          deltaResult.removed.length > 0 ||
          targetSeq !== lastSeq ||
          nextRootHash !== rootHash ||
          nextETag !== eTag;

        if (needsCommit) {
          await commitToStore(
            deltaResult.applied,
            deltaResult.removed,
            targetSeq,
            nextRootHash,
            nextETag,
            syncTime,
          );
        }

        rows = deltaResult.next;
        lastSeq = targetSeq;
        rootHash = nextRootHash;
        eTag = nextETag;
        lastSyncAt = syncTime;
        lastChangeCount = totalChangesInCycle;
        lastError = null;

        onSignal?.({
          type: "applied",
          appliedCount: deltaResult.applied.length,
          removedCount: deltaResult.removed.length,
          lastSeq,
        });

        if (!hasMore) {
          status = "ready";
          emit();
          return;
        }

        // Guard against malformed server responses where hasMore=true without cursor progress.
        if (changes.length === 0 || pageMaxSeq <= cursorSince) {
          status = "ready";
          emit();
          return;
        }

        cursorSince = pageMaxSeq;
        emit();
      }
    } catch (error) {
      const message = formatErrorMessage(error);
      lastError = message;
      if (error instanceof SyncStoreCommitError) {
        status = "error";
        emit();
        onSignal?.({ type: "error", error: message });
      } else {
        status = "offline";
        emit();
        onSignal?.({ type: "offline", error: message });
      }
    }
  }

  async function pull(): Promise<SyncEngineSnapshot> {
    if (stopped) {
      return currentSnapshot;
    }
    if (inFlightPull) {
      queuedFollowUp = true;
      return inFlightPull;
    }

    inFlightPull = (async () => {
      await ensureLoaded();
      let runNext = true;
      while (!stopped && runNext) {
        queuedFollowUp = false;
        await runSinglePullCycle();
        runNext = queuedFollowUp;
      }
      return currentSnapshot;
    })().finally(() => {
      inFlightPull = null;
    });

    return inFlightPull;
  }

  async function start(): Promise<SyncEngineSnapshot> {
    if (stopped) {
      return currentSnapshot;
    }
    await ensureLoaded();
    return pull();
  }

  async function applyLocalWrite(row: SyncRow): Promise<SyncEngineSnapshot> {
    if (stopped) {
      return currentSnapshot;
    }
    await ensureLoaded();

    const filtered = filterStaleResurrections([row]);
    if (filtered.length === 0) {
      return currentSnapshot;
    }

    const deltaResult = applyChanges(rows, filtered);
    if (deltaResult.applied.length === 0 && deltaResult.removed.length === 0) {
      return currentSnapshot;
    }

    const writeTime = now().toISOString();
    try {
      // Preserve lastSeq (I8) so intermediate changes from other tabs are not skipped.
      await commitToStore(
        deltaResult.applied,
        deltaResult.removed,
        lastSeq,
        rootHash,
        eTag,
        lastSyncAt ?? writeTime,
      );
    } catch (error) {
      lastError = formatErrorMessage(error);
      status = "error";
      emit();
      onSignal?.({ type: "error", error: lastError });
      return currentSnapshot;
    }

    rows = deltaResult.next;
    lastChangeCount = deltaResult.applied.length + deltaResult.removed.length;
    lastError = null;
    emit();
    return currentSnapshot;
  }

  function subscribe(listener: (snapshot: SyncEngineSnapshot) => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function getSnapshot(): SyncEngineSnapshot {
    return currentSnapshot;
  }

  function stop(): void {
    stopped = true;
    queuedFollowUp = false;
    listeners.clear();
    store.close?.();
  }

  return {
    start,
    pull,
    applyLocalWrite,
    subscribe,
    getSnapshot,
    stop,
  };
}
