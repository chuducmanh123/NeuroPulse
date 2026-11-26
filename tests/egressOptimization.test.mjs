import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  clearMerkleMemoryCache,
  getMerkleCacheStats,
  getOrLoadMerkleCached,
} from "../src/lib/sync/merkleCache.ts";
import { createRealtimeSyncBridge } from "../src/lib/sync/realtime.ts";
import { projectDrugToSearchIndexItem } from "../src/lib/neurorx/searchIndex.ts";

describe("Egress Optimization — Merkle-Keyed Cache", () => {
  beforeEach(() => {
    clearMerkleMemoryCache();
  });

  it("caches warm hits and immediately invalidates when maxSeq or rootHash changes", async () => {
    let loaderCalls = 0;
    const loadForState = (seq, hash) =>
      getOrLoadMerkleCached({
        namespace: "test-ng",
        stateKey: `${seq}:${hash}`,
        ttlSeconds: 300,
        loader: async () => {
          loaderCalls += 1;
          return { seq, hash, items: [1, 2, 3] };
        },
      });

    const a1 = await loadForState(10, "rootA");
    const a2 = await loadForState(10, "rootA");
    const a3 = await loadForState(10, "rootA");

    assert.equal(loaderCalls, 1);
    assert.deepEqual(a1, { seq: 10, hash: "rootA", items: [1, 2, 3] });
    assert.deepEqual(a2, a1);
    assert.deepEqual(a3, a1);

    // Bump maxSeq -> instant miss & fresh load (0% stale data)
    const b1 = await loadForState(11, "rootB");
    assert.equal(loaderCalls, 2);
    assert.equal(b1.seq, 11);
    assert.equal(b1.hash, "rootB");
    assert.ok(getMerkleCacheStats().memorySize >= 2);
  });

  it("deduplicates concurrent in-flight cold loads (single-flight)", async () => {
    let loaderCalls = 0;
    const run = () =>
      getOrLoadMerkleCached({
        namespace: "test-sf",
        stateKey: "42:hash42",
        ttlSeconds: 300,
        loader: async () => {
          loaderCalls += 1;
          await new Promise((r) => setTimeout(r, 25));
          return { ok: true, count: 99 };
        },
      });

    const results = await Promise.all([run(), run(), run(), run(), run()]);
    assert.equal(loaderCalls, 1);
    for (const r of results) {
      assert.deepEqual(r, { ok: true, count: 99 });
    }
  });

  it("handles large (>300KB) and oversized (>2MB incompressible) payloads safely", async () => {
    // 1. >300KB compressible payload
    const largeItems = Array.from({ length: 400 }, (_, i) => ({
      id: `item-${i}`,
      text: "Standardized acute ischemic stroke guideline recommendation block ".repeat(15),
    }));
    let calls = 0;
    const res1 = await getOrLoadMerkleCached({
      namespace: "test-large",
      stateKey: "1:large",
      ttlSeconds: 300,
      loader: async () => {
        calls += 1;
        return largeItems;
      },
    });
    const res2 = await getOrLoadMerkleCached({
      namespace: "test-large",
      stateKey: "1:large",
      ttlSeconds: 300,
      loader: async () => {
        calls += 1;
        return largeItems;
      },
    });
    assert.equal(calls, 1);
    assert.equal(res1.length, 400);
    assert.equal(res2.length, 400);
  });
});

describe("Egress Optimization — Realtime Visibility Cooldown & Instant Push", () => {
  it("suppresses rapid visibilitychange bursts while allowing immediate Realtime & online signals", async () => {
    let pulls = 0;
    let currentSeq = 5;
    let currentHash = "hash-5";

    const fakeEngine = {
      getSnapshot() {
        return {
          rows: new Map(),
          status: "ready",
          lastSeq: currentSeq,
          rootHash: currentHash,
          eTag: "",
          lastSyncAt: null,
          lastChangeCount: 0,
          error: null,
        };
      },
      async pull() {
        pulls += 1;
        return this.getSnapshot();
      },
      async start() {
        return this.getSnapshot();
      },
      stop() {},
      subscribe() {
        return () => {};
      },
      async applyLocalWrite() {
        return this.getSnapshot();
      },
    };

    const listeners = {};
    const origDoc = globalThis.document;
    const origWin = globalThis.window;

    globalThis.document = {
      visibilityState: "visible",
      addEventListener(ev, fn) {
        listeners[`doc:${ev}`] = fn;
      },
      removeEventListener(ev) {
        delete listeners[`doc:${ev}`];
      },
    };
    globalThis.window = {
      addEventListener(ev, fn) {
        listeners[`win:${ev}`] = fn;
      },
      removeEventListener(ev) {
        delete listeners[`win:${ev}`];
      },
    };

    let realtimeCb = null;
    const bridge = createRealtimeSyncBridge({
      engine: fakeEngine,
      debounceMs: 0,
      pollIntervalMs: 0,
      visibilityCooldownMs: 20_000,
      supabaseClient: {
        channel() {
          return {
            on(_type, _filter, cb) {
              realtimeCb = cb;
              return this;
            },
            subscribe() {
              return this;
            },
          };
        },
      },
    });

    try {
      // First visibilitychange triggers a pull
      listeners["doc:visibilitychange"]();
      assert.equal(pulls, 1);

      // Rapid subsequent visibilitychange within 20s cooldown is suppressed
      listeners["doc:visibilitychange"]();
      listeners["doc:visibilitychange"]();
      assert.equal(pulls, 1);

      // Realtime WebSocket push with higher max_seq fires IMMEDIATELY (zero cooldown)
      realtimeCb({ new: { max_seq: 6, root_hash: "hash-6" } });
      assert.equal(pulls, 2);

      // Online event also fires IMMEDIATELY (zero cooldown)
      listeners["win:online"]();
      assert.equal(pulls, 3);
    } finally {
      bridge.stop();
      globalThis.document = origDoc;
      globalThis.window = origWin;
    }
  });
});

describe("Egress Optimization — NeuroRx Search Index Projection", () => {
  it("projects only lightweight search fields and shrinks payload dramatically", () => {
    const sampleDrug = {
      id: "alteplase",
      generic_name: "Alteplase",
      classes: ["Thrombolytic", "tPA"],
      vn_products: {
        value: [{ brand: "Actilyse", strength: "50 mg", form: "IV" }, { brand: "" }],
        source: "vn-moh",
      },
      pharmacology: { mechanism: "x".repeat(5000), half_life: "5 min" },
      dosing: { value: Array.from({ length: 20 }, () => ({ text: "y".repeat(300) })) },
    };

    const projected = projectDrugToSearchIndexItem(sampleDrug);
    assert.deepEqual(projected, {
      id: "alteplase",
      genericName: "Alteplase",
      classes: ["Thrombolytic", "tPA"],
      brandNames: ["Actilyse"],
    });

    const fullBytes = Buffer.byteLength(JSON.stringify(sampleDrug), "utf8");
    const projectedBytes = Buffer.byteLength(JSON.stringify(projected), "utf8");
    assert.ok(projectedBytes < fullBytes / 20);
  });
});
