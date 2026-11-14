import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  computeJsonPatch,
  computeRecordContentHashSync,
  computeRootHashFromEntries,
  computeSectionHashes,
} from "../src/lib/neurorx/sync/jsonPatch.ts";
import { RepoError } from "../src/lib/neurorx/sync/repo.ts";
import { MemoryDrugRepo } from "../src/lib/neurorx/sync/repoMemory.ts";
import { SupabaseDrugRepo } from "../src/lib/neurorx/sync/repoSupabase.ts";

function buildDrug(id, overrides = {}) {
  return {
    id,
    generic_name: id.replace(/-/g, " "),
    tall_man: { value: id, refs: [] },
    classes: ["TestClass"],
    subspecialties: ["epilepsy"],
    vn_products: { value: null, refs: [] },
    bhyt: { value: null, refs: [] },
    regimens: [],
    renal_basis: { value: "cg_abw", refs: [] },
    hepatic: { value: null, refs: [] },
    black_box: { value: null, refs: [] },
    mg_safety: { value: "safe", refs: [] },
    ng_tube: { value: null, refs: [] },
    pgx: { value: null, refs: [] },
    ae_tags: { value: [], refs: [] },
    enzyme_profile: { value: {}, refs: [] },
    status: "draft",
    verification: {
      verified_by: null,
      verified_at: null,
      content_hash: null,
    },
    ...overrides,
  };
}

/**
 * Shared contract test suite mirroring SQL checks T1-T10 + T12.
 * Can be executed against MemoryDrugRepo or SupabaseDrugRepo.
 */
