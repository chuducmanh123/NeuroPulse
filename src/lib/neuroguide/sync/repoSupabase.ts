import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { SubspecialtyType } from "../../../types/neuroguide.ts";
import { RepoError, type NeuroGuideRepo } from "./repo.ts";
import type {
  JsonPatchOp,
  NeuroGuideBlockLinkEdge,
  NeuroGuideBlockLinkType,
  NeuroGuideBlockMutateResult,
  NeuroGuideBlockRevisionRow,
  NeuroGuideBlockType,
  NeuroGuideContentBlockData,
  NeuroGuideContentBlockRow,
  NeuroGuideOverlappingFacetFilter,
  NeuroGuideProtocolBlockEdge,
  NeuroGuideProtocolMetadata,
  NeuroGuideProtocolMutateResult,
  NeuroGuideProtocolRow,
  NeuroGuideProtocolType,
  NeuroGuideProtocolUpsertInput,
  RevisionOp,
  SyncState,
} from "./types.ts";

interface DbBlockRow {
  uid: string;
  slug: string;
  block_key: string;
  block_type: NeuroGuideBlockType;
  data: NeuroGuideContentBlockData;
  facets?: Record<string, unknown> | null;
  content_hash: string;
  section_hashes: Record<string, string> | null;
  rev: number;
  change_seq: number | string;
  created_at?: string;
  updated_at: string;
  updated_by: string;
  deleted_at: string | null;
  unchanged?: boolean;
  invalidated_tags?: string[] | null;
  max_seq?: number | string;
  purge_horizon_seq?: number | string;
  root_hash?: string;
}

interface DbProtocolRow {
  uid: string;
  slug: string;
  protocol_type: NeuroGuideProtocolType;
  society: string;
  year: number | string;
  title: string;
  status: string;
  subspecialties: SubspecialtyType[] | null;
  metadata: NeuroGuideProtocolMetadata;
  block_order: string[] | null;
  metadata_hash: string;
  protocol_hash: string;
  rev: number;
  change_seq: number | string;
  created_at?: string;
  updated_at: string;
  updated_by: string;
  deleted_at: string | null;
  unchanged?: boolean;
  max_seq?: number | string;
  purge_horizon_seq?: number | string;
  root_hash?: string;
}

interface DbProtocolEdgeRow {
  protocol_uid: string;
  block_uid: string;
  position: number | string;
  section_path: string;
  role: "recommendation" | "shared" | "trial" | "scenario" | "atom";
}

interface DbBlockLinkRow {
  src_block_uid: string;
  dst_block_uid: string;
  link_type: NeuroGuideBlockLinkType;
  origin: "rule" | "ai" | "human";
  status: "approved" | "proposed" | "rejected";
  evidence_src: string | null;
  evidence_dst: string | null;
}

interface DbRevisionRow {
  id: number | string;
  uid: string;
  rev: number;
  change_seq: number | string;
  op: RevisionOp;
  slug: string;
  block_type: NeuroGuideBlockType;
  data: NeuroGuideContentBlockData;
  content_hash: string;
  patch_diff: JsonPatchOp[] | null;
  status: string | null;
  actor: string;
  created_at: string;
}

interface DbSyncStateRow {
  max_seq: number | string;
  purge_horizon_seq: number | string;
  root_hash: string;
}

export interface SupabaseNeuroGuideRepoOptions {
  url?: string;
  serviceRoleKey?: string;
  client?: SupabaseClient;
}

function toNumber(value: number | string | null | undefined, fallback = 0): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function mapBlockRow(db: DbBlockRow): NeuroGuideContentBlockRow {
  return {
    uid: db.uid,
    slug: db.slug,
    blockKey: db.block_key,
    blockType: db.block_type,
    data: db.data,
    contentHash: db.content_hash,
    sectionHashes: db.section_hashes ?? {},
    rev: toNumber(db.rev, 1),
    changeSeq: toNumber(db.change_seq, 0),
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    updatedBy: db.updated_by,
    deletedAt: db.deleted_at,
  };
}

