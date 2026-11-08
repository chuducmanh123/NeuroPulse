import fs from "fs";
import path from "path";
import { buildGuidelineRecordFromDoc } from "../src/lib/neuroguide/storeAdapter.ts";

const cloudPath = path.join(process.cwd(), "public", "data", "neuroguide_cloud.json");
const cloud = JSON.parse(fs.readFileSync(cloudPath, "utf-8"));
const aha = cloud.guidelines.find(g => g.id === "aha2026_test");

console.log("aha.allPracticeChanges length:", aha.allPracticeChanges?.length);

const builtRecord = buildGuidelineRecordFromDoc(aha, "APPROVED");
console.log("builtRecord.total_recommendations:", builtRecord.total_recommendations);
console.log("builtRecord.approved_count:", builtRecord.approved_count);
console.log("builtRecord.recommendations length:", builtRecord.recommendations.length);
console.log("Sample rec 0:", {
  rec_id: builtRecord.recommendations[0].rec_id,
  topic: builtRecord.recommendations[0].topic,
  cor: builtRecord.recommendations[0].cor,
  loe: builtRecord.recommendations[0].loe,
  driving_trials: builtRecord.recommendations[0].driving_trials
});
