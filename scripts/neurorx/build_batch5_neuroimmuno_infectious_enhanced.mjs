// Build & enhance Batch 5: Neuroimmunology & Neuro-Infectious (15 drugs)
// Drugs: rituximab, eculizumab, ravulizumab, efgartigimod, ivig,
//        azathioprine, mycophenolate, methylprednisolone, dexamethasone, prednisolone,
//        pyridostigmine, acyclovir, ceftriaxone, ampicillin, vancomycin

import { updateDrug, getQuote } from "./enhance_common.mjs";

console.log("=== ENHANCING BATCH 5: NEUROIMMUNOLOGY & NEURO-INFECTIOUS (15 DRUGS) ===");

// 1. RITUXIMAB
updateDrug("rituximab", (d) => {
  const sId = "fda-rituximab-label";
  const qCommon = getQuote(sId, "The following clinically significant adverse reactions are described elsewhere in the labeling: Mucocutaneous reactions [see Warnings and Precautions (5.1) ] Hepatitis B reactivation including fulminant hepatitis [see Warnings and Precautions (5.2) ] Progressive multifocal leukoencephalopathy [see Warnings and Precautions (5.3) ]", 30, 260);
  const qSerious = getQuote(sId, "Progressive Multifocal Leukoencephalopathy (PML), including fatal PML, can occur in patients receiving rituximab-containing products", 30, 260);

  d.adverse_effects = {
    most_common: {
      value: [
        "Infusion-related reactions (fever, chills, rigors, nausea, pruritus, angioedema, headache, bronchospasm, hypotension)",
        "Infections (upper respiratory tract, urinary tract, nasopharyngitis)",
        "Asthenia and fatigue",
        "Peripheral edema and hypertension",
        "Transient neutropenia and lymphopenia"
      ],
      refs: [{ source_id: sId, locator: "Section 6 ADVERSE REACTIONS", quote: qCommon }]
    },
    serious: {
      value: [
        "Fatal Infusion-Related Reactions (severe cytokine release syndrome, cardiogenic shock, ARDS; Boxed Warning)",
        "Severe Mucocutaneous Reactions (Stevens-Johnson syndrome, Toxic Epidermal Necrolysis, paraneoplastic pemphigus; Boxed Warning)",
        "Hepatitis B Virus (HBV) Reactivation leading to fulminant hepatitis, hepatic failure, and death (Boxed Warning; screen prior to initiation)",
        "Progressive Multifocal Leukoencephalopathy (PML) caused by JC virus (often fatal or permanently disabling; Boxed Warning)",
        "Severe, life-threatening viral, bacterial, and fungal infections (including hypogammaglobulinemia)",
        "Cardiac arrhythmias (ventricular tachycardia, fibrillation, angina) and myocardial infarction",
        "Bowel obstruction and intestinal perforation"
      ],
      refs: [{ source_id: sId, locator: "Section 5.3 Progressive Multifocal Leukoencephalopathy", quote: qSerious }]
    }
  };
  return d;
});

// 2. ECULIZUMAB
updateDrug("eculizumab", (d) => {
  const sId = "fda-eculizumab-label";
  const qCommon = getQuote(sId, "The most frequently reported adverse reactions in the PNH randomized trial (≥10% overall and greater than placebo) are: headache, nasopharyngitis, back pain, and nausea", 30, 260);
  const qSerious = getQuote(sId, "MENINGOCOCCAL INFECTIONS SOLIRIS, a complement inhibitor, increases the risk of serious infections caused by Neisseria meningitidis", 30, 240);

  d.adverse_effects = {
    most_common: {
      value: [
        "Headache (up to 44%, most frequent after initial infusions)",
        "Nasopharyngitis and upper respiratory tract infections",
        "Back pain and arthralgia",
        "Nausea and diarrhea",
        "Fatigue and pyrexia"
      ],
      refs: [{ source_id: sId, locator: "Section 6.1 Clinical Trials Experience", quote: qCommon }]
    },
    serious: {
      value: [
        "Life-threatening and fatal meningococcal infections (Neisseria meningitidis; Boxed Warning; mandatory vaccination against serogroups A, C, W, Y, and B at least 2 weeks prior to initiation)",
        "Severe systemic encapsulated bacterial infections (Streptococcus pneumoniae, Haemophilus influenzae)",
        "Infusion-related reactions and anaphylaxis",
        "Severe disease exacerbation / breakthrough hemolysis upon abrupt discontinuation"
      ],
      refs: [{ source_id: sId, locator: "Section BOXED WARNING - Meningococcal Infections", quote: qSerious }]
    }
  };
  return d;
});

