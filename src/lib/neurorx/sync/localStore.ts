import type { SyncRow } from "./types.ts";

export const SCHEMA_VERSION = 1;
export const IDB_DB_NAME_PREFIX = "neurorx-sync-v";
export const IDB_DB_NAME = `${IDB_DB_NAME_PREFIX}${SCHEMA_VERSION}`;

const DRUGS_STORE = "drugs";
const META_STORE = "meta";
const META_STATE_KEY = "state";

export interface LocalStoreSnapshot {
  rows: Map<string, SyncRow>;
  lastSeq: number;
  rootHash: string;
  eTag: string;
  lastSyncAt: string | null;
}

export interface LocalStore {
  readonly kind: "idb" | "memory";
  load(): Promise<LocalStoreSnapshot>;
  commit(
    applied: readonly SyncRow[],
    removedUids: readonly string[],
    lastSeq: number,
    rootHash: string,
    eTag: string,
    lastSyncAt: string,
  ): Promise<void>;
  reset(): Promise<void>;
  close?(): void;
}

interface StoredMetaRecord {
  key: string;
  schemaVersion: number;
  lastSeq: number;
  rootHash: string;
  eTag: string;
  lastSyncAt: string | null;
}

export interface IdbLocalStoreOptions {
  indexedDB?: IDBFactory | null;
}

function sortRowsByUid(rows: Iterable<SyncRow>): Map<string, SyncRow> {
  const sorted = Array.from(rows).sort((a, b) => (a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0));
  const map = new Map<string, SyncRow>();
  for (const row of sorted) {
    map.set(row.uid, row);
  }
  return map;
}

function emptySnapshot(): LocalStoreSnapshot {
  return {
    rows: new Map(),
    lastSeq: 0,
    rootHash: "",
    eTag: "",
    lastSyncAt: null,
  };
}

/**
 * In-memory LocalStore used automatically as a fallback when IndexedDB is
 * unavailable or blocked, and directly in unit tests.
 */
export class MemoryLocalStore implements LocalStore {
  readonly kind = "memory" as const;
  private rows = new Map<string, SyncRow>();
  private lastSeq = 0;
  private rootHash = "";
  private eTag = "";
  private lastSyncAt: string | null = null;

  constructor(initial?: Partial<LocalStoreSnapshot>) {
    if (initial?.rows) {
      this.rows = sortRowsByUid(initial.rows.values());
    }
    if (typeof initial?.lastSeq === "number") {
      this.lastSeq = initial.lastSeq;
    }
    if (typeof initial?.rootHash === "string") {
      this.rootHash = initial.rootHash;
    }
    if (typeof initial?.eTag === "string") {
      this.eTag = initial.eTag;
    }
    if (initial?.lastSyncAt !== undefined) {
      this.lastSyncAt = initial.lastSyncAt;
    }
  }

  async load(): Promise<LocalStoreSnapshot> {
    return {
      rows: sortRowsByUid(this.rows.values()),
      lastSeq: this.lastSeq,
      rootHash: this.rootHash,
      eTag: this.eTag,
      lastSyncAt: this.lastSyncAt,
    };
  }

  async commit(
    applied: readonly SyncRow[],
    removedUids: readonly string[],
    lastSeq: number,
    rootHash: string,
    eTag: string,
    lastSyncAt: string,
  ): Promise<void> {
    for (const uid of removedUids) {
      this.rows.delete(uid);
    }
    for (const row of applied) {
      if (row.deletedAt !== null) {
        this.rows.delete(row.uid);
      } else {
        this.rows.set(row.uid, row);
      }
    }
    this.rows = sortRowsByUid(this.rows.values());
    this.lastSeq = lastSeq;
    this.rootHash = rootHash;
    this.eTag = eTag;
    this.lastSyncAt = lastSyncAt;
  }

  async reset(): Promise<void> {
    this.rows.clear();
    this.lastSeq = 0;
    this.rootHash = "";
    this.eTag = "";
    this.lastSyncAt = null;
  }
}

async function cleanupLegacyDatabases(idb: IDBFactory): Promise<void> {
  if (typeof idb.databases !== "function") {
    return;
  }
  let existing: IDBDatabaseInfo[];
  try {
    existing = await idb.databases();
  } catch {
    return;
  }
  const deletions = existing
    .map((info) => info.name)
    .filter((name): name is string => Boolean(name && name.startsWith(IDB_DB_NAME_PREFIX) && name !== IDB_DB_NAME))
    .map(
      (name) =>
        new Promise<void>((resolve) => {
          try {
            const req = idb.deleteDatabase(name);
            req.onsuccess = () => resolve();
            req.onerror = () => resolve();
            req.onblocked = () => resolve();
          } catch {
            resolve();
          }
        }),
    );
  await Promise.all(deletions);
}

function openSyncDatabase(idb: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let req: IDBOpenDBRequest;
    try {
      req = idb.open(IDB_DB_NAME, SCHEMA_VERSION);
    } catch (error) {
      reject(error);
      return;
    }

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DRUGS_STORE)) {
        db.createObjectStore(DRUGS_STORE, { keyPath: "uid" });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "key" });
      }
    };

    req.onsuccess = () => {
      resolve(req.result);
    };

    req.onerror = () => {
      reject(req.error ?? new Error(`Failed to open IndexedDB ${IDB_DB_NAME}`));
    };

    req.onblocked = () => {
      reject(new Error(`Opening IndexedDB ${IDB_DB_NAME} was blocked`));
    };
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function transactionComplete(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction error"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });
}

