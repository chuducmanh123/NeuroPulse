import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { createClient } from "@supabase/supabase-js";
import {
  deriveNeuroGuideStoreFromGraphSnapshot,
} from "../src/hooks/useNeuroGuideSync.ts";
import {
  clearLocalBlockDraftsForUid,
  loadLocalBlockDraft,
  resolveBlockConflictChoice,
  saveLocalBlockDraft,
} from "../src/lib/neuroguide/sync/adminHelpers.ts";
import {
  computeBlockContentHash,
  computeBlockSectionHashes,
  decomposeNeuroGuideStoreToGraph,
  queryBlocksByOverlappingFacets,
} from "../src/lib/neuroguide/sync/blockGraph.ts";
import {
  handleCreateBlock,
  handleDeleteBlock,
  handleDeleteProtocol,
  handleGetChanges,
  handleUpdateBlock,
  handleUpsertProtocol,
} from "../src/lib/neuroguide/sync/handlers.ts";
import {
  MemoryBlockLocalStore,
  MemoryProtocolLocalStore,
} from "../src/lib/neuroguide/sync/localStore.ts";
import {
  formatNeuroGuideSyncStatusView,
  reconstructCatalogFromSyncGraph,
} from "../src/lib/neuroguide/sync/lookupHelpers.ts";
import { createNeuroGuideRealtimeBridge } from "../src/lib/neuroguide/sync/realtime.ts";
import { MemoryNeuroGuideRepo } from "../src/lib/neuroguide/sync/repoMemory.ts";
import { SupabaseNeuroGuideRepo } from "../src/lib/neuroguide/sync/repoSupabase.ts";
import { createNeuroGuideGraphSyncEngine } from "../src/lib/neuroguide/sync/syncEngine.ts";

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

function createFakeRealtimeHub() {
  const subscribers = [];
  const client = {
    channel() {
      const ch = {
        on(_type, _filter, cb) {
          subscribers.push(cb);
          return ch;
        },
        subscribe(cb) {
          if (cb) cb("SUBSCRIBED");
          return ch;
        },
        unsubscribe() {},
      };
      return ch;
    },
    removeChannel() {},
  };
  return {
    client,
    emit(newRow) {
      for (const cb of subscribers) {
        cb({ new: newRow });
      }
    },
  };
}

function makeTestBlockData(blockKey, overrides = {}) {
  const text = overrides.currentText ?? "Initial clinical recommendation wording.";
  const topic = overrides.topic ?? "IVT Window";
  return {
    blockKey,
    blockType: "recommendation",
    payload: {
      kind: "recommendation",
      practiceChange: {
        id: overrides.recId ?? "rec-e2e-1",
        category: "Reperfusion",
        topic,
        changeType: "UPGRADED",
        currentText: text,
        currentGrade: "Class I, Level A",
        drivingTrials: ["ACT"],
      },
    },
    facetIndex: {
      recId: overrides.recId ?? "rec-e2e-1",
      subspecialties: ["Stroke"],
      conditionIds: ["cond_ischemic_stroke"],
      domains: overrides.domains ?? ["treatment"],
      diagnosisTags: [],
      timeWindowIds: overrides.timeWindowIds ?? ["tw_0_4_5h"],
      interventionTags: overrides.interventionTags ?? ["int_tenecteplase"],
      direction: "recommended",
      normalizedTier: 1,
      ontologyFacets: null,
      v3Labels: {
        subspecialties: ["Stroke"],
        conditionIds: ["cond_ischemic_stroke"],
        domains: overrides.domains ?? ["treatment"],
        diagnosisTags: [],
        timeWindowIds: overrides.timeWindowIds ?? ["tw_0_4_5h"],
        interventionTags: overrides.interventionTags ?? ["int_tenecteplase"],
        direction: "recommended",
      },
      customLabel: null,
      citedTrialKeys: ["ACT"],
      linkedScenarioKeys: ["scen-1"],
      picoKey: null,
      sectionPath: "Reperfusion / IVT",
    },
  };
}

