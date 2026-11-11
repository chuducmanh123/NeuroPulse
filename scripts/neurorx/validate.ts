#!/usr/bin/env node
/**
 * CLI Data Validator for NeuroRx
 * Usage: node --experimental-strip-types scripts/neurorx/validate.ts
 */

import fs from "node:fs";
import path from "node:path";
import {
  validateSources,
  validateDrug,
  validateInteractions,
} from "../../src/lib/neurorx/validate.ts";
import { computeContentHashSync } from "../../src/lib/neurorx/integrity.ts";
import type { DrugRecord, Source, Interaction } from "../../src/types/neurorx.ts";

const DATA_DIR = path.resolve(process.cwd(), "data/neurorx");
const SOURCES_FILE = path.join(DATA_DIR, "sources.json");
const INTERACTIONS_FILE = path.join(DATA_DIR, "interactions.json");
const LEDD_FACTORS_FILE = path.join(DATA_DIR, "ledd-factors.json");
const DRUGS_DIR = path.join(DATA_DIR, "drugs");

function runValidation(): boolean {
  console.log("🔍 Validating NeuroRx data directory:", DATA_DIR);

  let hasErrors = false;

  // 1. Sources validation
  if (!fs.existsSync(SOURCES_FILE)) {
    console.error("❌ Missing sources.json at", SOURCES_FILE);
    return false;
  }

  let sources: Source[] = [];
  try {
    sources = JSON.parse(fs.readFileSync(SOURCES_FILE, "utf-8"));
  } catch (err) {
    console.error("❌ Failed to parse sources.json:", err);
    return false;
  }

  const sourceErrors = validateSources(sources);
  if (sourceErrors.length > 0) {
    hasErrors = true;
    console.error(`❌ Found ${sourceErrors.length} error(s) in sources.json:`);
    sourceErrors.forEach((e) => console.error(`   - [${e.path}] ${e.message}`));
  } else {
    console.log(`✅ sources.json passed (${sources.length} sources registered)`);
  }

  const knownSourceIds = new Set(sources.map((s) => s.id));

  // 2. Drugs validation
  const knownDrugIds = new Set<string>();
  if (fs.existsSync(DRUGS_DIR)) {
    const drugFiles = fs
      .readdirSync(DRUGS_DIR)
      .filter((f) => f.endsWith(".json"));

    console.log(`🔍 Validating ${drugFiles.length} drug file(s)...`);

    for (const f of drugFiles) {
      const fullPath = path.join(DRUGS_DIR, f);
      let drug: DrugRecord;
      try {
        drug = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
      } catch (err) {
        hasErrors = true;
        console.error(`❌ Failed to parse ${f}:`, err);
        continue;
      }

      const drugErrors = validateDrug(drug, knownSourceIds);
      if (drug.id) {
        knownDrugIds.add(drug.id);
      }

      // Check content hash integrity if status is 'verified'
      if (drug.status === "verified") {
        const storedHash = drug.verification?.content_hash;
        const currentHash = computeContentHashSync(drug);
        if (!storedHash) {
          drugErrors.push({
            path: `${f}:drug.verification.content_hash`,
            message: "Drug status is 'verified' but content_hash is missing",
          });
        } else if (storedHash !== currentHash) {
          drugErrors.push({
            path: `${f}:drug.verification.content_hash`,
            message: `Hash mismatch! Stored: ${storedHash}, Current: ${currentHash}. Record has been modified without re-verification!`,
          });
        }
      }

      if (drugErrors.length > 0) {
        hasErrors = true;
        console.error(`❌ Found ${drugErrors.length} error(s) in ${f}:`);
        drugErrors.forEach((e) => console.error(`   - [${e.path}] ${e.message}`));
      } else {
        const statusBadge = drug.status === "verified" ? "🔒 verified" : "📝 draft";
        console.log(`  ✅ ${f} (${drug.generic_name}) [${statusBadge}]`);
      }
    }
  }

  // 3. Interactions validation
  if (fs.existsSync(INTERACTIONS_FILE)) {
    let interactions: Interaction[] = [];
    try {
      interactions = JSON.parse(fs.readFileSync(INTERACTIONS_FILE, "utf-8"));
    } catch (err) {
      hasErrors = true;
      console.error("❌ Failed to parse interactions.json:", err);
    }

    const intErrors = validateInteractions(interactions, knownDrugIds, knownSourceIds);
    if (intErrors.length > 0) {
      hasErrors = true;
      console.error(`❌ Found ${intErrors.length} error(s) in interactions.json:`);
      intErrors.forEach((e) => console.error(`   - [${e.path}] ${e.message}`));
    } else {
      console.log(`✅ interactions.json passed (${interactions.length} interactions)`);
    }
  }

  // 4. LEDD factors validation (Task 19)
  if (fs.existsSync(LEDD_FACTORS_FILE)) {
    try {
      const leddData = JSON.parse(fs.readFileSync(LEDD_FACTORS_FILE, "utf-8"));
      const leddErrors: { path: string; message: string }[] = [];

      if (!Array.isArray(leddData.factors)) {
        leddErrors.push({ path: "ledd-factors.json:factors", message: "factors must be an array" });
      } else {
        leddData.factors.forEach((f: any, idx: number) => {
          if (!f.drug_id) leddErrors.push({ path: `factors[${idx}].drug_id`, message: "Missing drug_id" });
          if (typeof f.factor !== "number" || f.factor <= 0) leddErrors.push({ path: `factors[${idx}].factor`, message: "Factor must be a positive number" });
          if (!f.unit) leddErrors.push({ path: `factors[${idx}].unit`, message: "Missing unit" });
          if (!Array.isArray(f.refs) || f.refs.length === 0) {
            leddErrors.push({ path: `factors[${idx}].refs`, message: "Must have at least one SourceRef" });
          } else {
            f.refs.forEach((ref: any, rIdx: number) => {
              if (!knownSourceIds.has(ref.source_id)) {
                leddErrors.push({ path: `factors[${idx}].refs[${rIdx}].source_id`, message: `Unknown source_id '${ref.source_id}'` });
              }
              if (!ref.quote || ref.quote.length > 400) {
                leddErrors.push({ path: `factors[${idx}].refs[${rIdx}].quote`, message: "Quote must be non-empty and <= 400 chars" });
              }
            });
          }
        });
      }

      if (leddData.npo_conversions && Array.isArray(leddData.npo_conversions)) {
        leddData.npo_conversions.forEach((npo: any, idx: number) => {
          if (!npo.from || !npo.to || !npo.rule_text) {
            leddErrors.push({ path: `npo_conversions[${idx}]`, message: "Must specify from, to, and rule_text" });
          }
          if (!Array.isArray(npo.refs) || npo.refs.length === 0) {
            leddErrors.push({ path: `npo_conversions[${idx}].refs`, message: "Must have at least one SourceRef" });
          } else {
            npo.refs.forEach((ref: any, rIdx: number) => {
              if (!knownSourceIds.has(ref.source_id)) {
                leddErrors.push({ path: `npo_conversions[${idx}].refs[${rIdx}].source_id`, message: `Unknown source_id '${ref.source_id}'` });
              }
              if (!ref.quote || ref.quote.length > 400) {
                leddErrors.push({ path: `npo_conversions[${idx}].refs[${rIdx}].quote`, message: "Quote must be non-empty and <= 400 chars" });
              }
            });
          }
        });
      }

      if (leddErrors.length > 0) {
        hasErrors = true;
        console.error(`❌ Found ${leddErrors.length} error(s) in ledd-factors.json:`);
        leddErrors.forEach((e) => console.error(`   - [${e.path}] ${e.message}`));
      } else {
        console.log(`✅ ledd-factors.json passed (${leddData.factors.length} factors, ${(leddData.npo_conversions || []).length} NPO conversions)`);
      }
    } catch (err) {
      hasErrors = true;
      console.error("❌ Failed to parse ledd-factors.json:", err);
    }
  }

  if (hasErrors) {
    console.error("\n❌ Validation FAILED. Please resolve all errors above.\n");
    return false;
  }

  console.log("\n🎉 All NeuroRx data files passed validation successfully!\n");
  return true;
}

const success = runValidation();
if (!success) {
  process.exit(1);
}
