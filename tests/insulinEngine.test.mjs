import test from "node:test";
import assert from "node:assert/strict";
import {
  adjustDoseWithGuarantee,
  calculateActiveIob,
  createDefaultInsulinInputs,
  evaluateContextualTrajectory,
  evaluateInsulinTool,
  formatEmrSummary,
  getParameterVisualStates,
  getUnifiedCorrectionActrapid,
} from "../src/lib/neurocalc/tools/insulinEngine.ts";

function makeSnap(overrides = {}) {
  return {
    id: "snap-1",
    timeLabel: "02:00",
    mode: "18h",
    tp: "t4",
    shortTime: "02:00",
    tpLabel: "02:00 (Midnight)",
    clockHour: 2.0,
    bgMgDl: 180,
    novomix: 0,
    actrapid: 0,
    ivRate: 0,
    ketone: 0.4,
    osmTotal: 290,
    ...overrides,
  };
}

test("1. Morning 06:00 hypoglycemia (<70) holds NovoMix & Actrapid and orders Rule of 15", () => {
  const inputs = {
    ...createDefaultInsulinInputs(),
    mode: "06h",
    tp: "t0",
    bgMgDl: 58,
    doseMorn: 16,
    doseEve: 12,
  };
  const out = evaluateInsulinTool(inputs, [], 4, "en");
  assert.equal(out.kind, "inpatient");
  assert.equal(out.status.tone, "danger");
  assert.equal(out.suggestedActrapid, 0);
  assert.equal(out.suggestedNovomix, 8);
  assert.match(out.medicationOrder.primaryText, /HOLD morning NovoMix 30/i);
  assert.match(out.nutritionPlan.primaryText, /Rule of 15/i);
  assert.match(out.regimenAdjustment.primaryText, /12 → 10 units/);
});

test("2. Correction matrix: IOB deduction, rapid drop protection, and overwhelmed-insulin IOB skip", () => {
  const baseTraj = {
    hasPrior: true,
    lastSnap: makeSnap(),
    lastShortTime: "08:30",
    lastTimeStr: "08:30",
    lastBg: 260,
    lastKetone: 0.2,
    lastOsm: 290,
    lastNovomix: 0,
    lastActrapid: 4,
    lastIvRate: 0,
    deltaHours: 2.0,
    deltaBg: 20,
    deltaMmol: 1.1,
    rateBgPerHour: 10,
    rateMmolPerHour: 0.55,
    rateKetonePerHour: null,
    rateOsmPerHour: null,
    iob: {
      activeUnits: 2.6,
      actrapidRem: 2.6,
      novomixRapidRem: 0,
      protaminePeakWarning: false,
    },
    isf: 57,
    expectedFurtherDrop: 96,
    projectedBg2h: 184,
    safeFloor: 105,
    isRapidDrop: false,
    isVeryRapidDrop: false,
    isRisingFast: false,
    isRateInducedHypoRisk: false,
    isIobInducedHypoRisk: false,
    hasImpendingHypoRisk: false,
    isStackingRisk: true,
    hadRecentHypo: false,
    recentHypoLabel: "",
    recentHypoBg: 0,
  };

  // Standard premeal BG 320, TDD 30 -> tierBase 4, deduct 3 u IOB -> 1 u
  const withIob = getUnifiedCorrectionActrapid(
    320,
    30,
    false,
    baseTraj,
    { tpRole: "premeal", mode: "06h" },
    "en"
  );
  assert.equal(withIob.finalDose, 1);

  // Rapid drop (<= -50 mg/dL/h) cuts remaining dose in half at daytime premeal
  const rapidTraj = {
    ...baseTraj,
    deltaBg: -120,
    rateBgPerHour: -60,
    isRapidDrop: true,
  };
  const withRapid = getUnifiedCorrectionActrapid(
    320,
    30,
    false,
    rapidTraj,
    { tpRole: "premeal", mode: "06h" },
    "en"
  );
  assert.equal(withRapid.finalDose, 0);

  // Overwhelmed prior insulin (deltaHours >= 3.0 and deltaBg >= 40) skips IOB deduction
  const overwhelmedTraj = {
    ...baseTraj,
    deltaHours: 3.5,
    deltaBg: 60,
    rateBgPerHour: 17,
  };
  const skippedIob = getUnifiedCorrectionActrapid(
    320,
    30,
    false,
    overwhelmedTraj,
    { tpRole: "premeal", mode: "06h" },
    "en"
  );
  assert.equal(skippedIob.finalDose, 4);
});

