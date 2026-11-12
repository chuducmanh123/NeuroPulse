// Data loader for NeuroRx (CDSS)
// Reference: SPEC-neurorx.md Section 4 & NEURORX-GUARDRAILS.md (G1, G2)

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import type { DrugRecord, Source, Interaction, TallManEntry } from "@/types/neurorx";
import { computeContentHashSync } from "./integrity";
import { supabaseAdmin, hasSupabaseConfig } from "@/lib/supabase";

// 1. Static seed baseline directory (read-only on serverless like Vercel)
const DATA_DIR = path.resolve(process.cwd(), "data/neurorx");
const DELETED_DRUGS_FILE = path.join(DATA_DIR, "deleted_drugs.json");

// 2. Writable ephemeral directory (writable on Vercel /tmp)
const TMP_DATA_DIR = path.join(os.tmpdir(), "neurorx");
const TMP_DRUGS_DIR = path.join(TMP_DATA_DIR, "drugs");
const TMP_DELETED_FILE = path.join(TMP_DATA_DIR, "deleted_drugs.json");

// 3. Process memory cache
const inMemoryDrugs = new Map<string, DrugRecord>();
const inMemoryDeletedIds = new Set<string>();

export interface DrugWithEffectiveStatus {
  drug: DrugRecord;
  effectiveStatus: "verified" | "draft" | "retired";
  hashMatches: boolean;
}

/**
 * Safely writes a file to /tmp storage
 */
function safeWriteToTmp(id: string, drug: DrugRecord): void {
  try {
    if (!fs.existsSync(TMP_DRUGS_DIR)) {
      fs.mkdirSync(TMP_DRUGS_DIR, { recursive: true });
    }
    const p = path.join(TMP_DRUGS_DIR, `${id}.json`);
    fs.writeFileSync(p, JSON.stringify(drug, null, 2) + "\n", "utf-8");
  } catch (err) {
    console.warn(`[NeuroRx] Could not write to /tmp for ${id}:`, err);
  }
}

/**
 * Safely unlinks a file from /tmp storage
 */
function safeDeleteFromTmp(id: string): void {
  try {
    const p = path.join(TMP_DRUGS_DIR, `${id}.json`);
    if (fs.existsSync(p)) {
      fs.unlinkSync(p);
    }
  } catch {}
}

/**
 * Safely updates deleted_drugs.json across static disk (if writable) and /tmp
 */
