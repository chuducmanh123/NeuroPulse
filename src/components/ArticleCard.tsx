"use client";

import React, { useState } from "react";
import { Article } from "../types/article";

interface ArticleCardProps {
  article: Article;
  onTagClick?: (tag: string) => void;
  onSubspecialtyClick?: (sub: string) => void;
  isBookmarked?: boolean;
  onToggleBookmark?: (id: string) => void;
}

export interface JournalTheme {
  headerBg: string;
  headerText: string;
  badgeBg: string;
  badgeText: string;
  borderCard: string;
  takeawayBorder: string;
  takeawayBg: string;
  takeawayTitle: string;
  groupDot: string;
  groupBorder: string;
  groupBg: string;
}

export const JOURNAL_THEMES: Record<string, JournalTheme> = {
  "the lancet": {
    headerBg: "bg-gradient-to-r from-blue-700 to-blue-800",
    headerText: "text-blue-100",
    badgeBg: "bg-white text-blue-900",
    badgeText: "text-blue-950 font-black",
    borderCard: "border-blue-200 hover:border-blue-400",
    takeawayBorder: "border-l-blue-600",
    takeawayBg: "bg-blue-50/70",
    takeawayTitle: "text-blue-900",
    groupDot: "bg-blue-600",
    groupBorder: "border-blue-200",
    groupBg: "bg-blue-50/80 text-blue-900",
  },
  "lancet neurol": {
    headerBg: "bg-gradient-to-r from-cyan-800 to-teal-800",
    headerText: "text-cyan-100",
    badgeBg: "bg-white text-teal-900",
    badgeText: "text-teal-950 font-black",
    borderCard: "border-cyan-200 hover:border-cyan-400",
    takeawayBorder: "border-l-cyan-600",
    takeawayBg: "bg-cyan-50/70",
    takeawayTitle: "text-cyan-900",
    groupDot: "bg-cyan-700",
    groupBorder: "border-cyan-200",
    groupBg: "bg-cyan-50/80 text-cyan-900",
  },
  "nejm": {
    headerBg: "bg-gradient-to-r from-orange-600 to-amber-700",
    headerText: "text-orange-100",
    badgeBg: "bg-white text-orange-950",
    badgeText: "text-orange-950 font-black",
    borderCard: "border-orange-200 hover:border-orange-400",
    takeawayBorder: "border-l-orange-600",
    takeawayBg: "bg-orange-50/70",
    takeawayTitle: "text-orange-950",
    groupDot: "bg-orange-600",
    groupBorder: "border-orange-200",
    groupBg: "bg-orange-50/80 text-orange-900",
  },
  "jama": {
    headerBg: "bg-gradient-to-r from-red-600 to-red-700",
    headerText: "text-red-100",
    badgeBg: "bg-white text-red-950",
    badgeText: "text-red-950 font-black",
    borderCard: "border-red-200 hover:border-red-400",
    takeawayBorder: "border-l-red-600",
    takeawayBg: "bg-red-50/70",
    takeawayTitle: "text-red-950",
    groupDot: "bg-red-600",
    groupBorder: "border-red-200",
    groupBg: "bg-red-50/80 text-red-900",
  },
  "jama neurol": {
    headerBg: "bg-gradient-to-r from-rose-600 to-pink-700",
    headerText: "text-rose-100",
    badgeBg: "bg-white text-rose-950",
    badgeText: "text-rose-950 font-black",
    borderCard: "border-rose-200 hover:border-rose-400",
    takeawayBorder: "border-l-rose-600",
    takeawayBg: "bg-rose-50/70",
    takeawayTitle: "text-rose-950",
    groupDot: "bg-rose-600",
    groupBorder: "border-rose-200",
    groupBg: "bg-rose-50/80 text-rose-900",
  },
  "stroke": {
    headerBg: "bg-gradient-to-r from-red-800 to-red-950",
    headerText: "text-red-100",
    badgeBg: "bg-white text-red-950",
    badgeText: "text-red-950 font-black",
    borderCard: "border-red-300 hover:border-red-500",
    takeawayBorder: "border-l-red-800",
    takeawayBg: "bg-red-50/70",
    takeawayTitle: "text-red-950",
    groupDot: "bg-red-800",
    groupBorder: "border-red-300",
    groupBg: "bg-red-50/80 text-red-950",
  },
  "neurology": {
    headerBg: "bg-gradient-to-r from-emerald-700 to-green-800",
    headerText: "text-emerald-100",
    badgeBg: "bg-white text-emerald-950",
    badgeText: "text-emerald-950 font-black",
    borderCard: "border-emerald-200 hover:border-emerald-400",
    takeawayBorder: "border-l-emerald-600",
    takeawayBg: "bg-emerald-50/70",
    takeawayTitle: "text-emerald-950",
    groupDot: "bg-emerald-700",
    groupBorder: "border-emerald-200",
    groupBg: "bg-emerald-50/80 text-emerald-900",
  },
  "ann neurol": {
    headerBg: "bg-gradient-to-r from-violet-700 to-purple-800",
    headerText: "text-violet-100",
    badgeBg: "bg-white text-violet-950",
    badgeText: "text-violet-950 font-black",
    borderCard: "border-violet-200 hover:border-violet-400",
    takeawayBorder: "border-l-violet-600",
    takeawayBg: "bg-violet-50/70",
    takeawayTitle: "text-violet-950",
    groupDot: "bg-violet-700",
    groupBorder: "border-violet-200",
    groupBg: "bg-violet-50/80 text-violet-950",
  },
};