test("3. Somogyi recent-hypo protection reduces 06:00 NovoMix by 20% and cuts Actrapid by 50%", () => {
  const inputs = {
    ...createDefaultInsulinInputs(),
    mode: "06h",
    tp: "t0",
    bgMgDl: 280,
    doseMorn: 15,
    doseEve: 10,
  };
  const priorHypo = makeSnap({ bgMgDl: 55, shortTime: "02:00" });
  const out = evaluateInsulinTool(inputs, [priorHypo], 4.0, "en");
  assert.equal(out.kind, "inpatient");
  assert.equal(out.suggestedNovomix, 12);
  assert.equal(out.suggestedActrapid, 1);
});

test("4. adjustDoseWithGuarantee always shifts by at least 1 unit when baseDose > 0", () => {
  assert.equal(adjustDoseWithGuarantee(2, 0.85, "down"), 1);
  assert.equal(adjustDoseWithGuarantee(1, 0.5, "down"), 1);
  assert.equal(adjustDoseWithGuarantee(2, 1.15, "up"), 3);
  assert.equal(adjustDoseWithGuarantee(0, 0.8, "down"), 0);
});

test("5. DKA T0 K+ < 3.5 locks FRIII; oliguria blocks routine KCl; pH < 7.00 triggers NaHCO3", () => {
  const lowKInputs = {
    ...createDefaultInsulinInputs(),
    mode: "dka",
    tp: "t0",
    bgMgDl: 420,
    weight: 60,
    k: 3.1,
    ph: 6.92,
    hco3: 6.0,
    ketone: 4.5,
  };
  const lowKOut = evaluateInsulinTool(lowKInputs, [], 1, "en");
  assert.equal(lowKOut.kind, "dka");
  assert.equal(lowKOut.suggestedIvRate, 0);
  assert.ok(lowKOut.axes);
  assert.match(lowKOut.axes.insulin.primaryText, /0\.0 units\/h/);
  assert.match(
    lowKOut.axes.potassiumAcidBase.bullets.join(" "),
    /Sodium Bicarbonate/i
  );

  const oliguriaInputs = {
    ...lowKInputs,
    k: 4.2,
    hasOliguria: true,
  };
  const oliguriaOut = evaluateInsulinTool(oliguriaInputs, [], 1, "en");
  assert.equal(oliguriaOut.kind, "dka");
  assert.ok(oliguriaOut.axes);
  assert.match(
    oliguriaOut.axes.potassiumAcidBase.primaryText,
    /DO NOT add routine KCl/i
  );
  assert.equal(oliguriaOut.suggestedIvRate, 6.0);
});

test("6. DKA T0 hypoglycemic ketosis blocks insulin and orders IV Dextrose + Thiamine", () => {
  const inputs = {
    ...createDefaultInsulinInputs(),
    mode: "dka",
    tp: "t0",
    bgMgDl: 58,
    ketone: 3.5,
    ph: 7.22,
    hco3: 13.0,
  };
  const out = evaluateInsulinTool(inputs, [], 1, "en");
  assert.equal(out.kind, "dka");
  assert.equal(out.axes, null);
  assert.ok(out.nonDkaFallback);
  assert.equal(out.nonDkaFallback.code, "HYPOGLYCEMIC_KETOACIDOSIS");
  assert.match(out.nonDkaFallback.section.primaryText, /DO NOT INFUSE INSULIN/i);
  assert.match(
    out.nonDkaFallback.section.bullets.join(" "),
    /Thiamine.*100–200 mg/i
  );
});

test("7. Euglycemic DKA requires SGLT2i/DM toggle; enables D10% + 0.05 u/kg/h", () => {
  const base = {
    ...createDefaultInsulinInputs(),
    mode: "dka",
    tp: "t0",
    bgMgDl: 155,
    weight: 60,
    ketone: 4.2,
    ph: 7.18,
    hco3: 11.0,
    isEuglycemicAllowed: false,
  };
  const unchecked = evaluateInsulinTool(base, [], 1, "en");
  assert.equal(unchecked.kind, "dka");
  assert.ok(unchecked.nonDkaFallback);
  assert.equal(unchecked.nonDkaFallback.code, "EUGLYCEMIC_UNCHECKED");

  const checked = evaluateInsulinTool(
    { ...base, isEuglycemicAllowed: true },
    [],
    1,
    "en"
  );
  assert.equal(checked.kind, "dka");
  assert.equal(checked.activeSyndrome, "DKA");
  assert.equal(checked.suggestedIvRate, 3.0);
  assert.ok(checked.axes);
  assert.match(checked.axes.fluids.primaryText, /10% Dextrose/i);
});

