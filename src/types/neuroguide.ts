import { SUBSPECIALTY_LIST, type SubspecialtyType } from "../constants/subspecialties.ts";

export { SUBSPECIALTY_LIST };
export type { SubspecialtyType };
export const NEUROLOGY_SUBSPECIALTIES = SUBSPECIALTY_LIST;

export type NormalizedTier = 1 | 2 | 3 | 4 | 5;

export interface NormalizedTierInfo {
  tier: NormalizedTier;
  label: string;
  badgeBg: string;
  textColor: string;
  borderColor: string;
  dotColor: string;
}

export const TIER_CONFIG: Record<NormalizedTier, NormalizedTierInfo> = {
  1: {
    tier: 1,
    label: "Tier 1: Strong Recommendation (Class I / Strong FOR)",
    badgeBg: "bg-emerald-500/15 dark:bg-emerald-500/25",
    textColor: "text-emerald-700 dark:text-emerald-400",
    borderColor: "border-emerald-500/40",
    dotColor: "bg-emerald-500",
  },
  2: {
    tier: 2,
    label: "Tier 2: Moderate / Conditional (Class IIa / Moderate Quality)",
    badgeBg: "bg-blue-500/15 dark:bg-blue-500/25",
    textColor: "text-blue-700 dark:text-blue-400",
    borderColor: "border-blue-500/40",
    dotColor: "bg-blue-500",
  },
  3: {
    tier: 3,
    label: "Tier 3: Weak / Optional (Class IIb / Low Quality)",
    badgeBg: "bg-amber-500/15 dark:bg-amber-500/25",
    textColor: "text-amber-700 dark:text-amber-400",
    borderColor: "border-amber-500/40",
    dotColor: "bg-amber-500",
  },
  4: {
    tier: 4,
    label: "Tier 4: Expert Consensus Statement (Good Practice)",
    badgeBg: "bg-purple-500/15 dark:bg-purple-500/25",
    textColor: "text-purple-700 dark:text-purple-400",
    borderColor: "border-purple-500/40",
    dotColor: "bg-purple-500",
  },
  5: {
    tier: 5,
    label: "Tier 5: Not Recommended / Harm (Class III / Strong AGAINST)",
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
  category: string; // e.g. "Reperfusion", "Blood Pressure", "Antithrombotics"
  topic: string;
  changeType: "NEW" | "UPGRADED" | "DOWNGRADED" | "REVISED" | "STANDARD";
  previousText?: string;
  currentText: string;
  previousGrade?: string; // 'Class IIb, Level B-R'
  currentGrade: string; // 'Class I, Level A'
  drivingTrials?: string[];
  voting?: string;
  cor?: string;
  loe?: string;
  strength?: string;
  quality?: string;
  picoNumber?: number | string;
  picoQuestion?: string;
  expertConsensusStatement?: string;
  pageNum?: number;
  approvalStatus?: "human_approved" | "ai_checked" | "needs_review" | "rejected";
  ontologyLabels?: RecommendationLabelOutput;
  v3Labels?: RecommendationV3Labels;
}

export interface RecommendationV3Labels {
  subspecialties: SubspecialtyType[];
  conditionIds: string[];
  domains: ("diagnosis" | "treatment" | "prevention")[];
  diagnosisTags: string[];
  timeWindowIds: string[];
  interventionTags: string[];
  direction: "recommended" | "conditional" | "harm";
  isFallbackCondition?: boolean;
  isExplicit?: boolean;
}

export type FullTextStatus = "FULL_TEXT_PARSED" | "ABSTRACT_ONLY" | "UNAVAILABLE";

export interface GuidelineDoc {
  id: string; // e.g. "aha-ais-2026", "eso-ais-2024"
  society: string; // "AHA/ASA" | "ESO" | "AAN" | "EAN" | "WSO" | "VN-MOH" | "NCS" | "ILAE" | "MDS" | "AHS" | "ECTRIMS" | "IDSA" | "AANEM";
  year: number;
  title: string;
  officialUrl: string;
  journalTarget: string;
  documentType: "Clinical Practice Guideline" | "Focused Update" | "Scientific Statement" | "Expert Consensus";
  publishDate: string; // ISO format "2026-05-07"
  subspecialty: SubspecialtyType;
  subspecialties?: SubspecialtyType[];
  previousVersionYear?: number;
  executiveSummary: string;
  executiveSummaryVi?: string; // Tóm tắt lâm sàng điều hành tiếng Việt
  topTakeaways?: string[]; // 10 Take-Home Messages từ văn bản gốc
  topTakeawaysSynthetic?: boolean; // Tự động suy luận khi văn bản gốc không có mục Takeaways tường minh
  allPracticeChanges: PracticeChangeDetail[];
  linkedScenarioIds: string[];
  fullTextStatus?: FullTextStatus;
  fullTextSource?: "PMC" | "EUROPE_PMC" | "OPEN_ACCESS_WEB";
  pmcid?: string;
  doi?: string;
  aiSynthesized?: boolean;
  synthesizedAt?: string;
  status?: "approved" | "pending" | "deleted" | string;
}

export interface RecommendationAtom {
  id: string;
  scenarioId: string; // Foreign key to ClinicalScenario
  guidelineDocId: string; // Foreign key to GuidelineDoc
  society: string; // 'AHA/ASA' | 'ESO' | 'AAN' | 'EAN' | 'WSO' | 'VN-MOH' | 'NCS' | 'ILAE' | 'MDS' | 'AHS' | 'ECTRIMS'
  year: number;
  originalGrade: string; // 'Class I, Level of Evidence A' or 'Strong for, High quality'
  normalizedTier: NormalizedTier; // 1-5
  recommendationText: string;
  eligibilityCriteria?: string;
  citedTrials: string[];
  isLatestForSociety: boolean;
  notes?: string;
}

export interface TemporalShift {
  society: GuidelineDoc["society"];
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
  title: string;
  titleEn?: string;
  subspecialty: SubspecialtyType;
  summary: string;
  keyTags: string[];
  statusBadge?: "PRACTICE_CHANGING" | "UPGRADED" | "NEW" | "ESTABLISHED";
  hasConfAlert?: boolean;
  confAlertText?: string;
  aiSynthesisAppraisal: {
    consensusLevel: "HIGH_CONCORDANCE" | "MODERATE_VARIATION" | "MAJOR_DIVERGENCE";
    whyGuidelinesDiffer?: string;
    whyTheyDiffer?: string;
    clinicalBottomLine: string;
    resourceDependency?: "Standard Care" | "Requires Advanced Perfusion/AI" | "Specialized Center Only";
    lastAppraisedAt?: string;
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
  publishedJournal?: string;
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
  id: string; // "esoc-2026", "isc-2026", "aan-2026", "wsc-2026"
  acronym: string; // "ESOC", "ISC", "AAN", "WSC"
  name: string;
  year: number;
  startDate: string; // ISO format "2026-10-22"
  endDate?: string; // ISO format "2026-10-25"
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

export type OntologyFacetId =
  | "condition"
  | "age_group"
  | "special_populations"
  | "phase"
  | "intervention_type"
  | "drug_or_procedure"
  | "time_window"
  | "outcome_target"
  | "direction";

export type ReviewReasonCode =
  | "label_not_in_ontology"
  | "ambiguous_population"
  | "direction_text_conflict"
  | "missing_context"
  | "multiple_interpretations"
  | "unlisted_drug_or_procedure"
  | "weak_evidence_span"
  | "other";

export interface FacetLabelItem {
  value: string;
  evidence_span: string | null;
  source: "text" | "parent_context" | null;
}

export interface RecommendationFacetLabels {
  condition: FacetLabelItem[];
  age_group: FacetLabelItem[];
  special_populations: FacetLabelItem[];
  phase: FacetLabelItem[];
  intervention_type: FacetLabelItem[];
  drug_or_procedure: FacetLabelItem[];
  time_window: FacetLabelItem[];
  outcome_target: FacetLabelItem[];
  direction: FacetLabelItem;
}

export interface RecommendationLabelInput {
  rec_id: string;
  society: string;
  guideline_id: string;
  section_path: string;
  parent_context: string;
  rec_number?: string | number | null;
  page?: number | null;
  text: string;
  cor?: string | null;
  loe?: string | null;
  strength_raw?: string | null;
  quality_raw?: string | null;
  change_type?: string | null;
}

export interface RecommendationLabelOutput {
  rec_id: string;
  ontology_version: string;
  labels: RecommendationFacetLabels;
  confidence: "high" | "medium" | "low";
  needs_review: boolean;
  review_reasons: ReviewReasonCode[];
  notes: string;
}

export interface ValidationIssue {
  code: string;
  msg: string;
}

export interface LabelValidationResult {
  status: "reject" | "needs_review" | "ai_checked" | "human_approved";
  errors: ValidationIssue[];
  reviews: ValidationIssue[];
  warnings: ValidationIssue[];
}

export type RecommendationRelationType =
  | "same_section"
  | "refers_to"
  | "same_pico"
  | "supersedes"
  | "qualifies"
  | "differs"
  | "supports_evidence";

export interface RecommendationRelation {
  src_rec_id: string;
  dst_rec_id: string;
  type: RecommendationRelationType;
  origin: "rule" | "ai" | "human";
  status: "approved" | "proposed" | "rejected";
  evidence_src?: string;
  evidence_dst?: string;
}

export interface PivotalTrialRecord {
  id: string; // e.g. "act-2022"
  acronym: string; // e.g. "AcT"
  title: string;
  year: number;
  journal: string;
  pmid?: string;
  doi?: string;
  officialUrl?: string;
  subspecialty: SubspecialtyType;
  evidenceSource: "PEER_REVIEWED_PUBLISHED" | "CONFERENCE_LATE_BREAKING";
  design: "Phase 3 RCT" | "Phase 2 RCT" | "Meta-Analysis" | "Prospective Registry";
  sampleSize?: number;
  pico: {
    population: string;
    intervention: string;
    comparator: string;
    timeWindow?: string;
  };
  primaryEndpoint: {
    metric: string;
    resultStats: string;
    verdict: "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "NON_INFERIOR";
  };
  safetyEndpoint: {
    sICH?: string;
    mortality90d?: string;
    note?: string;
  };
  bottomLine: string;
  ontologyTags: Partial<Record<OntologyFacetId, string[]>>;
  v3Tags?: {
    conditionIds: string[];
    domains: ("diagnosis" | "treatment" | "prevention")[];
    diagnosisTags?: string[];
    timeWindowIds?: string[];
    interventionTags: string[];
  };
  linkedScenarioIds?: string[];
}

export interface NavigatorQuery {
  searchText?: string;
  subspecialty?: SubspecialtyType | "all";
  subspecialties?: (SubspecialtyType | string)[];
  conditionId?: string | "all";
  conditionIds?: string[];
  domain?: "all" | "diagnosis" | "treatment" | "prevention";
  domains?: ("all" | "diagnosis" | "treatment" | "prevention")[];
  diagnosisTags?: string[];
  timeWindowId?: string | "all";
  interventionTags?: string[];
  directionFilter?: "all" | "recommended" | "conditional" | "harm";
  societies?: string[];
  facets?: Partial<Record<OntologyFacetId, string[]>>;
  excludeFacets?: Partial<Record<OntologyFacetId, string[]>>;
  includeAiChecked?: boolean;
  onlyPracticeChanges?: boolean;
  verificationFilter?: "all" | "approved" | "unlabeled_or_review";
}

export interface NeuroGuideBlobPayload {
  guidelines: GuidelineDoc[];
  conferences: ConferenceEvent[];
  scenarios: ClinicalScenario[];
  recommendationAtoms?: RecommendationAtom[];
  pivotalTrials?: PivotalTrialRecord[];
  customRecLabels?: Record<string, RecommendationLabelOutput>;
  deletedGuidelineIds?: string[];
  lastSyncedAt: string;
  source: string;
}
