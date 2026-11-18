import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeBlockContentHash,
  computeBlockSectionHashes,
  computeNeuroGuideRootHash,
  computeProtocolMerkleHash,
  computeProtocolMetadataHash,
} from "../src/lib/neuroguide/sync/blockGraph.ts";
import {
  BLOCKS_DB_NAME,
  IdbBlockLocalStore,
  IdbProtocolLocalStore,
  MemoryBlockLocalStore,
  MemoryProtocolLocalStore,
  PROTOCOLS_DB_NAME,
} from "../src/lib/neuroguide/sync/localStore.ts";
import { createNeuroGuideRealtimeBridge } from "../src/lib/neuroguide/sync/realtime.ts";
import { createNeuroGuideGraphSyncEngine } from "../src/lib/neuroguide/sync/syncEngine.ts";
import { deriveNeuroGuideStoreFromGraphSnapshot } from "../src/hooks/useNeuroGuideSync.ts";

function makeBlockRow(uid, blockKey, overrides = {}) {
  const blockType = overrides.blockType ?? "recommendation";
  const practiceChange = {
    id: blockKey,
    topic: overrides.topic ?? "AIS IVT",
    currentText: overrides.text ?? `Statement for ${blockKey}`,
    cor: "Class I",
    loe: "Level A",
    status: overrides.status ?? "draft",
  };

  const payload =
    blockType === "clinical_scenario"
      ? {
          kind: "clinical_scenario",
          scenario: {
            id: blockKey,
            title: overrides.text ?? blockKey,
            summary: "Scenario summary",
            subspecialty: "Stroke",
          },
        }
      : blockType === "pivotal_trial"
        ? {
            kind: "pivotal_trial",
            trial: {
              id: blockKey,
              acronym: overrides.acronym ?? blockKey,
              title: overrides.text ?? blockKey,
              year: 2024,
              subspecialties: ["Stroke"],
              status: "published",
            },
          }
        : blockType === "recommendation_atom"
          ? {
              kind: "recommendation_atom",
              atom: {
                id: blockKey,
                guidelineId: "aha-ais",
                text: overrides.text ?? blockKey,
              },
            }
          : {
              kind:
                blockType === "shared_clinical_block"
                  ? "shared_clinical_block"
                  : "recommendation",
              practiceChange,
            };

  const data = {
    blockKey,
    blockType,
    payload,
    facetIndex: {
      recId: blockKey,
      subspecialties: ["Stroke"],
      conditionIds: ["ais"],
      domains: ["treatment"],
      diagnosisTags: ["ais"],
      timeWindowIds: ["0-4.5h"],
      interventionTags: ["iv_thrombolysis"],
      direction: "recommended",
      normalizedTier: 1,
      ontologyFacets: null,
      v3Labels: null,
      customLabel: null,
      citedTrialKeys: ["ECASS III"],
      linkedScenarioKeys: [],
      picoKey: null,
      sectionPath: "3.1",
    },
  };

  return {
    uid,
    slug: blockKey.toLowerCase(),
    blockKey,
    blockType,
    data,
    contentHash: overrides.contentHash ?? computeBlockContentHash(data),
    sectionHashes: computeBlockSectionHashes(data),
    rev: overrides.rev ?? 1,
    changeSeq: overrides.changeSeq ?? 1,
    createdAt: "2026-11-18T00:00:00.000Z",
    updatedAt: "2026-11-18T00:00:00.000Z",
    updatedBy: "dr-admin",
    deletedAt: overrides.deletedAt ?? null,
  };
}

