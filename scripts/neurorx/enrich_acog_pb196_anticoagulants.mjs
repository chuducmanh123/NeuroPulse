import { getQuote, updateDrug } from "./enhance_common.mjs";
import { computeContentHashSync } from "../../src/lib/neurorx/integrity.ts";

const ACOG = "acog-pb196-vte-pregnancy";

function appendRefField(existingField, newValue, locator, anchor) {
  const quote = getQuote(ACOG, anchor, 25, 340);
  const newRef = { source_id: ACOG, locator, quote };
  const prevRefs = (existingField?.refs || []).filter((r) => r.source_id !== ACOG);
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

console.log("=== REFORMATTING 7 DRUGS WITH MULTILINE ACOG PB 196 (2018) & AHA/ACOG (2026) ===");

// 1. WARFARIN
updateDrug("warfarin", (d) => {
  const rep = d.reproductive;
  rep.pregnancy_pk = appendRefField(
    rep.pregnancy_pk,
    [
      "Crosses the placenta and causes warfarin embryopathy during weeks 6–12 of gestation (ENTIS 2015 cohort: 7.4% MCM, n=229) and fetal CNS hemorrhage later in pregnancy.",
      "• ACOG Practice Bulletin No. 196 (2018): Switch to LMWH in place of warfarin for most pregnant patients. For mechanical heart valves, use adjusted-dose LMWH/UFH throughout pregnancy OR LMWH/UFH during weeks 6–13 with VKA substitution until close to delivery, then resume LMWH/UFH (stop prophylactic LMWH >=12 h and therapeutic LMWH >=24 h before scheduled delivery). If unexpected delivery occurs on warfarin, cesarean delivery and neonatal vitamin K + FFP may be required.",
      "• AHA/ACOG Maternal Stroke Statement (2026): Low-dose warfarin (<5 mg/day) may be considered after the 1st trimester for select mechanical valve patients; stop warfarin 5 days before planned procedures, ensure normal INR before neuraxial anesthesia, and remove neuraxial catheters when INR <1.5.",
    ].join("\n"),
    "ACOG PB 196: Warfarin & Peripartum Management (p. e4, e8)",
    "Regimens include adjusted-dose low-molecular-weight heparin or unfractionated heparin throughout pregnancy or from the 6th week until the 13th week"
  );
  rep.postpartum = appendRefField(
    rep.postpartum,
    [
      "Compatible with breastfeeding; does not accumulate in human milk.",
      "• ACOG Practice Bulletin No. 196 (2018): Bridge postpartum with adjusted-dose LMWH or UFH alongside warfarin (initial 5 mg daily for 2 days, then INR-guided) until INR is 2.0–3.0 for 2 consecutive days to prevent paradoxical thrombosis/skin necrosis. Resume 24 h post-delivery for mechanical heart valves, or at 1–2 weeks once bleeding risk subsides for non-valve indications >6 weeks (LMWH is often preferred for 6-week-only regimens).",
    ].join("\n"),
    "ACOG PB 196: Postpartum Anticoagulation (p. e10)",
    "Women who will be treated with warfarin should be bridged with adjusted-dose low-molecular-weight heparin or unfractionated heparin"
  );
  rep.lactation_summary = appendRefField(
    rep.lactation_summary,
    [
      "Completely compatible with breastfeeding (RID < 0.1%, undetectable in breast milk and infant plasma).",
      "• ACOG Practice Bulletin No. 196 (2018) & AHA/ACOG Maternal Stroke Statement (2026): Warfarin does not accumulate in breast milk or induce an anticoagulant effect in the infant; no waiting period or infant INR monitoring is needed.",
    ].join("\n"),
    "ACOG PB 196: Summary of Recommendations (p. e10–e11)",
    "Because warfarin, low-molecular-weight heparin, and unfractionated heparin do not accumulate in breast milk"
  );
  return syncVerificationHash(d);
});

// 2-5. DOACs: APIXABAN, DABIGATRAN, EDOXABAN, RIVAROXABAN
const doacLactSummaries = {
  apixaban: [
    "Concentrates in human milk (RID 12%–20%) with theoretical infant bleeding risk.",
    "• ACOG Practice Bulletin No. 196 (2018) & AHA/ACOG Maternal Stroke Statement (2026): Avoid apixaban during breastfeeding due to detectable milk transfer and insufficient infant safety data; warfarin, LMWH, or UFH is preferred.",
  ].join("\n"),
  dabigatran: [
    "Minimal single-dose milk transfer (RID < 0.1%), but chronic breastfeeding data are insufficient.",
    "• ACOG Practice Bulletin No. 196 (2018) & AHA/ACOG Maternal Stroke Statement (2026): Avoid dabigatran during lactation due to detectable human milk levels and insufficient safety data; warfarin or LMWH is preferred.",
  ].join("\n"),
  edoxaban: [
    "Human milk transfer is uncharacterized.",
    "• ACOG Practice Bulletin No. 196 (2018): Avoid edoxaban during lactation due to insufficient safety data and potential infant bleeding risk; warfarin, LMWH, or UFH is preferred.",
  ].join("\n"),
  rivaroxaban: [
    "Detectable in human milk (RID 1.3%–2.2%) with limited infant safety data.",
    "• ACOG Practice Bulletin No. 196 (2018) & AHA/ACOG Maternal Stroke Statement (2026): Avoid rivaroxaban during breastfeeding due to insufficient safety data; warfarin or LMWH is preferred.",
  ].join("\n"),
};

for (const doac of ["apixaban", "dabigatran", "edoxaban", "rivaroxaban"]) {
  const hasAha2026 = doac !== "edoxaban";
  updateDrug(doac, (d) => {
    const rep = d.reproductive;
    rep.contraception = appendRefField(
      rep.contraception,
      [
        "Does not reduce hormonal contraceptive efficacy; effective contraception is recommended to permit transition to a pregnancy-safe anticoagulant prior to conception.",
        "• ACOG Practice Bulletin No. 196 (2018): Transition from DOACs to LMWH prepregnancy or as soon as possible during pregnancy.",
      ].join("\n"),
      "ACOG PB 196: Oral Direct Thrombin & Anti-Xa Inhibitors (p. e4)",
      "Until more data are available, women should be transitioned to low-molecular-weight heparin prepregnancy"
    );
    rep.pregnancy_pk = appendRefField(
      rep.pregnancy_pk,
      [
        "Ex vivo human placenta studies demonstrate transplacental transfer with concern for fetal blood coagulation.",
        "• ACOG Practice Bulletin No. 196 (2018): Avoid DOACs in pregnancy; switch to LMWH prepregnancy or as soon as pregnancy is recognized (hold prophylactic LMWH >=12 h and therapeutic LMWH >=24 h before scheduled delivery or neuraxial anesthesia).",
        hasAha2026
          ? "• ESC Guidelines & AHA/ACOG Maternal Stroke Statement (2026): Insufficient safety data in pregnancy; switch immediately to LMWH upon pregnancy recognition."
          : "• ESC / ASH Guidelines: Contraindicated/avoided in pregnancy due to placental transfer and fetal bleeding risk; switch immediately to LMWH.",
      ].join("\n"),
      "ACOG PB 196: Oral Direct Thrombin & Anti-Xa Inhibitors (p. e4, e8)",
      "Oral direct thrombin inhibitors (dabigatran) and anti-Xa inhibitors (rivaroxaban, apixaban, edoxaban, betrixaban) should be avoided in pregnancy"
    );
    rep.postpartum = appendRefField(
      rep.postpartum,
      [
        "• ACOG Practice Bulletin No. 196 (2018): For >6 weeks postpartum anticoagulation, DOACs may be considered ONLY if not breastfeeding (restart no sooner than 4–6 h after vaginal delivery or 6–12 h after cesarean delivery once hemostasis is secure); use LMWH or warfarin if breastfeeding.",
      ].join("\n"),
      "ACOG PB 196: Postpartum Anticoagulation (p. e10)",
      "Women who require more than 6 weeks of postpartum anticoagulation therapy may be bridged to warfarin or a direct oral anticoagulant if not breastfeeding"
    );
    rep.lactation_summary = appendRefField(
      rep.lactation_summary,
      doacLactSummaries[doac],
      "ACOG PB 196: Oral Direct Thrombin & Anti-Xa Inhibitors (p. e4)",
      "Oral direct thrombin inhibitors (dabigatran) and anti-Xa inhibitors (rivaroxaban, apixaban, edoxaban, betrixaban) should be avoided in pregnancy"
    );
    return syncVerificationHash(d);
  });
}

// 6. PROTAMINE
updateDrug("protamine", (d) => {
  const rep = d.reproductive;
  rep.pregnancy_pk = appendRefField(
    rep.pregnancy_pk,
    [
      "Poly-cationic peptide without significant placental transfer.",
      "• ACOG Practice Bulletin No. 196 (2018): Protamine sulfate reverses UFH (or, less predictably, LMWH) with dosing based on heparin type and route; reversal is rarely required in obstetrics and is not indicated for prophylactic heparin doses.",
    ].join("\n"),
    "ACOG PB 196: Peripartum Anticoagulation Reversal (p. e9)",
    "Protamine sulfate can be used to reverse unfractionated heparin or, less predictably, low-molecular-weight heparin"
  );
  return syncVerificationHash(d);
});

// 7. PHYTONADIONE
updateDrug("phytonadione", (d) => {
  const rep = d.reproductive;
  rep.pregnancy_pk = appendRefField(
    rep.pregnancy_pk,
    [
      "Crosses the placenta slowly in small physiological amounts.",
      "• ACOG Practice Bulletin No. 196 (2018): If delivery unexpectedly occurs while a mother is receiving warfarin, cesarean delivery and neonatal administration of vitamin K (phytonadione) plus fresh frozen plasma may be required.",
    ].join("\n"),
    "ACOG PB 196: Warfarin Unexpected Delivery (p. e4)",
    "if delivery unexpectedly occurs while a woman is receiving a vitamin K antagonist, cesarean delivery may be required and the neonate may require administration of vitamin K"
  );
  return syncVerificationHash(d);
});

console.log("=== ACOG PB 196 MULTILINE REFORMAT COMPLETE (7/7 DRUGS) ===");
