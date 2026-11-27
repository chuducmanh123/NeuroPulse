import test from "node:test";
import assert from "node:assert/strict";
import {
  createDefaultBloodGasInputs,
  evaluateBloodGas,
  formatBloodGasReport,
  kpaToMmHg,
  mmHgToKpa,
  resolveEffectiveHco3,
} from "../src/lib/neurocalc/tools/bloodGasEngine.ts";

function makeInputs(overrides = {}) {
  return {
    ...createDefaultBloodGasInputs(),
    ...overrides,
  };
}

test("1. Kassirer-Bleich internal consistency & Hasan §9.2 BE rule", () => {
  // Consistent: pH 7.40, PaCO2 40, HCO3 24 -> [H+] = 40
  const ok = evaluateBloodGas(
    makeInputs({ ph: 7.4, pco2MmHg: 40, hco3: 24, be: 0 }),
    "en"
  );
  assert.equal(ok.step1.isConsistent, true);
  assert.ok(Math.abs(ok.step1.hPlusCalc - 40) < 0.1);
  assert.ok(ok.step1.beCheck && ok.step1.beCheck.matchesMeasured);

  // Hasan §9.2 example: PaCO2 52 (+12 -> -0.1) & BE +6 (+6 -> +0.1) => pH 7.40
  const hasanEx = evaluateBloodGas(
    makeInputs({ ph: 7.4, pco2MmHg: 52, hco3: 30, be: 6 }),
    "en"
  );
  assert.ok(hasanEx.step1.beCheck);
  assert.ok(Math.abs(hasanEx.step1.beCheck.estimatedPh - 7.4) < 0.01);

  // Inconsistent transcription: pH 7.10 but PaCO2 40, HCO3 24 ([H+]=40 vs 79)
  const bad = evaluateBloodGas(
    makeInputs({ ph: 7.1, pco2MmHg: 40, hco3: 24 }),
    "en"
  );
  assert.equal(bad.step1.isConsistent, false);
  assert.ok(bad.redFlags.some((f) => f.id === "inconsistent-abg"));
});

test("2. Unit conversions (kPa <-> mmHg) and tCO2 -> HCO3- estimation", () => {
  assert.ok(Math.abs(kpaToMmHg(8.0) - 60) < 0.01);
  assert.ok(Math.abs(mmHgToKpa(75) - 10) < 0.01);

  const res = resolveEffectiveHco3(makeInputs({ hco3: null, tco2: 25 }));
  assert.equal(res.effectiveHco3, 24);
  assert.equal(res.estimatedFromTco2, true);
});

test("3. Pure Acute Respiratory Acidosis & Type 2 Acute Respiratory Failure", () => {
  // PaCO2 60, HCO3 26, pH 7.25 -> [H+] = 24*60/26 = 55.4; meas = 56.2; dH/dCO2 = (56.2-40)/20 = 0.81 (>0.7)
  const out = evaluateBloodGas(
    makeInputs({ ph: 7.25, pco2MmHg: 60, hco3: 26, po2MmHg: 55, fio2Pct: 21, ageYears: 40 }),
    "en"
  );
  assert.equal(out.summary.disorderType, "simple");
  assert.equal(out.step3and4.detectedDisorders.respAcidosis, "acute");
  assert.ok(out.step3and4.deltaHOverDeltaPco2);
  assert.ok(out.step3and4.deltaHOverDeltaPco2.ratio > 0.7);
  assert.equal(out.summary.respiratoryFailureType, "type2_acute");
  assert.ok(out.step2.aaGradientMmHg !== null && out.step2.aaGradientMmHg > 14);
});

