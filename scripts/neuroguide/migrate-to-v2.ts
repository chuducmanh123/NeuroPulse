#!/usr/bin/env node
/**
 * Phase 8.3 Data Migration Script for NeuroGuide Granular Sync v2
 *
 * Reads ONLY the frozen Phase 8.0 snapshot + summary from data/neuroguide/_migration/
 * (never legacy /tmp or legacy neuroguide_docs) and idempotently seeds:
 *   - neuroguide_content_blocks
 *   - neuroguide_protocols & neuroguide_protocol_blocks
 *   - neuroguide_block_links
 * via NeuroGuideRepo (SupabaseNeuroGuideRepo in CLI mode).
 *
 * Default mode is --dry-run (strictly read-only).
 * Pass --apply to write missing nodes/edges and verify Merkle post-checks.
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadEnvLocal } from "../neurorx/migrate-to-v2.ts";
import {
  computeBlockContentHash,
  computeBlockSectionHashes,
  computeNeuroGuideRootHash,
} from "../../src/lib/neuroguide/sync/blockGraph.ts";
import type { NeuroGuideRepo } from "../../src/lib/neuroguide/sync/repo.ts";
import { SupabaseNeuroGuideRepo } from "../../src/lib/neuroguide/sync/repoSupabase.ts";
import type {
  NeuroGuideBlockLinkEdge,
  NeuroGuideContentBlockRow,
  NeuroGuideGraphSnapshot,
  NeuroGuideProtocolEdgeInput,
  NeuroGuideProtocolRow,
  SyncState,
} from "../../src/lib/neuroguide/sync/types.ts";

export interface NeuroGuideMigrationSummary {
  storageSource?: string;
  lastSyncedAt?: string | null;
  totalProtocols: number;
  totalBlocks: number;
  blockCountsByType: Record<string, number>;
  totalProtocolBlockEdges: number;
  totalBlockLinkEdges: number;
  linkCountsByType: Record<string, number>;
  rootHash: string;
  perProtocolHash: Record<
    string,
    {
      protocolType: string;
      blockCount: number;
      protocolHash: string;
    }
  >;
  generatedAt?: string;
}

export interface NeuroGuideMigrationPostCheck {
  passed: boolean;
  errors: string[];
  liveBlockCount: number;
  liveProtocolCount: number;
  liveLinkCount: number;
  blockCountsByType: Record<string, number>;
  protocolHashesMatchSummary: boolean;
  rootHashMatchesComputed: boolean;
  rootHashMatchesSummary: boolean;
}

export interface NeuroGuideMigrationReport {
  mode: "dry-run" | "apply";
  snapshotFile: string;
  summaryFile: string;
  totalSnapshotBlocks: number;
  totalSnapshotProtocols: number;
  totalSnapshotLinks: number;
  existingLiveBlocks: number;
  existingLiveProtocols: number;
  toCreateBlocksCount: number;
  toSkipBlocksCount: number;
  createdBlocksCount: number;
  toCreateProtocolsCount: number;
  toSkipProtocolsCount: number;
  createdProtocolsCount: number;
  upsertedLinksCount: number;
  beforeState: SyncState;
  afterState: SyncState;
  recomputedRootHash: string | null;
  postCheck?: NeuroGuideMigrationPostCheck;
  reportPath?: string;
  generatedAt: string;
}

export interface RunNeuroGuideMigrationOptions {
  repo: NeuroGuideRepo;
  snapshot: NeuroGuideGraphSnapshot;
  summary: NeuroGuideMigrationSummary;
  apply?: boolean;
  concurrency?: number;
  snapshotFile?: string;
  summaryFile?: string;
  reportDir?: string;
  writeReportFile?: boolean;
}

const DEFAULT_MIGRATION_DIR = path.resolve(process.cwd(), "data", "neuroguide", "_migration");
const FORBIDDEN_DATA_KEYS = ["uid", "rev", "changeSeq", "deletedAt", "change_seq", "deleted_at"];

function findForbiddenEnvelopeKeys(data: unknown): string[] {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return ["<non-object-data>"];
  }
  const obj = data as Record<string, unknown>;
  return FORBIDDEN_DATA_KEYS.filter((k) => Object.prototype.hasOwnProperty.call(obj, k));
}

function formatReportTimestamp(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${d}-${hh}${mm}${ss}`;
}

export async function fetchAllBlockChanges(
  repo: NeuroGuideRepo
): Promise<NeuroGuideContentBlockRow[]> {
  const byUid = new Map<string, NeuroGuideContentBlockRow>();
  let cursor = 0;

  for (;;) {
    const page = await repo.changesSince(cursor, 500);
    if (page.rows.length === 0) break;

    let maxPageSeq = cursor;
    for (const row of page.rows) {
      byUid.set(row.uid, row);
      if (row.changeSeq > maxPageSeq) {
        maxPageSeq = row.changeSeq;
      }
    }

    if (page.rows.length < 500 || maxPageSeq >= page.maxSeq || maxPageSeq === cursor) {
      break;
    }
    cursor = maxPageSeq;
  }

  return Array.from(byUid.values());
}

export async function fetchAllProtocolChanges(
  repo: NeuroGuideRepo
): Promise<NeuroGuideProtocolRow[]> {
  const byUid = new Map<string, NeuroGuideProtocolRow>();
  let cursor = 0;

  for (;;) {
    const page = await repo.protocolChangesSince(cursor, 500);
    if (page.rows.length === 0) break;

    let maxPageSeq = cursor;
    for (const row of page.rows) {
      byUid.set(row.uid, row);
      if (row.changeSeq > maxPageSeq) {
        maxPageSeq = row.changeSeq;
      }
    }

    if (page.rows.length < 500 || maxPageSeq >= page.maxSeq || maxPageSeq === cursor) {
      break;
    }
    cursor = maxPageSeq;
  }

  return Array.from(byUid.values());
}

export function findLatestNeuroGuideSnapshotPair(migrationDir = DEFAULT_MIGRATION_DIR): {
  snapshotPath: string;
  summaryPath: string;
} {
  if (!fs.existsSync(migrationDir)) {
    throw new Error(`Migration directory not found: ${migrationDir}`);
  }

  const files = fs.readdirSync(migrationDir);
  const snapshots = files
    .filter((f) => /^snapshot-\d{8}(?:-[\w-]+)?\.json$/.test(f))
    .sort()
    .reverse();

  if (snapshots.length === 0) {
    throw new Error(`No snapshot-*.json found in ${migrationDir}. Run npm run ng:snapshot first.`);
  }

  const snapshotName = snapshots[0];
  const candidateSummary = snapshotName.replace(/^snapshot-/, "summary-");
  const snapshotPath = path.join(migrationDir, snapshotName);
  let summaryPath = path.join(migrationDir, candidateSummary);

  if (!fs.existsSync(summaryPath)) {
    const summaries = files
      .filter((f) => /^summary-\d{8}(?:-[\w-]+)?\.json$/.test(f))
      .sort()
      .reverse();
    if (summaries.length === 0) {
      throw new Error(`No matching summary-*.json found in ${migrationDir}.`);
    }
    summaryPath = path.join(migrationDir, summaries[0]);
  }

  return { snapshotPath, summaryPath };
}

function dedupeBlockLinks(links: readonly NeuroGuideBlockLinkEdge[]): NeuroGuideBlockLinkEdge[] {
  const byKey = new Map<string, NeuroGuideBlockLinkEdge>();
  for (const link of links) {
    const key = `${link.srcBlockUid}|${link.dstBlockUid}|${link.linkType}`;
    byKey.set(key, link);
  }
  return Array.from(byKey.values());
}

async function runWithConcurrency<T>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  if (items.length === 0) return;
  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  let nextIdx = 0;

  async function nextTask(): Promise<void> {
    for (;;) {
      const current = nextIdx;
      nextIdx += 1;
      if (current >= items.length) return;
      await worker(items[current]);
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => nextTask()));
}

export async function runNeuroGuideMigrationToV2(
  options: RunNeuroGuideMigrationOptions
): Promise<NeuroGuideMigrationReport> {
  const {
    repo,
    snapshot,
    summary,
    apply = false,
    concurrency = 8,
    snapshotFile = "(in-memory)",
    summaryFile = "(in-memory)",
    reportDir = DEFAULT_MIGRATION_DIR,
    writeReportFile = apply,
  } = options;

  const beforeState = await repo.getSyncState();
  const [beforeBlocks, beforeProtocols, existingLinks] = await Promise.all([
    fetchAllBlockChanges(repo),
    fetchAllProtocolChanges(repo),
    repo.listBlockLinks(),
  ]);

  const liveBlocksBySlug = new Map<string, NeuroGuideContentBlockRow>();
  for (const row of beforeBlocks) {
    if (row.deletedAt === null) {
      liveBlocksBySlug.set(row.slug.toLowerCase().trim(), row);
    }
  }

  const liveProtocolsBySlug = new Map<string, NeuroGuideProtocolRow>();
  for (const proto of beforeProtocols) {
    if (proto.deletedAt === null) {
      liveProtocolsBySlug.set(proto.slug.toLowerCase().trim(), proto);
    }
  }

  const uniqueLinks = dedupeBlockLinks(snapshot.blockLinks || []);

  // Validate snapshot blocks upfront
  const seenBlockSlugs = new Set<string>();
  const expectedBlockHashBySlug = new Map<string, string>();
  const toCreateBlocks: NeuroGuideContentBlockRow[] = [];
  let toSkipBlocksCount = 0;

  for (const block of snapshot.blocks || []) {
    const slug = String(block.slug || block.blockKey || "").toLowerCase().trim();
    if (!slug) {
      throw new Error("Snapshot block missing non-empty slug/blockKey");
    }
    if (seenBlockSlugs.has(slug)) {
      throw new Error(`Duplicate block slug in snapshot: ${slug}`);
    }
    seenBlockSlugs.add(slug);

    const leaked = findForbiddenEnvelopeKeys(block.data);
    if (leaked.length > 0) {
      throw new Error(
        `Invariant I10 violation in snapshot block ${slug}: forbidden keys [${leaked.join(", ")}]`
      );
    }

    const recomputedHash = computeBlockContentHash(block.data);
    if (recomputedHash !== block.contentHash) {
      throw new Error(
        `Snapshot block contentHash mismatch for ${slug}: snapshot=${block.contentHash} computed=${recomputedHash}`
      );
    }
    expectedBlockHashBySlug.set(slug, block.contentHash);

    if (liveBlocksBySlug.has(slug)) {
      toSkipBlocksCount += 1;
    } else {
      toCreateBlocks.push(block);
    }
  }

  // Validate snapshot protocols upfront & index edges by protocol UID
  const seenProtocolSlugs = new Set<string>();
  const toCreateProtocols: NeuroGuideProtocolRow[] = [];
  let toSkipProtocolsCount = 0;

  for (const proto of snapshot.protocols || []) {
    const slug = String(proto.slug || "").toLowerCase().trim();
    if (!slug) {
      throw new Error("Snapshot protocol missing non-empty slug");
    }
    if (seenProtocolSlugs.has(slug)) {
      throw new Error(`Duplicate protocol slug in snapshot: ${slug}`);
    }
    seenProtocolSlugs.add(slug);

    if (!summary.perProtocolHash?.[slug]) {
      throw new Error(`Snapshot summary missing perProtocolHash entry for ${slug}`);
    }

    if (liveProtocolsBySlug.has(slug)) {
      toSkipProtocolsCount += 1;
    } else {
      toCreateProtocols.push(proto);
    }
  }

  const edgesByProtocolUid = new Map<string, NeuroGuideProtocolEdgeInput[]>();
  for (const edge of snapshot.protocolBlocks || []) {
    const list = edgesByProtocolUid.get(edge.protocolUid) ?? [];
    list.push({
      blockUid: edge.blockUid,
      position: edge.position,
      sectionPath: edge.sectionPath,
      role: edge.role,
    });
    edgesByProtocolUid.set(edge.protocolUid, list);
  }

  if (!apply) {
    const afterState = await repo.getSyncState();
    if (
      afterState.maxSeq !== beforeState.maxSeq ||
      afterState.rootHash !== beforeState.rootHash
    ) {
      throw new Error(
        `Dry-run invariant failed: sync state mutated (${beforeState.maxSeq} -> ${afterState.maxSeq})`
      );
    }

    return {
      mode: "dry-run",
      snapshotFile,
      summaryFile,
      totalSnapshotBlocks: snapshot.blocks.length,
      totalSnapshotProtocols: snapshot.protocols.length,
      totalSnapshotLinks: uniqueLinks.length,
      existingLiveBlocks: liveBlocksBySlug.size,
      existingLiveProtocols: liveProtocolsBySlug.size,
      toCreateBlocksCount: toCreateBlocks.length,
      toSkipBlocksCount,
      createdBlocksCount: 0,
      toCreateProtocolsCount: toCreateProtocols.length,
      toSkipProtocolsCount,
      createdProtocolsCount: 0,
      upsertedLinksCount: 0,
      beforeState,
      afterState,
      recomputedRootHash: null,
      generatedAt: new Date().toISOString(),
    };
  }

  // Phase 8.3 Apply Step 1: Create missing granular/shared content blocks with skipRootRehash=true
  let createdBlocksCount = 0;
  await runWithConcurrency(toCreateBlocks, concurrency, async (block) => {
    const sectionHashes =
      block.sectionHashes && Object.keys(block.sectionHashes).length > 0
        ? block.sectionHashes
        : computeBlockSectionHashes(block.data);
    await repo.createBlock(block.data, block.contentHash, sectionHashes, "migration-v2", {
      uid: block.uid,
      skipRootRehash: true,
    });
    createdBlocksCount += 1;
  });

  // Phase 8.3 Apply Step 2: Upsert missing protocols & protocol_blocks edges
  let createdProtocolsCount = 0;
  for (const proto of toCreateProtocols) {
    await repo.upsertProtocol(
      {
        uid: proto.uid,
        slug: proto.slug,
        protocolType: proto.protocolType,
        society: proto.society,
        year: proto.year,
        title: proto.title,
        status: proto.status,
        subspecialties: proto.subspecialties,
        metadata: proto.metadata,
        blockOrder: proto.blockOrder,
        metadataHash: proto.metadataHash,
        edges: edgesByProtocolUid.get(proto.uid) ?? [],
        skipRootRehash: true,
      },
      "migration-v2"
    );
    createdProtocolsCount += 1;
  }

  // Phase 8.3 Apply Step 3: Batch-upsert cross-link edges when needed
  let upsertedLinksCount = 0;
  if (
    uniqueLinks.length > 0 &&
    (createdBlocksCount > 0 ||
      createdProtocolsCount > 0 ||
      existingLinks.length < uniqueLinks.length)
  ) {
    const chunkSize = 1000;
    for (let i = 0; i < uniqueLinks.length; i += chunkSize) {
      const chunk = uniqueLinks.slice(i, i + chunkSize);
      upsertedLinksCount += await repo.replaceBlockLinks(chunk, false);
    }
  }

  // Phase 8.3 Apply Step 4: Single batched Tier-1 root Merkle recomputation
  const shouldRecomputeRoot =
    createdBlocksCount > 0 || createdProtocolsCount > 0 || beforeState.rootHash === "";
  const recomputedRootHash = shouldRecomputeRoot
    ? await repo.recomputeRootHash()
    : beforeState.rootHash;
  const afterState = await repo.getSyncState();

  // Phase 8.3 Post-check Verification
  const [allAfterBlocks, allAfterProtocols, allAfterLinks] = await Promise.all([
    fetchAllBlockChanges(repo),
    fetchAllProtocolChanges(repo),
    repo.listBlockLinks(),
  ]);
  const liveBlocks = allAfterBlocks.filter((b) => b.deletedAt === null);
  const liveProtocols = allAfterProtocols.filter((p) => p.deletedAt === null);

  const errors: string[] = [];

  // 1. Live block slug parity & per-block content_hash parity
  const actualBlockSlugs = new Set(liveBlocks.map((b) => b.slug.toLowerCase().trim()));
  const missingBlockSlugs = [...seenBlockSlugs].filter((s) => !actualBlockSlugs.has(s));
  const extraBlockSlugs = [...actualBlockSlugs].filter((s) => !seenBlockSlugs.has(s));
  if (missingBlockSlugs.length > 0) {
    errors.push(`Missing live block slugs (${missingBlockSlugs.length}): ${missingBlockSlugs.slice(0, 5).join(", ")}`);
  }
  if (extraBlockSlugs.length > 0) {
    errors.push(`Unexpected extra live block slugs (${extraBlockSlugs.length}): ${extraBlockSlugs.slice(0, 5).join(", ")}`);
  }

  const blockCountsByType: Record<string, number> = {};
  for (const row of liveBlocks) {
    blockCountsByType[row.blockType] = (blockCountsByType[row.blockType] || 0) + 1;
    const leaked = findForbiddenEnvelopeKeys(row.data);
    if (leaked.length > 0) {
      errors.push(`Invariant I10 leak on block ${row.slug}: ${leaked.join(", ")}`);
    }
    const recomputed = computeBlockContentHash(row.data);
    if (recomputed !== row.contentHash) {
      errors.push(
        `Block content_hash mismatch for ${row.slug}: stored=${row.contentHash} computed=${recomputed}`
      );
    }
    const expected = expectedBlockHashBySlug.get(row.slug.toLowerCase().trim());
    if (expected && row.contentHash !== expected) {
      errors.push(
        `Block content_hash mismatch vs snapshot for ${row.slug}: expected=${expected} actual=${row.contentHash}`
      );
    }
  }

  if (liveBlocks.length !== summary.totalBlocks) {
    errors.push(`Live block count mismatch: expected ${summary.totalBlocks}, got ${liveBlocks.length}`);
  }
  for (const [bType, expectedCnt] of Object.entries(summary.blockCountsByType || {})) {
    const actualCnt = blockCountsByType[bType] || 0;
    if (actualCnt !== expectedCnt) {
      errors.push(`Block type '${bType}' count mismatch: expected ${expectedCnt}, got ${actualCnt}`);
    }
  }

  // 2. Live protocol slug parity & per-protocol Tier-2 Merkle hash parity
  const actualProtocolSlugs = new Set(liveProtocols.map((p) => p.slug.toLowerCase().trim()));
  const missingProtocolSlugs = [...seenProtocolSlugs].filter((s) => !actualProtocolSlugs.has(s));
  const extraProtocolSlugs = [...actualProtocolSlugs].filter((s) => !seenProtocolSlugs.has(s));
  if (missingProtocolSlugs.length > 0) {
    errors.push(`Missing live protocol slugs: ${missingProtocolSlugs.join(", ")}`);
  }
  if (extraProtocolSlugs.length > 0) {
    errors.push(`Unexpected extra live protocol slugs: ${extraProtocolSlugs.join(", ")}`);
  }

  let protocolHashesMatchSummary = true;
  if (liveProtocols.length !== summary.totalProtocols) {
    errors.push(
      `Live protocol count mismatch: expected ${summary.totalProtocols}, got ${liveProtocols.length}`
    );
    protocolHashesMatchSummary = false;
  }

  for (const proto of liveProtocols) {
    const summaryEntry = summary.perProtocolHash?.[proto.slug.toLowerCase().trim()];
    if (!summaryEntry) {
      errors.push(`Missing summary.perProtocolHash entry for ${proto.slug}`);
      protocolHashesMatchSummary = false;
      continue;
    }
    if (proto.protocolHash !== summaryEntry.protocolHash) {
      errors.push(
        `Protocol Merkle hash mismatch vs summary for ${proto.slug}: summary=${summaryEntry.protocolHash} live=${proto.protocolHash}`
      );
      protocolHashesMatchSummary = false;
    }
    if (proto.blockOrder.length !== summaryEntry.blockCount) {
      errors.push(
        `Protocol blockCount mismatch for ${proto.slug}: summary=${summaryEntry.blockCount} live=${proto.blockOrder.length}`
      );
      protocolHashesMatchSummary = false;
    }
  }

  // 3. Cross-link edges count check
  if (allAfterLinks.length < uniqueLinks.length) {
    errors.push(
      `Cross-link edge count mismatch: expected >= ${uniqueLinks.length}, got ${allAfterLinks.length}`
    );
  }

  // 4. Tier-1 Root Merkle hash checks
  const computedRoot = computeNeuroGuideRootHash(liveProtocols);
  const rootHashMatchesComputed =
    Boolean(afterState.rootHash) &&
    afterState.rootHash === recomputedRootHash &&
    afterState.rootHash === computedRoot;

  if (!rootHashMatchesComputed) {
    errors.push(
      `Root Merkle hash mismatch vs computed: state=${afterState.rootHash} rpc=${recomputedRootHash} local=${computedRoot}`
    );
  }

  const rootHashMatchesSummary = afterState.rootHash === summary.rootHash;
  if (!rootHashMatchesSummary) {
    errors.push(
      `Root Merkle hash mismatch vs summary: summary=${summary.rootHash} live=${afterState.rootHash}`
    );
  }

  const report: NeuroGuideMigrationReport = {
    mode: "apply",
    snapshotFile,
    summaryFile,
    totalSnapshotBlocks: snapshot.blocks.length,
    totalSnapshotProtocols: snapshot.protocols.length,
    totalSnapshotLinks: uniqueLinks.length,
    existingLiveBlocks: liveBlocksBySlug.size,
    existingLiveProtocols: liveProtocolsBySlug.size,
    toCreateBlocksCount: toCreateBlocks.length,
    toSkipBlocksCount,
    createdBlocksCount,
    toCreateProtocolsCount: toCreateProtocols.length,
    toSkipProtocolsCount,
    createdProtocolsCount,
    upsertedLinksCount,
    beforeState,
    afterState,
    recomputedRootHash,
    postCheck: {
      passed: errors.length === 0,
      errors,
      liveBlockCount: liveBlocks.length,
      liveProtocolCount: liveProtocols.length,
      liveLinkCount: allAfterLinks.length,
      blockCountsByType,
      protocolHashesMatchSummary,
      rootHashMatchesComputed,
      rootHashMatchesSummary,
    },
    generatedAt: new Date().toISOString(),
  };

  if (writeReportFile) {
    fs.mkdirSync(reportDir, { recursive: true });
    const reportPath = path.join(reportDir, `migrate-report-${formatReportTimestamp()}.json`);
    report.reportPath = path.relative(process.cwd(), reportPath).replace(/\\/g, "/");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n", "utf-8");
  }

  return report;
}

async function runCli(): Promise<void> {
  loadEnvLocal();
  const args = new Set(process.argv.slice(2));
  const apply = args.has("--apply");
  if (!apply && args.size > 0 && !args.has("--dry-run")) {
    throw new Error(
      `Unsupported CLI flags: ${Array.from(args).join(" ")}. Use --dry-run (default) or --apply.`
    );
  }

  const { snapshotPath, summaryPath } = findLatestNeuroGuideSnapshotPair();
  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf-8")) as NeuroGuideGraphSnapshot;
  const summary = JSON.parse(fs.readFileSync(summaryPath, "utf-8")) as NeuroGuideMigrationSummary;

  const repo = new SupabaseNeuroGuideRepo();
  const report = await runNeuroGuideMigrationToV2({
    repo,
    snapshot,
    summary,
    apply,
    snapshotFile: path.relative(process.cwd(), snapshotPath).replace(/\\/g, "/"),
    summaryFile: path.relative(process.cwd(), summaryPath).replace(/\\/g, "/"),
    writeReportFile: apply,
  });

  console.log("=== NeuroGuide Sync v2 Granular Data Migration ===");
  console.log(`Mode:                ${report.mode}`);
  console.log(
    `Snapshot file:       ${report.snapshotFile} (${report.totalSnapshotProtocols} protocols, ${report.totalSnapshotBlocks} blocks, ${report.totalSnapshotLinks} links)`
  );
  console.log(`Summary file:        ${report.summaryFile}`);
  console.log(
    `Existing live:       ${report.existingLiveProtocols} protocols, ${report.existingLiveBlocks} blocks`
  );
  console.log(
    `Planned create:      ${report.toCreateProtocolsCount} protocols, ${report.toCreateBlocksCount} blocks`
  );
  console.log(
    `Planned skip:        ${report.toSkipProtocolsCount} protocols, ${report.toSkipBlocksCount} blocks`
  );
  console.log(`Before max_seq:      ${report.beforeState.maxSeq}`);
  console.log(`After max_seq:       ${report.afterState.maxSeq}`);
  console.log(`After root_hash:     ${report.afterState.rootHash || "(empty)"}`);

  if (report.mode === "dry-run") {
    console.log("✅ Dry-run complete. Zero writes performed.");
    return;
  }

  console.log(
    `Created rows:        ${report.createdProtocolsCount} protocols, ${report.createdBlocksCount} blocks, ${report.upsertedLinksCount} link upserts`
  );
  if (report.reportPath) {
    console.log(`Report written:      ${report.reportPath}`);
  }

  if (report.postCheck) {
    console.log(
      `Post-check:          ${report.postCheck.passed ? "PASS" : "FAIL"} ` +
        `(protocols=${report.postCheck.liveProtocolCount}, blocks=${report.postCheck.liveBlockCount}, ` +
        `links=${report.postCheck.liveLinkCount}, protocolHashes=${report.postCheck.protocolHashesMatchSummary}, ` +
        `rootComputed=${report.postCheck.rootHashMatchesComputed}, rootSummary=${report.postCheck.rootHashMatchesSummary})`
    );
    if (!report.postCheck.passed) {
      for (const err of report.postCheck.errors) {
        console.error(`  ❌ ${err}`);
      }
      process.exitCode = 1;
    }
  }
}

const isMainEntry =
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMainEntry) {
  runCli().catch((err) => {
    console.error("NeuroGuide migration script failed:", err);
    process.exit(1);
  });
}
