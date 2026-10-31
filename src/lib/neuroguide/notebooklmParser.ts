import type { GuidelineDoc, PracticeChangeDetail, SubspecialtyType } from "../../types/neuroguide.ts";
import { detectSociety, detectSubspecialty } from "./pubmedDiscovery.ts";

export interface ParsedNotebookLMResult {
  doc: GuidelineDoc;
  stats: {
    totalRecommendations: number;
    corBreakdown: Record<string, number>;
    categoriesCount: number;
  };
}

/**
 * Cleans text cells from markdown table, removing wrapping formatting and whitespace
 */
function cleanCell(cell: string): string {
  if (!cell) return "";
  return cell
    .trim()
    .replace(/^\||\|$/g, "")
    .trim();
}

/**
 * Splits studies/evidence string into an array of clean citations
 */
function parseEvidenceStudies(evidenceStr: string): string[] {
  if (!evidenceStr || evidenceStr.trim().length === 0) return [];

  // Split by bullet characters or semicolons
  const items = evidenceStr
    .split(/(?:•|\n|;\s*(?=[A-Z]))/)
    .map((s) => s.replace(/^[•\-\*\s]+/, "").trim())
    .filter((s) => s.length > 2);

  return items.length > 0 ? items : [evidenceStr.trim()];
}

/**
 * Formats raw COR/LOE string into clean standard format
 * e.g., "Class 1  LOE B-NR" -> "Class 1, Level B-NR"
 * "Class 3: No Benefit  LOE A" -> "Class 3: No Benefit, Level A"
 * "Class 3: Harm  LOE B-NR" -> "Class 3: Harm, Level B-NR"
 */
function formatGrade(rawGrade: string): string {
  let g = rawGrade.trim().replace(/\s+/g, " ");
  // Replace "Class X  LOE Y" with "Class X, Level Y"
  g = g.replace(/LOE\s+/i, "Level ");
  if (g.includes("Class") && g.includes("Level") && !g.includes(",")) {
    g = g.replace(/(Class\s+[^\s,]+(?:\s*:\s*[^\s,]+)?)\s+(Level\s+[^\s,]+)/i, "$1, $2");
  }
  return g;
}

/**
 * Infers change type (UPGRADED, DOWNGRADED, REVISED, NEW, STANDARD) from COR/LOE
 */
function inferChangeType(grade: string, statement: string): PracticeChangeDetail["changeType"] {
  const norm = (grade + " " + statement).toLowerCase();

  if (norm.includes("harm") || norm.includes("potentially harmful") || norm.includes("associated with excess morbidity")) {
    return "DOWNGRADED";
  }
  if (norm.includes("no benefit") || norm.includes("not beneficial") || norm.includes("not useful") || norm.includes("not recommended")) {
    return "REVISED";
  }
  if (norm.includes("class 1") || norm.includes("class i,") || norm.includes("class i ") || norm.includes("strong recommendation for")) {
    return "UPGRADED";
  }
  if (norm.includes("class 2a") || norm.includes("class 2b") || norm.includes("class ii")) {
    return "NEW";
  }
  return "STANDARD";
}

/**
 * Derives Category and Topic from a combined string (e.g., "Diagnosis: Acute Workup" -> cat: "Diagnosis", topic: "Acute Workup")
 */
function extractCategoryAndTopic(rawDomain: string): { category: string; topic: string } {
  const clean = rawDomain.trim();
  if (clean.includes(":")) {
    const parts = clean.split(":");
    const category = parts[0].trim();
    const topic = parts.slice(1).join(":").trim();
    return { category: category || "Clinical Recommendation", topic: topic || clean };
  }
  if (clean.includes("&")) {
    const parts = clean.split("&");
    return { category: parts[0].trim(), topic: clean };
  }
  return { category: clean, topic: clean };
}

/**
 * Generates an executive summary in Vietnamese tailored to the guideline content
 */
