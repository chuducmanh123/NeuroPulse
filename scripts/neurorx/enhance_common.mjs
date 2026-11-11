import fs from "fs";
import path from "path";
import { normalizeForQuote } from "../../src/lib/neurorx/integrity.ts";

const SOURCES_DIR = path.resolve(process.cwd(), "data/neurorx/sources");
const DRUGS_DIR = path.resolve(process.cwd(), "data/neurorx/drugs");

export function getQuote(sourceId, anchor, minLen = 30, maxLen = 350) {
  const filePath = path.join(SOURCES_DIR, `${sourceId}.txt`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`[${sourceId}] File not found`);
  }
  const text = fs.readFileSync(filePath, "utf-8");

  // Try direct match
  let idx = text.indexOf(anchor);

  // If not found, try whitespace-insensitive regex
  if (idx === -1) {
    const escaped = anchor
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\s+/g, "\\s+");
    const re = new RegExp(escaped, "i");
    const m = text.match(re);
    if (m && m.index !== undefined) {
      idx = m.index;
    }
  }

  // If still not found, try lowercased
  if (idx === -1) {
    idx = text.toLowerCase().indexOf(anchor.toLowerCase());
  }

  if (idx === -1) {
    throw new Error(`[${sourceId}] Anchor "${anchor}" not found`);
  }

  let slice = text.slice(idx, idx + maxLen);
  const dotIdx = slice.lastIndexOf(". ");
  if (dotIdx > minLen) {
    slice = slice.slice(0, dotIdx + 1);
  }
  const clean = slice.replace(/\s+/g, " ").trim();
  const normText = normalizeForQuote(text);
  const normClean = normalizeForQuote(clean);
  if (!normText.includes(normClean)) {
    throw new Error(`[${sourceId}] Normalization mismatch: ${clean}`);
  }
  return clean;
}

export function updateDrug(id, updater) {
  const filePath = path.join(DRUGS_DIR, `${id}.json`);
  const drug = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const updated = updater(drug);
  fs.writeFileSync(filePath, JSON.stringify(updated, null, 2) + "\n", "utf-8");
  console.log(`✅ Updated ${id}.json`);
}
