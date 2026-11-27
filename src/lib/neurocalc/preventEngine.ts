import type {
  ComputedOutputMetric,
  DetailedFormulaResult,
} from "../../types/neurocalc.ts";
import {
  PREVENT_COEFFICIENTS,
  type PreventHorizon,
  type PreventModelType,
  type PreventOutcome,
  type PreventSex,
} from "./preventCoefficients.ts";

function isFiniteNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function hasValue(
  values: Record<string, number>,
  key: string,
  presentKeys?: ReadonlySet<string>
): boolean {
  if (presentKeys && !presentKeys.has(key)) return false;
  return isFiniteNum(values[key]);
}

function dotProduct(coeffs: readonly number[], vec: readonly number[]): number {
  let sum = 0;
  for (let i = 0; i < coeffs.length; i++) {
    sum += coeffs[i] * vec[i];
  }
  return sum;
}

function buildPredictors(params: {
  age: number;
  totalChol: number;
  hdlChol: number;
  sbp: number;
  diabetes: number;
  smoker: number;
  bmi: number;
  egfr: number;
  bpTreated: number;
  statin: number;
  model: PreventModelType;
  horizon: PreventHorizon;
  uacr?: number;
  hba1c?: number;
  sdi?: number;
}): number[] {
  const {
    age,
    totalChol,
    hdlChol,
    sbp,
    diabetes,
    smoker,
    bmi,
    egfr,
    bpTreated,
    statin,
    model,
    horizon,
    uacr,
    hba1c,
    sdi,
  } = params;

  const ageT = (age - 55) / 10;
  const nonHdl = totalChol - hdlChol - 3.5;
  const hdlT = (hdlChol - 1.3) / 0.3;
  const sbpLt110 = (Math.min(sbp, 110) - 110) / 20;
  const sbpGte110 = (Math.max(sbp, 110) - 130) / 20;
  const bmiLt30 = (Math.min(bmi, 30) - 25) / 5;
  const bmiGte30 = (Math.max(bmi, 30) - 30) / 5;
  const egfrLt60 = (Math.min(egfr, 60) - 60) / -15;
  const egfrGte60 = (Math.max(egfr, 60) - 90) / -15;

  const vec: number[] = [ageT];
  if (horizon === "30yr") {
    vec.push(ageT * ageT);
  }

  vec.push(
    nonHdl,
    hdlT,
    sbpLt110,
    sbpGte110,
    diabetes,
    smoker,
    bmiLt30,
    bmiGte30,
    egfrLt60,
    egfrGte60,
    bpTreated,
    statin,
    bpTreated * sbpGte110,
    statin * nonHdl,
    ageT * nonHdl,
    ageT * hdlT,
    ageT * sbpGte110,
    ageT * diabetes,
    ageT * smoker,
    ageT * bmiGte30,
    ageT * egfrLt60
  );

  if (model === "sdi" || model === "full") {
    const sdiVal = sdi;
    const sdi4to6 = sdiVal !== undefined && sdiVal >= 4 && sdiVal <= 6 ? 1 : 0;
    const sdi7to10 = sdiVal !== undefined && sdiVal >= 7 && sdiVal <= 10 ? 1 : 0;
    const missingSdi = sdiVal === undefined ? 1 : 0;
    vec.push(sdi4to6, sdi7to10, missingSdi);
  }

  if (model === "uacr" || model === "full") {
    const hasUacr = uacr !== undefined && uacr > 0;
    const lnUacr = hasUacr ? Math.log(uacr) : 0;
    const missingUacr = hasUacr ? 0 : 1;
    vec.push(lnUacr, missingUacr);
  }

  if (model === "hba1c" || model === "full") {
    const hasHba1c = hba1c !== undefined;
    const hba1cNoDm = hasHba1c && diabetes === 0 ? hba1c - 5.3 : 0;
    const hba1cDm = hasHba1c && diabetes === 1 ? hba1c - 5.3 : 0;
    const missingHba1c = hasHba1c ? 0 : 1;
    vec.push(hba1cNoDm, hba1cDm, missingHba1c);
  }

  vec.push(1);
  return vec;
}

function selectModel(
  hasUacr: boolean,
  hasHba1c: boolean,
  hasSdi: boolean
): { model: PreventModelType; label: string } {
  const optionalCount = (hasUacr ? 1 : 0) + (hasHba1c ? 1 : 0) + (hasSdi ? 1 : 0);
  if (optionalCount === 0) {
    return { model: "base", label: "Base Model" };
  }
  if (optionalCount === 1) {
    if (hasUacr) return { model: "uacr", label: "Base + uACR" };
    if (hasHba1c) return { model: "hba1c", label: "Base + HbA1c" };
    return { model: "sdi", label: "Base + SDI" };
  }
  const parts: string[] = [];
  if (hasUacr) parts.push("uACR");
  if (hasHba1c) parts.push("HbA1c");
  if (hasSdi) parts.push("SDI");
  return {
    model: "full",
    label: `Full Model (${parts.join(" + ")})`,
  };
}

