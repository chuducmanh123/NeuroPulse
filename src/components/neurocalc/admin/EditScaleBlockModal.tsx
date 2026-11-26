"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BookOpen,
  Calculator,
  Check,
  ChevronDown,
  ChevronRight,
  FlaskConical,
  HelpCircle,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { SUBSPECIALTY_LIST } from "@/constants/subspecialties";
import { evaluateScale, type ScaleInputValues } from "@/lib/neurocalc/engine";
import { validateExpression } from "@/lib/neurocalc/expression";
import { FORMULA_METADATA } from "@/lib/neurocalc/formulas";
import {
  evaluateEffectiveScale,
  sealVerifiedScale,
} from "@/lib/neurocalc/integrity";
import {
  CALC_SECTIONS,
  computeSectionHashes,
  type CalcSectionName,
} from "@/lib/neurocalc/sync/jsonPatch";
import type { SyncRow } from "@/lib/neurocalc/sync/types";
import { validateScaleRecord } from "@/lib/neurocalc/validate";
import type {
  AssessmentGuide,
  FormulaId,
  InterpretationBand,
  NumericScaleItem,
  ScaleItem,
  ScaleRecord,
  ScaleReference,
  SelectOption,
  SelectScaleItem,
  SeverityLevel,
} from "@/types/neurocalc";
import { getStoredAdminToken } from "@/utils/clientAuth";
import { ConflictDialog } from "./ConflictDialog";

interface EditScaleBlockModalProps {
  isOpen: boolean;
  syncRow: SyncRow | null;
  darkMode?: boolean;
  onClose: () => void;
  onSaved: (updatedRow: SyncRow) => Promise<void> | void;
}

type EditorTab = "items" | "scoring" | "interpretation" | "general" | "references";
type CalcMode = "sum" | "single_select" | "built_in_formula" | "custom_expression";

const SECTION_LABELS: Record<CalcSectionName, string> = {
  metadata: "General Info",
  items: "Scale Items",
  scoring: "Scoring",
  interpretation: "Result Bands",
  assessment_guides: "Bedside Guides",
  references: "References",
};

const SEVERITY_OPTIONS: Array<{ value: SeverityLevel; label: string }> = [
  { value: "normal", label: "Normal" },
  { value: "mild", label: "Mild" },
  { value: "moderate", label: "Moderate" },
  { value: "severe", label: "Severe" },
  { value: "critical", label: "Critical" },
  { value: "info", label: "Info" },
];

const SUBSPECIALTY_CHOICES = SUBSPECIALTY_LIST.filter(
  (s) => s !== "All Subspecialties"
);

function cleanLines(lines: string[] | undefined): string[] {
  if (!lines) return [];
  return lines.map((s) => s.trim()).filter(Boolean);
}

function normalizeDraftForSave(scale: ScaleRecord): ScaleRecord {
  const pearls = cleanLines(scale.metadata.clinical_pearls);
  const expr = scale.scoring.expression?.trim();
  const unit = scale.scoring.unit?.trim();
  return {
    ...scale,
    metadata: {
      ...scale.metadata,
      name: scale.metadata.name.trim(),
      short_name: scale.metadata.short_name.trim(),
      summary: scale.metadata.summary.trim(),
      time_estimate: scale.metadata.time_estimate?.trim() || undefined,
      clinical_pearls: pearls.length > 0 ? pearls : undefined,
    },
    scoring: {
      ...scale.scoring,
      unit: unit || undefined,
      expression: expr || undefined,
    },
    assessment_guides: scale.assessment_guides.map((g) => {
      const prompts = cleanLines(g.exam_prompts);
      return {
        ...g,
        title: g.title.trim(),
        chip_label: g.chip_label?.trim() || undefined,
        bedside_steps: cleanLines(g.bedside_steps),
        pitfalls_and_exceptions: cleanLines(g.pitfalls_and_exceptions),
        exam_prompts: prompts.length > 0 ? prompts : undefined,
      };
    }),
  };
}

interface InlineGuideEditorProps {
  guide: AssessmentGuide;
  references: ScaleReference[];
  headerLabel: string;
  onChange: (updated: AssessmentGuide) => void;
  onRemove: () => void;
  inputClass: string;
}

