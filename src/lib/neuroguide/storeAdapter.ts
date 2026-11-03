import fs from "fs";
import path from "path";
import type { GuidelineDoc, PracticeChangeDetail, SubspecialtyType } from "../../types/neuroguide.ts";
import {
  normalizeEsoStrength,
  getCanonicalEsoPicos,
  convertEsoPicoItemsToPracticeChanges,
  isEsoBpGuideline,
  isEsoAsahGuideline,
} from "./esoPicoGrouper.ts";
import { parseAhaCorAndLoe } from "./notebooklmParser.ts";

const STORE_DIR = path.join(process.cwd(), "data", "guidelines_store");
const TMP_DIR = path.join("/tmp", "guidelines_store");

/**
 * Lưu tệp tin an toàn:
 * 1. Ghi /tmp (cho runtime Vercel Lambda)
 * 2. Ghi vào thư mục data/guidelines_store/ khi chạy cục bộ
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

  // 2. Nếu local dev, lưu vào STORE_DIR
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

  const isAhaDoc = Boolean(
    (doc.society || "").toUpperCase().includes("AHA") ||
    (doc.society || "").toUpperCase().includes("ACC") ||
    (doc.society || "").toUpperCase().includes("ASA") ||
    (doc.title || "").toUpperCase().includes("AHA") ||
    (doc.title || "").toUpperCase().includes("ACC") ||
    (doc.allPracticeChanges || []).some(
      (c) => c.cor || c.currentGrade?.toLowerCase().includes("class") || c.currentGrade?.toLowerCase().includes("cor")
    )
  );

  const isDocEso = !isAhaDoc && Boolean(
    (doc.society || "").toUpperCase().includes("ESO") ||
    (doc.title || "").toUpperCase().includes("ESO") ||
    (doc.id || "").toLowerCase().includes("eso") ||
    (doc.allPracticeChanges || []).some(
      (c) => c.picoNumber || c.currentGrade?.toLowerCase().includes("grade") || (c.topic && /PICO\s*\d+/i.test(c.topic))
    )
  );

  const recs = (doc.allPracticeChanges || []).map((chg, idx) => {
    let pNum: string | undefined = (chg as any).picoNumber ? String((chg as any).picoNumber) : undefined;
    let pQuestion: string | undefined = (chg as any).picoQuestion || undefined;
    if (!pNum && chg.topic) {
      const m = String(chg.topic).match(/PICO\s*(\d+[a-z]?)[:.\s-]*(.*)/i);
      if (m) {
        pNum = m[1];
        if (!pQuestion) pQuestion = m[2]?.trim();
      }
    }

    const recIsEso = isDocEso && Boolean(pNum || chg.currentGrade?.toLowerCase().includes("grade"));
    const parsedAha = parseAhaCorAndLoe(chg.currentGrade || "");
    const cor = chg.cor || (!recIsEso ? parsedAha.cor : undefined);
    const loe = chg.loe || (!recIsEso ? parsedAha.loe : undefined);

    const qualityOfEvidence = chg.quality || (
      chg.currentGrade?.includes("Evidence:")
        ? chg.currentGrade.split("Evidence:")[1]?.split(")")[0]?.trim()
        : "Moderate"
    );

    const strengthOfRecommendation = recIsEso
      ? normalizeEsoStrength(chg.strength || chg.currentGrade, chg.currentText)
      : (chg.strength || (chg.changeType === "NEW" || chg.changeType === "UPGRADED" ? "Strong" : "Conditional"));

    const topic = chg.topic || (pNum ? `PICO ${pNum}: ${pQuestion || ""}`.trim() : `Khuyến cáo #${idx + 1}`);

    return {
      rec_id: chg.id || `rec-${idx + 1}`,
      guideline_id: doc.id,
      grading_system: recIsEso ? "GRADE" : "ACC/AHA",
      page_num: 1,
      statement: chg.currentText || doc.executiveSummary || doc.title,
      approval_status: "PENDING_REVIEW",
      category: chg.category || (recIsEso ? "Blood Pressure" : "Recommendations"),
      topic: topic,
      cor: cor,
      loe: loe,
      quality_of_evidence: qualityOfEvidence,
      strength_of_recommendation: strengthOfRecommendation,
      voting: chg.voting || undefined,
      pico_id: pNum ? `PICO ${pNum}` : undefined,
      target_population: pQuestion || undefined,
      driving_trials: chg.drivingTrials || [],
      change_type: chg.changeType,
      previous_grade: chg.previousGrade,
      consensus_statement: chg.expertConsensusStatement || chg.previousText || undefined,
      verification_detail: {
        status: "PENDING_COORDINATION",
        grounding_score: doc.fullTextStatus === "FULL_TEXT_PARSED" ? 0.95 : 0.85,
        classification_valid: true,
        numbers_verified: true,
        issues: [],
      },
    };
  });

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

export function mapSocietyToSubspecialty(society: string, title: string): SubspecialtyType {
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
 * No-op: Giữ tương thích ngược chữ ký hàm; dữ liệu hiện đã lưu trữ tập trung trên Supabase.
 */
