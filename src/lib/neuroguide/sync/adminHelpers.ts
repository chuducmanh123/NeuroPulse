import {
  applyJsonPatch,
  cloneJson,
  computeJsonPatch,
  deepEqualSync,
  escapePointerSegment,
  threeWayMergeSections,
} from "../../sync/jsonPatch.ts";
import { computeBlockSectionHashes } from "./blockGraph.ts";
import { stripRuntimeBlockMeta } from "./lookupHelpers.ts";
import type {
  JsonPatchOp,
  NeuroGuideBlockRevisionRow,
  NeuroGuideContentBlockData,
  NeuroGuideContentBlockRow,
} from "./types.ts";

export const NEUROGUIDE_DRAFT_AUTOSAVE_INTERVAL_MS = 3000;
export const NEUROGUIDE_BLOCK_DRAFT_KEY_PREFIX = "neuroguide-block-draft:";

export interface DraftStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  readonly length?: number;
  key?(index: number): string | null;
}

export type NeuroGuideBlockWriteInput = NeuroGuideContentBlockData;

export interface LocalBlockDraftRecord {
  uid: string;
  baseRev: number;
  savedAt: string;
  data: NeuroGuideContentBlockData;
  note?: string;
}

export type BlockConflictResolutionMode =
  | "use_cloud"
  | "smart_merge"
  | "force_overwrite";

export type BlockDiffSection = "payload" | "facetIndex" | "meta" | "top";

export interface BlockFieldConflict {
  path: string;
  section: BlockDiffSection;
  field: string;
  baseValue: unknown;
  myValue: unknown;
  mineValue: unknown;
  cloudValue: unknown;
}

export interface BlockThreeWayMergeResult {
  merged: NeuroGuideContentBlockData;
  conflicts: BlockFieldConflict[];
  autoMergedPaths: string[];
}

export interface BlockConflictSummary {
  mineVsCloudDiff: JsonPatchOp[];
  mergeResult: BlockThreeWayMergeResult;
}

export interface FormattedBlockDiffEntry {
  op: JsonPatchOp["op"];
  section: BlockDiffSection;
  path: string;
  oldPreview: string;
  newPreview: string;
}

function classifyPathSection(path: string): BlockDiffSection {
  if (path === "/payload" || path.startsWith("/payload/")) return "payload";
  if (path === "/facetIndex" || path.startsWith("/facetIndex/")) return "facetIndex";
  if (path === "/meta" || path.startsWith("/meta/") || path === "/blockKey" || path === "/blockType") {
    return "meta";
  }
  return "top";
}

function extractFieldLabel(path: string): string {
  const segments = path.split("/").filter(Boolean);
  if (segments.length === 0) return path;
  if (
    (segments[0] === "payload" || segments[0] === "facetIndex") &&
    segments.length > 1
  ) {
    return segments.slice(1).join(".");
  }
  return segments.join(".");
}

function normalizeBlockDataForSync(
  raw: NeuroGuideContentBlockData,
): NeuroGuideContentBlockData {
  const cloned = cloneJson(raw);
  if (
    cloned.payload.kind === "recommendation" ||
    cloned.payload.kind === "shared_clinical_block"
  ) {
    cloned.payload.practiceChange = stripRuntimeBlockMeta(
      cloned.payload.practiceChange,
    );
  }
  return cloned;
}

export function buildNeuroGuideBlockDraftStorageKey(
  uid: string,
  baseRev: number,
): string {
  return `${NEUROGUIDE_BLOCK_DRAFT_KEY_PREFIX}${uid}:${baseRev}`;
}

export function saveLocalBlockDraft(
  storage: DraftStorageLike | null | undefined,
  draft: Omit<LocalBlockDraftRecord, "savedAt"> & { savedAt?: string },
): boolean {
  if (!storage || !draft.uid || !Number.isFinite(draft.baseRev) || !draft.data) {
    return false;
  }
  const payload: LocalBlockDraftRecord = {
    uid: draft.uid,
    baseRev: draft.baseRev,
    savedAt: draft.savedAt ?? new Date().toISOString(),
    data: normalizeBlockDataForSync(draft.data),
    ...(draft.note !== undefined ? { note: draft.note } : {}),
  };
  try {
    storage.setItem(
      buildNeuroGuideBlockDraftStorageKey(draft.uid, draft.baseRev),
      JSON.stringify(payload),
    );
    return true;
  } catch {
    return false;
  }
}

export function loadLocalBlockDraft(
  storage: DraftStorageLike | null | undefined,
  uid: string,
  baseRev: number,
): LocalBlockDraftRecord | null {
  if (!storage || !uid) {
    return null;
  }
  try {
    const raw = storage.getItem(buildNeuroGuideBlockDraftStorageKey(uid, baseRev));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<LocalBlockDraftRecord>;
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
      ...(typeof parsed.note === "string" ? { note: parsed.note } : {}),
    };
  } catch {
    return null;
  }
}

