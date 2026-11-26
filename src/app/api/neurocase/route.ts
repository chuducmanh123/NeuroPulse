import { NextResponse } from "next/server";
import { unstable_cache, revalidateTag } from "next/cache";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { ClinicalCase } from "@/types/clinicalCase";
import { supabaseAdmin, hasSupabaseAdminConfig } from "@/lib/supabase";
import {
  sanitizeUrl,
  generateAdminAuthToken,
  verifyAdminToken,
  verifyAdminPasscode,
  isAdminAuthConfigured,
  sanitizeCommunityCaseSubmission,
} from "@/utils/security";

export const dynamic = "force-dynamic";

const NEUROCASE_CACHE_TAG = "neurocase-cases";

function revalidateNeurocaseCache(): void {
  try {
    revalidateTag(NEUROCASE_CACHE_TAG, { expire: 0 });
  } catch {
    // Ignore outside Next.js request/cache context
  }
}

const CASES_FILE_PATH = path.join(process.cwd(), "public", "data", "cases.json");
const PENDING_CASES_FILE_PATH = path.join(process.cwd(), "data", "neurocase_pending_cases.json");

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const KV_KEY = "neurocase_custom_cases_v1";
const KV_DELETED_KEY = "neurocase_deleted_ids_v1";
const DELETED_SENTINEL_ID = "__deleted_case_ids__";
const MAX_SUBMIT_PAYLOAD_BYTES = 2 * 1024 * 1024; // 2 MB cap for community submissions
const MAX_SUBMIT_IMAGING_ITEMS = 10;

function normalizeSubmissionCase(raw: any): ClinicalCase | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const chief = typeof raw.presentation?.chief_complaint === "string" ? raw.presentation.chief_complaint.trim() : "";
  if (!chief) return null;

  const isoDate =
    typeof raw.published_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.published_date.trim())
      ? raw.published_date.trim()
      : new Date().toISOString().split("T")[0];

  const rawImaging = Array.isArray(raw.presentation?.imaging)
    ? raw.presentation.imaging.slice(0, MAX_SUBMIT_IMAGING_ITEMS)
    : [];

  return {
    ...raw,
    title: typeof raw.title === "string" && raw.title.trim() ? raw.title.trim().slice(0, 300) : "Community Clinical Case",
    subspecialty: typeof raw.subspecialty === "string" && raw.subspecialty.trim() ? raw.subspecialty.trim().slice(0, 120) : "General Neurology",
    difficulty: typeof raw.difficulty === "string" && raw.difficulty.trim() ? raw.difficulty.trim().slice(0, 60) : "Fellow",
    published_date: isoDate,
    presentation: {
      ...(raw.presentation && typeof raw.presentation === "object" ? raw.presentation : {}),
      chief_complaint: chief.slice(0, 4000),
      imaging: rawImaging.filter((img: unknown) => img && typeof img === "object" && !Array.isArray(img)),
    },
  } as ClinicalCase;
}

// ==========================================
// 1. SUPABASE STORAGE (PRIMARY CLOUD BACKEND)
// ==========================================
async function getFromSupabase(): Promise<{ cases: ClinicalCase[]; deletedIds: Set<string> } | null> {
  if (!hasSupabaseAdminConfig()) return null;
  try {
    const { data, error } = await supabaseAdmin
      .from("clinical_cases")
      .select("data");
    if (error || !data || data.length === 0) {
      if (error) console.error("Supabase read error in /api/neurocase:", error);
      return null;
    }
    const deletedIds = new Set<string>();
    const cases: ClinicalCase[] = [];
    for (const row of data as any[]) {
      const payload = row?.data;
      if (!payload) continue;
      if (payload.id === DELETED_SENTINEL_ID) {
        if (Array.isArray(payload.deletedIds)) {
          payload.deletedIds.forEach((id: unknown) => {
            if (typeof id === "string" && id) deletedIds.add(id);
          });
        }
        continue;
      }
      cases.push(payload as ClinicalCase);
    }
    return { cases, deletedIds };
  } catch (e) {
    console.error("Supabase read exception in /api/neurocase:", e);
    return null;
  }
}

