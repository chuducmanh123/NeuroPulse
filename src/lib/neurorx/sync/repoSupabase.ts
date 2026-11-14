import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { DrugRecord } from "../../../types/neurorx.ts";
import { RepoError, type DrugRepo } from "./repo.ts";
import type {
  JsonPatchOp,
  RevisionOp,
  RevisionRow,
  SyncRow,
  SyncState,
} from "./types.ts";

interface DbSyncRow {
  uid: string;
  slug: string;
  data: DrugRecord;
  content_hash: string;
  section_hashes: Record<string, string> | null;
  rev: number;
  change_seq: number | string;
  created_at?: string;
  updated_at: string;
  updated_by: string;
  deleted_at: string | null;
  max_seq?: number | string;
  purge_horizon_seq?: number | string;
  root_hash?: string;
}

interface DbRevisionRow {
  id: number | string;
  uid: string;
  rev: number;
  change_seq: number | string;
  op: RevisionOp;
  slug: string;
  data: DrugRecord;
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

interface RpcMutateRow extends DbSyncRow {
  unchanged?: boolean;
}

export interface SupabaseRepoOptions {
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

function mapSyncRow(db: DbSyncRow): SyncRow {
  return {
    uid: db.uid,
    slug: db.slug,
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

function mapRevisionRow(db: DbRevisionRow): RevisionRow {
  return {
    id: toNumber(db.id, 0),
    uid: db.uid,
    rev: toNumber(db.rev, 1),
    changeSeq: toNumber(db.change_seq, 0),
    op: db.op,
    slug: db.slug,
    data: db.data,
    contentHash: db.content_hash,
    patchDiff: Array.isArray(db.patch_diff) ? db.patch_diff : [],
    status: db.status,
    actor: db.actor,
    createdAt: db.created_at,
  };
}

/**
 * Production DrugRepo backed by Supabase PostgreSQL RPCs & RLS.
 * Pitfall P8: never falls back to anon key; throws SERVICE_UNAVAILABLE if service key missing.
 */
export class SupabaseDrugRepo implements DrugRepo {
  private readonly explicitUrl?: string;
  private readonly explicitServiceRoleKey?: string;
  private cachedClient: SupabaseClient | null = null;
  private cachedCredKey = "";

  constructor(options?: SupabaseRepoOptions) {
    this.explicitUrl = options?.url;
    this.explicitServiceRoleKey = options?.serviceRoleKey;
    if (options?.client) {
      this.cachedClient = options.client;
    }
  }

  private getClient(): SupabaseClient {
    if (this.cachedClient && !this.explicitUrl && this.explicitServiceRoleKey === undefined) {
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
      if (this.cachedClient && this.explicitServiceRoleKey === undefined && this.explicitUrl === undefined) {
        return this.cachedClient;
      }
      throw new RepoError(
        "SERVICE_UNAVAILABLE",
        "SUPABASE_SERVICE_ROLE_KEY and Supabase URL are required for Sync v2 server operations."
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
    uid?: string
  ): Promise<never> {
    const msg = String(error?.message || "Unknown Supabase RPC error");

    if (msg.startsWith("NRX_REV_CONFLICT")) {
      const match = /^NRX_REV_CONFLICT:(\d+)/.exec(msg);
      const currentRev = match ? Number(match[1]) : undefined;
      let currentRow: SyncRow | undefined;
      if (uid) {
        currentRow = (await this.getByUid(uid).catch(() => null)) ?? undefined;
      }
      throw new RepoError("REV_CONFLICT", msg, {
        currentRev: currentRev ?? currentRow?.rev,
        currentRow,
      });
    }

    if (msg.startsWith("NRX_SLUG_TAKEN")) {
      throw new RepoError("SLUG_TAKEN", msg);
    }
    if (msg.startsWith("NRX_NOT_FOUND")) {
      throw new RepoError("NOT_FOUND", msg);
    }
    if (msg.startsWith("NRX_INVALID_SLUG")) {
      throw new RepoError("INVALID_SLUG", msg);
    }
    if (msg.startsWith("NRX_INVALID_DATA")) {
      throw new RepoError("INVALID_DATA", msg);
    }

    throw new RepoError("SERVICE_UNAVAILABLE", msg);
  }

  async getSyncState(): Promise<SyncState> {
    const client = this.getClient();
    const { data, error } = await client
      .from("neurorx_sync_state")
      .select("max_seq, purge_horizon_seq, root_hash")
      .eq("id", 1)
      .single();

    if (error || !data) {
      await this.throwMappedError(error ?? { message: "Missing neurorx_sync_state row" });
    }

    const row = data as DbSyncStateRow;
    return {
      maxSeq: toNumber(row.max_seq, 0),
      purgeHorizonSeq: toNumber(row.purge_horizon_seq, 0),
      rootHash: row.root_hash ?? "",
    };
  }

  async changesSince(since: number, limit: number): Promise<{
    rows: SyncRow[];
    maxSeq: number;
    purgeHorizonSeq: number;
    rootHash: string;
  }> {
    const client = this.getClient();
    const { data, error } = await client.rpc("neurorx_changes_since", {
      p_since: Number.isFinite(since) ? since : 0,
      p_limit: Math.max(1, Math.min(limit || 500, 500)),
    });

    if (error) {
      await this.throwMappedError(error);
    }

    const dbRows = Array.isArray(data) ? (data as DbSyncRow[]) : [];
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
      rows: dbRows.map(mapSyncRow),
      maxSeq: toNumber(first.max_seq, 0),
      purgeHorizonSeq: toNumber(first.purge_horizon_seq, 0),
      rootHash: first.root_hash ?? "",
    };
  }

  async getByUid(uid: string): Promise<SyncRow | null> {
    const client = this.getClient();
    const { data, error } = await client
      .from("neurorx_drug_records")
      .select("*")
      .eq("uid", uid)
      .maybeSingle();

    if (error) {
      await this.throwMappedError(error, uid);
    }

    return data ? mapSyncRow(data as DbSyncRow) : null;
  }

  async create(
    data: DrugRecord,
    contentHash: string,
    sectionHashes: Record<string, string>,
    actor: string,
    opts?: { skipRootRehash?: boolean }
  ): Promise<SyncRow> {
    const client = this.getClient();
    const { data: rpcData, error } = await client.rpc("neurorx_create_drug", {
      p_data: data,
      p_content_hash: contentHash,
      p_section_hashes: sectionHashes ?? {},
      p_actor: actor,
      p_skip_root_rehash: Boolean(opts?.skipRootRehash),
    });

    if (error) {
      await this.throwMappedError(error);
    }

    const row = Array.isArray(rpcData) ? (rpcData[0] as RpcMutateRow | undefined) : (rpcData as RpcMutateRow | undefined);
    if (!row) {
      throw new RepoError("SERVICE_UNAVAILABLE", "neurorx_create_drug returned empty result");
    }

    return mapSyncRow(row);
  }

  async recomputeRootHash(): Promise<string> {
    const client = this.getClient();
    const { data, error } = await client.rpc("neurorx_recompute_root_hash");

    if (error) {
      await this.throwMappedError(error);
    }

    return typeof data === "string" ? data : String(data ?? "");
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
    const client = this.getClient();
    const { data: rpcData, error } = await client.rpc("neurorx_update_drug", {
      p_uid: uid,
      p_expected_rev: expectedRev,
      p_data: data,
      p_content_hash: contentHash,
      p_section_hashes: sectionHashes ?? {},
      p_patch_diff: patchDiff ?? [],
      p_actor: actor,
    });

    if (error) {
      await this.throwMappedError(error, uid);
    }

    const row = Array.isArray(rpcData) ? (rpcData[0] as RpcMutateRow | undefined) : (rpcData as RpcMutateRow | undefined);
    if (!row) {
      throw new RepoError("SERVICE_UNAVAILABLE", "neurorx_update_drug returned empty result");
    }

    return {
      row: mapSyncRow(row),
      unchanged: Boolean(row.unchanged),
    };
  }

  async remove(uid: string, expectedRev: number, actor: string): Promise<SyncRow> {
    const client = this.getClient();
    const { data: rpcData, error } = await client.rpc("neurorx_delete_drug", {
      p_uid: uid,
      p_expected_rev: expectedRev,
      p_actor: actor,
    });

    if (error) {
      await this.throwMappedError(error, uid);
    }

    const row = Array.isArray(rpcData) ? (rpcData[0] as RpcMutateRow | undefined) : (rpcData as RpcMutateRow | undefined);
    if (!row) {
      throw new RepoError("SERVICE_UNAVAILABLE", "neurorx_delete_drug returned empty result");
    }

    return mapSyncRow(row);
  }

  async history(uid: string): Promise<RevisionRow[]> {
    const client = this.getClient();
    const { data, error } = await client
      .from("neurorx_drug_revisions")
      .select("*")
      .eq("uid", uid)
      .order("rev", { ascending: false });

    if (error) {
      await this.throwMappedError(error, uid);
    }

    return Array.isArray(data) ? (data as DbRevisionRow[]).map(mapRevisionRow) : [];
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
    const client = this.getClient();
    const { data: rpcData, error } = await client.rpc("neurorx_restore_revision", {
      p_uid: uid,
      p_expected_rev: expectedRev,
      p_revision_rev: revisionRev,
      p_new_content_hash: contentHash,
      p_section_hashes: sectionHashes ?? {},
      p_patch_diff: patchDiff ?? [],
      p_actor: actor,
    });

    if (error) {
      await this.throwMappedError(error, uid);
    }

    const row = Array.isArray(rpcData) ? (rpcData[0] as RpcMutateRow | undefined) : (rpcData as RpcMutateRow | undefined);
    if (!row) {
      throw new RepoError("SERVICE_UNAVAILABLE", "neurorx_restore_revision returned empty result");
    }

    return mapSyncRow(row);
  }

  async purge(): Promise<{
    tombstonesPurged: number;
    revisionsPurged: number;
    purgeHorizonSeq: number;
  }> {
    const client = this.getClient();
    const { data, error } = await client.rpc("neurorx_purge");

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
