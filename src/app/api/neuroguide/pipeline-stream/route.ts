import { NextRequest, NextResponse } from "next/server";
import { executeIncrementalPipeline, IncrementalProgressEvent } from "@/lib/neuroguide/incrementalExtractor";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let blob_url: string | undefined;
  let fileName: string = "guideline.pdf";
  let society: string = "AHA";
  let title: string | undefined;
  let year: number | undefined;
  let directBuffer: Buffer | null = null;

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    society = (formData.get("society") as string) || "AHA";
    title = (formData.get("title") as string) || undefined;
    blob_url = (formData.get("blob_url") as string) || undefined;
    const yearStr = formData.get("year") as string;
    if (yearStr) year = parseInt(yearStr, 10);

    const file = formData.get("file") as File | null;
    if (file && file.size > 0) {
      fileName = file.name;
      directBuffer = Buffer.from(await file.arrayBuffer());
    }
  } else {
    try {
      const body = await request.json();
      blob_url = body.blob_url;
      fileName = body.fileName || "guideline.pdf";
      society = body.society || "AHA";
      title = body.title;
      year = body.year;
    } catch {}
  }

  // Chuẩn bị dữ liệu PDF
  let pdfBuffer: Buffer | null = directBuffer;

  if (!pdfBuffer && blob_url) {
    try {
      const res = await fetch(blob_url);
      if (!res.ok) {
        return NextResponse.json(
          { ok: false, error: `Không thể đọc dữ liệu file từ Vercel Blob (HTTP ${res.status})` },
          { status: 400 }
        );
      }
      pdfBuffer = Buffer.from(await res.arrayBuffer());
    } catch (fetchErr) {
      return NextResponse.json(
        { ok: false, error: "Lỗi kết nối khi tải tệp từ Vercel Blob" },
        { status: 500 }
      );
    }
  }

  if (!pdfBuffer || pdfBuffer.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Cần cung cấp tệp PDF hoặc liên kết Vercel Blob URL hợp lệ." },
      { status: 400 }
    );
  }

  // Khởi tạo SSE Stream Response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: IncrementalProgressEvent) => {
        try {
          const payload = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch (e) {
          console.warn("Lỗi gửi SSE event:", e);
        }
      };

      try {
        await executeIncrementalPipeline(
          pdfBuffer!,
          {
            fileName,
            society,
            title,
            year,
            blobUrl: blob_url,
          },
          sendEvent
        );
      } catch (pipelineErr) {
        const errorMsg = pipelineErr instanceof Error ? pipelineErr.message : "Lỗi không xác định trong quá trình xử lý pipeline";
        sendEvent({
          stage: "ERROR",
          percent: 100,
          message: `Lỗi: ${errorMsg}`,
          error: errorMsg,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
