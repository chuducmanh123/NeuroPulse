import type { SyncRowLike } from "./types.ts";

export const DEFAULT_SCHEMA_VERSION = 1;
const META_STORE = "meta";
const META_STATE_KEY = "state";

export interface LocalStoreSnapshot<TRow extends SyncRowLike> {
  rows: Map<string, TRow>;
  lastSeq: number;
  rootHash: string;
  eTag: string;
  lastSyncAt: string | null;
}

export interface LocalStore<TRow extends SyncRowLike> {
  readonly collection: string;
  readonly kind: "idb" | "memory";
  load(): Promise<LocalStoreSnapshot<TRow>>;
  commit(
    applied: readonly TRow[],
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
  collection: string;
  schemaVersion: number;
  lastSeq: number;
  rootHash: string;
  eTag: string;
  lastSyncAt: string | null;
}

export interface IdbLocalStoreOptions {
  collection?: string;
  schemaVersion?: number;
  recordsStoreName?: string;
  indexedDB?: IDBFactory | null;
}

function sortRowsByUid<TRow extends SyncRowLike>(rows: Iterable<TRow>): Map<string, TRow> {
  const sorted = Array.from(rows).sort((a, b) => (a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0));
  const map = new Map<string, TRow>();
  for (const row of sorted) {
    map.set(row.uid, row);
  }
  return map;
}

function emptySnapshot<TRow extends SyncRowLike>(): LocalStoreSnapshot<TRow> {
  return {
    rows: new Map(),
    lastSeq: 0,
    rootHash: "",
    eTag: "",
    lastSyncAt: null,
  };
}

/**
 * In-memory LocalStore isolated per collection; used directly in tests and as an
 * automatic fallback when IndexedDB is unavailable or blocked.
 */
export class MemoryLocalStore<TRow extends SyncRowLike> implements LocalStore<TRow> {
  readonly collection: string;
  readonly kind = "memory" as const;
  private rows = new Map<string, TRow>();
  private lastSeq = 0;
  private rootHash = "";
  private eTag = "";
  private lastSyncAt: string | null = null;

  constructor(
    initial?: Partial<LocalStoreSnapshot<TRow>> & { collection?: string },
  ) {
    this.collection = initial?.collection || "default";
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

  async load(): Promise<LocalStoreSnapshot<TRow>> {
    return {
      rows: sortRowsByUid(this.rows.values()),
      lastSeq: this.lastSeq,
      rootHash: this.rootHash,
      eTag: this.eTag,
      lastSyncAt: this.lastSyncAt,
    };
  }

  async commit(
    applied: readonly TRow[],
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

async function cleanupLegacyDatabases(
  idb: IDBFactory,
  prefix: string,
  currentDbName: string,
): Promise<void> {
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
    .filter((name): name is string => Boolean(name && name.startsWith(prefix) && name !== currentDbName))
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

function openSyncDatabase(
  idb: IDBFactory,
  dbName: string,
  schemaVersion: number,
  recordsStoreName: string,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let req: IDBOpenDBRequest;
    try {
      req = idb.open(dbName, schemaVersion);
    } catch (error) {
      reject(error);
      return;
    }

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(recordsStoreName)) {
        db.createObjectStore(recordsStoreName, { keyPath: "uid" });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "key" });
      }
    };

    req.onsuccess = () => {
      resolve(req.result);
    };

    req.onerror = () => {
      reject(req.error ?? new Error(`Failed to open IndexedDB ${dbName}`));
    };

