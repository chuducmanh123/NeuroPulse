import type { GuidelineDoc, PracticeChangeDetail, SubspecialtyType } from "../../types/neuroguide.ts";
import { detectSociety, detectSubspecialty } from "./pubmedDiscovery.ts";
import { normalizeEsoStrength } from "./esoPicoGrouper.ts";

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

  // Split by bullet characters, commas, or semicolons
  const items = evidenceStr
    .split(/(?:•|\n|,|;\s*(?=[A-Z]))/)
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

  if (
    norm.includes("harm") ||
    norm.includes("potentially harmful") ||
    norm.includes("associated with excess morbidity") ||
    norm.includes("có hại") ||
    norm.includes("tăng nguy cơ tử vong")
  ) {
    return "DOWNGRADED";
  }
  if (
    norm.includes("no benefit") ||
    norm.includes("not beneficial") ||
    norm.includes("not useful") ||
    norm.includes("not recommended") ||
    norm.includes("không có lợi") ||
    norm.includes("không khuyến cáo") ||
    norm.includes("tránh")
  ) {
    return "REVISED";
  }
  if (
    norm.includes("class 1") ||
    norm.includes("class i,") ||
    norm.includes("class i ") ||
    norm.includes("strong recommendation for") ||
    norm.includes("strong for") ||
    norm.includes("mức 1") ||
    norm.includes("khuyến cáo mạnh cho")
  ) {
    return "UPGRADED";
  }
  if (
    norm.includes("class 2a") ||
    norm.includes("class 2b") ||
    norm.includes("class ii") ||
    norm.includes("mức 2") ||
    norm.includes("weak for")
  ) {
    return "NEW";
  }
  return "STANDARD";
}