function createInProcessFetchers(repo) {
  let blockNetCount = 0;
  let protoNetCount = 0;

  const fetchBlockChanges = async ({ since, limit, eTag }) => {
    blockNetCount += 1;
    const res = await handleGetChanges(
      { repo },
      { sinceParam: since, limitParam: limit, tierParam: "blocks", ifNoneMatch: eTag },
    );
    return {
      status: res.status,
      eTag: res.headers.ETag ?? null,
      body: res.body,
    };
  };

  const fetchProtocolChanges = async ({ since, limit, eTag }) => {
    protoNetCount += 1;
    const res = await handleGetChanges(
      { repo },
      { sinceParam: since, limitParam: limit, tierParam: "protocols", ifNoneMatch: eTag },
    );
    return {
      status: res.status,
      eTag: res.headers.ETag ?? null,
      body: res.body,
    };
  };

  return {
    fetchBlockChanges,
    fetchProtocolChanges,
    getCounts() {
      return { blockNetCount, protoNetCount, total: blockNetCount + protoNetCount };
    },
    resetCounts() {
      blockNetCount = 0;
      protoNetCount = 0;
    },
  };
}

function createE2EGrammarSeed() {
  return {
    guidelines: [
      {
        id: "aha-seed-e2e-2026",
        society: "AHA/ASA",
        year: 2026,
        title: "2026 AHA/ASA E2E Seed Guideline",
        officialUrl: "https://example.org",
        journalTarget: "Stroke",
        documentType: "Clinical Practice Guideline",
        publishDate: "2026-01-01",
        subspecialty: "Stroke",
        subspecialties: ["Stroke"],
        executiveSummary: "Seed summary",
        linkedScenarioIds: ["scen-1"],
        status: "approved",
        allPracticeChanges: [
          {
            id: "seed-rec-1",
            category: "Reperfusion",
            topic: "Tenecteplase",
            changeType: "UPGRADED",
            currentText: "Tenecteplase 0.25 mg/kg within 4.5h",
            currentGrade: "Class I, Level A",
            cor: "1",
            loe: "A",
            drivingTrials: ["ACT"],
          },
        ],
      },
    ],
    conferences: [],
    scenarios: [],
    recommendationAtoms: [],
    pivotalTrials: [],
  };
}

async function createSeededMemoryRepo() {
  const repo = new MemoryNeuroGuideRepo();
  const seed = createE2EGrammarSeed();
  const graph = decomposeNeuroGuideStoreToGraph(seed);
  for (const b of graph.blocks) {
    await repo.createBlock(b.data, b.contentHash, b.sectionHashes, "seed", {
      uid: b.uid,
      skipRootRehash: true,
    });
  }
  for (const p of graph.protocols) {
    await repo.upsertProtocol(
      {
        uid: p.uid,
        slug: p.slug,
        protocolType: p.protocolType,
        society: p.society,
        year: p.year,
        title: p.title,
        status: p.status,
        subspecialties: p.subspecialties,
        metadata: p.metadata,
        blockOrder: p.blockOrder,
        metadataHash: p.metadataHash,
        edges: graph.protocolBlocks.filter((e) => e.protocolUid === p.uid),
        skipRootRehash: true,
      },
      "seed",
    );
  }
  await repo.recomputeRootHash();
  return repo;
}