// 3. RAVULIZUMAB
updateDrug("ravulizumab", (d) => {
  const sId = "fda-ravulizumab-label";
  const qCommon = getQuote(sId, "Most common adverse reactions in patients with PNH (incidence ≥ 10%) were upper respiratory tract infection and headache", 20, 200);
  const qSerious = getQuote(sId, "MENINGOCOCCAL INFECTIONS ULTOMIRIS, a complement inhibitor, increases the risk of serious infections caused by Neisseria meningitidis", 30, 240);

  d.adverse_effects = {
    most_common: {
      value: [
        "Upper respiratory tract infection and nasopharyngitis",
        "Headache (usually transient)",
        "Diarrhea and nausea",
        "Pyrexia and fatigue",
        "Pain in extremity and arthralgia"
      ],
      refs: [{ source_id: sId, locator: "Section 6.1 Clinical Trials Experience", quote: qCommon }]
    },
    serious: {
      value: [
        "Life-threatening and fatal meningococcal infections (Neisseria meningitidis; Boxed Warning; mandatory vaccination serogroups ACWY + B)",
        "Severe systemic encapsulated bacterial infections",
        "Infusion-related reactions (lower back pain, chest pain, dyspnea, rash)",
        "Post-discontinuation disease exacerbation / severe hemolysis or myasthenic relapse"
      ],
      refs: [{ source_id: sId, locator: "Section BOXED WARNING - Meningococcal Infections", quote: qSerious }]
    }
  };
  return d;
});

// 4. EFGARTIGIMOD
updateDrug("efgartigimod", (d) => {
  const sId = "fda-efgartigimod-label";
  const qCommon = getQuote(sId, "The most common adverse reactions (≥ 10%) in patients with gMG treated with efgartigimod alfa-fcab were respiratory tract infections, headache, and urinary tract infection", 30, 260);
  const qSerious = getQuote(sId, "Hypersensitivity Reactions: Anaphylaxis, hypotension leading to syncope, angioedema, dyspnea, rash, and urticaria have occurred in patients treated with VYVGART HYTRULO or intravenous efgartigimod alfa-fcab product", 30, 260);

  d.adverse_effects = {
    most_common: {
      value: [
        "Respiratory tract infections (nasopharyngitis, sinusitis, bronchitis, pharyngitis; ~33%)",
        "Headache (~32%)",
        "Urinary tract infections (~10%)",
        "Paresthesias and hypoesthesia",
        "Myalgia",
        "Injection site reactions (erythema, pruritus, hematoma with subcutaneous formulation)"
      ],
      refs: [{ source_id: sId, locator: "Section 6.1 Clinical Trials Experience", quote: qCommon }]
    },
    serious: {
      value: [
        "Severe hypersensitivity reactions (anaphylaxis, hypotension leading to syncope, angioedema, dyspnea, urticaria)",
        "Severe and opportunistic infections (due to transient, profound reduction in circulating IgG levels)",
        "Infusion/injection-related reactions",
        "Transient neutropenia"
      ],
      refs: [{ source_id: sId, locator: "Section 5.2 Hypersensitivity Reactions", quote: qSerious }]
    }
  };
  return d;
});

