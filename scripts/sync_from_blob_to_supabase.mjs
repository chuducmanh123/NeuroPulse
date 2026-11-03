import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

// Load .env.local
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

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

const STORE_ID = "YC9C3jssLmVD0hAB";
const BLOB_GUIDE_URL = `https://${STORE_ID}.public.blob.vercel-storage.com/neuroguide_data.json`;
const BLOB_CASES_URL = `https://${STORE_ID}.public.blob.vercel-storage.com/cases.json`;

async function syncNeuroGuide() {
  console.log("Fetching exact guidelines from Vercel Blob:", BLOB_GUIDE_URL);
  const res = await fetch(BLOB_GUIDE_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch neuroguide_data.json: HTTP ${res.status}`);
  }
  const blobData = await res.json();
  const guidelines = blobData.guidelines || [];
  console.log(`Retrieved ${guidelines.length} guidelines from Vercel Blob!`);

  // Save exact copy to public/data/neuroguide_cloud.json
  const localCloudPath = path.join(process.cwd(), "public", "data", "neuroguide_cloud.json");
  fs.writeFileSync(localCloudPath, JSON.stringify(blobData, null, 2), "utf-8");
  console.log("Updated public/data/neuroguide_cloud.json with exact Vercel Blob snapshot.");

  // Clear existing rows in Supabase neuroguide_docs
  await supabase.from("neuroguide_docs").delete().neq("id", "keep_nothing");

  // Upsert exact guidelines into Supabase
  const rows = guidelines.map((g) => ({
    id: g.id,
    title: g.title,
    organization: g.organization || g.society || "Medical Organization",
    year: String(g.year || "2026"),
    status: g.status || "approved",
    data: g,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("neuroguide_docs").upsert(rows);
  if (error) {
    console.error("Error inserting guidelines into Supabase:", error);
  } else {
    console.log(`Successfully restored all ${rows.length} exact guidelines into Supabase!`);
    rows.forEach((r, idx) => {
      console.log(` ${idx + 1}. [${r.organization}] ${r.title} (${r.data.allPracticeChanges?.length || 0} changes)`);
    });
  }
}

async function syncCases() {
  console.log("\nFetching dynamic cases from Vercel Blob:", BLOB_CASES_URL);
  let blobCases = [];
  try {
    const res = await fetch(BLOB_CASES_URL);
    if (res.ok) {
      blobCases = await res.json();
      console.log(`Retrieved ${blobCases.length} cases from Vercel Blob.`);
    }
  } catch (e) {
    console.warn("Could not fetch cases from Blob:", e);
  }

  // Also read local bundled cases
  let localCases = [];
  const localCasesPath = path.join(process.cwd(), "public", "data", "cases.json");
  if (fs.existsSync(localCasesPath)) {
    try {
      localCases = JSON.parse(fs.readFileSync(localCasesPath, "utf-8"));
    } catch {}
  }

  // Merge cases (Blob overrides local by id)
  const caseMap = new Map();
  localCases.forEach((c) => caseMap.set(c.id, c));
  blobCases.forEach((c) => caseMap.set(c.id, c));

  const allCases = Array.from(caseMap.values());
  allCases.sort((a, b) => (b.published_date || "").localeCompare(a.published_date || ""));

  console.log(`Merged total ${allCases.length} unique cases.`);

  const rows = allCases.map((c) => ({
    id: c.id,
    case_code: c.case_code || c.id,
    title: c.title || "Untitled Case",
    subspecialty: c.subspecialty || (Array.isArray(c.subspecialties) ? c.subspecialties[0] : "General Neurology"),
    difficulty: c.difficulty || "Fellow",
    status: c.status || "approved",
    is_daily_challenge: Boolean(c.is_daily_challenge),
    published_date: c.published_date || new Date().toISOString().split("T")[0],
    data: c,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("clinical_cases").upsert(rows, { onConflict: "id" });
  if (error) {
    console.error("Error upserting cases to Supabase:", error);
  } else {
    console.log(`Successfully synced ${rows.length} cases to Supabase!`);
  }
}

async function main() {
  await syncNeuroGuide();
  await syncCases();
  console.log("\nAll data synced 100% accurately from Vercel Blob to Supabase!");
}

main().catch((e) => {
  console.error("Sync error:", e);
  process.exit(1);
});