function safeWriteDeletedFile(ids: string[]): void {
  const content = JSON.stringify(ids, null, 2) + "\n";
  // 1. Static disk (local dev)
  try {
    if (fs.existsSync(DATA_DIR)) {
      fs.writeFileSync(DELETED_DRUGS_FILE, content, "utf-8");
    }
  } catch {
    // Expected on Vercel (read-only filesystem)
  }
  // 2. /tmp disk
  try {
    if (!fs.existsSync(TMP_DATA_DIR)) {
      fs.mkdirSync(TMP_DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(TMP_DELETED_FILE, content, "utf-8");
  } catch {}
}

/**
 * Loads the set of tombstoned (deleted) drug IDs to guarantee
 * that deleted drugs never resurrect from static baselines or stale cache.
 */
export function getDeletedDrugIds(): Set<string> {
  const result = new Set<string>(inMemoryDeletedIds);

  // 1. Static baseline
  if (fs.existsSync(DELETED_DRUGS_FILE)) {
    try {
      const list: string[] = JSON.parse(fs.readFileSync(DELETED_DRUGS_FILE, "utf-8"));
      list.forEach((id) => result.add(id.toLowerCase().trim()));
    } catch {}
  }

  // 2. /tmp persistence
  if (fs.existsSync(TMP_DELETED_FILE)) {
    try {
      const list: string[] = JSON.parse(fs.readFileSync(TMP_DELETED_FILE, "utf-8"));
      list.forEach((id) => result.add(id.toLowerCase().trim()));
    } catch {}
  }

  return result;
}

/**
 * Records a drug ID in the persistent tombstone list.
 */
export function recordDeletedDrugId(drugId: string): void {
  const normId = drugId.toLowerCase().trim();
  inMemoryDeletedIds.add(normId);
  inMemoryDrugs.delete(normId);
  const currentSet = getDeletedDrugIds();
  currentSet.add(normId);
  safeWriteDeletedFile(Array.from(currentSet));
}

/**
 * Removes a drug ID from the tombstone list if it is recreated or restored.
 */
export function unmarkDeletedDrugId(drugId: string): void {
  const normId = drugId.toLowerCase().trim();
  inMemoryDeletedIds.delete(normId);
  const currentSet = getDeletedDrugIds();
  if (currentSet.has(normId)) {
    currentSet.delete(normId);
    safeWriteDeletedFile(Array.from(currentSet));
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
 * Synchronizes drug records from Supabase into memory and /tmp storage.
 */
let lastSupabaseSync = 0;
const SYNC_INTERVAL_MS = 10_000;

export async function syncFromSupabase(force = false): Promise<void> {
  if (!hasSupabaseConfig()) return;
  const now = Date.now();
  if (!force && now - lastSupabaseSync < SYNC_INTERVAL_MS) {
    return;
  }
  lastSupabaseSync = now;

  try {
    // 1. Sync deleted drugs list
    const { data: delRow } = await supabaseAdmin
      .from("neuroguide_docs")
      .select("data")
      .eq("id", "neurorx_system_deleted_drugs")
      .maybeSingle();

    if (delRow?.data?.deleted_ids && Array.isArray(delRow.data.deleted_ids)) {
      for (const id of delRow.data.deleted_ids) {
        const norm = String(id).toLowerCase().trim();
        inMemoryDeletedIds.add(norm);
        inMemoryDrugs.delete(norm);
        safeDeleteFromTmp(norm);
      }
    }

    // 2. Sync from neurorx_drugs table
    const { data: nrData, error: nrErr } = await supabaseAdmin
      .from("neurorx_drugs")
      .select("id, data, status");

    if (!nrErr && Array.isArray(nrData) && nrData.length > 0) {
      for (const row of nrData) {
        if (row.data && row.id) {
          const drug = row.data as DrugRecord;
          const normId = row.id.toLowerCase().trim();
          if (!inMemoryDeletedIds.has(normId)) {
            inMemoryDrugs.set(normId, drug);
            safeWriteToTmp(normId, drug);
          }
        }
      }
      return;
    }

    // 3. Fallback: Sync from neuroguide_docs table (where records are prefixed with neurorx_drug_)
    const { data: ngData, error: ngErr } = await supabaseAdmin
      .from("neuroguide_docs")
      .select("id, data, status")
      .like("id", "neurorx_drug_%");

    if (!ngErr && Array.isArray(ngData) && ngData.length > 0) {
      for (const row of ngData) {
        const drug = row.data as DrugRecord;
        if (drug && drug.id) {
          const normId = drug.id.toLowerCase().trim();
          if (!inMemoryDeletedIds.has(normId)) {
            inMemoryDrugs.set(normId, drug);
            safeWriteToTmp(normId, drug);
          }
        }
      }
    }
  } catch (err) {
    console.warn("[NeuroRx] Supabase sync error:", err);
  }
}

/**
 * Safely merges an override drug record with the baseline static drug record,
 * ensuring newly deployed clinical sections (FDA interactions, pregnancy & lactation,
 * renal bands, hepatic guidance, etc.) are never accidentally clobbered by stale snapshots.
 */
export function mergeDrugRecords(baseline: DrugRecord, override: DrugRecord): DrugRecord {
  const merged: DrugRecord = { ...baseline, ...override };

  // 1. FDA Interactions (preserve baseline if override is empty/missing)
  if (!override.fda_interactions?.value?.length && baseline.fda_interactions?.value?.length) {
    merged.fda_interactions = baseline.fda_interactions;
  }

  // 2. Pregnancy & Lactation (preserve baseline if override lacks details)
  const baselineHasRep = Boolean(
    baseline.reproductive && (
      baseline.reproductive.tier?.value ||
      (baseline.reproductive.mcm && baseline.reproductive.mcm.length > 0) ||
      baseline.reproductive.lactation_summary?.value ||
      baseline.reproductive.pregnancy_pk?.value
    )
  );
  const overrideHasRep = Boolean(
    override.reproductive && (
      override.reproductive.tier?.value ||
      (override.reproductive.mcm && override.reproductive.mcm.length > 0) ||
      override.reproductive.lactation_summary?.value ||
      override.reproductive.pregnancy_pk?.value
    )
  );
  if (baselineHasRep && !overrideHasRep) {
    merged.reproductive = baseline.reproductive;
  }

  // 3. Renal Impairment (preserve baseline bands if override has no bands)
  const baselineHasRenalBands = Boolean(
    baseline.renal_impairment?.bands && baseline.renal_impairment.bands.length > 0
  );
  const overrideHasRenalBands = Boolean(
    override.renal_impairment?.bands && override.renal_impairment.bands.length > 0
  );
  if (baselineHasRenalBands && !overrideHasRenalBands) {
    merged.renal_impairment = baseline.renal_impairment;
    if (baseline.renal_basis?.value && !override.renal_basis?.value) {
      merged.renal_basis = baseline.renal_basis;
    }
  }

  // 4. Hepatic Impairment (preserve baseline if override is empty)
  if (baseline.hepatic?.value && !override.hepatic?.value) {
    merged.hepatic = baseline.hepatic;
  }

  // 5. Adverse Effects (preserve baseline serious/most_common if override is empty)
  if (!override.adverse_effects?.serious?.value?.length && baseline.adverse_effects?.serious?.value?.length) {
    merged.adverse_effects = {
      ...merged.adverse_effects,
      serious: baseline.adverse_effects.serious,
      most_common: merged.adverse_effects?.most_common || baseline.adverse_effects?.most_common,
    };
  }

  return merged;
}

/**
 * Loads all drug records from Multi-tier Storage:
 * 1. Static seed files (DATA_DIR/drugs/*.json)
 * 2. Writable /tmp files (TMP_DRUGS_DIR/*.json)
 * 3. In-memory updates
 * and filters out tombstoned deletions.
 */
export function getAllDrugs(): DrugWithEffectiveStatus[] {
  const deletedSet = getDeletedDrugIds();
  const rawDrugsMap = new Map<string, DrugRecord>();

  // 1. Read static baseline (DATA_DIR/drugs)
  const drugsDir = path.join(DATA_DIR, "drugs");
  if (fs.existsSync(drugsDir)) {
    try {
      const files = fs.readdirSync(drugsDir).filter((f) => f.endsWith(".json"));
      for (const f of files) {
        try {
          const fullPath = path.join(drugsDir, f);
          const drug: DrugRecord = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
          if (drug && drug.id) {
            rawDrugsMap.set(drug.id.toLowerCase().trim(), drug);
          }
        } catch {}
      }
    } catch {}
  }

  // 2. Read /tmp overrides (TMP_DRUGS_DIR)
  if (fs.existsSync(TMP_DRUGS_DIR)) {
    try {
      const tmpFiles = fs.readdirSync(TMP_DRUGS_DIR).filter((f) => f.endsWith(".json"));
      for (const f of tmpFiles) {
        try {
          const fullPath = path.join(TMP_DRUGS_DIR, f);
          const drug: DrugRecord = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
          if (drug && drug.id) {
            const normId = drug.id.toLowerCase().trim();
            const baseline = rawDrugsMap.get(normId);
            rawDrugsMap.set(normId, baseline ? mergeDrugRecords(baseline, drug) : drug);
          }
        } catch {}
      }
    } catch {}
  }

  // 3. Read in-memory overrides
  for (const [id, drug] of inMemoryDrugs.entries()) {
    const baseline = rawDrugsMap.get(id);
    rawDrugsMap.set(id, baseline ? mergeDrugRecords(baseline, drug) : drug);
  }

  // 4. Compute effective status
  const results: DrugWithEffectiveStatus[] = [];

  for (const [normId, drug] of rawDrugsMap.entries()) {
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
  }

  // Sort alphabetically by generic_name
  results.sort((a, b) => (a.drug.generic_name || "").localeCompare(b.drug.generic_name || ""));

  return results;
}

/**
 * Async version of getAllDrugs that synchronizes with cloud Supabase first.
 */
export async function getAllDrugsAsync(): Promise<DrugWithEffectiveStatus[]> {
  await syncFromSupabase();
  return getAllDrugs();
}

/**
 * Saves a drug record safely across all storage tiers:
 * Memory + /tmp (always works on Vercel) + Local Disk (if writable) + Cloud Supabase.
 */
export async function saveDrugToStorage(
  drug: DrugRecord
): Promise<{ success: boolean; hash: string }> {
  const normId = drug.id.toLowerCase().trim();

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

  // 1. In-memory update
  inMemoryDrugs.set(normId, drug);

  // 2. Unmark from deleted lists
  unmarkDeletedDrugId(normId);

  // 3. Write to /tmp (always writable on serverless / Vercel)
  safeWriteToTmp(normId, drug);

  // 4. Write to local static file if writable (local dev environment)
  try {
    const drugsDir = path.join(DATA_DIR, "drugs");
    if (!fs.existsSync(drugsDir)) {
      fs.mkdirSync(drugsDir, { recursive: true });
    }
    const filePath = path.join(drugsDir, `${drug.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(drug, null, 2) + "\n", "utf-8");
  } catch (err: any) {
    // EROFS or permission error on Vercel / serverless is safely caught without failing!
    console.info(`[NeuroRx] Storage directory is read-only (${err?.code || "EROFS"}), saved to /tmp and cloud.`);
  }

  // 5. Upsert to Supabase if configured (Cloud persistence)
  if (hasSupabaseConfig()) {
    try {
      // 5a. Try dedicated neurorx_drugs table
      const { error: sbErr } = await supabaseAdmin.from("neurorx_drugs").upsert(
        {
          id: drug.id,
          generic_name: drug.generic_name,
          status: drug.status,
          data: drug,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

      if (sbErr) {
        // 5b. Fallback to existing neuroguide_docs table
        await supabaseAdmin.from("neuroguide_docs").upsert(
          {
            id: `neurorx_drug_${normId}`,
            title: drug.generic_name,
            organization: "NeuroRx",
            year: "2026",
            status: drug.status,
            data: drug,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );
      }

      // 5c. Sync updated deleted_drugs list to Supabase
      const deletedList = Array.from(getDeletedDrugIds());
      await supabaseAdmin.from("neuroguide_docs").upsert(
        {
          id: "neurorx_system_deleted_drugs",
          title: "NeuroRx Deleted Drugs Blacklist",
          organization: "NeuroRx System",
          year: "2026",
          status: "system",
          data: { deleted_ids: deletedList },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    } catch (err) {
      console.warn("[NeuroRx] Supabase cloud upsert warning:", err);
    }
  }

  return { success: true, hash: currentHash };
}

/**
 * Permanently deletes a drug from all storage tiers:
 * Memory, /tmp, local disk (if writable), deleted blacklist, and Supabase.
 */
export async function deleteDrugFromStorage(
  drugId: string
): Promise<{ success: boolean }> {
  const normId = drugId.toLowerCase().trim();

  // 1. Remove from in-memory cache
  inMemoryDrugs.delete(normId);

  // 2. Unlink from /tmp
  safeDeleteFromTmp(normId);

  // 3. Try unlinking from local file (local dev)
  try {
    const drugsDir = path.join(DATA_DIR, "drugs");
    const filePath = path.join(drugsDir, `${normId}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {}

  // 4. Add to persistent deleted blacklist
  recordDeletedDrugId(normId);

  // 5. Delete from Supabase if configured
  if (hasSupabaseConfig()) {
    try {
      await supabaseAdmin.from("neurorx_drugs").delete().eq("id", normId);
      await supabaseAdmin.from("neuroguide_docs").delete().eq("id", `neurorx_drug_${normId}`);

      // Sync updated deleted list
      const deletedList = Array.from(getDeletedDrugIds());
      await supabaseAdmin.from("neuroguide_docs").upsert(
        {
          id: "neurorx_system_deleted_drugs",
          title: "NeuroRx Deleted Drugs Blacklist",
          organization: "NeuroRx System",
          year: "2026",
          status: "system",
          data: { deleted_ids: deletedList },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
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
  const existing = getDrugById(normId);

  if (!existing) {
    throw new Error(`Drug record not found: ${normId}`);
  }

  const drug: DrugRecord = JSON.parse(JSON.stringify(existing.drug));
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
  const normId = id.toLowerCase().trim();
  const all = getAllDrugs();
  return all.find((item) => item.drug.id.toLowerCase().trim() === normId) || null;
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
    const all = getAllDrugs();
    for (const item of all) {
      hash.update(item.drug.id);
      hash.update(item.drug.status);
      hash.update(item.drug.verification?.content_hash || "");
      hash.update(item.drug.verification?.verified_at || "");
    }
    return hash.digest("hex").slice(0, 8);
  } catch {
    return "v1live00";
  }
}
