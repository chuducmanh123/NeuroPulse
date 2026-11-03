import { NextResponse, NextRequest } from "next/server";
import { verifyAdminToken } from "@/utils/security";
import { supabaseAdmin, hasSupabaseConfig } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Khóa chặt quyền tải lên: Chỉ Quản trị viên (Admin) mới có quyền đẩy PDF lên hệ thống
  const adminToken =
    request.headers.get("x-admin-token") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!verifyAdminToken(adminToken)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized: Quyền tải tệp PDF lên hệ thống chỉ dành riêng cho Quản trị viên (Admin)." },
      { status: 401 }
    );
  }

  if (!hasSupabaseConfig()) {
    return NextResponse.json(
      { ok: false, error: "SUPABASE_NOT_CONFIGURED: Supabase URL hoặc Service Role Key chưa được cấu hình." },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { ok: false, error: "Thiếu tệp tin PDF hợp lệ trong yêu cầu." },
        { status: 400 }
      );
    }

    // Giới hạn 50MB
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { ok: false, error: "Tệp tin vượt quá dung lượng tối đa cho phép (50MB)." },
        { status: 400 }
      );
    }

    const rawBuffer = Buffer.from(await file.arrayBuffer());
    const sanitizedName = (file.name || "guideline.pdf").replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueFileName = `guideline-${Date.now()}-${sanitizedName}`;

    // Đảm bảo bucket guidelines-pdf tồn tại
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    if (!buckets?.some((b) => b.name === "guidelines-pdf")) {
      await supabaseAdmin.storage.createBucket("guidelines-pdf", {
        public: true,
        fileSizeLimit: 52428800,
        allowedMimeTypes: ["application/pdf"],
      });
    }

    const { error: uploadError } = await supabaseAdmin.storage
      .from("guidelines-pdf")
      .upload(uniqueFileName, rawBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase storage upload error:", uploadError);
      return NextResponse.json(
        { ok: false, error: `Lỗi tải tệp lên Supabase Storage: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("guidelines-pdf")
      .getPublicUrl(uniqueFileName);

    return NextResponse.json({
      ok: true,
      url: publicUrlData.publicUrl,
      fileName: uniqueFileName,
      storage: "supabase",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi xử lý tải tệp lên Supabase Storage";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
