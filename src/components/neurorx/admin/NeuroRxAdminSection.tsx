"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Database,
  Download,
  Copy,
  Check,
  Terminal,
  RefreshCw,
  GitPullRequest,
  AlertTriangle,
  Edit,
  Trash2,
  Plus,
  Search,
  Sparkles,
  CheckCircle2,
  ChevronDown,
  History,
} from "lucide-react";
import { getStoredAdminToken } from "@/utils/clientAuth";
import { useNeuroRxDrugs } from "@/hooks/useNeuroRxDrugs";
import type { SyncRow } from "@/lib/neurorx/sync/types";
import { DataHealth } from "./DataHealth";
import { UpdateQueueList } from "./UpdateQueueList";
import { ExtractorPanel } from "./ExtractorPanel";
import { EditDrugModal } from "./EditDrugModal";
import { HistoryPanel } from "./HistoryPanel";
import type { UpdateQueueItem, DrugRecord } from "@/types/neurorx";

interface NeuroRxAdminSectionProps {
  darkMode?: boolean;
}

interface AdminDataResponse {
  version_hash: string;
  health: {
    total_drugs: number;
    verified_count: number;
    draft_count: number;
    hash_mismatch_count: number;
    sources_count: number;
    interactions_count: number;
  };
  updates_queue: UpdateQueueItem[];
  drafts: { id: string; name: string; classes: string[]; status: string }[];
  all_drugs?: DrugRecord[];
}

