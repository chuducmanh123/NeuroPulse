import test, { describe, it } from "node:test";
import assert from "node:assert/strict";

// Import modules under test
import {
  normalizePmcId,
  stripXmlTags,
  distillGuidelineXml,
} from "../src/lib/neuroguide/fullTextFetcher.ts";

import {
  mergeGuidelines,
  mergeConferences,
  mergeScenarios,
} from "../src/lib/neuroguide/blobStorage.ts";

import {
  extractGuidelineWithGemini,
} from "../src/lib/neuroguide/geminiGuidelineExtractor.ts";

describe("NeuroGuide Full-Text Extraction Engine", () => {
  it("should normalize diverse PMC ID formats accurately", () => {
    assert.deepEqual(normalizePmcId("PMC1029384"), {
      fullPmc: "PMC1029384",
      numPmc: "1029384",
    });
    assert.deepEqual(normalizePmcId("1029384"), {
      fullPmc: "PMC1029384",
      numPmc: "1029384",
    });
    assert.deepEqual(normalizePmcId("pmc998877"), {
      fullPmc: "PMC998877",
      numPmc: "998877",
    });
    assert.equal(normalizePmcId("invalid_non_numeric"), null);
    assert.equal(normalizePmcId(undefined), null);
  });

  it("should strip XML tags and decode HTML entities safely", () => {
    const raw = `<p>Patients with &lt;4.5h onset should receive &quot;Tenecteplase&quot; &amp; EVT.</p>`;
    const cleaned = stripXmlTags(raw);
    assert.equal(cleaned, 'Patients with <4.5h onset should receive "Tenecteplase" & EVT.');
  });

  it("should strip <ref-list> and extract high-value recommendation sections from XML", () => {
    const mockXml = `
      <article>
        <front>
          <abstract>
            <p>Executive abstract on acute ischemic stroke care.</p>
          </abstract>
        </front>
        <body>
          <sec id="s1">
            <title>Introduction &amp; Background</title>
            <p>Background epidemiology of neurological disorders.</p>
          </sec>
          <sec id="s2">
            <title>What is new in this 2026 update</title>
            <p>New indications for Tenecteplase up to 4.5h and expanded EVT in large ischemic core ASPECTS 3-5 based on SELECT2 and ANGEL-ASPECT.</p>
          </sec>
          <sec id="s3">
            <title>Summary of Recommendations</title>
            <p>Class I, Level A: We recommend endovascular thrombectomy for anterior circulation large vessel occlusion up to 24 hours.</p>
          </sec>
        </body>
        <back>
          <ref-list>
            <ref id="b1"><element-citation publication-type="journal"><article-title>Trial 1</article-title></element-citation></ref>
            <ref id="b2"><element-citation publication-type="journal"><article-title>Trial 2</article-title></element-citation></ref>
          </ref-list>
        </back>
      </article>
    `;

    const distilled = distillGuidelineXml(mockXml);

    // References should be 100% purged
    assert.equal(distilled.distilledText.includes("element-citation"), false);
    assert.equal(distilled.distilledText.includes("<ref-list>"), false);

    // Priority sections should be isolated
    assert.ok(distilled.distilledText.includes("WHAT IS NEW IN THIS 2026 UPDATE"));
    assert.ok(distilled.distilledText.includes("SUMMARY OF RECOMMENDATIONS"));
    assert.ok(distilled.sectionsFound.includes("Summary of Recommendations"));
    assert.ok(distilled.sectionsFound.includes("What is new in this 2026 update"));
  });
});

