import {
  SAMPLE_REFERENCE_RANGES,
  type BloodGasLang,
  type ClinicalSeverity,
  type SampleType,
  t,
} from "./bloodGasI18n.ts";

export interface BloodGasInputs {
  sampleType: SampleType;
  ph: number;
  pco2MmHg: number;
  hco3: number | null;
  tco2: number | null;
  po2MmHg: number | null;
  fio2Pct: number;
  sao2Pct: number | null;
  be: number | null;
  ageYears: number | null;
  tempC: number | null;
  hbGDl: number | null;
  cardiacOutputLMin: number | null;
  na: number | null;
  k: number | null;
  cl: number | null;
  albuminGDl: number | null;
  lactate: number | null;
  phosphateMgDl: number | null;
  glucoseMmol: number | null;
  ureaMmol: number | null;
  measuredOsm: number | null;
  uNa: number | null;
  uK: number | null;
  uCl: number | null;
  artefactAirBubble: boolean;
  artefactExcessHeparin: boolean;
  artefactDelayedOrHighWbc: boolean;
  artefactTourniquet: boolean;
}

export interface ParamStatusPill {
  tone: ClinicalSeverity;
  label: string;
}

export interface BloodGasParamStates {
  ph: ParamStatusPill | null;
  pco2: ParamStatusPill | null;
  po2: ParamStatusPill | null;
  hco3: ParamStatusPill | null;
  be: ParamStatusPill | null;
  sao2: ParamStatusPill | null;
  na: ParamStatusPill | null;
  k: ParamStatusPill | null;
  cl: ParamStatusPill | null;
  albumin: ParamStatusPill | null;
  lactate: ParamStatusPill | null;
}

export interface CompensationCheckItem {
  formulaName: string;
  expectedRangeText: string;
  actualText: string;
  timeframe: string;
  physioLimit: string;
  status: "appropriate" | "below" | "above";
  interpretation: string;
}

export interface DetectedDisorders {
  metAcidosisWagma: boolean;
  metAcidosisNagma: boolean;
  metAcidosisUnspecified: boolean;
  metAlkalosis: boolean;
  respAcidosis: "none" | "acute" | "chronic" | "acute_on_chronic";
  respAlkalosis: "none" | "acute" | "chronic";
}

export interface RedFlagItem {
  id: string;
  severity: "danger" | "warning";
  title: string;
  detail: string;
}

export interface EtiologyGroup {
  category: string;
  items: string[];
}

export interface BloodGasEvaluation {
  effectiveHco3: number;
  hco3EstimatedFromTco2: boolean;
  summary: {
    tone: ClinicalSeverity;
    primaryLabel: string;
    notes: string[];
    patternTag: string;
    disorderType:
      | "normal"
      | "simple"
      | "compensated"
      | "mixed_additive"
      | "mixed_counterbalancing"
      | "triple"
      | "invalid_sample";
    components: string[];
    gasExchangeLabel: string;
    respiratoryFailureType:
      | "none"
      | "type1"
      | "type2_acute"
      | "type2_chronic"
      | "type2_acute_on_chronic"
      | "vbg_na";
    track: "metabolic" | "respiratory" | "mixed" | "normal";
  };
  step1: {
    hPlusCalc: number;
    hPlusMeasured: number;
    predictedPh: number;
    kassirerBleichPh: number;
    phDiff: number;
    hPlusPctDiff: number;
    isConsistent: boolean;
    beCheck: {
      estimatedPh: number;
      deltaPhFromPco2: number;
      deltaPhFromBe: number;
      matchesMeasured: boolean;
    } | null;
    tempAdjustment: {
      tempC: number;
      direction: "fever" | "hypothermia";
      estTruePo2MmHg: number | null;
      estTruePco2MmHg: number;
      note: string;
    } | null;
    artefactNotes: string[];
    vbgAndLactateNotes: string[];
  };
  step2: {
    isVbg: boolean;
    expectedPo2MmHg: number;
    expectedPo2KpaHennessey: number;
    ruleOf140Sum: number | null;
    hypoxemiaSeverity: "normal" | "mild" | "moderate" | "severe" | "na";
    pfRatio: number | null;
    pfCategory: string | null;
    pao2AlveolarMmHg: number | null;
    aaGradientMmHg: number | null;
    aaNormalUpperLimitMmHg: number;
    aaElevated: boolean | null;
    aaInterpretation: string | null;
    aaFio2Caveat: boolean;
    cao2MlDl: number | null;
    do2MlMin: number | null;
    anemiaHypoxiaWarning: string | null;
    respiratoryFailureSummary: string;
    bullets: string[];
  };
  step3and4: {
    phStatus: "acidemia" | "alkalemia" | "normal";
    directionRule: "same" | "opposite" | "normal_both" | "one_normal";
    compensationChecks: CompensationCheckItem[];
    deltaHOverDeltaPco2: {
      ratio: number;
      classification: "acute" | "acute_on_chronic" | "chronic";
      note: string;
    } | null;
    detectedDisorders: DetectedDisorders;
    bullets: string[];
  };
  step5: {
    ag: number | null;
    agWithK: number | null;
    agAlbuminCorrected: number | null;
    effectiveAg: number | null;
    agHasanFull: number | null;
    agCategory:
      | "negative_low"
      | "normal"
      | "elevated"
      | "markedly_elevated"
      | "na";
    maskedWagmaByHypoalbuminemia: boolean;
    negativeAgCauses: string[];
    metAlkalosisMildAgNote: string | null;
    deltaRatio: number | null;
    deltaRatioInterpretation: string | null;
    bicarbonateGap: number | null;
    bicarbonateGapInterpretation: string | null;
    calcOsm: number | null;
    osmolalGap: number | null;
    osmolalGapElevated: boolean | null;
    osmolalGapInterpretation: string | null;
    uag: number | null;
    uagInterpretation: string | null;
    uCl: number | null;
    uClInterpretation: string | null;
    bullets: string[];
  };
  redFlags: RedFlagItem[];
  clinicalGuidance: {
    etiologyGroups: EtiologyGroup[];
    recommendedWorkup: string[];
  };
}

export function createDefaultBloodGasInputs(): BloodGasInputs {
  return {
    sampleType: "abg",
    ph: 7.4,
    pco2MmHg: 40,
    hco3: 24,
    tco2: null,
    po2MmHg: null,
    fio2Pct: 21,
    sao2Pct: null,
    be: null,
    ageYears: null,
    tempC: null,
    hbGDl: null,
    cardiacOutputLMin: null,
    na: null,
    k: null,
    cl: null,
    albuminGDl: null,
    lactate: null,
    phosphateMgDl: null,
    glucoseMmol: null,
    ureaMmol: null,
    measuredOsm: null,
    uNa: null,
    uK: null,
    uCl: null,
    artefactAirBubble: false,
    artefactExcessHeparin: false,
    artefactDelayedOrHighWbc: false,
    artefactTourniquet: false,
  };
}

export function resolveEffectiveHco3(inputs: BloodGasInputs): {
  effectiveHco3: number | null;
  estimatedFromTco2: boolean;
} {
  if (inputs.hco3 !== null && Number.isFinite(inputs.hco3)) {
    return { effectiveHco3: inputs.hco3, estimatedFromTco2: false };
  }
  if (inputs.tco2 !== null && Number.isFinite(inputs.tco2)) {
    return {
      effectiveHco3: Math.max(1, inputs.tco2 - 1),
      estimatedFromTco2: true,
    };
  }
  return { effectiveHco3: null, estimatedFromTco2: false };
}

export function kpaToMmHg(kpa: number): number {
  return kpa * 7.5;
}

export function mmHgToKpa(mmHg: number): number {
  return mmHg / 7.5;
}

export function getBloodGasParamStates(
  inputs: Partial<BloodGasInputs> & { sampleType: SampleType },
  lang: BloodGasLang
): BloodGasParamStates {
  const ref = SAMPLE_REFERENCE_RANGES[inputs.sampleType];

  const ph =
    typeof inputs.ph === "number"
      ? inputs.ph < 7.2 || inputs.ph > 7.6
        ? {
            tone: "danger" as const,
            label:
              inputs.ph < 7.2
                ? t(lang, "SEVERE ACIDEMIA", "TOAN MÁU NẶNG")
                : t(lang, "SEVERE ALKALEMIA", "KIỀM MÁU NẶNG"),
          }
        : inputs.ph < ref.ph[0]
          ? { tone: "warning" as const, label: t(lang, "ACIDEMIA", "TOAN MÁU") }
          : inputs.ph > ref.ph[1]
            ? { tone: "warning" as const, label: t(lang, "ALKALEMIA", "KIỀM MÁU") }
            : { tone: "ok" as const, label: t(lang, "NORMAL", "BÌNH THƯỜNG") }
      : null;

  const pco2 =
    typeof inputs.pco2MmHg === "number"
      ? inputs.pco2MmHg < ref.pco2MmHg[0]
        ? { tone: "warning" as const, label: t(lang, "LOW (HYPOCAPNIA)", "GIẢM PCO2") }
        : inputs.pco2MmHg > 60
          ? { tone: "danger" as const, label: t(lang, "SEVERE HYPERCAPNIA", "TĂNG CO2 NẶNG") }
          : inputs.pco2MmHg > ref.pco2MmHg[1]
            ? { tone: "warning" as const, label: t(lang, "HIGH (HYPERCAPNIA)", "TĂNG PCO2") }
            : { tone: "ok" as const, label: t(lang, "NORMAL", "BÌNH THƯỜNG") }
      : null;

  let po2: ParamStatusPill | null = null;
  if (typeof inputs.po2MmHg === "number") {
    if (inputs.sampleType !== "abg") {
      po2 = {
        tone: "info",
        label: t(lang, "VBG (NON-ARTERIAL)", "MẪU TĨNH MẠCH"),
      };
    } else if (inputs.po2MmHg < 40) {
      po2 = {
        tone: "danger",
        label: t(lang, "SEVERE HYPOXEMIA (<40)", "GIẢM O2 NẶNG (<40)"),
      };
    } else if (inputs.po2MmHg < 60) {
      po2 = {
        tone: "danger",
        label: t(lang, "MODERATE HYPOXEMIA (<60)", "GIẢM O2 TB (<60)"),
      };
    } else if (inputs.po2MmHg < 80) {
      po2 = {
        tone: "warning",
        label: t(lang, "MILD HYPOXEMIA (60–79)", "GIẢM O2 NHẸ (60–79)"),
      };
    } else {
      po2 = { tone: "ok", label: t(lang, "NORMAL (≥80)", "BÌNH THƯỜNG (≥80)") };
    }
  }

  const hco3Val =
    typeof inputs.hco3 === "number"
      ? inputs.hco3
      : typeof inputs.tco2 === "number"
        ? inputs.tco2 - 1
        : null;
  const hco3 =
    hco3Val !== null
      ? hco3Val < 15
        ? { tone: "danger" as const, label: t(lang, "SEVERE LOW (<15)", "GIẢM NẶNG (<15)") }
        : hco3Val < ref.hco3[0]
          ? { tone: "warning" as const, label: t(lang, "LOW", "GIẢM") }
          : hco3Val > 45
            ? { tone: "danger" as const, label: t(lang, "EXTREME HIGH (>45)", "TĂNG RẤT CAO (>45)") }
            : hco3Val > ref.hco3[1]
              ? { tone: "warning" as const, label: t(lang, "HIGH", "TĂNG") }
              : { tone: "ok" as const, label: t(lang, "NORMAL", "BÌNH THƯỜNG") }
      : null;

  const be =
    typeof inputs.be === "number"
      ? inputs.be < -2
        ? { tone: "warning" as const, label: t(lang, "BASE DEFICIT", "KIỀM THIẾU") }
        : inputs.be > 2
          ? { tone: "warning" as const, label: t(lang, "BASE EXCESS", "KIỀM DƯ") }
          : { tone: "ok" as const, label: t(lang, "NORMAL", "BÌNH THƯỜNG") }
      : null;

  const sao2 =
    typeof inputs.sao2Pct === "number"
      ? inputs.sampleType !== "abg"
        ? { tone: "info" as const, label: t(lang, "VENOUS SO2", "SO2 TĨNH MẠCH") }
        : inputs.sao2Pct < 75
          ? { tone: "danger" as const, label: t(lang, "CRITICAL (<75%)", "NGUY KỊCH (<75%)") }
          : inputs.sao2Pct < 90
            ? { tone: "danger" as const, label: t(lang, "HYPOXEMIA (<90%)", "GIẢM O2 (<90%)") }
            : inputs.sao2Pct < 95
              ? { tone: "warning" as const, label: t(lang, "BORDERLINE (90–94%)", "GIẢM NHẸ (90–94%)") }
              : { tone: "ok" as const, label: t(lang, "NORMAL (≥95%)", "BÌNH THƯỜNG (≥95%)") }
      : null;

  const na =
    typeof inputs.na === "number"
      ? inputs.na < 125 || inputs.na > 155
        ? { tone: "danger" as const, label: t(lang, "CRITICAL", "NGUY KỊCH") }
        : inputs.na < 135
          ? { tone: "warning" as const, label: t(lang, "HYPONATREMIA", "HẠ NATRI") }
          : inputs.na > 145
            ? { tone: "warning" as const, label: t(lang, "HYPERNATREMIA", "TĂNG NATRI") }
            : { tone: "ok" as const, label: t(lang, "NORMAL", "BÌNH THƯỜNG") }
      : null;

  const k =
    typeof inputs.k === "number"
      ? inputs.k < 3.0 || inputs.k >= 6.0
        ? { tone: "danger" as const, label: t(lang, "CRITICAL", "NGUY KỊCH") }
        : inputs.k < 3.5
          ? { tone: "warning" as const, label: t(lang, "HYPOKALEMIA", "HẠ KALI") }
          : inputs.k > 5.0
            ? { tone: "warning" as const, label: t(lang, "HYPERKALEMIA", "TĂNG KALI") }
            : { tone: "ok" as const, label: t(lang, "NORMAL", "BÌNH THƯỜNG") }
      : null;

  const cl =
    typeof inputs.cl === "number"
      ? inputs.cl < 96
        ? { tone: "warning" as const, label: t(lang, "HYPOCHLOREMIA", "HẠ CLO") }
        : inputs.cl > 108
          ? { tone: "warning" as const, label: t(lang, "HYPERCHLOREMIA", "TĂNG CLO") }
          : { tone: "ok" as const, label: t(lang, "NORMAL", "BÌNH THƯỜNG") }
      : null;

  const albumin =
    typeof inputs.albuminGDl === "number"
      ? inputs.albuminGDl < 2.5
        ? { tone: "danger" as const, label: t(lang, "SEVERE HYPOALB (<2.5)", "HẠ NẶNG (<2.5)") }
        : inputs.albuminGDl < 3.5
          ? { tone: "warning" as const, label: t(lang, "HYPOALBUMINEMIA", "HẠ ALBUMIN") }
          : { tone: "ok" as const, label: t(lang, "NORMAL", "BÌNH THƯỜNG") }
      : null;

  const lactate =
    typeof inputs.lactate === "number"
      ? inputs.lactate >= 5.0
        ? { tone: "danger" as const, label: t(lang, "LACTIC ACIDOSIS (≥5)", "TOAN LACTIC (≥5)") }
        : inputs.lactate > 2.0
          ? { tone: "warning" as const, label: t(lang, "ELEVATED (>2.0)", "TĂNG (>2.0)") }
          : { tone: "ok" as const, label: t(lang, "NORMAL (≤2.0)", "BÌNH THƯỜNG (≤2.0)") }
      : null;

  return { ph, pco2, po2, hco3, be, sao2, na, k, cl, albumin, lactate };
}

