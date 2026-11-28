export type VasoLang = "en" | "vi";
export type VasopressorId =
  | "norepinephrine"
  | "epinephrine"
  | "dopamine"
  | "dobutamine"
  | "vasopressin";
export type AccessRoute = "cvc" | "piv";
export type NeuroTargetProfileId =
  | "septic"
  | "septic_elderly"
  | "sah_dci"
  | "cardiogenic";
export type DoseUnitMode = "mcg_kg_min" | "mcg_min" | "units_min";
export type ClinicalSeverity = "danger" | "warning" | "ok" | "info";

export function t(lang: VasoLang, en: string, vi: string): string {
  return lang === "vi" ? vi : en;
}

export interface PreparationPreset {
  id: string;
  labelEn: string;
  labelVi: string;
  drugAmount: number;
  drugAmountUnit: "mg" | "units";
  volumeMl: number;
  isDefault?: boolean;
  isVnSyringe?: boolean;
}

export interface VasopressorSpec {
  id: VasopressorId;
  neurorxSlug: string;
  nameEn: string;
  nameVi: string;
  tallMan: string;
  shortLabel: string;
  receptorProfile: string;
  roleEn: string;
  roleVi: string;
  defaultUnitMode: DoseUnitMode;
  supportsFixedMcgMin: boolean;
  typicalStart: number;
  typicalMin: number;
  typicalMax: number;
  highDoseThreshold: number;
  titrationStep: number;
  titrationIntervalEn: string;
  titrationIntervalVi: string;
  referenceDoses: number[];
  preferredDiluentEn: string;
  preferredDiluentVi: string;
  ySiteIncompatibleEn: string;
  ySiteIncompatibleVi: string;
  pivSafe: boolean;
  /** Max concentration (mcg/mL) for short-term peripheral IV; 0 = avoid PIV */
  maxPivConcMcgPerMl: number;
  presets: PreparationPreset[];
}

export const VASOPRESSOR_ORDER: VasopressorId[] = [
  "norepinephrine",
  "epinephrine",
  "vasopressin",
  "dopamine",
  "dobutamine",
];

