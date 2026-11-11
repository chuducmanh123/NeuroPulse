/**
 * Pure calculation engine for Levodopa Equivalent Daily Dose (LEDD) and NPO Conversion
 * Based on Tomlinson et al. (2010) systematic review and Brennan & Genever (2010) perioperative guidance.
 * Reference: tasks/neurorx-plan.md Task 19
 */

import type { SourceRef } from "@/types/neurorx";

export interface LeddFactor {
  drug_id: string;
  drug_name?: string;
  factor: number;
  unit: string;
  conditions?: string;
  refs: SourceRef[];
}

export interface NpoComputableConfig {
  target_drug_id: string;
  divisor: number;
  unit: string;
  max_dose?: number;
  available_strengths?: number[];
}

export interface NpoConversion {
  from: string;
  to: string;
  rule_text: string;
  computable?: NpoComputableConfig;
  refs: SourceRef[];
}

export interface LeddFactorsData {
  factors: LeddFactor[];
  npo_conversions?: NpoConversion[];
}

export interface RegimenItemInput {
  drug_id: string;
  dose_mg: number;
  times_per_day: number;
}

export interface LeddItemResult {
  drug_id: string;
  drug_name: string;
  daily_dose_mg: number;
  factor: number;
  ledd_mg: number;
  note?: string;
  refs: SourceRef[];
}

export interface LeddCalculationResult {
  items: LeddItemResult[];
  total_ledd_mg: number;
  modifiers_applied: string[];
}

export interface ComputedNpoResult {
  from: string;
  to: string;
  rule_text: string;
  computed_dose?: number;
  unit?: string;
  recommended_patch_combination?: string;
  is_capped?: boolean;
  refs: SourceRef[];
}

/**
 * Calculates total Levodopa Equivalent Daily Dose (LEDD) from regimen items and factors.
 * Handles COMT inhibitor modifier logic (e.g. entacapone / tolcapone ratio of levodopa dose).
 */
export function totalLEDD(
  regimenItems: RegimenItemInput[],
  factors: LeddFactor[]
): LeddCalculationResult {
  const factorMap = new Map<string, LeddFactor>();
  factors.forEach((f) => factorMap.set(f.drug_id, f));

  // First pass: identify baseline daily levodopa dose (IR + CR) for COMT multiplier calculation
  let totalBaselineLevodopaMg = 0;
  for (const item of regimenItems) {
    if (item.dose_mg > 0 && item.times_per_day > 0) {
      if (item.drug_id === "levodopa-ir") {
        totalBaselineLevodopaMg += item.dose_mg * item.times_per_day;
      } else if (item.drug_id === "levodopa-cr") {
        // Unadjusted levodopa content
        totalBaselineLevodopaMg += item.dose_mg * item.times_per_day;
      }
    }
  }

  const results: LeddItemResult[] = [];
  const modifiersApplied: string[] = [];
  let runningTotal = 0;

  for (const item of regimenItems) {
    if (item.dose_mg <= 0 || item.times_per_day <= 0) continue;

    const factorEntry = factorMap.get(item.drug_id);
    if (!factorEntry) continue;

    const dailyDose = Number((item.dose_mg * item.times_per_day).toFixed(2));
    const drugName = factorEntry.drug_name || item.drug_id;

    // Check if COMT inhibitor modifier rule applies
    if (factorEntry.unit === "multiplier_of_levodopa") {
      if (totalBaselineLevodopaMg > 0) {
        const comtLedd = Number((totalBaselineLevodopaMg * factorEntry.factor).toFixed(1));
        runningTotal += comtLedd;
        modifiersApplied.push(
          `${drugName} added ${comtLedd} mg LEDD (+${Math.round(factorEntry.factor * 100)}% of ${totalBaselineLevodopaMg} mg daily levodopa)`
        );
        results.push({
          drug_id: item.drug_id,
          drug_name: drugName,
          daily_dose_mg: dailyDose,
          factor: factorEntry.factor,
          ledd_mg: comtLedd,
          note: `Calculated as +${Math.round(factorEntry.factor * 100)}% of co-administered daily levodopa (${totalBaselineLevodopaMg} mg)`,
          refs: factorEntry.refs,
        });
      } else {
        results.push({
          drug_id: item.drug_id,
          drug_name: drugName,
          daily_dose_mg: dailyDose,
          factor: factorEntry.factor,
          ledd_mg: 0,
          note: "COMT inhibitors provide 0 LEDD without co-administered levodopa",
          refs: factorEntry.refs,
        });
      }
    } else {
      const itemLedd = Number((dailyDose * factorEntry.factor).toFixed(1));
      runningTotal += itemLedd;
      results.push({
        drug_id: item.drug_id,
        drug_name: drugName,
        daily_dose_mg: dailyDose,
        factor: factorEntry.factor,
        ledd_mg: itemLedd,
        conditions: factorEntry.conditions,
        refs: factorEntry.refs,
      } as LeddItemResult);
    }
  }

  return {
    items: results,
    total_ledd_mg: Number(runningTotal.toFixed(1)),
    modifiers_applied: modifiersApplied,
  };
}

/**
 * Calculates NPO substitution recommendations from total daily LEDD.
 */
export function resolveNpoConversions(
  totalLeddMg: number,
  conversions: NpoConversion[] = []
): ComputedNpoResult[] {
  return conversions.map((conv) => {
    if (!conv.computable || totalLeddMg <= 0) {
      return {
        from: conv.from,
        to: conv.to,
        rule_text: conv.rule_text,
        refs: conv.refs,
      };
    }

    const { divisor, max_dose, unit, available_strengths } = conv.computable;
    const rawDose = totalLeddMg / divisor;
    let finalDose = Number(rawDose.toFixed(1));
    let isCapped = false;

    if (max_dose && finalDose > max_dose) {
      finalDose = max_dose;
      isCapped = true;
    }

    let patchRecommendation: string | undefined;
    if (available_strengths && available_strengths.length > 0) {
      // Find nearest standard patch combination without cutting patches
      // Standard strengths: 2, 4, 6, 8 mg/24h
      const roundedDose = Math.round(finalDose / 2) * 2; // Nearest even number
      const effectiveTarget = isCapped ? max_dose! : Math.min(max_dose || 16, Math.max(2, roundedDose));
      
      patchRecommendation = suggestPatchCombination(effectiveTarget, available_strengths);
    }

    return {
      from: conv.from,
      to: conv.to,
      rule_text: conv.rule_text,
      computed_dose: finalDose,
      unit,
      recommended_patch_combination: patchRecommendation,
      is_capped: isCapped,
      refs: conv.refs,
    };
  });
}

/**
 * Suggests patch combination for a target dose from available discrete strengths
 */
function suggestPatchCombination(target: number, strengths: number[]): string {
  const sorted = [...strengths].sort((a, b) => b - a);
  const patches: number[] = [];
  let remaining = target;

  for (const s of sorted) {
    while (remaining >= s) {
      patches.push(s);
      remaining -= s;
    }
  }

  if (remaining > 0 && sorted.length > 0) {
    const smallest = sorted[sorted.length - 1];
    patches.push(smallest);
  }

  if (patches.length === 0) return `${target} mg/24h`;
  if (patches.length === 1) return `1 × ${patches[0]} mg/24h patch`;

  const counts: Record<number, number> = {};
  patches.forEach((p) => {
    counts[p] = (counts[p] || 0) + 1;
  });

  return Object.entries(counts)
    .sort(([a], [b]) => Number(b) - Number(a))
    .map(([size, count]) => `${count} × ${size} mg/24h patch`)
    .join(" + ");
}
