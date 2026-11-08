import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generateSafeGuidelineId,
  generateSafeGuidelineSlug,
  parseNotebookLMContent,
} from "../src/lib/neuroguide/notebooklmParser.ts";
import {
  mergeGuidelines,
  normalizeGuidelineTitle,
  loadMergedNeuroGuideData,
} from "../src/lib/neuroguide/guidelineStorage.ts";

describe("Guideline Creation, Duplicate Prevention & Deleted Protection", () => {
  it("should generate deterministic safe IDs and disambiguate if colliding with existing or deleted IDs", () => {
    const baseTitle = "2026 Guideline for Stroke Rehabilitation";
    const initialId = generateSafeGuidelineId("AHA/ASA", 2026, baseTitle);
    assert.ok(initialId.includes("ahaasa-2026"), "Should have correct society and year prefix");

    // Case: ID already exists in active storage or in deleted list
    const excludedIds = new Set([initialId.toLowerCase()]);
    const disambiguatedId = generateSafeGuidelineId("AHA/ASA", 2026, baseTitle, excludedIds);

    assert.notStrictEqual(disambiguatedId, initialId, "Disambiguated ID must not equal the initial ID");
    assert.strictEqual(disambiguatedId, `${initialId}-v1`, "Should append -v1 suffix");
    assert.strictEqual(excludedIds.has(disambiguatedId.toLowerCase()), false, "New ID must not be in excluded IDs");

    // Case: Multiple previous versions deleted
    const multipleExcluded = new Set([
      initialId.toLowerCase(),
      `${initialId}-v1`.toLowerCase(),
      `${initialId}-v2`.toLowerCase(),
    ]);
    const thirdId = generateSafeGuidelineId("AHA/ASA", 2026, baseTitle, multipleExcluded);
    assert.strictEqual(thirdId, `${initialId}-v3`, "Should increment suffix to -v3");
  });

  it("should integrate exclusion list into parseNotebookLMContent to protect newly parsed guidelines", () => {
    const sampleText = `
# 2025 ESO Focused Update on Tenecteplase
| Domain | Recommendation | Quality of Evidence | Strength of Recommendation |
| --- | --- | --- | --- |
| Thrombolysis | Tenecteplase 0.25 mg/kg is recommended within 4.5 hours | High | Strong for intervention |
`;
    // Pre-calculate what standard ID would be
    const preCalcId = generateSafeGuidelineId("ESO", 2025, "2025 ESO Focused Update on Tenecteplase");
    const deletedList = [preCalcId, "old-deleted-guideline-id"];

    const { doc, stats } = parseNotebookLMContent(sampleText, {
      existingOrDeletedIds: deletedList,
    });

    assert.strictEqual(stats.totalRecommendations, 1);
    assert.notStrictEqual(doc.id, preCalcId, "Must avoid colliding with deleted ID");
    assert.ok(doc.id.endsWith("-v1"), "Must carry disambiguation suffix");
  });

  it("should detect exact and normalized title duplicates to prevent accidental overwrite or merging", async () => {
    const currentStore = await loadMergedNeuroGuideData();
    assert.ok(currentStore.guidelines.length > 0, "Store must contain active guidelines");

    const existingDoc = currentStore.guidelines[0];
    const candExactTitle = existingDoc.title;
    const candNormalizedTitle = normalizeGuidelineTitle(existingDoc.title);

    // Matching logic mimicking the check in POST /api/neuroguide/import-notebooklm
    const activeNormTitles = new Map();
    const activeTrimTitles = new Map();

    for (const g of currentStore.guidelines) {
      if (g.title) {
        activeNormTitles.set(normalizeGuidelineTitle(g.title), g);
        activeTrimTitles.set(g.title.trim().toLowerCase(), g);
      }
    }

    // 1. Exact match
    const matchExact = activeTrimTitles.get(candExactTitle.trim().toLowerCase());
    assert.ok(matchExact, "Must detect exact duplicate title");
    assert.strictEqual(matchExact?.id, existingDoc.id);

    // 2. Normalized match (different spacing or punctuation)
    const matchNorm = activeNormTitles.get(candNormalizedTitle);
    assert.ok(matchNorm, "Must detect normalized duplicate title");
    assert.strictEqual(matchNorm?.id, existingDoc.id);

    // 3. Different title with distinct year or scope must NOT be detected as duplicate
    const distinctTitle = `2019 Update to ${existingDoc.title}`;
    const matchDistinct =
      activeTrimTitles.get(distinctTitle.trim().toLowerCase()) ||
      activeNormTitles.get(normalizeGuidelineTitle(distinctTitle));
    assert.strictEqual(matchDistinct, undefined, "Distinct title must not match as duplicate");
  });

  it("should ensure guidelines with different titles or years remain completely separate in mergeGuidelines", () => {
    const docA = {
      id: "ais-guideline-2019",
      society: "AHA/ASA",
      year: 2019,
      title: "2019 Update ACC AHA Guidelines for the Early Management of Patients With Acute Ischemic Stroke",
      allPracticeChanges: [
        { id: "chg-1", topic: "Alteplase", currentGrade: "Class 1, Level A", currentText: "Alteplase IV" },
      ],
    };

    const docB = {
      id: "ais-guideline-2026",
      society: "AHA/ASA",
      year: 2026,
      title: "2026 Guideline for the Early Management of Patients With Acute Ischemic Stroke",
      allPracticeChanges: [
        { id: "chg-2", topic: "Tenecteplase", currentGrade: "Class 1, Level A", currentText: "Tenecteplase IV" },
      ],
    };

    const merged = mergeGuidelines([docA], [docB]);
    assert.strictEqual(merged.length, 2, "Both guidelines must coexist separately without mixing");
    assert.ok(merged.some(g => g.id === "ais-guideline-2019"), "Must keep 2019 guideline");
    assert.ok(merged.some(g => g.id === "ais-guideline-2026"), "Must keep 2026 guideline");
  });
});