test("8. HHS T0 delays FRIII when no mild ketones/plateau; starts 0.05 u/kg/h on plateau or T1", () => {
  const hhsT0 = {
    ...createDefaultInsulinInputs(),
    mode: "dka",
    tp: "t0",
    bgMgDl: 680,
    weight: 70,
    na: 150,
    ureaMmol: 14,
    ketone: 0.4,
    ph: 7.36,
    hco3: 22.0,
    isPlateau: false,
  };
  const delayed = evaluateInsulinTool(hhsT0, [], 1, "en");
  assert.equal(delayed.kind, "dka");
  assert.equal(delayed.activeSyndrome, "HHS");
  assert.equal(delayed.suggestedIvRate, 0);

  const plateau = evaluateInsulinTool(
    { ...hhsT0, isPlateau: true },
    [],
    1,
    "en"
  );
  assert.equal(plateau.kind, "dka");
  assert.equal(plateau.suggestedIvRate, 3.5);
});

test("9. FRIII caps at 15.0 u/h (and 7.5 u/h when BG < 250) for weight > 150 kg; CHF cuts fluids 50%", () => {
  const heavy = {
    ...createDefaultInsulinInputs(),
    mode: "dka",
    tp: "t0",
    bgMgDl: 450,
    weight: 180,
    ketone: 4.5,
    ph: 7.15,
    hco3: 11.0,
    hasCHF: true,
  };
  const out = evaluateInsulinTool(heavy, [], 1, "en");
  assert.equal(out.kind, "dka");
  assert.equal(out.suggestedIvRate, 15.0);
  assert.ok(out.axes);
  assert.match(out.axes.fluids.primaryText, /250–500 mL/);

  const outLowBg = evaluateInsulinTool(
    { ...heavy, bgMgDl: 220, isEuglycemicAllowed: true },
    [],
    1,
    "en"
  );
  assert.equal(outLowBg.kind, "dka");
  assert.equal(outLowBg.suggestedIvRate, 7.5);
});

test("10. T1-T4 iatrogenic hypoglycemia (<70) stops FRIII and orders IV Dextrose", () => {
  const inputs = {
    ...createDefaultInsulinInputs(),
    mode: "dka",
    tp: "t2",
    lockedSyndrome: "DKA",
    bgMgDl: 62,
    ketone: 1.8,
    ph: 7.25,
    hco3: 14.0,
  };
  const out = evaluateInsulinTool(inputs, [], 2, "en");
  assert.equal(out.kind, "dka");
  assert.equal(out.suggestedIvRate, 0);
  assert.ok(out.axes);
  assert.match(out.axes.insulin.primaryText, /STOP IV INSULIN/i);
  assert.match(out.axes.fluids.primaryText, /150–200 mL 10% Dextrose/i);
});

test("11. Bilingual EN & VI parity and EMR summary formatting", () => {
  const inputs = {
    ...createDefaultInsulinInputs(),
    mode: "06h",
    tp: "t0",
    bgMgDl: 290,
  };
  const enOut = evaluateInsulinTool(inputs, [], 4, "en");
  const viOut = evaluateInsulinTool(inputs, [], 4, "vi");
  const enEmr = formatEmrSummary(inputs, enOut, "en");
  const viEmr = formatEmrSummary(inputs, viOut, "vi");

  assert.match(enEmr, /CLINICAL DECISION SUPPORT SUMMARY/);
  assert.match(viEmr, /PHIẾU HỖ TRỢ QUYẾT ĐỊNH LÂM SÀNG/);
  assert.ok(enOut.kind === "inpatient" && enOut.medicationOrder.primaryText.length > 10);
  assert.ok(viOut.kind === "inpatient" && viOut.medicationOrder.primaryText.length > 10);
});

test("12. Insulin-Naive hypoglycemia (<70) triggers emergency rescue and >350 triggers DKA/HHS screening", () => {
  const naiveHypo06 = {
    ...createDefaultInsulinInputs(),
    mode: "06h",
    tp: "t0",
    isNaive: true,
    bgMgDl: 55,
  };
  const out06 = evaluateInsulinTool(naiveHypo06, [], 4, "en");
  assert.equal(out06.kind, "inpatient");
  assert.equal(out06.status.tone, "danger");
  assert.equal(out06.suggestedNovomix, 0);
  assert.match(out06.medicationOrder.primaryText, /Rule of 15/i);
  assert.equal(out06.timeline[0]?.critical, true);

  const naiveHypo18 = {
    ...naiveHypo06,
    mode: "18h",
  };
  const out18 = evaluateInsulinTool(naiveHypo18, [], 4, "en");
  assert.equal(out18.kind, "inpatient");
  assert.equal(out18.status.tone, "danger");
  assert.equal(out18.suggestedNovomix, 0);

  const naiveSevere = {
    ...naiveHypo06,
    bgMgDl: 420,
  };
  const outSevere = evaluateInsulinTool(naiveSevere, [], 4, "en");
  assert.equal(outSevere.kind, "inpatient");
  assert.equal(outSevere.status.tone, "danger");
  assert.match(outSevere.medicationOrder.bullets.join(" "), /STAT LABS REQUIRED/i);
});

