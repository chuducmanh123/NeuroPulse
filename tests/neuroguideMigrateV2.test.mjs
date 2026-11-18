import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { MemoryNeuroGuideRepo } from "../src/lib/neuroguide/sync/repoMemory.ts";
import {
  findLatestNeuroGuideSnapshotPair,
  runNeuroGuideMigrationToV2,
} from "../scripts/neuroguide/migrate-to-v2.ts";

function loadPhase8Snapshot() {
  const { snapshotPath, summaryPath } = findLatestNeuroGuideSnapshotPair(
    path.resolve(process.cwd(), "data", "neuroguide", "_migration")
  );
  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf-8"));
  const summary = JSON.parse(fs.readFileSync(summaryPath, "utf-8"));
  return { snapshotPath, summaryPath, snapshot, summary };
}

describe("Phase 8.3 — migrate-to-v2.ts (NeuroGuide Granular Sync)", () => {
  it("AC8.3.1: --dry-run plans 1112 blocks + 22 protocols and leaves MemoryNeuroGuideRepo maxSeq=0 and rootHash='' untouched", async () => {
    const repo = new MemoryNeuroGuideRepo();
    const { snapshotPath, summaryPath, snapshot, summary } = loadPhase8Snapshot();

    assert.equal(snapshot.blocks.length, 1112);
    assert.equal(snapshot.protocols.length, 22);
    assert.equal(summary.totalBlocks, 1112);
    assert.equal(summary.totalProtocols, 22);

    const report = await runNeuroGuideMigrationToV2({
      repo,
      snapshot,
      summary,
      apply: false,
      snapshotFile: snapshotPath,
      summaryFile: summaryPath,
      writeReportFile: false,
    });

    assert.equal(report.mode, "dry-run");
    assert.equal(report.toCreateBlocksCount, 1112);
    assert.equal(report.toSkipBlocksCount, 0);
    assert.equal(report.createdBlocksCount, 0);
    assert.equal(report.toCreateProtocolsCount, 22);
    assert.equal(report.toSkipProtocolsCount, 0);
    assert.equal(report.createdProtocolsCount, 0);
    assert.equal(report.beforeState.maxSeq, 0);
    assert.equal(report.afterState.maxSeq, 0);
    assert.equal(report.afterState.rootHash, "");

    const afterState = await repo.getSyncState();
    assert.equal(afterState.maxSeq, 0);
    assert.equal(afterState.rootHash, "");
  });

  it("AC8.3.2 & AC8.3.3: --apply inserts 1112 blocks + 22 protocols + 1112 protocol edges + cross-links cleanly, matches summary.rootHash, and 2nd run is idempotent", async () => {
    const repo = new MemoryNeuroGuideRepo();
    const { snapshotPath, summaryPath, snapshot, summary } = loadPhase8Snapshot();

    const first = await runNeuroGuideMigrationToV2({
      repo,
      snapshot,
      summary,
      apply: true,
      snapshotFile: snapshotPath,
      summaryFile: summaryPath,
      writeReportFile: false,
    });

    assert.equal(first.mode, "apply");
    assert.equal(first.createdBlocksCount, 1112);
    assert.equal(first.toCreateBlocksCount, 1112);
    assert.equal(first.toSkipBlocksCount, 0);
    assert.equal(first.createdProtocolsCount, 22);
    assert.equal(first.toCreateProtocolsCount, 22);
    assert.equal(first.toSkipProtocolsCount, 0);
    assert.equal(first.afterState.maxSeq, 1134);
    assert.equal(first.afterState.rootHash, summary.rootHash);
    assert.equal(first.postCheck?.passed, true);
    assert.deepEqual(first.postCheck?.errors, []);
    assert.equal(first.postCheck?.liveBlockCount, 1112);
    assert.equal(first.postCheck?.liveProtocolCount, 22);
    assert.equal(first.postCheck?.protocolHashesMatchSummary, true);
    assert.equal(first.postCheck?.rootHashMatchesComputed, true);
    assert.equal(first.postCheck?.rootHashMatchesSummary, true);

    const edges = await repo.listProtocolEdges();
    assert.equal(edges.length, 1112);

    const links = await repo.listBlockLinks();
    assert.equal(links.length, first.totalSnapshotLinks);

    // Check I10 envelope hygiene on a live block
    const blockPage = await repo.changesSince(0, 10);
    assert.ok(blockPage.rows.length > 0);
    const sampleData = blockPage.rows[0].data;
    assert.equal("uid" in sampleData, false);
    assert.equal("rev" in sampleData, false);
    assert.equal("changeSeq" in sampleData, false);

    // Second --apply run: idempotent (0 created, all skipped, maxSeq unchanged)
    const second = await runNeuroGuideMigrationToV2({
      repo,
      snapshot,
      summary,
      apply: true,
      snapshotFile: snapshotPath,
      summaryFile: summaryPath,
      writeReportFile: false,
    });

    assert.equal(second.toCreateBlocksCount, 0);
    assert.equal(second.toSkipBlocksCount, 1112);
    assert.equal(second.createdBlocksCount, 0);
    assert.equal(second.toCreateProtocolsCount, 0);
    assert.equal(second.toSkipProtocolsCount, 22);
    assert.equal(second.createdProtocolsCount, 0);
    assert.equal(second.upsertedLinksCount, 0);
    assert.equal(second.afterState.maxSeq, 1134);
    assert.equal(second.postCheck?.passed, true);
  });

  it("AC8.3.3: post-check fails (passed=false with explicit error) when perProtocolHash or blockCountsByType mismatches", async () => {
    const repo = new MemoryNeuroGuideRepo();
    const { snapshotPath, summaryPath, snapshot, summary } = loadPhase8Snapshot();

    const tamperedSummary = structuredClone(summary);
    const firstProtoSlug = Object.keys(tamperedSummary.perProtocolHash)[0];
    tamperedSummary.perProtocolHash[firstProtoSlug].protocolHash = "0".repeat(64);
    tamperedSummary.blockCountsByType.recommendation =
      (tamperedSummary.blockCountsByType.recommendation || 0) + 1;

    const report = await runNeuroGuideMigrationToV2({
      repo,
      snapshot,
      summary: tamperedSummary,
      apply: true,
      snapshotFile: snapshotPath,
      summaryFile: summaryPath,
      writeReportFile: false,
    });

    assert.equal(report.postCheck?.passed, false);
    assert.equal(report.postCheck?.protocolHashesMatchSummary, false);
    assert.ok((report.postCheck?.errors.length ?? 0) >= 2);
    assert.ok(
      report.postCheck?.errors.some((e) =>
        e.includes(`Protocol Merkle hash mismatch vs summary for ${firstProtoSlug}`)
      )
    );
    assert.ok(
      report.postCheck?.errors.some((e) =>
        e.includes("Block type 'recommendation' count mismatch")
      )
    );
  });
});
