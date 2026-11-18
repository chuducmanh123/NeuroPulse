import { supabase } from "../../supabase.ts";
import {
  createRealtimeSyncBridge as sharedCreateRealtimeSyncBridge,
  type MinimalRealtimeChannel,
  type MinimalSupabaseRealtimeClient,
  type RealtimeSyncBridge,
  type SyncStateRecord,
  type SyncStateSignalPayload,
} from "../../sync/realtime.ts";
import type {
  SyncEngine,
  SyncEngineSnapshot,
} from "../../sync/syncEngine.ts";
import type { SyncRowLike } from "../../sync/types.ts";

export type {
  SyncStateRecord,
  SyncStateSignalPayload,
  MinimalRealtimeChannel,
  MinimalSupabaseRealtimeClient,
  RealtimeSyncBridge,
};

export interface RealtimePollableEngine<TRow extends SyncRowLike = SyncRowLike> {
  pull(): Promise<unknown>;
  getSnapshot(): SyncEngineSnapshot<TRow>;
}

export interface CreateNeuroGuideRealtimeBridgeOptions<
  TRow extends SyncRowLike = SyncRowLike,
> {
  engine: RealtimePollableEngine<TRow>;
  supabaseClient?: MinimalSupabaseRealtimeClient | typeof supabase | null;
  debounceMs?: number;
  pollIntervalMs?: number;
}

export function createNeuroGuideRealtimeBridge<
  TRow extends SyncRowLike = SyncRowLike,
>(options: CreateNeuroGuideRealtimeBridgeOptions<TRow>): RealtimeSyncBridge {
  const { engine, ...rest } = options;

  const adapter: SyncEngine<TRow> = {
    start: async () => engine.getSnapshot(),
    pull: async () => (await engine.pull()) as SyncEngineSnapshot<TRow>,
    applyLocalWrite: async () => engine.getSnapshot(),
    subscribe: () => () => {},
    getSnapshot: () => engine.getSnapshot(),
    stop: () => {},
  };

  return sharedCreateRealtimeSyncBridge<TRow>({
    channelName: "neuroguide-sync",
    schema: "public",
    table: "neuroguide_sync_state",
    engine: adapter,
    ...rest,
  });
}
