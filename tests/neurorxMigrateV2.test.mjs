import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { MemoryDrugRepo } from "../src/lib/neurorx/sync/repoMemory.ts";
import {
  findLatestSnapshotPair,
  runMigrationToV2,
} from "../scripts/neurorx/migrate-to-v2.ts";

function loadPhase0Snapshot() {
  const { snapshotPath, summaryPath } = findLatestSnapshotPair(
    path.resolve(process.cwd(), "data", "neurorx", "_migration")
  );
  const records = JSON.parse(fs.readFileSync(snapshotPath, "utf-8"));
  const summary = JSON.parse(fs.readFileSync(summaryPath, "utf-8"));
  return { snapshotPath, summaryPath, records, summary };
}

describe("Phase 3 — migrate-to-v2.ts (AC3.1–AC3.3)", () => {
  it("AC3.1: --dry-run plans 69 creates and leaves MemoryDrugRepo maxSeq=0 and rootHash='' untouched", async () => {
    const repo = new MemoryDrugRepo();
    const { snapshotPath, summaryPath, records, summary } = loadPhase0Snapshot();

    assert.equal(records.length, 69);
    assert.equal(summary.total, 69);

    const report = await runMigrationToV2({
      repo,
      records,
      summary,
      apply: false,
      snapshotFile: snapshotPath,
      summaryFile: summaryPath,
      writeReportFile: false,
    });

    assert.equal(report.mode, "dry-run");
    assert.equal(report.toCreateCount, 69);
    assert.equal(report.toSkipCount, 0);
    assert.equal(report.createdCount, 0);
    assert.equal(report.beforeState.maxSeq, 0);
    assert.equal(report.afterState.maxSeq, 0);
    assert.equal(report.afterState.rootHash, "");

    const afterState = await repo.getSyncState();
    assert.equal(afterState.maxSeq, 0);
    assert.equal(afterState.rootHash, "");
  });

  it("AC3.2 & AC3.3: --apply inserts byte-for-byte records, passes post-check, and 2nd run skips all 69 (idempotent)", async () => {
    const repo = new MemoryDrugRepo();
    const { snapshotPath, summaryPath, records, summary } = loadPhase0Snapshot();

    const first = await runMigrationToV2({
      repo,
      records,
      summary,
      apply: true,
      snapshotFile: snapshotPath,
      summaryFile: summaryPath,
      writeReportFile: false,
    });

    assert.equal(first.mode, "apply");
    assert.equal(first.createdCount, 69);
    assert.equal(first.toCreateCount, 69);
    assert.equal(first.toSkipCount, 0);
    assert.equal(first.afterState.maxSeq, 69);
    assert.ok(/^[0-9a-f]{64}$/.test(first.afterState.rootHash));
    assert.equal(first.postCheck?.passed, true);
    assert.deepEqual(first.postCheck?.errors, []);
    assert.equal(first.postCheck?.liveCount, 69);
    assert.equal(first.postCheck?.verifiedCount, summary.countByEffectiveStatus.verified);
    assert.equal(first.postCheck?.draftCount, summary.countByEffectiveStatus.draft);
    assert.equal(first.postCheck?.retiredCount, summary.countByEffectiveStatus.retired);
    assert.equal(first.postCheck?.rootHashMatchesComputed, true);

    // Byte-for-byte check against snapshot record without envelope key pollution (I10)
    const { rows } = await repo.changesSince(0, 500);
    const liveLevetiracetam = rows.find((r) => r.slug === "levetiracetam-oral");
    const snapLevetiracetam = records.find((r) => r.id === "levetiracetam-oral");
    assert.ok(liveLevetiracetam);
    assert.deepEqual(liveLevetiracetam.data, snapLevetiracetam);
    assert.equal("uid" in liveLevetiracetam.data, false);
    assert.equal("rev" in liveLevetiracetam.data, false);

    // Second apply run: idempotent (0 created, 69 skipped)
    const second = await runMigrationToV2({
      repo,
      records,
      summary,
      apply: true,
      snapshotFile: snapshotPath,
      summaryFile: summaryPath,
      writeReportFile: false,
    });

    assert.equal(second.toCreateCount, 0);
    assert.equal(second.toSkipCount, 69);
    assert.equal(second.createdCount, 0);
    assert.equal(second.afterState.maxSeq, 69);
    assert.equal(second.postCheck?.passed, true);
  });

  it("AC3.3: post-check fails (passed=false with explicit error) when summary hash or counts mismatch", async () => {
    const repo = new MemoryDrugRepo();
    const { snapshotPath, summaryPath, records, summary } = loadPhase0Snapshot();

    const tamperedSummary = structuredClone(summary);
    const firstSlug = tamperedSummary.slugs[0];
    tamperedSummary.perSlugContentHash[firstSlug] = "0".repeat(64);
    tamperedSummary.countByEffectiveStatus.verified = summary.countByEffectiveStatus.verified + 1;

    const report = await runMigrationToV2({
      repo,
      records,
      summary: tamperedSummary,
      apply: true,
      snapshotFile: snapshotPath,
      summaryFile: summaryPath,
      writeReportFile: false,
    });

    assert.equal(report.postCheck?.passed, false);
    assert.ok((report.postCheck?.errors.length ?? 0) >= 2);
    assert.ok(
      report.postCheck?.errors.some((e) => e.includes(`Content hash mismatch vs summary for ${firstSlug}`))
    );
    assert.ok(
      report.postCheck?.errors.some((e) => e.includes("Verified count mismatch"))
    );
  });
});