function evaluateStep1(
  inputs: BloodGasInputs,
  effectiveHco3: number,
  estimatedFromTco2: boolean,
  lang: BloodGasLang
): BloodGasEvaluation["step1"] {
  const hPlusCalc = (24 * inputs.pco2MmHg) / Math.max(0.5, effectiveHco3);
  const hPlusMeasured = Math.pow(10, 9 - inputs.ph);
  const predictedPh = 9 - Math.log10(Math.max(1e-6, hPlusCalc));
  const kassirerBleichPh = 7.4 + (40 - hPlusCalc) * 0.01;
  const phDiff = Math.abs(inputs.ph - predictedPh);
  const hPlusPctDiff =
    (Math.abs(hPlusCalc - hPlusMeasured) / Math.max(1, hPlusMeasured)) * 100;
  const isConsistent = hPlusPctDiff <= 10 && phDiff <= 0.03;

  let beCheck: BloodGasEvaluation["step1"]["beCheck"] = null;
  if (inputs.be !== null && Number.isFinite(inputs.be)) {
    const deltaPhFromPco2 = -((inputs.pco2MmHg - 40) / 12) * 0.1;
    const deltaPhFromBe = (inputs.be / 6) * 0.1;
    const estimatedPh = 7.4 + deltaPhFromPco2 + deltaPhFromBe;
    const matchesMeasured = Math.abs(estimatedPh - inputs.ph) <= 0.04;
    beCheck = {
      estimatedPh,
      deltaPhFromPco2,
      deltaPhFromBe,
      matchesMeasured,
    };
  }

  let tempAdjustment: BloodGasEvaluation["step1"]["tempAdjustment"] = null;
  if (inputs.tempC !== null && Number.isFinite(inputs.tempC)) {
    if (inputs.tempC >= 37.8) {
      const dT = inputs.tempC - 37.0;
      const estTruePco2 = inputs.pco2MmHg * (1 + 0.044 * dT);
      const estTruePo2 =
        inputs.po2MmHg !== null ? inputs.po2MmHg * (1 + 0.072 * dT) : null;
      tempAdjustment = {
        tempC: inputs.tempC,
        direction: "fever",
        estTruePo2MmHg: estTruePo2,
        estTruePco2MmHg: estTruePco2,
        note: t(
          lang,
          `Fever (${inputs.tempC.toFixed(1)}°C vs 37°C analyzer): True PaO2 is ~${estTruePo2 !== null ? estTruePo2.toFixed(0) + " mmHg" : "+7.2%/°C higher"} and true PaCO2 is ~${estTruePco2.toFixed(1)} mmHg (+4.4%/°C) — 37°C machine reading over-estimates hypoxemia and under-estimates hypercapnic acidosis.`,
          `Sốt (${inputs.tempC.toFixed(1)}°C so với máy đo 37°C): PaO2 thực tế cao hơn ~${estTruePo2 !== null ? estTruePo2.toFixed(0) + " mmHg" : "+7.2%/°C"} và PaCO2 thực tế ~${estTruePco2.toFixed(1)} mmHg (+4.4%/°C) — máy đo ở 37°C sẽ đánh giá quá mức tình trạng giảm oxy và đánh giá thấp mức độ toan CO2.`
        ),
      };
    } else if (inputs.tempC <= 35.9) {
      const dT = 37.0 - inputs.tempC;
      const estTruePco2 = Math.max(5, inputs.pco2MmHg - 2 * dT);
      const estTruePo2 =
        inputs.po2MmHg !== null
          ? Math.max(5, inputs.po2MmHg - 5 * dT)
          : null;
      tempAdjustment = {
        tempC: inputs.tempC,
        direction: "hypothermia",
        estTruePo2MmHg: estTruePo2,
        estTruePco2MmHg: estTruePco2,
        note: t(
          lang,
          `Hypothermia (${inputs.tempC.toFixed(1)}°C vs 37°C analyzer): True PaO2 is ~${estTruePo2 !== null ? estTruePo2.toFixed(0) + " mmHg" : "5 mmHg/°C lower"} — 37°C machine reading may under-estimate/miss true hypoxemia.`,
          `Hạ thân nhiệt (${inputs.tempC.toFixed(1)}°C so với máy đo 37°C): PaO2 thực tế thấp hơn (~${estTruePo2 !== null ? estTruePo2.toFixed(0) + " mmHg" : "giảm ~5 mmHg/°C"}) — máy đo ở 37°C có thể bỏ sót giảm oxy máu.`
        ),
      };
    }
  }

  const artefactNotes: string[] = [];
  if (estimatedFromTco2) {
    artefactNotes.push(
      t(
        lang,
        `HCO3- was estimated from serum tCO2 (${inputs.tco2!.toFixed(1)} - 1 = ${effectiveHco3.toFixed(1)} mEq/L). Note: venous tCO2 is typically 2–3 mEq/L higher than arterial HCO3-.`,
        `HCO3- được ước tính từ tCO2 huyết thanh (${inputs.tco2!.toFixed(1)} - 1 = ${effectiveHco3.toFixed(1)} mEq/L). Lưu ý: tCO2 tĩnh mạch thường cao hơn HCO3- động mạch 2–3 mEq/L.`
      )
    );
  }
  if (inputs.artefactAirBubble) {
    artefactNotes.push(
      t(
        lang,
        "Air bubble flagged: room air equilibration lowers PaCO2 toward 0, falsely elevates pH (pseudorespiratory alkalosis), and pulls PaO2 toward ~150 mmHg.",
        "Có bọt khí trong bơm tiêm: kéo PaCO2 giảm (về 0), tăng pH giả tạo (kiềm giả) và kéo PaO2 về ~150 mmHg."
      )
    );
  }
  if (inputs.artefactExcessHeparin) {
    artefactNotes.push(
      t(
        lang,
        "Excess liquid heparin flagged: dilutes sample, falsely lowering PaCO2 and HCO3- (can mimic metabolic acidosis).",
        "Dư Heparin lỏng: gây pha loãng mẫu, làm giảm giả tạo PaCO2 và HCO3- (dễ nhầm với toan chuyển hóa)."
      )
    );
  }
  if (inputs.artefactDelayedOrHighWbc) {
    artefactNotes.push(
      t(
        lang,
        "Delayed analysis (>15–30 min at room temp) or severe leukocytosis/thrombocytosis flagged: ongoing cellular metabolism consumes O2 and produces CO2 (pseudohypoxemia + false hypercapnia/acidosis).",
        "Để mẫu lâu ở nhiệt độ phòng (>15–30 phút) hoặc tăng bạch cầu/tiểu cầu rất cao: tế bào tiếp tục tiêu thụ O2 và sinh CO2 gây giảm PaO2 giả tạo (pseudohypoxemia) và tăng PaCO2/giảm pH."
      )
    );
  }
  if (inputs.artefactTourniquet) {
    artefactNotes.push(
      t(
        lang,
        "Prolonged tourniquet (>1 min) flagged: local ischemia elevates venous Lactate and lowers local HCO3-.",
        "Buộc garo lâu (>1 phút): thiếu máu cục bộ làm tăng Lactate tại chỗ và giảm HCO3-."
      )
    );
  }

  // Heuristic artefact checks
  if (
    inputs.sampleType === "abg" &&
    inputs.fio2Pct <= 21 &&
    inputs.po2MmHg !== null &&
    inputs.po2MmHg >= 135 &&
    inputs.po2MmHg <= 165 &&
    inputs.pco2MmHg < 32 &&
    inputs.ph > 7.45 &&
    !inputs.artefactAirBubble
  ) {
    artefactNotes.push(
      t(
        lang,
        "Heuristic alert: Room-air ABG with PaO2 near 150 mmHg + low PaCO2 + alkalemia — check syringe for air bubble contamination.",
        "Cảnh báo kỹ thuật: Khí máu khí trời có PaO2 ~150 mmHg kèm PaCO2 thấp và kiềm máu — kiểm tra xem mẫu có bị lọt bọt khí không."
      )
    );
  }
  if (
    inputs.sampleType === "abg" &&
    inputs.po2MmHg !== null &&
    inputs.po2MmHg < 50 &&
    inputs.sao2Pct !== null &&
    inputs.sao2Pct >= 60 &&
    inputs.sao2Pct <= 78
  ) {
    artefactNotes.push(
      t(
        lang,
        "Heuristic alert: Low PaO2 (<50 mmHg) with SO2 60–78% — verify sample was truly arterial and not an inadvertent venous puncture (unless patient has severe clinical hypoxemia).",
        "Cảnh báo kỹ thuật: PaO2 <50 mmHg kèm SO2 60–78% — kiểm tra lại xem có lấy nhầm máu tĩnh mạch hay không (trừ khi bệnh nhân suy hô hấp rất nặng trên lâm sàng)."
      )
    );
  }

  const vbgAndLactateNotes: string[] = [];
  if (inputs.sampleType !== "abg") {
    vbgAndLactateNotes.push(
      t(
        lang,
        "VBG sample: Valid for screening pH and HCO3- (VBG pH is typically ~0.03–0.04 lower than ABG), but CANNOT be used to assess arterial oxygenation (PaO2, P/F ratio, or A-aDO2).",
        "Mẫu VBG: Tương đồng tốt để tầm soát pH và HCO3- (pH tĩnh mạch thường thấp hơn ABG ~0.03–0.04), nhưng KHÔNG dùng để đánh giá oxy hóa máu động mạch (PaO2, P/F hay A-aDO2)."
      )
    );
  }
  if (inputs.lactate !== null || inputs.sampleType !== "abg") {
    vbgAndLactateNotes.push(
      t(
        lang,
        "Lactate sampling rule (Hasan §9.31): Venous lactate reflects local production (typically 50–100% higher than arterial, exaggerated by tourniquet); arterial lactate reflects systemic production minus hepatic clearance; mixed venous blood provides the truest global lactate estimate.",
        "Nguồn lấy mẫu Lactate (Hasan §9.31): Mẫu tĩnh mạch phản ánh sản xuất tại chỗ (thường cao hơn động mạch 50–100%, tăng thêm nếu garo lâu); mẫu động mạch phản ánh cả sản xuất và thanh lọc gan; máu tĩnh mạch pha trộn phản ánh chính xác nhất Lactate toàn thân."
      )
    );
  }

  return {
    hPlusCalc,
    hPlusMeasured,
    predictedPh,
    kassirerBleichPh,
    phDiff,
    hPlusPctDiff,
    isConsistent,
    beCheck,
    tempAdjustment,
    artefactNotes,
    vbgAndLactateNotes,
  };
}

