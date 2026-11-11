// Data loader for NeuroRx (CDSS)
// Reference: SPEC-neurorx.md Section 4 & NEURORX-GUARDRAILS.md (G1, G2)

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { DrugRecord, Source, Interaction, TallManEntry } from "@/types/neurorx";
import { computeContentHashSync } from "./integrity";

const DATA_DIR = path.resolve(process.cwd(), "data/neurorx");

export interface DrugWithEffectiveStatus {
  drug: DrugRecord;
  effectiveStatus: "verified" | "draft" | "retired";
  hashMatches: boolean;
}

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
 * Loads all drug records from data/neurorx/drugs/*.json
 * and computes their effective verification status based on cryptographic hash.
 */
export function getAllDrugs(): DrugWithEffectiveStatus[] {
  const drugsDir = path.join(DATA_DIR, "drugs");
  if (!fs.existsSync(drugsDir)) return [];

  const files = fs.readdirSync(drugsDir).filter((f) => f.endsWith(".json"));
  const results: DrugWithEffectiveStatus[] = [];

  for (const f of files) {
    const fullPath = path.join(drugsDir, f);
    try {
      const drug: DrugRecord = JSON.parse(fs.readFileSync(fullPath, "utf-8"));

      let effectiveStatus: "verified" | "draft" | "retired" = "draft";
      let hashMatches = false;

      if (drug.status === "verified") {
        const storedHash = drug.verification?.content_hash;
        const currentHash = computeContentHashSync(drug);
        if (storedHash && storedHash === currentHash) {
          effectiveStatus = "verified";
          hashMatches = true;
        } else {
          // Hash mismatch or missing hash -> automatically downgrade to draft
          effectiveStatus = "draft";
          hashMatches = false;
        }
      } else if (drug.status === "retired") {
        effectiveStatus = "retired";
      }

      results.push({
        drug,
        effectiveStatus,
        hashMatches,
      });
    } catch {
      // Skip invalid JSON files
    }
  }

  return results;
}

/**
 * Loads a single drug by ID with verification status.
 */
export function getDrugById(id: string): DrugWithEffectiveStatus | null {
  const all = getAllDrugs();
  return all.find((item) => item.drug.id === id) || null;
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
 * Computes an 8-character hex hash representing the current state of NeuroRx data files
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
    const drugsDir = path.join(DATA_DIR, "drugs");
    if (fs.existsSync(drugsDir)) {
      const files = fs
        .readdirSync(drugsDir)
        .filter((f) => f.endsWith(".json"))
        .sort();
      for (const f of files) {
        hash.update(f);
        hash.update(fs.readFileSync(path.join(drugsDir, f)));
      }
    }
    return hash.digest("hex").slice(0, 8);
  } catch {
    return "v1live00";
  }
}
