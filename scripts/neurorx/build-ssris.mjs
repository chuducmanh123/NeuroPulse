import fs from "node:fs";
import path from "node:path";

const SOURCES_DIR = path.resolve(process.cwd(), "data/neurorx/sources");
const DRUGS_DIR = path.resolve(process.cwd(), "data/neurorx/drugs");

const cache = new Map();
function loadSource(sourceId) {
  if (!cache.has(sourceId)) {
    cache.set(
      sourceId,
      fs.readFileSync(path.join(SOURCES_DIR, `${sourceId}.txt`), "utf-8")
    );
  }
  return cache.get(sourceId);
}

function ref(sourceId, locator, anchor, maxLen = 350) {
  const text = loadSource(sourceId);
  const idx = text.indexOf(anchor);
  if (idx === -1) {
    throw new Error(`Anchor not found in ${sourceId}: ${anchor}`);
  }
  let slice = text.slice(idx, idx + maxLen);
  if (slice.length === maxLen) {
    const lastSpace = slice.lastIndexOf(" ");
    if (lastSpace > 50) slice = slice.slice(0, lastSpace);
  }
  const quote = slice.trim();
  if (!text.includes(quote)) {
    throw new Error(`Verbatim check failed in ${sourceId} for: ${quote}`);
  }
  return { source_id: sourceId, locator, quote };
}

function draftMeta() {
  return {
    status: "draft",
    verification: {
      verified_by: null,
      verified_at: null,
      content_hash: null,
    },
  };
}

function nullVnBhyt() {
  return {
    vn_products: {
      value: null,
      refs: [],
      note: "Pending user source submission",
    },
    bhyt: {
      value: null,
      refs: [],
      note: "BHYT circular data pending user source submission",
    },
  };
}

// ============================================================================
// 1. FLUOXETINE
// ============================================================================
const FLU = "fda-fluoxetine-label";
const fluoxetine = {
  id: "fluoxetine",
  generic_name: "fluoxetine",
  tall_man: {
    value: "fluoxetine",
    refs: [ref(FLU, "1 INDICATIONS AND USAGE", "PROZAC ® is a selective serotonin reuptake inhibitor indicated for:", 110)],
    note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
  },
  classes: ["antidepressant", "selective serotonin reuptake inhibitor", "SSRI"],
  subspecialties: ["other"],
  ...nullVnBhyt(),
  regimens: [
    {
      id: "flu-po-mdd",
      indication: "Major Depressive Disorder (Adults)",
      setting: "maintenance_outpatient",
      route: "PO",
      refs: [
        ref(FLU, "2.1 Major Depressive Disorder", "Initiate PROZAC 20 mg/day orally in the morning. Consider a dose increase after several weeks if insufficient clinical improvement is observed. Administer doses above 20 mg/day once daily in the morning or twice daily (i.e., morning and noon).The maximum fluoxetine dose should not exceed 80 mg/day.", 300),
      ],
      dose: { kind: "fixed", amount: 20, unit: "mg", frequency: "once daily in the morning (max 80 mg/day)", max_single: 80, max_daily: 80 },
      dose_text: "Initial: 20 mg/day orally in the morning. May increase after several weeks (once daily AM or BID AM/noon) up to maximum 80 mg/day.",
    },
    {
      id: "flu-po-ocd",
      indication: "Obsessive Compulsive Disorder (Adults)",
      setting: "maintenance_outpatient",
      route: "PO",
      refs: [
        ref(FLU, "2 DOSAGE AND ADMINISTRATION", "OCD ( 2.2 ) 20 mg/day in am (initial dose)", 80),
      ],
      dose: { kind: "fixed", amount: 20, unit: "mg", frequency: "once daily in the morning (recommended 20–60 mg/day; max 80 mg/day)", max_single: 80, max_daily: 80 },
      dose_text: "Initial: 20 mg/day orally in the morning; usual range 20 to 60 mg/day; maximum 80 mg/day.",
    },
    {
      id: "flu-po-bulimia",
      indication: "Bulimia Nervosa (Adults)",
      setting: "maintenance_outpatient",
      route: "PO",
      refs: [
        ref(FLU, "2 DOSAGE AND ADMINISTRATION", "Bulimia Nervosa ( 2.3 ) 60 mg/day in am", 60),
      ],
      dose: { kind: "fixed", amount: 60, unit: "mg", frequency: "once daily in the morning", max_single: 60, max_daily: 60 },
      dose_text: "60 mg/day orally in the morning (may titrate over several days in some patients).",
    },
    {
      id: "flu-po-panic",
      indication: "Panic Disorder (Adults)",
      setting: "maintenance_outpatient",
      route: "PO",
      refs: [
        ref(FLU, "2 DOSAGE AND ADMINISTRATION", "Panic Disorder ( 2.4 ) 10 mg/day (initial dose)", 70),
      ],
      dose: { kind: "fixed", amount: 10, unit: "mg", frequency: "once daily initially, increase to 20 mg/day after 1 week (max 60 mg/day)", max_single: 60, max_daily: 60 },
      dose_text: "Initial: 10 mg/day orally; increase to 20 mg/day after 1 week (usual range 20–60 mg/day; max 60 mg/day).",
    },
  ],
  renal_basis: {
    value: "cg_abw",
    refs: [ref(FLU, "12.3 Pharmacokinetics — Renal Impairment", "use of a lower or less frequent dose is not routinely necessary in renally impaired patients.", 110)],
  },
  renal_impairment: {
    description: "Use of a lower or less frequent dose is not routinely necessary in renally impaired patients.",
    renal_basis: {
      value: "cg_abw",
      refs: [ref(FLU, "12.3 Pharmacokinetics — Renal Impairment", "use of a lower or less frequent dose is not routinely necessary in renally impaired patients.", 110)],
    },
    bands: [],
    refs: [ref(FLU, "12.3 Pharmacokinetics — Renal Impairment", "use of a lower or less frequent dose is not routinely necessary in renally impaired patients.", 110)],
  },
  hepatic: {
    value: "A lower or less frequent dosage should be used in patients with hepatic impairment (cirrhosis).",
    refs: [ref(FLU, "2 DOSAGE AND ADMINISTRATION", "A lower or less frequent dosage should be used in patients with hepatic impairment, the elderly, and for patients with concurrent disease or on multiple concomitant medications", 180)],
  },
  black_box: {
    value: [
      "WARNING: SUICIDAL THOUGHTS AND BEHAVIORS: Antidepressants increased the risk of suicidal thoughts and behavior in children, adolescents, and young adults in short-term studies. Monitor closely for worsening and emergence of suicidal thoughts and behaviors.",
    ],
    refs: [ref(FLU, "BOXED WARNING", "WARNING: SUICIDAL THOUGHTS AND BEHAVIORS Antidepressants increased the risk of suicidal thoughts and behavior in children, adolescents, and young adults in short-term studies.", 200)],
  },
  mg_safety: {
    value: "safe",
    refs: [ref(FLU, "12.1 Mechanism of Action", "PROZAC ® is a selective serotonin reuptake inhibitor", 70)],
    note: "SSRIs do not impair neuromuscular transmission; no MG warning in FDA label.",
  },
  ng_tube: { value: null, refs: [], note: "No enteral tube administration instructions in FDA label." },
  pgx: {
    value: "Metabolized via CYP2D6 and inhibits CYP2D6. PROZAC can also prolong the QT interval; exercise caution in CYP2D6 poor metabolizers or with CYP2D6 substrates/QT-prolonging drugs.",
    refs: [ref(FLU, "5 Warnings and Precautions / Clinical Pharmacology", "CYP2D6. PROZAC can also prolong the QT interval.", 60)],
  },
  ae_tags: {
    value: ["serotonin_syndrome", "hyponatremia", "qt_prolongation", "sedation_somnolence", "weight_loss"],
    refs: [
      ref(FLU, "6.1 Clinical Trials Experience", "Most common adverse reactions (≥5% and at least twice that for placebo) associated with: Major Depressive Disorder, Obsessive Compulsive Disorder, Bulimia, and Panic Disorder: abnormal dreams, abnormal ejaculation, anorexia, anxiety, asthenia, diarrhea, dry mouth, dyspepsia, flu syndrome, impotence, insomnia, libido decreased, nausea, nervousness, pharyngitis, rash, sinusitis, somnolence, sweating, tremor", 340),
    ],
  },
  adverse_effects: {
    most_common: {
      value: ["Nausea, diarrhea, dyspepsia, dry mouth, anorexia", "Insomnia, somnolence, anxiety, nervousness, abnormal dreams, tremor", "Asthenia, sweating, rash, vasodilatation", "Decreased libido, abnormal ejaculation, impotence"],
      refs: [ref(FLU, "6.1 Clinical Trials Experience", "Most common adverse reactions (≥5% and at least twice that for placebo)", 340)],
    },
    serious: {
      value: ["Suicidal thoughts and behaviors in pediatric and young adult patients", "Serotonin syndrome", "QT interval prolongation and ventricular arrhythmias", "Abnormal bleeding (especially with NSAIDs/antiplatelets/anticoagulants)", "Hyponatremia / SIADH, seizures, activation of mania/hypomania, angle-closure glaucoma"],
      refs: [ref(FLU, "6 ADVERSE REACTIONS", "Suicidal Thoughts and Behaviors in Children, Adolescents, and Young Adults [see Boxed Warning and Warnings and Precautions ( 5.1 )] Serotonin Syndrome [see Warnings and Precautions ( 5.2 )]", 220)],
    },
  },
  mechanism_of_action: {
    value: "Selective serotonin reuptake inhibitor (SSRI) that potentiates serotonergic activity in the CNS by inhibiting neuronal reuptake of serotonin.",
    refs: [ref(FLU, "12.1 Mechanism of Action", "Although the exact mechanism of PROZAC is unknown, it is presumed to be linked to its inhibition of CNS neuronal uptake of serotonin.", 160)],
  },
  enzyme_profile: {
    value: { cyp2d6: "inhibitor_strong", qt_risk: "possible", serotonergic: true },
    refs: [ref(FLU, "5 / 12.3 CYP2D6 & QT", "CYP2D6. PROZAC can also prolong the QT interval.", 60)],
  },
  fda_interactions: {
    value: [
      {
        drug_or_class: "MAOIs (including linezolid and IV methylene blue)",
        severity: "contraindicated",
        effect: "High risk of potentially fatal serotonin syndrome.",
        management: "Contraindicated; allow at least 5 weeks after stopping fluoxetine before starting an MAOI (and 14 days after stopping an MAOI before starting fluoxetine).",
        refs: [ref(FLU, "4 CONTRAINDICATIONS", "Do not use MAOIs intended to treat psychiatric disorders with PROZAC or within 5 weeks of stopping treatment with PROZAC. Do not use PROZAC within 14 days of stopping an MAOI", 200)],
      },
      {
        drug_or_class: "Pimozide and Thioridazine",
        severity: "contraindicated",
        effect: "Risk of QT interval prolongation and elevated plasma levels of pimozide/thioridazine.",
        management: "Contraindicated; do not use thioridazine within 5 weeks of discontinuing fluoxetine.",
        refs: [ref(FLU, "4.2 Contraindications", "Thioridazine: Do not use. Risk of QT interval prolongation and elevated thioridazine plasma levels. Do not use thioridazine within 5 weeks of discontinuing PROZAC.", 180)],
      },
    ],
    refs: [ref(FLU, "4 CONTRAINDICATIONS", "Do not use MAOIs intended to treat psychiatric disorders with PROZAC or within 5 weeks of stopping treatment with PROZAC.", 150)],
  },
  reproductive: {
    tier: {
      value: "caution",
      note: "Epidemiologic studies have not established an increased risk of major birth defects or miscarriage, but SSRI exposure carries risks of PPHN, poor neonatal adaptation, and <2-fold increased postpartum hemorrhage risk; present in human milk with reports of infant agitation/irritability/poor feeding.",
      refs: [ref(FLU, "8.1 Pregnancy — Risk Summary", "Available data from published epidemiologic studies and postmarketing reports over several decades have not established an increased risk of major birth defects or miscarriage.", 180)],
    },
    mcm: [],
    folic_acid: { value: null, refs: [], note: "Not clinically applicable" },
    contraception: { value: null, refs: [], note: "No hormonal contraceptive interaction reported in FDA label." },
    pregnancy_pk: {
      value: "Published epidemiologic studies have not established an increased risk of major birth defects or miscarriage. Exposure in the month before delivery is associated with a <2-fold increase in postpartum hemorrhage; late-pregnancy exposure carries risks of persistent pulmonary hypertension of the newborn (PPHN) and poor neonatal adaptation.",
      refs: [
        ref(FLU, "8.1 Pregnancy — Risk Summary", "Based on data from published observational studies, exposure to SSRIs, particularly in the month before delivery, has been associated with a less than 2-fold increase in the risk of postpartum hemorrhage", 220),
        ref(FLU, "8 USE IN SPECIFIC POPULATIONS", "Pregnancy: SSRI use, particularly later in pregnancy, may increase risk for persistent pulmonary hypertension and symptoms of poor adaptation (respiratory distress, temperature instability, feeding difficulty, hypotonia, tremor, irritability) in the neonate", 280),
      ],
    },
    postpartum: {
      value: "Monitor for postpartum hemorrhage if exposed in the month before delivery, and monitor breastfed infants for agitation, irritability, poor feeding, and poor weight gain.",
      refs: [ref(FLU, "8.2 Lactation — Risk Summary", "There are reports of agitation, irritability, poor feeding, and poor weight gain in infants exposed to fluoxetine through breast milk", 150)],
    },
    lactation_rid: { value: null, refs: [], note: "No RID percentage reported in FDA label." },
    lactation_summary: {
      value: "Fluoxetine and norfluoxetine are present in human milk; reports exist of agitation, irritability, poor feeding, and poor weight gain in breastfed infants. Weigh developmental/health benefits of breastfeeding against maternal clinical need.",
      refs: [ref(FLU, "8.2 Lactation — Risk Summary", "Data from published literature report the presence of fluoxetine and norfluoxetine in human milk (see Data). There are reports of agitation, irritability, poor feeding, and poor weight gain in infants exposed to fluoxetine through breast milk", 260)],
    },
  },
  ...draftMeta(),
};

