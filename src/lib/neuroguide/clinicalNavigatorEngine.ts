import type {
  GuidelineDoc,
  RecommendationAtom,
  ConferenceEvent,
  ClinicalScenario,
  NormalizedTier,
  OntologyFacetId,
  RecommendationLabelOutput,
  RecommendationV3Labels,
  RecommendationRelation,
  PivotalTrialRecord,
  NavigatorQuery,
  SubspecialtyType,
  EcosystemLink,
} from "../../types/neuroguide.ts";
import type { Article } from "../../types/article.ts";
import {
  STROKE_ONTOLOGY,
  toLabelerInput,
  autoLabelRecommendationVerbatim,
  validateLabelRecord,
  computeNormalizedTierFromGrade,
  sanitizeControlChars,
} from "./ontologyValidator.ts";
import {
  classifyRecommendationV3,
  classifyPivotalTrialV3,
} from "./clinicalNavigatorV3Classifier.ts";
import {
  toCanonicalTagId,
  toTimeWindowId,
  getTagLabelByIdV3,
  getConditionByIdV3,
} from "../../data/clinicalNavigatorTaxonomyV3.ts";
import { buildRecommendationRelations } from "./relationBuilder.ts";
import { mergePivotalTrialsWithConferences } from "../../data/pivotalTrialsSeed.ts";
import {
  generateIntraSocietyGuidelineDiffs,
  clusterAndAppraiseConsensus,
  type ConsensusTopicCluster,
} from "./picoMatcher.ts";

export type { ConsensusTopicCluster };

export interface IndexedNavigatorRecommendation {
  recId: string;
  guidelineId: string;
  guidelineTitle: string;
  officialUrl: string;
  society: string;
  year: number;
  subspecialty: SubspecialtyType;
  sectionPath: string;
  parentContext: string;
  picoNumber?: string | number;
  picoQuestion?: string;
  text: string;
  expertConsensusStatement?: string;
  rawGrade: string;
  cor?: string;
  loe?: string;
  strength?: string;
  quality?: string;
  voting?: string;
  normalizedTier: NormalizedTier;
  changeType: "NEW" | "UPGRADED" | "DOWNGRADED" | "REVISED" | "STANDARD";
  previousGrade?: string;
  previousText?: string;
  drivingTrials: string[];
  eligibilityCriteria?: string;
  labels: RecommendationLabelOutput;
  v3Labels: RecommendationV3Labels;
  validationStatus: "human_approved" | "ai_checked" | "needs_review" | "reject";
  isHumanLabeled: boolean;
  isUnlabeled: boolean;
  missingLabelReasons: string[];
  matchLayer?: "core" | "supporting";
  matchedSpans?: { facet: OntologyFacetId; value: string; labelEn: string; span: string }[];
}

export interface SocietyMatrixGroup {
  society: string;
  latestYear: number;
  yearsPresent: number[];
  coreRecommendations: IndexedNavigatorRecommendation[];
  supportingRecommendations: IndexedNavigatorRecommendation[];
  dominantDirection: string;
  highestTier: NormalizedTier;
}

export interface IntraSocietyDiffItem {
  id: string;
  society: string;
  guidelineTitle: string;
  topic: string;
  previousYear?: number;
  previousGrade: string;
  previousText?: string;
  currentYear: number;
  currentGrade: string;
  currentText: string;
  shiftDirection: "UPGRADED" | "DOWNGRADED" | "NEW" | "REVISED" | "UNCHANGED";
  drivingTrials: string[];
  sourceRecId: string;
}

export interface SocietyStanceSummary {
  society: string;
  latestYear: number;
  recCount: number;
  dominantDirection: "for" | "against" | "no_benefit" | "uncertain" | "mixed";
  highestTier: NormalizedTier;
  rawGradesSummary: string[];
}

export interface EvidenceConcordanceAppraisal {
  consensusLevel:
    | "HIGH_CONCORDANCE"
    | "MODERATE_VARIATION"
    | "MAJOR_DIVERGENCE"
    | "SINGLE_SOCIETY_EVIDENCE"
    | "NO_MATCHING_EVIDENCE";
  concordanceScore: number; // 0 - 100
  headline: string;
  societyStances: SocietyStanceSummary[];
  agreementPoints: string[];
  divergencePoints: string[];
  clinicalBottomLine: string;
  citedRecIds: string[];
  topicClusters?: ConsensusTopicCluster[];
}

export interface ScoredNeuroPulseArticle {
  article: Article;
  relevanceScore: number;
  matchReasons: string[];
}

export interface V3FilterCounts {
  subspecialties: Record<string, number>;
  conditions: Record<string, number>;
  domains: Record<string, number>;
  diagnosisTags: Record<string, number>;
  timeWindows: Record<string, number>;
  interventionTags: Record<string, number>;
  directions: Record<string, number>;
  unlabeledCount: number;
  approvedCount: number;
  aiCheckedCount: number;
}

