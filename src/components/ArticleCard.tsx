"use client";

import React, { useState, useEffect } from "react";
import { Article } from "../types/article";

interface ArticleCardProps {
  article: Article;
  onTagClick?: (tag: string) => void;
  onSubspecialtyClick?: (sub: string) => void;
  onStudyTypeClick?: (type: string) => void;
  isBookmarked?: boolean;
  onToggleBookmark?: (id: string) => void;
  clinicalNote?: string;
  onSaveNote?: (id: string, note: string) => void;
  darkMode?: boolean;
  compactMode?: boolean;
}

export interface JournalTheme {
  headerBg: string;
  headerText: string;
  badgeBg: string;
  badgeText: string;
  borderCard: string;
  darkBorderCard: string;
  takeawayBorder: string;
  takeawayBg: string;
  darkTakeawayBg: string;
  takeawayTitle: string;
  darkTakeawayTitle: string;
  groupDot: string;
  groupBorder: string;
  groupBg: string;
  darkGroupBg: string;
}

export const JOURNAL_THEMES: Record<string, JournalTheme> = {
  "the lancet": {
    headerBg: "bg-gradient-to-r from-blue-700 to-blue-800",
    headerText: "text-blue-100",
    badgeBg: "bg-white text-blue-900",
    badgeText: "text-blue-950 font-black",
    borderCard: "border-blue-200 hover:border-blue-400",
    darkBorderCard: "border-blue-900/70 hover:border-blue-600",
    takeawayBorder: "border-l-blue-600",
    takeawayBg: "bg-blue-50/70",
    darkTakeawayBg: "bg-blue-950/40",
    takeawayTitle: "text-blue-900",
    darkTakeawayTitle: "text-blue-300",
    groupDot: "bg-blue-600",
    groupBorder: "border-blue-200",
    groupBg: "bg-blue-50/80 text-blue-900",
    darkGroupBg: "bg-blue-950/60 text-blue-200 border-blue-800",
  },
  "lancet neurol": {
    headerBg: "bg-gradient-to-r from-cyan-800 to-teal-800",
    headerText: "text-cyan-100",
    badgeBg: "bg-white text-teal-900",
    badgeText: "text-teal-950 font-black",
    borderCard: "border-cyan-200 hover:border-cyan-400",
    darkBorderCard: "border-cyan-900/70 hover:border-cyan-600",
    takeawayBorder: "border-l-cyan-600",
    takeawayBg: "bg-cyan-50/70",
    darkTakeawayBg: "bg-cyan-950/40",
    takeawayTitle: "text-cyan-900",
    darkTakeawayTitle: "text-cyan-300",
    groupDot: "bg-cyan-700",
    groupBorder: "border-cyan-200",
    groupBg: "bg-cyan-50/80 text-cyan-900",
    darkGroupBg: "bg-cyan-950/60 text-cyan-200 border-cyan-800",
  },
  nejm: {
    headerBg: "bg-gradient-to-r from-orange-600 to-amber-700",
    headerText: "text-orange-100",
    badgeBg: "bg-white text-orange-950",
    badgeText: "text-orange-950 font-black",
    borderCard: "border-orange-200 hover:border-orange-400",
    darkBorderCard: "border-orange-900/70 hover:border-orange-600",
    takeawayBorder: "border-l-orange-600",
    takeawayBg: "bg-orange-50/70",
    darkTakeawayBg: "bg-orange-950/40",
    takeawayTitle: "text-orange-950",
    darkTakeawayTitle: "text-orange-300",
    groupDot: "bg-orange-600",
    groupBorder: "border-orange-200",
    groupBg: "bg-orange-50/80 text-orange-900",
    darkGroupBg: "bg-orange-950/60 text-orange-200 border-orange-800",
  },
  jama: {
    headerBg: "bg-gradient-to-r from-red-600 to-red-700",
    headerText: "text-red-100",
    badgeBg: "bg-white text-red-950",
    badgeText: "text-red-950 font-black",
    borderCard: "border-red-200 hover:border-red-400",
    darkBorderCard: "border-red-900/70 hover:border-red-600",
    takeawayBorder: "border-l-red-600",
    takeawayBg: "bg-red-50/70",
    darkTakeawayBg: "bg-red-950/40",
    takeawayTitle: "text-red-950",
    darkTakeawayTitle: "text-red-300",
    groupDot: "bg-red-600",
    groupBorder: "border-red-200",
    groupBg: "bg-red-50/80 text-red-900",
    darkGroupBg: "bg-red-950/60 text-red-200 border-red-800",
  },
  "jama neurol": {
    headerBg: "bg-gradient-to-r from-rose-600 to-pink-700",
    headerText: "text-rose-100",
    badgeBg: "bg-white text-rose-950",
    badgeText: "text-rose-950 font-black",
    borderCard: "border-rose-200 hover:border-rose-400",
    darkBorderCard: "border-rose-900/70 hover:border-rose-600",
    takeawayBorder: "border-l-rose-600",
    takeawayBg: "bg-rose-50/70",
    darkTakeawayBg: "bg-rose-950/40",
    takeawayTitle: "text-rose-950",
    darkTakeawayTitle: "text-rose-300",
    groupDot: "bg-rose-600",
    groupBorder: "border-rose-200",
    groupBg: "bg-rose-50/80 text-rose-900",
    darkGroupBg: "bg-rose-950/60 text-rose-200 border-rose-800",
  },
  stroke: {
    headerBg: "bg-gradient-to-r from-red-800 to-red-950",
    headerText: "text-red-100",
    badgeBg: "bg-white text-red-950",
    badgeText: "text-red-950 font-black",
    borderCard: "border-red-300 hover:border-red-500",
    darkBorderCard: "border-red-900/80 hover:border-red-600",
    takeawayBorder: "border-l-red-800",
    takeawayBg: "bg-red-50/70",
    darkTakeawayBg: "bg-red-950/40",
    takeawayTitle: "text-red-950",
    darkTakeawayTitle: "text-red-300",
    groupDot: "bg-red-800",
    groupBorder: "border-red-300",
    groupBg: "bg-red-50/80 text-red-950",
    darkGroupBg: "bg-red-950/60 text-red-200 border-red-800",
  },
  neurology: {
    headerBg: "bg-gradient-to-r from-emerald-700 to-green-800",
    headerText: "text-emerald-100",
    badgeBg: "bg-white text-emerald-950",
    badgeText: "text-emerald-950 font-black",
    borderCard: "border-emerald-200 hover:border-emerald-400",
    darkBorderCard: "border-emerald-900/70 hover:border-emerald-600",
    takeawayBorder: "border-l-emerald-600",
    takeawayBg: "bg-emerald-50/70",
    darkTakeawayBg: "bg-emerald-950/40",
    takeawayTitle: "text-emerald-950",
    darkTakeawayTitle: "text-emerald-300",
    groupDot: "bg-emerald-700",
    groupBorder: "border-emerald-200",
    groupBg: "bg-emerald-50/80 text-emerald-900",
    darkGroupBg: "bg-emerald-950/60 text-emerald-200 border-emerald-800",
  },
  "ann neurol": {
    headerBg: "bg-gradient-to-r from-violet-700 to-purple-800",
    headerText: "text-violet-100",
    badgeBg: "bg-white text-violet-950",
    badgeText: "text-violet-950 font-black",
    borderCard: "border-violet-200 hover:border-violet-400",
    darkBorderCard: "border-violet-900/70 hover:border-violet-600",
    takeawayBorder: "border-l-violet-600",
    takeawayBg: "bg-violet-50/70",
    darkTakeawayBg: "bg-violet-950/40",
    takeawayTitle: "text-violet-950",
    darkTakeawayTitle: "text-violet-300",
    groupDot: "bg-violet-700",
    groupBorder: "border-violet-200",
    groupBg: "bg-violet-50/80 text-violet-950",
    darkGroupBg: "bg-violet-950/60 text-violet-200 border-violet-800",
  },
};