function evaluateStep2(
  inputs: BloodGasInputs,
  lang: BloodGasLang
): {
  step2: BloodGasEvaluation["step2"];
  gasExchangeLabel: string;
  respiratoryFailureType: BloodGasEvaluation["summary"]["respiratoryFailureType"];
} {
  const isVbg = inputs.sampleType !== "abg";
  const fio2Frac = Math.max(0.21, Math.min(1.0, inputs.fio2Pct / 100));
  const expectedPo2MmHg = inputs.fio2Pct * 5;
  const expectedPo2KpaHennessey = Math.max(0, inputs.fio2Pct - 10);
  const ruleOf140Sum =
    !isVbg && inputs.fio2Pct <= 21 && inputs.po2MmHg !== null
      ? inputs.po2MmHg + inputs.pco2MmHg
      : null;

  const aaNormalUpperLimitMmHg =
    inputs.ageYears !== null ? inputs.ageYears / 4 + 4 : 15;
  const aaFio2Caveat = inputs.fio2Pct > 21 && inputs.fio2Pct < 100;

  let cao2MlDl: number | null = null;
  let do2MlMin: number | null = null;
  let anemiaHypoxiaWarning: string | null = null;
  if (inputs.hbGDl !== null && inputs.sao2Pct !== null) {
    const dissolved = inputs.po2MmHg !== null ? 0.003 * inputs.po2MmHg : 0;
    cao2MlDl = 1.34 * inputs.hbGDl * (inputs.sao2Pct / 100) + dissolved;
    if (inputs.cardiacOutputLMin !== null) {
      do2MlMin = cao2MlDl * inputs.cardiacOutputLMin * 10;
    }
    if (
      cao2MlDl < 14 &&
      (inputs.po2MmHg === null || inputs.po2MmHg >= 75)
    ) {
      anemiaHypoxiaWarning = t(
        lang,
        `Low arterial O2 content (CaO2 = ${cao2MlDl.toFixed(1)} mL/dL; normal 16–22) despite adequate PaO2 — severe anemia or dyshemoglobinemia (CO/MetHb) can cause tissue hypoxia and lactic acidosis.`,
        `Hàm lượng oxy máu giảm nặng (CaO2 = ${cao2MlDl.toFixed(1)} mL/dL; bình thường 16–22) dù PaO2 bình thường — thiếu máu nặng hoặc ngộ độc CO/MetHb vẫn gây thiếu oxy mô và toan lactic.`
      );
    }
  }

  if (isVbg) {
    const bullets: string[] = [
      t(
        lang,
        "Arterial oxygenation metrics (hypoxemia severity, P/F ratio, A-aDO2, Type 1/2 failure) are withheld because this is a venous sample.",
        "Không phân loại suy hô hấp hay tính P/F, A-aDO2 trên mẫu khí máu tĩnh mạch (VBG)."
      ),
    ];
    if (inputs.po2MmHg !== null) {
      bullets.push(
        t(
          lang,
          `Venous PO2 = ${inputs.po2MmHg.toFixed(1)} mmHg (${mmHgToKpa(inputs.po2MmHg).toFixed(1)} kPa).`,
          `PO2 tĩnh mạch = ${inputs.po2MmHg.toFixed(1)} mmHg (${mmHgToKpa(inputs.po2MmHg).toFixed(1)} kPa).`
        )
      );
    }
    if (cao2MlDl !== null) {
      bullets.push(
        `CaO2 ≈ ${cao2MlDl.toFixed(1)} mL/dL${do2MlMin !== null ? ` · DO2 ≈ ${do2MlMin.toFixed(0)} mL/min` : ""}`
      );
    }
    return {
      step2: {
        isVbg: true,
        expectedPo2MmHg,
        expectedPo2KpaHennessey,
        ruleOf140Sum,
        hypoxemiaSeverity: "na",
        pfRatio: null,
        pfCategory: null,
        pao2AlveolarMmHg: null,
        aaGradientMmHg: null,
        aaNormalUpperLimitMmHg,
        aaElevated: null,
        aaInterpretation: null,
        aaFio2Caveat,
        cao2MlDl,
        do2MlMin,
        anemiaHypoxiaWarning,
        respiratoryFailureSummary: t(
          lang,
          "Venous sample — obtain ABG or SpO2 to evaluate oxygenation.",
          "Mẫu tĩnh mạch — cần ABG hoặc SpO2 để đánh giá oxy hóa máu."
        ),
        bullets,
      },
      gasExchangeLabel: t(lang, "VBG (O2 N/A)", "VBG (Không đánh giá O2)"),
      respiratoryFailureType: "vbg_na",
    };
  }

  const bullets: string[] = [];
  let hypoxemiaSeverity: BloodGasEvaluation["step2"]["hypoxemiaSeverity"] = "na";
  let pfRatio: number | null = null;
  let pfCategory: string | null = null;
  let pao2AlveolarMmHg: number | null = null;
  let aaGradientMmHg: number | null = null;
  let aaElevated: boolean | null = null;
  let aaInterpretation: string | null = null;

  if (inputs.po2MmHg !== null) {
    // Hypoxemia severity (Hennessey)
    if (inputs.po2MmHg < 40 || (inputs.sao2Pct !== null && inputs.sao2Pct < 75)) {
      hypoxemiaSeverity = "severe";
    } else if (inputs.po2MmHg < 60) {
      hypoxemiaSeverity = "moderate";
    } else if (inputs.po2MmHg < 80) {
      hypoxemiaSeverity = "mild";
    } else {
      hypoxemiaSeverity = "normal";
    }

    // P/F ratio
    pfRatio = inputs.po2MmHg / fio2Frac;
    if (pfRatio > 400) {
      pfCategory = t(lang, "Normal (>400)", "Bình thường (>400)");
    } else if (pfRatio > 300) {
      pfCategory = t(lang, "Mild hypoxemia (301–400)", "Giảm oxy hóa nhẹ (301–400)");
    } else if (pfRatio > 200) {
      pfCategory = t(lang, "Mild ARDS range (201–300)", "Ngưỡng ARDS nhẹ (201–300)");
    } else if (pfRatio > 100) {
      pfCategory = t(lang, "Moderate ARDS range (101–200)", "Ngưỡng ARDS trung bình (101–200)");
    } else {
      pfCategory = t(lang, "Severe ARDS range (≤100)", "Ngưỡng ARDS nặng (≤100)");
    }

    // A-a Gradient
    pao2AlveolarMmHg = fio2Frac * 713 - inputs.pco2MmHg / 0.8;
    aaGradientMmHg = pao2AlveolarMmHg - inputs.po2MmHg;
    aaElevated = aaGradientMmHg > aaNormalUpperLimitMmHg;

    if (aaElevated) {
      aaInterpretation =
        inputs.pco2MmHg > 45
          ? t(
              lang,
              `Elevated A-aDO2 (${aaGradientMmHg.toFixed(1)} vs limit <${aaNormalUpperLimitMmHg.toFixed(0)} mmHg): Hypoventilation combined with intrinsic lung pathology (V/Q mismatch, shunt, or diffusion defect).`,
              `A-aDO2 tăng (${aaGradientMmHg.toFixed(1)} so với ngưỡng <${aaNormalUpperLimitMmHg.toFixed(0)} mmHg): Giảm thông khí phối hợp tổn thương nhu mô phổi (bất tương xứng V/Q, shunt hoặc rối loạn khuếch tán).`
            )
          : t(
              lang,
              `Elevated A-aDO2 (${aaGradientMmHg.toFixed(1)} vs limit <${aaNormalUpperLimitMmHg.toFixed(0)} mmHg): Intrinsic pulmonary gas-exchange defect (V/Q mismatch, right-to-left shunt, or diffusion impairment).`,
              `A-aDO2 tăng (${aaGradientMmHg.toFixed(1)} so với ngưỡng <${aaNormalUpperLimitMmHg.toFixed(0)} mmHg): Tổn thương trao đổi khí tại phổi (bất tương xứng V/Q, shunt phải-trái hoặc rối loạn khuếch tán).`
            );
    } else {
      aaInterpretation =
        inputs.po2MmHg < 80
          ? t(
              lang,
              `Normal A-aDO2 (${aaGradientMmHg.toFixed(1)} ≤ ${aaNormalUpperLimitMmHg.toFixed(0)} mmHg): Pure alveolar hypoventilation (CNS depression / neuromuscular) or low PiO2 (altitude).`,
              `A-aDO2 bình thường (${aaGradientMmHg.toFixed(1)} ≤ ${aaNormalUpperLimitMmHg.toFixed(0)} mmHg): Giảm thông khí phế nang đơn thuần (ức chế TKTW / thần kinh cơ) hoặc giảm PiO2 (độ cao).`
            )
          : t(
              lang,
              `Normal A-aDO2 (${aaGradientMmHg.toFixed(1)} ≤ ${aaNormalUpperLimitMmHg.toFixed(0)} mmHg): Intact alveolar-capillary gas exchange.`,
              `A-aDO2 bình thường (${aaGradientMmHg.toFixed(1)} ≤ ${aaNormalUpperLimitMmHg.toFixed(0)} mmHg): Trao đổi khí qua màng phế nang - mao mạch bình thường.`
            );
    }

    bullets.push(
      t(
        lang,
        `PaO2 = ${inputs.po2MmHg.toFixed(1)} mmHg (${mmHgToKpa(inputs.po2MmHg).toFixed(1)} kPa) at FiO2 ${inputs.fio2Pct}% · Expected normal PaO2 ≈ ${expectedPo2MmHg.toFixed(0)} mmHg${inputs.fio2Pct > 21 ? ` (Hennessey on O2 ≈ ${expectedPo2KpaHennessey.toFixed(0)} kPa)` : ""}.`,
        `PaO2 = ${inputs.po2MmHg.toFixed(1)} mmHg (${mmHgToKpa(inputs.po2MmHg).toFixed(1)} kPa) ở FiO2 ${inputs.fio2Pct}% · PaO2 mong đợi bình thường ≈ ${expectedPo2MmHg.toFixed(0)} mmHg${inputs.fio2Pct > 21 ? ` (Hennessey khi thở O2 ≈ ${expectedPo2KpaHennessey.toFixed(0)} kPa)` : ""}.`
      )
    );
    if (ruleOf140Sum !== null) {
      bullets.push(
        t(
          lang,
          `Rule of 140 (room air): PaO2 + PaCO2 = ${ruleOf140Sum.toFixed(0)} mmHg (normal ~140 mmHg).`,
          `Quy tắc 140 (khí trời): PaO2 + PaCO2 = ${ruleOf140Sum.toFixed(0)} mmHg (bình thường ~140 mmHg).`
        )
      );
    }
    bullets.push(
      t(
        lang,
        `P/F Ratio = ${pfRatio.toFixed(0)} (${pfCategory}).`,
        `Chỉ số P/F = ${pfRatio.toFixed(0)} (${pfCategory}).`
      )
    );
    bullets.push(aaInterpretation + (aaFio2Caveat ? t(lang, " (Note: A-aDO2 is most accurate at FiO2 21% or 100%.)", " (Lưu ý: A-aDO2 chính xác nhất ở FiO2 21% hoặc 100%).") : ""));
  } else {
    bullets.push(
      t(
        lang,
        `PaO2 not entered — expected PaO2 at FiO2 ${inputs.fio2Pct}% on normal lungs ≈ ${expectedPo2MmHg.toFixed(0)} mmHg.`,
        `Chưa nhập PaO2 — PaO2 dự đoán ở FiO2 ${inputs.fio2Pct}% trên phổi bình thường ≈ ${expectedPo2MmHg.toFixed(0)} mmHg.`
      )
    );
  }

  if (cao2MlDl !== null) {
    bullets.push(
      `CaO2 = ${cao2MlDl.toFixed(1)} mL/dL (normal 16–22)${do2MlMin !== null ? ` · DO2 = ${do2MlMin.toFixed(0)} mL/min` : ""}`
    );
  }

  // Respiratory Failure Classification
  let respiratoryFailureType: BloodGasEvaluation["summary"]["respiratoryFailureType"] =
    "none";
  let gasExchangeLabel = t(lang, "No Respiratory Failure", "Không suy hô hấp");
  let respiratoryFailureSummary = t(
    lang,
    "No criteria for Type 1 or Type 2 respiratory failure.",
    "Không đủ tiêu chuẩn suy hô hấp Type 1 hoặc Type 2."
  );

  if (inputs.pco2MmHg > 45) {
    // Hypercapnic (Type 2)
    if (inputs.ph < 7.35) {
      // Check acute vs acute-on-chronic
      const hPlus = Math.pow(10, 9 - inputs.ph);
      const dH = hPlus - 40;
      const dCO2 = inputs.pco2MmHg - 40;
      const ratio = dCO2 !== 0 ? dH / dCO2 : 1;
      if (ratio >= 0.3 && ratio <= 0.7) {
        respiratoryFailureType = "type2_acute_on_chronic";
        gasExchangeLabel = t(
          lang,
          "Type 2 Resp Failure (Acute-on-Chronic)",
          "Suy hô hấp Type 2 (Cấp trên nền mạn)"
        );
      } else {
        respiratoryFailureType = "type2_acute";
        gasExchangeLabel = t(
          lang,
          "Type 2 Resp Failure (Acute)",
          "Suy hô hấp Type 2 (Cấp tính)"
        );
      }
    } else {
      respiratoryFailureType = "type2_chronic";
      gasExchangeLabel = t(
        lang,
        "Type 2 Resp Failure (Chronic Compensated)",
        "Suy hô hấp Type 2 (Mạn tính đã bù)"
      );
    }
    respiratoryFailureSummary =
      inputs.po2MmHg !== null && inputs.po2MmHg < 60
        ? t(
            lang,
            `${gasExchangeLabel} with hypoxemia (PaO2 ${inputs.po2MmHg.toFixed(1)} mmHg).`,
            `${gasExchangeLabel} kèm giảm oxy máu (PaO2 ${inputs.po2MmHg.toFixed(1)} mmHg).`
          )
        : t(
            lang,
            `${gasExchangeLabel} (PaCO2 ${inputs.pco2MmHg.toFixed(1)} mmHg > 45).`,
            `${gasExchangeLabel} (PaCO2 ${inputs.pco2MmHg.toFixed(1)} mmHg > 45).`
          );
  } else if (inputs.po2MmHg !== null && inputs.po2MmHg < 60) {
    respiratoryFailureType = "type1";
    gasExchangeLabel = t(
      lang,
      "Type 1 Hypoxemic Resp Failure",
      "Suy hô hấp Type 1 (Giảm oxy máu)"
    );
    respiratoryFailureSummary = t(
      lang,
      `Type 1 Hypoxemic Respiratory Failure (PaO2 ${inputs.po2MmHg.toFixed(1)} < 60 mmHg with normal/low PaCO2).`,
      `Suy hô hấp Type 1 giảm oxy máu (PaO2 ${inputs.po2MmHg.toFixed(1)} < 60 mmHg, PaCO2 bình thường hoặc thấp).`
    );
  } else if (hypoxemiaSeverity === "mild") {
    gasExchangeLabel = t(lang, "Mild Hypoxemia", "Giảm oxy máu nhẹ");
    respiratoryFailureSummary = t(
      lang,
      `Mild hypoxemia (PaO2 ${inputs.po2MmHg!.toFixed(1)} mmHg, 60–79 range).`,
      `Giảm oxy máu nhẹ (PaO2 ${inputs.po2MmHg!.toFixed(1)} mmHg, ngưỡng 60–79).`
    );
  } else if (inputs.po2MmHg === null) {
    gasExchangeLabel = t(lang, "PaO2 Pending", "Chưa có PaO2");
  }

  return {
    step2: {
      isVbg: false,
      expectedPo2MmHg,
      expectedPo2KpaHennessey,
      ruleOf140Sum,
      hypoxemiaSeverity,
      pfRatio,
      pfCategory,
      pao2AlveolarMmHg,
      aaGradientMmHg,
      aaNormalUpperLimitMmHg,
      aaElevated,
      aaInterpretation,
      aaFio2Caveat,
      cao2MlDl,
      do2MlMin,
      anemiaHypoxiaWarning,
      respiratoryFailureSummary,
      bullets,
    },
    gasExchangeLabel,
    respiratoryFailureType,
  };
}

