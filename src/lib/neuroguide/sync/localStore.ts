import {
  DEFAULT_SCHEMA_VERSION,
  IdbLocalStore as SharedIdbLocalStore,
  MemoryLocalStore as SharedMemoryLocalStore,
  type IdbLocalStoreOptions as SharedIdbLocalStoreOptions,
  type LocalStore as SharedLocalStore,
  type LocalStoreSnapshot as SharedLocalStoreSnapshot,
} from "../../sync/localStore.ts";
import type {
  NeuroGuideContentBlockRow,
  NeuroGuideProtocolRow,
} from "./types.ts";

export const SCHEMA_VERSION = DEFAULT_SCHEMA_VERSION;

export const BLOCKS_COLLECTION = "neuroguide-blocks";
export const BLOCKS_DB_NAME_PREFIX = `${BLOCKS_COLLECTION}-sync-v`;
export const BLOCKS_DB_NAME = `${BLOCKS_DB_NAME_PREFIX}${SCHEMA_VERSION}`;

export const PROTOCOLS_COLLECTION = "neuroguide-protocols";
export const PROTOCOLS_DB_NAME_PREFIX = `${PROTOCOLS_COLLECTION}-sync-v`;
export const PROTOCOLS_DB_NAME = `${PROTOCOLS_DB_NAME_PREFIX}${SCHEMA_VERSION}`;

export type BlockLocalStoreSnapshot = SharedLocalStoreSnapshot<NeuroGuideContentBlockRow>;
export type BlockLocalStore = SharedLocalStore<NeuroGuideContentBlockRow>;

export type ProtocolLocalStoreSnapshot = SharedLocalStoreSnapshot<NeuroGuideProtocolRow>;
export type ProtocolLocalStore = SharedLocalStore<NeuroGuideProtocolRow>;

export interface IdbLocalStoreOptions {
  indexedDB?: IDBFactory | null;
}

export class MemoryBlockLocalStore extends SharedMemoryLocalStore<NeuroGuideContentBlockRow> {
  constructor(initial?: Partial<BlockLocalStoreSnapshot>) {
    super({ ...initial, collection: BLOCKS_COLLECTION });
  }
}

export class IdbBlockLocalStore extends SharedIdbLocalStore<NeuroGuideContentBlockRow> {
  constructor(options?: IdbLocalStoreOptions) {
    const base: SharedIdbLocalStoreOptions = {
      collection: BLOCKS_COLLECTION,
      schemaVersion: SCHEMA_VERSION,
      recordsStoreName: "blocks",
      ...(options && "indexedDB" in options ? { indexedDB: options.indexedDB ?? null } : {}),
    };
    super(base);
  }
}

export function createBlockLocalStore(options?: IdbLocalStoreOptions): BlockLocalStore {
  return new IdbBlockLocalStore(options);
}

export class MemoryProtocolLocalStore extends SharedMemoryLocalStore<NeuroGuideProtocolRow> {
  constructor(initial?: Partial<ProtocolLocalStoreSnapshot>) {
    super({ ...initial, collection: PROTOCOLS_COLLECTION });
  }
}

export class IdbProtocolLocalStore extends SharedIdbLocalStore<NeuroGuideProtocolRow> {
  constructor(options?: IdbLocalStoreOptions) {
    const base: SharedIdbLocalStoreOptions = {
      collection: PROTOCOLS_COLLECTION,
      schemaVersion: SCHEMA_VERSION,
      recordsStoreName: "protocols",
      ...(options && "indexedDB" in options ? { indexedDB: options.indexedDB ?? null } : {}),
    };
    super(base);
  }
}

export function createProtocolLocalStore(options?: IdbLocalStoreOptions): ProtocolLocalStore {
  return new IdbProtocolLocalStore(options);
}
