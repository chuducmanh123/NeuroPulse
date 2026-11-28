import {
  NEURO_TARGET_PROFILES,
  VASOPRESSOR_CATALOG,
  type AccessRoute,
  type ClinicalSeverity,
  type DoseUnitMode,
  type NeuroTargetProfileId,
  type VasopressorId,
} from "./vasopressorI18n.ts";

export type DripDirection = "dose_to_rate" | "rate_to_dose";

export interface SmartDripInput {
  drugId: VasopressorId;
  weightKg: number | null;
  drugAmount: number | null; // mg (or units for vasopressin)
  volumeMl: number | null;
  direction: DripDirection;
  unitMode: DoseUnitMode;
  targetDose: number | null;
  pumpRateMlHr: number | null;
  accessRoute: AccessRoute;
}

export interface TitrationStepRow {
  dose: number;
  rateMlHr: number | null;
  secondaryDoseLabel: string | null;
}

export interface SmartDripAlert {
  severity: ClinicalSeverity;
  titleEn: string;
  titleVi: string;
  detailEn: string;
  detailVi: string;
}

export interface SmartDripResult {
  valid: boolean;
  concentrationPerMl: number | null; // mcg/mL or units/mL
  concentrationUnit: "mcg/mL" | "units/mL";
  rateMlHr: number | null;
  dosePrimary: number | null;
  dosePrimaryUnit: DoseUnitMode;
  doseSecondary: number | null; // mcg/min or mcg/kg/min or units/hr
  doseSecondaryLabel: string | null;
  syringeDurationHours: number | null;
  titrationTable: TitrationStepRow[];
  alerts: SmartDripAlert[];
}

function isPositiveFinite(val: number | null | undefined): val is number {
  return typeof val === "number" && Number.isFinite(val) && val > 0;
}