/**
 * Browser IndexedDB LocalStore with atomic single-transaction commits and
 * transparent fallback to MemoryLocalStore if IndexedDB is unavailable or fails
 * to open (e.g. private browsing restrictions or SSR).
 */
export class IdbLocalStore implements LocalStore {
  private readonly explicitIdb: IDBFactory | null | undefined;
  private db: IDBDatabase | null = null;
  private fallback: MemoryLocalStore | null = null;
  private initPromise: Promise<void> | null = null;
  private cleanedUpLegacy = false;

  constructor(options?: IdbLocalStoreOptions) {
    this.explicitIdb = options && "indexedDB" in options ? (options.indexedDB ?? null) : undefined;
  }

  get kind(): "idb" | "memory" {
    return this.fallback ? "memory" : "idb";
  }

  private resolveIdbFactory(): IDBFactory | null {
    if (this.explicitIdb !== undefined) {
      return this.explicitIdb;
    }
    if (typeof globalThis !== "undefined" && "indexedDB" in globalThis && globalThis.indexedDB) {
      return globalThis.indexedDB;
    }
    return null;
  }

  private async ensureReady(): Promise<void> {
    if (this.fallback || this.db) {
      return;
    }
    if (!this.initPromise) {
      this.initPromise = this.initialize().finally(() => {
        this.initPromise = null;
      });
    }
    await this.initPromise;
  }

  private async initialize(): Promise<void> {
    const idb = this.resolveIdbFactory();
    if (!idb) {
      this.fallback = new MemoryLocalStore();
      return;
    }

    try {
      if (!this.cleanedUpLegacy) {
        this.cleanedUpLegacy = true;
        await cleanupLegacyDatabases(idb);
      }
      const db = await openSyncDatabase(idb);
      db.onversionchange = () => {
        db.close();
        if (this.db === db) {
          this.db = null;
        }
      };
      this.db = db;
    } catch {
      this.db = null;
      this.fallback = new MemoryLocalStore();
    }
  }

  async load(): Promise<LocalStoreSnapshot> {
    await this.ensureReady();
    if (this.fallback) {
      return this.fallback.load();
    }
    if (!this.db) {
      return emptySnapshot();
    }

    const tx = this.db.transaction([DRUGS_STORE, META_STORE], "readonly");
    const drugsStore = tx.objectStore(DRUGS_STORE);
    const metaStore = tx.objectStore(META_STORE);

    const [rawRows, rawMeta, _done] = await Promise.all([
      requestToPromise(drugsStore.getAll() as IDBRequest<SyncRow[]>),
      requestToPromise(metaStore.get(META_STATE_KEY) as IDBRequest<StoredMetaRecord | undefined>),
      transactionComplete(tx),
    ]);

    const rows = sortRowsByUid(Array.isArray(rawRows) ? rawRows.filter((row) => row.deletedAt === null) : []);
    return {
      rows,
      lastSeq: typeof rawMeta?.lastSeq === "number" ? rawMeta.lastSeq : 0,
      rootHash: typeof rawMeta?.rootHash === "string" ? rawMeta.rootHash : "",
      eTag: typeof rawMeta?.eTag === "string" ? rawMeta.eTag : "",
      lastSyncAt: typeof rawMeta?.lastSyncAt === "string" ? rawMeta.lastSyncAt : null,
    };
  }

  async commit(
    applied: readonly SyncRow[],
    removedUids: readonly string[],
    lastSeq: number,
    rootHash: string,
    eTag: string,
    lastSyncAt: string,
  ): Promise<void> {
    await this.ensureReady();
    if (this.fallback) {
      await this.fallback.commit(applied, removedUids, lastSeq, rootHash, eTag, lastSyncAt);
      return;
    }
    if (!this.db) {
      throw new Error("IndexedDB connection is not open");
    }

    const tx = this.db.transaction([DRUGS_STORE, META_STORE], "readwrite");
    const drugsStore = tx.objectStore(DRUGS_STORE);
    const metaStore = tx.objectStore(META_STORE);
    const done = transactionComplete(tx);

    for (const uid of removedUids) {
      drugsStore.delete(uid);
    }
    for (const row of applied) {
      if (row.deletedAt !== null) {
        drugsStore.delete(row.uid);
      } else {
        drugsStore.put(row);
      }
    }

    const metaRecord: StoredMetaRecord = {
      key: META_STATE_KEY,
      schemaVersion: SCHEMA_VERSION,
      lastSeq,
      rootHash,
      eTag,
      lastSyncAt,
    };
    metaStore.put(metaRecord);

    await done;
  }

  async reset(): Promise<void> {
    await this.ensureReady();
    if (this.fallback) {
      await this.fallback.reset();
      return;
    }
    if (!this.db) {
      return;
    }

    const tx = this.db.transaction([DRUGS_STORE, META_STORE], "readwrite");
    const drugsStore = tx.objectStore(DRUGS_STORE);
    const metaStore = tx.objectStore(META_STORE);
    const done = transactionComplete(tx);

    drugsStore.clear();
    metaStore.delete(META_STATE_KEY);

    await done;
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export function createLocalStore(options?: IdbLocalStoreOptions): LocalStore {
  return new IdbLocalStore(options);
}
