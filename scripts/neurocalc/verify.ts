#!/usr/bin/env node
/**
 * CLI Scale Verifier for NeuroCalc
 * Usage: npm run calc:verify -- <scale_id> --by "<Reviewer Name>" [--local-only]
 */

import fs from "node:fs";
import path from "node:path";
import { validateScaleRecord, validateSources } from "../../src/lib/neurocalc/validate.ts";
import {
  computeSectionHashes,
  sealVerifiedScale,
} from "../../src/lib/neurocalc/integrity.ts";
import { computeJsonPatch } from "../../src/lib/neurocalc/sync/jsonPatch.ts";
import { listAllLiveRows } from "../../src/lib/neurocalc/sync/handlers.ts";
import { SupabaseScaleRepo } from "../../src/lib/neurocalc/sync/repoSupabase.ts";
import { runScaleTestCases } from "../../src/lib/neurocalc/engine.ts";
import type { ScaleRecord, ScaleReference } from "../../src/types/neurocalc.ts";
import { loadEnvLocal } from "./migrate-to-v2.ts";

const DATA_DIR = path.resolve(process.cwd(), "data/neurocalc");
const SOURCES_FILE = path.join(DATA_DIR, "sources.json");
const SCALES_DIR = path.join(DATA_DIR, "scales");

function parseArgs(argv: string[]): {
  scaleId: string;
  verifiedBy: string;
  localOnly: boolean;
} {
  let scaleId = "";
  let verifiedBy = "";
  let localOnly = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--by" && argv[i + 1]) {
      verifiedBy = argv[i + 1].trim();
      i += 1;
    } else if (arg === "--local-only") {
      localOnly = true;
    } else if (!arg.startsWith("--") && !scaleId) {
      scaleId = arg.trim();
    }
  }

  if (!scaleId || !verifiedBy) {
    console.error(
      'Usage: npm run calc:verify -- <scale_id> --by "<Reviewer Name>" [--local-only]'
    );
    process.exit(1);
  }

  return { scaleId, verifiedBy, localOnly };
}

async function main(): Promise<void> {
  loadEnvLocal(process.cwd());
  const { scaleId, verifiedBy, localOnly } = parseArgs(process.argv.slice(2));
  const scalePath = path.join(SCALES_DIR, `${scaleId}.json`);

  if (!fs.existsSync(scalePath)) {
    console.error(`❌ Scale file not found: ${scalePath}`);
    process.exit(1);
  }

  let knownSourceIds = new Set<string>();
  if (fs.existsSync(SOURCES_FILE)) {
    const sources = JSON.parse(
      fs.readFileSync(SOURCES_FILE, "utf-8")
    ) as ScaleReference[];
    const srcErrors = validateSources(sources);
    if (srcErrors.length > 0) {
      console.error("❌ sources.json has validation errors:", srcErrors);
      process.exit(1);
    }
    knownSourceIds = new Set(sources.map((s) => s.id));
  }

  const scale = JSON.parse(fs.readFileSync(scalePath, "utf-8")) as ScaleRecord;
  const errors = validateScaleRecord(scale, knownSourceIds);
  if (errors.length > 0) {
    console.error(`❌ Scale '${scaleId}' failed validation:`);
    for (const e of errors) {
      console.error(`   - [${e.path}] ${e.message}`);
    }
    process.exit(1);
  }

  const failedTests = runScaleTestCases(scale).filter((t) => !t.passed);
  if (failedTests.length > 0) {
    console.error(`❌ Scale '${scaleId}' failed embedded test_cases:`);
    for (const t of failedTests) {
      console.error(`   - [${t.name}] ${t.message}`);
    }
    process.exit(1);
  }

  const verifiedScale = sealVerifiedScale(scale, verifiedBy);
  const contentHash = verifiedScale.verification.content_hash!;
  const sectionHashes = computeSectionHashes(verifiedScale);

  fs.writeFileSync(
    scalePath,
    JSON.stringify(verifiedScale, null, 2) + "\n",
    "utf-8"
  );

  const hasSupabaseCreds =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!localOnly && hasSupabaseCreds) {
    const repo = new SupabaseScaleRepo();
    const liveRows = await listAllLiveRows(repo);
    const existing = liveRows.find((r) => r.slug === verifiedScale.id);
    if (existing) {
      const patch = computeJsonPatch(existing.data, verifiedScale);
      await repo.update(
        existing.uid,
        existing.rev,
        verifiedScale,
        contentHash,
        sectionHashes,
        patch,
        verifiedBy
      );
      console.log(`☁️  Synced verified '${verifiedScale.id}' to Supabase Sync v2`);
    }
  }

  console.log(`🔒 Verified '${verifiedScale.id}' by ${verifiedBy}`);
  console.log(`   content_hash: ${contentHash}`);
  console.log(`   section_hashes: ${JSON.stringify(sectionHashes)}`);
}

main().catch((err) => {
  console.error("❌ calc:verify failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
