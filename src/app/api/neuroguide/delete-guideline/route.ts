import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { loadMergedNeuroGuideData, saveNeuroGuideToActiveStorage } from "@/lib/neuroguide/blobStorage";

export const dynamic = "force-dynamic";

const STORE_DIR = path.join(process.cwd(), "data", "guidelines_store");
const TMP_DIR = path.join("/tmp", "guidelines_store");
const CLOUD_JSON = path.join(process.cwd(), "public", "data", "neuroguide_cloud.json");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { guideline_id } = body;

    if (!guideline_id || typeof guideline_id !== "string") {
      return NextResponse.json({ ok: false, error: "Thiếu guideline_id cần xóa" }, { status: 400 });
    }

    const normTarget = guideline_id.toLowerCase().trim();

    // 1. Đọc và lọc trong active library (neuroguide_cloud.json và Vercel Blob)
    const activeData = await loadMergedNeuroGuideData();
    const prevCount = activeData.guidelines.length;
    const remainingGuidelines = activeData.guidelines.filter((g) => {
      const gId = (g.id || "").toLowerCase().trim();
      return gId !== normTarget;
    });

    // 2. Ghi nhận ID đã xóa để chống hồi sinh khi nạp baseline
    let deletedIds: string[] = [normTarget];
    if (fs.existsSync(CLOUD_JSON)) {
      try {
        const raw = fs.readFileSync(CLOUD_JSON, "utf-8");
        const cloudData = JSON.parse(raw);
        if (Array.isArray(cloudData.guidelines)) {
          cloudData.guidelines = cloudData.guidelines.filter(
            (g: any) => (g.id || "").toLowerCase().trim() !== normTarget
          );
        }
        const existingDeleted: string[] = Array.isArray(cloudData.deletedGuidelineIds)
          ? cloudData.deletedGuidelineIds
          : Array.isArray(cloudData.deleted_guideline_ids)
          ? cloudData.deleted_guideline_ids
          : [];
        deletedIds = Array.from(new Set([...existingDeleted.map((x) => x.toLowerCase()), normTarget]));
        cloudData.deletedGuidelineIds = deletedIds;
        cloudData.deleted_guideline_ids = deletedIds;
        fs.writeFileSync(CLOUD_JSON, JSON.stringify(cloudData, null, 2), "utf-8");
      } catch (err) {
        console.warn("Lỗi cập nhật public/data/neuroguide_cloud.json:", err);
      }
    }

    await saveNeuroGuideToActiveStorage({
      guidelines: remainingGuidelines,
      conferences: activeData.conferences,
      scenarios: activeData.scenarios,
      deletedGuidelineIds: deletedIds,
    });

    // 3. Xóa khỏi kho guidelines_store (STORE_DIR, TMP_DIR, catalog.json)
    for (const dir of [TMP_DIR, STORE_DIR]) {
      if (fs.existsSync(dir)) {
        try {
          const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
          for (const f of files) {
            const fullPath = path.join(dir, f);
            if (f === "catalog.json") {
              try {
                const catalog = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
                let changed = false;
                for (const k of Object.keys(catalog)) {
                  if (k.toLowerCase() === normTarget || (catalog[k]?.guideline_id || "").toLowerCase() === normTarget) {
                    delete catalog[k];
                    changed = true;
                  }
                }
                if (changed) {
                  fs.writeFileSync(fullPath, JSON.stringify(catalog, null, 2), "utf-8");
                }
              } catch {}
            } else if (f.endsWith("_latest.json") || f.endsWith("_v1.json") || f.endsWith("_v2.json") || f.endsWith("_v3.json")) {
              try {
                const content = fs.readFileSync(fullPath, "utf-8");
                const data = JSON.parse(content);
                const fileGId = (data.guideline_id || "").toLowerCase();
                const cleanFileName = f.replace(/_latest\.json$/i, "").toLowerCase();
                if (fileGId === normTarget || cleanFileName === normTarget || cleanFileName.startsWith(normTarget)) {
                  fs.unlinkSync(fullPath);
                }
              } catch {}
            }
          }
        } catch {}
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Đã xóa thành công guideline "${guideline_id}".`,
      removed: prevCount - remainingGuidelines.length,
    });
  } catch (error: any) {
    const message = error instanceof Error ? error.message : "Lỗi hệ thống khi xóa guideline";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  return POST(request);
}