/**
 * Derives Category and Topic from a combined string
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
  else if (t.includes("blood pressure") || t.includes("huyết áp")) condition = "Quản lý Huyết áp trong Đột quỵ cấp";
  else if (t.includes("ischemic stroke") || t.includes("ischaemic stroke")) condition = "Đột quỵ nhồi máu não cấp";
  else if (t.includes("intracerebral hemorrhage") || t.includes("ich")) condition = "Xuất huyết não tự phát (ICH)";
  else if (t.includes("epilepsy") || t.includes("seizure")) condition = "Động kinh và Cơn co giật";
  else if (t.includes("status epilepticus")) condition = "Trạng thái động kinh";
  else if (t.includes("headache") || t.includes("migraine")) condition = "Đau đầu & Migraine";
  else if (t.includes("rehabilitation")) condition = "Phục hồi chức năng thần kinh";

  return `Hướng dẫn thực hành lâm sàng chính thức từ ${society} (${year}) về ${condition}, tổng hợp hệ thống ${recCount} khuyến cáo phân tầng mức độ chỉ định (COR) và mức độ bằng chứng (LOE) cùng dữ liệu từ các thử nghiệm lâm sàng đối chứng then chốt.`;
}

/**
 * Main parser function to convert NotebookLM markdown/text/docx into a full GuidelineDoc
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

  // Broad set of keywords to detect table header rows
  const tableKeywords = [
    "pico",
    "recommendation",
    "domain",
    "topic",
    "class",
    "cor",
    "loe",
    "grade",
    "strength",
    "quality",
    "consensus",
    "evidence",
    "statement",
    "khuyến cáo",
    "khuyến nghị",
    "mức độ",
    "bằng chứng",
    "chất lượng",
    "đồng thuận",
    "thử nghiệm",
    "nghiên cứu",
    "câu hỏi",
    "clinical question",
    "intervention",
    "can thiệp",
    "stt",
    "voting",
    "vote",
    "bỏ phiếu",
    "phân loại",
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Detect markdown table header row: has pipe and matches any table header keyword, OR followed immediately by | --- |
    const hasPipe = line.includes("|");
    const nextLineHasSep = i + 1 < lines.length && lines[i + 1].includes("|") && lines[i + 1].replace(/[|\s\-\:]/g, "").length === 0;

    if (hasPipe && (tableKeywords.some((k) => line.toLowerCase().includes(k)) || nextLineHasSep)) {
      tableHeaderIndex = i;
      break;
    }

    if (!docTitle) {
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

  const practiceChanges: PracticeChangeDetail[] = [];
  const corBreakdown: Record<string, number> = {};

  // =========================================================================
  // STRATEGY 1: PARSE MARKDOWN TABLE ROWS
  // =========================================================================
  if (tableHeaderIndex !== -1) {
    const headerLine = lines[tableHeaderIndex];
    const rawHeaderParts = headerLine.split("|").map(cleanCell);
    // Remove boundary pipes
    if (rawHeaderParts.length > 0 && rawHeaderParts[0] === "") rawHeaderParts.shift();
    if (rawHeaderParts.length > 0 && rawHeaderParts[rawHeaderParts.length - 1] === "") rawHeaderParts.pop();
    const headerCols = rawHeaderParts.map((c) => c.toLowerCase());

    const isEsoTable =
      detectedSociety.toUpperCase().includes("ESO") ||
      headerCols.some((c) => c.includes("pico")) ||
      headerCols.some((c) => c.includes("quality")) ||
      headerCols.some((c) => c.includes("chất lượng")) ||
      headerCols.some((c) => c.includes("strength")) ||
      headerCols.some((c) => c.includes("độ mạnh")) ||
      headerCols.some((c) => c.includes("consensus")) ||
      headerCols.some((c) => c.includes("đồng thuận"));

    let colPicoIdx = headerCols.findIndex((c) => c.includes("pico") || c.includes("clinical question") || c.includes("câu hỏi"));
    let colTopicIdx = headerCols.findIndex((c) => c.includes("topic") || c.includes("domain") || c.includes("category") || c.includes("lâm sàng") || c.includes("chủ đề"));
    let colRecIdx = headerCols.findIndex((c) => c.includes("recommendation") || c.includes("verbatim") || c.includes("khuyến cáo") || c.includes("khuyến nghị") || c.includes("statement") || c.includes("text") || c.includes("nội dung"));
    let colGradeIdx = headerCols.findIndex((c) => c.includes("class") || c.includes("cor") || c.includes("loe") || c.includes("grade") || c.includes("level") || c.includes("mức độ") || c.includes("phân loại"));
    let colQualityIdx = headerCols.findIndex((c) => c.includes("quality") || c.includes("chất lượng") || (c.includes("bằng chứng") && !c.includes("mức độ")));
    let colStrengthIdx = headerCols.findIndex((c) => c.includes("strength") || c.includes("mức độ khuyến cáo") || c.includes("độ mạnh"));
    let colConsensusIdx = headerCols.findIndex((c) => c.includes("consensus") || c.includes("expert") || c.includes("đồng thuận") || c.includes("chuyên gia"));
    let colVotingIdx = headerCols.findIndex((c) => c.includes("vote") || c.includes("voting") || c.includes("bỏ phiếu") || c.includes("biểu quyết"));
    let colEvidenceIdx = headerCols.findIndex(
      (c) =>
        c.includes("studies") ||
        c.includes("study") ||
        c.includes("trials") ||
        c.includes("trial") ||
        c.includes("nghiên cứu") ||
        c.includes("thử nghiệm") ||
        (c.includes("evidence") && !c.includes("quality"))
    );

    // Fallbacks
    if (colTopicIdx === -1 && colPicoIdx !== -1) colTopicIdx = colPicoIdx;
    if (colTopicIdx === -1) colTopicIdx = 0;
    if (colRecIdx === -1) colRecIdx = colPicoIdx === 0 ? 1 : (headerCols.length > 1 ? 1 : 0);
    if (colGradeIdx === -1) colGradeIdx = colStrengthIdx !== -1 ? colStrengthIdx : (headerCols.length > 2 ? 2 : -1);
    if (colEvidenceIdx === -1) colEvidenceIdx = headerCols.length - 1;

    let activePicoNum: number | string = 1;
    let activePicoQuestion = "";

    for (let i = tableHeaderIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line || !line.includes("|")) continue;
      // Skip markdown separator row like | --- | --- |
      if (line.replace(/[|\s\-\:]/g, "").length === 0) continue;

      const cells = line.split("|").map(cleanCell);
      const filteredCells = cells.filter((c, idx) => {
        if ((idx === 0 || idx === cells.length - 1) && c === "") return false;
        return true;
      });

      if (filteredCells.length < 1) continue;

      // Handle standalone PICO header row (e.g., | PICO 1a: In adult patients... | | |)
      const firstCell = filteredCells[0] || "";
      const matchStandalonePico = firstCell.match(/^PICO\s*(\d+[a-z]?)[:.\s-]*(.*)/i);
      const isHeaderOnly = filteredCells.slice(1).every((c) => !c || c.trim().length === 0);

      if (matchStandalonePico && isHeaderOnly) {
        activePicoNum = matchStandalonePico[1];
        activePicoQuestion = matchStandalonePico[2]?.trim() || firstCell;
        continue;
      }

      // Extract statement
      let statement = (colRecIdx !== -1 && colRecIdx < filteredCells.length ? filteredCells[colRecIdx] : "") || "";
      if (!statement) {
        // Find cell with longest text
        statement = filteredCells.reduce((a, b) => (b.length > a.length ? b : a), "");
      }
      if (!statement || statement.length < 5) continue;

      if (isEsoTable) {
        // ESO GRADE format
        const rawPico = (colPicoIdx !== -1 && colPicoIdx < filteredCells.length ? filteredCells[colPicoIdx] : "") || firstCell;
        if (rawPico) {
          const matchPico = rawPico.match(/^PICO\s*(\d+[a-z]?)[:.\s-]*(.*)/i);
          if (matchPico) {
            activePicoNum = matchPico[1];
            activePicoQuestion = matchPico[2]?.trim() || rawPico;
          } else if (rawPico.toLowerCase().startsWith("pico")) {
            activePicoQuestion = rawPico;
          }
        }

        const rawQuality = (colQualityIdx !== -1 && colQualityIdx < filteredCells.length ? filteredCells[colQualityIdx] : "") || "Moderate";
        const rawStrength =
          (colStrengthIdx !== -1 && colStrengthIdx < filteredCells.length ? filteredCells[colStrengthIdx] : "") ||
          (colGradeIdx !== -1 && colGradeIdx < filteredCells.length ? filteredCells[colGradeIdx] : "") ||
          "Weak for intervention";
        const rawConsensus = colConsensusIdx !== -1 && colConsensusIdx < filteredCells.length ? filteredCells[colConsensusIdx] : "";
        const rawVoting = colVotingIdx !== -1 && colVotingIdx < filteredCells.length ? filteredCells[colVotingIdx] : "";
        const rawEvidence = colEvidenceIdx !== -1 && colEvidenceIdx < filteredCells.length ? filteredCells[colEvidenceIdx] : "";

        // Normalize Quality
        let quality = "Moderate";
        const qNorm = rawQuality.toLowerCase();
        if (qNorm.includes("very low") || qNorm.includes("rất thấp")) quality = "Very low";
        else if ((qNorm.includes("low") || qNorm.includes("thấp")) && !qNorm.includes("very") && !qNorm.includes("rất")) quality = "Low";
        else if (qNorm.includes("high") || qNorm.includes("cao")) quality = "High";

        // Normalize Strength
        const strength = normalizeEsoStrength(rawStrength, statement);

        const voting = rawVoting ? (rawVoting.startsWith("Vote:") ? rawVoting : `Vote: ${rawVoting}`) : undefined;
        const drivingTrials = parseEvidenceStudies(rawEvidence);
        const grade = `GRADE ${strength} (Evidence: ${quality}${voting ? `, Voting: ${voting}` : ""})`;

        practiceChanges.push({
          id: `rec-nlm-${year}-${practiceChanges.length + 1}`,
          category: activePicoQuestion ? activePicoQuestion.slice(0, 60) : "Clinical Recommendation",
          topic: `PICO ${activePicoNum} ${activePicoQuestion}`.trim(),
          changeType: inferChangeType(strength, statement),
          currentGrade: grade,
          currentText: statement,
          quality,
          strength,
          voting,
          expertConsensusStatement: rawConsensus || undefined,
          previousText: rawConsensus || undefined,
          picoNumber: activePicoNum,
          picoQuestion: activePicoQuestion,
          drivingTrials: drivingTrials.length > 0 ? drivingTrials : [`${detectedSociety} Practice Committee`],
        });
      } else {
        // ACC/AHA format
        const rawDomain = (colTopicIdx !== -1 && colTopicIdx < filteredCells.length ? filteredCells[colTopicIdx] : "") || `Recommendation ${practiceChanges.length + 1}`;
        const rawGrade = (colGradeIdx !== -1 && colGradeIdx < filteredCells.length ? filteredCells[colGradeIdx] : "") || "Class 1  LOE B-NR";
        const rawEvidence = colEvidenceIdx !== -1 && colEvidenceIdx < filteredCells.length ? filteredCells[colEvidenceIdx] : "";

        const { category, topic } = extractCategoryAndTopic(rawDomain);
        const grade = formatGrade(rawGrade);
        const changeType = inferChangeType(grade, statement);
        const drivingTrials = parseEvidenceStudies(rawEvidence);

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
  }

  // =========================================================================
  // STRATEGY 2: PARSE PICO BLOCKS (NON-TABLE NOTEBOOKLM SUMMARIES)
  // =========================================================================
  if (practiceChanges.length === 0) {
    const picoRegex = /(?:^|\n)(?:#+\s*|\*{2})?PICO\s*(\d+[a-z]?)[:.\s-]*([^\n*]*)(?:\*{2})?/gi;
    let match: RegExpExecArray | null;
    const picoBlocks: Array<{ picoNum: string; picoQuestion: string; startIndex: number }> = [];

    while ((match = picoRegex.exec(rawContent)) !== null) {
      picoBlocks.push({
        picoNum: match[1],
        picoQuestion: match[2]?.trim() || "",
        startIndex: match.index + match[0].length,
      });
    }

    if (picoBlocks.length > 0) {
      for (let b = 0; b < picoBlocks.length; b++) {
        const cur = picoBlocks[b];
        const nextStart = b + 1 < picoBlocks.length ? picoBlocks[b + 1].startIndex : rawContent.length;
        const blockText = rawContent.slice(cur.startIndex, nextStart);

        let statement = "";
        let quality = "Moderate";
        let strength = "Weak for intervention";
        let consensus = "";
        let voting = "";
        let trials: string[] = [];

        const bLines = blockText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        for (const line of bLines) {
          const lNorm = line.replace(/^[*\-#\s]+/, "");

          // Recommendation statement
          const recMatch = lNorm.match(/^(?:Recommendation|Khuyến cáo|Statement|Khuyến nghị)[:\s]*(.*)/i);
          if (recMatch && recMatch[1]) {
            statement = recMatch[1].replace(/[*_]/g, "").trim();
          } else if (
            !statement &&
            (lNorm.startsWith("In patients") ||
              lNorm.startsWith("Ở bệnh nhân") ||
              lNorm.startsWith("We recommend") ||
              lNorm.startsWith("We suggest") ||
              lNorm.startsWith("Chúng tôi khuyến cáo") ||
              lNorm.startsWith("Chúng tôi đề nghị"))
          ) {
            statement = lNorm.replace(/[*_]/g, "").trim();
          }

          // Quality
          const qMatch = lNorm.match(/^(?:Quality of evidence|Quality|Chất lượng bằng chứng|Chất lượng)[:\s]*(.*)/i);
          if (qMatch && qMatch[1]) {
            const qStr = qMatch[1].toLowerCase();
            if (qStr.includes("uncertain") || qStr.includes("ongoing") || qStr.trim() === "-" || qStr.trim() === "—") quality = "Uncertain / Ongoing trial";
            else if (qStr.includes("very low") || qStr.includes("rất thấp")) quality = "Very low";
            else if (qStr.includes("low") || qStr.includes("thấp")) quality = "Low";
            else if (qStr.includes("high") || qStr.includes("cao")) quality = "High";
            else quality = "Moderate";
          }

          // Strength
          const sMatch = lNorm.match(/^(?:Strength of recommendation|Strength|Mức độ khuyến cáo|Độ mạnh)[:\s]*(.*)/i);
          if (sMatch && sMatch[1]) {
            strength = normalizeEsoStrength(sMatch[1], statement);
          }

          // Consensus
          const cMatch = lNorm.match(/^(?:Expert consensus statement|Expert consensus|Consensus|Đồng thuận chuyên gia|Đồng thuận)[:\s]*(.*)/i);
          if (cMatch && cMatch[1]) {
            consensus = cMatch[1].replace(/[*_]/g, "").trim();
          }

          // Voting
          const vMatch = lNorm.match(/^(?:Voting|Vote|Bỏ phiếu|Biểu quyết)[:\s]*(.*)/i);
          if (vMatch && vMatch[1]) {
            voting = vMatch[1].replace(/[*_]/g, "").trim();
          }

          // Trials
          const tMatch = lNorm.match(/^(?:Related studies|Studies|Trials|Driving trials|Nghiên cứu|Thử nghiệm)[:\s]*(.*)/i);
          if (tMatch && tMatch[1]) {
            trials = parseEvidenceStudies(tMatch[1]);
          }
        }

        if (statement && statement.length > 5) {
          const voteStr = voting ? (voting.startsWith("Vote:") ? voting : `Vote: ${voting}`) : undefined;
          const grade = `GRADE ${strength} (Evidence: ${quality}${voteStr ? `, Voting: ${voteStr}` : ""})`;

          practiceChanges.push({
            id: `rec-nlm-${year}-${practiceChanges.length + 1}`,
            category: cur.picoQuestion ? cur.picoQuestion.slice(0, 60) : `PICO ${cur.picoNum}`,
            topic: `PICO ${cur.picoNum} ${cur.picoQuestion}`.trim(),
            changeType: inferChangeType(strength, statement),
            currentGrade: grade,
            currentText: statement,
            quality,
            strength,
            voting: voteStr,
            expertConsensusStatement: consensus || undefined,
            previousText: consensus || undefined,
            picoNumber: cur.picoNum,
            picoQuestion: cur.picoQuestion,
            drivingTrials: trials.length > 0 ? trials : [`${detectedSociety} Practice Committee`],
          });
        }
      }
    }
  }

  // =========================================================================
  // STRATEGY 3: PARSE NUMBERED OR BULLETED RECOMMENDATION LISTS
  // =========================================================================
  if (practiceChanges.length === 0) {
    const listLines = lines.filter((l) => /^(?:\d+\.|\*|\-|\•)\s+/.test(l));
    for (let idx = 0; idx < listLines.length; idx++) {
      const line = listLines[idx].replace(/^(?:\d+\.|\*|\-|\•)\s+/, "").trim();
      if (line.length < 15) continue;

      let grade = "Class 1, Level B";
      let statement = line;

      // Extract bracketed grade e.g. (Class 1, Level A) or [Class 2a, LOE B] or (GRADE Strong ...)
      const gradeMatch = line.match(/[\(\[](Class\s+[^\)\]]+|GRADE\s+[^\)\]]+|COR\s+[^\)\]]+|Mức\s+[^\)\]]+)[\)\]]/i);
      if (gradeMatch) {
        grade = formatGrade(gradeMatch[1]);
        statement = line.replace(gradeMatch[0], "").trim();
      }

      practiceChanges.push({
        id: `rec-nlm-${year}-${practiceChanges.length + 1}`,
        category: "Clinical Recommendation",
        topic: `Recommendation ${practiceChanges.length + 1}`,
        changeType: inferChangeType(grade, statement),
        currentGrade: grade,
        currentText: statement,
        drivingTrials: [`${detectedSociety} Practice Committee`],
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
  const sortedForTakeaways = [...practiceChanges].sort((a, b) => {
    const score = (rec: PracticeChangeDetail) => {
      const g = rec.currentGrade.toLowerCase();
      if (g.includes("harm")) return 10;
      if (g.includes("no benefit")) return 9;
      if (g.includes("class 1") && g.includes("level a")) return 8;
      if (g.includes("class 1")) return 7;
      if (g.includes("strong for")) return 7;
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
  const executiveSummary =
    descText.length > 30
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
