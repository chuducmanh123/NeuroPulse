#!/usr/bin/env node
/**
 * CLI Data Validator for NeuroCalc
 * Usage: node --experimental-strip-types scripts/neurocalc/validate.ts
 */

import fs from "node:fs";
import path from "node:path";
import { validateScaleRecord, validateSources } from "../../src/lib/neurocalc/validate.ts";
import { computeRecordContentHashSync } from "../../src/lib/neurocalc/integrity.ts";
import { runScaleTestCases } from "../../src/lib/neurocalc/engine.ts";
import type { ScaleRecord, ScaleReference } from "../../src/types/neurocalc.ts";

const DATA_DIR = path.resolve(process.cwd(), "data/neurocalc");
const SOURCES_FILE = path.join(DATA_DIR, "sources.json");
const SCALES_DIR = path.join(DATA_DIR, "scales");

function runValidation(): boolean {
  console.log("🔍 Validating NeuroCalc data directory:", DATA_DIR);

  let hasErrors = false;

  if (!fs.existsSync(SOURCES_FILE)) {
    console.error("❌ Missing sources.json at", SOURCES_FILE);
    return false;
  }

  let sources: ScaleReference[] = [];
  try {
    sources = JSON.parse(fs.readFileSync(SOURCES_FILE, "utf-8")) as ScaleReference[];
  } catch (err) {
    console.error("❌ Failed to parse sources.json:", err);
    return false;
  }

  const sourceErrors = validateSources(sources);
  if (sourceErrors.length > 0) {
    hasErrors = true;
    console.error(`❌ Found ${sourceErrors.length} error(s) in sources.json:`);
    for (const e of sourceErrors) {
      console.error(`   - [${e.path}] ${e.message}`);
    }
  } else {
    console.log(`✅ sources.json passed (${sources.length} sources registered)`);
  }

  const knownSourceIds = new Set(sources.map((s) => s.id));

  if (fs.existsSync(SCALES_DIR)) {
    const scaleFiles = fs
      .readdirSync(SCALES_DIR)
      .filter((f) => f.endsWith(".json"))
      .sort();

    console.log(`🔍 Validating ${scaleFiles.length} scale file(s)...`);

    for (const f of scaleFiles) {
      const fullPath = path.join(SCALES_DIR, f);
      let scale: ScaleRecord;
      try {
        scale = JSON.parse(fs.readFileSync(fullPath, "utf-8")) as ScaleRecord;
      } catch (err) {
        hasErrors = true;
        console.error(`❌ Failed to parse ${f}:`, err);
        continue;
      }

      const scaleErrors = validateScaleRecord(scale, knownSourceIds);
      const expectedSlug = f.replace(/\.json$/i, "");
      if (scale.id && scale.id !== expectedSlug) {
        scaleErrors.push({
          path: `${f}:id`,
          message: `Scale id '${scale.id}' does not match filename '${f}'`,
        });
      }

      if (scale.status === "verified") {
        const storedHash = scale.verification?.content_hash;
        const currentHash = computeRecordContentHashSync(scale);
        if (!storedHash) {
          scaleErrors.push({
            path: `${f}:verification.content_hash`,
            message: "Scale status is 'verified' but content_hash is missing",
          });
        } else if (storedHash !== currentHash) {
          scaleErrors.push({
            path: `${f}:verification.content_hash`,
            message: `Hash mismatch! Stored: ${storedHash}, Current: ${currentHash}. Re-verification required.`,
          });
        }
      }

      if (scaleErrors.length === 0) {
        const testResults = runScaleTestCases(scale);
        for (const tr of testResults) {
          if (!tr.passed) {
            scaleErrors.push({
              path: `${f}:test_cases[${tr.name}]`,
              message: tr.message ?? "Test case failed",
            });
          }
        }
      }

      if (scaleErrors.length > 0) {
        hasErrors = true;
        console.error(`❌ Found ${scaleErrors.length} error(s) in ${f}:`);
        for (const e of scaleErrors) {
          console.error(`   - [${e.path}] ${e.message}`);
        }
      } else {
        const statusBadge =
          scale.status === "verified" ? "🔒 verified" : "📝 draft";
        const tcCount = scale.test_cases?.length ?? 0;
        console.log(`   ✅ ${f} (${statusBadge}, ${tcCount} test case(s))`);
      }
    }
  }

  if (hasErrors) {
    console.error("\n❌ NeuroCalc validation failed.");
    return false;
  }

  console.log("\n🎉 All NeuroCalc data checks passed!");
  return true;
}

const ok = runValidation();
process.exit(ok ? 0 : 1);