function runNeuroGuideB1B6Matrix(label, makeRepo, options) {
  describe(`NeuroGuide Phase 8.6 E2E Regression (B1–B6) — ${label}`, () => {
    const slugPrefix = options.slugPrefix;
    let repo;

    if (options.afterAll) {
      after(async () => {
        await options.afterAll();
      });
    }

    it("executes scenarios B1 through B6 deterministically across Sync v2, Realtime, 3-way merge & offline store", async () => {
      repo = await makeRepo();
      const adminDeps = { repo, isAdmin: true, actor: "ng-e2e-admin" };

      const hub = createFakeRealtimeHub();
      const fetchersA = createInProcessFetchers(repo);
      const fetchersB = createInProcessFetchers(repo);

      const blockStoreA = new MemoryBlockLocalStore();
      const protoStoreA = new MemoryProtocolLocalStore();
      const blockStoreB = new MemoryBlockLocalStore();
      const protoStoreB = new MemoryProtocolLocalStore();

      const engineA = createNeuroGuideGraphSyncEngine({
        blockStore: blockStoreA,
        protocolStore: protoStoreA,
        fetchBlockChanges: fetchersA.fetchBlockChanges,
        fetchProtocolChanges: fetchersA.fetchProtocolChanges,
      });
      const engineB = createNeuroGuideGraphSyncEngine({
        blockStore: blockStoreB,
        protocolStore: protoStoreB,
        fetchBlockChanges: fetchersB.fetchBlockChanges,
        fetchProtocolChanges: fetchersB.fetchProtocolChanges,
      });

      const bridgeB = createNeuroGuideRealtimeBridge({
        engine: engineB,
        supabaseClient: hub.client,
        debounceMs: 25,
        pollIntervalMs: 0,
      });

      try {
        // Cold start sync for Device A & Device B
        await Promise.all([engineA.start(), engineB.start()]);

        // Create E2E block + parent protocol
        const e2eKey = `${slugPrefix}rec-b1`;
        const b1InitRes = await handleCreateBlock(adminDeps, {
          data: makeTestBlockData(e2eKey, {
            currentText: "B1 initial statement",
          }),
        });
        assert.equal(b1InitRes.status, 201);
        const targetUid = b1InitRes.body.row.uid;

        const protoSlug = `${slugPrefix}proto-b1`;
        const pInitRes = await handleUpsertProtocol(adminDeps, {
          slug: protoSlug,
          protocolType: "guideline",
          society: "AHA/ASA",
          year: 2026,
          title: "E2E B1 Protocol",
          status: "approved",
          subspecialties: ["Stroke"],
          metadata: {
            kind: "guideline",
            doc: {
              id: protoSlug,
              society: "AHA/ASA",
              year: 2026,
              title: "E2E B1 Protocol",
              officialUrl: "https://example.org",
              journalTarget: "Stroke",
              documentType: "Clinical Practice Guideline",
              publishDate: "2026-01-01",
              subspecialty: "Stroke",
              subspecialties: ["Stroke"],
              executiveSummary: "E2E B1 Protocol summary",
              linkedScenarioIds: [],
            },
          },
          blockOrder: [targetUid],
        });
        assert.equal(pInitRes.status, 200);
        const protoUid = pInitRes.body.row.uid;

        await Promise.all([engineA.pull(), engineB.pull()]);

        // -------------------------------------------------------------------
        // B1: Device A edits block -> Realtime pushes to Device B (< 3s, 0 F5)
        // -------------------------------------------------------------------
        const b1EditedData = makeTestBlockData(e2eKey, {
          currentText: "B1 updated via Device A realtime",
          domains: ["diagnosis", "treatment"],
        });
        const b1UpdRes = await handleUpdateBlock(adminDeps, targetUid, {
          expectedRev: 1,
          data: b1EditedData,
        });
        assert.equal(b1UpdRes.status, 200);
        assert.equal(b1UpdRes.body.row.rev, 2);

        const stateAfterB1 = await repo.getSyncState();
        hub.emit({ max_seq: stateAfterB1.maxSeq, root_hash: stateAfterB1.rootHash });

        // Wait for debounced realtime pull on Device B (< 3s)
        const waitStart = Date.now();
        while (Date.now() - waitStart < 2500) {
          const snapB = engineB.getSnapshot();
          if (snapB.blocks.get(targetUid)?.rev === 2) break;
          await new Promise((r) => setTimeout(r, 20));
        }
        const snapBAfterB1 = engineB.getSnapshot();
        assert.equal(
          snapBAfterB1.blocks.get(targetUid)?.data.payload.practiceChange.currentText,
          "B1 updated via Device A realtime",
        );
        assert.equal(snapBAfterB1.rootHash, stateAfterB1.rootHash);
        const b1Badge = formatNeuroGuideSyncStatusView({
          syncStatus: snapBAfterB1.status,
          lastSyncAt: snapBAfterB1.lastSyncAt,
          lastChangeCount: snapBAfterB1.blockChangeCount,
          lastSeq: snapBAfterB1.lastSeq,
          isOnline: true,
        });
        assert.equal(b1Badge.changeToast, "1 block updated");

        // -------------------------------------------------------------------
        // B2: Update rev 2 -> rev 3 persists across 3 warm reloads + cold start
        // -------------------------------------------------------------------
        const b2EditedData = makeTestBlockData(e2eKey, {
          currentText: "B2 rev 3 durable wording",
        });
        const b2UpdRes = await handleUpdateBlock(adminDeps, targetUid, {
          expectedRev: 2,
          data: b2EditedData,
        });
        assert.equal(b2UpdRes.status, 200);
        assert.equal(b2UpdRes.body.row.rev, 3);

        for (let reload = 0; reload < 3; reload++) {
          const warmEngine = createNeuroGuideGraphSyncEngine({
            blockStore: blockStoreB,
            protocolStore: protoStoreB,
            fetchBlockChanges: fetchersB.fetchBlockChanges,
            fetchProtocolChanges: fetchersB.fetchProtocolChanges,
          });
          const warmSnap = await warmEngine.start();
          assert.equal(warmSnap.blocks.get(targetUid)?.rev, 3);
          assert.equal(
            warmSnap.blocks.get(targetUid)?.data.payload.practiceChange.currentText,
            "B2 rev 3 durable wording",
          );
          warmEngine.stop();
        }

        const coldEngine = createNeuroGuideGraphSyncEngine({
          blockStore: new MemoryBlockLocalStore(),
          protocolStore: new MemoryProtocolLocalStore(),
          fetchBlockChanges: fetchersB.fetchBlockChanges,
          fetchProtocolChanges: fetchersB.fetchProtocolChanges,
        });
        const coldSnap = await coldEngine.start();
        assert.equal(coldSnap.blocks.get(targetUid)?.rev, 3);
        coldEngine.stop();

        // -------------------------------------------------------------------
        // B3: Soft delete creates tombstone, cascades protocol rehash & incognito sync
        // -------------------------------------------------------------------
        const delRes = await handleDeleteBlock(adminDeps, targetUid, {
          expectedRevParam: 3,
        });
        assert.equal(delRes.status, 200);
        assert.ok(delRes.body.row.deletedAt !== null);

        await engineA.pull();
        await engineB.pull();
        const derivedB = deriveNeuroGuideStoreFromGraphSnapshot(
          engineB.getSnapshot().protocols,
          engineB.getSnapshot().blocks,
        );
        const protoB = derivedB.protocolsByUid.get(protoUid);
        assert.ok(protoB);
        const catB = reconstructCatalogFromSyncGraph(derivedB);
        const reconstructedB = catB.guidelines.find((g) => g.id === protoSlug);
        assert.equal(reconstructedB?.allPracticeChanges.length, 0);

        const incognitoEngine = createNeuroGuideGraphSyncEngine({
          blockStore: new MemoryBlockLocalStore(),
          protocolStore: new MemoryProtocolLocalStore(),
          fetchBlockChanges: fetchersB.fetchBlockChanges,
          fetchProtocolChanges: fetchersB.fetchProtocolChanges,
        });
        const incSnap = await incognitoEngine.start();
        assert.equal(incSnap.blocks.get(targetUid)?.deletedAt !== null, true);
        incognitoEngine.stop();

        // -------------------------------------------------------------------
        // B4: Recreate same blockKey after soft delete assigns fresh UUID & rev 1
        // -------------------------------------------------------------------
        const b4CreateRes = await handleCreateBlock(adminDeps, {
          data: makeTestBlockData(e2eKey, {
            currentText: "Recreated after tombstone",
          }),
        });
        assert.equal(b4CreateRes.status, 201);
        const recreatedUid = b4CreateRes.body.row.uid;
        assert.notEqual(recreatedUid, targetUid);
        assert.equal(b4CreateRes.body.row.rev, 1);
        assert.equal(b4CreateRes.body.row.slug, e2eKey.toLowerCase());

        // -------------------------------------------------------------------
        // B5: Warm boot < 150ms, 304 Not Modified on unchanged poll, 0-network facet query
        // -------------------------------------------------------------------
        const tBootStart = performance.now();
        const warmCacheEngine = createNeuroGuideGraphSyncEngine({
          blockStore: blockStoreB,
          protocolStore: protoStoreB,
          fetchBlockChanges: async () => ({ status: 304, eTag: null, body: null }),
          fetchProtocolChanges: async () => ({ status: 304, eTag: null, body: null }),
        });
        const warmBootSnap = await warmCacheEngine.start();
        const tBootMs = performance.now() - tBootStart;
        assert.ok(tBootMs < 150, `Expected warm boot < 150ms, got ${tBootMs.toFixed(2)}ms`);
        assert.equal(warmBootSnap.status, "ready");
        warmCacheEngine.stop();

        await engineB.pull();
        fetchersB.resetCounts();
        const unchangedPull = await engineB.pull();
        assert.equal(unchangedPull.status, "ready");

        // Local 0-network multi-axis facet lookup
        const derivedForLookup = deriveNeuroGuideStoreFromGraphSnapshot(
          unchangedPull.protocols,
          unchangedPull.blocks,
        );
        const qRes = queryBlocksByOverlappingFacets(derivedForLookup.graph, {
          domains: ["treatment"],
          timeWindowIds: ["tw_0_4_5h"],
        });
        assert.ok(qRes.blocks.length >= 1);
        assert.equal(fetchersB.getCounts().total, 2, "only unchanged pull used network, queryFacets used 0");

        // -------------------------------------------------------------------
        // B6: 409 REV_CONFLICT preserves draft -> Smart Merge rev=3 -> clears draft
        // -------------------------------------------------------------------
        const storageTab2 = createMemoryStorage();
        const baseAtRev1 = b4CreateRes.body.row;
        const tab2Mine = makeTestBlockData(e2eKey, {
          currentText: "Recreated after tombstone",
          domains: ["treatment"],
          timeWindowIds: ["tw_0_4_5h", "tw_4_5_9h"],
        });
        saveLocalBlockDraft(storageTab2, {
          uid: recreatedUid,
          baseRev: 1,
          savedAt: "2026-11-18T14:00:00.000Z",
          data: tab2Mine,
        });

        // Tab 1 saves non-overlapping domain + payload update -> rev 2
        const tab1Edit = makeTestBlockData(e2eKey, {
          currentText: "Tab 1 updated text at rev 2",
          domains: ["diagnosis", "treatment"],
          timeWindowIds: ["tw_0_4_5h"],
        });
        const tab1Res = await handleUpdateBlock(adminDeps, recreatedUid, {
          expectedRev: 1,
          data: tab1Edit,
        });
        assert.equal(tab1Res.status, 200);
        assert.equal(tab1Res.body.row.rev, 2);

        // Tab 2 saves stale expectedRev=1 -> 409 REV_CONFLICT, draft preserved
        const conflictRes = await handleUpdateBlock(adminDeps, recreatedUid, {
          expectedRev: 1,
          data: tab2Mine,
        });
        assert.equal(conflictRes.status, 409);
        assert.equal(conflictRes.body.code, "REV_CONFLICT");
        assert.equal(conflictRes.body.currentRev, 2);
        assert.ok(loadLocalBlockDraft(storageTab2, recreatedUid, 1));

        // Smart merge combines Tab 1 payload + domains with Tab 2 timeWindowIds
        const resolved = resolveBlockConflictChoice({
          mode: "smart_merge",
          base: baseAtRev1,
          mine: tab2Mine,
          cloud: conflictRes.body.current,
        });
        assert.equal(resolved.unresolvedPaths.length, 0);
        assert.equal(resolved.expectedRev, 2);

        const mergedSave = await handleUpdateBlock(adminDeps, recreatedUid, {
          expectedRev: resolved.expectedRev,
          data: resolved.nextInput,
        });
        assert.equal(mergedSave.status, 200);
        assert.equal(mergedSave.body.row.rev, 3);
        assert.equal(
          mergedSave.body.row.data.payload.practiceChange.currentText,
          "Tab 1 updated text at rev 2",
        );
        assert.deepEqual(mergedSave.body.row.data.facetIndex.domains, [
          "diagnosis",
          "treatment",
        ]);
        assert.deepEqual(mergedSave.body.row.data.facetIndex.timeWindowIds, [
          "tw_0_4_5h",
          "tw_4_5_9h",
        ]);

        // Clear draft strictly on HTTP 200
        clearLocalBlockDraftsForUid(storageTab2, recreatedUid);
        assert.equal(loadLocalBlockDraft(storageTab2, recreatedUid, 1), null);

        // Clean up E2E protocol from Memory/Live repo
        const latestProto = await repo.getProtocolByUid(protoUid);
        if (latestProto && latestProto.deletedAt === null) {
          await handleDeleteProtocol(adminDeps, protoUid, {
            expectedRevParam: latestProto.rev,
          });
        }
        const latestB4 = await repo.getBlockByUid(recreatedUid);
        if (latestB4 && latestB4.deletedAt === null) {
          await handleDeleteBlock(adminDeps, recreatedUid, {
            expectedRevParam: latestB4.rev,
          });
        }
      } finally {
        bridgeB.stop();
        engineA.stop();
        engineB.stop();
      }
    });
  });
}

