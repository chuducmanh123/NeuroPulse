import { getQuote, updateDrug } from "./enhance_common.mjs";
import { computeContentHashSync } from "../../src/lib/neurorx/integrity.ts";

const AHA = "aha-acog-2026-maternal-stroke";

function appendRefField(existingField, newValue, locator, anchor) {
  const quote = getQuote(AHA, anchor, 25, 340);
  const newRef = { source_id: AHA, locator, quote };
  const prevRefs = (existingField?.refs || []).filter((r) => r.source_id !== AHA);
  return {
    value: newValue,
    refs: [...prevRefs, newRef],
  };
}

function syncVerificationHash(drug) {
  if (drug.status === "verified" && drug.verification) {
    drug.verification.content_hash = computeContentHashSync(drug);
  }
  return drug;
}

console.log("=== ENRICHING 21 DRUGS WITH AHA/ACOG 2026 MATERNAL STROKE STATEMENT ===");

// 1. LABETALOL
updateDrug("labetalol", (d) => {
  const rep = d.reproductive;
  rep.pregnancy_pk = appendRefField(
    rep.pregnancy_pk,
    "First-line oral and IV antihypertensive in pregnancy (AHA/ACOG 2026: start 200 mg 2–3 times daily, max 2,400 mg/day, titrate every 2–3 days toward goal <140/90 mmHg). UGT-mediated clearance increases during pregnancy; monitor fetal growth and newborns for transient hypoglycemia or bradycardia.",
    "Table 2: Antihypertensive medications in pregnant individuals",
    "First-line agent Labetalol: starting dose 200 mg 2–3 times a day"
  );
  rep.postpartum = appendRefField(
    rep.postpartum,
    "First-line postpartum antihypertensive (AHA/ACOG 2026: start 200 mg 2–3 times daily, max 2,400 mg/day, titrate every 2–3 days). Adjust carefully over days 3–6 when postpartum hypertension typically peaks, and taper downward as blood pressure stabilizes.",
    "Table 2: Postpartum treatment of hypertension",
    "Postpartum first-line agent Labetalol: starting dose 200 mg 2–3 times a day"
  );
  rep.lactation_rid = appendRefField(
    rep.lactation_rid,
    "0.04% to 0.6% (LactMed); 3.6% (AHA/ACOG 2026 Table 2)",
    "Table 2: Postpartum treatment of hypertension",
    "Postpartum first-line agent Labetalol: starting dose 200 mg 2–3 times a day"
  );
  return syncVerificationHash(d);
});

// 2. AMLODIPINE
updateDrug("amlodipine", (d) => {
  const rep = d.reproductive;
  rep.postpartum = appendRefField(
    rep.postpartum,
    "First-line postpartum antihypertensive (AHA/ACOG 2026: start 5 mg daily, max 10 mg/day, titrate every 5–7 days). Adjust as postpartum blood pressure peaks (days 3–6) and subsequently stabilizes.",
    "Table 2: Postpartum treatment of hypertension",
    "Postpartum first-line agent Amlodipine: starting dose 5 mg daily"
  );
  rep.lactation_rid = appendRefField(
    rep.lactation_rid,
    "1.7% to 4.3% of the weight-adjusted maternal dosage",
    "Table 2: Postpartum treatment of hypertension",
    "Postpartum first-line agent Amlodipine: starting dose 5 mg daily"
  );
  return syncVerificationHash(d);
});

// 3. FUROSEMIDE
updateDrug("furosemide", (d) => {
  const rep = d.reproductive;
  rep.postpartum = appendRefField(
    rep.postpartum,
    "Alternative postpartum antihypertensive/diuretic (AHA/ACOG 2026: start 10 mg daily, max 160 mg/day in 2–3 divided doses, titrate every 3–5 days). Reassess volume status and electrolytes postpartum.",
    "Table 2: Postpartum treatment of hypertension",
    "Postpartum alternative agent Furosemide: starting dose 10 mg daily"
  );
  rep.lactation_summary = appendRefField(
    rep.lactation_summary,
    "Minimal milk transfer (RID <= 1%) and safe for the infant (AHA/ACOG 2026), though loop diuretic doses >20 mg/day may decrease maternal breastmilk production.",
    "Table 2: Postpartum treatment of hypertension",
    "may decrease breastmilk production (dose >20 mg/d)"
  );
  return syncVerificationHash(d);
});

