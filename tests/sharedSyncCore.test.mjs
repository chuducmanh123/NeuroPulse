import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyChanges } from "../src/lib/sync/applyChanges.ts";
import { MemoryLocalStore, IdbLocalStore } from "../src/lib/sync/localStore.ts";
import { createSyncEngine } from "../src/lib/sync/syncEngine.ts";
import { createRealtimeSyncBridge } from "../src/lib/sync/realtime.ts";
import { RepoError } from "../src/lib/sync/repo.ts";

describe("Phase 8 — Shared Multi-Collection Sync Core (src/lib/sync/)", () => {
  it("isolates collections (neurorx_drugs vs neuroguide_blocks) in MemoryLocalStore and IdbLocalStore metadata", () => {
    const idbNeuroRx = new IdbLocalStore({ collection: "neurorx", indexedDB: null });
    const idbNeuroGuide = new IdbLocalStore({ collection: "neuroguide_blocks", indexedDB: null });

    assert.equal(idbNeuroRx.dbName, "neurorx-sync-v1");
    assert.equal(idbNeuroRx.recordsStoreName, "drugs");
    assert.equal(idbNeuroGuide.dbName, "neuroguide_blocks-sync-v1");
    assert.equal(idbNeuroGuide.recordsStoreName, "records");

    const err = new RepoError("REV_CONFLICT", "Version mismatch", { currentRev: 4 });
    assert.equal(err.code, "REV_CONFLICT");
    assert.equal(err.currentRev, 4);
  });

  it("runs independent parameterized SyncEngine + RealtimeSyncBridge instances per collection", async () => {
    const storeBlocks = new MemoryLocalStore({ collection: "neuroguide_blocks" });
    const rowsOnServer = [
      {
        uid: "blk-1",
        slug: "shared-alteplase-dosing",
        data: { title: "IV Alteplase", body: "0.9 mg/kg max 90 mg" },
        contentHash: "a".repeat(64),
        sectionHashes: {},
        rev: 1,
        changeSeq: 1,
        updatedAt: "2026-11-18T00:00:00.000Z",
        updatedBy: "admin",
        deletedAt: null,
      },
    ];

    let requestedUrl = "";
    const engine = createSyncEngine({
      store: storeBlocks,
      endpoint: "/api/neuroguide/sync/changes",
      fetchChanges: async ({ since }) => {
        requestedUrl = `/api/neuroguide/sync/changes?since=${since}`;
        return {
          status: 200,
          eTag: '"ng-v2-1-root"',
          body: {
            changes: rowsOnServer.filter((r) => r.changeSeq > since),
            maxSeq: 1,
            rootHash: "root-ng-1",
            hasMore: false,
            reset: false,
          },
        };
      },
    });

    const subscribedTables = [];
    const bridge = createRealtimeSyncBridge({
      engine,
      channelName: "neuroguide-sync",
      table: "neuroguide_sync_state",
      debounceMs: 10,
      pollIntervalMs: 0,
      supabaseClient: {
        channel(name) {
          subscribedTables.push(name);
          return {
            on(_type, filter) {
              subscribedTables.push(filter.table);
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
      const snap = await engine.start();
      assert.equal(requestedUrl, "/api/neuroguide/sync/changes?since=0");
      assert.equal(snap.rows.size, 1);
      assert.equal(snap.rows.get("blk-1")?.data.title, "IV Alteplase");
      assert.deepEqual(subscribedTables, ["neuroguide-sync", "neuroguide_sync_state"]);

      const delta = applyChanges(snap.rows, [
        {
          ...rowsOnServer[0],
          data: { title: "IV Alteplase", body: "Updated body" },
          rev: 2,
          changeSeq: 2,
        },
      ]);
      assert.equal(delta.applied.length, 1);
      assert.equal(delta.next.get("blk-1")?.data.body, "Updated body");
    } finally {
      bridge.stop();
      engine.stop();
    }
  });
});
