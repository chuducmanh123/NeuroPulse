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

console.log("=== ENRICHING AHA/ACOG (2026) WITH MULTILINE GUIDELINE FORMATTING ===");

// 1. LABETALOL
updateDrug("labetalol", (d) => {
  const rep = d.reproductive;
  rep.pregnancy_pk = appendRefField(
    rep.pregnancy_pk,
    [
      "UGT-mediated clearance increases during pregnancy; monitor fetal growth and observe newborns for transient hypoglycemia or bradycardia.",
      "• AHA/ACOG Maternal Stroke Statement (2026) & ACOG/ESC Guidelines: First-line oral and IV antihypertensive in pregnancy (start 200 mg 2–3 times daily, max 2,400 mg/day, titrate every 2–3 days toward goal <140/90 mmHg).",
    ].join("\n"),
    "Table 2: Antihypertensive medications in pregnant individuals",
    "First-line agent Labetalol: starting dose 200 mg 2–3 times a day"
  );
  rep.postpartum = appendRefField(
    rep.postpartum,
    [
      "Adjust carefully over days 3–6 when postpartum hypertension typically peaks, and taper downward as blood pressure stabilizes.",
      "• AHA/ACOG Maternal Stroke Statement (2026): First-line postpartum antihypertensive (start 200 mg 2–3 times daily, max 2,400 mg/day, titrate every 2–3 days).",
    ].join("\n"),
    "Table 2: Postpartum treatment of hypertension",
    "Postpartum first-line agent Labetalol: starting dose 200 mg 2–3 times a day"
  );
  rep.lactation_rid = appendRefField(
    rep.lactation_rid,
    "0.04% to 0.6% (LactMed)\n• AHA/ACOG Maternal Stroke Statement (2026): 3.6%",
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
    [
      "Adjust as postpartum blood pressure peaks (days 3–6) and subsequently stabilizes.",
      "• AHA/ACOG Maternal Stroke Statement (2026): First-line postpartum antihypertensive (start 5 mg daily, max 10 mg/day, titrate every 5–7 days).",
    ].join("\n"),
    "Table 2: Postpartum treatment of hypertension",
    "Postpartum first-line agent Amlodipine: starting dose 5 mg daily"
  );
  rep.lactation_rid = appendRefField(
    rep.lactation_rid,
    "1.7% to 4.3% of the weight-adjusted maternal dosage (LactMed & AHA/ACOG 2026)",
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
    [
      "Reassess maternal volume status and electrolytes postpartum.",
      "• AHA/ACOG Maternal Stroke Statement (2026): Alternative postpartum agent (start 10 mg daily, max 160 mg/day in 2–3 divided doses, titrate every 3–5 days).",
    ].join("\n"),
    "Table 2: Postpartum treatment of hypertension",
    "Postpartum alternative agent Furosemide: starting dose 10 mg daily"
  );
  rep.lactation_summary = appendRefField(
    rep.lactation_summary,
    [
      "Minimal milk transfer (RID <= 1%) and safe for the infant.",
      "• AHA/ACOG Maternal Stroke Statement (2026): Safe RID; loop diuretic doses >20 mg/day may decrease maternal breastmilk production.",
    ].join("\n"),
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
    [
      "Exhibits anti-androgenic activity in animal models with potential feminization of male fetuses.",
      "• AHA/ACOG Maternal Stroke Statement (2026): Mineralocorticoid receptor antagonists are contraindicated in pregnancy because of the potential for fetal harm.",
    ].join("\n"),
    "Table 2: Antihypertensive medications in pregnant individuals",
    "Angiotensin-converting enzyme inhibitors, angiotensin receptor blockers, direct renin inhibitors, and mineralocorticoid receptor antagonists are contraindicated"
  );
  rep.postpartum = appendRefField(
    rep.postpartum,
    [
      "Reassess maternal volume status and serum potassium postpartum.",
      "• AHA/ACOG Maternal Stroke Statement (2026): Alternative postpartum agent (start 12.5 mg daily, titrate every 14–30 days).",
    ].join("\n"),
    "Table 2: Postpartum treatment of hypertension",
    "Postpartum alternative agent Spironolactone: starting dose 12.5 mg daily"
  );
  rep.lactation_rid = appendRefField(
    rep.lactation_rid,
    "0.2% to 1.2% (LactMed)\n• AHA/ACOG Maternal Stroke Statement (2026): 2% to 4.3%",
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
    [
      "CYP2D6 activity normalizes quickly after delivery; reduce pregnancy-escalated doses promptly postpartum to prevent maternal bradycardia and hypotension.",
      "• AHA/ACOG Maternal Stroke Statement (2026): Alternative postpartum agent (metoprolol tartrate start 12.5 mg twice daily, max 200 mg twice daily, titrate every 2–3 days).",
    ].join("\n"),
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
    [
      "Reduce pregnancy-escalated doses postpartum and monitor newborns exposed in late pregnancy for bradycardia or hypoglycemia.",
      "• AHA/ACOG Maternal Stroke Statement (2026): Alternative postpartum agent (start 2.5 mg daily, max 20 mg/day, titrate every 5–7 days).",
    ].join("\n"),
    "Table 2: Postpartum treatment of hypertension",
    "Postpartum alternative agent Bisoprolol: starting dose 2.5 mg daily"
  );
  return syncVerificationHash(d);
});

