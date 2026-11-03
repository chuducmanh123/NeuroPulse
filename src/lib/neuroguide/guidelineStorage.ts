import fs from "fs/promises";
import path from "path";
import { supabaseAdmin, hasSupabaseConfig } from "../supabase.ts";
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
  getUnapprovedStoredGuidelineKeys,
} from "./storeAdapter.ts";
import {
  getCanonicalEsoPicos,
  convertEsoPicoItemsToPracticeChanges,
  isEsoBpGuideline,
} from "./esoPicoGrouper.ts";

const LOCAL_STORAGE_PATH = path.join(process.cwd(), "public", "data", "neuroguide_cloud.json");

/**
 * Loads dynamic NeuroGuide data from Supabase (Single Source of Truth)
 */
export async function getFromSupabase(): Promise<NeuroGuideBlobPayload | null> {
  if (!hasSupabaseConfig()) return null;
  try {
    const { data, error } = await supabaseAdmin
      .from("neuroguide_docs")
      .select("data");
    if (error || !data || data.length === 0) return null;
    const guidelines = data.map((d: any) => d.data as GuidelineDoc);
    return {
      guidelines,
      conferences: MOCK_CONFERENCE_EVENTS,
      scenarios: MOCK_CLINICAL_SCENARIOS,
      source: "NEUROGUIDE_AUTONOMOUS_RADAR",
      lastSyncedAt: new Date().toISOString(),
    };
  } catch (e) {
    console.error("Supabase read error for NeuroGuide:", e);
    return null;
  }
}

/**
 * Saves dynamic NeuroGuide data to Supabase
 */
