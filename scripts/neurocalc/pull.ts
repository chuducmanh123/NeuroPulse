#!/usr/bin/env node
/**
 * Sync v2 Mirror Exporter (`calc:pull`)
 * Exports all live rows from Supabase `neurocalc_scale_records` to the read-only Git mirror
 * at `data/neurocalc/scales/*.json`.
 *
 * Usage:
 *   npm run calc:pull
 *   npm run calc:pull -- --prune
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { listAllLiveRows } from "../../src/lib/neurocalc/sync/handlers.ts";
import type { ScaleRepo } from "../../src/lib/neurocalc/sync/repo.ts";
import { SupabaseScaleRepo } from "../../src/lib/neurocalc/sync/repoSupabase.ts";
import { loadEnvLocal } from "./migrate-to-v2.ts";

const DEFAULT_SCALES_DIR = path.resolve(
  process.cwd(),
  "data",
  "neurocalc",
  "scales"
);

export async function pullLiveScalesToMirror(options: {
  repo: ScaleRepo;
  outDir?: string;
  prune?: boolean;
}): Promise<{
  written: number;
  pruned: string[];
  slugs: string[];
  maxSeq: number;
  rootHash: string;
}> {
  const outDir = options.outDir ?? DEFAULT_SCALES_DIR;
  const prune = Boolean(options.prune);

  const [liveRows, syncState] = await Promise.all([
    listAllLiveRows(options.repo),
    options.repo.getSyncState(),
  ]);

  const sortedRows = [...liveRows].sort((a, b) => a.slug.localeCompare(b.slug));
  fs.mkdirSync(outDir, { recursive: true });

  const liveFiles = new Set<string>();
  const slugs: string[] = [];

  for (const row of sortedRows) {
    const fileName = `${row.slug}.json`;
    liveFiles.add(fileName);
    slugs.push(row.slug);
    const outPath = path.join(outDir, fileName);
    fs.writeFileSync(outPath, JSON.stringify(row.data, null, 2) + "\n", "utf-8");
  }

  const pruned: string[] = [];
  if (prune && sortedRows.length > 0) {
    for (const fileName of fs.readdirSync(outDir)) {
      if (!fileName.endsWith(".json")) continue;
      if (!liveFiles.has(fileName)) {
        fs.unlinkSync(path.join(outDir, fileName));
        pruned.push(fileName);
      }
    }
  }

  return {
    written: sortedRows.length,
    pruned,
    slugs,
    maxSeq: syncState.maxSeq,
    rootHash: syncState.rootHash,
  };
}

async function main(): Promise<void> {
  loadEnvLocal(process.cwd());
  const prune = process.argv.includes("--prune");
  const repo = new SupabaseScaleRepo();
  const res = await pullLiveScalesToMirror({ repo, prune });
  console.log(
    `⬇️  Pulled ${res.written} scale(s) from Supabase Sync v2 (maxSeq=${res.maxSeq}, rootHash=${res.rootHash.slice(0, 12)}…)`
  );
  if (res.pruned.length > 0) {
    console.log(`   Pruned: ${res.pruned.join(", ")}`);
  }
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  main().catch((err) => {
    console.error("❌ calc:pull failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
