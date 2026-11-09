import type {
  IndexedNavigatorRecommendation,
  IntraSocietyDiffItem,
  EvidenceConcordanceAppraisal,
  SocietyStanceSummary,
} from "./clinicalNavigatorEngine.ts";
import type { NormalizedTier } from "../../types/neuroguide.ts";
import { getTagLabelByIdV3, getConditionByIdV3 } from "../../data/clinicalNavigatorTaxonomyV3.ts";

export interface PicoClusterMeta {
  fingerprint: string;
  title: string;
  conditionId: string;
  conditionLabel: string;
  subgroupKey: string;
  subgroupLabel: string;
  interventionKey: string;
  interventionLabel: string;
  timeWindowKey: string;
  timeWindowLabel: string;
}

export interface ConsensusTopicCluster {
  clusterId: string;
  topicTitle: string;
  subgroupLabel: string;
  interventionLabel: string;
  timeWindowLabel?: string;
  concordanceStatus: "HIGH_CONCORDANCE" | "GRADE_VARIATION" | "TRUE_DIVERGENCE" | "SAFETY_BOUNDARY" | "SINGLE_SOCIETY";
  statusBadge: {
    label: string;
    pillClass: string;
    icon: string;
  };
  societiesPresent: string[];
  societyPositions: {
    society: string;
    year: number;
    grade: string;
    direction: "for" | "against" | "conditional" | "mixed";
    tier: NormalizedTier;
    recId: string;
    excerpt: string;
  }[];
  consensusSynthesis: string;
  keyDrivingTrials: string[];
}

/**
 * Extracts a normalized clinical subgroup from text and taxonomy
 */
function extractSubgroup(text: string, section: string): { key: string; label: string } {
  const hay = `${section} ${text}`.toLowerCase();

  if (/\b(?:bao|basilar(?:\s+artery)?(?:\s+occlusion)?|posterior\s+circulation)\b/i.test(hay)) {
    return { key: "bao", label: "Basilar Artery Occlusion (BAO)" };
  }
  if (/\b(?:large\s+core|aspects?\s*[0-5]|core\s*(?:volume|>=|>|\d{2,}\s*m?l))\b/i.test(hay)) {
    return { key: "large_core", label: "Large Ischemic Core (ASPECTS 0–5 / Core ≥ 50ml)" };
  }
  if (/\b(?:mild\s+stroke|minor\s+stroke|nihss?\s*[0-5]|non-?disabling)\b/i.test(hay)) {
    return { key: "minor_stroke", label: "Minor / Non-Disabling Stroke (NIHSS ≤ 5)" };
  }
  if (/\b(?:wake-?up|unknown\s+onset|dwi-?flair|target\s+mismatch)\b/i.test(hay)) {
    return { key: "wake_up", label: "Wake-up Stroke / Unknown Onset Window" };
  }
  if (/\b(?:pfo|patent\s+foramen\s+ovale)\b/i.test(hay)) {
    return { key: "pfo", label: "Patent Foramen Ovale (PFO)" };
  }
  if (/\b(?:carotid\s+stenosis|carotid\s+endarterectomy|cea\b|cas\b|tcar\b)\b/i.test(hay)) {
    return { key: "carotid", label: "Extracranial Carotid Artery Stenosis" };
  }
  if (/\b(?:blood\s+pressure|sbp\s*(?:<|<=|target|lowering)|bp\s+target|hypertensive)\b/i.test(hay)) {
    return { key: "bp_control", label: "Hyperacute Blood Pressure Management" };
  }
  if (/\b(?:aneurysm\s+(?:coiling|clipping)|vasospasm|nimodipine|delayed\s+cerebral\s+ischemia)\b/i.test(hay)) {
    return { key: "aneurysm_securing", label: "Aneurysmal Rupture & Vasospasm Prevention" };
  }
  if (/\b(?:hematoma\s+(?:expansion|evacuation)|minimally\s+invasive\s+surgery|hemicraniectomy)\b/i.test(hay)) {
    return { key: "hematoma_decompression", label: "Surgical Evacuation & Decompression" };
  }
  if (/\b(?:prehospital|ems\b|mobile\s+stroke\s+unit|public\s+awareness|9-?1-?1)\b/i.test(hay)) {
    return { key: "prehospital", label: "Prehospital Systems & Public Education" };
  }
  if (/\b(?:dapt|dual\s+antiplatelet|aspirin\s+(?:plus|\+)\s+(?:clopidogrel|ticagrelor))\b/i.test(hay)) {
    return { key: "dapt", label: "Dual Antiplatelet Therapy (DAPT)" };
  }
  if (/\b(?:anticoagulation|doac|noac|warfarin|idarucizumab|andexanet)\b/i.test(hay)) {
    return { key: "anticoagulation", label: "Anticoagulation & Reversal" };
  }
  if (/\b(?:rehabilitation|motor\s+recovery|aphasia|dysphagia)\b/i.test(hay)) {
    return { key: "rehabilitation", label: "Rehabilitation & Recovery" };
  }

  return { key: "standard", label: "Standard Patient Population" };
}

