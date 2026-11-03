import test from "node:test";
import assert from "node:assert/strict";
import { isTakeawayValid, extractFallbackFromAbstract } from "../src/utils/textCleaner.ts";

test("Takeaway Validation and Artifact Detection", async (t) => {
  await t.test("should reject takeaways with LLM chain-of-thought drafting / word count notes", () => {
    assert.equal(isTakeawayValid('Check word count of Draft 1: "In hospitalized adults'), false);
    assert.equal(isTakeawayValid('Draft 1):* "In patients with AF and prior'), false);
    assert.equal(isTakeawayValid('< 55). * Exact stats? None in input to preserve'), false);
    assert.equal(isTakeawayValid(':* "This narrative essay emphasizes the emotional and geographical challenges'), false);
    assert.equal(isTakeawayValid('-limited infantile epilepsy: 13.0 cases (95% CI'), false);
  });

  await t.test("should reject truncated takeaways without terminal punctuation or with dangling prepositions", () => {
    assert.equal(isTakeawayValid('Early, collaborative integration of acute neurological management and physiatric rehabilitation bridges distinct mechanistic and functional'), false);
    assert.equal(isTakeawayValid('shift in patients with baseline NIHSS ≤4 (cOR 0.47 ['), false);
    assert.equal(isTakeawayValid('The ABCD² score predicts 90-day stroke risk in DWI-'), false);
    assert.equal(isTakeawayValid('In breakthrough ischemic stroke, a high admission inflammatory burden independently predicts increased risks of'), false);
    assert.equal(isTakeawayValid('Routine clinical scales—MDS-UPDR'), false);
  });

  await t.test("should accept legitimate, complete clinical takeaways", () => {
    assert.equal(
      isTakeawayValid("In this cohort study, delirium during hospitalization was strongly associated with increased risk of MCI (aHR 3.67) and dementia (aHR 5.39)."),
      true
    );
    assert.equal(
      isTakeawayValid("Residential proximity to water pollutant-emitting industrial facilities is associated with an increased risk of incident progressive supranuclear palsy."),
      true
    );
  });

  await t.test("should extract high-yield conclusion fallback from structured abstract", () => {
    const abstract = "Importance: Testing. Objective: Testing. Results: Found things. Conclusions and Relevance: Delirium was strongly associated with increased risk of MCI and dementia in older adults. Additional note.";
    const extracted = extractFallbackFromAbstract(abstract);
    assert.match(extracted, /Delirium was strongly associated with increased risk of MCI and dementia in older adults\./);
  });
});
