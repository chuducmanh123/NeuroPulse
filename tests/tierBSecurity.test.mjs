import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveRegimen } from "../src/lib/neurorx/dosing.ts";
import { analyzeRegimen } from "../src/lib/neurorx/interactions.ts";
import { assembleNeuroGuideStoreFromGraph } from "../src/lib/neuroguide/sync/blockGraph.ts";
import {
  handleCreateBlock,
  handleGetChanges,
} from "../src/lib/neuroguide/sync/handlers.ts";
import { MemoryNeuroGuideRepo } from "../src/lib/neuroguide/sync/repoMemory.ts";
import { buildGuidelineRecordFromDoc } from "../src/lib/neuroguide/storeAdapter.ts";

describe("Tier B NeuroRx Tamper-Lock & Draft Gates", () => {
  const verifiedDrug = {
    id: "test-tamper-drug",
    generic_name: "test-drug",
    tall_man: { value: "test-DRUG", refs: [] },
    classes: ["anticoagulant"],
    subspecialties: ["stroke"],
    vn_products: { value: [], refs: [] },
    bhyt: { value: { listed: true }, refs: [] },
    regimens: [
      {
        id: "reg-1",
        indication: "AFib",
        setting: "maintenance_outpatient",
        route: "PO",
        refs: [],
        dose: { kind: "fixed", amount: 5, unit: "mg", frequency: "BID" },
      },
    ],
    renal_basis: { value: "cg_abw", refs: [] },
    status: "verified",
    verification: { verified_by: "Dr", verified_at: "2026-11-11", content_hash: "abc" },
  };

  it("resolveRegimen blocks calculation when effectiveStatus is downgraded to draft", () => {
    const patient = { ageYears: 60, sex: "male", weightKg: 70, heightCm: 170, isPediatric: false, onHemodialysis: false };
    const renal = { value: 80, basisUsed: "cg_abw", label: "CrCl 80" };
    const res = resolveRegimen(verifiedDrug, verifiedDrug.regimens[0], patient, renal, {
      effectiveStatus: "draft",
    });
    assert.equal(res.state, "blocked_draft");
    assert.equal(res.amount, undefined);
  });

  it("analyzeRegimen excludes tamper-downgraded drugs via effectiveStatusById", () => {
    const out = analyzeRegimen(["test-tamper-drug"], {
      drugs: [verifiedDrug],
      interactions: [],
      effectiveStatusById: new Map([["test-tamper-drug", "draft"]]),
    });
    assert.deepEqual(out.draftsExcluded, ["test-tamper-drug"]);
  });
});

describe("Tier B NeuroGuide Sync v2 Draft Isolation & Honest TS Scores", () => {
  it("handleGetChanges hides draft blocks for isAdmin=false and shows them for isAdmin=true", async () => {
    const repo = new MemoryNeuroGuideRepo();
    const created = await handleCreateBlock(
      { repo, isAdmin: true },
      {
        data: {
          blockKey: "draft-rec-1",
          blockType: "recommendation",
          status: "draft",
          payload: {
            kind: "recommendation",
            practiceChange: {
              id: "draft-rec-1",
              topic: "Test",
              currentText: "Draft clinical text",
              status: "draft",
              approvalStatus: "needs_review",
            },
          },
          facetIndex: {
            recId: "draft-rec-1",
            subspecialties: ["Stroke"],
            conditionIds: ["ais"],
            domains: ["treatment"],
            diagnosisTags: ["ais"],
            timeWindowIds: [],
            interventionTags: [],
            direction: "recommended",
            normalizedTier: 1,
            ontologyFacets: null,
            v3Labels: null,
            customLabel: null,
            citedTrialKeys: [],
            linkedScenarioKeys: [],
            picoKey: null,
            sectionPath: "1.1",
          },
        },
      }
    );
    assert.equal(created.status, 201);

    const anonRes = await handleGetChanges({ repo, isAdmin: false }, { tierParam: "blocks" });
    assert.equal(anonRes.status, 200);
    assert.equal(anonRes.body.changes.length, 0);

    const adminRes = await handleGetChanges({ repo, isAdmin: true }, { tierParam: "blocks" });
    assert.equal(adminRes.status, 200);
    assert.equal(adminRes.body.changes.length, 1);

    const assembled = assembleNeuroGuideStoreFromGraph(
      {
        protocols: [],
        blocks: adminRes.body.changes,
        protocolBlocks: [],
        blockLinks: [],
      },
      { excludeDrafts: true }
    );
    assert.equal(assembled.guidelines.length, 0);
  });

  it("buildGuidelineRecordFromDoc emits honest unverified score 0 for pending TS extracts", () => {
    const rec = buildGuidelineRecordFromDoc(
      {
        id: "aha-2026-test",
        society: "AHA/ASA",
        year: 2026,
        title: "Test Guideline",
        officialUrl: "https://example.org",
        journalTarget: "Stroke",
        documentType: "Clinical Practice Guideline",
        publishDate: "2026-01-01",
        subspecialty: "Stroke",
        subspecialties: ["Stroke"],
        executiveSummary: "Summary",
        linkedScenarioIds: [],
        allPracticeChanges: [
          {
            id: "chg-1",
            category: "Acute",
            topic: "IVT",
            changeType: "NEW",
            currentGrade: "Class 1, LOE A",
            currentText: "Alteplase is recommended within 4.5 hours.",
            drivingTrials: [],
          },
        ],
      },
      "PENDING_REVIEW"
    );
    assert.equal(rec.recommendations[0].verification_detail.grounding_score, 0);
    assert.equal(rec.recommendations[0].verification_detail.numbers_verified, false);
    assert.equal(rec.recommendations[0].verification_detail.status, "UNVERIFIED_TS_EXTRACT");
  });
});
