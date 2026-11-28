import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  computeSmartDrip,
  computeNeeAndVis,
  evaluateWeaningCoach,
} from "../src/lib/neurocalc/tools/vasopressorEngine.ts";

describe("Vasopressor Smart Drip & Titration Engine", () => {
  test("Norepinephrine 4 mg / 50 mL (80 mcg/mL) at 0.1 mcg/kg/min for 60 kg -> 4.5 mL/h", () => {
    const res = computeSmartDrip({
      drugId: "norepinephrine",
      weightKg: 60,
      drugAmount: 4,
      volumeMl: 50,
      direction: "dose_to_rate",
      unitMode: "mcg_kg_min",
      targetDose: 0.1,
      pumpRateMlHr: null,
      accessRoute: "cvc",
    });
    assert.equal(res.valid, true);
    assert.equal(res.concentrationPerMl, 80);
    assert.equal(res.rateMlHr, 4.5);
    assert.equal(res.doseSecondary, 6);
    assert.equal(res.syringeDurationHours, 11.1);
  });

  test("Reverse calculation: Norepinephrine 4.5 mL/h -> 0.1 mcg/kg/min for 60 kg", () => {
    const res = computeSmartDrip({
      drugId: "norepinephrine",
      weightKg: 60,
      drugAmount: 4,
      volumeMl: 50,
      direction: "rate_to_dose",
      unitMode: "mcg_kg_min",
      targetDose: null,
      pumpRateMlHr: 4.5,
      accessRoute: "cvc",
    });
    assert.equal(res.valid, true);
    assert.equal(res.dosePrimary, 0.1);
  });

  test("Norepinephrine fixed mcg/min works without weight", () => {
    const res = computeSmartDrip({
      drugId: "norepinephrine",
      weightKg: null,
      drugAmount: 4,
      volumeMl: 50,
      direction: "dose_to_rate",
      unitMode: "mcg_min",
      targetDose: 8,
      pumpRateMlHr: null,
      accessRoute: "cvc",
    });
    assert.equal(res.valid, true);
    assert.equal(res.rateMlHr, 6);
  });

  test("Vasopressin 20 U / 50 mL (0.4 U/mL) at 0.03 U/min -> 4.5 mL/h without weight", () => {
    const res = computeSmartDrip({
      drugId: "vasopressin",
      weightKg: null,
      drugAmount: 20,
      volumeMl: 50,
      direction: "dose_to_rate",
      unitMode: "units_min",
      targetDose: 0.03,
      pumpRateMlHr: null,
      accessRoute: "cvc",
    });
    assert.equal(res.valid, true);
    assert.equal(res.concentrationPerMl, 0.4);
    assert.equal(res.rateMlHr, 4.5);
    assert.equal(res.doseSecondaryLabel, "1.8 U/h");
  });

  test("Dopamine 200 mg / 50 mL at 10 mcg/kg/min for 60 kg -> 9 mL/h", () => {
    const res = computeSmartDrip({
      drugId: "dopamine",
      weightKg: 60,
      drugAmount: 200,
      volumeMl: 50,
      direction: "dose_to_rate",
      unitMode: "mcg_kg_min",
      targetDose: 10,
      pumpRateMlHr: null,
      accessRoute: "cvc",
    });
    assert.equal(res.valid, true);
    assert.equal(res.rateMlHr, 9);
  });

  test("Dobutamine 250 mg / 50 mL at 5 mcg/kg/min for 60 kg -> 3.6 mL/h", () => {
    const res = computeSmartDrip({
      drugId: "dobutamine",
      weightKg: 60,
      drugAmount: 250,
      volumeMl: 50,
      direction: "dose_to_rate",
      unitMode: "mcg_kg_min",
      targetDose: 5,
      pumpRateMlHr: null,
      accessRoute: "cvc",
    });
    assert.equal(res.valid, true);
    assert.equal(res.rateMlHr, 3.6);
  });

  test("Empty weight for kg-based drip returns invalid without NaN", () => {
    const res = computeSmartDrip({
      drugId: "norepinephrine",
      weightKg: null,
      drugAmount: 4,
      volumeMl: 50,
      direction: "dose_to_rate",
      unitMode: "mcg_kg_min",
      targetDose: 0.1,
      pumpRateMlHr: null,
      accessRoute: "cvc",
    });
    assert.equal(res.valid, false);
    assert.equal(res.rateMlHr, null);
  });

  test("PIV safety alerts trigger for 80 mcg/mL NE and Vasopressin, but safe warning for 16 mcg/mL NE", () => {
    const ne50Piv = computeSmartDrip({
      drugId: "norepinephrine",
      weightKg: 60,
      drugAmount: 4,
      volumeMl: 50,
      direction: "dose_to_rate",
      unitMode: "mcg_kg_min",
      targetDose: 0.1,
      pumpRateMlHr: null,
      accessRoute: "piv",
    });
    assert.ok(ne50Piv.alerts.some((a) => a.severity === "danger"));

    const ne250Piv = computeSmartDrip({
      drugId: "norepinephrine",
      weightKg: 60,
      drugAmount: 4,
      volumeMl: 250,
      direction: "dose_to_rate",
      unitMode: "mcg_kg_min",
      targetDose: 0.1,
      pumpRateMlHr: null,
      accessRoute: "piv",
    });
    assert.equal(
      ne250Piv.alerts.some((a) => a.severity === "danger"),
      false
    );
    assert.ok(ne250Piv.alerts.some((a) => a.severity === "warning"));

    const vasoPiv = computeSmartDrip({
      drugId: "vasopressin",
      weightKg: null,
      drugAmount: 20,
      volumeMl: 50,
      direction: "dose_to_rate",
      unitMode: "units_min",
      targetDose: 0.03,
      pumpRateMlHr: null,
      accessRoute: "piv",
    });
    assert.ok(vasoPiv.alerts.some((a) => a.severity === "danger"));
  });
});

