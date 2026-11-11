import fs from "fs";
import path from "path";
import { getQuote, updateDrug } from "./enhance_common.mjs";

console.log("=== ENHANCING BATCH 1: STROKE & ANTITHROMBOTICS (18 DRUGS) ===");

// 1. ALTEPLASE
updateDrug("alteplase", (d) => {
  const sId = "fda-alteplase-label";
  const qCommon = getQuote(sId, "The most frequent adverse reaction associated with Activase in all approved indications is bleeding", 30, 200);
  const qSerious = getQuote(sId, "These data indicate a significant increase in intracranial hemorrhage following Activase treatment, particularly symptomatic intracranial hemorrhage within 36 hours", 30, 220);

  d.adverse_effects = {
    most_common: {
      value: [
        "Bleeding (superficial at puncture sites and internal)",
        "Gastrointestinal hemorrhage",
        "Genitourinary bleeding",
        "Ecchymosis and hematoma",
        "Epistaxis and gingival bleeding"
      ],
      refs: [{ source_id: sId, locator: "Section 6.1 Clinical Trials Experience", quote: qCommon }]
    },
    serious: {
      value: [
        "Symptomatic intracranial hemorrhage (ICH) within 36 hours",
        "Fatal internal hemorrhage (gastrointestinal or retroperitoneal)",
        "Anaphylactoid and hypersensitivity reactions (angioedema, laryngeal edema)",
        "Cholesterol embolization and arterial thromboembolism",
        "Cerebral herniation and severe post-thrombolytic cerebral edema"
      ],
      refs: [{ source_id: sId, locator: "Section 6.1 Acute Ischemic Stroke", quote: qSerious }]
    }
  };
  return d;
});

// 2. TENECTEPLASE
updateDrug("tenecteplase", (d) => {
  const sId = "fda-tenecteplase-label";
  const qCommon = getQuote(sId, "The most common adverse reactions are bleeding and hypersensitivity", 25, 180);
  const qSerious = getQuote(sId, "TNKase is contraindicated in patients with [see Warnings and Precautions (5.1) ] : Active internal bleeding History of cerebrovascular accident", 30, 220);

  d.adverse_effects = {
    most_common: {
      value: [
        "Bleeding at puncture sites and vascular access access sites",
        "Gastrointestinal bleeding",
        "Hematoma and ecchymosis",
        "Epistaxis and oral mucosal bleeding",
        "Mild hypersensitivity rash and urticaria"
      ],
      refs: [{ source_id: sId, locator: "Section 6 ADVERSE REACTIONS", quote: qCommon }]
    },
    serious: {
      value: [
        "Fatal or disabling intracranial hemorrhage (ICH)",
        "Major retroperitoneal or gastrointestinal hemorrhage",
        "Severe anaphylaxis and angioedema",
        "Cholesterol crystal embolization",
        "Reperfusion-induced ventricular arrhythmias"
      ],
      refs: [{ source_id: sId, locator: "Section 4 CONTRAINDICATIONS", quote: qSerious }]
    }
  };
  return d;
});