function makeProtocolRow(uid, slug, blockRows, overrides = {}) {
  const catalogKind = overrides.catalogKind;
  const metadata = catalogKind
    ? {
        kind: "scenario_catalog",
        catalogKind,
      }
    : {
        kind: "guideline",
        doc: {
          id: slug,
          title: overrides.title ?? `Guideline ${slug}`,
          society: "AHA/ASA",
          year: 2026,
          subspecialty: "Stroke",
          status: "approved",
        },
      };

  const metadataHash = computeProtocolMetadataHash(metadata);
  const blockOrder = overrides.blockOrder ?? blockRows.map((b) => b.uid);
  const protocolHash =
    overrides.protocolHash ??
    computeProtocolMerkleHash(
      metadataHash,
      blockRows.filter((b) => b.deletedAt === null).map((b) => b.contentHash),
    );

  return {
    uid,
    slug,
    protocolType: catalogKind ? "scenario_catalog" : "guideline",
    society: "AHA/ASA",
    year: 2026,
    title: overrides.title ?? `Guideline ${slug}`,
    status: "published",
    subspecialties: ["Stroke"],
    metadata,
    blockOrder,
    metadataHash,
    protocolHash,
    rev: overrides.rev ?? 1,
    changeSeq: overrides.changeSeq ?? 1,
    updatedAt: "2026-11-18T00:00:00.000Z",
    updatedBy: "dr-admin",
    deletedAt: overrides.deletedAt ?? null,
  };
}

function createFakeIndexedDb({ existingDatabases = [] } = {}) {
  const dbs = new Map();
  const deletedNames = [];

  for (const name of existingDatabases) {
    dbs.set(name, { stores: new Map(), version: 1 });
  }

  function createRequest() {
    return {
      result: undefined,
      error: null,
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      onblocked: null,
    };
  }

  const factory = {
    async databases() {
      return Array.from(dbs.keys()).map((name) => ({ name, version: 1 }));
    },
    deleteDatabase(name) {
      const req = createRequest();
      deletedNames.push(name);
      dbs.delete(name);
      queueMicrotask(() => req.onsuccess?.({ target: req }));
      return req;
    },
    open(name, version = 1) {
      const req = createRequest();
      queueMicrotask(() => {
        const isNew = !dbs.has(name);
        if (isNew) {
          dbs.set(name, { stores: new Map(), version });
        }
        const entry = dbs.get(name);
        const db = {
          name,
          version,
          onversionchange: null,
          objectStoreNames: {
            contains(storeName) {
              return entry.stores.has(storeName);
            },
          },
          createObjectStore(storeName, opts = {}) {
            const storeData = {
              keyPath: opts.keyPath ?? "uid",
              records: new Map(),
            };
            entry.stores.set(storeName, storeData);
            return storeData;
          },
          transaction(storeNames) {
            const names = Array.isArray(storeNames) ? storeNames : [storeNames];
            const tx = {
              error: null,
              oncomplete: null,
              onerror: null,
              onabort: null,
              objectStore(storeName) {
                if (!names.includes(storeName)) {
                  throw new Error(`Store ${storeName} not in transaction`);
                }
                const storeData = entry.stores.get(storeName);
                return {
                  get(key) {
                    const opReq = createRequest();
                    opReq.result = storeData.records.get(key);
                    queueMicrotask(() => opReq.onsuccess?.({ target: opReq }));
                    return opReq;
                  },
                  getAll() {
                    const opReq = createRequest();
                    opReq.result = Array.from(storeData.records.values());
                    queueMicrotask(() => opReq.onsuccess?.({ target: opReq }));
                    return opReq;
                  },
                  put(val) {
                    const opReq = createRequest();
                    const key = val[storeData.keyPath];
                    storeData.records.set(key, structuredClone(val));
                    queueMicrotask(() => opReq.onsuccess?.({ target: opReq }));
                    return opReq;
                  },
                  delete(key) {
                    const opReq = createRequest();
                    storeData.records.delete(key);
                    queueMicrotask(() => opReq.onsuccess?.({ target: opReq }));
                    return opReq;
                  },
                  clear() {
                    const opReq = createRequest();
                    storeData.records.clear();
                    queueMicrotask(() => opReq.onsuccess?.({ target: opReq }));
                    return opReq;
                  },
                };
              },
            };
            queueMicrotask(() => queueMicrotask(() => tx.oncomplete?.({ target: tx })));
            return tx;
          },
          close() {},
        };

        req.result = db;
        if (isNew) {
          req.onupgradeneeded?.({ target: req });
        }
        req.onsuccess?.({ target: req });
      });
      return req;
    },
  };

  return { factory, deletedNames, dbs };
}

