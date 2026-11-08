import fs from "fs";
import path from "path";
import { buildGuidelineRecordFromDoc } from "../src/lib/neuroguide/storeAdapter.ts";

const STORE_DIR = path.join(process.cwd(), "data", "guidelines_store");
const CLOUD_JSON = path.join(process.cwd(), "public", "data", "neuroguide_cloud.json");
const CATALOG_PATH = path.join(STORE_DIR, "catalog.json");
const AHA_STORE_PATH = path.join(STORE_DIR, "aha2026_test_latest.json");

console.log("===> Starting Comprehensive Data Reconciliation...");

// 1. Read cloud data
const cloud = JSON.parse(fs.readFileSync(CLOUD_JSON, "utf-8"));
const ahaIndex = cloud.guidelines.findIndex(g => g.id === "aha2026_test");

if (ahaIndex === -1) {
  console.error("aha2026_test not found in cloud!");
  process.exit(1);
}

const ahaDoc = cloud.guidelines[ahaIndex];
console.log(`Cloud AHA doc has ${ahaDoc.allPracticeChanges?.length} practice changes.`);

// 2. Build full store record with all 204 recommendations
const fullRecord = buildGuidelineRecordFromDoc(ahaDoc, "APPROVED");
fullRecord.guideline_id = "aha2026_test";
fullRecord.version = 4;
fullRecord.metadata = {
  ...fullRecord.metadata,
  guideline_id: "aha2026_test",
  title: ahaDoc.title || "2026 Guideline for the Early Management of Patients With Acute Ischemic Stroke",
  society: "AHA/ASA",
  year: 2026,
  source_url: "https://www.ahajournals.org/doi/10.1161/STR.0000000000000513",
  doi: "10.1161/STR.0000000000000513",
  state: "CONFIRMED",
  top_takeaways: ahaDoc.topTakeaways || fullRecord.metadata?.top_takeaways || []
};
fullRecord.total_recommendations = fullRecord.recommendations.length;
fullRecord.approved_count = fullRecord.recommendations.length;
fullRecord.pending_count = 0;
fullRecord.rejected_count = 0;
fullRecord.updated_at = new Date().toISOString();

// Write to data/guidelines_store/aha2026_test_latest.json
fs.writeFileSync(AHA_STORE_PATH, JSON.stringify(fullRecord, null, 2), "utf-8");
console.log(`Updated ${AHA_STORE_PATH} with ${fullRecord.recommendations.length} recommendations.`);

// 3. Update catalog.json
let catalog = {};
if (fs.existsSync(CATALOG_PATH)) {
  try {
    catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf-8"));
  } catch {}
}

catalog["aha2026_test"] = {
  guideline_id: "aha2026_test",
  title: fullRecord.metadata.title,
  society: fullRecord.metadata.society,
  year: fullRecord.metadata.year,
  latest_version: 4,
  total_recommendations: fullRecord.total_recommendations,
  pending_count: 0,
  approved_count: fullRecord.approved_count,
  rejected_count: 0,
  grading_system: "AHA_ACC",
  updated_at: fullRecord.updated_at
};

fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2), "utf-8");
console.log(`Updated ${CATALOG_PATH} (aha2026_test total: ${catalog["aha2026_test"].total_recommendations}).`);

// 4. Ensure cloud.guidelines[ahaIndex] has both allPracticeChanges AND recommendations
ahaDoc.recommendations = fullRecord.recommendations;
ahaDoc.total_recommendations = fullRecord.total_recommendations;
ahaDoc.approved_count = fullRecord.approved_count;
cloud.guidelines[ahaIndex] = ahaDoc;

fs.writeFileSync(CLOUD_JSON, JSON.stringify(cloud, null, 2), "utf-8");
console.log(`Updated ${CLOUD_JSON} to include recommendations array alongside allPracticeChanges.`);

console.log("===> Comprehensive Data Reconciliation Completed Successfully!");
