import fs from "fs";
import path from "path";
import { getQuote, updateDrug } from "./enhance_common.mjs";

console.log("=== ENHANCING BATCH 3: MOVEMENT DISORDERS & DEMENTIA (13 DRUGS) ===");

// 1. LEVODOPA-CARBIDOPA
updateDrug("levodopa-carbidopa", (d) => {
  const sId = "fda-levodopa-carbidopa-label";
  const qCommon = getQuote(sId, "The most common adverse reactions reported with SINEMET have included dyskinesias", 30, 220);
  const qSerious = getQuote(sId, "hallucinations, and paranoid ideation, bradykinetic episodes (\"on-off\" phenomenon), confusion, agitation", 30, 220);

  d.adverse_effects = {
    most_common: {
      value: [
        "Dyskinesias (choreiform, dystonic, and other involuntary movements)",
        "Nausea, vomiting, and anorexia",
        "Dizziness, lightheadedness, and orthostatic hypotension",
        "Somnolence and excessive daytime sleepiness",
        "Dream abnormalities, insomnia, and vivid nightmares"
      ],
      refs: [{ source_id: sId, locator: "Section ADVERSE REACTIONS", quote: qCommon }]
    },
    serious: {
      value: [
        "Visual hallucinations, paranoid ideation, psychosis, and delirium",
        "Motor fluctuations (severe 'on-off' phenomenon and end-of-dose wearing-off)",
        "Sudden sleep attacks (falling asleep while engaged in activities of daily living)",
        "Impulse control and compulsive behaviors (pathological gambling, hypersexuality, binge eating)",
        "Neuroleptic Malignant Syndrome-like hyperpyrexia and confusion on abrupt reduction or withdrawal"
      ],
      refs: [{ source_id: sId, locator: "Section ADVERSE REACTIONS", quote: qSerious }]
    }
  };
  return d;
});

// 2. PRAMIPEXOLE
updateDrug("pramipexole", (d) => {
  const sId = "fda-pramipexole-label";
  const qCommon = getQuote(sId, "The adverse reaction most commonly causing discontinuation of treatment with pramipexole dihydrochloride extended-release tablets was nausea", 30, 240);
  const qSerious = getQuote(sId, "Falling Asleep During Activities of Daily Living and Somnolence", 20, 160);

  d.adverse_effects = {
    most_common: {
      value: [
        "Nausea and dyspepsia",
        "Dizziness and postural hypotension",
        "Somnolence and daytime sedation",
        "Constipation",
        "Insomnia and asthenia",
        "Peripheral edema (bilateral leg swelling)"
      ],
      refs: [{ source_id: sId, locator: "Section 6 ADVERSE REACTIONS", quote: qCommon }]
    },
    serious: {
      value: [
        "Falling asleep while engaged in activities of daily living (including motor vehicle accidents)",
        "Symptomatic orthostatic hypotension and syncope",
        "Visual hallucinations and paranoid delusions",
        "Impulse control disorders (pathological gambling, compulsive shopping, hypersexuality)",
        "Dopamine Agonist Withdrawal Syndrome (DAWS with severe anxiety, dysphoria, panic, and pain upon taper)"
      ],
      refs: [{ source_id: sId, locator: "Section 5.1 Falling Asleep During Activities of Daily Living", quote: qSerious }]
    }
  };
  return d;
});