// 5. IVIG
updateDrug("ivig", (d) => {
  const sId = "fda-ivig-label";
  const qCommon = getQuote(sId, "The most common adverse reactions (incidence >5%) were: PI –headache, fatigue, nausea, chills, vomiting, back pain, pain, elevated body temperature, abdominal pain, diarrhea, cough, stomach discomfort, chest pain, joint swelling/effusion", 30, 260);
  const qSerious = getQuote(sId, "THROMBOSIS, RENAL DYSFUNCTION AND ACUTE RENAL FAILURE Thrombosis may occur with immune globulin products 1-3 , including PRIVIGEN", 30, 240);

  d.adverse_effects = {
    most_common: {
      value: [
        "Headache (very common, may be severe)",
        "Pyrexia, chills, rigors, and elevated body temperature",
        "Nausea, vomiting, and abdominal pain",
        "Fatigue, asthenia, and malaise",
        "Back pain, arthralgia, and myalgia",
        "Flushing, urticaria, and pruritus"
      ],
      refs: [{ source_id: sId, locator: "Section 6.1 Clinical Trials Experience", quote: qCommon }]
    },
    serious: {
      value: [
        "Thrombosis and arterial/venous thromboembolic events (stroke, myocardial infarction, DVT, PE; Boxed Warning; associated with increased blood viscosity)",
        "Renal dysfunction and acute renal failure / osmotic nephrosis (Boxed Warning; especially with sucrose-containing formulations or preexisting kidney disease)",
        "Aseptic Meningitis Syndrome (AMS; severe headache, nuchal rigidity, photophobia, fever, CSF pleocytosis)",
        "Hemolysis and hemolytic anemia (direct Coombs-positive hemolysis due to isoagglutinins)",
        "Transfusion-Related Acute Lung Injury (TRALI; severe non-cardiogenic pulmonary edema, hypoxemia)",
        "Severe anaphylaxis (especially in IgA-deficient patients with anti-IgA antibodies)",
        "Volume overload and congestive heart failure"
      ],
      refs: [{ source_id: sId, locator: "Section BOXED WARNING - Thrombosis and Renal Dysfunction", quote: qSerious }]
    }
  };
  return d;
});

// 6. AZATHIOPRINE
updateDrug("azathioprine", (d) => {
  const sId = "fda-azathioprine-label";
  const qCommon = getQuote(sId, "ADVERSE REACTIONS: The principal and potentially serious toxic effects of IMURAN are hematologic and gastrointestinal. The risks of secondary infection and malignancy are also significant", 30, 260);
  const qSerious = getQuote(sId, "MALIGNANCY Chronic immunosuppression with IMURAN, a purine antimetabolite increases risk of malignancy in humans. Reports of malignancy include post-transplant lymphoma and hepatosplenic T-cell lymphoma", 30, 260);

  d.adverse_effects = {
    most_common: {
      value: [
        "Gastrointestinal intolerance: nausea, vomiting, anorexia, abdominal discomfort (can be minimized by dividing doses or taking with food)",
        "Leukopenia and macrocytosis",
        "Mild elevation of transaminases / alkaline phosphatase",
        "Infections (upper respiratory, herpes simplex, herpes zoster)",
        "Fatigue and malaise"
      ],
      refs: [{ source_id: sId, locator: "Section ADVERSE REACTIONS", quote: qCommon }]
    },
    serious: {
      value: [
        "Malignancy (Boxed Warning: lymphomas, post-transplant lymphoproliferative disorders, hepatosplenic T-cell lymphoma, non-melanoma skin cancer)",
        "Severe bone marrow suppression / myelosuppression (profound leukopenia, neutropenia, thrombocytopenia, aplastic anemia; markedly exacerbated in patients with TPMT or NUDT15 deficiency)",
        "Severe, life-threatening opportunistic infections (bacterial, viral, fungal, protozoal)",
        "Acute pancreatitis (hypersensitivity reaction, typically within weeks of starting; requires immediate cessation)",
        "Hepatotoxicity (cholestasis, sinusoidal obstruction syndrome / veno-occlusive disease, peliosis hepatis)",
        "Severe systemic hypersensitivity reactions (fever, rash, hypotension, arthralgias)"
      ],
      refs: [{ source_id: sId, locator: "Section BOXED WARNING - Malignancy", quote: qSerious }]
    }
  };
  return d;
});

