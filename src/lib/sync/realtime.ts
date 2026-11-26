import { hasSupabaseConfig, supabase } from "../supabase.ts";
import type { SyncEngine, SyncEngineSnapshot } from "./syncEngine.ts";
import type { SyncRowLike } from "./types.ts";

export interface SyncStateRecord {
  id?: number;
  max_seq?: number | string | null;
  root_hash?: string | null;
  updated_at?: string | null;
}

export interface SyncStateSignalPayload {
  max_seq?: number | string | null;
  root_hash?: string | null;
  new?: SyncStateRecord | Record<string, unknown> | null;
}

export interface MinimalRealtimeChannel {
  on(
    type: "postgres_changes",
    filter: { event: "UPDATE"; schema: string; table: string },
    callback: (payload: SyncStateSignalPayload) => void,
  ): MinimalRealtimeChannel;
  subscribe(callback?: (status: string, err?: Error) => void): MinimalRealtimeChannel;
  unsubscribe?: () => unknown;
}

export interface MinimalSupabaseRealtimeClient {
  channel(name: string): MinimalRealtimeChannel;
  removeChannel?: (channel: MinimalRealtimeChannel) => unknown;
}

export interface CreateRealtimeSyncBridgeOptions<TRow extends SyncRowLike> {
  engine: SyncEngine<TRow>;
  supabaseClient?: MinimalSupabaseRealtimeClient | typeof supabase | null;
  channelName?: string;
  schema?: string;
  table?: string;
  debounceMs?: number;
  pollIntervalMs?: number;
  visibilityCooldownMs?: number;
}

export interface RealtimeSyncBridge {
  triggerSignal(payload?: SyncStateSignalPayload | null): void;
  stop(): void;
}

interface ExtractedSignal {
  unconditional: boolean;
  maxSeq: number | null;
  rootHash: string | null;
}

function extractSignal(payload?: SyncStateSignalPayload | null): ExtractedSignal {
  if (!payload || typeof payload !== "object") {
    return { unconditional: true, maxSeq: null, rootHash: null };
  }
  const source =
    payload.new && typeof payload.new === "object"
      ? (payload.new as Record<string, unknown>)
      : (payload as Record<string, unknown>);

  const hasSeqField = source.max_seq !== undefined && source.max_seq !== null;
  const hasHashField = typeof source.root_hash === "string" && source.root_hash.length > 0;

  if (!hasSeqField && !hasHashField) {
    return { unconditional: true, maxSeq: null, rootHash: null };
  }

  const parsedSeq = hasSeqField ? Number(source.max_seq) : Number.NaN;
  return {
    unconditional: false,
    maxSeq: Number.isFinite(parsedSeq) ? parsedSeq : null,
    rootHash: hasHashField ? String(source.root_hash) : null,
  };
}

function shouldPullForSignal<TRow extends SyncRowLike>(
  signal: ExtractedSignal,
  snap: SyncEngineSnapshot<TRow>,
): boolean {
  if (signal.unconditional) {
    return true;
  }
  if (signal.maxSeq !== null) {
    if (signal.maxSeq > snap.lastSeq) {
      return true;
    }
    if (signal.maxSeq < snap.lastSeq) {
      return false;
    }
  }
  if (signal.rootHash && signal.rootHash !== snap.rootHash) {
    return true;
  }
  return false;
}

/**
 * Coordinates debounced Supabase Realtime updates, browser online/visibility
 * transitions, and periodic visible polling into any collection's SyncEngine.
 */