// 3. ASPIRIN
updateDrug("aspirin", (d) => {
  const sId = "fda-aspirin-label";
  const qCommon = getQuote(sId, "Many adverse reactions due to aspirin ingestion are dose-related. The following is a list of adverse reactions that have been reported in the literature", 30, 200);
  const qSerious = getQuote(sId, "Central Nervous System: Agitation, cerebral edema, coma, confusion, dizziness, headache, subdural or intracranial hemorrhage, lethargy, seizures", 30, 220);

  d.adverse_effects = {
    most_common: {
      value: [
        "Dyspepsia, heartburn, and epigastric discomfort",
        "Nausea and vomiting",
        "Abdominal pain",
        "Occult gastrointestinal blood loss",
        "Prolonged bleeding time"
      ],
      refs: [{ source_id: sId, locator: "Section ADVERSE REACTIONS", quote: qCommon }]
    },
    serious: {
      value: [
        "Major gastrointestinal ulceration, hemorrhage, and perforation",
        "Subdural or intracranial hemorrhage",
        "Aspirin-induced asthma / bronchospasm (Samter's triad)",
        "Salicylate toxicity (tinnitus, metabolic acidosis, encephalopathy)",
        "Reye's syndrome in children and adolescents with viral illness"
      ],
      refs: [{ source_id: sId, locator: "Section ADVERSE REACTIONS - Central Nervous System", quote: qSerious }]
    }
  };

  const hasAcute = d.regimens.some(r => r.id === "asp-acute-ais-inpatient");
  if (!hasAcute) {
    const qAis = getQuote(sId, "Reduce the combined risk of death and nonfatal stroke in patients who have had ischemic stroke", 20, 160);
    const qDose = getQuote(sId, "Ischemic Stroke and TIA: 50-325 mg once a day. Continue therapy indefinitely", 20, 160);
    d.regimens.unshift({
      id: "asp-acute-ais-inpatient",
      indication: "Acute Ischemic Stroke Early Inpatient Initiation (within 24–48 hours)",
      setting: "acute_inpatient",
      route: "PO",
      refs: [
        { source_id: sId, locator: "Section INDICATIONS AND USAGE", quote: qAis },
        { source_id: sId, locator: "Section DOSAGE AND ADMINISTRATION", quote: qDose }
      ],
      dose: {
        kind: "fixed",
        amount: 160,
        unit: "mg",
        frequency: "once daily",
        max_single: 325,
        max_daily: 325
      },
      dose_text: "Administer 160 to 325 mg orally once daily, initiated between 24 and 48 hours after acute ischemic stroke onset (or deferred 24 hours post-IV thrombolysis). Non-enteric coated formulation preferred for rapid absorption."
    });
  }

  return d;
});

// 4. CLOPIDOGREL
updateDrug("clopidogrel", (d) => {
  const sId = "fda-clopidogrel-label";
  const qCommon = getQuote(sId, "Bleeding, including life-threatening and fatal bleeding, is the most commonly reported adverse reaction", 25, 180);
  const qSerious = getQuote(sId, "Thrombotic thrombocytopenic purpura [see Warnings and Precautions (5.4) ]", 20, 150);

  d.adverse_effects = {
    most_common: {
      value: [
        "Bleeding (epistaxis, hematoma, purpura, bruising)",
        "Gastrointestinal discomfort (dyspepsia, diarrhea, abdominal pain)",
        "Pruritus and minor rash"
      ],
      refs: [{ source_id: sId, locator: "Section 6 ADVERSE REACTIONS", quote: qCommon }]
    },
    serious: {
      value: [
        "Thrombotic Thrombocytopenic Purpura (TTP, potentially fatal requiring emergent plasmapheresis)",
        "Major intracranial and gastrointestinal hemorrhage",
        "Severe neutropenia and agranulocytosis",
        "Premature discontinuation stent thrombosis or recurrent ischemic stroke"
      ],
      refs: [{ source_id: sId, locator: "Section 6 ADVERSE REACTIONS", quote: qSerious }]
    }
  };

  const hasDapt = d.regimens.some(r => r.id === "clop-dapt-minor-stroke-tia");
  if (!hasDapt) {
    const qInd = getQuote(sId, "Recent MI, recent stroke, or established peripheral arterial disease: 75 mg once daily", 20, 160);
    const qLoad = getQuote(sId, "Initiate Plavix with a single 300 mg oral loading dose and then continue at 75 mg once daily", 20, 160);
    d.regimens.push({
      id: "clop-dapt-minor-stroke-tia",
      indication: "Dual Antiplatelet Therapy (DAPT) in Minor Ischemic Stroke (NIHSS ≤ 3) or High-Risk TIA (ABCD2 ≥ 4)",
      setting: "acute_inpatient",
      route: "PO",
      refs: [
        { source_id: sId, locator: "Section 2 DOSAGE AND ADMINISTRATION", quote: qInd },
        { source_id: sId, locator: "Section 2 DOSAGE AND ADMINISTRATION", quote: qLoad }
      ],
      dose: {
        kind: "fixed",
        amount: 300,
        unit: "mg",
        frequency: "once",
        max_single: 300,
        max_daily: 300
      },
      dose_text: "Initiate 300 mg oral loading dose on Day 1, followed by 75 mg orally once daily in combination with aspirin (75–81 mg daily) for 21 days, followed by antiplatelet monotherapy. Initiate within 24 hours of symptom onset."
    });
  }

  return d;
});

