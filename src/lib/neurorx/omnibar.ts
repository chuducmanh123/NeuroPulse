// Clinical Omnibar Parser & Drug Search
// Reference: SPEC-neurorx.md Section 1 (User story 1) & tasks/neurorx-plan.md Task 7
// Pure TS engine, no React hooks, no clinical constants

import type { DrugRecord, AdverseEffectTag } from "../../types/neurorx.ts";
import type { DrugWithEffectiveStatus } from "./data.ts";
import { normalizeVietnamese } from "../vietnamese-search.ts";

export interface ParsedPatientParams {
  weightKg?: number;
  crcl?: number;
  scr?: {
    value: number;
    unit: "umol/L" | "mg/dL";
  };
  age?: number;
  sex?: "male" | "female";
}

export interface ParsedOmnibarQuery {
  rawQuery: string;
  terms: string[];
  cleanQueryText: string;
  patient: ParsedPatientParams;
}

export type MatchCategory =
  | "generic_exact"
  | "generic_prefix"
  | "brand"
  | "class"
  | "ae_tag";

export interface SearchResult {
  drug: DrugRecord;
  effectiveStatus: "verified" | "draft" | "retired";
  hashMatches: boolean;
  score: number;
  matchedBy: MatchCategory;
  matchedText: string;
}

/**
 * Parses freeform clinical omnibar query into search terms and patient parameters.
 * Examples:
 *   "keppra 60kg crcl 35" -> terms: ["keppra"], weight: 60, crcl: 35
 *   "tenecteplase 58kg" -> terms: ["tenecteplase"], weight: 58
 *   "scr 120 age 70 female" -> terms: [], scr: {120, umol/L}, age: 70, sex: female
 *   "scr 1.4 mg/dl" -> terms: [], scr: {1.4, mg/dL}
 */
export function parseQuery(queryText: string): ParsedOmnibarQuery {
  if (!queryText || typeof queryText !== "string") {
    return {
      rawQuery: "",
      terms: [],
      cleanQueryText: "",
      patient: {},
    };
  }

  const raw = queryText.trim();
  let working = raw;
  const patient: ParsedPatientParams = {};

  // 1. Weight: "60kg", "60 kg", "60.5 kg", "60kilos"
  const weightMatch = working.match(/\b(\d+(?:\.\d+)?)\s*(?:kg|kilos?)\b/i);
  if (weightMatch) {
    const val = parseFloat(weightMatch[1]);
    if (!isNaN(val) && val > 0 && val <= 400) {
      patient.weightKg = val;
      working = working.replace(weightMatch[0], " ");
    }
  }

  // 2. CrCl: "crcl 35", "clcr 35", "crcl:35", "crcl=35", "crcl 35 ml/min", "35 ml/min"
  const crclMatch =
    working.match(/\b(?:crcl|clcr|cr_cl)\s*[:=]?\s*(\d+(?:\.\d+)?)(?:\s*ml\s*\/?\s*min)?\b/i) ||
    working.match(/\b(\d+(?:\.\d+)?)\s*ml\s*\/?\s*min\b/i);
  if (crclMatch) {
    const val = parseFloat(crclMatch[1]);
    if (!isNaN(val) && val >= 0 && val <= 500) {
      patient.crcl = val;
      working = working.replace(crclMatch[0], " ");
    }
  }

  // 3. SCr: "scr 120", "scr 120 umol/l", "scr:1.4 mg/dl", "scr 1.4mg/dl"
  // Default unit if not specified is "umol/L" (SPEC §6 & Guardrails)
  const scrMatch = working.match(
    /\b(?:scr|serum\s*cr(?:eatinine)?)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(umol\/l|µmol\/l|micromol\/l|mg\/dl)?\b/i
  );
  if (scrMatch) {
    const val = parseFloat(scrMatch[1]);
    const rawUnit = scrMatch[2]?.toLowerCase();
    const unit: "umol/L" | "mg/dL" = rawUnit === "mg/dl" ? "mg/dL" : "umol/L";
    if (!isNaN(val) && val > 0) {
      patient.scr = { value: val, unit };
      working = working.replace(scrMatch[0], " ");
    }
  }

  // 4. Age: "age 70", "age: 70", "70y", "70yo", "70 yr", "70 yrs", "70 years"
  const ageMatch = working.match(
    /\b(?:age\s*[:=]?\s*(\d{1,3})|(\d{1,3})\s*(?:y|yo|yr|yrs|years?(?:\s*old)?))\b/i
  );
  if (ageMatch) {
    const ageStr = ageMatch[1] || ageMatch[2];
    const val = parseInt(ageStr, 10);
    if (!isNaN(val) && val >= 0 && val <= 130) {
      patient.age = val;
      working = working.replace(ageMatch[0], " ");
    }
  }

  // 5. Sex: "female", "male", "sex: female", "sex: male", "sex: f", "sex: m"
  const sexMatch = working.match(/\b(?:sex\s*[:=]?\s*(female|male|f|m)|(female|male))\b/i);
  if (sexMatch) {
    const sexStr = (sexMatch[1] || sexMatch[2]).toLowerCase();
    if (sexStr === "female" || sexStr === "f") {
      patient.sex = "female";
      working = working.replace(sexMatch[0], " ");
    } else if (sexStr === "male" || sexStr === "m") {
      patient.sex = "male";
      working = working.replace(sexMatch[0], " ");
    }
  }

  // Clean remaining search terms
  const cleanQueryText = working.replace(/[,\s]+/g, " ").trim();
  const terms = cleanQueryText.split(/\s+/).filter(Boolean);

  return {
    rawQuery: raw,
    terms,
    cleanQueryText,
    patient,
  };
}