function evaluateStep5Metabolic(
  inputs: BloodGasInputs,
  effectiveHco3: number,
  isMetAlkalosisHint: boolean,
  lang: BloodGasLang
): BloodGasEvaluation["step5"] {
  const bullets: string[] = [];

  let ag: number | null = null;
  let agWithK: number | null = null;
  let agAlbuminCorrected: number | null = null;
  let effectiveAg: number | null = null;
  let agHasanFull: number | null = null;
  let agCategory: BloodGasEvaluation["step5"]["agCategory"] = "na";
  let maskedWagmaByHypoalbuminemia = false;
  const negativeAgCauses: string[] = [];
  let metAlkalosisMildAgNote: string | null = null;

  if (inputs.na !== null && inputs.cl !== null) {
    ag = inputs.na - (inputs.cl + effectiveHco3);
    if (inputs.k !== null) {
      agWithK = inputs.na + inputs.k - (inputs.cl + effectiveHco3);
    }
    if (inputs.albuminGDl !== null) {
      agAlbuminCorrected = ag + 2.5 * (4.0 - inputs.albuminGDl);
      effectiveAg = agAlbuminCorrected;
      if (ag <= 12 && agAlbuminCorrected > 12) {
        maskedWagmaByHypoalbuminemia = true;
      }
    } else {
      effectiveAg = ag;
    }

    if (
      inputs.k !== null &&
      inputs.albuminGDl !== null &&
      inputs.phosphateMgDl !== null &&
      inputs.lactate !== null
    ) {
      agHasanFull =
        inputs.na +
        inputs.k -
        (inputs.cl + effectiveHco3) -
        (2 * inputs.albuminGDl + 0.5 * inputs.phosphateMgDl) -
        inputs.lactate;
    }

    if (effectiveAg < 3) {
      agCategory = "negative_low";
      negativeAgCauses.push(
        t(
          lang,
          "Underestimation of serum Na+ (pseudohyponatremia or severe hypernatremia / hyperviscosity).",
          "Đánh giá thấp Natri máu (hạ Natri giả tạo hoặc tăng Natri máu nặng / tăng độ nhớt huyết tương)."
        ),
        t(
          lang,
          "Overestimation of serum Cl- (severe hyperlipidemia interfering with colorimetric chloride assay).",
          "Đánh giá quá mức Clo máu (tăng lipid máu nặng gây nhiễu phương pháp đo màu)."
        ),
        t(
          lang,
          "High serum Bromide levels ('pseudohyperchloremia'): prolonged Pyridostigmine bromide therapy (myasthenia gravis) or bromide-containing sedatives.",
          "Nồng độ Bromide huyết thanh cao ('tăng Clo giả tạo'): điều trị kéo dài bằng Pyridostigmine bromide (bệnh nhược cơ) hoặc thuốc an thần chứa Bromide."
        )
      );
    } else if (effectiveAg <= 12) {
      agCategory = "normal";
    } else if (effectiveAg <= 17) {
      agCategory = "elevated";
    } else {
      agCategory = "markedly_elevated";
    }

    bullets.push(
      `AG = ${ag.toFixed(1)} mEq/L${agWithK !== null ? ` · AG(K+) = ${agWithK.toFixed(1)}` : ""}${agAlbuminCorrected !== null ? ` · AGc (Albumin ref 4.0) = ${agAlbuminCorrected.toFixed(1)} mEq/L` : ""}${agHasanFull !== null ? ` · AGc (Hasan full) = ${agHasanFull.toFixed(1)}` : ""}`
    );

    if (maskedWagmaByHypoalbuminemia) {
      bullets.push(
        t(
          lang,
          `Hypoalbuminemia (${inputs.albuminGDl!.toFixed(1)} g/dL) masked an elevated Anion Gap: uncorrected AG (${ag.toFixed(1)}) appears normal, but corrected AGc = ${agAlbuminCorrected!.toFixed(1)} mEq/L (>12).`,
          `Hạ Albumin máu (${inputs.albuminGDl!.toFixed(1)} g/dL) đã che lấp tình trạng tăng Anion Gap: AG chưa hiệu chỉnh (${ag.toFixed(1)}) bình thường nhưng AGc = ${agAlbuminCorrected!.toFixed(1)} mEq/L (>12).`
        )
      );
    }

    if (isMetAlkalosisHint && effectiveAg > 12 && effectiveAg <= 16) {
      metAlkalosisMildAgNote = t(
        lang,
        "Hasan §9.8: Metabolic alkalosis can cause a mild AG increase (13–16 mEq/L) via ECF contraction (higher albumin), increased negative charge on albumin at alkaline pH, and mild compensatory lactate rise.",
        "Hasan §9.8: Kiềm chuyển hóa có thể gây tăng nhẹ AG (13–16 mEq/L) do cô đặc dịch ngoại bào (tăng Albumin), tăng điện tích âm trên Albumin khi pH kiềm và tăng nhẹ sản xuất Lactate."
      );
      bullets.push(metAlkalosisMildAgNote);
    }
  }

  // Delta Ratio & Bicarbonate Gap (when effectiveAg > 12)
  let deltaRatio: number | null = null;
  let deltaRatioInterpretation: string | null = null;
  let bicarbonateGap: number | null = null;
  let bicarbonateGapInterpretation: string | null = null;

  if (effectiveAg !== null && effectiveAg > 12) {
    const deltaAg = effectiveAg - 12;
    const deltaHco3 = 24 - effectiveHco3;
    bicarbonateGap = deltaAg - deltaHco3;

    if (bicarbonateGap > 6) {
      bicarbonateGapInterpretation = t(
        lang,
        `Bicarbonate Gap = +${bicarbonateGap.toFixed(1)} mEq/L (> +6): Indicates concurrent Metabolic Alkalosis (or chronic respiratory acidosis baseline).`,
        `Bicarbonate Gap = +${bicarbonateGap.toFixed(1)} mEq/L (> +6): Gợi ý có Kiềm chuyển hóa đi kèm (hoặc nền toan hô hấp mạn).`
      );
    } else if (bicarbonateGap < -6) {
      bicarbonateGapInterpretation = t(
        lang,
        `Bicarbonate Gap = ${bicarbonateGap.toFixed(1)} mEq/L (< -6): Indicates concurrent Normal-AG (Hyperchloremic) Metabolic Acidosis.`,
        `Bicarbonate Gap = ${bicarbonateGap.toFixed(1)} mEq/L (< -6): Gợi ý có Toan chuyển hóa AG bình thường (tăng Clo máu) đi kèm.`
      );
    } else {
      bicarbonateGapInterpretation = t(
        lang,
        `Bicarbonate Gap = ${bicarbonateGap >= 0 ? "+" : ""}${bicarbonateGap.toFixed(1)} mEq/L (-6 to +6): Consistent with pure High-AG Metabolic Acidosis.`,
        `Bicarbonate Gap = ${bicarbonateGap >= 0 ? "+" : ""}${bicarbonateGap.toFixed(1)} mEq/L (trong khoảng -6 đến +6): Phù hợp với Toan chuyển hóa tăng AG đơn thuần.`
      );
    }
    bullets.push(bicarbonateGapInterpretation);

    if (deltaHco3 > 0.5) {
      deltaRatio = deltaAg / deltaHco3;
      if (deltaRatio < 0.4) {
        deltaRatioInterpretation = t(
          lang,
          `Delta Ratio = ${deltaRatio.toFixed(2)} (< 0.4): Hyperchloremic (Normal-AG) Metabolic Acidosis predominates.`,
          `Delta Ratio = ${deltaRatio.toFixed(2)} (< 0.4): Toan chuyển hóa AG bình thường (NAGMA) chiếm ưu thế.`
        );
      } else if (deltaRatio < 0.8) {
        deltaRatioInterpretation = t(
          lang,
          `Delta Ratio = ${deltaRatio.toFixed(2)} (0.4–0.8): Mixed High-AG + Normal-AG Metabolic Acidosis.`,
          `Delta Ratio = ${deltaRatio.toFixed(2)} (0.4–0.8): Toan chuyển hóa hỗn hợp (Toan tăng AG + Toan AG bình thường).`
        );
      } else if (deltaRatio <= 2.0) {
        deltaRatioInterpretation = t(
          lang,
          `Delta Ratio = ${deltaRatio.toFixed(2)} (0.8–2.0): Pure High-AG Metabolic Acidosis (DKA ~1.0–1.1; Lactic acidosis ~1.6).`,
          `Delta Ratio = ${deltaRatio.toFixed(2)} (0.8–2.0): Toan chuyển hóa tăng AG đơn thuần (DKA ~1.0–1.1; Toan Lactic ~1.6).`
        );
      } else {
        deltaRatioInterpretation = t(
          lang,
          `Delta Ratio = ${deltaRatio.toFixed(2)} (> 2.0): High-AG Metabolic Acidosis + concurrent Metabolic Alkalosis (or chronic hypercapnia).`,
          `Delta Ratio = ${deltaRatio.toFixed(2)} (> 2.0): Toan chuyển hóa tăng AG kết hợp Kiềm chuyển hóa (hoặc nền toan hô hấp mạn).`
        );
      }
      bullets.push(deltaRatioInterpretation);
    } else {
      deltaRatioInterpretation = t(
        lang,
        "Delta Ratio omitted because HCO3- ≥ 23.5 mEq/L (ΔHCO3- ≤ 0.5); use Bicarbonate Gap above.",
        "Không tính Delta Ratio vì HCO3- ≥ 23.5 mEq/L (ΔHCO3- ≤ 0.5); đánh giá theo Bicarbonate Gap ở trên."
      );
      bullets.push(deltaRatioInterpretation);
    }
  }

  // Osmolal Gap
  let calcOsm: number | null = null;
  let osmolalGap: number | null = null;
  let osmolalGapElevated: boolean | null = null;
  let osmolalGapInterpretation: string | null = null;
  if (inputs.na !== null && inputs.glucoseMmol !== null && inputs.ureaMmol !== null) {
    calcOsm = 2 * inputs.na + inputs.glucoseMmol + inputs.ureaMmol;
    if (inputs.measuredOsm !== null) {
      osmolalGap = inputs.measuredOsm - calcOsm;
      osmolalGapElevated = osmolalGap > 10;
      if (osmolalGap > 15) {
        osmolalGapInterpretation = t(
          lang,
          `Osmolal Gap = ${osmolalGap.toFixed(1)} mOsm/kg (> 15): Strongly suggests toxic alcohol ingestion (Methanol, Ethylene glycol, Diethylene/Propylene glycol, Isopropanol, Ethanol).`,
          `Osmolal Gap = ${osmolalGap.toFixed(1)} mOsm/kg (> 15): Gợi ý mạnh ngộ độc rượu độc (Methanol, Ethylene glycol, Diethylene/Propylene glycol, Isopropanol, Ethanol).`
        );
      } else if (osmolalGap > 10) {
        osmolalGapInterpretation = t(
          lang,
          `Osmolal Gap = ${osmolalGap.toFixed(1)} mOsm/kg (10–15): Mildly elevated — consider early toxic alcohol, ethanol, or mannitol.`,
          `Osmolal Gap = ${osmolalGap.toFixed(1)} mOsm/kg (10–15): Tăng nhẹ — cân nhắc ngộ độc rượu sớm, ethanol hoặc mannitol.`
        );
      } else {
        osmolalGapInterpretation = t(
          lang,
          `Osmolal Gap = ${osmolalGap.toFixed(1)} mOsm/kg (≤ 10): Normal.`,
          `Osmolal Gap = ${osmolalGap.toFixed(1)} mOsm/kg (≤ 10): Bình thường.`
        );
      }
      bullets.push(osmolalGapInterpretation);
    } else {
      bullets.push(
        t(
          lang,
          `Calculated Serum Osmolality = ${calcOsm.toFixed(1)} mOsm/kg (enter Measured Osmolality to compute Osmolal Gap).`,
          `Áp lực thẩm thấu máu tính toán = ${calcOsm.toFixed(1)} mOsm/kg (nhập ALTT đo được để tính Osmolal Gap).`
        )
      );
    }
  }

  // Urinary Electrolytes
  let uag: number | null = null;
  let uagInterpretation: string | null = null;
  if (inputs.uNa !== null && inputs.uK !== null && inputs.uCl !== null) {
    uag = inputs.uNa + inputs.uK - inputs.uCl;
    if (uag < 0) {
      uagInterpretation = t(
        lang,
        `Urinary Anion Gap (UAG) = ${uag.toFixed(1)} mEq/L (< 0): Appropriate renal NH4Cl excretion → Extrarenal HCO3- loss (GI loss: diarrhea, fistula).`,
        `Urinary Anion Gap (UAG) = ${uag.toFixed(1)} mEq/L (< 0): Thận tăng bài tiết NH4Cl bình thường → Mất HCO3- ngoài thận (tiêu chảy, rò tiêu hóa/tụy/mật).`
      );
    } else {
      uagInterpretation = t(
        lang,
        `Urinary Anion Gap (UAG) = +${uag.toFixed(1)} mEq/L (≥ 0): Impaired renal NH4+ excretion → Renal Tubular Acidosis (RTA type 1 or 4).`,
        `Urinary Anion Gap (UAG) = +${uag.toFixed(1)} mEq/L (≥ 0): Thận giảm bài tiết NH4+ → Toan hóa ống thận (RTA type 1 hoặc type 4).`
      );
    }
    bullets.push(uagInterpretation);
  }

  let uCl: number | null = null;
  let uClInterpretation: string | null = null;
  if (inputs.uCl !== null) {
    uCl = inputs.uCl;
    if (uCl < 20) {
      uClInterpretation = t(
        lang,
        `Urinary Cl- = ${uCl.toFixed(0)} mEq/L (< 20): Saline-responsive metabolic alkalosis (vomiting, NG suction, remote diuretics, post-hypercapnia).`,
        `Clo niệu = ${uCl.toFixed(0)} mEq/L (< 20): Kiềm chuyển hóa đáp ứng muối (nôn ói, hút sonde dạ dày, sau ngưng lợi tiểu, hậu tăng CO2).`
      );
    } else {
      uClInterpretation = t(
        lang,
        `Urinary Cl- = ${uCl.toFixed(0)} mEq/L (≥ 20): Saline-resistant metabolic alkalosis (hyperaldosteronism, Cushing, Bartter/Gitelman, severe hypokalemia, active diuretics).`,
        `Clo niệu = ${uCl.toFixed(0)} mEq/L (≥ 20): Kiềm chuyển hóa kháng muối (cường Aldosterone, Cushing, Bartter/Gitelman, hạ Kali nặng, đang dùng lợi tiểu).`
      );
    }
    bullets.push(uClInterpretation);
  }

  return {
    ag,
    agWithK,
    agAlbuminCorrected,
    effectiveAg,
    agHasanFull,
    agCategory,
    maskedWagmaByHypoalbuminemia,
    negativeAgCauses,
    metAlkalosisMildAgNote,
    deltaRatio,
    deltaRatioInterpretation,
    bicarbonateGap,
    bicarbonateGapInterpretation,
    calcOsm,
    osmolalGap,
    osmolalGapElevated,
    osmolalGapInterpretation,
    uag,
    uagInterpretation,
    uCl,
    uClInterpretation,
    bullets,
  };
}