export function runRepoContract(suiteName, makeRepo, opts = {}) {
  const prefix = opts.slugPrefix ?? "zz-sync-test-";

  describe(`DrugRepo Contract Suite — ${suiteName}`, () => {
    it("T1-T7 & T12: create, update, patchDiff, short-circuit no-op, 409 conflict, delete, recreate slug with new uid, duplicate check, rename", async () => {
      const repo = await makeRepo();
      const slugAlpha = `${prefix}alpha`;
      const slugRenamed = `${prefix}alpha-renamed`;

      // T1: create -> rev 1, changeSeq > 0, revision op='insert', rootHash set
      const d1 = buildDrug(slugAlpha, { generic_name: "Alpha v1" });
      const created = await repo.create(
        d1,
        computeRecordContentHashSync(d1),
        computeSectionHashes(d1),
        "tester"
      );
      assert.equal(created.rev, 1);
      assert.ok(created.changeSeq > 0);
      assert.equal(created.slug, slugAlpha);
      assert.equal(created.deletedAt, null);

      const state1 = await repo.getSyncState();
      assert.equal(state1.maxSeq, created.changeSeq);
      assert.ok(state1.rootHash.length === 64);

      const hist1 = await repo.history(created.uid);
      assert.equal(hist1.length, 1);
      assert.equal(hist1[0].op, "insert");

      // T12: identical contentHash & slug -> no-op (unchanged = true, rev/seq unchanged)
      const noop = await repo.update(
        created.uid,
        1,
        d1,
        created.contentHash,
        created.sectionHashes,
        [],
        "tester"
      );
      assert.equal(noop.unchanged, true);
      assert.equal(noop.row.rev, 1);
      assert.equal(noop.row.changeSeq, created.changeSeq);
      assert.equal((await repo.history(created.uid)).length, 1);

      // T2: update with changed content -> rev 2, patchDiff stored, rootHash updated
      const d2 = buildDrug(slugAlpha, { generic_name: "Alpha v2" });
      const patch12 = computeJsonPatch(d1, d2);
      const updated = await repo.update(
        created.uid,
        1,
        d2,
        computeRecordContentHashSync(d2),
        computeSectionHashes(d2),
        patch12,
        "tester"
      );
      assert.equal(updated.unchanged, false);
      assert.equal(updated.row.rev, 2);
      assert.ok(updated.row.changeSeq > created.changeSeq);
      const state2 = await repo.getSyncState();
      assert.notEqual(state2.rootHash, state1.rootHash);

      const hist2 = await repo.history(created.uid);
      assert.equal(hist2[0].rev, 2);
      assert.equal(hist2[0].op, "update");
      assert.ok(hist2[0].patchDiff.some((p) => p.path === "/generic_name"));

      // T3: stale expectedRev -> REV_CONFLICT with currentRev
      await assert.rejects(
        () =>
          repo.update(
            created.uid,
            1,
            buildDrug(slugAlpha, { generic_name: "Stale" }),
            "stale-hash",
            {},
            [],
            "tester"
          ),
        (err) => err instanceof RepoError && err.code === "REV_CONFLICT" && err.currentRev === 2
      );

      // T4: remove (tombstone) -> rev 3, deletedAt set, appears in changesSince
      const removed = await repo.remove(created.uid, 2, "tester");
      assert.equal(removed.rev, 3);
      assert.ok(removed.deletedAt !== null);
      const deltaAfterDel = await repo.changesSince(updated.row.changeSeq, 50);
      assert.ok(
        deltaAfterDel.rows.some((r) => r.uid === created.uid && r.deletedAt !== null)
      );

      // T5: recreate same slug after delete -> succeeds with DIFFERENT uid (Bug B4)
      const rebornData = buildDrug(slugAlpha, { generic_name: "Alpha Reborn" });
      const reborn = await repo.create(
        rebornData,
        computeRecordContentHashSync(rebornData),
        computeSectionHashes(rebornData),
        "tester"
      );
      assert.notEqual(reborn.uid, created.uid);
      assert.equal(reborn.rev, 1);

      // T6: duplicate live slug -> SLUG_TAKEN
      await assert.rejects(
        () =>
          repo.create(
            buildDrug(slugAlpha),
            computeRecordContentHashSync(rebornData),
            {},
            "tester"
          ),
        (err) => err instanceof RepoError && err.code === "SLUG_TAKEN"
      );

      // T7: rename slug preserves uid
      const renamedData = buildDrug(slugRenamed, { generic_name: "Alpha Reborn" });
      const renamed = await repo.update(
        reborn.uid,
        1,
        renamedData,
        computeRecordContentHashSync(renamedData),
        computeSectionHashes(renamedData),
        computeJsonPatch(rebornData, renamedData),
        "tester"
      );
      assert.equal(renamed.row.uid, reborn.uid);
      assert.equal(renamed.row.rev, 2);
      assert.equal(renamed.row.slug, slugRenamed);
      assert.equal(renamed.row.data.id, slugRenamed);
    });

    it("T8 & T9 & batched recomputeRootHash: restore verified strips verification & forces draft; paging works", async () => {
      const repo = await makeRepo();
      const preExisting = await repo.changesSince(0, 500);
      const baselineSeq = preExisting.maxSeq;
      const baselineLiveEntries = preExisting.rows
        .filter((r) => r.deletedAt === null)
        .map((r) => ({ uid: r.uid, rev: r.rev, contentHash: r.contentHash }));

      const baseSlug = `${prefix}restore`;
      const d1 = buildDrug(baseSlug, {
        status: "verified",
        verification: {
          verified_by: "Dr. Clinician",
          verified_at: "2026-11-14",
          content_hash: "dummy",
        },
      });
      const r1 = await repo.create(
        d1,
        computeRecordContentHashSync(d1),
        computeSectionHashes(d1),
        "tester"
      );

      const d2 = buildDrug(baseSlug, { generic_name: "Later Draft" });
      const r2 = await repo.update(
        r1.uid,
        1,
        d2,
        computeRecordContentHashSync(d2),
        computeSectionHashes(d2),
        computeJsonPatch(d1, d2),
        "tester"
      );

      const restoredDraft = { ...d1, status: "draft" };
      delete restoredDraft.verification;
      const restored = await repo.restore(
        r1.uid,
        r2.row.rev,
        1,
        computeRecordContentHashSync(restoredDraft),
        computeSectionHashes(restoredDraft),
        computeJsonPatch(d2, restoredDraft),
        "tester"
      );

      assert.equal(restored.rev, 3);
      assert.equal(restored.data.status, "draft");
      assert.equal(restored.data.verification, undefined);

      // Batched create with skipRootRehash + explicit recomputeRootHash()
      const b1 = buildDrug(`${prefix}batch-1`);
      const b2 = buildDrug(`${prefix}batch-2`);
      const createdB1 = await repo.create(
        b1,
        computeRecordContentHashSync(b1),
        computeSectionHashes(b1),
        "batch",
        { skipRootRehash: true }
      );
      const createdB2 = await repo.create(
        b2,
        computeRecordContentHashSync(b2),
        computeSectionHashes(b2),
        "batch",
        { skipRootRehash: true }
      );
      const finalRoot = await repo.recomputeRootHash();
      const expectedRoot = computeRootHashFromEntries([
        ...baselineLiveEntries,
        { uid: restored.uid, rev: restored.rev, contentHash: restored.contentHash },
        { uid: createdB1.uid, rev: createdB1.rev, contentHash: createdB1.contentHash },
        { uid: createdB2.uid, rev: createdB2.rev, contentHash: createdB2.contentHash },
      ]);
      assert.equal(finalRoot, expectedRoot);

      // T9: paging order & limit
      const page1 = await repo.changesSince(baselineSeq, 2);
      assert.equal(page1.rows.length, 2);
      assert.ok(page1.rows[0].changeSeq < page1.rows[1].changeSeq);
      const page2 = await repo.changesSince(page1.rows[1].changeSeq, 10);
      assert.equal(page2.rows.length, 1);
      assert.ok(page2.rows[0].changeSeq > page1.rows[1].changeSeq);
    });

    if (typeof opts.testPurge === "function") {
      it("T10: purge respects 90d tombstone, 90d revision, keep-min-5, and 365d verified rules", async () => {
        await opts.testPurge(makeRepo, prefix);
      });
    }

    if (typeof opts.afterAll === "function") {
      after(async () => {
        await opts.afterAll();
      });
    }
  });
}

