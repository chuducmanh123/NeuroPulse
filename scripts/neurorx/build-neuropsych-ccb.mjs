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
// 1. ESZOPICLONE
// ============================================================================
const ESZ = "fda-eszopiclone-label";
const eszopiclone = {
  id: "eszopiclone",
  generic_name: "eszopiclone",
  tall_man: {
    value: "eszopiclone",
    refs: [ref(ESZ, "1 INDICATIONS AND USAGE", "LUNESTA ® (eszopiclone) is indicated for the treatment of insomnia.", 80)],
    note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
  },
  classes: ["sedative-hypnotic", "nonbenzodiazepine hypnotic", "cyclopyrrolone"],
  subspecialties: ["other"],
  ...nullVnBhyt(),
  regimens: [
    {
      id: "esz-po-insomnia-adult",
      indication: "Insomnia (Adults)",
      setting: "maintenance_outpatient",
      route: "PO",
      refs: [
        ref(ESZ, "2.1 Dosage in Adults", "The recommended starting dose is 1 mg. Dosing can be raised to 2 mg or 3 mg if clinically indicated.", 160),
        ref(ESZ, "2.1 Dosage in Adults", "The total dose of LUNESTA should not exceed 3 mg, once daily immediately before bedtime", 120),
      ],
      dose: { kind: "fixed", amount: 1, unit: "mg", frequency: "once daily immediately before bedtime (max 3 mg/day)", max_single: 3, max_daily: 3 },
      dose_text: "Initial: 1 mg orally immediately before bedtime (with at least 7–8 hours remaining before planned awakening). May increase to 2 mg or 3 mg if clinically indicated; maximum 3 mg/day. Do not take with or immediately after a heavy, high-fat meal.",
    },
    {
      id: "esz-po-insomnia-elderly",
      indication: "Insomnia (Geriatric or Debilitated Patients)",
      setting: "maintenance_outpatient",
      route: "PO",
      refs: [
        ref(ESZ, "2.2 Geriatric or Debilitated Patients", "The total dose of LUNESTA should not exceed 2 mg in elderly or debilitated patients.", 100),
      ],
      dose: { kind: "fixed", amount: 1, unit: "mg", frequency: "once daily immediately before bedtime (max 2 mg/day)", max_single: 2, max_daily: 2 },
      dose_text: "Initial: 1 mg orally immediately before bedtime; total dose should not exceed 2 mg in elderly or debilitated patients.",
    },
  ],
  renal_basis: {
    value: "cg_abw",
    refs: [ref(ESZ, "12.3 Pharmacokinetics — Renal Impairment", "No dose adjustment is necessary in patients with renal impairment, since less than 10% of the orally administered eszopiclone dose is excreted in the urine as parent drug.", 180)],
  },
  renal_impairment: {
    description: "No dose adjustment is necessary in patients with renal impairment, since less than 10% of the orally administered eszopiclone dose is excreted in the urine as parent drug.",
    renal_basis: {
      value: "cg_abw",
      refs: [ref(ESZ, "12.3 Pharmacokinetics — Renal Impairment", "No dose adjustment is necessary in patients with renal impairment, since less than 10% of the orally administered eszopiclone dose is excreted in the urine as parent drug.", 180)],
    },
    bands: [],
    refs: [ref(ESZ, "12.3 Pharmacokinetics — Renal Impairment", "No dose adjustment is necessary in patients with renal impairment, since less than 10% of the orally administered eszopiclone dose is excreted in the urine as parent drug.", 180)],
  },
  hepatic: {
    value: "No dose adjustment is necessary for mild-to-moderate hepatic impairment. In patients with severe hepatic impairment, total dose should not exceed 2 mg; use with caution in patients with hepatic impairment.",
    refs: [ref(ESZ, "8.6 Hepatic Impairment", "No dose adjustment is necessary for patients with mild-to-moderate hepatic impairment. Exposure was increased in severely impaired patients compared with healthy volunteers. The dose of LUNESTA should not exceed 2 mg in patients with severe hepatic impairment. LUNESTA should be used with caution in patients with hepatic impairment", 320)],
  },
  black_box: {
    value: [
      "WARNING: COMPLEX SLEEP BEHAVIORS: Complex sleep behaviors including sleep-walking, sleep-driving, and engaging in other activities while not fully awake may occur following use of LUNESTA. Some of these events may result in serious injuries, including death. Discontinue LUNESTA immediately if a patient experiences a complex sleep behavior.",
    ],
    refs: [ref(ESZ, "BOXED WARNING", "WARNING: COMPLEX SLEEP BEHAVIORS Complex sleep behaviors including sleep-walking, sleep-driving, and engaging in other activities while not fully awake may occur following use of LUNESTA. Some of these events may result in serious injuries, including death. Discontinue LUNESTA immediately if a patient experiences a complex sleep behavior", 335)],
  },
  mg_safety: {
    value: "caution",
    refs: [ref(ESZ, "12.1 Mechanism of Action", "its effect could be related to its interaction with GABA-receptor complexes at binding domains located close to or allosterically coupled to benzodiazepine receptors.", 170)],
    note: "Acts on GABA-receptor complexes coupled to benzodiazepine receptors and causes CNS depression; no specific myasthenia gravis warning in FDA label, use with caution.",
  },
  ng_tube: { value: null, refs: [], note: "No enteral tube administration instructions in FDA label." },
  pgx: { value: null, refs: [], note: "No pharmacogenomic dosing recommendations in FDA label (metabolized by CYP3A4 and CYP2E1)." },
  ae_tags: {
    value: ["sedation_somnolence", "confusion_delirium", "psychiatric_behavioral"],
    refs: [
      ref(ESZ, "6 ADVERSE REACTIONS", "Most commonly observed adverse reactions (incidence ≥2%) were unpleasant taste, headache, somnolence, respiratory infection, dizziness, dry mouth, rash, anxiety, hallucinations, and viral infections", 210),
    ],
  },
  adverse_effects: {
    most_common: {
      value: ["Unpleasant taste (dysgeusia)", "Headache, dizziness, somnolence", "Dry mouth, dyspepsia, nausea", "Respiratory infection, viral infection, rash, anxiety, hallucinations"],
      refs: [ref(ESZ, "6 ADVERSE REACTIONS", "Most commonly observed adverse reactions (incidence ≥2%) were unpleasant taste, headache, somnolence, respiratory infection, dizziness, dry mouth, rash, anxiety, hallucinations, and viral infections", 210)],
    },
    serious: {
      value: ["Complex sleep behaviors (sleep-walking, sleep-driving) including fatal injuries", "CNS depressant effects and next-day impairment", "Severe anaphylactic and anaphylactoid reactions (angioedema)", "Abnormal thinking, behavioral changes, hallucinations", "Withdrawal effects upon rapid dose reduction or discontinuation"],
      refs: [ref(ESZ, "6 ADVERSE REACTIONS", "Complex Sleep Behaviors [see Boxed Warning and Warnings and Precautions ( 5.1 )] CNS Depressant Effects and Next-Day Impairment", 150)],
    },
  },
  mechanism_of_action: {
    value: "Nonbenzodiazepine hypnotic (cyclopyrrolone) whose effect is thought to be related to interaction with GABA-receptor complexes at binding domains located close to or allosterically coupled to benzodiazepine receptors.",
    refs: [ref(ESZ, "12.1 Mechanism of Action", "The mechanism of action of eszopiclone as a hypnotic is unclear; however, its effect could be related to its interaction with GABA-receptor complexes at binding domains located close to or allosterically coupled to benzodiazepine receptors.", 250)],
  },
  enzyme_profile: {
    value: { cyp3a4: "substrate", qt_risk: "none", serotonergic: false },
    refs: [ref(ESZ, "12.3 Pharmacokinetics — Metabolism", "In vitro studies have shown that CYP3A4 and CYP2E1 enzymes are involved in the metabolism of eszopiclone. Eszopiclone did not show any inhibitory potential on CYP450 1A2, 2A6, 2C9, 2C19, 2D6, 2E1, and 3A4 in cryopreserved human hepatocytes.", 250)],
  },
  fda_interactions: {
    value: [
      {
        drug_or_class: "CNS Depressants (including Ethanol and Olanzapine)",
        severity: "moderate",
        effect: "Additive CNS-depressant effects and psychomotor impairment.",
        management: "Dosage adjustments may be necessary when LUNESTA is combined with other CNS depressant drugs.",
        refs: [ref(ESZ, "7 DRUG INTERACTIONS", "CNS Depressants: Additive CNS-depressant effects with combination use. Use with ethanol causes additive psychomotor impairment", 130)],
      },
      {
        drug_or_class: "Potent CYP3A4 Inhibitors (e.g., ketoconazole, itraconazole, clarithromycin, ritonavir, nelfinavir, nefazodone)",
        severity: "major",
        effect: "Ketoconazole increased eszopiclone exposure 2.2-fold (Cmax 1.4-fold, t1/2 1.3-fold).",
        management: "Total dose of LUNESTA should not exceed 2 mg in patients coadministered with potent CYP3A4 inhibitors.",
        refs: [ref(ESZ, "7.2 Drugs that Inhibit or Induce CYP3A4", "The exposure of eszopiclone was increased by coadministration of ketoconazole, a potent inhibitor of CYP3A4. Other strong inhibitors of CYP3A4 (e.g., itraconazole, clarithromycin, nefazodone, troleandomycin, ritonavir, nelfinavir) would be expected to behave similarly. Dose reduction of LUNESTA is needed", 310)],
      },
      {
        drug_or_class: "Potent CYP3A4 Inducers (e.g., rifampicin)",
        severity: "moderate",
        effect: "Racemic zopiclone exposure was decreased 80% by concomitant rifampicin; similar effect expected with eszopiclone.",
        management: "Combination use with a CYP3A4 inducer may decrease exposure and effects of LUNESTA.",
        refs: [ref(ESZ, "7.2 Drugs that Inhibit or Induce CYP3A4", "Racemic zopiclone exposure was decreased 80% by concomitant use of rifampicin, a potent inducer of CYP3A4. A similar effect would be expected with eszopiclone. Combination use with CYP3A4 inducer may decrease the exposure and effects of LUNESTA.", 260)],
      },
    ],
    refs: [ref(ESZ, "7 DRUG INTERACTIONS", "CNS Depressants: Additive CNS-depressant effects with combination use.", 80)],
  },
  reproductive: {
    tier: {
      value: "caution",
      note: "Available pharmacovigilance data in pregnant women are insufficient to identify drug-associated risk; no teratogenicity in rats/rabbits, but offspring toxicities in rats at >=200x MRHD (mg/m2); no data on human milk presence.",
      refs: [ref(ESZ, "8.1 Pregnancy — Risk Summary", "Available pharmacovigilance data with LUNESTA use in pregnant women are insufficient to identify a drug-associated risk of major birth defects, miscarriage, or adverse maternal or fetal outcomes.", 200)],
    },
    mcm: [],
    folic_acid: { value: null, refs: [], note: "Not clinically applicable" },
    contraception: { value: null, refs: [], note: "No hormonal contraceptive interaction reported in FDA label." },
    pregnancy_pk: {
      value: "Available pharmacovigilance data with LUNESTA use in pregnant women are insufficient to identify a drug-associated risk of major birth defects, miscarriage, or adverse maternal or fetal outcomes. No teratogenicity in rats or rabbits; offspring toxicities in rats at >=200x MRHD (mg/m2).",
      refs: [ref(ESZ, "8.1 Pregnancy — Risk Summary", "Administration of eszopiclone to rats throughout pregnancy and lactation resulted in offspring toxicities at all doses tested; the lowest dose was approximately 200 times the maximum recommended human dose (MRHD) of 3 mg/day based on mg/m 2 body surface area", 270)],
    },
    postpartum: { value: null, refs: [], note: "No specific postpartum warning in FDA label." },
    lactation_rid: { value: null, refs: [], note: "No data on presence in human milk." },
    lactation_summary: {
      value: "There are no data on the presence of eszopiclone in either human or animal milk, the effects on the breastfed infant, or the effects on milk production. Weigh developmental and health benefits of breastfeeding against maternal clinical need.",
      refs: [ref(ESZ, "8.2 Lactation — Risk Summary", "There are no data on the presence of eszopiclone in either human or animal milk, the effects on the breastfed infant, or the effects on milk production.", 160)],
    },
  },
  ...draftMeta(),
};