export const VASOPRESSOR_CATALOG: Record<VasopressorId, VasopressorSpec> = {
  norepinephrine: {
    id: "norepinephrine",
    neurorxSlug: "norepinephrine",
    nameEn: "Norepinephrine (Noradrenaline)",
    nameVi: "Norepinephrine (Noradrenalin)",
    tallMan: "norepinephrine",
    shortLabel: "NE",
    receptorProfile: "α1 +++ · β1 ++ · β2 0",
    roleEn: "First-line vasopressor (SSC 2026, ACC 2025 CS, SAH DCI)",
    roleVi: "Vận mạch đầu tay (SSC 2026, ACC 2025 CS, co thắt mạch SAH)",
    defaultUnitMode: "mcg_kg_min",
    supportsFixedMcgMin: true,
    typicalStart: 0.05,
    typicalMin: 0.01,
    typicalMax: 1.0,
    highDoseThreshold: 0.25,
    titrationStep: 0.02,
    titrationIntervalEn: "q2–5 min",
    titrationIntervalVi: "mỗi 2–5 phút",
    referenceDoses: [0.05, 0.1, 0.2, 0.3, 0.5, 1.0],
    preferredDiluentEn: "D5W or D5NS preferred (protects against oxidation); 0.9% NaCl acceptable short-term.",
    preferredDiluentVi: "Ưu tiên Glucose 5% (D5W) hoặc D5NS (chống oxy hóa); NaCl 0.9% dùng được ngắn hạn.",
    ySiteIncompatibleEn: "Avoid alkaline solutions (sodium bicarbonate), aminophylline, phenytoin, thiopental, insulin (check Y-site).",
    ySiteIncompatibleVi: "Tránh dung dịch kiềm (Natri bicarbonat), aminophylline, phenytoin; kiểm tra tương kỵ chạc Y.",
    pivSafe: true,
    maxPivConcMcgPerMl: 32,
    presets: [
      {
        id: "ne-vn-4-50",
        labelEn: "4 mg / 50 mL (1 amp · 80 mcg/mL) [VN]",
        labelVi: "4 mg / 50 mL (1 ống · 80 mcg/mL) [VN]",
        drugAmount: 4,
        drugAmountUnit: "mg",
        volumeMl: 50,
        isDefault: true,
        isVnSyringe: true,
      },
      {
        id: "ne-vn-8-50",
        labelEn: "8 mg / 50 mL (2 amps · 160 mcg/mL) [VN]",
        labelVi: "8 mg / 50 mL (2 ống · 160 mcg/mL) [VN]",
        drugAmount: 8,
        drugAmountUnit: "mg",
        volumeMl: 50,
        isVnSyringe: true,
      },
      {
        id: "ne-vn-16-50",
        labelEn: "16 mg / 50 mL (4 amps · 320 mcg/mL) [VN]",
        labelVi: "16 mg / 50 mL (4 ống · 320 mcg/mL) [VN]",
        drugAmount: 16,
        drugAmountUnit: "mg",
        volumeMl: 50,
        isVnSyringe: true,
      },
      {
        id: "ne-intl-4-250",
        labelEn: "4 mg / 250 mL (16 mcg/mL · PIV-safe bag)",
        labelVi: "4 mg / 250 mL (16 mcg/mL · Túi pha loãng PIV)",
        drugAmount: 4,
        drugAmountUnit: "mg",
        volumeMl: 250,
      },
      {
        id: "ne-intl-8-250",
        labelEn: "8 mg / 250 mL (32 mcg/mL · Max PIV bag)",
        labelVi: "8 mg / 250 mL (32 mcg/mL · Túi PIV tối đa)",
        drugAmount: 8,
        drugAmountUnit: "mg",
        volumeMl: 250,
      },
    ],
  },
  epinephrine: {
    id: "epinephrine",
    neurorxSlug: "epinephrine",
    nameEn: "Epinephrine (Adrenaline)",
    nameVi: "Epinephrine (Adrenalin)",
    tallMan: "epinephrine",
    shortLabel: "Epi",
    receptorProfile: "α1 +++ · β1 +++ · β2 ++",
    roleEn: "3rd-line pressor (SSC 2026) or 1st-line option in septic shock + cardiac dysfunction",
    roleVi: "Vận mạch bậc 3 (SSC 2026) hoặc lựa chọn đầu tay nếu sốc nhiễm khuẩn kèm suy tim",
    defaultUnitMode: "mcg_kg_min",
    supportsFixedMcgMin: true,
    typicalStart: 0.05,
    typicalMin: 0.01,
    typicalMax: 2.0,
    highDoseThreshold: 0.2,
    titrationStep: 0.02,
    titrationIntervalEn: "q5–15 min",
    titrationIntervalVi: "mỗi 5–15 phút",
    referenceDoses: [0.02, 0.05, 0.1, 0.2, 0.5, 1.0],
    preferredDiluentEn: "D5W or 0.9% NaCl; protect from light; discard if pink/brown.",
    preferredDiluentVi: "Pha trong Glucose 5% hoặc NaCl 0.9%; tránh ánh sáng; bỏ nếu dung dịch đổi màu hồng/nâu.",
    ySiteIncompatibleEn: "Incompatible with sodium bicarbonate, aminophylline, ampicillin, furosemide.",
    ySiteIncompatibleVi: "Tương kỵ với Natri bicarbonat, aminophylline, ampicillin, furosemide.",
    pivSafe: true,
    maxPivConcMcgPerMl: 20,
    presets: [
      {
        id: "epi-vn-5-50",
        labelEn: "5 mg / 50 mL (5 amps · 100 mcg/mL) [VN]",
        labelVi: "5 mg / 50 mL (5 ống · 100 mcg/mL) [VN]",
        drugAmount: 5,
        drugAmountUnit: "mg",
        volumeMl: 50,
        isDefault: true,
        isVnSyringe: true,
      },
      {
        id: "epi-vn-10-50",
        labelEn: "10 mg / 50 mL (10 amps · 200 mcg/mL) [VN]",
        labelVi: "10 mg / 50 mL (10 ống · 200 mcg/mL) [VN]",
        drugAmount: 10,
        drugAmountUnit: "mg",
        volumeMl: 50,
        isVnSyringe: true,
      },
      {
        id: "epi-intl-4-250",
        labelEn: "4 mg / 250 mL (16 mcg/mL · PIV-safe bag)",
        labelVi: "4 mg / 250 mL (16 mcg/mL · Túi pha loãng PIV)",
        drugAmount: 4,
        drugAmountUnit: "mg",
        volumeMl: 250,
      },
    ],
  },
  vasopressin: {
    id: "vasopressin",
    neurorxSlug: "vasopressin",
    nameEn: "Vasopressin",
    nameVi: "Vasopressin",
    tallMan: "vasopressin",
    shortLabel: "Vaso",
    receptorProfile: "V1 +++ (vascular) · V2 ++ (renal)",
    roleEn: "2nd-line catecholamine-sparing adjunct (fixed 0.03 U/min in SSC 2026)",
    roleVi: "Phối hợp bậc 2 giảm catecholamin (liều cố định 0.03 U/phút theo SSC 2026)",
    defaultUnitMode: "units_min",
    supportsFixedMcgMin: false,
    typicalStart: 0.03,
    typicalMin: 0.01,
    typicalMax: 0.07,
    highDoseThreshold: 0.04,
    titrationStep: 0.01,
    titrationIntervalEn: "Fixed 0.03 U/min (or q10–15 min)",
    titrationIntervalVi: "Cố định 0.03 U/phút (hoặc mỗi 10–15 phút)",
    referenceDoses: [0.01, 0.02, 0.03, 0.04, 0.06, 0.07],
    preferredDiluentEn: "0.9% NaCl or D5W; stable 18 h at room temp / 24 h refrigerated.",
    preferredDiluentVi: "NaCl 0.9% hoặc Glucose 5%; ổn định 18 giờ ở nhiệt độ phòng / 24 giờ tủ mát.",
    ySiteIncompatibleEn: "Dedicated CVC lumen strongly preferred; avoid co-infusion with alkaline buffers.",
    ySiteIncompatibleVi: "Ưu tiên đường truyền trung tâm riêng; tránh truyền chung dung dịch kiềm.",
    pivSafe: false,
    maxPivConcMcgPerMl: 0,
    presets: [
      {
        id: "vaso-vn-20-50",
        labelEn: "20 U / 50 mL (1 amp · 0.4 U/mL) [VN]",
        labelVi: "20 U / 50 mL (1 ống · 0.4 U/mL) [VN]",
        drugAmount: 20,
        drugAmountUnit: "units",
        volumeMl: 50,
        isDefault: true,
        isVnSyringe: true,
      },
      {
        id: "vaso-vn-40-50",
        labelEn: "40 U / 50 mL (2 amps · 0.8 U/mL) [VN]",
        labelVi: "40 U / 50 mL (2 ống · 0.8 U/mL) [VN]",
        drugAmount: 40,
        drugAmountUnit: "units",
        volumeMl: 50,
        isVnSyringe: true,
      },
      {
        id: "vaso-intl-20-100",
        labelEn: "20 U / 100 mL (0.2 U/mL · Intl bag)",
        labelVi: "20 U / 100 mL (0.2 U/mL · Túi 100 mL)",
        drugAmount: 20,
        drugAmountUnit: "units",
        volumeMl: 100,
      },
    ],
  },
  dopamine: {
    id: "dopamine",
    neurorxSlug: "dopamine",
    nameEn: "Dopamine",
    nameVi: "Dopamine",
    tallMan: "DOPamine",
    shortLabel: "Dopa",
    receptorProfile: "D1/D2 (2–5) · β1 (5–10) · α1 (>10)",
    roleEn: "Reserve for symptomatic bradycardia / bradycardia-induced CS (avoid in sepsis · SSC 2026)",
    roleVi: "Chỉ định hẹp: nhịp chậm có triệu chứng / sốc tim do nhịp chậm (tránh trong nhiễm khuẩn · SSC 2026)",
    defaultUnitMode: "mcg_kg_min",
    supportsFixedMcgMin: false,
    typicalStart: 5,
    typicalMin: 2,
    typicalMax: 20,
    highDoseThreshold: 15,
    titrationStep: 2.5,
    titrationIntervalEn: "q5–10 min",
    titrationIntervalVi: "mỗi 5–10 phút",
    referenceDoses: [2, 5, 7.5, 10, 15, 20],
    preferredDiluentEn: "D5W or 0.9% NaCl; do NOT mix with alkaline solutions (sodium bicarbonate).",
    preferredDiluentVi: "Glucose 5% hoặc NaCl 0.9%; KHÔNG pha chung dung dịch kiềm (Natri bicarbonat).",
    ySiteIncompatibleEn: "Incompatible with sodium bicarbonate, acyclovir, alteplase, amphotericin B, furosemide.",
    ySiteIncompatibleVi: "Tương kỵ Natri bicarbonat, acyclovir, alteplase, amphotericin B, furosemide.",
    pivSafe: true,
    maxPivConcMcgPerMl: 1600,
    presets: [
      {
        id: "dopa-vn-200-50",
        labelEn: "200 mg / 50 mL (1 amp · 4,000 mcg/mL) [VN]",
        labelVi: "200 mg / 50 mL (1 ống · 4,000 mcg/mL) [VN]",
        drugAmount: 200,
        drugAmountUnit: "mg",
        volumeMl: 50,
        isDefault: true,
        isVnSyringe: true,
      },
      {
        id: "dopa-vn-400-50",
        labelEn: "400 mg / 50 mL (2 amps · 8,000 mcg/mL) [VN]",
        labelVi: "400 mg / 50 mL (2 ống · 8,000 mcg/mL) [VN]",
        drugAmount: 400,
        drugAmountUnit: "mg",
        volumeMl: 50,
        isVnSyringe: true,
      },
      {
        id: "dopa-intl-400-250",
        labelEn: "400 mg / 250 mL (1,600 mcg/mL · PIV bag)",
        labelVi: "400 mg / 250 mL (1,600 mcg/mL · Túi PIV)",
        drugAmount: 400,
        drugAmountUnit: "mg",
        volumeMl: 250,
      },
    ],
  },
  dobutamine: {
    id: "dobutamine",
    neurorxSlug: "dobutamine",
    nameEn: "Dobutamine",
    nameVi: "Dobutamine",
    tallMan: "DOBUTamine",
    shortLabel: "Dobut",
    receptorProfile: "β1 +++ · β2 + · α1 +/- (pure inotrope)",
    roleEn: "Inotrope for low CO / septic cardiac dysfunction (2–10 mcg/kg/min in ACC 2025 CS; excluded from NEE)",
    roleVi: "Tăng co bóp cơ tim (2–10 mcg/kg/phút theo ACC 2025 CS; suy tim nhiễm khuẩn; không tính vào NEE)",
    defaultUnitMode: "mcg_kg_min",
    supportsFixedMcgMin: false,
    typicalStart: 2.5,
    typicalMin: 1,
    typicalMax: 20,
    highDoseThreshold: 15,
    titrationStep: 2.5,
    titrationIntervalEn: "q10–15 min",
    titrationIntervalVi: "mỗi 10–15 phút",
    referenceDoses: [2.5, 5, 7.5, 10, 15, 20],
    preferredDiluentEn: "D5W or 0.9% NaCl; avoid alkaline diluents.",
    preferredDiluentVi: "Glucose 5% hoặc NaCl 0.9%; tránh dung dịch kiềm.",
    ySiteIncompatibleEn: "Incompatible with sodium bicarbonate, furosemide, heparin (conc-dependent), phenytoin.",
    ySiteIncompatibleVi: "Tương kỵ Natri bicarbonat, furosemide, heparin (tùy nồng độ), phenytoin.",
    pivSafe: true,
    maxPivConcMcgPerMl: 2000,
    presets: [
      {
        id: "dobut-vn-250-50",
        labelEn: "250 mg / 50 mL (1 vial · 5,000 mcg/mL) [VN]",
        labelVi: "250 mg / 50 mL (1 lọ · 5,000 mcg/mL) [VN]",
        drugAmount: 250,
        drugAmountUnit: "mg",
        volumeMl: 50,
        isDefault: true,
        isVnSyringe: true,
      },
      {
        id: "dobut-intl-250-250",
        labelEn: "250 mg / 250 mL (1,000 mcg/mL · PIV bag)",
        labelVi: "250 mg / 250 mL (1,000 mcg/mL · Túi PIV)",
        drugAmount: 250,
        drugAmountUnit: "mg",
        volumeMl: 250,
      },
      {
        id: "dobut-intl-500-250",
        labelEn: "500 mg / 250 mL (2,000 mcg/mL · Max PIV bag)",
        labelVi: "500 mg / 250 mL (2,000 mcg/mL · Túi PIV tối đa)",
        drugAmount: 500,
        drugAmountUnit: "mg",
        volumeMl: 250,
      },
    ],
  },
};

