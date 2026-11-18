import { RepoError as SharedRepoError } from "../../sync/repo.ts";
import type {
  JsonPatchOp,
  NeuroGuideBlockLinkEdge,
  NeuroGuideBlockMutateResult,
  NeuroGuideBlockRevisionRow,
  NeuroGuideContentBlockData,
  NeuroGuideContentBlockRow,
  NeuroGuideOverlappingFacetFilter,
  NeuroGuideProtocolBlockEdge,
  NeuroGuideProtocolMutateResult,
  NeuroGuideProtocolRow,
  NeuroGuideProtocolUpsertInput,
  SyncState,
} from "./types.ts";

export class RepoError extends SharedRepoError<NeuroGuideContentBlockRow | NeuroGuideProtocolRow> {}

export interface NeuroGuideRepo {
  getSyncState(): Promise<SyncState>;
  changesSince(
    since: number,
    limit: number
  ): Promise<{
    rows: NeuroGuideContentBlockRow[];
    maxSeq: number;
    purgeHorizonSeq: number;
    rootHash: string;
  }>;
  protocolChangesSince(
    since: number,
    limit: number
  ): Promise<{
    rows: NeuroGuideProtocolRow[];
    maxSeq: number;
    purgeHorizonSeq: number;
    rootHash: string;
  }>;
  getBlockByUid(uid: string): Promise<NeuroGuideContentBlockRow | null>;
  getProtocolByUid(uid: string): Promise<NeuroGuideProtocolRow | null>;
  listLiveProtocols(): Promise<NeuroGuideProtocolRow[]>;
  listProtocolEdges(protocolUid?: string): Promise<NeuroGuideProtocolBlockEdge[]>;
  listBlockLinks(srcBlockUid?: string): Promise<NeuroGuideBlockLinkEdge[]>;
  upsertProtocol(
    input: NeuroGuideProtocolUpsertInput,
    actor: string
  ): Promise<NeuroGuideProtocolMutateResult>;
  deleteProtocol(
    uid: string,
    expectedRev: number,
    actor: string
  ): Promise<NeuroGuideProtocolRow>;
  createBlock(
    data: NeuroGuideContentBlockData,
    contentHash: string,
    sectionHashes: Record<string, string>,
    actor: string,
    opts?: { uid?: string; skipRootRehash?: boolean }
  ): Promise<NeuroGuideBlockMutateResult>;
  updateBlock(
    uid: string,
    expectedRev: number,
    data: NeuroGuideContentBlockData,
    contentHash: string,
    sectionHashes: Record<string, string>,
    patchDiff: JsonPatchOp[],
    actor: string
  ): Promise<NeuroGuideBlockMutateResult>;
  removeBlock(
    uid: string,
    expectedRev: number,
    actor: string
  ): Promise<NeuroGuideBlockMutateResult>;
  history(uid: string): Promise<NeuroGuideBlockRevisionRow[]>;
  restoreBlock(
    uid: string,
    expectedRev: number,
    revisionRev: number,
    contentHash: string,
    sectionHashes: Record<string, string>,
    patchDiff: JsonPatchOp[],
    actor: string
  ): Promise<NeuroGuideBlockMutateResult>;
  replaceBlockLinks(
    links: NeuroGuideBlockLinkEdge[],
    clearExisting?: boolean
  ): Promise<number>;
  queryBlocksByFacets(
    filter: NeuroGuideOverlappingFacetFilter
  ): Promise<NeuroGuideContentBlockRow[]>;
  recomputeProtocolHash(protocolUid: string): Promise<string>;
  recomputeRootHash(): Promise<string>;
  purge(now?: Date): Promise<{
    tombstonesPurged: number;
    revisionsPurged: number;
    purgeHorizonSeq: number;
  }>;
}
