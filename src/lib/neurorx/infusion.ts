// Pure infusion & syringe pump helper for NeuroRx (CDSS)
// Reference: SPEC-neurorx.md Section 6 & NEURORX-GUARDRAILS.md (G1, G2)

import type { InfusionSpec } from "@/types/neurorx";

export interface InfusionCalculation {
  doseAmount: number;
  doseUnit: string;
  diluent?: string;
  volumeMl?: number;
  rateMlPerHour?: number;
  durationMin?: number;
  maxRate?: string;
  explanation: string[];
}

/**
 * Computes IV infusion volume (mL) and infusion pump rate (mL/hour)
 * based strictly on data specifications.
 * Never invents diluent volume or default durations if absent.
 */
export function computeInfusion(
  doseAmount: number,
  doseUnit: string,
  spec?: InfusionSpec
): InfusionCalculation | null {
  if (!spec) return null;

  const explanation: string[] = [];

  let volumeMl: number | undefined = undefined;
  let rateMlPerHour: number | undefined = undefined;

  // Try to parse concentration (e.g. "5 mg/mL", "10 mg/mL", "1 mg/mL")
  if (spec.final_concentration) {
    const match = spec.final_concentration.match(/^([\d.]+)\s*([a-zA-Z]+)\s*\/\s*(?:([0-9.]+)\s*)?mL$/i);
    if (match) {
      const concNum = parseFloat(match[1]);
      const concUnit = match[2].toLowerCase();
      const unitVol = match[3] ? parseFloat(match[3]) : 1.0;

      if (concUnit === doseUnit.toLowerCase() && concNum > 0) {
        volumeMl = Math.round(((doseAmount / concNum) * unitVol) * 10) / 10;
        explanation.push(`Total volume calculated from target concentration (${spec.final_concentration}): ${volumeMl} mL`);
      }
    }
  }

  // Calculate pump rate in mL/hour if duration is provided in minutes
  if (spec.duration_min && spec.duration_min > 0 && volumeMl !== undefined) {
    const hours = spec.duration_min / 60;
    rateMlPerHour = Math.round((volumeMl / hours) * 10) / 10;
    explanation.push(`Infusion pump rate: ${volumeMl} mL over ${spec.duration_min} minutes = ${rateMlPerHour} mL/h`);
  }

  return {
    doseAmount,
    doseUnit,
    diluent: spec.diluent,
    volumeMl,
    rateMlPerHour,
    durationMin: spec.duration_min,
    maxRate: spec.max_rate,
    explanation,
  };
}