export function getJournalTheme(shortName?: string): JournalTheme {
  const key = (shortName || "").toLowerCase();
  return JOURNAL_THEMES[key] || JOURNAL_THEMES["nejm"];
}

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

  // Chuẩn hóa các nhãn mục trong Abstract bị dính liền vào chữ kế tiếp (VD: BackgroundEndovascular, MethodsWe, ResultsA, ConclusionsAmong, care.MethodsThis)
  s = s.replace(
    /(?:^|(?<=[.!?;)\s]|\bp\s*))(Background and [Oo]bjectives|Background and [Pp]urpose|Design,\s*[Ss]etting,\s*and\s*[Pp]articipants|Main [Oo]utcomes? and [Mm]easures?|Conclusions? and [Rr]elevance|Classification of [Ee]vidence|Trial [Rr]egistration(?:\s+[Ii]nformation)?|Patients and [Mm]ethods|Methods and [Aa]nalysis|Interventions?|Exposures?|Observations|Importance|Objectives?|Background|Methods|Results|Findings|Discussion|Conclusions?|Interpretation|Funding|BACKGROUND AND OBJECTIVES|BACKGROUND AND PURPOSE|DESIGN, SETTING, AND PARTICIPANTS|MAIN OUTCOMES? AND MEASURES?|CONCLUSIONS? AND RELEVANCE|CLASSIFICATION OF EVIDENCE|TRIAL REGISTRATION|INTERVENTIONS?|EXPOSURES?|OBSERVATIONS|IMPORTANCE|OBJECTIVES?|BACKGROUND|METHODS|RESULTS|FINDINGS|DISCUSSION|CONCLUSIONS?|INTERPRETATION|FUNDING)(?:\s*:\s*|\s*(?=[A-Z0-9]))/g,
    (_, header: string) => ` ${header.trim()}: `
  );

  return s.replace(/\s+/g, " ").trim();
}