// ============================================================================
// 2. MIRTAZAPINE
// ============================================================================
const MIR = "fda-mirtazapine-label";
const mirtazapine = {
  id: "mirtazapine",
  generic_name: "mirtazapine",
  tall_man: {
    value: "mirtazapine",
    refs: [ref(MIR, "1 INDICATIONS AND USAGE", "REMERON/REMERONSolTab are indicated for the treatment of major depressive disorder (MDD) in adults", 100)],
    note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
  },
  classes: ["antidepressant", "tetracyclic antidepressant", "alpha-2 antagonist"],
  subspecialties: ["other"],
  ...nullVnBhyt(),
  regimens: [
    {
      id: "mir-po-mdd",
      indication: "Major Depressive Disorder (Adults)",
      setting: "maintenance_outpatient",
      route: "PO",
      refs: [
        ref(MIR, "2.1 Recommended Dosage", "The recommended starting dose of REMERON/REMERONSolTab is 15 mg once daily, administered orally, preferably in the evening prior to sleep. If patients do not have an adequate response to the initial 15 mg dose, increase the dose up to a maximum of 45 mg per day.", 280),
      ],
      dose: { kind: "fixed", amount: 15, unit: "mg", frequency: "once daily preferably in the evening prior to sleep (max 45 mg/day)", max_single: 45, max_daily: 45 },
      dose_text: "Initial: 15 mg orally once daily, preferably in the evening prior to sleep. May increase up to maximum 45 mg/day at intervals >=1 to 2 weeks. Reduce dose gradually when discontinuing.",
    },
  ],
  renal_basis: {
    value: "cg_normalized_1_73",
    refs: [ref(MIR, "12.3 Pharmacokinetics — Renal Impairment", "total body clearance of mirtazapine was reduced approximately 30% in renal impaired patients with GFR=11–39 mL/min/1.73 m 2 and approximately 50% in renal impaired patients with GFR=<10 mL/min/1.73 m 2 )", 210)],
  },
  renal_impairment: {
    description: "Clearance of mirtazapine is reduced ~30% in GFR 11–39 mL/min/1.73 m2 and ~50% in GFR <10 mL/min/1.73 m2. Dosage decrease may be necessary in moderate to severe renal impairment.",
    renal_basis: {
      value: "cg_normalized_1_73",
      refs: [ref(MIR, "8.6 Renal or Hepatic Impairment", "Dosage decrease may be necessary when administering REMERON/REMERONSolTab to patients with moderate to severe renal or hepatic impairment", 140)],
    },
    bands: [
      {
        min: 11,
        max: 39,
        dose_text: "Total body clearance reduced ~30% (GFR 11–39 mL/min/1.73 m2); dosage decrease may be necessary.",
        refs: [ref(MIR, "12.3 Pharmacokinetics — Renal Impairment", "total body clearance of mirtazapine was reduced approximately 30% in renal impaired patients with GFR=11–39 mL/min/1.73 m 2", 140)],
      },
      {
        min: null,
        max: 10,
        dose_text: "Total body clearance reduced ~50% (GFR <10 mL/min/1.73 m2); dosage decrease may be necessary.",
        refs: [ref(MIR, "12.3 Pharmacokinetics — Renal Impairment", "approximately 50% in renal impaired patients with GFR=<10 mL/min/1.73 m 2 )", 80)],
      },
    ],
    refs: [ref(MIR, "8.6 Renal or Hepatic Impairment", "The clearance of mirtazapine is reduced in patients with moderate to severe renal or hepatic impairment.", 110)],
  },
  hepatic: {
    value: "Oral clearance of mirtazapine decreased by approximately 30% in hepatic impairment; dosage decrease may be necessary when administering REMERON/REMERONSolTab to patients with hepatic impairment.",
    refs: [ref(MIR, "12.3 Pharmacokinetics — Hepatic Impairment", "Following a single 15-mg oral dose of REMERON, the oral clearance of mirtazapine in patients with hepatic impairment was decreased by approximately 30%, compared to subjects with normal hepatic function", 210)],
  },
  black_box: {
    value: [
      "WARNING: SUICIDAL THOUGHTS AND BEHAVIORS: Antidepressants increased the risk of suicidal thoughts and behaviors in pediatric and young adult patients in short-term studies. Closely monitor all antidepressant-treated patients for clinical worsening, and for emergence of suicidal thoughts and behaviors. REMERON/REMERONSolTab is not approved for use in pediatric patients.",
    ],
    refs: [ref(MIR, "BOXED WARNING", "WARNING: SUICIDAL THOUGHTS AND BEHAVIORS Antidepressants increased the risk of suicidal thoughts and behaviors in pediatric and young adult patients in short-term studies. Closely monitor all antidepressant-treated patients for clinical worsening, and for emergence of suicidal thoughts and behaviors", 310)],
  },
  mg_safety: {
    value: "safe",
    refs: [ref(MIR, "12.1 Mechanism of Action", "mirtazapine for the treatment of major depressive disorder", 60)],
    note: "No myasthenia gravis warning in FDA label.",
  },
  ng_tube: { value: null, refs: [], note: "REMERONSolTab (ODT) must be placed on tongue to disintegrate without chewing or crushing and not split; no NG tube instructions in FDA label." },
  pgx: { value: null, refs: [], note: "No specific pharmacogenomic dosing recommendations in FDA label (CYP2D6, CYP1A2, CYP3A involved in metabolism)." },
  ae_tags: {
    value: ["sedation_somnolence", "weight_gain", "hyponatremia", "serotonin_syndrome", "qt_prolongation", "confusion_delirium", "rash_sjs_ten"],
    refs: [
      ref(MIR, "6 ADVERSE REACTIONS", "Most common adverse reactions (≥5% or greater and twice placebo) were somnolence, increased appetite, weight gain, and dizziness.", 140),
    ],
  },
  adverse_effects: {
    most_common: {
      value: ["Somnolence (54%), dizziness (7%)", "Increased appetite (17%), weight gain (12%)", "Dry mouth (25%), constipation (13%), asthenia (8%)"],
      refs: [ref(MIR, "6.1 Clinical Trial Experience", "Most common adverse reactions (≥5% or greater and twice placebo) were somnolence, increased appetite, weight gain, and dizziness.", 140)],
    },
    serious: {
      value: ["Suicidal thoughts and behaviors in pediatric and young adult patients", "Agranulocytosis, serotonin syndrome, angle-closure glaucoma", "QT prolongation and Torsades de Pointes", "Severe skin reactions (DRESS, Stevens-Johnson syndrome, toxic epidermal necrolysis)", "Hyponatremia, seizures, activation of mania/hypomania, elevated cholesterol/triglycerides, transaminase elevations"],
      refs: [ref(MIR, "6 ADVERSE REACTIONS", "Agranulocytosis [see Warnings and Precautions (5.2) ] Serotonin Syndrome [see Contraindications (4) , Warnings and Precautions (5.3) , Drug Interactions (7) ] Angle-Closure Glaucoma [see Warnings and Precautions (5.4) ] QT Prolongation and Torsades de Pointes", 270)],
    },
  },
  mechanism_of_action: {
    value: "Antagonist at central presynaptic alpha-2-adrenergic inhibitory autoreceptors and heteroreceptors, enhancing central noradrenergic and serotonergic activity; also antagonizes 5-HT2, 5-HT3, H1, peripheral alpha-1, and muscarinic receptors.",
    refs: [ref(MIR, "12.1 Mechanism of Action", "its efficacy could be mediated through its activity as an antagonist at central presynaptic α 2 -adrenergic inhibitory autoreceptors and heteroreceptors and enhancing central noradrenergic and serotonergic activity.", 210)],
  },
  enzyme_profile: {
    value: { cyp1a2: "substrate", cyp2d6: "substrate", cyp3a4: "substrate", qt_risk: "possible", serotonergic: true },
    refs: [ref(MIR, "12.3 Pharmacokinetics — Metabolism", "In vitro data from human liver microsomes indicate that CYP2D6 and CYP1A2 are involved in the formation of the 8-hydroxy metabolite of mirtazapine, whereas CYP3A is considered to be responsible for the formation of the N-desmethyl and N-oxide metabolite.", 260)],
  },
  fda_interactions: {
    value: [
      {
        drug_or_class: "MAOIs (including linezolid and IV methylene blue)",
        severity: "contraindicated",
        effect: "Increased risk of serotonin syndrome.",
        management: "Contraindicated during or within 14 days of stopping MAOIs (and wait 14 days after stopping mirtazapine before starting an MAOI).",
        refs: [ref(MIR, "4 CONTRAINDICATIONS", "REMERON/REMERONSolTab is contraindicated in patients: Taking, or within 14 days of stopping, MAOIs (including the MAOIs linezolid and intravenous methylene blue) because of an increased risk of serotonin syndrome", 215)],
      },
      {
        drug_or_class: "Other Serotonergic Drugs (SSRIs, SNRIs, triptans, TCAs, tramadol, lithium, fentanyl, buspirone, St. John's Wort)",
        severity: "moderate",
        effect: "Increased risk of serotonin syndrome.",
        management: "Monitor patients for signs and symptoms of serotonin syndrome, particularly during initiation and dosage increases.",
        refs: [ref(MIR, "7 DRUG INTERACTIONS", "The concomitant use of serotonergic drugs with REMERON/REMERONSolTab increases the risk of serotonin syndrome. Intervention Monitor patients for signs and symptoms of serotonin syndrome, particularly during treatment initiation and dosage increases.", 260)],
      },
      {
        drug_or_class: "Strong CYP3A Inducers (phenytoin, carbamazepine, rifampin)",
        severity: "moderate",
        effect: "Decreases plasma concentration of mirtazapine (phenytoin -45%, carbamazepine -60%).",
        management: "Increase mirtazapine dose if needed with concomitant CYP3A inducer; decrease if inducer is discontinued.",
        refs: [ref(MIR, "7 DRUG INTERACTIONS", "The concomitant use of strong CYP3A inducers with REMERON/REMERONSolTab decreases the plasma concentration of mirtazapine [see Clinical Pharmacology (12.3) ] . Intervention Increase the dose of REMERON/REMERONSolTab if needed with concomitant CYP3A inducer use.", 270)],
      },
      {
        drug_or_class: "Strong CYP3A Inhibitors (ketoconazole, itraconazole, clarithromycin, ritonavir, nefazodone) & Cimetidine",
        severity: "moderate",
        effect: "Increases plasma concentration of mirtazapine (ketoconazole AUC +50%, cimetidine AUC >50%).",
        management: "Decrease mirtazapine dose if needed with concomitant strong CYP3A inhibitor or cimetidine.",
        refs: [ref(MIR, "7 DRUG INTERACTIONS", "The concomitant use of strong CYP3A inhibitors with REMERON/REMERONSolTab may increase the plasma concentration of mirtazapine [see Clinical Pharmacology (12.3) ] . Intervention Decrease the dose of REMERON/REMERONSolTab if needed", 240)],
      },
      {
        drug_or_class: "Benzodiazepines (diazepam, alprazolam) and Alcohol",
        severity: "contraindicated",
        effect: "Increases impairment of cognitive and motor skills produced by mirtazapine alone.",
        management: "Avoid concomitant use of benzodiazepines and alcohol with REMERON/REMERONSolTab.",
        refs: [ref(MIR, "7 DRUG INTERACTIONS", "Avoid concomitant use of benzodiazepines and alcohol with REMERON/REMERONSolTab", 90)],
      },
      {
        drug_or_class: "Drugs that Prolong QTc Interval",
        severity: "moderate",
        effect: "Increased risk of QT prolongation and/or ventricular arrhythmias (e.g., Torsades de Pointes).",
        management: "Use caution when using mirtazapine concomitantly with drugs that prolong the QTc interval.",
        refs: [ref(MIR, "7 DRUG INTERACTIONS", "The concomitant use of other drugs which prolong the QTc interval with REMERON/REMERONSolTab, increase the risk of QT prolongation and/or ventricular arrhythmias (e.g., Torsades de Pointes). Intervention Use caution", 220)],
      },
      {
        drug_or_class: "Warfarin",
        severity: "moderate",
        effect: "Mirtazapine (30 mg/day) caused a statistically significant increase (0.2) in INR.",
        management: "Monitor INR during concomitant use of warfarin with REMERON/REMERONSolTab.",
        refs: [ref(MIR, "7 DRUG INTERACTIONS", "The concomitant use of warfarin with REMERON/REMERONSolTab may result in an increase in INR [see Clinical Pharmacology (12.3) ] . Intervention Monitor INR during concomitant use of warfarin with REMERON/REMERONSolTab.", 225)],
      },
    ],
    refs: [ref(MIR, "7 DRUG INTERACTIONS", "Table 5: Clinically Important Drug Interactions with REMERON/REMERONSolTab", 80)],
  },
  reproductive: {
    tier: {
      value: "caution",
      note: "Prolonged human experience has not reliably identified a drug-associated risk of major birth defects or miscarriage, but animal studies showed postimplantation loss and pup deaths at 20x MRHD; present in human milk at low RID (0.6–2.8%).",
      refs: [ref(MIR, "8.1 Pregnancy — Risk Summary", "Prolonged experience with mirtazapine in pregnant women, based on published observational studies and postmarketing reports, has not reliably identified a drug-associated risk of major birth defects, miscarriage or adverse maternal or fetal outcomes.", 250)],
    },
    mcm: [],
    folic_acid: { value: null, refs: [], note: "Not clinically applicable" },
    contraception: { value: null, refs: [], note: "No hormonal contraceptive interaction reported in FDA label." },
    pregnancy_pk: {
      value: "Prolonged experience with mirtazapine in pregnant women has not reliably identified a drug-associated risk of major birth defects, miscarriage, or adverse maternal or fetal outcomes. Consider risk of untreated depression when discontinuing or changing treatment.",
      refs: [ref(MIR, "8.1 Pregnancy — Clinical Considerations", "Women who discontinue antidepressants during pregnancy are more likely to experience a relapse of major depression than women who continue antidepressants.", 160)],
    },
    postpartum: {
      value: "Consider the risk of untreated depression when discontinuing or changing treatment with antidepressant medication during pregnancy and postpartum.",
      refs: [ref(MIR, "8.1 Pregnancy — Clinical Considerations", "Consider the risk of untreated depression when discontinuing or changing treatment with antidepressant medication during pregnancy and postpartum.", 140)],
    },
    lactation_rid: {
      value: "0.6% to 2.8% (mean 1.5% for mirtazapine and 0.4% for desmethyl metabolite in 8 mother-infant pairs)",
      refs: [ref(MIR, "8.2 Lactation — Risk Summary", "Data from published literature report the presence of mirtazapine in human milk at low levels with relative infant doses for mirtazapine ranging between 0.6 and 2.8% of the maternal weight-adjusted dose", 210)],
    },
    lactation_summary: {
      value: "Present in human milk at low levels (RID 0.6–2.8%); no adverse effects on the breastfed infant reported in most cases (none in 8-pair pooled analysis). Weigh developmental/health benefits of breastfeeding against maternal clinical need.",
      refs: [ref(MIR, "8.2 Lactation — Risk Summary", "No adverse effects on the breastfed infant have been reported in most cases of maternal use of mirtazapine.", 110)],
    },
  },
  ...draftMeta(),
};

