"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { ClinicalCase, CaseDifficulty, CaseStatus } from "../../types/clinicalCase";
import { Article } from "../../types/article";
import { AppSwitcher } from "../../components/ecosystem/AppSwitcher";
import { NeuroImagingViewer } from "../../components/neurocase/NeuroImagingViewer";
import {
  extractClinicalCaseFromArticleText,
  extractTextFromUploadedDocument,
} from "../../utils/aiCaseExtractor";

const SUBSPECIALTY_TABS = [
  { label: "All Subspecialties", value: "All" },
  { label: "Vascular & Stroke", value: "Vascular & Stroke" },
  { label: "Neurocritical Care", value: "Neurocritical Care" },
  { label: "Traumatic Brain Injury (TBI)", value: "Traumatic Brain Injury (TBI)" },
  { label: "Epilepsy", value: "Epilepsy" },
  { label: "Cognitive & Dementia", value: "Cognitive & Dementia" },
  { label: "Neuroimmunology", value: "Neuroimmunology" },
  { label: "Neuromuscular", value: "Neuromuscular" },
  { label: "Movement Disorders", value: "Movement Disorders" },
  { label: "Headache & Pain", value: "Headache & Pain" },
  { label: "Neuro-Oncology", value: "Neuro-Oncology" },
  { label: "Other", value: "Other" },
];

const DIFFICULTY_BADGES: Record<CaseDifficulty, string> = {
  Resident: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  Fellow: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  Attending: "bg-rose-500/15 text-rose-500 border-rose-500/30",
};

interface UserCaseProgress {
  selectedOption: "A" | "B" | "C" | "D";
  isCorrect: boolean;
  answeredAt: string;
}

