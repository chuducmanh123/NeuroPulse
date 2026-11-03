import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { loadMergedNeuroGuideData } from "@/lib/neuroguide/guidelineStorage";

export const dynamic = "force-dynamic";

/**
 * GET /api/neuroguide/version
 * Ultra-lightweight endpoint (~150 bytes) for SWR freshness verification.
 * Allows client to verify data freshness in milliseconds without downloading 300KB+ payloads.
 */
export async function GET() {
  try {
    const CLOUD_JSON = path.join(process.cwd(), "public", "data", "neuroguide_cloud.json");
    let localDeletedIds: string[] = [];
    let cloudLastSynced = "";
    let cloudCount = 0;

    if (fs.existsSync(CLOUD_JSON)) {
      try {
        const raw = fs.readFileSync(CLOUD_JSON, "utf-8");
        const cloudData = JSON.parse(raw);
        localDeletedIds = cloudData.deletedGuidelineIds || cloudData.deleted_guideline_ids || [];
        cloudLastSynced = cloudData.lastSyncedAt || "";
        cloudCount = Array.isArray(cloudData.guidelines) ? cloudData.guidelines.length : 0;
      } catch {}
    }

    const mergedData = await loadMergedNeuroGuideData();
    const version = mergedData.lastSyncedAt || cloudLastSynced || new Date().toISOString();
    const rawDeletedGuidelineIds = Array.from(
      new Set([
        ...(mergedData.deletedGuidelineIds || []).map((x) => x.toLowerCase().trim()),
        ...localDeletedIds.map((x) => x.toLowerCase().trim()),
      ])
    );

    // Tuyệt đối không gửi ID/tiêu đề của guideline đang active/approved vào deletedGuidelineIds
    const activeDocKeys = new Set<string>();
    mergedData.guidelines.forEach((g) => {
      if (g.id) activeDocKeys.add(g.id.toLowerCase().trim());
      if (g.title) activeDocKeys.add(g.title.toLowerCase().replace(/[^a-z0-9]/g, ""));
    });
    const deletedGuidelineIds = rawDeletedGuidelineIds.filter((d) => !activeDocKeys.has(d.toLowerCase().trim()));

    const count = mergedData.guidelines.length || cloudCount;

    return NextResponse.json(
      {
        status: "success",
        version,
        totalGuidelines: count,
        totalConferences: mergedData.conferences?.length || 0,
        deletedGuidelineIds,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ status: "error", error: message }, { status: 500 });
  }
}