export interface NeuroTargetProfile {
  id: NeuroTargetProfileId;
  labelEn: string;
  labelVi: string;
  badge: string;
  minMap: number;
  maxMap?: number;
  usesCpp?: boolean;
  minCpp?: number;
  maxCpp?: number;
  noteEn: string;
  noteVi: string;
}

export const NEURO_TARGET_PROFILES: Record<NeuroTargetProfileId, NeuroTargetProfile> = {
  septic: {
    id: "septic",
    labelEn: "Septic Shock",
    labelVi: "Sốc nhiễm khuẩn",
    badge: "MAP ≥ 65",
    minMap: 65,
    noteEn: "SSC 2026: Initial target MAP 65 mmHg (±5 mmHg); norepinephrine first-line (start peripherally if no CVC).",
    noteVi: "SSC 2026: Đích MAP khởi đầu 65 mmHg (±5 mmHg); ưu tiên Norepinephrine đầu tay (có thể truyền PIV ngay).",
  },
  septic_elderly: {
    id: "septic_elderly",
    labelEn: "Septic Shock (Age ≥ 65)",
    labelVi: "Sốc nhiễm khuẩn (≥ 65 tuổi)",
    badge: "MAP 60–65",
    minMap: 60,
    maxMap: 65,
    noteEn: "SSC 2026: For adults ≥ 65 yrs, suggest initial MAP 60–65 mmHg over higher targets to limit vasopressor exposure.",
    noteVi: "SSC 2026: Với người bệnh ≥ 65 tuổi, gợi ý đích MAP 60–65 mmHg thay vì mức cao hơn để giảm gánh nặng vận mạch.",
  },
  sah_dci: {
    id: "sah_dci",
    labelEn: "SAH Vasospasm / DCI",
    labelVi: "Co thắt mạch SAH",
    badge: "MAP 90–110",
    minMap: 90,
    maxMap: 110,
    noteEn: "AHA/NCS: Induced hypertension (MAP 90–110 or +20–30%) until focal deficit resolves.",
    noteVi: "AHA/NCS: Tăng huyết áp chủ động (MAP 90–110 hoặc +20–30%) đến khi hết thiếu hụt thần kinh.",
  },
  cardiogenic: {
    id: "cardiogenic",
    labelEn: "Cardiogenic Shock",
    labelVi: "Sốc tim",
    badge: "MAP > 60–65 + CO",
    minMap: 60,
    noteEn: "ACC 2025 CS: Target MAP > 60–65 mmHg (NE 1st-line if hypotensive) at lowest dose/duration; add Dobutamine (2–10 mcg/kg/min) if hypoperfused; avoid Phenylephrine monotherapy.",
    noteVi: "ACC 2025 CS: Đích MAP > 60–65 mmHg (NE đầu tay nếu tụt HA) ở liều thấp nhất/ngắn nhất; thêm Dobutamine (2–10 mcg/kg/phút) nếu giảm tưới máu; tránh Phenylephrine đơn độc.",
  },
};

