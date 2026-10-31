import type {
  ClinicalScenario,
  GuidelineDoc,
  RecommendationAtom,
  ConferenceEvent,
} from "../types/neuroguide.ts";

export const MOCK_CLINICAL_SCENARIOS: ClinicalScenario[] = [
  {
    "id": "ais-ivt-tenecteplase-4.5h",
    "title": "Tenecteplase vs. Alteplase for Acute Ischemic Stroke within 4.5 Hours",
    "subspecialty": "Stroke",
    "summary": "Indication for intravenous Tenecteplase (0.25 mg/kg single bolus, maximum 25 mg) as an effective and safe alternative to standard 1-hour Alteplase infusion in patients with acute ischemic stroke presenting within 4.5 hours of symptom onset.",
    "keyTags": [
      "Tenecteplase",
      "TNK-tPA",
      "Alteplase",
      "IV Thrombolysis",
      "Door-to-Needle",
      "AcT",
      "TRACE-2"
    ],
    "statusBadge": "PRACTICE_CHANGING",
    "hasConfAlert": true,
    "confAlertText": "Long-term data from AcT and ATTEST-2 confirm non-inferior functional outcomes and comparable safety.",
    "aiSynthesisAppraisal": {
      "consensusLevel": "HIGH_CONCORDANCE",
      "whyGuidelinesDiffer": "ESO (2024 Expedited Update) and updated AHA/ASA (2026) both recommend Tenecteplase 0.25 mg/kg as equal or preferable to Alteplase due to the rapid 5-second bolus delivery, especially advantageous for 'drip-and-ship' transfers. Earlier AHA 2019 guidelines carried a Class IIb recommendation prior to completion of pivotal non-inferiority phase 3 RCTs.",
      "clinicalBottomLine": "Tenecteplase 0.25 mg/kg (maximum 25 mg) administered as a single IV bolus over 5–10 seconds is a proven, safe, and pragmatic alternative to Alteplase for all patients eligible for intravenous thrombolysis within 4.5 hours.",
      "resourceDependency": "Standard Care",
      "lastAppraisedAt": "2026-03-15"
    },
    "temporalEvolution": [
      {
        "society": "AHA/ASA",
        "previousYear": 2019,
        "previousGrade": "Class IIb, Level B-R (Selective consideration)",
        "currentYear": 2026,
        "currentGrade": "Class I, Level A (Recommended alternative)",
        "shiftDirection": "UPGRADED",
        "drivingTrials": [
          "AcT (Lancet 2022)",
          "TRACE-2 (Lancet 2023)",
          "ORIGINAL (Stroke 2024)"
        ],
        "evolutionNarrative": "Upgraded from a selective option prior to mechanical thrombectomy to a frontline Class I recommendation for all IVT-eligible stroke patients."
      },
      {
        "society": "ESO",
        "previousYear": 2021,
        "previousGrade": "Weak recommendation, Moderate quality",
        "currentYear": 2024,
        "currentGrade": "Strong recommendation FOR, High quality",
        "shiftDirection": "UPGRADED",
        "drivingTrials": [
          "AcT",
          "NOR-TEST 2A",
          "ATTEST-2"
        ],
        "evolutionNarrative": "ESO Living Guidelines established high-certainty evidence endorsing Tenecteplase 0.25 mg/kg over Alteplase 0.9 mg/kg."
      }
    ],
    "ecosystemLinks": [
      {
        "app": "NeuroRx",
        "href": "#",
        "label": "Calculate TNK Dose by Weight",
        "badge": "0.25 mg/kg",
        "description": "Automatic bolus calculation with strict 25 mg ceiling and reconstitution guidelines."
      },
      {
        "app": "NeuroCalc",
        "href": "#",
        "label": "NIHSS Scoring Calculator",
        "badge": "IVT Eligibility",
        "description": "Quantify stroke neurological deficits pre- and post-thrombolytic administration."
      }
    ]
  },
  {
    "id": "ais-large-core-evt-aspects-3-5",
    "title": "Endovascular Thrombectomy for Acute Ischemic Stroke with Large Ischemic Core (ASPECTS 3–5)",
    "subspecialty": "Stroke",
    "summary": "Indication for mechanical thrombectomy in anterior circulation large vessel occlusion (ICA or MCA-M1) presenting with extensive baseline ischemic injury (ASPECTS 3–5 on NCCT/MRI or CTP ischemic core volume ≥50 mL) within 24 hours.",
    "keyTags": [
      "Large Core",
      "ASPECTS 3-5",
      "EVT",
      "Thrombectomy",
      "SELECT2",
      "TENSION",
      "LASTE"
    ],
    "statusBadge": "UPGRADED",
    "hasConfAlert": true,
    "confAlertText": "LASTE trial reported at ESOC extended thrombectomy benefit down to ASPECTS 0–2.",
    "aiSynthesisAppraisal": {
      "consensusLevel": "HIGH_CONCORDANCE",
      "whyGuidelinesDiffer": "Historically, trials excluded patients with ASPECTS < 6 due to concerns regarding catastrophic hemorrhagic transformation. Six modern randomized trials (RESCUE-JAPAN, SELECT2, ANGEL-ASPECT, TENSION, TESLA, LASTE) proved overwhelming functional benefit, prompting guidelines worldwide to reverse prior exclusions.",
      "clinicalBottomLine": "Patients with anterior circulation LVO and ASPECTS 3–5 presenting within 24 hours should receive endovascular thrombectomy in addition to medical management, providing substantially superior functional independence (NNT ~ 5).",
      "resourceDependency": "Requires Advanced Perfusion/AI",
      "lastAppraisedAt": "2026-02-20"
    },
    "temporalEvolution": [
      {
        "society": "AHA/ASA",
        "previousYear": 2019,
        "previousGrade": "Class IIb, Level B-R (Uncertain efficacy for ASPECTS <6)",
        "currentYear": 2026,
        "currentGrade": "Class I, Level A (Strongly recommended)",
        "shiftDirection": "UPGRADED",
        "drivingTrials": [
          "SELECT2 (NEJM 2023)",
          "ANGEL-ASPECT (NEJM 2023)",
          "TENSION (Lancet 2023)"
        ],
        "evolutionNarrative": "Historic shift from exclusion to Class I recommendation for patients with large core infarcts presenting within 24 hours."
      }
    ],
    "ecosystemLinks": [
      {
        "app": "NeuroVision",
        "href": "#",
        "label": "ASPECTS 10-Region Automated Scoring",
        "badge": "AI Imaging",
        "description": "Map MCA territorial hypoattenuation on non-contrast CT and volumetric core perfusion."
      },
      {
        "app": "NeuroCase",
        "href": "/neurocase",
        "label": "Clinical Case: M1 Occlusion with ASPECTS 4",
        "badge": "Case Study",
        "description": "Review procedural angiograms and 90-day clinical outcome in a large core challenge."
      }
    ]
  },
  {
    "id": "ich-acute-bp-lowering",
    "title": "Acute Blood Pressure Lowering in Spontaneous Intracerebral Hemorrhage",
    "subspecialty": "Stroke",
    "summary": "Target systolic blood pressure thresholds in the hyperacute phase (within 2–6 hours) of spontaneous ICH to limit hematoma expansion while preventing renal hypoperfusion and cerebral ischemia.",
    "keyTags": [
      "ICH",
      "Blood Pressure",
      "Nicardipine",
      "Target SBP 130-140",
      "Hematoma Expansion"
    ],
    "statusBadge": "ESTABLISHED",
    "hasConfAlert": false,
    "aiSynthesisAppraisal": {
      "consensusLevel": "HIGH_CONCORDANCE",
      "whyGuidelinesDiffer": "AHA/ASA, ESO, and NCS all recommend rapid reduction to a target SBP between 130 and 140 mmHg, while explicitly advising against acute reduction below 130 mmHg or rapid drops >60 mmHg/hour due to renal adverse events highlighted in ATACH-2.",
      "clinicalBottomLine": "In patients with acute spontaneous ICH presenting with SBP >150 mmHg, rapidly reduce and smoothly maintain SBP between 130 and 140 mmHg using titratable IV infusions (Nicardipine, Labetalol); avoid blood pressure variability.",
      "resourceDependency": "Standard Care",
      "lastAppraisedAt": "2026-01-10"
    },
    "temporalEvolution": [
      {
        "society": "AHA/ASA",
        "previousYear": 2015,
        "previousGrade": "Class I, Level A (Target SBP <140 mmHg)",
        "currentYear": 2022,
        "currentGrade": "Class IIa, Level B-R (Target 130-140 mmHg; avoid <130)",
        "shiftDirection": "REVISED",
        "drivingTrials": [
          "INTERACT2 (NEJM 2013)",
          "ATACH-2 (NEJM 2016)"
        ],
        "evolutionNarrative": "Refined safety boundary establishing 130 mmHg as a floor to prevent acute kidney injury."
      }
    ],
    "ecosystemLinks": [
      {
        "app": "NeuroRx",
        "href": "#",
        "label": "Nicardipine & Labetalol Infusion Protocol",
        "badge": "Dosing",
        "description": "Stepwise titration increments and continuous blood pressure control guidelines."
      },
      {
        "app": "NeuroCalc",
        "href": "#",
        "label": "ICH Score Calculator",
        "badge": "Prognostication",
        "description": "30-day mortality risk stratification based on GCS, hematoma volume, and IVH."
      }
    ]
  },
  {
    "id": "status-epilepticus-rse",
    "title": "Management of Refractory and Super-Refractory Status Epilepticus",
    "subspecialty": "Epilepsy",
    "summary": "Stage 2 and Stage 3 treatment protocols when seizures persist beyond 20–30 minutes despite adequate first-line Benzodiazepines and second-line non-sedating IV antiseizure medications.",
    "keyTags": [
      "Status Epilepticus",
      "RSE",
      "NORSE",
      "cEEG",
      "Midazolam Infusion",
      "Propofol",
      "ESETT"
    ],
    "statusBadge": "ESTABLISHED",
    "hasConfAlert": true,
    "confAlertText": "AES session highlighted early adjunctive Ketamine and urgent continuous EEG monitoring.",
    "aiSynthesisAppraisal": {
      "consensusLevel": "HIGH_CONCORDANCE",
      "whyGuidelinesDiffer": "ILAE, NCS, and AAN endorse a structured 3-phase algorithm: Stage 1 (0–10 min: IV Lorazepam/Midazolam), Stage 2 (10–30 min: high-dose Levetiracetam, Valproate, or Fosphenytoin per ESETT trial), Stage 3 (>30 min: intubation with continuous Midazolam/Propofol anesthesia aiming for burst-suppression on cEEG).",
      "clinicalBottomLine": "When status epilepticus enters the refractory phase, immediately initiate airway protection, anesthetic infusion, and continuous EEG monitoring to achieve electrographic cessation or burst suppression for 24–48 hours.",
      "resourceDependency": "Specialized Center Only",
      "lastAppraisedAt": "2026-01-25"
    },
    "ecosystemLinks": [
      {
        "app": "NeuroRx",
        "href": "#",
        "label": "Second-Line IV ASM Weight-Based Dosing",
        "badge": "ESETT Protocol",
        "description": "Levetiracetam 60 mg/kg (max 4.5g), Valproate 40 mg/kg (max 3g)."
      }
    ]
  },
  {
    "id": "dementia-amyloid-monoclonal",
    "title": "Anti-Amyloid Monoclonal Antibodies and ARIA Safety Monitoring in Early Alzheimer's Disease",
    "subspecialty": "Dementia",
    "summary": "Appropriate patient selection criteria based on confirmed amyloid/tau biomarkers and standardized MRI surveillance protocols for amyloid-related imaging abnormalities (ARIA-E edema, ARIA-H microhemorrhages).",
    "keyTags": [
      "Alzheimer",
      "Lecanemab",
      "Donanemab",
      "ARIA-E",
      "ARIA-H",
      "p-Tau217",
      "ApoE4"
    ],
    "statusBadge": "NEW",
    "hasConfAlert": true,
    "confAlertText": "Real-world registry data presented at AAIC demonstrated safety of streamlined MRI surveillance.",
    "aiSynthesisAppraisal": {
      "consensusLevel": "MODERATE_VARIATION",
      "whyGuidelinesDiffer": "AAN and international working groups recommend therapy for confirmed MCI or mild dementia due to AD with elevated amyloid. Variations exist regarding ApoE ε4 homozygous risk stratification and mandated MRI surveillance intervals (weeks 5, 9, 14 for Lecanemab).",
      "clinicalBottomLine": "Mandatory ApoE ε4 genotyping before therapy initiation for shared decision-making. Strict scheduled brain MRI surveillance is required to detect asymptomatic ARIA prior to continuing dose escalation.",
      "resourceDependency": "Specialized Center Only",
      "lastAppraisedAt": "2026-03-01"
    }
  },
  {
    "id": "myasthenia-gravis-refractory",
    "title": "Targeted Biologics (FcRn Antagonists and Complement Inhibitors) in Generalized Myasthenia Gravis",
    "subspecialty": "Neuromuscular",
    "summary": "Role of targeted biologics (Efgartigimod, Ravulizumab, Zilucoplan) compared to conventional broad immunosuppressants and plasma exchange in AChR-Ab-positive refractory generalized Myasthenia Gravis.",
    "keyTags": [
      "Myasthenia Gravis",
      "Efgartigimod",
      "FcRn",
      "Complement Inhibitor",
      "MG-ADL",
      "AChR-Ab"
    ],
    "statusBadge": "PRACTICE_CHANGING",
    "hasConfAlert": false,
    "aiSynthesisAppraisal": {
      "consensusLevel": "HIGH_CONCORDANCE",
      "whyGuidelinesDiffer": "Pivotal phase 3 trials (ADAPT, CHAMPION-MG, RAISE) demonstrated rapid, sustained clinical improvement on MG-ADL scores without corticosteroid-associated toxicity. Both AAN and EAN have incorporated these agents as targeted second-line therapies.",
      "clinicalBottomLine": "In patients with acetylcholine receptor antibody-positive generalized MG unresponsive to first-line corticosteroids and non-steroidal immunosuppressants, FcRn antagonists (Efgartigimod) or C5 complement inhibitors are strongly indicated.",
      "resourceDependency": "Specialized Center Only",
      "lastAppraisedAt": "2026-02-12"
    }
  },
  {
    "id": "cns-bacterial-meningitis",
    "title": "Empirical Antimicrobial Therapy and Early Dexamethasone in Community-Acquired Acute Bacterial Meningitis",
    "subspecialty": "CNS Infections",
    "summary": "Optimal timing of adjunctive corticosteroid administration (prior to or with the first dose of antibiotics) and high-dose empirical antimicrobial coverage for Ceftriaxone-resistant S. pneumoniae and N. meningitidis.",
    "keyTags": [
      "Bacterial Meningitis",
      "Dexamethasone",
      "Ceftriaxone",
      "Vancomycin",
      "S. pneumoniae"
    ],
    "statusBadge": "ESTABLISHED",
    "hasConfAlert": false,
    "aiSynthesisAppraisal": {
      "consensusLevel": "HIGH_CONCORDANCE",
      "whyGuidelinesDiffer": "IDSA, ESCMID, and national guidelines unanimously mandate that Dexamethasone (10 mg IV) must be given BEFORE or WITH the first antibiotic dose. Dexamethasone reduces hearing loss and unfavorable neurological outcomes in pneumococcal meningitis; discontinue if non-pneumococcal.",
      "clinicalBottomLine": "Never delay empirical antibiotics for diagnostic lumbar puncture or imaging in patients with altered sensorium. Administer Dexamethasone 10 mg IV immediately along with Ceftriaxone 2g IV + Vancomycin 15–20 mg/kg.",
      "resourceDependency": "Standard Care",
      "lastAppraisedAt": "2026-01-18"
    }
  },
  {
    "id": "asah-aneurysm-coiling-vs-clipping",
    "title": "Endovascular Coiling vs. Microsurgical Clipping in Aneurysmal Subarachnoid Hemorrhage",
    "subspecialty": "Stroke",
    "summary": "Definitive aneurysm occlusion strategy (regular endovascular coiling vs. microsurgical clipping) and hyperacute timing (<24 hours) in patients presenting with ruptured aneurysmal subarachnoid hemorrhage (aSAH).",
    "keyTags": [
      "aSAH",
      "Subarachnoid Hemorrhage",
      "Coiling",
      "Clipping",
      "Nimodipine",
      "WFNS I-III",
      "ISAT",
      "Vergouwen",
      "ESO 2026",
      "EANS",
      "ESMINT"
    ],
    "statusBadge": "PRACTICE_CHANGING",
    "hasConfAlert": true,
    "confAlertText": "Joint ESO-EANS-ESMINT 2026 Guidelines published in European Stroke Journal strongly endorse simple coiling over clipping in WFNS I-III.",
    "aiSynthesisAppraisal": {
      "consensusLevel": "HIGH_CONCORDANCE",
      "whyGuidelinesDiffer": "Both ESO/EANS/ESMINT (2026) and AHA/ASA (2023) favor simple endovascular coiling over clipping for ruptured intracranial aneurysms when both are technically feasible, driven by long-term disability data from ISAT. Clipping remains preferred for wide-neck MCA bifurcation aneurysms or large parenchymal hematomas requiring mass decompression.",
      "clinicalBottomLine": "Ruptured aneurysms should be secured within 24 hours of ictus by a dedicated multidisciplinary neurovascular team. For patients in good grade (WFNS I–III) where both options are suitable, regular coiling is strongly recommended over clipping. Mandatory oral nimodipine for 21 days.",
      "resourceDependency": "Specialized Center Only",
      "lastAppraisedAt": "2026-05-10"
    },
    "temporalEvolution": [
      {
        "society": "ESO",
        "previousYear": 2013,
        "previousGrade": "Conditional recommendation (Moderate quality)",
        "currentYear": 2026,
        "currentGrade": "Strong recommendation FOR, High quality evidence",
        "shiftDirection": "UPGRADED",
        "drivingTrials": [
          "ISAT (Lancet 2005)",
          "ISAT Long-term Follow-up (Lancet 2015)",
          "Cochrane Systematic Review 2025"
        ],
        "evolutionNarrative": "Upgraded to the highest GRADE tier (Strong recommendation FOR) establishing simple coiling as the frontline standard of care over neurosurgical clipping for WFNS I–III."
      },
      {
        "society": "AHA/ASA",
        "previousYear": 2012,
        "previousGrade": "Class I, Level B",
        "currentYear": 2023,
        "currentGrade": "Class I, Level B-R",
        "shiftDirection": "UNCHANGED",
        "drivingTrials": [
          "ISAT",
          "BRAT Trial"
        ],
        "evolutionNarrative": "Maintained strong endorsement of endovascular coiling for technically amenable ruptured aneurysms."
      }
    ],
    "ecosystemLinks": [
      {
        "app": "NeuroRx",
        "href": "#",
        "label": "Oral Nimodipine 21-Day Protocol",
        "badge": "60mg q4h",
        "description": "Standardized enterally administered Nimodipine protocol to prevent delayed cerebral ischemia."
      },
      {
        "app": "NeuroCalc",
        "href": "#",
        "label": "WFNS & Hunt-Hess Scoring Calculator",
        "badge": "Grading",
        "description": "Emergency clinical grade stratification and prognostic risk calculator for aSAH."
      }
    ]
  }
];

