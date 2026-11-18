import {
  applyChanges as sharedApplyChanges,
  type ApplyChangesResult as SharedApplyChangesResult,
} from "../../sync/applyChanges.ts";
import type { SyncRow } from "./types.ts";

export type ApplyChangesResult = SharedApplyChangesResult<SyncRow>;

export function applyChanges(
  current: ReadonlyMap<string, SyncRow>,
  incoming: readonly SyncRow[],
): ApplyChangesResult {
  return sharedApplyChanges<SyncRow>(current, incoming);
}
