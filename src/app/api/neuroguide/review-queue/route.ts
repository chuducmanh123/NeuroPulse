import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { put } from "@vercel/blob";

export const dynamic = "force-dynamic";

interface StoredRec {
  rec_id: string;
  guideline_id: string;
  grading_system: string;
  page_num: number;
  statement: string;
  approval_status: string;
  cor?: string;
  cor_label?: string;
  loe?: string;
  quality_of_evidence?: string;
  strength_of_recommendation?: string;
  voting?: string;
  pico_id?: string;
  target_population?: string;
  driving_trials?: string[];
  verbatim_quote?: string;
  verification_detail?: {
    status: string;
    grounding_score: number;
    classification_valid: boolean;
    numbers_verified: boolean;
    issues: string[];
  };
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
}

interface GuidelineRecord {
  guideline_id: string;
  version: number;
  metadata: {
    title: string;
    society: string;
    year?: number;
    source_url?: string;
  };
  total_recommendations: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  recommendations: StoredRec[];
  updated_at: string;
}

const STORE_DIR = path.join(process.cwd(), "data", "guidelines_store");
const TMP_DIR = path.join("/tmp", "guidelines_store");

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
 * Đọc nội dung tệp tin: Ưu tiên /tmp (phiên hiện tại trên serverless), sau đó kho tĩnh STORE_DIR
 */
function getFileContent(fileName: string): { content: string; sourcePath: string } | null {
  const tmpPath = path.join(TMP_DIR, fileName);
  if (fs.existsSync(tmpPath)) {
    try {
      return { content: fs.readFileSync(tmpPath, "utf-8"), sourcePath: tmpPath };
    } catch {}
  }

  const storePath = path.join(STORE_DIR, fileName);
  if (fs.existsSync(storePath)) {
    try {
      return { content: fs.readFileSync(storePath, "utf-8"), sourcePath: storePath };
    } catch {}
  }

  return null;
}

/**
 * Lưu tệp tin an toàn tuyệt đối chống lỗi EROFS trên Vercel Serverless:
 * 1. Nếu môi trường Vercel (process.env.VERCEL) -> KHÔNG bao giờ ghi vào STORE_DIR để tránh lỗi EROFS
 * 2. Lưu vào /tmp (khả dụng ghi trên mọi môi trường serverless/Lambda)
 * 3. Nếu cấu hình Vercel Blob -> Lưu lên Cloud Blob để duy trì bền vững
 * 4. Chạy cục bộ (Local Dev) -> Lưu trực tiếp vào STORE_DIR
 */