function evalOutcomePct(
  horizon: PreventHorizon,
  model: PreventModelType,
  outcome: PreventOutcome,
  sexKey: PreventSex,
  predictors: readonly number[]
): number | null {
  const coeffs = PREVENT_COEFFICIENTS[horizon][model][outcome][sexKey];
  if (!coeffs || coeffs.length !== predictors.length) return null;
  const logOdds = dotProduct(coeffs, predictors);
  const risk = 1 / (1 + Math.exp(-logOdds));
  return Number.isFinite(risk) ? risk * 100 : null;
}

const OUTCOME_SPECS: Array<{
  outcome: PreventOutcome;
  label: string;
  highlight?: boolean;
}> = [
  { outcome: "ascvd", label: "ASCVD", highlight: true },
  { outcome: "hf", label: "Heart Failure" },
  { outcome: "chd", label: "Coronary Heart Disease" },
  { outcome: "stroke", label: "Stroke" },
  { outcome: "cvd", label: "Total CVD", highlight: true },
];

/**
 * Evaluates the full AHA PREVENT 2024 risk suite (10-Year & 30-Year horizons across
 * ASCVD, Heart Failure, CHD, Stroke, and Total CVD) with automatic model selection
 * for optional uACR, HbA1c, and SDI predictors.
 */
export function evaluatePreventSuite(
  values: Record<string, number>,
  presentKeys?: ReadonlySet<string>
): DetailedFormulaResult {
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
    return { primaryScore: null };
  }

  const hasBmi = hasValue(values, "bmi", presentKeys);
  const bmi = hasBmi ? values.bmi : 25; // Dummy value for non-HF outcomes (BMI coeffs = 0)

  const hasUacr = hasValue(values, "uacr", presentKeys) && values.uacr > 0;
  const uacr = hasUacr ? values.uacr : undefined;

  const hasHba1c = hasValue(values, "hba1c", presentKeys);
  const hba1c = hasHba1c ? values.hba1c : undefined;

  const hasSdi = hasValue(values, "sdi", presentKeys);
  const sdi = hasSdi ? values.sdi : undefined;

  const { model, label: modelLabel } = selectModel(hasUacr, hasHba1c, hasSdi);
  const sexKey: PreventSex = sex === 1 ? "male" : "female";
  const is30yEligible = age >= 30 && age <= 59;

  const warnings: string[] = [];
  if (!hasBmi) {
    warnings.push(
      "BMI (18.5–39.9 kg/m²) is not entered: Heart Failure risk is omitted, while ASCVD, CHD, Stroke, and Total CVD are still computed."
    );
  }
  if (!is30yEligible) {
    warnings.push(
      "30-year risk equations are validated only for adults aged 30–59 years."
    );
  }

  const pred10 = buildPredictors({
    age,
    totalChol: total_chol,
    hdlChol: hdl_chol,
    sbp,
    diabetes,
    smoker,
    bmi,
    egfr,
    bpTreated: bp_treated,
    statin,
    model,
    horizon: "10yr",
    uacr,
    hba1c,
    sdi,
  });

  const pred30 = is30yEligible
    ? buildPredictors({
        age,
        totalChol: total_chol,
        hdlChol: hdl_chol,
        sbp,
        diabetes,
        smoker,
        bmi,
        egfr,
        bpTreated: bp_treated,
        statin,
        model,
        horizon: "30yr",
        uacr,
        hba1c,
        sdi,
      })
    : null;

  const outputs: ComputedOutputMetric[] = [];
  let ascvd10y: number | null = null;

  for (const spec of OUTCOME_SPECS) {
    const needsBmi = spec.outcome === "hf";
    const val10 =
      needsBmi && !hasBmi
        ? null
        : evalOutcomePct("10yr", model, spec.outcome, sexKey, pred10);

    if (spec.outcome === "ascvd") {
      ascvd10y = val10;
    }

    outputs.push({
      id: `${spec.outcome}_10y`,
      label: spec.label,
      group: "10-Year Risk",
      value: val10,
      formattedValue: val10 !== null ? `${val10.toFixed(2)}%` : "N/A",
      unit: "%",
      highlight: spec.highlight,
      note: needsBmi && !hasBmi ? "Requires BMI" : undefined,
    });
  }

  for (const spec of OUTCOME_SPECS) {
    const needsBmi = spec.outcome === "hf";
    const val30 =
      !pred30 || (needsBmi && !hasBmi)
        ? null
        : evalOutcomePct("30yr", model, spec.outcome, sexKey, pred30);

    outputs.push({
      id: `${spec.outcome}_30y`,
      label: spec.label,
      group: "30-Year Risk",
      value: val30,
      formattedValue: val30 !== null ? `${val30.toFixed(2)}%` : "N/A",
      unit: "%",
      highlight: spec.highlight,
      note: !pred30
        ? "Ages 30–59 only"
        : needsBmi && !hasBmi
          ? "Requires BMI"
          : undefined,
    });
  }

  return {
    primaryScore: ascvd10y,
    primaryMetricLabel: "10-Year ASCVD Risk",
    modelLabel,
    outputs,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