export function getJournalTheme(shortName?: string): JournalTheme {
  const key = (shortName || "").toLowerCase();
  return JOURNAL_THEMES[key] || JOURNAL_THEMES["nejm"];
}

const STRUCTURED_SECTION_REGEX =
  /(?:^|(?<=[.!?]\s+))(Background and [Oo]bjectives|Background and [Pp]urpose|Design,\s*[Ss]etting,\s*and\s*[Pp]articipants|Main [Oo]utcomes and [Mm]easures|Conclusions? and [Rr]elevance|Classification of [Ee]vidence|Trial [Rr]egistration|Interventions?|Exposures?|Observations|Importance|Objectives?|Background|Methods|Results|Findings|Discussion|Conclusions?|Interpretation|BACKGROUND AND OBJECTIVES|BACKGROUND AND PURPOSE|DESIGN, SETTING, AND PARTICIPANTS|MAIN OUTCOMES AND MEASURES|CONCLUSIONS? AND RELEVANCE|CLASSIFICATION OF EVIDENCE|TRIAL REGISTRATION|INTERVENTIONS?|EXPOSURES?|OBSERVATIONS|IMPORTANCE|OBJECTIVES?|BACKGROUND|METHODS|RESULTS|FINDINGS|DISCUSSION|CONCLUSIONS?|INTERPRETATION)(?:\s*:\s*|\s+(?=[A-Z0-9]))/g;

function parseAbstractSections(text: string): { header?: string; body: string }[] {
  const matches = Array.from(text.matchAll(STRUCTURED_SECTION_REGEX));
  if (matches.length === 0) {
    return [{ body: text }];
  }

  const sections: { header?: string; body: string }[] = [];
  const firstIdx = matches[0].index ?? 0;
  if (firstIdx > 0) {
    const intro = text.slice(0, firstIdx).trim();
    if (intro) {
      sections.push({ body: intro });
    }
  }

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const header = current[1].trim();
    const bodyStart = (current.index ?? 0) + current[0].length;
    const bodyEnd = i + 1 < matches.length ? (matches[i + 1].index ?? text.length) : text.length;
    const body = text.slice(bodyStart, bodyEnd).trim();
    if (body) {
      sections.push({ header, body });
    }
  }

  return sections.length > 0 ? sections : [{ body: text }];
}