// ============================================================================
// 2. SERTRALINE
// ============================================================================
const SER = "fda-sertraline-label";
const sertraline = {
  id: "sertraline",
  generic_name: "sertraline",
  tall_man: {
    value: "sertraline",
    refs: [ref(SER, "2 DOSAGE AND ADMINISTRATION", "The recommended initial dosage and maximum ZOLOFT dosage in patients with MDD, OCD, PD, PTSD, and SAD", 120)],
    note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
  },
  classes: ["antidepressant", "selective serotonin reuptake inhibitor", "SSRI"],
  subspecialties: ["other"],
  ...nullVnBhyt(),
  regimens: [
    {
      id: "ser-po-mdd-ocd",
      indication: "Major Depressive Disorder & Obsessive Compulsive Disorder (Adults)",
      setting: "maintenance_outpatient",
      route: "PO",
      refs: [ref(SER, "2.1 Dosage in Patients with MDD, OCD, PD, PTSD, and SAD", "Table 1: Recommended Daily Dosage of ZOLOFT in Patients with MDD, OCD, PD, PTSD, and SAD Indication Starting Dose Therapeutic Range Adults MDD 50 mg 50-200 mg OCD 50 mg", 180)],
      dose: { kind: "fixed", amount: 50, unit: "mg", frequency: "once daily (titrate by 25–50 mg/day weekly; max 200 mg/day)", max_single: 200, max_daily: 200 },
      dose_text: "Initial: 50 mg orally once daily; titrate in 25–50 mg/day increments at intervals of >=1 week up to maximum 200 mg/day.",
    },
    {
      id: "ser-po-pd-ptsd-sad",
      indication: "Panic Disorder, PTSD, and Social Anxiety Disorder (Adults)",
      setting: "maintenance_outpatient",
      route: "PO",
      refs: [ref(SER, "2 DOSAGE AND ADMINISTRATION", "PD, PTSD, SAD ( 2.1 ) 25 mg per day 200 mg per day", 60)],
      dose: { kind: "fixed", amount: 25, unit: "mg", frequency: "once daily (titrate by 25–50 mg/day weekly; max 200 mg/day)", max_single: 200, max_daily: 200 },
      dose_text: "Initial: 25 mg orally once daily; titrate in 25–50 mg/day increments weekly up to maximum 200 mg/day.",
    },
    {
      id: "ser-po-pmdd",
      indication: "Premenstrual Dysphoric Disorder (PMDD)",
      setting: "maintenance_outpatient",
      route: "PO",
      refs: [ref(SER, "2.2 Dosage in Patients with PMDD", "The recommended starting ZOLOFT dosage in adult women with PMDD is 50 mg per day.", 95)],
      dose: { kind: "fixed", amount: 50, unit: "mg", frequency: "once daily continuously (max 150 mg/day) or luteal phase only (max 100 mg/day)", max_single: 150, max_daily: 150 },
      dose_text: "Initial: 50 mg/day continuously throughout cycle (max 150 mg/day) or intermittently during luteal phase only (max 100 mg/day).",
    },
  ],
  renal_basis: {
    value: "cg_abw",
    refs: [ref(SER, "8 USE IN SPECIFIC POPULATIONS — Renal Impairment", "No dose adjustment is needed in patients with mild to severe renal impairment. Sertraline exposure does not appear to be affected by renal impairment", 160)],
  },
  renal_impairment: {
    description: "No dose adjustment is needed in patients with mild to severe renal impairment.",
    renal_basis: {
      value: "cg_abw",
      refs: [ref(SER, "8 USE IN SPECIFIC POPULATIONS — Renal Impairment", "No dose adjustment is needed in patients with mild to severe renal impairment.", 90)],
    },
    bands: [],
    refs: [ref(SER, "8 USE IN SPECIFIC POPULATIONS — Renal Impairment", "No dose adjustment is needed in patients with mild to severe renal impairment. Sertraline exposure does not appear to be affected by renal impairment", 160)],
  },
  hepatic: {
    value: "Mild hepatic impairment: recommended starting and maximum dosage is half the recommended dosage. Moderate or severe hepatic impairment: not recommended.",
    refs: [ref(SER, "2 DOSAGE AND ADMINISTRATION", "Hepatic impairment: o Mild: Recommended starting and maximum dosage is half recommended dosage ( 2.4 ) o Moderate or severe: Not recommended", 150)],
  },
  black_box: {
    value: [
      "WARNING: SUICIDAL THOUGHTS AND BEHAVIORS: Antidepressants increased the risk of suicidal thoughts and behaviors in pediatric and young adult patients in short-term trials. Closely monitor all antidepressant-treated patients for clinical worsening and emergence of suicidal thoughts and behaviors.",
    ],
    refs: [ref(SER, "BOXED WARNING", "WARNING: SUICIDAL THOUGHTS AND BEHAVIORS", 50)],
  },
  mg_safety: {
    value: "safe",
    refs: [ref(SER, "12.1 Mechanism of Action", "Sertraline", 20)],
    note: "SSRIs do not impair neuromuscular transmission; no MG warning in FDA label.",
  },
  ng_tube: { value: null, refs: [], note: "Oral solution must be diluted before administration; no NG tube instructions in FDA label." },
  pgx: { value: null, refs: [], note: "No specific PGx dosing table in FDA label." },
  ae_tags: {
    value: ["serotonin_syndrome", "hyponatremia", "sedation_somnolence"],
    refs: [ref(SER, "6 ADVERSE REACTIONS", "Most common adverse reactions", 60)],
  },
  adverse_effects: {
    most_common: {
      value: ["Nausea, diarrhea/loose stool, dyspepsia, decreased appetite", "Insomnia, somnolence, dizziness, tremor, fatigue", "Sweating increased, ejaculation failure, decreased libido"],
      refs: [ref(SER, "6 ADVERSE REACTIONS", "Most common adverse reactions", 200)],
    },
    serious: {
      value: ["Suicidal thoughts and behaviors in pediatric and young adult patients", "Serotonin syndrome", "Abnormal bleeding", "Hyponatremia, seizures, activation of mania/hypomania, angle-closure glaucoma", "QTc prolongation / Torsades de Pointes (rare postmarketing)"],
      refs: [ref(SER, "6 ADVERSE REACTIONS", "QTc prolongation and ventricular arrhythmias when taken with pimozide", 75)],
    },
  },
  mechanism_of_action: {
    value: "Selective serotonin reuptake inhibitor (SSRI) that potentiates serotonergic activity in the CNS by inhibiting neuronal reuptake of serotonin (5-HT).",
    refs: [ref(SER, "12.1 Mechanism of Action", "Sertraline potentiates serotonergic activity in the central nervous system through inhibition of neuronal reuptake of serotonin (5-HT).", 150)],
  },
  enzyme_profile: {
    value: { cyp2d6: "inhibitor_weak", qt_risk: "conditional", serotonergic: true },
    refs: [ref(SER, "7 DRUG INTERACTIONS", "CYP2D6 substrates: Reduce dosage of drugs metabolized by CYP2D6.", 70)],
  },
  fda_interactions: {
    value: [
      {
        drug_or_class: "MAOIs (including linezolid and IV methylene blue) & Pimozide",
        severity: "contraindicated",
        effect: "Risk of serotonin syndrome (MAOIs) or QT prolongation/ventricular arrhythmias (pimozide).",
        management: "Contraindicated; allow >=14 days washout between MAOI and sertraline.",
        refs: [ref(SER, "4 CONTRAINDICATIONS", "Taking, or within 14 days of stopping, MAOIs", 80)],
      },
      {
        drug_or_class: "CYP2D6 Substrates",
        severity: "moderate",
        effect: "Sertraline inhibits CYP2D6 and increases plasma concentrations of CYP2D6 substrates.",
        management: "Reduce dosage of drugs metabolized by CYP2D6 when coadministered with sertraline.",
        refs: [ref(SER, "7 DRUG INTERACTIONS", "CYP2D6 substrates: Reduce dosage of drugs metabolized by CYP2D6.", 70)],
      },
    ],
    refs: [ref(SER, "7 DRUG INTERACTIONS", "CYP2D6 substrates: Reduce dosage of drugs metabolized by CYP2D6.", 70)],
  },
  reproductive: {
    tier: {
      value: "caution",
      note: "First-trimester epidemiologic studies suggest no difference in major birth defects compared to background, but late-pregnancy exposure carries risks of PPHN, neonatal withdrawal/poor adaptation, and <2-fold postpartum hemorrhage risk; low levels in human milk.",
      refs: [ref(SER, "8.1 Pregnancy — Risk Summary", "Overall, available published epidemiologic studies of pregnant women exposed to sertraline in the first trimester suggest no difference in major birth defect risk compared to the background rate for major birth defects in comparator populations.", 250)],
    },
    mcm: [],
    folic_acid: { value: null, refs: [], note: "Not clinically applicable" },
    contraception: { value: null, refs: [], note: "No hormonal contraceptive interaction reported in FDA label." },
    pregnancy_pk: {
      value: "First-trimester epidemiologic studies suggest no difference in major birth defect risk vs background. Exposure in the month before delivery is associated with <2-fold increased postpartum hemorrhage risk; third-trimester exposure may increase risk of PPHN and neonatal withdrawal/poor adaptation.",
      refs: [ref(SER, "8.1 Pregnancy — Risk Summary", "Based on data from published observational studies, exposure to SSRIs, particularly in the month before delivery, has been associated with a less than 2-fold increase in the risk of postpartum hemorrhage", 220)],
    },
    postpartum: {
      value: "Monitor for postpartum hemorrhage if exposed in the month before delivery. Low levels in human milk; in a pooled analysis of 53 mother-infant pairs, exclusively breastfed infants had an average of 2% (range 0%–15%) of maternal serum sertraline levels with no adverse reactions observed.",
      refs: [ref(SER, "8.2 Lactation — Data", "In a published pooled analysis of 53 mother-infant pairs, exclusively human milk-fed infants had an average of 2% (range 0% to 15%) of the sertraline serum levels measured in their mothers. No adverse reactions were observed in these infants.", 260)],
    },
    lactation_rid: { value: null, refs: [], note: "FDA label reports infant serum levels averaging 2% (0–15%) of maternal serum levels; no RID % stated." },
    lactation_summary: {
      value: "Published literature demonstrates low levels of sertraline and its metabolites in human milk (infant serum levels averaged 2% [range 0%–15%] of maternal serum in 53 pairs, with no adverse reactions observed).",
      refs: [ref(SER, "8.2 Lactation — Risk Summary", "Available data from published literature demonstrate low levels of sertraline and its metabolites in human milk", 120)],
    },
  },
  ...draftMeta(),
};

