import type { ScaleRecord } from "../../../types/neurocalc.ts";
import { RepoError as SharedRepoError } from "../../sync/repo.ts";
import type {
  JsonPatchOp,
  RevisionRow,
  SyncRow,
  SyncState,
} from "./types.ts";

export class RepoError extends SharedRepoError<SyncRow> {}

export interface ScaleRepo {
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
    data: ScaleRecord,
    contentHash: string,
    sectionHashes: Record<string, string>,
    actor: string,
    opts?: { skipRootRehash?: boolean }
  ): Promise<SyncRow>;
  recomputeRootHash(): Promise<string>;
  update(
    uid: string,
    expectedRev: number,
    data: ScaleRecord,
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
