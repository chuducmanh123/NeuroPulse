#!/usr/bin/env node
/**
 * Push local `data/neurorx/drugs/*.json` changes to NeuroRx Sync v2 (Supabase `neurorx_drug_records`).
 *
 * Usage:
 *   node --use-system-ca --experimental-strip-types scripts/neurorx/push_local_to_v2.ts [--apply]
 */

import fs from "node:fs";
import path from "node:path";
import type { DrugRecord } from "../../src/types/neurorx.ts";
import { SupabaseDrugRepo } from "../../src/lib/neurorx/sync/repoSupabase.ts";
import {
  computeJsonPatch,
  computeRecordContentHashSync,
  computeSectionHashes,
} from "../../src/lib/neurorx/sync/jsonPatch.ts";
import { loadEnvLocal } from "./migrate-to-v2.ts";

const DRUGS_DIR = path.resolve(process.cwd(), "data", "neurorx", "drugs");

async function main() {
  const apply = process.argv.includes("--apply");
  loadEnvLocal();

  const repo = new SupabaseDrugRepo();
  const stateBefore = await repo.getSyncState();
  console.log(`Sync v2 before: maxSeq=${stateBefore.maxSeq}, rootHash=${stateBefore.rootHash}`);

  // Fetch all existing live rows from Sync v2
  const allRows = [];
  let since = 0;
  while (true) {
    const page = await repo.changesSince(since, 200);
    if (page.rows.length === 0) break;
    allRows.push(...page.rows);
    const lastSeq = page.rows[page.rows.length - 1].changeSeq;
    if (lastSeq <= since || page.rows.length < 200) break;
    since = lastSeq;
  }

  const bySlug = new Map(allRows.filter((r) => !r.deletedAt).map((r) => [r.slug, r]));
  const files = fs.readdirSync(DRUGS_DIR).filter((f) => f.endsWith(".json")).sort();

  let updated = 0;
  let created = 0;
  let unchanged = 0;

  for (const f of files) {
    const slug = f.replace(/\.json$/, "");
    const drug = JSON.parse(fs.readFileSync(path.join(DRUGS_DIR, f), "utf-8")) as DrugRecord;
    const contentHash = computeRecordContentHashSync(drug);
    const sectionHashes = computeSectionHashes(drug);
    const existing = bySlug.get(slug);

    if (!existing) {
      console.log(`  + CREATE ${slug}`);
      if (apply) {
        await repo.create(drug, contentHash, sectionHashes, "cli:push_local_to_v2");
      }
      created++;
      continue;
    }

    if (existing.contentHash === contentHash) {
      unchanged++;
      continue;
    }

    const patchDiff = computeJsonPatch(existing.data, drug);
    console.log(`  ~ UPDATE ${slug} (rev ${existing.rev}, ${patchDiff.length} patch ops)`);
    if (apply) {
      await repo.update(
        existing.uid,
        existing.rev,
        drug,
        contentHash,
        sectionHashes,
        patchDiff,
        "cli:push_local_to_v2"
      );
    }
    updated++;
  }

  if (apply) {
    const stateAfter = await repo.getSyncState();
    console.log(`\nSync v2 after: maxSeq=${stateAfter.maxSeq}, rootHash=${stateAfter.rootHash}`);
  } else {
    console.log(`\nDry-run complete. Re-run with --apply to push changes.`);
  }
  console.log({ totalFiles: files.length, updated, created, unchanged, apply });
}

main().catch((err) => {
  console.error("Failed to push local drugs to Sync v2:", err);
  process.exit(1);
});