// 7. MYCOPHENOLATE
updateDrug("mycophenolate", (d) => {
  const sId = "fda-mycophenolate-label";
  const qCommon = getQuote(sId, "The most common adverse reactions in clinical trials (20 % or greater) include diarrhea, leukopenia, infection, vomiting, and there is evidence of a higher frequency of certain types of infections e.g., opportunistic infection", 30, 260);
  const qSerious = getQuote(sId, "EMBRYOFETAL TOXICITY, MALIGNANCIES and SERIOUS INFECTIONS Use during pregnancy is associated with increased risks of first trimester pregnancy loss and congenital malformations", 30, 260);

  d.adverse_effects = {
    most_common: {
      value: [
        "Diarrhea (most common GI adverse effect, dose-dependent)",
        "Nausea, vomiting, dyspepsia, and abdominal pain",
        "Leukopenia and anemia",
        "Infections (viral, bacterial, urinary tract)",
        "Headache, dizziness, and insomnia",
        "Peripheral edema and tremor"
      ],
      refs: [{ source_id: sId, locator: "Section 6.1 Clinical Trials Experience", quote: qCommon }]
    },
    serious: {
      value: [
        "Embryofetal Toxicity (Boxed Warning: increased risk of first-trimester pregnancy loss and severe congenital malformations; mandatory negative pregnancy test and effective contraception)",
        "Lymphoma and other malignancies (Boxed Warning: particularly skin cancer and post-transplant lymphoproliferative disorder)",
        "Serious, fatal, and opportunistic infections (Boxed Warning: CMV, fungal, bacterial, and viral reactivation)",
        "Progressive Multifocal Leukoencephalopathy (PML) associated with JC virus",
        "Pure Red Cell Aplasia (PRCA)",
        "Gastrointestinal hemorrhage, ulceration, and perforation",
        "BK virus-associated nephropathy"
      ],
      refs: [{ source_id: sId, locator: "Section BOXED WARNING - Embryofetal Toxicity & Malignancies", quote: qSerious }]
    }
  };
  return d;
});

// 8. METHYLPREDNISOLONE
updateDrug("methylprednisolone", (d) => {
  const sId = "fda-methylprednisolone-label";
  const qCommon = getQuote(sId, "Endocrine: Decreased carbohydrate and glucose tolerance, development of cushingoid state, glycosuria, hirsutism, hypertrichosis, increased requirements for insulin or oral hypoglycemic agents in diabetes", 30, 260);
  const qSerious = getQuote(sId, "Musculoskeletal: Aseptic necrosis of femoral and humeral heads, Charcot-like arthropathy, loss of muscle mass, muscle weakness, osteoporosis, pathologic fracture of long bones", 30, 260);

  d.adverse_effects = {
    most_common: {
      value: [
        "Hyperglycemia and acute worsening of diabetic control",
        "Development of cushingoid features (moon facies, buffalo hump, central adiposity)",
        "Fluid retention, sodium retention, and peripheral edema",
        "Hypertension",
        "Insomnia, euphoria, anxiety, and mood lability",
        "Dyspepsia and gastric irritation",
        "Weight gain and increased appetite"
      ],
      refs: [{ source_id: sId, locator: "Section ADVERSE REACTIONS - Endocrine", quote: qCommon }]
    },
    serious: {
      value: [
        "Aseptic osteonecrosis / avascular necrosis of femoral and humeral heads",
        "Severe steroid-induced osteoporosis and pathologic vertebral compression fractures",
        "Peptic ulcer disease with gastrointestinal perforation and hemorrhage",
        "Steroid psychosis, severe mania, depression, and cognitive disturbances",
        "Secondary adrenocortical and pituitary unresponsiveness (adrenal crisis on rapid withdrawal)",
        "Severe immunosuppression and reactivation of latent infections (tuberculosis, fungal, strongyloides)",
        "Cardiovascular collapse, cardiac arrest, arrhythmias, and hypertension with rapid IV infusion",
        "Posterior subcapsular cataracts and elevated intraocular pressure / glaucoma"
      ],
      refs: [{ source_id: sId, locator: "Section ADVERSE REACTIONS - Musculoskeletal", quote: qSerious }]
    }
  };
  return d;
});

// 9. DEXAMETHASONE
updateDrug("dexamethasone", (d) => {
  const sId = "fda-dexamethasone-label";
  const qCommon = getQuote(sId, "development of cushingoid state, hyperglycemia, glycosuria, hirsutism, hypertrichosis, increased requirements for insulin or oral hypoglycemic agents in diabetes, manifestations of latent diabetes mellitus", 30, 260);
  const qSerious = getQuote(sId, "Neurological/Psychiatric: Convulsions, depression, emotional instability, euphoria, headache, increased intracranial pressure with papilledema (pseudotumor cerebri) usually following discontinuation of treatment", 30, 260);

  d.adverse_effects = {
    most_common: {
      value: [
        "Hyperglycemia and glycosuria",
        "Cushingoid state and weight gain",
        "Fluid and electrolyte disturbances (potassium loss, sodium retention)",
        "Insomnia, restlessness, and mood alterations",
        "Gastric irritation and dyspepsia",
        "Increased appetite"
      ],
      refs: [{ source_id: sId, locator: "Section ADVERSE REACTIONS - Endocrine", quote: qCommon }]
    },
    serious: {
      value: [
        "Neurological/psychiatric toxicity: convulsions, severe depression, psychosis, emotional instability",
        "Pseudotumor cerebri (benign intracranial hypertension with papilledema) usually following discontinuation",
        "Avascular necrosis of femoral and humeral heads, severe osteoporosis, and pathologic fractures",
        "Peptic ulceration with perforation and massive hemorrhage",
        "Acute adrenal insufficiency / crisis upon rapid withdrawal",
        "Opportunistic infections and masking of infection signs",
        "Cardiovascular: hypertension, arrhythmias, congestive heart failure"
      ],
      refs: [{ source_id: sId, locator: "Section ADVERSE REACTIONS - Neurological/Psychiatric", quote: qSerious }]
    }
  };
  return d;
});

