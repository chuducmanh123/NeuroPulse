import { NextRequest, NextResponse } from "next/server";
import { cleanupAllBlobPdfs } from "@/lib/neuroguide/blobCleanup";
import { verifyAdminToken } from "@/utils/security";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const adminToken =
    request.headers.get("x-admin-token") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!verifyAdminToken(adminToken)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized: Quyền dọn dẹp kho lưu trữ chỉ dành riêng cho Quản trị viên (Admin)." },
      { status: 401 }
    );
  }

  const result = await cleanupAllBlobPdfs();
  return NextResponse.json({
    ok: true,
    message: result.count > 0
      ? `Đã xóa sạch ${result.count} tệp PDF tạm trên Vercel Blob thành công!`
      : "Kho Vercel Blob không có tệp PDF tạm nào cần dọn dẹp.",
    deletedCount: result.count,
    deletedFiles: result.deleted,
  });
}