async function setToSupabase(cases: ClinicalCase[]): Promise<boolean> {
  if (!hasSupabaseAdminConfig()) return false;
  try {
    const rows = cases.map((c) => ({
      id: c.id,
      case_code: c.case_code || c.id,
      title: c.title || "Untitled Case",
      subspecialty: c.subspecialty || (Array.isArray(c.subspecialties) ? c.subspecialties[0] : "General Neurology"),
      difficulty: c.difficulty || "Fellow",
      status: c.status || "approved",
      is_daily_challenge: Boolean(c.is_daily_challenge),
      published_date: c.published_date || new Date().toISOString().split("T")[0],
      data: c,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabaseAdmin
      .from("clinical_cases")
      .upsert(rows, { onConflict: "id" });

    if (error) {
      console.error("Supabase upsert error in /api/neurocase:", error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Supabase upsert exception in /api/neurocase:", e);
    return false;
  }
}

async function upsertSingleCaseToSupabase(c: ClinicalCase): Promise<boolean> {
  if (!hasSupabaseAdminConfig()) return false;
  try {
    const row = {
      id: c.id,
      case_code: c.case_code || c.id,
      title: c.title || "Untitled Case",
      subspecialty: c.subspecialty || (Array.isArray(c.subspecialties) ? c.subspecialties[0] : "General Neurology"),
      difficulty: c.difficulty || "Fellow",
      status: c.status || "pending",
      is_daily_challenge: Boolean(c.is_daily_challenge),
      published_date: c.published_date || new Date().toISOString().split("T")[0],
      data: c,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabaseAdmin.from("clinical_cases").upsert([row], { onConflict: "id" });
    if (error) {
      console.error("Supabase single-case upsert error in /api/neurocase:", error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Supabase single-case upsert exception in /api/neurocase:", e);
    return false;
  }
}

async function deleteFromSupabase(caseId: string): Promise<boolean> {
  if (!hasSupabaseAdminConfig()) return false;
  try {
    const { error } = await supabaseAdmin
      .from("clinical_cases")
      .delete()
      .eq("id", caseId);
    return !error;
  } catch {
    return false;
  }
}

async function recordDeletedIdInSupabase(caseId: string): Promise<boolean> {
  if (!hasSupabaseAdminConfig()) return false;
  try {
    const existing = await getFromSupabase();
    const deletedSet = new Set<string>(existing?.deletedIds || []);
    deletedSet.add(caseId);
    const { error } = await supabaseAdmin.from("clinical_cases").upsert(
      {
        id: DELETED_SENTINEL_ID,
        case_code: "SYSTEM-TOMBSTONE",
        title: "Deleted Case IDs Registry",
        subspecialty: "System",
        difficulty: "Fellow",
        status: "rejected",
        is_daily_challenge: false,
        published_date: "1970-01-01",
        data: { id: DELETED_SENTINEL_ID, deletedIds: Array.from(deletedSet) },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    return !error;
  } catch {
    return false;
  }
}

// ==========================================
// 2. VERCEL KV / UPSTASH REDIS STORAGE
// ==========================================
async function getFromKv(): Promise<ClinicalCase[] | null> {
  if (!KV_URL || !KV_TOKEN) return null;
  try {
    const res = await fetch(`${KV_URL}/get/${KV_KEY}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.result) return null;
    const parsed = typeof json.result === "string" ? JSON.parse(json.result) : json.result;
    return Array.isArray(parsed) ? parsed : null;
  } catch (e) {
    console.error("KV read error:", e);
    return null;
  }
}

async function setToKv(cases: ClinicalCase[]): Promise<boolean> {
  if (!KV_URL || !KV_TOKEN) return false;
  try {
    const res = await fetch(`${KV_URL}/set/${KV_KEY}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KV_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cases),
    });
    return res.ok;
  } catch (e) {
    console.error("KV write error:", e);
    return false;
  }
}

async function getDeletedIdsFromKv(): Promise<Set<string>> {
  if (!KV_URL || !KV_TOKEN) return new Set();
  try {
    const res = await fetch(`${KV_URL}/get/${KV_DELETED_KEY}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) return new Set();
    const json = await res.json();
    if (!json.result) return new Set();
    const parsed = typeof json.result === "string" ? JSON.parse(json.result) : json.result;
    return Array.isArray(parsed) ? new Set(parsed.filter((x) => typeof x === "string")) : new Set();
  } catch {
    return new Set();
  }
}

async function recordDeletedIdInKv(caseId: string): Promise<boolean> {
  if (!KV_URL || !KV_TOKEN) return false;
  try {
    const deleted = await getDeletedIdsFromKv();
    deleted.add(caseId);
    const res = await fetch(`${KV_URL}/set/${KV_DELETED_KEY}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KV_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(Array.from(deleted)),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function getBundledCases(): Promise<ClinicalCase[]> {
  try {
    const raw = await fs.readFile(CASES_FILE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn("Could not read local bundled cases.json:", e);
    return [];
  }
}

async function getLocalPendingCases(): Promise<ClinicalCase[]> {
  try {
    const raw = await fs.readFile(PENDING_CASES_FILE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Merges dynamic store cases (Supabase / KV) with repo-bundled cases.
 * Priority: Dynamic store overrides repo cases by ID (so admin edits/moderation persist),
 * but any new cases generated by GitHub Actions bot in repo cases.json that are missing
 * from the dynamic store are seamlessly included!
 */
function mergeCases(
  dynamicCases: ClinicalCase[] | null,
  bundledCases: ClinicalCase[],
  deletedIds: Set<string> = new Set()
): ClinicalCase[] {
  const isAlive = (c: ClinicalCase) => Boolean(c?.id) && c.id !== DELETED_SENTINEL_ID && !deletedIds.has(c.id);
  const aliveDynamic = (dynamicCases || []).filter(isAlive);
  const aliveBundled = (bundledCases || []).filter(isAlive);

  if (aliveDynamic.length === 0) return aliveBundled;
  if (aliveBundled.length === 0) return aliveDynamic;

  const dynamicIdMap = new Map<string, ClinicalCase>();
  aliveDynamic.forEach((c) => dynamicIdMap.set(c.id, c));

  const result: ClinicalCase[] = [...aliveDynamic];
  for (const bCase of aliveBundled) {
    if (!dynamicIdMap.has(bCase.id)) {
      result.push(bCase);
    }
  }

  // Sort descending by published_date
  result.sort((a, b) => (b.published_date || "").localeCompare(a.published_date || ""));
  return result;
}

/**
 * Persists cases list to available backend storage.
 */
async function saveToActiveStorage(cases: ClinicalCase[]): Promise<{
  success: boolean;
  storage: string;
  error?: string;
  warning?: string;
}> {
  // 1. Try Supabase (Primary, unlimited requests)
  if (hasSupabaseAdminConfig()) {
    const sbOk = await setToSupabase(cases);
    if (sbOk) {
      revalidateNeurocaseCache();
      return { success: true, storage: "supabase" };
    }
  }

  // 2. Try Vercel KV
  if (KV_URL && KV_TOKEN) {
    const kvOk = await setToKv(cases);
    if (kvOk) {
      return { success: true, storage: "vercel-kv" };
    }
  }

  // 3. Fall back to local disk (dev environment): isolate unapproved cases outside public/
  try {
    const approvedOnly = cases.filter((c) => !c.status || c.status === "approved");
    const unapprovedOnly = cases.filter((c) => Boolean(c.status && c.status !== "approved"));
    await fs.writeFile(CASES_FILE_PATH, JSON.stringify(approvedOnly, null, 2), "utf-8");
    await fs.mkdir(path.dirname(PENDING_CASES_FILE_PATH), { recursive: true });
    await fs.writeFile(PENDING_CASES_FILE_PATH, JSON.stringify(unapprovedOnly, null, 2), "utf-8");
    return { success: true, storage: "local-file" };
  } catch (fsErr: any) {
    if (fsErr?.code === "EROFS" || process.env.VERCEL) {
      return {
        success: false,
        storage: "serverless-readonly",
        warning: "Serverless filesystem is read-only. Configure Supabase credentials to persist changes.",
      };
    }
    throw fsErr;
  }
}

const fetchCachedSupabaseCases = unstable_cache(
  async (): Promise<{ cases: ClinicalCase[]; deletedIds: string[] } | null> => {
    const res = await getFromSupabase();
    if (!res) return null;
    return {
      cases: res.cases,
      deletedIds: Array.from(res.deletedIds),
    };
  },
  ["neurocase-supabase-cases-v1"],
  {
    tags: [NEUROCASE_CACHE_TAG],
    revalidate: 300,
  }
);

async function getCachedFromSupabase(): Promise<{ cases: ClinicalCase[]; deletedIds: Set<string> } | null> {
  const cached = await fetchCachedSupabaseCases();
  if (!cached) return null;
  return {
    cases: cached.cases,
    deletedIds: new Set(cached.deletedIds),
  };
}

/**
 * GET /api/neurocase
 * Hybrid merge: combines remote Supabase dynamic store with repo bundled cases.json
 * so bot-generated daily cases are never hidden, while admin moderation is preserved.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // Optional admin debug route - strictly requires Authorization header or x-admin-token
    if (action === "debug" || url.searchParams.get("debug") === "1") {
      const authHeader = req.headers.get("x-admin-token") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
      if (!verifyAdminToken(authHeader)) {
        return NextResponse.json({ error: "Unauthorized access to debug endpoint." }, { status: 401 });
      }

      return NextResponse.json({
        isVercel: Boolean(process.env.VERCEL),
        hasSupabaseConfig: hasSupabaseAdminConfig(),
        storageBackend: hasSupabaseAdminConfig() ? "supabase" : "local-file",
      });
    }

    let dynamicCases: ClinicalCase[] | null = null;
    let deletedIds = new Set<string>();
    let backend = "local-file";

    if (hasSupabaseAdminConfig()) {
      const sbResult = await getCachedFromSupabase();
      if (sbResult) {
        if (sbResult.cases.length > 0) {
          dynamicCases = sbResult.cases;
          backend = "supabase";
        }
        sbResult.deletedIds.forEach((id) => deletedIds.add(id));
      }
    }

    if (!dynamicCases && KV_URL && KV_TOKEN) {
      const kvCases = await getFromKv();
      if (kvCases && kvCases.length > 0) {
        dynamicCases = kvCases;
        backend = "vercel-kv";
      }
      const kvDeleted = await getDeletedIdsFromKv();
      kvDeleted.forEach((id) => deletedIds.add(id));
    }

    if (!dynamicCases) {
      const localPending = await getLocalPendingCases();
      if (localPending.length > 0) {
        dynamicCases = localPending;
      }
    }

    const bundled = await getBundledCases();
    const merged = mergeCases(dynamicCases, bundled, deletedIds);

    // SECURITY: Anonymous/public users must ONLY see approved cases.
    // Unapproved (pending) community cases can contain sensitive/un-anonymized medical data
    // and must strictly only be visible to authenticated administrators.
    const adminToken = req.headers.get("x-admin-token") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const isAdmin = verifyAdminToken(adminToken);

    const filtered = isAdmin
      ? merged
      : merged.filter((c) => !c.status || c.status === "approved");

    const cacheControl = isAdmin
      ? "no-store, no-cache, must-revalidate"
      : "public, s-maxage=60, stale-while-revalidate=300";

    const payloadJson = JSON.stringify(filtered);
    const hash = crypto.createHash("sha256").update(payloadJson).digest("hex");
    const etag = `"nc-${isAdmin ? "adm" : "pub"}-${hash.slice(0, 16)}"`;

    const ifNoneMatch = req.headers.get("if-none-match");
    if (
      ifNoneMatch &&
      ifNoneMatch
        .split(",")
        .some((part) => {
          const t = part.trim().replace(/^W\//i, "");
          return t === "*" || t === etag;
        })
    ) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": cacheControl,
          "X-Storage-Backend": backend,
          "X-Total-Cases": String(filtered.length),
        },
      });
    }

    return new NextResponse(payloadJson, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ETag: etag,
        "Cache-Control": cacheControl,
        "X-Storage-Backend": backend,
        "X-Total-Cases": String(filtered.length),
      },
    });
  } catch (error) {
    console.error("Error reading cases in GET /api/neurocase:", error);
    return NextResponse.json(
      { error: "Failed to load clinical cases from server" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/neurocase
 * Supports:
 * 1. action: "verify_admin" -> verifies passcode securely, returns token
 * 2. action: "submit" -> public community submission (enforces status = 'pending')
 * 3. Admin actions (requires valid x-admin-token header):
 *    - action: "save_all" / array payload -> admin updates cases array
 *    - action: "update_status" -> admin changes status of a case
 *    - action: "delete_case" -> admin deletes a case
 */
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    if (Buffer.byteLength(rawBody, "utf8") > MAX_SUBMIT_PAYLOAD_BYTES * 4) {
      return NextResponse.json({ error: "Request payload too large." }, { status: 413 });
    }
    const body = JSON.parse(rawBody);

    // 1. Admin Verification / Login
    if (body.action === "verify_admin") {
      if (!isAdminAuthConfigured()) {
        return NextResponse.json(
          {
            success: false,
            error: "Admin authentication is not configured. Set ADMIN_PASSCODE and ADMIN_AUTH_SECRET in Environment Variables.",
          },
          { status: 503 }
        );
      }
      const passcode = typeof body.passcode === "string" ? body.passcode.trim() : "";
      if (verifyAdminPasscode(passcode)) {
        const token = generateAdminAuthToken();
        return NextResponse.json({
          success: true,
          token,
          message: "Admin authentication successful.",
        });
      }
      return NextResponse.json(
        { success: false, error: "Invalid administrator passcode." },
        { status: 401 }
      );
    }

    // Helper to get currently active cases from storage
    const fetchCurrentCases = async (): Promise<ClinicalCase[]> => {
      let dynamicCases: ClinicalCase[] | null = null;
      const deletedIds = new Set<string>();
      if (hasSupabaseAdminConfig()) {
        const sbResult = await getFromSupabase();
        if (sbResult) {
          if (sbResult.cases.length > 0) {
            dynamicCases = sbResult.cases;
          }
          sbResult.deletedIds.forEach((id) => deletedIds.add(id));
        }
      }
      if (!dynamicCases && KV_URL && KV_TOKEN) {
        dynamicCases = await getFromKv();
        const kvDeleted = await getDeletedIdsFromKv();
        kvDeleted.forEach((id) => deletedIds.add(id));
      }
      if (!dynamicCases) {
        const localPending = await getLocalPendingCases();
        if (localPending.length > 0) {
          dynamicCases = localPending;
        }
      }
      const bundled = await getBundledCases();
      return mergeCases(dynamicCases, bundled, deletedIds);
    };

    // 2. Public Community Submission (does NOT require admin token)
    if (body.action === "submit" || (body.newCase && !body.action)) {
      if (Buffer.byteLength(rawBody, "utf8") > MAX_SUBMIT_PAYLOAD_BYTES) {
        return NextResponse.json(
          { error: "Submission payload exceeds 2 MB limit." },
          { status: 413 }
        );
      }

      const normalizedCandidate = normalizeSubmissionCase(body.newCase);
      if (!normalizedCandidate) {
        return NextResponse.json(
          { error: "Invalid case submission payload." },
          { status: 400 }
        );
      }

      // SECURITY ENFORCEMENT:
      // Generates unguessable server ID, sanitizes external URLs, and locks status to 'pending'
      const safeCase = sanitizeCommunityCaseSubmission(normalizedCandidate);

      let saveResult: { success: boolean; storage: string; error?: string; warning?: string };
      if (hasSupabaseAdminConfig()) {
        const ok = await upsertSingleCaseToSupabase(safeCase);
        if (ok) revalidateNeurocaseCache();
        saveResult = ok
          ? { success: true, storage: "supabase" }
          : { success: false, storage: "supabase", error: "Failed to persist submission." };
      } else {
        const currentList = await fetchCurrentCases();
        const updatedList = [safeCase, ...currentList.filter((c) => c.id !== safeCase.id)];
        saveResult = await saveToActiveStorage(updatedList);
      }

      return NextResponse.json({
        success: saveResult.success,
        storage: saveResult.storage,
        submittedCaseId: safeCase.id,
        savedAt: new Date().toISOString(),
      });
    }

    // 3. Admin-only operations: Verify token
    const adminToken = req.headers.get("x-admin-token") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!verifyAdminToken(adminToken)) {
      return NextResponse.json(
        { error: "Unauthorized. Valid administrator token required for this action." },
        { status: 401 }
      );
    }

    // Admin Operation A: Update single case status / daily
    if (body.action === "update_status" && body.caseId && body.newStatus) {
      const currentList = await fetchCurrentCases();
      const changedCases: ClinicalCase[] = [];
      const updatedList = currentList.map((c) => {
        if (c.id === body.caseId) {
          const nextCase: ClinicalCase = {
            ...c,
            status: body.newStatus,
            is_daily_challenge: body.newStatus === "approved" ? Boolean(body.makeDaily) : false,
            archive_only: body.newStatus === "approved" ? !body.makeDaily : false,
            published_date: body.targetDailyDate || c.published_date,
          };
          changedCases.push(nextCase);
          return nextCase;
        }
        if (body.makeDaily && c.is_daily_challenge && c.published_date === body.targetDailyDate) {
          const nextCase: ClinicalCase = {
            ...c,
            is_daily_challenge: false,
            archive_only: true,
          };
          changedCases.push(nextCase);
          return nextCase;
        }
        return c;
      });

      let saveResult: { success: boolean; storage: string; error?: string; warning?: string };
      if (hasSupabaseAdminConfig() && changedCases.length > 0) {
        const sbOk = await setToSupabase(changedCases);
        if (sbOk) {
          revalidateNeurocaseCache();
          saveResult = { success: true, storage: "supabase" };
        } else {
          saveResult = await saveToActiveStorage(updatedList);
        }
      } else {
        saveResult = await saveToActiveStorage(updatedList);
      }
      return NextResponse.json({
        success: saveResult.success,
        storage: saveResult.storage,
        count: updatedList.length,
        savedAt: new Date().toISOString(),
      });
    }

    // Admin Operation B: Delete a case permanently (with tombstone so bundled cases never reappear)
    if (body.action === "delete_case" && body.caseId) {
      if (hasSupabaseAdminConfig()) {
        await recordDeletedIdInSupabase(body.caseId);
        const deletedOk = await deleteFromSupabase(body.caseId);
        revalidateNeurocaseCache();
        return NextResponse.json({
          success: deletedOk,
          storage: "supabase",
          deletedCaseId: body.caseId,
        });
      }
      if (KV_URL && KV_TOKEN) {
        await recordDeletedIdInKv(body.caseId);
      }
      const currentList = await fetchCurrentCases();
      const updatedList = currentList.filter((c) => c.id !== body.caseId);
      const saveResult = await saveToActiveStorage(updatedList);
      return NextResponse.json({
        success: saveResult.success,
        storage: saveResult.storage,
        count: updatedList.length,
        deletedCaseId: body.caseId,
      });
    }

    // Admin Operation C: Save updated cases array (moderation, full edit, batch reorder)
    let updatedCases: ClinicalCase[] = [];
    if (Array.isArray(body)) {
      updatedCases = body;
    } else if (Array.isArray(body.cases)) {
      updatedCases = body.cases;
    } else {
      return NextResponse.json(
        { error: "Invalid payload format for admin save." },
        { status: 400 }
      );
    }

    const saveResult = await saveToActiveStorage(updatedCases);
    return NextResponse.json({
      success: saveResult.success,
      storage: saveResult.storage,
      error: saveResult.error,
      warning: saveResult.warning,
      count: updatedCases.length,
      savedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error processing POST /api/neurocase:", error);
    return NextResponse.json(
      { error: "Failed to process request: " + (error?.message || String(error)) },
      { status: 500 }
    );
  }
}