export function ArticleCard({
  article,
  onTagClick,
  onSubspecialtyClick,
  isBookmarked = false,
  onToggleBookmark,
}: ArticleCardProps) {
  const [showFullAbstract, setShowFullAbstract] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const hasRealAbstract =
    Boolean(article.abstract) &&
    !article.abstract.startsWith("Original abstract and full manuscript available");

  const takeawayText =
    article.ai_takeaways?.conclusion_vi &&
    !article.ai_takeaways.conclusion_vi.startsWith("Published clinical evidence in")
      ? article.ai_takeaways.conclusion_vi.replace(
          /^(?:discussion|conclusions?\s+and\s+relevance|conclusions?|interpretation|findings|summary)\s*[:.\-]?\s*/i,
          ""
        )
      : "";

  const handleCopyForJournalClub = () => {
    const jName = article.journal.short_name || article.journal.name;
    const tags = article.neurology_classification.topics.map((t) => `#${t}`).join(" ");
    const lines = [
      `📌 [${jName} • ${formattedDate} | ${article.article_type}]`,
      `📄 ${article.title}`,
      `🏷️ Subspecialty: ${article.neurology_classification.subspecialty} (${tags})`,
    ];
    if (takeawayText) {
      lines.push(`💡 Key Takeaway: ${takeawayText}`);
    }
    lines.push(`🔗 DOI: ${article.doi_url}`);

    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  };

  const formatStructuredAbstract = (text: string) => {
    if (!text) return null;

    if (!showFullAbstract) {
      return <p className="leading-relaxed text-slate-700 line-clamp-3">{text}</p>;
    }

    const sections = parseAbstractSections(text);

    if (sections.length <= 1 && !sections[0]?.header) {
      return <p className="leading-relaxed text-slate-700">{text}</p>;
    }

    return (
      <div className="space-y-2.5">
        {sections.map((sec, idx) =>
          sec.header ? (
            <div key={idx} className="leading-relaxed text-slate-700">
              <span className="font-bold text-slate-900 uppercase text-[11px] tracking-wide bg-slate-200/70 px-1.5 py-0.5 rounded mr-1.5 inline-block">
                {sec.header}:
              </span>
              <span>{sec.body}</span>
            </div>
          ) : (
            <p key={idx} className="leading-relaxed text-slate-700">
              {sec.body}
            </p>
          )
        )}
      </div>
    );
  };

  return (
    <div
      className={`bg-white rounded-xl border ${theme.borderCard} overflow-hidden shadow-sm hover:shadow-md transition-all duration-200`}
    >
      {/* KHỐI HEADER ĐẦU BÀI BÁO */}
      <div
        className={`${theme.headerBg} px-5 py-2.5 text-white flex flex-wrap items-center justify-between gap-2 shadow-inner`}
      >
        <div className="flex items-center gap-2.5">
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

          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded bg-black/20 ${theme.headerText}`}
          >
            {article.article_type}
          </span>
        </div>

        <div className="flex items-center gap-3">
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
        <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug mb-2 hover:text-blue-600 transition-colors">
          <a href={article.doi_url} target="_blank" rel="noopener noreferrer">
            {article.title}
          </a>
        </h3>

        {article.authors && article.authors.length > 0 && (
          <p className="text-xs text-slate-500 mb-3 line-clamp-1 font-medium">
            {article.authors.join(", ")}
          </p>
        )}

        {/* Phân loại & Chuyên đề */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3.5">
          <span
            onClick={() => onSubspecialtyClick?.(article.neurology_classification.subspecialty)}
            className="cursor-pointer text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            {article.neurology_classification.subspecialty}
          </span>
          {article.neurology_classification.topics.map((topic, i) => (
            <span
              key={i}
              onClick={() => onTagClick?.(topic)}
              className="cursor-pointer text-[11px] px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors"
            >
              #{topic}
            </span>
          ))}
        </div>

        {/* Key Findings / Clinical Takeaway Box */}
        {takeawayText && (
          <div
            className={`${theme.takeawayBg} border-l-4 ${theme.takeawayBorder} rounded-r-lg p-3.5 mb-3`}
          >
            <div className="flex items-center justify-between mb-1">
              <span
                className={`text-[11px] font-bold ${theme.takeawayTitle} uppercase tracking-wider`}
              >
                KEY FINDINGS / CLINICAL TAKEAWAY
              </span>
              {article.ai_takeaways?.ai_verified && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/80 text-indigo-700 border border-indigo-200">
                  ✨ Gemini AI
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
              {takeawayText}
            </p>
          </div>
        )}

        {/* Structured Abstract (chỉ hiển thị khi có Abstract thật) */}
        {hasRealAbstract ? (
          <div className="mt-3 text-xs bg-slate-50/80 p-3.5 rounded-lg border border-slate-200/80">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">
                Structured Abstract
              </span>
              <button
                onClick={() => setShowFullAbstract(!showFullAbstract)}
                className="text-blue-600 hover:text-blue-800 text-[11px] font-semibold transition-colors"
              >
                {showFullAbstract ? "Collapse ▲" : "Expand Full Abstract ▼"}
              </button>
            </div>

            {formatStructuredAbstract(article.abstract)}
          </div>
        ) : (
          <div className="mt-2 py-2 px-3 rounded-lg bg-slate-50 border border-dashed border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
            <span>
              Publisher preview only — full manuscript &amp; abstract available on{" "}
              <strong className="text-slate-700">
                {article.journal.short_name || article.journal.name}
              </strong>
              .
            </span>
          </div>
        )}

        {/* Bottom Action: DOI + 1-Click Copy for Journal Club + View Full Article */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] text-slate-400 font-mono truncate max-w-[45%]">
            DOI: {article.id}
          </span>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyForJournalClub}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-all flex items-center gap-1 ${
                copied
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
              title="Copy formatted summary & citation for Zalo, Telegram, or Journal Club slides"
            >
              <span>{copied ? "✓ Copied!" : "📋 Copy for Journal Club"}</span>
            </button>

            <a
              href={article.doi_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 group"
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
