import type {
  RecommendationRelation,
  RecommendationLabelOutput,
} from "../../types/neuroguide.ts";

export interface RelationCandidateNode {
  recId: string;
  guidelineId: string;
  society: string;
  year: number;
  sectionPath: string;
  picoNumber?: string | number;
  text: string;
  normalizedTier: number;
  labels: RecommendationLabelOutput;
}

const REFERS_TO_REGEX = /\b(?:see|refer to)\s+(?:section|table|pico)\s+([0-9]+(?:\.[0-9a-z]+)*)|\bxem\s+mục\s+([0-9]+(?:\.[0-9a-z]+)*)/i;

function getSetValues(items: { value: string }[] | { value: string } | undefined): Set<string> {
  if (!items) return new Set();
  if (Array.isArray(items)) {
    return new Set(items.map((x) => x.value).filter((v) => v && v !== "unspecified"));
  }
  return items.value && items.value !== "unspecified" ? new Set([items.value]) : new Set();
}

function hasIntersection(a: Set<string>, b: Set<string>): boolean {
  for (const x of a) {
    if (b.has(x)) return true;
  }
  return false;
}

/**
 * Deterministically builds rule-based and ontology-grounded relations between recommendations:
 * - same_section (origin=rule, status=approved)
 * - same_pico (origin=rule, status=approved)
 * - refers_to (origin=rule, status=approved)
 * - supersedes (same society, different year, same condition + intervention/drug)
 * - differs (different society, same condition + intervention/drug + age_group, conflicting direction)
 */
export function buildRecommendationRelations(
  nodes: RelationCandidateNode[]
): RecommendationRelation[] {
  const relations: RecommendationRelation[] = [];
  const seenPairs = new Set<string>();

  const addRel = (rel: RecommendationRelation) => {
    const key = `${rel.src_rec_id}::${rel.dst_rec_id}::${rel.type}`;
    if (seenPairs.has(key)) return;
    seenPairs.add(key);
    relations.push(rel);
  };

  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    const refMatch = REFERS_TO_REGEX.exec(a.text);
    const refTarget = refMatch ? (refMatch[1] || refMatch[2]) : null;

    const aCond = getSetValues(a.labels.labels.condition);
    const aInt = getSetValues(a.labels.labels.intervention_type);
    const aDrug = getSetValues(a.labels.labels.drug_or_procedure);
    const aAge = getSetValues(a.labels.labels.age_group);
    const aDir = a.labels.labels.direction.value;

    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j];

      // 1. Same guideline rules
      if (a.guidelineId === b.guidelineId) {
        if (
          a.picoNumber !== undefined &&
          b.picoNumber !== undefined &&
          String(a.picoNumber) === String(b.picoNumber)
        ) {
          addRel({
            src_rec_id: a.recId,
            dst_rec_id: b.recId,
            type: "same_pico",
            origin: "rule",
            status: "approved",
            evidence_src: `PICO ${a.picoNumber}`,
            evidence_dst: `PICO ${b.picoNumber}`,
          });
        } else if (a.sectionPath && a.sectionPath === b.sectionPath) {
          addRel({
            src_rec_id: a.recId,
            dst_rec_id: b.recId,
            type: "same_section",
            origin: "rule",
            status: "approved",
            evidence_src: a.sectionPath,
            evidence_dst: b.sectionPath,
          });
        }

        if (refTarget && b.sectionPath.includes(refTarget)) {
          addRel({
            src_rec_id: a.recId,
            dst_rec_id: b.recId,
            type: "refers_to",
            origin: "rule",
            status: "approved",
            evidence_src: refMatch?.[0],
            evidence_dst: b.sectionPath,
          });
        }
        continue;
      }

      // Check shared clinical focus (same condition AND same drug or specific intervention)
      const bCond = getSetValues(b.labels.labels.condition);
      const bInt = getSetValues(b.labels.labels.intervention_type);
      const bDrug = getSetValues(b.labels.labels.drug_or_procedure);
      const bAge = getSetValues(b.labels.labels.age_group);
      const bDir = b.labels.labels.direction.value;

      if (!hasIntersection(aCond, bCond)) continue;
      const sharesDrug = aDrug.size > 0 && bDrug.size > 0 && hasIntersection(aDrug, bDrug);
      const sharesInt = aInt.size > 0 && bInt.size > 0 && hasIntersection(aInt, bInt);
      if (!sharesDrug && !sharesInt) continue;

      // Do not compare pediatric vs adult recommendations for 'differs' or 'supersedes'
      const aIsPed = aAge.has("pediatric") || aAge.has("neonate_perinatal");
      const bIsPed = bAge.has("pediatric") || bAge.has("neonate_perinatal");
      if (aIsPed !== bIsPed) continue;

      // 2. Same society, different year -> supersedes candidate
      if (a.society === b.society && a.year !== b.year && sharesDrug) {
        const newer = a.year > b.year ? a : b;
        const older = a.year > b.year ? b : a;
        addRel({
          src_rec_id: newer.recId,
          dst_rec_id: older.recId,
          type: "supersedes",
          origin: "rule",
          status: "approved",
          evidence_src: `${newer.society} ${newer.year}`,
          evidence_dst: `${older.society} ${older.year}`,
        });
      }

      // 3. Different society, conflicting direction -> differs
      if (
        a.society !== b.society &&
        aDir !== "unspecified" &&
        bDir !== "unspecified" &&
        aDir !== bDir &&
        (sharesDrug || (sharesInt && aCond.size === 1 && bCond.size === 1))
      ) {
        addRel({
          src_rec_id: a.recId,
          dst_rec_id: b.recId,
          type: "differs",
          origin: "rule",
          status: "approved",
          evidence_src: a.labels.labels.direction.evidence_span || aDir,
          evidence_dst: b.labels.labels.direction.evidence_span || bDir,
        });
      }
    }
  }

  return relations;
}
