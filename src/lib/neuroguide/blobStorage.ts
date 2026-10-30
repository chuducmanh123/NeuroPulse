import fs from "fs/promises";
import path from "path";
import { put, list } from "@vercel/blob";
import type {
  GuidelineDoc,
  ConferenceEvent,
  ClinicalScenario,
  NeuroGuideBlobPayload,
} from "../../types/neuroguide.ts";
import {
  MOCK_GUIDELINE_DOCS,
  MOCK_CONFERENCE_EVENTS,
  MOCK_CLINICAL_SCENARIOS,
} from "../../data/neuroguideMockData.ts";
import { getStoredGuidelinesAsDocs } from "./storeAdapter";

const BLOB_FILE_NAME = "neuroguide_data.json";
const LOCAL_STORAGE_PATH = path.join(process.cwd(), "public", "data", "neuroguide_cloud.json");

function cleanBlobToken(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const match = raw.match(/vercel_blob_rw_[a-zA-Z0-9_\-]+/);
  if (match) return match[0].trim();
  let cleaned = raw.replace(/^BLOB_READ_WRITE_TOKEN\s*=\s*/i, "");
  cleaned = cleaned.replace(/[\r\n\t"'`]/g, "").trim();
  return cleaned.length > 10 ? cleaned : undefined;
}

function cleanStoreId(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  let cleaned = raw.replace(/^BLOB_STORE_ID\s*=\s*/i, "");
  cleaned = cleaned.replace(/[\r\n\t"'`]/g, "").trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

function getBlobToken(): { token: string | undefined; keyName: string | undefined } {
  const direct = cleanBlobToken(process.env.BLOB_READ_WRITE_TOKEN);
  if (direct) {
    if (process.env.BLOB_READ_WRITE_TOKEN !== direct) {
      process.env.BLOB_READ_WRITE_TOKEN = direct;
    }
    return { token: direct, keyName: "BLOB_READ_WRITE_TOKEN" };
  }
  for (const [key, val] of Object.entries(process.env)) {
    if ((key.includes("BLOB") || key.includes("READ_WRITE")) && key.includes("TOKEN") && val) {
      const cleaned = cleanBlobToken(val);
      if (cleaned) {
        process.env.BLOB_READ_WRITE_TOKEN = cleaned;
        return { token: cleaned, keyName: key };
      }
    }
  }
  return { token: undefined, keyName: undefined };
}

function getBlobStoreId(): string | undefined {
  const sanitized = cleanStoreId(process.env.BLOB_STORE_ID);
  if (sanitized && process.env.BLOB_STORE_ID !== sanitized) {
    process.env.BLOB_STORE_ID = sanitized;
  }
  return sanitized;
}

export function hasBlobConfig(): boolean {
  return Boolean(getBlobStoreId() || getBlobToken().token);
}

/**
 * Loads dynamic NeuroGuide data from Vercel Blob
 */
export async function getFromBlob(): Promise<NeuroGuideBlobPayload | null> {
  if (!hasBlobConfig()) return null;
  const { token } = getBlobToken();
  const listOptions = token ? { prefix: BLOB_FILE_NAME, token } : { prefix: BLOB_FILE_NAME };
  try {
    const { blobs } = await list(listOptions);
    if (!blobs || blobs.length === 0) return null;
    const latestBlob = blobs[0];
    const res = await fetch(latestBlob.url, { cache: "no-store" });
    if (!res.ok) return null;
    const data: NeuroGuideBlobPayload = await res.json();
    return data && Array.isArray(data.guidelines) ? data : null;
  } catch (e) {
    console.error("Vercel Blob read error for NeuroGuide:", e);
    return null;
  }
}

/**
 * Saves dynamic NeuroGuide data to Vercel Blob
 */
export async function setToBlob(payload: NeuroGuideBlobPayload): Promise<{ ok: boolean; error?: string }> {
  if (!hasBlobConfig()) return { ok: false, error: "No blob configuration detected." };
  const { token } = getBlobToken();
  try {
    const jsonStr = JSON.stringify(payload, null, 2);
    const putOptions: any = {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    };
    if (token) putOptions.token = token;
    await put(BLOB_FILE_NAME, jsonStr, putOptions);
    return { ok: true };
  } catch (e: any) {
    console.error("Vercel Blob write error for NeuroGuide:", e);
    return { ok: false, error: e?.message || String(e) };
  }
}

/**
 * Fallback: Reads locally stored neuroguide_cloud.json (for dev and offline)
 */
export async function getFromLocalDisk(): Promise<NeuroGuideBlobPayload | null> {
  try {
    const raw = await fs.readFile(LOCAL_STORAGE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return parsed && Array.isArray(parsed.guidelines) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Fallback: Saves to local disk
 */
export async function setToLocalDisk(payload: NeuroGuideBlobPayload): Promise<boolean> {
  try {
    await fs.mkdir(path.dirname(LOCAL_STORAGE_PATH), { recursive: true });
    await fs.writeFile(LOCAL_STORAGE_PATH, JSON.stringify(payload, null, 2), "utf-8");
    return true;
  } catch (e) {
    console.warn("Could not save to local disk neuroguide_cloud.json:", e);
    return false;
  }
}

/**
 * Merges dynamic guidelines with static baseline catalog
 */
export function mergeGuidelines(
  dynamicItems: GuidelineDoc[] | null | undefined,
  staticItems: GuidelineDoc[] = MOCK_GUIDELINE_DOCS
): GuidelineDoc[] {
  if (!dynamicItems || dynamicItems.length === 0) return staticItems;

  const map = new Map<string, GuidelineDoc>();
  // 1. Add static items first
  staticItems.forEach((g) => map.set(g.id.toLowerCase(), g));
  // 2. Dynamic items override or append
  dynamicItems.forEach((g) => map.set(g.id.toLowerCase(), g));

  const result = Array.from(map.values());
  // Sort descending by publish year and date
  result.sort((a, b) => (b.publishDate || `${b.year}-01-01`).localeCompare(a.publishDate || `${a.year}-01-01`));
  return result;
}

/**
 * Merges dynamic conference events with static baseline
 */
export function mergeConferences(
  dynamicItems: ConferenceEvent[] | null | undefined,
  staticItems: ConferenceEvent[] = MOCK_CONFERENCE_EVENTS
): ConferenceEvent[] {
  if (!dynamicItems || dynamicItems.length === 0) return staticItems;

  const map = new Map<string, ConferenceEvent>();
  staticItems.forEach((c) => map.set(c.id.toLowerCase(), c));
  dynamicItems.forEach((c) => map.set(c.id.toLowerCase(), c));

  const result = Array.from(map.values());
  result.sort((a, b) => (b.startDate || `${b.year}-01-01`).localeCompare(a.startDate || `${a.year}-01-01`));
  return result;
}

/**
 * Merges dynamic clinical scenarios with static baseline
 */
export function mergeScenarios(
  dynamicItems: ClinicalScenario[] | null | undefined,
  staticItems: ClinicalScenario[] = MOCK_CLINICAL_SCENARIOS
): ClinicalScenario[] {
  if (!dynamicItems || dynamicItems.length === 0) return staticItems;

  const map = new Map<string, ClinicalScenario>();
  staticItems.forEach((s) => map.set(s.id.toLowerCase(), s));
  dynamicItems.forEach((s) => map.set(s.id.toLowerCase(), s));

  return Array.from(map.values());
}

/**
 * Loads and merges all NeuroGuide data across storage tiers:
 * Vercel Blob -> Local Disk Fallback -> Static Mock Baseline
 */
export async function loadMergedNeuroGuideData(): Promise<{
  guidelines: GuidelineDoc[];
  conferences: ConferenceEvent[];
  scenarios: ClinicalScenario[];
  storageSource: "vercel-blob" | "local-disk" | "mock-baseline";
  lastSyncedAt?: string;
}> {
  const storeDocs = getStoredGuidelinesAsDocs();

  const blobData = await getFromBlob();
  if (blobData) {
    const merged = mergeGuidelines(blobData.guidelines);
    const finalGuidelines = storeDocs.length > 0 ? mergeGuidelines(storeDocs, merged) : merged;
    return {
      guidelines: finalGuidelines,
      conferences: mergeConferences(blobData.conferences),
      scenarios: mergeScenarios(blobData.scenarios),
      storageSource: "vercel-blob",
      lastSyncedAt: blobData.lastSyncedAt,
    };
  }

  const localData = await getFromLocalDisk();
  if (localData) {
    const merged = mergeGuidelines(localData.guidelines);
    const finalGuidelines = storeDocs.length > 0 ? mergeGuidelines(storeDocs, merged) : merged;
    return {
      guidelines: finalGuidelines,
      conferences: mergeConferences(localData.conferences),
      scenarios: mergeScenarios(localData.scenarios),
      storageSource: "local-disk",
      lastSyncedAt: localData.lastSyncedAt,
    };
  }

  const finalGuidelines = storeDocs.length > 0 ? mergeGuidelines(storeDocs, MOCK_GUIDELINE_DOCS) : MOCK_GUIDELINE_DOCS;
  return {
    guidelines: finalGuidelines,
    conferences: MOCK_CONFERENCE_EVENTS,
    scenarios: MOCK_CLINICAL_SCENARIOS,
    storageSource: "mock-baseline",
  };
}

/**
 * Persists NeuroGuide data payload to active cloud storage (Vercel Blob with local fallback)
 */
export async function saveNeuroGuideToActiveStorage(payload: {
  guidelines: GuidelineDoc[];
  conferences?: ConferenceEvent[];
  scenarios?: ClinicalScenario[];
}): Promise<{
  success: boolean;
  storage: "vercel-blob" | "local-disk" | "failed";
  error?: string;
}> {
  const fullPayload: NeuroGuideBlobPayload = {
    guidelines: payload.guidelines,
    conferences: payload.conferences || MOCK_CONFERENCE_EVENTS,
    scenarios: payload.scenarios || MOCK_CLINICAL_SCENARIOS,
    lastSyncedAt: new Date().toISOString(),
    source: "NEUROGUIDE_AUTONOMOUS_RADAR",
  };

  if (hasBlobConfig()) {
    const blobRes = await setToBlob(fullPayload);
    if (blobRes.ok) {
      return { success: true, storage: "vercel-blob" };
    }
  }

  const localOk = await setToLocalDisk(fullPayload);
  if (localOk) {
    return { success: true, storage: "local-disk" };
  }

  return { success: false, storage: "failed", error: "Could not persist to Vercel Blob or local disk." };
}
