import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { deriveNeuroGuideStoreFromGraphSnapshot } from "../src/hooks/useNeuroGuideSync.ts";
import {
  NEUROGUIDE_BLOCK_DRAFT_KEY_PREFIX,
  NEUROGUIDE_DRAFT_AUTOSAVE_INTERVAL_MS,
  buildNeuroGuideBlockDraftStorageKey,
  clearLocalBlockDraft,
  clearLocalBlockDraftsForUid,
  findLatestLocalBlockDraftForUid,
  formatBlockRevisionDiffEntries,
  loadLocalBlockDraft,
  resolveBlockConflictChoice,
  saveLocalBlockDraft,
  threeWayMergeBlock,
} from "../src/lib/neuroguide/sync/adminHelpers.ts";
import {
  computeBlockContentHash,
  computeBlockSectionHashes,
  decomposeNeuroGuideStoreToGraph,
} from "../src/lib/neuroguide/sync/blockGraph.ts";
import {
  handleCreateBlock,
  handleGetBlockHistory,
  handleRestoreBlockRevision,
  handleUpdateBlock,
} from "../src/lib/neuroguide/sync/handlers.ts";
import {
  buildNeuroGuideSelectionSearchParams,
  formatNeuroGuideSyncStatusView,
  reconstructCatalogFromSyncGraph,
  reconstructGuidelineDocFromGraph,
  resolveRecommendationBlockForPracticeChange,
} from "../src/lib/neuroguide/sync/lookupHelpers.ts";
import { MemoryNeuroGuideRepo } from "../src/lib/neuroguide/sync/repoMemory.ts";
import {
  loadNeuroGuideCatalogFromSyncV2,
  syncDeleteGuidelineInV2Repo,
  syncGuidelineDocToV2Repo,
} from "../src/lib/neuroguide/sync/serverAdapter.ts";

function createMemoryStorage() {
  const map = new Map();
  return {
    get length() {
      return map.size;
    },
    key(index) {
      return Array.from(map.keys())[index] ?? null;
    },
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    },
  };
}

function makeSampleGuideline(id = "aha-test-2026") {
  return {
    id,
    society: "AHA/ASA",
    year: 2026,
    title: "2026 AHA/ASA Test AIS Guideline",
    officialUrl: "https://example.org/aha-2026",
    journalTarget: "Stroke",
    documentType: "Clinical Practice Guideline",
    publishDate: "2026-01-15",
    subspecialty: "Stroke",
    subspecialties: ["Stroke"],
    executiveSummary: "Test executive summary",
    linkedScenarioIds: ["scen-1"],
    status: "approved",
    allPracticeChanges: [
      {
        id: "rec-1",
        category: "Reperfusion",
        topic: "IVT Window",
        changeType: "UPGRADED",
        currentText: "Tenecteplase is recommended within 4.5h of onset.",
        currentGrade: "Class I, Level A",
        cor: "1",
        loe: "A",
        drivingTrials: ["ACT", "EXTEND-IA TNK"],
      },
      {
        id: "rec-2",
        category: "Endovascular",
        topic: "LVO Thrombectomy",
        changeType: "STANDARD",
        currentText: "Mechanical thrombectomy is recommended for ICA/M1 occlusion.",
        currentGrade: "Class I, Level A",
        cor: "1",
        loe: "A",
        drivingTrials: ["DAWN", "DEFUSE-3"],
      },
      {
        id: "rec-3",
        category: "Blood Pressure",
        topic: "Post-IVT BP Target",
        changeType: "STANDARD",
        currentText: "Maintain BP below 180/105 mmHg for 24h after IVT.",
        currentGrade: "Class IIa, Level B-R",
        cor: "2a",
        loe: "B-R",
        drivingTrials: [],
      },
    ],
  };
}

