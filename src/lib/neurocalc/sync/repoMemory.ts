import crypto from "node:crypto";
import type { ScaleRecord } from "../../../types/neurocalc.ts";
import { computeRootHashFromEntries } from "./jsonPatch.ts";
import { RepoError, type ScaleRepo } from "./repo.ts";
import type {
  JsonPatchOp,
  RevisionRow,
  SyncRetentionConfig,
  SyncRow,
  SyncState,
} from "./types.ts";

const DEFAULT_CONFIG: SyncRetentionConfig = {
  tombstoneRetentionDays: 90,
  revisionRetentionDays: 90,
  revisionKeepMinPerUid: 5,
  verifiedRevisionRetentionDays: 365,
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeActor(actor: string): string {
  const trimmed = actor.trim();
  return trimmed ? trimmed : "system";
}

function normalizeSlug(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.trim().toLowerCase();
}

export class MemoryScaleRepo implements ScaleRepo {
  private readonly records = new Map<string, SyncRow>();
  private readonly revisions = new Map<string, RevisionRow[]>();
  private nextSeq = 0;
  private nextRevisionId = 0;
  private purgeHorizonSeq = 0;
  private rootHash: string;
  private readonly config: SyncRetentionConfig;
  private readonly now: () => Date;

  constructor(opts?: {
    config?: Partial<SyncRetentionConfig>;
    now?: () => Date;
  }) {
    this.config = { ...DEFAULT_CONFIG, ...(opts?.config ?? {}) };
    this.now = opts?.now ?? (() => new Date());
    this.rootHash = computeRootHashFromEntries([]);
  }

  private recomputeRootHashInternal(): string {
    const liveEntries = Array.from(this.records.values())
      .filter((r) => r.deletedAt === null)
      .map((r) => ({
        uid: r.uid,
        rev: r.rev,
        contentHash: r.contentHash,
      }));
    this.rootHash = computeRootHashFromEntries(liveEntries);
    return this.rootHash;
  }

  async recomputeRootHash(): Promise<string> {
    return this.recomputeRootHashInternal();
  }

  async getSyncState(): Promise<SyncState> {
    return {
      maxSeq: this.nextSeq,
      purgeHorizonSeq: this.purgeHorizonSeq,
      rootHash: this.rootHash,
    };
  }

  async changesSince(
    since: number,
    limit: number
  ): Promise<{
    rows: SyncRow[];
    maxSeq: number;
    purgeHorizonSeq: number;
    rootHash: string;
  }> {
    const clampedLimit = Math.max(1, Math.min(Math.floor(limit) || 500, 500));
    const rows = Array.from(this.records.values())
      .filter((r) => r.changeSeq > since)
      .sort((a, b) => a.changeSeq - b.changeSeq)
      .slice(0, clampedLimit)
      .map((r) => clone(r));

    return {
      rows,
      maxSeq: this.nextSeq,
      purgeHorizonSeq: this.purgeHorizonSeq,
      rootHash: this.rootHash,
    };
  }

  async getByUid(uid: string): Promise<SyncRow | null> {
    const found = this.records.get(uid);
    return found ? clone(found) : null;
  }

  async create(
    data: ScaleRecord,
    contentHash: string,
    sectionHashes: Record<string, string>,
    actor: string,
    opts?: { skipRootRehash?: boolean }
  ): Promise<SyncRow> {
    const slug = normalizeSlug(data?.id);
    if (!slug) {
      throw new RepoError("INVALID_SLUG", "Scale id must be a non-empty slug");
    }

    for (const existing of this.records.values()) {
      if (existing.deletedAt === null && existing.slug === slug) {
        throw new RepoError("SLUG_TAKEN", `Scale slug '${slug}' is already live`);
      }
    }

    const uid = crypto.randomUUID();
    const nowIso = this.now().toISOString();
    const cleanActor = normalizeActor(actor);
    const storedData: ScaleRecord = { ...clone(data), id: slug };
    this.nextSeq += 1;
    const seq = this.nextSeq;

    const row: SyncRow = {
      uid,
      slug,
      data: storedData,
      contentHash,
      sectionHashes: clone(sectionHashes),
      rev: 1,
      changeSeq: seq,
      createdAt: nowIso,
      updatedAt: nowIso,
      updatedBy: cleanActor,
      deletedAt: null,
    };

    this.records.set(uid, row);

    this.nextRevisionId += 1;
    this.revisions.set(uid, [
      {
        id: this.nextRevisionId,
        uid,
        rev: 1,
        changeSeq: seq,
        op: "insert",
        slug,
        data: clone(storedData),
        contentHash,
        patchDiff: [],
        status: storedData.status ?? null,
        actor: cleanActor,
        createdAt: nowIso,
      },
    ]);

    if (!opts?.skipRootRehash) {
      this.recomputeRootHashInternal();
    }

    return clone(row);
  }

  async update(
    uid: string,
    expectedRev: number,
    data: ScaleRecord,
    contentHash: string,
    sectionHashes: Record<string, string>,
    patchDiff: JsonPatchOp[],
    actor: string
  ): Promise<{ row: SyncRow; unchanged: boolean }> {
    const current = this.records.get(uid);
    if (!current || current.deletedAt !== null) {
      throw new RepoError("NOT_FOUND", `Scale '${uid}' not found`);
    }
    if (current.rev !== expectedRev) {
      throw new RepoError(
        "REV_CONFLICT",
        `Expected rev ${expectedRev}, but current rev is ${current.rev}`,
        { currentRev: current.rev, currentRow: clone(current) }
      );
    }

    const slug = normalizeSlug(data?.id);
    if (!slug) {
      throw new RepoError("INVALID_SLUG", "Scale id must be a non-empty slug");
    }

    if (current.contentHash === contentHash && current.slug === slug) {
      return { row: clone(current), unchanged: true };
    }

    if (slug !== current.slug) {
      for (const other of this.records.values()) {
        if (other.uid !== uid && other.deletedAt === null && other.slug === slug) {
          throw new RepoError("SLUG_TAKEN", `Scale slug '${slug}' is already live`);
        }
      }
    }

    const nowIso = this.now().toISOString();
    const cleanActor = normalizeActor(actor);
    const storedData: ScaleRecord = { ...clone(data), id: slug };
    this.nextSeq += 1;
    const seq = this.nextSeq;
    const newRev = current.rev + 1;

    const updated: SyncRow = {
      ...current,
      slug,
      data: storedData,
      contentHash,
      sectionHashes: clone(sectionHashes),
      rev: newRev,
      changeSeq: seq,
      updatedAt: nowIso,
      updatedBy: cleanActor,
    };

    this.records.set(uid, updated);

    this.nextRevisionId += 1;
    const list = this.revisions.get(uid) ?? [];
    list.push({
      id: this.nextRevisionId,
      uid,
      rev: newRev,
      changeSeq: seq,
      op: "update",
      slug,
      data: clone(storedData),
      contentHash,
      patchDiff: clone(patchDiff),
      status: storedData.status ?? null,
      actor: cleanActor,
      createdAt: nowIso,
    });
    this.revisions.set(uid, list);

    this.recomputeRootHashInternal();
    return { row: clone(updated), unchanged: false };
  }

  async remove(uid: string, expectedRev: number, actor: string): Promise<SyncRow> {
    const current = this.records.get(uid);
    if (!current || current.deletedAt !== null) {
      throw new RepoError("NOT_FOUND", `Scale '${uid}' not found`);
    }
    if (current.rev !== expectedRev) {
      throw new RepoError(
        "REV_CONFLICT",
        `Expected rev ${expectedRev}, but current rev is ${current.rev}`,
        { currentRev: current.rev, currentRow: clone(current) }
      );
    }

    const nowIso = this.now().toISOString();
    const cleanActor = normalizeActor(actor);
    this.nextSeq += 1;
    const seq = this.nextSeq;
    const newRev = current.rev + 1;

    const deleted: SyncRow = {
      ...current,
      rev: newRev,
      changeSeq: seq,
      updatedAt: nowIso,
      updatedBy: cleanActor,
      deletedAt: nowIso,
    };

    this.records.set(uid, deleted);

    this.nextRevisionId += 1;
    const list = this.revisions.get(uid) ?? [];
    list.push({
      id: this.nextRevisionId,
      uid,
      rev: newRev,
      changeSeq: seq,
      op: "delete",
      slug: current.slug,
      data: clone(current.data),
      contentHash: current.contentHash,
      patchDiff: [],
      status: current.data.status ?? null,
      actor: cleanActor,
      createdAt: nowIso,
    });
    this.revisions.set(uid, list);

    this.recomputeRootHashInternal();
    return clone(deleted);
  }

  async history(uid: string): Promise<RevisionRow[]> {
    const list = this.revisions.get(uid) ?? [];
    return [...list].sort((a, b) => b.rev - a.rev).map((r) => clone(r));
  }

  async restore(
    uid: string,
    expectedRev: number,
    revisionRev: number,
    contentHash: string,
    sectionHashes: Record<string, string>,
    patchDiff: JsonPatchOp[],
    actor: string
  ): Promise<SyncRow> {
    const current = this.records.get(uid);
    if (!current) {
      throw new RepoError("NOT_FOUND", `Scale '${uid}' not found`);
    }
    if (current.rev !== expectedRev) {
      throw new RepoError(
        "REV_CONFLICT",
        `Expected rev ${expectedRev}, but current rev is ${current.rev}`,
        { currentRev: current.rev, currentRow: clone(current) }
      );
    }

    const revList = this.revisions.get(uid) ?? [];
    const targetRev = revList.find((r) => r.rev === revisionRev);
    if (!targetRev) {
      throw new RepoError(
        "NOT_FOUND",
        `Revision ${revisionRev} for scale '${uid}' not found`
      );
    }

    const slug = normalizeSlug(targetRev.data?.id ?? targetRev.slug);
    if (!slug) {
      throw new RepoError("INVALID_SLUG", "Restored scale slug is empty");
    }

    for (const other of this.records.values()) {
      if (other.uid !== uid && other.deletedAt === null && other.slug === slug) {
        throw new RepoError("SLUG_TAKEN", `Scale slug '${slug}' is already live`);
      }
    }

    const restoredData: ScaleRecord = {
      ...clone(targetRev.data),
      id: slug,
      status: "draft",
      verification: {
        verified_by: null,
        verified_at: null,
        content_hash: null,
      },
    };

    const nowIso = this.now().toISOString();
    const cleanActor = normalizeActor(actor);
    this.nextSeq += 1;
    const seq = this.nextSeq;
    const newRev = current.rev + 1;

    const restored: SyncRow = {
      ...current,
      slug,
      data: restoredData,
      contentHash,
      sectionHashes: clone(sectionHashes),
      rev: newRev,
      changeSeq: seq,
      deletedAt: null,
      updatedAt: nowIso,
      updatedBy: cleanActor,
    };

    this.records.set(uid, restored);

    this.nextRevisionId += 1;
    revList.push({
      id: this.nextRevisionId,
      uid,
      rev: newRev,
      changeSeq: seq,
      op: "restore",
      slug,
      data: clone(restoredData),
      contentHash,
      patchDiff: clone(patchDiff),
      status: "draft",
      actor: cleanActor,
      createdAt: nowIso,
    });
    this.revisions.set(uid, revList);

    this.recomputeRootHashInternal();
    return clone(restored);
  }

  async purge(now?: Date): Promise<{
    tombstonesPurged: number;
    revisionsPurged: number;
    purgeHorizonSeq: number;
  }> {
    const refTime = (now ?? this.now()).getTime();
    const tombstoneCutoff =
      refTime - this.config.tombstoneRetentionDays * 86_400_000;
    const revisionCutoff =
      refTime - this.config.revisionRetentionDays * 86_400_000;
    const verifiedRevisionCutoff =
      refTime - this.config.verifiedRevisionRetentionDays * 86_400_000;

    let tombstonesPurged = 0;
    let maxPurgedSeq = 0;

    for (const [uid, row] of this.records.entries()) {
      if (row.deletedAt !== null) {
        const deletedMs = Date.parse(row.deletedAt);
        if (Number.isFinite(deletedMs) && deletedMs < tombstoneCutoff) {
          this.records.delete(uid);
          tombstonesPurged += 1;
          if (row.changeSeq > maxPurgedSeq) {
            maxPurgedSeq = row.changeSeq;
          }
        }
      }
    }

    if (maxPurgedSeq > this.purgeHorizonSeq) {
      this.purgeHorizonSeq = maxPurgedSeq;
    }

    let revisionsPurged = 0;
    for (const [uid, list] of this.revisions.entries()) {
      const sortedDesc = [...list].sort((a, b) => b.rev - a.rev);
      const kept: RevisionRow[] = [];
      sortedDesc.forEach((rv, idx) => {
        const createdMs = Date.parse(rv.createdAt);
        const withinMinKeep = idx < this.config.revisionKeepMinPerUid;
        const withinNormalRetention =
          !Number.isFinite(createdMs) || createdMs >= revisionCutoff;
        const withinVerifiedRetention =
          rv.status === "verified" &&
          Number.isFinite(createdMs) &&
          createdMs >= verifiedRevisionCutoff;

        if (withinMinKeep || withinNormalRetention || withinVerifiedRetention) {
          kept.push(rv);
        } else {
          revisionsPurged += 1;
        }
      });
      this.revisions.set(uid, kept.reverse());
    }

    this.recomputeRootHashInternal();

    return {
      tombstonesPurged,
      revisionsPurged,
      purgeHorizonSeq: this.purgeHorizonSeq,
    };
  }
}