runNeuroGuideB1B6Matrix(
  "MemoryNeuroGuideRepo (2-Tier Merkle Graph + Sync Engine)",
  createSeededMemoryRepo,
  { slugPrefix: "zz-ng-e2e-" },
);

function loadEnvLocalIfMissing() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return;
  }
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;

  for (const rawLine of fs.readFileSync(envPath, "utf-8").split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

function getLiveAdminClient() {
  loadEnvLocalIfMissing();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase URL or SUPABASE_SERVICE_ROLE_KEY for NEUROGUIDE_SYNC_IT=1");
  }
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}

const EXPECTED_LIVE_ROOT_HASH =
  "bf52b4c6c3526015fdad729a8623b3d6e84b354526928d3adf178ec031e73cc7";

async function cleanupLiveNeuroGuideE2ERows(prefixPattern = "zz-ng-e2e-%") {
  const admin = getLiveAdminClient();
  const { error: protoDelErr } = await admin
    .from("neuroguide_protocols")
    .delete()
    .like("slug", prefixPattern);
  if (protoDelErr) throw protoDelErr;

  const { error: blockDelErr } = await admin
    .from("neuroguide_content_blocks")
    .delete()
    .like("slug", prefixPattern);
  if (blockDelErr) throw blockDelErr;

  const repo = new SupabaseNeuroGuideRepo({ client: admin });
  const rootHash = await repo.recomputeRootHash();
  const [liveProtocols, edges, links] = await Promise.all([
    repo.listLiveProtocols(),
    repo.listProtocolEdges(),
    repo.listBlockLinks(),
  ]);

  assert.equal(liveProtocols.length, 22, "Live protocols count must restore to 22");
  assert.equal(edges.length, 1112, "Live protocol-block edges must restore to 1112");
  assert.equal(links.length, 4878, "Live cross-link edges must restore to 4878");
  assert.equal(
    rootHash,
    EXPECTED_LIVE_ROOT_HASH,
    `Expected live rootHash=${EXPECTED_LIVE_ROOT_HASH}, got ${rootHash}`,
  );
}

if (process.env.NEUROGUIDE_SYNC_IT === "1") {
  const livePrefix = `zz-ng-e2e-${Date.now()}-`;
  runNeuroGuideB1B6Matrix(
    "SupabaseNeuroGuideRepo (Live Production RPCs + 22 Protocols / 1112 Blocks)",
    async () => {
      await cleanupLiveNeuroGuideE2ERows("zz-ng-e2e-%");
      loadEnvLocalIfMissing();
      return new SupabaseNeuroGuideRepo();
    },
    {
      slugPrefix: livePrefix,
      afterAll: async () => {
        await cleanupLiveNeuroGuideE2ERows("zz-ng-e2e-%");
      },
    },
  );
}
