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
  {
    id: "eso-sap-2024",
    society: "ESO",
    year: 2024,
    subspecialty: "Stroke",
    subspecialties: ["Stroke"],
    title: "European Stroke Organisation (ESO) Guidelines on Stroke-Associated Pneumonia",
    officialUrl: "https://journals.sagepub.com/doi/eso-sap-2024",
    journalTarget: "European Stroke Journal",
    documentType: "Clinical Practice Guideline",
    publishDate: "2024-06-15",
    executiveSummary: "Hướng dẫn thực hành lâm sàng của Hội Đột quỵ Châu Âu (ESO) dựa trên phương pháp luận GRADE về chẩn đoán, phân tầng nguy cơ và dự phòng viêm phổi liên quan đột quỵ (SAP).",
    executiveSummaryVi: "Khuyến cáo sử dụng thang điểm lâm sàng hoặc dấu ấn sinh học có giá trị dự đoán nguy cơ viêm phổi ở bệnh nhân đột quỵ nằm viện không thở máy trong 7 ngày đầu, kèm bỏ phiếu đồng thuận chuyên gia 8/8.",
    allPracticeChanges: [
      {
        id: "eso-2024-sap-pico5",
        category: "Complication Prevention",
        topic: "PICO 5: Biomarkers & Clinical Prediction Scores for SAP",
        changeType: "NEW",
        currentGrade: "GRADE Weak for intervention (Evidence: Very Low, Voting: 8/8)",
        currentText: "In hospitalised adults with acute ischaemic or haemorrhagic stroke (non-ventilated) within 7 days of stroke symptom onset, we suggest using validated clinical prediction scores or biomarkers to identify patients at increased risk of SAP and to better target preventive standard measures.",
        drivingTrials: ["PRECIOUS (Lancet Neurol 2023)"]
      },
      {
        id: "eso-2024-prophylactic-antibiotics",
        category: "Infection Control",
        topic: "PICO 1: Routine Prophylactic Antibiotics for Stroke Patients",
        changeType: "REVISED",
        currentGrade: "GRADE Strong against intervention (Evidence: High)",
        currentText: "We recommend against the routine use of prophylactic systemic antibiotics in hospitalised patients with acute stroke to prevent stroke-associated pneumonia or improve clinical outcome.",
        drivingTrials: ["PASS (Lancet 2015)", "PANTHER (Stroke 2016)"]
      }
    ],
    linkedScenarioIds: ["ais-neuro-icu-infection-prevention"],
    fullTextStatus: "FULL_TEXT_PARSED"
  },
  {
    id: "eso-bp-2023",
    society: "ESO",
    year: 2023,
    subspecialty: "Stroke",
    subspecialties: ["Stroke"],
    title: "European Stroke Organisation (ESO) Guidelines on Blood Pressure Management in Acute Ischemic Stroke",
    officialUrl: "https://journals.sagepub.com/doi/10.1177/23969873221147775",
    journalTarget: "European Stroke Journal",
    documentType: "Clinical Practice Guideline",
    publishDate: "2023-03-20",
    executiveSummary: "Phác đồ kiểm soát huyết áp giai đoạn cấp tính và sau tái tưới máu ở bệnh nhân đột quỵ thiếu máu não cấp của ESO.",
    executiveSummaryVi: "Khuyến nghị không hạ huyết áp thường quy ở bệnh nhân không tiêu sợi huyết/lấy huyết khối trừ khi huyết áp vượt ngưỡng 220/120 mmHg.",
    allPracticeChanges: [
      {
        id: "eso-2023-bp-no-reperfusion",
        category: "Blood Pressure",
        topic: "BP Control in Patients NOT Receiving Reperfusion Therapy",
        changeType: "REVISED",
        currentGrade: "GRADE Strong against intervention (Evidence: Moderate)",
        currentText: "In patients with acute ischemic stroke who are NOT eligible for IVT or EVT, we recommend against routinely lowering blood pressure within the first 24 hours, unless BP exceeds 220/120 mmHg or acute end-organ damage exists.",
        drivingTrials: ["CATIS (JAMA 2014)", "SCAST (Lancet 2011)"]
      }
    ],
    linkedScenarioIds: ["ais-bp-management-acute-phase"],
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
