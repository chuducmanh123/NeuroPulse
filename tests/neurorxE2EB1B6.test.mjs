import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { createClient } from "@supabase/supabase-js";
import { computeContentHashSync } from "../src/lib/neurorx/integrity.ts";
import { parseQuery } from "../src/lib/neurorx/omnibar.ts";
import { parsePatient, resolveRenalFunction } from "../src/lib/neurorx/patient.ts";
import {
  clearLocalDrugDraftsForUid,
  loadLocalDrugDraft,
  resolveConflictChoice,
  saveLocalDrugDraft,
} from "../src/lib/neurorx/sync/adminHelpers.ts";
import {
  handleCreateDrug,
  handleDeleteDrug,
  handleGetChanges,
  handleUpdateDrug,
  listAllLiveRows,
} from "../src/lib/neurorx/sync/handlers.ts";
import { computeSectionHashes } from "../src/lib/neurorx/sync/jsonPatch.ts";
import { MemoryLocalStore } from "../src/lib/neurorx/sync/localStore.ts";
import {
  buildDrugSelectionSearchParams,
  formatSyncStatusView,
} from "../src/lib/neurorx/sync/lookupHelpers.ts";
import { createRealtimeSyncBridge } from "../src/lib/neurorx/sync/realtime.ts";
import { MemoryDrugRepo } from "../src/lib/neurorx/sync/repoMemory.ts";
import { SupabaseDrugRepo } from "../src/lib/neurorx/sync/repoSupabase.ts";
import { createSyncEngine } from "../src/lib/neurorx/sync/syncEngine.ts";
import { deriveDrugsFromRows } from "../src/hooks/useNeuroRxDrugs.ts";

function buildValidDrug(id, overrides = {}) {
  const ref = {
    source_id: "fda-keppra-label",
    locator: "Section 2.1",
    quote: "Initial dose 500 mg twice daily.",
  };
  return {
    id,
    generic_name: id.replace(/-/g, " "),
    tall_man: {
      value: id.toUpperCase(),
      refs: [{ ...ref, source_id: "fda-tallman-list" }],
    },
    classes: ["Antiepileptic"],
    subspecialties: ["epilepsy"],
    vn_products: { value: null, refs: [] },
    bhyt: { value: null, refs: [] },
    regimens: [
      {
        id: `${id}-regimen-1`,
        indication: "Focal-onset seizures",
        route: "PO",
        dose_text: "500 mg BID",
        refs: [ref],
      },
    ],
    renal_basis: { value: "cg_abw", refs: [ref] },
    hepatic: { value: "No adjustment required initially", refs: [ref] },
    black_box: { value: ["Monitor clinically"], refs: [ref] },
    mg_safety: { value: "safe", refs: [ref] },
    ng_tube: { value: null, refs: [] },
    pgx: { value: null, refs: [] },
    ae_tags: { value: ["sedation_somnolence"], refs: [ref] },
    enzyme_profile: { value: {}, refs: [ref] },
    status: "draft",
    verification: {
      verified_by: null,
      verified_at: null,
      content_hash: null,
    },
    ...overrides,
  };
}

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
    emitUpdate(record) {
      for (const cb of subscribers) {
        cb({ new: record });
      }
    },
  };
}

function createHandlerFetchChanges(repo, counter) {
  return async ({ since, limit, ifNoneMatch }) => {
    counter.calls += 1;
    const res = await handleGetChanges(
      { repo },
      {
        sinceParam: String(since),
        limitParam: String(limit ?? 500),
        ifNoneMatch: ifNoneMatch || null,
      }
    );
    const eTag = res.headers?.ETag ?? null;
    if (res.status === 304) {
      counter.notModifiedCalls += 1;
      return { status: 304, eTag };
    }
    if (res.status !== 200) {
      throw new Error(`Unexpected handleGetChanges HTTP ${res.status}`);
    }
    return { status: 200, eTag, body: res.body };
  };
}

async function seedMemoryRepoWithAllDrugs() {
  const repo = new MemoryDrugRepo();
  const dir = path.resolve(process.cwd(), "data", "neurorx", "drugs");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
  assert.ok(files.length >= 69);

  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
    await repo.create(
      data,
      computeContentHashSync(data),
      computeSectionHashes(data),
      "seed",
      { skipRootRehash: true }
    );
  }
  await repo.recomputeRootHash();
  return repo;
}

async function waitUntil(predicate, timeoutMs = 3000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return;
    await new Promise((r) => setTimeout(r, 15));
  }
  throw new Error(`Condition not met within ${timeoutMs}ms`);
}

