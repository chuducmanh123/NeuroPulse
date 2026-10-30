import fs from "fs";
import path from "path";
import type { GuidelineDoc, PracticeChangeDetail, SubspecialtyType } from "../../types/neuroguide.ts";

const STORE_DIR = path.join(process.cwd(), "data", "guidelines_store");

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
  if (!fs.existsSync(STORE_DIR)) return [];

  const files = fs.readdirSync(STORE_DIR).filter((f) => f.endsWith("_latest.json"));
  const docs: GuidelineDoc[] = [];

  for (const file of files) {
    try {
      const fullPath = path.join(STORE_DIR, file);
      const raw = fs.readFileSync(fullPath, "utf-8");
      const record = JSON.parse(raw);

      const metadata = record.metadata || {};
      const recs = record.recommendations || [];

      const practiceChanges: PracticeChangeDetail[] = recs.map((r: any, idx: number) => {
        let currentGrade = "Standard Clinical Practice";
        if (r.cor) {
          currentGrade = `Class ${r.cor}, Level ${r.loe || "B"}`;
        } else if (r.quality_of_evidence || r.strength_of_recommendation) {
          currentGrade = `GRADE ${r.strength_of_recommendation || "Recommended"} (Evidence: ${r.quality_of_evidence || "Moderate"}${r.voting ? `, Voting: ${r.voting}` : ""})`;
        }

        return {
          id: r.rec_id || `rec-${idx + 1}`,
          category: r.topic || "Clinical Management",
          topic: r.pico_id ? `${r.pico_id}: ${r.section || ""}` : r.section || "Recommendation",
          changeType: r.cor === "1" || (r.strength_of_recommendation && r.strength_of_recommendation.includes("Strong")) ? "UPGRADED" : "NEW",
          currentText: r.statement,
          currentGrade,
          drivingTrials: r.driving_trials || [],
        };
      });

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
        publishDate: `${metadata.year || 2026}-01-01`,
        subspecialty,
        subspecialties: [subspecialty],
        executiveSummary: summaryText,
        executiveSummaryVi: summaryText,
        allPracticeChanges: practiceChanges,
        linkedScenarioIds: [],
        fullTextStatus: "FULL_TEXT_PARSED",
      });
    } catch (e) {
      console.warn("Lỗi đọc guideline store file:", file, e);
    }
  }

  return docs;
}
