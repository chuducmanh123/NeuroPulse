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
      note: "Pending user source submission",
    },
  };
}

// ============================================================================
// 1. HALOPERIDOL
// ============================================================================
const HAL = "fda-haloperidol-label";
const haloperidol = {
  id: "haloperidol",
  generic_name: "haloperidol",
  tall_man: {
    value: "haloperidol",
    refs: [ref(HAL, "11 DESCRIPTION", "Haloperidol, USP is the first of the butyrophenone series of major tranquilizers.", 100)],
    note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
  },
  classes: ["antipsychotic", "first-generation antipsychotic", "typical antipsychotic", "butyrophenone"],
  subspecialties: ["movement_disorders", "other"],
  ...nullVnBhyt(),
  regimens: [
    {
      id: "hal-po-psychotic-mod",
      indication: "Psychotic Disorders — Moderate Symptomatology / Geriatric or Debilitated (Adults)",
      setting: "maintenance_outpatient",
      route: "PO",
      refs: [
        ref(HAL, "2 DOSAGE AND ADMINISTRATION", "Moderate Symptomatology - 0.5 mg to 2 mg b.i.d. or t.i.d.", 120),
      ],
      dose: { kind: "fixed", amount: 0.5, unit: "mg", frequency: "BID or TID (initial 0.5–2 mg BID–TID; max 100 mg/day)", max_single: 100, max_daily: 100 },
      dose_text: "Initial: 0.5 mg to 2 mg orally b.i.d. or t.i.d. (moderate symptomatology; geriatric or debilitated patients: 0.5 mg to 2 mg b.i.d. or t.i.d.).",
    },
    {
      id: "hal-po-psychotic-sev",
      indication: "Psychotic Disorders — Severe Symptomatology / Chronic or Resistant (Adults)",
      setting: "acute_inpatient",
      route: "PO",
      refs: [
        ref(HAL, "2 DOSAGE AND ADMINISTRATION", "Severe Symptomatology - 3 mg to 5 mg b.i.d. or t.i.d.", 260),
      ],
      dose: { kind: "fixed", amount: 3, unit: "mg", frequency: "BID or TID (initial 3–5 mg BID–TID; up to 100 mg/day)", max_single: 100, max_daily: 100 },
      dose_text: "Initial: 3 mg to 5 mg orally b.i.d. or t.i.d. for severe symptomatology or chronic/resistant patients; daily dosages up to 100 mg may be necessary in some cases.",
    },
    {
      id: "hal-po-tourette-ped",
      indication: "Tourette's Disorder & Nonpsychotic Behavior Disorders (Children 3–12 years, 15–40 kg)",
      setting: "maintenance_outpatient",
      route: "PO",
      refs: [
        ref(HAL, "2 DOSAGE AND ADMINISTRATION", "Therapy should begin at the lowest dose possible (0.5 mg per day). If required, the dose should be increased by an increment of 0.5 mg at 5 to 7 day intervals until the desired therapeutic effect is obtained.", 340),
      ],
      dose: { kind: "fixed", amount: 0.5, unit: "mg", frequency: "once daily initially, titrate by 0.5 mg every 5–7 days to 0.05–0.075 mg/kg/day (divided BID or TID)", max_daily: 6 },
      dose_text: "Begin at 0.5 mg/day; increase by 0.5 mg at 5–7 day intervals to 0.05–0.075 mg/kg/day divided b.i.d. or t.i.d. (0.05–0.15 mg/kg/day for psychotic disorders; little evidence of further benefit beyond 6 mg/day).",
    },
  ],
  renal_basis: {
    value: null,
    refs: [],
    note: "No renal impairment dosing guidance in FDA haloperidol tablets label.",
  },
  hepatic: {
    value: null,
    refs: [],
    note: "No hepatic dosing adjustment guidance in FDA haloperidol tablets label (impaired liver function and/or jaundice reported in Adverse Reactions).",
  },
  black_box: {
    value: [
      "WARNING: Increased Mortality in Elderly Patients with Dementia-Related Psychosis: Elderly patients with dementia-related psychosis treated with antipsychotic drugs are at an increased risk of death (1.6 to 1.7 times placebo). Haloperidol is not approved for the treatment of patients with dementia-related psychosis.",
    ],
    refs: [ref(HAL, "BOXED WARNING", "Elderly patients with dementia-related psychosis treated with antipsychotic drugs are at an increased risk of death.", 260)],
  },
  mg_safety: {
    value: "caution",
    refs: [ref(HAL, "4 CONTRAINDICATIONS", "Haloperidol tablets are contraindicated in severe toxic central nervous system depression or comatose states from any cause and in individuals who are hypersensitive to this drug or have Parkinson's disease.", 210)],
    note: "No dedicated MG warning in FDA haloperidol tablets label; contraindicated in severe CNS depression and Parkinson's disease; dystonia/swallowing difficulty and sedation reported.",
  },
  ng_tube: { value: null, refs: [], note: "No enteral tube administration instructions in FDA label." },
  pgx: { value: null, refs: [], note: "No pharmacogenomic or CYP metabolism data in FDA haloperidol tablets label." },
  ae_tags: {
    value: ["extrapyramidal", "qt_prolongation", "sedation_somnolence", "confusion_delirium", "hyponatremia", "hyperammonemia", "hepatotoxicity"],
    refs: [
      ref(HAL, "6 ADVERSE REACTIONS", "QT prolongation and/or ventricular arrhythmias have also been reported, in addition to ECG pattern changes compatible with the polymorphous configuration of Torsades de pointes", 200),
      ref(HAL, "6 ADVERSE REACTIONS", "Extrapyramidal Symptoms (EPS) EPS during the administration of haloperidol have been reported frequently, often during the first few days of treatment. EPS can be categorized generally as Parkinson-like symptoms, akathisia, or dystonia", 250),
    ],
  },
  adverse_effects: {
    most_common: {
      value: [
        "Extrapyramidal symptoms (Parkinson-like symptoms, akathisia, acute dystonia)",
        "Insomnia, restlessness, anxiety, agitation, drowsiness, lethargy, headache",
        "Dry mouth, blurred vision, constipation, hypersalivation, nausea, vomiting",
        "Tachycardia, hypotension, hypertension",
      ],
      refs: [ref(HAL, "6 ADVERSE REACTIONS", "EPS during the administration of haloperidol have been reported frequently, often during the first few days of treatment.", 250)],
    },
    serious: {
      value: [
        "QT prolongation, ventricular arrhythmias, Torsades de pointes, and sudden unexpected death",
        "Neuroleptic malignant syndrome (NMS), hyperpyrexia, and heat stroke",
        "Tardive dyskinesia and tardive dystonia (potentially irreversible)",
        "Agranulocytosis (rarely, with other medication), leukopenia",
        "Grand mal seizures, laryngospasm, bronchospasm, impaired liver function/jaundice, hyponatremia",
      ],
      refs: [ref(HAL, "6 ADVERSE REACTIONS", "Neuroleptic malignant syndrome (NMS), hyperpyrexia and heat stroke have been reported with haloperidol.", 120)],
    },
  },
  mechanism_of_action: {
    value: "The precise mechanism of action has not been clearly established (butyrophenone antipsychotic).",
    refs: [ref(HAL, "12 CLINICAL PHARMACOLOGY", "The precise mechanism of action has not been clearly established.", 80)],
  },
  enzyme_profile: {
    value: { qt_risk: "known" },
    refs: [ref(HAL, "6 ADVERSE REACTIONS", "QT prolongation and/or ventricular arrhythmias have also been reported, in addition to ECG pattern changes compatible with the polymorphous configuration of Torsades de pointes, and may occur more frequently with high doses and in predisposed patients", 240)],
  },
  fda_interactions: {
    value: null,
    refs: [],
    note: "No dedicated Section 7 Drug Interactions in FDA haloperidol tablets label; Section 10 Overdosage notes epinephrine should not be used for hypotension.",
  },
  reproductive: {
    tier: { value: null, refs: [], note: "No Pregnancy or Lactation section in FDA haloperidol tablets label." },
    mcm: [],
    folic_acid: { value: null, refs: [], note: "No pregnancy/folic acid data in FDA haloperidol tablets label." },
    contraception: { value: null, refs: [], note: "No contraception data in FDA haloperidol tablets label." },
    pregnancy_pk: { value: null, refs: [], note: "No Pregnancy section in FDA haloperidol tablets label." },
    postpartum: { value: null, refs: [], note: "No Pregnancy/Lactation section in FDA haloperidol tablets label." },
    lactation_rid: { value: null, refs: [], note: "No Lactation section in FDA haloperidol tablets label." },
    lactation_summary: { value: null, refs: [], note: "No Lactation section in FDA haloperidol tablets label (Endocrine Disorders notes lactation/galactorrhea as an adverse effect)." },
  },
  ...draftMeta(),
};

