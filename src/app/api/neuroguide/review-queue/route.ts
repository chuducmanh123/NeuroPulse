import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { put } from "@vercel/blob";
import type { GuidelineDoc, PracticeChangeDetail } from "@/types/neuroguide";
import { mapSocietyToSubspecialty } from "@/lib/neuroguide/storeAdapter";
import { loadMergedNeuroGuideData, saveNeuroGuideToActiveStorage } from "@/lib/neuroguide/blobStorage";

export const dynamic = "force-dynamic";

interface StoredRec {
  rec_id: string;
  guideline_id: string;
  grading_system: string;
  page_num: number;
  statement: string;
  approval_status: string;
  category?: string;
  topic?: string;
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

    // 1. Quét từ STORE_DIR (kho tĩnh)
    if (fs.existsSync(STORE_DIR)) {
      try {
        const files = fs.readdirSync(STORE_DIR).filter((f) => f.endsWith("_latest.json"));
        for (const f of files) fileMap.set(f, path.join(STORE_DIR, f));
      } catch {}
    }

    // 2. Quét từ TMP_DIR (ghi đè tức thì từ runtime Lambda)
    if (fs.existsSync(TMP_DIR)) {
      try {
        const tmpFiles = fs.readdirSync(TMP_DIR).filter((f) => f.endsWith("_latest.json"));
        for (const f of tmpFiles) fileMap.set(f, path.join(TMP_DIR, f));
      } catch {}
    }