// ============================================================================
// 3. ESCITALOPRAM
// ============================================================================
const ESC = "fda-escitalopram-label";
const escitalopram = {
  id: "escitalopram",
  generic_name: "escitalopram",
  tall_man: {
    value: "escitalopram",
    refs: [ref(ESC, "12.1 Mechanism of Action", "The mechanism of antidepressant action of escitalopram, the S-enantiomer of racemic citalopram", 110)],
    note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
  },
  classes: ["antidepressant", "selective serotonin reuptake inhibitor", "SSRI"],
  subspecialties: ["other"],
  ...nullVnBhyt(),
  regimens: [
    {
      id: "esc-po-mdd",
      indication: "Major Depressive Disorder (Adults & Adolescents >=12 years)",
      setting: "maintenance_outpatient",
      route: "PO",
      refs: [ref(ESC, "2.1 Major Depressive Disorder", "The recommended dosage of Lexapro in adults is 10 mg once daily. A fixed-dose trial of Lexapro demonstrated the effectiveness of both 10 mg and 20 mg of Lexapro, but failed to demonstrate a greater benefit of 20 mg over 10 mg", 250)],
      dose: { kind: "fixed", amount: 10, unit: "mg", frequency: "once daily (max 20 mg/day after >=1 week in adults or >=3 weeks in adolescents)", max_single: 20, max_daily: 20 },
      dose_text: "Initial/Recommended: 10 mg orally once daily (morning or evening, with or without food). May increase to max 20 mg/day after >=1 week (adults) or >=3 weeks (pediatrics). Elderly/hepatic impairment: 10 mg once daily.",
    },
    {
      id: "esc-po-gad",
      indication: "Generalized Anxiety Disorder (Adults & Pediatrics >=7 years)",
      setting: "maintenance_outpatient",
      route: "PO",
      refs: [ref(ESC, "2.2 Generalized Anxiety Disorder", "The recommended starting dosage of Lexapro in adults is 10 mg once daily. Depending on clinical response and tolerability, dosage may be increased to the maximum recommended dosage of 20 mg once daily at an interval of no less than 1 week.", 260)],
      dose: { kind: "fixed", amount: 10, unit: "mg", frequency: "once daily (max 20 mg/day)", max_single: 20, max_daily: 20 },
      dose_text: "Initial: 10 mg orally once daily; may increase to maximum 20 mg/day after >=1 week if needed.",
    },
  ],
  renal_basis: {
    value: "cg_abw",
    refs: [ref(ESC, "8.7 Renal Impairment", "Pharmacokinetics of Lexapro in patients with a creatinine clearance less than 20 mL/minute has not been evaluated. No dosage adjustment is necessary for patients with mild or moderate renal impairment", 210)],
  },
  renal_impairment: {
    description: "No dosage adjustment is necessary for mild or moderate renal impairment; pharmacokinetics in CrCl <20 mL/min has not been evaluated.",
    renal_basis: {
      value: "cg_abw",
      refs: [ref(ESC, "8.7 Renal Impairment", "No dosage adjustment is necessary for patients with mild or moderate renal impairment", 90)],
    },
    bands: [
      {
        min: 20,
        max: null,
        dose_text: "No dosage adjustment necessary for mild or moderate renal impairment.",
        refs: [ref(ESC, "8.7 Renal Impairment", "No dosage adjustment is necessary for patients with mild or moderate renal impairment", 90)],
      },
      {
        min: 0,
        max: 19,
        dose_text: "CrCl <20 mL/min: pharmacokinetics has not been evaluated; use with caution.",
        refs: [ref(ESC, "8.7 Renal Impairment", "Pharmacokinetics of Lexapro in patients with a creatinine clearance less than 20 mL/minute has not been evaluated.", 115)],
      },
    ],
    refs: [ref(ESC, "8.7 Renal Impairment", "Pharmacokinetics of Lexapro in patients with a creatinine clearance less than 20 mL/minute has not been evaluated. No dosage adjustment is necessary for patients with mild or moderate renal impairment", 210)],
  },
  hepatic: {
    value: "Recommended dosage in patients with hepatic impairment is 10 mg once daily.",
    refs: [ref(ESC, "2 DOSAGE AND ADMINISTRATION", "Hepatic impairment: recommended dosage is 10 mg once daily", 70)],
  },
  black_box: {
    value: [
      "WARNING: SUICIDAL THOUGHTS AND BEHAVIORS: Antidepressants increased the risk of suicidal thoughts and behavior in pediatric and young adult patients in short-term trials. Closely monitor all antidepressant-treated patients for clinical worsening and emergence of suicidal thoughts and behaviors.",
    ],
    refs: [ref(ESC, "BOXED WARNING", "WARNING: SUICIDAL THOUGHTS AND BEHAVIORS", 50)],
  },
  mg_safety: {
    value: "safe",
    refs: [ref(ESC, "12.1 Mechanism of Action", "The mechanism of antidepressant action of escitalopram, the S-enantiomer of racemic citalopram", 110)],
    note: "SSRIs do not impair neuromuscular transmission; no MG warning in FDA label.",
  },
  ng_tube: { value: null, refs: [], note: "No enteral tube administration instructions in FDA label." },
  pgx: { value: null, refs: [], note: "No specific PGx dosing recommendation in Lexapro FDA label." },
  ae_tags: {
    value: ["serotonin_syndrome", "hyponatremia", "sedation_somnolence"],
    refs: [ref(ESC, "6 ADVERSE REACTIONS", "Most commonly observed adverse reactions (incidence ≥ 5% and at least twice the incidence of placebo patients) are:", 120)],
  },
  adverse_effects: {
    most_common: {
      value: ["Nausea, diarrhea, constipation, dry mouth", "Insomnia, somnolence, dizziness, fatigue", "Ejaculation disorder, decreased libido, anorgasmia, increased sweating"],
      refs: [ref(ESC, "6 ADVERSE REACTIONS", "Most commonly observed adverse reactions (incidence ≥ 5% and at least twice the incidence of placebo patients) are:", 200)],
    },
    serious: {
      value: ["Suicidal thoughts and behaviors in pediatric and young adult patients", "Serotonin syndrome", "Abnormal bleeding", "Hyponatremia / SIADH, seizures, activation of mania/hypomania, angle-closure glaucoma"],
      refs: [ref(ESC, "6 ADVERSE REACTIONS", "Serotonin syndrome [see Warnings and Precautions ( 5.2 )]", 60)],
    },
  },
  mechanism_of_action: {
    value: "Highly selective serotonin reuptake inhibitor (SSRI); escitalopram is the S-enantiomer of racemic citalopram and is at least 100-fold more potent than the R-enantiomer at inhibiting 5-HT reuptake.",
    refs: [ref(ESC, "12.1 & 12.2 Mechanism of Action", "Escitalopram is at least 100-fold more potent than the R-enantiomer with respect to inhibition of 5-HT reuptake and inhibition of 5-HT neuronal firing rate.", 165)],
  },
  enzyme_profile: {
    value: { cyp2c19: "substrate", cyp3a4: "substrate", qt_risk: "conditional", serotonergic: true },
    refs: [ref(ESC, "7 DRUG INTERACTIONS", "Lexapro is contraindicated in patients taking pimozide", 70)],
  },
  fda_interactions: {
    value: [
      {
        drug_or_class: "MAOIs (including linezolid and IV methylene blue) & Pimozide",
        severity: "contraindicated",
        effect: "Risk of serotonin syndrome (MAOIs) or QT prolongation/ventricular arrhythmias (pimozide).",
        management: "Contraindicated; allow >=14 days between MAOI and escitalopram.",
        refs: [ref(ESC, "4 CONTRAINDICATIONS", "Do not use MAOIs intended to treat psychiatric disorders with Lexapro or within 14 days of stopping treatment with Lexapro.", 140)],
      },
    ],
    refs: [ref(ESC, "7 DRUG INTERACTIONS", "Lexapro is contraindicated in patients taking MAOIs, including MAOIs such as linezolid or intravenous methylene blue", 120)],
  },
  reproductive: {
    tier: {
      value: "caution",
      note: "Epidemiologic studies and postmarketing reports have not established an increased risk of major birth defects or miscarriage, but SSRI exposure carries risks of PPHN, poor neonatal adaptation, and <2-fold postpartum hemorrhage risk; present in human milk.",
      refs: [ref(ESC, "8.1 Pregnancy — Risk Summary", "Available data from published epidemiologic studies and postmarketing reports have not established an increased risk of major birth defects or miscarriage.", 165)],
    },
    mcm: [],
    folic_acid: { value: null, refs: [], note: "Not clinically applicable" },
    contraception: { value: null, refs: [], note: "No hormonal contraceptive interaction reported in FDA label." },
    pregnancy_pk: {
      value: "Available epidemiologic studies have not established an increased risk of major birth defects or miscarriage. Exposure in the month before delivery is associated with <2-fold increased postpartum hemorrhage risk; late-pregnancy exposure may cause PPHN and poor neonatal adaptation.",
      refs: [ref(ESC, "8.1 Pregnancy — Risk Summary", "Based on data from published observational studies, exposure to SSRIs, particularly in the month before delivery, has been associated with a less than 2-fold increase in the risk of postpartum hemorrhage", 220)],
    },
    postpartum: {
      value: "Monitor for postpartum hemorrhage if exposed in the month before delivery, and monitor breastfed infants for excessive sedation, restlessness, agitation, poor feeding, and poor weight gain.",
      refs: [ref(ESC, "8.2 Lactation — Risk Summary", "There are reports of excessive sedation, restlessness, agitation, poor feeding and poor weight gain in infants exposed to escitalopram, through breast milk", 170)],
    },
    lactation_rid: { value: null, refs: [], note: "No RID percentage reported in FDA label." },
    lactation_summary: {
      value: "Escitalopram and desmethylescitalopram are present in human milk; reports exist of excessive sedation, restlessness, agitation, poor feeding, and poor weight gain in breastfed infants.",
      refs: [ref(ESC, "8.2 Lactation — Risk Summary", "Data from the published literature report the presence of escitalopram and desmethylescitalopram in human milk (see Data ). There are reports of excessive sedation, restlessness, agitation, poor feeding and poor weight gain in infants exposed to escitalopram, through breast milk", 290)],
    },
  },
  ...draftMeta(),
};

