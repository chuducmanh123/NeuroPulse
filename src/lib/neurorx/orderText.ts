// Pure medical order text & 1-click EHR snippet generator for NeuroRx (CDSS)
// Reference: SPEC-neurorx.md Section 7 & NEURORX-GUARDRAILS.md (G3.5)

import type { DrugRecord, Regimen } from "@/types/neurorx";
import type { RegimenResolution } from "./dosing";

export const CLINICAL_DISCLAIMER =
  "Reference only. Verify against current product labelling. Prescriber is responsible.";

export interface OrderTextOutput {
  singleLine: string;
  multiLine: string;
  disclaimer: string;
}

/**
 * Builds standard EHR / clinical order text snippets for copying into hospital HIS or medical notes.
 * Strictly adheres to privacy guidelines: NEVER includes patient name, hospital ID, or confidential demographics.
 */
export function buildOrderText(
  drug: DrugRecord,
  regimen: Regimen,
  resolution: RegimenResolution,
  productUnitsText?: string
): OrderTextOutput {
  const drugName = drug.tall_man.value || drug.generic_name;
  const route = regimen.route;
  const doseStr = resolution.ruleText;

  let singleLine = `${drugName} ${doseStr} (${route})`;
  if (productUnitsText) {
    singleLine += ` [${productUnitsText}]`;
  }
  singleLine += ` — ${CLINICAL_DISCLAIMER}`;

  const lines: string[] = [
    `Rx: ${drugName}`,
    `Indication: ${regimen.indication}`,
    `Route: ${route}`,
    `Dosing: ${doseStr}`,
  ];

  if (productUnitsText) {
    lines.push(`Formulation: ${productUnitsText}`);
  }

  if (resolution.renalBandMatched) {
    lines.push(`Renal Adjustment: ${resolution.renalBandMatched.dose_text}`);
  }

  if (resolution.hemodialysisNote) {
    lines.push(`Dialysis Note: ${resolution.hemodialysisNote}`);
  }

  lines.push(`Note: ${CLINICAL_DISCLAIMER}`);

  const multiLine = lines.join("\n");

  return {
    singleLine,
    multiLine,
    disclaimer: CLINICAL_DISCLAIMER,
  };
}
