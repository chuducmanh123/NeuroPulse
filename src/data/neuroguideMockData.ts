import {
  ClinicalScenario,
  GuidelineDoc,
  RecommendationAtom,
  ConferenceEvent,
} from "../types/neuroguide";

export const MOCK_CLINICAL_SCENARIOS: ClinicalScenario[] = [
  {
    id: "ais-ivt-tenecteplase-4.5h",
    title: "Tenecteplase vs. Alteplase for Acute Ischemic Stroke within 4.5 Hours",
    subspecialty: "Stroke",
    summary:
      "Indication for intravenous Tenecteplase (0.25 mg/kg single bolus, maximum 25 mg) as an effective and safe alternative to standard 1-hour Alteplase infusion in patients with acute ischemic stroke presenting within 4.5 hours of symptom onset.",
    keyTags: ["Tenecteplase", "TNK-tPA", "Alteplase", "IV Thrombolysis", "Door-to-Needle", "AcT", "TRACE-2"],
    statusBadge: "PRACTICE_CHANGING",
    hasConfAlert: true,
    confAlertText: "Long-term data from AcT and ATTEST-2 confirm non-inferior functional outcomes and comparable safety.",
    aiSynthesisAppraisal: {
      consensusLevel: "HIGH_CONCORDANCE",
      whyGuidelinesDiffer:
        "ESO (2024 Expedited Update) and updated AHA/ASA (2026) both recommend Tenecteplase 0.25 mg/kg as equal or preferable to Alteplase due to the rapid 5-second bolus delivery, especially advantageous for 'drip-and-ship' transfers. Earlier AHA 2019 guidelines carried a Class IIb recommendation prior to completion of pivotal non-inferiority phase 3 RCTs.",
      clinicalBottomLine:
        "Tenecteplase 0.25 mg/kg (maximum 25 mg) administered as a single IV bolus over 5–10 seconds is a proven, safe, and pragmatic alternative to Alteplase for all patients eligible for intravenous thrombolysis within 4.5 hours.",
      resourceDependency: "Standard Care",
      lastAppraisedAt: "2026-03-15",
    },
    temporalEvolution: [
      {
        society: "AHA/ASA",
        previousYear: 2019,
        previousGrade: "Class IIb, Level B-R (Selective consideration)",
        currentYear: 2026,
        currentGrade: "Class I, Level A (Recommended alternative)",
        shiftDirection: "UPGRADED",
        drivingTrials: ["AcT (Lancet 2022)", "TRACE-2 (Lancet 2023)", "ORIGINAL (Stroke 2024)"],
        evolutionNarrative:
          "Upgraded from a selective option prior to mechanical thrombectomy to a frontline Class I recommendation for all IVT-eligible stroke patients.",
      },
      {
        society: "ESO",
        previousYear: 2021,
        previousGrade: "Weak recommendation, Moderate quality",
        currentYear: 2024,
        currentGrade: "Strong recommendation FOR, High quality",
        shiftDirection: "UPGRADED",
        drivingTrials: ["AcT", "NOR-TEST 2A", "ATTEST-2"],
        evolutionNarrative:
          "ESO Living Guidelines established high-certainty evidence endorsing Tenecteplase 0.25 mg/kg over Alteplase 0.9 mg/kg.",
      },
    ],
    ecosystemLinks: [
      {
        app: "NeuroRx",
        href: "#",
        label: "Calculate TNK Dose by Weight",
        badge: "0.25 mg/kg",
        description: "Automatic bolus calculation with strict 25 mg ceiling and reconstitution guidelines.",
      },
      {
        app: "NeuroCalc",
        href: "#",
        label: "NIHSS Scoring Calculator",
        badge: "IVT Eligibility",
        description: "Quantify stroke neurological deficits pre- and post-thrombolytic administration.",
      },
    ],
  },
  {
    id: "ais-large-core-evt-aspects-3-5",
    title: "Endovascular Thrombectomy for Acute Ischemic Stroke with Large Ischemic Core (ASPECTS 3–5)",
    subspecialty: "Stroke",
    summary:
      "Indication for mechanical thrombectomy in anterior circulation large vessel occlusion (ICA or MCA-M1) presenting with extensive baseline ischemic injury (ASPECTS 3–5 on NCCT/MRI or CTP ischemic core volume ≥50 mL) within 24 hours.",
    keyTags: ["Large Core", "ASPECTS 3-5", "EVT", "Thrombectomy", "SELECT2", "TENSION", "LASTE"],
    statusBadge: "UPGRADED",
    hasConfAlert: true,
    confAlertText: "LASTE trial reported at ESOC extended thrombectomy benefit down to ASPECTS 0–2.",
    aiSynthesisAppraisal: {
      consensusLevel: "HIGH_CONCORDANCE",
      whyGuidelinesDiffer:
        "Historically, trials excluded patients with ASPECTS < 6 due to concerns regarding catastrophic hemorrhagic transformation. Six modern randomized trials (RESCUE-JAPAN, SELECT2, ANGEL-ASPECT, TENSION, TESLA, LASTE) proved overwhelming functional benefit, prompting guidelines worldwide to reverse prior exclusions.",
      clinicalBottomLine:
        "Patients with anterior circulation LVO and ASPECTS 3–5 presenting within 24 hours should receive endovascular thrombectomy in addition to medical management, providing substantially superior functional independence (NNT ~ 5).",
      resourceDependency: "Requires Advanced Perfusion/AI",
      lastAppraisedAt: "2026-02-20",
    },
    temporalEvolution: [
      {
        society: "AHA/ASA",
        previousYear: 2019,
        previousGrade: "Class IIb, Level B-R (Uncertain efficacy for ASPECTS <6)",
        currentYear: 2026,
        currentGrade: "Class I, Level A (Strongly recommended)",
        shiftDirection: "UPGRADED",
        drivingTrials: ["SELECT2 (NEJM 2023)", "ANGEL-ASPECT (NEJM 2023)", "TENSION (Lancet 2023)"],
        evolutionNarrative:
          "Historic shift from exclusion to Class I recommendation for patients with large core infarcts presenting within 24 hours.",
      },
    ],
    ecosystemLinks: [
      {
        app: "NeuroVision",
        href: "#",
        label: "ASPECTS 10-Region Automated Scoring",
        badge: "AI Imaging",
        description: "Map MCA territorial hypoattenuation on non-contrast CT and volumetric core perfusion.",
      },
      {
        app: "NeuroCase",
        href: "/neurocase",
        label: "Clinical Case: M1 Occlusion with ASPECTS 4",
        badge: "Case Study",
        description: "Review procedural angiograms and 90-day clinical outcome in a large core challenge.",
      },
    ],
  },
  {
    id: "ich-acute-bp-lowering",
    title: "Acute Blood Pressure Lowering in Spontaneous Intracerebral Hemorrhage",
    subspecialty: "Stroke",
    summary:
      "Target systolic blood pressure thresholds in the hyperacute phase (within 2–6 hours) of spontaneous ICH to limit hematoma expansion while preventing renal hypoperfusion and cerebral ischemia.",
    keyTags: ["ICH", "Blood Pressure", "Nicardipine", "Target SBP 130-140", "Hematoma Expansion"],
    statusBadge: "ESTABLISHED",
    hasConfAlert: false,
    aiSynthesisAppraisal: {
      consensusLevel: "HIGH_CONCORDANCE",
      whyGuidelinesDiffer:
        "AHA/ASA, ESO, and NCS all recommend rapid reduction to a target SBP between 130 and 140 mmHg, while explicitly advising against acute reduction below 130 mmHg or rapid drops >60 mmHg/hour due to renal adverse events highlighted in ATACH-2.",
      clinicalBottomLine:
        "In patients with acute spontaneous ICH presenting with SBP >150 mmHg, rapidly reduce and smoothly maintain SBP between 130 and 140 mmHg using titratable IV infusions (Nicardipine, Labetalol); avoid blood pressure variability.",
      resourceDependency: "Standard Care",
      lastAppraisedAt: "2026-01-10",
    },
    temporalEvolution: [
      {
        society: "AHA/ASA",
        previousYear: 2015,
        previousGrade: "Class I, Level A (Target SBP <140 mmHg)",
        currentYear: 2022,
        currentGrade: "Class IIa, Level B-R (Target 130-140 mmHg; avoid <130)",
        shiftDirection: "REVISED",
        drivingTrials: ["INTERACT2 (NEJM 2013)", "ATACH-2 (NEJM 2016)"],
        evolutionNarrative:
          "Refined safety boundary establishing 130 mmHg as a floor to prevent acute kidney injury.",
      },
    ],
    ecosystemLinks: [
      {
        app: "NeuroRx",
        href: "#",
        label: "Nicardipine & Labetalol Infusion Protocol",
        badge: "Dosing",
        description: "Stepwise titration increments and continuous blood pressure control guidelines.",
      },
      {
        app: "NeuroCalc",
        href: "#",
        label: "ICH Score Calculator",
        badge: "Prognostication",
        description: "30-day mortality risk stratification based on GCS, hematoma volume, and IVH.",
      },
    ],
  },
  {
    id: "status-epilepticus-rse",
    title: "Management of Refractory and Super-Refractory Status Epilepticus",
    subspecialty: "Epilepsy",
    summary:
      "Stage 2 and Stage 3 treatment protocols when seizures persist beyond 20–30 minutes despite adequate first-line Benzodiazepines and second-line non-sedating IV antiseizure medications.",
    keyTags: ["Status Epilepticus", "RSE", "NORSE", "cEEG", "Midazolam Infusion", "Propofol", "ESETT"],
    statusBadge: "ESTABLISHED",
    hasConfAlert: true,
    confAlertText: "AES session highlighted early adjunctive Ketamine and urgent continuous EEG monitoring.",
    aiSynthesisAppraisal: {
      consensusLevel: "HIGH_CONCORDANCE",
      whyGuidelinesDiffer:
        "ILAE, NCS, and AAN endorse a structured 3-phase algorithm: Stage 1 (0–10 min: IV Lorazepam/Midazolam), Stage 2 (10–30 min: high-dose Levetiracetam, Valproate, or Fosphenytoin per ESETT trial), Stage 3 (>30 min: intubation with continuous Midazolam/Propofol anesthesia aiming for burst-suppression on cEEG).",
      clinicalBottomLine:
        "When status epilepticus enters the refractory phase, immediately initiate airway protection, anesthetic infusion, and continuous EEG monitoring to achieve electrographic cessation or burst suppression for 24–48 hours.",
      resourceDependency: "Specialized Center Only",
      lastAppraisedAt: "2026-01-25",
    },
    ecosystemLinks: [
      {
        app: "NeuroRx",
        href: "#",
        label: "Second-Line IV ASM Weight-Based Dosing",
        badge: "ESETT Protocol",
        description: "Levetiracetam 60 mg/kg (max 4.5g), Valproate 40 mg/kg (max 3g).",
      },
    ],
  },
  {
    id: "dementia-amyloid-monoclonal",
    title: "Anti-Amyloid Monoclonal Antibodies and ARIA Safety Monitoring in Early Alzheimer's Disease",
    subspecialty: "Dementia",
    summary:
      "Appropriate patient selection criteria based on confirmed amyloid/tau biomarkers and standardized MRI surveillance protocols for amyloid-related imaging abnormalities (ARIA-E edema, ARIA-H microhemorrhages).",
    keyTags: ["Alzheimer", "Lecanemab", "Donanemab", "ARIA-E", "ARIA-H", "p-Tau217", "ApoE4"],
    statusBadge: "NEW",
    hasConfAlert: true,
    confAlertText: "Real-world registry data presented at AAIC demonstrated safety of streamlined MRI surveillance.",
    aiSynthesisAppraisal: {
      consensusLevel: "MODERATE_VARIATION",
      whyGuidelinesDiffer:
        "AAN and international working groups recommend therapy for confirmed MCI or mild dementia due to AD with elevated amyloid. Variations exist regarding ApoE ε4 homozygous risk stratification and mandated MRI surveillance intervals (weeks 5, 9, 14 for Lecanemab).",
      clinicalBottomLine:
        "Mandatory ApoE ε4 genotyping before therapy initiation for shared decision-making. Strict scheduled brain MRI surveillance is required to detect asymptomatic ARIA prior to continuing dose escalation.",
      resourceDependency: "Specialized Center Only",
      lastAppraisedAt: "2026-03-01",
    },
  },
  {
    id: "myasthenia-gravis-refractory",
    title: "Targeted Biologics (FcRn Antagonists and Complement Inhibitors) in Generalized Myasthenia Gravis",
    subspecialty: "Neuromuscular",
    summary:
      "Role of targeted biologics (Efgartigimod, Ravulizumab, Zilucoplan) compared to conventional broad immunosuppressants and plasma exchange in AChR-Ab-positive refractory generalized Myasthenia Gravis.",
    keyTags: ["Myasthenia Gravis", "Efgartigimod", "FcRn", "Complement Inhibitor", "MG-ADL", "AChR-Ab"],
    statusBadge: "PRACTICE_CHANGING",
    hasConfAlert: false,
    aiSynthesisAppraisal: {
      consensusLevel: "HIGH_CONCORDANCE",
      whyGuidelinesDiffer:
        "Pivotal phase 3 trials (ADAPT, CHAMPION-MG, RAISE) demonstrated rapid, sustained clinical improvement on MG-ADL scores without corticosteroid-associated toxicity. Both AAN and EAN have incorporated these agents as targeted second-line therapies.",
      clinicalBottomLine:
        "In patients with acetylcholine receptor antibody-positive generalized MG unresponsive to first-line corticosteroids and non-steroidal immunosuppressants, FcRn antagonists (Efgartigimod) or C5 complement inhibitors are strongly indicated.",
      resourceDependency: "Specialized Center Only",
      lastAppraisedAt: "2026-02-12",
    },
  },
  {
    id: "cns-bacterial-meningitis",
    title: "Empirical Antimicrobial Therapy and Early Dexamethasone in Community-Acquired Acute Bacterial Meningitis",
    subspecialty: "CNS Infections",
    summary:
      "Optimal timing of adjunctive corticosteroid administration (prior to or with the first dose of antibiotics) and high-dose empirical antimicrobial coverage for Ceftriaxone-resistant S. pneumoniae and N. meningitidis.",
    keyTags: ["Bacterial Meningitis", "Dexamethasone", "Ceftriaxone", "Vancomycin", "S. pneumoniae"],
    statusBadge: "ESTABLISHED",
    hasConfAlert: false,
    aiSynthesisAppraisal: {
      consensusLevel: "HIGH_CONCORDANCE",
      whyGuidelinesDiffer:
        "IDSA, ESCMID, and national guidelines unanimously mandate that Dexamethasone (10 mg IV) must be given BEFORE or WITH the first antibiotic dose. Dexamethasone reduces hearing loss and unfavorable neurological outcomes in pneumococcal meningitis; discontinue if non-pneumococcal.",
      clinicalBottomLine:
        "Never delay empirical antibiotics for diagnostic lumbar puncture or imaging in patients with altered sensorium. Administer Dexamethasone 10 mg IV immediately along with Ceftriaxone 2g IV + Vancomycin 15–20 mg/kg.",
      resourceDependency: "Standard Care",
      lastAppraisedAt: "2026-01-18",
    },
  },
];

