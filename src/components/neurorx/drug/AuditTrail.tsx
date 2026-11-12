"use client";

import React, { useMemo } from "react";
import { ShieldCheck, AlertTriangle, Hash, Calendar, UserCheck, BookOpen, ExternalLink, Lock } from "lucide-react";
import type { DrugRecord, Source, SourceRef } from "@/types/neurorx";

interface AuditTrailProps {
  drug: DrugRecord;
  effectiveStatus: "verified" | "draft" | "retired";
  hashMatches: boolean;
  sources?: Source[];
  darkMode?: boolean;
}

export function AuditTrail({
  drug,
  effectiveStatus,
  hashMatches,
  sources = [],
  darkMode = false,
}: AuditTrailProps) {
  // Collect all SourceRefs present in this drug record to calculate citation counts
  const sourceStats = useMemo(() => {
    const allRefs: SourceRef[] = [];

    const collect = (sourced?: { refs?: SourceRef[] }) => {
      if (sourced?.refs) allRefs.push(...sourced.refs);
    };

    collect(drug.tall_man);
    collect(drug.vn_products);
    collect(drug.bhyt);
    collect(drug.renal_basis);
    collect(drug.hepatic);
    collect(drug.black_box);
    collect(drug.mg_safety);
    collect(drug.ng_tube);
    collect(drug.pgx);
    collect(drug.ae_tags);
    collect(drug.mechanism_of_action);
    collect(drug.enzyme_profile);

    if (drug.adverse_effects) {
      collect(drug.adverse_effects.most_common);
      collect(drug.adverse_effects.serious);
    }

    if (drug.regimens) {
      for (const r of drug.regimens) {
        if (r.refs) allRefs.push(...r.refs);
        if (r.hemodialysis?.refs) allRefs.push(...r.hemodialysis.refs);
        if (r.renal_bands) {
          for (const b of r.renal_bands) {
            if (b.refs) allRefs.push(...b.refs);
          }
        }
      }
    }

    if (drug.renal_impairment) {
      if (drug.renal_impairment.refs) allRefs.push(...drug.renal_impairment.refs);
      if (drug.renal_impairment.hemodialysis?.refs) {
        allRefs.push(...drug.renal_impairment.hemodialysis.refs);
      }
      for (const b of drug.renal_impairment.bands) {
        if (b.refs) allRefs.push(...b.refs);
      }
    }

    if (drug.reproductive) {
      collect(drug.reproductive.tier);
      collect(drug.reproductive.folic_acid);
      collect(drug.reproductive.pregnancy_pk);
      collect(drug.reproductive.postpartum);
      collect(drug.reproductive.contraception);
      collect(drug.reproductive.lactation_rid);
      collect(drug.reproductive.lactation_summary);
      if (drug.reproductive.mcm) {
        for (const m of drug.reproductive.mcm) {
          if (m.refs) allRefs.push(...m.refs);
        }
      }
    }

    // Deduplicate by source_id and count locators
    const counts: Record<string, number> = {};
    for (const ref of allRefs) {
      counts[ref.source_id] = (counts[ref.source_id] || 0) + 1;
    }

    return counts;
  }, [drug]);

  const isVerified = effectiveStatus === "verified";
  const storedHash = drug.verification?.content_hash;
  const hashShort = storedHash ? `${storedHash.slice(0, 8)}…` : "Not sealed";

  return (
    <div
      className={`p-5 sm:p-6 rounded-2xl border border-l-4 border-l-slate-400 dark:border-l-slate-600 transition-colors mt-8 space-y-4 ${
        darkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200/90 shadow-sm"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/60 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-sky-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Clinical Provenance &amp; Cryptographic Audit Trail
          </h3>
        </div>

        {/* Effective Status Badge */}
        {isVerified ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Cryptographically Verified</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Unverified Draft</span>
          </span>
        )}
      </div>

      {/* Verification metadata grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        {/* Reviewer */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2.5">
          <UserCheck className="w-4 h-4 text-slate-400 shrink-0" />
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Verified By</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {drug.verification?.verified_by || "Pending review"}
            </span>
          </div>
        </div>

        {/* Date */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2.5">
          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Verification Date</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {drug.verification?.verified_at || "—"}
            </span>
          </div>
        </div>

        {/* Content Hash */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2.5">
          <Hash className="w-4 h-4 text-slate-400 shrink-0" />
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">SHA-256 Hash Seal</span>
            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200" title={storedHash || undefined}>
              {hashShort}
            </span>
          </div>
        </div>
      </div>

      {/* Registered Sources Cited */}
      <div className="space-y-2 pt-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
          Primary Source Registrations Cited in this Monograph:
        </span>
        <div className="space-y-2">
          {Object.entries(sourceStats).map(([sourceId, count]) => {
            const sourceMeta = sources.find((s) => s.id === sourceId);
            return (
              <div
                key={sourceId}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-sky-500 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {sourceMeta?.title || sourceId}
                    </span>
                    <span className="text-slate-400 text-[11px] block sm:inline sm:ml-2">
                      ({sourceMeta?.publisher || "Registered Source"} • {count} verbatim quote{count > 1 ? "s" : ""})
                    </span>
                  </div>
                </div>

                {sourceMeta?.url && (
                  <a
                    href={sourceMeta.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline shrink-0"
                  >
                    <span>Official FDA Label</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
