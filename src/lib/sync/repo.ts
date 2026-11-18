import type { RepoErrorCode, SyncRowLike } from "./types.ts";

export class RepoError<TRow extends SyncRowLike = SyncRowLike> extends Error {
  readonly code: RepoErrorCode;
  readonly currentRev?: number;
  readonly currentRow?: TRow;

  constructor(
    code: RepoErrorCode,
    message: string,
    opts?: { currentRev?: number; currentRow?: TRow }
  ) {
    super(message);
    this.name = "RepoError";
    this.code = code;
    this.currentRev = opts?.currentRev;
    this.currentRow = opts?.currentRow;
  }
}