test("4. Chronic & Acute-on-Chronic Respiratory Acidosis (ΔH+/ΔPaCO2)", () => {
  // Chronic: PaCO2 65, HCO3 34, pH 7.34 -> meas H+ = 45.7; dH/dCO2 = 5.7/25 = 0.23 (<0.3)
  const chronic = evaluateBloodGas(
    makeInputs({ ph: 7.34, pco2MmHg: 65, hco3: 34 }),
    "en"
  );
  assert.equal(chronic.step3and4.detectedDisorders.respAcidosis, "chronic");
  assert.ok(
    chronic.step3and4.deltaHOverDeltaPco2 &&
      chronic.step3and4.deltaHOverDeltaPco2.ratio < 0.3
  );

  // Acute-on-chronic: PaCO2 70, HCO3 31, pH 7.26 -> meas H+ = 55.0; dH/dCO2 = 15/30 = 0.50 (0.3-0.7)
  const aoc = evaluateBloodGas(
    makeInputs({ ph: 7.26, pco2MmHg: 70, hco3: 31 }),
    "en"
  );
  assert.equal(aoc.step3and4.detectedDisorders.respAcidosis, "acute_on_chronic");
  assert.equal(aoc.summary.respiratoryFailureType, "type2_acute_on_chronic");
});

test("5. Type 1 Hypoxemic Failure, P/F ARDS tiers & CaO2 severe anemia warning", () => {
  const type1 = evaluateBloodGas(
    makeInputs({ ph: 7.46, pco2MmHg: 32, hco3: 22, po2MmHg: 52, fio2Pct: 40 }),
    "en"
  );
  assert.equal(type1.summary.respiratoryFailureType, "type1");
  assert.ok(type1.step2.pfRatio !== null && Math.abs(type1.step2.pfRatio - 130) < 1);
  assert.match(type1.step2.pfCategory || "", /Moderate ARDS/i);

  // Severe anemia with normal PaO2 -> low CaO2 warning
  const anemia = evaluateBloodGas(
    makeInputs({
      ph: 7.34,
      pco2MmHg: 34,
      hco3: 18,
      po2MmHg: 95,
      sao2Pct: 98,
      hbGDl: 5.5,
      cardiacOutputLMin: 5.0,
    }),
    "en"
  );
  assert.ok(anemia.step2.cao2MlDl !== null && anemia.step2.cao2MlDl < 10);
  assert.ok(anemia.step2.anemiaHypoxiaWarning);
  assert.ok(anemia.redFlags.some((f) => f.id === "low-cao2"));
});

test("6. Pure WAGMA (DKA) with appropriate Winter's compensation", () => {
  // HCO3 12 -> Winter's = 1.5*12+8 = 26 (±2 -> 24-28). PaCO2 26, pH 7.29.
  // Na 136, Cl 100, HCO3 12 -> AG = 24 (ΔAG=12, ΔHCO3=12 -> DR=1.0, BG=0)
  const dka = evaluateBloodGas(
    makeInputs({ ph: 7.29, pco2MmHg: 26, hco3: 12, na: 136, cl: 100 }),
    "en"
  );
  assert.equal(dka.summary.disorderType, "simple");
  assert.equal(dka.step3and4.detectedDisorders.metAcidosisWagma, true);
  assert.equal(dka.step3and4.detectedDisorders.metAcidosisNagma, false);
  assert.equal(dka.step3and4.detectedDisorders.metAlkalosis, false);
  assert.ok(dka.step5.deltaRatio !== null && Math.abs(dka.step5.deltaRatio - 1.0) < 0.05);
  assert.ok(dka.step5.bicarbonateGap !== null && Math.abs(dka.step5.bicarbonateGap) < 0.5);
});

test("7. Hypoalbuminemia-masked WAGMA with normal pH & normal HCO3-", () => {
  // pH 7.40, PaCO2 40, HCO3 24, Na 140, Cl 104 -> AG = 12 (looks normal!)
  // Albumin 1.6 g/dL -> AGc = 12 + 2.5*(4.0 - 1.6) = 18 -> Masked WAGMA + Met Alkalosis
  const masked = evaluateBloodGas(
    makeInputs({
      ph: 7.4,
      pco2MmHg: 40,
      hco3: 24,
      na: 140,
      cl: 104,
      albuminGDl: 1.6,
    }),
    "en"
  );
  assert.equal(masked.step5.maskedWagmaByHypoalbuminemia, true);
  assert.equal(masked.summary.disorderType, "mixed_counterbalancing");
  assert.equal(masked.step3and4.detectedDisorders.metAcidosisWagma, true);
  assert.equal(masked.step3and4.detectedDisorders.metAlkalosis, true);
});