export interface NavigatorQueryResult {
  query: NavigatorQuery;
  totalIndexedCount: number;
  unlabeledCount: number;
  approvedCount: number;
  coreRecommendations: IndexedNavigatorRecommendation[];
  supportingRecommendations: IndexedNavigatorRecommendation[];
  crossSocietyMatrix: SocietyMatrixGroup[];
  intraSocietyDiffs: IntraSocietyDiffItem[];
  pivotalTrials: PivotalTrialRecord[];
  lateBreakingTrials: PivotalTrialRecord[];
  concordanceAppraisal: EvidenceConcordanceAppraisal;
  relatedArticles: ScoredNeuroPulseArticle[];
  ecosystemLinks: EcosystemLink[];
  facetValueCounts: Record<OntologyFacetId, Record<string, number>>;
  v3Counts: V3FilterCounts;
  availableSocieties: string[];
}

export interface NavigatorQuickPreset {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  query: NavigatorQuery;
}

export const NAVIGATOR_QUICK_PRESETS: NavigatorQuickPreset[] = [
  {
    id: "preset-ais-ivt-tnk",
    title: "AIS IV Thrombolysis: Tenecteplase vs. Alteplase",
    subtitle: "Compare AHA/ASA, ESO & VN-MOH on 0.25 mg/kg TNK bolus vs. tPA within 4.5h",
    badge: "Practice-Changing",
    query: {
      subspecialty: "Stroke",
      conditionId: "cond_ischemic_stroke",
      domain: "treatment",
      timeWindowId: toTimeWindowId("cond_ischemic_stroke", "Early Window (≤ 4.5h)"),
      interventionTags: [toCanonicalTagId("Tenecteplase"), toCanonicalTagId("Alteplase")],
      includeAiChecked: true,
    },
  },
  {
    id: "preset-large-core-evt",
    title: "Endovascular Thrombectomy in Large Core & LVO",
    subtitle: "SELECT2, ANGEL-ASPECT, TENSION & AHA/ESO thrombectomy criteria",
    badge: "Upgraded Class I",
    query: {
      subspecialty: "Stroke",
      conditionId: "cond_ischemic_stroke",
      domain: "treatment",
      interventionTags: [toCanonicalTagId("Mechanical Thrombectomy")],
      includeAiChecked: true,
    },
  },
  {
    id: "preset-acute-bp-control",
    title: "Acute Blood Pressure Targets in Spontaneous ICH",
    subtitle: "INTERACT2, ATACH-2, INTERACT3 & AHA/ESO Hyperacute SBP 130–140 mmHg",
    badge: "Cross-Society",
    query: {
      subspecialty: "Stroke",
      conditionId: "cond_ich",
      domain: "treatment",
      interventionTags: [toCanonicalTagId("Blood Pressure Control")],
      includeAiChecked: true,
    },
  },
  {
    id: "preset-asah-management",
    title: "Aneurysmal SAH: Coiling, Clipping & Nimodipine",
    subtitle: "AHA/ASA 2023 vs. ESO/EANS/ESMINT 2026 aSAH Guidelines",
    badge: "AHA vs. ESO",
    query: {
      subspecialty: "Stroke",
      conditionId: "cond_sah",
      domain: "treatment",
      interventionTags: [
        toCanonicalTagId("Aneurysm Coiling"),
        toCanonicalTagId("Surgical Clipping"),
        toCanonicalTagId("Nimodipine"),
      ],
      includeAiChecked: true,
    },
  },
  {
    id: "preset-status-epilepticus-rse",
    title: "Status Epilepticus: ESETT & Refractory ICU Care",
    subtitle: "NCS & ILAE Stage 1–3 Benzodiazepines, Levetiracetam/Valproate & Ketamine/cEEG",
    badge: "Neurocritical Care",
    query: {
      subspecialty: "Neurocritical Care",
      conditionId: "cond_status_epilepticus",
      domain: "treatment",
      includeAiChecked: true,
    },
  },
  {
    id: "preset-alzheimer-anti-amyloid",
    title: "Alzheimer Disease: Lecanemab, Donanemab & ARIA Monitoring",
    subtitle: "AAN Practice Guidelines on Anti-Amyloid mAbs, ApoE4 & MRI Surveillance",
    badge: "Dementia",
    query: {
      subspecialty: "Dementia",
      conditionId: "cond_alzheimer",
      domain: "treatment",
      interventionTags: [
        toCanonicalTagId("Lecanemab"),
        toCanonicalTagId("Donanemab"),
        toCanonicalTagId("ARIA Monitoring"),
      ],
      includeAiChecked: true,
    },
  },
];

function getRecordFacetValues(labels: RecommendationLabelOutput, facetId: OntologyFacetId): string[] {
  const raw = labels.labels[facetId];
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((x) => x.value);
  }
  return [raw.value];
}

let _cachedIndexKey = "";
let _cachedIndexedRecs: IndexedNavigatorRecommendation[] = [];
let _cachedRelations: RecommendationRelation[] = [];

/**
 * Indexes all GuidelineDoc practice changes, canonical multi-subspecialty guidelines,
 * and standalone RecommendationAtoms into a unified V3.0-labeled array of atomic recommendations.
 */
