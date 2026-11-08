import fs from "fs";

const cloud = JSON.parse(fs.readFileSync("public/data/neuroguide_cloud.json", "utf-8"));
const existingTrials = cloud.pivotalTrials || [];
const existingAcronyms = new Set(existingTrials.map(t => (t.acronym || "").toUpperCase().trim()));
const existingIds = new Set(existingTrials.map(t => (t.id || "").toLowerCase().trim()));

console.log("Current Pivotal Trials in system:", existingTrials.length);

cloud.guidelines.forEach(g => {
  const recs = g.recommendations || g.allPracticeChanges || [];
  let trialRefs = new Set();
  recs.forEach(r => {
    const trials = r.drivingTrials || r.driving_trials || [];
    trials.forEach(t => trialRefs.add(t));
  });
  console.log(`Guideline [${g.id}]: ${recs.length} recs, ${trialRefs.size} referenced studies.`);
  if (trialRefs.size > 0 && trialRefs.size < 15) {
    console.log("  Sample:", Array.from(trialRefs).slice(0, 5));
  }
});
