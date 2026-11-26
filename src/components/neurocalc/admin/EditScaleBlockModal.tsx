"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, Loader2, Plus, Trash2, X } from "lucide-react";
import {
  CALC_SECTIONS,
  computeSectionHashes,
} from "@/lib/neurocalc/sync/jsonPatch";
import type { SyncRow } from "@/lib/neurocalc/sync/types";
import { validateScaleRecord } from "@/lib/neurocalc/validate";
import type {
  AssessmentGuide,
  ScaleRecord,
  SelectScaleItem,
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

type EditorTab = "guides" | "interpretation" | "metadata" | "references";

function linesToArray(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function EditScaleBlockModal({
  isOpen,
  syncRow,
  darkMode = false,
  onClose,
  onSaved,
}: EditScaleBlockModalProps) {
  const [activeTab, setActiveTab] = useState<EditorTab>("guides");
  const [draft, setDraft] = useState<ScaleRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictRow, setConflictRow] = useState<SyncRow | null>(null);
  const [pendingMine, setPendingMine] = useState<ScaleRecord | null>(null);

  useEffect(() => {
    if (isOpen && syncRow) {
      setDraft(JSON.parse(JSON.stringify(syncRow.data)) as ScaleRecord);
      setActiveTab("guides");
      setError(null);
      setConflictRow(null);
      setPendingMine(null);
    }
  }, [isOpen, syncRow]);

  const draftSectionHashes = useMemo(
    () => (draft ? computeSectionHashes(draft) : {}),
    [draft]
  );

  const validationErrors = useMemo(
    () => (draft ? validateScaleRecord(draft) : []),
    [draft]
  );

  if (!isOpen || !syncRow || !draft) return null;

  const changedSections = CALC_SECTIONS.filter(
    (sec) => draftSectionHashes[sec] !== syncRow.sectionHashes[sec]
  );

  const submitUpdate = async (
    payloadScale: ScaleRecord,
    expectedRev: number
  ): Promise<void> => {
    setSaving(true);
    setError(null);

    const prepared: ScaleRecord = {
      ...payloadScale,
      status: "draft",
      verification: {
        verified_by: null,
        verified_at: null,
        content_hash: null,
      },
    };

    try {
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
            data: prepared,
            actor: "admin",
          }),
        }
      );
      const json = await res.json();

      if (res.status === 409 && json?.code === "REV_CONFLICT" && json?.currentRow) {
        setPendingMine(prepared);
        setConflictRow(json.currentRow as SyncRow);
        return;
      }

      if (!res.ok || !json?.row) {
        setError(json?.error || `Save failed (${res.status})`);
        return;
      }

      await onSaved(json.row as SyncRow);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error saving scale.");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (validationErrors.length > 0) {
      setError(
        `Fix ${validationErrors.length} validation error(s) before saving: [${validationErrors[0].path}] ${validationErrors[0].message}`
      );
      return;
    }
    void submitUpdate(draft, syncRow.rev);
  };

  const addAssessmentGuide = () => {
    const firstItem = draft.items[0];
    const defaultRefId = draft.references[0]?.id ?? "ref-1";
    const newGuide: AssessmentGuide = {
      id: `guide_${Date.now()}`,
      target_type: firstItem ? "item" : "scale",
      target_id: firstItem ? firstItem.id : draft.id,
      title: "New Assessment Guide",
      bedside_steps: ["Describe bedside exam maneuver."],
      pitfalls_and_exceptions: ["Note edge cases or untestable criteria."],
      refs: [{ source_id: defaultRefId, locator: "Table 1" }],
    };
    setDraft((prev) =>
      prev
        ? { ...prev, assessment_guides: [...prev.assessment_guides, newGuide] }
        : prev
    );
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[1000] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-label={`Edit Text Blocks — ${draft.metadata.short_name}`}
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
                Edit Text Blocks — {draft.metadata.short_name}
              </h2>
              <p className="text-xs text-slate-500">
                Quick block editor (saving resets status to <span className="font-mono font-semibold">draft</span> until re-verified).
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

          {/* 6-Block Merkle Hash Impact Strip */}
          <div className="px-5 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="font-bold text-slate-500 mr-1">6 Granular Blocks:</span>
            {CALC_SECTIONS.map((sec) => {
              const dirty = draftSectionHashes[sec] !== syncRow.sectionHashes[sec];
              return (
                <span
                  key={sec}
                  className={`rounded-md px-2 py-0.5 font-mono ${
                    dirty
                      ? "bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold"
                      : "bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {sec}
                  {dirty ? " *" : ""}
                </span>
              );
            })}
          </div>

          {/* Sub-Tabs */}
          <div className="px-5 pt-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto">
            {(
              [
                { id: "guides", label: `Assessment Guides (${draft.assessment_guides.length})` },
                { id: "interpretation", label: `Interpretations (${draft.interpretation.length})` },
                { id: "metadata", label: "Summary & Pearls" },
                { id: "references", label: `References (${draft.references.length})` },
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

            {activeTab === "guides" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-slate-500">
                    Text-only guides shown selectively on ambiguous items or options.
                  </p>
                  <button
                    type="button"
                    onClick={addAssessmentGuide}
                    className="inline-flex items-center gap-1 rounded-xl bg-[#0E7490] px-3 py-1.5 text-white font-semibold hover:bg-cyan-800"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Guide</span>
                  </button>
                </div>

                {draft.assessment_guides.map((g, idx) => {
                  const targetItem = draft.items.find((i) => i.id === g.target_id);
                  const selectOptions =
                    targetItem?.kind === "select"
                      ? (targetItem as SelectScaleItem).options
                      : [];
                  return (
                    <div
                      key={g.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-[#0E7490] dark:text-cyan-400">
                          {g.id}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setDraft((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    assessment_guides: prev.assessment_guides.filter(
                                      (_, i) => i !== idx
                                    ),
                                  }
                                : prev
                            )
                          }
                          className="p-1 text-rose-600 hover:bg-rose-500/10 rounded"
                          aria-label="Remove guide"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <label className="block">
                          <span className="font-semibold block mb-1">Target Type</span>
                          <select
                            value={g.target_type}
                            onChange={(e) => {
                              const nextType = e.target.value as AssessmentGuide["target_type"];
                              setDraft((prev) => {
                                if (!prev) return prev;
                                const next = [...prev.assessment_guides];
                                next[idx] = {
                                  ...g,
                                  target_type: nextType,
                                  target_id:
                                    nextType === "scale"
                                      ? prev.id
                                      : prev.items[0]?.id ?? prev.id,
                                  option_id:
                                    nextType === "option" &&
                                    prev.items[0]?.kind === "select"
                                      ? prev.items[0].options[0]?.id
                                      : undefined,
                                };
                                return { ...prev, assessment_guides: next };
                              });
                            }}
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-2.5 py-1.5"
                          >
                            <option value="scale">scale</option>
                            <option value="item">item</option>
                            <option value="option">option</option>
                          </select>
                        </label>

                        {g.target_type !== "scale" && (
                          <label className="block">
                            <span className="font-semibold block mb-1">Target Item</span>
                            <select
                              value={g.target_id}
                              onChange={(e) => {
                                const nextItemId = e.target.value;
                                setDraft((prev) => {
                                  if (!prev) return prev;
                                  const next = [...prev.assessment_guides];
                                  const found = prev.items.find((i) => i.id === nextItemId);
                                  next[idx] = {
                                    ...g,
                                    target_id: nextItemId,
                                    option_id:
                                      g.target_type === "option" && found?.kind === "select"
                                        ? found.options[0]?.id
                                        : undefined,
                                  };
                                  return { ...prev, assessment_guides: next };
                                });
                              }}
                              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-2.5 py-1.5"
                            >
                              {draft.items.map((it) => (
                                <option key={it.id} value={it.id}>
                                  {it.code ? `${it.code} — ` : ""}
                                  {it.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}

                        {g.target_type === "option" && (
                          <label className="block">
                            <span className="font-semibold block mb-1">Target Option</span>
                            <select
                              value={g.option_id ?? ""}
                              onChange={(e) => {
                                const nextOpt = e.target.value;
                                setDraft((prev) => {
                                  if (!prev) return prev;
                                  const next = [...prev.assessment_guides];
                                  next[idx] = { ...g, option_id: nextOpt };
                                  return { ...prev, assessment_guides: next };
                                });
                              }}
                              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-2.5 py-1.5"
                            >
                              {selectOptions.map((o) => (
                                <option key={o.id} value={o.id}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <label className="block">
                          <span className="font-semibold block mb-1">Guide Title</span>
                          <input
                            type="text"
                            value={g.title}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDraft((prev) => {
                                if (!prev) return prev;
                                const next = [...prev.assessment_guides];
                                next[idx] = { ...g, title: val };
                                return { ...prev, assessment_guides: next };
                              });
                            }}
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-2.5 py-1.5"
                          />
                        </label>
                        <label className="block">
                          <span className="font-semibold block mb-1">Chip Label (optional)</span>
                          <input
                            type="text"
                            value={g.chip_label ?? ""}
                            placeholder="How to assess"
                            onChange={(e) => {
                              const val = e.target.value || undefined;
                              setDraft((prev) => {
                                if (!prev) return prev;
                                const next = [...prev.assessment_guides];
                                next[idx] = { ...g, chip_label: val };
                                return { ...prev, assessment_guides: next };
                              });
                            }}
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-2.5 py-1.5"
                          />
                        </label>
                      </div>

                      <label className="block">
                        <span className="font-semibold block mb-1">
                          Bedside Exam Steps (one per line)
                        </span>
                        <textarea
                          rows={3}
                          value={g.bedside_steps.join("\n")}
                          onChange={(e) => {
                            const arr = linesToArray(e.target.value);
                            setDraft((prev) => {
                              if (!prev) return prev;
                              const next = [...prev.assessment_guides];
                              next[idx] = { ...g, bedside_steps: arr };
                              return { ...prev, assessment_guides: next };
                            });
                          }}
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent p-2"
                        />
                      </label>

                      <label className="block">
                        <span className="font-semibold block mb-1">
                          Edge Cases &amp; Pitfalls (one per line)
                        </span>
                        <textarea
                          rows={3}
                          value={g.pitfalls_and_exceptions.join("\n")}
                          onChange={(e) => {
                            const arr = linesToArray(e.target.value);
                            setDraft((prev) => {
                              if (!prev) return prev;
                              const next = [...prev.assessment_guides];
                              next[idx] = { ...g, pitfalls_and_exceptions: arr };
                              return { ...prev, assessment_guides: next };
                            });
                          }}
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent p-2"
                        />
                      </label>

                      <label className="block">
                        <span className="font-semibold block mb-1">
                          Text Exam Prompts (optional, one per line)
                        </span>
                        <textarea
                          rows={2}
                          value={(g.exam_prompts ?? []).join("\n")}
                          onChange={(e) => {
                            const arr = linesToArray(e.target.value);
                            setDraft((prev) => {
                              if (!prev) return prev;
                              const next = [...prev.assessment_guides];
                              next[idx] = {
                                ...g,
                                exam_prompts: arr.length > 0 ? arr : undefined,
                              };
                              return { ...prev, assessment_guides: next };
                            });
                          }}
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent p-2 font-mono"
                        />
                      </label>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === "interpretation" && (
              <div className="space-y-3">
                {draft.interpretation.map((band, idx) => (
                  <div
                    key={band.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2.5"
                  >
                    <div className="font-mono font-bold text-[#0E7490] dark:text-cyan-400">
                      {band.id} ({band.min} – {band.max ?? "∞"}) · {band.severity}
                    </div>
                    <label className="block">
                      <span className="font-semibold block mb-1">Label</span>
                      <input
                        type="text"
                        value={band.label}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraft((prev) => {
                            if (!prev) return prev;
                            const next = [...prev.interpretation];
                            next[idx] = { ...band, label: val };
                            return { ...prev, interpretation: next };
                          });
                        }}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-2.5 py-1.5"
                      />
                    </label>
                    <label className="block">
                      <span className="font-semibold block mb-1">Summary</span>
                      <textarea
                        rows={2}
                        value={band.summary}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraft((prev) => {
                            if (!prev) return prev;
                            const next = [...prev.interpretation];
                            next[idx] = { ...band, summary: val };
                            return { ...prev, interpretation: next };
                          });
                        }}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent p-2"
                      />
                    </label>
                    <label className="block">
                      <span className="font-semibold block mb-1">Clinical Note (optional)</span>
                      <textarea
                        rows={2}
                        value={band.clinical_note ?? ""}
                        onChange={(e) => {
                          const val = e.target.value || undefined;
                          setDraft((prev) => {
                            if (!prev) return prev;
                            const next = [...prev.interpretation];
                            next[idx] = { ...band, clinical_note: val };
                            return { ...prev, interpretation: next };
                          });
                        }}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent p-2"
                      />
                    </label>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "metadata" && (
              <div className="space-y-3">
                <label className="block">
                  <span className="font-semibold block mb-1">Scale Summary</span>
                  <textarea
                    rows={2}
                    value={draft.metadata.summary}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDraft((prev) =>
                        prev
                          ? { ...prev, metadata: { ...prev.metadata, summary: val } }
                          : prev
                      );
                    }}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent p-2"
                  />
                </label>
                <label className="block">
                  <span className="font-semibold block mb-1">Time Estimate</span>
                  <input
                    type="text"
                    value={draft.metadata.time_estimate ?? ""}
                    placeholder="~3 min"
                    onChange={(e) => {
                      const val = e.target.value || undefined;
                      setDraft((prev) =>
                        prev
                          ? {
                              ...prev,
                              metadata: { ...prev.metadata, time_estimate: val },
                            }
                          : prev
                      );
                    }}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-2.5 py-1.5"
                  />
                </label>
                <label className="block">
                  <span className="font-semibold block mb-1">
                    Clinical Pearls (one per line)
                  </span>
                  <textarea
                    rows={4}
                    value={(draft.metadata.clinical_pearls ?? []).join("\n")}
                    onChange={(e) => {
                      const arr = linesToArray(e.target.value);
                      setDraft((prev) =>
                        prev
                          ? {
                              ...prev,
                              metadata: {
                                ...prev.metadata,
                                clinical_pearls: arr.length > 0 ? arr : undefined,
                              },
                            }
                          : prev
                      );
                    }}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent p-2"
                  />
                </label>
              </div>
            )}

            {activeTab === "references" && (
              <div className="space-y-3">
                {draft.references.map((ref, idx) => (
                  <div
                    key={ref.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2.5"
                  >
                    <div className="font-mono font-bold text-[#0E7490] dark:text-cyan-400">
                      {ref.id}
                    </div>
                    <label className="block">
                      <span className="font-semibold block mb-1">Citation</span>
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
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent p-2"
                      />
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <label className="block">
                        <span className="font-semibold block mb-1">Year</span>
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
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-2.5 py-1.5"
                        />
                      </label>
                      <label className="block">
                        <span className="font-semibold block mb-1">PMID</span>
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
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-2.5 py-1.5"
                        />
                      </label>
                      <label className="block">
                        <span className="font-semibold block mb-1">DOI</span>
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
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-2.5 py-1.5"
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-500">
              {changedSections.length === 0
                ? "No section changes yet."
                : `Modified block(s): ${changedSections.join(", ")}`}
            </span>
            <div className="flex items-center gap-2">
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
                onClick={handleSave}
                disabled={saving || changedSections.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0E7490] text-white text-xs font-bold hover:bg-cyan-800 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Save Draft &amp; Sync</span>
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
            setConflictRow(null);
            setPendingMine(null);
            await submitUpdate(resolved, targetRev);
          }}
        />
      )}
    </>
  );
}