export const MOCK_GUIDELINE_DOCS: GuidelineDoc[] = [
  {
    id: "aha-ais-2026",
    society: "AHA/ASA",
    year: 2026,
    title: "2026 Guidelines for the Early Management of Patients with Acute Ischemic Stroke",
    officialUrl: "https://www.ahajournals.org/doi/10.1161/STR.0000000000000513",
    journalTarget: "Stroke",
    documentType: "Clinical Practice Guideline",
    publishDate: "2026-01-22",
    previousVersionYear: 2019,
    executiveSummary:
      "Comprehensive AHA/ASA practice-changing update replacing the 2018/2019 guidelines (DOI: 10.1161/STR.0000000000000513), establishing pivotal recommendations for Tenecteplase, expanded large-core EVT up to 24h, basilar artery occlusions, prehospital mobile stroke units, pediatric stroke pathways, and strict post-reperfusion blood pressure safety.",
    linkedScenarioIds: ["ais-ivt-tenecteplase-4.5h", "ais-large-core-evt-aspects-3-5"],
    allPracticeChanges: [
      {
        id: "chg-aha-1",
        scenarioId: "ais-ivt-tenecteplase-4.5h",
        category: "Reperfusion / IVT",
        topic: "Tenecteplase as Frontline Alternative to Alteplase < 4.5h",
        changeType: "UPGRADED",
        previousGrade: "Class IIb, Level B-R",
        currentGrade: "Class I, Level A",
        previousText: "Tenecteplase may be considered as a reasonable alternative for patients eligible for mechanical thrombectomy.",
        currentText:
          "Tenecteplase (0.25 mg/kg, maximum 25 mg single IV bolus) is recommended as a safe and effective alternative to Alteplase (0.9 mg/kg) for all acute ischemic stroke patients presenting within 4.5 hours of symptom onset.",
        drivingTrials: ["AcT (Lancet 2022)", "TRACE-2 (Lancet 2023)", "ORIGINAL (Stroke 2024)", "ATTEST-2 (Lancet Neurol 2024)"],
      },
      {
        id: "chg-aha-2",
        scenarioId: "ais-large-core-evt-aspects-3-5",
        category: "Neurointervention / EVT",
        topic: "Endovascular Thrombectomy in Large Ischemic Core (ASPECTS 3–5)",
        changeType: "UPGRADED",
        previousGrade: "Class IIb, Level B-R (Uncertain efficacy)",
        currentGrade: "Class I, Level A",
        previousText: "The effectiveness of mechanical thrombectomy in patients with ASPECTS < 6 remains uncertain.",
        currentText:
          "For patients with acute ischemic stroke due to anterior circulation LVO (ICA or MCA-M1) and extensive baseline ischemic changes (ASPECTS 3–5 on NCCT/MRI or CTP core volume ≥50 mL) within 0–24 hours, mechanical thrombectomy combined with medical management is strongly recommended.",
        drivingTrials: ["SELECT2 (NEJM 2023)", "ANGEL-ASPECT (NEJM 2023)", "TENSION (Lancet 2023)", "TESLA (JAMA 2024)", "LASTE (NEJM 2024)"],
      },
      {
        id: "chg-aha-3",
        category: "Neurointervention / EVT",
        topic: "Mechanical Thrombectomy for Basilar Artery Occlusion (BAO) up to 24 Hours",
        changeType: "UPGRADED",
        previousGrade: "Class IIb, Level C-LD",
        currentGrade: "Class I, Level A",
        previousText: "Mechanical thrombectomy may be reasonable for carefully selected patients with basilar artery occlusion within 6 to 24 hours.",
        currentText:
          "For patients with acute ischemic stroke caused by basilar artery occlusion presenting within 0–24 hours, endovascular thrombectomy combined with medical management is recommended over medical therapy alone to reduce mortality and improve functional independence.",
        drivingTrials: ["ATTENTION (NEJM 2022)", "BAOCHE (NEJM 2022)"],
      },
      {
        id: "chg-aha-4",
        category: "Reperfusion Eligibility",
        topic: "Removal of Arbitrary Chronological Age Caps for Reperfusion",
        changeType: "REVISED",
        previousGrade: "Class IIa, Level B-R (Deterred for octogenarians in extended windows)",
        currentGrade: "Class I, Level B-NR",
        previousText: "Age >80 years was a relative exclusion or cautionary factor in several extended window clinical trials.",
        currentText:
          "Chronological age alone should not be used as an exclusion criterion for IV thrombolysis or endovascular thrombectomy. Eligible elderly patients (including those >80 years) experience substantial net clinical benefit from reperfusion therapy based on tissue perfusion mismatch.",
        drivingTrials: ["HERMES Meta-analysis", "DEFUSE 3 / DAWN Elderly Substudies"],
      },
      {
        id: "chg-aha-5",
        category: "Secondary Prevention",
        topic: "Dual Antiplatelet Therapy (DAPT) in Non-disabling Stroke / High-Risk TIA",
        changeType: "REVISED",
        previousGrade: "Class I, Level A (21 to 90 days)",
        currentGrade: "Class I, Level A (Strictly 21 Days, then Monotherapy)",
        previousText: "DAPT Aspirin plus Clopidogrel should begin within 24 hours and continue for 21 to 90 days.",
        currentText:
          "For patients with non-disabling minor acute ischemic stroke (NIHSS ≤3) or high-risk TIA (ABCD2 score ≥4) who do not receive IV thrombolysis, dual antiplatelet therapy (Aspirin + Clopidogrel) should be initiated within 24 hours and continued strictly for 21 days, followed by single antiplatelet monotherapy to avoid excess major bleeding.",
        drivingTrials: ["CHANCE (NEJM 2013)", "POINT (NEJM 2018)", "THALES (NEJM 2020)"],
      },
      {
        id: "chg-aha-6",
        category: "Secondary Prevention",
        topic: "Extended Window DAPT (up to 72h) & Ticagrelor for CYP2C19 Loss-of-Function",
        changeType: "NEW",
        previousGrade: "Not Addressed",
        currentGrade: "Class IIa, Level B-R",
        currentText:
          "In patients with mild ischemic stroke or high-risk TIA of atherosclerotic origin presenting within 24–72 hours of symptom onset, DAPT (Aspirin + Clopidogrel) initiated within 72 hours improves 90-day functional outcome. Furthermore, Ticagrelor plus Aspirin is recommended as an effective alternative in patients with CYP2C19 loss-of-function alleles.",
        drivingTrials: ["INSPIRES (NEJM 2024)", "CHANCE-2 (NEJM 2021)"],
      },
      {
        id: "chg-aha-7",
        category: "Secondary Prevention",
        topic: "Early Direct Oral Anticoagulant (DOAC) Initiation in Atrial Fibrillation",
        changeType: "NEW",
        previousGrade: "Class IIa, Level B-NR (Historically 3-14 days delay)",
        currentGrade: "Class IIa, Level B-R (Early Start: 48h to 4 Days)",
        previousText: "Anticoagulation for secondary stroke prevention in atrial fibrillation was delayed up to 14 days following moderate-to-severe infarction due to feared hemorrhagic transformation.",
        currentText:
          "Early initiation of DOACs (within 48 hours to 4 days of onset) is safe and reasonable in patients with non-valvular atrial fibrillation presenting with mild-to-moderate acute ischemic stroke, without increasing symptomatic intracranial hemorrhage compared to delayed initiation.",
        drivingTrials: ["TIMING (Circulation 2022)", "ELAN (NEJM 2023)", "OPTIMAS (Lancet 2024)"],
      },
      {
        id: "chg-aha-8",
        category: "Blood Pressure",
        topic: "Avoidance of Intensive Blood Pressure Lowering (<140 mmHg) Post-Reperfusion",
        changeType: "NEW",
        previousGrade: "Class IIa (Historical preference for SBP <140 mmHg post-recanalization)",
        currentGrade: "Class III: Harm, Level B-R",
        previousText: "Lowering SBP to <140 mmHg post-successful recanalization was widely practiced to prevent reperfusion injury.",
        currentText:
          "In patients who achieve successful recanalization (eTICI 2b–3) following endovascular thrombectomy, intensive blood pressure lowering targeting SBP <140 mmHg (or <120 mmHg) is NOT recommended and may lead to cerebral hypoperfusion, infarct extension, and worse functional outcomes.",
        drivingTrials: ["OPTIMAL-BP (JAMA 2023)", "ENCHANTED2/MT (Lancet 2022)"],
      },
      {
        id: "chg-aha-9",
        category: "In-Hospital Medical Management",
        topic: "Avoidance of Intensive Glycemic Control (Tight Target 80–130 mg/dL)",
        changeType: "REVISED",
        previousGrade: "Class IIa, Level B-R",
        currentGrade: "Class III: Harm, Level B-R (Standard Target 140–180 mg/dL)",
        previousText: "Aggressive glycemic normalization with continuous IV insulin was frequently utilized in acute stroke units.",
        currentText:
          "Intensive glucose lowering targeting tight normoglycemia (80–130 mg/dL) using continuous IV insulin infusions should be avoided because it substantially increases the incidence of severe hypoglycemia without improving 90-day clinical outcomes. Blood glucose should be maintained in the range of 140–180 mg/dL.",
        drivingTrials: ["SHINE (JAMA 2019)"],
      },
      {
        id: "chg-aha-10",
        category: "Pediatric Stroke",
        topic: "First-Time Standardized Pediatric Acute Ischemic Stroke Pathway",
        changeType: "NEW",
        previousGrade: "Not Included in Adult Guidelines",
        currentGrade: "Class I / Class IIb, Level C-LD",
        currentText:
          "For the first time, comprehensive dedicated emergency management protocols are established for pediatric acute ischemic stroke: urgent vascular imaging (CTA or MRA) is recommended; weight-adjusted IV thrombolysis (0.9 mg/kg Alteplase) may be considered in adolescents; and mechanical thrombectomy is reasonable in children aged ≥6 years with proximal anterior circulation LVO and persistent neurological deficit.",
        drivingTrials: ["Save ChildS Registry", "Thrombolysis in Pediatric Stroke (TIPS) Cohort"],
      },
      {
        id: "chg-aha-11",
        category: "Prehospital Systems",
        topic: "Mobile Stroke Units (MSUs) and Prehospital Telestroke Triage",
        changeType: "UPGRADED",
        previousGrade: "Class IIb, Level B-R",
        currentGrade: "Class IIa, Level B-R",
        previousText: "Mobile stroke units were considered experimental research vehicles with uncertain clinical cost-effectiveness.",
        currentText:
          "In regional stroke systems with deployed Mobile Stroke Units (ambulances equipped with point-of-care CT, point-of-care lab, and telestroke connectivity), MSU dispatch is recommended to expedite prehospital thrombolysis and streamline direct triage to thrombectomy-capable centers.",
        drivingTrials: ["BEST-MSU (NEJM 2021)", "B-PROUD (JAMA 2021)"],
      },
    ],
  },
  {
    id: "eso-ais-2024",
    society: "ESO",
    year: 2024,
    title: "European Stroke Organisation (ESO) Expedited Recommendation on Intravenous Thrombolysis and Thrombectomy",
    officialUrl: "https://journals.sagepub.com/home/eso",
    journalTarget: "Eur Stroke J",
    documentType: "Focused Update",
    publishDate: "2024-05-18",
    previousVersionYear: 2021,
    executiveSummary:
      "Rapid evidence update establishing Tenecteplase 0.25 mg/kg as the preferred thrombolytic agent and formally endorsing endovascular thrombectomy for large ischemic core infarctions based on GRADE methodology.",
    linkedScenarioIds: ["ais-ivt-tenecteplase-4.5h", "ais-large-core-evt-aspects-3-5"],
    allPracticeChanges: [
      {
        id: "chg-eso-1",
        scenarioId: "ais-ivt-tenecteplase-4.5h",
        category: "Reperfusion",
        topic: "Strong Recommendation for Tenecteplase 0.25 mg/kg",
        changeType: "UPGRADED",
        previousGrade: "Weak recommendation, Moderate quality",
        currentGrade: "Strong recommendation FOR, High quality",
        previousText: "Tenecteplase may be considered in specialized centers or for patients awaiting mechanical thrombectomy.",
        currentText:
          "In patients with acute ischemic stroke of <4.5 hours duration eligible for IV thrombolysis, we strongly recommend Tenecteplase 0.25 mg/kg (maximum 25 mg) over Alteplase 0.9 mg/kg.",
        drivingTrials: ["AcT", "TRACE-2", "NOR-TEST 2A"],
      },
      {
        id: "chg-eso-2",
        scenarioId: "ais-large-core-evt-aspects-3-5",
        category: "Reperfusion",
        topic: "Endovascular Thrombectomy in Large Ischemic Core",
        changeType: "UPGRADED",
        previousGrade: "Expert Consensus Statement",
        currentGrade: "Strong recommendation FOR, High quality",
        currentText:
          "In patients with acute ischemic stroke due to anterior circulation LVO and large core infarction (ASPECTS 3–5 or core volume ≥50 mL), we strongly recommend mechanical thrombectomy plus medical care over medical care alone.",
        drivingTrials: ["SELECT2", "ANGEL-ASPECT", "TENSION", "LASTE"],
      },
    ],
  },
  {
    id: "aha-ich-2022",
    society: "AHA/ASA",
    year: 2022,
    title: "2022 Guideline for the Management of Patients with Spontaneous Intracerebral Hemorrhage",
    officialUrl: "https://www.ahajournals.org/doi/10.1161/STR.0000000000000407",
    journalTarget: "Stroke",
    documentType: "Clinical Practice Guideline",
    publishDate: "2022-05-17",
    previousVersionYear: 2015,
    executiveSummary:
      "Comprehensive AHA/ASA clinical recommendations on acute blood pressure management, hematoma expansion limitation, reversal of anticoagulants, and minimally invasive surgical clot evacuation.",
    linkedScenarioIds: ["ich-acute-bp-lowering"],
    allPracticeChanges: [
      {
        id: "chg-aha-ich-1",
        scenarioId: "ich-acute-bp-lowering",
        category: "Blood Pressure",
        topic: "Target SBP 130-140 mmHg and Avoidance of Acute Hypotension",
        changeType: "REVISED",
        previousGrade: "Class I, Level A (Target SBP <140 mmHg)",
        currentGrade: "Class IIa, Level B-R (Target SBP 130-140 mmHg, avoid <130)",
        currentText:
          "In patients with acute spontaneous ICH presenting with SBP >150 mmHg, rapid and smooth lowering to a target SBP of 130–140 mmHg is safe and reasonable, but acute SBP reduction <130 mmHg should be avoided.",
        drivingTrials: ["INTERACT2 (NEJM 2013)", "ATACH-2 (NEJM 2016)"],
      },
    ],
  },
  {
    id: "eso-ich-2021",
    society: "ESO",
    year: 2021,
    title: "European Stroke Organisation (ESO) Guidelines for the Management of Spontaneous Intracerebral Hemorrhage",
    officialUrl: "https://journals.sagepub.com/doi/10.1177/23969873211046474",
    journalTarget: "Eur Stroke J",
    documentType: "Clinical Practice Guideline",
    publishDate: "2021-10-01",
    executiveSummary:
      "European clinical practice guideline addressing hyperacute blood pressure lowering, hemostatic therapies, neurointensive care bundle, and secondary stroke prevention.",
    linkedScenarioIds: ["ich-acute-bp-lowering"],
    allPracticeChanges: [
      {
        id: "chg-eso-ich-1",
        scenarioId: "ich-acute-bp-lowering",
        category: "Blood Pressure",
        topic: "Acute SBP Lowering Thresholds",
        changeType: "REVISED",
        currentGrade: "Weak recommendation FOR, Moderate quality",
        currentText:
          "For patients with acute spontaneous ICH within 24 hours of onset, we suggest acute blood pressure lowering to SBP <140 mmHg (while avoiding SBP <130 mmHg).",
        drivingTrials: ["INTERACT2", "ATACH-2 Meta-analysis"],
      },
    ],
  },
  {
    id: "vn-moh-stroke-2025",
    society: "VN-MOH",
    year: 2025,
    title: "Hướng dẫn Chẩn đoán và Điều trị Đột quỵ Não - Bộ Y tế & Hội Đột quỵ Việt Nam",
    officialUrl: "https://kcb.vn",
    journalTarget: "BYT / VNSO",
    documentType: "Clinical Practice Guideline",
    publishDate: "2025-08-20",
    executiveSummary:
      "Văn bản pháp quy chuẩn hóa thực hành đột quỵ tại các bệnh viện Việt Nam: Đưa Tenecteplase vào danh mục thanh toán bảo hiểm y tế cho chỉ định nhồi máu não cấp và chuẩn hóa quy trình can thiệp lấy huyết khối mạch não.",
    linkedScenarioIds: ["ais-ivt-tenecteplase-4.5h", "ais-large-core-evt-aspects-3-5"],
    allPracticeChanges: [
      {
        id: "chg-vn-1",
        scenarioId: "ais-ivt-tenecteplase-4.5h",
        category: "Tiêu sợi huyết",
        topic: "Phê duyệt Tenecteplase trong thực hành lâm sàng",
        changeType: "NEW",
        currentGrade: "Khuyến cáo Áp dụng (Tương đương Class I)",
        currentText:
          "Chấp thuận Tenecteplase 0.25 mg/kg (tối đa 25mg) bolus tĩnh mạch như thuốc tiêu sợi huyết chuẩn tại các trung tâm và đơn vị đột quỵ trên toàn quốc, đặc biệt ưu tiên chuyển tuyến can thiệp.",
      },
    ],
  },
];

