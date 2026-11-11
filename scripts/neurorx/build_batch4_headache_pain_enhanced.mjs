// Build & enhance Batch 4: Headache, Pain & Spasticity (7 drugs)
// Drugs: sumatriptan, rimegepant, erenumab, amitriptyline, duloxetine, baclofen, tizanidine

import { updateDrug, getQuote } from "./enhance_common.mjs";

console.log("=== ENHANCING BATCH 4: HEADACHE, PAIN & SPASTICITY (7 DRUGS) ===");

// 1. SUMATRIPTAN
updateDrug("sumatriptan", (d) => {
  const sId = "fda-sumatriptan-label";
  const qCommon = getQuote(sId, "Only treatment-emergent adverse reactions that occurred at a frequency of 2% or more in any group treated with IMITREX tablets and that occurred at a frequency greater than the placebo group", 30, 260);
  const qSerious = getQuote(sId, "Myocardial ischemia/infarction and Prinzmetal’s angina: Perform cardiac evaluation in patients with multiple cardiovascular risk factors", 30, 240);

  d.adverse_effects = {
    most_common: {
      value: [
        "Atypical sensations (tingling, warm/cold sensations, numbness)",
        "Chest, throat, neck, or jaw tightness, pressure, or heaviness (non-cardiac triptan sensations)",
        "Dizziness, vertigo, and somnolence",
        "Nausea, vomiting, and malaise/fatigue",
        "Flushing and diaphoresis"
      ],
      refs: [{ source_id: sId, locator: "Section 6.1 Clinical Trials Experience", quote: qCommon }]
    },
    serious: {
      value: [
        "Myocardial ischemia, acute myocardial infarction, coronary artery vasospasm, and Prinzmetal's angina",
        "Life-threatening cardiac arrhythmias (ventricular tachycardia, ventricular fibrillation, cardiac arrest)",
        "Cerebral hemorrhage, subarachnoid hemorrhage, and ischemic stroke",
        "Peripheral vascular ischemia and colonic ischemia (ischemic colitis)",
        "Medication Overuse Headache (MOH) with frequent use (>=10 days/month)",
        "Serotonin syndrome (especially when combined with SSRIs, SNRIs, or MAOIs)"
      ],
      refs: [{ source_id: sId, locator: "Section 5.1 Myocardial Ischemia and Infarction", quote: qSerious }]
    }
  };
  return d;
});

// 2. RIMEGEPANT
updateDrug("rimegepant", (d) => {
  const sId = "fda-rimegepant-label";
  const qCommon = getQuote(sId, "most common adverse reaction in Study 1 was nausea (2% in patients who received NURTEC ODT compared to 0.4% of patients who received placebo)", 20, 200);
  const qSerious = getQuote(sId, "Hypersensitivity Reactions: If a serious hypersensitivity reaction occurs, discontinue NURTEC ODT and initiate appropriate therapy", 30, 260);

  d.adverse_effects = {
    most_common: {
      value: [
        "Nausea (2% vs 0.4% placebo)",
        "Abdominal pain / dyspepsia (2.4% with every-other-day preventive dosing)",
        "Drowsiness and fatigue",
        "Dry mouth"
      ],
      refs: [{ source_id: sId, locator: "Section 6.1 Clinical Trials Experience", quote: qCommon }]
    },
    serious: {
      value: [
        "Severe hypersensitivity reactions including dyspnea, rash, pruritus, and facial swelling (can occur days after administration)",
        "Severe anaphylaxis and angioedema",
        "Drug interactions with strong CYP3A4 inhibitors / inducers and P-gp inhibitors"
      ],
      refs: [{ source_id: sId, locator: "Section 5.1 Hypersensitivity Reactions", quote: qSerious }]
    }
  };
  return d;
});

