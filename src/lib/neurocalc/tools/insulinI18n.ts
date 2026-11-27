export type InsulinLang = "en" | "vi";
export type InsulinMode = "06h" | "18h" | "dka";
export type InsulinTimepoint = "t0" | "t1" | "t2" | "t4";
export type SyndromeLock = "auto" | "DKA" | "HHS" | "MIXED";
export type ClinicalSeverity = "danger" | "warning" | "ok" | "info";
export type GlucoseUnit = "mgdl" | "mmol";
export type UreaUnit = "mmol" | "bun_mgdl";

export function t(lang: InsulinLang, en: string, vi: string): string {
  return lang === "vi" ? vi : en;
}

export interface TimepointConfig {
  id: InsulinTimepoint;
  labelEn: string;
  labelVi: string;
  shortTime: string;
  subEn: string;
  subVi: string;
  clockHour?: number;
  dkaHour?: number;
  defaultDeltaH: number;
  hintEn: string;
  hintVi: string;
}

export const TIMEPOINT_CONFIGS: Record<InsulinMode, TimepointConfig[]> = {
  "06h": [
    {
      id: "t0",
      labelEn: "06:00 (Fasting)",
      labelVi: "06h00 (Trước ăn)",
      shortTime: "06:00",
      subEn: "Fasting",
      subVi: "Trước ăn",
      clockHour: 6.0,
      defaultDeltaH: 4.0,
      hintEn:
        "06:00 fasting: Evaluate pre-breakfast BG, determine morning NovoMix 30 / Actrapid dose, and review evening 18:00 adjustment.",
      hintVi:
        "Mốc 06h00: Đánh giá đường huyết đói, quyết định liều Novomix sáng / Actrapid và điều chỉnh cử chiều 18h.",
    },
    {
      id: "t1",
      labelEn: "08:30 (2h Post-Meal)",
      labelVi: "08h30 (Sau ăn)",
      shortTime: "08:30",
      subEn: "2h Post",
      subVi: "Sau ăn 2h",
      clockHour: 8.5,
      defaultDeltaH: 2.5,
      hintEn:
        "08:30 (2h post-breakfast): Calculate active IOB from 06:00 dose and manage early postprandial hypo- or hyperglycemia.",
      hintVi:
        "Mốc 08h30: Đánh giá sau ăn sáng 2h, tính toán IOB tồn lưu từ mũi 06h00 và xử trí nếu tăng/hạ đường huyết.",
    },
    {
      id: "t2",
      labelEn: "11:30 (Pre-Lunch)",
      labelVi: "11h30 (Trước trưa)",
      shortTime: "11:30",
      subEn: "Pre-Lunch",
      subVi: "Trước trưa",
      clockHour: 11.5,
      defaultDeltaH: 3.0,
      hintEn:
        "11:30 pre-lunch: Calculate correctional Actrapid (with IOB deduction) and evaluate morning regimen control.",
      hintVi:
        "Mốc 11h30: Đo trước bữa trưa, tính toán liều Actrapid hiệu chỉnh (có trừ IOB) và đánh giá đáp ứng mũi sáng.",
    },
  ],
  "18h": [
    {
      id: "t0",
      labelEn: "18:00 (Pre-Dinner)",
      labelVi: "18h00 (Trước tối)",
      shortTime: "18:00",
      subEn: "Pre-Dinner",
      subVi: "Trước tối",
      clockHour: 18.0,
      defaultDeltaH: 6.5,
      hintEn:
        "18:00 pre-dinner: Determine evening NovoMix 30 / Actrapid dose and set overnight safety monitoring.",
      hintVi:
        "Mốc 18h00: Đánh giá trước bữa tối, quyết định liều Novomix chiều / Actrapid và lịch canh đêm.",
    },
    {
      id: "t1",
      labelEn: "20:30 (2h Post-Dinner)",
      labelVi: "20h30 (Sau tối)",
      shortTime: "20:30",
      subEn: "2h Post",
      subVi: "Sau ăn 2h",
      clockHour: 20.5,
      defaultDeltaH: 2.5,
      hintEn:
        "20:30 (2h post-dinner): Estimate active IOB from 18:00 dose and guard against late evening hypoglycemia.",
      hintVi:
        "Mốc 20h30: Đánh giá sau ăn tối 2h, tính toán IOB tồn lưu từ mũi 18h00 và xử trí nếu tăng quá cao hoặc bỏ ăn.",
    },
    {
      id: "t2",
      labelEn: "22:00 (Bedtime)",
      labelVi: "22h00 (Trước ngủ)",
      shortTime: "22:00",
      subEn: "Bedtime",
      subVi: "Trước ngủ",
      clockHour: 22.0,
      defaultDeltaH: 4.0,
      hintEn:
        "22:00 bedtime safety check: Conservative nocturnal correction & trajectory check before Protamine peak.",
      hintVi:
        "Mốc 22h00: Chốt chặn trước ngủ — tính liều hiệu chỉnh đêm thận trọng & động học trước đỉnh Protamine.",
    },
    {
      id: "t4",
      labelEn: "02:00 (Midnight)",
      labelVi: "02h00 (Nửa đêm)",
      shortTime: "02:00",
      subEn: "Midnight",
      subVi: "Nửa đêm",
      clockHour: 2.0,
      defaultDeltaH: 4.0,
      hintEn:
        "02:00 midnight safety check: Differentiate Somogyi vs Dawn phenomenon and apply nocturnal rescue/protection.",
      hintVi:
        "Mốc 02h00: Kiểm tra an toàn nửa đêm, phân biệt hiệu ứng Somogyi / Bình minh và xử trí cứu vãn an toàn.",
    },
  ],
  dka: [
    {
      id: "t0",
      labelEn: "0–60 min (T0)",
      labelVi: "Giờ đầu (0–60p)",
      shortTime: "T0",
      subEn: "0–60m",
      subVi: "0–60p",
      dkaHour: 0.0,
      defaultDeltaH: 1.0,
      hintEn:
        "0–60 min (T0): Initial 0.9% NaCl resuscitation, potassium safety gate (< 3.5 locks FRIII), and DKA vs HHS stratification.",
      hintVi:
        "Mốc 0–60 phút (T0): Bù dịch NaCl 0.9% giờ đầu, kiểm tra K+ và phân tầng DKA vs HHS.",
    },
    {
      id: "t1",
      labelEn: "1–6h (T1)",
      labelVi: "60p–6 giờ (T1)",
      shortTime: "T1",
      subEn: "1–6h",
      subVi: "1–6h",
      dkaHour: 1.0,
      defaultDeltaH: 1.0,
      hintEn:
        "1–6 hours (T1): Track ketone clearance (≥ 0.5 mmol/L/h) or osmolality fall (3–8 mOsm/kg/h) and adjust FRIII.",
      hintVi:
        "Mốc 60p–6 giờ: Đánh giá tốc độ giảm Ceton (≥ 0.5 mmol/L/h) hoặc giảm ALTT (3–8 mOsm/kg/h).",
    },
    {
      id: "t2",
      labelEn: "6–12h (T2)",
      labelVi: "6–12 giờ (T2)",
      shortTime: "T2",
      subEn: "6–12h",
      subVi: "6–12h",
      dkaHour: 6.0,
      defaultDeltaH: 2.0,
      hintEn:
        "6–12 hours (T2): Maintain fluids + KCl; add 10% Dextrose 125 mL/h & halve FRIII to 0.05 u/kg/h once BG < 250 mg/dL.",
      hintVi:
        "Mốc 6–12 giờ: Duy trì dịch + KCl; khi BG < 250 mg/dL (< 14 mmol/L) mắc Glucose 10% 125 mL/h & giảm FRIII xuống 0.05.",
    },
    {
      id: "t4",
      labelEn: "12–24h+ (T4)",
      labelVi: "12–24 giờ+ (T4)",
      shortTime: "T4",
      subEn: "12–24h+",
      subVi: "12–24h+",
      dkaHour: 12.0,
      defaultDeltaH: 2.0,
      hintEn:
        "12–24h+ (T4): Verify DKA/HHS resolution criteria and overlap SC insulin 30–60 min before stopping FRIII.",
      hintVi:
        "Mốc 12–24 giờ+: Đánh giá tiêu chuẩn khỏi DKA/HHS và chuyển sang tiêm dưới da gối đầu (30–60 phút).",
    },
  ],
};