    // 3. Quét từ Vercel Blob (đồng bộ giữa các serverless container)
    const { token } = getBlobToken();
    if (token) {
      try {
        const { list } = await import("@vercel/blob");
        const { blobs } = await list({ prefix: "guidelines_store/", token });
        for (const b of blobs) {
          const fileName = b.pathname.replace(/^guidelines_store\//, "");
          if (fileName.endsWith("_latest.json")) {
            try {
              const res = await fetch(b.url, { cache: "no-store" });
              if (res.ok) {
                const text = await res.text();
                if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
                const localTmp = path.join(TMP_DIR, fileName);
                fs.writeFileSync(localTmp, text, "utf-8");
                fileMap.set(fileName, localTmp);
              }
            } catch {}
          }
        }
      } catch (blobErr) {
        console.warn("Lỗi đọc Vercel Blob trong review-queue:", blobErr);
      }
    }

    const queue: Array<StoredRec & { guideline_title: string; society: string; year?: number }> = [];

    for (const [file, fullPath] of fileMap.entries()) {
      try {
        const content = fs.readFileSync(fullPath, "utf-8");
        const record: GuidelineRecord = JSON.parse(content);
        for (const rec of record.recommendations) {
          // Tuyệt đối chỉ nhận các khuyến cáo đang chờ duyệt PENDING_REVIEW
          // Lọc bỏ 100% các khuyến cáo đã được APPROVED, MODIFIED hoặc REJECTED
          if (rec.approval_status === "PENDING_REVIEW") {
            queue.push({
              ...rec,
              guideline_id: record.guideline_id,
              guideline_title: record.metadata?.title || "Hướng dẫn lâm sàng",
              society: record.metadata?.society || "Chưa rõ",
              year: record.metadata?.year,
              category: rec.category || (rec as any).section || "Khuyến cáo chung",
              topic: rec.topic || rec.target_population || "Khuyến cáo lâm sàng",
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

/**
 * Đồng bộ toàn bộ các khuyến cáo đã phê duyệt trong GuidelineRecord vào thư viện hoạt động (neuroguide_data.json)
 */
async function syncGuidelineRecordToActiveLibrary(record: GuidelineRecord) {
  const approvedRecs = record.recommendations.filter(
    (r) => r.approval_status === "APPROVED" || r.approval_status === "MODIFIED"
  );
  if (approvedRecs.length === 0) return;

  const activeData = await loadMergedNeuroGuideData();
  const nowIso = new Date().toISOString();

  const practiceChanges: PracticeChangeDetail[] = approvedRecs.map((r, idx) => {
    let currentGrade = "Standard Clinical Practice";
    if (r.cor) {
      currentGrade = `Class ${r.cor}${r.loe ? `, Level ${r.loe}` : ""}`;
    } else if (r.quality_of_evidence || r.strength_of_recommendation) {
      currentGrade = `GRADE ${r.strength_of_recommendation || "Recommended"} (Evidence: ${r.quality_of_evidence || "Moderate"}${r.voting ? `, Voting: ${r.voting}` : ""})`;
    }

    const isClass1 = r.cor === "1" || String(r.cor).includes("1");
    const isHarm = String(r.cor).includes("3");
    const fallbackCategory = isClass1
      ? "Khuyến cáo Hàng đầu (Class I)"
      : isHarm
      ? "Khuyến cáo Nguy hại / Không có lợi (Class III)"
      : "Khuyến cáo Phối hợp (Class II)";

    const clinicalCategory = (r.category || (r as any).section || fallbackCategory).trim();
    const clinicalTopic = (r.topic || r.target_population || record.metadata.title).trim();

    return {
      id: r.rec_id || `rec-${idx + 1}`,
      category: clinicalCategory,
      topic: clinicalTopic,
      changeType: isClass1 ? "UPGRADED" : "NEW",
      currentText: r.statement,
      currentGrade,
      drivingTrials: r.driving_trials || [],
    };
  });

  const normalizeT = (t: string) => (t || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const normTitle = normalizeT(record.metadata.title);
  const targetId = record.guideline_id;

  const existingIdx = activeData.guidelines.findIndex(
    (g) => g.id.toLowerCase() === targetId.toLowerCase() || normalizeT(g.title) === normTitle
  );

  const subspecialty = mapSocietyToSubspecialty(record.metadata.society || "AHA", record.metadata.title || "");
  const summaryVi = `Hướng dẫn thực hành lâm sàng chính thức từ ${record.metadata.society || "Hội chuyên khoa"}. Bao gồm ${practiceChanges.length} khuyến cáo đã được bác sĩ chuyên khoa phê duyệt.`;

  if (existingIdx >= 0) {
    const existing = activeData.guidelines[existingIdx];
    activeData.guidelines[existingIdx] = {
      ...existing,
      allPracticeChanges: practiceChanges,
      executiveSummary: summaryVi,
      executiveSummaryVi: summaryVi,
      aiSynthesized: true,
      synthesizedAt: nowIso,
    };
  } else {
    const newDoc: GuidelineDoc = {
      id: targetId,
      society: record.metadata.society || "AHA/ASA",
      year: record.metadata.year || new Date().getFullYear(),
      title: record.metadata.title || "Clinical Practice Guideline",
      officialUrl: record.metadata.source_url || "https://pubmed.ncbi.nlm.nih.gov/",
      journalTarget: record.metadata.society?.includes("ESO")
        ? "European Stroke Journal"
        : record.metadata.society?.includes("AHA")
        ? "Stroke"
        : "Neurology",
      documentType: "Clinical Practice Guideline",
      publishDate: `${record.metadata.year || new Date().getFullYear()}-01-01`,
      subspecialty,
      subspecialties: [subspecialty],
      executiveSummary: summaryVi,
      executiveSummaryVi: summaryVi,
      allPracticeChanges: practiceChanges,
      linkedScenarioIds: [],
      fullTextStatus: "FULL_TEXT_PARSED",
      aiSynthesized: true,
      synthesizedAt: nowIso,
    };
    activeData.guidelines.unshift(newDoc);
  }

  await saveNeuroGuideToActiveStorage({
    guidelines: activeData.guidelines,
    conferences: activeData.conferences,
    scenarios: activeData.scenarios,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, file_id, guideline_id, rec_id, reviewer, notes, modified_statement, updated_item, doc_id } = body;

    // 1. CHỨC NĂNG DUYỆT TẤT CẢ HOẶC DUYỆT TOÀN BỘ 1 GUIDELINE (APPROVE ALL / APPROVE GUIDELINE)
    if (action === "APPROVE_ALL" || action === "APPROVE_GUIDELINE") {
      let totalApproved = 0;
      const allFiles = new Set<string>();

      const targetGId = guideline_id || file_id || doc_id;

      if (targetGId && targetGId !== "ALL") {
        const cleanGId = targetGId.replace(/_latest\.json$/i, "");
        allFiles.add(`${cleanGId}_latest.json`);
      } else {
        for (const dir of [TMP_DIR, STORE_DIR]) {
          if (fs.existsSync(dir)) {
            try {
              fs.readdirSync(dir).filter((f) => f.endsWith("_latest.json")).forEach((f) => allFiles.add(f));
            } catch {}
          }
        }

        // Quét thêm từ Blob nếu có
        const { token } = getBlobToken();
        if (token) {
          try {
            const { list } = await import("@vercel/blob");
            const { blobs } = await list({ prefix: "guidelines_store/", token });
            for (const b of blobs) {
              const fileName = b.pathname.replace(/^guidelines_store\//, "");
              if (fileName.endsWith("_latest.json")) {
                allFiles.add(fileName);
              }
            }
          } catch {}
        }
      }

      for (const fileName of Array.from(allFiles)) {
        const fileInfo = getFileContent(fileName);
        if (!fileInfo) continue;
        try {
          const rec: GuidelineRecord = JSON.parse(fileInfo.content);
          let modified = 0;
          for (const r of rec.recommendations) {
            if (r.approval_status === "PENDING_REVIEW") {
              r.approval_status = "APPROVED";
              r.reviewed_by = reviewer || "Bác sĩ chuyên khoa";
              r.reviewed_at = new Date().toISOString();
              modified++;
            }
          }
          if (modified > 0) {
            rec.pending_count = rec.recommendations.filter((r) => r.approval_status === "PENDING_REVIEW").length;
            rec.approved_count = rec.recommendations.filter(
              (r) => r.approval_status === "APPROVED" || r.approval_status === "MODIFIED"
            ).length;
            rec.updated_at = new Date().toISOString();
            await saveFileSafe(fileName, JSON.stringify(rec, null, 2));
            await syncGuidelineRecordToActiveLibrary(rec);
            totalApproved += modified;
          }
        } catch (e) {
          console.warn("Lỗi duyệt batch file:", fileName, e);
        }
      }

      return NextResponse.json({
        ok: true,
        message: `Đã phê duyệt thành công ${totalApproved} khuyến cáo vào Hướng dẫn Thực hành lâm sàng!`,
        approved_count: totalApproved,
      });
    }

    // 1b. CHỨC NĂNG TỪ CHỐI TOÀN BỘ 1 GUIDELINE (REJECT GUIDELINE)
    if (action === "REJECT_GUIDELINE") {
      const targetGId = guideline_id || file_id || doc_id;
      if (!targetGId) {
        return NextResponse.json({ ok: false, error: "Thiếu guideline_id để từ chối" }, { status: 400 });
      }
      const cleanGId = targetGId.replace(/_latest\.json$/i, "");
      const fileName = `${cleanGId}_latest.json`;
      const fileInfo = getFileContent(fileName);
      if (!fileInfo) {
        return NextResponse.json({ ok: false, error: `Không tìm thấy file ${fileName}` }, { status: 404 });
      }
      const rec: GuidelineRecord = JSON.parse(fileInfo.content);
      let rejectedCount = 0;
      for (const r of rec.recommendations) {
        if (r.approval_status === "PENDING_REVIEW") {
          r.approval_status = "REJECTED";
          r.reviewed_by = reviewer || "Bác sĩ chuyên khoa";
          r.reviewed_at = new Date().toISOString();
          rejectedCount++;
        }
      }
      rec.pending_count = 0;
      rec.rejected_count = (rec.rejected_count || 0) + rejectedCount;
      rec.updated_at = new Date().toISOString();
      await saveFileSafe(fileName, JSON.stringify(rec, null, 2));

      return NextResponse.json({
        ok: true,
        message: `Đã từ chối toàn bộ ${rejectedCount} khuyến cáo trong guideline này.`,
        rejected_count: rejectedCount,
      });
    }

    // 2. CHỨC NĂNG CHỈNH SỬA PRACTICE GUIDELINE ĐÃ ACCEPT HOẶC ĐANG CHỜ DUYỆT
    if (action === "EDIT_APPROVED" || action === "EDIT_RECOMMENDATION") {
      if (!doc_id || !updated_item || !updated_item.id) {
        return NextResponse.json(
          { ok: false, error: "Thiếu thông tin chỉnh sửa (doc_id, updated_item)" },
          { status: 400 }
        );
      }

      // 1. Cập nhật vào _latest.json nếu tồn tại (cho cả pending và approved)
      const cleanDocId = doc_id.replace(/_latest\.json$/i, "");
      const latestFileName = `${cleanDocId}_latest.json`;
      const fileInfo = getFileContent(latestFileName);
      if (fileInfo) {
        try {
          const rec: GuidelineRecord = JSON.parse(fileInfo.content);
          const r = rec.recommendations.find((recItem) => recItem.rec_id === updated_item.id);
          if (r) {
            if (updated_item.currentText) r.statement = updated_item.currentText;
            if (updated_item.topic) r.topic = updated_item.topic;
            if (updated_item.category) r.category = updated_item.category;
            if (updated_item.currentGrade) {
              const corMatch = updated_item.currentGrade.match(/Class\s*([123a-zA-Z:]+)/i);
              if (corMatch) r.cor = corMatch[1];
              const loeMatch = updated_item.currentGrade.match(/Level\s*([A-Za-z\-]+)/i);
              if (loeMatch) r.loe = loeMatch[1];
            }
            if (updated_item.drivingTrials) r.driving_trials = updated_item.drivingTrials;
            await saveFileSafe(latestFileName, JSON.stringify(rec, null, 2));
          }
        } catch (saveErr) {
          console.warn("Lỗi lưu file _latest.json khi sửa:", saveErr);
        }
      }

      // 2. Cập nhật vào activeData nếu tài liệu đã xuất hiện trong thư viện hoạt động
      const activeData = await loadMergedNeuroGuideData();
      const targetDoc = activeData.guidelines.find((g) => g.id.toLowerCase() === cleanDocId.toLowerCase());
      if (targetDoc) {
        const itemIdx = targetDoc.allPracticeChanges.findIndex((c) => c.id === updated_item.id);
        if (itemIdx >= 0) {
          targetDoc.allPracticeChanges[itemIdx] = {
            ...targetDoc.allPracticeChanges[itemIdx],
            ...updated_item,
          };
        } else {
          targetDoc.allPracticeChanges.push(updated_item);
        }
        targetDoc.synthesizedAt = new Date().toISOString();

        await saveNeuroGuideToActiveStorage({
          guidelines: activeData.guidelines,
          conferences: activeData.conferences,
          scenarios: activeData.scenarios,
        });
      }

      return NextResponse.json({
        ok: true,
        message: "Đã cập nhật chỉnh sửa khuyến cáo thành công!",
        doc: targetDoc,
      });
    }

    // 2b. CHỨC NĂNG CHỈNH SỬA THÔNG TIN GUIDELINE (METADATA)
    if (action === "EDIT_GUIDELINE") {
      const { title, society: newSociety, year: newYear, executiveSummary } = body;
      const targetDocId = doc_id || file_id;
      if (!targetDocId) {
        return NextResponse.json({ ok: false, error: "Thiếu doc_id để sửa guideline" }, { status: 400 });
      }

      const cleanDocId = targetDocId.replace(/_latest\.json$/i, "");
      const latestFileName = `${cleanDocId}_latest.json`;
      const fileInfo = getFileContent(latestFileName);
      if (fileInfo) {
        try {
          const rec: GuidelineRecord = JSON.parse(fileInfo.content);
          if (title) rec.metadata.title = title;
          if (newSociety) rec.metadata.society = newSociety;
          if (newYear) rec.metadata.year = newYear;
          rec.updated_at = new Date().toISOString();
          await saveFileSafe(latestFileName, JSON.stringify(rec, null, 2));

          // Cập nhật catalog
          const catalogInfo = getFileContent("catalog.json");
          if (catalogInfo) {
            try {
              const catalog = JSON.parse(catalogInfo.content);
              if (catalog[cleanDocId]) {
                if (title) catalog[cleanDocId].title = title;
                if (newSociety) catalog[cleanDocId].society = newSociety;
                if (newYear) catalog[cleanDocId].year = newYear;
                catalog[cleanDocId].updated_at = rec.updated_at;
                await saveFileSafe("catalog.json", JSON.stringify(catalog, null, 2));
              }
            } catch {}
          }
        } catch (e) {
          console.warn("Lỗi lưu metadata guideline:", e);
        }
      }

      // Cập nhật active library nếu đã xuất bản
      const activeData = await loadMergedNeuroGuideData();
      const docIdx = activeData.guidelines.findIndex((g) => g.id.toLowerCase() === cleanDocId.toLowerCase());
      if (docIdx >= 0) {
        if (title) activeData.guidelines[docIdx].title = title;
        if (newSociety) activeData.guidelines[docIdx].society = newSociety;
        if (newYear) {
          activeData.guidelines[docIdx].year = newYear;
          activeData.guidelines[docIdx].publishDate = `${newYear}-01-01`;
        }
        if (executiveSummary) {
          activeData.guidelines[docIdx].executiveSummary = executiveSummary;
          activeData.guidelines[docIdx].executiveSummaryVi = executiveSummary;
        }
        activeData.guidelines[docIdx].synthesizedAt = new Date().toISOString();

        await saveNeuroGuideToActiveStorage({
          guidelines: activeData.guidelines,
          conferences: activeData.conferences,
          scenarios: activeData.scenarios,
        });
      }

      return NextResponse.json({
        ok: true,
        message: "Đã cập nhật thông tin guideline thành công!",
      });
    }

    // 3. DUYỆT ĐƠN LẺ KHUYẾN CÁO (APPROVE / REJECT / MODIFY)
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

    // Ghi lại tệp _latest.json an toàn
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
      } catch {}
    }

    // Tự động đồng bộ ngay vào thư viện chính Practice Guidelines
    if (record.approved_count > 0) {
      try {
        await syncGuidelineRecordToActiveLibrary(record);
      } catch (err) {
        console.warn("Lỗi đồng bộ thư viện chính sau phê duyệt:", err);
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Đã cập nhật trạng thái khuyến cáo ${rec_id} thành ${action} và đồng bộ vào Hướng dẫn Thực hành lâm sàng!`,
      targetRec,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Lỗi khi xử lý phê duyệt";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
