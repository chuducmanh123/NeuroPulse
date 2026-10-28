import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { put, list } from "@vercel/blob";
import { ClinicalCase } from "@/types/clinicalCase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CASES_FILE_PATH = path.join(process.cwd(), "public", "data", "cases.json");

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const KV_KEY = "neurocase_custom_cases_v1";

// Secure Admin Passcode: defaults to "@neuro2026" if not set in environment variables
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || "@neuro2026";

/**
 * Creates a deterministic authentication token for admin authorization based on secret & server salt.
 */
function generateAdminAuthToken(): string {
  const secret = process.env.ADMIN_AUTH_SECRET || "neuropulse-neurocase-auth-secret-key-2026";
  return crypto.createHmac("sha256", secret).update(ADMIN_PASSCODE).digest("hex");
}

function verifyAdminToken(token: string | null | undefined): boolean {
  if (!token) return false;
  const expected = generateAdminAuthToken();
  if (token.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

// ==========================================
// 1. VERCEL BLOB STORAGE (100% Free on Hobby: 500 MB)
// Supports both modern OIDC (BLOB_STORE_ID) and static token (BLOB_READ_WRITE_TOKEN)
// ==========================================
function cleanBlobToken(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  // 1. Try to extract exact vercel_blob_rw token if present anywhere in the string
  const match = raw.match(/vercel_blob_rw_[a-zA-Z0-9_\-]+/);
  if (match) {
    return match[0].trim();
  }
  // 2. Strip quotes, newlines, carriage returns, tabs, leading variable assignment
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
  // Always sanitize in-memory environment variables to prevent @vercel/blob from crashing on newlines
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

function hasBlobConfig(): boolean {
  return Boolean(
    getBlobStoreId() ||
    getBlobToken().token
  );
}

async function getFromBlob(): Promise<ClinicalCase[] | null> {
  if (!hasBlobConfig()) return null;
  const { token } = getBlobToken();
  const listOptions = token ? { prefix: "cases.json", token } : { prefix: "cases.json" };
  try {
    const { blobs } = await list(listOptions);
    if (!blobs || blobs.length === 0) return null;
    const latestBlob = blobs[0];
    const res = await fetch(latestBlob.url, { cache: "no-store" });
    if (!res.ok) return null;
    const cases: ClinicalCase[] = await res.json();
    return Array.isArray(cases) ? cases : null;
  } catch (e) {
    console.error("Vercel Blob read error:", e);
    return null;
  }
}

async function setToBlob(cases: ClinicalCase[]): Promise<{ ok: boolean; error?: string }> {
  if (!hasBlobConfig()) return { ok: false, error: "No blob configuration detected." };
  const { token } = getBlobToken();
  try {
    const jsonStr = JSON.stringify(cases, null, 2);
    const putOptions: any = {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    };
    if (token) putOptions.token = token;
    await put("cases.json", jsonStr, putOptions);
    return { ok: true };
  } catch (e: any) {
    console.error("Vercel Blob write error:", e);
    return { ok: false, error: e?.message || String(e) };
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

/**
 * Merges dynamic store cases (Blob / KV) with repo-bundled cases.
 * Priority: Dynamic store overrides repo cases by ID (so admin edits/moderation persist),
 * but any new cases generated by GitHub Actions bot in repo cases.json that are missing
 * from the dynamic store are seamlessly included!
 */
function mergeCases(dynamicCases: ClinicalCase[] | null, bundledCases: ClinicalCase[]): ClinicalCase[] {
  if (!dynamicCases || dynamicCases.length === 0) return bundledCases;
  if (!bundledCases || bundledCases.length === 0) return dynamicCases;

  const dynamicIdMap = new Map<string, ClinicalCase>();
  dynamicCases.forEach((c) => dynamicIdMap.set(c.id, c));

  const result: ClinicalCase[] = [...dynamicCases];
  for (const bCase of bundledCases) {
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
  // 1. Try Vercel Blob
  if (hasBlobConfig()) {
    const blobRes = await setToBlob(cases);
    if (blobRes.ok) {
      return { success: true, storage: "vercel-blob" };
    }
    return {
      success: false,
      storage: "vercel-blob-failed",
      error: blobRes.error,
      warning: "Vercel Blob write failed: " + blobRes.error,
    };
  }

  // 2. Try Vercel KV
  if (KV_URL && KV_TOKEN) {
    const kvOk = await setToKv(cases);
    if (kvOk) {
      return { success: true, storage: "vercel-kv" };
    }
  }

  // 3. Fall back to local disk (dev environment)
  try {
    await fs.writeFile(CASES_FILE_PATH, JSON.stringify(cases, null, 2), "utf-8");
    return { success: true, storage: "local-file" };
  } catch (fsErr: any) {
    if (fsErr?.code === "EROFS" || process.env.VERCEL) {
      return {
        success: false,
        storage: "vercel-readonly",
        warning: "Vercel filesystem is read-only. Connect Vercel Blob in Vercel Storage to persist changes.",
      };
    }
    throw fsErr;
  }
}

/**
 * GET /api/neurocase
 * Hybrid merge: combines remote Blob/KV dynamic store with repo bundled cases.json
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

      const { keyName, token } = getBlobToken();
      const storageKeys = Object.keys(process.env).filter(
        (k) =>
          k.includes("BLOB") ||
          k.includes("KV") ||
          k.includes("TOKEN") ||
          k.includes("STORAGE")
      );
      return NextResponse.json({
        isVercel: Boolean(process.env.VERCEL),
        hasBlobConfig: hasBlobConfig(),
        blobStoreId: process.env.BLOB_STORE_ID || null,
        blobTokenFound: Boolean(token),
        matchedKey: keyName || null,
        availableStorageKeys: storageKeys,
      });
    }

    const [blobCases, kvCases, bundled] = await Promise.all([
      getFromBlob(),
      getFromKv(),
      getBundledCases(),
    ]);

    const dynamicCases = (blobCases && blobCases.length > 0) ? blobCases : kvCases;
    const backend = blobCases && blobCases.length > 0 ? "vercel-blob" : kvCases && kvCases.length > 0 ? "vercel-kv" : "local-file";

    const merged = mergeCases(dynamicCases, bundled);

    return NextResponse.json(merged, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Storage-Backend": backend,
        "X-Total-Cases": String(merged.length),
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
    const body = await req.json();

    // 1. Admin Verification / Login
    if (body.action === "verify_admin") {
      const passcode = typeof body.passcode === "string" ? body.passcode.trim() : "";
      if (passcode === ADMIN_PASSCODE.trim()) {
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
      const [blobCases, kvCases, bundled] = await Promise.all([
        getFromBlob(),
        getFromKv(),
        getBundledCases(),
      ]);
      const dynamicCases = (blobCases && blobCases.length > 0) ? blobCases : kvCases;
      return mergeCases(dynamicCases, bundled);
    };

    // 2. Public Community Submission (does NOT require admin token)
    if (body.action === "submit" || (body.newCase && !body.action)) {
      const candidate: ClinicalCase = body.newCase;
      if (!candidate || !candidate.id || !candidate.presentation?.chief_complaint) {
        return NextResponse.json(
          { error: "Invalid case submission payload." },
          { status: 400 }
        );
      }

      // Security enforcement: all community submissions are locked to 'pending' status
      const safeCase: ClinicalCase = {
        ...candidate,
        status: "pending",
        is_daily_challenge: false,
        archive_only: false,
      };

      const currentList = await fetchCurrentCases();
      const updatedList = [safeCase, ...currentList.filter((c) => c.id !== safeCase.id)];

      const saveResult = await saveToActiveStorage(updatedList);
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
      const updatedList = currentList.map((c) => {
        if (c.id === body.caseId) {
          return {
            ...c,
            status: body.newStatus,
            is_daily_challenge: body.newStatus === "approved" ? Boolean(body.makeDaily) : false,
            archive_only: body.newStatus === "approved" ? !body.makeDaily : false,
            published_date: body.targetDailyDate || c.published_date,
          };
        }
        if (body.makeDaily && c.is_daily_challenge && c.published_date === body.targetDailyDate) {
          return { ...c, is_daily_challenge: false, archive_only: true };
        }
        return c;
      });

      const saveResult = await saveToActiveStorage(updatedList);
      return NextResponse.json({
        success: saveResult.success,
        storage: saveResult.storage,
        count: updatedList.length,
        savedAt: new Date().toISOString(),
      });
    }

    // Admin Operation B: Delete a case
    if (body.action === "delete_case" && body.caseId) {
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