export const INSULIN_UI_TEXT = {
  backToTools: { en: "All Clinical Tools", vi: "Tất cả Công cụ Lâm sàng" },
  toolTitle: {
    en: "Insulin Dosing & DKA/HHS Titration",
    vi: "Điều Chỉnh Liều Insulin & Cấp Cứu DKA/HHS",
  },
  toolBadge: { en: "INPATIENT + ICU", vi: "NỘI TRÚ + CẤP CỨU" },
  resetCase: { en: "Reset New Case", vi: "Nhập Ca Mới" },
  safetyBtn: { en: "Safety & Refs", vi: "An toàn & Nguồn" },
  closeBtn: { en: "Close", vi: "Đóng" },
  modifiersHeader: { en: "Clinical Modifiers", vi: "Yếu tố lâm sàng kèm theo" },
  heroNovoLabel: { en: "NovoMix 30 SC", vi: "Novomix 30 SC" },
  heroActLabel: { en: "Actrapid SC", vi: "Actrapid SC" },
  heroNextCheckLabel: { en: "Next BG Check", vi: "Mốc thử ĐH kế" },
  heroFriiiLabel: { en: "IV FRIII Rate", vi: "Tốc độ BTE FRIII" },
  protaminePeakWarn: {
    en: "Protamine peak window (3.5–8.5h post-NovoMix ≥ 8 u) — monitor for delayed BG drop.",
    vi: "Đang trong cửa sổ đỉnh Protamine (3.5–8.5h sau Novomix ≥ 8 u) — đề phòng tụt đường muộn.",
  },
  modes: {
    "06h": { en: "1. Morning Shift 06:00", vi: "1. Trực Sáng 06h00" },
    "18h": { en: "2. Evening 18:00 & Night", vi: "2. Trực Chiều 18h00 & Đêm" },
    dka: { en: "3. DKA / HHS Emergency", vi: "3. Cấp Cứu DKA / HHS" },
  },
  modesShort: {
    "06h": { en: "Morning 06:00", vi: "Sáng 06h" },
    "18h": { en: "Evening & Night", vi: "Chiều & Đêm" },
    dka: { en: "DKA / HHS", vi: "DKA / HHS" },
  },
  paramsHeader: { en: "Patient Parameters", vi: "Thông Số Bệnh Nhân" },
  checkpointLabel: { en: "Checkpoint", vi: "Mốc giờ" },
  bgLabel: { en: "Blood Glucose", vi: "Đường huyết" },
  bgHiBadge: { en: "HI (≥800 mg/dL)", vi: "HI (≥800 mg/dL)" },
  weightLabel: { en: "Body Weight", vi: "Cân nặng" },
  naiveLabel: { en: "Insulin-Naïve", vi: "Chưa từng dùng Insulin" },
  naiveHint: {
    en: "Estimate TDD 0.4 u/kg (0.2 if high-risk), split 2/3 AM – 1/3 PM",
    vi: "Ước tính TDD 0.4 u/kg (0.2 nếu nguy cơ cao), chia 2/3 Sáng – 1/3 Chiều",
  },
  doseMornLabel: { en: "Morning NovoMix 30", vi: "Novomix 30 Sáng" },
  doseEveLabel: { en: "Evening NovoMix 30", vi: "Novomix 30 Chiều" },
  tddSummaryLabel: { en: "Effective TDD / ISF", vi: "TDD hiệu dụng / ISF" },
  highRiskLabel: { en: "High Hypoglycemia Risk", vi: "Nguy cơ hạ đường huyết cao" },
  highRiskHint: {
    en: "Age ≥ 65, eGFR < 45, liver failure, or poor PO intake (-20% protection)",
    vi: "≥ 65 tuổi, eGFR < 45, suy gan hoặc ăn kém (giảm 20% bảo vệ)",
  },
  syndromeLockLabel: { en: "Active Syndrome (T1+)", vi: "Chẩn đoán đã khóa (T1+)" },
  syndromeAuto: { en: "Auto-detect", vi: "Tự động phân tầng" },
  kLabel: { en: "Potassium (K+)", vi: "Kali máu (K+)" },
  naLabel: { en: "Sodium (Na+)", vi: "Natri máu (Na+)" },
  ureaLabel: { en: "Urea / BUN", vi: "Urea / BUN" },
  phLabel: { en: "Venous pH", vi: "pH tĩnh mạch" },
  hco3Label: { en: "Bicarbonate (HCO3-)", vi: "HCO3- máu" },
  ketoneLabel: { en: "Blood Ketones (β-OHB)", vi: "Ceton máu (β-OHB)" },
  plateauLabel: {
    en: "HHS Glucose Plateau (fluids alone stopped lowering BG)",
    vi: "HHS: Đường huyết đã ngừng giảm bằng dịch truyền (Plateau)",
  },
  euglycemicLabel: {
    en: "SGLT2i / Pregnancy / Known DM (Allow Euglycemic DKA)",
    vi: "Đang dùng SGLT2i / Thai kỳ / Đã biết ĐTĐ (Cho phép Euglycemic DKA)",
  },
  sbpLowLabel: {
    en: "Hypotension SBP < 90 mmHg (500 mL 0.9% NaCl bolus)",
    vi: "Huyết áp tâm thu < 90 mmHg (Bolus 500 mL NaCl 0.9%)",
  },
  oliguriaLabel: {
    en: "Oliguria (< 0.5 mL/kg/h) or Severe AKI/CKD (Block routine KCl)",
    vi: "Thiểu niệu (< 0.5 mL/kg/h) hoặc suy thận nặng (Chặn pha KCl thường quy)",
  },
  chfLabel: {
    en: "CHF / Frail Elderly / Age 18–25 (50% fluid rate reduction)",
    vi: "Suy tim / Cao tuổi suy yếu / 18–25 tuổi (Giảm 50% tốc độ dịch)",
  },
  confirmBtn: {
    en: "Confirm Parameters & Generate Orders",
    vi: "Xác Nhận Thông Số & Xuất Y Lệnh",
  },
  confirmedLive: {
    en: "Confirmed · Live auto-updating",
    vi: "Đã xác nhận · Tự động cập nhật",
  },
  logTitle: {
    en: "Shift Monitoring Log",
    vi: "Nhật Ký Ca Trực",
  },
  logPrivacyBadge: {
    en: "In-memory · clears on reload",
    vi: "Bộ nhớ tạm · xóa khi tải lại",
  },
  fillSuggested: { en: "Fill suggested", vi: "Điền liều gợi ý" },
  actualNovoLabel: { en: "Actual NovoMix (U)", vi: "Novomix thực tiêm (U)" },
  actualActLabel: { en: "Actual Actrapid (U)", vi: "Actrapid thực tiêm (U)" },
  actualIvLabel: { en: "Actual IV FRIII (U/h)", vi: "BTE Actrapid thực chạy (U/h)" },
  deltaTLabel: { en: "Elapsed from prior (Δt)", vi: "Khoảng cách từ mốc trước (Δt)" },
  hoursUnit: { en: "h", vi: "giờ" },
  saveSnapshot: { en: "Save Checkpoint", vi: "Lưu Mốc Theo Dõi" },
  clearHistory: { en: "Clear all", vi: "Xóa tất cả" },
  gateTitle: {
    en: "Awaiting Parameter Confirmation",
    vi: "Chờ Xác Nhận Thông Số Bệnh Nhân",
  },
  enterParamsTitle: {
    en: "Enter Patient Parameters",
    vi: "Nhập Thông Số Bệnh Nhân",
  },
  missingFieldsHint: {
    en: "Enter required parameters to generate orders:",
    vi: "Nhập đủ các thông số bắt buộc để xuất y lệnh:",
  },
  gateBody: {
    en: "Verify the patient's actual clinical values on the left before generating bedside orders to avoid acting on default placeholder numbers.",
    vi: "Vui lòng kiểm tra/nhập các chỉ số thực tế của bệnh nhân ở cột bên trái trước khi xuất y lệnh để tránh áp dụng nhầm thông số mặc định.",
  },
  gateBtn: {
    en: "Confirm Current Parameters",
    vi: "Xác Nhận Thông Số Hiện Tại",
  },
  copyEmr: { en: "Copy EMR", vi: "Copy Y Lệnh (EMR)" },
  copiedEmr: { en: "Copied to Clipboard", vi: "Đã Copy" },
  printOrder: { en: "Print", vi: "In Phiếu" },
  trajectoryTitle: {
    en: "Trajectory & Active Insulin-on-Board (IOB)",
    vi: "Động Học & Liều Tồn Lưu (IOB) Từ Mốc Trước",
  },
  dkaIndicesTitle: {
    en: "Biochemical Indices & Osmolality",
    vi: "Chỉ Số Sinh Hóa & Áp Lực Thẩm Thấu",
  },
  naCorrLabel: { en: "Corrected Na+ (Katz)", vi: "Na+ Hiệu Chỉnh (Katz)" },
  osmEffLabel: { en: "Effective Osm (2Na+BG)", vi: "ALTT Hiệu Dụng (2Na+BG)" },
  osmTotalLabel: { en: "Total Osm (+Urea)", vi: "ALTT Toàn Phần (+Urea)" },
  classificationLabel: { en: "Protocol Tier", vi: "Phân Tầng Phác Đồ" },
  pillars: {
    med: {
      en: "1. Acute Insulin Order (NovoMix 30 & Actrapid)",
      vi: "1. Y Lệnh Thuốc Cấp Thời (Novomix 30 & Actrapid)",
    },
    nutri: {
      en: "2. Nutrition & Meal-Relative Timing",
      vi: "2. Kế Hoạch Dinh Dưỡng & Thời Điểm Tiêm",
    },
    timeline: {
      en: "3. Next Blood Glucose Checkpoints",
      vi: "3. Mốc Giờ Xét Nghiệm Đường Huyết Tiếp Theo",
    },
    adj: {
      en: "4. Regimen Adjustment Recommendation",
      vi: "4. Khuyến Nghị Điều Chỉnh Phác Đồ",
    },
  },
  dkaAxes: {
    fluids: {
      en: "Axis 1: Fluid Resuscitation & Dextrose",
      vi: "Trục 1: Bồi Phụ Thể Tích Tuần Hoàn & Dextrose",
    },
    kAcid: {
      en: "Axis 2: Potassium (ADA/EASD) & Acid-Base",
      vi: "Trục 2: Bù Kali (ADA/EASD) & Kiểm Soát Toan Máu",
    },
    insulin: {
      en: "Axis 3: IV Insulin Infusion (FRIII) & Basal",
      vi: "Trục 3: Bơm Tiêm Điện Insulin (FRIII) & Insulin Nền",
    },
    monitoring: {
      en: "Axis 4: Kinetic Targets, Monitoring & SC Transition",
      vi: "Trục 4: Mục Tiêu Động Học, Theo Dõi & Chuyển Tiêm Dưới Da",
    },
  },
  switchTo18h: {
    en: "Switch to Evening SC Regimen (18:00)",
    vi: "Chuyển sang Phác đồ Tiêm Dưới Da (18h00)",
  },
  disclaimerTitle: {
    en: "Clinical Safety & High-Alert Medication Notice (ISMP)",
    vi: "Lưu Ý An Toàn Lâm Sàng & Thuốc Nguy Cơ Cao (ISMP)",
  },
  disclaimerBody: {
    en: "Insulin is an ISMP High-Alert Medication. Independently double-check vial concentration (100 units/mL), syringe-pump preparation (50 units in 50 mL 0.9% NaCl), serum potassium, and urine output before executing orders. Peripheral KCl supplementation is adjusted to 10–20 mmol/L where central line access is absent; FRIII is capped at 15.0 units/h (>150 kg) per JBDS 02. This CDS does not replace bedside clinical judgment.",
    vi: "Insulin là thuốc nguy cơ cao (ISMP). Bắt buộc kiểm tra chéo độc lập nồng độ lọ thuốc (100 units/mL), cách pha bơm tiêm điện (50 units trong 50 mL NaCl 0.9%), Kali máu và lượng nước tiểu trước khi thực hiện y lệnh. Pha KCl đường ngoại biên điều chỉnh 10–20 mmol/L; giới hạn trần FRIII 15.0 units/h (>150 kg) theo JBDS 02. Công cụ không thay thế phán đoán lâm sàng tại giường.",
  },
  referencesLabel: {
    en: "Protocol References: JBDS 02 (Mar 2023 Adult DKA) · JBDS 06 (Feb 2022 Adult HHS) · ADA/EASD/JBDS/AACE 2024 Hyperglycemic Crises Consensus · ADA Standards of Care 2026.",
    vi: "Tham chiếu phác đồ: JBDS 02 (03/2023 DKA người lớn) · JBDS 06 (02/2022 HHS người lớn) · Đồng thuận ADA/EASD/JBDS/AACE 2024 · ADA Standards of Care 2026.",
  },
} as const;
