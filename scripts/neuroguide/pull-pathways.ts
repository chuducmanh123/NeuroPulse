#!/usr/bin/env node
/**
 * Clinical Pathways Local Sync Exporter (`ng:pull-pathways`)
 *
 * Exports all live `clinical_pathway` protocols from Supabase Sync v2 to:
 *   1. `public/data/neuroguide_pathways.json` (runtime local snapshot for `pathwayService.ts` & offline fallback)
 *   2. `data/neuroguide/pathways/<slug>.json` (per-pathway deterministic Git mirror)
 *
 * Usage:
 *   npm run ng:pull-pathways
 *   npm run ng:pull-pathways -- --prune
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { listPathways } from "../../src/lib/neuroguide/pathwayService.ts";
import type { NeuroGuideRepo } from "../../src/lib/neuroguide/sync/repo.ts";
import { SupabaseNeuroGuideRepo } from "../../src/lib/neuroguide/sync/repoSupabase.ts";
import type { ClinicalPathwayDoc } from "../../src/types/clinicalPathways.ts";
import { loadEnvLocal } from "../neurorx/migrate-to-v2.ts";

export interface PullPathwaysOptions {
  repo: NeuroGuideRepo;
  snapshotPath?: string;
  mirrorDir?: string;
  prune?: boolean;
}

export interface PullPathwaysResult {
  written: number;
  pruned: string[];
  slugs: string[];
  maxSeq: number;
  rootHash: string;
  snapshotPath: string;
  mirrorDir: string;
}

const DEFAULT_SNAPSHOT_PATH = path.resolve(
  process.cwd(),
  "public",
  "data",
  "neuroguide_pathways.json"
);
const DEFAULT_MIRROR_DIR = path.resolve(
  process.cwd(),
  "data",
  "neuroguide",
  "pathways"
);

export async function pullLivePathwaysToLocal(
  options: PullPathwaysOptions
): Promise<PullPathwaysResult> {
  const snapshotPath = options.snapshotPath ?? DEFAULT_SNAPSHOT_PATH;
  const mirrorDir = options.mirrorDir ?? DEFAULT_MIRROR_DIR;
  const prune = Boolean(options.prune);

  const [pathways, syncState] = await Promise.all([
    listPathways(options.repo, {
      includeDrafts: true,
      includeArchived: true,
      includeDeleted: false,
    }),
    options.repo.getSyncState(),
  ]);

  const sortedPathways: ClinicalPathwayDoc[] = [...pathways].sort((a, b) =>
    a.slug.localeCompare(b.slug)
  );

  fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
  fs.mkdirSync(mirrorDir, { recursive: true });

  const snapshotPayload = {
    syncedAt: new Date().toISOString(),
    source: "SUPABASE_SYNC_V2",
    maxSeq: syncState.maxSeq,
    rootHash: syncState.rootHash,
    count: sortedPathways.length,
    pathways: sortedPathways,
  };
  fs.writeFileSync(
    snapshotPath,
    JSON.stringify(snapshotPayload, null, 2) + "\n",
    "utf-8"
  );

  const liveFiles = new Set<string>();
  const slugs: string[] = [];

  for (const p of sortedPathways) {
    const fileName = `${p.slug}.json`;
    liveFiles.add(fileName);
    slugs.push(p.slug);
    fs.writeFileSync(
      path.join(mirrorDir, fileName),
      JSON.stringify(p, null, 2) + "\n",
      "utf-8"
    );
  }

  const pruned: string[] = [];
  if (prune && sortedPathways.length > 0) {
    for (const existingFile of fs.readdirSync(mirrorDir)) {
      if (!existingFile.endsWith(".json")) continue;
      if (!liveFiles.has(existingFile)) {
        fs.unlinkSync(path.join(mirrorDir, existingFile));
        pruned.push(existingFile);
      }
    }
  }

  return {
    written: sortedPathways.length,
    pruned: pruned.sort(),
    slugs,
    maxSeq: syncState.maxSeq,
    rootHash: syncState.rootHash,
    snapshotPath,
    mirrorDir,
  };
}

async function runCli(): Promise<void> {
  loadEnvLocal();
  const prune = process.argv.includes("--prune");
  const repo = new SupabaseNeuroGuideRepo();
  const res = await pullLivePathwaysToLocal({ repo, prune });

  console.log("=== NeuroGuide Clinical Pathways Local Sync (ng:pull-pathways) ===");
  console.log(`Live pathways exported: ${res.written}`);
  console.log(`Runtime snapshot:       ${path.relative(process.cwd(), res.snapshotPath)}`);
  console.log(`Git mirror directory:   ${path.relative(process.cwd(), res.mirrorDir)}`);
  console.log(`Server max_seq:         ${res.maxSeq}`);
  console.log(`Server root_hash:       ${res.rootHash || "(empty)"}`);
  if (prune) {
    console.log(
      res.pruned.length > 0
        ? `Pruned stale files:     ${res.pruned.join(", ")}`
        : "Pruned stale files:     0"
    );
  }
}

const isMainEntry =
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMainEntry) {
  runCli().catch((err) => {
    console.error("❌ ng:pull-pathways failed:", err);
    process.exit(1);
  });
}