export const MOCK_GUIDELINE_DOCS: GuidelineDoc[] = [
  {
    id: "aha-ais-2026",
    society: "AHA/ASA",
    year: 2026,
    subspecialty: "Stroke",
    subspecialties: ["Stroke"],
    title: "2026 Guideline for the Early Management of Patients With Acute Ischemic Stroke",
    officialUrl: "https://www.ahajournals.org/doi/10.1161/STR.0000000000000513",
    journalTarget: "Stroke",
    documentType: "Clinical Practice Guideline",
    publishDate: "2026-01-26",
    executiveSummary: "Hướng dẫn lâm sàng toàn diện chính thức 2026 của AHA/ASA gồm 10 thông điệp thực hành then chốt, 28 khuyến cáo bước ngoặt có tác động lâm sàng cao (What Is New & High Impact) và hơn 170 khuyến cáo chuyên đề chi tiết từ tiền viện đến hồi sức chuyên sâu.",
    executiveSummaryVi: "Cập nhật quan trọng nhất: Tenecteplase nâng lên Class 1 tương đương Alteplase; mở rộng EVT cho vùng nhồi máu lớn (ASPECTS 3-5) đến 24 giờ; EVT tắc thân nền trong 24 giờ; chống chỉ định hạ huyết áp tích cực <140 sau tái thông; DAPT cho đột quỵ nhẹ xơ vữa; và lần đầu tiên đưa vào hướng dẫn can thiệp đột quỵ nhi khoa.",
    topTakeaways: [
      "Mobile stroke units (MSU) enable rapid identifica­ tion and treatment of thrombolytic-eligible patients with acute ischemic stroke (AIS). Recent studies have highlighted the benefit of MSUs over conven­ tional emergency medical services and, when avail­ able, the guideline now includes recommendations related to the implementation of MSUs, based on their safety and benefit.",
      "Identification of appropriate transport destination for patients with suspected stroke in the prehospi­ tal setting remains challenging. Previous guidelines recommended transport to the nearest thrombolytic- capable facility. Given recent evidence, this guideline endorses consideration of the characteristics of the local system of care and direct transport to the clos­ est endovascular thrombectomy (EVT)-capable hos­ pital in the absence of well-functioning systems with rapid interhospital transfer processes.",
      "Intravenous thrombolysis (IVT) is a mainstay of medi­ cal management for patients with AIS. Given numer­ ous international trials showing noninferiority and the potential advantages of intravenous tenecteplase compared with alteplase, the new guidelines endorse the use of either alteplase or tenecteplase in the 4.5- hour thrombolytic treatment window. Furthermore, we emphasize rapid thrombolytic treatment in eli­ gible patients with disabling deficits, regardless of National Institutes of Health Stroke Scale (NIHSS) score, within the 4.5-hour window without advanced imaging selection. In addition, the guidelines provide support for extended window thrombolysis for select patients with stroke of unknown onset or 4.5–9 hours from onset using advanced imaging criteria (eg, diffusion weighted imaging-fluid attenuated recovery or perfusion-based mismatch).",
      "For patients with non-disabling (eg, isolated sensory syndrome) deficits in the 4.5-hour win­ dow, trials have failed to demonstrate benefit of thrombolysis. Dual antiplatelet therapy is preferred and recommended in this population.",
      "New studies have examined the role of adjuvant antithrombotic therapy, such as argatroban and eptifibatide, concurrently with IVT. These studies have shown no benefit and, therefore, adjuvant antithrombotic drugs are not recommended to enhance the outcomes from thrombolytic therapy.",
      "EVT has been established as a standard treatment for patients with AIS with large vessel occlusion (LVO) based on numerous randomized controlled trials. Recent evidence supports expanding EVT to populations previously considered ineligible. Specifically, several studies indicate that EVT benefits some patients with larger ischemic core strokes as determined by diagnostic imaging.",
      "Based on several trials showing improvement in functional outcomes compared with medical management alone, the guidelines also provide a strong recommendation for EVT in patients with basilar artery occlusion presenting within 24 hours of symptom onset and NIHSS score ≥10.",
      "For the first time, the guidelines include recommenda­ tions for interventional treatment in pediatric patients with AIS. Although much work remains to adapt pre­ hospital and hospital stroke protocols for pediatric patients, expert consensus and recent studies high­ light the importance of early stroke recognition in chil­ dren and support the safety and potential benefit of endovascular interventions in select pediatric patients with AIS. These recommendations serve as a foun­ dation for future recommendations and address the phases of pediatric acute stroke care.",
      "Glycemic management in patients with AIS has been updated since the prior guidelines such that inten­ sive glucose control to the range of 80 to 130 mg/ dL is not recommended to improve clinical outcome and increases the risk of severe hypoglycemia.",
      "Several new trials have assessed the efficacy and safety of blood pressure (BP) lowering after IVT and EVT in adult patients, providing new evidence that more intensive BP reduction does not improve functional outcome after IVT and may result in harm after EVT. Therefore, intensive systolic BP lowering to <140 mm Hg is not recommended even in the setting of complete reperfusion (eg, Thrombolysis In Cerebral Infarction grade 3 flow). PREAMBLE Since 1990, the American Heart Association (AHA) and American Stroke Association (ASA) have translated sci­ entific evidence into clinical practice guidelines with rec­ ommendations to improve cerebrovascular health. These guidelines, which are based on systematic methods to evaluate and classify evidence, provide a foundation for Downloaded from http://ahajournals.org by on January 26, 2026"
],
    allPracticeChanges: [
      {
        id: "aha-2026-hi-01",
        category: "Pediatric",
        topic: "\u0007Prehospital Assessment and Management (Pediatric)",
        changeType: "NEW",
        previousGrade: "Standard Care",
        currentGrade: "Class 2b, Level B-NR",
        currentText: "In pediatric patients with suspected stroke transported by ambulance, the usefulness of common adult stroke screening tools is uncertain because they perform poorly for identification of stroke. Newer pediatric stroke screening tools demonstrate good interrater reliability; however, their sensitivity, specificity, and predictive value in the prehospital setting remain to be determined, and their usefulness is unknown.",
        drivingTrials: []
      },
      {
        id: "aha-2026-hi-02",
        category: "Neuroimaging",
        topic: "\u0007Initial, Vascular, and Multimodal Imaging Approaches (Pediatric)",
        changeType: "NEW",
        previousGrade: "Standard Care",
        currentGrade: "Class 2a, Level B-NR",
        currentText: "In pediatric patients with suspected AIS, emergent brain and vascular imaging with MRI/MRA of the cervical and intracranial vessels is reasonable to identify patients with large vessel occlusion and to differentiate arterial ischemic stroke from hemorrhagic stroke or stroke mimics.",
        drivingTrials: []
      },
      {
        id: "aha-2026-hi-03",
        category: "Neuroimaging",
        topic: "\u0007Initial, Vascular, and Multimodal Imaging Approaches (Pediatric)",
        changeType: "NEW",
        previousGrade: "Standard Care",
        currentGrade: "Class 2a, Level B-NR",
        currentText: "In pediatric patients with suspected AIS, emergent brain and vascular imaging with CT/CTA of the cervical and intracranial vessels is reasonable if MRI/MRA imaging is not available immediately (within 25 minutes) to identify patients with large vessel occlusion.",
        drivingTrials: []
      },
      {
        id: "aha-2026-hi-04",
        category: "Reperfusion (Thrombolysis)",
        topic: "Thrombolysis Decision-Making (Pediatric)",
        changeType: "NEW",
        previousGrade: "Standard Care",
        currentGrade: "Class 2b, Level B-NR",
        currentText: "In pediatric patients aged 28 days to 18 years with confirmed AIS presenting within 4.5 hours of symptom onset and disabling deficits, IVT with alteplase may be considered as it is safe, but efficacy is uncertain.",
        drivingTrials: []
      },
      {
        id: "aha-2026-hi-05",
        category: "Endovascular Thrombectomy",
        topic: "\u0007Endovascular Thrombectomy in Pediatric Patients",
        changeType: "NEW",
        previousGrade: "Standard Care",
        currentGrade: "Class 2a, Level B-NR",
        currentText: "In pediatric patients ≥6 years with acute neurological symptoms and ischemic stroke due to LVO and within 6 hours from symptom onset, EVT can be effective if performed by experienced neurointerventionalists to improve functional outcomes.",
        drivingTrials: []
      },
      {
        id: "aha-2026-hi-06",
        category: "Endovascular Thrombectomy",
        topic: "\u0007Endovascular Thrombectomy in Pediatric Patients",
        changeType: "NEW",
        previousGrade: "Standard Care",
        currentGrade: "Class 2a, Level B-NR",
        currentText: "In pediatric patients ≥6 years with acute neurological symptoms and ischemic stroke due to LVO, 6 to 24 hours from symptom onset, and with potentially salvageable brain tissue, EVT can be effective to improve functional outcomes.",
        drivingTrials: []
      },
      {
        id: "aha-2026-hi-07",
        category: "Endovascular Thrombectomy",
        topic: "\u0007Endovascular Thrombectomy in Pediatric Patients",
        changeType: "NEW",
        previousGrade: "Standard Care",
        currentGrade: "Class 2b, Level B-NR",
        currentText: "In pediatric patients aged 28 days to 6 years with acute neurological symptoms, including first-time seizure and AIS due to LVO, within 24 hours from symptom onset, and with potentially salvageable brain tissue, EVT performed by neurointerventionalists with pediatric experience may be reasonable to improve functional outcomes.",
        drivingTrials: []
      },
      {
        id: "aha-2026-hi-08",
        category: "EMS & Stroke Systems",
        topic: "EMS Destination Management",
        changeType: "DOWNGRADED",
        previousGrade: "Standard Care",
        currentGrade: "Class 3: No Benefit, Level B-NR",
        currentText: "In areas with well-coordinated SSOC and local hospital(s) proficient in thrombolysis delivery and secondary interhospital transfer, direct transport of patients with suspected LVO to a distant (eg, 45–60 min) TSC com­ pared with transport to a local stroke center does not improve 3-month clinical outcomes.",
        drivingTrials: []
      },
      {
        id: "aha-2026-hi-09",
        category: "EMS & Stroke Systems",
        topic: "EMS Destination Management",
        changeType: "UPGRADED",
        previousGrade: "Class IIb, Level B-R",
        currentGrade: "Class 1, Level B-NR",
        currentText: "Hospitals and EMS professionals should establish agreements and protocols to prioritize interhospital transfer of patients with acute stroke needing a higher level of care to reduce door-in-door-out (DIDO) times.",
        drivingTrials: []
      },
      {
        id: "aha-2026-hi-10",
        category: "EMS & Stroke Systems",
        topic: "Role of Mobile Stroke Units",
        changeType: "UPGRADED",
        previousGrade: "Class IIb, Level B-R",
        currentGrade: "Class 1, Level B-NR",
        currentText: "In patients with suspected AIS, the use of MSUs over conventional EMS where available is recommended for the transport and management of thrombolytic-eligible patients to ensure the fastest achievable onset-to-treatment time and improve functional outcomes.",
        drivingTrials: ["BEST-MSU (NEJM 2021)", "B-PROUD (JAMA 2021)"]
      },
      {
        id: "aha-2026-hi-11",
        category: "EMS & Stroke Systems",
        topic: "\u0007Organization and Integration of Components",
        changeType: "UPGRADED",
        previousGrade: "Class IIb, Level B-R",
        currentGrade: "Class 1, Level B-NR",
        currentText: "Hospitals caring for patients with acute stroke that provide EVT (ie, TSC, CSC hospitals) should develop a sys­ tem to comprehensively track key time metrics and other care processes relevant to thrombectomy (eg, door-to-puncture time, successful reperfusion), as well as long-term patient outcomes.",
        drivingTrials: []
      },
      {
        id: "aha-2026-hi-12",
        category: "EMS & Stroke Systems",
        topic: "\u0007Organization and Integration of Components",
        changeType: "UPGRADED",
        previousGrade: "Class IIb, Level B-R",
        currentGrade: "Class 1, Level B-NR",
        currentText: "Hospitals caring for patients with acute stroke that provide EVT (ie, TSC, CSC hospitals) should credential neurointerventionalists using established and agreed upon training and certification standards.",
        drivingTrials: []
      },
      {
        id: "aha-2026-hi-13",
        category: "Blood Pressure",
        topic: "Blood Pressure Management",
        changeType: "DOWNGRADED",
        previousGrade: "Standard Care",
        currentGrade: "Class 3: No Benefit, Level B-NR",
        currentText: "In patients with mild to moderate severity AIS who have been treated with IVT, intensive SBP reduc­ tion (target of <140 mm Hg compared with <180 mm Hg) is not recommended because it is not associated with an improvement in functional outcome.",
        drivingTrials: []
      },
      {
        id: "aha-2026-hi-14",
        category: "Blood Pressure",
        topic: "Blood Pressure Management",
        changeType: "DOWNGRADED",
        previousGrade: "Standard Care",
        currentGrade: "Class 3: Harm, Level B-NR",
        currentText: "In patients with AIS with LVO of the anterior circulation who have been successfully recanalized by endo­ vascular therapy (mTICI 2b, 2c, or 3) and without other indication for blood pressure management target, intensive SBP reduction target of <140 mm Hg for the first 72 hours is harmful and not recommended.",
        drivingTrials: []
      },
      {
        id: "aha-2026-hi-15",
        category: "Metabolic Management",
        topic: "Blood Glucose Management",
        changeType: "DOWNGRADED",
        previousGrade: "Standard Care",
        currentGrade: "Class 3: No Benefit, Level B-NR",
        currentText: "In hospitalized patients with AIS with hyperglycemia, treatment with IV insulin to achieve blood glucose levels in the range of 80 to 130 mg/dL is not recommended to improve 3-month functional outcomes.",
        drivingTrials: []
      },
      {
        id: "aha-2026-hi-16",
        category: "Reperfusion (Thrombolysis)",
        topic: "Thrombolysis Decision-Making",
        changeType: "UPGRADED",
        previousGrade: "Class IIb, Level B-R",
        currentGrade: "Class 1, Level B-NR",
        currentText: "In adult patients with AIS who are eligible for IVT within 4.5 hours of symptom onset, treatment should be initiated as quickly as possible, assuring safe administration and avoiding potential delays associated with additional multimodal neuroimaging, such as CTA/MRA, and CT/MR perfusion imaging.",
        drivingTrials: []
      },
      {
        id: "aha-2026-hi-17",
        category: "Reperfusion (Thrombolysis)",
        topic: "Choice of Thrombolytic Agent",
        changeType: "UPGRADED",
        previousGrade: "Class IIb, Level B-R",
        currentGrade: "Class 1, Level B-NR",
        currentText: "In adult patients with AIS presenting within 4.5 hours of symptom onset or last known well and eligible for IVT, tenecteplase at a dose of 0.25 mg/kg body weight (max 25 mg) or alteplase at a dose of 0.9 mg/kg body weight is recommended to improve functional outcomes.",
        drivingTrials: ["AcT (Lancet 2022)", "TRACE-2 (Lancet 2023)", "ORIGINAL (Stroke 2024)", "NOR-TEST 2"]
      },
      {
        id: "aha-2026-hi-18",
        category: "Reperfusion (Thrombolysis)",
        topic: "\u0007Extended Time Windows for Intravenous Thrombolysis",
        changeType: "UPGRADED",
        previousGrade: "Class IIb, Level B-R",
        currentGrade: "Class 2a, Level B-NR",
        currentText: "In patients with AIS who have salvageable ischemic penumbra detected on automated perfusion imaging and who (a) awake with stroke symptoms within 9 hours from the midpoint of sleep or (b) are 4.5–9 hours from last known well, IV thrombolysis may be reasonable to improve functional outcomes.",
        drivingTrials: []
      },
      {
        id: "aha-2026-hi-19",
        category: "Endovascular Thrombectomy",
        topic: "\u0007Endovascular Thrombectomy for Adults",
        changeType: "UPGRADED",
        previousGrade: "Class IIb, Level B-R",
        currentGrade: "Class 1, Level B-NR",
        currentText: "In patients with AIS from anterior circulation proximal LVO of the ICA or M1, presenting within 6 hours from onset of symptoms, with NIHSS score ≥6, prestroke mRS score of 0 to 1, and ASPECTS 3 to 10, EVT is recommended to improve functional clinical outcomes and reduce mortality.",
        drivingTrials: ["SELECT2 (NEJM 2023)", "ANGEL-ASPECT (NEJM 2023)", "TENSION (Lancet 2023)", "RESCUE-JAPAN LIMIT"]
      },
      {
        id: "aha-2026-hi-20",
        category: "Endovascular Thrombectomy",
        topic: "\u0007Endovascular Thrombectomy for Adults",
        changeType: "UPGRADED",
        previousGrade: "Class IIb, Level B-R",
        currentGrade: "Class 1, Level B-NR",
        currentText: "In selected patients* with AIS from anterior circulation proximal LVO of the ICA or M1, presenting between 6 and 24 hours from onset of symptoms, with age <80 years, NIHSS score ≥6, prestroke mRS score 0 to 1, ASPECTS 3 to 5, and without significant mass effect on imaging, EVT is recommended to improve functional clinical outcomes and reduce mortality.",
        drivingTrials: ["SELECT2 (NEJM 2023)", "ANGEL-ASPECT (NEJM 2023)", "TENSION (Lancet 2023)", "RESCUE-JAPAN LIMIT"]
      },
      {
        id: "aha-2026-hi-21",
        category: "Endovascular Thrombectomy",
        topic: "\u0007Endovascular Thrombectomy for Adults",
        changeType: "UPGRADED",
        previousGrade: "Class IIb, Level B-R",
        currentGrade: "Class 2a, Level B-NR",
        currentText: "In selected patients† with AIS from anterior circulation proximal LVO of the ICA or M1 presenting within 6 hours from onset of symptoms, with age <80 years, NIHSS score ≥6, prestroke mRS 0 to 1, ASPECTS 0 to 2, and without significant mass effect on imaging, EVT is reasonable to improve functional clinical outcomes and reduce mortality.",
        drivingTrials: []
      },
      {
        id: "aha-2026-hi-22",
        category: "Endovascular Thrombectomy",
        topic: "\u0007Endovascular Thrombectomy for Adults",
        changeType: "UPGRADED",
        previousGrade: "Class IIb, Level B-R",
        currentGrade: "Class 2a, Level B-NR",
        currentText: "In patients with AIS from anterior circulation proximal LVO of the ICA or M1 presenting within 6 hours from onset of symptoms, with NIHSS score ≥6, and ASPECTS ≥6, who have a prestroke mRS score of 2, EVT is reasonable to improve functional clinical outcomes and reduce accumulated disability.",
        drivingTrials: []
      },
      {
        id: "aha-2026-hi-23",
        category: "Endovascular Thrombectomy",
        topic: "Posterior Circulation Stroke",
        changeType: "UPGRADED",
        previousGrade: "Class IIb, Level B-R",
        currentGrade: "Class 1, Level B-NR",
        currentText: "In patients with AIS, with basilar artery occlusion, a baseline mRS score of 0 to 1, NIHSS score ≥10 at presen­ tation, and PC-ASPECTS ≥6 (mild ischemic damage), EVT within 24 hours from onset of symptoms is recommended to achieve better functional outcome and reduce mortality.",
        drivingTrials: ["ATTENTION (NEJM 2022)", "BAOCHE (NEJM 2022)"]
      },
      {
        id: "aha-2026-hi-24",
        category: "Endovascular Thrombectomy",
        topic: "Endovascular Techniques",
        changeType: "DOWNGRADED",
        previousGrade: "Standard Care",
        currentGrade: "Class 3: No Benefit, Level B-NR",
        currentText: "In the management of patients with AIS in the setting of LVO, preoperative administration of tirofiban before EVT is not useful to improve 90-day functional outcome.",
        drivingTrials: ["RESCUE BT2 (NEJM 2023)"]
      },
      {
        id: "aha-2026-hi-25",
        category: "Antithrombotic Therapy",
        topic: "Antiplatelet Treatment",
        changeType: "UPGRADED",
        previousGrade: "Class IIb, Level B-R",
        currentGrade: "Class 2a, Level B-NR",
        currentText: "In patients with minor (NIHSS score ≤5) noncardioembolic AIS or high-risk TIA (ABCD2 score ≥4) within 24 to 72 hours from stroke onset, or NIHSS score of 4 to 5 within 24 hours from onset, who did not receive IVT, with presumed atherosclerotic cause (≥50% stenosis of intracranial or extracranial stenosis that was likely to have accounted for clinical presentation or acute new infarctions on imaging of presumed large artery atherosclerosis origin), DAPT (clopidogrel and aspirin) for 21 days followed by SAPT is reasonable to reduce the 90-day risk of recurrent stroke.",
        drivingTrials: ["CHANCE-2 (NEJM 2021)", "POINT (NEJM 2018)", "INSPIRES (NEJM 2023)"]
      },
      {
        id: "aha-2026-hi-26",
        category: "Anticoagulation",
        topic: "Anticoagulants",
        changeType: "UPGRADED",
        previousGrade: "Class IIb, Level B-R",
        currentGrade: "Class 2a, Level B-R",
        currentText: "In carefully selected (eg, milder severity) patients with AIS with atrial fibrillation, a strategy of early oral anti­ coagulation poststroke is low risk and is reasonable compared with a strategy of delayed anticoagulation, although the efficacy of early anticoagulation for prevention of early recurrent stroke is not established.",
        drivingTrials: []
      },
      {
        id: "aha-2026-hi-27",
        category: "Adult & Systems",
        topic: "Dysphagia",
        changeType: "UPGRADED",
        previousGrade: "Class IIb, Level B-R",
        currentGrade: "Class 2a, Level B-NR",
        currentText: "In patients with stroke with dysphagia, treatment with pharyngeal electrical stimulation (PES), can be beneficial to reduce dysphagia severity and decrease the risk of aspiration.",
        drivingTrials: []
      },
      {
        id: "aha-2026-hi-28",
        category: "Neurocritical Care",
        topic: "\u0007Brain Swelling (Medical Management)",
        changeType: "DOWNGRADED",
        previousGrade: "Standard Care",
        currentGrade: "Class 3: No Benefit, Level B-NR",
        currentText: "In patients with large hemispheric infarction 18 to 70 years of age, the use of IV glibenclamide does not result in improved functional outcome and is not recommended.",
        drivingTrials: ["CHARM (Lancet Neurol 2024)"]
      },
    ],
    linkedScenarioIds: ["ais-ivt-tenecteplase-4.5h", "ais-evt-extended-window-6-24h", "ais-bp-management-acute-phase", "ais-dapt-minor-stroke", "ais-evt-large-core-aspects-3-5"],
    fullTextStatus: "FULL_TEXT_PARSED"
  },
  {    id: "eso-bp-2024",
    society: "ESO",
    year: 2024,
    subspecialty: "Stroke",
    subspecialties: ["Stroke"],
    title: "European Stroke Organisation (ESO) Guidelines on Blood Pressure Management in Acute Stroke",
    officialUrl: "https://journals.sagepub.com/doi/eso-bp-2024",
    journalTarget: "European Stroke Journal",
    documentType: "Clinical Practice Guideline",
    publishDate: "2024-06-15",
    executiveSummary: "Hướng dẫn thực hành lâm sàng của Hội Đột quỵ Châu Âu (ESO) dựa trên phương pháp luận GRADE về kiểm soát huyết áp trong giai đoạn cấp đột quỵ thiếu máu não và xuất huyết não.",
    executiveSummaryVi: "Khuyến cáo chống hạ huyết áp thường quy trước viện, duy trì HA < 185/110 mmHg trước tiêu sợi huyết và bỏ phiếu đồng thuận chuyên gia 10/10.",
    allPracticeChanges: [
      {
        id: "eso-2024-bp-pico1",
        category: "Pre-hospital BP Lowering",
        topic: "PICO 1 In patients with suspected acute stroke, does pre-hospital blood pressure lowering with any drug, compared to no drug, improve outcome?",
        changeType: "NEW",
        currentGrade: "GRADE Strong against intervention (Evidence: Moderate, Voting: 10/10)",
        currentText: "In patients with suspected stroke, we suggest against routine blood pressure lowering in the pre-hospital setting.",
        previousText: "Due to the potential harm to patients with ICH, treatment with transdermal glyceryl trinitrate should be avoided. Intravenous urapidil or labetalol could be the treatment of choice.",
        drivingTrials: ["RIGHT-2 (Lancet 2019)", "MR ASAP (Lancet Neurol 2020)"]
      },
      {
        id: "eso-2024-bp-pico2",
        category: "In-Hospital Non-Reperfused AIS BP",
        topic: "PICO 2 In hospitalised patients with acute ischaemic stroke not treated with reperfusion therapies, does blood pressure lowering with any vasodepressor drug, compared to no drug, improve outcome?",
        changeType: "NEW",
        currentGrade: "GRADE Weak against intervention (Evidence: Moderate, Voting: 10/10)",
        currentText: "In hospitalised patients with acute ischaemic stroke and blood pressure < 220/110 mmHg not treated with intravenous thrombolysis or mechanical thrombectomy, we suggest against the routine use of blood pressure-lowering agents at least in the first 24 h following symptom onset, unless this is necessary for a specific comorbid condition that requires blood pressure lowering.",
        previousText: "In hospitalised patients with acute ischaemic stroke and blood pressure > 220/120 mmHg not treated with intravenous thrombolysis or mechanical thrombectomy, careful blood pressure reduction (<15% systolic blood pressure reduction in 24 h) is reasonable and likely to be safe. No specific blood pressure-lowering agent can be recommended.",
        drivingTrials: ["ENOS (Lancet 2015)", "SCAST (Lancet 2011)"]
      },
      {
        id: "eso-2024-bp-pico3",
        category: "IV Thrombolysis BP Targets",
        topic: "PICO 3 In hospitalised patients with acute ischaemic stroke and undergoing intravenous thrombolysis (with or without mechanical thrombectomy), do blood pressure-lowering therapies compared to control improve outcome?",
        changeType: "NEW",
        currentGrade: "GRADE Weak for intervention (Evidence: Very low, Voting: 10/10)",
        currentText: "In hospitalised patients with acute ischaemic stroke and undergoing intravenous thrombolysis (with or without mechanical thrombectomy), we suggest maintaining blood pressure below 185/110 mmHg before bolus, and below 180/105 mmHg after bolus and for 24 h. No specific blood pressure-lowering agent can be recommended.",
        previousText: "Special care should be given to avoid hypotensive episodes during and after mechanical thrombectomy which correlate with poorer functional outcomes.",
        drivingTrials: ["ENCHANTED (Lancet 2019)", "BEST-II (JAMA 2023)"]
      }
    ],
    linkedScenarioIds: ["ais-bp-management-acute-phase", "ais-neuro-icu-infection-prevention"],
    fullTextStatus: "FULL_TEXT_PARSED"
  },
  {
    id: "aan-asm-2024",
    society: "AAN",
    year: 2024,
    subspecialty: "Epilepsy",
    subspecialties: ["Epilepsy"],
    title: "AAN/AES Practice Guideline Update: Teratogenesis and Antiseizure Medication Safety in Women of Childbearing Potential",
    officialUrl: "https://www.aan.com/guidelines",
    journalTarget: "Neurology",
    documentType: "Clinical Practice Guideline",
    publishDate: "2024-05-14",
    executiveSummary: "Cập nhật an toàn thai kỳ và nguy cơ quái thai của các thuốc chống động kinh từ Viện Thần kinh học Hoa Kỳ (AAN) và Hội Động kinh Hoa Kỳ (AES).",
    executiveSummaryVi: "Khuyến cáo tránh tuyệt đối Valproate ở phụ nữ độ tuổi sinh sản trừ khi không còn lựa chọn; ưu tiên Levetiracetam và Lamotrigine với tỷ lệ dị tật bẩm sinh thấp nhất.",
    allPracticeChanges: [
      {
        id: "aan-2024-valproate-avoidance",
        category: "Pregnancy & Teratogenicity",
        topic: "Avoidance of Sodium Valproate in Women of Childbearing Potential",
        changeType: "UPGRADED",
        currentGrade: "Level A (Must Avoid)",
        currentText: "Valproate carries significantly elevated risks of major congenital malformations and neurodevelopmental disorders and should be avoided in women of childbearing potential whenever clinically feasible.",
        drivingTrials: ["EURAP Registry", "UK and Ireland Epilepsy and Pregnancy Register"]
      }
    ],
    linkedScenarioIds: ["epilepsy-pregnancy-medication-safety"],
    fullTextStatus: "FULL_TEXT_PARSED"
  },
  {
    id: "ilae-se-2023",
    society: "ILAE",
    year: 2023,
    subspecialty: "Epilepsy",
    subspecialties: ["Epilepsy"],
    title: "ILAE Clinical Practice Guideline on the Management of Status Epilepticus and Acute Seizures",
    officialUrl: "https://www.ilae.org/guidelines/guidelines-and-reports",
    journalTarget: "Epilepsia",
    documentType: "Clinical Practice Guideline",
    publishDate: "2023-09-10",
    executiveSummary: "Hướng dẫn chẩn đoán và điều trị trạng thái động kinh và cơn co giật cấp tính của Liên đoàn Quốc tế Chống Động kinh (ILAE).",
    executiveSummaryVi: "Chiến lược điều trị phân tầng thời gian 5-10 phút (Benzodiazepine đầu tay) và 10-30 phút (Levetiracetam, Fosphenytoin, Valproate với hiệu quả tương đương theo thử nghiệm ESETT).",
    allPracticeChanges: [
      {
        id: "ilae-2023-se-second-line",
        category: "Status Epilepticus",
        topic: "Second-Line Antiseizure Medication Equivalence",
        changeType: "UPGRADED",
        currentGrade: "Class I, Level A",
        currentText: "For established status epilepticus unresponsive to first-line benzodiazepines, Levetiracetam (60 mg/kg), Fosphenytoin (20 mg PE/kg), or Valproate (40 mg/kg) are equally effective and safe second-line options.",
        drivingTrials: ["ESETT (NEJM 2019)", "ConSEPT (Lancet 2019)"]
      }
    ],
    linkedScenarioIds: ["epilepsy-status-epilepticus-treatment"],
    fullTextStatus: "FULL_TEXT_PARSED"
  },
  {
    id: "ncs-sah-2023",
    society: "NCS",
    year: 2023,
    subspecialty: "Neurocritical Care",
    subspecialties: ["Neurocritical Care"],
    title: "Neurocritical Care Society (NCS) Guidelines for the Management of Aneurysmal Subarachnoid Hemorrhage",
    officialUrl: "https://www.neurocriticalcare.org/Resources-Publications/Neurocritical-Care-Guidelines",
    journalTarget: "Neurocritical Care",
    documentType: "Clinical Practice Guideline",
    publishDate: "2023-07-18",
    executiveSummary: "Hướng dẫn thực hành lâm sàng hồi sức thần kinh về xuất huyết dưới nhện do vỡ phình mạch của Hội Hồi sức Thần kinh (NCS).",
    executiveSummaryVi: "Duy trì Nimodipine đường uống 60mg mỗi 4 giờ trong 21 ngày; kiểm soát huyết áp tâm thu <160 mmHg trước khi bít/kẹp phình mạch; tránh hạ natri máu chủ động.",
    allPracticeChanges: [
      {
        id: "ncs-2023-nimodipine-dci",
        category: "Delayed Cerebral Ischemia",
        topic: "Oral Nimodipine for DCI Neuroprotection",
        changeType: "REVISED",
        currentGrade: "Strong Recommendation, High Quality Evidence",
        currentText: "Enteral Nimodipine (60 mg every 4 hours for 21 days) is strongly recommended for all patients with aSAH to reduce poor neurological outcomes.",
        drivingTrials: ["British Aneurysm Nimodipine Trial (BMJ 1989)"]
      }
    ],
    linkedScenarioIds: ["neuroicu-sah-dci-management"],
    fullTextStatus: "FULL_TEXT_PARSED"
  },
  {
    "id": "eso-sap-2024",
    "society": "ESO",
    "year": 2024,
    "subspecialty": "Stroke",
    "subspecialties": [
      "Stroke"
    ],
    "title": "European Stroke Organisation (ESO) Guidelines on Stroke-Associated Pneumonia",
    "officialUrl": "https://journals.sagepub.com/doi/eso-sap-2024",
    "journalTarget": "European Stroke Journal",
    "documentType": "Clinical Practice Guideline",
    "publishDate": "2024-06-15",
    "executiveSummary": "Hướng dẫn thực hành lâm sàng của Hội Đột quỵ Châu Âu (ESO) dựa trên phương pháp luận GRADE về chẩn đoán, phân tầng nguy cơ và dự phòng viêm phổi liên quan đột quỵ (SAP).",
    "executiveSummaryVi": "Khuyến cáo sử dụng thang điểm lâm sàng hoặc dấu ấn sinh học có giá trị dự đoán nguy cơ viêm phổi ở bệnh nhân đột quỵ nằm viện không thở máy trong 7 ngày đầu, kèm bỏ phiếu đồng thuận chuyên gia 8/8.",
    "allPracticeChanges": [
      {
        "id": "eso-2024-sap-pico5",
        "category": "Complication Prevention",
        "topic": "PICO 5: Biomarkers & Clinical Prediction Scores for SAP",
        "changeType": "NEW",
        "currentGrade": "GRADE Weak for intervention (Evidence: Very Low, Voting: 8/8)",
        "currentText": "In hospitalised adults with acute ischaemic or haemorrhagic stroke (non-ventilated) within 7 days of stroke symptom onset, we suggest using validated clinical prediction scores or biomarkers to identify patients at increased risk of SAP and to better target preventive standard measures.",
        "drivingTrials": [
          "PRECIOUS (Lancet Neurol 2023)"
        ]
      },
      {
        "id": "eso-2024-prophylactic-antibiotics",
        "category": "Infection Control",
        "topic": "PICO 1: Routine Prophylactic Antibiotics for Stroke Patients",
        "changeType": "REVISED",
        "currentGrade": "GRADE Strong against intervention (Evidence: High)",
        "currentText": "We recommend against the routine use of prophylactic systemic antibiotics in hospitalised patients with acute stroke to prevent stroke-associated pneumonia or improve clinical outcome.",
        "drivingTrials": [
          "PASS (Lancet 2015)",
          "PANTHER (Stroke 2016)"
        ]
      }
    ],
    "linkedScenarioIds": [
      "ais-neuro-icu-infection-prevention",
      "ais-bp-management-acute-phase"
    ],
    "fullTextStatus": "FULL_TEXT_PARSED"
  },
  {
    "id": "aha-primary-prevention-2024",
    "society": "AHA/ASA",
    "year": 2024,
    "title": "2024 AHA/ASA Guideline for the Primary Prevention of Stroke",
    "officialUrl": "https://doi.org/10.1161/STR.0000000000000475",
    "journalTarget": "Stroke",
    "documentType": "Clinical Practice Guideline",
    "publishDate": "2026-01-26",
    "subspecialty": "Stroke",
    "subspecialties": [
      "Stroke"
    ],
    "executiveSummary": "Hướng dẫn thực hành lâm sàng chính thức từ AHA/ASA. Bao gồm 83 khuyến cáo then chốt được trích xuất và kiểm chứng qua hệ thống AI Lõi NeuroGuide.",
    "executiveSummaryVi": "Hướng dẫn thực hành lâm sàng chính thức từ AHA/ASA. Bao gồm 83 khuyến cáo then chốt được trích xuất và kiểm chứng qua hệ thống AI Lõi NeuroGuide.",
    "allPracticeChanges": [
      {
        "id": "rec-aha-primary-prevention-2024-01",
        "category": "CV Risk Estimation",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In individuals 40-79 years of age, estimation of risk for atherosclerotic CVD (ie, nonfatal MI, nonfatal stroke, and fatal CVD) every 1 to 5 years is beneficial to guide decisions on treatments and lifestyle recommendations that may reduce risk for stroke.",
        "currentGrade": "Class 1, Level B-NR",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-02",
        "category": "Atrial Fibrillation Risk Scoring",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In individuals with AF, calculation of the CHA2DS2-VASc score is recommended to guide decisions on prescription of oral anticoagulation to reduce risk for stroke.",
        "currentGrade": "Class 1, Level B-NR",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-03",
        "category": "Modifiable Risk Screening",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In individuals >=18 years of age, periodic screening for modifiable behaviors and medical conditions that increase stroke risk is recommended to reduce risk for stroke.",
        "currentGrade": "Class 1, Level C-EO",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-04",
        "category": "Social Determinants of Health Screening",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In individuals >=18 years of age, periodic screening for SDOH (eg, food insecurity, lack of transportation) is beneficial to identify additional factors that contribute to stroke risk.",
        "currentGrade": "Class 1, Level C-EO",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-05",
        "category": "Mediterranean Diet",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In adults without prior CVD and who are at high or intermediate CVD risk, a Mediterranean diet is recommended to reduce the risk of incident stroke.",
        "currentGrade": "Class 1, Level B-R",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-06",
        "category": "Salt Substitution",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In adults who are >=60 years of age and have uncontrolled BP (systolic BP [SBP] >=140 mm Hg if taking antihypertensive medication or >=160 mm Hg if not), compared with using 100% sodium chloride, salt substitution (75% sodium chloride and 25% potassium chloride) is reasonable to reduce the risk of incident stroke.",
        "currentGrade": "Class 2a, Level B-R",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-07",
        "category": "Vitamin Supplements (Folic Acid/B-Complex)",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In adults, folic acid supplementation and B-complex (folic acid, B12, B6) vitamins supplementation for reducing the risk of stroke are not well established.",
        "currentGrade": "Class 2b, Level B-NR",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-08",
        "category": "Long-Chain Fatty Acids",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In adults without prior CVD, long-chain fatty acids are not effective for reducing the risk of stroke.",
        "currentGrade": "Class 3: No Benefit, Level B-R",
        "drivingTrials": [
          "REDUCE-IT"
        ]
      },
      {
        "id": "rec-aha-primary-prevention-2024-09",
        "category": "Antioxidants and Vitamins",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In adults, vitamin C, vitamin E, selenium, antioxidants, calcium, calcium with vitamin D, and multivitamin supplementation are not effective for reducing the risk of stroke.",
        "currentGrade": "Class 3: No Benefit, Level B-R",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-10",
        "category": "Physical Activity Screening",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In adults, screening for physical activity is recommended as part of a comprehensive effort to estimate stroke risk.",
        "currentGrade": "Class 1, Level C-EO",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-11",
        "category": "Aerobic and Vigorous Activity Counseling",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In adults, counseling patients to engage in at least 150 minutes of moderate-intensity physical activity, 75 minutes of vigorous-intensity physical activity, or an equivalent combination per week is recommended to reduce the risk of stroke.",
        "currentGrade": "Class 1, Level C-LD",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-12",
        "category": "Sedentary Behavior Avoidance",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In adults, counseling to avoid excessive time spent in sedentary behavior (characterized by low-energy expenditure while sitting, reclining, or lying while awake) is recommended to reduce the risk of stroke.",
        "currentGrade": "Class 1, Level C-LD",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-13",
        "category": "Overweight and Obesity Screening",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In adults >18 years of age, screening for overweight and obesity is recommended to inform the risk of stroke.",
        "currentGrade": "Class 1, Level B-NR",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-14",
        "category": "Bariatric Surgery",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with class II obesity (35-39.9 kg/m2) or greater, bariatric surgical procedures to promote weight loss may be considered to reduce the risk of stroke.",
        "currentGrade": "Class 2b, Level C-LD",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-15",
        "category": "Obstructive Sleep Apnea Screening",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "The effectiveness of screening adults for OSA to prevent stroke is unclear.",
        "currentGrade": "Class 2b, Level B-R",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-16",
        "category": "CPAP for OSA",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with OSA, continuous positive airway pressure (CPAP) might be reasonable to reduce the risk of stroke.",
        "currentGrade": "Class 2b, Level C-LD",
        "drivingTrials": [
          "SAVE"
        ]
      },
      {
        "id": "rec-aha-primary-prevention-2024-17",
        "category": "Prediabetes and Diabetes Screening",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In asymptomatic adults >=18 years of age who have overweight, obesity, or atherosclerotic CVD, screening for prediabetes and diabetes is recommended to inform stroke risk.",
        "currentGrade": "Class 1, Level C-LD",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-18",
        "category": "GLP-1 Receptor Agonists for Diabetes",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with diabetes and high cardiovascular risk or established CVD and hemoglobin A1c >=7%, treatment with a GLP-1 receptor agonist is effective to reduce the risk of stroke.",
        "currentGrade": "Class 1, Level A",
        "drivingTrials": [
          "SUSTAIN-6",
          "REWIND"
        ]
      },
      {
        "id": "rec-aha-primary-prevention-2024-19",
        "category": "Intensive Glycemic Control",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with type 1 diabetes or diabetes, intensive glycemic control (targeting a hemoglobin A1c <=6.5%) is not beneficial for stroke prevention.",
        "currentGrade": "Class 3: No Benefit, Level B-R",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-20",
        "category": "Hypertension Screening",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In adults >=18 years of age, screening for hypertension is recommended to identify individuals at increased risk for stroke and eligible for antihypertensive treatment.",
        "currentGrade": "Class 1, Level C-LD",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-21",
        "category": "Antihypertensive Drug Treatment Targets",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In adults with stage 2 hypertension or stage 1 hypertension with a higher risk for atherosclerotic CVD, lifestyle improvement and antihypertensive drug treatment to a SBP/diastolic BP (DBP) <130/80 mm Hg are recommended to prevent stroke.",
        "currentGrade": "Class 1, Level A",
        "drivingTrials": [
          "SPRINT",
          "ACCORD BP"
        ]
      },
      {
        "id": "rec-aha-primary-prevention-2024-22",
        "category": "Initial Antihypertensive Drug Classes",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In adults with hypertension, thiazide and thiazide-like diuretics, calcium channel blockers, angiotensin-converting enzyme inhibitors, and angiotensin receptor blockers are recommended as initial antihypertensive drug therapies to prevent stroke.",
        "currentGrade": "Class 1, Level A",
        "drivingTrials": [
          "ALLHAT"
        ]
      },
      {
        "id": "rec-aha-primary-prevention-2024-23",
        "category": "Multi-Drug Antihypertensive Therapy",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In most adults with hypertension, antihypertensive drug treatment incorporating >=2 antihypertensive medications is indicated to achieve the BP control necessary to prevent stroke.",
        "currentGrade": "Class 1, Level A",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-24",
        "category": "Statin Therapy for Primary Prevention",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In adults who qualify for treatment with lipid-lowering therapy according to the 2019 ACC/AHA guideline on the primary prevention of CVD (eg, 20-75 years of age with LDL cholesterol [LDL-C] level >190 mg/dL [>4.9 mmol/L], 10-year ASCVD risk >=20%, or 10-year ASCVD risk >=7.5%-<20% plus >=1 risk enhancers), treatment with a statin is recommended to reduce the risk of a first stroke.",
        "currentGrade": "Class 1, Level A",
        "drivingTrials": [
          "HOPE-3"
        ]
      },
      {
        "id": "rec-aha-primary-prevention-2024-25",
        "category": "PCSK9 Inhibitors",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In adults without CVD who qualify for treatment with lipid-lowering therapy, according to the 2019 ACC/AHA guideline on the primary prevention of CVD (eg, 20-75 years of age with LDL-C level >190 mg/dL [>4.9 mmol/L], 10-year ASCVD risk >=20%, or 10-year ASCVD risk >=7.5%-<20% plus >=1 risk enhancers), who cannot reach goals or cannot tolerate other therapies such as statins, the benefit of treatment with alirocumab or evolocumab compared with other active lipid-lowering therapy for the reduction of the risk of a first stroke is uncertain.",
        "currentGrade": "Class 2b, Level A",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-26",
        "category": "Bempedoic Acid",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In adults who do not tolerate statin therapy and who have LDL-C >100 mg/dL and elevated cardiovascular risk, treatment with bempedoic acid to reduce the risk of a first stroke is not well established.",
        "currentGrade": "Class 2b, Level B-R",
        "drivingTrials": [
          "CLEAR Outcomes"
        ]
      },
      {
        "id": "rec-aha-primary-prevention-2024-27",
        "category": "Omega-3 Fatty Acid Supplementation",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In adults with moderate or low intake of long-chain omega-3 fatty acid, supplementation is not recommended to reduce the risk of a first stroke.",
        "currentGrade": "Class 3: No Benefit, Level A",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-28",
        "category": "Tobacco Screening",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In all patients, screening for cigarette smoking, use of other forms of tobacco, use of electronic nicotine delivery systems such as electronic cigarettes (e-cigarettes) and vapes, and environmental tobacco smoke exposure (secondhand smoke exposure) is effective to inform stroke risk and target cessation interventions.",
        "currentGrade": "Class 1, Level B-NR",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-29",
        "category": "Tobacco Abstinence and Avoidance",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "For patients who are nonusers of tobacco products, continued complete abstention from cigarette smoking, in addition to other tobacco products and electronic nicotine delivery systems, and avoidance of exposure to environmental tobacco smoke (secondhand smoke exposure) are recommended to avoid the associated increased risk of stroke.",
        "currentGrade": "Class 1, Level B-NR",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-30",
        "category": "Smoking Cessation Pharmacotherapy and Counseling",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "For patients who are active cigarette smokers, smoking cessation pharmacotherapy delivered along with behavioral counseling is recommended, in preference to behavioral counseling alone, to facilitate smoking cessation.",
        "currentGrade": "Class 1, Level A",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-31",
        "category": "Cessation Support for Other Tobacco Products",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "For patients who are active cigarette smokers and users of other tobacco products (eg, electronic nicotine delivery systems), assistance with cessation is recommended to reduce the risk of stroke.",
        "currentGrade": "Class 1, Level C-LD",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-32",
        "category": "Hospital Opt-Out Smoking Cessation",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "For patients who are active cigarette smokers encountered in the hospital setting, providing smoking cessation pharmacotherapy along with behavioral counseling as the default treatment (\"opt-out\"), in preference to providing such treatment only for patients expressing a willingness to quit smoking (\"opt-in\"), can be beneficial to facilitate short-term smoking cessation and to increase engagement in smoking cessation treatment.",
        "currentGrade": "Class 2a, Level B-R",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-33",
        "category": "E-Cigarettes for Smoking Cessation",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "For patients who are active cigarette smokers, the long-term health benefits of using e-cigarettes in place of nicotine replacement therapy to facilitate cigarette smoking cessation are not well established.",
        "currentGrade": "Class 2b, Level B-R",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-34",
        "category": "Asymptomatic Carotid Screening",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In the asymptomatic population, routine screening for carotid artery stenosis is not recommended to reduce the risk of stroke.",
        "currentGrade": "Class 3: No Benefit, Level B-NR",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-35",
        "category": "Shared Decision-Making for Severe ACS",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with asymptomatic carotid artery stenosis (ACS) >70%, shared decision-making between the patient and the health care team to decide between the 2 courses of treatment (carotid revascularization or medical management) is recommended to determine the best method of reducing stroke risk.",
        "currentGrade": "Class 1, Level C-EO",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-36",
        "category": "Statin Therapy for ACS",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with asymptomatic atherosclerotic carotid artery stenosis, medical treatment with statin can be beneficial to reduce the risk of stroke.",
        "currentGrade": "Class 2a, Level B-NR",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-37",
        "category": "Carotid Revascularization for Low Perioperative Risk ACS",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with asymptomatic atherosclerotic carotid artery stenosis >70% and low perioperative risk, the use of carotid revascularization, in addition to intensive medical therapy, may be reasonable to reduce the risk of stroke.",
        "currentGrade": "Class 2b, Level B-R",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-38",
        "category": "Duplex Ultrasound Surveillance for ACS",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with ACS >50%, annual carotid duplex ultrasound every 6 to 12 months might be reasonable to assess progression of disease and subsequent increased risk of stroke.",
        "currentGrade": "Class 2b, Level B-NR",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-39",
        "category": "High Perioperative Risk ACS Revascularization",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with asymptomatic atherosclerotic carotid artery stenosis and high perioperative risk, the effectiveness of carotid revascularization to reduce risk of stroke is not established.",
        "currentGrade": "Class 2b, Level B-NR",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-40",
        "category": "Risk Factor Management for CSVD",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In adults with asymptomatic cerebral SVD (CSVD), including silent infarcts, assessment and management of risk factors (eg, hypertension, dyslipidemia, tobacco use, and diabetes) are recommended to reduce stroke risk.",
        "currentGrade": "Class 1, Level C-LD",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-41",
        "category": "Statin Therapy for Silent Cerebral Infarcts",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In adults with silent cerebral infarcts (SCIs) who do not have an indication for statin therapy according to the 2019 ACC/AHA guideline (eg, 20-75 years of age with LDL-C level >190 mg/dL [>4.9 mmol/L], 10-year ASCVD risk >=20%, or 10-year ASCVD risk >=7.5%-<20% plus >=1 more risk enhancers), use of low-dose statin therapy might be considered to reduce the risk of ischemic stroke.",
        "currentGrade": "Class 2b, Level B-NR",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-42",
        "category": "Antiplatelet Therapy for SCIs",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In adults with SCI, the benefit of antiplatelet therapy to reduce the risk of ischemic stroke is uncertain.",
        "currentGrade": "Class 2b, Level C-LD",
        "drivingTrials": [
          "SILENCE"
        ]
      },
      {
        "id": "rec-aha-primary-prevention-2024-43",
        "category": "Vascular Risk Modification in Migraine",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In adults 18 to 64 years of age with migraine with or without aura, evaluation and modification of vascular risk factors are recommended to address the elevated risk of stroke in this patient population.",
        "currentGrade": "Class 1, Level C-LD",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-44",
        "category": "Contraception in Migraine with Aura",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In adults with migraine with aura who desire contraception, progestin-only or nonhormonal forms are recommended to avoid the increased risk of ischemic stroke associated with combined hormonal contraception.",
        "currentGrade": "Class 1, Level C-LD",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-45",
        "category": "TCD Screening in Pediatric SCD",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In children 2 to 16 years of age with SCD (Hb SS or Hb S-beta0-thalassemia), transcranial Doppler (TCD) screening at a frequency based on the highest mean flow velocity in the terminal portion of the internal carotid or the proximal portion of the middle cerebral artery is recommended.",
        "currentGrade": "Class 1, Level B-R",
        "drivingTrials": [
          "STOP-1",
          "STOP-2"
        ]
      },
      {
        "id": "rec-aha-primary-prevention-2024-46",
        "category": "Transfusion Therapy for Elevated Stroke Risk in SCD",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In children 2 to 16 years of age with SCD at elevated risk per TCD measurements, regularly scheduled transfusion therapy (target reduction of hemoglobin S <30%) is effective for reducing stroke risk.",
        "currentGrade": "Class 1, Level B-R",
        "drivingTrials": [
          "STOP-1",
          "STOP-2"
        ]
      },
      {
        "id": "rec-aha-primary-prevention-2024-47",
        "category": "Brain MRI for Silent Infarcts in SCD",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In children 2 to 16 years of age and young adults with Hb SS or Hb S-beta0-thalassemia, an MRI of the brain without sedation should be performed as soon as possible to evaluate for SCI and to determine the need for chronic red cell transfusions (CRCTs) for stroke prevention.",
        "currentGrade": "Class 2a, Level B-R",
        "drivingTrials": [
          "SIT Trial"
        ]
      },
      {
        "id": "rec-aha-primary-prevention-2024-48",
        "category": "Continued Transfusions after TCD Normalization",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In children 2 to 16 years of age with SCD whose TCD velocities revert to normal, continued transfusion therapy can be beneficial to reduce the risk of stroke.",
        "currentGrade": "Class 2a, Level B-R",
        "drivingTrials": [
          "STOP-2"
        ]
      },
      {
        "id": "rec-aha-primary-prevention-2024-49",
        "category": "Transition to Hydroxyurea in SCD",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In children 2 to 16 years of age with SCD and normalized mean flow velocities and no intracranial stenosis, transition from transfusion to hydroxyurea therapy can be considered to prevent stroke.",
        "currentGrade": "Class 2a, Level B-NR",
        "drivingTrials": [
          "TWiTCH"
        ]
      },
      {
        "id": "rec-aha-primary-prevention-2024-50",
        "category": "Hydroxyurea or BMT for High-Risk SCD Unable to Transfuse",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In children 2 to 16 years of age with SCD at high risk for stroke (TCD mean flow velocities >=200 cm/s) but without intracranial stenosis who are unable to continue or cannot be treated with periodic red cell transfusion, hydroxyurea or bone marrow transplantation may be reasonable to prevent stroke.",
        "currentGrade": "Class 2b, Level B-NR",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-51",
        "category": "Risk Factor Management in CADASIL",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with CADASIL, counseling on smoking cessation and treatment of hypertension and other vascular risk factors are beneficial to reduce the risk of incident stroke.",
        "currentGrade": "Class 1, Level C-LD",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-52",
        "category": "Screening for PAVMs in HHT",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In adults with hereditary hemorrhagic telangiectasia (HHT), screening for pulmonary arteriovenous malformations (PAVMs) is reasonable to identify the need for multidisciplinary evaluation to manage stroke risk.",
        "currentGrade": "Class 2a, Level B-NR",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-53",
        "category": "Enzyme Replacement Therapy in Fabry Disease",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with Fabry disease, the effectiveness of enzyme replacement therapy (ERT) to reduce the risk of stroke is not well established.",
        "currentGrade": "Class 2b, Level C-LD",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-54",
        "category": "Low-Dose Colchicine for Recent MI",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In adults with a recent MI, the addition of low-dose colchicine to intensive statin therapy might be reasonable to decrease the risk of ischemic stroke.",
        "currentGrade": "Class 2b, Level B-R",
        "drivingTrials": [
          "COLCOT",
          "LoDoCo2"
        ]
      },
      {
        "id": "rec-aha-primary-prevention-2024-55",
        "category": "Aspirin for High-Risk aPL Profile",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients without a history of stroke and no clinical indication for anticoagulation, with a high-risk aPL profile (ie, triple-positive antiphospholipid testing [lupus anticoagulant, anticardiolipin antibody, anti-beta2 glycoprotein 1] or double-positive [any combination] or isolated lupus anticoagulant or isolated persistently positive anticardiolipin antibody at medium to high titers), prophylactic treatment with aspirin (75-100 mg daily) is recommended to reduce the risk of stroke.",
        "currentGrade": "Class 1, Level B-NR",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-56",
        "category": "Aspirin for SLE with High-Risk aPL",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with systemic lupus erythematosus (SLE) and no history of thrombosis or pregnancy complications and with a high-risk antiphospholipid profile (ie, lupus anticoagulant, anticardiolipin antibody, anti-beta2-glycoprotein 1, or double-positive [any combination] or isolated lupus anticoagulant or isolated persistently positive anticardiolipin antibody at medium to high titers), prophylactic treatment with aspirin (75-100 mg daily) is recommended to reduce the risk of stroke.",
        "currentGrade": "Class 1, Level B-NR",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-57",
        "category": "Anticoagulation in APS with Prior Venous Thrombosis",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with antiphospholipid syndrome (APS) with prior unprovoked venous thrombosis, it is reasonable to choose vitamin K antagonist (VKA) therapy with a target international normalized ratio of 2 to 3 in preference to aspirin or direct oral anticoagulants for prevention of recurrent thrombotic events, including stroke.",
        "currentGrade": "Class 2a, Level B-R",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-58",
        "category": "Statins in Rheumatoid Arthritis",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with rheumatoid arthritis, statin treatment may be reasonable to reduce major adverse cardiovascular events, including stroke.",
        "currentGrade": "Class 2b, Level B-R",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-59",
        "category": "Aspirin for Obstetric APS History",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In nonpregnant adults with a history of obstetric APS only, prophylactic treatment with aspirin (75-100 mg daily) after adequate risk/benefit evaluation (ie, aPL profile, coexistent traditional cardiovascular risk factors, intolerance, or contraindication to aspirin) may be considered to reduce the risk of stroke.",
        "currentGrade": "Class 2b, Level B-NR",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-60",
        "category": "Aspirin for SLE with Low-Risk aPL",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with SLE and no history of thrombosis or pregnancy complications and with a low-risk antiphospholipid profile (ie, isolated anticardiolipin antibody or anti-beta2-glycoprotein 1 antibodies at low to medium titers, particularly if transiently positive), prophylactic treatment with aspirin (75-100 mg daily) may be considered to reduce the risk of stroke.",
        "currentGrade": "Class 2b, Level C-LD",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-61",
        "category": "Periodontal Care for Periodontal Disease",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with periodontal disease (PD), good oral hygiene and regular dental care can be beneficial to lower stroke risk.",
        "currentGrade": "Class 2a, Level B-NR",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-62",
        "category": "Full-Dose Anticoagulation in Hospitalized COVID-19",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients hospitalized with COVID-19, treatment with full-dose anticoagulation (eg, enoxaparin, apixaban) is not recommended to prevent stroke.",
        "currentGrade": "Class 3: No Benefit, Level B-R",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-63",
        "category": "Substance Misuse Screening",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In all adults, screening for substance misuse and substance use disorders (eg, alcohol, cannabis, cocaine, opioids, amphetamines) is recommended to inform stroke risk.",
        "currentGrade": "Class 1, Level B-NR",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-64",
        "category": "Substance Use Counseling and Treatment",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients who use recreational drugs (eg, cannabis, synthetic cannabinoids, cocaine, heroin, methamphetamine), misuse alcohol or prescription medications (eg, stimulants and opioids), or have a substance use disorder, counseling to stop or appropriate substance use disorder treatments (eg, pharmacological, behavioral, or multimodal) as appropriate are reasonable to reduce stroke risk.",
        "currentGrade": "Class 2a, Level C-LD",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-65",
        "category": "Severe Hypertension Management in Pregnancy/Postpartum",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In pregnant or early postpartum (within 6 weeks of delivery), patients with severe hypertension (2 measurements of SBP >=160 mm Hg or DBP >=110 mm Hg, 15 minutes apart), BP-lowering treatment to a target <160/110 mm Hg as soon as possible is recommended to reduce the risk of fatal maternal ICH.",
        "currentGrade": "Class 1, Level B-NR",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-66",
        "category": "Hypertensive Disorders of Pregnancy BP Control",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with HDP, including chronic hypertension in pregnancy, treatment with antihypertensive medication to a goal BP of <140/90 mm Hg is reasonable to reduce the risk of pregnancy-associated stroke.",
        "currentGrade": "Class 2a, Level C-LD",
        "drivingTrials": [
          "CHAP"
        ]
      },
      {
        "id": "rec-aha-primary-prevention-2024-67",
        "category": "Screening for Adverse Pregnancy Outcomes (APOs)",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In adults, screening for a history of certain adverse pregnancy outcomes (APOs), including HDP, preterm birth, gestational diabetes, and placental disorders, followed by subsequent evaluation and management of vascular risk factors, is recommended to reduce the risk of stroke.",
        "currentGrade": "Class 1, Level C-EO",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-68",
        "category": "Hypertension Evaluation after APOs",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with a history of HDP or other APOs, early evaluation and management of chronic hypertension are recommended to reduce the risk of stroke.",
        "currentGrade": "Class 1, Level C-LD",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-69",
        "category": "Endometriosis Screening",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In adults, screening for a history of endometriosis is reasonable to inform the risk of stroke.",
        "currentGrade": "Class 2a, Level B-NR",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-70",
        "category": "Vascular Risk Modification in Endometriosis",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In individuals with endometriosis, vascular risk factor evaluation and modification of vascular risk factors are reasonable to reduce the risk of stroke.",
        "currentGrade": "Class 2a, Level C-LD",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-71",
        "category": "Ethinyl Estradiol Dose Minimization in CHC",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In individuals considering CHC, lower doses of ethinyl estradiol are recommended to minimize potential increased stroke risk.",
        "currentGrade": "Class 1, Level B-NR",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-72",
        "category": "Contraception Shared Decision-Making in High-Risk Factors",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In individuals with specific stroke risk factors (ie, age >35 years, tobacco use, hypertension, or migraine with aura) who are considering contraception, shared decision-making is recommended to determine the best contraceptive choice to balance the risk of stroke from contraception and the risk of stroke with pregnancy.",
        "currentGrade": "Class 1, Level C-EO",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-73",
        "category": "Progestin-Only or Nonhormonal Contraception in High-Risk",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In individuals with specific stroke risk factors (ie, age >35 years, tobacco use, hypertension, or migraine with aura) who are considering contraception, progestin-only contraception or nonhormonal contraception is reasonable to prevent the increased stroke risk associated with estrogen-containing contraception.",
        "currentGrade": "Class 2a, Level C-LD",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-74",
        "category": "Premature/Early Menopause Screening",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "Screening for a history of premature ovarian failure (before 40 years of age) and early menopause (before 45 years of age) can be beneficial to inform the risk of stroke.",
        "currentGrade": "Class 1, Level B-NR",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-75",
        "category": "Risk Factor Evaluation in Premature/Early Menopause",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with premature ovarian failure (menopause before 40 years of age) or early menopause (before 45 years of age), evaluation and modification of vascular risk factors are recommended to reduce the elevated stroke risk in this population.",
        "currentGrade": "Class 1, Level C-LD",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-76",
        "category": "Menopausal Hormone Therapy Stroke Harm",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In women >=60 years of age, more than 10 years after natural menopause, or at elevated risk for CVD or stroke, oral estrogen-containing menopausal HT is associated with an excess risk of stroke and must be weighed against clinical benefits.",
        "currentGrade": "Class 3: Harm, Level A",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-77",
        "category": "Transgender Health Risk Factor Management",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In transgender women and gender-diverse individuals taking estrogens for gender affirmation, evaluation and modification of risk factors can be beneficial to reduce the risk of stroke.",
        "currentGrade": "Class 2a, Level C-LD",
        "drivingTrials": []
      },
      {
        "id": "rec-aha-primary-prevention-2024-78",
        "category": "Testosterone Therapy in Hypogonadal Men",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In men 45 to 80 years of age with confirmed hypogonadism who are considering testosterone therapy, initiation or continuation of testosterone replacement therapy is reasonable and does not increase the risk of stroke.",
        "currentGrade": "Class 2a, Level B-R",
        "drivingTrials": [
          "TRAVERSE"
        ]
      },
      {
        "id": "rec-aha-primary-prevention-2024-79",
        "category": "Anticoagulation in Left Ventricular Systolic Dysfunction",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with left ventricular systolic dysfunction (ejection fraction <=35%-40%) and no evidence of AF or left ventricular thrombus, anticoagulation is not indicated to prevent stroke and is associated with a higher bleeding risk.",
        "currentGrade": "Class 3: No Benefit, Level B-R",
        "drivingTrials": [
          "WARCEF",
          "COMMANDER HF"
        ]
      },
      {
        "id": "rec-aha-primary-prevention-2024-80",
        "category": "Aspirin for Diabetes or Vascular Risk Factors",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with diabetes or other common vascular risk factors and no prior stroke, the use of aspirin to prevent a first stroke is not well established.",
        "currentGrade": "Class 2b, Level A",
        "drivingTrials": [
          "ARRIVE",
          "JPPP"
        ]
      },
      {
        "id": "rec-aha-primary-prevention-2024-81",
        "category": "Ticagrelor in Stable Coronary Artery Disease",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with established, stable coronary artery disease and a low bleeding risk, the addition of ticagrelor to aspirin beyond 12 months for a period up to 3 years may be beneficial to reduce the rate of ischemic stroke.",
        "currentGrade": "Class 2b, Level B-R",
        "drivingTrials": [
          "PEGASUS-TIMI 54"
        ]
      },
      {
        "id": "rec-aha-primary-prevention-2024-82",
        "category": "Aspirin in Advanced Age",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In individuals >=70 years of age with at least 1 additional cardiovascular risk factor, the use of aspirin is not beneficial to prevent a first stroke.",
        "currentGrade": "Class 3: No Benefit, Level A",
        "drivingTrials": [
          "ASPREE",
          "JPPP"
        ]
      },
      {
        "id": "rec-aha-primary-prevention-2024-83",
        "category": "Aspirin in Chronic Kidney Disease",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with chronic kidney disease, the use of aspirin is not effective to prevent a first stroke.",
        "currentGrade": "Class 3: No Benefit, Level B-NR",
        "drivingTrials": []
      }
    ],
    "linkedScenarioIds": [],
    "fullTextStatus": "FULL_TEXT_PARSED"
  },
  {
    "id": "ahaasa-2023-aha-asa-guideline-for-the-management-of-patie",
    "society": "AHA/ASA",
    "year": 2023,
    "title": "2023 AHA/ASA Guideline for the Management of Patients With Aneurysmal Subarachnoid Hemorrhage",
    "officialUrl": "https://scholar.google.com/scholar?q=2023%20AHA%2FASA%20Guideline%20for%20the%20Management%20of%20Patients%20With%20Aneurysmal%20Subarachnoid%20Hemorrhage",
    "journalTarget": "Stroke",
    "documentType": "Clinical Practice Guideline",
    "publishDate": "2026-01-26",
    "subspecialty": "Stroke",
    "subspecialties": [
      "Stroke"
    ],
    "executiveSummary": "Hướng dẫn thực hành lâm sàng chính thức từ AHA/ASA. Bao gồm 36 khuyến cáo then chốt được trích xuất và kiểm chứng qua hệ thống AI Lõi NeuroGuide.",
    "executiveSummaryVi": "Hướng dẫn thực hành lâm sàng chính thức từ AHA/ASA. Bao gồm 36 khuyến cáo then chốt được trích xuất và kiểm chứng qua hệ thống AI Lõi NeuroGuide.",
    "topTakeaways": [
      "1. [Aneurysm Repair - Class 3: Harm, Level B-NR] For patients with aSAH from ruptured saccular aneurysms amenable to either primary coiling or clipping, stents or flow diverters should not be used to avoid higher risk of complications.",
      "2. [Medical Complications - Class 3: Harm, Level B-R] In patients with aSAH, induction of hypervolemia is potentially harmful because of the association with excess morbidity.",
      "3. [DCI Management - Class 3: Harm, Level B-R] For patients with aSAH at risk of DCI, prophylactic hemodynamic augmentation should not be performed to reduce iatrogenic patient harm.",
      "4. [Seizures - Class 3: Harm, Level B-NR] In patients with aSAH, phenytoin for seizure prevention and/or antiseizure prophylaxis is associated with excess morbidity and mortality.",
      "5. [Natural History - Class 3: No Benefit Level B-NR] In patients with aSAH who do not improve after correction of modifiable conditions and are deemed unsalvageable because of evidence of irreversible neurological injury, treatment of the aneurysm is not beneficial.",
      "6. [Rebleeding - Class 3: No Benefit Level A] In patients with aSAH, routine use of antifibrinolytic therapy is not useful to improve functional outcome.",
      "7. [Anesthetic Care - Class 3: No Benefit Level B-R] In patients with good-grade aSAH, the routine use of induced mild hypothermia during aneurysm surgery is not beneficial.",
      "8. [Vasospasm & DCI Prophylaxis - Class 3: No Benefit Level A] In patients with aSAH, routine use of statin therapy to improve outcomes is not recommended.",
      "9. [Vasospasm & DCI Prophylaxis - Class 3: No Benefit Level A] In patients with aSAH, routine use of intravenous magnesium to improve neurological outcomes is not recommended.",
      "10. [Aneurysm Repair - Class 1, Level A] For patients with good-grade aSAH from ruptured aneurysms of the anterior circulation equally suitable for both primary coiling and clipping, primary coiling is recommended in preference to clipping to improve 1-year functional outcome."
    ],
    "allPracticeChanges": [
      {
        "id": "chg-ahaasa-2023-aha-asa-guideline-for-the-management-of-patie-1",
        "category": "Clinical Management",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with aSAH, use of clinical scales (eg, the Hunt and Hess [HH] grade or World Federation of Neurosurgical Societies [WFNS] grade) is recommended to determine initial clinical severity and predict outcome.",
        "currentGrade": "Class Class 1, Level B-NR",
        "drivingTrials": [
          "Mocco et al. 2006",
          "Rosen & Macdonald 2004",
          "Predictive models: VASOGRADE, HAIR, SAHIT score (Jaja et al. BMJ 2018)"
        ]
      },
      {
        "id": "chg-ahaasa-2023-aha-asa-guideline-for-the-management-of-patie-2",
        "category": "Clinical Management",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with high-grade aSAH, aneurysm treatment is reasonable, after careful discussion of likely prognosis with family members, to optimize patient outcome.",
        "currentGrade": "Class Class 2a, Level B-NR",
        "drivingTrials": [
          "Mocco et al. 2006 (40% favorable outcome at 12 mo in HH grade 4-5)",
          "Meta-analysis by Zhao et al. 2017 (85 studies, 4506 poor-grade patients; 39% good outcomes)"
        ]
      },
      {
        "id": "chg-ahaasa-2023-aha-asa-guideline-for-the-management-of-patie-3",
        "category": "Clinical Management",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with aSAH who do not improve after correction of modifiable conditions and are deemed unsalvageable because of evidence of irreversible neurological injury, treatment of the aneurysm is not beneficial.",
        "currentGrade": "Class Class 3: No Benefit Level B-NR, Level B-NR",
        "drivingTrials": [
          "Juvela & Siironen 2012",
          "Claassen et al. 2002 (Irreversible early brain injury/global cerebral edema)"
        ]
      },
      {
        "id": "chg-ahaasa-2023-aha-asa-guideline-for-the-management-of-patie-4",
        "category": "Clinical Management",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with acute onset of severe headache, prompt diagnostic workup and evaluation are recommended to diagnose/exclude aSAH and minimize morbidity and mortality.",
        "currentGrade": "Class Class 1, Level B-NR",
        "drivingTrials": [
          "Beck et al. 2006",
          "Kowalski et al. 2004",
          "Perry et al. 2013",
          "Polmear 2003 (Sentinel headache recognition)"
        ]
      },
      {
        "id": "chg-ahaasa-2023-aha-asa-guideline-for-the-management-of-patie-5",
        "category": "Clinical Management",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with acute onset of severe headache who present >6 hours from symptom onset or who have a new neurological deficit, a noncontrast head CT and, if negative for aSAH, lumbar puncture (LP) should be performed to diagnose/exclude aSAH.",
        "currentGrade": "Class Class 1, Level B-NR",
        "drivingTrials": [
          "Kameda-Smith et al. 2021",
          "Walton et al. 2022 (Spectrophotometric xanthochromia: 100% sensitivity, 95.2% specificity)"
        ]
      },
      {
        "id": "chg-ahaasa-2023-aha-asa-guideline-for-the-management-of-patie-6",
        "category": "Clinical Management",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with acute onset of severe headache who present <6 hours from symptom onset and without new neurological deficit, a noncontrast head CT performed on a high-quality scanner and interpreted by a board-certified neuroradiologist is reasonable to diagnose/exclude aSAH.",
        "currentGrade": "Class Class 2a, Level B-NR",
        "drivingTrials": [
          "Meta-analysis by Dubosh et al. 2016 (8907 patients",
          "CT <6h sensitivity 98.7%, specificity 99.9%)",
          "Perry et al. BMJ 2011",
          "Backes et al. 2012",
          "Blok et al. 2015"
        ]
      },
      {
        "id": "chg-ahaasa-2023-aha-asa-guideline-for-the-management-of-patie-7",
        "category": "Clinical Management",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with acute onset of severe headache without a new neurological deficit, application of the Ottawa SAH Rule may be reasonable to identify those at high risk for aSAH.",
        "currentGrade": "Class Class 2b, Level B-NR",
        "drivingTrials": [
          "Perry et al. JAMA 2013",
          "Bellolio et al. 2015",
          "Perry et al. CMAJ 2017 (100% sensitivity, 7.6%–15.3% specificity)"
        ]
      },
      {
        "id": "chg-ahaasa-2023-aha-asa-guideline-for-the-management-of-patie-8",
        "category": "Clinical Management",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with spontaneous SAH with high level of concern for aneurysmal source and a negative or inconclusive CT angiography (CTA), digital subtraction angiography (DSA) is indicated to diagnose/exclude cerebral aneurysm(s).",
        "currentGrade": "Class Class 1, Level B-NR",
        "drivingTrials": [
          "Agid et al. 2010",
          "Catapano et al. 2020",
          "Heit et al. 2016",
          "Howard et al. 2019"
        ]
      },
      {
        "id": "chg-ahaasa-2023-aha-asa-guideline-for-the-management-of-patie-9",
        "category": "Clinical Management",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "For patients with aSAH, timely transfer from hospitals with low case volume to higher-volume centers with multidisciplinary neurointensive care services, comprehensive stroke center capabilities, and experienced cerebrovascular surgeons/neuroendovascular interventionalists is recommended to improve outcomes.",
        "currentGrade": "Class Class 1, Level B-NR",
        "drivingTrials": [
          "Lindekleiv et al. 2015",
          "Kurogi et al. 2020",
          "Leifer et al. 2021",
          "Goertz et al. 2020",
          "Gatollari et al. 2017",
          "Lindgren et al. 2019"
        ]
      },
      {
        "id": "chg-ahaasa-2023-aha-asa-guideline-for-the-management-of-patie-10",
        "category": "Clinical Management",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "For patients with aSAH, care should be provided in a dedicated neurocritical care unit by a multidisciplinary team.",
        "currentGrade": "Class Class 1, Level B-NR",
        "drivingTrials": [
          "PRINCE Study (Venkatasubba Rao et al. 2020",
          "Suarez et al. 2020)"
        ]
      },
      {
        "id": "chg-ahaasa-2023-aha-asa-guideline-for-the-management-of-patie-11",
        "category": "Clinical Management",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with aSAH who are receiving anticoagulants, emergency anticoagulation reversal with appropriate reversal agents should be performed to prevent rebleeding.",
        "currentGrade": "Class Class 1, Level C-EO",
        "drivingTrials": [
          "Greenberg et al. 2022 (AHA/ASA ICH Guideline)",
          "Frontera et al. 2016 (NCS/SCCM Antithrombotic Reversal Guidelines)"
        ]
      },
      {
        "id": "chg-ahaasa-2023-aha-asa-guideline-for-the-management-of-patie-12",
        "category": "Clinical Management",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with aSAH, routine use of antifibrinolytic therapy is not useful to improve functional outcome.",
        "currentGrade": "Class Class 3: No Benefit Level A, Level A",
        "drivingTrials": [
          "ULTRA Trial (Post et al. Lancet 2021: Ultra-early tranexamic acid showed no significant reduction in rebleeding and no functional outcome improvement)",
          "Shi et al. 2021",
          "Baharoglu et al. Cochrane 2013"
        ]
      },
      {
        "id": "chg-ahaasa-2023-aha-asa-guideline-for-the-management-of-patie-13",
        "category": "Clinical Management",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "For patients with aSAH, surgical or endovascular treatment of the ruptured aneurysm should be performed as early as feasible after presentation, preferably within 24 hours of onset, to improve outcome.",
        "currentGrade": "Class Class 1, Level B-NR",
        "drivingTrials": [
          "Ohman & Heiskanen 1989 (RCT of early vs late surgery)",
          "Meta-analyses: Rawal et al. 2017, Yao et al. 2017, Oudshoorn et al. 2014, Zhao et al. 2017"
        ]
      },
      {
        "id": "chg-ahaasa-2023-aha-asa-guideline-for-the-management-of-patie-14",
        "category": "Clinical Management",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "For patients with aSAH from ruptured aneurysms of the posterior circulation that are amenable to coiling, coiling is indicated in preference to clipping to improve outcome.",
        "currentGrade": "Class Class 1, Level B-R",
        "drivingTrials": [
          "Cochrane Review (Lindgren et al. 2018",
          "RR 0.41 for death/dependency)",
          "BRAT Trial (Spetzler et al. 2013, 2015)"
        ]
      },
      {
        "id": "chg-ahaasa-2023-aha-asa-guideline-for-the-management-of-patie-15",
        "category": "Clinical Management",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "For patients with aSAH deemed salvageable and with depressed level of consciousness due to large intraparenchymal hematoma, emergency clot evacuation should be performed to reduce mortality.",
        "currentGrade": "Class Class 1, Level B-R",
        "drivingTrials": [
          "Heiskanen et al. 1988 (RCT showing 27% vs 80% mortality benefit for clot evacuation)",
          "Guresir et al. 2008"
        ]
      },
      {
        "id": "chg-ahaasa-2023-aha-asa-guideline-for-the-management-of-patie-16",
        "category": "Clinical Management",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "For patients with good-grade aSAH from ruptured aneurysms of the anterior circulation equally suitable for both primary coiling and clipping, primary coiling is recommended in preference to clipping to improve 1-year functional outcome.",
        "currentGrade": "Class Class 1, Level A",
        "drivingTrials": [
          "ISAT Trial (Molyneux et al. Lancet 2002, 2005",
          "RR 0.77 for death/dependency at 1 yr)",
          "Cochrane Review (Lindgren et al. 2018)"
        ]
      },
      {
        "id": "chg-ahaasa-2023-aha-asa-guideline-for-the-management-of-patie-17",
        "category": "Clinical Management",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "For patients with aSAH from ruptured saccular aneurysms amenable to either primary coiling or clipping, stents or flow diverters should not be used to avoid higher risk of complications.",
        "currentGrade": "Class Class 3: Harm, Level B-NR",
        "drivingTrials": [
          "Bsat et al. 2020 & Cagnazzo et al. 2020 (Higher risk of ventriculostomy-related hemorrhagic complications on dual antiplatelets)"
        ]
      },
      {
        "id": "chg-ahaasa-2023-aha-asa-guideline-for-the-management-of-patie-18",
        "category": "Clinical Management",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with aSAH, the intraoperative use of mannitol or hypertonic saline can be effective in reducing ICP and cerebral edema.",
        "currentGrade": "Class Class 2a, Level B-R",
        "drivingTrials": [
          "Al-Rawi et al. 2010",
          "Pasarikovski et al. 2017"
        ]
      },
      {
        "id": "chg-ahaasa-2023-aha-asa-guideline-for-the-management-of-patie-19",
        "category": "Clinical Management",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with good-grade aSAH, the routine use of induced mild hypothermia during aneurysm surgery is not beneficial.",
        "currentGrade": "Class Class 3: No Benefit Level B-R, Level B-R",
        "drivingTrials": [
          "IHAST Trial (Todd et al. N Engl J Med 2005; 1000 patients, no outcome improvement)",
          "Anderson et al. 2006"
        ]
      },
      {
        "id": "chg-ahaasa-2023-aha-asa-guideline-for-the-management-of-patie-20",
        "category": "Clinical Management",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with aSAH, close monitoring and goal-directed treatment of volume status are reasonable to maintain euvolemia.",
        "currentGrade": "Class Class 2a, Level B-R",
        "drivingTrials": [
          "Mutoh et al. 2014",
          "Chui et al. 2022",
          "Hoff et al. 2009"
        ]
      },
      {
        "id": "chg-ahaasa-2023-aha-asa-guideline-for-the-management-of-patie-21",
        "category": "Clinical Management",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with aSAH, use of mineralocorticoids is reasonable to treat natriuresis and hyponatremia.",
        "currentGrade": "Class Class 2a, Level B-R",
        "drivingTrials": [
          "Fludrocortisone RCTs: Hasan et al. 1989, Mistry et al. 2016"
        ]
      },
      {
        "id": "chg-ahaasa-2023-aha-asa-guideline-for-the-management-of-patie-22",
        "category": "Clinical Management",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with aSAH, induction of hypervolemia is potentially harmful because of the association with excess morbidity.",
        "currentGrade": "Class Class 3: Harm, Level B-R",
        "drivingTrials": [
          "Tagami et al. 2014",
          "Egge et al. 2001 (Volume expansion increases medical complications without outcome benefit)"
        ]
      },
      {
        "id": "chg-ahaasa-2023-aha-asa-guideline-for-the-management-of-patie-23",
        "category": "Clinical Management",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with aSAH whose ruptured aneurysm has been secured, pharmacological or mechanical venous thromboembolism (VTE) prophylaxis is recommended to reduce the risk for VTE.",
        "currentGrade": "Class Class 1, Level C-LD",
        "drivingTrials": [
          "CLOTS 3 Trial (Lancet 2013)",
          "Manoel et al. 2014"
        ]
      },
      {
        "id": "chg-ahaasa-2023-aha-asa-guideline-for-the-management-of-patie-24",
        "category": "Clinical Management",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with aSAH, early initiation of enteral nimodipine is beneficial in preventing DCI and improving functional outcomes.",
        "currentGrade": "Class Class 1, Level A",
        "drivingTrials": [
          "Allen et al. NEJM 1983",
          "Cochrane Meta-analysis (Dorhout Mees et al. 2007, 16 trials, 3361 patients)",
          "Samseethong et al. 2018 & Hernandez-Duran et al. 2019"
        ]
      },
      {
        "id": "chg-ahaasa-2023-aha-asa-guideline-for-the-management-of-patie-25",
        "category": "Clinical Management",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with aSAH, routine use of statin therapy to improve outcomes is not recommended.",
        "currentGrade": "Class Class 3: No Benefit Level A, Level A",
        "drivingTrials": [
          "Meta-analyses: Shen et al. 2017 & Vergouwen et al. 2010 (No significant benefit in DCI or mortality)"
        ]
      },
      {
        "id": "chg-ahaasa-2023-aha-asa-guideline-for-the-management-of-patie-26",
        "category": "Clinical Management",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with aSAH, routine use of intravenous magnesium to improve neurological outcomes is not recommended.",
        "currentGrade": "Class Class 3: No Benefit Level A, Level A",
        "drivingTrials": [
          "IMASH Trial (Wong et al. 2010)",
          "Jeon et al. 2012",
          "Reddy et al. 2014"
        ]
      },
      {
        "id": "chg-ahaasa-2023-aha-asa-guideline-for-the-management-of-patie-27",
        "category": "Clinical Management",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "For patients with aSAH at risk of DCI, prophylactic hemodynamic augmentation should not be performed to reduce iatrogenic patient harm.",
        "currentGrade": "Class Class 3: Harm, Level B-R",
        "drivingTrials": [
          "IMPROVES Trial (Togashi et al. 2015)",
          "Tagami et al. 2014",
          "Loan et al. 2018"
        ]
      },
      {
        "id": "chg-ahaasa-2023-aha-asa-guideline-for-the-management-of-patie-28",
        "category": "Clinical Management",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with aSAH and symptomatic vasospasm, elevating systolic BP values may be reasonable to reduce the progression and severity of DCI.",
        "currentGrade": "Class Class 2b, Level B-NR",
        "drivingTrials": [
          "HIMALAIA Trial (Gathier et al. 2015, 2018)",
          "Haegens et al. 2018",
          "Roy et al. 2017"
        ]
      },
      {
        "id": "chg-ahaasa-2023-aha-asa-guideline-for-the-management-of-patie-29",
        "category": "Clinical Management",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with aSAH and acute symptomatic hydrocephalus, urgent CSF diversion (EVD and/or lumbar drainage) should be performed to improve neurological outcome.",
        "currentGrade": "Class Class 1, Level B-NR",
        "drivingTrials": [
          "Ransom et al. 2007",
          "McIver et al. 2002",
          "Rajshekhar & Harbaugh 1992"
        ]
      },
      {
        "id": "chg-ahaasa-2023-aha-asa-guideline-for-the-management-of-patie-30",
        "category": "Clinical Management",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with aSAH and hydrocephalus who require an EVD, implementation and adherence to an EVD bundled protocol that addresses insertion, management, education, and monitoring are recommended to reduce complication and infection rates.",
        "currentGrade": "Class Class 1, Level B-NR",
        "drivingTrials": [
          "Flint et al. 2013, 2017 (Infection rates reduced from up to 37% to 0%–9%)",
          "Dasic et al. 2006",
          "Hepburn-Smith et al. 2016"
        ]
      },
      {
        "id": "chg-ahaasa-2023-aha-asa-guideline-for-the-management-of-patie-31",
        "category": "Clinical Management",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with aSAH and either fluctuating neurological examination, depressed mental state, ruptured MCA aneurysm, high-grade SAH, ICH, hydrocephalus, or cortical infarction, cEEG monitoring is reasonable to detect seizures.",
        "currentGrade": "Class Class 2a, Level B-NR",
        "drivingTrials": [
          "Kondziella et al. 2015",
          "O'Connor et al. 2014"
        ]
      },
      {
        "id": "chg-ahaasa-2023-aha-asa-guideline-for-the-management-of-patie-32",
        "category": "Clinical Management",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with aSAH and high-seizure-risk features (ie, ruptured MCA aneurysm, high-grade SAH, ICH, hydrocephalus, and cortical infarction), use of prophylactic antiseizure medication(s) may be reasonable to prevent seizures.",
        "currentGrade": "Class Class 2b, Level B-NR",
        "drivingTrials": [
          "Marigold et al. Cochrane 2013",
          "Panczykowski et al. 2016",
          "Chen et al. 2021"
        ]
      },
      {
        "id": "chg-ahaasa-2023-aha-asa-guideline-for-the-management-of-patie-33",
        "category": "Clinical Management",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with aSAH, phenytoin for seizure prevention and/or antiseizure prophylaxis is associated with excess morbidity and mortality.",
        "currentGrade": "Class Class 3: Harm, Level B-NR",
        "drivingTrials": [
          "Naidech et al. Stroke 2005 (Phenytoin associated with functional and cognitive disability)",
          "Szaflarski et al. 2010",
          "Radic et al. 2014"
        ]
      },
      {
        "id": "chg-ahaasa-2023-aha-asa-guideline-for-the-management-of-patie-34",
        "category": "Clinical Management",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with aSAH who present with seizures, treatment with antiseizure medications for ≤7 days is reasonable to reduce seizure-related complications in the perioperative period.",
        "currentGrade": "Class Class 2a, Level B-NR",
        "drivingTrials": [
          "Raper et al. 2013",
          "Murphy-Human et al. 2011",
          "Claassen et al. 2003"
        ]
      },
      {
        "id": "chg-ahaasa-2023-aha-asa-guideline-for-the-management-of-patie-35",
        "category": "Clinical Management",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with aSAH, an early multidisciplinary team–based approach to treatment and rehabilitation is recommended to reduce LOS and identify discharge needs.",
        "currentGrade": "Class Class 1, Level B-NR",
        "drivingTrials": [
          "Alaraj et al. 2017 (Multidisciplinary huddles reduced hospital LOS from 21.6 to 14.1 days)"
        ]
      },
      {
        "id": "chg-ahaasa-2023-aha-asa-guideline-for-the-management-of-patie-36",
        "category": "Clinical Management",
        "topic": "Recommendation",
        "changeType": "STANDARD",
        "currentText": "In patients with aSAH who have undergone aneurysm repair, perioperative cerebrovascular imaging is recommended to identify remnants or recurrence of the aneurysm that may require further treatment.",
        "currentGrade": "Class Class 1, Level B-NR",
        "drivingTrials": [
          "ISAT Trial (Molyneux et al. 2002, 2005, 2015; 30-day target aneurysm rebleed rate 1.9% coiled vs 0.6% clipped)"
        ]
      }
    ],
    "linkedScenarioIds": [],
    "fullTextStatus": "FULL_TEXT_PARSED"
  }
];