// ============================================================================
// 4. CITALOPRAM
// ============================================================================
const CIT = "fda-citalopram-label";
const citalopram = {
  id: "citalopram",
  generic_name: "citalopram",
  tall_man: {
    value: "citalopram",
    refs: [ref(CIT, "1 INDICATIONS AND USAGE", "CELEXA is a selective serotonin reuptake inhibitor (SSRI) indicated for the treatment of major depressive disorder (MDD) in adults", 140)],
    note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
  },
  classes: ["antidepressant", "selective serotonin reuptake inhibitor", "SSRI"],
  subspecialties: ["other"],
  ...nullVnBhyt(),
  regimens: [
    {
      id: "cit-po-mdd",
      indication: "Major Depressive Disorder (Adults)",
      setting: "maintenance_outpatient",
      route: "PO",
      refs: [ref(CIT, "2.1 Recommended Dosage", "Administer CELEXA once daily, with or without food, at an initial dosage of 20 mg once daily, with an increase to a maximum dosage of 40 mg once daily at an interval of no less than one week. Dosages above 40 mg once daily are not recommended due to the risk of QT prolongation", 290)],
      dose: { kind: "fixed", amount: 20, unit: "mg", frequency: "once daily (max 40 mg/day; max 20 mg/day if >60 y, hepatic impairment, CYP2C19 PM, or CYP2C19 inhibitor)", max_single: 40, max_daily: 40 },
      dose_text: "Initial: 20 mg orally once daily; may increase to maximum 40 mg once daily after >=1 week (>40 mg/day NOT recommended due to QT prolongation). Max 20 mg/day in patients >60 years, hepatic impairment, CYP2C19 poor metabolizers, or concomitant CYP2C19 inhibitors.",
    },
  ],
  renal_basis: {
    value: "cg_abw",
    refs: [ref(CIT, "12.3 Pharmacokinetics — Renal Impairment", "In patients with mild to moderate renal impairment, oral clearance of citalopram was reduced by 17% compared to normal subjects.", 140)],
  },
  renal_impairment: {
    description: "In mild to moderate renal impairment, oral clearance was reduced by 17% compared to normal subjects; no routine dose adjustment specified for mild-moderate RI, but use caution in severe renal impairment.",
    renal_basis: {
      value: "cg_abw",
      refs: [ref(CIT, "12.3 Pharmacokinetics — Renal Impairment", "In patients with mild to moderate renal impairment, oral clearance of citalopram was reduced by 17% compared to normal subjects.", 140)],
    },
    bands: [],
    refs: [ref(CIT, "12.3 Pharmacokinetics — Renal Impairment", "In patients with mild to moderate renal impairment, oral clearance of citalopram was reduced by 17% compared to normal subjects.", 140)],
  },
  hepatic: {
    value: "Maximum recommended dosage in patients with hepatic impairment is 20 mg once daily.",
    refs: [ref(CIT, "2.3 Recommended Dosage for Specific Populations", "The maximum recommended dosage of CELEXA for patients who are greater than 60 years of age, patients with hepatic impairment, and for CYP2C19 poor metabolizers is 20 mg once daily", 190)],
  },
  black_box: {
    value: [
      "WARNING: SUICIDAL THOUGHTS AND BEHAVIORS: Antidepressants increased the risk of suicidal thoughts and behaviors in pediatric and young adult patients in short-term studies. Closely monitor all antidepressant-treated patients for clinical worsening and emergence of suicidal thoughts and behaviors.",
    ],
    refs: [ref(CIT, "BOXED WARNING", "WARNING: SUICIDAL THOUGHTS AND BEHAVIORS", 50)],
  },
  mg_safety: {
    value: "safe",
    refs: [ref(CIT, "1 INDICATIONS AND USAGE", "CELEXA is a selective serotonin reuptake inhibitor (SSRI)", 60)],
    note: "SSRIs do not impair neuromuscular transmission; no MG warning in FDA label.",
  },
  ng_tube: { value: null, refs: [], note: "No enteral tube administration instructions in FDA label." },
  pgx: {
    value: "CYP2C19 poor metabolizers: maximum recommended dosage is 20 mg once daily due to increased citalopram exposure and QT prolongation risk.",
    refs: [ref(CIT, "2.3 Recommended Dosage for Specific Populations", "The maximum recommended dosage of CELEXA for patients who are greater than 60 years of age, patients with hepatic impairment, and for CYP2C19 poor metabolizers is 20 mg once daily", 190)],
  },
  ae_tags: {
    value: ["qt_prolongation", "serotonin_syndrome", "hyponatremia", "sedation_somnolence"],
    refs: [ref(CIT, "2.1 Recommended Dosage", "Dosages above 40 mg once daily are not recommended due to the risk of QT prolongation", 90)],
  },
  adverse_effects: {
    most_common: {
      value: ["Nausea, dry mouth, diarrhea, dyspepsia", "Somnolence, insomnia, fatigue, tremor", "Increased sweating, ejaculation disorder, decreased libido, impotence"],
      refs: [ref(CIT, "6 ADVERSE REACTIONS", "QT-prolongation and torsade de pointes [see Warnings and Precautions ( 5.2 )]", 80)],
    },
    serious: {
      value: ["Dose-dependent QT interval prolongation and Torsades de Pointes", "Suicidal thoughts and behaviors in pediatric and young adult patients", "Serotonin syndrome", "Abnormal bleeding", "Hyponatremia / SIADH, seizures, mania/hypomania, angle-closure glaucoma"],
      refs: [ref(CIT, "2.1 Recommended Dosage", "Dosages above 40 mg once daily are not recommended due to the risk of QT prolongation", 90)],
    },
  },
  mechanism_of_action: {
    value: "Selective serotonin reuptake inhibitor (SSRI) that potentiates serotonergic activity in the CNS by inhibiting neuronal reuptake of serotonin.",
    refs: [ref(CIT, "1 INDICATIONS AND USAGE", "CELEXA is a selective serotonin reuptake inhibitor (SSRI) indicated for the treatment of major depressive disorder (MDD) in adults", 130)],
  },
  enzyme_profile: {
    value: { cyp2c19: "substrate", cyp3a4: "substrate", qt_risk: "known", serotonergic: true },
    refs: [ref(CIT, "2.1 & 2.3 QT Prolongation & CYP2C19", "Dosages above 40 mg once daily are not recommended due to the risk of QT prolongation", 90)],
  },
  fda_interactions: {
    value: [
      {
        drug_or_class: "MAOIs (including linezolid and IV methylene blue) & Pimozide",
        severity: "contraindicated",
        effect: "Risk of serotonin syndrome (MAOIs) or QT prolongation/ventricular arrhythmias (pimozide).",
        management: "Contraindicated; allow >=14 days between MAOI and citalopram.",
        refs: [ref(CIT, "4 CONTRAINDICATIONS", "taking, or within 14 days of stopping, MAOIs (including MAOIs such as linezolid or intravenous methylene blue) because of an increased risk of serotonin syndrome", 160)],
      },
      {
        drug_or_class: "CYP2C19 Inhibitors & QT-Prolonging Drugs",
        severity: "major",
        effect: "CYP2C19 inhibitors increase citalopram exposure and QT prolongation risk; QT-prolonging drugs cause additive QTc prolongation.",
        management: "Maximum recommended dosage of citalopram with concomitant CYP2C19 inhibitors is 20 mg once daily; avoid concomitant QT-prolonging drugs.",
        refs: [ref(CIT, "2.4 Dosage Modifications with Concomitant Use of CYP2C19 Inhibitors", "The maximum recommended dosage of CELEXA when used concomitantly with a CYP2C19 inhibitor is 20 mg once daily", 120)],
      },
    ],
    refs: [ref(CIT, "7 DRUG INTERACTIONS", "Avoid concomitant use of CELEXA with drugs that prolong the QT interval", 80)],
  },
  reproductive: {
    tier: {
      value: "caution",
      note: "Epidemiologic studies and postmarketing reports have not established an increased risk of major birth defects or miscarriage, but cord blood/amniotic fluid levels match maternal serum and late-pregnancy exposure carries risks of PPHN, poor neonatal adaptation, and <2-fold postpartum hemorrhage; present in human milk (RID 0.7%–9.4%).",
      refs: [ref(CIT, "8.1 Pregnancy — Risk Summary", "Available data from published epidemiologic studies and postmarketing reports with citalopram use in pregnancy have not established an increased risk of major birth defects or miscarriage.", 185)],
    },
    mcm: [],
    folic_acid: { value: null, refs: [], note: "Not clinically applicable" },
    contraception: { value: null, refs: [], note: "No hormonal contraceptive interaction reported in FDA label." },
    pregnancy_pk: {
      value: "Citalopram levels in cord blood and amniotic fluid are similar to maternal serum. Epidemiologic studies have not established an increased risk of major birth defects or miscarriage; however, exposure in the month before delivery is associated with <2-fold increased postpartum hemorrhage risk, and late-pregnancy exposure carries risks of PPHN and poor neonatal adaptation.",
      refs: [ref(CIT, "8.1 Pregnancy — Risk Summary", "Published studies demonstrated that citalopram levels in both cord blood and amniotic fluid are similar to those observed in maternal serum.", 140)],
    },
    postpartum: {
      value: "Monitor for postpartum hemorrhage if exposed in the month before delivery, and monitor breastfed infants for irritability, restlessness, excessive somnolence, decreased feeding, and weight loss.",
      refs: [ref(CIT, "8.2 Lactation — Risk Summary", "There are reports of breastfed infants exposed to citalopram experiencing irritability, restlessness, excessive somnolence, decreased feeding, and weight loss", 160)],
    },
    lactation_rid: {
      value: "0.7% to 9.4% of maternal weight-adjusted dosage (milk/plasma ratio 0.78–4.3)",
      refs: [ref(CIT, "8.2 Lactation — Risk Summary", "Data from the published literature report the presence of citalopram in human milk at relative infant doses ranging between 0.7 to 9.4% of the maternal weight-adjusted dosage and a milk/plasma ratio ranging between 0.78 to 4.3.", 230)],
    },
    lactation_summary: {
      value: "Present in human milk at RID 0.7% to 9.4% (milk/plasma ratio 0.78–4.3); reports exist of infant irritability, restlessness, excessive somnolence, decreased feeding, and weight loss.",
      refs: [ref(CIT, "8.2 Lactation — Risk Summary", "Data from the published literature report the presence of citalopram in human milk at relative infant doses ranging between 0.7 to 9.4% of the maternal weight-adjusted dosage and a milk/plasma ratio ranging between 0.78 to 4.3.", 230)],
    },
  },
  ...draftMeta(),
};

