import type {
  ScaleRecord,
  ScaleWithEffectiveStatus,
} from "../../../types/neurocalc.ts";
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
  ScaleWithEffectiveStatus,
};

export type SyncRow = SyncEnvelope<ScaleRecord>;
export type RevisionRow = RevisionEnvelope<ScaleRecord>;
export type ThreeWayMergeResultScale = ThreeWayMergeResult<ScaleRecord>;
export type { ThreeWayMergeResult };
