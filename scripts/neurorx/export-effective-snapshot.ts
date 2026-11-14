#!/usr/bin/env node
/**
 * Phase 0 Read-Only Effective Snapshot Exporter for NeuroRx Sync v2
 *
 * Calls the legacy getAllDrugsAsync() read path (protected by a read-only FS guard
 * so nothing is written to /tmp or data/neurorx/drugs) and writes:
 *   - data/neurorx/_migration/snapshot-<YYYYMMDD>.json
 *   - data/neurorx/_migration/summary-<YYYYMMDD>.json
 *
 * Usage:
 *   npm run rx:snapshot
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { DrugRecord } from "../../src/types/neurorx.ts";

const ROOT_DIR = process.cwd();
const SRC_DIR = path.join(ROOT_DIR, "src");
const SRC_URL_PREFIX = pathToFileURL(SRC_DIR).href;
const DATA_DIR = path.join(ROOT_DIR, "data", "neurorx");
const STATIC_DRUGS_DIR = path.join(DATA_DIR, "drugs");
const TMP_DRUGS_DIR = path.join(os.tmpdir(), "neurorx", "drugs");
const MIGRATION_DIR = path.join(DATA_DIR, "_migration");

function loadEnvLocal(): void {
  const envPath = path.join(ROOT_DIR, ".env.local");
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

function findExistingModuleFile(basePath: string): string | null {
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.mjs`,
    path.join(basePath, "index.ts"),
    path.join(basePath, "index.tsx"),
    path.join(basePath, "index.js"),
  ];
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate;
      }
    } catch {
      // Ignore invalid stat paths
    }
  }
  return null;
}

loadEnvLocal();

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const target = path.join(SRC_DIR, specifier.slice(2));
      const resolved = findExistingModuleFile(target);
      if (resolved) {
        return nextResolve(pathToFileURL(resolved).href, context);
      }
    }

    if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      context.parentURL?.startsWith(SRC_URL_PREFIX)
    ) {
      const parentFile = fileURLToPath(context.parentURL);
      const target = path.resolve(path.dirname(parentFile), specifier);
      const resolved = findExistingModuleFile(target);
      if (resolved) {
        return nextResolve(pathToFileURL(resolved).href, context);
      }
    }

    return nextResolve(specifier, context);
  },
});

function readSlugsFromJsonDir(dirPath: string): Set<string> {
  const slugs = new Set<string>();
  if (!fs.existsSync(dirPath)) return slugs;
  for (const fileName of fs.readdirSync(dirPath)) {
    if (!fileName.endsWith(".json")) continue;
    try {
      const raw = JSON.parse(
        fs.readFileSync(path.join(dirPath, fileName), "utf-8")
      ) as Partial<DrugRecord>;
      if (raw?.id) {
        slugs.add(raw.id.toLowerCase().trim());
      }
    } catch {
      // Skip malformed files here; validate.ts catches schema issues separately
    }
  }
  return slugs;
}

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
  const [{ getAllDrugsAsync }, { computeContentHashSync }, { supabaseAdmin, hasSupabaseConfig }] =
    await Promise.all([
      import("../../src/lib/neurorx/data.ts"),
      import("../../src/lib/neurorx/integrity.ts"),
      import("../../src/lib/supabase.ts"),
    ]);

  const staticSlugs = readSlugsFromJsonDir(STATIC_DRUGS_DIR);
  const tmpSlugs = readSlugsFromJsonDir(TMP_DRUGS_DIR);
  const supabaseSlugs = new Set<string>();
  let supabaseReachable = false;
  let supabaseErrorReason: string | null = null;

  if (hasSupabaseConfig()) {
    try {
      const { data: nrRows, error: nrErr } = await supabaseAdmin
        .from("neurorx_drugs")
        .select("id");

      if (!nrErr && Array.isArray(nrRows)) {
        supabaseReachable = true;
        for (const row of nrRows) {
          if (row?.id) supabaseSlugs.add(String(row.id).toLowerCase().trim());
        }
      } else if (nrErr && !String(nrErr.message || "").toLowerCase().includes("fetch failed")) {
        // PostgREST responded (e.g., table missing) -> Supabase is reachable
        supabaseReachable = true;
      } else if (nrErr) {
        supabaseErrorReason = nrErr.message;
      }

      if (supabaseSlugs.size === 0) {
        const { data: ngRows, error: ngErr } = await supabaseAdmin
          .from("neuroguide_docs")
          .select("id, data")
          .like("id", "neurorx_drug_%");

        if (!ngErr && Array.isArray(ngRows)) {
          supabaseReachable = true;
          for (const row of ngRows) {
            const drug = row?.data as Partial<DrugRecord> | undefined;
            if (drug?.id) supabaseSlugs.add(drug.id.toLowerCase().trim());
          }
        } else if (ngErr && !String(ngErr.message || "").toLowerCase().includes("fetch failed")) {
          supabaseReachable = true;
        } else if (ngErr && !supabaseErrorReason) {
          supabaseErrorReason = ngErr.message;
        }
      }
    } catch (err) {
      supabaseErrorReason = err instanceof Error ? err.message : String(err);
    }
  }

  // Guard fs mutations while getAllDrugsAsync() runs so /tmp and data/neurorx/drugs are never modified
  const origWriteFileSync = fs.writeFileSync;
  const origUnlinkSync = fs.unlinkSync;
  const origMkdirSync = fs.mkdirSync;

  fs.writeFileSync = ((file: fs.PathOrFileDescriptor, data: string | NodeJS.ArrayBufferView, options?: fs.WriteFileOptions) => {
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

  fs.mkdirSync = ((target: fs.PathLike, options?: fs.MakeDirectoryOptions | fs.Mode | null) => {
    if (!isAllowedMigrationPath(target)) {
      return undefined;
    }
    return origMkdirSync.call(fs, target, options);
  }) as typeof fs.mkdirSync;

  let effectiveEntries: Awaited<ReturnType<typeof getAllDrugsAsync>>;
  try {
    effectiveEntries = await getAllDrugsAsync();
  } finally {
    fs.writeFileSync = origWriteFileSync;
    fs.unlinkSync = origUnlinkSync;
    fs.mkdirSync = origMkdirSync;
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

    const tiers: string[] = [];
    if (staticSlugs.has(slug)) tiers.push("static");
    if (tmpSlugs.has(slug)) tiers.push("tmp");
    if (supabaseSlugs.has(slug)) tiers.push("supabase");
    sourceTierHints[slug] = tiers.length > 0 ? tiers : ["unknown"];
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
    supabaseConfigured: hasSupabaseConfig(),
    supabaseReachable,
    ...(supabaseErrorReason ? { supabaseErrorReason } : {}),
    generatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(snapshotPath, JSON.stringify(snapshotRecords, null, 2) + "\n", "utf-8");
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + "\n", "utf-8");

  console.log(`Snapshot written: ${path.relative(ROOT_DIR, snapshotPath)}`);
  console.log(`Summary written:  ${path.relative(ROOT_DIR, summaryPath)}`);
  console.log(`Total effective drugs: ${summary.total}`);
  console.log(`Effective status counts: ${JSON.stringify(summary.countByEffectiveStatus)}`);
  console.log(`Hash matches: ${summary.hashMatchCount}`);
  console.log(`Supabase configured: ${summary.supabaseConfigured}, reachable: ${summary.supabaseReachable}`);
  if (supabaseErrorReason) {
    console.log(`Supabase note: ${supabaseErrorReason}`);
  }
}

run().catch((err) => {
  console.error("Failed to export effective snapshot:", err);
  process.exit(1);
});
