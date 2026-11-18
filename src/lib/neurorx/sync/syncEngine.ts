import {
  createFetchChanges,
  createSyncEngine as sharedCreateSyncEngine,
  type CreateSyncEngineOptions as SharedCreateSyncEngineOptions,
  type FetchChangesFn as SharedFetchChangesFn,
  type FetchChangesParams,
  type FetchChangesResponseBody as SharedFetchChangesResponseBody,
  type FetchChangesResult as SharedFetchChangesResult,
  type SyncEngine as SharedSyncEngine,
  type SyncEngineSnapshot as SharedSyncEngineSnapshot,
  type SyncSignal,
  type SyncStatus,
} from "../../sync/syncEngine.ts";
import type { SyncRow } from "./types.ts";

export type {
  SyncStatus,
  FetchChangesParams,
  SyncSignal,
};

export type SyncEngineSnapshot = SharedSyncEngineSnapshot<SyncRow>;
export type FetchChangesResponseBody = SharedFetchChangesResponseBody<SyncRow>;
export type FetchChangesResult = SharedFetchChangesResult<SyncRow>;
export type FetchChangesFn = SharedFetchChangesFn<SyncRow>;
export type CreateSyncEngineOptions = SharedCreateSyncEngineOptions<SyncRow>;
export type SyncEngine = SharedSyncEngine<SyncRow>;

export const defaultFetchChanges: FetchChangesFn = createFetchChanges<SyncRow>(
  "/api/neurorx/sync/changes",
);

export function createSyncEngine(options: CreateSyncEngineOptions): SyncEngine {
  return sharedCreateSyncEngine<SyncRow>({
    endpoint: "/api/neurorx/sync/changes",
    ...options,
  });
}
