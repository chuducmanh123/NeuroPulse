import type { Sourced } from "@/types/neurorx";

export const REPRO_NA_NOTE = "Not clinically applicable";

export type PregnancyTier = "preferred" | "caution" | "avoid";

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

export function isReproNotApplicable(field?: Sourced<string> | null): boolean {
  if (!field || field.value) return false;
  const note = field.note?.trim().toLowerCase();
  if (!note) return false;
  return note === "not clinically applicable" || note === "n/a" || note === "not applicable";
}
