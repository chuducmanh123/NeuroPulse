import { NextRequest, NextResponse } from "next/server";
import { extractTextFromDocument } from "@/lib/neuroguide/documentParser";
import { verifyAdminToken } from "@/utils/security";

export const dynamic = "force-dynamic";

const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024; // 25 MB limit

export async function POST(request: NextRequest) {
  try {
    const adminToken =
      request.headers.get("x-admin-token") ||
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    if (!verifyAdminToken(adminToken)) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized. Administrator credentials required." },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json(
        { ok: false, error: "Vui lòng chọn tệp tài liệu hợp lệ (.md, .txt, .docx, .doc, .pdf)." },
        { status: 400 }
      );
    }

    if (file.size > MAX_DOCUMENT_BYTES) {
      return NextResponse.json(
        { ok: false, error: "Tệp tài liệu vượt quá giới hạn dung lượng tối đa 25MB." },
        { status: 413 }
      );
    }

    const arrayBuf = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    const { text, format, method } = await extractTextFromDocument(buffer, file.name);

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Không thể trích xuất văn bản từ tệp này. Tệp có thể rỗng hoặc ở định dạng được mã hóa bảo vệ.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      ok: true,
      fileName: file.name,
      text: text.trim(),
      format,
      method,
      charCount: text.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lỗi khi xử lý tệp tài liệu";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