export function indexAllGuidelineRecommendations(
  guidelines: GuidelineDoc[],
  recommendationAtoms: RecommendationAtom[] = [],
  customRecLabels: Record<string, RecommendationLabelOutput> = {}
): IndexedNavigatorRecommendation[] {
  const sig = `v3:${guidelines.length}:${guidelines.map((g) => `${g.id}-${g.allPracticeChanges?.length || 0}-${g.synthesizedAt || ""}`).join("|")}::${recommendationAtoms.length}`;
  if (sig === _cachedIndexKey && _cachedIndexedRecs.length > 0) {
    return _cachedIndexedRecs;
  }

  const indexed: IndexedNavigatorRecommendation[] = [];
  const seenRecIds = new Set<string>();
  const seenDocIds = new Set<string>();

  const combinedDocs: GuidelineDoc[] = [];
  for (const doc of guidelines) {
    if (doc && doc.id && !seenDocIds.has(doc.id)) {
      seenDocIds.add(doc.id);
      combinedDocs.push(doc);
    }
  }

  for (const doc of combinedDocs) {
    if (!doc || !Array.isArray(doc.allPracticeChanges)) continue;
    doc.allPracticeChanges.forEach((chg, idx) => {
      const inp = toLabelerInput(doc, chg, idx);
      if (!inp.text) return;
      const recId = inp.rec_id;
      if (seenRecIds.has(recId)) return;
      seenRecIds.add(recId);

      // Compute legacy structure only for internal relation builder compatibility; never shown as UI chips
      const labels = autoLabelRecommendationVerbatim(inp, STROKE_ONTOLOGY);
      const valRes = validateLabelRecord(inp, labels, STROKE_ONTOLOGY);

      const hasCustomHumanLabel = Boolean(customRecLabels && customRecLabels[recId]);
      const hasExplicitApproval = (chg.approvalStatus as string) === "human_approved" || (chg.approvalStatus as string) === "approved";
      const isHumanLabeled = hasCustomHumanLabel || hasExplicitApproval || Boolean(chg.v3Labels?.isExplicit);

      let validationStatus: IndexedNavigatorRecommendation["validationStatus"] = "ai_checked";
      if (valRes.status === "reject" || chg.approvalStatus === "rejected") {
        validationStatus = "reject";
      } else if (chg.approvalStatus === "needs_review") {
        validationStatus = "needs_review";
      } else if (isHumanLabeled) {
        validationStatus = "human_approved";
      } else {
        validationStatus = "ai_checked";
      }

      const tier = computeNormalizedTierFromGrade({
        cor: chg.cor,
        loe: chg.loe,
        strength: chg.strength,
        quality: chg.quality,
        currentGrade: chg.currentGrade,
        expertConsensusStatement: chg.expertConsensusStatement,
      });

      const v3Labels = classifyRecommendationV3(doc, chg, tier);

      const missingLabelReasons: string[] = [];
      if (v3Labels.isFallbackCondition) {
        missingLabelReasons.push("Chưa khớp điều kiện cụ thể (Dùng fallback theo chuyên khoa)");
      }
      if (v3Labels.interventionTags.length === 0 && v3Labels.diagnosisTags.length === 0) {
        missingLabelReasons.push("Chưa gắn nhãn can thiệp / chẩn đoán");
      }
      if (!isHumanLabeled) {
        missingLabelReasons.push("Chưa qua chuyên gia kiểm duyệt nhãn");
      }

      const isUnlabeled = Boolean(
        v3Labels.isFallbackCondition ||
        (v3Labels.interventionTags.length === 0 && v3Labels.diagnosisTags.length === 0) ||
        validationStatus === "needs_review"
      );

      indexed.push({
        recId,
        guidelineId: doc.id,
        guidelineTitle: sanitizeControlChars(doc.title),
        officialUrl: doc.officialUrl || "https://pubmed.ncbi.nlm.nih.gov/",
        society: doc.society || "AHA/ASA",
        year: doc.year || 2026,
        subspecialty: doc.subspecialty || "Stroke",
        sectionPath: inp.section_path,
        parentContext: inp.parent_context,
        picoNumber: chg.picoNumber,
        picoQuestion: chg.picoQuestion ? sanitizeControlChars(chg.picoQuestion) : undefined,
        text: inp.text,
        expertConsensusStatement: chg.expertConsensusStatement
          ? sanitizeControlChars(chg.expertConsensusStatement)
          : undefined,
        rawGrade: sanitizeControlChars(chg.currentGrade || "Standard Clinical Practice"),
        cor: chg.cor,
        loe: chg.loe,
        strength: chg.strength,
        quality: chg.quality,
        voting: chg.voting,
        normalizedTier: tier,
        changeType: chg.changeType || "STANDARD",
        previousGrade: chg.previousGrade ? sanitizeControlChars(chg.previousGrade) : undefined,
        previousText: chg.previousText ? sanitizeControlChars(chg.previousText) : undefined,
        drivingTrials: Array.isArray(chg.drivingTrials) ? chg.drivingTrials : [],
        labels,
        v3Labels,
        validationStatus,
        isHumanLabeled,
        isUnlabeled,
        missingLabelReasons,
        matchedSpans: [], // Legacy chips removed per V3.0 specification
      });
    });
  }

  // Also index standalone RecommendationAtoms only if the guideline actually exists in Practical Guidelines
  for (const atom of recommendationAtoms) {
    if (!atom || !atom.recommendationText) continue;
    const recId = atom.id;
    if (seenRecIds.has(recId)) continue;
    if (!atom.guidelineDocId || !seenDocIds.has(atom.guidelineDocId)) {
      // Do not create phantom/synthetic guideline documents
      continue;
    }
    seenRecIds.add(recId);

    const syntheticDoc: GuidelineDoc = {
      id: atom.guidelineDocId || `${atom.society.toLowerCase()}-${atom.year}`,
      society: atom.society,
      year: atom.year,
      title: `${atom.society} (${atom.year}) Clinical Practice Guideline`,
      officialUrl: "https://pubmed.ncbi.nlm.nih.gov/",
      journalTarget: atom.society,
      documentType: "Clinical Practice Guideline",
      publishDate: `${atom.year}-01-01`,
      subspecialty: "Stroke",
      executiveSummary: "",
      allPracticeChanges: [],
      linkedScenarioIds: [atom.scenarioId],
    };

    const syntheticChange = {
      id: atom.id,
      category: atom.scenarioId.replace(/-/g, " "),
      topic: atom.eligibilityCriteria || atom.scenarioId,
      changeType: "STANDARD" as const,
      currentText: atom.recommendationText,
      currentGrade: atom.originalGrade,
      drivingTrials: atom.citedTrials || [],
    };

    const inp = toLabelerInput(syntheticDoc, syntheticChange, 0);
    const labels = autoLabelRecommendationVerbatim(inp, STROKE_ONTOLOGY);
    const valRes = validateLabelRecord(inp, labels, STROKE_ONTOLOGY);
    if (valRes.status === "reject") continue;

    const tier = atom.normalizedTier || 1;
    const v3Labels = classifyRecommendationV3(syntheticDoc, syntheticChange, tier);

    indexed.push({
      recId,
      guidelineId: syntheticDoc.id,
      guidelineTitle: syntheticDoc.title,
      officialUrl: syntheticDoc.officialUrl,
      society: atom.society,
      year: atom.year,
      subspecialty: v3Labels.subspecialties[0] || "Stroke",
      sectionPath: inp.section_path,
      parentContext: inp.parent_context,
      text: inp.text,
      rawGrade: atom.originalGrade,
      normalizedTier: tier,
      changeType: "STANDARD",
      drivingTrials: atom.citedTrials || [],
      eligibilityCriteria: atom.eligibilityCriteria,
      labels,
      v3Labels,
      validationStatus: "human_approved",
      isHumanLabeled: true,
      isUnlabeled: false,
      missingLabelReasons: [],
      matchedSpans: [],
    });
  }

  _cachedIndexKey = sig;
  _cachedIndexedRecs = indexed;
  _cachedRelations = [];

  return indexed;
}

