import { supabaseAdmin, hasSupabaseConfig } from "../supabase";

/**
 * Tự động tìm và xóa toàn bộ các tệp PDF tạm trên Supabase Storage để bảo toàn hạn mức lưu trữ.
 * Theo kiến trúc mới, PDF không cần thiết lưu trữ lâu dài mà chỉ phục vụ AI bóc tách tức thì.
 */
export async function cleanupAllBlobPdfs(): Promise<{ count: number; deleted: string[] }> {
  if (!hasSupabaseConfig()) return { count: 0, deleted: [] };

  try {
    const { data: files, error } = await supabaseAdmin.storage
      .from("guidelines-pdf")
      .list();

    if (error || !files || files.length === 0) {
      return { count: 0, deleted: [] };
    }

    const pdfFiles = files.filter(
      (f) =>
        f.name.toLowerCase().endsWith(".pdf") ||
        f.name.toLowerCase().includes(".pdf")
    );

    if (pdfFiles.length > 0) {
      const namesToDelete = pdfFiles.map((f) => f.name);
      const { error: removeError } = await supabaseAdmin.storage
        .from("guidelines-pdf")
        .remove(namesToDelete);

      if (removeError) {
        console.warn("[Storage Cleanup] Lỗi xóa tệp PDF tạm trên Supabase:", removeError);
      } else {
        console.log(`[Storage Cleanup] Đã xóa ${pdfFiles.length} tệp PDF tạm khỏi Supabase Storage:`, namesToDelete);
        return { count: pdfFiles.length, deleted: namesToDelete };
      }
    }
  } catch (err) {
    console.warn("[Storage Cleanup] Ngoại lệ khi dọn dẹp PDF trên Supabase Storage:", err);
  }

  return { count: 0, deleted: [] };
}
