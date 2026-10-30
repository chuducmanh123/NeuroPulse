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

export async function GET(request: NextRequest) {
  try {
    if (!fs.existsSync(STORE_DIR)) {
      return NextResponse.json({ ok: true, queue: [], total: 0 });
    }

    const files = fs.readdirSync(STORE_DIR).filter((f) => f.endsWith("_latest.json"));
    const queue: Array<StoredRec & { guideline_title: string; society: string }> = [];

    for (const file of files) {
      const fullPath = path.join(STORE_DIR, file);
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

    const latestFile = path.join(STORE_DIR, `${file_id}_latest.json`);
    if (!fs.existsSync(latestFile)) {
      return NextResponse.json(
        { ok: false, error: `Không tìm thấy tài liệu guideline với ID: ${file_id}` },
        { status: 404 }
      );
    }

    const record: GuidelineRecord = JSON.parse(fs.readFileSync(latestFile, "utf-8"));
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

    // Ghi lại tệp _latest.json
    fs.writeFileSync(latestFile, JSON.stringify(record, null, 2), "utf-8");

    // Cập nhật catalog.json
    const catalogPath = path.join(STORE_DIR, "catalog.json");
    if (fs.existsSync(catalogPath)) {
      try {
        const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf-8"));
        if (catalog[file_id]) {
          catalog[file_id].pending_count = record.pending_count;
          catalog[file_id].approved_count = record.approved_count;
          catalog[file_id].rejected_count = record.rejected_count;
          catalog[file_id].updated_at = nowIso;
          fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), "utf-8");
        }
      } catch {
        // bỏ qua lỗi catalog
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