export const MOCK_RECOMMENDATION_ATOMS: RecommendationAtom[] = [
  // Scenario 1: ais-ivt-tenecteplase-4.5h
  {
    id: "rec-aha-2026-tnk",
    scenarioId: "ais-ivt-tenecteplase-4.5h",
    guidelineDocId: "aha-ais-2026",
    society: "AHA/ASA",
    year: 2026,
    originalGrade: "Class I, Level of Evidence A",
    normalizedTier: 1,
    recommendationText:
      "Tenecteplase (0.25 mg/kg single bolus, maximum 25 mg) is recommended as a safe and effective alternative to Alteplase for eligible patients with acute ischemic stroke within 4.5 hours of onset.",
    eligibilityCriteria: "Onset <4.5h, exclusion of intracranial hemorrhage on CT/MRI, SBP <185/110 mmHg, INR ≤1.7.",
    citedTrials: ["AcT (Lancet 2022)", "TRACE-2 (Lancet 2023)", "ORIGINAL (Stroke 2024)"],
    isLatestForSociety: true,
    notes: "Administered as a single 5-10 second IV bolus, significantly reducing door-to-needle time by 15-20 minutes compared to Alteplase.",
  },
  {
    id: "rec-eso-2024-tnk",
    scenarioId: "ais-ivt-tenecteplase-4.5h",
    guidelineDocId: "eso-ais-2024",
    society: "ESO",
    year: 2024,
    originalGrade: "Strong recommendation FOR, High quality evidence",
    normalizedTier: 1,
    recommendationText:
      "ESO strongly recommends Tenecteplase 0.25 mg/kg (maximum 25 mg) over Alteplase 0.9 mg/kg in patients with acute ischemic stroke presenting within 4.5 hours.",
    eligibilityCriteria: "Applies to both small branch occlusions and large vessel occlusions eligible for mechanical thrombectomy.",
    citedTrials: ["AcT", "TRACE-2", "NOR-TEST 2A"],
    isLatestForSociety: true,
    notes: "Highest tier recommendation within the European GRADE framework.",
  },
  {
    id: "rec-vn-2025-tnk",
    scenarioId: "ais-ivt-tenecteplase-4.5h",
    guidelineDocId: "vn-moh-stroke-2025",
    society: "VN-MOH",
    year: 2025,
    originalGrade: "Khuyến cáo Áp dụng Thực hành (Mức độ A)",
    normalizedTier: 1,
    recommendationText:
      "Bộ Y tế & Hội Đột quỵ Việt Nam thống nhất khuyến cáo sử dụng Tenecteplase 0.25 mg/kg (tối đa 25mg) bolus tĩnh mạch 5 giây, ưu tiên áp dụng tại các cơ sở chuyển viện can thiệp (Drip and Ship).",
    eligibilityCriteria: "Tuân thủ bảng kiểm an toàn tiêu sợi huyết quốc gia của Bộ Y tế.",
    citedTrials: ["AcT", "TRACE-2", "Dữ liệu đa trung tâm Việt Nam"],
    isLatestForSociety: true,
    notes: "Đã có trong danh mục hướng dẫn điều trị chuẩn tại các bệnh viện tuyến tỉnh và trung ương, được BHYT chi trả.",
  },

  // Scenario 2: ais-large-core-evt-aspects-3-5
  {
    id: "rec-aha-2026-largecore",
    scenarioId: "ais-large-core-evt-aspects-3-5",
    guidelineDocId: "aha-ais-2026",
    society: "AHA/ASA",
    year: 2026,
    originalGrade: "Class I, Level of Evidence A",
    normalizedTier: 1,
    recommendationText:
      "Endovascular thrombectomy combined with medical management is strongly recommended for patients with ICA or MCA-M1 occlusion presenting with ASPECTS 3–5 or core volume ≥50 mL within 24 hours.",
    eligibilityCriteria: "ASPECTS 3–5 on NCCT or MRI DWI; baseline mRS 0–1; absence of intracranial hemorrhage.",
    citedTrials: ["SELECT2 (NEJM 2023)", "ANGEL-ASPECT (NEJM 2023)", "TENSION (Lancet 2023)"],
    isLatestForSociety: true,
    notes: "Number needed to treat (NNT) for functional independence is approximately 5 to 6.",
  },
  {
    id: "rec-eso-2024-largecore",
    scenarioId: "ais-large-core-evt-aspects-3-5",
    guidelineDocId: "eso-ais-2024",
    society: "ESO",
    year: 2024,
    originalGrade: "Strong recommendation FOR, High quality evidence",
    normalizedTier: 1,
    recommendationText:
      "We strongly recommend mechanical thrombectomy in patients with acute ischemic stroke and large infarct core (ASPECTS 3–5 or volume ≥50 mL) within 24 hours.",
    eligibilityCriteria: "Proximal anterior circulation occlusion (ICA or M1/M2), age ≥18.",
    citedTrials: ["SELECT2", "ANGEL-ASPECT", "TENSION", "LASTE"],
    isLatestForSociety: true,
    notes: "Clinicians should not withhold thrombectomy solely on the basis of large core imaging in early arrivers.",
  },
  {
    id: "rec-vn-2025-largecore",
    scenarioId: "ais-large-core-evt-aspects-3-5",
    guidelineDocId: "vn-moh-stroke-2025",
    society: "VN-MOH",
    year: 2025,
    originalGrade: "Khuyến cáo Thực hiện (Mức độ A)",
    normalizedTier: 1,
    recommendationText:
      "Khuyến cáo thực hiện can thiệp lấy huyết khối cơ học tại các trung tâm đột quỵ có năng lực hồi sức thần kinh cho bệnh nhân có ASPECTS 3–5.",
    eligibilityCriteria: "Được đánh giá cẩn thận nguy cơ xuất huyết chuyển dạng, kiểm soát huyết áp chặt sau can thiệp.",
    citedTrials: ["SELECT2", "TENSION", "Kinh nghiệm lâm sàng Bệnh viện Bạch Mai, Chợ Rẫy, 115"],
    isLatestForSociety: true,
    notes: "Cần theo dõi sát phù não ác tính trong 72 giờ đầu sau can thiệp.",
  },

  // Scenario 3: ich-acute-bp-lowering
  {
    id: "rec-aha-2022-ich-bp",
    scenarioId: "ich-acute-bp-lowering",
    guidelineDocId: "aha-ich-2022",
    society: "AHA/ASA",
    year: 2022,
    originalGrade: "Class IIa, Level of Evidence B-R",
    normalizedTier: 2,
    recommendationText:
      "In patients with acute spontaneous ICH presenting with SBP between 150 and 220 mmHg, acute lowering to a target SBP of 130–140 mmHg within hours is safe and reasonable to improve functional outcomes.",
    eligibilityCriteria: "Onset <6h; avoid acute SBP lowering >60 mmHg within 1 hour or lowering SBP below 130 mmHg.",
    citedTrials: ["INTERACT2 (NEJM 2013)", "ATACH-2 (NEJM 2016)"],
    isLatestForSociety: true,
    notes: "Continuous IV infusions such as Nicardipine are preferred for predictable titration.",
  },
  {
    id: "rec-eso-2021-ich-bp",
    scenarioId: "ich-acute-bp-lowering",
    guidelineDocId: "eso-ich-2021",
    society: "ESO",
    year: 2021,
    originalGrade: "Weak recommendation FOR, Moderate quality",
    normalizedTier: 2,
    recommendationText:
      "Lower systolic blood pressure below 140 mmHg (while avoiding SBP <130 mmHg) within the first 24 hours of spontaneous ICH onset.",
    eligibilityCriteria: "Absence of impending brain herniation or massive intracranial pressure crisis.",
    citedTrials: ["INTERACT2", "ATACH-2 Meta-analysis"],
    isLatestForSociety: true,
  },
  {
    id: "rec-vn-2025-ich-bp",
    scenarioId: "ich-acute-bp-lowering",
    guidelineDocId: "vn-moh-stroke-2025",
    society: "VN-MOH",
    year: 2025,
    originalGrade: "Khuyến cáo Áp dụng (Mức độ IIa)",
    normalizedTier: 2,
    recommendationText:
      "Hạ huyết áp tâm thu nhanh chóng đạt mục tiêu 130–140 mmHg trong 1–2 giờ đầu bằng Nicardipine truyền tĩnh mạch và duy trì ổn định.",
    eligibilityCriteria: "Theo dõi huyết áp động mạch xâm lấn hoặc đo tự động mỗi 5-15 phút.",
    citedTrials: ["INTERACT2", "Phác đồ Bộ Y tế"],
    isLatestForSociety: true,
  },
];

