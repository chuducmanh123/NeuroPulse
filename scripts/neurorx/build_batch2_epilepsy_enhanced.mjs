import fs from "fs";
import path from "path";
import { getQuote, updateDrug } from "./enhance_common.mjs";

console.log("=== ENHANCING BATCH 2: EPILEPSY & SEIZURES (16 DRUGS) ===");

// 1. LACOSAMIDE
updateDrug("lacosamide", (d) => {
  const sId = "fda-lacosamide-label";
  const qCommon = getQuote(sId, "Most common adverse reactions in adults (≥10% and greater than placebo) are diplopia, headache, dizziness, nausea, and somnolence", 30, 220);
  const qSerious = getQuote(sId, "Obtaining an ECG before beginning VIMPAT and after VIMPAT is titrated to steady-state maintenance dose is recommended in patients with underlying proarrhythmic conditions", 30, 240);

  d.adverse_effects = {
    most_common: {
      value: [
        "Dizziness and ataxia",
        "Headache",
        "Diplopia and blurred vision",
        "Nausea and vomiting",
        "Somnolence and fatigue"
      ],
      refs: [{ source_id: sId, locator: "Section 6 ADVERSE REACTIONS", quote: qCommon }]
    },
    serious: {
      value: [
        "Cardiac rhythm and conduction abnormalities (PR interval prolongation, first/second-degree AV block, ventricular tachyarrhythmias)",
        "Syncope and orthostatic bradyarrhythmias",
        "Suicidal behavior and ideation",
        "Drug Reaction with Eosinophilia and Systemic Symptoms (DRESS) / Multiorgan hypersensitivity"
      ],
      refs: [{ source_id: sId, locator: "Section 5.3 Cardiac Rhythm and Conduction Abnormalities", quote: qSerious }]
    }
  };
  return d;
});

// 2. CARBAMAZEPINE
updateDrug("carbamazepine", (d) => {
  const sId = "fda-carbamazepine-label";
  const qCommon = getQuote(sId, "The most frequently observed adverse reactions, particularly during the initial phases of therapy, are dizziness, drowsiness, unsteadiness, nausea, and vomiting", 30, 240);
  const qSerious = getQuote(sId, "SERIOUS AND SOMETIMES FATAL DERMATOLOGIC REACTIONS, INCLUDING TOXIC EPIDERMAL NECROLYSIS (TEN) AND STEVENS-JOHNSON SYNDROME (SJS), HAVE BEEN REPORTED DURING TREATMENT WITH TEGRETOL", 30, 260);

  d.adverse_effects = {
    most_common: {
      value: [
        "Dizziness, drowsiness, and unsteadiness (ataxia)",
        "Nausea and vomiting",
        "Visual disturbances (diplopia, blurred vision)",
        "Fatigue and lethargy",
        "Dry mouth and abdominal pain"
      ],
      refs: [{ source_id: sId, locator: "Section ADVERSE REACTIONS", quote: qCommon }]
    },
    serious: {
      value: [
        "Severe and fatal dermatologic reactions (Stevens-Johnson syndrome [SJS], Toxic Epidermal Necrolysis [TEN] strongly associated with HLA-B*1502)",
        "Aplastic anemia, agranulocytosis, and bone marrow depression (Boxed Warning)",
        "Drug Reaction with Eosinophilia and Systemic Symptoms (DRESS)",
        "Hyponatremia and SIADH (syndrome of inappropriate antidiuretic hormone)",
        "Hepatic failure and acute hepatitis"
      ],
      refs: [{ source_id: sId, locator: "Section BOXED WARNING", quote: qSerious }]
    }
  };
  return d;
});