// Tự động làm nổi bật các chỉ số thống kê lâm sàng (HR, OR, RR, 95% CI, p-value, mRS, NIHSS, %)
const STAT_HIGHLIGHT_REGEX =
  /(\b(?:a?HR|a?OR|a?RR|IRR|95%\s*CI|C-index|mRS|NIHSS|NNT|NNH)\b(?:\s*[:=]?\s*-?\d+(?:\.\d+)?(?:\s*(?:to|–|-)\s*-?\d+(?:\.\d+)?)?)?|(?:β|B)\s*=\s*-?\d+(?:\.\d+)?(?:\s*±\s*\d+(?:\.\d+)?)?|\b[pP]\s*[<=>≤≥]\s*\d*(?:\.\d+)?(?:\s*×\s*10[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+)?|\b\d+(?:\.\d+)?%)/g;

export function highlightClinicalStats(rawText: string, darkMode = false): React.ReactNode {
  const text = cleanMedicalText(rawText);
  if (!text) return null;
  const parts = text.split(STAT_HIGHLIGHT_REGEX);
  if (parts.length <= 1) return text;

  const matcher = new RegExp(`^${STAT_HIGHLIGHT_REGEX.source}$`);
  return parts.map((part, idx) => {
    if (matcher.test(part)) {
      return (
        <span
          key={idx}
          className={`font-extrabold px-1 py-0.2 rounded ${
            darkMode
              ? "bg-amber-500/20 text-amber-300"
              : "bg-amber-100/90 text-slate-950"
          }`}
        >
          {part}
        </span>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

const STRUCTURED_SECTION_REGEX =
  /(?:^|(?<=[.!?;)\s]))(Background and [Oo]bjectives|Background and [Pp]urpose|Design,\s*[Ss]etting,\s*and\s*[Pp]articipants|Main [Oo]utcomes? and [Mm]easures?|Conclusions? and [Rr]elevance|Classification of [Ee]vidence|Trial [Rr]egistration(?:\s+[Ii]nformation)?|Patients and [Mm]ethods|Methods and [Aa]nalysis|Interventions?|Exposures?|Observations|Importance|Objectives?|Background|Methods|Results|Findings|Discussion|Conclusions?|Interpretation|Funding|BACKGROUND AND OBJECTIVES|BACKGROUND AND PURPOSE|DESIGN, SETTING, AND PARTICIPANTS|MAIN OUTCOMES? AND MEASURES?|CONCLUSIONS? AND RELEVANCE|CLASSIFICATION OF EVIDENCE|TRIAL REGISTRATION|INTERVENTIONS?|EXPOSURES?|OBSERVATIONS|IMPORTANCE|OBJECTIVES?|BACKGROUND|METHODS|RESULTS|FINDINGS|DISCUSSION|CONCLUSIONS?|INTERPRETATION|FUNDING)(?:\s*:\s*|\s+(?=[A-Z0-9]))/g;

function parseAbstractSections(text: string): { header?: string; body: string }[] {
  const cleaned = cleanMedicalText(text);
  const matches = Array.from(cleaned.matchAll(STRUCTURED_SECTION_REGEX));
  if (matches.length === 0) {
    return [{ body: cleaned }];
  }

  const sections: { header?: string; body: string }[] = [];
  const firstIdx = matches[0].index ?? 0;
  if (firstIdx > 0) {
    const intro = cleaned.slice(0, firstIdx).trim();
    if (intro) {
      sections.push({ body: intro });
    }
  }

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const header = current[1].trim();
    const bodyStart = (current.index ?? 0) + current[0].length;
    const bodyEnd =
      i + 1 < matches.length ? (matches[i + 1].index ?? cleaned.length) : cleaned.length;
    const body = cleaned.slice(bodyStart, bodyEnd).trim();
    if (body) {
      sections.push({ header, body });
    }
  }

  return sections.length > 0 ? sections : [{ body: cleaned }];
}

export function ArticleCard({
  article,
  onTagClick,
  onSubspecialtyClick,
  onStudyTypeClick,
  isBookmarked = false,
  onToggleBookmark,
  clinicalNote = "",
  onSaveNote,
  darkMode = false,
  compactMode = false,
}: ArticleCardProps) {
  const [showFullAbstract, setShowFullAbstract] = useState(false);
  const [expandedInCompact, setExpandedInCompact] = useState(false);
  const [copied, setCopied] = useState(false);
  const [noteInput, setNoteInput] = useState(clinicalNote);
  const [isEditingNote, setIsEditingNote] = useState(false);

  useEffect(() => {
    setNoteInput(clinicalNote);
  }, [clinicalNote]);

  const isRecentArticle = () => {
    if ((article as any).is_new) return true;
    if (!article.pub_date) return false;
    const pubTime = new Date(article.pub_date).getTime();
    if (isNaN(pubTime)) return false;
    const diffDays = (Date.now() - pubTime) / (1000 * 60 * 60 * 24);
    return diffDays >= -1 && diffDays <= 7;
  };

  const isNew = isRecentArticle();
  const journalKey = (article.journal.short_name || article.journal.name || "").toLowerCase();
  const theme = getJournalTheme(journalKey);

  const formattedDate = article.pub_date
    ? new Date(article.pub_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const cleanTitle = cleanMedicalText(article.title);
  const cleanAbs = cleanMedicalText(article.abstract);

  const hasRealAbstract =
    Boolean(cleanAbs) &&
    !cleanAbs.startsWith("Original abstract and full manuscript available") &&
    !cleanAbs.toLowerCase().startsWith("nothing to report.");

  const takeawayText =
    article.ai_takeaways?.conclusion_vi &&
    !article.ai_takeaways.conclusion_vi.startsWith("Published clinical evidence in") &&
    !article.ai_takeaways.conclusion_vi
      .toLowerCase()
      .includes("data may be available from the corresponding author")
      ? cleanMedicalText(
          article.ai_takeaways.conclusion_vi.replace(
            /^(?:discussion|conclusions?\s+and\s+relevance|conclusions?|interpretation|findings|summary)\s*[:.\-]?\s*/i,
            ""
          )
        )
      : "";

  const subspecialtyList =
    article.neurology_classification.subspecialties &&
    article.neurology_classification.subspecialties.length > 0
      ? article.neurology_classification.subspecialties
      : [article.neurology_classification.subspecialty || "Other"];

  const studyTypeList =
    article.article_types && article.article_types.length > 0
      ? article.article_types
      : [article.article_type];

  const handleCopyForJournalClub = () => {
    const jName = article.journal.short_name || article.journal.name;
    const tags = article.neurology_classification.topics.map((t) => `#${t}`).join(" ");
    const subs = subspecialtyList.join(" • ");
    const lines = [
      `📌 [${jName} • ${formattedDate} | ${studyTypeList.join(" / ")}]`,
      `📄 ${cleanTitle}`,
      `🏷️ Subspecialty: ${subs} (${tags})`,
    ];
    if (takeawayText) {
      lines.push(`💡 Key Takeaway: ${takeawayText}`);
    }
    if (clinicalNote.trim()) {
      lines.push(`📝 Clinical Note: ${clinicalNote.trim()}`);
    }
    lines.push(`🔗 DOI: ${article.doi_url}`);

    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  };

  const pubmedSearchUrl = `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(
    article.id || cleanTitle
  )}`;

  const formatStructuredAbstract = (text: string) => {
    if (!text) return null;

    if (!showFullAbstract) {
      return (
        <p className={`leading-relaxed line-clamp-3 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
          {highlightClinicalStats(text, darkMode)}
        </p>
      );
    }

    const sections = parseAbstractSections(text);

    if (sections.length <= 1 && !sections[0]?.header) {
      return (
        <p className={`leading-relaxed ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
          {highlightClinicalStats(text, darkMode)}
        </p>
      );
    }

    return (
      <div className="space-y-2.5">
        {sections.map((sec, idx) =>
          sec.header ? (
            <div key={idx} className={`leading-relaxed ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
              <span
                className={`font-bold uppercase text-[11px] tracking-wide px-1.5 py-0.5 rounded mr-1.5 inline-block ${
                  darkMode ? "bg-slate-700 text-slate-100" : "bg-slate-200/70 text-slate-900"
                }`}
              >
                {sec.header}:
              </span>
              <span>{highlightClinicalStats(sec.body, darkMode)}</span>
            </div>
          ) : (
            <p key={idx} className={`leading-relaxed ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
              {highlightClinicalStats(sec.body, darkMode)}
            </p>
          )
        )}
      </div>
    );
  };

  // CHẾ ĐỘ XEM RÚT GỌN (COMPACT VIEW) KHI CHƯA BẤM MỞ RỘNG
  if (compactMode && !expandedInCompact) {
    return (
      <div
        className={`rounded-xl border transition-all duration-150 px-4 py-3 flex flex-col gap-1.5 ${
          darkMode
            ? `bg-slate-900 ${theme.darkBorderCard}`
            : `bg-white ${theme.borderCard} shadow-xs hover:shadow-sm`
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider"
              style={{
                backgroundColor: article.journal.badge_bg,
                color: article.journal.badge_text,
              }}
            >
              {article.journal.short_name || article.journal.name}
            </span>
            {isNew && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500 text-white">
                NEW
              </span>
            )}
            <span
              onClick={() => onStudyTypeClick?.(article.article_type)}
              className={`cursor-pointer text-[11px] font-semibold px-2 py-0.5 rounded ${
                darkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"
              }`}
            >
              {article.article_type}
            </span>
            {subspecialtyList.map((sub, i) => (
              <span
                key={i}
                onClick={() => onSubspecialtyClick?.(sub)}
                className={`cursor-pointer text-[11px] font-medium px-2 py-0.5 rounded ${
                  darkMode
                    ? "bg-slate-800/70 text-slate-400 hover:text-slate-200"
                    : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                }`}
              >
                {sub}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setExpandedInCompact(true)}
              className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                darkMode
                  ? "text-blue-400 hover:bg-slate-800"
                  : "text-blue-600 hover:bg-blue-50"
              }`}
            >
              Details ▼
            </button>
            {onToggleBookmark && (
              <button
                onClick={() => onToggleBookmark(article.id)}
                className={`text-sm ${isBookmarked ? "text-amber-400" : "text-slate-400"}`}
              >
                {isBookmarked ? "★" : "☆"}
              </button>
            )}
          </div>
        </div>

        <h3
          className={`text-sm sm:text-base font-bold leading-snug ${
            darkMode ? "text-slate-100 hover:text-blue-400" : "text-slate-900 hover:text-blue-600"
          }`}
        >
          <a href={article.doi_url} target="_blank" rel="noopener noreferrer">
            {cleanTitle}
          </a>
        </h3>

        {takeawayText && (
          <p
            className={`text-xs pl-2.5 border-l-2 ${theme.takeawayBorder} ${
              darkMode ? "text-slate-300" : "text-slate-700"
            }`}
          >
            {highlightClinicalStats(takeawayText, darkMode)}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 ${
        darkMode
          ? `bg-slate-900 ${theme.darkBorderCard}`
          : `bg-white ${theme.borderCard}`
      }`}
    >
      {/* KHỐI HEADER ĐẦU BÀI BÁO */}
      <div
        className={`${theme.headerBg} px-5 py-2.5 text-white flex flex-wrap items-center justify-between gap-2 shadow-inner`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`px-2.5 py-0.5 rounded shadow-sm text-xs font-black uppercase tracking-wider ${theme.badgeBg}`}
          >
            {article.journal.short_name || article.journal.name}
          </span>

          {isNew && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500 text-white shadow-sm ring-1 ring-white/50">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
              </span>
              NEW
            </span>
          )}

          {studyTypeList.map((st, idx) => (
            <span
              key={st}
              onClick={() => onStudyTypeClick?.(st)}
              className={`cursor-pointer text-xs font-semibold px-2 py-0.5 rounded transition-colors ${
                idx === 0
                  ? `bg-black/25 text-white hover:bg-black/35`
                  : `bg-black/15 ${theme.headerText} hover:bg-black/25 text-[11px]`
              }`}
              title={`Filter by study type: ${st}`}
            >
              {st}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {compactMode && expandedInCompact && (
            <button
              onClick={() => setExpandedInCompact(false)}
              className="text-[11px] font-bold px-2 py-0.5 rounded bg-black/25 text-white hover:bg-black/40"
            >
              Collapse Card ▲
            </button>
          )}
          {formattedDate && (
            <span className={`text-xs font-medium ${theme.headerText} tracking-wide`}>
              {formattedDate}
            </span>
          )}
          {onToggleBookmark && (
            <button
              onClick={() => onToggleBookmark(article.id)}
              title={isBookmarked ? "Remove from saved" : "Save article for later"}
              className="text-sm hover:scale-110 transition-transform focus:outline-none"
            >
              {isBookmarked ? "★" : "☆"}
            </button>
          )}
        </div>
      </div>

      {/* THÂN THẺ BÀI BÁO */}
      <div className="p-5">
        <h3
          className={`text-base sm:text-lg font-bold leading-snug mb-2 transition-colors ${
            darkMode
              ? "text-slate-100 hover:text-blue-400"
              : "text-slate-900 hover:text-blue-600"
          }`}
        >
          <a href={article.doi_url} target="_blank" rel="noopener noreferrer">
            {cleanTitle}
          </a>
        </h3>

        {article.authors && article.authors.length > 0 && (
          <p className="text-xs text-slate-500 mb-3 line-clamp-1 font-medium">
            {article.authors.join(", ")}
          </p>
        )}

        {/* Đa nhãn Phân khoa (Multi-Subspecialty Tags) & Chủ đề */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3.5">
          {subspecialtyList.map((sub, idx) => (
            <span
              key={sub}
              onClick={() => onSubspecialtyClick?.(sub)}
              className={`cursor-pointer text-[11px] font-bold px-2.5 py-0.5 rounded-md transition-colors ${
                idx === 0
                  ? darkMode
                    ? "bg-blue-950/80 text-blue-300 border border-blue-800/70 hover:bg-blue-900"
                    : "bg-slate-800 text-white hover:bg-slate-700"
                  : darkMode
                  ? "bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700"
                  : "bg-slate-200/80 text-slate-800 hover:bg-slate-300"
              }`}
              title={`Filter by subspecialty: ${sub}`}
            >
              {sub}
            </span>
          ))}
          {article.neurology_classification.topics.map((topic, i) => (
            <span
              key={i}
              onClick={() => onTagClick?.(topic)}
              className={`cursor-pointer text-[11px] px-2 py-0.5 rounded-md border transition-colors ${
                darkMode
                  ? "bg-slate-800/50 text-slate-300 border-slate-700 hover:bg-slate-800"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              #{topic}
            </span>
          ))}
        </div>

        {/* Key Findings / Clinical Takeaway Box */}
        {takeawayText && (
          <div
            className={`${
              darkMode ? theme.darkTakeawayBg : theme.takeawayBg
            } border-l-4 ${theme.takeawayBorder} rounded-r-lg p-3.5 mb-3`}
          >
            <div className="flex items-center justify-between mb-1">
              <span
                className={`text-[11px] font-bold uppercase tracking-wider ${
                  darkMode ? theme.darkTakeawayTitle : theme.takeawayTitle
                }`}
              >
                KEY FINDINGS / CLINICAL TAKEAWAY
              </span>
              {article.ai_takeaways?.ai_verified && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    darkMode
                      ? "bg-indigo-950/80 text-indigo-300 border-indigo-800"
                      : "bg-white/80 text-indigo-700 border-indigo-200"
                  }`}
                >
                  ✨ Gemini AI
                </span>
              )}
            </div>
            <p
              className={`text-xs sm:text-sm leading-relaxed font-medium ${
                darkMode ? "text-slate-200" : "text-slate-800"
              }`}
            >
              {highlightClinicalStats(takeawayText, darkMode)}
            </p>
          </div>
        )}

        {/* GHI CHÚ LÂM SÀNG CÁ NHÂN (PERSONAL CLINICAL NOTE) */}
        {(isBookmarked || clinicalNote) && onSaveNote && (
          <div
            className={`mb-3 p-3 rounded-lg border text-xs ${
              darkMode
                ? "bg-amber-950/30 border-amber-800/60 text-amber-200"
                : "bg-amber-50/70 border-amber-200 text-slate-800"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-[11px] uppercase tracking-wider text-amber-600 dark:text-amber-400">
                📝 Personal Clinical Note
              </span>
              {!isEditingNote && (
                <button
                  onClick={() => setIsEditingNote(true)}
                  className="text-[11px] font-semibold text-blue-600 hover:underline"
                >
                  {clinicalNote ? "Edit Note" : "+ Add Note"}
                </button>
              )}
            </div>

            {isEditingNote ? (
              <div className="space-y-2">
                <textarea
                  rows={2}
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Ghi chú lâm sàng (VD: Báo cáo giao ban thứ 5, áp dụng cho BN rung nhĩ + tiền sử XHN)..."
                  className={`w-full p-2 rounded border text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    darkMode
                      ? "bg-slate-900 border-slate-700 text-slate-100"
                      : "bg-white border-amber-300 text-slate-900"
                  }`}
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setNoteInput(clinicalNote);
                      setIsEditingNote(false);
                    }}
                    className="px-2.5 py-1 rounded text-[11px] font-semibold text-slate-500 hover:bg-slate-200/50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      onSaveNote(article.id, noteInput);
                      setIsEditingNote(false);
                    }}
                    className="px-3 py-1 rounded text-[11px] font-bold bg-amber-500 text-white hover:bg-amber-600"
                  >
                    Save Note
                  </button>
                </div>
              </div>
            ) : clinicalNote ? (
              <p className="italic leading-relaxed">{clinicalNote}</p>
            ) : (
              <p
                onClick={() => setIsEditingNote(true)}
                className="cursor-pointer text-slate-400 italic"
              >
                Click &quot;+ Add Note&quot; to attach a personal clinical memo for this saved study...
              </p>
            )}
          </div>
        )}

        {/* Structured Abstract */}
        {hasRealAbstract ? (
          <div
            className={`mt-3 text-xs p-3.5 rounded-lg border ${
              darkMode
                ? "bg-slate-800/50 border-slate-700/80"
                : "bg-slate-50/80 border-slate-200/80"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">
                Structured Abstract
              </span>
              <button
                onClick={() => setShowFullAbstract(!showFullAbstract)}
                className={`text-[11px] font-semibold transition-colors ${
                  darkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-800"
                }`}
              >
                {showFullAbstract ? "Collapse ▲" : "Expand Full Abstract ▼"}
              </button>
            </div>

            {formatStructuredAbstract(cleanAbs)}
          </div>
        ) : (
          <div
            className={`mt-2 py-2.5 px-3.5 rounded-lg border border-dashed text-[11px] flex items-center justify-between gap-2 ${
              darkMode
                ? "bg-slate-800/30 border-slate-700 text-slate-400"
                : "bg-slate-50 border-slate-200 text-slate-500"
            }`}
          >
            {article.article_type === "Editorial / Perspective" ? (
              <span>
                💬{" "}
                <strong className={darkMode ? "text-slate-300" : "text-slate-700"}>
                  Expert Commentary / Editorial
                </strong>{" "}
                — Invited clinical perspective &amp; appraisal on{" "}
                <strong className={darkMode ? "text-slate-300" : "text-slate-700"}>
                  {article.journal.short_name || article.journal.name}
                </strong>{" "}
                (no structured abstract issued by publisher).
              </span>
            ) : article.article_type === "Case Report" ? (
              <span>
                🖼️{" "}
                <strong className={darkMode ? "text-slate-300" : "text-slate-700"}>
                  Clinical Case / NeuroImage
                </strong>{" "}
                — Diagnostic neuroimaging &amp; bedside case discussion available on{" "}
                <strong className={darkMode ? "text-slate-300" : "text-slate-700"}>
                  {article.journal.short_name || article.journal.name}
                </strong>
                .
              </span>
            ) : (
              <span>
                📄 Full manuscript &amp; study details available on{" "}
                <strong className={darkMode ? "text-slate-300" : "text-slate-700"}>
                  {article.journal.short_name || article.journal.name}
                </strong>
                .
              </span>
            )}
          </div>
        )}

        {/* Bottom Action */}
        <div
          className={`mt-4 pt-3 border-t flex flex-wrap items-center justify-between gap-2 ${
            darkMode ? "border-slate-800" : "border-slate-100"
          }`}
        >
          <span className="text-[11px] text-slate-400 font-mono truncate max-w-[40%]">
            DOI: {article.id}
          </span>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleCopyForJournalClub}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-all flex items-center gap-1 ${
                copied
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                  : darkMode
                  ? "bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
              title="Copy formatted summary & citation for Zalo, Telegram, or Journal Club slides"
            >
              <span>{copied ? "✓ Copied!" : "📋 Copy for Journal Club"}</span>
            </button>

            <a
              href={pubmedSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`px-2 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
                darkMode
                  ? "bg-slate-800/60 text-slate-300 border-slate-700 hover:bg-slate-800"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
              title="Search this article on PubMed"
            >
              PubMed ↗
            </a>

            <a
              href={article.doi_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-xs font-semibold flex items-center gap-1 group ${
                darkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-800"
              }`}
            >
              View Article
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
