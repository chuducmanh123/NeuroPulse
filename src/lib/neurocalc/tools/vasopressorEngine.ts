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
          "SSC 2021: Consider adding fixed-dose Vasopressin 0.03 U/min and IV Hydrocortisone 200 mg/day if ongoing ≥ 4 h.",
        detailVi:
          "SSC 2021: Cân nhắc phối hợp Vasopressin 0.03 U/phút và Hydrocortisone 200 mg/ngày TM nếu duy trì ≥ 4 giờ.",
      });
    }
    if (input.drugId === "dopamine") {
      const bandEn =
        weightNormalizedDose < 5
          ? "Low-dose band (<5 mcg/kg/min): D1/D2 predominant — NOT recommended for renal protection (SSC 2021)."
          : weightNormalizedDose <= 10
          ? "Intermediate band (5–10 mcg/kg/min): β1 inotropic/chronotropic predominant."
          : "High-dose band (>10 mcg/kg/min): α1 vasoconstriction predominant; high tachyarrhythmia risk.";
      const bandVi =
        weightNormalizedDose < 5
          ? "Dải liều thấp (<5 mcg/kg/phút): Ưu thế D1/D2 — KHÔNG dùng để bảo vệ thận (SSC 2021)."
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
      titleEn: "SSC 2021: Consider Adding Vasopressin 0.03 U/min",
      titleVi: "SSC 2021: Cân nhắc thêm Vasopressin 0.03 U/phút",
      detailEn:
        "Norepinephrine has reached ≥ 0.25 mcg/kg/min. Adding fixed-dose Vasopressin (0.03 U/min) reduces catecholamine burden instead of escalating NE alone.",
      detailVi:
        "Norepinephrine đã đạt ≥ 0.25 mcg/kg/phút. Thêm Vasopressin liều cố định 0.03 U/phút giúp giảm gánh nặng catecholamin thay vì tiếp tục tăng NE đơn độc.",
    });
  }
  if (nee >= 0.25) {
    escalationAlerts.push({
      severity: nee > 0.5 ? "danger" : "warning",
      titleEn: "SSC 2021: Stress-Dose Hydrocortisone (200 mg/day IV)",
      titleVi: "SSC 2021: Cân nhắc Hydrocortisone 200 mg/ngày TM",
      detailEn:
        "For ongoing vasopressor requirement (NEE ≥ 0.25 mcg/kg/min for ≥ 4 h), suggest IV Hydrocortisone 50 mg q6h or 200 mg/day continuous infusion.",
      detailVi:
        "Khi nhu cầu vận mạch kéo dài (NEE ≥ 0.25 mcg/kg/phút ≥ 4 giờ), cân nhắc Hydrocortisone 50 mg TM mỗi 6 giờ hoặc truyền liên tục 200 mg/ngày.",
    });
  }
  if (dopa > 0) {
    escalationAlerts.push({
      severity: "info",
      titleEn: "Dopamine Active — Review Indication",
      titleVi: "Đang dùng Dopamine — Rà soát chỉ định",
      detailEn:
        "SSC 2021 recommends norepinephrine over dopamine in septic shock due to higher tachyarrhythmia risk, unless patient has symptomatic bradycardia.",
      detailVi:
        "SSC 2021 khuyến cáo dùng Norepinephrine thay Dopamine trong sốc nhiễm khuẩn do nguy cơ loạn nhịp cao, trừ khi có nhịp chậm có triệu chứng.",
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

export interface WeaningCoachResult {
  readiness: "ready" | "caution" | "hold" | "no_agents";
  computedCpp: number | null;
  checklist: WeaningChecklistItem[];
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

  // Hemodynamic target check
  let mapTargetMet = false;
  if (profile.usesCpp) {
    if (computedCpp !== null && profile.minCpp !== undefined) {
      mapTargetMet = computedCpp >= profile.minCpp;
    } else if (
      typeof input.currentMap === "number" &&
      Number.isFinite(input.currentMap)
    ) {
      mapTargetMet = input.currentMap >= profile.minMap;
    }
  } else if (
    typeof input.currentMap === "number" &&
    Number.isFinite(input.currentMap)
  ) {
    mapTargetMet = input.currentMap >= profile.minMap;
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
  if (input.targetProfile === "sci") {
    reboundFlagsEn.push(
      "Acute SCI: Do not wean below MAP 85 mmHg within the first 5–7 days post-injury."
    );
    reboundFlagsVi.push(
      "Chấn thương tủy cấp: Không cai xuống dưới MAP 85 mmHg trong 5–7 ngày đầu sau chấn thương."
    );
  }

  if (!hasActive) {
    return {
      readiness: "no_agents",
      computedCpp,
      checklist,
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

  return {
    readiness,
    computedCpp,
    checklist,
    orderedSteps,
    reboundFlagsEn,
    reboundFlagsVi,
  };
}
