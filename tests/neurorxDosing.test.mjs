import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveRegimen } from "../src/lib/neurorx/dosing.ts";
import { computeInfusion } from "../src/lib/neurorx/infusion.ts";
import { toProductUnits, parseProductStrength } from "../src/lib/neurorx/formulation.ts";
import { buildOrderText, CLINICAL_DISCLAIMER } from "../src/lib/neurorx/orderText.ts";

describe("NeuroRx Dosing, Infusion, Formulation & Order Text Engine (T5)", () => {
  // Test fixture drug (clearly artificial data to ensure zero-hallucination compliance)
  const fixtureDrugVerified = {
    id: "test-drug-a",
    generic_name: "testdrug",
    tall_man: { value: "testDRUG", refs: [] },
    classes: ["Test Class"],
    subspecialties: ["stroke"],
    vn_products: { value: null, refs: [] },
    bhyt: { value: null, refs: [] },
    regimens: [],
    renal_basis: { value: "cg_abw", refs: [] },
    hepatic: { value: null, refs: [] },
    black_box: { value: null, refs: [] },
    mg_safety: { value: "safe", refs: [] },
    ng_tube: { value: null, refs: [] },
    pgx: { value: null, refs: [] },
    ae_tags: { value: [], refs: [] },
    enzyme_profile: { value: {}, refs: [] },
    status: "verified",
    verification: {
      verified_by: "Dr. Tester",
      verified_at: "2026-11-11",
      content_hash: "hash",
    },
  };

  const fixtureDrugDraft = {
    ...fixtureDrugVerified,
    status: "draft",
  };

  const sampleWeightRegimen = {
    id: "reg-weight",
    indication: "Test Acute Indication",
    setting: "acute_inpatient",
    route: "IV",
    refs: [],
    dose: {
      kind: "per_kg",
      amount: 10,
      unit: "mg",
      frequency: "single dose",
      max_single: 500, // Cap at 500 mg
    },
  };

  const sampleRenalRegimen = {
    id: "reg-renal",
    indication: "Test Maintenance Indication",
    setting: "maintenance_outpatient",
    route: "PO",
    refs: [],
    dose: {
      kind: "fixed",
      amount: 100,
      unit: "mg",
      frequency: "once daily",
    },
    renal_bands: [
      {
        min: 50,
        max: null,
        dose_text: "100 mg once daily",
        refs: [],
      },
      {
        min: 15,
        max: 50,
        dose_text: "50 mg once daily",
        dose: {
          kind: "fixed",
          amount: 50,
          unit: "mg",
          frequency: "once daily",
        },
        refs: [],
      },
      {
        min: null,
        max: 15,
        dose_text: "Avoid use",
        refs: [],
      },
    ],
    hemodialysis: {
      value: "25 mg post-dialysis",
      refs: [],
    },
  };

  describe("resolveRegimen: Rules & Gates", () => {
    it("RULE 1: Must block calculation for draft drug records", () => {
      const res = resolveRegimen(
        fixtureDrugDraft,
        sampleWeightRegimen,
        { weightKg: 70, isPediatric: false },
        { value: 80, basisUsed: "cg_abw", label: "Normal" }
      );

      assert.equal(res.state, "blocked_draft");
      assert.equal(res.amount, undefined);
      assert.ok(res.ruleText.includes("Pending verification"));
    });

    it("RULE 2: Weight-based dosing must return 'needs_input' if weight is missing", () => {
      const res = resolveRegimen(
        fixtureDrugVerified,
        sampleWeightRegimen,
        { isPediatric: false }, // No weightKg
        { value: 80, basisUsed: "cg_abw", label: "Normal" }
      );

      assert.equal(res.state, "needs_input");
      assert.equal(res.amount, undefined);
      assert.ok(res.ruleText.includes("10 mg/kg"));
    });

    it("should compute weight-based dose correctly: 10 mg/kg * 40 kg = 400 mg", () => {
      const res = resolveRegimen(
        fixtureDrugVerified,
        sampleWeightRegimen,
        { weightKg: 40, isPediatric: false },
        { value: 80, basisUsed: "cg_abw", label: "Normal" }
      );

      assert.equal(res.state, "computed");
      assert.equal(res.amount, 400);
      assert.equal(res.capped, false);
      assert.equal(res.ruleText, "400 mg single dose");
    });

    it("RULE: Strictly enforce maximum single dose cap without exceeding it", () => {
      // 10 mg/kg * 70 kg = 700 mg -> must be capped at 500 mg
      const res = resolveRegimen(
        fixtureDrugVerified,
        sampleWeightRegimen,
        { weightKg: 70, isPediatric: false },
        { value: 80, basisUsed: "cg_abw", label: "Normal" }
      );

      assert.equal(res.state, "computed");
      assert.equal(res.amount, 500);
      assert.equal(res.capped, true);
      assert.ok(res.cappedReason.includes("capped at maximum single dose of 500 mg"));
    });

    it("should select the exact matching renal band based on CrCl boundaries", () => {
      // Test CrCl = 30 (falls into band [15, 50))
      const res = resolveRegimen(
        fixtureDrugVerified,
        sampleRenalRegimen,
        { weightKg: 70, isPediatric: false },
        { value: 30, basisUsed: "cg_abw", label: "Moderate" }
      );

      assert.equal(res.state, "computed");
      assert.equal(res.amount, 50);
      assert.ok(res.renalBandMatched !== undefined);
      assert.equal(res.renalBandMatched.dose_text, "50 mg once daily");
    });

    it("should attach hemodialysis note when patient onHemodialysis is true", () => {
      const res = resolveRegimen(
        fixtureDrugVerified,
        sampleRenalRegimen,
        { weightKg: 70, onHemodialysis: true, isPediatric: false },
        { value: 10, basisUsed: "cg_abw", label: "ESRD" }
      );

      assert.equal(res.hemodialysisNote, "25 mg post-dialysis");
    });
  });

  describe("computeInfusion", () => {
    it("should calculate infusion volume and pump rate: 100 mg at 5 mg/mL over 30 mins", () => {
      const spec = {
        diluent: "NaCl 0.9%",
        final_concentration: "5 mg/mL",
        duration_min: 30,
      };

      const result = computeInfusion(100, "mg", spec);
      assert.ok(result !== null);
      // Volume = 100 / 5 = 20 mL
      assert.equal(result.volumeMl, 20);
      // Rate = 20 mL / 0.5 hour = 40 mL/h
      assert.equal(result.rateMlPerHour, 40);
      assert.equal(result.diluent, "NaCl 0.9%");
    });

    it("should return null if spec is omitted", () => {
      assert.equal(computeInfusion(100, "mg", undefined), null);
    });
  });

  describe("toProductUnits & parseProductStrength", () => {
    it("should parse product strength correctly", () => {
      assert.equal(parseProductStrength("500 mg"), 500);
      assert.equal(parseProductStrength("0.25 mg"), 0.25);
      assert.equal(parseProductStrength("invalid"), null);
    });

    it("should convert dose to integer product units: 1000 mg -> 2 x 500 mg tablets", () => {
      const products = [
        { brand: "Keppra", strength: "500 mg", form: "Film-coated tablet" },
        { brand: "Keppra", strength: "250 mg", form: "Film-coated tablet" },
      ];

      const res = toProductUnits(1000, products);
      assert.equal(res.length, 2);
      assert.equal(res[0].units, 2);
      assert.equal(res[0].remainderMg, 0);
      assert.equal(res[0].displayText, "2 × Keppra (500 mg)");

      assert.equal(res[1].units, 4);
      assert.equal(res[1].displayText, "4 × Keppra (250 mg)");
    });

    it("should handle half tablets: 750 mg with 500 mg tablet", () => {
      const products = [{ brand: "Keppra", strength: "500 mg", form: "Tablet" }];
      const res = toProductUnits(750, products);
      assert.equal(res.length, 1);
      assert.equal(res[0].units, 1.5);
      assert.equal(res[0].remainderMg, 0);
      assert.equal(res[0].displayText, "1.5 × Keppra (500 mg)");
    });
  });

  describe("buildOrderText & Privacy Guidelines", () => {
    it("should generate clean EHR order snippet with mandatory disclaimer and no patient identifiers", () => {
      const resolution = {
        state: "computed",
        amount: 500,
        unit: "mg",
        frequency: "twice daily",
        ruleText: "500 mg twice daily",
        explanation: [],
      };

      const out = buildOrderText(
        fixtureDrugVerified,
        { id: "reg-1", indication: "Epilepsy", route: "PO", refs: [], dose: null },
        resolution,
        "1 × Keppra (500 mg)"
      );

      assert.ok(out.singleLine.includes("testDRUG 500 mg twice daily (PO)"));
      assert.ok(out.singleLine.includes(CLINICAL_DISCLAIMER));
      assert.ok(out.multiLine.includes("Indication: Epilepsy"));
      assert.ok(out.multiLine.includes("Formulation: 1 × Keppra (500 mg)"));
      // Ensure zero patient identifiers
      assert.equal(out.singleLine.includes("patient"), false);
      assert.equal(out.multiLine.includes("patient"), false);
    });
  });
});
