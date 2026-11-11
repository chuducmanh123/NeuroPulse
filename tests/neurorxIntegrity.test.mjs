import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canonicalize,
  computeContentHashSync,
  computeContentHash,
  normalizeForQuote,
  getEffectiveStatus,
} from "../src/lib/neurorx/integrity.ts";

describe("NeuroRx Integrity & Hashing Engine (T2)", () => {
  const sampleDrug = {
    id: "test-drug",
    generic_name: "testdrug",
    tall_man: { value: "testDRUG", refs: [] },
    classes: ["Class A"],
    subspecialties: ["epilepsy"],
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
      content_hash: "initial-hash",
    },
  };

  it("should produce identical canonical representation regardless of key order", () => {
    const obj1 = { b: 2, a: 1, c: { y: 20, x: 10 } };
    const obj2 = { a: 1, c: { x: 10, y: 20 }, b: 2 };

    const canon1 = JSON.stringify(canonicalize(obj1));
    const canon2 = JSON.stringify(canonicalize(obj2));

    assert.equal(canon1, canon2);
  });

  it("should omit verification field from canonical representation", () => {
    const canon = canonicalize(sampleDrug);
    assert.equal(canon.verification, undefined);
  });

  it("should generate stable SHA-256 hash sync and async", async () => {
    const hashSync = computeContentHashSync(sampleDrug);
    const hashAsync = await computeContentHash(sampleDrug);

    assert.equal(typeof hashSync, "string");
    assert.equal(hashSync.length, 64);
    assert.equal(hashSync, hashAsync);
  });

  it("should change hash when any clinical value changes", () => {
    const hash1 = computeContentHashSync(sampleDrug);

    const modified = {
      ...sampleDrug,
      classes: ["Class B"], // Modified
    };

    const hash2 = computeContentHashSync(modified);
    assert.notEqual(hash1, hash2, "Content hash must change when clinical data is modified");
  });

  it("should normalize text for quote comparison across whitespace and line-break hyphens", () => {
    const raw = "Adminis-\n  tration of   KEPPRA\u2019s dose: 500\u20131000 mg/day.";
    const expected = "administration of keppra's dose: 500-1000 mg/day.";

    assert.equal(normalizeForQuote(raw), expected);
  });

  it("should downgrade effective status to 'draft' if content hash does not match", async () => {
    const correctHash = computeContentHashSync(sampleDrug);

    const verifiedDrug = {
      ...sampleDrug,
      status: "verified",
      verification: {
        verified_by: "Dr. Tester",
        verified_at: "2026-11-11",
        content_hash: correctHash,
      },
    };

    const status1 = await getEffectiveStatus(verifiedDrug);
    assert.equal(status1, "verified");

    // Simulate tampering with clinical data after verification
    const tamperedDrug = {
      ...verifiedDrug,
      generic_name: "tampered_name",
    };

    const status2 = await getEffectiveStatus(tamperedDrug);
    assert.equal(status2, "draft", "Tampered record must be downgraded to draft");
  });
});
