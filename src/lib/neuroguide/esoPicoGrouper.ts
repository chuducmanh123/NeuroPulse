import type { PracticeChangeDetail } from "@/types/neuroguide";
import type { EsoPicoItem, EsoEvidenceQuality, EsoRecommendationStrength } from "@/components/neuroguide/EsoGuidelineTable";

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
  if (
    lower.includes("strong against") ||
    lower.includes("harm") ||
    (lower.includes("strong") && stmtLower.includes("suggest against"))
  ) {
    strength = "Strong against intervention";
  } else if (
    lower.includes("weak against") ||
    lower.includes("suggest against") ||
    stmtLower.includes("suggest against") ||
    (lower.includes("conditional") && (stmtLower.includes("against") || stmtLower.includes("avoid") || stmtLower.includes("not ")))
  ) {
    strength = "Weak against intervention";
  } else if (
    lower.includes("strong for") ||
    lower.includes("recommend for") ||
    (lower.includes("strong") && !lower.includes("against"))
  ) {
    strength = "Strong for intervention";
  } else if (
    lower.includes("weak for") ||
    lower.includes("suggest for") ||
    lower.includes("conditional") ||
    stmtLower.includes("suggest") ||
    stmtLower.includes("maintain") ||
    stmtLower.includes("recommend")
  ) {
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

    if ((!targetPico.drivingTrials || targetPico.drivingTrials.length === 0) && item.drivingTrials && item.drivingTrials.length > 0) {
      targetPico.drivingTrials = item.drivingTrials;
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
