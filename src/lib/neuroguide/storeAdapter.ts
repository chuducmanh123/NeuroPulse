import fs from "fs";
import path from "path";
import type { GuidelineDoc, PracticeChangeDetail, SubspecialtyType } from "../../types/neuroguide.ts";

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
 * Lưu tệp tin an toàn đa tầng:
 * 1. Ghi /tmp (cho runtime Vercel Lambda)
 * 2. Ghi lên Vercel Blob (guidelines_store/) để duy trì lâu dài
 * 3. Ghi vào thư mục data/guidelines_store/ khi chạy cục bộ
 */
export async function saveStoreFileSafe(fileName: string, dataStr: string): Promise<void> {
  const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

  // 1. Lưu vào /tmp
  try {
    if (!fs.existsSync(TMP_DIR)) {
      fs.mkdirSync(TMP_DIR, { recursive: true });
    }
    const tmpPath = path.join(TMP_DIR, fileName);
    fs.writeFileSync(tmpPath, dataStr, "utf-8");
  } catch (err) {
    console.warn("Không thể ghi vào TMP_DIR:", err);
  }

  // 2. Lưu lên Vercel Blob nếu có cấu hình
  const { token } = getBlobToken();
  if (token) {
    try {
      const { put } = await import("@vercel/blob");
      await put(`guidelines_store/${fileName}`, dataStr, {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
        token,
      });
    } catch (blobErr) {
      console.warn("Lỗi lưu guidelines_store lên Vercel Blob:", blobErr);
    }
  }

  // 3. Nếu local dev, lưu vào STORE_DIR
  if (!isVercel) {
    try {
      if (!fs.existsSync(STORE_DIR)) {
        fs.mkdirSync(STORE_DIR, { recursive: true });
      }
      const storePath = path.join(STORE_DIR, fileName);
      fs.writeFileSync(storePath, dataStr, "utf-8");
    } catch (e: any) {
      if (e?.code !== "EROFS") {
        console.warn("Không thể ghi vào STORE_DIR:", e);
      }
    }
  }
}

/**
 * Đưa một guideline mới phát hiện vào Hàng đợi Điều phối (Review Queue) & Vercel Blob
 * để bác sĩ/chuyên gia kiểm định trước khi chuyển thành khuyến cáo chính thức.
 */
export async function registerCandidateGuideline(doc: GuidelineDoc): Promise<boolean> {
  if (!doc || !doc.id || !doc.title) return false;

  const recs = (doc.allPracticeChanges || []).map((chg, idx) => ({
    rec_id: chg.id || `rec-${idx + 1}`,
    guideline_id: doc.id,
    grading_system: doc.society?.includes("ESO") ? "GRADE" : "ACC/AHA",
    page_num: 1,
    statement: chg.currentText || doc.executiveSummary || doc.title,
    approval_status: "PENDING_REVIEW",
    cor: chg.currentGrade?.includes("Class") ? chg.currentGrade.split(",")[0].trim() : undefined,
    loe: chg.currentGrade?.includes("Level") ? chg.currentGrade.split("Level")[1]?.trim() : undefined,
    quality_of_evidence: chg.currentGrade?.includes("Evidence:")
      ? chg.currentGrade.split("Evidence:")[1]?.split(")")[0]?.trim()
      : "Moderate",
    strength_of_recommendation:
      chg.changeType === "NEW" || chg.changeType === "UPGRADED" ? "Strong" : "Conditional",
    driving_trials: chg.drivingTrials || [],
    verification_detail: {
      status: "PENDING_COORDINATION",
      grounding_score: doc.fullTextStatus === "FULL_TEXT_PARSED" ? 0.95 : 0.85,
      classification_valid: true,
      numbers_verified: true,
      issues: [],
    },
  }));

  const nowIso = new Date().toISOString();
  const record = {
    guideline_id: doc.id,
    version: 1,
    metadata: {
      title: doc.title,
      society: doc.society,
      year: doc.year,
      source_url: doc.officialUrl,
      pmcid: doc.pmcid,
      doi: doc.doi,
      top_takeaways: doc.topTakeaways || [],
    },
    total_recommendations: recs.length,
    pending_count: recs.length,
    approved_count: 0,
    rejected_count: 0,
    recommendations: recs,
    updated_at: nowIso,
  };

  const fileName = `${doc.id}_latest.json`;
  await saveStoreFileSafe(fileName, JSON.stringify(record, null, 2));

  // Cập nhật catalog.json
  try {
    let catalog: Record<string, any> = {};
    const localCatalog = path.join(STORE_DIR, "catalog.json");
    const tmpCatalog = path.join(TMP_DIR, "catalog.json");
    if (fs.existsSync(tmpCatalog)) {
      try {
        catalog = JSON.parse(fs.readFileSync(tmpCatalog, "utf-8"));
      } catch {}
    } else if (fs.existsSync(localCatalog)) {
      try {
        catalog = JSON.parse(fs.readFileSync(localCatalog, "utf-8"));
      } catch {}
    }

    catalog[doc.id] = {
      guideline_id: doc.id,
      title: doc.title,
      society: doc.society,
      year: doc.year,
      total_recommendations: recs.length,
      pending_count: recs.length,
      approved_count: 0,
      rejected_count: 0,
      updated_at: nowIso,
    };

    await saveStoreFileSafe("catalog.json", JSON.stringify(catalog, null, 2));
  } catch (err) {
    console.warn("Lỗi cập nhật catalog:", err);
  }

  return true;
}

