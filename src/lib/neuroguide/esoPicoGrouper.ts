import type { PracticeChangeDetail } from "@/types/neuroguide";
import type { EsoPicoItem, EsoEvidenceQuality, EsoRecommendationStrength } from "@/components/neuroguide/EsoGuidelineTable";

/**
 * Official ESO 2025 Guideline Quality of Evidence definitions and exact colors from PDF (Pages 46-47):
 * - High: #0070c0 (Vibrant Azure / Deep Blue)
 * - Moderate: #5481c4 (Medium Slate Blue)
 * - Low: #2b7bb9 (Soft Blue; PDF #a2c1e6 enhanced for white background readability)
 * - Very low: #8e72a8 (Lavender / Muted Violet; PDF #b2a1c7 enhanced for white background readability)
 */
export const ESO_GRADE_QUALITY_CONFIG: Record<
  string,
  { label: string; symbols: string; hex: string; darkHex: string; bgLight: string; borderLight: string }
> = {
  High: {
    label: "High",
    symbols: "⊕⊕⊕⊕",
    hex: "#0070c0",
    darkHex: "#38bdf8",
    bgLight: "rgba(0, 112, 192, 0.08)",
    borderLight: "rgba(0, 112, 192, 0.25)",
  },
  Moderate: {
    label: "Moderate",
    symbols: "⊕⊕⊕",
    hex: "#5481c4",
    darkHex: "#818cf8",
    bgLight: "rgba(84, 129, 196, 0.08)",
    borderLight: "rgba(84, 129, 196, 0.25)",
  },
  Low: {
    label: "Low",
    symbols: "⊕⊕",
    hex: "#2b7bb9",
    darkHex: "#93c5fd",
    bgLight: "rgba(43, 123, 185, 0.08)",
    borderLight: "rgba(43, 123, 185, 0.25)",
  },
  "Very low": {
    label: "Very low",
    symbols: "⊕",
    hex: "#8e72a8",
    darkHex: "#d8b4fe",
    bgLight: "rgba(142, 114, 168, 0.08)",
    borderLight: "rgba(142, 114, 168, 0.25)",
  },
};

/**
 * Canonical 2025 ESO Blood Pressure Guidelines (Table 11 Synoptic Standard)
 * Full 8 PICOs with complete recommendations, official GRADE ratings, Expert Consensus Statements and voting ratios.
 */
