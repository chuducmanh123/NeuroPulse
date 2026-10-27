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
// ==========================================
async function getFromBlob(): Promise<ClinicalCase[] | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const { blobs } = await list({ prefix: "cases.json" });
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

async function setToBlob(cases: ClinicalCase[]): Promise<boolean> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return false;
  try {
    const jsonStr = JSON.stringify(cases, null, 2);
    await put("cases.json", jsonStr, {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
    });
    return true;
  } catch (e) {
    console.error("Vercel Blob write error:", e);
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

/**
 * GET /api/neurocase
 * Checks Vercel Blob first, then Vercel KV, then local bundled cases.json.
 */
export async function GET() {
  try {
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

    // 1. If Vercel Blob is configured (BLOB_READ_WRITE_TOKEN)
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blobOk = await setToBlob(updatedCases);
      if (blobOk) {
        return NextResponse.json(
          {
            success: true,
            storage: "vercel-blob",
            count: updatedCases.length,
            savedAt: new Date().toISOString(),
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
