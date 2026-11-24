"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  assembleNeuroGuideStoreFromGraph,
  computeNeuroGuideRootHash,
  queryBlocksByOverlappingFacets,
} from "../lib/neuroguide/sync/blockGraph.ts";
import {
  createBlockLocalStore,
  createProtocolLocalStore,
  type BlockLocalStore,
  type ProtocolLocalStore,
} from "../lib/neuroguide/sync/localStore.ts";
import {
  createNeuroGuideRealtimeBridge,
  type CreateNeuroGuideRealtimeBridgeOptions,
} from "../lib/neuroguide/sync/realtime.ts";
import {
  createNeuroGuideGraphSyncEngine,
  type BlockFetchChangesFn,
  type NeuroGuideGraphSyncEngine,
  type NeuroGuideGraphSyncSnapshot,
  type ProtocolFetchChangesFn,
  type SyncStatus,
} from "../lib/neuroguide/sync/syncEngine.ts";
import type {
  NeuroGuideBlockLinkEdge,
  NeuroGuideContentBlockRow,
  NeuroGuideGraphSnapshot,
  NeuroGuideOverlappingFacetFilter,
  NeuroGuideProtocolBlockEdge,
  NeuroGuideProtocolRow,
  NeuroGuideStoreInput,
} from "../lib/neuroguide/sync/types.ts";

export type UseNeuroGuideSyncStatus = SyncStatus | "loading";

export interface DerivedNeuroGuideGraphView {
  store: NeuroGuideStoreInput;
  graph: NeuroGuideGraphSnapshot;
  blocksByUid: ReadonlyMap<string, NeuroGuideContentBlockRow>;
  blocksBySlug: ReadonlyMap<string, NeuroGuideContentBlockRow>;
  protocolsByUid: ReadonlyMap<string, NeuroGuideProtocolRow>;
  protocolsBySlug: ReadonlyMap<string, NeuroGuideProtocolRow>;
}

export interface UseNeuroGuideSyncOptions {
  enabled?: boolean;
  initialStore?: NeuroGuideStoreInput;
  blockStore?: BlockLocalStore;
  protocolStore?: ProtocolLocalStore;
  fetchBlockChanges?: BlockFetchChangesFn;
  fetchProtocolChanges?: ProtocolFetchChangesFn;
  blockLinks?: readonly NeuroGuideBlockLinkEdge[];
  supabaseClient?: CreateNeuroGuideRealtimeBridgeOptions["supabaseClient"];
  debounceMs?: number;
  pollIntervalMs?: number;
}

export interface UseNeuroGuideSyncResult {
  store: NeuroGuideStoreInput;
  graph: NeuroGuideGraphSnapshot;
  derived: DerivedNeuroGuideGraphView;
  blocksByUid: ReadonlyMap<string, NeuroGuideContentBlockRow>;
  blocksBySlug: ReadonlyMap<string, NeuroGuideContentBlockRow>;
  protocolsByUid: ReadonlyMap<string, NeuroGuideProtocolRow>;
  protocolsBySlug: ReadonlyMap<string, NeuroGuideProtocolRow>;
  status: UseNeuroGuideSyncStatus;
  lastSeq: number;
  rootHash: string;
  lastSyncAt: string | null;
  lastChangeCount: number;
  blockChangeCount: number;
  applyLocalBlockWrite: (row: NeuroGuideContentBlockRow) => Promise<void>;
  applyLocalProtocolWrite: (row: NeuroGuideProtocolRow) => Promise<void>;
  queryFacets: (filter: NeuroGuideOverlappingFacetFilter) => ReturnType<typeof queryBlocksByOverlappingFacets>;
  refresh: () => Promise<void>;
}

const EMPTY_STORE: NeuroGuideStoreInput = {
  guidelines: [],
  conferences: [],
  scenarios: [],
  recommendationAtoms: [],
  pivotalTrials: [],
  customRecLabels: {},
  deletedGuidelineIds: [],
  deletedTrialIds: [],
  clinicalPathways: [],
};

function defaultRoleForBlockType(
  blockType: NeuroGuideContentBlockRow["blockType"],
): NeuroGuideProtocolBlockEdge["role"] {
  switch (blockType) {
    case "shared_clinical_block":
      return "shared";
    case "pivotal_trial":
    case "late_breaking_trial":
      return "trial";
    case "clinical_scenario":
      return "scenario";
    case "recommendation_atom":
      return "atom";
    case "pathway_node":
      return "pathway_step";
    default:
      return "recommendation";
  }
}

/**
 * Pure derivation of runtime NeuroGuide collections & O(1) lookup maps from
 * cached 2-tier protocol + content block maps (0 network calls).
 */
