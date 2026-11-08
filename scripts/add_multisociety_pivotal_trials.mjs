import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const newMultiGuidelineTrials = [
  {
    id: "mr-clean-2015",
    acronym: "MR CLEAN",
    title: "A Randomized Trial of Intraarterial Treatment for Acute Ischemic Stroke (MR CLEAN)",
    year: 2015,
    journal: "The New England Journal of Medicine",
    pmid: "25517348",
    doi: "10.1056/NEJMoa1411587",
    subspecialty: "Stroke",
    evidenceSource: "PEER_REVIEWED_PUBLISHED",
    design: "Phase 3 RCT",
    sampleSize: 500,
    pico: {
      population: "Adults with acute ischemic stroke and confirmed anterior circulation LVO presenting within 6 hours",
      intervention: "Intraarterial treatment (thrombectomy with stent retrievers/aspiration) + usual care (IV tPA)",
      comparator: "Usual care alone (IV tPA)",
      timeWindow: "≤ 6 hours from symptom onset",
    },
    primaryEndpoint: {
      metric: "mRS shift analysis across all disability grades at 90 days",
      resultStats: "Adjusted common OR 1.67 (95% CI 1.21–2.30; p=0.002; absolute increase in functional independence mRS 0–2: 32.6% vs 19.1%, ARR 13.5%, NNT=7)",
      verdict: "POSITIVE",
    },
    safetyEndpoint: {
      sICH: "7.7% vs. 6.4% (p=0.58; no difference in hemorrhage)",
      mortality90d: "18.9% vs. 18.4% (p=0.90)",
    },
    bottomLine: "First positive modern landmark RCT proving that endovascular mechanical thrombectomy is dramatically effective for anterior circulation LVO within 6 hours, launching the endovascular stroke era (Class 1, LOE A).",
    ontologyTags: {
      condition: ["ais", "lvo"],
      phase: ["acute_treatment"],
      intervention_type: ["endovascular_thrombectomy"],
      direction: ["for"],
    },
  },
  {
    id: "escape-2015",
    acronym: "ESCAPE",
    title: "Endovascular Treatment for Small Core and Anterior Circulation Proximal Occlusion with Emphasis on Minimizing CT-to-Groin Time (ESCAPE)",
    year: 2015,
    journal: "The New England Journal of Medicine",
    pmid: "25671797",
    doi: "10.1056/NEJMoa1503780",
    subspecialty: "Stroke",
    evidenceSource: "PEER_REVIEWED_PUBLISHED",
    design: "Phase 3 RCT",
    sampleSize: 316,
    pico: {
      population: "AIS patients with proximal LVO, small ischemic core (ASPECTS 6–10), and moderate-to-good collaterals on multiphase CTA presenting within 12h",
      intervention: "Rapid endovascular thrombectomy + best medical therapy",
      comparator: "Best medical therapy alone",
      timeWindow: "≤ 12 hours from symptom onset",
    },
    primaryEndpoint: {
      metric: "Functional independence (mRS 0–2 at 90 days)",
      resultStats: "53.0% vs. 29.3% (rate ratio 1.80, 95% CI 1.34–2.42; p<0.001; absolute risk difference 23.7%, NNT=4)",
      verdict: "POSITIVE",
    },
    safetyEndpoint: {
      sICH: "3.6% vs. 2.7% (p=0.75)",
      mortality90d: "10.4% vs. 19.0% (statistically significant nearly 50% mortality reduction; p=0.04)",
    },
    bottomLine: "Rapid EVT guided by collateral CTA imaging up to 12 hours nearly doubled functional independence and cut mortality in half with an extraordinary NNT of 4 (Class 1, LOE A).",
    ontologyTags: {
      condition: ["ais", "lvo"],
      phase: ["acute_treatment"],
      intervention_type: ["endovascular_thrombectomy"],
      direction: ["for"],
    },
  },
  {
    id: "ninds-rtpa-1995",
    acronym: "NINDS tPA",
    title: "Tissue Plasminogen Activator for Acute Ischemic Stroke (The National Institute of Neurological Disorders and Stroke rt-PA Stroke Study)",
    year: 1995,
    journal: "The New England Journal of Medicine",
    pmid: "7477192",
    doi: "10.1056/NEJM199512143332401",
    subspecialty: "Stroke",
    evidenceSource: "PEER_REVIEWED_PUBLISHED",
    design: "Phase 3 RCT",
    sampleSize: 624,
    pico: {
      population: "Patients with acute ischemic stroke presenting within 3 hours of symptom onset with no hemorrhage on CT",
      intervention: "IV recombinant tissue plasminogen activator (Alteplase 0.9 mg/kg, max 90 mg; 10% bolus + 90% 1h infusion)",
      comparator: "IV Placebo",
      timeWindow: "≤ 3 hours from symptom onset",
    },
    primaryEndpoint: {
      metric: "Complete or near-complete neurological recovery at 3 months (favorable outcome on Barthel, mRS 0–1, GOS, NIHSS 0–1)",
      resultStats: "39% vs. 26% across all global outcome scales (adjusted OR 1.7, 95% CI 1.2–2.6; p=0.008; absolute benefit 11%–13%, NNT=8)",
      verdict: "POSITIVE",
    },
    safetyEndpoint: {
      sICH: "6.4% vs. 0.6% (symptomatic ICH within 36 hours; p<0.001)",
      mortality90d: "17% vs. 21% (p=0.30; no difference in overall mortality despite sICH)",
    },
    bottomLine: "Foundational landmark trial leading to the 1996 FDA approval of IV alteplase; proved that thrombolysis within 3 hours significantly increases the probability of disability-free survival despite a 6.4% sICH risk (Class 1, LOE A).",
    ontologyTags: {
      condition: ["ais"],
      phase: ["acute_treatment"],
      intervention_type: ["iv_thrombolysis"],
      drug_or_procedure: ["alteplase"],
      direction: ["for"],
    },
  },
  {
    id: "ecass-iii-2008",
    acronym: "ECASS III",
    title: "Thrombolysis with Alteplase 3 to 4.5 Hours after Acute Ischemic Stroke (ECASS III)",
    year: 2008,
    journal: "The New England Journal of Medicine",
    pmid: "18815396",
    doi: "10.1056/NEJMoa0804656",
    subspecialty: "Stroke",
    evidenceSource: "PEER_REVIEWED_PUBLISHED",
    design: "Phase 3 RCT",
    sampleSize: 821,
    pico: {
      population: "AIS patients presenting between 3.0 and 4.5 hours from symptom onset (excluding age >80y, severe stroke NIHSS >25, prior stroke + diabetes, or taking anticoagulants)",
      intervention: "IV Alteplase 0.9 mg/kg",
      comparator: "IV Placebo",
      timeWindow: "3.0 to 4.5 hours from symptom onset",
    },
    primaryEndpoint: {
      metric: "Favorable outcome (mRS 0–1 at 90 days)",
      resultStats: "52.4% vs. 45.2% (odds ratio 1.34, 95% CI 1.02–1.76; p=0.04; absolute benefit 7.2%, NNT=14)",
      verdict: "POSITIVE",
    },
    safetyEndpoint: {
      sICH: "2.4% vs. 0.2% (NINDS definition: 7.9% vs 3.5%; p=0.006)",
      mortality90d: "7.7% vs. 8.4% (p=0.68)",
    },
    bottomLine: "Established the expanded 3.0 to 4.5 hour therapeutic window for intravenous alteplase, demonstrating significant functional improvement without increasing overall mortality (Class 1, LOE A).",
    ontologyTags: {
      condition: ["ais"],
      phase: ["acute_treatment"],
      intervention_type: ["iv_thrombolysis"],
      drug_or_procedure: ["alteplase"],
      time_window: ["3_to_4_5h"],
      direction: ["for"],
    },
  },
  {
    id: "prisms-2018",
    acronym: "PRISMS",
    title: "Effect of Alteplase vs Aspirin on Functional Outcome for Patients With Acute Ischemic Stroke and Mild Nondisabling Neurologic Deficits (PRISMS)",
    year: 2018,
    journal: "JAMA",
    pmid: "29990288",
    doi: "10.1001/jama.2018.8496",
    subspecialty: "Stroke",
    evidenceSource: "PEER_REVIEWED_PUBLISHED",
    design: "Phase 3 RCT",
    sampleSize: 313,
    pico: {
      population: "Patients with acute ischemic stroke presenting within 3h with mild non-disabling deficits (NIHSS 0–5)",
      intervention: "IV Alteplase 0.9 mg/kg + oral placebo",
      comparator: "Oral Aspirin 325 mg + IV placebo",
      timeWindow: "≤ 3 hours from symptom onset",
    },
    primaryEndpoint: {
      metric: "Favorable functional outcome (mRS 0–1 at 90 days)",
      resultStats: "78.2% vs. 81.5% (adjusted risk difference -1.1%, 95% CI -9.4% to 7.3%; p=0.79; no benefit with alteplase)",
      verdict: "NEGATIVE",
    },
    safetyEndpoint: {
      sICH: "3.2% vs. 0% (statistically significant increase in symptomatic hemorrhage with tPA; p=0.04)",
      mortality90d: "1.3% vs. 1.3%",
    },
    bottomLine: "In patients with acute mild non-disabling ischemic deficits, IV alteplase did not improve 90-day functional recovery and increased symptomatic intracranial hemorrhage; IVT is NOT recommended (Class 3: No Benefit).",
    ontologyTags: {
      condition: ["ais"],
      phase: ["acute_treatment"],
      intervention_type: ["iv_thrombolysis", "antiplatelet"],
      direction: ["against"],
    },
  },
  {
    id: "mistie-iii-2019",
    acronym: "MISTIE III",
    title: "Early Minimally Invasive Catheter Evacuation with Recombinant Tissue Plasminogen Activator in Patients with Spontaneous Intracerebral Haemorrhage (MISTIE III)",
    year: 2019,
    journal: "The Lancet",
    pmid: "30739708",
    doi: "10.1016/S0140-6736(19)30195-3",
    subspecialty: "Stroke",
    evidenceSource: "PEER_REVIEWED_PUBLISHED",
    design: "Phase 3 RCT",
    sampleSize: 506,
    pico: {
      population: "Patients with non-traumatic spontaneous supratentorial ICH ≥30 mL with stable clot size at 6 hours",
      intervention: "Image-guided catheter placement with stereotactic aspiration + alteplase (1.0 mg q8h for up to 9 doses)",
      comparator: "Standard medical management in neuro-ICU",
      timeWindow: "Surgery performed between 12 and 72 hours from onset",
    },
    primaryEndpoint: {
      metric: "Good functional outcome (mRS 0–3 at 365 days / 1 year)",
      resultStats: "45% vs. 41% (adjusted hazard ratio 1.05, 95% CI 0.88–1.25; p=0.61; overall primary endpoint neutral, but post-hoc volume reduction to <15 mL improved outcomes)",
      verdict: "NEUTRAL",
    },
    safetyEndpoint: {
      sICH: "Symptomatic rebleeding 2.4% vs. 1.2% (p=0.33)",
      mortality90d: "30-day mortality was reduced (9.3% vs 15.2%; p=0.046)",
    },
    bottomLine: "Minimally invasive catheter evacuation with thrombolytic irrigation is safe and reduces 30-day mortality; end-of-treatment residual hematoma <15 mL correlates with substantial functional gains (AHA 2022 ICH Guideline).",
    ontologyTags: {
      condition: ["ich"],
      phase: ["acute_surgical"],
      intervention_type: ["minimally_invasive_surgery"],
      direction: ["neutral"],
    },
  },
  {
    id: "patch-2016",
    acronym: "PATCH",
    title: "Platelet Transfusion versus Standard Care after Acute Stroke due to Spontaneous Cerebral Haemorrhage Associated with Antiplatelet Therapy (PATCH)",
    year: 2016,
    journal: "The Lancet",
    pmid: "27161709",
    doi: "10.1016/S0140-6736(16)30392-0",
    subspecialty: "Stroke",
    evidenceSource: "PEER_REVIEWED_PUBLISHED",
    design: "Phase 3 RCT",
    sampleSize: 190,
    pico: {
      population: "Adults with acute spontaneous non-traumatic supratentorial ICH within 6 hours of onset while taking antiplatelet therapy (aspirin, clopidogrel, or dipyridamole) for ≥7 days",
      intervention: "Platelet transfusion initiated within 90 min of brain imaging",
      comparator: "Standard neurocritical medical care alone",
      timeWindow: "≤ 6 hours from symptom onset",
    },
    primaryEndpoint: {
      metric: "Ordinal shift in mRS score (death or dependence) at 3 months",
      resultStats: "Adjusted common OR 2.05 (95% CI 1.18–3.56; p=0.011; patients receiving platelets had DOUBLE the odds of worse functional disability or death)",
      verdict: "NEGATIVE",
    },
    safetyEndpoint: {
      sICH: "Serious adverse events 42% vs. 29% (p=0.06)",
      mortality90d: "In-hospital mortality: 24% in platelet group vs. 17% in standard care",
    },
    bottomLine: "Platelet transfusion for acute ICH associated with antiplatelet therapy significantly increases the risk of death or severe disability and must NOT be administered (Class 3: Harm in AHA/ASA 2022 ICH Guidelines).",
    ontologyTags: {
      condition: ["ich"],
      phase: ["acute_inpatient"],
      intervention_type: ["platelet_transfusion"],
      direction: ["against"],
    },
  },
  {
    id: "annexa-4-2019",
    acronym: "ANNEXA-4",
    title: "Full Study Report of Andexanet Alfa for Factor Xa Inhibitor-Related Acute Major Bleeding (ANNEXA-4)",
    year: 2019,
    journal: "The New England Journal of Medicine",
    pmid: "30730782",
    doi: "10.1056/NEJMoa1814051",
    subspecialty: "Stroke",
    evidenceSource: "PEER_REVIEWED_PUBLISHED",
    design: "Prospective Registry",
    sampleSize: 352,
    pico: {
      population: "Patients with acute major bleeding within 18 hours of taking factor Xa inhibitors (apixaban, rivaroxaban, edoxaban, or enoxaparin); 64% with intracranial hemorrhage",
      intervention: "IV Andexanet alfa (bolus + 2-hour infusion)",
      comparator: "Pre-infusion baseline / Historical control",
      timeWindow: "Acute presentation of life-threatening bleeding",
    },
    primaryEndpoint: {
      metric: "Excellent or good hemostatic efficacy at 12 hours + reduction in anti-factor Xa activity",
      resultStats: "82% achieved excellent or good hemostasis; anti-factor Xa activity decreased by 92% for apixaban and 92% for rivaroxaban (p<0.001)",
      verdict: "POSITIVE",
    },
    safetyEndpoint: {
      sICH: "Hematoma expansion ≤35% achieved in 80% of evaluable ICH patients",
      mortality90d: "Thrombotic events occurred in 10% within 30 days; 30-day mortality was 14%",
    },
    bottomLine: "Andexanet alfa rapidly neutralizes factor Xa activity and achieves excellent-to-good hemostatic control in >80% of patients with life-threatening FXa-inhibitor ICH (Class 2a, LOE B-NR in 2022 ICH Guidelines).",
    ontologyTags: {
      condition: ["ich"],
      phase: ["acute_reversal"],
      intervention_type: ["anticoagulant_reversal"],
      drug_or_procedure: ["andexanet_alfa"],
      direction: ["for"],
    },
  },
  {
    id: "brat-2012",
    acronym: "BRAT",
    title: "The Barrow Ruptured Aneurysm Trial: 3-Year and 10-Year Outcomes Comparing Surgical Clipping versus Endovascular Coiling (BRAT)",
    year: 2012,
    journal: "Journal of Neurosurgery",
    pmid: "22380005",
    doi: "10.3171/2011.12.JNS101746",
    subspecialty: "Stroke",
    evidenceSource: "PEER_REVIEWED_PUBLISHED",
    design: "Phase 3 RCT",
    sampleSize: 471,
    pico: {
      population: "Patients with acute spontaneous subarachnoid hemorrhage caused by a ruptured intracranial aneurysm assigned at admission",
      intervention: "Endovascular coiling",
      comparator: "Microsurgical clipping",
      timeWindow: "Hyperacute aSAH admission",
    },
    primaryEndpoint: {
      metric: "Poor functional outcome (mRS >2 at 1, 3, and 10 years)",
      resultStats: "At 1 year, poor outcome was 33.7% in clip vs 23.2% in coil (p=0.02); at 10 years, functional outcomes equilibrated between groups, but coil had higher aneurysm recurrence (15.4% vs 1.1%; p<0.001)",
      verdict: "POSITIVE",
    },
    safetyEndpoint: {
      sICH: "Retreatment rates: 16.4% in coiling vs. 1.2% in clipping over long-term follow-up",
      mortality90d: "10-year mortality was comparable (29.6% clip vs 29.8% coil)",
    },
    bottomLine: "Coiling offers superior 1-year clinical recovery and lower perioperative morbidity, whereas clipping provides vastly superior long-term anatomical obliteration and lower retreatment rates (AHA/ASA 2023 aSAH Guideline).",
    ontologyTags: {
      condition: ["asah"],
      phase: ["acute_surgical"],
      intervention_type: ["endovascular_coiling", "surgical_clipping"],
      direction: ["for"],
    },
  },
  {
    id: "bp-target-2021",
    acronym: "BP-TARGET",
    title: "Effect of Intensive vs Standard Blood Pressure Control on Intracerebral Hemorrhage After Successful Thrombectomy (BP-TARGET)",
    year: 2021,
    journal: "The Lancet Neurology",
    pmid: "33887241",
    doi: "10.1016/S1474-4422(21)00034-7",
    subspecialty: "Stroke",
    evidenceSource: "PEER_REVIEWED_PUBLISHED",
    design: "Phase 3 RCT",
    sampleSize: 324,
    pico: {
      population: "AIS patients with anterior circulation LVO who achieved successful endovascular reperfusion (mTICI ≥2b)",
      intervention: "Intensive SBP target of 100 to 129 mm Hg for 24 hours post-procedure",
      comparator: "Standard SBP target of 130 to 185 mm Hg for 24 hours",
      timeWindow: "Within 1 hour post-successful reperfusion",
    },
    primaryEndpoint: {
      metric: "Rate of any radiographic intracranial hemorrhage on 24- to 36-hour CT",
      resultStats: "42.2% vs. 42.9% (adjusted OR 0.96, 95% CI 0.60–1.51; p=0.84; intensive BP reduction did not reduce hemorrhage)",
      verdict: "NEUTRAL",
    },
    safetyEndpoint: {
      sICH: "6.8% vs. 5.6% (p=0.64)",
      mortality90d: "12.4% vs. 11.2%",
    },
    bottomLine: "Targeting intensive SBP lowering to 100–129 mm Hg after successful mechanical thrombectomy does not reduce intracerebral hemorrhage or improve functional outcomes (ESO 2025 BP Guideline).",
    ontologyTags: {
      condition: ["ais", "lvo"],
      phase: ["post_recanalization"],
      intervention_type: ["blood_pressure_lowering"],
      direction: ["neutral"],
    },
  },
  {
    id: "catis-2014",
    acronym: "CATIS",
    title: "Effects of Immediate Blood Pressure Reduction on Death and Major Disability in Patients with Acute Ischemic Stroke (CATIS)",
    year: 2014,
    journal: "JAMA",
    pmid: "24240777",
    doi: "10.1001/jama.2013.282543",
    subspecialty: "Stroke",
    evidenceSource: "PEER_REVIEWED_PUBLISHED",
    design: "Phase 3 RCT",
    sampleSize: 4071,
    pico: {
      population: "Patients with acute ischemic stroke within 48 hours of onset and elevated SBP (140–220 mm Hg) not receiving IVT or EVT",
      intervention: "Immediate antihypertensive treatment to lower SBP by 10%–25% within 24h and target <140/90 within 7 days",
      comparator: "Discontinuation of all antihypertensive medications for 7 days during acute phase",
      timeWindow: "≤ 48 hours from symptom onset",
    },
    primaryEndpoint: {
      metric: "Death and major disability (mRS ≥3) at 14 days or hospital discharge",
      resultStats: "33.6% vs. 33.6% (odds ratio 1.00, 95% CI 0.88–1.14; p=0.98; at 3 months: 25.2% vs 25.3%, OR 0.99, p=0.93)",
      verdict: "NEUTRAL",
    },
    safetyEndpoint: {
      sICH: "No difference",
      mortality90d: "14-day mortality: 1.4% vs 1.6%",
    },
    bottomLine: "In patients with acute ischemic stroke and BP <220/120 mm Hg who do not receive reperfusion therapy, routine BP reduction does not prevent death or disability; antihypertensives should not be routinely initiated in the first 48–72h (Class 3: No Benefit in AHA 2026 & ESO 2025).",
    ontologyTags: {
      condition: ["ais"],
      phase: ["acute_inpatient"],
      intervention_type: ["blood_pressure_lowering"],
      direction: ["against"],
    },
  },
  {
    id: "right-2-2019",
    acronym: "RIGHT-2",
    title: "Prehospital Transdermal Glyceryl Trinitrate in Patients with Ultra-Acute Presumed Stroke (RIGHT-2): An Ambulance-Based, Randomised Trial",
    year: 2019,
    journal: "The Lancet",
    pmid: "30738649",
    doi: "10.1016/S0140-6736(19)30194-1",
    subspecialty: "Stroke",
    evidenceSource: "PEER_REVIEWED_PUBLISHED",
    design: "Phase 3 RCT",
    sampleSize: 1149,
    pico: {
      population: "Adults with presumed acute stroke assessed within 4 hours by ambulance paramedics with SBP ≥120 mm Hg",
      intervention: "Transdermal glyceryl trinitrate (GTN 5 mg patch applied immediately on-scene + daily for 3 days)",
      comparator: "Matching transdermal sham patch",
      timeWindow: "≤ 4 hours from onset in the ambulance",
    },
    primaryEndpoint: {
      metric: "Shift in 90-day mRS score across all categories",
      resultStats: "Adjusted common OR 1.25 (95% CI 0.97–1.60; p=0.08; no functional benefit, and trend toward worse disability in ICH and severe stroke subgroups)",
      verdict: "NEGATIVE",
    },
    safetyEndpoint: {
      sICH: "No difference in rebleeding",
      mortality90d: "Death at 90 days: 17% in GTN vs. 15% in sham (p=0.48)",
    },
    bottomLine: "Prehospital initiation of transdermal glyceryl trinitrate did not improve functional outcomes and demonstrated signals of potential harm; strictly NOT recommended (Class 3: Harm in AHA 2026).",
    ontologyTags: {
      condition: ["ais", "ich"],
      phase: ["prehospital"],
      intervention_type: ["transdermal_nitrate"],
      direction: ["against"],
    },
  },
  {
    id: "pass-2015",
    acronym: "PASS",
    title: "Preventive Antibiotics in Stroke Study (PASS): A Pragmatic, Randomised, Open-Label Phase 3 Trial",
    year: 2015,
    journal: "The Lancet",
    pmid: "26002012",
    doi: "10.1016/S0140-6736(15)60475-5",
    subspecialty: "Stroke",
    evidenceSource: "PEER_REVIEWED_PUBLISHED",
    design: "Phase 3 RCT",
    sampleSize: 2550,
    pico: {
      population: "Adults admitted with acute ischemic or hemorrhagic stroke within 24 hours of symptom onset",
      intervention: "Preventive IV Ceftriaxone (2 g once daily for 4 days)",
      comparator: "Standard care without preventive antibiotics",
      timeWindow: "≤ 24 hours from stroke onset",
    },
    primaryEndpoint: {
      metric: "Functional outcome (mRS 0–2 at 3 months)",
      resultStats: "38.3% vs. 40.0% (adjusted common OR 0.95, 95% CI 0.82–1.11; p=0.55; no reduction in disability)",
      verdict: "NEUTRAL",
    },
    safetyEndpoint: {
      sICH: "No difference",
      mortality90d: "90-day mortality: 16.5% vs. 16.0% (p=0.74); infection rate reduced (11% vs 17%) without clinical gain",
    },
    bottomLine: "Routine prophylactic antibiotics reduced infections but did NOT improve functional independence or reduce mortality; routine preventive antibiotics are NOT recommended (Class 3: No Benefit in AHA 2026 & ESO 2026 SAP).",
    ontologyTags: {
      condition: ["ais", "sap"],
      phase: ["inpatient_stroke_unit"],
      intervention_type: ["prophylactic_antibiotics"],
      direction: ["against"],
    },
  },
  {
    id: "stroke-inf-2015",
    acronym: "STROKE-INF",
    title: "Antibiotic Prophylaxis to Prevent Stroke-Associated Pneumonia (STROKE-INF): A Cluster-Randomised, Pragramtic Trial",
    year: 2015,
    journal: "The Lancet",
    pmid: "26289938",
    doi: "10.1016/S0140-6736(15)61238-7",
    subspecialty: "Stroke",
    evidenceSource: "PEER_REVIEWED_PUBLISHED",
    design: "Phase 3 RCT",
    sampleSize: 1224,
    pico: {
      population: "Patients with acute stroke and dysphagia (failed bedside swallow screen) within 48h admitted to stroke units in the UK",
      intervention: "Clarithromycin + co-amoxiclav or cephalosporin for 14 days",
      comparator: "Standard stroke unit care without antibiotic prophylaxis",
      timeWindow: "≤ 48 hours from symptom onset",
    },
    primaryEndpoint: {
      metric: "Post-stroke pneumonia in the first 14 days",
      resultStats: "13% vs. 10% (adjusted rate ratio 1.21, 95% CI 0.71–2.08; p=0.48; no reduction in stroke-associated pneumonia)",
      verdict: "NEGATIVE",
    },
    safetyEndpoint: {
      sICH: "No difference",
      mortality90d: "90-day mortality: 27% vs. 28% (adjusted OR 1.05, 95% CI 0.78–1.42)",
    },
    bottomLine: "Antibiotic prophylaxis in dysphagic stroke patients did not reduce the frequency of pneumonia, 90-day mortality, or functional dependency; confirms lack of benefit (ESO 2026 SAP Guideline).",
    ontologyTags: {
      condition: ["ais", "sap", "dysphagia"],
      phase: ["inpatient_stroke_unit"],
      intervention_type: ["prophylactic_antibiotics"],
      direction: ["against"],
    },
  },
  {
    id: "aristotle-2011",
    acronym: "ARISTOTLE",
    title: "Apixaban versus Warfarin in Patients with Atrial Fibrillation (ARISTOTLE)",
    year: 2011,
    journal: "The New England Journal of Medicine",
    pmid: "21870978",
    doi: "10.1056/NEJMoa1107039",
    subspecialty: "Stroke",
    evidenceSource: "PEER_REVIEWED_PUBLISHED",
    design: "Phase 3 RCT",
    sampleSize: 18201,
    pico: {
      population: "Patients with nonvalvular atrial fibrillation and at least one additional risk factor for stroke",
      intervention: "Apixaban (5 mg orally BID, or 2.5 mg BID for dose-reduction criteria)",
      comparator: "Warfarin (target INR 2.0 to 3.0)",
      timeWindow: "Long-term secondary and primary prevention",
    },
    primaryEndpoint: {
      metric: "Ischemic or hemorrhagic stroke or systemic embolism",
      resultStats: "1.27% vs. 1.60% per year (hazard ratio 0.79, 95% CI 0.69–0.91; p<0.001 for non-inferiority, p=0.01 for superiority; 21% relative reduction)",
      verdict: "POSITIVE",
    },
    safetyEndpoint: {
      sICH: "Intracranial hemorrhage: 0.33% vs. 0.80% per year (HR 0.42, 95% CI 0.30–0.58; p<0.001; 58% reduction in ICH)",
      mortality90d: "All-cause mortality: 3.52% vs. 3.94% per year (HR 0.89, 95% CI 0.80–0.99; p=0.047)",
    },
    bottomLine: "Apixaban was superior to warfarin in preventing stroke or systemic embolism, caused 58% less intracranial hemorrhage, and resulted in lower all-cause mortality (Class 1, LOE A in ACC/AHA 2023 AFib Guideline).",
    ontologyTags: {
      condition: ["afib", "ais"],
      phase: ["secondary_prevention"],
      intervention_type: ["direct_oral_anticoagulant"],
      drug_or_procedure: ["apixaban", "warfarin"],
      direction: ["for"],
    },
  },
  {
    id: "re-ly-2009",
    acronym: "RE-LY",
    title: "Dabigatran versus Warfarin in Patients with Atrial Fibrillation (RE-LY)",
    year: 2009,
    journal: "The New England Journal of Medicine",
    pmid: "19717844",
    doi: "10.1056/NEJMoa0905561",
    subspecialty: "Stroke",
    evidenceSource: "PEER_REVIEWED_PUBLISHED",
    design: "Phase 3 RCT",
    sampleSize: 18113,
    pico: {
      population: "Patients with nonvalvular atrial fibrillation and risk of stroke",
      intervention: "Dabigatran 150 mg BID or 110 mg BID",
      comparator: "Warfarin (INR 2.0 to 3.0)",
      timeWindow: "Long-term secondary prevention",
    },
    primaryEndpoint: {
      metric: "Stroke or systemic embolism",
      resultStats: "1.11% per year (150 mg) vs. 1.69% per year (warfarin) (relative risk 0.66, 95% CI 0.53–0.82; p<0.001 for superiority; 34% reduction in stroke)",
      verdict: "POSITIVE",
    },
    safetyEndpoint: {
      sICH: "Life-threatening intracranial bleed: 0.10% vs. 0.38% (p<0.001; 74% reduction in ICH)",
      mortality90d: "Annual mortality 3.64% vs. 4.13% (p=0.051)",
    },
    bottomLine: "First landmark DOAC trial; dabigatran 150 mg was significantly superior to warfarin in reducing stroke with a massive 74% reduction in life-threatening intracranial bleeding (Class 1, LOE A).",
    ontologyTags: {
      condition: ["afib", "ais"],
      phase: ["secondary_prevention"],
      intervention_type: ["direct_oral_anticoagulant"],
      drug_or_procedure: ["dabigatran", "warfarin"],
      direction: ["for"],
    },
  },
  {
    id: "east-afnet-4-2020",
    acronym: "EAST-AFNET 4",
    title: "Early Rhythm-Control Therapy in Patients with Atrial Fibrillation (EAST-AFNET 4)",
    year: 2020,
    journal: "The New England Journal of Medicine",
    pmid: "32865375",
    doi: "10.1056/NEJMoa2019422",
    subspecialty: "Stroke",
    evidenceSource: "PEER_REVIEWED_PUBLISHED",
    design: "Phase 3 RCT",
    sampleSize: 2789,
    pico: {
      population: "Patients with early atrial fibrillation (diagnosed ≤1 year) and cardiovascular conditions / stroke risk",
      intervention: "Early rhythm-control therapy (antiarrhythmic drugs or catheter ablation)",
      comparator: "Usual care (initial rate control, rhythm control only for unmanageable symptoms)",
      timeWindow: "Within 1 year of AF diagnosis",
    },
    primaryEndpoint: {
      metric: "Composite of death from cardiovascular causes, stroke, or hospitalization with worsening of heart failure or acute coronary syndrome",
      resultStats: "3.9% vs. 5.0% per year (hazard ratio 0.79, 95% CI 0.66–0.94; p=0.005; 21% relative reduction in major cardiovascular events and stroke)",
      verdict: "POSITIVE",
    },
    safetyEndpoint: {
      sICH: "No excess in major treatment-related complications (4.9% vs 1.4%)",
      mortality90d: "Stroke incidence: 0.6% vs 0.9% per year (HR 0.65, 95% CI 0.44–0.97; 35% reduction in stroke)",
    },
    bottomLine: "Early rhythm control initiated within 1 year of AF diagnosis significantly reduces long-term stroke and cardiovascular mortality compared to rate control alone (Class 2a, LOE B-R in ACC/AHA 2023 AFib Guideline).",
    ontologyTags: {
      condition: ["afib", "ais"],
      phase: ["secondary_prevention"],
      intervention_type: ["rhythm_control"],
      direction: ["for"],
    },
  },
  {
    id: "sprint-2015",
    acronym: "SPRINT",
    title: "A Randomized Trial of Intensive versus Standard Blood-Pressure Control (SPRINT)",
    year: 2015,
    journal: "The New England Journal of Medicine",
    pmid: "26551272",
    doi: "10.1056/NEJMoa1511939",
    subspecialty: "Stroke",
    evidenceSource: "PEER_REVIEWED_PUBLISHED",
    design: "Phase 3 RCT",
    sampleSize: 9361,
    pico: {
      population: "Adults ≥50 years with SBP ≥130 mm Hg and high cardiovascular risk without diabetes or history of stroke",
      intervention: "Intensive blood-pressure control targeting SBP <120 mm Hg",
      comparator: "Standard blood-pressure control targeting SBP <140 mm Hg",
      timeWindow: "Long-term primary prevention (median follow-up 3.26 years)",
    },
    primaryEndpoint: {
      metric: "Composite of myocardial infarction, acute coronary syndrome, stroke, heart failure, or cardiovascular death",
      resultStats: "1.65% vs. 2.19% per year (hazard ratio 0.75, 95% CI 0.64–0.89; p<0.001; 25% relative risk reduction; stroke HR 0.89, all-cause mortality HR 0.73, p=0.003)",
      verdict: "POSITIVE",
    },
    safetyEndpoint: {
      sICH: "No intracranial hemorrhage difference",
      mortality90d: "Serious adverse events (hypotension, syncope, acute kidney injury) were higher in intensive arm (4.7% vs 2.5%; p<0.001)",
    },
    bottomLine: "Targeting SBP <120 mm Hg substantially reduces stroke, cardiovascular events, and all-cause mortality, forming the cornerstone of the AHA/ASA 2024 Primary Stroke Prevention guidelines (Class 1, LOE A).",
    ontologyTags: {
      condition: ["hypertension", "primary_prevention"],
      phase: ["primary_prevention"],
      intervention_type: ["blood_pressure_lowering"],
      direction: ["for"],
    },
  },
  {
    id: "acst-2-2021",
    acronym: "ACST-2",
    title: "Second Asymptomatic Carotid Surgery Trial (ACST-2): A Randomised Comparison of Carotid Artery Stenting versus Carotid Endarterectomy",
    year: 2021,
    journal: "The Lancet",
    pmid: "34481556",
    doi: "10.1016/S0140-6736(21)01910-3",
    subspecialty: "Stroke",
    evidenceSource: "PEER_REVIEWED_PUBLISHED",
    design: "Phase 3 RCT",
    sampleSize: 3625,
    pico: {
      population: "Patients with severe asymptomatic carotid artery stenosis (≥60% on ultrasound) thought to require revascularization",
      intervention: "Carotid artery stenting (CAS)",
      comparator: "Carotid endarterectomy (CEA)",
      timeWindow: "5-year follow-up for primary prevention of stroke",
    },
    primaryEndpoint: {
      metric: "Procedural death or any stroke within 30 days, or non-procedural fatal or disabling stroke at 5 years",
      resultStats: "2.5% vs. 2.5% (rate ratio 0.98, 95% CI 0.64–1.51; p=0.91; identical long-term procedural and non-procedural stroke rates)",
      verdict: "NON_INFERIOR",
    },
    safetyEndpoint: {
      sICH: "Fatal or disabling procedural stroke: 1% in both groups",
      mortality90d: "5-year overall stroke incidence: 5.3% in CAS vs. 4.5% in CEA (RR 1.16, 95% CI 0.86–1.57)",
    },
    bottomLine: "In patients with severe asymptomatic carotid stenosis, CAS and CEA offer equivalent procedural safety and long-term protection against stroke (Class 2a, LOE A in AHA/ASA 2024 Primary Prevention Guideline).",
    ontologyTags: {
      condition: ["carotid_stenosis", "primary_prevention"],
      phase: ["primary_prevention"],
      intervention_type: ["carotid_endarterectomy", "carotid_stenting"],
      direction: ["for"],
    },
  },
  {
    id: "aspree-2018",
    acronym: "ASPREE",
    title: "Effect of Aspirin on Disability-Free Survival and Major Hemorrhage in the Healthy Elderly (ASPREE)",
    year: 2018,
    journal: "The New England Journal of Medicine",
    pmid: "30221596",
    doi: "10.1056/NEJMoa1800722",
    subspecialty: "Stroke",
    evidenceSource: "PEER_REVIEWED_PUBLISHED",
    design: "Phase 3 RCT",
    sampleSize: 19114,
    pico: {
      population: "Community-dwelling healthy elderly (age ≥70 years, or ≥65 years among minorities) without cardiovascular disease, dementia, or disability",
      intervention: "Enteric-coated Aspirin 100 mg daily",
      comparator: "Matching placebo daily",
      timeWindow: "Median follow-up 4.7 years",
    },
    primaryEndpoint: {
      metric: "Composite of death, dementia, or persistent physical disability",
      resultStats: "21.5 vs. 21.2 events per 1000 person-years (hazard ratio 1.01, 95% CI 0.92–1.11; p=0.79; zero benefit in disability-free survival)",
      verdict: "NEGATIVE",
    },
    safetyEndpoint: {
      sICH: "Intracranial hemorrhage: HR 1.38 (95% CI 1.03–1.86; p=0.03; major hemorrhage 8.6 vs 6.2 events per 1000 person-years; HR 1.38, p<0.001)",
      mortality90d: "All-cause mortality was higher in the aspirin group (12.7 vs 11.1 per 1000 person-years; HR 1.14, 95% CI 1.01–1.29)",
    },
    bottomLine: "Low-dose aspirin for primary prevention in healthy elderly people does not reduce stroke or prolong disability-free survival, while significantly increasing major hemorrhage and mortality; strongly NOT recommended (Class 3: Harm in AHA 2024 Primary Prevention Guideline).",
    ontologyTags: {
      condition: ["primary_prevention"],
      phase: ["primary_prevention"],
      intervention_type: ["antiplatelet"],
      drug_or_procedure: ["aspirin"],
      direction: ["against"],
    },
  },
];

