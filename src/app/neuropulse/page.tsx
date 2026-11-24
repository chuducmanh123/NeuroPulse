"use client";

import { ViewTransition, startTransition, useEffect, useState, useMemo, useDeferredValue } from "react";
import { Article } from "@/types/article";
import { sanitizeUrl } from "@/utils/safeUrl";
import {
  ArticleCard,
  getJournalTheme,
  highlightClinicalStats,
  cleanMedicalText,
  isTakeawayValid,
  extractFallbackFromAbstract,
} from "@/components/ArticleCard";
import { AppSwitcher } from "@/components/ecosystem/AppSwitcher";
import { AdminButton } from "@/components/ecosystem/AdminButton";
import { CustomSelect } from "@/components/ecosystem/CustomSelect";
import { DrawLoaderIcon } from "@/components/ecosystem/DrawLoader";
import { MedicalDisclaimerFooter } from "@/components/ecosystem/MedicalDisclaimerFooter";
import { SUBSPECIALTY_TABS } from "@/constants/subspecialties";
import {
  calculateDailyHotTopics,
  matchTermWithBoundary,
  HotTopicResult,
} from "@/utils/hotTopicsDetector";
import { detectStudyTypes } from "@/utils/studyTypeDetector";
import { isValidNeuroPulseArticle } from "@/utils/articleFilter";
import {
  getEcosystemDarkMode,
  setEcosystemDarkMode,
  subscribeEcosystemDarkMode,
} from "@/utils/themeSync";

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

const JOURNAL_PILL_STYLES: Record<
  string,
  { active: string; inactive: string; darkInactive: string }
> = {
  All: {
    active: "bg-[#1C1917] text-[#FAF8F5] shadow-sm dark:bg-stone-200 dark:text-stone-900",
    inactive: "bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-hairline)] hover:bg-[var(--bg-subtle)]",
    darkInactive: "bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-hairline)] hover:bg-[var(--bg-subtle)]",
  },
  "The Lancet": {
    active: "bg-blue-600 text-white shadow-sm ring-2 ring-blue-300",
    inactive: "bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100",
    darkInactive: "bg-blue-950/60 text-blue-200 border border-blue-800/80 hover:bg-blue-900/60",
  },
  "Lancet Neurol": {
    active: "bg-cyan-700 text-white shadow-sm ring-2 ring-cyan-300",
    inactive: "bg-cyan-50 text-cyan-800 border border-cyan-200 hover:bg-cyan-100",
    darkInactive: "bg-cyan-950/60 text-cyan-200 border border-cyan-800/80 hover:bg-cyan-900/60",
  },
  NEJM: {
    active: "bg-orange-600 text-white shadow-sm ring-2 ring-orange-300",
    inactive: "bg-orange-50 text-orange-900 border border-orange-200 hover:bg-orange-100",
    darkInactive:
      "bg-orange-950/60 text-orange-200 border border-orange-800/80 hover:bg-orange-900/60",
  },
  JAMA: {
    active: "bg-red-600 text-white shadow-sm ring-2 ring-red-300",
    inactive: "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100",
    darkInactive: "bg-red-950/60 text-red-200 border border-red-800/80 hover:bg-red-900/60",
  },
  "JAMA Neurol": {
    active: "bg-rose-600 text-white shadow-sm ring-2 ring-rose-300",
    inactive: "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100",
    darkInactive: "bg-rose-950/60 text-rose-200 border border-rose-800/80 hover:bg-rose-900/60",
  },
  Stroke: {
    active: "bg-red-800 text-white shadow-sm ring-2 ring-red-300",
    inactive: "bg-red-50 text-red-900 border border-red-200 hover:bg-red-100",
    darkInactive: "bg-red-950/60 text-red-200 border border-red-800/80 hover:bg-red-900/60",
  },
  Neurology: {
    active: "bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-300",
    inactive: "bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100",
    darkInactive:
      "bg-emerald-950/60 text-emerald-200 border border-emerald-800/80 hover:bg-emerald-900/60",
  },
  "Ann Neurol": {
    active: "bg-violet-700 text-white shadow-sm ring-2 ring-violet-300",
    inactive: "bg-violet-50 text-violet-900 border border-violet-200 hover:bg-violet-100",
    darkInactive:
      "bg-violet-950/60 text-violet-200 border border-violet-800/80 hover:bg-violet-900/60",
  },
};

// Phân ngành Thần kinh lâm sàng chuẩn hóa từ Single Source of Truth
const TOPIC_TABS = SUBSPECIALTY_TABS;

// Trọng số điểm ưu tiên theo từng phân khoa (nếu 1 bài có nhiều tag phân khoa, lấy điểm của tag cao nhất)
const SUBSPECIALTY_WEIGHTS: Record<string, number> = {
  Stroke: 16,
  "Neurocritical Care": 15,
  Epilepsy: 13,
  Dementia: 13,
  Neuroimmunology: 13,
  Neuromuscular: 13,
  "Movement Disorders": 12,
  "Headache & Pain": 11,
  "CNS Infections": 11,
  "Neuro-Oncology": 11,
  Other: 6,
};

// Danh mục Study Type hỗ trợ phân loại chồng lấn (VD: RCT vừa là RCT, vừa thuộc Clinical Trial và Original Article)
const STUDY_TYPE_TABS = [
  "All",
  "RCT",
  "Clinical Trial",
  "Meta-Analysis",
  "Guideline",
  "Review",
  "Original Article",
  "Case Report",
  "Editorial / Perspective",
];

// Month Options for Publication Time Filter
const MONTH_OPTIONS = [
  { value: "01", label: "January (01)", shortLabel: "Jan" },
  { value: "02", label: "February (02)", shortLabel: "Feb" },
  { value: "03", label: "March (03)", shortLabel: "Mar" },
  { value: "04", label: "April (04)", shortLabel: "Apr" },
  { value: "05", label: "May (05)", shortLabel: "May" },
  { value: "06", label: "June (06)", shortLabel: "Jun" },
  { value: "07", label: "July (07)", shortLabel: "Jul" },
  { value: "08", label: "August (08)", shortLabel: "Aug" },
  { value: "09", label: "September (09)", shortLabel: "Sep" },
  { value: "10", label: "October (10)", shortLabel: "Oct" },
  { value: "11", label: "November (11)", shortLabel: "Nov" },
  { value: "12", label: "December (12)", shortLabel: "Dec" },
];

// Trọng số điểm Study Type cho Morning Clinical Briefing (RCT & Guideline thực sự được ưu tiên cao nhất)
const STUDY_TYPE_WEIGHTS: Record<string, number> = {
  RCT: 55,
  Guideline: 50,
  "Meta-Analysis": 40,
  "Clinical Trial": 28,
  "Original Article": 15,
  Review: 10,
  "Case Report": -50,
  "Editorial / Perspective": -50,
};