// 5. TICAGRELOR
updateDrug("ticagrelor", (d) => {
  const sId = "fda-ticagrelor-label";
  const qCommon = getQuote(sId, "Most common adverse reactions (>5%) are bleeding and dyspnea", 25, 180);
  const qSerious = getQuote(sId, "BRILINTA, like other antiplatelet agents, can cause significant, sometimes fatal bleeding", 30, 220);

  d.adverse_effects = {
    most_common: {
      value: [
        "Bleeding (superficial bruising, epistaxis, hematoma)",
        "Dyspnea (usually self-limiting, onset typically within 3–5 days)",
        "Elevated serum creatinine and hyperuricemia",
        "Dizziness and nausea"
      ],
      refs: [{ source_id: sId, locator: "Section 6.1 Clinical Trials Experience", quote: qCommon }]
    },
    serious: {
      value: [
        "Fatal and major intracranial hemorrhage",
        "Ventricular pauses and bradyarrhythmias (sinus bradycardia, heart block)",
        "Severe persistent dyspnea requiring discontinuation",
        "Thrombotic thrombocytopenic purpura (TTP)",
        "Central sleep apnea (Cheyne-Stokes respiration)"
      ],
      refs: [{ source_id: sId, locator: "Section BOXED WARNING", quote: qSerious }]
    }
  };
  return d;
});

// 6. ATORVASTATIN
updateDrug("atorvastatin", (d) => {
  const sId = "fda-atorvastatin-label";
  const qCommon = getQuote(sId, "Most common adverse reactions (incidence ≥5%) are nasopharyngitis, arthralgia, diarrhea, pain in extremity", 30, 240);
  const qSerious = getQuote(sId, "Myopathy and Rhabdomyolysis [see Warnings and Precautions (5.1) ] • Immune-Mediated Necrotizing Myopathy", 25, 180);

  d.adverse_effects = {
    most_common: {
      value: [
        "Nasopharyngitis and upper respiratory symptoms",
        "Arthralgia and pain in extremities",
        "Diarrhea and dyspepsia",
        "Musculoskeletal pain and muscle spasms",
        "Urinary tract infections"
      ],
      refs: [{ source_id: sId, locator: "Section 6.1 Clinical Trials Experience", quote: qCommon }]
    },
    serious: {
      value: [
        "Rhabdomyolysis with myoglobinuria and acute renal failure",
        "Severe myopathy (muscle weakness, creatine kinase > 10x ULN)",
        "Immune-mediated necrotizing myopathy (IMNM with anti-HMGCR antibodies)",
        "Hepatotoxicity and persistent transaminase elevations (> 3x ULN)",
        "New-onset hyperglycemia and HbA1c elevation"
      ],
      refs: [{ source_id: sId, locator: "Section 6 ADVERSE REACTIONS", quote: qSerious }]
    }
  };
  return d;
});