    req.onblocked = () => {
      reject(new Error(`Opening IndexedDB ${dbName} was blocked`));
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
 * Browser IndexedDB LocalStore parameterized by `collection` with atomic
 * single-transaction commits and transparent MemoryLocalStore fallback.
 */
export class IdbLocalStore<TRow extends SyncRowLike> implements LocalStore<TRow> {
  readonly collection: string;
  readonly schemaVersion: number;
  readonly dbPrefix: string;
  readonly dbName: string;
  readonly recordsStoreName: string;

  private readonly explicitIdb: IDBFactory | null | undefined;
  private db: IDBDatabase | null = null;
  private fallback: MemoryLocalStore<TRow> | null = null;
  private initPromise: Promise<void> | null = null;
  private cleanedUpLegacy = false;

  constructor(options?: IdbLocalStoreOptions) {
    this.collection = options?.collection || "neurorx";
    this.schemaVersion = options?.schemaVersion ?? DEFAULT_SCHEMA_VERSION;
    this.dbPrefix = `${this.collection}-sync-v`;
    this.dbName = `${this.dbPrefix}${this.schemaVersion}`;
    this.recordsStoreName =
      options?.recordsStoreName ?? (this.collection === "neurorx" ? "drugs" : "records");
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
      this.fallback = new MemoryLocalStore<TRow>({ collection: this.collection });
      return;
    }

    try {
      if (!this.cleanedUpLegacy) {
        this.cleanedUpLegacy = true;
        await cleanupLegacyDatabases(idb, this.dbPrefix, this.dbName);
      }
      const db = await openSyncDatabase(
        idb,
        this.dbName,
        this.schemaVersion,
        this.recordsStoreName,
      );
      db.onversionchange = () => {
        db.close();
        if (this.db === db) {
          this.db = null;
        }
      };
      this.db = db;
    } catch {
      this.db = null;
      this.fallback = new MemoryLocalStore<TRow>({ collection: this.collection });
    }
  }

  async load(): Promise<LocalStoreSnapshot<TRow>> {
    await this.ensureReady();
    if (this.fallback) {
      return this.fallback.load();
    }
    if (!this.db) {
      return emptySnapshot();
    }

    const tx = this.db.transaction([this.recordsStoreName, META_STORE], "readonly");
    const recordsStore = tx.objectStore(this.recordsStoreName);
    const metaStore = tx.objectStore(META_STORE);

    const [rawRows, rawMeta] = await Promise.all([
      requestToPromise(recordsStore.getAll() as IDBRequest<TRow[]>),
      requestToPromise(metaStore.get(META_STATE_KEY) as IDBRequest<StoredMetaRecord | undefined>),
      transactionComplete(tx),
    ]);

    const rows = sortRowsByUid(
      Array.isArray(rawRows) ? rawRows.filter((row) => row.deletedAt === null) : [],
    );
    return {
      rows,
      lastSeq: typeof rawMeta?.lastSeq === "number" ? rawMeta.lastSeq : 0,
      rootHash: typeof rawMeta?.rootHash === "string" ? rawMeta.rootHash : "",
      eTag: typeof rawMeta?.eTag === "string" ? rawMeta.eTag : "",
      lastSyncAt: typeof rawMeta?.lastSyncAt === "string" ? rawMeta.lastSyncAt : null,
    };
  }

  async commit(
    applied: readonly TRow[],
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

    const tx = this.db.transaction([this.recordsStoreName, META_STORE], "readwrite");
    const recordsStore = tx.objectStore(this.recordsStoreName);
    const metaStore = tx.objectStore(META_STORE);
    const done = transactionComplete(tx);

    for (const uid of removedUids) {
      recordsStore.delete(uid);
    }
    for (const row of applied) {
      if (row.deletedAt !== null) {
        recordsStore.delete(row.uid);
      } else {
        recordsStore.put(row);
      }
    }

    const metaRecord: StoredMetaRecord = {
      key: META_STATE_KEY,
      collection: this.collection,
      schemaVersion: this.schemaVersion,
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

    const tx = this.db.transaction([this.recordsStoreName, META_STORE], "readwrite");
    const recordsStore = tx.objectStore(this.recordsStoreName);
    const metaStore = tx.objectStore(META_STORE);
    const done = transactionComplete(tx);

    recordsStore.clear();
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

export function createLocalStore<TRow extends SyncRowLike>(
  options?: IdbLocalStoreOptions,
): LocalStore<TRow> {
  return new IdbLocalStore<TRow>(options);
}