export const MOCK_RECOMMENDATION_ATOMS: RecommendationAtom[] = [
  {
    "id": "rec-aha-2026-tnk",
    "scenarioId": "ais-ivt-tenecteplase-4.5h",
    "guidelineDocId": "aha-ais-2026",
    "society": "AHA/ASA",
    "year": 2026,
    "originalGrade": "Class I, Level of Evidence A",
    "normalizedTier": 1,
    "recommendationText": "Tenecteplase (0.25 mg/kg single bolus, maximum 25 mg) is recommended as a safe and effective alternative to Alteplase for eligible patients with acute ischemic stroke within 4.5 hours of onset.",
    "eligibilityCriteria": "Onset <4.5h, exclusion of intracranial hemorrhage on CT/MRI, SBP <185/110 mmHg, INR ≤1.7.",
    "citedTrials": [
      "AcT (Lancet 2022)",
      "TRACE-2 (Lancet 2023)",
      "ORIGINAL (Stroke 2024)"
    ],
    "isLatestForSociety": true,
    "notes": "Administered as a single 5-10 second IV bolus, significantly reducing door-to-needle time by 15-20 minutes compared to Alteplase."
  },
  {
    "id": "rec-eso-2024-tnk",
    "scenarioId": "ais-ivt-tenecteplase-4.5h",
    "guidelineDocId": "eso-ais-2024",
    "society": "ESO",
    "year": 2024,
    "originalGrade": "Strong recommendation FOR, High quality evidence",
    "normalizedTier": 1,
    "recommendationText": "ESO strongly recommends Tenecteplase 0.25 mg/kg (maximum 25 mg) over Alteplase 0.9 mg/kg in patients with acute ischemic stroke presenting within 4.5 hours.",
    "eligibilityCriteria": "Applies to both small branch occlusions and large vessel occlusions eligible for mechanical thrombectomy.",
    "citedTrials": [
      "AcT",
      "TRACE-2",
      "NOR-TEST 2A"
    ],
    "isLatestForSociety": true,
    "notes": "Highest tier recommendation within the European GRADE framework."
  },
  {
    "id": "rec-vn-2025-tnk",
    "scenarioId": "ais-ivt-tenecteplase-4.5h",
    "guidelineDocId": "vn-moh-stroke-2025",
    "society": "VN-MOH",
    "year": 2025,
    "originalGrade": "Khuyến cáo Áp dụng Thực hành (Mức độ A)",
    "normalizedTier": 1,
    "recommendationText": "Bộ Y tế & Hội Đột quỵ Việt Nam thống nhất khuyến cáo sử dụng Tenecteplase 0.25 mg/kg (tối đa 25mg) bolus tĩnh mạch 5 giây, ưu tiên áp dụng tại các cơ sở chuyển viện can thiệp (Drip and Ship).",
    "eligibilityCriteria": "Tuân thủ bảng kiểm an toàn tiêu sợi huyết quốc gia của Bộ Y tế.",
    "citedTrials": [
      "AcT",
      "TRACE-2",
      "Dữ liệu đa trung tâm Việt Nam"
    ],
    "isLatestForSociety": true,
    "notes": "Đã có trong danh mục hướng dẫn điều trị chuẩn tại các bệnh viện tuyến tỉnh và trung ương, được BHYT chi trả."
  },
  {
    "id": "rec-aha-2026-largecore",
    "scenarioId": "ais-large-core-evt-aspects-3-5",
    "guidelineDocId": "aha-ais-2026",
    "society": "AHA/ASA",
    "year": 2026,
    "originalGrade": "Class I, Level of Evidence A",
    "normalizedTier": 1,
    "recommendationText": "Endovascular thrombectomy combined with medical management is strongly recommended for patients with ICA or MCA-M1 occlusion presenting with ASPECTS 3–5 or core volume ≥50 mL within 24 hours.",
    "eligibilityCriteria": "ASPECTS 3–5 on NCCT or MRI DWI; baseline mRS 0–1; absence of intracranial hemorrhage.",
    "citedTrials": [
      "SELECT2 (NEJM 2023)",
      "ANGEL-ASPECT (NEJM 2023)",
      "TENSION (Lancet 2023)"
    ],
    "isLatestForSociety": true,
    "notes": "Number needed to treat (NNT) for functional independence is approximately 5 to 6."
  },
  {
    "id": "rec-eso-2024-largecore",
    "scenarioId": "ais-large-core-evt-aspects-3-5",
    "guidelineDocId": "eso-ais-2024",
    "society": "ESO",
    "year": 2024,
    "originalGrade": "Strong recommendation FOR, High quality evidence",
    "normalizedTier": 1,
    "recommendationText": "We strongly recommend mechanical thrombectomy in patients with acute ischemic stroke and large infarct core (ASPECTS 3–5 or volume ≥50 mL) within 24 hours.",
    "eligibilityCriteria": "Proximal anterior circulation occlusion (ICA or M1/M2), age ≥18.",
    "citedTrials": [
      "SELECT2",
      "ANGEL-ASPECT",
      "TENSION",
      "LASTE"
    ],
    "isLatestForSociety": true,
    "notes": "Clinicians should not withhold thrombectomy solely on the basis of large core imaging in early arrivers."
  },
  {
    "id": "rec-vn-2025-largecore",
    "scenarioId": "ais-large-core-evt-aspects-3-5",
    "guidelineDocId": "vn-moh-stroke-2025",
    "society": "VN-MOH",
    "year": 2025,
    "originalGrade": "Khuyến cáo Thực hiện (Mức độ A)",
    "normalizedTier": 1,
    "recommendationText": "Khuyến cáo thực hiện can thiệp lấy huyết khối cơ học tại các trung tâm đột quỵ có năng lực hồi sức thần kinh cho bệnh nhân có ASPECTS 3–5.",
    "eligibilityCriteria": "Được đánh giá cẩn thận nguy cơ xuất huyết chuyển dạng, kiểm soát huyết áp chặt sau can thiệp.",
    "citedTrials": [
      "SELECT2",
      "TENSION",
      "Kinh nghiệm lâm sàng Bệnh viện Bạch Mai, Chợ Rẫy, 115"
    ],
    "isLatestForSociety": true,
    "notes": "Cần theo dõi sát phù não ác tính trong 72 giờ đầu sau can thiệp."
  },
  {
    "id": "rec-aha-2022-ich-bp",
    "scenarioId": "ich-acute-bp-lowering",
    "guidelineDocId": "aha-ich-2022",
    "society": "AHA/ASA",
    "year": 2022,
    "originalGrade": "Class IIa, Level of Evidence B-R",
    "normalizedTier": 2,
    "recommendationText": "In patients with acute spontaneous ICH presenting with SBP between 150 and 220 mmHg, acute lowering to a target SBP of 130–140 mmHg within hours is safe and reasonable to improve functional outcomes.",
    "eligibilityCriteria": "Onset <6h; avoid acute SBP lowering >60 mmHg within 1 hour or lowering SBP below 130 mmHg.",
    "citedTrials": [
      "INTERACT2 (NEJM 2013)",
      "ATACH-2 (NEJM 2016)"
    ],
    "isLatestForSociety": true,
    "notes": "Continuous IV infusions such as Nicardipine are preferred for predictable titration."
  },
  {
    "id": "rec-eso-2021-ich-bp",
    "scenarioId": "ich-acute-bp-lowering",
    "guidelineDocId": "eso-ich-2021",
    "society": "ESO",
    "year": 2021,
    "originalGrade": "Weak recommendation FOR, Moderate quality",
    "normalizedTier": 2,
    "recommendationText": "Lower systolic blood pressure below 140 mmHg (while avoiding SBP <130 mmHg) within the first 24 hours of spontaneous ICH onset.",
    "eligibilityCriteria": "Absence of impending brain herniation or massive intracranial pressure crisis.",
    "citedTrials": [
      "INTERACT2",
      "ATACH-2 Meta-analysis"
    ],
    "isLatestForSociety": true
  },
  {
    "id": "rec-vn-2025-ich-bp",
    "scenarioId": "ich-acute-bp-lowering",
    "guidelineDocId": "vn-moh-stroke-2025",
    "society": "VN-MOH",
    "year": 2025,
    "originalGrade": "Khuyến cáo Áp dụng (Mức độ IIa)",
    "normalizedTier": 2,
    "recommendationText": "Hạ huyết áp tâm thu nhanh chóng đạt mục tiêu 130–140 mmHg trong 1–2 giờ đầu bằng Nicardipine truyền tĩnh mạch và duy trì ổn định.",
    "eligibilityCriteria": "Theo dõi huyết áp động mạch xâm lấn hoặc đo tự động mỗi 5-15 phút.",
    "citedTrials": [
      "INTERACT2",
      "Phác đồ Bộ Y tế"
    ],
    "isLatestForSociety": true
  },
  {
    "id": "rec-eso-2026-asah-coiling",
    "scenarioId": "asah-aneurysm-coiling-vs-clipping",
    "guidelineDocId": "eso-asah-2026",
    "society": "ESO",
    "year": 2026,
    "originalGrade": "Strong recommendation FOR, High quality evidence",
    "normalizedTier": 1,
    "recommendationText": "In patients with aneurysmal subarachnoid haemorrhage in good clinical condition (WFNS I–III) and a ruptured aneurysm equally suitable for both endovascular and neurosurgical treatment, we recommend regular endovascular coiling (without adjunctive devices) as the preferred treatment strategy over microsurgical clipping to minimize 1-year poor functional outcome and disability.",
    "eligibilityCriteria": "WFNS grades I–III; aneurysm morphology suitable for endovascular occlusion without required adjunctive stenting.",
    "citedTrials": [
      "ISAT (Lancet)",
      "ISAT 10-Year Follow-up",
      "Cochrane Systematic Review 2025"
    ],
    "isLatestForSociety": true,
    "notes": "Landmark joint recommendation from ESO, EANS, and ESMINT published in European Stroke Journal May 2026 (DOI: 10.1093/esj/aakag043)."
  },
  {
    "id": "rec-aha-2023-asah-coiling",
    "scenarioId": "asah-aneurysm-coiling-vs-clipping",
    "guidelineDocId": "eso-asah-2026",
    "society": "AHA/ASA",
    "year": 2023,
    "originalGrade": "Class I, Level of Evidence B-R",
    "normalizedTier": 1,
    "recommendationText": "For patients with ruptured aneurysms judged to be technically amenable to both endovascular coiling and surgical clipping, endovascular coiling should be considered to improve 1-year functional independence.",
    "eligibilityCriteria": "Patients presenting within acute window without large parenchymal hematoma (>50 mL).",
    "citedTrials": [
      "ISAT",
      "BRAT Trial"
    ],
    "isLatestForSociety": true,
    "notes": "Microsurgical clipping remains preferred for MCA bifurcation aneurysms or wide-neck aneurysms with branch vessels."
  },
  {
    "id": "rec-vn-2025-asah-coiling",
    "scenarioId": "asah-aneurysm-coiling-vs-clipping",
    "guidelineDocId": "vn-moh-stroke-2025",
    "society": "VN-MOH",
    "year": 2025,
    "originalGrade": "Khuyến cáo Thực hiện (Mức độ A)",
    "normalizedTier": 1,
    "recommendationText": "Khuyến cáo ưu tiên can thiệp nút túi phình bằng vòng xoắn kim loại (Coil) qua đường nội mạch cho bệnh nhân xuất huyết dưới nhện do vỡ túi phình tại các trung tâm có đơn vị can thiệp mạch não.",
    "eligibilityCriteria": "Thực hiện cấp cứu càng sớm càng tốt (trong vòng 24 giờ đầu), kết hợp dùng Nimodipine đường uống 60mg mỗi 4 giờ.",
    "citedTrials": [
      "Dữ liệu can thiệp túi phình BV Bạch Mai, Chợ Rẫy, 115"
    ],
    "isLatestForSociety": true,
    "notes": "BHYT chi trả cho vật tư can thiệp coil và can thiệp mạch não."
  }
];

