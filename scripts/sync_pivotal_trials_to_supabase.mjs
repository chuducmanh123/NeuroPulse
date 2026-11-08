import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const envPath = path.join(process.cwd(), ".env.local");
const content = fs.readFileSync(envPath, "utf-8");
const env = {};
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
    env[key] = val;
  }
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function run() {
  const cloudPath = path.join(process.cwd(), "public", "data", "neuroguide_cloud.json");
  const cloud = JSON.parse(fs.readFileSync(cloudPath, "utf-8"));
  const trials = cloud.pivotalTrials || [];
  console.log(`Syncing ${trials.length} pivotal trials to Supabase...`);

  // Check system_clinical_scenarios row in Supabase
  const { data: existingRow, error: fetchErr } = await supabase
    .from("neuroguide_docs")
    .select("*")
    .eq("id", "system_clinical_scenarios");

  if (fetchErr) {
    console.error("Fetch error:", fetchErr);
    return;
  }

  const existingData = existingRow && existingRow[0] ? existingRow[0].data || {} : {};
  existingData.pivotalTrials = trials;

  const { error: upsertErr } = await supabase
    .from("neuroguide_docs")
    .upsert({
      id: "system_clinical_scenarios",
      title: "System Clinical Scenarios & Pivotal Trials",
      organization: "NeuroPulse System",
      status: "approved",
      data: existingData,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });

  if (upsertErr) {
    console.error("Supabase upsert error:", upsertErr);
  } else {
    console.log("Successfully synced all 55 pivotal trials to Supabase!");
  }
}

run();
