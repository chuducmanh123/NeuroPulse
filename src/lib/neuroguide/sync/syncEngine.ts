import {
  createFetchChanges,
  createSyncEngine as sharedCreateSyncEngine,
  type CreateSyncEngineOptions as SharedCreateSyncEngineOptions,
  type FetchChangesFn as SharedFetchChangesFn,
  type FetchChangesParams,
  type FetchChangesResponseBody as SharedFetchChangesResponseBody,
  type FetchChangesResult as SharedFetchChangesResult,
  type SyncEngine as SharedSyncEngine,
  type SyncEngineSnapshot as SharedSyncEngineSnapshot,
  type SyncSignal,
  type SyncStatus,
} from "../../sync/syncEngine.ts";
import { computeProtocolMerkleHash } from "./blockGraph.ts";
import type { BlockLocalStore, ProtocolLocalStore } from "./localStore.ts";
import type {
  NeuroGuideContentBlockRow,
  NeuroGuideProtocolRow,
} from "./types.ts";

export type {
  SyncStatus,
  FetchChangesParams,
  SyncSignal,
};

export type BlockSyncEngineSnapshot = SharedSyncEngineSnapshot<NeuroGuideContentBlockRow>;
export type BlockFetchChangesResponseBody = SharedFetchChangesResponseBody<NeuroGuideContentBlockRow>;
export type BlockFetchChangesResult = SharedFetchChangesResult<NeuroGuideContentBlockRow>;
export type BlockFetchChangesFn = SharedFetchChangesFn<NeuroGuideContentBlockRow>;
export type CreateBlockSyncEngineOptions = SharedCreateSyncEngineOptions<NeuroGuideContentBlockRow>;
export type BlockSyncEngine = SharedSyncEngine<NeuroGuideContentBlockRow>;

export type ProtocolSyncEngineSnapshot = SharedSyncEngineSnapshot<NeuroGuideProtocolRow>;
export type ProtocolFetchChangesResponseBody = SharedFetchChangesResponseBody<NeuroGuideProtocolRow>;
export type ProtocolFetchChangesResult = SharedFetchChangesResult<NeuroGuideProtocolRow>;
export type ProtocolFetchChangesFn = SharedFetchChangesFn<NeuroGuideProtocolRow>;
export type CreateProtocolSyncEngineOptions = SharedCreateSyncEngineOptions<NeuroGuideProtocolRow>;
export type ProtocolSyncEngine = SharedSyncEngine<NeuroGuideProtocolRow>;

export const BLOCKS_SYNC_ENDPOINT = "/api/neuroguide/sync/changes?tier=blocks";
export const PROTOCOLS_SYNC_ENDPOINT = "/api/neuroguide/sync/changes?tier=protocols";

export const defaultFetchBlockChanges: BlockFetchChangesFn =
  createFetchChanges<NeuroGuideContentBlockRow>(BLOCKS_SYNC_ENDPOINT);

export const defaultFetchProtocolChanges: ProtocolFetchChangesFn =
  createFetchChanges<NeuroGuideProtocolRow>(PROTOCOLS_SYNC_ENDPOINT);

export function createBlockSyncEngine(
  options: CreateBlockSyncEngineOptions,
): BlockSyncEngine {
  return sharedCreateSyncEngine<NeuroGuideContentBlockRow>({
    endpoint: BLOCKS_SYNC_ENDPOINT,
    ...options,
  });
}

export function createProtocolSyncEngine(
  options: CreateProtocolSyncEngineOptions,
): ProtocolSyncEngine {
  return sharedCreateSyncEngine<NeuroGuideProtocolRow>({
    endpoint: PROTOCOLS_SYNC_ENDPOINT,
    applyChangesOptions: { allowSameRevHigherSeq: true },
    ...options,
  });
}

export interface NeuroGuideGraphSyncSnapshot {
  blocks: ReadonlyMap<string, NeuroGuideContentBlockRow>;
  protocols: ReadonlyMap<string, NeuroGuideProtocolRow>;
  /** Alias of blocks so RealtimeSyncBridge can inspect snapshot uniformly */
  rows: ReadonlyMap<string, NeuroGuideContentBlockRow>;
  status: SyncStatus;
  lastSeq: number;
  rootHash: string;
  eTag: string;
  lastSyncAt: string | null;
  lastChangeCount: number;
  blockChangeCount: number;
  error: string | null;
}

export interface CreateNeuroGuideGraphSyncEngineOptions {
  blockStore: BlockLocalStore;
  protocolStore: ProtocolLocalStore;
  fetchBlockChanges?: BlockFetchChangesFn;
  fetchProtocolChanges?: ProtocolFetchChangesFn;
  limit?: number;
  now?: () => Date;
  onSignal?: (tier: "blocks" | "protocols", signal: SyncSignal) => void;
}

export interface NeuroGuideGraphSyncEngine {
  readonly blockEngine: BlockSyncEngine;
  readonly protocolEngine: ProtocolSyncEngine;
  start(): Promise<NeuroGuideGraphSyncSnapshot>;
  pull(): Promise<NeuroGuideGraphSyncSnapshot>;
  applyLocalBlockWrite(row: NeuroGuideContentBlockRow): Promise<NeuroGuideGraphSyncSnapshot>;
  applyLocalProtocolWrite(row: NeuroGuideProtocolRow): Promise<NeuroGuideGraphSyncSnapshot>;
  subscribe(listener: (snapshot: NeuroGuideGraphSyncSnapshot) => void): () => void;
  getSnapshot(): NeuroGuideGraphSyncSnapshot;
  stop(): void;
}