function makeSampleBlockRow(uid, rev = 1, text = "Initial statement", facetOverrides = {}) {
  const data = {
    blockKey: `rec:g1:0:${uid}`,
    blockType: "recommendation",
    payload: {
      kind: "recommendation",
      practiceChange: {
        id: "rec-1",
        category: "Reperfusion",
        topic: "IVT",
        changeType: "UPGRADED",
        currentText: text,
        currentGrade: "Class I, Level A",
        drivingTrials: ["ACT"],
      },
    },
    facetIndex: {
      recId: "rec-1",
      subspecialties: ["Stroke"],
      conditionIds: ["cond_ischemic_stroke"],
      domains: ["treatment"],
      diagnosisTags: [],
      timeWindowIds: ["tw_0_4_5h"],
      interventionTags: ["int_tenecteplase"],
      direction: "recommended",
      normalizedTier: 1,
      ontologyFacets: null,
      v3Labels: {
        subspecialties: ["Stroke"],
        conditionIds: ["cond_ischemic_stroke"],
        domains: ["treatment"],
        diagnosisTags: [],
        timeWindowIds: ["tw_0_4_5h"],
        interventionTags: ["int_tenecteplase"],
        direction: "recommended",
      },
      customLabel: null,
      citedTrialKeys: ["ACT"],
      linkedScenarioKeys: [],
      picoKey: null,
      sectionPath: "Reperfusion / IVT",
      ...facetOverrides,
    },
  };
  return {
    uid,
    slug: data.blockKey.toLowerCase(),
    blockKey: data.blockKey,
    blockType: "recommendation",
    data,
    contentHash: computeBlockContentHash(data),
    sectionHashes: computeBlockSectionHashes(data),
    rev,
    changeSeq: rev,
    updatedAt: "2026-11-18T10:00:00.000Z",
    updatedBy: "admin",
    deletedAt: null,
  };
}

