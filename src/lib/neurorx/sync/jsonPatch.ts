/**
 * NeuroRx clinical section hashing & 3-way merge backed by shared Sync v2
 * canonicalization, SHA-256, and RFC 6902 JSON Patch primitives (`src/lib/sync/jsonPatch.ts`).
 */

import type { DrugRecord, RecordStatus } from "../../../types/neurorx.ts";
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
import type { DrugWithEffectiveStatus, ThreeWayMergeResult } from "./types.ts";

export {
  sha256Hex,
  isPlainObject,
  canonicalizeSyncValue,
  computeRootHashFromEntries,
  deepEqualSync,
  computeJsonPatch,
  applyJsonPatch,
};

export const CLINICAL_SECTIONS = [
  "regimens",
  "renal_impairment",
  "hepatic",
  "reproductive",
  "fda_interactions",
  "adverse_effects",
  "vn_products",
] as const;

const NAMED_SECTION_SET = new Set<string>(CLINICAL_SECTIONS);

export function computeRecordContentHashSync(drug: unknown): string {
  return sha256Hex(JSON.stringify(canonicalizeSyncValue(drug, true)));
}

/**
 * Evaluates effective clinical verification status and content hash match purely
 * from a DrugRecord without server-only modules (`node:*`).
 */
export function evaluateEffectiveDrug(drug: DrugRecord): DrugWithEffectiveStatus {
  const expectedHash = drug.verification?.content_hash ?? null;
  const computedHash = computeRecordContentHashSync(drug);
  const hashMatches = expectedHash !== null && computedHash === expectedHash;

  let effectiveStatus: RecordStatus = "draft";
  if (drug.status === "retired") {
    effectiveStatus = "retired";
  } else if (drug.status === "verified" && hashMatches) {
    effectiveStatus = "verified";
  }

  return {
    drug,
    effectiveStatus,
    hashMatches,
  };
}

/**
 * Computes Tier-3 Merkle leaf hashes for clinical sections of a DrugRecord.
 */
export function computeSectionHashes(
  drug: Partial<DrugRecord> | Record<string, unknown>
): Record<string, string> {
  const source: Record<string, unknown> = isPlainObject(drug)
    ? (drug as unknown as Record<string, unknown>)
    : {};
  const result: Record<string, string> = {};

  for (const section of CLINICAL_SECTIONS) {
    const val =
      source[section] === undefined
        ? section === "regimens"
          ? []
          : null
        : source[section];
    result[section] = sha256Hex(JSON.stringify(canonicalizeSyncValue(val, false)));
  }

  const coreObj: Record<string, unknown> = {};
  for (const key of Object.keys(source).sort()) {
    if (key === "verification" || NAMED_SECTION_SET.has(key)) continue;
    if (source[key] !== undefined) {
      coreObj[key] = source[key];
    }
  }
  result.core = sha256Hex(JSON.stringify(canonicalizeSyncValue(coreObj, false)));

  return result;
}

/**
 * Section-aware 3-way merge using Tier-3 section hashes to skip untouched sections in O(1).
 */
export function threeWayMergeDrug(
  base: DrugRecord,
  mine: DrugRecord,
  cloud: DrugRecord
): ThreeWayMergeResult<DrugRecord> {
  return threeWayMergeSections<Record<string, unknown>>(
    base as unknown as Record<string, unknown>,
    mine as unknown as Record<string, unknown>,
    cloud as unknown as Record<string, unknown>,
    {
      sections: CLINICAL_SECTIONS,
      computeHashes: (record) => computeSectionHashes(record),
      omitCoreKey: "verification",
    }
  ) as unknown as ThreeWayMergeResult<DrugRecord>;
}
