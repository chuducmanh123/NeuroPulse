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
  const { data } = await supabase
    .from("neuroguide_docs")
    .select("data")
    .eq("id", "aha2026_test");

  const doc = data[0].data;
  const items = doc.allPracticeChanges || [];
  console.log("allPracticeChanges length:", items.length);
  if (items.length > 0) {
    console.log("Item 0 keys:", Object.keys(items[0]));
    console.log("Item 0:", JSON.stringify(items[0], null, 2));
    console.log("Item 1:", JSON.stringify(items[1], null, 2));
  }
}

check();
