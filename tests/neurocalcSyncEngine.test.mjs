import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MemoryLocalStore } from "../src/lib/neurocalc/sync/localStore.ts";
import { createSyncEngine } from "../src/lib/neurocalc/sync/syncEngine.ts";
import { computeRecordContentHashSync } from "../src/lib/neurocalc/sync/jsonPatch.ts";
import { deriveScalesFromRows } from "../src/hooks/useNeuroCalcScales.ts";

function makeRow(uid, slug, shortName, rev, seq, opts = {}) {
  const data = {
    id: slug,
    schema_version: 1,
    metadata: {
      name: `${shortName} Scale`,
      short_name: shortName,
      aliases: [],
      subspecialties: ["Stroke"],
      kind: "point_sum",
      summary: "Test",
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
    assessment_guides: [],
    references: [{ id: "r1", citation: "Ref", year: 2024 }],
    status: opts.verified ? "verified" : "draft",
    verification: { verified_by: null, verified_at: null, content_hash: null },
  };
  if (opts.verified && !opts.tamper) {
    data.verification = {
      verified_by: "Dr. Test",
      verified_at: "2026-11-26T00:00:00.000Z",
      content_hash: computeRecordContentHashSync(data),
    };
  }
  return {
    uid,
    slug,
    data,
    contentHash: computeRecordContentHashSync(data),
    sectionHashes: {},
    rev,
    changeSeq: seq,
    updatedAt: "2026-11-26T00:00:00.000Z",
    updatedBy: "tester",
    deletedAt: opts.deleted ? "2026-11-26T00:01:00.000Z" : null,
  };
}

describe("NeuroCalc Client SyncEngine & Hook Derivation (T8)", () => {
  it("bootstraps, handles 304, applies tombstones, resets on purge horizon, and survives offline", async () => {
    const store = new MemoryLocalStore();
    const r1 = makeRow("u1", "gcs", "GCS", 1, 1, { verified: true });
    let mode = "bootstrap";

    const engine = createSyncEngine({
      store,
      fetchChanges: async ({ since }) => {
        if (mode === "bootstrap") {
          return {
            status: 200,
            eTag: '"ncalc-v2-1-h1"',
            body: {
              changes: [r1],
              maxSeq: 1,
              rootHash: "h1",
              hasMore: false,
              reset: false,
            },
          };
        }
        if (mode === "not_modified") {
          return { status: 304, eTag: '"ncalc-v2-1-h1"' };
        }
        if (mode === "offline") {
          throw new Error("Network down");
        }
        if (since > 0) {
          return {
            status: 200,
            eTag: '"ncalc-v2-2-h2"',
            body: {
              changes: [],
              maxSeq: 2,
              rootHash: "h2",
              hasMore: false,
              reset: true,
            },
          };
        }
        return {
          status: 200,
          eTag: '"ncalc-v2-2-h2"',
          body: {
            changes: [makeRow("u1", "gcs", "GCS", 2, 2, { deleted: true })],
            maxSeq: 2,
            rootHash: "h2",
            hasMore: false,
            reset: false,
          },
        };
      },
    });

    const snap1 = await engine.start();
    assert.equal(snap1.status, "ready");
    assert.equal(snap1.rows.size, 1);

    mode = "not_modified";
    const snap304 = await engine.pull();
    assert.equal(snap304.status, "ready");
    assert.equal(snap304.rows.size, 1);

    mode = "offline";
    const snapOff = await engine.pull();
    assert.equal(snapOff.status, "offline");
    assert.equal(snapOff.rows.size, 1);

    mode = "reset";
    const snapReset = await engine.pull();
    assert.equal(snapReset.status, "ready");
    assert.equal(snapReset.rows.size, 0);
  });

  it("derives sorted scales and downgrades tampered verified hashes", () => {
    const rows = new Map();
    rows.set("u1", makeRow("u1", "nihss", "NIHSS", 1, 1, { verified: true }));
    rows.set("u2", makeRow("u2", "abc-2", "ABC/2", 1, 2, { verified: true, tamper: true }));

    const { scales } = deriveScalesFromRows(rows);
    assert.equal(scales.length, 2);
    assert.equal(scales[0].scale.id, "abc-2");
    assert.equal(scales[0].effectiveStatus, "draft");
    assert.equal(scales[1].scale.id, "nihss");
    assert.equal(scales[1].effectiveStatus, "verified");
  });
});