// ============================================================================
// 2. RISPERIDONE
// ============================================================================
const RIS = "fda-risperidone-label";
const risperidone = {
  id: "risperidone",
  generic_name: "risperidone",
  tall_man: {
    value: "risperiDONE",
    refs: [ref("fda-tallman-list", "FDA Name Differentiation List", "risperiDONE", 30)],
    note: "Per FDA/ISMP Name Differentiation List (tall-man.json).",
  },
  classes: ["antipsychotic", "atypical antipsychotic", "second-generation antipsychotic", "benzisoxazole derivative"],
  subspecialties: ["other"],
  ...nullVnBhyt(),
  regimens: [
    {
      id: "ris-po-schiz-adult",
      indication: "Schizophrenia (Adults)",
      setting: "maintenance_outpatient",
      route: "PO",
      refs: [
        ref(RIS, "2.1 Schizophrenia — Adults", "Initial dosing is 2 mg per day. May increase the dose at intervals of 24 hours or greater, in increments of 1 to 2 mg per day, as tolerated, to a recommended dose of 4 to 8 mg per day.", 250),
      ],
      dose: { kind: "fixed", amount: 2, unit: "mg", frequency: "once or twice daily initially; target 4–8 mg/day (max 16 mg/day)", max_single: 16, max_daily: 16 },
      dose_text: "Initial: 2 mg/day orally (QD or BID); increase by 1–2 mg/day at intervals >=24 h to target 4–8 mg/day (effective range 4–16 mg/day; doses >6 mg/day BID generally not recommended).",
    },
    {
      id: "ris-po-schiz-adol",
      indication: "Schizophrenia (Adolescents 13–17 years)",
      setting: "maintenance_outpatient",
      route: "PO",
      refs: [
        ref(RIS, "2.1 Schizophrenia — Adolescents", "The initial dose is 0.5 mg once daily, administered as a single-daily dose in the morning or evening. The dose may be adjusted at intervals of 24 hours or greater, in increments of 0.5 mg or 1 mg per day, as tolerated, to a recommended dose of 3 mg per day.", 270),
      ],
      dose: { kind: "fixed", amount: 0.5, unit: "mg", frequency: "once daily initially; target 3 mg/day (effective range 1–6 mg/day)", max_single: 6, max_daily: 6 },
      dose_text: "Initial: 0.5 mg orally once daily; titrate by 0.5–1 mg/day at intervals >=24 h to target 3 mg/day (effective range 1–6 mg/day; no additional benefit above 3 mg/day).",
    },
    {
      id: "ris-po-bipolar-adult",
      indication: "Bipolar I Mania (Adults, monotherapy or adjunctive with lithium or valproate)",
      setting: "acute_inpatient",
      route: "PO",
      refs: [
        ref(RIS, "2.2 Bipolar Mania — Adults", "The initial dose range is 2 mg to 3 mg per day. The dose may be adjusted at intervals of 24 hours or greater, in increments of 1 mg per day. The effective dose range is 1 mg to 6 mg per day", 200),
      ],
      dose: { kind: "fixed", amount: 2, unit: "mg", frequency: "once daily (initial 2–3 mg/day; effective range 1–6 mg/day)", max_single: 6, max_daily: 6 },
      dose_text: "Initial: 2–3 mg/day orally; adjust by 1 mg/day at intervals >=24 h within effective range of 1–6 mg/day.",
    },
    {
      id: "ris-po-autism-ped",
      indication: "Irritability Associated with Autistic Disorder (Pediatrics 5–17 years)",
      setting: "maintenance_outpatient",
      route: "PO",
      refs: [
        ref(RIS, "2.3 Irritability Associated with Autistic Disorder", "For patients with body weight less than 20 kg, initiate dosing at 0.25 mg per day. For patients with body weight greater than or equal to 20 kg, initiate dosing at 0.5 mg per day.", 200),
      ],
      dose: { kind: "fixed", amount: 0.25, unit: "mg", frequency: "once daily or divided BID (<20 kg: 0.25 mg/day; >=20 kg: 0.5 mg/day; range 0.5–3 mg/day)", max_single: 3, max_daily: 3 },
      dose_text: "Weight <20 kg: start 0.25 mg/day (target 0.5 mg/day after >=4 days). Weight >=20 kg: start 0.5 mg/day (target 1.0 mg/day after >=4 days). Effective range 0.5–3 mg/day.",
    },
  ],
  renal_basis: {
    value: "cg_abw",
    refs: [ref(RIS, "2.4 Dosing in Patients with Severe Renal or Hepatic Impairment", "For patients with severe renal impairment (Clcr< 30 mL/min) or hepatic impairment (10–15 points on Child Pugh System), the initial starting dose is 0.5 mg twice daily.", 180)],
  },
  renal_impairment: {
    description: "In moderate to severe renal disease (Clcr 59 to 15 mL/min), clearance of risperidone + 9-hydroxyrisperidone decreased by 60%. Use lower starting dose of 0.5 mg twice daily in severe renal impairment (Clcr < 30 mL/min).",
    renal_basis: {
      value: "cg_abw",
      refs: [ref(RIS, "8.6 Renal Impairment", "In patients with moderate to severe (Clcr 59 to 15 mL/min) renal disease, clearance of the sum of risperidone and its active metabolite decreased by 60%, compared to young healthy subjects.", 200)],
    },
    bands: [
      {
        min: 0,
        max: 30,
        dose_text: "Initial: 0.5 mg twice daily; increase in increments of <=0.5 mg twice daily. For doses above 1.5 mg twice daily, increase at intervals of >=1 week.",
        dose: { kind: "fixed", amount: 0.5, unit: "mg", frequency: "twice daily" },
        refs: [ref(RIS, "2.4 Dosing in Patients with Severe Renal or Hepatic Impairment", "For patients with severe renal impairment (Clcr< 30 mL/min) or hepatic impairment (10–15 points on Child Pugh System), the initial starting dose is 0.5 mg twice daily. The dose may be increased in increments of 0.5 mg or less, administered twice daily. For doses above 1.5 mg twice daily, increase in intervals of one week or greater", 340)],
      },
    ],
    refs: [ref(RIS, "2.4 Dosing in Patients with Severe Renal or Hepatic Impairment", "For patients with severe renal impairment (Clcr< 30 mL/min) or hepatic impairment (10–15 points on Child Pugh System), the initial starting dose is 0.5 mg twice daily.", 180)],
  },
  hepatic: {
    value: "Mean free fraction of risperidone in plasma increased by ~35% in hepatic impairment. For severe hepatic impairment (Child-Pugh 10–15), initiate at 0.5 mg twice daily and increase by <=0.5 mg BID (above 1.5 mg BID at >=1-week intervals).",
    refs: [
      ref(RIS, "8.7 Hepatic Impairment", "the mean free fraction of risperidone in plasma was increased by about 35% because of the diminished concentration of both albumin and α 1 -acid glycoprotein. RISPERDAL doses should be reduced in patients with liver disease", 230),
    ],
  },
  black_box: {
    value: [
      "WARNING: INCREASED MORTALITY IN ELDERLY PATIENTS WITH DEMENTIA-RELATED PSYCHOSIS: Elderly patients with dementia-related psychosis treated with antipsychotic drugs are at an increased risk of death. RISPERDAL is not approved for the treatment of patients with dementia-related psychosis.",
    ],
    refs: [ref(RIS, "BOXED WARNING", "Elderly patients with dementia-related psychosis treated with antipsychotic drugs are at an increased risk of death. RISPERDAL is not approved for the treatment of patients with dementia-related psychosis.", 210)],
  },
  mg_safety: {
    value: "caution",
    refs: [ref(RIS, "6 ADVERSE REACTIONS", "Dysphagia [see Warnings and Precautions (5.12) ]", 60)],
    note: "No specific MG warning in FDA label; dysphagia, sedation, and increased sensitivity in Parkinson's/Lewy body dementia are noted.",
  },
  ng_tube: {
    value: null,
    refs: [],
    note: "No enteral tube administration instructions in FDA label (Oral Solution is compatible with water, coffee, orange juice, and low-fat milk; NOT compatible with cola or tea).",
  },
  pgx: {
    value: "Extensively metabolized in the liver via CYP2D6 hydroxylation to active 9-hydroxyrisperidone (paliperidone). CYP2D6 poor metabolizers convert risperidone more slowly (t1/2 ~20 h vs 3 h), though combined active moiety pharmacokinetics are similar.",
    refs: [ref(RIS, "12.3 Pharmacokinetics — Elimination", "The main metabolic pathway is through hydroxylation of risperidone to 9-hydroxyrisperidone by the enzyme, CYP 2D6.", 130)],
  },
  ae_tags: {
    value: ["extrapyramidal", "sedation_somnolence", "weight_gain", "qt_prolongation", "rash_sjs_ten", "hyponatremia", "pancreatitis"],
    refs: [
      ref(RIS, "6 ADVERSE REACTIONS", "The most common adverse reactions in clinical trials (>5% and twice placebo) were parkinsonism, akathisia, dystonia, tremor, sedation, dizziness, anxiety, blurred vision, nausea, vomiting, upper abdominal pain, stomach discomfort, dyspepsia, diarrhea, salivary hypersecretion, constipation, dry mouth, increased appetite, increased weight", 340),
    ],
  },
  adverse_effects: {
    most_common: {
      value: [
        "Parkinsonism, akathisia, dystonia, tremor",
        "Sedation/somnolence, dizziness, anxiety, fatigue, blurred vision",
        "Nausea, vomiting, dyspepsia, constipation, diarrhea, dry mouth, salivary hypersecretion",
        "Increased appetite, weight gain, nasal congestion, rash",
      ],
      refs: [ref(RIS, "6 ADVERSE REACTIONS", "The most common adverse reactions in clinical trials (>5% and twice placebo) were parkinsonism, akathisia, dystonia, tremor, sedation, dizziness, anxiety, blurred vision, nausea, vomiting, upper abdominal pain, stomach discomfort, dyspepsia, diarrhea, salivary hypersecretion, constipation, dry mouth, increased appetite, increased weight", 340)],
    },
    serious: {
      value: [
        "Increased mortality and cerebrovascular adverse events (including stroke) in elderly patients with dementia-related psychosis",
        "Neuroleptic malignant syndrome (NMS) and tardive dyskinesia",
        "Metabolic changes (hyperglycemia/diabetes mellitus, dyslipidemia, weight gain) and hyperprolactinemia",
        "Orthostatic hypotension, falls, leukopenia/neutropenia/agranulocytosis, seizures, dysphagia, priapism",
        "Postmarketing: QT prolongation, sudden death, SJS/TEN, pancreatitis, SIADH/hyponatremia",
      ],
      refs: [ref(RIS, "6 ADVERSE REACTIONS", "Cerebrovascular adverse events, including stroke, in elderly patients with dementia-related psychosis [see Warnings and Precautions (5.2) ] Neuroleptic malignant syndrome [see Warnings and Precautions (5.3) ] Tardive dyskinesia", 250)],
    },
  },
  mechanism_of_action: {
    value: "Atypical antipsychotic whose therapeutic activity in schizophrenia may be mediated through combined dopamine Type 2 (D2) and serotonin Type 2 (5HT2) receptor antagonism; clinical effect results from risperidone plus 9-hydroxyrisperidone (paliperidone).",
    refs: [ref(RIS, "12.1 Mechanism of Action", "The drug's therapeutic activity in schizophrenia could be mediated through a combination of dopamine Type 2 (D 2 ) and serotonin Type 2 (5HT 2 ) receptor antagonism.", 170)],
  },
  enzyme_profile: {
    value: { cyp2d6: "substrate", qt_risk: "possible" },
    refs: [
      ref(RIS, "12.3 Pharmacokinetics — Elimination", "The main metabolic pathway is through hydroxylation of risperidone to 9-hydroxyrisperidone by the enzyme, CYP 2D6.", 130),
      ref(RIS, "6.2 Postmarketing Experience", "QT prolongation", 30),
    ],
  },
  fda_interactions: {
    value: [
      {
        drug_or_class: "Carbamazepine and other enzyme inducers (phenytoin, rifampin, phenobarbital)",
        severity: "major",
        effect: "Decreases combined plasma concentrations of risperidone + 9-hydroxyrisperidone (carbamazepine reduced active moiety AUC to 0.51).",
        management: "Increase risperidone dose up to double the patient's usual dose; titrate slowly and decrease dose when enzyme inducer is discontinued.",
        refs: [ref(RIS, "7 DRUG INTERACTIONS", "Carbamazepine and other enzyme inducers decrease plasma concentrations of risperidone. Increase the RISPERDAL dose up to double the patient's usual dose. Titrate slowly.", 180)],
      },
      {
        drug_or_class: "Fluoxetine, paroxetine, and other CYP2D6 inhibitors",
        severity: "major",
        effect: "Increases plasma concentrations of risperidone (active moiety AUC increased 1.4-fold with fluoxetine and 1.3–1.8-fold with paroxetine).",
        management: "Reduce initial risperidone dose; do not exceed 8 mg/day in adults when co-administered with fluoxetine or paroxetine.",
        refs: [ref(RIS, "7 DRUG INTERACTIONS", "Fluoxetine, paroxetine, and other CYP 2D6 enzyme inhibitors increase plasma concentrations of risperidone. Reduce the initial dose. Do not exceed a final dose of 8 mg per day of RISPERDAL.", 200)],
      },
      {
        drug_or_class: "Levodopa and Dopamine Agonists",
        severity: "moderate",
        effect: "Risperidone may antagonize the effects of levodopa and dopamine agonists.",
        management: "Monitor for reduced antiparkinsonian efficacy; avoid or adjust therapy as clinically indicated.",
        refs: [ref(RIS, "7.2 Pharmacodynamic-related Interactions", "RISPERDAL may antagonize the effects of levodopa and dopamine agonists.", 80)],
      },
      {
        drug_or_class: "Methylphenidate",
        severity: "moderate",
        effect: "Concomitant use when changing dosage of either medication may increase risk of extrapyramidal symptoms (EPS).",
        management: "Monitor for symptoms of EPS during concomitant use and dosage changes.",
        refs: [ref(RIS, "7.2 Pharmacodynamic-related Interactions", "Concomitant use with methylphenidate, when there is change in dosage of either medication, may increase the risk of extrapyramidal symptoms (EPS).", 160)],
      },
    ],
    refs: [ref(RIS, "7 DRUG INTERACTIONS", "Carbamazepine and other enzyme inducers decrease plasma concentrations of risperidone.", 90)],
  },
  reproductive: {
    tier: {
      value: "caution",
      note: "Available epidemiologic studies have not established an overall drug-associated risk of major birth defects or miscarriage (though one Medicaid subgroup of 1566 first-trimester exposures noted RR 1.26, 95% CI 1.02–1.56); third-trimester exposure carries risk of neonatal EPS/withdrawal.",
      refs: [ref(RIS, "8.1 Pregnancy — Risk Summary", "Overall, available data from published epidemiologic studies of pregnant women exposed to risperidone have not established a drug-associated risk of major birth defects, miscarriage, or adverse maternal or fetal outcomes", 230)],
    },
    mcm: [],
    folic_acid: { value: null, refs: [], note: "No folic acid recommendation in FDA label." },
    contraception: { value: null, refs: [], note: "No hormonal contraceptive interaction reported in FDA label." },
    pregnancy_pk: {
      value: "Placental passage demonstrated in humans. Neonates exposed during the third trimester are at risk for extrapyramidal and/or withdrawal symptoms (agitation, hypertonia, hypotonia, tremor, somnolence, respiratory distress, feeding disorder).",
      refs: [ref(RIS, "8.1 Pregnancy — Risk Summary", "Neonates exposed to antipsychotic drugs during the third trimester of pregnancy are at risk for extrapyramidal and/or withdrawal symptoms following delivery", 160)],
    },
    postpartum: {
      value: "Monitor neonates for extrapyramidal and/or withdrawal symptoms after third-trimester exposure; monitor breastfed infants for excess sedation, failure to thrive, jitteriness, and EPS.",
      refs: [ref(RIS, "8.2 Lactation — Clinical Considerations", "Infants exposed to RISPERDAL through breastmilk should be monitored for excess sedation, failure to thrive, jitteriness, and extrapyramidal symptoms (tremors and abnormal muscle movements).", 200)],
    },
    lactation_rid: {
      value: "2.3% to 4.7% of the maternal weight-adjusted dosage",
      refs: [ref(RIS, "8.2 Lactation — Risk Summary", "presence of risperidone and its metabolite, 9-hydroxyrisperidone, in human breast milk at relative infant dose ranging between 2.3% and 4.7% of the maternal weight-adjusted dosage.", 190)],
    },
    lactation_summary: {
      value: "Risperidone and 9-hydroxyrisperidone are present in human breast milk (RID 2.3%–4.7%); reports of sedation, failure to thrive, jitteriness, and EPS in breastfed infants.",
      refs: [ref(RIS, "8.2 Lactation — Risk Summary", "There are reports of sedation, failure to thrive, jitteriness, and extrapyramidal symptoms (tremors and abnormal muscle movements) in breastfed infants exposed to risperidone", 180)],
    },
  },
  ...draftMeta(),
};

