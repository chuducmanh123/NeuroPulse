import type { ReproductiveRecord, Sourced } from "@/types/neurorx";

export const REPRO_NA_NOTE = "Not clinically applicable";

export type PregnancyTier = "preferred" | "caution" | "avoid";
export type LactationTier = "compatible" | "caution" | "avoid";

export const REPRO_TIER_LABELS: Record<PregnancyTier, string> = {
  preferred: "Preferred — Lowest recognized malformation risk in class",
  caution: "Caution — Use with monitoring / intermediate risk",
  avoid: "Avoid — Contraindicated / major teratogenic risk",
};

export const REPRO_TIER_SHORT: Record<PregnancyTier, string> = {
  preferred: "Preferred",
  caution: "Caution",
  avoid: "Avoid",
};

export const LACTATION_TIER_SHORT: Record<LactationTier, string> = {
  compatible: "Compatible",
  caution: "Caution",
  avoid: "Avoid",
};

export function isReproNotApplicable(field?: Sourced<string> | null): boolean {
  if (!field || field.value) return false;
  const note = field.note?.trim().toLowerCase();
  if (!note) return false;
  return note === "not clinically applicable" || note === "n/a" || note === "not applicable";
}

/**
 * Classifies a drug's lactation safety into 3 display tiers using RID% and summary wording.
 */
export function classifyLactationTier(
  repro?: ReproductiveRecord | null
): LactationTier | null {
  const ridText = repro?.lactation_rid?.value?.trim() || "";
  const summary = repro?.lactation_summary?.value?.trim().toLowerCase() || "";

  if (!ridText && !summary) return null;

  const avoidKeywords = [
    "contraindicated",
    "discontinue nursing",
    "discontinue breastfeeding",
    "do not breastfeed",
    "avoid breastfeeding",
    "not recommended",
  ];
  if (avoidKeywords.some((kw) => summary.includes(kw))) {
    return "avoid";
  }

  // Extract numeric RID percentages (e.g. "1% to 2%", "12.5%", "< 1%")
  const matches = ridText.match(/\d+(?:\.\d+)?/g);
  const maxRid = matches
    ? Math.max(...matches.map((n) => parseFloat(n)).filter((n) => !Number.isNaN(n)))
    : null;

  if (maxRid !== null && maxRid > 10) {
    return "avoid";
  }

  const cautionKeywords = [
    "caution",
    "monitor",
    "only when indicated",
    "only if",
    "apnea",
    "drowsiness",
    "sedation",
    "poor sucking",
    "poor weight gain",
    "toxicity",
  ];
  if ((maxRid !== null && maxRid >= 5) || cautionKeywords.some((kw) => summary.includes(kw))) {
    return "caution";
  }

  return "compatible";
}