// 3. ROPINIROLE
updateDrug("ropinirole", (d) => {
  const sId = "fda-ropinirole-label";
  const qCommon = getQuote(sId, "Most common adverse reactions (incidence with ropinirole at least 5% greater than placebo) in the respective indications were: • Early PD: Nausea, somnolence, dizziness, syncope", 30, 260);
  const qSerious = getQuote(sId, "Patients treated with ropinirole have reported falling asleep while engaged in activities of daily living, including driving or operating machinery", 30, 240);

  d.adverse_effects = {
    most_common: {
      value: [
        "Nausea and vomiting",
        "Somnolence and excessive fatigue",
        "Dizziness and lightheadedness",
        "Syncope and orthostatic hypotension",
        "Abdominal pain, dyspepsia, and anorexia",
        "Peripheral edema"
      ],
      refs: [{ source_id: sId, locator: "Section 6.1 Clinical Trials Experience", quote: qCommon }]
    },
    serious: {
      value: [
        "Sudden sleep onset episodes during daily activities without prior warning",
        "Syncope and severe orthostatic hypotension (dose-dependent, especially during titration)",
        "Hallucinations, paranoia, and psychotic-like behavior",
        "Impulse control disorders and compulsive behaviors",
        "Dyskinesias (potentiation of preexisting levodopa-induced dyskinesias)"
      ],
      refs: [{ source_id: sId, locator: "Section 5.1 Falling Asleep During Activities of Daily Living", quote: qSerious }]
    }
  };
  return d;
});

// 4. RASAGILINE
updateDrug("rasagiline", (d) => {
  const sId = "fda-rasagiline-label";
  const qCommon = getQuote(sId, "Most common adverse reactions (incidence 3% or greater than placebo): AZILECT monotherapy: flu syndrome, arthralgia, depression, dyspepsia", 30, 240);
  const qSerious = getQuote(sId, "Patients should be advised to avoid foods containing a very large amount of tyramine while taking recommended doses of AZILECT", 30, 240);

  d.adverse_effects = {
    most_common: {
      value: [
        "Flu-like syndrome and malaise",
        "Arthralgia and musculoskeletal pain",
        "Depression and insomnia",
        "Dyspepsia and abdominal pain",
        "Headache and dizziness",
        "Dyskinesia (when used as adjunct to levodopa)"
      ],
      refs: [{ source_id: sId, locator: "Section 6.1 Clinical Trials Experience", quote: qCommon }]
    },
    serious: {
      value: [
        "Hypertensive crisis / cheese reaction (loss of MAO-B selectivity at supratherapeutic doses or high tyramine ingestion)",
        "Serotonin syndrome when combined with SSRIs, SNRIs, tricyclic antidepressants, or opioids",
        "Melanoma risk (increased incidence in Parkinson's disease population, dermatologic monitoring advised)",
        "Severe orthostatic hypotension and syncope",
        "Hallucinations and psychotic-like behavior"
      ],
      refs: [{ source_id: sId, locator: "Section 5.1 Hypertension", quote: qSerious }]
    }
  };
  return d;
});

// 5. ENTACAPONE
updateDrug("entacapone", (d) => {
  const sId = "fda-entacapone-label";
  const qCommon = getQuote(sId, "The most commonly observed adverse reactions (incidence at least 3% greater than placebo) in double-blind, placebo-controlled studies (N=1,003) associated with the use of entacapone were: dyskinesia, urine discoloration, diarrhea, nausea, hyperkinesia, abdominal pain, vomiting, and dry mouth", 30, 260);
  const qSerious = getQuote(sId, "Rapid withdrawal or abrupt reduction in the entacapone dose could lead to emergence of signs and symptoms of Parkinson's disease (see CLINICAL PHARMACOLOGY, Clinical Studies ), and may lead to hyperpyrexia and confusion, a symptom complex resembling NMS", 30, 260);

  d.adverse_effects = {
    most_common: {
      value: [
        "Harmless brownish-orange urine discoloration",
        "Dyskinesia and hyperkinesia (due to increased levodopa bioavailability)",
        "Nausea, abdominal pain, vomiting, and dry mouth",
        "Diarrhea (onset typically between 4 to 12 weeks of treatment)",
        "Dizziness and fatigue"
      ],
      refs: [{ source_id: sId, locator: "Section ADVERSE REACTIONS", quote: qCommon }]
    },
    serious: {
      value: [
        "Hyperpyrexia and confusion resembling Neuroleptic Malignant Syndrome (NMS) upon rapid withdrawal or dose reduction",
        "Severe, persistent, or watery diarrhea and microscopic colitis (may require drug discontinuation and electrolyte repletion)",
        "Severe exacerbation of preexisting levodopa-induced dyskinesias",
        "Hallucinations, agitation, and confusion",
        "Symptomatic orthostatic hypotension and syncope",
        "Rhabdomyolysis and elevated creatine kinase"
      ],
      refs: [{ source_id: sId, locator: "Section DOSAGE AND ADMINISTRATION - Withdrawing Patients", quote: qSerious }]
    }
  };
  return d;
});

