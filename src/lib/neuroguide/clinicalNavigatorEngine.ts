import type {
  GuidelineDoc,
  RecommendationAtom,
  ConferenceEvent,
  ClinicalScenario,
  NormalizedTier,
  OntologyFacetId,
  RecommendationLabelOutput,
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
import { buildRecommendationRelations } from "./relationBuilder.ts";
import { mergePivotalTrialsWithConferences } from "../../data/pivotalTrialsSeed.ts";

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
  validationStatus: "human_approved" | "ai_checked" | "needs_review" | "reject";
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
}

export interface ScoredNeuroPulseArticle {
  article: Article;
  relevanceScore: number;
  matchReasons: string[];
}

export interface NavigatorQueryResult {
  query: NavigatorQuery;
  totalIndexedCount: number;
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
      facets: {
        condition: ["ais"],
        intervention_type: ["iv_thrombolysis"],
        drug_or_procedure: ["tenecteplase", "alteplase"],
      },
      includeAiChecked: true,
    },
  },
  {
    id: "preset-large-core-evt",
    title: "Endovascular Thrombectomy in Large Core & LVO",
    subtitle: "SELECT2, ANGEL-ASPECT, TENSION & AHA/ESO thrombectomy criteria",
    badge: "Upgraded Class I",
    query: {
      facets: {
        condition: ["ais", "large_vessel_occlusion", "large_ischemic_core"],
        intervention_type: ["endovascular_thrombectomy"],
      },
      includeAiChecked: true,
    },
  },
  {
    id: "preset-acute-bp-control",
    title: "Acute Blood Pressure Targets (AIS Post-EVT & ICH)",
    subtitle: "ENCHANTED2/MT, OPTIMAL-BP, INTERACT2, ATACH-2 & ESO 2025 BP Guideline",
    badge: "Cross-Society",
    query: {
      facets: {
        condition: ["ais", "ich"],
        intervention_type: ["bp_management"],
      },
      includeAiChecked: true,
    },
  },
  {
    id: "preset-asah-management",
    title: "Aneurysmal SAH: Coiling, Clipping & Nimodipine",
    subtitle: "AHA/ASA 2023 vs. ESO/EANS/ESMINT 2026 aSAH Guidelines",
    badge: "AHA vs. ESO",
    query: {
      facets: {
        condition: ["sah"],
      },
      includeAiChecked: true,
    },
  },
  {
    id: "preset-afib-anticoagulation",
    title: "Atrial Fibrillation & Cardioembolic Stroke Prevention",
    subtitle: "DOAC timing (ELAN), LAAO & 2023 ACC/AHA/HRS vs. 2024 AHA Prevention",
    badge: "Prevention",
    query: {
      facets: {
        condition: ["atrial_fibrillation", "ais"],
        intervention_type: ["anticoagulation", "cardiac_rhythm_management"],
      },
      includeAiChecked: true,
    },
  },
  {
    id: "preset-post-stroke-rehab-sap",
    title: "Post-Stroke Pneumonia (SAP), Aphasia & Motor Rehab",
    subtitle: "ESO 2025/2026 Guidelines on SAP, Speech & Language Therapy, and Motor Recovery",
    badge: "ESO GRADE",
    query: {
      facets: {
        condition: ["stroke_associated_pneumonia", "post_stroke_aphasia", "post_stroke_motor_impairment"],
      },
      includeAiChecked: true,
    },
  },
];

function getValueLabelEn(facetId: OntologyFacetId, valueId: string): string {
  const f = STROKE_ONTOLOGY.facets[facetId];
  const found = f?.values.find((v) => v.id === valueId);
  return found?.label_en || found?.label_vi || valueId;
}

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
 * Indexes all GuidelineDoc practice changes and standalone RecommendationAtoms (e.g. VN-MOH, AAN, NCS, ILAE)
 * into a unified, ontology-labeled array of atomic recommendations, with automatic memoization.
 */