// Run shared contract against MemoryDrugRepo including T10 retention purge rules.
runRepoContract("MemoryDrugRepo", async () => new MemoryDrugRepo(), {
  testPurge: async (makeRepo, prefix) => {
    const repo = await makeRepo();
    const dayMs = 86_400_000;
    const now = new Date("2026-11-14T12:00:00Z");

    // 1. Tombstone aging: 91d old vs 10d old
    const dOld = buildDrug(`${prefix}old-del`);
    const rOld = await repo.create(dOld, computeRecordContentHashSync(dOld), {}, "tester");
    const delOld = await repo.remove(rOld.uid, 1, "tester");
    repo.backdateTombstone(rOld.uid, new Date(now.getTime() - 91 * dayMs));

    const dFresh = buildDrug(`${prefix}fresh-del`);
    const rFresh = await repo.create(dFresh, computeRecordContentHashSync(dFresh), {}, "tester");
    await repo.remove(rFresh.uid, 1, "tester");
    repo.backdateTombstone(rFresh.uid, new Date(now.getTime() - 10 * dayMs));

    // 2. Revision retention:
    //   rev 1: verified, 370d old (> 365d, rank 8 > 5) -> PURGED
    //   rev 2: verified, 200d old (< 365d, rank 7 > 5) -> KEPT
    //   rev 3: draft,    100d old (>  90d, rank 6 > 5) -> PURGED
    //   rev 4..8: draft, 100d old (>  90d, rank 1..5) -> KEPT (keep-min-5)
    const dRev1 = buildDrug(`${prefix}revtest`, { status: "verified", generic_name: "R1" });
    const revRow = await repo.create(dRev1, computeRecordContentHashSync(dRev1), {}, "tester");
    const dRev2 = buildDrug(`${prefix}revtest`, { status: "verified", generic_name: "R2" });
    await repo.update(revRow.uid, 1, dRev2, computeRecordContentHashSync(dRev2), {}, [], "tester");
    for (let i = 3; i <= 8; i++) {
      const dr = buildDrug(`${prefix}revtest`, { status: "draft", generic_name: `R${i}` });
      await repo.update(
        revRow.uid,
        i - 1,
        dr,
        computeRecordContentHashSync(dr),
        {},
        [],
        "tester"
      );
    }

    repo.backdateRevision(revRow.uid, 1, new Date(now.getTime() - 370 * dayMs));
    repo.backdateRevision(revRow.uid, 2, new Date(now.getTime() - 200 * dayMs));
    for (let i = 3; i <= 8; i++) {
      repo.backdateRevision(revRow.uid, i, new Date(now.getTime() - 100 * dayMs));
    }

    const purgeRes = await repo.purge(now);
    assert.equal(purgeRes.tombstonesPurged, 1);
    assert.equal(purgeRes.revisionsPurged, 2);
    assert.equal(purgeRes.purgeHorizonSeq, delOld.changeSeq);
    assert.equal(await repo.getByUid(rOld.uid), null);
    assert.ok((await repo.getByUid(rFresh.uid)) !== null);

    const remainingRevs = (await repo.history(revRow.uid)).map((r) => r.rev).sort((a, b) => a - b);
    assert.deepEqual(remainingRevs, [2, 4, 5, 6, 7, 8]);
  },
});