function runB1B6Matrix(suiteName, makeRepo, opts = {}) {
  const prefix = opts.slugPrefix;

  describe(`E2E Regression Matrix B1–B6 (NEXT_PUBLIC_NEURORX_SYNC_V2=1) — ${suiteName}`, () => {
    let repo;

    after(async () => {
      if (opts.afterAll && repo) {
        await opts.afterAll(repo);
      }
    });

    it("B1–B6 full lifecycle: Realtime delta sync, 3x reload durability, tombstone isolation, UUID slug reuse, <150ms/<50ms 0-network lookup, empty field persistence & 409 conflict recovery", async () => {
      repo = await makeRepo();
      const adminDeps = { repo, isAdmin: true, actor: "e2e-admin" };

      // ---------------------------------------------------------------------
      // Boot Machine A & Machine B synced to current live dataset (>= 69 rows)
      // ---------------------------------------------------------------------
      const storeA = new MemoryLocalStore();
      const storeB = new MemoryLocalStore();
      const netA = { calls: 0, notModifiedCalls: 0 };
      const netB = { calls: 0, notModifiedCalls: 0 };

      const engineA = createSyncEngine({
        store: storeA,
        fetchChanges: createHandlerFetchChanges(repo, netA),
      });
      const realtimeHubB = createFakeRealtimeHub();
      const engineB = createSyncEngine({
        store: storeB,
        fetchChanges: createHandlerFetchChanges(repo, netB),
      });
      const bridgeB = createRealtimeSyncBridge({
        engine: engineB,
        supabaseClient: realtimeHubB.client,
        debounceMs: 40,
        pollIntervalMs: 60_000,
      });

      try {
        await engineA.start();
        await engineB.start();

        assert.ok(deriveDrugsFromRows(engineA.getSnapshot().rows).drugs.length >= 69);
        assert.ok(deriveDrugsFromRows(engineB.getSnapshot().rows).drugs.length >= 69);

        // Seed test drug for B1–B3
        const b1Slug = `${prefix}b1`;
        const b1Initial = buildValidDrug(b1Slug, {
          generic_name: "E2E B1 Initial",
          hepatic: { value: "Initial hepatic note", refs: buildValidDrug(b1Slug).hepatic.refs },
        });
        const createdB1 = await handleCreateDrug(adminDeps, { data: b1Initial });
        assert.equal(createdB1.status, 201);
        const b1Uid = createdB1.body.row.uid;
        await engineA.applyLocalWrite(createdB1.body.row);
        await engineB.pull();

        // -------------------------------------------------------------------
        // B1: Edit on Machine A -> Machine B auto-syncs via Realtime (<= 3s) without F5
        // -------------------------------------------------------------------
        const b1Edited = buildValidDrug(b1Slug, {
          generic_name: "E2E B1 Updated Name",
          hepatic: { value: "Updated hepatic note on Machine A", refs: b1Initial.hepatic.refs },
        });
        const updB1 = await handleUpdateDrug(adminDeps, b1Uid, {
          expectedRev: 1,
          data: b1Edited,
        });
        assert.equal(updB1.status, 200);
        assert.equal(updB1.body.row.rev, 2);
        await engineA.applyLocalWrite(updB1.body.row);

        const stateAfterB1 = await repo.getSyncState();
        realtimeHubB.emitUpdate({
          max_seq: stateAfterB1.maxSeq,
          root_hash: stateAfterB1.rootHash,
        });

        await waitUntil(
          () => engineB.getSnapshot().rows.get(b1Uid)?.rev === 2,
          3000
        );

        const snapB = engineB.getSnapshot();
        assert.equal(
          snapB.rows.get(b1Uid)?.data.hepatic?.value,
          "Updated hepatic note on Machine A"
        );
        const statusViewB = formatSyncStatusView({
          syncStatus: snapB.status,
          lastSyncAt: snapB.lastSyncAt,
          lastChangeCount: snapB.lastChangeCount,
          lastSeq: snapB.lastSeq,
          isOnline: true,
        });
        assert.equal(statusViewB.updatedBadgeText, "1 drug updated");

        // -------------------------------------------------------------------
        // B2: Saved edit (rev + 1 -> rev 3) survives 3 consecutive F5 hard reloads
        // -------------------------------------------------------------------
        const b2Edited = buildValidDrug(b1Slug, {
          generic_name: "E2E B2 Persistent After 3x F5",
          hepatic: { value: "Survived F5 reload", refs: b1Initial.hepatic.refs },
        });
        const updB2 = await handleUpdateDrug(adminDeps, b1Uid, {
          expectedRev: 2,
          data: b2Edited,
        });
        assert.equal(updB2.status, 200);
        assert.equal(updB2.body.row.rev, 3);
        await engineA.applyLocalWrite(updB2.body.row);

        for (let reloadIdx = 0; reloadIdx < 3; reloadIdx++) {
          const reloadedEngine = createSyncEngine({
            store: storeA,
            fetchChanges: createHandlerFetchChanges(repo, netA),
          });
          await reloadedEngine.start();
          const rowReloaded = reloadedEngine.getSnapshot().rows.get(b1Uid);
          assert.equal(rowReloaded?.rev, 3);
          assert.equal(rowReloaded?.data.generic_name, "E2E B2 Persistent After 3x F5");
          reloadedEngine.stop();
        }

        // Cold full pull (fresh reload from empty IDB) also returns rev 3
        const coldReloadEngine = createSyncEngine({
          store: new MemoryLocalStore(),
          fetchChanges: createHandlerFetchChanges(repo, { calls: 0, notModifiedCalls: 0 }),
        });
        await coldReloadEngine.start();
        assert.equal(coldReloadEngine.getSnapshot().rows.get(b1Uid)?.rev, 3);
        coldReloadEngine.stop();

        // -------------------------------------------------------------------
        // B3: Soft delete never resurrects on Machine A, Machine B, or Incognito
        // -------------------------------------------------------------------
        const seqBeforeDelete = engineB.getSnapshot().lastSeq;
        const delB1 = await handleDeleteDrug(adminDeps, b1Uid, { expectedRevParam: "3" });
        assert.equal(delB1.status, 200);
        assert.ok(delB1.body.row.deletedAt !== null);

        // Verify /changes delta carries the tombstone
        const deltaDel = await handleGetChanges(
          { repo },
          { sinceParam: String(seqBeforeDelete), limitParam: "500" }
        );
        assert.equal(deltaDel.status, 200);
        assert.ok(
          deltaDel.body.changes.some((r) => r.uid === b1Uid && r.deletedAt !== null)
        );

        await engineA.applyLocalWrite(delB1.body.row);
        await engineB.pull();

        // Fresh Incognito browser pulls from seq = 0
        const incognitoEngine = createSyncEngine({
          store: new MemoryLocalStore(),
          fetchChanges: createHandlerFetchChanges(repo, { calls: 0, notModifiedCalls: 0 }),
        });
        await incognitoEngine.start();
        try {
          assert.equal(deriveDrugsFromRows(engineA.getSnapshot().rows).rowsBySlug.has(b1Slug), false);
          assert.equal(deriveDrugsFromRows(engineB.getSnapshot().rows).rowsBySlug.has(b1Slug), false);
          assert.equal(
            deriveDrugsFromRows(incognitoEngine.getSnapshot().rows).rowsBySlug.has(b1Slug),
            false
          );
        } finally {
          incognitoEngine.stop();
        }

        // -------------------------------------------------------------------
        // B4: Recreating same slug after deletion succeeds with a new UUID
        // -------------------------------------------------------------------
        const rebornSlug = `${prefix}reborn`;
        const cOld = await handleCreateDrug(adminDeps, {
          data: buildValidDrug(rebornSlug, { generic_name: "Reborn Old" }),
        });
        assert.equal(cOld.status, 201);
        const uid1 = cOld.body.row.uid;
        await handleDeleteDrug(adminDeps, uid1, { expectedRevParam: "1" });

        const cNew = await handleCreateDrug(adminDeps, {
          data: buildValidDrug(rebornSlug, { generic_name: "Reborn New" }),
        });
        assert.equal(cNew.status, 201);
        const uid2 = cNew.body.row.uid;
        assert.notEqual(uid2, uid1);
        assert.equal(cNew.body.row.rev, 1);

        await engineA.applyLocalWrite(cNew.body.row);
        await engineB.pull();
        assert.equal(deriveDrugsFromRows(engineA.getSnapshot().rows).rowsBySlug.get(rebornSlug)?.uid, uid2);
        assert.equal(deriveDrugsFromRows(engineB.getSnapshot().rows).rowsBySlug.get(rebornSlug)?.uid, uid2);

        // -------------------------------------------------------------------
        // B5: Warm IDB boot (< 150ms), 304 Not Modified on unchanged poll, and
        //     5 consecutive drug clicks in < 50ms each with 0 network calls
        // -------------------------------------------------------------------
        const netWarm = { calls: 0, notModifiedCalls: 0 };
        const warmEngine = createSyncEngine({
          store: storeA,
          fetchChanges: async (params) => {
            // Defer network slightly so initial LocalStore emission time is isolated
            await new Promise((r) => setTimeout(r, 15));
            return createHandlerFetchChanges(repo, netWarm)(params);
          },
        });

        let cachedRenderMs = -1;
        const bootStartMs = performance.now();
        const unsubWarm = warmEngine.subscribe((snap) => {
          if (cachedRenderMs < 0 && snap.rows.size >= 69) {
            cachedRenderMs = performance.now() - bootStartMs;
          }
        });
        await warmEngine.start();
        unsubWarm();

        assert.ok(cachedRenderMs >= 0 && cachedRenderMs < 150, `Expected warm boot < 150ms, got ${cachedRenderMs.toFixed(2)}ms`);

        // Unchanged poll must return HTTP 304
        const prevNotMod = netWarm.notModifiedCalls;
        await warmEngine.pull();
        assert.ok(netWarm.notModifiedCalls > prevNotMod);

        const netCallsBeforeClicks = netWarm.calls;
        const globalOrigFetch = globalThis.fetch;
        let globalFetchCount = 0;
        globalThis.fetch = async () => {
          globalFetchCount += 1;
          throw new Error("Unexpected network fetch during B5 drug click");
        };

        const clickTargets = [
          "levetiracetam-oral",
          "apixaban",
          "lamotrigine",
          "valproate",
          "warfarin",
        ];
        const parsedQuery = parseQuery("60kg crcl 45 age 70 female").patient;
        const patientParsed = parsePatient({
          ageYears: parsedQuery.age,
          sex: parsedQuery.sex,
          weightKg: parsedQuery.weightKg,
          crclManual: parsedQuery.crcl,
          scr: parsedQuery.scr,
        }).patient;
        const { drugs: viewDrugs } = deriveDrugsFromRows(warmEngine.getSnapshot().rows);

        const clickTimingsMs = [];
        try {
          for (const slug of clickTargets) {
            const t0 = performance.now();
            const qs = buildDrugSelectionSearchParams("?tab=lookup&w=60&crcl=45", slug);
            const selectedSlug = new URLSearchParams(qs).get("drug");
            const found = viewDrugs.find((item) => item.drug.id === selectedSlug);
            assert.ok(found, `Expected drug ${slug} to exist`);
            const renal = resolveRenalFunction(
              patientParsed,
              found.drug.renal_basis?.value || "cg_abw"
            );
            assert.equal(renal.value, 45);
            const elapsed = performance.now() - t0;
            clickTimingsMs.push(elapsed);
            assert.ok(elapsed < 50, `Expected click for ${slug} < 50ms, got ${elapsed.toFixed(3)}ms`);
          }
        } finally {
          globalThis.fetch = globalOrigFetch;
          warmEngine.stop();
        }
        assert.equal(globalFetchCount, 0);
        assert.equal(netWarm.calls, netCallsBeforeClicks);

        // -------------------------------------------------------------------
        // B6: (a) Cleared optional fields stay null after reload
        //     (b) Concurrent edit triggers 409 REV_CONFLICT, keeps draft, merges cleanly
        // -------------------------------------------------------------------
        const b6Slug = `${prefix}b6`;
        const b6BaseCreated = await handleCreateDrug(adminDeps, {
          data: buildValidDrug(b6Slug, {
            generic_name: "E2E B6 Drug",
            hepatic: { value: "50% dose in Child-Pugh C", refs: b1Initial.hepatic.refs },
            black_box: { value: ["Warning to clear"], refs: b1Initial.black_box.refs },
          }),
        });
        assert.equal(b6BaseCreated.status, 201);
        const b6Uid = b6BaseCreated.body.row.uid;

        // B6(a): Clear optional fields & reload
        const clearedPayload = buildValidDrug(b6Slug, {
          generic_name: "E2E B6 Drug",
          hepatic: { value: null, refs: [] },
          black_box: { value: null, refs: [] },
        });
        const updCleared = await handleUpdateDrug(adminDeps, b6Uid, {
          expectedRev: 1,
          data: clearedPayload,
        });
        assert.equal(updCleared.status, 200);
        assert.equal(updCleared.body.row.rev, 2);

        await engineB.pull();
        const reloadedB6 = engineB.getSnapshot().rows.get(b6Uid);
        assert.equal(reloadedB6?.data.hepatic?.value, null);
        assert.equal(reloadedB6?.data.black_box?.value, null);

        // B6(b): Tab 1 & Tab 2 open rev=2. Tab 2 saves 3s local draft before conflict.
        const storageTab2 = createMemoryStorage();
        const baseAtRev2 = structuredClone(updCleared.body.row.data);
        const tab2Mine = structuredClone(baseAtRev2);
        tab2Mine.black_box = {
          value: ["Tab 2 new black box monitoring"],
          refs: [{ source_id: "fda-keppra-label", locator: "Boxed", quote: "Tab 2 edit" }],
        };
        saveLocalDrugDraft(storageTab2, b6Uid, 2, tab2Mine, "2026-11-14T13:00:00.000Z");

        // Tab 1 saves first -> rev 3
        const tab1Edit = structuredClone(baseAtRev2);
        tab1Edit.hepatic = {
          value: "Tab 1 updated hepatic note",
          refs: [{ source_id: "fda-keppra-label", locator: "Sec 8", quote: "Tab 1 edit" }],
        };
        const tab1Res = await handleUpdateDrug(adminDeps, b6Uid, {
          expectedRev: 2,
          data: tab1Edit,
        });
        assert.equal(tab1Res.status, 200);
        assert.equal(tab1Res.body.row.rev, 3);

        // Tab 2 saves with stale expectedRev=2 -> 409 REV_CONFLICT (draft stays intact)
        const conflictRes = await handleUpdateDrug(adminDeps, b6Uid, {
          expectedRev: 2,
          data: tab2Mine,
        });
        assert.equal(conflictRes.status, 409);
        assert.equal(conflictRes.body.code, "REV_CONFLICT");
        assert.equal(conflictRes.body.currentRev, 3);
        assert.equal(conflictRes.body.current.rev, 3);
        assert.ok(loadLocalDrugDraft(storageTab2, b6Uid, 2));

        // ConflictDialog resolves via Smart Merge against cloudRow rev=3 -> rev 4
        const smartMerge = resolveConflictChoice({
          mode: "smart_merge",
          base: baseAtRev2,
          mine: tab2Mine,
          cloudRow: conflictRes.body.current,
        });
        assert.equal(smartMerge.ok, true);
        assert.equal(smartMerge.kind, "put");
        assert.equal(smartMerge.expectedRev, 3);

        const mergedSave = await handleUpdateDrug(adminDeps, b6Uid, {
          expectedRev: smartMerge.expectedRev,
          data: smartMerge.data,
        });
        assert.equal(mergedSave.status, 200);
        assert.equal(mergedSave.body.row.rev, 4);
        assert.equal(mergedSave.body.row.data.hepatic?.value, "Tab 1 updated hepatic note");
        assert.deepEqual(mergedSave.body.row.data.black_box?.value, [
          "Tab 2 new black box monitoring",
        ]);

        // Clear local draft strictly after HTTP 200
        clearLocalDrugDraftsForUid(storageTab2, b6Uid);
        assert.equal(loadLocalDrugDraft(storageTab2, b6Uid, 2), null);
      } finally {
        bridgeB.stop();
        engineA.stop();
        engineB.stop();
      }
    });
  });
}