// ============================================================================
// 3. OLANZAPINE
// ============================================================================
const OLA = "fda-olanzapine-label";
const olanzapine = {
  id: "olanzapine",
  generic_name: "olanzapine",
  tall_man: {
    value: "olanzapine",
    refs: [ref(OLA, "11 DESCRIPTION", "Olanzapine is an atypical antipsychotic that belongs to the thienobenzodiazepine class.", 100)],
    note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
  },
  classes: ["antipsychotic", "atypical antipsychotic", "second-generation antipsychotic", "thienobenzodiazepine"],
  subspecialties: ["other"],
  ...nullVnBhyt(),
  regimens: [
    {
      id: "ola-po-schiz-adult",
      indication: "Schizophrenia (Adults)",
      setting: "maintenance_outpatient",
      route: "PO",
      refs: [
        ref(OLA, "2.1 Schizophrenia — Adults", "Oral olanzapine should be administered on a once-a-day schedule without regard to meals, generally beginning with 5 mg to 10 mg initially, with a target dose of 10 mg/day within several days.", 210),
      ],
      dose: { kind: "fixed", amount: 5, unit: "mg", frequency: "once daily (initial 5–10 mg/day; target 10 mg/day; max 20 mg/day)", max_single: 20, max_daily: 20 },
      dose_text: "Initial: 5–10 mg orally once daily; target 10 mg/day within several days; adjust in 5 mg increments at intervals >=1 week (not indicated above 20 mg/day). Start at 5 mg in debilitated/hypotensive-prone/slow-metabolism patients.",
    },
    {
      id: "ola-po-bipolar-adult",
      indication: "Bipolar I Disorder — Manic or Mixed Episodes (Adults, Monotherapy)",
      setting: "acute_inpatient",
      route: "PO",
      refs: [
        ref(OLA, "2.2 Bipolar I Disorder — Adults", "Oral olanzapine should be administered on a once-a-day schedule without regard to meals, generally beginning with 10 mg or 15 mg.", 150),
      ],
      dose: { kind: "fixed", amount: 10, unit: "mg", frequency: "once daily (initial 10–15 mg/day; range 5–20 mg/day)", max_single: 20, max_daily: 20 },
      dose_text: "Initial: 10 mg or 15 mg orally once daily; adjust in 5 mg increments at intervals >=24 h within 5–20 mg/day.",
    },
    {
      id: "ola-po-bipolar-adj",
      indication: "Bipolar I Disorder — Manic or Mixed Episodes (Adults, Adjunct to Lithium or Valproate)",
      setting: "acute_inpatient",
      route: "PO",
      refs: [
        ref(OLA, "2.2 Bipolar I Disorder — Adjunctive Treatment", "When administered as adjunctive treatment to lithium or valproate, oral olanzapine dosing should generally begin with 10 mg once-a-day without regard to meals.", 170),
      ],
      dose: { kind: "fixed", amount: 10, unit: "mg", frequency: "once daily (range 5–20 mg/day)", max_single: 20, max_daily: 20 },
      dose_text: "Initial: 10 mg orally once daily (effective range 5–20 mg/day; safety above 20 mg/day not evaluated).",
    },
    {
      id: "ola-po-adol",
      indication: "Schizophrenia or Bipolar I Mania (Adolescents 13–17 years)",
      setting: "maintenance_outpatient",
      route: "PO",
      refs: [
        ref(OLA, "2.1 / 2.2 Adolescents", "Oral olanzapine should be administered on a once-a-day schedule without regard to meals with a recommended starting dose of 2.5 mg or 5 mg, with a target dose of 10 mg/day.", 180),
      ],
      dose: { kind: "fixed", amount: 2.5, unit: "mg", frequency: "once daily (initial 2.5–5 mg/day; target 10 mg/day; range 2.5–20 mg/day)", max_single: 20, max_daily: 20 },
      dose_text: "Initial: 2.5 mg or 5 mg orally once daily; target 10 mg/day; adjust in 2.5–5 mg increments (max evaluated 20 mg/day).",
    },
  ],
  renal_basis: {
    value: "cg_abw",
    refs: [ref(OLA, "12.3 Pharmacokinetics — Renal Impairment", "The pharmacokinetic characteristics of olanzapine were similar in patients with severe renal impairment and normal subjects, indicating that dosage adjustment based upon the degree of renal impairment is not required. In addition, olanzapine is not removed by dialysis.", 270)],
  },
  renal_impairment: {
    description: "Dosage adjustment based upon the degree of renal impairment is not required. Olanzapine is not removed by dialysis.",
    renal_basis: {
      value: "cg_abw",
      refs: [ref(OLA, "12.3 Pharmacokinetics — Renal Impairment", "dosage adjustment based upon the degree of renal impairment is not required. In addition, olanzapine is not removed by dialysis.", 130)],
    },
    bands: [],
    hemodialysis: {
      value: "Olanzapine is not removed by dialysis.",
      refs: [ref(OLA, "12.3 Pharmacokinetics — Renal Impairment", "olanzapine is not removed by dialysis.", 50)],
    },
    refs: [ref(OLA, "12.3 Pharmacokinetics — Renal Impairment", "dosage adjustment based upon the degree of renal impairment is not required. In addition, olanzapine is not removed by dialysis.", 130)],
  },
  hepatic: {
    value: "Child-Pugh A and B cirrhosis revealed little effect on olanzapine pharmacokinetics; however, when used in combination with fluoxetine in hepatic impairment, use a lower starting dose (2.5–5 mg olanzapine + 20 mg fluoxetine).",
    refs: [ref(OLA, "12.3 Pharmacokinetics — Hepatic Impairment", "a study of the effect of impaired liver function in subjects (n=6) with clinically significant (Childs Pugh Classification A and B) cirrhosis revealed little effect on the pharmacokinetics of olanzapine.", 200)],
  },
  black_box: {
    value: [
      "WARNING: INCREASED MORTALITY IN ELDERLY PATIENTS WITH DEMENTIA-RELATED PSYCHOSIS: Elderly patients with dementia-related psychosis treated with antipsychotic drugs are at an increased risk of death. Olanzapine is not approved for the treatment of patients with dementia-related psychosis.",
    ],
    refs: [ref(OLA, "BOXED WARNING", "Elderly patients with dementia-related psychosis treated with antipsychotic drugs are at an increased risk of death. Olanzapine is not approved for the treatment of patients with dementia-related psychosis.", 210)],
  },
  mg_safety: {
    value: "caution",
    refs: [ref(OLA, "12.2 Pharmacodynamics", "Olanzapine is an antagonist with moderate affinity binding for serotonin 5HT 3 (K i =57 nM) and muscarinic M 1-5 (K i =73, 96, 132, 32, and 48 nM, respectively).", 160)],
    note: "No specific MG warning in FDA label; antimuscarinic affinity, sedation, and postural hypotension warrant caution.",
  },
  ng_tube: { value: null, refs: [], note: "No enteral tube administration instructions in FDA label (ODT disintegrates in saliva and can be swallowed with or without liquid)." },
  pgx: {
    value: "Metabolized via direct glucuronidation and CYP1A2 (and minor CYP2D6 oxidation). Clearance is not reduced in CYP2D6-deficient subjects. Clearance is ~40% higher in smokers and ~30% lower in women; elderly nonsmoking females may have ~3-fold lower clearance than young smoking males.",
    refs: [ref(OLA, "12.3 Pharmacokinetics — Metabolism and Elimination", "CYP2D6 mediated oxidation appears to be a minor metabolic pathway in vivo, because the clearance of olanzapine is not reduced in subjects who are deficient in this enzyme.", 180)],
  },
  ae_tags: {
    value: ["sedation_somnolence", "weight_gain", "extrapyramidal", "ataxia", "confusion_delirium", "hepatotoxicity"],
    refs: [
      ref(OLA, "6 ADVERSE REACTIONS", "Schizophrenia (Adults) – postural hypotension, constipation, weight gain, dizziness, personality disorder, akathisia", 130),
      ref(OLA, "6.1 Clinical Trials Experience", "discontinuations due to increases in ALT were considered to be drug related (2% for oral olanzapine vs 0% for placebo).", 130),
    ],
  },
  adverse_effects: {
    most_common: {
      value: [
        "Somnolence/sedation, dizziness, asthenia, headache",
        "Weight gain, increased appetite",
        "Dry mouth, constipation, dyspepsia",
        "Postural hypotension, akathisia, tremor",
      ],
      refs: [ref(OLA, "6 ADVERSE REACTIONS", "Manic or Mixed Episodes, Bipolar I Disorder (Adults) – asthenia, dry mouth, constipation, increased appetite, somnolence, dizziness, tremor", 150)],
    },
    serious: {
      value: [
        "Increased mortality and cerebrovascular adverse events in elderly patients with dementia-related psychosis",
        "ALT/transaminase elevations and hepatic adverse events",
        "Orthostatic hypotension, tachycardia, falls",
        "Delirium, seizures, neuroleptic malignant syndrome, respiratory depression/arrest (in overdose)",
      ],
      refs: [ref(OLA, "6.1 Clinical Trials Experience", "discontinuations due to increases in ALT were considered to be drug related (2% for oral olanzapine vs 0% for placebo).", 130)],
    },
  },
  mechanism_of_action: {
    value: "Atypical antipsychotic (thienobenzodiazepine) whose efficacy in schizophrenia may be mediated through a combination of dopamine and serotonin type 2 (5HT2) antagonism.",
    refs: [ref(OLA, "12.1 Mechanism of Action", "the efficacy of olanzapine in schizophrenia could be mediated through a combination of dopamine and serotonin type 2 (5HT2) antagonism.", 140)],
  },
  enzyme_profile: {
    value: { cyp1a2: "substrate", cyp2d6: "substrate", qt_risk: "none" },
    refs: [ref(OLA, "12.3 Pharmacokinetics — Metabolism and Elimination", "In vitro studies suggest that CYPs 1A2 and 2D6, and the flavin-containing monooxygenase system are involved in olanzapine oxidation.", 140)],
  },
  fda_interactions: {
    value: [
      {
        drug_or_class: "Fluvoxamine (CYP1A2 inhibitor)",
        severity: "major",
        effect: "Decreases olanzapine clearance, increasing Cmax by 54%–77% and AUC by 52%–108%.",
        management: "Consider lower doses of olanzapine in patients receiving concomitant fluvoxamine.",
        refs: [ref(OLA, "7.1 Potential for Other Drugs to Affect Olanzapine", "Fluvoxamine, a CYP1A2 inhibitor, decreases the clearance of olanzapine. This results in a mean increase in olanzapine Cmax following fluvoxamine of 54% in female nonsmokers and 77% in male smokers. The mean increase in olanzapine AUC is 52% and 108%, respectively. Lower doses of olanzapine should be considered", 330)],
      },
      {
        drug_or_class: "Carbamazepine (CYP1A2 inducer)",
        severity: "moderate",
        effect: "Carbamazepine (200 mg BID) causes an approximately 50% increase in olanzapine clearance.",
        management: "Monitor for reduced olanzapine efficacy; higher olanzapine doses may be needed.",
        refs: [ref(OLA, "7.1 Potential for Other Drugs to Affect Olanzapine", "Carbamazepine therapy (200 mg bid) causes an approximately 50% increase in the clearance of olanzapine. This increase is likely due to the fact that carbamazepine is a potent inducer of CYP1A2 activity.", 220)],
      },
      {
        drug_or_class: "Diazepam and Alcohol",
        severity: "moderate",
        effect: "Co-administration potentiated the orthostatic hypotension observed with olanzapine.",
        management: "Monitor blood pressure and orthostasis; caution patients about additive CNS and hypotensive effects.",
        refs: [ref(OLA, "7.1 Potential for Other Drugs to Affect Olanzapine", "The co-administration of diazepam with olanzapine potentiated the orthostatic hypotension observed with olanzapine", 130)],
      },
      {
        drug_or_class: "Levodopa and Dopamine Agonists",
        severity: "moderate",
        effect: "Olanzapine may antagonize the effects of levodopa and dopamine agonists.",
        management: "Monitor for reduced antiparkinsonian efficacy.",
        refs: [ref(OLA, "7.2 Potential for Olanzapine to Affect Other Drugs", "Olanzapine may antagonize the effects of levodopa and dopamine agonists.", 80)],
      },
    ],
    refs: [ref(OLA, "7 DRUG INTERACTIONS", "Fluvoxamine: May increase olanzapine levels.", 60)],
  },
  reproductive: {
    tier: {
      value: "caution",
      note: "Available epidemiologic studies have not established a drug-associated risk of major birth defects or miscarriage, but third-trimester exposure risks neonatal EPS/withdrawal; present in human milk with reports of infant sedation, irritability, poor feeding, and EPS.",
      refs: [ref(OLA, "8.1 Pregnancy — Risk Summary", "Overall available data from published epidemiologic studies of pregnant women exposed to olanzapine have not established a drug-associated risk of major birth defects, miscarriage, or adverse maternal or fetal outcomes", 230)],
    },
    mcm: [],
    folic_acid: { value: null, refs: [], note: "No folic acid recommendation in FDA label." },
    contraception: { value: null, refs: [], note: "No hormonal contraceptive interaction reported in FDA label." },
    pregnancy_pk: {
      value: "Placental passage ratio highly variable (7%–167% at birth). Third-trimester exposure carries risk of neonatal extrapyramidal and/or withdrawal symptoms.",
      refs: [ref(OLA, "8.1 Pregnancy — Human Data", "Placental passage has been reported in published study reports; however, the placental passage ratio was highly variable ranging between 7% to 167% at birth following exposure during pregnancy.", 210)],
    },
    postpartum: {
      value: "Monitor neonates for extrapyramidal and/or withdrawal symptoms after third-trimester exposure; monitor breastfed infants for excess sedation, irritability, poor feeding, and EPS.",
      refs: [ref(OLA, "8.2 Lactation — Clinical Considerations", "Infants exposed to olanzapine should be monitored for excess sedation, irritability, poor feeding, and extrapyramidal symptoms (tremors and abnormal muscle movements).", 180)],
    },
    lactation_rid: { value: null, refs: [], note: "No RID percentage reported in FDA label." },
    lactation_summary: {
      value: "Olanzapine is present in human milk; reports of excess sedation, irritability, poor feeding, and EPS in breastfed infants.",
      refs: [ref(OLA, "8.2 Lactation — Risk Summary", "Olanzapine is present in human milk. There are reports of excess sedation, irritability, poor feeding and extrapyramidal symptoms (tremors and abnormal muscle movements) in infants exposed to olanzapine through breast milk", 230)],
    },
  },
  ...draftMeta(),
};

