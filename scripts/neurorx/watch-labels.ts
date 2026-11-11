#!/usr/bin/env node
/**
 * NeuroRx Label Watcher (OpenFDA / DailyMed)
 * Detects FDA prescribing information updates and queues them for human review.
 * NEVER modifies drug records automatically.
 * Usage: node --experimental-strip-types scripts/neurorx/watch-labels.ts
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Source, DrugRecord, UpdateQueueItem } from "../../src/types/neurorx.ts";

export type { UpdateQueueItem };

const DATA_DIR = path.resolve(process.cwd(), "data/neurorx");
const SOURCES_FILE = path.join(DATA_DIR, "sources.json");
const DRUGS_DIR = path.join(DATA_DIR, "drugs");
const UPDATES_QUEUE_FILE = path.join(DATA_DIR, "updates_queue.json");

/**
 * Maps which drugs cite a given source_id
 */
export function buildSourceDrugMap(drugs: DrugRecord[]): Map<string, string[]> {
  const map = new Map<string, Set<string>>();

  function extractSourceIds(obj: unknown, drugId: string) {
    if (!obj || typeof obj !== "object") return;
    if (Array.isArray(obj)) {
      obj.forEach((item) => extractSourceIds(item, drugId));
      return;
    }
    const o = obj as Record<string, unknown>;
    if (typeof o.source_id === "string") {
      if (!map.has(o.source_id)) map.set(o.source_id, new Set());
      map.get(o.source_id)!.add(drugId);
    }
    for (const k of Object.keys(o)) {
      extractSourceIds(o[k], drugId);
    }
  }

  for (const d of drugs) {
    if (d.id) extractSourceIds(d, d.id);
  }

  const result = new Map<string, string[]>();
  for (const [sId, drugSet] of map.entries()) {
    result.set(sId, Array.from(drugSet).sort());
  }
  return result;
}

/**
 * Pure diffing and idempotency checker for a single source
 */
export function detectVersionChange(
  source: { id: string; version?: string; url?: string },
  latestVersion: string,
  associatedDrugIds: string[],
  existingQueue: UpdateQueueItem[]
): UpdateQueueItem | null {
  if (!source.version || !latestVersion) return null;
  if (source.version === latestVersion) return null;

  // Idempotency: Do not create duplicate pending items for same version change
  const alreadyQueued = existingQueue.some(
    (item) =>
      item.source_id === source.id &&
      item.new_version === latestVersion &&
      item.status === "pending"
  );
  if (alreadyQueued) return null;

  return {
    id: `update-${source.id}-${Date.now()}`,
    source_id: source.id,
    drug_ids: associatedDrugIds,
    old_version: source.version,
    new_version: latestVersion,
    detected_at: new Date().toISOString(),
    url:
      source.url ||
      `https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=${source.version}`,
    status: "pending",
  };
}

/**
 * Queries DailyMed public API for the current set_id version
 */
export async function fetchDailyMedVersion(setId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://dailymed.nlm.nih.gov/dailymed/services/v2/spls/${setId}.json`,
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json.data?.published_date || json.data?.spl_version || null;
  } catch {
    return null;
  }
}

/**
 * Main execution routine
 */
export async function runLabelWatcher(options?: {
  fetchVersionFn?: (setId: string) => Promise<string | null>;
}): Promise<{ checked: number; newUpdates: number; queue: UpdateQueueItem[] }> {
  if (!fs.existsSync(SOURCES_FILE)) {
    throw new Error(`Missing sources.json at ${SOURCES_FILE}`);
  }

  const sources: Source[] = JSON.parse(fs.readFileSync(SOURCES_FILE, "utf-8"));
  let existingQueue: UpdateQueueItem[] = [];
  if (fs.existsSync(UPDATES_QUEUE_FILE)) {
    try {
      existingQueue = JSON.parse(fs.readFileSync(UPDATES_QUEUE_FILE, "utf-8"));
    } catch {
      existingQueue = [];
    }
  }

  // Load drugs to build mapping
  const drugs: DrugRecord[] = [];
  if (fs.existsSync(DRUGS_DIR)) {
    const files = fs.readdirSync(DRUGS_DIR).filter((f) => f.endsWith(".json"));
    for (const f of files) {
      try {
        drugs.push(JSON.parse(fs.readFileSync(path.join(DRUGS_DIR, f), "utf-8")));
      } catch {}
    }
  }

  const sourceDrugMap = buildSourceDrugMap(drugs);
  const fetchVersion = options?.fetchVersionFn || fetchDailyMedVersion;

  const fdaSources = sources.filter(
    (s) => s.type === "fda_label" && s.version && s.version.length > 0
  );

  let newUpdates = 0;
  const updatedQueue = [...existingQueue];

  for (const s of fdaSources) {
    const latestVersion = await fetchVersion(s.version!);
    if (!latestVersion) continue;

    const drugIds = sourceDrugMap.get(s.id) || [];
    const change = detectVersionChange(s, latestVersion, drugIds, updatedQueue);
    if (change) {
      updatedQueue.push(change);
      newUpdates++;
    }
  }

  if (newUpdates > 0) {
    fs.writeFileSync(UPDATES_QUEUE_FILE, JSON.stringify(updatedQueue, null, 2), "utf-8");
  }

  return {
    checked: fdaSources.length,
    newUpdates,
    queue: updatedQueue,
  };
}

// CLI entry point
const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  console.log("🔍 Checking FDA prescribing labels for published updates...");
  runLabelWatcher()
    .then(({ checked, newUpdates }) => {
      console.log(`✅ Checked ${checked} FDA label source(s).`);
      if (newUpdates > 0) {
        console.log(`⚡ Detected ${newUpdates} new label update(s) added to updates_queue.json`);
      } else {
        console.log("No new label updates detected.");
      }
    })
    .catch((err) => {
      console.error("❌ Label watcher encountered an error:", err);
      process.exit(1);
    });
}
