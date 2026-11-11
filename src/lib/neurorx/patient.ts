// Pure patient context and renal clearance engine for NeuroRx (CDSS)
// Reference: SPEC-neurorx.md Section 6 & NEURORX-GUARDRAILS.md (G2)

export interface SerumCreatinine {
  value: number;
  unit: "umol/L" | "mg/dL";
}

export interface PatientInput {
  ageYears?: number;
  sex?: "male" | "female";
  weightKg?: number;
  heightCm?: number;
  scr?: SerumCreatinine;
  crclManual?: number;
  onHemodialysis?: boolean;
}

export interface PatientParsed {
  ageYears?: number;
  sex?: "male" | "female";
  weightKg?: number;
  heightCm?: number;
  scr?: SerumCreatinine;
  crclManual?: number;
  onHemodialysis?: boolean;
  isPediatric: boolean;
}

export interface PatientParseResult {
  patient: PatientParsed;
  errors: string[];
}

export interface CrClResult {
  value: number;
  formula: string;
  inputsUsed: {
    age: number;
    sex: "male" | "female";
    weightKg: number;
    scr_mgdl: number;
  };
}

export interface RenalResolutionResult {
  value: number | null;
  basisUsed: "cg_abw" | "cg_normalized_1_73" | "egfr" | "manual";
  label: string;
  warning?: string;
}

/**
 * Validates patient physiological input ranges:
 * - Age: 0 to 120 years
 * - Weight: 2 to 300 kg
 * - Height: 50 to 250 cm
 * - SCr: > 0
 * Out-of-range values produce explicit typed errors and are omitted from computed patient object.
 */
export function parsePatient(input: PatientInput): PatientParseResult {
  const errors: string[] = [];
  const p: PatientParsed = {
    isPediatric: false,
  };

  if (input.ageYears !== undefined) {
    if (typeof input.ageYears !== "number" || isNaN(input.ageYears) || input.ageYears < 0 || input.ageYears > 120) {
      errors.push(`Invalid age: ${input.ageYears}. Must be between 0 and 120 years.`);
    } else {
      p.ageYears = input.ageYears;
      p.isPediatric = input.ageYears < 18;
    }
  }

  if (input.sex !== undefined) {
    if (input.sex !== "male" && input.sex !== "female") {
      errors.push(`Invalid biological sex: ${input.sex}. Must be 'male' or 'female'.`);
    } else {
      p.sex = input.sex;
    }
  }

  if (input.weightKg !== undefined) {
    if (typeof input.weightKg !== "number" || isNaN(input.weightKg) || input.weightKg < 2 || input.weightKg > 300) {
      errors.push(`Invalid weight: ${input.weightKg} kg. Must be between 2 and 300 kg.`);
    } else {
      p.weightKg = input.weightKg;
    }
  }

  if (input.heightCm !== undefined) {
    if (typeof input.heightCm !== "number" || isNaN(input.heightCm) || input.heightCm < 50 || input.heightCm > 250) {
      errors.push(`Invalid height: ${input.heightCm} cm. Must be between 50 and 250 cm.`);
    } else {
      p.heightCm = input.heightCm;
    }
  }

  if (input.scr !== undefined) {
    if (typeof input.scr.value !== "number" || isNaN(input.scr.value) || input.scr.value <= 0) {
      errors.push(`Invalid serum creatinine: ${input.scr.value}. Must be greater than 0.`);
    } else if (input.scr.unit !== "umol/L" && input.scr.unit !== "mg/dL") {
      errors.push(`Invalid serum creatinine unit: ${input.scr.unit}. Must be 'umol/L' or 'mg/dL'.`);
    } else {
      p.scr = { value: input.scr.value, unit: input.scr.unit };
    }
  }

  if (input.crclManual !== undefined) {
    if (typeof input.crclManual !== "number" || isNaN(input.crclManual) || input.crclManual <= 0 || input.crclManual > 300) {
      errors.push(`Invalid manual CrCl: ${input.crclManual}. Must be between 1 and 300 mL/min.`);
    } else {
      p.crclManual = input.crclManual;
    }
  }

  p.onHemodialysis = Boolean(input.onHemodialysis);

  return { patient: p, errors };
}

/**
 * Converts Serum Creatinine from SI unit (µmol/L) to conventional unit (mg/dL).
 * Formula: mg/dL = µmol/L / 88.4
 */
export function scrToMgDl(umol: number): number {
  if (umol <= 0 || isNaN(umol)) return 0;
  return umol / 88.4;
}

/**
 * Calculates Creatinine Clearance using standard Cockcroft-Gault formula (actual body weight):
 * CrCl (mL/min) = [(140 - Age) * Weight(kg)] / [72 * SCr(mg/dL)] * (0.85 if female)
 * Returns null if any required variable is missing.
 */
