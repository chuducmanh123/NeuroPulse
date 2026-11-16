import { getQuote, updateDrug } from "./enhance_common.mjs";
import { computeContentHashSync } from "../../src/lib/neurorx/integrity.ts";

const W3 = "neuro-repro-wave3-guidelines";
const LACT3 = "lactmed-wave3";

function naField() {
  return {
    value: null,
    refs: [],
    note: "Not clinically applicable",
  };
}

function makeField(value, sourceId, locator, anchor, existingField) {
  const quote = getQuote(sourceId, anchor, 25, 340);
  const newRef = { source_id: sourceId, locator, quote };
  const prevRefs = (existingField?.refs || []).filter(
    (r) => r.source_id !== sourceId
  );
  return {
    value,
    refs: [newRef, ...prevRefs],
  };
}

function makeMcm(registry, percent, ci95, n_exposed, dose_stratum, sourceId, locator, anchor) {
  const quote = getQuote(sourceId, anchor, 25, 340);
  return {
    registry,
    percent,
    ...(ci95 ? { ci95 } : {}),
    ...(n_exposed ? { n_exposed } : {}),
    ...(dose_stratum ? { dose_stratum } : {}),
    refs: [{ source_id: sourceId, locator, quote }],
  };
}

function makeTier(value, note, sourceId, locator, anchor, existingTier) {
  const quote = getQuote(sourceId, anchor, 25, 340);
  const newRef = { source_id: sourceId, locator, quote };
  const prevRefs = (existingTier?.refs || []).filter(
    (r) => r.source_id !== sourceId
  );
  return {
    value,
    note,
    refs: [newRef, ...prevRefs],
  };
}

function syncVerificationHash(drug) {
  if (drug.status === "verified" && drug.verification) {
    drug.verification.content_hash = computeContentHashSync(drug);
  }
  return drug;
}

const noContraAnchor = "None of the standard oral anticoagulants, antiplatelets, antihypertensives, statins";
const teratogenContraAnchor = "Effective contraception is essential prior to conception when prescribing warfarin, direct oral anticoagulants";
const abxContraAnchor = "Unlike rifamycins, non-rifamycin beta-lactams, macrolides, glycopeptides, and fluoroquinolones";

console.log("=== WAVE 3: PREGNANCY & LACTATION ENRICHMENT (62 DRUGS) ===");

// ========== 1. ANTICOAGULANTS, ANTIPLATELETS, THROMBOLYTICS & REVERSAL (14) ==========