// ============================================================================
// 5. PAROXETINE (PAXIL CR)
// ============================================================================
const PAR = "fda-paroxetine-label";
const paroxetine = {
  id: "paroxetine",
  generic_name: "paroxetine",
  tall_man: {
    value: "paroxetine",
    refs: [ref(PAR, "2.2 Important Administration Instructions", "Administer PAXIL CR once daily in the morning, with or without food.", 80)],
    note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
  },
  classes: ["antidepressant", "selective serotonin reuptake inhibitor", "SSRI"],
  subspecialties: ["other"],
  ...nullVnBhyt(),
  regimens: [
    {
      id: "par-po-mdd-cr",
      indication: "Major Depressive Disorder (Adults — PAXIL CR)",
      setting: "maintenance_outpatient",
      route: "PO",
      refs: [ref(PAR, "2.3 Dosage in Patients with MDD, PD, and SAD", "Table 1: Recommended Daily Dosage of PAXIL CR in Patients with MDD, PD, and SAD Indication Starting Dosage Maximum Dosage MDD 25 mg 62.5 mg", 150)],
      dose: { kind: "fixed", amount: 25, unit: "mg", frequency: "once daily in the morning (max 62.5 mg/day; elderly/severe RI/severe HI: start 12.5 mg, max 50 mg)", max_single: 62.5, max_daily: 62.5 },
      dose_text: "Initial: 25 mg once daily in the morning (swallow whole); titrate by 12.5 mg/day weekly up to max 62.5 mg/day. Elderly, severe renal, or severe hepatic impairment: start 12.5 mg/day, max 50 mg/day.",
    },
    {
      id: "par-po-pd-cr",
      indication: "Panic Disorder (Adults — PAXIL CR)",
      setting: "maintenance_outpatient",
      route: "PO",
      refs: [ref(PAR, "2 DOSAGE AND ADMINISTRATION", "PD 12.5 mg/day 75 mg/day", 40)],
      dose: { kind: "fixed", amount: 12.5, unit: "mg", frequency: "once daily in the morning (max 75 mg/day; elderly/severe RI/HI: max 50 mg/day)", max_single: 75, max_daily: 75 },
      dose_text: "Initial: 12.5 mg once daily in the morning; titrate by 12.5 mg/day weekly up to max 75 mg/day (max 50 mg/day in elderly, severe renal, or severe hepatic impairment).",
    },
    {
      id: "par-po-sad-cr",
      indication: "Social Anxiety Disorder (Adults — PAXIL CR)",
      setting: "maintenance_outpatient",
      route: "PO",
      refs: [ref(PAR, "2 DOSAGE AND ADMINISTRATION", "SAD 12.5 mg/day 37.5 mg/day", 40)],
      dose: { kind: "fixed", amount: 12.5, unit: "mg", frequency: "once daily in the morning (max 37.5 mg/day)", max_single: 37.5, max_daily: 37.5 },
      dose_text: "Initial: 12.5 mg once daily in the morning; titrate by 12.5 mg/day weekly up to max 37.5 mg/day.",
    },
    {
      id: "par-po-pmdd-cr",
      indication: "Premenstrual Dysphoric Disorder (Adults — PAXIL CR)",
      setting: "maintenance_outpatient",
      route: "PO",
      refs: [ref(PAR, "2 DOSAGE AND ADMINISTRATION", "PMDD 12.5 mg/day 25 mg/day", 40)],
      dose: { kind: "fixed", amount: 12.5, unit: "mg", frequency: "once daily in the morning continuously or luteal phase only (max 25 mg/day)", max_single: 25, max_daily: 25 },
      dose_text: "Initial: 12.5 mg once daily in the morning (continuously or luteal phase only); max 25 mg/day.",
    },
  ],
  renal_basis: {
    value: "cg_abw",
    refs: [ref(PAR, "8.6 Renal Impairment", "The recommended starting and maximum dosage of PAXIL CR is lower in patients with severe RI compared to those with normal renal function", 140)],
  },
  renal_impairment: {
    description: "Plasma concentrations increase with greater degrees of renal impairment. In severe renal impairment, starting dosage is 12.5 mg/day and maximum dosage is 50 mg/day (MDD/PD) or 37.5 mg/day (SAD).",
    renal_basis: {
      value: "cg_abw",
      refs: [ref(PAR, "8.6 Renal Impairment", "The recommended starting and maximum dosage of PAXIL CR is lower in patients with severe RI compared to those with normal renal function", 140)],
    },
    bands: [
      {
        min: 0,
        max: 29,
        dose_text: "Severe renal impairment: start 12.5 mg/day; max 50 mg/day (MDD or PD) or 37.5 mg/day (SAD).",
        refs: [ref(PAR, "2 DOSAGE AND ADMINISTRATION", "Geriatric patients, patients with severe renal impairment or severe hepatic impairment: Starting dosage is 12.5 mg/day and the maximum dosage for MDD or PD is 50 mg/day and for SAD is 37.5 mg/day.", 200)],
      },
    ],
    refs: [ref(PAR, "8.6 Renal Impairment", "Paroxetine plasma concentrations were higher in patients with greater degrees of RI. The recommended starting and maximum dosage of PAXIL CR is lower in patients with severe RI compared to those with normal renal function", 220)],
  },
  hepatic: {
    value: "Severe hepatic impairment: starting dosage is 12.5 mg/day and maximum dosage is 50 mg/day (MDD or PD) or 37.5 mg/day (SAD).",
    refs: [ref(PAR, "2 DOSAGE AND ADMINISTRATION", "Geriatric patients, patients with severe renal impairment or severe hepatic impairment: Starting dosage is 12.5 mg/day and the maximum dosage for MDD or PD is 50 mg/day and for SAD is 37.5 mg/day.", 200)],
  },
  black_box: {
    value: [
      "WARNING: SUICIDAL THOUGHTS AND BEHAVIORS: Antidepressants increased the risk of suicidal thoughts and behavior in pediatric and young adult patients in short-term studies. Closely monitor all antidepressant-treated patients for clinical worsening and emergence of suicidal thoughts and behaviors.",
    ],
    refs: [ref(PAR, "BOXED WARNING", "WARNING: SUICIDAL THOUGHTS AND BEHAVIORS", 50)],
  },
  mg_safety: {
    value: "safe",
    refs: [ref(PAR, "12.1 Mechanism of Action", "paroxetine", 20)],
    note: "SSRIs do not impair neuromuscular transmission; no MG warning in FDA label.",
  },
  ng_tube: {
    value: {
      crushable: false,
      instructions: "Swallow extended-release (PAXIL CR) tablets whole and do not chew or crush.",
    },
    refs: [ref(PAR, "2.2 Important Administration Instructions", "Swallow the extended-release tablets whole and do not chew or crush.", 70)],
  },
  pgx: {
    value: "Metabolized by CYP2D6 and strongly inhibits CYP2D6; consider dose adjustments for CYP2D6 substrates.",
    refs: [ref(PAR, "4 CONTRAINDICATIONS", "CYP2D6 substrates", 30)],
  },
  ae_tags: {
    value: ["serotonin_syndrome", "hyponatremia", "sedation_somnolence"],
    refs: [ref(PAR, "6.1 Clinical Trials Experience", "Most common adverse reactions (≥5% and at least twice placebo) in placebo-controlled MDD, PD, SAD, and PMDD clinical trials: abnormal ejaculation, abnormal vision, asthenia, constipation, decreased appetite, diarrhea, dizziness, dry mouth, female genital disorder, impotence, insomnia, libido decreased, nausea, somnolence, sweating, tremor.", 340)],
  },
  adverse_effects: {
    most_common: {
      value: ["Nausea, dry mouth, constipation, diarrhea, decreased appetite", "Somnolence, dizziness, insomnia, tremor, asthenia, sweating", "Abnormal ejaculation, impotence, female genital disorder, decreased libido, abnormal vision"],
      refs: [ref(PAR, "6.1 Clinical Trials Experience", "Most common adverse reactions (≥5% and at least twice placebo) in placebo-controlled MDD, PD, SAD, and PMDD clinical trials", 340)],
    },
    serious: {
      value: ["Suicidal thoughts and behaviors in pediatric and young adult patients", "Serotonin syndrome", "Cardiovascular malformations (first-trimester exposure), PPHN, and poor neonatal adaptation", "Abnormal bleeding, hyponatremia, seizures, angle-closure glaucoma, Stevens-Johnson syndrome/anaphylaxis"],
      refs: [ref(PAR, "8.1 Pregnancy — Risk Summary", "Paroxetine is associated with a less than 2-fold increase in cardiovascular malformations when administered to a pregnant woman during the first trimester.", 160)],
    },
  },
  mechanism_of_action: {
    value: "Selective serotonin reuptake inhibitor (SSRI) that potentiates serotonergic activity in the CNS via inhibition of neuronal serotonin reuptake.",
    refs: [ref(PAR, "12.1 Mechanism of Action", "paroxetine", 20)],
  },
  enzyme_profile: {
    value: { cyp2d6: "inhibitor_strong", qt_risk: "none", serotonergic: true },
    refs: [ref(PAR, "4 CONTRAINDICATIONS", "CYP2D6 substrates", 30)],
  },
  fda_interactions: {
    value: [
      {
        drug_or_class: "MAOIs (including linezolid and IV methylene blue), Thioridazine, and Pimozide",
        severity: "contraindicated",
        effect: "Risk of serotonin syndrome (MAOIs) or QT prolongation/arrhythmias (thioridazine, pimozide via CYP2D6 inhibition).",
        management: "Contraindicated; allow >=14 days between MAOI and paroxetine.",
        refs: [ref(PAR, "4 CONTRAINDICATIONS", "Taking, or within 14 days of stopping monoamine oxidase inhibitor", 70)],
      },
    ],
    refs: [ref(PAR, "4 CONTRAINDICATIONS", "PAXIL CR is contraindicated in patients: Taking, or within 14 days of stopping monoamine oxidase inhibitor", 110)],
  },
  reproductive: {
    tier: {
      value: "avoid",
      note: "FDA label advises initiating PAXIL CR in women intending pregnancy or in the first trimester only after considering other treatment options, as paroxetine is associated with a <2-fold increase in cardiovascular malformations in the first trimester, plus PPHN, poor neonatal adaptation, and <2-fold postpartum hemorrhage risk.",
      refs: [
        ref(PAR, "8.1 Pregnancy — Risk Summary", "For women who intend to become pregnant or who are in their first trimester of pregnancy, PAXIL CR should be initiated only after consideration of the other available treatment options.", 190),
        ref(PAR, "8.1 Pregnancy — Risk Summary", "Paroxetine is associated with a less than 2-fold increase in cardiovascular malformations when administered to a pregnant woman during the first trimester.", 160),
      ],
    },
    mcm: [],
    folic_acid: { value: null, refs: [], note: "Not clinically applicable" },
    contraception: { value: null, refs: [], note: "No hormonal contraceptive interaction reported in FDA label (note: paroxetine may affect sperm quality in males)." },
    pregnancy_pk: {
      value: "Avoid in women intending pregnancy or in the first trimester unless other options are considered (<2-fold increase in cardiovascular malformations in 1st trimester). Also carries risks of PPHN, poor neonatal adaptation, and <2-fold increased postpartum hemorrhage if exposed in the month before delivery.",
      refs: [ref(PAR, "8.1 Pregnancy — Risk Summary", "Paroxetine is associated with a less than 2-fold increase in cardiovascular malformations when administered to a pregnant woman during the first trimester.", 160)],
    },
    postpartum: {
      value: "Monitor for postpartum hemorrhage if exposed in the month before delivery, and monitor breastfed infants for agitation, irritability, poor feeding, and poor weight gain.",
      refs: [ref(PAR, "8.2 Lactation — Risk Summary", "There are reports of agitation, irritability, poor feeding and poor weight gain in infants exposedto paroxetine through breast milk", 140)],
    },
    lactation_rid: { value: null, refs: [], note: "No RID percentage reported in FDA label." },
    lactation_summary: {
      value: "Present in human milk; reports exist of agitation, irritability, poor feeding, and poor weight gain in breastfed infants. Monitor exposed nursing infants closely.",
      refs: [ref(PAR, "8.2 Lactation — Risk Summary", "Data from the published literature report the presence of paroxetine in human milk ( see Data ).There are reports of agitation, irritability, poor feeding and poor weight gain in infants exposedto paroxetine through breast milk", 230)],
    },
  },
  ...draftMeta(),
};

