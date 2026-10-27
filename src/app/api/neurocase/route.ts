import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { put, list } from "@vercel/blob";
import { ClinicalCase } from "@/types/clinicalCase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CASES_FILE_PATH = path.join(process.cwd(), "public", "data", "cases.json");

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const KV_KEY = "neurocase_custom_cases_v1";

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

/**
 * GET /api/neurocase
 * Checks Vercel Blob first, then Vercel KV, then local bundled cases.json.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    if (url.searchParams.get("debug") === "1") {
      const { keyName, token } = getBlobToken();
      const storageKeys = Object.keys(process.env).filter(
        (k) =>
          k.includes("BLOB") ||
          k.includes("KV") ||
          k.includes("TOKEN") ||
          k.includes("STORAGE") ||
          k.toUpperCase().includes("NEUROPULSE")
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

    // 1. Try Vercel Blob
    const blobCases = await getFromBlob();
    if (blobCases && blobCases.length > 0) {
      return NextResponse.json(blobCases, {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "X-Storage-Backend": "vercel-blob",
        },
      });
    }

    // 2. Try Vercel KV
    const kvCases = await getFromKv();
    if (kvCases && kvCases.length > 0) {
      return NextResponse.json(kvCases, {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "X-Storage-Backend": "vercel-kv",
        },
      });
    }

    // 3. Fall back to reading bundled cases.json
    const raw = await fs.readFile(CASES_FILE_PATH, "utf-8");
    const cases: ClinicalCase[] = JSON.parse(raw);
    return NextResponse.json(cases, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Storage-Backend": "local-file",
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
 * Persists updated cases.
 * Priority: Vercel Blob -> Vercel KV -> Local Disk (dev).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    let updatedCases: ClinicalCase[] = [];

    if (Array.isArray(body)) {
      updatedCases = body;
    } else if (Array.isArray(body.cases)) {
      updatedCases = body.cases;
    } else if (body.newCase) {
      // Single case submission append
      let currentList: ClinicalCase[] = [];
      const blobCases = await getFromBlob();
      if (blobCases && blobCases.length > 0) {
        currentList = blobCases;
      } else {
        const kvCases = await getFromKv();
        if (kvCases && kvCases.length > 0) {
          currentList = kvCases;
        } else {
          const raw = await fs.readFile(CASES_FILE_PATH, "utf-8");
          currentList = JSON.parse(raw);
        }
      }
      updatedCases = [body.newCase, ...currentList.filter((c) => c.id !== body.newCase.id)];
    } else {
      return NextResponse.json(
        { error: "Invalid payload format. Expected { cases: ClinicalCase[] }" },
        { status: 400 }
      );
    }

    // 1. If Vercel Blob is configured (via BLOB_STORE_ID or BLOB_READ_WRITE_TOKEN)
    if (hasBlobConfig()) {
      const blobRes = await setToBlob(updatedCases);
      if (blobRes.ok) {
        return NextResponse.json(
          {
            success: true,
            storage: "vercel-blob",
            authType: getBlobToken().token ? "static-token" : "oidc-store-id",
            count: updatedCases.length,
            savedAt: new Date().toISOString(),
          },
          { status: 200 }
        );
      } else {
        return NextResponse.json(
          {
            success: false,
            storage: "vercel-blob-failed",
            error: blobRes.error,
            warning:
              "Vercel Blob write failed: " +
              blobRes.error +
              ". To fix: Copy BLOB_READ_WRITE_TOKEN from your Blob Store .env.local tab and paste it into Project Settings -> Environment Variables.",
          },
          { status: 200 }
        );
      }
    }

    // 2. If Vercel KV is configured (KV_REST_API_URL & KV_REST_API_TOKEN)
    if (KV_URL && KV_TOKEN) {
      const kvOk = await setToKv(updatedCases);
      if (kvOk) {
        return NextResponse.json(
          {
            success: true,
            storage: "vercel-kv",
            count: updatedCases.length,
            savedAt: new Date().toISOString(),
          },
          { status: 200 }
        );
      }
    }

    // 3. Attempt writing to local disk (works in local dev / self-hosted node)
    try {
      await fs.writeFile(CASES_FILE_PATH, JSON.stringify(updatedCases, null, 2), "utf-8");
      return NextResponse.json(
        {
          success: true,
          storage: "local-file",
          count: updatedCases.length,
          savedAt: new Date().toISOString(),
        },
        { status: 200 }
      );
    } catch (fsErr: any) {
      // On Vercel without Blob/KV, filesystem is read-only (EROFS)
      if (fsErr?.code === "EROFS" || process.env.VERCEL) {
        return NextResponse.json(
          {
            success: false,
            storage: "vercel-readonly",
            warning:
              "Vercel filesystem is read-only. Data is preserved in this browser. To sync across all devices permanently on Vercel, connect free Vercel Blob in Vercel Dashboard -> Storage -> Blob.",
            count: updatedCases.length,
          },
          { status: 200 }
        );
      }
      throw fsErr;
    }
  } catch (error) {
    console.error("Error writing cases in POST /api/neurocase:", error);
    return NextResponse.json(
      { error: "Failed to persist clinical cases to server" },
      { status: 500 }
    );
  }
}