export function indexAllGuidelineRecommendations(
  guidelines: GuidelineDoc[],
  recommendationAtoms: RecommendationAtom[] = [],
  customRecLabels: Record<string, RecommendationLabelOutput> = {}
): IndexedNavigatorRecommendation[] {
  const sig = `${guidelines.length}:${guidelines.map((g) => `${g.id}-${g.allPracticeChanges?.length || 0}-${g.synthesizedAt || ""}`).join("|")}::${recommendationAtoms.length}::${Object.keys(customRecLabels).length}`;
  if (sig === _cachedIndexKey && _cachedIndexedRecs.length > 0) {
    return _cachedIndexedRecs;
  }

  const indexed: IndexedNavigatorRecommendation[] = [];
  const seenRecIds = new Set<string>();

  for (const doc of guidelines) {
    if (!doc || !Array.isArray(doc.allPracticeChanges)) continue;
    doc.allPracticeChanges.forEach((chg, idx) => {
      const inp = toLabelerInput(doc, chg, idx);
      if (!inp.text) return;
      const recId = inp.rec_id;
      if (seenRecIds.has(recId)) return;
      seenRecIds.add(recId);

      const customOrExisting = customRecLabels[recId] || chg.ontologyLabels;
      const labels = customOrExisting || autoLabelRecommendationVerbatim(inp, STROKE_ONTOLOGY);
      const valRes = validateLabelRecord(inp, labels, STROKE_ONTOLOGY);

      let validationStatus: IndexedNavigatorRecommendation["validationStatus"] = "ai_checked";
      if (valRes.status === "reject") {
        validationStatus = "reject";
      } else if (chg.approvalStatus === "human_approved" || doc.status === "approved") {
        validationStatus = valRes.status === "needs_review" && customOrExisting ? "needs_review" : "human_approved";
      } else if (valRes.status === "needs_review") {
        validationStatus = "needs_review";
      }

      const tier = computeNormalizedTierFromGrade({
        cor: chg.cor,
        loe: chg.loe,
        strength: chg.strength,
        quality: chg.quality,
        currentGrade: chg.currentGrade,
        expertConsensusStatement: chg.expertConsensusStatement,
      });

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
        validationStatus,
      });
    });
  }

  // Also index standalone RecommendationAtoms (e.g., VN-MOH 2025, ESO 2024 Expedited TNK, ILAE, NCS)
  for (const atom of recommendationAtoms) {
    if (!atom || !atom.recommendationText) continue;
    const recId = atom.id;
    if (seenRecIds.has(recId)) continue;
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
    const labels = customRecLabels[recId] || autoLabelRecommendationVerbatim(inp, STROKE_ONTOLOGY);
    const valRes = validateLabelRecord(inp, labels, STROKE_ONTOLOGY);
    if (valRes.status === "reject") continue;

    indexed.push({
      recId,
      guidelineId: syntheticDoc.id,
      guidelineTitle: syntheticDoc.title,
      officialUrl: syntheticDoc.officialUrl,
      society: atom.society,
      year: atom.year,
      subspecialty: "Stroke",
      sectionPath: inp.section_path,
      parentContext: inp.parent_context,
      text: inp.text,
      rawGrade: atom.originalGrade,
      normalizedTier: atom.normalizedTier || 1,
      changeType: "STANDARD",
      drivingTrials: atom.citedTrials || [],
      eligibilityCriteria: atom.eligibilityCriteria,
      labels,
      validationStatus: "human_approved",
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
 * Returns true only if the user has selected at least one ontology filter, society, practice-change toggle, or search keyword (>= 2 chars).
 */
export function hasActiveNavigatorQuery(query: NavigatorQuery): boolean {
  if (query.searchText && query.searchText.trim().length >= 2) return true;
  if (query.societies && query.societies.length > 0) return true;
  if (query.onlyPracticeChanges) return true;
  for (const vals of Object.values(query.facets || {})) {
    if (Array.isArray(vals) && vals.length > 0) return true;
  }
  return false;
}

/**
 * Computes deterministic Evidence Concordance across societies from matched Core recommendations.
 */
export function computeEvidenceConcordance(
  coreRecs: IndexedNavigatorRecommendation[]
): EvidenceConcordanceAppraisal {
  if (coreRecs.length === 0) {
    return {
      consensusLevel: "NO_MATCHING_EVIDENCE",
      concordanceScore: 0,
      headline: "No matching recommendations for the selected filters",
      societyStances: [],
      agreementPoints: [],
      divergencePoints: [],
      clinicalBottomLine: "Adjust your ontology facet filters or search keywords on the left to explore clinical recommendations.",
      citedRecIds: [],
    };
  }

  const bySoc = new Map<string, IndexedNavigatorRecommendation[]>();
  for (const r of coreRecs) {
    const list = bySoc.get(r.society) || [];
    list.push(r);
    bySoc.set(r.society, list);
  }

  const societyStances: SocietyStanceSummary[] = [];
  for (const [society, recs] of bySoc.entries()) {
    const latestYear = Math.max(...recs.map((x) => x.year));
    const dirs = new Set(recs.map((x) => x.labels.labels.direction.value).filter((d) => d !== "unspecified"));
    let dominantDirection: SocietyStanceSummary["dominantDirection"] = "for";
    if (dirs.size > 1 && (dirs.has("for") && (dirs.has("against") || dirs.has("no_benefit")))) {
      dominantDirection = "mixed";
    } else if (dirs.has("against")) {
      dominantDirection = "against";
    } else if (dirs.has("no_benefit")) {
      dominantDirection = "no_benefit";
    } else if (dirs.has("uncertain") && !dirs.has("for")) {
      dominantDirection = "uncertain";
    }

    const highestTier = Math.min(...recs.map((x) => x.normalizedTier)) as NormalizedTier;
    const rawGradesSummary = Array.from(new Set(recs.slice(0, 3).map((x) => x.rawGrade)));
    societyStances.push({
      society,
      latestYear,
      recCount: recs.length,
      dominantDirection,
      highestTier,
      rawGradesSummary,
    });
  }

  societyStances.sort((a, b) => b.recCount - a.recCount || b.latestYear - a.latestYear);

  const agreementPoints: string[] = [];
  const divergencePoints: string[] = [];
  const citedRecIds = coreRecs.slice(0, 8).map((r) => r.recId);

  const positiveRecs = coreRecs.filter((r) => r.labels.labels.direction.value === "for");
  const negativeRecs = coreRecs.filter(
    (r) => r.labels.labels.direction.value === "against" || r.labels.labels.direction.value === "no_benefit"
  );
  const uncertainRecs = coreRecs.filter((r) => r.labels.labels.direction.value === "uncertain");

  if (positiveRecs.length > 0) {
    const posSocieties = Array.from(new Set(positiveRecs.map((r) => `${r.society} (${r.year})`)));
    const topPosIds = positiveRecs.slice(0, 3).map((r) => `[${r.recId}]`).join(", ");
    agreementPoints.push(
      `Endorsed / Recommended FOR (${positiveRecs.length} recommendation${positiveRecs.length > 1 ? "s" : ""}) across ${posSocieties.join(", ")} — e.g., ${positiveRecs[0].rawGrade} ${topPosIds}.`
    );
  }

  if (negativeRecs.length > 0) {
    const negSocieties = Array.from(new Set(negativeRecs.map((r) => `${r.society} (${r.year})`)));
    const topNegIds = negativeRecs.slice(0, 3).map((r) => `[${r.recId}]`).join(", ");
    if (positiveRecs.length > 0) {
      divergencePoints.push(
        `Contraindications / Harm / No-Benefit boundaries (${negativeRecs.length} recommendation${negativeRecs.length > 1 ? "s" : ""}) specified by ${negSocieties.join(", ")} (${negativeRecs[0].rawGrade}) ${topNegIds} — verify specific subgroup, timing, or blood pressure/dosing thresholds.`
      );
    } else {
      agreementPoints.push(
        `Consensus AGAINST / No Benefit (${negativeRecs.length} recommendation${negativeRecs.length > 1 ? "s" : ""}) across ${negSocieties.join(", ")} (${negativeRecs[0].rawGrade}) ${topNegIds}.`
      );
    }
  }

  if (uncertainRecs.length > 0) {
    const uncSocieties = Array.from(new Set(uncertainRecs.map((r) => `${r.society} (${r.year})`)));
    const topUncIds = uncertainRecs.slice(0, 2).map((r) => `[${r.recId}]`).join(", ");
    divergencePoints.push(
      `Evidence uncertainty / conditional gaps noted in ${uncSocieties.join(", ")} (${uncertainRecs[0].rawGrade}) ${topUncIds}.`
    );
  }

  // Determine overall consensus level across societies
  let consensusLevel: EvidenceConcordanceAppraisal["consensusLevel"] = "HIGH_CONCORDANCE";
  let concordanceScore = 92;
  let headline = "High Concordance Across Guideline Societies";

  if (societyStances.length === 1) {
    consensusLevel = "SINGLE_SOCIETY_EVIDENCE";
    concordanceScore = 85;
    headline = `Single-Society Evidence (${societyStances[0].society} ${societyStances[0].latestYear})`;
  } else {
    const uniqueDominantDirs = new Set(societyStances.map((s) => s.dominantDirection));
    const tiers = societyStances.map((s) => s.highestTier);
    const tierSpread = Math.max(...tiers) - Math.min(...tiers);

    if (
      (uniqueDominantDirs.has("for") && (uniqueDominantDirs.has("against") || uniqueDominantDirs.has("no_benefit"))) ||
      tierSpread >= 3
    ) {
      consensusLevel = "MAJOR_DIVERGENCE";
      concordanceScore = 54;
      headline = "Major Divergence / Subgroup-Specific Contraindications Across Guidelines";
    } else if (uniqueDominantDirs.size > 1 || tierSpread >= 1 || uncertainRecs.length > 0) {
      consensusLevel = "MODERATE_VARIATION";
      concordanceScore = 78;
      headline = "Moderate Variation in Recommendation Strength or Eligibility Criteria";
    }
  }

  const leadRec = coreRecs.slice().sort((a, b) => a.normalizedTier - b.normalizedTier || b.year - a.year)[0];
  const clinicalBottomLine = leadRec
    ? `Primary Evidence Anchor [${leadRec.recId}] (${leadRec.society} ${leadRec.year}, ${leadRec.rawGrade}): "${leadRec.text.slice(0, 220)}${leadRec.text.length > 220 ? "..." : ""}"`
    : "Review individual society recommendations above for exact eligibility criteria.";

  return {
    consensusLevel,
    concordanceScore,
    headline,
    societyStances,
    agreementPoints,
    divergencePoints,
    clinicalBottomLine,
    citedRecIds,
  };
}

/**
 * Executes a full Clinical Navigator query across guidelines, pivotal trials, conferences, scenarios, and NeuroPulse articles.
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
  const allIndexed = indexAllGuidelineRecommendations(guidelines, recommendationAtoms, customRecLabels).filter(
    (r) => {
      if (r.validationStatus === "reject") return false;
      if (!includeAiChecked && r.validationStatus !== "human_approved") return false;
      if (query.subspecialty && query.subspecialty !== "All Subspecialties" && r.subspecialty !== query.subspecialty) {
        return false;
      }
      if (query.societies && query.societies.length > 0 && !query.societies.includes(r.society)) {
        return false;
      }
      if (query.onlyPracticeChanges && r.changeType === "STANDARD") {
        return false;
      }
      return true;
    }
  );

  const availableSocieties = Array.from(new Set(allIndexed.map((r) => r.society))).sort();

  // Compute facet value counts across the filtered pool
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

  for (const rec of allIndexed) {
    for (const fid of Object.keys(STROKE_ONTOLOGY.facets) as OntologyFacetId[]) {
      const vals = getRecordFacetValues(rec.labels, fid);
      for (const v of vals) {
        facetValueCounts[fid][v] = (facetValueCounts[fid][v] || 0) + 1;
      }
    }
  }

  // Zero-Query Short-Circuit: Do not compute heavy matrices, relations, trials, or articles if no filter is selected
  if (!hasActiveNavigatorQuery(query)) {
    return {
      query,
      totalIndexedCount: allIndexed.length,
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
      availableSocieties,
    };
  }

  // Lazily build and reuse memoized relations for Supporting expansion
  const relations = getLazyRelations(_cachedIndexedRecs);

  // Parse search text tokens and detect implied ontology concepts
  const rawSearch = (query.searchText || "").trim();
  const searchLower = rawSearch.toLowerCase();
  const searchTokens = searchLower
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

  // Identify ontology values whose label_en, label_vi, id, or aliases match searchLower
  const searchMatchedFacetValues = new Map<OntologyFacetId, Set<string>>();
  if (searchLower.length >= 2) {
    for (const [fid, fDef] of Object.entries(STROKE_ONTOLOGY.facets) as [OntologyFacetId, any][]) {
      for (const valDef of fDef.values) {
        const candidates = [
          valDef.id,
          valDef.id.replace(/_/g, " "),
          valDef.label_en || "",
          valDef.label_vi || "",
          ...(valDef.aliases || []),
        ].map((s: string) => s.toLowerCase());
        if (candidates.some((c: string) => c && (c.includes(searchLower) || searchLower.includes(c)))) {
          const set = searchMatchedFacetValues.get(fid) || new Set<string>();
          set.add(valDef.id);
          searchMatchedFacetValues.set(fid, set);
        }
      }
    }
  }

  const activeFacetEntries = Object.entries(query.facets || {}).filter(
    ([, arr]) => Array.isArray(arr) && arr.length > 0
  ) as [OntologyFacetId, string[]][];

  const excludeFacetEntries = Object.entries(query.excludeFacets || {}).filter(
    ([, arr]) => Array.isArray(arr) && arr.length > 0
  ) as [OntologyFacetId, string[]][];

  const coreRecommendations: IndexedNavigatorRecommendation[] = [];
  const coreRecIdSet = new Set<string>();

  for (const rec of allIndexed) {
    // 1. Check exclusions
    let excluded = false;
    for (const [exFid, exVals] of excludeFacetEntries) {
      const recVals = getRecordFacetValues(rec.labels, exFid);
      if (exVals.some((v) => recVals.includes(v))) {
        excluded = true;
        break;
      }
    }
    if (excluded) continue;

    // 2. Check AND across active facets, OR within each facet
    let matchesAllFacets = true;
    for (const [fid, requiredVals] of activeFacetEntries) {
      const recVals = getRecordFacetValues(rec.labels, fid);
      if (!requiredVals.some((v) => recVals.includes(v))) {
        matchesAllFacets = false;
        break;
      }
    }
    if (!matchesAllFacets) continue;

    // 3. Check searchText if provided
    if (searchTokens.length > 0) {
      const hay = `${rec.text} ${rec.sectionPath} ${rec.parentContext} ${rec.guidelineTitle} ${rec.rawGrade} ${rec.drivingTrials.join(" ")}`.toLowerCase();
      const textHit = searchTokens.every((tok) => hay.includes(tok));
      let ontologyHit = false;
      for (const [fid, matchedIds] of searchMatchedFacetValues.entries()) {
        const recVals = getRecordFacetValues(rec.labels, fid);
        if (recVals.some((v) => matchedIds.has(v))) {
          ontologyHit = true;
          break;
        }
      }
      if (!textHit && !ontologyHit) continue;
    }

    // Collect matched evidence spans for UI highlighting
    const matchedSpans: IndexedNavigatorRecommendation["matchedSpans"] = [];
    for (const fid of Object.keys(STROKE_ONTOLOGY.facets) as OntologyFacetId[]) {
      const rawLab = rec.labels.labels[fid];
      const items = Array.isArray(rawLab) ? rawLab : [rawLab];
      for (const it of items) {
        if (it && it.value !== "unspecified" && it.evidence_span) {
          matchedSpans.push({
            facet: fid,
            value: it.value,
            labelEn: getValueLabelEn(fid, it.value),
            span: it.evidence_span,
          });
        }
      }
    }

    const enriched: IndexedNavigatorRecommendation = {
      ...rec,
      matchLayer: "core",
      matchedSpans,
    };
    coreRecommendations.push(enriched);
    coreRecIdSet.add(rec.recId);
  }

  // Sort Core recommendations: latest year & strongest tier first
  coreRecommendations.sort(
    (a, b) => a.normalizedTier - b.normalizedTier || b.year - a.year || a.society.localeCompare(b.society)
  );

  // Supporting recommendations via approved relations (same_pico, same_section, refers_to, supersedes, differs)
  const supportingRecIds = new Set<string>();
  for (const rel of relations) {
    if (coreRecIdSet.has(rel.src_rec_id) && !coreRecIdSet.has(rel.dst_rec_id)) {
      supportingRecIds.add(rel.dst_rec_id);
    } else if (coreRecIdSet.has(rel.dst_rec_id) && !coreRecIdSet.has(rel.src_rec_id)) {
      supportingRecIds.add(rel.src_rec_id);
    }
  }

  const supportingRecommendations = allIndexed
    .filter((r) => supportingRecIds.has(r.recId))
    .slice(0, 18)
    .map((r) => ({ ...r, matchLayer: "supporting" as const }));

  // Group Core & Supporting by Society for Cross-Society Matrix
  const socMap = new Map<string, SocietyMatrixGroup>();
  for (const rec of coreRecommendations) {
    const existing = socMap.get(rec.society);
    if (!existing) {
      socMap.set(rec.society, {
        society: rec.society,
        latestYear: rec.year,
        yearsPresent: [rec.year],
        coreRecommendations: [rec],
        supportingRecommendations: [],
        dominantDirection: rec.labels.labels.direction.value,
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

  const SOCIETY_PRIORITY = ["AHA/ASA", "ESO", "VN-MOH", "AAN", "EAN", "NCS", "ILAE"];
  const crossSocietyMatrix = Array.from(socMap.values()).sort((a, b) => {
    const idxA = SOCIETY_PRIORITY.findIndex((s) => a.society.toUpperCase().includes(s));
    const idxB = SOCIETY_PRIORITY.findIndex((s) => b.society.toUpperCase().includes(s));
    if (idxA !== -1 && idxB !== -1 && idxA !== idxB) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return b.coreRecommendations.length - a.coreRecommendations.length;
  });

  // Build Intra-Society Sequential Guideline Diffs
  const intraSocietyDiffs: IntraSocietyDiffItem[] = [];
  const seenDiffIds = new Set<string>();

  for (const rec of coreRecommendations) {
    if (rec.previousGrade || rec.previousText || (rec.changeType && rec.changeType !== "STANDARD")) {
      const diffId = `diff-${rec.recId}`;
      if (seenDiffIds.has(diffId)) continue;
      seenDiffIds.add(diffId);
      const prevYear = rec.society.includes("AHA") && rec.year === 2026 ? 2019 : rec.year - 4;
      intraSocietyDiffs.push({
        id: diffId,
        society: rec.society,
        guidelineTitle: rec.guidelineTitle,
        topic: rec.sectionPath,
        previousYear: prevYear,
        previousGrade: rec.previousGrade || "Prior Guideline Edition",
        previousText: rec.previousText,
        currentYear: rec.year,
        currentGrade: rec.rawGrade,
        currentText: rec.text,
        shiftDirection:
          rec.changeType === "UPGRADED" || rec.changeType === "DOWNGRADED" || rec.changeType === "NEW" || rec.changeType === "REVISED"
            ? rec.changeType
            : "REVISED",
        drivingTrials: rec.drivingTrials,
        sourceRecId: rec.recId,
      });
    }
  }

  // Also include matching temporalEvolution items from ClinicalScenarios if relevant
  const activeConds = new Set<string>([
    ...(query.facets?.condition || []),
    ...Array.from(searchMatchedFacetValues.get("condition") || []),
    ...coreRecommendations.slice(0, 10).flatMap((r) => getRecordFacetValues(r.labels, "condition")),
  ]);
  const activeDrugs = new Set<string>([
    ...(query.facets?.drug_or_procedure || []),
    ...Array.from(searchMatchedFacetValues.get("drug_or_procedure") || []),
    ...coreRecommendations.slice(0, 10).flatMap((r) => getRecordFacetValues(r.labels, "drug_or_procedure")),
  ]);
  const activeInts = new Set<string>([
    ...(query.facets?.intervention_type || []),
    ...Array.from(searchMatchedFacetValues.get("intervention_type") || []),
    ...coreRecommendations.slice(0, 10).flatMap((r) => getRecordFacetValues(r.labels, "intervention_type")),
  ]);

  const matchedEcosystemLinks: EcosystemLink[] = [];
  const seenEcoLabels = new Set<string>();

  for (const sc of scenarios) {
    const scText = `${sc.id} ${sc.title} ${sc.keyTags.join(" ")}`.toLowerCase();
    const matchesDrug = Array.from(activeDrugs).some((d) => scText.includes(d.replace(/_/g, " ")));
    const matchesSearch = searchLower.length >= 3 && scText.includes(searchLower);
    if (matchesDrug || matchesSearch) {
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
    // 1. Direct citation in Core recommendations
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
    // 2. Search text hit
    if (searchTokens.length > 0) {
      const trHay = `${tr.acronym} ${tr.title} ${tr.pico.population} ${tr.pico.intervention} ${tr.bottomLine}`.toLowerCase();
      if (searchTokens.every((t) => trHay.includes(t))) return true;
    }
    // 3. Facet match against trial ontologyTags
    if (activeFacetEntries.length > 0) {
      let allFacetMatch = true;
      for (const [fid, reqVals] of activeFacetEntries) {
        const trVals = tr.ontologyTags?.[fid] || [];
        if (trVals.length > 0 && !reqVals.some((v) => trVals.includes(v))) {
          allFacetMatch = false;
          break;
        } else if (trVals.length === 0 && (fid === "condition" || fid === "drug_or_procedure" || fid === "intervention_type")) {
          allFacetMatch = false;
          break;
        }
      }
      if (allFacetMatch) return true;
    } else if (searchTokens.length === 0) {
      // No filters active: show all trials
      return true;
    }
    return false;
  });

  const pivotalTrials = matchedTrials.filter((t) => t.evidenceSource === "PEER_REVIEWED_PUBLISHED");
  const lateBreakingTrials = matchedTrials.filter((t) => t.evidenceSource === "CONFERENCE_LATE_BREAKING");

  // Compute Evidence Concordance
  const concordanceAppraisal = computeEvidenceConcordance(coreRecommendations);

  // Match Related NeuroPulse Articles from public/data/articles.json
  const matchedTrialAcronyms = new Set(matchedTrials.map((t) => t.acronym.toLowerCase()));
  const matchedTrialDois = new Set(
    matchedTrials.map((t) => (t.doi || "").toLowerCase()).filter(Boolean)
  );

  // Collect English alias keywords for active conditions, drugs, and interventions
  const activeAliasTerms: { term: string; label: string; weight: number }[] = [];
  for (const [fid, valSet] of [
    ["drug_or_procedure", activeDrugs],
    ["condition", activeConds],
    ["intervention_type", activeInts],
  ] as [OntologyFacetId, Set<string>][]) {
    const fDef = STROKE_ONTOLOGY.facets[fid];
    for (const vid of valSet) {
      if (vid === "unspecified" || vid === "stroke_general" || vid.startsWith("other_")) continue;
      const vDef = fDef.values.find((x) => x.id === vid);
      if (!vDef) continue;
      const weight = fid === "drug_or_procedure" ? 28 : fid === "intervention_type" ? 20 : 15;
      const terms = [vDef.id.replace(/_/g, " "), ...(vDef.aliases || [])].filter((s) => s.length >= 3);
      for (const t of terms) {
        activeAliasTerms.push({ term: t.toLowerCase(), label: vDef.label_en || vDef.id, weight });
      }
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
    totalIndexedCount: allIndexed.length,
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
    availableSocieties,
  };
}