// 3. OXCARBAZEPINE
updateDrug("oxcarbazepine", (d) => {
  const sId = "fda-oxcarbazepine-label";
  const qCommon = getQuote(sId, "The most common (≥ 10% more than placebo for adjunctive or low dose for monotherapy) adverse reactions in adults and pediatrics were: dizziness, somnolence, diplopia, fatigue, nausea, vomiting, ataxia", 30, 240);
  const qSerious = getQuote(sId, "Serious dermatological reactions, including Stevens-Johnson syndrome (SJS) and toxic epidermal necrolysis (TEN)", 30, 240);

  d.adverse_effects = {
    most_common: {
      value: [
        "Dizziness and somnolence",
        "Diplopia and nystagmus",
        "Nausea and vomiting",
        "Ataxia and abnormal gait",
        "Fatigue and tremor",
        "Headache"
      ],
      refs: [{ source_id: sId, locator: "Section 6 ADVERSE REACTIONS", quote: qCommon }]
    },
    serious: {
      value: [
        "Clinically significant hyponatremia (serum sodium < 125 mmol/L, risk of seizures/encephalopathy)",
        "Serious dermatologic reactions (SJS, TEN, especially in HLA-B*1502 positive patients)",
        "Multi-organ hypersensitivity reactions (DRESS)",
        "Anaphylaxis and angioedema",
        "Suicidal behavior and ideation"
      ],
      refs: [{ source_id: sId, locator: "Section 5.4 Serious Dermatological Reactions", quote: qSerious }]
    }
  };
  return d;
});

// 4. VALPROATE
updateDrug("valproate", (d) => {
  const sId = "fda-valproate-label";
  const qCommon = getQuote(sId, "The most common adverse reactions leading to discontinuation were 2 cases each of nausea/vomiting and elevated amylase", 25, 200);
  const qSerious = getQuote(sId, "Hepatotoxicity, including fatalities, usually during the first 6 months of treatment", 25, 180);

  d.adverse_effects = {
    most_common: {
      value: [
        "Nausea, vomiting, and dyspepsia",
        "Somnolence and sedation",
        "Tremor (intention and postural)",
        "Weight gain and increased appetite",
        "Alopecia (hair thinning and hair loss)",
        "Thrombocytopenia"
      ],
      refs: [{ source_id: sId, locator: "Section 6 ADVERSE REACTIONS", quote: qCommon }]
    },
    serious: {
      value: [
        "Fatal hepatotoxicity, especially during the first 6 months (Boxed Warning, mitochondrial mutation POLG contraindication)",
        "Life-threatening pancreatitis (hemorrhagic and necrotizing)",
        "Hyperammonemic encephalopathy (with normal or mildly elevated LFTs)",
        "Major congenital malformations (neural tube defects) and neurodevelopmental disorders (decreased IQ / autism spectrum)",
        "Thrombocytopenia and dose-dependent coagulopathies"
      ],
      refs: [{ source_id: sId, locator: "Section BOXED WARNING", quote: qSerious }]
    }
  };
  return d;
});

// 5. PHENYTOIN
updateDrug("phenytoin", (d) => {
  const sId = "fda-phenytoin-label";
  const qCommon = getQuote(sId, "Reactions include nystagmus, ataxia, slurred speech, decreased coordination, somnolence, and mental confusion", 30, 220);
  const qSerious = getQuote(sId, "Dermatological manifestations sometimes accompanied by fever have included scarlatiniform or morbilliform rashes", 30, 220);

  d.adverse_effects = {
    most_common: {
      value: [
        "Nystagmus, ataxia, and loss of coordination (concentration-dependent cerebellar-vestibular signs)",
        "Slurred speech and mental confusion",
        "Gingival hyperplasia (chronic therapy)",
        "Hirsutism and coarsening of facial features",
        "Nausea and epigastric distress"
      ],
      refs: [{ source_id: sId, locator: "Section ADVERSE REACTIONS - Nervous System", quote: qCommon }]
    },
    serious: {
      value: [
        "Cardiovascular collapse, severe hypotension, and ventricular arrhythmias with rapid IV infusion (Boxed Warning, max infusion rate 50 mg/min)",
        "Purple Glove Syndrome (soft-tissue necrosis and limb ischemia from peripheral extravasation)",
        "Severe cutaneous adverse reactions (SJS, TEN, DRESS syndrome)",
        "Hematopoietic toxicity (megaloblastic anemia, agranulocytosis, leukopenia)",
        "Toxic hepatitis and hepatic necrosis"
      ],
      refs: [{ source_id: sId, locator: "Section ADVERSE REACTIONS - Skin and Appendages", quote: qSerious }]
    }
  };
  return d;
});

