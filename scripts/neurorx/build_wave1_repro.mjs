import { getQuote, updateDrug } from "./enhance_common.mjs";
import { computeContentHashSync } from "../../src/lib/neurorx/integrity.ts";

const AAN = "aan-aes-2024-asm-pregnancy";
const LACT = "lactmed-wave1";

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

function syncVerificationHash(drug) {
  if (drug.status === "verified" && drug.verification) {
    drug.verification.content_hash = computeContentHashSync(drug);
  }
  return drug;
}

console.log("=== WAVE 1: PREGNANCY & LACTATION ENRICHMENT (17 DRUGS) ===");

// 1. ACYCLOVIR
updateDrug("acyclovir", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || {
      value: "caution",
      refs: [
        {
          source_id: "fda-acyclovir-label",
          locator: "PREGNANCY",
          quote: getQuote("fda-acyclovir-label", "Acyclovir should be used during pregnancy only if", 25, 220),
        },
      ],
    },
    folic_acid: naField(),
    contraception: naField(),
    pregnancy_pk: makeField(
      "Oral and IV acyclovir pharmacokinetics are not significantly altered during pregnancy and do not require therapeutic drug monitoring; use standard renal-adjusted dosing.",
      AAN,
      "Section 4: Pregnancy Pharmacokinetics — Acyclovir",
      "Oral and intravenous acyclovir pharmacokinetics are not significantly altered during pregnancy",
      d.reproductive?.pregnancy_pk
    ),
    mcm: [
      makeMcm(
        "Acyclovir Pregnancy Registry (CDC / GSK)",
        3.2,
        "2.0%–5.0%",
        596,
        "first-trimester systemic exposure",
        AAN,
        "Section 3: Acyclovir Pregnancy Registry",
        "Prospective follow-up in the Acyclovir Pregnancy Registry documented major birth defects in 3.2%"
      ),
    ],
    postpartum: naField(),
    lactation_rid: makeField(
      "1% to 2% of the weight-adjusted maternal dosage",
      LACT,
      "LactMed: Acyclovir — Drug Levels",
      "Maternal doses of 1 to 4 g/day orally or IV produce milk levels resulting in an infant dose of approximately 1% to 2%",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Passes into human breast milk in low concentrations (RID 1%–2%, milk-to-plasma ratio 0.6–4.1) and is widely considered compatible with breastfeeding; rare self-limiting infant rash reported.",
      LACT,
      "LactMed: Acyclovir — Summary of Use during Lactation",
      "Acyclovir passes into human breast milk in low concentrations (RID 1% to 2%) and is widely considered compatible with breastfeeding",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 2. LAMOTRIGINE
updateDrug("lamotrigine", (d) => {
  d.reproductive = {
    tier: {
      value: "preferred",
      note: "Lowest recognized MCM risk among antiseizure medications across multiple large international registries; preferred first-line maintenance option per AAN/AES/SMFM 2024.",
      refs: [
        {
          source_id: AAN,
          locator: "Section 3: AAN/AES/SMFM Preferred ASMs in Pregnancy",
          quote: getQuote(AAN, "Among antiseizure medications, lamotrigine and levetiracetam are associated with the lowest risk", 30, 320),
        },
        ...(d.reproductive?.tier?.refs || []),
      ],
    },
    folic_acid: makeField(
      "Prescribe at least 0.4 mg/day preconception and through the first trimester (up to 4 mg/day if elevated neural tube defect risk factors exist; weak in vitro DHFR inhibition).",
      AAN,
      "Section 1: Preconception Folic Acid Supplementation",
      "Lamotrigine exhibits weak dihydrofolate reductase inhibition in vitro; prescribe at least 0.4 mg/day preconception",
      d.reproductive?.folic_acid
    ),
    contraception: makeField(
      "Estrogen-containing oral contraceptives induce UGT1A4 glucuronidation and reduce lamotrigine levels by ~50% (levels can double during the pill-free week); progestin-only methods or an IUD avoid fluctuations.",
      AAN,
      "Section 2: Lamotrigine Bidirectional Contraceptive Interaction",
      "Estrogen-containing oral contraceptives induce UGT1A4 glucuronidation and reduce serum lamotrigine concentrations by approximately 50%",
      d.reproductive?.contraception
    ),
    pregnancy_pk: makeField(
      "Clearance increases 100%–300% during pregnancy via UGT1A4 induction, dropping serum concentrations markedly in the 2nd and 3rd trimesters; obtain pre-pregnancy baseline and check monthly serum levels to adjust dosage.",
      AAN,
      "Section 4: Lamotrigine PK & TDM",
      "Pregnancy substantially induces UGT1A4 glucuronidation, increasing lamotrigine clearance by 100% to 300%",
      d.reproductive?.pregnancy_pk
    ),
    mcm: [
      makeMcm(
        "North American AED (NAAED) Pregnancy Registry",
        2.0,
        undefined,
        1562,
        "first-trimester monotherapy",
        AAN,
        "Section 3: Lamotrigine — NAAED Pregnancy Registry",
        "The North American AED Pregnancy Registry reported major congenital malformations in 2.0% of 1,562 infants exposed to lamotrigine"
      ),
      makeMcm(
        "EURAP International Pregnancy Registry",
        2.9,
        "2.3%–3.7%",
        2514,
        "first-trimester monotherapy",
        AAN,
        "Section 3: Lamotrigine — EURAP Registry",
        "The EURAP International Pregnancy Registry reported major congenital malformations in 2.9% (95% CI: 2.3%–3.7%) of 2,514 infants exposed to lamotrigine"
      ),
      makeMcm(
        "UK & Ireland Epilepsy and Pregnancy Register",
        2.3,
        "1.8%–3.1%",
        1949,
        "first-trimester monotherapy",
        AAN,
        "Section 3: Lamotrigine — UK & Ireland Register",
        "The UK and Ireland Epilepsy and Pregnancy Register reported major congenital malformations in 2.3% (95% CI: 1.8%–3.1%) of 1,949 infants exposed to lamotrigine"
      ),
    ],
    postpartum: makeField(
      "UGT1A4 activity normalizes rapidly within days of delivery; taper pregnancy-escalated dose back toward pre-pregnancy baseline over 10–14 days postpartum to prevent maternal toxicity and high neonatal exposure.",
      AAN,
      "Section 4: Lamotrigine Postpartum Management",
      "UGT1A4 activity rapidly normalizes within days after delivery, causing maternal lamotrigine serum and breast milk concentrations to surge",
      d.reproductive?.postpartum
    ),
    lactation_rid: makeField(
      "9% to 18% of the weight-adjusted maternal dosage",
      LACT,
      "LactMed: Lamotrigine — Drug Levels",
      "Weight-adjusted infant exposure ranges from 9% to 18% of the maternal lamotrigine dosage",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Passes into breast milk in relatively high amounts (RID 9%–18%; infant serum levels up to 30%–50% of maternal levels); monitor infant closely for rash, apnea, drowsiness, and poor sucking, and taper elevated maternal doses promptly postpartum.",
      LACT,
      "LactMed: Lamotrigine — Summary of Use during Lactation",
      "Lamotrigine passes into breast milk in relatively high amounts (RID 9% to 18%) and requires close infant monitoring for rash, apnea, drowsiness",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 3. LEVETIRACETAM-ORAL
updateDrug("levetiracetam-oral", (d) => {
  d.reproductive = {
    tier: {
      value: "preferred",
      note: "Recognized by AAN/AES/SMFM 2024 as having one of the lowest major congenital malformation risks (0.7%–2.8% across NAAED, EURAP, and UK registries) and preferred first-line option during pregnancy.",
      refs: [
        {
          source_id: AAN,
          locator: "Section 3: AAN/AES/SMFM Preferred ASMs in Pregnancy",
          quote: getQuote(AAN, "Among antiseizure medications, lamotrigine and levetiracetam are associated with the lowest risk", 30, 320),
        },
        ...(d.reproductive?.tier?.refs || []),
      ],
    },
    folic_acid: makeField(
      "Prescribe at least 0.4 mg/day of folic acid preconception and through the first trimester per AAN/AES/SMFM preconception care for all patients on ASMs.",
      AAN,
      "Section 1: Newer ASM Folic Acid Guidance",
      "Prescribe at least 0.4 mg/day of folic acid preconception and through the first trimester per standard AAN/AES/SMFM preconception care",
      d.reproductive?.folic_acid
    ),
    contraception: makeField(
      "Does not induce hepatic enzymes or reduce ethinylestradiol/levonorgestrel plasma concentrations; hormonal and intrauterine contraceptives remain fully effective.",
      AAN,
      "Section 2: Non-Enzyme-Inducing ASMs",
      "Clinical interaction studies demonstrate no clinically relevant reduction in ethinylestradiol or levonorgestrel plasma concentrations",
      d.reproductive?.contraception
    ),
    pregnancy_pk: makeField(
      "Increased glomerular filtration raises renal clearance by 40%–60% during pregnancy, lowering serum concentrations especially in the 3rd trimester; check monthly levels against baseline and increase dose as clinically indicated.",
      AAN,
      "Section 4: Levetiracetam PK & TDM",
      "Enhanced glomerular filtration during pregnancy increases renal clearance of levetiracetam by 40% to 60%",
      d.reproductive?.pregnancy_pk
    ),
    mcm: [
      makeMcm(
        "North American AED (NAAED) Pregnancy Registry",
        2.4,
        "1.2%–4.3%",
        450,
        "first-trimester monotherapy",
        AAN,
        "Section 3: Levetiracetam — NAAED Pregnancy Registry",
        "The North American AED Pregnancy Registry reported major congenital malformations in 2.4% (95% CI: 1.2%–4.3%) of 450 infants exposed to levetiracetam"
      ),
      makeMcm(
        "EURAP International Pregnancy Registry",
        2.8,
        "1.7%–4.5%",
        599,
        "first-trimester monotherapy",
        AAN,
        "Section 3: Levetiracetam — EURAP Registry",
        "The EURAP International Pregnancy Registry reported major congenital malformations in 2.8% (95% CI: 1.7%–4.5%) of 599 infants exposed to levetiracetam"
      ),
      makeMcm(
        "UK & Ireland Epilepsy and Pregnancy Register",
        0.7,
        "0.2%–2.5%",
        304,
        "first-trimester monotherapy",
        AAN,
        "Section 3: Levetiracetam — UK & Ireland Register",
        "The UK and Ireland Epilepsy and Pregnancy Register reported major congenital malformations in 0.7% (95% CI: 0.2%–2.5%) of 304 infants exposed to levetiracetam"
      ),
    ],
    postpartum: makeField(
      "Renal hyperfiltration resolves rapidly after delivery; if dosage was increased during pregnancy, taper back toward pre-pregnancy baseline over 10–14 days postpartum while monitoring for somnolence or dizziness.",
      AAN,
      "Section 4: Levetiracetam Postpartum Management",
      "Renal hyperfiltration resolves rapidly after delivery; if the levetiracetam dose was increased during pregnancy, taper back toward the pre-pregnancy baseline dose",
      d.reproductive?.postpartum
    ),
    lactation_rid: makeField(
      "3.4% to 7.8% of the weight-adjusted maternal dosage",
      LACT,
      "LactMed: Levetiracetam — Drug Levels",
      "Maternal oral levetiracetam produces a relative infant dose of 3.4% to 7.8% of the weight-adjusted maternal dosage",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Compatible with breastfeeding; despite moderate milk transfer (RID 3.4%–7.8%), breastfed infants clear levetiracetam efficiently (infant serum ~10%–15% of maternal levels). Monitor routinely for somnolence and feeding adequacy.",
      LACT,
      "LactMed: Levetiracetam — Summary of Use during Lactation",
      "Despite moderate milk concentrations (RID 3.4% to 7.8%), breastfed infants clear levetiracetam efficiently and maintain low serum levels",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 4. OXCARBAZEPINE
updateDrug("oxcarbazepine", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || { value: "caution", refs: [] },
    folic_acid: makeField(
      "Prescribe at least 0.4 mg/day of folic acid preconception and through the first trimester per AAN/AES/SMFM preconception care.",
      AAN,
      "Section 1: Newer ASM Folic Acid Guidance",
      "Prescribe at least 0.4 mg/day of folic acid preconception and through the first trimester per standard AAN/AES/SMFM preconception care",
      d.reproductive?.folic_acid
    ),
    contraception: makeField(
      "Induces CYP3A4 and lowers plasma ethinylestradiol and levonorgestrel by ~47%; recommend non-hormonal or intrauterine contraception (copper or levonorgestrel IUD) or supplemental barrier protection.",
      AAN,
      "Section 2: Oxcarbazepine Contraceptive Guidance",
      "Oxcarbazepine induces CYP3A4 and decreases plasma ethinylestradiol and levonorgestrel concentrations by approximately 47%",
      d.reproductive?.contraception
    ),
    pregnancy_pk: makeField(
      "Pregnancy accelerates glucuronidation of active MHD metabolite, lowering serum MHD concentrations by 30%–60% in the 2nd and 3rd trimesters; monitor MHD levels monthly and adjust dose as needed.",
      AAN,
      "Section 4: Oxcarbazepine PK & TDM",
      "Pregnancy accelerates glucuronidation of the active 10-monohydroxy derivative (MHD), decreasing serum MHD concentrations by 30% to 60%",
      d.reproductive?.pregnancy_pk
    ),
    mcm: [
      makeMcm(
        "North American AED (NAAED) Pregnancy Registry",
        2.2,
        "0.6%–5.5%",
        182,
        "first-trimester monotherapy",
        AAN,
        "Section 3: Oxcarbazepine — NAAED Pregnancy Registry",
        "The North American AED Pregnancy Registry reported major congenital malformations in 2.2% (95% CI: 0.6%–5.5%) of 182 infants exposed to oxcarbazepine"
      ),
      makeMcm(
        "EURAP International Pregnancy Registry",
        3.0,
        "1.4%–5.4%",
        333,
        "first-trimester monotherapy",
        AAN,
        "Section 3: Oxcarbazepine — EURAP Registry",
        "The EURAP International Pregnancy Registry reported major congenital malformations in 3.0% (95% CI: 1.4%–5.4%) of 333 infants exposed to oxcarbazepine"
      ),
    ],
    postpartum: makeField(
      "Maternal MHD clearance normalizes over 2–3 weeks postpartum; step down pregnancy-escalated doses gradually toward pre-pregnancy baseline over 10–14 days postpartum to avoid hyponatremia and neurotoxicity.",
      AAN,
      "Section 4: Oxcarbazepine Postpartum Management",
      "Maternal MHD clearance returns toward baseline over the first 2 to 3 weeks after delivery; if doses were escalated during pregnancy, step down gradually",
      d.reproductive?.postpartum
    ),
    lactation_rid: makeField(
      "0.5% to 1.5% of the weight-adjusted maternal dosage",
      LACT,
      "LactMed: Oxcarbazepine — Drug Levels",
      "Milk transfer of oxcarbazepine and its active MHD metabolite results in a low relative infant dose of 0.5% to 1.5%",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Very low transfer into human milk (RID 0.5%–1.5%) with minimal infant serum concentrations; monitor breastfed infants for drowsiness and adequate weight gain.",
      LACT,
      "LactMed: Oxcarbazepine — Summary of Use during Lactation",
      "Oxcarbazepine and MHD appear in very small quantities in human milk (RID 0.5% to 1.5%) and infant serum concentrations are minimal",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 5. CARBAMAZEPINE
updateDrug("carbamazepine", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || { value: "avoid", refs: [] },
    folic_acid: makeField(
      "Folate antagonist; high-dose folic acid supplementation (4 to 5 mg/day) is commonly recommended preconception through the first trimester to mitigate elevated neural tube defect risk.",
      AAN,
      "Section 1: Folate Antagonist & High-Risk ASM Guidance",
      "Because older enzyme-inducing ASMs and valproate impair folate metabolism or carry elevated neural tube defect risk, clinical guidelines commonly supplement 4 to 5 mg/day",
      d.reproductive?.folic_acid
    ),
    contraception: makeField(
      "Strong CYP3A4/UGT inducer causing hormonal contraceptive failure (oral pills, patches, rings, implants); recommend copper IUD, levonorgestrel IUD, or depot medroxyprogesterone plus barrier backup.",
      AAN,
      "Section 2: Strong Enzyme-Inducing ASMs",
      "Strong CYP3A4 and UGT induction substantially accelerates metabolism of combined oral contraceptives, progestin-only pills, patches, vaginal rings, and subdermal implants",
      d.reproductive?.contraception
    ),
    pregnancy_pk: makeField(
      "Total carbamazepine levels fall modestly (10%–20%) during pregnancy while free carbamazepine and active epoxide levels remain relatively stable; monitor free carbamazepine levels each trimester or monthly if seizures change.",
      AAN,
      "Section 4: Carbamazepine PK & TDM",
      "Total carbamazepine concentrations decline modestly (10% to 20%) during pregnancy while free (unbound) carbamazepine",
      d.reproductive?.pregnancy_pk
    ),
    mcm: [
      makeMcm(
        "North American AED (NAAED) Pregnancy Registry",
        3.0,
        "2.1%–4.2%",
        1033,
        "first-trimester monotherapy",
        AAN,
        "Section 3: Carbamazepine — NAAED Pregnancy Registry",
        "The North American AED Pregnancy Registry reported major congenital malformations in 3.0% (95% CI: 2.1%–4.2%) of 1,033 infants exposed to carbamazepine"
      ),
      makeMcm(
        "EURAP International Pregnancy Registry",
        5.5,
        "4.5%–6.6%",
        1957,
        "first-trimester monotherapy (dose-dependent >700 mg/day)",
        AAN,
        "Section 3: Carbamazepine — EURAP Registry",
        "The EURAP International Pregnancy Registry reported major congenital malformations in 5.5% (95% CI: 4.5%–6.6%) of 1,957 infants exposed to carbamazepine"
      ),
      makeMcm(
        "UK & Ireland Epilepsy and Pregnancy Register",
        2.6,
        "1.9%–3.5%",
        1657,
        "first-trimester monotherapy",
        AAN,
        "Section 3: Carbamazepine — UK & Ireland Register",
        "The UK and Ireland Epilepsy and Pregnancy Register reported major congenital malformations in 2.6% (95% CI: 1.9%–3.5%) of 1,657 infants exposed to carbamazepine"
      ),
    ],
    postpartum: makeField(
      "If dosage was increased during pregnancy, taper gradually back toward pre-pregnancy maintenance levels over 2–3 weeks postpartum while monitoring for diplopia, ataxia, or sedation.",
      AAN,
      "Section 4: Carbamazepine Postpartum Management",
      "When carbamazepine dosage was increased during pregnancy, reduce gradually back toward pre-pregnancy maintenance levels over 2 to 3 weeks postpartum",
      d.reproductive?.postpartum
    ),
    lactation_rid: makeField(
      "3% to 5% of the weight-adjusted maternal dosage",
      LACT,
      "LactMed: Carbamazepine — Drug Levels",
      "Breastfed infants receive approximately 3% to 5% of the weight-adjusted maternal carbamazepine dosage",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Low milk transfer (RID 3%–5%) and generally compatible with breastfeeding; monitor breastfed infants for drowsiness, poor sucking, adequate weight gain, and rare transient jaundice/cholestatic hepatitis.",
      LACT,
      "LactMed: Carbamazepine — Summary of Use during Lactation",
      "Carbamazepine milk transfer is low (RID 3% to 5%) and serum levels in breastfed infants are usually low or undetectable; it is generally compatible with breastfeeding",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 6. PHENYTOIN
updateDrug("phenytoin", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || { value: "avoid", refs: [] },
    folic_acid: makeField(
      "Folate antagonist; supplement 4 to 5 mg/day preconception through the first trimester (or at least 0.4 mg/day minimum) to reduce neural tube defect risk.",
      AAN,
      "Section 1: Folate Antagonist & High-Risk ASM Guidance",
      "Because older enzyme-inducing ASMs and valproate impair folate metabolism or carry elevated neural tube defect risk, clinical guidelines commonly supplement 4 to 5 mg/day",
      d.reproductive?.folic_acid
    ),
    contraception: makeField(
      "Strong CYP3A4/UGT inducer that markedly reduces hormonal contraceptive efficacy; recommend copper IUD, levonorgestrel IUD, or depot medroxyprogesterone plus barrier contraception.",
      AAN,
      "Section 2: Strong Enzyme-Inducing ASMs",
      "Strong CYP3A4 and UGT induction substantially accelerates metabolism of combined oral contraceptives, progestin-only pills, patches, vaginal rings, and subdermal implants",
      d.reproductive?.contraception
    ),
    pregnancy_pk: makeField(
      "Total phenytoin levels fall 50%–60% (unbound phenytoin falls 20%–30%) due to accelerated metabolism and lower albumin; monitor unbound (free) phenytoin concentrations monthly and adjust dose accordingly.",
      AAN,
      "Section 4: Phenytoin PK & TDM",
      "Total phenytoin serum concentrations decline by up to 50%–60% during pregnancy due to accelerated hepatic metabolism and decreased albumin binding",
      d.reproductive?.pregnancy_pk
    ),
    mcm: [
      makeMcm(
        "North American AED (NAAED) Pregnancy Registry",
        2.9,
        "1.5%–5.0%",
        416,
        "first-trimester monotherapy",
        AAN,
        "Section 3: Phenytoin — NAAED Pregnancy Registry",
        "The North American AED Pregnancy Registry reported major congenital malformations in 2.9% (95% CI: 1.5%–5.0%) of 416 infants exposed to phenytoin"
      ),
      makeMcm(
        "EURAP International Pregnancy Registry",
        6.4,
        "2.8%–12.2%",
        125,
        "first-trimester monotherapy",
        AAN,
        "Section 3: Phenytoin — EURAP Registry",
        "The EURAP International Pregnancy Registry reported major congenital malformations in 6.4% (95% CI: 2.8%–12.2%) of 125 infants exposed to phenytoin"
      ),
      makeMcm(
        "UK & Ireland Epilepsy and Pregnancy Register",
        3.7,
        "1.3%–10.2%",
        82,
        "first-trimester monotherapy",
        AAN,
        "Section 3: Phenytoin — UK & Ireland Register",
        "The UK and Ireland Epilepsy and Pregnancy Register reported major congenital malformations in 3.7% (95% CI: 1.3%–10.2%) of 82 infants exposed to phenytoin"
      ),
    ],
    postpartum: makeField(
      "Protein binding and hepatic clearance normalize within 1–2 weeks after delivery; taper back to pre-pregnancy dosage over 10–14 days postpartum guided by unbound serum levels to prevent acute phenytoin toxicity.",
      AAN,
      "Section 4: Phenytoin Postpartum Management",
      "Maternal protein binding and hepatic clearance normalize within 1 to 2 weeks after delivery; restore pre-pregnancy phenytoin dosage gradually",
      d.reproductive?.postpartum
    ),
    lactation_rid: makeField(
      "0.5% to 6% of the weight-adjusted maternal dosage",
      LACT,
      "LactMed: Phenytoin — Drug Levels",
      "Breastfed infants receive 0.5% to 6% of the weight-adjusted maternal phenytoin dosage through breast milk",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Enters breast milk in low amounts (RID 0.5%–6%) and is compatible with breastfeeding when maternal levels remain in the therapeutic range; monitor newborn for sedation, poor sucking, and rare methemoglobinemia if combined with phenobarbital.",
      LACT,
      "LactMed: Phenytoin — Summary of Use during Lactation",
      "Phenytoin enters breast milk in low quantities (RID 0.5% to 6%) and rarely causes adverse effects in breastfed infants",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 7. PHENOBARBITAL
updateDrug("phenobarbital", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || { value: "avoid", refs: [] },
    folic_acid: makeField(
      "Folate antagonist; high-dose folic acid supplementation (4 to 5 mg/day) is commonly recommended preconception through the first trimester due to neural tube and cardiac malformation risk.",
      AAN,
      "Section 1: Folate Antagonist & High-Risk ASM Guidance",
      "Because older enzyme-inducing ASMs and valproate impair folate metabolism or carry elevated neural tube defect risk, clinical guidelines commonly supplement 4 to 5 mg/day",
      d.reproductive?.folic_acid
    ),
    contraception: makeField(
      "Strong CYP3A4/UGT inducer that causes failure of hormonal contraceptives; recommend copper IUD, levonorgestrel IUD, or depot medroxyprogesterone plus barrier method.",
      AAN,
      "Section 2: Strong Enzyme-Inducing ASMs",
      "Strong CYP3A4 and UGT induction substantially accelerates metabolism of combined oral contraceptives, progestin-only pills, patches, vaginal rings, and subdermal implants",
      d.reproductive?.contraception
    ),
    pregnancy_pk: makeField(
      "Total and unbound phenobarbital levels drop up to 30%–50% during pregnancy due to increased clearance and distribution volume; monitor serum levels monthly and adjust cautiously given fetal neurodevelopmental risk.",
      AAN,
      "Section 4: Phenobarbital PK & TDM",
      "Total and unbound phenobarbital concentrations decrease by up to 30% to 50% during pregnancy due to increased clearance",
      d.reproductive?.pregnancy_pk
    ),
    mcm: [
      makeMcm(
        "North American AED (NAAED) Pregnancy Registry",
        5.5,
        "2.8%–9.7%",
        199,
        "first-trimester monotherapy",
        AAN,
        "Section 3: Phenobarbital — NAAED Pregnancy Registry",
        "The North American AED Pregnancy Registry reported major congenital malformations in 5.5% (95% CI: 2.8%–9.7%) of 199 infants exposed to phenobarbital"
      ),
      makeMcm(
        "EURAP International Pregnancy Registry",
        6.5,
        "4.2%–9.9%",
        294,
        "first-trimester monotherapy (higher risk >=80 mg/day)",
        AAN,
        "Section 3: Phenobarbital — EURAP Registry",
        "The EURAP International Pregnancy Registry reported major congenital malformations in 6.5% (95% CI: 4.2%–9.9%) of 294 infants exposed to phenobarbital"
      ),
    ],
    postpartum: makeField(
      "Taper any pregnancy-escalated dose gradually toward pre-pregnancy baseline over 2–3 weeks postpartum; monitor neonates exposed in utero for withdrawal (irritability, poor feeding) starting days 3–7.",
      AAN,
      "Section 4: Phenobarbital Postpartum Management",
      "Maternal clearance decreases after delivery; reduce dose gradually toward pre-pregnancy levels over 2 to 3 weeks postpartum",
      d.reproductive?.postpartum
    ),
    lactation_rid: makeField(
      "15% to 30% of the weight-adjusted maternal dosage",
      LACT,
      "LactMed: Phenobarbital — Drug Levels",
      "Breastfed infants receive approximately 15% to 30% of the weight-adjusted maternal phenobarbital dosage",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "High relative infant dose (RID 15%–30%) with slow neonatal elimination causing infant serum levels up to 50%–100% of maternal levels; use caution, monitor closely for profound sedation, poor sucking, and weaning withdrawal, or prefer safer alternatives.",
      LACT,
      "LactMed: Phenobarbital — Summary of Use during Lactation",
      "Phenobarbital has a high relative infant dose (15% to 30%) and accumulates significantly in neonates, risking profound sedation, poor sucking, and withdrawal",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 8. TOPIRAMATE
updateDrug("topiramate", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || { value: "avoid", refs: [] },
    folic_acid: makeField(
      "Prescribe at least 0.4 mg/day of folic acid preconception and through the first trimester per AAN/AES/SMFM preconception care (consider alternative ASM before conception whenever possible due to oral cleft and SGA risk).",
      AAN,
      "Section 1: Newer ASM Folic Acid Guidance",
      "Prescribe at least 0.4 mg/day of folic acid preconception and through the first trimester per standard AAN/AES/SMFM preconception care",
      d.reproductive?.folic_acid
    ),
    contraception: makeField(
      "Dose-dependent CYP3A4 induction lowers ethinylestradiol exposure by 18%–30% at doses >= 200 mg/day; advise non-hormonal/intrauterine contraception or reliable barrier backup, especially at >= 200 mg/day.",
      AAN,
      "Section 2: Topiramate Contraceptive Guidance",
      "Topiramate demonstrates dose-dependent reduction in ethinylestradiol exposure (18% to 30% reduction at doses >= 200 mg/day)",
      d.reproductive?.contraception
    ),
    pregnancy_pk: makeField(
      "Renal clearance increases in pregnancy, decreasing dose-normalized serum topiramate concentrations by 30%–40% in the 2nd and 3rd trimesters; monitor serum concentrations monthly or per trimester and adjust for breakthrough seizures.",
      AAN,
      "Section 4: Topiramate PK & TDM",
      "Renal clearance of topiramate increases during pregnancy, reducing dose-normalized serum concentrations by 30% to 40%",
      d.reproductive?.pregnancy_pk
    ),
    mcm: [
      makeMcm(
        "North American AED (NAAED) Pregnancy Registry",
        4.2,
        "2.4%–6.8%",
        359,
        "first-trimester monotherapy (oral clefts / SGA risk)",
        AAN,
        "Section 3: Topiramate — NAAED Pregnancy Registry",
        "The North American AED Pregnancy Registry reported major congenital malformations in 4.2% (95% CI: 2.4%–6.8%) of 359 infants exposed to topiramate"
      ),
      makeMcm(
        "EURAP International Pregnancy Registry",
        3.9,
        "1.5%–8.4%",
        152,
        "first-trimester monotherapy",
        AAN,
        "Section 3: Topiramate — EURAP Registry",
        "The EURAP International Pregnancy Registry reported major congenital malformations in 3.9% (95% CI: 1.5%–8.4%) of 152 infants exposed to topiramate"
      ),
      makeMcm(
        "UK & Ireland Epilepsy and Pregnancy Register",
        4.3,
        "1.7%–10.7%",
        93,
        "first-trimester monotherapy",
        AAN,
        "Section 3: Topiramate — UK & Ireland Register",
        "The UK and Ireland Epilepsy and Pregnancy Register reported major congenital malformations in 4.3% (95% CI: 1.7%–10.7%) of 93 infants exposed to topiramate"
      ),
    ],
    postpartum: makeField(
      "Renal clearance normalizes within 1–2 weeks after delivery; if topiramate dose was raised during pregnancy, taper cautiously back toward pre-pregnancy dose over 10–14 days postpartum.",
      AAN,
      "Section 4: Topiramate Postpartum Management",
      "Postpartum normalization of renal clearance occurs within 1 to 2 weeks after delivery; if topiramate dose was raised during pregnancy",
      d.reproductive?.postpartum
    ),
    lactation_rid: makeField(
      "3% to 23% of the weight-adjusted maternal dosage",
      LACT,
      "LactMed: Topiramate — Drug Levels",
      "Breastfed infants receive 3% to 23% of the weight-adjusted maternal topiramate dosage",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Variable breast milk transfer (RID 3%–23%; infant plasma levels ~10%–20% of maternal levels), usually tolerated at maternal doses <= 200 mg/day; monitor infant for diarrhea, somnolence, irritability, and weight gain.",
      LACT,
      "LactMed: Topiramate — Summary of Use during Lactation",
      "Topiramate milk exposure can be variable (RID 3% to 23%), though most breastfed infants tolerate maternal doses up to 200 mg/day",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 9. VALPROATE
updateDrug("valproate", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || { value: "avoid", refs: [] },
    folic_acid: makeField(
      "High-risk teratogen affecting neural tube closure; supplement 4 to 5 mg/day preconception through the first trimester (though high-dose folic acid does not eliminate valproate teratogenicity or neurodevelopmental harm).",
      AAN,
      "Section 1: Folate Antagonist & High-Risk ASM Guidance",
      "Because older enzyme-inducing ASMs and valproate impair folate metabolism or carry elevated neural tube defect risk, clinical guidelines commonly supplement 4 to 5 mg/day",
      d.reproductive?.folic_acid
    ),
    contraception: makeField(
      "Does not reduce hormonal contraceptive efficacy, but highly effective user-independent contraception (e.g. IUD or implant) is mandatory in individuals of childbearing potential due to severe teratogenicity and neurodevelopmental risk.",
      AAN,
      "Section 2: Valproate Contraception & Pregnancy Prevention Mandate",
      "Valproate does not reduce hormonal contraceptive efficacy, but strict effective contraception (highly effective user-independent methods",
      d.reproductive?.contraception
    ),
    pregnancy_pk: makeField(
      "Total valproate serum levels decrease due to reduced albumin binding and volume expansion while unbound (free) valproate remains stable or rises; if unavoidable, monitor unbound levels and avoid unnecessary dose escalation.",
      AAN,
      "Section 4: Valproate PK & TDM",
      "Total valproate concentrations decrease during pregnancy owing to lower albumin binding and expanded volume of distribution",
      d.reproductive?.pregnancy_pk
    ),
    mcm: [
      makeMcm(
        "North American AED (NAAED) Pregnancy Registry",
        9.3,
        "6.4%–13.0%",
        323,
        "first-trimester monotherapy",
        AAN,
        "Section 3: Valproate — NAAED Pregnancy Registry",
        "The North American AED Pregnancy Registry reported major congenital malformations in 9.3% (95% CI: 6.4%–13.0%) of 323 infants exposed to valproate"
      ),
      makeMcm(
        "EURAP International Pregnancy Registry",
        10.3,
        "8.8%–12.0%",
        1381,
        "first-trimester monotherapy (>24% if >1,450 mg/day)",
        AAN,
        "Section 3: Valproate — EURAP Registry",
        "The EURAP International Pregnancy Registry reported major congenital malformations in 10.3% (95% CI: 8.8%–12.0%) of 1,381 infants exposed to valproate"
      ),
      makeMcm(
        "UK & Ireland Epilepsy and Pregnancy Register",
        6.7,
        "5.5%–8.3%",
        1220,
        "first-trimester monotherapy",
        AAN,
        "Section 3: Valproate — UK & Ireland Register",
        "The UK and Ireland Epilepsy and Pregnancy Register reported major congenital malformations in 6.7% (95% CI: 5.5%–8.3%) of 1,220 infants exposed to valproate"
      ),
    ],
    postpartum: makeField(
      "Serum albumin and protein binding normalize over the first 2 weeks postpartum; check unbound valproate levels and maintain the lowest effective dose while transitioning to a safer option when clinically feasible.",
      AAN,
      "Section 4: Valproate Postpartum Management",
      "Serum albumin and protein binding normalize over the first 2 weeks postpartum; review unbound concentrations and maintain the lowest effective postpartum dose",
      d.reproductive?.postpartum
    ),
    lactation_rid: makeField(
      "0.5% to 2.7% of the weight-adjusted maternal dosage",
      LACT,
      "LactMed: Valproate — Drug Levels",
      "Valproate is >90% protein-bound in maternal plasma, resulting in a very low relative infant dose of 0.5% to 2.7%",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Very low breast milk transfer (RID 0.5%–2.7%) with low infant serum concentrations; monitor breastfed babies for jaundice, unusual bruising/thrombocytopenia, and sedation due to rare idiosyncratic infant hepatotoxicity.",
      LACT,
      "LactMed: Valproate — Summary of Use during Lactation",
      "Breast milk levels of valproate are very low (RID 0.5% to 2.7%) and infant serum concentrations are generally low; however, because of rare idiosyncratic hepatotoxicity",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 10. GABAPENTIN
updateDrug("gabapentin", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || { value: "caution", refs: [] },
    folic_acid: makeField(
      "Prescribe at least 0.4 mg/day of folic acid preconception and through the first trimester per AAN/AES/SMFM preconception care when used for epilepsy.",
      AAN,
      "Section 1: Newer ASM Folic Acid Guidance",
      "Prescribe at least 0.4 mg/day of folic acid preconception and through the first trimester per standard AAN/AES/SMFM preconception care",
      d.reproductive?.folic_acid
    ),
    contraception: makeField(
      "Does not induce CYP enzymes or alter ethinylestradiol/levonorgestrel plasma concentrations; hormonal and intrauterine contraception remain fully effective.",
      AAN,
      "Section 2: Non-Enzyme-Inducing ASMs",
      "Clinical interaction studies demonstrate no clinically relevant reduction in ethinylestradiol or levonorgestrel plasma concentrations",
      d.reproductive?.contraception
    ),
    pregnancy_pk: makeField(
      "Renal clearance increases alongside elevated GFR in the 2nd and 3rd trimesters; monitor clinical seizure or symptom control closely and adjust dose as needed.",
      AAN,
      "Section 4: Gabapentin PK & TDM",
      "Renal clearance of gabapentin increases alongside rising glomerular filtration rate in the second and third trimesters",
      d.reproductive?.pregnancy_pk
    ),
    mcm: [
      makeMcm(
        "North American AED (NAAED) Pregnancy Registry",
        0.7,
        "0.02%–3.8%",
        145,
        "first-trimester monotherapy",
        AAN,
        "Section 3: Gabapentin — NAAED Pregnancy Registry",
        "The North American AED Pregnancy Registry reported major congenital malformations in 0.7% (95% CI: 0.02%–3.8%) of 145 infants exposed to gabapentin"
      ),
    ],
    postpartum: makeField(
      "Renal clearance normalizes rapidly postpartum; reduce dosage back toward pre-pregnancy baseline within 1–2 weeks after delivery if escalated during pregnancy to avoid maternal sedation.",
      AAN,
      "Section 4: Gabapentin Postpartum Management",
      "Renal clearance normalizes rapidly postpartum; reduce dosage back to pre-pregnancy baseline within 1 to 2 weeks",
      d.reproductive?.postpartum
    ),
    lactation_rid: makeField(
      "1.3% to 3.8% of the weight-adjusted maternal dosage",
      LACT,
      "LactMed: Gabapentin — Drug Levels",
      "Maternal doses up to 2,100 mg/day yield a relative infant dose of 1.3% to 3.8% of the weight-adjusted maternal dosage",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Low milk transfer (RID 1.3%–3.8%) with low infant plasma levels and no adverse events in small studies; generally acceptable during breastfeeding while monitoring infant for drowsiness and weight gain.",
      LACT,
      "LactMed: Gabapentin — Summary of Use during Lactation",
      "Low concentrations of gabapentin enter breast milk (RID 1.3% to 3.8%) and breastfed infants have low plasma levels",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 11. PREGABALIN
updateDrug("pregabalin", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || { value: "caution", refs: [] },
    folic_acid: makeField(
      "Prescribe at least 0.4 mg/day of folic acid preconception and through the first trimester per AAN/AES/SMFM preconception care when used as an antiseizure medication.",
      AAN,
      "Section 1: Newer ASM Folic Acid Guidance",
      "Prescribe at least 0.4 mg/day of folic acid preconception and through the first trimester per standard AAN/AES/SMFM preconception care",
      d.reproductive?.folic_acid
    ),
    contraception: makeField(
      "Does not alter ethinylestradiol or levonorgestrel pharmacokinetics; hormonal and intrauterine contraceptives remain fully effective.",
      AAN,
      "Section 2: Non-Enzyme-Inducing ASMs",
      "Clinical interaction studies demonstrate no clinically relevant reduction in ethinylestradiol or levonorgestrel plasma concentrations",
      d.reproductive?.contraception
    ),
    pregnancy_pk: makeField(
      "Eliminated nearly exclusively unchanged by the kidneys; pregnancy-related GFR elevation may reduce plasma exposure, so monitor clinical seizure or neuropathic symptom control closely.",
      AAN,
      "Section 4: Pregabalin PK & TDM",
      "As pregabalin is eliminated almost exclusively unchanged by the kidneys, pregnancy-related increases in GFR may lower plasma exposure",
      d.reproductive?.pregnancy_pk
    ),
    mcm: [
      makeMcm(
        "Nordic & International Cohort Registry",
        3.3,
        "2.1%–5.1%",
        471,
        "first-trimester monotherapy",
        AAN,
        "Section 3: Pregabalin — Nordic & International Cohort Registry",
        "Combined population-based pregnancy cohort data from the Nordic registers and international comparative studies reported major congenital malformations in 3.3%"
      ),
    ],
    postpartum: makeField(
      "If dosage was increased during pregnancy, step down toward pre-pregnancy dosing within 1–2 weeks postpartum as renal clearance returns to baseline.",
      AAN,
      "Section 4: Pregabalin Postpartum Management",
      "If pregabalin dosage was increased during pregnancy, step down to pre-pregnancy dosing within 1 to 2 weeks postpartum",
      d.reproductive?.postpartum
    ),
    lactation_rid: makeField(
      "Approximately 7% of the weight-adjusted maternal dosage",
      LACT,
      "LactMed: Pregabalin — Drug Levels",
      "Human milk pharmacokinetic data indicate an average relative infant dose of approximately 7% of the weight-adjusted maternal pregabalin dosage",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Moderate human milk exposure (RID ~7%); while the FDA label advises against breastfeeding based on rodent tumorigenicity signals, small clinical observations show no acute infant toxicity. Monitor for sedation and poor weight gain if maternal therapy is essential.",
      LACT,
      "LactMed: Pregabalin — Summary of Use during Lactation",
      "While the FDA label advises against breastfeeding due to animal rodent tumorigenicity signals, human milk exposure is moderate (RID ~7%)",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 12. LACOSAMIDE
updateDrug("lacosamide", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || { value: "caution", refs: [] },
    folic_acid: makeField(
      "Prescribe at least 0.4 mg/day of folic acid preconception and through the first trimester per AAN/AES/SMFM preconception care.",
      AAN,
      "Section 1: Newer ASM Folic Acid Guidance",
      "Prescribe at least 0.4 mg/day of folic acid preconception and through the first trimester per standard AAN/AES/SMFM preconception care",
      d.reproductive?.folic_acid
    ),
    contraception: makeField(
      "Does not alter ethinylestradiol or levonorgestrel plasma concentrations; hormonal and intrauterine contraception remain effective.",
      AAN,
      "Section 2: Non-Enzyme-Inducing ASMs",
      "Clinical interaction studies demonstrate no clinically relevant reduction in ethinylestradiol or levonorgestrel plasma concentrations",
      d.reproductive?.contraception
    ),
    pregnancy_pk: makeField(
      "Limited MONEAD and PK series show dose-normalized lacosamide levels drop ~30%–40% during pregnancy due to increased renal clearance; consider monthly or trimester TDM and adjust dose based on seizure control.",
      AAN,
      "Section 4: Lacosamide PK & TDM",
      "Limited MONEAD and pharmacokinetic series show lacosamide dose-normalized concentrations decrease by approximately 30% to 40%",
      d.reproductive?.pregnancy_pk
    ),
    mcm: [
      makeMcm(
        "UCB Global & EURAP Registry Cohort",
        2.3,
        "0.5%–6.5%",
        131,
        "first-trimester monotherapy",
        AAN,
        "Section 3: Lacosamide — UCB Global & EURAP Cohort",
        "Prospective pregnancy surveillance data reported major congenital malformations in 2.3% (95% CI: 0.5%–6.5%) of 131 infants exposed to lacosamide"
      ),
    ],
    postpartum: makeField(
      "If lacosamide dosage was escalated during pregnancy, taper back toward pre-pregnancy baseline over 10–14 days postpartum to reduce risk of PR prolongation, dizziness, or diplopia.",
      AAN,
      "Section 4: Lacosamide Postpartum Management",
      "If lacosamide dosage was increased during pregnancy, taper back toward pre-pregnancy baseline over 10 to 14 days postpartum",
      d.reproductive?.postpartum
    ),
    lactation_rid: makeField(
      "1.8% to 3.3% of the weight-adjusted maternal dosage",
      LACT,
      "LactMed: Lacosamide — Drug Levels",
      "Published lactation case data report a relative infant dose of 1.8% to 3.3% of the weight-adjusted maternal lacosamide dosage",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Enters breast milk in low amounts (RID 1.8%–3.3%), though clinical nursing data remain limited; monitor breastfed infants closely for drowsiness, adequate weight gain, and developmental milestones.",
      LACT,
      "LactMed: Lacosamide — Summary of Use during Lactation",
      "Although lacosamide enters breast milk in low amounts (RID 1.8% to 3.3%), clinical experience in nursing infants remains limited",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 13. BRIVARACETAM
updateDrug("brivaracetam", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || { value: "caution", refs: [] },
    folic_acid: makeField(
      "Prescribe at least 0.4 mg/day of folic acid preconception and through the first trimester per AAN/AES/SMFM preconception care.",
      AAN,
      "Section 1: Newer ASM Folic Acid Guidance",
      "Prescribe at least 0.4 mg/day of folic acid preconception and through the first trimester per standard AAN/AES/SMFM preconception care",
      d.reproductive?.folic_acid
    ),
    contraception: makeField(
      "Standard doses up to 100 mg/day have minimal clinically significant effect on combined oral contraceptives (high 400 mg/day dose reduces ethinylestradiol/levonorgestrel AUC by 22%–27%).",
      AAN,
      "Section 2: Brivaracetam Contraceptive Guidance",
      "Brivaracetam at 400 mg/day (twice the maximum recommended daily dose) modestly reduces ethinylestradiol and levonorgestrel AUC by 22% to 27%",
      d.reproductive?.contraception
    ),
    pregnancy_pk: makeField(
      "Pregnancy-specific clearance data are limited, though renal metabolite excretion and hepatic hydrolysis may slightly lower levels; monitor seizure control closely each trimester and check levels if available.",
      AAN,
      "Section 4: Brivaracetam PK & TDM",
      "Pregnancy-specific clearance data for brivaracetam are limited, though renal excretion of metabolites and hepatic hydrolysis may slightly reduce concentrations",
      d.reproductive?.pregnancy_pk
    ),
    mcm: d.reproductive?.mcm || [],
    postpartum: makeField(
      "If dose was escalated during pregnancy for breakthrough seizures, reassess within 2 weeks postpartum and step down toward pre-pregnancy baseline if somnolence or dizziness develops.",
      AAN,
      "Section 4: Brivaracetam Postpartum Management",
      "If brivaracetam dose was escalated during pregnancy for breakthrough seizures, reassess within 2 weeks postpartum",
      d.reproductive?.postpartum
    ),
    lactation_rid: makeField(
      "Estimated < 5% of the weight-adjusted maternal dosage (limited case data)",
      LACT,
      "LactMed: Brivaracetam — Drug Levels",
      "Limited data indicate brivaracetam is excreted into human milk in small amounts, with an estimated relative infant dose below 5%",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Limited published lactation experience (estimated RID < 5%); an alternative such as levetiracetam may be preferred for newborns/preterm infants. If used, monitor infant for drowsiness, poor feeding, and weight gain.",
      LACT,
      "LactMed: Brivaracetam — Summary of Use during Lactation",
      "Because published experience with brivaracetam during breastfeeding is limited, an alternate drug may be preferred especially while nursing a newborn",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 14. PERAMPANEL
updateDrug("perampanel", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || { value: "caution", refs: [] },
    folic_acid: makeField(
      "Prescribe at least 0.4 mg/day of folic acid preconception and through the first trimester per AAN/AES/SMFM preconception care.",
      AAN,
      "Section 1: Newer ASM Folic Acid Guidance",
      "Prescribe at least 0.4 mg/day of folic acid preconception and through the first trimester per standard AAN/AES/SMFM preconception care",
      d.reproductive?.folic_acid
    ),
    contraception: makeField(
      "At 12 mg/day, perampanel decreases levonorgestrel exposure by ~40%, reducing progestin-containing contraceptive efficacy; advise additional non-hormonal contraception or an IUD at higher doses.",
      AAN,
      "Section 2: Perampanel Contraceptive Guidance",
      "Perampanel at 12 mg/day decreases levonorgestrel exposure by approximately 40%, reducing efficacy of progestin-containing hormonal contraceptives",
      d.reproductive?.contraception
    ),
    pregnancy_pk: makeField(
      "Pregnancy PK data are sparse; because perampanel undergoes CYP3A4 metabolism, monitor seizure frequency closely across trimesters and check serum levels where available.",
      AAN,
      "Section 4: Perampanel PK & TDM",
      "Pregnancy pharmacokinetic data for perampanel are sparse; because perampanel is metabolized via CYP3A4, monitor seizure frequency closely",
      d.reproductive?.pregnancy_pk
    ),
    mcm: d.reproductive?.mcm || [],
    postpartum: makeField(
      "Due to its prolonged half-life (~105 hours), taper any pregnancy-escalated dose back toward pre-pregnancy baseline gradually over 2–3 weeks postpartum while monitoring for somnolence and behavioral adverse effects.",
      AAN,
      "Section 4: Perampanel Postpartum Management",
      "Due to perampanel's prolonged half-life (~105 hours), any postpartum dose reduction back toward pre-pregnancy baseline should be performed gradually",
      d.reproductive?.postpartum
    ),
    lactation_rid: makeField(
      "Approximately 1% to 3% of the weight-adjusted maternal dosage (estimated)",
      LACT,
      "LactMed: Perampanel — Drug Levels",
      "Pharmacokinetic modeling based on high maternal plasma protein binding (~95%) estimates a low relative infant dose of approximately 1% to 3%",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Clinical human milk data are lacking (estimated RID 1%–3% based on ~95% protein binding), and its long half-life raises theoretical neonatal accumulation risk; monitor infant closely for somnolence, irritability, and poor feeding.",
      LACT,
      "LactMed: Perampanel — Summary of Use during Lactation",
      "Clinical data on perampanel in human milk are lacking and its prolonged elimination half-life raises theoretical accumulation risk in neonates",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 15. CLOBAZAM
updateDrug("clobazam", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || { value: "caution", refs: [] },
    folic_acid: makeField(
      "Prescribe at least 0.4 mg/day of folic acid preconception and through the first trimester per AAN/AES/SMFM preconception care when used as an adjunctive antiseizure medication.",
      AAN,
      "Section 1: Newer ASM Folic Acid Guidance",
      "Prescribe at least 0.4 mg/day of folic acid preconception and through the first trimester per standard AAN/AES/SMFM preconception care",
      d.reproductive?.folic_acid
    ),
    contraception: makeField(
      "Weak CYP3A4 inducer that may lower serum levels of CYP3A4-metabolized hormonal contraceptives; recommend adding a non-hormonal barrier method or using an intrauterine device.",
      AAN,
      "Section 2: Clobazam Contraceptive Guidance",
      "Clobazam is a weak CYP3A4 inducer that may reduce serum concentrations of hormonal contraceptives metabolized by CYP3A4",
      d.reproductive?.contraception
    ),
    pregnancy_pk: makeField(
      "Limited pregnancy PK data exist for clobazam and N-desmethylclobazam; monitor clinical seizure control closely and avoid high 3rd-trimester doses near delivery to minimize neonatal sedation, hypotonia, and withdrawal.",
      AAN,
      "Section 4: Clobazam PK & TDM",
      "Limited pregnancy PK data exist for clobazam and its active metabolite N-desmethylclobazam; monitor seizure control closely",
      d.reproductive?.pregnancy_pk
    ),
    mcm: d.reproductive?.mcm || [],
    postpartum: makeField(
      "Reassess maternal sedation and taper any pregnancy-escalated dose gradually over 2–3 weeks postpartum (never stop abruptly), while observing the newborn for respiratory depression or withdrawal.",
      AAN,
      "Section 4: Clobazam Postpartum Management",
      "Reassess maternal sedation and taper any pregnancy-escalated dose gradually over 2 to 3 weeks postpartum (avoiding abrupt discontinuation)",
      d.reproductive?.postpartum
    ),
    lactation_rid: makeField(
      "Approximately 3% to 7% of the weight-adjusted maternal dosage",
      LACT,
      "LactMed: Clobazam — Drug Levels",
      "Combined milk transfer of clobazam and its active metabolite N-desmethylclobazam yields a relative infant dose of approximately 3% to 7%",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Clobazam and active N-desmethylclobazam enter breast milk (RID ~3%–7%) and can accumulate in young infants; monitor closely for sedation, poor feeding, and weight gain, and consider a safer option for neonates.",
      LACT,
      "LactMed: Clobazam — Summary of Use during Lactation",
      "Limited data indicate clobazam and N-desmethylclobazam enter breast milk and can accumulate slightly in young infants",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 16. DIAZEPAM
updateDrug("diazepam", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || { value: "caution", refs: [] },
    folic_acid: naField(),
    contraception: makeField(
      "Does not induce CYP3A4 metabolism of hormonal contraceptives, though chronic benzodiazepine exposure in planned pregnancy warrants preconception transition to safer maintenance options.",
      AAN,
      "Section 2: Diazepam & Midazolam Acute Contraception Note",
      "Neither diazepam nor midazolam induces CYP3A4 metabolism of hormonal contraceptives",
      d.reproductive?.contraception
    ),
    pregnancy_pk: makeField(
      "Volume of distribution rises and albumin binding drops in pregnancy, prolonging elimination half-life; acute status epilepticus dosing needs no routine TDM, while prolonged late-pregnancy exposure risks neonatal sedation and withdrawal.",
      AAN,
      "Section 4: Diazepam PK & TDM",
      "Maternal diazepam volume of distribution increases and albumin binding decreases during pregnancy, prolonging elimination half-life",
      d.reproductive?.pregnancy_pk
    ),
    mcm: d.reproductive?.mcm || [],
    postpartum: naField(),
    lactation_rid: makeField(
      "3% to 9% of the weight-adjusted maternal dosage",
      LACT,
      "LactMed: Diazepam — Drug Levels",
      "Combined transfer of diazepam and its long-acting active metabolite desmethyldiazepam yields a relative infant dose of approximately 3% to 9%",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Repeated maternal doses cause infant accumulation of long-acting desmethyldiazepam (RID 3%–9%), risking lethargy, sedation, and poor weight gain; a single emergency dose is unlikely to harm older infants, whereas repeated use warrants monitoring or a shorter-acting alternative.",
      LACT,
      "LactMed: Diazepam — Summary of Use during Lactation",
      "Repeated maternal doses of diazepam during breastfeeding can cause infant accumulation of desmethyldiazepam",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

// 17. MIDAZOLAM
updateDrug("midazolam", (d) => {
  d.reproductive = {
    tier: d.reproductive?.tier || { value: "caution", refs: [] },
    folic_acid: naField(),
    contraception: naField(),
    pregnancy_pk: makeField(
      "CYP3A4 induction modestly increases midazolam clearance during pregnancy; acute IV/IM status epilepticus or procedural bolus dosing uses standard weight-based emergency dosing without chronic TDM.",
      AAN,
      "Section 4: Midazolam PK & TDM",
      "Maternal midazolam clearance increases slightly during pregnancy due to CYP3A4 induction",
      d.reproductive?.pregnancy_pk
    ),
    mcm: d.reproductive?.mcm || [],
    postpartum: naField(),
    lactation_rid: makeField(
      "0.1% to 0.6% of the weight-adjusted maternal dosage (single IV dose)",
      LACT,
      "LactMed: Midazolam — Drug Levels",
      "Single intravenous maternal doses of midazolam result in a relative infant dose of 0.1% to 0.6%",
      d.reproductive?.lactation_rid
    ),
    lactation_summary: makeField(
      "Very low transfer after a single IV dose (RID 0.1%–0.6%); milk levels are negligible by 4 hours and no interruption of breastfeeding is needed for healthy term infants. Monitor for sedation with repeated ICU infusions.",
      LACT,
      "LactMed: Midazolam — Summary of Use during Lactation",
      "Following a single intravenous dose of midazolam for procedures or acute seizure control, milk concentrations are negligible by 4 hours",
      d.reproductive?.lactation_summary
    ),
  };
  return syncVerificationHash(d);
});

console.log("=== WAVE 1 COMPLETE (17/17 DRUGS) ===");
