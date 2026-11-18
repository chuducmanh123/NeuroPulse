import {
  DEFAULT_SCHEMA_VERSION,
  IdbLocalStore as SharedIdbLocalStore,
  MemoryLocalStore as SharedMemoryLocalStore,
  type IdbLocalStoreOptions as SharedIdbLocalStoreOptions,
  type LocalStore as SharedLocalStore,
  type LocalStoreSnapshot as SharedLocalStoreSnapshot,
} from "../../sync/localStore.ts";
import type { SyncRow } from "./types.ts";

export const SCHEMA_VERSION = DEFAULT_SCHEMA_VERSION;
export const IDB_DB_NAME_PREFIX = "neurorx-sync-v";
export const IDB_DB_NAME = `${IDB_DB_NAME_PREFIX}${SCHEMA_VERSION}`;

export type LocalStoreSnapshot = SharedLocalStoreSnapshot<SyncRow>;
export type LocalStore = SharedLocalStore<SyncRow>;

export interface IdbLocalStoreOptions {
  indexedDB?: IDBFactory | null;
}

export class MemoryLocalStore extends SharedMemoryLocalStore<SyncRow> {
  constructor(initial?: Partial<LocalStoreSnapshot>) {
    super({ ...initial, collection: "neurorx" });
  }
}

export class IdbLocalStore extends SharedIdbLocalStore<SyncRow> {
  constructor(options?: IdbLocalStoreOptions) {
    const base: SharedIdbLocalStoreOptions = {
      collection: "neurorx",
      schemaVersion: SCHEMA_VERSION,
      recordsStoreName: "drugs",
      ...(options && "indexedDB" in options ? { indexedDB: options.indexedDB ?? null } : {}),
    };
    super(base);
  }
}

export function createLocalStore(options?: IdbLocalStoreOptions): LocalStore {
  return new IdbLocalStore(options);
}