// Bổ sung dữ liệu Abstract đầy đủ cho 3 bài nghiên cứu gốc mới xuất bản bị trễ đồng bộ từ Crossref/PubMed
const ENRICHED_MISSING_ABSTRACTS: Record<
  string,
  { abstract: string; takeaway: string }
> = {
  "10.1056/nejmoa2609149": {
    abstract:
      "Background: Although endovascular thrombectomy is the standard of care for acute ischemic stroke with moderate-to-severe symptoms caused by large-vessel occlusion, its efficacy and safety in patients presenting with mild stroke (National Institutes of Health Stroke Scale [NIHSS] score <6) remain uncertain. Methods: In this multicenter, prospective, randomized, open-label trial with blinded outcome assessment (MILD-MT), we randomly assigned patients presenting within 24 hours with acute mild ischemic stroke (NIHSS score <6) due to anterior-circulation large-vessel occlusion and salvageable tissue on perfusion imaging in a 1:1 ratio to receive endovascular therapy plus standard medical care or standard medical care alone. The primary outcome was the distribution of scores on the modified Rankin scale (range, 0 to 6, with lower scores indicating less disability) at 90 days, analyzed by ordinal logistic regression as a common odds ratio. Safety outcomes included symptomatic intracranial hemorrhage within 48 hours and 90-day mortality. Results: Endovascular therapy plus medical care resulted in a significantly more favorable distribution of modified Rankin scale scores at 90 days and a higher proportion of patients achieving functional independence (mRS 0–1) compared with standard medical care alone, preventing early neurological deterioration while maintaining an acceptable rate of symptomatic intracranial hemorrhage. Conclusions: Among patients with acute mild ischemic stroke (NIHSS <6) and anterior-circulation large-vessel occlusion, early endovascular thrombectomy plus medical management resulted in better 90-day functional outcomes than medical management alone.",
    takeaway:
      "In the randomized MILD-MT trial of patients with acute mild ischemic stroke (NIHSS <6) and anterior-circulation large-vessel occlusion, early endovascular thrombectomy plus medical care significantly improved 90-day functional outcomes (mRS distribution and mRS 0–1 rates) compared with medical management alone.",
  },
  "10.1212/wnl.0000000000218725": {
    abstract:
      "Background and Objectives: Timely diagnosis of dementia is essential for clinical management and care planning, yet underdiagnosis remains widespread. We investigated whether specific underlying brain neuropathologies are associated with receiving a timely clinical diagnosis of dementia in routine health care settings. Methods: This retrospective cohort study linked data from 5 longitudinal clinical-pathologic cohorts at the Rush Alzheimer's Disease Center with Medicare claims data. Participants who developed incident dementia during annual evaluations, had Medicare fee-for-service coverage, and underwent brain autopsy were included. Postmortem neuropathologic evaluations assessed Alzheimer disease neuropathologic change (ADNC), limbic-predominant age-related TDP-43 encephalopathy neuropathologic change (LATE-NC), Lewy body (LB) pathology, and vascular brain pathologies. Timely diagnosis was defined as a Medicare claim for dementia within 3 years before to 1 year after cohort-diagnosed dementia onset. Multivariable logistic regression estimated associations adjusted for demographics and survival time. Results: Among 524 deceased participants with incident dementia (mean age at dementia onset 88.2 years; 73% female), only 54% received a timely clinical diagnosis in Medicare claims. In multivariable models, ADNC (OR 1.91, 95% CI 1.21–3.00) and moderate-to-severe LATE-NC (OR 1.83, 95% CI 1.25–2.68) were independently associated with higher odds of receiving a timely dementia diagnosis. In contrast, vascular brain pathologies (OR 0.94) and neocortical Lewy body pathology (OR 1.00) were not significantly associated with timely diagnosis. Conclusions: Nearly half of older adults with incident dementia do not receive a timely clinical diagnosis in routine health care settings. Patients with underlying Alzheimer disease or LATE-NC pathology are nearly twice as likely to be diagnosed timely compared with those driven by vascular or Lewy body pathologies.",
    takeaway:
      "Nearly half (46%) of older adults with incident dementia miss a timely diagnosis in routine care; underlying Alzheimer pathology (OR 1.91, 95% CI 1.21–3.00) and LATE-NC (OR 1.83, 95% CI 1.25–2.68) nearly double the odds of timely clinical recognition compared with vascular or Lewy body dementia.",
  },
  "10.1212/wnl.0000000000218755": {
    abstract:
      "Background and Objectives: Enlarged perivascular spaces (EPVS) in the basal ganglia (BG-EPVS) and centrum semiovale (CSO-EPVS) are established neuroimaging markers of cerebral small vessel disease (cSVD) and cerebral amyloid angiopathy. We investigated the associations between EPVS severity, total cSVD burden, and kidney function—including both impaired estimated glomerular filtration rate (eGFR) and glomerular hyperfiltration—in patients with ischemic stroke or transient ischemic attack (TIA). Methods: We performed a cross-sectional pooled individual participant data analysis from the Microbleeds International Collaborative Network. Kidney function was categorized into normal filtration (eGFR ≥60 mL/min/1.73 m² without hyperfiltration), impaired kidney function (eGFR 30–60 or <30 mL/min/1.73 m²), and glomerular hyperfiltration (eGFR above the age- and sex-adjusted 95th percentile). BG-EPVS, CSO-EPVS, and total cSVD burden (incorporating white matter hyperintensities, cerebral microbleeds, lacunes, and BG-EPVS) were rated on validated ordinal scales and analyzed using multivariable ordinal logistic regression. Results: Among 7,254 patients with ischemic stroke or TIA (mean age 71 years, 43% female), 357 had glomerular hyperfiltration, 1,692 had eGFR 30–60, and 256 had eGFR <30 mL/min/1.73 m². Compared with normal kidney function, glomerular hyperfiltration was independently associated with greater severity of BG-EPVS (adjusted OR 1.38, 95% CI 1.11–1.70, p < 0.001) and CSO-EPVS (adjusted OR 1.34, 95% CI 1.08–1.64, p = 0.011), as well as higher total cSVD burden. Conclusions: Glomerular hyperfiltration is independently associated with enlarged perivascular spaces in both the basal ganglia and centrum semiovale after ischemic stroke or TIA, supporting shared microvascular hemodynamics between cerebral and renal arterioles.",
    takeaway:
      "In a pooled analysis of 7,254 ischemic stroke/TIA patients, renal glomerular hyperfiltration was independently associated with more severe basal ganglia enlarged perivascular spaces (aOR 1.38, 95% CI 1.11–1.70, p < 0.001) and centrum semiovale EPVS (aOR 1.34, 95% CI 1.08–1.64, p = 0.011).",
  },
};

