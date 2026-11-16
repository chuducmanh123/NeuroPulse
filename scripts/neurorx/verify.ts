#!/usr/bin/env node
/**
 * Verification Tool for NeuroRx (Sync v2)
 * Validates schema/quotes locally, promotes the live record in Supabase `neurorx_drug_records`
 * via `repo.update` with `expectedRev` (sealing cryptographic `content_hash`), and refreshes
 * the local read-only mirror file.
 *
 * Usage:
 *   npm run rx:verify -- <drug_id> --by "<Clinician Name>"
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { handleVerifyDrugV2, listAllLiveRows } from "../../src/lib/neurorx/sync/handlers.ts";
import { SupabaseDrugRepo } from "../../src/lib/neurorx/sync/repoSupabase.ts";
import type { SyncRow } from "../../src/lib/neurorx/sync/types.ts";
import { loadEnvLocal } from "./migrate-to-v2.ts";

const args = process.argv.slice(2);
const drugId = args[0]?.toLowerCase().trim() ?? "";
const byIdx = args.indexOf("--by");
const verifiedBy = byIdx !== -1 && args[byIdx + 1] ? args[byIdx + 1].trim() : "";

if (!drugId || !verifiedBy) {
  console.error('Usage: npm run rx:verify -- <drug_id> --by "<Clinician Name>"');
  console.error('Example: npm run rx:verify -- levetiracetam-oral --by "Dr. Nguyen Van A"');
  process.exit(1);
}

const DRUGS_DIR = path.resolve(process.cwd(), "data", "neurorx", "drugs");

async function runVerify(): Promise<void> {
  console.log(`🔒 Verifying drug '${drugId}' by '${verifiedBy}' (Sync v2)...`);

  // Step 1: Validate schema, sources, and verbatim quotes before promoting
  try {
    console.log("--> Running schema and reference validation...");
    execSync("node --experimental-strip-types scripts/neurorx/validate.ts", { stdio: "inherit" });
    console.log("--> Running verbatim quote checks...");
    execSync("node --experimental-strip-types scripts/neurorx/check-quotes.ts", { stdio: "inherit" });
  } catch {
    console.error(
      "\n❌ Verification aborted: validation or quote checks failed. Fix all issues before verifying.\n"
    );
    process.exit(1);
  }

  loadEnvLocal();
  const repo = new SupabaseDrugRepo();
  const liveRows = await listAllLiveRows(repo);
  const current =
    liveRows.find(
      (row) => row.slug === drugId || row.data.id.toLowerCase().trim() === drugId
    ) ?? null;

  if (!current) {
    console.error(`❌ Live drug record not found in Sync v2: ${drugId}`);
    process.exit(1);
  }

  const result = await handleVerifyDrugV2(
    {
      repo,
      isAdmin: true,
      actor: verifiedBy,
    },
    {
      uid: current.uid,
      expected_rev: current.rev,
      verified_by: verifiedBy,
    }
  );

  if (result.status !== 200 || !result.body || !("row" in (result.body as Record<string, unknown>))) {
    console.error(`❌ Verification failed (HTTP ${result.status}):`, result.body);
    process.exit(1);
  }

  const payload = result.body as { row: SyncRow; unchanged: boolean };
  fs.mkdirSync(DRUGS_DIR, { recursive: true });
  const mirrorPath = path.join(DRUGS_DIR, `${payload.row.slug}.json`);
  fs.writeFileSync(mirrorPath, JSON.stringify(payload.row.data, null, 2) + "\n", "utf-8");

  console.log(`\n🎉 Drug '${payload.row.slug}' verified & sealed via Sync v2!`);
  console.log(`   UID:          ${payload.row.uid}`);
  console.log(`   Revision:     ${payload.row.rev} (seq #${payload.row.changeSeq}${payload.unchanged ? ", unchanged" : ""})`);
  console.log(`   Verified By:  ${payload.row.data.verification?.verified_by}`);
  console.log(`   Verified At:  ${payload.row.data.verification?.verified_at}`);
  console.log(`   Content Hash: ${payload.row.contentHash}\n`);
}

runVerify().catch((err) => {
  console.error("❌ rx:verify failed:", err);
  process.exit(1);
});
