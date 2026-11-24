import { NextRequest, NextResponse } from "next/server";
import { executeIncrementalPipeline, IncrementalProgressEvent } from "@/lib/neuroguide/incrementalExtractor";
import { verifyAdminToken } from "@/utils/security";
import { isValidUploadId, parseSafeYear, resolveSafeChildPath, validateSafeExternalUrl } from "@/lib/neuroguide/safePath";
import zlib from "zlib";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_PDF_BYTES = 55 * 1024 * 1024; // 55 MB cap for uploaded/decompressed PDFs

function getAllowedBlobHosts(): { hosts: string[]; supabaseHost: string | null } {
  const hosts = ["*.public.blob.vercel-storage.com"];
  let supabaseHost: string | null = null;
  const sbUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").trim();
  if (sbUrl) {
    try {
      supabaseHost = new URL(sbUrl).hostname.toLowerCase();
      hosts.push(supabaseHost);
    } catch {}
  }
  return { hosts, supabaseHost };
}

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
    year = parseSafeYear(formData.get("year"));

    const file = formData.get("file") as File | null;
    if (file && file.size > 0) {
      if (file.size > MAX_PDF_BYTES) {
        return NextResponse.json({ ok: false, error: "File exceeds 55MB limit." }, { status: 413 });
      }
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
      year = parseSafeYear(body.year);
      if (body.apiKey) apiKey = body.apiKey;
    } catch {}
  }

  // Tự động giải nén nếu buffer được gửi ở định dạng Gzip (magic bytes 0x1f, 0x8b)
  if (directBuffer && directBuffer.length > 2 && directBuffer[0] === 0x1f && directBuffer[1] === 0x8b) {
    try {
      directBuffer = zlib.gunzipSync(directBuffer, { maxOutputLength: MAX_PDF_BYTES });
    } catch (decompErr) {
      console.warn("Không thể giải nén payload gzip trực tiếp:", decompErr);
      return NextResponse.json({ ok: false, error: "Gzip payload invalid or exceeds size limit." }, { status: 400 });
    }
  }

  // Chuẩn bị dữ liệu PDF
  let pdfBuffer: Buffer | null = directBuffer;

  // Nếu tệp được tải lên theo phương thức chunked upload
  if (!pdfBuffer && uploadId) {
    if (!isValidUploadId(uploadId)) {
      return NextResponse.json({ ok: false, error: "Invalid uploadId format." }, { status: 400 });
    }
    const tmpDir = path.join("/tmp", "neuroguide_uploads");
    const localTmpDir = path.join(process.cwd(), "data", "temp_uploads");
    let uploadFilePath: string | null = null;

    for (const dir of [tmpDir, localTmpDir]) {
      const candidate = resolveSafeChildPath(dir, `${uploadId}.bin`);
      if (fs.existsSync(candidate)) {
        uploadFilePath = candidate;
        break;
      }
    }

    if (uploadFilePath) {
      try {
        let rawBuf = fs.readFileSync(/* turbopackIgnore: true */ uploadFilePath);
        if (rawBuf.length > MAX_PDF_BYTES) {
          return NextResponse.json({ ok: false, error: "Uploaded file exceeds 55MB limit." }, { status: 413 });
        }
        // Tự động giải nén nếu file chunked được nén gzip
        if (rawBuf.length > 2 && rawBuf[0] === 0x1f && rawBuf[1] === 0x8b) {
          try {
            rawBuf = zlib.gunzipSync(rawBuf, { maxOutputLength: MAX_PDF_BYTES });
          } catch {
            return NextResponse.json({ ok: false, error: "Chunked gzip payload invalid or exceeds size limit." }, { status: 400 });
          }
        }
        pdfBuffer = rawBuf;
        // Xóa tệp tạm để giải phóng bộ nhớ
        try {
          fs.unlinkSync(/* turbopackIgnore: true */ uploadFilePath);
        } catch {}
      } catch (chunkReadErr) {
        console.warn("Lỗi đọc tệp chunked upload:", chunkReadErr);
      }
    }
  }

  if (!pdfBuffer && blob_url) {
    try {
      const { hosts, supabaseHost } = getAllowedBlobHosts();
      const parsedBlobUrl = validateSafeExternalUrl(blob_url, {
        httpsOnly: true,
        allowedHosts: hosts,
      });
      if (
        supabaseHost &&
        parsedBlobUrl.hostname.toLowerCase() === supabaseHost &&
        !parsedBlobUrl.pathname.startsWith("/storage/v1/object/public/guidelines-pdf/")
      ) {
        return NextResponse.json(
          { ok: false, error: "Invalid Supabase storage object path for blob_url." },
          { status: 400 }
        );
      }

      const res = await fetch(parsedBlobUrl.toString(), { redirect: "error" });
      if (!res.ok) {
        return NextResponse.json(
          { ok: false, error: `Could not retrieve file from storage (HTTP ${res.status})` },
          { status: 400 }
        );
      }
      const contentLenHeader = Number.parseInt(res.headers.get("content-length") || "0", 10);
      if (contentLenHeader > MAX_PDF_BYTES) {
        return NextResponse.json({ ok: false, error: "Remote blob exceeds 55MB limit." }, { status: 413 });
      }
      const arrBuf = await res.arrayBuffer();
      if (arrBuf.byteLength > MAX_PDF_BYTES) {
        return NextResponse.json({ ok: false, error: "Remote blob exceeds 55MB limit." }, { status: 413 });
      }
      pdfBuffer = Buffer.from(arrBuf);
    } catch (blobErr: unknown) {
      const msg = blobErr instanceof Error ? blobErr.message : "Invalid or unreachable blob_url";
      return NextResponse.json({ ok: false, error: msg }, { status: 400 });
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
