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

async function check() {
  const { data, error } = await supabase
    .from("neuroguide_docs")
    .select("*")
    .eq("id", "aha2026_test");

  if (error) {
    console.error("Error:", error);
    return;
  }

  if (data && data[0]) {
    const row = data[0];
    console.log("Row Keys:", Object.keys(row));
    console.log("Updated at:", row.updated_at);
    console.log("Data Keys:", Object.keys(row.data || {}));
    if (row.data) {
      console.log("total_recommendations:", row.data.total_recommendations);
      console.log("recommendations length:", row.data.recommendations?.length);
      console.log("practiceChanges length:", row.data.practiceChanges?.length);
      console.log("raw_recs length:", row.data.raw_recs?.length);
      if (row.data._reviewRecord) {
        console.log("reviewRecord keys:", Object.keys(row.data._reviewRecord));
        console.log("reviewRecord recs length:", row.data._reviewRecord.recommendations?.length);
        console.log("reviewRecord total_recommendations:", row.data._reviewRecord.total_recommendations);
      }
      if (row.data.practiceChanges && row.data.practiceChanges.length > 0) {
        console.log("Sample practiceChange[0]:", {
          id: row.data.practiceChanges[0].id,
          topic: row.data.practiceChanges[0].topic,
          title: row.data.practiceChanges[0].title,
          cor: row.data.practiceChanges[0].class_of_recommendation,
          loe: row.data.practiceChanges[0].level_of_evidence,
          recommendation: row.data.practiceChanges[0].recommendation?.slice(0, 100),
        });
      }
    }
  } else {
    console.log("No record found with id aha2026_test");
  }
}

check();