function mapProtocolRow(db: DbProtocolRow): NeuroGuideProtocolRow {
  return {
    uid: db.uid,
    slug: db.slug,
    protocolType: db.protocol_type,
    society: db.society ?? "",
    year: toNumber(db.year, 0),
    title: db.title ?? "",
    status: db.status ?? "published",
    subspecialties: Array.isArray(db.subspecialties) ? db.subspecialties : [],
    metadata: db.metadata,
    blockOrder: Array.isArray(db.block_order) ? db.block_order : [],
    metadataHash: db.metadata_hash ?? "",
    protocolHash: db.protocol_hash ?? "",
    rev: toNumber(db.rev, 1),
    changeSeq: toNumber(db.change_seq, 0),
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    updatedBy: db.updated_by,
    deletedAt: db.deleted_at,
  };
}

function mapProtocolEdgeRow(db: DbProtocolEdgeRow): NeuroGuideProtocolBlockEdge {
  return {
    protocolUid: db.protocol_uid,
    blockUid: db.block_uid,
    position: toNumber(db.position, 0),
    sectionPath: db.section_path ?? "",
    role: db.role || "recommendation",
  };
}

function mapBlockLinkRow(db: DbBlockLinkRow): NeuroGuideBlockLinkEdge {
  return {
    srcBlockUid: db.src_block_uid,
    dstBlockUid: db.dst_block_uid,
    linkType: db.link_type,
    origin: db.origin || "rule",
    status: db.status || "approved",
    evidenceSrc: db.evidence_src ?? undefined,
    evidenceDst: db.evidence_dst ?? undefined,
  };
}

function mapRevisionRow(db: DbRevisionRow): NeuroGuideBlockRevisionRow {
  return {
    id: toNumber(db.id, 0),
    uid: db.uid,
    rev: toNumber(db.rev, 1),
    changeSeq: toNumber(db.change_seq, 0),
    op: db.op,
    slug: db.slug,
    blockType: db.block_type,
    data: db.data,
    contentHash: db.content_hash,
    patchDiff: Array.isArray(db.patch_diff) ? db.patch_diff : [],
    status: db.status,
    actor: db.actor,
    createdAt: db.created_at,
  };
}

/**
 * Production NeuroGuideRepo backed by Supabase PostgreSQL RPCs & RLS.
 * Pitfall P8: never falls back to anon key; throws SERVICE_UNAVAILABLE if service key missing.
 */
export class SupabaseNeuroGuideRepo implements NeuroGuideRepo {
  private readonly explicitUrl?: string;
  private readonly explicitServiceRoleKey?: string;
  private cachedClient: SupabaseClient | null = null;
  private cachedCredKey = "";

  constructor(options?: SupabaseNeuroGuideRepoOptions) {
    this.explicitUrl = options?.url;
    this.explicitServiceRoleKey = options?.serviceRoleKey;
    if (options?.client) {
      this.cachedClient = options.client;
    }
  }

  private getClient(): SupabaseClient {
    if (
      this.cachedClient &&
      !this.explicitUrl &&
      this.explicitServiceRoleKey === undefined
    ) {
      return this.cachedClient;
    }

    const url =
      this.explicitUrl !== undefined
        ? this.explicitUrl
        : process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";

    const serviceRoleKey =
      this.explicitServiceRoleKey !== undefined
        ? this.explicitServiceRoleKey
        : process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    if (!url.trim() || !serviceRoleKey.trim()) {
      if (
        this.cachedClient &&
        this.explicitServiceRoleKey === undefined &&
        this.explicitUrl === undefined
      ) {
        return this.cachedClient;
      }
      throw new RepoError(
        "SERVICE_UNAVAILABLE",
        "SUPABASE_SERVICE_ROLE_KEY and Supabase URL are required for NeuroGuide Sync v2 server operations."
      );
    }

    const credKey = `${url}::${serviceRoleKey}`;
    if (!this.cachedClient || this.cachedCredKey !== credKey) {
      this.cachedClient = createClient(url, serviceRoleKey, {
        auth: { persistSession: false },
      });
      this.cachedCredKey = credKey;
    }

    return this.cachedClient;
  }

