// Unit tests for NeuroRx Clinical Omnibar parser & search
// Pure JavaScript ES module for Node.js native test runner

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { parseQuery, searchDrugs } from "../src/lib/neurorx/omnibar.ts";

describe("NeuroRx Clinical Omnibar Parser (parseQuery)", () => {
  test("parses user story 1: keppra 60kg crcl 35", () => {
    const res = parseQuery("keppra 60kg crcl 35");
    assert.deepEqual(res.terms, ["keppra"]);
    assert.equal(res.patient.weightKg, 60);
    assert.equal(res.patient.crcl, 35);
    assert.equal(res.patient.age, undefined);
    assert.equal(res.patient.sex, undefined);
  });

  test("parses acute stroke dosing query: tenecteplase 58kg", () => {
    const res = parseQuery("tenecteplase 58kg");
    assert.deepEqual(res.terms, ["tenecteplase"]);
    assert.equal(res.patient.weightKg, 58);
  });

  test("parses isolated patient context: scr 120 age 70 female", () => {
    const res = parseQuery("scr 120 age 70 female");
    assert.deepEqual(res.terms, []);
    assert.equal(res.patient.age, 70);
    assert.equal(res.patient.sex, "female");
    assert.deepEqual(res.patient.scr, { value: 120, unit: "umol/L" });
  });

  test("parses SCr with explicit mg/dL unit: scr 1.4 mg/dl", () => {
    const res = parseQuery("scr 1.4 mg/dl");
    assert.deepEqual(res.terms, []);
    assert.deepEqual(res.patient.scr, { value: 1.4, unit: "mg/dL" });
  });

  test("parses variations of units and separators: clcr 45ml/min 65.5 kg", () => {
    const res = parseQuery("clcr 45ml/min 65.5 kg");
    assert.equal(res.patient.crcl, 45);
    assert.equal(res.patient.weightKg, 65.5);
  });

  test("parses shorthand age and sex: phenytoin 70y male", () => {
    const res = parseQuery("phenytoin 70y male");
    assert.deepEqual(res.terms, ["phenytoin"]);
    assert.equal(res.patient.age, 70);
    assert.equal(res.patient.sex, "male");
  });

  test("parses comprehensive multi-parameter string", () => {
    const res = parseQuery("carbamazepine 60 kg crcl:40 scr 88 age:65 sex:f");
    assert.deepEqual(res.terms, ["carbamazepine"]);
    assert.equal(res.patient.weightKg, 60);
    assert.equal(res.patient.crcl, 40);
    assert.deepEqual(res.patient.scr, { value: 88, unit: "umol/L" });
    assert.equal(res.patient.age, 65);
    assert.equal(res.patient.sex, "female");
  });

  test("handles empty or blank inputs safely", () => {
    const res1 = parseQuery("");
    assert.deepEqual(res1.terms, []);
    assert.deepEqual(res1.patient, {});

    const res2 = parseQuery("   ");
    assert.deepEqual(res2.terms, []);
    assert.deepEqual(res2.patient, {});
  });
});

describe("NeuroRx Drug Search & Ranking (searchDrugs)", () => {
  const fixtureDrugs = [
    {
      id: "fixture-levetiracetam",
      generic_name: "levetiracetam",
      tall_man: { value: "levETIRAcetam", refs: [] },
      classes: ["antiepileptic", "synaptic vesicle protein SV2A ligand"],
      subspecialties: ["epilepsy", "neurocritical_care"],
      vn_products: {
        value: [{ brand: "Keppra", strength: "500 mg", form: "film-coated tablet" }],
        refs: [],
      },
      ae_tags: {
        value: ["sedation_somnolence", "ataxia", "psychiatric_behavioral"],
        refs: [],
      },
      status: "verified",
      verification: { verified_by: "Test", verified_at: "2026-11-11", content_hash: "mock" },
    },
    {
      id: "fixture-carbamazepine",
      generic_name: "carbamazepine",
      tall_man: { value: "carbaMAZEpine", refs: [] },
      classes: ["antiepileptic", "sodium channel blocker"],
      subspecialties: ["epilepsy", "headache"],
      vn_products: {
        value: [{ brand: "Tegretol", strength: "200 mg", form: "tablet" }],
        refs: [],
      },
      ae_tags: {
        value: ["rash_sjs_ten", "hyponatremia", "ataxia"],
        refs: [],
      },
      status: "verified",
      verification: { verified_by: "Test", verified_at: "2026-11-11", content_hash: "mock" },
    },
    {
      id: "fixture-apixaban",
      generic_name: "apixaban",
      tall_man: { value: "apixaban", refs: [] },
      classes: ["direct oral anticoagulant", "factor Xa inhibitor"],
      subspecialties: ["stroke"],
      vn_products: {
        value: [{ brand: "Eliquis", strength: "5 mg", form: "tablet" }],
        refs: [],
      },
      ae_tags: {
        value: [],
        refs: [],
      },
      status: "draft",
      verification: { verified_by: null, verified_at: null, content_hash: null },
    },
  ];

  test("ranks exact generic match at tier 1000", () => {
    const results = searchDrugs(["levetiracetam"], fixtureDrugs);
    assert.equal(results.length, 1);
    assert.equal(results[0].drug.id, "fixture-levetiracetam");
    assert.equal(results[0].score, 1000);
    assert.equal(results[0].matchedBy, "generic_exact");
  });

  test("ranks prefix generic match at tier 800", () => {
    const results = searchDrugs(["leveti"], fixtureDrugs);
    assert.equal(results.length, 1);
    assert.equal(results[0].drug.id, "fixture-levetiracetam");
    assert.equal(results[0].score, 800);
    assert.equal(results[0].matchedBy, "generic_prefix");
  });

  test("ranks brand match (Keppra) at tier 600", () => {
    const results = searchDrugs(["keppra"], fixtureDrugs);
    assert.equal(results.length, 1);
    assert.equal(results[0].drug.id, "fixture-levetiracetam");
    assert.equal(results[0].score, 600);
    assert.equal(results[0].matchedBy, "brand");
    assert.equal(results[0].matchedText, "Keppra");
  });

  test("ranks class match (antiepileptic) at tier 400", () => {
    const results = searchDrugs(["antiepileptic"], fixtureDrugs);
    assert.equal(results.length, 2);
    assert.equal(results[0].score, 400);
    assert.equal(results[0].matchedBy, "class");
  });

  test("ranks reverse AE search (somnolence) at tier 200", () => {
    const results = searchDrugs(["somnolence"], fixtureDrugs);
    assert.equal(results.length, 1);
    assert.equal(results[0].drug.id, "fixture-levetiracetam");
    assert.equal(results[0].score, 200);
    assert.equal(results[0].matchedBy, "ae_tag");
  });

  test("ranks reverse AE search (hyponatremia)", () => {
    const results = searchDrugs(["hyponatremia"], fixtureDrugs);
    assert.equal(results.length, 1);
    assert.equal(results[0].drug.id, "fixture-carbamazepine");
    assert.equal(results[0].score, 200);
  });

  test("returns all drugs when search terms are empty", () => {
    const results = searchDrugs([], fixtureDrugs);
    assert.equal(results.length, 3);
  });
});