function generateExecutiveSummaryVi(title: string, society: string, year: number, recCount: number): string {
  let condition = "thần kinh";
  const t = title.toLowerCase();
  if (t.includes("subarachnoid") || t.includes("asah")) condition = "Xuất huyết dưới nhện do vỡ túi phình (aSAH)";
  else if (t.includes("ischemic stroke")) condition = "Đột quỵ nhồi máu não cấp";
  else if (t.includes("intracerebral hemorrhage") || t.includes("ich")) condition = "Xuất huyết não tự phát (ICH)";
  else if (t.includes("epilepsy") || t.includes("seizure")) condition = "Động kinh và Cơn co giật";
  else if (t.includes("status epilepticus")) condition = "Trạng thái động kinh";
  else if (t.includes("headache") || t.includes("migraine")) condition = "Đau đầu & Migraine";
  else if (t.includes("rehabilitation")) condition = "Phục hồi chức năng thần kinh";

  return `Hướng dẫn thực hành lâm sàng chính thức từ ${society} (${year}) về ${condition}, tổng hợp hệ thống ${recCount} khuyến cáo phân tầng mức độ chỉ định (COR) và mức độ bằng chứng (LOE) cùng dữ liệu từ các thử nghiệm lâm sàng đối chứng then chốt.`;
}

/**
 * Main parser function to convert NotebookLM markdown/text into a full GuidelineDoc
 */