function InlineGuideEditor({
  guide,
  references,
  headerLabel,
  onChange,
  onRemove,
  inputClass,
}: InlineGuideEditorProps) {
  const primaryRef = guide.refs[0] ?? {
    source_id: references[0]?.id ?? "",
    locator: "Table 1",
  };

  return (
    <div className="rounded-xl border border-[#0E7490]/30 bg-[#0E7490]/5 dark:bg-cyan-950/20 p-3.5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0E7490] dark:text-cyan-300">
          <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{headerLabel}</span>
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
        >
          <Trash2 className="w-3 h-3" aria-hidden="true" />
          <span>Remove Guide</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <label className="block">
          <span className="font-semibold block mb-1 text-[11px]">Guide Title</span>
          <input
            type="text"
            value={guide.title}
            onChange={(e) => onChange({ ...guide, title: e.target.value })}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="font-semibold block mb-1 text-[11px]">
            Button Label (optional)
          </span>
          <input
            type="text"
            value={guide.chip_label ?? ""}
            placeholder="How to assess"
            onChange={(e) =>
              onChange({ ...guide, chip_label: e.target.value || undefined })
            }
            className={inputClass}
          />
        </label>
      </div>

      <label className="block">
        <span className="font-semibold block mb-1 text-[11px]">
          Bedside Exam Steps (one per line)
        </span>
        <textarea
          rows={3}
          value={guide.bedside_steps.join("\n")}
          onChange={(e) =>
            onChange({
              ...guide,
              bedside_steps: e.target.value.split(/\r?\n/),
            })
          }
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className="font-semibold block mb-1 text-[11px]">
          Edge Cases &amp; Pitfalls (one per line)
        </span>
        <textarea
          rows={3}
          value={guide.pitfalls_and_exceptions.join("\n")}
          onChange={(e) =>
            onChange({
              ...guide,
              pitfalls_and_exceptions: e.target.value.split(/\r?\n/),
            })
          }
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className="font-semibold block mb-1 text-[11px]">
          Verbal / Reading Prompts (optional, one per line)
        </span>
        <textarea
          rows={2}
          value={(guide.exam_prompts ?? []).join("\n")}
          onChange={(e) => {
            const lines = e.target.value.split(/\r?\n/);
            onChange({
              ...guide,
              exam_prompts: lines.some((l) => l.length > 0) ? lines : undefined,
            });
          }}
          className={inputClass}
        />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <label className="block">
          <span className="font-semibold block mb-1 text-[11px]">
            Source Reference
          </span>
          <select
            value={primaryRef.source_id}
            onChange={(e) =>
              onChange({
                ...guide,
                refs: [
                  { ...primaryRef, source_id: e.target.value },
                  ...guide.refs.slice(1),
                ],
              })
            }
            className={inputClass}
          >
            {references.map((r) => (
              <option key={r.id} value={r.id}>
                {r.year} — {r.citation.slice(0, 64)}
                {r.citation.length > 64 ? "…" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="font-semibold block mb-1 text-[11px]">
            Citation Locator
          </span>
          <input
            type="text"
            value={primaryRef.locator}
            placeholder="e.g., Table 1, p. 45"
            onChange={(e) =>
              onChange({
                ...guide,
                refs: [
                  { ...primaryRef, locator: e.target.value },
                  ...guide.refs.slice(1),
                ],
              })
            }
            className={inputClass}
          />
        </label>
      </div>
    </div>
  );
}

export function EditScaleBlockModal({
  isOpen,
  syncRow,
  darkMode = false,
  onClose,
  onSaved,
}: EditScaleBlockModalProps) {
  const [activeTab, setActiveTab] = useState<EditorTab>("items");
  const [draft, setDraft] = useState<ScaleRecord | null>(null);
  const [expandedItemIds, setExpandedItemIds] = useState<Record<string, boolean>>({});
  const [openOptionGuides, setOpenOptionGuides] = useState<Record<string, boolean>>({});
  const [testInputs, setTestInputs] = useState<ScaleInputValues>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictRow, setConflictRow] = useState<SyncRow | null>(null);
  const [pendingMine, setPendingMine] = useState<ScaleRecord | null>(null);
  const [pendingSaveMode, setPendingSaveMode] = useState<"draft" | "verified">("draft");

  useEffect(() => {
    if (isOpen && syncRow) {
      const cloned = JSON.parse(JSON.stringify(syncRow.data)) as ScaleRecord;
      setDraft(cloned);
      setActiveTab("items");
      const firstId = cloned.items[0]?.id;
      setExpandedItemIds(firstId ? { [firstId]: true } : {});
      setOpenOptionGuides({});
      setTestInputs({});
      setError(null);
      setConflictRow(null);
      setPendingMine(null);
      setPendingSaveMode("draft");
    }
  }, [isOpen, syncRow]);

  const normalizedDraft = useMemo(
    () => (draft ? normalizeDraftForSave(draft) : null),
    [draft]
  );

  const draftSectionHashes = useMemo(
    () => (normalizedDraft ? computeSectionHashes(normalizedDraft) : {}),
    [normalizedDraft]
  );

  const validationErrors = useMemo(
    () => (normalizedDraft ? validateScaleRecord(normalizedDraft) : []),
    [normalizedDraft]
  );

  if (!isOpen || !syncRow || !draft || !normalizedDraft) return null;

  const changedSections = CALC_SECTIONS.filter(
    (sec) => draftSectionHashes[sec] !== syncRow.sectionHashes[sec]
  );

  const isCurrentlyVerified =
    evaluateEffectiveScale(syncRow.data).effectiveStatus === "verified";

  const calcMode: CalcMode =
    draft.scoring.expression !== undefined
      ? "custom_expression"
      : draft.scoring.method === "formula"
        ? "built_in_formula"
        : draft.scoring.method === "single_select"
          ? "single_select"
          : "sum";

  const validItemIds = new Set(draft.items.map((it) => it.id));
  const expressionValidation =
    calcMode === "custom_expression"
      ? validateExpression(draft.scoring.expression ?? "", validItemIds)
      : null;

  const liveTestEval = evaluateScale(normalizedDraft, testInputs, {
    allowDraftPreview: true,
  });

  const inputClass = `w-full rounded-lg border px-2.5 py-1.5 text-xs transition-colors focus:outline-none focus:border-[#0E7490] ${
    darkMode
      ? "border-slate-700 bg-slate-950/60 text-slate-100 placeholder:text-slate-500"
      : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
  }`;

  const cardClass = `rounded-xl border p-4 space-y-3 ${
    darkMode ? "border-slate-800 bg-slate-950/30" : "border-slate-200 bg-white"
  }`;

  const putScale = async (
    payload: ScaleRecord,
    expectedRev: number,
    mode: "draft" | "verified"
  ): Promise<{ ok: true; row: SyncRow } | { ok: false }> => {
    const token = getStoredAdminToken();
    const res = await fetch(
      `/api/neurocalc/sync/scales/${encodeURIComponent(syncRow.uid)}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token || "",
        },
        body: JSON.stringify({
          expectedRev,
          data: payload,
          actor: "admin",
        }),
      }
    );
    const json = await res.json();

    if (res.status === 409 && json?.code === "REV_CONFLICT" && json?.currentRow) {
      setPendingMine(payload);
      setPendingSaveMode(mode);
      setConflictRow(json.currentRow as SyncRow);
      return { ok: false };
    }

    if (!res.ok || !json?.row) {
      setError(json?.error || `Save failed (${res.status})`);
      return { ok: false };
    }

    return { ok: true, row: json.row as SyncRow };
  };

  const submitUpdate = async (
    payloadScale: ScaleRecord,
    expectedRev: number,
    mode: "draft" | "verified"
  ): Promise<void> => {
    setSaving(true);
    setError(null);

    try {
      let targetRev = expectedRev;
      let basePayload = payloadScale;

      if (mode === "verified") {
        // Repair rows that were previously saved with `status: "verified"` and a stale hash
        if (
          syncRow.data.status === "verified" &&
          !isCurrentlyVerified &&
          changedSections.length === 0
        ) {
          const resetDraft: ScaleRecord = {
            ...payloadScale,
            status: "draft",
            verification: {
              verified_by: null,
              verified_at: null,
              content_hash: null,
            },
          };
          const resetResult = await putScale(resetDraft, targetRev, "verified");
          if (!resetResult.ok) return;
          targetRev = resetResult.row.rev;
          basePayload = resetResult.row.data;
        }

        const sealed = sealVerifiedScale(basePayload, "Admin");
        const result = await putScale(sealed, targetRev, "verified");
        if (!result.ok) return;
        await onSaved(result.row);
        onClose();
        return;
      }

      const preparedDraft: ScaleRecord = {
        ...payloadScale,
        status: "draft",
        verification: {
          verified_by: null,
          verified_at: null,
          content_hash: null,
        },
      };
      const result = await putScale(preparedDraft, targetRev, "draft");
      if (!result.ok) return;
      await onSaved(result.row);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error saving scale.");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = (mode: "draft" | "verified") => {
    if (validationErrors.length > 0) {
      setError(
        `Please fix ${validationErrors.length} issue(s) before saving: ${validationErrors[0].message} (${validationErrors[0].path})`
      );
      return;
    }
    void submitUpdate(normalizedDraft, syncRow.rev, mode);
  };

  // --- Item helpers ---
  const updateItem = (itemIdx: number, updater: (item: ScaleItem) => ScaleItem) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const nextItems = [...prev.items];
      nextItems[itemIdx] = updater(nextItems[itemIdx]);
      return { ...prev, items: nextItems };
    });
  };

  const addSelectItem = () => {
    const newId = `item_${Date.now()}`;
    const newItem: SelectScaleItem = {
      kind: "select",
      id: newId,
      code: String(draft.items.length + 1),
      label: "New Assessment Item",
      required: true,
      options: [
        { id: `opt_${Date.now()}_0`, label: "Normal / Absent", points: 0 },
        { id: `opt_${Date.now()}_1`, label: "Present / Abnormal", points: 1 },
      ],
    };
    setDraft((prev) => (prev ? { ...prev, items: [...prev.items, newItem] } : prev));
    setExpandedItemIds((prev) => ({ ...prev, [newId]: true }));
  };

  const moveItem = (idx: number, direction: -1 | 1) => {
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= draft.items.length) return;
    setDraft((prev) => {
      if (!prev) return prev;
      const nextItems = [...prev.items];
      const [moved] = nextItems.splice(idx, 1);
      nextItems.splice(targetIdx, 0, moved);
      return { ...prev, items: nextItems };
    });
  };

  const removeItem = (itemId: string) => {
    if (draft.items.length <= 1) return;
    setDraft((prev) => {
      if (!prev) return prev;
      const nextItems = prev.items.filter((it) => it.id !== itemId);
      const nextGuides = prev.assessment_guides.filter(
        (g) => g.target_id !== itemId
      );
      const nextSubscores = prev.scoring.subscores
        ?.map((sub) => ({
          ...sub,
          item_ids: sub.item_ids.filter((id) => id !== itemId),
        }))
        .filter((sub) => sub.item_ids.length > 0);
      return {
        ...prev,
        items: nextItems,
        assessment_guides: nextGuides,
        scoring: {
          ...prev.scoring,
          subscores:
            nextSubscores && nextSubscores.length > 0 ? nextSubscores : undefined,
        },
      };
    });
  };

  // --- Guide helpers ---
  const upsertGuide = (updated: AssessmentGuide) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const exists = prev.assessment_guides.some((g) => g.id === updated.id);
      return {
        ...prev,
        assessment_guides: exists
          ? prev.assessment_guides.map((g) => (g.id === updated.id ? updated : g))
          : [...prev.assessment_guides, updated],
      };
    });
  };

  const removeGuideById = (guideId: string) => {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            assessment_guides: prev.assessment_guides.filter(
              (g) => g.id !== guideId
            ),
          }
        : prev
    );
  };

  const createItemGuide = (item: ScaleItem) => {
    const newGuide: AssessmentGuide = {
      id: `guide_${item.id}_${Date.now()}`,
      target_type: "item",
      target_id: item.id,
      title: `${item.label} — Assessment Guide`,
      bedside_steps: ["Perform standard bedside exam for this item."],
      pitfalls_and_exceptions: [],
      refs: [
        {
          source_id: draft.references[0]?.id ?? "ref-1",
          locator: "Table 1",
        },
      ],
    };
    upsertGuide(newGuide);
  };

  const createOrOpenOptionGuide = (item: SelectScaleItem, opt: SelectOption) => {
    const key = `${item.id}::${opt.id}`;
    const existing = draft.assessment_guides.find(
      (g) =>
        g.target_type === "option" &&
        g.target_id === item.id &&
        g.option_id === opt.id
    );
    if (!existing) {
      const newGuide: AssessmentGuide = {
        id: `guide_${item.id}_${opt.id}_${Date.now()}`,
        target_type: "option",
        target_id: item.id,
        option_id: opt.id,
        title: `${item.label}: ${opt.label}`,
        bedside_steps: ["Specify criteria for selecting this option."],
        pitfalls_and_exceptions: [],
        refs: [
          {
            source_id: draft.references[0]?.id ?? "ref-1",
            locator: "Table 1",
          },
        ],
      };
      upsertGuide(newGuide);
      setOpenOptionGuides((prev) => ({ ...prev, [key]: true }));
      return;
    }
    setOpenOptionGuides((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const createScaleGuide = () => {
    const newGuide: AssessmentGuide = {
      id: `guide_scale_${Date.now()}`,
      target_type: "scale",
      target_id: draft.id,
      title: `${draft.metadata.short_name} — Bedside Administration Guide`,
      chip_label: "Scale guide",
      bedside_steps: ["Describe overall administration workflow."],
      pitfalls_and_exceptions: [],
      refs: [
        {
          source_id: draft.references[0]?.id ?? "ref-1",
          locator: "Methods",
        },
      ],
    };
    upsertGuide(newGuide);
  };

  const allItemsExpanded =
    draft.items.length > 0 &&
    draft.items.every((it) => Boolean(expandedItemIds[it.id]));

  const toggleAllItems = () => {
    if (allItemsExpanded) {
      setExpandedItemIds({});
    } else {
      const next: Record<string, boolean> = {};
      for (const it of draft.items) next[it.id] = true;
      setExpandedItemIds(next);
    }
  };

  const scaleGuide = draft.assessment_guides.find(
    (g) => g.target_type === "scale"
  );

  const referencedSourceIds = new Set<string>();
  for (const b of draft.interpretation) {
    for (const r of b.refs) referencedSourceIds.add(r.source_id);
  }
  for (const g of draft.assessment_guides) {
    for (const r of g.refs) referencedSourceIds.add(r.source_id);
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[1000] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-label={`Edit Scale — ${draft.metadata.short_name}`}
      >
        <div
          className={`w-full max-w-4xl max-h-[92vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
            darkMode
              ? "bg-slate-900 border-slate-800 text-slate-100"
              : "bg-white border-slate-200 text-slate-900"
          }`}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                Edit Scale — {draft.metadata.short_name}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Edit items, scoring formula, result bands, and references. Save as draft or save and verify immediately.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Close editor"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="px-5 pt-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto">
            {(
              [
                { id: "items", label: `Scale Items (${draft.items.length})` },
                { id: "scoring", label: "Scoring & Formula" },
                {
                  id: "interpretation",
                  label: `Result Bands (${draft.interpretation.length})`,
                },
                { id: "general", label: "General Info" },
                {
                  id: "references",
                  label: `References (${draft.references.length})`,
                },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === t.id
                    ? "border-[#0E7490] text-[#0E7490] dark:text-cyan-400"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Body */}
          <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
            {error && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 flex items-start gap-2 text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {changedSections.length > 0 && validationErrors.length > 0 && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 space-y-1 text-amber-800 dark:text-amber-300">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    {validationErrors.length} validation issue(s) must be resolved before saving:
                  </span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  {validationErrors.slice(0, 3).map((ve, i) => (
                    <li key={i}>{ve.message}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* TAB 1: SCALE ITEMS */}
            {activeTab === "items" && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-slate-500">
                    Edit item wording, scoring options, numeric ranges, and bedside guides.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleAllItems}
                      className="rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      {allItemsExpanded ? "Collapse All" : "Expand All"}
                    </button>
                    {draft.metadata.kind !== "formula" && (
                      <button
                        type="button"
                        onClick={addSelectItem}
                        className="inline-flex items-center gap-1 rounded-xl bg-[#0E7490] px-3 py-1.5 text-white font-semibold hover:bg-cyan-800"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Item</span>
                      </button>
                    )}
                  </div>
                </div>

                {draft.items.map((item, itemIdx) => {
                  const isExpanded = Boolean(expandedItemIds[item.id]);
                  const itemGuide = draft.assessment_guides.find(
                    (g) => g.target_type === "item" && g.target_id === item.id
                  );
                  const hasOptionGuide = draft.assessment_guides.some(
                    (g) => g.target_type === "option" && g.target_id === item.id
                  );
                  const hasAnyGuide = Boolean(itemGuide) || hasOptionGuide;

                  let summaryBadge = "";
                  if (item.kind === "select") {
                    const numericPts = item.options
                      .map((o) => o.points)
                      .filter((p): p is number => typeof p === "number");
                    const minPt = numericPts.length > 0 ? Math.min(...numericPts) : 0;
                    const maxPt = numericPts.length > 0 ? Math.max(...numericPts) : 0;
                    summaryBadge = `${item.options.length} options · ${minPt}–${maxPt} pts`;
                  } else {
                    summaryBadge = `Numeric (${item.canonical_unit}) · ${item.min_canonical}–${item.max_canonical}`;
                  }

                  return (
                    <div
                      key={item.id}
                      className={`rounded-xl border overflow-hidden ${
                        darkMode
                          ? "border-slate-800 bg-slate-950/30"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      {/* Accordion Header */}
                      <div className="px-4 py-3 flex items-center justify-between gap-2 bg-slate-50/70 dark:bg-slate-900/60">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedItemIds((prev) => ({
                              ...prev,
                              [item.id]: !prev[item.id],
                            }))
                          }
                          className="flex-1 flex items-center gap-2.5 text-left min-w-0"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                          )}
                          <span className="shrink-0 rounded-md bg-slate-200/80 dark:bg-slate-800 px-2 py-0.5 font-mono-tech text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            {item.code || `#${itemIdx + 1}`}
                          </span>
                          <span className="font-bold text-sm truncate">
                            {item.label || "Untitled Item"}
                          </span>
                        </button>

                        <div className="flex items-center gap-2 shrink-0">
                          {hasAnyGuide && (
                            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-[#0E7490]/10 text-[#0E7490] dark:text-cyan-300 px-2 py-0.5 text-[10.5px] font-semibold">
                              <BookOpen className="w-3 h-3" aria-hidden="true" />
                              <span>Guide</span>
                            </span>
                          )}
                          <span className="hidden md:inline font-mono-tech text-[11px] text-slate-500">
                            {summaryBadge}
                          </span>

                          {draft.metadata.kind !== "formula" && (
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                disabled={itemIdx === 0}
                                onClick={() => moveItem(itemIdx, -1)}
                                className="p-1 rounded text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-800 disabled:opacity-30"
                                title="Move up"
                                aria-label="Move item up"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={itemIdx === draft.items.length - 1}
                                onClick={() => moveItem(itemIdx, 1)}
                                className="p-1 rounded text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-800 disabled:opacity-30"
                                title="Move down"
                                aria-label="Move item down"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={draft.items.length <= 1}
                                onClick={() => removeItem(item.id)}
                                className="p-1 rounded text-rose-600 hover:bg-rose-500/10 disabled:opacity-30"
                                title="Delete item"
                                aria-label="Delete item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Accordion Body */}
                      {isExpanded && (
                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
                          {/* Item Metadata */}
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                            <label className="sm:col-span-2 block">
                              <span className="font-semibold block mb-1 text-[11px]">
                                Code
                              </span>
                              <input
                                type="text"
                                value={item.code ?? ""}
                                placeholder="e.g., 1a"
                                onChange={(e) =>
                                  updateItem(itemIdx, (it) => ({
                                    ...it,
                                    code: e.target.value || undefined,
                                  }))
                                }
                                className={inputClass}
                              />
                            </label>
                            <label className="sm:col-span-7 block">
                              <span className="font-semibold block mb-1 text-[11px]">
                                Item Label
                              </span>
                              <input
                                type="text"
                                value={item.label}
                                onChange={(e) =>
                                  updateItem(itemIdx, (it) => ({
                                    ...it,
                                    label: e.target.value,
                                  }))
                                }
                                className={inputClass}
                              />
                            </label>
                            <label className="sm:col-span-3 flex items-center gap-2 h-[32px] px-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={item.required}
                                onChange={(e) =>
                                  updateItem(itemIdx, (it) => ({
                                    ...it,
                                    required: e.target.checked,
                                  }))
                                }
                                className="rounded accent-[#0E7490]"
                              />
                              <span className="font-semibold text-[11px]">
                                Required item
                              </span>
                            </label>
                          </div>

                          <label className="block">
                            <span className="font-semibold block mb-1 text-[11px]">
                              Subtitle / Clinical Prompt (optional)
                            </span>
                            <input
                              type="text"
                              value={item.subtitle ?? ""}
                              placeholder="Short bedside instruction shown under the item title"
                              onChange={(e) =>
                                updateItem(itemIdx, (it) => ({
                                  ...it,
                                  subtitle: e.target.value || undefined,
                                }))
                              }
                              className={inputClass}
                            />
                          </label>

                          {/* Select Options Editor */}
                          {item.kind === "select" && (
                            <div className="space-y-2.5">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-[11px] uppercase tracking-wider text-slate-500">
                                  Scoring Options ({item.options.length})
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newOpt: SelectOption = {
                                      id: `opt_${Date.now()}`,
                                      label: "New option",
                                      points: 0,
                                    };
                                    updateItem(itemIdx, (it) =>
                                      it.kind === "select"
                                        ? { ...it, options: [...it.options, newOpt] }
                                        : it
                                    );
                                  }}
                                  className="inline-flex items-center gap-1 rounded-lg border border-[#0E7490]/40 bg-[#0E7490]/10 px-2.5 py-1 text-[11px] font-semibold text-[#0E7490] dark:text-cyan-300 hover:bg-[#0E7490]/20"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Add Option</span>
                                </button>
                              </div>

                              <div className="space-y-2">
                                {item.options.map((opt, optIdx) => {
                                  const optGuideKey = `${item.id}::${opt.id}`;
                                  const optGuide = draft.assessment_guides.find(
                                    (g) =>
                                      g.target_type === "option" &&
                                      g.target_id === item.id &&
                                      g.option_id === opt.id
                                  );
                                  const isOptGuideOpen =
                                    Boolean(openOptionGuides[optGuideKey]) &&
                                    Boolean(optGuide);

                                  const updateOption = (
                                    patch: Partial<SelectOption>
                                  ) => {
                                    updateItem(itemIdx, (it) => {
                                      if (it.kind !== "select") return it;
                                      const nextOpts = [...it.options];
                                      nextOpts[optIdx] = {
                                        ...nextOpts[optIdx],
                                        ...patch,
                                      };
                                      return { ...it, options: nextOpts };
                                    });
                                  };

                                  return (
                                    <div
                                      key={opt.id}
                                      className={`rounded-xl border p-3 space-y-2 ${
                                        darkMode
                                          ? "border-slate-800 bg-slate-900/50"
                                          : "border-slate-200 bg-slate-50/70"
                                      }`}
                                    >
                                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                                        <div className="sm:col-span-6">
                                          <input
                                            type="text"
                                            value={opt.label}
                                            aria-label="Option label"
                                            placeholder="Option label"
                                            onChange={(e) =>
                                              updateOption({ label: e.target.value })
                                            }
                                            className={inputClass}
                                          />
                                        </div>

                                        <div className="sm:col-span-2">
                                          {opt.is_untestable ? (
                                            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-center font-mono-tech text-xs font-bold text-amber-700 dark:text-amber-300">
                                              UN
                                            </div>
                                          ) : (
                                            <input
                                              type="number"
                                              step="any"
                                              value={opt.points ?? 0}
                                              aria-label="Option points"
                                              onChange={(e) => {
                                                const n = Number(e.target.value);
                                                updateOption({
                                                  points: Number.isFinite(n)
                                                    ? n
                                                    : 0,
                                                });
                                              }}
                                              className={`${inputClass} font-mono-tech font-semibold`}
                                            />
                                          )}
                                        </div>

                                        <label className="sm:col-span-2 flex items-center gap-1.5 cursor-pointer px-1">
                                          <input
                                            type="checkbox"
                                            checked={Boolean(opt.is_untestable)}
                                            onChange={(e) => {
                                              const checked = e.target.checked;
                                              updateOption({
                                                is_untestable: checked
                                                  ? true
                                                  : undefined,
                                                points: checked ? null : 0,
                                              });
                                            }}
                                            className="rounded accent-amber-600"
                                          />
                                          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                                            Untestable
                                          </span>
                                        </label>

                                        <div className="sm:col-span-2 flex items-center justify-end gap-1">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              createOrOpenOptionGuide(item, opt)
                                            }
                                            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors ${
                                              optGuide
                                                ? "border-[#0E7490] bg-[#0E7490]/15 text-[#0E7490] dark:text-cyan-300"
                                                : "border-slate-300 dark:border-slate-700 text-slate-500 hover:text-[#0E7490]"
                                            }`}
                                            title={
                                              optGuide
                                                ? "Edit option guide"
                                                : "Add option guide"
                                            }
                                          >
                                            <HelpCircle className="w-3 h-3" />
                                            <span>Guide</span>
                                          </button>
                                          <button
                                            type="button"
                                            disabled={item.options.length <= 2}
                                            onClick={() => {
                                              updateItem(itemIdx, (it) =>
                                                it.kind === "select"
                                                  ? {
                                                      ...it,
                                                      options: it.options.filter(
                                                        (_, i) => i !== optIdx
                                                      ),
                                                    }
                                                  : it
                                              );
                                              setDraft((prev) =>
                                                prev
                                                  ? {
                                                      ...prev,
                                                      assessment_guides:
                                                        prev.assessment_guides.filter(
                                                          (g) =>
                                                            !(
                                                              g.target_type ===
                                                                "option" &&
                                                              g.target_id ===
                                                                item.id &&
                                                              g.option_id ===
                                                                opt.id
                                                            )
                                                        ),
                                                    }
                                                  : prev
                                              );
                                            }}
                                            className="p-1 rounded text-rose-600 hover:bg-rose-500/10 disabled:opacity-30"
                                            aria-label="Delete option"
                                            title="Delete option"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>

                                      <input
                                        type="text"
                                        value={opt.description ?? ""}
                                        placeholder="Optional clinical description or criteria for this option"
                                        onChange={(e) =>
                                          updateOption({
                                            description:
                                              e.target.value || undefined,
                                          })
                                        }
                                        className={inputClass}
                                      />

                                      {optGuide && isOptGuideOpen && (
                                        <InlineGuideEditor
                                          guide={optGuide}
                                          references={draft.references}
                                          headerLabel={`Option Guide: ${opt.label}`}
                                          onChange={upsertGuide}
                                          onRemove={() =>
                                            removeGuideById(optGuide.id)
                                          }
                                          inputClass={inputClass}
                                        />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Numeric Settings Editor */}
                          {item.kind === "numeric" && (
                            <div className="space-y-3">
                              <span className="font-bold text-[11px] uppercase tracking-wider text-slate-500 block">
                                Numeric Input Settings (Unit: {item.canonical_unit})
                              </span>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                <label className="block">
                                  <span className="font-semibold block mb-1 text-[11px]">
                                    Min Value
                                  </span>
                                  <input
                                    type="number"
                                    step="any"
                                    value={item.min_canonical}
                                    onChange={(e) => {
                                      const n = Number(e.target.value);
                                      updateItem(itemIdx, (it) =>
                                        it.kind === "numeric"
                                          ? {
                                              ...it,
                                              min_canonical: Number.isFinite(n)
                                                ? n
                                                : 0,
                                            }
                                          : it
                                      );
                                    }}
                                    className={`${inputClass} font-mono-tech`}
                                  />
                                </label>
                                <label className="block">
                                  <span className="font-semibold block mb-1 text-[11px]">
                                    Max Value
                                  </span>
                                  <input
                                    type="number"
                                    step="any"
                                    value={item.max_canonical}
                                    onChange={(e) => {
                                      const n = Number(e.target.value);
                                      updateItem(itemIdx, (it) =>
                                        it.kind === "numeric"
                                          ? {
                                              ...it,
                                              max_canonical: Number.isFinite(n)
                                                ? n
                                                : 0,
                                            }
                                          : it
                                      );
                                    }}
                                    className={`${inputClass} font-mono-tech`}
                                  />
                                </label>
                                <label className="block">
                                  <span className="font-semibold block mb-1 text-[11px]">
                                    Step (optional)
                                  </span>
                                  <input
                                    type="number"
                                    step="any"
                                    value={item.step ?? ""}
                                    placeholder="any"
                                    onChange={(e) => {
                                      const raw = e.target.value.trim();
                                      const n = Number(raw);
                                      updateItem(itemIdx, (it) =>
                                        it.kind === "numeric"
                                          ? {
                                              ...it,
                                              step:
                                                raw && Number.isFinite(n)
                                                  ? n
                                                  : undefined,
                                            }
                                          : it
                                      );
                                    }}
                                    className={`${inputClass} font-mono-tech`}
                                  />
                                </label>
                                <label className="block">
                                  <span className="font-semibold block mb-1 text-[11px]">
                                    Placeholder
                                  </span>
                                  <input
                                    type="text"
                                    value={item.placeholder ?? ""}
                                    placeholder={`${item.min_canonical} – ${item.max_canonical}`}
                                    onChange={(e) =>
                                      updateItem(itemIdx, (it) =>
                                        it.kind === "numeric"
                                          ? {
                                              ...it,
                                              placeholder:
                                                e.target.value || undefined,
                                            }
                                          : it
                                      )
                                    }
                                    className={inputClass}
                                  />
                                </label>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {(item as NumericScaleItem).units.map(
                                  (u, uIdx) => (
                                    <label key={u.unit} className="block">
                                      <span className="font-semibold block mb-1 text-[11px]">
                                        Display Label for Unit ({u.unit})
                                      </span>
                                      <input
                                        type="text"
                                        value={u.label}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          updateItem(itemIdx, (it) => {
                                            if (it.kind !== "numeric") return it;
                                            const nextUnits = [...it.units];
                                            nextUnits[uIdx] = {
                                              ...nextUnits[uIdx],
                                              label: val,
                                            };
                                            return { ...it, units: nextUnits };
                                          });
                                        }}
                                        className={inputClass}
                                      />
                                    </label>
                                  )
                                )}
                              </div>
                            </div>
                          )}

                          {/* Inline Item Bedside Guide */}
                          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                            {itemGuide ? (
                              <InlineGuideEditor
                                guide={itemGuide}
                                references={draft.references}
                                headerLabel="Item Bedside Guide (How to assess)"
                                onChange={upsertGuide}
                                onRemove={() => removeGuideById(itemGuide.id)}
                                inputClass={inputClass}
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => createItemGuide(item)}
                                className="w-full rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-2 px-3 text-xs font-semibold text-[#0E7490] dark:text-cyan-400 hover:bg-[#0E7490]/5 transition-colors flex items-center justify-center gap-1.5"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add Bedside Guide for This Item</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB 2: SCORING & FORMULA */}
            {activeTab === "scoring" && (
              <div className="space-y-4">
                <div className={cardClass}>
                  <div>
                    <span className="font-bold text-[11px] uppercase tracking-wider text-slate-500 block mb-2">
                      Calculation Method
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                      {(
                        [
                          {
                            id: "sum",
                            title: "Sum of Items",
                            desc: "Add points from all selected items",
                          },
                          {
                            id: "single_select",
                            title: "Single Grade",
                            desc: "Use the grade of one primary item",
                          },
                          {
                            id: "built_in_formula",
                            title: "Built-in Formula",
                            desc: "Standard clinical equation",
                          },
                          {
                            id: "custom_expression",
                            title: "Custom Expression",
                            desc: "Multiply, divide, or complex math",
                          },
                        ] as const
                      ).map((opt) => {
                        const active = calcMode === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setDraft((prev) => {
                                if (!prev) return prev;
                                if (opt.id === "sum") {
                                  return {
                                    ...prev,
                                    metadata: { ...prev.metadata, kind: "point_sum" },
                                    scoring: {
                                      ...prev.scoring,
                                      method: "sum",
                                      formula_id: undefined,
                                      expression: undefined,
                                    },
                                  };
                                }
                                if (opt.id === "single_select") {
                                  return {
                                    ...prev,
                                    metadata: { ...prev.metadata, kind: "ordinal_grade" },
                                    scoring: {
                                      ...prev.scoring,
                                      method: "single_select",
                                      formula_id: undefined,
                                      expression: undefined,
                                    },
                                  };
                                }
                                if (opt.id === "built_in_formula") {
                                  return {
                                    ...prev,
                                    metadata: { ...prev.metadata, kind: "formula" },
                                    scoring: {
                                      ...prev.scoring,
                                      method: "formula",
                                      formula_id: prev.scoring.formula_id ?? "abc_2",
                                      expression: undefined,
                                    },
                                  };
                                }
                                const defaultExpr =
                                  prev.scoring.expression ??
                                  (prev.scoring.formula_id
                                    ? FORMULA_METADATA[prev.scoring.formula_id].equation
                                    : prev.items.map((i) => i.id).join(" + "));
                                const nextMethod =
                                  prev.scoring.method === "single_select"
                                    ? "formula"
                                    : prev.scoring.method;
                                const nextKind =
                                  nextMethod === "formula" ? "formula" : "point_sum";
                                return {
                                  ...prev,
                                  metadata: { ...prev.metadata, kind: nextKind },
                                  scoring: {
                                    ...prev.scoring,
                                    method: nextMethod,
                                    expression: defaultExpr,
                                  },
                                };
                              });
                            }}
                            className={`rounded-xl border p-3 text-left transition-colors ${
                              active
                                ? "border-[#0E7490] bg-[#0E7490]/10 text-[#0E7490] dark:text-cyan-300"
                                : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/60"
                            }`}
                          >
                            <div className="font-bold text-xs">{opt.title}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                              {opt.desc}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Built-in Formula Details */}
                  {calcMode === "built_in_formula" && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-3.5 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-[11px] uppercase tracking-wider text-slate-500">
                          Published Clinical Equation
                        </span>
                        {draft.scoring.formula_id && (
                          <button
                            type="button"
                            onClick={() => {
                              const eq =
                                FORMULA_METADATA[draft.scoring.formula_id!].equation;
                              setDraft((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      scoring: {
                                        ...prev.scoring,
                                        expression: eq,
                                      },
                                    }
                                  : prev
                              );
                            }}
                            className="rounded-lg border border-[#0E7490]/40 bg-[#0E7490]/10 px-2.5 py-1 text-[11px] font-semibold text-[#0E7490] dark:text-cyan-300 hover:bg-[#0E7490]/20"
                          >
                            Customize as Expression
                          </button>
                        )}
                      </div>
                      <select
                        value={draft.scoring.formula_id ?? "abc_2"}
                        onChange={(e) =>
                          setDraft((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  scoring: {
                                    ...prev.scoring,
                                    formula_id: e.target.value as FormulaId,
                                  },
                                }
                              : prev
                          )
                        }
                        className={inputClass}
                      >
                        {(Object.keys(FORMULA_METADATA) as FormulaId[]).map((fid) => (
                          <option key={fid} value={fid}>
                            {FORMULA_METADATA[fid].label}
                          </option>
                        ))}
                      </select>
                      {draft.scoring.formula_id && (
                        <div className="space-y-1">
                          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-mono-tech text-xs font-semibold text-[#0E7490] dark:text-cyan-300">
                            {FORMULA_METADATA[draft.scoring.formula_id].equation}
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {FORMULA_METADATA[draft.scoring.formula_id].description}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Custom Math Expression Editor */}
                  {calcMode === "custom_expression" && (
                    <div className="rounded-xl border border-[#0E7490]/30 bg-[#0E7490]/5 dark:bg-cyan-950/20 p-3.5 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 font-bold text-xs text-[#0E7490] dark:text-cyan-300">
                          <Calculator className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Custom Math Expression</span>
                        </span>
                        {expressionValidation && (
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                              expressionValidation.valid
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                            }`}
                          >
                            {expressionValidation.valid
                              ? "Expression valid"
                              : expressionValidation.error}
                          </span>
                        )}
                      </div>

                      <textarea
                        rows={2}
                        value={draft.scoring.expression ?? ""}
                        placeholder="e.g., (a * b * c) / 2  or  if(age >= 60, item_1 * 2, item_1)"
                        onChange={(e) =>
                          setDraft((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  scoring: {
                                    ...prev.scoring,
                                    expression: e.target.value,
                                  },
                                }
                              : prev
                          )
                        }
                        className={`${inputClass} font-mono-tech font-semibold`}
                      />

                      <div>
                        <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                          Click an item variable to insert into expression:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {draft.items.map((it) => (
                            <button
                              key={it.id}
                              type="button"
                              onClick={() =>
                                setDraft((prev) => {
                                  if (!prev) return prev;
                                  const cur = prev.scoring.expression ?? "";
                                  const sep =
                                    cur.length > 0 && !/[\s(+\-*/^,<>=]$/.test(cur)
                                      ? " + "
                                      : "";
                                  return {
                                    ...prev,
                                    scoring: {
                                      ...prev.scoring,
                                      expression: `${cur}${sep}${it.id}`,
                                    },
                                  };
                                })
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-[11px] hover:border-[#0E7490] transition-colors"
                              title={it.label}
                            >
                              <span className="font-mono-tech font-bold text-[#0E7490] dark:text-cyan-400">
                                {it.id}
                              </span>
                              <span className="text-slate-500 truncate max-w-[140px]">
                                ({it.code || it.label})
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Supported operators: <span className="font-mono-tech font-semibold">+ - * / ^ ( )</span> and comparisons <span className="font-mono-tech font-semibold">&lt; &lt;= &gt; &gt;= == !=</span>. Functions:{" "}
                        <span className="font-mono-tech font-semibold">
                          min(), max(), abs(), sqrt(), round(), floor(), ceil(), pow(), ln(), log10(), exp(), if(cond, a, b)
                        </span>.
                      </p>
                    </div>
                  )}

                  {/* Score Range & Output Formatting */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <label className="block">
                      <span className="font-semibold block mb-1 text-[11px]">
                        Min Score
                      </span>
                      <input
                        type="number"
                        step="any"
                        value={draft.scoring.min_score}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          setDraft((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  scoring: {
                                    ...prev.scoring,
                                    min_score: Number.isFinite(n) ? n : 0,
                                  },
                                }
                              : prev
                          );
                        }}
                        className={`${inputClass} font-mono-tech`}
                      />
                    </label>
                    <label className="block">
                      <span className="font-semibold block mb-1 text-[11px]">
                        Max Score (blank = open)
                      </span>
                      <input
                        type="number"
                        step="any"
                        value={draft.scoring.max_score ?? ""}
                        placeholder="No upper limit"
                        onChange={(e) => {
                          const raw = e.target.value.trim();
                          const n = Number(raw);
                          setDraft((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  scoring: {
                                    ...prev.scoring,
                                    max_score:
                                      raw && Number.isFinite(n) ? n : null,
                                  },
                                }
                              : prev
                          );
                        }}
                        className={`${inputClass} font-mono-tech`}
                      />
                    </label>
                    <label className="block">
                      <span className="font-semibold block mb-1 text-[11px]">
                        Result Unit (optional)
                      </span>
                      <input
                        type="text"
                        value={draft.scoring.unit ?? ""}
                        placeholder="pts, mL, mEq/L"
                        onChange={(e) =>
                          setDraft((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  scoring: {
                                    ...prev.scoring,
                                    unit: e.target.value || undefined,
                                  },
                                }
                              : prev
                          )
                        }
                        className={inputClass}
                      />
                    </label>
                    <label className="block">
                      <span className="font-semibold block mb-1 text-[11px]">
                        Decimal Precision
                      </span>
                      <select
                        value={
                          draft.scoring.precision ??
                          (draft.scoring.method === "formula" ? 1 : 0)
                        }
                        onChange={(e) =>
                          setDraft((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  scoring: {
                                    ...prev.scoring,
                                    precision: Number(e.target.value),
                                  },
                                }
                              : prev
                          )
                        }
                        className={`${inputClass} font-mono-tech`}
                      >
                        <option value={0}>0 (Integer)</option>
                        <option value={1}>1 decimal</option>
                        <option value={2}>2 decimals</option>
                        <option value={3}>3 decimals</option>
                      </select>
                    </label>
                  </div>
                </div>

                {/* Live Formula Tester */}
                <div className={cardClass}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 font-bold text-xs text-[#0E7490] dark:text-cyan-300">
                      <FlaskConical className="w-4 h-4" aria-hidden="true" />
                      <span>Live Formula Tester</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setTestInputs({})}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      Clear Test Inputs
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {draft.items.map((it) => {
                      if (it.kind === "select") {
                        const val =
                          typeof testInputs[it.id] === "string"
                            ? (testInputs[it.id] as string)
                            : "";
                        return (
                          <label key={it.id} className="block">
                            <span className="font-semibold block mb-1 text-[11px] truncate">
                              {it.code ? `${it.code} — ` : ""}
                              {it.label}
                            </span>
                            <select
                              value={val}
                              onChange={(e) =>
                                setTestInputs((prev) => ({
                                  ...prev,
                                  [it.id]: e.target.value || undefined,
                                }))
                              }
                              className={inputClass}
                            >
                              <option value="">Select…</option>
                              {it.options.map((o) => (
                                <option key={o.id} value={o.id}>
                                  {o.label} (
                                  {o.is_untestable ? "UN" : `${o.points ?? 0}`})
                                </option>
                              ))}
                            </select>
                          </label>
                        );
                      }

                      const cur = testInputs[it.id];
                      const rawStr =
                        typeof cur === "object" && cur !== null
                          ? String(cur.value ?? "")
                          : typeof cur === "number" || typeof cur === "string"
                            ? String(cur)
                            : "";
                      return (
                        <label key={it.id} className="block">
                          <span className="font-semibold block mb-1 text-[11px] truncate">
                            {it.label} ({it.canonical_unit})
                          </span>
                          <input
                            type="number"
                            step="any"
                            value={rawStr}
                            placeholder={`${it.min_canonical}–${it.max_canonical}`}
                            onChange={(e) =>
                              setTestInputs((prev) => ({
                                ...prev,
                                [it.id]: {
                                  value: e.target.value,
                                  unit: it.canonical_unit,
                                },
                              }))
                            }
                            className={`${inputClass} font-mono-tech`}
                          />
                        </label>
                      );
                    })}
                  </div>

                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Test Result:
                      </span>
                      <span className="font-mono-tech text-xl font-bold text-[#0E7490] dark:text-cyan-300">
                        {liveTestEval.formattedScore ?? "—"}
                      </span>
                      {draft.scoring.unit && (
                        <span className="font-mono-tech text-xs text-slate-500">
                          {draft.scoring.unit}
                        </span>
                      )}
                    </div>
                    <div className="text-xs">
                      {liveTestEval.fieldErrors.length > 0 ? (
                        <span className="text-rose-600 dark:text-rose-400 font-semibold">
                          {liveTestEval.fieldErrors[0].message}
                        </span>
                      ) : liveTestEval.band ? (
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          Band: {liveTestEval.band.label}
                        </span>
                      ) : (
                        <span className="text-slate-500">
                          {liveTestEval.answeredCount}/{liveTestEval.requiredCount} required answered
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: RESULT BANDS */}
            {activeTab === "interpretation" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-slate-500">
                    Define score thresholds, severity levels, and clinical interpretations.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const last =
                        draft.interpretation[draft.interpretation.length - 1];
                      const nextMin =
                        last && last.max !== null ? last.max + 1 : 0;
                      const newBand: InterpretationBand = {
                        id: `band_${Date.now()}`,
                        min: nextMin,
                        max: null,
                        label: "New Severity Band",
                        severity: "info",
                        summary: "Describe clinical interpretation for this range.",
                        refs: [
                          {
                            source_id: draft.references[0]?.id ?? "ref-1",
                            locator: "Table 1",
                          },
                        ],
                      };
                      setDraft((prev) =>
                        prev
                          ? {
                              ...prev,
                              interpretation: [...prev.interpretation, newBand],
                            }
                          : prev
                      );
                    }}
                    className="inline-flex items-center gap-1 rounded-xl bg-[#0E7490] px-3 py-1.5 text-white font-semibold hover:bg-cyan-800"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Result Band</span>
                  </button>
                </div>

                {draft.interpretation.map((band, idx) => {
                  const bandRef = band.refs[0] ?? {
                    source_id: draft.references[0]?.id ?? "",
                    locator: "Table 1",
                  };
                  const updateBand = (patch: Partial<InterpretationBand>) => {
                    setDraft((prev) => {
                      if (!prev) return prev;
                      const next = [...prev.interpretation];
                      next[idx] = { ...next[idx], ...patch };
                      return { ...prev, interpretation: next };
                    });
                  };

                  return (
                    <div key={band.id} className={cardClass}>
                      <div className="grid grid-cols-2 sm:grid-cols-12 gap-2.5 items-end">
                        <label className="sm:col-span-3 block">
                          <span className="font-semibold block mb-1 text-[11px]">
                            Min Score
                          </span>
                          <input
                            type="number"
                            step="any"
                            value={band.min}
                            onChange={(e) => {
                              const n = Number(e.target.value);
                              updateBand({ min: Number.isFinite(n) ? n : 0 });
                            }}
                            className={`${inputClass} font-mono-tech`}
                          />
                        </label>
                        <label className="sm:col-span-3 block">
                          <span className="font-semibold block mb-1 text-[11px]">
                            Max Score (blank = open)
                          </span>
                          <input
                            type="number"
                            step="any"
                            value={band.max ?? ""}
                            placeholder="No upper limit"
                            onChange={(e) => {
                              const raw = e.target.value.trim();
                              const n = Number(raw);
                              updateBand({
                                max: raw && Number.isFinite(n) ? n : null,
                              });
                            }}
                            className={`${inputClass} font-mono-tech`}
                          />
                        </label>
                        <label className="sm:col-span-4 block">
                          <span className="font-semibold block mb-1 text-[11px]">
                            Severity Level
                          </span>
                          <select
                            value={band.severity}
                            onChange={(e) =>
                              updateBand({
                                severity: e.target.value as SeverityLevel,
                              })
                            }
                            className={inputClass}
                          >
                            {SEVERITY_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <div className="sm:col-span-2 flex justify-end">
                          <button
                            type="button"
                            disabled={draft.interpretation.length <= 1}
                            onClick={() =>
                              setDraft((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      interpretation:
                                        prev.interpretation.filter(
                                          (_, i) => i !== idx
                                        ),
                                      test_cases: prev.test_cases?.map((tc) =>
                                        tc.expected_band_id === band.id
                                          ? { ...tc, expected_band_id: undefined }
                                          : tc
                                      ),
                                    }
                                  : prev
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-rose-600 hover:bg-rose-500/10 disabled:opacity-30"
                            title="Delete result band"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <label className="block">
                        <span className="font-semibold block mb-1 text-[11px]">
                          Band Label
                        </span>
                        <input
                          type="text"
                          value={band.label}
                          onChange={(e) => updateBand({ label: e.target.value })}
                          className={inputClass}
                        />
                      </label>

                      <label className="block">
                        <span className="font-semibold block mb-1 text-[11px]">
                          Clinical Summary
                        </span>
                        <textarea
                          rows={2}
                          value={band.summary}
                          onChange={(e) => updateBand({ summary: e.target.value })}
                          className={inputClass}
                        />
                      </label>

                      <label className="block">
                        <span className="font-semibold block mb-1 text-[11px]">
                          Clinical Note (optional)
                        </span>
                        <textarea
                          rows={2}
                          value={band.clinical_note ?? ""}
                          onChange={(e) =>
                            updateBand({
                              clinical_note: e.target.value || undefined,
                            })
                          }
                          className={inputClass}
                        />
                      </label>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <label className="block">
                          <span className="font-semibold block mb-1 text-[11px]">
                            Source Reference
                          </span>
                          <select
                            value={bandRef.source_id}
                            onChange={(e) =>
                              updateBand({
                                refs: [
                                  { ...bandRef, source_id: e.target.value },
                                  ...band.refs.slice(1),
                                ],
                              })
                            }
                            className={inputClass}
                          >
                            {draft.references.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.year} — {r.citation.slice(0, 64)}
                                {r.citation.length > 64 ? "…" : ""}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="font-semibold block mb-1 text-[11px]">
                            Citation Locator
                          </span>
                          <input
                            type="text"
                            value={bandRef.locator}
                            onChange={(e) =>
                              updateBand({
                                refs: [
                                  { ...bandRef, locator: e.target.value },
                                  ...band.refs.slice(1),
                                ],
                              })
                            }
                            className={inputClass}
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB 3: GENERAL INFO */}
            {activeTab === "general" && (
              <div className="space-y-4">
                <div className={cardClass}>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    <label className="sm:col-span-6 block">
                      <span className="font-semibold block mb-1 text-[11px]">
                        Full Scale Name
                      </span>
                      <input
                        type="text"
                        value={draft.metadata.name}
                        onChange={(e) =>
                          setDraft((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  metadata: {
                                    ...prev.metadata,
                                    name: e.target.value,
                                  },
                                }
                              : prev
                          )
                        }
                        className={inputClass}
                      />
                    </label>
                    <label className="sm:col-span-3 block">
                      <span className="font-semibold block mb-1 text-[11px]">
                        Short Name
                      </span>
                      <input
                        type="text"
                        value={draft.metadata.short_name}
                        onChange={(e) =>
                          setDraft((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  metadata: {
                                    ...prev.metadata,
                                    short_name: e.target.value,
                                  },
                                }
                              : prev
                          )
                        }
                        className={inputClass}
                      />
                    </label>
                    <label className="sm:col-span-3 block">
                      <span className="font-semibold block mb-1 text-[11px]">
                        Estimated Time
                      </span>
                      <input
                        type="text"
                        value={draft.metadata.time_estimate ?? ""}
                        placeholder="~3 min"
                        onChange={(e) =>
                          setDraft((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  metadata: {
                                    ...prev.metadata,
                                    time_estimate: e.target.value || undefined,
                                  },
                                }
                              : prev
                          )
                        }
                        className={inputClass}
                      />
                    </label>
                  </div>

                  <div>
                    <span className="font-semibold block mb-1.5 text-[11px]">
                      Subspecialties (select at least one)
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {SUBSPECIALTY_CHOICES.map((sub) => {
                        const selected =
                          draft.metadata.subspecialties.includes(sub);
                        return (
                          <button
                            key={sub}
                            type="button"
                            onClick={() => {
                              setDraft((prev) => {
                                if (!prev) return prev;
                                const current = prev.metadata.subspecialties;
                                if (selected && current.length <= 1) {
                                  return prev;
                                }
                                const nextSubs = selected
                                  ? current.filter((s) => s !== sub)
                                  : [...current, sub];
                                return {
                                  ...prev,
                                  metadata: {
                                    ...prev.metadata,
                                    subspecialties: nextSubs,
                                  },
                                };
                              });
                            }}
                            className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                              selected
                                ? "border-[#0E7490] bg-[#0E7490]/15 text-[#0E7490] dark:text-cyan-300"
                                : "border-slate-300 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                            }`}
                          >
                            {sub}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <label className="block">
                    <span className="font-semibold block mb-1 text-[11px]">
                      Clinical Summary
                    </span>
                    <textarea
                      rows={2}
                      value={draft.metadata.summary}
                      onChange={(e) =>
                        setDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                metadata: {
                                  ...prev.metadata,
                                  summary: e.target.value,
                                },
                              }
                            : prev
                        )
                      }
                      className={inputClass}
                    />
                  </label>

                  <label className="block">
                    <span className="font-semibold block mb-1 text-[11px]">
                      Clinical Pearls (one per line)
                    </span>
                    <textarea
                      rows={4}
                      value={(draft.metadata.clinical_pearls ?? []).join("\n")}
                      onChange={(e) => {
                        const lines = e.target.value.split(/\r?\n/);
                        setDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                metadata: {
                                  ...prev.metadata,
                                  clinical_pearls: lines.some((l) => l.length > 0)
                                    ? lines
                                    : undefined,
                                },
                              }
                            : prev
                        );
                      }}
                      className={inputClass}
                    />
                  </label>
                </div>

                {/* Scale-level Bedside Guide */}
                {scaleGuide ? (
                  <InlineGuideEditor
                    guide={scaleGuide}
                    references={draft.references}
                    headerLabel="Overall Scale Administration Guide"
                    onChange={upsertGuide}
                    onRemove={() => removeGuideById(scaleGuide.id)}
                    inputClass={inputClass}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={createScaleGuide}
                    className="w-full rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-2.5 px-3 text-xs font-semibold text-[#0E7490] dark:text-cyan-400 hover:bg-[#0E7490]/5 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Overall Scale Administration Guide</span>
                  </button>
                )}
              </div>
            )}

            {/* TAB 4: REFERENCES */}
            {activeTab === "references" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-slate-500">
                    Manage primary literature citations linked to this scale.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const newRef: ScaleReference = {
                        id: `ref-${Date.now()}`,
                        citation: "Author et al. Journal. Year;Vol(Issue):Pages.",
                        year: new Date().getFullYear(),
                      };
                      setDraft((prev) =>
                        prev
                          ? { ...prev, references: [...prev.references, newRef] }
                          : prev
                      );
                    }}
                    className="inline-flex items-center gap-1 rounded-xl bg-[#0E7490] px-3 py-1.5 text-white font-semibold hover:bg-cyan-800"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Reference</span>
                  </button>
                </div>

                {draft.references.map((ref, idx) => {
                  const inUse = referencedSourceIds.has(ref.id);
                  const canDelete = draft.references.length > 1 && !inUse;
                  return (
                    <div key={ref.id} className={cardClass}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono-tech font-bold text-[#0E7490] dark:text-cyan-400">
                          Reference #{idx + 1}
                        </span>
                        <button
                          type="button"
                          disabled={!canDelete}
                          onClick={() =>
                            setDraft((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    references: prev.references.filter(
                                      (_, i) => i !== idx
                                    ),
                                  }
                                : prev
                            )
                          }
                          title={
                            inUse
                              ? "This reference is currently cited by a result band or guide"
                              : draft.references.length <= 1
                                ? "At least one reference is required"
                                : "Delete reference"
                          }
                          className="p-1 rounded text-rose-600 hover:bg-rose-500/10 disabled:opacity-30"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <label className="block">
                        <span className="font-semibold block mb-1 text-[11px]">
                          Citation
                        </span>
                        <textarea
                          rows={2}
                          value={ref.citation}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDraft((prev) => {
                              if (!prev) return prev;
                              const next = [...prev.references];
                              next[idx] = { ...ref, citation: val };
                              return { ...prev, references: next };
                            });
                          }}
                          className={inputClass}
                        />
                      </label>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <label className="block">
                          <span className="font-semibold block mb-1 text-[11px]">
                            Year
                          </span>
                          <input
                            type="number"
                            value={ref.year}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setDraft((prev) => {
                                if (!prev) return prev;
                                const next = [...prev.references];
                                next[idx] = { ...ref, year: val };
                                return { ...prev, references: next };
                              });
                            }}
                            className={`${inputClass} font-mono-tech`}
                          />
                        </label>
                        <label className="block">
                          <span className="font-semibold block mb-1 text-[11px]">
                            PMID
                          </span>
                          <input
                            type="text"
                            value={ref.pmid ?? ""}
                            onChange={(e) => {
                              const val = e.target.value || undefined;
                              setDraft((prev) => {
                                if (!prev) return prev;
                                const next = [...prev.references];
                                next[idx] = { ...ref, pmid: val };
                                return { ...prev, references: next };
                              });
                            }}
                            className={`${inputClass} font-mono-tech`}
                          />
                        </label>
                        <label className="block">
                          <span className="font-semibold block mb-1 text-[11px]">
                            DOI
                          </span>
                          <input
                            type="text"
                            value={ref.doi ?? ""}
                            onChange={(e) => {
                              const val = e.target.value || undefined;
                              setDraft((prev) => {
                                if (!prev) return prev;
                                const next = [...prev.references];
                                next[idx] = { ...ref, doi: val };
                                return { ...prev, references: next };
                              });
                            }}
                            className={inputClass}
                          />
                        </label>
                        <label className="block">
                          <span className="font-semibold block mb-1 text-[11px]">
                            URL (optional)
                          </span>
                          <input
                            type="url"
                            value={ref.url ?? ""}
                            onChange={(e) => {
                              const val = e.target.value || undefined;
                              setDraft((prev) => {
                                if (!prev) return prev;
                                const next = [...prev.references];
                                next[idx] = { ...ref, url: val };
                                return { ...prev, references: next };
                              });
                            }}
                            className={inputClass}
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-500">
              {changedSections.length === 0
                ? "No unsaved changes."
                : `Modified: ${changedSections
                    .map((s) => SECTION_LABELS[s])
                    .join(", ")}`}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSave("draft")}
                disabled={saving || changedSections.length === 0}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#0E7490] text-[#0E7490] dark:text-cyan-300 text-xs font-bold hover:bg-[#0E7490]/10 disabled:opacity-45"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Save Draft</span>
              </button>
              <button
                type="button"
                onClick={() => handleSave("verified")}
                disabled={saving || (changedSections.length === 0 && isCurrentlyVerified)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-45"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5" />
                )}
                <span>
                  {changedSections.length === 0 && !isCurrentlyVerified
                    ? "Verify Scale"
                    : "Save & Verify"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {conflictRow && pendingMine && (
        <ConflictDialog
          isOpen={true}
          base={syncRow.data}
          mine={pendingMine}
          cloudRow={conflictRow}
          baseRev={syncRow.rev}
          submitting={saving}
          error={error}
          darkMode={darkMode}
          onCancel={() => {
            setConflictRow(null);
            setPendingMine(null);
          }}
          onResolve={async (resolved) => {
            const targetRev = conflictRow.rev;
            const mode = pendingSaveMode;
            setConflictRow(null);
            setPendingMine(null);
            await submitUpdate(resolved, targetRev, mode);
          }}
        />
      )}
    </>
  );
}
