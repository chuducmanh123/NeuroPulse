import { supabase } from "../../supabase.ts";
import {
  createRealtimeSyncBridge as sharedCreateRealtimeSyncBridge,
  type MinimalRealtimeChannel,
  type MinimalSupabaseRealtimeClient,
  type RealtimeSyncBridge,
  type SyncStateRecord,
  type SyncStateSignalPayload,
} from "../../sync/realtime.ts";
import type { SyncEngine } from "./syncEngine.ts";
import type { SyncRow } from "./types.ts";

export type {
  SyncStateRecord,
  SyncStateSignalPayload,
  MinimalRealtimeChannel,
  MinimalSupabaseRealtimeClient,
  RealtimeSyncBridge,
};

export interface CreateRealtimeSyncBridgeOptions {
  engine: SyncEngine;
  supabaseClient?: MinimalSupabaseRealtimeClient | typeof supabase | null;
  debounceMs?: number;
  pollIntervalMs?: number;
}

export function createRealtimeSyncBridge(
  options: CreateRealtimeSyncBridgeOptions
): RealtimeSyncBridge {
  return sharedCreateRealtimeSyncBridge<SyncRow>({
    channelName: "neurocalc-sync",
    schema: "public",
    table: "neurocalc_sync_state",
    ...options,
  });
}
