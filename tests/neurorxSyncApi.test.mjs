import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeContentHashSync } from "../src/lib/neurorx/integrity.ts";
import { RepoError } from "../src/lib/neurorx/sync/repo.ts";
import { MemoryDrugRepo } from "../src/lib/neurorx/sync/repoMemory.ts";
import {
  formatSyncETag,
  handleCreateDrug,
  handleDeleteDrug,
  handleGetChanges,
  handleGetHistory,
  handlePurge,
  handleRestoreRevision,
  handleUpdateDrug,
} from "../src/lib/neurorx/sync/handlers.ts";

function buildValidDrug(id, overrides = {}) {
  const ref = {
    source_id: "fda-keppra-label",
    locator: "Section 2.1",
    quote: "Initial dose 500 mg twice daily.",
  };
  return {
    id,
    generic_name: id.replace(/-/g, " "),
    tall_man: { value: id.toUpperCase(), refs: [{ ...ref, source_id: "fda-tallman-list" }] },
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
    status: "draft",
    verification: {
      verified_by: null,
      verified_at: null,
      content_hash: null,
    },
    ...overrides,
  };
}

describe("Phase 4a — Sync v2 HTTP Handlers (§4, AC4.1–AC4.4)", () => {
  it("AC4.2: rejects all mutations and admin history/purge with 401 when isAdmin=false", async () => {
    const repo = new MemoryDrugRepo();
    const deps = { repo, isAdmin: false };
    const sample = buildValidDrug("unauth-drug");

    const responses = await Promise.all([
      handleCreateDrug(deps, { data: sample }),
      handleUpdateDrug(deps, "uid-1", { data: sample, expectedRev: 1 }),
      handleDeleteDrug(deps, "uid-1", { expectedRevParam: "1" }),
      handleGetHistory(deps, "uid-1"),
      handleRestoreRevision(deps, "uid-1", { revisionRev: 1, expectedRev: 2 }),
      handlePurge(deps),
    ]);

    for (const res of responses) {
      assert.equal(res.status, 401);
      assert.equal(res.headers["Cache-Control"], "no-store");
      assert.equal(res.body.code, "UNAUTHORIZED");
    }
  });

  it("AC4.1: GET /changes supports ETag 304 fast-path, bad param 400, hasMore paging, and purgeHorizon reset", async () => {
    const repo = new MemoryDrugRepo();
    const adminDeps = { repo, isAdmin: true, actor: "dr-admin" };

    // 1. Parameter validation -> 400
    const badSince = await handleGetChanges({ repo }, { sinceParam: "-5" });
    assert.equal(badSince.status, 400);
    assert.equal(badSince.headers["Cache-Control"], "no-store");

    const badLimit = await handleGetChanges({ repo }, { limitParam: "501" });
    assert.equal(badLimit.status, 400);
    assert.equal(badLimit.headers["Cache-Control"], "no-store");

    // 2. Seed 3 drugs
    const d1 = buildValidDrug("drug-one");
    const d2 = buildValidDrug("drug-two");
    const d3 = buildValidDrug("drug-three");
    const c1 = await handleCreateDrug(adminDeps, { data: d1 });
    await handleCreateDrug(adminDeps, { data: d2 });
    const c3 = await handleCreateDrug(adminDeps, { data: d3 });
    assert.equal(c1.status, 201);
    assert.equal(c3.status, 201);

    // 3. Paging loop with limit=2 reaches all 3 rows
    const page1 = await handleGetChanges({ repo }, { sinceParam: 0, limitParam: 2 });
    assert.equal(page1.status, 200);
    assert.equal(page1.headers["Cache-Control"], "no-store");
    assert.equal(page1.body.changes.length, 2);
    assert.equal(page1.body.hasMore, true);
    assert.equal(page1.body.reset, false);
    assert.equal(page1.headers.ETag, formatSyncETag(page1.body.maxSeq, page1.body.rootHash));

    const lastSeqPage1 = page1.body.changes[1].changeSeq;
    const page2 = await handleGetChanges({ repo }, { sinceParam: lastSeqPage1, limitParam: 2 });
    assert.equal(page2.status, 200);
    assert.equal(page2.body.changes.length, 1);
    assert.equal(page2.body.hasMore, false);

    // 4. ETag 304 fast-path without scanning changesSince()
    let scannedChanges = false;
    const fastPathRepo = {
      getSyncState: () => repo.getSyncState(),
      changesSince: async () => {
        scannedChanges = true;
        return { rows: [], maxSeq: 0, purgeHorizonSeq: 0, rootHash: "" };
      },
    };
    const eTag = page2.headers.ETag;
    const notModifiedOmitted = await handleGetChanges(
      { repo: fastPathRepo },
      { ifNoneMatch: eTag }
    );
    assert.equal(notModifiedOmitted.status, 304);
    assert.equal(notModifiedOmitted.headers["Cache-Control"], "no-store");
    assert.equal(notModifiedOmitted.headers.ETag, eTag);
    assert.equal(notModifiedOmitted.body, null);
    assert.equal(scannedChanges, false);

    const notModifiedMatchingSince = await handleGetChanges(
      { repo: fastPathRepo },
      { sinceParam: String(page2.body.maxSeq), ifNoneMatch: `W/${eTag}` }
    );
    assert.equal(notModifiedMatchingSince.status, 304);
    assert.equal(scannedChanges, false);

    // Passing since < maxSeq even with current ETag must still return 200 delta
    const staleSince = await handleGetChanges(
      { repo },
      { sinceParam: "0", ifNoneMatch: eTag }
    );
    assert.equal(staleSince.status, 200);
    assert.equal(staleSince.body.changes.length, 3);

    // 5. Reset flag when 0 < since < purgeHorizonSeq
    const delRes = await handleDeleteDrug(adminDeps, c1.body.row.uid, { expectedRevParam: "1" });
    assert.equal(delRes.status, 200);
    repo.backdateTombstone(c1.body.row.uid, new Date(Date.now() - 100 * 86_400_000));
    const purgeRes = await handlePurge(adminDeps);
    assert.equal(purgeRes.status, 200);
    assert.equal(purgeRes.body.tombstones_purged, 1);
    assert.ok(purgeRes.body.purge_horizon_seq >= delRes.body.row.changeSeq);

    const resetResp = await handleGetChanges({ repo }, { sinceParam: "1" });
    assert.equal(resetResp.status, 200);
    assert.equal(resetResp.body.reset, true);
    assert.deepEqual(resetResp.body.changes, []);
  });

  it("forces draft on normal create/update, rejects invalid input, short-circuits I13 without revalidation, and returns 409 current row", async () => {
    const repo = new MemoryDrugRepo();
    const invalidatedTags = [];
    const deps = {
      repo,
      isAdmin: true,
      actor: "editor-a",
      onInvalidateTag: (tag) => invalidatedTags.push(tag),
    };

    // Invalid schema -> 400
    const badCreate = await handleCreateDrug(deps, {
      data: { id: "Bad Slug!!", generic_name: "" },
    });
    assert.equal(badCreate.status, 400);
    assert.equal(badCreate.headers["Cache-Control"], "no-store");

    // Envelope leak check (I10) -> 400
    const leaked = buildValidDrug("safe-slug");
    leaked.uid = "forged-uid";
    const badLeak = await handleCreateDrug(deps, { data: leaked });
    assert.equal(badLeak.status, 400);

    // Claiming status='verified' via create forces draft + clears verification (G1.5)
    const claimedVerified = buildValidDrug("levetiracetam", {
      status: "verified",
      verification: {
        verified_by: "attacker",
        verified_at: "2026-11-14",
        content_hash: "fake",
      },
    });
    const created = await handleCreateDrug(deps, { data: claimedVerified });
    assert.equal(created.status, 201);
    assert.equal(created.headers["Cache-Control"], "no-store");
    assert.equal(created.body.row.data.status, "draft");
    assert.equal(created.body.row.data.verification.verified_by, null);
    assert.deepEqual(invalidatedTags, [
      "neurorx:drugs",
      `neurorx:drug:${created.body.row.uid}`,
    ]);

    // Duplicate live slug -> 409 SLUG_TAKEN
    const dup = await handleCreateDrug(deps, { data: buildValidDrug("levetiracetam") });
    assert.equal(dup.status, 409);
    assert.equal(dup.body.code, "SLUG_TAKEN");

    // No-op update (I13): preserves rev/changeSeq & does NOT invalidate tags
    invalidatedTags.length = 0;
    const noop = await handleUpdateDrug(deps, created.body.row.uid, {
      expectedRev: 1,
      data: buildValidDrug("levetiracetam"),
    });
    assert.equal(noop.status, 200);
    assert.equal(noop.body.unchanged, true);
    assert.equal(noop.body.row.rev, 1);
    assert.equal(noop.body.row.changeSeq, created.body.row.changeSeq);
    assert.deepEqual(invalidatedTags, []);

    // Real update with allowVerified -> rev 2, stores patchDiff, triggers revalidateTag
    const updatedPayload = buildValidDrug("levetiracetam", {
      generic_name: "Levetiracetam Extended",
      status: "verified",
    });
    const updated = await handleUpdateDrug(deps, created.body.row.uid, {
      expectedRev: 1,
      data: updatedPayload,
      allowVerified: true,
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.unchanged, false);
    assert.equal(updated.body.row.rev, 2);
    assert.equal(updated.body.row.data.status, "verified");
    assert.equal(
      updated.body.row.data.verification.content_hash,
      computeContentHashSync(updated.body.row.data)
    );
    assert.deepEqual(invalidatedTags, [
      "neurorx:drugs",
      `neurorx:drug:${created.body.row.uid}`,
    ]);

    // AC4.3: stale expectedRev returns 409 with current server row (PUT, DELETE, RESTORE)
    const conflict = await handleUpdateDrug(deps, created.body.row.uid, {
      expectedRev: 1,
      data: buildValidDrug("levetiracetam", { generic_name: "Conflicting Edit" }),
    });
    assert.equal(conflict.status, 409);
    assert.equal(conflict.headers["Cache-Control"], "no-store");
    assert.equal(conflict.body.code, "REV_CONFLICT");
    assert.equal(conflict.body.currentRev, 2);
    assert.equal(conflict.body.current.uid, created.body.row.uid);
    assert.equal(conflict.body.current.data.generic_name, "Levetiracetam Extended");

    const delConflict = await handleDeleteDrug(deps, created.body.row.uid, {
      expectedRevParam: "1",
    });
    assert.equal(delConflict.status, 409);
    assert.equal(delConflict.body.code, "REV_CONFLICT");
    assert.equal(delConflict.body.current.rev, 2);

    const restoreConflict = await handleRestoreRevision(deps, created.body.row.uid, {
      revisionRev: 1,
      expectedRev: 1,
    });
    assert.equal(restoreConflict.status, 409);
    assert.equal(restoreConflict.body.code, "REV_CONFLICT");
    assert.equal(restoreConflict.body.current.rev, 2);

    // GET /history shows newest-first revisions with RFC 6902 patchDiff
    const histRes = await handleGetHistory(deps, created.body.row.uid);
    assert.equal(histRes.status, 200);
    assert.equal(histRes.headers["Cache-Control"], "no-store");
    assert.equal(histRes.body.revisions.length, 2);
    assert.equal(histRes.body.revisions[0].rev, 2);
    assert.ok(
      histRes.body.revisions[0].patchDiff.some((op) => op.path === "/generic_name")
    );

    // POST /restore back to rev 1
    const restoreRes = await handleRestoreRevision(deps, created.body.row.uid, {
      revisionRev: 1,
      expectedRev: 2,
    });
    assert.equal(restoreRes.status, 200);
    assert.equal(restoreRes.headers["Cache-Control"], "no-store");
    assert.equal(restoreRes.body.row.rev, 3);
    assert.equal(restoreRes.body.row.data.generic_name, "levetiracetam");
    assert.equal(restoreRes.body.row.data.status, "draft");
    assert.equal(restoreRes.body.row.data.verification, undefined);

    // Missing uid -> 404
    const missingHist = await handleGetHistory(deps, "00000000-0000-0000-0000-000000000000");
    assert.equal(missingHist.status, 404);
  });

  it("maps SERVICE_UNAVAILABLE RepoError to HTTP 503 with Cache-Control: no-store", async () => {
    const unavailableRepo = {
      getSyncState: async () => {
        throw new RepoError("SERVICE_UNAVAILABLE", "Missing service role key");
      },
    };
    const res = await handleGetChanges({ repo: unavailableRepo });
    assert.equal(res.status, 503);
    assert.equal(res.headers["Cache-Control"], "no-store");
    assert.equal(res.body.code, "SERVICE_UNAVAILABLE");
  });
});