export function findLatestLocalBlockDraftForUid(
  storage: DraftStorageLike | null | undefined,
  uid: string,
): LocalBlockDraftRecord | null {
  if (!storage || !uid) {
    return null;
  }
  const prefix = `${NEUROGUIDE_BLOCK_DRAFT_KEY_PREFIX}${uid}:`;
  const candidates: LocalBlockDraftRecord[] = [];

  try {
    if (typeof storage.length === "number" && typeof storage.key === "function") {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!key || !key.startsWith(prefix)) continue;
        const raw = storage.getItem(key);
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw) as Partial<LocalBlockDraftRecord>;
          if (
            parsed &&
            parsed.uid === uid &&
            typeof parsed.baseRev === "number" &&
            parsed.data &&
            typeof parsed.data === "object"
          ) {
            candidates.push({
              uid: parsed.uid,
              baseRev: parsed.baseRev,
              savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : "",
              data: parsed.data,
              ...(typeof parsed.note === "string" ? { note: parsed.note } : {}),
            });
          }
        } catch {
          // ignore malformed entry
        }
      }
    }
  } catch {
    return null;
  }

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => {
    if (a.savedAt !== b.savedAt) {
      return b.savedAt.localeCompare(a.savedAt);
    }
    return b.baseRev - a.baseRev;
  });
  return candidates[0];
}

export function clearLocalBlockDraft(
  storage: DraftStorageLike | null | undefined,
  uid: string,
  baseRev: number,
): void {
  if (!storage || !uid) {
    return;
  }
  try {
    storage.removeItem(buildNeuroGuideBlockDraftStorageKey(uid, baseRev));
  } catch {
    // ignore storage errors
  }
}

export function clearLocalBlockDraftsForUid(
  storage: DraftStorageLike | null | undefined,
  uid: string,
): void {
  if (!storage || !uid) {
    return;
  }
  const prefix = `${NEUROGUIDE_BLOCK_DRAFT_KEY_PREFIX}${uid}:`;
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
      storage.removeItem(buildNeuroGuideBlockDraftStorageKey(uid, 0));
    }
  } catch {
    // ignore storage errors
  }
}

function collectTwoWayLeafConflicts(
  mineVal: unknown,
  cloudVal: unknown,
  path: string,
  conflicts: BlockFieldConflict[],
): void {
  if (deepEqualSync(mineVal, cloudVal)) {
    return;
  }
  if (
    mineVal !== null &&
    cloudVal !== null &&
    typeof mineVal === "object" &&
    typeof cloudVal === "object" &&
    !Array.isArray(mineVal) &&
    !Array.isArray(cloudVal)
  ) {
    const mineRec = mineVal as Record<string, unknown>;
    const cloudRec = cloudVal as Record<string, unknown>;
    const keys = Array.from(
      new Set([...Object.keys(mineRec), ...Object.keys(cloudRec)]),
    ).sort();
    for (const k of keys) {
      collectTwoWayLeafConflicts(
        mineRec[k],
        cloudRec[k],
        `${path}/${escapePointerSegment(k)}`,
        conflicts,
      );
    }
    return;
  }

  conflicts.push({
    path,
    section: classifyPathSection(path),
    field: extractFieldLabel(path),
    baseValue: undefined,
    myValue: cloneJson(mineVal),
    mineValue: cloneJson(mineVal),
    cloudValue: cloneJson(cloudVal),
  });
}

/**
 * Section-aware 3-way merge across NeuroGuide block Merkle sections (`payload`, `facetIndex`, `meta`).
 * Non-overlapping multi-axis facet edits (`domains`, `timeWindowIds`, `interventionTags`, etc.)
 * auto-merge deterministically; true leaf collisions surface in `conflicts`.
 */
export function threeWayMergeBlock(
  base: NeuroGuideContentBlockRow | null,
  mine: NeuroGuideBlockWriteInput,
  cloud: NeuroGuideContentBlockRow,
): BlockThreeWayMergeResult {
  const mineClean = normalizeBlockDataForSync(mine);
  const cloudClean = normalizeBlockDataForSync(cloud.data);

  if (!base) {
    const conflicts: BlockFieldConflict[] = [];
    collectTwoWayLeafConflicts(mineClean, cloudClean, "", conflicts);
    return {
      merged: cloudClean,
      conflicts,
      autoMergedPaths: [],
    };
  }

  const baseClean = normalizeBlockDataForSync(base.data);
  const res = threeWayMergeSections(
    baseClean as unknown as Record<string, unknown>,
    mineClean as unknown as Record<string, unknown>,
    cloudClean as unknown as Record<string, unknown>,
    {
      sections: ["payload", "facetIndex"],
      computeHashes: (record) => {
        const h = computeBlockSectionHashes(
          record as unknown as NeuroGuideContentBlockData,
        );
        return {
          payload: h.payload,
          facetIndex: h.facetIndex,
          core: h.meta,
        };
      },
    },
  );

  const conflicts: BlockFieldConflict[] = res.conflicts.map((c) => ({
    path: c.path,
    section: classifyPathSection(c.path),
    field: extractFieldLabel(c.path),
    baseValue: c.baseValue,
    myValue: c.mineValue,
    mineValue: c.mineValue,
    cloudValue: c.cloudValue,
  }));

  return {
    merged: res.merged as unknown as NeuroGuideContentBlockData,
    conflicts,
    autoMergedPaths: res.autoMergedPaths,
  };
}

