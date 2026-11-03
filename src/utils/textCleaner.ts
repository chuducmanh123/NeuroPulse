const SUPERSCRIPT_MAP: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "+": "⁺",
  "-": "⁻",
  "=": "⁼",
  "(": "⁽",
  ")": "⁾",
};

const SUBSCRIPT_MAP: Record<string, string> = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",
  "+": "₊",
  "-": "₋",
  "=": "₌",
  "(": "₍",
  ")": "₎",
};

const LATEX_SYMBOLS: Record<string, string> = {
  "\\alpha": "α",
  "\\beta": "β",
  "\\gamma": "γ",
  "\\delta": "δ",
  "\\epsilon": "ε",
  "\\kappa": "κ",
  "\\lambda": "λ",
  "\\mu": "μ",
  "\\tau": "τ",
  "\\sigma": "σ",
  "\\omega": "ω",
  "\\Delta": "Δ",
  "\\chi": "χ",
  "\\Chi": "Χ",
  "\\times": "×",
  "\\cdot": "·",
  "\\pm": "±",
  "\\mp": "∓",
  "\\leq": "≤",
  "\\le": "≤",
  "\\geq": "≥",
  "\\ge": "≥",
  "\\approx": "≈",
  "\\sim": "~",
  "\\neq": "≠",
  "\\ne": "≠",
  "\\infty": "∞",
  "\\rightarrow": "→",
  "\\to": "→",
};

// Làm sạch triệt để ký hiệu LaTeX ($\beta$, $p = 1.98 \times 10^{-4}$) và HTML entities (&lt;, &gt;)
export function cleanMedicalText(text?: string): string {
  if (!text) return "";
  let s = text.replace(/<(?:\/?[a-zA-Z][^>]*)>/g, " ");
  for (let i = 0; i < 4; i++) {
    s = s
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&le;/g, "≤")
      .replace(/&ge;/g, "≥")
      .replace(/&plusmn;/g, "±")
      .replace(/&times;/g, "×")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ");
  }

  for (const [k, v] of Object.entries(LATEX_SYMBOLS)) {
    s = s.split(k).join(v);
  }

  s = s.replace(/\^\{([^}]+)\}/g, (_, inner: string) => {
    const trimmed = inner.trim();
    if ([...trimmed].every((c) => SUPERSCRIPT_MAP[c])) {
      return [...trimmed].map((c) => SUPERSCRIPT_MAP[c]).join("");
    }
    return `^(${trimmed})`;
  });

  s = s.replace(/\^(-?\d+)/g, (_, inner: string) => {
    return [...inner].map((c) => SUPERSCRIPT_MAP[c] || c).join("");
  });

  s = s.replace(/_\{([^}]+)\}/g, (_, inner: string) => {
    const trimmed = inner.trim();
    if ([...trimmed].every((c) => SUBSCRIPT_MAP[c])) {
      return [...trimmed].map((c) => SUBSCRIPT_MAP[c]).join("");
    }
    return trimmed;
  });

  s = s.replace(/\\(?:text|mathrm|mathbf|mathit)\{([^}]+)\}/g, "$1");
  s = s.replace(/\$([^$]+)\$/g, "$1");

  // Chuẩn hóa các nhãn mục trong Abstract bị dính liền vào chữ kế tiếp
  s = s.replace(
    /(?:^|(?<=[.!?;)\s]|\bp\s*))(Background and [Oo]bjectives|Background and [Pp]urpose|Design,\s*[Ss]etting,\s*and\s*[Pp]articipants|Main [Oo]utcomes? and [Mm]easures?|Conclusions? and [Rr]elevance|Classification of [Ee]vidence|Trial [Rr]egistration(?:\s+[Ii]nformation)?|Patients and [Mm]ethods|Methods and [Aa]nalysis|Interventions?|Exposures?|Observations|Importance|Objectives?|Background|Methods|Results|Findings|Discussion|Conclusions?|Interpretation|Funding|BACKGROUND AND OBJECTIVES|BACKGROUND AND PURPOSE|DESIGN, SETTING, AND PARTICIPANTS|MAIN OUTCOMES? AND MEASURES?|CONCLUSIONS? AND RELEVANCE|CLASSIFICATION OF EVIDENCE|TRIAL REGISTRATION|INTERVENTIONS?|EXPOSURES?|OBSERVATIONS|IMPORTANCE|OBJECTIVES?|BACKGROUND|METHODS|RESULTS|FINDINGS|DISCUSSION|CONCLUSIONS?|INTERPRETATION|FUNDING)(?:\s*:\s*|\s*(?=[A-Z0-9]))/g,
    (_, header: string) => ` ${header.trim()}: `
  );

  return s.replace(/\s+/g, " ").trim();
}

export function isTakeawayValid(text?: string): boolean {
  if (!text || text.trim().length < 35) return false;
  if (
    text.startsWith("Published clinical evidence in") ||
    text.toLowerCase().includes("data may be available from the corresponding author")
  ) {
    return false;
  }
  // Check for prompt leakage or LLM drafting artifacts
  if (
    /\b(?:draft\s*\d|check\s*word\s*count|word\s*count|<\s*\d+\)|exact\s*stats)\b/i.test(text) ||
    /^(?::\*|\*|-limited\b)/i.test(text.trim()) ||
    /[,;\-–—\(\[\<]\s*$/.test(text.trim())
  ) {
    return false;
  }
  // Check if truncated by trailing conjunctions/prepositions
  if (
    /\b(and|or|with|to|of|in|for|from|by|at|as|than|compared|is|are|was|were|the|a|an|that|which|this|these|between|into|both)\b\s*$/i.test(
      text.trim()
    )
  ) {
    return false;
  }

  // A complete medical takeaway must terminate with valid sentence punctuation
  const trimmed = text.trim();
  if (!/[.!?”"')]$/.test(trimmed)) {
    return false;
  }

  return true;
}

export function extractFallbackFromAbstract(cleanAbs?: string): string {
  if (!cleanAbs || cleanAbs.startsWith("Original abstract") || cleanAbs.toLowerCase().startsWith("nothing to report")) {
    return "";
  }
  const matchConcl = cleanAbs.match(
    /(?:CONCLUSIONS?\s+AND\s+RELEVANCE|CONCLUSIONS?|INTERPRETATION|FINDINGS|DISCUSSION)\s*[:.]?\s*([^\n]+)/i
  );
  if (matchConcl && matchConcl[1]) {
    const candidate = cleanMedicalText(matchConcl[1]).replace(
      /^(?:discussion|conclusions?\s+and\s+relevance|conclusions?|interpretation|findings|summary)\s*[:.\-]?\s*/i,
      ""
    ).trim();
    if (candidate.length > 25) {
      const sents = candidate.split(". ").filter((s) => s.trim().length > 20);
      if (sents.length > 0) {
        const firstTwo = sents.slice(0, 2).join(". ");
        return firstTwo.endsWith(".") ? firstTwo : `${firstTwo}.`;
      }
      return candidate;
    }
  }

  const sents = cleanAbs
    .split(". ")
    .map((s) => cleanMedicalText(s).trim())
    .filter((s) => s.length > 30);
  if (sents.length > 0) {
    const lastSent = sents[sents.length - 1];
    return lastSent.endsWith(".") ? lastSent : `${lastSent}.`;
  }
  return "";
}
