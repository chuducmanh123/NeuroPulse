import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { GuidelineDoc, PracticeChangeDetail } from "@/types/neuroguide";
import {
  mapSocietyToSubspecialty,
  saveStoreFileSafe,
  buildGuidelineRecordFromDoc,
} from "@/lib/neuroguide/storeAdapter";
import {
  loadMergedNeuroGuideData,
  saveNeuroGuideToActiveStorage,
  getCoreTopicKey,
  normalizeGuidelineTitle,
} from "@/lib/neuroguide/guidelineStorage";
import {
  getCanonicalEsoPicos,
  convertEsoPicoItemsToPracticeChanges,
  isEsoBpGuideline,
} from "@/lib/neuroguide/esoPicoGrouper";
import { parseAhaCorAndLoe } from "@/lib/neuroguide/notebooklmParser";
import { verifyAdminToken } from "@/utils/security";
import { supabaseAdmin, hasSupabaseConfig } from "@/lib/supabase";

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
    top_takeaways?: string[];
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
 * Đọc nội dung tệp tin: Ưu tiên /tmp (phiên hiện tại), sau đó kho tĩnh STORE_DIR.
 */
async function getFileContentAsync(fileName: string): Promise<{ content: string; sourcePath: string } | null> {
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
 * Lưu tệp tin an toàn và đồng bộ trạng thái chờ duyệt/từ chối lên Supabase
 */
async function saveFileSafe(fileName: string, dataStr: string): Promise<void> {
  await saveStoreFileSafe(fileName, dataStr);
}

/**
 * Nạp tập hợp GuidelineRecord hợp nhất từ STORE_DIR, TMP_DIR và Supabase (neuroguide_docs).
 * Đảm bảo trên Vercel Serverless mọi Lambda instance đều nhìn thấy cùng một trạng thái Hàng đợi Duyệt.
 */
async function loadUnifiedStoreRecords(): Promise<{
  recordsMap: Map<string, GuidelineRecord>;
  supabaseApprovedKeys: Set<string>;
  supabaseDeletedKeys: Set<string>;
  supabasePendingKeys: Set<string>;
}> {
  const recordsMap = new Map<string, GuidelineRecord>();
  const supabaseApprovedKeys = new Set<string>();
  const supabaseDeletedKeys = new Set<string>();
  const supabasePendingKeys = new Set<string>();

  // 1. Quét từ STORE_DIR (kho tĩnh)
  if (fs.existsSync(STORE_DIR)) {
    try {
      const files = fs.readdirSync(STORE_DIR).filter((f) => f.endsWith("_latest.json"));
      for (const f of files) {
        try {
          const parsed: GuidelineRecord = JSON.parse(fs.readFileSync(path.join(STORE_DIR, f), "utf-8"));
          if (parsed && parsed.guideline_id) {
            recordsMap.set(f, parsed);
          }
        } catch {}
      }
    } catch {}
  }

  // 2. Quét từ TMP_DIR (ghi đè từ runtime Lambda hiện tại)
  if (fs.existsSync(TMP_DIR)) {
    try {
      const tmpFiles = fs.readdirSync(TMP_DIR).filter((f) => f.endsWith("_latest.json"));
      for (const f of tmpFiles) {
        try {
          const parsed: GuidelineRecord = JSON.parse(fs.readFileSync(path.join(TMP_DIR, f), "utf-8"));
          if (parsed && parsed.guideline_id) {
            recordsMap.set(f, parsed);
          }
        } catch {}
      }
    } catch {}
  }

  // 3. Đối chiếu với Supabase (Single Source of Truth trên Cloud)
  if (hasSupabaseConfig()) {
    try {
      const { data } = await supabaseAdmin
        .from("neuroguide_docs")
        .select("id, title, organization, year, status, data, updated_at");
      if (Array.isArray(data)) {
        for (const row of data as any[]) {
          if (row.id === "system_clinical_scenarios" || String(row.id).startsWith("neurorx_")) {
            if (row.id === "system_clinical_scenarios" && Array.isArray(row.data?.deletedGuidelineIds)) {
              row.data.deletedGuidelineIds.forEach((x: string) => {
                if (x) supabaseDeletedKeys.add(String(x).toLowerCase().trim());
              });
            }
            continue;
          }
          const rowStatus = String(row.status || row.data?.status || "approved").toLowerCase().trim();
          const rowId = String(row.id || row.data?.id || "").trim();
          const lowerId = rowId.toLowerCase();
          const fileName = `${rowId}_latest.json`;

          if (rowStatus === "deleted" || rowStatus === "rejected") {
            if (lowerId) supabaseDeletedKeys.add(lowerId);
          } else if (rowStatus === "pending" || rowStatus === "pending_review") {
            if (lowerId) supabasePendingKeys.add(lowerId);
            // Khôi phục GuidelineRecord từ Supabase cho bất kỳ container Lambda nào chưa có file trong /tmp
            const embeddedRec = row.data?._reviewRecord as GuidelineRecord | undefined;
            const rebuiltRec =
              embeddedRec && Array.isArray(embeddedRec.recommendations) && embeddedRec.recommendations.length > 0
                ? embeddedRec
                : row.data && Array.isArray(row.data.allPracticeChanges)
                ? (buildGuidelineRecordFromDoc(row.data as GuidelineDoc, "PENDING_REVIEW") as GuidelineRecord)
                : null;
            if (rebuiltRec) {
              recordsMap.set(fileName, rebuiltRec);
            }
          } else {
            // rowStatus === "approved"
            const embeddedPending = Number(row.data?._reviewRecord?.pending_count || 0);
            if (embeddedPending > 0 && row.data?._reviewRecord) {
              if (lowerId) supabasePendingKeys.add(lowerId);
              recordsMap.set(fileName, row.data._reviewRecord as GuidelineRecord);
            } else {
              if (lowerId) supabaseApprovedKeys.add(lowerId);
              // Nếu chưa có trong recordsMap (hoặc bản local đang lệch), đồng bộ bản APPROVED từ Supabase
              if (row.data && Array.isArray(row.data.allPracticeChanges) && row.data.allPracticeChanges.length > 0) {
                const approvedRec = buildGuidelineRecordFromDoc(row.data as GuidelineDoc, "APPROVED") as GuidelineRecord;
                recordsMap.set(fileName, approvedRec);
              }
            }
          }
        }

        // Bảo đảm các ID đang pending hoặc đã approved trên Supabase không bao giờ nằm trong supabaseDeletedKeys
        for (const pk of supabasePendingKeys) {
          supabaseDeletedKeys.delete(pk);
        }
        for (const ak of supabaseApprovedKeys) {
          supabaseDeletedKeys.delete(ak);
        }
      }
    } catch (sbErr) {
      console.warn("Không thể đọc neuroguide_docs trong review-queue:", sbErr);
    }
  }

  return { recordsMap, supabaseApprovedKeys, supabaseDeletedKeys, supabasePendingKeys };
}

export async function GET(request: NextRequest) {
  try {
    const activeData = await loadMergedNeuroGuideData();
    const { recordsMap, supabaseApprovedKeys, supabaseDeletedKeys, supabasePendingKeys } = await loadUnifiedStoreRecords();

    const deletedSet = new Set<string>([
      ...(activeData.deletedGuidelineIds || []).map((x) => x.toLowerCase().trim()),
      ...Array.from(supabaseDeletedKeys),
    ]);

    const cloudPath = path.join(process.cwd(), "public", "data", "neuroguide_cloud.json");
    if (fs.existsSync(cloudPath)) {
      try {
        const raw = fs.readFileSync(cloudPath, "utf-8");
        const cloudData = JSON.parse(raw);
        const cloudDeleted = cloudData.deletedGuidelineIds || cloudData.deleted_guideline_ids || [];
        cloudDeleted.forEach((x: string) => {
          const k = x.toLowerCase().trim();
          if (!supabaseApprovedKeys.has(k) && !supabasePendingKeys.has(k)) deletedSet.add(k);
        });
      } catch {}
    }

    for (const pk of supabasePendingKeys) {
      deletedSet.delete(pk);
    }

    const isGuidelineExcludedFromQueue = (gId: string, cleanF: string): boolean => {
      const normGId = gId.toLowerCase().trim();
      const normF = cleanF.toLowerCase().trim();

      // Nếu bản ghi này đang được đánh dấu là pending mới trên Supabase -> luôn cho phép hiển thị
      if (supabasePendingKeys.has(normGId) || supabasePendingKeys.has(normF)) return false;

      // 1. Chỉ loại khỏi hàng đợi theo đúng ID (không chặn theo title hay topic để tránh chặn nhầm guideline mới thêm vào)
      if (deletedSet.has(normGId) || deletedSet.has(normF)) return true;

      // 2. Nếu đúng ID này đã được phê duyệt hoàn tất trên Supabase -> không hiển thị lại trong Review Queue
      if (supabaseApprovedKeys.has(normGId) || supabaseApprovedKeys.has(normF)) return true;

      return false;
    };

    const queue: Array<StoredRec & { guideline_title: string; society: string; year?: number }> = [];
    const seenRecKeys = new Set<string>();

    for (const [file, record] of recordsMap.entries()) {
      try {
        const cleanFileName = file.replace(/_latest\.json$/i, "").toLowerCase();
        const fileGId = (record.guideline_id || "").toLowerCase().trim();

        if (isGuidelineExcludedFromQueue(fileGId, cleanFileName)) {
          continue;
        }

        for (const rec of record.recommendations || []) {
          const status = (rec.approval_status || "").toUpperCase();
          if (status === "PENDING_REVIEW" || status === "PENDING") {
            const dedupKey = `${record.guideline_id}::${rec.rec_id}`;
            if (seenRecKeys.has(dedupKey)) continue;
            seenRecKeys.add(dedupKey);

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

  const isAha =
    (record.metadata.society || "").toUpperCase().includes("AHA") ||
    (record.metadata.society || "").toUpperCase().includes("ASA") ||
    (record.metadata.society || "").toUpperCase().includes("ACC") ||
    (record.metadata.title || "").toUpperCase().includes("AHA") ||
    (record.metadata.title || "").toUpperCase().includes("ASA") ||
    (record.metadata.title || "").toUpperCase().includes("ACC") ||
    record.recommendations.some((r) => r.grading_system === "ACC/AHA" || Boolean(r.cor));

  const canonicalEsoPicos = !isAha ? getCanonicalEsoPicos(record.metadata.title, record.guideline_id) : null;

  const practiceChanges: PracticeChangeDetail[] =
    canonicalEsoPicos && canonicalEsoPicos.length > 0
      ? convertEsoPicoItemsToPracticeChanges(
          canonicalEsoPicos,
          isEsoBpGuideline(record.metadata.title, record.guideline_id)
            ? "Blood Pressure Management (ESO GRADE)"
            : "Aneurysmal Subarachnoid Haemorrhage (ESO GRADE)"
        )
      : approvedRecs.map((r, idx) => {
          let currentGrade = "Standard Clinical Practice";
          if (r.cor) {
            const cleanCor = String(r.cor).replace(/^Class\s*/i, "").trim();
            const cleanLoe = String(r.loe || "").replace(/^Level\s*/i, "").trim();
            currentGrade = `Class ${cleanCor}${cleanLoe ? `, Level ${cleanLoe}` : ""}`;
          } else if (r.grading_system === "ACC/AHA" || (r as any).currentGrade) {
            const parsed = parseAhaCorAndLoe((r as any).currentGrade || (r as any).grade || "");
            currentGrade = parsed.formatted;
            if (!r.cor) r.cor = parsed.cor;
            if (!r.loe) r.loe = parsed.loe;
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

          const isExplicitChange = Boolean(
            (r as any).is_high_impact_change ||
            (r as any).previous_grade ||
            ((r as any).change_type && (r as any).change_type !== "STANDARD")
          );
          const changeType: PracticeChangeDetail["changeType"] = isExplicitChange
            ? (((r as any).change_type && (r as any).change_type !== "STANDARD"
                ? (r as any).change_type
                : (r as any).previous_grade ? "UPGRADED" : "NEW") as PracticeChangeDetail["changeType"])
            : "STANDARD";

          let pNum: string | undefined;
          let pQuestion: string | undefined;
          if (r.pico_id) {
            const m = String(r.pico_id).match(/(\d+[a-z]?)/i);
            pNum = m ? m[1] : String(r.pico_id);
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
            category: clinicalCategory,
            topic: clinicalTopic,
            changeType,
            currentText: r.statement,
            currentGrade,
            drivingTrials: r.driving_trials || [],
            quality: r.quality_of_evidence || undefined,
            strength: r.strength_of_recommendation || undefined,
            voting: r.voting || undefined,
            expertConsensusStatement: (r as any).consensus_statement || (r as any).expertConsensusStatement || undefined,
            picoNumber: pNum,
            picoQuestion: pQuestion,
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

  if (Array.isArray(activeData.deletedGuidelineIds)) {
    activeData.deletedGuidelineIds = activeData.deletedGuidelineIds.filter(
      (d) => d.toLowerCase() !== targetId.toLowerCase() && d.toLowerCase() !== normTitle
    );
  }

  if (existingIdx >= 0) {
    const existing = activeData.guidelines[existingIdx];
    activeData.guidelines[existingIdx] = {
      ...existing,
      id: targetId || existing.id,
      title: record.metadata.title || existing.title,
      society: record.metadata.society || existing.society,
      year: record.metadata.year || existing.year,
      allPracticeChanges: practiceChanges,
      topTakeaways: record.metadata.top_takeaways || [],
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
      topTakeaways: record.metadata.top_takeaways || [],
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
    deletedGuidelineIds: activeData.deletedGuidelineIds,
  });
}

export async function POST(request: NextRequest) {
  try {
    const adminToken = request.headers.get("x-admin-token") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!verifyAdminToken(adminToken)) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized. Administrator credentials required." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, file_id, guideline_id, rec_id, reviewer, notes, modified_statement, updated_item, doc_id } = body;

    // 1. CHỨC NĂNG DUYỆT TẤT CẢ HOẶC DUYỆT TOÀN BỘ 1 GUIDELINE (APPROVE ALL / APPROVE GUIDELINE)
    if (action === "APPROVE_ALL" || action === "APPROVE_GUIDELINE") {
      let totalApproved = 0;
      const { recordsMap } = await loadUnifiedStoreRecords();

      const targetGId = (guideline_id || file_id || doc_id || "").toLowerCase().trim();
      const cleanGId = targetGId.replace(/_latest\.json$/i, "");

      for (const [fileName, rec] of recordsMap.entries()) {
        try {
          const fileGId = (rec.guideline_id || "").toLowerCase().trim();
          const cleanFileName = fileName.replace(/_latest\.json$/i, "").toLowerCase();

          // Kiểm tra xem file có khớp với targetGId không
          const isMatch =
            targetGId === "all" ||
            !targetGId ||
            fileGId === cleanGId ||
            cleanFileName === cleanGId ||
            cleanFileName.startsWith(cleanGId) ||
            cleanGId.startsWith(cleanFileName);

          if (!isMatch) continue;

          let modified = 0;
          for (const r of rec.recommendations) {
            if (r.approval_status === "PENDING_REVIEW" || r.approval_status === "PENDING") {
              r.approval_status = "APPROVED";
              r.reviewed_by = reviewer || "Bác sĩ chuyên khoa";
              r.reviewed_at = new Date().toISOString();
              modified++;
            }
          }
          if (modified > 0 || (targetGId && targetGId !== "all")) {
            rec.pending_count = rec.recommendations.filter(
              (r) => r.approval_status === "PENDING_REVIEW" || r.approval_status === "PENDING"
            ).length;
            rec.approved_count = rec.recommendations.filter(
              (r) => r.approval_status === "APPROVED" || r.approval_status === "MODIFIED"
            ).length;
            rec.updated_at = new Date().toISOString();
            await saveFileSafe(fileName, JSON.stringify(rec, null, 2));
            await syncGuidelineRecordToActiveLibrary(rec);

            // Cập nhật catalog.json
            try {
              const catalogInfo = getFileContent("catalog.json");
              if (catalogInfo) {
                const catalog = JSON.parse(catalogInfo.content);
                const catKey = rec.guideline_id || fileName.replace(/_latest\.json$/i, "");
                if (catalog[catKey]) {
                  catalog[catKey].pending_count = rec.pending_count;
                  catalog[catKey].approved_count = rec.approved_count;
                  catalog[catKey].updated_at = rec.updated_at;
                  await saveFileSafe("catalog.json", JSON.stringify(catalog, null, 2));
                }
              }
            } catch (catErr) {
              console.warn("Lỗi cập nhật catalog trong batch approve:", catErr);
            }

            totalApproved += modified || rec.approved_count;
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

    // 1b. CHỨC NĂNG TỪ CHỐI TOÀN BỘ 1 GUIDELINE (REJECT GUIDELINE & XÓA KHỎI HỆ THỐNG)
    if (action === "REJECT_GUIDELINE") {
      const targetGId = (guideline_id || file_id || doc_id || "").toLowerCase().trim();
      const reqTitle = String(body.title || body.guideline_title || "").trim();
      if (!targetGId && !reqTitle) {
        return NextResponse.json({ ok: false, error: "Thiếu guideline_id để từ chối" }, { status: 400 });
      }
      const cleanGId = targetGId.replace(/_latest\.json$/i, "");
      const { recordsMap } = await loadUnifiedStoreRecords();

      let rejectedCount = 0;
      let matchedTitle = reqTitle;
      const normalizeT = normalizeGuidelineTitle;
      const normReqTitle = normalizeT(reqTitle);
      // Chỉ đưa đúng ID của bản ghi bị từ chối vào danh sách xóa (KHÔNG đưa tiêu đề chuẩn hóa để tránh chặn nhầm khi người dùng tải lên lại guideline cùng tên)
      const allIdsToDelete = new Set<string>([targetGId, cleanGId].filter(Boolean));

      for (const [fileName, rec] of recordsMap.entries()) {
        try {
          const fileGId = (rec.guideline_id || "").toLowerCase().trim();
          const cleanFileName = fileName.replace(/_latest\.json$/i, "").toLowerCase();
          const docTitle = rec.metadata?.title || "";
          const normDocTitle = normalizeT(docTitle);

          const isMatch =
            (cleanGId &&
              (fileGId === cleanGId ||
                cleanFileName === cleanGId ||
                cleanFileName.startsWith(cleanGId) ||
                cleanGId.startsWith(cleanFileName))) ||
            (!cleanGId && normReqTitle && normDocTitle && normDocTitle === normReqTitle);

          if (!isMatch) continue;

          if (fileGId) allIdsToDelete.add(fileGId);
          if (cleanFileName) allIdsToDelete.add(cleanFileName);
          if (docTitle && !matchedTitle) {
            matchedTitle = docTitle;
          }

          for (const r of rec.recommendations) {
            if (r.approval_status === "PENDING_REVIEW" || r.approval_status === "PENDING") {
              rejectedCount++;
            }
            r.approval_status = "REJECTED";
          }

          // Xóa file khỏi STORE_DIR (nếu có quyền ghi) và ghi đè tombstone vào TMP_DIR nếu STORE_DIR là read-only (trên Vercel)
          for (const dir of [STORE_DIR, TMP_DIR]) {
            try {
              const fullLatest = path.join(/* turbopackIgnore: true */ dir, fileName);
              if (fs.existsSync(/* turbopackIgnore: true */ fullLatest)) fs.unlinkSync(/* turbopackIgnore: true */ fullLatest);
              const fullV1 = path.join(/* turbopackIgnore: true */ dir, fileName.replace(/_latest\.json$/i, "_v1.json"));
              if (fs.existsSync(/* turbopackIgnore: true */ fullV1)) fs.unlinkSync(/* turbopackIgnore: true */ fullV1);
            } catch {}
          }

          // Nếu file gốc trong STORE_DIR vẫn tồn tại (do read-only trên Vercel), ghi bản REJECTED vào TMP_DIR để ghi đè hoàn toàn
          if (fs.existsSync(path.join(STORE_DIR, fileName))) {
            try {
              if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
              const tombstone: GuidelineRecord = {
                ...rec,
                pending_count: 0,
                approved_count: 0,
                rejected_count: Math.max(rec.recommendations.length, 1),
                updated_at: new Date().toISOString(),
              };
              fs.writeFileSync(path.join(TMP_DIR, fileName), JSON.stringify(tombstone, null, 2), "utf-8");
            } catch {}
          }
        } catch (e) {
          console.warn("Lỗi từ chối guideline:", fileName, e);
        }
      }

      // Cập nhật catalog.json
      for (const dir of [TMP_DIR, STORE_DIR]) {
        const catPath = path.join(dir, "catalog.json");
        if (fs.existsSync(catPath)) {
          try {
            const catalog = JSON.parse(fs.readFileSync(catPath, "utf-8"));
            let changed = false;
            for (const k of Object.keys(catalog)) {
              const entryTitle = normalizeT(catalog[k]?.title);
              if (
                allIdsToDelete.has(k.toLowerCase()) ||
                (cleanGId && allIdsToDelete.has(cleanGId)) ||
                (entryTitle && allIdsToDelete.has(entryTitle))
              ) {
                delete catalog[k];
                changed = true;
              }
            }
            if (changed) fs.writeFileSync(catPath, JSON.stringify(catalog, null, 2), "utf-8");
          } catch {}
        }
      }

      // Ghi nhận vào deletedGuidelineIds trên Active Storage & neuroguide_cloud.json trước
      const activeData = await loadMergedNeuroGuideData();
      const mergedDeleted = Array.from(
        new Set([
          ...(activeData.deletedGuidelineIds || []).map((x) => x.toLowerCase().trim()),
          ...Array.from(allIdsToDelete),
        ])
      );

      const cloudPath = path.join(process.cwd(), "public", "data", "neuroguide_cloud.json");
      if (fs.existsSync(cloudPath)) {
        try {
          const raw = fs.readFileSync(cloudPath, "utf-8");
          const cloudData = JSON.parse(raw);
          cloudData.deletedGuidelineIds = mergedDeleted;
          cloudData.deleted_guideline_ids = mergedDeleted;
          fs.writeFileSync(cloudPath, JSON.stringify(cloudData, null, 2), "utf-8");
        } catch {}
      }

      await saveNeuroGuideToActiveStorage({
        guidelines: activeData.guidelines.filter(
          (g) => !allIdsToDelete.has((g.id || "").toLowerCase())
        ),
        conferences: activeData.conferences,
        scenarios: activeData.scenarios,
        deletedGuidelineIds: mergedDeleted,
      });

      // Đánh dấu trạng thái "deleted" (kèm upsert tombstone row) trên Supabase SAU saveNeuroGuideToActiveStorage để chặn vĩnh viễn trên mọi Lambda instance
      if (hasSupabaseConfig()) {
        try {
          const nowIso = new Date().toISOString();
          await supabaseAdmin
            .from("neuroguide_docs")
            .update({ status: "deleted", updated_at: nowIso })
            .in("id", Array.from(allIdsToDelete));

          if (cleanGId) {
            await supabaseAdmin.from("neuroguide_docs").upsert(
              {
                id: cleanGId,
                title: matchedTitle || cleanGId,
                organization: "DELETED",
                year: "0",
                status: "deleted",
                data: {
                  id: cleanGId,
                  title: matchedTitle || cleanGId,
                  status: "deleted",
                },
                updated_at: nowIso,
              },
              { onConflict: "id" }
            );
          }
        } catch (sbErr) {
          console.warn("Lỗi cập nhật trạng thái deleted trên Supabase:", sbErr);
        }
      }

      return NextResponse.json({
        ok: true,
        message: `Đã từ chối và xóa hoàn toàn guideline "${matchedTitle || cleanGId}" (${rejectedCount} khuyến cáo) khỏi hệ thống.`,
        rejected_count: rejectedCount,
        deleted_guideline_ids: mergedDeleted,
      });
    }

    // 1b2. CHỨC NĂNG DỌN DẸP TOÀN BỘ CÁC KHUYẾN CÁO ĐÃ XÓA (PURGE ALL DELETED)
    if (action === "PURGE_ALL_DELETED") {
      const activeData = await loadMergedNeuroGuideData();
      const normalizeT = normalizeGuidelineTitle;
      const deletedSet = new Set<string>(
        (activeData.deletedGuidelineIds || []).map((x) => x.toLowerCase().trim())
      );

      const cloudPath = path.join(process.cwd(), "public", "data", "neuroguide_cloud.json");
      if (fs.existsSync(cloudPath)) {
        try {
          const raw = fs.readFileSync(cloudPath, "utf-8");
          const cloudData = JSON.parse(raw);
          const cloudDeleted = cloudData.deletedGuidelineIds || cloudData.deleted_guideline_ids || [];
          cloudDeleted.forEach((x: string) => deletedSet.add(x.toLowerCase().trim()));
        } catch {}
      }

      let purgedFiles = 0;
      for (const dir of [TMP_DIR, STORE_DIR]) {
        if (fs.existsSync(/* turbopackIgnore: true */ dir)) {
          try {
            const files = fs.readdirSync(/* turbopackIgnore: true */ dir).filter((f) => f.endsWith(".json"));
            for (const f of files) {
              if (f === "catalog.json" || f === "jobs.json") continue;
              const full = path.join(/* turbopackIgnore: true */ dir, f);
              try {
                const content = fs.readFileSync(/* turbopackIgnore: true */ full, "utf-8");
                const data = JSON.parse(content);
                const gId = (data.guideline_id || "").toLowerCase().trim();
                const cleanF = f.replace(/_latest\.json$/i, "").toLowerCase();
                const docTitle = data.metadata?.title || "";
                const normTitle = normalizeT(docTitle);

                const isDel =
                  deletedSet.has(gId) ||
                  deletedSet.has(cleanF) ||
                  (normTitle && deletedSet.has(normTitle)) ||
                  Array.from(deletedSet).some(
                    (d) => d.length > 5 && (gId.includes(d) || d.includes(gId) || cleanF.includes(d) || d.includes(cleanF))
                  );

                if (isDel) {
                  fs.unlinkSync(/* turbopackIgnore: true */ full);
                  purgedFiles++;
                }
              } catch {}
            }
          } catch {}
        }
      }

      return NextResponse.json({
        ok: true,
        message: `Đã dọn dẹp sạch ${purgedFiles} tệp tin guideline cũ trên máy chủ.`,
        purged_files: purgedFiles,
        deleted_guideline_ids: Array.from(deletedSet),
      });
    }

    // 1c. CHỨC NĂNG XÓA 1 KHUYẾN CÁO LẺ KHỎI HÀNG ĐỢI HOẶC BẢN LƯU (DELETE SINGLE RECOMMENDATION)
    if (action === "DELETE_RECOMMENDATION") {
      const targetGId = (guideline_id || file_id || doc_id || "").toLowerCase().trim();
      const targetRecId = (rec_id || body.item_id || "").trim();

      if (!targetRecId) {
        return NextResponse.json({ ok: false, error: "Thiếu rec_id cần xóa" }, { status: 400 });
      }

      const cleanGId = targetGId.replace(/_latest\.json$/i, "");
      const { recordsMap } = await loadUnifiedStoreRecords();

      let removed = false;
      let remainingCount = 0;

      for (const [fileName, rec] of recordsMap.entries()) {
        try {
          const fileGId = (rec.guideline_id || "").toLowerCase().trim();
          const cleanFileName = fileName.replace(/_latest\.json$/i, "").toLowerCase();

          const isMatch =
            !cleanGId ||
            fileGId === cleanGId ||
            cleanFileName === cleanGId ||
            cleanFileName.startsWith(cleanGId) ||
            cleanGId.startsWith(cleanFileName);

          if (!isMatch) continue;

          const initialLen = rec.recommendations.length;
          rec.recommendations = rec.recommendations.filter(
            (r) => r.rec_id !== targetRecId && (r as any).id !== targetRecId
          );

          if (rec.recommendations.length < initialLen) {
            removed = true;
            rec.total_recommendations = rec.recommendations.length;
            rec.pending_count = rec.recommendations.filter(
              (r) => r.approval_status === "PENDING_REVIEW" || r.approval_status === "PENDING"
            ).length;
            rec.approved_count = rec.recommendations.filter(
              (r) => r.approval_status === "APPROVED" || r.approval_status === "MODIFIED"
            ).length;
            if (rec.pending_count === 0 && rec.approved_count === 0) {
              rec.rejected_count = Math.max(rec.rejected_count || 0, 1);
            }
            rec.updated_at = new Date().toISOString();
            await saveFileSafe(fileName, JSON.stringify(rec, null, 2));
            remainingCount = rec.recommendations.length;
          }
        } catch (e) {
          console.warn("Lỗi xóa khuyến cáo khỏi file:", fileName, e);
        }
      }

      // Nếu guideline đã có trong active library, đồng thời xóa khỏi allPracticeChanges
      if (cleanGId) {
        try {
          const activeData = await loadMergedNeuroGuideData();
          const docIdx = activeData.guidelines.findIndex(
            (g) => g.id.toLowerCase() === cleanGId || g.id.toLowerCase().includes(cleanGId)
          );
          if (docIdx >= 0) {
            const initialChgLen = activeData.guidelines[docIdx].allPracticeChanges.length;
            activeData.guidelines[docIdx].allPracticeChanges = activeData.guidelines[docIdx].allPracticeChanges.filter(
              (c) => c.id !== targetRecId
            );
            if (activeData.guidelines[docIdx].allPracticeChanges.length < initialChgLen) {
              await saveNeuroGuideToActiveStorage({
                guidelines: activeData.guidelines,
                conferences: activeData.conferences,
                scenarios: activeData.scenarios,
                deletedGuidelineIds: activeData.deletedGuidelineIds,
              });
            }
          }
        } catch {}
      }

      return NextResponse.json({
        ok: true,
        message: removed
          ? `Đã xóa khuyến cáo khỏi hệ thống thành công.`
          : `Đã ghi nhận yêu cầu xóa khuyến cáo.`,
        remaining_count: remainingCount,
      });
    }

    // 1d. CHỨC NĂNG THU HỒI GUIDELINE ĐÃ XUẤT BẢN VỀ LẠI HÀNG ĐỢI (UNPUBLISH / MOVE TO REVIEW QUEUE)
    if (action === "UNPUBLISH_GUIDELINE") {
      const targetGId = (guideline_id || file_id || doc_id || "").toLowerCase().trim();
      if (!targetGId) {
        return NextResponse.json({ ok: false, error: "Thiếu guideline_id cần thu hồi" }, { status: 400 });
      }

      const cleanGId = targetGId.replace(/_latest\.json$/i, "");
      const activeData = await loadMergedNeuroGuideData();
      const { recordsMap } = await loadUnifiedStoreRecords();

      // 1. Tìm guideline cần thu hồi trong active library
      const targetDoc = activeData.guidelines.find(
        (g) => g.id.toLowerCase() === cleanGId || g.id.toLowerCase().includes(cleanGId)
      );
      activeData.guidelines = activeData.guidelines.filter(
        (g) => g.id.toLowerCase() !== cleanGId && !g.id.toLowerCase().includes(cleanGId)
      );

      await saveNeuroGuideToActiveStorage({
        guidelines: activeData.guidelines,
        conferences: activeData.conferences,
        scenarios: activeData.scenarios,
        deletedGuidelineIds: activeData.deletedGuidelineIds,
      });

      // 2. Chuyển trạng thái các khuyến cáo về PENDING_REVIEW và lưu lên Supabase với status: "pending"
      let restoredRecsCount = 0;
      let matchedAny = false;

      for (const [fileName, rec] of recordsMap.entries()) {
        try {
          const fileGId = (rec.guideline_id || "").toLowerCase().trim();
          const cleanFileName = fileName.replace(/_latest\.json$/i, "").toLowerCase();

          const isMatch =
            fileGId === cleanGId ||
            cleanFileName === cleanGId ||
            cleanFileName.startsWith(cleanGId) ||
            cleanGId.startsWith(cleanFileName);

          if (!isMatch) continue;

          matchedAny = true;
          for (const r of rec.recommendations) {
            r.approval_status = "PENDING_REVIEW";
            restoredRecsCount++;
          }
          rec.pending_count = rec.recommendations.length;
          rec.approved_count = 0;
          rec.updated_at = new Date().toISOString();
          await saveFileSafe(fileName, JSON.stringify(rec, null, 2));
        } catch (e) {
          console.warn("Lỗi cập nhật unpublish file:", fileName, e);
        }
      }

      // Nếu chưa có file _latest.json nhưng có targetDoc trong thư viện, khởi tạo GuidelineRecord chờ duyệt từ targetDoc
      if (!matchedAny && targetDoc) {
        const rebuilt = buildGuidelineRecordFromDoc(targetDoc, "PENDING_REVIEW") as GuidelineRecord;
        restoredRecsCount = rebuilt.recommendations.length;
        await saveFileSafe(`${targetDoc.id}_latest.json`, JSON.stringify(rebuilt, null, 2));
      }

      return NextResponse.json({
        ok: true,
        message: `Đã thu hồi guideline "${targetDoc?.title || cleanGId}" khỏi thư viện và chuyển về Hàng đợi kiểm duyệt (${restoredRecsCount} khuyến cáo).`,
        restored_count: restoredRecsCount,
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
      const fileInfo = await getFileContentAsync(latestFileName);
      if (fileInfo) {
        try {
          const rec: GuidelineRecord = JSON.parse(fileInfo.content);
          const r = rec.recommendations.find((recItem) => recItem.rec_id === updated_item.id);
          if (r) {
            if (updated_item.currentText) r.statement = updated_item.currentText;
            if (updated_item.topic) r.topic = updated_item.topic;
            if (updated_item.category) r.category = updated_item.category;
            if (updated_item.currentGrade) {
              const parsed = parseAhaCorAndLoe(updated_item.currentGrade);
              r.cor = parsed.cor;
              r.loe = parsed.loe;
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
          deletedGuidelineIds: activeData.deletedGuidelineIds,
        });
      }

      return NextResponse.json({
        ok: true,
        message: "Đã cập nhật chỉnh sửa khuyến cáo thành công!",
        doc: targetDoc,
      });
    }

    // 2b. CHỨC NĂNG CHỈNH SỬA TOÀN DIỆN GUIDELINE (METADATA + TỪNG NỘI DUNG/KHUYẾN CÁO BÊN TRONG)
    if (action === "EDIT_GUIDELINE") {
      const {
        title,
        original_title,
        originalTitle,
        society: newSociety,
        year: newYear,
        subspecialty,
        executiveSummary,
        topTakeaways,
        allPracticeChanges,
        officialUrl,
      } = body;
      const targetDocId = doc_id || file_id;
      if (!targetDocId) {
        return NextResponse.json({ ok: false, error: "Thiếu doc_id để sửa guideline" }, { status: 400 });
      }

      const cleanDocId = targetDocId.replace(/_latest\.json$/i, "");
      const normalizeTitle = (t?: string) => (t || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const normTarget = cleanDocId.toLowerCase();
      const normTitle = normalizeTitle(title);
      const prevTitle = (original_title || originalTitle || "").trim();
      const normPrevTitle = normalizeTitle(prevTitle);

      // 1. Cập nhật active library nếu đã nạp
      const activeData = await loadMergedNeuroGuideData();
      let docIdx = activeData.guidelines.findIndex((g) => {
        const gId = (g.id || "").toLowerCase();
        if (gId === normTarget || gId.includes(normTarget) || normTarget.includes(gId)) return true;
        if (normPrevTitle && normalizeTitle(g.title) === normPrevTitle) return true;
        if (normTitle && normalizeTitle(g.title) === normTitle) return true;
        return false;
      });

      let updatedGuideline: GuidelineDoc;

      if (docIdx >= 0) {
        if (title) activeData.guidelines[docIdx].title = title;
        if (newSociety) activeData.guidelines[docIdx].society = newSociety;
        if (newYear) {
          activeData.guidelines[docIdx].year = newYear;
          activeData.guidelines[docIdx].publishDate = `${newYear}-01-01`;
        }
        if (subspecialty) {
          activeData.guidelines[docIdx].subspecialty = subspecialty;
          activeData.guidelines[docIdx].subspecialties = [subspecialty];
        }
        if (executiveSummary) {
          activeData.guidelines[docIdx].executiveSummary = executiveSummary;
          activeData.guidelines[docIdx].executiveSummaryVi = executiveSummary;
        }
        if (Array.isArray(topTakeaways)) {
          activeData.guidelines[docIdx].topTakeaways = topTakeaways;
        }
        if (Array.isArray(allPracticeChanges)) {
          activeData.guidelines[docIdx].allPracticeChanges = allPracticeChanges;
        }
        if (officialUrl) {
          activeData.guidelines[docIdx].officialUrl = officialUrl;
        }
        activeData.guidelines[docIdx].synthesizedAt = new Date().toISOString();
        updatedGuideline = activeData.guidelines[docIdx];
      } else {
        // Guideline mới hoặc chưa có trong active storage
        const primarySub = subspecialty || mapSocietyToSubspecialty(newSociety || "AHA/ASA", title || "");
        updatedGuideline = {
          id: cleanDocId,
          society: newSociety || "AHA/ASA",
          year: newYear || new Date().getFullYear(),
          title: title || "Clinical Practice Guideline",
          officialUrl: officialUrl || "https://pubmed.ncbi.nlm.nih.gov/",
          journalTarget: (newSociety || "").includes("ESO") ? "European Stroke Journal" : (newSociety || "").includes("AHA") ? "Stroke" : "Neurology",
          documentType: "Clinical Practice Guideline",
          publishDate: `${newYear || new Date().getFullYear()}-01-01`,
          subspecialty: primarySub,
          subspecialties: [primarySub],
          executiveSummary: executiveSummary || "",
          executiveSummaryVi: executiveSummary || "",
          topTakeaways: Array.isArray(topTakeaways) ? topTakeaways : [],
          allPracticeChanges: Array.isArray(allPracticeChanges) ? allPracticeChanges : [],
          linkedScenarioIds: [],
          fullTextStatus: "FULL_TEXT_PARSED",
          synthesizedAt: new Date().toISOString(),
        };
        activeData.guidelines.unshift(updatedGuideline);
      }

      // Loại bỏ ID và tiêu đề guideline này khỏi deletedGuidelineIds nếu trước đây từng bị đánh dấu
      if (Array.isArray(activeData.deletedGuidelineIds)) {
        const idsToRemove = new Set([
          normTarget,
          cleanDocId.toLowerCase(),
          targetDocId.toLowerCase(),
          normTitle,
          normPrevTitle,
        ].filter(Boolean));
        activeData.deletedGuidelineIds = activeData.deletedGuidelineIds.filter(
          (d) => !idsToRemove.has(d.toLowerCase().trim())
        );
      }

      await saveNeuroGuideToActiveStorage({
        guidelines: activeData.guidelines,
        conferences: activeData.conferences,
        scenarios: activeData.scenarios,
        deletedGuidelineIds: activeData.deletedGuidelineIds,
      });

      // 2. Tìm hoặc tạo file _latest.json trong kho lưu trữ guidelines_store
      let targetFileName = `${cleanDocId}_latest.json`;
      let fileInfo = await getFileContentAsync(targetFileName);

      // Thử tìm theo tiêu đề hoặc file tương đương nếu chưa tìm thấy bằng targetDocId
      if (!fileInfo) {
        for (const dir of [TMP_DIR, STORE_DIR]) {
          if (fs.existsSync(/* turbopackIgnore: true */ dir)) {
            try {
              const files = fs.readdirSync(/* turbopackIgnore: true */ dir).filter((f) => f.endsWith("_latest.json"));
              for (const f of files) {
                const fullP = path.join(/* turbopackIgnore: true */ dir, f);
                const raw = fs.readFileSync(/* turbopackIgnore: true */ fullP, "utf-8");
                const parsed = JSON.parse(raw);
                const gIdLower = (parsed.guideline_id || "").toLowerCase();
                const parsedTitleLower = normalizeTitle(parsed.metadata?.title);
                const isIdMatch = gIdLower && (gIdLower === normTarget || gIdLower.includes(normTarget) || normTarget.includes(gIdLower));
                const isTitleMatch = parsedTitleLower && (
                  parsedTitleLower === normTitle ||
                  (normPrevTitle && parsedTitleLower === normPrevTitle)
                );
                if (isIdMatch || isTitleMatch) {
                  targetFileName = f;
                  fileInfo = { content: raw, sourcePath: fullP };
                  break;
                }
              }
            } catch {}
          }
          if (fileInfo) break;
        }
      }

      try {
        let rec: GuidelineRecord;
        if (fileInfo) {
          rec = JSON.parse(fileInfo.content);
        } else {
          rec = {
            guideline_id: cleanDocId,
            version: 1,
            metadata: {
              title: title || "Clinical Practice Guideline",
              society: newSociety || "AHA/ASA",
              year: newYear || new Date().getFullYear(),
              source_url: officialUrl || "",
            },
            total_recommendations: 0,
            pending_count: 0,
            approved_count: 0,
            rejected_count: 0,
            recommendations: [],
            updated_at: new Date().toISOString(),
          };
        }

        if (title) rec.metadata.title = title;
        if (newSociety) rec.metadata.society = newSociety;
        if (newYear) rec.metadata.year = newYear;
        if (officialUrl) rec.metadata.source_url = officialUrl;
        if (Array.isArray(topTakeaways)) (rec.metadata as any).top_takeaways = topTakeaways;

        if (Array.isArray(allPracticeChanges)) {
          rec.recommendations = allPracticeChanges.map((chg, idx) => {
            let cor = (chg as any).cor;
            let loe = (chg as any).loe;
            if (!cor || !loe) {
              const parsed = parseAhaCorAndLoe(chg.currentGrade || "");
              if (!cor) cor = parsed.cor;
              if (!loe) loe = parsed.loe;
            }

            const existingRec = rec.recommendations.find((r) => r.rec_id === chg.id);
            // Các khuyến cáo được lưu qua EDIT_GUIDELINE là nội dung đã được bác sĩ/Admin phê duyệt
            const status = (existingRec && existingRec.approval_status === "REJECTED") ? "REJECTED" : "APPROVED";

            let pNum: string | undefined = (chg as any).picoNumber ? String((chg as any).picoNumber) : undefined;
            let pQuestion: string | undefined = (chg as any).picoQuestion || undefined;
            if (!pNum && chg.topic) {
              const m = String(chg.topic).match(/PICO\s*(\d+[a-z]?)[:.\s-]*(.*)/i);
              if (m) {
                pNum = m[1];
                if (!pQuestion) pQuestion = m[2]?.trim();
              }
            }

            return {
              rec_id: chg.id || `rec-${idx + 1}`,
              guideline_id: rec.guideline_id || cleanDocId,
              grading_system: (newSociety || rec.metadata.society || "").includes("ESO") ? "GRADE" : "ACC/AHA",
              page_num: existingRec?.page_num || 1,
              statement: chg.currentText,
              approval_status: status,
              category: chg.category || "Recommendations",
              topic: chg.topic || "Clinical Management",
              cor: cor || undefined,
              loe: loe || undefined,
              strength_of_recommendation: (chg as any).strength || undefined,
              quality_of_evidence: (chg as any).quality || undefined,
              voting: (chg as any).voting || undefined,
              pico_id: pNum ? `PICO ${pNum}` : (existingRec?.pico_id || undefined),
              target_population: pQuestion || existingRec?.target_population || undefined,
              driving_trials: chg.drivingTrials || [],
              change_type: chg.changeType,
              previous_grade: chg.previousGrade,
              verbatim_quote: chg.previousText,
              consensus_statement: (chg as any).expertConsensusStatement || undefined,
            };
          });
          rec.total_recommendations = rec.recommendations.length;
          rec.approved_count = rec.recommendations.filter(
            (r) => r.approval_status === "APPROVED" || r.approval_status === "MODIFIED"
          ).length;
          rec.pending_count = rec.recommendations.filter(
            (r) => r.approval_status === "PENDING_REVIEW"
          ).length;
          rec.rejected_count = rec.recommendations.filter(
            (r) => r.approval_status === "REJECTED"
          ).length;
        }

        rec.updated_at = new Date().toISOString();
        await saveFileSafe(targetFileName, JSON.stringify(rec, null, 2));

        if (rec.approved_count > 0) {
          await syncGuidelineRecordToActiveLibrary(rec);
        }

        // Cập nhật catalog.json
        const catalogInfo = getFileContent("catalog.json");
        let catalog: Record<string, any> = {};
        if (catalogInfo) {
          try {
            catalog = JSON.parse(catalogInfo.content);
          } catch {}
        }
        const catalogKey = rec.guideline_id || cleanDocId;
        catalog[catalogKey] = {
          guideline_id: catalogKey,
          title: rec.metadata.title,
          society: rec.metadata.society,
          year: rec.metadata.year,
          total_recommendations: rec.total_recommendations,
          pending_count: rec.pending_count,
          approved_count: rec.approved_count,
          rejected_count: rec.rejected_count,
          updated_at: rec.updated_at,
        };
        await saveFileSafe("catalog.json", JSON.stringify(catalog, null, 2));
      } catch (err) {
        console.warn("Lỗi cập nhật store files cho guideline:", err);
      }

      return NextResponse.json({
        ok: true,
        message: "Đã cập nhật toàn diện thông tin và nội dung guideline thành công!",
        guideline: updatedGuideline,
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
    const fileInfo = await getFileContentAsync(latestFileName);
    let record: GuidelineRecord | null = null;
    if (fileInfo) {
      record = JSON.parse(fileInfo.content);
    } else {
      const { recordsMap } = await loadUnifiedStoreRecords();
      record = recordsMap.get(latestFileName) || null;
    }
    if (!record) {
      return NextResponse.json(
        { ok: false, error: `Không tìm thấy tài liệu guideline với ID: ${file_id}` },
        { status: 404 }
      );
    }
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