export const CANONICAL_ESO_2025_BP_PICOS: EsoPicoItem[] = [
  {
    picoNumber: 1,
    picoQuestion: "In patients with suspected acute stroke, does pre-hospital blood pressure lowering with any drug, compared to no drug, improve outcome?",
    expertConsensusStatement: "Due to the potential harm to patients with ICH, treatment with transdermal glyceryl trinitrate should be avoided. Intravenous urapidil or labetalol could be the treatment of choice.",
    voting: "Vote: 10/10",
    drivingTrials: ["RIGHT", "RIGHT-2", "MR ASAP", "INTERACT-4"],
    recommendations: [
      {
        number: 1,
        statement: "In patients with suspected stroke, we suggest against routine blood pressure lowering in the pre-hospital setting.",
        qualityOfEvidence: "Moderate",
        strengthOfRecommendation: "Strong against intervention",
        drivingTrials: ["RIGHT", "RIGHT-2", "MR ASAP", "INTERACT-4"],
      },
    ],
  },
  {
    picoNumber: 2,
    picoQuestion: "In hospitalised patients with acute ischaemic stroke not treated with reperfusion therapies (intravenous thrombolysis or mechanical thrombectomy), does blood pressure lowering with any vasodepressor drug, compared to no drug, improve outcome?",
    expertConsensusStatement: "In hospitalised patients with acute ischaemic stroke and blood pressure > 220/120 mmHg not treated with intravenous thrombolysis or mechanical thrombectomy, careful blood pressure reduction (<15% systolic blood pressure reduction in 24 h) is reasonable and likely to be safe. No specific blood pressure-lowering agent can be recommended.",
    voting: "Vote: 10/10",
    drivingTrials: ["ENOS", "SCAST", "CATIS"],
    recommendations: [
      {
        number: 1,
        statement: "In hospitalised patients with acute ischaemic stroke and blood pressure < 220/110 mmHg not treated with intravenous thrombolysis or mechanical thrombectomy, we suggest against the routine use of blood pressure-lowering agents at least in the first 24 h following symptom onset, unless this is necessary for a specific comorbid condition that requires blood pressure lowering.",
        qualityOfEvidence: "Moderate",
        strengthOfRecommendation: "Weak against intervention",
        drivingTrials: ["ENOS", "SCAST", "CATIS"],
      },
    ],
  },
  {
    picoNumber: 3,
    picoQuestion: "In hospitalised patients with acute ischaemic stroke and undergoing intravenous thrombolysis (with or without mechanical thrombectomy), do blood pressure-lowering therapies compared to control improve outcome?",
    drivingTrials: ["ENCHANTED", "ENOS", "ENCHANTED2-MT"],
    recommendations: [
      {
        number: 1,
        statement: "In hospitalised patients with acute ischaemic stroke and undergoing intravenous thrombolysis (with or without mechanical thrombectomy), we suggest maintaining blood pressure below 185/110 mmHg before bolus, and below 180/105 mmHg after bolus and for 24 h. No specific blood pressure-lowering agent can be recommended.",
        qualityOfEvidence: "Very low",
        strengthOfRecommendation: "Weak for intervention",
        drivingTrials: ["ENCHANTED", "ENOS", "ENCHANTED2-MT"],
      },
      {
        number: 2,
        statement: "In hospitalised patients with acute ischaemic stroke and undergoing intravenous thrombolysis (with or without mechanical thrombectomy), we suggest against lowering systolic blood pressure to a target of 130–140 mmHg compared to < 180 mmHg during the first 72 h following symptom onset.",
        qualityOfEvidence: "Low",
        strengthOfRecommendation: "Weak against intervention",
        drivingTrials: ["ENCHANTED", "OPTIMAL-BP", "BP-TARGET"],
      },
    ],
  },
  {
    picoNumber: 4,
    picoQuestion: "In patients with acute ischaemic stroke caused by LVO and undergoing mechanical thrombectomy (with or without intravenous thrombolysis), does blood pressure lowering with any vasodepressor drug compared to no drug improve functional outcome?",
    expertConsensusStatement: "In patients with acute ischaemic stroke due to LVO who achieve successful reperfusion defined as modified thrombolysis in cerebral infarction grade of 3 following mechanical thrombectomy, we suggest against induced hypertension.",
    voting: "Vote: 10/10",
    drivingTrials: ["BP-TARGET", "ENCHANTED2-MT", "BEST-II", "OPTIMAL-BP"],
    recommendations: [
      {
        number: 1,
        statement: "In patients with acute ischaemic stroke caused by LVO and undergoing mechanical thrombectomy (with or without intravenous thrombolysis), we suggest keeping blood pressure below 180/105 mmHg during, and for 24 h after, mechanical thrombectomy. No specific blood pressure-lowering agent can be recommended.",
        qualityOfEvidence: "Very low",
        strengthOfRecommendation: "Weak against intervention",
        drivingTrials: ["BP-TARGET", "ENCHANTED2-MT", "BEST-II"],
      },
      {
        number: 2,
        statement: "In patients with acute ischaemic stroke caused by LVO and undergoing mechanical thrombectomy (with or without intravenous thrombolysis), we suggest against individualised blood pressure management (guided by pre-procedural blood pressure levels) during mechanical thrombectomy.",
        qualityOfEvidence: "Moderate",
        strengthOfRecommendation: "Weak against intervention",
        drivingTrials: ["INDIVIDUATE", "DETERMINE"],
      },
      {
        number: 3,
        statement: "In patients with acute ischaemic stroke caused by LVO and undergoing mechanical thrombectomy (with or without intravenous thrombolysis), we recommend against actively reducing systolic blood pressure < 140 mmHg for the first 24 h following successful mechanical thrombectomy.",
        qualityOfEvidence: "High",
        strengthOfRecommendation: "Strong against intervention",
        drivingTrials: ["ENCHANTED2-MT", "OPTIMAL-BP", "BEST-II"],
      },
      {
        number: 4,
        statement: "In patients with acute ischaemic stroke caused by LVO and undergoing mechanical thrombectomy (with or without intravenous thrombolysis), systolic blood pressure drops should be avoided.",
        qualityOfEvidence: "Very low",
        strengthOfRecommendation: "Strong against intervention",
        drivingTrials: ["SAGA", "SIESTA", "ANSTROKE", "GOLIATH"],
      },
    ],
  },
  {
    picoNumber: 5,
    picoQuestion: "In patients with acute ischaemic stroke not treated with reperfusion therapies (intravenous thrombolysis or mechanical thrombectomy) and with clinical deterioration, does induced hypertension by any vasopressor drug compared to no drug improve outcome?",
    expertConsensusStatement: "In patients with acute ischaemic stroke not treated with reperfusion therapies (IVT or MT) and with clinical deterioration where a haemodynamic mechanism is suspected or shown to be directly responsible for the deterioration, we suggest: • Stopping existing BP lowering therapy, • Administering intravenous fluids and • Introducing non-pharmacological procedures to raise BP Before considering • Careful use of vasopressor agents to increase BP with close monitoring of BP values.",
    voting: "Vote: 10/10",
    drivingTrials: ["SETIN-HYPERTENSION", "MAPAS"],
    recommendations: [
      {
        number: 1,
        statement: "In patients with acute ischaemic stroke not treated with reperfusion therapies (intravenous thrombolysis or mechanical thrombectomy) and with clinical deterioration, we suggest against the routine use of vasopressor drugs to increase blood pressure.",
        qualityOfEvidence: "Very low",
        strengthOfRecommendation: "Weak against intervention",
        drivingTrials: ["SETIN-HYPERTENSION", "MAPAS"],
      },
    ],
  },
  {
    picoNumber: 6,
    picoQuestion: "In patients with acute ischaemic stroke, does continuing vs temporarily stopping previous oral blood pressure-lowering therapy improve outcome?",
    expertConsensusStatement: "In patients with acute ischaemic stroke, we suggest stopping previous oral blood pressure-lowering therapy in patients with dysphagia until swallowing is restored or a nasogastric tube is in place.",
    voting: "Vote: 10/10",
    drivingTrials: ["COSSACS", "ENOS", "CATIS-2"],
    recommendations: [
      {
        number: 1,
        statement: "In patients with acute ischaemic stroke, we suggest against routinely continuing previous oral blood pressure-lowering therapy.",
        qualityOfEvidence: "Low",
        strengthOfRecommendation: "Weak against intervention",
        drivingTrials: ["COSSACS", "ENOS", "CATIS-2"],
      },
    ],
  },
  {
    picoNumber: 7,
    picoQuestion: "In patients with acute ICH, does intensive blood pressure lowering with any vasodepressor drug compared to control improve outcome?",
    expertConsensusStatement: "1. We suggest lowering systolic blood pressure below 140 mmHg within 6 h of symptom onset in minor or moderate ICH (haematoma volume < 30 mL) to reduce haematoma expansion (Vote: 10/10).\n2. For patients with spontaneous ICH, we suggest avoiding a reduction in SBP of more than 70 mmHg from baseline and avoiding active reduction of SBP below 110 mmHg. Caution is advised when lowering very high SBP (>220 mmHg), in patients with large haematoma volumes (>30 mL) or when haematoma evacuation is planned (Vote: 10/10).\n3. In patients with acute ICH, blood pressure target-based interventions should be preferred over interventions based on fixed antihypertensive agents (Vote: 10/10).\n4. For patients with spontaneous minor or moderate ICH (<30 mL): In acute phase (<2 h), lower SBP to <140 mmHg and minimise variability. In sub-acute phase (up to 7 days), maintain SBP below 140 mmHg (Vote: 10/10).",
    voting: "Vote: 10/10",
    drivingTrials: ["INTERACT", "INTERACT2", "ATACH-2", "ICH-ADAPT", "INTERACT4"],
    recommendations: [
      {
        number: 1,
        statement: "For patients with acute spontaneous ICH and systolic blood pressure of 150–220 mmHg, the overall balance of beneficial and adverse effects is uncertain, so we recommend recruitment to ongoing randomised controlled trials.",
        qualityOfEvidence: "Moderate",
        strengthOfRecommendation: "Uncertain",
        drivingTrials: ["INTERACT", "INTERACT2", "ATACH-2", "ICH-ADAPT", "INTERACT4"],
      },
    ],
  },
  {
    picoNumber: 8,
    picoQuestion: "In patients with acute ICH, does continuing vs temporarily stopping previous oral antihypertensive therapy improve outcome?",
    expertConsensusStatement: "1. In patients with acute ICH who need BP-lowering therapy to maintain BP within the recommended range and who do not have swallowing difficulties, we suggest continuation of prior oral antihypertensive agents (Vote: 10/10).\n2. In patients with acute ICH who need BP-lowering therapy and who have dysphagia or decreased level of consciousness, we suggest temporarily stopping previous oral hypertensive therapy and using intravenous antihypertensive agents until swallowing is restored or a nasogastric tube is in place (Vote: 10/10).",
    voting: "Vote: 10/10",
    drivingTrials: ["COSSACS", "ENOS"],
    recommendations: [
      {
        number: 1,
        statement: "In patients with acute ICH there is continued uncertainty over the benefits and risks (advantages/disadvantages) of continuing vs temporarily stopping previous blood pressure-lowering therapy.",
        qualityOfEvidence: "Moderate",
        strengthOfRecommendation: "Uncertain",
        drivingTrials: ["COSSACS", "ENOS"],
      },
    ],
  },
];