// 4. SPIRONOLACTONE
updateDrug("spironolactone", (d) => {
  const rep = d.reproductive;
  rep.pregnancy_pk = appendRefField(
    rep.pregnancy_pk,
    "Contraindicated in pregnancy (AHA/ACOG 2026 Table 2: mineralocorticoid receptor antagonists carry potential for fetal harm and anti-androgenic effects in animal models).",
    "Table 2: Antihypertensive medications in pregnant individuals",
    "Angiotensin-converting enzyme inhibitors, angiotensin receptor blockers, direct renin inhibitors, and mineralocorticoid receptor antagonists are contraindicated"
  );
  rep.postpartum = appendRefField(
    rep.postpartum,
    "Alternative postpartum agent (AHA/ACOG 2026: start 12.5 mg daily, titrate every 14–30 days). Reassess maternal volume status and serum potassium postpartum.",
    "Table 2: Postpartum treatment of hypertension",
    "Postpartum alternative agent Spironolactone: starting dose 12.5 mg daily"
  );
  rep.lactation_rid = appendRefField(
    rep.lactation_rid,
    "0.2% to 1.2% (LactMed); 2% to 4.3% (AHA/ACOG 2026 Table 2)",
    "Table 2: Postpartum treatment of hypertension",
    "Postpartum alternative agent Spironolactone: starting dose 12.5 mg daily"
  );
  return syncVerificationHash(d);
});

// 5. METOPROLOL
updateDrug("metoprolol", (d) => {
  const rep = d.reproductive;
  rep.postpartum = appendRefField(
    rep.postpartum,
    "Alternative postpartum agent (AHA/ACOG 2026: metoprolol tartrate start 12.5 mg twice daily, max 200 mg twice daily, titrate every 2–3 days). Reduce pregnancy-escalated doses promptly postpartum as CYP2D6 normalizes.",
    "Table 2: Postpartum treatment of hypertension",
    "Postpartum alternative agent Metoprolol tartrate: starting dose 12.5 mg twice daily"
  );
  return syncVerificationHash(d);
});

// 6. BISOPROLOL
updateDrug("bisoprolol", (d) => {
  const rep = d.reproductive;
  rep.postpartum = appendRefField(
    rep.postpartum,
    "Alternative postpartum agent (AHA/ACOG 2026: start 2.5 mg daily, max 20 mg/day, titrate every 5–7 days). Reduce pregnancy-escalated doses postpartum and monitor newborns exposed late in pregnancy.",
    "Table 2: Postpartum treatment of hypertension",
    "Postpartum alternative agent Bisoprolol: starting dose 2.5 mg daily"
  );
  return syncVerificationHash(d);
});

// 7-9. LISINOPRIL, LOSARTAN, VALSARTAN
for (const raas of [
  {
    id: "lisinopril",
    pp: "Contraindicated in pregnancy; postpartum alternative agent (AHA/ACOG 2026: 2.5–40 mg/day, titrate every 5–7 days) with limited lactation safety data—prefer labetalol, nifedipine, or enalapril if breastfeeding.",
  },
  {
    id: "losartan",
    pp: "Contraindicated in pregnancy; postpartum alternative agent (AHA/ACOG 2026: 25–100 mg/day, titrate every 5–7 days) with limited lactation safety data—prefer labetalol, nifedipine, or enalapril if breastfeeding.",
  },
  {
    id: "valsartan",
    pp: "Contraindicated in pregnancy; postpartum alternative agent (AHA/ACOG 2026: 20–320 mg/day, titrate every 5–7 days) with limited lactation safety data—prefer labetalol, nifedipine, or enalapril if breastfeeding.",
  },
]) {
  updateDrug(raas.id, (d) => {
    const rep = d.reproductive;
    rep.postpartum = appendRefField(
      rep.postpartum,
      raas.pp,
      "Table 2: Postpartum treatment of hypertension",
      "Postpartum alternative agents Lisinopril (2.5–40 mg/d), Losartan (25–100 mg/d), and Valsartan (20–320 mg/d)"
    );
    return syncVerificationHash(d);
  });
}