  private async throwMappedError(
    error: { message?: string; code?: string },
    uid?: string,
    entityKind: "block" | "protocol" = "block"
  ): Promise<never> {
    const msg = String(error?.message || "Unknown Supabase RPC error");

    if (msg.startsWith("NG_REV_CONFLICT")) {
      const match = /^NG_REV_CONFLICT:(\d+)/.exec(msg);
      const currentRev = match ? Number(match[1]) : undefined;
      let currentRow: NeuroGuideContentBlockRow | NeuroGuideProtocolRow | undefined;
      if (uid) {
        currentRow =
          entityKind === "protocol"
            ? ((await this.getProtocolByUid(uid).catch(() => null)) ?? undefined)
            : ((await this.getBlockByUid(uid).catch(() => null)) ?? undefined);
      }
      throw new RepoError("REV_CONFLICT", msg, {
        currentRev: currentRev ?? currentRow?.rev,
        currentRow,
      });
    }

    if (msg.startsWith("NG_SLUG_TAKEN")) {
      throw new RepoError("SLUG_TAKEN", msg);
    }
    if (msg.startsWith("NG_NOT_FOUND")) {
      throw new RepoError("NOT_FOUND", msg);
    }
    if (msg.startsWith("NG_INVALID_SLUG")) {
      throw new RepoError("INVALID_SLUG", msg);
    }
    if (msg.startsWith("NG_INVALID_DATA")) {
      throw new RepoError("INVALID_DATA", msg);
    }

    throw new RepoError("SERVICE_UNAVAILABLE", msg);
  }