/**
 * Extracts a normalized canonical intervention from V3 tags and text
 */
function extractIntervention(
  interventionTags: string[],
  text: string,
  section: string
): { key: string; label: string } {
  const hay = `${section} ${text}`.toLowerCase();

  if (interventionTags.length > 0) {
    const rawTag = interventionTags[0];
    const lbl = getTagLabelByIdV3(rawTag);
    if (/tenecteplase|tnk/i.test(lbl) || /tenecteplase|\btnk\b/i.test(hay)) {
      return { key: "int_tnk", label: "Tenecteplase (TNK)" };
    }
    if (/alteplase|tpa/i.test(lbl) || /alteplase|rt-?pa\b/i.test(hay)) {
      return { key: "int_alteplase", label: "Alteplase (rtPA)" };
    }
    if (/thrombectomy|evt|endovascular/i.test(lbl) || /thrombectomy|\bevt\b|endovascular/i.test(hay)) {
      return { key: "int_thrombectomy", label: "Mechanical Thrombectomy (EVT)" };
    }
    if (/blood\s+pressure|antihypertensive/i.test(lbl) || /blood\s+pressure|antihypertensive/i.test(hay)) {
      return { key: "int_bp_control", label: "Acute Blood Pressure Lowering" };
    }
    return { key: rawTag, label: lbl };
  }

  if (/\b(?:tenecteplase|\btnk\b)\b/i.test(hay)) {
    return { key: "int_tnk", label: "Tenecteplase (TNK)" };
  }
  if (/\b(?:alteplase|rt-?pa|tissue\s+plasminogen)\b/i.test(hay)) {
    return { key: "int_alteplase", label: "Alteplase (rtPA)" };
  }
  if (/\b(?:thrombectomy|\bevt\b|endovascular\s+therapy|stent\s+retriever|aspiration)\b/i.test(hay)) {
    return { key: "int_thrombectomy", label: "Mechanical Thrombectomy (EVT)" };
  }
  if (/\b(?:blood\s+pressure|antihypertensive|sbp\s*<|labetalol|nicardipine)\b/i.test(hay)) {
    return { key: "int_bp_control", label: "Blood Pressure Management" };
  }
  if (/\b(?:dapt|aspirin\s+(?:and|\+)\s+clopidogrel|ticagrelor)\b/i.test(hay)) {
    return { key: "int_dapt", label: "Dual Antiplatelet Therapy (DAPT)" };
  }
  if (/\b(?:coiling|clipping|flow\s+diverter)\b/i.test(hay)) {
    return { key: "int_aneurysm_repair", label: "Aneurysm Repair (Coiling vs Clipping)" };
  }
  if (/\b(?:nimodipine)\b/i.test(hay)) {
    return { key: "int_nimodipine", label: "Nimodipine Neuroprotection" };
  }
  if (/\b(?:hemicraniectomy|decompressive|surgical\s+evacuation)\b/i.test(hay)) {
    return { key: "int_surgery", label: "Decompressive Surgery / Hematoma Evacuation" };
  }
  if (/\b(?:educational\s+program|public\s+education|ems\s+protocol|9-?1-?1)\b/i.test(hay)) {
    return { key: "int_education_systems", label: "Public Education & Prehospital Protocol" };
  }

  return { key: "int_general", label: "Clinical Management & Supportive Care" };
}

/**
 * Extracts a normalized time window
 */
