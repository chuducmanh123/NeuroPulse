import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { parseNotebookLMContent } from "@/lib/neuroguide/notebooklmParser";
import { extractTextFromDocument } from "@/lib/neuroguide/documentParser";
import { registerCandidateGuideline } from "@/lib/neuroguide/storeAdapter";
import {
  loadMergedNeuroGuideData,
  saveNeuroGuideToActiveStorage,
  mergeGuidelines,
  normalizeGuidelineTitle,
} from "@/lib/neuroguide/guidelineStorage";
import { SubspecialtyType } from "@/types/neuroguide";
import { verifyAdminToken } from "@/utils/security";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "ready",
    description: "NotebookLM Guideline Ingestion API for NeuroGuide",
    supportedFormats: [
      ".md (Markdown)",
      ".txt (Plain Text)",
      ".csv (CSV Table)",
      ".docx (Word Document)",
      ".doc (Legacy Word)",
      ".pdf (PDF Document)",
      "Raw Text / Clipboard",
    ],
    features: [
      "Dynamic Markdown table parsing with flexible columns",
      "COR (Class of Recommendation) & LOE (Level of Evidence) extraction",
      "Automatic Landmark Trial & Cited Study parsing",
      "Top 10 Take-Home messages synthesis",
      "Bilingual Executive Summary (English + Vietnamese)",
      "Direct integration into NeuroGuide Active Library & Review Queue",
    ],
  });
}

