#!/usr/bin/env node
/**
 * Verification Tool for NeuroRx
 * Promotes a drug from 'draft' to 'verified', sealing it with a cryptographic content_hash.
 * Usage: node --experimental-strip-types scripts/neurorx/verify.ts <drug_id> --by "<Clinician Name>"
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { computeContentHashSync } from "../../src/lib/neurorx/integrity.ts";
import type { DrugRecord } from "../../src/types/neurorx.ts";

const args = process.argv.slice(2);
const drugId = args[0];
const byIdx = args.indexOf("--by");
const verifiedBy = byIdx !== -1 && args[byIdx + 1] ? args[byIdx + 1].trim() : "";

if (!drugId || !verifiedBy) {
  console.error("Usage: npm run rx:verify -- <drug_id> --by \"<Clinician Name>\"");
  console.error("Example: npm run rx:verify -- levetiracetam --by \"Dr. Nguyen Van A\"");
  process.exit(1);
}

const DRUG_FILE = path.resolve(process.cwd(), `data/neurorx/drugs/${drugId}.json`);

if (!fs.existsSync(DRUG_FILE)) {
  console.error(`❌ Drug file not found: data/neurorx/drugs/${drugId}.json`);
  process.exit(1);
}

console.log(`🔒 Verifying drug '${drugId}' by '${verifiedBy}'...`);

// Step 1: Run validate and check-quotes first
try {
  console.log("--> Running schema and reference validation...");
  execSync("node --experimental-strip-types scripts/neurorx/validate.ts", { stdio: "inherit" });
  console.log("--> Running verbatim quote checks...");
  execSync("node --experimental-strip-types scripts/neurorx/check-quotes.ts", { stdio: "inherit" });
} catch {
  console.error("\n❌ Verification aborted: validation or quote checks failed. Fix all issues before verifying.\n");
  process.exit(1);
}

// Step 2: Read, seal and sign the drug record
let drug: DrugRecord;
try {
  drug = JSON.parse(fs.readFileSync(DRUG_FILE, "utf-8"));
} catch (err) {
  console.error("❌ Failed to parse drug file:", err);
  process.exit(1);
}

// Compute deterministic hash without verification block
drug.status = "verified";
drug.verification = {
  verified_by: verifiedBy,
  verified_at: new Date().toISOString().split("T")[0],
  content_hash: "",
};

const hash = computeContentHashSync(drug);
drug.verification.content_hash = hash;

// Write back formatted JSON
fs.writeFileSync(DRUG_FILE, JSON.stringify(drug, null, 2) + "\n", "utf-8");

console.log(`\n🎉 Drug '${drugId}' successfully verified and sealed!`);
console.log(`   Status:       verified`);
console.log(`   Verified By:  ${drug.verification.verified_by}`);
console.log(`   Verified At:  ${drug.verification.verified_at}`);
console.log(`   Content Hash: ${hash}\n`);