// 6. PHENOBARBITAL
updateDrug("phenobarbital", (d) => {
  const sId = "fda-phenobarbital-label";
  const qCommon = getQuote(sId, "The following adverse reactions and their incidence were compiled from surveillance of thousands of hospitalized patients who received barbiturates", 30, 240);
  const qSerious = getQuote(sId, "The manifestations of a long-acting barbiturate in overdose include nystagmus, ataxia, CNS depression, respiratory depression", 30, 240);

  d.adverse_effects = {
    most_common: {
      value: [
        "Sedation, drowsiness, and morning hangover effect",
        "Lethargy and psychomotor slowing",
        "Vertigo and dizziness",
        "Nystagmus and ataxia",
        "Paradoxical excitation, hyperactivity, or irritability (pediatrics and elderly)"
      ],
      refs: [{ source_id: sId, locator: "Section ADVERSE REACTIONS", quote: qCommon }]
    },
    serious: {
      value: [
        "Life-threatening respiratory depression and hypoventilation (especially with IV administration or concomitant sedatives)",
        "Severe physical and psychological dependence with life-threatening withdrawal seizures and delirium tremens",
        "Exfoliative dermatitis, toxic epidermal necrolysis, and Stevens-Johnson syndrome",
        "Hypotension and cardiovascular collapse with rapid IV administration",
        "Megaloblastic anemia and hepatic dysfunction"
      ],
      refs: [{ source_id: sId, locator: "Section OVERDOSAGE", quote: qSerious }]
    }
  };
  return d;
});

// 7. LAMOTRIGINE
updateDrug("lamotrigine", (d) => {
  const sId = "fda-lamotrigine-label";
  const qCommon = getQuote(sId, "adverse reactions, such as dizziness, ataxia, and diplopia", 20, 160);
  const qSerious = getQuote(sId, "WARNING: SERIOUS SKIN RASHES LAMICTAL XR can cause serious rashes requiring hospitalization and discontinuation of treatment", 30, 240);

  d.adverse_effects = {
    most_common: {
      value: [
        "Dizziness and ataxia",
        "Diplopia and blurred vision",
        "Headache and somnolence",
        "Nausea, vomiting, and diarrhea",
        "Insomnia and rhinitis"
      ],
      refs: [{ source_id: sId, locator: "Section 6 ADVERSE REACTIONS", quote: qCommon }]
    },
    serious: {
      value: [
        "Life-threatening skin rashes (Stevens-Johnson syndrome, Toxic Epidermal Necrolysis, Boxed Warning, rate increased by rapid titration or co-administration with valproate)",
        "Hemophagocytic Lymphohistiocytosis (HLH, severe immune activation with fever, cytopenias, hepatomegaly)",
        "Drug Reaction with Eosinophilia and Systemic Symptoms (DRESS)",
        "Aseptic meningitis",
        "Cardiac rhythm abnormalities (sodium channel blockade / PR interval prolongation / ventricular arrhythmias in structural heart disease)"
      ],
      refs: [{ source_id: sId, locator: "Section BOXED WARNING", quote: qSerious }]
    }
  };

  // Ensure adjunctive regimen with slow titration is present
  const hasAdj = d.regimens.some(r => r.id === "lam-adjunctive-epilepsy-po");
  if (!hasAdj) {
    const qInd = getQuote(sId, "LAMICTAL XR is indicated as adjunctive therapy", 20, 160);
    const qDose = getQuote(sId, "Adjunctive therapy: Target therapeutic dosage range is 200 to 600 mg daily and is dependent on concomitant AEDs", 30, 220);
    d.regimens.push({
      id: "lam-adjunctive-epilepsy-po",
      indication: "Adjunctive Therapy in Focal Seizures and Primary Generalized Tonic-Clonic Seizures",
      setting: "maintenance_outpatient",
      route: "PO",
      refs: [
        { source_id: sId, locator: "Section 1 INDICATIONS AND USAGE", quote: qInd },
        { source_id: sId, locator: "Section 2 DOSAGE AND ADMINISTRATION", quote: qDose }
      ],
      dose: {
        kind: "fixed",
        amount: 25,
        unit: "mg",
        frequency: "once daily",
        max_single: 200,
        max_daily: 400
      },
      dose_text: "Initiate 25 mg orally once daily for Weeks 1 and 2; increase to 50 mg daily for Weeks 3 and 4; then titrate by 50 mg/day every 1 to 2 weeks to target maintenance dose of 200 to 400 mg/day. DO NOT escalate faster than recommended due to high risk of serious cutaneous rash."
    });
  }

  return d;
});