test("8. Hasan full AGc & Low/Negative AG (Bromide / Hyperlipidemia)", () => {
  const negAg = evaluateBloodGas(
    makeInputs({ ph: 7.4, pco2MmHg: 40, hco3: 24, na: 138, cl: 114 }),
    "en"
  );
  assert.equal(negAg.step5.agCategory, "negative_low");
  assert.ok(negAg.step5.negativeAgCauses.some((c) => /Pyridostigmine/i.test(c)));

  const hasanFull = evaluateBloodGas(
    makeInputs({
      ph: 7.3,
      pco2MmHg: 32,
      hco3: 15,
      na: 140,
      k: 4.0,
      cl: 100,
      albuminGDl: 4.0,
      phosphateMgDl: 4.0,
      lactate: 5.0,
    }),
    "en"
  );
  // ((140+4)-(100+15)) - (2*4 + 0.5*4) - 5 = 29 - 10 - 5 = 14
  assert.ok(hasanFull.step5.agHasanFull !== null);
  assert.ok(Math.abs(hasanFull.step5.agHasanFull - 14) < 0.1);
});

test("9. Triple Acid-Base Disorder (Resp Alkalosis + WAGMA + Met Alkalosis)", () => {
  // pH 7.44, PaCO2 26 (low), HCO3 17 (low), Na 140, Cl 95 -> AG = 28, ΔAG = 16, ΔHCO3 = 7 -> BG = +9 (> +6 -> Met Alk!)
  // Winter's for HCO3 17 = 1.5*17+8 = 33.5 (31.5-35.5), actual PaCO2 26 < 31.5 -> Primary Resp Alkalosis!
  const triple = evaluateBloodGas(
    makeInputs({ ph: 7.44, pco2MmHg: 26, hco3: 17, na: 140, cl: 95 }),
    "en"
  );
  assert.equal(triple.summary.disorderType, "triple");
  assert.equal(triple.step3and4.detectedDisorders.metAcidosisWagma, true);
  assert.equal(triple.step3and4.detectedDisorders.metAlkalosis, true);
  assert.notEqual(triple.step3and4.detectedDisorders.respAlkalosis, "none");
});

test("10. Mixed Additive Disorders & Metabolic Alkalosis >60 mmHg PaCO2 limit", () => {
  // Additive acidosis: pH 7.12, PaCO2 55, HCO3 17
  const addAcid = evaluateBloodGas(
    makeInputs({ ph: 7.12, pco2MmHg: 55, hco3: 17 }),
    "en"
  );
  assert.equal(addAcid.summary.disorderType, "mixed_additive");

  // Additive alkalosis: pH 7.62, PaCO2 28, HCO3 29
  const addAlk = evaluateBloodGas(
    makeInputs({ ph: 7.62, pco2MmHg: 28, hco3: 29 }),
    "en"
  );
  assert.equal(addAlk.summary.disorderType, "mixed_additive");
  assert.ok(addAlk.redFlags.some((f) => f.id === "severe-alkalemia"));

  // Met alkalosis with PaCO2 64 (>60 limit) -> concurrent Resp Acidosis
  const over60 = evaluateBloodGas(
    makeInputs({ ph: 7.48, pco2MmHg: 64, hco3: 46 }),
    "en"
  );
  assert.equal(over60.step3and4.detectedDisorders.metAlkalosis, true);
  assert.notEqual(over60.step3and4.detectedDisorders.respAcidosis, "none");
});

