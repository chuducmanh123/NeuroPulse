"use client";

import React, { useState, useEffect, useRef } from "react";
import type {
  PivotalTrialRecord,
  OntologyFacetId,
  SubspecialtyType,
} from "../../types/neuroguide";
import { NEUROLOGY_SUBSPECIALTIES } from "../../types/neuroguide";
import {
  STROKE_ONTOLOGY,
  KEY_TRIAL_FACETS,
  EXCLUDED_TRIAL_TAG_IDS,
  type OntologyValueDef,
} from "../../lib/neuroguide/ontologyValidator";
import { getAdminHeaders } from "@/utils/clientAuth";

interface PivotalTrialModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTrial?: PivotalTrialRecord | null;
  defaultOntologyTags?: Partial<Record<OntologyFacetId, string[]>>;
  onSaved: (updatedTrials: PivotalTrialRecord[], savedTrial: PivotalTrialRecord) => void;
}

function filterAndSanitizeTags(
  raw?: Partial<Record<OntologyFacetId, string[]>>
): Partial<Record<OntologyFacetId, string[]>> {
  if (!raw) return {};
  const out: Partial<Record<OntologyFacetId, string[]>> = {};
  for (const [k, vals] of Object.entries(raw)) {
    if (!Array.isArray(vals)) continue;
    let clean = vals.filter((v) => !EXCLUDED_TRIAL_TAG_IDS.has(v));
    if (k === "time_window") {
      const migrated: string[] = [];
      const hasLate = clean.includes("h6_to_24h");
      for (const id of clean) {
        if (id === "within_24h") {
          if (!hasLate) migrated.push("within_6h", "h6_to_24h");
          else migrated.push("h6_to_24h");
        } else if (id === "beyond_24h") {
          migrated.push("h24_to_72h");
        } else {
          migrated.push(id);
        }
      }
      clean = [...new Set(migrated)];
    }
    if (clean.length > 0) out[k as OntologyFacetId] = clean;
  }
  return out;
}

interface AutoResizeTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
}

function AutoResizeTextarea({
  value,
  className = "",
  onChange,
  ...props
}: AutoResizeTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 38)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={(e) => {
        onChange?.(e);
        adjustHeight();
      }}
      className={`resize-none overflow-hidden ${className}`}
      {...props}
    />
  );
}

interface FacetMultiSelectProps {
  label: string;
  options: OntologyValueDef[];
  selectedIds: string[];
  preserveOrder?: boolean;
  onToggle: (termId: string) => void;
  onClear: () => void;
}