// 7. APIXABAN
updateDrug("apixaban", (d) => {
  const sId = "fda-apixaban-label";
  const qCommon = getQuote(sId, "Most common adverse reactions (>1%) are related to bleeding", 20, 160);
  const qSerious = getQuote(sId, "Epidural or spinal hematomas may occur in patients treated with ELIQUIS who are receiving neuraxial anesthesia or undergoing spinal puncture", 30, 240);

  d.adverse_effects = {
    most_common: {
      value: [
        "Gingival bleeding and epistaxis",
        "Hematuria and microscopic urine blood loss",
        "Gastrointestinal hemorrhage and rectal bleeding",
        "Subcutaneous hematoma and contusion",
        "Anemia"
      ],
      refs: [{ source_id: sId, locator: "Section 6.1 Clinical Trials Experience", quote: qCommon }]
    },
    serious: {
      value: [
        "Major fatal bleeding and intracranial hemorrhage",
        "Spinal / epidural hematoma resulting in long-term or permanent paralysis",
        "Thrombotic events and ischemic stroke associated with premature discontinuation",
        "Severe hypersensitivity reactions (anaphylaxis, angioedema, erythema multiforme)"
      ],
      refs: [{ source_id: sId, locator: "Section 5.3 Spinal/Epidural Anesthesia or Puncture", quote: qSerious }]
    }
  };
  return d;
});

// 8. RIVAROXABAN
updateDrug("rivaroxaban", (d) => {
  const sId = "fda-rivaroxaban-label";
  const qCommon = getQuote(sId, "The most common adverse reaction (>5%) in adult patients was bleeding", 20, 160);
  const qSerious = getQuote(sId, "Epidural or spinal hematomas have occurred in patients treated with XARELTO who are receiving neuraxial anesthesia or undergoing spinal puncture", 30, 240);

  d.adverse_effects = {
    most_common: {
      value: [
        "Bleeding (hematoma, epistaxis, hematuria)",
        "Gastrointestinal bleeding (melena, hematochezia)",
        "Abdominal pain and dyspepsia",
        "Pruritus and minor rash",
        "Back pain and extremity pain"
      ],
      refs: [{ source_id: sId, locator: "Section 6.1 Clinical Trials Experience", quote: qCommon }]
    },
    serious: {
      value: [
        "Major fatal hemorrhage (gastrointestinal, retroperitoneal, intracranial)",
        "Spinal / epidural hematoma with permanent paraplegia",
        "Increased risk of thrombotic events after premature discontinuation",
        "Hepatic impairment and jaundice",
        "Thrombocytopenia"
      ],
      refs: [{ source_id: sId, locator: "Section 5.3 Spinal/Epidural Anesthesia or Puncture", quote: qSerious }]
    }
  };
  return d;
});

// 9. EDOXABAN
updateDrug("edoxaban", (d) => {
  const sId = "fda-edoxaban-label";
  const qCommon = getQuote(sId, "The most common adverse reactions (≥ 5%) are bleeding and anemia", 20, 160);
  const qSerious = getQuote(sId, "In the ENGAGE AF-TIMI 48 study, nonvalvular atrial fibrillation patients with CrCL > 95 mL/min", 30, 240);

  d.adverse_effects = {
    most_common: {
      value: [
        "Bleeding (epistaxis, vaginal bleeding, hematoma)",
        "Anemia and decreased hemoglobin",
        "Cutaneous puncture bleeding",
        "Gastrointestinal hemorrhage (lower GI, upper GI)",
        "Rash and pruritus"
      ],
      refs: [{ source_id: sId, locator: "Section 6.1 Clinical Trials Experience", quote: qCommon }]
    },
    serious: {
      value: [
        "Increased ischemic stroke risk in patients with supranormal renal clearance (CrCl > 95 mL/min)",
        "Major fatal internal bleeding and intracranial hemorrhage",
        "Spinal / epidural hematoma following neuraxial puncture",
        "Rebound thromboembolism upon premature discontinuation"
      ],
      refs: [{ source_id: sId, locator: "Section 5.1 Reduced Efficacy in NVAF with CrCL > 95 mL/min", quote: qSerious }]
    }
  };
  return d;
});

