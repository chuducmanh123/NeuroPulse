"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { evaluateEffectiveScale } from "../lib/neurocalc/sync/jsonPatch.ts";
import {
  createLocalStore,
  type LocalStore,
} from "../lib/neurocalc/sync/localStore.ts";
import {
  createRealtimeSyncBridge,
  type CreateRealtimeSyncBridgeOptions,
} from "../lib/neurocalc/sync/realtime.ts";
import {
  createSyncEngine,
  type FetchChangesFn,
  type SyncEngine,
  type SyncEngineSnapshot,
  type SyncStatus,
} from "../lib/neurocalc/sync/syncEngine.ts";
import type {
  ScaleWithEffectiveStatus,
  SyncRow,
} from "../lib/neurocalc/sync/types.ts";

export { evaluateEffectiveScale };
export type { ScaleWithEffectiveStatus };

export type UseNeuroCalcScalesStatus = SyncStatus | "loading";

export interface UseNeuroCalcScalesOptions {
  enabled?: boolean;
  initialScales?: ScaleWithEffectiveStatus[];
  store?: LocalStore;
  fetchChanges?: FetchChangesFn;
  supabaseClient?: CreateRealtimeSyncBridgeOptions["supabaseClient"];
  debounceMs?: number;
  pollIntervalMs?: number;
}

export interface UseNeuroCalcScalesResult {
  scales: ScaleWithEffectiveStatus[];
  rowsBySlug: ReadonlyMap<string, SyncRow>;
  status: UseNeuroCalcScalesStatus;
  lastSyncAt: string | null;
  lastChangeCount: number;
  lastSeq: number;
  rootHash: string;
  applyLocalWrite: (row: SyncRow) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Converts a SyncEngine row map into alphabetically sorted `ScaleWithEffectiveStatus[]`
 * and a `slug -> SyncRow` lookup index.
 */
export function deriveScalesFromRows(rows: ReadonlyMap<string, SyncRow>): {
  scales: ScaleWithEffectiveStatus[];
  rowsBySlug: ReadonlyMap<string, SyncRow>;
} {
  const scales: ScaleWithEffectiveStatus[] = [];
  const rowsBySlug = new Map<string, SyncRow>();

  for (const row of rows.values()) {
    if (row.deletedAt !== null) {
      continue;
    }
    scales.push(evaluateEffectiveScale(row.data));
    rowsBySlug.set(row.slug, row);
  }

  scales.sort((a, b) =>
    a.scale.metadata.short_name.localeCompare(b.scale.metadata.short_name)
  );
  return { scales, rowsBySlug };
}

export function useNeuroCalcScales(
  options?: UseNeuroCalcScalesOptions
): UseNeuroCalcScalesResult {
  const enabled = options?.enabled ?? true;
  const initialScales = options?.initialScales;
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

  const derived = useMemo(() => {
    if (!snapshot) {
      return {
        scales: initialScales ?? [],
        rowsBySlug: new Map<string, SyncRow>() as ReadonlyMap<string, SyncRow>,
      };
    }
    return deriveScalesFromRows(snapshot.rows);
  }, [snapshot, initialScales]);

  const applyLocalWrite = useCallback(async (row: SyncRow) => {
    if (engineRef.current) {
      await engineRef.current.applyLocalWrite(row);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (engineRef.current) {
      await engineRef.current.pull();
    }
  }, []);

  return {
    scales: derived.scales,
    rowsBySlug: derived.rowsBySlug,
    status: snapshot ? snapshot.status : "loading",
    lastSyncAt: snapshot?.lastSyncAt ?? null,
    lastChangeCount: snapshot?.lastChangeCount ?? 0,
    lastSeq: snapshot?.lastSeq ?? 0,
    rootHash: snapshot?.rootHash ?? "",
    applyLocalWrite,
    refresh,
  };
}