// 6. AMANTADINE
updateDrug("amantadine", (d) => {
  const sId = "fda-amantadine-label";
  const qCommon = getQuote(sId, "adverse reactions reported in >10% of GOCOVRI-treated patients and more frequently than on placebo were: hallucinations, dizziness, dry mouth, peripheral edema, constipation, falls", 30, 260);
  const qSerious = getQuote(sId, "Hallucinations/Psychotic Behavior: Patients with major psychotic disorder should ordinarily not be treated with GOCOVRI; observe patients for the occurrence of hallucinations throughout treatment, especially at initiation and after dose increases", 30, 260);

  d.adverse_effects = {
    most_common: {
      value: [
        "Visual hallucinations and illusions",
        "Dizziness, lightheadedness, and ataxia",
        "Dry mouth and xerostomia",
        "Peripheral edema (bilateral lower extremity swelling)",
        "Constipation and nausea",
        "Falls and gait instability"
      ],
      refs: [{ source_id: sId, locator: "Section 6.1 Clinical Trials Experience", quote: qCommon }]
    },
    serious: {
      value: [
        "Severe visual and auditory hallucinations, delirium, and paranoid psychosis",
        "Suicidality and depression (monitor for depressed mood or suicidal ideation)",
        "Falling asleep during activities of daily living and somnolence",
        "Livedo reticularis (reddish-blue reticular skin discoloration, especially in lower extremities)",
        "Corneal edema and visual impairment (reversible upon cessation)",
        "Neuroleptic Malignant Syndrome-like withdrawal crisis on sudden cessation"
      ],
      refs: [{ source_id: sId, locator: "Section 5.3 Hallucinations / Psychotic Behavior", quote: qSerious }]
    }
  };
  return d;
});

// 7. TRIHEXYPHENIDYL
updateDrug("trihexyphenidyl", (d) => {
  const sId = "fda-trihexyphenidyl-label";
  const qCommon = getQuote(sId, "Minor side effects, such as dryness of the mouth, blurred vision, dizziness, mild nausea or nervousness, will be experienced by 30 to 50 percent of all patients", 30, 240);
  const qSerious = getQuote(sId, "Trihexyphenidyl is also contraindicated in patients with narrow angle glaucoma", 20, 160);

  d.adverse_effects = {
    most_common: {
      value: [
        "Dry mouth (xerostomia)",
        "Blurred vision and cycloplegia / mydriasis",
        "Dizziness and lightheadedness",
        "Mild nausea and nervousness",
        "Constipation and urinary hesitancy"
      ],
      refs: [{ source_id: sId, locator: "Section ADVERSE REACTIONS", quote: qCommon }]
    },
    serious: {
      value: [
        "Acute angle-closure glaucoma (contraindicated in narrow-angle glaucoma)",
        "Urinary retention (especially in elderly males with prostatic hypertrophy)",
        "Severe central anticholinergic toxicity (confusion, memory loss, agitation, delirium, hallucinations)",
        "Anhidrosis and severe hyperthermia / heat stroke in warm environments",
        "Paralytic ileus and toxic megacolon"
      ],
      refs: [{ source_id: sId, locator: "Section CONTRAINDICATIONS", quote: qSerious }]
    }
  };
  return d;
});

