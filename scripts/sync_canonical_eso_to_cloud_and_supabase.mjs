import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import {
  CANONICAL_ESO_2024_PFO_PICOS,
  CANONICAL_ESO_2025_BP_PICOS,
  CANONICAL_ESO_2026_ASAH_PICOS,
  convertEsoPicoItemsToPracticeChanges,
} from "../src/lib/neuroguide/esoPicoGrouper.ts";

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

  const targets = [
    {
      id: "eso-2024-patent-foramen-ovale-pfo-after-stroke-iop9",
      title: "2024 European Stroke Organisation (ESO) Guidelines on Patent Foramen Ovale (PFO) After Stroke",
      year: "2024",
      picos: CANONICAL_ESO_2024_PFO_PICOS,
    },
    {
      id: "eso-2025-blood-pressure-management",
      title: "2025 ESO Guideline on Blood Pressure Management in Acute Ischaemic Stroke and Intracerebral Haemorrhage",
      year: "2025",
      picos: CANONICAL_ESO_2025_BP_PICOS,
    },
    {
      id: "eso-2026-doc-1793547549940",
      title: "2026 ESO EANS and ESMINT guideline on aneurysmal subarachnoid haemorrhage",
      year: "2026",
      picos: CANONICAL_ESO_2026_ASAH_PICOS,
    },
  ];

  for (const t of targets) {
    const gIndex = cloud.guidelines.findIndex(g => g.id === t.id);
    if (gIndex === -1) {
      console.warn(`Guideline ${t.id} not found in cloud data, skipping.`);
      continue;
    }

    const cleanChanges = convertEsoPicoItemsToPracticeChanges(t.picos, t.title);
    cloud.guidelines[gIndex].allPracticeChanges = cleanChanges;
    cloud.guidelines[gIndex].updated_at = new Date().toISOString();

    console.log(`Updated local cloud data for ${t.id}: ${cleanChanges.length} recommendations with explicit v3Labels.`);

    // Upsert to Supabase
    const { error } = await supabase
      .from("neuroguide_docs")
      .upsert(
        {
          id: t.id,
          title: cloud.guidelines[gIndex].title || t.title,
          organization: cloud.guidelines[gIndex].society || "ESO",
          year: t.year,
          status: "approved",
          data: cloud.guidelines[gIndex],
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (error) {
      console.error(`Supabase update error for ${t.id}:`, error);
    } else {
      console.log(`Successfully synced ${t.id} to Supabase!`);
    }
  }

  cloud.lastSyncedAt = new Date().toISOString();
  fs.writeFileSync(cloudPath, JSON.stringify(cloud, null, 2), "utf-8");
  console.log("Saved updated public/data/neuroguide_cloud.json successfully!");
}

run().catch(console.error);
