#!/usr/bin/env node
/**
 * Verbatim Quote Checker for NeuroRx
 * Verifies that every SourceRef quote exists verbatim in data/neurorx/sources/<source_id>.txt
 * Usage: node --experimental-strip-types scripts/neurorx/check-quotes.ts
 */

import fs from "node:fs";
import path from "node:path";
import { normalizeForQuote } from "../../src/lib/neurorx/integrity.ts";
import type { SourceRef } from "../../src/types/neurorx.ts";

const DATA_DIR = path.resolve(process.cwd(), "data/neurorx");
const SOURCES_DIR = path.join(DATA_DIR, "sources");
const DRUGS_DIR = path.join(DATA_DIR, "drugs");
const INTERACTIONS_FILE = path.join(DATA_DIR, "interactions.json");
const LEDD_FACTORS_FILE = path.join(DATA_DIR, "ledd-factors.json");

interface QuoteCheckFailure {
  target: string;
  source_id: string;
  locator: string;
  quoteExcerpt: string;
  reason: string;
}

// Cache of normalized source documents
const sourceCache = new Map<string, string>();

function getNormalizedSourceText(sourceId: string): { text?: string; error?: string } {
  if (sourceCache.has(sourceId)) {
    return { text: sourceCache.get(sourceId) };
  }

  const txtPath = path.join(SOURCES_DIR, `${sourceId}.txt`);
  if (!fs.existsSync(txtPath)) {
    return { error: `Missing source text document: sources/${sourceId}.txt` };
  }

  try {
    const raw = fs.readFileSync(txtPath, "utf-8");
    const normalized = normalizeForQuote(raw);
    sourceCache.set(sourceId, normalized);
    return { text: normalized };
  } catch (err) {
    return { error: `Failed to read sources/${sourceId}.txt: ${err}` };
  }
}

// Recursively traverse an object and collect all SourceRef objects with their JSON path
function collectRefs(obj: unknown, currentPath: string): { path: string; ref: SourceRef }[] {
  const results: { path: string; ref: SourceRef }[] = [];
  if (!obj || typeof obj !== "object") return results;

  if (Array.isArray(obj)) {
    obj.forEach((item, idx) => {
      results.push(...collectRefs(item, `${currentPath}[${idx}]`));
    });
    return results;
  }

  // Check if this object is a SourceRef
  const o = obj as Record<string, unknown>;
  if (
    typeof o.source_id === "string" &&
    typeof o.locator === "string" &&
    typeof o.quote === "string"
  ) {
    results.push({ path: currentPath, ref: obj as SourceRef });
    return results;
  }

  for (const key of Object.keys(o)) {
    results.push(...collectRefs(o[key], currentPath ? `${currentPath}.${key}` : key));
  }

  return results;
}

function runQuoteCheck(): boolean {
  console.log("🔍 Checking all clinical quotes against source documents...");
  const failures: QuoteCheckFailure[] = [];
  let totalQuotesChecked = 0;

  // 1. Check all drug records
  if (fs.existsSync(DRUGS_DIR)) {
    const drugFiles = fs
      .readdirSync(DRUGS_DIR)
      .filter((f) => f.endsWith(".json"));

    for (const f of drugFiles) {
      const fullPath = path.join(DRUGS_DIR, f);
      let drugObj: unknown;
      try {
        drugObj = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
      } catch (err) {
        failures.push({
          target: f,
          source_id: "N/A",
          locator: "root",
          quoteExcerpt: "N/A",
          reason: `Failed to parse JSON: ${err}`,
        });
        continue;
      }

      const refs = collectRefs(drugObj, f);
      for (const { path: p, ref } of refs) {
        totalQuotesChecked++;
        const { text: sourceText, error } = getNormalizedSourceText(ref.source_id);
        if (error || !sourceText) {
          failures.push({
            target: p,
            source_id: ref.source_id,
            locator: ref.locator,
            quoteExcerpt: ref.quote.slice(0, 80),
            reason: error || "Source text not loaded",
          });
          continue;
        }

        const normalizedQuote = normalizeForQuote(ref.quote);
        if (!sourceText.includes(normalizedQuote)) {
          failures.push({
            target: p,
            source_id: ref.source_id,
            locator: ref.locator,
            quoteExcerpt: ref.quote.slice(0, 80),
            reason: `Verbatim quote NOT found in sources/${ref.source_id}.txt! Hallucination guard triggered.`,
          });
        }
      }
    }
  }

  // 2. Check interactions
  if (fs.existsSync(INTERACTIONS_FILE)) {
    try {
      const ints = JSON.parse(fs.readFileSync(INTERACTIONS_FILE, "utf-8"));
      const refs = collectRefs(ints, "interactions.json");
      for (const { path: p, ref } of refs) {
        totalQuotesChecked++;
        const { text: sourceText, error } = getNormalizedSourceText(ref.source_id);
        if (error || !sourceText) {
          failures.push({
            target: p,
            source_id: ref.source_id,
            locator: ref.locator,
            quoteExcerpt: ref.quote.slice(0, 80),
            reason: error || "Source text not loaded",
          });
          continue;
        }

        const normalizedQuote = normalizeForQuote(ref.quote);
        if (!sourceText.includes(normalizedQuote)) {
          failures.push({
            target: p,
            source_id: ref.source_id,
            locator: ref.locator,
            quoteExcerpt: ref.quote.slice(0, 80),
            reason: `Verbatim quote NOT found in sources/${ref.source_id}.txt!`,
          });
        }
      }
    } catch {
      // already caught by validate.ts
    }
  }

  // 3. Check LEDD factors (Task 19)
  if (fs.existsSync(LEDD_FACTORS_FILE)) {
    try {
      const leddObj = JSON.parse(fs.readFileSync(LEDD_FACTORS_FILE, "utf-8"));
      const refs = collectRefs(leddObj, "ledd-factors.json");
      for (const { path: p, ref } of refs) {
        totalQuotesChecked++;
        const { text: sourceText, error } = getNormalizedSourceText(ref.source_id);
        if (error || !sourceText) {
          failures.push({
            target: p,
            source_id: ref.source_id,
            locator: ref.locator,
            quoteExcerpt: ref.quote.slice(0, 80),
            reason: error || "Source text not loaded",
          });
          continue;
        }

        const normalizedQuote = normalizeForQuote(ref.quote);
        if (!sourceText.includes(normalizedQuote)) {
          failures.push({
            target: p,
            source_id: ref.source_id,
            locator: ref.locator,
            quoteExcerpt: ref.quote.slice(0, 80),
            reason: `Verbatim quote NOT found in sources/${ref.source_id}.txt!`,
          });
        }
      }
    } catch {
      // already caught by validate.ts
    }
  }

  if (failures.length > 0) {
    console.error(`\n❌ Failed quote verification on ${failures.length} quote(s):`);
    failures.forEach((f) => {
      console.error(`\n  Target: ${f.target}`);
      console.error(`  Source: ${f.source_id} (${f.locator})`);
      console.error(`  Quote excerpt: "${f.quoteExcerpt}..."`);
      console.error(`  Issue: ${f.reason}`);
    });
    console.error("\n❌ Quote verification FAILED.\n");
    return false;
  }

  console.log(`✅ All ${totalQuotesChecked} quote(s) verified verbatim against official source documents!\n`);
  return true;
}

const ok = runQuoteCheck();
if (!ok) {
  process.exit(1);
}