function buildClinicalGuidance(
  detected: DetectedDisorders,
  step5: BloodGasEvaluation["step5"],
  inputs: BloodGasInputs,
  lang: BloodGasLang
): BloodGasEvaluation["clinicalGuidance"] {
  const etiologyGroups: EtiologyGroup[] = [];
  const workupSet = new Set<string>();

  const hasAnyMetAcid =
    detected.metAcidosisWagma ||
    detected.metAcidosisNagma ||
    detected.metAcidosisUnspecified;
  const hasRespAcid = detected.respAcidosis !== "none";
  const hasRespAlk = detected.respAlkalosis !== "none";

  // Classic Mixed Clinical Syndromes (Section 6.2 & Chapter 11)
  const mixedSyndromes: string[] = [];
  if (hasAnyMetAcid && hasRespAcid) {
    mixedSyndromes.push(
      t(
        lang,
        "Metabolic Acidosis + Respiratory Acidosis (Additive): Cardiac arrest / severe cardiogenic shock (lactic + apnea/pulmonary edema), Chronic renal failure + respiratory failure.",
        "Toan chuyển hóa + Toan hô hấp (Cộng hưởng): Ngừng tim / sốc tim nặng (toan lactic + ngưng thở/phù phổi), Suy thận mạn + suy hô hấp."
      )
    );
  }
  if (hasAnyMetAcid && hasRespAlk) {
    mixedSyndromes.push(
      t(
        lang,
        "Metabolic Acidosis + Respiratory Alkalosis (Counterbalancing): Septic shock (lactic + cytokine-driven tachypnea), DKA + Pneumonia, Salicylate toxicity, Hepatic failure.",
        "Toan chuyển hóa + Kiềm hô hấp (Đối lập): Sốc nhiễm trùng (lactic + thở nhanh do cytokine), DKA + Viêm phổi, Ngộ độc Salicylate, Suy gan."
      )
    );
  }
  if (hasRespAcid && detected.metAlkalosis) {
    mixedSyndromes.push(
      t(
        lang,
        "Respiratory Acidosis + Metabolic Alkalosis (Counterbalancing): COPD on loop/thiazide diuretics, corticosteroids, vomiting/NG suction, or post-hypercapnic alkalosis.",
        "Toan hô hấp + Kiềm chuyển hóa (Đối lập): Bệnh nhân COPD dùng lợi tiểu/corticoid, nôn ói/hút sonde dạ dày, hoặc kiềm hậu tăng CO2."
      )
    );
  }
  if (hasAnyMetAcid && detected.metAlkalosis) {
    mixedSyndromes.push(
      t(
        lang,
        "Metabolic Acidosis + Metabolic Alkalosis (Counterbalancing): DKA/Uremia + Vomiting or NG suction; Diarrhea + Diuretics (check Anion Gap & Delta Gap).",
        "Toan chuyển hóa + Kiềm chuyển hóa (Đối lập): DKA/Ure huyết + Nôn ói hoặc hút sonde dạ dày; Tiêu chảy + Lợi tiểu (đối chiếu Anion Gap & Delta Gap)."
      )
    );
  }
  if (mixedSyndromes.length > 0) {
    etiologyGroups.push({
      category: t(
        lang,
        "Classic Mixed Clinical Syndromes (Hasan §6.2 & Ch. 11)",
        "Hội chứng Hỗn hợp Lâm sàng Điển hình (Hasan §6.2 & Ch. 11)"
      ),
      items: mixedSyndromes,
    });
  }

  if (detected.metAcidosisUnspecified) {
    etiologyGroups.push({
      category: t(
        lang,
        "Metabolic Acidosis — Anion Gap Pending (Enter Na+ & Cl-)",
        "Toan chuyển hóa — Chưa phân loại được Anion Gap (Thiếu Na+ / Cl-)"
      ),
      items: [
        t(
          lang,
          "Cannot distinguish Wide-AG (WAGMA: Lactic, Ketoacidosis, Uremia, Toxins) vs Normal-AG (NAGMA: Diarrhea, RTA, 0.9% NaCl) until serum Na+, Cl-, and Albumin are entered.",
          "Chưa thể phân biệt Toan chuyển hóa tăng AG (WAGMA: Lactic, Cetone, Ure huyết, Độc chất) hay AG bình thường (NAGMA: Tiêu chảy, RTA, NaCl 0.9%) khi chưa có Na+, Cl- và Albumin."
        ),
      ],
    });
    workupSet.add(
      t(
        lang,
        "Serum Na+, Cl-, Albumin (to calculate Anion Gap & Albumin-corrected AG)",
        "Điện giải đồ Na+, Cl- và Albumin máu (để tính Anion Gap & AG hiệu chỉnh)"
      )
    );
    workupSet.add(
      t(
        lang,
        "Lactate, β-hydroxybutyrate/ketones, Glucose, BUN & Creatinine",
        "Lactate máu, Cetone máu/niệu, Glucose, BUN & Creatinine"
      )
    );
  }

  if (detected.metAcidosisWagma) {
    etiologyGroups.push({
      category: t(
        lang,
        "Wide-Anion-Gap Metabolic Acidosis (WAGMA · GOLDMARK & Hasan §9.29–9.30)",
        "Toan chuyển hóa tăng Anion Gap (WAGMA · GOLDMARK & Hasan §9.29–9.30)"
      ),
      items: [
        t(
          lang,
          "Lactic Acidosis Type A (hypoperfusion): Shock, circulatory failure, severe anemia, CO/Cyanide toxicity.",
          "Toan Lactic Type A (giảm tưới máu): Sốc, suy tuần hoàn, thiếu máu nặng, ngộ độc CO/Cyanide."
        ),
        t(
          lang,
          "Lactic Acidosis Type B (aerobic): B1 (DKA, liver/renal failure, leukemia/lymphoma, sepsis/malaria); B2 (Metformin, INH, β-agonists, Nitroprusside, ARVs, Ethanol/Methanol); B3 (PDH deficiency).",
          "Toan Lactic Type B (hiếu khí): B1 (DKA, suy gan/thận, ung thư máu, nhiễm trùng); B2 (Metformin, INH, β-agonists, Nitroprusside, ARV, Ethanol/Methanol); B3 (thiếu hụt Pyruvate dehydrogenase)."
        ),
        t(
          lang,
          "D-Lactic Acidosis: Bacterial fermentation of unabsorbed carbs (jejunoileal bypass, bowel obstruction); liver lacks D-lactate dehydrogenase — requires specific D-lactate assay.",
          "Toan D-Lactic: Vi khuẩn đại tràng lên men carbohydrate (sau nối tắt hỗng-hồi tràng, tắc ruột); gan không chuyển hóa được D-lactate — cần xét nghiệm D-lactate riêng."
        ),
        t(
          lang,
          "Ketoacidosis (Diabetic, Alcoholic, Starvation), Uremia/Renal failure, Oxoproline (chronic Acetaminophen), Thiamine (B1) deficiency (Beriberi / TPN).",
          "Nhiễm toan Cetone (ĐTĐ, rượu, nhịn đói), Suy thận/Ure huyết cao, Oxoproline (dùng Paracetamol kéo dài), Thiếu hụt Thiamine (B1 / TPN)."
        ),
        t(
          lang,
          "Exogenous Toxins: Methanol, Ethylene/Diethylene/Propylene glycol, Salicylates (early Resp Alk + late WAGMA).",
          "Độc chất ngoại sinh: Methanol, Ethylene/Diethylene/Propylene glycol, Salicylate (gây Kiềm hô hấp sớm + Toan chuyển hóa tăng AG muộn)."
        ),
      ],
    });
    workupSet.add(
      t(lang, "Arterial/venous Lactate (and D-lactate if unexplained + diarrhea/short bowel)", "Lactate máu (và D-lactate nếu không rõ nguyên nhân kèm tiêu chảy/nối tắt ruột)")
    );
    workupSet.add(
      t(lang, "Serum β-hydroxybutyrate / ketones, Glucose, BUN & Creatinine", "Cetone máu (β-hydroxybutyrate)/niệu, Glucose, BUN & Creatinine")
    );
    workupSet.add(
      t(lang, "Serum Albumin, Phosphate & Measured Osmolality (Osmolal Gap)", "Albumin, Phosphate & Áp lực thẩm thấu máu đo trực tiếp (Osmolal Gap)")
    );
    workupSet.add(
      t(lang, "Toxicology screen (Salicylate, Acetaminophen, Methanol/Ethylene glycol, urine oxalate crystals)", "Tầm soát độc chất (Salicylate, Paracetamol, Methanol/Ethylene glycol, tinh thể oxalate niệu)")
    );
  }

  if (detected.metAcidosisNagma) {
    etiologyGroups.push({
      category: t(
        lang,
        "Normal-Anion-Gap / Hyperchloremic Metabolic Acidosis (NAGMA · Hasan §9.11, §9.34)",
        "Toan chuyển hóa AG bình thường / Tăng Clo máu (NAGMA · Hasan §9.11, §9.34)"
      ),
      items: [
        t(
          lang,
          "GI Bicarbonate Loss: Diarrhea, pancreatic/biliary/small-bowel drainage, enterocutaneous fistulas. (Severe secretory diarrhea/cholera can progress to renal failure + lactic acidosis).",
          "Mất Bicarbonate qua tiêu hóa: Tiêu chảy, dẫn lưu dịch tụy/mật/ruột non, rò ruột ngoài da. (Tiêu chảy nặng kéo dài có thể tiến triển suy thận + toan lactic)."
        ),
        t(
          lang,
          "Renal Loss / Acid Retention: RTA type 1, 2, 4; early CKD; Acetazolamide; recovery phase of DKA.",
          "Mất qua thận / Ứ đọng acid: Toan hóa ống thận (RTA type 1, 2, 4), suy thận mạn sớm, Acetazolamide, giai đoạn hồi phục DKA."
        ),
        t(
          lang,
          "Drugs & Fluids: Large-volume 0.9% NaCl resuscitation, Spironolactone, Amphotericin B, Lithium, NSAIDs, Pentamidine, Aminoglycosides.",
          "Thuốc & Dịch truyền: Truyền lượng lớn NaCl 0.9%, Spironolactone, Amphotericin B, Lithium, NSAIDs, Pentamidine, Aminoglycosides."
        ),
      ],
    });
    workupSet.add(
      t(lang, "Urinary Electrolytes (Na+, K+, Cl-) for Urinary Anion Gap (UAG) & Urine pH", "Điện giải niệu (Na+, K+, Cl-) tính UAG & pH nước tiểu")
    );
    workupSet.add(
      t(lang, "Serum Potassium (K+) & Renal function (BUN/Cr)", "Kali máu & Chức năng thận (BUN/Creatinine)")
    );
  }

  if (detected.metAlkalosis) {
    etiologyGroups.push({
      category: t(
        lang,
        "Metabolic Alkalosis (Hasan §10.1, §10.6, §10.11)",
        "Kiềm chuyển hóa (Hasan §10.1, §10.6, §10.11)"
      ),
      items: [
        t(
          lang,
          "Saline-Responsive (UCl < 20 mEq/L): Vomiting, NG suction (Ryle's tube), remote diuretics, volume contraction, post-hypercapnic alkalosis.",
          "Đáp ứng muối (Clo niệu < 20): Nôn ói, hút dịch dạ dày qua sonde, sau ngưng lợi tiểu, co thể tích, hậu tăng CO2 mạn."
        ),
        t(
          lang,
          "Saline-Resistant (UCl > 20 mEq/L): Primary hyperaldosteronism (Conn), Cushing syndrome, Bartter/Gitelman, severe hypokalemia, active loop/thiazide diuretics.",
          "Kháng muối (Clo niệu > 20): Cường Aldosterone nguyên phát, Cushing, Bartter/Gitelman, hạ Kali nặng, đang dùng lợi tiểu."
        ),
        t(
          lang,
          "Special Agents & Mechanisms: High-dose Penicillins (Ampicillin), Citrate overload (massive transfusion or CRRT/hemodialysis), Hypoalbuminemia, Cation-exchange resin + antacids, Crossed-anion effect.",
          "Tác nhân đặc biệt: Penicillin liều cao (Ampicillin), quá tải Citrate (truyền máu ồ ạt hoặc lọc máu), hạ Albumin máu, nhựa trao đổi cation + kháng acid, hiệu ứng crossed-anion."
        ),
      ],
    });
    workupSet.add(
      t(lang, "Urinary Chloride (UCl), Serum K+, Mg2+, and ionized Calcium (iCa2+)", "Clo niệu (UCl), Kali máu, Magie máu & Canxi ion hóa (iCa2+)")
    );
    workupSet.add(
      t(lang, "Assess volume status & review diuretic/NG suction/transfusion history", "Đánh giá thể tích tuần hoàn & rà soát tiền sử nôn, hút sonde, lợi tiểu, truyền máu")
    );
  }

  if (detected.respAcidosis !== "none") {
    const isChronic = detected.respAcidosis === "chronic";
    etiologyGroups.push({
      category: t(
        lang,
        `Respiratory Acidosis — ${isChronic ? "Chronic" : "Acute / Acute-on-Chronic"} (Anatomical Classification · Hasan)`,
        `Toan hô hấp — ${isChronic ? "Mạn tính" : "Cấp / Cấp trên nền mạn"} (Theo vị trí giải phẫu · Hasan)`
      ),
      items: [
        t(
          lang,
          "Central Drive Depression: Acute (sedatives, opiates, anesthetics, TBI, stroke, encephalitis); Chronic (primary alveolar hypoventilation).",
          "Ức chế trung tâm hô hấp: Cấp (thuốc an thần, opiates, thuốc mê, chấn thương sọ não, đột quỵ, viêm não); Mạn (giảm thông khí phế nang nguyên phát)."
        ),
        t(
          lang,
          "Neuromuscular: High cervical cord injury (≥C4), myasthenia gravis, ALS, Guillain-Barré, tetanus, botulism, organophosphates, muscle relaxants, severe ↓K+/↓PO4/↓Mg2+.",
          "Thần kinh - cơ: Tổn thương tủy cổ (≥C4), nhược cơ, ALS, Guillain-Barré, uốn ván, botulinum, phospho hữu cơ, thuốc giãn cơ, hạ K+/PO4/Mg2+ nặng."
        ),
        t(
          lang,
          "Chest Wall & Pleura: Flail chest, diaphragmatic paralysis/rupture, kyphoscoliosis, obesity hypoventilation (OHS), pneumothorax, large pleural effusion.",
          "Thành ngực & Màng phổi: Mảng sườn di động, liệt/vỡ cơ hoành, gù vẹo cột sống, béo phì (OHS), tràn khí hoặc tràn dịch màng phổi lớn."
        ),
        t(
          lang,
          "Airways & Parenchyma: Upper airway obstruction, aspiration, acute Asthma/COPD exacerbation, severe COPD, ARDS, cardiogenic pulmonary edema, severe pneumonia, ILD.",
          "Đường thở & Nhu mô phổi: Tắc nghẽn đường thở trên, hít sặc, đợt cấp Hen/COPD, COPD nặng, ARDS, phù phổi cấp, viêm phổi nặng, bệnh phổi mô kẽ."
        ),
        t(
          lang,
          "Increased CO2 Production: Circulatory shock, sepsis, malignant hyperthermia, laparoscopic CO2 insufflation.",
          "Tăng sinh CO2 cấp: Sốc tuần hoàn, nhiễm trùng huyết, sốt cao ác tính, bơm CO2 nội soi."
        ),
      ],
    });
    workupSet.add(
      t(lang, "Chest X-ray / CT chest, airway patency & respiratory muscle strength check", "X-quang ngực / CT ngực, đánh giá thông thoáng đường thở & cơ lực hô hấp")
    );
    workupSet.add(
      t(lang, "Check K+, Mg2+, PO43-, mental status (GCS), and sedative/opioid exposure", "Kiểm tra K+, Mg2+, PO43-, tri giác (GCS) & tiền sử dùng thuốc an thần/opioid")
    );
  }

  if (detected.respAlkalosis !== "none") {
    etiologyGroups.push({
      category: t(
        lang,
        "Respiratory Alkalosis (4 Mechanism Groups · Hasan §8.3)",
        "Kiềm hô hấp (4 Nhóm cơ chế · Hasan §8.3)"
      ),
      items: [
        t(
          lang,
          "Centrally Mediated: ↑ICP, stroke, ICH, CNS infection, head trauma, pontine tumor, pain/anxiety, sepsis (cytokines), chronic liver disease (NH3), Salicylates, Progesterone/pregnancy, Methylxanthines.",
          "Trung ương: Tăng áp lực nội sọ, đột quỵ, xuất huyết não, nhiễm trùng TKTW, chấn thương đầu, u cầu não, đau/lo âu, sepsis, bệnh gan mạn (NH3), Salicylate, Progesterone/thai kỳ."
        ),
        t(
          lang,
          "Hypoxemic Drive: Any cause of hypoxemia stimulating peripheral chemoreceptors (including high altitude).",
          "Do giảm Oxy máu: Mọi nguyên nhân gây giảm oxy máu kích thích thụ thể hóa học ngoại vi (kể cả độ cao)."
        ),
        t(
          lang,
          "Pulmonary Interstitial (J-receptors): Pneumonia, Asthma, Pulmonary Embolism (PE — note: normal ABG does NOT exclude PE), Pulmonary edema.",
          "Mô kẽ phổi (thụ thể J): Viêm phổi, Hen phế quản, Thuyên tắc phổi (PE — lưu ý: ABG bình thường không loại trừ được PE), Phù phổi."
        ),
        t(
          lang,
          "Extrinsic / Iatrogenic: Excessive minute ventilation on invasive or non-invasive mechanical ventilation.",
          "Ngoại sinh / Do điều trị: Cài đặt thông khí phút quá mức trên máy thở."
        ),
      ],
    });
    workupSet.add(
      t(lang, "Screen for Pulmonary Embolism (D-dimer / CTPA if indicated), Pneumonia, Sepsis, and CNS pathology", "Tầm soát Thuyên tắc phổi (PE), Viêm phổi, Nhiễm trùng huyết và bệnh lý TKTW")
    );
    workupSet.add(
      t(lang, "Check Liver function / Ammonia, Salicylate level, and ventilator minute ventilation settings", "Kiểm tra chức năng gan/NH3, nồng độ Salicylate và thông số máy thở (nếu đang thở máy)")
    );
  }

  if (step5.agCategory === "negative_low") {
    etiologyGroups.push({
      category: t(
        lang,
        "Low or Negative Anion Gap Differential (Hasan §9.13)",
        "Chẩn đoán phân biệt Anion Gap thấp hoặc âm (Hasan §9.13)"
      ),
      items: step5.negativeAgCauses,
    });
    workupSet.add(
      t(lang, "Review Pyridostigmine bromide / Bromide exposure, Lipid panel, and repeat Na+/Cl- by direct ISE", "Kiểm tra tiền sử dùng Pyridostigmine bromide, bilan Lipid và đo lại Na+/Cl- bằng điện cực chọn lọc ion trực tiếp")
    );
  }

  if (etiologyGroups.length === 0) {
    workupSet.add(
      t(lang, "Correlate with clinical history, vital signs, and repeat ABG/electrolytes if clinical status changes.", "Đối chiếu bệnh sử, dấu hiệu sinh tồn và lặp lại khí máu/điện giải nếu diễn tiến lâm sàng thay đổi.")
    );
  }

  return {
    etiologyGroups,
    recommendedWorkup: Array.from(workupSet),
  };
}