// 1. WARFARIN
updateDrug("warfarin", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || { value: "avoid", refs: [] },
    folic_acid: naField(),
    contraception: makeField(
      "Does not impair hormonal contraceptive efficacy; effective contraception is essential prior to conception so warfarin can be switched to LMWH before pregnancy.",
      W3,
      "Section 1: Teratogenic Agents Requiring Effective Contraception",
      teratogenContraAnchor,
      d.reproductive?.contraception
    ),
    pregnancy_pk: makeField(
      "Crosses the placenta causing warfarin embryopathy (weeks 6–12) and late fetal CNS hemorrhage; switch to LMWH during weeks 6–12 or throughout pregnancy per ESC/ASH guidelines.",
      W3,
      "Section 2: Warfarin Registry, PK & Postpartum",
      "Warfarin crosses the placenta causing warfarin embryopathy (nasal hypoplasia, stippled epiphyses)",
      d.reproductive?.pregnancy_pk
    ),
    mcm: [
      makeMcm(
        "ENTIS Prospective Cohort",
        7.4,
        "4.5%–11.8%",
        229,
        "first-trimester exposure",
        W3,
        "Section 2: Warfarin Registry, PK & Postpartum",
        "ENTIS Prospective Cohort reported major congenital malformations in 7.4%"
      ),
    ],
    postpartum: makeField(
      "Warfarin may be safely resumed immediately postpartum once surgical hemostasis is secure, as it does not pass into breast milk.",
      W3,
      "Section 2: Warfarin Registry, PK & Postpartum",
      "warfarin may be safely resumed immediately postpartum as it does not pass into breast milk",
      d.reproductive?.postpartum
    ),
    lactation_rid: makeField(
      "< 0.1% (undetectable in human milk)",
      LACT3,
      "LactMed: Warfarin — Drug Levels",
      "Warfarin is >99% plasma protein-bound and undetectable in human breast milk",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Completely compatible with breastfeeding (RID < 0.1%, undetectable in breast milk and infant plasma); no waiting period or infant INR monitoring required for healthy term infants.",
      LACT3,
      "LactMed: Warfarin — Summary of Use during Lactation",
      "Warfarin is completely compatible with breastfeeding and does not enter breast milk in clinically measurable amounts",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 2-5. DOACs: APIXABAN, DABIGATRAN, EDOXABAN, RIVAROXABAN
const doacConfigs = [
  {
    id: "apixaban",
    rid: "12% to 20% of the weight-adjusted maternal dosage",
    ridAnchor: "Human breast milk pharmacokinetic measurements indicate a high relative infant dose of approximately 12% to 20%",
    lactSummary: "Concentrates in human milk (RID 12%–20%) with theoretical infant bleeding risk; breastfeeding is not recommended (prefer warfarin or LMWH).",
    lactAnchor: "Because apixaban concentrates in human milk (RID 12%–20%) and poses a theoretical bleeding risk",
  },
  {
    id: "dabigatran",
    rid: "0.02% to 0.07% of the weight-adjusted maternal dosage (single dose)",
    ridAnchor: "Single-dose maternal dabigatran etexilate yielded a very low relative infant dose of 0.02% to 0.07%",
    lactSummary: "Minimal transfer after single dose (RID < 0.1%), but chronic breastfeeding data are insufficient; warfarin or LMWH is preferred in nursing mothers.",
    lactAnchor: "Although a small study showed minimal milk transfer (RID < 0.1%), clinical breastfeeding experience with chronic dabigatran",
  },
  {
    id: "edoxaban",
    rid: "No human breast milk data available",
    ridAnchor: "No quantitative human breast milk data are available for edoxaban",
    lactSummary: "Human milk transfer and infant bleeding risk are uncharacterized; breastfeeding is not recommended (prefer warfarin or LMWH).",
    lactAnchor: "Because human milk transfer and infant bleeding risk are uncharacterized, breastfeeding is not recommended during edoxaban therapy",
  },
  {
    id: "rivaroxaban",
    rid: "1.3% to 2.2% (up to ~3%) of the weight-adjusted maternal dosage",
    ridAnchor: "Maternal oral rivaroxaban yields a relative infant dose of 1.3% to 2.2%",
    lactSummary: "Relatively low milk transfer (RID 1.3%–2.2%), though clinical lactation data are limited and labels advise against nursing; warfarin or LMWH is preferred.",
    lactAnchor: "Although rivaroxaban milk transfer is relatively low (RID 1.3%–2.2%), clinical breastfeeding data remain limited",
  },
];

for (const cfg of doacConfigs) {
  updateDrug(cfg.id, (d) => {
    d.reproductive = {
      tier: makeTier(
        "avoid",
        "Direct oral anticoagulants cross the placenta with fetal bleeding and embryotoxicity risk; avoid in pregnancy and switch immediately to LMWH per ESC/ASH guidelines.",
        W3,
        "Section 2: DOACs Pregnancy Contraindication",
        "Direct oral anticoagulants (apixaban, dabigatran, edoxaban, rivaroxaban) cross the human placenta",
        d.reproductive?.tier
      ),
      folic_acid: naField(),
      contraception: makeField(
        "Does not reduce hormonal contraceptive efficacy; effective contraception is recommended to permit transition to LMWH prior to planned pregnancy.",
        W3,
        "Section 1: Teratogenic Agents Requiring Effective Contraception",
        teratogenContraAnchor,
        d.reproductive?.contraception
      ),
      pregnancy_pk: makeField(
        "Crosses the human placenta and carries fetal hemorrhage/embryotoxicity risk; contraindicated/avoided in pregnancy—switch immediately to LMWH upon pregnancy recognition.",
        W3,
        "Section 2: DOACs Pregnancy Contraindication",
        "Direct oral anticoagulants (apixaban, dabigatran, edoxaban, rivaroxaban) cross the human placenta",
        d.reproductive?.pregnancy_pk
      ),
      mcm: d.reproductive?.mcm || [],
      postpartum: makeField(
        "Resume DOAC postpartum only once surgical hemostasis is achieved and breastfeeding plans are addressed (use LMWH or warfarin if breastfeeding).",
        W3,
        "Section 2: DOACs Pregnancy Contraindication",
        "transition back postpartum only after breastfeeding decisions are reviewed",
        d.reproductive?.postpartum
      ),
      lactation_rid: makeField(cfg.rid, LACT3, `LactMed: ${cfg.id} — Drug Levels`, cfg.ridAnchor, d.reproductive?.lactation_rid),
      lactation_summary: makeField(cfg.lactSummary, LACT3, `LactMed: ${cfg.id} — Summary of Use during Lactation`, cfg.lactAnchor, d.reproductive?.lactation_summary),
    };
    return syncVerificationHash(d);
  });
}

// 6. ASPIRIN
updateDrug("aspirin", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || { value: "caution", refs: [] },
    folic_acid: naField(),
    contraception: makeField(
      "Does not alter hormonal contraceptive efficacy.",
      W3,
      "Section 1: No Hormonal Contraceptive Induction",
      noContraAnchor,
      d.reproductive?.contraception
    ),
    pregnancy_pk: makeField(
      "Low-dose aspirin (75–150 mg/day) is safe and recommended for preeclampsia prevention and maternal stroke/antiplatelet indications; avoid high analgesic doses >= 300 mg/day near term (ductal closure).",
      W3,
      "Section 2: Low-Dose Aspirin Pregnancy & Registry",
      "Low-dose aspirin (75–150 mg/day) is safe and recommended for preeclampsia prevention",
      d.reproductive?.pregnancy_pk
    ),
    mcm: [
      makeMcm(
        "Nordic & US Collaborative Cohorts",
        3.0,
        "2.6%–3.4%",
        6102,
        "low-dose first-trimester exposure",
        W3,
        "Section 2: Low-Dose Aspirin Pregnancy & Registry",
        "Nordic and US Collaborative Cohorts reported major congenital malformations in 3.0%"
      ),
    ],
    postpartum: naField(),
    lactation_rid: makeField(
      "< 1% (low-dose 75–100 mg/day); 2.5%–10% (high dose)",
      LACT3,
      "LactMed: Aspirin — Drug Levels",
      "Low-dose aspirin (75–100 mg/day) produces negligible milk salicylate levels (RID < 1%)",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Low-dose aspirin (75–100 mg/day) for stroke prevention is compatible with breastfeeding (RID < 1%, undetectable infant exposure); avoid high analgesic doses due to theoretical Reye syndrome risk.",
      LACT3,
      "LactMed: Aspirin — Summary of Use during Lactation",
      "Low-dose aspirin (75–100 mg/day) for stroke prevention is compatible with breastfeeding",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 7-8. CLOPIDOGREL & TICAGRELOR
updateDrug("clopidogrel", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || { value: "caution", refs: [] },
    folic_acid: naField(),
    contraception: makeField("Does not reduce hormonal contraceptive efficacy.", W3, "Section 1: No Hormonal Contraceptive Induction", noContraAnchor, d.reproductive?.contraception),
    pregnancy_pk: makeField(
      "Limited human pregnancy data; reserve for essential coronary or carotid/intracranial stent indications and hold 5 to 7 days prior to neuraxial anesthesia or delivery.",
      W3,
      "Section 2: Clopidogrel & Ticagrelor Pregnancy & Peripartum",
      "clopidogrel is reserved for essential coronary or carotid/intracranial stent indications",
      d.reproductive?.pregnancy_pk
    ),
    mcm: d.reproductive?.mcm || [],
    postpartum: makeField(
      "Resume clopidogrel postpartum once delivery or procedural hemostasis is secure (typically within 12–24 hours after uncomplicated vaginal or cesarean delivery).",
      W3,
      "Section 2: Clopidogrel & Ticagrelor Pregnancy & Peripartum",
      "must be held 5 to 7 days before neuraxial anesthesia or delivery to prevent maternal/neonatal hemorrhage, then resumed postpartum",
      d.reproductive?.postpartum
    ),
    lactation_rid: makeField(
      "Estimated < 1% (no direct human milk measurements)",
      LACT3,
      "LactMed: Clopidogrel — Drug Levels",
      "Quantitative human milk measurements for clopidogrel and its active thiol metabolite are lacking",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Lacks direct human milk measurements (estimated RID < 1%), though small observational cohorts reported no infant bleeding; use with caution while monitoring the infant for unusual bruising.",
      LACT3,
      "LactMed: Clopidogrel — Summary of Use during Lactation",
      "Although clopidogrel lacks direct human milk measurements, small observational cohorts reported no infant bleeding",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

updateDrug("ticagrelor", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || { value: "caution", refs: [] },
    folic_acid: naField(),
    contraception: makeField("Does not reduce hormonal contraceptive efficacy.", W3, "Section 1: No Hormonal Contraceptive Induction", noContraAnchor, d.reproductive?.contraception),
    pregnancy_pk: makeField(
      "Human pregnancy data are limited; reserve for critical stenting where safer alternatives fail, and hold 5 to 7 days prior to neuraxial anesthesia or delivery to prevent hemorrhage.",
      W3,
      "Section 2: Clopidogrel & Ticagrelor Pregnancy & Peripartum",
      "Clopidogrel (and ticagrelor) have limited human pregnancy data",
      d.reproductive?.pregnancy_pk
    ),
    mcm: d.reproductive?.mcm || [],
    postpartum: makeField(
      "Resume antiplatelet therapy postpartum only after hemostasis is secure, considering transition to low-dose aspirin or clopidogrel if breastfeeding.",
      W3,
      "Section 2: Clopidogrel & Ticagrelor Pregnancy & Peripartum",
      "must be held 5 to 7 days before neuraxial anesthesia or delivery to prevent maternal/neonatal hemorrhage, then resumed postpartum",
      d.reproductive?.postpartum
    ),
    lactation_rid: makeField(
      "No human milk data available",
      LACT3,
      "LactMed: Ticagrelor — Drug Levels",
      "Quantitative human breast milk measurements for ticagrelor are unavailable",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Lacks human milk transfer data and carries theoretical infant bleeding risk; low-dose aspirin or clopidogrel with infant monitoring is preferred during lactation.",
      LACT3,
      "LactMed: Ticagrelor — Summary of Use during Lactation",
      "Because ticagrelor and its active metabolite lack human milk transfer data and carry theoretical antiplatelet bleeding risk",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 9-10. THROMBOLYTICS: ALTEPLASE, TENECTEPLASE
for (const lytic of ["alteplase", "tenecteplase"]) {
  updateDrug(lytic, (d) => {
    d.reproductive = {
      tier: d.reproductive?.tier || { value: "caution", refs: [] },
      folic_acid: naField(),
      contraception: naField(),
      pregnancy_pk: makeField(
        "Large ~59 kDa recombinant protein that does not cross the placenta; per AHA/ASA Stroke Guidelines, IV thrombolysis may be considered in pregnant patients with disabling acute ischemic stroke when benefit outweighs hemorrhage risk.",
        W3,
        "Section 2: Thrombolytics (Alteplase & Tenecteplase)",
        "Alteplase (~59 kDa) and tenecteplase (~59 kDa) are large recombinant proteins that do not cross the human placenta",
        d.reproductive?.pregnancy_pk
      ),
      mcm: d.reproductive?.mcm || [],
      postpartum: naField(),
      lactation_rid: makeField(
        "Estimated < 0.1% (large ~59 kDa protein, rapid clearance)",
        LACT3,
        `LactMed: ${lytic} — Drug Levels`,
        lytic === "alteplase"
          ? "Large recombinant glycoprotein (~59 kDa) with very short plasma half-life (< 5 minutes)"
          : "Large recombinant glycoprotein (~59 kDa) rapidly cleared from maternal plasma",
        d.reproductive?.lactation_rid
      ),
      lactation_summary: makeField(
        "Large protein rapidly cleared from maternal circulation and digested in the infant GI tract; acute stroke thrombolysis is unlikely to expose the infant, and nursing may resume once maternal status stabilizes.",
        LACT3,
        `LactMed: ${lytic} — Summary of Use during Lactation`,
        lytic === "alteplase"
          ? "Because alteplase is a large protein rapidly cleared from maternal circulation within minutes"
          : "Like alteplase, tenecteplase is a large protein rapidly cleared from maternal circulation",
        d.reproductive?.lactation_summary
      ),
    };
    return syncVerificationHash(d);
  });
}

// 11-14. REVERSAL AGENTS: PHYTONADIONE, PROTAMINE, 4F-PCC, IDARUCIZUMAB
updateDrug("phytonadione", (d) => {
  d.reproductive = {
    tier: makeTier(
      "preferred",
      "Phytonadione (vitamin K1) is essential physiological replacement therapy safe throughout pregnancy to reverse maternal or neonatal coagulopathy.",
      W3,
      "Section 2: Reversal Agents",
      "Phytonadione (vitamin K1) is preferred and essential to reverse maternal/neonatal coagulopathy",
      d.reproductive?.tier
    ),
    folic_acid: naField(),
    contraception: naField(),
    pregnancy_pk: makeField(
      "Crosses the placenta slowly in small physiological amounts; standard maternal reversal dosing applies without special pregnancy PK escalation.",
      W3,
      "Section 2: Reversal Agents",
      "Phytonadione (vitamin K1) is preferred and essential to reverse maternal/neonatal coagulopathy",
      d.reproductive?.pregnancy_pk
    ),
    mcm: d.reproductive?.mcm || [],
    postpartum: naField(),
    lactation_rid: makeField(
      "< 2% of the weight-adjusted maternal dosage",
      LACT3,
      "LactMed: Phytonadione — Drug Levels",
      "Standard oral or parenteral maternal vitamin K1 supplementation produces a low relative infant dose of < 2%",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Normal physiological nutrient compatible with breastfeeding (RID < 2%); newborns still require standard neonatal vitamin K prophylaxis at birth.",
      LACT3,
      "LactMed: Phytonadione — Summary of Use during Lactation",
      "Phytonadione (vitamin K1) is a normal nutrient compatible with breastfeeding",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

for (const revAgent of [
  {
    id: "protamine",
    pkAnchor: "protamine sulfate reverses UFH/LMWH without placental transfer",
    pk: "Poly-cationic peptide that reverses UFH/LMWH without significant placental transfer; administer standard heparin-neutralizing dosing for maternal hemorrhage.",
    rid: "Not applicable (acute IV reversal peptide)",
    ridAnchor: "Low-molecular-weight polycationic peptide rapidly neutralized in maternal plasma",
    lact: "Acute IV heparin reversal peptide digested by infant GI proteases if trace amounts enter milk; no waiting period needed once maternal hemostasis stabilizes.",
    lactAnchor: "Protamine sulfate is given as an acute intravenous heparin reversal agent and is digested by GI proteases",
  },
  {
    id: "prothrombin-complex-concentrate",
    pkAnchor: "4F-PCC and idarucizumab (~48 kDa) are life-saving emergency reversal agents",
    pk: "Human plasma coagulation factors II, VII, IX, and X (~50–70 kDa) do not cross the placenta intact; never withhold in life-threatening maternal warfarin hemorrhage.",
    rid: "Effective RID ~0% (endogenous plasma factors)",
    ridAnchor: "Endogenous human coagulation factors II, VII, IX, and X (~50–70 kDa) that do not cross into breast milk intact",
    lact: "Consists of endogenous human plasma coagulation factors destroyed by GI digestion; pose no risk to a breastfed infant once mother recovers from acute hemorrhage.",
    lactAnchor: "4-factor prothrombin complex concentrate consists of human plasma coagulation factors that pose no risk",
  },
  {
    id: "idarucizumab",
    pkAnchor: "4F-PCC and idarucizumab (~48 kDa) are life-saving emergency reversal agents",
    pk: "Humanized Fab antibody fragment (~48 kDa) cleared rapidly renally; life-saving emergency reversal for dabigatran-associated hemorrhage and should never be withheld in pregnancy.",
    rid: "Estimated < 0.1% (Fab antibody fragment)",
    ridAnchor: "Humanized monoclonal antibody fragment (~48 kDa) with rapid renal clearance and no human milk data",
    lact: "Rapidly cleared antibody fragment digested in the infant GI tract; breastfeeding may resume once acute maternal hemorrhage resolves.",
    lactAnchor: "Idarucizumab is a protein antibody fragment rapidly cleared after single emergency IV reversal of dabigatran",
  },
]) {
  updateDrug(revAgent.id, (d) => {
    d.reproductive = {
      tier: d.reproductive?.tier || { value: "caution", refs: [] },
      folic_acid: naField(),
      contraception: naField(),
      pregnancy_pk: makeField(revAgent.pk, W3, "Section 2: Reversal Agents", revAgent.pkAnchor, d.reproductive?.pregnancy_pk),
      mcm: d.reproductive?.mcm || [],
      postpartum: naField(),
      lactation_rid: makeField(revAgent.rid, LACT3, `LactMed: ${revAgent.id} — Drug Levels`, revAgent.ridAnchor, d.reproductive?.lactation_rid),
      lactation_summary: makeField(revAgent.lact, LACT3, `LactMed: ${revAgent.id} — Summary of Use during Lactation`, revAgent.lactAnchor, d.reproductive?.lactation_summary),
    };
    return syncVerificationHash(d);
  });
}

// ========== 2. ANTIHYPERTENSIVES, ANTIARRHYTHMICS, DIURETICS & ELECTROLYTES (14) ==========

// 15. LABETALOL
updateDrug("labetalol", (d) => {
  d.reproductive = {
    tier: makeTier(
      "preferred",
      "Preferred first-line oral and IV antihypertensive for chronic hypertension, gestational hypertension, and preeclampsia per ACOG and ESC guidelines (2.9% MCM in n=3,842).",
      W3,
      "Section 3: Labetalol Preferred First-Line & Registry",
      "Labetalol is a preferred first-line oral and IV antihypertensive for chronic hypertension and preeclampsia in pregnancy",
      d.reproductive?.tier
    ),
    folic_acid: naField(),
    contraception: makeField("Does not reduce hormonal contraceptive efficacy.", W3, "Section 1: No Hormonal Contraceptive Induction", noContraAnchor, d.reproductive?.contraception),
    pregnancy_pk: makeField(
      "UGT-mediated clearance increases during pregnancy, often requiring divided dosing (2–3 times daily); monitor fetal growth and observe newborns for transient hypoglycemia or bradycardia.",
      W3,
      "Section 3: Labetalol Preferred First-Line & Registry",
      "monitor newborns for transient hypoglycemia/bradycardia and adjust postpartum blood pressure therapy",
      d.reproductive?.pregnancy_pk
    ),
    mcm: [
      makeMcm(
        "Nordic & Medicaid Birth Cohorts",
        2.9,
        "2.4%–3.5%",
        3842,
        "first-trimester exposure",
        W3,
        "Section 3: Labetalol Preferred First-Line & Registry",
        "Nordic and Medicaid Birth Cohorts reported major congenital malformations in 2.9%"
      ),
    ],
    postpartum: makeField(
      "Adjust oral antihypertensive dosing carefully postpartum, especially over days 3–6 when postpartum hypertension typically peaks, and taper downward if blood pressure normalizes.",
      W3,
      "Section 3: Labetalol Preferred First-Line & Registry",
      "adjust postpartum blood pressure therapy over days 3–6 when postpartum hypertension peaks",
      d.reproductive?.postpartum
    ),
    lactation_rid: makeField(
      "0.04% to 0.6% of the weight-adjusted maternal dosage",
      LACT3,
      "LactMed: Labetalol — Drug Levels",
      "Maternal oral labetalol yields a very low relative infant dose of 0.04% to 0.6%",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Preferred first-line beta-blocker during breastfeeding for postpartum hypertension (RID < 1%); monitor premature or newborn infants for rare bradycardia or lethargy.",
      LACT3,
      "LactMed: Labetalol — Summary of Use during Lactation",
      "Labetalol passes into human milk in minimal quantities (RID < 1%) and is a preferred first-line beta-blocker during breastfeeding",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 16-18. CCBs: AMLODIPINE, NICARDIPINE, NIMODIPINE
updateDrug("amlodipine", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || { value: "caution", refs: [] },
    folic_acid: naField(),
    contraception: makeField("Does not impair hormonal contraceptive efficacy.", W3, "Section 1: No Hormonal Contraceptive Induction", noContraAnchor, d.reproductive?.contraception),
    pregnancy_pk: makeField(
      "Acceptable second-line dihydropyridine CCB in pregnancy (extended-release nifedipine is preferred first-line CCB); monitor maternal blood pressure and uteroplacental perfusion.",
      W3,
      "Section 3: Calcium Channel Blockers",
      "Extended-release nifedipine and amlodipine are acceptable options for gestational hypertension",
      d.reproductive?.pregnancy_pk
    ),
    mcm: [
      makeMcm(
        "Nordic & Medicaid CCB Cohort",
        3.1,
        "2.1%–4.5%",
        912,
        "first-trimester exposure",
        W3,
        "Section 3: Calcium Channel Blockers",
        "Nordic/Medicaid cohort for amlodipine/CCBs: 3.1% MCM"
      ),
    ],
    postpartum: makeField(
      "Titrate postpartum antihypertensive regimen as maternal blood pressure peaks (days 3–6) and subsequently stabilizes over weeks postpartum.",
      W3,
      "Section 3: Calcium Channel Blockers",
      "with postpartum titration as BP stabilizes",
      d.reproductive?.postpartum
    ),
    lactation_rid: makeField(
      "1.7% to 4.2% (median ~4.2%) of the weight-adjusted maternal dosage",
      LACT3,
      "LactMed: Amlodipine — Drug Levels",
      "Breastfed infants receive approximately 1.7% to 4.2% (median ~4.2%) of the weight-adjusted maternal amlodipine dosage",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Passes into human milk in small amounts (RID < 5%) with undetectable infant plasma levels and no reported adverse effects; compatible with breastfeeding.",
      LACT3,
      "LactMed: Amlodipine — Summary of Use during Lactation",
      "Amlodipine passes into human milk in small amounts (RID < 5%) with undetectable infant plasma levels",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

updateDrug("nicardipine", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || { value: "caution", refs: [] },
    folic_acid: naField(),
    contraception: makeField("Does not reduce hormonal contraceptive efficacy.", W3, "Section 1: No Hormonal Contraceptive Induction", noContraAnchor, d.reproductive?.contraception),
    pregnancy_pk: makeField(
      "IV nicardipine is used for refractory hypertensive emergencies or acute ischemic stroke BP control in pregnancy; avoid abrupt hypotension to preserve uteroplacental perfusion.",
      W3,
      "Section 3: Calcium Channel Blockers",
      "IV nicardipine is used for refractory hypertensive emergencies",
      d.reproductive?.pregnancy_pk
    ),
    mcm: d.reproductive?.mcm || [],
    postpartum: makeField(
      "Transition from IV infusion to oral postpartum antihypertensives (e.g. labetalol or nifedipine) once acute blood pressure control stabilizes.",
      W3,
      "Section 3: Calcium Channel Blockers",
      "with postpartum titration as BP stabilizes",
      d.reproductive?.postpartum
    ),
    lactation_rid: makeField(
      "0.04% to 0.14% of the weight-adjusted maternal dosage",
      LACT3,
      "LactMed: Nicardipine — Drug Levels",
      "Intravenous and oral maternal nicardipine yield a very low relative infant dose of 0.04% to 0.14%",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Minimal excretion into human milk (RID < 0.2%) with no reported adverse effects in breastfed infants; compatible with breastfeeding.",
      LACT3,
      "LactMed: Nicardipine — Summary of Use during Lactation",
      "Nicardipine excretion into human milk is minimal (RID < 0.2%) with no reported adverse effects",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

updateDrug("nimodipine", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || { value: "caution", refs: [] },
    folic_acid: naField(),
    contraception: makeField("Does not reduce hormonal contraceptive efficacy.", W3, "Section 1: No Hormonal Contraceptive Induction", noContraAnchor, d.reproductive?.contraception),
    pregnancy_pk: makeField(
      "Reserved for aneurysmal subarachnoid hemorrhage vasospasm prophylaxis during pregnancy; monitor maternal blood pressure closely to maintain uteroplacental perfusion.",
      W3,
      "Section 3: Calcium Channel Blockers",
      "nimodipine is reserved for aneurysmal SAH vasospasm during pregnancy",
      d.reproductive?.pregnancy_pk
    ),
    mcm: d.reproductive?.mcm || [],
    postpartum: naField(),
    lactation_rid: makeField(
      "0.06% to 0.3% of the weight-adjusted maternal dosage",
      LACT3,
      "LactMed: Nimodipine — Drug Levels",
      "Maternal oral or IV nimodipine produces a very low relative infant dose of 0.06% to 0.3%",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Extremely low breast milk transfer (RID < 0.5%) with rapid elimination; compatible with breastfeeding in mothers recovering from SAH.",
      LACT3,
      "LactMed: Nimodipine — Summary of Use during Lactation",
      "Nimodipine milk transfer is extremely low (RID < 0.5%) with rapid elimination; compatible with breastfeeding",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 19-20. BETA-BLOCKERS: BISOPROLOL & NEBIVOLOL
for (const bb of [
  {
    id: "bisoprolol",
    rid: "< 2% (estimated 0.4% to 2%)",
    ridAnchor: "Limited maternal milk data indicate a low relative infant dose of < 2%",
    lact: "Enters breast milk in low amounts (< 2% RID) and was well tolerated in limited infant reports; monitor newborns for rare bradycardia, lethargy, or poor feeding.",
    lactAnchor: "Bisoprolol enters breast milk in low amounts (< 2% RID) and was well tolerated",
  },
  {
    id: "nebivolol",
    rid: "No human breast milk data available",
    ridAnchor: "Quantitative human breast milk concentrations of nebivolol are unavailable",
    lact: "No human milk data exist and higher lipophilicity increases theoretical accumulation; prefer labetalol or metoprolol during breastfeeding, especially in neonates.",
    lactAnchor: "Because nebivolol has no human milk data and accumulates more in lipid-rich compartments",
  },
]) {
  updateDrug(bb.id, (d) => {
    d.reproductive = {
      tier: d.reproductive?.tier || { value: "caution", refs: [] },
      folic_acid: naField(),
      contraception: makeField("Does not alter hormonal contraceptive efficacy.", W3, "Section 1: No Hormonal Contraceptive Induction", noContraAnchor, d.reproductive?.contraception),
      pregnancy_pk: makeField(
        "Smaller human pregnancy dataset than labetalol or metoprolol; maternal CYP2D6/renal clearance changes may alter exposure, and 3rd-trimester use requires monitoring fetal growth and neonatal bradycardia/hypoglycemia.",
        W3,
        "Section 3: Beta-Blockers (Bisoprolol & Nebivolol)",
        "Bisoprolol and nebivolol have smaller human pregnancy datasets than labetalol or metoprolol",
        d.reproductive?.pregnancy_pk
      ),
      mcm: d.reproductive?.mcm || [],
      postpartum: makeField(
        "Reduce pregnancy-escalated doses postpartum as maternal clearance normalizes and monitor newborns exposed in late pregnancy for bradycardia or hypoglycemia.",
        W3,
        "Section 3: Beta-Blockers (Bisoprolol & Nebivolol)",
        "pregnancy-escalated doses should be reduced postpartum",
        d.reproductive?.postpartum
      ),
      lactation_rid: makeField(bb.rid, LACT3, `LactMed: ${bb.id} — Drug Levels`, bb.ridAnchor, d.reproductive?.lactation_rid),
      lactation_summary: makeField(bb.lact, LACT3, `LactMed: ${bb.id} — Summary of Use during Lactation`, bb.lactAnchor, d.reproductive?.lactation_summary),
    };
    return syncVerificationHash(d);
  });
}

// 21. DIGOXIN
updateDrug("digoxin", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || { value: "caution", refs: [] },
    folic_acid: naField(),
    contraception: makeField("Does not impair hormonal contraceptive efficacy.", W3, "Section 1: No Hormonal Contraceptive Induction", noContraAnchor, d.reproductive?.contraception),
    pregnancy_pk: makeField(
      "Crosses the placenta without teratogenicity; renal clearance and P-gp activity rise 20%–50% during pregnancy (lowering serum digoxin), requiring TDM and occasional dose escalation.",
      W3,
      "Section 3: Digoxin Pregnancy PK & Postpartum",
      "Digoxin crosses the placenta without teratogenicity (`caution`); renal clearance and CYP/P-gp activity increase 20%–50%",
      d.reproductive?.pregnancy_pk
    ),
    mcm: d.reproductive?.mcm || [],
    postpartum: makeField(
      "Reduce pregnancy-escalated digoxin dosage over 1 to 2 weeks postpartum guided by serum concentrations to prevent postpartum digoxin toxicity.",
      W3,
      "Section 3: Digoxin Pregnancy PK & Postpartum",
      "followed by postpartum dose reduction over 1 to 2 weeks to avoid digoxin toxicity",
      d.reproductive?.postpartum
    ),
    lactation_rid: makeField(
      "1.9% to 4.1% of the weight-adjusted maternal dosage",
      LACT3,
      "LactMed: Digoxin — Drug Levels",
      "Breastfed infants receive approximately 1.9% to 4.1% of the weight-adjusted maternal digoxin dosage",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Low breast milk concentrations (RID <= 4.1%) with undetectable or subtherapeutic infant serum levels; compatible with breastfeeding without special waiting periods.",
      LACT3,
      "LactMed: Digoxin — Summary of Use during Lactation",
      "Digoxin milk concentrations are low (RID <= 4.1%) and produce undetectable or subtherapeutic serum levels",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 22. AMIODARONE
updateDrug("amiodarone", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || { value: "avoid", refs: [] },
    folic_acid: naField(),
    contraception: makeField(
      "Does not impair hormonal contraceptives; effective contraception is strongly advised given its ~40–55 day half-life and fetal thyroid/cardiac toxicity.",
      W3,
      "Section 1: Teratogenic Agents Requiring Effective Contraception",
      teratogenContraAnchor,
      d.reproductive?.contraception
    ),
    pregnancy_pk: makeField(
      "Crosses the placenta with high iodine load and ~40–55 day half-life, causing fetal/neonatal hypothyroidism (9%–20%), goiter, and bradycardia; reserve only for life-threatening refractory arrhythmias.",
      W3,
      "Section 3: Amiodarone Pregnancy Contraindication",
      "Amiodarone crosses the placenta with high iodine content and prolonged half-life (~40–55 days)",
      d.reproductive?.pregnancy_pk
    ),
    mcm: d.reproductive?.mcm || [],
    postpartum: makeField(
      "Check neonatal thyroid function (TSH/free T4), heart rate, and QTc after delivery if exposed in utero.",
      W3,
      "Section 3: Amiodarone Pregnancy Contraindication",
      "check neonatal thyroid function postpartum",
      d.reproductive?.postpartum
    ),
    lactation_rid: makeField(
      "3.5% to 45% (frequently > 10%) of the weight-adjusted maternal dosage",
      LACT3,
      "LactMed: Amiodarone — Drug Levels",
      "Combined transfer of amiodarone and its active metabolite desethylamiodarone yields a very high relative infant dose of 3.5% to 45%",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Accumulates extensively in human milk and infant tissues (RID up to 45%) with heavy iodine load risking infant hypothyroidism, bradycardia, and QT prolongation; breastfeeding is generally not recommended.",
      LACT3,
      "LactMed: Amiodarone — Summary of Use during Lactation",
      "Amiodarone and desethylamiodarone accumulate extensively in human milk and infant tissues with a massive iodine load",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 23-25. ACEi/ARBs: LISINOPRIL, LOSARTAN, VALSARTAN
for (const raas of [
  {
    id: "lisinopril",
    rid: "No human breast milk data available (enalapril/captopril < 0.2%)",
    ridAnchor: "No quantitative human breast milk data are available for lisinopril",
    lact: "Direct milk data are lacking; prefer better-studied ACE inhibitors (enalapril or captopril) or labetalol/nifedipine when nursing newborns or preterm infants.",
    lactAnchor: "While lisinopril lacks direct milk measurements, ACE inhibitors as a class generally exhibit very low milk transfer",
  },
  {
    id: "losartan",
    rid: "No human breast milk data available (estimated minimal)",
    ridAnchor: "Human milk levels of losartan and its active carboxylic acid metabolite are unmeasured",
    lact: "No human lactation data exist and AT1 blockade poses theoretical risk to immature neonatal kidneys; prefer labetalol, nifedipine, or enalapril while breastfeeding.",
    lactAnchor: "Because no human lactation data exist for losartan and AT1 blockade could theoretically impair immature neonatal renal function",
  },
  {
    id: "valsartan",
    rid: "No human breast milk data available (estimated minimal)",
    ridAnchor: "Human breast milk concentrations of valsartan are unmeasured",
    lact: "No human lactation data exist and AT1 blockade poses theoretical risk to immature neonatal kidneys; prefer labetalol, nifedipine, or enalapril while breastfeeding.",
    lactAnchor: "Because no human lactation data exist for valsartan and AT1 blockade poses theoretical risk to immature neonatal kidneys",
  },
]) {
  updateDrug(raas.id, (d) => {
    d.reproductive = {
      tier: d.reproductive?.tier || { value: "avoid", refs: [] },
      folic_acid: naField(),
      contraception: makeField(
        "Does not impair hormonal contraceptives; effective contraception is advised so RAAS inhibitors can be switched to labetalol or nifedipine before conception.",
        W3,
        "Section 1: Teratogenic Agents Requiring Effective Contraception",
        teratogenContraAnchor,
        d.reproductive?.contraception
      ),
      pregnancy_pk: makeField(
        "Strictly contraindicated in pregnancy (especially 2nd/3rd trimesters): causes fetal renal tubular dysgenesis, oligohydramnios, pulmonary/skull hypoplasia, and fetal death; switch immediately upon pregnancy recognition.",
        W3,
        "Section 3: ACEi & ARBs Fetotoxicity",
        "Lisinopril, losartan, and valsartan are strictly contraindicated in pregnancy (`avoid`), especially during the 2nd and 3rd trimesters",
        d.reproductive?.pregnancy_pk
      ),
      mcm: [
        makeMcm(
          "National Registry RAAS Cohort (class)",
          5.6,
          "4.1%–7.6%",
          745,
          "first-trimester exposure",
          W3,
          "Section 3: ACEi & ARBs Fetotoxicity",
          "National Registry cohorts reported 5.6% (95% CI: 4.1%–7.6%, n=745) adverse fetal/malformation outcomes"
        ),
      ],
      postpartum: makeField(
        "Monitor postpartum blood pressure before restarting antihypertensives, and select lactation-preferred alternatives (labetalol, nifedipine, or enalapril) if breastfeeding.",
        W3,
        "Section 3: ACEi & ARBs Fetotoxicity",
        "switch to labetalol or nifedipine preconception and monitor postpartum BP before any restart",
        d.reproductive?.postpartum
      ),
      lactation_rid: makeField(raas.rid, LACT3, `LactMed: ${raas.id} — Drug Levels`, raas.ridAnchor, d.reproductive?.lactation_rid),
      lactation_summary: makeField(raas.lact, LACT3, `LactMed: ${raas.id} — Summary of Use during Lactation`, raas.lactAnchor, d.reproductive?.lactation_summary),
    };
    return syncVerificationHash(d);
  });
}

// 26. SPIRONOLACTONE
updateDrug("spironolactone", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || { value: "avoid", refs: [] },
    folic_acid: naField(),
    contraception: makeField(
      "Does not reduce hormonal contraceptive efficacy; use effective contraception to avoid unintended pregnancy exposure.",
      W3,
      "Section 1: Teratogenic Agents Requiring Effective Contraception",
      teratogenContraAnchor,
      d.reproductive?.contraception
    ),
    pregnancy_pk: makeField(
      "Exhibits anti-androgenic activity in animal models with potential feminization of male fetuses; avoid in routine pregnancy.",
      W3,
      "Section 3: Spironolactone & Furosemide",
      "Spironolactone exhibits anti-androgenic activity in animal models and must be avoided in pregnancy",
      d.reproductive?.pregnancy_pk
    ),
    mcm: d.reproductive?.mcm || [],
    postpartum: makeField(
      "Reassess maternal volume status and serum potassium postpartum before resuming therapy.",
      W3,
      "Section 3: Spironolactone & Furosemide",
      "requiring postpartum volume reassessment",
      d.reproductive?.postpartum
    ),
    lactation_rid: makeField(
      "0.2% to 1.2% (as active metabolite canrenone)",
      LACT3,
      "LactMed: Spironolactone — Drug Levels",
      "Combined transfer of spironolactone's active metabolite canrenone yields a low relative infant dose of 0.2% to 1.2%",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Milk transfer of active canrenone is low (RID <= 1.2%) and compatible with breastfeeding; monitor milk volume only if combined with aggressive diuresis.",
      LACT3,
      "LactMed: Spironolactone — Summary of Use during Lactation",
      "Milk levels of active canrenone are low (RID <= 1.2%) and considered compatible with breastfeeding",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 27. FUROSEMIDE
updateDrug("furosemide", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || { value: "caution", refs: [] },
    folic_acid: naField(),
    contraception: makeField("Does not reduce hormonal contraceptive efficacy.", W3, "Section 1: No Hormonal Contraceptive Induction", noContraAnchor, d.reproductive?.contraception),
    pregnancy_pk: makeField(
      "Reserved for maternal pulmonary edema or heart failure because diuretic-induced intravascular volume depletion can impair uteroplacental perfusion.",
      W3,
      "Section 3: Spironolactone & Furosemide",
      "furosemide is reserved for maternal pulmonary edema or heart failure (`caution`) because diuretic-induced intravascular volume depletion",
      d.reproductive?.pregnancy_pk
    ),
    mcm: d.reproductive?.mcm || [],
    postpartum: makeField(
      "Reassess maternal volume status and electrolytes postpartum; avoid unnecessary chronic high-dose diuresis if breastfeeding.",
      W3,
      "Section 3: Spironolactone & Furosemide",
      "requiring postpartum volume reassessment",
      d.reproductive?.postpartum
    ),
    lactation_rid: makeField(
      "0.1% to 1.0% of the weight-adjusted maternal dosage",
      LACT3,
      "LactMed: Furosemide — Drug Levels",
      "Breastfed infants receive approximately 0.1% to 1.0% of the weight-adjusted maternal furosemide dosage",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Minimal milk transfer (RID <= 1%) and safe for the infant, though intense maternal diuresis at high doses can suppress breast milk supply.",
      LACT3,
      "LactMed: Furosemide — Summary of Use during Lactation",
      "Furosemide milk transfer is minimal (RID <= 1%) and safe for the infant, though high or chronic loop diuretic doses can cause intense diuresis",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 28. POTASSIUM-CHLORIDE
updateDrug("potassium-chloride", (d) => {
  d.reproductive = {
    tier: makeTier(
      "preferred",
      "Physiological electrolyte replacement safe and compatible throughout all trimesters when clinically indicated for hypokalemia.",
      W3,
      "Section 3: Potassium Chloride",
      "Oral and IV potassium chloride is physiological replacement therapy (`preferred`) safe throughout all trimesters",
      d.reproductive?.tier
    ),
    folic_acid: naField(),
    contraception: naField(),
    pregnancy_pk: makeField(
      "Physiological electrolyte replacement safe throughout all trimesters; monitor maternal serum potassium and renal function.",
      W3,
      "Section 3: Potassium Chloride",
      "Oral and IV potassium chloride is physiological replacement therapy (`preferred`) safe throughout all trimesters",
      d.reproductive?.pregnancy_pk
    ),
    mcm: d.reproductive?.mcm || [],
    postpartum: naField(),
    lactation_rid: makeField(
      "Not applicable (physiological electrolyte)",
      LACT3,
      "LactMed: Potassium Chloride — Drug Levels",
      "Physiological electrolyte essential in human milk; exogenous maternal potassium chloride replacement does not alter physiological",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Normalizing maternal serum potassium with oral or IV potassium chloride is completely compatible with breastfeeding and poses no infant risk.",
      LACT3,
      "LactMed: Potassium Chloride — Summary of Use during Lactation",
      "Oral or IV potassium chloride replacement to normalize maternal serum potassium is completely compatible with breastfeeding",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// ========== 3. LIPID-LOWERING STATINS (3) ==========
for (const statin of [
  {
    id: "atorvastatin",
    rid: "No human breast milk data available",
    ridAnchor: "Quantitative human breast milk levels of atorvastatin have not been directly measured",
    lact: "Human milk data are lacking and statins theoretically disrupt infant cholesterol synthesis; breastfeeding is generally not recommended during atorvastatin therapy.",
    lactAnchor: "Because human milk transfer data are lacking and statins theoretically disrupt infant lipid and cholesterol synthesis",
  },
  {
    id: "rosuvastatin",
    rid: "0.4% to 1.5% of the weight-adjusted maternal dosage",
    ridAnchor: "Limited human case measurements indicate a low relative infant dose of 0.4% to 1.5%",
    lact: "Limited case data show low milk transfer (RID <= 1.5%), yet regulatory labels advise against breastfeeding due to potential infant lipid disruption; temporary hold during nursing is usually feasible.",
    lactAnchor: "Although limited measurements show low milk transfer (RID <= 1.5%), FDA labeling advises against breastfeeding during rosuvastatin therapy",
  },
  {
    id: "simvastatin",
    rid: "No human breast milk data available",
    ridAnchor: "Quantitative human breast milk concentrations of simvastatin and simvastatin acid have not been measured",
    lact: "Human milk transfer is uncharacterized and statins may interfere with infant cholesterol and steroid synthesis; breastfeeding is not recommended during therapy.",
    lactAnchor: "Because human milk transfer is uncharacterized and statins could theoretically interfere with infant cholesterol and steroid synthesis",
  },
]) {
  updateDrug(statin.id, (d) => {
    d.reproductive = {
      tier: d.reproductive?.tier || { value: "avoid", refs: [] },
      folic_acid: naField(),
      contraception: makeField(
        "Does not impair hormonal contraceptives; use effective contraception to discontinue statins before planned conception unless high-risk ASCVD/FH cardiology exceptions apply.",
        W3,
        "Section 1: Teratogenic Agents Requiring Effective Contraception",
        teratogenContraAnchor,
        d.reproductive?.contraception
      ),
      pregnancy_pk: makeField(
        "Avoided in routine pregnancy due to animal developmental toxicity and theoretical disruption of fetal cholesterol synthesis; discontinue upon pregnancy recognition (rare extreme-risk ASCVD/FH exceptions per cardiology).",
        W3,
        "Section 4: Statins",
        "statins remain avoided in routine pregnancy (`avoid`) due to animal developmental toxicity",
        d.reproductive?.pregnancy_pk
      ),
      mcm: d.reproductive?.mcm || [],
      postpartum: makeField(
        "Resume statin therapy only after breastfeeding completion or per specialist cardiovascular risk assessment.",
        W3,
        "Section 4: Statins",
        "discontinue when pregnancy is recognized and resume only after breastfeeding or per cardiology guidance",
        d.reproductive?.postpartum
      ),
      lactation_rid: makeField(statin.rid, LACT3, `LactMed: ${statin.id} — Drug Levels`, statin.ridAnchor, d.reproductive?.lactation_rid),
      lactation_summary: makeField(statin.lact, LACT3, `LactMed: ${statin.id} — Summary of Use during Lactation`, statin.lactAnchor, d.reproductive?.lactation_summary),
    };
    return syncVerificationHash(d);
  });
}

// ========== 4. ENDOCRINE & METABOLIC (8) ==========

// 32. LEVOTHYROXINE
updateDrug("levothyroxine", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || { value: "preferred", refs: [] },
    folic_acid: naField(),
    contraception: makeField("Does not reduce hormonal contraceptive efficacy (estrogen increases TBG, requiring TSH monitoring).", W3, "Section 1: No Hormonal Contraceptive Induction", noContraAnchor, d.reproductive?.contraception),
    pregnancy_pk: makeField(
      "Maternal demand increases 25%–50% by weeks 4–8 due to elevated TBG and placental deiodinase; increase dose 20%–30% immediately upon positive pregnancy test and monitor TSH every 4 weeks.",
      W3,
      "Section 4: Levothyroxine Preferred & Pregnancy PK/Postpartum",
      "maternal thyroid hormone demand rises 25%–50% by weeks 4–8 of gestation due to TBG elevation",
      d.reproductive?.pregnancy_pk
    ),
    mcm: d.reproductive?.mcm || [],
    postpartum: makeField(
      "Reduce levothyroxine immediately back to the pre-pregnancy maintenance dose postpartum and recheck TSH at 6 weeks.",
      W3,
      "Section 4: Levothyroxine Preferred & Pregnancy PK/Postpartum",
      "prompt reduction back to pre-pregnancy dose immediately postpartum",
      d.reproductive?.postpartum
    ),
    lactation_rid: makeField(
      "< 0.1% (physiological hormone replacement)",
      LACT3,
      "LactMed: Levothyroxine — Drug Levels",
      "Exogenous levothyroxine yields physiological replacement milk transfer (estimated RID < 0.1%",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Endogenous hormone completely compatible with breastfeeding (RID < 0.1%); maintaining maternal euthyroidism supports normal lactation without masking neonatal thyroid screening.",
      LACT3,
      "LactMed: Levothyroxine — Summary of Use during Lactation",
      "Levothyroxine is a normal endogenous hormone compatible with breastfeeding",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 33. INSULIN-GLARGINE
updateDrug("insulin-glargine", (d) => {
  d.reproductive = {
    tier: makeTier(
      "preferred",
      "Insulin is the gold-standard preferred therapy for diabetes during pregnancy because it does not cross the placenta.",
      W3,
      "Section 4: Insulin Glargine Preferred & Postpartum",
      "Insulin is the preferred gold-standard therapy for diabetes in pregnancy (`preferred`) because it does not cross the placenta",
      d.reproductive?.tier
    ),
    folic_acid: makeField(
      "Preconception glycemic optimization plus 0.4 mg/day (up to 4–5 mg/day considered in pre-existing diabetes) reduces diabetes-associated neural tube defect risk.",
      W3,
      "Section 1: Folic Acid Preconception Baseline",
      "higher preconception folate (up to 4–5 mg/day) may be considered in pre-existing diabetes mellitus",
      d.reproductive?.folic_acid
    ),
    contraception: makeField("Does not interact with hormonal contraceptives.", W3, "Section 1: No Hormonal Contraceptive Induction", noContraAnchor, d.reproductive?.contraception),
    pregnancy_pk: makeField(
      "Does not cross the placenta; insulin requirements rise steeply during the 2nd and 3rd trimesters due to placental lactogen resistance, requiring frequent glucose-guided titration.",
      W3,
      "Section 4: Insulin Glargine Preferred & Postpartum",
      "insulin requirements rise steeply in the 2nd and 3rd trimesters due to placental lactogen resistance",
      d.reproductive?.pregnancy_pk
    ),
    mcm: d.reproductive?.mcm || [],
    postpartum: makeField(
      "Insulin demand plunges 30%–50% immediately after placental delivery; reduce basal insulin promptly postpartum to prevent severe maternal hypoglycemia.",
      W3,
      "Section 4: Insulin Glargine Preferred & Postpartum",
      "drop precipitously by 30%–50% immediately after placental delivery—reduce postpartum basal insulin promptly",
      d.reproductive?.postpartum
    ),
    lactation_rid: makeField(
      "Effective RID ~0% (destroyed in infant GI tract)",
      LACT3,
      "LactMed: Insulin Glargine — Drug Levels",
      "Large peptide hormone (~6 kDa) minimally excreted into human milk and completely digested in the infant GI tract",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Exogenous insulins are physiological polypeptides digested by infant GI proteases and do not lower infant blood glucose; fully compatible with breastfeeding.",
      LACT3,
      "LactMed: Insulin Glargine — Summary of Use during Lactation",
      "Exogenous insulins including insulin glargine are normal physiological polypeptides destroyed by infant gastrointestinal proteases",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 34. METFORMIN
updateDrug("metformin", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || { value: "caution", refs: [] },
    folic_acid: makeField(
      "Standard preconception folic acid (0.4 mg/day; up to 4–5 mg/day considered in pre-existing diabetes) alongside vitamin B12 monitoring on chronic metformin.",
      W3,
      "Section 1: Folic Acid Preconception Baseline",
      "higher preconception folate (up to 4–5 mg/day) may be considered in pre-existing diabetes mellitus due to elevated baseline neural tube defect risk; metformin does not require routine high-dose folate beyond B12 monitoring",
      d.reproductive?.folic_acid
    ),
    contraception: makeField("Does not reduce hormonal contraceptive efficacy (can restore ovulation in PCOS).", W3, "Section 1: No Hormonal Contraceptive Induction", noContraAnchor, d.reproductive?.contraception),
    pregnancy_pk: makeField(
      "Crosses the placenta freely without teratogenicity; maternal renal clearance rises during pregnancy (insulin remains preferred first-line for pre-existing diabetes).",
      W3,
      "Section 4: Metformin Registry, PK & Postpartum",
      "Metformin crosses the placenta freely without teratogenicity (`caution`)",
      d.reproductive?.pregnancy_pk
    ),
    mcm: [
      makeMcm(
        "Nordic & UK Teratology Cohorts",
        3.2,
        "2.5%–4.1%",
        1840,
        "first-trimester exposure",
        W3,
        "Section 4: Metformin Registry, PK & Postpartum",
        "Nordic & UK Teratology Cohorts reported major congenital malformations in 3.2%"
      ),
    ],
    postpartum: makeField(
      "Postpartum insulin sensitivity improves rapidly; discontinue or halve gestational metformin doses after delivery while monitoring maternal glycemia.",
      W3,
      "Section 4: Metformin Registry, PK & Postpartum",
      "postpartum insulin sensitivity returns rapidly so discontinue or halve gestational doses after delivery",
      d.reproductive?.postpartum
    ),
    lactation_rid: makeField(
      "0.1% to 1.1% (mean ~0.3%–0.7%) of the weight-adjusted maternal dosage",
      LACT3,
      "LactMed: Metformin — Drug Levels",
      "Breastfed infants receive approximately 0.1% to 1.1% (mean ~0.3%–0.7%) of the weight-adjusted maternal metformin dosage",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Minimal transfer into human milk (RID <= 1.1%) with undetectable infant serum levels and no neonatal hypoglycemia; widely considered compatible with breastfeeding.",
      LACT3,
      "LactMed: Metformin — Summary of Use during Lactation",
      "Metformin enters human milk in very small quantities (RID <= 1.1%) with undetectable infant serum levels",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 35-39. GLICLAZIDE, GLIMEPIRIDE, SITAGLIPTIN, DAPAGLIFLOZIN, EMPAGLIFLOZIN
for (const dm of [
  {
    id: "gliclazide",
    tier: "avoid",
    pk: "Crosses the placenta and risks severe, prolonged neonatal hypoglycemia; transition to insulin before or upon pregnancy recognition.",
    pkAnchor: "Gliclazide and glimepiride cross the placenta and risk severe prolonged neonatal hypoglycemia",
    rid: "No human breast milk data available",
    ridAnchor: "No quantitative human breast milk measurements are available for gliclazide",
    lact: "Human milk data are lacking and sulfonylureas pose theoretical neonatal hypoglycemia risk; insulin or metformin is preferred during breastfeeding.",
    lactAnchor: "Because human milk data are lacking and sulfonylureas theoretically carry a risk of infant hypoglycemia",
  },
  {
    id: "glimepiride",
    tier: "caution",
    pk: "Crosses the placenta and risks severe, prolonged neonatal hypoglycemia; transition to insulin during pregnancy (discontinue at least 2 weeks before expected delivery if ever used).",
    pkAnchor: "Gliclazide and glimepiride cross the placenta and risk severe prolonged neonatal hypoglycemia",
    rid: "No human milk data available (estimated < 1%)",
    ridAnchor: "Human milk levels are uncharacterized (high protein binding > 99% suggests minimal milk transfer",
    lact: "Human milk data are lacking and neonatal hypoglycemia risk warrants caution; prefer insulin or metformin during lactation or monitor infant glucose closely.",
    lactAnchor: "Although glimepiride's >99% protein binding limits theoretical milk transfer, human data are lacking",
  },
  {
    id: "sitagliptin",
    tier: "caution",
    pk: "Limited human pregnancy safety data; transition to pregnancy-preferred insulin during gestation and reassess glycemic therapy postpartum.",
    pkAnchor: "sitagliptin has limited human data; dapagliflozin and empagliflozin must be avoided in 2nd/3rd trimesters",
    rid: "No human breast milk data available",
    ridAnchor: "Human breast milk concentrations of sitagliptin have not been measured in clinical studies",
    lact: "No human lactation data exist for sitagliptin; prefer insulin or metformin in breastfeeding mothers with diabetes.",
    lactAnchor: "Because no human lactation data exist for sitagliptin, better-studied agents such as insulin or metformin are preferred",
  },
  {
    id: "dapagliflozin",
    tier: "avoid",
    pk: "Avoid in 2nd and 3rd trimesters due to renal tubular developmental toxicity in animal kidneys during maturation; transition to insulin in pregnancy.",
    pkAnchor: "dapagliflozin and empagliflozin must be avoided in 2nd/3rd trimesters (`avoid`) due to renal tubular developmental toxicity",
    rid: "No human breast milk data available",
    ridAnchor: "No quantitative human breast milk data are available for dapagliflozin",
    lact: "Transfers into animal milk with potential adverse effects on developing infant renal tubules; breastfeeding is not recommended (prefer insulin or metformin).",
    lactAnchor: "Because dapagliflozin passes into rat milk and causes renal tubular dilation during rodent kidney maturation",
  },
  {
    id: "empagliflozin",
    tier: "avoid",
    pk: "Avoid in 2nd and 3rd trimesters due to renal tubular developmental toxicity in animal kidneys during maturation; transition to insulin in pregnancy.",
    pkAnchor: "dapagliflozin and empagliflozin must be avoided in 2nd/3rd trimesters (`avoid`) due to renal tubular developmental toxicity",
    rid: "No human breast milk data available",
    ridAnchor: "No quantitative human breast milk data are available for empagliflozin",
    lact: "Transfers into animal milk with potential adverse effects on developing infant renal tubules; breastfeeding is not recommended (prefer insulin or metformin).",
    lactAnchor: "Because empagliflozin enters animal milk and animal studies indicate potential adverse effects on developing infant renal tubules",
  },
]) {
  updateDrug(dm.id, (d) => {
    d.reproductive = {
      tier: d.reproductive?.tier || { value: dm.tier, refs: [] },
      folic_acid: naField(),
      contraception: makeField("Does not alter hormonal contraceptive efficacy.", W3, "Section 1: No Hormonal Contraceptive Induction", noContraAnchor, d.reproductive?.contraception),
      pregnancy_pk: makeField(dm.pk, W3, "Section 4: Sulfonylureas & Newer Antidiabetics", dm.pkAnchor, d.reproductive?.pregnancy_pk),
      mcm: d.reproductive?.mcm || [],
      postpartum: makeField(
        "Reassess maternal postpartum glycemic control before resuming non-insulin oral agents, selecting lactation-compatible options (insulin or metformin) if breastfeeding.",
        W3,
        "Section 4: Sulfonylureas & Newer Antidiabetics",
        "transition to insulin during pregnancy and reassess postpartum",
        d.reproductive?.postpartum
      ),
      lactation_rid: makeField(dm.rid, LACT3, `LactMed: ${dm.id} — Drug Levels`, dm.ridAnchor, d.reproductive?.lactation_rid),
      lactation_summary: makeField(dm.lact, LACT3, `LactMed: ${dm.id} — Summary of Use during Lactation`, dm.lactAnchor, d.reproductive?.lactation_summary),
    };
    return syncVerificationHash(d);
  });
}

// ========== 5. PROTON PUMP INHIBITORS (3) ==========
updateDrug("omeprazole", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || { value: "caution", refs: [] },
    folic_acid: naField(),
    contraception: makeField("Does not reduce hormonal contraceptive efficacy.", W3, "Section 1: No Hormonal Contraceptive Induction", noContraAnchor, d.reproductive?.contraception),
    pregnancy_pk: makeField(
      "Widely used for severe GERD or ulcer prophylaxis in pregnancy without teratogenic signal in Danish National Birth Cohort (2.6% MCM, n=1,800); standard dosing applies.",
      W3,
      "Section 4: Proton Pump Inhibitors",
      "PPIs are widely used for severe GERD or stress ulcer prophylaxis in pregnancy",
      d.reproductive?.pregnancy_pk
    ),
    mcm: [
      makeMcm(
        "Danish National Birth Cohort",
        2.6,
        "2.2%–3.1%",
        1800,
        "first-trimester exposure",
        W3,
        "Section 4: Proton Pump Inhibitors",
        "Danish National Birth Cohort data for omeprazole reported major congenital malformations in 2.6%"
      ),
    ],
    postpartum: naField(),
    lactation_rid: makeField(
      "0.3% to 1.1% of the weight-adjusted maternal dosage",
      LACT3,
      "LactMed: Omeprazole — Drug Levels",
      "Maternal oral omeprazole yields a very low relative infant dose of 0.3% to 1.1%",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Enters breast milk in tiny amounts (RID <= 1.1%) and is largely destroyed by infant gastric acid; compatible with breastfeeding without interruption.",
      LACT3,
      "LactMed: Omeprazole — Summary of Use during Lactation",
      "Omeprazole enters breast milk in tiny amounts (RID <= 1.1%) and is largely destroyed by infant gastric acid",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

updateDrug("esomeprazole", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || { value: "caution", refs: [] },
    folic_acid: naField(),
    contraception: makeField("Does not reduce hormonal contraceptive efficacy.", W3, "Section 1: No Hormonal Contraceptive Induction", noContraAnchor, d.reproductive?.contraception),
    pregnancy_pk: makeField(
      "S-isomer of omeprazole; large Danish birth cohort data for omeprazole/PPIs show no elevated risk of major congenital malformations (2.6%, n=1,800). Standard dosing applies.",
      W3,
      "Section 4: Proton Pump Inhibitors",
      "PPIs are widely used for severe GERD or stress ulcer prophylaxis in pregnancy",
      d.reproductive?.pregnancy_pk
    ),
    mcm: [
      makeMcm(
        "Danish National Birth Cohort (omeprazole racemate)",
        2.6,
        "2.2%–3.1%",
        1800,
        "first-trimester exposure",
        W3,
        "Section 4: Proton Pump Inhibitors",
        "Danish National Birth Cohort data for omeprazole reported major congenital malformations in 2.6%"
      ),
    ],
    postpartum: naField(),
    lactation_rid: makeField(
      "0.1% to 0.7% of the weight-adjusted maternal dosage",
      LACT3,
      "LactMed: Esomeprazole — Drug Levels",
      "Maternal esomeprazole produces a very low relative infant dose of 0.1% to 0.7%",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Enters breast milk in tiny amounts (RID < 1%) and is rapidly degraded by infant gastric acid; compatible with breastfeeding.",
      LACT3,
      "LactMed: Esomeprazole — Summary of Use during Lactation",
      "Esomeprazole (the S-isomer of omeprazole) enters breast milk in tiny amounts (RID < 1%)",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

updateDrug("pantoprazole", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || { value: "caution", refs: [] },
    folic_acid: naField(),
    contraception: makeField("Does not reduce hormonal contraceptive efficacy.", W3, "Section 1: No Hormonal Contraceptive Induction", noContraAnchor, d.reproductive?.contraception),
    pregnancy_pk: makeField(
      "Danish National Birth Cohort data showed no elevated malformation risk (2.9%, n=549); standard oral or IV dosing applies in pregnancy.",
      W3,
      "Section 4: Proton Pump Inhibitors",
      "pantoprazole 2.9% (95% CI: 1.9%–4.3%, n=549) with no elevated birth defect risk",
      d.reproductive?.pregnancy_pk
    ),
    mcm: [
      makeMcm(
        "Danish National Birth Cohort",
        2.9,
        "1.9%–4.3%",
        549,
        "first-trimester exposure",
        W3,
        "Section 4: Proton Pump Inhibitors",
        "pantoprazole 2.9% (95% CI: 1.9%–4.3%, n=549) with no elevated birth defect risk"
      ),
    ],
    postpartum: naField(),
    lactation_rid: makeField(
      "0.02% to 0.14% of the weight-adjusted maternal dosage",
      LACT3,
      "LactMed: Pantoprazole — Drug Levels",
      "Single oral or IV pantoprazole produces an extremely low relative infant dose of 0.02% to 0.14%",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Minimal milk concentrations (RID < 0.2%) with rapid gastric acid degradation in the infant stomach; compatible with breastfeeding.",
      LACT3,
      "LactMed: Pantoprazole — Summary of Use during Lactation",
      "Pantoprazole milk concentrations are minimal (RID < 0.2%) and rapid acid degradation",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// ========== 6. CNS INFECTIONS — ANTIMICROBIALS (8) ==========

for (const bl of [
  {
    id: "ampicillin",
    tier: "preferred",
    tierNote: "Preferred first-line beta-lactam antibiotic in pregnancy (2.7% penicillin cohort MCM in n=12,500) and essential for Listeria CNS meningitis.",
    mcmReg: "Danish & OTIS Penicillin Cohort (class)",
    mcmPct: 2.7,
    mcmCi: "2.4%–3.1%",
    mcmN: 12500,
    mcmAnchor: "Danish/OTIS Cohorts reported 2.7% MCM (95% CI: 2.4%–3.1%, n=12,500) for penicillins",
    rid: "0.1% to 0.5% of the weight-adjusted maternal dosage",
    ridAnchor: "Breastfed infants receive approximately 0.1% to 0.5% of the weight-adjusted maternal ampicillin dosage",
    lact: "Enters breast milk in tiny quantities (RID <= 0.5%) and is widely compatible with breastfeeding; observe infant occasionally for mild diarrhea or thrush.",
    lactAnchor: "Ampicillin enters breast milk in tiny quantities (RID <= 0.5%) and is widely compatible with breastfeeding",
  },
  {
    id: "amoxicillin-clavulanate",
    tier: "preferred",
    tierNote: "Preferred first-line beta-lactam antibiotic in pregnancy (2.7% penicillin cohort MCM in n=12,500); standard dosing applies.",
    mcmReg: "Danish & OTIS Penicillin Cohort (class)",
    mcmPct: 2.7,
    mcmCi: "2.4%–3.1%",
    mcmN: 12500,
    mcmAnchor: "Danish/OTIS Cohorts reported 2.7% MCM (95% CI: 2.4%–3.1%, n=12,500) for penicillins",
    rid: "0.4% to 1.0% of the weight-adjusted maternal dosage",
    ridAnchor: "Maternal oral amoxicillin produces a very low relative infant dose of 0.4% to 1.0%",
    lact: "Compatible with breastfeeding (RID <= 1%) with minimal clavulanate transfer; monitor infant occasionally for mild diarrhea, thrush, or rash.",
    lactAnchor: "Amoxicillin-clavulanate is compatible with breastfeeding (RID <= 1%)",
  },
  {
    id: "ceftriaxone",
    tier: "preferred",
    tierNote: "Preferred first-line third-generation cephalosporin in pregnancy (2.8% cephalosporin cohort MCM in n=1,740) and essential for bacterial meningitis.",
    mcmReg: "Danish & OTIS Cephalosporin Cohort (class)",
    mcmPct: 2.8,
    mcmCi: "2.1%–3.7%",
    mcmN: 1740,
    mcmAnchor: "and 2.8% (95% CI: 2.1%–3.7%, n=1,740) for cephalosporins",
    rid: "0.3% to 4.4% of the weight-adjusted maternal dosage",
    ridAnchor: "Parenteral ceftriaxone passes into breast milk in very small amounts, yielding a relative infant dose of 0.3% to 4.4%",
    lact: "Low milk transfer (RID < 4.5%) and poor oral absorption in the infant gut; compatible with breastfeeding (watch for mild loose stools or thrush).",
    lactAnchor: "Ceftriaxone has poor oral absorption in the infant gut and low milk transfer (RID < 4.5%)",
  },
  {
    id: "piperacillin-tazobactam",
    tier: "caution",
    tierNote: "Beta-lactam antibiotic considered acceptable in pregnancy when broad Gram-negative/anaerobic coverage is required, though specific first-trimester human cohorts are smaller.",
    mcmReg: "Danish & OTIS Penicillin Cohort (class)",
    mcmPct: 2.7,
    mcmCi: "2.4%–3.1%",
    mcmN: 12500,
    mcmAnchor: "Danish/OTIS Cohorts reported 2.7% MCM (95% CI: 2.4%–3.1%, n=12,500) for penicillins",
    rid: "0.2% to 1.0% of the weight-adjusted maternal dosage",
    ridAnchor: "Intravenous maternal piperacillin produces a very low relative infant dose of 0.2% to 1.0%",
    lact: "Low milk transfer (RID <= 1%) with poor infant oral GI absorption; compatible with breastfeeding while observing for mild diarrhea or thrush.",
    lactAnchor: "Piperacillin-tazobactam milk transfer is low (RID <= 1%) and oral absorption in the infant GI tract is poor",
  },
]) {
  updateDrug(bl.id, (d) => {
    d.reproductive = {
      tier: makeTier(bl.tier, bl.tierNote, W3, "Section 5: Penicillins & Cephalosporins", "Beta-lactams are preferred first-line antibiotics in pregnancy", d.reproductive?.tier),
      folic_acid: naField(),
      contraception: makeField(
        "Does not reduce systemic hormonal contraceptive levels; use barrier backup only if severe antibiotic-associated vomiting or diarrhea occurs.",
        W3,
        "Section 1: Broad-Spectrum Antibiotics Contraception Note",
        abxContraAnchor,
        d.reproductive?.contraception
      ),
      pregnancy_pk: makeField(
        "Elevated maternal GFR and expanded volume of distribution in pregnancy increase beta-lactam clearance; use standard-to-high-end dosing for serious CNS infections.",
        W3,
        "Section 5: Penicillins & Cephalosporins",
        "increased maternal GFR and volume of distribution in pregnancy may warrant standard-to-high end dosing",
        d.reproductive?.pregnancy_pk
      ),
      mcm: [makeMcm(bl.mcmReg, bl.mcmPct, bl.mcmCi, bl.mcmN, "first-trimester exposure", W3, "Section 5: Penicillins & Cephalosporins", bl.mcmAnchor)],
      postpartum: naField(),
      lactation_rid: makeField(bl.rid, LACT3, `LactMed: ${bl.id} — Drug Levels`, bl.ridAnchor, d.reproductive?.lactation_rid),
      lactation_summary: makeField(bl.lact, LACT3, `LactMed: ${bl.id} — Summary of Use during Lactation`, bl.lactAnchor, d.reproductive?.lactation_summary),
    };
    return syncVerificationHash(d);
  });
}

updateDrug("azithromycin", (d) => {
  d.reproductive = {
    tier: makeTier(
      "preferred",
      "Preferred macrolide antibiotic during pregnancy with lower risk than clarithromycin (3.0% MCM across n=4,200 first-trimester exposures in OTIS/Nordic cohorts).",
      W3,
      "Section 5: Azithromycin Preferred Macrolide",
      "Azithromycin is a preferred macrolide in pregnancy (`preferred`) with lower risk than clarithromycin",
      d.reproductive?.tier
    ),
    folic_acid: naField(),
    contraception: makeField(
      "Does not reduce systemic hormonal contraceptive levels; backup contraception needed only if severe GI upset impairs pill absorption.",
      W3,
      "Section 1: Broad-Spectrum Antibiotics Contraception Note",
      abxContraAnchor,
      d.reproductive?.contraception
    ),
    pregnancy_pk: makeField(
      "Large distribution volume with slow tissue clearance; standard maternal dosing applies during pregnancy.",
      W3,
      "Section 5: Azithromycin Preferred Macrolide",
      "Azithromycin is a preferred macrolide in pregnancy",
      d.reproductive?.pregnancy_pk
    ),
    mcm: [
      makeMcm(
        "OTIS & Nordic Pregnancy Cohorts",
        3.0,
        "2.5%–3.6%",
        4200,
        "first-trimester exposure",
        W3,
        "Section 5: Azithromycin Preferred Macrolide",
        "OTIS and Nordic Pregnancy Cohorts reported major congenital malformations in 3.0%"
      ),
    ],
    postpartum: naField(),
    lactation_rid: makeField(
      "1.3% to 5.9% of the weight-adjusted maternal dosage",
      LACT3,
      "LactMed: Azithromycin — Drug Levels",
      "Maternal azithromycin yields a relative infant dose of 1.3% to 5.9%",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Low-to-moderate milk transfer (RID <= 6%) and generally compatible with breastfeeding; observe infants for mild GI symptoms/thrush and rare infantile pyloric stenosis in the first month.",
      LACT3,
      "LactMed: Azithromycin — Summary of Use during Lactation",
      "Azithromycin milk transfer is low to moderate (RID <= 6%) and generally compatible with breastfeeding",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

updateDrug("vancomycin", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || { value: "caution", refs: [] },
    folic_acid: naField(),
    contraception: makeField(
      "Does not reduce hormonal contraceptive levels.",
      W3,
      "Section 1: Broad-Spectrum Antibiotics Contraception Note",
      abxContraAnchor,
      d.reproductive?.contraception
    ),
    pregnancy_pk: makeField(
      "Crosses the placenta without recognized teratogenicity; expanded volume of distribution and augmented renal clearance increase clearance, requiring AUC-guided or trough TDM during MRSA CNS infection.",
      W3,
      "Section 5: Vancomycin Pregnancy PK & TDM",
      "elevated maternal volume of distribution and augmented renal clearance in pregnancy increase vancomycin clearance",
      d.reproductive?.pregnancy_pk
    ),
    mcm: d.reproductive?.mcm || [],
    postpartum: makeField(
      "Reassess renal clearance and AUC/trough vancomycin levels postpartum if prolonged IV therapy continues after delivery.",
      W3,
      "Section 5: Vancomycin Pregnancy PK & TDM",
      "requiring AUC-guided or trough therapeutic drug monitoring and postpartum reassessment",
      d.reproductive?.postpartum
    ),
    lactation_rid: makeField(
      "Estimated < 2% (virtually zero infant oral absorption)",
      LACT3,
      "LactMed: Vancomycin — Drug Levels",
      "Intravenous maternal vancomycin produces low milk concentrations (estimated RID < 2%) with virtually zero oral absorption",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Poorly absorbed orally with minimal milk transfer (RID < 2%); compatible with breastfeeding while observing occasionally for loose stools or diaper thrush.",
      LACT3,
      "LactMed: Vancomycin — Summary of Use during Lactation",
      "Vancomycin is poorly absorbed orally and appears in minimal amounts in human milk",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

for (const fq of [
  {
    id: "ciprofloxacin",
    rid: "0.5% to 2.1% of the weight-adjusted maternal dosage",
    ridAnchor: "Oral or IV ciprofloxacin produces a low relative infant dose of 0.5% to 2.1%",
    lact: "Low milk transfer (RID <= 2.1%) and milk calcium limits infant GI absorption; acceptable when indicated, optionally waiting 3–4 h post-dose and monitoring for diarrhea or thrush.",
    lactAnchor: "Ciprofloxacin levels in breast milk are low (RID <= 2.1%) and milk calcium markedly reduces infant GI absorption",
  },
  {
    id: "levofloxacin",
    rid: "4.6% to 10.6% (often ~5%–8%) of the weight-adjusted maternal dosage",
    ridAnchor: "Oral or IV levofloxacin produces a moderate relative infant dose of 4.6% to 10.6%",
    lact: "Moderate milk transfer (RID ~5%–10%), though milk calcium limits infant GI absorption; prefer ciprofloxacin if a fluoroquinolone is required, or wait 4–6 h post-dose and watch for diarrhea/thrush.",
    lactAnchor: "Levofloxacin achieves higher breast milk concentrations than ciprofloxacin (RID ~5%–10%)",
  },
]) {
  updateDrug(fq.id, (d) => {
    d.reproductive = {
      tier: d.reproductive?.tier || { value: "caution", refs: [] },
      folic_acid: naField(),
      contraception: makeField(
        "Does not reduce systemic hormonal contraceptive levels; use barrier backup only if severe antibiotic-associated vomiting or diarrhea impairs absorption.",
        W3,
        "Section 1: Broad-Spectrum Antibiotics Contraception Note",
        abxContraAnchor,
        d.reproductive?.contraception
      ),
      pregnancy_pk: makeField(
        "Avoided as first-line therapy in pregnancy due to juvenile animal arthropathy, though ENTIS prospective data (2.8% MCM, n=949) showed no clear human teratogenic increase; reserve for resistant CNS infections.",
        W3,
        "Section 5: Fluoroquinolones",
        "Fluoroquinolones are avoided as first-line agents in pregnancy (`caution`) due to arthropathy",
        d.reproductive?.pregnancy_pk
      ),
      mcm: [
        makeMcm(
          "ENTIS Prospective Fluoroquinolone Cohort (class)",
          2.8,
          "1.9%–4.1%",
          949,
          "first-trimester exposure",
          W3,
          "Section 5: Fluoroquinolones",
          "ENTIS Prospective Cohort data (2.8% MCM, 95% CI: 1.9%–4.1%, n=949)"
        ),
      ],
      postpartum: naField(),
      lactation_rid: makeField(fq.rid, LACT3, `LactMed: ${fq.id} — Drug Levels`, fq.ridAnchor, d.reproductive?.lactation_rid),
      lactation_summary: makeField(fq.lact, LACT3, `LactMed: ${fq.id} — Summary of Use during Lactation`, fq.lactAnchor, d.reproductive?.lactation_summary),
    };
    return syncVerificationHash(d);
  });
}

// ========== 7. MOVEMENT DISORDERS (7) ==========

updateDrug("levodopa-carbidopa", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || { value: "caution", refs: [] },
    folic_acid: naField(),
    contraception: makeField("Does not reduce hormonal contraceptive efficacy.", W3, "Section 1: No Hormonal Contraceptive Induction", noContraAnchor, d.reproductive?.contraception),
    pregnancy_pk: makeField(
      "Preferred symptomatic therapy when Parkinson's disease or dopa-responsive dystonia requires treatment in pregnancy (no clear human malformation pattern in limited cohorts); delayed gastric emptying in late pregnancy may require dose spacing.",
      W3,
      "Section 6: Levodopa-Carbidopa Pregnancy & Registry",
      "Levodopa-carbidopa is the preferred symptomatic therapy when Parkinson's disease or dopa-responsive dystonia requires treatment in pregnancy",
      d.reproductive?.pregnancy_pk
    ),
    mcm: d.reproductive?.mcm || [],
    postpartum: makeField(
      "Reassess motor symptoms and lactation goals postpartum, since levodopa suppresses maternal prolactin and can markedly reduce milk supply.",
      W3,
      "Section 6: Dopamine Agonists & Adjuncts",
      "dopamine agonists suppress maternal prolactin and inhibit postpartum lactation",
      d.reproductive?.postpartum
    ),
    lactation_rid: makeField(
      "< 0.5% of the weight-adjusted maternal dosage",
      LACT3,
      "LactMed: Levodopa-Carbidopa — Drug Levels",
      "Oral levodopa yields a very low relative infant dose of < 0.5% (carbidopa transfer is negligible)",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Minimal infant milk exposure (RID < 0.5%), though levodopa suppresses maternal prolactin and can reduce milk production; use lowest effective dose and monitor milk supply and infant growth.",
      LACT3,
      "LactMed: Levodopa-Carbidopa — Summary of Use during Lactation",
      "Although infant milk exposure to levodopa is minimal (RID < 0.5%), levodopa suppresses prolactin",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

for (const pd of [
  {
    id: "pramipexole",
    rid: "No human breast milk data available (suppresses prolactin)",
    ridAnchor: "Human milk levels of pramipexole are unmeasured, and its potent D2/D3 agonism",
    lact: "Potently suppresses maternal prolactin and inhibits lactation while human milk transfer and infant dopaminergic effects are unknown; avoid during breastfeeding.",
    lactAnchor: "Pramipexole suppresses prolactin and inhibits lactation while human milk transfer",
  },
  {
    id: "ropinirole",
    rid: "No human breast milk data available (suppresses prolactin)",
    ridAnchor: "Human breast milk concentrations are unstudied, and ropinirole potently suppresses",
    lact: "Inhibits prolactin release and can completely suppress lactation while milk transfer is uncharacterized; avoid during breastfeeding.",
    lactAnchor: "Ropinirole inhibits prolactin release and can completely suppress lactation",
  },
  {
    id: "rasagiline",
    rid: "No human breast milk data available",
    ridAnchor: "Quantitative human breast milk measurements for rasagiline are lacking",
    lact: "No human lactation data exist and MAO-B inhibitors may suppress prolactin; avoid during breastfeeding or monitor infant and milk supply closely.",
    lactAnchor: "Because rasagiline has no human lactation data and MAO-B inhibitors may reduce prolactin",
  },
  {
    id: "entacapone",
    rid: "No human milk measurements (~98% protein-bound)",
    ridAnchor: "No human breast milk measurements exist for entacapone (~98% protein-bound",
    lact: "High protein binding (~98%) predicts negligible milk transfer, though human lactation studies are absent; monitor infant for GI upset or dark urine if used.",
    lactAnchor: "Entacapone has high maternal protein binding (~98%) and negligible expected milk transfer",
  },
  {
    id: "trihexyphenidyl",
    rid: "No human breast milk data available",
    ridAnchor: "Human breast milk concentrations of trihexyphenidyl are unavailable",
    lact: "Lacks human milk data, may decrease milk supply via anticholinergic action, and could cause infant tachycardia, flushing, or sedation; use caution or prefer an alternative.",
    lactAnchor: "Trihexyphenidyl lacks human milk data, may decrease maternal milk supply via anticholinergic action",
  },
]) {
  updateDrug(pd.id, (d) => {
    d.reproductive = {
      tier: d.reproductive?.tier || { value: "caution", refs: [] },
      folic_acid: naField(),
      contraception: makeField("Does not reduce hormonal contraceptive efficacy.", W3, "Section 1: No Hormonal Contraceptive Induction", noContraAnchor, d.reproductive?.contraception),
      pregnancy_pk: makeField(
        "Insufficient human pregnancy safety data; transition to levodopa monotherapy if symptom control is required during pregnancy.",
        W3,
        "Section 6: Dopamine Agonists & Adjuncts",
        "have insufficient human pregnancy safety data (`caution`); dopamine agonists suppress maternal prolactin",
        d.reproductive?.pregnancy_pk
      ),
      mcm: d.reproductive?.mcm || [],
      postpartum: makeField(
        "Dopamine agonists suppress maternal prolactin and inhibit postpartum lactation; switch or maintain levodopa monotherapy if breastfeeding is planned.",
        W3,
        "Section 6: Dopamine Agonists & Adjuncts",
        "dopamine agonists suppress maternal prolactin and inhibit postpartum lactation, so transition to levodopa monotherapy",
        d.reproductive?.postpartum
      ),
      lactation_rid: makeField(pd.rid, LACT3, `LactMed: ${pd.id} — Drug Levels`, pd.ridAnchor, d.reproductive?.lactation_rid),
      lactation_summary: makeField(pd.lact, LACT3, `LactMed: ${pd.id} — Summary of Use during Lactation`, pd.lactAnchor, d.reproductive?.lactation_summary),
    };
    return syncVerificationHash(d);
  });
}

updateDrug("amantadine", (d) => {
  d.reproductive = {
    tier: makeTier(
      "avoid",
      "Teratogenic in animals with human case reports of complex congenital heart defects (single ventricle, truncus arteriosus); avoid in pregnancy.",
      W3,
      "Section 6: Amantadine Teratogenicity",
      "Amantadine is teratogenic in animals and has case reports of complex congenital heart defects",
      d.reproductive?.tier
    ),
    folic_acid: naField(),
    contraception: makeField(
      "Does not reduce hormonal contraceptive efficacy; use effective contraception to switch to safer alternatives before pregnancy.",
      W3,
      "Section 1: Teratogenic Agents Requiring Effective Contraception",
      teratogenContraAnchor,
      d.reproductive?.contraception
    ),
    pregnancy_pk: makeField(
      "Teratogenic in animal studies with human reports of complex cardiac malformations; avoid during pregnancy and switch to safer alternatives prior to conception.",
      W3,
      "Section 6: Amantadine Teratogenicity",
      "Amantadine is teratogenic in animals and has case reports of complex congenital heart defects",
      d.reproductive?.pregnancy_pk
    ),
    mcm: d.reproductive?.mcm || [],
    postpartum: naField(),
    lactation_rid: makeField(
      "Uncharacterized (moderate transfer predicted; suppresses prolactin)",
      LACT3,
      "LactMed: Amantadine — Drug Levels",
      "Human milk levels are uncharacterized, though low molecular weight predicts moderate transfer",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Excreted into human milk in unknown amounts, may cause infant urinary retention, vomiting, or rash, and suppresses maternal prolactin; avoid during breastfeeding.",
      LACT3,
      "LactMed: Amantadine — Summary of Use during Lactation",
      "Amantadine is excreted into breast milk in unknown amounts, may cause infant urinary retention",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// ========== 8. DEMENTIA & COGNITIVE (5) ==========
for (const dem of [
  {
    id: "donepezil",
    pk: "Lacks adequate human pregnancy data (primarily prescribed in older postmenopausal populations); reserve only if clear maternal benefit outweighs unknown fetal risk.",
    rid: "No human breast milk data available",
    ridAnchor: "Human breast milk concentrations and relative infant dose data for donepezil are not available",
    lact: "No human milk data exist and cholinergic toxicity could occur in an infant; avoid breastfeeding or use caution if ever prescribed to a lactating patient.",
    lactAnchor: "Because no information is available on donepezil in human milk and cholinergic toxicity could occur",
  },
  {
    id: "rivastigmine",
    pk: "Lacks adequate human pregnancy data (primarily prescribed in older postmenopausal populations); reserve only if clear maternal benefit outweighs unknown fetal risk.",
    rid: "No human breast milk data available",
    ridAnchor: "Human breast milk concentrations of rivastigmine are unavailable",
    lact: "No human lactation data exist and cholinergic stimulation could cause infant GI or autonomic effects; avoid breastfeeding if ever used.",
    lactAnchor: "No human lactation data exist for rivastigmine; because cholinergic stimulation could cause infant GI",
  },
  {
    id: "memantine",
    pk: "Lacks adequate human pregnancy data (primarily prescribed in older postmenopausal populations); reserve only if clear maternal benefit outweighs unknown fetal risk.",
    rid: "No human breast milk data available",
    ridAnchor: "No human breast milk concentration data exist for memantine",
    lact: "Milk excretion and infant neurodevelopmental effects are unstudied; exercise caution or avoid breastfeeding if ever administered to a nursing mother.",
    lactAnchor: "Because memantine milk excretion and infant neurodevelopmental effects are completely unstudied",
  },
  {
    id: "lecanemab",
    pk: "Anti-amyloid IgG1 monoclonal antibody lacking adequate human pregnancy data (indicated in older adults); crosses the placenta via FcRn in late pregnancy with prolonged washout considerations.",
    rid: "Estimated < 0.1% (large IgG1 monoclonal antibody)",
    ridAnchor: "Large IgG1 monoclonal antibody (~150 kDa) with no human milk measurements",
    lact: "Clinical lactation data are unavailable (indicated in Alzheimer's disease); minimal milk transfer and infant GI degradation are expected.",
    lactAnchor: "Clinical lactation data are unavailable for lecanemab (indicated in Alzheimer's disease)",
  },
  {
    id: "donanemab",
    pk: "Anti-amyloid IgG1 monoclonal antibody lacking adequate human pregnancy data (indicated in older adults); crosses the placenta via FcRn in late pregnancy with prolonged washout considerations.",
    rid: "Estimated < 0.1% (large IgG1 monoclonal antibody)",
    ridAnchor: "Large IgG1 monoclonal antibody (~148 kDa) with no human milk measurements",
    lact: "No clinical lactation data exist (used almost exclusively in older adults); minimal milk excretion and oral infant absorption are expected.",
    lactAnchor: "No clinical lactation data exist for donanemab (used almost exclusively in older adults)",
  },
]) {
  updateDrug(dem.id, (d) => {
    d.reproductive = {
      tier: d.reproductive?.tier || { value: "caution", refs: [] },
      folic_acid: naField(),
      contraception: naField(),
      pregnancy_pk: makeField(
        dem.pk,
        W3,
        "Section 6: Dementia Therapies",
        "lack adequate human pregnancy data (`caution` — largely indicated in older postmenopausal populations)",
        d.reproductive?.pregnancy_pk
      ),
      mcm: d.reproductive?.mcm || [],
      postpartum: naField(),
      lactation_rid: makeField(dem.rid, LACT3, `LactMed: ${dem.id} — Drug Levels`, dem.ridAnchor, d.reproductive?.lactation_rid),
      lactation_summary: makeField(dem.lact, LACT3, `LactMed: ${dem.id} — Summary of Use during Lactation`, dem.lactAnchor, d.reproductive?.lactation_summary),
    };
    return syncVerificationHash(d);
  });
}

console.log("=== WAVE 3 COMPLETE (62/62 DRUGS) ===");
