#!/usr/bin/env node
/**
 * Sync v2 Mirror Exporter (`rx:pull`)
 * Exports all live rows from Supabase `neurorx_drug_records` to the read-only Git mirror
 * at `data/neurorx/drugs/*.json`.
 *
 * Usage:
 *   npm run rx:pull
 *   npm run rx:pull -- --prune
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { listAllLiveRows } from "../../src/lib/neurorx/sync/handlers.ts";
import type { DrugRepo } from "../../src/lib/neurorx/sync/repo.ts";
import { SupabaseDrugRepo } from "../../src/lib/neurorx/sync/repoSupabase.ts";
import { loadEnvLocal } from "./migrate-to-v2.ts";

export interface PullMirrorOptions {
  repo: DrugRepo;
  outDir?: string;
  prune?: boolean;
}

export interface PullMirrorResult {
  written: number;
  pruned: string[];
  slugs: string[];
  maxSeq: number;
  rootHash: string;
}

const DEFAULT_DRUGS_DIR = path.resolve(process.cwd(), "data", "neurorx", "drugs");

/**
 * Exports all live DrugRepo rows as deterministic pretty JSON files under `outDir`.
 * When `prune` is true and at least one live row exists, removes stale `.json` files
 * whose slugs are no longer live in the repository.
 */
export async function pullLiveDrugsToMirror(
  options: PullMirrorOptions
): Promise<PullMirrorResult> {
  const outDir = options.outDir ?? DEFAULT_DRUGS_DIR;
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
    const fullPath = path.join(outDir, fileName);
    fs.writeFileSync(fullPath, JSON.stringify(row.data, null, 2) + "\n", "utf-8");
  }

  const pruned: string[] = [];
  if (prune && sortedRows.length > 0) {
    for (const existingFile of fs.readdirSync(outDir)) {
      if (!existingFile.endsWith(".json")) continue;
      if (!liveFiles.has(existingFile)) {
        fs.unlinkSync(path.join(outDir, existingFile));
        pruned.push(existingFile);
      }
    }
  }

  return {
    written: sortedRows.length,
    pruned: pruned.sort(),
    slugs,
    maxSeq: syncState.maxSeq,
    rootHash: syncState.rootHash,
  };
}

async function runCli(): Promise<void> {
  loadEnvLocal();
  const prune = process.argv.includes("--prune");
  const repo = new SupabaseDrugRepo();
  const res = await pullLiveDrugsToMirror({ repo, prune });

  console.log("=== NeuroRx Sync v2 Mirror Export (rx:pull) ===");
  console.log(`Live drugs exported: ${res.written}`);
  console.log(`Mirror directory:    data/neurorx/drugs/`);
  console.log(`Server max_seq:      ${res.maxSeq}`);
  console.log(`Server root_hash:    ${res.rootHash || "(empty)"}`);
  if (prune) {
    console.log(
      res.pruned.length > 0
        ? `Pruned stale files:  ${res.pruned.join(", ")}`
        : "Pruned stale files:  0"
    );
  }
}

const isMainEntry =
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMainEntry) {
  runCli().catch((err) => {
    console.error("❌ rx:pull failed:", err);
    process.exit(1);
  });
}