// ============================================================================
// 6. FLUVOXAMINE
// ============================================================================
const FLV = "fda-fluvoxamine-label";
const fluvoxamine = {
  id: "fluvoxamine",
  generic_name: "fluvoxamine",
  tall_man: {
    value: "fluvoxamine",
    refs: [ref(FLV, "2.1 OCD (Obsessive Compulsive Disorder)", "The recommended starting dose is 100 mg at bedtime, with weekly increases of 50 mg as tolerated to maximum therapeutic benefit, not to exceed 300 mg per day.", 165)],
    note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
  },
  classes: ["antidepressant", "selective serotonin reuptake inhibitor", "SSRI"],
  subspecialties: ["other"],
  ...nullVnBhyt(),
  regimens: [
    {
      id: "flv-po-ocd-er",
      indication: "Obsessive Compulsive Disorder (Adults — Extended-Release Capsules)",
      setting: "maintenance_outpatient",
      route: "PO",
      refs: [ref(FLV, "2.1 OCD (Obsessive Compulsive Disorder)", "The recommended starting dose is 100 mg at bedtime, with weekly increases of 50 mg as tolerated to maximum therapeutic benefit, not to exceed 300 mg per day. Capsules should not be crushed or chewed.", 210)],
      dose: { kind: "fixed", amount: 100, unit: "mg", frequency: "once daily at bedtime (weekly 50 mg increments as tolerated; max 300 mg/day)", max_single: 300, max_daily: 300 },
      dose_text: "Initial: 100 mg orally at bedtime; increase by 50 mg weekly as tolerated to maximum 300 mg/day. Do not crush or chew capsules.",
    },
  ],
  renal_basis: { value: null, refs: [], note: "No specific renal dose adjustment in FDA label." },
  hepatic: {
    value: "Patients with hepatic impairment have decreased clearance of fluvoxamine maleate; titrate slowly following the initial dose.",
    refs: [ref(FLV, "2.3 Dosage for Elderly or Hepatically Impaired Patients", "Elderly patients and those with hepatic impairment have been observed to have a decreased clearance of fluvoxamine maleate. Consequently, it may be appropriate to titrate slowly following the initial dose of 100 mg in these patient groups.", 240)],
  },
  black_box: {
    value: [
      "WARNING: SUICIDAL THOUGHTS AND BEHAVIORS: Antidepressants increased the risk of suicidal thoughts and behaviors in children, adolescents, and young adults in short-term trials. Closely monitor all patients for clinical worsening and emergence of suicidal thoughts and behaviors.",
    ],
    refs: [ref(FLV, "BOXED WARNING", "WARNING: SUICIDALITY AND ANTIDEPRESSANT DRUGS", 50)],
  },
  mg_safety: {
    value: "safe",
    refs: [ref(FLV, "12.1 Mechanism of Action", "The mechanism of action of fluvoxamine maleate in obsessive compulsive disorder is presumed to be linked to its specific serotonin reuptake inhibition in brain neurons.", 170)],
    note: "SSRIs do not impair neuromuscular transmission; no MG warning in FDA label.",
  },
  ng_tube: {
    value: {
      crushable: false,
      instructions: "Extended-release capsules should not be crushed or chewed.",
    },
    refs: [ref(FLV, "2.1 OCD (Obsessive Compulsive Disorder)", "Capsules should not be crushed or chewed.", 45)],
  },
  pgx: {
    value: "Approximately 7% of the population are CYP2D6 poor metabolizers; fluvoxamine also inhibits multiple CYP isoenzymes (CYP1A2, CYP2C9, CYP3A4, CYP2C19).",
    refs: [ref(FLV, "12.3 Pharmacokinetics — CYP2D6", "Approximately 7% of the normal population has a genetic code that leads to reduced levels of activity of CYP2D6 enzyme.", 125)],
  },
  ae_tags: {
    value: ["serotonin_syndrome", "hyponatremia", "sedation_somnolence"],
    refs: [ref(FLV, "6 ADVERSE REACTIONS", "Most common reactions in controlled trials with OCD patients", 70)],
  },
  adverse_effects: {
    most_common: {
      value: ["Nausea, diarrhea, dyspepsia, anorexia", "Somnolence, insomnia, asthenia, dizziness, tremor, nervousness", "Abnormal ejaculation, sweating"],
      refs: [ref(FLV, "6 ADVERSE REACTIONS", "Most common reactions in controlled trials with OCD patients", 150)],
    },
    serious: {
      value: ["Suicidal thoughts and behaviors in pediatric and young adult patients", "Serotonin syndrome", "Abnormal bleeding", "Hyponatremia, seizures, ventricular arrhythmia / Torsades de Pointes (postmarketing), Stevens-Johnson syndrome"],
      refs: [ref(FLV, "6 Postmarketing", "ventricular arrythmia, ventricular tachycardia (including torsades de pointes known to cause cardiac arrest, sometimes fatal)", 130)],
    },
  },
  mechanism_of_action: {
    value: "Potent selective serotonin reuptake inhibitor (SSRI) in brain neurons with minimal affinity for histaminergic, adrenergic, muscarinic, or dopaminergic receptors.",
    refs: [ref(FLV, "12.1 Mechanism of Action", "The mechanism of action of fluvoxamine maleate in obsessive compulsive disorder is presumed to be linked to its specific serotonin reuptake inhibition in brain neurons.", 170)],
  },
  enzyme_profile: {
    value: { cyp1a2: "inhibitor_strong", cyp2c19: "inhibitor_strong", cyp2c9: "inhibitor_weak", cyp3a4: "inhibitor_weak", qt_risk: "conditional", serotonergic: true },
    refs: [ref(FLV, "7 DRUG INTERACTIONS", "Fluvoxamine inhibits several cytochrome P450 isoenzymes (CYP1A2, CYP2C9, CYP3A4, and CYP2C19)", 100)],
  },
  fda_interactions: {
    value: [
      {
        drug_or_class: "MAOIs (including linezolid and IV methylene blue)",
        severity: "contraindicated",
        effect: "Increased risk of serotonin syndrome.",
        management: "Contraindicated within 14 days of stopping an MAOI or stopping fluvoxamine.",
        refs: [ref(FLV, "4.1 Monoamine Oxidase Inhibitors (MAOIs)", "The use of MAOIs intended to treat psychiatric disorders with fluvoxamine maleate extended-release capsules or within 14 days of stopping treatment with fluvoxamine maleate extended-release capsules is contraindicated because of an increased risk of serotonin syndrome.", 275)],
      },
      {
        drug_or_class: "Carbamazepine, TCAs, Propranolol/Metoprolol, Sumatriptan",
        severity: "major",
        effect: "Inhibition of CYP1A2, CYP2C19, CYP2C9, and CYP3A4 increases plasma concentrations of carbamazepine, TCAs, and beta-blockers; triptans add serotonergic risk.",
        management: "Monitor plasma levels and clinical toxicity; reduce TCA or propranolol/metoprolol doses as indicated.",
        refs: [ref(FLV, "7.2 Drug Interactions", "Carbamazepine: Elevated carbamazepine levels and symptoms of toxicity with coadministration", 90)],
      },
    ],
    refs: [ref(FLV, "7 DRUG INTERACTIONS", "Fluvoxamine inhibits several cytochrome P450 isoenzymes (CYP1A2, CYP2C9, CYP3A4, and CYP2C19)", 100)],
  },
  reproductive: {
    tier: {
      value: "caution",
      note: "Animal studies showed embryofetal death and eye abnormalities at >=120 mg/kg/day (~4x MRHD); late-pregnancy SSRI exposure carries risks of PPHN, poor neonatal adaptation, and <2-fold postpartum hemorrhage; secreted in human milk.",
      refs: [ref(FLV, "8 USE IN SPECIFIC POPULATIONS", "Pregnancy: Consider both potential risks and benefits when treating a pregnant woman. Infants exposed to SSRIs in pregnancy have developed various complications and may be at risk for persistent pulmonary hypertension of the newborn (PPHN)", 250)],
    },
    mcm: [],
    folic_acid: { value: null, refs: [], note: "Not clinically applicable" },
    contraception: { value: null, refs: [], note: "No hormonal contraceptive interaction reported in FDA label." },
    pregnancy_pk: {
      value: "Consider potential risks and benefits during pregnancy. Exposure to SSRIs in the month before delivery is associated with <2-fold increased postpartum hemorrhage risk; late-pregnancy exposure may cause PPHN and neonatal complications.",
      refs: [ref(FLV, "8.1 Pregnancy — Nonteratogenic Effects", "Based on data from published observational studies, exposure to SSRIs, particularly in the month before delivery, has been associated with a less than 2-fold increase in the risk of postpartum haemorrhage", 210)],
    },
    postpartum: {
      value: "Monitor for postpartum hemorrhage if exposed in the month before delivery. Fluvoxamine is secreted in human breast milk; decide whether to discontinue nursing or the drug.",
      refs: [ref(FLV, "8.3 Nursing Mothers", "Fluvoxamine is secreted in human breast milk. Because of the potential for serious adverse reactions in nursing infants from fluvoxamine maleate extended-release capsules, a decision should be made whether to discontinue nursing or discontinue the drug, taking into account the importance of the drug to the mother.", 320)],
    },
    lactation_rid: { value: null, refs: [], note: "No RID percentage reported in FDA label." },
    lactation_summary: {
      value: "Secreted in human breast milk; because of the potential for serious adverse reactions in nursing infants, decide whether to discontinue nursing or discontinue the drug based on maternal clinical need.",
      refs: [ref(FLV, "8.3 Nursing Mothers", "Fluvoxamine is secreted in human breast milk. Because of the potential for serious adverse reactions in nursing infants from fluvoxamine maleate extended-release capsules, a decision should be made whether to discontinue nursing or discontinue the drug", 270)],
    },
  },
  ...draftMeta(),
};

const ALL = [fluoxetine, sertraline, escitalopram, citalopram, paroxetine, fluvoxamine];
for (const drug of ALL) {
  const out = path.join(DRUGS_DIR, `${drug.id}.json`);
  fs.writeFileSync(out, JSON.stringify(drug, null, 2) + "\n", "utf-8");
  console.log(`✅ Created ${out}`);
}
