export const NEUROLOGY_SUBSPECIALTIES = [
  "All Subspecialties",
  "Stroke",
  "Neurocritical Care",
  "Epilepsy",
  "Dementia",
  "Neuroimmunology",
  "Neuromuscular",
  "Movement Disorders",
  "Headache & Pain",
  "CNS Infections",
  "Neuro-Oncology",
  "Other",
] as const;

export type SubspecialtyType = (typeof NEUROLOGY_SUBSPECIALTIES)[number];

export type NormalizedTier = 1 | 2 | 3 | 4 | 5;

export interface NormalizedTierInfo {
  tier: NormalizedTier;
  labelVi: string;
  labelEn: string;
  badgeBg: string;
  textColor: string;
  borderColor: string;
  dotColor: string;
}

export const TIER_CONFIG: Record<NormalizedTier, NormalizedTierInfo> = {
  1: {
    tier: 1,
    labelVi: "Khuyến cáo Mạnh (Class I / Strong)",
    labelEn: "Strong Recommendation",
    badgeBg: "bg-emerald-500/15 dark:bg-emerald-500/25",
    textColor: "text-emerald-700 dark:text-emerald-400",
    borderColor: "border-emerald-500/40",
    dotColor: "bg-emerald-500",
  },
  2: {
    tier: 2,
    labelVi: "Khuyến cáo Vừa / Có điều kiện (Class IIa / Moderate)",
    labelEn: "Moderate / Conditional",
    badgeBg: "bg-blue-500/15 dark:bg-blue-500/25",
    textColor: "text-blue-700 dark:text-blue-400",
    borderColor: "border-blue-500/40",
    dotColor: "bg-blue-500",
  },
  3: {
    tier: 3,
    labelVi: "Cân nhắc chọn lọc (Class IIb / Weak)",
    labelEn: "Weak / Optional",
    badgeBg: "bg-amber-500/15 dark:bg-amber-500/25",
    textColor: "text-amber-700 dark:text-amber-400",
    borderColor: "border-amber-500/40",
    dotColor: "bg-amber-500",
  },
  4: {
    tier: 4,
    labelVi: "Đồng thuận chuyên gia (Consensus / Good Practice)",
    labelEn: "Expert Consensus",
    badgeBg: "bg-purple-500/15 dark:bg-purple-500/25",
    textColor: "text-purple-700 dark:text-purple-400",
    borderColor: "border-purple-500/40",
    dotColor: "bg-purple-500",
  },
  5: {
    tier: 5,
    labelVi: "Không khuyến cáo / Chống chỉ định (Class III / Harm)",
    labelEn: "Not Recommended / Harm",
    badgeBg: "bg-rose-500/15 dark:bg-rose-500/25",
    textColor: "text-rose-700 dark:text-rose-400",
    borderColor: "border-rose-500/40",
    dotColor: "bg-rose-500",
  },
};

export interface EcosystemLink {
  app: "NeuroRx" | "NeuroCalc" | "NeuroVision" | "NeuroCase" | "NeuroPulse";
  href: string;
  label: string;
  badge?: string;
  description?: string;
}

export interface PracticeChangeDetail {
  id: string;
  scenarioId?: string;
  category: string; // VD: "Reperfusion", "Blood Pressure", "Antithrombotics"
  topic: string;
  changeType: "NEW" | "UPGRADED" | "DOWNGRADED" | "REVISED";
  previousText?: string;
  currentText: string;
  previousGrade?: string; // 'Class IIb, Level B-R'
  currentGrade: string; // 'Class I, Level A'
  drivingTrials?: string[];
}

export interface GuidelineDoc {
  id: string; // VD: "aha-ais-2026", "eso-ais-2024"
  society: "AHA/ASA" | "ESO" | "AAN" | "EAN" | "WSO" | "VN-MOH" | "NCS" | "ILAE";
  year: number;
  title: string;
  titleVi?: string;
  officialUrl: string;
  journalTarget: string;
  documentType: "Clinical Practice Guideline" | "Focused Update" | "Scientific Statement" | "Expert Consensus";
  publishDate: string; // ISO format "2026-02-15"
  previousVersionYear?: number;
  executiveSummaryVi: string;
  allPracticeChanges: PracticeChangeDetail[];
  linkedScenarioIds: string[];
}

export interface RecommendationAtom {
  id: string;
  scenarioId: string; // Khóa ngoại trỏ về ClinicalScenario
  guidelineDocId: string; // Khóa ngoại trỏ về GuidelineDoc
  society: "AHA/ASA" | "ESO" | "AAN" | "EAN" | "WSO" | "VN-MOH" | "NCS" | "ILAE";
  year: number;
  originalGrade: string; // 'Class I, Level A' hoặc 'Strong for, High'
  normalizedTier: NormalizedTier; // 1-5
  recommendationText: string;
  eligibilityCriteria?: string;
  citedTrials: string[];
  isLatestForSociety: boolean;
  notesVi?: string;
}

export interface TemporalShift {
  society: string;
  previousYear: number;
  previousGrade: string;
  currentYear: number;
  currentGrade: string;
  shiftDirection: "UPGRADED" | "DOWNGRADED" | "NEW" | "UNCHANGED" | "REVISED";
  drivingTrials: string[];
  evolutionNarrative: string;
}

export interface ClinicalScenario {
  id: string; // 'ais-ivt-tenecteplase-4.5h'
  titleVi: string;
  titleEn: string;
  subspecialty: SubspecialtyType;
  summaryVi: string;
  keyTags: string[];
  statusBadge?: "PRACTICE_CHANGING" | "UPGRADED" | "NEW" | "ESTABLISHED";
  hasConfAlert?: boolean;
  confAlertText?: string;
  aiSynthesisAppraisal: {
    consensusLevel: "HIGH_CONCORDANCE" | "MODERATE_VARIATION" | "MAJOR_DIVERGENCE";
    whyGuidelinesDiffer: string;
    clinicalBottomLine: string;
    resourceDependency?: "Standard Care" | "Requires Advanced Perfusion/AI" | "Specialized Center Only";
    lastAppraisedAt: string;
  };
  temporalEvolution?: TemporalShift[];
  ecosystemLinks?: EcosystemLink[];
}

export interface LateBreakingTrial {
  id: string;
  trialAcronym: string;
  title: string;
  studyDesign: "Phase 3 RCT" | "Phase 2 RCT" | "Prospective Registry" | "Meta-Analysis";
  subspecialty: SubspecialtyType;
  verdict: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  isPracticeChanging: boolean;
  publishedJournal?: "NEJM" | "Lancet" | "JAMA" | "Stroke" | "Eur Stroke J" | "Neurology";
  fullTextUrl?: string;
  populationSummary: string;
  interventionGroup: string;
  controlGroup: string;
  primaryOutcome: string;
  safetyOutcome: string;
  bottomLineTakeaway: string;
  impactedScenarioId?: string;
  guidelineImpactWarning?: string;
}

export interface ConferenceEvent {
  id: string; // "esoc-2026", "isc-2026", "aan-2026"
  acronym: string; // "ESOC", "ISC", "AAN"
  name: string;
  subspecialties: SubspecialtyType[];
  dates: string;
  location: string;
  status: "LIVE" | "RECENT" | "UPCOMING";
  officialUrl: string;
  executiveSummary: string;
  stats: {
    totalLateBreakingTrials: number;
    positiveTrials: number;
    practiceChangingCount: number;
  };
  lateBreakingTrials: LateBreakingTrial[];
}
