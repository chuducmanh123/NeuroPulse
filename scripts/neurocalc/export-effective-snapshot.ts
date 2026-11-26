#!/usr/bin/env node
/**
 * Snapshot Exporter for NeuroCalc (`calc:snapshot`)
 * Exports live effective scale records from Supabase Sync v2 (falling back to
 * the read-only mirror `data/neurocalc/scales/*.json` when offline/unconfigured).
 */

import fs from "node:fs";
import path from "node:path";
import type { ScaleRecord, ScaleWithEffectiveStatus } from "../../src/types/neurocalc.ts";
import {
  computeRecordContentHashSync,
  computeRootHashFromEntries,
  computeSectionHashes,
  evaluateEffectiveScale,
} from "../../src/lib/neurocalc/integrity.ts";
import { listAllLiveRows } from "../../src/lib/neurocalc/sync/handlers.ts";
import { SupabaseScaleRepo } from "../../src/lib/neurocalc/sync/repoSupabase.ts";
import { loadEnvLocal } from "./migrate-to-v2.ts";

const ROOT_DIR = process.cwd();
const DATA_DIR = path.join(ROOT_DIR, "data", "neurocalc");
const MIRROR_SCALES_DIR = path.join(DATA_DIR, "scales");
const MIGRATION_DIR = path.join(DATA_DIR, "_migration");

function readMirrorScales(): ScaleWithEffectiveStatus[] {
  if (!fs.existsSync(MIRROR_SCALES_DIR)) return [];
  const entries: ScaleWithEffectiveStatus[] = [];
  for (const fileName of fs.readdirSync(MIRROR_SCALES_DIR).sort()) {
    if (!fileName.endsWith(".json")) continue;
    try {
      const record = JSON.parse(
        fs.readFileSync(path.join(MIRROR_SCALES_DIR, fileName), "utf-8")
      ) as ScaleRecord;
      if (record?.id) {
        entries.push(evaluateEffectiveScale(record));
      }
    } catch {
      // Malformed files are flagged by calc:validate
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
  let sourceTier: "supabase-v2" | "mirror" = "mirror";
  let effectiveEntries: ScaleWithEffectiveStatus[] = [];

  if (hasUrl && hasServiceKey && !process.argv.includes("--mirror")) {
    try {
      const repo = new SupabaseScaleRepo();
      const liveRows = await listAllLiveRows(repo);
      sourceTier = "supabase-v2";
      effectiveEntries = liveRows.map((row) => evaluateEffectiveScale(row.data));
    } catch {
      effectiveEntries = readMirrorScales();
    }
  } else {
    effectiveEntries = readMirrorScales();
  }

  const sortedEntries = [...effectiveEntries].sort((a, b) =>
    a.scale.id.localeCompare(b.scale.id)
  );

  const snapshotRows = sortedEntries.map((entry) => ({
    id: entry.scale.id,
    status: entry.scale.status,
    effectiveStatus: entry.effectiveStatus,
    hashMatches: entry.hashMatches,
    content_hash: computeRecordContentHashSync(entry.scale),
    section_hashes: computeSectionHashes(entry.scale),
    scale: entry.scale,
  }));

  const rootHash = computeRootHashFromEntries(
    snapshotRows.map((row) => ({
      uid: row.id,
      rev: 1,
      contentHash: row.content_hash,
    }))
  );

  const summary = {
    generatedAt: new Date().toISOString(),
    sourceTier,
    totalScales: snapshotRows.length,
    verifiedCount: snapshotRows.filter((r) => r.effectiveStatus === "verified").length,
    draftCount: snapshotRows.filter((r) => r.effectiveStatus === "draft").length,
    retiredCount: snapshotRows.filter((r) => r.effectiveStatus === "retired").length,
    rootHash,
  };

  if (process.argv.includes("--stdout")) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  fs.mkdirSync(MIGRATION_DIR, { recursive: true });
  const stamp = getDateStamp();
  const snapshotPath = path.join(MIGRATION_DIR, `snapshot-${stamp}.json`);
  const summaryPath = path.join(MIGRATION_DIR, `summary-${stamp}.json`);

  fs.writeFileSync(
    snapshotPath,
    JSON.stringify({ ...summary, scales: snapshotRows }, null, 2) + "\n",
    "utf-8"
  );
  fs.writeFileSync(
    summaryPath,
    JSON.stringify(summary, null, 2) + "\n",
    "utf-8"
  );

  console.log(`📸 Wrote snapshot (${summary.totalScales} scales, rootHash=${rootHash.slice(0, 12)}…)`);
  console.log(`   ${snapshotPath}`);
  console.log(`   ${summaryPath}`);
}

run().catch((err) => {
  console.error("❌ calc:snapshot failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