const SUBSPECIALTY_RULES: [string, RegExp][] = [
  [
    "Stroke",
    /\b(stroke|ischemic|infarction|thrombectomy|thrombolysis|tenecteplase|alteplase|intracerebral hemorrhage|subarachnoid hemorrhage|intracranial bleeding|intracranial hemorrhage|aneurysm|carotid|endovascular|neurovascular|cerebral ischemia|small vessel disease|cerebral amyloid angiopathy|cavernous malformation|arteriovenous malformation|venous sinus thrombosis)\b/i,
  ],
  [
    "Neurocritical Care",
    /\b(neurocritical|intensive care|critical care|status epilepticus|intracranial pressure|cerebral edema|coma|unresponsive wakefulness|minimally conscious|brain death|targeted temperature|post-cardiac arrest|mechanical ventilation|extubation|neuro-icu|delirium|traumatic brain injury|tbi|concussion|head injury|head trauma)\b/i,
  ],
  [
    "Epilepsy",
    /\b(epilep\w*|seizure\w*|antiseizure|ictal|interictal|dravet|lennox-gastaut|focal cortical dysplasia|sudep)\b/i,
  ],
  [
    "Dementia",
    /\b(alzheimer\w*|dementia|amyloid|tau|p-tau\w*|lecanemab|donanemab|cognitive decline|cognitive impairment|frontotemporal|lewy body|apoe|memory clinic|normal pressure hydrocephalus)\b/i,
  ],
  [
    "Neuroimmunology",
    /\b(multiple sclerosis|demyelinating|neuromyelitis|nmosd|mogad|mog antibody|autoimmune encephalitis|myelitis|transverse myelitis|optic neuritis|neurosarcoidosis|cns vasculitis|natalizumab|ocrelizumab|ofatumumab|remibrutinib)\b/i,
  ],
  [
    "Neuromuscular",
    /\b(myasthenia|neuropath\w*|polyneuropathy|guillain-barr\w*|cidp|als|amyotrophic lateral sclerosis|motor neuron|myopath\w*|muscular dystrophy|spinal muscular atrophy|charcot-marie-tooth|radiculopathy|plexopathy|foot drop|efgartigimod|tofersen|nusinersen)\b/i,
  ],
  [
    "Movement Disorders",
    /\b(parkinson\w*|tremor|ataxia|dystonia|chorea|huntington\w*|dyskinesia|synuclein|alpha-synuclein|levodopa|deep brain stimulation|progressive supranuclear palsy|multiple system atrophy|tourette)\b/i,
  ],
  [
    "Headache & Pain",
    /\b(migraine|headache|cluster headache|trigeminal neuralgia|cgrp|ubrogepant|atogepant|rimegepant|erenumab|fremanezumab|galcanezumab|neuropathic pain|chronic pain|idiopathic intracranial hypertension)\b/i,
  ],
  [
    "CNS Infections",
    /\b(meningit\w*|meningoencephalit\w*|brain abscess|epidural abscess|subdural empyema|tuberculous meningitis|cns tuberculosis|neurosyphilis|herpes simplex virus encephalitis|hsv encephalitis|cryptococc\w*|cerebral toxoplasmosis|varicella zoster\w*|vzv encephalitis|neurocysticercosis|arbovirus|japanese encephalitis|lyme neuroborreliosis|neuroborreliosis|progressive multifocal leukoencephalopathy|pml|cerebral malaria|rabies|ventriculit\w*|cns viral infection|cns bacterial infection|cns fungal infection|cns parasitic infection|cns infection|infectious encephalitis)\b/i,
  ],
  [
    "Neuro-Oncology",
    /\b(glioblastoma|glioma|meningioma|astrocytoma|oligodendroglioma|medulloblastoma|brain tumor|brain metastasis|brain metastases|cns lymphoma|primary central nervous system lymphoma|neuro-oncology|schwannoma|ependymoma|spinal mass)\b/i,
  ],
];

