import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeRecordContentHashSync } from "../src/lib/neurorx/sync/jsonPatch.ts";
import {
  IDB_DB_NAME,
  IdbLocalStore,
  MemoryLocalStore,
} from "../src/lib/neurorx/sync/localStore.ts";
import { createRealtimeSyncBridge } from "../src/lib/neurorx/sync/realtime.ts";
import { createSyncEngine } from "../src/lib/neurorx/sync/syncEngine.ts";
import {
  computeClientContentHashWebCrypto,
  deriveDrugsFromRows,
  evaluateEffectiveDrug,
} from "../src/hooks/useNeuroRxDrugs.ts";

function buildDrug(id, genericName = id.replace(/-/g, " "), status = "draft") {
  const ref = {
    source_id: "fda-keppra-label",
    locator: "Section 2.1",
    quote: "Initial dose 500 mg twice daily.",
  };
  const drug = {
    id,
    generic_name: genericName,
    tall_man: { value: genericName.toUpperCase(), refs: [{ ...ref, source_id: "fda-tallman-list" }] },
    classes: ["Antiepileptic"],
    subspecialties: ["epilepsy"],
    vn_products: { value: null, refs: [] },
    bhyt: { value: null, refs: [] },
    regimens: [
      {
        id: "focal-seizure",
        indication: "Focal-onset seizures",
        route: "PO",
        dose_text: "500 mg BID",
        refs: [ref],
      },
    ],
    renal_basis: { value: "cg_abw", refs: [ref] },
    hepatic: { value: null, refs: [] },
    black_box: { value: null, refs: [] },
    mg_safety: { value: "safe", refs: [ref] },
    ng_tube: { value: null, refs: [] },
    pgx: { value: null, refs: [] },
    ae_tags: { value: ["sedation_somnolence"], refs: [ref] },
    enzyme_profile: { value: {}, refs: [ref] },
    status,
    verification: {
      verified_by: null,
      verified_at: null,
      content_hash: null,
    },
  };
  if (status === "verified") {
    drug.verification = {
      verified_by: "dr-admin",
      verified_at: "2026-11-14",
      content_hash: computeRecordContentHashSync(drug),
    };
  }
  return drug;
}

