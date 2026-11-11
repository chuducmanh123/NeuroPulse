"use client";

import React from "react";
import { ShieldCheck, ShieldAlert, FileText, GitCompare, Database, AlertOctagon } from "lucide-react";

interface DataHealthProps {
  health: {
    total_drugs: number;
    verified_count: number;
    draft_count: number;
    hash_mismatch_count: number;
    sources_count: number;
    interactions_count: number;
  };
  versionHash: string;
  darkMode?: boolean;
}

export function DataHealth({ health, versionHash, darkMode = false }: DataHealthProps) {
  return (
    <div className="space-y-4">
      {/* Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Drugs */}
        <div
          className={`p-3.5 rounded-xl border transition-colors ${
            darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
            <Database className="w-4 h-4 text-sky-500" />
            <span>Total Drugs</span>
          </div>
          <span className="text-xl font-extrabold font-mono text-slate-900 dark:text-slate-100">
            {health.total_drugs}
          </span>
        </div>

        {/* Verified Records */}
        <div
          className={`p-3.5 rounded-xl border transition-colors ${
            darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Verified (Locked)</span>
          </div>
          <span className="text-xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
            {health.verified_count}
          </span>
        </div>

        {/* Draft Records */}
        <div
          className={`p-3.5 rounded-xl border transition-colors ${
            darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-semibold mb-1">
            <ShieldAlert className="w-4 h-4" />
            <span>Draft Records</span>
          </div>
          <span className="text-xl font-extrabold font-mono text-amber-600 dark:text-amber-400">
            {health.draft_count}
          </span>
        </div>

        {/* Hash Mismatch */}
        <div
          className={`p-3.5 rounded-xl border transition-colors ${
            health.hash_mismatch_count > 0
              ? "bg-rose-500/10 border-rose-500/40 text-rose-600"
              : darkMode
              ? "bg-slate-900 border-slate-800"
              : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-semibold mb-1">
            <AlertOctagon className="w-4 h-4 text-rose-500" />
            <span>Hash Mismatch</span>
          </div>
          <span className="text-xl font-extrabold font-mono text-rose-600 dark:text-rose-400">
            {health.hash_mismatch_count}
          </span>
        </div>

        {/* Official Sources */}
        <div
          className={`p-3.5 rounded-xl border transition-colors ${
            darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
            <FileText className="w-4 h-4 text-indigo-500" />
            <span>Official Sources</span>
          </div>
          <span className="text-xl font-extrabold font-mono text-slate-900 dark:text-slate-100">
            {health.sources_count}
          </span>
        </div>

        {/* Interactions */}
        <div
          className={`p-3.5 rounded-xl border transition-colors ${
            darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
            <GitCompare className="w-4 h-4 text-purple-500" />
            <span>Interactions</span>
          </div>
          <span className="text-xl font-extrabold font-mono text-slate-900 dark:text-slate-100">
            {health.interactions_count}
          </span>
        </div>
      </div>

      {/* Provenance Status Bar */}
      <div
        className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
          darkMode
            ? "bg-slate-950/50 border-slate-800 text-slate-400"
            : "bg-slate-50 border-slate-200 text-slate-600"
        }`}
      >
        <div className="flex items-center gap-2 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>
            Cryptographic Provenance Engine: Canonical SHA-256 key hashing strictly verified.
          </span>
        </div>
        <div className="font-mono text-[11px] font-bold">
          Data Version: <span className="text-sky-600 dark:text-sky-400">v{versionHash}</span>
        </div>
      </div>
    </div>
  );
}
