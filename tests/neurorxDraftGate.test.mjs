// Unit tests for NeuroRx Draft Gate & Safety Lockout (User Story 5)
// Reference: SPEC-neurorx.md Section 1 (User Story 5), Section 8 & NEURORX-GUARDRAILS.md (G1.5, G2.3)
// Pure JavaScript ES module for Node.js native test runner

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { resolveRegimen } from "../src/lib/neurorx/dosing.ts";

describe("NeuroRx Draft Gate & Safety Lockout (User Story 5)", () => {
  const verifiedDrug = {
    id: "test-verified-drug",
    generic_name: "test-verified",
    tall_man: { value: "test-VERIFIED", refs: [] },
    classes: ["antiepileptic"],
    subspecialties: ["epilepsy"],
    vn_products: { value: [{ brand: "TestBrand", strength: "500 mg", form: "tablet" }], refs: [] },
    bhyt: { value: { listed: true }, refs: [] },
    regimens: [
      {
        id: "reg-1",
        indication: "Focal Seizures",
        setting: "maintenance_outpatient",
        route: "PO",
        refs: [],
        dose: {
          kind: "fixed",
          amount: 500,
          unit: "mg",
          frequency: "twice daily",
          max_single: 1500,
          max_daily: 3000,
        },
      },
    ],
    renal_basis: { value: "cg_abw", refs: [] },
    status: "verified",
    verification: {
      verified_by: "Dr. Admin",
      verified_at: "2026-11-11",
      content_hash: "mock-valid-hash",
    },
  };

  const draftDrug = {
    ...verifiedDrug,
    id: "test-draft-drug",
    status: "draft",
    verification: {
      verified_by: null,
      verified_at: null,
      content_hash: null,
    },
  };

  const patientWithFullContext = {
    ageYears: 45,
    sex: "male",
    weightKg: 70,
    heightCm: 175,
    scr: { value: 90, unit: "umol/L" },
    isPediatric: false,
    onHemodialysis: false,
  };

  const mockRenalResult = {
    value: 85,
    basisUsed: "cg_abw",
    label: "Cockcroft-Gault CrCl: 85 mL/min",
  };

  test("verified drug calculates dosage normally when inputs are valid", () => {
    const res = resolveRegimen(
      verifiedDrug,
      verifiedDrug.regimens[0],
      patientWithFullContext,
      mockRenalResult
    );
    assert.equal(res.state, "computed");
    assert.equal(res.amount, 500);
    assert.equal(res.unit, "mg");
  });

  test("draft drug is strictly locked with state 'blocked_draft' and NO numbers", () => {
    const res = resolveRegimen(
      draftDrug,
      draftDrug.regimens[0],
      patientWithFullContext,
      mockRenalResult
    );

    // Rule: Must be blocked_draft
    assert.equal(res.state, "blocked_draft");

    // Rule: amount must be undefined (never a number)
    assert.equal(res.amount, undefined);
    assert.equal(res.unit, undefined);
    assert.equal(res.frequency, undefined);

    // Rule: ruleText must not contain computed numbers
    assert.match(res.ruleText, /pending verification/i);

    // Rule: explanation contains warning
    assert.ok(res.explanation.some((msg) => /draft/i.test(msg)));
  });

  test("draft drug remains locked even with extreme weight or hemodialysis flags", () => {
    const extremePatient = {
      ...patientWithFullContext,
      weightKg: 120,
      onHemodialysis: true,
    };

    const res = resolveRegimen(
      draftDrug,
      draftDrug.regimens[0],
      extremePatient,
      mockRenalResult
    );

    assert.equal(res.state, "blocked_draft");
    assert.equal(res.amount, undefined);
  });
});