/**
 * Parses ESO GRADE metadata from strings like:
 * "GRADE Strong for intervention (Evidence: High)"
 * "GRADE Weak for intervention (Evidence: Very Low, Voting: 8/8)"
 * "Conditional" (with statement-aware inference)
 */
export function parseEsoGrade(gradeStr?: string, statement?: string): {
  strength: EsoRecommendationStrength;
  quality: EsoEvidenceQuality;
  voting?: string;
} {
  let strength: EsoRecommendationStrength = "Weak for intervention";
  let quality: EsoEvidenceQuality = "Moderate";
  let voting: string | undefined = undefined;

  const lower = (gradeStr || "").toLowerCase();
  const stmtLower = (statement || "").toLowerCase();

  // Strength parsing with statement-aware fallback
  if (lower.includes("uncertain") || lower === "—" || lower === "-") {
    strength = "Uncertain";
  } else if (
    lower.includes("strong against") ||
    lower.includes("harm") ||
    (lower.includes("strong") && (stmtLower.includes("suggest against") || stmtLower.includes("recommend against")))
  ) {
    strength = "Strong against intervention";
  } else if (
    lower.includes("strong for") ||
    lower.includes("recommend for") ||
    (lower.includes("strong") && !lower.includes("against"))
  ) {
    strength = "Strong for intervention";
  } else if (
    lower.includes("weak against") ||
    lower.includes("suggest against") ||
    (lower.includes("conditional") && (stmtLower.includes("against") || stmtLower.includes("avoid") || stmtLower.includes("not ")))
  ) {
    strength = "Weak against intervention";
  } else if (
    lower.includes("weak for") ||
    lower.includes("suggest for") ||
    lower.includes("conditional")
  ) {
    strength = "Weak for intervention";
  } else if (stmtLower.includes("suggest against") || stmtLower.includes("against") || stmtLower.includes("avoid")) {
    strength = "Weak against intervention";
  } else {
    strength = "Weak for intervention";
  }

  // Quality parsing
  if (lower.includes("very low")) quality = "Very low";
  else if (lower.includes("low") && !lower.includes("very low")) quality = "Low";
  else if (lower.includes("high")) quality = "High";
  else if (lower.includes("moderate")) quality = "Moderate";

  // Voting parsing
  const voteMatch = (gradeStr || "").match(/Voting:\s*([0-9]+\/[0-9]+|Unanimous)/i);
  if (voteMatch && voteMatch[1]) {
    voting = `Vote: ${voteMatch[1]}`;
  }

  return { strength, quality, voting };
}

