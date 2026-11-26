#!/usr/bin/env node
/**
 * Supabase Sync v2 Migration Script for NeuroCalc (`calc:migrate-v2`)
 *
 * Reads validated JSON scales from `data/neurocalc/scales/*.json` and
 * idempotently seeds `neurocalc_scale_records` via `SupabaseScaleRepo`.
 *
 * Default mode is `--dry-run` (strictly read-only).
 * Pass `--apply` to write missing records and run rootHash verification.
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { ScaleRecord, ScaleReference } from "../../src/types/neurocalc.ts";
import { runScaleTestCases } from "../../src/lib/neurocalc/engine.ts";
import { validateScaleRecord, validateSources } from "../../src/lib/neurocalc/validate.ts";
import { listAllLiveRows } from "../../src/lib/neurocalc/sync/handlers.ts";
import type { ScaleRepo } from "../../src/lib/neurocalc/sync/repo.ts";
import { SupabaseScaleRepo } from "../../src/lib/neurocalc/sync/repoSupabase.ts";
import {
  computeRecordContentHashSync,
  computeRootHashFromEntries,
  computeSectionHashes,
} from "../../src/lib/neurocalc/sync/jsonPatch.ts";

export function loadEnvLocal(rootDir: string = process.cwd()): void {
  for (const fileName of [".env.local", ".env"]) {
    const envPath = path.join(rootDir, fileName);
    if (!fs.existsSync(envPath)) continue;
    const raw = fs.readFileSync(envPath, "utf-8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx <= 0) continue;
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
}

export function readValidatedLocalScales(dataDir: string): ScaleRecord[] {
  const sourcesPath = path.join(dataDir, "sources.json");
  const scalesDir = path.join(dataDir, "scales");

  let knownSourceIds = new Set<string>();
  if (fs.existsSync(sourcesPath)) {
    const sources = JSON.parse(
      fs.readFileSync(sourcesPath, "utf-8")
    ) as ScaleReference[];
    const srcErrs = validateSources(sources);
    if (srcErrs.length > 0) {
      throw new Error(`Invalid sources.json: ${srcErrs[0].message}`);
    }
    knownSourceIds = new Set(sources.map((s) => s.id));
  }

  if (!fs.existsSync(scalesDir)) return [];
  const files = fs
    .readdirSync(scalesDir)
    .filter((f) => f.endsWith(".json"))
    .sort();

  const records: ScaleRecord[] = [];
  for (const f of files) {
    const scale = JSON.parse(
      fs.readFileSync(path.join(scalesDir, f), "utf-8")
    ) as ScaleRecord;
    const errs = validateScaleRecord(scale, knownSourceIds);
    if (errs.length > 0) {
      throw new Error(`Validation failed in ${f}: [${errs[0].path}] ${errs[0].message}`);
    }
    const tcFailed = runScaleTestCases(scale).filter((t) => !t.passed);
    if (tcFailed.length > 0) {
      throw new Error(`Test case failed in ${f}: ${tcFailed[0].name} (${tcFailed[0].message})`);
    }
    records.push(scale);
  }
  return records;
}

export async function runMigration(opts: {
  repo: ScaleRepo;
  records: ScaleRecord[];
  apply: boolean;
  actor?: string;
}): Promise<{
  mode: "dry-run" | "apply";
  totalLocal: number;
  existingLive: number;
  toCreate: string[];
  createdCount: number;
  rootHash: string;
}> {
  const actor = opts.actor ?? "calc:migrate-v2";
  const liveRows = await listAllLiveRows(opts.repo);
  const liveSlugs = new Set(liveRows.map((r) => r.slug));

  const toCreate = opts.records.filter((r) => !liveSlugs.has(r.id.toLowerCase()));
  let createdCount = 0;

  if (opts.apply && toCreate.length > 0) {
    for (const rec of toCreate) {
      const contentHash = computeRecordContentHashSync(rec);
      const sectionHashes = computeSectionHashes(rec);
      await opts.repo.create(rec, contentHash, sectionHashes, actor, {
        skipRootRehash: true,
      });
      createdCount += 1;
    }
    await opts.repo.recomputeRootHash();
  }

  const afterLive = opts.apply ? await listAllLiveRows(opts.repo) : liveRows;
  const computedRoot = computeRootHashFromEntries(
    afterLive.map((r) => ({ uid: r.uid, rev: r.rev, contentHash: r.contentHash }))
  );
  const state = await opts.repo.getSyncState();
  if (opts.apply && state.rootHash !== computedRoot) {
    throw new Error(
      `rootHash mismatch after migrate: DB=${state.rootHash} vs computed=${computedRoot}`
    );
  }

  return {
    mode: opts.apply ? "apply" : "dry-run",
    totalLocal: opts.records.length,
    existingLive: liveRows.length,
    toCreate: toCreate.map((r) => r.id),
    createdCount,
    rootHash: state.rootHash,
  };
}

async function main(): Promise<void> {
  loadEnvLocal(process.cwd());
  const apply = process.argv.includes("--apply");
  const dataDir = path.resolve(process.cwd(), "data", "neurocalc");
  const records = readValidatedLocalScales(dataDir);
  const repo = new SupabaseScaleRepo();
  const result = await runMigration({ repo, records, apply });

  console.log(
    `📦 NeuroCalc migrate-v2 (${result.mode}): ${result.totalLocal} local, ${result.existingLive} live, ${result.toCreate.length} to create`
  );
  if (result.toCreate.length > 0) {
    console.log(`   Slugs: ${result.toCreate.join(", ")}`);
  }
  if (!apply && result.toCreate.length > 0) {
    console.log("   Re-run with --apply to write to Supabase.");
  }
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  main().catch((err) => {
    console.error("❌ calc:migrate-v2 failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
