import type { FormulaId } from "../../types/neurocalc.ts";

export const FORMULA_METADATA: Record<
  FormulaId,
  { label: string; equation: string; description: string }
> = {
  abc_2: {
    label: "ABC/2 Intracerebral Hemorrhage Volume",
    equation: "(a * b * c) / 2",
    description:
      "Ellipsoid approximation of hematoma volume using longest diameter A, perpendicular diameter B, and slice height C (cm).",
  },
  corrected_na_katz: {
    label: "Corrected Sodium (Katz 1973)",
    equation: "measured_na + 0.016 * max(0, glucose - 100)",
    description:
      "Adds 1.6 mEq/L per 100 mg/dL of glucose above 100 mg/dL (0 added below 100 mg/dL).",
  },
  corrected_phenytoin_winter_tozer: {
    label: "Corrected Phenytoin (Winter-Tozer)",
    equation: "measured_phenytoin / (renal_coefficient * albumin + 0.1)",
    description:
      "Adjusts total phenytoin for hypoalbuminemia using renal coefficient 0.2 (normal) or 0.1 (ESRD / CrCl < 10).",
  },
  serum_osmolality: {
    label: "Calculated Serum Osmolality",
    equation: "2 * sodium + glucose / 18 + bun / 2.8 + ethanol / 4.6",
    description:
      "Estimates serum osmolality in mOsm/kg from sodium, glucose, BUN, and optional ethanol.",
  },
  score2: {
    label: "SCORE2 10-Year CVD Risk (Age 40–69, ESC 2021)",
    equation:
      "100 * (1 - exp(-exp(scale1 + scale2 * ln(-ln(1 - (1 - S0^exp(LP)))))))",
    description:
      "Sex-specific Cox proportional hazards model with age interactions and European risk-region recalibration (Low, Moderate, High, Very high).",
  },
  score2_op: {
    label: "SCORE2-OP 10-Year CVD Risk (Age 70–89, ESC 2021)",
    equation:
      "100 * (1 - exp(-exp(scale1 + scale2 * ln(-ln(1 - (1 - S0^exp(LP - meanLP)))))))",
    description:
      "Competing-risk adjusted model for older adults (70–89 years) with sex-specific coefficients and regional recalibration.",
  },
  score2_diabetes: {
    label: "SCORE2-Diabetes 10-Year CVD Risk (ESC 2023)",
    equation:
      "100 * (1 - exp(-exp(scale1 + scale2 * ln(-ln(1 - (1 - S0^exp(LP_dm)))))))",
    description:
      "Extends SCORE2 for adults aged 40–69 with type 2 diabetes using age at diagnosis, HbA1c, and log-eGFR (linear + quadratic).",
  },
  ascvd_pce: {
    label: "ASCVD Pooled Cohort Equations (2013 ACC/AHA)",
    equation: "100 * (1 - S10^exp(IndX - MeanX))",
    description:
      "Sex- and race-specific 10-year hard ASCVD risk model (Goff et al., Circulation 2014) using log-transformed lipids, SBP, and interactions.",
  },
  smart2: {
    label: "SMART2 10-Year Recurrent CVD Risk (Hageman et al. 2022)",
    equation: "100 * (1 - (1 - 0.165822797)^exp(LP - LP_mean - ln(EO_ratio)))",
    description:
      "Estimates 10-year recurrent MACE in patients with established atherosclerotic vascular disease with 9 regional E/O recalibrations.",
  },
  prevent_10y_cvd: {
    label: "AHA PREVENT 10-Year Total CVD Risk (Khan et al. 2024)",
    equation: "100 / (1 + exp(-logOdds))",
    description:
      "Race-free 10-year total CVD logistic model integrating CKM health (eGFR piecewise spline, non-HDL, HDL, SBP spline, statin & BP therapy).",
  },
  grace_2_1y_death: {
    label: "GRACE 2.0 1-Year Mortality Risk (Fox et al. 2014 / V2)",
    equation: "100 * (1 - 0.9983577131^exp(x'beta_rcs))",
    description:
      "Restricted cubic spline Cox model (UMass GRACE V2 coefficients) for 1-year all-cause mortality in acute coronary syndrome.",
  },
  rf_cl: {
    label: "RF-CL Obstructive CAD Likelihood (ESC 2024 / Winther 2020)",
    equation: "LookupMatrix[sex][symptom_score][age_group][risk_factor_tier]",
    description:
      "2024 ESC Chronic Coronary Syndromes Figure 4 pre-test clinical likelihood (%) stratified by age, sex, symptom score, and 0–5 risk factors.",
  },
};

function isFiniteNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

// --- ESC SCORE2 / SCORE2-OP / SCORE2-Diabetes helpers ---
const SCORE2_SCALES: Record<
  number,
  { male: [number, number]; female: [number, number] }
> = {
  0: { male: [-0.5699, 0.7476], female: [-0.738, 0.7019] }, // Low
  1: { male: [-0.1565, 0.8009], female: [-0.3143, 0.7701] }, // Moderate
  2: { male: [0.3207, 0.936], female: [0.571, 0.9369] }, // High
  3: { male: [0.5836, 0.8294], female: [0.9412, 0.8329] }, // Very high
};

const SCORE2_OP_SCALES: Record<
  number,
  { male: [number, number]; female: [number, number] }
> = {
  0: { male: [-0.34, 1.19], female: [-0.52, 1.01] }, // Low
  1: { male: [0.01, 1.25], female: [-0.1, 1.1] }, // Moderate
  2: { male: [0.08, 1.15], female: [0.38, 1.09] }, // High
  3: { male: [0.05, 0.7], female: [0.38, 0.69] }, // Very high
};

function recalibrateScore2(
  uncalibrated: number,
  scale1: number,
  scale2: number
): number | null {
  if (!(uncalibrated > 0 && uncalibrated < 1)) {
    return uncalibrated <= 0 ? 0 : uncalibrated >= 1 ? 100 : null;
  }
  const inner = Math.log(-Math.log(1 - uncalibrated));
  const calibrated = 1 - Math.exp(-Math.exp(scale1 + scale2 * inner));
  return Number.isFinite(calibrated) ? calibrated * 100 : null;
}

// --- GRACE 2.0 Restricted Cubic Spline helper ---
function grRcs(x: number, k: number, p: number, l: number): number {
  const pos3 = (v: number) => (v > 0 ? v * v * v : 0);
  return (
    pos3(x - k) -
    (pos3(x - p) * (l - k)) / (l - p) +
    (pos3(x - l) * (p - k)) / (l - p)
  );
}

// --- RF-CL Lookup Matrix (ESC 2024 CCS Guidelines Figure 4 / Winther 2020) ---
// Dimensions: [sex: 0=female, 1=male][symptom: 0=0-1pts, 1=2pts, 2=3pts][ageGroup: 0..4][rfTier: 0=(0-1), 1=(2-3), 2=(4-5)]
const RF_CL_MATRIX: number[][][][] = [
  // Female (0)
  [
    // Symptom 0-1
    [
      [1, 1, 3], // 30-39
      [1, 2, 5], // 40-49
      [1, 2, 4], // 50-59
      [2, 4, 7], // 60-69
      [3, 5, 9], // 70-80
    ],
    // Symptom 2
    [
      [1, 2, 4], // 30-39
      [2, 3, 7], // 40-49
      [3, 6, 11], // 50-59
      [6, 10, 15], // 60-69
      [9, 14, 22], // 70-80
    ],
    // Symptom 3
    [
      [2, 4, 8], // 30-39
      [3, 6, 12], // 40-49
      [6, 11, 17], // 50-59
      [10, 14, 19], // 60-69
      [14, 20, 27], // 70-80
    ],
  ],
  // Male (1)
  [
    // Symptom 0-1
    [
      [1, 2, 5], // 30-39
      [1, 2, 5], // 40-49
      [2, 4, 8], // 50-59
      [3, 6, 12], // 60-69
      [4, 7, 12], // 70-80
    ],
    // Symptom 2
    [
      [2, 4, 7], // 30-39
      [3, 6, 11], // 40-49
      [6, 10, 15], // 50-59
      [10, 14, 19], // 60-69
      [14, 20, 27], // 70-80
    ],
    // Symptom 3
    [
      [6, 10, 16], // 30-39
      [10, 14, 19], // 40-49
      [16, 19, 23], // 50-59
      [21, 27, 33], // 60-69
      [32, 35, 39], // 70-80
    ],
  ],
];