export const EXTRAVASATION_STEPS = {
  immediateEn: [
    "STOP the infusion immediately; DO NOT flush the catheter (leave catheter in place temporarily to aspirate residual drug).",
    "Disconnect tubing, gently aspirate 3–5 mL of blood/fluid through the catheter, then remove the IV cannula.",
    "Elevate the affected extremity and apply dry warm compresses (for catecholamines) or mark the border with a skin pen.",
  ],
  immediateVi: [
    "NGỪNG truyền ngay lập tức; KHÔNG bơm tráng catheter (giữ kim luồn tạm thời để hút dịch thuốc tồn dư).",
    "Tháo dây truyền, hút nhẹ 3–5 mL máu/dịch qua kim luồn rồi mới rút kim.",
    "Kê cao chi bị thoát mạch, chườm ấm khô (với catecholamin) và dùng bút khoanh vùng tổn thương để theo dõi.",
  ],
  antidoteEn:
    "Phentolamine 5–10 mg diluted in 10–15 mL 0.9% NaCl: infiltrate subcutaneously in a pinwheel pattern around the ischemic blanching border using a fine 25–27G needle within 12 hours (ideal < 1 hour). Alternatives if unavailable: topical 2% nitroglycerin ointment (1 inch) or SC terbutaline 1 mg in 10 mL 0.9% NaCl.",
  antidoteVi:
    "Phentolamine 5–10 mg pha trong 10–15 mL NaCl 0.9%: tiêm thấm dưới da hình nan hoa quanh viền vùng trắng bệch bằng kim nhỏ 25–27G trong vòng 12 giờ (tốt nhất < 1 giờ). Nếu không có Phentolamine: bôi mỡ Nitroglycerin 2% tại chỗ hoặc tiêm dưới da Terbutaline 1 mg pha 10 mL NaCl 0.9%.",
  vasopressinWarningEn:
    "VASOPRESSIN WARNING: Phentolamine (α-blocker) does NOT reverse V1-receptor vasoconstriction. Vasopressin extravasation carries severe ischemic necrosis risk — ALWAYS infuse via Central Venous Catheter (CVC).",
  vasopressinWarningVi:
    "CẢNH BÁO VASOPRESSIN: Phentolamine (chẹn α) KHÔNG đối kháng được co mạch qua thụ thể V1. Thoát mạch Vasopressin gây hoại tử thiếu máu nặng — BẮT BUỘC truyền qua Catheter tĩnh mạch trung tâm (CVC).",
};

