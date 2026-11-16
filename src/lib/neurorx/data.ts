// Static clinical metadata loader for NeuroRx (CDSS)
// Drug records are served exclusively via Sync v2 (src/lib/neurorx/sync/*).
// Reference: SPEC-neurorx.md Section 4 & tasks/neurorx-sync/00-design-neurorx-sync.md (I1)

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { Source, Interaction, TallManEntry } from "@/types/neurorx";

export type { DrugWithEffectiveStatus } from "./sync/types";

const DATA_DIR = path.resolve(process.cwd(), "data/neurorx");

/**
 * Loads all registered sources from data/neurorx/sources.json
 */
export function getAllSources(): Source[] {
  const filePath = path.join(DATA_DIR, "sources.json");
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return [];
  }
}

/**
 * Loads official Tall Man entries from data/neurorx/tall-man.json
 */
export function getTallManEntries(): TallManEntry[] {
  const filePath = path.join(DATA_DIR, "tall-man.json");
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return [];
  }
}

/**
 * Loads all curated interactions from data/neurorx/interactions.json
 */
export function getAllInteractions(): Interaction[] {
  const filePath = path.join(DATA_DIR, "interactions.json");
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return [];
  }
}

/**
 * Computes an 8-character hex hash representing the static NeuroRx metadata files
 * (sources, interactions, LEDD factors, Tall Man dictionary).
 */
export function getDataVersionHash(): string {
  try {
    const hash = crypto.createHash("sha256");
    const checkFiles = [
      "sources.json",
      "interactions.json",
      "ledd-factors.json",
      "tall-man.json",
    ];
    for (const f of checkFiles) {
      const p = path.join(DATA_DIR, f);
      if (fs.existsSync(p)) {
        hash.update(fs.readFileSync(p));
      }
    }
    return hash.digest("hex").slice(0, 8);
  } catch {
    return "v2live00";
  }
}
