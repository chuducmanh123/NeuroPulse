// Acceptance tests for NeuroRx User Stories 1–7
// Reference: SPEC-neurorx.md Section 1 (User stories acceptance-level)
// Pure JavaScript ES module for Node.js native test runner

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { parseQuery, searchDrugs } from "../src/lib/neurorx/omnibar.ts";
import { parsePatient, crclCG } from "../src/lib/neurorx/patient.ts";
import { resolveRegimen } from "../src/lib/neurorx/dosing.ts";
import { analyzeRegimen } from "../src/lib/neurorx/interactions.ts";

describe("NeuroRx Acceptance: User Stories 1–7", () => {
  // Load real database files
  const drugsDir = path.resolve(process.cwd(), "data/neurorx/drugs");
  const interactionsPath = path.resolve(process.cwd(), "data/neurorx/interactions.json");
  const sourcesPath = path.resolve(process.cwd(), "data/neurorx/sources.json");

  const interactions = JSON.parse(fs.readFileSync(interactionsPath, "utf8"));
  const sources = JSON.parse(fs.readFileSync(sourcesPath, "utf8"));
  const allDrugs = fs.readdirSync(drugsDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(drugsDir, f), "utf8")));

  // User Story 1: Typing "keppra 60kg crcl 35" opens Levetiracetam with weight 60 and CrCl 35 pre-filled and matching renal band highlighted.
  test("User Story 1: Omnibar query 'keppra 60kg crcl 35' parses patient context and selects matching renal band", () => {
    const parsed = parseQuery("keppra 60kg crcl 35");
    assert.deepEqual(parsed.terms, ["keppra"]);
    assert.equal(parsed.patient.weightKg, 60);
    assert.equal(parsed.patient.crcl, 35);

    // Search matches levetiracetam when brand alias Keppra is present or via generic term
    const levetiracetamWithBrand = allDrugs.map((d) =>
      d.id === "levetiracetam-oral"
        ? {
            ...d,
            vn_products: {
              value: [{ brand: "Keppra", strength: "500 mg", form: "tablet" }],
              refs: [],
            },
          }
        : d
    );
    const matches = searchDrugs(parsed.terms, levetiracetamWithBrand);
    assert.ok(matches.length > 0);
    const keppra = matches[0].drug;
    assert.equal(keppra.id, "levetiracetam-oral");

    // Resolving regimen with CrCl 35 selects the moderate renal impairment band (30-50 mL/min)
    const patient = {
      weightKg: 60,
      crclManual: 35,
      isPediatric: false,
    };
    const renal = {
      value: 35,
      basisUsed: "cg_abw",
      label: "CrCl 35 mL/min",
    };
    const res = resolveRegimen(keppra, keppra.regimens[0], patient, renal);

    assert.ok(res.renalBandMatched);
    assert.equal(res.renalBandMatched.min, 30);
    assert.equal(res.renalBandMatched.max, 50);
    assert.ok(res.renalBandMatched.dose_text.includes("250 to 750 mg"));
  });

  // User Story 2: With weight empty, dose cards show only the rule (e.g. "X mg/kg, max Y mg") — never a computed number.
  test("User Story 2: With weight empty, weight-based dose rules return only the rule and NO computed dose number", () => {
    const levetiracetam = allDrugs.find((d) => d.id === "levetiracetam-oral");
    assert.ok(levetiracetam);

    // Weight-based acute regimen
    const weightRegimen = {
      id: "weight-test-regimen",
      indication: "Status Epilepticus",
      setting: "acute_inpatient",
      route: "IV",
      refs: [],
      dose: {
        kind: "per_kg",
        amount: 0.9,
        unit: "mg",
        frequency: "once",
        max_single: 90,
      },
    };

    const renal = { value: null, basisUsed: "none", label: "Unspecified" };
    const resWeight = resolveRegimen(levetiracetam, weightRegimen, { isPediatric: false }, renal);
    assert.equal(resWeight.state, "needs_input");
    assert.equal(resWeight.amount, undefined, "Computed amount must be undefined when weight is missing");
    assert.ok(resWeight.ruleText.includes("0.9 mg/kg"));
  });

  // User Story 3: Entering age, sex, weight, SCr (µmol/L) computes CrCl (Cockcroft-Gault) and states formula and weight basis used.
  test("User Story 3: Entering age, sex, weight, SCr (µmol/L) computes CrCl with formula and weight basis", () => {
    // 65 yo male, 70 kg, SCr 100 umol/L
    const cg = crclCG({
      ageYears: 65,
      sex: "male",
      weightKg: 70,
      scr: { value: 100, unit: "umol/L" },
      isPediatric: false,
    });

    assert.ok(cg);
    assert.ok(cg.value > 60 && cg.value < 75);
    assert.ok(cg.formula.includes("Cockcroft-Gault"));
    assert.equal(cg.inputsUsed.age, 65);
    assert.equal(cg.inputsUsed.weightKg, 70);

    // Female correction factor (0.85)
    const cgFemale = crclCG({
      ageYears: 65,
      sex: "female",
      weightKg: 70,
      scr: { value: 100, unit: "umol/L" },
      isPediatric: false,
    });
    assert.ok(cgFemale);
    assert.ok(Math.abs(cgFemale.value - cg.value * 0.85) < 0.2);
  });

  // User Story 4: Adding Carbamazepine + Apixaban shows a red curated alert with source, management, and simulate swap.
  test("User Story 4: Carbamazepine + Apixaban generates curated alert with source, management, and alternatives", () => {
    const analysis = analyzeRegimen(["carbamazepine", "apixaban"], {
      drugs: allDrugs,
      interactions: interactions,
    });

    assert.equal(analysis.curated.length, 1);
    const alert = analysis.curated[0];
    assert.equal(alert.severity, "contraindicated");
    assert.ok(alert.management.length > 0);
    assert.ok(alert.refs.length > 0);
    assert.equal(alert.refs[0].source_id, "fda-carbamazepine-label");

    // Alternatives include a non-inducing option
    assert.ok(alert.alternatives.length > 0);
    assert.equal(alert.alternatives[0].drug_id, "levetiracetam-oral");

    // Simulating swap replaces carbamazepine with levetiracetam-oral
    const newRegimen = ["carbamazepine", "apixaban"].map((id) =>
      id === "carbamazepine" ? alert.alternatives[0].drug_id : id
    );
    assert.deepEqual(newRegimen, ["levetiracetam-oral", "apixaban"]);

    // Re-running analysis on new regimen eliminates the contraindicated alert
    const newAnalysis = analyzeRegimen(newRegimen, {
      drugs: allDrugs,
      interactions: interactions,
    });
    assert.equal(newAnalysis.curated.length, 0);
  });

  // User Story 5: A drug in draft status shows Pending verification and no dosing numbers anywhere.
  test("User Story 5: A drug in draft status suppresses computed dosing numbers and generated orders", () => {
    // Draft drug (e.g. apixaban before verification)
    const apixaban = allDrugs.find((d) => d.id === "apixaban");
    assert.ok(apixaban);
    assert.equal(apixaban.status, "draft");

    const patient = { weightKg: 70, ageYears: 65, scr: { value: 90, unit: "umol/L" }, isPediatric: false };
    const renal = { value: 90, basisUsed: "cg_abw", label: "Normal" };
    const res = resolveRegimen(apixaban, apixaban.regimens[0], patient, renal);

    // Dose engine returns safety lockout
    assert.equal(res.state, "blocked_draft");
    assert.equal(res.amount, undefined, "Draft drug must never return computed dose amount");
    assert.ok(res.ruleText.includes("Pending verification"));
    assert.ok(res.explanation[0].includes("draft"));
  });

  // User Story 6: Every displayed numeric clinical value can show its source (title, section, quote) in one click.
  test("User Story 6: Clinical numeric values retain source provenance linking to registered sources", () => {
    // Build sources map from array
    const sourceMap = new Map(sources.map((s) => [s.id, s]));

    // Verify verified drug levetiracetam-oral has complete valid refs
    const levetiracetam = allDrugs.find((d) => d.id === "levetiracetam-oral");
    assert.ok(levetiracetam);

    for (const reg of levetiracetam.regimens) {
      assert.ok(reg.refs.length > 0, `Regimen ${reg.id} missing refs`);
      for (const ref of reg.refs) {
        assert.ok(sourceMap.has(ref.source_id), `Unknown source_id ${ref.source_id}`);
        assert.ok(ref.locator.length > 0, `Empty locator in ${reg.id}`);
        assert.ok(ref.quote.length > 0, `Empty quote in ${reg.id}`);
        assert.ok(ref.quote.length <= 400, `Quote too long in ${reg.id}`);
      }

      if (reg.renal_bands) {
        for (const band of reg.renal_bands) {
          assert.ok(band.refs.length > 0, `Band missing refs in ${reg.id}`);
          for (const ref of band.refs) {
            assert.ok(sourceMap.has(ref.source_id));
            assert.ok(ref.quote.length > 0);
          }
        }
      }
    }
  });

  // User Story 7: App works fully with network disabled after first load (PWA assets check).
  test("User Story 7: PWA manifest, service worker, and offline cache configuration exist and are valid", () => {
    const swPath = path.resolve(process.cwd(), "public/neurorx-sw.js");
    const manifestPath = path.resolve(process.cwd(), "public/neurorx-manifest.json");

    assert.ok(fs.existsSync(swPath), "public/neurorx-sw.js must exist");
    assert.ok(fs.existsSync(manifestPath), "public/neurorx-manifest.json must exist");

    const swContent = fs.readFileSync(swPath, "utf8");
    assert.ok(swContent.includes("/neurorx"), "Service worker must cache /neurorx route");
    assert.ok(swContent.includes("CACHE_NAME"), "Service worker must define cache name");

    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    assert.ok(manifest.name.includes("NeuroRx"));
    assert.equal(manifest.start_url, "/neurorx");
    assert.equal(manifest.display, "standalone");
  });
});
