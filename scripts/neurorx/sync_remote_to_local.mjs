import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { computeContentHashSync } from "../../src/lib/neurorx/integrity.ts";

// Read .env.local
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase configuration in .env.local!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

const DATA_DIR = path.resolve(process.cwd(), "data/neurorx");
const DRUGS_DIR = path.join(DATA_DIR, "drugs");
const DELETED_FILE = path.join(DATA_DIR, "deleted_drugs.json");

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const keysA = Object.keys(a).filter((k) => a[k] !== undefined);
  const keysB = Object.keys(b).filter((k) => b[k] !== undefined);
  if (keysA.length !== keysB.length) return false;

  for (const k of keysA) {
    if (!keysB.includes(k) || !deepEqual(a[k], b[k])) return false;
  }
  return true;
}

/**
 * Normalizes and cleans clinical records that may have been saved from admin form
 * with missing citations or placeholder values, preserving guardrail compliance.
 */
function sanitizeDrug(drug) {
  const d = JSON.parse(JSON.stringify(drug));

  // 1. Hepatic: if value is non-null but has 0 refs, move value text to note
  if (d.hepatic && d.hepatic.value !== null && (!d.hepatic.refs || d.hepatic.refs.length === 0)) {
    d.hepatic.note = d.hepatic.note || d.hepatic.value;
    d.hepatic.value = null;
    d.hepatic.refs = [];
  }

  // 2. Black Box: if value is empty array [], set to null
  if (d.black_box && Array.isArray(d.black_box.value) && d.black_box.value.length === 0) {
    d.black_box.value = null;
    d.black_box.refs = [];
  }

  // 3. Renal Impairment: remove dummy 'system' placeholder refs
  if (d.renal_impairment) {
    if (d.renal_impairment.refs && d.renal_impairment.refs.some((r) => r.source_id === "system")) {
      delete d.renal_impairment;
    }
  }

  // 4. Verification hash check
  if (d.status === "verified") {
    const curHash = computeContentHashSync(d);
    if (!d.verification?.content_hash || d.verification.content_hash !== curHash) {
      d.status = "draft";
      d.verification = { verified_at: null, verified_by: null, content_hash: null };
    }
  }

  return d;
}

async function syncRemoteToLocal() {
  console.log("==================================================");
  console.log("🔄 NeuroRx: Synchronizing remote data to local...");
  console.log("==================================================");

  // 1. Check deleted drugs blacklist in Supabase
  const { data: delRow, error: delErr } = await supabase
    .from("neuroguide_docs")
    .select("data, updated_at")
    .eq("id", "neurorx_system_deleted_drugs")
    .maybeSingle();

  if (delErr) {
    console.warn("⚠️ Warning checking remote deleted drugs:", delErr.message);
  } else if (delRow?.data?.deleted_ids) {
    const remoteDeletedIds = Array.isArray(delRow.data.deleted_ids) ? delRow.data.deleted_ids : [];
    console.log(`📋 Remote deleted drugs list contains ${remoteDeletedIds.length} item(s):`, remoteDeletedIds);

    let localDeleted = [];
    if (fs.existsSync(DELETED_FILE)) {
      try {
        localDeleted = JSON.parse(fs.readFileSync(DELETED_FILE, "utf-8"));
      } catch {}
    }

    const mergedDeleted = Array.from(new Set([...localDeleted, ...remoteDeletedIds]));
    fs.writeFileSync(DELETED_FILE, JSON.stringify(mergedDeleted, null, 2) + "\n", "utf-8");
    console.log(`💾 Saved updated deleted_drugs.json with ${mergedDeleted.length} entries.`);

    // If any local drug file is in deleted list, remove it
    for (const delId of mergedDeleted) {
      const drugPath = path.join(DRUGS_DIR, `${delId}.json`);
      if (fs.existsSync(drugPath)) {
        console.log(`🗑️ Removing tombstoned drug file: ${delId}.json`);
        fs.unlinkSync(drugPath);
      }
    }
  }

  // 2. Query remote drugs from neuroguide_docs (prefix: neurorx_drug_)
  const { data: ngDrugs, error: ngErr } = await supabase
    .from("neuroguide_docs")
    .select("id, title, status, data, updated_at")
    .like("id", "neurorx_drug_%");

  if (ngErr) {
    console.error("❌ Failed to query remote drugs from neuroguide_docs:", ngErr.message);
    process.exit(1);
  }

  console.log(`🔍 Found ${ngDrugs?.length || 0} remote drug record(s) in Supabase neuroguide_docs.`);

  let updatedCount = 0;
  let createdCount = 0;
  let skippedCount = 0;

  if (ngDrugs && ngDrugs.length > 0) {
    for (const row of ngDrugs) {
      let drug = row.data;
      if (!drug || !drug.id) {
        console.warn(`⚠️ Skipping invalid remote drug record (no data.id): ${row.id}`);
        continue;
      }

      // Sanitize drug schema to ensure zero guardrail regressions
      drug = sanitizeDrug(drug);

      const drugId = drug.id.toLowerCase().trim();
      const localFilePath = path.join(DRUGS_DIR, `${drugId}.json`);

      let shouldUpdate = false;
      let reason = "";

      if (!fs.existsSync(localFilePath)) {
        shouldUpdate = true;
        reason = "New drug from remote";
        createdCount++;
      } else {
        const localDrug = JSON.parse(fs.readFileSync(localFilePath, "utf-8"));
        if (!deepEqual(drug, localDrug)) {
          shouldUpdate = true;
          reason = `Updates from remote merged (Remote status: ${drug.status}, Local status: ${localDrug.status})`;
          updatedCount++;
        } else {
          skippedCount++;
        }
      }

      if (shouldUpdate) {
        console.log(`📥 Syncing [${drugId}]: ${reason}`);
        fs.writeFileSync(localFilePath, JSON.stringify(drug, null, 2) + "\n", "utf-8");

        // Sync the sanitized version back to Supabase so remote matches local perfectly
        await supabase.from("neuroguide_docs").upsert({
          id: `neurorx_drug_${drugId}`,
          title: drug.generic_name,
          organization: "NeuroRx",
          year: "2026",
          status: drug.status,
          data: drug,
          updated_at: new Date().toISOString(),
        });
      }
    }
  }

  console.log("\n==================================================");
  console.log("📊 Sync Summary:");
  console.log(`   - Created: ${createdCount}`);
  console.log(`   - Updated: ${updatedCount}`);
  console.log(`   - Identical: ${skippedCount}`);
  console.log("==================================================");
}

syncRemoteToLocal().catch((err) => {
  console.error("❌ Sync failed with unexpected error:", err);
  process.exit(1);
});
