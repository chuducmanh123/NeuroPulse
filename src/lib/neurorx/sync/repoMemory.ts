import type { DrugRecord } from "../../../types/neurorx.ts";
import { computeRootHashFromEntries } from "./jsonPatch.ts";
import { RepoError, type DrugRepo } from "./repo.ts";
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

function normalizeSlug(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.trim().toLowerCase();
}

function generateUuidV4(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * In-memory DrugRepo replicating the exact semantics of 20261113_neurorx_sync_v2.sql.
 */
export class MemoryDrugRepo implements DrugRepo {
  private readonly rows = new Map<string, SyncRow>();
  private readonly revisions: RevisionRow[] = [];
  private readonly config: SyncRetentionConfig;
  private readonly nowProvider: () => Date;

  private seq = 0;
  private revisionIdSeq = 0;
  private purgeHorizonSeq = 0;
  private rootHash = "";

  constructor(opts?: { config?: Partial<SyncRetentionConfig>; now?: () => Date }) {
    this.config = { ...DEFAULT_CONFIG, ...opts?.config };
    this.nowProvider = opts?.now ?? (() => new Date());
  }

  /** Test helper to simulate aged tombstones when verifying purge(). */
  backdateTombstone(uid: string, deletedAt: Date): void {
    const row = this.rows.get(uid);
    if (!row || row.deletedAt === null) {
      throw new Error(`Cannot backdate non-tombstone row ${uid}`);
    }
    row.deletedAt = deletedAt.toISOString();
  }

  /** Test helper to simulate aged revisions when verifying purge(). */
  backdateRevision(uid: string, rev: number, createdAt: Date): void {
    const target = this.revisions.find((r) => r.uid === uid && r.rev === rev);
    if (!target) {
      throw new Error(`Revision ${rev} not found for uid ${uid}`);
    }
    target.createdAt = createdAt.toISOString();
  }

  getRetentionConfig(): SyncRetentionConfig {
    return { ...this.config };
  }

  async getSyncState(): Promise<SyncState> {
    return {
      maxSeq: this.seq,
      purgeHorizonSeq: this.purgeHorizonSeq,
      rootHash: this.rootHash,
    };
  }

  async changesSince(since: number, limit: number): Promise<{
    rows: SyncRow[];
    maxSeq: number;
    purgeHorizonSeq: number;
    rootHash: string;
  }> {
    const safeSince = Number.isFinite(since) ? since : 0;
    const safeLimit = Math.max(1, Math.min(limit || 500, 500));

    const matching = Array.from(this.rows.values())
      .filter((r) => r.changeSeq > safeSince)
      .sort((a, b) => a.changeSeq - b.changeSeq)
      .slice(0, safeLimit)
      .map((r) => structuredClone(r));

    return {
      rows: matching,
      maxSeq: this.seq,
      purgeHorizonSeq: this.purgeHorizonSeq,
      rootHash: this.rootHash,
    };
  }

  async getByUid(uid: string): Promise<SyncRow | null> {
    const row = this.rows.get(uid);
    return row ? structuredClone(row) : null;
  }

  async recomputeRootHash(): Promise<string> {
    const liveEntries = Array.from(this.rows.values())
      .filter((r) => r.deletedAt === null)
      .map((r) => ({ uid: r.uid, rev: r.rev, contentHash: r.contentHash }));
    this.rootHash = computeRootHashFromEntries(liveEntries);
    return this.rootHash;
  }

  async create(
    data: DrugRecord,
    contentHash: string,
    sectionHashes: Record<string, string>,
    actor: string,
    opts?: { skipRootRehash?: boolean }
  ): Promise<SyncRow> {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new RepoError("INVALID_DATA", "p_data must be a JSON object");
    }

    const slug = normalizeSlug(data.id);
    if (!slug) {
      throw new RepoError("INVALID_SLUG", "data.id must be a non-empty slug");
    }

    for (const existing of this.rows.values()) {
      if (existing.deletedAt === null && existing.slug === slug) {
        throw new RepoError("SLUG_TAKEN", `NRX_SLUG_TAKEN:${slug}`);
      }
    }

    const nowIso = this.nowProvider().toISOString();
    const uid = generateUuidV4();
    const normalizedData: DrugRecord = { ...structuredClone(data), id: slug };
    const cleanActor = actor?.trim() || "system";
    const seq = ++this.seq;

    const row: SyncRow = {
      uid,
      slug,
      data: normalizedData,
      contentHash,
      sectionHashes: structuredClone(sectionHashes ?? {}),
      rev: 1,
      changeSeq: seq,
      createdAt: nowIso,
      updatedAt: nowIso,
      updatedBy: cleanActor,
      deletedAt: null,
    };
    this.rows.set(uid, row);

    this.revisions.push({
      id: ++this.revisionIdSeq,
      uid,
      rev: 1,
      changeSeq: seq,
      op: "insert",
      slug,
      data: structuredClone(normalizedData),
      contentHash,
      patchDiff: [],
      status: normalizedData.status ?? null,
      actor: cleanActor,
      createdAt: nowIso,
    });

    if (!opts?.skipRootRehash) {
      await this.recomputeRootHash();
    }

    return structuredClone(row);
  }

  async update(
    uid: string,
    expectedRev: number,
    data: DrugRecord,
    contentHash: string,
    sectionHashes: Record<string, string>,
    patchDiff: JsonPatchOp[],
    actor: string
  ): Promise<{ row: SyncRow; unchanged: boolean }> {
    const existing = this.rows.get(uid);
    if (!existing || existing.deletedAt !== null) {
      throw new RepoError("NOT_FOUND", `NRX_NOT_FOUND:${uid}`);
    }

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new RepoError("INVALID_DATA", "p_data must be a JSON object");
    }

    const slug = normalizeSlug(data.id);
    if (!slug) {
      throw new RepoError("INVALID_SLUG", "data.id must be a non-empty slug");
    }

    if (existing.rev !== expectedRev) {
      throw new RepoError(
        "REV_CONFLICT",
        `NRX_REV_CONFLICT:${existing.rev}`,
        { currentRev: existing.rev, currentRow: structuredClone(existing) }
      );
    }

    // Invariant I13: short-circuit unchanged writes without advancing rev/seq/revisions.
    if (existing.contentHash === contentHash && existing.slug === slug) {
      return { row: structuredClone(existing), unchanged: true };
    }

    if (slug !== existing.slug) {
      for (const other of this.rows.values()) {
        if (other.deletedAt === null && other.slug === slug && other.uid !== uid) {
          throw new RepoError("SLUG_TAKEN", `NRX_SLUG_TAKEN:${slug}`);
        }
      }
    }

    const nowIso = this.nowProvider().toISOString();
    const normalizedData: DrugRecord = { ...structuredClone(data), id: slug };
    const cleanActor = actor?.trim() || "system";
    const newRev = existing.rev + 1;
    const seq = ++this.seq;

    existing.slug = slug;
    existing.data = normalizedData;
    existing.contentHash = contentHash;
    existing.sectionHashes = structuredClone(sectionHashes ?? {});
    existing.rev = newRev;
    existing.changeSeq = seq;
    existing.updatedAt = nowIso;
    existing.updatedBy = cleanActor;

    this.revisions.push({
      id: ++this.revisionIdSeq,
      uid,
      rev: newRev,
      changeSeq: seq,
      op: "update",
      slug,
      data: structuredClone(normalizedData),
      contentHash,
      patchDiff: structuredClone(patchDiff ?? []),
      status: normalizedData.status ?? null,
      actor: cleanActor,
      createdAt: nowIso,
    });

    await this.recomputeRootHash();

    return { row: structuredClone(existing), unchanged: false };
  }

  async remove(uid: string, expectedRev: number, actor: string): Promise<SyncRow> {
    const existing = this.rows.get(uid);
    if (!existing || existing.deletedAt !== null) {
      throw new RepoError("NOT_FOUND", `NRX_NOT_FOUND:${uid}`);
    }

    if (existing.rev !== expectedRev) {
      throw new RepoError(
        "REV_CONFLICT",
        `NRX_REV_CONFLICT:${existing.rev}`,
        { currentRev: existing.rev, currentRow: structuredClone(existing) }
      );
    }

    const nowIso = this.nowProvider().toISOString();
    const cleanActor = actor?.trim() || "system";
    const newRev = existing.rev + 1;
    const seq = ++this.seq;

    existing.deletedAt = nowIso;
    existing.rev = newRev;
    existing.changeSeq = seq;
    existing.updatedAt = nowIso;
    existing.updatedBy = cleanActor;

    this.revisions.push({
      id: ++this.revisionIdSeq,
      uid,
      rev: newRev,
      changeSeq: seq,
      op: "delete",
      slug: existing.slug,
      data: structuredClone(existing.data),
      contentHash: existing.contentHash,
      patchDiff: [],
      status: existing.data.status ?? null,
      actor: cleanActor,
      createdAt: nowIso,
    });

    await this.recomputeRootHash();

    return structuredClone(existing);
  }

  async history(uid: string): Promise<RevisionRow[]> {
    return this.revisions
      .filter((r) => r.uid === uid)
      .sort((a, b) => b.rev - a.rev)
      .map((r) => structuredClone(r));
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
    const existing = this.rows.get(uid);
    if (!existing) {
      throw new RepoError("NOT_FOUND", `NRX_NOT_FOUND:${uid}`);
    }

    if (existing.rev !== expectedRev) {
      throw new RepoError(
        "REV_CONFLICT",
        `NRX_REV_CONFLICT:${existing.rev}`,
        { currentRev: existing.rev, currentRow: structuredClone(existing) }
      );
    }

    const targetRev = this.revisions.find(
      (r) => r.uid === uid && r.rev === revisionRev
    );
    if (!targetRev) {
      throw new RepoError("NOT_FOUND", `NRX_NOT_FOUND:revision ${revisionRev}`);
    }

    const slug = normalizeSlug(targetRev.data?.id ?? targetRev.slug);
    if (!slug) {
      throw new RepoError("INVALID_SLUG", "Restored revision slug is empty");
    }

    for (const other of this.rows.values()) {
      if (other.deletedAt === null && other.slug === slug && other.uid !== uid) {
        throw new RepoError("SLUG_TAKEN", `NRX_SLUG_TAKEN:${slug}`);
      }
    }

    // Pitfall P9 / G1.5: strip verification metadata and force status='draft'.
    const cloned = structuredClone(targetRev.data) as unknown as Record<string, unknown>;
    delete cloned.verification;
    cloned.id = slug;
    cloned.status = "draft";
    const restoredData = cloned as unknown as DrugRecord;

    const nowIso = this.nowProvider().toISOString();
    const cleanActor = actor?.trim() || "system";
    const effectiveHash = contentHash.trim() || targetRev.contentHash;
    const newRev = existing.rev + 1;
    const seq = ++this.seq;

    existing.slug = slug;
    existing.data = restoredData;
    existing.contentHash = effectiveHash;
    existing.sectionHashes = structuredClone(sectionHashes ?? {});
    existing.rev = newRev;
    existing.changeSeq = seq;
    existing.deletedAt = null;
    existing.updatedAt = nowIso;
    existing.updatedBy = cleanActor;

    this.revisions.push({
      id: ++this.revisionIdSeq,
      uid,
      rev: newRev,
      changeSeq: seq,
      op: "restore",
      slug,
      data: structuredClone(restoredData),
      contentHash: effectiveHash,
      patchDiff: structuredClone(patchDiff ?? []),
      status: "draft",
      actor: cleanActor,
      createdAt: nowIso,
    });

    await this.recomputeRootHash();

    return structuredClone(existing);
  }

  async purge(now?: Date): Promise<{
    tombstonesPurged: number;
    revisionsPurged: number;
    purgeHorizonSeq: number;
  }> {
    const refTime = (now ?? this.nowProvider()).getTime();
    const msPerDay = 86_400_000;
    const tombstoneCutoff = refTime - this.config.tombstoneRetentionDays * msPerDay;
    const revisionCutoff = refTime - this.config.revisionRetentionDays * msPerDay;
    const verifiedCutoff =
      refTime - this.config.verifiedRevisionRetentionDays * msPerDay;

    let tombstonesPurged = 0;
    let maxPurgedSeq = 0;

    for (const [uid, row] of Array.from(this.rows.entries())) {
      if (row.deletedAt !== null && Date.parse(row.deletedAt) < tombstoneCutoff) {
        this.rows.delete(uid);
        tombstonesPurged += 1;
        if (row.changeSeq > maxPurgedSeq) {
          maxPurgedSeq = row.changeSeq;
        }
      }
    }

    if (maxPurgedSeq > this.purgeHorizonSeq) {
      this.purgeHorizonSeq = maxPurgedSeq;
    }

    // Group revisions by uid, sorted rev desc, to keep newest N per uid.
    const byUid = new Map<string, RevisionRow[]>();
    for (const rv of this.revisions) {
      const list = byUid.get(rv.uid) ?? [];
      list.push(rv);
      byUid.set(rv.uid, list);
    }

    const doomedIds = new Set<number>();
    for (const list of byUid.values()) {
      list.sort((a, b) => b.rev - a.rev);
      list.forEach((rv, index) => {
        const rank = index + 1;
        const createdMs = Date.parse(rv.createdAt);
        const withinMin = rank <= this.config.revisionKeepMinPerUid;
        const withinNormal = createdMs >= revisionCutoff;
        const withinVerified =
          rv.status === "verified" && createdMs >= verifiedCutoff;

        if (!withinMin && !withinNormal && !withinVerified) {
          doomedIds.add(rv.id);
        }
      });
    }

    let revisionsPurged = 0;
    for (let i = this.revisions.length - 1; i >= 0; i--) {
      if (doomedIds.has(this.revisions[i].id)) {
        this.revisions.splice(i, 1);
        revisionsPurged += 1;
      }
    }

    await this.recomputeRootHash();

    return {
      tombstonesPurged,
      revisionsPurged,
      purgeHorizonSeq: this.purgeHorizonSeq,
    };
  }
}
