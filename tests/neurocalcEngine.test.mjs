import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evaluateScale } from "../src/lib/neurocalc/engine.ts";
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
});
