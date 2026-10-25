"use client";

import { useEffect, useState, useMemo } from "react";
import { Article } from "../types/article";
import { ArticleCard, getJournalTheme } from "../components/ArticleCard";

const JOURNAL_ORDER = [
  "NEJM",
  "The Lancet",
  "Lancet Neurol",
  "JAMA",
  "JAMA Neurol",
  "Stroke",
  "Neurology",
  "Ann Neurol",
];

const JOURNAL_PILL_STYLES: Record<string, { active: string; inactive: string }> = {
  All: {
    active: "bg-slate-900 text-white shadow-sm",
    inactive: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
  },
  "The Lancet": {
    active: "bg-blue-600 text-white shadow-sm ring-2 ring-blue-300",
    inactive: "bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100",
  },
  "Lancet Neurol": {
    active: "bg-cyan-700 text-white shadow-sm ring-2 ring-cyan-300",
    inactive: "bg-cyan-50 text-cyan-800 border border-cyan-200 hover:bg-cyan-100",
  },
  NEJM: {
    active: "bg-orange-600 text-white shadow-sm ring-2 ring-orange-300",
    inactive: "bg-orange-50 text-orange-900 border border-orange-200 hover:bg-orange-100",
  },
  JAMA: {
    active: "bg-red-600 text-white shadow-sm ring-2 ring-red-300",
    inactive: "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100",
  },
  "JAMA Neurol": {
    active: "bg-rose-600 text-white shadow-sm ring-2 ring-rose-300",
    inactive: "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100",
  },
  Stroke: {
    active: "bg-red-800 text-white shadow-sm ring-2 ring-red-300",
    inactive: "bg-red-50 text-red-900 border border-red-200 hover:bg-red-100",
  },
  Neurology: {
    active: "bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-300",
    inactive: "bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100",
  },
  "Ann Neurol": {
    active: "bg-violet-700 text-white shadow-sm ring-2 ring-violet-300",
    inactive: "bg-violet-50 text-violet-900 border border-violet-200 hover:bg-violet-100",
  },
};

const TOPIC_TABS = [
  { label: "All Topics", value: "All" },
  { label: "Vascular & Stroke", value: "Vascular" },
  { label: "Cognitive & Dementia", value: "Cognitive" },
  { label: "Neuroimmunology & Neuromuscular", value: "Neuroimmunology" },
  { label: "Movement Disorders", value: "Movement" },
  { label: "Epilepsy", value: "Epilepsy" },
  { label: "Neurocritical Care & TBI", value: "Neurocritical" },
  { label: "Headache & Pain", value: "Headache" },
  { label: "Neuro-Oncology", value: "Neuro-Oncology" },
  { label: "General Neurology", value: "General Neurology" },
];

interface JournalGroup {
  shortName: string;
  fullName: string;
  articles: Article[];
}

interface DateGroup {
  dateKey: string;
  formattedDate: string;
  relativeLabel: string;
  totalArticles: number;
  journalGroups: JournalGroup[];
}

function getDateKey(isoDate?: string): string {
  if (!isoDate) return "Unknown Date";
  return isoDate.slice(0, 10);
}

function formatDateHeading(dateKey: string): { formattedDate: string; relativeLabel: string } {
  if (dateKey === "Unknown Date") {
    return { formattedDate: "Unknown Publication Date", relativeLabel: "" };
  }
  const [y, m, d] = dateKey.split("-").map(Number);
  const dateObj = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  const formattedDate = dateObj.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const diffDays = Math.round((todayUtc - dateObj.getTime()) / (1000 * 60 * 60 * 24));

  let relativeLabel = "";
  if (diffDays <= 0) relativeLabel = "Latest / Today";
  else if (diffDays === 1) relativeLabel = "Yesterday";
  else if (diffDays <= 7) relativeLabel = `${diffDays} days ago`;
  else if (diffDays <= 30) relativeLabel = `${Math.floor(diffDays / 7)} weeks ago`;

  return { formattedDate, relativeLabel };
}

