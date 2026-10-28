"use client";

import React, { useState, useRef } from "react";
import { ClinicalCase, CaseDifficulty } from "@/types/clinicalCase";
import {
  extractClinicalCaseFromArticleText,
  extractTextFromUploadedDocument,
} from "@/utils/aiCaseExtractor";

interface SubmitTabProps {
  darkMode: boolean;
  approvedCases: ClinicalCase[];
  subspecialtyTabs: { label: string; value: string }[];
  isAdminVerified?: boolean;
  onOpenAdminReview?: () => void;
  onCaseSubmitted: (newCase: ClinicalCase) => Promise<boolean | void>;
  getLocalTodayIso: () => string;
}

export function SubmitTab({
  darkMode,
  approvedCases,
  subspecialtyTabs,
  isAdminVerified,
  onOpenAdminReview,
  onCaseSubmitted,
  getLocalTodayIso,
}: SubmitTabProps) {
  // Form State
  const [subTitle, setSubTitle] = useState("");
  const [subSpecialty, setSubSpecialty] = useState("Stroke");
  const [subDifficulty, setSubDifficulty] = useState<CaseDifficulty>("Resident");
  const [subPublishedDate, setSubPublishedDate] = useState("");
  const [subDemographics, setSubDemographics] = useState("");
  const [subPmh, setSubPmh] = useState("");
  const [subChiefComplaint, setSubChiefComplaint] = useState("");
  const [subHistory, setSubHistory] = useState("");
  const [subNeuroExam, setSubNeuroExam] = useState("");
  const [subLabsCsf, setSubLabsCsf] = useState("");
  const [subModality, setSubModality] = useState("");
  const [subFigCaption, setSubFigCaption] = useState("");
  const [subFindings, setSubFindings] = useState("");
  const [subVitalBp, setSubVitalBp] = useState("");
  const [subVitalHr, setSubVitalHr] = useState("");
  const [subVitalRr, setSubVitalRr] = useState("");
  const [subVitalTemp, setSubVitalTemp] = useState("");
  const [subVitalSpo2, setSubVitalSpo2] = useState("");
  const [subQuestion, setSubQuestion] = useState("");
  const [subOptA, setSubOptA] = useState("");
  const [subOptB, setSubOptB] = useState("");
  const [subOptC, setSubOptC] = useState("");
  const [subOptD, setSubOptD] = useState("");
  const [subOptARationale, setSubOptARationale] = useState("");
  const [subOptBRationale, setSubOptBRationale] = useState("");
  const [subOptCRationale, setSubOptCRationale] = useState("");
  const [subOptDRationale, setSubOptDRationale] = useState("");
  const [subPeerA, setSubPeerA] = useState<number>(0);
  const [subPeerB, setSubPeerB] = useState<number>(0);
  const [subPeerC, setSubPeerC] = useState<number>(0);
  const [subPeerD, setSubPeerD] = useState<number>(0);
  const [subCorrect, setSubCorrect] = useState<"A" | "B" | "C" | "D">("A");
  const [subDiagnosis, setSubDiagnosis] = useState("");
  const [subDiscussion, setSubDiscussion] = useState("");
  const [subTeachingPoint, setSubTeachingPoint] = useState("");
  const [subPitfall, setSubPitfall] = useState("");
  const [subAuthor, setSubAuthor] = useState("");
  const [subJournalName, setSubJournalName] = useState("");
  const [subDoiUrl, setSubDoiUrl] = useState("");
  const [subImageWebpUrl, setSubImageWebpUrl] = useState<string>("");
  const [subImageSizeKb, setSubImageSizeKb] = useState<number>(0);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const docFileInputRef = useRef<HTMLInputElement | null>(null);
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);

  const [showSubMcqSection, setShowSubMcqSection] = useState(false);
  const [showSubResolutionSection, setShowSubResolutionSection] = useState(false);
  const [showSubMetadataVitalsSection, setShowSubMetadataVitalsSection] = useState(false);

  const [aiExtractedImages, setAiExtractedImages] = useState<string[]>([]);
  const [showAiExtractor, setShowAiExtractor] = useState(false);
  const [aiRawText, setAiRawText] = useState("");
  const [aiPdfBase64, setAiPdfBase64] = useState<string | undefined>(undefined);
  const [uploadedDocName, setUploadedDocName] = useState("");
  const [isReadingDoc, setIsReadingDoc] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("neurocase_gemini_api_key") || "" : ""
  );
  const [isExtractingAi, setIsExtractingAi] = useState(false);

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
          "[Uploaded PDF Document: " + file.name + "] — Click Auto-Extract to parse with Gemini AI."
        );
      }
      setAiPdfBase64(res.pdfBase64);

      if (res.extractedImages && res.extractedImages.length > 0) {
        setAiExtractedImages(res.extractedImages);
        const primaryImage = res.extractedImages[0];
        setSubImageWebpUrl(primaryImage);

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
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            exportCanvasToCompressedWebp();
          }
        };
        img.src = primaryImage;
      }
    } catch (err) {
      console.error("Failed to read uploaded article document:", err);
    } finally {
      setIsReadingDoc(false);
    }
  };

  const resetAiImporterInputs = () => {
    setAiRawText("");
    setAiPdfBase64(undefined);
    setUploadedDocName("");
    if (docFileInputRef.current) {
      docFileInputRef.current.value = "";
    }
  };

  const resetAllSubmitFormFields = () => {
    setSubTitle("");
    setSubSpecialty("Stroke");
    setSubDifficulty("Resident");
    setSubPublishedDate("");
    setSubDemographics("");
    setSubAuthor("");
    setSubJournalName("");
    setSubDoiUrl("");
    setSubPmh("");
    setSubChiefComplaint("");
    setSubHistory("");
    setSubNeuroExam("");
    setSubLabsCsf("");
    setSubModality("");
    setSubFigCaption("");
    setSubFindings("");
    setSubVitalBp("");
    setSubVitalHr("");
    setSubVitalRr("");
    setSubVitalTemp("");
    setSubVitalSpo2("");
    setSubQuestion("");
    setSubOptA("");
    setSubOptB("");
    setSubOptC("");
    setSubOptD("");
    setSubOptARationale("");
    setSubOptBRationale("");
    setSubOptCRationale("");
    setSubOptDRationale("");
    setSubPeerA(64);
    setSubPeerB(16);
    setSubPeerC(12);
    setSubPeerD(8);
    setSubCorrect("A");
    setSubDiagnosis("");
    setSubDiscussion("");
    setSubTeachingPoint("");
    setSubPitfall("");
    setSubImageWebpUrl("");
    setSubImageSizeKb(0);
    setAiExtractedImages([]);
    if (imageFileInputRef.current) {
      imageFileInputRef.current.value = "";
    }
    setShowSubMcqSection(false);
    setShowSubResolutionSection(false);
    setShowSubMetadataVitalsSection(false);
    resetAiImporterInputs();
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
      setSubDoiUrl(extracted.doi_url || "");
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

      resetAiImporterInputs();
      setSubmitSuccessMsg(
        "✨ Successfully structured clinical case from " +
          extracted.journal_short +
          "! Review the populated fields below and click Submit Case."
      );
    } finally {
      setIsExtractingAi(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subTitle.trim()) return;
    setIsSubmitting(true);

    const parsedTeachingPoints = subTeachingPoint
      .split(/\n|•/)
      .map((s) => s.trim())
      .filter(Boolean);
    const parsedPitfalls = subPitfall
      .split(/\n|•/)
      .map((s) => s.trim())
      .filter(Boolean);

    const newCase: ClinicalCase = {
      id: "nc-user-" + Date.now(),
      case_code: "NC-USER-" + Math.floor(100 + Math.random() * 900),
      title: subTitle.trim(),
      subspecialty: subSpecialty,
      subspecialties: [subSpecialty],
      difficulty: subDifficulty,
      estimated_time_sec: 90,
      is_daily_challenge: false,
      archive_only: true,
      published_date: subPublishedDate || getLocalTodayIso(),
      status: "pending",
      author_credit: subAuthor.trim() || "Community Clinician Contributor",
      source_journal:
        subJournalName.trim() || subDoiUrl.trim()
          ? {
              name: subJournalName.trim() || subAuthor.trim() || "Clinical Submission",
              short_name: subJournalName.trim() ? subJournalName.trim().slice(0, 15) : "DOI Source",
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
            text: subOptA.trim() || "Primary clinical diagnosis option A",
            peer_percentage: Number(subPeerA) || (subCorrect === "A" ? 64 : 16),
            rationale:
              subOptARationale.trim() ||
              (subCorrect === "A" ? "Correct option." : "Plausible distractor."),
          },
          {
            id: "B",
            text: subOptB.trim() || "Alternative differential diagnosis B",
            peer_percentage: Number(subPeerB) || (subCorrect === "B" ? 64 : 16),
            rationale:
              subOptBRationale.trim() ||
              (subCorrect === "B" ? "Correct option." : "Plausible distractor."),
          },
          {
            id: "C",
            text: subOptC.trim() || "Alternative differential diagnosis C",
            peer_percentage: Number(subPeerC) || (subCorrect === "C" ? 64 : 12),
            rationale:
              subOptCRationale.trim() ||
              (subCorrect === "C" ? "Correct option." : "Plausible distractor."),
          },
          {
            id: "D",
            text: subOptD.trim() || "Alternative differential diagnosis D",
            peer_percentage: Number(subPeerD) || (subCorrect === "D" ? 64 : 8),
            rationale:
              subOptDRationale.trim() ||
              (subCorrect === "D" ? "Correct option." : "Plausible distractor."),
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

    try {
      await onCaseSubmitted(newCase);
      setSubmitSuccessMsg(
        'Case "' +
          newCase.case_code +
          '" submitted with PENDING status! It is saved directly to the server database and available in Admin Review.'
      );
      resetAllSubmitFormFields();
    } catch (err: any) {
      setSubmitSuccessMsg("⚠️ Submission error: " + (err?.message || "Failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (

          <div
            className={`p-6 rounded-2xl border space-y-6 ${
              darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">Submit Clinical Case</h2>
              </div>

              <button
                type="button"
                onClick={() => setShowAiExtractor((prev) => !prev)}
                className="px-3.5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm hover:opacity-95 shrink-0"
              >
                {showAiExtractor
                  ? "✕ Close AI Importer"
                  : "✨ AI import from Article"}
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
                        ref={docFileInputRef}
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
                {isAdminVerified && onOpenAdminReview && (
                  <button
                    type="button"
                    onClick={onOpenAdminReview}
                    className="px-3 py-1 rounded bg-emerald-600 text-white font-black"
                  >
                    Open Admin Review →
                  </button>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
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
                    {subspecialtyTabs.filter((t) => t.value !== "All").map((t) => (
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
                    placeholder="e.g., 58-year-old right-handed male"
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
                  <label className="font-bold block mb-1">Past Medical History</label>
                  <input
                    value={subPmh}
                    onChange={(e) => setSubPmh(e.target.value)}
                    placeholder="Hypertension, diabetes, prior surgeries..."
                    className={`w-full p-2.5 rounded-lg border ${
                      darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                    }`}
                  />
                </div>
              </div>

              {/* Vital Signs */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div>
                  <label className="font-bold block mb-1">BP</label>
                  <input
                    value={subVitalBp}
                    onChange={(e) => setSubVitalBp(e.target.value)}
                    placeholder="130/80 mmHg"
                    className={`w-full p-2 rounded-lg border ${
                      darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                    }`}
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">HR</label>
                  <input
                    value={subVitalHr}
                    onChange={(e) => setSubVitalHr(e.target.value)}
                    placeholder="80 bpm"
                    className={`w-full p-2 rounded-lg border ${
                      darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                    }`}
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">RR</label>
                  <input
                    value={subVitalRr}
                    onChange={(e) => setSubVitalRr(e.target.value)}
                    placeholder="18 /min"
                    className={`w-full p-2 rounded-lg border ${
                      darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                    }`}
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Temp</label>
                  <input
                    value={subVitalTemp}
                    onChange={(e) => setSubVitalTemp(e.target.value)}
                    placeholder="36.8 °C"
                    className={`w-full p-2 rounded-lg border ${
                      darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                    }`}
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">SpO2</label>
                  <input
                    value={subVitalSpo2}
                    onChange={(e) => setSubVitalSpo2(e.target.value)}
                    placeholder="98%"
                    className={`w-full p-2 rounded-lg border ${
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
                    CLINICAL &amp; IMAGING
                  </span>
                  {subImageSizeKb > 0 && (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[11px] font-black">
                      ✓ EXIF Stripped • WebP Size: {subImageSizeKb} KB
                    </span>
                  )}
                </div>

                {/* Auto-extracted candidate figures from uploaded document (.pdf, .docx) */}
                {aiExtractedImages.length > 0 && (
                  <div className="mb-3 p-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                        <span>💡</span> Auto-extracted {aiExtractedImages.length} clinical figure{aiExtractedImages.length > 1 ? "s" : ""} from uploaded document:
                      </span>
                      <span className="text-[11px] text-slate-400">Click a figure to load into form</span>
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto py-1">
                      {aiExtractedImages.map((imgUrl, idx) => {
                        const isCurrent = subImageWebpUrl === imgUrl;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setSubImageWebpUrl(imgUrl);
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
                                if (ctx) {
                                  ctx.drawImage(img, 0, 0, w, h);
                                  exportCanvasToCompressedWebp();
                                }
                              };
                              img.src = imgUrl;
                            }}
                            className={`relative rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                              isCurrent
                                ? "border-indigo-500 ring-2 ring-indigo-500/40"
                                : "border-slate-700 opacity-60 hover:opacity-100"
                            }`}
                          >
                            <img src={imgUrl} alt={`Figure ${idx + 1}`} className="w-16 h-16 object-cover" />
                            <span className="absolute bottom-0 inset-x-0 bg-black/75 text-[9px] text-center font-bold text-white py-0.5">
                              {isCurrent ? "✓ Active" : `Fig ${idx + 1}`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <input
                    ref={imageFileInputRef}
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

                {/* Figure Modality, Caption & Key Findings directly inside CLINICAL & IMAGING */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 mt-3 border-t border-slate-200 dark:border-slate-800">
                  <div>
                    <label className="font-bold block mb-1">Figure Modality / Type</label>
                    <input
                      value={subModality}
                      onChange={(e) => setSubModality(e.target.value)}
                      placeholder="e.g., Clinical photo, Brain MRI, CT, EEG"
                      className={`w-full p-2 rounded-lg border ${
                        darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Figure Caption / Description</label>
                    <input
                      value={subFigCaption}
                      onChange={(e) => setSubFigCaption(e.target.value)}
                      placeholder="Description of clinical finding or view..."
                      className={`w-full p-2 rounded-lg border ${
                        darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Key Findings Summary</label>
                    <input
                      value={subFindings}
                      onChange={(e) => setSubFindings(e.target.value)}
                      placeholder="Abnormal findings interpretation..."
                      className={`w-full p-2 rounded-lg border ${
                        darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                      }`}
                    />
                  </div>
                </div>
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
                              {subCorrect === item.id && (
                                <span className="text-[10px] font-bold text-emerald-500">
                                  ✓ Correct Option
                                </span>
                              )}
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
                            High-Yield Teaching Points
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
                            Clinical Pitfalls to Avoid
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
              </div>

              {/* SOURCE & REFERENCE */}
              <div
                className={`p-4 rounded-xl border space-y-3 ${
                  darkMode ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                }`}
              >
                <span className="text-xs font-black uppercase text-indigo-500 block">
                  SOURCE &amp; REFERENCE
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="font-bold block mb-1">Source / Journal</label>
                    <input
                      value={subJournalName}
                      onChange={(e) => setSubJournalName(e.target.value)}
                      placeholder="e.g., NEJM, JAMA, Lancet"
                      className={`w-full p-2 rounded-lg border ${
                        darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                      }`}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="font-bold block mb-1">Source DOI / URL</label>
                    <input
                      value={subDoiUrl}
                      onChange={(e) => setSubDoiUrl(e.target.value)}
                      placeholder="https://doi.org/10.1212/..."
                      className={`w-full p-2 rounded-lg border ${
                        darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Published Date</label>
                    <input
                      type="date"
                      value={subPublishedDate}
                      onChange={(e) => setSubPublishedDate(e.target.value)}
                      className={`w-full p-2 rounded-lg border ${
                        darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                      }`}
                    />
                  </div>
                </div>
                <div>
                  <label className="font-bold block mb-1 text-xs">Author / Institution</label>
                  <input
                    value={subAuthor}
                    onChange={(e) => setSubAuthor(e.target.value)}
                    placeholder="e.g., Dr. Jane Doe • Stroke Center"
                    className={`w-full p-2 rounded-lg border text-xs ${
                      darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                    }`}
                  />
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
  );
}