describe("Phase 8.6 — NeuroGuide Admin & Lookup Sync v2 Helpers", () => {
  it("Test 1: 3s local block draft auto-save, latest draft lookup across revisions, and clearLocalBlockDraftsForUid", () => {
    assert.equal(NEUROGUIDE_DRAFT_AUTOSAVE_INTERVAL_MS, 3000);
    assert.equal(NEUROGUIDE_BLOCK_DRAFT_KEY_PREFIX, "neuroguide-block-draft:");
    assert.equal(
      buildNeuroGuideBlockDraftStorageKey("block-uid-1", 4),
      "neuroguide-block-draft:block-uid-1:4",
    );

    const storage = createMemoryStorage();
    const rowRev3 = makeSampleBlockRow("block-uid-1", 3, "Older edit");
    const rowRev4 = makeSampleBlockRow("block-uid-1", 4, "Newest edit");
    const otherRow = makeSampleBlockRow("block-uid-2", 1, "Other block");

    assert.equal(
      saveLocalBlockDraft(storage, {
        uid: "block-uid-1",
        baseRev: 3,
        savedAt: "2026-11-18T09:00:00.000Z",
        data: rowRev3.data,
      }),
      true,
    );
    assert.equal(
      saveLocalBlockDraft(storage, {
        uid: "block-uid-1",
        baseRev: 4,
        savedAt: "2026-11-18T09:05:00.000Z",
        data: rowRev4.data,
        note: "auto-saved",
      }),
      true,
    );
    saveLocalBlockDraft(storage, {
      uid: "block-uid-2",
      baseRev: 1,
      savedAt: "2026-11-18T09:01:00.000Z",
      data: otherRow.data,
    });

    const loadedExact = loadLocalBlockDraft(storage, "block-uid-1", 4);
    assert.equal(loadedExact?.data.payload.practiceChange.currentText, "Newest edit");
    assert.equal(loadedExact?.note, "auto-saved");

    const latest = findLatestLocalBlockDraftForUid(storage, "block-uid-1");
    assert.equal(latest?.baseRev, 4);
    assert.equal(latest?.data.payload.practiceChange.currentText, "Newest edit");

    clearLocalBlockDraft(storage, "block-uid-1", 3);
    assert.equal(loadLocalBlockDraft(storage, "block-uid-1", 3), null);
    assert.ok(loadLocalBlockDraft(storage, "block-uid-1", 4));

    clearLocalBlockDraftsForUid(storage, "block-uid-1");
    assert.equal(findLatestLocalBlockDraftForUid(storage, "block-uid-1"), null);
    assert.ok(loadLocalBlockDraft(storage, "block-uid-2", 1));
  });

  it("Test 2: threeWayMergeBlock auto-merges non-overlapping multi-axis facetIndex edits and resolves 3 conflict modes", () => {
    const base = makeSampleBlockRow("b-merge-1", 1, "Base text", {
      domains: ["treatment"],
      timeWindowIds: ["tw_0_4_5h"],
    });

    // Cloud edited facetIndex.domains and payload topic
    const cloud = structuredClone(base);
    cloud.rev = 2;
    cloud.data.facetIndex.domains = ["diagnosis", "treatment"];
    cloud.data.payload.practiceChange.topic = "Cloud updated topic";

    // Mine edited facetIndex.timeWindowIds (disjoint multi-axis) + payload topic (colliding!)
    const mine = structuredClone(base.data);
    mine.facetIndex.timeWindowIds = ["tw_0_4_5h", "tw_4_5_24h"];
    mine.payload.practiceChange.topic = "Mine conflicting topic";

    const mergeRes = threeWayMergeBlock(base, mine, cloud);
    // Disjoint multi-axis facet fields merged cleanly without conflict
    assert.deepEqual(mergeRes.merged.facetIndex.domains, ["diagnosis", "treatment"]);
    assert.deepEqual(mergeRes.merged.facetIndex.timeWindowIds, ["tw_0_4_5h", "tw_4_5_24h"]);

    // Overlapping topic surfaced as a payload leaf conflict
    const topicConflict = mergeRes.conflicts.find(
      (c) => c.path === "/payload/practiceChange/topic",
    );
    assert.ok(topicConflict);
    assert.equal(topicConflict.section, "payload");
    assert.equal(topicConflict.myValue, "Mine conflicting topic");
    assert.equal(topicConflict.cloudValue, "Cloud updated topic");

    // 1) use_cloud picks cloud data verbatim & sets expectedRev = cloud.rev
    const useCloud = resolveBlockConflictChoice({
      mode: "use_cloud",
      base,
      mine,
      cloud,
    });
    assert.equal(useCloud.expectedRev, 2);
    assert.equal(useCloud.nextInput.payload.practiceChange.topic, "Cloud updated topic");

    // 2) smart_merge applies user per-field selection + auto-merged facets
    const smartMergeIncomplete = resolveBlockConflictChoice({
      mode: "smart_merge",
      base,
      mine,
      cloud,
    });
    assert.ok(smartMergeIncomplete.unresolvedPaths.includes("/payload/practiceChange/topic"));

    const smartMergeResolved = resolveBlockConflictChoice({
      mode: "smart_merge",
      base,
      mine,
      cloud,
      fieldChoices: { "/payload/practiceChange/topic": "mine" },
    });
    assert.equal(smartMergeResolved.unresolvedPaths.length, 0);
    assert.equal(smartMergeResolved.expectedRev, 2);
    assert.deepEqual(smartMergeResolved.nextInput.facetIndex.domains, ["diagnosis", "treatment"]);
    assert.deepEqual(smartMergeResolved.nextInput.facetIndex.timeWindowIds, [
      "tw_0_4_5h",
      "tw_4_5_24h",
    ]);
    assert.equal(
      smartMergeResolved.nextInput.payload.practiceChange.topic,
      "Mine conflicting topic",
    );

    // 3) force_overwrite replaces cloud with mine at cloud.rev
    const force = resolveBlockConflictChoice({
      mode: "force_overwrite",
      base,
      mine,
      cloud,
    });
    assert.equal(force.expectedRev, 2);
    assert.equal(force.nextInput.payload.practiceChange.topic, "Mine conflicting topic");
    assert.deepEqual(force.nextInput.facetIndex.domains, ["treatment"]);
  });

  it("Test 3: formatBlockRevisionDiffEntries & handleRestoreBlockRevision restore prior revision as draft", async () => {
    const repo = new MemoryNeuroGuideRepo();
    const deps = { repo, isAdmin: true, actor: "reviewer" };

    const v1Data = makeSampleBlockRow("unused", 1, "Version 1 wording").data;
    const created = await handleCreateBlock(deps, { data: v1Data });
    assert.equal(created.status, 201);
    const uid = created.body.row.uid;

    const v2Data = structuredClone(v1Data);
    v2Data.payload.practiceChange.currentText = "Version 2 updated wording";
    v2Data.facetIndex.interventionTags = ["int_tenecteplase", "int_alteplase"];
    const updated = await handleUpdateBlock(deps, uid, {
      data: v2Data,
      expectedRev: 1,
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.row.rev, 2);

    const hist = await handleGetBlockHistory(deps, uid);
    assert.equal(hist.status, 200);
    assert.equal(hist.body.revisions.length, 2);
    const rev2Entry = hist.body.revisions.find((r) => r.rev === 2);
    assert.ok(rev2Entry);

    const diffs = formatBlockRevisionDiffEntries(rev2Entry);
    assert.ok(diffs.some((d) => d.section === "payload" && d.path.includes("currentText")));
    assert.ok(diffs.some((d) => d.section === "facetIndex" && d.path.includes("interventionTags")));

    const restored = await handleRestoreBlockRevision(deps, uid, {
      revisionRev: 1,
      expectedRev: 2,
    });
    assert.equal(restored.status, 200);
    assert.equal(restored.body.row.rev, 3);
    assert.equal(restored.body.row.data.payload.practiceChange.currentText, "Version 1 wording");
    assert.equal(restored.body.row.data.payload.practiceChange.status, "draft");
  });

  it("Test 4: lookupHelpers formatNeuroGuideSyncStatusView, buildNeuroGuideSelectionSearchParams & reconstructCatalogFromSyncGraph", () => {
    assert.deepEqual(
      {
        offline: formatNeuroGuideSyncStatusView({
          syncStatus: "offline",
          lastSyncAt: null,
          lastChangeCount: 0,
          lastSeq: 5,
          isOnline: false,
        }).label,
        updating: formatNeuroGuideSyncStatusView({
          syncStatus: "syncing",
          lastSyncAt: null,
          lastChangeCount: 0,
          lastSeq: 5,
          isOnline: true,
        }),
        error: formatNeuroGuideSyncStatusView({
          syncStatus: "error",
          lastSyncAt: null,
          lastChangeCount: 0,
          lastSeq: 5,
          isOnline: true,
        }).label,
        oneUpdated: formatNeuroGuideSyncStatusView({
          syncStatus: "ready",
          lastSyncAt: "2026-11-18T14:05:00.000Z",
          lastChangeCount: 1,
          lastSeq: 1159,
          isOnline: true,
        }).changeToast,
        multiUpdated: formatNeuroGuideSyncStatusView({
          syncStatus: "ready",
          lastSyncAt: "2026-11-18T14:05:00.000Z",
          lastChangeCount: 4,
          lastSeq: 1162,
          isOnline: true,
        }).changeToast,
      },
      {
        offline: "Offline — showing saved data",
        updating: {
          kind: "updating",
          tone: "updating",
          label: "Updating…",
          primaryText: "Updating…",
          spinning: true,
          ariaLive: "polite",
          changeToast: null,
          updatedBadgeText: null,
        },
        error: "Sync issue — showing saved data",
        oneUpdated: "1 block updated",
        multiUpdated: "4 blocks updated",
      },
    );

    const qs = buildNeuroGuideSelectionSearchParams("?foo=bar&society=ALL", {
      tab: "navigator",
      docId: "aha-ais-2026",
      blockSlug: "rec:aha-ais-2026:0:rec-1",
      society: "AHA/ASA",
    });
    assert.equal(
      qs,
      "foo=bar&society=AHA%2FASA&tab=navigator&doc=aha-ais-2026&block=rec%3Aaha-ais-2026%3A0%3Arec-1",
    );

    const doc = makeSampleGuideline("aha-lookup-2026");
    const graph = decomposeNeuroGuideStoreToGraph({
      guidelines: [doc],
      conferences: [],
      scenarios: [],
      recommendationAtoms: [],
      pivotalTrials: [],
    });

    const protocolsMap = new Map(graph.protocols.map((p) => [p.uid, p]));
    const blocksMap = new Map(graph.blocks.map((b) => [b.uid, b]));
    const derived = deriveNeuroGuideStoreFromGraphSnapshot(
      protocolsMap,
      blocksMap,
      graph.blockLinks,
    );
    const catalog = reconstructCatalogFromSyncGraph(derived);

    assert.equal(catalog.guidelines.length, 1);
    assert.equal(catalog.guidelines[0].allPracticeChanges.length, 3);
    const firstRec = catalog.guidelines[0].allPracticeChanges[0];
    assert.ok(firstRec._blockUid);
    assert.equal(firstRec._blockRev, 1);

    const singleProto = graph.protocols.find((p) => p.metadata.kind === "guideline");
    const directDoc = reconstructGuidelineDocFromGraph(
      singleProto,
      singleProto.blockOrder.map((u) => blocksMap.get(u)),
    );
    assert.equal(directDoc.allPracticeChanges[1].id, "rec-2");

    const resolvedBlock = resolveRecommendationBlockForPracticeChange({
      docId: doc.id,
      recId: "rec-2",
      index: 1,
      blocksByUid: derived.blocksByUid,
      blocksBySlug: derived.blocksBySlug,
      protocolsBySlug: derived.protocolsBySlug,
    });
    assert.equal(resolvedBlock?.uid, directDoc.allPracticeChanges[1]._blockUid);
  });

  it("Test 5: serverAdapter syncGuidelineDocToV2Repo granularly updates ONLY changed blocks and leaves sibling revs intact", async () => {
    const repo = new MemoryNeuroGuideRepo();
    const initialDoc = makeSampleGuideline("aha-granular-2026");

    const firstSync = await syncGuidelineDocToV2Repo(repo, initialDoc, { actor: "tester" });
    assert.equal(firstSync.createdBlockUids.length, 3);
    assert.equal(firstSync.updatedBlockUids.length, 0);

    // Edit ONLY recommendation #2
    const editedDoc = structuredClone(initialDoc);
    editedDoc.allPracticeChanges[1].currentText =
      "Updated LVO Thrombectomy text within extended window.";

    const secondSync = await syncGuidelineDocToV2Repo(repo, editedDoc, { actor: "editor-2" });
    assert.equal(secondSync.createdBlockUids.length, 0);
    assert.equal(secondSync.deletedBlockUids.length, 0);
    assert.equal(secondSync.updatedBlockUids.length, 1);
    assert.equal(secondSync.unchangedBlockCount, 2);

    const loaded = await loadNeuroGuideCatalogFromSyncV2(repo);
    assert.equal(loaded.guidelines.length, 1);
    const [r1, r2, r3] = loaded.guidelines[0].allPracticeChanges;
    assert.equal(r1._blockRev, 1, "Unchanged sibling 1 keeps rev = 1");
    assert.equal(r2._blockRev, 2, "Edited block 2 advances to rev = 2");
    assert.equal(r2.currentText, "Updated LVO Thrombectomy text within extended window.");
    assert.equal(r3._blockRev, 1, "Unchanged sibling 3 keeps rev = 1");

    // Deleting guideline soft-deletes protocol and its 3 owned blocks
    const delRes = await syncDeleteGuidelineInV2Repo(repo, "aha-granular-2026", "admin");
    assert.ok(delRes.deletedProtocolUid);
    assert.equal(delRes.deletedBlockUids.length, 3);
    const afterDel = await loadNeuroGuideCatalogFromSyncV2(repo);
    assert.equal(afterDel.guidelines.length, 0);
  });
});