/**
 * Evaluates a named, published mathematical equation using canonical-unit numeric inputs.
 * Contains zero clinical interpretation thresholds or UI concerns.
 */
export function evaluateFormula(
  formulaId: FormulaId,
  values: Record<string, number>
): number | null {
  switch (formulaId) {
    case "abc_2": {
      const a = values.a;
      const b = values.b;
      if (!isFiniteNum(a) || !isFiniteNum(b)) return null;
      const c = isFiniteNum(values.c)
        ? values.c
        : isFiniteNum(values.slices) && isFiniteNum(values.slice_thickness)
          ? values.slices * values.slice_thickness
          : null;
      if (c === null) return null;
      return (a * b * c) / 2;
    }

    case "corrected_na_katz": {
      const measuredNa = values.measured_na;
      const glucose = values.glucose;
      if (!isFiniteNum(measuredNa) || !isFiniteNum(glucose)) return null;
      return measuredNa + 0.016 * Math.max(0, glucose - 100);
    }

    case "corrected_phenytoin_winter_tozer": {
      const measuredPhenytoin = values.measured_phenytoin;
      const albumin = values.albumin;
      const renalCoeff = isFiniteNum(values.renal_coefficient)
        ? values.renal_coefficient
        : 0.2;
      if (!isFiniteNum(measuredPhenytoin) || !isFiniteNum(albumin)) return null;
      const denom = renalCoeff * albumin + 0.1;
      if (denom <= 0) return null;
      return measuredPhenytoin / denom;
    }

    case "serum_osmolality": {
      const sodium = values.sodium;
      const glucose = values.glucose;
      const bun = values.bun;
      const ethanol = isFiniteNum(values.ethanol) ? values.ethanol : 0;
      if (!isFiniteNum(sodium) || !isFiniteNum(glucose) || !isFiniteNum(bun)) {
        return null;
      }
      return 2 * sodium + glucose / 18 + bun / 2.8 + ethanol / 4.6;
    }

    case "score2": {
      const { sex, region, age, smoker, sbp, total_chol, hdl_chol } = values;
      if (
        !isFiniteNum(sex) ||
        !isFiniteNum(region) ||
        !isFiniteNum(age) ||
        !isFiniteNum(smoker) ||
        !isFiniteNum(sbp) ||
        !isFiniteNum(total_chol) ||
        !isFiniteNum(hdl_chol)
      ) {
        return null;
      }
      const scales = SCORE2_SCALES[Math.round(region)];
      if (!scales) return null;
      const isMale = sex === 1;
      const [scale1, scale2] = isMale ? scales.male : scales.female;

      const cage = (age - 60) / 5;
      const csbp = (sbp - 120) / 20;
      const ctchol = total_chol - 6;
      const chdl = (hdl_chol - 1.3) / 0.5;

      const lp = isMale
        ? 0.3742 * cage +
          0.6012 * smoker +
          0.2777 * csbp +
          0.1458 * ctchol +
          -0.2698 * chdl +
          -0.0755 * cage * smoker +
          -0.0255 * cage * csbp +
          -0.0281 * cage * ctchol +
          0.0426 * cage * chdl
        : 0.4648 * cage +
          0.7744 * smoker +
          0.3131 * csbp +
          0.1002 * ctchol +
          -0.2606 * chdl +
          -0.1088 * cage * smoker +
          -0.0277 * cage * csbp +
          -0.0226 * cage * ctchol +
          0.0613 * cage * chdl;

      const s0 = isMale ? 0.9605 : 0.9776;
      const uncal = 1 - Math.pow(s0, Math.exp(lp));
      return recalibrateScore2(uncal, scale1, scale2);
    }

    case "score2_op": {
      const { sex, region, age, smoker, diabetes, sbp, total_chol, hdl_chol } =
        values;
      if (
        !isFiniteNum(sex) ||
        !isFiniteNum(region) ||
        !isFiniteNum(age) ||
        !isFiniteNum(smoker) ||
        !isFiniteNum(diabetes) ||
        !isFiniteNum(sbp) ||
        !isFiniteNum(total_chol) ||
        !isFiniteNum(hdl_chol)
      ) {
        return null;
      }
      const scales = SCORE2_OP_SCALES[Math.round(region)];
      if (!scales) return null;
      const isMale = sex === 1;
      const [scale1, scale2] = isMale ? scales.male : scales.female;

      const cage = age - 73;
      const csbp = sbp - 150;
      const ctchol = total_chol - 6;
      const chdl = hdl_chol - 1.4;

      const lp = isMale
        ? 0.0634 * cage +
          0.4245 * diabetes +
          0.3524 * smoker +
          0.0094 * csbp +
          0.085 * ctchol +
          -0.3564 * chdl +
          -0.0174 * cage * diabetes +
          -0.0247 * cage * smoker +
          -0.0005 * cage * csbp +
          0.0073 * cage * ctchol +
          0.0091 * cage * chdl
        : 0.0789 * cage +
          0.601 * diabetes +
          0.4921 * smoker +
          0.0102 * csbp +
          0.0605 * ctchol +
          -0.304 * chdl +
          -0.0107 * cage * diabetes +
          -0.0255 * cage * smoker +
          -0.0004 * cage * csbp +
          -0.0009 * cage * ctchol +
          0.0154 * cage * chdl;

      const uncal = isMale
        ? 1 - Math.pow(0.7576, Math.exp(lp - 0.0929))
        : 1 - Math.pow(0.8082, Math.exp(lp - 0.229));
      return recalibrateScore2(uncal, scale1, scale2);
    }

    case "score2_diabetes": {
      const {
        sex,
        region,
        age,
        smoker,
        sbp,
        total_chol,
        hdl_chol,
        diabetes_age,
        hba1c,
        egfr,
      } = values;
      if (
        !isFiniteNum(sex) ||
        !isFiniteNum(region) ||
        !isFiniteNum(age) ||
        !isFiniteNum(smoker) ||
        !isFiniteNum(sbp) ||
        !isFiniteNum(total_chol) ||
        !isFiniteNum(hdl_chol) ||
        !isFiniteNum(diabetes_age) ||
        !isFiniteNum(hba1c) ||
        !isFiniteNum(egfr) ||
        egfr <= 0
      ) {
        return null;
      }
      const scales = SCORE2_SCALES[Math.round(region)];
      if (!scales) return null;
      const isMale = sex === 1;
      const [scale1, scale2] = isMale ? scales.male : scales.female;

      const cage = (age - 60) / 5;
      const csbp = (sbp - 120) / 20;
      const ctchol = total_chol - 6;
      const chdl = (hdl_chol - 1.3) / 0.5;
      const cagediab = (Math.min(diabetes_age, age) - 50) / 5;
      const chba1c = (hba1c - 31) / 9.34;
      const clnegfr = (Math.log(egfr) - 4.5) / 0.15;

      const lp = isMale
        ? 0.5368 * cage +
          0.4774 * smoker +
          0.1322 * csbp +
          0.6457 +
          0.1102 * ctchol +
          -0.1087 * chdl +
          -0.0672 * cage * smoker +
          -0.0268 * cage * csbp +
          -0.0983 * cage +
          -0.0181 * cage * ctchol +
          0.0095 * cage * chdl +
          -0.0998 * cagediab +
          0.0955 * chba1c +
          -0.0591 * clnegfr +
          0.0058 * clnegfr * clnegfr +
          -0.0134 * chba1c * cage +
          0.0115 * clnegfr * cage
        : 0.6624 * cage +
          0.6139 * smoker +
          0.1421 * csbp +
          0.8096 +
          0.1127 * ctchol +
          -0.1568 * chdl +
          -0.1122 * cage * smoker +
          -0.0167 * cage * csbp +
          -0.1272 * cage +
          -0.02 * cage * ctchol +
          0.0186 * cage * chdl +
          -0.118 * cagediab +
          0.1173 * chba1c +
          -0.064 * clnegfr +
          0.0062 * clnegfr * clnegfr +
          -0.0196 * chba1c * cage +
          0.0169 * clnegfr * cage;

      const s0 = isMale ? 0.9605 : 0.9776;
      const uncal = 1 - Math.pow(s0, Math.exp(lp));
      return recalibrateScore2(uncal, scale1, scale2);
    }

    case "ascvd_pce": {
      const {
        sex_race,
        age,
        total_chol,
        hdl_chol,
        sbp,
        bp_treated,
        smoker,
        diabetes,
      } = values;
      if (
        !isFiniteNum(sex_race) ||
        !isFiniteNum(age) ||
        !isFiniteNum(total_chol) ||
        !isFiniteNum(hdl_chol) ||
        !isFiniteNum(sbp) ||
        !isFiniteNum(bp_treated) ||
        !isFiniteNum(smoker) ||
        !isFiniteNum(diabetes) ||
        age <= 0 ||
        total_chol <= 0 ||
        hdl_chol <= 0 ||
        sbp <= 0
      ) {
        return null;
      }

      const lnAge = Math.log(age);
      const lnTc = Math.log(total_chol);
      const lnHdl = Math.log(hdl_chol);
      const lnSbp = Math.log(sbp);
      const treated = bp_treated === 1;

      const group = Math.round(sex_race);
      let indX: number;
      let meanX: number;
      let s10: number;

      if (group === 0) {
        // White / Other Female
        indX =
          -29.799 * lnAge +
          4.884 * lnAge * lnAge +
          13.54 * lnTc +
          -3.114 * lnAge * lnTc +
          -13.578 * lnHdl +
          3.149 * lnAge * lnHdl +
          (treated ? 2.019 * lnSbp : 1.957 * lnSbp) +
          7.574 * smoker +
          -1.665 * lnAge * smoker +
          0.661 * diabetes;
        meanX = -29.18;
        s10 = 0.9665;
      } else if (group === 1) {
        // African American Female
        indX =
          17.114 * lnAge +
          0.94 * lnTc +
          -18.92 * lnHdl +
          4.475 * lnAge * lnHdl +
          (treated
            ? 29.291 * lnSbp + -6.432 * lnAge * lnSbp
            : 27.607 * lnSbp + -6.087 * lnAge * lnSbp) +
          0.691 * smoker +
          0.874 * diabetes;
        meanX = 86.61;
        s10 = 0.9533;
      } else if (group === 2) {
        // White / Other Male
        indX =
          12.344 * lnAge +
          11.853 * lnTc +
          -2.664 * lnAge * lnTc +
          -7.99 * lnHdl +
          1.769 * lnAge * lnHdl +
          (treated ? 1.797 * lnSbp : 1.764 * lnSbp) +
          7.837 * smoker +
          -1.795 * lnAge * smoker +
          0.658 * diabetes;
        meanX = 61.18;
        s10 = 0.9144;
      } else if (group === 3) {
        // African American Male
        indX =
          2.469 * lnAge +
          0.302 * lnTc +
          -0.307 * lnHdl +
          (treated ? 1.916 * lnSbp : 1.809 * lnSbp) +
          0.549 * smoker +
          0.645 * diabetes;
        meanX = 19.54;
        s10 = 0.8954;
      } else {
        return null;
      }

      const risk = 1 - Math.pow(s10, Math.exp(indX - meanX));
      return Number.isFinite(risk) ? risk * 100 : null;
    }

    case "smart2": {
      const {
        region,
        age,
        sex,
        smoker,
        diabetes,
        sbp,
        total_chol,
        hdl_chol,
        egfr,
        hscrp,
        years_since_diagnosis,
        cad,
        cerebrovascular,
        pad,
        aaa,
        antithrombotic,
      } = values;
      if (
        !isFiniteNum(region) ||
        !isFiniteNum(age) ||
        !isFiniteNum(sex) ||
        !isFiniteNum(smoker) ||
        !isFiniteNum(diabetes) ||
        !isFiniteNum(sbp) ||
        !isFiniteNum(total_chol) ||
        !isFiniteNum(hdl_chol) ||
        !isFiniteNum(egfr) ||
        !isFiniteNum(hscrp) ||
        !isFiniteNum(years_since_diagnosis) ||
        !isFiniteNum(cad) ||
        !isFiniteNum(cerebrovascular) ||
        !isFiniteNum(pad) ||
        !isFiniteNum(aaa) ||
        !isFiniteNum(antithrombotic) ||
        egfr <= 0 ||
        hscrp <= 0
      ) {
        return null;
      }
      if (cad + cerebrovascular + pad + aaa < 1) return null;
      const nonHdl = total_chol - hdl_chol;
      if (!(nonHdl > 0)) return null;

      const eoRatios = [
        0.8159, // 0: Europe Low
        0.6973285, // 1: Europe Moderate
        0.5085825, // 2: Europe High
        0.2285371, // 3: Europe Very high
        0.4043255, // 4: Asia
        0.4714961, // 5: North America
        0.507567, // 6: Latin America
        1.0040808, // 7: Australia
        0.8825678, // 8: Japan
      ];
      const eo = eoRatios[Math.round(region)];
      if (!eo) return null;

      const lp =
        -0.03496022 * age +
        0.000551072 * age * age +
        0.287658743 * (sex === 1 ? 1 : 0) +
        0.345583271 * smoker +
        0.318170659 * diabetes +
        (0.018913154 * sbp) / 10 +
        0.540364249 * Math.log(nonHdl) +
        -0.03967521 * egfr +
        0.000218613 * egfr * egfr +
        0.151760173 * Math.log(hscrp) +
        0.047699585 * years_since_diagnosis +
        -0.00164973 * years_since_diagnosis * years_since_diagnosis +
        0.294701954 * cad +
        0.34831786 * cerebrovascular +
        0.22446658 * pad +
        0.330356631 * aaa +
        -0.21072103 * antithrombotic;

      const lpMean = -0.0463729 - 0.21072103;
      const baseline10y = 0.165822797;
      const risk =
        1 - Math.pow(1 - baseline10y, Math.exp(lp - lpMean - Math.log(eo)));
      return Number.isFinite(risk) ? risk * 100 : null;
    }

    case "prevent_10y_cvd": {
      const {
        sex,
        age,
        total_chol,
        hdl_chol,
        sbp,
        egfr,
        diabetes,
        smoker,
        bp_treated,
        statin,
      } = values;
      if (
        !isFiniteNum(sex) ||
        !isFiniteNum(age) ||
        !isFiniteNum(total_chol) ||
        !isFiniteNum(hdl_chol) ||
        !isFiniteNum(sbp) ||
        !isFiniteNum(egfr) ||
        !isFiniteNum(diabetes) ||
        !isFiniteNum(smoker) ||
        !isFiniteNum(bp_treated) ||
        !isFiniteNum(statin)
      ) {
        return null;
      }

      const ageT = (age - 55) / 10;
      const nonHdl = total_chol - hdl_chol - 3.5;
      const hdlT = (hdl_chol - 1.3) / 0.3;
      const sbpLt110 = (Math.min(sbp, 110) - 110) / 20;
      const sbpGte110 = (Math.max(sbp, 110) - 130) / 20;
      const egfrLt60 = (Math.min(egfr, 60) - 60) / -15;
      const egfrGte60 = (Math.max(egfr, 60) - 90) / -15;

      const isMale = sex === 1;
      const logOdds = isMale
        ? -3.031168 +
          0.7688528 * ageT +
          0.0736174 * nonHdl +
          -0.0954431 * hdlT +
          -0.4347345 * sbpLt110 +
          0.3362658 * sbpGte110 +
          0.7692857 * diabetes +
          0.4386871 * smoker +
          0.5378979 * egfrLt60 +
          0.0164827 * egfrGte60 +
          0.288879 * bp_treated +
          -0.1337349 * statin +
          -0.0475924 * bp_treated * sbpGte110 +
          0.150273 * statin * nonHdl +
          -0.0517874 * ageT * nonHdl +
          0.0191169 * ageT * hdlT +
          -0.1049477 * ageT * sbpGte110 +
          -0.2251948 * ageT * diabetes +
          -0.0895067 * ageT * smoker +
          -0.1543702 * ageT * egfrLt60
        : -3.307728 +
          0.7939329 * ageT +
          0.0305239 * nonHdl +
          -0.1606857 * hdlT +
          -0.2394003 * sbpLt110 +
          0.3600781 * sbpGte110 +
          0.8667604 * diabetes +
          0.5360739 * smoker +
          0.6045917 * egfrLt60 +
          0.0433769 * egfrGte60 +
          0.3151672 * bp_treated +
          -0.1477655 * statin +
          -0.0663612 * bp_treated * sbpGte110 +
          0.1197879 * statin * nonHdl +
          -0.0819715 * ageT * nonHdl +
          0.0306769 * ageT * hdlT +
          -0.0946348 * ageT * sbpGte110 +
          -0.27057 * ageT * diabetes +
          -0.078715 * ageT * smoker +
          -0.1637806 * ageT * egfrLt60;

      const risk = 1 / (1 + Math.exp(-logOdds));
      return Number.isFinite(risk) ? risk * 100 : null;
    }

    case "grace_2_1y_death": {
      const {
        age,
        heart_rate,
        sbp,
        creatinine,
        killip,
        cardiac_arrest,
        positive_enzymes,
        st_deviation,
      } = values;
      if (
        !isFiniteNum(age) ||
        !isFiniteNum(heart_rate) ||
        !isFiniteNum(sbp) ||
        !isFiniteNum(creatinine) ||
        !isFiniteNum(killip) ||
        !isFiniteNum(cardiac_arrest) ||
        !isFiniteNum(positive_enzymes) ||
        !isFiniteNum(st_deviation)
      ) {
        return null;
      }

      const a10 = age / 10;
      const s20 = sbp / -20;
      const p30 = heart_rate / 30;
      const cr = creatinine;

      const ageNl = grRcs(a10, 4.8165, 6.6571, 8.3095);
      const sbpNl = grRcs(s20, -9.02, -6.97, -5.32);
      const pulseNl1 = grRcs(p30, 1.71, 2.77, 3.95);
      const pulseNl2 = grRcs(p30, 2.31, 2.77, 3.95);
      const creatNl1 = grRcs(cr, 0.685, 1.145, 2.065);
      const creatNl2 = grRcs(cr, 0.925, 1.145, 2.065);

      const kRound = Math.round(killip);
      const lp =
        0.41157 * a10 +
        0.0129 * ageNl +
        0.08222 * s20 +
        0.0102 * sbpNl +
        0.13138 * p30 +
        0.40176 * pulseNl1 +
        -1.37249 * pulseNl2 +
        -0.51259 * cr +
        7.52634 * creatNl1 +
        -18.23023 * creatNl2 +
        (kRound === 2 ? 0.63827 : 0) +
        (kRound === 3 ? 0.85325 : 0) +
        (kRound === 4 ? 1.29372 : 0) +
        0.87185 * cardiac_arrest +
        0.3766 * positive_enzymes +
        0.44303 * st_deviation;

      const s0Death1y = 0.9983577131;
      const risk = 1 - Math.pow(s0Death1y, Math.exp(lp));
      return Number.isFinite(risk) ? risk * 100 : null;
    }

    case "rf_cl": {
      const {
        sex,
        age_group,
        symptom_score,
        rf_family_hx,
        rf_smoking,
        rf_dyslipidemia,
        rf_hypertension,
        rf_diabetes,
      } = values;
      if (
        !isFiniteNum(sex) ||
        !isFiniteNum(age_group) ||
        !isFiniteNum(symptom_score) ||
        !isFiniteNum(rf_family_hx) ||
        !isFiniteNum(rf_smoking) ||
        !isFiniteNum(rf_dyslipidemia) ||
        !isFiniteNum(rf_hypertension) ||
        !isFiniteNum(rf_diabetes)
      ) {
        return null;
      }

      const rfCount =
        rf_family_hx +
        rf_smoking +
        rf_dyslipidemia +
        rf_hypertension +
        rf_diabetes;
      const rfTier = rfCount <= 1 ? 0 : rfCount <= 3 ? 1 : 2;
      const sx = sex === 1 ? 1 : 0;
      const sym = Math.round(symptom_score);
      const ag = Math.round(age_group);
      const val = RF_CL_MATRIX[sx]?.[sym]?.[ag]?.[rfTier];
      return typeof val === "number" ? val : null;
    }

    default:
      return null;
  }
}
