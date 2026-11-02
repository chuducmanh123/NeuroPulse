import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { loadMergedNeuroGuideData, saveNeuroGuideToActiveStorage } from "@/lib/neuroguide/blobStorage";
import { MOCK_GUIDELINE_DOCS } from "@/data/neuroguideMockData";

export const dynamic = "force-dynamic";

const STORE_DIR = path.join(process.cwd(), "data", "guidelines_store");
const TMP_DIR = path.join("/tmp", "guidelines_store");
const CLOUD_JSON = path.join(process.cwd(), "public", "data", "neuroguide_cloud.json");

function normalizeTitle(t?: string): string {
  return (t || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { guideline_id, title } = body;

    if (!guideline_id || typeof guideline_id !== "string") {
      return NextResponse.json({ ok: false, error: "Thiếu guideline_id cần xóa" }, { status: 400 });
    }

    const normTarget = guideline_id.toLowerCase().trim();
    let normTitle = normalizeTitle(title);

    // 1. Đọc active library để đối chiếu tài liệu và tiêu đề
    const activeData = await loadMergedNeuroGuideData();
    const prevCount = activeData.guidelines.length;

    // Tìm tiêu đề nếu chưa được truyền vào
    if (!normTitle) {
      const matched = activeData.guidelines.find((g) => (g.id || "").toLowerCase().trim() === normTarget);
      if (matched && matched.title) {
        normTitle = normalizeTitle(matched.title);
      } else {
        const mockMatch = MOCK_GUIDELINE_DOCS.find((g) => (g.id || "").toLowerCase().trim() === normTarget);
        if (mockMatch && mockMatch.title) {
          normTitle = normalizeTitle(mockMatch.title);
        }
      }
    }

    // Tập hợp toàn bộ ID và alias liên quan đến guideline này
    const allDeletedIds = new Set<string>([normTarget]);
    if (normTitle) {
      allDeletedIds.add(normTitle);
      activeData.guidelines.forEach((g) => {
        if (normalizeTitle(g.title) === normTitle) {
          allDeletedIds.add((g.id || "").toLowerCase().trim());
        }
      });
      MOCK_GUIDELINE_DOCS.forEach((g) => {
        if (normalizeTitle(g.title) === normTitle) {
          allDeletedIds.add((g.id || "").toLowerCase().trim());
        }
      });
    }

    // Thêm các cặp alias thông dụng nếu có
    if (normTarget === "aha-ais-2026" || normTarget === "aha2026_test") {
      allDeletedIds.add("aha-ais-2026");
      allDeletedIds.add("aha2026_test");
    }

    const isMatchTarget = (id?: string, gTitle?: string): boolean => {
      const gId = (id || "").toLowerCase().trim();
      if (gId && allDeletedIds.has(gId)) return true;
      if (gTitle && normTitle && normalizeTitle(gTitle) === normTitle) return true;
      return false;
    };

    // Lọc khỏi active library
    const remainingGuidelines = activeData.guidelines.filter((g) => !isMatchTarget(g.id, g.title));

    // 2. Ghi nhận ID & Title đã xóa vào public/data/neuroguide_cloud.json và active storage (Vercel Blob)
    let mergedDeletedList: string[] = Array.from(
      new Set([
        ...(activeData.deletedGuidelineIds || []).map((x) => x.toLowerCase()),
        ...allDeletedIds,
      ])
    );
    if (fs.existsSync(CLOUD_JSON)) {
      try {
        const raw = fs.readFileSync(CLOUD_JSON, "utf-8");
        const cloudData = JSON.parse(raw);
        if (Array.isArray(cloudData.guidelines)) {
          cloudData.guidelines = cloudData.guidelines.filter(
            (g: any) => !isMatchTarget(g.id, g.title)
          );
        }
        const existingDeleted: string[] = Array.isArray(cloudData.deletedGuidelineIds)
          ? cloudData.deletedGuidelineIds
          : Array.isArray(cloudData.deleted_guideline_ids)
          ? cloudData.deleted_guideline_ids
          : [];
        mergedDeletedList = Array.from(
          new Set([
            ...mergedDeletedList,
            ...existingDeleted.map((x) => x.toLowerCase()),
            ...allDeletedIds,
          ])
        );
        cloudData.deletedGuidelineIds = mergedDeletedList;
        cloudData.deleted_guideline_ids = mergedDeletedList;
        fs.writeFileSync(CLOUD_JSON, JSON.stringify(cloudData, null, 2), "utf-8");
      } catch (err) {
        console.warn("Lỗi cập nhật public/data/neuroguide_cloud.json:", err);
      }
    }

    await saveNeuroGuideToActiveStorage({
      guidelines: remainingGuidelines,
      conferences: activeData.conferences,
      scenarios: activeData.scenarios,
      deletedGuidelineIds: mergedDeletedList,
    });

    // 3. Xóa khỏi Vercel Blob (guidelines_store/) để mọi thiết bị đều đồng bộ tức thời
    try {
      const rawToken = process.env.BLOB_READ_WRITE_TOKEN;
      const tokenMatch = rawToken?.match(/vercel_blob_rw_[a-zA-Z0-9_\-]+/);
      const token = tokenMatch ? tokenMatch[0].trim() : undefined;
      if (token) {
        const { list, del } = await import("@vercel/blob");
        const { blobs } = await list({ prefix: "guidelines_store/", token });
        for (const b of blobs) {
          const fileName = b.pathname.replace(/^guidelines_store\//, "");
          const cleanFileName = fileName.replace(/_latest\.json$/i, "").toLowerCase();
          if (allDeletedIds.has(cleanFileName)) {
            await del(b.url, { token }).catch(() => {});
          }
        }
      }
    } catch {}

    // 3. Xóa triệt để khỏi kho guidelines_store (STORE_DIR, TMP_DIR, catalog.json)
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
                  const entry = catalog[k];
                  const entryId = (entry?.guideline_id || k).toLowerCase();
                  const entryTitle = entry?.title || "";
                  if (allDeletedIds.has(k.toLowerCase()) || allDeletedIds.has(entryId) || (normTitle && normalizeTitle(entryTitle) === normTitle)) {
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
                const docTitle = data.metadata?.title || data.title || "";
                if (
                  allDeletedIds.has(fileGId) ||
                  allDeletedIds.has(cleanFileName) ||
                  (normTitle && normalizeTitle(docTitle) === normTitle)
                ) {
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
      deletedGuidelineIds: mergedDeletedList,
    });
  } catch (error: any) {
    const message = error instanceof Error ? error.message : "Lỗi hệ thống khi xóa guideline";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  return POST(request);
}
