import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateScaleRecord, validateSources } from "../src/lib/neurocalc/validate.ts";
import {
  CALC_SECTIONS,
  computeRecordContentHashSync,
  computeSectionHashes,
  evaluateEffectiveScale,
  sealVerifiedScale,
  threeWayMergeScale,
} from "../src/lib/neurocalc/sync/jsonPatch.ts";

function makeValidPointSumScale() {
  return {
    id: "test-scale-sum",
    schema_version: 1,
    metadata: {
      name: "Test Point Sum Scale",
      short_name: "TPSS",
      aliases: ["Synthetic Point Scale"],
      subspecialties: ["Stroke"],
      kind: "point_sum",
      summary: "Synthetic test fixture for point-sum validation.",
      clinical_pearls: ["Fixture pearl"],
    },
    items: [
      {
        kind: "select",
        id: "item_1",
        code: "1",
        label: "Item One",
        required: true,
        options: [
          { id: "opt_0", label: "Normal", points: 0 },
          { id: "opt_1", label: "Mild", points: 1 },
          { id: "opt_un", label: "Untestable", points: null, is_untestable: true },
        ],
      },
      {
        kind: "select",
        id: "item_2",
        code: "2",
        label: "Item Two",
        required: true,
        options: [
          { id: "opt_0", label: "Normal", points: 0 },
          { id: "opt_2", label: "Marked", points: 2 },
        ],
      },
    ],
    scoring: {
      method: "sum",
      min_score: 0,
      max_score: 3,
      unit: "points",
      precision: 0,
      untestable_policy: "exclude_and_flag",
    },
    interpretation: [
      {
        id: "band_low",
        min: 0,
        max: 1,
        label: "Low",
        severity: "normal",
        summary: "Low synthetic range.",
        refs: [{ source_id: "ref-1", locator: "Table 1" }],
      },
      {
        id: "band_high",
        min: 2,
        max: 3,
        label: "High",
        severity: "severe",
        summary: "High synthetic range.",
        refs: [{ source_id: "ref-1", locator: "Table 1" }],
      },
    ],
    assessment_guides: [
      {
        id: "guide_item_1",
        target_type: "item",
        target_id: "item_1",
        title: "Assessing Item One",
        bedside_steps: ["Perform synthetic step A."],
        pitfalls_and_exceptions: ["Mark UN if untestable."],
        refs: [{ source_id: "ref-1", locator: "Appendix" }],
      },
      {
        id: "guide_opt_1",
        target_type: "option",
        target_id: "item_1",
        option_id: "opt_1",
        title: "Distinguishing Mild",
        bedside_steps: ["Confirm synthetic criterion."],
        pitfalls_and_exceptions: ["Do not confuse with opt_0."],
        refs: [{ source_id: "ref-1", locator: "Appendix" }],
      },
    ],
    references: [
      {
        id: "ref-1",
        citation: "Synthetic Author et al. J Test. 2024.",
        year: 2024,
      },
    ],
    test_cases: [
      {
        name: "All zero",
        inputs: { item_1: "opt_0", item_2: "opt_0" },
        expected_score: 0,
        expected_band_id: "band_low",
      },
    ],
    status: "draft",
    verification: {
      verified_by: null,
      verified_at: null,
      content_hash: null,
    },
  };
}

function makeValidFormulaScale() {
  return {
    id: "test-scale-formula",
    schema_version: 1,
    metadata: {
      name: "Test Formula Scale",
      short_name: "TFS",
      aliases: [],
      subspecialties: ["Neurocritical Care"],
      kind: "formula",
      summary: "Synthetic formula fixture.",
    },
    items: [
      {
        kind: "numeric",
        id: "a",
        label: "Dimension A",
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
        label: "Dimension B",
        required: true,
        canonical_unit: "cm",
        units: [{ unit: "cm", label: "cm", to_canonical_factor: 1 }],
        min_canonical: 0.1,
        max_canonical: 20,
      },
      {
        kind: "numeric",
        id: "c",
        label: "Dimension C",
        required: true,
        canonical_unit: "cm",
        units: [{ unit: "cm", label: "cm", to_canonical_factor: 1 }],
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
        id: "band_any",
        min: 0,
        max: null,
        label: "Computed",
        severity: "info",
        summary: "Computed synthetic volume.",
        refs: [{ source_id: "ref-f", locator: "Eq 1" }],
      },
    ],
    assessment_guides: [],
    references: [
      {
        id: "ref-f",
        citation: "Formula Ref. 2024.",
        year: 2024,
      },
    ],
    status: "draft",
    verification: {
      verified_by: null,
      verified_at: null,
      content_hash: null,
    },
  };
}