function combineStatus(a: SyncStatus, b: SyncStatus): SyncStatus {
  if (a === "error" || b === "error") return "error";
  if (a === "offline" || b === "offline") return "offline";
  if (a === "syncing" || b === "syncing") return "syncing";
  if (a === "ready" && b === "ready") return "ready";
  if ((a === "ready" || b === "ready") && (a !== "idle" || b !== "idle")) {
    return a === "ready" ? b : a;
  }
  return "idle";
}

function pickLatestIso(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a >= b ? a : b;
}

function buildCombinedSnapshot(
  bs: BlockSyncEngineSnapshot,
  ps: ProtocolSyncEngineSnapshot,
): NeuroGuideGraphSyncSnapshot {
  return {
    blocks: bs.rows,
    protocols: ps.rows,
    rows: bs.rows,
    status: combineStatus(bs.status, ps.status),
    lastSeq: Math.max(bs.lastSeq, ps.lastSeq),
    rootHash: ps.rootHash || bs.rootHash,
    eTag: ps.eTag || bs.eTag,
    lastSyncAt: pickLatestIso(bs.lastSyncAt, ps.lastSyncAt),
    lastChangeCount: bs.lastChangeCount + ps.lastChangeCount,
    blockChangeCount: bs.lastChangeCount,
    error: bs.error ?? ps.error,
  };
}

/**
 * Coordinated 2-tier offline-first client sync engine synchronizing both
 * NeuroGuide content blocks (Tier-3) and protocol nodes (Tier-2 Merkle tree).
 */
export function createNeuroGuideGraphSyncEngine(
  options: CreateNeuroGuideGraphSyncEngineOptions,
): NeuroGuideGraphSyncEngine {
  const {
    blockStore,
    protocolStore,
    fetchBlockChanges,
    fetchProtocolChanges,
    limit,
    now,
    onSignal,
  } = options;

  const blockEngine = createBlockSyncEngine({
    store: blockStore,
    fetchChanges: fetchBlockChanges,
    limit,
    now,
    onSignal: onSignal ? (sig) => onSignal("blocks", sig) : undefined,
  });

  const protocolEngine = createProtocolSyncEngine({
    store: protocolStore,
    fetchChanges: fetchProtocolChanges,
    limit,
    now,
    onSignal: onSignal ? (sig) => onSignal("protocols", sig) : undefined,
  });

  const listeners = new Set<(snapshot: NeuroGuideGraphSyncSnapshot) => void>();
  let current = buildCombinedSnapshot(
    blockEngine.getSnapshot(),
    protocolEngine.getSnapshot(),
  );

  function notify(): NeuroGuideGraphSyncSnapshot {
    current = buildCombinedSnapshot(
      blockEngine.getSnapshot(),
      protocolEngine.getSnapshot(),
    );
    for (const listener of Array.from(listeners)) {
      listener(current);
    }
    return current;
  }

  const unsubBlocks = blockEngine.subscribe(() => {
    notify();
  });
  const unsubProtos = protocolEngine.subscribe(() => {
    notify();
  });

  async function start(): Promise<NeuroGuideGraphSyncSnapshot> {
    await Promise.all([blockEngine.start(), protocolEngine.start()]);
    return notify();
  }

  async function pull(): Promise<NeuroGuideGraphSyncSnapshot> {
    await Promise.all([blockEngine.pull(), protocolEngine.pull()]);
    return notify();
  }

  async function applyLocalBlockWrite(
    row: NeuroGuideContentBlockRow,
  ): Promise<NeuroGuideGraphSyncSnapshot> {
    await blockEngine.applyLocalWrite(row);

    const blocksAfter = blockEngine.getSnapshot().rows;
    const protocolsSnap = protocolEngine.getSnapshot().rows;

    for (const proto of protocolsSnap.values()) {
      if (proto.deletedAt !== null || !proto.blockOrder.includes(row.uid)) {
        continue;
      }

      const orderedLiveHashes: string[] = [];
      for (const bUid of proto.blockOrder) {
        const b = blocksAfter.get(bUid);
        if (b && b.deletedAt === null) {
          orderedLiveHashes.push(b.contentHash);
        }
      }

      const nextProtocolHash = computeProtocolMerkleHash(
        proto.metadataHash,
        orderedLiveHashes,
      );
      if (nextProtocolHash === proto.protocolHash) {
        continue;
      }

      const updatedProto: NeuroGuideProtocolRow = {
        ...proto,
        protocolHash: nextProtocolHash,
        changeSeq:
          row.changeSeq > proto.changeSeq ? row.changeSeq : proto.changeSeq + 1,
        updatedAt: (now ? now() : new Date()).toISOString(),
      };
      await protocolEngine.applyLocalWrite(updatedProto);
    }

    return notify();
  }

  async function applyLocalProtocolWrite(
    row: NeuroGuideProtocolRow,
  ): Promise<NeuroGuideGraphSyncSnapshot> {
    await protocolEngine.applyLocalWrite(row);
    return notify();
  }

  function subscribe(
    listener: (snapshot: NeuroGuideGraphSyncSnapshot) => void,
  ): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function getSnapshot(): NeuroGuideGraphSyncSnapshot {
    return current;
  }

  function stop(): void {
    unsubBlocks();
    unsubProtos();
    listeners.clear();
    blockEngine.stop();
    protocolEngine.stop();
  }

  return {
    blockEngine,
    protocolEngine,
    start,
    pull,
    applyLocalBlockWrite,
    applyLocalProtocolWrite,
    subscribe,
    getSnapshot,
    stop,
  };
}
