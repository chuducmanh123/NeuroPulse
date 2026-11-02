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
import {
  getStoredGuidelinesAsDocs,
  syncStoreBlobsToTmp,
  getUnapprovedStoredGuidelineKeys,
} from "./storeAdapter.ts";
import {
  getCanonicalEsoPicos,
  convertEsoPicoItemsToPracticeChanges,
  isEsoBpGuideline,
} from "./esoPicoGrouper.ts";

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
  staticItems: GuidelineDoc[] = MOCK_GUIDELINE_DOCS,
  deletedIds?: Set<string>
): GuidelineDoc[] {
  const normalizeTitle = (t: string) => (t || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  const getCoreTopicKey = (doc: GuidelineDoc): string => {
    const soc = (doc.society || "").toUpperCase();
    const t = (doc.title || "").toLowerCase();
    let normSoc = soc;
    if (soc.includes("AHA") || soc.includes("ASA")) normSoc = "AHA";
    else if (soc.includes("ESO")) normSoc = "ESO";
    else if (soc.includes("AAN")) normSoc = "AAN";
    else if (soc.includes("ILAE")) normSoc = "ILAE";
    else if (soc.includes("NCS")) normSoc = "NCS";

    if (normSoc === "ESO" && (t.includes("blood pressure") || t.includes("huyết áp"))) {
      return "ESO-BP";
    }
    if (normSoc === "ESO" && (t.includes("pneumonia") || t.includes("viêm phổi"))) {
      return "ESO-SAP";
    }
    if (normSoc === "AHA" && (t.includes("acute ischemic stroke") || t.includes("acute ischaemic stroke") || t.includes("early management"))) {
      return "AHA-AIS";
    }
    if (normSoc === "AHA" && (t.includes("primary prevention") || t.includes("prevention of stroke"))) {
      return "AHA-PRIMARY-PREVENTION";
    }
    if ((normSoc === "AHA" || normSoc === "NCS") && (t.includes("subarachnoid") || t.includes("aneurysmal"))) {
      return `${normSoc}-SAH`;
    }
    if (normSoc === "ILAE" && (t.includes("status epilepticus") || t.includes("seizures"))) {
      return "ILAE-SE";
    }
    if (normSoc === "AAN" && (t.includes("antiseizure") || t.includes("teratogenesis"))) {
      return "AAN-ASM";
    }

    return `${normSoc}-${normalizeTitle(doc.title)}`;
  };

  const isDeleted = (doc: GuidelineDoc) => {
    if (!deletedIds || deletedIds.size === 0) return false;
    const id = (doc.id || "").toLowerCase();
    const normT = normalizeTitle(doc.title);
    return deletedIds.has(id) || deletedIds.has(normT);
  };

  const filteredStatic = staticItems.filter((g) => !isDeleted(g));

  if (!dynamicItems || dynamicItems.length === 0) {
    return filteredStatic;
  }

  const topicMap = new Map<string, GuidelineDoc>();
  const titleMap = new Map<string, GuidelineDoc>();
  const idMap = new Map<string, GuidelineDoc>();

  const addDoc = (rawDoc: GuidelineDoc) => {
    if (!rawDoc || !rawDoc.title) return;
    if (isDeleted(rawDoc)) return;
    const id = (rawDoc.id || "").toLowerCase();
    const soc = (rawDoc.society || "").toUpperCase();
    const lowerTitle = (rawDoc.title || "").toLowerCase();
    if (
      id.startsWith("eso-pmid-") ||
      id.startsWith("esc-pmid-") ||
      id.startsWith("esc-") ||
      id.includes("-epmc-") ||
      id.includes("-pmid-") ||
      id.startsWith("b15e76") ||
      id.includes("phantom") ||
      soc === "ESC" ||
      lowerTitle.includes("myocarditis") ||
      lowerTitle.includes("ultra-processed foods")
    ) {
      return;
    }

    // Tự động chuẩn hóa danh sách PICO cho các guideline ESO chuẩn để loại bỏ các mục thừa (PICO 1, PICO 11..42)
    let doc = rawDoc;
    const canonicalEsoPicos = getCanonicalEsoPicos(rawDoc.title, rawDoc.id);
    if (canonicalEsoPicos && canonicalEsoPicos.length > 0) {
      const cleanChanges = convertEsoPicoItemsToPracticeChanges(
        canonicalEsoPicos,
        isEsoBpGuideline(rawDoc.title, rawDoc.id)
          ? "Blood Pressure Management (ESO GRADE)"
          : "Aneurysmal Subarachnoid Haemorrhage (ESO GRADE)"
      );
      doc = {
        ...rawDoc,
        allPracticeChanges: cleanChanges,
      };
    }

    const normT = normalizeTitle(doc.title);
    const coreKey = getCoreTopicKey(doc);
    const existing = topicMap.get(coreKey) || titleMap.get(normT) || idMap.get(id);

    if (existing) {
      // Deduplicate: choose the one with more practice changes, or keep newer / user-synthesized version
      // Đối với guideline ESO có bảng PICO chuẩn, cả hai đều đã được chuẩn hóa số lượng khuyến cáo
      const existingChanges = existing.allPracticeChanges?.length || 0;
      const docChanges = doc.allPracticeChanges?.length || 0;

      let chosen = doc;
      if (doc.synthesizedAt && !existing.synthesizedAt) {
        chosen = doc;
      } else if (existing.synthesizedAt && !doc.synthesizedAt) {
        chosen = existing;
      } else if (doc.synthesizedAt && existing.synthesizedAt) {
        chosen = doc.synthesizedAt >= existing.synthesizedAt ? doc : existing;
      } else if (docChanges !== existingChanges) {
        chosen = docChanges > existingChanges ? doc : existing;
      } else if (doc.year !== existing.year) {
        chosen = doc.year > existing.year ? doc : existing;
      } else if (existing.id === "aha-ais-2026") {
        chosen = existing;
      } else if (doc.id === "aha-ais-2026") {
        chosen = doc;
      }

      // Remove discarded document from all indices
      const discarded = chosen === existing ? doc : existing;
      idMap.delete(discarded.id.toLowerCase());
      titleMap.delete(normalizeTitle(discarded.title));

      topicMap.set(coreKey, chosen);
      titleMap.set(normalizeTitle(chosen.title), chosen);
      idMap.set(chosen.id.toLowerCase(), chosen);
    } else {
      topicMap.set(coreKey, doc);
      titleMap.set(normT, doc);
      idMap.set(id, doc);
    }
  };

  filteredStatic.forEach(addDoc);
  dynamicItems.forEach(addDoc);

  const result = Array.from(new Set(topicMap.values()));
  // Tự động sắp xếp: Thứ tự năm giảm dần (mới nhất) -> Thứ tự Society theo bảng chữ cái A-Z
  result.sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return (a.society || "").localeCompare(b.society || "");
  });
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
 * Strictly enforces that only documents coordinated through the coordination center
 * (MOCK_GUIDELINE_DOCS + data/guidelines_store) are admitted into the active library.
 */