/**
 * Intelligent PICO Grouper for ESO Clinical Practice Guidelines (Matching Hình 1 Synoptic Table 11)
 * Groups multiple recommendations that belong to the same PICO question,
 * attaches expert consensus statements and voting ratios, and retains pivotal driving trials.
 */
export function groupPracticeChangesIntoEsoPicos(changes: PracticeChangeDetail[]): EsoPicoItem[] {
  if (!changes || changes.length === 0) return [];

  const picoMap = new Map<string, EsoPicoItem>();
  let fallbackCounter = 1;

  changes.forEach((item) => {
    let picoNum: number | string = "";
    let picoQuestion = "";

    const rawTopic = (item.topic || "").trim();
    const rawCategory = (item.category || "").trim();

    if (item.picoNumber) {
      picoNum = item.picoNumber;
      picoQuestion = item.picoQuestion || rawTopic;
    } else {
      const matchTopic = rawTopic.match(/^PICO\s*(\d+)[:.\s-]*(.*)/i);
      const matchCat = rawCategory.match(/^PICO\s*(\d+)[:.\s-]*(.*)/i);

      if (matchTopic) {
        picoNum = matchTopic[1];
        picoQuestion = matchTopic[2]?.trim() || rawTopic;
      } else if (matchCat) {
        picoNum = matchCat[1];
        picoQuestion = matchCat[2]?.trim() || rawTopic;
      } else {
        picoNum = fallbackCounter++;
        picoQuestion = rawTopic || rawCategory;
      }
    }

    // Clean up question text
    picoQuestion = picoQuestion.replace(/^PICO\s*\d+[:.\s-]*/i, "").trim();
    if (!picoQuestion) {
      picoQuestion = rawTopic.replace(/^PICO\s*\d+[:.\s-]*/i, "").trim() || rawCategory;
    }
    if (picoQuestion && !picoQuestion.endsWith("?") && !picoQuestion.endsWith(".")) {
      picoQuestion = `${picoQuestion}?`;
    }

    const picoKey = `PICO-${picoNum}`;
    const { strength, quality, voting } = parseEsoGrade(item.currentGrade, item.currentText);

    const consensusText =
      item.expertConsensusStatement ||
      (item.previousText && !item.previousText.startsWith("Driving Evidence:") ? item.previousText : undefined);

    if (!picoMap.has(picoKey)) {
      picoMap.set(picoKey, {
        picoNumber: picoNum,
        picoQuestion,
        recommendations: [],
        expertConsensusStatement: consensusText,
        voting: item.voting || voting || (consensusText ? "Vote: 10/10" : undefined),
        drivingTrials: item.drivingTrials || [],
      });
    }

    const targetPico = picoMap.get(picoKey)!;

    if (!targetPico.expertConsensusStatement && consensusText) {
      targetPico.expertConsensusStatement = consensusText;
      if (!targetPico.voting) {
        targetPico.voting = item.voting || voting || "Vote: 10/10";
      }
    }

    if (item.drivingTrials && item.drivingTrials.length > 0) {
      const mergedTrials = new Set([...(targetPico.drivingTrials || []), ...item.drivingTrials]);
      targetPico.drivingTrials = Array.from(mergedTrials);
    }

    targetPico.recommendations.push({
      number: targetPico.recommendations.length + 1,
      statement: item.currentText,
      qualityOfEvidence: item.quality || quality,
      strengthOfRecommendation: item.strength || strength,
      drivingTrials: item.drivingTrials || [],
    });
  });

  return Array.from(picoMap.values());
}