export function NeuroRxAdminSection({ darkMode = false }: NeuroRxAdminSectionProps) {
  const isSyncV2 = process.env.NEXT_PUBLIC_NEURORX_SYNC_V2 === "1";
  const syncState = useNeuroRxDrugs({ enabled: isSyncV2 });

  const [activeSubTab, setActiveSubTab] = useState<"dashboard" | "extractor">("dashboard");
  const [loading, setLoading] = useState(true);
  const [adminMeta, setAdminMeta] = useState<AdminDataResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Verification & Edit states
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verifyingAll, setVerifyingAll] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingDrug, setEditingDrug] = useState<DrugRecord | null>(null);
  const [editingSyncRow, setEditingSyncRow] = useState<SyncRow | null>(null);
  const [isEditingNewDrug, setIsEditingNewDrug] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [historyTargetRow, setHistoryTargetRow] = useState<SyncRow | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "verified" | "draft">("all");
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  const data: AdminDataResponse | null = useMemo(() => {
    if (!isSyncV2) {
      return adminMeta;
    }
    if (syncState.drugs.length === 0 && !adminMeta) {
      return null;
    }
    const allDrugs = syncState.drugs.map((item) => item.drug);
    const verifiedCount = syncState.drugs.filter(
      (item) => item.effectiveStatus === "verified"
    ).length;
    const draftItems = syncState.drugs.filter(
      (item) => item.effectiveStatus === "draft"
    );
    const hashMismatchCount = syncState.drugs.filter(
      (item) => item.drug.status === "verified" && !item.hashMatches
    ).length;

    return {
      version_hash: adminMeta?.version_hash || `sync-v2-seq-${syncState.lastSeq}`,
      health: {
        total_drugs: allDrugs.length,
        verified_count: verifiedCount,
        draft_count: draftItems.length,
        hash_mismatch_count: hashMismatchCount,
        sources_count: adminMeta?.health.sources_count ?? 0,
        interactions_count: adminMeta?.health.interactions_count ?? 0,
      },
      updates_queue: adminMeta?.updates_queue ?? [],
      drafts: draftItems.map((item) => ({
        id: item.drug.id,
        name: item.drug.generic_name,
        classes: item.drug.classes || [],
        status: item.effectiveStatus,
      })),
      all_drugs: allDrugs,
    };
  }, [isSyncV2, adminMeta, syncState.drugs, syncState.lastSeq]);

  const showSuccess = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 4500);
  };

  const fetchAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getStoredAdminToken();
      const res = await fetch("/api/neurorx/admin-data", {
        headers: {
          "x-admin-token": token || "",
        },
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to load NeuroRx admin status");
      }
      setAdminMeta(json.data);
    } catch (err: any) {
      setError(err?.message || "Error connecting to NeuroRx admin API");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleCopyCommand = async (drugId: string) => {
    const cmd = `npm run rx:verify -- ${drugId} --by "Admin"`;
    try {
      await navigator.clipboard.writeText(cmd);
      setCopiedId(drugId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  const handleVerifyDrug = async (drugId: string) => {
    setVerifyingId(drugId);
    try {
      const token = getStoredAdminToken();
      const syncRow = isSyncV2 ? syncState.rowsBySlug.get(drugId) : undefined;
      const res = await fetch("/api/neurorx/manage-drug", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token || "",
        },
        body: JSON.stringify(
          isSyncV2
            ? {
                action: "verify",
                drug_id: drugId,
                uid: syncRow?.uid,
                expected_rev: syncRow?.rev,
                verified_by: "Admin",
              }
            : { action: "verify", drug_id: drugId, verified_by: "Admin" }
        ),
      });
      const json = await res.json();
      if (isSyncV2 && res.status === 409 && json?.code === "REV_CONFLICT") {
        if (json.current) {
          await syncState.applyLocalWrite(json.current as SyncRow);
        }
        throw new Error(
          `Revision conflict detected (latest server revision is rev ${
            json.currentRev ?? "newer"
          }). View synced; review and retry.`
        );
      }
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Unable to verify drug.");
      }
      if (isSyncV2 && json.row) {
        await syncState.applyLocalWrite(json.row as SyncRow);
      } else {
        await fetchAdminData();
      }
      showSuccess(json.message || "✓ Drug successfully verified and cryptographically sealed!");
      window.dispatchEvent(new CustomEvent("neurorx_drug_updated"));
    } catch (err: any) {
      alert(`Verification error: ${err?.message || "Could not connect to server"}`);
    } finally {
      setVerifyingId(null);
    }
  };

  const handleVerifyAll = async () => {
    if (!window.confirm(`Confirm verification and unlock all ${data?.drafts?.length || 0} draft drugs in queue?`)) {
      return;
    }
    setVerifyingAll(true);
    try {
      const token = getStoredAdminToken();
      const res = await fetch("/api/neurorx/manage-drug", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token || "",
        },
        body: JSON.stringify({ action: "verify_all", verified_by: "Admin" }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Unable to bulk verify all drugs.");
      }
      if (isSyncV2) {
        if (Array.isArray(json.rows)) {
          for (const row of json.rows as SyncRow[]) {
            await syncState.applyLocalWrite(row);
          }
        }
        await syncState.refresh();
      } else {
        await fetchAdminData();
      }
      const conflictNotice =
        isSyncV2 && Array.isArray(json.conflicts) && json.conflicts.length > 0
          ? ` (${json.conflicts.length} skipped due to concurrent edit conflict)`
          : "";
      showSuccess(
        (json.message || "✓ Successfully verified all draft drugs!") + conflictNotice
      );
      window.dispatchEvent(new CustomEvent("neurorx_drug_updated"));
    } catch (err: any) {
      alert(`Error: ${err?.message || "Operation failed"}`);
    } finally {
      setVerifyingAll(false);
    }
  };

  const handleSaveDrug = async (updatedDrug: DrugRecord, oldId?: string): Promise<boolean> => {
    if (isSyncV2) {
      showSuccess("✓ Changes saved and synced successfully!");
      window.dispatchEvent(new CustomEvent("neurorx_drug_updated"));
      return true;
    }

    try {
      const token = getStoredAdminToken();
      const res = await fetch("/api/neurorx/manage-drug", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token || "",
        },
        body: JSON.stringify({ action: "save", drug: updatedDrug, old_id: oldId }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Unable to save drug.");
      }
      showSuccess(json.message || "✓ Changes saved successfully!");
      window.dispatchEvent(new CustomEvent("neurorx_drug_updated"));
      await fetchAdminData();
      return true;
    } catch (err: any) {
      alert(`Error saving drug: ${err?.message}`);
      return false;
    }
  };

  const handleDeleteDrug = async (drugId: string, name: string) => {
    if (
      !window.confirm(
        `SAFETY WARNING:\n\nAre you sure you want to PERMANENTLY DELETE drug "${name}" (${drugId}) from storage?\n\nThis will remove the JSON record from the server, delete it from the cloud database, and add it to the permanent deletion blacklist.`
      )
    ) {
      return;
    }
    setDeletingId(drugId);
    try {
      const token = getStoredAdminToken();
      if (isSyncV2) {
        const row = syncState.rowsBySlug.get(drugId);
        if (!row) {
          throw new Error(`Sync record for '${drugId}' not found. Refresh and retry.`);
        }
        const res = await fetch(
          `/api/neurorx/sync/drugs/${encodeURIComponent(row.uid)}?expectedRev=${row.rev}`,
          {
            method: "DELETE",
            headers: {
              "x-admin-token": token || "",
            },
          }
        );
        const json = await res.json();
        if (res.status === 409 && json?.code === "REV_CONFLICT") {
          if (json.current) {
            await syncState.applyLocalWrite(json.current as SyncRow);
          }
          throw new Error(
            `Revision conflict deleting "${name}". Synced latest revision (${
              json.currentRev ?? "newer"
            }).`
          );
        }
        if (!res.ok || !json?.row) {
          throw new Error(json?.error || "Unable to delete drug.");
        }
        await syncState.applyLocalWrite(json.row as SyncRow);
        showSuccess(`✓ Drug ${name} deleted.`);
        window.dispatchEvent(new CustomEvent("neurorx_drug_updated"));
        return;
      }

      const res = await fetch("/api/neurorx/manage-drug", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token || "",
        },
        body: JSON.stringify({ action: "delete", drug_id: drugId }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Unable to delete drug.");
      }
      showSuccess(json.message || `✓ Drug ${name} permanently deleted.`);
      window.dispatchEvent(new CustomEvent("neurorx_drug_updated"));
      await fetchAdminData();
    } catch (err: any) {
      alert(`Error deleting drug: ${err?.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenEdit = async (drugId: string) => {
    if (isSyncV2) {
      const syncRow = syncState.rowsBySlug.get(drugId);
      if (syncRow) {
        setEditingSyncRow(syncRow);
        setIsEditingNewDrug(false);
        setEditingDrug(syncRow.data);
        setIsEditModalOpen(true);
        return;
      }
    }

    const found = data?.all_drugs?.find((d) => d.id === drugId);
    if (found) {
      setEditingSyncRow(null);
      setIsEditingNewDrug(false);
      setEditingDrug(found);
      setIsEditModalOpen(true);
      return;
    }

    try {
      const token = getStoredAdminToken();
      const res = await fetch("/api/neurorx/manage-drug", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token || "",
        },
        body: JSON.stringify({ action: "get", drug_id: drugId }),
      });
      const json = await res.json();
      if (json.ok && json.drug) {
        setEditingSyncRow(null);
        setIsEditingNewDrug(false);
        setEditingDrug(json.drug);
        setIsEditModalOpen(true);
      } else {
        alert("Unable to load drug details.");
      }
    } catch (err: any) {
      alert(`Error: ${err?.message}`);
    }
  };

  const handleAddNewDrug = () => {
    const template: DrugRecord = {
      id: "new-drug",
      generic_name: "",
      tall_man: { value: "", refs: [] },
      classes: [],
      subspecialties: ["epilepsy"],
      vn_products: { value: [], refs: [] },
      bhyt: { value: { listed: false }, refs: [] },
      regimens: [
        {
          id: "new-drug-maintenance",
          indication: "Standard Therapy",
          setting: "maintenance_outpatient",
          route: "PO",
          dose: null,
          dose_text: "Initial: ... Target: ...",
          refs: [
            {
              source_id: isSyncV2 ? "fda-keppra-label" : "system",
              locator: "admin",
              quote: "New drug",
            },
          ],
        },
      ],
      renal_basis: {
        value: "cg_abw",
        refs: isSyncV2
          ? [{ source_id: "fda-keppra-label", locator: "admin", quote: "CrCl" }]
          : [],
      },
      hepatic: { value: "No dose adjustment required.", refs: [] },
      black_box: { value: null, refs: [] },
      mg_safety: {
        value: "safe",
        refs: isSyncV2
          ? [{ source_id: "fda-keppra-label", locator: "admin", quote: "MG safety" }]
          : [],
      },
      ng_tube: { value: { crushable: true, instructions: "" }, refs: [] },
      pgx: { value: "", refs: [] },
      ae_tags: { value: [], refs: [] },
      enzyme_profile: { value: {}, refs: [] },
      status: "draft",
      verification: { verified_by: null, verified_at: null, content_hash: null },
    };
    setEditingSyncRow(null);
    setIsEditingNewDrug(true);
    setEditingDrug(template);
    setIsEditModalOpen(true);
  };

  const handleExport = async () => {
    const token = getStoredAdminToken();
    try {
      const res = await fetch("/api/neurorx/admin-data?export=true", {
        headers: {
          "x-admin-token": token || "",
        },
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `neurorx-data-backup-${data?.version_hash || "v1"}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert("Failed to export NeuroRx data bundle.");
    }
  };

  const isViewLoading = isSyncV2
    ? loading && syncState.drugs.length === 0 && syncState.status === "loading"
    : loading;

  if (isViewLoading) {
    return (
      <div className="p-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-sky-500" />
        <span>Loading NeuroRx data integrity &amp; audit status…</span>
      </div>
    );
  }

  if (!data || (!isSyncV2 && error)) {
    return (
      <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs">
        <div className="flex items-center gap-2 font-bold mb-1">
          <AlertTriangle className="w-4 h-4 text-rose-500" />
          <span>Failed to load NeuroRx status</span>
        </div>
        <p>{error || "No data returned."}</p>
        <button
          onClick={() => {
            if (isSyncV2) void syncState.refresh();
            void fetchAdminData();
          }}
          className="mt-3 px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  // Filtered all drugs list
  const filteredAllDrugs = (data.all_drugs || []).filter((d) => {
    if (statusFilter !== "all" && d.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = d.generic_name?.toLowerCase().includes(q);
      const matchId = d.id?.toLowerCase().includes(q);
      const matchClasses = (d.classes || []).some((c) => c.toLowerCase().includes(q));
      if (!matchName && !matchId && !matchClasses) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {actionSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2.5 shadow-sm animate-in slide-in-from-top duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="font-bold">{actionSuccess}</span>
        </div>
      )}

      {/* Sub-tab Navigation & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab("dashboard")}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
              activeSubTab === "dashboard"
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            Repository Health &amp; Verification Queue
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("extractor")}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "extractor"
                ? "bg-sky-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <span>AI Label &amp; Monograph Extractor</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddNewDrug}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Drug</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (isSyncV2) void syncState.refresh();
              void fetchAdminData();
            }}
            className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleExport}
            className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {activeSubTab === "extractor" ? (
        <ExtractorPanel darkMode={darkMode} />
      ) : (
        <>
          {/* 1. Data Health & Cryptographic State */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Clinical Repository Health &amp; Verification State
            </h3>
            <DataHealth health={data.health} versionHash={data.version_hash} darkMode={darkMode} />
          </div>

          {/* 2. Label Watch Queue */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <GitPullRequest className="w-4 h-4 text-indigo-500" />
                <span>DailyMed / OpenFDA Label Watch Updates Queue</span>
              </h3>
              <span className="text-[11px] text-slate-400">
                {data.updates_queue.length} item(s) in queue
              </span>
            </div>
            <UpdateQueueList items={data.updates_queue} darkMode={darkMode} />
          </div>

          {/* 3. Draft Verification Queue with 1-Click Verify, Edit, Delete */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-amber-500" />
                  <span>Draft Records Verification Queue ({data.drafts.length})</span>
                </h3>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Review against source monograph, then click &quot;Verify Now&quot; to unlock dosing calculations on Bedside Dosing
                </span>
              </div>

              {data.drafts.length > 0 && (
                <button
                  type="button"
                  onClick={handleVerifyAll}
                  disabled={verifyingAll}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer self-start sm:self-auto disabled:opacity-50"
                >
                  {verifyingAll ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>Verify All ({data.drafts.length} Drugs)</span>
                </button>
              )}
            </div>

            <div
              className={`rounded-2xl border overflow-hidden divide-y divide-slate-200 dark:divide-slate-800 ${
                darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
              }`}
            >
              {data.drafts.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                  <ShieldCheck className="w-8 h-8 text-emerald-500" />
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    All formulary drugs have been verified!
                  </span>
                  <span>No unverified draft records remain locked.</span>
                </div>
              ) : (
                data.drafts.map((draft) => {
                  const isCopied = copiedId === draft.id;
                  const isVerifying = verifyingId === draft.id;
                  const isDeleting = deletingId === draft.id;

                  return (
                    <div
                      key={draft.id}
                      className="p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs hover:bg-slate-50/60 dark:hover:bg-slate-950/40 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                            {draft.name}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            ({draft.id})
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400">
                            Draft (Dosing Locked)
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Classes: {draft.classes.join(", ") || "None"}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        {/* 1-Click Verify */}
                        <button
                          type="button"
                          onClick={() => handleVerifyDrug(draft.id)}
                          disabled={isVerifying}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {isVerifying ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <ShieldCheck className="w-3.5 h-3.5" />
                          )}
                          <span>Verify Now</span>
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(draft.id)}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:border-sky-500 hover:bg-sky-50 dark:hover:bg-sky-950/40 text-sky-600 dark:text-sky-400 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        {/* History Button (Sync v2) */}
                        {isSyncV2 && syncState.rowsBySlug.get(draft.id) && (
                          <button
                            type="button"
                            onClick={() =>
                              setHistoryTargetRow(syncState.rowsBySlug.get(draft.id) ?? null)
                            }
                            className="min-h-[44px] px-3 py-1.5 rounded-lg border border-indigo-300 dark:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <History className="w-3.5 h-3.5" />
                            <span>History</span>
                          </button>
                        )}

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteDrug(draft.id, draft.name)}
                          disabled={isDeleting}
                          className="px-2.5 py-1.5 rounded-lg border border-rose-300 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                          title="Permanently Delete Drug"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Copy CLI */}
                        <button
                          type="button"
                          onClick={() => handleCopyCommand(draft.id)}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            isCopied
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "border-slate-300 dark:border-slate-700 hover:border-slate-400 text-slate-500"
                          }`}
                          title="Copy terminal command (rx:verify)"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 4. Full Formulary Library (Collapsible - Edit any drug in the system) */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <button
              type="button"
              onClick={() => setIsLibraryOpen((prev) => !prev)}
              className="w-full text-left p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 hover:bg-slate-100/70 dark:hover:bg-slate-850/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs cursor-pointer group"
            >
              <div className="flex items-start sm:items-center gap-3">
                <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500 group-hover:scale-105 transition-transform shrink-0 mt-0.5 sm:mt-0">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      NeuroRx Formulary Library ({data.all_drugs?.length || 0})
                    </h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                      isLibraryOpen
                        ? "bg-sky-500/15 text-sky-600 dark:text-sky-400"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                    }`}>
                      {isLibraryOpen ? "Đang mở" : "Thu gọn • Bấm để mở"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Search, review dosing monographs, edit parameters, and manage drugs in the formulary
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                <span>{isLibraryOpen ? "Thu gọn" : "Xem thư viện"}</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isLibraryOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>

            {/* Collapsible Content */}
            {isLibraryOpen && (
              <div className="space-y-3 pt-1">
                {/* Search & Filter */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Hiển thị <strong>{filteredAllDrugs.length}</strong> / {data.all_drugs?.length || 0} thuốc trong thư viện
                  </span>

                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by drug name, class..."
                        className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 w-44 sm:w-56"
                      />
                    </div>

                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="all">All ({data.all_drugs?.length || 0})</option>
                      <option value="verified">Verified ({data.health.verified_count})</option>
                      <option value="draft">Draft ({data.health.draft_count})</option>
                    </select>
                  </div>
                </div>

                <div
                  className={`rounded-2xl border overflow-hidden divide-y divide-slate-200 dark:divide-slate-800 max-h-[500px] overflow-y-auto ${
                    darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                  }`}
                >
                  {filteredAllDrugs.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500">
                      No drugs match your search criteria.
                    </div>
                  ) : (
                    filteredAllDrugs.map((d) => {
                      const isVerifying = verifyingId === d.id;
                      const isDeleting = deletingId === d.id;

                      return (
                        <div
                          key={d.id}
                          className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs hover:bg-slate-50/60 dark:hover:bg-slate-950/40 transition-colors"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-slate-100">
                                {d.tall_man?.value || d.generic_name}
                              </span>
                              <span className="font-mono text-[10px] text-slate-400">
                                ({d.id})
                              </span>
                              <span
                                className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                  d.status === "verified"
                                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                    : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                }`}
                              >
                                {d.status}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                              {d.classes?.join(", ") || "Unclassified"}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                            {d.status !== "verified" && (
                              <button
                                type="button"
                                onClick={() => handleVerifyDrug(d.id)}
                                disabled={isVerifying}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                                title="Verify and seal cryptographic hash"
                              >
                                {isVerifying ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <ShieldCheck className="w-3 h-3" />
                                )}
                                <span>Verify</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleOpenEdit(d.id)}
                              className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:border-sky-500 hover:bg-sky-50 dark:hover:bg-sky-950/40 text-sky-600 dark:text-sky-400 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Edit className="w-3 h-3" />
                              <span>Edit</span>
                            </button>

                            {isSyncV2 && syncState.rowsBySlug.get(d.id) && (
                              <button
                                type="button"
                                onClick={() =>
                                  setHistoryTargetRow(syncState.rowsBySlug.get(d.id) ?? null)
                                }
                                className="min-h-[44px] px-2.5 py-1 rounded-lg border border-indigo-300 dark:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                                title="View revision history"
                              >
                                <History className="w-3 h-3" />
                                <span>History</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDeleteDrug(d.id, d.generic_name)}
                              disabled={isDeleting}
                              className="p-1 rounded-lg border border-rose-300 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer disabled:opacity-50"
                              title="Permanently Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Edit Drug Modal */}
      {isEditModalOpen && editingDrug && (
        <EditDrugModal
          drug={editingDrug}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingDrug(null);
            setEditingSyncRow(null);
            setIsEditingNewDrug(false);
          }}
          onSave={handleSaveDrug}
          darkMode={darkMode}
          syncRow={isSyncV2 ? editingSyncRow : null}
          isNewDrug={isSyncV2 ? isEditingNewDrug : false}
          onApplyLocalWrite={isSyncV2 ? syncState.applyLocalWrite : undefined}
          onOpenHistory={
            isSyncV2
              ? (row) => {
                  setIsEditModalOpen(false);
                  setHistoryTargetRow(row);
                }
              : undefined
          }
        />
      )}

      {/* Revision History Panel (Sync v2) */}
      {isSyncV2 && historyTargetRow && (
        <HistoryPanel
          isOpen={true}
          uid={historyTargetRow.uid}
          drugName={historyTargetRow.data.generic_name || historyTargetRow.slug}
          currentRev={historyTargetRow.rev}
          darkMode={darkMode}
          onClose={() => setHistoryTargetRow(null)}
          onRestored={async (restoredRow) => {
            await syncState.applyLocalWrite(restoredRow);
            setHistoryTargetRow(restoredRow);
            showSuccess(
              `✓ Restored '${restoredRow.data.generic_name}' to draft rev ${restoredRow.rev}.`
            );
            window.dispatchEvent(new CustomEvent("neurorx_drug_updated"));
          }}
          onConflict={async (currentRow) => {
            await syncState.applyLocalWrite(currentRow);
            setHistoryTargetRow(currentRow);
          }}
        />
      )}
    </div>
  );
}