test("11. Osmolal Gap, Urinary Anion Gap (UAG), and Urinary Chloride (UCl)", () => {
  const osmCase = evaluateBloodGas(
    makeInputs({
      ph: 7.22,
      pco2MmHg: 24,
      hco3: 10,
      na: 140,
      cl: 102,
      glucoseMmol: 5,
      ureaMmol: 5,
      measuredOsm: 325,
    }),
    "en"
  );
  // calcOsm = 2*140+5+5 = 290; OsmGap = 35 (>15)
  assert.equal(osmCase.step5.osmolalGap, 35);
  assert.equal(osmCase.step5.osmolalGapElevated, true);
  assert.ok(osmCase.redFlags.some((f) => f.id === "high-osm-gap"));

  // NAGMA + negative UAG -> GI loss
  const giNagma = evaluateBloodGas(
    makeInputs({
      ph: 7.28,
      pco2MmHg: 28,
      hco3: 13,
      na: 138,
      cl: 115,
      uNa: 30,
      uK: 20,
      uCl: 80,
    }),
    "en"
  );
  assert.equal(giNagma.step5.uag, -30);
  assert.match(giNagma.step5.uagInterpretation || "", /Extrarenal/i);

  // Positive UAG -> RTA
  const rtaNagma = evaluateBloodGas(
    makeInputs({
      ph: 7.28,
      pco2MmHg: 28,
      hco3: 13,
      na: 138,
      cl: 115,
      uNa: 45,
      uK: 25,
      uCl: 40,
    }),
    "en"
  );
  assert.equal(rtaNagma.step5.uag, 30);
  assert.match(rtaNagma.step5.uagInterpretation || "", /RTA/i);

  // Met Alkalosis UCl < 20 vs >= 20
  const salResp = evaluateBloodGas(
    makeInputs({ ph: 7.52, pco2MmHg: 48, hco3: 38, uCl: 10 }),
    "en"
  );
  assert.match(salResp.step5.uClInterpretation || "", /Saline-responsive/i);
});

test("12. VBG suppresses arterial O2 classification & surfaces venous lactate caveat", () => {
  const vbg = evaluateBloodGas(
    makeInputs({
      sampleType: "pvbg",
      ph: 7.36,
      pco2MmHg: 46,
      po2MmHg: 38,
      hco3: 25,
      lactate: 2.5,
    }),
    "en"
  );
  assert.equal(vbg.step2.isVbg, true);
  assert.equal(vbg.step2.pfRatio, null);
  assert.equal(vbg.step2.aaGradientMmHg, null);
  assert.equal(vbg.summary.respiratoryFailureType, "vbg_na");
  assert.ok(vbg.step1.vbgAndLactateNotes.some((n) => /50–100%/.test(n)));
});

test("13. Temperature correction & pre-analytical artefacts", () => {
  const fever = evaluateBloodGas(
    makeInputs({
      ph: 7.4,
      pco2MmHg: 40,
      hco3: 24,
      po2MmHg: 148,
      fio2Pct: 21,
      tempC: 39.5,
      artefactAirBubble: true,
    }),
    "en"
  );
  assert.ok(fever.step1.tempAdjustment?.direction === "fever");
  assert.ok(fever.step1.artefactNotes.some((n) => /Air bubble/i.test(n)));
});

test("14. Bilingual EN/VI parity & formatted EMR report", () => {
  const inputs = makeInputs({
    ph: 7.18,
    pco2MmHg: 24,
    hco3: 9,
    po2MmHg: 92,
    na: 136,
    cl: 99,
    k: 6.2,
    lactate: 6.5,
  });
  const en = evaluateBloodGas(inputs, "en");
  const vi = evaluateBloodGas(inputs, "vi");

  assert.ok(en.redFlags.some((f) => f.id === "severe-acidemia"));
  assert.ok(en.redFlags.some((f) => f.id === "critical-potassium"));
  assert.ok(en.redFlags.some((f) => f.id === "high-lactate"));

  const reportEn = formatBloodGasReport(inputs, en, "en");
  const reportVi = formatBloodGasReport(inputs, vi, "vi");
  assert.match(reportEn, /BLOOD GAS & ACID-BASE INTERPRETATION/);
  assert.match(reportVi, /PHÂN TÍCH KHÍ MÁU & TOAN KIỀM/);
});

