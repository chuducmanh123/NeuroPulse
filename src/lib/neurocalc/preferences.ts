import type { ClinicalPurpose, ScaleRecord } from "@/types/neurocalc";

const FAVORITES_KEY = "neurocalc_favorites_v1";
const RECENT_KEY = "neurocalc_recent_v1";
const MAX_RECENT_SCALES = 6;

export const PURPOSE_LABELS: Record<ClinicalPurpose, string> = {
  severity: "Severity",
  prognosis: "Prognosis",
  diagnosis: "Diagnosis",
  risk: "Risk",
  formula: "Formula",
  functional: "Functional",
};

export const ALL_CLINICAL_PURPOSES: ClinicalPurpose[] = [
  "severity",
  "prognosis",
  "risk",
  "formula",
  "functional",
  "diagnosis",
];

function readIdList(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is string => typeof item === "string" && item.trim().length > 0
    );
  } catch {
    return [];
  }
}

function writeIdList(key: string, ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

export function getFavoriteScaleIds(): string[] {
  return readIdList(FAVORITES_KEY);
}

export function toggleFavoriteScaleId(scaleId: string): string[] {
  const current = readIdList(FAVORITES_KEY);
  const exists = current.includes(scaleId);
  const next = exists
    ? current.filter((id) => id !== scaleId)
    : [scaleId, ...current];
  writeIdList(FAVORITES_KEY, next);
  return next;
}

export function getRecentScaleIds(): string[] {
  return readIdList(RECENT_KEY);
}

export function recordRecentScaleId(scaleId: string): string[] {
  const current = readIdList(RECENT_KEY);
  const next = [scaleId, ...current.filter((id) => id !== scaleId)].slice(
    0,
    MAX_RECENT_SCALES
  );
  writeIdList(RECENT_KEY, next);
  return next;
}

const FUNCTIONAL_IDS = new Set([
  "mrs",
  "barthel-index",
  "mg-adl",
  "hoehn-and-yahr",
]);

const PROGNOSIS_IDS = new Set([
  "ich-score",
  "egris",
  "abcd2",
  "grace-2",
  "wfns",
  "hunt-and-hess",
  "four-score",
]);

const RISK_IDS = new Set([
  "abcd2",
  "cha2ds2-vasc",
  "has-bled",
  "rope-score",
  "score2",
  "score2-op",
  "score2-diabetes",
  "ascvd-pce",
  "smart-risk-score",
  "prevent",
  "rf-cl",
  "grace-2",
]);

const DIAGNOSIS_IDS = new Set(["rf-cl", "rope-score", "mgfa-classification"]);

export function inferScalePurposes(scale: ScaleRecord): ClinicalPurpose[] {
  if (
    scale.metadata.clinical_purpose &&
    scale.metadata.clinical_purpose.length > 0
  ) {
    return scale.metadata.clinical_purpose;
  }

  const purposes = new Set<ClinicalPurpose>();
  const id = scale.id;
  const summaryLower = scale.metadata.summary.toLowerCase();

  if (scale.metadata.kind === "formula") {
    purposes.add("formula");
  }
  if (FUNCTIONAL_IDS.has(id)) {
    purposes.add("functional");
  }
  if (PROGNOSIS_IDS.has(id) || summaryLower.includes("mortality") || summaryLower.includes("prognos")) {
    purposes.add("prognosis");
  }
  if (RISK_IDS.has(id) || summaryLower.includes("risk")) {
    purposes.add("risk");
  }
  if (DIAGNOSIS_IDS.has(id) || summaryLower.includes("likelihood")) {
    purposes.add("diagnosis");
  }

  if (purposes.size === 0 || scale.metadata.kind !== "formula") {
    if (
      !purposes.has("risk") &&
      !purposes.has("formula") &&
      !purposes.has("diagnosis")
    ) {
      purposes.add("severity");
    }
  }

  return Array.from(purposes);
}