  async getSyncState(): Promise<SyncState> {
    const client = this.getClient();
    const { data, error } = await client
      .from("neuroguide_sync_state")
      .select("max_seq, purge_horizon_seq, root_hash")
      .eq("id", 1)
      .single();

    if (error || !data) {
      await this.throwMappedError(error ?? { message: "Missing neuroguide_sync_state row" });
    }

    const row = data as DbSyncStateRow;
    return {
      maxSeq: toNumber(row.max_seq, 0),
      purgeHorizonSeq: toNumber(row.purge_horizon_seq, 0),
      rootHash: row.root_hash ?? "",
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
    const client = this.getClient();
    const { data, error } = await client.rpc("neuroguide_changes_since", {
      p_since: Number.isFinite(since) ? since : 0,
      p_limit: Math.max(1, Math.min(limit || 500, 500)),
    });

    if (error) {
      await this.throwMappedError(error);
    }

    const dbRows = Array.isArray(data) ? (data as DbBlockRow[]) : [];
    if (dbRows.length === 0) {
      const state = await this.getSyncState();
      return {
        rows: [],
        maxSeq: state.maxSeq,
        purgeHorizonSeq: state.purgeHorizonSeq,
        rootHash: state.rootHash,
      };
    }

    const first = dbRows[0];
    return {
      rows: dbRows.map(mapBlockRow),
      maxSeq: toNumber(first.max_seq, 0),
      purgeHorizonSeq: toNumber(first.purge_horizon_seq, 0),
      rootHash: first.root_hash ?? "",
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
    const client = this.getClient();
    const { data, error } = await client.rpc("neuroguide_protocol_changes_since", {
      p_since: Number.isFinite(since) ? since : 0,
      p_limit: Math.max(1, Math.min(limit || 500, 500)),
    });

    if (error) {
      await this.throwMappedError(error);
    }

    const dbRows = Array.isArray(data) ? (data as DbProtocolRow[]) : [];
    if (dbRows.length === 0) {
      const state = await this.getSyncState();
      return {
        rows: [],
        maxSeq: state.maxSeq,
        purgeHorizonSeq: state.purgeHorizonSeq,
        rootHash: state.rootHash,
      };
    }

    const first = dbRows[0];
    return {
      rows: dbRows.map(mapProtocolRow),
      maxSeq: toNumber(first.max_seq, 0),
      purgeHorizonSeq: toNumber(first.purge_horizon_seq, 0),
      rootHash: first.root_hash ?? "",
    };
  }

  async getBlockByUid(uid: string): Promise<NeuroGuideContentBlockRow | null> {
    const client = this.getClient();
    const { data, error } = await client
      .from("neuroguide_content_blocks")
      .select("*")
      .eq("uid", uid)
      .maybeSingle();

    if (error) {
      await this.throwMappedError(error, uid, "block");
    }

    return data ? mapBlockRow(data as DbBlockRow) : null;
  }

  async getProtocolByUid(uid: string): Promise<NeuroGuideProtocolRow | null> {
    const client = this.getClient();
    const { data, error } = await client
      .from("neuroguide_protocols")
      .select("*")
      .eq("uid", uid)
      .maybeSingle();

    if (error) {
      await this.throwMappedError(error, uid, "protocol");
    }

    return data ? mapProtocolRow(data as DbProtocolRow) : null;
  }

  async listLiveProtocols(): Promise<NeuroGuideProtocolRow[]> {
    const client = this.getClient();
    const { data, error } = await client
      .from("neuroguide_protocols")
      .select("*")
      .is("deleted_at", null)
      .order("slug", { ascending: true });

    if (error) {
      await this.throwMappedError(error);
    }

    return Array.isArray(data) ? (data as DbProtocolRow[]).map(mapProtocolRow) : [];
  }

  async listProtocolEdges(protocolUid?: string): Promise<NeuroGuideProtocolBlockEdge[]> {
    const client = this.getClient();
    const pageSize = 1000;
    const all: NeuroGuideProtocolBlockEdge[] = [];

    for (let offset = 0; ; offset += pageSize) {
      let query = client
        .from("neuroguide_protocol_blocks")
        .select("protocol_uid, block_uid, position, section_path, role")
        .order("protocol_uid", { ascending: true })
        .order("position", { ascending: true })
        .order("block_uid", { ascending: true });

      if (protocolUid) {
        query = query.eq("protocol_uid", protocolUid);
      }

      const hasRange = typeof (query as { range?: unknown }).range === "function";
      const paged = hasRange ? query.range(offset, offset + pageSize - 1) : query;

      const { data, error } = await paged;
      if (error) {
        await this.throwMappedError(error, protocolUid, "protocol");
      }

      const batch = Array.isArray(data)
        ? (data as DbProtocolEdgeRow[]).map(mapProtocolEdgeRow)
        : [];
      all.push(...batch);

      if (!hasRange || batch.length < pageSize) {
        break;
      }
    }

    return all;
  }

  async listBlockLinks(srcBlockUid?: string): Promise<NeuroGuideBlockLinkEdge[]> {
    const client = this.getClient();
    const pageSize = 1000;
    const all: NeuroGuideBlockLinkEdge[] = [];

    for (let offset = 0; ; offset += pageSize) {
      let query = client
        .from("neuroguide_block_links")
        .select("src_block_uid, dst_block_uid, link_type, origin, status, evidence_src, evidence_dst")
        .order("id", { ascending: true });

      if (srcBlockUid) {
        query = query.eq("src_block_uid", srcBlockUid);
      }

      const hasRange = typeof (query as { range?: unknown }).range === "function";
      const paged = hasRange ? query.range(offset, offset + pageSize - 1) : query;

      const { data, error } = await paged;
      if (error) {
        await this.throwMappedError(error, srcBlockUid, "block");
      }

      const batch = Array.isArray(data)
        ? (data as DbBlockLinkRow[]).map(mapBlockLinkRow)
        : [];
      all.push(...batch);

      if (!hasRange || batch.length < pageSize) {
        break;
      }
    }

    return all;
  }

  async upsertProtocol(
    input: NeuroGuideProtocolUpsertInput,
    actor: string
  ): Promise<NeuroGuideProtocolMutateResult> {
    const client = this.getClient();
    const { data: rpcData, error } = await client.rpc("neuroguide_upsert_protocol", {
      p_slug: input.slug,
      p_protocol_type: input.protocolType,
      p_society: input.society ?? "",
      p_year: input.year ?? 0,
      p_title: input.title ?? "",
      p_status: input.status ?? "published",
      p_subspecialties: input.subspecialties ?? [],
      p_metadata: input.metadata ?? {},
      p_block_order: input.blockOrder ?? [],
      p_metadata_hash: input.metadataHash ?? "",
      p_edges: input.edges ?? [],
      p_actor: actor,
      p_uid: input.uid ?? null,
      p_expected_rev: input.expectedRev ?? null,
      p_skip_root_rehash: Boolean(input.skipRootRehash),
    });

    if (error) {
      await this.throwMappedError(error, input.uid, "protocol");
    }

    const row = Array.isArray(rpcData)
      ? (rpcData[0] as DbProtocolRow | undefined)
      : (rpcData as DbProtocolRow | undefined);
    if (!row) {
      throw new RepoError(
        "SERVICE_UNAVAILABLE",
        "neuroguide_upsert_protocol returned empty result"
      );
    }

    return {
      row: mapProtocolRow(row),
      unchanged: Boolean(row.unchanged),
    };
  }

  async deleteProtocol(
    uid: string,
    expectedRev: number,
    actor: string
  ): Promise<NeuroGuideProtocolRow> {
    const client = this.getClient();
    const { data: rpcData, error } = await client.rpc("neuroguide_delete_protocol", {
      p_uid: uid,
      p_expected_rev: expectedRev,
      p_actor: actor,
    });

    if (error) {
      await this.throwMappedError(error, uid, "protocol");
    }

    const row = Array.isArray(rpcData)
      ? (rpcData[0] as DbProtocolRow | undefined)
      : (rpcData as DbProtocolRow | undefined);
    if (!row) {
      throw new RepoError(
        "SERVICE_UNAVAILABLE",
        "neuroguide_delete_protocol returned empty result"
      );
    }

    return mapProtocolRow(row);
  }

  async createBlock(
    data: NeuroGuideContentBlockData,
    contentHash: string,
    sectionHashes: Record<string, string>,
    actor: string,
    opts?: { uid?: string; skipRootRehash?: boolean }
  ): Promise<NeuroGuideBlockMutateResult> {
    const client = this.getClient();
    const { data: rpcData, error } = await client.rpc("neuroguide_create_block", {
      p_data: data,
      p_content_hash: contentHash,
      p_section_hashes: sectionHashes ?? {},
      p_actor: actor,
      p_uid: opts?.uid ?? null,
      p_skip_root_rehash: Boolean(opts?.skipRootRehash),
    });

    if (error) {
      await this.throwMappedError(error, opts?.uid, "block");
    }

    const row = Array.isArray(rpcData)
      ? (rpcData[0] as DbBlockRow | undefined)
      : (rpcData as DbBlockRow | undefined);
    if (!row) {
      throw new RepoError(
        "SERVICE_UNAVAILABLE",
        "neuroguide_create_block returned empty result"
      );
    }

    return {
      row: mapBlockRow(row),
      unchanged: Boolean(row.unchanged),
      invalidatedTags: Array.isArray(row.invalidated_tags) ? row.invalidated_tags : [],
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
    const client = this.getClient();
    const { data: rpcData, error } = await client.rpc("neuroguide_update_block", {
      p_uid: uid,
      p_expected_rev: expectedRev,
      p_data: data,
      p_content_hash: contentHash,
      p_section_hashes: sectionHashes ?? {},
      p_patch_diff: patchDiff ?? [],
      p_actor: actor,
    });

    if (error) {
      await this.throwMappedError(error, uid, "block");
    }

    const row = Array.isArray(rpcData)
      ? (rpcData[0] as DbBlockRow | undefined)
      : (rpcData as DbBlockRow | undefined);
    if (!row) {
      throw new RepoError(
        "SERVICE_UNAVAILABLE",
        "neuroguide_update_block returned empty result"
      );
    }

    return {
      row: mapBlockRow(row),
      unchanged: Boolean(row.unchanged),
      invalidatedTags: Array.isArray(row.invalidated_tags) ? row.invalidated_tags : [],
    };
  }

  async removeBlock(
    uid: string,
    expectedRev: number,
    actor: string
  ): Promise<NeuroGuideBlockMutateResult> {
    const client = this.getClient();
    const { data: rpcData, error } = await client.rpc("neuroguide_delete_block", {
      p_uid: uid,
      p_expected_rev: expectedRev,
      p_actor: actor,
    });

    if (error) {
      await this.throwMappedError(error, uid, "block");
    }

    const row = Array.isArray(rpcData)
      ? (rpcData[0] as DbBlockRow | undefined)
      : (rpcData as DbBlockRow | undefined);
    if (!row) {
      throw new RepoError(
        "SERVICE_UNAVAILABLE",
        "neuroguide_delete_block returned empty result"
      );
    }

    return {
      row: mapBlockRow(row),
      unchanged: Boolean(row.unchanged),
      invalidatedTags: Array.isArray(row.invalidated_tags) ? row.invalidated_tags : [],
    };
  }

  async history(uid: string): Promise<NeuroGuideBlockRevisionRow[]> {
    const client = this.getClient();
    const { data, error } = await client
      .from("neuroguide_block_revisions")
      .select("*")
      .eq("uid", uid)
      .order("rev", { ascending: false });

    if (error) {
      await this.throwMappedError(error, uid, "block");
    }

    return Array.isArray(data) ? (data as DbRevisionRow[]).map(mapRevisionRow) : [];
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
    const client = this.getClient();
    const { data: rpcData, error } = await client.rpc(
      "neuroguide_restore_block_revision",
      {
        p_uid: uid,
        p_expected_rev: expectedRev,
        p_revision_rev: revisionRev,
        p_new_content_hash: contentHash,
        p_section_hashes: sectionHashes ?? {},
        p_patch_diff: patchDiff ?? [],
        p_actor: actor,
      }
    );

    if (error) {
      await this.throwMappedError(error, uid, "block");
    }

    const row = Array.isArray(rpcData)
      ? (rpcData[0] as DbBlockRow | undefined)
      : (rpcData as DbBlockRow | undefined);
    if (!row) {
      throw new RepoError(
        "SERVICE_UNAVAILABLE",
        "neuroguide_restore_block_revision returned empty result"
      );
    }

    return {
      row: mapBlockRow(row),
      unchanged: Boolean(row.unchanged),
      invalidatedTags: Array.isArray(row.invalidated_tags) ? row.invalidated_tags : [],
    };
  }

  async replaceBlockLinks(
    links: NeuroGuideBlockLinkEdge[],
    clearExisting = false
  ): Promise<number> {
    const client = this.getClient();
    const { data, error } = await client.rpc("neuroguide_replace_block_links", {
      p_links: links ?? [],
      p_clear_existing: Boolean(clearExisting),
    });

    if (error) {
      await this.throwMappedError(error);
    }

    return toNumber(data as number | string, 0);
  }

  async queryBlocksByFacets(
    filter: NeuroGuideOverlappingFacetFilter
  ): Promise<NeuroGuideContentBlockRow[]> {
    const client = this.getClient();
    const { data, error } = await client.rpc("neuroguide_query_blocks_by_facets", {
      p_filter: filter ?? {},
    });

    if (error) {
      await this.throwMappedError(error);
    }

    return Array.isArray(data) ? (data as DbBlockRow[]).map(mapBlockRow) : [];
  }

  async recomputeProtocolHash(protocolUid: string): Promise<string> {
    const client = this.getClient();
    const { data, error } = await client.rpc("neuroguide_recompute_protocol_hash", {
      p_protocol_uid: protocolUid,
    });

    if (error) {
      await this.throwMappedError(error, protocolUid, "protocol");
    }

    return typeof data === "string" ? data : String(data ?? "");
  }

  async recomputeRootHash(): Promise<string> {
    const client = this.getClient();
    const { data, error } = await client.rpc("neuroguide_recompute_root_hash");

    if (error) {
      await this.throwMappedError(error);
    }

    return typeof data === "string" ? data : String(data ?? "");
  }

  async purge(): Promise<{
    tombstonesPurged: number;
    revisionsPurged: number;
    purgeHorizonSeq: number;
  }> {
    const client = this.getClient();
    const { data, error } = await client.rpc("neuroguide_purge");

    if (error) {
      await this.throwMappedError(error);
    }

    const obj = (data ?? {}) as {
      tombstones_purged?: number | string;
      revisions_purged?: number | string;
      purge_horizon_seq?: number | string;
    };

    return {
      tombstonesPurged: toNumber(obj.tombstones_purged, 0),
      revisionsPurged: toNumber(obj.revisions_purged, 0),
      purgeHorizonSeq: toNumber(obj.purge_horizon_seq, 0),
    };
  }
}