test("15. Metabolic acidosis without Na+/Cl- classifies as metAcidosisUnspecified (not NAGMA)", () => {
  const out = evaluateBloodGas(
    makeInputs({ ph: 7.25, pco2MmHg: 25, hco3: 11 }),
    "en"
  );
  assert.equal(out.step3and4.detectedDisorders.metAcidosisUnspecified, true);
  assert.equal(out.step3and4.detectedDisorders.metAcidosisNagma, false);
  assert.equal(out.step3and4.detectedDisorders.metAcidosisWagma, false);
  assert.equal(out.summary.primaryLabel, "Metabolic Acidosis");
  assert.ok(out.summary.notes.some((n) => /Anion Gap pending/i.test(n)));
});

test("16. Normal peripheral VBG (pH 7.33, PCO2 48, HCO3- 25) classifies as normal", () => {
  const out = evaluateBloodGas(
    makeInputs({ sampleType: "pvbg", ph: 7.33, pco2MmHg: 48, hco3: 25 }),
    "en"
  );
  assert.equal(out.summary.disorderType, "normal");
  assert.equal(out.step3and4.detectedDisorders.respAcidosis, "none");
});

test("17. Severe metabolic acidosis with pseudo-normal PaCO2 triggers inadequate-met-acid-comp Red Flag", () => {
  // HCO3 10 -> Winter's upper = 25; actual PaCO2 38 (>25, even though <=45)
  const out = evaluateBloodGas(
    makeInputs({ ph: 7.04, pco2MmHg: 38, hco3: 10, na: 138, cl: 100 }),
    "en"
  );
  assert.ok(out.redFlags.some((f) => f.id === "inadequate-met-acid-comp"));
  assert.notEqual(out.step3and4.detectedDisorders.respAcidosis, "none");
});

test("18. Pure Metabolic Alkalosis with mild AG 14 (Hasan §9.8) does not falsely add WAGMA", () => {
  const mildAg = evaluateBloodGas(
    makeInputs({ ph: 7.52, pco2MmHg: 48, hco3: 38, na: 140, cl: 88 }),
    "en"
  );
  // AG = 140 - (88 + 38) = 14 <= 16
  assert.equal(mildAg.step3and4.detectedDisorders.metAlkalosis, true);
  assert.equal(mildAg.step3and4.detectedDisorders.metAcidosisWagma, false);
  assert.ok(mildAg.step5.metAlkalosisMildAgNote);

  const highAg = evaluateBloodGas(
    makeInputs({ ph: 7.52, pco2MmHg: 48, hco3: 38, na: 144, cl: 84 }),
    "en"
  );
  // AG = 144 - (84 + 38) = 22 > 16 -> adds WAGMA
  assert.equal(highAg.step3and4.detectedDisorders.metAcidosisWagma, true);
});

test("19. Kassirer-Bleich mismatch sets summary.disorderType to invalid_sample", () => {
  const bad = evaluateBloodGas(
    makeInputs({ ph: 7.1, pco2MmHg: 40, hco3: 24 }),
    "en"
  );
  assert.equal(bad.summary.disorderType, "invalid_sample");
  assert.match(bad.summary.patternTag, /MISMATCH/i);
  assert.ok(!/Unverified/.test(bad.summary.primaryLabel));
  assert.ok(bad.summary.notes.some((n) => /Unverified/i.test(n)));
});

test("20. Mixed disorder surfaces Classic Mixed Clinical Syndromes", () => {
  // Metabolic acidosis + Respiratory alkalosis (e.g. Sepsis / Salicylate)
  const mixed = evaluateBloodGas(
    makeInputs({ ph: 7.42, pco2MmHg: 24, hco3: 15, na: 140, cl: 102 }),
    "en"
  );
  assert.ok(
    mixed.clinicalGuidance.etiologyGroups.some((g) =>
      /Classic Mixed Clinical Syndromes/i.test(g.category)
    )
  );
});
