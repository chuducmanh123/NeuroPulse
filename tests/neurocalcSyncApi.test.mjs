import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MemoryScaleRepo } from "../src/lib/neurocalc/sync/repoMemory.ts";
import {
  formatSyncETag,
  handleCreateScale,
  handleDeleteScale,
  handleGetChanges,
  handleGetHistory,
  handlePurge,
  handleRestoreScale,
  handleUpdateScale,
} from "../src/lib/neurocalc/sync/handlers.ts";

function makeScale(id, shortName = "Test") {
  return {
    id,
    schema_version: 1,
    metadata: {
      name: `${shortName} Scale`,
      short_name: shortName,
      aliases: [],
      subspecialties: ["Stroke"],
      kind: "point_sum",
      summary: "API test scale",
    },
    items: [
      {
        kind: "select",
        id: "q1",
        label: "Q1",
        required: true,
        options: [
          { id: "o0", label: "Zero", points: 0 },
          { id: "o1", label: "One", points: 1 },
        ],
      },
    ],
    scoring: { method: "sum", min_score: 0, max_score: 1, precision: 0 },
    interpretation: [
      {
        id: "b0",
        min: 0,
        max: 1,
        label: "Range",
        severity: "info",
        summary: "Range",
        refs: [{ source_id: "r1", locator: "p.1" }],
      },
    ],
    assessment_guides: [
      {
        id: "g1",
        target_type: "item",
        target_id: "q1",
        title: "Assess Q1",
        bedside_steps: ["Step 1"],
        pitfalls_and_exceptions: ["Pitfall 1"],
        refs: [{ source_id: "r1", locator: "p.1" }],
      },
    ],
    references: [{ id: "r1", citation: "Ref 1", year: 2024 }],
    status: "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  };
}

describe("NeuroCalc Sync v2 API Handlers (T6-T7)", () => {
  it("enforces admin auth on mutations, history, restore, and purge", async () => {
    const repo = new MemoryScaleRepo();
    const s = makeScale("auth-scale");

    assert.equal((await handleCreateScale({ repo, isAdmin: false }, { data: s })).status, 401);
    assert.equal(
      (await handleUpdateScale({ repo, isAdmin: false }, "u1", { expectedRev: 1, data: s })).status,
      401
    );
    assert.equal(
      (await handleDeleteScale({ repo, isAdmin: false }, "u1", { expectedRevParam: 1 })).status,
      401
    );
    assert.equal((await handleGetHistory({ repo, isAdmin: false }, "u1")).status, 401);
    assert.equal(
      (await handleRestoreScale({ repo, isAdmin: false }, "u1", { expectedRev: 1, revisionRev: 1 })).status,
      401
    );
    assert.equal((await handlePurge({ repo, isAdmin: false })).status, 401);
  });

  it("supports GET changes with ETag 304, Cache-Control no-store, 409 conflict, and granular assessment_guides diff", async () => {
    const repo = new MemoryScaleRepo();
    const s1 = makeScale("nihss-test", "NIHSS");

    const created = await handleCreateScale({ repo, isAdmin: true }, { data: s1 });
    assert.equal(created.status, 201);
    const uid = created.body.row.uid;
    const initialSectionHashes = created.body.row.sectionHashes;

    // GET changes -> 200 with ETag and Cache-Control: no-store
    const ch1 = await handleGetChanges({ repo }, { sinceParam: "0", limitParam: "50" });
    assert.equal(ch1.status, 200);
    assert.equal(ch1.headers["Cache-Control"], "no-store");
    assert.equal(ch1.body.changes.length, 1);

    const etag = formatSyncETag(ch1.body.maxSeq, ch1.body.rootHash);
    const ch304 = await handleGetChanges({ repo }, { ifNoneMatch: etag });
    assert.equal(ch304.status, 304);
    assert.equal(ch304.headers["Cache-Control"], "no-store");

    // Edit only assessment_guides -> only sectionHashes.assessment_guides changes
    const s2 = makeScale("nihss-test", "NIHSS");
    s2.assessment_guides[0].pitfalls_and_exceptions.push("Added pitfall");

    const updated = await handleUpdateScale(
      { repo, isAdmin: true },
      uid,
      { expectedRev: 1, data: s2 }
    );
    assert.equal(updated.status, 200);
    assert.equal(updated.body.row.rev, 2);
    assert.notEqual(
      updated.body.row.sectionHashes.assessment_guides,
      initialSectionHashes.assessment_guides
    );
    assert.equal(
      updated.body.row.sectionHashes.items,
      initialSectionHashes.items
    );

    // Stale expectedRev -> 409
    const conflict = await handleUpdateScale(
      { repo, isAdmin: true },
      uid,
      { expectedRev: 1, data: s2 }
    );
    assert.equal(conflict.status, 409);
    assert.equal(conflict.body.code, "REV_CONFLICT");

    // History & Restore
    const hist = await handleGetHistory({ repo, isAdmin: true }, uid);
    assert.equal(hist.status, 200);
    assert.equal(hist.body.revisions.length, 2);
    assert.ok(hist.body.revisions[0].patchDiff.length >= 1);

    const restored = await handleRestoreScale(
      { repo, isAdmin: true },
      uid,
      { expectedRev: 2, revisionRev: 1 }
    );
    assert.equal(restored.status, 200);
    assert.equal(restored.body.row.rev, 3);
    assert.equal(restored.body.row.data.assessment_guides[0].pitfalls_and_exceptions.length, 1);
  });
});