// 7-9. LISINOPRIL, LOSARTAN, VALSARTAN
for (const raas of [
  {
    id: "lisinopril",
    pp: [
      "Contraindicated in pregnancy; monitor postpartum blood pressure before restarting antihypertensives.",
      "• AHA/ACOG Maternal Stroke Statement (2026): Alternative postpartum agent (2.5–40 mg/day, titrate every 5–7 days) with limited lactation safety data—prefer labetalol, nifedipine, or enalapril if breastfeeding.",
    ].join("\n"),
  },
  {
    id: "losartan",
    pp: [
      "Contraindicated in pregnancy; monitor postpartum blood pressure before restarting antihypertensives.",
      "• AHA/ACOG Maternal Stroke Statement (2026): Alternative postpartum agent (25–100 mg/day, titrate every 5–7 days) with limited lactation safety data—prefer labetalol, nifedipine, or enalapril if breastfeeding.",
    ].join("\n"),
  },
  {
    id: "valsartan",
    pp: [
      "Contraindicated in pregnancy; monitor postpartum blood pressure before restarting antihypertensives.",
      "• AHA/ACOG Maternal Stroke Statement (2026): Alternative postpartum agent (20–320 mg/day, titrate every 5–7 days) with limited lactation safety data—prefer labetalol, nifedipine, or enalapril if breastfeeding.",
    ].join("\n"),
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
    [
      "Avoid high analgesic doses (>=300 mg/day) near term due to premature ductal closure.",
      "• AHA/ACOG Maternal Stroke Statement (2026): Low-dose aspirin (<100 mg/day) is safe and the first-choice antiplatelet agent in pregnancy (for prior ischemic stroke/TIA, antiphospholipid syndrome, moyamoya, and preeclampsia prevention [RR 0.85]); no need to discontinue before regional anesthesia.",
    ].join("\n"),
    "Table 2: Antithrombotic agents & Maternal Stroke Prevention",
    "Aspirin <100 mg daily: Safe; first choice antiplatelet agent. No need to discontinue before regional anesthesia"
  );
  rep.lactation_summary = appendRefField(
    rep.lactation_summary,
    [
      "Low-dose aspirin (75–100 mg/day) is compatible with breastfeeding (RID < 1%); avoid high analgesic doses due to theoretical Reye syndrome risk.",
      "• AHA/ACOG Maternal Stroke Statement (2026): May be used for cardiovascular/stroke indications with subclinical amounts in breastmilk.",
    ].join("\n"),
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
    [
      "Limited human pregnancy data; reserve for essential coronary or carotid/intracranial stent indications.",
      "• AHA/ACOG Maternal Stroke Statement (2026): Use 75 mg daily for the shortest duration necessary; stop 5–7 days before regional/neuraxial anesthesia or delivery.",
    ].join("\n"),
    "Table 2: Antithrombotic agents in pregnant and lactating individuals",
    "Clopidogrel 75 mg daily: Use for shortest duration necessary"
  );
  rep.postpartum = appendRefField(
    rep.postpartum,
    [
      "• AHA/ACOG Maternal Stroke Statement (2026): May be resumed immediately after delivery or regional anesthesia (no loading dose) unless high bleeding risk.",
    ].join("\n"),
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
    [
      "Crosses the human placenta with minimal human pregnancy data.",
      "• AHA/ACOG Maternal Stroke Statement (2026): Ticagrelor 90 mg twice daily—stop 5 days before regional anesthesia and do not maintain neuraxial catheters due to rapid onset.",
    ].join("\n"),
    "Table 2: Antithrombotic agents in pregnant and lactating individuals",
    "Ticagrelor 90 mg twice daily: Minimal data; ticagrelor does cross placenta"
  );
  rep.postpartum = appendRefField(
    rep.postpartum,
    [
      "Consider low-dose aspirin or clopidogrel if breastfeeding.",
      "• AHA/ACOG Maternal Stroke Statement (2026): May be resumed immediately after regional anesthesia/delivery (no loading dose) unless high bleeding risk.",
    ].join("\n"),
    "Table 2: Antithrombotic agents in pregnant and lactating individuals",
    "neuraxial catheters should not be maintained with ticagrelor because of the rapid onset"
  );
  rep.lactation_summary = appendRefField(
    rep.lactation_summary,
    [
      "No published breastfeeding studies; low-dose aspirin or clopidogrel is preferred when feasible.",
      "• AHA/ACOG Maternal Stroke Statement (2026): Because ticagrelor and its active metabolite are >99% bound to plasma proteins, the amount in milk is likely to be low.",
    ].join("\n"),
    "Table 2: Antithrombotic agents in pregnant and lactating individuals",
    "Because ticagrelor and its active metabolite are >99% bound to plasma proteins, the amount in milk is likely to be low"
  );
  return syncVerificationHash(d);
});