// 10. PREDNISOLONE
updateDrug("prednisolone", (d) => {
  const sId = "fda-prednisolone-label";
  const qCommon = getQuote(sId, "Fluid and Electrolyte Disturbances Sodium retention. Fluid retention. Congestive heart failure in susceptible patients. Potassium loss. Hypokalemic alkalosis. Hypertension", 30, 260);
  const qSerious = getQuote(sId, "Gastrointestinal Peptic ulcer with possible perforation and hemorrhage. Pancreatitis. Abdominal distention. Ulcerative esophagitis", 30, 260);

  d.adverse_effects = {
    most_common: {
      value: [
        "Fluid and sodium retention, peripheral edema",
        "Hypertension",
        "Potassium loss and hypokalemic alkalosis",
        "Hyperglycemia and cushingoid features",
        "Insomnia, nervousness, and mood swings",
        "Dyspepsia and increased appetite"
      ],
      refs: [{ source_id: sId, locator: "Section ADVERSE REACTIONS - Fluid and Electrolytes", quote: qCommon }]
    },
    serious: {
      value: [
        "Peptic ulcer disease with possible perforation and gastrointestinal hemorrhage",
        "Acute pancreatitis and ulcerative esophagitis",
        "Steroid myopathy, muscle mass loss, osteoporosis, and compression fractures",
        "Aseptic necrosis of femoral and humeral heads",
        "Adrenal suppression and acute adrenal crisis upon sudden tapering",
        "Severe immunosuppression and opportunistic infections",
        "Glaucoma, increased intraocular pressure, and subcapsular cataracts",
        "Psychiatric disorders (steroid psychosis, depression, mania)"
      ],
      refs: [{ source_id: sId, locator: "Section ADVERSE REACTIONS - Gastrointestinal", quote: qSerious }]
    }
  };
  return d;
});

// 11. PYRIDOSTIGMINE
updateDrug("pyridostigmine", (d) => {
  const sId = "fda-pyridostigmine-label";
  const qCommon = getQuote(sId, "Among those in the former group are nausea, vomiting, diarrhea, abdominal cramps, increased peristalsis, increased salivation, increased bronchial secretions, miosis and diaphoresis", 30, 260);
  const qSerious = getQuote(sId, "Nicotinic side effects are comprised chiefly of muscle cramps, fasciculation and weakness", 20, 200);

  d.adverse_effects = {
    most_common: {
      value: [
        "Muscarinic gastrointestinal symptoms: abdominal cramps, diarrhea, nausea, vomiting, increased peristalsis",
        "Increased salivation (sialorrhea) and increased bronchial secretions",
        "Diaphoresis (excessive sweating)",
        "Miosis (constricted pupils) and blurred vision",
        "Urinary urgency and frequency"
      ],
      refs: [{ source_id: sId, locator: "Section ADVERSE REACTIONS - Muscarinic Effects", quote: qCommon }]
    },
    serious: {
      value: [
        "Cholinergic Crisis (depolarizing neuromuscular blockade resulting in generalized flaccid muscle paralysis, respiratory failure, and apnea; must be differentiated from myasthenic crisis; requires immediate atropine and ventilatory support)",
        "Severe nicotinic symptoms: prominent muscle fasciculations, muscle cramps, and profound muscle weakness",
        "Severe bronchospasm, laryngospasm, and copious pulmonary secretions leading to airway obstruction (contraindicated in bronchial asthma)",
        "Marked bradycardia, nodal rhythms, AV block, and syncope",
        "Mechanical intestinal or urinary obstruction exacerbation (contraindicated)"
      ],
      refs: [{ source_id: sId, locator: "Section ADVERSE REACTIONS - Nicotinic Effects", quote: qSerious }]
    }
  };
  return d;
});