// 3. ERENUMAB
updateDrug("erenumab", (d) => {
  const sId = "fda-erenumab-label";
  const qCommon = getQuote(sId, "The most common adverse reactions in AIMOVIG clinical studies (occurring in at least 3% of treated patients and more often than placebo) are injection site reactions and constipation", 30, 260);
  const qSerious = getQuote(sId, "Constipation with Serious Complications: Serious complications of constipation may occur", 20, 200);

  d.adverse_effects = {
    most_common: {
      value: [
        "Injection site reactions (pain, erythema, pruritus)",
        "Constipation (usually mild to moderate, occurring within days of first dose)",
        "Muscle spasms",
        "Upper respiratory tract infection"
      ],
      refs: [{ source_id: sId, locator: "Section 6.1 Clinical Trials Experience", quote: qCommon }]
    },
    serious: {
      value: [
        "Constipation with serious complications (bowel obstruction, severe impaction, obstipation, requiring hospitalization or surgical intervention)",
        "New-onset or worsening of preexisting hypertension (including hypertensive crisis / urgency)",
        "Severe systemic hypersensitivity reactions (rash, angioedema, anaphylaxis)",
        "Raynaud's phenomenon and peripheral vasospasm"
      ],
      refs: [{ source_id: sId, locator: "Section 5.2 Constipation with Serious Complications", quote: qSerious }]
    }
  };
  return d;
});

// 4. AMITRIPTYLINE
updateDrug("amitriptyline", (d) => {
  const sId = "fda-amitriptyline-label";
  const qCommon = getQuote(sId, "Anticholinergic: Paralytic ileus, hyperpyrexia; urinary retention, dilatation of the urinary tract; constipation; blurred vision, disturbance of accommodation, increased ocular pressure, mydriasis; dry mouth", 30, 260);
  const qSerious = getQuote(sId, "Cardiovascular: Myocardial infarction; stroke; nonspecific ECG changes and changes in AV conduction; heart block; arrhythmias; hypotension, particularly orthostatic hypotension; syncope", 30, 260);

  d.adverse_effects = {
    most_common: {
      value: [
        "Anticholinergic effects: dry mouth, blurred vision, cycloplegia, constipation",
        "Marked sedation, drowsiness, and fatigue (histaminergic H1 blockade)",
        "Weight gain and increased appetite",
        "Orthostatic hypotension and dizziness",
        "Urinary retention and urinary hesitancy",
        "Tremor and ataxia"
      ],
      refs: [{ source_id: sId, locator: "Section ADVERSE REACTIONS - Anticholinergic", quote: qCommon }]
    },
    serious: {
      value: [
        "Cardiovascular toxicity: fatal ventricular arrhythmias (torsades de pointes), QT prolongation, AV heart block, myocardial infarction, stroke",
        "Boxed Warning: Increased risk of suicidal thoughts and behaviors in young adults / pediatric patients",
        "Paralytic ileus and toxic megacolon",
        "Acute angle-closure glaucoma",
        "Central anticholinergic delirium, hallucinations, and confusion (high risk in elderly)",
        "Lowering of seizure threshold / generalized convulsions",
        "Serotonin syndrome (when combined with other serotonergic agents or MAOIs)"
      ],
      refs: [{ source_id: sId, locator: "Section ADVERSE REACTIONS - Cardiovascular", quote: qSerious }]
    }
  };
  return d;
});

// 5. DULOXETINE
updateDrug("duloxetine", (d) => {
  const sId = "fda-duloxetine-label";
  const qCommon = getQuote(sId, "Diabetic Peripheral Neuropathic Pain: Nausea, somnolence, decreased appetite, constipation, hyperhidrosis, and dry mouth", 20, 240);
  const qSerious = getQuote(sId, "Hepatotoxicity : Hepatic failure, sometimes fatal, has been reported. Discontinue Duloxetine delayed-release capsules in patients who develop jaundice or other evidence of clinically significant liver dysfunction", 30, 240);

  d.adverse_effects = {
    most_common: {
      value: [
        "Nausea (most frequent, often transient)",
        "Dry mouth (xerostomia)",
        "Somnolence, fatigue, and insomnia",
        "Constipation and decreased appetite / weight loss",
        "Hyperhidrosis (excessive sweating)",
        "Dizziness and headache",
        "Sexual dysfunction (erectile dysfunction, delayed ejaculation, anorgasmia)"
      ],
      refs: [{ source_id: sId, locator: "Section 6.1 Clinical Trials Experience", quote: qCommon }]
    },
    serious: {
      value: [
        "Severe hepatotoxicity, cholestatic jaundice, hepatic necrosis, and hepatic failure (sometimes fatal)",
        "Boxed Warning: Increased suicidal thoughts and behaviors in adolescents and young adults",
        "Orthostatic hypotension, syncope, and falls (especially in elderly patients)",
        "Serotonin syndrome (especially with concomitant MAOIs, triptans, or other serotonergic drugs)",
        "Hyponatremia and SIADH (Syndrome of Inappropriate Antidiuretic Hormone Secretion)",
        "Abnormal bleeding / hemorrhage (impairment of platelet aggregation via serotonin reuptake inhibition)",
        "Severe discontinuation syndrome upon abrupt cessation (electric shock-like sensations, dizziness, paresthesias)"
      ],
      refs: [{ source_id: sId, locator: "Section 5.2 Hepatotoxicity", quote: qSerious }]
    }
  };
  return d;
});