describe("Phase 8.5 — NeuroGuide Client Sync Engine, 2-Tier LocalStore & Realtime Bridge", () => {
  it("AC8.5.1 & offline start: emits cached protocols + blocks before pull fails cleanly and reconstructs store offline", async () => {
    const bRec = makeBlockRow("b-rec-1", "rec:aha-ais:0", { changeSeq: 4 });
    const bScen = makeBlockRow("b-scen-1", "scen:stroke-ivt", {
      blockType: "clinical_scenario",
      changeSeq: 4,
    });
    const bTrial = makeBlockRow("b-trial-1", "trial:ecass3", {
      blockType: "pivotal_trial",
      acronym: "ECASS III",
      changeSeq: 4,
    });
    const bAtom = makeBlockRow("b-atom-1", "atom:ivt-1", {
      blockType: "recommendation_atom",
      changeSeq: 4,
    });

    const pGuide = makeProtocolRow("p-guide-1", "aha-ais", [bRec], { changeSeq: 5 });
    const pScen = makeProtocolRow("p-scen", "catalog-clinical-scenarios", [bScen], {
      catalogKind: "clinical_scenarios",
      changeSeq: 5,
    });
    const pTrial = makeProtocolRow("p-trial", "catalog-pivotal-trials", [bTrial], {
      catalogKind: "pivotal_trials",
      changeSeq: 5,
    });
    const pAtom = makeProtocolRow("p-atom", "catalog-recommendation-atoms", [bAtom], {
      catalogKind: "recommendation_atoms",
      changeSeq: 5,
    });

    const blockStore = new MemoryBlockLocalStore({
      rows: new Map([
        [bRec.uid, bRec],
        [bScen.uid, bScen],
        [bTrial.uid, bTrial],
        [bAtom.uid, bAtom],
      ]),
      lastSeq: 5,
    });
    const protocolStore = new MemoryProtocolLocalStore({
      rows: new Map([
        [pGuide.uid, pGuide],
        [pScen.uid, pScen],
        [pTrial.uid, pTrial],
        [pAtom.uid, pAtom],
      ]),
      lastSeq: 5,
      rootHash: computeNeuroGuideRootHash([pGuide, pScen, pTrial, pAtom]),
    });

    const seenCachedBeforeOffline = [];
    const engine = createNeuroGuideGraphSyncEngine({
      blockStore,
      protocolStore,
      fetchBlockChanges: async () => {
        throw new Error("Network offline");
      },
      fetchProtocolChanges: async () => {
        throw new Error("Network offline");
      },
    });

    const unsub = engine.subscribe((snap) => {
      if (snap.blocks.size > 0 && snap.protocols.size > 0) {
        seenCachedBeforeOffline.push({
          status: snap.status,
          blockCount: snap.blocks.size,
          protocolCount: snap.protocols.size,
        });
      }
    });

    const finalSnap = await engine.start();
    unsub();

    assert.ok(seenCachedBeforeOffline.length >= 1);
    assert.equal(finalSnap.status, "offline");
    assert.equal(finalSnap.blocks.size, 4);
    assert.equal(finalSnap.protocols.size, 4);

    const view = deriveNeuroGuideStoreFromGraphSnapshot(finalSnap.protocols, finalSnap.blocks);
    assert.equal(view.store.guidelines.length, 1);
    assert.equal(view.store.guidelines[0].allPracticeChanges.length, 1);
    assert.equal(view.store.scenarios.length, 1);
    assert.equal(view.store.pivotalTrials.length, 1);
    assert.equal(view.store.recommendationAtoms.length, 1);
    assert.equal(view.blocksBySlug.get("rec:aha-ais:0")?.uid, bRec.uid);
    assert.equal(view.protocolsBySlug.get("aha-ais")?.uid, pGuide.uid);

    engine.stop();
  });

  it("AC8.5.2: applies delta inserts/updates (including same-rev higher-seq Merkle rehash) and tombstones, then honors 304", async () => {
    const bShared = makeBlockRow("b-shared", "shared:alteplase", {
      blockType: "shared_clinical_block",
      rev: 1,
      changeSeq: 1,
      text: "Old alteplase dosing",
    });
    const bDead = makeBlockRow("b-dead", "rec:dead", { rev: 1, changeSeq: 2 });
    const pGuide1 = makeProtocolRow("p-guide-1", "aha-ais", [bShared, bDead], {
      rev: 1,
      changeSeq: 3,
    });

    const blockStore = new MemoryBlockLocalStore();
    const protocolStore = new MemoryProtocolLocalStore();
    let turn = 0;
    let commitsOnTurn2 = 0;

    const origCommit = blockStore.commit.bind(blockStore);
    blockStore.commit = async (...args) => {
      if (turn >= 2) commitsOnTurn2 += 1;
      return origCommit(...args);
    };

    const bSharedV2 = makeBlockRow("b-shared", "shared:alteplase", {
      blockType: "shared_clinical_block",
      rev: 2,
      changeSeq: 10,
      text: "Updated 0.9 mg/kg dosing",
    });
    const bDeadTombstone = {
      ...bDead,
      rev: 2,
      changeSeq: 11,
      deletedAt: "2026-11-18T01:00:00.000Z",
    };
    const pGuide2 = makeProtocolRow("p-guide-1", "aha-ais", [bSharedV2, bDeadTombstone], {
      rev: 1, // same protocol.rev, higher changeSeq triggered by child block change!
      changeSeq: 11,
    });
    const root2 = computeNeuroGuideRootHash([pGuide2]);

    const engine = createNeuroGuideGraphSyncEngine({
      blockStore,
      protocolStore,
      fetchBlockChanges: async ({ ifNoneMatch }) => {
        if (turn === 0) {
          return {
            status: 200,
            eTag: '"ng-v2-3-r1"',
            body: {
              changes: [bShared, bDead],
              maxSeq: 3,
              rootHash: "r1",
              hasMore: false,
              reset: false,
            },
          };
        }
        if (turn === 1) {
          return {
            status: 200,
            eTag: `"ng-v2-11-${root2}"`,
            body: {
              changes: [bSharedV2, bDeadTombstone],
              maxSeq: 11,
              rootHash: root2,
              hasMore: false,
              reset: false,
            },
          };
        }
        assert.equal(ifNoneMatch, `"ng-v2-11-${root2}"`);
        return { status: 304, eTag: `"ng-v2-11-${root2}"` };
      },
      fetchProtocolChanges: async () => {
        if (turn === 0) {
          return {
            status: 200,
            eTag: '"ng-v2-protocols-3-r1"',
            body: {
              changes: [pGuide1],
              maxSeq: 3,
              rootHash: "r1",
              hasMore: false,
              reset: false,
            },
          };
        }
        if (turn === 1) {
          return {
            status: 200,
            eTag: `"ng-v2-protocols-11-${root2}"`,
            body: {
              changes: [pGuide2],
              maxSeq: 11,
              rootHash: root2,
              hasMore: false,
              reset: false,
            },
          };
        }
        return { status: 304 };
      },
    });

    await engine.start();
    turn = 1;
    const snapAfterDelta = await engine.pull();
    assert.equal(snapAfterDelta.blocks.size, 1);
    assert.equal(
      snapAfterDelta.blocks.get("b-shared")?.data.payload.practiceChange.currentText,
      "Updated 0.9 mg/kg dosing",
    );
    assert.equal(snapAfterDelta.blocks.has("b-dead"), false);
    assert.equal(
      snapAfterDelta.protocols.get("p-guide-1")?.protocolHash,
      pGuide2.protocolHash,
      "same-rev higher-changeSeq protocol hash must converge",
    );

    turn = 2;
    const snapAfter304 = await engine.pull();
    assert.equal(snapAfter304.status, "ready");
    assert.equal(commitsOnTurn2, 0, "304 Not Modified must skip store commits");
    engine.stop();
  });

  it("AC8.5.3 (P4, P13, I8): coalesces concurrent pulls, handles hasMore + reset, and applyLocalBlockWrite updates referencing protocolHash without advancing lastSeq", async () => {
    const b1 = makeBlockRow("b-1", "rec:1", { rev: 1, changeSeq: 2 });
    const b2 = makeBlockRow("b-2", "rec:2", { rev: 1, changeSeq: 4 });
    const p1 = makeProtocolRow("p-1", "g-1", [b1, b2], { rev: 1, changeSeq: 4 });

    let blockFetches = 0;
    const seenSince = [];
    const blockStore = new MemoryBlockLocalStore({ lastSeq: 5 });
    const protocolStore = new MemoryProtocolLocalStore({
      rows: new Map([[p1.uid, p1]]),
      lastSeq: 5,
      rootHash: p1.protocolHash,
    });

    let resetDone = false;
    const engine = createNeuroGuideGraphSyncEngine({
      blockStore,
      protocolStore,
      limit: 1,
      fetchBlockChanges: async ({ since }) => {
        blockFetches += 1;
        seenSince.push(since);
        await new Promise((r) => setTimeout(r, 10));
        if (!resetDone && since === 5) {
          resetDone = true;
          return {
            status: 200,
            eTag: '"ng-v2-20-r"',
            body: { changes: [], maxSeq: 20, rootHash: "r", hasMore: false, reset: true },
          };
        }
        if (since === 0) {
          return {
            status: 200,
            eTag: '"p1"',
            body: { changes: [b1], maxSeq: 20, rootHash: "r", hasMore: true, reset: false },
          };
        }
        return {
          status: 200,
          eTag: '"p2"',
          body: { changes: [b2], maxSeq: 20, rootHash: "r", hasMore: false, reset: false },
        };
      },
      fetchProtocolChanges: async () => ({
        status: 200,
        eTag: '"np20"',
        body: { changes: [p1], maxSeq: 20, rootHash: p1.protocolHash, hasMore: false, reset: false },
      }),
    });

    const results = await Promise.all([
      engine.pull(),
      engine.pull(),
      engine.pull(),
      engine.pull(),
      engine.pull(),
    ]);
    assert.ok(seenSince.slice(0, 3).includes(5));
    assert.ok(seenSince.includes(0));
    assert.equal(blockFetches <= 6, true);
    assert.equal(results[4].blocks.size, 2);
    assert.equal(results[4].lastSeq, 20);

    // Local optimistic block write updates both block and referencing protocolHash without advancing lastSeq
    const b1V2 = makeBlockRow("b-1", "rec:1", {
      rev: 2,
      changeSeq: 21,
      text: "Local edit",
    });
    const afterLocal = await engine.applyLocalBlockWrite(b1V2);
    assert.equal(afterLocal.lastSeq, 20, "applyLocalBlockWrite must not advance lastSeq");
    assert.equal(
      afterLocal.protocols.get("p-1")?.protocolHash,
      computeProtocolMerkleHash(p1.metadataHash, [b1V2.contentHash, b2.contentHash]),
    );
    engine.stop();
  });

  it("AC8.5.4 & P12: Realtime bridge uses neuroguide_sync_state + debounces bursts; IdbLocalStores clean legacy DBs and fall back on missing/failing IDB", async () => {
    const nullBlockIdb = new IdbBlockLocalStore({ indexedDB: null });
    await nullBlockIdb.load();
    assert.equal(nullBlockIdb.kind, "memory");

    const brokenProtoIdb = new IdbProtocolLocalStore({
      indexedDB: {
        open() {
          throw new Error("SecurityError");
        },
      },
    });
    await brokenProtoIdb.load();
    assert.equal(brokenProtoIdb.kind, "memory");

    const { factory, deletedNames, dbs } = createFakeIndexedDb({
      existingDatabases: ["neuroguide-blocks-sync-v0", "neuroguide-protocols-sync-v0", "keep-me"],
    });
    const bIdb = new IdbBlockLocalStore({ indexedDB: factory });
    const pIdb = new IdbProtocolLocalStore({ indexedDB: factory });
    const b1 = makeBlockRow("b-1", "rec:1", { changeSeq: 8 });
    const p1 = makeProtocolRow("p-1", "g-1", [b1], { changeSeq: 8 });

    await bIdb.commit([b1], [], 8, "rh8", '"eb8"', "2026-11-18T00:00:00.000Z");
    await pIdb.commit([p1], [], 8, "rh8", '"ep8"', "2026-11-18T00:00:00.000Z");

    assert.equal(bIdb.kind, "idb");
    assert.equal(pIdb.kind, "idb");
    assert.ok(deletedNames.includes("neuroguide-blocks-sync-v0"));
    assert.ok(deletedNames.includes("neuroguide-protocols-sync-v0"));
    assert.ok(dbs.has("keep-me"));
    assert.ok(dbs.has(BLOCKS_DB_NAME));
    assert.ok(dbs.has(PROTOCOLS_DB_NAME));

    const reloadedBlock = await new IdbBlockLocalStore({ indexedDB: factory }).load();
    const reloadedProto = await new IdbProtocolLocalStore({ indexedDB: factory }).load();
    assert.equal(reloadedBlock.rows.get("b-1")?.slug, "rec:1");
    assert.equal(reloadedProto.rows.get("p-1")?.slug, "g-1");

    // Realtime bridge subscribing to neuroguide_sync_state
    let subscriptionTable = null;
    let subscriptionCb = null;
    const fakeSupabase = {
      channel(name) {
        assert.equal(name, "neuroguide-sync");
        const ch = {
          on(_type, filter, cb) {
            subscriptionTable = filter.table;
            subscriptionCb = cb;
            return ch;
          },
          subscribe() {
            return ch;
          },
        };
        return ch;
      },
      removeChannel() {},
    };

    let pullCount = 0;
    const rtEngine = createNeuroGuideGraphSyncEngine({
      blockStore: new MemoryBlockLocalStore({ lastSeq: 10, rootHash: "rh10" }),
      protocolStore: new MemoryProtocolLocalStore({ lastSeq: 10, rootHash: "rh10" }),
      fetchBlockChanges: async () => {
        pullCount += 1;
        return {
          status: 200,
          eTag: '"ng12"',
          body: { changes: [], maxSeq: 12, rootHash: "rh12", hasMore: false, reset: false },
        };
      },
      fetchProtocolChanges: async () => ({
        status: 200,
        eTag: '"ngp12"',
        body: { changes: [], maxSeq: 12, rootHash: "rh12", hasMore: false, reset: false },
      }),
    });

    await rtEngine.start();
    assert.equal(pullCount, 1);
    pullCount = 0;

    const bridge = createNeuroGuideRealtimeBridge({
      engine: rtEngine,
      supabaseClient: fakeSupabase,
      debounceMs: 50,
      pollIntervalMs: 0,
    });
    assert.equal(subscriptionTable, "neuroguide_sync_state");

    // Ignored stale signal
    subscriptionCb({ new: { max_seq: 11, root_hash: "rh11" } });
    await new Promise((r) => setTimeout(r, 80));
    assert.equal(pullCount, 0);

    // Burst > lastSeq=12 debounces into 1 pull
    subscriptionCb({ new: { max_seq: 13, root_hash: "rh13" } });
    subscriptionCb({ new: { max_seq: 14, root_hash: "rh14" } });
    await new Promise((r) => setTimeout(r, 90));
    assert.equal(pullCount, 1);

    bridge.stop();
    rtEngine.stop();
  });
});
