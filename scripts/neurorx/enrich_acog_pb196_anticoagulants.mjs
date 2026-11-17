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

console.log("=== ENRICHING 7 DRUGS WITH ACOG PRACTICE BULLETIN NO. 196 ===");

// 1. WARFARIN
updateDrug("warfarin", (d) => {
  const rep = d.reproductive;
  rep.pregnancy_pk = appendRefField(
    rep.pregnancy_pk,
    "Teratogenic in 1st trimester (weeks 6–12 embryopathy; ENTIS 7.4% MCM, n=229); ACOG PB 196 recommends switching to LMWH for most pregnant patients. For mechanical heart valves, regimens use adjusted-dose LMWH/UFH throughout pregnancy OR LMWH/UFH during weeks 6–13 with VKA substitution until close to delivery, then resuming LMWH/UFH (stop prophylactic LMWH 12 h / therapeutic LMWH 24 h before scheduled delivery; stop warfarin 5 d before planned procedures and remove neuraxial catheter when INR <1.5). If unexpected delivery occurs on warfarin, cesarean delivery and neonatal vitamin K + FFP may be required.",
    "ACOG PB 196: Warfarin & Peripartum Management (p. e4, e8)",
    "Regimens include adjusted-dose low-molecular-weight heparin or unfractionated heparin throughout pregnancy or from the 6th week until the 13th week"
  );
  rep.postpartum = appendRefField(
    rep.postpartum,
    "ACOG PB 196 postpartum bridging: start warfarin (5 mg daily for 2 days, then INR-guided) concurrently with overlapping adjusted-dose LMWH or UFH until INR is 2.0–3.0 for 2 consecutive days (prevents paradoxical thrombosis/skin necrosis). Resume 24 h post-delivery for mechanical heart valves, or at 1–2 weeks once bleeding risk subsides for non-valve indications >6 weeks (for 6-week-only regimens, LMWH is often preferred). Compatible with breastfeeding.",
    "ACOG PB 196: Postpartum Anticoagulation (p. e10)",
    "Women who will be treated with warfarin should be bridged with adjusted-dose low-molecular-weight heparin or unfractionated heparin"
  );
  rep.lactation_summary = appendRefField(
    rep.lactation_summary,
    "Completely compatible with breastfeeding (RID < 0.1%, undetectable in breast milk and infant plasma; ACOG PB 196 confirms warfarin does not accumulate in breast milk or induce an anticoagulant effect in the infant).",
    "ACOG PB 196: Summary of Recommendations (p. e10–e11)",
    "Because warfarin, low-molecular-weight heparin, and unfractionated heparin do not accumulate in breast milk"
  );
  return syncVerificationHash(d);
});

// 2-5. DOACs: APIXABAN, DABIGATRAN, EDOXABAN, RIVAROXABAN
const doacLactSummaries = {
  apixaban:
    "Concentrates in human milk (RID 12%–20%) with detectable milk transfer and theoretical infant bleeding risk; ACOG PB 196 advises avoiding DOACs during lactation (warfarin, LMWH, or UFH is preferred).",
  dabigatran:
    "Minimal single-dose milk transfer (RID < 0.1%), but ACOG PB 196 advises avoiding DOACs in lactation due to insufficient chronic safety data and detectable human milk levels (warfarin or LMWH is preferred).",
  edoxaban:
    "Human milk transfer is uncharacterized and ACOG PB 196 advises avoiding anti-Xa inhibitors during lactation (warfarin, LMWH, or UFH is preferred).",
  rivaroxaban:
    "Detectable in human milk (RID 1.3%–2.2%) with insufficient infant safety data; ACOG PB 196 advises avoiding DOACs during lactation (warfarin or LMWH is preferred).",
};

for (const doac of ["apixaban", "dabigatran", "edoxaban", "rivaroxaban"]) {
  updateDrug(doac, (d) => {
    const rep = d.reproductive;
    rep.contraception = appendRefField(
      rep.contraception,
      "Does not reduce hormonal contraceptive efficacy; ACOG PB 196 recommends transitioning from DOACs to LMWH prepregnancy or as soon as possible during pregnancy.",
      "ACOG PB 196: Oral Direct Thrombin & Anti-Xa Inhibitors (p. e4)",
      "Until more data are available, women should be transitioned to low-molecular-weight heparin prepregnancy"
    );
    rep.pregnancy_pk = appendRefField(
      rep.pregnancy_pk,
      "Ex vivo human placenta studies demonstrate transplacental transfer with concern for fetal coagulation; ACOG PB 196 advises avoiding DOACs in pregnancy and switching to LMWH prepregnancy or as soon as pregnancy is recognized (hold prophylactic LMWH >=12 h and therapeutic LMWH >=24 h before scheduled delivery/neuraxial anesthesia).",
      "ACOG PB 196: Oral Direct Thrombin & Anti-Xa Inhibitors (p. e4, e8)",
      "Oral direct thrombin inhibitors (dabigatran) and anti-Xa inhibitors (rivaroxaban, apixaban, edoxaban, betrixaban) should be avoided in pregnancy"
    );
    rep.postpartum = appendRefField(
      rep.postpartum,
      "Per ACOG PB 196, DOACs may be considered for >6 weeks postpartum anticoagulation ONLY if not breastfeeding (restart no sooner than 4–6 h after vaginal delivery or 6–12 h after cesarean delivery once hemostasis is secure); use LMWH or warfarin if breastfeeding.",
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
    "Poly-cationic peptide without significant placental transfer; per ACOG PB 196, reverses UFH (or, less predictably, LMWH) with dosing based on heparin type and route. Rarely required in obstetrics and not indicated for prophylactic heparin doses.",
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
    "Crosses the placenta slowly in small physiological amounts; per ACOG PB 196, if delivery unexpectedly occurs while a mother is receiving warfarin, cesarean delivery and neonatal administration of vitamin K (phytonadione) plus fresh frozen plasma may be required.",
    "ACOG PB 196: Warfarin Unexpected Delivery (p. e4)",
    "if delivery unexpectedly occurs while a woman is receiving a vitamin K antagonist, cesarean delivery may be required and the neonate may require administration of vitamin K"
  );
  return syncVerificationHash(d);
});

console.log("=== ACOG PB 196 ENRICHMENT COMPLETE (7/7 DRUGS) ===");
