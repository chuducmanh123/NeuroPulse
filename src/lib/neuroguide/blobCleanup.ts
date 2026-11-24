import { supabaseAdmin, hasSupabaseAdminConfig } from "../supabase";

/**
 * Tự động tìm và xóa toàn bộ các tệp tạm trên Supabase Storage để bảo toàn hạn mức lưu trữ.
 * Theo kiến trúc mới, PDF không cần thiết lưu trữ lâu dài mà chỉ phục vụ AI bóc tách tức thì.
 */
export async function cleanupAllBlobPdfs(): Promise<{ count: number; deleted: string[] }> {
  if (!hasSupabaseAdminConfig()) return { count: 0, deleted: [] };

  try {
    const { data: files, error } = await supabaseAdmin.storage
      .from("guidelines-pdf")
      .list();

    if (error || !files || files.length === 0) {
      return { count: 0, deleted: [] };
    }

    const stagingFiles = files.filter((f) => {
      const lower = f.name.toLowerCase();
      return lower.startsWith("guideline-") || lower.endsWith(".pdf") || lower.includes(".pdf");
    });

    if (stagingFiles.length > 0) {
      const namesToDelete = stagingFiles.map((f) => f.name);
      const { error: removeError } = await supabaseAdmin.storage
        .from("guidelines-pdf")
        .remove(namesToDelete);

      if (removeError) {
        console.warn("[Storage Cleanup] Lỗi xóa tệp tạm trên Supabase:", removeError);
      } else {
        console.log(`[Storage Cleanup] Đã xóa ${stagingFiles.length} tệp tạm khỏi Supabase Storage:`, namesToDelete);
        return { count: stagingFiles.length, deleted: namesToDelete };
      }
    }
  } catch (err) {
    console.warn("[Storage Cleanup] Ngoại lệ khi dọn dẹp PDF trên Supabase Storage:", err);
  }

  return { count: 0, deleted: [] };
}
