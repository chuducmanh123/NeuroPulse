/**
 * NeuroCalc 6-section Merkle hashing & 3-way merge backed by shared Sync v2
 * canonicalization, SHA-256, and RFC 6902 JSON Patch primitives (`src/lib/sync/jsonPatch.ts`).
 */

import type {
  RecordStatus,
  ScaleRecord,
  ScaleWithEffectiveStatus,
} from "../../../types/neurocalc.ts";
import {
  applyJsonPatch,
  canonicalizeSyncValue,
  computeJsonPatch,
  computeRootHashFromEntries,
  deepEqualSync,
  isPlainObject,
  sha256Hex,
  threeWayMergeSections,
} from "../../sync/jsonPatch.ts";
import type { ThreeWayMergeResult } from "../../sync/types.ts";

export {
  sha256Hex,
  isPlainObject,
  canonicalizeSyncValue,
  computeRootHashFromEntries,
  deepEqualSync,
  computeJsonPatch,
  applyJsonPatch,
};

export const CALC_SECTIONS = [
  "metadata",
  "items",
  "scoring",
  "interpretation",
  "assessment_guides",
  "references",
] as const;

export type CalcSectionName = (typeof CALC_SECTIONS)[number];

const NAMED_SECTION_SET = new Set<string>(CALC_SECTIONS);
const ARRAY_SECTIONS = new Set<string>([
  "items",
  "interpretation",
  "assessment_guides",
  "references",
]);

/**
 * Computes deterministic SHA-256 content hash for a ScaleRecord, omitting `verification`.
 */
export function computeRecordContentHashSync(scale: unknown): string {
  return sha256Hex(JSON.stringify(canonicalizeSyncValue(scale, true)));
}

/**
 * Seals a ScaleRecord as `verified`, computing `verification.content_hash`
 * AFTER setting `status: "verified"` so `evaluateEffectiveScale` matches.
 */
export function sealVerifiedScale(
  scale: ScaleRecord,
  verifiedBy: string,
  verifiedAt: string = new Date().toISOString()
): ScaleRecord {
  const withVerifiedStatus: ScaleRecord = {
    ...scale,
    status: "verified",
  };
  const contentHash = computeRecordContentHashSync(withVerifiedStatus);
  return {
    ...withVerifiedStatus,
    verification: {
      verified_by: verifiedBy,
      verified_at: verifiedAt,
      content_hash: contentHash,
    },
  };
}

/**
 * Evaluates effective clinical verification status and content_hash match
 * purely from a ScaleRecord without server-only modules (`node:*`).
 */
export function evaluateEffectiveScale(
  scale: ScaleRecord
): ScaleWithEffectiveStatus {
  const expectedHash = scale.verification?.content_hash ?? null;
  const computedHash = computeRecordContentHashSync(scale);
  const hashMatches = expectedHash !== null && computedHash === expectedHash;

  let effectiveStatus: RecordStatus = "draft";
  if (scale.status === "retired") {
    effectiveStatus = "retired";
  } else if (scale.status === "verified" && hashMatches) {
    effectiveStatus = "verified";
  }

  return {
    scale,
    effectiveStatus,
    hashMatches,
  };
}

/**
 * Computes Tier-3 Merkle leaf hashes for the 6 granular blocks of a ScaleRecord,
 * plus a `core` hash covering top-level fields outside `CALC_SECTIONS` and `verification`.
 */
export function computeSectionHashes(
  scale: Partial<ScaleRecord> | Record<string, unknown>
): Record<string, string> {
  const source: Record<string, unknown> = isPlainObject(scale)
    ? (scale as Record<string, unknown>)
    : {};
  const result: Record<string, string> = {};

  for (const section of CALC_SECTIONS) {
    const val =
      source[section] === undefined
        ? ARRAY_SECTIONS.has(section)
          ? []
          : null
        : source[section];
    result[section] = sha256Hex(
      JSON.stringify(canonicalizeSyncValue(val, false))
    );
  }

  const coreObj: Record<string, unknown> = {};
  for (const key of Object.keys(source).sort()) {
    if (key === "verification" || NAMED_SECTION_SET.has(key)) continue;
    if (source[key] !== undefined) {
      coreObj[key] = source[key];
    }
  }
  result.core = sha256Hex(
    JSON.stringify(canonicalizeSyncValue(coreObj, false))
  );

  return result;
}

/**
 * Section-aware 3-way merge using Tier-3 section hashes to skip untouched sections in O(1).
 */
export function threeWayMergeScale(
  base: ScaleRecord,
  mine: ScaleRecord,
  cloud: ScaleRecord
): ThreeWayMergeResult<ScaleRecord> {
  return threeWayMergeSections<Record<string, unknown>>(
    base as unknown as Record<string, unknown>,
    mine as unknown as Record<string, unknown>,
    cloud as unknown as Record<string, unknown>,
    {
      sections: CALC_SECTIONS,
      computeHashes: (record) => computeSectionHashes(record),
      omitCoreKey: "verification",
    }
  ) as unknown as ThreeWayMergeResult<ScaleRecord>;
}
