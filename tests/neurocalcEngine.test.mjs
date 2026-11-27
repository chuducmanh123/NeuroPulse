import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { evaluateScale } from "../src/lib/neurocalc/engine.ts";
import {
  evaluateExpression,
  validateExpression,
} from "../src/lib/neurocalc/expression.ts";
import {
  evaluateFormula,
  evaluateFormulaDetailed,
} from "../src/lib/neurocalc/formulas.ts";
import { computeRecordContentHashSync } from "../src/lib/neurocalc/integrity.ts";

function sealVerified(scale) {
  const copy = structuredClone(scale);
  copy.status = "verified";
  copy.verification = {
    verified_by: "Test Reviewer",
    verified_at: "2026-11-26T00:00:00.000Z",
    content_hash: computeRecordContentHashSync(copy),
  };
  return copy;
}

function makePointSumScale() {
  return sealVerified({
    id: "test-sum",
    schema_version: 1,
    metadata: {
      name: "Test Sum Scale",
      short_name: "TSS",
      aliases: [],
      subspecialties: ["Stroke"],
      kind: "point_sum",
      summary: "Test sum scale",
    },
    items: [
      {
        kind: "select",
        id: "loc",
        code: "1a",
        label: "LOC",
        required: true,
        options: [
          { id: "o0", label: "Alert", points: 0 },
          { id: "o2", label: "Stuporous", points: 2 },
        ],
      },
      {
        kind: "select",
        id: "arm",
        code: "5a",
        label: "Left Arm",
        required: true,
        options: [
          { id: "o0", label: "No drift", points: 0 },
          { id: "o3", label: "No effort against gravity", points: 3 },
          { id: "un", label: "Amputation (UN)", points: null, is_untestable: true },
        ],
      },
    ],
    scoring: {
      method: "sum",
      min_score: 0,
      max_score: 5,
      unit: "points",
      precision: 0,
      untestable_policy: "exclude_and_flag",
      subscores: [
        { id: "motor", label: "Motor", item_ids: ["arm"] },
      ],
    },
    interpretation: [
      {
        id: "mild",
        min: 0,
        max: 2,
        label: "Mild",
        severity: "mild",
        summary: "Mild range",
        refs: [{ source_id: "r1", locator: "p.1" }],
      },
      {
        id: "mod",
        min: 3,
        max: 5,
        label: "Moderate",
        severity: "moderate",
        summary: "Moderate range",
        refs: [{ source_id: "r1", locator: "p.1" }],
      },
    ],
    assessment_guides: [],
    references: [{ id: "r1", citation: "Ref 1", year: 2024 }],
    status: "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  });
}

function makeOrdinalScale() {
  return sealVerified({
    id: "test-ordinal",
    schema_version: 1,
    metadata: {
      name: "Test Ordinal",
      short_name: "TO",
      aliases: [],
      subspecialties: ["Stroke"],
      kind: "ordinal_grade",
      summary: "Ordinal",
    },
    items: [
      {
        kind: "select",
        id: "grade",
        label: "Grade",
        required: true,
        options: [
          { id: "g0", label: "Grade 0", points: 0 },
          { id: "g3", label: "Grade 3", points: 3 },
        ],
      },
    ],
    scoring: { method: "single_select", min_score: 0, max_score: 3, precision: 0 },
    interpretation: [
      {
        id: "b0",
        min: 0,
        max: 2,
        label: "Independent",
        severity: "normal",
        summary: "Independent",
        refs: [{ source_id: "r1", locator: "p.1" }],
      },
      {
        id: "b3",
        min: 3,
        max: 3,
        label: "Dependent",
        severity: "moderate",
        summary: "Moderate disability",
        refs: [{ source_id: "r1", locator: "p.1" }],
      },
    ],
    assessment_guides: [],
    references: [{ id: "r1", citation: "Ref 1", year: 2024 }],
    status: "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  });
}

describe("NeuroCalc Scoring Engine & Formulas (T2)", () => {
  it("handles partial, complete, subscore, and UN untestable items in point_sum scales", () => {
    const scale = makePointSumScale();

    const partial = evaluateScale(scale, { loc: "o2" });
    assert.equal(partial.isComplete, false);
    assert.equal(partial.score, 2);
    assert.equal(partial.band, null);
    assert.equal(partial.answeredCount, 1);
    assert.equal(partial.requiredCount, 2);

    const complete = evaluateScale(scale, { loc: "o2", arm: "o3" });
    assert.equal(complete.isComplete, true);
    assert.equal(complete.score, 5);
    assert.equal(complete.band?.id, "mod");
    assert.equal(complete.subscores[0].score, 3);

    const withUn = evaluateScale(scale, { loc: "o2", arm: "un" });
    assert.equal(withUn.isComplete, true);
    assert.equal(withUn.score, 2);
    assert.equal(withUn.band?.id, "mild");
    assert.deepEqual(withUn.untestableItems.map((u) => u.itemId), ["arm"]);
  });

  it("evaluates ordinal single_select scales", () => {
    const scale = makeOrdinalScale();
    assert.equal(evaluateScale(scale, {}).score, null);
    const res = evaluateScale(scale, { grade: "g3" });
    assert.equal(res.isComplete, true);
    assert.equal(res.score, 3);
    assert.equal(res.band?.id, "b3");
  });

  it("evaluates abc_2 formula with cm/mm unit conversions and bounds validation", () => {
    const abc2 = sealVerified({
      id: "test-abc2",
      schema_version: 1,
      metadata: {
        name: "ABC/2",
        short_name: "ABC/2",
        aliases: [],
        subspecialties: ["Stroke"],
        kind: "formula",
        summary: "ICH volume",
      },
      items: [
        {
          kind: "numeric",
          id: "a",
          label: "A",
          required: true,
          canonical_unit: "cm",
          units: [
            { unit: "cm", label: "cm", to_canonical_factor: 1 },
            { unit: "mm", label: "mm", to_canonical_factor: 0.1 },
          ],
          min_canonical: 0.1,
          max_canonical: 20,
        },
        {
          kind: "numeric",
          id: "b",
          label: "B",
          required: true,
          canonical_unit: "cm",
          units: [
            { unit: "cm", label: "cm", to_canonical_factor: 1 },
            { unit: "mm", label: "mm", to_canonical_factor: 0.1 },
          ],
          min_canonical: 0.1,
          max_canonical: 20,
        },
        {
          kind: "numeric",
          id: "c",
          label: "C",
          required: true,
          canonical_unit: "cm",
          units: [
            { unit: "cm", label: "cm", to_canonical_factor: 1 },
            { unit: "mm", label: "mm", to_canonical_factor: 0.1 },
          ],
          min_canonical: 0.1,
          max_canonical: 20,
        },
      ],
      scoring: {
        method: "formula",
        min_score: 0,
        max_score: null,
        unit: "mL",
        precision: 1,
        formula_id: "abc_2",
      },
      interpretation: [
        {
          id: "vol",
          min: 0,
          max: null,
          label: "Volume",
          severity: "info",
          summary: "Computed",
          refs: [{ source_id: "r1", locator: "Eq 1" }],
        },
      ],
      assessment_guides: [],
      references: [{ id: "r1", citation: "Kothari 1996", year: 1996 }],
      status: "draft",
      verification: { verified_by: null, verified_at: null, content_hash: null },
    });

    const mmRes = evaluateScale(abc2, {
      a: { value: 50, unit: "mm" },
      b: { value: 40, unit: "mm" },
      c: { value: 30, unit: "mm" },
    });
    assert.equal(mmRes.isComplete, true);
    assert.equal(mmRes.score, 30.0);

    const oob = evaluateScale(abc2, { a: 25, b: 4, c: 3 });
    assert.equal(oob.isComplete, false);
    assert.equal(oob.score, null);
    assert.equal(oob.fieldErrors[0].itemId, "a");
  });

  it("evaluates corrected_na_katz, corrected_phenytoin_winter_tozer, and serum_osmolality", () => {
    const naScale = sealVerified({
      id: "test-na",
      schema_version: 1,
      metadata: {
        name: "Corrected Na",
        short_name: "cNa",
        aliases: [],
        subspecialties: ["Neurocritical Care"],
        kind: "formula",
        summary: "Katz",
      },
      items: [
        {
          kind: "numeric",
          id: "measured_na",
          label: "Na",
          required: true,
          canonical_unit: "mEq/L",
          units: [{ unit: "mEq/L", label: "mEq/L", to_canonical_factor: 1 }],
          min_canonical: 90,
          max_canonical: 190,
        },
        {
          kind: "numeric",
          id: "glucose",
          label: "Glucose",
          required: true,
          canonical_unit: "mg/dL",
          units: [
            { unit: "mg/dL", label: "mg/dL", to_canonical_factor: 1 },
            { unit: "mmol/L", label: "mmol/L", to_canonical_factor: 18.0182 },
          ],
          min_canonical: 10,
          max_canonical: 2000,
        },
      ],
      scoring: {
        method: "formula",
        min_score: 90,
        max_score: 250,
        unit: "mEq/L",
        precision: 1,
        formula_id: "corrected_na_katz",
      },
      interpretation: [
        {
          id: "all",
          min: 0,
          max: null,
          label: "Corrected Na",
          severity: "info",
          summary: "Katz",
          refs: [{ source_id: "r1", locator: "Eq 1" }],
        },
      ],
      assessment_guides: [],
      references: [{ id: "r1", citation: "Katz 1973", year: 1973 }],
      status: "draft",
      verification: { verified_by: null, verified_at: null, content_hash: null },
    });

    assert.equal(
      evaluateScale(naScale, { measured_na: 130, glucose: 400 }).score,
      134.8
    );
    // Hypoglycemia clamp (<100 mg/dL adds 0)
    assert.equal(
      evaluateScale(naScale, { measured_na: 130, glucose: 70 }).score,
      130.0
    );

    const phenScale = sealVerified({
      id: "test-phenytoin",
      schema_version: 1,
      metadata: {
        name: "Corrected Phenytoin",
        short_name: "cPHT",
        aliases: [],
        subspecialties: ["Epilepsy"],
        kind: "formula",
        summary: "Winter-Tozer",
      },
      items: [
        {
          kind: "numeric",
          id: "measured_phenytoin",
          label: "Phenytoin",
          required: true,
          canonical_unit: "mcg/mL",
          units: [{ unit: "mcg/mL", label: "mcg/mL", to_canonical_factor: 1 }],
          min_canonical: 0.5,
          max_canonical: 100,
        },
        {
          kind: "numeric",
          id: "albumin",
          label: "Albumin",
          required: true,
          canonical_unit: "g/dL",
          units: [
            { unit: "g/dL", label: "g/dL", to_canonical_factor: 1 },
            { unit: "g/L", label: "g/L", to_canonical_factor: 0.1 },
          ],
          min_canonical: 0.5,
          max_canonical: 6.5,
        },
        {
          kind: "select",
          id: "renal_coefficient",
          label: "Renal status",
          required: true,
          options: [
            { id: "normal", label: "Normal / CrCl >= 10", points: 0.2 },
            { id: "esrd", label: "ESRD / CrCl < 10", points: 0.1 },
          ],
        },
      ],
      scoring: {
        method: "formula",
        min_score: 0,
        max_score: null,
        unit: "mcg/mL",
        precision: 1,
        formula_id: "corrected_phenytoin_winter_tozer",
      },
      interpretation: [
        {
          id: "all",
          min: 0,
          max: null,
          label: "Corrected Phenytoin",
          severity: "info",
          summary: "Winter-Tozer",
          refs: [{ source_id: "r1", locator: "Eq 1" }],
        },
      ],
      assessment_guides: [],
      references: [{ id: "r1", citation: "Winter-Tozer", year: 1988 }],
      status: "draft",
      verification: { verified_by: null, verified_at: null, content_hash: null },
    });

    assert.equal(
      evaluateScale(phenScale, {
        measured_phenytoin: 8,
        albumin: { value: 20, unit: "g/L" },
        renal_coefficient: "normal",
      }).score,
      16.0
    );
    assert.equal(
      evaluateScale(phenScale, {
        measured_phenytoin: 8,
        albumin: 2.0,
        renal_coefficient: "esrd",
      }).score,
      26.7
    );

    const osmScale = sealVerified({
      id: "test-osm",
      schema_version: 1,
      metadata: {
        name: "Osmolality",
        short_name: "Osm",
        aliases: [],
        subspecialties: ["Neurocritical Care"],
        kind: "formula",
        summary: "Serum osmolality",
      },
      items: [
        {
          kind: "numeric",
          id: "sodium",
          label: "Na",
          required: true,
          canonical_unit: "mEq/L",
          units: [{ unit: "mEq/L", label: "mEq/L", to_canonical_factor: 1 }],
          min_canonical: 90,
          max_canonical: 190,
        },
        {
          kind: "numeric",
          id: "glucose",
          label: "Glucose",
          required: true,
          canonical_unit: "mg/dL",
          units: [{ unit: "mg/dL", label: "mg/dL", to_canonical_factor: 1 }],
          min_canonical: 10,
          max_canonical: 2000,
        },
        {
          kind: "numeric",
          id: "bun",
          label: "BUN",
          required: true,
          canonical_unit: "mg/dL",
          units: [{ unit: "mg/dL", label: "mg/dL", to_canonical_factor: 1 }],
          min_canonical: 1,
          max_canonical: 250,
        },
        {
          kind: "numeric",
          id: "ethanol",
          label: "Ethanol (optional)",
          required: false,
          canonical_unit: "mg/dL",
          units: [{ unit: "mg/dL", label: "mg/dL", to_canonical_factor: 1 }],
          min_canonical: 0,
          max_canonical: 800,
        },
      ],
      scoring: {
        method: "formula",
        min_score: 150,
        max_score: null,
        unit: "mOsm/kg",
        precision: 1,
        formula_id: "serum_osmolality",
      },
      interpretation: [
        {
          id: "all",
          min: 0,
          max: null,
          label: "Osmolality",
          severity: "info",
          summary: "Calculated",
          refs: [{ source_id: "r1", locator: "Eq 1" }],
        },
      ],
      assessment_guides: [],
      references: [{ id: "r1", citation: "Ref", year: 2024 }],
      status: "draft",
      verification: { verified_by: null, verified_at: null, content_hash: null },
    });

    assert.equal(
      evaluateScale(osmScale, { sodium: 140, glucose: 90, bun: 14 }).score,
      290.0
    );
    assert.equal(
      evaluateScale(osmScale, { sodium: 140, glucose: 90, bun: 14, ethanol: 92 }).score,
      310.0
    );
  });

  it("blocks numeric output on draft or hash-mismatched scales unless allowDraftPreview is set", () => {
    const scale = makePointSumScale();
    scale.status = "draft";

    const gated = evaluateScale(scale, { loc: "o2", arm: "o3" });
    assert.equal(gated.isGated, true);
    assert.equal(gated.score, null);
    assert.equal(gated.band, null);

    const preview = evaluateScale(
      scale,
      { loc: "o2", arm: "o3" },
      { allowDraftPreview: true }
    );
    assert.equal(preview.isGated, false);
    assert.equal(preview.score, 5);
  });

  it("validates and evaluates safe math expressions and custom scoring.expression", () => {
    assert.equal(validateExpression("(a * b * c) / 2", new Set(["a", "b", "c"])).valid, true);
    assert.equal(
      validateExpression("a + unknown_var", new Set(["a", "b"])).valid,
      false
    );
    assert.equal(validateExpression("10 / (2 + 3").valid, false);

    assert.equal(evaluateExpression("2 + 3 * 4 ^ 2", {}), 50);
    assert.equal(evaluateExpression("if(x >= 10, x * 1.5, x / 2)", { x: 12 }), 18);
    assert.equal(evaluateExpression("if(x >= 10, x * 1.5, x / 2)", { x: 8 }), 4);
    assert.equal(evaluateExpression("round(sqrt(2), 2)", {}), 1.41);
    assert.equal(evaluateExpression("10 / x", { x: 0 }), null);

    const customScale = sealVerified({
      id: "custom-expr-scale",
      schema_version: 1,
      metadata: {
        name: "Custom Expression Formula",
        short_name: "CEF",
        aliases: [],
        subspecialties: ["Neurocritical Care"],
        kind: "formula",
        summary: "Custom math test",
      },
      items: [
        {
          kind: "numeric",
          id: "x",
          label: "X",
          required: true,
          canonical_unit: "mg/dL",
          units: [{ unit: "mg/dL", label: "mg/dL", to_canonical_factor: 1 }],
          min_canonical: 1,
          max_canonical: 100,
        },
        {
          kind: "numeric",
          id: "y",
          label: "Y (optional)",
          required: false,
          canonical_unit: "mg/dL",
          units: [{ unit: "mg/dL", label: "mg/dL", to_canonical_factor: 1 }],
          min_canonical: 0,
          max_canonical: 100,
        },
      ],
      scoring: {
        method: "formula",
        min_score: 0,
        max_score: null,
        precision: 2,
        expression: "(x * 2.5) + y / 2",
      },
      interpretation: [
        {
          id: "all",
          min: 0,
          max: null,
          label: "Computed",
          severity: "info",
          summary: "Custom expression output",
          refs: [{ source_id: "r1", locator: "Eq 1" }],
        },
      ],
      assessment_guides: [],
      references: [{ id: "r1", citation: "Ref 1", year: 2024 }],
      status: "draft",
      verification: { verified_by: null, verified_at: null, content_hash: null },
    });

    assert.equal(evaluateScale(customScale, { x: 10 }).score, 25);
    assert.equal(evaluateScale(customScale, { x: 10, y: 5 }).score, 27.5);
  });

  it("evaluates all 8 published cardiovascular risk models accurately", () => {
    // 1. SCORE2 (55yo Male, Low, non-smoker, SBP 130, TC 5.5, HDL 1.3 -> ~4.0%)
    const s2 = evaluateFormula("score2", {
      sex: 1,
      region: 0,
      age: 55,
      smoker: 0,
      sbp: 130,
      total_chol: 5.5,
      hdl_chol: 1.3,
    });
    assert.ok(s2 !== null && Math.abs(s2 - 4.0) < 0.15);

    // 2. SCORE2-OP (73yo Female, Low, non-smoker, no DM, SBP 130, TC 5.0, HDL 1.5 -> ~6.4%)
    const s2op = evaluateFormula("score2_op", {
      sex: 0,
      region: 0,
      age: 73,
      smoker: 0,
      diabetes: 0,
      sbp: 130,
      total_chol: 5.0,
      hdl_chol: 1.5,
    });
    assert.ok(s2op !== null && s2op > 5 && s2op < 8);

    // 3. SCORE2-Diabetes (ESC published example -> 8.4%)
    const s2dm = evaluateFormula("score2_diabetes", {
      sex: 1,
      region: 0,
      age: 60,
      diabetes_age: 60,
      smoker: 0,
      sbp: 140,
      total_chol: 5.5,
      hdl_chol: 1.3,
      hba1c: 50,
      egfr: 90,
    });
    assert.equal(Number(s2dm.toFixed(1)), 8.4);

    // 4. ASCVD PCE (Goff 2014 Table A worked example -> 5.4%)
    const ascvd = evaluateFormula("ascvd_pce", {
      sex_race: 2,
      age: 55,
      total_chol: 213,
      hdl_chol: 50,
      sbp: 120,
      bp_treated: 0,
      smoker: 0,
      diabetes: 0,
    });
    assert.equal(Number(ascvd.toFixed(1)), 5.4);

    // 5. SMART2 (requires >=1 disease location)
    assert.equal(
      evaluateFormula("smart2", {
        region: 0,
        age: 62,
        sex: 1,
        smoker: 0,
        diabetes: 0,
        sbp: 135,
        total_chol: 4.8,
        hdl_chol: 1.3,
        egfr: 80,
        hscrp: 1.8,
        years_since_diagnosis: 2,
        cad: 0,
        cerebrovascular: 0,
        pad: 0,
        aaa: 0,
        antithrombotic: 1,
      }),
      null
    );
    const smart = evaluateFormula("smart2", {
      region: 0,
      age: 62,
      sex: 1,
      smoker: 0,
      diabetes: 0,
      sbp: 135,
      total_chol: 4.8,
      hdl_chol: 1.3,
      egfr: 80,
      hscrp: 1.8,
      years_since_diagnosis: 2,
      cad: 0,
      cerebrovascular: 1,
      pad: 0,
      aaa: 0,
      antithrombotic: 1,
    });
    assert.ok(smart !== null && smart > 10 && smart < 20);

    // 6. PREVENT 10y Total CVD (55yo Female baseline -> 1 / (1 + exp(3.307728)) = 3.53%)
    const prevF = evaluateFormula("prevent_10y_cvd", {
      sex: 0,
      age: 55,
      total_chol: 4.8,
      hdl_chol: 1.3,
      sbp: 130,
      egfr: 90,
      diabetes: 0,
      smoker: 0,
      bp_treated: 0,
      statin: 0,
    });
    assert.equal(Number(prevF.toFixed(1)), 3.5);

    // 7. GRACE 2.0 1-year mortality
    const g2 = evaluateFormula("grace_2_1y_death", {
      age: 90,
      heart_rate: 92,
      sbp: 139,
      creatinine: 1.06,
      killip: 1,
      cardiac_arrest: 0,
      positive_enzymes: 1,
      st_deviation: 1,
    });
    assert.ok(g2 !== null && g2 > 15 && g2 < 30);

    // 8. RF-CL (Male 70-80, symptom 3, 4 RF -> 39%)
    assert.equal(
      evaluateFormula("rf_cl", {
        sex: 1,
        age_group: 4,
        symptom_score: 2,
        rf_family_hx: 1,
        rf_smoking: 1,
        rf_dyslipidemia: 1,
        rf_hypertension: 1,
        rf_diabetes: 0,
      }),
      39
    );
  });

  it("evaluates Cockcroft-Gault CrCl and CKD-EPI 2021 eGFR formulas", () => {
    const cgMale = evaluateFormula("cockcroft_gault_crcl", {
      sex_factor: 1,
      age: 60,
      weight: 70,
      creatinine: 1.0,
    });
    assert.equal(Number(cgMale.toFixed(1)), 77.8);

    const cgFemale = evaluateFormula("cockcroft_gault_crcl", {
      sex_factor: 0.85,
      age: 75,
      weight: 60,
      creatinine: 1.5,
    });
    assert.equal(Number(cgFemale.toFixed(1)), 30.7);

    assert.equal(
      evaluateFormula("cockcroft_gault_crcl", {
        sex_factor: 1,
        age: 60,
        weight: 70,
        creatinine: 0,
      }),
      null
    );

    const egfrMale = evaluateFormula("ckd_epi_2021_egfr", {
      sex: 1,
      age: 60,
      creatinine: 1.0,
    });
    assert.equal(Number(egfrMale.toFixed(1)), 86.2);

    const egfrFemale = evaluateFormula("ckd_epi_2021_egfr", {
      sex: 0,
      age: 50,
      creatinine: 0.7,
    });
    assert.equal(Number(egfrFemale.toFixed(1)), 105.3);
  });

  it("evaluates full AHA PREVENT 10-year and 30-year suite with optional BMI, uACR, HbA1c, and SDI", () => {
    const baseFemale = {
      sex: 0,
      age: 50,
      total_chol: 200 * 0.02586,
      hdl_chol: 45 * 0.02586,
      sbp: 160,
      egfr: 90,
      diabetes: 1,
      smoker: 0,
      bp_treated: 1,
      statin: 0,
      bmi: 35,
    };

    const getMetric = (res, id) =>
      res.outputs?.find((m) => m.id === id)?.value ?? null;

    // 1. Official preventr Base model benchmark (10y & 30y x 5 outcomes)
    const baseRes = evaluateFormulaDetailed("prevent", baseFemale);
    assert.equal(baseRes.modelLabel, "Base Model");
    assert.equal(Number((getMetric(baseRes, "cvd_10y") / 100).toFixed(3)), 0.147);
    assert.equal(Number((getMetric(baseRes, "ascvd_10y") / 100).toFixed(3)), 0.092);
    assert.equal(Number((getMetric(baseRes, "hf_10y") / 100).toFixed(3)), 0.081);
    assert.equal(Number((getMetric(baseRes, "chd_10y") / 100).toFixed(3)), 0.044);
    assert.equal(Number((getMetric(baseRes, "stroke_10y") / 100).toFixed(3)), 0.054);
    assert.equal(Number((getMetric(baseRes, "cvd_30y") / 100).toFixed(3)), 0.53);
    assert.equal(Number((getMetric(baseRes, "ascvd_30y") / 100).toFixed(3)), 0.354);
    assert.equal(Number((getMetric(baseRes, "hf_30y") / 100).toFixed(3)), 0.39);
    assert.equal(Number((getMetric(baseRes, "chd_30y") / 100).toFixed(3)), 0.198);
    assert.equal(Number((getMetric(baseRes, "stroke_30y") / 100).toFixed(3)), 0.221);

    // 2. +uACR model
    const uacrRes = evaluateFormulaDetailed("prevent", { ...baseFemale, uacr: 92 });
    assert.equal(uacrRes.modelLabel, "Base + uACR");
    assert.equal(Number((getMetric(uacrRes, "ascvd_10y") / 100).toFixed(3)), 0.111);
    assert.equal(Number((getMetric(uacrRes, "cvd_30y") / 100).toFixed(3)), 0.565);

    // 3. +HbA1c model (includes 2026-10-14 erratum)
    const a1cRes = evaluateFormulaDetailed("prevent", { ...baseFemale, hba1c: 9.2 });
    assert.equal(a1cRes.modelLabel, "Base + HbA1c");
    assert.equal(Number((getMetric(a1cRes, "ascvd_10y") / 100).toFixed(3)), 0.112);
    assert.equal(Number((getMetric(a1cRes, "cvd_30y") / 100).toFixed(3)), 0.557);

    // 4. +SDI model (decile 1-3)
    const sdiRes = evaluateFormulaDetailed("prevent", { ...baseFemale, sdi: 1 });
    assert.equal(sdiRes.modelLabel, "Base + SDI");
    assert.equal(Number((getMetric(sdiRes, "ascvd_10y") / 100).toFixed(3)), 0.08);
    assert.equal(Number((getMetric(sdiRes, "cvd_30y") / 100).toFixed(3)), 0.485);

    // 5. Full model with partial missingness (uACR + HbA1c without SDI)
    const partialFull = evaluateFormulaDetailed("prevent", {
      ...baseFemale,
      uacr: 92,
      hba1c: 9.2,
    });
    assert.equal(partialFull.modelLabel, "Full Model (uACR + HbA1c)");
    assert.equal(partialFull.outputs?.length, 10);

    // 6. Full model with all 3 optional predictors
    const fullRes = evaluateFormulaDetailed("prevent", {
      ...baseFemale,
      uacr: 92,
      hba1c: 9.2,
      sdi: 1,
    });
    assert.equal(fullRes.modelLabel, "Full Model (uACR + HbA1c + SDI)");
    assert.equal(Number((getMetric(fullRes, "cvd_10y") / 100).toFixed(3)), 0.181);
    assert.equal(Number((getMetric(fullRes, "hf_30y") / 100).toFixed(3)), 0.42);

    // 7. Missing BMI omits Heart Failure but computes ASCVD/CHD/Stroke/Total CVD
    const noBmi = { ...baseFemale };
    delete noBmi.bmi;
    const noBmiRes = evaluateFormulaDetailed("prevent", noBmi);
    assert.equal(getMetric(noBmiRes, "hf_10y"), null);
    assert.equal(getMetric(noBmiRes, "hf_30y"), null);
    assert.equal(Number((getMetric(noBmiRes, "ascvd_10y") / 100).toFixed(3)), 0.092);
    assert.ok(noBmiRes.warnings?.some((w) => w.includes("BMI")));

    // 8. Age >= 60 computes 10-year risks and omits 30-year risks
    const olderRes = evaluateFormulaDetailed("prevent", { ...baseFemale, age: 65 });
    assert.ok(getMetric(olderRes, "ascvd_10y") !== null);
    assert.equal(getMetric(olderRes, "ascvd_30y"), null);
    assert.ok(olderRes.warnings?.some((w) => w.includes("30–59")));

    // 9. Scale-level integration: answeredRequiredCount stays 10 when optional items are filled,
    // and gapless 2-decimal interpretation bands match cleanly
    const preventScale = sealVerified(
      JSON.parse(
        fs.readFileSync(
          path.resolve(process.cwd(), "data/neurocalc/scales/prevent.json"),
          "utf-8"
        )
      )
    );
    const scaleEval = evaluateScale(preventScale, {
      sex: "male",
      age: 55,
      total_chol: 5.0,
      hdl_chol: 1.3,
      sbp: 130,
      egfr: 90,
      diabetes: "no",
      smoker: "no",
      bp_treated: "no",
      statin: "no",
      bmi: 25,
      uacr: 25,
      sdi: "decile_4_6",
    });
    assert.equal(scaleEval.isComplete, true);
    assert.equal(scaleEval.requiredCount, 10);
    assert.equal(scaleEval.answeredRequiredCount, 10);
    assert.equal(scaleEval.answeredCount, 13);
    assert.equal(scaleEval.outputMetrics?.length, 10);
    assert.equal(scaleEval.primaryMetricLabel, "10-Year ASCVD Risk");
    assert.equal(scaleEval.band?.id, "prev_low");

    // Verify gapless boundary bands at 4.95, 7.45, 19.95
    assert.ok(preventScale.interpretation.some((b) => 4.95 >= b.min && (b.max === null || 4.95 <= b.max)));
    assert.ok(preventScale.interpretation.some((b) => 7.45 >= b.min && (b.max === null || 7.45 <= b.max)));
    assert.ok(preventScale.interpretation.some((b) => 19.95 >= b.min && (b.max === null || 19.95 <= b.max)));
  });

  it("supports invalidate_total_and_flag with componentNotation (GCS NT) and ABC/3 irregular shape", () => {
    const gcsScale = sealVerified(
      JSON.parse(
        fs.readFileSync(
          path.resolve(process.cwd(), "data/neurocalc/scales/gcs.json"),
          "utf-8"
        )
      )
    );

    const numericGcs = evaluateScale(gcsScale, {
      gcs_eye: "e3",
      gcs_verbal: "v4",
      gcs_motor: "m5",
    });
    assert.equal(numericGcs.isComplete, true);
    assert.equal(numericGcs.score, 12);
    assert.equal(numericGcs.componentNotation, "E3 V4 M5");
    assert.equal(numericGcs.totalInvalidatedReason, undefined);

    const ntGcs = evaluateScale(gcsScale, {
      gcs_eye: "e3",
      gcs_verbal: "v_nt",
      gcs_motor: "m5",
    });
    assert.equal(ntGcs.isComplete, true);
    assert.equal(ntGcs.score, null);
    assert.equal(ntGcs.band, null);
    assert.equal(ntGcs.componentNotation, "E3 V(NT) M5");
    assert.ok(ntGcs.totalInvalidatedReason?.includes("NT"));
    assert.deepEqual(
      ntGcs.untestableItems.map((u) => u.itemId),
      ["gcs_verbal"]
    );

    const abc2Scale = sealVerified(
      JSON.parse(
        fs.readFileSync(
          path.resolve(process.cwd(), "data/neurocalc/scales/abc-2.json"),
          "utf-8"
        )
      )
    );
    const defaultAbc2 = evaluateScale(abc2Scale, {
      a: 3,
      b: 2.5,
      slices: 8,
      slice_thickness: 0.5,
    });
    assert.equal(defaultAbc2.score, 15);

    const irregularAbc3 = evaluateScale(abc2Scale, {
      shape_divisor: "irregular",
      a: 3,
      b: 2.5,
      slices: 8,
      slice_thickness: 0.5,
    });
    assert.equal(irregularAbc3.score, 10);
    assert.equal(irregularAbc3.modelLabel, "ABC/3 (Irregular / Multinodular)");
  });
});