// ============================================================================
// 4. CLOZAPINE
// ============================================================================
const CLO = "fda-clozapine-label";
const clozapine = {
  id: "clozapine",
  generic_name: "clozapine",
  tall_man: {
    value: "clozapine",
    refs: [ref(CLO, "11 DESCRIPTION", "CLOZARIL ® (clozapine), an atypical antipsychotic drug, is a tricyclic dibenzodiazepine derivative", 110)],
    note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
  },
  classes: ["antipsychotic", "atypical antipsychotic", "second-generation antipsychotic", "dibenzodiazepine derivative"],
  subspecialties: ["other"],
  ...nullVnBhyt(),
  regimens: [
    {
      id: "clo-po-trs",
      indication: "Treatment-Resistant Schizophrenia & Reduction of Recurrent Suicidal Behavior (Adults)",
      setting: "maintenance_outpatient",
      route: "PO",
      refs: [
        ref(CLO, "2.2 Recommended Dosage and Administration", "The recommended starting oral dosage of CLOZARIL is 12.5 mg once or twice daily. If well-tolerated, increase the total daily dose in increments of 25 mg to 50 mg per day to achieve a target dosage of 150 mg to 225 mg twice per day by the end of two weeks.", 280),
      ],
      dose: { kind: "fixed", amount: 12.5, unit: "mg", frequency: "once or twice daily initially; target 150–225 mg BID by week 2 (max 450 mg BID / 900 mg/day)", max_single: 450, max_daily: 900 },
      dose_text: "Initial: 12.5 mg orally once or twice daily; increase by 25–50 mg/day to target 150–225 mg BID by end of week 2, then up to 100 mg once or twice weekly; max 450 mg BID (900 mg/day). Requires baseline and serial ANC monitoring.",
    },
  ],
  renal_basis: {
    value: "cg_abw",
    refs: [ref(CLO, "8.6 Patients with Renal or Hepatic Impairment", "Dose reduction may be necessary in patients with significant impairment of renal or hepatic function. Clozapine concentrations may be increased in these patients, because clozapine is almost completely metabolized and then excreted", 230)],
  },
  renal_impairment: {
    description: "No specific PK study in renal impairment; dose reduction may be necessary in patients with significant renal impairment as clozapine concentrations may be increased.",
    renal_basis: {
      value: "cg_abw",
      refs: [ref(CLO, "8.6 Patients with Renal or Hepatic Impairment", "Dose reduction may be necessary in patients with significant impairment of renal or hepatic function.", 110)],
    },
    bands: [],
    refs: [ref(CLO, "8.6 Patients with Renal or Hepatic Impairment", "Dose reduction may be necessary in patients with significant impairment of renal or hepatic function.", 110)],
  },
  hepatic: {
    value: "Dose reduction may be necessary in patients with significant impairment of hepatic function; higher clozapine plasma concentrations are likely.",
    refs: [ref(CLO, "8.6 Patients with Renal or Hepatic Impairment", "Dose reduction may be necessary in patients with significant impairment of renal or hepatic function. Clozapine concentrations may be increased in these patients", 170)],
  },
  black_box: {
    value: [
      "SEVERE NEUTROPENIA: CLOZARIL has caused severe neutropenia, associated with serious and fatal infections. Obtain baseline ANC (initiate only if ANC >=1500/uL, or >=1000/uL for Benign Ethnic Neutropenia) and monitor ANC per schedule.",
      "ORTHOSTATIC HYPOTENSION, BRADYCARDIA, AND SYNCOPE: Can occur with first dose or as low as 12.5 mg/day; initiate at 12.5 mg once or twice daily and titrate slowly.",
      "SEIZURES: Risk is dose-related; initiate at 12.5 mg, titrate gradually, and use divided doses.",
      "MYOCARDITIS, PERICARDITIS, CARDIOMYOPATHY, AND MITRAL VALVE INCOMPETENCE: Fatal myocarditis and cardiomyopathy have occurred; discontinue and obtain cardiac evaluation if suspected.",
      "INCREASED MORTALITY IN ELDERLY PATIENTS WITH DEMENTIA-RELATED PSYCHOSIS: CLOZARIL is not approved for this condition.",
    ],
    refs: [ref(CLO, "BOXED WARNING", "WARNING: SEVERE NEUTROPENIA; ORTHOSTATIC HYPOTENSION, BRADYCARDIA, AND SYNCOPE; SEIZURE; MYOCARDITIS, PERICARDITIS AND CARDIOMYOPATHY; INCREASED MORTALITY IN ELDERLY PATIENTS WITH DEMENTIA-RELATED PSYCHOSIS", 240)],
  },
  mg_safety: {
    value: "caution",
    refs: [ref(CLO, "6.2 Postmarketing Experience", "Musculoskeletal System and Connective Tissue Disorders Myasthenic syndrome, rhabdomyolysis, and systemic lupus erythematosus.", 140)],
    note: "Postmarketing experience lists myasthenic syndrome; dysphagia, sedation, and anticholinergic toxicity also warrant caution.",
  },
  ng_tube: { value: null, refs: [], note: "No enteral tube administration instructions in FDA label." },
  pgx: {
    value: "Substrate for CYP1A2, CYP2D6, and CYP3A4. CYP2D6 poor metabolizers (3%–10% of population) may develop higher than expected plasma concentrations and may require dose reduction.",
    refs: [ref(CLO, "8.7 CYP2D6 Poor Metabolizers", "Dose reduction may be necessary in patients who are CYP2D6 poor metabolizers. Clozapine concentrations may be increased in these patients, because clozapine is almost completely metabolized and then excreted", 220)],
  },
  ae_tags: {
    value: ["sedation_somnolence", "weight_gain", "qt_prolongation", "hepatotoxicity", "pancreatitis", "rash_sjs_ten", "confusion_delirium", "myoclonus", "hyponatremia", "extrapyramidal"],
    refs: [
      ref(CLO, "6 ADVERSE REACTIONS", "Most common adverse reactions (≥5%) were: CNS reactions (sedation, dizziness/vertigo, headache, and tremor); cardiovascular reactions (tachycardia, hypotension, and syncope); autonomic nervous system reactions (hypersalivation, sweating, dry mouth, and visual disturbances)", 290),
      ref(CLO, "6.2 Postmarketing Experience", "QT interval prolongation, Torsades de Pointes", 50),
    ],
  },
  adverse_effects: {
    most_common: {
      value: [
        "Sedation/somnolence, dizziness/vertigo, headache, tremor",
        "Hypersalivation (salivary hypersecretion), dry mouth, sweating, visual disturbances",
        "Tachycardia, hypotension, syncope, constipation, nausea, fever, weight gain",
      ],
      refs: [ref(CLO, "6 ADVERSE REACTIONS", "Most common adverse reactions (≥5%) were: CNS reactions (sedation, dizziness/vertigo, headache, and tremor); cardiovascular reactions (tachycardia, hypotension, and syncope); autonomic nervous system reactions (hypersalivation, sweating, dry mouth, and visual disturbances); gastrointestinal reactions (constipation and nausea); and fever.", 340)],
    },
    serious: {
      value: [
        "Severe neutropenia / agranulocytosis",
        "Orthostatic hypotension, bradycardia, syncope, and cardiac arrest",
        "Myocarditis, pericarditis, cardiomyopathy, mitral valve incompetence",
        "Seizures (including status epilepticus), QT prolongation / Torsades de pointes",
        "Severe GI hypomotility (megacolon, intestinal ischemia/perforation), hepatotoxicity/liver failure, pancreatitis, pulmonary embolism, NMS, SJS",
      ],
      refs: [ref(CLO, "6 ADVERSE REACTIONS", "Severe Neutropenia [see Warnings and Precautions ( 5.1 )] • Orthostatic Hypotension, Bradycardia, and Syncope [see Warnings and Precautions ( 5.2 )] • Falls [see Warnings and Precautions ( 5.3 )] • Seizures [see Warnings and Precautions ( 5.4 )] • Myocarditis, Pericarditis, Cardiomyopathy", 320)],
    },
  },
  mechanism_of_action: {
    value: "Atypical antipsychotic (tricyclic dibenzodiazepine) proposed to act via antagonism of dopamine D2 and serotonin 5-HT2A receptors, plus adrenergic, cholinergic, and histaminergic antagonism.",
    refs: [ref(CLO, "12.1 Mechanism of Action", "it has been proposed that the therapeutic efficacy of clozapine in schizophrenia is mediated through antagonism of the dopamine type 2 (D 2 ) and the serotonin type 2A (5-HT 2A ) receptors.", 190)],
  },
  enzyme_profile: {
    value: { cyp1a2: "substrate", cyp2d6: "substrate", cyp3a4: "substrate", qt_risk: "possible" },
    refs: [
      ref(CLO, "7.1 Potential for Other Drugs to Affect CLOZARIL", "Clozapine is a substrate for many cytochrome P450 isozymes, in particular CYP1A2, CYP3A4, and CYP2D6.", 120),
      ref(CLO, "6.2 Postmarketing Experience", "QT interval prolongation, Torsades de Pointes", 50),
    ],
  },
  fda_interactions: {
    value: [
      {
        drug_or_class: "Strong CYP1A2 Inhibitors (fluvoxamine, ciprofloxacin, enoxacin)",
        severity: "major",
        effect: "Markedly increases clozapine plasma levels (fluvoxamine elevated clozapine trough concentrations ~3-fold).",
        management: "Reduce clozapine dose to one-third of the original dose; restore original dose when strong CYP1A2 inhibitor is discontinued.",
        refs: [ref(CLO, "7 DRUG INTERACTIONS", "Reduce CLOZARIL dose to one-third when coadministered with strong CYP1A2 inhibitors (e.g., fluvoxamine, ciprofloxacin, enoxacin).", 140)],
      },
      {
        drug_or_class: "CYP2D6 and CYP3A4 Inhibitors (fluoxetine, paroxetine, sertraline, duloxetine, cimetidine, erythromycin)",
        severity: "moderate",
        effect: "Can increase clozapine plasma levels (<2-fold) and lead to adverse reactions.",
        management: "Use caution, monitor patients closely, and consider reducing the clozapine dose.",
        refs: [ref(CLO, "7.1 Potential for Other Drugs to Affect CLOZARIL", "Concomitant treatment with CLOZARIL and CYP2D6 or CYP3A4 inhibitors (e.g., cimetidine, escitalopram, erythromycin, paroxetine, bupropion, fluoxetine, quinidine, duloxetine, terbinafine, or sertraline) can increase clozapine levels and lead to adverse reactions", 280)],
      },
      {
        drug_or_class: "Strong CYP3A4 Inducers (carbamazepine, phenytoin, rifampin, St. John's wort)",
        severity: "major",
        effect: "Decreases clozapine plasma concentrations, risking reduced effectiveness; discontinuation of inducers can raise clozapine levels.",
        management: "Concomitant use is not recommended. If necessary, increase clozapine dose and monitor efficacy; reduce dose if inducer is discontinued.",
        refs: [ref(CLO, "7.1 Potential for Other Drugs to Affect CLOZARIL", "Strong CYP3A4 inducers include carbamazepine, phenytoin, St. John’s wort, and rifampin. It may be necessary to increase the CLOZARIL dose if used concomitantly with inducers of these enzymes. However, concomitant use of CLOZARIL and strong CYP3A4 inducers is not recommended", 300)],
      },
      {
        drug_or_class: "Anticholinergic Drugs",
        severity: "major",
        effect: "Increases risk of anticholinergic toxicity and severe gastrointestinal adverse reactions related to hypomotility.",
        management: "Avoid concomitant use of clozapine with anticholinergic drugs when possible.",
        refs: [ref(CLO, "7.1 Potential for Other Drugs to Affect CLOZARIL", "Concomitant treatment with clozapine and other drugs with anticholinergic activity (e.g., benztropine, cyclobenzaprine, diphenhydramine) can increase the risk for anticholinergic toxicity and severe gastrointestinal adverse reactions related to hypomotility. Avoid concomitant use of CLOZARIL with anticholinergic drugs when possible", 340)],
      },
      {
        drug_or_class: "Drugs that Prolong QT Interval (e.g., amiodarone, sotalol, erythromycin)",
        severity: "major",
        effect: "Additive QT interval prolongation risk.",
        management: "Use caution when administering concomitant medications that prolong the QT interval.",
        refs: [ref(CLO, "7.1 Potential for Other Drugs to Affect CLOZARIL", "Use caution when administering concomitant medications that prolong the QT interval or inhibit the metabolism of clozapine.", 130)],
      },
    ],
    refs: [ref(CLO, "7 DRUG INTERACTIONS", "Reduce CLOZARIL dose to one-third when coadministered with strong CYP1A2 inhibitors", 90)],
  },
  reproductive: {
    tier: {
      value: "caution",
      note: "Available epidemiologic studies over decades have not established a drug-associated risk of major birth defects or miscarriage, but third-trimester exposure risks neonatal EPS/withdrawal; present in human milk with reports of infant sedation and agranulocytosis.",
      refs: [ref(CLO, "8.1 Pregnancy — Risk Summary", "Available data from published epidemiologic studies over decades of use with clozapine during pregnancy have not established a drug-associated risk of major birth defects, miscarriage, or adverse maternal or fetal outcomes", 230)],
    },
    mcm: [],
    folic_acid: { value: null, refs: [], note: "No folic acid recommendation in FDA label." },
    contraception: { value: null, refs: [], note: "Oral contraceptives are noted as moderate/weak CYP1A2 inhibitors in Section 7.1 (monitor closely; consider reducing clozapine dose if needed)." },
    pregnancy_pk: {
      value: "Neonates exposed to antipsychotic drugs during the third trimester are at risk for extrapyramidal and/or withdrawal symptoms following delivery.",
      refs: [ref(CLO, "8.1 Pregnancy — Risk Summary", "Neonates exposed to antipsychotic drugs, including CLOZARIL, during the third trimester are at risk for extrapyramidal and/or withdrawal symptoms following delivery", 170)],
    },
    postpartum: {
      value: "Monitor neonates for extrapyramidal and/or withdrawal symptoms after third-trimester exposure; monitor breastfed infants for excess sedation and neutropenia.",
      refs: [ref(CLO, "8.2 Lactation — Clinical Considerations", "Infants exposed to CLOZARIL should be monitored for excess sedation and neutropenia.", 90)],
    },
    lactation_rid: { value: null, refs: [], note: "No RID percentage reported in FDA label." },
    lactation_summary: {
      value: "Clozapine is present in human milk; case reports exist of sedation and agranulocytosis in breastfed infants. Monitor exposed infants for excess sedation and neutropenia.",
      refs: [ref(CLO, "8.2 Lactation — Risk Summary", "Clozapine is present in human milk. There is one case report of sedation and a report of agranulocytosis in an infant exposed to clozapine through human milk", 170)],
    },
  },
  ...draftMeta(),
};

