"use client";

import React, { useState, useEffect, useMemo, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Zap,
  ArrowRightLeft,
  RotateCcw,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import type { DrugWithEffectiveStatus } from "@/lib/neurorx/data";
import type { Interaction, Source, InteractionAlternative } from "@/types/neurorx";
import { analyzeRegimen } from "@/lib/neurorx/interactions";
import { RegimenTagInput } from "./RegimenTagInput";
import { InteractionCard } from "./InteractionCard";

interface InteractionsTabProps {
  drugs: DrugWithEffectiveStatus[];
  interactions: Interaction[];
  sources?: Source[];
  darkMode?: boolean;
}

interface SwapDialogState {
  isOpen: boolean;
  fromId: string;
  toId: string;
  alternative: InteractionAlternative;
}

interface UndoToastState {
  visible: boolean;
  message: string;
  previousDrugIds: string[];
}

export function InteractionsTab({
  drugs,
  interactions,
  sources = [],
  darkMode = false,
}: InteractionsTabProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // 1. Regimen state synced with ?rx=a,b,c
  const rxParam = searchParams.get("rx") || "";
  const initialSelectedIds = useMemo(() => {
    return rxParam
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && drugs.some((d) => d.drug.id === s));
  }, [rxParam, drugs]);

  const [selectedDrugIds, setSelectedDrugIds] = useState<string[]>(initialSelectedIds);

  useEffect(() => {
    setSelectedDrugIds(initialSelectedIds);
  }, [initialSelectedIds]);

  const updateUrlRegimen = (ids: string[]) => {
    const params = new URLSearchParams(searchParams.toString());
    if (ids.length > 0) {
      params.set("rx", ids.join(","));
    } else {
      params.delete("rx");
    }
    // Keep tab=interactions
    params.set("tab", "interactions");
    startTransition(() => {
      router.push(`/neurorx?${params.toString()}`, { scroll: false });
    });
  };

  const handleAddDrug = (drugId: string) => {
    if (!selectedDrugIds.includes(drugId)) {
      const next = [...selectedDrugIds, drugId];
      setSelectedDrugIds(next);
      updateUrlRegimen(next);
    }
  };

  const handleRemoveDrug = (drugId: string) => {
    const next = selectedDrugIds.filter((id) => id !== drugId);
    setSelectedDrugIds(next);
    updateUrlRegimen(next);
  };

  const handleClearAll = () => {
    setSelectedDrugIds([]);
    updateUrlRegimen([]);
  };

  // 2. Pure Engine Evaluation
  const rawDrugs = useMemo(() => drugs.map((d) => d.drug), [drugs]);
  const analysisResult = useMemo(() => {
    return analyzeRegimen(selectedDrugIds, {
      drugs: rawDrugs,
      interactions,
    });
  }, [selectedDrugIds, rawDrugs, interactions]);

  // 3. Swap Simulation Dialog & Undo Toast States
  const [swapDialog, setSwapDialog] = useState<SwapDialogState>({
    isOpen: false,
    fromId: "",
    toId: "",
    alternative: { drug_id: "", rationale: "" },
  });

  const [undoToast, setUndoToast] = useState<UndoToastState>({
    visible: false,
    message: "",
    previousDrugIds: [],
  });

  const getDrugName = (id: string): string => {
    const item = drugs.find((d) => d.drug.id === id);
    if (!item) return id;
    const tall = item.drug.tall_man?.value;
    return tall || item.drug.generic_name;
  };

  const handleOpenSimulateSwap = (
    fromId: string,
    toId: string,
    alternative: InteractionAlternative
  ) => {
    setSwapDialog({
      isOpen: true,
      fromId,
      toId,
      alternative,
    });
  };

  const handleConfirmSwap = () => {
    const prevIds = [...selectedDrugIds];
    const fromName = getDrugName(swapDialog.fromId);
    const toName = getDrugName(swapDialog.toId);

    // Replace fromId with toId (or add toId if fromId not present)
    const nextIds = selectedDrugIds.map((id) =>
      id === swapDialog.fromId ? swapDialog.toId : id
    );
    // Deduplicate in case toId was already present
    const uniqueNext = Array.from(new Set(nextIds));

    setSelectedDrugIds(uniqueNext);
    updateUrlRegimen(uniqueNext);

    setSwapDialog((prev) => ({ ...prev, isOpen: false }));
    setUndoToast({
      visible: true,
      message: `Replaced ${fromName} with ${toName}`,
      previousDrugIds: prevIds,
    });
  };

  const handleUndoSwap = () => {
    setSelectedDrugIds(undoToast.previousDrugIds);
    updateUrlRegimen(undoToast.previousDrugIds);
    setUndoToast({ visible: false, message: "", previousDrugIds: [] });
  };

  const totalAlertsCount =
    analysisResult.curated.length +
    analysisResult.mechanism.length +
    analysisResult.mg.length;

  return (
    <div className="space-y-6">
      {/* 1. Medication Selector Tag Input */}
      <RegimenTagInput
        selectedDrugIds={selectedDrugIds}
        onAddDrug={handleAddDrug}
        onRemoveDrug={handleRemoveDrug}
        onClearAll={handleClearAll}
        allDrugs={drugs}
        darkMode={darkMode}
      />

      {/* 2. Undo Toast */}
      {undoToast.visible && (
        <div
          className={`p-3.5 rounded-2xl border flex items-center justify-between shadow-lg transition-all animate-in fade-in duration-200 ${
            darkMode
              ? "bg-indigo-950/80 border-indigo-700/60 text-indigo-200"
              : "bg-indigo-50 border-indigo-200 text-indigo-900"
          }`}
        >
          <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
            <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>{undoToast.message}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleUndoSwap}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border transition-colors ${
                darkMode
                  ? "bg-indigo-900 hover:bg-indigo-800 border-indigo-600 text-white"
                  : "bg-white hover:bg-indigo-100 border-indigo-300 text-indigo-800 shadow-sm"
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Undo</span>
            </button>
            <button
              onClick={() => setUndoToast({ visible: false, message: "", previousDrugIds: [] })}
              className="p-1 rounded-lg hover:bg-indigo-200/50 dark:hover:bg-indigo-900/50 text-indigo-400"
              aria-label="Dismiss toast"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 3. Empty State (< 2 drugs) */}
      {selectedDrugIds.length < 2 && (
        <div
          className={`p-8 rounded-2xl border text-center transition-colors ${
            darkMode
              ? "bg-slate-900/40 border-slate-800"
              : "bg-white border-slate-200/80 shadow-sm"
          }`}
        >
          <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 text-amber-500 mb-3">
            <Zap className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            {selectedDrugIds.length === 0
              ? "Add Medications to Begin DDI Analysis"
              : "Add at Least One More Medication"}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
            Select 2 or more active medications from the omnibar above. NeuroRx will screen for pairwise clinical drug-drug interactions, mechanism-based enzymatic warnings, and neuromuscular vulnerability.
          </p>
        </div>
      )}

      {/* 4. Empty State (≥ 2 drugs, 0 alerts found) */}
      {selectedDrugIds.length >= 2 && totalAlertsCount === 0 && (
        <div
          className={`p-6 rounded-2xl border transition-colors ${
            darkMode
              ? "bg-slate-900/40 border-slate-800 text-slate-300"
              : "bg-white border-slate-200 shadow-sm text-slate-700"
          }`}
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Analysis Complete
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                No curated interaction found in NeuroRx data — this is not proof of safety.
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-500 leading-relaxed pt-1">
                NeuroRx checks verified official prescribing information within its ingested dataset. Clinicians must exercise clinical judgment and verify against comprehensive tertiary compendia before co-prescribing.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 5. Drafts Excluded Banner */}
      {analysisResult.draftsExcluded.length > 0 && (
        <div
          className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs ${
            darkMode
              ? "bg-amber-950/20 border-amber-900/40 text-amber-300"
              : "bg-amber-50 border-amber-200 text-amber-800"
          }`}
        >
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
          <span>
            Note: Enzyme profile of draft record(s) (
            <strong>
              {analysisResult.draftsExcluded
                .map((id) => getDrugName(id))
                .join(", ")}
            </strong>
            ) excluded from automated mechanism flags pending clinical verification.
          </span>
        </div>
      )}

      {/* 6. Interaction Result Cards */}
      {selectedDrugIds.length >= 2 && totalAlertsCount > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Identified Clinical Alerts</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                {totalAlertsCount}
              </span>
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Sorted by clinical severity
            </span>
          </div>

          {/* (a) Curated Hits */}
          {analysisResult.curated.map((hit) => (
            <InteractionCard
              key={hit.id}
              hit={hit}
              allDrugs={drugs}
              sources={sources}
              onSimulateSwap={handleOpenSimulateSwap}
              darkMode={darkMode}
            />
          ))}

          {/* (b) Mechanism Flags */}
          {analysisResult.mechanism.map((flag) => (
            <InteractionCard
              key={flag.id}
              flag={flag}
              allDrugs={drugs}
              sources={sources}
              darkMode={darkMode}
            />
          ))}

          {/* (c) Myasthenia Gravis Safety */}
          {analysisResult.mg.map((mg) => (
            <InteractionCard
              key={`mg-${mg.drug_id}`}
              mg={mg}
              allDrugs={drugs}
              sources={sources}
              darkMode={darkMode}
            />
          ))}
        </div>
      )}

      {/* 7. Simulate Swap Confirmation Modal */}
      {swapDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className={`w-full max-w-lg rounded-2xl border p-5 sm:p-6 shadow-2xl transition-all ${
              darkMode ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-white border-slate-200 text-slate-900"
            }`}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold">Simulate Regimen Modification</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Replace interacting medication with curated alternative
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSwapDialog((prev) => ({ ...prev, isOpen: false }))}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Current Agent
                  </span>
                  <span className="font-extrabold text-slate-900 dark:text-slate-100">
                    {getDrugName(swapDialog.fromId)}
                  </span>
                </div>
                <ArrowRightLeft className="w-4 h-4 text-indigo-500 shrink-0" />
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Proposed Alternative
                  </span>
                  <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                    {getDrugName(swapDialog.toId)}
                  </span>
                </div>
              </div>

              <div>
                <span className="font-bold block mb-0.5 text-slate-800 dark:text-slate-200">
                  Clinical Rationale:
                </span>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {swapDialog.alternative.rationale}
                </p>
              </div>

              <div>
                <span className="font-bold block mb-0.5 text-slate-800 dark:text-slate-200">
                  Switching Guidance:
                </span>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed italic">
                  {swapDialog.alternative.switch_note ||
                    "No switching guidance in sources."}
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setSwapDialog((prev) => ({ ...prev, isOpen: false }))}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                  darkMode
                    ? "border-slate-700 hover:bg-slate-800 text-slate-300"
                    : "border-slate-200 hover:bg-slate-100 text-slate-700"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSwap}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
              >
                Confirm Modification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
