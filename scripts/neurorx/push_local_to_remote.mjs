import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Read .env.local
const envPath = path.join(process.cwd(), ".env.local");
if (!fs.existsSync(envPath)) {
  console.error("❌ Missing .env.local file");
  process.exit(1);
}

const content = fs.readFileSync(envPath, "utf-8");
const env = {};
for (const line of content.split("\n")) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith("#")) {
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

const DRUGS_DIR = path.join(process.cwd(), "data", "neurorx", "drugs");

async function pushLocalToRemote() {
  console.log("==================================================");
  console.log("🚀 NeuroRx: Pushing local enhanced data to Supabase...");
  console.log("==================================================");

  const files = fs.readdirSync(DRUGS_DIR).filter((f) => f.endsWith(".json"));
  console.log(`Found ${files.length} local drug files to sync.`);

  let pushedCount = 0;
  for (const file of files) {
    const drug = JSON.parse(fs.readFileSync(path.join(DRUGS_DIR, file), "utf-8"));
    const drugId = drug.id.toLowerCase().trim();

    const { error } = await supabase.from("neuroguide_docs").upsert({
      id: `neurorx_drug_${drugId}`,
      title: drug.generic_name,
      organization: "NeuroRx",
      year: "2026",
      status: drug.status,
      data: drug,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error(`❌ Failed to push ${drugId}:`, error.message);
    } else {
      pushedCount++;
      if (pushedCount % 10 === 0 || pushedCount === files.length) {
        console.log(`   Pushed ${pushedCount}/${files.length} drugs...`);
      }
    }
  }

  // Also push interactions
  const interactionsPath = path.join(process.cwd(), "data", "neurorx", "interactions.json");
  if (fs.existsSync(interactionsPath)) {
    const interactions = JSON.parse(fs.readFileSync(interactionsPath, "utf-8"));
    const { error: itErr } = await supabase.from("neuroguide_docs").upsert({
      id: "neurorx_interactions",
      title: "NeuroRx Drug Interactions",
      organization: "NeuroRx",
      year: "2026",
      status: "active",
      data: interactions,
      updated_at: new Date().toISOString(),
    });
    if (itErr) {
      console.warn("⚠️ Note on interactions push:", itErr.message);
    } else {
      console.log(`✅ Pushed ${interactions.length} interactions to Supabase.`);
    }
  }

  console.log("==================================================");
  console.log(`🎉 Successfully synchronized ${pushedCount}/${files.length} drugs to Supabase!`);
  console.log("==================================================");
}

pushLocalToRemote().catch((err) => {
  console.error("❌ Push failed with unexpected error:", err);
  process.exit(1);
});