// 8. DONEPEZIL
updateDrug("donepezil", (d) => {
  const sId = "fda-donepezil-label";
  const qCommon = getQuote(sId, "These include nausea, diarrhea, insomnia, vomiting, muscle cramp, fatigue, and anorexia", 20, 180);
  const qSerious = getQuote(sId, "bradycardia or heart block ( 5.2 ) ARICEPT can cause vomiting. Patients should be observed closely at initiation of treatment and after dose increases", 30, 240);

  d.adverse_effects = {
    most_common: {
      value: [
        "Nausea and diarrhea",
        "Insomnia and abnormal dreams",
        "Vomiting and anorexia",
        "Muscle cramps and fatigue",
        "Dizziness and headache",
        "Weight loss"
      ],
      refs: [{ source_id: sId, locator: "Section 6.1 Clinical Trials Experience", quote: qCommon }]
    },
    serious: {
      value: [
        "Severe bradycardia, sick sinus syndrome, and AV heart block (vagotonic cardiac effects with syncope and falls)",
        "Peptic ulcer disease and gastrointestinal bleeding (stimulation of gastric acid secretion)",
        "Generalized convulsions / seizures",
        "Bladder outflow obstruction",
        "Exaggeration of succinylcholine-type muscle relaxation during anesthesia"
      ],
      refs: [{ source_id: sId, locator: "Section 5.2 Cardiovascular Conditions", quote: qSerious }]
    }
  };

  // Ensure severe AD regimen is present
  const hasSevere = d.regimens.some(r => r.id === "don-po-ad-severe-23mg");
  if (!hasSevere) {
    const qInd = getQuote(sId, "ARICEPT is indicated for the treatment of dementia of the Alzheimer’s type", 20, 160);
    const qDose = getQuote(sId, "A dose of 23 mg per day should not be administered until patients have been on a daily dose of 10 mg for at least 3 months", 30, 220);
    d.regimens.push({
      id: "don-po-ad-severe-23mg",
      indication: "Moderate to Severe Alzheimer's Disease Dementia (High-Dose Regimen)",
      setting: "maintenance_outpatient",
      route: "PO",
      refs: [
        { source_id: sId, locator: "Section 1 INDICATIONS AND USAGE", quote: qInd },
        { source_id: sId, locator: "Section 2.2 Dosing in Moderate to Severe Alzheimer’s Disease", quote: qDose }
      ],
      dose: {
        kind: "fixed",
        amount: 23,
        unit: "mg",
        frequency: "once daily",
        max_single: 23,
        max_daily: 23
      },
      dose_text: "Administer 23 mg orally once daily at bedtime in patients with moderate to severe Alzheimer's disease who have been established on a stable dose of 10 mg once daily for at least 3 months. Swallow tablet whole with liquid; do not chew or crush."
    });
  }

  return d;
});

// 9. MEMANTINE
updateDrug("memantine", (d) => {
  const sId = "fda-memantine-label";
  const qCommon = getQuote(sId, "The most commonly observed adverse reactions occurring at a frequency of at least 5% and greater than placebo with administration of memantine hydrochloride extended-release capsules 28 mg/day were headache, diarrhea and dizziness", 30, 260);
  const qSerious = getQuote(sId, "In clinical trials of memantine, seizures occurred in 0.3% of patients treated with memantine and 0.6% of patients treated with placebo", 30, 240);

  d.adverse_effects = {
    most_common: {
      value: [
        "Dizziness and balance impairment",
        "Headache",
        "Confusion and somnolence",
        "Constipation",
        "Hypertension",
        "Cough and dyspnea"
      ],
      refs: [{ source_id: sId, locator: "Section 6.1 Clinical Trials Experience", quote: qCommon }]
    },
    serious: {
      value: [
        "Seizures (evaluated with caution in patients with a history of seizure disorder)",
        "Hallucinations, agitation, and psychotic reactions",
        "Severe confusion and cognitive worsening",
        "Urinary tract infections and urinary incontinence",
        "Heart failure and thromboembolic events (rarely reported in postmarketing)"
      ],
      refs: [{ source_id: sId, locator: "Section 5.3 Seizure Disorders", quote: qSerious }]
    }
  };
  return d;
});

