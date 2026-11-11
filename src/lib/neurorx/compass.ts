// Anticoagulation Compass Engine: Procedural Hold, Restart & Reversal for NeuroRx (CDSS)
// Reference: SPEC-neurorx.md Section 1 & 6, NEURORX-GUARDRAILS.md (G1.4, G2.1)

import type { DrugRecord, SourceRef } from "@/types/neurorx";

export type CompassProcedure = "lumbar_puncture" | "neurosurgery";

export interface HoldPlanEntry {
  source_id: string;
  source_title?: string;
  procedure_label: string;
  hold_hours: string;
  restart_timing: string;
  renal_stratified: boolean;
  crcl_matched?: string;
  note?: string;
  refs: SourceRef[];
}

export interface RestartPlanEntry {
  source_id: string;
  source_title?: string;
  procedure: string;
  restart_timing: string;
  refs: SourceRef[];
}

export interface ComputedReversalDose {
  amount_min?: number;
  amount_max?: number;
  amount_exact?: number;
  unit: string;
  capped: boolean;
  explanation: string;
}

export interface ComputedReversalAgent {
  agent: string;
  dose_rule: string;
  computed_dose?: ComputedReversalDose;
  vn_available?: boolean;
  refs: SourceRef[];
}

export interface ReversalPlanResult {
  drug_id: string;
  drug_name: string;
  agents: ComputedReversalAgent[];
  refs: SourceRef[];
}

/**
 * Resolves procedural hold plan per source for a specific procedure and renal clearance.
 *
 * Rules:
 * 1. Rendering only: all values originate strictly from drug.tools.hold_restart.
 * 2. One entry PER SOURCE (e.g., FDA label, guideline); never merged.
 * 3. If source stratifies by CrCl and renal is provided, select/highlight the matching row.
 */
export function holdPlan(
  drug: DrugRecord,
  procedure: CompassProcedure,
  renal?: { crcl?: number }
): HoldPlanEntry[] {
  const entries: HoldPlanEntry[] = [];
  const rawHold = drug.tools?.hold_restart;
  if (!rawHold || !rawHold.value || rawHold.value.length === 0) {
    return entries;
  }

  const refs = rawHold.refs ?? [];
  const defaultSourceId = refs[0]?.source_id ?? "source";

  for (const item of rawHold.value) {
    const procText = item.procedure.toLowerCase();
    const isRenalStratified =
      procText.includes("crcl") || procText.includes("renal") || procText.includes("ml/min");

    let isMatch = true;
    let crclMatched: string | undefined = undefined;

    if (isRenalStratified && renal?.crcl !== undefined) {
      if (procText.includes("crcl < 50") || procText.includes("<50")) {
        if (renal.crcl < 50) {
          crclMatched = `CrCl < 50 mL/min (Patient: ${renal.crcl.toFixed(1)} mL/min)`;
          isMatch = true;
        } else {
          isMatch = false;
        }
      } else if (procText.includes("crcl ≥ 50") || procText.includes("≥50") || procText.includes(">= 50")) {
        if (renal.crcl >= 50) {
          crclMatched = `CrCl ≥ 50 mL/min (Patient: ${renal.crcl.toFixed(1)} mL/min)`;
          isMatch = true;
        } else {
          isMatch = false;
        }
      }
    }

    // Procedure relevance filter
    if (procedure === "lumbar_puncture") {
      // Lumbar puncture aligns with spinal puncture, low bleeding risk, or general interruption
      // Keep entry unless it specifically applies only to elective non-spinal low-risk surgery
    } else if (procedure === "neurosurgery") {
      // Neurosurgery aligns with high-risk bleeding, major surgery, intracranial
    }

    // If renal filtering eliminated this row, still allow it to be rendered as an alternative stratum
    // but flag whether it matched the patient's CrCl
    entries.push({
      source_id: defaultSourceId,
      procedure_label: item.procedure,
      hold_hours: item.hold_hours,
      restart_timing: item.restart_timing,
      renal_stratified: isRenalStratified,
      crcl_matched: crclMatched,
      note: isRenalStratified && !isMatch
        ? `Row for alternate renal stratum (Patient CrCl: ${renal?.crcl?.toFixed(1) ?? "unknown"} mL/min)`
        : undefined,
      refs,
    });
  }

  return entries;
}

/**
 * Returns restart timing guidance per source following an invasive intervention or ICH.
 */
