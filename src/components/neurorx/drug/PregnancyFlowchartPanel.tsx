"use client";

import React, { useState } from "react";
import { GitBranch, ChevronDown, ChevronUp, ArrowDown } from "lucide-react";

type FlowchartId = "esc-urgent-delivery" | "esc-mhv-pregnancy";

interface PregnancyFlowchartPanelProps {
  drugId: string;
  darkMode?: boolean;
}

function getAvailableFlowcharts(drugId: string): { id: FlowchartId; buttonLabel: string }[] {
  const id = drugId.toLowerCase();
  if (id === "warfarin" || id === "enoxaparin" || id === "heparin") {
    return [
      {
        id: "esc-mhv-pregnancy",
        buttonLabel: "Show Mechanical Heart Valve Anticoagulation Flowchart (ESC)",
      },
      {
        id: "esc-urgent-delivery",
        buttonLabel: "Show Urgent Delivery Anticoagulant Flowchart (ESC)",
      },
    ];
  }
  if (
    id === "prothrombin-complex-concentrate" ||
    id === "phytonadione" ||
    id === "protamine"
  ) {
    return [
      {
        id: "esc-urgent-delivery",
        buttonLabel: "Show Urgent Delivery Anticoagulant Flowchart (ESC)",
      },
    ];
  }
  return [];
}

function EscUrgentDeliveryFlowchart() {
  return (
    <div className="p-3.5 sm:p-4 rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-slate-50/70 dark:bg-slate-950/50 space-y-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <span className="font-extrabold text-slate-900 dark:text-slate-100">
          ESC Figure 5 · Management of Urgent Delivery in Women Under Anticoagulants
        </span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-300">
          ESC Guidelines
        </span>
      </div>

      {/* Entry node */}
      <div className="mx-auto max-w-md text-center p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-slate-900 dark:text-slate-100 shadow-xs">
        Woman on therapeutic anticoagulants arriving in established labour
      </div>

      <div className="flex justify-center">
        <ArrowDown className="w-4 h-4 text-slate-400" />
      </div>

      {/* Main decision: VKA vs LMWH vs IV UFH */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Branch A: VKA = Yes */}
        <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-900/80 space-y-2 flex flex-col">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              VKA (Warfarin) — Yes
            </span>
          </div>
          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-center font-semibold text-slate-800 dark:text-slate-200">
            Stop VKA and check INR
          </div>
          <div className="flex justify-center">
            <ArrowDown className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-center text-slate-800 dark:text-slate-200">
            <div className="font-semibold">Prepare RBC</div>
            <div>Give 4F-PCC (FFP if 4F-PCC not available)</div>
          </div>
          <div className="flex justify-center">
            <ArrowDown className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-center font-semibold text-slate-800 dark:text-slate-200">
            Consider vitamin K
          </div>
          <div className="flex justify-center">
            <ArrowDown className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="mt-auto p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-center font-bold text-emerald-800 dark:text-emerald-300">
            Caesarean section with general anaesthesia for foetal protection (Class I)
          </div>
        </div>

        {/* Branch B: VKA = No (LMWH or i.v. UFH) */}
        <div className="p-3 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-white dark:bg-slate-900/80 space-y-2.5">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
            VKA — No (LMWH or i.v. UFH)
          </span>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/50 text-center font-bold text-indigo-900 dark:text-indigo-200">
                LMWH → Stop LMWH
              </div>
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-center font-semibold text-slate-800 dark:text-slate-200">
                Delivery in next 24 h?
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/50 text-center font-bold text-indigo-900 dark:text-indigo-200">
                i.v. UFH → Stop UFH
              </div>
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-center font-semibold text-slate-800 dark:text-slate-200">
                Delivery in next 4–6 h &amp; aPTT not normalized?
              </div>
            </div>
          </div>

          {/* If Yes */}
          <div className="p-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/50 space-y-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
              If YES (urgent delivery window)
            </span>
            <div className="grid grid-cols-2 gap-2 text-center font-semibold text-slate-800 dark:text-slate-200">
              <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                Consider protamine sulfate
              </div>
              <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                Consider caesarean section with general anaesthesia
              </div>
            </div>
          </div>

          {/* If No */}
          <div className="p-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/50 space-y-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
              If NO (outside window / normalized)
            </span>
            <div className="p-2 rounded bg-emerald-500/15 border border-emerald-500/30 text-center font-bold text-emerald-800 dark:text-emerald-300">
              Proceed with neuraxial anaesthesia and vaginal delivery unless obstetric indication for caesarean section (Class I)
            </div>
            <div className="p-2 rounded bg-amber-500/15 border border-amber-500/30 text-center font-bold text-amber-800 dark:text-amber-300">
              Actively manage the third stage with oxytocin to reduce risk of PPH (Class IIa)
            </div>
          </div>
        </div>
      </div>

      {/* Post-delivery */}
      <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
          Post-delivery
        </span>
        <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 font-semibold text-emerald-800 dark:text-emerald-300">
          After delivery, postpone the switch from heparin back to oral anticoagulants until 7–14 days post-partum when the wound area has healed, in consultation with the Pregnancy Heart Team (Class I).
        </div>
        <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-slate-700 dark:text-slate-300">
          If neuraxial anaesthesia catheter insertion was traumatic, do not start therapeutic dose anticoagulation for at least 24 h after removal.
        </div>
      </div>

      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
        Abbreviations: aPTT, activated partial thromboplastin time; FFP, fresh frozen plasma; INR, international normalized ratio; i.v., intravenous; LMWH, low-molecular-weight heparin; 4F-PCC, four-factor prothrombin complex concentrate; PPH, post-partum haemorrhage; RBC, red blood cell; UFH, unfractionated heparin; VKA, vitamin K antagonist.
      </p>
    </div>
  );
}

