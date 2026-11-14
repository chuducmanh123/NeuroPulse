import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeContentHashSync } from "../src/lib/neurorx/integrity.ts";
import {
  DRAFT_AUTOSAVE_INTERVAL_MS,
  buildConflictSummary,
  clearLocalDrugDraftsForUid,
  formatDraftStorageKey,
  formatRevisionDiffEntries,
  loadLocalDrugDraft,
  resolveConflictChoice,
  saveLocalDrugDraft,
} from "../src/lib/neurorx/sync/adminHelpers.ts";
import {
  handleCreateDrug,
  handleGetHistory,
  handleRestoreRevision,
  handleUpdateDrug,
  handleVerifyAllDrugsV2,
  handleVerifyDrugV2,
  listAllLiveRows,
} from "../src/lib/neurorx/sync/handlers.ts";
import { MemoryDrugRepo } from "../src/lib/neurorx/sync/repoMemory.ts";

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
    hepatic: { value: "No adjustment needed", refs: [ref] },
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

describe("Phase 6b — Admin UI Sync v2 Helpers & Mutations (AC6.3–AC6.5, G1.5, P6)", () => {
  it("AC6.5: persists 3s local draft across close/reopen, preserves on conflict/error, and clears only on HTTP 200/201", () => {
    assert.equal(DRAFT_AUTOSAVE_INTERVAL_MS, 3000);
    assert.equal(formatDraftStorageKey("uid-123", 4), "neurorx-draft:uid-123:4");

    const storage = createMemoryStorage();
    const base = buildValidDrug("levetiracetam");
    const edited = buildValidDrug("levetiracetam", {
      generic_name: "Levetiracetam XR Draft",
    });

    const saved = saveLocalDrugDraft(storage, "uid-123", 4, edited, "2026-11-14T12:00:00.000Z");
    assert.ok(saved);
    assert.equal(saved.uid, "uid-123");
    assert.equal(saved.baseRev, 4);

    // Simulates reopening modal on same uid+baseRev after closing without saving
    const loaded = loadLocalDrugDraft(storage, "uid-123", 4);
    assert.ok(loaded);
    assert.equal(loaded.data.generic_name, "Levetiracetam XR Draft");

    // Different baseRev does not collide
    assert.equal(loadLocalDrugDraft(storage, "uid-123", 5), null);

    // Clear removes all drafts for uid (simulating HTTP 200/201 completion)
    saveLocalDrugDraft(storage, "uid-123", 3, base, "2026-11-14T11:55:00.000Z");
    saveLocalDrugDraft(storage, "uid-other", 1, base, "2026-11-14T11:55:00.000Z");
    clearLocalDrugDraftsForUid(storage, "uid-123");
    assert.equal(loadLocalDrugDraft(storage, "uid-123", 4), null);
    assert.equal(loadLocalDrugDraft(storage, "uid-123", 3), null);
    assert.ok(loadLocalDrugDraft(storage, "uid-other", 1));
  });

  it("AC6.3: resolves 3-mode conflicts (Use Cloud, Smart Merge, Force Overwrite)", () => {
    const base = buildValidDrug("brivaracetam");
    const mine = buildValidDrug("brivaracetam", {
      generic_name: "Brivaracetam (My Edit)",
      hepatic: { value: "Reduce max dose in severe HI (Mine)", refs: base.hepatic.refs },
    });
    const cloudData = buildValidDrug("brivaracetam", {
      generic_name: "Brivaracetam (Cloud Edit)",
      black_box: {
        value: ["Psychiatric monitoring advised (Cloud only)"],
        refs: [{ source_id: "fda-keppra-label", locator: "Boxed", quote: "Cloud warning" }],
      },
    });
    const cloudRow = {
      uid: "uid-briv",
      slug: "brivaracetam",
      data: cloudData,
      contentHash: computeContentHashSync(cloudData),
      sectionHashes: {},
      rev: 5,
      changeSeq: 22,
      updatedAt: "2026-11-14T12:10:00.000Z",
      updatedBy: "dr-cloud",
      deletedAt: null,
    };

    const summary = buildConflictSummary(base, mine, cloudData);
    assert.ok(summary.mineVsCloudDiff.length > 0);
    assert.ok(summary.mergeResult.conflicts.some((c) => c.path === "/generic_name"));

    // Mode 1: Use Cloud
    const useCloud = resolveConflictChoice({
      mode: "use_cloud",
      base,
      mine,
      cloudRow,
    });
    assert.equal(useCloud.ok, true);
    assert.equal(useCloud.kind, "apply_cloud");
    assert.equal(useCloud.row.rev, 5);

    // Mode 2: Smart Merge fails until overlapping conflict path is picked
    const incompleteMerge = resolveConflictChoice({
      mode: "smart_merge",
      base,
      mine,
      cloudRow,
      conflictSelections: {},
    });
    assert.equal(incompleteMerge.ok, false);
    assert.ok(incompleteMerge.missingPaths.includes("/generic_name"));

    const smartMerge = resolveConflictChoice({
      mode: "smart_merge",
      base,
      mine,
      cloudRow,
      conflictSelections: { "/generic_name": "mine" },
    });
    assert.equal(smartMerge.ok, true);
    assert.equal(smartMerge.kind, "put");
    assert.equal(smartMerge.expectedRev, 5);
    assert.equal(smartMerge.data.generic_name, "Brivaracetam (My Edit)");
    assert.equal(smartMerge.data.hepatic.value, "Reduce max dose in severe HI (Mine)");
    assert.deepEqual(smartMerge.data.black_box.value, ["Psychiatric monitoring advised (Cloud only)"]);

    // Mode 3: Force Overwrite keeps my full payload against cloudRow.rev
    const force = resolveConflictChoice({
      mode: "force_overwrite",
      base,
      mine,
      cloudRow,
    });
    assert.equal(force.ok, true);
    assert.equal(force.kind, "put");
    assert.equal(force.expectedRev, 5);
    assert.equal(force.data.generic_name, "Brivaracetam (My Edit)");
    assert.equal(force.data.black_box.value, null);
  });

  it("AC6.4, G1.5, & P6: verify v2 seals hashes server-side, detects 409 conflicts, preserves uid on slug rename, and formats/restores revisions as draft", async () => {
    const repo = new MemoryDrugRepo();
    const invalidatedTags = [];
    const deps = {
      repo,
      isAdmin: true,
      actor: "chief-editor",
      onInvalidateTag: (tag) => invalidatedTags.push(tag),
    };

    // Unauthenticated verify rejected (AC4.2)
    const unauthSingle = await handleVerifyDrugV2({ repo, isAdmin: false }, { drug_id: "keppra" });
    const unauthAll = await handleVerifyAllDrugsV2({ repo, isAdmin: false }, {});
    assert.equal(unauthSingle.status, 401);
    assert.equal(unauthAll.status, 401);

    // Seed two draft drugs + one retired drug
    const c1 = await handleCreateDrug(deps, { data: buildValidDrug("keppra") });
    const c2 = await handleCreateDrug(deps, { data: buildValidDrug("lamictal") });
    const retiredData = buildValidDrug("retired-drug", { status: "retired" });
    const c3Row = await repo.create(
      retiredData,
      computeContentHashSync(retiredData),
      {},
      "chief-editor"
    );
    assert.equal(c1.status, 201);
    assert.equal(c2.status, 201);
    assert.equal(c3Row.data.status, "retired");
    const uid1 = c1.body.row.uid;

    // Single verify computes status='verified' + content_hash server-side
    const verifyRes = await handleVerifyDrugV2(deps, {
      uid: uid1,
      expected_rev: 1,
      verified_by: "Dr. Minh",
    });
    assert.equal(verifyRes.status, 200);
    assert.equal(verifyRes.body.unchanged, false);
    assert.equal(verifyRes.body.row.rev, 2);
    assert.equal(verifyRes.body.row.data.status, "verified");
    assert.equal(verifyRes.body.row.data.verification.verified_by, "Dr. Minh");
    assert.equal(
      verifyRes.body.row.data.verification.content_hash,
      computeContentHashSync(verifyRes.body.row.data)
    );

    // Stale expected_rev on verify returns 409 REV_CONFLICT with current row
    const verifyConflict = await handleVerifyDrugV2(deps, {
      uid: uid1,
      expected_rev: 1,
      verified_by: "Dr. Minh",
    });
    assert.equal(verifyConflict.status, 409);
    assert.equal(verifyConflict.body.code, "REV_CONFLICT");
    assert.equal(verifyConflict.body.currentRev, 2);
    assert.equal(verifyConflict.body.current.uid, uid1);

    // Bulk verify seals only unverified non-retired drafts (lamictal)
    const verifyAllRes = await handleVerifyAllDrugsV2(deps, { verified_by: "Bulk Reviewer" });
    assert.equal(verifyAllRes.status, 200);
    assert.equal(verifyAllRes.body.verified_count, 1);
    assert.equal(verifyAllRes.body.rows[0].slug, "lamictal");
    assert.equal(verifyAllRes.body.rows[0].data.status, "verified");
    assert.deepEqual(verifyAllRes.body.conflicts, []);

    const liveRows = await listAllLiveRows(repo);
    assert.equal(liveRows.length, 3);
    assert.equal(liveRows.find((r) => r.slug === "retired-drug").data.status, "retired");

    // P6: renaming slug updates slug while preserving the exact same uid
    const renamed = await handleUpdateDrug(deps, uid1, {
      expectedRev: 2,
      data: buildValidDrug("levetiracetam-xr", {
        generic_name: "Levetiracetam XR",
      }),
    });
    assert.equal(renamed.status, 200);
    assert.equal(renamed.body.row.uid, uid1);
    assert.equal(renamed.body.row.slug, "levetiracetam-xr");
    assert.equal(renamed.body.row.rev, 3);
    assert.equal(renamed.body.row.data.status, "draft");

    // AC6.4: history formatting and restoring rev 2 forces draft (G1.5)
    const histRes = await handleGetHistory(deps, uid1);
    assert.equal(histRes.status, 200);
    assert.equal(histRes.body.revisions.length, 3);
    const formatted = formatRevisionDiffEntries(histRes.body.revisions[0].patchDiff);
    assert.ok(formatted.some((entry) => entry.path === "/id" && entry.newPreview === "levetiracetam-xr"));

    const restored = await handleRestoreRevision(deps, uid1, {
      revisionRev: 2,
      expectedRev: 3,
    });
    assert.equal(restored.status, 200);
    assert.equal(restored.body.row.rev, 4);
    assert.equal(restored.body.row.slug, "keppra");
    assert.equal(restored.body.row.data.status, "draft");
    assert.equal(restored.body.row.data.verification, undefined);
  });
});