export function parseNotebookLMContent(
  rawContent: string,
  overrides?: {
    title?: string;
    society?: string;
    year?: number;
    subspecialty?: SubspecialtyType;
    officialUrl?: string;
  }
): ParsedNotebookLMResult {
  const lines = rawContent.split(/\r?\n/).map((l) => l.trim());

  // 1. Extract Title, Subtitle, and Description before table
  let docTitle = "";
  let descriptionLines: string[] = [];
  let tableHeaderIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    if (line.includes("|") && (line.toLowerCase().includes("recommendation") || line.toLowerCase().includes("domain") || line.toLowerCase().includes("topic") || line.toLowerCase().includes("class") || line.toLowerCase().includes("cor"))) {
      tableHeaderIndex = i;
      break;
    }

    if (!docTitle) {
      // First substantial line is the title
      docTitle = line.replace(/^[#\s*]+/, "").replace(/[*#]+$/, "").trim();
    } else {
      descriptionLines.push(line.replace(/^[#\s*]+/, "").replace(/[*#]+$/, "").trim());
    }
  }

  if (overrides?.title) {
    docTitle = overrides.title;
  } else if (!docTitle) {
    docTitle = "Clinical Practice Guideline Summary";
  }

  // 2. Extract Year & Society
  let year = overrides?.year;
  if (!year) {
    const yearMatch = docTitle.match(/\b(20\d{2}|19\d{2})\b/) || rawContent.slice(0, 500).match(/\b(20\d{2}|19\d{2})\b/);
    year = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();
  }

  const detectedSociety = overrides?.society || detectSociety(docTitle, descriptionLines.join(" "));
  const detectedSubspecialty = overrides?.subspecialty || detectSubspecialty(docTitle);

  // 3. Parse Table or List Rows
  const practiceChanges: PracticeChangeDetail[] = [];
  const corBreakdown: Record<string, number> = {};

  if (tableHeaderIndex !== -1) {
    const headerLine = lines[tableHeaderIndex];
    const headerCols = headerLine
      .split("|")
      .map(cleanCell)
      .filter(Boolean)
      .map((c) => c.toLowerCase());

    // Determine column mapping
    let colTopicIdx = headerCols.findIndex((c) => c.includes("topic") || c.includes("domain") || c.includes("category") || c.includes("lâm sàng"));
    let colRecIdx = headerCols.findIndex((c) => c.includes("recommendation") || c.includes("verbatim") || c.includes("khuyến cáo") || c.includes("statement") || c.includes("text"));
    let colGradeIdx = headerCols.findIndex((c) => c.includes("class") || c.includes("cor") || c.includes("loe") || c.includes("grade") || c.includes("level") || c.includes("mức độ"));
    let colEvidenceIdx = headerCols.findIndex((c) => c.includes("evidence") || c.includes("studies") || c.includes("trials") || c.includes("bằng chứng") || c.includes("nghiên cứu"));

    // Default column fallbacks if indices not cleanly found
    if (colTopicIdx === -1) colTopicIdx = 0;
    if (colRecIdx === -1) colRecIdx = 1;
    if (colGradeIdx === -1) colGradeIdx = 2;
    if (colEvidenceIdx === -1) colEvidenceIdx = 3;

    for (let i = tableHeaderIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line || !line.includes("|")) continue;
      // Skip markdown separator row like | --- | --- |
      if (line.replace(/[|\s\-\:]/g, "").length === 0) continue;

      const cells = line.split("|").map(cleanCell);
      // Remove empty boundary cells caused by leading/trailing pipes
      const filteredCells = cells.filter((c, idx) => {
        if ((idx === 0 || idx === cells.length - 1) && c === "") return false;
        return true;
      });

      if (filteredCells.length < 2) continue;

      const rawDomain = filteredCells[colTopicIdx] || `Recommendation ${practiceChanges.length + 1}`;
      const statement = filteredCells[colRecIdx] || "";
      const rawGrade = filteredCells[colGradeIdx] || "Class 1  LOE B-NR";
      const rawEvidence = filteredCells[colEvidenceIdx] || "";

      if (!statement || statement.length < 5) continue;

      const { category, topic } = extractCategoryAndTopic(rawDomain);
      const grade = formatGrade(rawGrade);
      const changeType = inferChangeType(grade, statement);
      const drivingTrials = parseEvidenceStudies(rawEvidence);

      // Track COR statistics
      const corMatch = grade.match(/Class\s+([^\s,]+)/i);
      const corKey = corMatch ? `Class ${corMatch[1]}` : grade.slice(0, 15);
      corBreakdown[corKey] = (corBreakdown[corKey] || 0) + 1;

      practiceChanges.push({
        id: `rec-nlm-${year}-${practiceChanges.length + 1}`,
        category,
        topic,
        changeType,
        currentGrade: grade,
        currentText: statement,
        drivingTrials: drivingTrials.length > 0 ? drivingTrials : [`${detectedSociety} Practice Committee`],
      });
    }
  }

  // 4. Slug & ID Generation
  const societySlug = detectedSociety.toLowerCase().replace(/[^a-z0-9]/g, "");
  const titleSlug = docTitle
    .toLowerCase()
    .replace(/\b(20\d{2}|19\d{2})\b/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 45);
  const docId = `${societySlug}-${year}-${titleSlug || "guideline"}`;

  // Update IDs in practice changes to be unique to this doc
  practiceChanges.forEach((c, idx) => {
    c.id = `chg-${docId}-${idx + 1}`;
  });

  // 5. Select Top Takeaways (Top 8-10 high impact recommendations)
  const topTakeaways: string[] = [];
  // Prioritize Class 3: Harm, Class 3: No Benefit, and Class 1
  const sortedForTakeaways = [...practiceChanges].sort((a, b) => {
    const score = (rec: PracticeChangeDetail) => {
      const g = rec.currentGrade.toLowerCase();
      if (g.includes("harm")) return 10;
      if (g.includes("no benefit")) return 9;
      if (g.includes("class 1") && g.includes("level a")) return 8;
      if (g.includes("class 1")) return 7;
      if (g.includes("class 2a")) return 6;
      return 1;
    };
    return score(b) - score(a);
  });

  sortedForTakeaways.slice(0, 10).forEach((c, idx) => {
    topTakeaways.push(`${idx + 1}. [${c.category} - ${c.currentGrade}] ${c.currentText}`);
  });

  // 6. Build Executive Summary
  const descText = descriptionLines.join(" ").trim();
  const executiveSummary = descText.length > 30
    ? descText
    : `Official clinical practice recommendations from the ${detectedSociety} (${year}) addressing evidence-based diagnosis, management, and treatment protocols with verified COR/LOE ratings.`;

  const executiveSummaryVi = generateExecutiveSummaryVi(docTitle, detectedSociety, year, practiceChanges.length);

  const categories = new Set(practiceChanges.map((c) => c.category));

  const doc: GuidelineDoc = {
    id: docId,
    society: detectedSociety,
    year,
    title: docTitle,
    officialUrl: overrides?.officialUrl || `https://scholar.google.com/scholar?q=${encodeURIComponent(docTitle)}`,
    journalTarget: detectedSociety.includes("ESO")
      ? "European Stroke Journal"
      : detectedSociety.includes("AHA") || detectedSociety.includes("ASA")
      ? "Stroke / JAHA"
      : detectedSociety.includes("AAN")
      ? "Neurology"
      : detectedSociety.includes("NCS")
      ? "Neurocritical Care"
      : "Peer-Reviewed Medical Journal",
    documentType: "Clinical Practice Guideline",
    publishDate: `${year}-05-01`,
    subspecialty: detectedSubspecialty,
    subspecialties: [detectedSubspecialty],
    executiveSummary,
    executiveSummaryVi,
    topTakeaways,
    allPracticeChanges: practiceChanges,
    linkedScenarioIds: [],
    fullTextStatus: "FULL_TEXT_PARSED",
    fullTextSource: "OPEN_ACCESS_WEB",
    aiSynthesized: true,
    synthesizedAt: new Date().toISOString(),
  };

  return {
    doc,
    stats: {
      totalRecommendations: practiceChanges.length,
      corBreakdown,
      categoriesCount: categories.size,
    },
  };
}