export const MOCK_CONFERENCE_EVENTS: ConferenceEvent[] = [
  {
    "id": "conf-wsc-2026",
    "acronym": "WSC 2026",
    "name": "18th World Stroke Congress (Joint Meeting with Korean Stroke Society)",
    "year": 2026,
    "startDate": "2026-10-22",
    "endDate": "2026-10-31",
    "subspecialties": [
      "Stroke"
    ],
    "dates": "October 22–25, 2026 (Live Podium Reports)",
    "location": "Seoul, South Korea (COEX)",
    "status": "LIVE",
    "officialUrl": "https://worldstrokecongress.org",
    "executiveSummary": "The flagship global stroke event hosted by the World Stroke Organization in Seoul, South Korea. Live podium reporting of practice-changing late-breaking trials, including distal medium vessel occlusion thrombectomy, artificial intelligence telestroke networks, and mobile stroke units in Asian healthcare systems.",
    "stats": {
      "totalLateBreakingTrials": 16,
      "positiveTrials": 12,
      "practiceChangingCount": 6
    },
    "lateBreakingTrials": [
      {
        "id": "trial-wsc-mevo",
        "trialAcronym": "DISTAL-EVT",
        "title": "Randomized Trial of Endovascular Thrombectomy for Distal Middle and Anterior Cerebral Artery Occlusions",
        "studyDesign": "Phase 3 RCT",
        "subspecialty": "Stroke",
        "verdict": "POSITIVE",
        "isPracticeChanging": true,
        "publishedJournal": "NEJM",
        "fullTextUrl": "https://www.nejm.org",
        "populationSummary": "N = 490 patients with acute ischemic stroke due to isolated distal MCA (M2/M3) or ACA (A2/A3) occlusions presenting within 12 hours.",
        "interventionGroup": "Mechanical thrombectomy using micro-stent retrievers & micro-aspiration catheters + standard medical care.",
        "controlGroup": "Best medical management alone (including IV thrombolysis when eligible).",
        "primaryOutcome": "90-day functional independence (mRS 0–2): 54.2% vs 42.1% (aOR 1.63; 95% CI 1.14–2.32; p = 0.007).",
        "safetyOutcome": "Symptomatic intracranial hemorrhage (sICH): 3.2% vs 2.1% (p = 0.45); vessel rupture: 1.6%.",
        "bottomLineTakeaway": "Endovascular thrombectomy significantly improves functional independence in patients with acute distal medium vessel occlusions without excess procedural hemorrhage.",
        "impactedScenarioId": "ais-large-core-evt-aspects-3-5",
        "guidelineImpactWarning": "Anticipated to upgrade current weak recommendation for distal thrombectomy to Class I / Strong Recommendation across ESO and AHA guidelines."
      },
      {
        "id": "trial-wsc-msu-asia",
        "trialAcronym": "ASIA-MSU",
        "title": "Impact of Mobile Stroke Unit Deployment on 90-Day Disability in High-Density Asian Megacities",
        "studyDesign": "Phase 3 RCT",
        "subspecialty": "Stroke",
        "verdict": "POSITIVE",
        "isPracticeChanging": true,
        "publishedJournal": "Lancet",
        "populationSummary": "N = 1,850 hyperacute stroke alerts randomized to Mobile Stroke Unit (CT + telestroke on ambulance) vs standard EMS dispatch.",
        "interventionGroup": "MSU dispatch with prehospital point-of-care CT and immediate IV Tenecteplase bolus.",
        "controlGroup": "Standard conventional ambulance with in-hospital emergency department triage.",
        "primaryOutcome": "Golden hour thrombolysis (<60 min from onset): 34.5% vs 3.2% (p < 0.001); mRS 0–1 at 90 days: 48.6% vs 37.8% (p = 0.002).",
        "safetyOutcome": "sICH: 2.8% vs 2.9% (equivalent).",
        "bottomLineTakeaway": "Prehospital mobile stroke units achieve dramatic 40-minute reductions in door-to-needle time and substantially higher 90-day functional recovery in densely populated urban centers.",
        "impactedScenarioId": "ais-ivt-tenecteplase-4.5h",
        "guidelineImpactWarning": "Reinforces prehospital ultra-early Tenecteplase bolus administration within 60 minutes of symptom onset."
      },
      {
        "id": "trial-wsc-prevent-doac",
        "trialAcronym": "PREVENT-DOAC",
        "title": "Immediate (Day 1) vs. Early (Day 3-4) DOAC Initiation in Patients with Acute Mild-to-Moderate Ischemic Stroke and Atrial Fibrillation",
        "studyDesign": "Phase 3 RCT",
        "subspecialty": "Stroke",
        "verdict": "POSITIVE",
        "isPracticeChanging": true,
        "publishedJournal": "Stroke",
        "populationSummary": "N = 2,200 patients with acute ischemic stroke and nonvalvular AF randomized within 24 hours of symptom onset.",
        "interventionGroup": "Immediate DOAC initiation within 24 hours (Day 1).",
        "controlGroup": "Early DOAC initiation at 72–96 hours (Days 3–4).",
        "primaryOutcome": "Composite of recurrent ischemic stroke, systemic embolism, or major bleeding within 30 days: 2.1% vs 2.4% (Non-inferior, p < 0.001).",
        "safetyOutcome": "Symptomatic intracranial hemorrhage: 0.2% vs 0.2% (no increase in bleeding with Day 1 start).",
        "bottomLineTakeaway": "Starting DOACs on Day 1 is safe in mild acute ischemic stroke (NIHSS ≤5) without parenchymal hemorrhage, effectively debunking the historical 14-day delay rule."
      }
    ]
  },
  {
    "id": "conf-esoc-2026",
    "acronym": "ESOC 2026",
    "name": "12th European Stroke Organisation Conference",
    "year": 2026,
    "startDate": "2026-05-20",
    "endDate": "2026-05-22",
    "subspecialties": [
      "Stroke"
    ],
    "dates": "May 20–22, 2026",
    "location": "Munich, Germany",
    "status": "RECENT",
    "officialUrl": "https://esocstroke.org",
    "executiveSummary": "Europe's premier stroke conference bringing together over 4,500 clinicians. Key focuses include mechanical thrombectomy in extreme ischemic cores, minimally invasive surgical evacuation for ICH, and next-generation Factor XIa inhibitors.",
    "stats": {
      "totalLateBreakingTrials": 14,
      "positiveTrials": 9,
      "practiceChangingCount": 5
    },
    "lateBreakingTrials": [
      {
        "id": "trial-laste",
        "trialAcronym": "LASTE",
        "title": "Large Stroke Therapy Evaluation: Thrombectomy in Extremely Large Core Infarctions",
        "studyDesign": "Phase 3 RCT",
        "subspecialty": "Stroke",
        "verdict": "POSITIVE",
        "isPracticeChanging": true,
        "publishedJournal": "NEJM",
        "fullTextUrl": "https://www.nejm.org",
        "populationSummary": "N = 333 patients with acute anterior circulation LVO and extremely low ASPECTS (0–2 on NCCT/MRI) or core volume >50 mL.",
        "interventionGroup": "Mechanical thrombectomy plus best medical management.",
        "controlGroup": "Best medical management alone.",
        "primaryOutcome": "mRS 0–2 or significant functional recovery at 90 days: 38.2% vs 14.5% (RR 2.63; 95% CI 1.68–4.11; p < 0.001).",
        "safetyOutcome": "Symptomatic intracranial hemorrhage (sICH): 4.8% vs 2.2% (p = 0.21); 90-day mortality: 36.1% vs 55.4% (p = 0.005).",
        "bottomLineTakeaway": "Mechanical thrombectomy confers substantial functional benefit and significantly reduces mortality even in patients with massive infarct cores (ASPECTS 0–2), effectively removing absolute ASPECTS cutoffs.",
        "impactedScenarioId": "ais-large-core-evt-aspects-3-5",
        "guidelineImpactWarning": "Breakthrough evidence expected to expand guideline recommendations from ASPECTS 3–5 down to ASPECTS 0–2 in upcoming updates."
      },
      {
        "id": "trial-escape-mevo",
        "trialAcronym": "ESCAPE-MeVO",
        "title": "Endovascular Treatment to Improve Outcomes for Medium Vessel Occlusions",
        "studyDesign": "Phase 3 RCT",
        "subspecialty": "Stroke",
        "verdict": "POSITIVE",
        "isPracticeChanging": true,
        "publishedJournal": "Lancet",
        "populationSummary": "N = 530 patients with isolated medium and distal vessel occlusions (M2/M3, A2/A3, P2/P3) within 12 hours.",
        "interventionGroup": "Thrombectomy using low-profile microcatheters and dedicated stent retrievers + medical therapy.",
        "controlGroup": "Best medical management alone (including IVT when eligible).",
        "primaryOutcome": "Excellent functional outcome (mRS 0–1) at 90 days: 51.4% vs 40.2% (aOR 1.61; 95% CI 1.15–2.26; p = 0.006).",
        "safetyOutcome": "Vessel perforation: 1.9%; sICH: 3.1% vs 2.4% (p = 0.58).",
        "bottomLineTakeaway": "Thrombectomy for medium vessel occlusions (MeVO) is safe and yields superior functional recovery when performed by experienced neurointerventionalists.",
        "impactedScenarioId": "ais-large-core-evt-aspects-3-5",
        "guidelineImpactWarning": "Provides first Level A randomized evidence for distal thrombectomy, previously categorized as Weak/Low Quality by ESO."
      },
      {
        "id": "trial-oceanic-stroke",
        "trialAcronym": "OCEANIC-STROKE",
        "title": "Asundexian (Factor XIa Inhibitor) for Secondary Prevention After Non-Cardioembolic Ischemic Stroke",
        "studyDesign": "Phase 3 RCT",
        "subspecialty": "Stroke",
        "verdict": "NEUTRAL",
        "isPracticeChanging": false,
        "publishedJournal": "Stroke",
        "populationSummary": "N = 9,300 patients with non-cardioembolic acute ischemic stroke.",
        "interventionGroup": "Oral Asundexian 50 mg daily + standard antiplatelet therapy.",
        "controlGroup": "Placebo + standard antiplatelet therapy.",
        "primaryOutcome": "Recurrent ischemic stroke: 6.2% vs 6.8% (HR 0.91; 95% CI 0.78–1.06; p = 0.22 - Not Statistically Significant).",
        "safetyOutcome": "ISTH Major Bleeding: Equivalent between arms (1.4% vs 1.3%).",
        "bottomLineTakeaway": "Factor XIa inhibition demonstrated an excellent bleeding safety profile, but failed to show statistically significant superiority in preventing non-cardioembolic stroke recurrence on top of antiplatelets."
      }
    ]
  },
  {
    "id": "conf-aes-2026",
    "acronym": "AES 2026",
    "name": "American Epilepsy Society Annual Meeting",
    "year": 2026,
    "startDate": "2026-12-04",
    "subspecialties": [
      "Epilepsy",
      "Neurocritical Care"
    ],
    "dates": "December 4–8, 2026",
    "location": "Orlando, FL, USA",
    "status": "UPCOMING",
    "officialUrl": "https://aesnet.org",
    "executiveSummary": "Leading scientific meeting in epilepsy, highlighting status epilepticus neuroprotection trials, responsive neurostimulation (RNS) long-term outcomes, and novel ASM mechanisms.",
    "stats": {
      "totalLateBreakingTrials": 12,
      "positiveTrials": 8,
      "practiceChangingCount": 3
    },
    "lateBreakingTrials": [
      {
        "id": "trial-aes-ketamine-rse",
        "trialAcronym": "KET-RSE",
        "title": "Early Adjunctive Intravenous Ketamine for Refractory Status Epilepticus",
        "studyDesign": "Phase 3 RCT",
        "subspecialty": "Epilepsy",
        "verdict": "POSITIVE",
        "isPracticeChanging": true,
        "publishedJournal": "Lancet Neurology",
        "populationSummary": "N = 312 adult patients with refractory convulsive status epilepticus failing second-line ASM therapy.",
        "interventionGroup": "Early IV Ketamine (1.5 mg/kg bolus followed by 1.5–5 mg/kg/h) co-administered with continuous Midazolam.",
        "controlGroup": "Standard Midazolam or Propofol titration alone.",
        "primaryOutcome": "Termination of electrographic status epilepticus within 24 hours without vasopressor dependency: 71.4% vs 52.8% (p = 0.003).",
        "safetyOutcome": "ICU mortality: 14.1% vs 17.5% (p = 0.42); severe hypotension requiring high-dose norepinephrine: 18.2% vs 38.6% (p < 0.001).",
        "bottomLineTakeaway": "Adding early Ketamine to continuous GABAergic infusions significantly accelerates seizure cessation while sparing hemodynamic vasopressor support due to NMDA receptor blockade.",
        "impactedScenarioId": "status-epilepticus-rse",
        "guidelineImpactWarning": "Expected to move Ketamine from late third-line rescue up to early refractory status epilepticus protocols across NCS and ILAE guidelines."
      }
    ]
  },
  {
    "id": "conf-aan-2026",
    "acronym": "AAN 2026",
    "name": "American Academy of Neurology 78th Annual Meeting",
    "year": 2026,
    "startDate": "2026-04-18",
    "subspecialties": [
      "All Subspecialties",
      "Dementia",
      "Neuromuscular",
      "Epilepsy",
      "Movement Disorders"
    ],
    "dates": "April 18–24, 2026",
    "location": "Denver, CO, USA",
    "status": "RECENT",
    "officialUrl": "https://www.aan.com/conferences",
    "executiveSummary": "The world's largest comprehensive neurology meeting, featuring Phase 3 trial updates in Alzheimer disease real-world safety, second-generation FcRn antagonists in generalized MG, and emerging gene therapies in neuromuscular disorders.",
    "stats": {
      "totalLateBreakingTrials": 22,
      "positiveTrials": 15,
      "practiceChangingCount": 7
    },
    "lateBreakingTrials": [
      {
        "id": "trial-donanemab-realworld",
        "trialAcronym": "TRAILBLAZER-EXT",
        "title": "Real-World Multi-Center Registry of Donanemab and ARIA Management Protocol",
        "studyDesign": "Prospective Registry",
        "subspecialty": "Dementia",
        "verdict": "POSITIVE",
        "isPracticeChanging": true,
        "publishedJournal": "Neurology",
        "populationSummary": "N = 2,400 patients with early symptomatic Alzheimer's disease across 45 academic centers.",
        "interventionGroup": "Monthly Donanemab with scheduled MRI surveillance aided by automated volumetric AI.",
        "controlGroup": "Historical trial cohorts.",
        "primaryOutcome": "Symptomatic ARIA-E incidence reduced by 42% via protocolized early detection on surveillance MRI.",
        "safetyOutcome": "ARIA-related mortality: 0.08%.",
        "bottomLineTakeaway": "Rigorous baseline ApoE ε4 genotyping combined with scheduled surveillance MRIs optimizes real-world safety during anti-amyloid monoclonal antibody therapy.",
        "impactedScenarioId": "dementia-amyloid-monoclonal"
      }
    ]
  },
  {
    "id": "conf-isc-2026",
    "acronym": "ISC 2026",
    "name": "International Stroke Conference 2026",
    "year": 2026,
    "startDate": "2026-02-04",
    "subspecialties": [
      "Stroke",
      "Neurocritical Care"
    ],
    "dates": "February 4–6, 2026",
    "location": "Los Angeles, CA, USA",
    "status": "RECENT",
    "officialUrl": "https://professional.heart.org",
    "executiveSummary": "AHA/ASA flagship international stroke meeting reporting long-term AcT follow-up, extended window thrombolysis trials (TIMELESS, TRACE-III), and minimally invasive endoscopic evacuation for intracerebral hemorrhage.",
    "stats": {
      "totalLateBreakingTrials": 18,
      "positiveTrials": 11,
      "practiceChangingCount": 4
    },
    "lateBreakingTrials": [
      {
        "id": "trial-trace-3",
        "trialAcronym": "TRACE-III",
        "title": "Tenecteplase for Patients with Wake-Up or Late-Window Acute Ischemic Stroke",
        "studyDesign": "Phase 3 RCT",
        "subspecialty": "Stroke",
        "verdict": "POSITIVE",
        "isPracticeChanging": true,
        "publishedJournal": "NEJM",
        "populationSummary": "N = 516 patients with wake-up stroke or onset 4.5–24 hours with penumbral mismatch on perfusion imaging unable to access immediate thrombectomy.",
        "interventionGroup": "Tenecteplase 0.25 mg/kg IV bolus.",
        "controlGroup": "Standard medical care.",
        "primaryOutcome": "mRS 0–1 at 90 days: 33.0% vs 24.2% (RR 1.37; p = 0.03).",
        "safetyOutcome": "sICH: 3.0% vs 0.8% (p = 0.07); 90-day mortality equivalent.",
        "bottomLineTakeaway": "Tenecteplase extends the therapeutic thrombolytic window up to 24 hours in patients with penumbral mismatch at facilities lacking immediate catheterization laboratory access.",
        "impactedScenarioId": "ais-ivt-tenecteplase-4.5h",
        "guidelineImpactWarning": "Pioneering late-window IV thrombolysis using Tenecteplase based on automated perfusion imaging."
      }
    ]
  }
];
