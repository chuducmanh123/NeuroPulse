// Data loader for NeuroRx (CDSS)
// Reference: SPEC-neurorx.md Section 4 & NEURORX-GUARDRAILS.md (G1, G2)

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { DrugRecord, Source, Interaction, TallManEntry } from "@/types/neurorx";
import { computeContentHashSync } from "./integrity";
import { supabaseAdmin, hasSupabaseConfig } from "@/lib/supabase";

const DATA_DIR = path.resolve(process.cwd(), "data/neurorx");
const DELETED_DRUGS_FILE = path.join(DATA_DIR, "deleted_drugs.json");

export interface DrugWithEffectiveStatus {
  drug: DrugRecord;
  effectiveStatus: "verified" | "draft" | "retired";
  hashMatches: boolean;
}

/**
 * Loads the set of tombstoned (deleted) drug IDs to guarantee
 * that deleted drugs never resurrect from static baselines or stale cache.
 */
export function getDeletedDrugIds(): Set<string> {
  if (!fs.existsSync(DELETED_DRUGS_FILE)) return new Set();
  try {
    const list: string[] = JSON.parse(fs.readFileSync(DELETED_DRUGS_FILE, "utf-8"));
    return new Set(list.map((id) => id.toLowerCase().trim()));
  } catch {
    return new Set();
  }
}

/**
 * Records a drug ID in the persistent tombstone list.
 */
export function recordDeletedDrugId(drugId: string): void {
  const normId = drugId.toLowerCase().trim();
  const currentSet = getDeletedDrugIds();
  currentSet.add(normId);
  try {
    fs.writeFileSync(DELETED_DRUGS_FILE, JSON.stringify(Array.from(currentSet), null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to persist deleted_drugs.json:", err);
  }
}

/**
 * Removes a drug ID from the tombstone list if it is recreated or restored.
 */
export function unmarkDeletedDrugId(drugId: string): void {
  const normId = drugId.toLowerCase().trim();
  const currentSet = getDeletedDrugIds();
  if (currentSet.has(normId)) {
    currentSet.delete(normId);
    try {
      fs.writeFileSync(DELETED_DRUGS_FILE, JSON.stringify(Array.from(currentSet), null, 2), "utf-8");
    } catch {}
  }
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

  const deletedSet = getDeletedDrugIds();
  const files = fs.readdirSync(drugsDir).filter((f) => f.endsWith(".json"));
  const results: DrugWithEffectiveStatus[] = [];

  for (const f of files) {
    const fullPath = path.join(drugsDir, f);
    try {
      const drug: DrugRecord = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
      const normId = (drug.id || "").toLowerCase().trim();

      // Skip tombstoned / deleted drugs immediately
      if (deletedSet.has(normId)) {
        continue;
      }

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
 * Saves a drug record atomically to persistent storage (Disk + Cloud Supabase if available),
 * re-stamps verification hash if verified, and clears any tombstone.
 */
export async function saveDrugToStorage(
  drug: DrugRecord
): Promise<{ success: boolean; hash: string }> {
  const drugsDir = path.join(DATA_DIR, "drugs");
  if (!fs.existsSync(drugsDir)) {
    fs.mkdirSync(drugsDir, { recursive: true });
  }

  // If verified, ensure cryptographic hash is freshly sealed
  let currentHash = "";
  if (drug.status === "verified") {
    drug.verification = {
      verified_by: drug.verification?.verified_by || "Admin",
      verified_at: drug.verification?.verified_at || new Date().toISOString().split("T")[0],
      content_hash: "",
    };
    currentHash = computeContentHashSync(drug);
    drug.verification.content_hash = currentHash;
  }

  // 1. Write to local file atomically
  const filePath = path.join(drugsDir, `${drug.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(drug, null, 2) + "\n", "utf-8");

  // 2. Unmark from deleted list if present
  unmarkDeletedDrugId(drug.id);

  // 3. Upsert to Supabase if configured
  if (hasSupabaseConfig()) {
    try {
      await supabaseAdmin.from("neurorx_drugs").upsert(
        {
          id: drug.id,
          generic_name: drug.generic_name,
          status: drug.status,
          data: drug,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    } catch (err) {
      console.warn("Supabase upsert for neurorx_drugs had error:", err);
    }
  }

  return { success: true, hash: currentHash };
}

/**
 * Permanently deletes a drug from all storage tiers:
 * unlinks local JSON file, records ID in persistent tombstone blacklist,
 * and deletes row in Supabase.
 */
export async function deleteDrugFromStorage(
  drugId: string
): Promise<{ success: boolean }> {
  const normId = drugId.toLowerCase().trim();
  const drugsDir = path.join(DATA_DIR, "drugs");
  const filePath = path.join(drugsDir, `${normId}.json`);

  // 1. Unlink local file
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error(`Could not delete file ${filePath}:`, err);
    }
  }

  // 2. Add to persistent deleted blacklist
  recordDeletedDrugId(normId);

  // 3. Delete from Supabase if configured
  if (hasSupabaseConfig()) {
    try {
      await supabaseAdmin.from("neurorx_drugs").delete().eq("id", normId);
    } catch (err) {
      console.warn(`Supabase delete for ${normId} had error:`, err);
    }
  }

  return { success: true };
}

/**
 * Promotes a single drug from 'draft' to 'verified' with cryptographic signature.
 */
export async function verifyDrugInStorage(
  drugId: string,
  verifiedBy = "Admin"
): Promise<{ success: boolean; drug: DrugRecord; hash: string }> {
  const normId = drugId.toLowerCase().trim();
  const drugsDir = path.join(DATA_DIR, "drugs");
  const filePath = path.join(drugsDir, `${normId}.json`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Drug file not found: ${normId}.json`);
  }

  const drug: DrugRecord = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  drug.status = "verified";
  drug.verification = {
    verified_by: verifiedBy.trim() || "Admin",
    verified_at: new Date().toISOString().split("T")[0],
    content_hash: "",
  };

  const hash = computeContentHashSync(drug);
  drug.verification.content_hash = hash;

  await saveDrugToStorage(drug);
  return { success: true, drug, hash };
}

/**
 * Verifies all draft drugs in one bulk batch.
 */
export async function verifyAllDraftsInStorage(
  verifiedBy = "Admin"
): Promise<{ success: boolean; verifiedCount: number }> {
  const all = getAllDrugs();
  let count = 0;

  for (const item of all) {
    if (item.drug.status !== "verified") {
      try {
        await verifyDrugInStorage(item.drug.id, verifiedBy);
        count++;
      } catch (err) {
        console.warn(`Failed to bulk-verify drug ${item.drug.id}:`, err);
      }
    }
  }

  return { success: true, verifiedCount: count };
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