function EscMhvPregnancyFlowchart() {
  return (
    <div className="p-3.5 sm:p-4 rounded-xl border border-indigo-200/80 dark:border-indigo-900/50 bg-slate-50/70 dark:bg-slate-950/50 space-y-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <span className="font-extrabold text-slate-900 dark:text-slate-100">
          ESC Figure 21 · Anticoagulation in Pregnant Women With Mechanical Heart Valves
        </span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
          ESC Guidelines
        </span>
      </div>

      {/* Header */}
      <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-center font-bold text-emerald-800 dark:text-emerald-300">
        Management of pregnant women with mechanical heart valves by the Pregnancy Heart Team (Class I)
      </div>

      {/* Initial Gate */}
      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
        <div className="font-bold text-center text-slate-900 dark:text-slate-100">
          Good control of anticoagulation with therapeutic INRs?
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="p-2 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50">
            <span className="font-extrabold text-emerald-700 dark:text-emerald-400">If YES:</span>{" "}
            Pregnancy Heart Team decision taking into account: high risk of valve thrombosis, VKA dose (low vs high), and maternal choice.
          </div>
          <div className="p-2 rounded-lg bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/50">
            <span className="font-extrabold text-rose-700 dark:text-rose-400">If NO:</span>{" "}
            Counsel that pregnancy risks are very high; discuss pregnancy alternatives.
          </div>
        </div>
      </div>

      {/* First Trimester */}
      <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
          First Trimester (Risk of Embryopathy)
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 space-y-1">
            <div className="font-bold text-slate-900 dark:text-slate-100">Dose-adjusted LMWH</div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              No high-risk of valve thrombosis • High-dose VKA • Availability of anti-factor Xa testing
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 space-y-1">
            <div className="font-bold text-slate-900 dark:text-slate-100">Continue VKA</div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              High risk of valve thrombosis (especially if low-dose VKA)
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 space-y-1">
            <div className="font-bold text-slate-900 dark:text-slate-100">Continuous i.v. UFH (rarely used)</div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              High risk of valve thrombosis • Only if high VKA dose and/or no anti-factor Xa testing available
            </p>
          </div>
        </div>
      </div>

      {/* Second / Third Trimester */}
      <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
          Second / Third Trimester (Pregnancy Heart Team Decision)
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-center font-bold text-slate-800 dark:text-slate-200">
            VKA (usual care)
          </div>
          <div className="p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-center font-bold text-amber-800 dark:text-amber-300">
            VKA, if higher risk of valve thrombosis (Class IIa)
          </div>
          <div className="p-2.5 rounded-lg bg-orange-500/15 border border-orange-500/30 space-y-1 text-orange-900 dark:text-orange-200">
            <div className="font-bold text-center">Dose-adjusted LMWH (Class IIb)</div>
            <p className="text-[11px] text-center">
              If lower risk of valve thrombosis &amp; anti-factor Xa testing available
            </p>
          </div>
        </div>
      </div>

      {/* Last 2 weeks & High-Risk Box */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-slate-700 dark:text-slate-300">
          <span className="font-bold block mb-0.5">Last 2 weeks of pregnancy &amp; delivery:</span>
          Transition to heparin/LMWH and follow the Urgent Delivery Anticoagulant Flowchart (ESC Figure 5).
        </div>
        <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          <span className="font-bold block mb-0.5">High risk of valve thrombosis criteria:</span>
          Right-sided valves, mitral valve replacement, atrial fibrillation, poor LV function, previous thrombotic events, valve dysfunction (especially stenosis), smoker/other clotting risks, older-generation valves.
        </div>
      </div>
    </div>
  );
}

export function PregnancyFlowchartPanel({
  drugId,
  darkMode = false,
}: PregnancyFlowchartPanelProps) {
  const flowcharts = getAvailableFlowcharts(drugId);
  const [openFlowchart, setOpenFlowchart] = useState<FlowchartId | null>(null);

  if (flowcharts.length === 0) return null;

  return (
    <div className="pt-2 space-y-2.5">
      <div className="flex flex-wrap gap-2">
        {flowcharts.map((fc) => {
          const isOpen = openFlowchart === fc.id;
          return (
            <button
              key={fc.id}
              type="button"
              onClick={() => setOpenFlowchart(isOpen ? null : fc.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                isOpen
                  ? darkMode
                    ? "bg-rose-950/60 border-rose-700 text-rose-200"
                    : "bg-rose-50 border-rose-300 text-rose-700"
                  : darkMode
                  ? "bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800"
                  : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-2xs"
              }`}
            >
              <GitBranch className="w-3.5 h-3.5 shrink-0" />
              <span>{fc.buttonLabel}</span>
              {isOpen ? (
                <ChevronUp className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {openFlowchart === "esc-urgent-delivery" && <EscUrgentDeliveryFlowchart />}
      {openFlowchart === "esc-mhv-pregnancy" && <EscMhvPregnancyFlowchart />}
    </div>
  );
}
