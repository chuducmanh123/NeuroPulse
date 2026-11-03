import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

// Load .env.local manually
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
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

async function seedCases() {
  const casesPath = path.join(process.cwd(), "public", "data", "cases.json");
  if (!fs.existsSync(casesPath)) {
    console.log("No public/data/cases.json found.");
    return;
  }
  const raw = fs.readFileSync(casesPath, "utf-8");
  const cases = JSON.parse(raw);
  if (!Array.isArray(cases) || cases.length === 0) {
    console.log("cases.json is empty.");
    return;
  }

  console.log(`Found ${cases.length} cases to migrate...`);

  const rows = cases.map((c) => ({
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
    console.error("Error upserting cases:", error);
  } else {
    console.log(`Successfully migrated ${rows.length} cases to Supabase table 'clinical_cases'!`);
  }
}

async function seedNeuroGuide() {
  const guidePath = path.join(process.cwd(), "public", "data", "neuroguide_cloud.json");
  let docs = [];
  if (fs.existsSync(guidePath)) {
    try {
      const raw = fs.readFileSync(guidePath, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.guidelines)) {
        docs = parsed.guidelines;
      }
    } catch (e) {
      console.warn("Could not parse neuroguide_cloud.json:", e);
    }
  }

  // Also check guidelines_store for latest JSONs
  const storeDir = path.join(process.cwd(), "data", "guidelines_store");
  if (fs.existsSync(storeDir)) {
    const files = fs.readdirSync(storeDir);
    for (const f of files) {
      if (f.endsWith("_latest.json")) {
        try {
          const item = JSON.parse(fs.readFileSync(path.join(storeDir, f), "utf-8"));
          if (item && item.id && !docs.some((d) => d.id === item.id)) {
            docs.push(item);
          }
        } catch {}
      }
    }
  }

  if (docs.length === 0) {
    console.log("No guidelines found to seed.");
    return;
  }

  console.log(`Found ${docs.length} guidelines to migrate...`);
  const rows = docs.map((g) => ({
    id: g.id,
    title: g.title || "Untitled Guideline",
    organization: g.organization || g.society || "Medical Organization",
    year: String(g.year || g.pub_year || "2026"),
    status: g.status || "approved",
    data: g,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("neuroguide_docs").upsert(rows, { onConflict: "id" });
  if (error) {
    console.error("Error upserting guidelines:", error);
  } else {
    console.log(`Successfully migrated ${rows.length} guidelines to Supabase table 'neuroguide_docs'!`);
  }
}

async function run() {
  console.log("Starting Supabase Migration...");
  await seedCases();
  await seedNeuroGuide();
  console.log("Migration complete!");
}

run().catch((err) => {
  console.error("Migration fatal error:", err);
  process.exit(1);
});
