export function getLocalDateIso(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Returns the active streak count, resetting to 0 if the user missed yesterday (and hasn't completed today).
 */
export function getEffectiveStreakDays(
  rawStreak: string | null,
  lastStreakDate: string | null
): number {
  if (!lastStreakDate) return 0;
  const todayKey = getLocalDateIso(0);
  const yesterdayKey = getLocalDateIso(-1);
  if (lastStreakDate !== todayKey && lastStreakDate !== yesterdayKey) {
    return 0;
  }
  const parsed = Number(rawStreak);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.floor(parsed);
}

/**
 * Computes the updated streak when the user completes today's Daily Challenge.
 */
export function computeNextStreakAfterDailySolve(
  currentStreak: number,
  lastStreakDate: string | null
): { nextStreak: number; todayKey: string } {
  const todayKey = getLocalDateIso(0);
  const yesterdayKey = getLocalDateIso(-1);

  if (lastStreakDate === todayKey) {
    return { nextStreak: Math.max(1, currentStreak), todayKey };
  }
  if (lastStreakDate === yesterdayKey) {
    return { nextStreak: Math.max(0, currentStreak) + 1, todayKey };
  }
  return { nextStreak: 1, todayKey };
}
