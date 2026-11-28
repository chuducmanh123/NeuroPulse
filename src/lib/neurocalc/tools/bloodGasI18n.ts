export type BloodGasLang = "en" | "vi";
export type SampleType = "abg" | "pvbg" | "mvbg";
export type PressureUnit = "mmhg" | "kpa";
export type GlucoseUnit = "mgdl" | "mmol";
export type UreaUnit = "mmol" | "bun_mgdl";
export type AlbuminUnit = "gdl" | "gl";
export type PhosphateUnit = "mgdl" | "mmol";
export type ClinicalSeverity = "danger" | "warning" | "ok" | "info";

export function t(lang: BloodGasLang, en: string, vi: string): string {
  return lang === "vi" ? vi : en;
}

export interface SampleReferenceRange {
  id: SampleType;
  labelEn: string;
  labelVi: string;
  shortEn: string;
  shortVi: string;
  ph: [number, number];
  hPlus: [number, number];
  pco2MmHg: [number, number];
  po2MmHg: [number, number];
  hco3: [number, number];
  be: [number, number];
  so2: [number, number];
}

export const SAMPLE_REFERENCE_RANGES: Record<SampleType, SampleReferenceRange> = {
  abg: {
    id: "abg",
    labelEn: "Arterial (ABG)",
    labelVi: "Động mạch (ABG)",
    shortEn: "ABG",
    shortVi: "ABG",
    ph: [7.35, 7.45],
    hPlus: [35, 45],
    pco2MmHg: [35, 45],
    po2MmHg: [80, 100],
    hco3: [22, 26],
    be: [-2, 2],
    so2: [95, 100],
  },
  pvbg: {
    id: "pvbg",
    labelEn: "Peripheral VBG",
    labelVi: "Tĩnh mạch ngoại vi (pVBG)",
    shortEn: "pVBG",
    shortVi: "pVBG",
    ph: [7.31, 7.42],
    hPlus: [42, 48],
    pco2MmHg: [38, 52],
    po2MmHg: [28, 48],
    hco3: [19, 27],
    be: [-2, 2],
    so2: [65, 75],
  },
  mvbg: {
    id: "mvbg",
    labelEn: "Central / Mixed VBG",
    labelVi: "Tĩnh mạch trung tâm / Trộn",
    shortEn: "mVBG",
    shortVi: "mVBG",
    ph: [7.32, 7.36],
    hPlus: [42, 48],
    pco2MmHg: [44, 46],
    po2MmHg: [38, 42],
    hco3: [24, 30],
    be: [-2, 2],
    so2: [70, 80],
  },
};

export const KASSIRER_BLEICH_TABLE: Array<{ ph: string; hPlus: number }> = [
  { ph: "7.00", hPlus: 100 },
  { ph: "7.10", hPlus: 79 },
  { ph: "7.20", hPlus: 63 },
  { ph: "7.30", hPlus: 50 },
  { ph: "7.40", hPlus: 40 },
  { ph: "7.50", hPlus: 32 },
  { ph: "7.60", hPlus: 25 },
  { ph: "7.70", hPlus: 20 },
];