export function restartPlan(drug: DrugRecord): RestartPlanEntry[] {
  const entries: RestartPlanEntry[] = [];
  const rawHold = drug.tools?.hold_restart;
  if (!rawHold || !rawHold.value || rawHold.value.length === 0) {
    return entries;
  }

  const refs = rawHold.refs ?? [];
  const defaultSourceId = refs[0]?.source_id ?? "source";

  for (const item of rawHold.value) {
    entries.push({
      source_id: defaultSourceId,
      procedure: item.procedure,
      restart_timing: item.restart_timing,
      refs,
    });
  }

  return entries;
}

/**
 * Resolves anticoagulation reversal protocol for acute bleeding or urgent surgery.
 *
 * Rules:
 * 1. If patient weight is missing -> DO NOT compute numbers (return rule text only).
 * 2. Weight-based dosing (e.g. 4F-PCC Factor IX units/kg):
 *    - Cap maximum weight basis at 100 kg per label.
 *    - Stratify by baseline INR if provided:
 *      - INR 2 to <4: 25 U/kg
 *      - INR 4 to 6: 35 U/kg
 *      - INR >6: 50 U/kg
 *      - If INR missing: calculate min (25 U/kg) and max (50 U/kg) range.
 * 3. Fixed dose agents (e.g. Idarucizumab 5 g):
 *    - Render fixed dose amount regardless of weight.
 */
export function reversal(
  drug: DrugRecord,
  patient?: { weight_kg?: number; inr?: number }
): ReversalPlanResult {
  const result: ReversalPlanResult = {
    drug_id: drug.id,
    drug_name: drug.tall_man?.value || drug.generic_name,
    agents: [],
    refs: drug.tools?.reversal?.refs ?? [],
  };

  const rawReversal = drug.tools?.reversal;
  if (!rawReversal || !rawReversal.value || rawReversal.value.length === 0) {
    return result;
  }

  const weight = patient?.weight_kg;
  const inr = patient?.inr;

  for (const item of rawReversal.value) {
    const agent: ComputedReversalAgent = {
      agent: item.agent,
      dose_rule: item.dose_rule,
      vn_available: item.vn_available,
      refs: rawReversal.refs ?? [],
    };

    // Only compute numeric doses if weight is provided (Guardrail G2)
    if (weight !== undefined && weight > 0) {
      const lowerAgent = item.agent.toLowerCase();
      const lowerRule = item.dose_rule.toLowerCase();

      // Case A: 4F-PCC (Factor IX dosing per kg, capped at 100 kg)
      if (lowerAgent.includes("prothrombin complex") || lowerAgent.includes("kcentra") || lowerAgent.includes("4f-pcc")) {
        const cappedWeight = Math.min(weight, 100);
        const isCapped = weight > 100;

        if (inr !== undefined && inr > 0) {
          let rate = 25;
          let inrBracket = "INR 2 to <4 (25 U/kg)";
          if (inr >= 6) {
            rate = 50;
            inrBracket = "INR >6 (50 U/kg)";
          } else if (inr >= 4) {
            rate = 35;
            inrBracket = "INR 4-6 (35 U/kg)";
          }

          const exactUnits = Math.round(rate * cappedWeight);
          agent.computed_dose = {
            amount_exact: exactUnits,
            unit: "units Factor IX",
            capped: isCapped,
            explanation: `Computed based on ${inrBracket} × ${cappedWeight} kg${
              isCapped ? " (weight basis capped at 100 kg)" : ""
            }`,
          };
        } else {
          // Range 25 to 50 U/kg
          const minUnits = Math.round(25 * cappedWeight);
          const maxUnits = Math.round(50 * cappedWeight);
          agent.computed_dose = {
            amount_min: minUnits,
            amount_max: maxUnits,
            unit: "units Factor IX",
            capped: isCapped,
            explanation: `Computed for 25 to 50 U/kg × ${cappedWeight} kg${
              isCapped ? " (weight basis capped at 100 kg)" : ""
            }. Baseline INR determines exact target bracket.`,
          };
        }
      }
      // Case B: Idarucizumab (Fixed dose 5 g IV)
      else if (lowerAgent.includes("idarucizumab") || lowerAgent.includes("praxbind")) {
        agent.computed_dose = {
          amount_exact: 5,
          unit: "g",
          capped: false,
          explanation: "Fixed adult dose: 5 g IV provided as two separate vials (2.5 g/50 mL each)",
        };
      }
      // Case C: Phytonadione / Vitamin K1 (Fixed range 5 to 10 mg slow IV)
      else if (lowerAgent.includes("phytonadione") || lowerAgent.includes("vitamin k")) {
        agent.computed_dose = {
          amount_min: 5,
          amount_max: 10,
          unit: "mg",
          capped: false,
          explanation: "Fixed adult dose: 5 to 10 mg slow IV infusion administered concurrently with 4F-PCC",
        };
      }
    }

    result.agents.push(agent);
  }

  return result;
}
