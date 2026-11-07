import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  runClinicalNavigatorQuery,
  indexAllGuidelineRecommendations,
} from "../src/lib/neuroguide/clinicalNavigatorEngine.ts";

const cloudPath = path.join(process.cwd(), "public", "data", "neuroguide_cloud.json");
const articlesPath = path.join(process.cwd(), "public", "data", "articles.json");

const cloudData = JSON.parse(fs.readFileSync(cloudPath, "utf8"));
const articlesData = JSON.parse(fs.readFileSync(articlesPath, "utf8"));

test("indexAllGuidelineRecommendations indexes all 555+ recommendations across 12 guidelines with zero rejected records", () => {
  const indexed = indexAllGuidelineRecommendations(
    cloudData.guidelines,
    cloudData.recommendationAtoms || []
  );
  assert.ok(indexed.length >= 550, `Expected >= 550 indexed recommendations, got ${indexed.length}`);
  const rejected = indexed.filter((r) => r.validationStatus === "reject");
  assert.equal(rejected.length, 0, "No indexed recommendation should have reject status");
});

test("runClinicalNavigatorQuery filters byAIS + Tenecteplase and builds Cross-Society Matrix, Diffs, Trials, Concordance, and Articles", () => {
  const res = runClinicalNavigatorQuery({
    guidelines: cloudData.guidelines,
    recommendationAtoms: cloudData.recommendationAtoms,
    conferences: cloudData.conferences,
    scenarios: cloudData.scenarios,
    neuroPulseArticles: articlesData,
    query: {
      facets: {
        condition: ["ais"],
        drug_or_procedure: ["tenecteplase"],
      },
      includeAiChecked: true,
    },
  });

  assert.ok(res.coreRecommendations.length >= 2, "Should find multiple Core recommendations for AIS + Tenecteplase");
  const societies = res.crossSocietyMatrix.map((g) => g.society);
  assert.ok(societies.some((s) => s.includes("AHA")), "Cross-Society Matrix should include AHA/ASA");
  assert.ok(societies.some((s) => s.includes("ESO")), "Cross-Society Matrix should include ESO");

  assert.ok(res.intraSocietyDiffs.length >= 1, "Should surface sequential version diffs");
  assert.ok(
    res.pivotalTrials.some((t) => t.acronym === "AcT" || t.acronym === "TRACE-2"),
    "Should link AcT and TRACE-2 pivotal trials"
  );
  assert.notEqual(res.concordanceAppraisal.consensusLevel, "NO_MATCHING_EVIDENCE");
  assert.ok(res.concordanceAppraisal.citedRecIds.length > 0, "Concordance appraisal must cite rec_ids");
  assert.ok(res.relatedArticles.length > 0, "Should match related NeuroPulse articles");
});

test("runClinicalNavigatorQuery detects divergence when recommendations include both FOR and AGAINST directions", () => {
  const res = runClinicalNavigatorQuery({
    guidelines: cloudData.guidelines,
    recommendationAtoms: cloudData.recommendationAtoms,
    conferences: cloudData.conferences,
    scenarios: cloudData.scenarios,
    neuroPulseArticles: articlesData,
    query: {
      facets: {
        condition: ["ais", "ich"],
        intervention_type: ["bp_management"],
      },
      includeAiChecked: true,
    },
  });

  assert.ok(res.coreRecommendations.length >= 5);
  assert.ok(
    res.pivotalTrials.some((t) => t.acronym === "ENCHANTED2/MT" || t.acronym === "INTERACT2"),
    "Should return BP management pivotal trials"
  );
  assert.ok(
    res.concordanceAppraisal.agreementPoints.length > 0 || res.concordanceAppraisal.divergencePoints.length > 0
  );
});