function FacetMultiSelect({
  label,
  options,
  selectedIds,
  preserveOrder = false,
  onToggle,
  onClear,
}: FacetMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const sortedOptions = React.useMemo(() => {
    const filtered = options.filter((v) => !EXCLUDED_TRIAL_TAG_IDS.has(v.id));
    if (preserveOrder) return filtered;
    return [...filtered].sort((a, b) =>
      (a.label_en || a.id).localeCompare(b.label_en || b.id, undefined, {
        sensitivity: "base",
      })
    );
  }, [options, preserveOrder]);

  const filteredOptions = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sortedOptions;
    return sortedOptions.filter((v) =>
      (v.label_en || v.id).toLowerCase().includes(q)
    );
  }, [sortedOptions, search]);

  const selectedItems = sortedOptions.filter((o) => selectedIds.includes(o.id));

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
          {label}
        </label>
        {selectedItems.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Clear ({selectedItems.length})
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-left text-xs flex items-center justify-between gap-2 hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
      >
        <div className="flex flex-wrap gap-1 flex-1 min-w-0">
          {selectedItems.length === 0 ? (
            <span className="text-slate-400 dark:text-slate-500">
              Select {label.toLowerCase()}...
            </span>
          ) : (
            selectedItems.map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200 text-[11px] font-medium"
              >
                <span className="truncate max-w-[160px]">{item.label_en || item.id}</span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(item.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      onToggle(item.id);
                    }
                  }}
                  className="hover:text-rose-600 dark:hover:text-rose-400 font-bold cursor-pointer"
                >
                  ×
                </span>
              </span>
            ))
          )}
        </div>
        <span className="text-slate-400 text-[10px] shrink-0">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-1 z-40 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-100 dark:border-slate-800">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}...`}
              className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5">
            {filteredOptions.length === 0 ? (
              <p className="px-2.5 py-2 text-xs text-slate-400">No matching options</p>
            ) : (
              filteredOptions.map((val) => {
                const checked = selectedIds.includes(val.id);
                return (
                  <label
                    key={val.id}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition ${
                      checked
                        ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-200 font-semibold"
                        : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(val.id)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="leading-snug">{val.label_en || val.id}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function PivotalTrialModal({
  isOpen,
  onClose,
  initialTrial,
  defaultOntologyTags,
  onSaved,
}: PivotalTrialModalProps) {
  const [lookupInput, setLookupInput] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupStatus, setLookupStatus] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [acronym, setAcronym] = useState("");
  const [title, setTitle] = useState("");
  const [year, setYear] = useState<number>(2025);
  const [journal, setJournal] = useState("NEJM");
  const [pmid, setPmid] = useState("");
  const [doi, setDoi] = useState("");
  const [subspecialty, setSubspecialty] = useState<SubspecialtyType>("Stroke");
  const [evidenceSource, setEvidenceSource] = useState<
    "PEER_REVIEWED_PUBLISHED" | "CONFERENCE_LATE_BREAKING"
  >("PEER_REVIEWED_PUBLISHED");
  const [design, setDesign] = useState<
    "Phase 3 RCT" | "Phase 2 RCT" | "Meta-Analysis" | "Prospective Registry"
  >("Phase 3 RCT");
  const [sampleSize, setSampleSize] = useState<string>("500");

  const [population, setPopulation] = useState("");
  const [intervention, setIntervention] = useState("");
  const [comparator, setComparator] = useState("");
  const [timeWindow, setTimeWindow] = useState("");

  const [primaryMetric, setPrimaryMetric] = useState("90-day mRS 0-1 or 0-2");
  const [primaryStats, setPrimaryStats] = useState("");
  const [verdict, setVerdict] = useState<
    "POSITIVE" | "NON_INFERIOR" | "NEUTRAL" | "NEGATIVE"
  >("POSITIVE");

  const [sICH, setSICH] = useState("");
  const [mortality90d, setMortality90d] = useState("");
  const [safetyNote, setSafetyNote] = useState("");
  const [bottomLine, setBottomLine] = useState("");
  const [ontologyTags, setOntologyTags] = useState<
    Partial<Record<OntologyFacetId, string[]>>
  >({});

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLookupStatus(null);
    setSaveError(null);
    if (initialTrial) {
      setAcronym(initialTrial.acronym || "");
      setTitle(initialTrial.title || "");
      setYear(initialTrial.year || 2025);
      setJournal(initialTrial.journal || "");
      setPmid(initialTrial.pmid || "");
      setDoi(initialTrial.doi || "");
      setSubspecialty(initialTrial.subspecialty || "Stroke");
      setEvidenceSource(initialTrial.evidenceSource || "PEER_REVIEWED_PUBLISHED");
      setDesign(initialTrial.design || "Phase 3 RCT");
      setSampleSize(initialTrial.sampleSize ? String(initialTrial.sampleSize) : "");
      setPopulation(initialTrial.pico?.population || "");
      setIntervention(initialTrial.pico?.intervention || "");
      setComparator(initialTrial.pico?.comparator || "");
      setTimeWindow(initialTrial.pico?.timeWindow || "");
      setPrimaryMetric(initialTrial.primaryEndpoint?.metric || "");
      setPrimaryStats(initialTrial.primaryEndpoint?.resultStats || "");
      setVerdict(initialTrial.primaryEndpoint?.verdict || "POSITIVE");
      setSICH(initialTrial.safetyEndpoint?.sICH || "");
      setMortality90d(initialTrial.safetyEndpoint?.mortality90d || "");
      setSafetyNote(initialTrial.safetyEndpoint?.note || "");
      setBottomLine(initialTrial.bottomLine || "");
      setOntologyTags(filterAndSanitizeTags(initialTrial.ontologyTags || defaultOntologyTags));
    } else {
      setAcronym("");
      setTitle("");
      setYear(new Date().getFullYear());
      setJournal("NEJM");
      setPmid("");
      setDoi("");
      setSubspecialty("Stroke");
      setEvidenceSource("PEER_REVIEWED_PUBLISHED");
      setDesign("Phase 3 RCT");
      setSampleSize("");
      setPopulation("");
      setIntervention("");
      setComparator("");
      setTimeWindow("");
      setPrimaryMetric("90-day mRS 0-2");
      setPrimaryStats("");
      setVerdict("POSITIVE");
      setSICH("");
      setMortality90d("");
      setSafetyNote("");
      setBottomLine("");
      setOntologyTags(filterAndSanitizeTags(defaultOntologyTags));
    }
  }, [isOpen, initialTrial, defaultOntologyTags]);

  if (!isOpen) return null;

  const handleAutoFill = async () => {
    if (!lookupInput.trim()) return;
    setIsLookingUp(true);
    setLookupStatus(null);
    try {
      const res = await fetch("/api/neuroguide/navigator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "lookup_trial",
          identifier: lookupInput.trim(),
        }),
      });
      const data = await res.json();
      if (data.ok && data.trial) {
        const t = data.trial as PivotalTrialRecord;
        setAcronym(t.acronym || "");
        setTitle(t.title || "");
        setYear(t.year || new Date().getFullYear());
        setJournal(t.journal || "");
        setPmid(t.pmid || "");
        setDoi(t.doi || "");
        setSubspecialty(t.subspecialty || "Stroke");
        setEvidenceSource(t.evidenceSource || "PEER_REVIEWED_PUBLISHED");
        setDesign(t.design || "Phase 3 RCT");
        setSampleSize(t.sampleSize ? String(t.sampleSize) : "");
        setPopulation(t.pico?.population || "");
        setIntervention(t.pico?.intervention || "");
        setComparator(t.pico?.comparator || "");
        setTimeWindow(t.pico?.timeWindow || "");
        setPrimaryMetric(t.primaryEndpoint?.metric || "");
        setPrimaryStats(t.primaryEndpoint?.resultStats || "");
        setVerdict(t.primaryEndpoint?.verdict || "POSITIVE");
        setSICH(t.safetyEndpoint?.sICH || "");
        setMortality90d(t.safetyEndpoint?.mortality90d || "");
        setSafetyNote(t.safetyEndpoint?.note || "");
        setBottomLine(t.bottomLine || "");
        setOntologyTags(filterAndSanitizeTags(t.ontologyTags));
        const sourceLabel =
          data.source === "seed"
            ? "Landmark Seed Library"
            : data.source === "neuropulse-local"
            ? "NeuroPulse Local Library"
            : data.source === "europepmc-api"
            ? "Europe PMC API"
            : "NCBI PubMed API";
        setLookupStatus({
          type: "success",
          text: data.usedGemini
            ? `Đã tự động điền từ ${sourceLabel} + Gemini AI dựa trên abstract. Các mục không có trong abstract được để trống.`
            : `Đã tự động điền từ ${sourceLabel}. Vui lòng kiểm tra và bổ sung các mục còn thiếu trước khi lưu.`,
        });
      } else {
        setLookupStatus({
          type: "error",
          text: data.error || "Không tìm thấy bài báo khớp với PMID/DOI đã nhập.",
        });
      }
    } catch (err: any) {
      setLookupStatus({
        type: "error",
        text: err?.message || "Lỗi kết nối khi tìm kiếm dữ liệu bài báo.",
      });
    } finally {
      setIsLookingUp(false);
    }
  };

  const toggleOntologyTag = (facet: OntologyFacetId, termId: string) => {
    setOntologyTags((prev) => {
      const current = prev[facet] || [];
      const exists = current.includes(termId);
      const next = exists ? current.filter((x) => x !== termId) : [...current, termId];
      return {
        ...prev,
        [facet]: next,
      };
    });
  };

  const clearOntologyFacet = (facet: OntologyFacetId) => {
    setOntologyTags((prev) => ({
      ...prev,
      [facet]: [],
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    if (!acronym.trim() || !title.trim()) {
      setSaveError("Trial Acronym and Full Title are required.");
      return;
    }

    const trialId =
      initialTrial?.id ||
      `${acronym.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${year}`;

    const record: PivotalTrialRecord = {
      id: trialId,
      acronym: acronym.trim(),
      title: title.trim(),
      year: Number(year) || 2025,
      journal: journal.trim() || "Major Medical Journal",
      pmid: pmid.trim() || undefined,
      doi: doi.trim() || undefined,
      officialUrl: doi.trim()
        ? `https://doi.org/${doi.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")}`
        : pmid.trim()
        ? `https://pubmed.ncbi.nlm.nih.gov/${pmid.trim()}/`
        : undefined,
      subspecialty,
      evidenceSource,
      design,
      sampleSize: sampleSize ? Number(sampleSize) : undefined,
      pico: {
        population: population.trim() || "Target stroke/neurology population",
        intervention: intervention.trim() || "Active intervention arm",
        comparator: comparator.trim() || "Standard medical care / control",
        timeWindow: timeWindow.trim() || undefined,
      },
      primaryEndpoint: {
        metric: primaryMetric.trim() || "Primary clinical endpoint",
        resultStats: primaryStats.trim() || "Reported in trial publication",
        verdict,
      },
      safetyEndpoint: {
        sICH: sICH.trim() || undefined,
        mortality90d: mortality90d.trim() || undefined,
        note: safetyNote.trim() || undefined,
      },
      bottomLine:
        bottomLine.trim() ||
        `${acronym.trim()} (${journal.trim()} ${year}): ${primaryStats.trim()}`,
      ontologyTags,
    };

    setIsSaving(true);
    try {
      const res = await fetch("/api/neuroguide/navigator", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAdminHeaders(),
        },
        body: JSON.stringify({
          action: "upsert_trial",
          trial: record,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setSaveError(data.error || "Failed to save Pivotal Trial record.");
      } else {
        onSaved(data.pivotalTrials || [], record);
        onClose();
      }
    } catch (err: any) {
      setSaveError(err?.message || "Network error while saving Pivotal Trial.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-[95vw] max-w-6xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 sm:px-7 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                Compact PICO Schema (~700B)
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {initialTrial ? `Edit Pivotal Trial: ${initialTrial.acronym}` : "Add Landmark / Pivotal Clinical Trial"}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 sm:p-7 overflow-y-auto space-y-6 text-sm">
          {/* 1-Click Auto-Fill Bar */}
          <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60">
            <label className="block text-xs font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300 mb-1.5">
              ⚡ 1-Click Auto-Fill from PMID, DOI, or Trial Acronym
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={lookupInput}
                onChange={(e) => setLookupInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAutoFill();
                  }
                }}
                placeholder="e.g., 36762852, 10.1056/NEJMoa2214403, SELECT2, AcT, ENRICH..."
                className="flex-1 px-3.5 py-2 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={handleAutoFill}
                disabled={isLookingUp || !lookupInput.trim()}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold transition whitespace-nowrap"
              >
                {isLookingUp ? "Looking up & Extracting..." : "Auto-Fill Metadata"}
              </button>
            </div>
            {lookupStatus && (
              <p
                className={`mt-2 text-xs font-medium ${
                  lookupStatus.type === "success"
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {lookupStatus.text}
              </p>
            )}
          </div>

          {/* Core Trial Identity */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Trial Acronym *
              </label>
              <input
                type="text"
                required
                value={acronym}
                onChange={(e) => setAcronym(e.target.value)}
                placeholder="e.g. SELECT2"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-[13px] font-bold"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Publication Year *
              </label>
              <input
                type="number"
                required
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-[13px]"
              />
            </div>
            <div className="sm:col-span-5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Journal / Conference *
              </label>
              <input
                type="text"
                required
                value={journal}
                onChange={(e) => setJournal(e.target.value)}
                placeholder="NEJM / Lancet / ISC"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-[13px]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Sample Size (N)
              </label>
              <input
                type="number"
                value={sampleSize}
                onChange={(e) => setSampleSize(e.target.value)}
                placeholder="e.g. 352"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-[13px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Full Study Title *
            </label>
            <AutoResizeTextarea
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Trial of Endovascular Thrombectomy for Large Ischemic Strokes"
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-[13px] leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                PMID
              </label>
              <input
                type="text"
                value={pmid}
                onChange={(e) => setPmid(e.target.value)}
                placeholder="36762852"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-[13px]"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                DOI
              </label>
              <input
                type="text"
                value={doi}
                onChange={(e) => setDoi(e.target.value)}
                placeholder="10.1056/NEJMoa2214403"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-[13px]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Study Design
              </label>
              <select
                value={design}
                onChange={(e) => setDesign(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-[13px]"
              >
                <option value="Phase 3 RCT">Phase 3 RCT</option>
                <option value="Phase 2 RCT">Phase 2 RCT</option>
                <option value="Meta-Analysis">Meta-Analysis</option>
                <option value="Prospective Registry">Prospective Registry</option>
              </select>
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Evidence Source
              </label>
              <select
                value={evidenceSource}
                onChange={(e) => setEvidenceSource(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-[13px]"
              >
                <option value="PEER_REVIEWED_PUBLISHED">Peer-Reviewed Published</option>
                <option value="CONFERENCE_LATE_BREAKING">Conference Late-Breaking</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Subspecialty
              </label>
              <select
                value={subspecialty}
                onChange={(e) => setSubspecialty(e.target.value as SubspecialtyType)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-[13px]"
              >
                {NEUROLOGY_SUBSPECIALTIES.filter((s) => s !== "All Subspecialties").map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Structured PICO */}
          <div className="p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Structured PICO Architecture
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Population (P)
                </label>
                <AutoResizeTextarea
                  value={population}
                  onChange={(e) => setPopulation(e.target.value)}
                  placeholder="AIS with ICA/M1 occlusion and large core (ASPECTS 3-5 or core >=50 mL)"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-[13px] leading-relaxed"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Time Window
                </label>
                <AutoResizeTextarea
                  value={timeWindow}
                  onChange={(e) => setTimeWindow(e.target.value)}
                  placeholder="<=24 hours from last known well"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-[13px] leading-relaxed"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Intervention (I)
                </label>
                <AutoResizeTextarea
                  value={intervention}
                  onChange={(e) => setIntervention(e.target.value)}
                  placeholder="Endovascular thrombectomy + medical care"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-[13px] leading-relaxed"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Comparator (C)
                </label>
                <AutoResizeTextarea
                  value={comparator}
                  onChange={(e) => setComparator(e.target.value)}
                  placeholder="Standard medical management alone"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-[13px] leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* Primary & Safety Endpoints */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-4 sm:p-5 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                Primary Efficacy Endpoint
              </h3>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Primary outcome
                </label>
                <AutoResizeTextarea
                  value={primaryMetric}
                  onChange={(e) => setPrimaryMetric(e.target.value)}
                  placeholder="90-day ordinal mRS shift / mRS 0-2"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-[13px] leading-relaxed"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Quantitative Result & Effect Size
                </label>
                <AutoResizeTextarea
                  value={primaryStats}
                  onChange={(e) => setPrimaryStats(e.target.value)}
                  placeholder="Gen OR 1.51 (95% CI 1.20-1.89, p<0.001); mRS 0-2: 20.0% vs 7.0%"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-[13px] leading-relaxed"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Statistical Verdict
                </label>
                <select
                  value={verdict}
                  onChange={(e) => setVerdict(e.target.value as any)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-[13px] font-bold"
                >
                  <option value="POSITIVE">POSITIVE (Superiority Met)</option>
                  <option value="NON_INFERIOR">NON_INFERIOR (Non-Inferiority Met)</option>
                  <option value="NEUTRAL">NEUTRAL (No Significant Difference)</option>
                  <option value="NEGATIVE">NEGATIVE (Harm / Inferiority)</option>
                </select>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                Key Safety Endpoints
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Primary safety outcome
                  </label>
                  <AutoResizeTextarea
                    value={sICH}
                    onChange={(e) => setSICH(e.target.value)}
                    placeholder="e.g. 0.6% vs 1.1%"
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-[13px] leading-relaxed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Mortality
                  </label>
                  <AutoResizeTextarea
                    value={mortality90d}
                    onChange={(e) => setMortality90d(e.target.value)}
                    placeholder="e.g. 38.4% vs 41.5%"
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-[13px] leading-relaxed"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Additional Safety / Subgroup Note
                </label>
                <AutoResizeTextarea
                  value={safetyNote}
                  onChange={(e) => setSafetyNote(e.target.value)}
                  placeholder="e.g. Early neurological worsening higher with vascular access complications"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-[13px] leading-relaxed"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  1-Sentence Clinical Takeaway *
                </label>
                <AutoResizeTextarea
                  required
                  value={bottomLine}
                  onChange={(e) => setBottomLine(e.target.value)}
                  placeholder="EVT significantly improved functional independence in large-core AIS up to 24h."
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-[13px] leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* Ontology Tag Bridge */}
          <div className="p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">
              Ontology Facet Tags
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {KEY_TRIAL_FACETS.map((facetKey) => {
                const facetDef = STROKE_ONTOLOGY.facets[facetKey];
                if (!facetDef) return null;
                return (
                  <FacetMultiSelect
                    key={facetKey}
                    label={facetDef.label_en || facetKey}
                    options={facetDef.values}
                    selectedIds={ontologyTags[facetKey] || []}
                    preserveOrder={facetKey === "time_window"}
                    onToggle={(termId) => toggleOntologyTag(facetKey, termId)}
                    onClear={() => clearOntologyFacet(facetKey)}
                  />
                );
              })}
            </div>
          </div>

          {saveError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 font-medium">
              {saveError}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition"
            >
              {isSaving ? "Saving Trial..." : "Save Pivotal Trial"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