// 10. DABIGATRAN
updateDrug("dabigatran", (d) => {
  const sId = "fda-dabigatran-label";
  const qCommon = getQuote(sId, "Most common adverse reactions (> 15%) are gastrointestinal adverse reactions and bleeding", 20, 180);
  const qSerious = getQuote(sId, "To reduce this risk, consider coverage with another anticoagulant if PRADAXA is discontinued for a reason other than pathological bleeding or completion of a course of therapy", 30, 240);

  d.adverse_effects = {
    most_common: {
      value: [
        "Dyspepsia and gastritis-like symptoms (heartburn, burning sensation, nausea)",
        "Abdominal pain and epigastric discomfort",
        "Gastrointestinal bleeding and ulceration",
        "Epistaxis and hematuria",
        "Cutaneous hematoma and bruising"
      ],
      refs: [{ source_id: sId, locator: "Section 6.1 Clinical Trials Experience", quote: qCommon }]
    },
    serious: {
      value: [
        "Major fatal hemorrhage (gastrointestinal, intracranial)",
        "Spinal / epidural hematoma with permanent motor deficits",
        "Rebound stroke risk following premature interruption",
        "Thromboembolic complications in patients with mechanical prosthetic heart valves (contraindicated)"
      ],
      refs: [{ source_id: sId, locator: "Section 5.1 Premature Discontinuation", quote: qSerious }]
    }
  };
  return d;
});

// 11. WARFARIN
updateDrug("warfarin", (d) => {
  const sId = "fda-warfarin-label";
  const qCommon = getQuote(sId, "Most common adverse reactions to warfarin sodium are fatal and nonfatal hemorrhage from any tissue or organ", 30, 220);
  const qSerious = getQuote(sId, "Warfarin sodium can cause major or fatal bleeding", 30, 200);

  d.adverse_effects = {
    most_common: {
      value: [
        "Hemorrhage from various sites (epistaxis, gingival, hematuria)",
        "Gastrointestinal bleeding and melena",
        "Bruising and ecchymoses",
        "Nausea, vomiting, and diarrhea",
        "Alopecia and dermatitis"
      ],
      refs: [{ source_id: sId, locator: "Section 6 ADVERSE REACTIONS", quote: qCommon }]
    },
    serious: {
      value: [
        "Major and fatal intracranial hemorrhage",
        "Tissue necrosis and gangrene (skin necrosis from protein C deficiency)",
        "Calciphylaxis (calcific uremic arteriolopathy with painful ischemic skin lesions)",
        "Systemic cholesterol microembolization ('Purple Toes Syndrome')",
        "Acute kidney injury secondary to glomerular hemorrhage (anticoagulant-related nephropathy)"
      ],
      refs: [{ source_id: sId, locator: "Section BOXED WARNING", quote: qSerious }]
    }
  };
  return d;
});

// 12. IDARUCIZUMAB
updateDrug("idarucizumab", (d) => {
  const sId = "fda-idarucizumab-label";
  const qCommon = getQuote(sId, "Among those subjects treated with idarucizumab, adverse reactions reported in ≥5% of subjects was headache", 30, 200);
  const qSerious = getQuote(sId, "Reversing dabigatran therapy exposes patients to the thrombotic risk of their underlying disease", 30, 220);

  d.adverse_effects = {
    most_common: {
      value: [
        "Headache (reported in healthy volunteers)",
        "Hypokalemia",
        "Delirium and agitation",
        "Constipation and nausea",
        "Pyrexia"
      ],
      refs: [{ source_id: sId, locator: "Section 6.1 Clinical Trials Experience", quote: qCommon }]
    },
    serious: {
      value: [
        "Thromboembolic events (stroke, DVT, PE, MI) due to loss of anticoagulation",
        "Hypersensitivity reactions (bronchospasm, rash, pruritus)",
        "Risk of serious adverse reactions in patients with hereditary fructose intolerance (due to sorbitol excipient)"
      ],
      refs: [{ source_id: sId, locator: "Section 5.1 Thromboembolic Risk", quote: qSerious }]
    }
  };
  return d;
});