export default function HomePage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [savedArticlesMap, setSavedArticlesMap] = useState<Record<string, Article>>({});
  const [selectedSub, setSelectedSub] = useState<string>("All");
  const [selectedJournal, setSelectedJournal] = useState<string>("All");
  const [selectedType, setSelectedType] = useState<string>("All");
  const [showSavedOnly, setShowSavedOnly] = useState<boolean>(false);
  const [showBriefing, setShowBriefing] = useState<boolean>(true);
  const [briefingCopied, setBriefingCopied] = useState<boolean>(false);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [visibleCount, setVisibleCount] = useState<number>(35);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  useEffect(() => {
    const savedIds = localStorage.getItem("neuro_bookmarks");
    if (savedIds) {
      try {
        setBookmarks(JSON.parse(savedIds));
      } catch (e) {
        console.error(e);
      }
    }

    const savedObjs = localStorage.getItem("neuro_saved_articles_v2");
    if (savedObjs) {
      try {
        setSavedArticlesMap(JSON.parse(savedObjs));
      } catch (e) {
        console.error(e);
      }
    }

    fetch("/data/articles.json")
      .then((res) => {
        const lastMod = res.headers.get("last-modified");
        if (lastMod) {
          setLastUpdated(
            new Date(lastMod).toLocaleString("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
            })
          );
        } else {
          setLastUpdated(
            new Date().toLocaleString("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
            })
          );
        }
        return res.json();
      })
      .then((data: Article[]) => {
        setArticles(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading articles:", err);
        setLoading(false);
      });
  }, []);

  const toggleBookmark = (id: string) => {
    setBookmarks((prev) => {
      const isRemoving = prev.includes(id);
      const next = isRemoving ? prev.filter((item) => item !== id) : [...prev, id];
      localStorage.setItem("neuro_bookmarks", JSON.stringify(next));

      setSavedArticlesMap((prevMap) => {
        const nextMap = { ...prevMap };
        if (isRemoving) {
          delete nextMap[id];
        } else {
          const found = articles.find((a) => a.id === id);
          if (found) {
            nextMap[id] = found;
          }
        }
        localStorage.setItem("neuro_saved_articles_v2", JSON.stringify(nextMap));
        return nextMap;
      });

      return next;
    });
  };

  const availableJournals = ["All", ...JOURNAL_ORDER];

  const journalCounts = useMemo(() => {
    const counts: Record<string, number> = { All: articles.length };
    for (const j of JOURNAL_ORDER) counts[j] = 0;
    for (const a of articles) {
      const sn = a.journal.short_name;
      counts[sn] = (counts[sn] || 0) + 1;
    }
    return counts;
  }, [articles]);

  // Ý tưởng 3: Chọn ra Top 4 nghiên cứu tiêu điểm cho "Điểm báo Giao ban Buổi sáng"
  const briefingHighlights = useMemo(() => {
    const candidates = articles.filter(
      (a) =>
        a.ai_takeaways?.conclusion_vi &&
        !a.ai_takeaways.conclusion_vi.startsWith("Published clinical evidence in") &&
        !a.abstract.startsWith("Original abstract")
    );

    const scored = candidates.map((a) => {
      let score = 0;
      if (a.article_type === "Clinical Trial") score += 40;
      else if (a.article_type === "Guideline") score += 35;
      else if (a.article_type.includes("Meta-Analysis")) score += 25;

      const jIdx = JOURNAL_ORDER.indexOf(a.journal.short_name);
      if (jIdx !== -1) score += (8 - jIdx) * 4;

      if (a.pub_date) {
        const daysOld = (Date.now() - new Date(a.pub_date).getTime()) / (1000 * 60 * 60 * 24);
        if (daysOld <= 7) score += 25;
        else if (daysOld <= 14) score += 15;
      }

      return { article: a, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 4).map((s) => s.article);
  }, [articles]);

  const handleCopyFullBriefing = () => {
    if (briefingHighlights.length === 0) return;
    const header = `🌅 MORNING NEUROLOGY & STROKE BRIEFING (${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})\n`;
    const body = briefingHighlights
      .map((a, idx) => {
        const takeaway = (a.ai_takeaways?.conclusion_vi || "").replace(
          /^(?:discussion|conclusions?\s+and\s+relevance|conclusions?|interpretation|findings|summary)\s*[:.\-]?\s*/i,
          ""
        );
        return `${idx + 1}. [${a.journal.short_name} | ${a.article_type}] ${a.title}\n   💡 ${takeaway}\n   🔗 ${a.doi_url}`;
      })
      .join("\n\n");

    navigator.clipboard.writeText(`${header}\n${body}`).then(() => {
      setBriefingCopied(true);
      setTimeout(() => setBriefingCopied(false), 2200);
    });
  };

  const filteredArticles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    // Khi chọn xem Saved, gộp cả các bài đã lưu trong bộ nhớ máy (kể cả khi bài đã cũ và không còn trong articles.json)
    const sourceList: Article[] = showSavedOnly
      ? bookmarks
          .map((id) => articles.find((a) => a.id === id) || savedArticlesMap[id])
          .filter((a): a is Article => Boolean(a))
      : articles;

    const filtered = sourceList.filter((article) => {
      if (showSavedOnly && !bookmarks.includes(article.id)) return false;

      const matchCategory =
        selectedSub === "All" ||
        article.neurology_classification.subspecialty
          .toLowerCase()
          .includes(selectedSub.toLowerCase());

      const matchJournal =
        selectedJournal === "All" ||
        article.journal.short_name.toLowerCase() === selectedJournal.toLowerCase();

      const matchType =
        selectedType === "All" ||
        article.article_type.toLowerCase().includes(selectedType.toLowerCase());

      const matchQuery =
        q === "" ||
        article.title.toLowerCase().includes(q) ||
        article.abstract.toLowerCase().includes(q) ||
        article.neurology_classification.subspecialty.toLowerCase().includes(q) ||
        article.neurology_classification.topics.some((t) => t.toLowerCase().includes(q)) ||
        article.authors.some((author) => author.toLowerCase().includes(q));

      return matchCategory && matchJournal && matchType && matchQuery;
    });

    // Sắp xếp theo Ngày (mới nhất trước), trong từng ngày sắp xếp theo thứ tự Tạp chí
    return filtered.sort((a, b) => {
      const da = getDateKey(a.pub_date);
      const db = getDateKey(b.pub_date);
      if (da !== db) return db.localeCompare(da);

      const ja = JOURNAL_ORDER.indexOf(a.journal.short_name);
      const jb = JOURNAL_ORDER.indexOf(b.journal.short_name);
      const orderA = ja === -1 ? 99 : ja;
      const orderB = jb === -1 ? 99 : jb;
      if (orderA !== orderB) return orderA - orderB;

      return a.title.localeCompare(b.title);
    });
  }, [
    articles,
    savedArticlesMap,
    selectedSub,
    selectedJournal,
    selectedType,
    showSavedOnly,
    bookmarks,
    searchQuery,
  ]);

  const displayedArticles = useMemo(
    () => filteredArticles.slice(0, visibleCount),
    [filteredArticles, visibleCount]
  );

  // Gom nhóm theo Ngày -> trong từng Ngày gom nhóm theo Tạp chí
  const groupedByDate: DateGroup[] = useMemo(() => {
    const dateMap = new Map<string, Map<string, JournalGroup>>();

    for (const article of displayedArticles) {
      const dateKey = getDateKey(article.pub_date);
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, new Map<string, JournalGroup>());
      }
      const journalMap = dateMap.get(dateKey)!;
      const shortName = article.journal.short_name || article.journal.name;
      if (!journalMap.has(shortName)) {
        journalMap.set(shortName, {
          shortName,
          fullName: article.journal.name || shortName,
          articles: [],
        });
      }
      journalMap.get(shortName)!.articles.push(article);
    }

    const result: DateGroup[] = [];
    for (const [dateKey, journalMap] of dateMap.entries()) {
      const journalGroups = Array.from(journalMap.values()).sort((a, b) => {
        const ia = JOURNAL_ORDER.indexOf(a.shortName);
        const ib = JOURNAL_ORDER.indexOf(b.shortName);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      });

      const totalArticles = journalGroups.reduce((acc, g) => acc + g.articles.length, 0);
      const { formattedDate, relativeLabel } = formatDateHeading(dateKey);

      result.push({
        dateKey,
        formattedDate,
        relativeLabel,
        totalArticles,
        journalGroups,
      });
    }

    return result;
  }, [displayedArticles]);

  const hasActiveFilters =
    selectedSub !== "All" ||
    selectedJournal !== "All" ||
    selectedType !== "All" ||
    showSavedOnly ||
    searchQuery.trim() !== "";

  const resetAllFilters = () => {
    setSelectedSub("All");
    setSelectedJournal("All");
    setSelectedType("All");
    setShowSavedOnly(false);
    setSearchQuery("");
    setVisibleCount(35);
  };

  return (
    <main className="min-h-screen bg-slate-100 py-8 px-4 sm:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-6 pt-1 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600 shadow-sm shadow-red-500/50"></span>
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                MULTI-JOURNAL LIVE MONITOR
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase text-slate-900 tracking-tight">
              NEUROLOGY &amp; STROKE JOURNAL MONITOR
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSavedOnly(!showSavedOnly)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                showSavedOnly
                  ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>{showSavedOnly ? "★" : "☆"}</span>
              <span>Saved ({bookmarks.length})</span>
            </button>
          </div>
        </header>

        {/* Ý tưởng 3: KHỐI ĐIỂM BÁO GIAO BAN BUỔI SÁNG (MORNING CLINICAL BRIEFING) */}
        {!loading && briefingHighlights.length > 0 && (
          <div className="mb-6 rounded-xl border border-amber-300/90 bg-gradient-to-br from-amber-50/90 via-white to-orange-50/60 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-base">🌅</span>
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-amber-300 block sm:inline sm:mr-2">
                    MORNING CLINICAL BRIEFING
                  </span>
                  <span className="text-[11px] text-slate-300">
                    Top {briefingHighlights.length} High-Yield Trials &amp; Studies for Handover
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyFullBriefing}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                    briefingCopied
                      ? "bg-emerald-500 text-white"
                      : "bg-white/15 hover:bg-white/25 text-white"
                  }`}
                  title="Copy all 4 morning highlights for Zalo / Telegram handover"
                >
                  {briefingCopied ? "✓ Briefing Copied!" : "📋 Copy Briefing"}
                </button>
                <button
                  onClick={() => setShowBriefing(!showBriefing)}
                  className="px-2 py-1 rounded text-[11px] font-semibold bg-white/10 hover:bg-white/20 text-slate-200"
                >
                  {showBriefing ? "Hide ▲" : "Show ▼"}
                </button>
              </div>
            </div>

            {showBriefing && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {briefingHighlights.map((item) => {
                  const cleanTakeaway = (item.ai_takeaways?.conclusion_vi || "").replace(
                    /^(?:discussion|conclusions?\s+and\s+relevance|conclusions?|interpretation|findings|summary)\s*[:.\-]?\s*/i,
                    ""
                  );
                  return (
                    <div
                      key={`brief-${item.id}`}
                      className="bg-white/95 p-3.5 rounded-lg border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-amber-400 transition-colors"
                    >
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-black uppercase"
                              style={{
                                backgroundColor: item.journal.badge_bg,
                                color: item.journal.badge_text,
                              }}
                            >
                              {item.journal.short_name}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                              {item.article_type}
                            </span>
                          </div>
                          <span className="text-[10px] font-semibold text-slate-500">
                            {item.neurology_classification.subspecialty}
                          </span>
                        </div>

                        <a
                          href={item.doi_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs sm:text-sm font-bold text-slate-900 hover:text-blue-600 line-clamp-2 mb-1.5 block leading-snug"
                        >
                          {item.title}
                        </a>

                        <p className="text-xs text-slate-700 line-clamp-3 leading-relaxed bg-amber-50/60 p-2 rounded border-l-2 border-amber-500">
                          {cleanTakeaway}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Search Input with Clear Button */}
        <div className="mb-4 relative">
          <input
            type="text"
            placeholder="Search by article title, abstract, author, drug, intervention (Tenecteplase, Thrombectomy, DOAC, Lecanemab)..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setVisibleCount(35);
            }}
            className="w-full px-4 py-2.5 pr-10 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="space-y-3 mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              FILTER BY JOURNAL:
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {availableJournals.map((j) => {
                const style = JOURNAL_PILL_STYLES[j] || JOURNAL_PILL_STYLES["All"];
                const isSelected = selectedJournal.toLowerCase() === j.toLowerCase();
                const count = journalCounts[j] ?? 0;
                return (
                  <button
                    key={j}
                    onClick={() => {
                      setSelectedJournal(j);
                      setVisibleCount(35);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isSelected ? style.active : style.inactive
                    }`}
                  >
                    <span>{j === "All" ? "All Journals" : j}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isSelected ? "bg-black/20 text-white" : "bg-slate-200/70 text-slate-600"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ý tưởng 5: Mở rộng bộ lọc Chuyên khoa sâu */}
          <div className="pt-2 border-t border-slate-100">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              NEUROLOGY SUBSPECIALTIES:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TOPIC_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => {
                    setSelectedSub(tab.value);
                    setVisibleCount(35);
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                    selectedSub === tab.value
                      ? "bg-slate-800 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                STUDY TYPE:
              </span>
              {["All", "Clinical Trial", "Meta-Analysis", "Guideline", "Review", "Original Article"].map(
                (type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setSelectedType(type);
                      setVisibleCount(35);
                    }}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                      selectedType === type
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {type}
                  </button>
                )
              )}
            </div>

            {hasActiveFilters && (
              <button
                onClick={resetAllFilters}
                className="text-xs font-semibold text-red-600 hover:text-red-800 underline"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Metadata & Status Bar */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 mb-5 px-1 font-medium gap-2">
          <span>
            Showing <strong>{displayedArticles.length}</strong> of{" "}
            <strong>{filteredArticles.length}</strong> articles across{" "}
            <strong>{groupedByDate.length}</strong> publication dates
            {selectedJournal !== "All" && ` from ${selectedJournal}`}
          </span>
          {lastUpdated && (
            <span className="text-slate-400 font-mono text-[11px]">
              Last updated: {lastUpdated}
            </span>
          )}
        </div>

        {/* Articles Grouped by Date -> Grouped by Journal */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200 text-sm">
            Loading articles...
          </div>
        ) : groupedByDate.length > 0 ? (
          <div className="space-y-8">
            {groupedByDate.map((dateGroup) => (
              <section key={dateGroup.dateKey} className="space-y-4">
                {/* KHỐI HEADER NGÀY XUẤT BẢN (DATE HEADER) */}
                <div className="sticky top-2 z-20 bg-slate-900/95 backdrop-blur-sm text-white px-4 py-2.5 rounded-xl shadow-md flex flex-wrap items-center justify-between gap-2 border border-slate-700">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                    <h2 className="text-sm sm:text-base font-extrabold tracking-wide">
                      {dateGroup.formattedDate}
                    </h2>
                    {dateGroup.relativeLabel && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/15 text-slate-200">
                        {dateGroup.relativeLabel}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-300 font-medium">
                    {dateGroup.totalArticles}{" "}
                    {dateGroup.totalArticles === 1 ? "article" : "articles"} •{" "}
                    {dateGroup.journalGroups.length}{" "}
                    {dateGroup.journalGroups.length === 1 ? "journal" : "journals"}
                  </div>
                </div>

                {/* CÁC NHÓM TẠP CHÍ TRONG NGÀY (JOURNAL GROUPS WITHIN DATE) */}
                <div className="space-y-6 pl-1 sm:pl-3 border-l-2 border-slate-300/80">
                  {dateGroup.journalGroups.map((jGroup) => {
                    const jTheme = getJournalTheme(jGroup.shortName);
                    return (
                      <div key={`${dateGroup.dateKey}-${jGroup.shortName}`} className="space-y-3">
                        {/* Tiêu đề nhóm Tạp chí */}
                        <div
                          className={`inline-flex flex-wrap items-center gap-2 px-3.5 py-1.5 rounded-lg border ${jTheme.groupBorder} ${jTheme.groupBg} shadow-xs`}
                        >
                          <span className={`w-2 h-2 rounded-full ${jTheme.groupDot}`}></span>
                          <span className="text-xs font-black uppercase tracking-wider">
                            {jGroup.shortName}
                          </span>
                          {jGroup.fullName && jGroup.fullName !== jGroup.shortName && (
                            <span className="text-xs opacity-80 hidden sm:inline">
                              — {jGroup.fullName}
                            </span>
                          )}
                          <span className="ml-1 px-2 py-0.5 text-[11px] font-bold rounded-full bg-white/80 text-slate-800 border border-black/5">
                            {jGroup.articles.length}{" "}
                            {jGroup.articles.length === 1 ? "study" : "studies"}
                          </span>
                        </div>

                        {/* Danh sách bài báo của tạp chí trong ngày đó */}
                        <div className="space-y-3.5">
                          {jGroup.articles.map((article) => (
                            <ArticleCard
                              key={article.id}
                              article={article}
                              onTagClick={(tag) => setSearchQuery(tag)}
                              onSubspecialtyClick={(sub) => {
                                const found = TOPIC_TABS.find(
                                  (t) =>
                                    t.value !== "All" &&
                                    sub.toLowerCase().includes(t.value.toLowerCase())
                                );
                                setSelectedSub(found ? found.value : "All");
                              }}
                              isBookmarked={bookmarks.includes(article.id)}
                              onToggleBookmark={toggleBookmark}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}

            {visibleCount < filteredArticles.length && (
              <div className="pt-4 text-center">
                <button
                  onClick={() => setVisibleCount((prev) => prev + 30)}
                  className="px-6 py-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
                >
                  Load More Articles ({filteredArticles.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200 text-sm">
            No articles match the selected filter criteria.
          </div>
        )}
      </div>
    </main>
  );
}
