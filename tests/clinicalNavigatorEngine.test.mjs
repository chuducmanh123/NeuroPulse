import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  CLINICAL_CONDITIONS_V3,
  DIAGNOSIS_CATEGORIES_V3,
  toCanonicalTagId,
  toTimeWindowId,
  getConditionsForSubspecialtyV3,
  getTreatmentSchemaForScopeV3,
  getPreventionSchemaForScopeV3,
} from "../src/data/clinicalNavigatorTaxonomyV3.ts";
import {
  indexAllGuidelineRecommendations,
  runClinicalNavigatorQuery,
  hasActiveNavigatorQuery,
  NAVIGATOR_QUICK_PRESETS,
} from "../src/lib/neuroguide/clinicalNavigatorEngine.ts";
import { MOCK_RECOMMENDATION_ATOMS } from "../src/data/neuroguideMockData.ts";

const cloudPath = path.resolve(process.cwd(), "public/data/neuroguide_cloud.json");
const cloudPayload = JSON.parse(fs.readFileSync(cloudPath, "utf8"));
const guidelines = cloudPayload.guidelines || [];
const conferences = cloudPayload.conferences || [];
const scenarios = cloudPayload.scenarios || [];

test("V3.0 Taxonomy Invariants: Rules 1–6 (Word Length, Cross-Domain IDs, Multi-Parent, No None/Avoidance, No TBI/Anoxic)", () => {
  // 5 Diagnosis categories with 27+ canonical items
  assert.equal(DIAGNOSIS_CATEGORIES_V3.length, 5);

  // Check all 10 subspecialties have conditions
  const subspecialties = [
    "Stroke",
    "Neurocritical Care",
    "Epilepsy",
    "Dementia",
    "Neuroimmunology",
    "Neuromuscular",
    "Movement Disorders",
    "Headache & Pain",
    "CNS Infections",
    "Neuro-Oncology",
  ];
  let totalSubspecialtyConditionMappings = 0;
  for (const sub of subspecialties) {
    const conds = getConditionsForSubspecialtyV3(sub);
    assert.ok(conds.length >= 4, `Subspecialty ${sub} should have >= 4 conditions`);
    totalSubspecialtyConditionMappings += conds.length;
  }
  // 73 unique conditions + 2 multi-parent shared = 75 subspecialty-condition mappings
  assert.equal(CLINICAL_CONDITIONS_V3.length, 73);
  assert.equal(totalSubspecialtyConditionMappings, 75);

  // Rule 3: Multi-Parent Canonical Condition IDs
  const lbd = CLINICAL_CONDITIONS_V3.find((c) => c.id === "cond_lbd");
  assert.ok(lbd);
  assert.deepEqual(lbd.subspecialties, ["Dementia", "Movement Disorders"]);

  const para = CLINICAL_CONDITIONS_V3.find((c) => c.id === "cond_paraneoplastic");
  assert.ok(para);
  assert.deepEqual(para.subspecialties, ["Neuroimmunology", "Neuro-Oncology"]);

  // Rule 1, 2, 4, 5, 6 checks across all conditions and tags
  for (const cond of CLINICAL_CONDITIONS_V3) {
    // Rule 6: No TBI or Anoxic Brain Injury
    assert.ok(!/\btbi\b|traumatic brain injury|anoxic brain/i.test(cond.label), `Excluded condition found: ${cond.label}`);

    const allTags = [
      ...cond.treatment.drugs,
      ...cond.treatment.interventions,
      ...cond.treatment.otherCare,
      ...cond.prevention.pharmacologicalProphylaxis,
      ...cond.prevention.proceduralDevice,
      ...cond.prevention.lifestyleRehabMonitoring,
    ];

    for (const tag of allTags) {
      // Rule 4: No "None"
      assert.notEqual(tag.label.toLowerCase(), "none");
      // Rule 5: No "... Avoidance"
      assert.ok(!/\bavoidance\b/i.test(tag.label), `Tag "${tag.label}" in ${cond.id} violates Rule 5 (No Avoidance tags)`);
      // Rule 1: 1–3 words per chip
      const wordCount = tag.label.trim().split(/\s+/).length;
      assert.ok(wordCount >= 1 && wordCount <= 3, `Tag "${tag.label}" in ${cond.id} has ${wordCount} words (max 3)`);
      // Rule 2: Deterministic canonical ID
      assert.equal(tag.id, toCanonicalTagId(tag.label));
    }
  }
});