function getLazyRelations(indexed: IndexedNavigatorRecommendation[]): RecommendationRelation[] {
  if (_cachedRelations.length > 0 || indexed.length === 0) {
    return _cachedRelations;
  }
  _cachedRelations = buildRecommendationRelations(
    indexed.map((r) => ({
      recId: r.recId,
      guidelineId: r.guidelineId,
      society: r.society,
      year: r.year,
      sectionPath: r.sectionPath,
      picoNumber: r.picoNumber,
      text: r.text,
      normalizedTier: r.normalizedTier,
      labels: r.labels,
    }))
  );
  return _cachedRelations;
}

/**
 * Returns true if the user has selected any V3.0 filter, society, practice-change toggle, or right-pane search keyword (>= 2 chars).
 */
export function hasActiveNavigatorQuery(query: NavigatorQuery): boolean {
  if (query.searchText && query.searchText.trim().length >= 2) return true;
  if (query.subspecialty && query.subspecialty !== "all" && query.subspecialty !== "All Subspecialties") return true;
  if (query.conditionId && query.conditionId !== "all") return true;
  if (query.domain && query.domain !== "all") return true;
  if (query.diagnosisTags && query.diagnosisTags.length > 0) return true;
  if (query.timeWindowId && query.timeWindowId !== "all") return true;
  if (query.interventionTags && query.interventionTags.length > 0) return true;
  if (query.directionFilter && query.directionFilter !== "all") return true;
  if (query.societies && query.societies.length > 0) return true;
  if (query.onlyPracticeChanges) return true;
  for (const vals of Object.values(query.facets || {})) {
    if (Array.isArray(vals) && vals.length > 0) return true;
  }
  return false;
}

/**
 * Computes deterministic Evidence Concordance across societies from matched Core recommendations
 * by clustering around PICO Fingerprints.
 */
export function computeEvidenceConcordance(
  coreRecs: IndexedNavigatorRecommendation[]
): EvidenceConcordanceAppraisal {
  return clusterAndAppraiseConsensus(coreRecs);
}

/**
 * Executes a full V3.0 Dual-Primary Axis Clinical Navigator query across guidelines, pivotal trials, conferences, scenarios, and NeuroPulse articles.
 */