/**
 * Searches and ranks drugs based on query terms:
 * Ranking: exact generic (1000) > generic prefix (800) > brand (600) > class (400) > ae_tag (200).
 * Uses Vietnamese accent-insensitive normalization.
 */
export function searchDrugs(
  terms: string[],
  drugs: (DrugWithEffectiveStatus | DrugRecord)[]
): SearchResult[] {
  // Normalize items to DrugWithEffectiveStatus
  const normalizedItems: DrugWithEffectiveStatus[] = drugs.map((item) => {
    if ("drug" in item) {
      return item;
    }
    return {
      drug: item,
      effectiveStatus: item.status === "verified" ? "verified" : "draft",
      hashMatches: item.status === "verified",
    };
  });

  if (!terms || terms.length === 0) {
    return normalizedItems.map((item) => ({
      drug: item.drug,
      effectiveStatus: item.effectiveStatus,
      hashMatches: item.hashMatches,
      score: 1,
      matchedBy: "generic_prefix",
      matchedText: item.drug.generic_name,
    }));
  }

  const queryJoined = terms.join(" ");
  const normQuery = normalizeVietnamese(queryJoined);

  const results: SearchResult[] = [];

  for (const item of normalizedItems) {
    const drug = item.drug;
    const genericNorm = normalizeVietnamese(drug.generic_name);

    // 1. Exact generic match
    if (genericNorm === normQuery) {
      results.push({
        drug,
        effectiveStatus: item.effectiveStatus,
        hashMatches: item.hashMatches,
        score: 1000,
        matchedBy: "generic_exact",
        matchedText: drug.generic_name,
      });
      continue;
    }

    // 2. Generic prefix or all terms present in generic name
    if (
      genericNorm.startsWith(normQuery) ||
      terms.every((t) => genericNorm.includes(normalizeVietnamese(t)))
    ) {
      results.push({
        drug,
        effectiveStatus: item.effectiveStatus,
        hashMatches: item.hashMatches,
        score: 800,
        matchedBy: "generic_prefix",
        matchedText: drug.generic_name,
      });
      continue;
    }

    // 3. Brand match (e.g. Keppra)
    const brands = drug.vn_products?.value || [];
    let matchedBrand: string | null = null;
    for (const b of brands) {
      const normBrand = normalizeVietnamese(b.brand);
      if (
        normBrand === normQuery ||
        normBrand.startsWith(normQuery) ||
        terms.every((t) => normBrand.includes(normalizeVietnamese(t)))
      ) {
        matchedBrand = b.brand;
        break;
      }
    }
    if (matchedBrand) {
      results.push({
        drug,
        effectiveStatus: item.effectiveStatus,
        hashMatches: item.hashMatches,
        score: 600,
        matchedBy: "brand",
        matchedText: matchedBrand,
      });
      continue;
    }

    // 4. Class match (e.g. antiepileptic)
    const classes = drug.classes || [];
    let matchedClass: string | null = null;
    for (const c of classes) {
      const normClass = normalizeVietnamese(c);
      if (
        normClass.includes(normQuery) ||
        terms.every((t) => normClass.includes(normalizeVietnamese(t)))
      ) {
        matchedClass = c;
        break;
      }
    }
    if (matchedClass) {
      results.push({
        drug,
        effectiveStatus: item.effectiveStatus,
        hashMatches: item.hashMatches,
        score: 400,
        matchedBy: "class",
        matchedText: matchedClass,
      });
      continue;
    }

    // 5. Reverse AE tag match (e.g. sedation_somnolence, psychiatric_behavioral)
    const aeTags = drug.ae_tags?.value || [];
    let matchedTag: string | null = null;
    for (const tag of aeTags) {
      const tagText = tag.replace(/_/g, " ");
      const normTag = normalizeVietnamese(tagText);
      if (
        normTag.includes(normQuery) ||
        terms.every((t) => normTag.includes(normalizeVietnamese(t)))
      ) {
        matchedTag = tagText;
        break;
      }
    }
    if (matchedTag) {
      results.push({
        drug,
        effectiveStatus: item.effectiveStatus,
        hashMatches: item.hashMatches,
        score: 200,
        matchedBy: "ae_tag",
        matchedText: matchedTag,
      });
      continue;
    }
  }

  // Sort by score descending, then alphabetically by generic name
  return results.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.drug.generic_name.localeCompare(b.drug.generic_name);
  });
}