test("13. DKA T4 hyperchloremic acidosis (Ketone < 0.6 & pH >= 7.30 & HCO3- < 15) resolves per JBDS 02", () => {
  const t4Inputs = {
    ...createDefaultInsulinInputs(),
    mode: "dka",
    tp: "t4",
    lockedSyndrome: "DKA",
    bgMgDl: 180,
    ketone: 0.4,
    ph: 7.33,
    hco3: 14.0,
  };
  const t4Out = evaluateInsulinTool(t4Inputs, [], 2, "en");
  assert.equal(t4Out.kind, "dka");
  assert.equal(t4Out.isResolved, true);
  assert.ok(t4Out.axes);
  assert.match(
    t4Out.axes.insulin.bullets.join(" "),
    /hyperchloremic acidosis/i
  );

  const t1Out = evaluateInsulinTool({ ...t4Inputs, tp: "t1" }, [], 2, "en");
  assert.equal(t1Out.kind, "dka");
  assert.equal(t1Out.isResolved, false);
});

test("14. DKA T0 with K+ 4.0 aligns Axis 1 and Axis 2 (KCl from Bag 2 onward)", () => {
  const inputs = {
    ...createDefaultInsulinInputs(),
    mode: "dka",
    tp: "t0",
    bgMgDl: 420,
    k: 4.0,
    ph: 7.15,
    hco3: 12.0,
    ketone: 4.2,
  };
  const out = evaluateInsulinTool(inputs, [], 1, "en");
  assert.equal(out.kind, "dka");
  assert.ok(out.axes);
  assert.match(out.axes.fluids.primaryText, /no KCl in first bag/i);
  assert.match(
    out.axes.potassiumAcidBase.primaryText,
    /No KCl in hour-1 resuscitation bag/i
  );
});

test("15. High-risk (-20%) and midnight 02:00 (50%) reduce Tier-1 2 units down to 1 unit", () => {
  const emptyTraj = evaluateContextualTrajectory(
    createDefaultInsulinInputs(),
    [],
    4
  );

  const highRisk = getUnifiedCorrectionActrapid(
    270,
    30,
    true,
    emptyTraj,
    { tpRole: "premeal", mode: "06h" },
    "en"
  );
  assert.equal(highRisk.finalDose, 1);

  const midnight = getUnifiedCorrectionActrapid(
    270,
    30,
    false,
    emptyTraj,
    { tpRole: "night_02h", mode: "18h" },
    "en"
  );
  assert.equal(midnight.finalDose, 1);
});

test("16. Cross-mode snapshot isolation keeps rateKetonePerHour/rateOsmPerHour null after inpatient snapshot", () => {
  const inpatientSnap = makeSnap({
    mode: "06h",
    tp: "t0",
    ketone: null,
    osmTotal: null,
    novomix: 14,
  });
  const dkaInputs = {
    ...createDefaultInsulinInputs(),
    mode: "dka",
    tp: "t1",
    lockedSyndrome: "DKA",
    bgMgDl: 420,
    ketone: 4.2,
  };
  const traj = evaluateContextualTrajectory(dkaInputs, [inpatientSnap], 2.0);
  assert.equal(traj.rateKetonePerHour, null);
  assert.equal(traj.rateOsmPerHour, null);
});

test("17. protaminePeakWarning triggers between 3.5h and 8.5h (including 7.0h) when NovoMix >= 8 u", () => {
  const snap = makeSnap({ novomix: 12, actrapid: 0 });
  const iob = calculateActiveIob(snap, 7.0);
  assert.equal(iob.activeUnits, 0);
  assert.equal(iob.protaminePeakWarning, true);
});

test("18. BG 250 visual state pill is danger (HIGH >=250) while BG 249 is warning (181-249)", () => {
  const s249 = getParameterVisualStates(
    { ...createDefaultInsulinInputs(), bgMgDl: 249 },
    "en"
  );
  assert.equal(s249.bg.tone, "warning");
  assert.match(s249.bg.label, /181–249/);

  const s250 = getParameterVisualStates(
    { ...createDefaultInsulinInputs(), bgMgDl: 250 },
    "en"
  );
  assert.equal(s250.bg.tone, "danger");
  assert.match(s250.bg.label, /≥250/);
});