export async function loadMergedNeuroGuideData(): Promise<{
  guidelines: GuidelineDoc[];
  conferences: ConferenceEvent[];
  scenarios: ClinicalScenario[];
  storageSource: "vercel-blob" | "local-disk" | "mock-baseline";
  lastSyncedAt?: string;
  deletedGuidelineIds?: string[];
}> {
  await syncStoreBlobsToTmp();
  const storeDocs = getStoredGuidelinesAsDocs();
  const unapprovedStoreKeys = getUnapprovedStoredGuidelineKeys();
  const normalizeT = (t: string) => (t || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  const approvedStoreIds = new Set(storeDocs.map((g) => g.id.toLowerCase()));
  const approvedStoreTitles = new Set(storeDocs.map((g) => normalizeT(g.title)));
  const mockIds = new Set(MOCK_GUIDELINE_DOCS.map((g) => g.id.toLowerCase()));
  const mockTitles = new Set(MOCK_GUIDELINE_DOCS.map((g) => normalizeT(g.title)));

  const coordinatedIds = new Set([
    ...mockIds,
    ...approvedStoreIds,
    "aha2026_test",
    "eso-ais-2026",
  ]);
  const coordinatedTitles = new Set([
    ...mockTitles,
    ...approvedStoreTitles,
  ]);

  const blobData = await getFromBlob();
  const localData = await getFromLocalDisk();
  const deletedSet = new Set<string>([
    ...(blobData?.deletedGuidelineIds || []).map((x) => x.toLowerCase()),
    ...((localData as any)?.deletedGuidelineIds || []).map((x: string) => x.toLowerCase()),
    ...((localData as any)?.deleted_guideline_ids || []).map((x: string) => x.toLowerCase()),
  ]);

  // Chặn mọi guideline đang nằm trong Review Queue nhưng chưa được duyệt (approved_count === 0)
  for (const unapprovedKey of unapprovedStoreKeys) {
    if (!approvedStoreIds.has(unapprovedKey) && !approvedStoreTitles.has(unapprovedKey)) {
      deletedSet.add(unapprovedKey);
    }
  }

  let needsSelfHealSave = false;

  const filterCoordinated = (list: GuidelineDoc[] | undefined) => {
    if (!Array.isArray(list)) return [];
    const out: GuidelineDoc[] = [];
    for (const g of list) {
      if (!g || !g.title) continue;
      const id = (g.id || "").toLowerCase();
      const norm = normalizeT(g.title);
      const soc = (g.society || "").toUpperCase();
      const lowerTitle = (g.title || "").toLowerCase();

      if (deletedSet.has(id) || deletedSet.has(norm)) {
        needsSelfHealSave = true;
        continue;
      }
      if (
        id.startsWith("eso-pmid-") ||
        id.startsWith("esc-pmid-") ||
        id.startsWith("esc-") ||
        id.includes("-epmc-") ||
        id.includes("-pmid-") ||
        id.startsWith("b15e76") ||
        id.includes("phantom") ||
        soc === "ESC" ||
        lowerTitle.includes("myocarditis") ||
        lowerTitle.includes("ultra-processed foods")
      ) {
        needsSelfHealSave = true;
        continue;
      }

      // Nếu tài liệu đến từ Radar tự động (EUROPE_PMC / PMC / PUBMED_ABSTRACT) mà chưa được duyệt trong storeDocs, không cho hiển thị
      const ftSource = String(g.fullTextSource || "");
      const isRadarAutoFetched =
        ftSource === "EUROPE_PMC" ||
        ftSource === "PMC" ||
        ftSource === "PUBMED_ABSTRACT";
      const isExplicitlyCoordinated = coordinatedIds.has(id) || coordinatedTitles.has(norm);
      if (isRadarAutoFetched && !isExplicitlyCoordinated) {
        needsSelfHealSave = true;
        continue;
      }

      if (!isExplicitlyCoordinated && !g.aiSynthesized && !(g.allPracticeChanges && g.allPracticeChanges.length > 0)) {
        needsSelfHealSave = true;
        continue;
      }

      // Chuẩn hóa cấu trúc PICO của ESO nếu thuộc guideline có bảng tổng hợp chuẩn (loại bỏ PICO 1 dư & PICO 11..42)
      const canonicalEsoPicos = getCanonicalEsoPicos(g.title, g.id);
      if (canonicalEsoPicos && canonicalEsoPicos.length > 0) {
        const cleanChanges = convertEsoPicoItemsToPracticeChanges(
          canonicalEsoPicos,
          isEsoBpGuideline(g.title, g.id)
            ? "Blood Pressure Management (ESO GRADE)"
            : "Aneurysmal Subarachnoid Haemorrhage (ESO GRADE)"
        );
        if ((g.allPracticeChanges?.length || 0) !== cleanChanges.length) {
          needsSelfHealSave = true;
        }
        out.push({
          ...g,
          allPracticeChanges: cleanChanges,
        });
      } else {
        out.push(g);
      }
    }
    return out;
  };

  const isStoreDocDeleted = (g: GuidelineDoc) => {
    const id = (g.id || "").toLowerCase();
    const norm = normalizeT(g.title);
    return deletedSet.has(id) || deletedSet.has(norm);
  };

  if (blobData && Array.isArray(blobData.guidelines) && blobData.guidelines.length > 0) {
    const coordinatedBlobDocs = filterCoordinated(blobData.guidelines);
    const filteredStore = storeDocs.filter((g) => !isStoreDocDeleted(g));
    const finalGuidelines =
      filteredStore.length > 0
        ? mergeGuidelines(filteredStore, coordinatedBlobDocs, deletedSet)
        : mergeGuidelines([], coordinatedBlobDocs, deletedSet);

    // Tự động dọn dẹp lại Vercel Blob nếu trước đó bị lẫn các tài liệu chưa duyệt hoặc PICO chưa chuẩn hóa
    if (needsSelfHealSave || blobData.guidelines.length !== finalGuidelines.length) {
      saveNeuroGuideToActiveStorage({
        guidelines: finalGuidelines,
        conferences: blobData.conferences,
        scenarios: blobData.scenarios,
        deletedGuidelineIds: Array.from(deletedSet),
      }).catch(() => {});
    }

    return {
      guidelines: finalGuidelines,
      conferences: mergeConferences(blobData.conferences),
      scenarios: mergeScenarios(blobData.scenarios),
      storageSource: "vercel-blob",
      lastSyncedAt: blobData.lastSyncedAt,
      deletedGuidelineIds: Array.from(deletedSet),
    };
  }

  if (localData && Array.isArray(localData.guidelines) && localData.guidelines.length > 0) {
    // Nguồn dữ liệu thực tế từ public/data/neuroguide_cloud.json
    // KHÔNG re-merge với MOCK_GUIDELINE_DOCS để tránh hồi sinh dữ liệu đã bị xóa vĩnh viễn
    const coordinatedLocalDocs = filterCoordinated(localData.guidelines);
    const filteredStore = storeDocs.filter((g) => !isStoreDocDeleted(g));
    const finalGuidelines =
      filteredStore.length > 0
        ? mergeGuidelines(filteredStore, coordinatedLocalDocs, deletedSet)
        : mergeGuidelines([], coordinatedLocalDocs, deletedSet);
    return {
      guidelines: finalGuidelines,
      conferences: mergeConferences(localData.conferences),
      scenarios: mergeScenarios(localData.scenarios),
      storageSource: "local-disk",
      lastSyncedAt: localData.lastSyncedAt,
      deletedGuidelineIds: Array.from(deletedSet),
    };
  }

  // Chỉ khi không có bất kỳ dữ liệu lưu trữ nào mới nạp từ MOCK_GUIDELINE_DOCS ban đầu
  const seededMocks = MOCK_GUIDELINE_DOCS.filter((g) => !isStoreDocDeleted(g));
  const filteredStore = storeDocs.filter((g) => !isStoreDocDeleted(g));
  const finalGuidelines = filteredStore.length > 0 ? mergeGuidelines(filteredStore, seededMocks, deletedSet) : seededMocks;
  return {
    guidelines: finalGuidelines,
    conferences: MOCK_CONFERENCE_EVENTS,
    scenarios: MOCK_CLINICAL_SCENARIOS,
    storageSource: "mock-baseline",
    deletedGuidelineIds: Array.from(deletedSet),
  };
}

/**
 * Persists NeuroGuide data payload to active cloud storage (Vercel Blob with local fallback)
 */
export async function saveNeuroGuideToActiveStorage(payload: {
  guidelines: GuidelineDoc[];
  conferences?: ConferenceEvent[];
  scenarios?: ClinicalScenario[];
  deletedGuidelineIds?: string[];
}): Promise<{
  success: boolean;
  storage: "vercel-blob" | "local-disk" | "failed";
  error?: string;
}> {
  let effectiveDeletedIds = payload.deletedGuidelineIds;
  if (!effectiveDeletedIds) {
    try {
      const existingBlob = await getFromBlob();
      const existingLocal = await getFromLocalDisk();
      effectiveDeletedIds = Array.from(
        new Set([
          ...(existingBlob?.deletedGuidelineIds || []),
          ...((existingLocal as any)?.deletedGuidelineIds || []),
          ...((existingLocal as any)?.deleted_guideline_ids || []),
        ])
      );
    } catch {
      effectiveDeletedIds = [];
    }
  }

  const fullPayload: NeuroGuideBlobPayload = {
    guidelines: payload.guidelines,
    conferences: payload.conferences || MOCK_CONFERENCE_EVENTS,
    scenarios: payload.scenarios || MOCK_CLINICAL_SCENARIOS,
    deletedGuidelineIds: effectiveDeletedIds,
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
