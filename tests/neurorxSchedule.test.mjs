import test from "node:test";
import assert from "node:assert/strict";
import { buildSchedule, formatDate } from "../src/lib/neurorx/schedule.ts";

test("Schedule Engine: Null and empty handling", () => {
  assert.equal(buildSchedule(null), null);
  assert.equal(buildSchedule(undefined), null);
  assert.equal(buildSchedule({ id: "s1", label: "Empty", condition_text: "none", steps: [], refs: [] }), null);
});

test("Schedule Engine: Weekly date calculations and multi-week spans", () => {
  const schedule = {
    id: "titration-monotherapy",
    label: "Monotherapy Titration",
    condition_text: "Partial-onset seizures monotherapy",
    steps: [
      {
        week_from: 1,
        week_to: 1,
        dose_text: "100 mg twice daily (200 mg/day)",
        dose_mg_per_day: 200,
      },
      {
        week_from: 2,
        week_to: 2,
        dose_text: "150 mg twice daily (300 mg/day)",
        dose_mg_per_day: 300,
      },
      {
        week_from: 3,
        week_to: 4,
        dose_text: "200 mg twice daily (400 mg/day)",
        dose_mg_per_day: 400,
      },
    ],
    refs: [
      {
        source_id: "fake-label",
        locator: "Section 2.1",
        quote: "Increase by 50 mg twice daily every week.",
      },
    ],
  };

  const startDate = "2026-11-16"; // Monday
  const built = buildSchedule(schedule, startDate);

  assert.ok(built);
  assert.equal(built.start_date_str, "2026-11-16");
  assert.equal(built.rows.length, 3);

  // Week 1
  assert.equal(built.rows[0].week_label, "Week 1");
  assert.equal(built.rows[0].start_date_str, "2026-11-16");
  assert.equal(built.rows[0].end_date_str, "2026-11-22");
  assert.equal(built.rows[0].dose_mg_per_day, 200);

  // Week 2
  assert.equal(built.rows[1].week_label, "Week 2");
  assert.equal(built.rows[1].start_date_str, "2026-11-23");
  assert.equal(built.rows[1].end_date_str, "2026-11-29");
  assert.equal(built.rows[1].dose_mg_per_day, 300);

  // Weeks 3–4
  assert.equal(built.rows[2].week_label, "Weeks 3–4");
  assert.equal(built.rows[2].start_date_str, "2026-11-30");
  assert.equal(built.rows[2].end_date_str, "2026-12-13");
  assert.equal(built.rows[2].dose_mg_per_day, 400);
});

test("Schedule Engine: Tablet count derivation from product strengths", () => {
  const schedule = {
    id: "titration-adjunctive",
    label: "Adjunctive Titration",
    condition_text: "Adjunctive therapy",
    steps: [
      {
        week_from: 1,
        week_to: 1,
        dose_text: "50 mg twice daily (100 mg/day)",
        dose_mg_per_day: 100,
      },
      {
        week_from: 2,
        week_to: 2,
        dose_text: "100 mg twice daily (200 mg/day)",
        dose_mg_per_day: 200,
      },
    ],
    refs: [],
  };

  const productStrengths = ["50 mg tablet", "100 mg film-coated tablet"];
  const built = buildSchedule(schedule, "2026-11-16", productStrengths);

  assert.ok(built);
  assert.equal(built.rows[0].tablet_instructions, "1 × 100 mg tablet daily");
  assert.equal(built.rows[1].tablet_instructions, "2 × 100 mg tablets daily");
});