// 8. TOPIRAMATE
updateDrug("topiramate", (d) => {
  const sId = "fda-topiramate-label";
  const qCommon = getQuote(sId, "Epilepsy : Most common (≥10% more frequent than placebo or low-dose TOPAMAX) adverse reactions in adult and pediatric patients were: paresthesia, anorexia, weight loss", 30, 240);
  const qSerious = getQuote(sId, "TOPAMAX can cause hyperchloremic, non-anion gap, metabolic acidosis", 30, 240);

  d.adverse_effects = {
    most_common: {
      value: [
        "Paresthesias (tingling in fingers and toes)",
        "Anorexia, weight loss, and taste perversion (dysgeusia, carbonated beverages taste flat)",
        "Cognitive slowing, word-finding difficulty, and memory impairment ('dopamax' effect)",
        "Somnolence, fatigue, and dizziness",
        "Nervousness and mood swings"
      ],
      refs: [{ source_id: sId, locator: "Section 6.1 Clinical Trials Experience", quote: qCommon }]
    },
    serious: {
      value: [
        "Hyperchloremic non-anion gap metabolic acidosis (carbonic anhydrase inhibition)",
        "Acute myopia and secondary angle-closure glaucoma (ocular emergency, discontinue immediately)",
        "Oligohidrosis and hyperthermia (decreased sweating, risk of heat stroke especially in children)",
        "Kidney stones (nephrolithiasis / calcium phosphate urolithiasis)",
        "Major congenital malformations (cleft lip/palate, oral clefts) and microcephaly/SGA"
      ],
      refs: [{ source_id: sId, locator: "Section 5.4 Metabolic Acidosis", quote: qSerious }]
    }
  };

  // Ensure migraine prophylaxis regimen is present
  const hasMigraine = d.regimens.some(r => r.id === "top-po-migraine-prophylaxis");
  if (!hasMigraine) {
    const qInd = getQuote(sId, "Migraine TOPAMAX is indicated for the preventive treatment of migraine in patients 12 years of age and older", 30, 200);
    const qDose = getQuote(sId, "The recommended total daily dose of TOPAMAX as treatment for patients 12 years of age and older for the preventive treatment of migraine is 100 mg/day administered in two divided doses", 30, 240);
    d.regimens.push({
      id: "top-po-migraine-prophylaxis",
      indication: "Preventive Treatment of Migraine Headache in Adults and Adolescents",
      setting: "maintenance_outpatient",
      route: "PO",
      refs: [
        { source_id: sId, locator: "Section 1 INDICATIONS AND USAGE", quote: qInd },
        { source_id: sId, locator: "Section 2 DOSAGE AND ADMINISTRATION", quote: qDose }
      ],
      dose: {
        kind: "fixed",
        amount: 25,
        unit: "mg",
        frequency: "twice daily",
        max_single: 50,
        max_daily: 100
      },
      dose_text: "Initiate 25 mg orally at night for Week 1; 25 mg twice daily for Week 2; 25 mg morning and 50 mg evening for Week 3; reach target 50 mg twice daily (100 mg/day) at Week 4. Maintain hydration to minimize nephrolithiasis risk."
    });
  }

  return d;
});