export function deriveNeuroGuideStoreFromGraphSnapshot(
  protocolsMap: ReadonlyMap<string, NeuroGuideProtocolRow>,
  blocksMap: ReadonlyMap<string, NeuroGuideContentBlockRow>,
  blockLinks?: readonly NeuroGuideBlockLinkEdge[],
): DerivedNeuroGuideGraphView {
  const liveProtocols: NeuroGuideProtocolRow[] = [];
  const protocolsByUid = new Map<string, NeuroGuideProtocolRow>();
  const protocolsBySlug = new Map<string, NeuroGuideProtocolRow>();

  for (const proto of protocolsMap.values()) {
    if (proto.deletedAt !== null) continue;
    liveProtocols.push(proto);
    protocolsByUid.set(proto.uid, proto);
    protocolsBySlug.set(proto.slug, proto);
  }
  liveProtocols.sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));

  const liveBlocks: NeuroGuideContentBlockRow[] = [];
  const blocksByUid = new Map<string, NeuroGuideContentBlockRow>();
  const blocksBySlug = new Map<string, NeuroGuideContentBlockRow>();

  for (const block of blocksMap.values()) {
    if (block.deletedAt !== null) continue;
    liveBlocks.push(block);
    blocksByUid.set(block.uid, block);
    blocksBySlug.set(block.slug, block);
  }

  const protocolBlocks: NeuroGuideProtocolBlockEdge[] = [];
  for (const proto of liveProtocols) {
    for (let position = 0; position < proto.blockOrder.length; position++) {
      const blockUid = proto.blockOrder[position];
      const block = blocksByUid.get(blockUid);
      protocolBlocks.push({
        protocolUid: proto.uid,
        blockUid,
        position,
        sectionPath: block?.data.facetIndex.sectionPath ?? "",
        role: block ? defaultRoleForBlockType(block.blockType) : "recommendation",
      });
    }
  }

  const rootHash = computeNeuroGuideRootHash(liveProtocols);
  const graph: NeuroGuideGraphSnapshot = {
    protocols: liveProtocols,
    blocks: liveBlocks,
    protocolBlocks,
    blockLinks: blockLinks ? [...blockLinks] : [],
    rootHash,
  };

  const store = assembleNeuroGuideStoreFromGraph(graph);

  return {
    store,
    graph,
    blocksByUid,
    blocksBySlug,
    protocolsByUid,
    protocolsBySlug,
  };
}

export function useNeuroGuideSync(
  options?: UseNeuroGuideSyncOptions,
): UseNeuroGuideSyncResult {
  const enabled = options?.enabled ?? true;
  const initialStore = options?.initialStore ?? EMPTY_STORE;
  const customBlockStore = options?.blockStore;
  const customProtocolStore = options?.protocolStore;
  const customFetchBlocks = options?.fetchBlockChanges;
  const customFetchProtocols = options?.fetchProtocolChanges;
  const blockLinks = options?.blockLinks;
  const customSupabaseClient = options?.supabaseClient;
  const debounceMs = options?.debounceMs;
  const pollIntervalMs = options?.pollIntervalMs;

  const [snapshot, setSnapshot] = useState<NeuroGuideGraphSyncSnapshot | null>(null);
  const engineRef = useRef<NeuroGuideGraphSyncEngine | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const blockStore = customBlockStore ?? createBlockLocalStore();
    const protocolStore = customProtocolStore ?? createProtocolLocalStore();
    const engine = createNeuroGuideGraphSyncEngine({
      blockStore,
      protocolStore,
      fetchBlockChanges: customFetchBlocks,
      fetchProtocolChanges: customFetchProtocols,
    });
    engineRef.current = engine;

    const unsubscribe = engine.subscribe((nextSnapshot) => {
      setSnapshot(nextSnapshot);
    });

    const bridge = createNeuroGuideRealtimeBridge({
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
    customBlockStore,
    customProtocolStore,
    customFetchBlocks,
    customFetchProtocols,
    customSupabaseClient,
    debounceMs,
    pollIntervalMs,
  ]);

  const hasEngineData = Boolean(
    snapshot !== null &&
      (snapshot.blocks.size > 0 ||
        snapshot.protocols.size > 0 ||
        snapshot.lastSeq > 0 ||
        snapshot.status === "ready"),
  );

  const derived = useMemo<DerivedNeuroGuideGraphView>(() => {
    if (!hasEngineData || !snapshot) {
      return {
        store: initialStore,
        graph: {
          protocols: [],
          blocks: [],
          protocolBlocks: [],
          blockLinks: blockLinks ? [...blockLinks] : [],
          rootHash: "",
        },
        blocksByUid: new Map(),
        blocksBySlug: new Map(),
        protocolsByUid: new Map(),
        protocolsBySlug: new Map(),
      };
    }

    return deriveNeuroGuideStoreFromGraphSnapshot(
      snapshot.protocols,
      snapshot.blocks,
      blockLinks,
    );
  }, [hasEngineData, snapshot, initialStore, blockLinks]);

  const applyLocalBlockWrite = useCallback(async (row: NeuroGuideContentBlockRow) => {
    const engine = engineRef.current;
    if (!engine) return;
    await engine.applyLocalBlockWrite(row);
  }, []);

  const applyLocalProtocolWrite = useCallback(async (row: NeuroGuideProtocolRow) => {
    const engine = engineRef.current;
    if (!engine) return;
    await engine.applyLocalProtocolWrite(row);
  }, []);

  const queryFacets = useCallback(
    (filter: NeuroGuideOverlappingFacetFilter) =>
      queryBlocksByOverlappingFacets(derived.graph, filter),
    [derived.graph],
  );

  const refresh = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) return;
    await engine.pull();
  }, []);

  const derivedStatus: UseNeuroGuideSyncStatus =
    enabled &&
    !hasEngineData &&
    (snapshot === null ||
      (snapshot.lastSeq === 0 &&
        (snapshot.status === "idle" || snapshot.status === "syncing")))
      ? "loading"
      : (snapshot?.status ?? "idle");

  return {
    store: derived.store,
    graph: derived.graph,
    derived,
    blocksByUid: derived.blocksByUid,
    blocksBySlug: derived.blocksBySlug,
    protocolsByUid: derived.protocolsByUid,
    protocolsBySlug: derived.protocolsBySlug,
    status: derivedStatus,
    lastSeq: snapshot?.lastSeq ?? 0,
    rootHash: snapshot?.rootHash || derived.graph.rootHash,
    lastSyncAt: snapshot?.lastSyncAt ?? null,
    lastChangeCount: snapshot?.lastChangeCount ?? 0,
    blockChangeCount: snapshot?.blockChangeCount ?? 0,
    applyLocalBlockWrite,
    applyLocalProtocolWrite,
    queryFacets,
    refresh,
  };
}
