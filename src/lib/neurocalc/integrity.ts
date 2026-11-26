/**
 * Pure-TS integrity facade for NeuroCalc (client + server + CLI safe, zero node:* imports).
 */

export {
  CALC_SECTIONS,
  computeRecordContentHashSync,
  computeRootHashFromEntries,
  computeSectionHashes,
  evaluateEffectiveScale,
  sealVerifiedScale,
  threeWayMergeScale,
} from "./sync/jsonPatch.ts";
export type { CalcSectionName } from "./sync/jsonPatch.ts";
import { computeRecordContentHashSync } from "./sync/jsonPatch.ts";

export function computeContentHashSync(record: unknown): string {
  return computeRecordContentHashSync(record);
}

export async function computeContentHash(record: unknown): Promise<string> {
  return computeRecordContentHashSync(record);
}