describe("NEE (Kotani 2023) & VIS (Gaies 2010) Engine", () => {
  test("Computes NEE and VIS accurately across multi-agent shock", () => {
    const res = computeNeeAndVis(
      {
        norepinephrine: 0.2,
        epinephrine: 0.1,
        vasopressin: 0.03,
        dopamine: 10,
        dobutamine: 5,
      },
      60
    );
    // NEE = 0.2 + 0.1 + 0.03*2.5 (0.075) + 10/100 (0.1) + 0 = 0.475
    assert.equal(res.nee, 0.475);
    // VIS = 20 + 10 + (0.03/60)*10000 (5) + 10 + 5 = 50
    assert.equal(res.vis, 50);
    assert.equal(res.shockTier, "high");
    assert.equal(res.visTier, "severe");
  });

  test("Triggers SSC 2026 Vasopressin & Hydrocortisone alerts when NE >= 0.25 without Vasopressin", () => {
    const res = computeNeeAndVis(
      {
        norepinephrine: 0.3,
        epinephrine: null,
        vasopressin: null,
        dopamine: null,
        dobutamine: null,
      },
      70
    );
    assert.equal(res.nee, 0.3);
    assert.ok(res.escalationAlerts.some((a) => a.titleEn.includes("Vasopressin")));
    assert.ok(res.escalationAlerts.some((a) => a.titleEn.includes("Hydrocortisone")));
  });

  test("Flags missing weight for Vasopressin VIS calculation", () => {
    const res = computeNeeAndVis(
      {
        norepinephrine: 0.1,
        epinephrine: null,
        vasopressin: 0.03,
        dopamine: null,
        dobutamine: null,
      },
      null
    );
    assert.equal(res.nee, 0.175);
    assert.equal(res.visMissingWeightForVaso, true);
  });
});