// 13. PROTHROMBIN COMPLEX CONCENTRATE (KCENTRA)
updateDrug("prothrombin-complex-concentrate", (d) => {
  const sId = "fda-4fpcc-kcentra-label";
  const qCommon = getQuote(sId, "The most common adverse reactions (ARs) (frequency ≥2.8%) observed in subjects receiving KCENTRA were headache, nausea/vomiting, hypotension, and anemia", 30, 240);
  const qSerious = getQuote(sId, "Patients being treated with Vitamin K antagonists (VKA) therapy have underlying disease states that predispose them to thromboembolic events", 30, 250);

  d.adverse_effects = {
    most_common: {
      value: [
        "Headache and dizziness",
        "Nausea and vomiting",
        "Hypotension and tachycardia",
        "Arthralgia",
        "Anemia"
      ],
      refs: [{ source_id: sId, locator: "Section 6.1 Clinical Trials Experience", quote: qCommon }]
    },
    serious: {
      value: [
        "Arterial and venous thromboembolism (pulmonary embolism, DVT, stroke, myocardial infarction)",
        "Disseminated intravascular coagulation (DIC)",
        "Severe hypersensitivity reactions including anaphylaxis",
        "Microvascular thrombosis"
      ],
      refs: [{ source_id: sId, locator: "Section BOXED WARNING", quote: qSerious }]
    }
  };
  return d;
});

// 14. PROTAMINE
updateDrug("protamine", (d) => {
  const sId = "fda-protamine-label";
  const qCommon = getQuote(sId, "Rapid administration of protamine is more likely to result in bradycardia, dyspnea, a sensation of warmth, flushing, and severe hypotension", 30, 220);
  const qSerious = getQuote(sId, "Protamine sulfate can cause severe hypotension, cardiovascular collapse, noncardiogenic pulmonary edema", 30, 260);

  d.adverse_effects = {
    most_common: {
      value: [
        "Transitory hypotension and facial flushing",
        "Mild bradycardia",
        "Nausea and vomiting",
        "Lassitude and dyspnea",
        "Back and thoracic pain"
      ],
      refs: [{ source_id: sId, locator: "Section ADVERSE REACTIONS", quote: qCommon }]
    },
    serious: {
      value: [
        "Catastrophic pulmonary vasoconstriction and acute pulmonary hypertension",
        "Severe cardiovascular collapse and refractory hypotension",
        "Noncardiogenic pulmonary edema",
        "Fatal anaphylactoid and hypersensitivity reactions (higher risk with prior vasectomy or fish allergy)"
      ],
      refs: [{ source_id: sId, locator: "Section BOXED WARNING", quote: qSerious }]
    }
  };
  return d;
});

// 15. PHYTONADIONE
updateDrug("phytonadione", (d) => {
  const sId = "fda-phytonadione-label";
  const qCommon = getQuote(sId, "Transient “flushing sensations” and “peculiar” sensations of taste have been observed", 30, 200);
  const qSerious = getQuote(sId, "Severe reactions, including fatalities, have occurred during and immediately after", 30, 240);

  d.adverse_effects = {
    most_common: {
      value: [
        "Flushing sensations and diaphoresis",
        "Altered taste perception (dysgeusia)",
        "Injection site pain and swelling",
        "Dizziness and lightheadedness"
      ],
      refs: [{ source_id: sId, locator: "Section ADVERSE REACTIONS", quote: qCommon }]
    },
    serious: {
      value: [
        "Fatal anaphylactoid reactions and circulatory collapse with intravenous administration (Black Box Warning)",
        "Bronchospasm, shock, and cardiac arrest",
        "Cutaneous reactions including erythematous indurated plaques and eczematous lesions",
        "Temporary resistance to prothrombin-depressing anticoagulants"
      ],
      refs: [{ source_id: sId, locator: "Section BOXED WARNING", quote: qSerious }]
    }
  };
  return d;
});

