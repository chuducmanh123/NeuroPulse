import type { DrugRecord } from "../../../types/neurorx.ts";
import type {
  JsonPatchOp,
  JsonPatchOpType,
  MergeConflict,
  RepoErrorCode,
  RevisionEnvelope,
  RevisionOp,
  SyncEnvelope,
  SyncRetentionConfig,
  SyncState,
  ThreeWayMergeResult,
} from "../../sync/types.ts";

export type {
  JsonPatchOpType,
  JsonPatchOp,
  RevisionOp,
  SyncState,
  SyncRetentionConfig,
  RepoErrorCode,
  MergeConflict,
};

export interface DrugWithEffectiveStatus {
  drug: DrugRecord;
  effectiveStatus: "verified" | "draft" | "retired";
  hashMatches: boolean;
}

export type SyncRow = SyncEnvelope<DrugRecord>;
export type RevisionRow = RevisionEnvelope<DrugRecord>;
export type ThreeWayMergeResultDrug = ThreeWayMergeResult<DrugRecord>;
export type { ThreeWayMergeResult };