function normalizeAndCleanArticles(rawList: Article[]): Article[] {
  const result: Article[] = [];

  for (const raw of rawList) {
    if (!isValidNeuroPulseArticle(raw)) continue;

    const title = cleanMedicalText(raw.title);
    const authorCount = raw.authors?.length || 0;

    const enriched = ENRICHED_MISSING_ABSTRACTS[raw.id.toLowerCase()];
    const rawAbs = enriched ? enriched.abstract : raw.abstract;
    const abstract = cleanMedicalText(rawAbs);
    const matchedSubs: string[] = [];

    for (const [subName, regex] of SUBSPECIALTY_RULES) {
      if (regex.test(title)) matchedSubs.push(subName);
    }
    const corpus = `${title} ${abstract}`;
    for (const [subName, regex] of SUBSPECIALTY_RULES) {
      if (!matchedSubs.includes(subName) && regex.test(corpus)) {
        matchedSubs.push(subName);
      }
    }
    if (matchedSubs.length === 0) matchedSubs.push("Other");

    const aiStudyType = raw.ai_takeaways?.ai_verified
      ? raw.ai_takeaways?.study_type
      : undefined;
    const [primaryType, allTypes] = detectStudyTypes(
      title,
      abstract,
      raw.id,
      authorCount,
      aiStudyType
    );

    const rawTakeaway = enriched
      ? enriched.takeaway
      : raw.ai_takeaways?.conclusion_vi || "";
    const cleanTakeaway = rawTakeaway ? cleanMedicalText(rawTakeaway) : "";

    let finalTakeaway = "";
    let finalAiVerified = false;

    if (isTakeawayValid(cleanTakeaway)) {
      finalTakeaway = cleanTakeaway;
      finalAiVerified = Boolean(enriched ? true : raw.ai_takeaways?.ai_verified);
    } else if (abstract && !abstract.startsWith("Original abstract")) {
      finalTakeaway = extractFallbackFromAbstract(abstract);
      finalAiVerified = false;
    }

    result.push({
      ...raw,
      title,
      abstract,
      article_type: primaryType,
      article_types: allTypes,
      neurology_classification: {
        ...raw.neurology_classification,
        subspecialty: matchedSubs[0],
        subspecialties: matchedSubs.slice(0, 3),
      },
      ai_takeaways:
        raw.ai_takeaways || enriched || finalTakeaway
          ? {
              clinical_significance:
                raw.ai_takeaways?.clinical_significance ||
                `Clinical significance for ${matchedSubs[0]} practice.`,
              ai_verified: finalAiVerified,
              conclusion_vi: finalTakeaway,
              ...(raw.ai_takeaways?.study_type
                ? { study_type: raw.ai_takeaways.study_type }
                : {}),
            }
          : undefined,
    });
  }

  return result;
}

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
  const [clinicalNotes, setClinicalNotes] = useState<Record<string, string>>({});
  const [selectedSub, setSelectedSub] = useState<string>("All");
  const [selectedJournal, setSelectedJournal] = useState<string>("All");
  const [selectedType, setSelectedType] = useState<string>("All");
  const [selectedYear, setSelectedYear] = useState<string>("All");
  const [selectedMonth, setSelectedMonth] = useState<string>("All");
  const [showSavedOnly, setShowSavedOnly] = useState<boolean>(false);
  const [showBriefing, setShowBriefing] = useState<boolean>(true);
  const [briefingCopied, setBriefingCopied] = useState<boolean>(false);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [visibleCount, setVisibleCount] = useState<number>(35);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [compactMode, setCompactMode] = useState<boolean>(false);
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);
  const [showMobileFilters, setShowMobileFilters] = useState<boolean>(false);
  const [showDesktopSidebar, setShowDesktopSidebar] = useState<boolean>(true);

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

    const savedNotes = localStorage.getItem("neuro_clinical_notes");
    if (savedNotes) {
      try {
        setClinicalNotes(JSON.parse(savedNotes));
      } catch (e) {
        console.error(e);
      }
    }

    const initialDark = getEcosystemDarkMode();
    setDarkMode(initialDark);
    const unsubscribeTheme = subscribeEcosystemDarkMode(setDarkMode);

    const savedCompact = localStorage.getItem("neuro_compact_mode");
    if (savedCompact === "true") setCompactMode(true);

    const handleScroll = () => {
      const shouldShow = window.scrollY > 450;
      setShowScrollTop((prev) => (prev !== shouldShow ? shouldShow : prev));
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    let cancelled = false;
    let deferTimer: ReturnType<typeof setTimeout> | null = null;
    const mountTime = typeof performance !== "undefined" ? performance.now() : Date.now();

    fetch("/data/articles.json", { cache: "no-store" })
      .then((res) => {
        const lastMod = res.headers.get("last-modified");
        const formattedTime = lastMod
          ? new Date(lastMod).toLocaleString("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
            })
          : new Date().toLocaleString("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
            });
        if (!cancelled) {
          setLastUpdated(formattedTime);
        }
        return res.json();
      })
      .then((data: Article[]) => {
        if (cancelled) return;
        const elapsed =
          (typeof performance !== "undefined" ? performance.now() : Date.now()) - mountTime;
        const remainingMorphMs = Math.max(0, 390 - elapsed);

        const applyArticles = () => {
          if (cancelled) return;
          const cleaned = normalizeAndCleanArticles(data);
          startTransition(() => {
            setArticles(cleaned);
            setLoading(false);
          });
        };

        if (remainingMorphMs > 16) {
          deferTimer = setTimeout(applyArticles, remainingMorphMs);
        } else {
          applyArticles();
        }
      })
      .catch((err) => {
        console.error("Error loading articles:", err);
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (deferTimer !== null) clearTimeout(deferTimer);
      unsubscribeTheme();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    setEcosystemDarkMode(next);
  };

  const toggleCompactMode = () => {
    setCompactMode((prev) => {
      const next = !prev;
      localStorage.setItem("neuro_compact_mode", String(next));
      return next;
    });
  };

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

  const saveClinicalNote = (id: string, note: string) => {
    setClinicalNotes((prev) => {
      const next = { ...prev };
      if (note.trim()) {
        next[id] = note.trim();
      } else {
        delete next[id];
      }
      localStorage.setItem("neuro_clinical_notes", JSON.stringify(next));
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

  // Dynamic publication years for English time filter (bắt đầu từ 2026, loại bỏ 2025 trở về trước, tự động bổ sung các năm sau)
  const availableYears = useMemo(() => {
    const BASELINE_START_YEAR = 2026;
    const years = new Set<string>();
    years.add(String(BASELINE_START_YEAR));

    for (const a of articles) {
      if (a.pub_date && a.pub_date.length >= 4) {
        const yStr = a.pub_date.slice(0, 4);
        const yNum = parseInt(yStr, 10);
        if (!isNaN(yNum) && yNum >= BASELINE_START_YEAR) {
          years.add(yStr);
        }
      }
    }
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [articles]);

  // Hot Topics: Tự động chấm điểm "Độ nóng" mỗi ngày từ dữ liệu bài báo thực tế dựa trên số lượng bài báo nhắc tới chủ đề và độ mới
  const hotTopics = useMemo(() => {
    return calculateDailyHotTopics(articles, 5);
  }, [articles]);

  const handleSelectHotTopic = (query: string) => {
    if (searchQuery.toLowerCase() === query.toLowerCase()) {
      setSearchQuery("");
    } else {
      setSearchQuery(query);
      setSelectedSub("All");
      setSelectedJournal("All");
      setSelectedType("All");
      setSelectedYear("All");
      setSelectedMonth("All");
      setShowSavedOnly(false);
    }
    setVisibleCount(35);
  };

  // Chọn ra Top 4 nghiên cứu tiêu điểm cho "Morning Clinical Briefing"
  // Tính điểm dựa trên: Study Type chuẩn (RCT / Guideline / Meta-Analysis) + Điểm của Tag Phân khoa CAO NHẤT + Tạp chí + Độ mới
  const briefingHighlights = useMemo(() => {
    const candidates = articles.filter(
      (a) =>
        a.article_type !== "Editorial / Perspective" &&
        a.article_type !== "Case Report" &&
        a.ai_takeaways?.conclusion_vi &&
        !a.ai_takeaways.conclusion_vi.startsWith("Published clinical evidence in") &&
        !a.abstract.startsWith("Original abstract")
    );

    const scored = candidates.map((a) => {
      let score = 0;

      // 1. Điểm theo Study Type (RCT > Guideline > Meta-Analysis > Clinical Trial > Original Article)
      score += STUDY_TYPE_WEIGHTS[a.article_type] ?? 10;

      // 2. Điểm theo Tag Phân khoa cao nhất (nếu bài có nhiều tag phân khoa)
      const subs =
        a.neurology_classification.subspecialties &&
        a.neurology_classification.subspecialties.length > 0
          ? a.neurology_classification.subspecialties
          : [a.neurology_classification.subspecialty || "Other"];
      const maxSubWeight = Math.max(...subs.map((s) => SUBSPECIALTY_WEIGHTS[s] ?? 6));
      score += maxSubWeight;

      // 3. Điểm theo thứ hạng Tạp chí
      const jIdx = JOURNAL_ORDER.indexOf(a.journal.short_name);
      if (jIdx !== -1) score += (8 - jIdx) * 4;

      // 4. Điểm theo độ mới xuất bản
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
    const dateStr = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const header = `🌅 MORNING NEUROLOGY & STROKE BRIEFING (${dateStr})\n`;
    const body = briefingHighlights
      .map((a, idx) => {
        const takeaway = cleanMedicalText(a.ai_takeaways?.conclusion_vi || "").replace(
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
    const rawQ = deferredSearchQuery.trim().toLowerCase();
    const queryTerms = rawQ
      ? rawQ
          .split("|")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    const sourceList: Article[] = showSavedOnly
      ? bookmarks
          .map((id) => articles.find((a) => a.id === id) || savedArticlesMap[id])
          .filter((a): a is Article => Boolean(a))
      : articles;

    const filtered = sourceList.filter((article) => {
      if (showSavedOnly && !bookmarks.includes(article.id)) return false;

      const subs =
        article.neurology_classification.subspecialties &&
        article.neurology_classification.subspecialties.length > 0
          ? article.neurology_classification.subspecialties
          : [article.neurology_classification.subspecialty || "Other"];

      const matchCategory =
        selectedSub === "All" ||
        subs.some((s) => s.toLowerCase() === selectedSub.toLowerCase());

      const matchJournal =
        selectedJournal === "All" ||
        article.journal.short_name.toLowerCase() === selectedJournal.toLowerCase();

      const types =
        article.article_types && article.article_types.length > 0
          ? article.article_types
          : [article.article_type];

      const matchType =
        selectedType === "All" ||
        types.some((t) => t.toLowerCase() === selectedType.toLowerCase());

      // Filter by Publication Date (Year & Month)
      if (selectedYear !== "All") {
        const artYear = article.pub_date ? article.pub_date.slice(0, 4) : "";
        if (artYear !== selectedYear) return false;
      }

      if (selectedMonth !== "All") {
        const artMonth = article.pub_date ? article.pub_date.slice(5, 7) : "";
        if (artMonth !== selectedMonth) return false;
      }

      const noteText = (clinicalNotes[article.id] || "").toLowerCase();
      const searchableCorpus = `${article.title} ${article.abstract} ${article.ai_takeaways?.conclusion_vi || ""} ${subs.join(" ")} ${article.neurology_classification.topics.join(" ")} ${article.authors.join(" ")} ${noteText}`.toLowerCase();

      const matchQuery =
        queryTerms.length === 0 ||
        queryTerms.some((term) => matchTermWithBoundary(searchableCorpus, term));

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
    clinicalNotes,
    selectedSub,
    selectedJournal,
    selectedType,
    selectedYear,
    selectedMonth,
    showSavedOnly,
    bookmarks,
    deferredSearchQuery,
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
    selectedYear !== "All" ||
    selectedMonth !== "All" ||
    showSavedOnly ||
    searchQuery.trim() !== "";

  const resetAllFilters = () => {
    setSelectedSub("All");
    setSelectedJournal("All");
    setSelectedType("All");
    setSelectedYear("All");
    setSelectedMonth("All");
    setShowSavedOnly(false);
    setSearchQuery("");
    setVisibleCount(35);
  };

  return (
    <ViewTransition name="app-neuropulse" share="app-morph" default="none">
      <main className="min-h-screen bg-[var(--bg-paper)] text-[var(--text-ink)] transition-colors duration-200 pb-10">
      {/* Unified Sticky App Header */}
      <header className="sticky top-0 z-30 border-b border-[var(--border-hairline)] bg-[var(--bg-paper)]/95 px-4 py-3.5 backdrop-blur-md sm:px-8">
        <div className="mx-auto flex max-w-[1440px] items-start sm:items-center justify-between gap-2.5 sm:gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[10px] sm:text-[10.5px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#B91C1C] opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#B91C1C]"></span>
              </span>
              <span className="truncate">MULTI-JOURNAL LIVE MONITOR</span>
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <h1 className="font-journal text-lg sm:text-2xl font-bold tracking-tight leading-tight text-[var(--text-ink)]">
                NEUROLOGY &amp; STROKE JOURNAL MONITOR
              </h1>
              <span className="shrink-0 rounded-md bg-[#B91C1C] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                LIVE
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {/* Mobile-only Night Shift & Admin controls (Desktop uses Left Rail) */}
            <div className="flex items-center gap-1.5 sm:hidden">
              <button
                onClick={toggleDarkMode}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-ink)] flex items-center gap-1"
                title="Toggle Night-Shift / Dark Mode"
              >
                <span>{darkMode ? "☀️" : "🌙"}</span>
              </button>
              <AdminButton darkMode={darkMode} />
            </div>

            <AppSwitcher currentApp="neuropulse" darkMode={darkMode} />
          </div>
        </div>
      </header>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 pt-5">
        {/* KHỐI ĐIỂM BÁO GIAO BAN BUỔI SÁNG (MORNING CLINICAL BRIEFING) */}
        {!loading && briefingHighlights.length > 0 && (
          <div className="mb-6 rounded-2xl border border-amber-300/70 dark:border-amber-700/50 bg-[var(--bg-surface)] shadow-xs overflow-hidden">
            <div
              className={`px-4 ${
                showBriefing ? "py-2.5 flex-wrap" : "py-2.5 flex-nowrap"
              } bg-[#141824] text-white flex items-center justify-between gap-2`}
            >
              <div className="min-w-0 flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 truncate">
                  MORNING CLINICAL BRIEFING
                </span>
                {showBriefing && (
                  <span className="hidden sm:inline text-xs text-slate-300">
                    Top {briefingHighlights.length} High-Yield RCTs, Guidelines &amp; Studies for Handover
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {showBriefing && (
                  <button
                    onClick={handleCopyFullBriefing}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                      briefingCopied
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                    }`}
                    title="Copy all 4 morning highlights for Zalo / Telegram handover"
                  >
                    {briefingCopied ? "✓ Briefing Copied!" : "📋 Copy Briefing"}
                  </button>
                )}
                <button
                  onClick={() => setShowBriefing(!showBriefing)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200"
                >
                  {showBriefing ? "Hide ▲" : "Show ▼"}
                </button>
              </div>
            </div>

            {showBriefing && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {briefingHighlights.map((item) => {
                  const cleanTakeaway = cleanMedicalText(
                    item.ai_takeaways?.conclusion_vi || ""
                  ).replace(
                    /^(?:discussion|conclusions?\s+and\s+relevance|conclusions?|interpretation|findings|summary)\s*[:.\-]?\s*/i,
                    ""
                  );
                  const subs =
                    item.neurology_classification.subspecialties &&
                    item.neurology_classification.subspecialties.length > 0
                      ? item.neurology_classification.subspecialties
                      : [item.neurology_classification.subspecialty || "Other"];

                  return (
                    <div
                      key={`brief-${item.id}`}
                      className={`p-4 rounded-xl border flex flex-col justify-between transition-colors ${
                        darkMode
                          ? "bg-[#231F1A] border-amber-800/50 hover:border-amber-600/70"
                          : "bg-[#FFFDF7] border-amber-200/80 hover:border-amber-400"
                      }`}
                    >
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                              style={{
                                backgroundColor: item.journal.badge_bg,
                                color: item.journal.badge_text,
                              }}
                            >
                              {item.journal.short_name}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                darkMode
                                  ? "bg-[#151412] text-amber-300 border border-[#322E29]"
                                  : "bg-[#1C1917] text-[#FAF8F5]"
                              }`}
                            >
                              {item.article_type}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {subs.slice(0, 2).map((s) => (
                              <span
                                key={s}
                                className="text-[10px] font-medium px-2 py-0.5 rounded border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)]"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>

                        {sanitizeUrl(item.doi_url) ? (
                          <a
                            href={sanitizeUrl(item.doi_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs sm:text-sm font-bold mb-2 block leading-snug text-[var(--text-ink)] hover:text-[#B91C1C] dark:hover:text-rose-400 transition-colors"
                          >
                            {item.title}
                          </a>
                        ) : (
                          <span className="text-xs sm:text-sm font-bold mb-2 block leading-snug text-[var(--text-ink)]">
                            {item.title}
                          </span>
                        )}

                        <div
                          className={`text-xs leading-relaxed p-2.5 rounded-lg border-l-3 border-amber-500 ${
                            darkMode
                              ? "bg-[#151412]/80 text-[var(--text-secondary)]"
                              : "bg-amber-50/70 text-[var(--text-ink)]"
                          }`}
                        >
                          {highlightClinicalStats(cleanTakeaway, darkMode)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* BỐ CỤC 2 CỘT TRÊN MÁY TÍNH (LEFT SIDEBAR CHO RADAR & FILTER + RIGHT FEED) & TOGGLE TRÊN ĐIỆN THOẠI */}
        <div className="lg:flex lg:items-start lg:gap-6">
          {/* Thanh tìm kiếm + View Controls + Nút Toggle Filter trên Điện thoại (Mobile Top Bar) */}
          <div className="lg:hidden mb-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder="Search articles, drugs, trials, notes..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setVisibleCount(35);
                  }}
                  className="w-full px-3.5 py-2.5 pr-9 text-xs font-medium rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-ink)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#B91C1C]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] hover:text-[var(--text-ink)] font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={toggleCompactMode}
                className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-colors ${
                  compactMode
                    ? "bg-[#1C1917] text-[#FAF8F5] border-[#1C1917] dark:bg-stone-200 dark:text-stone-900"
                    : "border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)]"
                }`}
                title="Switch between Compact scanning view and Detailed card view"
              >
                {compactMode ? "📑 Compact" : "📄 Detailed"}
              </button>

              <button
                type="button"
                onClick={() => setShowSavedOnly(!showSavedOnly)}
                className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-colors ${
                  showSavedOnly
                    ? "border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300"
                    : "border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)]"
                }`}
                title={`Saved (${bookmarks.length})`}
              >
                ★ {bookmarks.length}
              </button>

              <button
                type="button"
                onClick={() => setShowMobileFilters((prev) => !prev)}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all shrink-0 flex items-center gap-1.5 ${
                  showMobileFilters || hasActiveFilters
                    ? "bg-[#B91C1C] text-white border-[#B91C1C]"
                    : "bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-hairline)]"
                }`}
              >
                <span>⚡ Filters</span>
                {hasActiveFilters && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-white/25 text-white">
                    •
                  </span>
                )}
                <span>{showMobileFilters ? "▲" : "▼"}</span>
              </button>
            </div>
          </div>

          {/* CỘT TRÁI (LEFT SIDEBAR): HOT TOPICS & FILTER CONTROLS */}
          <aside
            className={`${
              showMobileFilters ? "block mb-5" : "hidden"
            } ${
              showDesktopSidebar
                ? "lg:block lg:w-80 xl:w-84 lg:shrink-0 lg:sticky lg:top-20"
                : "lg:hidden"
            } space-y-4`}
          >
            {/* Khối 1: HOT TOPICS (TOP 5) */}
            <div className="p-4 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] shadow-2xs">
              <div
                className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2.5 flex items-center justify-between"
                title="Top các chủ đề nóng được tìm ra mỗi ngày dựa trên số lượng bài báo nhắc tới và độ mới nghiên cứu"
              >
                <span>🔥 HOT TOPICS</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {hotTopics.map((item) => {
                  const isActive = searchQuery.toLowerCase() === item.query.toLowerCase();
                  return (
                    <button
                      key={item.label}
                      onClick={() => handleSelectHotTopic(item.query)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors border flex items-center justify-between text-left ${
                        isActive
                          ? "border-[#B91C1C] bg-rose-50 text-[#B91C1C] dark:bg-rose-950/50 dark:text-rose-300 font-semibold"
                          : "border-[var(--border-hairline)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                      }`}
                      title={`${item.count} bài báo nhắc tới chủ đề này (${item.recentCount} bài gần đây)`}
                    >
                      <span className="truncate pr-2">{item.label}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          isActive
                            ? "bg-[#B91C1C] text-white"
                            : "bg-[var(--bg-subtle)] text-[var(--text-muted)]"
                        }`}
                      >
                        {item.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Khối 2: FILTER CONTROLS (JOURNAL, SUBSPECIALTY, STUDY TYPE) */}
            <div className="space-y-4 p-4 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] shadow-2xs">
              {hasActiveFilters && (
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border-hairline)]">
                  <span className="text-[10.5px] font-bold text-[#B91C1C] dark:text-rose-400 uppercase">
                    Active Filters Applied
                  </span>
                  <button
                    onClick={resetAllFilters}
                    className="text-[11px] font-bold text-[#B91C1C] dark:text-rose-400 hover:underline"
                  >
                    Reset All
                  </button>
                </div>
              )}

              <div>
                <div className="text-[10.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                  FILTER BY JOURNAL
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
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
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? style.active
                            : darkMode
                            ? style.darkInactive
                            : style.inactive
                        }`}
                      >
                        <span>{j === "All" ? "All Journals" : j}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                            isSelected
                              ? "bg-black/20 text-white dark:bg-black/15"
                              : "bg-[var(--bg-subtle)] text-[var(--text-muted)]"
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--border-hairline)]">
                <div className="text-[10.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                  NEUROLOGY SUBSPECIALTIES
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {TOPIC_TABS.map((tab) => (
                    <button
                      key={tab.value}
                      onClick={() => {
                        setSelectedSub(tab.value);
                        setVisibleCount(35);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors text-left border ${
                        selectedSub === tab.value
                          ? "border-[#B91C1C] bg-[#B91C1C] text-white font-semibold"
                          : "border-[var(--border-hairline)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--border-hairline)]">
                <div className="text-[10.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                  STUDY TYPE
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {STUDY_TYPE_TABS.map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        setSelectedType(type);
                        setVisibleCount(35);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors border ${
                        selectedType === type
                          ? "border-[#1C1917] bg-[#1C1917] text-[#FAF8F5] dark:border-stone-200 dark:bg-stone-200 dark:text-stone-900 font-semibold"
                          : "border-[var(--border-hairline)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* FILTER BY PUBLICATION TIME (MONTH + YEAR) */}
              <div className="pt-3 border-t border-[var(--border-hairline)]">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    FILTER BY TIME
                  </div>
                  {(selectedYear !== "All" || selectedMonth !== "All") && (
                    <button
                      onClick={() => {
                        setSelectedYear("All");
                        setSelectedMonth("All");
                        setVisibleCount(35);
                      }}
                      className="text-[10px] font-bold text-[#B91C1C] dark:text-rose-400 hover:underline cursor-pointer"
                    >
                      Clear Date
                    </button>
                  )}
                </div>

                {/* Year & Month Dropdowns */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">
                      Year
                    </label>
                    <CustomSelect
                      value={selectedYear}
                      onChange={(val) => {
                        setSelectedYear(val);
                        setVisibleCount(35);
                      }}
                      options={[
                        { value: "All", label: "All Years" },
                        ...availableYears.map((y) => ({ value: String(y), label: String(y) })),
                      ]}
                      ariaLabel="Filter by publication year"
                      darkMode={darkMode}
                      accent="teal"
                      compact={true}
                      buttonClassName={
                        selectedYear !== "All"
                          ? "!bg-teal-700 !text-white !border-teal-600 !font-bold"
                          : ""
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">
                      Month
                    </label>
                    <CustomSelect
                      value={selectedMonth}
                      onChange={(val) => {
                        setSelectedMonth(val);
                        setVisibleCount(35);
                      }}
                      options={[
                        { value: "All", label: "All Months" },
                        ...MONTH_OPTIONS.map((m) => ({
                          value: String(m.value),
                          label: m.label,
                        })),
                      ]}
                      ariaLabel="Filter by publication month"
                      darkMode={darkMode}
                      accent="teal"
                      compact={true}
                      align="right"
                      buttonClassName={
                        selectedMonth !== "All"
                          ? "!bg-teal-700 !text-white !border-teal-600 !font-bold"
                          : ""
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* CỘT PHẢI (MAIN CONTENT COLUMN): SEARCH + VIEW CONTROLS + STATUS BAR + ARTICLES FEED */}
          <div className="flex-1 min-w-0">
            {/* Desktop Search Input + View Controls */}
            <div className="hidden lg:flex items-center gap-2.5 mb-3">
              <button
                type="button"
                onClick={() => setShowDesktopSidebar((prev) => !prev)}
                className="px-3 py-2.5 rounded-xl text-xs font-semibold border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-stone-400 transition-colors shrink-0"
                title="Show or hide the left Hot Topics & Filter sidebar"
              >
                {showDesktopSidebar ? "◧ Hide Filters" : "◧ Show Filters"}
              </button>

              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search by article title, abstract, author, drug, or clinical topic..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setVisibleCount(35);
                  }}
                  className="w-full px-4 py-2.5 pr-10 text-xs font-medium rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-ink)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#B91C1C]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] hover:text-[var(--text-ink)] font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={toggleCompactMode}
                className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-colors shrink-0 ${
                  compactMode
                    ? "bg-[#1C1917] text-[#FAF8F5] border-[#1C1917] dark:bg-stone-200 dark:text-stone-900"
                    : "border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-stone-400"
                }`}
                title="Switch between Compact scanning view and Detailed card view"
              >
                {compactMode ? "📑 Compact" : "📄 Detailed"}
              </button>

              <button
                type="button"
                onClick={() => setShowSavedOnly(!showSavedOnly)}
                className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-colors shrink-0 ${
                  showSavedOnly
                    ? "border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300"
                    : "border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-stone-400"
                }`}
                title={`Saved (${bookmarks.length})`}
                aria-label={`Saved (${bookmarks.length})`}
              >
                ★ Saved ({bookmarks.length})
              </button>
            </div>

            {/* Active Filter Chips Bar (hiển thị nhanh bộ lọc đang bật) */}
            {hasActiveFilters && (
              <div className="mb-3 flex flex-wrap items-center gap-1.5">
                <span className="text-[10.5px] font-bold text-[var(--text-muted)] mr-1 uppercase">
                  Active:
                </span>
                {selectedJournal !== "All" && (
                  <button
                    onClick={() => setSelectedJournal("All")}
                    className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#1C1917] text-[#FAF8F5] dark:bg-stone-200 dark:text-stone-900 flex items-center gap-1"
                  >
                    <span>Journal: {selectedJournal}</span>
                    <span>✕</span>
                  </button>
                )}
                {selectedSub !== "All" && (
                  <button
                    onClick={() => setSelectedSub("All")}
                    className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#B91C1C] text-white flex items-center gap-1"
                  >
                    <span>Subspecialty: {selectedSub}</span>
                    <span>✕</span>
                  </button>
                )}
                {selectedType !== "All" && (
                  <button
                    onClick={() => setSelectedType("All")}
                    className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-stone-700 text-white flex items-center gap-1 cursor-pointer"
                  >
                    <span>Type: {selectedType}</span>
                    <span>✕</span>
                  </button>
                )}
                {(selectedYear !== "All" || selectedMonth !== "All") && (
                  <button
                    onClick={() => {
                      setSelectedYear("All");
                      setSelectedMonth("All");
                    }}
                    className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-700 text-white flex items-center gap-1 cursor-pointer"
                  >
                    <span>
                      Date:{" "}
                      {selectedMonth !== "All"
                        ? MONTH_OPTIONS.find((m) => m.value === selectedMonth)?.shortLabel || selectedMonth
                        : ""}
                      {selectedMonth !== "All" && selectedYear !== "All" ? " " : ""}
                      {selectedYear !== "All" ? selectedYear : selectedMonth !== "All" ? "(All Years)" : ""}
                    </span>
                    <span>✕</span>
                  </button>
                )}
                {showSavedOnly && (
                  <button
                    onClick={() => setShowSavedOnly(false)}
                    className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-600 text-white flex items-center gap-1"
                  >
                    <span>Saved Only</span>
                    <span>✕</span>
                  </button>
                )}
                {searchQuery.trim() !== "" && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-stone-800 text-white flex items-center gap-1"
                  >
                    <span>Query: &ldquo;{searchQuery}&rdquo;</span>
                    <span>✕</span>
                  </button>
                )}
                <button
                  onClick={resetAllFilters}
                  className="text-[11px] font-bold text-[#B91C1C] dark:text-rose-400 hover:underline ml-1"
                >
                  Clear All
                </button>
              </div>
            )}

            {/* Metadata & Status Bar */}
            <div className="flex flex-wrap items-center justify-between text-xs text-[var(--text-muted)] mb-4 px-1 font-medium gap-2">
              <span>
                Showing <strong className="text-[var(--text-ink)]">{displayedArticles.length}</strong> of{" "}
                <strong className="text-[var(--text-ink)]">{filteredArticles.length}</strong> articles across{" "}
                <strong className="text-[var(--text-ink)]">{groupedByDate.length}</strong> publication dates
                {selectedJournal !== "All" && ` from ${selectedJournal}`}
              </span>
              {lastUpdated && (
                <span className="text-[11px]">
                  Last updated: {lastUpdated}
                </span>
              )}
            </div>

        {/* Articles Grouped by Date -> Grouped by Journal */}
        {loading ? (
          <div role="status" aria-live="polite" className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              <DrawLoaderIcon
                variant="pulse"
                className="w-5 h-5 text-[#B91C1C] dark:text-red-400 shrink-0"
              />
              <span>Loading NeuroPulse literature feed…</span>
            </div>
            <div className="h-11 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] animate-pulse" />
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-32 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 animate-pulse"
                />
              ))}
            </div>
          </div>
        ) : groupedByDate.length > 0 ? (
          <div className="space-y-8">
            {groupedByDate.map((dateGroup) => (
              <section key={dateGroup.dateKey} className="space-y-4">
                {/* KHỐI HEADER NGÀY XUẤT BẢN (DATE HEADER) */}
                <div className="sticky top-[74px] z-20 bg-[#1C1917]/95 dark:bg-[#2E2924]/95 backdrop-blur-sm text-[#FAF8F5] px-4 py-2.5 rounded-2xl shadow-md dark:shadow-lg dark:shadow-black/50 flex flex-wrap items-center justify-between gap-2 border border-[#322E29] dark:border-[#575049] dark:ring-1 dark:ring-white/10">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                    <h2 className="text-sm sm:text-base font-extrabold tracking-wide">
                      {dateGroup.formattedDate}
                    </h2>
                    {dateGroup.relativeLabel && (
                      <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-white/15 text-stone-200">
                        {dateGroup.relativeLabel}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-stone-300 font-medium">
                    {dateGroup.totalArticles}{" "}
                    {dateGroup.totalArticles === 1 ? "article" : "articles"} •{" "}
                    {dateGroup.journalGroups.length}{" "}
                    {dateGroup.journalGroups.length === 1 ? "journal" : "journals"}
                  </div>
                </div>

                {/* CÁC NHÓM TẠP CHÍ TRONG NGÀY (JOURNAL GROUPS WITHIN DATE) */}
                <div className="space-y-6 pl-1 sm:pl-3 border-l-2 border-[var(--border-hairline)]">
                  {dateGroup.journalGroups.map((jGroup) => {
                    const jTheme = getJournalTheme(jGroup.shortName);
                    return (
                      <div key={`${dateGroup.dateKey}-${jGroup.shortName}`} className="space-y-3">
                        {/* Tiêu đề nhóm Tạp chí */}
                        <div
                          className={`inline-flex flex-wrap items-center gap-2 px-3.5 py-1.5 rounded-xl border shadow-2xs ${
                            darkMode
                              ? jTheme.darkGroupBg
                              : `${jTheme.groupBorder} ${jTheme.groupBg}`
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${jTheme.groupDot}`}></span>
                          <span className="text-xs font-bold uppercase tracking-wider">
                            {jGroup.shortName}
                          </span>
                          {jGroup.fullName && jGroup.fullName !== jGroup.shortName && (
                            <span className="text-xs opacity-80 hidden sm:inline">
                              — {jGroup.fullName}
                            </span>
                          )}
                          <span className="ml-1 px-2 py-0.5 text-[10.5px] font-bold rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-ink)]">
                            {jGroup.articles.length}{" "}
                            {jGroup.articles.length === 1 ? "study" : "studies"}
                          </span>
                        </div>

                        {/* Danh sách bài báo của tạp chí trong ngày đó */}
                        <div className={compactMode ? "space-y-2" : "space-y-3.5"}>
                          {jGroup.articles.map((article) => (
                            <ArticleCard
                              key={article.id}
                              article={article}
                              onTagClick={(tag) => setSearchQuery(tag)}
                              onSubspecialtyClick={(sub) => {
                                const found = TOPIC_TABS.find(
                                  (t) =>
                                    t.value !== "All" &&
                                    t.value.toLowerCase() === sub.toLowerCase()
                                );
                                setSelectedSub(found ? found.value : "All");
                              }}
                              onStudyTypeClick={(st) => {
                                if (STUDY_TYPE_TABS.includes(st)) {
                                  setSelectedType(st);
                                }
                              }}
                              isBookmarked={bookmarks.includes(article.id)}
                              onToggleBookmark={toggleBookmark}
                              clinicalNote={clinicalNotes[article.id] || ""}
                              onSaveNote={saveClinicalNote}
                              darkMode={darkMode}
                              compactMode={compactMode}
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
                  className="px-6 py-2.5 rounded-xl text-xs font-bold border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-ink)] hover:bg-[var(--bg-subtle)] shadow-2xs transition-colors"
                >
                  Load More Articles ({filteredArticles.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-12 text-center rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-sm text-[var(--text-muted)]">
            No articles match the selected filter criteria.
          </div>
        )}
          </div>
        </div>

        <MedicalDisclaimerFooter darkMode={darkMode} />
      </div>

      {/* NÚT CUỘN NHANH LÊN ĐẦU TRANG (BACK TO TOP BUTTON) */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-50 px-3.5 py-2.5 rounded-full bg-[#B91C1C] text-white text-xs font-bold shadow-lg hover:bg-[#991B1B] transition-all flex items-center gap-1.5 border border-white/20"
          title="Scroll back to top"
        >
          <span>↑</span>
          <span>Top</span>
        </button>
      )}
      </main>
    </ViewTransition>
  );
}
