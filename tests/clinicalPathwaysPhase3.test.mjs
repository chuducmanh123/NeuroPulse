import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildPathwaySummaryText,
  evaluateChecklistState,
  filterCatalogPathways,
  resolveBilingualDisplay,
} from "../src/lib/neuroguide/pathwayRunnerUtils.ts";

const SAMPLE_PATHWAYS = [
  {
    uid: "uid-1",
    slug: "ais-ivt-aha-2026",
    title: {
      en: "Acute Ischemic Stroke IVT",
      vi: "Tiêu sợi huyết trong đột quỵ thiếu máu não cấp",
    },
    summary: { en: "Alteplase / Tenecteplase eligibility" },
    subspecialty: "Stroke",
    domain: "treatment",
    source: {
      sourceType: "guideline",
      title: "2026 AHA/ASA AIS Guideline",
      organizationOrAuthor: "AHA/ASA",
      year: 2026,
      figureRef: "Figure 1",
    },
    sourceImageUrl: "/uploads/pathways/ivt.png",
    entryNodeId: "n1",
    nodes: [
      {
        id: "n1",
        kind: "entry",
        title: { en: "Suspected AIS", vi: "Nghi ngờ đột quỵ cấp" },
        edges: [{ id: "e1", label: { en: "Go" }, targetNodeId: "n2" }],
      },
      {
        id: "n2",
        kind: "treatment",
        title: { en: "IV Tenecteplase 0.25 mg/kg", vi: "Tiêm IV Tenecteplase" },
        body: { en: "Administer as single IV bolus over 5 seconds." },
        warning: { en: "Do not give if ICH on CT." },
        evidenceBadge: "Class I, LOE A",
        edges: [],
      },
    ],
    status: "published",
    rev: 1,
    deletedAt: null,
    createdAt: "2026-11-22T00:00:00.000Z",
    updatedAt: "2026-11-22T00:00:00.000Z",
  },
  {
    uid: "uid-2",
    slug: "draft-vertigo",
    title: { en: "Acute Vertigo Draft", vi: "Chóng mặt cấp bản nháp" },
    subspecialty: "Stroke",
    domain: "diagnosis",
    source: {
      sourceType: "textbook",
      title: "Adams & Victor",
      organizationOrAuthor: "Ropper",
      year: 2023,
    },
    sourceImageUrl: "/uploads/pathways/vertigo.png",
    entryNodeId: "n1",
    nodes: [{ id: "n1", kind: "diagnosis", title: { en: "HINTS" }, edges: [] }],
    status: "draft",
    rev: 1,
    deletedAt: null,
    createdAt: "2026-11-22T00:00:00.000Z",
    updatedAt: "2026-11-22T00:00:00.000Z",
  },
  {
    uid: "uid-3",
    slug: "deleted-epilepsy",
    title: { en: "Status Epilepticus", vi: "Trạng thái động kinh" },
    subspecialty: "Epilepsy",
    domain: "treatment",
    source: {
      sourceType: "guideline",
      title: "AES Guideline",
      organizationOrAuthor: "AES",
      year: 2024,
    },
    sourceImageUrl: "/uploads/pathways/se.png",
    entryNodeId: "n1",
    nodes: [{ id: "n1", kind: "treatment", title: { en: "Lorazepam" }, edges: [] }],
    status: "published",
    rev: 2,
    deletedAt: "2026-11-23T00:00:00.000Z",
    createdAt: "2026-11-22T00:00:00.000Z",
    updatedAt: "2026-11-23T00:00:00.000Z",
  },
];

describe("Phase 3 — Clinical Pathways Runner Utils & Catalog Filtering", () => {
  it("resolveBilingualDisplay respects EN default, EN+VI bilingual, and VI modes", () => {
    const text = { en: "Acute Ischemic Stroke", vi: "Đột quỵ thiếu máu não cấp" };

    assert.deepEqual(resolveBilingualDisplay(text, "en"), {
      primary: "Acute Ischemic Stroke",
    });
    assert.deepEqual(resolveBilingualDisplay(text, "bilingual"), {
      primary: "Acute Ischemic Stroke",
      secondary: "Đột quỵ thiếu máu não cấp",
    });
    assert.deepEqual(resolveBilingualDisplay(text, "vi"), {
      primary: "Đột quỵ thiếu máu não cấp",
      secondary: "Acute Ischemic Stroke",
    });
    // Fallback when vi missing
    assert.deepEqual(resolveBilingualDisplay({ en: "NIHSS >= 6" }, "vi"), {
      primary: "NIHSS >= 6",
    });
  });

  it("evaluateChecklistState distinguishes incomplete, pass, and exclusion-fail", () => {
    const items = [
      { id: "i1", label: { en: "Onset <= 4.5h" }, role: "inclusion" },
      { id: "i2", label: { en: "BP < 185/110" }, role: "inclusion" },
      { id: "e1", label: { en: "ICH on CT" }, role: "exclusion" },
    ];

    assert.equal(evaluateChecklistState(items, { i1: true }).status, "incomplete");
    assert.equal(evaluateChecklistState(items, { i1: true, i2: true }).status, "pass");
    assert.equal(
      evaluateChecklistState(items, { i1: true, i2: true, e1: true }).status,
      "fail"
    );
  });

  it("buildPathwaySummaryText formats bedside summary with trail, conclusion, warning, and source", () => {
    const pathway = SAMPLE_PATHWAYS[0];
    const summary = buildPathwaySummaryText(
      pathway,
      [
        { nodeTitle: "Suspected AIS", chosenLabel: "Onset <= 4.5h" },
        { nodeTitle: "IV Tenecteplase 0.25 mg/kg" },
      ],
      pathway.nodes[1],
      "en"
    );

    assert.match(summary, /\[NeuroGuide Clinical Pathway\] Acute Ischemic Stroke IVT/);
    assert.match(summary, /1\. Suspected AIS -> Onset <= 4\.5h/);
    assert.match(summary, /Conclusion \(TREATMENT\): IV Tenecteplase 0\.25 mg\/kg/);
    assert.match(summary, /Evidence: Class I, LOE A/);
    assert.match(summary, /Warning: Do not give if ICH on CT\./);
    assert.match(summary, /2026 AHA\/ASA AIS Guideline \(AHA\/ASA, 2026\) — Figure 1/);
  });

  it("filterCatalogPathways enforces non-admin isolation and accent-insensitive search", () => {
    const nonAdmin = filterCatalogPathways(SAMPLE_PATHWAYS, {
      query: "tieu soi huyet", // accent-insensitive Vietnamese query
      subspecialty: "All Subspecialties",
      domain: "ALL",
      sourceType: "ALL",
      statusFilter: "draft", // ignored for non-admin
      isAdmin: false,
    });
    assert.equal(nonAdmin.length, 1);
    assert.equal(nonAdmin[0].uid, "uid-1");

    const adminDrafts = filterCatalogPathways(SAMPLE_PATHWAYS, {
      query: "",
      subspecialty: "All Subspecialties",
      domain: "ALL",
      sourceType: "textbook",
      statusFilter: "draft",
      isAdmin: true,
    });
    assert.equal(adminDrafts.length, 1);
    assert.equal(adminDrafts[0].uid, "uid-2");

    const adminDeleted = filterCatalogPathways(SAMPLE_PATHWAYS, {
      query: "",
      subspecialty: "All Subspecialties",
      domain: "ALL",
      sourceType: "ALL",
      statusFilter: "deleted",
      isAdmin: true,
    });
    assert.equal(adminDeleted.length, 1);
    assert.equal(adminDeleted[0].uid, "uid-3");
  });
});