describe("Vercel Blob & Local Storage Merging Engine", () => {
  it("should merge dynamic guidelines seamlessly with static baseline", () => {
    const staticDocs = [
      {
        id: "aha-ais-2026",
        society: "AHA/ASA",
        year: 2026,
        title: "AHA Guideline",
        officialUrl: "https://doi.org/1",
        journalTarget: "Stroke",
        documentType: "Clinical Practice Guideline",
        publishDate: "2026-01-01",
        subspecialty: "Stroke",
        executiveSummary: "Static summary",
        allPracticeChanges: [],
        linkedScenarioIds: [],
      },
    ];

    const dynamicDocs = [
      {
        id: "eso-ais-2026",
        society: "ESO",
        year: 2026,
        title: "ESO Guideline",
        officialUrl: "https://doi.org/2",
        journalTarget: "Eur Stroke J",
        documentType: "Clinical Practice Guideline",
        publishDate: "2026-03-01",
        subspecialty: "Stroke",
        executiveSummary: "Dynamic summary",
        allPracticeChanges: [],
        linkedScenarioIds: [],
        fullTextStatus: "FULL_TEXT_PARSED",
      },
    ];

    const merged = mergeGuidelines(dynamicDocs, staticDocs);
    assert.equal(merged.length, 2);
    // Sorts descending by publish date (March 2026 before January 2026)
    assert.equal(merged[0].id, "eso-ais-2026");
    assert.equal(merged[1].id, "aha-ais-2026");
  });

  it("should merge dynamic conferences with foreign key late-breaking trials", () => {
    const staticConfs = [
      {
        id: "esoc-2026",
        acronym: "ESOC",
        name: "European Stroke Organisation Conference",
        year: 2026,
        startDate: "2026-05-20",
        dates: "May 20-22, 2026",
        location: "Basel",
        status: "LIVE",
        officialUrl: "https://esoc2026.org",
        executiveSummary: "ESOC summary",
        stats: { totalLateBreakingTrials: 1, positiveTrials: 1, practiceChangingCount: 1 },
        subspecialties: ["Stroke"],
        lateBreakingTrials: [],
      },
    ];

    const dynamicConfs = [
      {
        id: "esoc-2026",
        acronym: "ESOC",
        name: "European Stroke Organisation Conference (Updated)",
        year: 2026,
        startDate: "2026-05-20",
        dates: "May 20-22, 2026",
        location: "Basel",
        status: "LIVE",
        officialUrl: "https://esoc2026.org",
        executiveSummary: "ESOC updated summary",
        stats: { totalLateBreakingTrials: 3, positiveTrials: 2, practiceChangingCount: 2 },
        subspecialties: ["Stroke"],
        lateBreakingTrials: [
          {
            id: "trial-1",
            trialAcronym: "TENSION-2",
            title: "Extended Thrombectomy Trial",
            studyDesign: "Phase 3 RCT",
            subspecialty: "Stroke",
            verdict: "POSITIVE",
            isPracticeChanging: true,
            populationSummary: "ASPECTS 3-5",
            interventionGroup: "EVT",
            controlGroup: "Medical",
            primaryOutcome: "mRS 0-2: 35% vs 18%",
            safetyOutcome: "sICH: 4.2%",
            bottomLineTakeaway: "Strong benefit",
          },
        ],
      },
    ];

    const merged = mergeConferences(dynamicConfs, staticConfs);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].lateBreakingTrials.length, 1);
    assert.equal(merged[0].stats.totalLateBreakingTrials, 3);
  });
});

describe("Deterministic Fallback & Guideline Extraction", () => {
  it("should generate a complete, valid GuidelineDoc structure with allPracticeChanges", async () => {
    const extracted = await extractGuidelineWithGemini({
      title: "2026 ESO Clinical Practice Guideline on Acute Ischemic Stroke Reperfusion",
      journal: "European Stroke Journal",
      pubYear: 2026,
      officialUrl: "https://doi.org/10.1177/eso.2026.01",
      pmcid: "PMC10928374",
      fullTextSnippet: "=== SUMMARY OF RECOMMENDATIONS ===\nWe recommend Tenecteplase 0.25 mg/kg within 4.5 hours.",
      isFullText: true,
    });

    assert.ok(extracted);
    assert.equal(extracted.society, "ESO");
    assert.equal(extracted.subspecialty, "Stroke");
    assert.equal(extracted.fullTextStatus, "FULL_TEXT_PARSED");
    assert.ok(extracted.allPracticeChanges.length >= 2);
    assert.ok(extracted.allPracticeChanges[0].currentGrade.length > 0);
    assert.ok(extracted.executiveSummaryVi && extracted.executiveSummaryVi.length > 10);
  });
});