export async function POST(request: NextRequest) {
  try {
    const adminToken = request.headers.get("x-admin-token") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!verifyAdminToken(adminToken)) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized. Valid administrator token required for NotebookLM ingestion." },
        { status: 401 }
      );
    }

    let rawText = "";
    let fileName: string | undefined = undefined;
    let society: string | undefined = undefined;
    let year: number | undefined = undefined;
    let title: string | undefined = undefined;
    let subspecialty: SubspecialtyType | undefined = undefined;

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      society = (formData.get("society") as string) || undefined;
      title = (formData.get("title") as string) || undefined;
      const yearStr = formData.get("year") as string;
      if (yearStr) year = parseInt(yearStr, 10);
      const sub = formData.get("subspecialty") as string;
      if (sub) subspecialty = sub as SubspecialtyType;

      const textField = formData.get("text") as string;
      if (textField && textField.trim()) {
        rawText = textField.trim();
      }

      const file = formData.get("file") as File | null;
      if (file && file.size > 0) {
        fileName = file.name;
        const arrayBuf = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        const { text } = await extractTextFromDocument(buffer, file.name);
        if (text && text.trim()) {
          rawText = text.trim();
        }
      }
    } else {
      const body = await request.json().catch(() => ({}));
      rawText = (body.text || "").trim();
      fileName = body.fileName;
      society = body.society;
      if (body.year) year = parseInt(String(body.year), 10);
      title = body.title;
      subspecialty = body.subspecialty;
    }

    if (!rawText || rawText.length < 20) {
      return NextResponse.json(
        {
          ok: false,
          error: "Vui lòng tải lên tệp tin (.md, .txt, .docx, .doc, .pdf) hoặc dán nội dung tóm tắt từ NotebookLM.",
        },
        { status: 400 }
      );
    }

    // Tải cơ sở dữ liệu hiện hành trước để kiểm tra trùng lặp và thu thập các ID đã dùng/đã xóa
    const currentStore = await loadMergedNeuroGuideData();

    // Thu thập danh sách ID và Tiêu đề đang hoạt động (active) cũng như đã từng xóa (deleted)
    const existingActiveIds = new Set<string>();
    const activeNormTitles = new Map<string, (typeof currentStore.guidelines)[0]>();
    const activeTrimTitles = new Map<string, (typeof currentStore.guidelines)[0]>();

    for (const g of currentStore.guidelines) {
      if (g.id) existingActiveIds.add(g.id.toLowerCase().trim());
      if (g.title) {
        activeNormTitles.set(normalizeGuidelineTitle(g.title), g);
        activeTrimTitles.set(g.title.trim().toLowerCase(), g);
      }
    }

    const allExcludedIds = new Set<string>([
      ...existingActiveIds,
      ...(currentStore.deletedGuidelineIds || []).map((x) => x.toLowerCase().trim()),
    ]);

    // Parse tài liệu với bộ ID loại trừ để đảm bảo doc.id không trùng với guideline có sẵn hay guideline đã từng xóa
    const { doc, stats } = parseNotebookLMContent(rawText, {
      title,
      society,
      year,
      subspecialty,
      existingOrDeletedIds: allExcludedIds,
    });

    if (stats.totalRecommendations === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Không tìm thấy bảng hoặc khối khuyến cáo hợp lệ trong tài liệu. Vui lòng kiểm tra định dạng bảng Markdown hoặc danh sách khuyến cáo.",
        },
        { status: 422 }
      );
    }

    // KIỂM TRA TRÙNG HOÀN TOÀN VỚI TÊN GUIDELINE CÓ SẴN (BÁO TRÙNG - TUYỆT ĐỐI KHÔNG TỰ ĐỘNG GỘP HOẶC ẨN)
    const candNormTitle = normalizeGuidelineTitle(doc.title);
    const candTrimTitle = (doc.title || "").trim().toLowerCase();

    const existingMatch = activeNormTitles.get(candNormTitle) || activeTrimTitles.get(candTrimTitle);
    if (existingMatch) {
      return NextResponse.json(
        {
          ok: false,
          duplicate: true,
          error: `Phát hiện guideline trùng hoàn toàn với guideline đã có sẵn: "${existingMatch.title}" (ID: "${existingMatch.id}", Năm: ${existingMatch.year}). Hệ thống không tự ý gộp khuyến cáo hoặc ẩn tài liệu hiện có. Vui lòng kiểm tra lại hoặc đổi tên/năm tài liệu trước khi tải lên.`,
          existingGuideline: {
            id: existingMatch.id,
            title: existingMatch.title,
            year: existingMatch.year,
            society: existingMatch.society,
            recommendationsCount: existingMatch.allPracticeChanges?.length || 0,
          },
        },
        { status: 409 }
      );
    }

    // 1. Lưu vào guidelines_store ở trạng thái đã phê duyệt (APPROVED) để đồng nhất với Active Storage
    await registerCandidateGuideline(doc, { approved: true });

    // 2. Đồng bộ vào Active Storage (Supabase / Local Disk)
    const allGuidelines = mergeGuidelines([doc], currentStore.guidelines);

    // Xóa sạch mọi key/alias/title liên quan đến doc mới khỏi deletedGuidelineIds để đảm bảo không bị ẩn
    const cleanDeleted = (currentStore.deletedGuidelineIds || []).filter((d) => {
      const lowerD = (d || "").toLowerCase().trim();
      return lowerD !== doc.id.toLowerCase() && lowerD !== candNormTitle && lowerD !== candTrimTitle;
    });

    const saveResult = await saveNeuroGuideToActiveStorage({
      guidelines: allGuidelines,
      conferences: currentStore.conferences,
      scenarios: currentStore.scenarios,
      deletedGuidelineIds: cleanDeleted,
    });

    try {
      revalidatePath("/neuroguide");
      revalidatePath("/admin");
      revalidatePath("/api/neuroguide/sync-guidelines");
      revalidatePath("/api/neuroguide/review-queue");
      revalidatePath("/api/neuroguide/version");
    } catch {}

    return NextResponse.json({
      ok: true,
      status: "success",
      sourceFilename: fileName,
      guideline: doc,
      stats,
      storageBackend: saveResult.storage,
      message: `Đã tự động tạo thành công Practice Guideline "${doc.title}" với ${stats.totalRecommendations} khuyến cáo lâm sàng!`,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    console.error("Error in POST /api/neuroguide/import-notebooklm:", error);
    return NextResponse.json(
      {
        ok: false,
        error: `Lỗi xử lý tài liệu NotebookLM: ${msg}`,
      },
      { status: 500 }
    );
  }
}