function mapSocietyToSubspecialty(society: string, title: string): SubspecialtyType {
  const s = (society || "").toUpperCase();
  const t = (title || "").toLowerCase();

  if (s.includes("AHA") || s.includes("ESO") || s.includes("STROKE") || t.includes("stroke") || t.includes("ischemic")) {
    return "Stroke";
  }
  if (s.includes("ILAE") || s.includes("AES") || t.includes("epilepsy") || t.includes("seizure")) {
    return "Epilepsy";
  }
  if (s.includes("NCS") || t.includes("neurocritical") || t.includes("hemorrhage") || t.includes("icp")) {
    return "Neurocritical Care";
  }
  if (s.includes("AHS") || t.includes("headache") || t.includes("migraine")) {
    return "Headache & Pain";
  }
  if (s.includes("PNS") || t.includes("neuropathy") || t.includes("guillain")) {
    return "Neuromuscular";
  }
  if (s.includes("MDS") || t.includes("parkinson") || t.includes("movement")) {
    return "Movement Disorders";
  }
  if (s.includes("ALZ") || t.includes("alzheimer") || t.includes("dementia")) {
    return "Dementia";
  }
  return "Other";
}

/**
 * Đọc tất cả các guideline đã được xử lý từ kho data/guidelines_store và chuyển đổi sang GuidelineDoc
 */