export default function NeuroCasePage() {
  const [cases, setCases] = useState<ClinicalCase[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  // Navigation Tabs: daily | archive | exam | submit | admin
  const [activeTab, setActiveTab] = useState<"daily" | "archive" | "exam" | "submit" | "admin">("daily");
  const [activeCaseId, setActiveCaseId] = useState<string>("");

  // User Progress & Streak
  const [progressMap, setProgressMap] = useState<Record<string, UserCaseProgress>>({});
  const [wrongAttemptsMap, setWrongAttemptsMap] = useState<
    Record<string, ("A" | "B" | "C" | "D")[]>
  >({});
  const [showDetailedWorkup, setShowDetailedWorkup] = useState(false);
  const [streakDays, setStreakDays] = useState<number>(1);

  // Archive Filters
  const [selectedSub, setSelectedSub] = useState<string>("All");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("All");
  const [selectedSolvedFilter, setSelectedSolvedFilter] = useState<"All" | "Unsolved" | "Solved">("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Board Exam Simulation State
  const [examStarted, setExamStarted] = useState(false);
  const [examFinished, setExamFinished] = useState(false);
  const [examCaseIds, setExamCaseIds] = useState<string[]>([]);
  const [examCurrentIdx, setExamCurrentIdx] = useState(0);
  const [examAnswers, setExamAnswers] = useState<Record<string, "A" | "B" | "C" | "D">>({});
  const [examTimeLeftSec, setExamTimeLeftSec] = useState(300);

  // User Submission & Client-Side De-identification State
  const [subTitle, setSubTitle] = useState("");
  const [subSpecialty, setSubSpecialty] = useState("Vascular & Stroke");
  const [subDifficulty, setSubDifficulty] = useState<CaseDifficulty>("Resident");
  const [subPublishedDate, setSubPublishedDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [subDemographics, setSubDemographics] = useState("58-year-old right-handed male");
  const [subPmh, setSubPmh] = useState("");
  const [subChiefComplaint, setSubChiefComplaint] = useState("");
  const [subHistory, setSubHistory] = useState("");
  const [subNeuroExam, setSubNeuroExam] = useState("");
  const [subLabsCsf, setSubLabsCsf] = useState("");
  const [subModality, setSubModality] = useState("Brain MRI (DWI / FLAIR)");
  const [subFigCaption, setSubFigCaption] = useState("");
  const [subFindings, setSubFindings] = useState("");
  const [subVitalBp, setSubVitalBp] = useState("130/80 mmHg");
  const [subVitalHr, setSubVitalHr] = useState("80 bpm");
  const [subVitalRr, setSubVitalRr] = useState("18 /min");
  const [subVitalTemp, setSubVitalTemp] = useState("36.8 °C");
  const [subVitalSpo2, setSubVitalSpo2] = useState("98%");
  const [subQuestion, setSubQuestion] = useState("");
  const [subOptA, setSubOptA] = useState("");
  const [subOptB, setSubOptB] = useState("");
  const [subOptC, setSubOptC] = useState("");
  const [subOptD, setSubOptD] = useState("");
  const [subOptARationale, setSubOptARationale] = useState("");
  const [subOptBRationale, setSubOptBRationale] = useState("");
  const [subOptCRationale, setSubOptCRationale] = useState("");
  const [subOptDRationale, setSubOptDRationale] = useState("");
  const [subPeerA, setSubPeerA] = useState<number>(64);
  const [subPeerB, setSubPeerB] = useState<number>(16);
  const [subPeerC, setSubPeerC] = useState<number>(12);
  const [subPeerD, setSubPeerD] = useState<number>(8);
  const [subCorrect, setSubCorrect] = useState<"A" | "B" | "C" | "D">("A");
  const [subDiagnosis, setSubDiagnosis] = useState("");
  const [subDiscussion, setSubDiscussion] = useState("");
  const [subTeachingPoint, setSubTeachingPoint] = useState("");
  const [subPitfall, setSubPitfall] = useState("");
  const [subAuthor, setSubAuthor] = useState("");
  const [subDoiUrl, setSubDoiUrl] = useState("");
  const [subImageWebpUrl, setSubImageWebpUrl] = useState<string>("");
  const [subImageSizeKb, setSubImageSizeKb] = useState<number>(0);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Collapsible Optional Sections in Submit Case (collapsed by default so form stays clean)
  const [showSubMcqSection, setShowSubMcqSection] = useState(false);
  const [showSubResolutionSection, setShowSubResolutionSection] = useState(false);
  const [showSubMetadataVitalsSection, setShowSubMetadataVitalsSection] = useState(false);

  // Admin Verification & Full Case Editing State
  const [isAdminVerified, setIsAdminVerified] = useState(false);
  const [showAdminAuthModal, setShowAdminAuthModal] = useState(false);
  const [adminPasscodeInput, setAdminPasscodeInput] = useState("");
  const [adminAuthError, setAdminAuthError] = useState("");
  const [adminStatusFilter, setAdminStatusFilter] = useState<"pending" | "approved" | "rejected">(
    "pending"
  );
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<ClinicalCase | null>(null);

  // AI Article / Document Case Extractor State (.pdf, .docx, .doc, .txt)
  const [showAiExtractor, setShowAiExtractor] = useState(false);
  const [aiRawText, setAiRawText] = useState("");
  const [aiPdfBase64, setAiPdfBase64] = useState<string | undefined>(undefined);
  const [uploadedDocName, setUploadedDocName] = useState<string>("");
  const [isReadingDoc, setIsReadingDoc] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [isExtractingAi, setIsExtractingAi] = useState(false);

  useEffect(() => {
    const savedDark = localStorage.getItem("neuro_dark_mode");
    if (savedDark === "true") setDarkMode(true);

    const savedAdmin = localStorage.getItem("neurocase_admin_verified") === "true";
    if (savedAdmin) setIsAdminVerified(true);

    const savedKey = localStorage.getItem("neurocase_gemini_api_key") || "";
    if (savedKey) setGeminiApiKey(savedKey);

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "admin") {
        if (savedAdmin) {
          setActiveTab("admin");
        } else {
          setShowAdminAuthModal(true);
        }
      } else if (
        tabParam === "daily" ||
        tabParam === "archive" ||
        tabParam === "exam" ||
        tabParam === "submit"
      ) {
        setActiveTab(tabParam);
      }
    }

    const savedProgress = localStorage.getItem("neurocase_progress_v1");
    if (savedProgress) {
      try {
        setProgressMap(JSON.parse(savedProgress));
      } catch (e) {
        console.error(e);
      }
    }

    const savedStreak = localStorage.getItem("neurocase_streak_days");
    if (savedStreak) {
      setStreakDays(Number(savedStreak) || 1);
    }

    Promise.all([
      fetch("/data/cases.json").then((r) => r.json()),
      fetch("/data/articles.json")
        .then((r) => r.json())
        .catch(() => []),
    ])
      .then(([loadedCases, loadedArticles]: [ClinicalCase[], Article[]]) => {
        let customCases: ClinicalCase[] = [];
        const savedCustom = localStorage.getItem("neurocase_custom_submissions_v1");
        if (savedCustom) {
          try {
            customCases = JSON.parse(savedCustom);
          } catch (e) {
            console.error(e);
          }
        }
        let overridesMap: Record<string, ClinicalCase> = {};
        const savedOverrides = localStorage.getItem("neurocase_admin_overrides_v2");
        if (savedOverrides) {
          try {
            overridesMap = JSON.parse(savedOverrides);
          } catch (e) {
            console.error(e);
          }
        }
        const merged = [...customCases, ...loadedCases].map((c) => overridesMap[c.id] || c);
        setCases(merged);
        const daily = merged.find((c) => c.is_daily_challenge && c.status !== "pending") || merged[0];
        if (daily) setActiveCaseId(daily.id);
        setArticles(Array.isArray(loadedArticles) ? loadedArticles : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading NeuroCase data:", err);
        setLoading(false);
      });
  }, []);

  // Exam countdown timer
  useEffect(() => {
    if (!examStarted || examFinished) return;
    const timer = setInterval(() => {
      setExamTimeLeftSec((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setExamFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [examStarted, examFinished]);

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem("neuro_dark_mode", String(next));
      return next;
    });
  };

  const approvedCases = useMemo(
    () => cases.filter((c) => !c.status || c.status === "approved"),
    [cases]
  );

  const currentCase = useMemo(
    () => approvedCases.find((c) => c.id === activeCaseId) || approvedCases[0],
    [approvedCases, activeCaseId]
  );

  const handleSelectOption = (caseItem: ClinicalCase, optionId: "A" | "B" | "C" | "D") => {
    const isCorrect = optionId === caseItem.challenge.correct_option;

    // NEJM Image Challenge Multi-Attempt ("Try Again!") behavior:
    // If incorrect, record the wrong option for this case so the user sees "Try again! That is not the correct answer."
    // without spoiling the correct answer or unlocking the final diagnosis yet.
    if (!isCorrect) {
      setWrongAttemptsMap((prev) => {
        const existing = prev[caseItem.id] || [];
        if (existing.includes(optionId)) return prev;
        return { ...prev, [caseItem.id]: [...existing, optionId] };
      });
      return;
    }

    const nextProgress: Record<string, UserCaseProgress> = {
      ...progressMap,
      [caseItem.id]: {
        selectedOption: optionId,
        isCorrect: true,
        answeredAt: new Date().toISOString(),
      },
    };
    setProgressMap(nextProgress);
    localStorage.setItem("neurocase_progress_v1", JSON.stringify(nextProgress));

    const todayKey = new Date().toISOString().slice(0, 10);
    const lastStreakDate = localStorage.getItem("neurocase_last_streak_date");
    if (lastStreakDate !== todayKey) {
      const nextStreak = streakDays + 1;
      setStreakDays(nextStreak);
      localStorage.setItem("neurocase_streak_days", String(nextStreak));
      localStorage.setItem("neurocase_last_streak_date", todayKey);
    }
  };

  const handleResetCaseAttempt = (caseId: string) => {
    const next = { ...progressMap };
    delete next[caseId];
    setProgressMap(next);
    localStorage.setItem("neurocase_progress_v1", JSON.stringify(next));
    setWrongAttemptsMap((prev) => {
      const copy = { ...prev };
      delete copy[caseId];
      return copy;
    });
  };

  const handleNextChallenge = () => {
    if (!currentCase || approvedCases.length === 0) return;
    const idx = approvedCases.findIndex((c) => c.id === currentCase.id);
    const nextIdx = (idx + 1) % approvedCases.length;
    setActiveCaseId(approvedCases[nextIdx].id);
    setShowDetailedWorkup(false);
  };

  const formatChallengeDate = (isoDate: string) => {
    try {
      const d = new Date(`${isoDate}T00:00:00`);
      if (isNaN(d.getTime())) return isoDate;
      return d.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return isoDate;
    }
  };

  const stats = useMemo(() => {
    const entries = Object.values(progressMap);
    const totalSolved = entries.length;
    const correctCount = entries.filter((e) => e.isCorrect).length;
    const accuracy = totalSolved > 0 ? Math.round((correctCount / totalSolved) * 100) : 0;
    return { totalSolved, correctCount, accuracy };
  }, [progressMap]);

  // Cross-Ecosystem Integration: Related Literature from NeuroPulse
  const relatedPulseArticles = useMemo(() => {
    if (!currentCase || articles.length === 0) return [];
    const keywords = currentCase.resolution.related_keywords.map((k) => k.toLowerCase());
    const sub = currentCase.subspecialty.toLowerCase();

    const matched = articles.filter((a) => {
      const text = `${a.title} ${a.abstract} ${a.neurology_classification?.subspecialty || ""}`.toLowerCase();
      return keywords.some((kw) => text.includes(kw)) || text.includes(sub);
    });
    return matched.slice(0, 3);
  }, [currentCase, articles]);

  const filteredArchiveCases = useMemo(() => {
    return approvedCases.filter((c) => {
      const subs = c.subspecialties || [c.subspecialty];
      const matchSub =
        selectedSub === "All" || subs.some((s) => s.toLowerCase() === selectedSub.toLowerCase());
      const matchDiff = selectedDifficulty === "All" || c.difficulty === selectedDifficulty;
      const isSolved = Boolean(progressMap[c.id]);
      const matchSolved =
        selectedSolvedFilter === "All" ||
        (selectedSolvedFilter === "Solved" && isSolved) ||
        (selectedSolvedFilter === "Unsolved" && !isSolved);
      const q = searchQuery.trim().toLowerCase();
      const matchQuery =
        !q ||
        `${c.title} ${c.case_code} ${c.resolution.final_diagnosis} ${c.presentation.chief_complaint}`
          .toLowerCase()
          .includes(q);
      return matchSub && matchDiff && matchSolved && matchQuery;
    });
  }, [approvedCases, selectedSub, selectedDifficulty, selectedSolvedFilter, searchQuery, progressMap]);

  const startBoardExam = (count: number) => {
    const shuffled = [...approvedCases].sort(() => Math.random() - 0.5).slice(0, count);
    setExamCaseIds(shuffled.map((c) => c.id));
    setExamCurrentIdx(0);
    setExamAnswers({});
    setExamTimeLeftSec(shuffled.length * 90);
    setExamStarted(true);
    setExamFinished(false);
  };

  // Client-side Image Upload, EXIF Strip, PHI Blackout & WebP Compression (<150KB)
  const handleImageUploadForDeidentification = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const maxDim = 720;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, w, h);
        exportCanvasToCompressedWebp();
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const applyPhiBlackoutMask = (zone: "top" | "bottom" | "corners") => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#000000";
    if (zone === "top") {
      ctx.fillRect(0, 0, canvas.width, Math.round(canvas.height * 0.14));
    } else if (zone === "bottom") {
      ctx.fillRect(0, Math.round(canvas.height * 0.86), canvas.width, Math.round(canvas.height * 0.14));
    } else if (zone === "corners") {
      const cw = Math.round(canvas.width * 0.32);
      const ch = Math.round(canvas.height * 0.16);
      ctx.fillRect(0, 0, cw, ch);
      ctx.fillRect(canvas.width - cw, 0, cw, ch);
      ctx.fillRect(0, canvas.height - ch, cw, ch);
      ctx.fillRect(canvas.width - cw, canvas.height - ch, cw, ch);
    }
    exportCanvasToCompressedWebp();
  };

  const exportCanvasToCompressedWebp = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const webpDataUrl = canvas.toDataURL("image/webp", 0.72);
    setSubImageWebpUrl(webpDataUrl);
    const approxBytes = Math.round((webpDataUrl.length * 3) / 4);
    setSubImageSizeKb(Math.round(approxBytes / 102.4) / 10);
  };

  const handleArticleTextFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsReadingDoc(true);
    setUploadedDocName(file.name);
    try {
      const res = await extractTextFromUploadedDocument(file);
      if (res.text) {
        setAiRawText(res.text);
      } else if (res.pdfBase64) {
        setAiRawText(
          `[Uploaded PDF Document: ${file.name}] — Click "Auto-Extract & Populate Form" to parse with Gemini AI.`
        );
      }
      setAiPdfBase64(res.pdfBase64);
    } catch (err) {
      console.error("Failed to read uploaded article document:", err);
    } finally {
      setIsReadingDoc(false);
    }
  };

  const handleRunAiExtraction = async () => {
    if (!aiRawText.trim() && !aiPdfBase64) return;
    setIsExtractingAi(true);
    try {
      if (geminiApiKey.trim()) {
        localStorage.setItem("neurocase_gemini_api_key", geminiApiKey.trim());
      }
      const extracted = await extractClinicalCaseFromArticleText(
        aiRawText,
        geminiApiKey,
        aiPdfBase64
      );
      setSubTitle(extracted.title);
      setSubSpecialty(extracted.subspecialty);
      setSubDifficulty(extracted.difficulty);
      setSubAuthor(extracted.author_credit);
      setSubDemographics(extracted.demographics);
      setSubPmh(extracted.past_medical_history);
      setSubChiefComplaint(extracted.chief_complaint);
      setSubHistory(extracted.history_of_present_illness);
      setSubNeuroExam(extracted.neuro_exam);
      setSubLabsCsf(extracted.key_labs_csf);
      setSubModality(extracted.modality);
      setSubFigCaption(extracted.figure_caption);
      setSubFindings(extracted.findings_summary);
      setSubQuestion(extracted.question);
      setSubOptA(extracted.optA);
      setSubOptB(extracted.optB);
      setSubOptC(extracted.optC);
      setSubOptD(extracted.optD);
      setSubOptARationale(extracted.optARationale);
      setSubOptBRationale(extracted.optBRationale);
      setSubOptCRationale(extracted.optCRationale);
      setSubOptDRationale(extracted.optDRationale);
      setSubCorrect(extracted.correctOption);
      setSubDiagnosis(extracted.final_diagnosis);
      setSubDiscussion(extracted.clinical_discussion);
      setSubTeachingPoint(extracted.teaching_points.join("\n"));
      setSubPitfall(extracted.clinical_pitfalls.join("\n"));

      // Automatically expand the optional sections when AI populates them so the user can review
      setShowSubMcqSection(true);
      setShowSubResolutionSection(true);
      setShowSubMetadataVitalsSection(true);

      setSubmitSuccessMsg(
        `✨ Successfully structured clinical case from ${extracted.journal_short}! Review the populated fields below and click Submit Case.`
      );
    } finally {
      setIsExtractingAi(false);
    }
  };

  const handleUserSubmitCase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subTitle.trim()) return;

    const parsedTeachingPoints = subTeachingPoint
      .split(/\n|•/)
      .map((s) => s.trim())
      .filter(Boolean);
    const parsedPitfalls = subPitfall
      .split(/\n|•/)
      .map((s) => s.trim())
      .filter(Boolean);

    const newCase: ClinicalCase = {
      id: `nc-user-${Date.now()}`,
      case_code: `NC-USER-${Math.floor(100 + Math.random() * 900)}`,
      title: subTitle.trim(),
      subspecialty: subSpecialty,
      subspecialties: [subSpecialty],
      difficulty: subDifficulty,
      estimated_time_sec: 90,
      is_daily_challenge: false,
      published_date: subPublishedDate || new Date().toISOString().slice(0, 10),
      status: "pending",
      author_credit: subAuthor.trim() || "Community Clinician Contributor",
      source_journal: subDoiUrl.trim()
        ? {
            name: subAuthor.trim() || "Clinical Submission",
            short_name: "DOI Source",
            doi_url: subDoiUrl.trim(),
            pub_year: (subPublishedDate || new Date().toISOString()).slice(0, 4),
          }
        : undefined,
      presentation: {
        demographics: subDemographics.trim() || "Adult Patient",
        chief_complaint: subChiefComplaint.trim() || subTitle.trim(),
        history_of_present_illness:
          subHistory.trim() || "Clinical history provided by contributing author.",
        past_medical_history: subPmh.trim() || "As documented in clinical vignette",
        vitals: {
          bp: subVitalBp.trim() || "130/80 mmHg",
          hr: subVitalHr.trim() || "80 bpm",
          rr: subVitalRr.trim() || "18 /min",
          temp: subVitalTemp.trim() || "36.8 °C",
          spo2: subVitalSpo2.trim() || "98%",
        },
        neuro_exam: subNeuroExam.trim() || "Focal neurological findings as described.",
        key_labs_csf: subLabsCsf.trim() || "Baseline metabolic and CSF workup as indicated.",
        imaging: [
          {
            modality: subModality.trim() || "Brain CT / MRI",
            sequence_badge: "DE-IDENTIFIED WEBP",
            figure_label: "Figure 1",
            image_url:
              subImageWebpUrl ||
              (approvedCases[0]?.presentation.imaging[0]?.image_url ?? ""),
            caption:
              subFigCaption.trim() ||
              "Client-side de-identified clinical neuroimaging figure (.webp).",
            findings_summary:
              subFindings.trim() || "Characteristic neuroimaging abnormality.",
          },
        ],
      },
      challenge: {
        question:
          subQuestion.trim() ||
          "What is the most likely clinical diagnosis and optimal management strategy?",
        question_type: "Diagnosis",
        correct_option: subCorrect,
        options: [
          {
            id: "A",
            text: subOptA.trim() || "Primary clinical diagnosis / management option A",
            peer_percentage: Number(subPeerA) || (subCorrect === "A" ? 64 : 16),
            rationale:
              subOptARationale.trim() ||
              (subCorrect === "A"
                ? "Correct option per case author."
                : "Plausible clinical distractor."),
          },
          {
            id: "B",
            text: subOptB.trim() || "Alternative differential diagnosis B",
            peer_percentage: Number(subPeerB) || (subCorrect === "B" ? 64 : 16),
            rationale:
              subOptBRationale.trim() ||
              (subCorrect === "B"
                ? "Correct option per case author."
                : "Plausible clinical distractor."),
          },
          {
            id: "C",
            text: subOptC.trim() || "Alternative differential diagnosis C",
            peer_percentage: Number(subPeerC) || (subCorrect === "C" ? 64 : 12),
            rationale:
              subOptCRationale.trim() ||
              (subCorrect === "C"
                ? "Correct option per case author."
                : "Plausible clinical distractor."),
          },
          {
            id: "D",
            text: subOptD.trim() || "Alternative differential diagnosis D",
            peer_percentage: Number(subPeerD) || (subCorrect === "D" ? 64 : 8),
            rationale:
              subOptDRationale.trim() ||
              (subCorrect === "D"
                ? "Correct option per case author."
                : "Plausible clinical distractor."),
          },
        ],
      },
      resolution: {
        final_diagnosis: subDiagnosis.trim() || subTitle.trim(),
        clinical_discussion:
          subDiscussion.trim() || "Clinical discussion provided by contributing clinician.",
        teaching_points:
          parsedTeachingPoints.length > 0
            ? parsedTeachingPoints
            : ["Core clinical takeaway from this case."],
        clinical_pitfalls:
          parsedPitfalls.length > 0
            ? parsedPitfalls
            : ["Diagnostic pitfall to avoid in clinical practice."],
        related_keywords: [subSpecialty.toLowerCase(), "stroke", "neurology"],
      },
    };

    const nextCases = [newCase, ...cases];
    setCases(nextCases);
    const savedCustom = nextCases.filter((c) => c.id.startsWith("nc-user-"));
    localStorage.setItem("neurocase_custom_submissions_v1", JSON.stringify(savedCustom));

    setSubmitSuccessMsg(
      `Case "${newCase.case_code}" submitted with PENDING status! You can review and publish it in the Admin Review tab.`
    );
    setSubTitle("");
    setSubChiefComplaint("");
    setSubHistory("");
    setSubNeuroExam("");
    setSubLabsCsf("");
    setSubQuestion("");
    setSubOptA("");
    setSubOptB("");
    setSubOptC("");
    setSubOptD("");
  };

  const persistAdminCases = (nextCases: ClinicalCase[]) => {
    setCases(nextCases);
    const savedCustom = nextCases.filter((c) => c.id.startsWith("nc-user-"));
    localStorage.setItem("neurocase_custom_submissions_v1", JSON.stringify(savedCustom));

    const overridesMap: Record<string, ClinicalCase> = {};
    for (const item of nextCases) {
      overridesMap[item.id] = item;
    }
    localStorage.setItem("neurocase_admin_overrides_v2", JSON.stringify(overridesMap));
  };

  const handleAdminUpdateStatus = (caseId: string, newStatus: CaseStatus, makeDaily = false) => {
    const nextCases = cases.map((c) => {
      if (c.id === caseId) {
        return {
          ...c,
          status: newStatus,
          is_daily_challenge: makeDaily ? true : c.is_daily_challenge,
        };
      }
      return makeDaily ? { ...c, is_daily_challenge: false } : c;
    });
    persistAdminCases(nextCases);
    if (makeDaily) {
      setActiveCaseId(caseId);
    }
  };

  const handleStartFullEdit = (caseItem: ClinicalCase) => {
    setEditingCaseId(caseItem.id);
    setEditDraft(JSON.parse(JSON.stringify(caseItem)));
  };

  const handleSaveAdminEdit = (caseId: string) => {
    if (!editDraft) return;
    const nextCases = cases.map((c) => (c.id === caseId ? editDraft : c));
    persistAdminCases(nextCases);
    setEditingCaseId(null);
    setEditDraft(null);
  };

  const pendingCount = useMemo(
    () => cases.filter((c) => c.status === "pending" || c.status === "needs_revision").length,
    [cases]
  );

  const rejectedCount = useMemo(
    () => cases.filter((c) => c.status === "rejected").length,
    [cases]
  );

  return (
    <main
      className={`min-h-screen py-8 px-4 sm:px-8 transition-colors duration-200 ${
        darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-100 text-slate-900"
      }`}
    >
      <div className="max-w-6xl mx-auto">
        {/* NEUROCASE HEADER */}
        <header className="mb-6 pt-1 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-600 shadow-sm shadow-indigo-500/50"></span>
              </span>
              <span
                className={`text-xs font-bold uppercase tracking-widest ${
                  darkMode ? "text-indigo-400" : "text-indigo-600"
                }`}
              >
                INTERACTIVE CLINICAL REASONING SUITE
              </span>
            </div>
            <h1
              className={`text-2xl sm:text-3xl font-black uppercase tracking-tight ${
                darkMode ? "text-white" : "text-slate-900"
              }`}
            >
              NEUROCASE
            </h1>
          </div>

          {/* Gamification Streak + Night Shift + 9-Dots App Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <div
              className={`px-3 py-2 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${
                darkMode
                  ? "bg-slate-900 border-slate-700 text-amber-300"
                  : "bg-white border-slate-200 text-slate-800"
              }`}
              title="Daily Case Streak"
            >
              <span>🔥 {streakDays}d Streak</span>
            </div>

            <button
              onClick={toggleDarkMode}
              className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                darkMode
                  ? "bg-indigo-950 text-amber-300 border-indigo-800 hover:bg-indigo-900"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>{darkMode ? "☀️ Light" : "🌙 Night Shift"}</span>
            </button>

            <AppSwitcher currentApp="neurocase" darkMode={darkMode} />
          </div>
        </header>

        {/* NAVIGATION BAR (Admin Review hidden unless verified as Admin) */}
        <nav
          className={`mb-6 p-1.5 rounded-xl border flex flex-wrap items-center justify-between gap-1.5 ${
            darkMode ? "bg-slate-900/90 border-slate-800" : "bg-white border-slate-200 shadow-xs"
          }`}
        >
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "daily", label: "🔥 Daily Challenge", badge: undefined },
              { id: "archive", label: "📚 Case Archive", badge: `${approvedCases.length}` },
              { id: "exam", label: "⏱️ Exam Mode", badge: undefined },
              { id: "submit", label: "➕ Submit Case", badge: undefined },
              ...(isAdminVerified
                ? [
                    {
                      id: "admin",
                      label: "🛡️ Admin Review",
                      badge: pendingCount > 0 ? `${pendingCount} Pending` : undefined,
                    },
                  ]
                : []),
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    active
                      ? "bg-indigo-600 text-white shadow-sm"
                      : darkMode
                      ? "text-slate-300 hover:bg-slate-800"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                        active
                          ? "bg-white/20 text-white"
                          : darkMode
                          ? "bg-slate-800 text-slate-300"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Subtle Admin Lock / Unlock Button */}
          {isAdminVerified ? (
            <button
              type="button"
              onClick={() => {
                setIsAdminVerified(false);
                localStorage.removeItem("neurocase_admin_verified");
                if (activeTab === "admin") setActiveTab("daily");
              }}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-emerald-500 hover:bg-emerald-500/10 transition-colors"
              title="Sign out of Admin Moderation Mode"
            >
              🔓 Admin Verified
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setAdminPasscodeInput("");
                setAdminAuthError("");
                setShowAdminAuthModal(true);
              }}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                darkMode
                  ? "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                  : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              }`}
              title="Verify Admin access to unlock Case Moderation"
            >
              🔒 Admin
            </button>
          )}
        </nav>

        {loading && (
          <div className="p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800">
            <p className="text-sm font-bold animate-pulse">
              Loading Neurology &amp; Stroke Clinical Cases...
            </p>
          </div>
        )}

        {/* =====================================================================
            TAB 1: DAILY CHALLENGE (NEJM IMAGE CHALLENGE SPLIT-SCREEN ARCHITECTURE)
           ===================================================================== */}
        {!loading && activeTab === "daily" && currentCase && (
          <div className="space-y-6">
            {/* Quick Case Selector Strip */}
            <div
              className={`p-3 rounded-xl border flex items-center justify-between gap-2 overflow-x-auto ${
                darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
              }`}
            >
              <div className="flex items-center gap-1.5 shrink-0">
                {approvedCases.map((c) => {
                  const prog = progressMap[c.id];
                  const isSelected = c.id === currentCase.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setActiveCaseId(c.id);
                        setShowDetailedWorkup(false);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 ${
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-500 shadow-xs"
                          : prog
                          ? prog.isCorrect
                            ? darkMode
                              ? "bg-emerald-950/60 text-emerald-300 border-emerald-800"
                              : "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : darkMode
                            ? "bg-rose-950/60 text-rose-300 border-rose-800"
                            : "bg-rose-50 text-rose-800 border-rose-200"
                          : darkMode
                          ? "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <span>{c.is_daily_challenge ? "⭐ Daily" : c.published_date}</span>
                      {prog && <span>{prog.isCorrect ? "✓" : "✗"}</span>}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setActiveTab("archive")}
                className="text-xs font-bold text-indigo-500 hover:underline shrink-0"
              >
                Browse Archive ({approvedCases.length}) →
              </button>
            </div>

            {/* MAIN NEJM-STYLE CLINICAL & IMAGING CHALLENGE CARD */}
            <article
              className={`rounded-2xl border shadow-sm overflow-hidden ${
                darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
              }`}
            >
              {/* Centered NEJM-Style Challenge Date Header */}
              <div
                className={`px-6 py-5 border-b text-center ${
                  darkMode ? "border-slate-800 bg-slate-900/60" : "border-slate-100 bg-slate-50/50"
                }`}
              >
                <div className="flex flex-wrap items-center justify-center gap-2 mb-1.5">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-rose-600 dark:text-rose-400">
                    CLINICAL &amp; IMAGING CHALLENGE
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                    {currentCase.subspecialty}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      DIFFICULTY_BADGES[currentCase.difficulty]
                    }`}
                  >
                    {currentCase.difficulty}
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight">
                  {formatChallengeDate(currentCase.published_date)}
                </h2>
              </div>

              {/* 2-COLUMN SPLIT VIEW: LEFT = NEUROIMAGING FIGURES | RIGHT = VIGNETTE & MCQ */}
              <div className="p-5 sm:p-7 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
                {/* LEFT COLUMN (7/12): STICKY NEUROIMAGING VIEWER */}
                <div className="lg:col-span-7 lg:sticky lg:top-6">
                  <NeuroImagingViewer
                    imagingList={currentCase.presentation.imaging}
                    isSolved={Boolean(progressMap[currentCase.id]?.isCorrect)}
                    darkMode={darkMode}
                  />
                </div>

                {/* RIGHT COLUMN (5/12): CONCISE CLINICAL VIGNETTE + MULTI-ATTEMPT MCQ + ACTION BUTTONS */}
                <div className="lg:col-span-5 space-y-5">
                  {/* Single Cohesive Clinical Vignette Paragraph (NEJM Style) */}
                  <div className="space-y-3 text-sm sm:text-[15px] leading-relaxed">
                    <p
                      className={
                        darkMode ? "text-slate-200 font-normal" : "text-slate-800 font-normal"
                      }
                    >
                      {currentCase.presentation.history_of_present_illness}{" "}
                      {currentCase.presentation.neuro_exam}{" "}
                      {currentCase.presentation.key_labs_csf}
                    </p>

                    {/* Optional Expandable Vitals & PMH Toggle */}
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowDetailedWorkup((prev) => !prev)}
                        className="text-xs font-bold text-indigo-500 hover:underline flex items-center gap-1"
                      >
                        <span>
                          {showDetailedWorkup
                            ? "− Hide Vital Signs & Past Medical History"
                            : "+ View Vital Signs & Past Medical History"}
                        </span>
                      </button>

                      {showDetailedWorkup && (
                        <div
                          className={`mt-2.5 p-3.5 rounded-xl border text-xs space-y-2.5 ${
                            darkMode
                              ? "bg-slate-800/60 border-slate-700 text-slate-200"
                              : "bg-slate-50 border-slate-200 text-slate-700"
                          }`}
                        >
                          <div>
                            <strong className="font-bold">Demographics: </strong>
                            {currentCase.presentation.demographics}
                          </div>
                          <div>
                            <strong className="font-bold">Past Medical History: </strong>
                            {currentCase.presentation.past_medical_history}
                          </div>
                          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 pt-1 text-center">
                            <div className="p-1.5 rounded bg-slate-900 text-white">
                              <span className="text-[9px] text-slate-400 block">BP</span>
                              <span className="font-bold text-[11px] text-emerald-400">
                                {currentCase.presentation.vitals.bp}
                              </span>
                            </div>
                            <div className="p-1.5 rounded bg-slate-900 text-white">
                              <span className="text-[9px] text-slate-400 block">HR</span>
                              <span className="font-bold text-[11px] text-amber-300">
                                {currentCase.presentation.vitals.hr}
                              </span>
                            </div>
                            <div className="p-1.5 rounded bg-slate-900 text-white">
                              <span className="text-[9px] text-slate-400 block">RR</span>
                              <span className="font-bold text-[11px] text-sky-300">
                                {currentCase.presentation.vitals.rr}
                              </span>
                            </div>
                            <div className="p-1.5 rounded bg-slate-900 text-white">
                              <span className="text-[9px] text-slate-400 block">Temp</span>
                              <span className="font-bold text-[11px]">
                                {currentCase.presentation.vitals.temp}
                              </span>
                            </div>
                            <div className="p-1.5 rounded bg-slate-900 text-white">
                              <span className="text-[9px] text-slate-400 block">SpO2</span>
                              <span className="font-bold text-[11px] text-cyan-300">
                                {currentCase.presentation.vitals.spo2}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Question Prompt */}
                    <p
                      className={`font-bold pt-1 ${
                        darkMode ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {currentCase.challenge.question}
                    </p>
                  </div>

                  {/* NEJM-Style Option List with Multi-Attempt "Try again!" Feedback */}
                  <div className="divide-y divide-slate-200 dark:divide-slate-800 border-t border-b border-slate-200 dark:border-slate-800">
                    {currentCase.challenge.options.map((opt) => {
                      const attempt = progressMap[currentCase.id];
                      const isCaseSolved = Boolean(attempt?.isCorrect);
                      const wrongList = wrongAttemptsMap[currentCase.id] || [];
                      const isWrongAttempt = wrongList.includes(opt.id);
                      const isCorrectOption = opt.id === currentCase.challenge.correct_option;

                      return (
                        <div
                          key={opt.id}
                          onClick={() => {
                            if (!isCaseSolved && !isWrongAttempt) {
                              handleSelectOption(currentCase, opt.id);
                            }
                          }}
                          className={`py-3.5 px-2 transition-colors ${
                            isCaseSolved || isWrongAttempt
                              ? "cursor-default"
                              : "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              {/* Radio / Status Icon */}
                              {isCaseSolved && isCorrectOption ? (
                                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                                  ✓
                                </span>
                              ) : isWrongAttempt ? (
                                <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                                  ✕
                                </span>
                              ) : (
                                <span
                                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                                    darkMode ? "border-slate-600" : "border-slate-300"
                                  }`}
                                />
                              )}

                              <div className="space-y-1">
                                <span
                                  className={`text-sm leading-snug block ${
                                    isCaseSolved && isCorrectOption
                                      ? "font-black text-emerald-600 dark:text-emerald-400"
                                      : isWrongAttempt
                                      ? "font-bold text-rose-600 dark:text-rose-400"
                                      : darkMode
                                      ? "font-medium text-slate-200"
                                      : "font-medium text-slate-700"
                                  }`}
                                >
                                  {opt.text}
                                </span>

                                {/* NEJM "Try again! That is not the correct answer." */}
                                {isWrongAttempt && !isCaseSolved && (
                                  <p className="text-xs text-rose-600 dark:text-rose-400 animate-fadeIn">
                                    <strong className="font-black">Try again!</strong> That is not the correct answer.
                                  </p>
                                )}
                              </div>
                            </div>

                            {isCaseSolved && (
                              <span className="text-xs font-black text-slate-500 dark:text-slate-400 shrink-0">
                                {opt.peer_percentage}%
                              </span>
                            )}
                          </div>

                          {/* Peer Distribution & Option Rationale (Unlocked when solved) */}
                          {isCaseSolved && (
                            <div className="mt-2.5 pl-8 space-y-1.5">
                              <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    isCorrectOption ? "bg-emerald-500" : "bg-slate-400"
                                  }`}
                                  style={{ width: `${opt.peer_percentage}%` }}
                                />
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                <strong
                                  className={`font-black ${
                                    isCorrectOption ? "text-emerald-600 dark:text-emerald-400" : ""
                                  }`}
                                >
                                  {isCorrectOption ? "Correct Answer: " : "Differential Note: "}
                                </strong>
                                {opt.rationale}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* NEJM-STYLE BOTTOM ACTION BAR: NEXT CHALLENGE & TRY AGAIN */}
                  <div className="flex items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleNextChallenge}
                      className={`flex-1 py-2.5 px-4 rounded-lg border text-xs font-black uppercase tracking-wider transition-colors ${
                        darkMode
                          ? "border-slate-700 text-slate-200 hover:bg-slate-800"
                          : "border-slate-300 text-slate-800 hover:bg-slate-100"
                      }`}
                    >
                      NEXT CHALLENGE
                    </button>

                    <button
                      type="button"
                      onClick={() => handleResetCaseAttempt(currentCase.id)}
                      className="py-2.5 px-5 rounded-lg text-xs font-black uppercase tracking-wider bg-sky-800 hover:bg-sky-900 text-white transition-colors flex items-center gap-1.5"
                    >
                      <span>↻</span>
                      <span>TRY AGAIN</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* =================================================
                  UNLOCKED RESOLUTION: FINAL DIAGNOSIS, DISCUSSION, TEACHING POINTS & NEUROPULSE LINKS
                 ================================================= */}
              {progressMap[currentCase.id]?.isCorrect && (
                <div className="p-5 sm:p-7 border-t border-slate-200 dark:border-slate-800 space-y-6 animate-fadeIn">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-black uppercase tracking-wider text-emerald-500">
                      Final Diagnosis, Teaching Points &amp; Clinical Pitfalls
                    </h3>

                    {currentCase.source_journal && (
                      <a
                        href={currentCase.source_journal.doi_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-indigo-500 hover:underline"
                      >
                        Published Source: {currentCase.source_journal.name} (
                        {currentCase.source_journal.pmcid || currentCase.source_journal.pub_year}) ↗
                      </a>
                    )}
                  </div>

                  {/* Final Diagnosis Box */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 text-white border border-emerald-600/50">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block mb-1">
                      FINAL CLINICAL DIAGNOSIS • {currentCase.case_code}
                    </span>
                    <p className="text-base sm:text-lg font-black">
                      {currentCase.resolution.final_diagnosis}
                    </p>
                  </div>

                  {/* Clinical Discussion */}
                  <div className="text-xs sm:text-sm leading-relaxed space-y-2 whitespace-pre-line">
                    <h4 className="font-black uppercase text-xs text-indigo-500">
                      📖 Clinical Discussion:
                    </h4>
                    <p>{currentCase.resolution.clinical_discussion}</p>
                  </div>

                  {/* Teaching Points & Clinical Pitfalls */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div
                      className={`p-4 rounded-xl border ${
                        darkMode
                          ? "bg-emerald-950/30 border-emerald-800/70"
                          : "bg-emerald-50/70 border-emerald-200"
                      }`}
                    >
                      <h4 className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 mb-2">
                        💡 High-Yield Teaching Points
                      </h4>
                      <ul className="space-y-2 text-xs leading-relaxed list-disc pl-4">
                        {currentCase.resolution.teaching_points.map((tp, i) => (
                          <li key={i}>{tp}</li>
                        ))}
                      </ul>
                    </div>

                    <div
                      className={`p-4 rounded-xl border ${
                        darkMode
                          ? "bg-rose-950/30 border-rose-800/70"
                          : "bg-rose-50/70 border-rose-200"
                      }`}
                    >
                      <h4 className="text-xs font-black uppercase text-rose-600 dark:text-rose-400 mb-2">
                        ⚠️ Clinical Pitfalls to Avoid
                      </h4>
                      <ul className="space-y-2 text-xs leading-relaxed list-disc pl-4">
                        {currentCase.resolution.clinical_pitfalls.map((pf, i) => (
                          <li key={i}>{pf}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* CROSS-ECOSYSTEM LINK: RELATED ARTICLES FROM NEUROPULSE */}
                  {relatedPulseArticles.length > 0 && (
                    <div
                      className={`p-4 rounded-xl border ${
                        darkMode ? "bg-slate-800/70 border-slate-700" : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-black uppercase text-indigo-500 flex items-center gap-1.5">
                          <span>🔗 Related Literature on NeuroPulse</span>
                        </span>
                        <Link href="/" className="text-xs font-bold text-indigo-500 hover:underline">
                          Open NeuroPulse →
                        </Link>
                      </div>
                      <div className="space-y-2">
                        {relatedPulseArticles.map((art) => (
                          <a
                            key={art.id}
                            href={art.doi_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`p-3 rounded-lg border block transition-all ${
                              darkMode
                                ? "bg-slate-900 border-slate-700 hover:border-indigo-500"
                                : "bg-white border-slate-200 hover:border-indigo-400"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase"
                                style={{
                                  backgroundColor: art.journal.badge_bg,
                                  color: art.journal.badge_text,
                                }}
                              >
                                {art.journal.short_name}
                              </span>
                              <span className="text-[10px] text-slate-400">{art.pub_date}</span>
                            </div>
                            <p className="text-xs font-bold leading-snug">{art.title}</p>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </article>
          </div>
        )}

        {/* =====================================================================
            TAB 2: CASE ARCHIVE (11 SUBSPECIALTIES)
           ===================================================================== */}
        {!loading && activeTab === "archive" && (
          <div className="space-y-5">
            <div
              className={`p-4 rounded-2xl border space-y-4 ${
                darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
              }`}
            >
              <div className="flex flex-wrap gap-1.5">
                {SUBSPECIALTY_TABS.map((tab) => {
                  const active = selectedSub === tab.value;
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setSelectedSub(tab.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        active
                          ? "bg-indigo-600 text-white shadow-xs"
                          : darkMode
                          ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value)}
                    aria-label="Filter by difficulty"
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                      darkMode
                        ? "bg-slate-800 border-slate-700 text-slate-200"
                        : "bg-slate-50 border-slate-200 text-slate-700"
                    }`}
                  >
                    <option value="All">All Difficulty Levels</option>
                    <option value="Resident">Resident</option>
                    <option value="Fellow">Fellow</option>
                    <option value="Attending">Attending</option>
                  </select>

                  <select
                    value={selectedSolvedFilter}
                    onChange={(e) => setSelectedSolvedFilter(e.target.value as typeof selectedSolvedFilter)}
                    aria-label="Filter by completion status"
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                      darkMode
                        ? "bg-slate-800 border-slate-700 text-slate-200"
                        : "bg-slate-50 border-slate-200 text-slate-700"
                    }`}
                  >
                    <option value="All">All Statuses</option>
                    <option value="Unsolved">Unsolved Only</option>
                    <option value="Solved">Completed</option>
                  </select>
                </div>

                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search symptoms, syndromes, case ID..."
                  className={`px-3 py-1.5 rounded-lg text-xs border w-full sm:w-64 ${
                    darkMode
                      ? "bg-slate-800 border-slate-700 text-white placeholder-slate-400"
                      : "bg-slate-50 border-slate-200 text-slate-900"
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredArchiveCases.map((c) => {
                const prog = progressMap[c.id];
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      setActiveCaseId(c.id);
                      setActiveTab("daily");
                    }}
                    className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                      darkMode
                        ? "bg-slate-900 border-slate-800 hover:border-indigo-500"
                        : "bg-white border-slate-200 hover:border-indigo-500 shadow-xs"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-500">
                            {c.case_code}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800">
                            {c.subspecialty}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                              DIFFICULTY_BADGES[c.difficulty]
                            }`}
                          >
                            {c.difficulty}
                          </span>
                        </div>

                        {prog ? (
                          <span
                            className={`text-xs font-black ${
                              prog.isCorrect ? "text-emerald-500" : "text-rose-500"
                            }`}
                          >
                            {prog.isCorrect ? "✓ Solved" : "✗ Review"}
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-400">Unsolved</span>
                        )}
                      </div>

                      <h3 className="text-sm font-black mb-1.5 leading-snug">{c.title}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {c.presentation.chief_complaint}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-400">{c.presentation.demographics}</span>
                      <span className="font-bold text-indigo-500">Solve Case →</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 3: BOARD EXAM SIMULATION (TIMED MODE)
           ===================================================================== */}
        {!loading && activeTab === "exam" && (
          <div
            className={`p-6 rounded-2xl border ${
              darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
            }`}
          >
            {!examStarted ? (
              <div className="text-center max-w-lg mx-auto py-6 space-y-4">
                <span className="text-4xl">⏱️</span>
                <h2 className="text-xl font-black">Exam Mode</h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Randomly selects clinical vignettes from the case bank with a{" "}
                  <strong>90-second per case</strong> countdown timer. Full score breakdown and rationales are unlocked upon submission.
                </p>
                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => startBoardExam(4)}
                    className="px-5 py-2.5 rounded-xl text-xs font-black bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    🚀 Quick Block: 4 Cases (6 min)
                  </button>
                  <button
                    type="button"
                    onClick={() => startBoardExam(approvedCases.length)}
                    className="px-5 py-2.5 rounded-xl text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    🏆 Full Block: {approvedCases.length} Cases ({Math.round(approvedCases.length * 1.5)} min)
                  </button>
                </div>
              </div>
            ) : examFinished ? (
              <div className="space-y-6">
                <div className="p-5 rounded-xl bg-gradient-to-r from-indigo-950 to-slate-900 text-white flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold uppercase text-indigo-300">BOARD EXAM SCORE REPORT</span>
                    <h3 className="text-2xl font-black mt-1">
                      Score:{" "}
                      {
                        examCaseIds.filter(
                          (id) =>
                            examAnswers[id] ===
                            approvedCases.find((c) => c.id === id)?.challenge.correct_option
                        ).length
                      }{" "}
                      / {examCaseIds.length} Correct
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExamStarted(false)}
                    className="px-4 py-2 rounded-lg text-xs font-black bg-white text-slate-900"
                  >
                    Start New Exam Block ↺
                  </button>
                </div>

                <div className="space-y-3">
                  {examCaseIds.map((id, idx) => {
                    const c = approvedCases.find((item) => item.id === id);
                    if (!c) return null;
                    const userAns = examAnswers[id];
                    const isRight = userAns === c.challenge.correct_option;
                    return (
                      <div
                        key={id}
                        className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
                          isRight
                            ? "border-emerald-500/50 bg-emerald-500/10"
                            : "border-rose-500/50 bg-rose-500/10"
                        }`}
                      >
                        <div>
                          <span className="text-xs font-black mr-2">
                            Question {idx + 1} ({c.subspecialty}):
                          </span>
                          <span className="text-xs sm:text-sm font-bold">{c.title}</span>
                          <p className="text-xs mt-1">
                            Your Answer: <strong>{userAns || "Unanswered"}</strong> | Correct Option:{" "}
                            <strong className="text-emerald-500">{c.challenge.correct_option}</strong> —{" "}
                            {c.resolution.final_diagnosis}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveCaseId(c.id);
                            setActiveTab("daily");
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white"
                        >
                          Review Full Rationale →
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              (() => {
                const examCase = approvedCases.find((c) => c.id === examCaseIds[examCurrentIdx]);
                if (!examCase) return null;
                const mins = Math.floor(examTimeLeftSec / 60);
                const secs = examTimeLeftSec % 60;
                return (
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
                      <span className="text-xs font-black uppercase text-indigo-500">
                        Question {examCurrentIdx + 1} of {examCaseIds.length} • {examCase.subspecialty}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-600 text-white">
                        ⏳ {mins}:{secs < 10 ? `0${secs}` : secs}
                      </span>
                    </div>

                    <h3 className="text-base font-black">{examCase.title}</h3>
                    <p className="text-xs sm:text-sm leading-relaxed">
                      {examCase.presentation.history_of_present_illness}
                    </p>
                    <p className="text-xs sm:text-sm leading-relaxed font-medium text-indigo-500">
                      Neuro Exam: {examCase.presentation.neuro_exam}
                    </p>
                    <p className="text-sm font-bold pt-2">{examCase.challenge.question}</p>

                    <div className="space-y-2.5">
                      {examCase.challenge.options.map((opt) => {
                        const chosen = examAnswers[examCase.id] === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() =>
                              setExamAnswers((prev) => ({ ...prev, [examCase.id]: opt.id }))
                            }
                            className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm font-bold flex items-center gap-3 ${
                              chosen
                                ? "bg-indigo-600 text-white border-indigo-500"
                                : darkMode
                                ? "bg-slate-800 border-slate-700 hover:bg-slate-700"
                                : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            <span className="w-6 h-6 rounded bg-black/20 flex items-center justify-center font-black">
                              {opt.id}
                            </span>
                            <span>{opt.text}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                      <button
                        type="button"
                        disabled={examCurrentIdx === 0}
                        onClick={() => setExamCurrentIdx((i) => Math.max(0, i - 1))}
                        className="px-4 py-2 rounded-lg text-xs font-bold border disabled:opacity-40"
                      >
                        ← Previous
                      </button>

                      {examCurrentIdx < examCaseIds.length - 1 ? (
                        <button
                          type="button"
                          onClick={() => setExamCurrentIdx((i) => i + 1)}
                          className="px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white"
                        >
                          Next Question →
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setExamFinished(true)}
                          className="px-5 py-2 rounded-lg text-xs font-black bg-emerald-600 text-white"
                        >
                          ✓ Submit &amp; Grade Exam
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        )}

        {/* =====================================================================
            TAB 4: USER SUBMISSION (/submit-case) + CLIENT-SIDE DE-IDENTIFICATION
           ===================================================================== */}
        {!loading && activeTab === "submit" && (
          <div
            className={`p-6 rounded-2xl border space-y-6 ${
              darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="text-xs font-black uppercase text-amber-500">
                  COMMUNITY CLINICAL PIPELINE
                </span>
                <h2 className="text-xl font-black mt-0.5">
                  Submit a Clinical Case &amp; De-identify Neuroimaging
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Uploaded CT/MRI images are processed 100% in your browser to strip EXIF metadata and mask patient identifiers before entering the <code>pending</code> moderation queue.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAiExtractor((prev) => !prev)}
                className="px-3.5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm hover:opacity-95 shrink-0"
              >
                {showAiExtractor
                  ? "✕ Close AI Article Importer"
                  : "✨ AI Auto-Extract from Article (NEJM / JAMA / Neurology)"}
              </button>
            </div>

            {/* 1-CLICK AI CASE EXTRACTOR FOR PAYWALLED / TOP JOURNALS (.pdf, .docx, .doc, .txt) */}
            {showAiExtractor && (
              <div
                className={`p-4 rounded-xl border-2 border-indigo-500/40 space-y-3 ${
                  darkMode ? "bg-indigo-950/25" : "bg-indigo-50/50"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-indigo-500">
                      ✨ SEMI-AUTOMATED HIGH-IMPACT JOURNAL IMPORTER
                    </span>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Upload a journal article file (<code>.pdf</code>, <code>.docx</code>, <code>.doc</code>, <code>.txt</code>, <code>.md</code>) or paste the Case Presentation &amp; Discussion from{" "}
                      <strong>NEJM</strong>, <strong>JAMA Neurology</strong>,{" "}
                      <strong>Neurology</strong>, or <strong>The Lancet Neurology</strong> to auto-populate all fields below.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {uploadedDocName && (
                      <span className="px-2 py-1 rounded bg-emerald-500/15 text-emerald-500 text-[11px] font-bold">
                        {isReadingDoc ? "⏳ Reading..." : `✓ ${uploadedDocName}`}
                      </span>
                    )}
                    <label className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-white cursor-pointer hover:bg-slate-700 shrink-0">
                      📄 Upload Article (.pdf, .docx, .doc, .txt)
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt,.md,.xml,.json"
                        onChange={handleArticleTextFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <textarea
                  rows={5}
                  value={aiRawText}
                  onChange={(e) => setAiRawText(e.target.value)}
                  placeholder="Paste full case presentation, MRI findings, discussion, and DOI (or upload a .pdf / .docx / .doc file above)..."
                  className={`w-full p-3 rounded-lg border text-xs leading-relaxed ${
                    darkMode
                      ? "bg-slate-900 border-slate-700 text-slate-100"
                      : "bg-white border-slate-300 text-slate-900"
                  }`}
                />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <input
                    type="password"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder="Optional: Gemini API Key (AIza...) for LLM Board-Style MCQ & PDF parsing"
                    className={`px-3 py-2 rounded-lg border text-xs flex-1 min-w-[240px] ${
                      darkMode
                        ? "bg-slate-900 border-slate-700 text-slate-200"
                        : "bg-white border-slate-300 text-slate-800"
                    }`}
                  />
                  <button
                    type="button"
                    disabled={isExtractingAi || isReadingDoc || (!aiRawText.trim() && !aiPdfBase64)}
                    onClick={handleRunAiExtraction}
                    className="px-4 py-2 rounded-lg text-xs font-black bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {isExtractingAi
                      ? "⏳ Structuring Clinical Case..."
                      : "⚡ Auto-Extract & Populate Form"}
                  </button>
                </div>
              </div>
            )}

            {submitSuccessMsg && (
              <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500 text-emerald-500 text-xs font-bold flex items-center justify-between">
                <span>{submitSuccessMsg}</span>
                {isAdminVerified && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("admin")}
                    className="px-3 py-1 rounded bg-emerald-600 text-white font-black"
                  >
                    Open Admin Review →
                  </button>
                )}
              </div>
            )}

            <form onSubmit={handleUserSubmitCase} className="space-y-4 text-xs sm:text-sm">
              {/* CORE ESSENTIAL FIELDS (ALWAYS VISIBLE) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="font-bold block mb-1">Case Title *</label>
                  <input
                    required
                    value={subTitle}
                    onChange={(e) => setSubTitle(e.target.value)}
                    placeholder="e.g., Acute Isolated Oculomotor Nerve Palsy with Thunderclap Headache in a 52-Year-Old..."
                    className={`w-full p-2.5 rounded-lg border ${
                      darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                    }`}
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Subspecialty</label>
                  <select
                    value={subSpecialty}
                    onChange={(e) => setSubSpecialty(e.target.value)}
                    aria-label="Select subspecialty"
                    className={`w-full p-2.5 rounded-lg border ${
                      darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    {SUBSPECIALTY_TABS.filter((t) => t.value !== "All").map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold block mb-1">Demographics</label>
                  <input
                    value={subDemographics}
                    onChange={(e) => setSubDemographics(e.target.value)}
                    className={`w-full p-2.5 rounded-lg border ${
                      darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                    }`}
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Difficulty</label>
                  <select
                    value={subDifficulty}
                    onChange={(e) => setSubDifficulty(e.target.value as CaseDifficulty)}
                    aria-label="Select difficulty"
                    className={`w-full p-2.5 rounded-lg border ${
                      darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <option value="Resident">Resident</option>
                    <option value="Fellow">Fellow</option>
                    <option value="Attending">Attending</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold block mb-1">Author / Institution</label>
                  <input
                    value={subAuthor}
                    onChange={(e) => setSubAuthor(e.target.value)}
                    placeholder="Dr. John Doe • Stroke Center"
                    className={`w-full p-2.5 rounded-lg border ${
                      darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold block mb-1">History of Present Illness (HPI)</label>
                  <textarea
                    rows={3}
                    value={subHistory}
                    onChange={(e) => setSubHistory(e.target.value)}
                    placeholder="Describe symptom onset, progression, and relevant timeline..."
                    className={`w-full p-2.5 rounded-lg border ${
                      darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                    }`}
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Neurological Examination</label>
                  <textarea
                    rows={3}
                    value={subNeuroExam}
                    onChange={(e) => setSubNeuroExam(e.target.value)}
                    placeholder="GCS, NIHSS, cranial nerves, motor/sensory/cerebellar findings..."
                    className={`w-full p-2.5 rounded-lg border ${
                      darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                    }`}
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Key Labs, CSF &amp; Workup</label>
                  <textarea
                    rows={3}
                    value={subLabsCsf}
                    onChange={(e) => setSubLabsCsf(e.target.value)}
                    placeholder="CSF cell count/protein, autoimmune panel, EEG/EMG, or labs..."
                    className={`w-full p-2.5 rounded-lg border ${
                      darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                    }`}
                  />
                </div>
              </div>

              {/* CLIENT-SIDE PHI DE-IDENTIFICATION & WEBP COMPRESSION STUDIO */}
              <div
                className={`p-4 rounded-xl border ${
                  darkMode ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-black uppercase text-indigo-500">
                    🛡️ Client-Side DICOM/Image De-Identification &amp; WebP Compression (&lt; 150 KB)
                  </span>
                  {subImageSizeKb > 0 && (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[11px] font-black">
                      ✓ EXIF Stripped • WebP Size: {subImageSizeKb} KB
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <input
                    type="file"
                    accept="image/*"
                    aria-label="Upload CT or MRI image for de-identification"
                    onChange={handleImageUploadForDeidentification}
                    className="text-xs"
                  />
                  {subImageWebpUrl && (
                    <>
                      <button
                        type="button"
                        onClick={() => applyPhiBlackoutMask("top")}
                        className="px-2.5 py-1 rounded bg-slate-800 text-white text-xs font-bold hover:bg-slate-700"
                      >
                        ⬛ Mask Top Banner
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPhiBlackoutMask("corners")}
                        className="px-2.5 py-1 rounded bg-slate-800 text-white text-xs font-bold hover:bg-slate-700"
                      >
                        ⬛ Mask 4 DICOM Corners
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPhiBlackoutMask("bottom")}
                        className="px-2.5 py-1 rounded bg-slate-800 text-white text-xs font-bold hover:bg-slate-700"
                      >
                        ⬛ Mask Bottom Banner
                      </button>
                    </>
                  )}
                </div>

                <canvas
                  ref={canvasRef}
                  className={`max-h-52 rounded border border-slate-700 mx-auto ${
                    subImageWebpUrl ? "block" : "hidden"
                  }`}
                />
              </div>

              <div>
                <label className="font-bold block mb-1">Final Clinical Diagnosis</label>
                <input
                  value={subDiagnosis}
                  onChange={(e) => setSubDiagnosis(e.target.value)}
                  placeholder="Definitive diagnosis (e.g., Percheron Artery Bilateral Paramedian Thalamic Infarction)..."
                  className={`w-full p-2.5 rounded-lg border ${
                    darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                  }`}
                />
              </div>

              {/* ===============================================================
                  COLLAPSIBLE OPTIONAL SECTIONS (Matching Full Admin Case Editor)
                 =============================================================== */}
              <div className="space-y-3 pt-1">
                {/* 1. COLLAPSIBLE: MULTIPLE-CHOICE QUESTION, 4 OPTIONS, PEER % & RATIONALES */}
                <div
                  className={`rounded-xl border overflow-hidden ${
                    darkMode ? "border-slate-800 bg-slate-900/50" : "border-slate-200 bg-slate-50/60"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setShowSubMcqSection((prev) => !prev)}
                    className="w-full px-4 py-3 text-left flex items-center justify-between gap-2 text-xs font-black uppercase tracking-wide hover:bg-indigo-500/5 transition-colors"
                  >
                    <span className="text-indigo-500">
                      {showSubMcqSection ? "▼" : "▶"} Optional: Multiple-Choice Question Prompt, 4 Options (A–D), Peer % &amp; Rationales
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {showSubMcqSection ? "Click to collapse" : "Collapsed (Optional)"}
                    </span>
                  </button>

                  {showSubMcqSection && (
                    <div
                      className={`p-4 border-t space-y-3 text-xs ${
                        darkMode ? "border-slate-800" : "border-slate-200"
                      }`}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="sm:col-span-3">
                          <label className="font-bold block mb-1">
                            Multiple-Choice Question Prompt (Optional)
                          </label>
                          <input
                            value={subQuestion}
                            onChange={(e) => setSubQuestion(e.target.value)}
                            placeholder="What is the most likely diagnosis or next best management step?"
                            className={`w-full p-2 rounded border ${
                              darkMode
                                ? "bg-slate-800 border-slate-700"
                                : "bg-white border-slate-300"
                            }`}
                          />
                        </div>
                        <div>
                          <label className="font-bold block mb-1">Correct Option</label>
                          <select
                            value={subCorrect}
                            onChange={(e) =>
                              setSubCorrect(e.target.value as "A" | "B" | "C" | "D")
                            }
                            aria-label="Select correct option"
                            className={`w-full p-2 rounded border font-black ${
                              darkMode
                                ? "bg-slate-800 border-slate-700 text-emerald-400"
                                : "bg-white border-slate-300 text-emerald-700"
                            }`}
                          >
                            <option value="A">Option A</option>
                            <option value="B">Option B</option>
                            <option value="C">Option C</option>
                            <option value="D">Option D</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          {
                            id: "A" as const,
                            val: subOptA,
                            setVal: setSubOptA,
                            rat: subOptARationale,
                            setRat: setSubOptARationale,
                            peer: subPeerA,
                            setPeer: setSubPeerA,
                          },
                          {
                            id: "B" as const,
                            val: subOptB,
                            setVal: setSubOptB,
                            rat: subOptBRationale,
                            setRat: setSubOptBRationale,
                            peer: subPeerB,
                            setPeer: setSubPeerB,
                          },
                          {
                            id: "C" as const,
                            val: subOptC,
                            setVal: setSubOptC,
                            rat: subOptCRationale,
                            setRat: setSubOptCRationale,
                            peer: subPeerC,
                            setPeer: setSubPeerC,
                          },
                          {
                            id: "D" as const,
                            val: subOptD,
                            setVal: setSubOptD,
                            rat: subOptDRationale,
                            setRat: setSubOptDRationale,
                            peer: subPeerD,
                            setPeer: setSubPeerD,
                          },
                        ].map((item) => (
                          <div
                            key={item.id}
                            className={`p-3 rounded-lg border space-y-1.5 ${
                              subCorrect === item.id
                                ? "border-emerald-500/60 bg-emerald-500/5"
                                : darkMode
                                ? "border-slate-800 bg-slate-950"
                                : "border-slate-200 bg-white"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-black">Option {item.id} Text</span>
                              <span className="text-[10px] text-slate-400">
                                Peer %:{" "}
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={item.peer}
                                  onChange={(e) => item.setPeer(Number(e.target.value) || 0)}
                                  className="w-12 px-1 py-0.5 rounded border text-center bg-transparent"
                                />
                              </span>
                            </div>
                            <input
                              value={item.val}
                              onChange={(e) => item.setVal(e.target.value)}
                              placeholder={`Option ${item.id} choice...`}
                              className={`w-full p-1.5 rounded border ${
                                darkMode
                                  ? "bg-slate-900 border-slate-700 text-white"
                                  : "bg-slate-50 border-slate-300"
                              }`}
                            />
                            <textarea
                              rows={2}
                              value={item.rat}
                              onChange={(e) => item.setRat(e.target.value)}
                              placeholder={`Rationale / explanation for Option ${item.id} (Optional)...`}
                              className={`w-full p-1.5 rounded border ${
                                darkMode
                                  ? "bg-slate-900 border-slate-700 text-slate-300"
                                  : "bg-slate-50 border-slate-300"
                              }`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. COLLAPSIBLE: CLINICAL DISCUSSION, HIGH-YIELD TEACHING POINTS & PITFALLS */}
                <div
                  className={`rounded-xl border overflow-hidden ${
                    darkMode ? "border-slate-800 bg-slate-900/50" : "border-slate-200 bg-slate-50/60"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setShowSubResolutionSection((prev) => !prev)}
                    className="w-full px-4 py-3 text-left flex items-center justify-between gap-2 text-xs font-black uppercase tracking-wide hover:bg-indigo-500/5 transition-colors"
                  >
                    <span className="text-indigo-500">
                      {showSubResolutionSection ? "▼" : "▶"} Optional: Clinical Discussion, High-Yield Teaching Points &amp; Pitfalls
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {showSubResolutionSection ? "Click to collapse" : "Collapsed (Optional)"}
                    </span>
                  </button>

                  {showSubResolutionSection && (
                    <div
                      className={`p-4 border-t space-y-3 text-xs ${
                        darkMode ? "border-slate-800" : "border-slate-200"
                      }`}
                    >
                      <div>
                        <label className="font-bold block mb-1">Clinical Discussion</label>
                        <textarea
                          rows={4}
                          value={subDiscussion}
                          onChange={(e) => setSubDiscussion(e.target.value)}
                          placeholder="Pathophysiology, neuroimaging correlation, and evidence-based management..."
                          className={`w-full p-2 rounded border ${
                            darkMode
                              ? "bg-slate-800 border-slate-700 text-white"
                              : "bg-white border-slate-300"
                          }`}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="font-bold block mb-1">
                            High-Yield Teaching Points (one per line)
                          </label>
                          <textarea
                            rows={3}
                            value={subTeachingPoint}
                            onChange={(e) => setSubTeachingPoint(e.target.value)}
                            placeholder="Key board-style clinical takeaways..."
                            className={`w-full p-2 rounded border ${
                              darkMode
                                ? "bg-slate-800 border-slate-700 text-white"
                                : "bg-white border-slate-300"
                            }`}
                          />
                        </div>
                        <div>
                          <label className="font-bold block mb-1">
                            Clinical Pitfalls to Avoid (one per line)
                          </label>
                          <textarea
                            rows={3}
                            value={subPitfall}
                            onChange={(e) => setSubPitfall(e.target.value)}
                            placeholder="Diagnostic or management pitfalls to avoid..."
                            className={`w-full p-2 rounded border ${
                              darkMode
                                ? "bg-slate-800 border-slate-700 text-white"
                                : "bg-white border-slate-300"
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. COLLAPSIBLE: FIGURE CAPTION/MODALITY, PAST MEDICAL HISTORY, VITAL SIGNS & DOI */}
                <div
                  className={`rounded-xl border overflow-hidden ${
                    darkMode ? "border-slate-800 bg-slate-900/50" : "border-slate-200 bg-slate-50/60"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setShowSubMetadataVitalsSection((prev) => !prev)}
                    className="w-full px-4 py-3 text-left flex items-center justify-between gap-2 text-xs font-black uppercase tracking-wide hover:bg-indigo-500/5 transition-colors"
                  >
                    <span className="text-indigo-500">
                      {showSubMetadataVitalsSection ? "▼" : "▶"} Optional: Figure Caption &amp; Modality, Past Medical History, Vital Signs &amp; DOI
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {showSubMetadataVitalsSection ? "Click to collapse" : "Collapsed (Optional)"}
                    </span>
                  </button>

                  {showSubMetadataVitalsSection && (
                    <div
                      className={`p-4 border-t space-y-3 text-xs ${
                        darkMode ? "border-slate-800" : "border-slate-200"
                      }`}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="font-bold block mb-1">Figure Modality</label>
                          <input
                            value={subModality}
                            onChange={(e) => setSubModality(e.target.value)}
                            placeholder="e.g., Brain MRI (DWI / FLAIR)"
                            className={`w-full p-2 rounded border ${
                              darkMode
                                ? "bg-slate-800 border-slate-700 text-white"
                                : "bg-white border-slate-300"
                            }`}
                          />
                        </div>
                        <div>
                          <label className="font-bold block mb-1">
                            Original Figure Caption (Hidden until solved)
                          </label>
                          <input
                            value={subFigCaption}
                            onChange={(e) => setSubFigCaption(e.target.value)}
                            placeholder="Figure 1 legend from manuscript..."
                            className={`w-full p-2 rounded border ${
                              darkMode
                                ? "bg-slate-800 border-slate-700 text-white"
                                : "bg-white border-slate-300"
                            }`}
                          />
                        </div>
                        <div>
                          <label className="font-bold block mb-1">
                            Key Radiological / Electrographic Findings
                          </label>
                          <input
                            value={subFindings}
                            onChange={(e) => setSubFindings(e.target.value)}
                            placeholder="Radiological interpretation summary..."
                            className={`w-full p-2 rounded border ${
                              darkMode
                                ? "bg-slate-800 border-slate-700 text-white"
                                : "bg-white border-slate-300"
                            }`}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="font-bold block mb-1">Past Medical History</label>
                          <input
                            value={subPmh}
                            onChange={(e) => setSubPmh(e.target.value)}
                            placeholder="Hypertension, atrial fibrillation, etc."
                            className={`w-full p-2 rounded border ${
                              darkMode
                                ? "bg-slate-800 border-slate-700 text-white"
                                : "bg-white border-slate-300"
                            }`}
                          />
                        </div>
                        <div>
                          <label className="font-bold block mb-1">Published Date</label>
                          <input
                            type="date"
                            value={subPublishedDate}
                            onChange={(e) => setSubPublishedDate(e.target.value)}
                            className={`w-full p-2 rounded border ${
                              darkMode
                                ? "bg-slate-800 border-slate-700 text-white"
                                : "bg-white border-slate-300"
                            }`}
                          />
                        </div>
                        <div>
                          <label className="font-bold block mb-1">Source DOI / URL</label>
                          <input
                            value={subDoiUrl}
                            onChange={(e) => setSubDoiUrl(e.target.value)}
                            placeholder="https://doi.org/10.1212/..."
                            className={`w-full p-2 rounded border ${
                              darkMode
                                ? "bg-slate-800 border-slate-700 text-white"
                                : "bg-white border-slate-300"
                            }`}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        <div>
                          <label className="font-bold block mb-1">BP</label>
                          <input
                            value={subVitalBp}
                            onChange={(e) => setSubVitalBp(e.target.value)}
                            className={`w-full p-1.5 rounded border ${
                              darkMode
                                ? "bg-slate-800 border-slate-700 text-white"
                                : "bg-white border-slate-300"
                            }`}
                          />
                        </div>
                        <div>
                          <label className="font-bold block mb-1">HR</label>
                          <input
                            value={subVitalHr}
                            onChange={(e) => setSubVitalHr(e.target.value)}
                            className={`w-full p-1.5 rounded border ${
                              darkMode
                                ? "bg-slate-800 border-slate-700 text-white"
                                : "bg-white border-slate-300"
                            }`}
                          />
                        </div>
                        <div>
                          <label className="font-bold block mb-1">RR</label>
                          <input
                            value={subVitalRr}
                            onChange={(e) => setSubVitalRr(e.target.value)}
                            className={`w-full p-1.5 rounded border ${
                              darkMode
                                ? "bg-slate-800 border-slate-700 text-white"
                                : "bg-white border-slate-300"
                            }`}
                          />
                        </div>
                        <div>
                          <label className="font-bold block mb-1">Temp</label>
                          <input
                            value={subVitalTemp}
                            onChange={(e) => setSubVitalTemp(e.target.value)}
                            className={`w-full p-1.5 rounded border ${
                              darkMode
                                ? "bg-slate-800 border-slate-700 text-white"
                                : "bg-white border-slate-300"
                            }`}
                          />
                        </div>
                        <div>
                          <label className="font-bold block mb-1">SpO2</label>
                          <input
                            value={subVitalSpo2}
                            onChange={(e) => setSubVitalSpo2(e.target.value)}
                            className={`w-full p-1.5 rounded border ${
                              darkMode
                                ? "bg-slate-800 border-slate-700 text-white"
                                : "bg-white border-slate-300"
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="px-6 py-3 rounded-xl text-xs font-black uppercase bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
              >
                Submit Case
              </button>
            </form>
          </div>
        )}

        {/* =====================================================================
            TAB 5: ADMIN MODERATION WORKFLOW (Only visible if Admin Verified)
           ===================================================================== */}
        {!loading && activeTab === "admin" && isAdminVerified && (
          <div
            className={`p-6 rounded-2xl border space-y-5 ${
              darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs font-black uppercase text-sky-500">
                  MODERATION &amp; CURATION WORKFLOW
                </span>
                <h2 className="text-xl font-black">Admin Case Moderation &amp; Full Editor</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("submit");
                    setShowAiExtractor(true);
                  }}
                  className="px-3.5 py-2 rounded-lg text-xs font-black bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  ✨ AI Import from Article (NEJM / JAMA / Neurology)
                </button>
              </div>
            </div>

            {/* Grouped Status Sub-Tabs (Pending vs Approved vs Rejected) */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              {[
                {
                  id: "pending" as const,
                  label: "⏳ Pending Review",
                  count: pendingCount,
                  activeClass: "bg-amber-500 text-slate-950",
                },
                {
                  id: "approved" as const,
                  label: "✅ Approved & Published",
                  count: approvedCases.length,
                  activeClass: "bg-emerald-600 text-white",
                },
                {
                  id: "rejected" as const,
                  label: "🚫 Rejected",
                  count: rejectedCount,
                  activeClass: "bg-rose-600 text-white",
                },
              ].map((group) => {
                const isSelected = adminStatusFilter === group.id;
                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => {
                      setAdminStatusFilter(group.id);
                      setEditingCaseId(null);
                      setEditDraft(null);
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                      isSelected
                        ? group.activeClass
                        : darkMode
                        ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <span>{group.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                        isSelected
                          ? "bg-black/20 text-current"
                          : darkMode
                          ? "bg-slate-700 text-slate-300"
                          : "bg-white text-slate-600"
                      }`}
                    >
                      {group.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Filtered Case List by Status Group */}
            <div className="space-y-3">
              {(() => {
                const groupCases = cases.filter((c) => {
                  const st: CaseStatus = c.status || "approved";
                  if (adminStatusFilter === "pending") {
                    return st === "pending" || st === "needs_revision";
                  }
                  return st === adminStatusFilter;
                });

                if (groupCases.length === 0) {
                  return (
                    <div
                      className={`p-8 rounded-xl border border-dashed text-center space-y-2 ${
                        darkMode
                          ? "border-slate-800 text-slate-400"
                          : "border-slate-200 text-slate-500"
                      }`}
                    >
                      <p className="text-sm font-bold">
                        {adminStatusFilter === "pending"
                          ? "🎉 No cases waiting in the Pending Review queue."
                          : adminStatusFilter === "approved"
                          ? "No approved cases found."
                          : "No rejected cases."}
                      </p>
                      {adminStatusFilter === "pending" && (
                        <button
                          type="button"
                          onClick={() => setAdminStatusFilter("approved")}
                          className="text-xs font-bold text-indigo-500 hover:underline"
                        >
                          View {approvedCases.length} Approved &amp; Published Cases →
                        </button>
                      )}
                    </div>
                  );
                }

                return groupCases.map((c) => {
                  const st: CaseStatus = c.status || "approved";
                  const isEditing = editingCaseId === c.id && editDraft !== null;
                  return (
                    <div
                      key={c.id}
                      className={`p-4 rounded-xl border transition-all ${
                        st === "pending"
                          ? "border-amber-500/70 bg-amber-500/5"
                          : st === "rejected"
                          ? "border-rose-500/40 opacity-75"
                          : darkMode
                          ? "border-slate-800 bg-slate-800/40"
                          : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              st === "approved"
                                ? "bg-emerald-600 text-white"
                                : st === "pending"
                                ? "bg-amber-400 text-slate-950"
                                : st === "needs_revision"
                                ? "bg-orange-500 text-white"
                                : "bg-rose-600 text-white"
                            }`}
                          >
                            {st}
                          </span>
                          <span className="text-xs font-black">{c.case_code}</span>
                          <span className="text-xs text-slate-400 font-semibold">
                            {c.published_date}
                          </span>
                          <span className="text-xs text-indigo-500 font-bold">
                            {c.subspecialty}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              DIFFICULTY_BADGES[c.difficulty]
                            }`}
                          >
                            {c.difficulty}
                          </span>
                          {c.is_daily_challenge && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-600 text-white">
                              ⭐ Active Daily Challenge
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {st !== "approved" && (
                            <button
                              type="button"
                              onClick={() => handleAdminUpdateStatus(c.id, "approved", false)}
                              className="px-2.5 py-1 rounded text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                              ✓ Approve &amp; Publish
                            </button>
                          )}
                          {!c.is_daily_challenge && (
                            <button
                              type="button"
                              onClick={() => handleAdminUpdateStatus(c.id, "approved", true)}
                              className="px-2.5 py-1 rounded text-[11px] font-bold bg-indigo-600 text-white hover:bg-indigo-700"
                            >
                              🔥 Set as Daily Challenge
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              if (isEditing) {
                                setEditingCaseId(null);
                                setEditDraft(null);
                              } else {
                                handleStartFullEdit(c);
                              }
                            }}
                            className="px-2.5 py-1 rounded text-[11px] font-bold bg-slate-700 text-white hover:bg-slate-600"
                          >
                            {isEditing ? "✕ Close Editor" : "✏️ Edit Case"}
                          </button>
                          {st === "approved" && (
                            <button
                              type="button"
                              onClick={() => handleAdminUpdateStatus(c.id, "pending", false)}
                              className="px-2.5 py-1 rounded text-[11px] font-bold bg-amber-500/20 text-amber-500 hover:bg-amber-500/30"
                            >
                              ↩ Move to Pending
                            </button>
                          )}
                          {st !== "rejected" && (
                            <button
                              type="button"
                              onClick={() => handleAdminUpdateStatus(c.id, "rejected", false)}
                              className="px-2.5 py-1 rounded text-[11px] font-bold bg-rose-600/80 text-white hover:bg-rose-600"
                            >
                              ✗ Reject
                            </button>
                          )}
                        </div>
                      </div>

                      {isEditing && editDraft ? (
                        <div
                          className={`mt-4 pt-4 border-t space-y-4 text-xs ${
                            darkMode ? "border-slate-700" : "border-slate-200"
                          }`}
                        >
                          {/* 1. Metadata & Classification */}
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <div className="sm:col-span-2">
                              <label className="font-bold block mb-1">Case Title</label>
                              <input
                                value={editDraft.title}
                                onChange={(e) =>
                                  setEditDraft({ ...editDraft, title: e.target.value })
                                }
                                className={`w-full p-2 rounded border ${
                                  darkMode
                                    ? "bg-slate-900 border-slate-700 text-white"
                                    : "bg-white border-slate-300 text-slate-900"
                                }`}
                              />
                            </div>
                            <div>
                              <label className="font-bold block mb-1">Subspecialty</label>
                              <select
                                value={editDraft.subspecialty}
                                aria-label="Edit subspecialty"
                                onChange={(e) =>
                                  setEditDraft({
                                    ...editDraft,
                                    subspecialty: e.target.value,
                                    subspecialties: [e.target.value],
                                  })
                                }
                                className={`w-full p-2 rounded border ${
                                  darkMode
                                    ? "bg-slate-900 border-slate-700 text-white"
                                    : "bg-white border-slate-300 text-slate-900"
                                }`}
                              >
                                {SUBSPECIALTY_TABS.filter((t) => t.value !== "All").map((t) => (
                                  <option key={t.value} value={t.value}>
                                    {t.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="font-bold block mb-1">Difficulty</label>
                                <select
                                  value={editDraft.difficulty}
                                  aria-label="Edit difficulty"
                                  onChange={(e) =>
                                    setEditDraft({
                                      ...editDraft,
                                      difficulty: e.target.value as CaseDifficulty,
                                    })
                                  }
                                  className={`w-full p-2 rounded border ${
                                    darkMode
                                      ? "bg-slate-900 border-slate-700 text-white"
                                      : "bg-white border-slate-300 text-slate-900"
                                  }`}
                                >
                                  <option value="Resident">Resident</option>
                                  <option value="Fellow">Fellow</option>
                                  <option value="Attending">Attending</option>
                                </select>
                              </div>
                              <div>
                                <label className="font-bold block mb-1">Published Date</label>
                                <input
                                  type="date"
                                  value={editDraft.published_date}
                                  onChange={(e) =>
                                    setEditDraft({
                                      ...editDraft,
                                      published_date: e.target.value,
                                    })
                                  }
                                  className={`w-full p-2 rounded border ${
                                    darkMode
                                      ? "bg-slate-900 border-slate-700 text-white"
                                      : "bg-white border-slate-300 text-slate-900"
                                  }`}
                                />
                              </div>
                            </div>
                          </div>

                          {/* 2. Clinical Presentation (Demographics, HPI, Exam, Workup) */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="font-bold block mb-1">Patient Demographics</label>
                              <input
                                value={editDraft.presentation.demographics}
                                onChange={(e) =>
                                  setEditDraft({
                                    ...editDraft,
                                    presentation: {
                                      ...editDraft.presentation,
                                      demographics: e.target.value,
                                    },
                                  })
                                }
                                className={`w-full p-2 rounded border ${
                                  darkMode
                                    ? "bg-slate-900 border-slate-700 text-white"
                                    : "bg-white border-slate-300 text-slate-900"
                                }`}
                              />
                            </div>
                            <div>
                              <label className="font-bold block mb-1">Past Medical History</label>
                              <input
                                value={editDraft.presentation.past_medical_history}
                                onChange={(e) =>
                                  setEditDraft({
                                    ...editDraft,
                                    presentation: {
                                      ...editDraft.presentation,
                                      past_medical_history: e.target.value,
                                    },
                                  })
                                }
                                className={`w-full p-2 rounded border ${
                                  darkMode
                                    ? "bg-slate-900 border-slate-700 text-white"
                                    : "bg-white border-slate-300 text-slate-900"
                                }`}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="font-bold block mb-1">
                                History of Present Illness (HPI)
                              </label>
                              <textarea
                                rows={4}
                                value={editDraft.presentation.history_of_present_illness}
                                onChange={(e) =>
                                  setEditDraft({
                                    ...editDraft,
                                    presentation: {
                                      ...editDraft.presentation,
                                      history_of_present_illness: e.target.value,
                                    },
                                  })
                                }
                                className={`w-full p-2 rounded border ${
                                  darkMode
                                    ? "bg-slate-900 border-slate-700 text-white"
                                    : "bg-white border-slate-300 text-slate-900"
                                }`}
                              />
                            </div>
                            <div>
                              <label className="font-bold block mb-1">
                                Neurological Examination
                              </label>
                              <textarea
                                rows={4}
                                value={editDraft.presentation.neuro_exam}
                                onChange={(e) =>
                                  setEditDraft({
                                    ...editDraft,
                                    presentation: {
                                      ...editDraft.presentation,
                                      neuro_exam: e.target.value,
                                    },
                                  })
                                }
                                className={`w-full p-2 rounded border ${
                                  darkMode
                                    ? "bg-slate-900 border-slate-700 text-white"
                                    : "bg-white border-slate-300 text-slate-900"
                                }`}
                              />
                            </div>
                            <div>
                              <label className="font-bold block mb-1">
                                Key Labs, CSF &amp; Workup
                              </label>
                              <textarea
                                rows={4}
                                value={editDraft.presentation.key_labs_csf}
                                onChange={(e) =>
                                  setEditDraft({
                                    ...editDraft,
                                    presentation: {
                                      ...editDraft.presentation,
                                      key_labs_csf: e.target.value,
                                    },
                                  })
                                }
                                className={`w-full p-2 rounded border ${
                                  darkMode
                                    ? "bg-slate-900 border-slate-700 text-white"
                                    : "bg-white border-slate-300 text-slate-900"
                                }`}
                              />
                            </div>
                          </div>

                          {/* 3. Figures Editor */}
                          <div className="space-y-2">
                            <label className="font-black uppercase text-indigo-500 block">
                              Clinical Figures ({editDraft.presentation.imaging.length})
                            </label>
                            {editDraft.presentation.imaging.map((fig, fIdx) => (
                              <div
                                key={fIdx}
                                className={`p-3 rounded-lg border grid grid-cols-1 sm:grid-cols-3 gap-2 ${
                                  darkMode
                                    ? "bg-slate-950 border-slate-800"
                                    : "bg-white border-slate-200"
                                }`}
                              >
                                <div>
                                  <span className="text-[10px] font-bold text-slate-400 block">
                                    Figure {fIdx + 1} Modality &amp; Image Path/URL
                                  </span>
                                  <input
                                    value={fig.modality}
                                    onChange={(e) => {
                                      const nextImgs = [...editDraft.presentation.imaging];
                                      nextImgs[fIdx] = { ...fig, modality: e.target.value };
                                      setEditDraft({
                                        ...editDraft,
                                        presentation: {
                                          ...editDraft.presentation,
                                          imaging: nextImgs,
                                        },
                                      });
                                    }}
                                    placeholder="Modality"
                                    className={`w-full p-1.5 rounded border mt-1 ${
                                      darkMode
                                        ? "bg-slate-900 border-slate-700 text-white"
                                        : "bg-slate-50 border-slate-300"
                                    }`}
                                  />
                                  <input
                                    value={fig.image_url}
                                    onChange={(e) => {
                                      const nextImgs = [...editDraft.presentation.imaging];
                                      nextImgs[fIdx] = { ...fig, image_url: e.target.value };
                                      setEditDraft({
                                        ...editDraft,
                                        presentation: {
                                          ...editDraft.presentation,
                                          imaging: nextImgs,
                                        },
                                      });
                                    }}
                                    placeholder="Image URL"
                                    className={`w-full p-1.5 rounded border mt-1 ${
                                      darkMode
                                        ? "bg-slate-900 border-slate-700 text-white"
                                        : "bg-slate-50 border-slate-300"
                                    }`}
                                  />
                                </div>
                                <div>
                                  <span className="text-[10px] font-bold text-slate-400 block">
                                    Original Published Caption
                                  </span>
                                  <textarea
                                    rows={3}
                                    value={fig.caption}
                                    onChange={(e) => {
                                      const nextImgs = [...editDraft.presentation.imaging];
                                      nextImgs[fIdx] = { ...fig, caption: e.target.value };
                                      setEditDraft({
                                        ...editDraft,
                                        presentation: {
                                          ...editDraft.presentation,
                                          imaging: nextImgs,
                                        },
                                      });
                                    }}
                                    className={`w-full p-1.5 rounded border mt-1 ${
                                      darkMode
                                        ? "bg-slate-900 border-slate-700 text-white"
                                        : "bg-slate-50 border-slate-300"
                                    }`}
                                  />
                                </div>
                                <div>
                                  <span className="text-[10px] font-bold text-slate-400 block">
                                    Key Radiological / Electrographic Interpretation
                                  </span>
                                  <textarea
                                    rows={3}
                                    value={fig.findings_summary}
                                    onChange={(e) => {
                                      const nextImgs = [...editDraft.presentation.imaging];
                                      nextImgs[fIdx] = {
                                        ...fig,
                                        findings_summary: e.target.value,
                                      };
                                      setEditDraft({
                                        ...editDraft,
                                        presentation: {
                                          ...editDraft.presentation,
                                          imaging: nextImgs,
                                        },
                                      });
                                    }}
                                    className={`w-full p-1.5 rounded border mt-1 ${
                                      darkMode
                                        ? "bg-slate-900 border-slate-700 text-white"
                                        : "bg-slate-50 border-slate-300"
                                    }`}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* 4. Question Prompt, Correct Option & All 4 Options (A, B, C, D) */}
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <div className="sm:col-span-3">
                              <label className="font-bold block mb-1">
                                Multiple-Choice Question Prompt
                              </label>
                              <input
                                value={editDraft.challenge.question}
                                onChange={(e) =>
                                  setEditDraft({
                                    ...editDraft,
                                    challenge: {
                                      ...editDraft.challenge,
                                      question: e.target.value,
                                    },
                                  })
                                }
                                className={`w-full p-2 rounded border ${
                                  darkMode
                                    ? "bg-slate-900 border-slate-700 text-white"
                                    : "bg-white border-slate-300 text-slate-900"
                                }`}
                              />
                            </div>
                            <div>
                              <label className="font-bold block mb-1">Correct Option</label>
                              <select
                                value={editDraft.challenge.correct_option}
                                aria-label="Edit correct option"
                                onChange={(e) =>
                                  setEditDraft({
                                    ...editDraft,
                                    challenge: {
                                      ...editDraft.challenge,
                                      correct_option: e.target.value as "A" | "B" | "C" | "D",
                                    },
                                  })
                                }
                                className={`w-full p-2 rounded border font-black ${
                                  darkMode
                                    ? "bg-slate-900 border-slate-700 text-emerald-400"
                                    : "bg-white border-slate-300 text-emerald-700"
                                }`}
                              >
                                <option value="A">Option A</option>
                                <option value="B">Option B</option>
                                <option value="C">Option C</option>
                                <option value="D">Option D</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {editDraft.challenge.options.map((opt, oIdx) => (
                              <div
                                key={opt.id}
                                className={`p-3 rounded-lg border space-y-1.5 ${
                                  editDraft.challenge.correct_option === opt.id
                                    ? "border-emerald-500/60 bg-emerald-500/5"
                                    : darkMode
                                    ? "border-slate-800 bg-slate-950"
                                    : "border-slate-200 bg-white"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-black">Option {opt.id} Text</span>
                                  <span className="text-[10px] text-slate-400">
                                    Peer %:{" "}
                                    <input
                                      type="number"
                                      min={0}
                                      max={100}
                                      value={opt.peer_percentage}
                                      onChange={(e) => {
                                        const nextOpts = [...editDraft.challenge.options];
                                        nextOpts[oIdx] = {
                                          ...opt,
                                          peer_percentage: Number(e.target.value) || 0,
                                        };
                                        setEditDraft({
                                          ...editDraft,
                                          challenge: {
                                            ...editDraft.challenge,
                                            options: nextOpts,
                                          },
                                        });
                                      }}
                                      className="w-12 px-1 py-0.5 rounded border text-center bg-transparent"
                                    />
                                  </span>
                                </div>
                                <input
                                  value={opt.text}
                                  onChange={(e) => {
                                    const nextOpts = [...editDraft.challenge.options];
                                    nextOpts[oIdx] = { ...opt, text: e.target.value };
                                    setEditDraft({
                                      ...editDraft,
                                      challenge: { ...editDraft.challenge, options: nextOpts },
                                    });
                                  }}
                                  className={`w-full p-1.5 rounded border ${
                                    darkMode
                                      ? "bg-slate-900 border-slate-700 text-white"
                                      : "bg-slate-50 border-slate-300"
                                  }`}
                                />
                                <textarea
                                  rows={2}
                                  value={opt.rationale}
                                  onChange={(e) => {
                                    const nextOpts = [...editDraft.challenge.options];
                                    nextOpts[oIdx] = { ...opt, rationale: e.target.value };
                                    setEditDraft({
                                      ...editDraft,
                                      challenge: { ...editDraft.challenge, options: nextOpts },
                                    });
                                  }}
                                  placeholder={`Rationale for Option ${opt.id}...`}
                                  className={`w-full p-1.5 rounded border ${
                                    darkMode
                                      ? "bg-slate-900 border-slate-700 text-slate-300"
                                      : "bg-slate-50 border-slate-300"
                                  }`}
                                />
                              </div>
                            ))}
                          </div>

                          {/* 5. Final Diagnosis, Clinical Discussion, Teaching Points & Pitfalls */}
                          <div>
                            <label className="font-bold block mb-1">Final Clinical Diagnosis</label>
                            <input
                              value={editDraft.resolution.final_diagnosis}
                              onChange={(e) =>
                                setEditDraft({
                                  ...editDraft,
                                  resolution: {
                                    ...editDraft.resolution,
                                    final_diagnosis: e.target.value,
                                  },
                                })
                              }
                              className={`w-full p-2 rounded border font-bold ${
                                darkMode
                                  ? "bg-slate-900 border-slate-700 text-emerald-400"
                                  : "bg-white border-slate-300 text-emerald-700"
                              }`}
                            />
                          </div>

                          <div>
                            <label className="font-bold block mb-1">Clinical Discussion</label>
                            <textarea
                              rows={4}
                              value={editDraft.resolution.clinical_discussion}
                              onChange={(e) =>
                                setEditDraft({
                                  ...editDraft,
                                  resolution: {
                                    ...editDraft.resolution,
                                    clinical_discussion: e.target.value,
                                  },
                                })
                              }
                              className={`w-full p-2 rounded border ${
                                darkMode
                                  ? "bg-slate-900 border-slate-700 text-white"
                                  : "bg-white border-slate-300 text-slate-900"
                              }`}
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="font-bold block mb-1">
                                High-Yield Teaching Points (one per line)
                              </label>
                              <textarea
                                rows={3}
                                value={editDraft.resolution.teaching_points.join("\n")}
                                onChange={(e) =>
                                  setEditDraft({
                                    ...editDraft,
                                    resolution: {
                                      ...editDraft.resolution,
                                      teaching_points: e.target.value
                                        .split("\n")
                                        .map((s) => s.trim())
                                        .filter(Boolean),
                                    },
                                  })
                                }
                                className={`w-full p-2 rounded border ${
                                  darkMode
                                    ? "bg-slate-900 border-slate-700 text-white"
                                    : "bg-white border-slate-300 text-slate-900"
                                }`}
                              />
                            </div>
                            <div>
                              <label className="font-bold block mb-1">
                                Clinical Pitfalls to Avoid (one per line)
                              </label>
                              <textarea
                                rows={3}
                                value={editDraft.resolution.clinical_pitfalls.join("\n")}
                                onChange={(e) =>
                                  setEditDraft({
                                    ...editDraft,
                                    resolution: {
                                      ...editDraft.resolution,
                                      clinical_pitfalls: e.target.value
                                        .split("\n")
                                        .map((s) => s.trim())
                                        .filter(Boolean),
                                    },
                                  })
                                }
                                className={`w-full p-2 rounded border ${
                                  darkMode
                                    ? "bg-slate-900 border-slate-700 text-white"
                                    : "bg-white border-slate-300 text-slate-900"
                                }`}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCaseId(null);
                                setEditDraft(null);
                              }}
                              className="px-4 py-2 rounded-lg text-xs font-bold bg-slate-600 text-white hover:bg-slate-500"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveAdminEdit(c.id)}
                              className="px-5 py-2 rounded-lg text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                            >
                              💾 Save All Case Changes
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm font-bold">{c.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Prompt: {c.challenge.question}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* ADMIN VERIFICATION MODAL */}
        {showAdminAuthModal && (
          <div
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setShowAdminAuthModal(false)}
          >
            <div
              className={`max-w-sm w-full rounded-2xl border p-6 shadow-2xl space-y-4 ${
                darkMode
                  ? "bg-slate-900 border-slate-700 text-slate-100"
                  : "bg-white border-slate-200 text-slate-900"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-500">
                  🛡️ ADMIN AUTHENTICATION
                </span>
                <button
                  type="button"
                  onClick={() => setShowAdminAuthModal(false)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-200"
                >
                  ✕
                </button>
              </div>

              <h3 className="text-base font-black">Verify Admin Access</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Enter the administrator passcode to unlock the Case Moderation Queue (<code>Admin Review</code>).
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (adminPasscodeInput.trim() === "@neuro2026") {
                    setIsAdminVerified(true);
                    localStorage.setItem("neurocase_admin_verified", "true");
                    setShowAdminAuthModal(false);
                    setActiveTab("admin");
                  } else {
                    setAdminAuthError("Invalid administrator passcode.");
                  }
                }}
                className="space-y-3"
              >
                <input
                  type="password"
                  value={adminPasscodeInput}
                  onChange={(e) => {
                    setAdminPasscodeInput(e.target.value);
                    setAdminAuthError("");
                  }}
                  placeholder="Enter admin passcode"
                  autoFocus
                  className={`w-full px-3.5 py-2.5 rounded-lg border text-xs font-bold ${
                    darkMode
                      ? "bg-slate-800 border-slate-700 text-white"
                      : "bg-slate-50 border-slate-300 text-slate-900"
                  }`}
                />
                {adminAuthError && (
                  <p className="text-xs font-bold text-rose-500">{adminAuthError}</p>
                )}
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAdminAuthModal(false)}
                    className="px-3.5 py-2 rounded-lg text-xs font-bold border border-slate-600/40"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg text-xs font-black bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    Unlock Admin Review
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
