import {
  TIMEPOINT_CONFIGS,
  type ClinicalSeverity,
  type InsulinLang,
  type InsulinMode,
  type InsulinTimepoint,
  type SyndromeLock,
  t,
} from "./insulinI18n.ts";

export interface InsulinInputs {
  mode: InsulinMode;
  tp: InsulinTimepoint;
  bgMgDl: number;
  weight: number;
  isNaive: boolean;
  doseMorn: number;
  doseEve: number;
  isHighRisk: boolean;
  k: number;
  na: number;
  ureaMmol: number;
  ph: number;
  hco3: number;
  ketone: number;
  lockedSyndrome: SyndromeLock;
  isPlateau: boolean;
  isEuglycemicAllowed: boolean;
  isLowSbp: boolean;
  hasOliguria: boolean;
  hasCHF: boolean;
}

export interface ShiftSnapshot {
  id: string;
  timeLabel: string;
  mode: InsulinMode;
  tp: InsulinTimepoint;
  shortTime: string;
  tpLabel: string;
  clockHour?: number;
  dkaHour?: number;
  bgMgDl: number;
  novomix: number;
  actrapid: number;
  ivRate: number;
  ketone: number | null;
  osmTotal: number | null;
}

export interface DetailSection {
  primaryText: string;
  bullets: string[];
  detailsTitle?: string;
  detailSteps?: string[];
  badge?: string;
  tone: ClinicalSeverity;
}

export interface TimelineEvent {
  time: string;
  desc: string;
  critical: boolean;
}

export interface WarningBanner {
  severity: "danger" | "warning";
  title: string;
  items: string[];
}

export interface IobCalculation {
  activeUnits: number;
  actrapidRem: number;
  novomixRapidRem: number;
  protaminePeakWarning: boolean;
}

export interface TrajectoryAnalysis {
  hasPrior: boolean;
  lastSnap: ShiftSnapshot | null;
  lastShortTime: string;
  lastTimeStr: string;
  lastBg: number;
  lastKetone: number | null;
  lastOsm: number | null;
  lastNovomix: number;
  lastActrapid: number;
  lastIvRate: number;
  deltaHours: number;
  deltaBg: number;
  deltaMmol: number;
  rateBgPerHour: number;
  rateMmolPerHour: number;
  rateKetonePerHour: number | null;
  rateOsmPerHour: number | null;
  iob: IobCalculation;
  isf: number;
  expectedFurtherDrop: number;
  projectedBg2h: number;
  safeFloor: number;
  isRapidDrop: boolean;
  isVeryRapidDrop: boolean;
  isRisingFast: boolean;
  isRateInducedHypoRisk: boolean;
  isIobInducedHypoRisk: boolean;
  hasImpendingHypoRisk: boolean;
  isStackingRisk: boolean;
  hadRecentHypo: boolean;
  recentHypoLabel: string;
  recentHypoBg: number;
}

export interface ParamStatusPill {
  tone: ClinicalSeverity;
  label: string;
}

export interface ParameterVisualStates {
  isBgHi: boolean;
  bg: ParamStatusPill;
  k: ParamStatusPill;
  na: ParamStatusPill;
  urea: ParamStatusPill;
  ph: ParamStatusPill;
  hco3: ParamStatusPill;
  ketone: ParamStatusPill;
}

export interface InpatientEvaluation {
  kind: "inpatient";
  status: {
    tone: ClinicalSeverity;
    tag: string;
    title: string;
  };
  effectiveTdd: number;
  rawTdd: number;
  isf: number;
  traj: TrajectoryAnalysis;
  warningBanner: WarningBanner | null;
  medicationOrder: DetailSection;
  nutritionPlan: DetailSection;
  timeline: TimelineEvent[];
  regimenAdjustment: DetailSection;
  suggestedActrapid: number;
  suggestedNovomix: number;
}

export interface NonDkaFallback {
  code: string;
  tone: ClinicalSeverity;
  badge: string;
  title: string;
  section: DetailSection;
  showSwitchTo18h: boolean;
}

export interface DkaEvaluation {
  kind: "dka";
  status: {
    tone: ClinicalSeverity;
    tag: string;
    title: string;
  };
  activeSyndrome: "DKA" | "HHS" | "MIXED" | "NON_DKA";
  classifiedSyndrome: "DKA" | "HHS" | "MIXED" | "NON_DKA";
  nonDkaFallback: NonDkaFallback | null;
  isResolved: boolean;
  indices: {
    bgMmol: number;
    naCorr: number;
    osmEff: number;
    osmTotal: number;
    classificationLabel: string;
  };
  traj: TrajectoryAnalysis;
  warningBanner: WarningBanner | null;
  axes: {
    fluids: DetailSection;
    potassiumAcidBase: DetailSection;
    insulin: DetailSection;
    monitoringTransition: DetailSection;
  } | null;
  suggestedIvRate: number;
}

export type InsulinEvaluation = InpatientEvaluation | DkaEvaluation;

export function createDefaultInsulinInputs(): InsulinInputs {
  return {
    mode: "06h",
    tp: "t0",
    bgMgDl: 180,
    weight: 60,
    isNaive: false,
    doseMorn: 14,
    doseEve: 10,
    isHighRisk: false,
    k: 4.0,
    na: 135,
    ureaMmol: 8.0,
    ph: 7.15,
    hco3: 12.0,
    ketone: 4.2,
    lockedSyndrome: "auto",
    isPlateau: false,
    isEuglycemicAllowed: false,
    isLowSbp: false,
    hasOliguria: false,
    hasCHF: false,
  };
}

export function getEffectiveTddAndIsf(inputs: InsulinInputs): {
  rawTdd: number;
  effectiveTdd: number;
  isf: number;
} {
  const rawTdd = inputs.isNaive ? 0 : inputs.doseMorn + inputs.doseEve;
  const estNaiveTdd = Math.max(
    6,
    Math.round(inputs.weight * (inputs.isHighRisk ? 0.2 : 0.4))
  );
  const effectiveTdd = inputs.isNaive ? estNaiveTdd : rawTdd;
  const isf = Math.round(1700 / Math.max(12, effectiveTdd || 30));
  return { rawTdd, effectiveTdd, isf };
}

export function computeAutoElapsedHours(
  mode: InsulinMode,
  tp: InsulinTimepoint,
  snapshots: ShiftSnapshot[],
  lang: InsulinLang = "en"
): { deltaHours: number; hint: string } {
  const list = TIMEPOINT_CONFIGS[mode];
  const currentObj = list.find((x) => x.id === tp) ?? list[0];

  if (!snapshots || snapshots.length === 0) {
    return {
      deltaHours: currentObj.defaultDeltaH || 1.0,
      hint: t(
        lang,
        "No prior checkpoint in shift log.",
        "Chưa có mốc lưu trước đó trong nhật ký."
      ),
    };
  }

  const last = snapshots[0];
  let computedDelta = currentObj.defaultDeltaH || 1.0;
  let hint = "";

  if (
    typeof currentObj.clockHour === "number" &&
    typeof last.clockHour === "number"
  ) {
    const diff = (currentObj.clockHour - last.clockHour + 24) % 24;
    if (diff === 0) {
      computedDelta = 1.0;
      hint = t(
        lang,
        `Same checkpoint as last log (${currentObj.shortTime}): default Δt = 1h (editable).`,
        `Đang ở cùng mốc vừa lưu (${currentObj.shortTime}): mặc định Δt = 1 giờ (có thể chỉnh tay).`
      );
    } else {
      computedDelta = Math.round(diff * 10) / 10;
      hint = t(
        lang,
        `Auto-computed: ${currentObj.shortTime} minus prior (${last.shortTime}) = ${computedDelta}h.`,
        `Tự động tính: mốc hiện tại (${currentObj.shortTime}) trừ mốc trước (${last.shortTime}) = ${computedDelta} giờ.`
      );
    }
  } else if (
    typeof currentObj.dkaHour === "number" &&
    typeof last.dkaHour === "number"
  ) {
    const dkaDiff = currentObj.dkaHour - last.dkaHour;
    computedDelta = dkaDiff > 0 ? dkaDiff : 1.0;
    hint = t(
      lang,
      `Auto-computed DKA/HHS interval: ${last.shortTime} → ${currentObj.shortTime} = ${computedDelta}h.`,
      `Tự động tính theo phác đồ DKA/HHS: ${last.shortTime} → ${currentObj.shortTime} = ${computedDelta} giờ.`
    );
  } else {
    hint = t(
      lang,
      `Mode switched from prior (${last.shortTime}): default ${computedDelta}h (editable).`,
      `Chuyển chế độ từ mốc trước (${last.shortTime}): mặc định ${computedDelta} giờ (có thể chỉnh tay).`
    );
  }

  return { deltaHours: computedDelta, hint };
}

export function adjustDoseWithGuarantee(
  baseDose: number,
  factor: number,
  direction: "up" | "down"
): number {
  if (baseDose <= 0) return 0;
  let raw = Math.round(baseDose * factor);
  if (direction === "down" && raw >= baseDose) {
    raw = Math.max(1, baseDose - 1);
  } else if (direction === "up" && raw <= baseDose) {
    raw = baseDose + 1;
  }
  return raw;
}

export function calculateActiveIob(
  lastSnap: ShiftSnapshot | null,
  deltaHours: number
): IobCalculation {
  const protaminePeakWarning = Boolean(
    lastSnap &&
      (lastSnap.novomix || 0) >= 8 &&
      deltaHours >= 3.5 &&
      deltaHours <= 8.5
  );

  if (!lastSnap || deltaHours <= 0 || deltaHours > 6.0) {
    return {
      activeUnits: 0,
      actrapidRem: 0,
      novomixRapidRem: 0,
      protaminePeakWarning,
    };
  }

  let actFactor = 0;
  if (deltaHours <= 1.0) actFactor = 0.85;
  else if (deltaHours <= 2.0) actFactor = 0.65;
  else if (deltaHours <= 3.0) actFactor = 0.45;
  else if (deltaHours <= 4.0) actFactor = 0.25;
  else if (deltaHours <= 5.0) actFactor = 0.1;

  const rapidAspartUnits = (lastSnap.novomix || 0) * 0.3;
  let aspFactor = 0;
  if (deltaHours <= 1.0) aspFactor = 0.75;
  else if (deltaHours <= 2.0) aspFactor = 0.45;
  else if (deltaHours <= 3.0) aspFactor = 0.2;
  else if (deltaHours <= 4.0) aspFactor = 0.05;

  const actRem = (lastSnap.actrapid || 0) * actFactor;
  const novoRapidRem = rapidAspartUnits * aspFactor;
  const totalRapidIob = Math.round((actRem + novoRapidRem) * 10) / 10;

  return {
    activeUnits: totalRapidIob,
    actrapidRem: Math.round(actRem * 10) / 10,
    novomixRapidRem: Math.round(novoRapidRem * 10) / 10,
    protaminePeakWarning,
  };
}

export function evaluateContextualTrajectory(
  inputs: InsulinInputs,
  snapshots: ShiftSnapshot[],
  deltaHoursRaw: number
): TrajectoryAnalysis {
  const { effectiveTdd, isf } = getEffectiveTddAndIsf(inputs);
  const deltaHours = Math.max(0.25, Math.min(24.0, deltaHoursRaw || 1.0));

  if (!snapshots || snapshots.length === 0) {
    return {
      hasPrior: false,
      lastSnap: null,
      lastShortTime: "",
      lastTimeStr: "",
      lastBg: 0,
      lastKetone: 0,
      lastOsm: 0,
      lastNovomix: 0,
      lastActrapid: 0,
      lastIvRate: 0,
      deltaHours,
      deltaBg: 0,
      deltaMmol: 0,
      rateBgPerHour: 0,
      rateMmolPerHour: 0,
      rateKetonePerHour: null,
      rateOsmPerHour: null,
      iob: {
        activeUnits: 0,
        actrapidRem: 0,
        novomixRapidRem: 0,
        protaminePeakWarning: false,
      },
      isf,
      expectedFurtherDrop: 0,
      projectedBg2h: inputs.bgMgDl,
      safeFloor: 105,
      isRapidDrop: false,
      isVeryRapidDrop: false,
      isRisingFast: false,
      isRateInducedHypoRisk: false,
      isIobInducedHypoRisk: false,
      hasImpendingHypoRisk: false,
      isStackingRisk: false,
      hadRecentHypo: false,
      recentHypoLabel: "",
      recentHypoBg: 0,
    };
  }

  const last = snapshots[0];
  const deltaBg = inputs.bgMgDl - last.bgMgDl;
  const deltaMmol = deltaBg / 18.0;
  const rateBgPerHour = deltaBg / deltaHours;
  const rateMmolPerHour = deltaMmol / deltaHours;

  const currentOsm = 2 * inputs.na + inputs.bgMgDl / 18.0 + inputs.ureaMmol;
  const rateKetonePerHour =
    last.mode === "dka" && typeof last.ketone === "number"
      ? (inputs.ketone - last.ketone) / deltaHours
      : null;
  const rateOsmPerHour =
    last.mode === "dka" && typeof last.osmTotal === "number"
      ? (currentOsm - last.osmTotal) / deltaHours
      : null;

  const iob = calculateActiveIob(last, deltaHours);
  const hadActiveInsulin =
    last.novomix > 0 || last.actrapid > 0 || last.ivRate > 0;
  const isWithinIobWindow = deltaHours <= 5.0;

  const isRapidDrop = rateBgPerHour <= -50.0;
  const isVeryRapidDrop = rateBgPerHour <= -65.0;
  const isRisingFast =
    rateBgPerHour >= 35.0 || (deltaBg >= 80 && rateBgPerHour >= 20.0);

  const estDropFromIob = Math.round(iob.activeUnits * isf * 0.65);
  const estDropFromMomentum = isRapidDrop
    ? Math.round(Math.abs(rateBgPerHour) * 1.15)
    : 0;
  const expectedFurtherDrop = Math.max(estDropFromIob, estDropFromMomentum);
  const projectedBg2h = Math.max(30, inputs.bgMgDl - expectedFurtherDrop);

  const isNightSlot =
    inputs.mode === "18h" && (inputs.tp === "t2" || inputs.tp === "t4");
  const safeFloor = isNightSlot ? 130 : 105;

  const isIobInducedHypoRisk =
    inputs.bgMgDl >= 100 &&
    inputs.bgMgDl <= 190 &&
    iob.activeUnits >= 1.2 &&
    projectedBg2h < safeFloor;
  const isRateInducedHypoRisk =
    inputs.bgMgDl >= 100 &&
    inputs.bgMgDl <= 240 &&
    isRapidDrop &&
    (inputs.bgMgDl <= 210 || projectedBg2h < safeFloor);
  const hasImpendingHypoRisk = isRateInducedHypoRisk || isIobInducedHypoRisk;

  const isStackingRisk =
    (isWithinIobWindow && isRapidDrop && hadActiveInsulin) ||
    iob.activeUnits >= 1.5;

  let hadRecentHypo = false;
  let recentHypoLabel = "";
  let recentHypoBg = 0;
  for (let i = 0; i < Math.min(snapshots.length, 3); i++) {
    if (snapshots[i].bgMgDl < 70) {
      hadRecentHypo = true;
      recentHypoLabel = `${snapshots[i].shortTime} (${snapshots[i].timeLabel})`;
      recentHypoBg = snapshots[i].bgMgDl;
      break;
    }
  }

  void effectiveTdd;

  return {
    hasPrior: true,
    lastSnap: last,
    lastShortTime: last.shortTime || last.tpLabel,
    lastTimeStr: last.timeLabel,
    lastBg: last.bgMgDl,
    lastKetone: last.ketone,
    lastOsm: last.osmTotal,
    lastNovomix: last.novomix,
    lastActrapid: last.actrapid,
    lastIvRate: last.ivRate,
    deltaHours,
    deltaBg,
    deltaMmol,
    rateBgPerHour,
    rateMmolPerHour,
    rateKetonePerHour,
    rateOsmPerHour,
    iob,
    isf,
    expectedFurtherDrop,
    projectedBg2h,
    safeFloor,
    isRapidDrop,
    isVeryRapidDrop,
    isRisingFast,
    isRateInducedHypoRisk,
    isIobInducedHypoRisk,
    hasImpendingHypoRisk,
    isStackingRisk,
    hadRecentHypo,
    recentHypoLabel,
    recentHypoBg,
  };
}

export function getParameterVisualStates(
  inputs: InsulinInputs,
  lang: InsulinLang
): ParameterVisualStates {
  const bg = inputs.bgMgDl;
  const isBgHi = bg >= 800;

  let bgPill: ParamStatusPill;
  if (bg < 54) {
    bgPill = {
      tone: "danger",
      label: t(lang, "CRITICAL LOW (<54)", "QUÁ THẤP NGUY KỊCH (<54)"),
    };
  } else if (bg < 70) {
    bgPill = {
      tone: "danger",
      label: t(lang, "HYPOGLYCEMIA (<70)", "HẠ ĐƯỜNG HUYẾT (<70)"),
    };
  } else if (bg <= 180) {
    bgPill = {
      tone: "ok",
      label: t(lang, "IN TARGET (70–180)", "TRONG MỤC TIÊU (70–180)"),
    };
  } else if (bg <= 249) {
    bgPill = {
      tone: "warning",
      label: t(lang, "MODERATE HIGH (181–249)", "TĂNG VỪA (181–249)"),
    };
  } else if (bg < 600) {
    bgPill = {
      tone: "danger",
      label: t(lang, "HIGH (≥250)", "TĂNG CAO (≥250)"),
    };
  } else if (bg < 800) {
    bgPill = {
      tone: "danger",
      label: t(lang, "VERY HIGH (≥600)", "QUÁ CAO (≥600)"),
    };
  } else {
    bgPill = {
      tone: "danger",
      label: t(lang, "HI - OUT OF RANGE (≥800)", "HI - VƯỢT NGƯỠNG (≥800)"),
    };
  }

  let kPill: ParamStatusPill;
  if (inputs.k < 3.0) {
    kPill = {
      tone: "danger",
      label: t(lang, "CRITICAL LOW (<3.0)", "QUÁ THẤP NGUY KỊCH (<3.0)"),
    };
  } else if (inputs.k < 3.5) {
    kPill = {
      tone: "danger",
      label: t(lang, "HYPOKALEMIA (<3.5)", "HẠ KALI (<3.5)"),
    };
  } else if (inputs.k <= 5.0) {
    kPill = {
      tone: "ok",
      label: t(lang, "NORMAL (3.5–5.0)", "BÌNH THƯỜNG (3.5–5.0)"),
    };
  } else if (inputs.k < 6.0) {
    kPill = {
      tone: "warning",
      label: t(lang, "HYPERKALEMIA (5.1–5.9)", "TĂNG KALI (5.1–5.9)"),
    };
  } else {
    kPill = {
      tone: "danger",
      label: t(lang, "CRITICAL HIGH (≥6.0)", "QUÁ CAO NGUY KỊCH (≥6.0)"),
    };
  }

  let naPill: ParamStatusPill;
  if (inputs.na < 125) {
    naPill = {
      tone: "danger",
      label: t(lang, "CRITICAL LOW (<125)", "QUÁ THẤP (<125)"),
    };
  } else if (inputs.na < 135) {
    naPill = {
      tone: "warning",
      label: t(lang, "HYPONATREMIA (<135)", "HẠ NATRI (<135)"),
    };
  } else if (inputs.na <= 145) {
    naPill = {
      tone: "ok",
      label: t(lang, "NORMAL (135–145)", "BÌNH THƯỜNG (135–145)"),
    };
  } else if (inputs.na <= 155) {
    naPill = {
      tone: "warning",
      label: t(lang, "HYPERNATREMIA (146–155)", "TĂNG NATRI (146–155)"),
    };
  } else {
    naPill = {
      tone: "danger",
      label: t(lang, "CRITICAL HIGH (>155)", "QUÁ CAO (>155)"),
    };
  }

  let ureaPill: ParamStatusPill;
  if (inputs.ureaMmol < 2.5) {
    ureaPill = {
      tone: "warning",
      label: t(lang, "LOW (<2.5)", "THẤP (<2.5)"),
    };
  } else if (inputs.ureaMmol <= 7.5) {
    ureaPill = {
      tone: "ok",
      label: t(lang, "NORMAL (2.5–7.5)", "BÌNH THƯỜNG (2.5–7.5)"),
    };
  } else if (inputs.ureaMmol < 20.0) {
    ureaPill = {
      tone: "warning",
      label: t(lang, "ELEVATED (7.6–19.9)", "TĂNG UREA (7.6–19.9)"),
    };
  } else {
    ureaPill = {
      tone: "danger",
      label: t(lang, "VERY HIGH (≥20.0)", "QUÁ CAO (≥20.0)"),
    };
  }

  let phPill: ParamStatusPill;
  if (inputs.ph < 7.0) {
    phPill = {
      tone: "danger",
      label: t(lang, "SEVERE ACIDOSIS (<7.00)", "TOAN NẶNG (<7.00)"),
    };
  } else if (inputs.ph < 7.3) {
    phPill = {
      tone: "danger",
      label: t(lang, "ACIDOSIS (<7.30)", "NHIỄM TOAN (<7.30)"),
    };
  } else if (inputs.ph < 7.35) {
    phPill = {
      tone: "warning",
      label: t(lang, "MILD LOW (7.30–7.34)", "GIẢM NHẸ (7.30–7.34)"),
    };
  } else if (inputs.ph <= 7.45) {
    phPill = {
      tone: "ok",
      label: t(lang, "NORMAL (7.35–7.45)", "BÌNH THƯỜNG (7.35–7.45)"),
    };
  } else if (inputs.ph <= 7.5) {
    phPill = {
      tone: "warning",
      label: t(lang, "MILD ALKALOSIS (7.46–7.50)", "KIỀM NHẸ (7.46–7.50)"),
    };
  } else {
    phPill = {
      tone: "danger",
      label: t(lang, "SEVERE ALKALOSIS (>7.50)", "KIỀM NẶNG (>7.50)"),
    };
  }

  let hco3Pill: ParamStatusPill;
  if (inputs.hco3 < 5.0) {
    hco3Pill = {
      tone: "danger",
      label: t(lang, "CRITICAL LOW (<5.0)", "QUÁ THẤP (<5.0)"),
    };
  } else if (inputs.hco3 < 15.0) {
    hco3Pill = {
      tone: "danger",
      label: t(lang, "ACIDOSIS (<15)", "GIẢM NẶNG - TOAN (<15)"),
    };
  } else if (inputs.hco3 < 22.0) {
    hco3Pill = {
      tone: "warning",
      label: t(lang, "MILD LOW (15–21.9)", "GIẢM NHẸ (15–21.9)"),
    };
  } else if (inputs.hco3 <= 26.0) {
    hco3Pill = {
      tone: "ok",
      label: t(lang, "NORMAL (22–26)", "BÌNH THƯỜNG (22–26)"),
    };
  } else if (inputs.hco3 <= 32.0) {
    hco3Pill = {
      tone: "warning",
      label: t(lang, "ELEVATED (>26)", "TĂNG HCO3- (>26)"),
    };
  } else {
    hco3Pill = {
      tone: "danger",
      label: t(lang, "VERY HIGH (>32)", "QUÁ CAO (>32)"),
    };
  }

  let ketPill: ParamStatusPill;
  if (inputs.ketone < 0.6) {
    ketPill = {
      tone: "ok",
      label: t(lang, "NEGATIVE (<0.6)", "ÂM TÍNH (<0.6)"),
    };
  } else if (inputs.ketone < 1.5) {
    ketPill = {
      tone: "warning",
      label: t(lang, "MILD (0.6–1.4)", "TĂNG NHẸ (0.6–1.4)"),
    };
  } else if (inputs.ketone < 3.0) {
    ketPill = {
      tone: "warning",
      label: t(lang, "DKA RISK (1.5–2.9)", "NGUY CƠ DKA (1.5–2.9)"),
    };
  } else if (inputs.ketone <= 6.0) {
    ketPill = {
      tone: "danger",
      label: t(lang, "KETOACIDOSIS (≥3.0)", "TOAN CETON (≥3.0)"),
    };
  } else {
    ketPill = {
      tone: "danger",
      label: t(lang, "SEVERE (>6.0)", "QUÁ CAO - NẶNG (>6.0)"),
    };
  }

  return {
    isBgHi,
    bg: bgPill,
    k: kPill,
    na: naPill,
    urea: ureaPill,
    ph: phPill,
    hco3: hco3Pill,
    ketone: ketPill,
  };
}

export function getUnifiedCorrectionActrapid(
  bg: number,
  tdd: number,
  isHighRisk: boolean,
  traj: TrajectoryAnalysis,
  options: {
    tpRole: "premeal" | "postmeal_2h" | "bedtime_22h" | "night_02h";
    mode?: InsulinMode;
  },
  lang: InsulinLang
): {
  finalDose: number;
  rawDose: number;
  isf: number;
  steps: string[];
  summaryTitle: string;
} {
  const tpRole = options.tpRole;
  const effectiveTdd = Math.max(12, tdd || 30);
  const isf = Math.round(1700 / effectiveTdd);
  const steps: string[] = [];

  let scale = 0;
  let scaleLabel = t(
    lang,
    `Sensitive scale (TDD < 40, ISF ~${isf} mg/dL/u)`,
    `Thang nhạy cảm (TDD < 40, ISF ~${isf} mg/dL/u)`
  );
  if (effectiveTdd > 70) {
    scale = 2;
    scaleLabel = t(
      lang,
      `High insulin resistance scale (TDD > 70, ISF ~${isf} mg/dL/u)`,
      `Thang kháng insulin cao (TDD > 70, ISF ~${isf} mg/dL/u)`
    );
  } else if (effectiveTdd >= 40) {
    scale = 1;
    scaleLabel = t(
      lang,
      `Moderate scale (TDD 40–70, ISF ~${isf} mg/dL/u)`,
      `Thang trung bình (TDD 40–70, ISF ~${isf} mg/dL/u)`
    );
  }

  if (bg < 250) {
    steps.push(
      t(
        lang,
        `Current BG (${bg} mg/dL) is below the Actrapid correction threshold (< 250 mg/dL) → 0 units.`,
        `Đường huyết hiện tại (${bg} mg/dL) dưới ngưỡng hiệu chỉnh Actrapid (< 250 mg/dL) → 0 units.`
      )
    );
    if (traj.hasPrior) {
      const sign = traj.rateBgPerHour > 0 ? "+" : "";
      steps.push(
        t(
          lang,
          `Trajectory from ${traj.lastShortTime} (Δt ${traj.deltaHours}h): ${traj.lastBg} → ${bg} mg/dL (${sign}${traj.rateBgPerHour.toFixed(0)} mg/dL/h). Active IOB: ~${traj.iob.activeUnits} units.`,
          `Động học từ mốc ${traj.lastShortTime} (sau ${traj.deltaHours}h): ${traj.lastBg} → ${bg} mg/dL (tốc độ ${sign}${traj.rateBgPerHour.toFixed(0)} mg/dL/h). Lượng IOB còn lại: ~${traj.iob.activeUnits} units.`
        )
      );
      if (traj.isRapidDrop) {
        steps.push(
          t(
            lang,
            `Rapid drop velocity (${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h ≥ 50 mg/dL/h): 2h projected BG ~${traj.projectedBg2h} mg/dL → Provide complex carbohydrate snack to break momentum.`,
            `Tốc độ hạ Glucose (${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/giờ) vượt ngưỡng an toàn (≥ 50 mg/dL/h). Dự báo 2h tới còn ~${traj.projectedBg2h} mg/dL → Cần bù Carb phức hợp nhẹ để chặn đà rơi.`
          )
        );
      } else if (traj.deltaBg < 0) {
        steps.push(
          t(
            lang,
            `Current drop rate (${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h) is within safe limits (< 50 mg/dL/h).`,
            `Tốc độ hạ Glucose hiện tại (${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/giờ) nằm trong giới hạn an toàn (< 50 mg/dL/h).`
          )
        );
      }
    }
    return {
      finalDose: 0,
      rawDose: 0,
      isf,
      steps,
      summaryTitle: t(
        lang,
        "View trajectory & IOB assessment (0 units)",
        "Xem chi tiết đánh giá động học & IOB (0 units)"
      ),
    };
  }

  let tierBase = 0;
  let tierName = "";
  if (bg >= 250 && bg <= 299) {
    tierBase = 2 + scale;
    tierName = t(lang, "Tier 1 (250–299 mg/dL)", "Bậc 1 (250–299 mg/dL)");
  } else if (bg >= 300 && bg <= 349) {
    tierBase = 4 + scale;
    tierName = t(lang, "Tier 2 (300–349 mg/dL)", "Bậc 2 (300–349 mg/dL)");
  } else if (bg >= 350 && bg <= 399) {
    tierBase = 6 + scale;
    tierName = t(lang, "Tier 3 (350–399 mg/dL)", "Bậc 3 (350–399 mg/dL)");
  } else if (bg >= 400 && bg <= 449) {
    tierBase = 7 + scale * 1.5;
    tierName = t(lang, "Tier 4 (400–449 mg/dL)", "Bậc 4 (400–449 mg/dL)");
  } else if (bg >= 450 && bg <= 499) {
    tierBase = 8 + scale * 2;
    tierName = t(lang, "Tier 5 (450–499 mg/dL)", "Bậc 5 (450–499 mg/dL)");
  } else {
    const extraAbove500 = Math.floor((bg - 500) / 50);
    tierBase = Math.min(14, 10 + scale * 2 + extraAbove500);
    tierName = t(
      lang,
      "Tier 6 Severe (≥ 500 mg/dL)",
      "Bậc 6 Rất cao (≥ 500 mg/dL)"
    );
  }

  const standardDayDose = Math.round(tierBase);
  const targetBg =
    tpRole === "bedtime_22h" || tpRole === "night_02h" ? 190 : 160;
  const isfEstimatedDose = Math.max(2, Math.round((bg - targetBg) / isf));

  let current = standardDayDose;
  steps.push(
    t(
      lang,
      `Standard daytime Actrapid correction for ${tierName} (BG = ${bg} mg/dL, ${scaleLabel}; ISF estimate ~${isfEstimatedDose} units to reach ${targetBg} mg/dL): ${standardDayDose} units.`,
      `Liều Actrapid hiệu chỉnh chuẩn ban ngày theo ${tierName} (BG = ${bg} mg/dL, ${scaleLabel}, ước tính theo ISF cần ~${isfEstimatedDose} units để đưa về ${targetBg} mg/dL): ${standardDayDose} units.`
    )
  );

  if (isHighRisk) {
    current = adjustDoseWithGuarantee(current, 0.8, "down");
    steps.push(
      t(
        lang,
        `High-risk protection (-20% for elderly / renal impairment / poor intake): ${current} units.`,
        `Giảm 20% bảo vệ nhóm nguy cơ cao (cao tuổi / suy thận / ăn kém): còn ${current} units.`
      )
    );
  }

  if (tpRole === "postmeal_2h") {
    if (
      bg < 350 &&
      (!traj.hasPrior || traj.lastNovomix + traj.lastActrapid > 0)
    ) {
      const slotLabel = options.mode === "06h" ? "08:30" : "20:30";
      steps.push(
        t(
          lang,
          `2h post-meal checkpoint (${slotLabel}) with BG < 350 mg/dL: mealtime insulin is still peaking → withhold correction to prevent stacking (0 units).`,
          `Mốc sau ăn 2 giờ (${slotLabel}) với BG < 350 mg/dL: Insulin cử ăn chính vẫn đang ở đỉnh hoạt động → Không tiêm bồi lúc 2h sau ăn để tránh chồng liều (0 units).`
        )
      );
      return {
        finalDose: 0,
        rawDose: standardDayDose,
        isf,
        steps,
        summaryTitle: t(
          lang,
          `Calculation & anti-stacking details (${standardDayDose} → 0 units)`,
          `Xem chi tiết tính toán & chống chồng liều sau ăn (${standardDayDose} → 0 units)`
        ),
      };
    }
    current = Math.max(1, Math.round(current * 0.6));
    steps.push(
      t(
        lang,
        `2h post-meal with severe hyperglycemia (${bg} mg/dL ≥ 350): apply 60% of daytime correction before IOB deduction = ${current} units.`,
        `Mốc sau ăn 2 giờ nhưng đường huyết tăng rất cao (${bg} mg/dL ≥ 350): lấy 60% liều chuẩn ban ngày trước khi trừ IOB = ${current} units.`
      )
    );
  } else if (tpRole === "bedtime_22h" || tpRole === "night_02h") {
    const isSevereRising = bg >= 400 && traj.hasPrior && traj.deltaBg >= 50;
    let nightFactor = 0.6;
    if (tpRole === "night_02h") {
      nightFactor = bg >= 400 ? 0.65 : 0.5;
    } else {
      nightFactor = isSevereRising ? 0.75 : bg >= 400 ? 0.7 : 0.6;
    }
    const pctLabel = `${Math.round(nightFactor * 100)}%`;
    current = Math.max(1, Math.round(current * nightFactor));
    steps.push(
      t(
        lang,
        `Nocturnal safety multiplier (${tpRole === "night_02h" ? "02:00 midnight" : "22:00 bedtime"} — ${pctLabel} of standard dose${isSevereRising ? " due to severe surge ≥ 400 mg/dL" : ""}): ${current} units.`,
        `Hệ số an toàn ban đêm (${tpRole === "night_02h" ? "02h00 sáng" : "22h00 trước ngủ"} — lấy ${pctLabel} liều chuẩn${isSevereRising ? " do tăng vọt ≥ 400 mg/dL" : ""}): còn ${current} units.`
      )
    );
  }

  if (traj.hasPrior) {
    if (traj.hadRecentHypo) {
      current = Math.max(0, Math.floor(current * 0.5));
      steps.push(
        t(
          lang,
          `Recent hypoglycemia detected (${traj.recentHypoLabel}, BG = ${traj.recentHypoBg} mg/dL — suspected Somogyi rebound): reduce by 50% to ${current} units.`,
          `Phát hiện tiền sử hạ đường huyết ở mốc trước (${traj.recentHypoLabel}, BG = ${traj.recentHypoBg} mg/dL — nghi ngờ phản ứng Somogyi): giảm 50% còn ${current} units.`
        )
      );
    }

    const iobToConsider =
      tpRole === "postmeal_2h" || traj.deltaHours < 3.0
        ? traj.iob.activeUnits
        : traj.iob.actrapidRem;
    const isPriorInsulinOverwhelmed =
      traj.deltaHours >= 3.0 && traj.deltaBg >= 40;

    if (iobToConsider >= 0.8) {
      if (isPriorInsulinOverwhelmed) {
        steps.push(
          t(
            lang,
            `Theoretical IOB ~${iobToConsider} units after ${traj.deltaHours}h from ${traj.lastShortTime}, but BG surged +${traj.deltaBg} mg/dL (${traj.lastBg} → ${bg} mg/dL) showing prior dose was overwhelmed → SKIP IOB deduction (keep ${current} units).`,
            `Mặc dù lý thuyết còn ~${iobToConsider} units IOB sau ${traj.deltaHours}h từ mốc ${traj.lastShortTime}, nhưng đường huyết đã tăng vọt +${traj.deltaBg} mg/dL (${traj.lastBg} → ${bg} mg/dL, liều trước không đủ khống chế) → KHÔNG khấu trừ IOB (giữ ${current} units).`
          )
        );
      } else {
        const deduct = Math.round(iobToConsider);
        current = Math.max(0, current - deduct);
        steps.push(
          t(
            lang,
            `Deduct -${deduct} units active IOB (~${iobToConsider} units remaining after ${traj.deltaHours}h from ${traj.lastShortTime}): ${current} units.`,
            `Khấu trừ -${deduct} units Insulin nhanh còn hoạt tính (IOB ~${iobToConsider} units sau ${traj.deltaHours}h từ mốc ${traj.lastShortTime}): còn ${current} units.`
          )
        );
      }
    }

    if (traj.isRapidDrop && current > 0) {
      current =
        tpRole === "bedtime_22h" ||
        tpRole === "night_02h" ||
        tpRole === "postmeal_2h" ||
        traj.isVeryRapidDrop
          ? 0
          : Math.max(0, Math.floor(current * 0.5));
      steps.push(
        t(
          lang,
          `BG is dropping rapidly (${traj.deltaBg} mg/dL, ${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h ≥ 50 mg/dL/h): further cut to prevent stacking → ${current} units.`,
          `Đường huyết đang trên đà hạ nhanh (${traj.deltaBg} mg/dL, tốc độ ${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h ≥ 50 mg/dL/h): giảm tiếp chống chồng liều còn ${current} units.`
        )
      );
    }
  }

  steps.push(
    t(
      lang,
      `Final safe Actrapid correction dose: ${current} units.`,
      `Kết luận liều Actrapid thực tiêm an toàn: ${current} units.`
    )
  );

  const summaryTitle =
    current !== standardDayDose
      ? t(
          lang,
          `Calculation details (Standard ${standardDayDose} → Final ${current} units)`,
          `Xem chi tiết cách tính liều (Liều chuẩn ${standardDayDose} → Thực tiêm ${current} units)`
        )
      : t(
          lang,
          `Calculation details (${current} units per ${tierName})`,
          `Xem chi tiết cách tính liều (${current} units theo ${tierName})`
        );

  return {
    finalDose: current,
    rawDose: standardDayDose,
    isf,
    steps,
    summaryTitle,
  };
}