export function crclCG(patient: PatientParsed): CrClResult | null {
  if (
    patient.ageYears === undefined ||
    patient.sex === undefined ||
    patient.weightKg === undefined ||
    patient.scr === undefined
  ) {
    return null;
  }

  const scr_mgdl =
    patient.scr.unit === "mg/dL"
      ? patient.scr.value
      : scrToMgDl(patient.scr.value);

  if (scr_mgdl <= 0) return null;

  const sexFactor = patient.sex === "female" ? 0.85 : 1.0;
  const rawCrcl = (((140 - patient.ageYears) * patient.weightKg) / (72 * scr_mgdl)) * sexFactor;
  const rounded = Math.round(rawCrcl * 10) / 10;

  return {
    value: rounded,
    formula: "Cockcroft-Gault (actual body weight)",
    inputsUsed: {
      age: patient.ageYears,
      sex: patient.sex,
      weightKg: patient.weightKg,
      scr_mgdl: Math.round(scr_mgdl * 100) / 100,
    },
  };
}

/**
 * Calculates Body Surface Area (BSA) using Mosteller formula:
 * BSA (m²) = sqrt([Height(cm) * Weight(kg)] / 3600)
 */
export function bsaMosteller(heightCm: number, weightKg: number): number {
  if (heightCm <= 0 || weightKg <= 0 || isNaN(heightCm) || isNaN(weightKg)) return 0;
  const bsa = Math.sqrt((heightCm * weightKg) / 3600);
  return Math.round(bsa * 100) / 100;
}

/**
 * Normalizes CrCl to standard 1.73 m² body surface area:
 * CrCl_normalized (mL/min/1.73m²) = (CrCl / BSA) * 1.73
 */
export function crclNormalized173(crclMlLmin: number, bsaM2: number): number {
  if (crclMlLmin <= 0 || bsaM2 <= 0 || isNaN(crclMlLmin) || isNaN(bsaM2)) return 0;
  const normalized = (crclMlLmin / bsaM2) * 1.73;
  return Math.round(normalized * 10) / 10;
}

/**
 * Resolves renal clearance according to the specific drug's required renal basis:
 * - 'cg_abw': Cockcroft-Gault using actual body weight (mL/min)
 * - 'cg_normalized_1_73': Cockcroft-Gault adjusted to 1.73 m² (mL/min/1.73m² - e.g. Levetiracetam)
 * - 'egfr': Requires explicit manual entry (CKD-EPI equation not in scope for v1)
 * Manual override (crclManual) always takes precedence if provided.
 */
export function resolveRenalFunction(
  patient: PatientParsed,
  basis: "cg_abw" | "cg_normalized_1_73" | "egfr"
): RenalResolutionResult {
  // 1. Manual entry wins if entered
  if (patient.crclManual !== undefined && patient.crclManual > 0) {
    return {
      value: patient.crclManual,
      basisUsed: "manual",
      label: `Manual override: ${patient.crclManual} mL/min`,
    };
  }

  // 2. eGFR basis
  if (basis === "egfr") {
    return {
      value: null,
      basisUsed: "egfr",
      label: "eGFR basis required",
      warning: "This drug dosing requires eGFR. Please enter eGFR directly in the manual override field.",
    };
  }

  // 3. Compute Cockcroft-Gault
  const cgResult = crclCG(patient);
  if (!cgResult) {
    return {
      value: null,
      basisUsed: basis,
      label: "Incomplete patient data",
    };
  }

  // 4. Return standard ABW
  if (basis === "cg_abw") {
    return {
      value: cgResult.value,
      basisUsed: "cg_abw",
      label: `Cockcroft-Gault CrCl: ${cgResult.value} mL/min (Actual Body Weight)`,
    };
  }

  // 5. Normalized to 1.73 m²
  if (basis === "cg_normalized_1_73") {
    if (patient.heightCm === undefined || patient.heightCm <= 0) {
      return {
        value: null,
        basisUsed: "cg_normalized_1_73",
        label: "Height required for BSA normalization",
        warning: `This drug dosing requires BSA-normalized CrCl (mL/min/1.73m²). Unadjusted CrCl is ${cgResult.value} mL/min, but height (cm) is required to calculate BSA.`,
      };
    }

    const bsa = bsaMosteller(patient.heightCm, patient.weightKg!);
    const normalized = crclNormalized173(cgResult.value, bsa);
    return {
      value: normalized,
      basisUsed: "cg_normalized_1_73",
      label: `Normalized CrCl: ${normalized} mL/min/1.73m² (BSA: ${bsa} m²)`,
    };
  }

  return {
    value: null,
    basisUsed: basis,
    label: "Unknown basis",
  };
}
