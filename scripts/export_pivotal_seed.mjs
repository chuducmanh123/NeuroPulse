import fs from "fs";
import path from "path";

const CLOUD_JSON = path.join(process.cwd(), "public", "data", "neuroguide_cloud.json");
const SEED_TS = path.join(process.cwd(), "src", "data", "pivotalTrialsSeed.ts");

const cloud = JSON.parse(fs.readFileSync(CLOUD_JSON, "utf-8"));
const trials = cloud.pivotalTrials || [];

console.log(`Exporting ${trials.length} pivotal trials into ${SEED_TS}...`);

const seedContent = `import type { PivotalTrialRecord, ConferenceEvent } from "../types/neuroguide.ts";

/**
 * Ultra-compact Pivotal Trials Registry (~700 bytes per trial).
 * Stores high-yield PICO + quantitative primary/safety endpoints without bulky PDFs.
 */
export const PIVOTAL_TRIALS_SEED: PivotalTrialRecord[] = ${JSON.stringify(trials, null, 2)};

export function mergePivotalTrialsWithConferences(
  trials: PivotalTrialRecord[],
  conferences: ConferenceEvent[]
): PivotalTrialRecord[] {
  const merged = [...trials];
  for (const conf of conferences) {
    if (conf.isPivotalTrial && conf.pivotalTrialData) {
      const existingIdx = merged.findIndex((t) => t.id === conf.pivotalTrialData!.id);
      if (existingIdx !== -1) {
        merged[existingIdx] = conf.pivotalTrialData;
      } else {
        merged.push(conf.pivotalTrialData);
      }
    }
  }
  return merged;
}
`;

fs.writeFileSync(SEED_TS, seedContent, "utf-8");
console.log(`Successfully updated ${SEED_TS} with all ${trials.length} trials!`);
