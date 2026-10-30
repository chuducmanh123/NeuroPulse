import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

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

/**
 * Đọc nội dung tệp tin, ưu tiên từ thư mục ghi /tmp (trên Vercel Serverless) trước khi đọc từ kho tĩnh
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
 * Lưu tệp tin an toàn: Thử ghi vào STORE_DIR (môi trường Local Dev); nếu gặp lỗi EROFS
 * (hệ thống tệp chỉ đọc trên Vercel Serverless), tự động fallback sang /tmp
 */
function saveFileSafe(fileName: string, dataStr: string): void {
  let written = false;

  // 1. Thử ghi vào STORE_DIR (chạy cục bộ)
  try {
    const storePath = path.join(STORE_DIR, fileName);
    if (!fs.existsSync(STORE_DIR)) {
      fs.mkdirSync(STORE_DIR, { recursive: true });
    }
    fs.writeFileSync(storePath, dataStr, "utf-8");
    written = true;
  } catch (e: any) {
    // Nếu là EROFS (Read-only filesystem trên AWS Lambda/Vercel), bỏ qua để chuyển sang /tmp
    if (e?.code !== "EROFS" && !String(e).includes("read-only file system")) {
      console.warn("Không thể ghi vào STORE_DIR:", e);
    }
  }

  // 2. Luôn ghi hoặc fallback vào /tmp để duy trì phiên làm việc trên Cloud
  try {
    if (!fs.existsSync(TMP_DIR)) {
      fs.mkdirSync(TMP_DIR, { recursive: true });
    }
    const tmpPath = path.join(TMP_DIR, fileName);
    fs.writeFileSync(tmpPath, dataStr, "utf-8");
  } catch (err) {
    if (!written) {
      console.error("Không thể ghi vào TMP_DIR:", err);
      throw err;
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
    saveFileSafe(latestFileName, JSON.stringify(record, null, 2));

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
          saveFileSafe("catalog.json", JSON.stringify(catalog, null, 2));
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