// 9. CLOBAZAM
updateDrug("clobazam", (d) => {
  const sId = "fda-clobazam-label";
  const qCommon = getQuote(sId, "Adverse reactions that occurred at least 10% more frequently than placebo in any ONFI dose included constipation, somnolence or sedation, pyrexia, lethargy, and drooling", 30, 220);
  const qSerious = getQuote(sId, "WARNING: RISKS FROM CONCOMITANT USE WITH OPIOIDS; ABUSE, MISUSE, AND ADDICTION; and DEPENDENCE AND WITHDRAWAL REACTIONS", 30, 200);

  d.adverse_effects = {
    most_common: {
      value: [
        "Somnolence, sedation, and lethargy",
        "Drooling (salivary hypersecretion)",
        "Constipation and decreased appetite",
        "Pyrexia and upper respiratory tract infections",
        "Ataxia and psychomotor slowing"
      ],
      refs: [{ source_id: sId, locator: "Section 6 ADVERSE REACTIONS", quote: qCommon }]
    },
    serious: {
      value: [
        "Profound sedation, respiratory depression, coma, and death from concomitant use with opioids or other CNS depressants (Boxed Warning)",
        "Physical dependence and severe life-threatening withdrawal syndrome (status epilepticus, delirium)",
        "Severe dermatological reactions (Stevens-Johnson syndrome, Toxic Epidermal Necrolysis)",
        "Drug Reaction with Eosinophilia and Systemic Symptoms (DRESS)",
        "Paradoxical behavioral reactions and aggression"
      ],
      refs: [{ source_id: sId, locator: "Section BOXED WARNING", quote: qSerious }]
    }
  };
  return d;
});

// 10. BRIVARACETAM
updateDrug("brivaracetam", (d) => {
  const sId = "fda-brivaracetam-label";
  const qCommon = getQuote(sId, "Adverse Reactions : Monitor for somnolence and fatigue, and advise patients not to drive or operate machinery", 30, 200);
  const qSerious = getQuote(sId, "Suicidal Behavior and Ideation : Monitor patients for suicidal behavior and ideation", 25, 180);

  d.adverse_effects = {
    most_common: {
      value: [
        "Somnolence and sedation",
        "Dizziness and gait instability",
        "Fatigue and asthenia",
        "Nausea and vomiting",
        "Irritability and anxiety"
      ],
      refs: [{ source_id: sId, locator: "Section 5.1 Somnolence and Fatigue", quote: qCommon }]
    },
    serious: {
      value: [
        "Psychiatric and behavioral symptoms (agitation, aggression, depression, paranoia, psychosis)",
        "Suicidal behavior and ideation",
        "Hypersensitivity reactions (bronchospasm and angioedema)",
        "Risk of status epilepticus upon abrupt discontinuation"
      ],
      refs: [{ source_id: sId, locator: "Section 5.2 Suicidal Behavior and Ideation", quote: qSerious }]
    }
  };
  return d;
});

// 11. PERAMPANEL
updateDrug("perampanel", (d) => {
  const sId = "fda-perampanel-label";
  const qCommon = getQuote(sId, "Most common adverse reactions (≥5% and ≥1% higher than placebo) include dizziness, somnolence, fatigue, irritability, falls, nausea, weight gain", 30, 240);
  const qSerious = getQuote(sId, "Serious or life-threatening psychiatric and behavioral adverse reactions including aggression, hostility, irritability, anger, and homicidal ideation", 30, 240);

  d.adverse_effects = {
    most_common: {
      value: [
        "Dizziness and vertigo",
        "Somnolence, fatigue, and lethargy",
        "Irritability and hostility",
        "Ataxia and gait disturbance (dose-dependent fall risk)",
        "Nausea, weight gain, and contusion"
      ],
      refs: [{ source_id: sId, locator: "Section 6.1 Clinical Trials Experience", quote: qCommon }]
    },
    serious: {
      value: [
        "Severe psychiatric and behavioral reactions including aggression, hostility, homicidal ideation, and threat of violence (Boxed Warning)",
        "Suicidal behavior and ideation",
        "Severe falls and fall-related injuries (especially in elderly patients)",
        "Multi-organ hypersensitivity reactions (DRESS)",
        "Rebound status epilepticus following sudden withdrawal"
      ],
      refs: [{ source_id: sId, locator: "Section BOXED WARNING", quote: qSerious }]
    }
  };
  return d;
});