function roundTo(val: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

export function computeSmartDrip(input: SmartDripInput): SmartDripResult {
  const spec = VASOPRESSOR_CATALOG[input.drugId];
  const isVaso = input.drugId === "vasopressin";
  const concUnit: "mcg/mL" | "units/mL" = isVaso ? "units/mL" : "mcg/mL";

  const alerts: SmartDripAlert[] = [];

  // Concentration
  let concPerMl: number | null = null;
  if (isPositiveFinite(input.drugAmount) && isPositiveFinite(input.volumeMl)) {
    const totalNumerator = isVaso ? input.drugAmount : input.drugAmount * 1000; // mcg or units
    concPerMl = totalNumerator / input.volumeMl;
  }

  // Line safety checks (independent of rate)
  if (concPerMl !== null && input.accessRoute === "piv") {
    if (!spec.pivSafe || spec.maxPivConcMcgPerMl === 0) {
      alerts.push({
        severity: "danger",
        titleEn: "Avoid Peripheral IV for Vasopressin",
        titleVi: "Tránh truyền ngoại biên với Vasopressin",
        detailEn:
          "Vasopressin extravasation causes severe ischemic necrosis and is NOT reversed by phentolamine. Infuse via Central Venous Catheter (CVC).",
        detailVi:
          "Thoát mạch Vasopressin gây hoại tử thiếu máu nặng và KHÔNG có thuốc giải độc Phentolamine. Bắt buộc truyền qua Catheter trung tâm (CVC).",
      });
    } else if (concPerMl > spec.maxPivConcMcgPerMl) {
      alerts.push({
        severity: "danger",
        titleEn: `Concentration (${roundTo(concPerMl, 1)} mcg/mL) exceeds PIV limit (≤ ${spec.maxPivConcMcgPerMl} mcg/mL)`,
        titleVi: `Nồng độ (${roundTo(concPerMl, 1)} mcg/mL) vượt ngưỡng truyền ngoại biên (≤ ${spec.maxPivConcMcgPerMl} mcg/mL)`,
        detailEn:
          "VN 50 mL syringe concentrations are intended for CVC. For peripheral bridge, switch to a diluted 250 mL PIV-safe bag or secure CVC.",
        detailVi:
          "Bơm tiêm 50 mL đậm đặc chỉ phù hợp qua CVC. Nếu bắt buộc truyền ngoại biên tạm thời, hãy chọn túi pha loãng 250 mL (≤ ngưỡng PIV) hoặc đặt CVC.",
      });
    } else {
      alerts.push({
        severity: "warning",
        titleEn: "Peripheral IV Bridge Precautions",
        titleVi: "Lưu ý an toàn khi truyền ngoại biên (PIV)",
        detailEn:
          "Use ≥18–20G catheter in or proximal to the antecubital fossa, inspect site q1–2h, and transition to CVC within 24–48 h.",
        detailVi:
          "Đặt kim luồn ≥18–20G từ nếp khuỷu trở lên, kiểm tra vị trí truyền mỗi 1–2 giờ và chuyển sang CVC trong vòng 24–48 giờ.",
      });
    }
  }

  const effectiveUnitMode: DoseUnitMode = isVaso
    ? "units_min"
    : spec.supportsFixedMcgMin
    ? input.unitMode
    : "mcg_kg_min";

  const needsWeight = effectiveUnitMode === "mcg_kg_min";
  const hasWeight = isPositiveFinite(input.weightKg);

  // Build titration reference table whenever concentration + required weight exist
  const titrationTable: TitrationStepRow[] = [];
  if (concPerMl !== null && (!needsWeight || hasWeight)) {
    for (const refDose of spec.referenceDoses) {
      let rate: number | null = null;
      let secLabel: string | null = null;
      if (effectiveUnitMode === "mcg_kg_min" && hasWeight) {
        rate = (refDose * input.weightKg! * 60) / concPerMl;
        secLabel = `${roundTo(refDose * input.weightKg!, 1)} mcg/min`;
      } else if (effectiveUnitMode === "mcg_min") {
        // For fixed mcg/min table, scale reference doses appropriately if NE/Epi
        const fixedDose = isVaso ? refDose : roundTo(refDose * 60, 1);
        rate = (fixedDose * 60) / concPerMl;
        if (hasWeight) {
          secLabel = `${roundTo(fixedDose / input.weightKg!, 3)} mcg/kg/min`;
        }
        titrationTable.push({
          dose: fixedDose,
          rateMlHr: roundTo(rate, 2),
          secondaryDoseLabel: secLabel,
        });
        continue;
      } else if (effectiveUnitMode === "units_min") {
        rate = (refDose * 60) / concPerMl;
        secLabel = `${roundTo(refDose * 60, 2)} U/h`;
      }
      titrationTable.push({
        dose: refDose,
        rateMlHr: rate !== null ? roundTo(rate, 2) : null,
        secondaryDoseLabel: secLabel,
      });
    }
  }

  // Compute primary output
  let rateMlHr: number | null = null;
  let dosePrimary: number | null = null;
  let doseSecondary: number | null = null;
  let doseSecondaryLabel: string | null = null;

  if (concPerMl !== null && (!needsWeight || hasWeight)) {
    if (input.direction === "dose_to_rate" && isPositiveFinite(input.targetDose)) {
      dosePrimary = input.targetDose;
      if (effectiveUnitMode === "mcg_kg_min") {
        rateMlHr = (dosePrimary * input.weightKg! * 60) / concPerMl;
        doseSecondary = dosePrimary * input.weightKg!;
        doseSecondaryLabel = `${roundTo(doseSecondary, 2)} mcg/min`;
      } else if (effectiveUnitMode === "mcg_min") {
        rateMlHr = (dosePrimary * 60) / concPerMl;
        if (hasWeight) {
          doseSecondary = dosePrimary / input.weightKg!;
          doseSecondaryLabel = `${roundTo(doseSecondary, 3)} mcg/kg/min`;
        }
      } else {
        rateMlHr = (dosePrimary * 60) / concPerMl;
        doseSecondary = dosePrimary * 60;
        doseSecondaryLabel = `${roundTo(doseSecondary, 2)} U/h`;
      }
    } else if (input.direction === "rate_to_dose" && isPositiveFinite(input.pumpRateMlHr)) {
      rateMlHr = input.pumpRateMlHr;
      if (effectiveUnitMode === "mcg_kg_min") {
        dosePrimary = (rateMlHr * concPerMl) / (input.weightKg! * 60);
        doseSecondary = (rateMlHr * concPerMl) / 60;
        doseSecondaryLabel = `${roundTo(doseSecondary, 2)} mcg/min`;
      } else if (effectiveUnitMode === "mcg_min") {
        dosePrimary = (rateMlHr * concPerMl) / 60;
        if (hasWeight) {
          doseSecondary = dosePrimary / input.weightKg!;
          doseSecondaryLabel = `${roundTo(doseSecondary, 3)} mcg/kg/min`;
        }
      } else {
        dosePrimary = (rateMlHr * concPerMl) / 60;
        doseSecondary = dosePrimary * 60;
        doseSecondaryLabel = `${roundTo(doseSecondary, 2)} U/h`;
      }
    }
  }

  let syringeDurationHours: number | null = null;
  if (isPositiveFinite(rateMlHr) && isPositiveFinite(input.volumeMl)) {
    syringeDurationHours = input.volumeMl / rateMlHr;
    if (syringeDurationHours < 2) {
      alerts.push({
        severity: "warning",
        titleEn: `Short syringe duration (~${roundTo(syringeDurationHours, 1)} h)`,
        titleVi: `Thời gian hết bơm tiêm ngắn (~${roundTo(syringeDurationHours, 1)} giờ)`,
        detailEn:
          "Consider doubling the concentration (e.g. 8 mg or 16 mg in 50 mL via CVC) to avoid frequent syringe changes and hemodynamic swings.",
        detailVi:
          "Cân nhắc tăng gấp đôi nồng độ pha (vd: 8 mg hoặc 16 mg/50 mL qua CVC) để tránh thay bơm liên tục gây dao động huyết áp.",
      });
    }
    if (rateMlHr < 0.5) {
      alerts.push({
        severity: "warning",
        titleEn: `Very low pump rate (${roundTo(rateMlHr, 2)} mL/h)`,
        titleVi: `Tốc độ bơm rất thấp (${roundTo(rateMlHr, 2)} mL/giờ)`,
        detailEn:
          "Rates < 0.5 mL/h have delayed dead-space delivery and lower syringe pump accuracy. Consider a more diluted preparation.",
        detailVi:
          "Tốc độ < 0.5 mL/giờ dễ sai số cơ học và chậm đáp ứng khoảng chết dây truyền. Cân nhắc pha loãng hơn.",
      });
    }
  }

  // Clinical dose band alerts
  const weightNormalizedDose =
    dosePrimary !== null
      ? effectiveUnitMode === "mcg_kg_min"
        ? dosePrimary
        : effectiveUnitMode === "mcg_min" && hasWeight
        ? dosePrimary / input.weightKg!
        : effectiveUnitMode === "units_min"
        ? dosePrimary
        : null
      : null;

  if (weightNormalizedDose !== null) {
    if (input.drugId === "norepinephrine" && weightNormalizedDose >= 0.25) {
      alerts.push({
        severity: weightNormalizedDose >= 0.5 ? "danger" : "warning",
        titleEn:
          weightNormalizedDose >= 0.5
            ? "High-dose Norepinephrine (≥ 0.5 mcg/kg/min)"
            : "Escalation threshold reached (NE ≥ 0.25 mcg/kg/min)",
        titleVi:
          weightNormalizedDose >= 0.5
            ? "Norepinephrine liều cao (≥ 0.5 mcg/kg/phút)"
            : "Đạt ngưỡng phối hợp thuốc (NE ≥ 0.25 mcg/kg/phút)",
        detailEn:
          "SSC 2026: Add fixed-dose Vasopressin 0.03 U/min on escalating NE (panel median 0.3, IQR 0.2–0.5 mcg/kg/min) and consider IV Hydrocortisone 200 mg/day in septic shock.",
        detailVi:
          "SSC 2026: Cân nhắc thêm Vasopressin 0.03 U/phút khi tăng liều NE (trung vị 0.3, IQR 0.2–0.5 mcg/kg/phút) và Hydrocortisone 200 mg/ngày TM trong sốc nhiễm khuẩn.",
      });
    }
    if (input.drugId === "dopamine") {
      const bandEn =
        weightNormalizedDose < 5
          ? "Low-dose band (<5 mcg/kg/min): D1/D2 predominant — NOT recommended for renal protection (SSC 2026)."
          : weightNormalizedDose <= 10
          ? "Intermediate band (5–10 mcg/kg/min): β1 inotropic/chronotropic predominant."
          : "High-dose band (>10 mcg/kg/min): α1 vasoconstriction predominant; high tachyarrhythmia risk.";
      const bandVi =
        weightNormalizedDose < 5
          ? "Dải liều thấp (<5 mcg/kg/phút): Ưu thế D1/D2 — KHÔNG dùng để bảo vệ thận (SSC 2026)."
          : weightNormalizedDose <= 10
          ? "Dải liều trung bình (5–10 mcg/kg/phút): Ưu thế β1 tăng co bóp & nhịp tim."
          : "Dải liều cao (>10 mcg/kg/phút): Ưu thế co mạch α1; nguy cơ nhịp nhanh loạn nhịp cao.";
      alerts.push({
        severity: weightNormalizedDose > 10 ? "warning" : "info",
        titleEn: "Dopamine Receptor Band",
        titleVi: "Phân tầng thụ thể Dopamine",
        detailEn: bandEn,
        detailVi: bandVi,
      });
    }
    if (weightNormalizedDose > spec.typicalMax) {
      alerts.push({
        severity: "danger",
        titleEn: `Exceeds usual ICU ceiling (${spec.typicalMax} ${isVaso ? "U/min" : "mcg/kg/min"})`,
        titleVi: `Vượt ngưỡng trần ICU thường quy (${spec.typicalMax} ${isVaso ? "U/phút" : "mcg/kg/phút"})`,
        detailEn:
          "Check for occult hypovolemia, acidosis, pneumothorax, tamponade, adrenal insufficiency, or add second-line agent.",
        detailVi:
          "Kiểm tra lại thiếu dịch ẩn, toan chuyển hóa, tràn khí màng phổi, chèn ép tim, suy thượng thận hoặc phối hợp thuốc khác.",
      });
    }
  }

  return {
    valid: rateMlHr !== null && dosePrimary !== null,
    concentrationPerMl: concPerMl !== null ? roundTo(concPerMl, 3) : null,
    concentrationUnit: concUnit,
    rateMlHr: rateMlHr !== null ? roundTo(rateMlHr, 2) : null,
    dosePrimary: dosePrimary !== null ? roundTo(dosePrimary, 4) : null,
    dosePrimaryUnit: effectiveUnitMode,
    doseSecondary: doseSecondary !== null ? roundTo(doseSecondary, 3) : null,
    doseSecondaryLabel,
    syringeDurationHours:
      syringeDurationHours !== null ? roundTo(syringeDurationHours, 1) : null,
    titrationTable,
    alerts,
  };
}

// ============================================================================
// MODULE 2: NEE (Kotani 2023) & VIS (Gaies 2010)
// ============================================================================

export interface ActiveAgentDoses {
  norepinephrine: number | null; // mcg/kg/min
  epinephrine: number | null; // mcg/kg/min
  dopamine: number | null; // mcg/kg/min
  dobutamine: number | null; // mcg/kg/min
  vasopressin: number | null; // units/min
}

export interface AgentContribution {
  drugId: VasopressorId;
  dose: number;
  unitLabel: string;
  neeContribution: number;
  visContribution: number | null;
}

export interface NeeVisResult {
  nee: number;
  vis: number | null;
  visPartial: boolean;
  visMissingWeightForVaso: boolean;
  hasAnyActive: boolean;
  shockTier: "none" | "low" | "moderate" | "high" | "refractory";
  visTier: "none" | "low" | "moderate" | "high" | "severe";
  contributions: AgentContribution[];
  escalationAlerts: SmartDripAlert[];
}

export function computeNeeAndVis(
  agents: ActiveAgentDoses,
  weightKg: number | null
): NeeVisResult {
  const ne = isPositiveFinite(agents.norepinephrine) ? agents.norepinephrine : 0;
  const epi = isPositiveFinite(agents.epinephrine) ? agents.epinephrine : 0;
  const dopa = isPositiveFinite(agents.dopamine) ? agents.dopamine : 0;
  const dobut = isPositiveFinite(agents.dobutamine) ? agents.dobutamine : 0;
  const vaso = isPositiveFinite(agents.vasopressin) ? agents.vasopressin : 0;

  const hasAnyActive = ne > 0 || epi > 0 || dopa > 0 || dobut > 0 || vaso > 0;
  const hasWeight = isPositiveFinite(weightKg);

  // Kotani 2023 NEE (mcg/kg/min): NE + Epi + Dopamine/100 + Vasopressin*2.5
  const neNee = ne;
  const epiNee = epi;
  const dopaNee = dopa / 100;
  const vasoNee = vaso * 2.5;
  const nee = roundTo(neNee + epiNee + dopaNee + vasoNee, 3);

  // Gaies 2010 VIS: Dopamine + Dobutamine + 100*Epi + 100*NE + 10000*Vasopressin(U/kg/min)
  const neVis = ne * 100;
  const epiVis = epi * 100;
  const dopaVis = dopa;
  const dobutVis = dobut;
  const vasoVis = vaso > 0 ? (hasWeight ? (vaso / weightKg!) * 10000 : null) : 0;

  const visMissingWeightForVaso = vaso > 0 && !hasWeight;
  const partialVisSum = neVis + epiVis + dopaVis + dobutVis;
  const vis =
    vasoVis === null
      ? roundTo(partialVisSum, 1)
      : roundTo(partialVisSum + vasoVis, 1);

  const contributions: AgentContribution[] = [];
  if (ne > 0) {
    contributions.push({
      drugId: "norepinephrine",
      dose: ne,
      unitLabel: "mcg/kg/min",
      neeContribution: roundTo(neNee, 3),
      visContribution: roundTo(neVis, 1),
    });
  }
  if (epi > 0) {
    contributions.push({
      drugId: "epinephrine",
      dose: epi,
      unitLabel: "mcg/kg/min",
      neeContribution: roundTo(epiNee, 3),
      visContribution: roundTo(epiVis, 1),
    });
  }
  if (vaso > 0) {
    contributions.push({
      drugId: "vasopressin",
      dose: vaso,
      unitLabel: "U/min",
      neeContribution: roundTo(vasoNee, 3),
      visContribution: vasoVis !== null ? roundTo(vasoVis, 1) : null,
    });
  }
  if (dopa > 0) {
    contributions.push({
      drugId: "dopamine",
      dose: dopa,
      unitLabel: "mcg/kg/min",
      neeContribution: roundTo(dopaNee, 3),
      visContribution: roundTo(dopaVis, 1),
    });
  }
  if (dobut > 0) {
    contributions.push({
      drugId: "dobutamine",
      dose: dobut,
      unitLabel: "mcg/kg/min",
      neeContribution: 0,
      visContribution: roundTo(dobutVis, 1),
    });
  }

  let shockTier: NeeVisResult["shockTier"] = "none";
  if (nee > 0.5) shockTier = "refractory";
  else if (nee >= 0.25) shockTier = "high";
  else if (nee >= 0.1) shockTier = "moderate";
  else if (nee > 0) shockTier = "low";

  let visTier: NeeVisResult["visTier"] = "none";
  if (vis !== null && hasAnyActive) {
    if (vis > 45) visTier = "severe";
    else if (vis >= 20) visTier = "high";
    else if (vis >= 10) visTier = "moderate";
    else if (vis > 0) visTier = "low";
  }

  const escalationAlerts: SmartDripAlert[] = [];
  if (ne >= 0.25 && vaso === 0) {
    escalationAlerts.push({
      severity: "warning",
      titleEn: "SSC 2026: Consider Adding Vasopressin 0.03 U/min",
      titleVi: "SSC 2026: Cân nhắc thêm Vasopressin 0.03 U/phút",
      detailEn:
        "Norepinephrine has reached ≥ 0.25 mcg/kg/min (SSC 2026 panel median 0.3, IQR 0.2–0.5). Adding fixed-dose Vasopressin (0.03 U/min) reduces catecholamine burden and AF risk vs escalating NE alone.",
      detailVi:
        "Norepinephrine đạt ≥ 0.25 mcg/kg/phút (trung vị SSC 2026 là 0.3, IQR 0.2–0.5). Thêm Vasopressin 0.03 U/phút giúp giảm gánh nặng catecholamin và nguy cơ rung nhĩ thay vì tăng NE đơn độc.",
    });
  }
  if (nee >= 0.25) {
    escalationAlerts.push({
      severity: nee > 0.5 ? "danger" : "warning",
      titleEn: "SSC 2026: IV Hydrocortisone (200 mg/day)",
      titleVi: "SSC 2026: Cân nhắc Hydrocortisone 200 mg/ngày TM",
      detailEn:
        "For septic shock with ongoing vasopressor requirement (typically NE/NEE ≥ 0.2–0.3 mcg/kg/min), suggest IV Hydrocortisone 200 mg/day (50 mg q6h or continuous).",
      detailVi:
        "Trong sốc nhiễm khuẩn cần vận mạch kéo dài (thường khi NE/NEE ≥ 0.2–0.3 mcg/kg/phút), gợi ý Hydrocortisone 200 mg/ngày TM (50 mg mỗi 6 giờ hoặc truyền liên tục).",
    });
  }
  if (dopa > 0) {
    escalationAlerts.push({
      severity: "info",
      titleEn: "Dopamine Active — Review Indication",
      titleVi: "Đang dùng Dopamine — Rà soát chỉ định",
      detailEn:
        "SSC 2026 recommends norepinephrine over dopamine in septic shock due to higher tachyarrhythmia risk; reserve dopamine for symptomatic bradycardia.",
      detailVi:
        "SSC 2026 khuyến cáo dùng Norepinephrine thay Dopamine trong sốc nhiễm khuẩn do nguy cơ loạn nhịp cao; chỉ cân nhắc khi nhịp chậm có triệu chứng.",
    });
  }
  if (nee > 0.5) {
    escalationAlerts.push({
      severity: "danger",
      titleEn: "Refractory Shock (NEE > 0.5 mcg/kg/min)",
      titleVi: "Sốc kháng trị (NEE > 0.5 mcg/kg/phút)",
      detailEn:
        "Perform bedside echocardiography (rule out cardiac dysfunction, tamponade), verify volume/acid-base/ionized Ca2+, and evaluate source control.",
      detailVi:
        "Siêu âm tim tại giường (loại trừ rối loạn chức năng tim, chèn ép tim), kiểm tra thể tích tuần hoàn, toan kiềm, Ca2+ và ổ nhiễm trùng.",
    });
  }

  return {
    nee,
    vis,
    visPartial: visMissingWeightForVaso,
    visMissingWeightForVaso,
    hasAnyActive,
    shockTier,
    visTier,
    contributions,
    escalationAlerts,
  };
}

// ============================================================================
// MODULE 3: DE-ESCALATION & WEANING COACH
// ============================================================================

export type LactateTrend = "normal_or_falling" | "flat_or_rising";

export interface WeaningCoachInput {
  agents: ActiveAgentDoses;
  targetProfile: NeuroTargetProfileId;
  currentMap: number | null;
  currentIcp: number | null; // relevant for tbi_cpp
  stableHours: number | null;
  lactateTrend: LactateTrend;
  perfusionOk: boolean; // CRT < 3s & UOP >= 0.5 mL/kg/h
  sourceVolumeAddressed: boolean;
}

export interface WeaningChecklistItem {
  passed: boolean;
  labelEn: string;
  labelVi: string;
}

export interface WeaningStep {
  priority: number;
  drugId: VasopressorId;
  actionTitleEn: string;
  actionTitleVi: string;
  stepRuleEn: string;
  stepRuleVi: string;
  rationaleEn: string;
  rationaleVi: string;
}

export type VasopressorActionVerdict =
  | "escalate"
  | "maintain"
  | "caution_wean"
  | "wean"
  | "no_agents";

export type AgentActionType = "increase" | "maintain" | "wean" | "stop" | "switch";

export interface AgentActionPlan {
  drugId: VasopressorId;
  currentDose: number;
  unitLabel: string;
  action: AgentActionType;
  priority: number;
  titleEn: string;
  titleVi: string;
  instructionEn: string;
  instructionVi: string;
  rationaleEn: string;
  rationaleVi: string;
}

export interface RegimenChangeSuggestion {
  kind: "add" | "remove" | "switch";
  severity: ClinicalSeverity;
  drugId?: VasopressorId;
  titleEn: string;
  titleVi: string;
  detailEn: string;
  detailVi: string;
}

export interface WeaningCoachResult {
  readiness: "ready" | "caution" | "hold" | "no_agents";
  actionVerdict: VasopressorActionVerdict;
  verdictTitleEn: string;
  verdictTitleVi: string;
  verdictSummaryEn: string;
  verdictSummaryVi: string;
  nee: number;
  mapStatus: "below" | "at_target" | "above" | "unknown";
  computedCpp: number | null;
  checklist: WeaningChecklistItem[];
  agentActions: AgentActionPlan[];
  regimenChanges: RegimenChangeSuggestion[];
  orderedSteps: WeaningStep[];
  reboundFlagsEn: string[];
  reboundFlagsVi: string[];
}

export function evaluateWeaningCoach(
  input: WeaningCoachInput
): WeaningCoachResult {
  const profile = NEURO_TARGET_PROFILES[input.targetProfile];
  const ne = isPositiveFinite(input.agents.norepinephrine)
    ? input.agents.norepinephrine
    : 0;
  const epi = isPositiveFinite(input.agents.epinephrine)
    ? input.agents.epinephrine
    : 0;
  const dopa = isPositiveFinite(input.agents.dopamine)
    ? input.agents.dopamine
    : 0;
  const dobut = isPositiveFinite(input.agents.dobutamine)
    ? input.agents.dobutamine
    : 0;
  const vaso = isPositiveFinite(input.agents.vasopressin)
    ? input.agents.vasopressin
    : 0;

  const hasActive = ne > 0 || epi > 0 || dopa > 0 || dobut > 0 || vaso > 0;
  const nee = roundTo(ne + epi + dopa / 100 + vaso * 2.5, 3);

  let computedCpp: number | null = null;
  if (
    profile.usesCpp &&
    typeof input.currentMap === "number" &&
    Number.isFinite(input.currentMap) &&
    typeof input.currentIcp === "number" &&
    Number.isFinite(input.currentIcp)
  ) {
    computedCpp = roundTo(input.currentMap - input.currentIcp, 1);
  }

  // Hemodynamic target check & mapStatus
  let mapTargetMet = false;
  let mapStatus: WeaningCoachResult["mapStatus"] = "unknown";
  if (profile.usesCpp && computedCpp !== null && profile.minCpp !== undefined) {
    if (computedCpp < profile.minCpp) {
      mapStatus = "below";
    } else if (profile.maxCpp !== undefined && computedCpp > profile.maxCpp) {
      mapStatus = "above";
      mapTargetMet = true;
    } else {
      mapStatus = "at_target";
      mapTargetMet = true;
    }
  } else if (
    typeof input.currentMap === "number" &&
    Number.isFinite(input.currentMap)
  ) {
    if (input.currentMap < profile.minMap) {
      mapStatus = "below";
    } else if (profile.maxMap !== undefined && input.currentMap > profile.maxMap) {
      mapStatus = "above";
      mapTargetMet = true;
    } else if (!profile.maxMap && input.currentMap >= profile.minMap + 20) {
      mapStatus = "above";
      mapTargetMet = true;
    } else {
      mapStatus = "at_target";
      mapTargetMet = true;
    }
  }

  const stableMet =
    typeof input.stableHours === "number" &&
    Number.isFinite(input.stableHours) &&
    input.stableHours >= 2;
  const lactateMet = input.lactateTrend === "normal_or_falling";

  const checklist: WeaningChecklistItem[] = [
    {
      passed: mapTargetMet,
      labelEn: profile.usesCpp
        ? `CPP ≥ ${profile.minCpp} mmHg (or MAP ≥ ${profile.minMap} mmHg)`
        : `MAP ≥ ${profile.minMap} mmHg (${profile.labelEn})`,
      labelVi: profile.usesCpp
        ? `CPP ≥ ${profile.minCpp} mmHg (hoặc MAP ≥ ${profile.minMap} mmHg)`
        : `MAP ≥ ${profile.minMap} mmHg (${profile.labelVi})`,
    },
    {
      passed: stableMet,
      labelEn: "Hemodynamically stable ≥ 2 hours without up-titration",
      labelVi: "Huyết động ổn định ≥ 2 giờ không phải tăng liều",
    },
    {
      passed: lactateMet,
      labelEn: "Lactate normalizing or downward trend",
      labelVi: "Lactat bình thường hoặc đang giảm dần",
    },
    {
      passed: input.perfusionOk,
      labelEn: "End-organ perfusion adequate (CRT < 3s, UOP ≥ 0.5 mL/kg/h)",
      labelVi: "Tưới máu cơ quan đạt (CRT < 3s, nước tiểu ≥ 0.5 mL/kg/giờ)",
    },
    {
      passed: input.sourceVolumeAddressed,
      labelEn: "Euvolemia achieved & primary cause/source addressed",
      labelVi: "Đã bù đủ dịch & kiểm soát nguyên nhân/ổ nhiễm trùng",
    },
  ];

  // Ordered de-escalation steps
  const orderedSteps: WeaningStep[] = [];
  let priority = 1;

  if (epi > 0) {
    orderedSteps.push({
      priority: priority++,
      drugId: "epinephrine",
      actionTitleEn: "1. Wean Epinephrine First",
      actionTitleVi: "1. Giảm Epinephrine trước tiên",
      stepRuleEn: "Decrease by 0.02–0.05 mcg/kg/min every 15–30 min until discontinued.",
      stepRuleVi: "Giảm 0.02–0.05 mcg/kg/phút mỗi 15–30 phút đến khi ngừng hẳn.",
      rationaleEn:
        "Epinephrine carries the highest risk of tachyarrhythmia, myocardial oxygen demand, and β2-mediated hyperlactatemia.",
      rationaleVi:
        "Epinephrine có nguy cơ gây nhịp nhanh loạn nhịp, tăng tiêu thụ oxy cơ tim và tăng lactat cao nhất.",
    });
  }

  if (dopa > 0) {
    orderedSteps.push({
      priority: priority++,
      drugId: "dopamine",
      actionTitleEn: `${priority - 1}. Taper Dopamine (or transition to NE)`,
      actionTitleVi: `${priority - 1}. Giảm Dopamine (hoặc chuyển sang NE)`,
      stepRuleEn: "Decrease by 1–2 mcg/kg/min every 15–30 min as tolerated.",
      stepRuleVi: "Giảm 1–2 mcg/kg/phút mỗi 15–30 phút theo đáp ứng huyết áp.",
      rationaleEn:
        "Minimizes chronotropic arrhythmia burden as endogenous vascular tone recovers.",
      rationaleVi:
        "Giảm nguy cơ rối loạn nhịp nhanh khi trương lực mạch máu hồi phục.",
    });
  }

  if (ne > 0 && vaso > 0) {
    orderedSteps.push({
      priority: priority++,
      drugId: "norepinephrine",
      actionTitleEn: `${priority - 1}. Taper Norepinephrine toward low dose first`,
      actionTitleVi: `${priority - 1}. Giảm Norepinephrine về mức thấp trước`,
      stepRuleEn:
        "Decrease NE by 0.02–0.05 mcg/kg/min q15–30 min until ≤ 0.05–0.1 mcg/kg/min while keeping Vasopressin steady.",
      stepRuleVi:
        "Giảm NE 0.02–0.05 mcg/kg/phút mỗi 15–30 phút đến ≤ 0.05–0.1 mcg/kg/phút trong khi giữ nguyên Vasopressin.",
      rationaleEn:
        "Prematurely stopping Vasopressin while NE is moderate/high increases rebound hypotension; reduce catecholamine toxicity first.",
      rationaleVi:
        "Ngừng Vasopressin sớm khi NE còn cao dễ gây tụt huyết áp dội ngược; ưu tiên hạ bớt độc tính catecholamin trước.",
    });
    orderedSteps.push({
      priority: priority++,
      drugId: "vasopressin",
      actionTitleEn: `${priority - 1}. Then Wean Vasopressin`,
      actionTitleVi: `${priority - 1}. Sau đó giảm dần Vasopressin`,
      stepRuleEn:
        "Once NE is low (≤ 0.05–0.1 mcg/kg/min) and stable, decrease Vasopressin by 0.01 U/min q30–60 min (or discontinue after NE is off if preferred).",
      stepRuleVi:
        "Khi NE đã ở mức thấp ổn định (≤ 0.05–0.1 mcg/kg/phút), giảm Vasopressin 0.01 U/phút mỗi 30–60 phút hoặc ngừng sau khi cắt NE.",
      rationaleEn:
        "Gradual step-down prevents delayed rebound vasodilation given Vasopressin's 10–20 min half-life.",
      rationaleVi:
        "Giảm bậc thang chậm giúp tránh tụt huyết áp muộn do thời gian bán thải của Vasopressin là 10–20 phút.",
    });
  } else if (ne > 0) {
    orderedSteps.push({
      priority: priority++,
      drugId: "norepinephrine",
      actionTitleEn: `${priority - 1}. Taper Norepinephrine`,
      actionTitleVi: `${priority - 1}. Giảm dần Norepinephrine`,
      stepRuleEn:
        "Decrease by 0.02–0.05 mcg/kg/min every 15–30 min while maintaining target MAP.",
      stepRuleVi:
        "Giảm 0.02–0.05 mcg/kg/phút mỗi 15–30 phút nếu MAP vẫn đạt đích.",
      rationaleEn:
        "Short plasma half-life (1–2 min) allows rapid bedside assessment after each step-down.",
      rationaleVi:
        "Thời gian bán thải ngắn (1–2 phút) cho phép đánh giá đáp ứng huyết áp nhanh sau mỗi bước giảm.",
    });
  } else if (vaso > 0) {
    orderedSteps.push({
      priority: priority++,
      drugId: "vasopressin",
      actionTitleEn: `${priority - 1}. Step-Down Vasopressin`,
      actionTitleVi: `${priority - 1}. Giảm bậc Vasopressin`,
      stepRuleEn: "Decrease by 0.01 U/min every 30–60 min (0.03 → 0.02 → 0.01 → off).",
      stepRuleVi: "Giảm 0.01 U/phút mỗi 30–60 phút (0.03 → 0.02 → 0.01 → ngừng).",
      rationaleEn: "Avoid abrupt cessation to prevent rebound vasodilatory hypotension.",
      rationaleVi: "Tránh ngừng đột ngột để phòng tụt huyết áp giãn mạch dội ngược.",
    });
  }

  if (dobut > 0) {
    orderedSteps.push({
      priority: priority++,
      drugId: "dobutamine",
      actionTitleEn: `${priority - 1}. Wean Dobutamine Last`,
      actionTitleVi: `${priority - 1}. Cai Dobutamine sau cùng`,
      stepRuleEn:
        "Decrease by 2.5 mcg/kg/min every 1–2 hours once vasopressors are minimal/off; monitor ScvO2, lactate, and UOP.",
      stepRuleVi:
        "Giảm 2.5 mcg/kg/phút mỗi 1–2 giờ khi vận mạch đã tối thiểu/ngừng; theo dõi ScvO2, lactat và nước tiểu.",
      rationaleEn:
        "Inotropic support should be maintained until afterload/vascular tone stabilizes to prevent recurrent low cardiac output.",
      rationaleVi:
        "Duy trì hỗ trợ co bóp cơ tim đến khi trương lực mạch ổn định để tránh tái phát hội chứng cung lượng tim thấp.",
    });
  }

  const reboundFlagsEn = [
    `Drop in ${profile.usesCpp ? `CPP < ${profile.minCpp}` : `MAP < ${profile.minMap}`} mmHg lasting > 5 min → return to previous rate.`,
    "Rising serum lactate, worsening mottling / CRT > 3s, or oliguria (< 0.5 mL/kg/h for 2 h).",
  ];
  const reboundFlagsVi = [
    `Giảm ${profile.usesCpp ? `CPP < ${profile.minCpp}` : `MAP < ${profile.minMap}`} mmHg kéo dài > 5 phút → quay lại tốc độ trước đó.`,
    "Lactat máu tăng lại, nổi vân tím / CRT > 3s, hoặc thiểu niệu (< 0.5 mL/kg/giờ trong 2 giờ).",
  ];

  if (input.targetProfile === "sah_dci") {
    reboundFlagsEn.push(
      "SAH DCI: Any recurrence of focal neurological deficit or GCS drop during taper → immediately restore previous MAP target."
    );
    reboundFlagsVi.push(
      "Co thắt mạch SAH: Xuất hiện lại dấu thần kinh khu trú hoặc tụt GCS khi giảm liều → khôi phục ngay mức MAP trước đó."
    );
  }
  if (input.targetProfile === "septic_elderly") {
    reboundFlagsEn.push(
      "SSC 2026 (Age ≥ 65): Target MAP 60–65 mmHg; avoid pushing MAP higher if end-organ perfusion is adequate."
    );
    reboundFlagsVi.push(
      "SSC 2026 (≥ 65 tuổi): Giữ đích MAP 60–65 mmHg; tránh đẩy MAP lên cao hơn nếu tưới máu cơ quan đã đạt."
    );
  }
  if (input.targetProfile === "cardiogenic") {
    reboundFlagsEn.push(
      "ACC 2025 CS: Use vasoactive agents at the lowest dose for the shortest duration; monitor transrenal perfusion pressure (MAP − CVP), lactate, and arrhythmias."
    );
    reboundFlagsVi.push(
      "ACC 2025 CS: Dùng vận mạch ở liều thấp nhất trong thời gian ngắn nhất; theo dõi áp lực tưới máu thận (MAP − CVP), lactat và rối loạn nhịp."
    );
  }

  const regimenChanges: RegimenChangeSuggestion[] = [];
  const agentActions: AgentActionPlan[] = [];

  if (!hasActive) {
    if (mapStatus === "below") {
      regimenChanges.push({
        kind: "add",
        severity: "warning",
        drugId: "norepinephrine",
        titleEn: "Consider Starting Norepinephrine (0.05 mcg/kg/min)",
        titleVi: "Cân nhắc khởi trị Norepinephrine (0.05 mcg/kg/phút)",
        detailEn:
          "Target MAP/CPP is not met and no vasopressor is active. Verify fluid responsiveness/euvolemia first; if still hypotensive, initiate Norepinephrine as first-line pressor.",
        detailVi:
          "MAP/CPP chưa đạt đích và chưa có vận mạch. Kiểm tra bù đủ dịch trước; nếu vẫn tụt huyết áp, khởi trị Norepinephrine đầu tay.",
      });
    }
    return {
      readiness: "no_agents",
      actionVerdict: "no_agents",
      verdictTitleEn: "Enter Active Vasopressor Doses",
      verdictTitleVi: "Nhập liều vận mạch đang truyền",
      verdictSummaryEn:
        "Enter the patient's current vasopressor doses on the left (or sync from Tab 1/2) to get an active recommendation: increase, maintain, wean, stop, or add/switch agents.",
      verdictSummaryVi:
        "Nhập liều các thuốc vận mạch bệnh nhân đang dùng ở cột trái (hoặc đồng bộ từ tab 1/2) để nhận hướng dẫn cụ thể: tăng liều, duy trì, giảm liều/ngưng hoặc thêm/đổi thuốc.",
      nee,
      mapStatus,
      computedCpp,
      checklist,
      agentActions,
      regimenChanges,
      orderedSteps: [],
      reboundFlagsEn,
      reboundFlagsVi,
    };
  }

  const failedCount = checklist.filter((c) => !c.passed).length;
  let readiness: WeaningCoachResult["readiness"] = "ready";
  if (!mapTargetMet || !lactateMet || !input.perfusionOk) {
    readiness = "hold";
  } else if (failedCount > 0) {
    readiness = "caution";
  }

  // Active Clinical Decision Verdict
  let actionVerdict: VasopressorActionVerdict = "maintain";
  let verdictTitleEn = "";
  let verdictTitleVi = "";
  let verdictSummaryEn = "";
  let verdictSummaryVi = "";

  if (mapStatus === "below") {
    actionVerdict = "escalate";
    verdictTitleEn = "ESCALATE — Increase Dose or Add Second-Line Agent";
    verdictTitleVi = "TĂNG LIỀU / PHỐI HỢP THÊM VẬN MẠCH";
    verdictSummaryEn = profile.usesCpp && computedCpp !== null
      ? `CPP (${computedCpp} mmHg) is below target (≥ ${profile.minCpp} mmHg). Up-titrate vasopressor or add second-line support while addressing ICP & volume status.`
      : `Current MAP is below target (≥ ${profile.minMap} mmHg). Titrate up or add a catecholamine-sparing agent; verify volume & reversible causes.`;
    verdictSummaryVi = profile.usesCpp && computedCpp !== null
      ? `CPP hiện tại (${computedCpp} mmHg) thấp hơn đích (≥ ${profile.minCpp} mmHg). Cần tăng liều hoặc phối hợp thêm thuốc, đồng thời xử trí tăng ICP và đánh giá dịch.`
      : `MAP hiện tại thấp hơn đích (≥ ${profile.minMap} mmHg). Cần tăng liều hoặc phối hợp thêm thuốc; kiểm tra lại thể tích tuần hoàn và nguyên nhân.`;
  } else if (mapStatus === "above") {
    if (input.perfusionOk && lactateMet) {
      actionVerdict = "wean";
      verdictTitleEn = "WEAN / REDUCE — Above Target Range";
      verdictTitleVi = "GIẢM LIỀU — Huyết áp vượt ngưỡng đích";
      verdictSummaryEn = profile.usesCpp && computedCpp !== null
        ? `CPP (${computedCpp} mmHg) exceeds upper target (${profile.maxCpp} mmHg) with adequate perfusion. Actively step down vasopressors to avoid hyperperfusion.`
        : `MAP is above target range while on vasopressors with good perfusion. Actively step down to minimize unnecessary vasoconstriction.`;
      verdictSummaryVi = profile.usesCpp && computedCpp !== null
        ? `CPP (${computedCpp} mmHg) vượt ngưỡng trên (${profile.maxCpp} mmHg) và tưới máu ổn. Chủ động giảm liều vận mạch để tránh tăng tưới máu quá mức.`
        : `MAP đang cao hơn ngưỡng đích khi vẫn còn vận mạch và tưới máu tốt. Chủ động giảm liều để hạn chế co mạch không cần thiết.`;
    } else {
      actionVerdict = "caution_wean";
      verdictTitleEn = "TRIM EXCESS PRESSOR & REASSESS PERFUSION";
      verdictTitleVi = "HẠ BỚT VẬN MẠCH QUÁ MỨC & ĐÁNH GIÁ TƯỚI MÁU";
      verdictSummaryEn =
        "MAP/CPP is above target, but lactate or end-organ perfusion is not yet normalized. Gently trim excess pressor while checking cardiac output, volume, and microcirculation.";
      verdictSummaryVi =
        "MAP/CPP đã vượt đích nhưng lactat hoặc tưới máu mô chưa hồi phục hoàn toàn. Giảm nhẹ phần liều dư và đánh giá lại cung lượng tim, thể tích dịch.";
    }
  } else if (readiness === "ready") {
    actionVerdict = "wean";
    verdictTitleEn = "WEAN / STOP — Ready to De-escalate";
    verdictTitleVi = "GIẢM LIỀU / NGƯNG VẬN MẠCH";
    verdictSummaryEn =
      "All hemodynamic, stability (≥ 2h), and perfusion criteria are met. Follow the prioritized step-down or trial-off plan below.";
    verdictSummaryVi =
      "Đã đạt đủ tiêu chuẩn huyết động, ổn định ≥ 2 giờ và tưới máu mô. Thực hiện giảm liều hoặc ngưng thử theo thứ tự ưu tiên bên dưới.";
  } else if (readiness === "caution") {
    actionVerdict = "caution_wean";
    verdictTitleEn = "MAINTAIN OR CAUTIOUS STEP-DOWN";
    verdictTitleVi = "DUY TRÌ HOẶC GIẢM NHẸ THẬN TRỌNG";
    verdictSummaryEn =
      "MAP/CPP and perfusion are adequate, but stability < 2h or volume/source control is unconfirmed. Prefer maintaining current rate until ≥ 2h stable.";
    verdictSummaryVi =
      "MAP/CPP và tưới máu đạt, nhưng thời gian ổn định < 2 giờ hoặc chưa chắc chắn đủ dịch/kiểm soát nguồn. Ưu tiên duy trì liều hiện tại đến khi ổn định ≥ 2 giờ.";
  } else {
    actionVerdict = "maintain";
    verdictTitleEn =
      mapStatus === "unknown"
        ? "ENTER MAP TO GUIDE TITRATION"
        : "MAINTAIN CURRENT DOSE — Hold Weaning";
    verdictTitleVi =
      mapStatus === "unknown"
        ? "NHẬP MAP ĐỂ ĐỊNH HƯỚNG CHỈNH LIỀU"
        : "DUY TRÌ LIỀU HIỆN TẠI — Chưa giảm liều";
    verdictSummaryEn =
      mapStatus === "unknown"
        ? "Current MAP is not entered. Maintain current infusion and enter MAP (and ICP if TBI) to determine whether to escalate, maintain, or wean."
        : "Target MAP is met, but rising lactate or inadequate end-organ perfusion precludes weaning. Maintain current dose and investigate occult hypoperfusion.";
    verdictSummaryVi =
      mapStatus === "unknown"
        ? "Chưa nhập MAP hiện tại. Duy trì tốc độ truyền và nhập MAP (thêm ICP nếu CTSN) để xác định hướng tăng, giữ hay giảm liều."
        : "MAP đã đạt đích nhưng lactat còn tăng hoặc tưới máu mô chưa đạt. Duy trì liều hiện tại, chưa cai vận mạch và tìm nguyên nhân giảm tưới máu ẩn.";
  }

  // Regimen Add / Remove / Switch Recommendations
  const isSepticProfile =
    input.targetProfile === "septic" || input.targetProfile === "septic_elderly";
  const isCardiogenicProfile = input.targetProfile === "cardiogenic";

  if (ne >= 0.25 && vaso === 0 && (mapStatus === "below" || nee >= 0.25)) {
    regimenChanges.push({
      kind: "add",
      severity: mapStatus === "below" ? "danger" : "warning",
      drugId: "vasopressin",
      titleEn: "Add Vasopressin 0.03 U/min (Fixed-Dose, CVC)",
      titleVi: "Thêm Vasopressin 0.03 U/phút (Liều cố định, qua CVC)",
      detailEn:
        "SSC 2026: On escalating NE (median 0.3, IQR 0.2–0.5 mcg/kg/min), add fixed-dose Vasopressin 0.03 U/min to spare catecholamines instead of pushing NE higher alone.",
      detailVi:
        "SSC 2026: Khi tăng liều NE (trung vị 0.3, IQR 0.2–0.5 mcg/kg/phút), thêm Vasopressin 0.03 U/phút cố định để giảm gánh nặng catecholamin thay vì tăng NE đơn độc.",
    });
  }
  if (nee >= 0.25 && isSepticProfile) {
    regimenChanges.push({
      kind: "add",
      severity: nee > 0.5 ? "danger" : "warning",
      titleEn: "Add IV Hydrocortisone (200 mg/day)",
      titleVi: "Thêm Hydrocortisone 200 mg/ngày TM",
      detailEn:
        "SSC 2026: For septic shock with ongoing vasopressor requirement (NE/NEE ≥ 0.2–0.3 mcg/kg/min), suggest IV Hydrocortisone 200 mg/day (50 mg q6h or continuous).",
      detailVi:
        "SSC 2026: Trong sốc nhiễm khuẩn cần vận mạch kéo dài (NE/NEE ≥ 0.2–0.3 mcg/kg/phút), gợi ý Hydrocortisone 200 mg/ngày TM (50 mg mỗi 6 giờ hoặc truyền liên tục).",
    });
  }
  if (nee > 0.5 && epi === 0 && mapStatus === "below") {
    regimenChanges.push({
      kind: "add",
      severity: "danger",
      drugId: "epinephrine",
      titleEn: "Consider Adding Epinephrine (0.02–0.05 mcg/kg/min)",
      titleVi: "Cân nhắc thêm Epinephrine (0.02–0.05 mcg/kg/phút)",
      detailEn:
        "SSC 2026: Inadequate MAP despite NE + Vasopressin (NEE > 0.5): add Epinephrine as 3rd-line pressor (or directly to NE if Vasopressin unavailable) and perform bedside echo.",
      detailVi:
        "SSC 2026: Chưa đạt MAP dù đã phối hợp NE + Vasopressin (NEE > 0.5): thêm Epinephrine bậc 3 (hoặc thêm vào NE nếu không có Vasopressin) và siêu âm tim tại giường.",
    });
  }
  if (
    isCardiogenicProfile &&
    dobut === 0 &&
    (!input.perfusionOk || !lactateMet)
  ) {
    regimenChanges.push({
      kind: "add",
      severity: "warning",
      drugId: "dobutamine",
      titleEn: "ACC 2025 CS: Consider Adding Dobutamine (2–10 mcg/kg/min)",
      titleVi: "ACC 2025 CS: Cân nhắc thêm Dobutamine (2–10 mcg/kg/phút)",
      detailEn:
        "Cardiogenic shock with persistent hypoperfusion despite MAP support: add Dobutamine (2–10 mcg/kg/min; or Milrinone if high SVR & preserved renal function) while maintaining MAP > 60–65 mmHg with NE.",
      detailVi:
        "Sốc tim còn giảm tưới máu dù đã nâng MAP: thêm Dobutamine (2–10 mcg/kg/phút; hoặc Milrinone nếu SVR cao và chức năng thận ổn) trong khi giữ MAP > 60–65 mmHg bằng NE.",
    });
  }
  if (isCardiogenicProfile && dobut > 10) {
    regimenChanges.push({
      kind: "remove",
      severity: "warning",
      drugId: "dobutamine",
      titleEn: "ACC 2025 CS: Dobutamine > 10 mcg/kg/min — Review Risk",
      titleVi: "ACC 2025 CS: Dobutamine > 10 mcg/kg/phút — Cân nhắc giảm",
      detailEn:
        "ACC 2025 CS Table 2 lists Dobutamine dosing at 2–10 mcg/kg/min; higher doses increase arrhythmia and myocardial O2 demand without proportional CO gain.",
      detailVi:
        "Bảng 2 ACC 2025 CS khuyến cáo dải liều Dobutamine 2–10 mcg/kg/phút; liều cao hơn làm tăng nguy cơ loạn nhịp và tiêu thụ oxy cơ tim.",
    });
  }
  if (
    isCardiogenicProfile &&
    (nee > 0.5 ||
      [ne > 0, epi > 0, vaso > 0, dopa > 0, dobut > 0].filter(Boolean).length >= 2) &&
    (mapStatus === "below" || !input.perfusionOk || !lactateMet)
  ) {
    regimenChanges.push({
      kind: "add",
      severity: "danger",
      titleEn: "ACC 2025 CS (SCAI D/E): Activate Shock Team / Evaluate tMCS",
      titleVi: "ACC 2025 CS (SCAI D/E): Hội chẩn Đội Sốc tim / Cân nhắc tMCS",
      detailEn:
        "Escalating pressors or ≥ 2 vasoactive agents with persistent hypoperfusion indicates SCAI Stage D/E. Evaluate temporary Mechanical Circulatory Support (tMCS) to unload the ventricle and de-escalate catecholamines; avoid Phenylephrine monotherapy.",
      detailVi:
        "Tăng liều vận mạch hoặc phối hợp ≥ 2 thuốc mà vẫn giảm tưới máu tương ứng SCAI D/E. Cần hội chẩn Đội Sốc tim và đánh giá hỗ trợ tuần hoàn cơ học (tMCS) để giảm tải thất và cai bớt catecholamin; tránh dùng Phenylephrine đơn độc.",
    });
  }
  if (dopa > 0) {
    regimenChanges.push({
      kind: "switch",
      severity: "warning",
      drugId: "dopamine",
      titleEn: "Switch Dopamine → Norepinephrine",
      titleVi: "Chuyển đổi Dopamine → Norepinephrine",
      detailEn:
        "SSC 2026 & ACC 2025 CS recommend Norepinephrine over Dopamine due to lower tachyarrhythmia risk, unless patient has symptomatic bradycardia.",
      detailVi:
        "SSC 2026 & ACC 2025 CS ưu tiên Norepinephrine hơn Dopamine để giảm nguy cơ loạn nhịp nhanh, trừ trường hợp nhịp chậm có triệu chứng.",
    });
  }

  // Per-Agent Action Plan
  let actionPriority = 1;
  const addAgentAction = (plan: Omit<AgentActionPlan, "priority">) => {
    agentActions.push({ ...plan, priority: actionPriority++ });
  };

  if (actionVerdict === "escalate") {
    if (dopa > 0) {
      addAgentAction({
        drugId: "dopamine",
        currentDose: dopa,
        unitLabel: "mcg/kg/min",
        action: "switch",
        titleEn: "Switch Dopamine to Norepinephrine",
        titleVi: "Chuyển Dopamine sang Norepinephrine",
        instructionEn:
          "Start Norepinephrine (0.05–0.1 mcg/kg/min) and down-titrate Dopamine as NE takes effect (unless bradycardic).",
        instructionVi:
          "Khởi trị Norepinephrine (0.05–0.1 mcg/kg/phút) và giảm dần Dopamine khi NE có tác dụng (trừ khi nhịp chậm).",
        rationaleEn: "Superior vasopressor efficacy with significantly fewer arrhythmias.",
        rationaleVi: "Hiệu quả nâng áp tốt hơn và ít gây rối loạn nhịp hơn rõ rệt.",
      });
    }
    if (ne > 0) {
      if (ne >= 0.25 && vaso === 0) {
        addAgentAction({
          drugId: "norepinephrine",
          currentDose: ne,
          unitLabel: "mcg/kg/min",
          action: "maintain",
          titleEn: "Hold NE Solo Escalation — Add Vasopressin",
          titleVi: "Hạn chế tăng NE đơn độc — Phối hợp Vasopressin",
          instructionEn:
            "Keep NE around current rate while initiating Vasopressin 0.03 U/min; titrate NE +0.02–0.05 mcg/kg/min only if MAP stays low.",
          instructionVi:
            "Giữ tạm NE khi bắt đầu thêm Vasopressin 0.03 U/phút; chỉ tăng thêm NE 0.02–0.05 mcg/kg/phút nếu MAP vẫn chưa đạt.",
          rationaleEn: "Reduces catecholamine toxicity and atrial fibrillation risk.",
          rationaleVi: "Giảm độc tính catecholamin và nguy cơ rung nhĩ.",
        });
      } else {
        addAgentAction({
          drugId: "norepinephrine",
          currentDose: ne,
          unitLabel: "mcg/kg/min",
          action: "increase",
          titleEn: "Increase Norepinephrine",
          titleVi: "Tăng liều Norepinephrine",
          instructionEn:
            "Increase by 0.02–0.05 mcg/kg/min every 2–5 min until target MAP/CPP is achieved.",
          instructionVi:
            "Tăng thêm 0.02–0.05 mcg/kg/phút mỗi 2–5 phút đến khi đạt đích MAP/CPP.",
          rationaleEn: "First-line titratable pressor with rapid onset (1–2 min).",
          rationaleVi: "Thuốc vận mạch đầu tay, đáp ứng nhanh sau 1–2 phút.",
        });
      }
    }
    if (vaso > 0) {
      if (vaso < 0.03) {
        addAgentAction({
          drugId: "vasopressin",
          currentDose: vaso,
          unitLabel: "U/min",
          action: "increase",
          titleEn: "Increase Vasopressin to 0.03 U/min",
          titleVi: "Tăng Vasopressin lên 0.03 U/phút",
          instructionEn: "Step up to standard fixed dose of 0.03 U/min (max 0.04 U/min).",
          instructionVi: "Tăng lên liều chuẩn cố định 0.03 U/phút (tối đa 0.04 U/phút).",
          rationaleEn: "Restores V1 vascular tone in catecholamine-resistant shock.",
          rationaleVi: "Phục hồi trương lực mạch qua thụ thể V1 khi giảm đáp ứng catecholamin.",
        });
      } else {
        addAgentAction({
          drugId: "vasopressin",
          currentDose: vaso,
          unitLabel: "U/min",
          action: "maintain",
          titleEn: "Maintain Vasopressin Fixed Dose",
          titleVi: "Duy trì Vasopressin liều cố định",
          instructionEn:
            "Keep at 0.03–0.04 U/min; do not exceed 0.04 U/min routinely due to ischemic risk.",
          instructionVi:
            "Giữ ở mức 0.03–0.04 U/phút; không tăng quá 0.04 U/phút thường quy do nguy cơ thiếu máu tạng/chi.",
          rationaleEn: "Vasopressin is used as a fixed-dose adjunct, not high-dose monotherapy.",
          rationaleVi: "Vasopressin dùng liều cố định phối hợp, không đẩy liều cao đơn độc.",
        });
      }
    }
    if (epi > 0) {
      addAgentAction({
        drugId: "epinephrine",
        currentDose: epi,
        unitLabel: "mcg/kg/min",
        action: "increase",
        titleEn: "Titrate Epinephrine if Refractory",
        titleVi: "Tăng Epinephrine nếu sốc kháng trị",
        instructionEn:
          "Increase by 0.02–0.05 mcg/kg/min q5–15 min if MAP remains low; watch for tachycardia and lactic acidosis.",
        instructionVi:
          "Tăng 0.02–0.05 mcg/kg/phút mỗi 5–15 phút nếu MAP vẫn tụt; theo dõi nhịp nhanh và tăng lactat.",
        rationaleEn: "Provides combined α1 vasoconstriction and β1 inotropy.",
        rationaleVi: "Vừa co mạch α1 vừa tăng co bóp β1 trong sốc kháng trị.",
      });
    }
    if (dobut > 0) {
      addAgentAction({
        drugId: "dobutamine",
        currentDose: dobut,
        unitLabel: "mcg/kg/min",
        action: !input.perfusionOk || !lactateMet ? "increase" : "maintain",
        titleEn:
          !input.perfusionOk || !lactateMet
            ? "Optimize Dobutamine (Check Echo)"
            : "Maintain Dobutamine",
        titleVi:
          !input.perfusionOk || !lactateMet
            ? "Tối ưu Dobutamine (Siêu âm tim)"
            : "Duy trì Dobutamine",
        instructionEn:
          !input.perfusionOk || !lactateMet
            ? "If cardiac output is low on echo, increase by 2.5 mcg/kg/min q10–15 min (can lower SVR if hypovolemic)."
            : "Keep current rate while correcting MAP with vasopressors.",
        instructionVi:
          !input.perfusionOk || !lactateMet
            ? "Nếu siêu âm tim có cung lượng thấp, tăng 2.5 mcg/kg/phút mỗi 10–15 phút (lưu ý có thể gây giãn mạch nhẹ)."
            : "Giữ nguyên liều trong lúc nâng MAP bằng thuốc vận mạch.",
        rationaleEn: "Supports cardiac output without replacing α1 vasoconstriction.",
        rationaleVi: "Hỗ trợ cung lượng tim nhưng không thay thế thuốc co mạch α1.",
      });
    }
  } else if (actionVerdict === "wean") {
    // Prioritized weaning & stop-at-minimal-dose logic
    const hasHighPriorityPressor = epi > 0 || dopa > 0;
    if (epi > 0) {
      const canStop = epi <= 0.02;
      addAgentAction({
        drugId: "epinephrine",
        currentDose: epi,
        unitLabel: "mcg/kg/min",
        action: canStop ? "stop" : "wean",
        titleEn: canStop ? "Discontinue / Trial Off Epinephrine" : "Wean Epinephrine First",
        titleVi: canStop ? "Ngưng thử Epinephrine" : "Giảm Epinephrine trước tiên",
        instructionEn: canStop
          ? "Dose is minimal (≤ 0.02 mcg/kg/min). Stop Epinephrine and monitor MAP/HR q5–15 min."
          : "Decrease by 0.02–0.05 mcg/kg/min every 15–30 min until discontinued.",
        instructionVi: canStop
          ? "Liều đã tối thiểu (≤ 0.02 mcg/kg/phút). Có thể ngưng Epinephrine và theo dõi MAP/nhịp tim mỗi 5–15 phút."
          : "Giảm 0.02–0.05 mcg/kg/phút mỗi 15–30 phút đến khi ngừng hẳn.",
        rationaleEn:
          "Highest risk of tachyarrhythmia, myocardial O2 demand, and β2-mediated hyperlactatemia.",
        rationaleVi:
          "Nguy cơ gây nhịp nhanh loạn nhịp, tăng tiêu thụ oxy cơ tim và tăng lactat cao nhất.",
      });
      if (canStop) {
        regimenChanges.push({
          kind: "remove",
          severity: "ok",
          drugId: "epinephrine",
          titleEn: "Remove Epinephrine (At Minimal Dose)",
          titleVi: "Bỏ Epinephrine (Đã ở liều tối thiểu)",
          detailEn: "Epinephrine ≤ 0.02 mcg/kg/min with stable hemodynamics — ready to discontinue.",
          detailVi: "Epinephrine ≤ 0.02 mcg/kg/phút và huyết động ổn — có thể ngưng thuốc.",
        });
      }
    }
    if (dopa > 0) {
      const canStop = dopa <= 2;
      addAgentAction({
        drugId: "dopamine",
        currentDose: dopa,
        unitLabel: "mcg/kg/min",
        action: canStop ? "stop" : "wean",
        titleEn: canStop ? "Discontinue Dopamine" : "Wean Dopamine",
        titleVi: canStop ? "Ngưng Dopamine" : "Giảm liều Dopamine",
        instructionEn: canStop
          ? "Dose is minimal (≤ 2 mcg/kg/min). Stop Dopamine; avoid low-dose dopamine for renal protection."
          : "Decrease by 1–2 mcg/kg/min every 15–30 min as tolerated.",
        instructionVi: canStop
          ? "Liều đã tối thiểu (≤ 2 mcg/kg/phút). Ngưng Dopamine (không duy trì liều thấp để bảo vệ thận)."
          : "Giảm 1–2 mcg/kg/phút mỗi 15–30 phút theo đáp ứng huyết áp.",
        rationaleEn: "Minimizes chronotropic arrhythmia burden as vascular tone recovers.",
        rationaleVi: "Giảm nguy cơ rối loạn nhịp nhanh khi trương lực mạch hồi phục.",
      });
    }
    if (ne > 0) {
      const canStop = ne <= 0.03 && !hasHighPriorityPressor && (vaso === 0 || vaso <= 0.01);
      if (hasHighPriorityPressor) {
        addAgentAction({
          drugId: "norepinephrine",
          currentDose: ne,
          unitLabel: "mcg/kg/min",
          action: "maintain",
          titleEn: "Maintain Norepinephrine While Stopping Epi/Dopa",
          titleVi: "Giữ tạm Norepinephrine trong lúc cai Epi/Dopa",
          instructionEn:
            "Hold NE steady until Epinephrine/Dopamine are weaned off, then taper NE.",
          instructionVi:
            "Giữ nguyên NE cho đến khi cắt xong Epinephrine/Dopamine rồi mới giảm NE.",
          rationaleEn: "Avoids weaning multiple pressors simultaneously.",
          rationaleVi: "Tránh giảm đồng thời nhiều thuốc vận mạch gây tụt áp khó kiểm soát.",
        });
      } else {
        addAgentAction({
          drugId: "norepinephrine",
          currentDose: ne,
          unitLabel: "mcg/kg/min",
          action: canStop ? "stop" : "wean",
          titleEn: canStop
            ? "Discontinue / Trial Off Norepinephrine"
            : vaso > 0
            ? "Wean Norepinephrine First (Before Vasopressin)"
            : "Wean Norepinephrine",
          titleVi: canStop
            ? "Ngưng thử Norepinephrine"
            : vaso > 0
            ? "Giảm Norepinephrine trước (trước Vasopressin)"
            : "Giảm dần Norepinephrine",
          instructionEn: canStop
            ? "NE is at minimal dose (≤ 0.03 mcg/kg/min). Trial off and check MAP q5–15 min."
            : vaso > 0
            ? "Decrease NE by 0.02–0.05 mcg/kg/min q15–30 min until ≤ 0.05–0.1 mcg/kg/min while keeping Vasopressin steady."
            : "Decrease by 0.02–0.05 mcg/kg/min every 15–30 min while maintaining target MAP.",
          instructionVi: canStop
            ? "NE đã ở mức tối thiểu (≤ 0.03 mcg/kg/phút). Có thể ngưng thử và theo dõi MAP mỗi 5–15 phút."
            : vaso > 0
            ? "Giảm NE 0.02–0.05 mcg/kg/phút mỗi 15–30 phút đến ≤ 0.05–0.1 mcg/kg/phút trong khi giữ nguyên Vasopressin."
            : "Giảm 0.02–0.05 mcg/kg/phút mỗi 15–30 phút nếu MAP vẫn đạt đích.",
          rationaleEn:
            vaso > 0
              ? "Stopping Vasopressin while NE is moderate/high increases rebound hypotension; reduce catecholamine burden first."
              : "Short half-life (1–2 min) enables rapid bedside reassessment after each step-down.",
          rationaleVi:
            vaso > 0
              ? "Ngưng Vasopressin sớm khi NE còn cao dễ gây tụt huyết áp dội ngược; ưu tiên giảm catecholamin trước."
              : "Thời gian bán thải ngắn (1–2 phút) cho phép đánh giá nhanh sau mỗi bước giảm.",
        });
        if (canStop) {
          regimenChanges.push({
            kind: "remove",
            severity: "ok",
            drugId: "norepinephrine",
            titleEn: "Remove Norepinephrine (At Minimal Dose)",
            titleVi: "Ngưng Norepinephrine (Đã ở liều tối thiểu)",
            detailEn: "NE ≤ 0.03 mcg/kg/min and hemodynamically stable — trial off.",
            detailVi: "NE ≤ 0.03 mcg/kg/phút và huyết động ổn định — có thể ngưng thử.",
          });
        }
      }
    }
    if (vaso > 0) {
      const waitForNe = ne > 0.1 || hasHighPriorityPressor;
      const canStop = !waitForNe && vaso <= 0.01 && ne <= 0.03;
      addAgentAction({
        drugId: "vasopressin",
        currentDose: vaso,
        unitLabel: "U/min",
        action: waitForNe ? "maintain" : canStop ? "stop" : "wean",
        titleEn: waitForNe
          ? "Maintain Vasopressin Until NE ≤ 0.1"
          : canStop
          ? "Discontinue Vasopressin"
          : "Step-Down Vasopressin",
        titleVi: waitForNe
          ? "Giữ nguyên Vasopressin đến khi NE ≤ 0.1"
          : canStop
          ? "Ngưng Vasopressin"
          : "Giảm bậc Vasopressin",
        instructionEn: waitForNe
          ? "Keep Vasopressin steady while tapering Norepinephrine down to ≤ 0.05–0.1 mcg/kg/min."
          : canStop
          ? "Vasopressin is at 0.01 U/min with minimal/off NE. Discontinue and monitor MAP for 30–60 min."
          : "Decrease by 0.01 U/min every 30–60 min (0.03 → 0.02 → 0.01 → off).",
        instructionVi: waitForNe
          ? "Giữ cố định Vasopressin trong khi giảm dần Norepinephrine về ≤ 0.05–0.1 mcg/kg/phút."
          : canStop
          ? "Vasopressin đã ở mức 0.01 U/phút và NE tối thiểu/đã cắt. Ngưng thuốc và theo dõi MAP 30–60 phút."
          : "Giảm 0.01 U/phút mỗi 30–60 phút (0.03 → 0.02 → 0.01 → ngừng).",
        rationaleEn: "Gradual step-down prevents delayed rebound vasodilation (half-life 10–20 min).",
        rationaleVi: "Giảm bậc thang chậm tránh tụt huyết áp muộn (thời gian bán thải 10–20 phút).",
      });
    }
    if (dobut > 0) {
      const pressorsActive = ne > 0.05 || epi > 0 || vaso > 0 || dopa > 0;
      const canStop = !pressorsActive && dobut <= 2.5;
      addAgentAction({
        drugId: "dobutamine",
        currentDose: dobut,
        unitLabel: "mcg/kg/min",
        action: pressorsActive ? "maintain" : canStop ? "stop" : "wean",
        titleEn: pressorsActive
          ? "Maintain Dobutamine Until Pressors Minimal"
          : canStop
          ? "Discontinue Dobutamine"
          : "Wean Dobutamine Last",
        titleVi: pressorsActive
          ? "Giữ Dobutamine đến khi cắt/giảm hết vận mạch"
          : canStop
          ? "Ngưng Dobutamine"
          : "Cai Dobutamine sau cùng",
        instructionEn: pressorsActive
          ? "Keep Dobutamine steady until vasopressors are minimal or discontinued."
          : canStop
          ? "At minimal dose (≤ 2.5 mcg/kg/min). Stop and monitor ScvO2, lactate, and UOP."
          : "Decrease by 2.5 mcg/kg/min every 1–2 hours; monitor ScvO2, lactate, and UOP.",
        instructionVi: pressorsActive
          ? "Giữ nguyên Dobutamine cho đến khi các thuốc vận mạch đã ở mức tối thiểu hoặc ngừng."
          : canStop
          ? "Đã ở liều tối thiểu (≤ 2.5 mcg/kg/phút). Ngưng và theo dõi ScvO2, lactat, nước tiểu."
          : "Giảm 2.5 mcg/kg/phút mỗi 1–2 giờ; theo dõi ScvO2, lactat và nước tiểu.",
        rationaleEn: "Maintain inotropic support until vascular tone stabilizes.",
        rationaleVi: "Duy trì hỗ trợ co bóp cơ tim đến khi trương lực mạch ổn định.",
      });
    }
  } else {
    // maintain or caution_wean
    const activeList: Array<{ id: VasopressorId; dose: number; unit: string }> = [];
    if (ne > 0) activeList.push({ id: "norepinephrine", dose: ne, unit: "mcg/kg/min" });
    if (epi > 0) activeList.push({ id: "epinephrine", dose: epi, unit: "mcg/kg/min" });
    if (vaso > 0) activeList.push({ id: "vasopressin", dose: vaso, unit: "U/min" });
    if (dopa > 0) activeList.push({ id: "dopamine", dose: dopa, unit: "mcg/kg/min" });
    if (dobut > 0) activeList.push({ id: "dobutamine", dose: dobut, unit: "mcg/kg/min" });

    for (const item of activeList) {
      addAgentAction({
        drugId: item.id,
        currentDose: item.dose,
        unitLabel: item.unit,
        action: "maintain",
        titleEn: `Maintain ${VASOPRESSOR_CATALOG[item.id].shortLabel} at Current Rate`,
        titleVi: `Duy trì ${VASOPRESSOR_CATALOG[item.id].shortLabel} ở mức hiện tại`,
        instructionEn:
          actionVerdict === "caution_wean"
            ? "Keep current rate until ≥ 2h stability and euvolemia/source control are confirmed (or trial a minimal step-down only if MAP is well above target)."
            : "Do not reduce rate while perfusion/lactate criteria are unmet; reassess q30–60 min.",
        instructionVi:
          actionVerdict === "caution_wean"
            ? "Giữ nguyên tốc độ đến khi ổn định ≥ 2 giờ và chắc chắn đủ dịch/kiểm soát nguồn (chỉ thử giảm nhẹ nếu MAP cao hơn đích nhiều)."
            : "Chưa giảm liều khi lactat/tưới máu mô chưa đạt; đánh giá lại mỗi 30–60 phút.",
        rationaleEn: "Premature de-escalation risks recurrent shock and organ hypoperfusion.",
        rationaleVi: "Giảm liều sớm khi chưa ổn định dễ gây tái tụt huyết áp và thiếu máu cơ quan.",
      });
    }
  }

  return {
    readiness,
    actionVerdict,
    verdictTitleEn,
    verdictTitleVi,
    verdictSummaryEn,
    verdictSummaryVi,
    nee,
    mapStatus,
    computedCpp,
    checklist,
    agentActions,
    regimenChanges,
    orderedSteps,
    reboundFlagsEn,
    reboundFlagsVi,
  };
}