async function saveFileSafe(fileName: string, dataStr: string): Promise<void> {
  const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

  // 1. Lưu vào /tmp để duy trì tức thì cho các request trong container
  try {
    if (!fs.existsSync(TMP_DIR)) {
      fs.mkdirSync(TMP_DIR, { recursive: true });
    }
    const tmpPath = path.join(TMP_DIR, fileName);
    fs.writeFileSync(tmpPath, dataStr, "utf-8");
  } catch (err) {
    console.warn("Không thể ghi vào TMP_DIR:", err);
  }

  // 2. Thử lưu lên Vercel Blob nếu có token
  const { token } = getBlobToken();
  if (token) {
    try {
      const putOptions: any = {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
        token,
      };
      await put(`guidelines_store/${fileName}`, dataStr, putOptions);
    } catch (blobErr) {
      console.warn("Lỗi đồng bộ lên Vercel Blob:", blobErr);
    }
  }

  // 3. Nếu không phải Vercel Serverless (chạy cục bộ), lưu vào STORE_DIR
  if (!isVercel) {
    try {
      if (!fs.existsSync(STORE_DIR)) {
        fs.mkdirSync(STORE_DIR, { recursive: true });
      }
      const storePath = path.join(STORE_DIR, fileName);
      fs.writeFileSync(storePath, dataStr, "utf-8");
    } catch (e: any) {
      if (e?.code !== "EROFS" && !String(e).includes("read-only file system")) {
        console.warn("Không thể ghi vào STORE_DIR:", e);
      }
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const fileMap = new Map<string, string>(); // fileName -> fullPath

    // Quét từ STORE_DIR
    if (fs.existsSync(STORE_DIR)) {
      try {
        const files = fs.readdirSync(STORE_DIR).filter((f) => f.endsWith("_latest.json"));
        for (const f of files) fileMap.set(f, path.join(STORE_DIR, f));
      } catch {}
    }

    // Quét từ TMP_DIR (ghi đè nếu có cập nhật mới của bác sĩ trên Vercel)
    if (fs.existsSync(TMP_DIR)) {
      try {
        const tmpFiles = fs.readdirSync(TMP_DIR).filter((f) => f.endsWith("_latest.json"));
        for (const f of tmpFiles) fileMap.set(f, path.join(TMP_DIR, f));
      } catch {}
    }

    const queue: Array<StoredRec & { guideline_title: string; society: string }> = [];

    for (const [file, fullPath] of fileMap.entries()) {
      try {
        const content = fs.readFileSync(fullPath, "utf-8");
        const record: GuidelineRecord = JSON.parse(content);
        for (const rec of record.recommendations) {
          if (rec.approval_status === "PENDING_REVIEW") {
            queue.push({
              ...rec,
              guideline_title: record.metadata?.title || "Hướng dẫn lâm sàng",
              society: record.metadata?.society || "Chưa rõ",
            });
          }
        }
      } catch {
        continue;
      }
    }

    return NextResponse.json({
      ok: true,
      total: queue.length,
      queue,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Lỗi đọc hàng đợi duyệt";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { file_id, rec_id, action, reviewer, notes, modified_statement } = body;

    if (!file_id || !rec_id || !action) {
      return NextResponse.json(
        { ok: false, error: "Thiếu tham số: file_id, rec_id, hoặc action" },
        { status: 400 }
      );
    }

    const latestFileName = `${file_id}_latest.json`;
    const fileInfo = getFileContent(latestFileName);
    if (!fileInfo) {
      return NextResponse.json(
        { ok: false, error: `Không tìm thấy tài liệu guideline với ID: ${file_id}` },
        { status: 404 }
      );
    }

    const record: GuidelineRecord = JSON.parse(fileInfo.content);
    const targetRec = record.recommendations.find((r) => r.rec_id === rec_id);

    if (!targetRec) {
      return NextResponse.json(
        { ok: false, error: `Không tìm thấy khuyến cáo ${rec_id} trong tài liệu` },
        { status: 404 }
      );
    }

    // Cập nhật trạng thái
    const nowIso = new Date().toISOString();
    targetRec.approval_status = action; // APPROVED, REJECTED, MODIFIED
    targetRec.reviewed_by = reviewer || "Bác sĩ chuyên khoa";
    targetRec.reviewed_at = nowIso;
    targetRec.review_notes = notes || undefined;

    if (action === "MODIFIED" && modified_statement) {
      targetRec.statement = modified_statement;
    }

    // Đếm lại
    record.pending_count = record.recommendations.filter(
      (r) => r.approval_status === "PENDING_REVIEW"
    ).length;
    record.approved_count = record.recommendations.filter(
      (r) => r.approval_status === "APPROVED" || r.approval_status === "MODIFIED"
    ).length;
    record.rejected_count = record.recommendations.filter(
      (r) => r.approval_status === "REJECTED"
    ).length;
    record.updated_at = nowIso;

    // Ghi lại tệp _latest.json an toàn (hỗ trợ cả Local và Vercel EROFS)
    await saveFileSafe(latestFileName, JSON.stringify(record, null, 2));

    // Cập nhật catalog.json
    const catalogInfo = getFileContent("catalog.json");
    if (catalogInfo) {
      try {
        const catalog = JSON.parse(catalogInfo.content);
        if (catalog[file_id]) {
          catalog[file_id].pending_count = record.pending_count;
          catalog[file_id].approved_count = record.approved_count;
          catalog[file_id].rejected_count = record.rejected_count;
          catalog[file_id].updated_at = nowIso;
          await saveFileSafe("catalog.json", JSON.stringify(catalog, null, 2));
        }
      } catch {
        // Bỏ qua lỗi phụ của catalog
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Đã cập nhật trạng thái khuyến cáo ${rec_id} thành ${action}`,
      targetRec,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Lỗi khi xử lý phê duyệt";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