// 12. ACYCLOVIR
updateDrug("acyclovir", (d) => {
  const sId = "fda-acyclovir-label";
  const qCommon = getQuote(sId, "The most frequent adverse reactions reported during administration of acyclovir were inflammation or phlebitis at the injection site in approximately 9% of the patients, and transient elevations of serum creatinine or BUN in 5% to 10%", 30, 260);
  const qSerious = getQuote(sId, "Nervous: Aggressive behavior, agitation, ataxia, coma, confusion, delirium, dizziness, dysarthria, encephalopathy, hallucinations, obtundation, paresthesia, psychosis, seizure, somnolence, tremor", 30, 260);

  d.adverse_effects = {
    most_common: {
      value: [
        "Local injection site inflammation, phlebitis, and pain (~9%)",
        "Transient elevations of serum creatinine or BUN (5% to 10%; higher with rapid IV bolus)",
        "Nausea and vomiting (~7%)",
        "Itching, rash, or hives (~2%)",
        "Transient transaminase elevations (1% to 2%)",
        "Headache and malaise"
      ],
      refs: [{ source_id: sId, locator: "Section ADVERSE REACTIONS", quote: qCommon }]
    },
    serious: {
      value: [
        "Acute Kidney Injury / crystal nephropathy (intratubular precipitation of acyclovir crystals; prevent by slow IV infusion over >=1 hour and adequate intravenous hydration)",
        "Severe neurotoxicity and encephalopathy: delirium, hallucinations, agitation, ataxia, tremor, myoclonus, seizures, and coma (higher risk in elderly or patients with preexisting renal impairment)",
        "Severe hypersensitivity reactions and anaphylaxis",
        "Extravasation tissue necrosis and chemical thrombophlebitis (high alkaline pH ~11)",
        "Disseminated intravascular coagulation and hemolytic uremic syndrome (rare)"
      ],
      refs: [{ source_id: sId, locator: "Section ADVERSE REACTIONS - Postmarketing / Nervous", quote: qSerious }]
    }
  };
  return d;
});

// 13. CEFTRIAXONE
updateDrug("ceftriaxone", (d) => {
  const sId = "fda-ceftriaxone-label";
  const qCommon = getQuote(sId, "Gastrointestinal Diarrhea/loose stools (2.7%). Less frequently reported (<1%) were nausea or vomiting, and dysgeusia", 20, 240);
  const qSerious = getQuote(sId, "Hypersensitivity Ceftriaxone for injection is contraindicated in patients with known hypersensitivity to ceftriaxone, any of its excipients or to any other cephalosporin", 30, 240);

  d.adverse_effects = {
    most_common: {
      value: [
        "Diarrhea / loose stools (2.7%)",
        "Eosinophilia (6%), thrombocytosis (5.1%), and leukopenia (2.1%)",
        "Local injection site pain, tenderness, and induration",
        "Rash (1.7%) and pruritus",
        "Elevation of liver enzymes (ALT, AST, alkaline phosphatase) and BUN",
        "Nausea, vomiting, and dysgeusia"
      ],
      refs: [{ source_id: sId, locator: "Section ADVERSE REACTIONS - Gastrointestinal", quote: qCommon }]
    },
    serious: {
      value: [
        "Severe hypersensitivity and anaphylactic shock (contraindicated in patients with severe cephalosporin or beta-lactam hypersensitivity)",
        "Calcium-ceftriaxone precipitation in lungs and kidneys (fatal precipitation reported in neonates; contraindicated with calcium-containing IV solutions)",
        "Clostridioides difficile-associated diarrhea (CDAD) and pseudomembranous colitis",
        "Biliary sludging / pseudolithiasis (biliary colic due to precipitation of ceftriaxone-calcium salt in gallbladder; usually reversible)",
        "Immune-mediated hemolytic anemia (can be severe or fatal)",
        "Coagulopathy and hypoprothrombinemia / bleeding (prolongation of PT/INR; vitamin K-reversible)"
      ],
      refs: [{ source_id: sId, locator: "Section CONTRAINDICATIONS - Hypersensitivity", quote: qSerious }]
    }
  };
  return d;
});

