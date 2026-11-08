import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadMergedNeuroGuideData, normalizeGuidelineTitle } from "../src/lib/neuroguide/guidelineStorage.ts";

describe("Guideline Edit Persistence & No-Disappearance", () => {
  it("should retain all active guidelines in loadMergedNeuroGuideData", async () => {
    const data = await loadMergedNeuroGuideData();
    assert.ok(data.guidelines.length >= 9, "Expected at least 9 active guidelines");

    // Check specific critical guidelines that were previously missing/disappearing
    const titles = data.guidelines.map(g => g.title);
    const hasAsah = titles.some(t => t.includes("Aneurysmal Subarachnoid Hemorrhage") || t.includes("aSAH"));
    assert.ok(hasAsah, "Aneurysmal Subarachnoid Hemorrhage guideline must be present");

    const hasSap = titles.some(t => t.includes("Stroke-Associated Pneumonia"));
    assert.ok(hasSap, "Stroke-Associated Pneumonia guideline must be present");

    const hasBp = titles.some(t => t.includes("Blood Pressure Management"));
    assert.ok(hasBp, "Blood Pressure Management guideline must be present");
  });

  it("should never have any active guideline ID or title in deletedGuidelineIds", async () => {
    const data = await loadMergedNeuroGuideData();
    const activeIds = new Set(data.guidelines.map(g => (g.id || "").toLowerCase().trim()));
    const activeTitles = new Set(data.guidelines.map(g => normalizeGuidelineTitle(g.title)));

    const deletedIds = data.deletedGuidelineIds || [];
    for (const del of deletedIds) {
      assert.strictEqual(
        activeIds.has(del),
        false,
        `Active guideline ID "${del}" must not be in deletedGuidelineIds`
      );
      assert.strictEqual(
        activeTitles.has(del),
        false,
        `Active guideline title "${del}" must not be in deletedGuidelineIds`
      );
    }
  });

  it("should ensure all active guidelines have valid practice changes array", async () => {
    const data = await loadMergedNeuroGuideData();
    for (const g of data.guidelines) {
      assert.ok(Array.isArray(g.allPracticeChanges), `Guideline ${g.title} must have allPracticeChanges array`);
      assert.ok(g.allPracticeChanges.length > 0, `Guideline ${g.title} must have at least one practice change`);
    }
  });

  it("should preserve both 2019 AIS and 2026 AIS guidelines when merged together", async () => {
    const { mergeGuidelines } = await import("../src/lib/neuroguide/guidelineStorage.ts");
    const doc2019 = {
      id: "aha-ais-2019",
      society: "AHA/ASA",
      year: 2019,
      title: "2019 Update ACC AHA Guidelines for the Early Management of Patients With Acute Ischemic Stroke",
      allPracticeChanges: [
        { id: "rec-2019-1", topic: "IV Thrombolysis", currentGrade: "Class 1, Level A", currentText: "Alteplase 0.9 mg/kg" }
      ],
    };
    const doc2026 = {
      id: "aha-ais-2026",
      society: "AHA/ASA",
      year: 2026,
      title: "2026 Guideline for the Early Management of Patients With Acute Ischemic Stroke",
      allPracticeChanges: [
        { id: "rec-2026-1", topic: "Tenecteplase", currentGrade: "Class 1, Level A", currentText: "Tenecteplase 0.25 mg/kg" }
      ],
    };

    const merged = mergeGuidelines([doc2019], [doc2026]);
    assert.strictEqual(merged.length, 2, "Both 2019 and 2026 AIS guidelines must be preserved");
    const titles = merged.map(g => g.title);
    assert.ok(titles.some(t => t.includes("2019")), "Must retain 2019 guideline");
    assert.ok(titles.some(t => t.includes("2026")), "Must retain 2026 guideline");
  });
});
