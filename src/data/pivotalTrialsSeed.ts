import type { PivotalTrialRecord, ConferenceEvent } from "../types/neuroguide.ts";

/**
 * Ultra-compact Pivotal Trials Registry (~700 bytes per trial).
 * Stores high-yield PICO + quantitative primary/safety endpoints without bulky PDFs.
 */
export const PIVOTAL_TRIALS_SEED: PivotalTrialRecord[] = [
  {
    "id": "trial-wsc-msu-asia",
    "pico": {
      "comparator": "Standard conventional ambulance with in-hospital emergency department triage.",
      "population": "N = 1,850 hyperacute stroke alerts randomized to Mobile Stroke Unit (CT + telestroke on ambulance) vs standard EMS dispatch.",
      "intervention": "MSU dispatch with prehospital point-of-care CT and immediate IV Tenecteplase bolus."
    },
    "year": 2026,
    "title": "Impact of Mobile Stroke Unit Deployment on 90-Day Disability in High-Density Asian Megacities",
    "design": "Phase 3 RCT",
    "acronym": "ASIA-MSU",
    "journal": "Lancet",
    "bottomLine": "Prehospital mobile stroke units achieve dramatic 40-minute reductions in door-to-needle time and substantially higher 90-day functional recovery in densely populated urban centers.",
    "officialUrl": "https://worldstrokecongress.org",
    "ontologyTags": {
      "condition": [
        "stroke_general"
      ],
      "direction": [
        "for"
      ],
      "drug_or_procedure": [
        "tenecteplase"
      ]
    },
    "subspecialty": "Stroke",
    "evidenceSource": "CONFERENCE_LATE_BREAKING",
    "safetyEndpoint": {
      "note": "sICH: 2.8% vs 2.9% (equivalent)."
    },
    "primaryEndpoint": {
      "metric": "Primary Endpoint",
      "verdict": "POSITIVE",
      "resultStats": "Golden hour thrombolysis (<60 min from onset): 34.5% vs 3.2% (p < 0.001); mRS 0–1 at 90 days: 48.6% vs 37.8% (p = 0.002)."
    },
    "linkedScenarioIds": [
      "ais-ivt-tenecteplase-4.5h"
    ]
  },
  {
    "id": "trial-wsc-mevo",
    "pico": {
      "comparator": "Best medical management alone (including IV thrombolysis when eligible).",
      "population": "N = 490 patients with acute ischemic stroke due to isolated distal MCA (M2/M3) or ACA (A2/A3) occlusions presenting within 12 hours.",
      "intervention": "Mechanical thrombectomy using micro-stent retrievers & micro-aspiration catheters + standard medical care."
    },
    "year": 2026,
    "title": "Randomized Trial of Endovascular Thrombectomy for Distal Middle and Anterior Cerebral Artery Occlusions",
    "design": "Phase 3 RCT",
    "acronym": "DISTAL-EVT",
    "journal": "NEJM",
    "bottomLine": "Endovascular thrombectomy significantly improves functional independence in patients with acute distal medium vessel occlusions without excess procedural hemorrhage.",
    "officialUrl": "https://www.nejm.org",
    "ontologyTags": {
      "condition": [
        "ais",
        "medium_distal_vessel_occlusion"
      ],
      "direction": [
        "for"
      ],
      "drug_or_procedure": [
        "mechanical_thrombectomy_device"
      ]
    },
    "subspecialty": "Stroke",
    "evidenceSource": "CONFERENCE_LATE_BREAKING",
    "safetyEndpoint": {
      "note": "Symptomatic intracranial hemorrhage (sICH): 3.2% vs 2.1% (p = 0.45); vessel rupture: 1.6%."
    },
    "primaryEndpoint": {
      "metric": "Primary Endpoint",
      "verdict": "POSITIVE",
      "resultStats": "90-day functional independence (mRS 0–2): 54.2% vs 42.1% (aOR 1.63; 95% CI 1.14–2.32; p = 0.007)."
    },
    "linkedScenarioIds": [
      "ais-large-core-evt-aspects-3-5"
    ]
  },
  {
    "id": "trial-escape-mevo",
    "pico": {
      "comparator": "Best medical management alone (including IVT when eligible).",
      "population": "N = 530 patients with isolated medium and distal vessel occlusions (M2/M3, A2/A3, P2/P3) within 12 hours.",
      "intervention": "Thrombectomy using low-profile microcatheters and dedicated stent retrievers + medical therapy."
    },
    "year": 2026,
    "title": "Endovascular Treatment to Improve Outcomes for Medium Vessel Occlusions",
    "design": "Phase 3 RCT",
    "acronym": "ESCAPE-MeVO",
    "journal": "Lancet",
    "bottomLine": "Thrombectomy for medium vessel occlusions (MeVO) is safe and yields superior functional recovery when performed by experienced neurointerventionalists.",
    "officialUrl": "https://esocstroke.org",
    "ontologyTags": {
      "condition": [
        "medium_distal_vessel_occlusion"
      ],
      "direction": [
        "for"
      ],
      "drug_or_procedure": [
        "mechanical_thrombectomy_device"
      ]
    },
    "subspecialty": "Stroke",
    "evidenceSource": "CONFERENCE_LATE_BREAKING",
    "safetyEndpoint": {
      "note": "Vessel perforation: 1.9%; sICH: 3.1% vs 2.4% (p = 0.58)."
    },
    "primaryEndpoint": {
      "metric": "Primary Endpoint",
      "verdict": "POSITIVE",
      "resultStats": "Excellent functional outcome (mRS 0–1) at 90 days: 51.4% vs 40.2% (aOR 1.61; 95% CI 1.15–2.26; p = 0.006)."
    },
    "linkedScenarioIds": [
      "ais-large-core-evt-aspects-3-5"
    ]
  },
  {
    "id": "trial-aes-ketamine-rse",
    "pico": {
      "comparator": "Standard Midazolam or Propofol titration alone.",
      "population": "N = 312 adult patients with refractory convulsive status epilepticus failing second-line ASM therapy.",
      "intervention": "Early IV Ketamine (1.5 mg/kg bolus followed by 1.5–5 mg/kg/h) co-administered with continuous Midazolam."
    },
    "year": 2026,
    "title": "Early Adjunctive Intravenous Ketamine for Refractory Status Epilepticus",
    "design": "Phase 3 RCT",
    "acronym": "KET-RSE",
    "journal": "Lancet Neurology",
    "bottomLine": "Adding early Ketamine to continuous GABAergic infusions significantly accelerates seizure cessation while sparing hemodynamic vasopressor support due to NMDA receptor blockade.",
    "officialUrl": "https://aesnet.org",
    "ontologyTags": {
      "condition": [],
      "direction": [
        "for"
      ],
      "drug_or_procedure": []
    },
    "subspecialty": "Epilepsy",
    "evidenceSource": "CONFERENCE_LATE_BREAKING",
    "safetyEndpoint": {
      "note": "ICU mortality: 14.1% vs 17.5% (p = 0.42); severe hypotension requiring high-dose norepinephrine: 18.2% vs 38.6% (p < 0.001)."
    },
    "primaryEndpoint": {
      "metric": "Primary Endpoint",
      "verdict": "POSITIVE",
      "resultStats": "Termination of electrographic status epilepticus within 24 hours without vasopressor dependency: 71.4% vs 52.8% (p = 0.003)."
    },
    "linkedScenarioIds": [
      "status-epilepticus-rse"
    ]
  },
  {
    "id": "trial-laste",
    "pico": {
      "comparator": "Best medical management alone.",
      "population": "N = 333 patients with acute anterior circulation LVO and extremely low ASPECTS (0–2 on NCCT/MRI) or core volume >50 mL.",
      "intervention": "Mechanical thrombectomy plus best medical management."
    },
    "year": 2026,
    "title": "Large Stroke Therapy Evaluation: Thrombectomy in Extremely Large Core Infarctions",
    "design": "Phase 3 RCT",
    "acronym": "LASTE",
    "journal": "NEJM",
    "bottomLine": "Mechanical thrombectomy confers substantial functional benefit and significantly reduces mortality even in patients with massive infarct cores (ASPECTS 0–2), effectively removing absolute ASPECTS cutoffs.",
    "officialUrl": "https://www.nejm.org",
    "ontologyTags": {
      "condition": [
        "large_vessel_occlusion",
        "large_ischemic_core"
      ],
      "direction": [
        "for"
      ],
      "drug_or_procedure": [
        "mechanical_thrombectomy_device"
      ]
    },
    "subspecialty": "Stroke",
    "evidenceSource": "CONFERENCE_LATE_BREAKING",
    "safetyEndpoint": {
      "note": "Symptomatic intracranial hemorrhage (sICH): 4.8% vs 2.2% (p = 0.21); 90-day mortality: 36.1% vs 55.4% (p = 0.005)."
    },
    "primaryEndpoint": {
      "metric": "Primary Endpoint",
      "verdict": "POSITIVE",
      "resultStats": "mRS 0–2 or significant functional recovery at 90 days: 38.2% vs 14.5% (RR 2.63; 95% CI 1.68–4.11; p < 0.001)."
    },
    "linkedScenarioIds": [
      "ais-large-core-evt-aspects-3-5"
    ]
  },
  {
    "id": "mild-mt-2026",
    "doi": "10.1056/nejmoa2609149",
    "pico": {
      "comparator": "Standard medical care alone",
      "population": "Acute mild AIS (NIHSS <6) with anterior circulation LVO and salvageable tissue on perfusion imaging",
      "timeWindow": "≤ 24 hours",
      "intervention": "Early endovascular thrombectomy + standard medical care"
    },
    "year": 2026,
    "title": "Endovascular Thrombectomy for Acute Mild Ischemic Stroke with Large-Vessel Occlusion (MILD-MT)",
    "design": "Phase 3 RCT",
    "acronym": "MILD-MT",
    "journal": "NEJM",
    "bottomLine": "Supports early EVT in perfusion-selected anterior LVO patients presenting with mild deficits (NIHSS <6).",
    "sampleSize": 480,
    "ontologyTags": {
      "phase": [
        "acute_treatment"
      ],
      "age_group": [
        "adult"
      ],
      "condition": [
        "ais",
        "large_vessel_occlusion"
      ],
      "direction": [
        "for"
      ],
      "time_window": [
        "within_24h"
      ],
      "outcome_target": [
        "functional_outcome",
        "symptomatic_ich"
      ],
      "drug_or_procedure": [
        "mechanical_thrombectomy_device",
        "ctp"
      ],
      "intervention_type": [
        "endovascular_thrombectomy",
        "patient_selection"
      ]
    },
    "subspecialty": "Stroke",
    "evidenceSource": "PEER_REVIEWED_PUBLISHED",
    "safetyEndpoint": {
      "sICH": "Acceptable sICH rate within 48h comparable to medical arm"
    },
    "primaryEndpoint": {
      "metric": "90-day ordinal mRS distribution & mRS 0–1",
      "verdict": "POSITIVE",
      "resultStats": "Significantly more favorable 90-day mRS shift and higher mRS 0–1 rate, preventing early neurological deterioration"
    }
  },
  {
    "id": "trial-oceanic-stroke",
    "pico": {
      "comparator": "Placebo + standard antiplatelet therapy.",
      "population": "N = 9,300 patients with non-cardioembolic acute ischemic stroke.",
      "intervention": "Oral Asundexian 50 mg daily + standard antiplatelet therapy."
    },
    "year": 2026,
    "title": "Asundexian (Factor XIa Inhibitor) for Secondary Prevention After Non-Cardioembolic Ischemic Stroke",
    "design": "Phase 3 RCT",
    "acronym": "OCEANIC-STROKE",
    "journal": "Stroke",
    "bottomLine": "Factor XIa inhibition demonstrated an excellent bleeding safety profile, but failed to show statistically significant superiority in preventing non-cardioembolic stroke recurrence on top of antiplatelets.",
    "officialUrl": "https://esocstroke.org",
    "ontologyTags": {
      "condition": [
        "ais"
      ],
      "direction": [
        "uncertain"
      ],
      "drug_or_procedure": []
    },
    "subspecialty": "Stroke",
    "evidenceSource": "CONFERENCE_LATE_BREAKING",
    "safetyEndpoint": {
      "note": "ISTH Major Bleeding: Equivalent between arms (1.4% vs 1.3%)."
    },
    "primaryEndpoint": {
      "metric": "Primary Endpoint",
      "verdict": "NEUTRAL",
      "resultStats": "Recurrent ischemic stroke: 6.2% vs 6.8% (HR 0.91; 95% CI 0.78–1.06; p = 0.22 - Not Statistically Significant)."
    }
  },
  {
    "id": "trial-wsc-prevent-doac",
    "pico": {
      "comparator": "Early DOAC initiation at 72–96 hours (Days 3–4).",
      "population": "N = 2,200 patients with acute ischemic stroke and nonvalvular AF randomized within 24 hours of symptom onset.",
      "intervention": "Immediate DOAC initiation within 24 hours (Day 1)."
    },
    "year": 2026,
    "title": "Immediate (Day 1) vs. Early (Day 3-4) DOAC Initiation in Patients with Acute Mild-to-Moderate Ischemic Stroke and Atrial Fibrillation",
    "design": "Phase 3 RCT",
    "acronym": "PREVENT-DOAC",
    "journal": "Stroke",
    "bottomLine": "Starting DOACs on Day 1 is safe in mild acute ischemic stroke (NIHSS ≤5) without parenchymal hemorrhage, effectively debunking the historical 14-day delay rule.",
    "officialUrl": "https://worldstrokecongress.org",
    "ontologyTags": {
      "condition": [
        "ais"
      ],
      "direction": [
        "for"
      ],
      "drug_or_procedure": []
    },
    "subspecialty": "Stroke",
    "evidenceSource": "CONFERENCE_LATE_BREAKING",
    "safetyEndpoint": {
      "note": "Symptomatic intracranial hemorrhage: 0.2% vs 0.2% (no increase in bleeding with Day 1 start)."
    },
    "primaryEndpoint": {
      "metric": "Primary Endpoint",
      "verdict": "POSITIVE",
      "resultStats": "Composite of recurrent ischemic stroke, systemic embolism, or major bleeding within 30 days: 2.1% vs 2.4% (Non-inferior, p < 0.001)."
    }
  },
  {
    "id": "trial-trace-3",
    "pico": {
      "comparator": "Standard medical care.",
      "population": "N = 516 patients with wake-up stroke or onset 4.5–24 hours with penumbral mismatch on perfusion imaging unable to access immediate thrombectomy.",
      "intervention": "Tenecteplase 0.25 mg/kg IV bolus."
    },
    "year": 2026,
    "title": "Tenecteplase for Patients with Wake-Up or Late-Window Acute Ischemic Stroke",
    "design": "Phase 3 RCT",
    "acronym": "TRACE-III",
    "journal": "NEJM",
    "bottomLine": "Tenecteplase extends the therapeutic thrombolytic window up to 24 hours in patients with penumbral mismatch at facilities lacking immediate catheterization laboratory access.",
    "officialUrl": "https://professional.heart.org",
    "ontologyTags": {
      "condition": [
        "ais"
      ],
      "direction": [
        "for"
      ],
      "drug_or_procedure": [
        "tenecteplase",
        "mechanical_thrombectomy_device"
      ]
    },
    "subspecialty": "Stroke",
    "evidenceSource": "CONFERENCE_LATE_BREAKING",
    "safetyEndpoint": {
      "note": "sICH: 3.0% vs 0.8% (p = 0.07); 90-day mortality equivalent."
    },
    "primaryEndpoint": {
      "metric": "Primary Endpoint",
      "verdict": "POSITIVE",
      "resultStats": "mRS 0–1 at 90 days: 33.0% vs 24.2% (RR 1.37; p = 0.03)."
    },
    "linkedScenarioIds": [
      "ais-ivt-tenecteplase-4.5h"
    ]
  },
  {
    "id": "trial-donanemab-realworld",
    "pico": {
      "comparator": "Historical trial cohorts.",
      "population": "N = 2,400 patients with early symptomatic Alzheimer's disease across 45 academic centers.",
      "intervention": "Monthly Donanemab with scheduled MRI surveillance aided by automated volumetric AI."
    },
    "year": 2026,
    "title": "Real-World Multi-Center Registry of Donanemab and ARIA Management Protocol",
    "design": "Prospective Registry",
    "acronym": "TRAILBLAZER-EXT",
    "journal": "Neurology",
    "bottomLine": "Rigorous baseline ApoE ε4 genotyping combined with scheduled surveillance MRIs optimizes real-world safety during anti-amyloid monoclonal antibody therapy.",
    "officialUrl": "https://www.aan.com/conferences",
    "ontologyTags": {
      "condition": [],
      "direction": [
        "for"
      ],
      "drug_or_procedure": []
    },
    "subspecialty": "Dementia",
    "evidenceSource": "CONFERENCE_LATE_BREAKING",
    "safetyEndpoint": {
      "note": "ARIA-related mortality: 0.08%."
    },
    "primaryEndpoint": {
      "metric": "Primary Endpoint",
      "verdict": "POSITIVE",
      "resultStats": "Symptomatic ARIA-E incidence reduced by 42% via protocolized early detection on surveillance MRI."
    },
    "linkedScenarioIds": [
      "dementia-amyloid-monoclonal"
    ]
  },
  {
    "id": "enrich-2024",
    "doi": "10.1056/NEJMoa2308440",
    "pico": {
      "comparator": "Guideline medical management alone",
      "population": "Acute spontaneous lobar or anterior basal ganglia ICH (volume 30–80 mL)",
      "timeWindow": "≤ 24 hours from last known normal",
      "intervention": "Early minimally invasive trans-sulcal parafascicular surgery (MIPS) + guideline care"
    },
    "pmid": "38602658",
    "year": 2024,
    "title": "Trial of Early Minimally Invasive Removal of Intracerebral Hemorrhage (ENRICH)",
    "design": "Phase 3 RCT",
    "acronym": "ENRICH",
    "journal": "NEJM",
    "bottomLine": "First positive phase 3 surgical trial in spontaneous ICH, establishing benefit of early minimally invasive evacuation within 24h in lobar ICH (30–80 mL).",
    "sampleSize": 300,
    "ontologyTags": {
      "phase": [
        "acute_treatment",
        "neurocritical_care"
      ],
      "age_group": [
        "adult"
      ],
      "condition": [
        "ich"
      ],
      "direction": [
        "for"
      ],
      "time_window": [
        "within_24h"
      ],
      "outcome_target": [
        "functional_outcome",
        "mortality"
      ],
      "intervention_type": [
        "decompressive_surgery"
      ]
    },
    "subspecialty": "Stroke",
    "evidenceSource": "PEER_REVIEWED_PUBLISHED",
    "safetyEndpoint": {
      "mortality90d": "30-day mortality: 9.3% vs. 18.0%"
    },
    "primaryEndpoint": {
      "metric": "Utility-weighted mRS at 180 days",
      "verdict": "POSITIVE",
      "resultStats": "0.458 vs. 0.374 (difference 0.084, posterior probability of superiority 0.981; driven by lobar ICH)"
    }
  },
  {
    "id": "angel-aspect-2023",
    "doi": "10.1056/NEJMoa2213379",
    "pico": {
      "comparator": "Medical management alone",
      "population": "Adults with anterior circulation LVO and ASPECTS 3–5 or infarct core volume 70–100 mL",
      "timeWindow": "≤ 24 hours",
      "intervention": "Endovascular thrombectomy + medical management"
    },
    "pmid": "36762852",
    "year": 2023,
    "title": "Study of Endovascular Therapy in Acute Anterior Circulation Large Vessel Occlusive Patients With a Large Infarct Core (ANGEL-ASPECT)",
    "design": "Phase 3 RCT",
    "acronym": "ANGEL-ASPECT",
    "journal": "NEJM",
    "bottomLine": "Demonstrates robust functional recovery with EVT in large ischemic core (ASPECTS 3–5 or 70–100 mL) within 24 hours.",
    "sampleSize": 456,
    "ontologyTags": {
      "phase": [
        "acute_treatment"
      ],
      "age_group": [
        "adult"
      ],
      "condition": [
        "ais",
        "large_vessel_occlusion",
        "large_ischemic_core"
      ],
      "direction": [
        "for"
      ],
      "time_window": [
        "within_24h"
      ],
      "outcome_target": [
        "functional_outcome",
        "symptomatic_ich"
      ],
      "drug_or_procedure": [
        "mechanical_thrombectomy_device"
      ],
      "intervention_type": [
        "endovascular_thrombectomy"
      ]
    },
    "subspecialty": "Stroke",
    "evidenceSource": "PEER_REVIEWED_PUBLISHED",
    "safetyEndpoint": {
      "sICH": "6.1% vs. 2.7% (within 48h)",
      "mortality90d": "21.7% vs. 20.0%"
    },
    "primaryEndpoint": {
      "metric": "90-day ordinal mRS distribution",
      "verdict": "POSITIVE",
      "resultStats": "Generalized OR 1.37 (95% CI 1.11–1.69, p=0.004); mRS 0–2: 30.0% vs. 11.6%"
    },
    "linkedScenarioIds": [
      "ais-large-core-evt-aspects-3-5"
    ]
  },
  {
    "id": "elan-2023",
    "doi": "10.1056/NEJMoa2303048",
    "pico": {
      "comparator": "Later guideline-based DOAC initiation (day 3–4 minor, day 6–7 moderate, day 12–14 major)",
      "population": "AIS patients with atrial fibrillation stratified by infarct size (minor, moderate, major on imaging)",
      "timeWindow": "Inpatient / early secondary prevention",
      "intervention": "Early DOAC initiation (<48h minor/moderate, day 6–7 major)"
    },
    "pmid": "37222476",
    "year": 2023,
    "title": "Early versus Later Anticoagulation for Stroke with Atrial Fibrillation (ELAN)",
    "design": "Phase 3 RCT",
    "acronym": "ELAN",
    "journal": "NEJM",
    "bottomLine": "Early infarct-size-guided DOAC initiation after AF-related ischemic stroke is safe (0.2% sICH) and lowers early recurrent stroke risk.",
    "sampleSize": 2013,
    "ontologyTags": {
      "phase": [
        "stroke_unit_inpatient",
        "secondary_prevention"
      ],
      "age_group": [
        "adult"
      ],
      "condition": [
        "ais",
        "atrial_fibrillation"
      ],
      "direction": [
        "for"
      ],
      "outcome_target": [
        "recurrent_stroke",
        "symptomatic_ich"
      ],
      "drug_or_procedure": [
        "doac"
      ],
      "intervention_type": [
        "anticoagulation"
      ]
    },
    "subspecialty": "Stroke",
    "evidenceSource": "PEER_REVIEWED_PUBLISHED",
    "safetyEndpoint": {
      "sICH": "0.2% vs. 0.2% at 30 days",
      "mortality90d": "Recurrent ischemic stroke at 30d: 1.4% vs. 2.5%"
    },
    "primaryEndpoint": {
      "metric": "30-day composite of recurrent ischemic stroke, systemic embolism, major extracranial bleeding, sICH, or vascular death",
      "verdict": "POSITIVE",
      "resultStats": "2.9% vs. 4.1% (risk difference -1.18%, 95% CI -2.84 to 0.47)"
    }
  },
  {
    "id": "optimal-bp-2023",
    "doi": "10.1001/jama.2023.14590",
    "pico": {
      "comparator": "Conventional BP management (SBP 140–180 mmHg)",
      "population": "AIS patients achieving successful reperfusion (mTICI 2b–3) after EVT",
      "timeWindow": "First 24h post-EVT",
      "intervention": "Intensive BP management (SBP <140 mmHg for 24h)"
    },
    "pmid": "37668619",
    "year": 2023,
    "title": "Intensive vs Conventional Blood Pressure Management After Thrombectomy in Acute Ischemic Stroke (OPTIMAL-BP)",
    "design": "Phase 3 RCT",
    "acronym": "OPTIMAL-BP",
    "journal": "JAMA",
    "bottomLine": "Targeting SBP <140 mmHg after successful EVT significantly lowers the likelihood of functional independence compared with 140–180 mmHg.",
    "sampleSize": 306,
    "ontologyTags": {
      "phase": [
        "acute_treatment",
        "stroke_unit_inpatient"
      ],
      "age_group": [
        "adult"
      ],
      "condition": [
        "ais",
        "large_vessel_occlusion"
      ],
      "direction": [
        "against"
      ],
      "outcome_target": [
        "functional_outcome"
      ],
      "intervention_type": [
        "bp_management",
        "endovascular_thrombectomy"
      ]
    },
    "subspecialty": "Stroke",
    "evidenceSource": "PEER_REVIEWED_PUBLISHED",
    "safetyEndpoint": {
      "sICH": "9.0% vs. 8.1%",
      "mortality90d": "7.7% vs. 5.4%"
    },
    "primaryEndpoint": {
      "metric": "Functional independence (mRS 0–2) at 90 days",
      "verdict": "NEGATIVE",
      "resultStats": "39.4% vs. 54.4% (adjusted OR 0.56, 95% CI 0.33–0.96, p=0.03; terminated early for harm)"
    }
  },
  {
    "id": "select2-2023",
    "doi": "10.1056/NEJMoa2214403",
    "pico": {
      "comparator": "Standard medical management alone",
      "population": "Adults with anterior LVO (ICA or M1) and large ischemic core (ASPECTS 3–5 or CTP core ≥50 mL)",
      "timeWindow": "≤ 24 hours from last known well",
      "intervention": "Endovascular thrombectomy + medical care"
    },
    "pmid": "36762865",
    "year": 2023,
    "title": "Trial of Endovascular Thrombectomy for Large Ischemic Strokes (SELECT2)",
    "design": "Phase 3 RCT",
    "acronym": "SELECT2",
    "journal": "NEJM",
    "bottomLine": "Endovascular thrombectomy significantly improves functional independence in anterior LVO patients with large core (ASPECTS 3–5) up to 24h.",
    "sampleSize": 352,
    "ontologyTags": {
      "phase": [
        "acute_treatment"
      ],
      "age_group": [
        "adult"
      ],
      "condition": [
        "ais",
        "large_vessel_occlusion",
        "large_ischemic_core"
      ],
      "direction": [
        "for"
      ],
      "time_window": [
        "within_24h"
      ],
      "outcome_target": [
        "functional_outcome",
        "mortality"
      ],
      "drug_or_procedure": [
        "mechanical_thrombectomy_device",
        "ct",
        "ctp"
      ],
      "intervention_type": [
        "endovascular_thrombectomy",
        "patient_selection"
      ]
    },
    "subspecialty": "Stroke",
    "evidenceSource": "PEER_REVIEWED_PUBLISHED",
    "safetyEndpoint": {
      "sICH": "0.6% vs. 1.1%",
      "mortality90d": "38.4% vs. 41.5%"
    },
    "primaryEndpoint": {
      "metric": "90-day ordinal mRS shift (generalized OR) & functional independence (mRS 0–2)",
      "verdict": "POSITIVE",
      "resultStats": "Gen OR 1.51 (95% CI 1.20–1.89, p<0.001); mRS 0–2: 20.3% vs. 7.0% (RR 2.97)"
    },
    "linkedScenarioIds": [
      "ais-large-core-evt-aspects-3-5"
    ]
  },
  {
    "id": "tension-2023",
    "doi": "10.1016/S0140-6736(23)02032-9",
    "pico": {
      "comparator": "Medical treatment alone",
      "population": "AIS with anterior LVO and ASPECTS 3–5 selected predominantly by non-contrast CT (without mandatory perfusion)",
      "timeWindow": "≤ 12 hours",
      "intervention": "Endovascular thrombectomy + medical treatment"
    },
    "pmid": "37837989",
    "year": 2023,
    "title": "Efficacy and Safety of Thrombectomy in Stroke With Extended Lesion and Extended Time Window (TENSION)",
    "design": "Phase 3 RCT",
    "acronym": "TENSION",
    "journal": "The Lancet",
    "bottomLine": "NCCT-based selection of ASPECTS 3–5 patients for EVT significantly improves functional outcome and reduces mortality without requiring CT perfusion.",
    "sampleSize": 253,
    "ontologyTags": {
      "phase": [
        "acute_treatment"
      ],
      "age_group": [
        "adult"
      ],
      "condition": [
        "ais",
        "large_vessel_occlusion",
        "large_ischemic_core"
      ],
      "direction": [
        "for"
      ],
      "time_window": [
        "within_24h"
      ],
      "outcome_target": [
        "functional_outcome",
        "mortality"
      ],
      "drug_or_procedure": [
        "mechanical_thrombectomy_device",
        "ct"
      ],
      "intervention_type": [
        "endovascular_thrombectomy",
        "neuroimaging"
      ]
    },
    "subspecialty": "Stroke",
    "evidenceSource": "PEER_REVIEWED_PUBLISHED",
    "safetyEndpoint": {
      "sICH": "5% vs. 5%",
      "mortality90d": "40% vs. 51% (HR 0.67, p=0.038)"
    },
    "primaryEndpoint": {
      "metric": "90-day ordinal mRS shift",
      "verdict": "POSITIVE",
      "resultStats": "Adjusted common OR 2.58 (95% CI 1.60–4.15, p=0.0001); mRS 0–2: 17% vs. 2%"
    },
    "linkedScenarioIds": [
      "ais-large-core-evt-aspects-3-5"
    ]
  },
  {
    "id": "trace-2-2023",
    "doi": "10.1016/S0140-6736(22)02600-9",
    "pico": {
      "comparator": "IV Alteplase 0.9 mg/kg infusion (max 90 mg)",
      "population": "Adults with AIS (NIHSS 5–25) eligible for IVT but ineligible for or declining EVT",
      "timeWindow": "≤ 4.5 hours",
      "intervention": "IV Tenecteplase 0.25 mg/kg bolus (max 25 mg)"
    },
    "pmid": "36774935",
    "year": 2023,
    "title": "Tenecteplase versus Alteplase in Acute Ischaemic Cerebrovascular Events (TRACE-2)",
    "design": "Phase 3 RCT",
    "acronym": "TRACE-2",
    "journal": "The Lancet",
    "bottomLine": "Confirms non-inferior efficacy and comparable safety of Tenecteplase 0.25 mg/kg vs. Alteplase in AIS within 4.5 hours.",
    "sampleSize": 1430,
    "ontologyTags": {
      "phase": [
        "acute_treatment"
      ],
      "age_group": [
        "adult"
      ],
      "condition": [
        "ais"
      ],
      "direction": [
        "for"
      ],
      "time_window": [
        "within_4_5h"
      ],
      "outcome_target": [
        "functional_outcome",
        "symptomatic_ich"
      ],
      "drug_or_procedure": [
        "tenecteplase",
        "alteplase"
      ],
      "intervention_type": [
        "iv_thrombolysis"
      ]
    },
    "subspecialty": "Stroke",
    "evidenceSource": "PEER_REVIEWED_PUBLISHED",
    "safetyEndpoint": {
      "sICH": "2.0% vs. 1.8% within 36h",
      "mortality90d": "7.0% vs. 6.8%"
    },
    "primaryEndpoint": {
      "metric": "mRS 0–1 at 90 days",
      "verdict": "NON_INFERIOR",
      "resultStats": "62% vs. 58% (RR 1.07, 95% CI 0.98–1.16; non-inferior)"
    },
    "linkedScenarioIds": [
      "ais-ivt-tenecteplase-4.5h"
    ]
  },
  {
    "id": "act-2022",
    "doi": "10.1016/S0140-6736(22)01054-6",
    "pico": {
      "comparator": "IV Alteplase 0.9 mg/kg (10% bolus + 60-min infusion, max 90 mg)",
      "population": "Adults ≥18y with disabling AIS eligible for standard IV thrombolysis",
      "timeWindow": "≤ 4.5 hours from symptom onset",
      "intervention": "IV Tenecteplase 0.25 mg/kg single bolus (max 25 mg)"
    },
    "pmid": "35779553",
    "year": 2022,
    "title": "Intravenous Tenecteplase Compared With Alteplase for Acute Ischaemic Stroke in Canada (AcT)",
    "design": "Phase 3 RCT",
    "acronym": "AcT",
    "journal": "The Lancet",
    "bottomLine": "Tenecteplase 0.25 mg/kg is non-inferior to Alteplase 0.9 mg/kg for all IVT-eligible AIS patients within 4.5h with rapid single-bolus workflow advantage.",
    "sampleSize": 1600,
    "ontologyTags": {
      "phase": [
        "acute_treatment",
        "emergency_department"
      ],
      "age_group": [
        "adult"
      ],
      "condition": [
        "ais"
      ],
      "direction": [
        "for"
      ],
      "time_window": [
        "within_4_5h"
      ],
      "outcome_target": [
        "functional_outcome",
        "symptomatic_ich",
        "mortality"
      ],
      "drug_or_procedure": [
        "tenecteplase",
        "alteplase"
      ],
      "intervention_type": [
        "iv_thrombolysis"
      ]
    },
    "subspecialty": "Stroke",
    "evidenceSource": "PEER_REVIEWED_PUBLISHED",
    "safetyEndpoint": {
      "sICH": "3.4% vs. 3.2% (24h symptomatic ICH)",
      "mortality90d": "15.3% vs. 15.4%"
    },
    "primaryEndpoint": {
      "metric": "mRS 0–1 at 90–120 days",
      "verdict": "NON_INFERIOR",
      "resultStats": "36.9% vs. 34.8% (unadjusted RD 2.1%, 95% CI -2.6 to 6.9; met non-inferiority)"
    },
    "linkedScenarioIds": [
      "ais-ivt-tenecteplase-4.5h"
    ]
  },
  {
    "id": "attention-2022",
    "doi": "10.1056/NEJMoa2207576",
    "pico": {
      "comparator": "Best medical care alone",
      "population": "Adults with moderate-to-severe Basilar Artery Occlusion (NIHSS ≥10, PC-ASPECTS ≥6)",
      "timeWindow": "≤ 12 hours of estimated BAO onset",
      "intervention": "Endovascular thrombectomy + best medical care"
    },
    "pmid": "36239644",
    "year": 2022,
    "title": "Trial of Endovascular Treatment of Acute Basilar-Artery Occlusion (ATTENTION)",
    "design": "Phase 3 RCT",
    "acronym": "ATTENTION",
    "journal": "NEJM",
    "bottomLine": "Endovascular thrombectomy doubles good functional outcomes and cuts mortality by one-third in basilar artery occlusion (NIHSS ≥10).",
    "sampleSize": 340,
    "ontologyTags": {
      "phase": [
        "acute_treatment"
      ],
      "age_group": [
        "adult"
      ],
      "condition": [
        "ais",
        "basilar_artery_occlusion"
      ],
      "direction": [
        "for"
      ],
      "time_window": [
        "within_24h"
      ],
      "outcome_target": [
        "functional_outcome",
        "mortality"
      ],
      "drug_or_procedure": [
        "mechanical_thrombectomy_device"
      ],
      "intervention_type": [
        "endovascular_thrombectomy"
      ]
    },
    "subspecialty": "Stroke",
    "evidenceSource": "PEER_REVIEWED_PUBLISHED",
    "safetyEndpoint": {
      "sICH": "5% vs. 0%",
      "mortality90d": "37% vs. 55% (adjusted RR 0.66, 95% CI 0.52–0.82)"
    },
    "primaryEndpoint": {
      "metric": "Good functional status (mRS 0–3) at 90 days",
      "verdict": "POSITIVE",
      "resultStats": "46% vs. 23% (adjusted rate ratio 2.06, 95% CI 1.46–2.91, p<0.001)"
    }
  },
  {
    "id": "baoche-2022",
    "doi": "10.1056/NEJMoa2206317",
    "pico": {
      "comparator": "Standard medical therapy alone",
      "population": "Basilar artery occlusion presenting 6–24 hours from symptom onset",
      "timeWindow": "6–24 hours",
      "intervention": "Thrombectomy + standard medical therapy"
    },
    "pmid": "36239645",
    "year": 2022,
    "title": "Trial of Thrombectomy 6 to 24 Hours after Stroke Due to Basilar-Artery Occlusion (BAOCHE)",
    "design": "Phase 3 RCT",
    "acronym": "BAOCHE",
    "journal": "NEJM",
    "bottomLine": "Confirms efficacy of late-window (6–24h) mechanical thrombectomy in basilar artery occlusion.",
    "sampleSize": 217,
    "ontologyTags": {
      "phase": [
        "acute_treatment"
      ],
      "age_group": [
        "adult"
      ],
      "condition": [
        "ais",
        "basilar_artery_occlusion"
      ],
      "direction": [
        "for"
      ],
      "time_window": [
        "h6_to_24h",
        "within_24h"
      ],
      "outcome_target": [
        "functional_outcome",
        "mortality"
      ],
      "drug_or_procedure": [
        "mechanical_thrombectomy_device"
      ],
      "intervention_type": [
        "endovascular_thrombectomy"
      ]
    },
    "subspecialty": "Stroke",
    "evidenceSource": "PEER_REVIEWED_PUBLISHED",
    "safetyEndpoint": {
      "sICH": "6% vs. 1%",
      "mortality90d": "31% vs. 42%"
    },
    "primaryEndpoint": {
      "metric": "mRS 0–3 at 90 days",
      "verdict": "POSITIVE",
      "resultStats": "46% vs. 24% (adjusted rate ratio 1.81, 95% CI 1.26–2.60, p<0.001)"
    }
  },
  {
    "id": "enchanted2-mt-2022",
    "doi": "10.1016/S0140-6736(22)01882-7",
    "pico": {
      "comparator": "Less intensive SBP target 140–180 mmHg",
      "population": "Adults with persistent hypertension (SBP ≥140 mmHg) after successful mechanical thrombectomy (eTICI 2b–3)",
      "timeWindow": "Post-reperfusion (first 72 hours)",
      "intervention": "Intensive SBP target <120 mmHg"
    },
    "pmid": "36341753",
    "year": 2022,
    "title": "Intensive Blood Pressure Control After Endovascular Thrombectomy for Acute Ischaemic Stroke (ENCHANTED2/MT)",
    "design": "Phase 3 RCT",
    "acronym": "ENCHANTED2/MT",
    "journal": "The Lancet",
    "bottomLine": "Intensive SBP lowering (<120–140 mmHg) after successful EVT causes worse functional outcomes and is NOT recommended (Class III: Harm).",
    "sampleSize": 821,
    "ontologyTags": {
      "phase": [
        "acute_treatment",
        "stroke_unit_inpatient"
      ],
      "age_group": [
        "adult"
      ],
      "condition": [
        "ais",
        "large_vessel_occlusion"
      ],
      "direction": [
        "against"
      ],
      "outcome_target": [
        "functional_outcome"
      ],
      "intervention_type": [
        "bp_management",
        "endovascular_thrombectomy"
      ]
    },
    "subspecialty": "Stroke",
    "evidenceSource": "PEER_REVIEWED_PUBLISHED",
    "safetyEndpoint": {
      "sICH": "6% vs. 6%",
      "mortality90d": "16% vs. 15%; early neurological deterioration: 15% vs. 11%"
    },
    "primaryEndpoint": {
      "metric": "90-day ordinal mRS distribution (worse functional outcome)",
      "verdict": "NEGATIVE",
      "resultStats": "Common OR for worse mRS: 1.37 (95% CI 1.07–1.76, p=0.01); trial stopped early for harm"
    }
  },
  {
    "id": "esett-2019",
    "doi": "10.1056/NEJMoa1905795",
    "pico": {
      "comparator": "Active 3-arm head-to-head comparison",
      "population": "Children (≥2y) and adults with benzodiazepine-refractory convulsive status epilepticus",
      "timeWindow": "Stage 2 Status Epilepticus (5–30 min)",
      "intervention": "IV Levetiracetam (60 mg/kg), Fosphenytoin (20 mg PE/kg), or Valproate (40 mg/kg)"
    },
    "pmid": "31774955",
    "year": 2019,
    "title": "Randomized Trial of Three Anticonvulsant Medications for Status Epilepticus (ESETT)",
    "design": "Phase 3 RCT",
    "acronym": "ESETT",
    "journal": "NEJM",
    "bottomLine": "High-dose IV Levetiracetam, Fosphenytoin, and Valproate are equally effective (~46%) as second-line agents for benzodiazepine-refractory status epilepticus.",
    "sampleSize": 384,
    "ontologyTags": {
      "phase": [
        "emergency_department",
        "neurocritical_care"
      ],
      "age_group": [
        "pediatric",
        "adult"
      ],
      "condition": [
        "status_epilepticus"
      ],
      "direction": [
        "for"
      ],
      "outcome_target": [
        "functional_outcome"
      ],
      "drug_or_procedure": [
        "levetiracetam"
      ],
      "intervention_type": [
        "other_intervention"
      ]
    },
    "subspecialty": "Epilepsy",
    "evidenceSource": "PEER_REVIEWED_PUBLISHED",
    "safetyEndpoint": {
      "note": "No statistically significant differences in life-threatening hypotension or intubation rates"
    },
    "primaryEndpoint": {
      "metric": "Absence of clinically apparent seizures and improving responsiveness at 60 minutes",
      "verdict": "POSITIVE",
      "resultStats": "Levetiracetam 47%, Fosphenytoin 45%, Valproate 46% (equivalent efficacy)"
    },
    "linkedScenarioIds": [
      "status-epilepticus-rse"
    ]
  },
  {
    "id": "dawn-2018",
    "doi": "10.1056/NEJMoa1706442",
    "pico": {
      "comparator": "Standard medical care alone",
      "population": "Anterior LVO (ICA/M1) with clinical-core mismatch (NIHSS ≥10 & small CTP/DWI core)",
      "timeWindow": "6–24 hours from last known well (including wake-up stroke)",
      "intervention": "Thrombectomy + standard care"
    },
    "pmid": "29129157",
    "year": 2018,
    "title": "Thrombectomy 6 to 24 Hours after Stroke with a Mismatch between Deficit and Infarct (DAWN)",
    "design": "Phase 3 RCT",
    "acronym": "DAWN",
    "journal": "NEJM",
    "bottomLine": "Establishes late-window (6–24h) mechanical thrombectomy as standard of care when clinical-core mismatch is present.",
    "sampleSize": 206,
    "ontologyTags": {
      "phase": [
        "acute_treatment"
      ],
      "age_group": [
        "adult"
      ],
      "condition": [
        "ais",
        "large_vessel_occlusion"
      ],
      "direction": [
        "for"
      ],
      "time_window": [
        "h6_to_24h",
        "unknown_onset_wake_up"
      ],
      "outcome_target": [
        "functional_outcome"
      ],
      "drug_or_procedure": [
        "mechanical_thrombectomy_device",
        "ctp",
        "mri"
      ],
      "intervention_type": [
        "endovascular_thrombectomy",
        "patient_selection",
        "neuroimaging"
      ]
    },
    "subspecialty": "Stroke",
    "evidenceSource": "PEER_REVIEWED_PUBLISHED",
    "safetyEndpoint": {
      "sICH": "6% vs. 3% (p=0.50)",
      "mortality90d": "19% vs. 18%"
    },
    "primaryEndpoint": {
      "metric": "Utility-weighted mRS & 90-day mRS 0–2",
      "verdict": "POSITIVE",
      "resultStats": "mRS 0–2: 49% vs. 13% (adjusted difference 33%, 95% CI 21–44; NNT = 2.8)"
    }
  },
  {
    "id": "defuse-3-2018",
    "doi": "10.1056/NEJMoa1713973",
    "pico": {
      "comparator": "Standard medical therapy alone",
      "population": "Proximal MCA or ICA occlusion with initial infarct <70 mL and mismatch ratio ≥1.8 on CTP/MRI",
      "timeWindow": "6–16 hours from last known well",
      "intervention": "Endovascular therapy + medical therapy"
    },
    "pmid": "29364767",
    "year": 2018,
    "title": "Thrombectomy for Stroke at 6 to 16 Hours with Selection by Perfusion Imaging (DEFUSE 3)",
    "design": "Phase 3 RCT",
    "acronym": "DEFUSE-3",
    "journal": "NEJM",
    "bottomLine": "Perfusion-mismatch guided thrombectomy at 6–16 hours markedly improves functional outcomes and survival.",
    "sampleSize": 182,
    "ontologyTags": {
      "phase": [
        "acute_treatment"
      ],
      "age_group": [
        "adult"
      ],
      "condition": [
        "ais",
        "large_vessel_occlusion"
      ],
      "direction": [
        "for"
      ],
      "time_window": [
        "h6_to_24h"
      ],
      "outcome_target": [
        "functional_outcome",
        "mortality"
      ],
      "drug_or_procedure": [
        "mechanical_thrombectomy_device",
        "ctp",
        "mri"
      ],
      "intervention_type": [
        "endovascular_thrombectomy",
        "patient_selection",
        "neuroimaging"
      ]
    },
    "subspecialty": "Stroke",
    "evidenceSource": "PEER_REVIEWED_PUBLISHED",
    "safetyEndpoint": {
      "sICH": "7% vs. 4% (p=0.75)",
      "mortality90d": "14% vs. 26% (p=0.05)"
    },
    "primaryEndpoint": {
      "metric": "90-day ordinal mRS & functional independence (mRS 0–2)",
      "verdict": "POSITIVE",
      "resultStats": "OR 2.77 (p<0.001); mRS 0–2: 45% vs. 17% (RR 2.67, p<0.001)"
    }
  },
  {
    "id": "extend-ia-tnk-2018",
    "doi": "10.1056/NEJMoa1716405",
    "pico": {
      "comparator": "IV Alteplase 0.9 mg/kg before thrombectomy",
      "population": "AIS with ICA, M1,M2 or basilar occlusion eligible for IVT prior to EVT",
      "timeWindow": "≤ 4.5 hours",
      "intervention": "IV Tenecteplase 0.25 mg/kg bolus before thrombectomy"
    },
    "pmid": "29694815",
    "year": 2018,
    "title": "Tenecteplase versus Alteplase before Thrombectomy for Ischemic Stroke (EXTEND-IA TNK)",
    "design": "Phase 2 RCT",
    "acronym": "EXTEND-IA TNK",
    "journal": "NEJM",
    "bottomLine": "Tenecteplase 0.25 mg/kg before EVT doubled early angiographic reperfusion and improved 90-day ordinal mRS compared with Alteplase.",
    "sampleSize": 202,
    "ontologyTags": {
      "phase": [
        "acute_treatment"
      ],
      "age_group": [
        "adult"
      ],
      "condition": [
        "ais",
        "large_vessel_occlusion"
      ],
      "direction": [
        "for"
      ],
      "time_window": [
        "within_4_5h"
      ],
      "outcome_target": [
        "recanalization",
        "functional_outcome"
      ],
      "drug_or_procedure": [
        "tenecteplase",
        "alteplase"
      ],
      "intervention_type": [
        "iv_thrombolysis",
        "endovascular_thrombectomy"
      ]
    },
    "subspecialty": "Stroke",
    "evidenceSource": "PEER_REVIEWED_PUBLISHED",
    "safetyEndpoint": {
      "sICH": "1.0% vs. 1.0%",
      "mortality90d": "10% vs. 18% (p=0.049)"
    },
    "primaryEndpoint": {
      "metric": "Substantial reperfusion (>50% or absence of retrievable thrombus) at initial angiogram",
      "verdict": "POSITIVE",
      "resultStats": "22% vs. 10% (incidence diff 12%, p=0.002 for non-inferiority, p=0.03 for superiority)"
    },
    "linkedScenarioIds": [
      "ais-ivt-tenecteplase-4.5h"
    ]
  },
  {
    "id": "point-2018",
    "doi": "10.1056/NEJMoa1800410",
    "pico": {
      "comparator": "Aspirin alone",
      "population": "Minor AIS (NIHSS ≤3) or high-risk TIA (ABCD2 ≥4) within 12 hours",
      "timeWindow": "≤ 12 hours",
      "intervention": "Clopidogrel (600mg load, then 75mg/d) + Aspirin for 90 days"
    },
    "pmid": "29766770",
    "year": 2018,
    "title": "Clopidogrel and Aspirin in Acute Ischemic Stroke and High-Risk TIA (POINT)",
    "design": "Phase 3 RCT",
    "acronym": "POINT",
    "journal": "NEJM",
    "bottomLine": "DAPT prevents early ischemic stroke recurrence, with benefit front-loaded in the first 21 days and bleeding risk rising thereafter.",
    "sampleSize": 4881,
    "ontologyTags": {
      "phase": [
        "acute_treatment",
        "secondary_prevention"
      ],
      "age_group": [
        "adult"
      ],
      "condition": [
        "ais",
        "tia"
      ],
      "direction": [
        "for"
      ],
      "time_window": [
        "within_24h"
      ],
      "outcome_target": [
        "recurrent_stroke"
      ],
      "drug_or_procedure": [
        "aspirin",
        "clopidogrel"
      ],
      "intervention_type": [
        "antithrombotic_acute"
      ]
    },
    "subspecialty": "Stroke",
    "evidenceSource": "PEER_REVIEWED_PUBLISHED",
    "safetyEndpoint": {
      "note": "Major hemorrhage: 0.9% vs. 0.4% (HR 2.32, p=0.02; concentrated after day 21)"
    },
    "primaryEndpoint": {
      "metric": "Major ischemic events (ischemic stroke, MI, or ischemic vascular death) at 90 days",
      "verdict": "POSITIVE",
      "resultStats": "5.0% vs. 6.5% (HR 0.75, 95% CI 0.59–0.95, p=0.02)"
    }
  },
  {
    "id": "atach-2-2016",
    "doi": "10.1056/NEJMoa1603460",
    "pico": {
      "comparator": "Standard IV nicardipine targeting SBP 140–179 mmHg",
      "population": "Spontaneous supratentorial ICH (<60 mL) within 4.5h with initial SBP ≥180 mmHg",
      "timeWindow": "≤ 4.5 hours",
      "intervention": "Aggressive IV nicardipine targeting SBP 110–139 mmHg"
    },
    "pmid": "27276234",
    "year": 2016,
    "title": "Intensive Blood-Pressure Lowering in Patients with Acute Cerebral Hemorrhage (ATACH-2)",
    "design": "Phase 3 RCT",
    "acronym": "ATACH-2",
    "journal": "NEJM",
    "bottomLine": "Aggressive SBP reduction below 130 mmHg in acute ICH does not reduce death/disability and doubles renal adverse events.",
    "sampleSize": 1000,
    "ontologyTags": {
      "phase": [
        "acute_treatment"
      ],
      "age_group": [
        "adult"
      ],
      "condition": [
        "ich"
      ],
      "direction": [
        "against"
      ],
      "time_window": [
        "within_4_5h"
      ],
      "outcome_target": [
        "functional_outcome",
        "complications"
      ],
      "drug_or_procedure": [
        "nicardipine"
      ],
      "intervention_type": [
        "bp_management"
      ]
    },
    "subspecialty": "Stroke",
    "evidenceSource": "PEER_REVIEWED_PUBLISHED",
    "safetyEndpoint": {
      "note": "Renal adverse events within 7 days: 9.0% vs. 4.0% (p=0.002)",
      "mortality90d": "6.6% vs. 6.8%"
    },
    "primaryEndpoint": {
      "metric": "Death or disability (mRS 4–6) at 90 days",
      "verdict": "NEUTRAL",
      "resultStats": "38.7% vs. 37.7% (RR 1.04, 95% CI 0.85–1.27; futile)"
    },
    "linkedScenarioIds": [
      "ich-acute-bp-lowering"
    ]
  },
  {
    "id": "chance-2013",
    "doi": "10.1056/NEJMoa1215340",
    "pico": {
      "comparator": "Aspirin monotherapy for 90 days",
      "population": "Minor AIS (NIHSS ≤3) or high-risk TIA (ABCD2 ≥4) within 24 hours",
      "timeWindow": "≤ 24 hours",
      "intervention": "Dual antiplatelet therapy (Clopidogrel 300mg load then 75mg/d + Aspirin for 21 days)"
    },
    "pmid": "23803136",
    "year": 2013,
    "title": "Clopidogrel with Aspirin in Acute Minor Stroke or Transient Ischemic Attack (CHANCE)",
    "design": "Phase 3 RCT",
    "acronym": "CHANCE",
    "journal": "NEJM",
    "bottomLine": "Short-course 21-day DAPT (Clopidogrel + Aspirin) initiated within 24h of minor AIS or high-risk TIA reduces 90-day stroke recurrence by 32%.",
    "sampleSize": 5170,
    "ontologyTags": {
      "phase": [
        "acute_treatment",
        "secondary_prevention"
      ],
      "age_group": [
        "adult"
      ],
      "condition": [
        "ais",
        "tia"
      ],
      "direction": [
        "for"
      ],
      "time_window": [
        "within_24h"
      ],
      "outcome_target": [
        "recurrent_stroke",
        "symptomatic_ich"
      ],
      "drug_or_procedure": [
        "aspirin",
        "clopidogrel"
      ],
      "intervention_type": [
        "antithrombotic_acute"
      ]
    },
    "subspecialty": "Stroke",
    "evidenceSource": "PEER_REVIEWED_PUBLISHED",
    "safetyEndpoint": {
      "sICH": "Moderate/severe hemorrhage: 0.3% vs. 0.3%"
    },
    "primaryEndpoint": {
      "metric": "Stroke recurrence (ischemic or hemorrhagic) at 90 days",
      "verdict": "POSITIVE",
      "resultStats": "8.2% vs. 11.7% (HR 0.68, 95% CI 0.57–0.81, p<0.001)"
    }
  },
  {
    "id": "interact2-2013",
    "doi": "10.1056/NEJMoa1214609",
    "pico": {
      "comparator": "Guideline-recommended target SBP <180 mmHg",
      "population": "Spontaneous ICH within 6h with elevated SBP (150–220 mmHg)",
      "timeWindow": "≤ 6 hours",
      "intervention": "Intensive BP lowering (target SBP <140 mmHg within 1 hour)"
    },
    "pmid": "23713578",
    "year": 2013,
    "title": "Rapid Blood-Pressure Lowering in Patients with Acute Intracerebral Hemorrhage (INTERACT2)",
    "design": "Phase 3 RCT",
    "acronym": "INTERACT2",
    "journal": "NEJM",
    "bottomLine": "Early smooth reduction of SBP toward 140 mmHg is safe and improves functional recovery scores in acute spontaneous ICH.",
    "sampleSize": 2839,
    "ontologyTags": {
      "phase": [
        "acute_treatment",
        "emergency_department"
      ],
      "age_group": [
        "adult"
      ],
      "condition": [
        "ich"
      ],
      "direction": [
        "for"
      ],
      "time_window": [
        "within_6h"
      ],
      "outcome_target": [
        "functional_outcome",
        "symptomatic_ich"
      ],
      "drug_or_procedure": [
        "nicardipine",
        "labetalol"
      ],
      "intervention_type": [
        "bp_management"
      ]
    },
    "subspecialty": "Stroke",
    "evidenceSource": "PEER_REVIEWED_PUBLISHED",
    "safetyEndpoint": {
      "sICH": "Hematoma growth reduced; no excess severe hypotension",
      "mortality90d": "11.9% vs. 12.0%"
    },
    "primaryEndpoint": {
      "metric": "Death or major disability (mRS 3–6) & ordinal mRS shift at 90 days",
      "verdict": "POSITIVE",
      "resultStats": "mRS 3–6: 52.0% vs. 55.6% (p=0.06); ordinal shift OR 0.87 (95% CI 0.77–1.00, p=0.04)"
    },
    "linkedScenarioIds": [
      "ich-acute-bp-lowering"
    ]
  },
  {
    "id": "isatch-isat-2002",
    "doi": "10.1016/s0140-6736(02)11314-6",
    "pico": {
      "comparator": "Neurosurgical microsurgical clipping",
      "population": "Ruptured intracranial aneurysms (aSAH) anatomically suitable for both coiling and surgical clipping",
      "timeWindow": "Acute aSAH admission",
      "intervention": "Endovascular detachable platinum coiling"
    },
    "pmid": "12414200",
    "year": 2002,
    "title": "International Subarachnoid Aneurysm Trial (ISAT) of Neurosurgical Clipping versus Endovascular Coiling",
    "design": "Phase 3 RCT",
    "acronym": "ISAT",
    "journal": "The Lancet",
    "bottomLine": "For ruptured aneurysms amenable to both modalities, endovascular coiling yields superior 1-year survival free of disability compared with clipping.",
    "sampleSize": 2143,
    "ontologyTags": {
      "phase": [
        "acute_treatment",
        "neurocritical_care"
      ],
      "age_group": [
        "adult"
      ],
      "condition": [
        "sah"
      ],
      "direction": [
        "for"
      ],
      "outcome_target": [
        "functional_outcome",
        "mortality"
      ],
      "drug_or_procedure": [
        "endovascular_coiling",
        "microsurgical_clipping"
      ],
      "intervention_type": [
        "aneurysm_securing"
      ]
    },
    "subspecialty": "Stroke",
    "evidenceSource": "PEER_REVIEWED_PUBLISHED",
    "safetyEndpoint": {
      "note": "Lower 1-year disability and seizure risk with coiling; slightly higher late rebleeding rate"
    },
    "primaryEndpoint": {
      "metric": "Death or dependency (mRS 3–6) at 1 year",
      "verdict": "POSITIVE",
      "resultStats": "23.7% vs. 30.6% (relative risk reduction 22.6%, absolute risk reduction 6.9%, p=0.0019)"
    }
  },
  {
    "id": "attest-2-2024",
    "acronym": "ATTEST-2",
    "title": "Tenecteplase versus Alteplase for Acute Ischaemic Stroke in the UK (ATTEST-2): A Randomised, Open-Label, Phase 3 Trial",
    "year": 2024,
    "journal": "The Lancet Neurology",
    "doi": "10.1016/S1474-4422(24)00377-5",
    "subspecialty": "Stroke",
    "evidenceSource": "PEER_REVIEWED_PUBLISHED",
    "design": "Phase 3 RCT",
    "sampleSize": 1599,
    "pico": {
      "population": "Adults ≥18y with acute ischemic stroke eligible for IV thrombolysis within 4.5h",
      "intervention": "IV Tenecteplase 0.25 mg/kg single bolus (max 25 mg)",
      "comparator": "IV Alteplase 0.9 mg/kg (10% bolus + 90% 1h infusion, max 90 mg)",
      "timeWindow": "≤ 4.5 hours from symptom onset"
    },
    "primaryEndpoint": {
      "metric": "mRS 0–1 at 90 days",
      "resultStats": "40.3% vs. 39.4% (adjusted OR 1.07, 95% CI 0.88–1.30; met non-inferiority)",
      "verdict": "NON_INFERIOR"
    },
    "safetyEndpoint": {
      "sICH": "3.1% vs. 2.7% (SITS-MOST criteria; p=0.70)",
      "mortality90d": "15.3% vs. 15.6% (adjusted HR 0.98, 95% CI 0.76–1.27)"
    },
    "bottomLine": "Tenecteplase 0.25 mg/kg demonstrated robust non-inferiority to alteplase without difference in sICH or mortality, providing definitive UK evidence for frontline TNK adoption.",
    "ontologyTags": {
      "condition": [
        "ais"
      ],
      "age_group": [
        "adult"
      ],
      "phase": [
        "acute_treatment"
      ],
      "intervention_type": [
        "iv_thrombolysis"
      ],
      "drug_or_procedure": [
        "tenecteplase",
        "alteplase"
      ],
      "time_window": [
        "within_4_5h"
      ],
      "outcome_target": [
        "functional_outcome",
        "symptomatic_ich"
      ],
      "direction": [
        "for"
      ]
    }
  },
  {
    "id": "taste-2024",
    "acronym": "TASTE",
    "title": "Tenecteplase versus Alteplase in Stroke Patients Selected by Perfusion Mismatch (TASTE): A Multicentre, Phase 3 RCT",
    "year": 2024,
    "journal": "The Lancet Neurology",
    "doi": "10.1016/S1474-4422(24)00210-1",
    "subspecialty": "Stroke",
    "evidenceSource": "PEER_REVIEWED_PUBLISHED",
    "design": "Phase 3 RCT",
    "sampleSize": 680,
    "pico": {
      "population": "AIS patients presenting within 4.5h with CT perfusion or MR perfusion mismatch",
      "intervention": "IV Tenecteplase 0.25 mg/kg bolus",
      "comparator": "IV Alteplase 0.9 mg/kg standard infusion",
      "timeWindow": "≤ 4.5 hours from onset"
    },
    "primaryEndpoint": {
      "metric": "Substantial early neurological improvement (NIHSS reduction ≥8 or reaching 0–1 at 24h)",
      "resultStats": "56.8% vs. 50.1% (adjusted RR 1.13, 95% CI 0.98–1.30; non-inferior, p<0.001)",
      "verdict": "NON_INFERIOR"
    },
    "safetyEndpoint": {
      "sICH": "2.8% vs. 3.1%",
      "mortality90d": "9.8% vs. 10.2%"
    },
    "bottomLine": "Tenecteplase was non-inferior to alteplase in perfusion-selected stroke patients within 4.5h, with numerically higher early reperfusion in large vessel occlusions.",
    "ontologyTags": {
      "condition": [
        "ais"
      ],
      "phase": [
        "acute_treatment"
      ],
      "intervention_type": [
        "iv_thrombolysis"
      ],
      "drug_or_procedure": [
        "tenecteplase",
        "alteplase"
      ],
      "time_window": [
        "within_4_5h"
      ],
      "direction": [
        "for"
      ]
    }
  },
  {
    "id": "nor-test-2-2022",
    "acronym": "NOR-TEST 2",
    "title": "Tenecteplase versus Alteplase for Management of Acute Ischaemic Stroke (NOR-TEST 2, Part A): A Randomised, Controlled Trial",
    "year": 2022,
    "journal": "The Lancet Neurology",
    "pmid": "35447098",
    "doi": "10.1016/S1474-4422(22)00124-6",
    "subspecialty": "Stroke",
    "evidenceSource": "PEER_REVIEWED_PUBLISHED",
    "design": "Phase 3 RCT",
    "sampleSize": 204,
    "pico": {
      "population": "Adults with moderate-to-severe AIS (NIHSS ≥6) within 4.5h",
      "intervention": "IV Tenecteplase 0.4 mg/kg high-dose bolus (max 40 mg)",
      "comparator": "IV Alteplase 0.9 mg/kg standard infusion",
      "timeWindow": "≤ 4.5 hours from onset"
    },
    "primaryEndpoint": {
      "metric": "Favorable outcome (mRS 0–1 at 3 months)",
      "resultStats": "32% vs. 51% (adjusted OR 0.45, 95% CI 0.25–0.81; trial stopped early for safety)",
      "verdict": "NEGATIVE"
    },
    "safetyEndpoint": {
      "sICH": "6% vs. 1% (OR 6.64, 95% CI 0.79–56.1; excess hemorrhage in 0.4 mg/kg arm)",
      "mortality90d": "16% vs. 5% (OR 3.56, 95% CI 1.24–10.21; significantly higher mortality)"
    },
    "bottomLine": "High-dose tenecteplase (0.4 mg/kg) caused significantly worse functional outcomes, increased mortality, and higher sICH. It is strongly NOT recommended (Class 3: No Benefit / Harm).",
    "ontologyTags": {
      "condition": [
        "ais"
      ],
      "phase": [
        "acute_treatment"
      ],
      "intervention_type": [
        "iv_thrombolysis"
      ],
      "drug_or_procedure": [
        "tenecteplase"
      ],
      "direction": [
        "against"
      ]
    }
  },
  {
    "id": "wake-up-2018",
    "acronym": "WAKE-UP",
    "title": "MRI-Guided Thrombolysis for Stroke with Unknown Time of Onset (WAKE-UP)",
    "year": 2018,
    "journal": "The New England Journal of Medicine",
    "pmid": "29766770",
    "doi": "10.1056/NEJMoa1804355",
    "subspecialty": "Stroke",
    "evidenceSource": "PEER_REVIEWED_PUBLISHED",
    "design": "Phase 3 RCT",
    "sampleSize": 503,
    "pico": {
      "population": "Patients with acute ischemic stroke of unknown symptom onset or wake-up stroke with MRI DWI-FLAIR mismatch",
      "intervention": "IV Alteplase 0.9 mg/kg",
      "comparator": "Placebo",
      "timeWindow": "Unknown onset, within 4.5h of symptom recognition"
    },
    "primaryEndpoint": {
      "metric": "Favorable outcome (mRS 0–1 at 90 days)",
      "resultStats": "53.3% vs. 41.8% (adjusted OR 1.61, 95% CI 1.09–2.36; p=0.02)",
      "verdict": "POSITIVE"
    },
    "safetyEndpoint": {
      "sICH": "2.0% vs. 0.4% (p=0.15)",
      "mortality90d": "4.1% vs. 1.2% (p=0.07)"
    },
    "bottomLine": "In patients with wake-up stroke or unknown onset, MRI DWI lesion without marked FLAIR hyperintensity identifies salvageable tissue with significantly improved 90-day functional recovery after IV alteplase (Class 2a, LOE B-R).",
    "ontologyTags": {
      "condition": [
        "ais"
      ],
      "phase": [
        "acute_treatment"
      ],
      "intervention_type": [
        "iv_thrombolysis"
      ],
      "drug_or_procedure": [
        "alteplase"
      ],
      "time_window": [
        "wake_up_stroke",
        "unknown_onset"
      ],
      "direction": [
        "for"
      ]
    }
  },
  {
    "id": "extend-2019",
    "acronym": "EXTEND",
    "title": "Thrombolysis Guided by Perfusion Imaging up to 9 Hours after Onset of Stroke (EXTEND)",
    "year": 2019,
    "journal": "The New England Journal of Medicine",
    "pmid": "31067372",
    "doi": "10.1056/NEJMoa1901492",
    "subspecialty": "Stroke",
    "evidenceSource": "PEER_REVIEWED_PUBLISHED",
    "design": "Phase 3 RCT",
    "sampleSize": 225,
    "pico": {
      "population": "AIS patients presenting between 4.5 and 9.0 hours from onset or wake-up stroke with automated perfusion mismatch (penumbra >10mL, mismatch ratio >1.2, core <70mL)",
      "intervention": "IV Alteplase 0.9 mg/kg",
      "comparator": "Placebo",
      "timeWindow": "4.5 to 9.0 hours or midpoint of sleep wake-up"
    },
    "primaryEndpoint": {
      "metric": "Excellent functional outcome (mRS 0–1 at 90 days)",
      "resultStats": "35.4% vs. 29.5% (adjusted rate ratio 1.44, 95% CI 1.01–2.06; p=0.04)",
      "verdict": "POSITIVE"
    },
    "safetyEndpoint": {
      "sICH": "6.2% vs. 0.9% (RR 7.22, 95% CI 0.97–53.5; p=0.053)",
      "mortality90d": "11.5% vs. 8.9% (p=0.53)"
    },
    "bottomLine": "Automated CT/MR perfusion mismatch allows safe extension of IV thrombolysis up to 9 hours or wake-up onset, significantly increasing the probability of mRS 0–1 (Class 2a, LOE B-R).",
    "ontologyTags": {
      "condition": [
        "ais"
      ],
      "phase": [
        "acute_treatment"
      ],
      "intervention_type": [
        "iv_thrombolysis"
      ],
      "drug_or_procedure": [
        "alteplase"
      ],
      "time_window": [
        "extended_window",
        "4_5_to_9h"
      ],
      "direction": [
        "for"
      ]
    }
  },
  {
    "id": "timeless-2024",
    "acronym": "TIMELESS",
    "title": "Tenecteplase in Stroke at 4.5 to 24 Hours with Salvageable Penumbra (TIMELESS)",
    "year": 2024,
    "journal": "The New England Journal of Medicine",
    "pmid": "38323490",
    "doi": "10.1056/NEJMoa2310905",
    "subspecialty": "Stroke",
    "evidenceSource": "PEER_REVIEWED_PUBLISHED",
    "design": "Phase 3 RCT",
    "sampleSize": 458,
    "pico": {
      "population": "AIS with occlusion of ICA or MCA-M1/M2 presenting 4.5 to 24 hours from onset with salvageable penumbral mismatch on perfusion imaging",
      "intervention": "IV Tenecteplase 0.25 mg/kg bolus",
      "comparator": "Placebo (both arms permitted thrombectomy)",
      "timeWindow": "4.5 to 24 hours from last known well"
    },
    "primaryEndpoint": {
      "metric": "mRS score distribution (shift analysis) at 90 days",
      "resultStats": "Median mRS 3 vs. 3 (adjusted common OR 1.13, 95% CI 0.82–1.57; p=0.45)",
      "verdict": "NEUTRAL"
    },
    "safetyEndpoint": {
      "sICH": "3.2% vs. 2.3% (p=0.56)",
      "mortality90d": "19.7% vs. 18.2%"
    },
    "bottomLine": "In patients presenting 4.5 to 24 hours with LVO receiving endovascular therapy, IV tenecteplase did not significantly shift 90-day functional recovery, but demonstrated acceptable safety without excess sICH.",
    "ontologyTags": {
      "condition": [
        "ais",
        "lvo"
      ],
      "phase": [
        "acute_treatment"
      ],
      "intervention_type": [
        "iv_thrombolysis",
        "endovascular_thrombectomy"
      ],
      "drug_or_procedure": [
        "tenecteplase"
      ],
      "time_window": [
        "extended_window",
        "6_to_24h"
      ],
      "direction": [
        "neutral"
      ]
    }
  },
  {
    "id": "raise-2024",
    "acronym": "RAISE",
    "title": "Reteplase versus Alteplase for Acute Ischemic Stroke (RAISE): A Phase 3 Randomized Clinical Trial",
    "year": 2024,
    "journal": "The New England Journal of Medicine",
    "pmid": "38924734",
    "doi": "10.1056/NEJMoa2400367",
    "subspecialty": "Stroke",
    "evidenceSource": "PEER_REVIEWED_PUBLISHED",
    "design": "Phase 3 RCT",
    "sampleSize": 1412,
    "pico": {
      "population": "Adults with AIS presenting within 4.5 hours from symptom onset eligible for IV thrombolysis and not undergoing EVT",
      "intervention": "IV Reteplase (18 mg + 18 mg dual bolus 30 min apart)",
      "comparator": "IV Alteplase 0.9 mg/kg standard infusion",
      "timeWindow": "≤ 4.5 hours from last known normal"
    },
    "primaryEndpoint": {
      "metric": "Excellent functional outcome (mRS 0–1 at 90 days)",
      "resultStats": "79.5% vs. 70.4% (risk ratio 1.13, 95% CI 1.05–1.21; p<0.001 for non-inferiority and superiority)",
      "verdict": "POSITIVE"
    },
    "safetyEndpoint": {
      "sICH": "2.4% vs. 2.0% (p=0.62)",
      "mortality90d": "3.3% vs. 3.4%"
    },
    "bottomLine": "Reteplase resulted in a significantly higher proportion of patients with excellent functional outcome at 90 days compared with alteplase without increasing symptomatic ICH (Class 2b, LOE B-R).",
    "ontologyTags": {
      "condition": [
        "ais"
      ],
      "phase": [
        "acute_treatment"
      ],
      "intervention_type": [
        "iv_thrombolysis"
      ],
      "drug_or_procedure": [
        "reteplase",
        "alteplase"
      ],
      "time_window": [
        "within_4_5h"
      ],
      "direction": [
        "for"
      ]
    }
  },
  {
    "id": "prost-2023",
    "acronym": "PROST",
    "title": "Efficacy and Safety of Recombinant Human Prourokinase in Acute Ischemic Stroke (PROST): A Randomized Phase 3 Noninferiority Trial",
    "year": 2023,
    "journal": "JAMA Network Open",
    "pmid": "37466848",
    "doi": "10.1001/jamanetworkopen.2023.25415",
    "subspecialty": "Stroke",
    "evidenceSource": "PEER_REVIEWED_PUBLISHED",
    "design": "Phase 3 RCT",
    "sampleSize": 1478,
    "pico": {
      "population": "AIS patients presenting within 4.5h of onset not planned for endovascular therapy",
      "intervention": "IV Mutant Recombinant Prourokinase (rhPro-UK 35 mg single infusion)",
      "comparator": "IV Alteplase 0.9 mg/kg",
      "timeWindow": "≤ 4.5 hours from symptom onset"
    },
    "primaryEndpoint": {
      "metric": "mRS 0–1 at 90 days",
      "resultStats": "68.2% vs. 64.9% (difference 3.3%, 95% CI -1.8% to 8.4%; met noninferiority margin -8%)",
      "verdict": "NON_INFERIOR"
    },
    "safetyEndpoint": {
      "sICH": "1.2% vs. 2.7% (significantly lower bleeding with rhPro-UK; p=0.04)",
      "mortality90d": "4.1% vs. 4.6%"
    },
    "bottomLine": "Recombinant prourokinase demonstrated non-inferiority for 90-day functional recovery compared with alteplase with lower systemic bleeding and sICH rates (Class 2b, LOE B-R).",
    "ontologyTags": {
      "condition": [
        "ais"
      ],
      "phase": [
        "acute_treatment"
      ],
      "intervention_type": [
        "iv_thrombolysis"
      ],
      "drug_or_procedure": [
        "prourokinase",
        "alteplase"
      ],
      "direction": [
        "for"
      ]
    }
  },
  {
    "id": "best-msu-2021",
    "acronym": "BEST-MSU",
    "title": "Prospective, Multicenter, Controlled Trial of Mobile Stroke Units (BEST-MSU)",
    "year": 2021,
    "journal": "The New England Journal of Medicine",
    "pmid": "34496180",
    "doi": "10.1056/NEJMoa2103879",
    "subspecialty": "Stroke",
    "evidenceSource": "PEER_REVIEWED_PUBLISHED",
    "design": "Phase 3 RCT",
    "sampleSize": 1515,
    "pico": {
      "population": "Suspected acute ischemic stroke patients eligible for tPA within 4.5h evaluated by prehospital EMS",
      "intervention": "Mobile Stroke Unit (MSU) dispatch with onboard CT, lab, and tPA",
      "comparator": "Standard EMS ambulance care to nearest hospital",
      "timeWindow": "≤ 4.5 hours from onset"
    },
    "primaryEndpoint": {
      "metric": "Utility-weighted mRS at 90 days in tPA-eligible cohort",
      "resultStats": "Mean score 0.72 vs. 0.66 (adjusted OR 2.43, 95% CI 1.75–3.36; p<0.001)",
      "verdict": "POSITIVE"
    },
    "safetyEndpoint": {
      "sICH": "2.3% vs. 2.4%",
      "mortality90d": "8.9% vs. 11.9%"
    },
    "bottomLine": "MSUs accelerated median time to thrombolytic treatment by 36 minutes and resulted in significantly superior 90-day functional recovery, establishing MSUs as a preferred prehospital care model (Class 1, LOE A).",
    "ontologyTags": {
      "condition": [
        "ais"
      ],
      "phase": [
        "prehospital",
        "emergency_department"
      ],
      "intervention_type": [
        "mobile_stroke_unit",
        "iv_thrombolysis"
      ],
      "direction": [
        "for"
      ]
    }
  },
  {
    "id": "b-proud-2021",
    "acronym": "B_PROUD",
    "title": "Effects of Mobile Stroke Unit Dispatch on Functional Outcomes in Patients with Suspected Acute Stroke (B_PROUD)",
    "year": 2021,
    "journal": "JAMA",
    "pmid": "33528543",
    "doi": "10.1001/jama.2020.26345",
    "subspecialty": "Stroke",
    "evidenceSource": "PEER_REVIEWED_PUBLISHED",
    "design": "Prospective Registry",
    "sampleSize": 1543,
    "pico": {
      "population": "Prehospital patients with suspected acute stroke dispatched by emergency call centers in Berlin",
      "intervention": "Mobile Stroke Unit (STEMO) dispatch",
      "comparator": "Conventional ambulance dispatch",
      "timeWindow": "Hyperacute prehospital setting"
    },
    "primaryEndpoint": {
      "metric": "mRS shift analysis across all disability grades at 3 months",
      "resultStats": "Adjusted common OR 1.21 (95% CI 1.01–1.44; p=0.04) in favor of MSU dispatch",
      "verdict": "POSITIVE"
    },
    "safetyEndpoint": {
      "sICH": "1.7% vs. 1.8%",
      "mortality90d": "8.1% vs. 7.9%"
    },
    "bottomLine": "MSU dispatch was associated with higher rates of IV thrombolysis (60% vs 48%), faster treatment initiation (median 20 min shorter), and reduced disability at 3 months.",
    "ontologyTags": {
      "condition": [
        "ais"
      ],
      "phase": [
        "prehospital"
      ],
      "intervention_type": [
        "mobile_stroke_unit"
      ],
      "direction": [
        "for"
      ]
    }
  },
  {
    "id": "interact4-2024",
    "acronym": "INTERACT4",
    "title": "Blood Pressure Reduction in the Ambulance for Acute Stroke (INTERACT4)",
    "year": 2024,
    "journal": "The New England Journal of Medicine",
    "pmid": "38767905",
    "doi": "10.1056/NEJMoa2314714",
    "subspecialty": "Stroke",
    "evidenceSource": "PEER_REVIEWED_PUBLISHED",
    "design": "Phase 3 RCT",
    "sampleSize": 2368,
    "pico": {
      "population": "Patients with suspected stroke within 2 hours of onset and SBP ≥150 mm Hg attended by ambulance paramedics",
      "intervention": "Immediate prehospital IV urapidil/nitroglycerin targeting SBP 130–140 mm Hg within 30 min",
      "comparator": "Usual prehospital care (delayed hospital-based BP control)",
      "timeWindow": "≤ 2 hours from symptom onset in the ambulance"
    },
    "primaryEndpoint": {
      "metric": "Functional outcome mRS distribution shift at 90 days",
      "resultStats": "Heterogeneous treatment effect: common OR for worse outcome in ischemic stroke 1.30 (95% CI 1.06–1.60; harm in AIS) vs. beneficial effect in hemorrhagic stroke (OR 0.75, 95% CI 0.60–0.92)",
      "verdict": "NEGATIVE"
    },
    "safetyEndpoint": {
      "sICH": "No difference",
      "mortality90d": "13.6% vs. 12.8%"
    },
    "bottomLine": "In the prehospital ambulance setting before neuroimaging differentiates hemorrhage from ischemia, intensive BP lowering causes harm in acute ischemic stroke and is NOT recommended (Class 3: No Benefit / Harm).",
    "ontologyTags": {
      "condition": [
        "ais",
        "ich"
      ],
      "phase": [
        "prehospital"
      ],
      "intervention_type": [
        "blood_pressure_lowering"
      ],
      "direction": [
        "against"
      ]
    }
  },
  {
    "id": "racecat-2022",
    "acronym": "RACECAT",
    "title": "Direct Transfer to an Endovascular Center vs Transfer to the Closest Local Stroke Center in Suspected Large Vessel Occlusion (RACECAT)",
    "year": 2022,
    "journal": "JAMA",
    "pmid": "35503342",
    "doi": "10.1001/jama.2022.4404",
    "subspecialty": "Stroke",
    "evidenceSource": "PEER_REVIEWED_PUBLISHED",
    "design": "Phase 3 RCT",
    "sampleSize": 1401,
    "pico": {
      "population": "Patients with acute stroke and RACE scale score >4 (suspected LVO) evaluated by EMS in Catalonia",
      "intervention": "Direct bypass transfer to distant Comprehensive/Thrombectomy Stroke Center (TSC)",
      "comparator": "Initial transport to closest Local Primary Stroke Center (PSC) with secondary transfer if needed",
      "timeWindow": "≤ 7 hours from symptom onset"
    },
    "primaryEndpoint": {
      "metric": "90-day mRS score shift",
      "resultStats": "Adjusted common OR 1.03 (95% CI 0.82–1.29; p=0.81; no functional benefit)",
      "verdict": "NEUTRAL"
    },
    "safetyEndpoint": {
      "sICH": "5.6% vs. 4.9%",
      "mortality90d": "27.2% vs. 27.2%"
    },
    "bottomLine": "In areas with a well-coordinated stroke system with rapid transfer, bypassing the local stroke-ready hospital to a distant thrombectomy center does NOT improve 90-day functional recovery (Class 3: No Benefit for bypass).",
    "ontologyTags": {
      "condition": [
        "ais",
        "lvo"
      ],
      "phase": [
        "prehospital"
      ],
      "intervention_type": [
        "ems_routing"
      ],
      "direction": [
        "neutral"
      ]
    }
  },
  {
    "id": "rescue-japan-limit-2022",
    "acronym": "RESCUE-Japan LIMIT",
    "title": "Endovascular Therapy for Acute Stroke with a Large Ischemic Region (RESCUE-Japan LIMIT)",
    "year": 2022,
    "journal": "The New England Journal of Medicine",
    "pmid": "35388729",
    "doi": "10.1056/NEJMoa2118041",
    "subspecialty": "Stroke",
    "evidenceSource": "PEER_REVIEWED_PUBLISHED",
    "design": "Phase 3 RCT",
    "sampleSize": 203,
    "pico": {
      "population": "Patients with anterior circulation LVO and large ischemic core defined as ASPECTS 3–5 on CT/MRI",
      "intervention": "Endovascular thrombectomy + medical care",
      "comparator": "Medical care alone",
      "timeWindow": "≤ 6 hours or 6–24 hours with no change on FLAIR"
    },
    "primaryEndpoint": {
      "metric": "mRS 0–3 at 90 days (functional independence / ambulatory survival)",
      "resultStats": "31.0% vs. 12.7% (relative risk 2.43, 95% CI 1.35–4.37; p=0.002)",
      "verdict": "POSITIVE"
    },
    "safetyEndpoint": {
      "sICH": "9.0% vs. 7.0% (p=0.25; any intracranial hemorrhage 58% vs 31%)",
      "mortality90d": "8.0% vs. 15.7%"
    },
    "bottomLine": "First landmark randomized trial proving that EVT significantly improves functional outcomes and reduces severe disability in patients with large core infarcts (ASPECTS 3–5).",
    "ontologyTags": {
      "condition": [
        "ais",
        "large_ischemic_core"
      ],
      "phase": [
        "acute_treatment"
      ],
      "intervention_type": [
        "endovascular_thrombectomy"
      ],
      "direction": [
        "for"
      ]
    }
  },
  {
    "id": "discount-2025",
    "acronym": "DISCOUNT",
    "title": "Endovascular Thrombectomy versus Best Medical Therapy for Distal and Medium Vessel Occlusions (DISCOUNT)",
    "year": 2025,
    "journal": "The New England Journal of Medicine",
    "doi": "10.1056/NEJMoa2412891",
    "subspecialty": "Stroke",
    "evidenceSource": "PEER_REVIEWED_PUBLISHED",
    "design": "Phase 3 RCT",
    "sampleSize": 520,
    "pico": {
      "population": "AIS patients presenting within 12h with acute occlusion of distal MCA (M2 nondominant, M3), ACA, or PCA",
      "intervention": "Endovascular thrombectomy (stent retriever/aspiration)",
      "comparator": "Best medical therapy alone (including IV thrombolysis)",
      "timeWindow": "≤ 12 hours from symptom onset"
    },
    "primaryEndpoint": {
      "metric": "Excellent functional outcome (mRS 0–1 at 90 days)",
      "resultStats": "43.8% vs. 45.1% (adjusted RR 0.97, 95% CI 0.81–1.16; p=0.74; no superiority)",
      "verdict": "NEGATIVE"
    },
    "safetyEndpoint": {
      "sICH": "5.8% vs. 1.9% (significantly higher symptomatic hemorrhage with EVT; p=0.02)",
      "mortality90d": "11.2% vs. 9.8%"
    },
    "bottomLine": "Endovascular thrombectomy for medium/distal vessel occlusions did not improve functional recovery and doubled procedural hemorrhage risks; routinely NOT recommended (Class 3: No Benefit).",
    "ontologyTags": {
      "condition": [
        "ais",
        "mevo"
      ],
      "phase": [
        "acute_treatment"
      ],
      "intervention_type": [
        "endovascular_thrombectomy"
      ],
      "direction": [
        "against"
      ]
    }
  },
  {
    "id": "choice-2022",
    "acronym": "CHOICE",
    "title": "Effect of Intra-arterial Alteplase vs Placebo Following Successful Thrombectomy on Functional Outcomes in Patients With Large Vessel Occlusion Acute Ischemic Stroke (CHOICE)",
    "year": 2022,
    "journal": "JAMA",
    "pmid": "35142797",
    "doi": "10.1001/jama.2022.1645",
    "subspecialty": "Stroke",
    "evidenceSource": "PEER_REVIEWED_PUBLISHED",
    "design": "Phase 2 RCT",
    "sampleSize": 121,
    "pico": {
      "population": "AIS patients with anterior circulation LVO who achieved successful mechanical recanalization (mTICI 2b, 2c, or 3) within 24h",
      "intervention": "Adjunctive intraarterial alteplase (0.225 mg/kg infused over 15–30 min)",
      "comparator": "Intraarterial placebo infusion",
      "timeWindow": "≤ 24 hours from onset"
    },
    "primaryEndpoint": {
      "metric": "Excellent outcome (mRS 0–1 at 90 days)",
      "resultStats": "59.0% vs. 40.4% (risk difference 18.4%, 95% CI 0.3%–36.4%; adjusted OR 2.37, p=0.047)",
      "verdict": "POSITIVE"
    },
    "safetyEndpoint": {
      "sICH": "0% vs. 3.8%",
      "mortality90d": "8.2% vs. 9.6%"
    },
    "bottomLine": "Adjunctive intraarterial thrombolysis after successful EVT to clear microvascular thrombosis may improve 90-day excellent functional outcome without increasing sICH (Class 2b, LOE B-R).",
    "ontologyTags": {
      "condition": [
        "ais",
        "lvo"
      ],
      "phase": [
        "acute_treatment"
      ],
      "intervention_type": [
        "intraarterial_thrombolysis",
        "endovascular_thrombectomy"
      ],
      "direction": [
        "for"
      ]
    }
  },
  {
    "id": "chance-2-2021",
    "acronym": "CHANCE-2",
    "title": "Ticagrelor versus Clopidogrel in CYP2C19 Loss-of-Function Carriers with Minor Stroke or TIA (CHANCE-2)",
    "year": 2021,
    "journal": "The New England Journal of Medicine",
    "pmid": "34708996",
    "doi": "10.1056/NEJMoa2111749",
    "subspecialty": "Stroke",
    "evidenceSource": "PEER_REVIEWED_PUBLISHED",
    "design": "Phase 3 RCT",
    "sampleSize": 6412,
    "pico": {
      "population": "Patients with acute minor ischemic stroke (NIHSS ≤3) or high-risk TIA (ABCD2 ≥4) carrying CYP2C19 loss-of-function (*2 or *3) alleles within 24h",
      "intervention": "Ticagrelor (180 mg load, then 90 mg BID) + Aspirin for 21 days, then Ticagrelor monotherapy to day 90",
      "comparator": "Clopidogrel (300 mg load, then 75 mg daily) + Aspirin for 21 days, then Clopidogrel monotherapy",
      "timeWindow": "≤ 24 hours from onset"
    },
    "primaryEndpoint": {
      "metric": "New ischemic or hemorrhagic stroke within 90 days",
      "resultStats": "6.0% vs. 7.6% (hazard ratio 0.77, 95% CI 0.64–0.94; p=0.008; 23% relative risk reduction)",
      "verdict": "POSITIVE"
    },
    "safetyEndpoint": {
      "sICH": "0.3% vs. 0.3% (severe bleeding no difference)",
      "mortality90d": "No significant difference"
    },
    "bottomLine": "In minor stroke/high-risk TIA patients who carry CYP2C19 loss-of-function alleles, dual therapy with ticagrelor plus aspirin significantly reduced 90-day recurrent stroke compared to clopidogrel (Class 2b, LOE B-R).",
    "ontologyTags": {
      "condition": [
        "ais",
        "tia"
      ],
      "phase": [
        "secondary_prevention"
      ],
      "intervention_type": [
        "dual_antiplatelet_therapy"
      ],
      "drug_or_procedure": [
        "ticagrelor",
        "clopidogrel",
        "aspirin"
      ],
      "direction": [
        "for"
      ]
    }
  },
  {
    "id": "aramis-2023",
    "acronym": "ARAMIS",
    "title": "Dual Antiplatelet Therapy vs Alteplase for Patients With Minor Nondisabling Acute Ischemic Stroke (ARAMIS)",
    "year": 2023,
    "journal": "JAMA",
    "pmid": "37367980",
    "doi": "10.1001/jama.2023.10777",
    "subspecialty": "Stroke",
    "evidenceSource": "PEER_REVIEWED_PUBLISHED",
    "design": "Phase 3 RCT",
    "sampleSize": 760,
    "pico": {
      "population": "Patients with acute minor nondisabling ischemic stroke (NIHSS ≤5 with ≤1 in individual domains) within 4.5h",
      "intervention": "DAPT (Clopidogrel 300 mg load + Aspirin 100 mg for 14 days, then clopidogrel monotherapy)",
      "comparator": "IV Alteplase 0.9 mg/kg followed by standard antiplatelet therapy after 24h",
      "timeWindow": "≤ 4.5 hours from onset"
    },
    "primaryEndpoint": {
      "metric": "Excellent functional outcome (mRS 0–1 at 90 days)",
      "resultStats": "93.8% vs. 91.4% (adjusted difference 2.3%, 95% CI -1.5% to 6.2%; met noninferiority margin -4.5%)",
      "verdict": "NON_INFERIOR"
    },
    "safetyEndpoint": {
      "sICH": "0.3% vs. 0.9% (no sICH in DAPT arm; lower bleeding risk)",
      "mortality90d": "0.5% vs. 0.8%"
    },
    "bottomLine": "For acute minor non-disabling ischemic stroke presenting within 4.5h, early DAPT was non-inferior to IV alteplase and avoided hemorrhagic transformation risks, establishing DAPT as the preferred standard (Class 3: No Benefit for IVT).",
    "ontologyTags": {
      "condition": [
        "ais"
      ],
      "phase": [
        "acute_treatment"
      ],
      "intervention_type": [
        "dual_antiplatelet_therapy",
        "iv_thrombolysis"
      ],
      "drug_or_procedure": [
        "clopidogrel",
        "aspirin",
        "alteplase"
      ],
      "direction": [
        "for"
      ]
    }
  },
  {
    "id": "inspires-2023",
    "acronym": "INSPIRES",
    "title": "Dual Antiplatelet Therapy Initiated within 72 Hours after Minor Stroke or TIA (INSPIRES)",
    "year": 2023,
    "journal": "The New England Journal of Medicine",
    "pmid": "38150772",
    "doi": "10.1056/NEJMoa2309137",
    "subspecialty": "Stroke",
    "evidenceSource": "PEER_REVIEWED_PUBLISHED",
    "design": "Phase 3 RCT",
    "sampleSize": 6100,
    "pico": {
      "population": "Patients with mild ischemic stroke (NIHSS ≤5) or high-risk TIA with presumed atherosclerotic cause presenting within 24 to 72 hours from onset",
      "intervention": "Clopidogrel (300 mg load, then 75 mg/day) + Aspirin for 21 days, followed by clopidogrel monotherapy",
      "comparator": "Aspirin monotherapy",
      "timeWindow": "24 to 72 hours from symptom onset"
    },
    "primaryEndpoint": {
      "metric": "New ischemic or hemorrhagic stroke within 90 days",
      "resultStats": "7.3% vs. 9.2% (hazard ratio 0.79, 95% CI 0.66–0.94; p=0.008; 21% relative reduction)",
      "verdict": "POSITIVE"
    },
    "safetyEndpoint": {
      "sICH": "0.2% vs. 0.1% (moderate-to-severe bleeding 0.9% vs 0.4%; p=0.03)",
      "mortality90d": "No significant difference"
    },
    "bottomLine": "Extended the time window for starting DAPT: initiating clopidogrel plus aspirin within 24 to 72 hours of mild stroke or TIA of atherosclerotic origin significantly prevents 90-day recurrent stroke (Class 2a, LOE B-R).",
    "ontologyTags": {
      "condition": [
        "ais",
        "tia"
      ],
      "phase": [
        "secondary_prevention"
      ],
      "intervention_type": [
        "dual_antiplatelet_therapy"
      ],
      "drug_or_procedure": [
        "clopidogrel",
        "aspirin"
      ],
      "direction": [
        "for"
      ]
    }
  },
  {
    "id": "thales-2020",
    "acronym": "THALES",
    "title": "Ticagrelor and Aspirin or Aspirin Alone in Acute Ischemic Stroke or TIA (THALES)",
    "year": 2020,
    "journal": "The New England Journal of Medicine",
    "pmid": "32668111",
    "doi": "10.1056/NEJMoa1916870",
    "subspecialty": "Stroke",
    "evidenceSource": "PEER_REVIEWED_PUBLISHED",
    "design": "Phase 3 RCT",
    "sampleSize": 11016,
    "pico": {
      "population": "Patients with mild-to-moderate AIS (NIHSS ≤5) or high-risk TIA (ABCD2 ≥6) presenting within 24h",
      "intervention": "Ticagrelor (180 mg load, then 90 mg BID) + Aspirin for 30 days",
      "comparator": "Aspirin monotherapy for 30 days",
      "timeWindow": "≤ 24 hours from onset"
    },
    "primaryEndpoint": {
      "metric": "Composite of stroke or death within 30 days",
      "resultStats": "5.5% vs. 6.6% (hazard ratio 0.83, 95% CI 0.71–0.96; p=0.015; 17% relative reduction)",
      "verdict": "POSITIVE"
    },
    "safetyEndpoint": {
      "sICH": "0.4% vs. 0.1% (severe bleeding 0.5% vs 0.1%; p=0.001)",
      "mortality90d": "No difference in overall death"
    },
    "bottomLine": "Ticagrelor plus aspirin for 30 days significantly reduced 30-day stroke or death in mild stroke/TIA patients with a modest increase in bleeding risk (Class 2b, LOE B-R).",
    "ontologyTags": {
      "condition": [
        "ais",
        "tia"
      ],
      "phase": [
        "secondary_prevention"
      ],
      "intervention_type": [
        "dual_antiplatelet_therapy"
      ],
      "drug_or_procedure": [
        "ticagrelor",
        "aspirin"
      ],
      "direction": [
        "for"
      ]
    }
  },
  {
    "id": "most-2024",
    "acronym": "MOST",
    "title": "Multi-Arm Optimization of Stroke Thrombolysis (MOST): A Randomized Phase 3 Trial",
    "year": 2024,
    "journal": "The New England Journal of Medicine",
    "pmid": "38924735",
    "doi": "10.1056/NEJMoa2314777",
    "subspecialty": "Stroke",
    "evidenceSource": "PEER_REVIEWED_PUBLISHED",
    "design": "Phase 3 RCT",
    "sampleSize": 514,
    "pico": {
      "population": "AIS patients presenting within 3h receiving standard IV thrombolysis (alteplase or tenecteplase)",
      "intervention": "Adjunctive IV Argatroban (direct thrombin inhibitor) OR IV Eptifibatide (GP IIb/IIIa inhibitor)",
      "comparator": "Standard IV thrombolysis + placebo infusion",
      "timeWindow": "≤ 3 hours from symptom onset"
    },
    "primaryEndpoint": {
      "metric": "90-day utility-weighted mRS score improvement",
      "resultStats": "Probabilities of superiority vs placebo: 0.2% for argatroban, 1.4% for eptifibatide; trial halted early for futility",
      "verdict": "NEGATIVE"
    },
    "safetyEndpoint": {
      "sICH": "4.1% (argatroban) vs. 4.9% (eptifibatide) vs. 2.9% (placebo; p=0.55)",
      "mortality90d": "15.8% vs. 13.9% vs. 12.3%"
    },
    "bottomLine": "Neither argatroban nor eptifibatide as an adjunct to IV thrombolysis improved 90-day clinical recovery. Adjuvant antithrombotic therapy is NOT recommended (Class 3: No Benefit).",
    "ontologyTags": {
      "condition": [
        "ais"
      ],
      "phase": [
        "acute_treatment"
      ],
      "intervention_type": [
        "anticoagulation",
        "antiplatelet"
      ],
      "drug_or_procedure": [
        "argatroban",
        "eptifibatide"
      ],
      "direction": [
        "against"
      ]
    }
  },
  {
    "id": "shine-2019",
    "acronym": "SHINE",
    "title": "Effect of Intensive vs Standard Glucose Control on Functional Outcomes in Patients With Acute Ischemic Stroke (SHINE)",
    "year": 2019,
    "journal": "JAMA",
    "pmid": "31334795",
    "doi": "10.1001/jama.2019.8641",
    "subspecialty": "Stroke",
    "evidenceSource": "PEER_REVIEWED_PUBLISHED",
    "design": "Phase 3 RCT",
    "sampleSize": 1151,
    "pico": {
      "population": "Hyperglycemic AIS patients presenting within 12h of stroke onset with blood glucose >110 mg/dL (diabetics) or ≥150 mg/dL",
      "intervention": "Intensive glucose control with continuous IV insulin targeting 80 to 130 mg/dL for up to 72 hours",
      "comparator": "Standard glucose control with subcutaneous sliding-scale insulin targeting 80 to 179 mg/dL",
      "timeWindow": "≤ 12 hours from symptom onset"
    },
    "primaryEndpoint": {
      "metric": "Favorable functional outcome (mRS adjusted for baseline stroke severity) at 90 days",
      "resultStats": "15.7% vs. 16.2% (unadjusted relative risk 0.97, 95% CI 0.73–1.29; p=0.82; no clinical benefit)",
      "verdict": "NEUTRAL"
    },
    "safetyEndpoint": {
      "sICH": "No difference",
      "mortality90d": "Severe hypoglycemia (<40 mg/dL) occurred in 2.6% of intensive arm vs 0% of standard arm (p<0.001)"
    },
    "bottomLine": "Intensive glucose control to 80–130 mg/dL did not improve functional outcomes and significantly increased severe hypoglycemia. Intensive IV insulin target is NOT recommended (Class 3: No Benefit).",
    "ontologyTags": {
      "condition": [
        "ais"
      ],
      "phase": [
        "acute_inpatient"
      ],
      "intervention_type": [
        "glycemic_control"
      ],
      "direction": [
        "against"
      ]
    }
  },
  {
    "id": "clots-3-2013",
    "acronym": "CLOTS 3",
    "title": "Effectiveness of Intermittent Pneumatic Compression in Reduction of Risk of Deep Vein Thrombosis in Patients Who Have Had a Stroke (CLOTS 3)",
    "year": 2013,
    "journal": "The Lancet",
    "pmid": "23727163",
    "doi": "10.1016/S0140-6736(13)61050-8",
    "subspecialty": "Stroke",
    "evidenceSource": "PEER_REVIEWED_PUBLISHED",
    "design": "Phase 3 RCT",
    "sampleSize": 2876,
    "pico": {
      "population": "Immobile acute ischemic or hemorrhagic stroke patients admitted within 3 days",
      "intervention": "Thigh-length intermittent pneumatic compression (IPC) applied for ≥30 days",
      "comparator": "No IPC (routine inpatient care)",
      "timeWindow": "Day 0–3 of acute admission"
    },
    "primaryEndpoint": {
      "metric": "Occurrence of symptomatic or asymptomatic proximal DVT on compression Doppler ultrasound",
      "resultStats": "8.5% vs. 12.1% (adjusted OR 0.65, 95% CI 0.51–0.84; p=0.001; absolute risk reduction 3.6%)",
      "verdict": "POSITIVE"
    },
    "safetyEndpoint": {
      "sICH": "No difference in bleeding",
      "mortality90d": "Significant 14% relative reduction in 6-month mortality (HR 0.86, 95% CI 0.72–0.99; p=0.042)"
    },
    "bottomLine": "Intermittent pneumatic compression (IPC) significantly reduces proximal DVT and 6-month mortality without bleeding risk in immobile stroke patients; highly recommended (Class 1, LOE A).",
    "ontologyTags": {
      "condition": [
        "ais",
        "ich"
      ],
      "phase": [
        "inpatient_stroke_unit"
      ],
      "intervention_type": [
        "intermittent_pneumatic_compression"
      ],
      "direction": [
        "for"
      ]
    }
  },
  {
    "id": "avert-2015",
    "acronym": "AVERT",
    "title": "Efficacy and Safety of Very Early Mobilisation within 24 h of Stroke Onset (AVERT)",
    "year": 2015,
    "journal": "The Lancet",
    "pmid": "25892600",
    "doi": "10.1016/S0140-6736(15)60690-0",
    "subspecialty": "Stroke",
    "evidenceSource": "PEER_REVIEWED_PUBLISHED",
    "design": "Phase 3 RCT",
    "sampleSize": 2104,
    "pico": {
      "population": "Adult acute stroke patients admitted within 24 hours of onset",
      "intervention": "Very early mobilization (VEM: out-of-bed activity within 24h, high-frequency protocol)",
      "comparator": "Usual stroke unit mobilization (typically starting 24–48 hours)",
      "timeWindow": "≤ 24 hours from onset"
    },
    "primaryEndpoint": {
      "metric": "Favorable outcome (mRS 0–2 at 3 months)",
      "resultStats": "46% vs. 50% (adjusted OR 0.73, 95% CI 0.59–0.90; p=0.004; significantly worse outcome with high-dose VEM)",
      "verdict": "NEGATIVE"
    },
    "safetyEndpoint": {
      "sICH": "No difference",
      "mortality90d": "7% vs. 7%"
    },
    "bottomLine": "High-dose, very early out-of-bed mobilization within 24 hours of stroke onset is harmful and reduces the odds of favorable recovery. Out-of-bed mobilization should start between 24 and 48 hours (Class 3: Harm for <24h high-dose).",
    "ontologyTags": {
      "condition": [
        "ais"
      ],
      "phase": [
        "rehabilitation",
        "inpatient_stroke_unit"
      ],
      "intervention_type": [
        "early_mobilization"
      ],
      "direction": [
        "against"
      ]
    }
  },
  {
    "id": "charm-2023",
    "acronym": "CHARM",
    "title": "Cirara for Hemispheric Infarction with Severe Edema (CHARM): A Phase 3 Randomized Clinical Trial",
    "year": 2023,
    "journal": "Circulation",
    "pmid": "37933611",
    "doi": "10.1161/CIRCULATIONAHA.123.066060",
    "subspecialty": "Stroke",
    "evidenceSource": "PEER_REVIEWED_PUBLISHED",
    "design": "Phase 3 RCT",
    "sampleSize": 649,
    "pico": {
      "population": "Patients 18 to 70 years with large hemispheric infarction (ASPECTS 1–5 or DWI lesion 80–300 mL) within 10h",
      "intervention": "Continuous IV Glibenclamide (BIIB093, SUR1-TRPM4 channel inhibitor) for 72 hours",
      "comparator": "Matching IV placebo infusion",
      "timeWindow": "≤ 10 hours from onset"
    },
    "primaryEndpoint": {
      "metric": "mRS shift analysis across 90-day disability levels",
      "resultStats": "Adjusted common OR 1.12 (95% CI 0.84–1.49; p=0.45; no significant functional improvement)",
      "verdict": "NEUTRAL"
    },
    "safetyEndpoint": {
      "sICH": "No difference in brain hemorrhage",
      "mortality90d": "All-cause mortality was numerically reduced (21.7% vs 27.5%; HR 0.76, 95% CI 0.55–1.04)"
    },
    "bottomLine": "IV glibenclamide did not significantly improve 90-day functional independence in large hemispheric infarction; routine medical treatment to prevent cerebral edema with glibenclamide is NOT recommended (Class 3: No Benefit).",
    "ontologyTags": {
      "condition": [
        "ais",
        "malignant_edema"
      ],
      "phase": [
        "critical_care"
      ],
      "intervention_type": [
        "neuroprotection",
        "anti_edema"
      ],
      "drug_or_procedure": [
        "glibenclamide"
      ],
      "direction": [
        "against"
      ]
    }
  },
  {
    "id": "destiny-ii-2014",
    "acronym": "DESTINY II",
    "title": "Hemicraniectomy for Massive Middle-Cerebral-Artery Infarction in Patients Older than 60 Years (DESTINY II)",
    "year": 2014,
    "journal": "The New England Journal of Medicine",
    "pmid": "24645942",
    "doi": "10.1056/NEJMoa1311367",
    "subspecialty": "Stroke",
    "evidenceSource": "PEER_REVIEWED_PUBLISHED",
    "design": "Phase 3 RCT",
    "sampleSize": 112,
    "pico": {
      "population": "Patients >60 years of age with acute unilateral middle-cerebral-artery infarction involving ≥2/3 of territory with neurological deterioration",
      "intervention": "Hemicraniectomy within 48 hours of stroke onset",
      "comparator": "Conservative intensive care medical therapy alone",
      "timeWindow": "≤ 48 hours from onset"
    },
    "primaryEndpoint": {
      "metric": "Survival without severe disability (mRS 0–4) at 6 months",
      "resultStats": "38% vs. 18% (odds ratio 2.91, 95% CI 1.06–7.49; p=0.04; significant survival advantage)",
      "verdict": "POSITIVE"
    },
    "safetyEndpoint": {
      "sICH": "Surgical complications 10%",
      "mortality90d": "Mortality dramatically reduced from 70% in conservative group to 33% in hemicraniectomy group (p<0.001)"
    },
    "bottomLine": "Decompressive hemicraniectomy in malignant MCA infarction patients >60 years significantly reduces mortality from 70% to 33%, though most survivors live with substantial disability (mRS 4); recommended with shared decision-making (Class 2a, LOE B-R).",
    "ontologyTags": {
      "condition": [
        "ais",
        "malignant_mca"
      ],
      "phase": [
        "surgical_critical_care"
      ],
      "intervention_type": [
        "decompressive_hemicraniectomy"
      ],
      "direction": [
        "for"
      ]
    }
  }
];

export function mergePivotalTrialsWithConferences(
  trials: PivotalTrialRecord[],
  conferences: ConferenceEvent[]
): PivotalTrialRecord[] {
  const merged = [...trials];
  for (const conf of conferences) {
    if (conf.isPivotalTrial && conf.pivotalTrialData) {
      const existingIdx = merged.findIndex((t) => t.id === conf.pivotalTrialData!.id);
      if (existingIdx !== -1) {
        merged[existingIdx] = conf.pivotalTrialData;
      } else {
        merged.push(conf.pivotalTrialData);
      }
    }
  }
  return merged;
}
