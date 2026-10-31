import { list, del } from "@vercel/blob";

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

/**
 * Tự động tìm và xóa toàn bộ các tệp PDF tạm trên Vercel Blob để bảo toàn hạn mức lưu trữ.
 * Giữ nguyên các tệp cấu trúc JSON quan trọng (neuroguide_data.json, cases.json, guidelines_store/...).
 */
export async function cleanupAllBlobPdfs(): Promise<{ count: number; deleted: string[] }> {
  const { token } = getBlobToken();
  if (!token) return { count: 0, deleted: [] };

  try {
    const { blobs } = await list({ token });
    const pdfBlobs = blobs.filter(
      (b) =>
        b.pathname.toLowerCase().endsWith(".pdf") ||
        b.pathname.toLowerCase().includes(".pdf")
    );

    if (pdfBlobs.length > 0) {
      const urlsToDelete = pdfBlobs.map((b) => b.url);
      await del(urlsToDelete, { token });
      const deletedNames = pdfBlobs.map((b) => b.pathname);
      console.log(`[Blob Cleanup] Đã xóa ${pdfBlobs.length} tệp PDF khỏi Vercel Blob:`, deletedNames);
      return { count: pdfBlobs.length, deleted: deletedNames };
    }
  } catch (err) {
    console.warn("[Blob Cleanup] Lỗi dọn dẹp PDF trên Vercel Blob:", err);
  }

  return { count: 0, deleted: [] };
}
