import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateDailyHotTopics,
  matchTermWithBoundary,
  HOT_TOPICS_BANK,
} from "../src/utils/hotTopicsDetector.ts";

describe("Hot Topics & Mention Volume Engine", () => {
  it("should match words accurately with boundary check and avoid false positives", () => {
    // "nfl" must not match "inflammation"
    assert.equal(
      matchTermWithBoundary("neuroinflammation in multiple sclerosis", "nfl"),
      false
    );
    // "nfl" must match "serum nfl levels"
    assert.equal(
      matchTermWithBoundary("elevated serum nfl concentrations", "nfl"),
      true
    );
    // "evt" must match "underwent evt for lvo"
    assert.equal(
      matchTermWithBoundary("patients underwent evt for anterior lvo", "evt"),
      true
    );
    // "als" must not match "clinical trials"
    assert.equal(
      matchTermWithBoundary("results of clinical trials in stroke", "als"),
      false
    );
  });

  it("should calculate hot topics ranked by mention volume and recency", () => {
    const fakeArticles = [
      {
        id: "1",
        title: "Randomized Trial of Endovascular Thrombectomy in Mild Stroke",
        abstract: "EVT resulted in superior functional independence.",
        pub_date: new Date().toISOString(),
        article_type: "RCT",
        journal: { short_name: "NEJM" },
        neurology_classification: { subspecialty: "Stroke", subspecialties: ["Stroke"], topics: ["Thrombectomy"] },
      },
      {
        id: "2",
        title: "Endovascular Therapy in Large-Vessel Occlusion Stroke",
        abstract: "Thrombectomy improved mRS scores at 90 days.",
        pub_date: new Date().toISOString(),
        article_type: "Original Article",
        journal: { short_name: "Lancet Neurol" },
        neurology_classification: { subspecialty: "Stroke", subspecialties: ["Stroke"], topics: ["EVT"] },
      },
      {
        id: "3",
        title: "Plasma p-tau217 for Alzheimer Disease Diagnosis",
        abstract: "Plasma p-tau217 demonstrated high accuracy for amyloid pathology.",
        pub_date: new Date().toISOString(),
        article_type: "Original Article",
        journal: { short_name: "JAMA Neurol" },
        neurology_classification: { subspecialty: "Dementia", subspecialties: ["Dementia"], topics: ["Alzheimer"] },
      },
    ];

    const results = calculateDailyHotTopics(fakeArticles, 5);

    assert.ok(results.length >= 2, "Expected at least 2 hot topics");
    // EVT has 2 matching articles with 1 RCT, p-tau217 has 1 article
    const topTopic = results[0];
    assert.ok(
      topTopic.label.includes("EVT"),
      "EVT topic should be ranked #1 due to higher article volume and RCT weight"
    );
    assert.equal(topTopic.count, 2, "EVT count should be 2");
    assert.equal(topTopic.recentCount, 2, "Recent count should be 2");
  });

  it("should return empty array for empty articles list", () => {
    const results = calculateDailyHotTopics([]);
    assert.deepEqual(results, []);
  });
});