export async function setToSupabase(payload: NeuroGuideBlobPayload): Promise<{ ok: boolean; error?: string }> {
  if (!hasSupabaseConfig()) return { ok: false, error: "No Supabase config" };
  try {
    if (!Array.isArray(payload.guidelines) || payload.guidelines.length === 0) {
      return { ok: true };
    }
    const rows = payload.guidelines.map((g) => ({
      id: g.id,
      title: g.title || "Untitled Guideline",
      organization: (g as any).organization || g.society || "Medical Organization",
      year: String(g.year || (g as any).pub_year || "2026"),
      status: (g as any).status || "approved",
      data: g,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabaseAdmin
      .from("neuroguide_docs")
      .upsert(rows, { onConflict: "id" });
    if (error) {
      console.error("Supabase upsert error for NeuroGuide:", error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e: any) {
    console.error("Supabase upsert exception for NeuroGuide:", e);
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

    // Tự động chuẩn hóa danh sách PICO cho các guideline ESO chuẩn để loại bỏ các mục thừa
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
 * Supabase (Single Source of Truth) -> Local Disk Fallback -> Static Mock Baseline
 */
export async function loadMergedNeuroGuideData(): Promise<{
  guidelines: GuidelineDoc[];
  conferences: ConferenceEvent[];
  scenarios: ClinicalScenario[];
  storageSource: "supabase" | "local-disk" | "mock-baseline";
  lastSyncedAt?: string;
  deletedGuidelineIds?: string[];
}> {
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

  let dynamicData: NeuroGuideBlobPayload | null = null;
  let dynamicSource: "supabase" | "local-disk" | "mock-baseline" = "supabase";

  // Primary: Load directly from Supabase
  if (hasSupabaseConfig()) {
    dynamicData = await getFromSupabase();
  }

  const localData = await getFromLocalDisk();
  const deletedSet = new Set<string>([
    ...(dynamicData?.deletedGuidelineIds || []).map((x) => x.toLowerCase()),
    ...((localData as any)?.deletedGuidelineIds || []).map((x: string) => x.toLowerCase()),
    ...((localData as any)?.deleted_guideline_ids || []).map((x: string) => x.toLowerCase()),
  ]);

  // Tuyệt đối gỡ bỏ khỏi deletedSet bất kỳ guideline nào đã được phê duyệt hợp lệ (trong kho duyệt hoặc Mock baseline)
  for (const approvedId of approvedStoreIds) {
    deletedSet.delete(approvedId);
  }
  for (const approvedTitle of approvedStoreTitles) {
    deletedSet.delete(approvedTitle);
  }
  for (const mDoc of MOCK_GUIDELINE_DOCS) {
    if (approvedStoreIds.has(mDoc.id.toLowerCase()) || approvedStoreTitles.has(normalizeT(mDoc.title))) {
      deletedSet.delete(mDoc.id.toLowerCase());
      deletedSet.delete(normalizeT(mDoc.title));
    }
  }

  // Tập hợp các key chưa duyệt (dùng để tạm chặn hiển thị trên client, KHÔNG ghi vào deletedGuidelineIds vĩnh viễn)
  const unapprovedFilterSet = new Set<string>();
  for (const unapprovedKey of unapprovedStoreKeys) {
    if (!approvedStoreIds.has(unapprovedKey) && !approvedStoreTitles.has(unapprovedKey)) {
      unapprovedFilterSet.add(unapprovedKey);
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

      if (deletedSet.has(id) || deletedSet.has(norm) || unapprovedFilterSet.has(id) || unapprovedFilterSet.has(norm)) {
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

      // Chuẩn hóa cấu trúc PICO của ESO nếu thuộc guideline có bảng tổng hợp chuẩn
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

  if (dynamicData && Array.isArray(dynamicData.guidelines) && dynamicData.guidelines.length > 0) {
    const coordinatedDynamicDocs = filterCoordinated(dynamicData.guidelines);
    const filteredStore = storeDocs.filter((g) => !isStoreDocDeleted(g));
    const finalGuidelines =
      filteredStore.length > 0
        ? mergeGuidelines(filteredStore, coordinatedDynamicDocs, deletedSet)
        : mergeGuidelines([], coordinatedDynamicDocs, deletedSet);

    if (needsSelfHealSave || dynamicData.guidelines.length !== finalGuidelines.length) {
      saveNeuroGuideToActiveStorage({
        guidelines: finalGuidelines,
        conferences: dynamicData.conferences,
        scenarios: dynamicData.scenarios,
        deletedGuidelineIds: Array.from(deletedSet),
      }).catch(() => {});
    }

    return {
      guidelines: finalGuidelines,
      conferences: mergeConferences(dynamicData.conferences),
      scenarios: mergeScenarios(dynamicData.scenarios),
      storageSource: "supabase",
      lastSyncedAt: dynamicData.lastSyncedAt,
      deletedGuidelineIds: Array.from(deletedSet),
    };
  }

  // Fallback: Local disk if offline or Supabase data empty
  if (localData && Array.isArray(localData.guidelines) && localData.guidelines.length > 0) {
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

  // Static mock baseline
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
 * Persists NeuroGuide data payload to active cloud storage (Supabase with local fallback)
 */
export async function saveNeuroGuideToActiveStorage(payload: {
  guidelines: GuidelineDoc[];
  conferences?: ConferenceEvent[];
  scenarios?: ClinicalScenario[];
  deletedGuidelineIds?: string[];
}): Promise<{
  success: boolean;
  storage: "supabase" | "local-disk" | "failed";
  error?: string;
}> {
  let effectiveDeletedIds = payload.deletedGuidelineIds;
  if (!effectiveDeletedIds) {
    try {
      const existingSupabase = hasSupabaseConfig() ? await getFromSupabase() : null;
      const existingLocal = await getFromLocalDisk();
      effectiveDeletedIds = Array.from(
        new Set([
          ...(existingSupabase?.deletedGuidelineIds || []),
          ...((existingLocal as any)?.deletedGuidelineIds || []),
          ...((existingLocal as any)?.deleted_guideline_ids || []),
        ])
      );
    } catch {
      effectiveDeletedIds = [];
    }
  }

  // Tuyệt đối loại bỏ mọi ID hoặc Tiêu đề của guideline đang active/approved khỏi danh sách deletedGuidelineIds
  const activeKeys = new Set<string>();
  payload.guidelines.forEach((g) => {
    if (g.id) activeKeys.add(g.id.toLowerCase().trim());
    if (g.title) activeKeys.add(g.title.toLowerCase().replace(/[^a-z0-9]/g, ""));
  });
  effectiveDeletedIds = (effectiveDeletedIds || []).filter(
    (id) => !activeKeys.has((id || "").toLowerCase().trim())
  );

  const fullPayload: NeuroGuideBlobPayload = {
    guidelines: payload.guidelines,
    conferences: payload.conferences || MOCK_CONFERENCE_EVENTS,
    scenarios: payload.scenarios || MOCK_CLINICAL_SCENARIOS,
    deletedGuidelineIds: effectiveDeletedIds,
    lastSyncedAt: new Date().toISOString(),
    source: "NEUROGUIDE_AUTONOMOUS_RADAR",
  };

  if (hasSupabaseConfig()) {
    const sbRes = await setToSupabase(fullPayload);
    if (sbRes.ok) {
      await setToLocalDisk(fullPayload);
      return { success: true, storage: "supabase" };
    }
    return { success: false, storage: "failed", error: sbRes.error || "Supabase write error" };
  }

  const localOk = await setToLocalDisk(fullPayload);
  if (localOk) {
    return { success: true, storage: "local-disk" };
  }

  return { success: false, storage: "failed", error: "Could not persist to Supabase or local disk." };
}