function extractTimeWindow(
  timeWindowIds: string[],
  text: string
): { key: string; label: string } {
  if (timeWindowIds.length > 0) {
    const rawTw = timeWindowIds[0];
    const lbl = getTagLabelByIdV3(rawTw);
    return { key: rawTw, label: lbl };
  }

  const hay = text.toLowerCase();
  if (/\b(?:4\.5\s*(?:h|hour)|<=?\s*4\.5|early\s+window)\b/i.test(hay)) {
    return { key: "tw_early_4_5h", label: "Early Window (≤ 4.5h)" };
  }
  if (/\b(?:6\s*[-–to]\s*24\s*(?:h|hour)|4\.5\s*[-–to]\s*24|extended\s+window|late\s+window)\b/i.test(hay)) {
    return { key: "tw_extended_6_24h", label: "Extended Window (6–24h)" };
  }
  if (/\b(?:24\s*[-–to]\s*48\s*(?:h|hour)|hyperacute|within\s+24\s*h)\b/i.test(hay)) {
    return { key: "tw_24_48h", label: "Hyperacute (≤ 24–48h)" };
  }

  return { key: "tw_any", label: "General Window" };
}

/**
 * Computes a deterministic PICO Fingerprint string and human metadata for any recommendation.
 */
export function computePicoFingerprint(rec: {
  recId?: string;
  v3Labels: {
    conditionIds: string[];
    interventionTags: string[];
    timeWindowIds: string[];
    direction?: string;
  };
  text: string;
  sectionPath?: string;
  topic?: string;
  guidelineTitle?: string;
}): PicoClusterMeta {
  const condId = rec.v3Labels.conditionIds[0] || "cond_ischemic_stroke";
  const condMeta = getConditionByIdV3(condId);
  const condLabel = condMeta?.label || "Ischemic Stroke";

  const sec = rec.sectionPath || rec.topic || "";
  const subgroup = extractSubgroup(rec.text, sec);
  const intervention = extractIntervention(rec.v3Labels.interventionTags, rec.text, sec);
  const timeWindow = extractTimeWindow(rec.v3Labels.timeWindowIds, rec.text);

  const fingerprint = `${condId}::${subgroup.key}::${intervention.key}::${timeWindow.key}`;

  const titleParts = [intervention.label];
  if (subgroup.key !== "standard") {
    titleParts.push(`in ${subgroup.label}`);
  }
  if (timeWindow.key !== "tw_any") {
    titleParts.push(`(${timeWindow.label})`);
  }
  const title = titleParts.join(" ");

  return {
    fingerprint,
    title,
    conditionId: condId,
    conditionLabel: condLabel,
    subgroupKey: subgroup.key,
    subgroupLabel: subgroup.label,
    interventionKey: intervention.key,
    interventionLabel: intervention.label,
    timeWindowKey: timeWindow.key,
    timeWindowLabel: timeWindow.label,
  };
}

/**
 * Intelligent pairing of recommendations across guideline editions within the same society
 * (e.g. AHA 2019 vs AHA 2026, or earlier ESO vs later ESO).
 */