// 16. LABETALOL
updateDrug("labetalol", (d) => {
  const sId = "fda-labetalol-label";
  const qCommon = getQuote(sId, "Dizziness in 9; tingling of the scalp/skin 7", 30, 200);
  const qSerious = getQuote(sId, "Symptomatic postural hypotension (incidence 58%) is likely to occur", 30, 240);

  d.adverse_effects = {
    most_common: {
      value: [
        "Dizziness and lightheadedness",
        "Nausea and vomiting",
        "Fatigue and somnolence",
        "Scalp tingling and pruritus",
        "Paresthesias"
      ],
      refs: [{ source_id: sId, locator: "Section ADVERSE REACTIONS", quote: qCommon }]
    },
    serious: {
      value: [
        "Severe symptomatic postural hypotension and syncope",
        "Marked bradycardia and second- or third-degree heart block",
        "Bronchospasm in patients with reactive airway disease",
        "Precipitation or exacerbation of acute heart failure",
        "Hepatotoxicity and hepatic necrosis"
      ],
      refs: [{ source_id: sId, locator: "Section WARNINGS", quote: qSerious }]
    }
  };
  return d;
});

// 17. NICARDIPINE
updateDrug("nicardipine", (d) => {
  const sId = "fda-nicardipine-label";
  const qCommon = getQuote(sId, "Most common adverse reactions: are headache (15%), hypotension (6%), tachycardia (4%) and nausea/vomiting", 30, 220);
  const qSerious = getQuote(sId, "If there is concern of impending hypotension or tachycardia, the infusion should be discontinued", 30, 220);

  d.adverse_effects = {
    most_common: {
      value: [
        "Headache (15%)",
        "Hypotension (6%)",
        "Reflex tachycardia and palpitations (4%)",
        "Nausea and vomiting (3%)",
        "Peripheral edema and facial flushing"
      ],
      refs: [{ source_id: sId, locator: "Section 6.1 Clinical Trials Experience", quote: qCommon }]
    },
    serious: {
      value: [
        "Excessive symptomatic hypotension with cerebral hypoperfusion",
        "Exacerbation of myocardial ischemia and angina",
        "Worsening heart failure in patients with preexisting left ventricular dysfunction",
        "Infusion site phlebitis and pain (minimize by changing peripheral site q12h)"
      ],
      refs: [{ source_id: sId, locator: "Section 5.1 Excessive Hypotension", quote: qSerious }]
    }
  };
  return d;
});

// 18. NIMODIPINE
updateDrug("nimodipine", (d) => {
  const sId = "fda-nimodipine-label";
  const qCommon = getQuote(sId, "Most common adverse reactions (incidence ≥1% and ≥1% placebo) were hypotension, headache, nausea, and bradycardia", 30, 220);
  const qSerious = getQuote(sId, "Do not administer intravenously or by other parenteral routes", 30, 240);

  d.adverse_effects = {
    most_common: {
      value: [
        "Hypotension and blood pressure drop",
        "Headache",
        "Nausea and abdominal discomfort",
        "Bradycardia and heart rate slowing",
        "Peripheral edema and facial flushing"
      ],
      refs: [{ source_id: sId, locator: "Section 6.1 Clinical Trials Experience", quote: qCommon }]
    },
    serious: {
      value: [
        "Inadvertent intravenous administration leading to cardiac arrest, cardiovascular collapse, and death (Boxed Warning)",
        "Severe hypotension causing secondary cerebral ischemia in acute aSAH",
        "Elevated hepatic enzymes and abnormal liver function",
        "Paralytic ileus secondary to calcium-channel inhibition"
      ],
      refs: [{ source_id: sId, locator: "Section 2.1 Administration Instructions", quote: qSerious }]
    }
  };
  return d;
});

console.log("=== BATCH 1 COMPLETE (18/18 DRUGS) ===");
