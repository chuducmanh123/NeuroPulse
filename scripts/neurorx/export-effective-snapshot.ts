#!/usr/bin/env node
/**
 * Sync v2 Snapshot Exporter (`rx:snapshot`)
 *
 * Exports live effective drug records from Sync v2 (`neurorx_drug_records` via SupabaseDrugRepo,
 * falling back to the read-only mirror `data/neurorx/drugs/*.json` when offline/unconfigured)
 * and writes:
 *   - data/neurorx/_migration/snapshot-<YYYYMMDD>.json
 *   - data/neurorx/_migration/summary-<YYYYMMDD>.json
 */

import fs from "node:fs";
import path from "node:path";
import type { DrugRecord } from "../../src/types/neurorx.ts";
import { computeContentHashSync } from "../../src/lib/neurorx/integrity.ts";
import { listAllLiveRows } from "../../src/lib/neurorx/sync/handlers.ts";
import { evaluateEffectiveDrug } from "../../src/lib/neurorx/sync/jsonPatch.ts";
import { SupabaseDrugRepo } from "../../src/lib/neurorx/sync/repoSupabase.ts";
import type { DrugWithEffectiveStatus } from "../../src/lib/neurorx/sync/types.ts";
import { loadEnvLocal } from "./migrate-to-v2.ts";

const ROOT_DIR = process.cwd();
const DATA_DIR = path.join(ROOT_DIR, "data", "neurorx");
const MIRROR_DRUGS_DIR = path.join(DATA_DIR, "drugs");
const MIGRATION_DIR = path.join(DATA_DIR, "_migration");

function readMirrorDrugs(): DrugWithEffectiveStatus[] {
  if (!fs.existsSync(MIRROR_DRUGS_DIR)) return [];
  const entries: DrugWithEffectiveStatus[] = [];
  for (const fileName of fs.readdirSync(MIRROR_DRUGS_DIR)) {
    if (!fileName.endsWith(".json")) continue;
    try {
      const record = JSON.parse(
        fs.readFileSync(path.join(MIRROR_DRUGS_DIR, fileName), "utf-8")
      ) as DrugRecord;
      if (record?.id) {
        entries.push(evaluateEffectiveDrug(record));
      }
    } catch {
      // Malformed mirror files are flagged by rx:validate
    }
  }
  return entries;
}

function getDateStamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

async function run(): Promise<void> {
  loadEnvLocal(ROOT_DIR);

  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL);
  const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const supabaseConfigured = hasUrl && hasServiceKey;
  let supabaseReachable = false;
  let supabaseErrorReason: string | null = null;
  let sourceTier: "supabase-v2" | "mirror" = "mirror";
  let effectiveEntries: DrugWithEffectiveStatus[] = [];

  if (supabaseConfigured) {
    try {
      const repo = new SupabaseDrugRepo();
      const liveRows = await listAllLiveRows(repo);
      supabaseReachable = true;
      sourceTier = "supabase-v2";
      effectiveEntries = liveRows.map((row) => evaluateEffectiveDrug(row.data));
    } catch (err) {
      supabaseErrorReason = err instanceof Error ? err.message : String(err);
      effectiveEntries = readMirrorDrugs();
    }
  } else {
    effectiveEntries = readMirrorDrugs();
  }

  const sortedEntries = [...effectiveEntries].sort((a, b) =>
    a.drug.id.localeCompare(b.drug.id)
  );
  const snapshotRecords: DrugRecord[] = sortedEntries.map((entry) => entry.drug);

  const countByEffectiveStatus = {
    verified: 0,
    draft: 0,
    retired: 0,
  };
  let hashMatchCount = 0;
  const slugs: string[] = [];
  const perSlugContentHash: Record<string, string> = {};
  const sourceTierHints: Record<string, string[]> = {};

  for (const entry of sortedEntries) {
    const slug = entry.drug.id.toLowerCase().trim();
    slugs.push(slug);
    countByEffectiveStatus[entry.effectiveStatus] += 1;
    if (entry.hashMatches) {
      hashMatchCount += 1;
    }
    perSlugContentHash[slug] = computeContentHashSync(entry.drug);
    sourceTierHints[slug] = [sourceTier];
  }

  const stamp = getDateStamp();
  fs.mkdirSync(MIGRATION_DIR, { recursive: true });

  const snapshotPath = path.join(MIGRATION_DIR, `snapshot-${stamp}.json`);
  const summaryPath = path.join(MIGRATION_DIR, `summary-${stamp}.json`);

  const summary = {
    total: snapshotRecords.length,
    countByEffectiveStatus,
    hashMatchCount,
    slugs,
    perSlugContentHash,
    sourceTierHints,
    supabaseConfigured,
    supabaseReachable,
    ...(supabaseErrorReason ? { supabaseErrorReason } : {}),
    generatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(snapshotPath, JSON.stringify(snapshotRecords, null, 2) + "\n", "utf-8");
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + "\n", "utf-8");

  console.log(`Snapshot written: ${path.relative(ROOT_DIR, snapshotPath)}`);
  console.log(`Summary written:  ${path.relative(ROOT_DIR, summaryPath)}`);
  console.log(`Total effective drugs: ${summary.total} (source: ${sourceTier})`);
  console.log(`Effective status counts: ${JSON.stringify(summary.countByEffectiveStatus)}`);
  console.log(`Hash matches: ${summary.hashMatchCount}`);
}

run().catch((err) => {
  console.error("Failed to export effective snapshot:", err);
  process.exit(1);
});
