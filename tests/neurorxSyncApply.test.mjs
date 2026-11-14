import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyChanges } from "../src/lib/neurorx/sync/applyChanges.ts";

function makeSyncRow(uid, slug, rev, changeSeq, deletedAt = null) {
  return {
    uid,
    slug,
    data: {
      id: slug,
      generic_name: `${slug} v${rev}`,
      status: "draft",
    },
    contentHash: `hash-${uid}-${rev}`,
    sectionHashes: { core: `sec-${uid}-${rev}` },
    rev,
    changeSeq,
    updatedAt: "2026-11-14T12:00:00Z",
    updatedBy: "tester",
    deletedAt,
  };
}

function shuffleWithSeed(items, seed) {
  const arr = [...items];
  let state = seed >>> 0;
  for (let i = arr.length - 1; i > 0; i--) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const j = state % (i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

describe("NeuroRx Sync v2 — Pure applyChanges() Property Suite (I7)", () => {
  it("is idempotent: applying the same incoming batch twice is a clean no-op the second time", () => {
    const initial = new Map();
    const row1 = makeSyncRow("uid-1", "levetiracetam", 1, 10);
    const row2 = makeSyncRow("uid-2", "apixaban", 1, 11);

    const first = applyChanges(initial, [row1, row2]);
    assert.equal(first.applied.length, 2);
    assert.equal(first.removed.length, 0);
    assert.equal(first.next.size, 2);

    const second = applyChanges(first.next, [row1, row2]);
    assert.equal(second.applied.length, 0);
    assert.equal(second.removed.length, 0);
    assert.deepEqual(
      Array.from(second.next.entries()),
      Array.from(first.next.entries())
    );
  });

  it("ignores stale revisions and prevents deleted unknown uid tombstones from resurrecting", () => {
    const start = new Map([["uid-a", makeSyncRow("uid-a", "drug-a", 3, 30)]]);

    const stale = applyChanges(start, [makeSyncRow("uid-a", "drug-a", 2, 20)]);
    assert.equal(stale.applied.length, 0);
    assert.equal(stale.next.get("uid-a")?.rev, 3);

    // Tombstone for unknown uid is a no-op on Map and blocks stale rev from resurrecting it
    const unknownTombstone = applyChanges(
      start,
      [makeSyncRow("uid-ghost", "ghost", 2, 25, "2026-11-14T12:05:00Z")]
    );
    assert.equal(unknownTombstone.applied.length, 0);
    assert.equal(unknownTombstone.removed.length, 0);
    assert.equal(unknownTombstone.next.has("uid-ghost"), false);

    const lateRev1 = applyChanges(
      unknownTombstone.next,
      [makeSyncRow("uid-ghost", "ghost", 1, 15, null)]
    );
    assert.equal(lateRev1.next.has("uid-ghost"), false);
  });

  it("coexists cleanly when same slug is deleted under old uid and recreated with new uid (Bug B4)", () => {
    const oldUid = "uid-old-slug";
    const newUid = "uid-new-slug";
    const start = new Map([[oldUid, makeSyncRow(oldUid, "valproate", 1, 10)]]);

    const events = [
      makeSyncRow(oldUid, "valproate", 2, 11, "2026-11-14T12:10:00Z"),
      makeSyncRow(newUid, "valproate", 1, 12, null),
    ];

    const res1 = applyChanges(start, events);
    const res2 = applyChanges(start, [events[1], events[0]]);

    for (const res of [res1, res2]) {
      assert.equal(res.next.has(oldUid), false);
      assert.equal(res.next.get(newUid)?.slug, "valproate");
      assert.equal(res.next.get(newUid)?.rev, 1);
      assert.deepEqual(res.removed, [oldUid]);
      assert.equal(res.applied.length, 1);
    }
  });

  it("property test: 100 random permutations and multi-chunk splits produce identical final state", () => {
    const stream = [
      makeSyncRow("uid-1", "alpha", 1, 1),
      makeSyncRow("uid-1", "alpha", 2, 2),
      makeSyncRow("uid-1", "alpha", 3, 5, "2026-11-14T12:01:00Z"), // tombstoned
      makeSyncRow("uid-2", "alpha", 1, 6, null), // recreated slug new uid
      makeSyncRow("uid-2", "alpha", 2, 8, null), // updated
      makeSyncRow("uid-3", "beta", 1, 3, null),
      makeSyncRow("uid-3", "beta", 4, 9, null),
      makeSyncRow("uid-4", "gamma", 1, 4, null),
      makeSyncRow("uid-4", "gamma", 2, 7, "2026-11-14T12:02:00Z"), // tombstoned
      makeSyncRow("uid-4", "gamma", 3, 10, null), // restored!
    ];

    const canonical = applyChanges(new Map(), stream).next;
    assert.deepEqual(
      Array.from(canonical.keys()).sort(),
      ["uid-2", "uid-3", "uid-4"]
    );
    assert.equal(canonical.get("uid-2")?.rev, 2);
    assert.equal(canonical.get("uid-3")?.rev, 4);
    assert.equal(canonical.get("uid-4")?.rev, 3);

    for (let seed = 1; seed <= 100; seed++) {
      const shuffled = shuffleWithSeed(stream, seed);

      // Single-batch shuffled apply
      const single = applyChanges(new Map(), shuffled).next;
      assert.deepEqual(
        Array.from(single.entries()),
        Array.from(canonical.entries()),
        `Single batch mismatch at permutation seed=${seed}`
      );

      // Multi-chunk shuffled sequential apply
      let state = new Map();
      for (let i = 0; i < shuffled.length; i += 3) {
        const res = applyChanges(state, shuffled.slice(i, i + 3));
        state = res.next;
      }
      assert.deepEqual(
        Array.from(state.entries()),
        Array.from(canonical.entries()),
        `Chunked apply mismatch at permutation seed=${seed}`
      );
    }
  });
});
