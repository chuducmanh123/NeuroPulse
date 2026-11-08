import fs from "fs/promises";
import path from "path";
import { supabaseAdmin, hasSupabaseConfig } from "../supabase.ts";
import type {
  GuidelineDoc,
  ConferenceEvent,
  ClinicalScenario,
  RecommendationAtom,
  PivotalTrialRecord,
  RecommendationLabelOutput,
  NeuroGuideBlobPayload,
} from "../../types/neuroguide.ts";
import { PIVOTAL_TRIALS_SEED, mergePivotalTrialsWithConferences } from "../../data/pivotalTrialsSeed.ts";
import {
  MOCK_GUIDELINE_DOCS,
  MOCK_CONFERENCE_EVENTS,
  MOCK_CLINICAL_SCENARIOS,
  MOCK_RECOMMENDATION_ATOMS,
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

export function normalizeGuidelineTitle(t?: string): string {
  return (t || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function getCoreTopicKey(doc: { society?: string; title?: string }): string {
  const soc = (doc.society || "").toUpperCase();
  const t = (doc.title || "").toLowerCase();
  let normSoc = soc;
  if (soc.includes("AHA") || soc.includes("ASA") || t.includes("aha/asa") || t.includes("acc/aha")) normSoc = "AHA";
  else if (soc.includes("ESO") || t.includes("european stroke organisation")) normSoc = "ESO";
  else if (soc.includes("AAN")) normSoc = "AAN";
  else if (soc.includes("ILAE")) normSoc = "ILAE";
  else if (soc.includes("NCS")) normSoc = "NCS";

  if (normSoc === "ESO" && (t.includes("blood pressure") || t.includes("huyết áp"))) {
    return "ESO-BP";
  }
  if (normSoc === "ESO" && (t.includes("pneumonia") || t.includes("viêm phổi"))) {
    return "ESO-SAP";
  }
  if (normSoc === "ESO" && (t.includes("visual") || t.includes("vision") || t.includes("thị giác"))) {
    return "ESO-VISUAL-IMPAIRMENT";
  }
  if (normSoc === "ESO" && t.includes("motor")) {
    return "ESO-MOTOR-REHAB";
  }
  if (normSoc === "ESO" && (t.includes("aphasia") || t.includes("ngôn ngữ"))) {
    return "ESO-APHASIA";
  }
  if (normSoc === "ESO" && (t.includes("thrombolysis") || t.includes("tiêu sợi huyết"))) {
    return "ESO-IVT";
  }
  if (normSoc === "AHA" && (t.includes("acute ischemic stroke") || t.includes("acute ischaemic stroke") || t.includes("early management"))) {
    return "AHA-AIS";
  }
  if (normSoc === "AHA" && (t.includes("primary prevention") || t.includes("prevention of stroke"))) {
    return "AHA-PRIMARY-PREVENTION";
  }
  if ((normSoc === "AHA" || normSoc === "NCS" || normSoc === "ESO") && (t.includes("subarachnoid") || t.includes("aneurysmal") || /\basah\b/i.test(t))) {
    return `${normSoc}-SAH`;
  }
  if (normSoc === "ILAE" && (t.includes("status epilepticus") || t.includes("seizures"))) {
    return "ILAE-SE";
  }
  if (normSoc === "AAN" && (t.includes("antiseizure") || t.includes("teratogenesis"))) {
    return "AAN-ASM";
  }

  return `${normSoc}-${normalizeGuidelineTitle(doc.title)}`;
}

export interface SupabaseNeuroGuidePayload extends NeuroGuideBlobPayload {
  pendingGuidelineKeys?: string[];
  approvedGuidelineKeys?: string[];
}

/**
 * Loads dynamic NeuroGuide data from Supabase (Single Source of Truth)
 */
export async function getFromSupabase(): Promise<SupabaseNeuroGuidePayload | null> {
  if (!hasSupabaseConfig()) return null;
  try {
    const { data, error } = await supabaseAdmin
      .from("neuroguide_docs")
      .select("id, title, organization, status, data, updated_at");
    if (error || !data || data.length === 0) return null;

    const localDisk = await getFromLocalDisk();
    const deletedKeys = new Set<string>([
      ...((localDisk as any)?.deletedGuidelineIds || []).map((x: string) => x.toLowerCase().trim()),
      ...((localDisk as any)?.deleted_guideline_ids || []).map((x: string) => x.toLowerCase().trim()),
    ]);

    const guidelines: GuidelineDoc[] = [];
    const pendingKeys = new Set<string>();
    const approvedKeys = new Set<string>();
    let maxUpdatedAt = "";
    let customScenarios: ClinicalScenario[] = [];
    let customRecAtoms: RecommendationAtom[] = [];
    let customPivotalTrials: PivotalTrialRecord[] = [];
    let customRecLabels: Record<string, RecommendationLabelOutput> = {};

    for (const row of data as any[]) {
      if (row.id === "system_clinical_scenarios") {
        if (row.data?.scenarios && Array.isArray(row.data.scenarios)) {
          customScenarios = row.data.scenarios;
        }
        if (row.data?.recommendationAtoms && Array.isArray(row.data.recommendationAtoms)) {
          customRecAtoms = row.data.recommendationAtoms;
        }
        if (row.data?.pivotalTrials && Array.isArray(row.data.pivotalTrials)) {
          customPivotalTrials = row.data.pivotalTrials;
        }
        if (row.data?.customRecLabels && typeof row.data.customRecLabels === "object") {
          customRecLabels = row.data.customRecLabels;
        }
        if (Array.isArray(row.data?.deletedGuidelineIds)) {
          row.data.deletedGuidelineIds.forEach((x: string) => {
            if (x) deletedKeys.add(String(x).toLowerCase().trim());
          });
        }
        continue;
      }

      const rowStatus = String(row.status || row.data?.status || "approved").toLowerCase().trim();
      const rowId = String(row.id || row.data?.id || "").toLowerCase().trim();
      const rowTitle = String(row.title || row.data?.title || "");
      const normTitle = normalizeGuidelineTitle(rowTitle);
      const rowSoc = String(row.data?.society || row.organization || "");
      const topicKey = getCoreTopicKey({ society: rowSoc, title: rowTitle }).toLowerCase();

      if (row.updated_at && String(row.updated_at) > maxUpdatedAt) {
        maxUpdatedAt = String(row.updated_at);
      }

      if (rowStatus === "pending" || rowStatus === "pending_review") {
        if (rowId) pendingKeys.add(rowId);
      } else if (rowStatus === "deleted" || rowStatus === "rejected") {
        if (rowId) deletedKeys.add(rowId);
      } else {
        const gDoc = row.data as GuidelineDoc;
        if (gDoc && (gDoc.title || row.title)) {
          if (row.title && gDoc.title !== row.title) {
            gDoc.title = row.title;
          }
          if (rowId) {
            approvedKeys.add(rowId);
          }
          if (normTitle) {
            approvedKeys.add(normTitle);
          }
          guidelines.push(gDoc);
        }
      }
    }

    // Bảo đảm mọi guideline đã duyệt (approved) hoặc đang chờ duyệt mới (pending) KHÔNG BAO GIỜ nằm trong deletedKeys
    for (const ak of approvedKeys) {
      deletedKeys.delete(ak);
      pendingKeys.delete(ak);
    }
    for (const pk of pendingKeys) {
      deletedKeys.delete(pk);
    }

    const filteredGuidelines = guidelines.filter((g) => Boolean(g && g.title));

    if (customScenarios.length === 0 && localDisk?.scenarios && Array.isArray(localDisk.scenarios) && localDisk.scenarios.length > 0) {
      customScenarios = localDisk.scenarios;
    }
    if (customRecAtoms.length === 0 && localDisk?.recommendationAtoms && Array.isArray(localDisk.recommendationAtoms) && localDisk.recommendationAtoms.length > 0) {
      customRecAtoms = localDisk.recommendationAtoms;
    }
    if (customPivotalTrials.length === 0 && localDisk?.pivotalTrials && Array.isArray(localDisk.pivotalTrials) && localDisk.pivotalTrials.length > 0) {
      customPivotalTrials = localDisk.pivotalTrials;
    }
    if (Object.keys(customRecLabels).length === 0 && localDisk?.customRecLabels && typeof localDisk.customRecLabels === "object") {
      customRecLabels = localDisk.customRecLabels;
    }
    const effectiveConferences = (localDisk?.conferences && localDisk.conferences.length > 0) ? localDisk.conferences : MOCK_CONFERENCE_EVENTS;

    return {
      guidelines: filteredGuidelines,
      conferences: effectiveConferences,
      scenarios: mergeScenarios(customScenarios),
      recommendationAtoms: mergeRecommendationAtoms(customRecAtoms),
      pivotalTrials: mergePivotalTrialsWithConferences(customPivotalTrials, effectiveConferences),
      customRecLabels,
      deletedGuidelineIds: Array.from(deletedKeys),
      pendingGuidelineKeys: Array.from(pendingKeys),
      approvedGuidelineKeys: Array.from(approvedKeys),
      source: "NEUROGUIDE_AUTONOMOUS_RADAR",
      lastSyncedAt: maxUpdatedAt || "2026-01-01T00:00:00.000Z",
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
    const guidelines = Array.isArray(payload.guidelines) ? payload.guidelines : [];
    const nowIso = new Date().toISOString();
    const activeIds = new Set<string>();

    if (guidelines.length > 0) {
      const rows = guidelines.map((g) => {
        activeIds.add(g.id);
        const cleanData = { ...g, status: (g as any).status || "approved" };
        if ((cleanData as any)._reviewRecord && ((cleanData as any)._reviewRecord.pending_count || 0) === 0) {
          delete (cleanData as any)._reviewRecord;
        }
        return {
          id: g.id,
          title: g.title || "Untitled Guideline",
          organization: (g as any).organization || g.society || "Medical Organization",
          year: String(g.year || (g as any).pub_year || "2026"),
          status: (g as any).status || "approved",
          data: cleanData,
          updated_at: nowIso,
        };
      });
      const { error } = await supabaseAdmin
        .from("neuroguide_docs")
        .upsert(rows, { onConflict: "id" });
      if (error) {
        console.error("Supabase upsert error for NeuroGuide:", error);
        return { ok: false, error: error.message };
      }
    }

    if (
      (payload.scenarios && payload.scenarios.length > 0) ||
      (payload.pivotalTrials && payload.pivotalTrials.length > 0) ||
      (payload.customRecLabels && Object.keys(payload.customRecLabels).length > 0) ||
      (payload.deletedGuidelineIds && payload.deletedGuidelineIds.length > 0)
    ) {
      try {
        await supabaseAdmin.from("neuroguide_docs").upsert(
          {
            id: "system_clinical_scenarios",
            title: "System Clinical Scenarios",
            organization: "NeuroGuide System",
            year: "2026",
            status: "system",
            data: {
              scenarios: payload.scenarios || MOCK_CLINICAL_SCENARIOS,
              recommendationAtoms: payload.recommendationAtoms || MOCK_RECOMMENDATION_ATOMS,
              pivotalTrials: payload.pivotalTrials || PIVOTAL_TRIALS_SEED,
              customRecLabels: payload.customRecLabels || {},
              deletedGuidelineIds: payload.deletedGuidelineIds || [],
            },
            updated_at: nowIso,
          },
          { onConflict: "id" }
        );
      } catch (scErr) {
        console.warn("Supabase upsert warning for clinical scenarios:", scErr);
      }
    }

    // Dọn dẹp các bản ghi "approved" cũ đã bị gỡ hoặc trùng lặp (giữ nguyên các bản ghi "pending" và "deleted")
    try {
      const { data: existingRows } = await supabaseAdmin
        .from("neuroguide_docs")
        .select("id, status");
      if (Array.isArray(existingRows)) {
        const staleApprovedIds = existingRows
          .filter((r: any) => {
            const st = String(r.status || "approved").toLowerCase().trim();
            return st === "approved" && !activeIds.has(r.id) && r.id !== "system_clinical_scenarios";
          })
          .map((r: any) => r.id);
        if (staleApprovedIds.length > 0) {
          await supabaseAdmin
            .from("neuroguide_docs")
            .delete()
            .in("id", staleApprovedIds);
        }
      }
    } catch (cleanErr) {
      console.warn("Supabase cleanup warning:", cleanErr);
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
  const normalizeTitle = normalizeGuidelineTitle;

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
    const isAha = Boolean(
      (rawDoc.society || "").toUpperCase().includes("AHA") ||
      (rawDoc.society || "").toUpperCase().includes("ACC") ||
      (rawDoc.society || "").toUpperCase().includes("ASA") ||
      (rawDoc.title || "").toUpperCase().includes("AHA") ||
      (rawDoc.title || "").toUpperCase().includes("ACC") ||
      (rawDoc.id || "").toLowerCase().includes("aha") ||
      (rawDoc.id || "").toLowerCase().includes("acc")
    );
    const canonicalEsoPicos = !isAha ? getCanonicalEsoPicos(rawDoc.title, rawDoc.id) : null;
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
    const yr = doc.year || (doc.title || "").match(/\b(20\d{2}|19\d{2})\b/)?.[1] || "";
    const topicKey = yr ? `${coreKey}-${yr}` : coreKey;
    const existing = topicMap.get(topicKey) || titleMap.get(normT) || idMap.get(id);

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
      }

      const discarded = chosen === existing ? doc : existing;
      idMap.delete(discarded.id.toLowerCase());
      titleMap.delete(normalizeTitle(discarded.title));

      topicMap.set(topicKey, chosen);
      titleMap.set(normalizeTitle(chosen.title), chosen);
      idMap.set(chosen.id.toLowerCase(), chosen);
    } else {
      topicMap.set(topicKey, doc);
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
 * Merges dynamic recommendation atoms with static baseline
 */
export function mergeRecommendationAtoms(
  dynamicItems: RecommendationAtom[] | null | undefined,
  staticItems: RecommendationAtom[] = MOCK_RECOMMENDATION_ATOMS
): RecommendationAtom[] {
  if (!dynamicItems || dynamicItems.length === 0) return staticItems;

  const map = new Map<string, RecommendationAtom>();
  staticItems.forEach((r) => map.set(r.id.toLowerCase(), r));
  dynamicItems.forEach((r) => map.set(r.id.toLowerCase(), r));

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
  recommendationAtoms: RecommendationAtom[];
  pivotalTrials: PivotalTrialRecord[];
  customRecLabels: Record<string, RecommendationLabelOutput>;
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

  let dynamicData: SupabaseNeuroGuidePayload | null = null;

  // Primary: Load directly from Supabase
  if (hasSupabaseConfig()) {
    dynamicData = await getFromSupabase();
  }

  const supabaseApprovedKeys = new Set<string>(dynamicData?.approvedGuidelineKeys || []);
  const supabasePendingKeys = new Set<string>(dynamicData?.pendingGuidelineKeys || []);

  const localData = await getFromLocalDisk();
  const deletedSet = new Set<string>([
    ...(dynamicData?.deletedGuidelineIds || []).map((x) => x.toLowerCase()),
    ...((localData as any)?.deletedGuidelineIds || []).map((x: string) => x.toLowerCase()),
    ...((localData as any)?.deleted_guideline_ids || []).map((x: string) => x.toLowerCase()),
  ]);

  // Tuyệt đối gỡ bỏ khỏi deletedSet bất kỳ guideline nào đã được phê duyệt hợp lệ trên Supabase hoặc trong kho duyệt
  for (const approvedKey of supabaseApprovedKeys) {
    deletedSet.delete(approvedKey);
  }
  if (dynamicData?.guidelines) {
    for (const g of dynamicData.guidelines) {
      if (g?.id) {
        const lid = g.id.toLowerCase().trim();
        deletedSet.delete(lid);
        supabaseApprovedKeys.add(lid);
        coordinatedIds.add(lid);
      }
      if (g?.title) {
        const ltitle = normalizeT(g.title);
        deletedSet.delete(ltitle);
        supabaseApprovedKeys.add(ltitle);
        coordinatedTitles.add(ltitle);
      }
    }
  }
  for (const approvedId of approvedStoreIds) {
    if (!supabasePendingKeys.has(approvedId)) {
      deletedSet.delete(approvedId);
    }
  }
  for (const approvedTitle of approvedStoreTitles) {
    if (!supabasePendingKeys.has(approvedTitle)) {
      deletedSet.delete(approvedTitle);
    }
  }

  // Tập hợp các key chưa duyệt (ưu tiên trạng thái từ Supabase làm Single Source of Truth)
  const unapprovedFilterSet = new Set<string>();
  for (const pendingKey of supabasePendingKeys) {
    if (!supabaseApprovedKeys.has(pendingKey)) {
      unapprovedFilterSet.add(pendingKey);
    }
  }
  for (const unapprovedKey of unapprovedStoreKeys) {
    // Nếu guideline đã được đánh dấu "approved" trên Supabase thì KHÔNG cho phép file _latest.json cũ trong /tmp hay STORE_DIR chặn nó
    if (
      !supabaseApprovedKeys.has(unapprovedKey) &&
      !approvedStoreIds.has(unapprovedKey) &&
      !approvedStoreTitles.has(unapprovedKey)
    ) {
      unapprovedFilterSet.add(unapprovedKey);
    }
  }

  const filterCoordinated = (list: GuidelineDoc[] | undefined) => {
    if (!Array.isArray(list)) return [];
    const out: GuidelineDoc[] = [];
    for (const g of list) {
      if (!g || !g.title) continue;
      const id = (g.id || "").toLowerCase();
      const norm = normalizeT(g.title);
      const topicK = getCoreTopicKey(g).toLowerCase();
      const soc = (g.society || "").toUpperCase();
      const lowerTitle = (g.title || "").toLowerCase();

      if (
        deletedSet.has(id) ||
        deletedSet.has(norm) ||
        unapprovedFilterSet.has(id) ||
        unapprovedFilterSet.has(norm)
      ) {
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
        continue;
      }

      const ftSource = String(g.fullTextSource || "");
      const isRadarAutoFetched =
        ftSource === "EUROPE_PMC" ||
        ftSource === "PMC" ||
        ftSource === "PUBMED_ABSTRACT";
      const isExplicitlyCoordinated = coordinatedIds.has(id) || coordinatedTitles.has(norm);
      if (isRadarAutoFetched && !isExplicitlyCoordinated) {
        continue;
      }

      if (!isExplicitlyCoordinated && !g.aiSynthesized && !(g.allPracticeChanges && g.allPracticeChanges.length > 0)) {
        continue;
      }

      // Chuẩn hóa cấu trúc PICO của ESO nếu thuộc guideline có bảng tổng hợp chuẩn
      const isAha = Boolean(
        (g.society || "").toUpperCase().includes("AHA") ||
        (g.society || "").toUpperCase().includes("ACC") ||
        (g.society || "").toUpperCase().includes("ASA") ||
        (g.title || "").toUpperCase().includes("AHA") ||
        (g.title || "").toUpperCase().includes("ACC") ||
        (g.id || "").toLowerCase().includes("aha") ||
        (g.id || "").toLowerCase().includes("acc")
      );
      const canonicalEsoPicos = !isAha ? getCanonicalEsoPicos(g.title, g.id) : null;
      if (canonicalEsoPicos && canonicalEsoPicos.length > 0) {
        const cleanChanges = convertEsoPicoItemsToPracticeChanges(
          canonicalEsoPicos,
          isEsoBpGuideline(g.title, g.id)
            ? "Blood Pressure Management (ESO GRADE)"
            : "Aneurysmal Subarachnoid Haemorrhage (ESO GRADE)"
        );
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
    return (
      deletedSet.has(id) ||
      deletedSet.has(norm) ||
      unapprovedFilterSet.has(id) ||
      unapprovedFilterSet.has(norm)
    );
  };

  if (dynamicData && Array.isArray(dynamicData.guidelines) && dynamicData.guidelines.length > 0) {
    const coordinatedDynamicDocs = filterCoordinated(dynamicData.guidelines);
    const filteredStore = storeDocs.filter((g) => !isStoreDocDeleted(g));
    const mergedExclusionSet = new Set<string>([...deletedSet, ...unapprovedFilterSet]);
    const finalGuidelines =
      filteredStore.length > 0
        ? mergeGuidelines(coordinatedDynamicDocs, filteredStore, mergedExclusionSet)
        : mergeGuidelines(coordinatedDynamicDocs, [], mergedExclusionSet);

    const mergedConfs = mergeConferences(dynamicData.conferences);
    return {
      guidelines: finalGuidelines,
      conferences: mergedConfs,
      scenarios: mergeScenarios(dynamicData.scenarios),
      recommendationAtoms: mergeRecommendationAtoms(dynamicData.recommendationAtoms),
      pivotalTrials: mergePivotalTrialsWithConferences(dynamicData.pivotalTrials || localData?.pivotalTrials || [], mergedConfs),
      customRecLabels: dynamicData.customRecLabels || localData?.customRecLabels || {},
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
        ? mergeGuidelines(coordinatedLocalDocs, filteredStore, deletedSet)
        : mergeGuidelines(coordinatedLocalDocs, [], deletedSet);
    const mergedConfs = mergeConferences(localData.conferences);
    return {
      guidelines: finalGuidelines,
      conferences: mergedConfs,
      scenarios: mergeScenarios(localData.scenarios),
      recommendationAtoms: mergeRecommendationAtoms(localData.recommendationAtoms),
      pivotalTrials: mergePivotalTrialsWithConferences(localData.pivotalTrials || [], mergedConfs),
      customRecLabels: localData.customRecLabels || {},
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
    recommendationAtoms: MOCK_RECOMMENDATION_ATOMS,
    pivotalTrials: mergePivotalTrialsWithConferences(PIVOTAL_TRIALS_SEED, MOCK_CONFERENCE_EVENTS),
    customRecLabels: {},
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
  recommendationAtoms?: RecommendationAtom[];
  pivotalTrials?: PivotalTrialRecord[];
  customRecLabels?: Record<string, RecommendationLabelOutput>;
  deletedGuidelineIds?: string[];
}): Promise<{
  success: boolean;
  storage: "supabase" | "local-disk" | "failed";
  error?: string;
}> {
  let effectiveDeletedIds = payload.deletedGuidelineIds;
  let existingPivotalTrials = payload.pivotalTrials;
  let existingCustomLabels = payload.customRecLabels;
  if (!effectiveDeletedIds || !existingPivotalTrials || !existingCustomLabels) {
    try {
      const existingSupabase = hasSupabaseConfig() ? await getFromSupabase() : null;
      const existingLocal = await getFromLocalDisk();
      if (!effectiveDeletedIds) {
        effectiveDeletedIds = Array.from(
          new Set([
            ...(existingSupabase?.deletedGuidelineIds || []),
            ...((existingLocal as any)?.deletedGuidelineIds || []),
            ...((existingLocal as any)?.deleted_guideline_ids || []),
          ])
        );
      }
      if (!existingPivotalTrials) {
        existingPivotalTrials = existingSupabase?.pivotalTrials || existingLocal?.pivotalTrials || PIVOTAL_TRIALS_SEED;
      }
      if (!existingCustomLabels) {
        existingCustomLabels = existingSupabase?.customRecLabels || existingLocal?.customRecLabels || {};
      }
    } catch {
      effectiveDeletedIds = effectiveDeletedIds || [];
      existingPivotalTrials = existingPivotalTrials || PIVOTAL_TRIALS_SEED;
      existingCustomLabels = existingCustomLabels || {};
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
    recommendationAtoms: payload.recommendationAtoms || MOCK_RECOMMENDATION_ATOMS,
    pivotalTrials: existingPivotalTrials,
    customRecLabels: existingCustomLabels,
    deletedGuidelineIds: effectiveDeletedIds,
    lastSyncedAt: new Date().toISOString(),
    source: "NEUROGUIDE_AUTONOMOUS_RADAR",
  };

  const localOk = await setToLocalDisk(fullPayload);

  if (hasSupabaseConfig()) {
    if (effectiveDeletedIds && effectiveDeletedIds.length > 0) {
      try {
        await supabaseAdmin
          .from("neuroguide_docs")
          .update({ status: "deleted", updated_at: new Date().toISOString() })
          .in("id", effectiveDeletedIds);
      } catch (e) {
        console.warn("Could not mark deleted docs in Supabase:", e);
      }
    }
    const sbRes = await setToSupabase(fullPayload);
    if (sbRes.ok) {
      return { success: true, storage: "supabase" };
    }
    if (localOk) {
      return { success: true, storage: "local-disk", error: sbRes.error };
    }
    return { success: false, storage: "failed", error: sbRes.error || "Supabase write error" };
  }

  if (localOk) {
    return { success: true, storage: "local-disk" };
  }

  return { success: false, storage: "failed", error: "Could not persist to Supabase or local disk." };
}