// ============================================================================
// 3. VENLAFAXINE
// ============================================================================
const VEN = "fda-venlafaxine-label";
const venlafaxine = {
  id: "venlafaxine",
  generic_name: "venlafaxine",
  tall_man: {
    value: "venlafaxine",
    refs: [ref(VEN, "1 INDICATIONS AND USAGE", "Effexor XR is a serotonin and norepinephrine reuptake inhibitor (SNRI) indicated for the treatment of adults with:", 120)],
    note: "Not listed in FDA/ISMP Tall Man list; generic name lowercase per EXTRACTION.md",
  },
  classes: ["antidepressant", "serotonin and norepinephrine reuptake inhibitor", "SNRI"],
  subspecialties: ["other"],
  ...nullVnBhyt(),
  regimens: [
    {
      id: "ven-po-mdd-gad",
      indication: "Major Depressive Disorder & Generalized Anxiety Disorder (Adults)",
      setting: "maintenance_outpatient",
      route: "PO",
      refs: [
        ref(VEN, "2.2 Major Depressive Disorder", "For most patients, the recommended starting dose for Effexor XR is 75 mg per day, administered in a single dose. For some patients, it may be desirable to start at 37.5 mg per day for 4 to 7 days to allow new patients to adjust to the medication before increasing to 75 mg per day.", 300),
        ref(VEN, "2.2 Major Depressive Disorder", "Patients not responding to the initial 75 mg per day dose may benefit from dose increases to a maximum of 225 mg per day.", 130),
      ],
      dose: { kind: "fixed", amount: 75, unit: "mg", frequency: "once daily with food (may start 37.5 mg/day for 4–7 days; max 225 mg/day)", max_single: 225, max_daily: 225 },
      dose_text: "Initial: 75 mg/day orally once daily with food (or 37.5 mg/day for 4–7 days to adjust). May increase in increments up to 75 mg/day at intervals >=4 days to maximum 225 mg/day. Swallow capsules whole or sprinkle contents on applesauce.",
    },
    {
      id: "ven-po-sad",
      indication: "Social Anxiety Disorder (Adults)",
      setting: "maintenance_outpatient",
      route: "PO",
      refs: [
        ref(VEN, "2.4 Social Anxiety Disorder", "The recommended dose is 75 mg per day, administered in a single dose. There was no evidence that higher doses confer any additional benefit.", 150),
      ],
      dose: { kind: "fixed", amount: 75, unit: "mg", frequency: "once daily with food", max_single: 75, max_daily: 75 },
      dose_text: "75 mg/day orally once daily with food (no evidence higher doses confer additional benefit).",
    },
    {
      id: "ven-po-pd",
      indication: "Panic Disorder (Adults)",
      setting: "maintenance_outpatient",
      route: "PO",
      refs: [
        ref(VEN, "2.5 Panic Disorder", "The recommended starting dose is 37.5 mg per day of Effexor XR for 7 days. Patients not responding to 75 mg per day may benefit from dose increases to a maximum of approximately 225 mg per day.", 200),
      ],
      dose: { kind: "fixed", amount: 37.5, unit: "mg", frequency: "once daily with food for 7 days, then 75 mg/day (max 225 mg/day)", max_single: 225, max_daily: 225 },
      dose_text: "Initial: 37.5 mg/day orally once daily with food for 7 days, then increase to 75 mg/day; may increase by up to 75 mg/day at intervals >=7 days up to maximum 225 mg/day.",
    },
  ],
  renal_basis: {
    value: "cg_abw",
    refs: [ref(VEN, "2.9 Dosage Recommendations for Patients with Renal Impairment", "Reduce the Effexor XR total daily dose by 25% to 50% in patients with mild (CLcr 60-89 mL/min) or moderate (CLcr 30-59 mL/min) renal impairment.", 160)],
  },
  renal_impairment: {
    description: "Reduce total daily dose by 25% to 50% in mild (CLcr 60–89 mL/min) or moderate (CLcr 30–59 mL/min) renal impairment; reduce by 50% or more in severe renal impairment (CLcr <30 mL/min) or hemodialysis.",
    renal_basis: {
      value: "cg_abw",
      refs: [ref(VEN, "2.9 Dosage Recommendations for Patients with Renal Impairment", "Reduce the Effexor XR total daily dose by 25% to 50% in patients with mild (CLcr 60-89 mL/min) or moderate (CLcr 30-59 mL/min) renal impairment.", 160)],
    },
    bands: [
      {
        min: 60,
        max: 89,
        dose_text: "Reduce total daily dose by 25% to 50% (mild renal impairment, CLcr 60–89 mL/min).",
        refs: [ref(VEN, "2.9 Dosage Recommendations for Patients with Renal Impairment", "Reduce the Effexor XR total daily dose by 25% to 50% in patients with mild (CLcr 60-89 mL/min) or moderate (CLcr 30-59 mL/min) renal impairment.", 160)],
      },
      {
        min: 30,
        max: 59,
        dose_text: "Reduce total daily dose by 25% to 50% (moderate renal impairment, CLcr 30–59 mL/min).",
        refs: [ref(VEN, "2.9 Dosage Recommendations for Patients with Renal Impairment", "Reduce the Effexor XR total daily dose by 25% to 50% in patients with mild (CLcr 60-89 mL/min) or moderate (CLcr 30-59 mL/min) renal impairment.", 160)],
      },
      {
        min: null,
        max: 29,
        dose_text: "Reduce total daily dose by 50% or more (severe renal impairment, CLcr <30 mL/min).",
        refs: [ref(VEN, "2.9 Dosage Recommendations for Patients with Renal Impairment", "Reduce the total daily dose by 50% or more in patients undergoing hemodialysis or with severe renal impairment (CLcr <30 mL/min).", 140)],
      },
    ],
    hemodialysis: {
      value: "Reduce the total daily dose by 50% or more in patients undergoing hemodialysis.",
      refs: [ref(VEN, "2.9 Dosage Recommendations for Patients with Renal Impairment", "Reduce the total daily dose by 50% or more in patients undergoing hemodialysis or with severe renal impairment (CLcr <30 mL/min).", 140)],
    },
    refs: [ref(VEN, "2.9 Dosage Recommendations for Patients with Renal Impairment", "Reduce the Effexor XR total daily dose by 25% to 50% in patients with mild (CLcr 60-89 mL/min) or moderate (CLcr 30-59 mL/min) renal impairment.", 160)],
  },
  hepatic: {
    value: "Reduce total daily dose by 50% in mild (Child-Pugh Class A) to moderate (Child-Pugh Class B) hepatic impairment. Reduce total daily dose by 50% or more in severe hepatic impairment (Child-Pugh Class C) or hepatic cirrhosis.",
    refs: [ref(VEN, "2.8 Dosage Recommendations for Patients with Hepatic Impairment", "Reduce the Effexor XR total daily dose by 50% in patients with mild (Child-Pugh Class A) to moderate (Child-Pugh Class B) hepatic impairment. Reduce the total daily dose by 50% or more in patients with severe hepatic impairment (Child-Pugh Class C) or hepatic cirrhosis", 270)],
  },
  black_box: {
    value: [
      "WARNING: SUICIDAL THOUGHTS AND BEHAVIORS: Antidepressants increased the risk of suicidal thoughts and behavior in pediatric and young adult patients in short-term studies. Closely monitor all antidepressant-treated patients for clinical worsening, and emergence of suicidal thoughts and behaviors. Effexor XR is not approved for use in pediatric patients.",
    ],
    refs: [ref(VEN, "BOXED WARNING", "WARNING: SUICIDAL THOUGHTS AND BEHAVIORS Antidepressants increased the risk of suicidal thoughts and behavior in pediatric and young adult patients in short-term studies. Closely monitor all antidepressant-treated patients for clinical worsening, and emergence of suicidal thoughts and behaviors", 300)],
  },
  mg_safety: {
    value: "safe",
    refs: [ref(VEN, "12.1 Mechanism of Action", "venlafaxine in the treatment of MDD, GAD, SAD, and PD", 60)],
    note: "No myasthenia gravis warning in FDA label.",
  },
  ng_tube: { value: null, refs: [], note: "Do not divide, crush, chew, or dissolve capsules; may open capsule and sprinkle contents on applesauce to swallow immediately without chewing. No NG tube instructions in FDA label." },
  pgx: {
    value: "CYP2D6 catalyzes formation of active metabolite O-desmethylvenlafaxine (ODV); CYP2D6 poor metabolizers have increased venlafaxine and reduced ODV levels compared to extensive metabolizers.",
    refs: [ref(VEN, "12.3 Pharmacokinetics — Metabolism", "In vitro studies indicate that the formation of ODV is catalyzed by CYP2D6; this has been confirmed in a clinical study showing that patients with low CYP2D6 levels (poor metabolizers) had increased levels of venlafaxine and reduced levels of ODV compared to people with normal CYP2D6 levels (extensive metabolizers)", 320)],
  },
  ae_tags: {
    value: ["serotonin_syndrome", "hyponatremia", "sedation_somnolence", "qt_prolongation", "rash_sjs_ten", "weight_loss"],
    refs: [
      ref(VEN, "6.1 Clinical Studies Experience", "The most commonly observed adverse reactions in the clinical study database in Effexor XR treated patients in MDD, GAD, SAD, and PD (incidence ≥5% and at least twice the rate of placebo) were: nausea (30.0%), somnolence (15.3%), dry mouth (14.8%), sweating (11.4%), abnormal ejaculation (9.9%), anorexia (9.8%), constipation (9.3%), impotence (5.3%), and decreased libido (5.1%).", 345),
    ],
  },
  adverse_effects: {
    most_common: {
      value: ["Nausea (30.0%), dry mouth (14.8%), constipation (9.3%), anorexia (9.8%)", "Insomnia (17.8%), dizziness (15.8%), somnolence (15.3%), tremor (4.7%)", "Asthenia (12.6%), sweating (11.4%)", "Abnormal ejaculation (9.9%), impotence (5.3%), decreased libido (5.1%)"],
      refs: [ref(VEN, "6.1 Clinical Studies Experience", "The most commonly observed adverse reactions in the clinical study database in Effexor XR treated patients in MDD, GAD, SAD, and PD (incidence ≥5% and at least twice the rate of placebo) were: nausea (30.0%), somnolence (15.3%), dry mouth (14.8%), sweating (11.4%), abnormal ejaculation (9.9%), anorexia (9.8%), constipation (9.3%), impotence (5.3%), and decreased libido (5.1%).", 345)],
    },
    serious: {
      value: ["Suicidal thoughts and behaviors in adolescents and young adults", "Serotonin syndrome / Neuroleptic Malignant Syndrome", "Elevated blood pressure (dose-related sustained hypertension)", "Increased risk of bleeding (GI hemorrhage, ecchymosis)", "Angle-closure glaucoma, seizures, hyponatremia/SIADH, interstitial lung disease/eosinophilic pneumonia, SJS/TEN, QT prolongation/TdP (postmarketing)"],
      refs: [ref(VEN, "6 ADVERSE REACTIONS", "• Serotonin Syndrome [see Warnings and Precautions (5.2) ] • Elevated Blood Pressure [see Warnings and Precautions (5.3) ] • Increased Risk of Bleeding [see Warnings and Precautions (5.4) ]", 200)],
    },
  },
  mechanism_of_action: {
    value: "Potent and selective inhibitor of neuronal serotonin and norepinephrine reuptake (SNRI) and weak inhibitor of dopamine reuptake, with no significant affinity for muscarinic-cholinergic, H1-histaminergic, or alpha-1-adrenergic receptors.",
    refs: [ref(VEN, "12.2 Pharmacodynamics", "In vitro studies have demonstrated that venlafaxine and its active metabolite, O-desmethylvenlafaxine (ODV), are potent and selective inhibitors of neuronal serotonin and norepinephrine reuptake and weak inhibitors of dopamine reuptake.", 240)],
  },
  enzyme_profile: {
    value: { cyp2d6: "substrate", qt_risk: "possible", serotonergic: true },
    refs: [ref(VEN, "12.3 Pharmacokinetics — Metabolism", "In vitro studies indicate that the formation of ODV is catalyzed by CYP2D6", 80)],
  },
  fda_interactions: {
    value: [
      {
        drug_or_class: "MAOIs (including linezolid and IV methylene blue)",
        severity: "contraindicated",
        effect: "Increased risk of serotonin syndrome.",
        management: "Contraindicated; allow at least 14 days after stopping an MAOI before starting Effexor XR, and at least 7 days after stopping Effexor XR before starting an MAOI.",
        refs: [ref(VEN, "4 CONTRAINDICATIONS", "Effexor XR is contraindicated in patients: • with known hypersensitivity to venlafaxine hydrochloride, desvenlafaxine succinate or to any excipients in the formulation [see Adverse Reactions (6.2) ] . • taking, or within 14 days of stopping, MAOIs (including the MAOIs linezolid and intravenous methylene blue) because of the risk of serotonin syndrome", 345)],
      },
      {
        drug_or_class: "Other Serotonergic Drugs (SNRIs, SSRIs, triptans, TCAs, opioids, lithium, buspirone, amphetamines, tryptophan, St. John's Wort)",
        severity: "moderate",
        effect: "Increases risk of serotonin syndrome.",
        management: "Monitor for symptoms of serotonin syndrome; discontinue Effexor XR and/or concomitant serotonergic drugs if serotonin syndrome occurs.",
        refs: [ref(VEN, "7.1 Drugs Having Clinically Important Interactions with Effexor XR", "Concomitant use of Effexor XR with other serotonergic drugs (including other SNRIs, SSRIs, triptans, tricyclic antidepressants, opioids, lithium, buspirone, amphetamines, tryptophan, and St. John's Wort) increases the risk of serotonin syndrome.", 260)],
      },
      {
        drug_or_class: "Drugs that Interfere with Hemostasis (antiplatelets, anticoagulants)",
        severity: "moderate",
        effect: "May potentiate the risk of bleeding via impaired platelet serotonin release.",
        management: "Closely monitor for bleeding when Effexor XR is initiated or discontinued.",
        refs: [ref(VEN, "7.1 Drugs Having Clinically Important Interactions with Effexor XR", "Concomitant use of Effexor XR with an antiplatelet or anticoagulant drug may potentiate the risk of bleeding. This may be due to the effect of Effexor XR on the release of serotonin by platelets. Intervention Closely monitor for bleeding", 250)],
      },
      {
        drug_or_class: "CYP3A Inhibitors",
        severity: "moderate",
        effect: "Increases Cmax and AUC of venlafaxine and O-desmethylvenlafaxine (ODV), increasing risk of toxicity.",
        management: "Consider reducing the dose of Effexor XR.",
        refs: [ref(VEN, "7.1 Drugs Having Clinically Important Interactions with Effexor XR", "Concomitant use of a CYP3A inhibitor increases the C max and AUC of venlafaxine and O-desmethylvenlafaxine (ODV) [see Clinical Pharmacology (12.3) ] , which may increase the risk of toxicity of Effexor XR. Intervention Consider reducing the dose of Effexor XR.", 270)],
      },
      {
        drug_or_class: "CYP2D6 Substrates",
        severity: "moderate",
        effect: "Increases Cmax and AUC of concomitant CYP2D6 substrates, increasing risk of substrate toxicity.",
        management: "Consider reduction in dose of concomitant CYP2D6 substrates.",
        refs: [ref(VEN, "7.1 Drugs Having Clinically Important Interactions with Effexor XR", "Concomitant use of Effexor XR increases C max and AUC of a CYP2D6 substrate, which may increase the risk of toxicity of the CYP2D6 substrate [see Clinical Pharmacology (12.3) ] . Intervention Consider reduction in dose of concomitant CYP2D6 substrates.", 270)],
      },
      {
        drug_or_class: "Weight Loss Agents (e.g., phentermine)",
        severity: "major",
        effect: "Safety and efficacy in combination have not been established.",
        management: "Concomitant use of Effexor XR and weight loss agents is not recommended.",
        refs: [ref(VEN, "7.2 Other Drug Interactions with Effexor XR", "Concomitant use of Effexor XR and weight loss agents is not recommended. The safety and efficacy of venlafaxine therapy in combination with weight loss agents, including phentermine, have not been established.", 210)],
      },
    ],
    refs: [ref(VEN, "7.1 Drugs Having Clinically Important Interactions with Effexor XR", "Table 15: Clinically Important Drug Interactions with Effexor XR", 70)],
  },
  reproductive: {
    tier: {
      value: "caution",
      note: "Epidemiologic studies have not established an increased risk of major birth defects or miscarriage, but observational studies suggest increased preeclampsia risk in mid-to-late pregnancy, <2-fold increased postpartum hemorrhage near delivery, and third-trimester poor neonatal adaptation; present in human milk (RID 6.4–8.1%).",
      refs: [ref(VEN, "8.1 Pregnancy — Risk Summary", "Available data from published epidemiologic studies on venlafaxine use in pregnant women have not identified a drug-associated risk of major birth defects, miscarriage or adverse fetal outcomes", 200)],
    },
    mcm: [],
    folic_acid: { value: null, refs: [], note: "Not clinically applicable" },
    contraception: { value: null, refs: [], note: "No hormonal contraceptive interaction reported in FDA label." },
    pregnancy_pk: {
      value: "Published epidemiologic studies have not established an increased risk of major birth defects or miscarriage. Mid-to-late pregnancy exposure may increase preeclampsia risk (adj RR 1.57); exposure in the month before delivery is associated with <2-fold increased postpartum hemorrhage; third-trimester exposure may cause poor neonatal adaptation.",
      refs: [
        ref(VEN, "8.1 Pregnancy — Risk Summary", "Available data from observational studies with venlafaxine have identified a potential increased risk for preeclampsia when used during mid to late pregnancy; exposure to SNRIs near delivery may increase the risk for postpartum hemorrhage", 240),
        ref(VEN, "8 USE IN SPECIFIC POPULATIONS", "Pregnancy: Third trimester use may increase risk for symptoms of poor neonatal adaptation (respiratory distress, temperature instability, feeding difficulty, hypotonia, tremor, irritability) in the neonate", 210),
      ],
    },
    postpartum: {
      value: "Monitor for postpartum hemorrhage if exposed near delivery (adj RR 2.24 through delivery), and monitor neonates exposed in the third trimester for poor neonatal adaptation / drug discontinuation syndrome.",
      refs: [ref(VEN, "8.1 Pregnancy — Data", "One study showed an increased risk for postpartum hemorrhage when venlafaxine exposure occurred through delivery, compared to unexposed depressed women (adj RR 2.24 [95% CI 1.69-2.97]).", 180)],
    },
    lactation_rid: {
      value: "6.4% to 8.1% (sum of venlafaxine and desvenlafaxine across two lactation studies)",
      refs: [ref(VEN, "8.2 Lactation — Data", "the estimated mean relative infant dose was 8.1% and 6.4% based on the sum of venlafaxine and its major metabolite, desvenlafaxine. No adverse reactions were seen in the infants.", 180)],
    },
    lactation_summary: {
      value: "Venlafaxine and its active metabolite are present in human milk (mean RID 6.4% and 8.1%); no adverse reactions were seen in breastfed infants in published lactation studies. Weigh developmental/health benefits of breastfeeding against maternal clinical need.",
      refs: [ref(VEN, "8.2 Lactation — Risk Summary", "Data from published literature report the presence of venlafaxine and its active metabolite in human milk and have not shown adverse reactions in breastfed infants", 160)],
    },
  },
  ...draftMeta(),
};