export const VASO_REFERENCES = [
  {
    id: "kotani-2023",
    citation: "Kotani Y, Di Gioia A, Landoni G, Belletti A, Khanna AK. An updated \"norepinephrine equivalent\" score in intensive care as a marker of shock severity. Crit Care. 2023;27(1):29.",
  },
  {
    id: "gaies-2010",
    citation: "Gaies MG, Gurney JG, Yen AH, et al. Vasoactive-inotropic score as a predictor of morbidity and mortality in infants after cardiopulmonary bypass. Pediatr Crit Care Med. 2010;11(2):234-238.",
  },
  {
    id: "ssc-2026",
    citation: "Prescott HC, Antonelli M, Alhazzani W, et al. Surviving Sepsis Campaign: International Guidelines for Management of Sepsis and Septic Shock 2026. Crit Care Med. 2026;54(4):725-812.",
  },
  {
    id: "acc-2025-cs",
    citation: "Sinha SS, Morrow DA, Kapur NK, Kataria R, Roswell RO. 2025 Concise Clinical Guidance: An ACC Expert Consensus Statement on the Evaluation and Management of Cardiogenic Shock. J Am Coll Cardiol. 2025;85(16):1618-1641.",
  },
  {
    id: "neuro-targets",
    citation: "Hoh BL, Ko NU, Amin-Hanjani S, et al. 2023 Guideline for the Management of Patients With Aneurysmal Subarachnoid Hemorrhage: A Guideline From the American Heart Association/American Stroke Association. Stroke. 2023;54(7):e314-e370.",
  },
];

