import type { DrugRecord } from "../../../types/neurorx.ts";

export interface DrugWithEffectiveStatus {
  drug: DrugRecord;
  effectiveStatus: "verified" | "draft" | "retired";
  hashMatches: boolean;
}

export type JsonPatchOpType = "replace" | "add" | "remove";

export interface JsonPatchOp {
  op: JsonPatchOpType;
  path: string;
  old_value?: unknown;
  new_value?: unknown;
}

export interface SyncRow {
  uid: string;
  slug: string;
  data: DrugRecord;
  contentHash: string;
  sectionHashes: Record<string, string>;
  rev: number;
  changeSeq: number;
  createdAt?: string;
  updatedAt: string;
  updatedBy: string;
  deletedAt: string | null;
}

export type RevisionOp = "insert" | "update" | "delete" | "restore";

export interface RevisionRow {
  id: number;
  uid: string;
  rev: number;
  changeSeq: number;
  op: RevisionOp;
  slug: string;
  data: DrugRecord;
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

export interface ThreeWayMergeResult {
  merged: DrugRecord;
  conflicts: MergeConflict[];
  autoMergedPaths: string[];
}
