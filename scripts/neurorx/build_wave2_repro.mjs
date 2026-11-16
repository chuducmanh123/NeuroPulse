import { getQuote, updateDrug } from "./enhance_common.mjs";
import { computeContentHashSync } from "../../src/lib/neurorx/integrity.ts";

const W2 = "neuro-repro-wave2-guidelines";
const LACT2 = "lactmed-wave2";

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

console.log("=== WAVE 2: PREGNANCY & LACTATION ENRICHMENT (24 DRUGS) ===");

// ================= HEADACHE & PAIN (10 DRUGS) =================

// 1. ACETAMINOPHEN
updateDrug("acetaminophen", (d) => {
  d.reproductive = {
    tier: makeTier(
      "preferred",
      "Preferred first-line acute analgesic and antipyretic throughout all trimesters of pregnancy; large Nordic cohort (n=26,424) confirmed no elevation in major congenital malformations.",
      W2,
      "Section 2: Acetaminophen Preferred First-Line & Registry",
      "Acetaminophen is the preferred first-line acute analgesic and antipyretic throughout all trimesters of pregnancy",
      d.reproductive?.tier
    ),
    folic_acid: naField(),
    contraception: makeField(
      "No CYP-mediated interaction with hormonal contraceptives; standard family planning applies.",
      W2,
      "Section 1: Analgesics Without Contraceptive Interactions",
      "These medications do not induce CYP3A4 or UGT metabolism of hormonal contraceptives",
      d.reproductive?.contraception
    ),
    pregnancy_pk: makeField(
      "Pregnancy modestly increases glucuronidation clearance, though standard therapeutic dosing (max 3,000–4,000 mg/day) applies without routine TDM.",
      W2,
      "Section 2: Acetaminophen Pregnancy PK",
      "Pregnancy slightly increases acetaminophen glucuronidation clearance, though standard therapeutic dosing",
      d.reproductive?.pregnancy_pk
    ),
    mcm: [
      makeMcm(
        "Danish & Norwegian National Birth Cohort Registry",
        3.1,
        "2.9%–3.3%",
        26424,
        "first-trimester exposure",
        W2,
        "Section 2: Acetaminophen Preferred First-Line & Registry",
        "Danish and Norwegian National Birth Cohort data reported major congenital malformations in 3.1%"
      ),
    ],
    postpartum: naField(),
    lactation_rid: makeField(
      "1% to 4% of the weight-adjusted maternal dosage",
      LACT2,
      "LactMed: Acetaminophen — Drug Levels",
      "Maternal doses of 1,000 to 1,300 mg yield a relative infant dose of 1% to 4%",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Preferred first-line analgesic/antipyretic during breastfeeding (RID 1%–4%) with negligible infant serum levels; no interruption of nursing is required.",
      LACT2,
      "LactMed: Acetaminophen — Summary of Use during Lactation",
      "Acetaminophen is a preferred first-line analgesic and antipyretic during breastfeeding (RID 1% to 4%)",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 2. SUMATRIPTAN
updateDrug("sumatriptan", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || { value: "caution", refs: [] },
    folic_acid: naField(),
    contraception: makeField(
      "Does not alter hormonal contraceptive efficacy; standard family planning applies.",
      W2,
      "Section 1: Analgesics Without Contraceptive Interactions",
      "These medications do not induce CYP3A4 or UGT metabolism of hormonal contraceptives",
      d.reproductive?.contraception
    ),
    pregnancy_pk: makeField(
      "Oral sumatriptan absorption may be delayed during migraine-associated gastroparesis; standard acute migraine dosing applies without routine TDM.",
      W2,
      "Section 2: Sumatriptan Registry & PK",
      "oral absorption may be delayed by migraine-associated gastroparesis, and standard acute dosing requires no TDM",
      d.reproductive?.pregnancy_pk
    ),
    mcm: [
      makeMcm(
        "Sumatriptan, Naratriptan & Treximet Pregnancy Registry",
        4.2,
        "2.6%–6.5%",
        528,
        "first-trimester exposure",
        W2,
        "Section 2: Sumatriptan Registry & PK",
        "The Sumatriptan, Naratriptan, and Treximet Pregnancy Registry recorded major congenital malformations in 4.2%"
      ),
    ],
    postpartum: naField(),
    lactation_rid: makeField(
      "0.5% to 3.5% of the weight-adjusted maternal dosage",
      LACT2,
      "LactMed: Sumatriptan — Drug Levels",
      "Subcutaneous or oral maternal sumatriptan produces a low relative infant dose of 0.5% to 3.5%",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Low breast milk transfer (RID 0.5%–3.5%) with poor infant oral bioavailability (~15%); generally compatible with breastfeeding for acute migraine (optional 8–12 h wait in neonates).",
      LACT2,
      "LactMed: Sumatriptan — Summary of Use during Lactation",
      "Sumatriptan milk transfer is low (RID <= 3.5%) with poor oral bioavailability (~15%) in the infant",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 3. ERENUMAB
updateDrug("erenumab", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || { value: "caution", refs: [] },
    folic_acid: naField(),
    contraception: makeField(
      "No interaction with combined oral contraceptives; discontinue erenumab (~28-day half-life) at least 5 to 6 months prior to planned conception per AHS headache guidelines.",
      W2,
      "Section 1: Erenumab Contraception & Washout",
      "Erenumab is an IgG2 anti-CGRP receptor monoclonal antibody (~28-day half-life) with no interaction with combined oral contraceptives",
      d.reproductive?.contraception
    ),
    pregnancy_pk: makeField(
      "IgG2 monoclonal antibody with increasing transplacental transfer via FcRn during the 2nd and 3rd trimesters; human data are limited and CGRP blockade raises theoretical concern for gestational hypertension.",
      W2,
      "Section 2: Erenumab Pregnancy Safety & PK",
      "Erenumab is an IgG2 monoclonal antibody that crosses the placenta increasingly via FcRn during the second and third trimesters",
      d.reproductive?.pregnancy_pk
    ),
    mcm: d.reproductive?.mcm || [],
    postpartum: naField(),
    lactation_rid: makeField(
      "Estimated < 0.5% of the weight-adjusted maternal dosage (IgG2 mAb)",
      LACT2,
      "LactMed: Erenumab — Drug Levels",
      "Large IgG2 monoclonal antibody (~150 kDa) with estimated relative infant dose below 0.5%",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Large IgG2 monoclonal antibody with minimal expected transfer into mature breast milk (estimated RID < 0.5%) and GI proteolytic degradation; use caution in newborns/preterm infants while monitoring feeding and growth.",
      LACT2,
      "LactMed: Erenumab — Summary of Use during Lactation",
      "Although clinical milk data for erenumab are limited, large monoclonal antibodies transfer poorly into mature breast milk",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 4. RIMEGEPANT
updateDrug("rimegepant", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || { value: "caution", refs: [] },
    folic_acid: naField(),
    contraception: makeField(
      "Does not alter ethinylestradiol or norelgestromin exposure from oral contraceptives; a short washout of 5 to 7 days (~11-hour half-life) prior to planned conception is reasonable.",
      W2,
      "Section 1: Rimegepant Contraception & Washout",
      "Rimegepant does not reduce ethinylestradiol or norelgestromin exposure from oral contraceptives; due to its ~11-hour elimination half-life",
      d.reproductive?.contraception
    ),
    pregnancy_pk: makeField(
      "Human pregnancy data are insufficient to exclude fetal risk; because CGRP regulates uteroplacental blood flow, discontinue during pregnancy unless maternal benefit justifies potential risk.",
      W2,
      "Section 2: Rimegepant Pregnancy Safety & PK",
      "Human pregnancy outcome data for rimegepant are insufficient to exclude fetal risk; because CGRP signaling regulates uteroplacental blood flow",
      d.reproductive?.pregnancy_pk
    ),
    mcm: d.reproductive?.mcm || [],
    postpartum: naField(),
    lactation_rid: makeField(
      "0.5% to 0.8% of the weight-adjusted maternal dosage",
      LACT2,
      "LactMed: Rimegepant — Drug Levels",
      "Single-dose pharmacokinetic studies in lactating women demonstrate a low relative infant dose of 0.5% to 0.8%",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Enters human milk in very low concentrations (RID 0.5%–0.8%) after a single 75 mg dose; monitor infant feeding adequacy or optionally discard milk for 12–24 hours in young neonates.",
      LACT2,
      "LactMed: Rimegepant — Summary of Use during Lactation",
      "Rimegepant enters breast milk in very low quantities (RID < 1%) after single 75 mg doses",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 5. AMITRIPTYLINE
updateDrug("amitriptyline", (d) => {
  d.reproductive = {
    tier: makeTier(
      "caution",
      "Observational cohort data (n=1,662, 2.6% MCM) show no major teratogenic signal; reserve for clear maternal indication and monitor neonates if used in the third trimester.",
      W2,
      "Section 2: Amitriptyline Registry & PK",
      "The Swedish Medical Birth Register and OTIS Tricyclic Cohort reported major congenital malformations in 2.6%",
      d.reproductive?.tier
    ),
    folic_acid: naField(),
    contraception: makeField(
      "Does not induce CYP3A4 or reduce hormonal contraceptive efficacy; standard family planning applies.",
      W2,
      "Section 1: Analgesics Without Contraceptive Interactions",
      "These medications do not induce CYP3A4 or UGT metabolism of hormonal contraceptives",
      d.reproductive?.contraception
    ),
    pregnancy_pk: makeField(
      "CYP2D6 induction during pregnancy may modestly lower plasma levels; 3rd-trimester exposure requires monitoring newborns for transient anticholinergic or withdrawal symptoms.",
      W2,
      "Section 2: Amitriptyline Registry & PK",
      "CYP2D6 induction during pregnancy may modestly lower plasma levels, and third-trimester exposure requires monitoring neonates",
      d.reproductive?.pregnancy_pk
    ),
    mcm: [
      makeMcm(
        "Swedish Medical Birth Register & OTIS Cohort",
        2.6,
        "1.9%–3.5%",
        1662,
        "first-trimester exposure",
        W2,
        "Section 2: Amitriptyline Registry & PK",
        "The Swedish Medical Birth Register and OTIS Tricyclic Cohort reported major congenital malformations in 2.6%"
      ),
    ],
    postpartum: makeField(
      "If dosage was increased in late pregnancy, taper back toward pre-pregnancy maintenance levels over 1 to 2 weeks postpartum as CYP2D6 normalizes to minimize maternal sedation.",
      W2,
      "Section 2: Amitriptyline Postpartum",
      "If amitriptyline dosage was increased in late pregnancy, taper back toward pre-pregnancy maintenance levels over 1 to 2 weeks postpartum",
      d.reproductive?.postpartum
    ),
    lactation_rid: makeField(
      "1% to 2.8% of the weight-adjusted maternal dosage",
      LACT2,
      "LactMed: Amitriptyline — Drug Levels",
      "Breastfed infants receive approximately 1% to 2.8% of the weight-adjusted maternal amitriptyline plus nortriptyline dosage",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Low milk transfer (RID 1%–2.8%) with usually undetectable infant serum levels; generally compatible with breastfeeding while monitoring newborns for drowsiness, poor feeding, or anticholinergic signs.",
      LACT2,
      "LactMed: Amitriptyline — Summary of Use during Lactation",
      "Amitriptyline milk transfer is low (RID 1% to 2.8%) and infant serum concentrations are usually undetectable or very low",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 6. DULOXETINE
updateDrug("duloxetine", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || { value: "caution", refs: [] },
    folic_acid: naField(),
    contraception: makeField(
      "Does not alter hormonal contraceptive metabolism or efficacy.",
      W2,
      "Section 1: Analgesics Without Contraceptive Interactions",
      "These medications do not induce CYP3A4 or UGT metabolism of hormonal contraceptives",
      d.reproductive?.contraception
    ),
    pregnancy_pk: makeField(
      "Pregnancy clearance increases modestly; late-pregnancy exposure carries a small risk of postpartum hemorrhage and transient neonatal adaptation syndrome.",
      W2,
      "Section 2: Duloxetine Registry & PK",
      "late-pregnancy exposure carries a small risk of postpartum hemorrhage and transient neonatal adaptation syndrome, while pregnancy clearance increases modestly",
      d.reproductive?.pregnancy_pk
    ),
    mcm: [
      makeMcm(
        "Lilly & Nordic National Pregnancy Cohort",
        2.8,
        "2.1%–3.7%",
        2132,
        "first-trimester monotherapy",
        W2,
        "Section 2: Duloxetine Registry & PK",
        "Lilly surveillance and Nordic National Pregnancy Cohort data reported major congenital malformations in 2.8%"
      ),
    ],
    postpartum: makeField(
      "Monitor newborns exposed in the 3rd trimester for transient neonatal adaptation signs (jitteriness, poor feeding, tachypnea) for 48 hours and return any escalated maternal dose to baseline.",
      W2,
      "Section 2: Duloxetine Postpartum",
      "Monitor newborns exposed in the third trimester for transient neonatal adaptation signs (jitteriness, poor feeding, tachypnea)",
      d.reproductive?.postpartum
    ),
    lactation_rid: makeField(
      "0.1% to 1.1% of the weight-adjusted maternal dosage",
      LACT2,
      "LactMed: Duloxetine — Drug Levels",
      "Breastfed infants receive approximately 0.1% to 1.1% of the weight-adjusted maternal duloxetine dosage",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Very low breast milk excretion (RID <= 1.1%) with low or undetectable infant serum levels; generally compatible with breastfeeding while monitoring for drowsiness, irritability, and weight gain.",
      LACT2,
      "LactMed: Duloxetine — Summary of Use during Lactation",
      "Duloxetine excretion into breast milk is very low (RID <= 1.1%) with low or undetectable infant serum levels",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 7. IBUPROFEN
updateDrug("ibuprofen", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || { value: "avoid", refs: [] },
    folic_acid: naField(),
    contraception: makeField(
      "Does not interact with hormonal contraceptives, though chronic periconceptional COX inhibition can reversibly delay ovulation and impair implantation.",
      W2,
      "Section 1: NSAIDs Periconceptional Contraception & Ovulation",
      "Nonsteroidal anti-inflammatory drugs do not interact with hormonal contraceptives, though chronic periconceptional COX inhibition can reversibly delay ovulation",
      d.reproductive?.contraception
    ),
    pregnancy_pk: makeField(
      "Avoid at >= 20 weeks gestation (fetal renal dysfunction/oligohydramnios) and strictly contraindicated at >= 30 weeks (premature closure of fetal ductus arteriosus).",
      W2,
      "Section 2: Ibuprofen & Celecoxib Pregnancy Warning",
      "Both ibuprofen and celecoxib must be avoided from 20 weeks gestation onward due to fetal renal dysfunction and oligohydramnios",
      d.reproductive?.pregnancy_pk
    ),
    mcm: d.reproductive?.mcm || [],
    postpartum: naField(),
    lactation_rid: makeField(
      "0.1% to 0.7% of the weight-adjusted maternal dosage",
      LACT2,
      "LactMed: Ibuprofen — Drug Levels",
      "Maternal ibuprofen doses up to 1,600 to 2,400 mg/day result in an extremely low relative infant dose of 0.1% to 0.7%",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Preferred short-acting NSAID during breastfeeding due to extremely low milk transfer (RID < 1%), short half-life, and no active metabolites; no waiting period needed.",
      LACT2,
      "LactMed: Ibuprofen — Summary of Use during Lactation",
      "Ibuprofen is a preferred short-acting NSAID during breastfeeding because of its extremely low milk transfer (RID < 1%)",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 8. CELECOXIB
updateDrug("celecoxib", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || { value: "avoid", refs: [] },
    folic_acid: naField(),
    contraception: makeField(
      "Does not alter hormonal contraceptive efficacy, though chronic periconceptional COX-2 inhibition may reversibly delay ovulation; discontinue if difficulty conceiving.",
      W2,
      "Section 1: NSAIDs Periconceptional Contraception & Ovulation",
      "Nonsteroidal anti-inflammatory drugs do not interact with hormonal contraceptives, though chronic periconceptional COX inhibition can reversibly delay ovulation",
      d.reproductive?.contraception
    ),
    pregnancy_pk: makeField(
      "Avoid from 20 weeks gestation onward (fetal renal dysfunction/oligohydramnios) and strictly contraindicated at >= 30 weeks (premature closure of fetal ductus arteriosus).",
      W2,
      "Section 2: Ibuprofen & Celecoxib Pregnancy Warning",
      "Both ibuprofen and celecoxib must be avoided from 20 weeks gestation onward due to fetal renal dysfunction and oligohydramnios",
      d.reproductive?.pregnancy_pk
    ),
    mcm: d.reproductive?.mcm || [],
    postpartum: naField(),
    lactation_rid: makeField(
      "0.2% to 0.4% of the weight-adjusted maternal dosage",
      LACT2,
      "LactMed: Celecoxib — Drug Levels",
      "Maternal celecoxib doses of 200 mg/day yield a very low relative infant dose of 0.2% to 0.4%",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Passes into breast milk in tiny quantities (RID < 0.5%) due to ~97% protein binding with no reported adverse effects in breastfed infants; acceptable for short-term postpartum analgesia.",
      LACT2,
      "LactMed: Celecoxib — Summary of Use during Lactation",
      "Celecoxib passes into breast milk in tiny quantities (RID < 0.5%) due to high maternal protein binding (~97%)",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 9. TRAMADOL
updateDrug("tramadol", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || { value: "avoid", refs: [] },
    folic_acid: naField(),
    contraception: makeField(
      "Does not induce hepatic metabolism of hormonal contraceptives; standard family planning applies.",
      W2,
      "Section 1: Analgesics Without Contraceptive Interactions",
      "These medications do not induce CYP3A4 or UGT metabolism of hormonal contraceptives",
      d.reproductive?.contraception
    ),
    pregnancy_pk: makeField(
      "Avoid chronic or peripartum tramadol use due to risk of life-threatening neonatal opioid withdrawal syndrome (NOWS) and neonatal respiratory depression.",
      W2,
      "Section 2: Tramadol Registry & Peripartum Risk",
      "chronic or peripartum tramadol use should be avoided due to neonatal opioid withdrawal syndrome and neonatal respiratory depression",
      d.reproductive?.pregnancy_pk
    ),
    mcm: [
      makeMcm(
        "Swedish Medical Birth Register",
        3.5,
        "2.6%–4.5%",
        1751,
        "first-trimester exposure",
        W2,
        "Section 2: Tramadol Registry & Peripartum Risk",
        "The Swedish Medical Birth Register reported major congenital malformations in 3.5%"
      ),
    ],
    postpartum: makeField(
      "Avoid prolonged postpartum tramadol while breastfeeding (especially in CYP2D6 ultrarapid metabolizers) and taper maternal dose promptly once acute post-delivery pain resolves.",
      W2,
      "Section 2: Tramadol Postpartum",
      "Avoid prolonged postpartum tramadol use while breastfeeding, especially in CYP2D6 ultrarapid metabolizers",
      d.reproductive?.postpartum
    ),
    lactation_rid: makeField(
      "2.2% to 2.9% of the weight-adjusted maternal dosage",
      LACT2,
      "LactMed: Tramadol — Drug Levels",
      "Combined transfer of tramadol and its active O-desmethyltramadol metabolite yields a relative infant dose of 2.2% to 2.9%",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Not recommended during breastfeeding (FDA/LactMed warning) due to CYP2D6 ultrarapid metabolizer variability risking fatal neonatal respiratory depression from O-desmethyltramadol; prefer ibuprofen or acetaminophen.",
      LACT2,
      "LactMed: Tramadol — Summary of Use during Lactation",
      "Due to CYP2D6 ultrarapid metabolizer variability risking fatal neonatal respiratory depression from O-desmethyltramadol, the FDA and LactMed warn that tramadol is not recommended during breastfeeding",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 10. METOPROLOL
updateDrug("metoprolol", (d) => {
  d.reproductive = {
    tier: makeTier(
      "preferred",
      "Preferred beta-blocker during pregnancy when beta-blockade is clinically indicated for migraine prophylaxis or cardiovascular control; large Nordic/Medicaid cohort (n=4,890) found no teratogenic signal.",
      W2,
      "Section 2: Metoprolol Preferred Beta-Blocker & Registry",
      "Metoprolol is a preferred beta-blocker for migraine prophylaxis or maternal cardiovascular indications during pregnancy",
      d.reproductive?.tier
    ),
    folic_acid: naField(),
    contraception: makeField(
      "Does not alter hormonal contraceptive efficacy; standard family planning applies.",
      W2,
      "Section 1: Analgesics Without Contraceptive Interactions",
      "These medications do not induce CYP3A4 or UGT metabolism of hormonal contraceptives",
      d.reproductive?.contraception
    ),
    pregnancy_pk: makeField(
      "CYP2D6-mediated clearance increases 2- to 4-fold during the 2nd and 3rd trimesters (often requiring higher divided doses); monitor 3rd-trimester fetal growth and neonatal bradycardia/hypoglycemia.",
      W2,
      "Section 2: Metoprolol Pregnancy PK & Postpartum",
      "CYP2D6-mediated metoprolol clearance increases markedly (2- to 4-fold) during the second and third trimesters",
      d.reproductive?.pregnancy_pk
    ),
    mcm: [
      makeMcm(
        "Nordic & Medicaid Beta-Blocker Cohort",
        3.2,
        "2.7%–3.8%",
        4890,
        "first-trimester exposure",
        W2,
        "Section 2: Metoprolol Preferred Beta-Blocker & Registry",
        "Nordic and Medicaid Beta-Blocker Cohort data reported major congenital malformations in 3.2%"
      ),
    ],
    postpartum: makeField(
      "CYP2D6 activity normalizes quickly after delivery; reduce pregnancy-escalated doses promptly postpartum to prevent maternal bradycardia and hypotension.",
      W2,
      "Section 2: Metoprolol Pregnancy PK & Postpartum",
      "reduce pregnancy-escalated doses promptly postpartum to prevent maternal bradycardia and hypotension",
      d.reproductive?.postpartum
    ),
    lactation_rid: makeField(
      "0.5% to 2.1% of the weight-adjusted maternal dosage",
      LACT2,
      "LactMed: Metoprolol — Drug Levels",
      "Breastfed infants receive approximately 0.5% to 2.1% of the weight-adjusted maternal metoprolol dosage",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Low milk transfer (RID 0.5%–2.1%) and rarely causes adverse events in healthy term infants; monitor nursing newborns for rare beta-blockade signs (bradycardia, lethargy, poor feeding).",
      LACT2,
      "LactMed: Metoprolol — Summary of Use during Lactation",
      "Metoprolol passes into breast milk in small amounts (RID < 2.5%) and rarely causes adverse events in healthy term infants",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// ================= NEUROIMMUNOLOGY & NEUROMUSCULAR (14 DRUGS) =================

// 11. PYRIDOSTIGMINE
updateDrug("pyridostigmine", (d) => {
  d.reproductive = {
    tier: makeTier(
      "preferred",
      "Preferred first-line symptomatic therapy for myasthenia gravis throughout pregnancy per MGFA international consensus guidelines.",
      W2,
      "Section 2: Pyridostigmine Preferred MG Therapy & PK",
      "Pyridostigmine is the preferred first-line symptomatic treatment for myasthenia gravis throughout pregnancy",
      d.reproductive?.tier
    ),
    folic_acid: naField(),
    contraception: makeField(
      "Does not impair hormonal contraceptive efficacy.",
      W2,
      "Section 1: Myasthenia & Spasticity Agents Contraception Note",
      "Systemic corticosteroids, pyridostigmine, IVIG, and oral muscle relaxants do not impair hormonal contraceptive efficacy",
      d.reproductive?.contraception
    ),
    pregnancy_pk: makeField(
      "Expanded blood volume, increased renal clearance, and delayed gastric emptying in the 2nd/3rd trimesters often require dose escalation or shorter intervals; avoid IV cholinesterase inhibitors near term (uterine contractions).",
      W2,
      "Section 2: Pyridostigmine Preferred MG Therapy & PK",
      "expanded maternal blood volume, increased renal clearance, and delayed gastric emptying in the second and third trimesters frequently require dose escalation",
      d.reproductive?.pregnancy_pk
    ),
    mcm: d.reproductive?.mcm || [],
    postpartum: makeField(
      "Requirements often fluctuate sharply immediately postpartum; monitor myasthenic strength closely, adjust back toward pre-pregnancy oral dosing, and watch newborns for transient neonatal myasthenia gravis.",
      W2,
      "Section 2: Pyridostigmine Postpartum",
      "Maternal pyridostigmine requirements often fluctuate sharply in the immediate postpartum period",
      d.reproductive?.postpartum
    ),
    lactation_rid: makeField(
      "0.04% to 0.1% of the weight-adjusted maternal dosage",
      LACT2,
      "LactMed: Pyridostigmine — Drug Levels",
      "Maternal oral pyridostigmine doses of 180 to 300 mg/day produce a low relative infant dose of 0.04% to 0.1%",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Minimal transfer into human milk (RID <= 0.1%) with undetectable infant plasma levels; compatible with breastfeeding in myasthenia gravis while observing infants for rare GI upset.",
      LACT2,
      "LactMed: Pyridostigmine — Summary of Use during Lactation",
      "Pyridostigmine transfer into human milk is minimal (RID <= 0.1%) and breastfed infants have undetectable plasma levels",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 12. PREDNISOLONE
updateDrug("prednisolone", (d) => {
  d.reproductive = {
    tier: makeTier(
      "caution",
      "Preferred systemic corticosteroid in pregnancy when maternal immunosuppression is needed (~88%–90% inactivated by placental 11-beta-HSD2); UKTIS/OTIS cohort showed 3.4% MCM (n=1,427).",
      W2,
      "Section 2: Prednisolone & Methylprednisolone Registry & PK",
      "Non-fluorinated corticosteroids (prednisolone and methylprednisolone) undergo ~88%–90% placental inactivation",
      d.reproductive?.tier
    ),
    folic_acid: naField(),
    contraception: makeField(
      "Does not reduce hormonal contraceptive efficacy.",
      W2,
      "Section 1: Myasthenia & Spasticity Agents Contraception Note",
      "Systemic corticosteroids, pyridostigmine, IVIG, and oral muscle relaxants do not impair hormonal contraceptive efficacy",
      d.reproductive?.contraception
    ),
    pregnancy_pk: makeField(
      "Inactivated (~88%–90%) by placental 11-beta-HSD2, limiting fetal exposure; screen for gestational diabetes and hypertension during therapy.",
      W2,
      "Section 2: Prednisolone & Methylprednisolone Registry & PK",
      "Non-fluorinated corticosteroids (prednisolone and methylprednisolone) undergo ~88%–90% placental inactivation",
      d.reproductive?.pregnancy_pk
    ),
    mcm: [
      makeMcm(
        "UKTIS & OTIS Corticosteroid Cohort",
        3.4,
        "2.5%–4.5%",
        1427,
        "first-trimester systemic exposure",
        W2,
        "Section 2: Prednisolone & Methylprednisolone Registry & PK",
        "UKTIS and OTIS cohorts reported major congenital malformations in 3.4%"
      ),
    ],
    postpartum: makeField(
      "Taper high-dose relapse steroids cautiously postpartum (accounting for frequent postpartum autoimmune rebound flares in MG, MS, and NMOSD) and ensure stress-dose coverage during delivery if chronically suppressed.",
      W2,
      "Section 2: Prednisolone & Methylprednisolone Postpartum",
      "postpartum, taper high-dose relapse steroids cautiously (keeping in mind that postpartum rebound flares",
      d.reproductive?.postpartum
    ),
    lactation_rid: makeField(
      "0.5% to 2.6% of the weight-adjusted maternal dosage",
      LACT2,
      "LactMed: Prednisolone — Drug Levels",
      "Maternal oral prednisolone doses up to 80 mg/day result in a low relative infant dose of 0.5% to 2.6%",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Preferred systemic corticosteroid during lactation due to low milk transfer (RID 0.5%–2.6%); doses <= 20 mg/day need no waiting period, and a 4-hour wait after higher doses further minimizes infant exposure.",
      LACT2,
      "LactMed: Prednisolone — Summary of Use during Lactation",
      "Prednisolone is the preferred systemic corticosteroid during lactation due to low milk levels (RID 0.5% to 2.6%)",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 13. METHYLPREDNISOLONE
updateDrug("methylprednisolone", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || { value: "caution", refs: [] },
    folic_acid: naField(),
    contraception: makeField(
      "Does not impair hormonal contraceptive efficacy.",
      W2,
      "Section 1: Myasthenia & Spasticity Agents Contraception Note",
      "Systemic corticosteroids, pyridostigmine, IVIG, and oral muscle relaxants do not impair hormonal contraceptive efficacy",
      d.reproductive?.contraception
    ),
    pregnancy_pk: makeField(
      "Non-fluorinated corticosteroid largely inactivated (~88%–90%) by placental 11-beta-HSD2, making it preferred for acute MS/NMOSD/MG relapses in pregnancy; monitor maternal glucose and blood pressure.",
      W2,
      "Section 2: Prednisolone & Methylprednisolone Registry & PK",
      "Non-fluorinated corticosteroids (prednisolone and methylprednisolone) undergo ~88%–90% placental inactivation",
      d.reproductive?.pregnancy_pk
    ),
    mcm: [
      makeMcm(
        "UKTIS & OTIS Corticosteroid Cohort (class)",
        3.4,
        "2.5%–4.5%",
        1427,
        "first-trimester systemic exposure",
        W2,
        "Section 2: Prednisolone & Methylprednisolone Registry & PK",
        "UKTIS and OTIS cohorts reported major congenital malformations in 3.4%"
      ),
    ],
    postpartum: makeField(
      "Taper high-dose pulse/oral steroids cautiously postpartum due to high risk of autoimmune relapse in MS, NMOSD, and MG; provide intrapartum stress-dose steroids if adrenal-suppressed.",
      W2,
      "Section 2: Prednisolone & Methylprednisolone Postpartum",
      "postpartum, taper high-dose relapse steroids cautiously (keeping in mind that postpartum rebound flares",
      d.reproductive?.postpartum
    ),
    lactation_rid: makeField(
      "0.2% to 1.5% of the weight-adjusted maternal dosage",
      LACT2,
      "LactMed: Methylprednisolone — Drug Levels",
      "Standard oral or pulse IV methylprednisolone yields a relative infant dose of 0.2% to 1.5%",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Low milk transfer (RID 0.2%–1.5%, below physiological infant cortisol output); for high-dose IV pulse therapy (e.g. 1,000 mg/day), delaying nursing 2–4 hours post-infusion minimizes already low exposure.",
      LACT2,
      "LactMed: Methylprednisolone — Summary of Use during Lactation",
      "Methylprednisolone milk transfer is low (RID 0.2% to 1.5%); for high-dose IV pulse therapy",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 14. DEXAMETHASONE
updateDrug("dexamethasone", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || { value: "caution", refs: [] },
    folic_acid: naField(),
    contraception: makeField(
      "Does not impair hormonal contraceptive efficacy.",
      W2,
      "Section 1: Myasthenia & Spasticity Agents Contraception Note",
      "Systemic corticosteroids, pyridostigmine, IVIG, and oral muscle relaxants do not impair hormonal contraceptive efficacy",
      d.reproductive?.contraception
    ),
    pregnancy_pk: makeField(
      "Fluorinated corticosteroid minimally inactivated by placental 11-beta-HSD2, crossing freely to the fetus; reserve systemic maternal use for acute CNS edema or fetal lung maturation for shortest duration.",
      W2,
      "Section 2: Dexamethasone Placental Transfer & PK",
      "Unlike prednisolone, dexamethasone is a fluorinated corticosteroid that is minimally metabolized by placental 11-beta-HSD2",
      d.reproductive?.pregnancy_pk
    ),
    mcm: d.reproductive?.mcm || [],
    postpartum: naField(),
    lactation_rid: makeField(
      "Estimated < 2% of the weight-adjusted maternal dosage (short courses)",
      LACT2,
      "LactMed: Dexamethasone — Drug Levels",
      "High maternal plasma protein binding and moderate dose regimens result in minimal breast milk transfer (estimated RID < 2%",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Short courses or single doses are unlikely to affect breastfed infants; for prolonged high-dose maternal therapy, prednisolone is preferred, or wait 4 hours after an IV bolus.",
      LACT2,
      "LactMed: Dexamethasone — Summary of Use during Lactation",
      "Short courses or single maternal doses of dexamethasone are unlikely to affect breastfed infants",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 15. AZATHIOPRINE
updateDrug("azathioprine", (d) => {
  d.reproductive = {
    tier: makeTier(
      "caution",
      "FDA label notes contraindication in rheumatoid arthritis, whereas MGFA/ECTRIMS/Autoimmune Pregnancy Registry data (3.6% MCM, n=1,148) support cautious continuation when required for maternal MG or NMOSD control.",
      W2,
      "Section 2: Azathioprine Registry & PK",
      "Azathioprine is an acceptable steroid-sparing maintenance immunosuppressant during pregnancy in severe myasthenia gravis or NMOSD",
      d.reproductive?.tier
    ),
    folic_acid: makeField(
      "Standard preconception folic acid supplementation (0.4 to 1 mg/day) is recommended for women of childbearing potential with autoimmune neurological disease.",
      W2,
      "Section 1: Azathioprine Folic Acid & Contraception",
      "Azathioprine does not reduce hormonal contraceptive efficacy, and standard preconception folic acid supplementation (0.4 to 1 mg/day)",
      d.reproductive?.folic_acid
    ),
    contraception: makeField(
      "Does not reduce hormonal contraceptive efficacy; maintain reliable contraception if pregnancy is not planned.",
      W2,
      "Section 1: Azathioprine Folic Acid & Contraception",
      "Azathioprine does not reduce hormonal contraceptive efficacy",
      d.reproductive?.contraception
    ),
    pregnancy_pk: makeField(
      "Fetal liver lacks inosinate pyrophosphorylase to generate active 6-TG; maternal 6-TGN may decline while 6-MMP rises slightly, so monitor maternal CBC and transaminases regularly.",
      W2,
      "Section 2: Azathioprine Pregnancy Monitoring & Postpartum",
      "Monitor maternal CBC and liver transaminases regularly during pregnancy (6-TGN levels may decrease while 6-MMP increases slightly)",
      d.reproductive?.pregnancy_pk
    ),
    mcm: [
      makeMcm(
        "Transplant & Autoimmune Pregnancy Registry",
        3.6,
        "2.6%–4.9%",
        1148,
        "first-trimester exposure",
        W2,
        "Section 2: Azathioprine Registry & PK",
        "Transplant and Autoimmune Pregnancy Registry data reported major congenital malformations in 3.6%"
      ),
    ],
    postpartum: makeField(
      "Continue stable maintenance dosing postpartum to prevent autoimmune relapse; check neonatal blood counts if late-pregnancy maternal cytopenia occurred.",
      W2,
      "Section 2: Azathioprine Pregnancy Monitoring & Postpartum",
      "continue stable maintenance dosing postpartum to prevent autoimmune relapse while checking neonatal blood counts",
      d.reproductive?.postpartum
    ),
    lactation_rid: makeField(
      "0.1% to 0.9% of the weight-adjusted maternal dosage",
      LACT2,
      "LactMed: Azathioprine — Drug Levels",
      "Measurement of active mercaptopurine metabolites in breast milk indicates a very low relative infant dose of 0.1% to 0.9%",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Minimal milk transfer of active metabolites (RID < 1%) with undetectable infant blood levels and no clinical immunosuppression; compatible with breastfeeding (optionally check infant CBC on high maternal doses).",
      LACT2,
      "LactMed: Azathioprine — Summary of Use during Lactation",
      "Azathioprine milk transfer is minimal (RID < 1%) and breastfed infants have undetectable metabolite levels",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 16. MYCOPHENOLATE
updateDrug("mycophenolate", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || { value: "avoid", refs: [] },
    folic_acid: makeField(
      "Major human teratogen requiring two negative pregnancy tests prior to start; supplement high-dose folic acid (4–5 mg/day) if inadvertent exposure occurs (does not eliminate mycophenolate embryopathy).",
      W2,
      "Section 1: Mycophenolate REMS & Folic Acid",
      "Mycophenolate mofetil is a major human teratogen requiring two negative pregnancy tests prior to initiation and high-dose folic acid",
      d.reproductive?.folic_acid
    ),
    contraception: makeField(
      "REMS mandate: use 1 highly effective method (IUD/implant) or 2 complementary methods during therapy and for 6 weeks after cessation in females; male partners avoid fathering children for 90 days post-cessation.",
      W2,
      "Section 1: Mycophenolate Contraception & Washout",
      "Per REMS mandates, females of reproductive potential must use one highly effective contraceptive method (e.g. IUD or implant) or two complementary methods",
      d.reproductive?.contraception
    ),
    pregnancy_pk: makeField(
      "Contraindicated in pregnancy due to severe mycophenolate embryopathy (microtia, clefts, cardiac/esophageal anomalies) and ~45%–49% miscarriage rate; switch to safer alternative (e.g. azathioprine) prior to conception.",
      W2,
      "Section 2: Mycophenolate Registries & PK",
      "Mycophenolate mofetil is contraindicated in pregnancy due to severe embryopathy (microtia, cleft lip/palate, congenital heart and esophageal defects)",
      d.reproductive?.pregnancy_pk
    ),
    mcm: [
      makeMcm(
        "National Transplant Pregnancy Registry (NTPR)",
        23.0,
        "16.0%–31.5%",
        130,
        "first-trimester exposure",
        W2,
        "Section 2: Mycophenolate Registries & PK",
        "National Transplant Pregnancy Registry (NTPR) data showed major malformations in 23.0%"
      ),
      makeMcm(
        "ENTIS Prospective Cohort",
        26.7,
        "15.6%–40.3%",
        56,
        "first-trimester exposure",
        W2,
        "Section 2: Mycophenolate Registries & PK",
        "and the ENTIS cohort reported 26.7% (95% CI: 15.6%–40.3%) of 56 exposures"
      ),
    ],
    postpartum: naField(),
    lactation_rid: makeField(
      "Not quantified in human milk",
      LACT2,
      "LactMed: Mycophenolate — Drug Levels",
      "Clinical human milk transfer measurements for mycophenolate mofetil are lacking (not quantified in human milk)",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Human milk transfer is uncharacterized with potential risks of infant immunosuppression, neutropenia, and GI toxicity; breastfeeding is generally not recommended when safer alternatives exist.",
      LACT2,
      "LactMed: Mycophenolate — Summary of Use during Lactation",
      "Because mycophenolate carries potential risks of severe immunosuppression, neutropenia, and GI toxicity in nursing infants",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 17. RITUXIMAB
updateDrug("rituximab", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || { value: "avoid", refs: [] },
    folic_acid: naField(),
    contraception: makeField(
      "FDA label advises effective contraception during and for 12 months after last infusion; ECTRIMS/EAN consensus allows planned conception 1–3 months post-infusion in active MS/NMOSD when relapse risk is high.",
      W2,
      "Section 1: Rituximab Contraception & Washout",
      "FDA labeling advises effective contraception during rituximab therapy and for 12 months after the last infusion, whereas ECTRIMS/EAN consensus",
      d.reproductive?.contraception
    ),
    pregnancy_pk: makeField(
      "IgG1 monoclonal antibody crosses placenta minimally in 1st trimester but actively via FcRn in 2nd/3rd trimesters, causing transient neonatal B-cell depletion; check neonatal B-cells at birth and delay live vaccines.",
      W2,
      "Section 2: Rituximab Registry, Placental Transfer & Postpartum",
      "because IgG1 crosses the placenta actively in the 2nd/3rd trimesters via FcRn, third-trimester exposure causes transient neonatal B-cell depletion",
      d.reproductive?.pregnancy_pk
    ),
    mcm: [
      makeMcm(
        "Rituximab Global Drug Safety Pregnancy Database",
        2.6,
        "1.0%–5.6%",
        231,
        "pre-conception / first-trimester exposure",
        W2,
        "Section 2: Rituximab Registry, Placental Transfer & Postpartum",
        "The Rituximab Global Drug Safety Pregnancy Database reported major congenital malformations in 2.6%"
      ),
    ],
    postpartum: makeField(
      "Check neonatal lymphocyte/B-cell counts if exposed in 2nd/3rd trimester, delay live infant vaccines until B-cell recovery, and resume maternal rituximab postpartum to prevent NMOSD/MS rebound relapses.",
      W2,
      "Section 2: Rituximab Registry, Placental Transfer & Postpartum",
      "check neonatal B-cell counts at birth, delay live vaccines until B-cell recovery, and resume maternal dosing postpartum",
      d.reproductive?.postpartum
    ),
    lactation_rid: makeField(
      "0.01% to 0.1% of the weight-adjusted maternal dosage",
      LACT2,
      "LactMed: Rituximab — Drug Levels",
      "Large IgG1 monoclonal antibody (~145 kDa) with very low milk excretion (relative infant dose 0.01% to 0.1%",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Extremely low breast milk excretion (RID <= 0.1%) and negligible oral infant absorption; breastfed infants show normal B-cell counts and development, making it compatible with breastfeeding per ECTRIMS/EAN and ACR guidelines.",
      LACT2,
      "LactMed: Rituximab — Summary of Use during Lactation",
      "Rituximab concentrations in breast milk are extremely low (RID <= 0.1%) and breastfed infants show normal peripheral B-cell counts",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 18. IVIG
updateDrug("ivig", (d) => {
  d.reproductive = {
    tier: makeTier(
      "preferred",
      "Preferred immunomodulatory therapy for myasthenia gravis crisis, CIDP, and NMOSD relapses during pregnancy per MGFA/EAN consensus.",
      W2,
      "Section 2: IVIG Preferred Immunomodulation & PK",
      "Intravenous immunoglobulin (IVIG) is a preferred immunomodulatory therapy for myasthenia gravis crisis, CIDP, and NMOSD relapses during pregnancy",
      d.reproductive?.tier
    ),
    folic_acid: naField(),
    contraception: makeField(
      "Does not alter hormonal contraceptive efficacy.",
      W2,
      "Section 1: Myasthenia & Spasticity Agents Contraception Note",
      "Systemic corticosteroids, pyridostigmine, IVIG, and oral muscle relaxants do not impair hormonal contraceptive efficacy",
      d.reproductive?.contraception
    ),
    pregnancy_pk: makeField(
      "Endogenous IgG crosses the placenta via FcRn after 30–32 weeks without teratogenicity; monitor maternal hydration and venous thromboembolism prophylaxis during pregnancy infusions.",
      W2,
      "Section 2: IVIG Preferred Immunomodulation & PK",
      "endogenous IgG crosses the placenta via FcRn after 30–32 weeks without teratogenicity, and pregnancy management requires monitoring maternal hydration",
      d.reproductive?.pregnancy_pk
    ),
    mcm: d.reproductive?.mcm || [],
    postpartum: naField(),
    lactation_rid: makeField(
      "Physiological endogenous IgG transfer (no drug-toxicity RID threshold)",
      LACT2,
      "LactMed: IVIG — Drug Levels",
      "Endogenous IgG is a normal component of human colostrum and mature breast milk; exogenous IVIG produces physiological milk IgG transfer",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Compatible with breastfeeding without interruption; IgG antibodies naturally present in colostrum and human milk are safe and beneficial to the infant.",
      LACT2,
      "LactMed: IVIG — Summary of Use during Lactation",
      "Intravenous immunoglobulin (IVIG) is compatible with breastfeeding and requires no interruption of nursing",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 19. ECULIZUMAB
updateDrug("eculizumab", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || { value: "caution", refs: [] },
    folic_acid: naField(),
    contraception: makeField(
      "Does not interact with hormonal contraceptives; effective contraception advised during treatment and for 3 months post-dose unless continued for life-threatening NMOSD or gMG.",
      W2,
      "Section 1: Eculizumab Contraception & Washout",
      "Eculizumab does not interact with hormonal contraceptives; effective contraception is recommended during treatment and for 3 months",
      d.reproductive?.contraception
    ),
    pregnancy_pk: makeField(
      "Terminal complement activity and volume of distribution rise in the 3rd trimester, occasionally requiring shortened dosing intervals or supplemental doses to maintain C5 blockade.",
      W2,
      "Section 2: Eculizumab Registry, PK & Postpartum",
      "terminal complement activity and volume of distribution rise in the third trimester, occasionally requiring shortened dosing intervals",
      d.reproductive?.pregnancy_pk
    ),
    mcm: [
      makeMcm(
        "International PNH & aHUS/NMOSD Pregnancy Registry",
        2.0,
        "0.4%–5.8%",
        148,
        "pregnancy exposure",
        W2,
        "Section 2: Eculizumab Registry, PK & Postpartum",
        "The International PNH and aHUS/NMOSD Pregnancy Registry reported major congenital malformations in 2.0%"
      ),
    ],
    postpartum: makeField(
      "Return to standard biweekly maintenance dosing schedule postpartum if dosing intervals were shortened or supplemented in late pregnancy.",
      W2,
      "Section 2: Eculizumab Registry, PK & Postpartum",
      "followed by return to standard biweekly maintenance postpartum",
      d.reproductive?.postpartum
    ),
    lactation_rid: makeField(
      "Undetectable in breast milk (estimated < 0.1%)",
      LACT2,
      "LactMed: Eculizumab — Drug Levels",
      "Large IgG2/4 monoclonal antibody (~148 kDa) with undetectable breast milk concentrations in published maternal samples",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Undetectable in human milk (estimated RID < 0.1%) and poorly absorbed intact by the infant gut; compatible with breastfeeding without waiting periods.",
      LACT2,
      "LactMed: Eculizumab — Summary of Use during Lactation",
      "Eculizumab is undetectable in human milk and poorly absorbed intact by the infant gut; available evidence indicates it is compatible",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 20. RAVULIZUMAB
updateDrug("ravulizumab", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || { value: "caution", refs: [] },
    folic_acid: naField(),
    contraception: makeField(
      "Long terminal half-life (~50 days) without hormonal contraceptive PK interactions; advise effective contraception during therapy and for 8 months after final infusion unless required for severe NMOSD/gMG.",
      W2,
      "Section 1: Ravulizumab Contraception & Washout",
      "Ravulizumab has an extended terminal half-life (~50 days) and does not alter hormonal contraceptive PK; effective contraception is advised",
      d.reproductive?.contraception
    ),
    pregnancy_pk: makeField(
      "Engineered IgG2/4 monoclonal antibody crossing the placenta via FcRn in late pregnancy; human registry data are sparse compared with eculizumab—reserve for severe NMOSD or gMG where benefit justifies risk.",
      W2,
      "Section 2: Ravulizumab Pregnancy Safety & PK",
      "Ravulizumab is an engineered long-acting IgG2/4 monoclonal antibody that crosses the placenta via FcRn in late pregnancy",
      d.reproductive?.pregnancy_pk
    ),
    mcm: d.reproductive?.mcm || [],
    postpartum: makeField(
      "Maintain standard 8-weekly maintenance schedule postpartum and monitor newborn closely if exposed in the third trimester.",
      W2,
      "Section 2: Ravulizumab Pregnancy Safety & PK",
      "return to standard 8-weekly maintenance postpartum",
      d.reproductive?.postpartum
    ),
    lactation_rid: makeField(
      "Expected < 0.5% (no quantitative human milk measurements)",
      LACT2,
      "LactMed: Ravulizumab — Drug Levels",
      "Human breast milk data for ravulizumab are lacking; as a large IgG2/4 monoclonal antibody (~148 kDa), milk excretion is expected to be minimal",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Milk transfer is theoretically negligible (< 0.5%) with minimal infant GI absorption, though clinical lactation data are not yet established; monitor breastfed infants for feeding and infections.",
      LACT2,
      "LactMed: Ravulizumab — Summary of Use during Lactation",
      "While ravulizumab milk transfer is theoretically negligible, clinical lactation data are not yet established",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 21. EFGARTIGIMOD
updateDrug("efgartigimod", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || { value: "caution", refs: [] },
    folic_acid: naField(),
    contraception: makeField(
      "No CYP-mediated interaction with hormonal contraceptives; washout or transition planning (4–6 weeks prior to conception) is advised unless required for refractory generalized myasthenia gravis.",
      W2,
      "Section 1: Efgartigimod Contraception & Washout",
      "Efgartigimod is a neonatal Fc receptor (FcRn) blocker without CYP-mediated contraceptive interactions; transition or washout",
      d.reproductive?.contraception
    ),
    pregnancy_pk: makeField(
      "FcRn blockade lowers both maternal pathogenic IgG and transplacental transfer of protective maternal IgG to the fetus; human pregnancy data are lacking.",
      W2,
      "Section 2: Efgartigimod Pregnancy Safety & PK",
      "Efgartigimod blocks neonatal FcRn, reducing both maternal pathogenic IgG and transplacental transfer of protective maternal IgG",
      d.reproductive?.pregnancy_pk
    ),
    mcm: d.reproductive?.mcm || [],
    postpartum: makeField(
      "If exposed in the third trimester, evaluate neonatal serum IgG concentrations after birth and consider delaying live infant vaccines until maternal antibody protection/immune status is confirmed.",
      W2,
      "Section 2: Efgartigimod Pregnancy Safety & PK",
      "evaluate neonatal serum IgG levels and delay live infant vaccines if exposed in the third trimester",
      d.reproductive?.postpartum
    ),
    lactation_rid: makeField(
      "No human milk data available",
      LACT2,
      "LactMed: Efgartigimod — Drug Levels",
      "Human breast milk transfer data for efgartigimod are currently unavailable (large Fc fragment ~54 kDa",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "No clinical data exist on human milk transfer or potential neonatal IgG reduction; exercise caution during breastfeeding and weigh maternal MG control against unknown infant risk.",
      LACT2,
      "LactMed: Efgartigimod — Summary of Use during Lactation",
      "Because no clinical data exist on efgartigimod in human milk or potential neonatal IgG reduction, exercise caution during breastfeeding",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 22. BACLOFEN
updateDrug("baclofen", (d) => {
  d.reproductive = {
    tier: makeTier(
      "caution",
      "Limited human pregnancy data; crosses the placenta with risk of neonatal baclofen withdrawal after chronic late-pregnancy oral exposure (intrathecal route minimizes systemic fetal exposure).",
      W2,
      "Section 2: Baclofen Pregnancy Safety & Postpartum",
      "Oral baclofen has limited human teratogenicity data and crosses the placenta, whereas intrathecal baclofen minimizes systemic fetal exposure",
      d.reproductive?.tier
    ),
    folic_acid: naField(),
    contraception: makeField(
      "Does not impair hormonal contraceptive efficacy.",
      W2,
      "Section 1: Myasthenia & Spasticity Agents Contraception Note",
      "Systemic corticosteroids, pyridostigmine, IVIG, and oral muscle relaxants do not impair hormonal contraceptive efficacy",
      d.reproductive?.contraception
    ),
    pregnancy_pk: makeField(
      "Crosses the placenta after oral dosing (intrathecal pump minimizes systemic fetal exposure); do not discontinue abruptly during pregnancy due to severe maternal/fetal withdrawal risk.",
      W2,
      "Section 2: Baclofen Pregnancy Safety & Postpartum",
      "Oral baclofen has limited human teratogenicity data and crosses the placenta, whereas intrathecal baclofen minimizes systemic fetal exposure",
      d.reproductive?.pregnancy_pk
    ),
    mcm: d.reproductive?.mcm || [],
    postpartum: makeField(
      "Monitor newborns exposed chronically to oral baclofen in late pregnancy for neonatal withdrawal (hypertonia, irritability, tremors, seizures) during the first week postpartum.",
      W2,
      "Section 2: Baclofen Pregnancy Safety & Postpartum",
      "newborns exposed chronically in late pregnancy must be monitored for neonatal baclofen withdrawal (hypertonia, irritability, seizures)",
      d.reproductive?.postpartum
    ),
    lactation_rid: makeField(
      "0.1% to 6.9% oral (undetectable intrathecal)",
      LACT2,
      "LactMed: Baclofen — Drug Levels",
      "Oral maternal baclofen produces a relative infant dose of approximately 0.1% to 6.9% of the weight-adjusted maternal dosage",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Oral baclofen transfers in low-to-moderate amounts (RID up to ~6.9%) with rare sedation at maternal initiation; intrathecal therapy yields undetectable milk levels. Monitor infant for drowsiness or hypotonia.",
      LACT2,
      "LactMed: Baclofen — Summary of Use during Lactation",
      "Oral baclofen enters breast milk in low to moderate amounts (RID up to ~6.9%) with rare case reports of infant sedation",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 23. TIZANIDINE
updateDrug("tizanidine", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || { value: "caution", refs: [] },
    folic_acid: naField(),
    contraception: makeField(
      "Does not reduce contraceptive efficacy, BUT combined oral contraceptives containing ethinylestradiol strongly inhibit CYP1A2 and markedly increase tizanidine levels (risk of severe hypotension and sedation).",
      W2,
      "Section 1: Myasthenia & Spasticity Agents Contraception Note",
      "note that tizanidine clearance is reduced by combined oral contraceptives containing ethinylestradiol (CYP1A2 inhibition)",
      d.reproductive?.contraception
    ),
    pregnancy_pk: makeField(
      "Human pregnancy data are insufficient and animal studies showed embryo-fetal toxicity and prolonged gestation at high doses; reserve only if maternal spasticity benefit outweighs potential fetal risk.",
      W2,
      "Section 2: Tizanidine Pregnancy Safety & PK",
      "Human pregnancy data for tizanidine are insufficient to define malformation risk, while animal studies showed embryo-fetal toxicity",
      d.reproductive?.pregnancy_pk
    ),
    mcm: d.reproductive?.mcm || [],
    postpartum: makeField(
      "If starting or resuming combined estrogen-containing oral contraceptives postpartum, avoid concomitant tizanidine or monitor closely for severe CYP1A2-mediated hypotension and sedation.",
      W2,
      "Section 2: Tizanidine Pregnancy Safety & PK",
      "monitor CYP1A2-mediated interaction with estrogen postpartum if combined oral contraceptives are resumed",
      d.reproductive?.postpartum
    ),
    lactation_rid: makeField(
      "No human milk data available",
      LACT2,
      "LactMed: Tizanidine — Drug Levels",
      "Quantitative human breast milk concentrations and relative infant dose data for tizanidine are currently unavailable",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Human milk levels are unstudied and high lipid solubility suggests likely milk transfer with potential infant sedation or hypotension; prefer an alternate muscle relaxant while nursing newborns or preterm infants.",
      LACT2,
      "LactMed: Tizanidine — Summary of Use during Lactation",
      "Because tizanidine milk levels are unstudied and its high lipid solubility suggests possible milk transfer with risk of infant sedation",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 24. DANTROLENE
updateDrug("dantrolene", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || { value: "caution", refs: [] },
    folic_acid: naField(),
    contraception: makeField(
      "Does not impair hormonal contraceptive efficacy.",
      W2,
      "Section 1: Myasthenia & Spasticity Agents Contraception Note",
      "Systemic corticosteroids, pyridostigmine, IVIG, and oral muscle relaxants do not impair hormonal contraceptive efficacy",
      d.reproductive?.contraception
    ),
    pregnancy_pk: makeField(
      "Crosses the placenta (fetal-to-maternal ratio ~0.4); while chronic oral pregnancy data are limited, emergency IV dantrolene is life-saving and must never be withheld in malignant hyperthermia or NMS.",
      W2,
      "Section 2: Dantrolene Pregnancy Safety & PK",
      "Dantrolene crosses the placenta (fetal-to-maternal ratio ~0.4); while chronic oral pregnancy data are limited, emergency intravenous dantrolene is life-saving",
      d.reproductive?.pregnancy_pk
    ),
    mcm: d.reproductive?.mcm || [],
    postpartum: makeField(
      "Observe the newborn briefly for transient neonatal hypotonia if emergency intravenous or late-pregnancy dantrolene was administered around delivery.",
      W2,
      "Section 2: Dantrolene Pregnancy Safety & PK",
      "watching the newborn briefly for transient hypotonia postpartum",
      d.reproductive?.postpartum
    ),
    lactation_rid: makeField(
      "0.8% to 2% of the weight-adjusted maternal dosage (IV)",
      LACT2,
      "LactMed: Dantrolene — Drug Levels",
      "Limited case measurements following intravenous maternal dantrolene report a relative infant dose of approximately 0.8% to 2%",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Milk levels decline rapidly after emergency IV dantrolene (half-life ~9 h, RID 0.8%–2%); temporary 24–48 hour breastfeeding interruption after acute IV therapy is prudent while monitoring for hypotonia.",
      LACT2,
      "LactMed: Dantrolene — Summary of Use during Lactation",
      "After emergency intravenous dantrolene administration, milk concentrations decline rapidly (half-life ~9 hours); temporary breastfeeding interruption for 24 to 48 hours",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

console.log("=== WAVE 2 COMPLETE (24/24 DRUGS) ===");