// 10. ASPIRIN
updateDrug("aspirin", (d) => {
  const rep = d.reproductive;
  rep.pregnancy_pk = appendRefField(
    rep.pregnancy_pk,
    "Low-dose aspirin (<100 mg/day) is the first-choice antiplatelet agent in pregnancy (AHA/ACOG 2026: safe for prior ischemic stroke/TIA, antiphospholipid syndrome, moyamoya, and preeclampsia reduction [RR 0.85]; no need to discontinue before regional anesthesia). Avoid high analgesic doses >=300 mg/day near term.",
    "Table 2: Antithrombotic agents & Maternal Stroke Prevention",
    "Aspirin <100 mg daily: Safe; first choice antiplatelet agent. No need to discontinue before regional anesthesia"
  );
  rep.lactation_summary = appendRefField(
    rep.lactation_summary,
    "Low-dose aspirin (<100 mg/day) may be used for cardiovascular/stroke indications during lactation with subclinical amounts in breastmilk (RID < 1%); avoid high analgesic doses due to theoretical Reye syndrome risk.",
    "Table 2: Antithrombotic agents in pregnant and lactating individuals",
    "May be used for cardiovascular indications; subclinical amounts in breastmilk"
  );
  return syncVerificationHash(d);
});

// 11. CLOPIDOGREL
updateDrug("clopidogrel", (d) => {
  const rep = d.reproductive;
  rep.pregnancy_pk = appendRefField(
    rep.pregnancy_pk,
    "Use 75 mg daily for shortest duration necessary when stenting requires dual/single antiplatelet therapy (AHA/ACOG 2026: limited human data; stop 5–7 days before regional/neuraxial anesthesia).",
    "Table 2: Antithrombotic agents in pregnant and lactating individuals",
    "Clopidogrel 75 mg daily: Use for shortest duration necessary"
  );
  rep.postpartum = appendRefField(
    rep.postpartum,
    "May be resumed immediately after delivery/regional anesthesia (no loading dose) unless high bleeding risk (AHA/ACOG 2026 Table 2).",
    "Table 2: Antithrombotic agents in pregnant and lactating individuals",
    "Stop 5–7 d before regional anesthesia; may be resumed immediately after (no loading dose)"
  );
  return syncVerificationHash(d);
});

// 12. TICAGRELOR
updateDrug("ticagrelor", (d) => {
  const rep = d.reproductive;
  rep.pregnancy_pk = appendRefField(
    rep.pregnancy_pk,
    "Ticagrelor 90 mg twice daily crosses the placenta with minimal human data (AHA/ACOG 2026); stop 5 days before regional anesthesia and do not maintain neuraxial catheters due to rapid onset.",
    "Table 2: Antithrombotic agents in pregnant and lactating individuals",
    "Ticagrelor 90 mg twice daily: Minimal data; ticagrelor does cross placenta"
  );
  rep.postpartum = appendRefField(
    rep.postpartum,
    "May be resumed immediately after regional anesthesia/delivery (no loading dose) unless high bleeding risk; consider low-dose aspirin or clopidogrel if breastfeeding.",
    "Table 2: Antithrombotic agents in pregnant and lactating individuals",
    "neuraxial catheters should not be maintained with ticagrelor because of the rapid onset"
  );
  rep.lactation_summary = appendRefField(
    rep.lactation_summary,
    "No published breastfeeding studies, though >99% plasma protein binding predicts low milk transfer (AHA/ACOG 2026); low-dose aspirin or clopidogrel is preferred when feasible.",
    "Table 2: Antithrombotic agents in pregnant and lactating individuals",
    "Because ticagrelor and its active metabolite are >99% bound to plasma proteins, the amount in milk is likely to be low"
  );
  return syncVerificationHash(d);
});