function makeSyncRow(uid, slug, overrides = {}) {
  const data = overrides.data ?? buildDrug(slug, overrides.genericName ?? slug);
  const contentHash = overrides.contentHash ?? computeRecordContentHashSync(data);
  return {
    uid,
    slug,
    data,
    contentHash,
    sectionHashes: {},
    rev: overrides.rev ?? 1,
    changeSeq: overrides.changeSeq ?? 1,
    createdAt: "2026-11-14T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-11-14T00:00:00.000Z",
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
            // Wait two microtask ticks so queued requests finish before tx.oncomplete.
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

describe("Phase 5 — Client Sync Engine, LocalStore & Realtime Bridge", () => {
  it("AC5.1 & offline start: emits cached rows before pull resolves/fails cleanly", async () => {
    const cachedRow = makeSyncRow("u-lev", "levetiracetam", {
      genericName: "Levetiracetam",
      changeSeq: 5,
    });
    const store = new MemoryLocalStore({
      rows: new Map([[cachedRow.uid, cachedRow]]),
      lastSeq: 5,
      rootHash: "rh-5",
      eTag: '"nrx-v2-5-rh-5"',
      lastSyncAt: "2026-11-14T09:00:00.000Z",
    });

    const emissions = [];
    let rowsObservedBeforeNetworkFinished = 0;

    const engine = createSyncEngine({
      store,
      fetchChanges: async () => {
        rowsObservedBeforeNetworkFinished = emissions.filter((s) => s.rows.size === 1).length;
        throw new Error("Network offline");
      },
    });

    engine.subscribe((snap) => emissions.push(snap));
    const finalSnap = await engine.start();

    assert.ok(rowsObservedBeforeNetworkFinished >= 1, "local cached rows emitted before pull completed");
    assert.equal(finalSnap.status, "offline");
    assert.equal(finalSnap.lastSeq, 5);
    assert.equal(finalSnap.rows.size, 1);
    assert.equal(finalSnap.rows.get("u-lev")?.slug, "levetiracetam");
    engine.stop();
  });

  it("applies delta inserts/updates and tombstones, then honors 304 Not Modified without store writes", async () => {
    const store = new MemoryLocalStore();
    let commitCount = 0;
    const baseCommit = store.commit.bind(store);
    store.commit = async (...args) => {
      commitCount += 1;
      return baseCommit(...args);
    };

    const rowA = makeSyncRow("u-1", "amantadine", { rev: 1, changeSeq: 1 });
    const rowB = makeSyncRow("u-2", "baclofen", { rev: 1, changeSeq: 2 });
    const rowATombstone = makeSyncRow("u-1", "amantadine", {
      rev: 2,
      changeSeq: 3,
      deletedAt: "2026-11-14T10:00:00.000Z",
    });

    const seenParams = [];
    let phase = 0;

    const engine = createSyncEngine({
      store,
      now: () => new Date("2026-11-14T12:00:00.000Z"),
      fetchChanges: async (params) => {
        seenParams.push(params);
        phase += 1;
        if (phase === 1) {
          return {
            status: 200,
            eTag: '"nrx-v2-2-rh2"',
            body: {
              changes: [rowA, rowB],
              maxSeq: 2,
              rootHash: "rh2",
              hasMore: false,
              reset: false,
            },
          };
        }
        if (phase === 2) {
          return {
            status: 200,
            eTag: '"nrx-v2-3-rh3"',
            body: {
              changes: [rowATombstone],
              maxSeq: 3,
              rootHash: "rh3",
              hasMore: false,
              reset: false,
            },
          };
        }
        return {
          status: 304,
          eTag: '"nrx-v2-3-rh3"',
        };
      },
    });

    const snap1 = await engine.start();
    assert.equal(snap1.status, "ready");
    assert.equal(snap1.rows.size, 2);
    assert.equal(snap1.lastSeq, 2);
    assert.equal(snap1.lastChangeCount, 2);

    const snap2 = await engine.pull();
    assert.equal(snap2.rows.size, 1);
    assert.equal(snap2.rows.has("u-1"), false);
    assert.equal(snap2.rows.get("u-2")?.slug, "baclofen");
    assert.equal(snap2.lastSeq, 3);
    assert.equal(snap2.lastChangeCount, 1);

    const commitsBefore304 = commitCount;
    const snap3 = await engine.pull();
    assert.equal(seenParams[2].since, 3);
    assert.equal(seenParams[2].ifNoneMatch, '"nrx-v2-3-rh3"');
    assert.equal(commitCount, commitsBefore304, "304 Not Modified must not write to LocalStore");
    assert.equal(snap3.status, "ready");
    assert.equal(snap3.lastSeq, 3);
    assert.equal(snap3.lastChangeCount, 0);
    assert.equal(snap3.rows.size, 1);
    engine.stop();
  });

  it("AC5.1 (P4): coalesces 5 concurrent pull() calls into at most 2 fetchChanges invocations", async () => {
    let fetchCalls = 0;
    let notifyFirstStarted;
    const firstStarted = new Promise((resolve) => {
      notifyFirstStarted = resolve;
    });
    let releaseBatchFirst;
    const batchGate = new Promise((resolve) => {
      releaseBatchFirst = resolve;
    });

    const batchEngine = createSyncEngine({
      store: new MemoryLocalStore(),
      fetchChanges: async () => {
        fetchCalls += 1;
        if (fetchCalls === 1) {
          notifyFirstStarted();
          await batchGate;
          return {
            status: 200,
            eTag: '"e2"',
            body: {
              changes: [makeSyncRow("u-2", "topiramate", { rev: 1, changeSeq: 2 })],
              maxSeq: 2,
              rootHash: "rh2",
              hasMore: false,
              reset: false,
            },
          };
        }
        return { status: 304, eTag: '"e2"' };
      },
    });

    const firstCall = batchEngine.pull();
    await firstStarted;
    assert.equal(fetchCalls, 1);

    const trailingFour = [
      batchEngine.pull(),
      batchEngine.pull(),
      batchEngine.pull(),
      batchEngine.pull(),
    ];
    releaseBatchFirst();

    await Promise.all([firstCall, ...trailingFour]);
    assert.ok(fetchCalls <= 2, `expected <= 2 fetches for 5 simultaneous pulls, got ${fetchCalls}`);
    assert.equal(fetchCalls, 2);

    batchEngine.stop();
  });

  it("handles hasMore pagination loop without advancing final rootHash/ETag until last page", async () => {
    const store = new MemoryLocalStore();
    const calls = [];

    const engine = createSyncEngine({
      store,
      fetchChanges: async ({ since }) => {
        calls.push(since);
        if (since === 0) {
          return {
            status: 200,
            eTag: '"nrx-v2-4-rh4"',
            body: {
              changes: [
                makeSyncRow("u-1", "drug-a", { rev: 1, changeSeq: 1 }),
                makeSyncRow("u-2", "drug-b", { rev: 1, changeSeq: 2 }),
              ],
              maxSeq: 4,
              rootHash: "rh4",
              hasMore: true,
              reset: false,
            },
          };
        }
        return {
          status: 200,
          eTag: '"nrx-v2-4-rh4"',
          body: {
            changes: [
              makeSyncRow("u-3", "drug-c", { rev: 1, changeSeq: 3 }),
              makeSyncRow("u-4", "drug-d", { rev: 1, changeSeq: 4 }),
            ],
            maxSeq: 4,
            rootHash: "rh4",
            hasMore: false,
            reset: false,
          },
        };
      },
    });

    const snap = await engine.start();
    assert.deepEqual(calls, [0, 2]);
    assert.equal(snap.status, "ready");
    assert.equal(snap.lastSeq, 4);
    assert.equal(snap.rootHash, "rh4");
    assert.equal(snap.eTag, '"nrx-v2-4-rh4"');
    assert.equal(snap.rows.size, 4);
    assert.equal(snap.lastChangeCount, 4);
    engine.stop();
  });

  it("P13: executes one-shot reset recovery and re-pulls from since=0, halting if reset repeats", async () => {
    const staleRow = makeSyncRow("u-stale", "stale-drug", { rev: 1, changeSeq: 5 });
    const freshRow = makeSyncRow("u-fresh", "fresh-drug", { rev: 1, changeSeq: 20 });

    const store = new MemoryLocalStore({
      rows: new Map([[staleRow.uid, staleRow]]),
      lastSeq: 5,
      rootHash: "rh-5",
      eTag: '"e5"',
    });

    const seenSince = [];
    const engine = createSyncEngine({
      store,
      fetchChanges: async ({ since }) => {
        seenSince.push(since);
        if (since === 5) {
          return {
            status: 200,
            eTag: '"e20"',
            body: {
              changes: [],
              maxSeq: 20,
              rootHash: "rh20",
              hasMore: false,
              reset: true,
            },
          };
        }
        return {
          status: 200,
          eTag: '"e20"',
          body: {
            changes: [freshRow],
            maxSeq: 20,
            rootHash: "rh20",
            hasMore: false,
            reset: false,
          },
        };
      },
    });

    const snap = await engine.start();
    assert.deepEqual(seenSince, [5, 0]);
    assert.equal(snap.status, "ready");
    assert.equal(snap.lastSeq, 20);
    assert.equal(snap.rows.has("u-stale"), false);
    assert.equal(snap.rows.get("u-fresh")?.slug, "fresh-drug");
    engine.stop();

    // Repeated reset in single cycle must not spin forever
    let resetAttempts = 0;
    const loopingEngine = createSyncEngine({
      store: new MemoryLocalStore({ lastSeq: 3 }),
      fetchChanges: async () => {
        resetAttempts += 1;
        return {
          status: 200,
          body: { changes: [], maxSeq: 9, rootHash: "rh9", hasMore: false, reset: true },
        };
      },
    });
    const loopSnap = await loopingEngine.start();
    assert.equal(resetAttempts, 2);
    assert.equal(loopSnap.status, "error");
    loopingEngine.stop();
  });

  it("I7 & AC5.2: handles out-of-order deliveries monotonically and leaves lastSeq unchanged when store.commit rejects", async () => {
    const rowRev2 = makeSyncRow("u-1", "lamotrigine", { rev: 2, changeSeq: 10 });
    const store = new MemoryLocalStore({
      rows: new Map([[rowRev2.uid, rowRev2]]),
      lastSeq: 10,
      rootHash: "rh-10",
      eTag: '"e10"',
    });

    const engine = createSyncEngine({
      store,
      fetchChanges: async () => ({
        status: 200,
        eTag: '"e8-stale"',
        body: {
          changes: [
            makeSyncRow("u-1", "lamotrigine", { rev: 1, changeSeq: 4 }),
            makeSyncRow("u-2", "valproate", { rev: 1, changeSeq: 11 }),
          ],
          maxSeq: 8,
          rootHash: "rh-8-stale",
          hasMore: false,
          reset: false,
        },
      }),
    });

    const snap = await engine.start();
    assert.equal(snap.rows.get("u-1")?.rev, 2, "older rev must not overwrite newer rev");
    assert.equal(snap.rows.get("u-2")?.rev, 1);
    assert.equal(snap.lastSeq, 11);
    assert.equal(snap.rootHash, "rh-10", "outdated maxSeq metadata must not regress rootHash");
    assert.equal(snap.eTag, '"e10"', "outdated maxSeq metadata must not regress eTag");
    engine.stop();

    // AC5.2: store.commit failure rollback
    const failingStore = new MemoryLocalStore({
      rows: new Map([[rowRev2.uid, rowRev2]]),
      lastSeq: 5,
      rootHash: "rh-5",
      eTag: '"e5"',
    });
    failingStore.commit = async () => {
      throw new Error("QuotaExceededError");
    };

    const failEngine = createSyncEngine({
      store: failingStore,
      fetchChanges: async () => ({
        status: 200,
        eTag: '"e6"',
        body: {
          changes: [makeSyncRow("u-2", "valproate", { rev: 1, changeSeq: 6 })],
          maxSeq: 6,
          rootHash: "rh-6",
          hasMore: false,
          reset: false,
        },
      }),
    });

    const failSnap = await failEngine.start();
    assert.equal(failSnap.status, "error");
    assert.equal(failSnap.lastSeq, 5, "failed store.commit must leave lastSeq unchanged");
    assert.equal(failSnap.rows.has("u-2"), false, "failed store.commit must not apply rows in memory");
    failEngine.stop();
  });

  it("I8: applyLocalWrite updates local rows immediately without advancing lastSeq and blocks stale pull resurrections", async () => {
    const initialA = makeSyncRow("u-a", "drug-a", { rev: 1, changeSeq: 10 });
    const initialB = makeSyncRow("u-b", "drug-b", { rev: 1, changeSeq: 10 });
    const store = new MemoryLocalStore({
      rows: new Map([
        [initialA.uid, initialA],
        [initialB.uid, initialB],
      ]),
      lastSeq: 10,
      rootHash: "rh-10",
      eTag: '"e10"',
    });

    let pullTurn = 0;
    const engine = createSyncEngine({
      store,
      fetchChanges: async () => {
        pullTurn += 1;
        return {
          status: 200,
          eTag: '"e11"',
          body: {
            // Simulates a stale payload arriving alongside another tab's new drug-c (seq 11)
            changes: [
              makeSyncRow("u-a", "drug-a", { rev: 1, changeSeq: 10 }),
              makeSyncRow("u-b", "drug-b", { rev: 1, changeSeq: 10, deletedAt: null }),
              makeSyncRow("u-c", "drug-c", { rev: 1, changeSeq: 11 }),
            ],
            maxSeq: 11,
            rootHash: "rh-11",
            hasMore: false,
            reset: false,
          },
        };
      },
    });

    await engine.start();

    // Perform local optimistic writes while resetting turn expectation
    await engine.applyLocalWrite(
      makeSyncRow("u-a", "drug-a", {
        genericName: "Drug A Updated",
        rev: 2,
        changeSeq: 12,
      }),
    );
    await engine.applyLocalWrite(
      makeSyncRow("u-b", "drug-b", {
        rev: 2,
        changeSeq: 13,
        deletedAt: "2026-11-14T12:30:00.000Z",
      }),
    );

    const midSnap = engine.getSnapshot();
    assert.equal(midSnap.lastSeq, 11, "applyLocalWrite must preserve lastSeq");
    assert.equal(midSnap.rows.get("u-a")?.rev, 2);
    assert.equal(midSnap.rows.has("u-b"), false);

    // Pull receives stale u-a rev 1 and stale live u-b rev 1 plus u-c
    const afterPull = await engine.pull();
    assert.equal(pullTurn, 2);
    assert.equal(afterPull.rows.get("u-a")?.rev, 2, "local rev 2 retained over stale rev 1");
    assert.equal(afterPull.rows.has("u-b"), false, "deleted row at rev 2 must not resurrect from rev 1");
    assert.equal(afterPull.rows.get("u-c")?.slug, "drug-c");
    engine.stop();
  });

  it("AC5.4: Realtime bridge ignores irrelevant max_seq signals and debounces rapid bursts", async () => {
    const store = new MemoryLocalStore({ lastSeq: 10, rootHash: "rh-10" });
    let pullFetches = 0;

    const engine = createSyncEngine({
      store,
      fetchChanges: async () => {
        pullFetches += 1;
        return {
          status: 200,
          eTag: '"e14"',
          body: {
            changes: [makeSyncRow("u-14", "drug-14", { rev: 1, changeSeq: 14 })],
            maxSeq: 14,
            rootHash: "rh-14",
            hasMore: false,
            reset: false,
          },
        };
      },
    });

    // Load local snapshot directly via engine.pull() first? Set fetchChanges carefully:
    let subscriptionCallback = null;
    const channelCalls = [];
    const fakeSupabase = {
      channel(name) {
        channelCalls.push(name);
        const ch = {
          on(_type, _filter, cb) {
            subscriptionCallback = cb;
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

    // Hydrate store into engine without triggering a pull using a fresh 304 initial pull
    let initialDone = false;
    const quietEngine = createSyncEngine({
      store,
      fetchChanges: async () => {
        if (!initialDone) {
          initialDone = true;
          return { status: 304, eTag: '"e10"' };
        }
        pullFetches += 1;
        return {
          status: 200,
          eTag: '"e14"',
          body: {
            changes: [makeSyncRow("u-14", "drug-14", { rev: 1, changeSeq: 14 })],
            maxSeq: 14,
            rootHash: "rh-14",
            hasMore: false,
            reset: false,
          },
        };
      },
    });

    await quietEngine.start();

    const bridge = createRealtimeSyncBridge({
      engine: quietEngine,
      supabaseClient: fakeSupabase,
      debounceMs: 60,
      pollIntervalMs: 0,
    });

    assert.deepEqual(channelCalls, ["neurorx-sync"]);
    assert.ok(typeof subscriptionCallback === "function");

    // 1. Stale/equal signals should be ignored without pulling
    subscriptionCallback({ new: { max_seq: 9, root_hash: "rh-old" } });
    subscriptionCallback({ new: { max_seq: 10, root_hash: "rh-10" } });
    await new Promise((r) => setTimeout(r, 90));
    assert.equal(pullFetches, 0, "irrelevant max_seq signals must not trigger pull()");

    // 2. Burst of 4 higher seq signals collapses into 1 debounced pull()
    subscriptionCallback({ new: { max_seq: 11, root_hash: "rh-11" } });
    subscriptionCallback({ new: { max_seq: 12, root_hash: "rh-12" } });
    subscriptionCallback({ new: { max_seq: 13, root_hash: "rh-13" } });
    subscriptionCallback({ new: { max_seq: 14, root_hash: "rh-14" } });

    await new Promise((r) => setTimeout(r, 110));
    assert.equal(pullFetches, 1, "burst of realtime signals must debounce into a single pull");
    assert.equal(quietEngine.getSnapshot().lastSeq, 14);

    bridge.stop();
    quietEngine.stop();
    engine.stop();
  });

  it("P12 & IdbLocalStore: cleans legacy DBs, persists atomically, and falls back to MemoryLocalStore on missing/failing IDB", async () => {
    const nullIdbStore = new IdbLocalStore({ indexedDB: null });
    await nullIdbStore.load();
    assert.equal(nullIdbStore.kind, "memory");

    const brokenIdbStore = new IdbLocalStore({
      indexedDB: {
        open() {
          throw new Error("SecurityError: IDB disabled in private window");
        },
      },
    });
    await brokenIdbStore.load();
    assert.equal(brokenIdbStore.kind, "memory");

    const { factory, deletedNames, dbs } = createFakeIndexedDb({
      existingDatabases: ["neurorx-sync-v0", "unrelated-db"],
    });
    const idbStore = new IdbLocalStore({ indexedDB: factory });
    const row1 = makeSyncRow("u-1", "levetiracetam", { rev: 1, changeSeq: 7 });

    await idbStore.commit([row1], [], 7, "rh7", '"e7"', "2026-11-14T12:00:00.000Z");
    assert.equal(idbStore.kind, "idb");
    assert.deepEqual(deletedNames, ["neurorx-sync-v0"]);
    assert.ok(dbs.has("unrelated-db"));
    assert.ok(dbs.has(IDB_DB_NAME));

    const reloadedStore = new IdbLocalStore({ indexedDB: factory });
    const loaded = await reloadedStore.load();
    assert.equal(loaded.lastSeq, 7);
    assert.equal(loaded.rootHash, "rh7");
    assert.equal(loaded.eTag, '"e7"');
    assert.equal(loaded.rows.get("u-1")?.slug, "levetiracetam");
  });

  it("useNeuroRxDrugs client helpers compute pure-JS & WebCrypto hashes, sort drugs alphabetically, and catch tampered verified rows", async () => {
    const verifiedZ = buildDrug("zonisamide", "Zonisamide", "verified");
    const tamperedM = buildDrug("midazolam", "Midazolam", "verified");
    tamperedM.generic_name = "Midazolam Altered"; // invalidate stored content_hash
    const draftA = buildDrug("amantadine", "Amantadine", "draft");

    const rows = new Map([
      ["u-z", makeSyncRow("u-z", "zonisamide", { data: verifiedZ })],
      ["u-m", makeSyncRow("u-m", "midazolam", { data: tamperedM })],
      ["u-a", makeSyncRow("u-a", "amantadine", { data: draftA })],
      [
        "u-del",
        makeSyncRow("u-del", "deleted-drug", {
          data: buildDrug("deleted-drug", "Deleted"),
          deletedAt: "2026-11-14T12:00:00.000Z",
        }),
      ],
    ]);

    const webHash = await computeClientContentHashWebCrypto(verifiedZ);
    assert.equal(webHash, computeRecordContentHashSync(verifiedZ));

    const verifiedEval = evaluateEffectiveDrug(verifiedZ);
    assert.equal(verifiedEval.effectiveStatus, "verified");
    assert.equal(verifiedEval.hashMatches, true);

    const tamperedEval = evaluateEffectiveDrug(tamperedM);
    assert.equal(tamperedEval.effectiveStatus, "draft");
    assert.equal(tamperedEval.hashMatches, false);

    const { drugs, rowsBySlug } = deriveDrugsFromRows(rows);
    assert.deepEqual(
      drugs.map((d) => d.drug.id),
      ["amantadine", "midazolam", "zonisamide"],
    );
    assert.equal(rowsBySlug.size, 3);
    assert.equal(rowsBySlug.has("deleted-drug"), false);
  });
});