describe("Weaning & De-escalation Coach", () => {
  test("Holds weaning if SAH DCI MAP < 90 mmHg", () => {
    const sahHold = evaluateWeaningCoach({
      agents: {
        norepinephrine: 0.1,
        epinephrine: null,
        vasopressin: null,
        dopamine: null,
        dobutamine: null,
      },
      targetProfile: "sah_dci",
      currentMap: 82,
      currentIcp: null,
      stableHours: 4,
      lactateTrend: "normal_or_falling",
      perfusionOk: true,
      sourceVolumeAddressed: true,
    });
    assert.equal(sahHold.readiness, "hold");
  });

  test("Orders Epinephrine before Norepinephrine, and Norepinephrine before Vasopressin", () => {
    const plan = evaluateWeaningCoach({
      agents: {
        norepinephrine: 0.15,
        epinephrine: 0.05,
        vasopressin: 0.03,
        dopamine: null,
        dobutamine: 5,
      },
      targetProfile: "septic",
      currentMap: 72,
      currentIcp: null,
      stableHours: 4,
      lactateTrend: "normal_or_falling",
      perfusionOk: true,
      sourceVolumeAddressed: true,
    });
    assert.equal(plan.readiness, "ready");
    assert.deepEqual(
      plan.orderedSteps.map((s) => s.drugId),
      ["epinephrine", "norepinephrine", "vasopressin", "dobutamine"]
    );
    assert.equal(plan.actionVerdict, "wean");
    assert.equal(plan.agentActions[0].action, "wean");
    assert.equal(plan.agentActions[1].action, "maintain"); // NE waits for Epi
  });

  test("Recommends ESCALATE and adding Vasopressin + Hydrocortisone when NE >= 0.25 and MAP < target", () => {
    const plan = evaluateWeaningCoach({
      agents: {
        norepinephrine: 0.3,
        epinephrine: null,
        vasopressin: null,
        dopamine: null,
        dobutamine: null,
      },
      targetProfile: "septic",
      currentMap: 58,
      currentIcp: null,
      stableHours: 0,
      lactateTrend: "flat_or_rising",
      perfusionOk: false,
      sourceVolumeAddressed: false,
    });
    assert.equal(plan.actionVerdict, "escalate");
    assert.equal(plan.mapStatus, "below");
    assert.ok(plan.regimenChanges.some((c) => c.kind === "add" && c.drugId === "vasopressin"));
    assert.ok(plan.regimenChanges.some((c) => c.kind === "add" && c.titleEn.includes("Hydrocortisone")));
    assert.equal(plan.agentActions[0].action, "maintain"); // Hold solo NE escalation while adding Vaso
  });

  test("Recommends MAINTAIN when MAP is at target but lactate is rising", () => {
    const plan = evaluateWeaningCoach({
      agents: {
        norepinephrine: 0.12,
        epinephrine: null,
        vasopressin: null,
        dopamine: null,
        dobutamine: null,
      },
      targetProfile: "septic",
      currentMap: 68,
      currentIcp: null,
      stableHours: 2,
      lactateTrend: "flat_or_rising",
      perfusionOk: true,
      sourceVolumeAddressed: true,
    });
    assert.equal(plan.actionVerdict, "maintain");
    assert.equal(plan.agentActions[0].action, "maintain");
  });

  test("Recommends STOP when NE is at minimal dose (<= 0.03) and ready to wean", () => {
    const plan = evaluateWeaningCoach({
      agents: {
        norepinephrine: 0.02,
        epinephrine: null,
        vasopressin: null,
        dopamine: null,
        dobutamine: null,
      },
      targetProfile: "septic",
      currentMap: 72,
      currentIcp: null,
      stableHours: 4,
      lactateTrend: "normal_or_falling",
      perfusionOk: true,
      sourceVolumeAddressed: true,
    });
    assert.equal(plan.actionVerdict, "wean");
    assert.equal(plan.agentActions[0].action, "stop");
    assert.ok(plan.regimenChanges.some((c) => c.kind === "remove" && c.drugId === "norepinephrine"));
  });

  test("Recommends WEAN when SAH DCI MAP overshoots > 110 mmHg", () => {
    const plan = evaluateWeaningCoach({
      agents: {
        norepinephrine: 0.15,
        epinephrine: null,
        vasopressin: null,
        dopamine: null,
        dobutamine: null,
      },
      targetProfile: "sah_dci",
      currentMap: 120,
      currentIcp: null,
      stableHours: 0,
      lactateTrend: "normal_or_falling",
      perfusionOk: true,
      sourceVolumeAddressed: true,
    });
    assert.equal(plan.mapStatus, "above");
    assert.equal(plan.actionVerdict, "wean");
    assert.equal(plan.agentActions[0].action, "wean");
  });

  test("SSC 2026: Septic Shock Age >= 65 targets MAP 60-65 mmHg and flags overshoot > 65", () => {
    const atTarget = evaluateWeaningCoach({
      agents: {
        norepinephrine: 0.1,
        epinephrine: null,
        vasopressin: null,
        dopamine: null,
        dobutamine: null,
      },
      targetProfile: "septic_elderly",
      currentMap: 62,
      currentIcp: null,
      stableHours: 3,
      lactateTrend: "normal_or_falling",
      perfusionOk: true,
      sourceVolumeAddressed: true,
    });
    assert.equal(atTarget.mapStatus, "at_target");
    assert.equal(atTarget.actionVerdict, "wean");

    const aboveTarget = evaluateWeaningCoach({
      agents: {
        norepinephrine: 0.15,
        epinephrine: null,
        vasopressin: null,
        dopamine: null,
        dobutamine: null,
      },
      targetProfile: "septic_elderly",
      currentMap: 72,
      currentIcp: null,
      stableHours: 0,
      lactateTrend: "normal_or_falling",
      perfusionOk: true,
      sourceVolumeAddressed: true,
    });
    assert.equal(aboveTarget.mapStatus, "above");
    assert.equal(aboveTarget.actionVerdict, "wean");
  });

  test("ACC 2025 CS: Recommends Shock Team/tMCS in SCAI D/E and flags Dobutamine > 10 mcg/kg/min", () => {
    const plan = evaluateWeaningCoach({
      agents: {
        norepinephrine: 0.3,
        epinephrine: null,
        vasopressin: null,
        dopamine: null,
        dobutamine: 12,
      },
      targetProfile: "cardiogenic",
      currentMap: 58,
      currentIcp: null,
      stableHours: 0,
      lactateTrend: "flat_or_rising",
      perfusionOk: false,
      sourceVolumeAddressed: true,
    });
    assert.equal(plan.actionVerdict, "escalate");
    assert.ok(plan.regimenChanges.some((c) => c.titleEn.includes("tMCS")));
    assert.ok(plan.regimenChanges.some((c) => c.titleEn.includes("Dobutamine > 10")));
    assert.equal(
      plan.regimenChanges.some((c) => c.titleEn.includes("Hydrocortisone")),
      false
    );
  });
});
