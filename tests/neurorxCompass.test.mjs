import test from "node:test";
import assert from "node:assert/strict";
import { holdPlan, restartPlan, reversal } from "../src/lib/neurorx/compass.ts";

function makeFixtureAnticoag({
  id = "fixture-doac",
  hold_restart = undefined,
  reversal_data = undefined,
}) {
  return {
    id,
    generic_name: id,
    tall_man: { value: id, refs: [] },
    classes: ["anticoagulant"],
    subspecialties: ["stroke"],
    vn_products: { value: null, refs: [] },
    bhyt: { value: null, refs: [] },
    regimens: [],
    renal_basis: { value: "none", refs: [] },
    hepatic: { value: null, refs: [] },
    black_box: { value: null, refs: [] },
    mg_safety: { value: "safe", refs: [] },
    ng_tube: { value: null, refs: [] },
    pgx: { value: null, refs: [] },
    ae_tags: { value: null, refs: [] },
    mechanism_of_action: { value: "Fixture", refs: [] },
    enzyme_profile: { value: {}, refs: [] },
    tools: {
      hold_restart,
      reversal: reversal_data,
    },
    status: "verified",
    verification: {
      verified_by: "Reviewer",
      verified_at: "2026-11-11",
      content_hash: "hash123",
    },
  };
}

test("holdPlan: returns empty array if no hold_restart tools data", () => {
  const drug = makeFixtureAnticoag({ id: "no-tools" });
  const plan = holdPlan(drug, "lumbar_puncture");
  assert.deepEqual(plan, []);
});

test("holdPlan: stratifies by CrCl when renal function is provided", () => {
  const drug = makeFixtureAnticoag({
    id: "crcl-doac",
    hold_restart: {
      value: [
        {
          procedure: "Invasive procedures with CrCl ≥ 50 mL/min",
          hold_hours: "24 to 48 hours",
          restart_timing: "Restart when hemostasis established",
        },
        {
          procedure: "Invasive procedures with CrCl < 50 mL/min, or major surgery / spinal puncture",
          hold_hours: "72 to 120 hours",
          restart_timing: "Restart when complete hemostasis confirmed",
        },
      ],
      refs: [
        {
          source_id: "fixture-source",
          locator: "Section 2.8",
          quote: "Discontinue prior to surgery.",
        },
      ],
    },
  });

  // Patient with CrCl = 35 mL/min (< 50)
  const planLowCrCl = holdPlan(drug, "lumbar_puncture", { crcl: 35 });
  assert.equal(planLowCrCl.length, 2);
  const matchedRow = planLowCrCl.find((p) => p.crcl_matched?.includes("CrCl < 50"));
  assert.ok(matchedRow, "Should highlight matching low CrCl row");
  assert.equal(matchedRow.hold_hours, "72 to 120 hours");

  // Patient with CrCl = 80 mL/min (≥ 50)
  const planHighCrCl = holdPlan(drug, "lumbar_puncture", { crcl: 80 });
  const highRow = planHighCrCl.find((p) => p.crcl_matched?.includes("CrCl ≥ 50"));
  assert.ok(highRow, "Should highlight matching normal CrCl row");
  assert.equal(highRow.hold_hours, "24 to 48 hours");
});

test("restartPlan: extracts post-procedure statements per source", () => {
  const drug = makeFixtureAnticoag({
    id: "restart-drug",
    hold_restart: {
      value: [
        {
          procedure: "Elective intervention",
          hold_hours: "48 hours",
          restart_timing: "Restart 24 hours post-procedure after adequate hemostasis",
        },
      ],
      refs: [
        {
          source_id: "fda-label",
          locator: "Section 2",
          quote: "Restart after hemostasis.",
        },
      ],
    },
  });

  const plan = restartPlan(drug);
  assert.equal(plan.length, 1);
  assert.equal(plan[0].restart_timing, "Restart 24 hours post-procedure after adequate hemostasis");
  assert.equal(plan[0].source_id, "fda-label");
});

test("reversal: when weight is empty, returns rule text only and no computed dose", () => {
  const drug = makeFixtureAnticoag({
    id: "warfarin-fixture",
    reversal_data: {
      value: [
        {
          agent: "4-Factor Prothrombin Complex Concentrate (Kcentra)",
          dose_rule: "25 to 50 units Factor IX/kg IV based on baseline INR; max 100 kg weight basis",
          vn_available: true,
        },
      ],
      refs: [],
    },
  });

  // Patient without weight entered
  const result = reversal(drug, undefined);
  assert.equal(result.agents.length, 1);
  assert.equal(result.agents[0].computed_dose, undefined, "Must NOT return computed numbers when weight is missing");
  assert.ok(result.agents[0].dose_rule.includes("25 to 50 units"));
  assert.equal(result.agents[0].vn_available, true);
});

test("reversal: computes weight-based 4F-PCC with INR brackets and caps basis at 100 kg", () => {
  const drug = makeFixtureAnticoag({
    id: "warfarin-fixture",
    reversal_data: {
      value: [
        {
          agent: "4-Factor Prothrombin Complex Concentrate",
          dose_rule: "25 to 50 units Factor IX/kg IV based on baseline INR",
          vn_available: true,
        },
      ],
      refs: [],
    },
  });

  // Patient 70 kg, INR 4.5 -> Bracket 35 U/kg -> 35 * 70 = 2450 units
  const res1 = reversal(drug, { weight_kg: 70, inr: 4.5 });
  assert.equal(res1.agents[0].computed_dose?.amount_exact, 2450);
  assert.equal(res1.agents[0].computed_dose?.unit, "units Factor IX");
  assert.equal(res1.agents[0].computed_dose?.capped, false);

  // Patient 120 kg (capped at 100 kg), INR 2.5 -> Bracket 25 U/kg -> 25 * 100 = 2500 units, capped = true
  const res2 = reversal(drug, { weight_kg: 120, inr: 2.5 });
  assert.equal(res2.agents[0].computed_dose?.amount_exact, 2500);
  assert.equal(res2.agents[0].computed_dose?.capped, true);
  assert.ok(res2.agents[0].computed_dose?.explanation.includes("capped at 100 kg"));

  // Patient 60 kg without INR -> Range 25 to 50 U/kg -> min 1500, max 3000
  const resNoINR = reversal(drug, { weight_kg: 60 });
  assert.equal(resNoINR.agents[0].computed_dose?.amount_min, 1500);
  assert.equal(resNoINR.agents[0].computed_dose?.amount_max, 3000);
});

test("reversal: fixed-dose reversal agent (Idarucizumab) computes 5 g", () => {
  const drug = makeFixtureAnticoag({
    id: "dabigatran-fixture",
    reversal_data: {
      value: [
        {
          agent: "idarucizumab (PRAXBIND)",
          dose_rule: "5 g IV administered as two separate vials each containing 2.5 g/50 mL",
          vn_available: true,
        },
      ],
      refs: [],
    },
  });

  const res = reversal(drug, { weight_kg: 80 });
  assert.equal(res.agents[0].computed_dose?.amount_exact, 5);
  assert.equal(res.agents[0].computed_dose?.unit, "g");
  assert.equal(res.agents[0].computed_dose?.capped, false);
});