// ============================================================================
// 5. QUETIAPINE
// ============================================================================
const QUE = "fda-quetiapine-label";
const quetiapine = {
  id: "quetiapine",
  generic_name: "quetiapine",
  tall_man: {
    value: "quetiapine",
    refs: [ref(QUE, "11 DESCRIPTION", "SEROQUEL ® (quetiapine) is an atypical antipsychotic belonging to a chemical class, the dibenzothiazepine derivatives.", 120)],
    note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
  },
  classes: ["antipsychotic", "atypical antipsychotic", "second-generation antipsychotic", "dibenzothiazepine derivative"],
  subspecialties: ["other"],
  ...nullVnBhyt(),
  regimens: [
    {
      id: "que-po-schiz-adult",
      indication: "Schizophrenia (Adults)",
      setting: "maintenance_outpatient",
      route: "PO",
      refs: [
        ref(QUE, "2.2 Recommended Dosing", "Schizophrenia - Adults Day 1: 25 mg twice daily. Increase in increments of 25 mg-50 mg divided two or three times on Days 2 and 3 to range of 300-400 mg by Day 4.", 180),
      ],
      dose: { kind: "fixed", amount: 25, unit: "mg", frequency: "twice daily Day 1, titrate to 300–400 mg/day by Day 4 (recommended 150–750 mg/day; max 750 mg/day)", max_single: 750, max_daily: 750 },
      dose_text: "Day 1: 25 mg BID; increase by 25–50 mg BID–TID on Days 2–3 to 300–400 mg/day by Day 4; recommended 150–750 mg/day (max 750 mg/day).",
    },
    {
      id: "que-po-bipolar-mania-adult",
      indication: "Bipolar I Mania (Adults, Monotherapy or Adjunct to Lithium/Divalproex)",
      setting: "acute_inpatient",
      route: "PO",
      refs: [
        ref(QUE, "2.2 Recommended Dosing", "Bipolar Mania - Adults Monotherapy or as an adjunct to lithium or divalproex Day 1: Twice daily dosing totaling 100 mg. Day 2: Twice daily dosing totaling 200 mg. Day 3: Twice daily dosing totaling 300 mg. Day 4: Twice daily dosing totaling 400 mg.", 280),
      ],
      dose: { kind: "fixed", amount: 50, unit: "mg", frequency: "twice daily Day 1 (100 mg/day), titrate to 400 mg/day by Day 4 (recommended 400–800 mg/day; max 800 mg/day)", max_single: 800, max_daily: 800 },
      dose_text: "Day 1: 50 mg BID (100 mg/day), Day 2: 200 mg/day, Day 3: 300 mg/day, Day 4: 400 mg/day; further adjustments up to 800 mg/day by Day 6 (max 800 mg/day).",
    },
    {
      id: "que-po-bipolar-dep-adult",
      indication: "Bipolar Depression (Adults)",
      setting: "maintenance_outpatient",
      route: "PO",
      refs: [
        ref(QUE, "2.2 Recommended Dosing", "Bipolar Depression - Adults Administer once daily at bedtime. Day 1: 50 mg Day 2: 100 mg Day 3: 200 mg Day 4: 300 mg 300 mg/day 300 mg/day", 160),
      ],
      dose: { kind: "fixed", amount: 50, unit: "mg", frequency: "once daily at bedtime Day 1 (100 mg Day 2, 200 mg Day 3, 300 mg Day 4; max 300 mg/day)", max_single: 300, max_daily: 300 },
      dose_text: "Once daily at bedtime: Day 1: 50 mg, Day 2: 100 mg, Day 3: 200 mg, Day 4: 300 mg (recommended and maximum 300 mg/day).",
    },
    {
      id: "que-po-schiz-adol",
      indication: "Schizophrenia (Adolescents 13–17 years)",
      setting: "maintenance_outpatient",
      route: "PO",
      refs: [
        ref(QUE, "2.2 Recommended Dosing", "Schizophrenia - Adolescents (13-17 years) Day 1: 25 mg twice daily. Day 2: Twice daily dosing totaling 100 mg. Day 3: Twice daily dosing totaling 200 mg. Day 4: Twice daily dosing totaling 300 mg. Day 5: Twice daily dosing totaling 400 mg.", 260),
      ],
      dose: { kind: "fixed", amount: 25, unit: "mg", frequency: "twice daily Day 1, titrate to 400 mg/day by Day 5 (recommended 400–800 mg/day; max 800 mg/day)", max_single: 800, max_daily: 800 },
      dose_text: "Day 1: 25 mg BID; Day 2: 100 mg/day; Day 3: 200 mg/day; Day 4: 300 mg/day; Day 5: 400 mg/day; recommended 400–800 mg/day (max 800 mg/day).",
    },
  ],
  renal_basis: {
    value: "cg_normalized_1_73",
    refs: [ref(QUE, "12.3 Pharmacokinetics — Renal Insufficiency", "Patients with severe renal impairment (Clcr=10-30 mL/min/1.73 m 2 , n=8) had a 25% lower mean oral clearance than normal subjects (Clcr > 80 mL/min/1.73 m 2 , n=8), but plasma quetiapine concentrations in the subjects with renal insufficiency were within the range of concentrations seen in normal subjects receiving the same dose. Dosage adjustment is therefore not needed", 345)],
  },
  renal_impairment: {
    description: "Dosage adjustment is not needed in renal impairment (severe renal impairment Clcr 10–30 mL/min/1.73 m2 had 25% lower oral clearance, but plasma concentrations remained within normal range).",
    renal_basis: {
      value: "cg_normalized_1_73",
      refs: [ref(QUE, "12.3 Pharmacokinetics — Renal Insufficiency", "Dosage adjustment is therefore not needed in these patients", 65)],
    },
    bands: [],
    refs: [ref(QUE, "12.3 Pharmacokinetics — Renal Insufficiency", "Patients with severe renal impairment (Clcr=10-30 mL/min/1.73 m 2 , n=8) had a 25% lower mean oral clearance than normal subjects", 140)],
  },
  hepatic: {
    value: "Patients with hepatic impairment should be started on 25 mg/day and increased daily in increments of 25–50 mg/day to an effective dose (mean oral clearance 30% lower; AUC and Cmax 3x higher in 2 of 8 patients).",
    refs: [ref(QUE, "2.4 Dose Modifications in Hepatically Impaired Patients", "Patients with hepatic impairment should be started on 25 mg/day. The dose should be increased daily in increments of 25 mg/day - 50 mg/day to an effective dose, depending on the clinical response and tolerability of the patient.", 240)],
  },
  black_box: {
    value: [
      "INCREASED MORTALITY IN ELDERLY PATIENTS WITH DEMENTIA-RELATED PSYCHOSIS: Elderly patients with dementia-related psychosis treated with antipsychotic drugs are at an increased risk of death; SEROQUEL is not approved for this use.",
      "SUICIDAL THOUGHTS AND BEHAVIORS: Antidepressants increased the risk of suicidal thoughts and behavior in children, adolescents, and young adults in short-term studies; monitor closely for worsening and emergence of suicidal thoughts and behaviors.",
    ],
    refs: [ref(QUE, "BOXED WARNING", "WARNING: INCREASED MORTALITY IN ELDERLY PATIENTS WITH DEMENTIA-RELATED PSYCHOSIS; and SUICIDAL THOUGHTS AND BEHAVIORS", 120)],
  },
  mg_safety: {
    value: "caution",
    refs: [ref(QUE, "6 ADVERSE REACTIONS", "Dysphagia [see Warnings and Precautions (5.18 )] • Discontinuation Syndrome [see Warnings and Precautions (5.19 )] • Anticholinergic (antimuscarinic) Effects [see Warnings and Precautions (5.20 )]", 210)],
    note: "No specific MG warning in FDA label; dysphagia, anticholinergic effects, and somnolence warrant caution.",
  },
  ng_tube: { value: null, refs: [], note: "No enteral tube administration instructions in FDA label." },
  pgx: {
    value: "Metabolized extensively by the liver via CYP3A4 to inactive sulfoxide metabolite and active norquetiapine. Non-inhibitor of CYP1A2, 2C9, 2C19, 2D6, and 3A4.",
    refs: [ref(QUE, "12.3 Pharmacokinetics — Metabolism and Elimination", "cytochrome P450 3A4 isoenzyme is involved in the metabolism of quetiapine to its major, but inactive, sulfoxide metabolite and in the metabolism of its active metabolite N-desalkyl quetiapine.", 200)],
  },
  ae_tags: {
    value: ["sedation_somnolence", "weight_gain", "qt_prolongation", "hepatotoxicity", "hyponatremia", "pancreatitis", "rash_sjs_ten", "ataxia", "confusion_delirium"],
    refs: [
      ref(QUE, "6 ADVERSE REACTIONS", "Most common adverse reactions (incidence ≥5% and twice placebo): Adults: somnolence, dry mouth, dizziness, constipation, asthenia, abdominal pain, postural hypotension, pharyngitis, weight gain, lethargy, ALT increased, dyspepsia", 250),
      ref(QUE, "6.2 Postmarketing Experience", "hyponatremia, myocarditis, nocturnal enuresis, pancreatitis, retrograde amnesia, rhabdomyolysis, syndrome of inappropriate antidiuretic hormone secretion (SIADH), Stevens-Johnson syndrome (SJS), toxic epidermal necrolysis (TEN)", 240),
    ],
  },
  adverse_effects: {
    most_common: {
      value: [
        "Somnolence/sedation, dizziness, lethargy, asthenia",
        "Dry mouth, constipation, dyspepsia, abdominal pain",
        "Postural hypotension, weight gain, ALT increased, pharyngitis",
      ],
      refs: [ref(QUE, "6 ADVERSE REACTIONS", "Adults: somnolence, dry mouth, dizziness, constipation, asthenia, abdominal pain, postural hypotension, pharyngitis, weight gain, lethargy, ALT increased, dyspepsia", 180)],
    },
    serious: {
      value: [
        "Increased mortality and cerebrovascular adverse reactions in elderly patients with dementia-related psychosis",
        "Suicidal thoughts and behaviors in adolescents and young adults",
        "Neuroleptic malignant syndrome (NMS), tardive dyskinesia, seizures, cataracts",
        "Metabolic changes (hyperglycemia, dyslipidemia, weight gain), hypotension, leukopenia/neutropenia/agranulocytosis",
        "Postmarketing: QT prolongation (overdose/concomitant illness/QT drugs), myocarditis, cardiomyopathy, serious liver reactions, SJS/TEN, DRESS, pancreatitis, SIADH/hyponatremia",
      ],
      refs: [ref(QUE, "6.2 Postmarketing Experience", "serious liver reactions (including hepatitis, liver necrosis, and hepatic failure), agranulocytosis, intestinal obstruction, ileus, colon ischemia", 160)],
    },
  },
  mechanism_of_action: {
    value: "Atypical antipsychotic (dibenzothiazepine) whose efficacy may be mediated through a combination of dopamine D2 and serotonin 5HT2 antagonism; active metabolite norquetiapine has greater affinity at 5HT2A receptors.",
    refs: [ref(QUE, "12.1 Mechanism of Action", "efficacy of quetiapine in these indications could be mediated through a combination of dopamine type 2 (D 2 ) and serotonin type 2 (5HT 2 ) antagonism. The active metabolite, N-desalkyl quetiapine (norquetiapine), has similar activity at D 2 , but greater activity at 5HT 2A receptors", 300)],
  },
  enzyme_profile: {
    value: { cyp3a4: "substrate", qt_risk: "possible" },
    refs: [
      ref(QUE, "12.3 Pharmacokinetics — Metabolism and Elimination", "cytochrome P450 3A4 isoenzyme is involved in the metabolism of quetiapine", 90),
      ref(QUE, "12.2 Pharmacodynamics — Effect on QT Interval", "In post marketing experience, there were cases reported of QT prolongation in patients who overdosed on quetiapine [see Overdosage (10.1) ], in patients with concomitant illness, and in patients taking medicines known to cause electrolyte imbalance or increase QT interval.", 270),
    ],
  },
  fda_interactions: {
    value: [
      {
        drug_or_class: "Strong CYP3A4 Inhibitors (e.g., ketoconazole, itraconazole, ritonavir, nefazodone)",
        severity: "major",
        effect: "Markedly increases quetiapine exposure (ketoconazole decreased oral clearance 84%, increasing AUC 6.2-fold).",
        management: "Reduce quetiapine dose to one-sixth of the original dose when co-administered with a strong CYP3A4 inhibitor; increase by 6-fold when discontinued.",
        refs: [ref(QUE, "7 DRUG INTERACTIONS", "Reduce quetiapine dose to one sixth when coadministered with strong CYP3A4 inhibitors (e.g., ketoconazole, ritonavir)", 140)],
      },
      {
        drug_or_class: "Strong CYP3A4 Inducers (e.g., phenytoin, carbamazepine, rifampin, St. John's wort)",
        severity: "major",
        effect: "Markedly decreases quetiapine exposure (phenytoin increased mean oral clearance 5-fold).",
        management: "Increase quetiapine dose up to 5-fold during chronic (>7–14 days) co-administration; reduce to original level within 7–14 days of discontinuation.",
        refs: [ref(QUE, "7 DRUG INTERACTIONS", "Increase quetiapine dose up to 5 fold when used in combination with a chronic treatment (more than 7-14 days) of potent CYP3A4 inducers (e.g., phenytoin, rifampin, St. John’s wort)", 200)],
      },
      {
        drug_or_class: "Levodopa and Dopamine Agonists",
        severity: "moderate",
        effect: "Quetiapine may antagonize the effects of levodopa and dopamine agonists.",
        management: "Monitor for reduced antiparkinsonian efficacy.",
        refs: [ref(QUE, "7.2 Effect of Quetiapine on Other Drugs", "SEROQUEL may antagonize the effects of levodopa and dopamine agonists.", 80)],
      },
      {
        drug_or_class: "Anticholinergic Drugs",
        severity: "moderate",
        effect: "Concomitant treatment can increase the risk for severe gastrointestinal adverse reactions related to hypomotility.",
        management: "Use with caution in patients receiving medications with anticholinergic (antimuscarinic) effects.",
        refs: [ref(QUE, "7.1 Effect of Other Drugs on Quetiapine", "Concomitant treatment with quetiapine and other drugs with anticholinergic activity can increase the risk for severe gastrointestinal adverse reactions related to hypomotility. SEROQUEL should be used with caution in patients receiving medications having anticholinergic (antimuscarinic) effects", 300)],
      },
    ],
    refs: [ref(QUE, "7 DRUG INTERACTIONS", "Concomitant use of strong CYP3A4 inhibitors: Reduce quetiapine dose to one sixth", 90)],
  },
  reproductive: {
    tier: {
      value: "caution",
      note: "Available epidemiologic studies have not established a drug-associated risk of major birth defects or miscarriage, though animal studies showed embryo-fetal toxicity at 1–2x MRHD and third-trimester exposure risks neonatal EPS/withdrawal.",
      refs: [ref(QUE, "8.1 Pregnancy — Risk Summary", "Overall available data from published epidemiologic studies of pregnant women exposed to quetiapine have not established a drug-associated risk of major birth defects, miscarriage, or adverse maternal or fetal outcomes", 230)],
    },
    mcm: [],
    folic_acid: { value: null, refs: [], note: "No folic acid recommendation in FDA label." },
    contraception: { value: null, refs: [], note: "No hormonal contraceptive interaction reported in FDA label." },
    pregnancy_pk: {
      value: "Neonates exposed to antipsychotic drugs during the third trimester are at risk for extrapyramidal and/or withdrawal symptoms following delivery.",
      refs: [ref(QUE, "8.1 Pregnancy — Risk Summary", "Neonates exposed to antipsychotic drugs (including SEROQUEL) during the third trimester are at risk for extrapyramidal and/or withdrawal symptoms following delivery", 170)],
    },
    postpartum: {
      value: "Monitor neonates for extrapyramidal and/or withdrawal symptoms after third-trimester exposure.",
      refs: [ref(QUE, "8.1 Pregnancy — Clinical Considerations", "Monitor neonates for extrapyramidal and/or withdrawal symptoms and manage symptoms appropriately.", 100)],
    },
    lactation_rid: {
      value: "<1% of the maternal weight-adjusted dosage",
      refs: [ref(QUE, "8.2 Lactation — Risk Summary", "presence of quetiapine in human breast milk at relative infant dose of <1% of the maternal weight-adjusted dosage.", 130)],
    },
    lactation_summary: {
      value: "Quetiapine is present in human breast milk at RID <1%; no consistent adverse events have been reported in exposed infants.",
      refs: [ref(QUE, "8.2 Lactation — Risk Summary", "Limited data from published literature report the presence of quetiapine in human breast milk at relative infant dose of <1% of the maternal weight-adjusted dosage. There are no consistent adverse events that have been reported in infants exposed to quetiapine through breast milk.", 300)],
    },
  },
  ...draftMeta(),
};

const DRUGS = [haloperidol, risperidone, olanzapine, clozapine, quetiapine];
for (const d of DRUGS) {
  const outPath = path.join(DRUGS_DIR, `${d.id}.json`);
  fs.writeFileSync(outPath, JSON.stringify(d, null, 2) + "\n", "utf-8");
  console.log(`Wrote ${outPath}`);
}
