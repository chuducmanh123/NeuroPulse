"use client";

import React, { useState, useEffect } from "react";
import { Article } from "../types/article";
import { sanitizeUrl } from "@/utils/safeUrl";

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
    headerBg: "bg-[#1B3A57]",
    headerText: "text-blue-100",
    badgeBg: "bg-white/15 text-white",
    badgeText: "text-white font-bold",
    borderCard: "border-[var(--border-hairline)] hover:border-blue-400/70",
    darkBorderCard: "border-[var(--border-hairline)] hover:border-blue-500/60",
    takeawayBorder: "border-l-[#1B3A57]",
    takeawayBg: "bg-[var(--bg-subtle)]/75",
    darkTakeawayBg: "bg-[var(--bg-subtle)]/75",
    takeawayTitle: "text-blue-900",
    darkTakeawayTitle: "text-blue-300",
    groupDot: "bg-[#1B3A57]",
    groupBorder: "border-blue-200/80",
    groupBg: "bg-blue-50/70 text-blue-950",
    darkGroupBg: "bg-blue-950/50 text-blue-200 border-blue-800/70",
  },
  "lancet neurol": {
    headerBg: "bg-[#1B434B]",
    headerText: "text-cyan-100",
    badgeBg: "bg-white/15 text-white",
    badgeText: "text-white font-bold",
    borderCard: "border-[var(--border-hairline)] hover:border-teal-500/70",
    darkBorderCard: "border-[var(--border-hairline)] hover:border-teal-500/60",
    takeawayBorder: "border-l-[#1B434B]",
    takeawayBg: "bg-[var(--bg-subtle)]/75",
    darkTakeawayBg: "bg-[var(--bg-subtle)]/75",
    takeawayTitle: "text-teal-900",
    darkTakeawayTitle: "text-teal-300",
    groupDot: "bg-[#1B434B]",
    groupBorder: "border-teal-200/80",
    groupBg: "bg-teal-50/70 text-teal-950",
    darkGroupBg: "bg-teal-950/50 text-teal-200 border-teal-800/70",
  },
  nejm: {
    headerBg: "bg-[#7C2D12]",
    headerText: "text-orange-100",
    badgeBg: "bg-white/15 text-white",
    badgeText: "text-white font-bold",
    borderCard: "border-[var(--border-hairline)] hover:border-orange-400/70",
    darkBorderCard: "border-[var(--border-hairline)] hover:border-orange-500/60",
    takeawayBorder: "border-l-[#9A3412]",
    takeawayBg: "bg-[var(--bg-subtle)]/75",
    darkTakeawayBg: "bg-[var(--bg-subtle)]/75",
    takeawayTitle: "text-orange-950",
    darkTakeawayTitle: "text-orange-300",
    groupDot: "bg-[#9A3412]",
    groupBorder: "border-orange-200/80",
    groupBg: "bg-orange-50/70 text-orange-950",
    darkGroupBg: "bg-orange-950/50 text-orange-200 border-orange-800/70",
  },
  jama: {
    headerBg: "bg-[#881337]",
    headerText: "text-rose-100",
    badgeBg: "bg-white/15 text-white",
    badgeText: "text-white font-bold",
    borderCard: "border-[var(--border-hairline)] hover:border-rose-400/70",
    darkBorderCard: "border-[var(--border-hairline)] hover:border-rose-500/60",
    takeawayBorder: "border-l-[#9F1239]",
    takeawayBg: "bg-[var(--bg-subtle)]/75",
    darkTakeawayBg: "bg-[var(--bg-subtle)]/75",
    takeawayTitle: "text-rose-950",
    darkTakeawayTitle: "text-rose-300",
    groupDot: "bg-[#9F1239]",
    groupBorder: "border-rose-200/80",
    groupBg: "bg-rose-50/70 text-rose-950",
    darkGroupBg: "bg-rose-950/50 text-rose-200 border-rose-800/70",
  },
  "jama neurol": {
    headerBg: "bg-[#6D1B3B]",
    headerText: "text-rose-100",
    badgeBg: "bg-white/15 text-white",
    badgeText: "text-white font-bold",
    borderCard: "border-[var(--border-hairline)] hover:border-pink-400/70",
    darkBorderCard: "border-[var(--border-hairline)] hover:border-pink-500/60",
    takeawayBorder: "border-l-[#831843]",
    takeawayBg: "bg-[var(--bg-subtle)]/75",
    darkTakeawayBg: "bg-[var(--bg-subtle)]/75",
    takeawayTitle: "text-rose-950",
    darkTakeawayTitle: "text-rose-300",
    groupDot: "bg-[#831843]",
    groupBorder: "border-pink-200/80",
    groupBg: "bg-pink-50/70 text-rose-950",
    darkGroupBg: "bg-pink-950/50 text-rose-200 border-pink-800/70",
  },
  stroke: {
    headerBg: "bg-[#7F1D1D]",
    headerText: "text-red-100",
    badgeBg: "bg-white/15 text-white",
    badgeText: "text-white font-bold",
    borderCard: "border-[var(--border-hairline)] hover:border-red-500/70",
    darkBorderCard: "border-[var(--border-hairline)] hover:border-red-500/60",
    takeawayBorder: "border-l-[#991B1B]",
    takeawayBg: "bg-[var(--bg-subtle)]/75",
    darkTakeawayBg: "bg-[var(--bg-subtle)]/75",
    takeawayTitle: "text-red-950",
    darkTakeawayTitle: "text-red-300",
    groupDot: "bg-[#991B1B]",
    groupBorder: "border-red-200/80",
    groupBg: "bg-red-50/70 text-red-950",
    darkGroupBg: "bg-red-950/50 text-red-200 border-red-800/70",
  },
  neurology: {
    headerBg: "bg-[#14532D]",
    headerText: "text-emerald-100",
    badgeBg: "bg-white/15 text-white",
    badgeText: "text-white font-bold",
    borderCard: "border-[var(--border-hairline)] hover:border-emerald-500/70",
    darkBorderCard: "border-[var(--border-hairline)] hover:border-emerald-500/60",
    takeawayBorder: "border-l-[#166534]",
    takeawayBg: "bg-[var(--bg-subtle)]/75",
    darkTakeawayBg: "bg-[var(--bg-subtle)]/75",
    takeawayTitle: "text-emerald-950",
    darkTakeawayTitle: "text-emerald-300",
    groupDot: "bg-[#166534]",
    groupBorder: "border-emerald-200/80",
    groupBg: "bg-emerald-50/70 text-emerald-950",
    darkGroupBg: "bg-emerald-950/50 text-emerald-200 border-emerald-800/70",
  },
  "ann neurol": {
    headerBg: "bg-[#4C1D95]",
    headerText: "text-violet-100",
    badgeBg: "bg-white/15 text-white",
    badgeText: "text-white font-bold",
    borderCard: "border-[var(--border-hairline)] hover:border-violet-400/70",
    darkBorderCard: "border-[var(--border-hairline)] hover:border-violet-500/60",
    takeawayBorder: "border-l-[#5B21B6]",
    takeawayBg: "bg-[var(--bg-subtle)]/75",
    darkTakeawayBg: "bg-[var(--bg-subtle)]/75",
    takeawayTitle: "text-violet-950",
    darkTakeawayTitle: "text-violet-300",
    groupDot: "bg-[#5B21B6]",
    groupBorder: "border-violet-200/80",
    groupBg: "bg-violet-50/70 text-violet-950",
    darkGroupBg: "bg-violet-950/50 text-violet-200 border-violet-800/70",
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

import { isTakeawayValid, extractFallbackFromAbstract } from "../utils/textCleaner";
export { isTakeawayValid, extractFallbackFromAbstract };

function ArticleCardComponent({
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

  const rawTakeaway = article.ai_takeaways?.conclusion_vi || "";
  const cleanedTakeaway = cleanMedicalText(
    rawTakeaway.replace(
      /^(?:discussion|conclusions?\s+and\s+relevance|conclusions?|interpretation|findings|summary)\s*[:.\-]?\s*/i,
      ""
    )
  );

  let takeawayText = "";
  let isAiVerified = false;

  if (isTakeawayValid(cleanedTakeaway)) {
    takeawayText = cleanedTakeaway;
    isAiVerified = Boolean(article.ai_takeaways?.ai_verified);
  } else if (hasRealAbstract) {
    takeawayText = extractFallbackFromAbstract(cleanAbs);
    isAiVerified = false;
  }

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
        <p className="leading-relaxed line-clamp-3 text-[var(--text-secondary)]">
          {highlightClinicalStats(text, darkMode)}
        </p>
      );
    }

    const sections = parseAbstractSections(text);

    if (sections.length <= 1 && !sections[0]?.header) {
      return (
        <p className="leading-relaxed text-[var(--text-secondary)]">
          {highlightClinicalStats(text, darkMode)}
        </p>
      );
    }

    return (
      <div className="space-y-2.5">
        {sections.map((sec, idx) =>
          sec.header ? (
            <div key={idx} className="leading-relaxed text-[var(--text-secondary)]">
              <span className="font-bold uppercase text-[10.5px] tracking-wide px-1.5 py-0.5 rounded mr-1.5 inline-block bg-[var(--bg-surface)] text-[var(--text-ink)] border border-[var(--border-hairline)]">
                {sec.header}:
              </span>
              <span>{highlightClinicalStats(sec.body, darkMode)}</span>
            </div>
          ) : (
            <p key={idx} className="leading-relaxed text-[var(--text-secondary)]">
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
        className={`rounded-2xl border bg-[var(--bg-surface)] transition-all duration-150 px-4 py-3 flex flex-col gap-1.5 shadow-2xs hover:border-stone-400 dark:hover:border-stone-600 ${
          darkMode ? theme.darkBorderCard : theme.borderCard
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
              style={{
                backgroundColor: article.journal.badge_bg,
                color: article.journal.badge_text,
              }}
            >
              {article.journal.short_name || article.journal.name}
            </span>
            {isNew && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-600 text-white">
                NEW
              </span>
            )}
            <span
              onClick={() => onStudyTypeClick?.(article.article_type)}
              className="cursor-pointer text-[10.5px] font-semibold px-2 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-hairline)]"
            >
              {article.article_type}
            </span>
            {subspecialtyList.map((sub, i) => (
              <span
                key={i}
                onClick={() => onSubspecialtyClick?.(sub)}
                className="cursor-pointer text-[10.5px] font-medium px-2 py-0.5 rounded bg-[var(--bg-paper)] text-[var(--text-muted)] hover:text-[var(--text-ink)] border border-[var(--border-hairline)]"
              >
                {sub}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setExpandedInCompact(true)}
              className="text-[11px] font-bold px-2 py-0.5 rounded text-[#B91C1C] dark:text-rose-400 hover:bg-[var(--bg-subtle)]"
            >
              Details ▼
            </button>
            {onToggleBookmark && (
              <button
                type="button"
                onClick={() => onToggleBookmark(article.id)}
                aria-label={isBookmarked ? "Remove from bookmarks" : "Save article to bookmarks"}
                className={`text-sm ${isBookmarked ? "text-amber-400" : "text-[var(--text-muted)]"}`}
              >
                {isBookmarked ? "★" : "☆"}
              </button>
            )}
          </div>
        </div>

        <h3 className="font-journal text-[15px] sm:text-[17px] font-semibold leading-snug text-[var(--text-ink)] hover:text-[#B91C1C] dark:hover:text-rose-400 transition-colors">
          {sanitizeUrl(article.doi_url) ? (
            <a href={sanitizeUrl(article.doi_url)} target="_blank" rel="noopener noreferrer">
              {cleanTitle}
            </a>
          ) : (
            <span>{cleanTitle}</span>
          )}
        </h3>

        {takeawayText && (
          <p
            className={`text-xs pl-2.5 border-l-2 ${theme.takeawayBorder} text-[var(--text-secondary)]`}
          >
            {highlightClinicalStats(takeawayText, darkMode)}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border bg-[var(--bg-surface)] overflow-hidden shadow-2xs hover:shadow-md hover:border-stone-400 dark:hover:border-stone-600 transition-all duration-200 ${
        darkMode ? theme.darkBorderCard : theme.borderCard
      }`}
    >
      {/* KHỐI HEADER ĐẦU BÀI BÁO */}
      <div
        className={`${theme.headerBg} px-4 py-2 text-white flex flex-wrap items-center justify-between gap-2`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded text-[10.5px] font-bold uppercase tracking-wider ${theme.badgeBg}`}
          >
            {article.journal.short_name || article.journal.name}
          </span>

          {isNew && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/25 text-emerald-100 ring-1 ring-emerald-300/40">
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
              className={`cursor-pointer text-[10.5px] font-semibold px-2 py-0.5 rounded transition-colors ${
                idx === 0
                  ? "bg-white/15 text-white hover:bg-white/25"
                  : `bg-black/15 ${theme.headerText} hover:bg-black/25`
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
              className="text-[10.5px] font-bold px-2 py-0.5 rounded bg-black/25 text-white hover:bg-black/40"
            >
              Collapse ▲
            </button>
          )}
          {formattedDate && (
            <span className={`text-[11px] font-medium ${theme.headerText} tracking-wide`}>
              {formattedDate}
            </span>
          )}
          {onToggleBookmark && (
            <button
              type="button"
              onClick={() => onToggleBookmark(article.id)}
              title={isBookmarked ? "Remove from saved" : "Save article for later"}
              aria-label={isBookmarked ? "Remove from saved" : "Save article for later"}
              className={`text-sm hover:scale-110 transition-transform focus:outline-none ${
                isBookmarked ? "text-amber-300" : "text-white/75 hover:text-white"
              }`}
            >
              {isBookmarked ? "★" : "☆"}
            </button>
          )}
        </div>
      </div>

      {/* THÂN THẺ BÀI BÁO */}
      <div className="p-4 sm:p-5">
        <h3 className="font-journal text-[17px] sm:text-[19px] font-semibold leading-snug mb-1.5 text-[var(--text-ink)] hover:text-[#B91C1C] dark:hover:text-rose-400 transition-colors">
          {sanitizeUrl(article.doi_url) ? (
            <a href={sanitizeUrl(article.doi_url)} target="_blank" rel="noopener noreferrer">
              {cleanTitle}
            </a>
          ) : (
            <span>{cleanTitle}</span>
          )}
        </h3>

        {article.authors && article.authors.length > 0 && (
          <p className="text-xs text-[var(--text-muted)] mb-2.5 line-clamp-1 font-medium">
            {article.authors.join(", ")}
          </p>
        )}

        {/* Đa nhãn Phân khoa (Multi-Subspecialty Tags) & Chủ đề */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3.5">
          {subspecialtyList.map((sub, idx) => (
            <span
              key={sub}
              onClick={() => onSubspecialtyClick?.(sub)}
              className={`cursor-pointer text-[10.5px] font-semibold px-2 py-0.5 rounded transition-colors ${
                idx === 0
                  ? "bg-[#1C1917] text-[#FAF8F5] hover:bg-[#2C2825] dark:bg-stone-200 dark:text-stone-900 dark:hover:bg-white"
                  : "bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-hairline)] hover:border-stone-400"
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
              className="cursor-pointer text-[10.5px] px-2 py-0.5 rounded border border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:border-stone-400 transition-colors"
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
            } border border-[var(--border-hairline)] border-l-4 ${theme.takeawayBorder} rounded-xl p-3.5 mb-3`}
          >
            <div className="flex items-center justify-between mb-1">
              <span
                className={`text-[10.5px] font-bold uppercase tracking-wider ${
                  darkMode ? theme.darkTakeawayTitle : theme.takeawayTitle
                }`}
              >
                KEY FINDINGS / CLINICAL TAKEAWAY
              </span>
              {isAiVerified && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    darkMode
                      ? "bg-indigo-950/80 text-indigo-300 border-indigo-800"
                      : "bg-[var(--bg-surface)] text-indigo-700 border-indigo-200"
                  }`}
                >
                  ✨ Gemini AI
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm leading-relaxed font-medium text-[var(--text-ink)]">
              {highlightClinicalStats(takeawayText, darkMode)}
            </p>
          </div>
        )}

        {/* GHI CHÚ LÂM SÀNG CÁ NHÂN (PERSONAL CLINICAL NOTE) */}
        {(isBookmarked || clinicalNote) && onSaveNote && (
          <div
            className={`mb-3 p-3 rounded-xl border text-xs ${
              darkMode
                ? "bg-amber-950/25 border-amber-800/60 text-amber-200"
                : "bg-[#FFFDF7] border-amber-200/90 text-[var(--text-ink)]"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-[10.5px] uppercase tracking-wider text-amber-700 dark:text-amber-400">
                📝 Personal Clinical Note
              </span>
              {!isEditingNote && (
                <button
                  onClick={() => setIsEditingNote(true)}
                  className="text-[11px] font-semibold text-[#B91C1C] dark:text-rose-400 hover:underline"
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
                  className="w-full p-2 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-xs text-[var(--text-ink)] focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setNoteInput(clinicalNote);
                      setIsEditingNote(false);
                    }}
                    className="px-2.5 py-1 rounded text-[11px] font-semibold text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      onSaveNote(article.id, noteInput);
                      setIsEditingNote(false);
                    }}
                    className="px-3 py-1 rounded text-[11px] font-bold bg-amber-600 text-white hover:bg-amber-700"
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
                className="cursor-pointer text-[var(--text-muted)] italic"
              >
                Click &quot;+ Add Note&quot; to attach a personal clinical memo for this saved study...
              </p>
            )}
          </div>
        )}

        {/* Structured Abstract */}
        {hasRealAbstract ? (
          <div className="mt-3 text-xs p-3.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)]/75">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-[var(--text-muted)] uppercase tracking-wider text-[10.5px]">
                Structured Abstract
              </span>
              <button
                onClick={() => setShowFullAbstract(!showFullAbstract)}
                className="text-[11px] font-semibold text-[#B91C1C] dark:text-rose-400 hover:underline transition-colors"
              >
                {showFullAbstract ? "Collapse ▲" : "Expand Full Abstract ▼"}
              </button>
            </div>

            {formatStructuredAbstract(cleanAbs)}
          </div>
        ) : (
          <div className="mt-2 py-2.5 px-3.5 rounded-xl border border-dashed border-[var(--border-hairline)] bg-[var(--bg-subtle)]/50 text-[var(--text-muted)] text-[11px] flex items-center justify-between gap-2">
            {article.article_type === "Editorial / Perspective" ? (
              <span>
                💬{" "}
                <strong className="text-[var(--text-secondary)]">
                  Expert Commentary / Editorial
                </strong>{" "}
                — Invited clinical perspective &amp; appraisal on{" "}
                <strong className="text-[var(--text-secondary)]">
                  {article.journal.short_name || article.journal.name}
                </strong>{" "}
                (no structured abstract issued by publisher).
              </span>
            ) : article.article_type === "Case Report" ? (
              <span>
                🖼️{" "}
                <strong className="text-[var(--text-secondary)]">
                  Clinical Case / NeuroImage
                </strong>{" "}
                — Diagnostic neuroimaging &amp; bedside case discussion available on{" "}
                <strong className="text-[var(--text-secondary)]">
                  {article.journal.short_name || article.journal.name}
                </strong>
                .
              </span>
            ) : (
              <span>
                📄 Full manuscript &amp; study details available on{" "}
                <strong className="text-[var(--text-secondary)]">
                  {article.journal.short_name || article.journal.name}
                </strong>
                .
              </span>
            )}
          </div>
        )}

        {/* Bottom Action */}
        <div className="mt-3.5 pt-3 border-t border-[var(--border-hairline)] flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono-tech text-[10.5px] text-[var(--text-muted)] truncate max-w-[45%]">
            DOI: {article.id}
          </span>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCopyForJournalClub}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all flex items-center gap-1 ${
                copied
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                  : "border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
              }`}
              title="Copy formatted summary & citation for Zalo, Telegram, or Journal Club slides"
            >
              <span>{copied ? "✓ Copied!" : "📋 Copy for Journal Club"}</span>
            </button>

            <a
              href={pubmedSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-lg text-[11px] font-medium border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors"
              title="Search this article on PubMed"
            >
              PubMed ↗
            </a>

            {sanitizeUrl(article.doi_url) && (
              <a
                href={sanitizeUrl(article.doi_url)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-bold text-[#B91C1C] dark:text-rose-400 hover:underline flex items-center gap-1 group ml-1"
              >
                View Article
                <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const ArticleCard = React.memo(ArticleCardComponent);