async function run() {
  const CLOUD_JSON = path.join(process.cwd(), "public", "data", "neuroguide_cloud.json");
  const SEED_TS = path.join(process.cwd(), "src", "data", "pivotalTrialsSeed.ts");

  const cloud = JSON.parse(fs.readFileSync(CLOUD_JSON, "utf-8"));
  const existingTrials = cloud.pivotalTrials || [];
  const existingIds = new Set(existingTrials.map(t => (t.id || "").toLowerCase().trim()));
  const existingAcronyms = new Set(existingTrials.map(t => (t.acronym || "").toUpperCase().trim()));

  console.log(`Starting with ${existingTrials.length} existing Pivotal Trials.`);

  let addedCount = 0;
  newMultiGuidelineTrials.forEach(nt => {
    const idLower = nt.id.toLowerCase().trim();
    const acroUpper = nt.acronym.toUpperCase().trim();
    if (!existingIds.has(idLower) && !existingAcronyms.has(acroUpper)) {
      existingTrials.push(nt);
      existingIds.add(idLower);
      existingAcronyms.add(acroUpper);
      addedCount++;
      console.log(`+ Added Pivotal Trial: ${nt.acronym} (${nt.year}) [${nt.subspecialty}] - ${nt.title.slice(0, 60)}...`);
    } else {
      console.log(`= SKIPPED (Duplicate): ${nt.acronym}`);
    }
  });

  cloud.pivotalTrials = existingTrials;
  fs.writeFileSync(CLOUD_JSON, JSON.stringify(cloud, null, 2), "utf-8");
  console.log(`Updated ${CLOUD_JSON} (Total trials: ${existingTrials.length}).`);

  // Update src/data/pivotalTrialsSeed.ts
  const seedContent = `import type { PivotalTrialRecord, ConferenceEvent } from "../types/neuroguide.ts";

/**
 * Ultra-compact Pivotal Trials Registry (~700 bytes per trial).
 * Stores high-yield PICO + quantitative primary/safety endpoints without bulky PDFs.
 */
export const PIVOTAL_TRIALS_SEED: PivotalTrialRecord[] = ${JSON.stringify(existingTrials, null, 2)};

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
`;
  fs.writeFileSync(SEED_TS, seedContent, "utf-8");
  console.log(`Updated ${SEED_TS} with all ${existingTrials.length} trials.`);

  // Sync to Supabase
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    const env = {};
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        env[key] = val;
      }
    }

    if (env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      });

      const { data: existingRow } = await supabase
        .from("neuroguide_docs")
        .select("*")
        .eq("id", "system_clinical_scenarios");

      const existingData = existingRow && existingRow[0] ? existingRow[0].data || {} : {};
      existingData.pivotalTrials = existingTrials;

      const { error } = await supabase
        .from("neuroguide_docs")
        .upsert({
          id: "system_clinical_scenarios",
          title: "System Clinical Scenarios & Pivotal Trials",
          organization: "NeuroPulse System",
          status: "approved",
          data: existingData,
          updated_at: new Date().toISOString(),
        }, { onConflict: "id" });

      if (error) {
        console.error("Supabase upsert error:", error.message);
      } else {
        console.log(`Successfully synced all ${existingTrials.length} pivotal trials to Supabase!`);
      }
    }
  }
}

run();
