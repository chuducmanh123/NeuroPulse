import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateSources,
  validateDrug,
  validateInteractions,
  validateSourced,
} from "../src/lib/neurorx/validate.ts";

describe("NeuroRx Data Validator (T1)", () => {
  const dummySources = [
    {
      id: "src-fda-fixture",
      type: "fda_label",
      title: "Fixture Drug Label",
      publisher: "US FDA",
      year: 2024,
      accessed: "2026-11-11",
    },
    {
      id: "src-eurap-fixture",
      type: "registry",
      title: "EURAP Registry Report",
      publisher: "EURAP",
      year: 2024,
      accessed: "2026-11-11",
    },
  ];

  const knownSourceIds = new Set(dummySources.map((s) => s.id));
  const knownDrugIds = new Set(["test-drug-a", "test-drug-b"]);

  const validDrugFixture = {
    id: "test-drug-a",
    generic_name: "testdrug",
    tall_man: {
      value: "testDRUG",
      refs: [
        {
          source_id: "src-fda-fixture",
          locator: "Table 1",
          quote: "Test drug quotation",
        },
      ],
    },
    classes: ["Anticonvulsant"],
    subspecialties: ["epilepsy"],
    vn_products: { value: null, refs: [] },
    bhyt: { value: null, refs: [] },
    regimens: [
      {
        id: "reg-1",
        indication: "Partial onset seizure",
        setting: "maintenance_outpatient",
        route: "PO",
        refs: [
          {
            source_id: "src-fda-fixture",
            locator: "Section 2.1",
            quote: "Initial dose 500 mg twice daily",
          },
        ],
        dose: {
          kind: "fixed",
          amount: 500,
          unit: "mg",
          frequency: "twice daily",
        },
      },
    ],
    renal_basis: {
      value: "cg_abw",
      refs: [
        {
          source_id: "src-fda-fixture",
          locator: "Section 2.2",
          quote: "CrCl calculated using Cockcroft-Gault",
        },
      ],
    },
    hepatic: { value: null, refs: [] },
    black_box: { value: null, refs: [] },
    mg_safety: { value: "safe", refs: [{ source_id: "src-fda-fixture", locator: "Sec 5", quote: "No MG risk" }] },
    ng_tube: { value: null, refs: [] },
    pgx: { value: null, refs: [] },
    ae_tags: { value: ["sedation_somnolence"], refs: [{ source_id: "src-fda-fixture", locator: "Sec 6", quote: "Somnolence" }] },
    enzyme_profile: {
      value: { qt_risk: "none", serotonergic: false, acb_score: 0 },
      refs: [{ source_id: "src-fda-fixture", locator: "Sec 12", quote: "No enzyme effects" }],
    },
    reproductive: {
      tier: { value: "caution", refs: [{ source_id: "src-eurap-fixture", locator: "p. 10", quote: "Caution in pregnancy" }] },
      mcm: [
        {
          registry: "EURAP",
          percent: 2.5,
          refs: [{ source_id: "src-eurap-fixture", locator: "Table 2", quote: "Rate 2.5%" }],
        },
      ],
      folic_acid: { value: null, refs: [] },
      pregnancy_pk: { value: null, refs: [] },
      postpartum: { value: null, refs: [] },
      contraception: { value: null, refs: [] },
      lactation_rid: { value: null, refs: [] },
      lactation_summary: { value: null, refs: [] },
    },
    status: "draft",
    verification: {
      verified_by: null,
      verified_at: null,
      content_hash: null,
    },
  };

  it("should validate a valid sources array with zero errors", () => {
    const errors = validateSources(dummySources);
    assert.equal(errors.length, 0);
  });

  it("should fail validation if source has missing id or title", () => {
    const invalidSources = [{ id: "", publisher: "FDA", year: 2024 }];
    const errors = validateSources(invalidSources);
    assert.ok(errors.some((e) => e.path.includes("id")));
    assert.ok(errors.some((e) => e.path.includes("title")));
  });

  it("should validate a compliant drug record fixture with zero errors", () => {
    const errors = validateDrug(validDrugFixture, knownSourceIds);
    assert.equal(errors.length, 0, `Validation errors found: ${JSON.stringify(errors)}`);
  });

  it("RULE: should enforce non-null clinical value must have at least one ref", () => {
    const faultySourced = { value: "some-value", refs: [] };
    const errors = validateSourced(faultySourced, "drug.tall_man", knownSourceIds);
    assert.equal(errors.length, 1);
    assert.match(errors[0].message, /must have at least one source reference/i);
  });

  it("RULE: should fail if ref points to unknown source_id", () => {
    const faultySourced = {
      value: "some-value",
      refs: [{ source_id: "unknown-source-xyz", locator: "p.1", quote: "text" }],
    };
    const errors = validateSourced(faultySourced, "drug.test", knownSourceIds);
    assert.ok(errors.some((e) => e.message.includes("Unknown source_id")));
  });

  it("RULE: should reject verbatim quotes exceeding 400 characters", () => {
    const longQuote = "a".repeat(401);
    const faultySourced = {
      value: "some-value",
      refs: [{ source_id: "src-fda-fixture", locator: "p.1", quote: longQuote }],
    };
    const errors = validateSourced(faultySourced, "drug.test", knownSourceIds);
    assert.ok(errors.some((e) => e.message.includes("exceeds maximum allowed 400 characters")));
  });

  it("RULE: should reject invalid subspecialty and adverse effect tags", () => {
    const faultyDrug = {
      ...validDrugFixture,
      subspecialties: ["invalid_subspecialty"],
      ae_tags: {
        value: ["invalid_ae_tag"],
        refs: [{ source_id: "src-fda-fixture", locator: "p.1", quote: "sample" }],
      },
    };
    const errors = validateDrug(faultyDrug, knownSourceIds);
    assert.ok(errors.some((e) => e.message.includes("Invalid subspecialty")));
    assert.ok(errors.some((e) => e.message.includes("Invalid AdverseEffectTag")));
  });

  it("RULE: should validate interactions and require valid severity and existing drug ids", () => {
    const validInteraction = [
      {
        id: "int-1",
        drug_a: "test-drug-a",
        drug_b: "test-drug-b",
        severity: "contraindicated",
        mechanism: "Enzyme induction",
        clinical_effect: "Decreased efficacy",
        management: "Avoid concomitant use",
        alternatives: [],
        refs: [{ source_id: "src-fda-fixture", locator: "Sec 7", quote: "Avoid combination" }],
      },
    ];
    const okErrors = validateInteractions(validInteraction, knownDrugIds, knownSourceIds);
    assert.equal(okErrors.length, 0);

    const invalidInteraction = [
      {
        id: "int-2",
        drug_a: "non-existent-drug",
        drug_b: "test-drug-b",
        severity: "invalid_severity",
        mechanism: "mech",
        clinical_effect: "effect",
        management: "plan",
        alternatives: [],
        refs: [],
      },
    ];
    const errors = validateInteractions(invalidInteraction, knownDrugIds, knownSourceIds);
    assert.ok(errors.some((e) => e.message.includes("not found in known drug IDs")));
    assert.ok(errors.some((e) => e.message.includes("severity must be one of")));
    assert.ok(errors.some((e) => e.message.includes("at least one source ref")));
  });
});