describe("SupabaseDrugRepo — Configuration & Error Mapping (AC2.4)", () => {
  it("throws SERVICE_UNAVAILABLE without falling back to anon key when service role key is missing", async () => {
    const repo = new SupabaseDrugRepo({
      url: "https://example.supabase.co",
      serviceRoleKey: "",
    });
    const d = buildDrug("zz-sync-test-missing-key");

    await assert.rejects(
      () => repo.create(d, computeRecordContentHashSync(d), {}, "tester"),
      (err) => err instanceof RepoError && err.code === "SERVICE_UNAVAILABLE"
    );
    await assert.rejects(
      () => repo.changesSince(0, 10),
      (err) => err instanceof RepoError && err.code === "SERVICE_UNAVAILABLE"
    );
    await assert.rejects(
      () => repo.purge(),
      (err) => err instanceof RepoError && err.code === "SERVICE_UNAVAILABLE"
    );
  });

  it("reads missing SUPABASE_SERVICE_ROLE_KEY dynamically from env without anon fallback", async () => {
    const prevService = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const prevAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    try {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-only-should-not-be-used";
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      const repo = new SupabaseDrugRepo();
      await assert.rejects(
        () => repo.getSyncState(),
        (err) => err instanceof RepoError && err.code === "SERVICE_UNAVAILABLE"
      );
    } finally {
      if (prevService !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = prevService;
      else delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (prevAnon !== undefined) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prevAnon;
      else delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (prevUrl !== undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl;
      else delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    }
  });

  it("maps NRX_REV_CONFLICT and NRX_SLUG_TAKEN RPC errors cleanly via mock client", async () => {
    const fakeServerRow = {
      uid: "00000000-0000-0000-0000-000000000123",
      slug: "zz-sync-test-mock",
      data: buildDrug("zz-sync-test-mock"),
      content_hash: "abc",
      section_hashes: {},
      rev: 5,
      change_seq: 99,
      updated_at: "2026-11-14T10:00:00Z",
      updated_by: "admin",
      deleted_at: null,
    };

    const mockClient = {
      rpc: async (fnName) => {
        if (fnName === "neurorx_update_drug") {
          return { data: null, error: { message: "NRX_REV_CONFLICT:5" } };
        }
        return { data: null, error: { message: "NRX_SLUG_TAKEN:zz-sync-test-mock" } };
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: fakeServerRow, error: null }),
          }),
        }),
      }),
    };

    const repo = new SupabaseDrugRepo({ client: mockClient });
    const d = buildDrug("zz-sync-test-mock");

    await assert.rejects(
      () => repo.update(fakeServerRow.uid, 4, d, "xyz", {}, [], "tester"),
      (err) =>
        err instanceof RepoError &&
        err.code === "REV_CONFLICT" &&
        err.currentRev === 5 &&
        err.currentRow?.rev === 5
    );

    await assert.rejects(
      () => repo.create(d, "xyz", {}, "tester"),
      (err) => err instanceof RepoError && err.code === "SLUG_TAKEN"
    );
  });
});

// Optional live Supabase integration contract execution when NEURORX_SYNC_IT=1
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

