#!/usr/bin/env node
/**
 * Push local mirror edits (`data/neurocalc/scales/*.json`) -> Supabase Sync v2 (`calc:push`)
 * Default mode is dry-run; pass `--apply` to create/update records with optimistic `expectedRev`.
 */

import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  computeJsonPatch,
  computeRecordContentHashSync,
  computeSectionHashes,
} from "../../src/lib/neurocalc/sync/jsonPatch.ts";
import { listAllLiveRows } from "../../src/lib/neurocalc/sync/handlers.ts";
import { SupabaseScaleRepo } from "../../src/lib/neurocalc/sync/repoSupabase.ts";
import { loadEnvLocal, readValidatedLocalScales } from "./migrate-to-v2.ts";

async function main(): Promise<void> {
  loadEnvLocal(process.cwd());
  const apply = process.argv.includes("--apply");
  const dataDir = path.resolve(process.cwd(), "data", "neurocalc");
  const localScales = readValidatedLocalScales(dataDir);

  const repo = new SupabaseScaleRepo();
  const liveRows = await listAllLiveRows(repo);
  const liveBySlug = new Map(liveRows.map((r) => [r.slug, r]));

  const toCreate: string[] = [];
  const toUpdate: Array<{ slug: string; uid: string; rev: number; ops: number }> = [];
  let unchanged = 0;

  for (const local of localScales) {
    const contentHash = computeRecordContentHashSync(local);
    const sectionHashes = computeSectionHashes(local);
    const live = liveBySlug.get(local.id);

    if (!live) {
      toCreate.push(local.id);
      if (apply) {
        await repo.create(local, contentHash, sectionHashes, "calc:push");
      }
      continue;
    }

    if (live.contentHash === contentHash) {
      unchanged += 1;
      continue;
    }

    const patch = computeJsonPatch(live.data, local);
    toUpdate.push({ slug: local.id, uid: live.uid, rev: live.rev, ops: patch.length });
    if (apply) {
      await repo.update(
        live.uid,
        live.rev,
        local,
        contentHash,
        sectionHashes,
        patch,
        "calc:push"
      );
    }
  }

  console.log(
    `⬆️  NeuroCalc push (${apply ? "apply" : "dry-run"}): ${toCreate.length} create, ${toUpdate.length} update, ${unchanged} unchanged`
  );
  if (toCreate.length > 0) console.log(`   Create: ${toCreate.join(", ")}`);
  if (toUpdate.length > 0) {
    console.log(
      `   Update: ${toUpdate.map((u) => `${u.slug}@rev${u.rev} (${u.ops} ops)`).join(", ")}`
    );
  }
  if (!apply && (toCreate.length > 0 || toUpdate.length > 0)) {
    console.log("   Re-run with --apply to push changes to Supabase.");
  }
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  main().catch((err) => {
    console.error("❌ calc:push failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
