"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Calculator,
  Check,
  CheckCircle2,
  Copy,
  Edit,
  ExternalLink,
  History,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import {
  useNeuroCalcScales,
  type UseNeuroCalcScalesResult,
} from "@/hooks/useNeuroCalcScales";
import { computeRecordContentHashSync } from "@/lib/neurocalc/integrity";
import { CALC_SECTIONS } from "@/lib/neurocalc/sync/jsonPatch";
import type { SyncRow } from "@/lib/neurocalc/sync/types";
import type { ScaleRecord } from "@/types/neurocalc";
import { getStoredAdminToken } from "@/utils/clientAuth";
import { EditScaleBlockModal } from "./EditScaleBlockModal";
import { HistoryPanel } from "./HistoryPanel";

interface NeuroCalcAdminSectionProps {
  darkMode?: boolean;
  syncState?: UseNeuroCalcScalesResult;
}

export function NeuroCalcAdminSection({
  darkMode = false,
  syncState: externalSyncState,
}: NeuroCalcAdminSectionProps) {
  const localSyncState = useNeuroCalcScales({ enabled: !externalSyncState });
  const syncState = externalSyncState ?? localSyncState;

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "verified" | "draft">("all");
  const [verifyingSlug, setVerifyingSlug] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<SyncRow | null>(null);
  const [historyRow, setHistoryRow] = useState<SyncRow | null>(null);
  const [copiedRoot, setCopiedRoot] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const stats = useMemo(() => {
    let verified = 0;
    let draft = 0;
    let hashMismatch = 0;
    for (const item of syncState.scales) {
      if (item.effectiveStatus === "verified") verified += 1;
      else if (item.effectiveStatus === "draft") draft += 1;
      if (item.scale.status === "verified" && !item.hashMatches) {
        hashMismatch += 1;
      }
    }
    return {
      total: syncState.scales.length,
      verified,
      draft,
      hashMismatch,
    };
  }, [syncState.scales]);

  const filteredScales = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return syncState.scales.filter((item) => {
      if (statusFilter !== "all" && item.effectiveStatus !== statusFilter) {
        return false;
      }
      if (!q) return true;
      const m = item.scale.metadata;
      return (
        item.scale.id.toLowerCase().includes(q) ||
        m.short_name.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q)
      );
    });
  }, [syncState.scales, searchQuery, statusFilter]);

  const handleCopyRootHash = () => {
    if (!syncState.rootHash) return;
    void navigator.clipboard?.writeText(syncState.rootHash);
    setCopiedRoot(true);
    setTimeout(() => setCopiedRoot(false), 1800);
  };

  const handleVerifyScale = async (scale: ScaleRecord) => {
    const syncRow = syncState.rowsBySlug.get(scale.id);
    if (!syncRow) return;

    setVerifyingSlug(scale.id);
    setErrorMsg(null);
    setActionMsg(null);
    try {
      const contentHash = computeRecordContentHashSync(scale);
      const verifiedScale: ScaleRecord = {
        ...scale,
        status: "verified",
        verification: {
          verified_by: "Admin",
          verified_at: new Date().toISOString(),
          content_hash: contentHash,
        },
      };

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
            expectedRev: syncRow.rev,
            data: verifiedScale,
            actor: "admin",
          }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json?.row) {
        setErrorMsg(json?.error || `Verification failed (${res.status})`);
        return;
      }

      await syncState.applyLocalWrite(json.row as SyncRow);
      window.dispatchEvent(new CustomEvent("neurocalc_scale_updated"));
      setActionMsg(`Verified '${scale.metadata.short_name}' (rev ${(json.row as SyncRow).rev}).`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Network error verifying scale.");
    } finally {
      setVerifyingSlug(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Sync Health & Merkle Root Banner */}
      <div
        className={`rounded-2xl border p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 ${
          darkMode
            ? "bg-slate-900/70 border-slate-800"
            : "bg-white border-slate-200 shadow-xs"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#0E7490]/15 text-[#0E7490] dark:text-cyan-400">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold tracking-tight">
              NeuroCalc — Granular Blocks &amp; Merkle Sync v2
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-slate-500 font-mono">
              <span>status: {syncState.status}</span>
              <span>·</span>
              <span>maxSeq: #{syncState.lastSeq}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                rootHash: {syncState.rootHash ? `${syncState.rootHash.slice(0, 14)}…` : "—"}
                {syncState.rootHash && (
                  <button
                    type="button"
                    onClick={handleCopyRootHash}
                    className="p-0.5 hover:text-[#0E7490]"
                    title="Copy full rootHash"
                  >
                    {copiedRoot ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                )}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void syncState.refresh()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sync Now</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Scales", value: stats.total, tone: "text-slate-900 dark:text-white" },
          { label: "Verified", value: stats.verified, tone: "text-emerald-600 dark:text-emerald-400" },
          { label: "Draft / Pending", value: stats.draft, tone: "text-amber-600 dark:text-amber-400" },
          { label: "Hash Mismatch", value: stats.hashMismatch, tone: "text-rose-600 dark:text-rose-400" },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className={`rounded-2xl border p-4 ${
              darkMode
                ? "bg-slate-900/60 border-slate-800"
                : "bg-white border-slate-200 shadow-xs"
            }`}
          >
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {kpi.label}
            </div>
            <div className={`text-2xl font-black mt-1 tabular-nums ${kpi.tone}`}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {actionMsg && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          {actionMsg}
        </div>
      )}
      {errorMsg && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs font-semibold text-rose-700 dark:text-rose-300">
          {errorMsg}
        </div>
      )}

      {/* Search & Status Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter scales by slug, short_name, or name..."
            className={`w-full rounded-xl border pl-10 pr-4 py-2 text-xs ${
              darkMode
                ? "bg-slate-900 border-slate-800 text-white"
                : "bg-white border-slate-200 text-slate-900"
            }`}
          />
        </div>
        <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-800 p-1 bg-white dark:bg-slate-900">
          {(["all", "verified", "draft"] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize ${
                statusFilter === st
                  ? "bg-[#0E7490] text-white"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Scale List */}
      {filteredScales.length === 0 ? (
        <div
          className={`rounded-2xl border border-dashed p-10 text-center text-xs ${
            darkMode
              ? "border-slate-800 text-slate-400"
              : "border-slate-300 text-slate-500"
          }`}
        >
          No scales in Supabase Sync v2 yet. Seed Wave 1 via{" "}
          <code className="font-mono font-semibold">npm run calc:migrate-v2 -- --apply</code>.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredScales.map((entry) => {
            const { scale, effectiveStatus, hashMatches } = entry;
            const row = syncState.rowsBySlug.get(scale.id);
            const isVerified = effectiveStatus === "verified";

            return (
              <div
                key={scale.id}
                className={`rounded-2xl border p-4 space-y-3 ${
                  darkMode
                    ? "bg-slate-900/60 border-slate-800"
                    : "bg-white border-slate-200 shadow-xs"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-extrabold">
                        {scale.metadata.short_name}
                      </span>
                      <span className="font-mono text-xs text-slate-500">
                        ({scale.id})
                      </span>
                      {isVerified ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 text-[11px] font-bold">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Verified</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 px-2.5 py-0.5 text-[11px] font-bold">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>
                            {scale.status === "verified" && !hashMatches
                              ? "Hash Mismatch (Draft)"
                              : "Draft"}
                          </span>
                        </span>
                      )}
                      {row && (
                        <span className="font-mono text-[11px] text-slate-500">
                          rev {row.rev} · by {row.updatedBy}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {scale.metadata.name} · {scale.items.length} items ·{" "}
                      {scale.assessment_guides.length} guides
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {row && (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditingRow(row)}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit Scale</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setHistoryRow(row)}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <History className="w-3.5 h-3.5" />
                          <span>History</span>
                        </button>
                      </>
                    )}
                    {!isVerified && row && (
                      <button
                        type="button"
                        disabled={verifyingSlug === scale.id}
                        onClick={() => void handleVerifyScale(scale)}
                        className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {verifyingSlug === scale.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        <span>Verify</span>
                      </button>
                    )}
                    <Link
                      href={`/neurocalc?scale=${encodeURIComponent(scale.id)}`}
                      className="inline-flex items-center gap-1 rounded-xl border border-[#0E7490]/40 bg-[#0E7490]/10 px-3 py-1.5 text-xs font-semibold text-[#0E7490] dark:text-cyan-300 hover:bg-[#0E7490]/20"
                    >
                      <span>Open</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>

                {/* 6 Granular Block Section Hashes */}
                {row && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200/70 dark:border-slate-800 text-[10.5px] font-mono">
                    {CALC_SECTIONS.map((sec) => {
                      const h = row.sectionHashes?.[sec];
                      return (
                        <span
                          key={sec}
                          className="rounded-md bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 text-slate-600 dark:text-slate-400"
                        >
                          {sec}: {h ? h.slice(0, 8) : "—"}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <EditScaleBlockModal
        isOpen={Boolean(editingRow)}
        syncRow={editingRow}
        darkMode={darkMode}
        onClose={() => setEditingRow(null)}
        onSaved={async (updatedRow) => {
          await syncState.applyLocalWrite(updatedRow);
          window.dispatchEvent(new CustomEvent("neurocalc_scale_updated"));
          setActionMsg(`Saved draft changes for '${updatedRow.slug}' (rev ${updatedRow.rev}).`);
        }}
      />

      {historyRow && (
        <HistoryPanel
          isOpen={true}
          uid={historyRow.uid}
          scaleName={historyRow.data.metadata.short_name}
          currentRev={historyRow.rev}
          darkMode={darkMode}
          onClose={() => setHistoryRow(null)}
          onRestored={async (restoredRow) => {
            await syncState.applyLocalWrite(restoredRow);
            setHistoryRow(restoredRow);
            window.dispatchEvent(new CustomEvent("neurocalc_scale_updated"));
            setActionMsg(`Restored '${restoredRow.slug}' as draft (rev ${restoredRow.rev}).`);
          }}
        />
      )}
    </div>
  );
}