// 13. WARFARIN
updateDrug("warfarin", (d) => {
  const rep = d.reproductive;
  rep.pregnancy_pk = appendRefField(
    rep.pregnancy_pk,
    "Teratogenic in 1st trimester (ENTIS 7.4% MCM, n=229); switch to LMWH during weeks 6–12 or throughout pregnancy (low-dose <5 mg/day may be considered after 1st trimester for select mechanical valves per AHA/ACOG 2026). Stop 5 days before planned procedures, ensure normal INR before neuraxial anesthesia, and remove neuraxial catheters when INR <1.5.",
    "Table 2: Antithrombotic agents in pregnant and lactating individuals",
    "Stop 5 d before planned procedures and ensure INR is in normal range before neuraxial anesthesia"
  );
  return syncVerificationHash(d);
});

// 14-16. APIXABAN, DABIGATRAN, RIVAROXABAN
for (const doac of ["apixaban", "dabigatran", "rivaroxaban"]) {
  updateDrug(doac, (d) => {
    const rep = d.reproductive;
    rep.pregnancy_pk = appendRefField(
      rep.pregnancy_pk,
      "Crosses the human placenta with insufficient safety data in pregnancy and lactation (AHA/ACOG 2026 Table 2) and fetal bleeding risk; switch immediately to LMWH upon pregnancy recognition.",
      "Table 2: Antithrombotic agents in pregnant and lactating individuals",
      "Dabigatran, Rivaroxaban, Apixaban: Insufficient data in pregnancy and insufficient data in lactation"
    );
    return syncVerificationHash(d);
  });
}

// 17-19. STATINS: ATORVASTATIN, ROSUVASTATIN, SIMVASTATIN
for (const statin of ["atorvastatin", "rosuvastatin", "simvastatin"]) {
  updateDrug(statin, (d) => {
    const rep = d.reproductive;
    rep.pregnancy_pk = appendRefField(
      rep.pregnancy_pk,
      "AHA/ACOG 2026 Table 2 advises individualized risk/benefit assessment (observational cohorts found no clear evidence of teratogenicity or increased major birth defects), though statins remain generally avoided in routine pregnancy unless high-risk ASCVD/FH cardiology exceptions apply.",
      "Table 2: Other stroke prevention medications — Statins",
      "Statins (atorvastatin, rosuvastatin, simvastatin): Pregnancy safety: Assess risk/benefit; no evidence of teratogenicity"
    );
    rep.lactation_summary = appendRefField(
      rep.lactation_summary,
      "Not recommended during lactation due to concern about disruption of infant lipid metabolism (AHA/ACOG 2026 Table 2); temporary discontinuation while nursing is usually feasible.",
      "Table 2: Other stroke prevention medications — Statins",
      "Lactation safety: Not recommended due to concern about disruption of infant lipid metabolism"
    );
    return syncVerificationHash(d);
  });
}

// 20-21. THROMBOLYTICS: ALTEPLASE, TENECTEPLASE
for (const lytic of ["alteplase", "tenecteplase"]) {
  updateDrug(lytic, (d) => {
    const rep = d.reproductive;
    rep.pregnancy_pk = appendRefField(
      rep.pregnancy_pk,
      "Alteplase and tenecteplase do not cross the placenta (AHA/ACOG 2026: US guidelines support IV alteplase in pregnancy when benefits outweigh uterine bleeding risks; tenecteplase pregnancy data remain limited).",
      "Section: Thrombolysis and Mechanical Thrombectomy (p. e10)",
      "Alteplase and tenecteplase do not cross the placenta, and case reports suggest good fetal outcomes"
    );
    rep.postpartum = appendRefField(
      rep.postpartum,
      "Early postpartum thrombolysis decisions must be individualized, especially after recent cesarean delivery or neuraxial anesthesia due to hemorrhage risk (AHA/ACOG 2026).",
      "Section: Thrombolysis and Mechanical Thrombectomy (p. e10)",
      "Decisions during the early postpartum period should be individualized, especially in patients with recent cesarean delivery"
    );
    return syncVerificationHash(d);
  });
}

console.log("=== AHA/ACOG 2026 ENRICHMENT COMPLETE (21/21 DRUGS) ===");
