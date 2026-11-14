import type { ParsedPatientParams } from "../omnibar.ts";
import type { SyncStatus } from "./syncEngine.ts";

export type LookupSyncStatus = SyncStatus | "loading";

export interface FormatSyncStatusInput {
  syncStatus: LookupSyncStatus;
  lastSyncAt: string | null;
  lastChangeCount: number;
  lastSeq: number;
  isOnline: boolean;
  showRecentChanges?: boolean;
}

export interface SyncStatusView {
  kind: "updating" | "offline" | "error" | "ready";
  primaryText: string;
  updatedBadgeText: string | null;
}

function formatLocalTimeHHMM(isoTimestamp: string | null): string | null {
  if (!isoTimestamp) {
    return null;
  }
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * Formats client sync status strings for OfflineStatus.tsx (00-design §5.4).
 */
export function formatSyncStatusView(input: FormatSyncStatusInput): SyncStatusView {
  const updatedBadgeText =
    input.lastChangeCount > 0 && input.showRecentChanges !== false
      ? input.lastChangeCount === 1
        ? "1 drug updated"
        : `${input.lastChangeCount} drugs updated`
      : null;

  if (!input.isOnline || input.syncStatus === "offline") {
    return {
      kind: "offline",
      primaryText: "Offline — showing saved data",
      updatedBadgeText,
    };
  }

  if (input.syncStatus === "loading" || input.syncStatus === "syncing") {
    return {
      kind: "updating",
      primaryText: "Updating…",
      updatedBadgeText,
    };
  }

  if (input.syncStatus === "error") {
    return {
      kind: "error",
      primaryText: "Sync issue — showing saved data",
      updatedBadgeText,
    };
  }

  const hhmm = formatLocalTimeHHMM(input.lastSyncAt);
  const primaryText = hhmm
    ? `Up to date · ${hhmm} · seq #${input.lastSeq}`
    : `Up to date · seq #${input.lastSeq}`;

  return {
    kind: "ready",
    primaryText,
    updatedBadgeText,
  };
}

/**
 * Builds query string for URL updates when selecting a drug or returning to directory.
 */
export function buildDrugSelectionSearchParams(
  currentSearch: string,
  drugId: string | null,
  patient?: ParsedPatientParams,
): string {
  const params = new URLSearchParams(currentSearch);
  if (drugId) {
    params.set("tab", "lookup");
    params.set("drug", drugId);

    if (patient) {
      if (patient.weightKg !== undefined) params.set("w", String(patient.weightKg));
      if (patient.crcl !== undefined) params.set("crcl", String(patient.crcl));
      if (patient.scr !== undefined) {
        params.set(
          "scr",
          `${patient.scr.value}${patient.scr.unit === "mg/dL" ? "mgdl" : ""}`,
        );
      }
      if (patient.age !== undefined) params.set("age", String(patient.age));
      if (patient.sex !== undefined) params.set("sex", patient.sex);
    }
  } else {
    params.delete("drug");
  }
  return params.toString();
}