test("30 Clinical Feasibility Test Cases across all 10 Subspecialties, Domains, Time Windows, Harm & Right-Pane Search", () => {
  const indexed = indexAllGuidelineRecommendations(guidelines, MOCK_RECOMMENDATION_ATOMS, {});
  assert.ok(indexed.length >= 580, `Expected >= 580 indexed recommendations, got ${indexed.length}`);

  // Confirm zero legacy matchedSpans / evidenceChips attached
  assert.ok(indexed.every((r) => !r.matchedSpans || r.matchedSpans.length === 0));

  const runQ = (query) =>
    runClinicalNavigatorQuery({
      guidelines,
      recommendationAtoms: MOCK_RECOMMENDATION_ATOMS,
      conferences,
      scenarios,
      query,
    });

  // Case 1: Stroke -> Ischemic Stroke -> Treatment -> Early Window (<= 4.5h) -> Tenecteplase / Alteplase
  const c1 = runQ({
    subspecialty: "Stroke",
    conditionId: "cond_ischemic_stroke",
    domain: "treatment",
    timeWindowId: toTimeWindowId("cond_ischemic_stroke", "Early Window (≤ 4.5h)"),
    interventionTags: [toCanonicalTagId("Tenecteplase"), toCanonicalTagId("Alteplase")],
  });
  assert.ok(c1.coreRecommendations.length >= 3, "Case 1: AIS Early Window IVT");
  assert.ok(c1.crossSocietyMatrix.some((m) => m.society === "AHA/ASA"));
  assert.ok(c1.crossSocietyMatrix.some((m) => m.society === "ESO"));

  // Case 2: Stroke -> Ischemic Stroke -> Treatment -> Extended Window (4.5h-24h) -> Mechanical Thrombectomy
  const c2 = runQ({
    subspecialty: "Stroke",
    conditionId: "cond_ischemic_stroke",
    domain: "treatment",
    timeWindowId: toTimeWindowId("cond_ischemic_stroke", "Extended Window (4.5h–24h)"),
    interventionTags: [toCanonicalTagId("Mechanical Thrombectomy")],
  });
  assert.ok(c2.coreRecommendations.length >= 2, "Case 2: AIS Extended Window EVT");

  // Case 3: Cross-Domain Single Label (`DOAC`) in Ischemic Stroke (Treatment vs Prevention vs All)
  const c3Treat = runQ({
    subspecialty: "Stroke",
    conditionId: "cond_ischemic_stroke",
    domain: "treatment",
    interventionTags: [toCanonicalTagId("DOAC")],
  });
  const c3Prev = runQ({
    subspecialty: "Stroke",
    conditionId: "cond_ischemic_stroke",
    domain: "prevention",
    interventionTags: [toCanonicalTagId("DOAC")],
  });
  const c3All = runQ({
    subspecialty: "Stroke",
    conditionId: "cond_ischemic_stroke",
    domain: "all",
    interventionTags: [toCanonicalTagId("DOAC")],
  });
  assert.ok(c3Treat.coreRecommendations.length >= 1, "Case 3a: DOAC in Treatment");
  assert.ok(c3Prev.coreRecommendations.length >= 5, "Case 3b: DOAC in Prevention");
  assert.ok(c3All.coreRecommendations.length >= c3Prev.coreRecommendations.length, "Case 3c: DOAC in All Domains");

  // Case 4: Stroke -> Ischemic Stroke -> DAPT & SAPT
  const c4 = runQ({
    subspecialty: "Stroke",
    conditionId: "cond_ischemic_stroke",
    domain: "treatment",
    interventionTags: [toCanonicalTagId("DAPT"), toCanonicalTagId("SAPT")],
  });
  assert.ok(c4.coreRecommendations.length >= 3, "Case 4: AIS DAPT/SAPT");

  // Case 5: Stroke -> Ischemic Stroke -> Prevention -> Procedural (CEA / PFO Closure / LAAO)
  const c5 = runQ({
    subspecialty: "Stroke",
    conditionId: "cond_ischemic_stroke",
    domain: "prevention",
    interventionTags: [
      toCanonicalTagId("Carotid Endarterectomy"),
      toCanonicalTagId("PFO Closure"),
      toCanonicalTagId("LAAO"),
    ],
  });
  assert.ok(c5.coreRecommendations.length >= 3, "Case 5: AIS Procedural Prevention");

  // Case 6: Stroke -> Ischemic Stroke -> Prevention -> Motor Rehab & Speech Therapy
  const c6 = runQ({
    subspecialty: "Stroke",
    conditionId: "cond_ischemic_stroke",
    domain: "prevention",
    interventionTags: [toCanonicalTagId("Motor Rehab"), toCanonicalTagId("Speech Therapy")],
  });
  assert.ok(c6.coreRecommendations.length >= 5, "Case 6: AIS Motor & Speech Rehab");

  // Case 7: Stroke -> TIA -> Hyperacute (< 24h) -> DAPT & Holter Telemetry
  const c7 = runQ({
    subspecialty: "Stroke",
    conditionId: "cond_tia",
    domain: "treatment",
    timeWindowId: toTimeWindowId("cond_tia", "Hyperacute (< 24h)"),
    interventionTags: [toCanonicalTagId("DAPT"), toCanonicalTagId("Holter Telemetry")],
  });
  assert.ok(c7.coreRecommendations.length >= 1, "Case 7: TIA Hyperacute DAPT");

  // Case 8: Stroke -> ICH -> Treatment -> Hyperacute (< 6h) -> Blood Pressure Control
  const c8 = runQ({
    subspecialty: "Stroke",
    conditionId: "cond_ich",
    domain: "treatment",
    timeWindowId: toTimeWindowId("cond_ich", "Hyperacute (< 6h)"),
    interventionTags: [toCanonicalTagId("Blood Pressure Control")],
  });
  assert.ok(c8.coreRecommendations.length >= 3, "Case 8: ICH Hyperacute BP Control");

  // Case 9: Stroke -> ICH -> Anticoagulation Reversal (PCC / Andexanet Alfa / Idarucizumab)
  const c9 = runQ({
    subspecialty: "Stroke",
    conditionId: "cond_ich",
    domain: "treatment",
    interventionTags: [
      toCanonicalTagId("PCC"),
      toCanonicalTagId("Andexanet Alfa"),
      toCanonicalTagId("Idarucizumab"),
    ],
  });
  assert.ok(c9.coreRecommendations.length >= 3, "Case 9: ICH Anticoagulation Reversal");

  // Case 10: Stroke -> ICH -> Class III Harm (`Platelet Transfusion`)
  const c10 = runQ({
    subspecialty: "Stroke",
    conditionId: "cond_ich",
    domain: "treatment",
    interventionTags: [toCanonicalTagId("Platelet Transfusion")],
    directionFilter: "harm",
  });
  assert.ok(c10.coreRecommendations.length >= 1, "Case 10: ICH Platelet Transfusion Class III Harm");

  // Case 11: Stroke -> SAH -> Pre-Securing (< 72h) -> Aneurysm Coiling & Surgical Clipping
  const c11 = runQ({
    subspecialty: "Stroke",
    conditionId: "cond_sah",
    domain: "treatment",
    timeWindowId: toTimeWindowId("cond_sah", "Pre-Securing (< 72h)"),
    interventionTags: [toCanonicalTagId("Aneurysm Coiling"), toCanonicalTagId("Surgical Clipping")],
  });
  assert.ok(c11.coreRecommendations.length >= 3, "Case 11: SAH Coiling vs Clipping");

  // Case 12: Stroke -> SAH -> Nimodipine
  const c12 = runQ({
    subspecialty: "Stroke",
    conditionId: "cond_sah",
    domain: "treatment",
    interventionTags: [toCanonicalTagId("Nimodipine")],
  });
  assert.ok(c12.coreRecommendations.length >= 2, "Case 12: SAH Nimodipine");

  // Case 13: Stroke -> CVT -> Heparin / LMWH / DOAC
  const c13 = runQ({
    subspecialty: "Stroke",
    conditionId: "cond_cvt",
    domain: "treatment",
    interventionTags: [toCanonicalTagId("LMWH"), toCanonicalTagId("Heparin"), toCanonicalTagId("DOAC")],
  });
  assert.ok(c13.coreRecommendations.length >= 1, "Case 13: CVT Anticoagulation");

  // Case 14: Stroke -> Carotid Disease -> Carotid Endarterectomy / Carotid Stenting
  const c14 = runQ({
    subspecialty: "Stroke",
    conditionId: "cond_carotid",
    domain: "all",
    interventionTags: [toCanonicalTagId("Carotid Endarterectomy"), toCanonicalTagId("Carotid Stenting")],
  });
  assert.ok(c14.coreRecommendations.length >= 2, "Case 14: Carotid Disease Revascularization");

  // Case 15: Stroke -> Other (Stroke-Associated Pneumonia)
  const c15 = runQ({
    subspecialty: "Stroke",
    conditionId: "cond_stroke_other",
    domain: "all",
  });
  assert.ok(c15.coreRecommendations.length >= 5, "Case 15: Stroke-Associated Pneumonia & Complications");

  // Case 16: Neurocritical Care -> Status Epilepticus -> Established (5-30 min) -> ESETT Drugs
  const c16 = runQ({
    subspecialty: "Neurocritical Care",
    conditionId: "cond_status_epilepticus",
    domain: "treatment",
    timeWindowId: toTimeWindowId("cond_status_epilepticus", "Established (5–30 min)"),
    interventionTags: [
      toCanonicalTagId("Levetiracetam"),
      toCanonicalTagId("Fosphenytoin"),
      toCanonicalTagId("Valproate Sodium"),
    ],
  });
  assert.ok(c16.coreRecommendations.length >= 1, "Case 16: Status Epilepticus Established ESETT");

  // Case 17: Neurocritical Care -> Status Epilepticus -> Refractory (30 min-24h) -> Ketamine & cEEG
  const c17 = runQ({
    subspecialty: "Neurocritical Care",
    conditionId: "cond_status_epilepticus",
    domain: "treatment",
    timeWindowId: toTimeWindowId("cond_status_epilepticus", "Refractory (30 min–24h)"),
    interventionTags: [toCanonicalTagId("Ketamine"), toCanonicalTagId("Continuous EEG")],
  });
  assert.ok(c17.coreRecommendations.length >= 1, "Case 17: Refractory Status Epilepticus Ketamine & cEEG");

  // Case 18: Neurocritical Care -> Cerebral Edema -> Hypertonic Saline & Decompressive Craniectomy
  const c18 = runQ({
    subspecialty: "Neurocritical Care",
    conditionId: "cond_cerebral_edema",
    domain: "treatment",
    interventionTags: [toCanonicalTagId("Hypertonic Saline"), toCanonicalTagId("Decompressive Craniectomy")],
  });
  assert.ok(c18.coreRecommendations.length >= 1, "Case 18: Cerebral Edema Osmotherapy & Craniectomy");

  // Case 19: Neurocritical Care -> Acute Neuromuscular Failure -> FVC & Intubation
  const c19 = runQ({
    subspecialty: "Neurocritical Care",
    conditionId: "cond_acute_nm_failure",
    domain: "treatment",
    interventionTags: [toCanonicalTagId("Forced Vital Capacity"), toCanonicalTagId("Endotracheal Intubation")],
  });
  assert.ok(c19.coreRecommendations.length >= 1, "Case 19: Acute Neuromuscular Respiratory Failure");

  // Case 20: Epilepsy -> New-Onset Seizure -> Lamotrigine / Levetiracetam & Routine EEG
  const c20 = runQ({
    subspecialty: "Epilepsy",
    conditionId: "cond_new_onset_seizure",
    domain: "treatment",
    interventionTags: [toCanonicalTagId("Lamotrigine"), toCanonicalTagId("Levetiracetam")],
  });
  assert.ok(c20.coreRecommendations.length >= 1, "Case 20: New-Onset Seizure First-Line Monotherapy");

  // Case 21: Epilepsy -> Drug-Resistant Epilepsy -> Temporal Lobectomy / Cenobamate / VNS
  const c21 = runQ({
    subspecialty: "Epilepsy",
    conditionId: "cond_dre",
    domain: "treatment",
    interventionTags: [
      toCanonicalTagId("Temporal Lobectomy"),
      toCanonicalTagId("Cenobamate"),
      toCanonicalTagId("VNS Therapy"),
    ],
  });
  assert.ok(c21.coreRecommendations.length >= 1, "Case 21: Drug-Resistant Epilepsy Surgery & Cenobamate");

  // Case 22: Epilepsy -> Other (Pregnancy) -> Class III Harm `Teratogenic ASMs`
  const c22 = runQ({
    subspecialty: "Epilepsy",
    conditionId: "cond_epilepsy_other",
    domain: "treatment",
    interventionTags: [toCanonicalTagId("Teratogenic ASMs")],
    directionFilter: "harm",
  });
  assert.ok(c22.coreRecommendations.length >= 1, "Case 22: Epilepsy Pregnancy Teratogenic ASMs Harm");

  // Case 23: Dementia -> Alzheimer Disease -> Lecanemab / Donanemab / ARIA Monitoring
  const c23 = runQ({
    subspecialty: "Dementia",
    conditionId: "cond_alzheimer",
    domain: "treatment",
    interventionTags: [
      toCanonicalTagId("Lecanemab"),
      toCanonicalTagId("Donanemab"),
      toCanonicalTagId("ARIA Monitoring"),
    ],
  });
  assert.ok(c23.coreRecommendations.length >= 1, "Case 23: Alzheimer Disease Anti-Amyloid & ARIA");

  // Case 24: Multi-Parent `cond_lbd` (Lewy Body Dementia) across Dementia & Movement Disorders + Harm `Typical Antipsychotics`
  const c24Dem = runQ({
    subspecialty: "Dementia",
    conditionId: "cond_lbd",
    domain: "all",
  });
  const c24Mov = runQ({
    subspecialty: "Movement Disorders",
    conditionId: "cond_lbd",
    domain: "all",
  });
  assert.ok(c24Dem.coreRecommendations.length >= 2, "Case 24a: LBD in Dementia");
  assert.deepEqual(
    c24Dem.coreRecommendations.map((r) => r.recId),
    c24Mov.coreRecommendations.map((r) => r.recId),
    "Case 24b: Multi-Parent cond_lbd returns 100% identical recommendations in Dementia and Movement Disorders"
  );
  const c24Harm = runQ({
    subspecialty: "Dementia",
    conditionId: "cond_lbd",
    domain: "treatment",
    interventionTags: [toCanonicalTagId("Typical Antipsychotics")],
    directionFilter: "harm",
  });
  assert.ok(c24Harm.coreRecommendations.length >= 1, "Case 24c: LBD Typical Antipsychotics Harm");

  // Case 25: Dementia -> NPH Cross-Domain `VP Shunt` & FTD Class III Harm `Cholinesterase Inhibitors`
  const c25Nph = runQ({
    subspecialty: "Dementia",
    conditionId: "cond_nph",
    domain: "treatment",
    interventionTags: [toCanonicalTagId("VP Shunt")],
  });
  const c25FtdHarm = runQ({
    subspecialty: "Dementia",
    conditionId: "cond_ftd",
    domain: "treatment",
    interventionTags: [toCanonicalTagId("Cholinesterase Inhibitors")],
    directionFilter: "harm",
  });
  assert.ok(c25Nph.coreRecommendations.length >= 1, "Case 25a: NPH VP Shunt");
  assert.ok(c25FtdHarm.coreRecommendations.length >= 1, "Case 25b: FTD Cholinesterase Inhibitors Harm");

  // Case 26: Neuroimmunology -> MS Ocrelizumab/Ofatumumab & NMOSD Class III Harm `MS DMDs`
  const c26Ms = runQ({
    subspecialty: "Neuroimmunology",
    conditionId: "cond_ms",
    domain: "prevention",
    interventionTags: [toCanonicalTagId("Ocrelizumab"), toCanonicalTagId("Ofatumumab")],
  });
  const c26NmosdHarm = runQ({
    subspecialty: "Neuroimmunology",
    conditionId: "cond_nmosd",
    domain: "treatment",
    interventionTags: [toCanonicalTagId("MS DMDs")],
    directionFilter: "harm",
  });
  assert.ok(c26Ms.coreRecommendations.length >= 1, "Case 26a: MS Anti-CD20 Prevention");
  assert.ok(c26NmosdHarm.coreRecommendations.length >= 1, "Case 26b: NMOSD MS DMDs Harm");

  // Case 27: Multi-Parent `cond_paraneoplastic` across Neuroimmunology & Neuro-Oncology
  const c27Imm = runQ({
    subspecialty: "Neuroimmunology",
    conditionId: "cond_paraneoplastic",
    domain: "all",
  });
  const c27Onc = runQ({
    subspecialty: "Neuro-Oncology",
    conditionId: "cond_paraneoplastic",
    domain: "all",
  });
  assert.ok(c27Imm.coreRecommendations.length >= 1, "Case 27a: Paraneoplastic in Neuroimmunology");
  assert.deepEqual(
    c27Imm.coreRecommendations.map((r) => r.recId),
    c27Onc.coreRecommendations.map((r) => r.recId),
    "Case 27b: Multi-Parent cond_paraneoplastic returns 100% identical recommendations in Neuroimmunology and Neuro-Oncology"
  );

  // Case 28: Neuromuscular -> GBS/MMN Class III Harm `Corticosteroids`, MG `Efgartigimod` & Harm `Fluoroquinolones`, ALS `Tofersen` & `PEG Placement`
  const c28GbsHarm = runQ({
    subspecialty: "Neuromuscular",
    conditionId: "cond_gbs",
    domain: "treatment",
    interventionTags: [toCanonicalTagId("Corticosteroids")],
    directionFilter: "harm",
  });
  const c28MgHarm = runQ({
    subspecialty: "Neuromuscular",
    conditionId: "cond_mg",
    domain: "treatment",
    interventionTags: [toCanonicalTagId("Fluoroquinolones")],
    directionFilter: "harm",
  });
  const c28Als = runQ({
    subspecialty: "Neuromuscular",
    conditionId: "cond_als",
    domain: "treatment",
    interventionTags: [toCanonicalTagId("Tofersen"), toCanonicalTagId("PEG Placement")],
  });
  assert.ok(c28GbsHarm.coreRecommendations.length >= 1, "Case 28a: GBS Corticosteroids Harm");
  assert.ok(c28MgHarm.coreRecommendations.length >= 1, "Case 28b: MG Fluoroquinolones Harm");
  assert.ok(c28Als.coreRecommendations.length >= 1, "Case 28c: ALS Tofersen & PEG Placement");

  // Case 29: Movement Disorders (`DBS Surgery` in PD, `MRgFUS Thalamotomy` in ET) & Headache (`Erenumab` & Harm `Opioids` in Migraine, `High-Flow Oxygen` in Cluster)
  const c29Pd = runQ({
    subspecialty: "Movement Disorders",
    conditionId: "cond_parkinson",
    domain: "treatment",
    interventionTags: [toCanonicalTagId("DBS Surgery")],
  });
  const c29Et = runQ({
    subspecialty: "Movement Disorders",
    conditionId: "cond_essential_tremor",
    domain: "treatment",
    interventionTags: [toCanonicalTagId("MRgFUS Thalamotomy")],
  });
  const c29MigHarm = runQ({
    subspecialty: "Headache & Pain",
    conditionId: "cond_migraine",
    domain: "treatment",
    interventionTags: [toCanonicalTagId("Opioids")],
    directionFilter: "harm",
  });
  const c29Cluster = runQ({
    subspecialty: "Headache & Pain",
    conditionId: "cond_cluster_headache",
    domain: "treatment",
    interventionTags: [toCanonicalTagId("High-Flow Oxygen")],
  });
  assert.ok(c29Pd.coreRecommendations.length >= 1, "Case 29a: PD DBS Surgery");
  assert.ok(c29Et.coreRecommendations.length >= 1, "Case 29b: ET MRgFUS Thalamotomy");
  assert.ok(c29MigHarm.coreRecommendations.length >= 1, "Case 29c: Migraine Opioids Harm");
  assert.ok(c29Cluster.coreRecommendations.length >= 1, "Case 29d: Cluster Headache High-Flow Oxygen");

  // Case 30: CNS Infections (`Ceftriaxone` + `Dexamethasone`), Neuro-Oncology (`Vorasidenib` + `TTFields` & PCNSL Harm `Corticosteroids`) & Right-Pane Content Search Combination
  const c30Bac = runQ({
    subspecialty: "CNS Infections",
    conditionId: "cond_cns_bacteria",
    domain: "treatment",
    timeWindowId: toTimeWindowId("cond_cns_bacteria", "Door-to-Antibiotic (< 1h)"),
    interventionTags: [toCanonicalTagId("Ceftriaxone"), toCanonicalTagId("Dexamethasone")],
  });
  const c30Glioma = runQ({
    subspecialty: "Neuro-Oncology",
    conditionId: "cond_gliomas",
    domain: "treatment",
    interventionTags: [toCanonicalTagId("Vorasidenib"), toCanonicalTagId("TTFields")],
  });
  const c30SearchCombo = runQ({
    subspecialty: "Stroke",
    conditionId: "cond_ischemic_stroke",
    domain: "treatment",
    searchText: "0.25 mg/kg",
  });
  assert.ok(c30Bac.coreRecommendations.length >= 1, "Case 30a: Bacterial Meningitis Door-to-Antibiotic <1h");
  assert.ok(c30Glioma.coreRecommendations.length >= 1, "Case 30b: Glioma Vorasidenib & TTFields");
  assert.ok(c30SearchCombo.coreRecommendations.length >= 2, "Case 30c: Right-Pane Search '0.25 mg/kg' + Left-Pane Filter");
  assert.ok(
    c30SearchCombo.coreRecommendations.every((r) => r.text.toLowerCase().includes("0.25 mg/kg")),
    "Case 30d: Right-Pane Search strictly filters recommendation text"
  );
});
