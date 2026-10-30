import { NextRequest, NextResponse } from "next/server";
import { executeIncrementalPipeline, IncrementalProgressEvent } from "@/lib/neuroguide/incrementalExtractor";
import { verifyAdminToken } from "@/utils/security";
import zlib from "zlib";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  // Khóa bảo vệ Admin: Chỉ quản trị viên có token hợp lệ mới được thực thi luồng bóc tách PDF
  const adminToken =
    request.headers.get("x-admin-token") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!verifyAdminToken(adminToken)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unauthorized: Chức năng tải lên PDF & bóc tách AI chỉ dành riêng cho Quản trị viên (Admin).",
      },
      { status: 401 }
    );
  }

  let blob_url: string | undefined;
  let uploadId: string | undefined;
  let fileName: string = "guideline.pdf";
  let society: string = "AHA";
  let title: string | undefined;
  let year: number | undefined;
  let directBuffer: Buffer | null = null;
  let apiKey: string | undefined = request.headers.get("x-gemini-api-key") || undefined;

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    society = (formData.get("society") as string) || "AHA";
    title = (formData.get("title") as string) || undefined;
    blob_url = (formData.get("blob_url") as string) || undefined;
    uploadId = (formData.get("uploadId") as string) || undefined;
    const keyField = formData.get("apiKey") as string;
    if (keyField) apiKey = keyField;
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
      uploadId = body.uploadId;
      fileName = body.fileName || "guideline.pdf";
      society = body.society || "AHA";
      title = body.title;
      year = body.year;
      if (body.apiKey) apiKey = body.apiKey;
    } catch {}
  }

  // Tự động giải nén nếu buffer được gửi ở định dạng Gzip (magic bytes 0x1f, 0x8b)
  if (directBuffer && directBuffer.length > 2 && directBuffer[0] === 0x1f && directBuffer[1] === 0x8b) {
    try {
      directBuffer = zlib.gunzipSync(directBuffer);
    } catch (decompErr) {
      console.warn("Không thể giải nén payload gzip trực tiếp:", decompErr);
    }
  }

  // Chuẩn bị dữ liệu PDF
  let pdfBuffer: Buffer | null = directBuffer;

  // Nếu tệp được tải lên theo phương thức chunked upload
  if (!pdfBuffer && uploadId) {
    const tmpDir = path.join("/tmp", "neuroguide_uploads");
    const localTmpDir = path.join(process.cwd(), "data", "temp_uploads");
    let uploadFilePath: string | null = null;

    for (const dir of [tmpDir, localTmpDir]) {
      const candidate = path.join(dir, `${uploadId}.bin`);
      if (fs.existsSync(candidate)) {
        uploadFilePath = candidate;
        break;
      }
    }

    if (uploadFilePath) {
      try {
        let rawBuf = fs.readFileSync(uploadFilePath);
        // Tự động giải nén nếu file chunked được nén gzip
        if (rawBuf.length > 2 && rawBuf[0] === 0x1f && rawBuf[1] === 0x8b) {
          try {
            rawBuf = zlib.gunzipSync(rawBuf);
          } catch {}
        }
        pdfBuffer = rawBuf;
        // Xóa tệp tạm để giải phóng bộ nhớ
        try {
          fs.unlinkSync(uploadFilePath);
        } catch {}
      } catch (chunkReadErr) {
        console.warn("Lỗi đọc tệp chunked upload:", chunkReadErr);
      }
    }
  }

  if (!pdfBuffer && blob_url) {
    try {
      const res = await fetch(blob_url);
      if (!res.ok) {
        return NextResponse.json(
          { ok: false, error: `Could not retrieve file from Vercel Blob (HTTP ${res.status})` },
          { status: 400 }
        );
      }
      pdfBuffer = Buffer.from(await res.arrayBuffer());
    } catch {
      return NextResponse.json(
        { ok: false, error: "Network connection error downloading document from Vercel Blob" },
        { status: 500 }
      );
    }
  }

  if (!pdfBuffer || pdfBuffer.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Please provide a valid PDF document or Vercel Blob URL." },
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
          console.warn("Error sending SSE event:", e);
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
            apiKey,
          },
          sendEvent
        );
      } catch (pipelineErr) {
        const errorMsg = pipelineErr instanceof Error ? pipelineErr.message : "Unexpected pipeline execution error";
        sendEvent({
          stage: "ERROR",
          percent: 100,
          message: `Error: ${errorMsg}`,
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