runB1B6Matrix(
  "MemoryDrugRepo (Full Mirror + Client Engine)",
  seedMemoryRepoWithAllDrugs,
  { slugPrefix: "zz-sync-test-e2e-" }
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
    throw new Error("Missing Supabase URL or SUPABASE_SERVICE_ROLE_KEY for NEURORX_SYNC_IT=1");
  }
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}

async function cleanupLiveE2ERows(prefixPattern = "zz-sync-test-e2e-%") {
  const admin = getLiveAdminClient();
  const { error: delErr } = await admin
    .from("neurorx_drug_records")
    .delete()
    .like("slug", prefixPattern);
  if (delErr) throw delErr;

  const repo = new SupabaseDrugRepo({ client: admin });
  await repo.recomputeRootHash();
  const live = await listAllLiveRows(repo);
  assert.ok(live.length >= 69, `Expected >= 69 live clinical drugs after E2E cleanup, got ${live.length}`);
  assert.ok(live.filter((r) => r.data.status === "verified").length >= 1);
  assert.equal(live.some((r) => r.slug.startsWith("zz-sync-test-e2e-")), false);
}

if (process.env.NEURORX_SYNC_IT === "1") {
  const livePrefix = `zz-sync-test-e2e-${Date.now()}-`;
  runB1B6Matrix(
    "SupabaseDrugRepo (Live Production RPCs + Live Drugs)",
    async () => {
      await cleanupLiveE2ERows("zz-sync-test-e2e-%");
      loadEnvLocalIfMissing();
      return new SupabaseDrugRepo();
    },
    {
      slugPrefix: livePrefix,
      afterAll: async () => {
        await cleanupLiveE2ERows("zz-sync-test-e2e-%");
      },
    }
  );
}
