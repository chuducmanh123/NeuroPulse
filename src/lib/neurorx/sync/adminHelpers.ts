import type { DrugRecord } from "../../../types/neurorx.ts";
import {
  applyJsonPatch,
  computeJsonPatch,
  threeWayMergeDrug,
} from "./jsonPatch.ts";
import type { JsonPatchOp, SyncRow, ThreeWayMergeResult } from "./types.ts";

export const DRAFT_AUTOSAVE_INTERVAL_MS = 3000;
export const DRAFT_STORAGE_PREFIX = "neurorx-draft";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  readonly length?: number;
  key?(index: number): string | null;
}

export interface StoredDrugDraft {
  uid: string;
  baseRev: number;
  savedAt: string;
  data: DrugRecord;
}

export type ConflictResolutionMode = "use_cloud" | "smart_merge" | "force_overwrite";

export interface ConflictSummary {
  mineVsCloudDiff: JsonPatchOp[];
  mergeResult: ThreeWayMergeResult;
}

export interface ResolveConflictParams {
  mode: ConflictResolutionMode;
  base: DrugRecord;
  mine: DrugRecord;
  cloudRow: SyncRow;
  conflictSelections?: Record<string, "mine" | "cloud">;
}

export type ResolveConflictResult =
  | { ok: true; kind: "apply_cloud"; row: SyncRow }
  | {
      ok: true;
      kind: "put";
      data: DrugRecord;
      expectedRev: number;
      mergeResult?: ThreeWayMergeResult;
    }
  | {
      ok: false;
      missingPaths: string[];
      mergeResult: ThreeWayMergeResult;
    };

export interface FormattedDiffEntry {
  op: JsonPatchOp["op"];
  path: string;
  oldPreview: string;
  newPreview: string;
}

export function formatDraftStorageKey(uid: string, baseRev: number): string {
  return `${DRAFT_STORAGE_PREFIX}:${uid}:${baseRev}`;
}

export function saveLocalDrugDraft(
  storage: StorageLike | null | undefined,
  uid: string,
  baseRev: number,
  draft: DrugRecord,
  nowIso: string = new Date().toISOString(),
): StoredDrugDraft | null {
  if (!storage || !uid) {
    return null;
  }
  const payload: StoredDrugDraft = {
    uid,
    baseRev,
    savedAt: nowIso,
    data: structuredClone(draft),
  };
  try {
    storage.setItem(formatDraftStorageKey(uid, baseRev), JSON.stringify(payload));
    return payload;
  } catch {
    return null;
  }
}

export function loadLocalDrugDraft(
  storage: StorageLike | null | undefined,
  uid: string,
  baseRev: number,
): StoredDrugDraft | null {
  if (!storage || !uid) {
    return null;
  }
  const key = formatDraftStorageKey(uid, baseRev);
  try {
    const raw = storage.getItem(key);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<StoredDrugDraft>;
    if (
      !parsed ||
      parsed.uid !== uid ||
      parsed.baseRev !== baseRev ||
      !parsed.data ||
      typeof parsed.data !== "object"
    ) {
      return null;
    }
    return {
      uid: parsed.uid,
      baseRev: parsed.baseRev,
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : "",
      data: parsed.data,
    };
  } catch {
    return null;
  }
}

export function clearLocalDrugDraftsForUid(
  storage: StorageLike | null | undefined,
  uid: string,
): void {
  if (!storage || !uid) {
    return;
  }
  const prefix = `${DRAFT_STORAGE_PREFIX}:${uid}:`;
  try {
    if (typeof storage.length === "number" && typeof storage.key === "function") {
      const matchingKeys: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (k && k.startsWith(prefix)) {
          matchingKeys.push(k);
        }
      }
      for (const k of matchingKeys) {
        storage.removeItem(k);
      }
    } else {
      storage.removeItem(formatDraftStorageKey(uid, 0));
    }
  } catch {
    // Ignore storage cleanup errors
  }
}

export function buildConflictSummary(
  base: DrugRecord,
  mine: DrugRecord,
  cloud: DrugRecord,
): ConflictSummary {
  return {
    mineVsCloudDiff: computeJsonPatch(cloud, mine),
    mergeResult: threeWayMergeDrug(base, mine, cloud),
  };
}

export function resolveConflictChoice(params: ResolveConflictParams): ResolveConflictResult {
  const { mode, base, mine, cloudRow, conflictSelections } = params;

  if (mode === "use_cloud") {
    return {
      ok: true,
      kind: "apply_cloud",
      row: cloudRow,
    };
  }

  if (mode === "force_overwrite") {
    return {
      ok: true,
      kind: "put",
      data: structuredClone(mine),
      expectedRev: cloudRow.rev,
    };
  }

  const mergeResult = threeWayMergeDrug(base, mine, cloudRow.data);
  const missingPaths = mergeResult.conflicts
    .map((conflict) => conflict.path)
    .filter((path) => {
      const choice = conflictSelections?.[path];
      return choice !== "mine" && choice !== "cloud";
    });

  if (missingPaths.length > 0) {
    return {
      ok: false,
      missingPaths,
      mergeResult,
    };
  }

  const minePatchOps: JsonPatchOp[] = [];
  for (const conflict of mergeResult.conflicts) {
    if (conflictSelections?.[conflict.path] !== "mine") {
      continue;
    }
    if (conflict.mineValue === undefined) {
      minePatchOps.push({
        op: "remove",
        path: conflict.path,
        old_value: conflict.cloudValue,
      });
    } else if (conflict.cloudValue === undefined) {
      minePatchOps.push({
        op: "add",
        path: conflict.path,
        new_value: structuredClone(conflict.mineValue),
      });
    } else {
      minePatchOps.push({
        op: "replace",
        path: conflict.path,
        old_value: conflict.cloudValue,
        new_value: structuredClone(conflict.mineValue),
      });
    }
  }

  const mergedDrug =
    minePatchOps.length > 0
      ? applyJsonPatch(mergeResult.merged, minePatchOps)
      : structuredClone(mergeResult.merged);

  return {
    ok: true,
    kind: "put",
    data: mergedDrug,
    expectedRev: cloudRow.rev,
    mergeResult,
  };
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) {
    return text;
  }
  return `${text.slice(0, maxLen - 1)}…`;
}

export function formatPatchValuePreview(value: unknown): string {
  if (value === undefined) {
    return "—";
  }
  if (value === null) {
    return "null";
  }
  if (typeof value === "string") {
    return truncateText(value === "" ? '""' : value, 120);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return truncateText(JSON.stringify(value), 140);
  } catch {
    return "[unserializable]";
  }
}

export function formatRevisionDiffEntries(
  patchDiff: readonly JsonPatchOp[],
): FormattedDiffEntry[] {
  return patchDiff.map((op) => ({
    op: op.op,
    path: op.path,
    oldPreview: formatPatchValuePreview(op.old_value),
    newPreview: formatPatchValuePreview(op.new_value),
  }));
}
