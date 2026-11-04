/**
 * NeuroVision High-Performance IndexedDB Volume & Mesh Cache
 *
 * Capabilities:
 * 1. Checks IndexedDB for cached ArrayBuffer by (URL + version) key.
 * 2. On miss, streams fetch, stores in IndexedDB, and creates a Blob URL.
 * 3. Tracks all created Blob URLs and revokes them to prevent memory leaks.
 * 4. Graceful fallback to direct fetch if IndexedDB is blocked (incognito, quota, SSR).
 * 5. Guarantees preserving original filename extension for NiiVue format parser.
 */

const DB_NAME = 'neurovision_cache_v1';
const STORE_NAME = 'neuro_assets';
const CACHE_VERSION = '2026.11'; // Bump to invalidate stale volumes

interface CacheRecord {
  key: string;
  url: string;
  filename: string;
  version: string;
  buffer: ArrayBuffer;
  byteLength: number;
  cachedAt: number;
}

// Memory pool of active Blob URLs for automatic cleanup
const activeBlobUrls = new Set<string>();

/**
 * Open or upgrade IndexedDB safely with graceful failure
 */
function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, 1);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = () => {
        console.warn('[NeuroCache] IndexedDB open error, falling back to direct fetch');
        resolve(null);
      };
    } catch (err) {
      console.warn('[NeuroCache] IndexedDB unsupported or blocked:', err);
      resolve(null);
    }
  });
}

/**
 * Fetch asset with transparent IndexedDB caching
 */
export async function loadWithCache(
  url: string,
  filename: string,
  version: string = CACHE_VERSION
): Promise<{
  blobUrl: string;
  buffer: ArrayBuffer;
  fromCache: boolean;
  filename: string;
}> {
  const cacheKey = `${url}?v=${version}`;
  let db: IDBDatabase | null = null;

  try {
    db = await openDatabase();
  } catch {
    db = null;
  }

  // 1. Try reading from IndexedDB
  if (db) {
    try {
      const record = await new Promise<CacheRecord | undefined>((resolve, reject) => {
        const tx = db!.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(cacheKey);
        req.onsuccess = () => resolve(req.result as CacheRecord | undefined);
        req.onerror = () => reject(req.error);
      });

      if (record && record.buffer && record.buffer.byteLength > 0) {
        const blob = new Blob([record.buffer]);
        const blobUrl = URL.createObjectURL(blob);
        activeBlobUrls.add(blobUrl);

        return {
          blobUrl,
          buffer: record.buffer,
          fromCache: true,
          filename,
        };
      }
    } catch (err) {
      console.warn(`[NeuroCache] Cache read failed for ${filename}, fetching network:`, err);
    }
  }

  // 2. Fetch from network
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load neuro asset ${filename} from ${url}: HTTP ${response.status}`);
  }

  const buffer = await response.arrayBuffer();

  // 3. Store into IndexedDB (fire-and-forget, non-blocking)
  if (db) {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record: CacheRecord = {
        key: cacheKey,
        url,
        filename,
        version,
        buffer,
        byteLength: buffer.byteLength,
        cachedAt: Date.now(),
      };
      store.put(record);
    } catch (err) {
      console.warn(`[NeuroCache] Failed to write ${filename} to IndexedDB:`, err);
    }
  }

  // 4. Create Blob URL
  const blob = new Blob([buffer]);
  const blobUrl = URL.createObjectURL(blob);
  activeBlobUrls.add(blobUrl);

  return {
    blobUrl,
    buffer,
    fromCache: false,
    filename,
  };
}

/**
 * Revoke a single active Blob URL to free memory
 */
export function revokeBlobUrl(blobUrl: string): void {
  if (blobUrl && activeBlobUrls.has(blobUrl)) {
    try {
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Ignored
    }
    activeBlobUrls.delete(blobUrl);
  }
}

/**
 * Cleanup all active Blob URLs when unmounting
 */
export function clearAllBlobUrls(): void {
  activeBlobUrls.forEach((url) => {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // Ignored
    }
  });
  activeBlobUrls.clear();
}

/**
 * Clear the entire IndexedDB volume cache (for settings / purge actions)
 */
export async function clearIndexedDbCache(): Promise<void> {
  const db = await openDatabase();
  if (!db) return;

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Get cache diagnostic stats
 */
export async function getCacheStats(): Promise<{ count: number; totalBytes: number }> {
  const db = await openDatabase();
  if (!db) return { count: 0, totalBytes: 0 };

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const records = (req.result || []) as CacheRecord[];
        const totalBytes = records.reduce((sum, r) => sum + (r.byteLength || 0), 0);
        resolve({ count: records.length, totalBytes });
      };
      req.onerror = () => resolve({ count: 0, totalBytes: 0 });
    } catch {
      resolve({ count: 0, totalBytes: 0 });
    }
  });
}