export const MOCK_CONFERENCE_EVENTS: ConferenceEvent[] = [
  {
    id: "conf-esoc-2026",
    acronym: "ESOC 2026",
    name: "12th European Stroke Organisation Conference",
    subspecialties: ["Stroke"],
    dates: "May 20–22, 2026",
    location: "Munich, Germany",
    status: "LIVE",
    officialUrl: "https://esocstroke.org",
    executiveSummary:
      "Europe's premier stroke conference bringing together over 4,500 clinicians. Key focuses include mechanical thrombectomy in extreme ischemic cores, minimally invasive surgical evacuation for ICH, and next-generation Factor XIa inhibitors.",
    stats: {
      totalLateBreakingTrials: 14,
      positiveTrials: 9,
      practiceChangingCount: 5,
    },
    lateBreakingTrials: [
      {
        id: "trial-laste",
        trialAcronym: "LASTE",
        title: "Large Stroke Therapy Evaluation: Thrombectomy in Extremely Large Core Infarctions",
        studyDesign: "Phase 3 RCT",
        subspecialty: "Stroke",
        verdict: "POSITIVE",
        isPracticeChanging: true,
        publishedJournal: "NEJM",
        fullTextUrl: "https://www.nejm.org",
        populationSummary: "N = 333 patients with acute anterior circulation LVO and extremely low ASPECTS (0–2 on NCCT/MRI) or core volume >50 mL.",
        interventionGroup: "Mechanical thrombectomy plus best medical management.",
        controlGroup: "Best medical management alone.",
        primaryOutcome: "mRS 0–2 or significant functional recovery at 90 days: 38.2% vs 14.5% (RR 2.63; 95% CI 1.68–4.11; p < 0.001).",
        safetyOutcome: "Symptomatic intracranial hemorrhage (sICH): 4.8% vs 2.2% (p = 0.21); 90-day mortality: 36.1% vs 55.4% (p = 0.005).",
        bottomLineTakeaway:
          "Mechanical thrombectomy confers substantial functional benefit and significantly reduces mortality even in patients with massive infarct cores (ASPECTS 0–2), effectively removing absolute ASPECTS cutoffs.",
        impactedScenarioId: "ais-large-core-evt-aspects-3-5",
        guidelineImpactWarning:
          "Breakthrough evidence expected to expand guideline recommendations from ASPECTS 3–5 down to ASPECTS 0–2 in upcoming updates.",
      },
      {
        id: "trial-escape-mevo",
        trialAcronym: "ESCAPE-MeVO",
        title: "Endovascular Treatment to Improve Outcomes for Medium Vessel Occlusions",
        studyDesign: "Phase 3 RCT",
        subspecialty: "Stroke",
        verdict: "POSITIVE",
        isPracticeChanging: true,
        publishedJournal: "Lancet",
        populationSummary: "N = 530 patients with isolated medium and distal vessel occlusions (M2/M3, A2/A3, P2/P3) within 12 hours.",
        interventionGroup: "Thrombectomy using low-profile microcatheters and dedicated stent retrievers + medical therapy.",
        controlGroup: "Best medical management alone (including IVT when eligible).",
        primaryOutcome: "Excellent functional outcome (mRS 0–1) at 90 days: 51.4% vs 40.2% (aOR 1.61; 95% CI 1.15–2.26; p = 0.006).",
        safetyOutcome: "Vessel perforation: 1.9%; sICH: 3.1% vs 2.4% (p = 0.58).",
        bottomLineTakeaway:
          "Thrombectomy for medium vessel occlusions (MeVO) is safe and yields superior functional recovery when performed by experienced neurointerventionalists.",
        guidelineImpactWarning:
          "Provides first Level A randomized evidence for distal thrombectomy, previously categorized as Weak/Low Quality by ESO.",
      },
      {
        id: "trial-oceanic-stroke",
        trialAcronym: "OCEANIC-STROKE",
        title: "Asundexian (Factor XIa Inhibitor) for Secondary Prevention After Non-Cardioembolic Ischemic Stroke",
        studyDesign: "Phase 3 RCT",
        subspecialty: "Stroke",
        verdict: "NEUTRAL",
        isPracticeChanging: false,
        publishedJournal: "Stroke",
        populationSummary: "N = 9,300 patients with non-cardioembolic acute ischemic stroke.",
        interventionGroup: "Oral Asundexian 50 mg daily + standard antiplatelet therapy.",
        controlGroup: "Placebo + standard antiplatelet therapy.",
        primaryOutcome: "Recurrent ischemic stroke: 6.2% vs 6.8% (HR 0.91; 95% CI 0.78–1.06; p = 0.22 - Not Statistically Significant).",
        safetyOutcome: "ISTH Major Bleeding: Equivalent between arms (1.4% vs 1.3%).",
        bottomLineTakeaway:
          "Factor XIa inhibition demonstrated an excellent bleeding safety profile, but failed to show statistically significant superiority in preventing non-cardioembolic stroke recurrence on top of antiplatelets.",
      },
    ],
  },
  {
    id: "conf-isc-2026",
    acronym: "ISC 2026",
    name: "International Stroke Conference 2026",
    subspecialties: ["Stroke"],
    dates: "February 4–6, 2026",
    location: "Los Angeles, CA, USA",
    status: "RECENT",
    officialUrl: "https://professional.heart.org",
    executiveSummary:
      "AHA/ASA flagship international stroke meeting reporting long-term AcT follow-up, extended window thrombolysis trials (TIMELESS, TRACE-III), and minimally invasive endoscopic evacuation for intracerebral hemorrhage.",
    stats: {
      totalLateBreakingTrials: 18,
      positiveTrials: 11,
      practiceChangingCount: 4,
    },
    lateBreakingTrials: [
      {
        id: "trial-trace-3",
        trialAcronym: "TRACE-III",
        title: "Tenecteplase for Patients with Wake-Up or Late-Window Acute Ischemic Stroke",
        studyDesign: "Phase 3 RCT",
        subspecialty: "Stroke",
        verdict: "POSITIVE",
        isPracticeChanging: true,
        publishedJournal: "NEJM",
        populationSummary: "N = 516 patients with wake-up stroke or onset 4.5–24 hours with penumbral mismatch on perfusion imaging unable to access immediate thrombectomy.",
        interventionGroup: "Tenecteplase 0.25 mg/kg IV bolus.",
        controlGroup: "Standard medical care.",
        primaryOutcome: "mRS 0–1 at 90 days: 33.0% vs 24.2% (RR 1.37; p = 0.03).",
        safetyOutcome: "sICH: 3.0% vs 0.8% (p = 0.07); 90-day mortality equivalent.",
        bottomLineTakeaway:
          "Tenecteplase extends the therapeutic thrombolytic window up to 24 hours in patients with penumbral mismatch at facilities lacking immediate catheterization laboratory access.",
        impactedScenarioId: "ais-ivt-tenecteplase-4.5h",
        guidelineImpactWarning:
          "Pioneering late-window IV thrombolysis using Tenecteplase based on automated perfusion imaging.",
      },
    ],
  },
  {
    id: "conf-aan-2026",
    acronym: "AAN 2026",
    name: "American Academy of Neurology Annual Meeting",
    subspecialties: ["All Subspecialties", "Dementia", "Neuromuscular", "Epilepsy", "Movement Disorders"],
    dates: "April 18–24, 2026",
    location: "Chicago, IL, USA",
    status: "UPCOMING",
    officialUrl: "https://www.aan.com/conferences",
    executiveSummary:
      "The world's largest comprehensive neurology meeting, featuring Phase 3 trial updates in Alzheimer disease real-world safety, second-generation FcRn antagonists in generalized MG, and emerging gene therapies in neuromuscular disorders.",
    stats: {
      totalLateBreakingTrials: 22,
      positiveTrials: 15,
      practiceChangingCount: 7,
    },
    lateBreakingTrials: [
      {
        id: "trial-donanemab-realworld",
        trialAcronym: "TRAILBLAZER-EXT",
        title: "Real-World Multi-Center Registry of Donanemab and ARIA Management Protocol",
        studyDesign: "Prospective Registry",
        subspecialty: "Dementia",
        verdict: "POSITIVE",
        isPracticeChanging: true,
        publishedJournal: "Neurology",
        populationSummary: "N = 2,400 patients with early symptomatic Alzheimer's disease across 45 academic centers.",
        interventionGroup: "Monthly Donanemab with scheduled MRI surveillance aided by automated volumetric AI.",
        controlGroup: "Historical trial cohorts.",
        primaryOutcome: "Symptomatic ARIA-E incidence reduced by 42% via protocolized early detection on surveillance MRI.",
        safetyOutcome: "ARIA-related mortality: 0.08%.",
        bottomLineTakeaway:
          "Rigorous baseline ApoE ε4 genotyping combined with scheduled surveillance MRIs optimizes real-world safety during anti-amyloid monoclonal antibody therapy.",
        impactedScenarioId: "dementia-amyloid-monoclonal",
      },
    ],
  },
  {
    id: "conf-aaic-2026",
    acronym: "AAIC 2026",
    name: "Alzheimer's Association International Conference",
    subspecialties: ["Dementia"],
    dates: "July 26–30, 2026",
    location: "Toronto, Canada",
    status: "UPCOMING",
    officialUrl: "https://alz.org/aaic",
    executiveSummary:
      "Global dementia congress focusing on plasma p-Tau217 biomarker validation for outpatient early detection, secondary prevention trials, and amyloid clearance dynamics.",
    stats: {
      totalLateBreakingTrials: 16,
      positiveTrials: 12,
      practiceChangingCount: 6,
    },
    lateBreakingTrials: [],
  },
  {
    id: "conf-aes-2026",
    acronym: "AES 2026",
    name: "American Epilepsy Society Annual Meeting",
    subspecialties: ["Epilepsy", "Neurocritical Care"],
    dates: "December 4–8, 2026",
    location: "Orlando, FL, USA",
    status: "UPCOMING",
    officialUrl: "https://aesnet.org",
    executiveSummary:
      "Leading scientific meeting in epilepsy, highlighting status epilepticus neuroprotection trials, responsive neurostimulation (RNS) long-term outcomes, and novel ASM mechanisms.",
    stats: {
      totalLateBreakingTrials: 12,
      positiveTrials: 8,
      practiceChangingCount: 3,
    },
    lateBreakingTrials: [],
  },
];
