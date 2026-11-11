import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { totalLEDD, resolveNpoConversions } from "../src/lib/neurorx/ledd.ts";

test("LEDD Engine: Fixture test with artificial factors", () => {
  const fixtureFactors = [
    {
      drug_id: "fake-agonist",
      drug_name: "Fake Agonist",
      factor: 50.0,
      unit: "mg",
      refs: [{ source_id: "fake-src", locator: "p.1", quote: "Fake quote" }],
    },
    {
      drug_id: "fake-ldopa",
      drug_name: "Fake L-Dopa",
      factor: 1.0,
      unit: "mg",
      refs: [{ source_id: "fake-src", locator: "p.1", quote: "Fake quote" }],
    },
  ];

  const regimen = [
    { drug_id: "fake-agonist", dose_mg: 2, times_per_day: 3 }, // 6 mg/day * 50 = 300
    { drug_id: "fake-ldopa", dose_mg: 100, times_per_day: 4 }, // 400 mg/day * 1 = 400
  ];

  const result = totalLEDD(regimen, fixtureFactors);
  assert.equal(result.total_ledd_mg, 700);
  assert.equal(result.items.length, 2);
  assert.equal(result.items[0].ledd_mg, 300);
  assert.equal(result.items[1].ledd_mg, 400);
});

test("LEDD Engine: Official Tomlinson et al. (2010) data verification", () => {
  const filePath = path.resolve(process.cwd(), "data/neurorx/ledd-factors.json");
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  // Typical clinical regimen:
  // Levodopa/Carbidopa 100/25 mg IR: 1 tablet 4 times daily (400 mg levodopa) -> 400 mg LEDD
  // Pramipexole 0.5 mg: 3 times daily (1.5 mg) -> 1.5 * 100 = 150 mg LEDD
  // Rasagiline 1 mg: once daily -> 1 * 100 = 100 mg LEDD
  const regimen = [
    { drug_id: "levodopa-ir", dose_mg: 100, times_per_day: 4 },
    { drug_id: "pramipexole", dose_mg: 0.5, times_per_day: 3 },
    { drug_id: "rasagiline", dose_mg: 1, times_per_day: 1 },
  ];

  const result = totalLEDD(regimen, data.factors);
  // Expected: 400 + 150 + 100 = 650 mg LEDD
  assert.equal(result.total_ledd_mg, 650);
  assert.equal(result.items.length, 3);
});

test("LEDD Engine: Levodopa Controlled-Release (CR) 0.75 factor", () => {
  const filePath = path.resolve(process.cwd(), "data/neurorx/ledd-factors.json");
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  const regimen = [
    { drug_id: "levodopa-cr", dose_mg: 200, times_per_day: 2 }, // 400 mg * 0.75 = 300 mg LEDD
  ];

  const result = totalLEDD(regimen, data.factors);
  assert.equal(result.total_ledd_mg, 300);
});

test("LEDD Engine: COMT Inhibitor (Entacapone) modifier rule", () => {
  const filePath = path.resolve(process.cwd(), "data/neurorx/ledd-factors.json");
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  // With Levodopa: 400 mg daily + Entacapone
  const regimenWithLdopa = [
    { drug_id: "levodopa-ir", dose_mg: 100, times_per_day: 4 }, // 400 mg
    { drug_id: "entacapone", dose_mg: 200, times_per_day: 4 },  // +33% of 400 mg = 132 mg LEDD
  ];

  const result = totalLEDD(regimenWithLdopa, data.factors);
  assert.equal(result.total_ledd_mg, 532);
  assert.equal(result.modifiers_applied.length, 1);
  assert.ok(result.modifiers_applied[0].includes("added 132 mg LEDD"));

  // Without Levodopa: Entacapone alone gives 0 LEDD
  const regimenAlone = [
    { drug_id: "entacapone", dose_mg: 200, times_per_day: 3 },
  ];
  const resultAlone = totalLEDD(regimenAlone, data.factors);
  assert.equal(resultAlone.total_ledd_mg, 0);
  assert.equal(resultAlone.items[0].ledd_mg, 0);
});

test("LEDD Engine: NPO Rotigotine Patch Conversion with Brennan & Genever (2010)", () => {
  const filePath = path.resolve(process.cwd(), "data/neurorx/ledd-factors.json");
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  // Total LEDD = 300 mg -> 300 / 30 = 10 mg/24h rotigotine patch
  const npoResults = resolveNpoConversions(300, data.npo_conversions);
  assert.equal(npoResults.length, 2);

  const rotigotine = npoResults.find((r) => r.to.includes("Rotigotine"));
  assert.ok(rotigotine);
  assert.equal(rotigotine.computed_dose, 10);
  assert.equal(rotigotine.unit, "mg/24h");
  assert.equal(rotigotine.is_capped, false);
  assert.equal(rotigotine.recommended_patch_combination, "1 × 8 mg/24h patch + 1 × 2 mg/24h patch");

  // High total LEDD = 900 mg -> 900 / 30 = 30 mg -> Capped at maximum 16 mg/24h
  const highLeddResults = resolveNpoConversions(900, data.npo_conversions);
  const cappedRotigotine = highLeddResults.find((r) => r.to.includes("Rotigotine"));
  assert.ok(cappedRotigotine);
  assert.equal(cappedRotigotine.computed_dose, 16);
  assert.equal(cappedRotigotine.is_capped, true);
  assert.equal(cappedRotigotine.recommended_patch_combination, "2 × 8 mg/24h patch");

  // Non-computable enteral tube option
  const ngOption = npoResults.find((r) => r.to.includes("Enteral tube"));
  assert.ok(ngOption);
  assert.ok(ngOption.rule_text.includes("dispersible levodopa/benserazide or crushed standard"));
  assert.equal(ngOption.computed_dose, undefined);
});