export function buildDynamicNutritionPlan(
  inputs: InsulinInputs,
  traj: TrajectoryAnalysis,
  injectedNovo: number,
  injectedAct: number,
  lang: InsulinLang
): DetailSection {
  const bg = inputs.bgMgDl;
  const mode = inputs.mode;
  const tp = inputs.tp;
  const totalInjected = (injectedNovo || 0) + (injectedAct || 0);
  const isPreMealMain =
    (mode === "06h" && tp === "t0") || (mode === "18h" && tp === "t0");
  const isPreLunch = mode === "06h" && tp === "t2";
  const isPostMeal = tp === "t1";
  const isNight = mode === "18h" && (tp === "t2" || tp === "t4");

  const mealName =
    mode === "06h" && tp === "t0"
      ? t(lang, "breakfast", "bữa sáng")
      : mode === "06h" && tp === "t2"
      ? t(lang, "lunch", "bữa trưa")
      : t(lang, "dinner", "bữa tối");

  let primaryText = "";
  const bullets: string[] = [];
  let tone: ClinicalSeverity = "ok";

  if (bg < 70) {
    tone = "danger";
    if (isPreMealMain || isPreLunch) {
      primaryText = t(
        lang,
        `Give 15–20 g fast-acting carbohydrates immediately (Rule of 15). Feed ${mealName} once BG ≥ 70–100 mg/dL; if insulin is ordered in Section 1, inject ONLY AFTER the meal is finished.`,
        `Bù ngay 15–20g đường hấp thu nhanh (Quy tắc 15). Cho ăn ${mealName} ngay khi BG ≥ 70–100 mg/dL; nếu có chỉ định tiêm Insulin ở Mục 1 thì CHỈ TIÊM SAU KHI ĐÃ ĂN XONG HOÀN TOÀN.`
      );
      bullets.push(
        t(
          lang,
          "Never inject insulin while fasting or before BG recovers to ≥ 100 mg/dL.",
          "Tuyệt đối không tiêm Insulin khi bệnh nhân đang đói hoặc đường huyết chưa lên lại ≥ 100 mg/dL."
        )
      );
    } else {
      primaryText = t(
        lang,
        "Give 15–20 g fast-acting carbohydrate immediately (glucose drink/juice or IV 30% Dextrose). Once BG ≥ 100 mg/dL, follow with 15–20 g complex carb + protein snack (milk + crackers).",
        "Bù ngay 15–20g đường nhanh (nước đường/sữa có đường hoặc tiêm TM Glucose 30%). Khi BG ≥ 100 mg/dL: Bắt buộc ăn phụ 15–20g Carb phức hợp + đạm (1 hộp sữa + 2 bánh quy)."
      );
      bullets.push(
        t(
          lang,
          "Simple sugar only sustains BG for 30–45 minutes; complex carb + protein prevents rebound hypoglycemia.",
          "Đường đơn chỉ giữ đường huyết trong 30–45 phút; bữa phụ có tinh bột phức hợp và đạm mới giữ được đường huyết không tụt lại."
        )
      );
    }
    return { primaryText, bullets, tone };
  }

  if (isNight) {
    const timeLabel =
      tp === "t2"
        ? t(lang, "at bedtime (22:00)", "trước khi ngủ (22h00)")
        : t(lang, "at midnight (02:00)", "lúc nửa đêm (02h00)");

    if (bg >= 70 && bg < 140) {
      tone = "warning";
      primaryText = t(
        lang,
        `Give 150–200 mL warm milk (or 2–3 crackers, ~15 g slow-release carb) ${timeLabel} to prevent nocturnal hypoglycemia.`,
        `Cho uống ngay 1 ly sữa ấm 150–200 mL (hoặc ăn 2–3 bánh quy ~15g Carb chậm) ${timeLabel} để dự phòng hạ đường huyết ban đêm.`
      );
      if (traj.hasPrior && traj.isRapidDrop) {
        bullets.push(
          t(
            lang,
            `Rapid drop warning (${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h ≥ 50 mg/dL/h): add bread/crackers with protein to arrest the downward trend.`,
            `Cảnh báo tốc độ hạ nhanh (${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h ≥ 50 mg/dL/h): nên ăn kèm thêm 1 lát bánh mì/bánh quy có đạm để chặn đà rơi.`
          )
        );
      }
    } else if (bg >= 140 && bg <= 249) {
      if (traj.hasPrior && traj.isRapidDrop) {
        tone = "warning";
        primaryText = t(
          lang,
          `RAPID DROP ALERT (${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h): Give 150–200 mL warm milk (15 g complex carb + protein) ${timeLabel}.`,
          `CẢNH BÁO TỐC ĐỘ HẠ ĐƯỜNG HUYẾT NHANH (${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h): Cho ăn nhẹ / uống ngay 1 ly sữa ấm 150–200 mL (15g Carb phức hợp + đạm) ${timeLabel}!`
        );
        bullets.push(
          t(
            lang,
            `Current BG is ${bg} mg/dL, but fell ${Math.abs(traj.deltaBg)} mg/dL at ${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h${traj.iob.activeUnits > 0 ? ` with ~${traj.iob.activeUnits} u IOB active` : ""}. Projected 2h BG: ~${traj.projectedBg2h} mg/dL.`,
            `Mặc dù đường huyết hiện tại là ${bg} mg/dL, nhưng vừa giảm ${Math.abs(traj.deltaBg)} mg/dL với tốc độ ${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h${traj.iob.activeUnits > 0 ? ` và còn ~${traj.iob.activeUnits} units IOB` : ""}. Dự báo 2h tới: ~${traj.projectedBg2h} mg/dL.`
          )
        );
      } else if (traj.hasPrior && traj.isIobInducedHypoRisk) {
        tone = "warning";
        primaryText = t(
          lang,
          `ACTIVE IOB ALERT (~${traj.iob.activeUnits} units): Give 100–150 mL warm milk or 2 crackers (~10–15 g slow carb) ${timeLabel}.`,
          `CẢNH BÁO CÒN IOB TỒN LƯU (~${traj.iob.activeUnits} units): Cho uống 100–150 mL sữa ấm hoặc 2 bánh quy (~10–15g Carb chậm) ${timeLabel} để dự phòng hạ đường đêm.`
        );
        bullets.push(
          t(
            lang,
            `Remaining rapid IOB + Protamine peak may lower BG from ${bg} mg/dL toward ~${traj.projectedBg2h} mg/dL.`,
            `Insulin nhanh tồn lưu kết hợp đỉnh Protamine có thể kéo đường huyết từ ${bg} mg/dL xuống ~${traj.projectedBg2h} mg/dL.`
          )
        );
      } else {
        tone = "ok";
        primaryText = t(
          lang,
          `BG ${timeLabel} is safe (${bg} mg/dL${traj.hasPrior && traj.deltaBg < 0 ? `, safe drop ${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h` : ""}) — Allow uninterrupted sleep; no snack needed.`,
          `Đường huyết ${timeLabel} an toàn (${bg} mg/dL${traj.hasPrior && traj.deltaBg < 0 ? `, tốc độ giảm ${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h an toàn < 50 mg/dL/h` : ""}) — Cho bệnh nhân ngủ yên, không cần ăn phụ.`
        );
      }
    } else {
      tone = "info";
      primaryText = t(
        lang,
        "Encourage 250–400 mL warm water for hydration; strictly avoid nighttime carbs or sweets.",
        "Cho uống 250 – 400 mL nước lọc ấm để bồi phụ dịch; tuyệt đối không ăn thêm tinh bột/đồ ngọt trong đêm."
      );
      if (totalInjected > 0) {
        bullets.push(
          t(
            lang,
            "Timing: Administer the nocturnal correction dose (Section 1) SC immediately without needing food.",
            "Thời điểm tiêm: Mũi hiệu chỉnh ban đêm (nêu tại Mục 1) được tiêm dưới da ngay mà không cần ăn kèm."
          )
        );
      }
      if (traj.hasPrior && traj.isRapidDrop) {
        bullets.push(
          t(
            lang,
            `BG is dropping fast (${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h from ${traj.lastShortTime}): warm water supports safe osmotic clearance.`,
            `Đường huyết đang giảm nhanh (${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h từ mốc ${traj.lastShortTime}): uống đủ nước ấm giúp giảm áp lực thẩm thấu an toàn.`
          )
        );
      }
    }
    return { primaryText, bullets, tone };
  }

  if (isPostMeal) {
    const postLabel =
      mode === "06h"
        ? t(lang, "2h post-breakfast (08:30)", "sau ăn sáng (08h30)")
        : t(lang, "2h post-dinner (20:30)", "sau ăn tối (20h30)");
    if (bg >= 70 && bg < 140) {
      tone = "warning";
      primaryText = t(
        lang,
        `BG ${postLabel} is borderline low (${bg} mg/dL) while mealtime insulin remains active — give 180 mL milk or 15 g slow carb immediately.`,
        `Đường huyết ${postLabel} khá thấp (${bg} mg/dL) khi Insulin cử ăn vẫn còn hoạt tính — Cho uống bù ngay 1 hộp sữa 180 mL hoặc ăn 15g Carb chậm!`
      );
      bullets.push(
        t(
          lang,
          "Prevents delayed hypoglycemia 3–4 hours post-injection.",
          "Phòng ngừa tụt đường huyết muộn vào 3–4 giờ sau tiêm."
        )
      );
    } else if (bg >= 140 && bg <= 249) {
      if (traj.hasPrior && (traj.isRapidDrop || traj.isIobInducedHypoRisk)) {
        tone = "warning";
        primaryText = t(
          lang,
          `BG ${postLabel} (${bg} mg/dL) but ${traj.isRapidDrop ? `dropping fast (${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h)` : `high active IOB (~${traj.iob.activeUnits} u)`} — give 10–15 g slow carb snack.`,
          `Đường huyết ${postLabel} (${bg} mg/dL) nhưng ${traj.isRapidDrop ? `đang hạ nhanh (${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h ≥ 50 mg/dL/h)` : `còn lượng IOB cao (~${traj.iob.activeUnits} units)`} — Cho ăn nhẹ 10–15g Carb chậm để tránh tụt đường huyết trước bữa kế tiếp.`
        );
      } else {
        tone = "ok";
        primaryText = t(
          lang,
          `BG ${postLabel} is stable (${bg} mg/dL). No extra snack required if the main meal was completed.`,
          `Đường huyết ${postLabel} ổn định (${bg} mg/dL). Không cần ăn phụ nếu đã ăn hết suất chính.`
        );
        bullets.push(
          t(
            lang,
            "Note: If < 50% of the meal was eaten after NovoMix injection, give 1 carton milk or start 5% Dextrose at 80 mL/h.",
            "Lưu ý: Nếu vừa bỏ dở bữa ăn chính (< 50% suất) sau khi đã tiêm đủ liều Novomix, bắt buộc uống bù 1 hộp sữa hoặc truyền Glucose 5% 80 mL/h."
          )
        );
      }
    } else {
      tone = "info";
      primaryText = t(
        lang,
        "Encourage 300–400 mL warm water; avoid extra carbohydrate snacks.",
        "Cho uống thêm 300 – 400 mL nước lọc ấm, tuyệt đối không ăn vặt thêm tinh bột/đồ ngọt."
      );
      if (totalInjected > 0) {
        bullets.push(
          t(
            lang,
            "Timing: Inject the correction dose (Section 1) immediately without food.",
            "Thời điểm tiêm: Thực hiện mũi tiêm hiệu chỉnh (theo Mục 1) ngay, không cần ăn kèm."
          )
        );
      }
    }
    return { primaryText, bullets, tone };
  }

  // Pre-meal (06:00, 11:30, 18:00)
  if (bg >= 70 && bg <= 99) {
    tone = "warning";
    primaryText =
      t(
        lang,
        `Feed ${mealName} immediately (ensure adequate complex carbs) — `,
        `Cho bệnh nhân ăn ${mealName} ngay (đảm bảo đủ tinh bột phức hợp) — `
      ) +
      (totalInjected > 0
        ? t(
            lang,
            "INJECT INSULIN (Section 1) ONLY AFTER FINISHING THE MEAL.",
            "CHỈ TIÊM THUỐC (theo liều Mục 1) NGAY SAU KHI BỆNH NHÂN ĐÃ ĂN XONG."
          )
        : t(lang, "No insulin this slot.", "Không tiêm Insulin cử này."));
    bullets.push(
      t(
        lang,
        "Post-meal injection at BG 70–99 mg/dL allows carbohydrate absorption before rapid insulin onset.",
        "Tiêm sau ăn khi BG 70–99 mg/dL giúp thức ăn kịp hấp thu trước khi thành phần Insulin nhanh phát huy tác dụng."
      )
    );
  } else if (bg >= 100 && bg <= 180) {
    if (traj.hasPrior && traj.isRapidDrop) {
      tone = "warning";
      primaryText = t(
        lang,
        `BG is dropping fast (${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h from ${traj.lastShortTime}): ${totalInjected > 0 ? `feed ${mealName} immediately at injection (or right after)` : `feed ${mealName} on time with complex carbs`}.`,
        `Do đường huyết đang hạ nhanh (${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h từ mốc ${traj.lastShortTime}): ${totalInjected > 0 ? `Cho ăn ${mealName} ngay khi tiêm (hoặc tiêm ngay sau ăn)` : `Cho ăn ${mealName} đúng giờ, đủ tinh bột phức hợp`}.`
      );
      bullets.push(
        t(
          lang,
          "Avoid waiting 15 minutes before eating when BG is falling ≥ 50 mg/dL/h.",
          "Tránh chờ 15 phút sau tiêm mới ăn khi đường huyết đang trên đà rơi nhanh (≥ 50 mg/dL/h)."
        )
      );
    } else {
      tone = "ok";
      primaryText =
        (totalInjected > 0
          ? t(
              lang,
              `Inject SC 5–10 minutes before ${mealName}. `,
              `Tiêm dưới da trước khi ăn ${mealName} 5 – 10 phút. `
            )
          : "") +
        t(
          lang,
          "Standard inpatient diabetic diet.",
          "Ăn chế độ dinh dưỡng đái tháo đường tiêu chuẩn."
        );
    }
  } else if (bg >= 181 && bg <= 350) {
    if (traj.hasPrior && traj.isRapidDrop) {
      tone = "info";
      primaryText =
        (totalInjected > 0
          ? t(
              lang,
              `Inject SC 5–10 minutes before ${mealName} (BG already fell ${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h). `,
              `Tiêm dưới da trước khi ăn ${mealName} 5 – 10 phút (đường huyết đã giảm nhanh ${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h). `
            )
          : "") +
        t(
          lang,
          `Eat ${mealName} with reduced simple carbs, extra vegetables, and 300 mL warm water.`,
          `Ăn ${mealName} giảm tinh bột hấp thu nhanh, tăng rau xanh và uống thêm 300 mL nước ấm.`
        );
    } else {
      tone = "ok";
      primaryText =
        (totalInjected > 0
          ? t(
              lang,
              `Inject SC 15 minutes before ${mealName} to match postprandial absorption. `,
              `Tiêm dưới da trước khi ăn ${mealName} 15 phút để Insulin kịp khởi phát. `
            )
          : "") +
        t(
          lang,
          "Eat vegetables and protein first, cut simple carbs by 30%, drink 300–500 mL warm water.",
          "Ăn rau xanh và đạm trước, giảm 30% tinh bột nhanh, uống 300 – 500 mL nước lọc ấm."
        );
      if (traj.hasPrior && traj.isRisingFast) {
        bullets.push(
          t(
            lang,
            `BG is rising rapidly (+${traj.deltaBg} mg/dL from ${traj.lastShortTime}): wait the full 15 minutes before eating carbs.`,
            `Đường huyết đang tăng nhanh (+${traj.deltaBg} mg/dL từ mốc ${traj.lastShortTime}): tuân thủ chờ đủ 15 phút sau tiêm mới ăn tinh bột.`
          )
        );
      }
    }
  } else {
    tone = "warning";
    primaryText = t(
      lang,
      `If alert and non-ketotic (Ketones < 1.0 mmol/L): ${totalInjected > 0 ? "inject 15–20 min before meal, " : ""}drink 500 mL warm water and strictly minimize carbs in ${mealName}.`,
      `Nếu tỉnh táo & không toan ceton (Ceton < 1.0 mmol/L): ${totalInjected > 0 ? "tiêm thuốc trước ăn 15 – 20 phút, " : ""}uống 500 mL nước lọc ấm và hạn chế tối đa tinh bột trong ${mealName}.`
    );
    bullets.push(
      t(
        lang,
        "If nausea, vomiting, abdominal pain, or lethargy is present (suspected DKA/HHS): KEEP NPO immediately and switch to Mode 3 (DKA/HHS Emergency)!",
        "Nếu người bệnh buồn nôn, nôn ói, đau bụng hoặc lơ mơ (nghi DKA/HHS): TẠM NHỊN ĂN ngay lập tức và chuyển sang Tab 3 (Cấp cứu DKA / HHS)!"
      )
    );
  }

  return { primaryText, bullets, tone };
}

function buildInpatientWarningBanner(
  inputs: InsulinInputs,
  lang: InsulinLang
): WarningBanner | null {
  if (inputs.bgMgDl >= 800) {
    return {
      severity: "danger",
      title: t(
        lang,
        "Critical Glucose HI (≥ 800 mg/dL ~ 44.4 mmol/L)",
        "Cảnh báo Đường huyết vượt ngưỡng HI (≥ 800 mg/dL ~ 44.4 mmol/L)"
      ),
      items: [
        t(
          lang,
          "Order stat electrolytes, venous blood gas, and blood ketones, and switch immediately to Mode 3 (DKA / HHS Emergency).",
          "Cần xét nghiệm ngay Điện giải đồ, Khí máu, Ceton máu và chuyển sang Tab 3 (Cấp cứu DKA / HHS)!"
        ),
      ],
    };
  }
  return null;
}

export function computeMorning06h(
  inputs: InsulinInputs,
  traj: TrajectoryAnalysis,
  lang: InsulinLang
): InpatientEvaluation {
  const bg = inputs.bgMgDl;
  const { rawTdd, effectiveTdd, isf } = getEffectiveTddAndIsf(inputs);
  const doseMorn = inputs.isNaive ? 0 : inputs.doseMorn;
  const doseEve = inputs.isNaive ? 0 : inputs.doseEve;
  const isHighRisk = inputs.isHighRisk;
  const tp = inputs.tp;

  const warningBanner = buildInpatientWarningBanner(inputs, lang);

  let effectiveDoseMorn = doseMorn;
  const baseNovoSteps: string[] = [];
  if (traj.hasPrior && traj.hadRecentHypo && tp === "t0" && bg >= 100) {
    effectiveDoseMorn = adjustDoseWithGuarantee(doseMorn, 0.8, "down");
    baseNovoSteps.push(
      t(
        lang,
        `Prior hypoglycemia detected (${traj.recentHypoLabel}, BG = ${traj.recentHypoBg} mg/dL): auto-reduced morning NovoMix 30 by 20% (${doseMorn} → ${effectiveDoseMorn} units) to prevent Somogyi rebound.`,
        `Phát hiện hạ đường huyết ở mốc trước (${traj.recentHypoLabel}, BG = ${traj.recentHypoBg} mg/dL): tự động giảm 20% liều Novomix sáng từ ${doseMorn} xuống ${effectiveDoseMorn} units để phòng phản ứng Somogyi.`
      )
    );
  }
  if (isHighRisk) {
    baseNovoSteps.push(
      t(
        lang,
        "High-hypoglycemia-risk profile (elderly / eGFR < 45 / poor intake): conservative dose protection active.",
        "Nhóm nguy cơ hạ đường huyết cao (cao tuổi / eGFR < 45 / ăn kém): áp dụng chế độ bảo vệ giảm liều."
      )
    );
  }

  let statusTone: ClinicalSeverity = "info";
  let statusTag = "";
  let statusTitle = "";
  let medicationOrder: DetailSection = { primaryText: "", bullets: [], tone: "info" };
  let timeline: TimelineEvent[] = [];
  let regimenAdjustment: DetailSection = { primaryText: "", bullets: [], tone: "info" };
  let sugNovomix = 0;
  let sugActrapid = 0;

  if (inputs.isNaive && tp === "t0") {
    const factor = isHighRisk ? 0.2 : 0.4;
    const initMorn = Math.round(effectiveTdd * (2 / 3));
    const initEve = effectiveTdd - initMorn;

    if (bg < 70) {
      statusTone = "danger";
      statusTag = t(
        lang,
        "Acute Hypoglycemia (< 70 mg/dL)",
        "Hạ Đường Huyết Cấp (< 70 mg/dL)"
      );
      statusTitle = t(
        lang,
        "Insulin-naïve hypoglycemia — DO NOT initiate insulin; treat immediately!",
        "Hạ đường huyết ở bệnh nhân chưa dùng Insulin — KHÔNG khởi trị, cấp cứu ngay!"
      );
      medicationOrder = {
        primaryText: t(
          lang,
          "DO NOT initiate insulin! Execute Rule of 15 rescue (15–20 g fast oral glucose, or 30–50 mL IV 30% Dextrose if obtunded).",
          "KHÔNG khởi trị Insulin! Xử trí cấp cứu Quy tắc 15 ngay (uống 15–20g đường nhanh hoặc tiêm TM 30–50 mL Glucose 30% nếu lơ mơ)."
        ),
        bullets: [
          t(
            lang,
            "Screen non-insulin causes of hypoglycemia (sulfonylurea, sepsis, hepatic/renal failure, adrenal insufficiency, malnutrition).",
            "Tìm nguyên nhân hạ đường huyết ngoài insulin (sulfonylurea, nhiễm trùng huyết, suy gan/thận, suy thượng thận, suy kiệt)."
          ),
        ],
        tone: "danger",
      };
      timeline = [
        {
          time: t(lang, "In 15 min", "Sau 15 phút"),
          desc: t(
            lang,
            "Recheck capillary BG until ≥ 100 mg/dL",
            "Thử lại đường huyết mao mạch đến khi ≥ 100 mg/dL"
          ),
          critical: true,
        },
        {
          time: t(lang, "11:30 Pre-lunch", "11h30 trưa"),
          desc: t(
            lang,
            "Reassess BG before lunch",
            "Đánh giá lại đường huyết trước ăn trưa"
          ),
          critical: true,
        },
      ];
      regimenAdjustment = {
        primaryText: t(
          lang,
          "Hold insulin initiation; investigate underlying hypoglycemia etiology.",
          "Chưa khởi trị Insulin; tìm và xử trí nguyên nhân gây hạ đường huyết."
        ),
        bullets: [],
        tone: "danger",
      };
    } else if (bg < 140) {
      statusTone = "ok";
      statusTag = t(lang, "No Initiation Needed (< 140 mg/dL)", "Chưa Cần Khởi Trị (< 140 mg/dL)");
      statusTitle = t(
        lang,
        "Insulin-naïve patient — fasting glucose is not elevated",
        "Bệnh nhân chưa dùng Insulin — đường huyết đói hiện không cao"
      );
      medicationOrder = {
        primaryText: t(
          lang,
          `HOLD NovoMix 30 initiation at this time (BG = ${bg} mg/dL).`,
          `KHÔNG tiêm khởi đầu Novomix 30 tại thời điểm này (BG = ${bg} mg/dL).`
        ),
        bullets: [
          t(
            lang,
            "Continue pre-meal capillary blood glucose monitoring.",
            "Tiếp tục theo dõi đường huyết mao mạch trước các bữa ăn chính."
          ),
        ],
        tone: "ok",
      };
      timeline = [
        {
          time: t(lang, "11:30 Pre-lunch", "11h30 trưa"),
          desc: t(lang, "Recheck BG before lunch", "Kiểm tra lại đường huyết trước ăn trưa"),
          critical: false,
        },
      ];
      regimenAdjustment = {
        primaryText: t(
          lang,
          "Maintain pre-meal capillary glucose monitoring.",
          "Duy trì theo dõi đường huyết trước các bữa ăn chính."
        ),
        bullets: [],
        tone: "info",
      };
    } else {
      const corrObj =
        bg >= 300
          ? getUnifiedCorrectionActrapid(
              bg,
              effectiveTdd,
              isHighRisk,
              traj,
              { tpRole: "premeal", mode: "06h" },
              lang
            )
          : { finalDose: 0, steps: [] as string[] };
      statusTone = bg > 350 ? "danger" : bg >= 300 ? "warning" : "info";
      statusTag =
        bg > 350
          ? t(
              lang,
              "Severe Hyperglycemia — Screen DKA/HHS (> 350)",
              "Tăng Đường Huyết Nặng — Tầm Soát DKA/HHS (> 350)"
            )
          : t(lang, "Insulin-Naïve Initiation", "Khởi Trị Insulin Mới");
      statusTitle =
        bg > 350
          ? t(
              lang,
              "Severe hyperglycemia in insulin-naïve patient — rule out DKA/HHS before SC premixed!",
              "Tăng đường huyết nặng ở ca mới — loại trừ DKA/HHS trước khi tiêm Novomix!"
            )
          : t(
              lang,
              "Recommended split-mixed NovoMix 30 initiation (2/3 AM – 1/3 PM)",
              "Đề xuất liều khởi trị Novomix 30 hai cử (2/3 Sáng – 1/3 Chiều)"
            );
      sugNovomix = initMorn;
      sugActrapid = corrObj.finalDose;

      const naiveSteps = [
        t(
          lang,
          `Estimated TDD (${factor} u/kg × ${inputs.weight} kg): ${effectiveTdd} units/day.`,
          `Tổng liều khởi đầu ước tính (${factor} units/kg × ${inputs.weight} kg): ${effectiveTdd} units/ngày.`
        ),
        t(
          lang,
          `Split per JBDS Appendix 1 (2/3 AM – 1/3 PM): Morning ${initMorn} units, Evening ${initEve} units.`,
          `Chia liều theo JBDS Appendix 1 (2/3 Sáng – 1/3 Chiều): Sáng ${initMorn} units, Chiều ${initEve} units.`
        ),
      ].concat(corrObj.steps);

      medicationOrder = {
        primaryText:
          (bg > 350
            ? t(
                lang,
                `If non-ketotic: Inject ${initMorn} units NovoMix 30 SC`,
                `Nếu không toan ceton: Tiêm dưới da ${initMorn} units Novomix 30`
              )
            : t(
                lang,
                `Inject ${initMorn} units NovoMix 30 SC`,
                `Tiêm dưới da ${initMorn} units Novomix 30`
              )) +
          (corrObj.finalDose > 0
            ? t(
                lang,
                ` + ${corrObj.finalDose} units Actrapid SC (separate sites ≥ 5 cm apart).`,
                ` + ${corrObj.finalDose} units Actrapid (SC) (2 vị trí cách xa ≥ 5 cm).`
              )
            : t(
                lang,
                " (no extra Actrapid required).",
                " (không cần thêm Actrapid)."
              )),
        bullets:
          bg > 350
            ? [
                t(
                  lang,
                  "STAT LABS REQUIRED: Blood ketones (β-OHB), venous blood gas, and electrolytes.",
                  "BẮT BUỘC XÉT NGHIỆM CETON MÁU (β-OHB), KHÍ MÁU & ĐIỆN GIẢI ĐỒ NGAY."
                ),
                t(
                  lang,
                  "If Ketones ≥ 3.0 mmol/L or Osmolality ≥ 320 mOsm/kg: STOP NovoMix and switch to Mode 3 (DKA / HHS Emergency)!",
                  "Nếu Ceton ≥ 3.0 mmol/L hoặc ALTT ≥ 320 mOsm/kg: Ngưng Novomix! Chuyển ngay sang Tab 3 (Cấp cứu DKA / HHS)."
                ),
              ]
            : [],
        detailsTitle: t(
          lang,
          "View initiation calculation details",
          "Xem chi tiết cách tính liều khởi trị"
        ),
        detailSteps: naiveSteps,
        tone: statusTone,
      };
      timeline = [
        ...(bg > 350
          ? [
              {
                time: t(lang, "08:30 (In 2h)", "Sau 2 giờ (08h30)"),
                desc: t(
                  lang,
                  "Recheck BG and review ketone/blood gas results",
                  "Đo lại đường huyết và kiểm tra kết quả Ceton/Khí máu"
                ),
                critical: true,
              },
            ]
          : []),
        {
          time: t(lang, "11:30 Pre-lunch", "11h30 trưa"),
          desc: t(
            lang,
            "Evaluate morning initiation response",
            "Đánh giá đáp ứng mũi khởi trị buổi sáng"
          ),
          critical: true,
        },
        {
          time: t(lang, "18:00 Pre-dinner", "18h00 chiều"),
          desc: t(
            lang,
            `Check before dinner for planned evening dose (${initEve} units)`,
            `Đo trước ăn tối để tiêm cử chiều dự kiến (${initEve} units)`
          ),
          critical: true,
        },
      ];
      regimenAdjustment = {
        primaryText: t(
          lang,
          `Planned evening NovoMix 30 dose (18:00): ${initEve} units.`,
          `Dự kiến liều Novomix 30 cử chiều (18h00): ${initEve} units.`
        ),
        bullets: [],
        tone: "info",
      };
    }

    return {
      kind: "inpatient",
      status: { tone: statusTone, tag: statusTag, title: statusTitle },
      effectiveTdd,
      rawTdd,
      isf,
      traj,
      warningBanner,
      medicationOrder,
      nutritionPlan: buildDynamicNutritionPlan(
        inputs,
        traj,
        sugNovomix,
        sugActrapid,
        lang
      ),
      timeline,
      regimenAdjustment,
      suggestedActrapid: sugActrapid,
      suggestedNovomix: sugNovomix,
    };
  }

  if (tp === "t0") {
    if (bg < 70) {
      statusTone = "danger";
      statusTag = t(
        lang,
        "Fasting Hypoglycemia (< 70 mg/dL)",
        "Hạ Đường Huyết Đói Cấp Cứu (< 70 mg/dL)"
      );
      statusTitle = t(
        lang,
        "Overnight hypoglycemia from evening Protamine component!",
        "Tụt đường huyết ban đêm do dư thành phần Protamine nền cử chiều!"
      );
      const redMorn = isHighRisk
        ? 0
        : adjustDoseWithGuarantee(doseMorn, 0.5, "down");
      const nextEve = adjustDoseWithGuarantee(doseEve, 0.8, "down");
      sugNovomix = redMorn;

      medicationOrder = {
        primaryText: t(
          lang,
          "HOLD morning NovoMix 30 immediately! Execute Rule of 15 rescue.",
          "TẠM NGƯNG NGAY Novomix 30 cử sáng! Xử trí cấp cứu Quy tắc 15 ngay lập tức."
        ),
        bullets: [
          t(
            lang,
            "Step 1 (Rescue): Give 15–20 g fast oral glucose, or 30–50 mL IV 30% Dextrose if obtunded.",
            "Bước 1 (Cấp cứu): Uống 15–20g đường nhanh hoặc tiêm TM 30–50 mL Glucose 30% nếu lơ mơ."
          ),
          t(
            lang,
            `Step 2 (Once BG ≥ 100 mg/dL & breakfast eaten): ${isHighRisk || doseMorn === 0 ? "Omit morning dose completely (0 units)." : `Give 50% reduced dose = ${redMorn} units NovoMix 30 immediately AFTER meal.`}`,
            `Bước 2 (Khi BG ≥ 100 mg/dL & ăn hết sáng): ${isHighRisk || doseMorn === 0 ? "Ngưng hẳn cử sáng nay (0 units)." : `Chỉ tiêm liều giảm 50% = ${redMorn} units Novomix 30 ngay sau khi ăn xong.`}`
          ),
        ],
        detailsTitle: t(
          lang,
          `50% reduction rationale (${doseMorn} → ${redMorn} units)`,
          `Xem lý do giảm 50% liều sáng (${doseMorn} → ${redMorn} units)`
        ),
        detailSteps: [
          t(
            lang,
            `Current morning NovoMix 30: ${doseMorn} units.`,
            `Liều Novomix sáng đang dùng: ${doseMorn} units.`
          ),
          isHighRisk
            ? t(
                lang,
                "High-risk group with fasting hypoglycemia (< 70 mg/dL): omit morning dose completely (0 units).",
                "Nhóm nguy cơ cao bị hạ đường huyết đói (< 70 mg/dL): ngưng hoàn toàn cử sáng (0 units)."
              )
            : t(
                lang,
                `50% reduction after acute hypoglycemia to prevent midday recurrence: ${redMorn} units.`,
                `Giảm 50% liều cử sáng sau biến cố hạ đường huyết cấp để phòng tụt đường buổi trưa: ${redMorn} units.`
              ),
        ],
        tone: "danger",
      };
      timeline = [
        {
          time: t(lang, "In 15 min", "Sau 15 phút"),
          desc: t(
            lang,
            "Recheck capillary BG until ≥ 100 mg/dL",
            "Thử lại đường huyết mao mạch đến khi ≥ 100 mg/dL"
          ),
          critical: true,
        },
        {
          time: t(lang, "11:30 Pre-lunch", "11h30 trưa"),
          desc: t(
            lang,
            "Mandatory pre-lunch recheck",
            "Bắt buộc đo lại trước bữa ăn trưa"
          ),
          critical: true,
        },
      ];
      regimenAdjustment = {
        primaryText:
          doseEve > 0
            ? t(
                lang,
                `MANDATORY 20% reduction of tonight's 18:00 NovoMix 30: ${doseEve} → ${nextEve} units.`,
                `BẮT BUỘC GIẢM 20% LIỀU NOVOMIX CỬ CHIỀU (18h00) HÔM NAY: Hạ từ ${doseEve} xuống ${nextEve} units.`
              )
            : t(
                lang,
                "No evening NovoMix 30 scheduled; review other hypoglycemic agents.",
                "Không có liều Novomix chiều; rà soát các thuốc hạ đường huyết khác."
              ),
        bullets: [],
        tone: "danger",
      };
    } else if (bg <= 99) {
      statusTone = "warning";
      statusTag = t(
        lang,
        "Borderline Low (70–99 mg/dL)",
        "Sát Ngưỡng Hạ Đường (70–99 mg/dL)"
      );
      statusTitle = t(
        lang,
        "Low-normal fasting BG — reduce morning dose 20% and inject post-meal",
        "Đường huyết đói thấp sát ngưỡng — giảm 20% liều sáng và tiêm sau ăn"
      );
      const red20Morn = adjustDoseWithGuarantee(doseMorn, 0.8, "down");
      const nextEve20 = adjustDoseWithGuarantee(doseEve, 0.8, "down");
      sugNovomix = red20Morn;

      medicationOrder = {
        primaryText: t(
          lang,
          `Inject ${red20Morn} units NovoMix 30 SC immediately AFTER finishing breakfast. No Actrapid.`,
          `Tiêm dưới da ${red20Morn} units Novomix 30 ngay SAU KHI ăn sáng xong. Không tiêm Actrapid.`
        ),
        bullets: [],
        detailsTitle: t(
          lang,
          `20% reduction details (${doseMorn} → ${red20Morn} units)`,
          `Xem chi tiết hiệu chỉnh (Giảm 20% từ ${doseMorn} → ${red20Morn} units)`
        ),
        detailSteps: [
          t(
            lang,
            `Borderline fasting BG (${bg} mg/dL): reduce morning NovoMix 30 by 20% (${doseMorn} → ${red20Morn} units).`,
            `Đường huyết đói sát ngưỡng hạ đường (${bg} mg/dL): giảm 20% liều Novomix sáng từ ${doseMorn} xuống ${red20Morn} units.`
          ),
        ],
        tone: "warning",
      };
      timeline = [
        {
          time: t(lang, "11:30 Pre-lunch", "11h30 trưa"),
          desc: t(
            lang,
            "Check before lunch",
            "Đo kiểm tra trước bữa ăn trưa"
          ),
          critical: true,
        },
      ];
      regimenAdjustment = {
        primaryText: t(
          lang,
          `Reduce 18:00 evening NovoMix 30 by 20%: ${doseEve} → ${nextEve20} units to prevent overnight hypoglycemia.`,
          `Giảm 20% liều Novomix cử chiều (18h00): hạ từ ${doseEve} xuống ${nextEve20} units để phòng hạ đường đêm.`
        ),
        bullets: [],
        tone: "warning",
      };
    } else if (bg <= 180) {
      const isDroppingFast = traj.hasPrior && traj.isRapidDrop;
      statusTone = isDroppingFast ? "warning" : "ok";
      statusTag = isDroppingFast
        ? t(
            lang,
            `Rapid Drop (${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h) — Caution`,
            `Đang Giảm Nhanh (${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h) — Thận Trọng`
          )
        : bg <= 139
        ? t(
            lang,
            "At Fasting Target (100–139 mg/dL)",
            "Đạt Mục Tiêu Đói (100–139 mg/dL)"
          )
        : t(
            lang,
            "Inpatient Target Met (140–180 mg/dL)",
            "Đạt Chuẩn Nội Viện ADA (140–180 mg/dL)"
          );
      statusTitle = isDroppingFast
        ? t(
            lang,
            "BG in target range but falling rapidly overnight!",
            "Đường huyết trong khoảng mục tiêu nhưng vừa hạ nhanh từ đêm!"
          )
        : t(
            lang,
            "Fasting glucose well controlled within target",
            "Đường huyết đói kiểm soát tốt trong vùng mục tiêu"
          );
      const useMorn =
        (bg <= 139 && isHighRisk) || isDroppingFast
          ? adjustDoseWithGuarantee(effectiveDoseMorn, 0.85, "down")
          : effectiveDoseMorn;
      sugNovomix = useMorn;

      const steps100 = baseNovoSteps.slice();
      if (isDroppingFast) {
        steps100.push(
          t(
            lang,
            `Rapid overnight fall (${traj.lastBg} → ${bg} mg/dL at ${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h ≥ 50 mg/dL/h): apply 15% protective reduction → ${useMorn} units.`,
            `Đường huyết hạ nhanh từ mốc trước (${traj.lastBg} → ${bg} mg/dL, tốc độ ${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h ≥ 50 mg/dL/h): giảm bảo vệ 15% xuống ${useMorn} units.`
          )
        );
      } else if (bg <= 139 && isHighRisk) {
        steps100.push(
          t(
            lang,
            `BG 100–139 mg/dL in high-risk patient: apply 15% protective reduction → ${useMorn} units.`,
            `Do BG 100–139 mg/dL ở bệnh nhân nguy cơ cao: giảm bảo vệ 15% liều sáng xuống ${useMorn} units.`
          )
        );
      }

      medicationOrder = {
        primaryText: t(
          lang,
          `Inject ${useMorn} units NovoMix 30 SC ${isDroppingFast ? "at meal start" : "before breakfast"}. No Actrapid.`,
          `Tiêm dưới da ${useMorn} units Novomix 30 ${isDroppingFast ? "ngay khi bắt đầu ăn sáng" : "trước ăn sáng"}. Không tiêm Actrapid.`
        ),
        bullets: [],
        detailsTitle:
          useMorn !== doseMorn
            ? t(
                lang,
                `Dose adjustment rationale (${doseMorn} → ${useMorn} units)`,
                `Xem lý do điều chỉnh liều (${doseMorn} → ${useMorn} units)`
              )
            : undefined,
        detailSteps: steps100,
        tone: statusTone,
      };
      timeline = [
        {
          time: t(lang, "11:30 Pre-lunch", "11h30 trưa"),
          desc: t(
            lang,
            "Recheck before lunch",
            "Đo trước ăn trưa để đánh giá tiếp"
          ),
          critical: isDroppingFast,
        },
      ];
      regimenAdjustment = {
        primaryText: t(
          lang,
          "Maintain current regimen. Switch to Mode 2 (18:00) for evening shift.",
          "Duy trì phác đồ hiện tại. Khi đến ca chiều, chuyển sang Tab 2 (18h00)."
        ),
        bullets: [],
        tone: "info",
      };
    } else if (bg <= 249) {
      statusTone = "info";
      statusTag = t(
        lang,
        "Mild Fasting Hyperglycemia (181–249 mg/dL)",
        "Tăng Đường Huyết Đói Nhẹ (181–249 mg/dL)"
      );
      statusTitle = t(
        lang,
        "Mild-to-moderate fasting hyperglycemia",
        "Tăng đường huyết đói mức độ nhẹ – vừa"
      );
      const incEve15 = adjustDoseWithGuarantee(doseEve, 1.15, "up");
      const decEve20 = adjustDoseWithGuarantee(doseEve, 0.8, "down");
      sugNovomix = effectiveDoseMorn;

      medicationOrder = {
        primaryText: t(
          lang,
          `Inject ${effectiveDoseMorn} units NovoMix 30 SC before breakfast. No extra Actrapid.`,
          `Tiêm dưới da ${effectiveDoseMorn} units Novomix 30 trước ăn sáng. Không tiêm thêm Actrapid.`
        ),
        bullets: [],
        detailsTitle:
          effectiveDoseMorn !== doseMorn
            ? t(
                lang,
                `Protective reduction details (${doseMorn} → ${effectiveDoseMorn} units)`,
                `Xem lý do giảm liều bảo vệ (${doseMorn} → ${effectiveDoseMorn} units)`
              )
            : undefined,
        detailSteps: baseNovoSteps,
        tone: "info",
      };
      timeline = [
        {
          time: t(lang, "11:30 Pre-lunch", "11h30 trưa"),
          desc: t(lang, "Recheck before lunch", "Đo lại trước bữa trưa"),
          critical: false,
        },
      ];
      regimenAdjustment =
        traj.hasPrior && traj.hadRecentHypo
          ? {
              primaryText: t(
                lang,
                `Overnight hypoglycemia detected (Somogyi): MUST reduce evening NovoMix 30 by 20% (${doseEve} → ${decEve20} units).`,
                `Do đêm qua có hạ đường huyết (Somogyi): Bắt buộc GIẢM 20% liều Novomix cử chiều từ ${doseEve} xuống ${decEve20} units!`
              ),
              bullets: [],
              tone: "danger",
            }
          : {
              primaryText: t(
                lang,
                `If fasting BG stays in this range ≥ 2 consecutive days (without 02:00 hypoglycemia): increase evening NovoMix 30 by 15% to ${incEve15} units.`,
                `Nếu đường huyết đói cao mức này ≥ 2 ngày liên tiếp (và không hạ đường lúc 02h sáng): tăng 15% liều Novomix cử chiều lên ${incEve15} units.`
              ),
              bullets: [],
              tone: "info",
            };
    } else if (bg <= 350) {
      statusTone = "warning";
      statusTag = t(
        lang,
        "Significant Hyperglycemia (250–350 mg/dL)",
        "Tăng Đường Huyết Rõ (250–350 mg/dL)"
      );
      statusTitle = t(
        lang,
        "Add Actrapid correction and rule out Somogyi effect",
        "Phối hợp Actrapid hiệu chỉnh và loại trừ hiệu ứng Somogyi"
      );
      const corrMorn = getUnifiedCorrectionActrapid(
        bg,
        effectiveTdd,
        isHighRisk,
        traj,
        { tpRole: "premeal", mode: "06h" },
        lang
      );
      const incMorn15 = adjustDoseWithGuarantee(effectiveDoseMorn, 1.15, "up");
      sugNovomix = effectiveDoseMorn;
      sugActrapid = corrMorn.finalDose;

      medicationOrder = {
        primaryText:
          t(
            lang,
            `Inject ${effectiveDoseMorn} units NovoMix 30 SC`,
            `Tiêm dưới da ${effectiveDoseMorn} units Novomix 30`
          ) +
          (corrMorn.finalDose > 0
            ? t(
                lang,
                ` + ${corrMorn.finalDose} units Actrapid SC (separate sites ≥ 5 cm apart).`,
                ` + ${corrMorn.finalDose} units Actrapid (SC) (2 vị trí cách xa ≥ 5 cm).`
              )
            : t(
                lang,
                " (Hold extra Actrapid due to active IOB / rapid drop).",
                " (Không tiêm thêm Actrapid do đã khấu trừ IOB tồn lưu / đà giảm nhanh)."
              )),
        bullets: [
          t(
            lang,
            `Alternative single-injection option: give ${incMorn15} units NovoMix 30 alone (no Actrapid).`,
            `Phương án thay thế nếu hạn chế mũi tiêm: chỉ tiêm 1 mũi Novomix 30 = ${incMorn15} units (không tiêm Actrapid).`
          ),
        ],
        detailsTitle: corrMorn.summaryTitle,
        detailSteps: baseNovoSteps.concat(corrMorn.steps),
        tone: "warning",
      };
      timeline = [
        {
          time: t(lang, "11:30 Pre-lunch", "11h30 trưa"),
          desc: t(
            lang,
            "Mandatory pre-lunch recheck",
            "Bắt buộc đo lại trước bữa ăn trưa"
          ),
          critical: true,
        },
      ];
      regimenAdjustment = {
        primaryText: t(
          lang,
          "Check 02:00 BG tonight to rule out Somogyi rebound before escalating evening NovoMix 30.",
          "Kiểm tra đường huyết lúc 02h00 sáng đêm tới để loại trừ Hiệu ứng Somogyi trước khi tăng liều Novomix chiều."
        ),
        bullets: [],
        tone: "info",
      };
    } else {
      statusTone = "danger";
      statusTag = t(
        lang,
        "Severe Hyperglycemia (> 350 mg/dL)",
        "Tăng Đường Huyết Nặng (> 350 mg/dL)"
      );
      statusTitle = t(
        lang,
        "DKA / HHS risk — check blood ketones & electrolytes stat!",
        "Cảnh báo nguy cơ DKA / HHS — cần xét nghiệm Ceton máu & Điện giải ngay!"
      );
      const corrHeavy = getUnifiedCorrectionActrapid(
        bg,
        effectiveTdd,
        isHighRisk,
        traj,
        { tpRole: "premeal", mode: "06h" },
        lang
      );
      sugNovomix = effectiveDoseMorn;
      sugActrapid = corrHeavy.finalDose;

      medicationOrder = {
        primaryText:
          t(
            lang,
            `If non-ketotic: Inject ${effectiveDoseMorn} units NovoMix 30 SC`,
            `Nếu không toan ceton: Tiêm ${effectiveDoseMorn} units Novomix 30`
          ) +
          (corrHeavy.finalDose > 0
            ? ` + ${corrHeavy.finalDose} units Actrapid SC.`
            : "."),
        bullets: [
          t(
            lang,
            "STAT LABS REQUIRED: Blood ketones (β-OHB), venous blood gas, and electrolytes.",
            "BẮT BUỘC XÉT NGHIỆM CETON MÁU (β-OHB), KHÍ MÁU & ĐIỆN GIẢI ĐỒ NGAY."
          ),
          t(
            lang,
            "If Ketones ≥ 3.0 mmol/L or Osmolality ≥ 320 mOsm/kg: STOP NovoMix and switch to Mode 3 (DKA / HHS Emergency)!",
            "Nếu Ceton ≥ 3.0 mmol/L hoặc ALTT ≥ 320 mOsm/kg: Ngưng Novomix! Chuyển ngay sang Tab 3 (Cấp cứu DKA / HHS)."
          ),
        ],
        detailsTitle: corrHeavy.summaryTitle,
        detailSteps: baseNovoSteps.concat(corrHeavy.steps),
        tone: "danger",
      };
      timeline = [
        {
          time: t(lang, "08:30 (In 2h)", "Sau 2 giờ (08h30)"),
          desc: t(
            lang,
            "Recheck BG and review ketone results",
            "Đo lại đường huyết mao mạch và kiểm tra kết quả Ceton"
          ),
          critical: true,
        },
      ];
      regimenAdjustment = {
        primaryText: t(
          lang,
          "Consider transitioning to 4-injection Basal-Bolus or IV insulin depending on blood gas results.",
          "Xem xét chuyển sang phác đồ Basal-Bolus 4 mũi hoặc Bơm tiêm điện tùy kết quả khí máu."
        ),
        bullets: [],
        tone: "danger",
      };
    }
  } else if (tp === "t1") {
    statusTag = t(
      lang,
      "08:30 (2h Post-Breakfast)",
      "Mốc 08h30 (Sau Ăn Sáng 2 Giờ)"
    );
    const corr08 = getUnifiedCorrectionActrapid(
      bg,
      effectiveTdd,
      isHighRisk,
      traj,
      { tpRole: "postmeal_2h", mode: "06h" },
      lang
    );
    sugActrapid = corr08.finalDose;

    if (bg < 70) {
      statusTone = "danger";
      statusTitle = t(
        lang,
        "Early post-breakfast hypoglycemia (< 70 mg/dL)!",
        "Cấp cứu hạ đường huyết sớm sau ăn sáng (< 70 mg/dL)!"
      );
      medicationOrder = {
        primaryText: t(
          lang,
          "EMERGENCY POST-MEAL HYPOGLYCEMIA: Give 15–20 g fast oral glucose or 30–50 mL IV 30% Dextrose immediately!",
          "CẤP CỨU HẠ ĐƯỜNG HUYẾT SỚM SAU ĂN: Uống ngay 15–20g đường nhanh hoặc tiêm TM Glucose 30%!"
        ),
        bullets: [],
        tone: "danger",
      };
    } else if (bg < 250) {
      const isDropWarn =
        traj.hasPrior && (traj.isRapidDrop || traj.isIobInducedHypoRisk);
      statusTone = isDropWarn ? "warning" : "ok";
      statusTitle = isDropWarn
        ? traj.isRapidDrop
          ? t(
              lang,
              `BG dropping rapidly (${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h) — pre-lunch hypoglycemia risk!`,
              `Đường huyết đang hạ nhanh (${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h) — nguy cơ tụt đường trước trưa!`
            )
          : t(
              lang,
              `~${traj.iob.activeUnits} units IOB still active — risk of pre-lunch drop!`,
              `Đường huyết có nguy cơ hạ thấp do còn ~${traj.iob.activeUnits} units IOB!`
            )
        : t(
            lang,
            "2h post-breakfast glucose stable",
            "Đường huyết sau ăn sáng 2 giờ ổn định"
          );
      medicationOrder = {
        primaryText: isDropWarn
          ? t(
              lang,
              `NO extra insulin. ${traj.isRapidDrop ? `Rapid drop (${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h)` : `~${traj.iob.activeUnits} u IOB active`} — give slow carb snack!`,
              `KHÔNG tiêm thêm Insulin. ${traj.isRapidDrop ? `Đường huyết vừa hạ nhanh (${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h)` : `Còn ~${traj.iob.activeUnits} units IOB`} — cần ăn nhẹ bù Carb chậm!`
            )
          : t(
              lang,
              `NO extra insulin at 08:30 (stable BG = ${bg} mg/dL).`,
              `KHÔNG tiêm thêm Insulin lúc 08h30 (BG ổn định = ${bg} mg/dL).`
            ),
        bullets: [],
        detailsTitle: corr08.summaryTitle,
        detailSteps: corr08.steps,
        tone: statusTone,
      };
    } else {
      statusTone = corr08.finalDose > 0 ? (bg > 350 ? "danger" : "warning") : "info";
      statusTitle = t(
        lang,
        "2h post-breakfast evaluation & active IOB check",
        "Đánh giá sau ăn sáng 2 giờ & tính toán liều tồn lưu (Active IOB)"
      );
      medicationOrder = {
        primaryText:
          corr08.finalDose > 0
            ? t(
                lang,
                `Give ${corr08.finalDose} units Actrapid SC (BG ${bg} mg/dL exceeds active IOB).`,
                `Tiêm bổ sung ${corr08.finalDose} units Actrapid (SC) (do BG tăng rất cao ${bg} mg/dL vượt quá IOB hiện có).`
              )
            : t(
                lang,
                `HOLD extra Actrapid at 08:30 (~${traj.hasPrior ? traj.iob.activeUnits : 0} units IOB from 06:00 still lowering BG).`,
                `KHÔNG tiêm bồi thêm Actrapid lúc 08h30 (đang còn ~${traj.hasPrior ? traj.iob.activeUnits : 0} units IOB từ mũi 06h00 đang hạ đường huyết).`
              ),
        bullets:
          bg > 350
            ? [
                t(
                  lang,
                  "BG > 350 mg/dL alert: check capillary blood ketones immediately to rule out early DKA.",
                  "Cảnh báo BG > 350 mg/dL: cần xét nghiệm Ceton máu mao mạch ngay để loại trừ DKA sớm."
                ),
              ]
            : [
                t(
                  lang,
                  "Reassess accurately at 11:30 pre-lunch once morning peak subsides.",
                  "Chờ đánh giá chính xác tại mốc 11h30 trưa khi mũi sáng đã qua đỉnh."
                ),
              ],
        detailsTitle: corr08.summaryTitle,
        detailSteps: corr08.steps,
        tone: statusTone,
      };
    }

    timeline = [
      {
        time: t(lang, "11:30 Pre-lunch", "11h30 trưa"),
        desc: t(
          lang,
          "Check BG before lunch",
          "Đo đường huyết trước bữa ăn trưa"
        ),
        critical: true,
      },
    ];
    regimenAdjustment = {
      primaryText: t(
        lang,
        "Reassess efficacy at 11:30 pre-lunch.",
        "Đánh giá lại hiệu quả tại mốc 11h30 trước ăn trưa."
      ),
      bullets: [],
      tone: "info",
    };
  } else {
    // 11:30 Pre-lunch
    statusTag = t(lang, "11:30 (Pre-Lunch)", "Mốc 11h30 (Trước Bữa Ăn Trưa)");
    const lunchCorr = getUnifiedCorrectionActrapid(
      bg,
      effectiveTdd,
      isHighRisk,
      traj,
      { tpRole: "premeal", mode: "06h" },
      lang
    );
    sugActrapid = lunchCorr.finalDose;

    if (bg < 70) {
      statusTone = "danger";
      statusTitle = t(
        lang,
        "Pre-lunch hypoglycemia — treat immediately!",
        "Hạ đường huyết trước ăn trưa — cần cấp cứu ngay!"
      );
      medicationOrder = {
        primaryText: t(
          lang,
          "Treat Hypoglycemia (Rule of 15) immediately! DO NOT inject pre-lunch insulin.",
          "Xử trí Hạ Đường Huyết (Quy tắc 15) ngay lập tức! KHÔNG tiêm insulin cử trưa."
        ),
        bullets: [],
        tone: "danger",
      };
      timeline = [
        {
          time: t(lang, "In 15 min", "Sau 15 phút"),
          desc: t(
            lang,
            "Recheck BG until ≥ 100 mg/dL",
            "Kiểm tra lại BG đến khi ≥ 100 mg/dL"
          ),
          critical: true,
        },
      ];
      regimenAdjustment = {
        primaryText: t(
          lang,
          "Reduce tomorrow's morning NovoMix 30 by 15–20%.",
          "Giảm 15–20% liều Novomix cử sáng vào ngày hôm sau."
        ),
        bullets: [],
        tone: "danger",
      };
    } else if (bg <= 99) {
      statusTone = "warning";
      statusTitle = t(
        lang,
        "Borderline low pre-lunch glucose",
        "Đường huyết trước trưa thấp sát ngưỡng"
      );
      medicationOrder = {
        primaryText: t(
          lang,
          `NO pre-lunch insulin (borderline BG = ${bg} mg/dL).`,
          `KHÔNG tiêm thêm insulin buổi trưa (BG sát ngưỡng hạ đường = ${bg} mg/dL).`
        ),
        bullets: [],
        detailsTitle: lunchCorr.summaryTitle,
        detailSteps: lunchCorr.steps,
        tone: "warning",
      };
      timeline = [
        {
          time: t(lang, "14:00 (2h post-lunch)", "14h00 chiều"),
          desc: t(
            lang,
            "Optional 2h post-lunch check",
            "Đo sau ăn trưa 2h nếu cần theo dõi"
          ),
          critical: false,
        },
      ];
      regimenAdjustment = {
        primaryText: t(
          lang,
          "If recurrent, consider reducing morning NovoMix 30 by 10%.",
          "Nếu tái diễn thường xuyên, xem xét giảm liều Novomix sáng 10%."
        ),
        bullets: [],
        tone: "info",
      };
    } else if (bg <= 249) {
      const isDropWarn =
        traj.hasPrior && (traj.isRapidDrop || traj.isIobInducedHypoRisk);
      statusTone = isDropWarn ? "warning" : "ok";
      statusTitle = isDropWarn
        ? traj.isRapidDrop
          ? t(
              lang,
              `Pre-lunch BG dropping fast (${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h) — feed lunch on time!`,
              `Đường huyết trước trưa đang hạ nhanh (${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h) — cho ăn trưa đúng giờ!`
            )
          : t(
              lang,
              `~${traj.iob.activeUnits} u IOB active — feed lunch on time!`,
              `Đường huyết trước trưa có xu hướng giảm do còn ~${traj.iob.activeUnits} units IOB — cho ăn trưa đúng giờ!`
            )
        : t(
            lang,
            "Pre-lunch glucose within inpatient target",
            "Đường huyết trước trưa đạt mục tiêu nội viện"
          );
      medicationOrder = {
        primaryText: t(
          lang,
          `NO pre-lunch insulin (BG = ${bg} mg/dL${traj.isRapidDrop ? `, falling ${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h` : ""}).`,
          `KHÔNG tiêm thêm insulin buổi trưa (BG = ${bg} mg/dL${traj.isRapidDrop ? `, vừa hạ nhanh ${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h` : ""}).`
        ),
        bullets: [],
        detailsTitle: lunchCorr.summaryTitle,
        detailSteps: lunchCorr.steps,
        tone: statusTone,
      };
      timeline = [
        {
          time: t(lang, "18:00 Evening Shift", "Ca chiều (18h00)"),
          desc: t(
            lang,
            "Switch to Mode 2 (18:00) for pre-dinner evaluation",
            'Chuyển sang Tab "2. Trực Chiều 18h00" để xử trí cử tối'
          ),
          critical: true,
        },
      ];
      regimenAdjustment = {
        primaryText: t(
          lang,
          "Morning NovoMix 30 is controlling midday glucose well.",
          "Liều Novomix cử sáng đang kiểm soát tốt cho bữa trưa."
        ),
        bullets: [],
        tone: "info",
      };
    } else if (bg <= 350) {
      statusTone = "warning";
      statusTitle = t(
        lang,
        "Pre-lunch hyperglycemia — give correctional Actrapid",
        "Tăng đường huyết trước trưa — tiêm Actrapid hiệu chỉnh"
      );
      medicationOrder = {
        primaryText:
          lunchCorr.finalDose > 0
            ? t(
                lang,
                `Inject ${lunchCorr.finalDose} units Actrapid SC 15 minutes before lunch.`,
                `Tiêm dưới da ${lunchCorr.finalDose} units Actrapid (SC) trước ăn trưa 15 phút.`
              )
            : t(
                lang,
                "Hold extra Actrapid now (rapidly falling BG or significant active IOB).",
                "Tạm hoãn tiêm thêm Actrapid lúc này (đường huyết đang giảm nhanh hoặc còn nhiều IOB tồn lưu)."
              ),
        bullets: [],
        detailsTitle: lunchCorr.summaryTitle,
        detailSteps: lunchCorr.steps,
        tone: "warning",
      };
      timeline = [
        {
          time: t(lang, "14:00 (2h post-lunch)", "14h00 chiều"),
          desc: t(lang, "Check 2h post-lunch BG", "Đo kiểm tra sau ăn trưa 2 giờ"),
          critical: true,
        },
        {
          time: t(lang, "18:00 Evening Shift", "Ca chiều (18h00)"),
          desc: t(
            lang,
            "Evaluate pre-dinner in Mode 2",
            "Đánh giá trước ăn tối tại Tab 18h00"
          ),
          critical: true,
        },
      ];
      regimenAdjustment = {
        primaryText: t(
          lang,
          "If pre-lunch BG is repeatedly > 250 mg/dL, add scheduled pre-lunch Actrapid or transition to Basal-Bolus.",
          "Nếu đường huyết trưa thường xuyên > 250 mg/dL: thêm mũi Actrapid cố định buổi trưa hoặc đổi sang Basal-Bolus."
        ),
        bullets: [],
        tone: "info",
      };
    } else {
      statusTone = "danger";
      statusTitle = t(
        lang,
        "Pre-lunch DKA / HHS risk — check blood ketones & VBG stat!",
        "Cảnh báo nguy cơ DKA / HHS trước trưa — thử Ceton máu & Khí máu ngay!"
      );
      medicationOrder = {
        primaryText:
          lunchCorr.finalDose > 0
            ? t(
                lang,
                `If non-acidotic (Ketones < 1.0 mmol/L): Inject ${lunchCorr.finalDose} units Actrapid SC 15 min before lunch.`,
                `Nếu không toan (Ceton < 1.0 mmol/L): Tiêm dưới da ${lunchCorr.finalDose} units Actrapid (SC) trước ăn trưa 15 phút.`
              )
            : t(
                lang,
                "If non-acidotic: hold Actrapid due to rapid drop / high IOB and recheck in 2h.",
                "Nếu không toan: tạm hoãn tiêm Actrapid do đường huyết đang giảm rất nhanh hoặc còn IOB lớn; đo lại sau 2 giờ."
              ),
        bullets: [
          t(
            lang,
            "STAT LABS REQUIRED: Blood ketones (β-OHB), venous blood gas, and electrolytes.",
            "BẮT BUỘC XÉT NGHIỆM CETON MÁU (β-OHB), KHÍ MÁU & ĐIỆN GIẢI NGAY."
          ),
          t(
            lang,
            "If DKA (Ketones ≥ 3.0, pH < 7.30) or HHS (Osm ≥ 320): HOLD lunch and switch to Mode 3 (DKA / HHS Emergency)!",
            "Nếu có DKA (Ceton ≥ 3.0, pH < 7.3) hoặc HHS (ALTT ≥ 320): Tạm ngưng ăn trưa! Chuyển ngay sang Tab 3 (Cấp cứu DKA / HHS)."
          ),
        ],
        detailsTitle: lunchCorr.summaryTitle,
        detailSteps: lunchCorr.steps,
        tone: "danger",
      };
      timeline = [
        {
          time: t(lang, "13:30 (In 2h)", "Sau 2 giờ (13h30)"),
          desc: t(
            lang,
            "MANDATORY BG recheck & lab review",
            "BẮT BUỘC đo lại đường huyết mao mạch và kiểm tra kết quả xét nghiệm"
          ),
          critical: true,
        },
        {
          time: t(lang, "18:00 Evening Shift", "Ca chiều (18h00)"),
          desc: t(
            lang,
            "Switch to Mode 2 (18:00)",
            "Chuyển sang Tab 18h00 để theo dõi cử chiều"
          ),
          critical: true,
        },
      ];
      regimenAdjustment = {
        primaryText: t(
          lang,
          "Twice-daily NovoMix 30 is insufficient for daytime control; consult endocrinology for 4-injection Basal-Bolus.",
          "Phác đồ 2 mũi Novomix không đủ kiểm soát ban ngày; cần hội chẩn chuyển phác đồ Basal-Bolus 4 mũi."
        ),
        bullets: [],
        tone: "danger",
      };
    }
  }

  return {
    kind: "inpatient",
    status: { tone: statusTone, tag: statusTag, title: statusTitle },
    effectiveTdd,
    rawTdd,
    isf,
    traj,
    warningBanner,
    medicationOrder,
    nutritionPlan: buildDynamicNutritionPlan(
      inputs,
      traj,
      sugNovomix,
      sugActrapid,
      lang
    ),
    timeline,
    regimenAdjustment,
    suggestedActrapid: sugActrapid,
    suggestedNovomix: sugNovomix,
  };
}

export function computeEvening18h(
  inputs: InsulinInputs,
  traj: TrajectoryAnalysis,
  lang: InsulinLang
): InpatientEvaluation {
  const bg = inputs.bgMgDl;
  const { rawTdd, effectiveTdd, isf } = getEffectiveTddAndIsf(inputs);
  const doseEve = inputs.isNaive ? 0 : inputs.doseEve;
  const isHighRisk = inputs.isHighRisk;
  const tp = inputs.tp;

  const warningBanner = buildInpatientWarningBanner(inputs, lang);

  let effectiveDoseEve = doseEve;
  const baseEveSteps: string[] = [];
  if (traj.hasPrior && traj.hadRecentHypo && tp === "t0" && bg >= 100) {
    effectiveDoseEve = adjustDoseWithGuarantee(doseEve, 0.8, "down");
    baseEveSteps.push(
      t(
        lang,
        `Prior hypoglycemia detected (${traj.recentHypoLabel}, BG = ${traj.recentHypoBg} mg/dL): auto-reduced evening NovoMix 30 by 20% (${doseEve} → ${effectiveDoseEve} units) to prevent nocturnal hypoglycemia.`,
        `Phát hiện hạ đường huyết ở mốc trước (${traj.recentHypoLabel}, BG = ${traj.recentHypoBg} mg/dL): tự động giảm 20% liều Novomix cử chiều từ ${doseEve} xuống ${effectiveDoseEve} units để phòng tụt đường ban đêm.`
      )
    );
  }
  if (isHighRisk) {
    baseEveSteps.push(
      t(
        lang,
        "High-risk group (elderly / eGFR < 45 / poor intake): protective dose reduction and nocturnal checks enabled.",
        "Nhóm nguy cơ hạ đường huyết cao (cao tuổi / eGFR < 45 / ăn kém): áp dụng giảm liều bảo vệ và canh đêm."
      )
    );
  }

  let statusTone: ClinicalSeverity = "info";
  let statusTag = "";
  let statusTitle = "";
  let medicationOrder: DetailSection = { primaryText: "", bullets: [], tone: "info" };
  let timeline: TimelineEvent[] = [];
  let regimenAdjustment: DetailSection = { primaryText: "", bullets: [], tone: "info" };
  let sugNovomix = 0;
  let sugActrapid = 0;

  if (inputs.isNaive && tp === "t0") {
    const factor = isHighRisk ? 0.2 : 0.4;
    const initMorn = Math.round(effectiveTdd * (2 / 3));
    const initEve = Math.max(2, effectiveTdd - initMorn);

    if (bg < 70) {
      statusTone = "danger";
      statusTag = t(
        lang,
        "Acute Hypoglycemia (< 70 mg/dL)",
        "Hạ Đường Huyết Cấp (< 70 mg/dL)"
      );
      statusTitle = t(
        lang,
        "Insulin-naïve hypoglycemia — DO NOT initiate insulin; treat immediately!",
        "Hạ đường huyết ở bệnh nhân chưa dùng Insulin — KHÔNG khởi trị, cấp cứu ngay!"
      );
      medicationOrder = {
        primaryText: t(
          lang,
          "DO NOT initiate insulin! Execute Rule of 15 rescue (15–20 g fast oral glucose, or 30–50 mL IV 30% Dextrose if obtunded).",
          "KHÔNG khởi trị Insulin! Xử trí cấp cứu Quy tắc 15 ngay (uống 15–20g đường nhanh hoặc tiêm TM 30–50 mL Glucose 30% nếu lơ mơ)."
        ),
        bullets: [
          t(
            lang,
            "Screen non-insulin causes of hypoglycemia (sulfonylurea, sepsis, hepatic/renal failure, adrenal insufficiency, malnutrition).",
            "Tìm nguyên nhân hạ đường huyết ngoài insulin (sulfonylurea, nhiễm trùng huyết, suy gan/thận, suy thượng thận, suy kiệt)."
          ),
        ],
        tone: "danger",
      };
      timeline = [
        {
          time: t(lang, "In 15 min", "Sau 15 phút"),
          desc: t(
            lang,
            "Recheck capillary BG until ≥ 100 mg/dL",
            "Thử lại đường huyết mao mạch đến khi ≥ 100 mg/dL"
          ),
          critical: true,
        },
        {
          time: t(lang, "22:00 Bedtime", "22h00 đêm"),
          desc: t(
            lang,
            "Check BG before bedtime",
            "Kiểm tra lại đường huyết trước khi đi ngủ"
          ),
          critical: true,
        },
      ];
      regimenAdjustment = {
        primaryText: t(
          lang,
          "Hold insulin initiation; investigate underlying hypoglycemia etiology.",
          "Chưa khởi trị Insulin; tìm và xử trí nguyên nhân gây hạ đường huyết."
        ),
        bullets: [],
        tone: "danger",
      };
    } else if (bg < 180) {
      statusTone = "ok";
      statusTag = t(
        lang,
        "Defer Evening Initiation (< 180 mg/dL)",
        "Chưa Cần Khởi Trị Tối Nay (< 180 mg/dL)"
      );
      statusTitle = t(
        lang,
        "Insulin-naïve — avoid starting premixed insulin at night when BG < 180 mg/dL",
        "Bệnh nhân mới — tránh khởi trị mũi hỗn hợp vào buổi tối khi BG < 180 mg/dL"
      );
      medicationOrder = {
        primaryText: t(
          lang,
          `DO NOT start initial NovoMix 30 tonight (BG = ${bg} mg/dL < 180 mg/dL).`,
          `KHÔNG khởi trị mũi Novomix 30 lần đầu vào tối nay (BG = ${bg} mg/dL < 180 mg/dL).`
        ),
        bullets: [
          t(
            lang,
            "JBDS inpatient safety: avoid initiating premixed insulin in the evening for mild elevations to prevent nocturnal hypoglycemia.",
            "Theo khuyến cáo an toàn nội viện (JBDS): tránh khởi trị mũi insulin hỗn hợp đầu tiên vào buổi tối khi đường huyết không quá cao."
          ),
        ],
        tone: "ok",
      };
      timeline = [
        {
          time: t(lang, "06:00 Tomorrow", "06h00 sáng mai"),
          desc: t(
            lang,
            "Check fasting BG and initiate in the morning",
            "Đo đường huyết đói và khởi trị vào buổi sáng"
          ),
          critical: true,
        },
      ];
      regimenAdjustment = {
        primaryText: t(
          lang,
          `Planned morning initiation: ${initMorn} units NovoMix 30.`,
          `Dự kiến khởi trị sáng mai: ${initMorn} units Novomix 30.`
        ),
        bullets: [],
        tone: "info",
      };
    } else {
      const corrEveNaive =
        bg >= 300
          ? getUnifiedCorrectionActrapid(
              bg,
              effectiveTdd,
              isHighRisk,
              traj,
              { tpRole: "premeal", mode: "18h" },
              lang
            )
          : { finalDose: 0, steps: [] as string[] };
      statusTone = bg > 350 ? "danger" : "warning";
      statusTag =
        bg > 350
          ? t(
              lang,
              "Severe Hyperglycemia — Screen DKA/HHS (> 350)",
              "Tăng Đường Huyết Nặng — Tầm Soát DKA/HHS (> 350)"
            )
          : t(
              lang,
              "Evening Initiation (18:00)",
              "Khởi Trị Insulin Mới Cử Chiều (18h00)"
            );
      statusTitle =
        bg > 350
          ? t(
              lang,
              "Severe hyperglycemia in insulin-naïve patient — rule out DKA/HHS before SC premixed!",
              "Tăng đường huyết nặng ở ca mới — loại trừ DKA/HHS trước khi tiêm Novomix!"
            )
          : t(
              lang,
              "Initiate 1/3 TDD at dinner (with mandatory bedtime monitoring)",
              "Khởi đầu 1/3 tổng liều vào cử chiều tối (thận trọng canh đêm)"
            );
      sugNovomix = initEve;
      sugActrapid = corrEveNaive.finalDose;

      const naiveEveSteps = [
        t(
          lang,
          `Estimated TDD (${factor} u/kg/day): ${effectiveTdd} units/day.`,
          `Tổng liều TDD ước tính (${factor} units/kg/ngày): ${effectiveTdd} units/ngày.`
        ),
        t(
          lang,
          `Initial evening dose (1/3 TDD): ${initEve} units NovoMix 30.`,
          `Liều khởi đầu cử chiều (1/3 TDD): ${initEve} units Novomix 30.`
        ),
      ].concat(corrEveNaive.steps);

      medicationOrder = {
        primaryText:
          (bg > 350
            ? t(
                lang,
                `If non-ketotic: Inject ${initEve} units NovoMix 30 SC before dinner`,
                `Nếu không toan ceton: Tiêm dưới da ${initEve} units Novomix 30 trước ăn tối`
              )
            : t(
                lang,
                `Inject ${initEve} units NovoMix 30 SC before dinner`,
                `Tiêm dưới da ${initEve} units Novomix 30 trước ăn tối`
              )) +
          (corrEveNaive.finalDose > 0
            ? ` + ${corrEveNaive.finalDose} units Actrapid SC.`
            : "."),
        bullets:
          bg > 350
            ? [
                t(
                  lang,
                  "STAT LABS REQUIRED: Blood ketones (β-OHB), venous blood gas, and electrolytes.",
                  "BẮT BUỘC XÉT NGHIỆM CETON MÁU (β-OHB), KHÍ MÁU & ĐIỆN GIẢI ĐỒ NGAY."
                ),
                t(
                  lang,
                  "If Ketones ≥ 3.0 mmol/L or Osmolality ≥ 320 mOsm/kg: STOP NovoMix and switch to Mode 3 (DKA / HHS Emergency)!",
                  "Nếu Ceton ≥ 3.0 mmol/L hoặc ALTT ≥ 320 mOsm/kg: Ngưng Novomix! Chuyển ngay sang Tab 3 (Cấp cứu DKA / HHS)."
                ),
              ]
            : [],
        detailsTitle: t(
          lang,
          "View evening initiation details",
          "Xem chi tiết cách tính liều khởi trị chiều"
        ),
        detailSteps: naiveEveSteps,
        tone: statusTone,
      };
      timeline = [
        {
          time: t(lang, "22:00 Bedtime", "22h00 đêm"),
          desc: t(
            lang,
            "MANDATORY bedtime BG check for newly initiated patient",
            "BẮT BUỘC đo đường huyết trước ngủ ở ca mới khởi trị"
          ),
          critical: true,
        },
        ...(bg > 350
          ? [
              {
                time: t(lang, "02:00 Midnight", "02h00 sáng"),
                desc: t(
                  lang,
                  "MANDATORY 02:00 recheck & review ketone/blood gas labs",
                  "BẮT BUỘC đo lại lúc 02h00 sáng & kiểm tra Ceton/Khí máu"
                ),
                critical: true,
              },
            ]
          : []),
        {
          time: t(lang, "06:00 Tomorrow", "06h00 sáng mai"),
          desc: t(
            lang,
            `Check fasting BG (planned ${initMorn} units)`,
            `Đo đường huyết đói sáng mai (dự kiến ${initMorn} units)`
          ),
          critical: true,
        },
      ];
      regimenAdjustment = {
        primaryText: t(
          lang,
          `Planned morning dose (2/3 TDD): ${initMorn} units NovoMix 30.`,
          `Dự kiến liều sáng mai (2/3 TDD): ${initMorn} units Novomix 30.`
        ),
        bullets: [],
        tone: "info",
      };
    }

    return {
      kind: "inpatient",
      status: { tone: statusTone, tag: statusTag, title: statusTitle },
      effectiveTdd,
      rawTdd,
      isf,
      traj,
      warningBanner,
      medicationOrder,
      nutritionPlan: buildDynamicNutritionPlan(
        inputs,
        traj,
        sugNovomix,
        sugActrapid,
        lang
      ),
      timeline,
      regimenAdjustment,
      suggestedActrapid: sugActrapid,
      suggestedNovomix: sugNovomix,
    };
  }

  if (tp === "t0") {
    if (bg < 70) {
      statusTone = "danger";
      statusTag = t(
        lang,
        "Pre-Dinner Hypoglycemia (< 70 mg/dL)",
        "Hạ Đường Huyết Cấp Cứu (< 70 mg/dL)"
      );
      statusTitle = t(
        lang,
        "Pre-dinner hypoglycemia — high risk of nocturnal recurrence!",
        "Hạ đường huyết trước ăn tối — nguy cơ tụt đường tái diễn ban đêm!"
      );
      const safeEve = isHighRisk
        ? 0
        : adjustDoseWithGuarantee(doseEve, 0.5, "down");
      sugNovomix = safeEve;

      medicationOrder = {
        primaryText: t(
          lang,
          "HOLD evening NovoMix 30 immediately! Execute Rule of 15 rescue.",
          "TẠM NGƯNG NGAY Novomix 30 cử chiều! Xử trí cấp cứu Quy tắc 15 ngay lập tức."
        ),
        bullets: [
          t(
            lang,
            "Step 1 (Rescue): Give 15–20 g fast oral sugar or 30–50 mL IV 30% Dextrose.",
            "Bước 1 (Cấp cứu): Uống 15–20g đường nhanh hoặc tiêm TM Glucose 30% 30–50 mL."
          ),
          t(
            lang,
            `Step 2 (Once BG ≥ 100 mg/dL & dinner finished): ${isHighRisk || doseEve === 0 ? "Omit evening dose completely (0 units)." : `Inject 50% reduced dose = ${safeEve} units NovoMix 30 immediately AFTER dinner.`}`,
            `Bước 2 (Khi BG ≥ 100 mg/dL & ăn tối xong): ${isHighRisk || doseEve === 0 ? "Ngưng hẳn cử chiều nay (0 units)." : `Chỉ tiêm liều giảm 50% = ${safeEve} units Novomix 30 ngay sau khi ăn tối xong.`}`
          ),
        ],
        detailsTitle: t(
          lang,
          `50% reduction rationale (${doseEve} → ${safeEve} units)`,
          `Xem lý do giảm 50% liều chiều (${doseEve} → ${safeEve} units)`
        ),
        detailSteps: [
          t(
            lang,
            `Current evening NovoMix 30: ${doseEve} units.`,
            `Liều Novomix chiều đang dùng: ${doseEve} units.`
          ),
          isHighRisk
            ? t(
                lang,
                "High-risk group with pre-dinner hypoglycemia: omit evening dose completely (0 units).",
                "Nhóm nguy cơ cao bị hạ đường huyết trước ăn tối: ngưng hẳn cử chiều (0 units)."
              )
            : t(
                lang,
                `50% reduction to prevent nocturnal hypoglycemia at Protamine peak: ${safeEve} units.`,
                `Giảm 50% liều cử chiều để phòng hạ đường huyết ban đêm khi Protamine đạt đỉnh: ${safeEve} units.`
              ),
        ],
        tone: "danger",
      };
      timeline = [
        {
          time: t(lang, "In 15 min", "Sau 15 phút"),
          desc: t(
            lang,
            "Recheck until BG ≥ 100 mg/dL",
            "Đo lại đến khi ≥ 100 mg/dL"
          ),
          critical: true,
        },
        {
          time: t(lang, "22:00 Bedtime", "22h00 đêm"),
          desc: t(
            lang,
            "MANDATORY bedtime check",
            "BẮT BUỘC kiểm tra trước khi ngủ"
          ),
          critical: true,
        },
        {
          time: t(lang, "02:00 Midnight", "02h00 sáng"),
          desc: t(
            lang,
            "MANDATORY midnight safety check",
            "BẮT BUỘC kiểm tra lúc nửa đêm"
          ),
          critical: true,
        },
      ];
      regimenAdjustment = {
        primaryText: t(
          lang,
          "Reduce tomorrow's morning/evening NovoMix 30 doses by 20%.",
          "Giảm 20% liều Novomix sáng/chiều vào ngày hôm sau."
        ),
        bullets: [],
        tone: "danger",
      };
    } else if (bg <= 99) {
      statusTone = "warning";
      statusTag = t(
        lang,
        "Nocturnal Hypo Risk (70–99 mg/dL)",
        "Nguy Cơ Hạ Đường Đêm (70–99 mg/dL)"
      );
      statusTitle = t(
        lang,
        "Low pre-dinner BG — cut evening dose 25% and inject post-dinner",
        "Đường huyết trước tối thấp — giảm 25% liều chiều và tiêm sau ăn"
      );
      const red25 = adjustDoseWithGuarantee(doseEve, 0.75, "down");
      sugNovomix = red25;

      medicationOrder = {
        primaryText: t(
          lang,
          `Inject ${red25} units NovoMix 30 SC immediately AFTER dinner. No Actrapid.`,
          `Tiêm dưới da ${red25} units Novomix 30 ngay SAU KHI ăn tối xong. Không tiêm Actrapid.`
        ),
        bullets: [],
        detailsTitle: t(
          lang,
          `25% reduction details (${doseEve} → ${red25} units)`,
          `Xem chi tiết hiệu chỉnh (Giảm 25% từ ${doseEve} → ${red25} units)`
        ),
        detailSteps: [
          t(
            lang,
            `Borderline pre-dinner BG (${bg} mg/dL): reduce evening NovoMix 30 by 25% (${doseEve} → ${red25} units).`,
            `Đường huyết trước tối sát ngưỡng hạ đường (${bg} mg/dL): giảm 25% liều Novomix chiều từ ${doseEve} xuống ${red25} units.`
          ),
        ],
        tone: "warning",
      };
      timeline = [
        {
          time: t(lang, "22:00 Bedtime", "22h00 đêm"),
          desc: t(
            lang,
            "MANDATORY bedtime check",
            "BẮT BUỘC đo kiểm tra trước khi ngủ"
          ),
          critical: true,
        },
        {
          time: t(lang, "02:00 Midnight", "02h00 sáng"),
          desc: t(
            lang,
            "Midnight check (mandatory if high-risk)",
            "Đo lúc nửa đêm (bắt buộc nếu nguy cơ cao)"
          ),
          critical: isHighRisk,
        },
      ];
      regimenAdjustment = {
        primaryText: t(
          lang,
          "Consider 15–20% reduction in scheduled evening dose if recurrent.",
          "Xem xét giảm 15–20% liều cử chiều cố định nếu tình trạng này lặp lại."
        ),
        bullets: [],
        tone: "warning",
      };
    } else if (bg <= 249) {
      const isDroppingFast18 = traj.hasPrior && traj.isRapidDrop && bg <= 180;
      statusTone = isDroppingFast18 ? "warning" : bg <= 139 ? "info" : "ok";
      statusTag = isDroppingFast18
        ? t(
            lang,
            `Rapid Drop (${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h) — Caution`,
            `Đang Giảm Nhanh (${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h) — Thận Trọng`
          )
        : bg <= 139
        ? t(
            lang,
            "Lower Inpatient Range (100–139 mg/dL)",
            "Thấp Hơn Mục Tiêu Nội Trú (100–139 mg/dL)"
          )
        : t(
            lang,
            "Safe Inpatient Range (140–249 mg/dL)",
            "Đạt Dải An Toàn Nội Trú (140–249 mg/dL)"
          );
      statusTitle = isDroppingFast18
        ? t(
            lang,
            "Pre-dinner BG falling fast — reduce evening dose by 15%",
            "Đường huyết trước tối đang hạ nhanh — giảm nhẹ 15% liều chiều"
          )
        : bg <= 139
        ? t(
            lang,
            "Consider 15% evening reduction if high hypoglycemia risk",
            "Cần giảm nhẹ 15% liều nếu người bệnh nguy cơ cao"
          )
        : t(
            lang,
            "Pre-dinner glucose within safe inpatient range",
            "Đường huyết trước ăn tối nằm trong giới hạn an toàn"
          );
      const eveUse =
        (bg <= 139 && isHighRisk) || isDroppingFast18
          ? adjustDoseWithGuarantee(effectiveDoseEve, 0.85, "down")
          : effectiveDoseEve;
      sugNovomix = eveUse;

      const stepsEve100 = baseEveSteps.slice();
      if (isDroppingFast18) {
        stepsEve100.push(
          t(
            lang,
            `Rapid drop from prior (${traj.lastBg} → ${bg} mg/dL at ${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h ≥ 50): reduce evening dose 15% → ${eveUse} units.`,
            `Đường huyết hạ nhanh từ mốc trước (${traj.lastBg} → ${bg} mg/dL, tốc độ ${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h ≥ 50 mg/dL/h): giảm 15% liều chiều xuống ${eveUse} units.`
          )
        );
      } else if (bg <= 139 && isHighRisk) {
        stepsEve100.push(
          t(
            lang,
            `Pre-dinner BG 100–139 mg/dL in high-risk patient: reduce evening dose 15% → ${eveUse} units.`,
            `Do BG 100–139 mg/dL trước tối ở bệnh nhân nguy cơ cao: giảm 15% liều chiều xuống ${eveUse} units.`
          )
        );
      }

      medicationOrder = {
        primaryText: t(
          lang,
          `Inject ${eveUse} units NovoMix 30 SC ${isDroppingFast18 ? "at dinner start" : "before dinner"}. No extra Actrapid.`,
          `Tiêm dưới da ${eveUse} units Novomix 30 ${isDroppingFast18 ? "ngay khi bắt đầu ăn tối" : "trước ăn tối"}. Không tiêm thêm Actrapid.`
        ),
        bullets: [],
        detailsTitle:
          eveUse !== doseEve
            ? t(
                lang,
                `Dose adjustment rationale (${doseEve} → ${eveUse} units)`,
                `Xem lý do điều chỉnh liều (${doseEve} → ${eveUse} units)`
              )
            : undefined,
        detailSteps: stepsEve100,
        tone: statusTone,
      };
      timeline = isDroppingFast18
        ? [
            {
              time: t(lang, "22:00 Bedtime", "22h00 đêm"),
              desc: t(
                lang,
                "Check at bedtime due to afternoon rapid drop",
                "Đo kiểm tra trước ngủ do chiều có đà giảm nhanh"
              ),
              critical: true,
            },
            {
              time: t(lang, "06:00 Tomorrow", "06h00 sáng mai"),
              desc: t(
                lang,
                "Check fasting BG tomorrow morning",
                "Đo đường huyết đói sáng mai"
              ),
              critical: false,
            },
          ]
        : [
            {
              time: t(lang, "06:00 Tomorrow", "06h00 sáng mai"),
              desc: t(
                lang,
                "Check fasting BG tomorrow morning",
                "Đo đường huyết đói sáng mai"
              ),
              critical: false,
            },
          ];
      regimenAdjustment = {
        primaryText: t(
          lang,
          "Maintain current regimen.",
          "Giữ nguyên phác đồ hiện tại."
        ),
        bullets: [],
        tone: "info",
      };
    } else if (bg <= 350) {
      statusTone = "warning";
      statusTag = t(
        lang,
        "Pre-Dinner Hyperglycemia (250–350 mg/dL)",
        "Tăng Đường Huyết Trước Tối (250–350 mg/dL)"
      );
      statusTitle = t(
        lang,
        "Add Actrapid correction and recheck at 22:00",
        "Phối hợp Actrapid hiệu chỉnh và kiểm tra lúc 22h00"
      );
      const corrEve = getUnifiedCorrectionActrapid(
        bg,
        effectiveTdd,
        isHighRisk,
        traj,
        { tpRole: "premeal", mode: "18h" },
        lang
      );
      const incEve15 = adjustDoseWithGuarantee(effectiveDoseEve, 1.15, "up");
      sugNovomix = effectiveDoseEve;
      sugActrapid = corrEve.finalDose;

      medicationOrder = {
        primaryText:
          t(
            lang,
            `Inject ${effectiveDoseEve} units NovoMix 30 SC`,
            `Tiêm dưới da ${effectiveDoseEve} units Novomix 30`
          ) +
          (corrEve.finalDose > 0
            ? t(
                lang,
                ` + ${corrEve.finalDose} units Actrapid SC (separate sites ≥ 5 cm apart).`,
                ` + ${corrEve.finalDose} units Actrapid (SC) (2 vị trí cách xa ≥ 5 cm).`
              )
            : t(
                lang,
                " (Hold extra Actrapid due to active IOB / rapid drop).",
                " (Không tiêm thêm Actrapid do đã khấu trừ IOB tồn lưu / đà giảm nhanh)."
              )),
        bullets: [
          t(
            lang,
            `Alternative single-injection option: give ${incEve15} units NovoMix 30 SC alone (no Actrapid).`,
            `Phương án thay thế nếu hạn chế mũi tiêm: chỉ tiêm 1 mũi Novomix chiều = ${incEve15} units (không tiêm Actrapid).`
          ),
        ],
        detailsTitle: corrEve.summaryTitle,
        detailSteps: baseEveSteps.concat(corrEve.steps),
        tone: "warning",
      };
      timeline = [
        {
          time: t(lang, "22:00 Bedtime", "22h00 đêm"),
          desc: t(
            lang,
            "MANDATORY bedtime check",
            "BẮT BUỘC đo kiểm tra trước khi đi ngủ"
          ),
          critical: true,
        },
        {
          time: t(lang, "06:00 Tomorrow", "06h00 sáng mai"),
          desc: t(
            lang,
            "Check fasting BG tomorrow morning",
            "Đo đường huyết đói sáng mai"
          ),
          critical: true,
        },
      ];
      regimenAdjustment = {
        primaryText: t(
          lang,
          "If 18:00 BG is repeatedly high: increase morning (06:00) NovoMix 30 by 10–15%.",
          "Nếu thường xuyên cao lúc 18h00: cần tăng 10–15% liều Novomix cử sáng (06h00)."
        ),
        bullets: [],
        tone: "info",
      };
    } else {
      statusTone = "danger";
      statusTag = t(
        lang,
        "Severe Hyperglycemia (> 350 mg/dL)",
        "Tăng Đường Huyết Nặng (> 350 mg/dL)"
      );
      statusTitle = t(
        lang,
        "DKA / HHS risk — check blood ketones stat!",
        "Cảnh báo nguy cơ DKA / HHS — cần thử Ceton máu ngay!"
      );
      const corrHeavyEve = getUnifiedCorrectionActrapid(
        bg,
        effectiveTdd,
        isHighRisk,
        traj,
        { tpRole: "premeal", mode: "18h" },
        lang
      );
      sugNovomix = effectiveDoseEve;
      sugActrapid = corrHeavyEve.finalDose;

      medicationOrder = {
        primaryText:
          t(
            lang,
            `If non-acidotic (Ketones < 1.0 mmol/L): Inject ${effectiveDoseEve} units NovoMix 30 SC`,
            `Nếu không toan (Ceton < 1.0 mmol/L): Tiêm ${effectiveDoseEve} units Novomix 30`
          ) +
          (corrHeavyEve.finalDose > 0
            ? ` + ${corrHeavyEve.finalDose} units Actrapid SC.`
            : "."),
        bullets: [
          t(
            lang,
            "BEDSIDE EXAM & STAT LABS: Blood ketones, venous blood gas, electrolytes.",
            "KHÁM TẠI GIƯỜNG & XÉT NGHIỆM CETON MÁU, KHÍ MÁU, ĐIỆN GIẢI NGAY."
          ),
          t(
            lang,
            "If DKA (Ketones ≥ 3.0, pH < 7.30) or HHS (Osm ≥ 320): STOP NovoMix and switch to Mode 3 (DKA / HHS Emergency)!",
            "Nếu có DKA (Ceton ≥ 3.0, pH < 7.3) hoặc HHS (ALTT ≥ 320): Ngưng Novomix! Chuyển ngay sang Tab 3 (Cấp cứu DKA / HHS)."
          ),
        ],
        detailsTitle: corrHeavyEve.summaryTitle,
        detailSteps: baseEveSteps.concat(corrHeavyEve.steps),
        tone: "danger",
      };
      timeline = [
        {
          time: t(lang, "22:00 Bedtime", "22h00 đêm"),
          desc: t(
            lang,
            "MANDATORY 22:00 recheck",
            "BẮT BUỘC đo lại lúc 22h00 đêm"
          ),
          critical: true,
        },
        {
          time: t(lang, "02:00 Midnight", "02h00 sáng"),
          desc: t(
            lang,
            "MANDATORY 02:00 recheck",
            "BẮT BUỘC đo lại lúc 02h00 sáng"
          ),
          critical: true,
        },
      ];
      regimenAdjustment = {
        primaryText: t(
          lang,
          "Consider restructuring to Basal-Bolus regimen tomorrow morning.",
          "Xem xét tái cấu trúc sang phác đồ Basal-Bolus vào sáng mai."
        ),
        bullets: [],
        tone: "danger",
      };
    }
  } else if (tp === "t1") {
    statusTag = t(
      lang,
      "20:30 (2h Post-Dinner)",
      "Mốc 20h30 (Sau Ăn Tối 2 Giờ)"
    );
    const corr20 = getUnifiedCorrectionActrapid(
      bg,
      effectiveTdd,
      isHighRisk,
      traj,
      { tpRole: "postmeal_2h", mode: "18h" },
      lang
    );
    sugActrapid = corr20.finalDose;

    if (bg < 70) {
      statusTone = "danger";
      statusTitle = t(
        lang,
        "Early post-dinner hypoglycemia (< 70 mg/dL)!",
        "Cấp cứu hạ đường huyết sớm sau ăn tối (< 70 mg/dL)!"
      );
      medicationOrder = {
        primaryText: t(
          lang,
          "EMERGENCY HYPOGLYCEMIA: Execute Rule of 15 immediately!",
          "CẤP CỨU HẠ ĐƯỜNG HUYẾT: Xử trí Quy tắc 15 ngay lập tức!"
        ),
        bullets: [],
        tone: "danger",
      };
    } else if (bg < 250) {
      const isDropWarn20 =
        traj.hasPrior && (traj.isRapidDrop || traj.isIobInducedHypoRisk);
      statusTone = isDropWarn20 ? "warning" : "ok";
      statusTitle = isDropWarn20
        ? traj.isRapidDrop
          ? t(
              lang,
              `BG dropping fast (${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h) — 22:00 hypoglycemia risk!`,
              `Đường huyết đang hạ nhanh (${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h) — nguy cơ tụt đường lúc 22h00!`
            )
          : t(
              lang,
              `~${traj.iob.activeUnits} u IOB active — risk of drop by 22:00!`,
              `Đường huyết có nguy cơ hạ thấp lúc 22h00 do còn ~${traj.iob.activeUnits} units IOB!`
            )
        : t(
            lang,
            "2h post-dinner glucose stable",
            "Đường huyết sau ăn tối 2 giờ ổn định"
          );
      medicationOrder = {
        primaryText: isDropWarn20
          ? t(
              lang,
              `NO extra insulin. ${traj.isRapidDrop ? `Rapid drop (${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h)` : `~${traj.iob.activeUnits} u IOB active`} — give slow carb snack!`,
              `KHÔNG tiêm thêm Insulin. ${traj.isRapidDrop ? `Đường huyết vừa hạ nhanh (${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h)` : `Còn ~${traj.iob.activeUnits} units IOB`} — cần ăn nhẹ bù Carb chậm!`
            )
          : t(
              lang,
              `NO extra insulin at 20:30 (stable BG = ${bg} mg/dL).`,
              `KHÔNG tiêm thêm Insulin lúc 20h30 (BG ổn định = ${bg} mg/dL).`
            ),
        bullets: [],
        detailsTitle: corr20.summaryTitle,
        detailSteps: corr20.steps,
        tone: statusTone,
      };
    } else {
      statusTone = corr20.finalDose > 0 ? (bg > 350 ? "danger" : "warning") : "info";
      statusTitle = t(
        lang,
        "2h post-dinner evaluation & active IOB check",
        "Đánh giá sau ăn tối 2 giờ & tính toán Insulin tồn lưu (Active IOB)"
      );
      medicationOrder = {
        primaryText:
          corr20.finalDose > 0
            ? t(
                lang,
                `Give ${corr20.finalDose} units Actrapid SC (BG ${bg} mg/dL exceeds active IOB).`,
                `Tiêm bổ sung ${corr20.finalDose} units Actrapid (SC) (do BG tăng rất cao ${bg} mg/dL vượt quá IOB hiện có).`
              )
            : t(
                lang,
                `HOLD extra Actrapid at 20:30 (~${traj.hasPrior ? traj.iob.activeUnits : 0} units IOB from 18:00 still active).`,
                `CHƯA tiêm thêm Actrapid lúc 20h30 (đang còn ~${traj.hasPrior ? traj.iob.activeUnits : 0} units IOB từ mũi 18h00 đang hoạt động).`
              ),
        bullets:
          bg > 350
            ? [
                t(
                  lang,
                  "BG > 350 mg/dL alert: check capillary ketones immediately to rule out early DKA.",
                  "Cảnh báo BG > 350 mg/dL: cần xét nghiệm Ceton máu mao mạch ngay để loại trừ DKA sớm."
                ),
              ]
            : [
                t(
                  lang,
                  "Reassess at 22:00 bedtime.",
                  "Chờ đánh giá tại mốc 22h00 trước giờ đi ngủ."
                ),
              ],
        detailsTitle: corr20.summaryTitle,
        detailSteps: corr20.steps,
        tone: statusTone,
      };
    }

    timeline = [
      {
        time: t(lang, "22:00 Bedtime", "22h00 đêm"),
        desc: t(lang, "Recheck at bedtime", "Kiểm tra lại trước giờ đi ngủ"),
        critical: true,
      },
    ];
    regimenAdjustment = {
      primaryText: t(
        lang,
        "Continue monitoring at 22:00 bedtime.",
        "Theo dõi tiếp tại mốc 22h00 đêm."
      ),
      bullets: [],
      tone: "info",
    };
  } else if (tp === "t2") {
    const night22Obj = getUnifiedCorrectionActrapid(
      bg,
      effectiveTdd,
      isHighRisk,
      traj,
      { tpRole: "bedtime_22h", mode: "18h" },
      lang
    );
    sugActrapid = night22Obj.finalDose;

    if (bg < 70) {
      statusTone = "danger";
      statusTag = t(
        lang,
        "Bedtime Hypoglycemia (< 70 mg/dL)",
        "Hạ Đường Huyết Trước Ngủ (< 70 mg/dL)"
      );
      statusTitle = t(
        lang,
        "Bedtime hypoglycemia (< 70 mg/dL) — treat immediately!",
        "Cấp cứu hạ đường huyết trước khi đi ngủ (< 70 mg/dL)!"
      );
      medicationOrder = {
        primaryText: t(
          lang,
          "BEDTIME HYPOGLYCEMIA (22:00): Give 15–20 g fast oral sugar or 30–50 mL IV 30% Dextrose!",
          "CẤP CỨU HẠ ĐƯỜNG HUYẾT LÚC 22H00: Uống 15–20g đường nhanh hoặc tiêm TM Glucose 30%!"
        ),
        bullets: [],
        tone: "danger",
      };
      timeline = [
        {
          time: t(lang, "In 15 min", "Sau 15 phút"),
          desc: t(
            lang,
            "Recheck until BG ≥ 100 mg/dL",
            "Thử lại đến khi ≥ 100 mg/dL"
          ),
          critical: true,
        },
        {
          time: t(lang, "02:00 Midnight", "02h00 sáng"),
          desc: t(
            lang,
            "MANDATORY 02:00 check",
            "BẮT BUỘC đo lúc 02h00 sáng"
          ),
          critical: true,
        },
      ];
      regimenAdjustment = {
        primaryText: t(
          lang,
          "Hand over: reduce tomorrow's evening NovoMix 30 by 20–30%.",
          "Bàn giao giảm 20–30% liều Novomix chiều ngày mai."
        ),
        bullets: [],
        tone: "danger",
      };
    } else if (bg < 140) {
      statusTone = "warning";
      statusTag = t(
        lang,
        "Nocturnal Hypo Risk (70–139 mg/dL)",
        "Nguy Cơ Hạ Đường Đêm (70–139 mg/dL)"
      );
      statusTitle = t(
        lang,
        "Nocturnal hypoglycemia risk (22:00 BG < 140 mg/dL)",
        "Nguy cơ hạ đường ban đêm (BG 22h00 < 140 mg/dL)"
      );
      medicationOrder = {
        primaryText: t(
          lang,
          "NO insulin. Give 150–200 mL warm milk immediately to prevent overnight hypoglycemia!",
          "KHÔNG tiêm Insulin. Cho uống ngay 1 ly sữa ấm (150–200 mL) dự phòng hạ đường đêm!"
        ),
        bullets: [
          t(
            lang,
            `22:00 BG < 140 mg/dL (${bg} mg/dL) carries high risk of 02:00 hypoglycemia as 18:00 Protamine (70%) peaks.`,
            `Đường huyết 22h00 dưới 140 mg/dL (${bg} mg/dL) có nguy cơ cao tụt đường lúc 02h00 sáng khi Protamine (70% mũi 18h00) đạt đỉnh.`
          ),
        ],
        detailsTitle: night22Obj.summaryTitle,
        detailSteps: night22Obj.steps,
        tone: "warning",
      };
      timeline = [
        {
          time: t(lang, "02:00 Midnight", "02h00 sáng"),
          desc: t(
            lang,
            "MANDATORY 02:00 safety check",
            "BẮT BUỘC đo kiểm tra lúc 02h00 sáng"
          ),
          critical: true,
        },
      ];
      regimenAdjustment = {
        primaryText: t(
          lang,
          "Consider 15% reduction in tomorrow's evening NovoMix 30.",
          "Cân nhắc giảm 15% liều Novomix chiều ngày mai."
        ),
        bullets: [],
        tone: "info",
      };
    } else if (bg <= 249) {
      const isDropWarn22 =
        traj.hasPrior && (traj.isRapidDrop || traj.isIobInducedHypoRisk);
      statusTone = isDropWarn22 ? "warning" : "ok";
      statusTag = isDropWarn22
        ? traj.isRapidDrop
          ? t(
              lang,
              `Rapid Drop Alert (${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h)`,
              `Cảnh Báo Tốc Độ Hạ Nhanh (${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h)`
            )
          : t(
              lang,
              `Active IOB Alert (~${traj.iob.activeUnits} u)`,
              `Cảnh Báo IOB Tồn Lưu (~${traj.iob.activeUnits} units)`
            )
        : t(
            lang,
            "Safe Bedtime BG (140–249 mg/dL)",
            "Mốc 22h00 An Toàn (140–249 mg/dL)"
          );
      statusTitle = isDropWarn22
        ? traj.isRapidDrop
          ? t(
              lang,
              `BG falling too fast (${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h ≥ 50) — 02:00 hypoglycemia risk!`,
              `Đường huyết đang hạ quá nhanh (${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h ≥ 50) — nguy cơ tụt đường lúc 02h00 sáng!`
            )
          : t(
              lang,
              `~${traj.iob.activeUnits} u IOB still active — nocturnal drop risk!`,
              `Còn ~${traj.iob.activeUnits} units IOB đang hoạt động — nguy cơ tụt thấp về đêm!`
            )
        : t(
            lang,
            "Safe bedtime glucose (140–249 mg/dL)",
            "Đường huyết trước ngủ an toàn (140–249 mg/dL)"
          );
      medicationOrder = {
        primaryText: isDropWarn22
          ? t(
              lang,
              `NO extra insulin. ${traj.isRapidDrop ? `Rapid drop (${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h)` : `~${traj.iob.activeUnits} u IOB active`} — give bedtime warm milk/snack!`,
              `KHÔNG tiêm thêm Insulin. ${traj.isRapidDrop ? `Đường huyết vừa hạ nhanh (${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h)` : `Đang còn ~${traj.iob.activeUnits} units IOB`} — cần ăn nhẹ / uống sữa ấm trước ngủ!`
            )
          : t(
              lang,
              `NO extra insulin. 22:00 BG (${bg} mg/dL) is safe for overnight sleep.`,
              `KHÔNG tiêm thêm Insulin. Đường huyết 22h00 (${bg} mg/dL) an toàn cho giấc ngủ đêm.`
            ),
        bullets: [],
        detailsTitle: night22Obj.summaryTitle,
        detailSteps: night22Obj.steps,
        tone: statusTone,
      };
      timeline = isDropWarn22
        ? [
            {
              time: t(lang, "02:00 Midnight", "02h00 sáng"),
              desc: t(
                lang,
                "MANDATORY 02:00 check due to nocturnal hypo risk",
                "BẮT BUỘC đo lúc 02h00 sáng do nguy cơ hạ đường huyết đêm"
              ),
              critical: true,
            },
            {
              time: t(lang, "06:00 Tomorrow", "06h00 sáng mai"),
              desc: t(
                lang,
                "Check fasting BG tomorrow morning",
                "Đo đường huyết đói sáng mai"
              ),
              critical: true,
            },
          ]
        : [
            {
              time: t(lang, "06:00 Tomorrow", "06h00 sáng mai"),
              desc: t(
                lang,
                "Check fasting BG tomorrow morning",
                "Đo đường huyết đói sáng mai"
              ),
              critical: false,
            },
          ];
      regimenAdjustment = {
        primaryText: isDropWarn22
          ? t(
              lang,
              "Monitor 02:00 closely; if < 100 mg/dL at 02:00, cut tomorrow's evening dose by 15–20%.",
              "Theo dõi sát mốc 02h00 sáng; nếu tụt < 100 mg/dL lúc 02h00 thì giảm 15–20% liều chiều mai."
            )
          : t(
              lang,
              "Evening dose is responding well.",
              "Liều chiều đáp ứng tốt."
            ),
        bullets: [],
        tone: isDropWarn22 ? "warning" : "info",
      };
    } else if (bg <= 350) {
      statusTone = "warning";
      statusTag = t(
        lang,
        "Bedtime Hyperglycemia (250–350 mg/dL)",
        "Tăng Đường Huyết Trước Ngủ (250–350 mg/dL)"
      );
      statusTitle = t(
        lang,
        "Bedtime hyperglycemia (22:00) — conservative nocturnal correction",
        "Tăng đường huyết trước ngủ (22h00) — hiệu chỉnh thận trọng ban đêm"
      );
      medicationOrder = {
        primaryText:
          night22Obj.finalDose > 0
            ? t(
                lang,
                `Inject ${night22Obj.finalDose} units Actrapid SC (conservative nocturnal correction).`,
                `Tiêm dưới da ${night22Obj.finalDose} units Actrapid (SC) (liều đêm thận trọng đã hiệu chỉnh).`
              )
            : t(
                lang,
                "HOLD Actrapid at 22:00 (IOB / rapid-drop protection against 02:00 hypoglycemia).",
                "KHÔNG tiêm thêm Actrapid lúc 22h00 (đã khấu trừ IOB / đường huyết đang giảm nhanh để phòng hạ đường lúc 02h00 sáng)."
              ),
        bullets: [],
        detailsTitle: night22Obj.summaryTitle,
        detailSteps: night22Obj.steps,
        tone: "warning",
      };
      timeline = [
        {
          time: t(lang, "02:00 Midnight", "02h00 sáng"),
          desc: t(
            lang,
            "MANDATORY 02:00 check",
            "BẮT BUỘC đo kiểm tra lúc 02h00 sáng"
          ),
          critical: true,
        },
      ];
      regimenAdjustment = {
        primaryText: t(
          lang,
          "Monitor 02:00 closely to detect Protamine peak.",
          "Theo dõi sát mốc 02h00 sáng để phát hiện sớm đỉnh tác dụng của Protamine."
        ),
        bullets: [],
        tone: "info",
      };
    } else {
      statusTone = "danger";
      statusTag = t(
        lang,
        "Severe Bedtime Hyperglycemia (> 350 mg/dL)",
        "Tăng Đường Huyết Nặng Trước Ngủ (> 350 mg/dL)"
      );
      statusTitle = t(
        lang,
        "Bedtime DKA / HHS alert (> 350 mg/dL) — check ketones stat!",
        "Cảnh báo nguy cơ DKA / HHS trước ngủ (> 350 mg/dL) — tầm soát Ceton máu!"
      );
      medicationOrder = {
        primaryText:
          night22Obj.finalDose > 0
            ? t(
                lang,
                `If non-acidotic (Ketones < 1.0 mmol/L): Inject ${night22Obj.finalDose} units Actrapid SC (extended nocturnal scale).`,
                `Nếu không toan (Ceton < 1.0 mmol/L): Tiêm dưới da ${night22Obj.finalDose} units Actrapid (SC) (liều cứu vãn đêm).`
              )
            : t(
                lang,
                "If non-acidotic: hold rescue Actrapid due to rapid fall / large IOB; recheck at 02:00.",
                "Nếu không toan: tạm hoãn tiêm bồi Actrapid do đường huyết đang giảm rất nhanh hoặc còn IOB lớn; kiểm tra lại lúc 02h00."
              ),
        bullets: [
          t(
            lang,
            "SEVERE BEDTIME HYPERGLYCEMIA — CHECK CAPILLARY KETONES STAT.",
            "BÁO ĐỘNG TĂNG ĐƯỜNG HUYẾT NẶNG TRƯỚC NGỦ — ĐO CETON MÁU MAO MẠCH NGAY."
          ),
          t(
            lang,
            "If Ketones ≥ 3.0 mmol/L or Osm ≥ 320 mOsm/kg: Overnight DKA/HHS emergency! Switch to Mode 3.",
            "Nếu Ceton ≥ 3.0 mmol/L hoặc ALTT ≥ 320 mOsm/kg: Báo động DKA/HHS trong đêm! Chuyển ngay sang Tab 3."
          ),
        ],
        detailsTitle: night22Obj.summaryTitle,
        detailSteps: night22Obj.steps,
        tone: "danger",
      };
      timeline = [
        {
          time: t(lang, "00:00 (2h check)", "00h00 (Nửa đêm)"),
          desc: t(
            lang,
            "MANDATORY 2h post-rescue BG check",
            "BẮT BUỘC đo kiểm tra sau tiêm cứu vãn 2 giờ"
          ),
          critical: true,
        },
        {
          time: t(lang, "02:00 Midnight", "02h00 sáng"),
          desc: t(
            lang,
            "MANDATORY 02:00 recheck (Protamine peak)",
            "BẮT BUỘC đo lại lúc 02h00 sáng (đỉnh Protamine)"
          ),
          critical: true,
        },
        {
          time: t(lang, "06:00 Tomorrow", "06h00 sáng mai"),
          desc: t(
            lang,
            "Check fasting BG tomorrow morning",
            "Đo đường huyết đói sáng mai"
          ),
          critical: true,
        },
      ];
      regimenAdjustment = {
        primaryText: t(
          lang,
          "Evening NovoMix 30 failed to control dinner surge; escalate dose or switch to Basal-Bolus tomorrow morning.",
          "Liều Novomix 30 chiều không khống chế được cử tối; bắt buộc tăng liều hoặc chuyển Basal-Bolus vào sáng mai."
        ),
        bullets: [],
        tone: "danger",
      };
    }
  } else {
    // 02:00 Midnight
    const night02Obj = getUnifiedCorrectionActrapid(
      bg,
      effectiveTdd,
      isHighRisk,
      traj,
      { tpRole: "night_02h", mode: "18h" },
      lang
    );
    sugActrapid = night02Obj.finalDose;

    if (bg < 70) {
      statusTone = "danger";
      statusTag = t(
        lang,
        "Midnight Hypoglycemia (< 70 mg/dL)",
        "Hạ Đường Huyết Nửa Đêm (< 70 mg/dL)"
      );
      statusTitle = t(
        lang,
        "02:00 Hypoglycemia Rescue (Somogyi Effect confirmed)!",
        "Cấp cứu hạ đường huyết lúc 02h00 sáng (Hiệu ứng Somogyi)!"
      );
      medicationOrder = {
        primaryText: t(
          lang,
          "MIDNIGHT HYPOGLYCEMIA (02:00): Give 15–20 g fast oral sugar or 30–50 mL IV 30% Dextrose immediately!",
          "CẤP CỨU HẠ ĐƯỜNG HUYẾT ĐÊM (02h00): Uống ngay 15–20g đường nhanh hoặc tiêm TM Glucose 30%!"
        ),
        bullets: [],
        tone: "danger",
      };
      timeline = [
        {
          time: t(lang, "In 15 min", "Sau 15 phút"),
          desc: t(
            lang,
            "Recheck until BG ≥ 100 mg/dL",
            "Thử lại đến khi ≥ 100 mg/dL"
          ),
          critical: true,
        },
        {
          time: t(lang, "06:00 Morning", "06h00 sáng"),
          desc: t(
            lang,
            "Check fasting BG at 06:00",
            "Đo lại đường huyết đói lúc 06h00 sáng"
          ),
          critical: true,
        },
      ];
      regimenAdjustment = {
        primaryText: t(
          lang,
          'SOMOGYI CONFIRMED: Click "Save Checkpoint" so Mode 1 (06:00) automatically reduces morning dose by 20%!',
          'ĐÃ XÁC ĐỊNH HIỆU ỨNG SOMOGYI: Bấm "Lưu Mốc Theo Dõi" để sáng mai (06h00) hệ thống tự động giảm 20% liều!'
        ),
        bullets: [],
        tone: "danger",
      };
    } else if (bg <= 139) {
      statusTone = "warning";
      statusTag = t(
        lang,
        "Nocturnal Borderline Low (70–139 mg/dL)",
        "Sát Ngưỡng Hạ Đường Đêm (70–139 mg/dL)"
      );
      statusTitle = t(
        lang,
        "Midnight BG borderline low — give warm milk to prevent 04:00 drop",
        "Đường huyết nửa đêm thấp sát ngưỡng — cần uống sữa ấm dự phòng"
      );
      medicationOrder = {
        primaryText: t(
          lang,
          "STRICTLY NO insulin. Give 150 mL warm milk to prevent further drop by 04:00.",
          "TUYỆT ĐỐI KHÔNG tiêm Insulin. Cho uống 150 mL sữa ấm để dự phòng tụt sâu thêm lúc 04h00 sáng."
        ),
        bullets: [],
        detailsTitle: night02Obj.summaryTitle,
        detailSteps: night02Obj.steps,
        tone: "warning",
      };
      timeline = [
        {
          time: t(lang, "04:00 AM", "04h00 sáng"),
          desc: t(
            lang,
            "Recheck if rapid downward trend was present",
            "Kiểm tra lại nếu có đà giảm nhanh trước đó"
          ),
          critical: traj.hasPrior && traj.isRapidDrop,
        },
        {
          time: t(lang, "06:00 Morning", "06h00 sáng"),
          desc: t(
            lang,
            "Check fasting BG at 06:00",
            "Đo đường huyết đói lúc 06h00 sáng"
          ),
          critical: true,
        },
      ];
      regimenAdjustment = {
        primaryText: t(
          lang,
          "Consider 10–15% reduction in tomorrow's evening NovoMix 30.",
          "Cân nhắc giảm nhẹ 10–15% liều Novomix chiều hôm sau."
        ),
        bullets: [],
        tone: "info",
      };
    } else if (bg <= 249) {
      const isDropWarn02 =
        traj.hasPrior && (traj.isRapidDrop || traj.isIobInducedHypoRisk);
      statusTone = isDropWarn02 ? "warning" : "ok";
      statusTag = isDropWarn02
        ? traj.isRapidDrop
          ? t(
              lang,
              `Rapid Drop Alert (${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h)`,
              `Cảnh Báo Tốc Độ Hạ Nhanh (${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h)`
            )
          : t(
              lang,
              `Active IOB Alert (~${traj.iob.activeUnits} u)`,
              `Cảnh Báo IOB Tồn Lưu (~${traj.iob.activeUnits} units)`
            )
        : t(
            lang,
            "Safe Midnight BG (140–249 mg/dL)",
            "Mốc 02h00 Sáng An Toàn (140–249 mg/dL)"
          );
      statusTitle = isDropWarn02
        ? traj.isRapidDrop
          ? t(
              lang,
              `BG falling fast (${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h ≥ 50) — 04:00–06:00 hypo risk!`,
              `Đường huyết vừa hạ quá nhanh (${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h ≥ 50) — nguy cơ tụt lúc 04h–06h sáng!`
            )
          : t(
              lang,
              `~${traj.iob.activeUnits} u IOB active — early-morning hypo risk!`,
              `Còn ~${traj.iob.activeUnits} units IOB tồn lưu — nguy cơ tụt lúc 04h–06h sáng!`
            )
        : t(
            lang,
            "Midnight safety check — glucose stable",
            "Kiểm tra an toàn nửa đêm — đường huyết ổn định"
          );
      medicationOrder = {
        primaryText: isDropWarn02
          ? t(
              lang,
              `NO extra insulin. ${traj.isRapidDrop ? `Rapid drop (${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h)` : `~${traj.iob.activeUnits} u IOB`} — give warm milk / light snack immediately!`,
              `KHÔNG tiêm thêm Insulin. ${traj.isRapidDrop ? `Đường huyết đang hạ nhanh (${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h)` : `Đang còn ~${traj.iob.activeUnits} units IOB`} — cần cho ăn nhẹ / uống sữa ấm ngay!`
            )
          : t(
              lang,
              `NO extra insulin. 02:00 BG (${bg} mg/dL) is safe.`,
              `KHÔNG tiêm thêm Insulin. Đường huyết 02h00 sáng (${bg} mg/dL) an toàn.`
            ),
        bullets: [],
        detailsTitle: night02Obj.summaryTitle,
        detailSteps: night02Obj.steps,
        tone: statusTone,
      };
      timeline = isDropWarn02
        ? [
            {
              time: t(lang, "04:00 AM (2h check)", "04h00 sáng (Sau 2h)"),
              desc: t(
                lang,
                "MANDATORY recheck due to late-night hypoglycemia risk",
                "BẮT BUỘC đo lại do nguy cơ tụt đường huyết muộn vào rạng sáng"
              ),
              critical: true,
            },
            {
              time: t(lang, "06:00 Morning", "06h00 sáng"),
              desc: t(
                lang,
                "Check fasting BG at 06:00",
                "Đo đường huyết đói lúc 06h00 sáng"
              ),
              critical: true,
            },
          ]
        : [
            {
              time: t(lang, "06:00 Morning", "06h00 sáng"),
              desc: t(
                lang,
                "Check fasting BG at 06:00",
                "Đo đường huyết đói lúc 06h00 sáng"
              ),
              critical: false,
            },
          ];
      regimenAdjustment = {
        primaryText: isDropWarn02
          ? t(
              lang,
              "22:00 correction or evening Protamine is driving a rapid drop. Monitor closely at 04:00 and 06:00.",
              "Liều hiệu chỉnh lúc 22h00 hoặc Protamine cử chiều đang làm giảm nhanh. Theo dõi sát lúc 04h00 và 06h00 sáng."
            )
          : t(
              lang,
              "If 02:00 is normal but 06:00 spikes → Dawn Phenomenon confirmed; may increase evening dose by 10–15%.",
              "Nếu 02h00 bình thường nhưng 06h00 vọt cao → Xác định Hiện tượng Bình minh (Dawn), cho phép tăng 10–15% liều chiều."
            ),
        bullets: [],
        tone: isDropWarn02 ? "warning" : "info",
      };
    } else if (bg <= 349) {
      statusTone = "warning";
      statusTag = t(
        lang,
        "Midnight Hyperglycemia (250–349 mg/dL)",
        "Tăng Đường Huyết Nửa Đêm (250–349 mg/dL)"
      );
      statusTitle = t(
        lang,
        "02:00 Hyperglycemia — conservative rescue",
        "Tăng đường huyết lúc 02h00 sáng — xử trí cứu vãn thận trọng"
      );
      medicationOrder = {
        primaryText:
          night02Obj.finalDose > 0
            ? t(
                lang,
                `Inject nocturnal rescue ${night02Obj.finalDose} units Actrapid SC (or monitor until 06:00 if sleeping comfortably).`,
                `Tiêm dưới da liều cứu vãn đêm ${night02Obj.finalDose} units Actrapid (SC) (hoặc theo dõi đến 06h00 nếu ngủ yên).`
              )
            : t(
                lang,
                `HOLD extra Actrapid at 02:00 (BG falling ${traj.hasPrior ? `${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h` : ""} or active IOB present).`,
                `KHÔNG tiêm bồi thêm lúc 02h00 sáng (do đường huyết đang hạ nhanh ${traj.hasPrior ? `${Math.abs(traj.rateBgPerHour).toFixed(0)} mg/dL/h` : ""} hoặc còn IOB tồn lưu).`
              ),
        bullets: [],
        detailsTitle: night02Obj.summaryTitle,
        detailSteps: night02Obj.steps,
        tone: "warning",
      };
      timeline = [
        {
          time: t(lang, "06:00 Morning", "06h00 sáng"),
          desc: t(
            lang,
            "Check fasting BG at 06:00",
            "Đo đường huyết đói lúc 06h00 sáng"
          ),
          critical: true,
        },
      ];
      regimenAdjustment = {
        primaryText: t(
          lang,
          "Somogyi excluded; increase tomorrow's evening NovoMix 30 by 15%.",
          "Loại trừ Somogyi; cần tăng 15% liều Novomix chiều vào ngày mai."
        ),
        bullets: [],
        tone: "info",
      };
    } else {
      statusTone = "danger";
      statusTag = t(
        lang,
        "Severe Midnight Hyperglycemia (≥ 350 mg/dL)",
        "Tăng Đường Huyết Nặng Nửa Đêm (≥ 350 mg/dL)"
      );
      statusTitle = t(
        lang,
        "Severe 02:00 hyperglycemia — screen ketones & rescue",
        "Tăng đường huyết nặng lúc 02h00 sáng — tầm soát Ceton & tiêm cứu vãn"
      );
      medicationOrder = {
        primaryText:
          night02Obj.finalDose > 0
            ? t(
                lang,
                `If non-acidotic: Inject nocturnal rescue ${night02Obj.finalDose} units Actrapid SC.`,
                `Nếu không toan: Tiêm dưới da liều cứu vãn đêm ${night02Obj.finalDose} units Actrapid (SC).`
              )
            : t(
                lang,
                "Hold Actrapid due to rapid fall / large IOB; check blood ketones immediately.",
                "Tạm hoãn tiêm bồi Actrapid do đường huyết đang giảm rất nhanh hoặc còn IOB lớn; thử Ceton máu ngay."
              ),
        bullets: [
          t(
            lang,
            "If tachypneic, nauseated, or BG ≥ 350 mg/dL: check capillary blood ketones immediately for nocturnal DKA!",
            "Nếu bệnh nhân thở nhanh, buồn nôn hoặc BG ≥ 350 mg/dL: thử ngay Ceton máu mao mạch để tầm soát DKA ban đêm!"
          ),
        ],
        detailsTitle: night02Obj.summaryTitle,
        detailSteps: night02Obj.steps,
        tone: "danger",
      };
      timeline = [
        {
          time: t(lang, "04:00 AM", "04h00 sáng"),
          desc: t(
            lang,
            "Recheck 2h post-rescue Actrapid",
            "Đo kiểm tra lại sau mũi Actrapid cứu vãn 2 giờ"
          ),
          critical: true,
        },
        {
          time: t(lang, "06:00 Morning", "06h00 sáng"),
          desc: t(
            lang,
            "Check fasting BG at 06:00",
            "Đo đường huyết đói lúc 06h00 sáng"
          ),
          critical: true,
        },
      ];
      regimenAdjustment = {
        primaryText: t(
          lang,
          "Severe nocturnal basal insufficiency: escalate evening dose or transition to Basal-Bolus.",
          "Phác đồ hiện tại thiếu hụt insulin nền ban đêm nghiêm trọng: bàn giao tăng liều chiều hoặc chuyển sang Basal-Bolus."
        ),
        bullets: [],
        tone: "danger",
      };
    }
  }

  return {
    kind: "inpatient",
    status: { tone: statusTone, tag: statusTag, title: statusTitle },
    effectiveTdd,
    rawTdd,
    isf,
    traj,
    warningBanner,
    medicationOrder,
    nutritionPlan: buildDynamicNutritionPlan(
      inputs,
      traj,
      sugNovomix,
      sugActrapid,
      lang
    ),
    timeline,
    regimenAdjustment,
    suggestedActrapid: sugActrapid,
    suggestedNovomix: sugNovomix,
  };
}

export function computeDkaHhs(
  inputs: InsulinInputs,
  traj: TrajectoryAnalysis,
  lang: InsulinLang
): DkaEvaluation {
  const bg = inputs.bgMgDl;
  const bgMmol = bg / 18.0;
  const isBgHi = bg >= 800;
  const {
    weight,
    k,
    na,
    ureaMmol: urea,
    ph,
    hco3,
    ketone,
    hasCHF,
    hasOliguria,
    isLowSbp,
    isPlateau,
    isEuglycemicAllowed,
    tp,
  } = inputs;

  const naCorr = na + 0.016 * (bg - 100);
  const osmEff = 2 * na + bgMmol;
  const osmTotal = 2 * na + bgMmol + urea;

  const isHypoBg = bg < 70;
  const isLowNormalBg = bg >= 70 && bg < 100;
  const hasAcidosis = ph < 7.3 || hco3 < 15.0;
  const hasDkaKetones = ketone >= 3.0;
  const hasMildKetones = ketone >= 1.0 && ketone < 3.0;
  const hasDkaGlycemia = !isHypoBg && (bg >= 200 || isEuglycemicAllowed);
  const isTrueDka = hasDkaGlycemia && hasDkaKetones && hasAcidosis;

  const hasHyperOsm = osmTotal >= 320 || osmEff >= 320;
  const isTrueHhs = !isHypoBg && hasHyperOsm && (bg >= 540 || bgMmol >= 30.0);
  const isBorderlineHhs = !isHypoBg && hasHyperOsm && bgMmol >= 25.0;

  const paramWarnings: string[] = [];
  if ((ph >= 7.35 && hco3 < 12.0) || (ph < 7.15 && hco3 >= 20.0)) {
    paramWarnings.push(
      t(
        lang,
        `Blood Gas Mismatch: pH (${ph.toFixed(2)}) and HCO3- (${hco3.toFixed(1)} mmol/L) are physiologically discordant (or severe mixed acid-base disorder). Verify lab report!`,
        `Bất tương xứng Khí máu: pH (${ph.toFixed(2)}) và HCO3- (${hco3.toFixed(1)} mmol/L) không tương xứng sinh lý (hoặc rối loạn toan-kiềm hỗn hợp nặng). Đối chiếu lại phiếu xét nghiệm!`
      )
    );
  }
  if (bg < 70) {
    paramWarnings.push(
      t(
        lang,
        `CRITICAL LOW Glucose (${bg} mg/dL ~ ${bgMmol.toFixed(1)} mmol/L): Acute hypoglycemia — IV Insulin is CONTRAINDICATED! If ketotic, suspect starvation/alcoholic ketoacidosis or insulin overdose and give IV Dextrose immediately.`,
        `Đường huyết QUÁ THẤP (${bg} mg/dL ~ ${bgMmol.toFixed(1)} mmol/L): Hạ đường huyết cấp — CHỐNG CHỈ ĐỊNH truyền Insulin! Nếu kèm tăng Ceton, đây là Toan ceton do nhịn đói / rượu hoặc quá liều Insulin — bù Glucose TM ngay!`
      )
    );
  } else if (isBgHi) {
    paramWarnings.push(
      t(
        lang,
        "Glucose HI (≥ 800 mg/dL ~ ≥ 44.4 mmol/L): High risk of severe HHS / intracellular dehydration. Send stat venous lab glucose!",
        "Đường huyết vượt ngưỡng HI (≥ 800 mg/dL ~ ≥ 44.4 mmol/L): Nguy cơ rất cao HHS nặng / mất nước nội bào trầm trọng. Gửi máu tĩnh mạch định lượng chính xác!"
      )
    );
  }
  if (k < 3.0) {
    paramWarnings.push(
      t(
        lang,
        `CRITICAL HYPOKALEMIA (${k.toFixed(1)} mmol/L < 3.0): Cardiac arrest / VF risk! Lock FRIII, attach continuous ECG monitor, and infuse IV KCl urgently.`,
        `Kali máu QUÁ THẤP nguy kịch (${k.toFixed(1)} mmol/L < 3.0): Nguy cơ ngừng tim / rung thất! Khóa BTE Insulin ngay, mắc Monitor ECG và bù KCl tĩnh mạch khẩn cấp.`
      )
    );
  } else if (k >= 6.0) {
    paramWarnings.push(
      t(
        lang,
        `CRITICAL HYPERKALEMIA (${k.toFixed(1)} mmol/L ≥ 6.0): Fatal arrhythmia risk! Strictly NO KCl in fluids; stat ECG (IV Calcium gluconate 10% if ECG changes).`,
        `Kali máu QUÁ CAO nguy kịch (${k.toFixed(1)} mmol/L ≥ 6.0): Nguy cơ rối loạn nhịp thất tử vong! Tuyệt đối không pha KCl, đo ECG cấp cứu (Calci gluconat 10% nếu có biến đổi ECG).`
      )
    );
  }
  if (na < 125) {
    paramWarnings.push(
      t(
        lang,
        `Markedly low measured Na+ (${na} mEq/L, corrected Na+ = ${naCorr.toFixed(1)} mEq/L): Check pseudohyponatremia vs true hyponatremia.`,
        `Natri máu đo được QUÁ THẤP (${na} mEq/L, Na+ hiệu chỉnh = ${naCorr.toFixed(1)} mEq/L): Kiểm tra giả hạ Natri do tăng đường huyết hay hạ Natri thực sự.`
      )
    );
  } else if (na > 158 || naCorr > 162) {
    paramWarnings.push(
      t(
        lang,
        `Severe hypernatremia (measured Na+ ${na}, corrected Na+ ${naCorr.toFixed(1)} mEq/L): Severe hypertonicity; limit Na+ fall to ≤ 10 mmol/L/24h.`,
        `Natri máu QUÁ CAO (Na+ đo ${na}, Na+ hiệu chỉnh ${naCorr.toFixed(1)} mEq/L): Ưu trương và mất nước nội bào rất nặng; tốc độ hạ Na+ ≤ 10 mmol/L/24h.`
      )
    );
  }
  if (urea >= 20.0) {
    paramWarnings.push(
      t(
        lang,
        `Markedly elevated Urea (${urea.toFixed(1)} mmol/L): Suggests severe prerenal AKI or CKD; monitor hourly urine output strictly.`,
        `Urea máu TĂNG RẤT CAO (${urea.toFixed(1)} mmol/L): Gợi ý suy thận trước thận nặng hoặc bệnh thận mạn đợt cấp; theo dõi sát nước tiểu mỗi giờ.`
      )
    );
  }
  if (ph < 6.95 || hco3 < 5.0) {
    paramWarnings.push(
      t(
        lang,
        `EXTREME ACIDOSIS (pH = ${ph.toFixed(2)}, HCO3- = ${hco3.toFixed(1)} mmol/L): Risk of myocardial depression and vasodilation; urgent ICU consult.`,
        `Toan máu CỰC NẶNG (pH = ${ph.toFixed(2)}, HCO3- = ${hco3.toFixed(1)} mmol/L): Nguy cơ ức chế cơ tim và tụt huyết áp; hội chẩn ICU ngay.`
      )
    );
  } else if (ph > 7.5 || hco3 > 32.0) {
    paramWarnings.push(
      t(
        lang,
        `Alkalemia / elevated HCO3- (pH = ${ph.toFixed(2)}, HCO3- = ${hco3.toFixed(1)} mmol/L): Evaluate vomiting, diuretic use, or over-correction.`,
        `Chỉ số Kiềm chuyển hóa / hô hấp (pH = ${ph.toFixed(2)}, HCO3- = ${hco3.toFixed(1)} mmol/L): Xem xét nôn ói, lợi tiểu hoặc bù quá tay Bicarbonat.`
      )
    );
  }

  const warningBanner: WarningBanner | null =
    paramWarnings.length > 0
      ? {
          severity: "danger",
          title: t(
            lang,
            "Abnormal / Out-of-Range Parameter Alerts",
            "Cảnh Báo Thông Số Bất Thường / Vượt Ngưỡng An Toàn"
          ),
          items: paramWarnings,
        }
      : null;

  let classifiedSyndrome: "DKA" | "HHS" | "MIXED" | "NON_DKA" = "NON_DKA";
  let nonDkaSubType = "SIMPLE_HYPER";

  if (isHypoBg) {
    classifiedSyndrome = "NON_DKA";
    if ((hasDkaKetones || hasMildKetones) && hasAcidosis) {
      nonDkaSubType = "HYPOGLYCEMIC_KETOACIDOSIS";
    } else if (hasDkaKetones || hasMildKetones) {
      nonDkaSubType = "HYPOGLYCEMIC_KETOSIS";
    } else {
      nonDkaSubType = "SEVERE_HYPOGLYCEMIA_T0";
    }
  } else if (isTrueDka && (hasHyperOsm || isTrueHhs)) {
    classifiedSyndrome = "MIXED";
  } else if (isTrueDka) {
    classifiedSyndrome = "DKA";
  } else if (
    isTrueHhs ||
    (isBorderlineHhs && !hasAcidosis && !hasDkaKetones)
  ) {
    classifiedSyndrome = "HHS";
  } else {
    classifiedSyndrome = "NON_DKA";
    if (hasDkaKetones && hasAcidosis && !hasDkaGlycemia) {
      nonDkaSubType = isLowNormalBg
        ? "STARVATION_OR_EUGLYCEMIC"
        : "EUGLYCEMIC_UNCHECKED";
    } else if (hasAcidosis && ketone < 1.0) {
      nonDkaSubType = "ACIDOSIS_NO_KETONES";
    } else if ((hasDkaKetones || hasMildKetones) && !hasAcidosis) {
      nonDkaSubType = "KETOSIS_NO_ACIDOSIS";
    } else {
      nonDkaSubType = "SIMPLE_HYPER";
    }
  }

  const activeSyndrome: "DKA" | "HHS" | "MIXED" | "NON_DKA" =
    tp === "t0" || inputs.lockedSyndrome === "auto"
      ? classifiedSyndrome
      : inputs.lockedSyndrome;

  const isDkaResolved =
    !isHypoBg && ketone < 0.6 && ph >= 7.3 && (tp === "t4" || hco3 >= 15.0);
  const isHhsResolved = !isHypoBg && osmTotal < 300 && bgMmol < 15.0;
  const isResolved =
    activeSyndrome === "HHS"
      ? isHhsResolved
      : activeSyndrome === "MIXED"
      ? isDkaResolved && osmTotal < 310
      : isDkaResolved;

  const isInitialNonDka = tp === "t0" && activeSyndrome === "NON_DKA";

  if (isInitialNonDka) {
    let tone: ClinicalSeverity = "warning";
    let classLabel = "";
    let statusTitle = "";
    let fallback: NonDkaFallback;

    if (
      nonDkaSubType === "HYPOGLYCEMIC_KETOACIDOSIS" ||
      nonDkaSubType === "HYPOGLYCEMIC_KETOSIS"
    ) {
      tone = "danger";
      classLabel = t(
        lang,
        "HYPOGLYCEMIC KETOACIDOSIS (NOT DKA!)",
        "HẠ ĐƯỜNG HUYẾT KÈM TOAN CETON (KHÔNG PHẢI DKA!)"
      );
      statusTitle = t(
        lang,
        `RED ALERT: Low BG (${bg} mg/dL ~ ${bgMmol.toFixed(1)} mmol/L) with Ketosis — Suspect Starvation / Alcoholic Ketoacidosis or Insulin Overdose!`,
        `CẢNH BÁO ĐỎ: Đường huyết quá thấp (${bg} mg/dL ~ ${bgMmol.toFixed(1)} mmol/L) kèm Tăng Ceton — Nghi Toan Ceton Đói / Rượu hoặc Quá liều Insulin!`
      );
      fallback = {
        code: nonDkaSubType,
        tone: "danger",
        badge: t(lang, "INSULIN CONTRAINDICATED!", "CHỐNG CHỈ ĐỊNH INSULIN!"),
        title: t(
          lang,
          "EMERGENCY: KETOACIDOSIS WITH HYPOGLYCEMIA (NOT DKA!)",
          "CẢNH BÁO KHẨN CẤP: TOAN CETON KÈM HẠ ĐƯỜNG HUYẾT (KHÔNG PHẢI DKA!)"
        ),
        section: {
          primaryText: t(
            lang,
            `DO NOT INFUSE INSULIN! Patient has severe hypoglycemia (BG = ${bg} mg/dL ~ ${bgMmol.toFixed(1)} mmol/L) with ketosis (${ketone.toFixed(1)} mmol/L) — Insulin here can cause fatal neuroglycopenia!`,
            `TUYỆT ĐỐI KHÔNG TRUYỀN INSULIN! Bệnh nhân đang Hạ đường huyết nặng (BG = ${bg} mg/dL ~ ${bgMmol.toFixed(1)} mmol/L) kèm tăng Ceton (${ketone.toFixed(1)} mmol/L) — Truyền Insulin lúc này sẽ gây tử vong do hạ đường huyết não!`
          ),
          bullets: [
            t(
              lang,
              "1. Immediate Hypoglycemia Rescue: Slow IV bolus 30–50 mL 30% Dextrose (or 150–200 mL 10% Dextrose), followed by continuous 10% Dextrose at 100–125 mL/h.",
              "1. Cấp cứu Hạ đường huyết ngay: Tiêm tĩnh mạch chậm (Bolus) 30–50 mL Glucose 30% (hoặc 150–200 mL Glucose 10%), sau đó duy trì truyền tĩnh mạch Glucose 10% tốc độ 100–125 mL/h."
            ),
            t(
              lang,
              "2. IV Thiamine (Vitamin B1) 100–200 mg: Mandatory BEFORE or WITH glucose if malnutrition, prolonged fasting, or alcohol use is suspected to prevent Wernicke encephalopathy.",
              "2. Tiêm tĩnh mạch Thiamine (Vitamin B1) 100–200 mg IV: Bắt buộc tiêm trước hoặc cùng lúc truyền Glucose nếu nghi suy kiệt, nhịn đói hoặc nghiện rượu để phòng bệnh não Wernicke cấp."
            ),
            t(
              lang,
              `3. Differential & Mechanism (pH = ${ph.toFixed(2)}, HCO3- = ${hco3.toFixed(1)} mmol/L): Starvation ketoacidosis, alcoholic ketoacidosis, adrenal crisis, or insulin overdose. Dextrose infusion halts lipolysis and clears ketones without insulin.`,
              `3. Cơ chế & Chẩn đoán phân biệt (pH = ${ph.toFixed(2)}, HCO3- = ${hco3.toFixed(1)} mmol/L): Toan ceton do nhịn đói / suy kiệt, toan ceton do rượu, suy thượng thận cấp hoặc quá liều Insulin. Truyền Glucose 10% sẽ tự ngừng phân giải mỡ và xóa Ceton mà không cần Insulin.`
            ),
            t(
              lang,
              "4. Monitoring: Recheck capillary BG in 15 min; replete K+ and Mg2+ per labs.",
              "4. Theo dõi sát: Bấm lại đường huyết mao mạch sau 15 phút; bồi phụ Kali và Magie theo điện giải đồ."
            ),
          ],
          tone: "danger",
        },
        showSwitchTo18h: false,
      };
    } else if (nonDkaSubType === "SEVERE_HYPOGLYCEMIA_T0") {
      tone = "danger";
      classLabel = t(
        lang,
        `HYPOGLYCEMIA EMERGENCY (${bg} mg/dL)`,
        `CẤP CỨU HẠ ĐƯỜNG HUYẾT (${bg} mg/dL)`
      );
      statusTitle = t(
        lang,
        `Low BG (${bg} mg/dL ~ ${bgMmol.toFixed(1)} mmol/L) — DO NOT infuse insulin! Give IV Dextrose immediately.`,
        `Đường huyết quá thấp (${bg} mg/dL ~ ${bgMmol.toFixed(1)} mmol/L) — Tuyệt đối KHÔNG truyền Insulin! Bù Glucose TM ngay.`
      );
      fallback = {
        code: nonDkaSubType,
        tone: "danger",
        badge: t(lang, "INSULIN CONTRAINDICATED!", "CHỐNG CHỈ ĐỊNH INSULIN!"),
        title: t(
          lang,
          `ACUTE HYPOGLYCEMIA EMERGENCY (BG = ${bg} mg/dL ~ ${bgMmol.toFixed(1)} mmol/L)`,
          `CẤP CỨU HẠ ĐƯỜNG HUYẾT CẤP (BG = ${bg} mg/dL ~ ${bgMmol.toFixed(1)} mmol/L)`
        ),
        section: {
          primaryText: t(
            lang,
            "STOP ALL INSULIN! Give IV Dextrose immediately (30–50 mL 30% Dextrose or 150–200 mL 10% Dextrose)!",
            "NGƯNG TOÀN BỘ INSULIN! Bù Glucose tĩnh mạch ngay lập tức (30–50 mL Glucose 30% hoặc 150–200 mL Glucose 10%)!"
          ),
          bullets: [
            t(
              lang,
              "Maintain 10% Dextrose at 100–125 mL/h and recheck capillary BG every 15 minutes until BG ≥ 100 mg/dL.",
              "Truyền Glucose 10% tốc độ 100–125 mL/h và thử lại đường huyết mao mạch mỗi 15 phút đến khi BG ≥ 100 mg/dL."
            ),
            t(
              lang,
              "This is acute hypoglycemia, not DKA or HHS.",
              "Bệnh nhân đang hạ đường huyết cấp, không phải DKA hay HHS."
            ),
          ],
          tone: "danger",
        },
        showSwitchTo18h: false,
      };
    } else if (nonDkaSubType === "STARVATION_OR_EUGLYCEMIC") {
      tone = "danger";
      classLabel = t(
        lang,
        `LOW-NORMAL BG KETOACIDOSIS (${bg} mg/dL)`,
        `TOAN CETON ĐƯỜNG HUYẾT THẤP-BÌNH THƯỜNG (${bg} mg/dL)`
      );
      statusTitle = t(
        lang,
        `Ketoacidosis with BG ${bg} mg/dL (70–99) — Differentiate Starvation/Alcoholic Ketoacidosis vs Euglycemic DKA!`,
        `Toan Ceton với Đường huyết ${bg} mg/dL (70–99) — Phân biệt Toan Ceton Đói/Rượu với Euglycemic DKA!`
      );
      fallback = {
        code: nonDkaSubType,
        tone: "danger",
        badge: t(
          lang,
          "Starvation/Alcoholic vs Euglycemic DKA",
          "Phân biệt Toan Ceton Đói/Rượu vs Euglycemic DKA"
        ),
        title: t(
          lang,
          `KETOACIDOSIS WITH LOW-NORMAL BG (${bg} mg/dL ~ ${bgMmol.toFixed(1)} mmol/L)`,
          `TOAN CETON VỚI ĐƯỜNG HUYẾT THẤP-BÌNH THƯỜNG (${bg} mg/dL ~ ${bgMmol.toFixed(1)} mmol/L)`
        ),
        section: {
          primaryText: t(
            lang,
            `Ketoacidosis (Ketones = ${ketone.toFixed(1)} mmol/L, pH = ${ph.toFixed(2)}) with BG only ${bg} mg/dL (70–99 mg/dL) — DO NOT give unopposed insulin!`,
            `Bệnh nhân có Toan Ceton (Ceton = ${ketone.toFixed(1)} mmol/L, pH = ${ph.toFixed(2)}) nhưng Đường huyết chỉ ${bg} mg/dL (70–99 mg/dL) — CHƯA ĐƯỢC truyền Insulin đơn thuần!`
          ),
          bullets: [
            t(
              lang,
              "Possibility 1 — Starvation / Alcoholic Ketoacidosis: Common when BG < 100 mg/dL. Treat with 10% Dextrose 100–125 mL/h (+ IV Thiamine 100–200 mg) WITHOUT insulin.",
              "Khả năng 1 — Toan Ceton Đói / Nôn ói / Rượu: Rất thường gặp khi BG < 100 mg/dL. Xử trí bằng truyền Glucose 10% 100–125 mL/h (+ Thiamine 100–200 mg IV), KHÔNG truyền Insulin."
            ),
            t(
              lang,
              'Possibility 2 — True Euglycemic DKA (SGLT2i, pregnancy, T1DM): Start 10% Dextrose 125 mL/h FIRST to secure BG, then enable the "SGLT2i / Pregnancy / Known DM" toggle to run low-dose FRIII (0.05 u/kg/h).',
              'Khả năng 2 — Euglycemic DKA thực sự (SGLT2i, Thai kỳ, ĐTĐ típ 1): Mắc truyền Glucose 10% 125 mL/h trước để nâng đường huyết an toàn, sau đó bật ô "Đang dùng SGLT2i / Thai kỳ / Đã biết ĐTĐ" để chạy BTE 0.05 u/kg/h.'
            ),
          ],
          tone: "danger",
        },
        showSwitchTo18h: false,
      };
    } else if (nonDkaSubType === "ACIDOSIS_NO_KETONES") {
      tone = "danger";
      classLabel = t(
        lang,
        "NON-KETOTIC METABOLIC ACIDOSIS",
        "TOAN CHUYỂN HÓA KHÔNG TĂNG CETON"
      );
      statusTitle = t(
        lang,
        "Acidemia (pH < 7.30 / HCO3- < 15) with negative ketones (< 1.0 mmol/L)!",
        "Toan máu (pH < 7.30 / HCO3- < 15) nhưng Ceton máu âm tính (< 1.0 mmol/L)!"
      );
      fallback = {
        code: nonDkaSubType,
        tone: "danger",
        badge: t(lang, "DKA FRIII Not Indicated", "Không chỉ định FRIII DKA"),
        title: t(
          lang,
          "NON-KETOTIC METABOLIC ACIDOSIS (KETONES < 1.0 mmol/L)",
          "TOAN CHUYỂN HÓA KHÔNG DO CETON (CETON < 1.0 mmol/L)"
        ),
        section: {
          primaryText: t(
            lang,
            `DKA FRIII (0.1 u/kg/h) is CONTRAINDICATED because blood ketones are negative (${ketone.toFixed(1)} mmol/L)!`,
            `CHỐNG CHỈ ĐỊNH chạy Bơm tiêm điện DKA (0.1 units/kg/h) vì Ceton máu âm tính (${ketone.toFixed(1)} mmol/L)!`
          ),
          bullets: [
            t(
              lang,
              `Acidemia present (pH = ${ph.toFixed(2)}, HCO3- = ${hco3.toFixed(1)} mmol/L) without ketosis.`,
              `Bệnh nhân có Toan máu (pH = ${ph.toFixed(2)}, HCO3- = ${hco3.toFixed(1)} mmol/L) nhưng không tăng Ceton.`
            ),
            t(
              lang,
              "Work up alternative causes: Lactic acidosis (sepsis, hypoxia, hepatic failure, Metformin), AKI/CKD, or toxic ingestion.",
              "Tầm soát ngay nguyên nhân Toan chuyển hóa khác: Toan Lactic (Sốc nhiễm trùng, thiếu oxy mô, suy gan, Metformin), Suy thận cấp hoặc Ngộ độc."
            ),
            t(
              lang,
              "Manage hyperglycemia (if present) using SC insulin (Mode 1 / Mode 2) or standard VRIII.",
              "Kiểm soát đường huyết (nếu tăng) bằng Insulin tiêm dưới da (Tab 1 / Tab 2) hoặc VRIII liều chuẩn."
            ),
          ],
          tone: "danger",
        },
        showSwitchTo18h: false,
      };
    } else if (nonDkaSubType === "EUGLYCEMIC_UNCHECKED") {
      tone = "danger";
      classLabel = t(
        lang,
        "SUSPECTED EUGLYCEMIC DKA",
        "NGHI NGỜ DKA ĐƯỜNG HUYẾT BÌNH THƯỜNG"
      );
      statusTitle = t(
        lang,
        `Ketoacidosis (Ketones ≥ 3.0 & pH < 7.30) with BG ${bg} mg/dL (100–199)!`,
        `Có Toan Ceton (Ceton ≥ 3.0 & pH < 7.30) với Đường huyết ${bg} mg/dL (100–199)!`
      );
      fallback = {
        code: nonDkaSubType,
        tone: "danger",
        badge: t(lang, "BG 100–199 + Ketoacidosis", "BG 100–199 + Toan Ceton"),
        title: t(
          lang,
          "SUSPECTED EUGLYCEMIC DKA OR STARVATION KETOACIDOSIS",
          "NGHI NGỜ DKA ĐƯỜNG HUYẾT BÌNH THƯỜNG (EUGLYCEMIC DKA) HOẶC TOAN CETON DO ĐÓI"
        ),
        section: {
          primaryText: t(
            lang,
            `Ketoacidosis criteria met (Ketones = ${ketone.toFixed(1)} mmol/L ≥ 3.0, pH = ${ph.toFixed(2)}), but BG < 200 mg/dL (${bg} mg/dL ~ ${bgMmol.toFixed(1)} mmol/L).`,
            `Có đủ tiêu chuẩn Toan Ceton (Ceton = ${ketone.toFixed(1)} mmol/L ≥ 3.0; pH = ${ph.toFixed(2)}) nhưng Đường huyết < 200 mg/dL (${bg} mg/dL ~ ${bgMmol.toFixed(1)} mmol/L).`
          ),
          bullets: [
            t(
              lang,
              'If on SGLT2 inhibitor (Empagliflozin, Dapagliflozin...), pregnant, or known DM: enable the "SGLT2i / Pregnancy / Known DM" modifier on the left to unlock Euglycemic DKA protocol (10% Dextrose 125 mL/h + FRIII).',
              'Nếu đang dùng thuốc ức chế SGLT2, mang thai hoặc đã biết ĐTĐ: bật ô "Đang dùng SGLT2i / Thai kỳ / Đã biết ĐTĐ" ở cột trái để mở phác đồ Euglycemic DKA (Glucose 10% 125 mL/h song song BTE).'
            ),
            t(
              lang,
              "If non-diabetic (prolonged fasting, vomiting, alcohol): Starvation/Alcoholic ketoacidosis — treat with 10% Dextrose 100–125 mL/h (+ IV Thiamine), NO insulin.",
              "Nếu KHÔNG bị ĐTĐ (nhịn đói, nôn ói, nghiện rượu): Đây là Toan Ceton Đói/Rượu — xử trí bằng Glucose 10% 100–125 mL/h (+ Vitamin B1 TM), không truyền Insulin."
            ),
          ],
          tone: "danger",
        },
        showSwitchTo18h: false,
      };
    } else {
      tone = "warning";
      const isKetosisOnly = nonDkaSubType === "KETOSIS_NO_ACIDOSIS";
      classLabel = isKetosisOnly
        ? t(lang, "KETOSIS WITHOUT ACIDOSIS", "TĂNG CETON CHƯA NHIỄM TOAN")
        : t(lang, "SIMPLE HYPERGLYCEMIA", "TĂNG ĐƯỜNG HUYẾT ĐƠN THUẦN");
      statusTitle = isKetosisOnly
        ? t(
            lang,
            `Elevated ketones (${ketone.toFixed(1)} mmol/L) without acidemia (pH ≥ 7.30 & HCO3- ≥ 15)`,
            `Tăng Ceton máu (${ketone.toFixed(1)} mmol/L) nhưng chưa nhiễm toan (pH ≥ 7.30 & HCO3- ≥ 15)`
          )
        : t(
            lang,
            "Does not meet emergency DKA or HHS diagnostic criteria",
            "Chưa đủ tiêu chuẩn chẩn đoán DKA hoặc HHS cấp cứu"
          );
      fallback = {
        code: nonDkaSubType,
        tone: "warning",
        badge: classLabel,
        title: t(
          lang,
          "DKA / HHS EMERGENCY CRITERIA NOT MET",
          "CHƯA ĐỦ TIÊU CHUẨN CHẨN ĐOÁN CẤP CỨU DKA / HHS"
        ),
        section: {
          primaryText: t(
            lang,
            "Fixed-rate IV insulin (FRIII) is not indicated without metabolic acidosis (pH < 7.30 or HCO3- < 15) and with Osmolality < 320 mOsm/kg.",
            "Không chỉ định đặt Bơm tiêm điện Insulin cố định (FRIII) khi chưa có toan chuyển hóa (pH ≥ 7.30 & HCO3- ≥ 15) và ALTT < 320 mOsm/kg."
          ),
          bullets: [
            t(
              lang,
              `Current labs: BG = ${isBgHi ? "HI (≥ 800 mg/dL)" : `${bg} mg/dL (${bgMmol.toFixed(1)} mmol/L)`}, Ketones = ${ketone.toFixed(1)} mmol/L, pH = ${ph.toFixed(2)}, HCO3- = ${hco3.toFixed(1)} mmol/L, Total Osm = ${osmTotal.toFixed(1)} mOsm/kg.`,
              `Chỉ số hiện tại: BG = ${isBgHi ? "HI (≥ 800 mg/dL)" : `${bg} mg/dL (${bgMmol.toFixed(1)} mmol/L)`}, Ceton = ${ketone.toFixed(1)} mmol/L, pH = ${ph.toFixed(2)}, HCO3- = ${hco3.toFixed(1)} mmol/L, ALTT = ${osmTotal.toFixed(1)} mOsm/kg.`
            ),
            t(
              lang,
              "Management: Oral or IV 0.9% NaCl hydration and switch to Mode 1 (06:00) or Mode 2 (18:00) for SC Actrapid dosing.",
              "Hướng xử trí: Bù dịch uống hoặc truyền NaCl 0.9% và chuyển về Tab 1 (06h00) hoặc Tab 2 (18h00) để tính liều Actrapid tiêm dưới da."
            ),
          ],
          tone: "warning",
        },
        showSwitchTo18h: true,
      };
    }

    return {
      kind: "dka",
      status: { tone, tag: classLabel, title: statusTitle },
      activeSyndrome,
      classifiedSyndrome,
      nonDkaFallback: fallback,
      isResolved: false,
      indices: {
        bgMmol,
        naCorr,
        osmEff,
        osmTotal,
        classificationLabel: classLabel,
      },
      traj,
      warningBanner,
      axes: null,
      suggestedIvRate: 0,
    };
  }

  // Active DKA / HHS / MIXED Management (T0..T4)
  let statusTone: ClinicalSeverity = "danger";
  let classLabel = "";
  let statusTitle = "";

  if (isHypoBg) {
    statusTone = "danger";
    classLabel = t(
      lang,
      `IATROGENIC HYPOGLYCEMIA (${bg} mg/dL)`,
      `HẠ ĐƯỜNG HUYẾT TRONG ĐIỀU TRỊ (${bg} mg/dL)`
    );
    statusTitle = t(
      lang,
      `EMERGENCY: BG fell to ${bg} mg/dL (${bgMmol.toFixed(1)} mmol/L) on therapy — STOP FRIII & GIVE IV DEXTROSE NOW!`,
      `CẤP CỨU: Đường huyết tụt xuống ${bg} mg/dL (${bgMmol.toFixed(1)} mmol/L) khi đang điều trị — TẠM NGƯNG BTE INSULIN & BÙ GLUCOSE TM NGAY!`
    );
  } else if (isResolved) {
    statusTone = "ok";
    classLabel =
      activeSyndrome === "HHS"
        ? t(lang, "HHS RESOLVED (JBDS 06)", "ĐÃ THOÁT HHS (JBDS 06)")
        : t(lang, "DKA RESOLVED (JBDS 02)", "ĐÃ THOÁT DKA (JBDS 02)");
    statusTitle = t(
      lang,
      "Resolution criteria met — prepare 30–60 min overlap to SC insulin",
      "Đã đạt tiêu chuẩn kết thúc giai đoạn cấp — chuẩn bị chuyển tiêm dưới da gối đầu"
    );
  } else if (activeSyndrome === "HHS") {
    statusTone = "info";
    classLabel = hasMildKetones
      ? t(
          lang,
          "HHS WITH MILD KETOSIS (1.0–2.9)",
          "HHS KÈM CETON NHẸ (1.0–2.9)"
        )
      : t(lang, "PURE HHS (JBDS 06)", "HHS THUẦN TÚY (JBDS 06)");
    statusTitle = t(
      lang,
      `Hyperosmolar Hyperglycemic State (HHS${isBgHi ? " — BG HI ≥ 800" : ""}) — prioritize fluids & gradual Osm fall (3–8 mOsm/kg/h)`,
      `Tăng Áp Lực Thẩm Thấu Máu (HHS${isBgHi ? " - BG: HI ≥ 800 mg/dL" : ""}) — ưu tiên bồi phụ dịch & hạ ALTT từ từ (3–8 mOsm/kg/h)`
    );
  } else if (activeSyndrome === "MIXED") {
    statusTone = "danger";
    classLabel = t(lang, "MIXED DKA + HHS", "HỘI CHỨNG HỖN HỢP DKA + HHS");
    statusTitle = t(
      lang,
      `Mixed DKA + HHS (Osm ≥ 320 mOsm/kg with Ketoacidosis${isBgHi ? ", BG HI ≥ 800" : ""})`,
      `Hội Chứng Hỗn Hợp DKA + HHS (ALTT ≥ 320 mOsm/kg kèm Toan Ceton${isBgHi ? ", BG: HI ≥ 800" : ""})`
    );
  } else {
    statusTone = "danger";
    const isSevereDka =
      ketone > 6.0 ||
      ph < 7.0 ||
      hco3 < 5.0 ||
      k < 3.5 ||
      isLowSbp ||
      hasOliguria ||
      isBgHi;
    classLabel = isSevereDka
      ? t(lang, "SEVERE DKA (JBDS 02)", "DKA MỨC ĐỘ NẶNG (JBDS 02)")
      : t(lang, "EMERGENCY DKA (JBDS 02)", "DKA CẤP CỨU (JBDS 02)");
    statusTitle = isSevereDka
      ? t(
          lang,
          "Severe Diabetic Ketoacidosis — urgent ICU / HDU consultation!",
          "Toan Ceton Đái Tháo Đường Nặng — cần hội chẩn Hồi sức / HDU ngay!"
        )
      : t(
          lang,
          "Diabetic Ketoacidosis (DKA) — target ketone fall ≥ 0.5 mmol/L/h",
          "Toan Ceton Đái Tháo Đường (DKA) — mục tiêu giảm Ceton ≥ 0.5 mmol/L/h"
        );
  }

  // AXIS 1: FLUIDS & DEXTROSE
  const isFluidRestricted = hasCHF || hasOliguria;
  const g10RateStr = isFluidRestricted
    ? t(
        lang,
        "60–80 mL/h (reduced for CHF/overload)",
        "60–80 mL/h (giảm thể tích do suy tim/quá tải)"
      )
    : "125 mL/h";

  let fluidPrimary = "";
  const fluidBullets: string[] = [];
  let fluidTone: ClinicalSeverity = "info";
  let fluidBadge = "";

  if (isHypoBg) {
    fluidTone = "danger";
    fluidBadge = t(
      lang,
      "Hypoglycemia Rescue (< 70 mg/dL)",
      "Cấp cứu Hạ đường huyết (< 70 mg/dL)"
    );
    fluidPrimary = t(
      lang,
      `GIVE IV BOLUS 150–200 mL 10% Dextrose (or 30–50 mL 30% Dextrose) over 10–15 min, then run 10% Dextrose at ${g10RateStr}!`,
      `TIÊM TĨNH MẠCH NGAY 150–200 mL Glucose 10% (hoặc 30–50 mL Glucose 30%) trong 10–15 phút, sau đó duy trì truyền Glucose 10% tốc độ ${g10RateStr}!`
    );
    fluidBullets.push(
      t(
        lang,
        `Background 0.9% NaCl: ${isFluidRestricted ? "minimize to 50–80 mL/h to prevent overload." : "maintain 125–250 mL/h per hemodynamics alongside 10% Dextrose."}`,
        `Dịch truyền nền (NaCl 0.9%): ${isFluidRestricted ? "giảm tối thiểu 50–80 mL/h để tránh quá tải tuần hoàn." : "duy trì theo nhu cầu huyết động (125–250 mL/h) song song Glucose 10%."}`
      )
    );
    fluidBullets.push(
      t(
        lang,
        "Target: Raise BG ≥ 100–140 mg/dL within 15–30 minutes to protect CNS and provide substrate to clear ketones.",
        "Mục tiêu: Nâng ngay đường huyết lên ≥ 100–140 mg/dL trong 15–30 phút để bảo vệ não và làm cơ chất tiếp tục xóa Ceton."
      )
    );
  } else {
    if (isLowSbp && tp === "t0") {
      fluidTone = "danger";
      fluidPrimary = t(
        lang,
        "HYPOVOLEMIC SHOCK (SBP < 90 mmHg): Infuse 500 mL 0.9% NaCl over 10–15 minutes!",
        "SỐC GIẢM THỂ TÍCH (HA tâm thu < 90 mmHg): Truyền nhanh 500 mL NaCl 0.9% trong 10–15 phút!"
      );
      fluidBullets.push(
        t(
          lang,
          "If SBP remains < 90 mmHg after first 500 mL: repeat 500 mL 0.9% NaCl and call ICU support immediately (JBDS Box 2).",
          "Nếu HA vẫn < 90 mmHg sau 500 mL đầu: lặp lại thêm 500 mL NaCl 0.9% và gọi hỗ trợ Hồi sức (ICU) ngay (JBDS Box 2)."
        )
      );
    }

    if (hasOliguria) {
      fluidTone = "danger";
      fluidBullets.push(
        t(
          lang,
          "Oliguria / Anuria / Severe AKI Warning: Avoid routine high-rate resuscitation! Guide fluids via CVP / IVC ultrasound and consult nephrology.",
          "Cảnh báo Thiểu niệu / Vô niệu / Suy thận nặng: Không áp dụng tốc độ bù dịch lớn thường quy! Bù dịch theo CVP / siêu âm IVC và hội chẩn Thận nhân tạo."
        )
      );
    }

    const tpWindow =
      tp === "t0" ? "0–1h" : tp === "t1" ? "1–6h" : tp === "t2" ? "6–12h" : "12–24h+";

    if (activeSyndrome === "HHS") {
      fluidBadge = t(
        lang,
        `HHS Fluids (${tpWindow} — JBDS 06)`,
        `Phác đồ dịch HHS (${tpWindow} — JBDS 06)`
      );
      let hhsRate = "";
      if (tp === "t0") {
        hhsRate = isFluidRestricted
          ? t(
              lang,
              "250–500 mL over hour 1 (50% reduction for CHF / renal failure)",
              "250–500 mL trong 1 giờ đầu (giảm 50% tốc độ do Suy tim / Suy thận)"
            )
          : t(lang, "1000 mL over hour 1 (1000 mL/h)", "1000 mL trong 1 giờ đầu (1000 mL/h)");
      } else if (tp === "t1") {
        hhsRate = isFluidRestricted
          ? t(
              lang,
              "200–300 mL/h during 1–6h (restricted for CHF / renal failure)",
              "200–300 mL/h trong giai đoạn 1–6 giờ (hạn chế dịch do Suy tim / Suy thận)"
            )
          : t(
              lang,
              "500–1000 mL/h during 1–6h (target +2 to +3 L positive balance by 6h)",
              "500–1000 mL/h trong giai đoạn 1–6 giờ (mục tiêu cân bằng dịch dương 2–3 L tại mốc 6h)"
            );
      } else if (tp === "t2") {
        hhsRate = isFluidRestricted
          ? t(
              lang,
              "125–200 mL/h during 6–12h (50% reduction for CHF / renal failure)",
              "125–200 mL/h trong giai đoạn 6–12 giờ (giảm 50% do Suy tim / Suy thận)"
            )
          : t(
              lang,
              "250–500 mL/h during 6–12h (target +3 to +6 L positive balance by 12h)",
              "250–500 mL/h trong giai đoạn 6–12 giờ (mục tiêu cân bằng dịch dương 3–6 L tại mốc 12h)"
            );
      } else {
        hhsRate = isFluidRestricted
          ? t(
              lang,
              "80–125 mL/h during 12–24h+ (cautious maintenance to prevent pulmonary edema)",
              "80–125 mL/h trong giai đoạn 12–24 giờ+ (duy trì thận trọng tránh phù phổi cấp)"
            )
          : t(
              lang,
              "150–250 mL/h during 12–24h+ (complete remaining fluid deficit over 24–48h)",
              "150–250 mL/h trong giai đoạn 12–24 giờ+ (bù hoàn tất lượng dịch thiếu còn lại trong 24–48h)"
            );
      }

      if (!fluidPrimary) {
        fluidPrimary =
          t(
            lang,
            `Infuse IV 0.9% NaCl at ${hhsRate}`,
            `Truyền tĩnh mạch NaCl 0.9% tốc độ ${hhsRate}`
          ) +
          (bg < 250 && !isResolved
            ? t(
                lang,
                ` + parallel 10% (or 5%) Dextrose at ${g10RateStr}.`,
                ` + mắc song song Glucose 10% (hoặc 5%) tốc độ ${g10RateStr}.`
              )
            : ".");
      } else {
        fluidBullets.push(
          t(
            lang,
            `Once BP stabilizes: continue 0.9% NaCl at ${hhsRate}${bg < 250 && !isResolved ? ` + 10% Dextrose ${g10RateStr}` : ""}.`,
            `Sau khi huyết áp ổn định: tiếp tục truyền NaCl 0.9% tốc độ ${hhsRate}${bg < 250 && !isResolved ? ` + Glucose 10% ${g10RateStr}` : ""}.`
          )
        );
      }
      if (hasCHF) {
        fluidTone = "warning";
        fluidBullets.push(
          t(
            lang,
            `CHF / Elderly Mode (${tpWindow}): 50% fluid rate reduction applied per JBDS. Monitor SpO2, lung crackles, JVP, and hourly urine output.`,
            `Chế độ Suy tim / Người cao tuổi (${tpWindow}): đã tự động giảm 50% tốc độ truyền dịch theo JBDS. Theo dõi sát SpO2, ran ẩm đáy phổi, tĩnh mạch cổ và nước tiểu mỗi giờ.`
          )
        );
      }
      fluidBullets.push(
        t(
          lang,
          "Physiologic Na+ rise: As BG falls by 100 mg/dL (~5.5 mmol/L), Na+ naturally rises ~2.4 mmol/L as water shifts intracellularly (not an indication to switch to hypotonic fluid).",
          "Lưu ý tăng Natri sinh lý: Khi đường huyết giảm 100 mg/dL (~5.5 mmol/L), Natri máu tự nhiên tăng ~2.4 mmol/L do nước vào nội bào (không phải chỉ định đổi sang dịch nhược trương)."
        )
      );
      fluidBullets.push(
        t(
          lang,
          "0.45% NaCl indication: Switch ONLY if Na+ is rising AND Osmolality fails to fall (< 3 mOsm/kg/h) despite positive fluid balance (cap Na+ drop ≤ 10 mmol/L/24h).",
          "Chỉ định đổi NaCl 0.45%: Chỉ đổi khi Natri tăng VÀ ALTT không giảm (< 3 mOsm/kg/h) dù đã bù đủ dịch dương (giới hạn giảm Na+ ≤ 10 mmol/L/24h)."
        )
      );
    } else {
      fluidBadge = t(
        lang,
        `DKA Fluids (${tpWindow} — JBDS 02)`,
        `Phác đồ dịch DKA (${tpWindow} — JBDS 02)`
      );
      let dkaFluidOrderStr = "";
      if (tp === "t0") {
        dkaFluidOrderStr = isFluidRestricted
          ? t(
              lang,
              "0.9% NaCl 250–500 mL over 1–2h (250 mL/h — 50% reduced for CHF / renal failure)",
              "NaCl 0.9% 250–500 mL trong 1–2 giờ đầu (250 mL/h — giảm 50% do Suy tim / Suy thận)"
            )
          : t(
              lang,
              "1000 mL 0.9% NaCl over hour 1 (1000 mL/h; no KCl in first bag)",
              "1000 mL NaCl 0.9% trong 1 giờ đầu (1000 mL/h, chưa pha KCl ở chai đầu)"
            );
      } else if (tp === "t1") {
        dkaFluidOrderStr = isFluidRestricted
          ? t(
              lang,
              "1–6h (CHF/Renal restricted): 0.9% NaCl 500 mL over 2h (250 mL/h), then 125 mL/h (500 mL over 4h)",
              "Giai đoạn 1–6 giờ (Hạn chế dịch Suy tim/Thận): NaCl 0.9% 500 mL trong 2 giờ (250 mL/h), sau đó giảm còn 125 mL/h (500 mL trong 4 giờ)"
            )
          : t(
              lang,
              "1–6h: 1000 mL 0.9% NaCl bags (Bags 2 & 3: over 2h each = 500 mL/h; Bag 4: over 4h = 250 mL/h)",
              "Giai đoạn 1–6 giờ: 1000 mL NaCl 0.9% (Chai 2 & 3: mỗi chai 2 giờ = 500 mL/h; Chai 4: trong 4 giờ = 250 mL/h)"
            );
      } else if (tp === "t2") {
        dkaFluidOrderStr = isFluidRestricted
          ? t(
              lang,
              "6–12h (CHF/Renal restricted): 50% reduced to 100–125 mL/h (500–750 mL 0.9% NaCl over 6h)",
              "Giai đoạn 6–12 giờ (Hạn chế dịch Suy tim/Thận): giảm 50% còn 100–125 mL/h (500–750 mL NaCl 0.9% trong 6 giờ)"
            )
          : t(
              lang,
              "6–12h (Bags 5 & 6): 1000 mL 0.9% NaCl every 4h (250 mL/h; ~1500 mL over 6h)",
              "Giai đoạn 6–12 giờ (Chai 5 & 6): truyền 1000 mL NaCl 0.9% mỗi 4 giờ (250 mL/h; tổng ~1500 mL trong 6 giờ)"
            );
      } else {
        dkaFluidOrderStr = isFluidRestricted
          ? t(
              lang,
              "12–24h+ Maintenance (CHF/Renal restricted): minimal 0.9% NaCl 50–80 mL/h (300–500 mL/6h), or stop if drinking orally",
              "Giai đoạn duy trì 12–24 giờ+ (Hạn chế dịch Suy tim/Thận): tối thiểu NaCl 0.9% 50–80 mL/h (300–500 mL/6h), hoặc ngưng nếu uống được"
            )
          : t(
              lang,
              "12–24h+ Maintenance (Bag 7+): reduce 0.9% NaCl to 1000 mL every 6–8h (125–166 mL/h)",
              "Giai đoạn duy trì 12–24 giờ+ (Chai 7+): giảm tốc độ NaCl 0.9% xuống 1000 mL mỗi 6–8 giờ (125–166 mL/h)"
            );
      }

      if (!fluidPrimary) {
        fluidPrimary =
          t(
            lang,
            `Infuse IV ${dkaFluidOrderStr}`,
            `Truyền tĩnh mạch ${dkaFluidOrderStr}`
          ) +
          (bg < 250 && !isResolved
            ? t(
                lang,
                ` + parallel 10% Dextrose at ${g10RateStr}.`,
                ` + mắc song song Glucose 10% tốc độ ${g10RateStr}.`
              )
            : ".");
      } else {
        fluidBullets.push(
          t(
            lang,
            `Once BP stabilizes: continue ${dkaFluidOrderStr}.`,
            `Sau khi huyết áp ổn định: tiếp tục truyền ${dkaFluidOrderStr}.`
          )
        );
      }

      if (hasCHF) {
        fluidTone = "warning";
        if (tp === "t2") {
          fluidBullets.push(
            t(
              lang,
              "CHF / Elderly (6–12h): 0.9% NaCl reduced 50% to 100–125 mL/h. If running parallel 10% Dextrose (BG < 250), cap combined two-line rate ≤ 160–180 mL/h and auscultate lungs q2h.",
              "Chế độ Suy tim / Người cao tuổi (6–12h): đã giảm 50% tốc độ NaCl 0.9% xuống 100–125 mL/h. Nếu chạy kèm Glucose 10% (BG < 250), giữ tổng 2 đường ≤ 160–180 mL/h và nghe phổi mỗi 2 giờ."
            )
          );
        } else if (tp === "t4") {
          fluidBullets.push(
            t(
              lang,
              "CHF / Elderly (12–24h+): maintenance reduced to 50–80 mL/h to prevent delayed pulmonary edema from fluid redistribution; review 24h cumulative balance.",
              "Chế độ Suy tim / Người cao tuổi (12–24h+): đã giảm tốc độ duy trì xuống 50–80 mL/h để phòng phù phổi cấp muộn; đánh giá sát bilan dịch 24h."
            )
          );
        } else {
          fluidBullets.push(
            t(
              lang,
              "CHF / Elderly Mode: 50% fluid rate reduction applied per JBDS 02.",
              "Chế độ Suy tim / Người cao tuổi: đã giảm 50% tốc độ truyền dịch chuẩn theo khuyến cáo JBDS 02."
            )
          );
        }
      }

      if (tp === "t2") {
        fluidBullets.push(
          t(
            lang,
            `6–12h Fluid Review (JBDS 02): After initial ~3–4 L, perfusion usually improves; check corrected Na+ (${naCorr.toFixed(1)} mEq/L) and I/O balance q2h.`,
            `Đánh giá dịch truyền mốc 6–12 giờ (JBDS 02): Sau ~3–4 Lít đầu, tưới máu thường đã cải thiện; kiểm tra Na+ hiệu chỉnh (${naCorr.toFixed(1)} mEq/L) và xuất–nhập mỗi 2 giờ.`
          )
        );
      } else if (tp === "t4") {
        fluidBullets.push(
          t(
            lang,
            `12–24h+ Fluid Review (JBDS 02): Deficit largely replaced; stepping down 0.9% NaCl to maintenance (${isFluidRestricted ? "50–80" : "125–166"} mL/h) limits hyperchloremic metabolic acidosis.`,
            `Đánh giá dịch truyền mốc 12–24 giờ+ (JBDS 02): Đã bù phần lớn lượng dịch thiếu; giảm NaCl 0.9% xuống mức duy trì (${isFluidRestricted ? "50–80" : "125–166"} mL/h) giúp hạn chế toan chuyển hóa tăng Clo máu.`
          )
        );
      }

      if (bg < 250 && !isResolved) {
        fluidTone = "warning";
        fluidBullets.push(
          t(
            lang,
            `BG < 250 mg/dL (< 14.0 mmol/L): Run parallel 10% Dextrose at ${g10RateStr} alongside 0.9% NaCl to sustain substrate for ketone clearance (target BG 140–200 mg/dL).`,
            `Đường huyết đã < 250 mg/dL (< 14.0 mmol/L): Bắt buộc chạy song song Glucose 10% tốc độ ${g10RateStr} cùng NaCl 0.9% để làm cơ chất xóa Ceton (giữ BG 140–200 mg/dL).`
          )
        );
      }
    }
  }

  // AXIS 2: POTASSIUM & ACID-BASE
  let allowInsulin = !isHypoBg;
  let kPrimary = "";
  const kBullets: string[] = [];
  let kTone: ClinicalSeverity = "ok";
  let kBadge = "";

  if (k < 3.5) {
    allowInsulin = false;
    kTone = "danger";
    kBadge = t(
      lang,
      "K+ < 3.5: HOLD INSULIN!",
      "K+ < 3.5: TẠM HOÃN INSULIN!"
    );
    kPrimary = t(
      lang,
      `HOLD / LOCK IV INSULIN! Infuse 10–20 mmol KCl/h immediately (K+ = ${k.toFixed(1)} mmol/L).`,
      `TẠM NGƯNG / HOÃN TRUYỀN INSULIN! Bù tĩnh mạch ngay 10–20 mmol KCl/giờ (K+ = ${k.toFixed(1)} mmol/L).`
    );
    kBullets.push(
      t(
        lang,
        "Per ADA/EASD: Attach continuous ECG monitor and replete KCl until repeat K+ ≥ 3.5 mmol/L before starting FRIII.",
        "Theo lưu đồ ADA/EASD: Mắc Monitor điện tim liên tục, bù KCl đến khi xét nghiệm lại K+ ≥ 3.5 mmol/L mới được mở BTE Insulin."
      )
    );
    if (hasOliguria) {
      kBullets.push(
        t(
          lang,
          "Oliguria / Renal Impairment: Infuse KCl cautiously via syringe pump under continuous ECG monitoring and recheck K+ hourly.",
          "Lưu ý có Thiểu niệu / Suy thận: Bù KCl qua bơm tiêm điện định lượng thận trọng dưới giám sát ECG liên tục và thử lại K+ mỗi 1 giờ."
        )
      );
    }
  } else if (k <= 5.0) {
    if (hasOliguria) {
      kTone = "danger";
      kBadge = t(
        lang,
        `K+ ${k.toFixed(1)} + OLIGURIA: NO ROUTINE KCl!`,
        `K+ ${k.toFixed(1)} + VÔ NIỆU: NGƯNG KCl THƯỜNG QUY!`
      );
      kPrimary =
        (isHypoBg
          ? t(
              lang,
              "Insulin held for hypoglycemia — ",
              "Đang tạm ngưng Insulin do hạ đường huyết — "
            )
          : t(
              lang,
              "FRIII permitted, BUT ",
              "Cho phép mở BTE Insulin NHƯNG "
            )) +
        t(
          lang,
          "DO NOT add routine KCl to IV bags (due to Oliguria / Anuria)!",
          "TUYỆT ĐỐI KHÔNG pha KCl thường quy vào chai dịch (do Thiểu niệu / Vô niệu)!"
        );
      kBullets.push(
        t(
          lang,
          `Current K+ = ${k.toFixed(1)} mmol/L: give measured KCl via syringe pump only if K+ drops < 4.0 mmol/L, checking electrolytes q1–2h.`,
          `Kali hiện tại = ${k.toFixed(1)} mmol/L: chỉ bù Kali định lượng qua BTE khi K+ giảm < 4.0 mmol/L kèm theo dõi điện giải mỗi 1–2 giờ.`
        )
      );
    } else {
      kTone = "ok";
      if (tp === "t0") {
        kBadge = t(
          lang,
          "K+ 3.5–5.0: KCl from Bag 2",
          "K+ 3.5–5.0: Pha KCl từ chai 2"
        );
        kPrimary =
          t(
            lang,
            "No KCl in hour-1 resuscitation bag (matches Axis 1); add 20 mmol KCl (10–20 mmol peripheral) per 1 L from Bag 2 onward once insulin is running.",
            "Chưa pha KCl ở chai dịch 1L giờ đầu (đồng bộ Trục 1); pha 20 mmol KCl (hoặc 10–20 mmol ngoại biên) mỗi Lít từ chai thứ 2 trở đi."
          ) +
          (isHypoBg
            ? t(
                lang,
                " (Hold FRIII until BG ≥ 100 mg/dL).",
                " (Tạm khóa BTE Insulin đến khi BG ≥ 100 mg/dL)."
              )
            : t(lang, " Insulin infusion permitted.", " Cho phép truyền Insulin."));
      } else {
        kBadge = t(
          lang,
          "K+ 3.5–5.0: Add 10–20 mmol/L",
          "K+ 3.5–5.0: Bù 10–20 mmol/L"
        );
        kPrimary =
          t(
            lang,
            "Add 20 mmol KCl (or 10–20 mmol peripheral) per 1 L IV fluid.",
            "Pha 20 mmol KCl (hoặc 10–20 mmol) trong mỗi Lít dịch truyền (1–1.5 ống KCl 10% 10 mL)."
          ) +
          (isHypoBg
            ? t(
                lang,
                " (Hold FRIII until BG ≥ 100 mg/dL).",
                " (Tạm khóa BTE Insulin đến khi BG ≥ 100 mg/dL)."
              )
            : t(lang, " Insulin infusion permitted.", " Cho phép truyền Insulin."));
      }
      kBullets.push(
        t(
          lang,
          `K+ is safe (${k.toFixed(1)} mmol/L) with adequate urine output (≥ 0.5 mL/kg/h): maintain serum K+ in target 4.0–5.0 mmol/L.`,
          `Kali máu hiện an toàn (${k.toFixed(1)} mmol/L) và có nước tiểu (≥ 0.5 mL/kg/h): duy trì K+ trong khoảng mục tiêu 4.0–5.0 mmol/L.`
        )
      );
    }
  } else {
    kTone = k >= 6.0 ? "danger" : "warning";
    kBadge =
      k >= 6.0
        ? t(lang, "K+ ≥ 6.0: Hyperkalemia Alert!", "K+ ≥ 6.0: Báo động Tăng Kali!")
        : t(lang, "K+ > 5.0: Omit KCl", "K+ > 5.0: Không pha KCl");
    kPrimary =
      (isHypoBg
        ? t(
            lang,
            "Hold FRIII for hypoglycemia — ",
            "Tạm ngưng BTE Insulin do hạ đường huyết — "
          )
        : t(
            lang,
            "Start/continue insulin now — ",
            "Cho phép truyền Insulin ngay — "
          )) +
      t(
        lang,
        `DO NOT add KCl to IV fluids (K+ = ${k.toFixed(1)} mmol/L).`,
        `TUYỆT ĐỐI KHÔNG pha thêm KCl vào dịch truyền (K+ = ${k.toFixed(1)} mmol/L).`
      );
    kBullets.push(
      t(
        lang,
        `Recheck K+ every 2 hours${k >= 6.0 ? " with continuous ECG monitoring (give IV Calcium gluconate if T/QRS changes appear)!" : "."}`,
        `Kiểm tra lại K+ máu sau mỗi 2 giờ${k >= 6.0 ? " và mắc Monitor điện tim liên tục (Calci gluconat TM nếu có biến đổi sóng T/QRS)!" : "."}`
      )
    );
  }

  if (ph < 7.0 && !isResolved) {
    kTone = "danger";
    kBullets.push(
      t(
        lang,
        `Sodium Bicarbonate consideration (pH = ${ph.toFixed(2)} < 7.00): Infuse 100 mmol NaHCO3 (100 mL 8.4%) in 400 mL sterile water (or 250 mL 4.2% NaHCO3) + 20 mEq KCl (if K+ < 5.0 with urine output) over 2 hours. Stop once pH ≥ 7.00.`,
        `Chỉ định truyền Natri Bicarbonat (do pH = ${ph.toFixed(2)} < 7.00): Pha 100 mmol NaHCO3 (100 mL 8.4%) vào 400 mL nước cất (hoặc 250 mL NaHCO3 4.2%) + 20 mEq KCl (nếu K+ < 5.0 và có nước tiểu), truyền trong 2 giờ. Ngưng khi pH ≥ 7.00.`
      )
    );
  }

  // AXIS 3: FRIII & BASAL INSULIN
  const basalDoseNew = Math.round(weight * 0.25);
  let insPrimary = "";
  const insBullets: string[] = [];
  let insSteps: string[] = [];
  let insDetailsTitle: string | undefined;
  let insTone: ClinicalSeverity = "info";
  let rateBadge = "";
  let sugIvRate = 0;

  if (isHypoBg) {
    const restartRate = Math.min(7.5, Math.round(weight * 0.05 * 10) / 10);
    rateBadge = t(
      lang,
      "0.0 u/h (HELD FOR HYPOGLYCEMIA!)",
      "0.0 units/h (NGƯNG DO HẠ ĐH!)"
    );
    insTone = "danger";
    insPrimary = t(
      lang,
      `STOP IV INSULIN PUMP IMMEDIATELY (0.0 units/h) for 30–60 minutes due to BG < 70 mg/dL (${bg} mg/dL)!`,
      `TẠM NGƯNG BƠM TIÊM ĐIỆN INSULIN NGAY LẬP TỨC (0.0 units/h) trong 30–60 phút do Đường huyết < 70 mg/dL (${bg} mg/dL)!`
    );
    insBullets.push(
      t(
        lang,
        `Step 1: Pause FRIII, give IV Dextrose bolus, and run 10% Dextrose (${g10RateStr}).`,
        `Bước 1: Khóa BTE Insulin ngay, tiêm Bolus Glucose TM và chạy Glucose 10% (${g10RateStr}).`
      ),
      t(
        lang,
        "Step 2: Recheck capillary BG every 15 minutes.",
        "Bước 2: Thử lại đường huyết mao mạch sau mỗi 15 phút."
      ),
      t(
        lang,
        `Step 3 (Restart): Once BG ≥ 100 mg/dL (5.6 mmol/L) and ketones remain ≥ 0.6 mmol/L, restart FRIII at halved rate 0.05 u/kg/h (~${restartRate.toFixed(1)} u/h) alongside 10% Dextrose.`,
        `Bước 3 (Mở lại BTE): Khi BG ≥ 100 mg/dL (5.6 mmol/L) và Ceton vẫn ≥ 0.6 mmol/L, mở lại BTE ở liều giảm nửa 0.05 units/kg/h (~${restartRate.toFixed(1)} units/h) song song Glucose 10%.`
      )
    );
  } else if (!allowInsulin) {
    rateBadge = t(
      lang,
      "0.0 u/h (LOCKED FOR K+ < 3.5)",
      "0.0 units/h (KHÓA DO HẠ K+)"
    );
    insTone = "danger";
    insPrimary = t(
      lang,
      "LOCK / HOLD IV INSULIN PUMP (0.0 units/h) due to serum K+ < 3.5 mmol/L!",
      "TẠM NGƯNG / KHÓA BƠM TIÊM ĐIỆN INSULIN (0.0 units/h) do Kali máu < 3.5 mmol/L!"
    );
    insBullets.push(
      t(
        lang,
        "Start FRIII only after IV KCl raises serum K+ ≥ 3.5 mmol/L.",
        "Chỉ mở BTE sau khi đã bù KCl nâng K+ ≥ 3.5 mmol/L."
      )
    );
  } else if (isResolved) {
    rateBadge = t(lang, "TRANSITION TO SC", "CHUYỂN TIÊM DƯỚI DA (SC)");
    insTone = "ok";
    const estTddSc = Math.round(weight * 0.5);
    insPrimary = t(
      lang,
      "Acute crisis resolved: Overlap SC insulin 30–60 minutes before stopping IV FRIII!",
      "Đã thoát giai đoạn cấp: Chuyển sang tiêm Insulin dưới da (SC) gối đầu 30–60 phút trước khi tắt BTE!"
    );
    insBullets.push(
      t(
        lang,
        "If eating orally: Inject meal-time SC insulin and keep FRIII running for 30–60 min (short/premixed) or 1–2h before stopping.",
        "Nếu đã ăn uống lại được: tiêm mũi Insulin dưới da gắn bữa ăn và duy trì BTE thêm 30–60 phút (Actrapid/Novomix) hoặc 1–2 giờ rồi mới tắt BTE."
      ),
      t(
        lang,
        "If NPO: Switch to Variable-Rate IV Insulin Infusion (VRIII) with 10% Dextrose + KCl.",
        "Nếu chưa ăn uống được: chuyển sang Truyền tốc độ biến thiên (VRIII) kèm Glucose 10% + KCl."
      ),
      t(
        lang,
        `Suggested total daily SC dose for insulin-naïve patient (0.5 u/kg): ~${estTddSc} units/day.`,
        `Gợi ý tổng liều SC cho bệnh nhân mới (0.5 units/kg): ~${estTddSc} units/ngày.`
      )
    );
    if (activeSyndrome !== "HHS" && hco3 < 15.0) {
      insBullets.push(
        t(
          lang,
          `Resolved per JBDS 02 (Ketones < 0.6 & pH ≥ 7.30): isolated low HCO3- (${hco3.toFixed(1)} mmol/L) at 12–24h+ reflects hyperchloremic acidosis from 0.9% NaCl — safe to transition to SC insulin.`,
          `Đã thoát DKA theo JBDS 02 (Ceton < 0.6 & pH ≥ 7.30): HCO3- còn thấp đơn độc (${hco3.toFixed(1)} mmol/L) ở giờ 12–24+ phản ánh toan tăng Clo máu do NaCl 0.9% — an toàn để chuyển tiêm SC.`
        )
      );
    }
  } else if (activeSyndrome === "HHS") {
    if (tp === "t0" && !hasMildKetones && !isPlateau) {
      rateBadge = t(
        lang,
        "0.0 u/h (DELAYED IN HOUR 1)",
        "0.0 units/h (TRÌ HOÃN GIỜ ĐẦU)"
      );
      insTone = "warning";
      insPrimary = t(
        lang,
        "DO NOT START IV INSULIN IN HOUR 1 (0.0 units/h) — Prioritize 0.9% NaCl resuscitation first!",
        "CHƯA MỞ BƠM TIÊM ĐIỆN INSULIN Ở GIỜ ĐẦU (0.0 units/h) — Ưu tiên truyền NaCl 0.9% trước!"
      );
      insBullets.push(
        t(
          lang,
          "With ketones < 1.0 mmol/L and no acidosis, starting insulin before volume expansion risks vascular collapse. Start FRIII 0.05 u/kg/h only once BG plateaus on fluids alone.",
          "Vì Ceton máu < 1.0 mmol/L và không toan, truyền Insulin trước khi bù đủ dịch sẽ gây trụy mạch. Chỉ mở FRIII 0.05 units/kg/h khi đường huyết ngừng hạ bằng dịch truyền đơn thuần."
        )
      );
    } else {
      const baseHhsRate = Math.min(7.5, Math.round(weight * 0.05 * 10) / 10);
      let finalHhsRate = baseHhsRate;
      insSteps = [
        t(
          lang,
          `Initial HHS FRIII rate (0.05 u/kg/h × ${weight} kg): ${baseHhsRate.toFixed(1)} units/h.`,
          `Liều FRIII khởi điểm cho HHS (0.05 units/kg/h × ${weight} kg): ${baseHhsRate.toFixed(1)} units/h.`
        ),
      ];

      if (
        traj.hasPrior &&
        traj.lastSnap?.mode === "dka" &&
        traj.lastIvRate > 0
      ) {
        if (traj.rateMmolPerHour > -2.0 && bg >= 270) {
          finalHhsRate = Math.min(
            10.0,
            Math.round((traj.lastIvRate + 1.0) * 10) / 10
          );
          insSteps.push(
            t(
              lang,
              `Prior FRIII rate: ${traj.lastIvRate} u/h. BG falling slowly (< 2.0 mmol/L/h) → Add +1.0 u/h to ${finalHhsRate.toFixed(1)} units/h.`,
              `Tốc độ BTE giờ trước: ${traj.lastIvRate} units/h. Đường huyết giảm chậm (< 2.0 mmol/L/h) → Cộng thêm +1.0 unit/h thành ${finalHhsRate.toFixed(1)} units/h.`
            )
          );
        } else if (traj.rateMmolPerHour < -5.0) {
          finalHhsRate = Math.max(
            0.5,
            Math.round((traj.lastIvRate - 1.0) * 10) / 10
          );
          insSteps.push(
            t(
              lang,
              `Prior FRIII rate: ${traj.lastIvRate} u/h. BG falling too fast (> 5.0 mmol/L/h) → Reduce -1.0 u/h to ${finalHhsRate.toFixed(1)} units/h.`,
              `Tốc độ BTE giờ trước: ${traj.lastIvRate} units/h. Đường huyết hạ quá nhanh (> 5.0 mmol/L/h) → Giảm -1.0 unit/h còn ${finalHhsRate.toFixed(1)} units/h.`
            )
          );
        }
      }

      insBullets.push(
        t(
          lang,
          "Standard dilution: 50 units Actrapid in 50 mL 0.9% NaCl (1 mL = 1 unit).",
          "Cách pha chuẩn: 50 units Actrapid + NaCl 0.9% vừa đủ 50 mL (1 mL = 1 unit)."
        )
      );
      if (tp === "t2") {
        insBullets.push(
          t(
            lang,
            "6–12h HHS: Titrate FRIII in 1 unit/h steps to keep BG fall 3.0–5.0 mmol/L/h (54–90 mg/dL/h) and Osm fall 3–8 mOsm/kg/h.",
            "Mốc 6–12 giờ (HHS): Điều chỉnh BTE từng 1 unit/h để giữ tốc độ giảm đường huyết 3.0–5.0 mmol/L/h (54–90 mg/dL/h) và giảm ALTT 3–8 mOsm/kg/h."
          )
        );
      } else if (tp === "t4") {
        insBullets.push(
          t(
            lang,
            "12–24h+ HHS: Maintain low-rate FRIII + 10% Dextrose (when BG < 250 mg/dL) until Total Osm < 300 mOsm/kg and patient is alert/eating.",
            "Mốc 12–24 giờ+ (HHS): Duy trì BTE liều thấp kết hợp Glucose 10% (khi BG < 250 mg/dL) đến khi ALTT < 300 mOsm/kg và bệnh nhân tỉnh táo ăn uống được."
          )
        );
      }

      rateBadge = `${finalHhsRate.toFixed(1)} units/h`;
      sugIvRate = finalHhsRate;
      insTone = "info";
      insDetailsTitle = t(
        lang,
        "View HHS FRIII rate calculation",
        "Xem chi tiết cách tính tốc độ BTE HHS"
      );
      insPrimary = t(
        lang,
        `Run IV Actrapid syringe pump at ${finalHhsRate.toFixed(1)} units/h (${finalHhsRate.toFixed(1)} mL/h) (No IV bolus).`,
        `Chạy Bơm tiêm điện Actrapid tốc độ ${finalHhsRate.toFixed(1)} units/h (${finalHhsRate.toFixed(1)} mL/h) (Không Bolus IV).`
      );
    }
  } else {
    // DKA or MIXED FRIII
    const rateFactor = bg < 250 ? 0.05 : 0.1;
    const maxCap = bg < 250 ? 7.5 : 15.0;
    const baseDkaRate = Math.min(
      maxCap,
      Math.round(weight * rateFactor * 10) / 10
    );
    let finalDkaRate = baseDkaRate;
    insSteps = [
      t(
        lang,
        `Weight-based FRIII (${rateFactor} u/kg/h × ${weight} kg, cap ${maxCap} u/h): ${baseDkaRate.toFixed(1)} units/h.`,
        `Tốc độ chuẩn theo cân nặng (${rateFactor} units/kg/h × ${weight} kg, trần ${maxCap} u/h): ${baseDkaRate.toFixed(1)} units/h.`
      ),
    ];

    if (
      traj.hasPrior &&
      traj.lastSnap?.mode === "dka" &&
      traj.lastIvRate > 0 &&
      traj.rateKetonePerHour !== null
    ) {
      const dKetRate = traj.rateKetonePerHour;
      if (bg < 250 && traj.lastBg >= 250) {
        finalDkaRate = baseDkaRate;
        insSteps.push(
          t(
            lang,
            `Prior rate: ${traj.lastIvRate} u/h. BG dropped < 250 mg/dL → step down to 0.05 u/kg/h = ${finalDkaRate.toFixed(1)} units/h.`,
            `Tốc độ giờ trước: ${traj.lastIvRate} units/h. Do BG đã giảm < 250 mg/dL → hạ xuống 0.05 units/kg/h = ${finalDkaRate.toFixed(1)} units/h.`
          )
        );
      } else if (dKetRate > -0.5 && ketone >= 0.6) {
        finalDkaRate = Math.min(
          15.0,
          Math.round((traj.lastIvRate + 1.0) * 10) / 10
        );
        insSteps.push(
          t(
            lang,
            `Prior rate: ${traj.lastIvRate} u/h. Ketone clearance (${dKetRate.toFixed(2)} mmol/L/h) did not meet ≥ 0.5 mmol/L/h → Add +1.0 u/h to ${finalDkaRate.toFixed(1)} units/h.`,
            `Tốc độ BTE giờ trước: ${traj.lastIvRate} units/h. Do Ceton giảm chậm (${dKetRate.toFixed(2)} mmol/L/h, chưa đạt ≥ 0.5 mmol/L/h) → Tự động cộng +1.0 unit/h lên ${finalDkaRate.toFixed(1)} units/h.`
          )
        );
      } else {
        finalDkaRate = traj.lastIvRate;
        if (bg < 250 && finalDkaRate > baseDkaRate) {
          finalDkaRate = baseDkaRate;
        }
        insSteps.push(
          t(
            lang,
            `Good response to prior rate (ketone clearance ${Math.abs(dKetRate).toFixed(2)} mmol/L/h ≥ 0.5): maintain ${finalDkaRate.toFixed(1)} units/h.`,
            `Đáp ứng tốt với tốc độ BTE giờ trước (Ceton giảm ${Math.abs(dKetRate).toFixed(2)} mmol/L/h ≥ 0.5): duy trì ${finalDkaRate.toFixed(1)} units/h.`
          )
        );
      }
    }

    rateBadge = `${finalDkaRate.toFixed(1)} units/h`;
    sugIvRate = finalDkaRate;
    insTone = tp === "t4" && !isResolved ? "warning" : "info";
    insDetailsTitle = t(
      lang,
      "View FRIII rate calculation & titration",
      "Xem chi tiết cách tính & hiệu chỉnh tốc độ BTE"
    );

    insBullets.push(
      t(
        lang,
        "Standard dilution: 50 units Actrapid + 0.9% NaCl to 50 mL (1 mL = 1 unit). No IV bolus.",
        "Pha chuẩn BTE: 50 units Actrapid + NaCl 0.9% vừa đủ 50 mL (1 mL = 1 unit). Không Bolus IV."
      ),
      t(
        lang,
        `Basal insulin continuation (JBDS 02): Continue patient's usual SC basal insulin, or initiate ~${basalDoseNew} units SC once daily (0.25 u/kg) alongside FRIII.`,
        `Duy trì Insulin nền dưới da (JBDS 02): Tiếp tục tiêm mũi Insulin nền thường ngày, hoặc khởi trị ~${basalDoseNew} units SC 1 lần/ngày (0.25 units/kg) song song BTE.`
      )
    );

    if (tp === "t2") {
      insBullets.push(
        t(
          lang,
          `6–12h Insulin Review: Most patients reach BG < 250 mg/dL here; maintain FRIII + 10% Dextrose (${g10RateStr}) to suppress hepatic ketogenesis.`,
          `Đánh giá Insulin mốc 6–12 giờ: Đa số đã có BG < 250 mg/dL; duy trì FRIII kết hợp truyền cơ chất Glucose 10% (${g10RateStr}) để ức chế hoàn toàn tạo Ceton gan.`
        )
      );
    } else if (tp === "t4") {
      if (ketone < 0.6 && ph >= 7.3 && hco3 < 15.0) {
        insBullets.push(
          t(
            lang,
            `12–24h+ Note (Suspected Hyperchloremic Acidosis): Ketones are negative (${ketone.toFixed(1)} mmol/L) and pH ≥ 7.30, while low HCO3- (${hco3.toFixed(1)} mmol/L) reflects 0.9% NaCl load. Per JBDS 02, do not prolong high-rate FRIII waiting for HCO3- — prepare SC transition if eating.`,
            `Lưu ý mốc 12–24 giờ+ (Nghi Toan tăng Clo máu): Ceton đã âm tính (${ketone.toFixed(1)} mmol/L) và pH ≥ 7.30 nhưng HCO3- còn thấp (${hco3.toFixed(1)} mmol/L) thường do truyền nhiều NaCl 0.9%. Theo JBDS 02, không cần giữ BTE liều cao để chờ HCO3- — chuẩn bị chuyển tiêm dưới da nếu ăn được!`
          )
        );
      } else {
        insBullets.push(
          t(
            lang,
            `Prolonged DKA Alert (> 12–24h, JBDS 02): Still unresolved (Ketones = ${ketone.toFixed(1)} mmol/L, pH = ${ph.toFixed(2)}): check IV line/pump patency, increase FRIII by +1.0 to 2.0 u/h, and search for occult sepsis or inadequate fluids.`,
            `Cảnh báo DKA kéo dài sau 12–24 giờ+ (JBDS 02): Chưa thoát DKA (Ceton = ${ketone.toFixed(1)} mmol/L, pH = ${ph.toFixed(2)}): kiểm tra lại đường truyền/BTE, tăng tốc độ BTE thêm +1.0 – 2.0 units/h và tìm ổ nhiễm trùng ẩn / thiếu dịch.`
          )
        );
      }
    }

    insPrimary =
      t(
        lang,
        `Run IV Actrapid syringe pump at ${finalDkaRate.toFixed(1)} units/h (${finalDkaRate.toFixed(1)} mL/h)`,
        `Chạy Bơm tiêm điện Actrapid tốc độ ${finalDkaRate.toFixed(1)} units/h (${finalDkaRate.toFixed(1)} mL/h)`
      ) +
      (bg < 250
        ? t(
            lang,
            ` (with parallel 10% Dextrose ${g10RateStr}).`,
            ` (mắc kèm Glucose 10% ${g10RateStr}).`
          )
        : ".");
  }

  // AXIS 4: MONITORING, TARGETS & TRANSITION
  let monitorBadge = "";
  let monitorPrimary = "";
  const monitorBullets: string[] = [];
  let monitorTone: ClinicalSeverity = "ok";

  if (isHypoBg) {
    monitorTone = "danger";
    monitorBadge = t(
      lang,
      "Hypoglycemia Rescue: q15min Monitoring",
      "Theo dõi Cấp cứu Hạ ĐH mỗi 15 phút"
    );
    monitorPrimary = t(
      lang,
      "Recheck capillary BG every 15 minutes until ≥ 100 mg/dL (5.6 mmol/L)!",
      "Bấm lại Đường huyết mao mạch mỗi 15 phút cho đến khi ≥ 100 mg/dL (5.6 mmol/L)!"
    );
    monitorBullets.push(
      t(
        lang,
        "Neurologic check: Monitor GCS, diaphoresis, seizures; protect airway if obtunded.",
        "Đánh giá thần kinh: theo dõi sát tri giác (GCS), vã mồ hôi, co giật; đảm bảo đường thở nếu lơ mơ."
      ),
      t(
        lang,
        "Recheck Ketones & K+ in 1h: When restarting FRIII at 0.05 u/kg/h, always run parallel 10% Dextrose.",
        "Xét nghiệm lại Ceton & Điện giải (K+) sau 1 giờ: khi mở lại BTE ở liều 0.05 units/kg/h, luôn duy trì song song Glucose 10%."
      )
    );
  } else if (activeSyndrome === "HHS") {
    if (tp === "t2") {
      monitorBadge = t(
        lang,
        "6–12h HHS: Mid-course Osm & Na+ Review",
        "Mốc 6–12h HHS: Đánh giá ALTT & Natri giữa kỳ"
      );
      monitorPrimary = t(
        lang,
        "6–12h HHS Targets: Osm fall 3.0–8.0 mOsm/kg/h & +3 to +6 L positive fluid balance by hour 12.",
        "Mục tiêu 6–12 giờ (HHS): ALTT máu giảm 3.0–8.0 mOsm/kg/h & Cân bằng dịch dương đạt 3–6 Lít tại giờ thứ 12."
      );
      monitorBullets.push(
        t(
          lang,
          "6–12h Labs: Hourly BG; Na+, K+, Urea to recalculate Osm every 2 hours.",
          "Lịch xét nghiệm 6–12h: Đường huyết mỗi 1 giờ; Na+, K+, Urea tính lại ALTT mỗi 2 giờ."
        ),
        t(
          lang,
          "6–12h Response: If Osm falls < 3 mOsm/kg/h despite positive fluid balance and Na+ > 155 mEq/L → switch to 0.45% NaCl.",
          "Đánh giá đáp ứng 6–12h: Nếu ALTT giảm < 3 mOsm/kg/h dù cân bằng dịch dương tốt và Na+ > 155 mEq/L → chuyển dịch sang NaCl 0.45%."
        ),
        t(
          lang,
          "JBDS Care Bundle: Prophylactic LMWH (VTE), heel pressure protection, urine output ≥ 0.5 mL/kg/h.",
          "Gói dự phòng bắt buộc (JBDS Care Bundle): LMWH dự phòng huyết khối (VTE); bảo vệ gót chân; nước tiểu ≥ 0.5 mL/kg/h."
        )
      );
    } else if (tp === "t4") {
      monitorBadge = t(
        lang,
        "12–24h+ HHS: Resolution & SC Transition",
        "Mốc 12–24h+ HHS: Đánh giá Thoát HHS & Chuyển SC"
      );
      monitorPrimary = t(
        lang,
        "12–24h+ HHS Targets: Gradually normalize Osm < 300 mOsm/kg over 24–72h and prepare SC transition.",
        "Mục tiêu 12–24 giờ+ (HHS): Đưa dần ALTT về < 300 mOsm/kg trong 24–72 giờ và chuẩn bị chuyển tiêm dưới da."
      );
      monitorBullets.push(
        t(
          lang,
          "12–24h+ Labs: BG q1–2h; Electrolytes (Na+, K+) & Urea for Osm every 4 hours.",
          "Lịch xét nghiệm 12–24h+: Đường huyết mỗi 1–2 giờ; Điện giải (Na+, K+) & Urea tính ALTT mỗi 4 giờ."
        ),
        t(
          lang,
          "JBDS 06 Safety: Avoid rapid Osm/Na+ drop (cap Na+ fall ≤ 10 mmol/L/24h) to prevent cerebral edema & CPM.",
          "Lưu ý sinh lý HHS (JBDS 06): Không hạ ALTT và Natri quá nhanh ở giờ 12–24+ (giới hạn hạ Na+ ≤ 10 mmol/L/24h) để phòng phù não và hủy myelin cầu não."
        ),
        t(
          lang,
          "SC Transition Criteria: Osm < 300 mOsm/kg, BG < 15 mmol/L (270 mg/dL), and eating orally → overlap SC insulin 30–60 min before stopping FRIII.",
          "Tiêu chuẩn chuyển SC: ALTT < 300 mOsm/kg, BG < 15 mmol/L (270 mg/dL) và ăn uống được → tiêm SC gối đầu 30–60 phút trước khi tắt BTE."
        )
      );
    } else {
      monitorBadge = t(
        lang,
        "Target: Osm ↓ 3–8 mOsm/kg/h & BG ≤ 90 mg/dL/h",
        "Mục tiêu: Giảm ALTT 3–8 mOsm/kg/h & BG ≤ 90 mg/dL/h"
      );
      monitorPrimary = t(
        lang,
        "0–6h HHS Kinetic Targets: Osm fall 3.0–8.0 mOsm/kg/h & BG fall ≤ 90 mg/dL/h (5.0 mmol/L/h).",
        "Mục tiêu động học HHS (0–6h): Giảm ALTT 3.0–8.0 mOsm/kg/giờ & Giảm Đường huyết ≤ 90 mg/dL/giờ (5.0 mmol/L/h)."
      );
      monitorBullets.push(
        t(
          lang,
          "0–6h Labs: Hourly BG, Na+, K+, Urea and Osmolality calculation for the first 6 hours.",
          "Lịch xét nghiệm (0–6h đầu): Đo Đường huyết, Na+, K+, Urea và tính ALTT mỗi 1 giờ trong 6 giờ đầu."
        ),
        t(
          lang,
          "JBDS Care Bundle: Daily prophylactic LMWH (VTE), heel pressure protection, urine output ≥ 0.5 mL/kg/h.",
          "Gói dự phòng bắt buộc (JBDS Care Bundle): Tiêm LMWH dự phòng huyết khối (VTE); kê đệm bảo vệ gót chân; nước tiểu ≥ 0.5 mL/kg/giờ."
        )
      );
    }
  } else {
    if (tp === "t2") {
      monitorBadge = t(
        lang,
        "6–12h DKA: Mid-Course Review (JBDS 02)",
        "Mốc 6–12h DKA: Đánh giá giữa kỳ (JBDS 02)"
      );
      monitorPrimary = t(
        lang,
        "6–12h Targets (JBDS 02): Ketones falling ≥ 0.5 mmol/L/h toward < 1.5 mmol/L and venous HCO3- ≥ 15–18 mmol/L.",
        "Mục tiêu giai đoạn 6–12 giờ (JBDS 02): Ceton giảm ≥ 0.5 mmol/L/giờ, hướng tới Ceton < 1.5 mmol/L và HCO3- tĩnh mạch ≥ 15–18 mmol/L."
      );
      monitorBullets.push(
        t(
          lang,
          "6–12h Labs: Hourly capillary BG & ketones; venous blood gas (pH, HCO3-) and K+ every 2–4 hours (6h, 8h, 12h).",
          "Lịch xét nghiệm 6–12h: Bấm Đường huyết & Ceton mao mạch mỗi 1 giờ; Khí máu tĩnh mạch và Kali máu mỗi 2–4 giờ (mốc 6h, 8h, 12h)."
        ),
        t(
          lang,
          "If ketones fail to fall ≥ 0.5 mmol/L/h: increase FRIII by +1.0 u/h and verify 10% Dextrose + 0.9% NaCl line patency.",
          "Nếu Ceton không giảm ≥ 0.5 mmol/L/h: tăng BTE thêm +1.0 unit/h và kiểm tra tốc độ dịch Glucose 10% + NaCl 0.9%."
        ),
        t(
          lang,
          "Precipitant & Care Bundle: Treat underlying infection (antibiotics if septic), check ECG/Troponin if ACS suspected, and give LMWH VTE prophylaxis.",
          "Chăm sóc toàn diện: Đánh giá nguyên nhân thúc đẩy (kháng sinh nếu nhiễm trùng, ECG/Troponin nếu nghi vành cấp); dự phòng huyết khối (LMWH)."
        )
      );
    } else if (tp === "t4") {
      monitorTone = isResolved ? "ok" : "warning";
      monitorBadge = t(
        lang,
        "12–24h+ DKA: Resolution & SC Transition",
        "Mốc 12–24h+ DKA: Đánh giá Thoát DKA & Chuyển SC"
      );
      monitorPrimary = isResolved
        ? t(
            lang,
            "DKA Resolution Criteria Met at 12–24h+ — Proceed with SC insulin overlap & transition!",
            "Đã đạt tiêu chuẩn Thoát DKA tại mốc 12–24 giờ+ — Thực hiện quy trình chuyển sang Insulin tiêm dưới da!"
          )
        : t(
            lang,
            "12–24h+ Review (JBDS 02): Check DKA resolution criteria or manage prolonged DKA!",
            "Đánh giá mốc 12–24 giờ+ (JBDS 02): Rà soát tiêu chuẩn Thoát DKA hoặc xử trí DKA kéo dài!"
          );
      monitorBullets.push(
        t(
          lang,
          "DKA Resolution (JBDS 02): Blood ketones < 0.6 mmol/L AND venous pH ≥ 7.30 (do not rely solely on HCO3- at 12–24h due to hyperchloremic acidosis from 0.9% NaCl).",
          "Tiêu chuẩn Thoát DKA (JBDS 02): Ceton máu < 0.6 mmol/L VÀ pH tĩnh mạch ≥ 7.30 (không dựa đơn độc vào HCO3- ở giờ 12–24 vì thường có toan tăng Clo máu nhẹ do NaCl 0.9%)."
        ),
        t(
          lang,
          "SC Overlap Protocol: Once resolved & eating, inject pre-meal SC insulin + basal insulin, then keep FRIII running 30–60 min before stopping.",
          "Quy trình chuyển đổi khi thoát DKA & ăn được: Tiêm mũi Insulin dưới da trước bữa ăn + nền, chờ 30–60 phút sau mới tắt BTE."
        ),
        t(
          lang,
          "If unresolved > 12–24h: Consult Endocrinology / ICU, search for occult infection, and ensure adequate 10% Dextrose + FRIII to clear ketones.",
          "Nếu sau 12–24h vẫn chưa thoát DKA: Hội chẩn Nội tiết / Hồi sức, rà soát ổ nhiễm trùng ẩn, đảm bảo truyền đủ Glucose 10% + BTE để xóa sạch Ceton."
        )
      );
    } else {
      monitorBadge = t(
        lang,
        "Target: Ketones ↓ ≥ 0.5/h | HCO3- ↑ ≥ 3.0/h | BG ↓ ≥ 54 mg/dL/h",
        "Mục tiêu: Ceton ↓ ≥ 0.5/h | HCO3- ↑ ≥ 3.0/h | BG ↓ ≥ 54 mg/dL/h"
      );
      monitorPrimary = t(
        lang,
        "0–6h DKA Kinetic Targets: Ketone fall ≥ 0.5 mmol/L/h (or HCO3- rise ≥ 3.0 mmol/L/h, BG fall ≥ 54 mg/dL/h).",
        "Mục tiêu động học DKA (0–6h đầu): Ceton máu giảm ≥ 0.5 mmol/L/giờ (hoặc HCO3- tăng ≥ 3.0 mmol/L/h, BG giảm ≥ 54 mg/dL/h)."
      );
      monitorBullets.push(
        t(
          lang,
          "If targets not met: Check IV line/pump, then increase FRIII rate by +1.0 unit/h.",
          "Nếu không đạt mục tiêu: Kiểm tra dây truyền/bơm tiêm điện, sau đó tăng tốc độ BTE thêm +1.0 unit/giờ."
        ),
        t(
          lang,
          "0–6h Labs: Hourly capillary BG & ketones; venous blood gas & K+ at 60 min, 2h, and q2h thereafter.",
          "Lịch xét nghiệm (0–6h): Bấm Đường huyết & Ceton mao mạch mỗi 1 giờ; Khí máu tĩnh mạch và Kali máu lúc 60 phút, 2 giờ và mỗi 2 giờ sau đó."
        ),
        t(
          lang,
          "JBDS Care Bundle: Prophylactic LMWH (VTE), foot/heel protection, urine output ≥ 0.5 mL/kg/h.",
          "Gói dự phòng bắt buộc (JBDS Care Bundle): Dự phòng huyết khối (LMWH); bảo vệ bàn chân; nước tiểu ≥ 0.5 mL/kg/giờ."
        )
      );
    }
  }

  return {
    kind: "dka",
    status: { tone: statusTone, tag: classLabel, title: statusTitle },
    activeSyndrome,
    classifiedSyndrome,
    nonDkaFallback: null,
    isResolved,
    indices: {
      bgMmol,
      naCorr,
      osmEff,
      osmTotal,
      classificationLabel: classLabel,
    },
    traj,
    warningBanner,
    axes: {
      fluids: {
        primaryText: fluidPrimary,
        bullets: fluidBullets,
        badge: fluidBadge,
        tone: fluidTone,
      },
      potassiumAcidBase: {
        primaryText: kPrimary,
        bullets: kBullets,
        badge: kBadge,
        tone: kTone,
      },
      insulin: {
        primaryText: insPrimary,
        bullets: insBullets,
        detailsTitle: insDetailsTitle,
        detailSteps: insSteps.length > 0 ? insSteps : undefined,
        badge: rateBadge,
        tone: insTone,
      },
      monitoringTransition: {
        primaryText: monitorPrimary,
        bullets: monitorBullets,
        badge: monitorBadge,
        tone: monitorTone,
      },
    },
    suggestedIvRate: sugIvRate,
  };
}

export function evaluateInsulinTool(
  inputs: InsulinInputs,
  snapshots: ShiftSnapshot[],
  deltaHours: number,
  lang: InsulinLang
): InsulinEvaluation {
  const traj = evaluateContextualTrajectory(inputs, snapshots, deltaHours);
  if (inputs.mode === "dka") {
    return computeDkaHhs(inputs, traj, lang);
  }
  if (inputs.mode === "06h") {
    return computeMorning06h(inputs, traj, lang);
  }
  return computeEvening18h(inputs, traj, lang);
}

export function formatEmrSummary(
  inputs: InsulinInputs,
  evaluation: InsulinEvaluation,
  lang: InsulinLang
): string {
  const tpCfg =
    TIMEPOINT_CONFIGS[inputs.mode].find((x) => x.id === inputs.tp) ??
    TIMEPOINT_CONFIGS[inputs.mode][0];
  const tpLabel = lang === "vi" ? tpCfg.labelVi : tpCfg.labelEn;
  const bgStr =
    inputs.bgMgDl >= 800
      ? "HI (>= 800 mg/dL ~ 44.4 mmol/L)"
      : `${inputs.bgMgDl} mg/dL (${(inputs.bgMgDl / 18.0).toFixed(1)} mmol/L)`;

  const lines: string[] = [];
  lines.push(
    t(
      lang,
      "=== CLINICAL DECISION SUPPORT SUMMARY (NEUROCALC INSULIN / DKA-HHS) ===",
      "=== PHIẾU HỖ TRỢ QUYẾT ĐỊNH LÂM SÀNG (NEUROCALC INSULIN / DKA-HHS) ==="
    )
  );
  lines.push(
    t(
      lang,
      `Timestamp: ${new Date().toLocaleString("en-US")} | Checkpoint: ${tpLabel}`,
      `Thời điểm: ${new Date().toLocaleString("vi-VN")} | Mốc: ${tpLabel}`
    )
  );
  lines.push(
    t(
      lang,
      `Parameters: BG = ${bgStr} | Weight = ${inputs.weight} kg`,
      `Thông số: BG = ${bgStr} | Cân nặng = ${inputs.weight} kg`
    )
  );

  if (evaluation.kind === "dka") {
    lines.push(
      t(
        lang,
        `DKA/HHS Labs: K+ = ${inputs.k} mmol/L | Na+ = ${inputs.na} mEq/L | Urea = ${inputs.ureaMmol.toFixed(1)} mmol/L | pH = ${inputs.ph.toFixed(2)} | HCO3- = ${inputs.hco3.toFixed(1)} | Ketones = ${inputs.ketone.toFixed(1)} mmol/L`,
        `Sinh hóa DKA/HHS: K+ = ${inputs.k} mmol/L | Na+ = ${inputs.na} mEq/L | Urea = ${inputs.ureaMmol.toFixed(1)} mmol/L | pH = ${inputs.ph.toFixed(2)} | HCO3- = ${inputs.hco3.toFixed(1)} | Ceton = ${inputs.ketone.toFixed(1)} mmol/L`
      )
    );
    lines.push(
      t(
        lang,
        `Calculated Indices: Corrected Na+ = ${evaluation.indices.naCorr.toFixed(1)} mEq/L | Total Osm = ${evaluation.indices.osmTotal.toFixed(1)} mOsm/kg`,
        `Chỉ số tính toán: Na+ hiệu chỉnh = ${evaluation.indices.naCorr.toFixed(1)} mEq/L | ALTT toàn phần = ${evaluation.indices.osmTotal.toFixed(1)} mOsm/kg`
      )
    );
    lines.push(
      t(
        lang,
        `Assessment: [${evaluation.status.tag}] ${evaluation.status.title}`,
        `Đánh giá: [${evaluation.status.tag}] ${evaluation.status.title}`
      )
    );
    if (evaluation.axes) {
      lines.push(
        t(lang, "1. Fluids: ", "1. Dịch truyền: ") +
          evaluation.axes.fluids.primaryText
      );
      lines.push(
        t(lang, "2. Potassium & Acid-Base: ", "2. Kali & Toan: ") +
          evaluation.axes.potassiumAcidBase.primaryText
      );
      lines.push(
        t(lang, "3. Insulin (FRIII): ", "3. Insulin (BTE): ") +
          evaluation.axes.insulin.primaryText
      );
    } else if (evaluation.nonDkaFallback) {
      lines.push(
        t(lang, "Management: ", "Xử trí: ") +
          evaluation.nonDkaFallback.section.primaryText
      );
    }
  } else {
    lines.push(
      t(
        lang,
        `Current Regimen: NovoMix AM ${inputs.isNaive ? 0 : inputs.doseMorn} u / PM ${inputs.isNaive ? 0 : inputs.doseEve} u (Effective TDD: ${evaluation.effectiveTdd} u, ISF ~${evaluation.isf} mg/dL/u)`,
        `Liều đang dùng: Novomix Sáng ${inputs.isNaive ? 0 : inputs.doseMorn} u / Chiều ${inputs.isNaive ? 0 : inputs.doseEve} u (TDD hiệu dụng: ${evaluation.effectiveTdd} u, ISF ~${evaluation.isf} mg/dL/u)`
      )
    );
    lines.push(
      t(
        lang,
        `Assessment: [${evaluation.status.tag}] ${evaluation.status.title}`,
        `Đánh giá: [${evaluation.status.tag}] ${evaluation.status.title}`
      )
    );
    lines.push(
      t(lang, "1. Medication Order: ", "1. Y lệnh thuốc: ") +
        evaluation.medicationOrder.primaryText
    );
    lines.push(
      t(lang, "2. Nutrition & Timing: ", "2. Dinh dưỡng: ") +
        evaluation.nutritionPlan.primaryText
    );
    lines.push(
      t(lang, "3. Regimen Adjustment: ", "3. Điều chỉnh phác đồ: ") +
        evaluation.regimenAdjustment.primaryText
    );
  }

  return lines.join("\n");
}
