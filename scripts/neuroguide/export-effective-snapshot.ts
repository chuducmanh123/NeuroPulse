#!/usr/bin/env node
/**
 * Phase 8.0 Read-Only Effective Snapshot Exporter for NeuroGuide Granular Sync v2
 *
 * Calls the current `loadMergedNeuroGuideData()` read path (guarded by a strict
 * read-only FS hook outside `data/neuroguide/_migration`), decomposes it into the
 * normalized 2-tier Granular Blocks + Merkle Graph (`NeuroGuideGraphSnapshot`), and writes:
 *   - data/neuroguide/_migration/snapshot-<YYYYMMDD>.json
 *   - data/neuroguide/_migration/summary-<YYYYMMDD>.json
 *
 * Usage:
 *   npm run ng:snapshot
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvLocal } from "../neurorx/migrate-to-v2.ts";

const ROOT_DIR = process.cwd();
const MIGRATION_DIR = path.join(ROOT_DIR, "data", "neuroguide", "_migration");

function isAllowedMigrationPath(target: fs.PathLike): boolean {
  const resolved = path.resolve(
    typeof target === "string"
      ? target
      : target instanceof URL
      ? fileURLToPath(target)
      : target.toString()
  );
  return resolved === MIGRATION_DIR || resolved.startsWith(`${MIGRATION_DIR}${path.sep}`);
}

function getDateStamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

async function run(): Promise<void> {
  // Load .env.local BEFORE dynamic import so src/lib/supabase.ts initializes with live credentials
  loadEnvLocal(ROOT_DIR);

  const [{ loadMergedNeuroGuideData }, { decomposeNeuroGuideStoreToGraph }] = await Promise.all([
    import("../../src/lib/neuroguide/guidelineStorage.ts"),
    import("../../src/lib/neuroguide/sync/blockGraph.ts"),
  ]);

  const origWriteFileSync = fs.writeFileSync;
  const origUnlinkSync = fs.unlinkSync;
  const origMkdirSync = fs.mkdirSync;

  fs.writeFileSync = ((
    file: fs.PathOrFileDescriptor,
    data: string | NodeJS.ArrayBufferView,
    options?: fs.WriteFileOptions
  ) => {
    if (typeof file === "number" || !isAllowedMigrationPath(file)) {
      return;
    }
    return origWriteFileSync.call(fs, file, data, options);
  }) as typeof fs.writeFileSync;

  fs.unlinkSync = ((target: fs.PathLike) => {
    if (!isAllowedMigrationPath(target)) {
      return;
    }
    return origUnlinkSync.call(fs, target);
  }) as typeof fs.unlinkSync;

  fs.mkdirSync = ((
    target: fs.PathLike,
    options?: fs.MakeDirectoryOptions | fs.Mode | null
  ) => {
    if (!isAllowedMigrationPath(target)) {
      return undefined;
    }
    return origMkdirSync.call(fs, target, options);
  }) as typeof fs.mkdirSync;

  let effectiveStore: Awaited<ReturnType<typeof loadMergedNeuroGuideData>>;
  try {
    effectiveStore = await loadMergedNeuroGuideData();
  } finally {
    fs.writeFileSync = origWriteFileSync;
    fs.unlinkSync = origUnlinkSync;
    fs.mkdirSync = origMkdirSync;
  }

  const graph = decomposeNeuroGuideStoreToGraph(effectiveStore);

  const blockCountsByType: Record<string, number> = {};
  for (const b of graph.blocks) {
    blockCountsByType[b.blockType] = (blockCountsByType[b.blockType] || 0) + 1;
  }

  const linkCountsByType: Record<string, number> = {};
  for (const edge of graph.blockLinks) {
    linkCountsByType[edge.linkType] = (linkCountsByType[edge.linkType] || 0) + 1;
  }

  const perProtocolHash: Record<
    string,
    { protocolType: string; blockCount: number; protocolHash: string }
  > = {};
  for (const p of graph.protocols) {
    perProtocolHash[p.slug] = {
      protocolType: p.protocolType,
      blockCount: p.blockOrder.length,
      protocolHash: p.protocolHash,
    };
  }

  const stamp = getDateStamp();
  fs.mkdirSync(MIGRATION_DIR, { recursive: true });

  const snapshotPath = path.join(MIGRATION_DIR, `snapshot-${stamp}.json`);
  const summaryPath = path.join(MIGRATION_DIR, `summary-${stamp}.json`);

  const summary = {
    storageSource: effectiveStore.storageSource,
    lastSyncedAt: effectiveStore.lastSyncedAt ?? null,
    totalGuidelines: effectiveStore.guidelines.length,
    totalConferences: effectiveStore.conferences.length,
    totalScenarios: effectiveStore.scenarios.length,
    totalPivotalTrials: effectiveStore.pivotalTrials.length,
    totalRecommendationAtoms: effectiveStore.recommendationAtoms.length,
    customRecLabelCount: Object.keys(effectiveStore.customRecLabels || {}).length,
    deletedGuidelineCount: (effectiveStore.deletedGuidelineIds || []).length,
    deletedTrialCount: (effectiveStore.deletedTrialIds || []).length,
    totalProtocols: graph.protocols.length,
    totalBlocks: graph.blocks.length,
    blockCountsByType,
    totalProtocolBlockEdges: graph.protocolBlocks.length,
    totalBlockLinkEdges: graph.blockLinks.length,
    linkCountsByType,
    rootHash: graph.rootHash,
    perProtocolHash,
    generatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(snapshotPath, JSON.stringify(graph, null, 2) + "\n", "utf-8");
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + "\n", "utf-8");

  console.log("=== NeuroGuide Phase 8.0 Effective Snapshot ===");
  console.log(`Storage source:   ${summary.storageSource}`);
  console.log(`Guidelines:       ${summary.totalGuidelines}`);
  console.log(`Conferences:      ${summary.totalConferences}`);
  console.log(`Scenarios:        ${summary.totalScenarios}`);
  console.log(`Pivotal trials:   ${summary.totalPivotalTrials}`);
  console.log(`Rec atoms:        ${summary.totalRecommendationAtoms}`);
  console.log(`Custom labels:    ${summary.customRecLabelCount}`);
  console.log(`Total protocols:  ${summary.totalProtocols}`);
  console.log(`Total blocks:     ${summary.totalBlocks} (${JSON.stringify(blockCountsByType)})`);
  console.log(`Cross-link edges: ${summary.totalBlockLinkEdges} (${JSON.stringify(linkCountsByType)})`);
  console.log(`Root Merkle hash: ${summary.rootHash}`);
  console.log(`Snapshot written: ${path.relative(ROOT_DIR, snapshotPath)}`);
  console.log(`Summary written:  ${path.relative(ROOT_DIR, summaryPath)}`);
}

run().catch((err) => {
  console.error("❌ ng:snapshot failed:", err);
  process.exit(1);
});
