import { NextRequest, NextResponse } from "next/server";
import { parseNotebookLMContent } from "@/lib/neuroguide/notebooklmParser";
import { registerCandidateGuideline } from "@/lib/neuroguide/storeAdapter";
import {
  loadMergedNeuroGuideData,
  saveNeuroGuideToActiveStorage,
  mergeGuidelines,
} from "@/lib/neuroguide/blobStorage";
import { SubspecialtyType } from "@/types/neuroguide";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "ready",
    description: "NotebookLM Guideline Ingestion API for NeuroGuide",
    supportedFormats: [".md (Markdown)", ".txt (Plain Text)", ".csv (CSV Table)", "Raw Text / Clipboard"],
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
        // Decode buffer as UTF-8 string
        const fileContent = buffer.toString("utf-8");
        if (fileContent.trim()) {
          rawText = fileContent.trim();
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
          error: "Vui lòng tải lên tệp tin (.md, .txt) hoặc dán nội dung tóm tắt từ NotebookLM.",
        },
        { status: 400 }
      );
    }

    // Parse the document using our high-fidelity deterministic engine
    const { doc, stats } = parseNotebookLMContent(rawText, {
      title,
      society,
      year,
      subspecialty,
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

    // 1. Lưu vào Hàng đợi Điều phối & guidelines_store
    await registerCandidateGuideline(doc);

    // 2. Tải cơ sở dữ liệu hiện hành và đồng bộ vào Active Storage (Vercel Blob / Local Disk)
    const currentStore = await loadMergedNeuroGuideData();
    const allGuidelines = mergeGuidelines([doc], currentStore.guidelines);

    const saveResult = await saveNeuroGuideToActiveStorage({
      guidelines: allGuidelines,
      conferences: currentStore.conferences,
      scenarios: currentStore.scenarios,
    });

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
