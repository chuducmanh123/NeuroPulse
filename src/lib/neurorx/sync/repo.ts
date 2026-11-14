import type { DrugRecord } from "../../../types/neurorx.ts";
import type {
  JsonPatchOp,
  RepoErrorCode,
  RevisionRow,
  SyncRow,
  SyncState,
} from "./types.ts";

export class RepoError extends Error {
  readonly code: RepoErrorCode;
  readonly currentRev?: number;
  readonly currentRow?: SyncRow;

  constructor(
    code: RepoErrorCode,
    message: string,
    opts?: { currentRev?: number; currentRow?: SyncRow }
  ) {
    super(message);
    this.name = "RepoError";
    this.code = code;
    this.currentRev = opts?.currentRev;
    this.currentRow = opts?.currentRow;
  }
}

export interface DrugRepo {
  getSyncState(): Promise<SyncState>;
  changesSince(
    since: number,
    limit: number
  ): Promise<{
    rows: SyncRow[];
    maxSeq: number;
    purgeHorizonSeq: number;
    rootHash: string;
  }>;
  getByUid(uid: string): Promise<SyncRow | null>;
  create(
    data: DrugRecord,
    contentHash: string,
    sectionHashes: Record<string, string>,
    actor: string,
    opts?: { skipRootRehash?: boolean }
  ): Promise<SyncRow>;
  recomputeRootHash(): Promise<string>;
  update(
    uid: string,
    expectedRev: number,
    data: DrugRecord,
    contentHash: string,
    sectionHashes: Record<string, string>,
    patchDiff: JsonPatchOp[],
    actor: string
  ): Promise<{ row: SyncRow; unchanged: boolean }>;
  remove(uid: string, expectedRev: number, actor: string): Promise<SyncRow>;
  history(uid: string): Promise<RevisionRow[]>;
  restore(
    uid: string,
    expectedRev: number,
    revisionRev: number,
    contentHash: string,
    sectionHashes: Record<string, string>,
    patchDiff: JsonPatchOp[],
    actor: string
  ): Promise<SyncRow>;
  purge(now?: Date): Promise<{
    tombstonesPurged: number;
    revisionsPurged: number;
    purgeHorizonSeq: number;
  }>;
}
