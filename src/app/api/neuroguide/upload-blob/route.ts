import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse, NextRequest } from "next/server";
import { verifyAdminToken } from "@/utils/security";

export const dynamic = "force-dynamic";

function cleanBlobToken(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const match = raw.match(/vercel_blob_rw_[a-zA-Z0-9_\-]+/);
  if (match) return match[0].trim();
  let cleaned = raw.replace(/^BLOB_READ_WRITE_TOKEN\s*=\s*/i, "");
  cleaned = cleaned.replace(/[\r\n\t"'`]/g, "").trim();
  return cleaned.length > 10 ? cleaned : undefined;
}

function getBlobToken(): { token: string | undefined } {
  const direct = cleanBlobToken(process.env.BLOB_READ_WRITE_TOKEN);
  if (direct) return { token: direct };
  for (const [key, val] of Object.entries(process.env)) {
    if ((key.includes("BLOB") || key.includes("READ_WRITE")) && key.includes("TOKEN") && val) {
      const cleaned = cleanBlobToken(val);
      if (cleaned) return { token: cleaned };
    }
  }
  return { token: undefined };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;
  const { token } = getBlobToken();

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "BLOB_NOT_CONFIGURED: Vercel Blob read/write token not found." },
      { status: 400 }
    );
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      token,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // Khóa chặt quyền tải lên: Chỉ Quản trị viên (Admin) mới có quyền đẩy PDF lên Vercel Blob
        if (!verifyAdminToken(clientPayload)) {
          throw new Error("Unauthorized: Quyền tải tệp PDF lên hệ thống chỉ dành riêng cho Quản trị viên (Admin).");
        }

        // Chỉ cho phép upload file PDF học thuật, dung lượng tối đa 50MB
        return {
          allowedContentTypes: ["application/pdf"],
          maximumSizeInBytes: 50 * 1024 * 1024,
          tokenPayload: JSON.stringify({
            uploadedAt: new Date().toISOString(),
            pathname,
          }),
        };
      },
      onUploadCompleted: async ({ blob }) => {
        // Hook sau khi upload hoàn thành lên Vercel Blob
        console.log("PDF uploaded to Vercel Blob:", blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error handling Vercel Blob upload handshake";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