export function evaluateBloodGas(
  inputs: BloodGasInputs,
  lang: BloodGasLang = "en"
): BloodGasEvaluation {
  const { effectiveHco3, estimatedFromTco2 } = resolveEffectiveHco3(inputs);
  const hco3 = effectiveHco3 ?? 24;

  const step1 = evaluateStep1(inputs, hco3, estimatedFromTco2, lang);
  const { step2, gasExchangeLabel, respiratoryFailureType } = evaluateStep2(
    inputs,
    lang
  );

  // Preliminary metabolic alkalosis hint for Step 5 mild-AG note
  const isMetAlkalosisHint = inputs.ph > 7.45 && hco3 > 26;
  const step5 = evaluateStep5Metabolic(inputs, hco3, isMetAlkalosisHint, lang);

  // Steps 3 & 4: Acid-Base Primary Disorder, Coexistence & Compensation
  const ref = SAMPLE_REFERENCE_RANGES[inputs.sampleType];
  const phStatus: BloodGasEvaluation["step3and4"]["phStatus"] =
    inputs.ph < ref.ph[0]
      ? "acidemia"
      : inputs.ph > ref.ph[1]
        ? "alkalemia"
        : "normal";

  const pco2High = inputs.pco2MmHg > ref.pco2MmHg[1];
  const pco2Low = inputs.pco2MmHg < ref.pco2MmHg[0];
  const hco3High = hco3 > ref.hco3[1];
  const hco3Low = hco3 < ref.hco3[0];

  let directionRule: BloodGasEvaluation["step3and4"]["directionRule"] =
    "normal_both";
  if ((pco2High && hco3High) || (pco2Low && hco3Low)) {
    directionRule = "same";
  } else if ((pco2High && hco3Low) || (pco2Low && hco3High)) {
    directionRule = "opposite";
  } else if (!pco2High && !pco2Low && !hco3High && !hco3Low) {
    directionRule = "normal_both";
  } else {
    directionRule = "one_normal";
  }

  const hasElevatedAg = step5.effectiveAg !== null && step5.effectiveAg > 12;
  const compensationChecks: CompensationCheckItem[] = [];
  const deltaHRef: {
    value: BloodGasEvaluation["step3and4"]["deltaHOverDeltaPco2"];
  } = { value: null };

  const detected: DetectedDisorders = {
    metAcidosisWagma: false,
    metAcidosisNagma: false,
    metAcidosisUnspecified: false,
    metAlkalosis: false,
    respAcidosis: "none",
    respAlkalosis: "none",
  };

  const step34Bullets: string[] = [];
  if (inputs.sampleType !== "abg") {
    step34Bullets.push(
      t(
        lang,
        `Using ${ref.labelEn} reference thresholds (pH ${ref.ph[0]}–${ref.ph[1]}, PCO2 ${ref.pco2MmHg[0]}–${ref.pco2MmHg[1]} mmHg, HCO3- ${ref.hco3[0]}–${ref.hco3[1]} mEq/L).`,
        `Áp dụng ngưỡng tham chiếu ${ref.labelVi} (pH ${ref.ph[0]}–${ref.ph[1]}, PCO2 ${ref.pco2MmHg[0]}–${ref.pco2MmHg[1]} mmHg, HCO3- ${ref.hco3[0]}–${ref.hco3[1]} mEq/L).`
      )
    );
  }

  // Helper to compute ΔH+/ΔPCO2 using calculated [H+] per Hasan §7.10
  const computeDeltaRatio = () => {
    const dH = step1.hPlusCalc - 40;
    const dCO2 = inputs.pco2MmHg - 40;
    if (Math.abs(dCO2) < 1) return null;
    return dH / dCO2;
  };

  // Helper for Metabolic Acidosis compensation check (Winter's + ΔPCO2 + 2-digit pH)
  const checkMetAcidosisComp = () => {
    const winterCenter = 1.5 * hco3 + 8;
    const winterLow = Math.max(10, winterCenter - 2);
    const winterHigh = winterCenter + 2;
    const deltaPco2Est = Math.max(10, 40 - 1.2 * Math.max(0, 24 - hco3));
    const twoDigitPh =
      inputs.ph >= 7.0 && inputs.ph < 7.4
        ? Math.round((inputs.ph - 7) * 100)
        : null;
    const status: CompensationCheckItem["status"] =
      inputs.pco2MmHg < winterLow
        ? "below"
        : inputs.pco2MmHg > winterHigh
          ? "above"
          : "appropriate";
    const extraNotes = ` (ΔPCO2 method ~${deltaPco2Est.toFixed(0)} mmHg${twoDigitPh !== null ? `; last 2 digits of pH ~${twoDigitPh}` : ""})`;
    const interpretation =
      status === "above"
        ? t(
            lang,
            `Actual PaCO2 (${inputs.pco2MmHg.toFixed(1)}) > Winter's upper bound (${winterHigh.toFixed(1)} mmHg)${extraNotes} → Concurrent Respiratory Acidosis.`,
            `PaCO2 thực tế (${inputs.pco2MmHg.toFixed(1)}) > giới hạn trên Winter (${winterHigh.toFixed(1)} mmHg)${extraNotes} → Có Toan hô hấp nguyên phát đi kèm.`
          )
        : status === "below"
          ? t(
              lang,
              `Actual PaCO2 (${inputs.pco2MmHg.toFixed(1)}) < Winter's lower bound (${winterLow.toFixed(1)} mmHg)${extraNotes} → Concurrent Respiratory Alkalosis.`,
              `PaCO2 thực tế (${inputs.pco2MmHg.toFixed(1)}) < giới hạn dưới Winter (${winterLow.toFixed(1)} mmHg)${extraNotes} → Có Kiềm hô hấp nguyên phát đi kèm.`
            )
          : t(
              lang,
              `Actual PaCO2 (${inputs.pco2MmHg.toFixed(1)} mmHg) is within Winter's expected range (${winterLow.toFixed(1)}–${winterHigh.toFixed(1)} mmHg)${extraNotes} → Appropriate respiratory compensation.`,
              `PaCO2 thực tế (${inputs.pco2MmHg.toFixed(1)} mmHg) nằm trong khoảng dự đoán Winter (${winterLow.toFixed(1)}–${winterHigh.toFixed(1)} mmHg)${extraNotes} → Bù trừ hô hấp phù hợp.`
            );

    compensationChecks.push({
      formulaName: t(lang, "Winter's Formula (Metabolic Acidosis)", "Công thức Winter (Toan chuyển hóa)"),
      expectedRangeText: `${winterLow.toFixed(1)}–${winterHigh.toFixed(1)} mmHg (±2; max ±4)`,
      actualText: `${inputs.pco2MmHg.toFixed(1)} mmHg`,
      timeframe: t(lang, "Onset minutes; complete 12–24h", "Khởi phát vài phút; hoàn tất 12–24h"),
      physioLimit: t(lang, "PaCO2 lower limit ~10 mmHg", "Giới hạn dưới PaCO2 ~10 mmHg"),
      status,
      interpretation,
    });
    return status;
  };

  // Helper for Metabolic Alkalosis compensation check
  const checkMetAlkalosisComp = () => {
    const expCenter = 0.7 * hco3 + 21;
    const altCenter = 0.9 * hco3 + 9;
    const expLow = expCenter - 2;
    const expHigh = Math.min(60, expCenter + 2);
    const exceedsMaxLimit = inputs.pco2MmHg > 60;
    const status: CompensationCheckItem["status"] =
      exceedsMaxLimit || inputs.pco2MmHg > expCenter + 2
        ? "above"
        : inputs.pco2MmHg < expLow
          ? "below"
          : "appropriate";
    const altNote = ` (alt 0.9×HCO3+9 = ${altCenter.toFixed(1)} ± 2; ΔPaCO2 = 0.6–0.8×ΔHCO3)`;
    const interpretation = exceedsMaxLimit
      ? t(
          lang,
          `PaCO2 (${inputs.pco2MmHg.toFixed(1)} mmHg) exceeds physiological hypoventilation limit (>60 mmHg)${altNote} → Concurrent Primary Respiratory Acidosis (unless crossed-anion effect).`,
          `PaCO2 (${inputs.pco2MmHg.toFixed(1)} mmHg) vượt giới hạn bù trừ tối đa (>60 mmHg)${altNote} → Có Toan hô hấp nguyên phát đi kèm (trừ hiệu ứng crossed-anion).`
        )
      : status === "above"
        ? t(
            lang,
            `Actual PaCO2 (${inputs.pco2MmHg.toFixed(1)}) > expected (${expLow.toFixed(1)}–${(expCenter + 2).toFixed(1)} mmHg)${altNote} → Concurrent Respiratory Acidosis.`,
            `PaCO2 thực tế (${inputs.pco2MmHg.toFixed(1)}) > dự đoán (${expLow.toFixed(1)}–${(expCenter + 2).toFixed(1)} mmHg)${altNote} → Có Toan hô hấp đi kèm.`
          )
        : status === "below"
          ? t(
              lang,
              `Actual PaCO2 (${inputs.pco2MmHg.toFixed(1)}) < expected (${expLow.toFixed(1)} mmHg)${altNote} → Concurrent Respiratory Alkalosis.`,
              `PaCO2 thực tế (${inputs.pco2MmHg.toFixed(1)}) < dự đoán (${expLow.toFixed(1)} mmHg)${altNote} → Có Kiềm hô hấp đi kèm.`
            )
          : t(
              lang,
              `Actual PaCO2 (${inputs.pco2MmHg.toFixed(1)} mmHg) matches expected respiratory compensation${altNote}.`,
              `PaCO2 thực tế (${inputs.pco2MmHg.toFixed(1)} mmHg) phù hợp bù trừ hô hấp${altNote}.`
            );

    compensationChecks.push({
      formulaName: t(lang, "Metabolic Alkalosis Compensation", "Bù trừ Kiềm chuyển hóa"),
      expectedRangeText: `${expLow.toFixed(1)}–${expHigh.toFixed(1)} mmHg (0.7×HCO3 + 21)`,
      actualText: `${inputs.pco2MmHg.toFixed(1)} mmHg`,
      timeframe: t(lang, "Hours to 1–2 days", "Vài giờ đến 1–2 ngày"),
      physioLimit: t(lang, "PaCO2 upper limit ~60 mmHg", "Giới hạn trên PaCO2 ~60 mmHg"),
      status,
      interpretation,
    });
    return status;
  };

  // Helper for Respiratory Acidosis compensation check
  const checkRespAcidosisComp = () => {
    const dCO2 = Math.max(0, inputs.pco2MmHg - 40);
    const ratio = computeDeltaRatio();
    let classification: "acute" | "acute_on_chronic" | "chronic" = "acute";
    if (ratio !== null) {
      if (ratio > 0.7) classification = "acute";
      else if (ratio >= 0.3) classification = "acute_on_chronic";
      else classification = "chronic";

      deltaHRef.value = {
        ratio,
        classification,
        note:
          classification === "acute"
            ? t(
                lang,
                `ΔH+/ΔPaCO2 = ${ratio.toFixed(2)} (> 0.7): Acute Respiratory Acidosis (Track 0.1).`,
                `ΔH+/ΔPaCO2 = ${ratio.toFixed(2)} (> 0.7): Toan hô hấp CẤP TÍNH (Track 0.1).`
              )
            : classification === "acute_on_chronic"
              ? t(
                  lang,
                  `ΔH+/ΔPaCO2 = ${ratio.toFixed(2)} (0.3–0.7): Acute-on-Chronic Respiratory Acidosis (or Chronic Resp Acidosis + Metabolic Acidosis; check COPD history & Anion Gap per Mane).`,
                  `ΔH+/ΔPaCO2 = ${ratio.toFixed(2)} (0.3–0.7): Toan hô hấp CẤP TRÊN NỀN MẠN (hoặc Toan hô hấp mạn + Toan chuyển hóa; cần đối chiếu tiền sử COPD & Anion Gap).`
                )
              : t(
                  lang,
                  `ΔH+/ΔPaCO2 = ${ratio.toFixed(2)} (< 0.3): Chronic Respiratory Acidosis (Track 0.4).`,
                  `ΔH+/ΔPaCO2 = ${ratio.toFixed(2)} (< 0.3): Toan hô hấp MẠN TÍNH (Track 0.4).`
                ),
      };
    }

    const acuteExp = 24 + 0.1 * dCO2;
    const chronicExp = 24 + 0.4 * dCO2;
    const lowBound = Math.min(acuteExp, chronicExp) - 2;
    const highBound = Math.max(acuteExp, chronicExp) + 2;

    let status: CompensationCheckItem["status"] = "appropriate";
    let interpretation = "";

    if (hco3 > 45 || hco3 > chronicExp + 3) {
      status = "above";
      interpretation = t(
        lang,
        `Actual HCO3- (${hco3.toFixed(1)}) > chronic expected (${chronicExp.toFixed(1)} mEq/L; physiological max 45) → Concurrent Metabolic Alkalosis.`,
        `HCO3- thực tế (${hco3.toFixed(1)}) > mức bù trừ mạn (${chronicExp.toFixed(1)} mEq/L; tối đa sinh lý 45) → Có Kiềm chuyển hóa đi kèm.`
      );
    } else if (hco3 < acuteExp - 2) {
      status = "below";
      interpretation = t(
        lang,
        `Actual HCO3- (${hco3.toFixed(1)}) < acute expected (${acuteExp.toFixed(1)} mEq/L) → Concurrent Metabolic Acidosis.`,
        `HCO3- thực tế (${hco3.toFixed(1)}) < mức bù trừ cấp (${acuteExp.toFixed(1)} mEq/L) → Có Toan chuyển hóa đi kèm.`
      );
    } else {
      interpretation = t(
        lang,
        `Actual HCO3- (${hco3.toFixed(1)} mEq/L) fits ${classification === "chronic" ? "chronic" : classification === "acute_on_chronic" ? "acute-on-chronic" : "acute"} respiratory compensation (Acute ~${acuteExp.toFixed(1)}, Chronic ~${chronicExp.toFixed(1)}).`,
        `HCO3- thực tế (${hco3.toFixed(1)} mEq/L) phù hợp bù trừ ${classification === "chronic" ? "mạn tính" : classification === "acute_on_chronic" ? "cấp trên nền mạn" : "cấp tính"} (Cấp ~${acuteExp.toFixed(1)}, Mạn ~${chronicExp.toFixed(1)}).`
      );
    }

    compensationChecks.push({
      formulaName: t(
        lang,
        "Respiratory Acidosis (Track 0.1 Acute / 0.4 Chronic)",
        "Toan hô hấp (Track 0.1 Cấp / 0.4 Mạn)"
      ),
      expectedRangeText: `Acute ~${acuteExp.toFixed(1)} · Chronic ~${chronicExp.toFixed(1)} mEq/L (range ${lowBound.toFixed(1)}–${highBound.toFixed(1)})`,
      actualText: `${hco3.toFixed(1)} mEq/L`,
      timeframe: t(lang, "Acute 1–2h; Chronic 2–5 days", "Cấp 1–2h; Mạn 2–5 ngày"),
      physioLimit: t(lang, "Acute ≤30–32; Chronic ≤45 mmol/L", "Cấp ≤30–32; Mạn ≤45 mmol/L"),
      status,
      interpretation,
    });

    return { status, classification };
  };

  // Helper for Respiratory Alkalosis compensation check
  const checkRespAlkalosisComp = () => {
    const dCO2 = Math.max(0, 40 - inputs.pco2MmHg);
    const acuteExp = 24 - 0.2 * dCO2;
    const chronicExp = 24 - 0.5 * dCO2;
    const lowBound = Math.max(12, chronicExp - 2);
    const highBound = acuteExp + 2;
    const ratio = computeDeltaRatio();
    const classification: "acute" | "chronic" =
      ratio !== null
        ? ratio >= 0.5
          ? "acute"
          : "chronic"
        : Math.abs(hco3 - chronicExp) < Math.abs(hco3 - acuteExp) && hco3 < 20
          ? "chronic"
          : "acute";

    if (ratio !== null && !deltaHRef.value) {
      deltaHRef.value = {
        ratio,
        classification,
        note:
          classification === "acute"
            ? t(
                lang,
                `ΔH+/ΔPaCO2 = ${ratio.toFixed(2)} (expected ~0.75 acute): Acute Respiratory Alkalosis (Track 0.2).`,
                `ΔH+/ΔPaCO2 = ${ratio.toFixed(2)} (cấp ~0.75): Kiềm hô hấp CẤP TÍNH (Track 0.2).`
              )
            : t(
                lang,
                `ΔH+/ΔPaCO2 = ${ratio.toFixed(2)} (expected ~0.30 chronic): Chronic Respiratory Alkalosis (Track 0.5).`,
                `ΔH+/ΔPaCO2 = ${ratio.toFixed(2)} (mạn ~0.30): Kiềm hô hấp MẠN TÍNH (Track 0.5).`
              ),
      };
    }

    let status: CompensationCheckItem["status"] = "appropriate";
    let interpretation = "";

    if (hco3 < 12 || hco3 < chronicExp - 2) {
      status = "below";
      interpretation = t(
        lang,
        `Actual HCO3- (${hco3.toFixed(1)}) < chronic expected (${chronicExp.toFixed(1)} mEq/L; physiological floor 12) → Concurrent Metabolic Acidosis.`,
        `HCO3- thực tế (${hco3.toFixed(1)}) < mức bù trừ mạn (${chronicExp.toFixed(1)} mEq/L; giới hạn dưới 12) → Có Toan chuyển hóa đi kèm.`
      );
    } else if (hco3 > acuteExp + 2) {
      status = "above";
      interpretation = t(
        lang,
        `Actual HCO3- (${hco3.toFixed(1)}) > acute expected (${acuteExp.toFixed(1)} mEq/L) → Concurrent Metabolic Alkalosis.`,
        `HCO3- thực tế (${hco3.toFixed(1)}) > mức bù trừ cấp (${acuteExp.toFixed(1)} mEq/L) → Có Kiềm chuyển hóa đi kèm.`
      );
    } else {
      interpretation = t(
        lang,
        `Actual HCO3- (${hco3.toFixed(1)} mEq/L) fits ${classification} respiratory alkalosis compensation (Acute ~${acuteExp.toFixed(1)}, Chronic ~${chronicExp.toFixed(1)}).`,
        `HCO3- thực tế (${hco3.toFixed(1)} mEq/L) phù hợp bù trừ kiềm hô hấp ${classification === "chronic" ? "mạn" : "cấp"} (Cấp ~${acuteExp.toFixed(1)}, Mạn ~${chronicExp.toFixed(1)}).`
      );
    }

    compensationChecks.push({
      formulaName: t(
        lang,
        "Respiratory Alkalosis (Track 0.2 Acute / 0.5 Chronic)",
        "Kiềm hô hấp (Track 0.2 Cấp / 0.5 Mạn)"
      ),
      expectedRangeText: `Acute ~${acuteExp.toFixed(1)} · Chronic ~${chronicExp.toFixed(1)} mEq/L (range ${lowBound.toFixed(1)}–${highBound.toFixed(1)})`,
      actualText: `${hco3.toFixed(1)} mEq/L`,
      timeframe: t(lang, "Acute <12h; Chronic 7–10 days", "Cấp <12h; Mạn 7–10 ngày"),
      physioLimit: t(lang, "Acute ≥18; Chronic ≥12 mmol/L", "Cấp ≥18; Mạn ≥12 mmol/L"),
      status,
      interpretation,
    });

    return { status, classification };
  };

  // Assign metabolic acidosis subtype helper
  const markMetAcidosis = () => {
    if (step5.effectiveAg === null) {
      detected.metAcidosisUnspecified = true;
      return;
    }
    if (hasElevatedAg) {
      detected.metAcidosisWagma = true;
      if (
        (step5.bicarbonateGap !== null && step5.bicarbonateGap < -6) ||
        (step5.deltaRatio !== null && step5.deltaRatio < 0.8)
      ) {
        detected.metAcidosisNagma = true;
      }
      if (
        (step5.bicarbonateGap !== null && step5.bicarbonateGap > 6) ||
        (step5.deltaRatio !== null && step5.deltaRatio > 2.0)
      ) {
        detected.metAlkalosis = true;
      }
    } else {
      detected.metAcidosisNagma = true;
    }
  };

  // Always check masked WAGMA even if pH/HCO3 are normal or alkalemic
  // Skip if likely mild AG elevation (13-16) from Metabolic Alkalosis itself (Hasan §9.8)
  const isLikelyPureMetAlkMildAg =
    phStatus === "alkalemia" &&
    hco3High &&
    step5.effectiveAg !== null &&
    step5.effectiveAg <= 16;

  if (hasElevatedAg && !hco3Low && !isLikelyPureMetAlkMildAg) {
    detected.metAcidosisWagma = true;
    if (!pco2High) {
      detected.metAlkalosis = true;
    }
  }

  // Primary classification tree
  if (phStatus === "acidemia") {
    if (pco2High && hco3Low) {
      // Opposite directions -> Mixed Additive Acidosis
      detected.respAcidosis = "acute";
      markMetAcidosis();
      checkRespAcidosisComp();
    } else if (pco2High) {
      // Respiratory Acidosis primary
      const { status, classification } = checkRespAcidosisComp();
      detected.respAcidosis = classification;
      if (status === "below") {
        markMetAcidosis();
      } else if (status === "above") {
        detected.metAlkalosis = true;
      }
      if (hasElevatedAg) {
        detected.metAcidosisWagma = true;
      }
    } else if (hco3Low) {
      // Metabolic Acidosis primary
      markMetAcidosis();
      const compStatus = checkMetAcidosisComp();
      if (compStatus === "above") {
        detected.respAcidosis = "acute";
      } else if (compStatus === "below") {
        detected.respAlkalosis = "acute";
      }
    } else {
      // Mild acidemia with borderline PaCO2/HCO3
      if (inputs.pco2MmHg > 40) {
        detected.respAcidosis = "acute";
        checkRespAcidosisComp();
      } else {
        markMetAcidosis();
        checkMetAcidosisComp();
      }
    }
  } else if (phStatus === "alkalemia") {
    if (pco2Low && hco3High) {
      // Opposite directions -> Mixed Additive Alkalosis
      detected.respAlkalosis = "acute";
      detected.metAlkalosis = true;
      checkRespAlkalosisComp();
    } else if (pco2Low) {
      // Respiratory Alkalosis primary
      const { status, classification } = checkRespAlkalosisComp();
      detected.respAlkalosis = classification;
      if (status === "below") {
        markMetAcidosis();
      } else if (status === "above") {
        detected.metAlkalosis = true;
      }
    } else if (hco3High) {
      // Metabolic Alkalosis primary
      detected.metAlkalosis = true;
      const compStatus = checkMetAlkalosisComp();
      if (compStatus === "above") {
        detected.respAcidosis = "acute";
      } else if (compStatus === "below") {
        detected.respAlkalosis = "acute";
      }
    } else {
      if (inputs.pco2MmHg < 40) {
        detected.respAlkalosis = "acute";
        checkRespAlkalosisComp();
      } else {
        detected.metAlkalosis = true;
        checkMetAlkalosisComp();
      }
    }
  } else {
    // Normal pH (7.35 - 7.45) — Hasan Matrix
    if (!pco2High && !pco2Low && !hco3High && !hco3Low) {
      if (hasElevatedAg) {
        detected.metAcidosisWagma = true;
        detected.metAlkalosis = true;
        step34Bullets.push(
          t(
            lang,
            "Normal pH, PaCO2, and HCO3- with elevated Anion Gap → Counterbalancing Masked WAGMA + Metabolic Alkalosis.",
            "pH, PaCO2 và HCO3- bình thường nhưng Anion Gap tăng → Rối loạn hỗn hợp đối lập: Toan chuyển hóa tăng AG ẩn + Kiềm chuyển hóa."
          )
        );
      } else {
        step34Bullets.push(
          t(
            lang,
            "Normal pH, PaCO2, HCO3-, and Anion Gap (where available) → Normal acid-base balance.",
            "pH, PaCO2, HCO3- và Anion Gap đều bình thường → Thăng bằng toan kiềm bình thường."
          )
        );
      }
    } else if (pco2Low && hco3Low) {
      // Lean primary by side of 7.40
      if (inputs.ph < 7.4) {
        markMetAcidosis();
        const compStatus = checkMetAcidosisComp();
        if (compStatus === "below") {
          detected.respAlkalosis = "chronic";
        } else if (compStatus === "above") {
          detected.respAcidosis = "acute";
        }
      } else {
        const { status, classification } = checkRespAlkalosisComp();
        detected.respAlkalosis = classification;
        if (status === "below") {
          markMetAcidosis();
        } else if (status === "above") {
          detected.metAlkalosis = true;
        }
      }
      if (hasElevatedAg) {
        detected.metAcidosisWagma = true;
        if (step5.bicarbonateGap !== null && step5.bicarbonateGap > 6) {
          detected.metAlkalosis = true;
        }
      }
    } else if (pco2High && hco3High) {
      if (inputs.ph <= 7.4) {
        const { status, classification } = checkRespAcidosisComp();
        detected.respAcidosis = classification;
        if (status === "above") {
          detected.metAlkalosis = true;
        } else if (status === "below") {
          markMetAcidosis();
        }
        if (hasElevatedAg) {
          detected.metAcidosisWagma = true;
        }
      } else {
        detected.metAlkalosis = true;
        const compStatus = checkMetAlkalosisComp();
        if (compStatus === "above") {
          detected.respAcidosis = "chronic";
        } else if (compStatus === "below") {
          detected.respAlkalosis = "acute";
        }
        if (hasElevatedAg) {
          detected.metAcidosisWagma = true;
        }
      }
    } else {
      // One normal, one abnormal with normal pH
      if (pco2High) {
        const { status, classification } = checkRespAcidosisComp();
        detected.respAcidosis = classification;
        if (status === "above") detected.metAlkalosis = true;
      } else if (pco2Low) {
        const { status, classification } = checkRespAlkalosisComp();
        detected.respAlkalosis = classification;
        if (status === "below") markMetAcidosis();
      } else if (hco3Low) {
        markMetAcidosis();
        const compStatus = checkMetAcidosisComp();
        if (compStatus === "below") detected.respAlkalosis = "acute";
      } else if (hco3High) {
        detected.metAlkalosis = true;
        const compStatus = checkMetAlkalosisComp();
        if (compStatus === "above") detected.respAcidosis = "acute";
      }
    }
  }

  // Assemble component list
  const components: string[] = [];
  if (detected.metAcidosisUnspecified) {
    components.push(
      t(lang, "Metabolic Acidosis", "Toan chuyển hóa")
    );
  }
  if (detected.metAcidosisWagma) {
    components.push(
      t(lang, "High-AG Metabolic Acidosis (WAGMA)", "Toan chuyển hóa tăng AG (WAGMA)")
    );
  }
  if (detected.metAcidosisNagma) {
    components.push(
      t(lang, "Normal-AG Metabolic Acidosis (NAGMA)", "Toan chuyển hóa AG bình thường (NAGMA)")
    );
  }
  if (detected.metAlkalosis) {
    components.push(t(lang, "Metabolic Alkalosis", "Kiềm chuyển hóa"));
  }
  if (detected.respAcidosis !== "none") {
    const sub =
      detected.respAcidosis === "chronic"
        ? t(lang, "Chronic", "Mạn tính")
        : detected.respAcidosis === "acute_on_chronic"
          ? t(lang, "Acute-on-Chronic", "Cấp trên nền mạn")
          : t(lang, "Acute", "Cấp tính");
    components.push(
      t(lang, `Respiratory Acidosis (${sub})`, `Toan hô hấp (${sub})`)
    );
  }
  if (detected.respAlkalosis !== "none") {
    const sub =
      detected.respAlkalosis === "chronic"
        ? t(lang, "Chronic", "Mạn tính")
        : t(lang, "Acute", "Cấp tính");
    components.push(
      t(lang, `Respiratory Alkalosis (${sub})`, `Kiềm hô hấp (${sub})`)
    );
  }

  // Classify disorderType
  const hasAcid =
    detected.metAcidosisUnspecified ||
    detected.metAcidosisWagma ||
    detected.metAcidosisNagma ||
    detected.respAcidosis !== "none";
  const hasAlk = detected.metAlkalosis || detected.respAlkalosis !== "none";

  let disorderType: BloodGasEvaluation["summary"]["disorderType"] = "normal";
  let patternTag = t(lang, "NORMAL ACID-BASE", "TOAN KIỀM BÌNH THƯỜNG");
  let primaryLabel = t(lang, "Normal Acid-Base Balance", "Thăng bằng Toan - Kiềm Bình thường");
  let tone: ClinicalSeverity = "ok";

  if (components.length >= 3) {
    disorderType = "triple";
    patternTag = t(lang, "TRIPLE DISORDER", "RỐI LOẠN BA (TRIPLE)");
    primaryLabel = components.join(" + ");
    tone = "danger";
  } else if (components.length === 2) {
    if (hasAcid && hasAlk) {
      disorderType = "mixed_counterbalancing";
      patternTag = t(lang, "MIXED · COUNTERBALANCING", "HỖN HỢP ĐỐI LẬP");
    } else {
      disorderType = "mixed_additive";
      patternTag = t(lang, "MIXED · ADDITIVE", "HỖN HỢP CÙNG CHIỀU");
    }
    primaryLabel = components.join(" + ");
    tone =
      inputs.ph < 7.25 || inputs.ph > 7.55 || disorderType === "mixed_additive"
        ? "danger"
        : "warning";
  } else if (components.length === 1) {
    if (phStatus === "normal") {
      disorderType = "compensated";
      patternTag = t(lang, "COMPENSATED DISORDER", "RỐI LOẠN ĐÃ BÙ TRỪ");
      primaryLabel = `${components[0]} (${t(lang, "Compensated", "Đã bù trừ")})`;
      tone = "info";
    } else {
      disorderType = "simple";
      patternTag = t(lang, "SIMPLE DISORDER", "RỐI LOẠN ĐƠN THUẦN");
      primaryLabel = components[0];
      tone =
        inputs.ph < 7.25 || inputs.ph > 7.55
          ? "danger"
          : "warning";
    }
  }

  const summaryNotes: string[] = [];
  if (!step1.isConsistent) {
    disorderType = "invalid_sample";
    patternTag = t(
      lang,
      "DATA MISMATCH · VERIFY SAMPLE",
      "SAI LỆCH SỐ LIỆU · KIỂM TRA MẪU"
    );
    summaryNotes.push(
      t(
        lang,
        "Unverified — Check lab values / transcription (Kassirer-Bleich mismatch).",
        "Chưa xác thực — Kiểm tra lại số liệu xét nghiệm (sai lệch Kassirer-Bleich)."
      )
    );
    tone = "danger";
  } else if (respiratoryFailureType !== "none" && respiratoryFailureType !== "vbg_na" && tone === "ok") {
    tone = "warning";
  }
  if (detected.metAcidosisUnspecified) {
    summaryNotes.push(
      t(
        lang,
        "Anion Gap pending — enter Na+ and Cl- to classify WAGMA vs NAGMA.",
        "Chưa có Anion Gap — nhập Na+ và Cl- để phân biệt WAGMA vs NAGMA."
      )
    );
  }

  const hasMet =
    detected.metAcidosisUnspecified ||
    detected.metAcidosisWagma ||
    detected.metAcidosisNagma ||
    detected.metAlkalosis;
  const hasResp =
    detected.respAcidosis !== "none" || detected.respAlkalosis !== "none";
  const track: BloodGasEvaluation["summary"]["track"] =
    hasMet && hasResp
      ? "mixed"
      : hasMet
        ? "metabolic"
        : hasResp
          ? "respiratory"
          : "normal";

  step34Bullets.unshift(
    t(
      lang,
      `pH ${inputs.ph.toFixed(2)} (${phStatus}), PaCO2 ${inputs.pco2MmHg.toFixed(1)} mmHg, HCO3- ${hco3.toFixed(1)} mEq/L · Direction rule: ${directionRule === "same" ? "Same direction (compensated or counterbalancing)" : directionRule === "opposite" ? "Opposite directions (confirms mixed disorder)" : "Single or normal"}.`,
      `pH ${inputs.ph.toFixed(2)} (${phStatus === "acidemia" ? "Toan máu" : phStatus === "alkalemia" ? "Kiềm máu" : "Bình thường"}), PaCO2 ${inputs.pco2MmHg.toFixed(1)} mmHg, HCO3- ${hco3.toFixed(1)} mEq/L · Quy tắc chiều: ${directionRule === "same" ? "Cùng chiều" : directionRule === "opposite" ? "Ngược chiều (chắc chắn hỗn hợp)" : "Đơn lẻ/Bình thường"}.`
    )
  );
  if (deltaHRef.value) {
    step34Bullets.push(deltaHRef.value.note);
  }
  for (const chk of compensationChecks) {
    step34Bullets.push(`${chk.formulaName}: ${chk.interpretation}`);
  }

  // Red Flags
  const redFlags: RedFlagItem[] = [];
  if (!step1.isConsistent) {
    redFlags.push({
      id: "inconsistent-abg",
      severity: "danger",
      title: t(
        lang,
        "Internal Consistency Mismatch (Kassirer-Bleich)",
        "Sai lệch Tính nhất quán Nội tại (Kassirer-Bleich)"
      ),
      detail: t(
        lang,
        `Calculated [H+] = ${step1.hPlusCalc.toFixed(1)} nmol/L (predicted pH ${step1.predictedPh.toFixed(2)}) vs measured pH ${inputs.ph.toFixed(2)} (${step1.hPlusPctDiff.toFixed(1)}% diff). Verify transcription or repeat sample.`,
        `[H+] tính toán = ${step1.hPlusCalc.toFixed(1)} nmol/L (pH dự đoán ${step1.predictedPh.toFixed(2)}) lệch so với pH thực tế ${inputs.ph.toFixed(2)} (${step1.hPlusPctDiff.toFixed(1)}%). Kiểm tra lại nhập liệu hoặc lấy lại mẫu.`
      ),
    });
  }
  if (inputs.ph < 7.2) {
    redFlags.push({
      id: "severe-acidemia",
      severity: "danger",
      title: t(lang, "Severe Acidemia (pH < 7.20)", "Toan máu nặng (pH < 7.20)"),
      detail: t(
        lang,
        `pH ${inputs.ph.toFixed(2)} carries high risk of myocardial depression, arrhythmias, and catecholamine resistance.`,
        `pH ${inputs.ph.toFixed(2)} có nguy cơ cao ức chế cơ tim, loạn nhịp và kháng catecholamine.`
      ),
    });
  } else if (inputs.ph < 7.25) {
    redFlags.push({
      id: "mod-severe-acidemia",
      severity: "warning",
      title: t(lang, "Significant Acidemia (pH 7.20–7.24)", "Toan máu đáng kể (pH 7.20–7.24)"),
      detail: t(
        lang,
        `pH ${inputs.ph.toFixed(2)} requires urgent etiology-directed therapy and close serial monitoring.`,
        `pH ${inputs.ph.toFixed(2)} cần xử trí nguyên nhân khẩn trương và theo dõi sát.`
      ),
    });
  }
  if (inputs.ph > 7.6) {
    redFlags.push({
      id: "severe-alkalemia",
      severity: "danger",
      title: t(lang, "Severe Alkalemia (pH > 7.60)", "Kiềm máu nặng (pH > 7.60)"),
      detail: t(
        lang,
        `pH ${inputs.ph.toFixed(2)} carries risk of cerebral/coronary vasoconstriction, seizures, tetany, and arrhythmias.`,
        `pH ${inputs.ph.toFixed(2)} có nguy cơ co mạch não/mạch vành, co giật, tetany và loạn nhịp.`
      ),
    });
  }
  if (inputs.sampleType === "abg" && inputs.po2MmHg !== null && inputs.po2MmHg < 60) {
    redFlags.push({
      id: "hypoxemia",
      severity: "danger",
      title:
        inputs.po2MmHg < 40
          ? t(lang, "Life-Threatening Hypoxemia (PaO2 < 40 mmHg)", "Giảm Oxy máu Đe dọa tính mạng (PaO2 < 40 mmHg)")
          : t(lang, "Severe Hypoxemia (PaO2 < 60 mmHg)", "Giảm Oxy máu nặng (PaO2 < 60 mmHg)"),
      detail: t(
        lang,
        `PaO2 ${inputs.po2MmHg.toFixed(1)} mmHg on the steep Hb-O2 dissociation curve — escalate oxygen/respiratory support immediately.`,
        `PaO2 ${inputs.po2MmHg.toFixed(1)} mmHg nằm trên đoạn dốc đường cong phân ly Hb-O2 — cần tăng hỗ trợ oxy/hô hấp ngay.`
      ),
    });
  }
  if (inputs.pco2MmHg > 45 && inputs.ph < 7.35 && (inputs.pco2MmHg > 60 || inputs.ph < 7.25)) {
    redFlags.push({
      id: "hypercapnic-exhaustion",
      severity: "danger",
      title: t(
        lang,
        "Acute Hypercapnic Acidemia — Impending Exhaustion Risk",
        "Toan hô hấp cấp nặng — Nguy cơ Kiệt sức Cơ hô hấp"
      ),
      detail: t(
        lang,
        `PaCO2 ${inputs.pco2MmHg.toFixed(1)} mmHg with pH ${inputs.ph.toFixed(2)}: assess airway, consciousness, and need for NIV or intubation.`,
        `PaCO2 ${inputs.pco2MmHg.toFixed(1)} mmHg kèm pH ${inputs.ph.toFixed(2)}: đánh giá đường thở, tri giác và chỉ định thở máy NIV hoặc đặt NKQ.`
      ),
    });
  }
  const winterUpperForRedFlag = 1.5 * hco3 + 8 + 2;
  if (
    (detected.metAcidosisWagma ||
      detected.metAcidosisNagma ||
      detected.metAcidosisUnspecified) &&
    (hco3 < 15 || inputs.ph < 7.25) &&
    inputs.pco2MmHg > winterUpperForRedFlag
  ) {
    redFlags.push({
      id: "inadequate-met-acid-comp",
      severity: "danger",
      title: t(
        lang,
        "Inadequate Respiratory Compensation in Severe Metabolic Acidosis",
        "Bù trừ Hô hấp Không đủ trong Toan chuyển hóa nặng"
      ),
      detail: t(
        lang,
        `PaCO2 ${inputs.pco2MmHg.toFixed(1)} mmHg exceeds Winter's upper bound (${winterUpperForRedFlag.toFixed(1)} mmHg) despite severe acidemia — suspect respiratory muscle exhaustion or insufficient ventilator minute ventilation.`,
        `PaCO2 ${inputs.pco2MmHg.toFixed(1)} mmHg vượt giới hạn trên Winter (${winterUpperForRedFlag.toFixed(1)} mmHg) dù toan máu nặng — cảnh giác kiệt sức cơ hô hấp hoặc cài đặt thông khí phút máy thở chưa đủ.`
      ),
    });
  }
  if (inputs.k !== null && (inputs.k < 3.0 || inputs.k >= 6.0)) {
    redFlags.push({
      id: "critical-potassium",
      severity: "danger",
      title: t(
        lang,
        `Critical Dyskalemia (K+ = ${inputs.k.toFixed(1)} mmol/L)`,
        `Rối loạn Kali máu Nguy kịch (K+ = ${inputs.k.toFixed(1)} mmol/L)`
      ),
      detail: t(
        lang,
        "Obtain immediate 12-lead ECG and initiate cardiac membrane stabilization / targeted potassium correction.",
        "Đo ECG 12 chuyển đạo ngay và xử trí bảo vệ màng tế bào cơ tim / điều chỉnh Kali khẩn."
      ),
    });
  }
  if (step2.cao2MlDl !== null && step2.cao2MlDl < 12) {
    redFlags.push({
      id: "low-cao2",
      severity: "danger",
      title: t(
        lang,
        `Critically Low O2 Content (CaO2 = ${step2.cao2MlDl.toFixed(1)} mL/dL)`,
        `Hàm lượng Oxy máu Giảm nặng (CaO2 = ${step2.cao2MlDl.toFixed(1)} mL/dL)`
      ),
      detail: t(
        lang,
        "Severe tissue oxygen delivery deficit; evaluate for acute hemorrhage/anemia or dyshemoglobinemia.",
        "Giảm nặng cung cấp oxy mô; kiểm tra thiếu máu cấp hoặc ngộ độc CO/MetHb."
      ),
    });
  }
  if (inputs.lactate !== null && inputs.lactate >= 4.0) {
    redFlags.push({
      id: "high-lactate",
      severity: inputs.lactate >= 5.0 ? "danger" : "warning",
      title:
        inputs.lactate >= 5.0
          ? t(lang, `Lactic Acidosis (Lactate ${inputs.lactate.toFixed(1)} mmol/L ≥ 5)`, `Toan Lactic (Lactate ${inputs.lactate.toFixed(1)} mmol/L ≥ 5)`)
          : t(lang, `Markedly Elevated Lactate (${inputs.lactate.toFixed(1)} mmol/L)`, `Tăng Lactate máu đáng kể (${inputs.lactate.toFixed(1)} mmol/L)`),
      detail: t(
        lang,
        "Evaluate perfusion/sepsis (Type A), drugs/liver failure (Type B), and D-lactate if unexplained.",
        "Đánh giá tưới máu/sepsis (Type A), thuốc/suy gan (Type B) và D-lactate nếu chưa rõ nguyên nhân."
      ),
    });
  }
  if (step5.osmolalGap !== null && step5.osmolalGap > 10) {
    redFlags.push({
      id: "high-osm-gap",
      severity: step5.osmolalGap > 15 ? "danger" : "warning",
      title: t(
        lang,
        `Elevated Osmolal Gap (${step5.osmolalGap.toFixed(1)} mOsm/kg)`,
        `Tăng Osmolal Gap (${step5.osmolalGap.toFixed(1)} mOsm/kg)`
      ),
      detail: t(
        lang,
        "Suspect toxic alcohol ingestion (Methanol, Ethylene glycol); consider urgent fomepizole/ethanol & nephrology consult.",
        "Nghi ngờ ngộ độc rượu độc (Methanol, Ethylene glycol); cân nhắc giải độc đặc hiệu & lọc máu cấp cứu."
      ),
    });
  }

  const clinicalGuidance = buildClinicalGuidance(detected, step5, inputs, lang);

  return {
    effectiveHco3: hco3,
    hco3EstimatedFromTco2: estimatedFromTco2,
    summary: {
      tone,
      primaryLabel,
      notes: summaryNotes,
      patternTag,
      disorderType,
      components,
      gasExchangeLabel,
      respiratoryFailureType,
      track,
    },
    step1,
    step2,
    step3and4: {
      phStatus,
      directionRule,
      compensationChecks,
      deltaHOverDeltaPco2: deltaHRef.value,
      detectedDisorders: detected,
      bullets: step34Bullets,
    },
    step5,
    redFlags,
    clinicalGuidance,
  };
}