// 12. DIAZEPAM
updateDrug("diazepam", (d) => {
  const sId = "fda-diazepam-label";
  const qCommon = getQuote(sId, "Side effects most commonly reported were drowsiness, fatigue and ataxia; venous thrombosis and phlebitis at the site of injection", 30, 220);
  const qSerious = getQuote(sId, "WARNING: RISKS FROM CONCOMITANT USE WITH OPIOIDS; ABUSE, MISUSE, AND ADDICTION; and DEPENDENCE AND WITHDRAWAL REACTIONS", 30, 200);

  d.adverse_effects = {
    most_common: {
      value: [
        "Drowsiness, somnolence, and sedation",
        "Fatigue and lethargy",
        "Ataxia and loss of coordination",
        "Venous thrombosis and local phlebitis at IV injection site",
        "Confusion and muscle weakness"
      ],
      refs: [{ source_id: sId, locator: "Section ADVERSE REACTIONS", quote: qCommon }]
    },
    serious: {
      value: [
        "Severe respiratory depression, airway obstruction, apnea, and respiratory arrest",
        "Cardiovascular collapse, hypotension, and bradycardia with rapid IV bolus",
        "Life-threatening physical dependence, withdrawal delirium, and rebound seizures",
        "Paradoxical excitement, acute rage, and agitation",
        "Coma and death when co-administered with opioids or other CNS depressants (Boxed Warning)"
      ],
      refs: [{ source_id: sId, locator: "Section BOXED WARNING", quote: qSerious }]
    }
  };
  return d;
});

// 13. MIDAZOLAM
updateDrug("midazolam", (d) => {
  const sId = "fda-midazolam-label";
  const qCommon = getQuote(sId, "Fluctuations in vital signs were the most frequently seen findings following parenteral administration of midazolam in adults and included decreased tidal volume and/or respiratory rate decrease", 30, 240);
  const qSerious = getQuote(sId, "CARDIORESPIRATORY ADVERSE EVENTS HAVE BEEN REPORTED, PROVISION FOR MONITORING, DETECTION AND CORRECTION OF THESE REACTIONS MUST BE MADE", 30, 260);

  d.adverse_effects = {
    most_common: {
      value: [
        "Decreased tidal volume and respiratory rate depression",
        "Hypotension and heart rate variations",
        "Somnolence, sedation, and anterograde amnesia",
        "Nausea, vomiting, and hiccups",
        "Injection site pain and tenderness"
      ],
      refs: [{ source_id: sId, locator: "Section ADVERSE REACTIONS", quote: qCommon }]
    },
    serious: {
      value: [
        "Severe cardiorespiratory depression, hypoventilation, airway obstruction, and apnea (Boxed Warning, requires continuous capnography / pulse oximetry)",
        "Severe cardiovascular collapse and refractory hypotension",
        "Paradoxical excitement, hostility, and involuntary muscle movements",
        "Anaphylactoid reactions and laryngospasm",
        "Profound coma and prolonged sedation in patients with hepatic or renal impairment"
      ],
      refs: [{ source_id: sId, locator: "Section BOXED WARNING", quote: qSerious }]
    }
  };
  return d;
});

// 14. GABAPENTIN
updateDrug("gabapentin", (d) => {
  const sId = "fda-gabapentin-label";
  const qCommon = getQuote(sId, "Moreover, because NEURONTIN causes somnolence and dizziness [see Warnings and Precautions (5.4) ]", 25, 180);
  const qSerious = getQuote(sId, "Withdrawal symptoms, or suicidal behavior and ideation have been observed after discontinuation", 25, 180);

  d.adverse_effects = {
    most_common: {
      value: [
        "Dizziness and lightheadedness",
        "Somnolence, sedation, and fatigue",
        "Peripheral edema (bilateral lower extremity)",
        "Ataxia and uncoordinated gait",
        "Weight gain and dry mouth"
      ],
      refs: [{ source_id: sId, locator: "Section 5.4 Somnolence and Dizziness", quote: qCommon }]
    },
    serious: {
      value: [
        "Life-threatening respiratory depression (especially when combined with opioids or in patients with severe COPD/elderly)",
        "Drug Reaction with Eosinophilia and Systemic Symptoms (DRESS) / Multiorgan hypersensitivity",
        "Anaphylaxis and angioedema",
        "Suicidal behavior and ideation",
        "Rebound seizures and withdrawal status epilepticus upon abrupt cessation"
      ],
      refs: [{ source_id: sId, locator: "Section 5.1 Discontinuation Symptoms", quote: qSerious }]
    }
  };

  // Ensure adjunctive partial seizures regimen is present
  const hasPartial = d.regimens.some(r => r.id === "gab-adjunctive-partial-seizures-po");
  if (!hasPartial) {
    const qInd = getQuote(sId, "treatment of partial onset seizures, with and without secondary generalization", 20, 160);
    const qDose = getQuote(sId, "The starting dose is 300 mg three times a day", 20, 160);
    d.regimens.push({
      id: "gab-adjunctive-partial-seizures-po",
      indication: "Adjunctive Therapy in the Treatment of Partial-Onset Seizures with or without Secondary Generalization",
      setting: "maintenance_outpatient",
      route: "PO",
      refs: [
        { source_id: sId, locator: "Section 1 INDICATIONS AND USAGE", quote: qInd },
        { source_id: sId, locator: "Section 2 DOSAGE AND ADMINISTRATION", quote: qDose }
      ],
      dose: {
        kind: "fixed",
        amount: 300,
        unit: "mg",
        frequency: "three times daily",
        max_single: 1200,
        max_daily: 3600
      },
      dose_text: "Initiate 300 mg orally on Day 1; 300 mg twice daily on Day 2; 300 mg three times daily on Day 3. Titrate as needed up to maintenance of 900 to 1800 mg/day divided three times daily (max 3600 mg/day). Maximum time between doses should not exceed 12 hours."
    });
  }

  return d;
});

