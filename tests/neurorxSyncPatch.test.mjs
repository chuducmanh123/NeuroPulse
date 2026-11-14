import crypto from "node:crypto";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeContentHashSync } from "../src/lib/neurorx/integrity.ts";
import {
  applyJsonPatch,
  computeJsonPatch,
  computeRecordContentHashSync,
  computeSectionHashes,
  sha256Hex,
  threeWayMergeDrug,
} from "../src/lib/neurorx/sync/jsonPatch.ts";

function makeSampleDrug(overrides = {}) {
  return {
    id: "levetiracetam-oral",
    generic_name: "levetiracetam",
    tall_man: { value: "levETIRAcetam", refs: [] },
    classes: ["Antiepileptic", "SV2A modulator"],
    subspecialties: ["epilepsy"],
    vn_products: {
      value: [{ brand: "Keppra", strength: "500 mg", form: "tablet" }],
      refs: [],
    },
    bhyt: { value: null, refs: [] },
    regimens: [
      {
        indication: "Focal seizures",
        route: "PO",
        dose: { kind: "fixed", amount: 500, unit: "mg", frequency: "BID" },
      },
    ],
    renal_impairment: { summary: "Adjust below CrCl 80 mL/min", bands: [] },
    renal_basis: { value: "cg_abw", refs: [] },
    hepatic: { value: "No adjustment needed", refs: [] },
    black_box: { value: null, refs: [] },
    mg_safety: { value: "safe", refs: [] },
    ng_tube: { value: null, refs: [] },
    pgx: { value: null, refs: [] },
    ae_tags: { value: ["sedation_somnolence"], refs: [] },
    adverse_effects: {
      most_common: { value: ["somnolence", "fatigue"], refs: [] },
      serious: { value: ["behavioral changes"], refs: [] },
    },
    enzyme_profile: { value: { qt_risk: "none" }, refs: [] },
    fda_interactions: { value: [], refs: [] },
    reproductive: { pregnancy: "Category C / registry", lactation: "Present in breast milk" },
    status: "draft",
    verification: {
      verified_by: null,
      verified_at: null,
      content_hash: null,
    },
    ...overrides,
  };
}

describe("NeuroRx Sync v2 — Pure Hashing, Section Merkle & JSON Patch", () => {
  it("matches node:crypto SHA-256 across ASCII, empty string, and Unicode/Vietnamese clinical strings", () => {
    const inputs = [
      "",
      "levetiracetam:1:abc123",
      "Điều chỉnh liều theo CrCl µmol/L ≥ 50 mg/ngày — thuốc chống động kinh",
      "a".repeat(200),
    ];

    for (const s of inputs) {
      const expected = crypto.createHash("sha256").update(s, "utf8").digest("hex");
      assert.equal(sha256Hex(s), expected);
    }
  });

  it("matches integrity.ts computeContentHashSync while excluding verification metadata", () => {
    const draft = makeSampleDrug();
    const verified = makeSampleDrug({
      status: "verified",
      verification: {
        verified_by: "Dr. Nguyen",
        verified_at: "2026-11-14",
        content_hash: "deadbeef",
      },
    });

    assert.equal(computeRecordContentHashSync(draft), computeContentHashSync(draft));
    assert.equal(computeRecordContentHashSync(verified), computeContentHashSync(verified));
  });

  it("computeSectionHashes is key-order independent, omits verification, and isolates modified clinical sections", () => {
    const d1 = makeSampleDrug();
    const d2 = {
      ...d1,
      hepatic: { refs: [], value: "No adjustment needed" }, // swapped key order
      verification: { verified_by: "Clinician", verified_at: "2026-11-14", content_hash: "x" },
    };

    const h1 = computeSectionHashes(d1);
    const h2 = computeSectionHashes(d2);
    assert.deepEqual(h1, h2);

    const editedHepatic = makeSampleDrug({
      hepatic: { value: "Caution in severe Child-Pugh C", refs: [] },
    });
    const h3 = computeSectionHashes(editedHepatic);
    assert.notEqual(h3.hepatic, h1.hepatic);
    assert.equal(h3.regimens, h1.regimens);
    assert.equal(h3.vn_products, h1.vn_products);
    assert.equal(h3.core, h1.core);
  });

  it("round-trips nested objects, arrays (grow + shrink), and escaped JSON pointer keys (~ /)", () => {
    const before = {
      id: "alpha",
      "meta/note~1": "old",
      tags: ["a", "b", "c", "d"],
      nested: { dose: 500, unit: "mg", keep: true },
      removedField: 123,
    };
    const after = {
      id: "alpha",
      "meta/note~1": "new",
      tags: ["a", "X"],
      nested: { dose: 750, unit: "mg", keep: true, max: 1500 },
      addedField: [1, 2],
    };

    const patch = computeJsonPatch(before, after);
    assert.ok(patch.some((op) => op.path === "/meta~1note~01" && op.op === "replace"));

    const reconstructed = applyJsonPatch(before, patch);
    assert.deepEqual(reconstructed, after);

    // Reverse grow array test
    const patchBack = computeJsonPatch(after, before);
    assert.deepEqual(applyJsonPatch(after, patchBack), before);
  });

  it("threeWayMergeDrug auto-merges non-conflicting sections and flags overlapping field edits", () => {
    const base = makeSampleDrug();

    // Non-conflicting edits in different clinical sections
    const mine = makeSampleDrug({
      hepatic: { value: "Reduce 50% in Child-Pugh C", refs: [] },
    });
    const cloud = makeSampleDrug({
      regimens: [
        {
          indication: "Focal seizures (updated)",
          route: "PO",
          dose: { kind: "fixed", amount: 750, unit: "mg", frequency: "BID" },
        },
      ],
    });

    const okMerge = threeWayMergeDrug(base, mine, cloud);
    assert.equal(okMerge.conflicts.length, 0);
    assert.equal(okMerge.merged.hepatic.value, "Reduce 50% in Child-Pugh C");
    assert.equal(okMerge.merged.regimens[0].dose.amount, 750);

    // Non-conflicting edits in the same section (core): mine changes generic_name, cloud changes status
    const mineCore = makeSampleDrug({ generic_name: "levetiracetam updated" });
    const cloudCore = makeSampleDrug({ mg_safety: { value: "caution", refs: [] } });
    const coreMerge = threeWayMergeDrug(base, mineCore, cloudCore);
    assert.equal(coreMerge.conflicts.length, 0);
    assert.equal(coreMerge.merged.generic_name, "levetiracetam updated");
    assert.equal(coreMerge.merged.mg_safety.value, "caution");

    // Conflicting edit on the exact same field
    const mineConflict = makeSampleDrug({
      hepatic: { value: "Mine hepatic note", refs: [] },
    });
    const cloudConflict = makeSampleDrug({
      hepatic: { value: "Cloud hepatic note", refs: [] },
    });
    const conflictResult = threeWayMergeDrug(base, mineConflict, cloudConflict);
    assert.equal(conflictResult.conflicts.length, 1);
    assert.equal(conflictResult.conflicts[0].path, "/hepatic/value");
    assert.equal(conflictResult.conflicts[0].mineValue, "Mine hepatic note");
    assert.equal(conflictResult.conflicts[0].cloudValue, "Cloud hepatic note");
  });
});