// 14. AMPICILLIN
updateDrug("ampicillin", (d) => {
  const sId = "fda-ampicillin-label";
  const qCommon = getQuote(sId, "The most frequently reported adverse reactions were diarrhea in 3% of the patients and rash in less than 2% of the patients", 20, 200);
  const qSerious = getQuote(sId, "The use of ampicillin and sulbactam for injection is contraindicated in individuals with a history of serious hypersensitivity reactions (e.g., anaphylaxis or Stevens-Johnson syndrome) to ampicillin, sulbactam or to other beta-lactam antibacterial drugs", 30, 260);

  d.adverse_effects = {
    most_common: {
      value: [
        "Diarrhea (~3%) and loose stools",
        "Maculopapular rash (<2%) and pruritus",
        "Injection site pain (IM 16%, IV 3%) and thrombophlebitis",
        "Nausea, vomiting, and abdominal cramps",
        "Transient elevation of serum transaminases (ALT, AST)"
      ],
      refs: [{ source_id: sId, locator: "Section ADVERSE REACTIONS", quote: qCommon }]
    },
    serious: {
      value: [
        "Severe, life-threatening anaphylactic reactions and angioedema (Boxed Warning / Contraindicated in severe beta-lactam allergy)",
        "Severe cutaneous adverse reactions: Stevens-Johnson syndrome (SJS), Toxic Epidermal Necrolysis (TEN), DRESS syndrome",
        "Clostridioides difficile-associated diarrhea (CDAD) and toxic megacolon",
        "Drug-induced liver injury (cholestatic jaundice, hepatitis)",
        "Hematologic toxicity: leukopenia, neutropenia, thrombocytopenia, hemolytic anemia",
        "Neurotoxicity and seizures (especially with very high doses or in patients with renal failure)"
      ],
      refs: [{ source_id: sId, locator: "Section CONTRAINDICATIONS", quote: qSerious }]
    }
  };
  return d;
});

// 15. VANCOMYCIN
updateDrug("vancomycin", (d) => {
  const sId = "fda-vancomycin-label";
  const qCommon = getQuote(sId, "Infusion-Related Events During or soon after rapid infusion of vancomycin hydrochloride for injection, patients may develop anaphylactoid reactions, including hypotension (see ANIMAL PHARMACOLOGY ), wheezing, dyspnea, urticaria, or pruritus", 30, 260);
  const qSerious = getQuote(sId, "Nephrotoxicity Systemic vancomycin exposure may result in acute kidney injury (AKI). The risk of AKI increases as systemic exposure/serum levels increase", 30, 240);

  d.adverse_effects = {
    most_common: {
      value: [
        "Infusion-related reactions ('Red Man Syndrome'): flushing of upper body/neck, pruritus, erythema, urticaria, chills (rate-dependent; prevent by infusing <=10 mg/min or over >=60 min)",
        "Injection site thrombophlebitis and local pain",
        "Nausea, vomiting, and diarrhea",
        "Fever and drug-related rigors",
        "Mild transient creatinine elevation"
      ],
      refs: [{ source_id: sId, locator: "Section ADVERSE REACTIONS - Infusion-Related Events", quote: qCommon }]
    },
    serious: {
      value: [
        "Nephrotoxicity and Acute Kidney Injury (AKI; dose- and trough-dependent, significantly increased with AUC >600 mg*h/L, troughs >20 mcg/mL, or concomitant nephrotoxic agents like aminoglycosides, piperacillin-tazobactam, NSAIDs; monitor AUC/MIC or troughs)",
        "Ototoxicity (sensorineural hearing loss, tinnitus, vertigo; may be permanent; risk increased with high serum concentrations or concomitant ototoxic drugs)",
        "Severe anaphylaxis and hypotension / cardiovascular collapse during rapid infusion",
        "Severe cutaneous adverse reactions: DRESS syndrome, Stevens-Johnson syndrome, linear IgA bullous dermatosis",
        "Neutropenia (reversible on cessation; periodic CBC monitoring for prolonged courses >1-2 weeks)",
        "Clostridioides difficile-associated diarrhea (CDAD)"
      ],
      refs: [{ source_id: sId, locator: "Section WARNINGS - Nephrotoxicity", quote: qSerious }]
    }
  };
  return d;
});

console.log("=== BATCH 5 COMPLETE (15/15 DRUGS) ===");