// 6. BACLOFEN
updateDrug("baclofen", (d) => {
  const sId = "fda-baclofen-label";
  const qCommon = getQuote(sId, "The most common is transient drowsiness (10 to 63%). In one controlled study of 175 patients, transient drowsiness was observed in 63% of those receiving baclofen compared to 36% of those in the placebo group", 30, 260);
  const qSerious = getQuote(sId, "If benefits are not evident after a reasonable trial period, patients should be slowly withdrawn from the drug (See WARNINGS , Abrupt Drug Withdrawal )", 30, 260);

  d.adverse_effects = {
    most_common: {
      value: [
        "Transient drowsiness (10% to 63%) and sedation",
        "Dizziness and lightheadedness (5% to 15%)",
        "Generalized muscle weakness and hypotonia (5% to 15%)",
        "Fatigue and lethargy (2% to 4%)",
        "Nausea, constipation, and dry mouth",
        "Urinary frequency and hesitancy"
      ],
      refs: [{ source_id: sId, locator: "Section ADVERSE REACTIONS", quote: qCommon }]
    },
    serious: {
      value: [
        "Severe withdrawal syndrome upon abrupt cessation (auditory/visual hallucinations, delirium, severe spasticity rebound, hyperpyrexia, status epilepticus)",
        "Severe central nervous system depression, respiratory depression, and coma (especially with renal impairment or overdose)",
        "Neuropsychiatric deterioration: acute confusion, severe depression, paranoia, and memory loss",
        "Lowering of seizure threshold in patients with epilepsy",
        "Hypotension and syncope"
      ],
      refs: [{ source_id: sId, locator: "Section DOSAGE AND ADMINISTRATION - Titration & Withdrawal", quote: qSerious }]
    }
  };
  return d;
});

// 7. TIZANIDINE
updateDrug("tizanidine", (d) => {
  const sId = "fda-tizanidine-label";
  const qCommon = getQuote(sId, "The most common adverse reactions (greater than 2% of 264 patients taking tizanidine and greater than in placebo-treated patients in three multiple dose, placebo-controlled studies) were dry mouth, somnolence, asthenia, dizziness", 30, 260);
  const qSerious = getQuote(sId, "Hypotension: monitor for signs and symptoms of hypotension, in particular in patients receiving concurrent antihypertensives; Zanaflex should not be used with other α 2 -adrenergic agonists", 30, 260);

  d.adverse_effects = {
    most_common: {
      value: [
        "Dry mouth (xerostomia, up to 49%)",
        "Somnolence and sedation (up to 48%)",
        "Asthenia, muscle weakness, and fatigue (up to 41%)",
        "Dizziness and lightheadedness (up to 16%)",
        "Urinary tract infections and urinary frequency",
        "Constipation and nausea"
      ],
      refs: [{ source_id: sId, locator: "Section 6.1 Clinical Trials Experience", quote: qCommon }]
    },
    serious: {
      value: [
        "Severe hypotension, bradycardia, orthostasis, and syncope (dose-dependent alpha-2 adrenergic agonism; contraindicated with CYP1A2 inhibitors like ciprofloxacin/fluvoxamine)",
        "Hepatotoxicity and liver injury (elevated transaminases ALT/AST >3x ULN, hepatitis; monitor baseline and periodic LFTs)",
        "Severe visual hallucinations and psychotic-like symptoms (delusions, hallucinations, paranoid thinking)",
        "Severe sedation and impaired mental alertness",
        "Rebound hypertension, tachycardia, and hypertonia upon abrupt withdrawal"
      ],
      refs: [{ source_id: sId, locator: "Section 5.1 Hypotension", quote: qSerious }]
    }
  };
  return d;
});

console.log("=== BATCH 4 COMPLETE (7/7 DRUGS) ===");