// ============================================================================
// 4. NIFEDIPINE
// ============================================================================
const NIF = "fda-nifedipine-label";
const nifedipine = {
  id: "nifedipine",
  generic_name: "nifedipine",
  tall_man: {
    value: "nifedipine",
    refs: [ref(NIF, "11 DESCRIPTION", "Nifedipine is a drug belonging to a class of pharmacological agents known as the calcium channel blockers.", 110)],
    note: "Lowercase generic per task specification and EXTRACTION.md",
  },
  classes: ["dihydropyridine calcium channel blocker", "antihypertensive", "antianginal"],
  subspecialties: ["other"],
  ...nullVnBhyt(),
  regimens: [
    {
      id: "nif-po-htn",
      indication: "Hypertension (Adults — Extended Release)",
      setting: "maintenance_outpatient",
      route: "PO",
      refs: [
        ref(NIF, "2 DOSAGE AND ADMINISTRATION", "Therapy for either hypertension or angina should be initiated with 30 or 60 mg once daily. PROCARDIA XL Extended Release Tablets should be swallowed whole and should not be bitten or divided.", 190),
        ref(NIF, "2 DOSAGE AND ADMINISTRATION", "Titration to doses above 120 mg are not recommended.", 60),
      ],
      dose: { kind: "fixed", amount: 30, unit: "mg", frequency: "once daily (initiate 30 or 60 mg once daily; max 120 mg/day)", max_single: 120, max_daily: 120 },
      dose_text: "Initial: 30 or 60 mg orally once daily (swallow whole; do not bite or divide). Titrate over 7–14 days; doses above 120 mg/day are not recommended. Avoid co-administration with grapefruit juice.",
    },
    {
      id: "nif-po-angina",
      indication: "Vasospastic Angina & Chronic Stable Angina (Adults — Extended Release)",
      setting: "maintenance_outpatient",
      route: "PO",
      refs: [
        ref(NIF, "2 DOSAGE AND ADMINISTRATION", "Experience with doses greater than 90 mg in patients with angina is limited. Therefore, doses greater than 90 mg should be used with caution and only when clinically warranted.", 180),
      ],
      dose: { kind: "fixed", amount: 30, unit: "mg", frequency: "once daily (initiate 30 or 60 mg once daily; use >90 mg with caution; max 120 mg/day)", max_single: 120, max_daily: 120 },
      dose_text: "Initial: 30 or 60 mg orally once daily (swallow whole; do not bite or divide). Experience with doses >90 mg in angina is limited (use with caution); doses above 120 mg/day are not recommended.",
    },
  ],
  renal_basis: {
    value: "cg_abw",
    refs: [ref(NIF, "12 CLINICAL PHARMACOLOGY — Pharmacokinetics", "the pharmacokinetics of nifedipine are not significantly influenced by the degree of renal impairment. Patients in hemodialysis or chronic ambulatory peritoneal dialysis have not reported significantly altered pharmacokinetics of nifedipine.", 240)],
  },
  renal_impairment: {
    description: "Pharmacokinetics of nifedipine are not significantly influenced by the degree of renal impairment; no altered pharmacokinetics in hemodialysis or chronic ambulatory peritoneal dialysis.",
    renal_basis: {
      value: "cg_abw",
      refs: [ref(NIF, "12 CLINICAL PHARMACOLOGY — Pharmacokinetics", "the pharmacokinetics of nifedipine are not significantly influenced by the degree of renal impairment.", 105)],
    },
    bands: [],
    hemodialysis: {
      value: "Patients in hemodialysis or chronic ambulatory peritoneal dialysis have not reported significantly altered pharmacokinetics of nifedipine.",
      refs: [ref(NIF, "12 CLINICAL PHARMACOLOGY — Pharmacokinetics", "Patients in hemodialysis or chronic ambulatory peritoneal dialysis have not reported significantly altered pharmacokinetics of nifedipine.", 140)],
    },
    refs: [ref(NIF, "12 CLINICAL PHARMACOLOGY — Pharmacokinetics", "the pharmacokinetics of nifedipine are not significantly influenced by the degree of renal impairment.", 105)],
  },
  hepatic: {
    value: "Patients with hepatic impairment (liver cirrhosis) have a longer disposition half-life and higher bioavailability of nifedipine than healthy volunteers; clearance is expected to be prolonged.",
    refs: [ref(NIF, "12 CLINICAL PHARMACOLOGY — Pharmacokinetics", "Patients with hepatic impairment (liver cirrhosis) have a longer disposition half-life and higher bioavailability of nifedipine than healthy volunteers.", 160)],
  },
  black_box: { value: null, refs: [], note: "No boxed warning in FDA Procardia XL label." },
  mg_safety: {
    value: "caution",
    refs: [ref(NIF, "12 CLINICAL PHARMACOLOGY", "Nifedipine is a calcium ion influx inhibitor (slow-channel blocker or calcium ion antagonist) and inhibits the transmembrane influx of calcium ions into cardiac muscle and smooth muscle.", 190)],
    note: "Calcium channel blockers can rarely exacerbate muscle weakness in myasthenia gravis; no specific MG warning in FDA label, use with clinical monitoring.",
  },
  ng_tube: {
    value: {
      crushable: false,
      instructions: "PROCARDIA XL Extended Release Tablets should be swallowed whole and should not be bitten or divided.",
    },
    refs: [ref(NIF, "2 DOSAGE AND ADMINISTRATION", "PROCARDIA XL Extended Release Tablets should be swallowed whole and should not be bitten or divided.", 105)],
  },
  pgx: { value: null, refs: [], note: "No pharmacogenomic dosing recommendations in FDA label (metabolized by CYP3A4)." },
  ae_tags: {
    value: ["sedation_somnolence", "rash_sjs_ten", "ataxia"],
    refs: [
      ref(NIF, "6 ADVERSE REACTIONS", "The most common side effect reported with PROCARDIA XL was edema which was dose related and ranged in frequency from approximately 10% to about 30% at the highest dose studied (180 mg).", 190),
    ],
  },
  adverse_effects: {
    most_common: {
      value: ["Peripheral edema (10–30%, dose-related)", "Headache (15.8%), fatigue (5.9%), dizziness (4.1%)", "Constipation (3.3%), nausea (3.3%)"],
      refs: [ref(NIF, "6 ADVERSE REACTIONS", "The most common side effect reported with PROCARDIA XL was edema which was dose related and ranged in frequency from approximately 10% to about 30% at the highest dose studied (180 mg). Other common adverse experiences reported in placebo-controlled trials include: Adverse Effect PROCARDIA XL (%) (N=707) Placebo (%) (N=266) Headache 15.8 9.8", 345)],
    },
    serious: {
      value: ["Severe hypotension, myocardial infarction, congestive heart failure or pulmonary edema", "Gastrointestinal obstruction / bezoar / tablet adherence ulceration", "Exfoliative dermatitis, Stevens-Johnson Syndrome (SJS), toxic epidermal necrolysis (TEN), AGEP"],
      refs: [ref(NIF, "6 ADVERSE REACTIONS", "There have been rare reports of exfoliative or bullous skin adverse events (such as erythema multiforme, Stevens-Johnson Syndrome, and toxic epidermal necrolysis) and photosensitivity reactions.", 195)],
    },
  },
  mechanism_of_action: {
    value: "Dihydropyridine calcium ion influx inhibitor (slow-channel blocker) that inhibits transmembrane influx of calcium ions into vascular smooth muscle and cardiac muscle, causing peripheral arterial vasodilation and reduced peripheral vascular resistance.",
    refs: [ref(NIF, "12 CLINICAL PHARMACOLOGY", "Nifedipine is a calcium ion influx inhibitor (slow-channel blocker or calcium ion antagonist) and inhibits the transmembrane influx of calcium ions into cardiac muscle and smooth muscle.", 190)],
  },
  enzyme_profile: {
    value: { cyp3a4: "substrate", qt_risk: "none", serotonergic: false },
    refs: [ref(NIF, "7 DRUG INTERACTIONS", "Nifedipine is metabolized by CYP3A4.", 40)],
  },
  fda_interactions: {
    value: [
      {
        drug_or_class: "Phenytoin and CYP3A4 Inducers",
        severity: "contraindicated",
        effect: "Phenytoin lowers systemic exposure to nifedipine by approximately 70%.",
        management: "Avoid co-administration of nifedipine with phenytoin or any known CYP3A4 inducer or consider an alternative antihypertensive therapy.",
        refs: [ref(NIF, "7 DRUG INTERACTIONS", "Co-administration of nifedipine with phenytoin, an inducer of CYP3A4, lowers the systemic exposure to nifedipine by approximately 70%. Avoid co-administration of nifedipine with phenytoin or any known CYP3A4 inducer or consider an alternative antihypertensive therapy.", 280)],
      },
      {
        drug_or_class: "CYP3A4 Inhibitors (e.g., fluconazole, itraconazole, clarithromycin, erythromycin, nefazodone, fluoxetine, ritonavir-class)",
        severity: "moderate",
        effect: "May result in increased exposure to nifedipine.",
        management: "Careful monitoring and dose adjustment may be necessary; consider initiating nifedipine at the lowest dose available.",
        refs: [ref(NIF, "7 DRUG INTERACTIONS", "CYP3A inhibitors such as fluconazole, itraconazole, clarithromycin, erythromycin, nefazodone, fluoxetine, saquinavir, indinavir, and nelfinavir may result in increased exposure to nifedipine when co‑administered. Careful monitoring and dose adjustment may be necessary; consider initiating nifedipine at the lowest dose available", 325)],
      },
      {
        drug_or_class: "Beta-adrenergic Blocking Agents",
        severity: "moderate",
        effect: "May increase likelihood of congestive heart failure, severe hypotension, or exacerbation of angina.",
        management: "Monitor blood pressure closely when introducing concomitant therapy.",
        refs: [ref(NIF, "7 DRUG INTERACTIONS", "there have been occasional literature reports suggesting that the combination may increase the likelihood of congestive heart failure, severe hypotension, or exacerbation of angina.", 180)],
      },
      {
        drug_or_class: "Digoxin",
        severity: "moderate",
        effect: "Increased digoxin levels in 9 of 12 normal volunteers (average increase 45%).",
        management: "Monitor digoxin levels when initiating, adjusting, and discontinuing nifedipine.",
        refs: [ref(NIF, "7 DRUG INTERACTIONS", "Administration of nifedipine with digoxin increased digoxin levels in nine of twelve normal volunteers. The average increase was 45%.", 135)],
      },
      {
        drug_or_class: "Cimetidine",
        severity: "moderate",
        effect: "Increased peak nifedipine plasma levels by 80% and AUC by 74%.",
        management: "Cautious titration is advised if nifedipine is initiated in a patient receiving cimetidine.",
        refs: [ref(NIF, "7 DRUG INTERACTIONS", "A study in six healthy volunteers has shown a significant increase in peak nifedipine plasma levels (80%) and area-under-the-curve (74%), after a one week course of cimetidine at 1000 mg per day and nifedipine at 40 mg per day.", 230)],
      },
      {
        drug_or_class: "Coumarin Anticoagulants",
        severity: "minor",
        effect: "Rare reports of increased prothrombin time; relationship uncertain.",
        management: "Monitor prothrombin time / INR if clinically indicated.",
        refs: [ref(NIF, "7 DRUG INTERACTIONS", "There have been rare reports of increased prothrombin time in patients taking coumarin anticoagulants to whom nifedipine was administered. However, the relationship to nifedipine therapy is uncertain.", 200)],
      },
      {
        drug_or_class: "Grapefruit Juice",
        severity: "contraindicated",
        effect: "Inhibits CYP3A4 first-pass metabolism and increases nifedipine exposure.",
        management: "Avoid co-administration of nifedipine with grapefruit juice.",
        refs: [ref(NIF, "2 DOSAGE AND ADMINISTRATION", "Avoid co-administration of nifedipine with grapefruit juice", 65)],
      },
    ],
    refs: [ref(NIF, "7 DRUG INTERACTIONS", "Nifedipine is metabolized by CYP3A4.", 40)],
  },
  reproductive: {
    tier: {
      value: "caution",
      note: "No adequate and well-controlled studies in pregnant women; animal studies showed teratogenic (digital anomalies), embryotoxic, placentotoxic, and fetotoxic effects. Label states to use during pregnancy only if potential benefit justifies potential risk.",
      refs: [ref(NIF, "8 USE IN SPECIFIC POPULATIONS — Pregnancy", "There are no adequate and well-controlled studies in pregnant women. PROCARDIA XL Extended Release Tablets should be used during pregnancy only if the potential benefit justifies the potential risk.", 200)],
    },
    mcm: [],
    folic_acid: { value: null, refs: [], note: "Not clinically applicable" },
    contraception: { value: null, refs: [], note: "No hormonal contraceptive interaction reported in FDA label." },
    pregnancy_pk: {
      value: "No adequate and well-controlled studies in pregnant women. Animal studies showed teratogenic (digital anomalies), embryotoxic, placentotoxic, and fetotoxic effects. Should be used during pregnancy only if potential benefit justifies potential risk.",
      refs: [ref(NIF, "8 USE IN SPECIFIC POPULATIONS — Pregnancy", "Nifedipine has been shown to produce teratogenic findings in rats and rabbits, including digital anomalies similar to those reported for phenytoin.", 150)],
    },
    postpartum: { value: null, refs: [], note: "No specific postpartum warning in FDA label." },
    lactation_rid: { value: null, refs: [], note: "No lactation data in FDA Procardia XL label." },
    lactation_summary: { value: null, refs: [], note: "No lactation data in FDA Procardia XL label." },
  },
  ...draftMeta(),
};

const ALL = [eszopiclone, mirtazapine, venlafaxine, nifedipine];
for (const drug of ALL) {
  const out = path.join(DRUGS_DIR, `${drug.id}.json`);
  fs.writeFileSync(out, JSON.stringify(drug, null, 2) + "\n", "utf-8");
  console.log(`✅ Created ${out}`);
}