export function formatBloodGasReport(
  inputs: BloodGasInputs,
  ev: BloodGasEvaluation,
  lang: BloodGasLang = "en"
): string {
  const lines: string[] = [];
  const sampleLabel = SAMPLE_REFERENCE_RANGES[inputs.sampleType];
  lines.push(
    lang === "vi"
      ? "=== PHÂN TÍCH KHÍ MÁU & TOAN KIỀM (6 BƯỚC) ==="
      : "=== BLOOD GAS & ACID-BASE INTERPRETATION (6-STEP) ==="
  );
  lines.push(
    `${lang === "vi" ? "Loại mẫu" : "Sample"}: ${lang === "vi" ? sampleLabel.labelVi : sampleLabel.labelEn} | pH ${inputs.ph.toFixed(2)} | PCO2 ${inputs.pco2MmHg.toFixed(1)} mmHg | HCO3- ${ev.effectiveHco3.toFixed(1)} mEq/L${inputs.po2MmHg !== null ? ` | PO2 ${inputs.po2MmHg.toFixed(1)} mmHg (FiO2 ${inputs.fio2Pct}%)` : ""}`
  );
  lines.push("");
  lines.push(
    `${lang === "vi" ? "1. KẾT LUẬN" : "1. CONCLUSION"}: [${ev.summary.patternTag}] ${ev.summary.primaryLabel}`
  );
  lines.push(
    `${lang === "vi" ? "   Trao đổi khí" : "   Gas Exchange"}: ${ev.summary.gasExchangeLabel}`
  );
  lines.push("");
  lines.push(
    lang === "vi"
      ? "2. CHI TIẾT PHÂN TÍCH:"
      : "2. STEPWISE DETAILS:"
  );
  lines.push(
    `   - [H+] calc ${ev.step1.hPlusCalc.toFixed(1)} vs meas ${ev.step1.hPlusMeasured.toFixed(1)} nmol/L (${ev.step1.isConsistent ? "Consistent" : "MISMATCH"})`
  );
  if (!ev.step2.isVbg && ev.step2.pfRatio !== null) {
    lines.push(
      `   - P/F: ${ev.step2.pfRatio.toFixed(0)} | A-aDO2: ${ev.step2.aaGradientMmHg?.toFixed(1) ?? "—"} mmHg`
    );
  }
  for (const b of ev.step3and4.bullets) {
    lines.push(`   - ${b}`);
  }
  for (const b of ev.step5.bullets) {
    lines.push(`   - ${b}`);
  }
  if (ev.redFlags.length > 0) {
    lines.push("");
    lines.push(lang === "vi" ? "3. CẢNH BÁO NGUY CẤP:" : "3. RED FLAGS:");
    for (const rf of ev.redFlags) {
      lines.push(`   ! ${rf.title}: ${rf.detail}`);
    }
  }
  if (ev.clinicalGuidance.recommendedWorkup.length > 0) {
    lines.push("");
    lines.push(
      lang === "vi" ? "4. ĐỀ XUẤT CẬN LÂM SÀNG:" : "4. RECOMMENDED WORKUP:"
    );
    for (const w of ev.clinicalGuidance.recommendedWorkup) {
      lines.push(`   - ${w}`);
    }
  }
  return lines.join("\n");
}