// 10. RIVASTIGMINE
updateDrug("rivastigmine", (d) => {
  const sId = "fda-rivastigmine-label";
  const qCommon = getQuote(sId, "Most common adverse reactions (less than 5% and higher than with placebo): Nausea, vomiting, and diarrhea", 20, 200);
  const qSerious = getQuote(sId, "Gastrointestinal Adverse Reactions: May include significant nausea, vomiting, diarrhea, anorexia/decreased appetite, and weight loss", 30, 240);

  d.adverse_effects = {
    most_common: {
      value: [
        "Nausea and vomiting (prominent, dose-related)",
        "Diarrhea and abdominal pain",
        "Anorexia and weight loss",
        "Dizziness and headache",
        "Application site erythema and pruritus (with transdermal patch)",
        "Tremor and worsening of parkinsonian symptoms"
      ],
      refs: [{ source_id: sId, locator: "Section 2.2 Dosing in Low Body Weight", quote: qCommon }]
    },
    serious: {
      value: [
        "Severe gastrointestinal toxicity with excessive vomiting and esophageal rupture (Boerhaave's syndrome)",
        "Severe bradycardia, syncope, and sinoatrial/atrioventricular heart block",
        "Severe contact dermatitis and generalized allergic skin reactions (allergic contact dermatitis)",
        "Worsening of extrapyramidal motor symptoms in patients with Parkinson's disease dementia",
        "Peptic ulcer disease and gastrointestinal hemorrhage"
      ],
      refs: [{ source_id: sId, locator: "Section 5.1 Gastrointestinal Adverse Reactions", quote: qSerious }]
    }
  };

  // Ensure transdermal patch regimen is present
  const hasPatch = d.regimens.some(r => r.id === "riv-patch-ad-maintenance");
  if (!hasPatch) {
    const qInd = getQuote(sId, "EXELON PATCH is indicated for the treatment of dementia of the Alzheimer’s type (AD).", 20, 160);
    const qDose = getQuote(sId, "Initial Dose: Initiate treatment with 4.6 mg/24 hours EXELON PATCH", 20, 160);
    d.regimens.push({
      id: "riv-patch-ad-maintenance",
      indication: "Mild, Moderate, or Severe Alzheimer's Disease Dementia (Transdermal Patch)",
      setting: "maintenance_outpatient",
      route: "TD",
      refs: [
        { source_id: sId, locator: "Section 1.1 Alzheimer’s Disease", quote: qInd },
        { source_id: sId, locator: "Section 2.1 Recommended Dosage", quote: qDose }
      ],
      dose: {
        kind: "fixed",
        amount: 9.5,
        unit: "mg",
        frequency: "once daily",
        max_single: 13.3,
        max_daily: 13.3
      },
      dose_text: "Apply one 4.6 mg/24h transdermal patch once daily for at least 4 weeks; if well tolerated, increase to 9.5 mg/24h (standard effective maintenance dose). May further titrate to 13.3 mg/24h for severe dementia. Rotate application site daily (upper back, lower back, upper arm, or chest); do not reapply to same site within 14 days."
    });
  }

  return d;
});

// 11. LECANEMAB
updateDrug("lecanemab", (d) => {
  const sId = "fda-lecanemab-label";
  const qCommon = getQuote(sId, "Most common adverse reactions (at approximately 10% and higher incidence compared to placebo): infusion-related reactions, amyloid related imaging abnormality-microhemorrhages", 30, 260);
  const qSerious = getQuote(sId, "WARNING: AMYLOID RELATED IMAGING ABNORMALITIES Monoclonal antibodies directed against aggregated forms of beta amyloid, including LEQEMBI, can cause amyloid related imaging abnormalities (ARIA)", 30, 260);

  d.adverse_effects = {
    most_common: {
      value: [
        "Infusion-related reactions (fever, chills, flushing, joint pain, nausea, occurring typically with first infusion)",
        "Amyloid-Related Imaging Abnormalities with edema (ARIA-E)",
        "Amyloid-Related Imaging Abnormalities with cerebral microhemorrhages (ARIA-H)",
        "Headache",
        "Superficial siderosis of the central nervous system",
        "Falls and dizziness"
      ],
      refs: [{ source_id: sId, locator: "Section 6.1 Clinical Trials Experience", quote: qCommon }]
    },
    serious: {
      value: [
        "Amyloid-Related Imaging Abnormalities (ARIA-E cerebral sulcal/parenchymal edema and ARIA-H microhemorrhages/superficial siderosis, Boxed Warning, highest risk in ApoE ε4 homozygotes)",
        "Symptomatic and potentially fatal intracerebral hemorrhage (ICH > 1 cm, markedly increased risk with concurrent anticoagulation)",
        "Severe infusion-related anaphylactoid reactions and bronchospasm",
        "Subacute encephalopathy or confusion associated with ARIA"
      ],
      refs: [{ source_id: sId, locator: "Section BOXED WARNING", quote: qSerious }]
    }
  };
  return d;
});

