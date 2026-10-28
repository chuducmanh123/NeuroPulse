export interface StudyTypeDetectionResult {
  primaryType: string;
  allTypes: string[];
}

export function detectStudyTypes(
  title: string,
  abstract: string = "",
  doi: string = "",
  authorCount: number = 1
): [string, string[]] {
  const titleL = title.toLowerCase();
  const absL = (abstract || "").toLowerCase();
  const doiL = (doi || "").toLowerCase();
  const combined = `${titleL} ${absL}`;
  const hasRealAbs =
    Boolean(absL) &&
    !absL.startsWith("original abstract") &&
    !absL.startsWith("nothing to report") &&
    !absL.startsWith("the authors declare") &&
    absL.length >= 80;

  if (
    doiL.includes("/nejme") ||
    doiL.includes("/nejmp") ||
    doiL.includes("/nejmc") ||
    /^(editorial|comment|commentary|perspective|viewpoint|journal club|neurology journal club|author.?s?\s+reply|reply to|in\s+reply|letter)/i.test(
      titleL
    ) ||
    /\b(editorial|invited commentary|authors' reply|clinical trial of the year|are we there yet)\b/i.test(
      titleL
    ) ||
    (titleL.startsWith("expanding the evidence") && !absL.includes("methods"))
  ) {
    return ["Editorial / Perspective", ["Editorial / Perspective"]];
  }

  if (
    doiL.includes("/nejmicm") ||
    doiL.includes("/nejmcp") ||
    /\b(case\s+\d+-\d+|case report|case series|clinical reasoning|teaching neuroimage\w*|teaching video\w*|mystery case|image of|clinicopathological|pearls\s*&\s*oy-sters|child neurology:|tornado-like enhancement|fusiform enlargement|fibroblast imaging|quadrilateral syndrome|hyperdense anterior cerebral artery sign)\b/i.test(
      titleL
    )
  ) {
    return ["Case Report", ["Case Report"]];
  }

  // Guideline chỉ tính khi nằm trên Tiêu đề
  if (
    /\b(guideline|guidelines|consensus|scientific statement|practice advisory|practice parameter|position statement|recommendations from)\b/i.test(
      titleL
    )
  ) {
    return ["Guideline", ["Guideline", "Review"]];
  }

  if (
    /\b(meta-analysis|systematic review|network meta-analysis|pooled analysis|ipd analysis)\b/i.test(titleL) ||
    (absL.includes("systematic review") && absL.includes("meta-analysis")) ||
    absL.includes("pooled individual participant data")
  ) {
    return ["Meta-Analysis", ["Meta-Analysis", "Review", "Original Article"]];
  }

  const isSecondaryOrTrial =
    /\b(randomized|randomised|clinical trial|phase [123]|cohort|case-control)\b/i.test(titleL);
  if (
    !isSecondaryOrTrial &&
    (/\b(review|seminar|state of the art|contemporary issues|primer)\b/i.test(titleL) ||
      (hasRealAbs &&
        !absL.includes("methods") &&
        !absL.includes("results") &&
        /\b(overview|we review|this review|narrative review|recent advances)\b/i.test(absL)))
  ) {
    return ["Review", ["Review"]];
  }

  // Nếu bài không có Abstract thực sự (chỉ 1–7 tác giả viết bình luận/quan điểm ngắn)
  if (!hasRealAbs && authorCount <= 7 && !isSecondaryOrTrial) {
    return ["Editorial / Perspective", ["Editorial / Perspective"]];
  }

  const isObservationalCohort =
    /\b(nationwide cohort|retrospective cohort|prospective cohort|population-based cohort|nested case-control|observational study|observational analysis|administrative claims|mendelian randomization|cross-sectional)\b/i.test(
      combined
    ) && !/\b(randomized|randomised|phase [123])\b/i.test(titleL);

  const isPosthocOrNonRct =
    /\b(post hoc|post-hoc|secondary analysis|subanalysis|subgroup analysis|prespecified analysis|exploratory analysis|open-label extension|long-term extension|phase 1\b|phase i\b|phase 1b|single-arm|nonrandomized|non-randomized|protocol for|study protocol)\b/i.test(
      combined
    );

  // Loại bỏ cụm từ "warrant confirmation in randomized controlled trials" ở cuối bài khỏi tín hiệu RCT
  const cleanedForRctCheck = combined.replace(
    /\b(warrant\w*|need\w*|require\w*|confirm\w*|future|further)\s+(confirmation\s+in\s+|validation\s+in\s+)?(randomized|randomised)\s+(controlled\s+)?trials?\b/gi,
    ""
  );

  const hasRctSignals =
    !isObservationalCohort &&
    /\b(randomized|randomised|double-blind|placebo-controlled|phase 3|phase 2|phase iii|phase ii|randomly assigned|assigned in a \d+:\d+)\b/i.test(
      cleanedForRctCheck
    );
  const hasTrialSignals =
    hasRctSignals ||
    /\b(clinical trial|trial|phase 1|phase i|open-label|intervention)\b/i.test(titleL);

  if (hasRctSignals && !isPosthocOrNonRct) {
    return ["RCT", ["RCT", "Clinical Trial", "Original Article"]];
  }

  if (hasTrialSignals || (hasRctSignals && isPosthocOrNonRct)) {
    return ["Clinical Trial", ["Clinical Trial", "Original Article"]];
  }

  return ["Original Article", ["Original Article"]];
}