export function createRealtimeSyncBridge<TRow extends SyncRowLike>(
  options: CreateRealtimeSyncBridgeOptions<TRow>,
): RealtimeSyncBridge {
  const {
    engine,
    channelName = "neurorx-sync",
    schema = "public",
    table = "neurorx_sync_state",
    debounceMs = 300,
    pollIntervalMs = 180_000,
    visibilityCooldownMs = 20_000,
  } = options;

  let stopped = false;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let pendingSignal: ExtractedSignal | null = null;
  let lastPullAt = 0;

  function mergePendingSignal(next: ExtractedSignal): void {
    if (!pendingSignal) {
      pendingSignal = { ...next };
      return;
    }
    if (next.unconditional || pendingSignal.unconditional) {
      pendingSignal = { unconditional: true, maxSeq: null, rootHash: null };
      return;
    }
    const maxSeq =
      next.maxSeq !== null && (pendingSignal.maxSeq === null || next.maxSeq > pendingSignal.maxSeq)
        ? next.maxSeq
        : pendingSignal.maxSeq;
    const rootHash = next.rootHash ?? pendingSignal.rootHash;
    pendingSignal = { unconditional: false, maxSeq, rootHash };
  }

  function flushDebounce(): void {
    debounceTimer = null;
    if (stopped) {
      pendingSignal = null;
      return;
    }
    const signal = pendingSignal ?? { unconditional: true, maxSeq: null, rootHash: null };
    pendingSignal = null;
    if (shouldPullForSignal(signal, engine.getSnapshot())) {
      lastPullAt = Date.now();
      void engine.pull();
    }
  }

  function triggerSignal(payload?: SyncStateSignalPayload | null): void {
    if (stopped) {
      return;
    }
    const extracted = extractSignal(payload);
    if (!shouldPullForSignal(extracted, engine.getSnapshot())) {
      return;
    }

    mergePendingSignal(extracted);

    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    if (debounceMs <= 0) {
      flushDebounce();
      return;
    }

    debounceTimer = setTimeout(flushDebounce, debounceMs);
  }

  const handleVisibilityChange = () => {
    if (typeof document !== "undefined" && document.visibilityState === "visible") {
      if (visibilityCooldownMs <= 0 || Date.now() - lastPullAt >= visibilityCooldownMs) {
        triggerSignal();
      }
    }
  };

  const handleOnline = () => {
    triggerSignal();
  };

  if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
    document.addEventListener("visibilitychange", handleVisibilityChange);
  }
  if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
    window.addEventListener("online", handleOnline);
  }

  if (pollIntervalMs > 0 && Number.isFinite(pollIntervalMs)) {
    pollTimer = setInterval(() => {
      if (stopped) {
        return;
      }
      if (typeof document === "undefined" || document.visibilityState === "visible") {
        triggerSignal();
      }
    }, pollIntervalMs);
    if (
      typeof pollTimer === "object" &&
      pollTimer !== null &&
      "unref" in pollTimer &&
      typeof (pollTimer as { unref?: () => void }).unref === "function"
    ) {
      (pollTimer as { unref: () => void }).unref();
    }
  }

  let activeClient: MinimalSupabaseRealtimeClient | null = null;
  let activeChannel: MinimalRealtimeChannel | null = null;

  if (options.supabaseClient === null) {
    activeClient = null;
  } else if (options.supabaseClient !== undefined) {
    activeClient = options.supabaseClient as unknown as MinimalSupabaseRealtimeClient;
  } else if (hasSupabaseConfig()) {
    activeClient = supabase as unknown as MinimalSupabaseRealtimeClient;
  }

  if (activeClient) {
    const subscribeToChannel = (name: string): MinimalRealtimeChannel => {
      const ch = activeClient!.channel(name);
      const state = (ch as { state?: string }).state;
      if (state === "joined" || state === "joining") {
        throw new Error(`Channel ${name} is already subscribed`);
      }
      return ch
        .on(
          "postgres_changes",
          { event: "UPDATE", schema, table },
          (payload) => {
            triggerSignal(payload);
          },
        )
        .subscribe();
    };

    try {
      activeChannel = subscribeToChannel(channelName);
    } catch {
      const fallbackName = `${channelName}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
      try {
        activeChannel = subscribeToChannel(fallbackName);
      } catch {
        // Realtime is optional; periodic polling and visibility listeners remain active.
        activeChannel = null;
      }
    }
  }

  function stop(): void {
    if (stopped) {
      return;
    }
    stopped = true;
    pendingSignal = null;

    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (pollTimer !== null) {
      clearInterval(pollTimer);
      pollTimer = null;
    }

    if (typeof document !== "undefined" && typeof document.removeEventListener === "function") {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    }
    if (typeof window !== "undefined" && typeof window.removeEventListener === "function") {
      window.removeEventListener("online", handleOnline);
    }

    if (activeChannel) {
      if (activeClient?.removeChannel) {
        void activeClient.removeChannel(activeChannel);
      } else if (activeChannel.unsubscribe) {
        void activeChannel.unsubscribe();
      }
      activeChannel = null;
    }
  }

  return {
    triggerSignal,
    stop,
  };
}
