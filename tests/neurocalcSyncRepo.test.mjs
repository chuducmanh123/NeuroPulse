import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeJsonPatch,
  computeRecordContentHashSync,
  computeRootHashFromEntries,
  computeSectionHashes,
} from "../src/lib/neurocalc/sync/jsonPatch.ts";
import { MemoryScaleRepo } from "../src/lib/neurocalc/sync/repoMemory.ts";
import { RepoError } from "../src/lib/neurocalc/sync/repo.ts";

function makeScale(id, shortName = "Alpha") {
  return {
    id,
    schema_version: 1,
    metadata: {
      name: `${shortName} Scale`,
      short_name: shortName,
      aliases: [],
      subspecialties: ["Stroke"],
      kind: "point_sum",
      summary: "Synthetic scale",
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
        label: "All",
        severity: "info",
        summary: "All",
        refs: [{ source_id: "r1", locator: "p.1" }],
      },
    ],
    assessment_guides: [],
    references: [{ id: "r1", citation: "Ref", year: 2024 }],
    status: "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  };
}

describe("NeuroCalc Sync v2 Repository (T5)", () => {
  it("handles create, slug uniqueness, update, unchanged no-op, and optimistic rev 409", async () => {
    const repo = new MemoryScaleRepo();
    const s1 = makeScale("alpha-scale", "Alpha");
    const h1 = computeRecordContentHashSync(s1);
    const sec1 = computeSectionHashes(s1);

    const created = await repo.create(s1, h1, sec1, "tester");
    assert.equal(created.rev, 1);
    assert.equal(created.changeSeq, 1);

    // Duplicate live slug rejected
    await assert.rejects(
      () => repo.create(s1, h1, sec1, "tester"),
      (err) => err instanceof RepoError && err.code === "SLUG_TAKEN"
    );

    // Identical update short-circuits without advancing rev
    const same = await repo.update(created.uid, 1, s1, h1, sec1, [], "tester");
    assert.equal(same.unchanged, true);
    assert.equal(same.row.rev, 1);

    // Real edit advances rev and updates rootHash
    const s2 = makeScale("alpha-scale", "Alpha v2");
    const h2 = computeRecordContentHashSync(s2);
    const sec2 = computeSectionHashes(s2);
    const patch = computeJsonPatch(s1, s2);
    const updated = await repo.update(created.uid, 1, s2, h2, sec2, patch, "tester");
    assert.equal(updated.unchanged, false);
    assert.equal(updated.row.rev, 2);

    // Stale expectedRev -> REV_CONFLICT with currentRev
    await assert.rejects(
      () => repo.update(created.uid, 1, s2, h2, sec2, [], "tester"),
      (err) =>
        err instanceof RepoError &&
        err.code === "REV_CONFLICT" &&
        err.currentRev === 2
    );

    const state = await repo.getSyncState();
    assert.equal(
      state.rootHash,
      computeRootHashFromEntries([
        { uid: created.uid, rev: 2, contentHash: h2 },
      ])
    );
  });

  it("handles tombstone delete, history, restore (forced draft), and retention purge", async () => {
    let nowMs = Date.parse("2026-01-01T00:00:00.000Z");
    const repo = new MemoryScaleRepo({ now: () => new Date(nowMs) });

    const s1 = makeScale("beta-scale", "Beta");
    const created = await repo.create(
      s1,
      computeRecordContentHashSync(s1),
      computeSectionHashes(s1),
      "tester"
    );

    const deleted = await repo.remove(created.uid, 1, "tester");
    assert.ok(deleted.deletedAt !== null);
    assert.equal(deleted.rev, 2);

    const changes = await repo.changesSince(0, 50);
    assert.equal(changes.rows.length, 1);
    assert.ok(changes.rows[0].deletedAt !== null);

    const hist = await repo.history(created.uid);
    assert.equal(hist.length, 2);
    assert.equal(hist[0].op, "delete");
    assert.equal(hist[1].op, "insert");

    // Restore from rev 1
    const restored = await repo.restore(
      created.uid,
      2,
      1,
      computeRecordContentHashSync(s1),
      computeSectionHashes(s1),
      [],
      "tester"
    );
    assert.equal(restored.deletedAt, null);
    assert.equal(restored.rev, 3);
    assert.equal(restored.data.status, "draft");

    // Soft-delete again, advance 100 days, and purge
    await repo.remove(created.uid, 3, "tester");
    nowMs += 100 * 86_400_000;
    const purgeRes = await repo.purge();
    assert.equal(purgeRes.tombstonesPurged, 1);
    assert.ok(purgeRes.purgeHorizonSeq >= 4);
  });
});
