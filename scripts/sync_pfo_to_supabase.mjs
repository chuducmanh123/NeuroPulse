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
  const pfo = cloud.guidelines.find(g => g.id === "eso-2024-patent-foramen-ovale-pfo-after-stroke-iop9");

  if (!pfo) {
    console.error("eso-2024-patent-foramen-ovale-pfo-after-stroke-iop9 not found in cloud data");
    return;
  }

  console.log(`Syncing clean ${pfo.allPracticeChanges?.length || 0}-rec PFO guideline to Supabase...`);
  const { error } = await supabase
    .from("neuroguide_docs")
    .upsert({
      id: pfo.id,
      title: pfo.title,
      organization: pfo.society || "ESO",
      year: "2024",
      status: "approved",
      data: pfo,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });

  if (error) {
    console.error("Supabase update error:", error);
    process.exit(1);
  } else {
    console.log("Successfully updated PFO guideline in Supabase!");
  }
}

run().catch(console.error);
