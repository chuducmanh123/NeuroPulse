import { computeRootHashFromEntries } from "../../sync/jsonPatch.ts";
import {
  computeNeuroGuideRootHash,
  computeProtocolMerkleHash,
  normalizeLookupKey,
} from "./blockGraph.ts";
import { RepoError, type NeuroGuideRepo } from "./repo.ts";
import type {
  JsonPatchOp,
  NeuroGuideBlockLinkEdge,
  NeuroGuideBlockMutateResult,
  NeuroGuideBlockRevisionRow,
  NeuroGuideBlockType,
  NeuroGuideContentBlockData,
  NeuroGuideContentBlockRow,
  NeuroGuideOverlappingFacetFilter,
  NeuroGuideProtocolBlockEdge,
  NeuroGuideProtocolMutateResult,
  NeuroGuideProtocolRow,
  NeuroGuideProtocolUpsertInput,
  SyncRetentionConfig,
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

function normalizeBlockKey(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.trim();
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

function extractBlockStatus(data: unknown): string {
  if (!data || typeof data !== "object") return "draft";
  const rec = data as Record<string, unknown>;
  const topStatus = typeof rec.status === "string" ? rec.status.trim() : "";
  if (topStatus) return topStatus;

  const payload =
    rec.payload && typeof rec.payload === "object"
      ? (rec.payload as Record<string, unknown>)
      : null;
  if (payload) {
    const pc =
      payload.practiceChange && typeof payload.practiceChange === "object"
        ? (payload.practiceChange as Record<string, unknown>)
        : null;
    if (pc && typeof pc.status === "string" && pc.status.trim()) {
      return pc.status.trim();
    }
    const trial =
      payload.trial && typeof payload.trial === "object"
        ? (payload.trial as Record<string, unknown>)
        : null;
    if (trial && typeof trial.status === "string" && trial.status.trim()) {
      return trial.status.trim();
    }
  }
  return "draft";
}

function defaultRoleForBlockType(
  blockType: NeuroGuideBlockType
): "recommendation" | "shared" | "trial" | "scenario" | "atom" {
  switch (blockType) {
    case "shared_clinical_block":
      return "shared";
    case "pivotal_trial":
    case "late_breaking_trial":
      return "trial";
    case "clinical_scenario":
      return "scenario";
    case "recommendation_atom":
      return "atom";
    default:
      return "recommendation";
  }
}

function arraysEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function hasAnyCaseInsensitive(haystack: readonly string[] | undefined, needles: readonly string[]): boolean {
  if (needles.length === 0) return true;
  if (!Array.isArray(haystack) || haystack.length === 0) return false;
  const set = new Set(haystack.map((v) => String(v).toLowerCase()));
  return needles.some((n) => set.has(String(n).toLowerCase()));
}

/**
 * In-memory NeuroGuideRepo replicating the exact semantics of
 * supabase/migrations/20261118_neuroguide_granular_sync_v2.sql.
 */
export class MemoryNeuroGuideRepo implements NeuroGuideRepo {
  private readonly blocks = new Map<string, NeuroGuideContentBlockRow>();
  private readonly protocols = new Map<string, NeuroGuideProtocolRow>();
  private readonly protocolEdges = new Map<string, NeuroGuideProtocolBlockEdge[]>();
  private blockLinks: NeuroGuideBlockLinkEdge[] = [];
  private readonly revisions: NeuroGuideBlockRevisionRow[] = [];
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

  /** Test helper to simulate aged block tombstones when verifying purge(). */
  backdateBlockTombstone(uid: string, deletedAt: Date): void {
    const row = this.blocks.get(uid);
    if (!row || row.deletedAt === null) {
      throw new Error(`Cannot backdate non-tombstone block ${uid}`);
    }
    row.deletedAt = deletedAt.toISOString();
  }

  /** Test helper to simulate aged protocol tombstones when verifying purge(). */
  backdateProtocolTombstone(uid: string, deletedAt: Date): void {
    const row = this.protocols.get(uid);
    if (!row || row.deletedAt === null) {
      throw new Error(`Cannot backdate non-tombstone protocol ${uid}`);
    }
    row.deletedAt = deletedAt.toISOString();
  }

  /** Test helper to simulate aged revisions when verifying purge(). */
  backdateRevision(uid: string, rev: number, createdAt: Date): void {
    const target = this.revisions.find((r) => r.uid === uid && r.rev === rev);
    if (!target) {
      throw new Error(`Revision ${rev} not found for block uid ${uid}`);
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

  async changesSince(
    since: number,
    limit: number
  ): Promise<{
    rows: NeuroGuideContentBlockRow[];
    maxSeq: number;
    purgeHorizonSeq: number;
    rootHash: string;
  }> {
    const safeSince = Number.isFinite(since) ? since : 0;
    const safeLimit = Math.max(1, Math.min(limit || 500, 500));

    const matching = Array.from(this.blocks.values())
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

  async protocolChangesSince(
    since: number,
    limit: number
  ): Promise<{
    rows: NeuroGuideProtocolRow[];
    maxSeq: number;
    purgeHorizonSeq: number;
    rootHash: string;
  }> {
    const safeSince = Number.isFinite(since) ? since : 0;
    const safeLimit = Math.max(1, Math.min(limit || 500, 500));

    const matching = Array.from(this.protocols.values())
      .filter((p) => p.changeSeq > safeSince)
      .sort((a, b) => a.changeSeq - b.changeSeq)
      .slice(0, safeLimit)
      .map((p) => structuredClone(p));

    return {
      rows: matching,
      maxSeq: this.seq,
      purgeHorizonSeq: this.purgeHorizonSeq,
      rootHash: this.rootHash,
    };
  }

  async getBlockByUid(uid: string): Promise<NeuroGuideContentBlockRow | null> {
    const row = this.blocks.get(uid);
    return row ? structuredClone(row) : null;
  }

  async getProtocolByUid(uid: string): Promise<NeuroGuideProtocolRow | null> {
    const row = this.protocols.get(uid);
    return row ? structuredClone(row) : null;
  }

  async listLiveProtocols(): Promise<NeuroGuideProtocolRow[]> {
    return Array.from(this.protocols.values())
      .filter((p) => p.deletedAt === null)
      .sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
      .map((p) => structuredClone(p));
  }

  async listProtocolEdges(protocolUid?: string): Promise<NeuroGuideProtocolBlockEdge[]> {
    if (protocolUid) {
      return structuredClone(this.protocolEdges.get(protocolUid) ?? []).sort(
        (a, b) => a.position - b.position
      );
    }
    const all: NeuroGuideProtocolBlockEdge[] = [];
    for (const list of this.protocolEdges.values()) {
      for (const edge of list) {
        all.push(structuredClone(edge));
      }
    }
    return all.sort((a, b) =>
      a.protocolUid !== b.protocolUid
        ? a.protocolUid < b.protocolUid
          ? -1
          : 1
        : a.position - b.position
    );
  }

  async listBlockLinks(srcBlockUid?: string): Promise<NeuroGuideBlockLinkEdge[]> {
    const filtered = srcBlockUid
      ? this.blockLinks.filter((l) => l.srcBlockUid === srcBlockUid)
      : this.blockLinks;
    return filtered.map((l) => structuredClone(l));
  }

  private computeProtocolHashFromRow(
    metadataHash: string,
    blockOrder: readonly string[]
  ): string {
    const orderedLiveHashes: string[] = [];
    for (const bUid of blockOrder) {
      const b = this.blocks.get(bUid);
      if (b && b.deletedAt === null) {
        orderedLiveHashes.push(b.contentHash);
      }
    }
    return computeProtocolMerkleHash(metadataHash, orderedLiveHashes);
  }

  async recomputeProtocolHash(protocolUid: string): Promise<string> {
    const proto = this.protocols.get(protocolUid);
    if (!proto) {
      throw new RepoError("NOT_FOUND", `NG_NOT_FOUND:protocol ${protocolUid}`);
    }
    const nextHash = this.computeProtocolHashFromRow(proto.metadataHash, proto.blockOrder);
    proto.protocolHash = nextHash;
    proto.updatedAt = this.nowProvider().toISOString();
    return nextHash;
  }

  async recomputeRootHash(): Promise<string> {
    const liveProtocols = Array.from(this.protocols.values()).filter(
      (p) => p.deletedAt === null
    );
    if (liveProtocols.length > 0) {
      this.rootHash = computeNeuroGuideRootHash(liveProtocols);
    } else {
      const liveBlockEntries = Array.from(this.blocks.values())
        .filter((b) => b.deletedAt === null)
        .map((b) => ({ uid: b.uid, rev: b.rev, contentHash: b.contentHash }));
      this.rootHash = computeRootHashFromEntries(liveBlockEntries);
    }
    return this.rootHash;
  }

  private async recomputeAffectedProtocols(blockUid: string, seq?: number): Promise<string[]> {
    const affected: NeuroGuideProtocolRow[] = [];

    for (const proto of this.protocols.values()) {
      if (proto.deletedAt !== null) continue;
      const edges = this.protocolEdges.get(proto.uid) ?? [];
      const linked =
        edges.some((e) => e.blockUid === blockUid) || proto.blockOrder.includes(blockUid);
      if (linked) {
        affected.push(proto);
      }
    }

    affected.sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));

    const tags = [`block:${blockUid}`];
    const nowIso = this.nowProvider().toISOString();

    for (const proto of affected) {
      proto.protocolHash = this.computeProtocolHashFromRow(
        proto.metadataHash,
        proto.blockOrder
      );
      if (seq !== undefined) {
        proto.changeSeq = seq;
      }
      proto.updatedAt = nowIso;
      tags.push(`protocol:${proto.slug}`);
    }

    return tags;
  }

  private syncProtocolEdges(
    protocolUid: string,
    blockOrder: readonly string[],
    edges?: NeuroGuideProtocolUpsertInput["edges"]
  ): void {
    const nextEdges: NeuroGuideProtocolBlockEdge[] = [];
    if (Array.isArray(edges) && edges.length > 0) {
      const dedup = new Map<string, NeuroGuideProtocolBlockEdge>();
      for (let i = 0; i < edges.length; i++) {
        const e = edges[i];
        const pos = Number.isFinite(e.position) ? e.position : i;
        const key = `${e.blockUid}:${pos}`;
        dedup.set(key, {
          protocolUid,
          blockUid: e.blockUid,
          position: pos,
          sectionPath: e.sectionPath ?? "",
          role: e.role || "recommendation",
        });
      }
      nextEdges.push(...dedup.values());
    } else if (blockOrder.length > 0) {
      for (let i = 0; i < blockOrder.length; i++) {
        const bUid = blockOrder[i];
        const block = this.blocks.get(bUid);
        nextEdges.push({
          protocolUid,
          blockUid: bUid,
          position: i,
          sectionPath: block?.data.facetIndex.sectionPath ?? "",
          role: block ? defaultRoleForBlockType(block.blockType) : "recommendation",
        });
      }
    }
    this.protocolEdges.set(protocolUid, nextEdges);
  }

  async upsertProtocol(
    input: NeuroGuideProtocolUpsertInput,
    actor: string
  ): Promise<NeuroGuideProtocolMutateResult> {
    const slug = normalizeSlug(input.slug);
    if (!slug) {
      throw new RepoError("INVALID_SLUG", "NG_INVALID_SLUG:p_slug must be non-empty");
    }

    const cleanActor = actor?.trim() || "system";
    const blockOrder = [...(input.blockOrder ?? [])];
    const metadataHash = input.metadataHash ?? "";
    const nextProtoHash = this.computeProtocolHashFromRow(metadataHash, blockOrder);

    let existing: NeuroGuideProtocolRow | undefined;
    if (input.uid) {
      const byUid = this.protocols.get(input.uid);
      if (byUid && byUid.deletedAt === null) {
        existing = byUid;
      }
    }
    if (!existing) {
      for (const p of this.protocols.values()) {
        if (p.deletedAt === null && p.slug === slug) {
          existing = p;
          break;
        }
      }
    }

    if (existing) {
      if (input.expectedRev !== undefined && existing.rev !== input.expectedRev) {
        throw new RepoError("REV_CONFLICT", `NG_REV_CONFLICT:${existing.rev}`, {
          currentRev: existing.rev,
          currentRow: structuredClone(existing),
        });
      }

      if (
        existing.metadataHash === metadataHash &&
        existing.protocolHash === nextProtoHash &&
        arraysEqual(existing.blockOrder, blockOrder) &&
        existing.slug === slug
      ) {
        return { row: structuredClone(existing), unchanged: true };
      }

      if (slug !== existing.slug) {
        for (const other of this.protocols.values()) {
          if (other.deletedAt === null && other.slug === slug && other.uid !== existing.uid) {
            throw new RepoError("SLUG_TAKEN", `NG_SLUG_TAKEN:${slug}`);
          }
        }
      }

      this.syncProtocolEdges(existing.uid, blockOrder, input.edges);

      const seq = ++this.seq;
      const nowIso = this.nowProvider().toISOString();

      existing.slug = slug;
      existing.protocolType = input.protocolType || existing.protocolType;
      existing.society = input.society ?? existing.society;
      existing.year = Number.isFinite(input.year) ? input.year : existing.year;
      existing.title = input.title ?? existing.title;
      existing.status = input.status || existing.status;
      existing.subspecialties = structuredClone(input.subspecialties ?? []);
      existing.metadata = structuredClone(input.metadata ?? existing.metadata);
      existing.blockOrder = blockOrder;
      existing.metadataHash = metadataHash;
      existing.protocolHash = nextProtoHash;
      existing.rev += 1;
      existing.changeSeq = seq;
      existing.updatedAt = nowIso;
      existing.updatedBy = cleanActor;

      if (!input.skipRootRehash) {
        await this.recomputeRootHash();
      }

      return { row: structuredClone(existing), unchanged: false };
    }

    const uid = input.uid && !this.protocols.has(input.uid) ? input.uid : generateUuidV4();
    const seq = ++this.seq;
    const nowIso = this.nowProvider().toISOString();

    const created: NeuroGuideProtocolRow = {
      uid,
      slug,
      protocolType: input.protocolType,
      society: input.society ?? "",
      year: input.year ?? 0,
      title: input.title ?? "",
      status: input.status || "published",
      subspecialties: structuredClone(input.subspecialties ?? []),
      metadata: structuredClone(input.metadata),
      blockOrder,
      metadataHash,
      protocolHash: nextProtoHash,
      rev: 1,
      changeSeq: seq,
      createdAt: nowIso,
      updatedAt: nowIso,
      updatedBy: cleanActor,
      deletedAt: null,
    };

    this.protocols.set(uid, created);
    this.syncProtocolEdges(uid, blockOrder, input.edges);

    if (!input.skipRootRehash) {
      await this.recomputeRootHash();
    }

    return { row: structuredClone(created), unchanged: false };
  }

  async deleteProtocol(
    uid: string,
    expectedRev: number,
    actor: string
  ): Promise<NeuroGuideProtocolRow> {
    const existing = this.protocols.get(uid);
    if (!existing || existing.deletedAt !== null) {
      throw new RepoError("NOT_FOUND", `NG_NOT_FOUND:${uid}`);
    }

    if (existing.rev !== expectedRev) {
      throw new RepoError("REV_CONFLICT", `NG_REV_CONFLICT:${existing.rev}`, {
        currentRev: existing.rev,
        currentRow: structuredClone(existing),
      });
    }

    const nowIso = this.nowProvider().toISOString();
    const cleanActor = actor?.trim() || "system";
    const seq = ++this.seq;

    existing.deletedAt = nowIso;
    existing.rev += 1;
    existing.changeSeq = seq;
    existing.updatedAt = nowIso;
    existing.updatedBy = cleanActor;

    await this.recomputeRootHash();

    return structuredClone(existing);
  }

  async createBlock(
    data: NeuroGuideContentBlockData,
    contentHash: string,
    sectionHashes: Record<string, string>,
    actor: string,
    opts?: { uid?: string; skipRootRehash?: boolean }
  ): Promise<NeuroGuideBlockMutateResult> {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new RepoError("INVALID_DATA", "NG_INVALID_DATA:p_data must be a JSON object");
    }

    const rawRecord = data as unknown as Record<string, unknown>;
    const blockKey = normalizeBlockKey(rawRecord.blockKey ?? rawRecord.id);
    if (!blockKey) {
      throw new RepoError("INVALID_SLUG", "NG_INVALID_SLUG:data.blockKey must be non-empty");
    }

    const slug = blockKey.toLowerCase();
    for (const existing of this.blocks.values()) {
      if (existing.deletedAt === null && existing.slug === slug) {
        throw new RepoError("SLUG_TAKEN", `NG_SLUG_TAKEN:${slug}`);
      }
    }

    const nowIso = this.nowProvider().toISOString();
    const uid = opts?.uid && !this.blocks.has(opts.uid) ? opts.uid : generateUuidV4();
    const normalizedData: NeuroGuideContentBlockData = {
      ...structuredClone(data),
      blockKey,
    };
    const blockType = normalizedData.blockType || "recommendation";
    const cleanActor = actor?.trim() || "system";
    const seq = ++this.seq;

    const row: NeuroGuideContentBlockRow = {
      uid,
      slug,
      blockKey,
      blockType,
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
    this.blocks.set(uid, row);

    this.revisions.push({
      id: ++this.revisionIdSeq,
      uid,
      rev: 1,
      changeSeq: seq,
      op: "insert",
      slug,
      blockType,
      data: structuredClone(normalizedData),
      contentHash,
      patchDiff: [],
      status: extractBlockStatus(normalizedData),
      actor: cleanActor,
      createdAt: nowIso,
    });

    let invalidatedTags: string[];
    if (!opts?.skipRootRehash) {
      invalidatedTags = await this.recomputeAffectedProtocols(uid, seq);
      await this.recomputeRootHash();
    } else {
      invalidatedTags = [`block:${uid}`];
    }

    return {
      row: structuredClone(row),
      unchanged: false,
      invalidatedTags,
    };
  }

  async updateBlock(
    uid: string,
    expectedRev: number,
    data: NeuroGuideContentBlockData,
    contentHash: string,
    sectionHashes: Record<string, string>,
    patchDiff: JsonPatchOp[],
    actor: string
  ): Promise<NeuroGuideBlockMutateResult> {
    const existing = this.blocks.get(uid);
    if (!existing || existing.deletedAt !== null) {
      throw new RepoError("NOT_FOUND", `NG_NOT_FOUND:${uid}`);
    }

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new RepoError("INVALID_DATA", "NG_INVALID_DATA:p_data must be a JSON object");
    }

    const rawRecord = data as unknown as Record<string, unknown>;
    const blockKey = normalizeBlockKey(rawRecord.blockKey ?? rawRecord.id);
    if (!blockKey) {
      throw new RepoError("INVALID_SLUG", "NG_INVALID_SLUG:data.blockKey must be non-empty");
    }
    const slug = blockKey.toLowerCase();

    if (existing.rev !== expectedRev) {
      throw new RepoError("REV_CONFLICT", `NG_REV_CONFLICT:${existing.rev}`, {
        currentRev: existing.rev,
        currentRow: structuredClone(existing),
      });
    }

    // Invariant I13: short-circuit unchanged writes without advancing rev/seq/revisions.
    if (existing.contentHash === contentHash && existing.slug === slug) {
      return {
        row: structuredClone(existing),
        unchanged: true,
        invalidatedTags: [],
      };
    }

    if (slug !== existing.slug) {
      for (const other of this.blocks.values()) {
        if (other.deletedAt === null && other.slug === slug && other.uid !== uid) {
          throw new RepoError("SLUG_TAKEN", `NG_SLUG_TAKEN:${slug}`);
        }
      }
    }

    const nowIso = this.nowProvider().toISOString();
    const normalizedData: NeuroGuideContentBlockData = {
      ...structuredClone(data),
      blockKey,
    };
    const blockType = normalizedData.blockType || existing.blockType;
    const cleanActor = actor?.trim() || "system";
    const newRev = existing.rev + 1;
    const seq = ++this.seq;

    existing.slug = slug;
    existing.blockKey = blockKey;
    existing.blockType = blockType;
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
      blockType,
      data: structuredClone(normalizedData),
      contentHash,
      patchDiff: structuredClone(patchDiff ?? []),
      status: extractBlockStatus(normalizedData),
      actor: cleanActor,
      createdAt: nowIso,
    });

    const invalidatedTags = await this.recomputeAffectedProtocols(uid, seq);
    await this.recomputeRootHash();

    return {
      row: structuredClone(existing),
      unchanged: false,
      invalidatedTags,
    };
  }

  async removeBlock(
    uid: string,
    expectedRev: number,
    actor: string
  ): Promise<NeuroGuideBlockMutateResult> {
    const existing = this.blocks.get(uid);
    if (!existing || existing.deletedAt !== null) {
      throw new RepoError("NOT_FOUND", `NG_NOT_FOUND:${uid}`);
    }

    if (existing.rev !== expectedRev) {
      throw new RepoError("REV_CONFLICT", `NG_REV_CONFLICT:${existing.rev}`, {
        currentRev: existing.rev,
        currentRow: structuredClone(existing),
      });
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
      blockType: existing.blockType,
      data: structuredClone(existing.data),
      contentHash: existing.contentHash,
      patchDiff: [],
      status: extractBlockStatus(existing.data),
      actor: cleanActor,
      createdAt: nowIso,
    });

    const invalidatedTags = await this.recomputeAffectedProtocols(uid, seq);
    await this.recomputeRootHash();

    return {
      row: structuredClone(existing),
      unchanged: false,
      invalidatedTags,
    };
  }

  async history(uid: string): Promise<NeuroGuideBlockRevisionRow[]> {
    return this.revisions
      .filter((r) => r.uid === uid)
      .sort((a, b) => b.rev - a.rev)
      .map((r) => structuredClone(r));
  }

  async restoreBlock(
    uid: string,
    expectedRev: number,
    revisionRev: number,
    contentHash: string,
    sectionHashes: Record<string, string>,
    patchDiff: JsonPatchOp[],
    actor: string
  ): Promise<NeuroGuideBlockMutateResult> {
    const existing = this.blocks.get(uid);
    if (!existing) {
      throw new RepoError("NOT_FOUND", `NG_NOT_FOUND:${uid}`);
    }

    if (existing.rev !== expectedRev) {
      throw new RepoError("REV_CONFLICT", `NG_REV_CONFLICT:${existing.rev}`, {
        currentRev: existing.rev,
        currentRow: structuredClone(existing),
      });
    }

    const targetRev = this.revisions.find((r) => r.uid === uid && r.rev === revisionRev);
    if (!targetRev) {
      throw new RepoError("NOT_FOUND", `NG_NOT_FOUND:revision ${revisionRev}`);
    }

    const revRecord = targetRev.data as unknown as Record<string, unknown>;
    const blockKey = normalizeBlockKey(revRecord.blockKey ?? revRecord.id ?? targetRev.slug);
    if (!blockKey) {
      throw new RepoError("INVALID_SLUG", "NG_INVALID_SLUG:Restored revision blockKey empty");
    }
    const slug = blockKey.toLowerCase();

    for (const other of this.blocks.values()) {
      if (other.deletedAt === null && other.slug === slug && other.uid !== uid) {
        throw new RepoError("SLUG_TAKEN", `NG_SLUG_TAKEN:${slug}`);
      }
    }

    // Pitfall P9 / G1.5: strip verification & force status='draft' at top-level and nested payload objects.
    const cloned = structuredClone(revRecord);
    delete cloned.verification;
    cloned.blockKey = blockKey;
    cloned.status = "draft";

    if (cloned.payload && typeof cloned.payload === "object") {
      const payload = cloned.payload as Record<string, unknown>;
      if (payload.practiceChange && typeof payload.practiceChange === "object") {
        const pc = payload.practiceChange as Record<string, unknown>;
        delete pc.verification;
        pc.status = "draft";
      }
      if (payload.trial && typeof payload.trial === "object") {
        const trial = payload.trial as Record<string, unknown>;
        delete trial.verification;
        trial.status = "draft";
      }
    }

    const restoredData = cloned as unknown as NeuroGuideContentBlockData;
    const nowIso = this.nowProvider().toISOString();
    const cleanActor = actor?.trim() || "system";
    const effectiveHash = contentHash.trim() || targetRev.contentHash;
    const newRev = existing.rev + 1;
    const seq = ++this.seq;

    existing.slug = slug;
    existing.blockKey = blockKey;
    existing.blockType = targetRev.blockType;
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
      blockType: targetRev.blockType,
      data: structuredClone(restoredData),
      contentHash: effectiveHash,
      patchDiff: structuredClone(patchDiff ?? []),
      status: "draft",
      actor: cleanActor,
      createdAt: nowIso,
    });

    const invalidatedTags = await this.recomputeAffectedProtocols(uid, seq);
    await this.recomputeRootHash();

    return {
      row: structuredClone(existing),
      unchanged: false,
      invalidatedTags,
    };
  }

  async replaceBlockLinks(
    links: NeuroGuideBlockLinkEdge[],
    clearExisting = false
  ): Promise<number> {
    if (clearExisting) {
      this.blockLinks = [];
    }
    if (!Array.isArray(links) || links.length === 0) {
      return 0;
    }

    const indexByKey = new Map<string, number>();
    for (let i = 0; i < this.blockLinks.length; i++) {
      const l = this.blockLinks[i];
      indexByKey.set(`${l.srcBlockUid}|${l.dstBlockUid}|${l.linkType}`, i);
    }

    const seenKeys = new Set<string>();
    for (const incoming of links) {
      const key = `${incoming.srcBlockUid}|${incoming.dstBlockUid}|${incoming.linkType}`;
      seenKeys.add(key);
      const copy = structuredClone(incoming);
      const idx = indexByKey.get(key);
      if (idx !== undefined) {
        this.blockLinks[idx] = copy;
      } else {
        indexByKey.set(key, this.blockLinks.length);
        this.blockLinks.push(copy);
      }
    }

    return seenKeys.size;
  }

  async queryBlocksByFacets(
    filter: NeuroGuideOverlappingFacetFilter
  ): Promise<NeuroGuideContentBlockRow[]> {
    const normalizedTrialNeedles = (filter.citedTrialKeys ?? []).map((t) =>
      normalizeLookupKey(t)
    );
    const normalizedScenarioNeedles = (filter.linkedScenarioKeys ?? []).map((s) =>
      normalizeLookupKey(s)
    );
    const allowedBlockTypes =
      filter.blockTypes && filter.blockTypes.length > 0
        ? new Set(filter.blockTypes.map((t) => t.toLowerCase()))
        : null;

    return Array.from(this.blocks.values())
      .filter((row) => {
        if (row.deletedAt !== null) return false;
        if (allowedBlockTypes && !allowedBlockTypes.has(row.blockType.toLowerCase())) {
          return false;
        }
        const f = row.data.facetIndex;
        if (
          filter.subspecialties?.length &&
          !hasAnyCaseInsensitive(f?.subspecialties, filter.subspecialties)
        ) {
          return false;
        }
        if (
          filter.conditionIds?.length &&
          !hasAnyCaseInsensitive(f?.conditionIds, filter.conditionIds)
        ) {
          return false;
        }
        if (filter.domains?.length && !hasAnyCaseInsensitive(f?.domains, filter.domains)) {
          return false;
        }
        if (
          filter.timeWindowIds?.length &&
          !hasAnyCaseInsensitive(f?.timeWindowIds, filter.timeWindowIds)
        ) {
          return false;
        }
        if (
          filter.interventionTags?.length &&
          !hasAnyCaseInsensitive(f?.interventionTags, filter.interventionTags)
        ) {
          return false;
        }
        if (
          normalizedTrialNeedles.length > 0 &&
          !hasAnyCaseInsensitive(
            (f?.citedTrialKeys ?? []).map(normalizeLookupKey),
            normalizedTrialNeedles
          )
        ) {
          return false;
        }
        if (
          normalizedScenarioNeedles.length > 0 &&
          !hasAnyCaseInsensitive(
            (f?.linkedScenarioKeys ?? []).map(normalizeLookupKey),
            normalizedScenarioNeedles
          )
        ) {
          return false;
        }
        if (
          filter.directions?.length &&
          !hasAnyCaseInsensitive(
            f?.direction ? [f.direction] : [],
            filter.directions
          )
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
      .map((row) => structuredClone(row));
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
    const purgedBlockUids = new Set<string>();

    for (const [uid, row] of Array.from(this.blocks.entries())) {
      if (row.deletedAt !== null && Date.parse(row.deletedAt) < tombstoneCutoff) {
        this.blocks.delete(uid);
        purgedBlockUids.add(uid);
        tombstonesPurged += 1;
        if (row.changeSeq > maxPurgedSeq) {
          maxPurgedSeq = row.changeSeq;
        }
      }
    }

    for (const [uid, proto] of Array.from(this.protocols.entries())) {
      if (proto.deletedAt !== null && Date.parse(proto.deletedAt) < tombstoneCutoff) {
        this.protocols.delete(uid);
        this.protocolEdges.delete(uid);
        tombstonesPurged += 1;
        if (proto.changeSeq > maxPurgedSeq) {
          maxPurgedSeq = proto.changeSeq;
        }
      }
    }

    if (purgedBlockUids.size > 0) {
      for (const [protoUid, edges] of this.protocolEdges.entries()) {
        this.protocolEdges.set(
          protoUid,
          edges.filter((e) => !purgedBlockUids.has(e.blockUid))
        );
      }
      this.blockLinks = this.blockLinks.filter(
        (l) => !purgedBlockUids.has(l.srcBlockUid) && !purgedBlockUids.has(l.dstBlockUid)
      );
    }

    if (maxPurgedSeq > this.purgeHorizonSeq) {
      this.purgeHorizonSeq = maxPurgedSeq;
    }

    const byUid = new Map<string, NeuroGuideBlockRevisionRow[]>();
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