export function generateIntraSocietyGuidelineDiffs(
  coreRecs: IndexedNavigatorRecommendation[],
  fullPool: IndexedNavigatorRecommendation[]
): IntraSocietyDiffItem[] {
  const diffs: IntraSocietyDiffItem[] = [];
  const seenPairs = new Set<string>();

  // 1. Group all available fullPool recs by Society and Fingerprint
  const bySocietyAndFp = new Map<string, IndexedNavigatorRecommendation[]>();
  for (const r of fullPool) {
    const meta = computePicoFingerprint(r);
    const key = `${r.society.toUpperCase().trim()}::${meta.fingerprint}`;
    const list = bySocietyAndFp.get(key) || [];
    list.push(r);
    bySocietyAndFp.set(key, list);
  }

  // 2. Identify real cross-edition updates
  for (const rec of coreRecs) {
    const meta = computePicoFingerprint(rec);
    const key = `${rec.society.toUpperCase().trim()}::${meta.fingerprint}`;
    const historicalPool = bySocietyAndFp.get(key) || [];

    // Find older counterpart with different year
    const olderCandidates = historicalPool
      .filter((h) => h.year < rec.year && h.recId !== rec.recId)
      .sort((a, b) => b.year - a.year); // most recent prior edition first

    if (olderCandidates.length > 0) {
      const prior = olderCandidates[0];
      const pairKey = `${prior.recId}->${rec.recId}`;
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);

      // Determine genuine shift direction
      let shiftDirection: IntraSocietyDiffItem["shiftDirection"] = "REVISED";
      if (
        (prior.v3Labels.direction === "harm" && rec.v3Labels.direction === "recommended") ||
        (prior.v3Labels.direction === "recommended" && rec.v3Labels.direction === "harm")
      ) {
        shiftDirection = "DOWNGRADED";
      } else if (rec.normalizedTier < prior.normalizedTier) {
        // e.g. Tier 3 (Class 2b) to Tier 1 (Class 1)
        shiftDirection = "UPGRADED";
      } else if (rec.normalizedTier > prior.normalizedTier) {
        shiftDirection = "DOWNGRADED";
      } else if (rec.drivingTrials.length > prior.drivingTrials.length) {
        shiftDirection = "UPGRADED";
      }

      diffs.push({
        id: `paired-${pairKey}`,
        society: rec.society,
        guidelineTitle: rec.guidelineTitle,
        topic: meta.title,
        previousYear: prior.year,
        previousGrade: prior.rawGrade,
        previousText: prior.text,
        currentYear: rec.year,
        currentGrade: rec.rawGrade,
        currentText: rec.text,
        shiftDirection,
        drivingTrials: Array.from(new Set([...rec.drivingTrials, ...prior.drivingTrials])),
        sourceRecId: rec.recId,
      });
      continue;
    }

    // 3. Fallback: If recommendation has authentic explicit previousText AND previousGrade
    if (
      rec.previousGrade &&
      rec.previousText &&
      !rec.previousText.startsWith("Driving Evidence:") &&
      rec.previousText !== rec.expertConsensusStatement
    ) {
      const diffId = `explicit-${rec.recId}`;
      if (seenPairs.has(diffId)) continue;
      seenPairs.add(diffId);

      const prevYear =
        rec.society.includes("AHA") && rec.year === 2026
          ? 2019
          : rec.year >= 2024
          ? rec.year - 4
          : rec.year - 3;

      diffs.push({
        id: diffId,
        society: rec.society,
        guidelineTitle: rec.guidelineTitle,
        topic: meta.title,
        previousYear: prevYear,
        previousGrade: rec.previousGrade,
        previousText: rec.previousText,
        currentYear: rec.year,
        currentGrade: rec.rawGrade,
        currentText: rec.text,
        shiftDirection:
          rec.changeType === "UPGRADED" || rec.changeType === "DOWNGRADED" || rec.changeType === "NEW"
            ? rec.changeType
            : "REVISED",
        drivingTrials: rec.drivingTrials,
        sourceRecId: rec.recId,
      });
    }
  }

  // Sort diffs: UPGRADED first, then DOWNGRADED, then REVISED
  const SHIFT_WEIGHT: Record<string, number> = {
    UPGRADED: 1,
    DOWNGRADED: 2,
    REVISED: 3,
    NEW: 4,
    UNCHANGED: 5,
  };

  diffs.sort((a, b) => (SHIFT_WEIGHT[a.shiftDirection] || 9) - (SHIFT_WEIGHT[b.shiftDirection] || 9));
  return diffs;
}

/**
 * Clusters recommendations by PICO Fingerprint and performs an objective cross-society concordance appraisal.
 */