// 13-15. STATINS: ATORVASTATIN, ROSUVASTATIN, SIMVASTATIN
for (const statin of ["atorvastatin", "rosuvastatin", "simvastatin"]) {
  updateDrug(statin, (d) => {
    const rep = d.reproductive;
    rep.pregnancy_pk = appendRefField(
      rep.pregnancy_pk,
      [
        "Generally avoided in routine pregnancy due to animal developmental toxicity and theoretical disruption of fetal cholesterol synthesis.",
        "• AHA/ACOG Maternal Stroke Statement (2026): Assess risk/benefit individually (no clear evidence of teratogenicity or increased major birth defects in observational cohorts); discontinue in routine pregnancy unless extreme high-risk ASCVD/FH cardiology exceptions apply.",
      ].join("\n"),
      "Table 2: Other stroke prevention medications — Statins",
      "Statins (atorvastatin, rosuvastatin, simvastatin): Pregnancy safety: Assess risk/benefit; no evidence of teratogenicity"
    );
    rep.lactation_summary = appendRefField(
      rep.lactation_summary,
      [
        "Temporary discontinuation during nursing is usually feasible.",
        "• AHA/ACOG Maternal Stroke Statement (2026): Not recommended during lactation due to concern about disruption of infant lipid metabolism.",
      ].join("\n"),
      "Table 2: Other stroke prevention medications — Statins",
      "Lactation safety: Not recommended due to concern about disruption of infant lipid metabolism"
    );
    return syncVerificationHash(d);
  });
}

// 16-17. THROMBOLYTICS: ALTEPLASE, TENECTEPLASE
for (const lytic of ["alteplase", "tenecteplase"]) {
  updateDrug(lytic, (d) => {
    const rep = d.reproductive;
    rep.pregnancy_pk = appendRefField(
      rep.pregnancy_pk,
      [
        "Large ~59 kDa recombinant protein that does not cross the human placenta.",
        "• AHA/ACOG Maternal Stroke Statement (2026): US guidelines support IV alteplase during pregnancy when potential benefits outweigh uterine bleeding risks; case reports suggest good fetal outcomes, though tenecteplase pregnancy data remain limited.",
      ].join("\n"),
      "Section: Thrombolysis and Mechanical Thrombectomy (p. e10)",
      "Alteplase and tenecteplase do not cross the placenta, and case reports suggest good fetal outcomes"
    );
    rep.postpartum = appendRefField(
      rep.postpartum,
      [
        "• AHA/ACOG Maternal Stroke Statement (2026): Early postpartum thrombolysis decisions should be individualized, especially in patients with recent cesarean delivery or neuraxial anesthesia due to bleeding risk.",
      ].join("\n"),
      "Section: Thrombolysis and Mechanical Thrombectomy (p. e10)",
      "Decisions during the early postpartum period should be individualized, especially in patients with recent cesarean delivery"
    );
    return syncVerificationHash(d);
  });
}

console.log("=== AHA/ACOG (2026) MULTILINE REFORMAT COMPLETE (17 DRUGS) ===");