async function cleanupLiveTestRows() {
  const admin = getLiveAdminClient();
  const { error: delErr } = await admin
    .from("neurorx_drug_records")
    .delete()
    .like("slug", "zz-sync-test-%");
  if (delErr) throw delErr;

  const { count, error: countErr } = await admin
    .from("neurorx_drug_records")
    .select("uid", { count: "exact", head: true });
  if (countErr) throw countErr;

  if (count === 0) {
    const { error: resetErr } = await admin
      .from("neurorx_sync_state")
      .update({
        max_seq: 0,
        purge_horizon_seq: 0,
        root_hash: "",
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    if (resetErr) throw resetErr;
  } else {
    const repo = new SupabaseDrugRepo({ client: admin });
    await repo.recomputeRootHash();
  }
}

if (process.env.NEURORX_SYNC_IT === "1") {
  runRepoContract(
    "SupabaseDrugRepo (Live IT)",
    async () => {
      await cleanupLiveTestRows();
      loadEnvLocalIfMissing();
      return new SupabaseDrugRepo();
    },
    {
      slugPrefix: `zz-sync-test-${Date.now()}-`,
      afterAll: cleanupLiveTestRows,
      testPurge: async (makeRepo, prefix) => {
        const repo = await makeRepo();
        const admin = getLiveAdminClient();
        const dayMs = 86_400_000;

        // 1. Tombstone aging: 91d old vs 10d old (anchored to PostgreSQL server created_at)
        const dOld = buildDrug(`${prefix}old-del`);
        const rOld = await repo.create(dOld, computeRecordContentHashSync(dOld), {}, "tester");
        const delOld = await repo.remove(rOld.uid, 1, "tester");
        const dbNowMs = Date.parse(rOld.createdAt || new Date().toISOString());

        const { error: backDelOldErr } = await admin
          .from("neurorx_drug_records")
          .update({ deleted_at: new Date(dbNowMs - 91 * dayMs).toISOString() })
          .eq("uid", rOld.uid);
        if (backDelOldErr) throw backDelOldErr;

        const dFresh = buildDrug(`${prefix}fresh-del`);
        const rFresh = await repo.create(dFresh, computeRecordContentHashSync(dFresh), {}, "tester");
        await repo.remove(rFresh.uid, 1, "tester");
        const { error: backDelFreshErr } = await admin
          .from("neurorx_drug_records")
          .update({ deleted_at: new Date(dbNowMs - 10 * dayMs).toISOString() })
          .eq("uid", rFresh.uid);
        if (backDelFreshErr) throw backDelFreshErr;

        // 2. Revision retention: 370d verified (purged), 200d verified (kept), 100d drafts (rank > 5 purged, top 5 kept)
        const dRev1 = buildDrug(`${prefix}revtest`, { status: "verified", generic_name: "R1" });
        const revRow = await repo.create(dRev1, computeRecordContentHashSync(dRev1), {}, "tester");
        const dRev2 = buildDrug(`${prefix}revtest`, { status: "verified", generic_name: "R2" });
        await repo.update(revRow.uid, 1, dRev2, computeRecordContentHashSync(dRev2), {}, [], "tester");
        for (let i = 3; i <= 8; i++) {
          const dr = buildDrug(`${prefix}revtest`, { status: "draft", generic_name: `R${i}` });
          await repo.update(
            revRow.uid,
            i - 1,
            dr,
            computeRecordContentHashSync(dr),
            {},
            [],
            "tester"
          );
        }

        const backdateRev = async (rev, daysAgo) => {
          const { error } = await admin
            .from("neurorx_drug_revisions")
            .update({ created_at: new Date(dbNowMs - daysAgo * dayMs).toISOString() })
            .eq("uid", revRow.uid)
            .eq("rev", rev);
          if (error) throw error;
        };

        await backdateRev(1, 370);
        await backdateRev(2, 200);
        for (let i = 3; i <= 8; i++) {
          await backdateRev(i, 100);
        }

        const purgeRes = await repo.purge();
        assert.equal(purgeRes.tombstonesPurged, 1);
        assert.equal(purgeRes.revisionsPurged, 2);
        assert.equal(purgeRes.purgeHorizonSeq, delOld.changeSeq);
        assert.equal(await repo.getByUid(rOld.uid), null);
        assert.ok((await repo.getByUid(rFresh.uid)) !== null);

        const remainingRevs = (await repo.history(revRow.uid))
          .map((r) => r.rev)
          .sort((a, b) => a - b);
        assert.deepEqual(remainingRevs, [2, 4, 5, 6, 7, 8]);
      },
    }
  );
}