export const VASO_UI_TEXT = {
  backToTools: { en: "All Clinical Tools", vi: "Tất cả Công cụ" },
  toolTitle: {
    en: "Vasopressor & Inotrope Suite",
    vi: "Công cụ Vận mạch & Tăng co bóp",
  },
  toolBadge: { en: "ICU / NEUROCRITICAL CARE", vi: "HỒI SỨC / ĐỘT QUỴ" },
  lineSafetyBtn: {
    en: "Safety, Compatibility & Rescue",
    vi: "An toàn truyền, Tương kỵ & Thoát mạch",
  },
  refsBtn: { en: "Formulas & Refs", vi: "Công thức & Tài liệu" },
  resetBtn: { en: "Reset", vi: "Nhập lại" },
  weightLabel: { en: "Patient Weight", vi: "Cân nặng BN" },
  weightPlaceholder: { en: "e.g. 60", vi: "vd: 60" },
  targetProfileLabel: { en: "Hemodynamic Target", vi: "Đích huyết áp / tưới máu" },
  accessRouteLabel: { en: "Venous Access", vi: "Đường truyền" },
  cvcLabel: { en: "Central (CVC)", vi: "Trung tâm (CVC)" },
  pivLabel: { en: "Peripheral (PIV)", vi: "Ngoại biên (PIV)" },
  tabDrip: { en: "1. Infusion & NEE/VIS", vi: "1. Pha truyền & NEE/VIS" },
  tabNeeVis: { en: "2. NEE & VIS Score", vi: "2. Chỉ số NEE & VIS" },
  tabWean: { en: "2. Titrate & Wean", vi: "2. Chỉnh liều & Cai" },
};
