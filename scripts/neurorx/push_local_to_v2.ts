#!/usr/bin/env node
/**
 * Push local `data/neurorx/drugs/*.json` changes to NeuroRx Sync v2 (Supabase `neurorx_drug_records`).
 *
 * Usage:
 *   node --use-system-ca --experimental-strip-types scripts/neurorx/push_local_to_v2.ts [--apply]
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { DrugRecord, Source, SourceRef } from "../../src/types/neurorx.ts";
import { SupabaseDrugRepo } from "../../src/lib/neurorx/sync/repoSupabase.ts";
import {
  computeJsonPatch,
  computeRecordContentHashSync,
  computeSectionHashes,
} from "../../src/lib/neurorx/sync/jsonPatch.ts";
import { validateDrug } from "../../src/lib/neurorx/validate.ts";
import { normalizeForQuote } from "../../src/lib/neurorx/integrity.ts";
import { loadEnvLocal } from "./migrate-to-v2.ts";

const DATA_DIR = path.resolve(process.cwd(), "data", "neurorx");
const DRUGS_DIR = path.join(DATA_DIR, "drugs");
const SOURCES_FILE = path.join(DATA_DIR, "sources.json");
const SOURCES_DIR = path.join(DATA_DIR, "sources");

const FORBIDDEN_ENVELOPE_KEYS = [
  "uid",
  "rev",
  "changeSeq",
  "deletedAt",
  "change_seq",
  "deleted_at",
];

function collectSourceRefs(obj: unknown, currentPath: string): { path: string; ref: SourceRef }[] {
  const results: { path: string; ref: SourceRef }[] = [];
  if (!obj || typeof obj !== "object") return results;

  if (Array.isArray(obj)) {
    obj.forEach((item, idx) => {
      results.push(...collectSourceRefs(item, `${currentPath}[${idx}]`));
    });
    return results;
  }

  const record = obj as Record<string, unknown>;
  if (
    typeof record.source_id === "string" &&
    typeof record.locator === "string" &&
    typeof record.quote === "string"
  ) {
    results.push({ path: currentPath, ref: obj as SourceRef });
    return results;
  }

  for (const key of Object.keys(record)) {
    results.push(...collectSourceRefs(record[key], currentPath ? `${currentPath}.${key}` : key));
  }

  return results;
}

export function validateLocalDrugForPush(
  drug: DrugRecord,
  slug: string,
  knownSourceIds: Set<string>,
  sourcesDir: string = SOURCES_DIR
): string[] {
  const errors: string[] = [];
  if (!drug || typeof drug !== "object" || Array.isArray(drug)) {
    return [`${slug}: drug record must be a JSON object`];
  }

  const rawRecord = drug as unknown as Record<string, unknown>;
  for (const key of FORBIDDEN_ENVELOPE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(rawRecord, key)) {
      errors.push(`${slug}: forbidden sync envelope key "${key}"`);
    }
  }

  for (const err of validateDrug(drug, knownSourceIds)) {
    errors.push(`${slug}: [${err.path}] ${err.message}`);
  }

  // Verify every SourceRef quote verbatim against local source documents
  const sourceCache = new Map<string, string>();
  for (const { path: refPath, ref } of collectSourceRefs(drug, slug)) {
    if (!sourceCache.has(ref.source_id)) {
      const txtPath = path.join(sourcesDir, `${ref.source_id}.txt`);
      if (!fs.existsSync(txtPath)) {
        errors.push(`${refPath}: missing source text document sources/${ref.source_id}.txt`);
        sourceCache.set(ref.source_id, "");
        continue;
      }
      sourceCache.set(ref.source_id, normalizeForQuote(fs.readFileSync(txtPath, "utf-8")));
    }

    const sourceText = sourceCache.get(ref.source_id) || "";
    const normQuote = normalizeForQuote(ref.quote);
    if (!normQuote || !sourceText.includes(normQuote)) {
      errors.push(
        `${refPath}: quote for source "${ref.source_id}" (${ref.locator}) not found verbatim`
      );
    }
  }

  // Verified records must already carry clinician attestation and a matching content_hash.
  if (drug.status === "verified") {
    const verifiedBy = drug.verification?.verified_by?.trim();
    const verifiedAt = drug.verification?.verified_at?.trim();
    if (!verifiedBy || !verifiedAt) {
      errors.push(
        `${slug}: status='verified' requires verification.verified_by and verification.verified_at (run npm run rx:verify or mark as draft)`
      );
    }

    const expectedHash = computeRecordContentHashSync(drug);
    if (drug.verification?.content_hash !== expectedHash) {
      errors.push(
        `${slug}: status='verified' content_hash mismatch (stored=${drug.verification?.content_hash || "missing"}, expected=${expectedHash}); run npm run rx:verify`
      );
    }
  }

  return errors;
}

async function main() {
  const apply = process.argv.includes("--apply");
  loadEnvLocal();

  if (!fs.existsSync(SOURCES_FILE)) {
    throw new Error(`Missing sources registry at ${SOURCES_FILE}`);
  }
  const sources = JSON.parse(fs.readFileSync(SOURCES_FILE, "utf-8")) as Source[];
  const knownSourceIds = new Set(sources.map((s) => s.id));

  const files = fs.readdirSync(DRUGS_DIR).filter((f) => f.endsWith(".json")).sort();
  const parsedDrugs: Array<{ slug: string; drug: DrugRecord }> = [];
  const validationErrors: string[] = [];

  for (const f of files) {
    const slug = f.replace(/\.json$/, "");
    const filePath = path.join(DRUGS_DIR, f);
    const drug = JSON.parse(fs.readFileSync(filePath, "utf-8")) as DrugRecord;
    validationErrors.push(...validateLocalDrugForPush(drug, slug, knownSourceIds, SOURCES_DIR));
    parsedDrugs.push({ slug, drug });
  }

  if (validationErrors.length > 0) {
    console.error(`❌ Validation failed (${validationErrors.length} error(s)); aborting push:`);
    for (const err of validationErrors) {
      console.error(`   - ${err}`);
    }
    process.exit(1);
  }

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

  let updated = 0;
  let created = 0;
  let unchanged = 0;

  for (const { slug, drug } of parsedDrugs) {
    const existing = bySlug.get(slug);
    const contentHash = computeRecordContentHashSync(drug);
    const sectionHashes = computeSectionHashes(drug);

    if (!existing) {
      console.log(`  + CREATE ${slug} (status=${drug.status})`);
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
    console.log(`  ~ UPDATE ${slug} (rev ${existing.rev}, ${patchDiff.length} patch ops, status=${drug.status})`);
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

const isDirectEntry =
  typeof process.argv[1] === "string" &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isDirectEntry) {
  main().catch((err) => {
    console.error("Failed to push local drugs to Sync v2:", err);
    process.exit(1);
  });
}
