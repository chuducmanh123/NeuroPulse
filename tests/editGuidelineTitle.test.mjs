import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mergeGuidelines, normalizeGuidelineTitle, getCoreTopicKey } from "../src/lib/neuroguide/guidelineStorage.ts";

describe("Guideline Title Edit & Cloud Persistence", () => {
  it("should preserve updated guideline title from cloud dynamicItems over static baseline", () => {
    const staticBase = [
      {
        id: "aha-ais-2026",
        title: "2026 Guideline for the Early Management of Patients With Acute Ischemic Stroke",
        society: "AHA/ASA",
        year: 2026,
        subspecialty: "Stroke",
        publishDate: "2026-01-01",
        officialUrl: "https://example.com/original",
        journalTarget: "Stroke",
        documentType: "Clinical Practice Guideline",
        executiveSummary: "Original summary",
        allPracticeChanges: [],
      },
    ];

    const updatedCloudDoc = {
      id: "aha-ais-2026",
      title: "2026 Guideline for Acute Ischemic Stroke - Revised & Updated Edition",
      society: "AHA/ASA",
      year: 2026,
      subspecialty: "Stroke",
      publishDate: "2026-01-01",
      officialUrl: "https://example.com/updated",
      journalTarget: "Stroke",
      documentType: "Clinical Practice Guideline",
      executiveSummary: "Updated summary",
      allPracticeChanges: [],
      synthesizedAt: new Date().toISOString(),
    };

    // Dynamic items (from Cloud) take precedence over static base
    const merged = mergeGuidelines([updatedCloudDoc], staticBase);
    assert.strictEqual(merged.length, 1);
    assert.strictEqual(
      merged[0].title,
      "2026 Guideline for Acute Ischemic Stroke - Revised & Updated Edition",
      "The updated cloud title must take precedence over the static baseline"
    );
  });

  it("should preserve title edits even when doc has different ID format but same topic key", () => {
    const staticBase = [
      {
        id: "aha2026_test",
        title: "2026 Guideline for the Early Management of Patients With Acute Ischemic Stroke",
        society: "AHA/ASA",
        year: 2026,
        subspecialty: "Stroke",
        publishDate: "2026-01-01",
        officialUrl: "https://example.com",
        journalTarget: "Stroke",
        documentType: "Clinical Practice Guideline",
        executiveSummary: "Summary",
        allPracticeChanges: [],
      },
    ];

    const editedCloudDoc = {
      id: "aha-ais-2026",
      title: "2026 AHA Acute Ischemic Stroke - Custom Translated Title",
      society: "AHA/ASA",
      year: 2026,
      subspecialty: "Stroke",
      publishDate: "2026-01-01",
      officialUrl: "https://example.com",
      journalTarget: "Stroke",
      documentType: "Clinical Practice Guideline",
      executiveSummary: "Summary",
      allPracticeChanges: [],
      synthesizedAt: new Date().toISOString(),
    };

    const merged = mergeGuidelines([editedCloudDoc], staticBase);
    assert.strictEqual(merged.length, 1);
    assert.strictEqual(
      merged[0].title,
      "2026 AHA Acute Ischemic Stroke - Custom Translated Title"
    );
  });

  it("should normalize title safely for comparisons", () => {
    const rawTitle = "2025 ESO Guideline on Blood Pressure: Acute Stroke!";
    const norm = normalizeGuidelineTitle(rawTitle);
    assert.strictEqual(norm, "2025esoguidelineonbloodpressureacutestroke");
  });
});
