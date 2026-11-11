/**
 * Pure calculation and date formatting engine for Patient Titration Schedules
 * Reference: tasks/neurorx-plan.md Task 20 & NEURORX-GUARDRAILS.md (G1, G2, G3.5)
 */

import type { TitrationSchedule, TitrationStep, SourceRef } from "@/types/neurorx";

export interface DatedScheduleRow {
  week_label: string; // e.g. "Week 1" or "Weeks 2–3"
  start_date_str: string; // formatted ISO date YYYY-MM-DD
  end_date_str: string;   // formatted ISO date YYYY-MM-DD
  dose_text: string;
  dose_mg_per_day?: number;
  tablet_instructions?: string;
}

export interface BuiltSchedule {
  id: string;
  label: string;
  condition_text: string;
  start_date_str: string;
  rows: DatedScheduleRow[];
  refs: SourceRef[];
}

/**
 * Builds a dated weekly titration schedule from a TitrationSchedule and a start date.
 * If product strengths are available (e.g. "50 mg", "100 mg"), calculates tablet counts.
 */
export function buildSchedule(
  schedule?: TitrationSchedule | null,
  startDateInput?: string | Date | null,
  productStrengths?: string[]
): BuiltSchedule | null {
  if (!schedule || !schedule.steps || schedule.steps.length === 0) {
    return null;
  }

  const baseDate = startDateInput
    ? new Date(startDateInput)
    : new Date();

  // If invalid date, fallback to current date
  const validBaseDate = isNaN(baseDate.getTime()) ? new Date() : baseDate;

  // Normalize to UTC / midnight
  const startYear = validBaseDate.getFullYear();
  const startMonth = validBaseDate.getMonth();
  const startDay = validBaseDate.getDate();

  // Parse available numerical tablet strengths if present
  const availableTabletSizes: number[] = [];
  if (productStrengths && productStrengths.length > 0) {
    for (const s of productStrengths) {
      const match = s.match(/(\d+(?:\.\d+)?)\s*mg/i);
      if (match) {
        const num = parseFloat(match[1]);
        if (!isNaN(num) && num > 0 && !availableTabletSizes.includes(num)) {
          availableTabletSizes.push(num);
        }
      }
    }
    availableTabletSizes.sort((a, b) => b - a);
  }

  const rows: DatedScheduleRow[] = schedule.steps.map((step) => {
    // Week math: week 1 starts at day 0
    const startOffsetDays = (step.week_from - 1) * 7;
    const endOffsetDays = step.week_to * 7 - 1;

    const rowStart = new Date(startYear, startMonth, startDay + startOffsetDays);
    const rowEnd = new Date(startYear, startMonth, startDay + endOffsetDays);

    const weekLabel =
      step.week_from === step.week_to
        ? `Week ${step.week_from}`
        : `Weeks ${step.week_from}–${step.week_to}`;

    let tabletInstructions: string | undefined;
    if (step.dose_mg_per_day && availableTabletSizes.length > 0) {
      tabletInstructions = computeTabletCount(step.dose_mg_per_day, availableTabletSizes);
    }

    return {
      week_label: weekLabel,
      start_date_str: formatDate(rowStart),
      end_date_str: formatDate(rowEnd),
      dose_text: step.dose_text,
      dose_mg_per_day: step.dose_mg_per_day,
      tablet_instructions: tabletInstructions,
    };
  });

  return {
    id: schedule.id,
    label: schedule.label,
    condition_text: schedule.condition_text,
    start_date_str: formatDate(validBaseDate),
    rows,
    refs: schedule.refs,
  };
}

/**
 * Formats a Date object to YYYY-MM-DD
 */
export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Derives daily tablet count matching given daily dose and available strengths
 */
function computeTabletCount(dailyMg: number, strengths: number[]): string | undefined {
  // If exact strength exists that evenly divides
  for (const s of strengths) {
    if (dailyMg % s === 0) {
      const count = dailyMg / s;
      return `${count} × ${s} mg tablet${count > 1 ? "s" : ""} daily`;
    }
  }

  // Combination calculation
  const parts: string[] = [];
  let rem = dailyMg;
  for (const s of strengths) {
    if (rem >= s) {
      const c = Math.floor(rem / s);
      parts.push(`${c} × ${s} mg tablet${c > 1 ? "s" : ""}`);
      rem -= c * s;
    }
  }

  if (rem === 0 && parts.length > 0) {
    return `${parts.join(" + ")} daily`;
  }

  return undefined;
}