export function buildBlockConflictSummary(
  base: NeuroGuideContentBlockRow | null,
  mine: NeuroGuideBlockWriteInput,
  cloud: NeuroGuideContentBlockRow,
): BlockConflictSummary {
  const mineClean = normalizeBlockDataForSync(mine);
  const cloudClean = normalizeBlockDataForSync(cloud.data);
  return {
    mineVsCloudDiff: computeJsonPatch(cloudClean, mineClean),
    mergeResult: threeWayMergeBlock(base, mineClean, cloud),
  };
}

/**
 * Resolves a 409 REV_CONFLICT according to the chosen mode (`use_cloud`, `smart_merge`, `force_overwrite`).
 */
export function resolveBlockConflictChoice(params: {
  mode: BlockConflictResolutionMode;
  base: NeuroGuideContentBlockRow | null;
  mine: NeuroGuideBlockWriteInput;
  cloud: NeuroGuideContentBlockRow;
  fieldChoices?: Record<string, "mine" | "cloud">;
}): {
  nextInput: NeuroGuideBlockWriteInput;
  expectedRev: number;
  unresolvedPaths: string[];
  mergeResult?: BlockThreeWayMergeResult;
} {
  const { mode, base, mine, cloud, fieldChoices } = params;

  if (mode === "use_cloud") {
    return {
      nextInput: normalizeBlockDataForSync(cloud.data),
      expectedRev: cloud.rev,
      unresolvedPaths: [],
    };
  }

  if (mode === "force_overwrite") {
    return {
      nextInput: normalizeBlockDataForSync(mine),
      expectedRev: cloud.rev,
      unresolvedPaths: [],
    };
  }

  const mergeResult = threeWayMergeBlock(base, mine, cloud);
  const unresolvedPaths = mergeResult.conflicts
    .map((c) => c.path)
    .filter((p) => {
      const choice = fieldChoices?.[p];
      return choice !== "mine" && choice !== "cloud";
    });

  const mineOps: JsonPatchOp[] = [];
  for (const conflict of mergeResult.conflicts) {
    if (fieldChoices?.[conflict.path] !== "mine") continue;
    if (conflict.myValue === undefined) {
      mineOps.push({
        op: "remove",
        path: conflict.path,
        old_value: conflict.cloudValue,
      });
    } else if (conflict.cloudValue === undefined) {
      mineOps.push({
        op: "add",
        path: conflict.path,
        new_value: cloneJson(conflict.myValue),
      });
    } else {
      mineOps.push({
        op: "replace",
        path: conflict.path,
        old_value: conflict.cloudValue,
        new_value: cloneJson(conflict.myValue),
      });
    }
  }

  const nextData =
    mineOps.length > 0
      ? (applyJsonPatch(mergeResult.merged, mineOps) as NeuroGuideContentBlockData)
      : cloneJson(mergeResult.merged);

  return {
    nextInput: normalizeBlockDataForSync(nextData),
    expectedRev: cloud.rev,
    unresolvedPaths,
    mergeResult,
  };
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) {
    return text;
  }
  return `${text.slice(0, maxLen - 1)}…`;
}

export function formatPatchValuePreview(value: unknown, maxLen = 120): string {
  if (value === undefined) {
    return "—";
  }
  if (value === null) {
    return "null";
  }
  if (typeof value === "string") {
    return truncateText(value === "" ? '""' : value, maxLen);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return truncateText(JSON.stringify(value), Math.max(maxLen, 140));
  } catch {
    return "[unserializable]";
  }
}

/**
 * Formats RFC 6902 patch diffs from a block revision into section-annotated UI entries.
 */
export function formatBlockRevisionDiffEntries(
  revisionOrPatch: NeuroGuideBlockRevisionRow | readonly JsonPatchOp[],
): FormattedBlockDiffEntry[] {
  const patchDiff = Array.isArray(revisionOrPatch)
    ? revisionOrPatch
    : (revisionOrPatch as NeuroGuideBlockRevisionRow)?.patchDiff ?? [];

  return patchDiff.map((op) => ({
    op: op.op,
    section: classifyPathSection(op.path),
    path: op.path,
    oldPreview: formatPatchValuePreview(op.old_value),
    newPreview: formatPatchValuePreview(op.new_value),
  }));
}