export function clusterAndAppraiseConsensus(
  coreRecs: IndexedNavigatorRecommendation[]
): EvidenceConcordanceAppraisal {
  if (coreRecs.length === 0) {
    return {
      consensusLevel: "NO_MATCHING_EVIDENCE",
      concordanceScore: 0,
      headline: "No recommendations matched the current clinical query.",
      societyStances: [],
      agreementPoints: [],
      divergencePoints: [],
      clinicalBottomLine: "Adjust your filters in the left pane to explore guideline consensus across stroke societies.",
      citedRecIds: [],
      topicClusters: [],
    };
  }

  // 1. Group core recommendations by PICO Fingerprint
  const clustersMap = new Map<string, { meta: PicoClusterMeta; recs: IndexedNavigatorRecommendation[] }>();

  for (const rec of coreRecs) {
    const meta = computePicoFingerprint(rec);
    if (!clustersMap.has(meta.fingerprint)) {
      clustersMap.set(meta.fingerprint, { meta, recs: [] });
    }
    clustersMap.get(meta.fingerprint)!.recs.push(rec);
  }

  const topicClusters: ConsensusTopicCluster[] = [];
  let multiSocietyClusterCount = 0;
  let concordantScoreSum = 0;

  for (const [fp, { meta, recs }] of clustersMap.entries()) {
    // Group recs by society within this specific cluster
    const bySoc = new Map<string, IndexedNavigatorRecommendation[]>();
    for (const r of recs) {
      const list = bySoc.get(r.society) || [];
      list.push(r);
      bySoc.set(r.society, list);
    }

    const societiesPresent = Array.from(bySoc.keys());
    const societyPositions = societiesPresent.map((soc) => {
      const sRecs = bySoc.get(soc)!;
      // Best tier rec for this society
      const topRec = sRecs.slice().sort((a, b) => a.normalizedTier - b.normalizedTier || b.year - a.year)[0];
      const hasFor = sRecs.some((r) => r.v3Labels.direction === "recommended");
      const hasHarm = sRecs.some((r) => r.v3Labels.direction === "harm");
      const dir: "for" | "against" | "conditional" | "mixed" =
        hasFor && hasHarm ? "mixed" : hasHarm ? "against" : hasFor ? "for" : "conditional";

      return {
        society: soc,
        year: topRec.year,
        grade: topRec.rawGrade,
        direction: dir,
        tier: topRec.normalizedTier,
        recId: topRec.recId,
        excerpt: topRec.text,
      };
    });

    const trials = Array.from(new Set(recs.flatMap((r) => r.drivingTrials))).slice(0, 4);

    if (societiesPresent.length === 1) {
      topicClusters.push({
        clusterId: fp,
        topicTitle: meta.title,
        subgroupLabel: meta.subgroupLabel,
        interventionLabel: meta.interventionLabel,
        timeWindowLabel: meta.timeWindowLabel !== "General Window" ? meta.timeWindowLabel : undefined,
        concordanceStatus: "SINGLE_SOCIETY",
        statusBadge: {
          label: `${societiesPresent[0]} Guideline Stance`,
          pillClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700",
          icon: "🏛️",
        },
        societiesPresent,
        societyPositions,
        consensusSynthesis: `${societiesPresent[0]} (${societyPositions[0].year}) recommends: "${societyPositions[0].excerpt.slice(0, 180)}..."`,
        keyDrivingTrials: trials,
      });
      continue;
    }

    // Multi-society comparison for this topic
    multiSocietyClusterCount++;
    const dirs = new Set(societyPositions.map((p) => p.direction));
    const tiers = societyPositions.map((p) => p.tier);
    const tierSpread = Math.max(...tiers) - Math.min(...tiers);

    let concordanceStatus: ConsensusTopicCluster["concordanceStatus"] = "HIGH_CONCORDANCE";
    let badge = {
      label: "Strong Cross-Society Concordance",
      pillClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
      icon: "✓",
    };
    let synthesis = "";

    if (dirs.has("for") && dirs.has("against")) {
      // Check if the 'against' is a specific safety boundary or direct opposition
      concordanceStatus = "TRUE_DIVERGENCE";
      badge = {
        label: "Direct Stance Divergence",
        pillClass: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800",
        icon: "⚡",
      };
      synthesis = `Conflicting direction between guidelines: ${societyPositions.map((p) => `${p.society} (${p.direction.toUpperCase()}, ${p.grade})`).join(" vs. ")}.`;
      concordantScoreSum += 35;
    } else if (dirs.has("against") && !dirs.has("for")) {
      concordanceStatus = "SAFETY_BOUNDARY";
      badge = {
        label: "Consensus Against / Class III Safety Limit",
        pillClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800",
        icon: "⛔",
      };
      synthesis = `Consensus across ${societiesPresent.join(" and ")} AGAINST this intervention in this subgroup to prevent potential harm.`;
      concordantScoreSum += 95;
    } else if (tierSpread >= 2) {
      concordanceStatus = "GRADE_VARIATION";
      badge = {
        label: "Concordant with Evidence Grade Nuance",
        pillClass: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800",
        icon: "⚖️",
      };
      synthesis = `Both guidelines support this intervention, but differ in recommendation grade (${societyPositions.map((p) => `${p.society}: ${p.grade}`).join(" vs. ")}).`;
      concordantScoreSum += 82;
    } else {
      concordanceStatus = "HIGH_CONCORDANCE";
      badge = {
        label: `High Concordance (${societiesPresent.join(" & ")})`,
        pillClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
        icon: "✓",
      };
      synthesis = `Unified recommendation FOR ${meta.title} endorsed with strong evidence across ${societiesPresent.join(" and ")}.`;
      concordantScoreSum += 100;
    }

    topicClusters.push({
      clusterId: fp,
      topicTitle: meta.title,
      subgroupLabel: meta.subgroupLabel,
      interventionLabel: meta.interventionLabel,
      timeWindowLabel: meta.timeWindowLabel !== "General Window" ? meta.timeWindowLabel : undefined,
      concordanceStatus,
      statusBadge: badge,
      societiesPresent,
      societyPositions,
      consensusSynthesis: synthesis,
      keyDrivingTrials: trials,
    });
  }

  // Sort clusters: Multi-society first, then high concordance & variation
  topicClusters.sort((a, b) => b.societiesPresent.length - a.societiesPresent.length);

  // Overall Society Stance summaries (for the overview table)
  const bySocOverall = new Map<string, IndexedNavigatorRecommendation[]>();
  for (const r of coreRecs) {
    const list = bySocOverall.get(r.society) || [];
    list.push(r);
    bySocOverall.set(r.society, list);
  }

  const societyStances: SocietyStanceSummary[] = [];
  for (const [society, recs] of bySocOverall.entries()) {
    const latestYear = Math.max(...recs.map((x) => x.year));
    const highestTier = Math.min(...recs.map((x) => x.normalizedTier)) as NormalizedTier;
    const rawGradesSummary = Array.from(new Set(recs.slice(0, 3).map((x) => x.rawGrade)));
    societyStances.push({
      society,
      latestYear,
      recCount: recs.length,
      dominantDirection: recs.some((r) => r.v3Labels.direction === "recommended") ? "for" : "uncertain",
      highestTier,
      rawGradesSummary,
    });
  }
  societyStances.sort((a, b) => b.recCount - a.recCount || b.latestYear - a.latestYear);

  // Derive Agreement & Divergence points from TOPIC CLUSTERS
  const agreementPoints: string[] = [];
  const divergencePoints: string[] = [];

  const concordantClusters = topicClusters.filter(
    (c) => c.concordanceStatus === "HIGH_CONCORDANCE" || c.concordanceStatus === "SAFETY_BOUNDARY"
  );
  for (const c of concordantClusters.slice(0, 4)) {
    agreementPoints.push(
      `${c.topicTitle}: Unified recommendation across ${c.societiesPresent.join(" & ")} (${c.societyPositions.map((p) => `${p.society} ${p.grade}`).join(", ")}).`
    );
  }

  const nuanceClusters = topicClusters.filter(
    (c) => c.concordanceStatus === "GRADE_VARIATION" || c.concordanceStatus === "TRUE_DIVERGENCE"
  );
  for (const c of nuanceClusters.slice(0, 4)) {
    divergencePoints.push(
      `${c.topicTitle}: ${c.consensusSynthesis}`
    );
  }

  // Calculate final score
  let concordanceScore = 88;
  if (multiSocietyClusterCount > 0) {
    concordanceScore = Math.min(100, Math.round(concordantScoreSum / multiSocietyClusterCount));
  } else if (societyStances.length === 1) {
    concordanceScore = 85;
  }

  let consensusLevel: EvidenceConcordanceAppraisal["consensusLevel"] = "HIGH_CONCORDANCE";
  let headline = "High Concordance Across Guideline Recommendations";

  if (societyStances.length === 1) {
    consensusLevel = "SINGLE_SOCIETY_EVIDENCE";
    headline = `Single-Society Guideline Evidence (${societyStances[0].society} ${societyStances[0].latestYear})`;
  } else if (nuanceClusters.some((c) => c.concordanceStatus === "TRUE_DIVERGENCE")) {
    consensusLevel = "MAJOR_DIVERGENCE";
    headline = "Specific Divergence on Selected Clinical Indications";
  } else if (concordanceScore < 80 || nuanceClusters.length > 0) {
    consensusLevel = "MODERATE_VARIATION";
    headline = "Substantial Concordance with Variation in Grade Strength & Criteria";
  }

  // Grounded Clinical Bottom Line
  const topCluster = topicClusters.find((c) => c.societiesPresent.length > 1) || topicClusters[0];
  const clinicalBottomLine = topCluster
    ? `Clinical Anchor: For ${topCluster.topicTitle}, guidelines demonstrated ${topCluster.statusBadge.label.toLowerCase()} (${topCluster.societiesPresent.join(", ")}). ${topCluster.consensusSynthesis}`
    : "Review specific society recommendations below for detailed patient selection criteria.";

  return {
    consensusLevel,
    concordanceScore,
    headline,
    societyStances,
    agreementPoints,
    divergencePoints,
    clinicalBottomLine,
    citedRecIds: coreRecs.slice(0, 8).map((r) => r.recId),
    topicClusters,
  };
}
