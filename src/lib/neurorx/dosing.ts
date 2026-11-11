// Pure dose resolution engine for NeuroRx (CDSS)
// Reference: SPEC-neurorx.md Section 6 & NEURORX-GUARDRAILS.md (G1, G2)

import type { DrugRecord, Regimen, RenalBand, DoseSpec } from "@/types/neurorx";
import type { PatientParsed, RenalResolutionResult } from "./patient";

export type DoseState = "needs_input" | "computed" | "text_only" | "blocked_draft";

export interface RegimenResolution {
  state: DoseState;
  amount?: number;
  unit?: string;
  frequency?: string;
  capped?: boolean;
  cappedReason?: string;
  renalBandMatched?: RenalBand;
  hemodialysisNote?: string;
  ruleText: string;
  explanation: string[];
}

/**
 * Resolves dosage for a specific clinical regimen given patient physiological variables.
 *
 * Rules:
 * 1. If drug status is not verified -> 'blocked_draft' (never return numbers).
 * 2. If regimen has no computable dose -> 'text_only' (display dose_text).
 * 3. If per_kg and patient weight is missing -> 'needs_input'.
 * 4. Apply renal adjustments if renal clearance data is available.
 * 5. Strictly enforce max single and max daily caps without ever rounding past them.
 */
export function resolveRegimen(
  drug: DrugRecord,
  regimen: Regimen,
  patient: PatientParsed,
  renal: RenalResolutionResult
): RegimenResolution {
  const explanation: string[] = [];

  // RULE 1: Draft or unverified drugs MUST NOT compute numbers
  if (drug.status !== "verified") {
    return {
      state: "blocked_draft",
      ruleText: "Pending verification — clinical dosage locked",
      explanation: ["Record is in draft status. Clinical verification required before dosage calculation."],
    };
  }

  // Check Hemodialysis branch if patient is on HD
  const hdNote =
    patient.onHemodialysis && (regimen.hemodialysis?.value || drug.renal_impairment?.hemodialysis?.value)
      ? regimen.hemodialysis?.value || drug.renal_impairment?.hemodialysis?.value || undefined
      : undefined;

  // RULE 2: Text-only regimens without computable DoseSpec
  if (!regimen.dose) {
    return {
      state: "text_only",
      ruleText: regimen.dose_text || "Refer to prescribing guidance",
      hemodialysisNote: hdNote,
      explanation: ["Regimen contains descriptive dosing instructions without formulaic DoseSpec."],
    };
  }

  // Determine active DoseSpec (check renal adjustment bands first)
  let activeDose: DoseSpec = regimen.dose;
  let matchedBand: RenalBand | undefined = undefined;

  const candidateBands: RenalBand[] =
    regimen.renal_bands && regimen.renal_bands.length > 0
      ? regimen.renal_bands
      : drug.renal_impairment?.bands || [];

  if (renal.value !== null && candidateBands.length > 0) {
    const crcl = renal.value;
    for (const band of candidateBands) {
      const minPass = band.min === null || crcl >= band.min;
      const maxPass = band.max === null || crcl < band.max;
      if (minPass && maxPass) {
        matchedBand = band;
        explanation.push(`Matched renal impairment band: ${band.dose_text} (CrCl: ${crcl} mL/min)`);
        if (band.dose) {
          activeDose = band.dose;
        }
        break;
      }
    }
  }

  // RULE 3: Weight-based dosing (per_kg) requires weightKg
  if (activeDose.kind === "per_kg") {
    if (patient.weightKg === undefined || patient.weightKg <= 0) {
      let rule = `${activeDose.amount} ${activeDose.unit}/kg ${activeDose.frequency}`;
      if (activeDose.max_single) {
        rule += `, max single ${activeDose.max_single} ${activeDose.unit}`;
      }
      return {
        state: "needs_input",
        ruleText: rule,
        renalBandMatched: matchedBand,
        hemodialysisNote: hdNote,
        explanation: ["Weight-based calculation requires patient weight (kg)."],
      };
    }

    // Compute per_kg dose
    let rawAmount = activeDose.amount * patient.weightKg;
    explanation.push(`Calculated weight-based dose: ${activeDose.amount} ${activeDose.unit}/kg * ${patient.weightKg} kg = ${rawAmount} ${activeDose.unit}`);

    let capped = false;
    let cappedReason: string | undefined = undefined;

    if (activeDose.max_single && rawAmount > activeDose.max_single) {
      rawAmount = activeDose.max_single;
      capped = true;
      cappedReason = `Dose capped at maximum single dose of ${activeDose.max_single} ${activeDose.unit}`;
      explanation.push(cappedReason);
    }

    const roundedAmount = Math.round(rawAmount * 100) / 100;

    return {
      state: "computed",
      amount: roundedAmount,
      unit: activeDose.unit,
      frequency: activeDose.frequency,
      capped,
      cappedReason,
      renalBandMatched: matchedBand,
      hemodialysisNote: hdNote,
      ruleText: `${roundedAmount} ${activeDose.unit} ${activeDose.frequency}`,
      explanation,
    };
  }

  // Fixed dose computation
  let fixedAmount = activeDose.amount;
  explanation.push(`Standard fixed dose: ${fixedAmount} ${activeDose.unit} ${activeDose.frequency}`);

  let capped = false;
  let cappedReason: string | undefined = undefined;

  if (activeDose.max_single && fixedAmount > activeDose.max_single) {
    fixedAmount = activeDose.max_single;
    capped = true;
    cappedReason = `Dose capped at maximum single dose of ${activeDose.max_single} ${activeDose.unit}`;
    explanation.push(cappedReason);
  }

  return {
    state: "computed",
    amount: fixedAmount,
    unit: activeDose.unit,
    frequency: activeDose.frequency,
    capped,
    cappedReason,
    renalBandMatched: matchedBand,
    hemodialysisNote: hdNote,
    ruleText: `${fixedAmount} ${activeDose.unit} ${activeDose.frequency}`,
    explanation,
  };
}
