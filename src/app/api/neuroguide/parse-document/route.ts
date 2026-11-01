import { NextRequest, NextResponse } from "next/server";
import { extractTextFromDocument } from "@/lib/neuroguide/documentParser";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json(
        { ok: false, error: "Vui lòng chọn tệp tài liệu hợp lệ (.md, .txt, .docx, .doc, .pdf)." },
        { status: 400 }
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
