import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

// 1. Read .env.local
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
  console.error("Missing Supabase configuration!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

async function sync() {
  console.log("==> Fetching latest guidelines from Supabase...");
  const { data: rows, error } = await supabase
    .from("neuroguide_docs")
    .select("id, title, organization, status, year, data, updated_at");

  if (error) {
    console.error("Supabase query error:", error);
    process.exit(1);
  }

  console.log(`Retrieved ${rows.length} records from Supabase.`);

  const localCloudPath = path.join(process.cwd(), "public", "data", "neuroguide_cloud.json");
  let localCloud = {};
  if (fs.existsSync(localCloudPath)) {
    try {
      localCloud = JSON.parse(fs.readFileSync(localCloudPath, "utf-8"));
    } catch {}
  }

  const guidelines = [];
  let customScenarios = localCloud.scenarios || [];
  let customRecAtoms = localCloud.recommendationAtoms || [];
  let customPivotalTrials = localCloud.pivotalTrials || [];
  let customRecLabels = localCloud.customRecLabels || {};
  let deletedGuidelineIds = localCloud.deletedGuidelineIds || [];

  let aha2026Doc = null;

  for (const row of rows) {
    if (row.id === "system_clinical_scenarios") {
      if (row.data?.scenarios) customScenarios = row.data.scenarios;
      if (row.data?.recommendationAtoms) customRecAtoms = row.data.recommendationAtoms;
      if (row.data?.pivotalTrials) customPivotalTrials = row.data.pivotalTrials;
      if (row.data?.customRecLabels) customRecLabels = row.data.customRecLabels;
      if (row.data?.deletedGuidelineIds) deletedGuidelineIds = row.data.deletedGuidelineIds;
      continue;
    }

    const gDoc = row.data || {};
    gDoc.id = row.id;
    if (row.title) gDoc.title = row.title;
    if (row.organization) gDoc.society = row.organization;
    if (row.status) gDoc.status = row.status;
    if (row.updated_at) gDoc.updated_at = row.updated_at;

    guidelines.push(gDoc);

    const titleLower = (row.title || "").toLowerCase();
    const idLower = (row.id || "").toLowerCase();
    if (
      idLower.includes("aha2026") ||
      idLower.includes("aha-2026") ||
      (titleLower.includes("2026") && (titleLower.includes("acute ischemic stroke") || titleLower.includes("ais")))
    ) {
      aha2026Doc = { row, gDoc };
    }
  }

  // Save to public/data/neuroguide_cloud.json
  const updatedCloudPayload = {
    ...localCloud,
    guidelines,
    scenarios: customScenarios,
    recommendationAtoms: customRecAtoms,
    pivotalTrials: customPivotalTrials,
    customRecLabels: customRecLabels,
    deletedGuidelineIds,
    lastSyncedAt: new Date().toISOString(),
    source: "SUPABASE_SYNC",
  };

  fs.writeFileSync(localCloudPath, JSON.stringify(updatedCloudPayload, null, 2), "utf-8");
  console.log(`==> Updated ${localCloudPath} with ${guidelines.length} guidelines.`);

  // If aha2026Doc has store record or recommendations, sync to data/guidelines_store/
  if (aha2026Doc) {
    console.log("==> Found AHA 2026 doc in Supabase:");
    console.log("ID:", aha2026Doc.row.id);
    console.log("Title:", aha2026Doc.row.title);
    console.log("Status:", aha2026Doc.row.status);
    console.log("Updated at:", aha2026Doc.row.updated_at);
    
    const recs = aha2026Doc.gDoc.recommendations || 
                 aha2026Doc.gDoc._reviewRecord?.recommendations || 
                 aha2026Doc.row.data?.recommendations || 
                 [];
    console.log("Direct recommendations array length:", recs.length);

    // Also check if there is a store file
    const storePath = path.join(process.cwd(), "data", "guidelines_store", `${aha2026Doc.row.id}_latest.json`);
    if (fs.existsSync(storePath)) {
      try {
        const storeContent = JSON.parse(fs.readFileSync(storePath, "utf-8"));
        console.log(`Local store file (${storePath}) recommendations:`, storeContent.recommendations?.length);
      } catch (e) {
        console.error("Error reading store file:", e);
      }
    }
    
    // Also check practiceChanges if stored as GuidelineDoc
    if (aha2026Doc.gDoc.practiceChanges) {
      console.log("Practice changes count:", aha2026Doc.gDoc.practiceChanges.length);
    }
  } else {
    console.log("==> Note: No record with ID or title matching '2026' and 'acute ischemic stroke' found in Supabase neuroguide_docs table directly.");
  }
}

sync().catch(err => {
  console.error("Sync failed:", err);
  process.exit(1);
});
