export type JsonPatchOpType = "replace" | "add" | "remove";

export interface JsonPatchOp {
  op: JsonPatchOpType;
  path: string;
  old_value?: unknown;
  new_value?: unknown;
}

export type RevisionOp = "insert" | "update" | "delete" | "restore";

export interface SyncRowLike {
  uid: string;
  rev: number;
  changeSeq: number;
  deletedAt: string | null;
}

export interface SyncEnvelope<TData> extends SyncRowLike {
  slug: string;
  data: TData;
  contentHash: string;
  sectionHashes: Record<string, string>;
  createdAt?: string;
  updatedAt: string;
  updatedBy: string;
}

export interface RevisionEnvelope<TData> {
  id: number;
  uid: string;
  rev: number;
  changeSeq: number;
  op: RevisionOp;
  slug: string;
  data: TData;
  contentHash: string;
  patchDiff: JsonPatchOp[];
  status: string | null;
  actor: string;
  createdAt: string;
}

export interface SyncState {
  maxSeq: number;
  purgeHorizonSeq: number;
  rootHash: string;
}

export interface SyncRetentionConfig {
  tombstoneRetentionDays: number;
  revisionRetentionDays: number;
  revisionKeepMinPerUid: number;
  verifiedRevisionRetentionDays: number;
}

export type RepoErrorCode =
  | "SLUG_TAKEN"
  | "NOT_FOUND"
  | "REV_CONFLICT"
  | "INVALID_SLUG"
  | "INVALID_DATA"
  | "SERVICE_UNAVAILABLE";

export interface MergeConflict {
  path: string;
  section: string;
  baseValue: unknown;
  mineValue: unknown;
  cloudValue: unknown;
}

export interface ThreeWayMergeResult<TData = unknown> {
  merged: TData;
  conflicts: MergeConflict[];
  autoMergedPaths: string[];
}
