import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { computeRecordContentHashSync } from "../src/lib/neurorx/sync/jsonPatch.ts";
import {
  buildDrugSelectionSearchParams,
  formatSyncStatusView,
} from "../src/lib/neurorx/sync/lookupHelpers.ts";
import { deriveDrugsFromRows } from "../src/hooks/useNeuroRxDrugs.ts";
import { parseQuery, searchDrugs } from "../src/lib/neurorx/omnibar.ts";

function loadAllDrugFixtures() {
  const dir = path.resolve(process.cwd(), "data", "neurorx", "drugs");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
  return files.map((file, idx) => {
    const data = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
    return {
      uid: `uid-${idx + 1}`,
      slug: data.id,
      data,
      contentHash: computeRecordContentHashSync(data),
      sectionHashes: {},
      rev: 1,
      changeSeq: idx + 1,
      createdAt: "2026-11-14T00:00:00.000Z",
      updatedAt: "2026-11-14T00:00:00.000Z",
      updatedBy: "system",
      deletedAt: null,
    };
  });
}

describe("Phase 6a — Lookup V2 Helpers, Deep Links & Sub-150ms Latency", () => {
  it("formatSyncStatusView renders exact §5.4 English status strings", () => {
    assert.deepEqual(
      formatSyncStatusView({
        syncStatus: "loading",
        lastSyncAt: null,
        lastChangeCount: 0,
        lastSeq: 0,
        isOnline: true,
      }),
      {
        kind: "updating",
        primaryText: "Updating…",
        updatedBadgeText: null,
      },
    );

    assert.deepEqual(
      formatSyncStatusView({
        syncStatus: "syncing",
        lastSyncAt: "2026-11-14T12:03:00.000Z",
        lastChangeCount: 2,
        lastSeq: 12,
        isOnline: true,
      }),
      {
        kind: "updating",
        primaryText: "Updating…",
        updatedBadgeText: "2 drugs updated",
      },
    );

    assert.deepEqual(
      formatSyncStatusView({
        syncStatus: "ready",
        lastSyncAt: "2026-11-14T12:03:00.000Z",
        lastChangeCount: 0,
        lastSeq: 12,
        isOnline: false,
      }),
      {
        kind: "offline",
        primaryText: "Offline — showing saved data",
        updatedBadgeText: null,
      },
    );

    assert.deepEqual(
      formatSyncStatusView({
        syncStatus: "error",
        lastSyncAt: null,
        lastChangeCount: 0,
        lastSeq: 12,
        isOnline: true,
      }),
      {
        kind: "error",
        primaryText: "Sync issue — showing saved data",
        updatedBadgeText: null,
      },
    );

    const localTime = new Date(2026, 10, 14, 12, 3, 0).toISOString();
    assert.deepEqual(
      formatSyncStatusView({
        syncStatus: "ready",
        lastSyncAt: localTime,
        lastChangeCount: 1,
        lastSeq: 109,
        isOnline: true,
      }),
      {
        kind: "ready",
        primaryText: "Up to date · 12:03 · seq #109",
        updatedBadgeText: "1 drug updated",
      },
    );

    assert.deepEqual(
      formatSyncStatusView({
        syncStatus: "ready",
        lastSyncAt: null,
        lastChangeCount: 0,
        lastSeq: 0,
        isOnline: true,
      }),
      {
        kind: "ready",
        primaryText: "Up to date · seq #0",
        updatedBadgeText: null,
      },
    );
  });

  it("buildDrugSelectionSearchParams preserves patient context for deep links and clears drug on back", () => {
    const parsed = parseQuery("keppra 60kg crcl 35 age 70 female");
    const selectedQs = buildDrugSelectionSearchParams(
      "?tab=lookup&scr=1.4mgdl",
      "levetiracetam-oral",
      parsed.patient,
    );

    const selectedParams = new URLSearchParams(selectedQs);
    assert.equal(selectedParams.get("tab"), "lookup");
    assert.equal(selectedParams.get("drug"), "levetiracetam-oral");
    assert.equal(selectedParams.get("w"), "60");
    assert.equal(selectedParams.get("crcl"), "35");
    assert.equal(selectedParams.get("scr"), "1.4mgdl");
    assert.equal(selectedParams.get("age"), "70");
    assert.equal(selectedParams.get("sex"), "female");

    const backQs = buildDrugSelectionSearchParams(selectedQs, null);
    const backParams = new URLSearchParams(backQs);
    assert.equal(backParams.get("drug"), null);
    assert.equal(backParams.get("w"), "60");
    assert.equal(backParams.get("crcl"), "35");
  });

  it("AC6.2: resolves drug click -> URL state -> detail lookup across all mirror drugs in < 150ms with 0 network calls", () => {
    const fixtures = loadAllDrugFixtures();
    assert.ok(fixtures.length >= 69);

    const rowsMap = new Map(fixtures.map((row) => [row.uid, row]));
    const { drugs, rowsBySlug } = deriveDrugsFromRows(rowsMap);
    assert.equal(drugs.length, fixtures.length);
    assert.equal(rowsBySlug.size, fixtures.length);

    const originalFetch = globalThis.fetch;
    let networkCalls = 0;
    globalThis.fetch = async () => {
      networkCalls += 1;
      throw new Error("Network request attempted during local drug selection");
    };

    try {
      let maxElapsedMs = 0;
      let totalElapsedMs = 0;

      for (const item of drugs) {
        const t0 = performance.now();
        const filtered = searchDrugs([item.drug.id.slice(0, 4)], drugs);
        assert.ok(filtered.length >= 1);
        const qs = buildDrugSelectionSearchParams("?tab=lookup&w=65&crcl=45", item.drug.id);
        const targetId = new URLSearchParams(qs).get("drug");
        const resolved = drugs.find((entry) => entry.drug.id === targetId);
        const elapsedMs = performance.now() - t0;

        assert.ok(resolved, `Failed to resolve ${item.drug.id}`);
        assert.equal(resolved.drug.id, item.drug.id);

        totalElapsedMs += elapsedMs;
        if (elapsedMs > maxElapsedMs) {
          maxElapsedMs = elapsedMs;
        }
      }

      const avgElapsedMs = totalElapsedMs / drugs.length;
      assert.equal(networkCalls, 0);
      assert.ok(maxElapsedMs < 150, `Expected max < 150ms, got ${maxElapsedMs.toFixed(3)}ms`);
      assert.ok(avgElapsedMs < 20, `Expected avg < 20ms, got ${avgElapsedMs.toFixed(3)}ms`);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