// 15. PREGABALIN
updateDrug("pregabalin", (d) => {
  const sId = "fda-pregabalin-label";
  const qCommon = getQuote(sId, "Most common adverse reactions (greater than or equal to 5% and twice placebo) in adults are dizziness, somnolence, dry mouth, edema, blurred vision, weight gain", 30, 240);
  const qSerious = getQuote(sId, "Angioedema and hypersensitivity reactions have occurred in patients receiving pregabalin therapy", 30, 220);

  d.adverse_effects = {
    most_common: {
      value: [
        "Dizziness and lightheadedness",
        "Somnolence, sedation, and fatigue",
        "Peripheral edema and weight gain",
        "Dry mouth and constipation",
        "Blurred vision and diplopia",
        "Cognitive difficulty with concentration and attention"
      ],
      refs: [{ source_id: sId, locator: "Section 6.1 Clinical Trials Experience", quote: qCommon }]
    },
    serious: {
      value: [
        "Life-threatening respiratory depression (especially when co-prescribed with opioids, sedatives, or in elderly/pulmonary disease)",
        "Severe angioedema with swelling of face, throat, and larynx (airway compromise)",
        "Suicidal thoughts and behavior",
        "Severe physical and psychological dependence and misuse",
        "Rhabdomyolysis and creatine kinase elevation"
      ],
      refs: [{ source_id: sId, locator: "Section 5.1 Angioedema", quote: qSerious }]
    }
  };

  // Ensure adjunctive partial seizures regimen is present
  const hasPartial = d.regimens.some(r => r.id === "preg-adjunctive-partial-seizures-po");
  if (!hasPartial) {
    const qInd = getQuote(sId, "Adjunctive therapy for the treatment of partial-onset seizures in patients 1 month of age and older", 30, 200);
    const qDose = getQuote(sId, "For adult indications, begin dosing at 150 mg/day", 20, 160);
    d.regimens.push({
      id: "preg-adjunctive-partial-seizures-po",
      indication: "Adjunctive Therapy for Adult Patients with Partial-Onset Seizures",
      setting: "maintenance_outpatient",
      route: "PO",
      refs: [
        { source_id: sId, locator: "Section 1 INDICATIONS AND USAGE", quote: qInd },
        { source_id: sId, locator: "Section 2 DOSAGE AND ADMINISTRATION", quote: qDose }
      ],
      dose: {
        kind: "fixed",
        amount: 75,
        unit: "mg",
        frequency: "twice daily",
        max_single: 300,
        max_daily: 600
      },
      dose_text: "Initiate 75 mg orally twice daily (150 mg/day). Based on clinical response and tolerability, dose may be increased to 300 mg/day after 1 week, and up to a maximum recommended dose of 600 mg/day divided twice or three times daily."
    });
  }

  return d;
});

console.log("=== BATCH 2 COMPLETE (15/15 DRUGS) ===");