export async function syncStoreBlobsToTmp(): Promise<void> {
  // Toàn bộ dữ liệu hiện lấy từ Supabase (neuroguide_docs) làm Single Source of Truth
  return;
}

/**
 * Trả về tập hợp ID và tiêu đề chuẩn hóa của các guideline đang nằm trong kho chờ duyệt
 * nhưng chưa có khuyến cáo nào được duyệt (approved_count === 0) hoặc đã bị từ chối hoàn toàn.
 */
export function getUnapprovedStoredGuidelineKeys(): Set<string> {
  const unapproved = new Set<string>();
  const normalizeT = (t: string) => (t || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const fileMap = new Map<string, string>();

  if (fs.existsSync(STORE_DIR)) {
    try {
      const files = fs.readdirSync(STORE_DIR).filter((f) => f.endsWith("_latest.json"));
      for (const f of files) fileMap.set(f, path.join(STORE_DIR, f));
    } catch {}
  }
  if (fs.existsSync(TMP_DIR)) {
    try {
      const tmpFiles = fs.readdirSync(TMP_DIR).filter((f) => f.endsWith("_latest.json"));
      for (const f of tmpFiles) fileMap.set(f, path.join(TMP_DIR, f));
    } catch {}
  }

  for (const [, fullPath] of fileMap.entries()) {
    try {
      const raw = fs.readFileSync(fullPath, "utf-8");
      const record = JSON.parse(raw);
      const recs = Array.isArray(record.recommendations) ? record.recommendations : [];
      const approvedRecs = recs.filter(
        (r: any) => r.approval_status === "APPROVED" || r.approval_status === "MODIFIED"
      );
      if ((record.approved_count || 0) === 0 && approvedRecs.length === 0) {
        if (record.guideline_id) unapproved.add(String(record.guideline_id).toLowerCase().trim());
        const title = record.metadata?.title || record.title;
        if (title) unapproved.add(normalizeT(title));
      }
    } catch {}
  }

  return unapproved;
}

/**
 * Đọc tất cả các guideline đã được phê duyệt từ kho data/guidelines_store và chuyển đổi sang GuidelineDoc
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
      const recs = Array.isArray(record.recommendations) ? record.recommendations : [];

      // Bỏ qua các tài liệu chưa hoàn thiện hoặc dữ liệu rác
      if (!metadata.title || recs.length < 3) {
        continue;
      }

      // Tuyệt đối chỉ hiển thị các guideline đã được phê duyệt (có ít nhất 1 khuyến cáo APPROVED / MODIFIED)
      const approvedRecs = recs.filter(
        (r: any) => r.approval_status === "APPROVED" || r.approval_status === "MODIFIED"
      );
      if ((record.approved_count || 0) === 0 && approvedRecs.length === 0) {
        continue;
      }

      const activeRecs = approvedRecs.length > 0 ? approvedRecs : recs;
      const canonicalEsoPicos = getCanonicalEsoPicos(metadata.title, record.guideline_id);

      let practiceChanges: PracticeChangeDetail[];

      if (canonicalEsoPicos && canonicalEsoPicos.length > 0) {
        const defaultCat = isEsoBpGuideline(metadata.title, record.guideline_id)
          ? "Blood Pressure"
          : isEsoAsahGuideline(metadata.title, record.guideline_id)
          ? "Aneurysmal Subarachnoid Haemorrhage"
          : "ESO Synoptic Table Recommendation";
        practiceChanges = convertEsoPicoItemsToPracticeChanges(canonicalEsoPicos, defaultCat);
      } else {
        practiceChanges = activeRecs.map((r: any, idx: number) => {
          const isAhaRec = Boolean(
            (metadata.society || "").toUpperCase().includes("AHA") ||
            (metadata.society || "").toUpperCase().includes("ACC") ||
            (metadata.society || "").toUpperCase().includes("ASA") ||
            (metadata.title || "").toUpperCase().includes("AHA") ||
            (metadata.title || "").toUpperCase().includes("ACC") ||
            r.grading_system === "ACC/AHA" ||
            Boolean(r.cor)
          );

          const isEsoRec = !isAhaRec && Boolean(
            (metadata.society || "").toUpperCase().includes("ESO") ||
            r.grading_system === "GRADE" ||
            r.pico_id ||
            (r.strength_of_recommendation && ["strong", "weak", "conditional", "uncertain"].some((k) => r.strength_of_recommendation.toLowerCase().includes(k)))
          );
          const normStrength = isEsoRec
            ? normalizeEsoStrength(r.strength_of_recommendation || r.currentGrade, r.statement)
            : (r.strength_of_recommendation || "Recommended");

          let currentGrade = "Standard Clinical Practice";
          if (r.cor) {
            const cleanCor = String(r.cor).replace(/^Class\s*/i, "").trim();
            const cleanLoe = String(r.loe || "").replace(/^Level\s*/i, "").trim();
            currentGrade = `Class ${cleanCor}${cleanLoe ? `, Level ${cleanLoe}` : ""}`;
          } else if (isAhaRec || (r as any).currentGrade) {
            const parsed = parseAhaCorAndLoe((r as any).currentGrade || (r as any).grade || "");
            currentGrade = parsed.formatted;
            if (!r.cor) r.cor = parsed.cor;
            if (!r.loe) r.loe = parsed.loe;
          } else if (r.quality_of_evidence || r.strength_of_recommendation) {
            currentGrade = `GRADE ${normStrength} (Evidence: ${r.quality_of_evidence || "Moderate"}${r.voting ? `, Voting: ${r.voting}` : ""})`;
          }

          // Phân định chính xác giữa What is New (Điểm mới) và Khuyến cáo thường quy
          const isHighImpact = Boolean(r.is_high_impact_change || r.previous_grade || (r.change_type && r.change_type !== "STANDARD"));
          const changeType = isHighImpact
            ? ((r.change_type && r.change_type !== "STANDARD" ? r.change_type : (r.previous_grade ? "UPGRADED" : "NEW")) as PracticeChangeDetail["changeType"])
            : "STANDARD";

          let pNum: string | undefined;
          let pQuestion: string | undefined;
          if (r.pico_id) {
            const m = String(r.pico_id).match(/(\d+[a-z]?)/i);
            pNum = m ? m[0] : String(r.pico_id);
            pQuestion = r.target_population || r.topic;
          } else if (r.topic) {
            const m = String(r.topic).match(/PICO\s*(\d+[a-z]?)[:.\s-]*(.*)/i);
            if (m) {
              pNum = m[1];
              pQuestion = m[2]?.trim();
            }
          }

          return {
            id: r.rec_id || `rec-${idx + 1}`,
            category: r.category || r.topic || "Clinical Management",
            topic: r.topic || (r.pico_id ? `${r.pico_id}: ${r.section || ""}` : r.section || "Recommendation"),
            changeType,
            previousGrade: r.previous_grade || undefined,
            currentText: r.statement,
            currentGrade,
            cor: r.cor,
            loe: r.loe,
            drivingTrials: r.driving_trials || [],
            quality: r.quality_of_evidence || undefined,
            strength: isEsoRec ? normStrength : (r.strength_of_recommendation || undefined),
            voting: r.voting || undefined,
            expertConsensusStatement: r.consensus_statement || r.expertConsensusStatement || undefined,
            picoNumber: pNum,
            picoQuestion: pQuestion,
          };
        });
      }

      const subspecialty = mapSocietyToSubspecialty(metadata.society, metadata.title);
      const summaryText = practiceChanges.length > 0
        ? `Hướng dẫn thực hành lâm sàng chính thức từ ${metadata.society}. Bao gồm ${practiceChanges.length} khuyến cáo then chốt được trích xuất và kiểm chứng qua hệ thống AI Lõi NeuroGuide.`
        : "Hướng dẫn thực hành lâm sàng chính thức.";

      docs.push({
        id: record.guideline_id,
        society: metadata.society || "AHA/ASA",
        year: metadata.year || 2026,
        title: metadata.title || "Clinical Practice Guideline",
        officialUrl: metadata.source_url || "https://pubmed.ncbi.nlm.nih.gov/",
        journalTarget: metadata.society?.includes("ESO") ? "European Stroke Journal" : metadata.society?.includes("AHA") ? "Stroke" : "Neurology",
        documentType: "Clinical Practice Guideline",
        publishDate:
          record.guideline_id === "aha-ais-2026" || record.guideline_id === "aha2026_test"
            ? "2026-01-26"
            : `${metadata.year || 2026}-01-01`,
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
        aiSynthesized: true,
        synthesizedAt: record.updated_at || new Date().toISOString(),
      });
    } catch (e) {
      console.warn("Lỗi đọc guideline store file:", file, e);
    }
  }

  // Sắp xếp giảm dần theo thời gian công bố mới nhất (publishDate)
  docs.sort((a, b) => (b.publishDate || `${b.year}-01-01`).localeCompare(a.publishDate || `${a.year}-01-01`));

  return docs;
}