export function runClinicalNavigatorQuery(params: {
  guidelines: GuidelineDoc[];
  recommendationAtoms?: RecommendationAtom[];
  conferences?: ConferenceEvent[];
  scenarios?: ClinicalScenario[];
  customPivotalTrials?: PivotalTrialRecord[];
  customRecLabels?: Record<string, RecommendationLabelOutput>;
  neuroPulseArticles?: Article[];
  query: NavigatorQuery;
}): NavigatorQueryResult {
  const {
    guidelines,
    recommendationAtoms = [],
    conferences = [],
    scenarios = [],
    customPivotalTrials = [],
    customRecLabels = {},
    neuroPulseArticles = [],
    query,
  } = params;

  const includeAiChecked = query.includeAiChecked ?? true;
  const fullPool = indexAllGuidelineRecommendations(guidelines, recommendationAtoms, customRecLabels).filter(
    (r) => {
      if (r.validationStatus === "reject") return false;
      if (!includeAiChecked && r.validationStatus !== "human_approved") return false;
      return true;
    }
  );

  const availableSocieties = Array.from(new Set(fullPool.map((r) => r.society))).sort();

  let totalUnlabeled = 0;
  let totalApproved = 0;
  let totalAiChecked = 0;
  for (const r of fullPool) {
    if (r.isUnlabeled || r.validationStatus === "needs_review") totalUnlabeled++;
    if (r.validationStatus === "human_approved") totalApproved++;
    if (r.validationStatus === "ai_checked") totalAiChecked++;
  }

  // Compute V3.0 dynamic counts across the scoped pool
  const v3Counts: V3FilterCounts = {
    subspecialties: {},
    conditions: {},
    domains: {},
    diagnosisTags: {},
    timeWindows: {},
    interventionTags: {},
    directions: {},
    unlabeledCount: totalUnlabeled,
    approvedCount: totalApproved,
    aiCheckedCount: totalAiChecked,
  };

  for (const r of fullPool) {
    for (const sub of r.v3Labels.subspecialties) {
      v3Counts.subspecialties[sub] = (v3Counts.subspecialties[sub] || 0) + 1;
    }
    const matchesSub =
      !query.subspecialty ||
      query.subspecialty === "all" ||
      query.subspecialty === "All Subspecialties" ||
      r.v3Labels.subspecialties.includes(query.subspecialty);
    if (!matchesSub) continue;

    for (const cid of r.v3Labels.conditionIds) {
      v3Counts.conditions[cid] = (v3Counts.conditions[cid] || 0) + 1;
    }

    const matchesCond =
      !query.conditionId ||
      query.conditionId === "all" ||
      r.v3Labels.conditionIds.includes(query.conditionId);
    if (!matchesCond) continue;

    for (const dom of r.v3Labels.domains) {
      v3Counts.domains[dom] = (v3Counts.domains[dom] || 0) + 1;
    }
    for (const dt of r.v3Labels.diagnosisTags) {
      v3Counts.diagnosisTags[dt] = (v3Counts.diagnosisTags[dt] || 0) + 1;
    }
    for (const tw of r.v3Labels.timeWindowIds) {
      v3Counts.timeWindows[tw] = (v3Counts.timeWindows[tw] || 0) + 1;
    }
    for (const it of r.v3Labels.interventionTags) {
      v3Counts.interventionTags[it] = (v3Counts.interventionTags[it] || 0) + 1;
    }
    v3Counts.directions[r.v3Labels.direction] = (v3Counts.directions[r.v3Labels.direction] || 0) + 1;
  }

  const facetValueCounts: Record<OntologyFacetId, Record<string, number>> = {
    condition: {},
    age_group: {},
    special_populations: {},
    phase: {},
    intervention_type: {},
    drug_or_procedure: {},
    time_window: {},
    outcome_target: {},
    direction: {},
  };

  // Zero-Query Short-Circuit
  if (!hasActiveNavigatorQuery(query)) {
    return {
      query,
      totalIndexedCount: fullPool.length,
      unlabeledCount: totalUnlabeled,
      approvedCount: totalApproved,
      coreRecommendations: [],
      supportingRecommendations: [],
      crossSocietyMatrix: [],
      intraSocietyDiffs: [],
      pivotalTrials: [],
      lateBreakingTrials: [],
      concordanceAppraisal: computeEvidenceConcordance([]),
      relatedArticles: [],
      ecosystemLinks: [],
      facetValueCounts,
      v3Counts,
      availableSocieties,
    };
  }

  const relations = getLazyRelations(_cachedIndexedRecs);

  // Parse right-pane search text tokens
  const rawSearch = (query.searchText || "").trim();
  const searchLower = rawSearch.toLowerCase();
  const searchTokens = searchLower
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

  // Legacy facet compatibility (if any legacy callers pass `query.facets`)
  const activeFacetEntries = Object.entries(query.facets || {}).filter(
    ([, arr]) => Array.isArray(arr) && arr.length > 0
  ) as [OntologyFacetId, string[]][];
  const excludeFacetEntries = Object.entries(query.excludeFacets || {}).filter(
    ([, arr]) => Array.isArray(arr) && arr.length > 0
  ) as [OntologyFacetId, string[]][];

  const reqSubspecialty =
    query.subspecialty && query.subspecialty !== "all" && query.subspecialty !== "All Subspecialties"
      ? query.subspecialty
      : undefined;
  const reqConditionId =
    query.conditionId && query.conditionId !== "all" ? query.conditionId : undefined;
  const reqDomain = query.domain && query.domain !== "all" ? query.domain : undefined;
  const reqDiagTags = query.diagnosisTags || [];
  const reqTimeWindowId =
    query.timeWindowId && query.timeWindowId !== "all" ? query.timeWindowId : undefined;
  const reqInterventions = query.interventionTags || [];
  const reqDirection =
    query.directionFilter && query.directionFilter !== "all" ? query.directionFilter : undefined;

  const coreRecommendations: IndexedNavigatorRecommendation[] = [];
  const coreRecIdSet = new Set<string>();

  for (const rec of fullPool) {
    // 1. Axis 1: Subspecialty & Canonical Condition (supports Multi-Parent `cond_lbd` and `cond_paraneoplastic`)
    if (reqSubspecialty && !rec.v3Labels.subspecialties.includes(reqSubspecialty)) {
      continue;
    }
    if (reqConditionId && !rec.v3Labels.conditionIds.includes(reqConditionId)) {
      continue;
    }

    // 2. Axis 2: Clinical Domain & Domain Sub-filters (Section 5.2 Boolean Algebra)
    if (reqDomain && !rec.v3Labels.domains.includes(reqDomain)) {
      continue;
    }

    if (reqDiagTags.length > 0) {
      if (!reqDiagTags.some((dt) => rec.v3Labels.diagnosisTags.includes(dt))) {
        continue;
      }
    }

    if (reqTimeWindowId) {
      // AND relationship: When Time Window is selected, recommendations must match the selected time window
      const hasSpecificWindow = rec.v3Labels.timeWindowIds.includes(reqTimeWindowId);
      const textMentionsWindow = rec.text
        .toLowerCase()
        .includes(getTagLabelByIdV3(reqTimeWindowId).toLowerCase().split("(")[0].trim());
      if (!hasSpecificWindow && !textMentionsWindow) {
        continue;
      }
    }

    if (reqInterventions.length > 0) {
      // OR across selected intervention tags (Cross-Domain Single Label ID works across Treatment, Prevention, or All)
      if (!reqInterventions.some((it) => rec.v3Labels.interventionTags.includes(it))) {
        continue;
      }
    }

    // 3. Secondary Filters: Direction / Harm, Society, Practice Changes
    if (reqDirection && rec.v3Labels.direction !== reqDirection) {
      continue;
    }
    if (query.societies && query.societies.length > 0 && !query.societies.includes(rec.society)) {
      continue;
    }
    if (query.onlyPracticeChanges && rec.changeType === "STANDARD") {
      continue;
    }
    if (query.verificationFilter === "approved" && rec.validationStatus !== "human_approved") {
      continue;
    }
    if (query.verificationFilter === "unlabeled_or_review" && !rec.isUnlabeled && rec.validationStatus === "human_approved") {
      continue;
    }

    // 4. Legacy facet compatibility (if passed)
    if (excludeFacetEntries.length > 0) {
      let excluded = false;
      for (const [exFid, exVals] of excludeFacetEntries) {
        const recVals = getRecordFacetValues(rec.labels, exFid);
        if (exVals.some((v) => recVals.includes(v))) {
          excluded = true;
          break;
        }
      }
      if (excluded) continue;
    }
    if (activeFacetEntries.length > 0) {
      let matchesAllFacets = true;
      for (const [fid, requiredVals] of activeFacetEntries) {
        const recVals = getRecordFacetValues(rec.labels, fid);
        if (!requiredVals.some((v) => recVals.includes(v))) {
          matchesAllFacets = false;
          break;
        }
      }
      if (!matchesAllFacets) continue;
    }

    // 5. Right-Pane Content Search Bar (AND with Left-Pane Filters)
    if (searchTokens.length > 0) {
      const v3TagLabels = [
        ...rec.v3Labels.conditionIds.map((cid) => getConditionByIdV3(cid)?.label || ""),
        ...rec.v3Labels.diagnosisTags.map((id) => getTagLabelByIdV3(id)),
        ...rec.v3Labels.timeWindowIds.map((id) => getTagLabelByIdV3(id)),
        ...rec.v3Labels.interventionTags.map((id) => getTagLabelByIdV3(id)),
      ].join(" ");
      const hay = `${rec.text} ${rec.sectionPath} ${rec.parentContext} ${rec.guidelineTitle} ${rec.rawGrade} ${rec.society} ${rec.drivingTrials.join(" ")} ${v3TagLabels}`.toLowerCase();
      if (!searchTokens.every((tok) => hay.includes(tok))) {
        continue;
      }
    }

    const enriched: IndexedNavigatorRecommendation = {
      ...rec,
      matchLayer: "core",
      matchedSpans: [],
    };
    coreRecommendations.push(enriched);
    coreRecIdSet.add(rec.recId);
  }

  // Sort Core recommendations: latest year & strongest tier first
  coreRecommendations.sort(
    (a, b) => a.normalizedTier - b.normalizedTier || b.year - a.year || a.society.localeCompare(b.society)
  );

  // Supporting recommendations via approved relations
  const supportingRecIds = new Set<string>();
  for (const rel of relations) {
    if (coreRecIdSet.has(rel.src_rec_id) && !coreRecIdSet.has(rel.dst_rec_id)) {
      supportingRecIds.add(rel.dst_rec_id);
    } else if (coreRecIdSet.has(rel.dst_rec_id) && !coreRecIdSet.has(rel.src_rec_id)) {
      supportingRecIds.add(rel.src_rec_id);
    }
  }

  const supportingRecommendations = fullPool
    .filter((r) => supportingRecIds.has(r.recId))
    .slice(0, 18)
    .map((r) => ({ ...r, matchLayer: "supporting" as const, matchedSpans: [] }));

  // Group Core & Supporting by Society for Cross-Society Matrix
  const socMap = new Map<string, SocietyMatrixGroup>();
  for (const rec of coreRecommendations) {
    const existing = socMap.get(rec.society);
    const domDir =
      rec.v3Labels.direction === "harm"
        ? "against"
        : rec.v3Labels.direction === "conditional"
        ? "uncertain"
        : "for";
    if (!existing) {
      socMap.set(rec.society, {
        society: rec.society,
        latestYear: rec.year,
        yearsPresent: [rec.year],
        coreRecommendations: [rec],
        supportingRecommendations: [],
        dominantDirection: domDir,
        highestTier: rec.normalizedTier,
      });
    } else {
      existing.coreRecommendations.push(rec);
      if (rec.year > existing.latestYear) existing.latestYear = rec.year;
      if (!existing.yearsPresent.includes(rec.year)) existing.yearsPresent.push(rec.year);
      if (rec.normalizedTier < existing.highestTier) existing.highestTier = rec.normalizedTier;
    }
  }
  for (const sRec of supportingRecommendations) {
    const grp = socMap.get(sRec.society);
    if (grp) {
      grp.supportingRecommendations.push(sRec);
    }
  }

  const SOCIETY_PRIORITY = ["AHA/ASA", "ESO", "VN-MOH", "AAN", "EAN", "NCS", "ILAE", "MDS"];
  const crossSocietyMatrix = Array.from(socMap.values()).sort((a, b) => {
    const idxA = SOCIETY_PRIORITY.findIndex((s) => a.society.toUpperCase().includes(s));
    const idxB = SOCIETY_PRIORITY.findIndex((s) => b.society.toUpperCase().includes(s));
    if (idxA !== -1 && idxB !== -1 && idxA !== idxB) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return b.coreRecommendations.length - a.coreRecommendations.length;
  });

  // Build Intra-Society Sequential Guideline Diffs via semantic PICO Fingerprint pairing
  const intraSocietyDiffs = generateIntraSocietyGuidelineDiffs(coreRecommendations, fullPool);
  const seenDiffIds = new Set<string>(intraSocietyDiffs.map((d) => d.id));

  // Match ClinicalScenarios for ecosystemLinks & temporalEvolution
  const activeTagLabelsLower = new Set<string>([
    ...reqInterventions.map((id) => getTagLabelByIdV3(id).toLowerCase()),
    ...coreRecommendations.slice(0, 10).flatMap((r) =>
      r.v3Labels.interventionTags.map((id) => getTagLabelByIdV3(id).toLowerCase())
    ),
  ]);

  const matchedEcosystemLinks: EcosystemLink[] = [];
  const seenEcoLabels = new Set<string>();

  for (const sc of scenarios) {
    const scText = `${sc.id} ${sc.title} ${sc.keyTags.join(" ")}`.toLowerCase();
    const matchesTag = Array.from(activeTagLabelsLower).some((lbl) => lbl.length >= 3 && scText.includes(lbl));
    const matchesSearch = searchLower.length >= 3 && scText.includes(searchLower);
    if (matchesTag || matchesSearch) {
      for (const ev of sc.temporalEvolution || []) {
        const diffId = `sc-evol-${sc.id}-${ev.society}-${ev.currentYear}`;
        if (!seenDiffIds.has(diffId)) {
          seenDiffIds.add(diffId);
          intraSocietyDiffs.push({
            id: diffId,
            society: ev.society,
            guidelineTitle: sc.title,
            topic: sc.title,
            previousYear: ev.previousYear,
            previousGrade: ev.previousGrade,
            currentYear: ev.currentYear,
            currentGrade: ev.currentGrade,
            currentText: ev.evolutionNarrative,
            shiftDirection: ev.shiftDirection,
            drivingTrials: ev.drivingTrials,
            sourceRecId: sc.id,
          });
        }
      }
      for (const link of sc.ecosystemLinks || []) {
        if (!seenEcoLabels.has(link.label)) {
          seenEcoLabels.add(link.label);
          matchedEcosystemLinks.push(link);
        }
      }
    }
  }

  // Match Pivotal Trials & Late-Breaking Trials
  const allTrials = mergePivotalTrialsWithConferences(customPivotalTrials, conferences);
  const citedTrialNamesLower = new Set<string>();
  for (const r of coreRecommendations) {
    for (const dt of r.drivingTrials) {
      citedTrialNamesLower.add(dt.toLowerCase());
    }
  }

  const matchedTrials = allTrials.filter((tr) => {
    const acrLower = tr.acronym.toLowerCase();
    const trV3 = classifyPivotalTrialV3(tr);

    // 1. If right-pane search text is active, trial must match search OR be directly cited by a matched Core recommendation
    if (searchTokens.length > 0) {
      const trHay = `${tr.acronym} ${tr.title} ${tr.pico.population} ${tr.pico.intervention} ${tr.bottomLine}`.toLowerCase();
      const searchMatch = searchTokens.every((t) => trHay.includes(t));
      const citedMatch = Array.from(citedTrialNamesLower).some(
        (cited) => cited === acrLower || cited.startsWith(`${acrLower} `) || cited.includes(`(${acrLower})`)
      );
      if (!searchMatch && !citedMatch) return false;
      if (searchMatch && !reqConditionId && reqInterventions.length === 0) return true;
    }

    // 2. Direct citation in matched Core recommendations
    if (
      Array.from(citedTrialNamesLower).some(
        (cited) => cited === acrLower || cited.startsWith(`${acrLower} `) || cited.includes(`(${acrLower})`)
      )
    ) {
      return true;
    }
    if (
      acrLower.length >= 4 &&
      coreRecommendations.some((r) => r.text.toLowerCase().includes(acrLower))
    ) {
      return true;
    }

    // 3. V3.0 Condition & Intervention Tag match
    if (reqSubspecialty && tr.subspecialty !== reqSubspecialty && !trV3.conditionIds.some((cid) => getConditionByIdV3(cid)?.subspecialties.includes(reqSubspecialty))) {
      return false;
    }
    if (reqConditionId && !trV3.conditionIds.includes(reqConditionId)) {
      return false;
    }
    if (reqTimeWindowId) {
      if (!trV3.timeWindowIds || !trV3.timeWindowIds.includes(reqTimeWindowId)) {
        return false;
      }
    }
    if (reqInterventions.length > 0 && !reqInterventions.some((it) => trV3.interventionTags.includes(it))) {
      return false;
    }

    return Boolean(reqConditionId || reqInterventions.length > 0 || reqSubspecialty);
  });

  const pivotalTrials = matchedTrials.filter((t) => t.evidenceSource === "PEER_REVIEWED_PUBLISHED");
  const lateBreakingTrials = matchedTrials.filter((t) => t.evidenceSource === "CONFERENCE_LATE_BREAKING");

  // Compute Evidence Concordance
  const concordanceAppraisal = computeEvidenceConcordance(coreRecommendations);

  // Match Related NeuroPulse Articles
  const matchedTrialAcronyms = new Set(matchedTrials.map((t) => t.acronym.toLowerCase()));
  const matchedTrialDois = new Set(
    matchedTrials.map((t) => (t.doi || "").toLowerCase()).filter(Boolean)
  );

  const activeAliasTerms: { term: string; label: string; weight: number }[] = [];
  if (reqConditionId) {
    const condObj = getConditionByIdV3(reqConditionId);
    if (condObj) {
      activeAliasTerms.push({ term: condObj.label.toLowerCase(), label: condObj.label, weight: 18 });
    }
  }
  for (const tagId of reqInterventions) {
    const lbl = getTagLabelByIdV3(tagId);
    if (lbl && lbl.length >= 3) {
      activeAliasTerms.push({ term: lbl.toLowerCase(), label: lbl, weight: 28 });
    }
  }
  for (const dtId of reqDiagTags) {
    const lbl = getTagLabelByIdV3(dtId);
    if (lbl && lbl.length >= 3) {
      activeAliasTerms.push({ term: lbl.toLowerCase(), label: lbl, weight: 22 });
    }
  }

  const scoredArticles: ScoredNeuroPulseArticle[] = [];
  for (const art of neuroPulseArticles) {
    if (!art || !art.title) continue;
    let score = 0;
    const reasons: string[] = [];
    const titleLower = art.title.toLowerCase();
    const absLower = (art.abstract || "").toLowerCase();
    const doiLower = (art.doi_url || "").toLowerCase();

    for (const doi of matchedTrialDois) {
      if (doi && doiLower.includes(doi)) {
        score += 65;
        reasons.push("Landmark Trial Publication");
        break;
      }
    }

    for (const acr of matchedTrialAcronyms) {
      if (acr.length >= 4 && (titleLower.includes(acr) || absLower.includes(`(${acr})`))) {
        score += 45;
        reasons.push(`Trial: ${acr.toUpperCase()}`);
        break;
      }
    }

    if (searchTokens.length > 0) {
      const inTitle = searchTokens.every((t) => titleLower.includes(t));
      const inAbs = searchTokens.every((t) => `${titleLower} ${absLower}`.includes(t));
      if (inTitle) {
        score += 40;
        reasons.push(`Keyword in title: "${rawSearch}"`);
      } else if (inAbs) {
        score += 22;
        reasons.push(`Keyword in abstract: "${rawSearch}"`);
      }
    }

    const matchedLabels = new Set<string>();
    for (const item of activeAliasTerms) {
      if (matchedLabels.has(item.label)) continue;
      if (titleLower.includes(item.term)) {
        score += item.weight;
        matchedLabels.add(item.label);
        reasons.push(item.label);
      } else if (absLower.includes(item.term)) {
        score += Math.round(item.weight * 0.5);
        matchedLabels.add(item.label);
        reasons.push(item.label);
      }
    }

    if (score >= 20) {
      scoredArticles.push({
        article: art,
        relevanceScore: score,
        matchReasons: Array.from(new Set(reasons)).slice(0, 3),
      });
    }
  }

  scoredArticles.sort(
    (a, b) =>
      b.relevanceScore - a.relevanceScore ||
      (b.article.pub_date || "").localeCompare(a.article.pub_date || "")
  );

  return {
    query,
    totalIndexedCount: fullPool.length,
    unlabeledCount: totalUnlabeled,
    approvedCount: totalApproved,
    coreRecommendations,
    supportingRecommendations,
    crossSocietyMatrix,
    intraSocietyDiffs: intraSocietyDiffs.slice(0, 24),
    pivotalTrials,
    lateBreakingTrials,
    concordanceAppraisal,
    relatedArticles: scoredArticles.slice(0, 12),
    ecosystemLinks: matchedEcosystemLinks,
    facetValueCounts,
    v3Counts,
    availableSocieties,
  };
}