// 12. DONANEMAB
updateDrug("donanemab", (d) => {
  const sId = "fda-donanemab-label";
  const qCommon = getQuote(sId, "Most common adverse reactions (at least 10% and higher incidence compared to placebo): ARIA-E, ARIA-H microhemorrhage, ARIA-H superficial siderosis, and headache", 30, 260);
  const qSerious = getQuote(sId, "WARNING: AMYLOID RELATED IMAGING ABNORMALITIES Monoclonal antibodies directed against aggregated forms of beta amyloid, including KISUNLA, can cause amyloid related imaging abnormalities (ARIA)", 30, 260);

  d.adverse_effects = {
    most_common: {
      value: [
        "Amyloid-Related Imaging Abnormalities with edema/sulcal effusion (ARIA-E in 24% of patients)",
        "Amyloid-Related Imaging Abnormalities with microhemorrhage (ARIA-H in 31% of patients)",
        "Headache",
        "Superficial siderosis of the brain",
        "Infusion-related reactions (chills, nausea, erythema, diaphoresis)"
      ],
      refs: [{ source_id: sId, locator: "Section 6.1 Clinical Trials Experience", quote: qCommon }]
    },
    serious: {
      value: [
        "Symptomatic and serious ARIA (cerebral edema, focal neurological deficits, encephalopathy, seizures; Boxed Warning, higher risk in ApoE ε4 homozygotes)",
        "Major intracranial hemorrhage and fatal brain hemorrhages (especially in patients taking antithrombotics)",
        "Severe systemic hypersensitivity reactions and anaphylaxis",
        "Permanent neurological disability associated with severe ARIA episodes"
      ],
      refs: [{ source_id: sId, locator: "Section BOXED WARNING", quote: qSerious }]
    }
  };
  return d;
});

// 13. DANTROLENE
updateDrug("dantrolene", (d) => {
  const sId = "fda-dantrolene-label";
  const qCommon = getQuote(sId, "The administration of Dantrium Intravenous to human volunteers is associated with loss of grip strength and weakness in the legs, as well as drowsiness and dizziness", 30, 260);
  const qSerious = getQuote(sId, "There have been reported cases of hepatotoxicity following the use of intravenous dantrolene products", 30, 220);

  d.adverse_effects = {
    most_common: {
      value: [
        "Loss of grip strength and generalized leg/skeletal muscle weakness",
        "Drowsiness, fatigue, and sedation",
        "Dizziness and lightheadedness",
        "Injection site thrombophlebitis, tissue necrosis, and extravasation injury",
        "Nausea, vomiting, and diarrhea"
      ],
      refs: [{ source_id: sId, locator: "Section ADVERSE REACTIONS", quote: qCommon }]
    },
    serious: {
      value: [
        "Fatal and non-fatal hepatotoxicity and symptomatic hepatitis (Boxed Warning with chronic use; monitor LFTs)",
        "Severe muscle weakness and respiratory depression / ventilatory failure in patients with preexisting neuromuscular disease",
        "Severe cardiovascular collapse and hyperkalemia (especially when co-administered with verapamil or calcium-channel blockers)",
        "Extravasation tissue necrosis and deep tissue sloughing (high pH alkaline solution)",
        "Anaphylactoid reactions and urticaria"
      ],
      refs: [{ source_id: sId, locator: "Section PRECAUTIONS - Hepatic Impairment", quote: qSerious }]
    }
  };

  return d;
});

console.log("=== BATCH 3 COMPLETE (13/13 DRUGS) ===");
