import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadMergedNeuroGuideData, saveNeuroGuideToActiveStorage } from "../src/lib/neuroguide/guidelineStorage.ts";
import { generateAdminAuthToken, verifyAdminToken } from "../src/utils/security.ts";

describe("Clinical Scenario Admin Edit & Persistence", () => {
  it("should have scenarios in loadMergedNeuroGuideData", async () => {
    const data = await loadMergedNeuroGuideData();
    assert.ok(Array.isArray(data.scenarios), "data.scenarios must be an array");
    assert.ok(data.scenarios.length >= 8, `Expected at least 8 scenarios, got ${data.scenarios.length}`);

    const tnkScenario = data.scenarios.find(s => s.id === "ais-ivt-tenecteplase-4.5h");
    assert.ok(tnkScenario, "Tenecteplase scenario must exist");
    assert.ok(tnkScenario.title.includes("Tenecteplase"), "Title must contain Tenecteplase");
  });

  it("should verify admin token correctly", () => {
    const validToken = generateAdminAuthToken();
    assert.strictEqual(verifyAdminToken(validToken), true, "Valid admin token must be verified");
    assert.strictEqual(verifyAdminToken("invalid_fake_token"), false, "Fake token must fail");
    assert.strictEqual(verifyAdminToken(null), false, "Null token must fail");
  });

  it("should successfully update and persist a scenario via saveNeuroGuideToActiveStorage", async () => {
    const dataBefore = await loadMergedNeuroGuideData();
    const tnkBefore = dataBefore.scenarios.find(s => s.id === "ais-ivt-tenecteplase-4.5h");
    assert.ok(tnkBefore, "Existing scenario must exist");

    const originalTitle = tnkBefore.title;
    const testUpdatedTitle = `${originalTitle} [TEST_PERSISTENCE]`;

    const updatedScenarios = dataBefore.scenarios.map(s => {
      if (s.id === "ais-ivt-tenecteplase-4.5h") {
        return {
          ...s,
          title: testUpdatedTitle,
          aiSynthesisAppraisal: {
            ...s.aiSynthesisAppraisal,
            clinicalBottomLine: "Test updated clinical bottom-line for Tenecteplase 0.25 mg/kg.",
          },
        };
      }
      return s;
    });

    const saveRes = await saveNeuroGuideToActiveStorage({
      guidelines: dataBefore.guidelines,
      conferences: dataBefore.conferences,
      scenarios: updatedScenarios,
      recommendationAtoms: dataBefore.recommendationAtoms,
      deletedGuidelineIds: dataBefore.deletedGuidelineIds,
    });

    assert.strictEqual(saveRes.success, true, "saveNeuroGuideToActiveStorage must succeed");

    // Verify after saving
    const dataAfter = await loadMergedNeuroGuideData();
    const tnkAfter = dataAfter.scenarios.find(s => s.id === "ais-ivt-tenecteplase-4.5h");
    assert.ok(tnkAfter, "Updated scenario must exist");
    assert.strictEqual(tnkAfter.title, testUpdatedTitle, "Title must be updated to test title");
    assert.strictEqual(
      tnkAfter.aiSynthesisAppraisal.clinicalBottomLine,
      "Test updated clinical bottom-line for Tenecteplase 0.25 mg/kg."
    );

    // Revert back to original title to keep test idempotent and clean
    const revertedScenarios = dataAfter.scenarios.map(s => {
      if (s.id === "ais-ivt-tenecteplase-4.5h") {
        return {
          ...s,
          title: originalTitle,
          aiSynthesisAppraisal: {
            ...s.aiSynthesisAppraisal,
            clinicalBottomLine: tnkBefore.aiSynthesisAppraisal.clinicalBottomLine,
          },
        };
      }
      return s;
    });

    await saveNeuroGuideToActiveStorage({
      guidelines: dataAfter.guidelines,
      conferences: dataAfter.conferences,
      scenarios: revertedScenarios,
      recommendationAtoms: dataAfter.recommendationAtoms,
      deletedGuidelineIds: dataAfter.deletedGuidelineIds,
    });

    const finalData = await loadMergedNeuroGuideData();
    const tnkFinal = finalData.scenarios.find(s => s.id === "ais-ivt-tenecteplase-4.5h");
    assert.strictEqual(tnkFinal.title, originalTitle, "Reverted title must match original");
  });
});
