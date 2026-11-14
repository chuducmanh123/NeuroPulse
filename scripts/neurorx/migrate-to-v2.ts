#!/usr/bin/env node
/**
 * Phase 3 Data Migration Script for NeuroRx Sync v2
 *
 * Reads ONLY the Phase 0 frozen snapshot + summary from data/neurorx/_migration/
 * (never legacy /tmp or legacy Supabase tables) and idempotently seeds
 * neurorx_drug_records via DrugRepo (SupabaseDrugRepo in CLI mode).
 *
 * Default mode is --dry-run (strictly read-only).
 * Pass --apply to write missing records and run full post-check verification.
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { DrugRecord } from "../../src/types/neurorx.ts";
import type { DrugRepo } from "../../src/lib/neurorx/sync/repo.ts";
import type { SyncRow } from "../../src/lib/neurorx/sync/types.ts";
import { SupabaseDrugRepo } from "../../src/lib/neurorx/sync/repoSupabase.ts";
import {
  computeRecordContentHashSync,
  computeRootHashFromEntries,
  computeSectionHashes,
} from "../../src/lib/neurorx/sync/jsonPatch.ts";
import { computeContentHashSync } from "../../src/lib/neurorx/integrity.ts";

export interface MigrationSummary {
  total: number;
  countByEffectiveStatus: {
    verified: number;
    draft: number;
    retired: number;
  };
  hashMatchCount?: number;
  slugs: string[];
  perSlugContentHash: Record<string, string>;
  generatedAt?: string;
}

export interface MigrationPostCheck {
  passed: boolean;
  errors: string[];
  liveCount: number;
  verifiedCount: number;
  draftCount: number;
  retiredCount: number;
  rootHashMatchesComputed: boolean;
}

export interface MigrationReport {
  mode: "dry-run" | "apply";
  snapshotFile: string;
  summaryFile: string;
  totalSnapshotRecords: number;
  existingLiveCount: number;
  toCreateCount: number;
  toSkipCount: number;
  createdCount: number;
  toCreateSlugs: string[];
  toSkipSlugs: string[];
  beforeState: {
    maxSeq: number;
    purgeHorizonSeq: number;
    rootHash: string;
  };
  afterState: {
    maxSeq: number;
    purgeHorizonSeq: number;
    rootHash: string;
  };
  recomputedRootHash: string | null;
  postCheck?: MigrationPostCheck;
  reportPath?: string;
  generatedAt: string;
}

export interface RunMigrationOptions {
  repo: DrugRepo;
  records: DrugRecord[];
  summary: MigrationSummary;
  apply?: boolean;
  snapshotFile?: string;
  summaryFile?: string;
  reportDir?: string;
  writeReportFile?: boolean;
}

const DEFAULT_MIGRATION_DIR = path.resolve(process.cwd(), "data", "neurorx", "_migration");
const FORBIDDEN_DATA_KEYS = ["uid", "rev", "changeSeq", "deletedAt", "change_seq", "deleted_at"];

export function loadEnvLocal(rootDir = process.cwd()): void {
  const envPath = path.join(rootDir, ".env.local");
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, "utf-8");
  for (const rawLine of content.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;

    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

export function computeEffectiveStatus(record: DrugRecord): "verified" | "draft" | "retired" {
  if (record.status === "verified") {
    const storedHash = record.verification?.content_hash;
    const currentHash = computeContentHashSync(record);
    if (storedHash && storedHash === currentHash) {
      return "verified";
    }
    return "draft";
  }
  if (record.status === "retired") {
    return "retired";
  }
  return "draft";
}

function findForbiddenEnvelopeKeys(data: unknown): string[] {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return ["<non-object-data>"];
  }
  const obj = data as Record<string, unknown>;
  return FORBIDDEN_DATA_KEYS.filter((k) => Object.prototype.hasOwnProperty.call(obj, k));
}

export async function fetchAllChanges(repo: DrugRepo): Promise<SyncRow[]> {
  const byUid = new Map<string, SyncRow>();
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

export function findLatestSnapshotPair(migrationDir = DEFAULT_MIGRATION_DIR): {
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
    throw new Error(`No snapshot-*.json found in ${migrationDir}. Run npm run rx:snapshot first.`);
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

function formatReportTimestamp(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${d}-${hh}${mm}${ss}`;
}

export async function runMigrationToV2(
  options: RunMigrationOptions
): Promise<MigrationReport> {
  const {
    repo,
    records,
    summary,
    apply = false,
    snapshotFile = "(in-memory)",
    summaryFile = "(in-memory)",
    reportDir = DEFAULT_MIGRATION_DIR,
    writeReportFile = apply,
  } = options;

  const beforeState = await repo.getSyncState();
  const beforeRows = await fetchAllChanges(repo);
  const liveBySlug = new Map<string, SyncRow>();
  for (const row of beforeRows) {
    if (row.deletedAt === null) {
      liveBySlug.set(row.slug.toLowerCase().trim(), row);
    }
  }

  const seenSnapshotSlugs = new Set<string>();
  const toCreateSlugs: string[] = [];
  const toSkipSlugs: string[] = [];
  let createdCount = 0;

  for (const record of records) {
    const slug = String(record?.id || "").toLowerCase().trim();
    if (!slug) {
      throw new Error("Snapshot record missing non-empty id/slug");
    }
    if (seenSnapshotSlugs.has(slug)) {
      throw new Error(`Duplicate slug in snapshot: ${slug}`);
    }
    seenSnapshotSlugs.add(slug);

    const leaked = findForbiddenEnvelopeKeys(record);
    if (leaked.length > 0) {
      throw new Error(
        `Invariant I10 violation in snapshot record ${slug}: forbidden keys [${leaked.join(", ")}]`
      );
    }

    if (liveBySlug.has(slug)) {
      toSkipSlugs.push(slug);
      continue;
    }

    toCreateSlugs.push(slug);

    if (apply) {
      const contentHash = computeContentHashSync(record);
      const sectionHashes = computeSectionHashes(record);
      // Insert exact snapshot DrugRecord object without mutating clinical fields or verification status.
      await repo.create(record, contentHash, sectionHashes, "migration-v2", {
        skipRootRehash: true,
      });
      createdCount += 1;
    }
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
      totalSnapshotRecords: records.length,
      existingLiveCount: liveBySlug.size,
      toCreateCount: toCreateSlugs.length,
      toSkipCount: toSkipSlugs.length,
      createdCount: 0,
      toCreateSlugs,
      toSkipSlugs,
      beforeState,
      afterState,
      recomputedRootHash: null,
      generatedAt: new Date().toISOString(),
    };
  }

  // Batched root Merkle recomputation: run ONCE after all inserts complete (AC3.3).
  const recomputedRootHash = await repo.recomputeRootHash();
  const afterState = await repo.getSyncState();
  const allAfterRows = await fetchAllChanges(repo);
  const liveRows = allAfterRows.filter((r) => r.deletedAt === null);

  const errors: string[] = [];

  // 1. Live slug set must equal snapshot summary.slugs set.
  const expectedSlugs = new Set(summary.slugs.map((s) => s.toLowerCase().trim()));
  const actualSlugs = new Set(liveRows.map((r) => r.slug.toLowerCase().trim()));
  const missingSlugs = [...expectedSlugs].filter((s) => !actualSlugs.has(s));
  const extraSlugs = [...actualSlugs].filter((s) => !expectedSlugs.has(s));

  if (missingSlugs.length > 0) {
    errors.push(`Missing live slugs vs snapshot summary: ${missingSlugs.join(", ")}`);
  }
  if (extraSlugs.length > 0) {
    errors.push(`Unexpected extra live slugs vs snapshot summary: ${extraSlugs.join(", ")}`);
  }

  // 2. Per-slug hash parity + I10 cleanliness + effective status counts.
  let verifiedCount = 0;
  let draftCount = 0;
  let retiredCount = 0;

  for (const row of liveRows) {
    const leaked = findForbiddenEnvelopeKeys(row.data);
    if (leaked.length > 0) {
      errors.push(`Invariant I10 leak on ${row.slug}: ${leaked.join(", ")}`);
    }

    const actualHash = computeContentHashSync(row.data);
    const pureHash = computeRecordContentHashSync(row.data);
    const expectedHash = summary.perSlugContentHash[row.slug];

    if (actualHash !== row.contentHash) {
      errors.push(
        `Row content_hash mismatch for ${row.slug}: stored=${row.contentHash} computed=${actualHash}`
      );
    }
    if (pureHash !== actualHash) {
      errors.push(
        `Pure sync hash mismatch for ${row.slug}: sync=${pureHash} integrity=${actualHash}`
      );
    }
    if (!expectedHash) {
      errors.push(`Missing summary.perSlugContentHash entry for ${row.slug}`);
    } else if (actualHash !== expectedHash) {
      errors.push(
        `Content hash mismatch vs summary for ${row.slug}: actual=${actualHash} summary=${expectedHash}`
      );
    }

    const eff = computeEffectiveStatus(row.data);
    if (eff === "verified") verifiedCount += 1;
    else if (eff === "retired") retiredCount += 1;
    else draftCount += 1;
  }

  // 3. Effective-status counts parity.
  if (verifiedCount !== summary.countByEffectiveStatus.verified) {
    errors.push(
      `Verified count mismatch: actual=${verifiedCount} summary=${summary.countByEffectiveStatus.verified}`
    );
  }
  if (draftCount !== summary.countByEffectiveStatus.draft) {
    errors.push(
      `Draft count mismatch: actual=${draftCount} summary=${summary.countByEffectiveStatus.draft}`
    );
  }
  if (retiredCount !== summary.countByEffectiveStatus.retired) {
    errors.push(
      `Retired count mismatch: actual=${retiredCount} summary=${summary.countByEffectiveStatus.retired}`
    );
  }

  // 4. Non-empty 64-hex root hash matching both RPC result and computed Merkle root.
  const computedRoot = computeRootHashFromEntries(liveRows);
  const isHex64 = /^[0-9a-f]{64}$/.test(afterState.rootHash);
  const rootHashMatchesComputed =
    isHex64 &&
    afterState.rootHash === recomputedRootHash &&
    afterState.rootHash === computedRoot;

  if (!isHex64) {
    errors.push(`root_hash is empty or invalid format: "${afterState.rootHash}"`);
  }
  if (afterState.rootHash !== recomputedRootHash) {
    errors.push(
      `sync_state.root_hash (${afterState.rootHash}) != recomputeRootHash() (${recomputedRootHash})`
    );
  }
  if (afterState.rootHash !== computedRoot) {
    errors.push(
      `sync_state.root_hash (${afterState.rootHash}) != computeRootHashFromEntries() (${computedRoot})`
    );
  }

  const report: MigrationReport = {
    mode: "apply",
    snapshotFile,
    summaryFile,
    totalSnapshotRecords: records.length,
    existingLiveCount: liveBySlug.size,
    toCreateCount: toCreateSlugs.length,
    toSkipCount: toSkipSlugs.length,
    createdCount,
    toCreateSlugs,
    toSkipSlugs,
    beforeState,
    afterState,
    recomputedRootHash,
    postCheck: {
      passed: errors.length === 0,
      errors,
      liveCount: liveRows.length,
      verifiedCount,
      draftCount,
      retiredCount,
      rootHashMatchesComputed,
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
    throw new Error(`Unsupported CLI flags: ${Array.from(args).join(" ")}. Use --dry-run (default) or --apply.`);
  }

  const { snapshotPath, summaryPath } = findLatestSnapshotPair();
  const records = JSON.parse(fs.readFileSync(snapshotPath, "utf-8")) as DrugRecord[];
  const summary = JSON.parse(fs.readFileSync(summaryPath, "utf-8")) as MigrationSummary;

  const repo = new SupabaseDrugRepo();
  const report = await runMigrationToV2({
    repo,
    records,
    summary,
    apply,
    snapshotFile: path.relative(process.cwd(), snapshotPath).replace(/\\/g, "/"),
    summaryFile: path.relative(process.cwd(), summaryPath).replace(/\\/g, "/"),
    writeReportFile: apply,
  });

  console.log("=== NeuroRx Sync v2 Data Migration ===");
  console.log(`Mode:             ${report.mode}`);
  console.log(`Snapshot file:    ${report.snapshotFile} (${report.totalSnapshotRecords} records)`);
  console.log(`Summary file:     ${report.summaryFile}`);
  console.log(`Existing live:    ${report.existingLiveCount}`);
  console.log(`Planned create:   ${report.toCreateCount}`);
  console.log(`Planned skip:     ${report.toSkipCount}`);
  console.log(`Before max_seq:   ${report.beforeState.maxSeq}`);
  console.log(`After max_seq:    ${report.afterState.maxSeq}`);
  console.log(`After root_hash:  ${report.afterState.rootHash || "(empty)"}`);

  if (report.mode === "dry-run") {
    console.log(
      report.toCreateCount > 0
        ? `Sample to create (${Math.min(5, report.toCreateSlugs.length)}/${report.toCreateCount}): ${report.toCreateSlugs.slice(0, 5).join(", ")}`
        : "Nothing to create (all snapshot slugs already live)."
    );
    console.log("✅ Dry-run complete. Zero writes performed.");
    return;
  }

  console.log(`Created rows:     ${report.createdCount}`);
  if (report.reportPath) {
    console.log(`Report written:   ${report.reportPath}`);
  }

  if (report.postCheck) {
    console.log(
      `Post-check:       ${report.postCheck.passed ? "PASS" : "FAIL"} ` +
        `(live=${report.postCheck.liveCount}, verified=${report.postCheck.verifiedCount}, ` +
        `draft=${report.postCheck.draftCount}, retired=${report.postCheck.retiredCount})`
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
    console.error("Migration script failed:", err);
    process.exit(1);
  });
}