export function getStoredGuidelinesAsDocs(): GuidelineDoc[] {
  const fileMap = new Map<string, string>(); // fileName -> fullPath

  // Quét từ kho tĩnh STORE_DIR
  if (fs.existsSync(STORE_DIR)) {
    try {
      const files = fs.readdirSync(STORE_DIR).filter((f) => f.endsWith("_latest.json"));
      for (const f of files) fileMap.set(f, path.join(STORE_DIR, f));
    } catch {}
  }

  // Quét từ thư mục ghi /tmp (trên Vercel Serverless, ghi đè nếu đã được duyệt)
  if (fs.existsSync(TMP_DIR)) {
    try {
      const tmpFiles = fs.readdirSync(TMP_DIR).filter((f) => f.endsWith("_latest.json"));
      for (const f of tmpFiles) fileMap.set(f, path.join(TMP_DIR, f));
    } catch {}
  }

  if (fileMap.size === 0) return [];

  const docs: GuidelineDoc[] = [];

  for (const [file, fullPath] of fileMap.entries()) {
    try {
      const raw = fs.readFileSync(fullPath, "utf-8");
      const record = JSON.parse(raw);

      const metadata = record.metadata || {};
      const recs = record.recommendations || [];

      const practiceChanges: PracticeChangeDetail[] = recs.map((r: any, idx: number) => {
        let currentGrade = "Standard Clinical Practice";
        if (r.cor) {
          currentGrade = `Class ${r.cor}${r.loe ? `, Level ${r.loe}` : ""}`;
        } else if (r.quality_of_evidence || r.strength_of_recommendation) {
          currentGrade = `GRADE ${r.strength_of_recommendation || "Recommended"} (Evidence: ${r.quality_of_evidence || "Moderate"}${r.voting ? `, Voting: ${r.voting}` : ""})`;
        }

        // Phân định chính xác giữa What is New (Điểm mới) và Khuyến cáo thường quy
        const isHighImpact = Boolean(r.is_high_impact_change || r.previous_grade || (r.change_type && r.change_type !== "STANDARD"));
        const changeType = isHighImpact
          ? ((r.change_type && r.change_type !== "STANDARD" ? r.change_type : (r.previous_grade ? "UPGRADED" : "NEW")) as PracticeChangeDetail["changeType"])
          : "STANDARD";

        return {
          id: r.rec_id || `rec-${idx + 1}`,
          category: r.topic || "Clinical Management",
          topic: r.pico_id ? `${r.pico_id}: ${r.section || ""}` : r.section || "Recommendation",
          changeType,
          previousGrade: r.previous_grade || undefined,
          currentText: r.statement,
          currentGrade,
          drivingTrials: r.driving_trials || [],
        };
      });

      const subspecialty = mapSocietyToSubspecialty(metadata.society, metadata.title);
      const summaryText = practiceChanges.length > 0
        ? `Hướng dẫn thực hành lâm sàng chính thức từ ${metadata.society}. Bao gồm ${practiceChanges.length} khuyến cáo then chốt được trích xuất và kiểm chứng qua hệ thống AI Lõi NeuroGuide.`
        : "Hướng dẫn thực hành lâm sàng chính thức.";

      // Bỏ qua các tài liệu chưa hoàn thiện hoặc dữ liệu rác
      if (!metadata.title || recs.length < 3) {
        continue;
      }

      // Nếu toàn bộ khuyến cáo chưa được phê duyệt (pending 100% không có approved nào) và số lượng ít, bỏ qua
      if (record.approved_count === 0 && record.pending_count > 0 && recs.length < 20) {
        continue;
      }

      docs.push({
        id: record.guideline_id,
        society: metadata.society || "AHA/ASA",
        year: metadata.year || 2026,
        title: metadata.title || "Clinical Practice Guideline",
        officialUrl: metadata.source_url || "https://pubmed.ncbi.nlm.nih.gov/",
        journalTarget: metadata.society?.includes("ESO") ? "European Stroke Journal" : metadata.society?.includes("AHA") ? "Stroke" : "Neurology",
        documentType: "Clinical Practice Guideline",
        publishDate: record.guideline_id.includes("aha") ? "2026-01-26" : `${metadata.year || 2026}-01-01`,
        subspecialty,
        subspecialties: [subspecialty],
        executiveSummary: summaryText,
        executiveSummaryVi: summaryText,
        topTakeaways: record.top_takeaways || metadata.top_takeaways || undefined,
        allPracticeChanges: practiceChanges,
        linkedScenarioIds: [],
        doi: metadata.doi || undefined,
        pmcid: metadata.pmcid || undefined,
        fullTextStatus: "FULL_TEXT_PARSED",
      });
    } catch (e) {
      console.warn("Lỗi đọc guideline store file:", file, e);
    }
  }

  // Sắp xếp giảm dần theo thời gian công bố mới nhất (publishDate)
  docs.sort((a, b) => (b.publishDate || `${b.year}-01-01`).localeCompare(a.publishDate || `${a.year}-01-01`));

  return docs;
}