describe("NeuroCalc Data Validator & 6-Block Merkle Hashing (T1)", () => {
  it("validates valid point-sum and formula fixtures", () => {
    assert.deepEqual(validateScaleRecord(makeValidPointSumScale()), []);
    assert.deepEqual(validateScaleRecord(makeValidFormulaScale()), []);
    assert.deepEqual(
      validateSources([{ id: "global-1", citation: "Global Ref", year: 2025 }]),
      []
    );
  });

  it("isolates 6 granular section_hashes when only assessment_guides changes", () => {
    const base = makeValidPointSumScale();
    const edited = makeValidPointSumScale();
    edited.assessment_guides[0].pitfalls_and_exceptions.push("Extra pitfall note.");

    const h1 = computeSectionHashes(base);
    const h2 = computeSectionHashes(edited);

    assert.equal(CALC_SECTIONS.length, 6);
    assert.notEqual(h1.assessment_guides, h2.assessment_guides);
    for (const sec of ["metadata", "items", "scoring", "interpretation", "references", "core"]) {
      assert.equal(h1[sec], h2[sec], `Expected section '${sec}' hash to stay identical`);
    }
  });

  it("auto-downgrades verified scale to draft on content_hash tamper", () => {
    const scale = makeValidPointSumScale();
    scale.status = "verified";
    scale.verification = {
      verified_by: "Dr. Test",
      verified_at: "2026-11-26T00:00:00.000Z",
      content_hash: computeRecordContentHashSync(scale),
    };

    const ok = evaluateEffectiveScale(scale);
    assert.equal(ok.effectiveStatus, "verified");
    assert.equal(ok.hashMatches, true);

    // Tamper without re-sealing hash
    scale.interpretation[0].summary = "Tampered summary";
    const tampered = evaluateEffectiveScale(scale);
    assert.equal(tampered.effectiveStatus, "draft");
    assert.equal(tampered.hashMatches, false);
  });

  it("3-way merges disjoint section edits cleanly and flags same-section conflicts", () => {
    const base = makeValidPointSumScale();
    const mine = makeValidPointSumScale();
    const cloud = makeValidPointSumScale();

    mine.assessment_guides[0].title = "Updated bedside title";
    cloud.interpretation[0].summary = "Updated cloud interpretation";

    const cleanMerge = threeWayMergeScale(base, mine, cloud);
    assert.equal(cleanMerge.conflicts.length, 0);
    assert.equal(cleanMerge.merged.assessment_guides[0].title, "Updated bedside title");
    assert.equal(cleanMerge.merged.interpretation[0].summary, "Updated cloud interpretation");

    // Both edit assessment_guides[0].title -> conflict
    cloud.assessment_guides[0].title = "Conflicting cloud title";
    const conflictMerge = threeWayMergeScale(base, mine, cloud);
    assert.ok(conflictMerge.conflicts.length >= 1);
  });

  it("catches invalid slug, duplicate item id, and invalid guide targets", () => {
    const s = makeValidPointSumScale();
    s.id = "Bad_Slug";
    s.items.push({ ...s.items[0] }); // duplicate item_1
    s.assessment_guides.push({
      id: "bad_guide",
      target_type: "option",
      target_id: "item_1",
      option_id: "nonexistent_opt",
      title: "Bad Guide",
      bedside_steps: ["Step"],
      pitfalls_and_exceptions: [],
      refs: [{ source_id: "unknown-src", locator: "p.1" }],
    });

    const errs = validateScaleRecord(s);
    const paths = errs.map((e) => e.path);
    assert.ok(paths.includes("id"));
    assert.ok(paths.includes("items[2].id"));
    assert.ok(paths.includes("assessment_guides[2].option_id"));
    assert.ok(paths.includes("assessment_guides[2].refs[0].source_id"));
  });

  it("catches overlapping interpretation bands, invalid numeric bounds, missing formula_id, and untestable numeric points", () => {
    const sum = makeValidPointSumScale();
    sum.items[0].options[2].points = 4; // untestable with non-null points
    sum.interpretation[1].min = 1; // overlaps band_low max=1
    const sumErrs = validateScaleRecord(sum);
    assert.ok(sumErrs.some((e) => e.path === "items[0].options[2].points"));
    assert.ok(sumErrs.some((e) => e.path === "interpretation[1].min"));

    const formula = makeValidFormulaScale();
    formula.items[0].min_canonical = 50; // >= max_canonical 20
    delete formula.scoring.formula_id;
    const formulaErrs = validateScaleRecord(formula);
    assert.ok(formulaErrs.some((e) => e.path === "items[0].min_canonical"));
    assert.ok(formulaErrs.some((e) => e.path === "scoring.formula_id"));
  });

  it("seals draft scale as verified with matching content_hash", () => {
    const draft = makeValidPointSumScale();
    const sealed = sealVerifiedScale(draft, "Dr. Reviewer", "2026-11-26T00:00:00.000Z");
    assert.equal(sealed.status, "verified");
    const evaluated = evaluateEffectiveScale(sealed);
    assert.equal(evaluated.effectiveStatus, "verified");
    assert.equal(evaluated.hashMatches, true);
  });

  it("validates custom scoring.expression on formula scales and rejects unknown variables", () => {
    const formula = makeValidFormulaScale();
    delete formula.scoring.formula_id;
    formula.scoring.expression = "(a * b * c) / 2";
    assert.deepEqual(validateScaleRecord(formula), []);

    formula.scoring.expression = "(a * missing_var) / 2";
    const errs = validateScaleRecord(formula);
    assert.ok(errs.some((e) => e.path === "scoring.expression"));
  });

  it("validates optional reference category ('primary' | 'validation') and rejects invalid values", () => {
    const scale = makeValidPointSumScale();
    scale.references.push({
      id: "ref-2",
      citation: "Validation Study et al. Stroke. 2025.",
      year: 2025,
      category: "validation",
    });
    scale.references[0].category = "primary";
    assert.deepEqual(validateScaleRecord(scale), []);

    scale.references[1].category = "invalid_cat";
    const errs = validateScaleRecord(scale);
    assert.ok(errs.some((e) => e.path === "references[1].category"));
  });

  it("validates optional CDS metadata, default_unit, related_scale_id, and untestable_policy while preserving 6-section Merkle isolation", () => {
    const scale = makeValidPointSumScale();
    scale.metadata.clinical_purpose = ["severity", "prognosis"];
    scale.metadata.when_to_use = ["Use at bedside."];
    scale.metadata.next_steps = ["Order urgent imaging."];
    scale.metadata.critical_caveat = "Do not use alone for withdrawal of care.";
    scale.metadata.links = { related_scales: ["gcs", "abc-2"] };
    scale.items[0].related_scale_id = "gcs";
    scale.items[0].related_scale_label = "Calculate GCS";
    scale.scoring.untestable_policy = "invalidate_total_and_flag";
    scale.scoring.display_components = true;
    assert.deepEqual(validateScaleRecord(scale), []);

    // Editing metadata.when_to_use changes ONLY section_hashes.metadata
    const baseHashes = computeSectionHashes(makeValidPointSumScale());
    const metaHashes = computeSectionHashes(scale);
    assert.notEqual(baseHashes.metadata, metaHashes.metadata);
    assert.equal(baseHashes.references, metaHashes.references);

    const formula = makeValidFormulaScale();
    formula.items[0].default_unit = "mm";
    assert.deepEqual(validateScaleRecord(formula), []);

    formula.items[0].default_unit = "inches";
    const formulaErrs = validateScaleRecord(formula);
    assert.ok(formulaErrs.some((e) => e.path === "items[0].default_unit"));

    scale.items[0].related_scale_id = "Bad_Slug";
    const relErrs = validateScaleRecord(scale);
    assert.ok(relErrs.some((e) => e.path === "items[0].related_scale_id"));
  });
});
