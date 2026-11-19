"use client";

import React, { useState } from "react";
import { Clock, Printer, HelpCircle, Shield, X, Wrench, Calculator } from "lucide-react";
import type { DrugRecord, Source } from "@/types/neurorx";
import type { PatientParsed, RenalResolutionResult } from "@/lib/neurorx/patient";
import { HoldRestartModal } from "../tools/HoldRestartModal";
import { ReversalPanel } from "../tools/ReversalPanel";
import { LeddModal } from "../tools/LeddModal";
import { TitrationModal } from "../tools/TitrationModal";
import { MissedDoseModal } from "../tools/MissedDoseModal";

interface ToolsRowProps {
  drug: DrugRecord;
  sources?: Source[];
  patient?: PatientParsed;
  renal?: RenalResolutionResult;
  darkMode?: boolean;
}

export function ToolsRow({
  drug,
  sources = [],
  patient,
  renal,
  darkMode = false,
}: ToolsRowProps) {
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const tools = drug.tools;
  if (!tools) return null;

  const hasHoldRestart = Boolean(tools.hold_restart?.value && tools.hold_restart.value.length > 0);
  const hasTitration = Boolean(tools.titration?.schedules && tools.titration.schedules.length > 0);
  const hasMissedDose = Boolean(tools.missed_dose?.value);
  const hasReversal = Boolean(tools.reversal?.value && tools.reversal.value.length > 0);
  const isParkinson =
    drug.subspecialties?.includes("movement_disorders") ||
    drug.classes?.some((c) => c.toLowerCase().includes("parkinson") || c.toLowerCase().includes("dopamine")) ||
    Boolean((tools as any)?.ledd);

  if (!hasHoldRestart && !hasTitration && !hasMissedDose && !hasReversal && !isParkinson) {
    return null;
  }

  return (
    <>
      <div className="p-4 sm:p-5 rounded-2xl border border-[var(--border-hairline)] border-l-4 border-l-purple-500 bg-[var(--bg-surface)] shadow-xs space-y-3">
        <div className="flex items-center gap-2.5">
          <Wrench className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-purple-900 dark:text-purple-300">
            Contextual Bedside Tools
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-flow-col lg:auto-cols-fr gap-2.5">
          {hasHoldRestart && (
            <button
              type="button"
              onClick={() => setActiveModal("hold_restart")}
              className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-[var(--bg-paper)] border border-[var(--border-hairline)] hover:border-[#2F855A] text-[var(--text-ink)] transition-colors flex items-center justify-center gap-2 shadow-2xs min-h-[44px]"
            >
              <Clock className="w-4 h-4 text-[#2F855A] dark:text-emerald-400 shrink-0" />
              <span className="truncate">Hold / Restart Antithrombotic</span>
            </button>
          )}

          {hasTitration && (
            <button
              type="button"
              onClick={() => setActiveModal("titration")}
              className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-[var(--bg-paper)] border border-[var(--border-hairline)] hover:border-[#2F855A] text-[var(--text-ink)] transition-colors flex items-center justify-center gap-2 shadow-2xs min-h-[44px]"
            >
              <Printer className="w-4 h-4 text-indigo-500 shrink-0" />
              <span className="truncate">Titration Schedule Print</span>
            </button>
          )}

          {hasMissedDose && (
            <button
              type="button"
              onClick={() => setActiveModal("missed_dose")}
              className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-[var(--bg-paper)] border border-[var(--border-hairline)] hover:border-[#2F855A] text-[var(--text-ink)] transition-colors flex items-center justify-center gap-2 shadow-2xs min-h-[44px]"
            >
              <HelpCircle className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="truncate">Missed Dose Protocol</span>
            </button>
          )}

          {hasReversal && (
            <button
              type="button"
              onClick={() => setActiveModal("reversal")}
              className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-[var(--bg-paper)] border border-[var(--border-hairline)] hover:border-[#2F855A] text-[var(--text-ink)] transition-colors flex items-center justify-center gap-2 shadow-2xs min-h-[44px]"
            >
              <Shield className="w-4 h-4 text-rose-500 shrink-0" />
              <span className="truncate">Anticoagulation Reversal</span>
            </button>
          )}

          {isParkinson && (
            <button
              type="button"
              onClick={() => setActiveModal("ledd")}
              className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-[var(--bg-paper)] border border-[var(--border-hairline)] hover:border-[#2F855A] text-[var(--text-ink)] transition-colors flex items-center justify-center gap-2 shadow-2xs min-h-[44px]"
            >
              <Calculator className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="truncate">LEDD / NPO</span>
            </button>
          )}
        </div>
      </div>

      {/* Task 18 Anticoagulation Compass Modals */}
      {activeModal === "hold_restart" && (
        <HoldRestartModal
          drug={drug}
          sources={sources}
          renal={{ crcl: renal?.value ?? undefined }}
          onClose={() => setActiveModal(null)}
          darkMode={darkMode}
        />
      )}

      {activeModal === "reversal" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <ReversalPanel
              drug={drug}
              sources={sources}
              patientWeight={patient?.weightKg}
              onClose={() => setActiveModal(null)}
              darkMode={darkMode}
            />
          </div>
        </div>
      )}

      {/* Task 19 LEDD / NPO Modal */}
      {activeModal === "ledd" && (
        <LeddModal
          sources={sources}
          initialDrugId={drug.id}
          onClose={() => setActiveModal(null)}
          darkMode={darkMode}
        />
      )}

      {/* Task 20 Titration Schedule Modal */}
      {activeModal === "titration" && (
        <TitrationModal
          drug={drug}
          sources={sources}
          onClose={() => setActiveModal(null)}
          darkMode={darkMode}
        />
      )}

      {/* Task 20 Missed Dose Protocol Modal */}
      {activeModal === "missed_dose" && (
        <MissedDoseModal
          drug={drug}
          sources={sources}
          onClose={() => setActiveModal(null)}
          darkMode={darkMode}
        />
      )}
    </>
  );
}
