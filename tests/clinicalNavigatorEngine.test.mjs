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
  getConditionByIdV3,
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

test("Clinical Feasibility Test Cases on Ingested Practical Guidelines & Unlabeled Rec Recognition", () => {
  const indexed = indexAllGuidelineRecommendations(guidelines, MOCK_RECOMMENDATION_ATOMS, {});
  assert.ok(indexed.length >= 500, `Expected >= 500 indexed recommendations, got ${indexed.length}`);

  // Confirm zero legacy matchedSpans / evidenceChips attached
  assert.ok(indexed.every((r) => !r.matchedSpans || r.matchedSpans.length === 0));

  // Verify synthetic guidelines (e.g. mock IDSA bacterial meningitis) are completely eliminated
  assert.ok(!indexed.some((r) => r.recId === "idsa-bacterial-meningitis-empiric-dex"), "Fake IDSA bacterial meningitis recommendations should not exist");
  assert.ok(!indexed.some((r) => r.guidelineId === "idsa-ean-cns-infections-2025"), "Fake IDSA/EAN guideline should not exist");

  // Verify mechanism recognizing unlabeled recommendations & verification status
  const unlabeledRecs = indexed.filter((r) => r.isUnlabeled);
  assert.ok(unlabeledRecs.length > 0, "Should detect recommendations needing labels / review");
  assert.ok(unlabeledRecs.some((r) => r.missingLabelReasons.length > 0), "Unlabeled recs should explain missing label reasons");
  assert.ok(indexed.some((r) => r.validationStatus === "ai_checked"), "Non-human-verified recs should be ai_checked");

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

  // Case 7: Stroke -> TIA -> DAPT
  const c7 = runQ({
    subspecialty: "Stroke",
    conditionId: "cond_tia",
    domain: "treatment",
    interventionTags: [toCanonicalTagId("DAPT")],
  });
  assert.ok(c7.coreRecommendations.length >= 1, "Case 7: TIA DAPT");

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

  // Case 13: Stroke -> Carotid Disease -> Carotid Endarterectomy / Carotid Stenting
  const c13 = runQ({
    subspecialty: "Stroke",
    conditionId: "cond_carotid",
    domain: "all",
    interventionTags: [toCanonicalTagId("Carotid Endarterectomy"), toCanonicalTagId("Carotid Stenting")],
  });
  assert.ok(c13.coreRecommendations.length >= 1, "Case 13: Carotid Disease Revascularization");

  // Case 14: Stroke -> Other (Stroke-Associated Pneumonia)
  const c14 = runQ({
    subspecialty: "Stroke",
    conditionId: "cond_stroke_other",
    domain: "all",
  });
  assert.ok(c14.coreRecommendations.length >= 5, "Case 14: Stroke-Associated Pneumonia & Complications");

  // Case 15: Unlabeled & Needs Review Verification Filter
  const c15Unlabeled = runQ({
    subspecialty: "Stroke",
    verificationFilter: "unlabeled_or_review",
  });
  assert.ok(c15Unlabeled.coreRecommendations.length > 0, "Case 15: Should return unlabeled recs when filtered");
  assert.ok(c15Unlabeled.coreRecommendations.every((r) => r.isUnlabeled || r.validationStatus !== "human_approved"));

  // Case 16: Non-ingested subspecialty (CNS Infections) returns 0 (no fake data fabricated)
  const c16NoFake = runQ({
    subspecialty: "CNS Infections",
    conditionId: "cond_cns_bacteria",
  });
  assert.equal(c16NoFake.coreRecommendations.length, 0, "Case 16: Non-ingested CNS Infections returns 0 recommendations");

  // Case 17: Right-Pane Content Search Combination strictly filters recommendation text
  const c17SearchCombo = runQ({
    subspecialty: "Stroke",
    conditionId: "cond_ischemic_stroke",
    domain: "treatment",
    searchText: "0.25 mg/kg",
  });
  assert.ok(c17SearchCombo.coreRecommendations.length >= 1, "Case 17: Right-Pane Search '0.25 mg/kg' + Left-Pane Filter");
  assert.ok(
    c17SearchCombo.coreRecommendations.every((r) => r.text.toLowerCase().includes("0.25 mg/kg")),
    "Case 17: Right-Pane Search strictly filters recommendation text"
  );
});

test("Axis 1B -> Axis 1A Sync: Condition selection resolves to correct corresponding Subspecialty", () => {
  function resolveSubspecialtyOnConditionSelect(currentSub, condId) {
    if (condId === "all") return currentSub;
    const cond = getConditionByIdV3(condId);
    if (!cond || !cond.subspecialties || cond.subspecialties.length === 0) return currentSub;
    if (currentSub === "all" || !cond.subspecialties.includes(currentSub)) {
      return cond.subspecialties[0];
    }
    return currentSub;
  }

  // 1. When Axis 1A is "all", selecting an Axis 1B condition switches Axis 1A to its subspecialty
  assert.equal(resolveSubspecialtyOnConditionSelect("all", "cond_ischemic_stroke"), "Stroke");
  assert.equal(resolveSubspecialtyOnConditionSelect("all", "cond_status_epilepticus"), "Neurocritical Care");
  assert.equal(resolveSubspecialtyOnConditionSelect("all", "cond_new_onset_seizure"), "Epilepsy");
  assert.equal(resolveSubspecialtyOnConditionSelect("all", "cond_migraine"), "Headache & Pain");

  // 2. When Axis 1A is already on another subspecialty, selecting a condition switches to the condition's subspecialty
  assert.equal(resolveSubspecialtyOnConditionSelect("Epilepsy", "cond_ischemic_stroke"), "Stroke");
  assert.equal(resolveSubspecialtyOnConditionSelect("Stroke", "cond_migraine"), "Headache & Pain");

  // 3. When Axis 1A is already on a valid subspecialty for a multi-parent condition, keep it
  assert.equal(resolveSubspecialtyOnConditionSelect("Movement Disorders", "cond_lbd"), "Movement Disorders");
  assert.equal(resolveSubspecialtyOnConditionSelect("Dementia", "cond_lbd"), "Dementia");
  assert.equal(resolveSubspecialtyOnConditionSelect("all", "cond_lbd"), "Dementia");

  // 4. Selecting "all" conditions does not alter current subspecialty
  assert.equal(resolveSubspecialtyOnConditionSelect("Stroke", "all"), "Stroke");
  assert.equal(resolveSubspecialtyOnConditionSelect("all", "all"), "all");
});
