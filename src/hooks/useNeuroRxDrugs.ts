"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  canonicalizeSyncValue,
  computeRecordContentHashSync,
  evaluateEffectiveDrug,
} from "../lib/neurorx/sync/jsonPatch.ts";
import { createLocalStore, type LocalStore } from "../lib/neurorx/sync/localStore.ts";
import { createRealtimeSyncBridge, type CreateRealtimeSyncBridgeOptions } from "../lib/neurorx/sync/realtime.ts";
import {
  createSyncEngine,
  type FetchChangesFn,
  type SyncEngine,
  type SyncEngineSnapshot,
  type SyncStatus,
} from "../lib/neurorx/sync/syncEngine.ts";
import type { DrugWithEffectiveStatus, SyncRow } from "../lib/neurorx/sync/types.ts";
import type { DrugRecord } from "../types/neurorx.ts";

export { evaluateEffectiveDrug };
export type { DrugWithEffectiveStatus };

export type UseNeuroRxDrugsStatus = SyncStatus | "loading";

export interface UseNeuroRxDrugsOptions {
  enabled?: boolean;
  initialDrugs?: DrugWithEffectiveStatus[];
  store?: LocalStore;
  fetchChanges?: FetchChangesFn;
  supabaseClient?: CreateRealtimeSyncBridgeOptions["supabaseClient"];
  debounceMs?: number;
  pollIntervalMs?: number;
}

export interface UseNeuroRxDrugsResult {
  drugs: DrugWithEffectiveStatus[];
  rowsBySlug: ReadonlyMap<string, SyncRow>;
  status: UseNeuroRxDrugsStatus;
  lastSyncAt: string | null;
  lastChangeCount: number;
  lastSeq: number;
  applyLocalWrite: (row: SyncRow) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Optional async Web Crypto SHA-256 verification helper for client callers.
 * Falls back to pure-JS SHA-256 when `crypto.subtle` is unavailable (e.g. non-secure contexts).
 */
export async function computeClientContentHashWebCrypto(drug: DrugRecord): Promise<string> {
  const canonicalJson = JSON.stringify(canonicalizeSyncValue(drug, true));
  const subtle =
    typeof globalThis !== "undefined" &&
    globalThis.crypto &&
    "subtle" in globalThis.crypto
      ? globalThis.crypto.subtle
      : undefined;

  if (subtle && typeof subtle.digest === "function") {
    const bytes = new TextEncoder().encode(canonicalJson);
    const digest = await subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  return computeRecordContentHashSync(drug);
}

/**
 * Converts a SyncEngine row map into alphabetically sorted `DrugWithEffectiveStatus[]`
 * and a `slug -> SyncRow` lookup index.
 */
export function deriveDrugsFromRows(rows: ReadonlyMap<string, SyncRow>): {
  drugs: DrugWithEffectiveStatus[];
  rowsBySlug: ReadonlyMap<string, SyncRow>;
} {
  const drugs: DrugWithEffectiveStatus[] = [];
  const rowsBySlug = new Map<string, SyncRow>();

  for (const row of rows.values()) {
    if (row.deletedAt !== null) {
      continue;
    }
    drugs.push(evaluateEffectiveDrug(row.data));
    rowsBySlug.set(row.slug, row);
  }

  drugs.sort((a, b) => a.drug.generic_name.localeCompare(b.drug.generic_name));
  return { drugs, rowsBySlug };
}

export function useNeuroRxDrugs(options?: UseNeuroRxDrugsOptions): UseNeuroRxDrugsResult {
  const enabled = options?.enabled ?? true;
  const initialDrugs = options?.initialDrugs;
  const customStore = options?.store;
  const customFetchChanges = options?.fetchChanges;
  const customSupabaseClient = options?.supabaseClient;
  const debounceMs = options?.debounceMs;
  const pollIntervalMs = options?.pollIntervalMs;

  const [snapshot, setSnapshot] = useState<SyncEngineSnapshot | null>(null);
  const engineRef = useRef<SyncEngine | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const store = customStore ?? createLocalStore();
    const engine = createSyncEngine({
      store,
      fetchChanges: customFetchChanges,
    });
    engineRef.current = engine;

    const unsubscribe = engine.subscribe((nextSnapshot) => {
      setSnapshot(nextSnapshot);
    });

    const bridge = createRealtimeSyncBridge({
      engine,
      supabaseClient: customSupabaseClient,
      debounceMs,
      pollIntervalMs,
    });

    void engine.start();

    return () => {
      unsubscribe();
      bridge.stop();
      engine.stop();
      if (engineRef.current === engine) {
        engineRef.current = null;
      }
    };
  }, [
    enabled,
    customStore,
    customFetchChanges,
    customSupabaseClient,
    debounceMs,
    pollIntervalMs,
  ]);

  const sortedInitialDrugs = useMemo(() => {
    if (!initialDrugs || initialDrugs.length === 0) {
      return [];
    }
    return [...initialDrugs].sort((a, b) =>
      a.drug.generic_name.localeCompare(b.drug.generic_name),
    );
  }, [initialDrugs]);

  const { drugs, rowsBySlug } = useMemo(() => {
    const hasEngineData =
      snapshot !== null &&
      (snapshot.rows.size > 0 || snapshot.lastSeq > 0 || snapshot.status === "ready");

    if (!hasEngineData) {
      return {
        drugs: sortedInitialDrugs,
        rowsBySlug: new Map<string, SyncRow>(),
      };
    }

    return deriveDrugsFromRows(snapshot.rows);
  }, [snapshot, sortedInitialDrugs]);

  const applyLocalWrite = useCallback(async (row: SyncRow) => {
    const engine = engineRef.current;
    if (!engine) {
      return;
    }
    await engine.applyLocalWrite(row);
  }, []);

  const refresh = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) {
      return;
    }
    await engine.pull();
  }, []);

  const derivedStatus: UseNeuroRxDrugsStatus =
    enabled &&
    drugs.length === 0 &&
    (snapshot === null ||
      (snapshot.lastSeq === 0 && (snapshot.status === "idle" || snapshot.status === "syncing")))
      ? "loading"
      : (snapshot?.status ?? "idle");

  return {
    drugs,
    rowsBySlug,
    status: derivedStatus,
    lastSyncAt: snapshot?.lastSyncAt ?? null,
    lastChangeCount: snapshot?.lastChangeCount ?? 0,
    lastSeq: snapshot?.lastSeq ?? 0,
    applyLocalWrite,
    refresh,
  };
}