export const BLOODGAS_UI_TEXT = {
  backToTools: { en: "All Clinical Tools", vi: "Tất cả Công cụ Lâm sàng" },
  toolTitle: {
    en: "Blood Gas (ABG / VBG) Analyzer",
    vi: "Phân Tích Khí Máu (ABG / VBG)",
  },
  toolBadge: {
    en: "6-STEP CLINICAL CDS",
    vi: "PHÂN TÍCH 6 BƯỚC",
  },
  resetCase: { en: "Reset", vi: "Reset" },
  refsBtn: { en: "Refs & Formulas", vi: "Tham chiếu & Công thức" },
  closeBtn: { en: "Close", vi: "Đóng" },
  copyReport: { en: "Copy Report", vi: "Copy Kết quả" },
  copiedReport: { en: "Copied", vi: "Đã Copy" },
  printReport: { en: "Print", vi: "In" },
  sampleTypeLabel: { en: "Sample Source", vi: "Loại mẫu máu" },
  pressureUnitLabel: { en: "Gas Unit", vi: "Đơn vị khí" },
  coreHeader: { en: "Core Blood Gas Values", vi: "Chỉ số Khí máu Cốt lõi" },
  electrolytesHeader: {
    en: "Electrolytes & Metabolic Markers",
    vi: "Điện giải & Chuyển hóa",
  },
  extendedHeader: {
    en: "Extended (Osmolality, PO4, Hb/DO2 & Urine)",
    vi: "Mở rộng (ALTT, PO4, Hb/DO2 & Điện giải niệu)",
  },
  artefactsHeader: {
    en: "Pre-Analytical Artefacts Checklist",
    vi: "Sàng lọc Sai số Kỹ thuật Lấy mẫu",
  },
  enterCoreTitle: {
    en: "Enter Core Blood Gas Values",
    vi: "Nhập Chỉ số Khí máu Cốt lõi",
  },
  enterCoreHint: {
    en: "Provide at least pH, PCO2, and HCO3- (or tCO2) to run the 6-step interpretation.",
    vi: "Nhập tối thiểu pH, PCO2 và HCO3- (hoặc tCO2) để thực hiện phân tích 6 bước.",
  },
  part1Title: {
    en: "1. Overall Clinical Conclusion",
    vi: "1. Kết luận Tổng quát",
  },
  part2Title: {
    en: "2. Detailed 6-Step Analysis",
    vi: "2. Chi tiết Phân tích 6 Bước",
  },
  part3Title: {
    en: "Critical Red Flags",
    vi: "Cảnh báo Nguy cấp (Red Flags)",
  },
  part4Title: {
    en: "Clinical Etiology & Recommended Workup",
    vi: "Định hướng Lâm sàng & Cận lâm sàng Bổ sung",
  },
  jumpToResult: {
    en: "View Result",
    vi: "Xem Kết quả",
  },
  additionalGasHeader: {
    en: "Additional (tCO2, BE, Age, Temp)",
    vi: "Bổ sung (tCO2, BE, Tuổi, Nhiệt độ)",
  },
  step1Title: {
    en: "Step 1 · Authentication & Pre-Analytical Artefacts",
    vi: "Bước 1 · Xác thực Nội tại & Sai số Kỹ thuật",
  },
  step2Title: {
    en: "Step 2 · Oxygenation, Ventilation & Respiratory Failure (Track O)",
    vi: "Bước 2 · Oxy hóa máu, Thông khí & Phân loại Suy hô hấp (Track O)",
  },
  step34Title: {
    en: "Steps 3 & 4 · Acid-Base Primary Disorder, Coexistence & Compensation",
    vi: "Bước 3 & 4 · Rối loạn Nguyên phát, Phối hợp & Bù trừ",
  },
  step5Title: {
    en: "Step 5 · Deep Metabolic Analysis (Track A–B–C–E)",
    vi: "Bước 5 · Phân tích Chuyên sâu Chuyển hóa (Track A–B–C–E)",
  },
  noRedFlags: {
    en: "No immediate life-threatening blood gas or electrolyte red flags triggered from available values.",
    vi: "Chưa ghi nhận ngưỡng cảnh báo nguy cấp đe dọa tính mạng tức thì từ các chỉ số hiện có.",
  },
  privacyBadge: {
    en: "In-memory · Zero PHI stored",
    vi: "Chỉ lưu RAM · Không lưu hồ sơ",
  },
  refsModalTitle: {
    en: "Reference Ranges, Compensation Rules & Sources",
    vi: "Bảng Giá trị Tham chiếu, Công thức Bù trừ & Nguồn",
  },
  refsCitation: {
    en: "Sources: Ashfaq Hasan — Handbook of Blood Gas/Acid-Base Interpretation (2nd Ed., Springer 2013); Iain Hennessey & Alan Japp — Arterial Blood Gases Made Easy; Anil Mane; Mark Ranson.",
    vi: "Nguồn: Ashfaq Hasan — Handbook of Blood Gas/Acid-Base Interpretation (2nd Ed., Springer 2013); Iain Hennessey & Alan Japp; Anil Mane; Mark Ranson.",
  },
  disclaimer: {
    en: "Clinical Decision Support only. Always correlate blood gas values with clinical history, hemodynamics, ventilation settings, and institutional laboratory reference ranges.",
    vi: "Công cụ hỗ trợ quyết định lâm sàng. Luôn đối chiếu kết quả khí máu với bệnh sử, huyết động, thông số máy thở và khoảng tham chiếu của phòng xét nghiệm.",
  },
} as const;
