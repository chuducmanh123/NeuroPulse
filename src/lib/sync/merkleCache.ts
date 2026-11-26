import { gunzipSync, gzipSync } from "node:zlib";

export interface MerkleCacheOptions<T> {
  namespace: string;
  stateKey: string;
  tags?: string[];
  ttlSeconds?: number;
  loader: () => Promise<T>;
}

interface MemoryCacheEntry {
  value: unknown;
  expiresAt: number;
}

interface CompressedCacheEnvelope {
  __gz: 1;
  b64: string;
}

interface MerkleCacheStats {
  hits: number;
  misses: number;
  memorySize: number;
}

const MAX_MEMORY_ENTRIES = 24;
const GZIP_THRESHOLD_BYTES = 256 * 1024;
const MAX_NEXT_CACHE_BYTES = 1_800_000;
const CACHE_TOO_LARGE_ERROR = "MERKLE_CACHE_PAYLOAD_TOO_LARGE";

const globalState = globalThis as unknown as {
  __neuropulseMerkleCache?: Map<string, MemoryCacheEntry>;
  __neuropulseMerkleInFlight?: Map<string, Promise<unknown>>;
  __neuropulseMerkleStats?: { hits: number; misses: number };
};

function getMemoryCache(): Map<string, MemoryCacheEntry> {
  if (!globalState.__neuropulseMerkleCache) {
    globalState.__neuropulseMerkleCache = new Map();
  }
  return globalState.__neuropulseMerkleCache;
}

function getInFlightMap(): Map<string, Promise<unknown>> {
  if (!globalState.__neuropulseMerkleInFlight) {
    globalState.__neuropulseMerkleInFlight = new Map();
  }
  return globalState.__neuropulseMerkleInFlight;
}

function getStatsCounter(): { hits: number; misses: number } {
  if (!globalState.__neuropulseMerkleStats) {
    globalState.__neuropulseMerkleStats = { hits: 0, misses: 0 };
  }
  return globalState.__neuropulseMerkleStats;
}

function setBoundedMemoryEntry(key: string, value: unknown, ttlSeconds: number): void {
  const cache = getMemoryCache();
  if (cache.has(key)) {
    cache.delete(key);
  }
  while (cache.size >= MAX_MEMORY_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey === undefined) break;
    cache.delete(oldestKey);
  }
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

function isCompressedEnvelope(raw: unknown): raw is CompressedCacheEnvelope {
  return (
    Boolean(raw) &&
    typeof raw === "object" &&
    (raw as CompressedCacheEnvelope).__gz === 1 &&
    typeof (raw as CompressedCacheEnvelope).b64 === "string"
  );
}

function encodeForNextCache<T>(value: T): T | CompressedCacheEnvelope {
  const json = JSON.stringify(value);
  const rawBytes = Buffer.byteLength(json, "utf8");
  if (rawBytes <= GZIP_THRESHOLD_BYTES) {
    return value;
  }
  const gz = gzipSync(Buffer.from(json, "utf8"));
  const b64 = gz.toString("base64");
  const envelopeBytes = Buffer.byteLength(b64, "utf8") + 32;
  if (envelopeBytes > MAX_NEXT_CACHE_BYTES) {
    throw new Error(CACHE_TOO_LARGE_ERROR);
  }
  return { __gz: 1, b64 };
}

function decodeFromNextCache<T>(raw: T | CompressedCacheEnvelope): T {
  if (!isCompressedEnvelope(raw)) {
    return raw;
  }
  const json = gunzipSync(Buffer.from(raw.b64, "base64")).toString("utf8");
  return JSON.parse(json) as T;
}

export function clearMerkleMemoryCache(namespace?: string): void {
  const cache = getMemoryCache();
  if (!namespace) {
    cache.clear();
    return;
  }
  const prefix = `${namespace}::`;
  for (const key of Array.from(cache.keys())) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

export function getMerkleCacheStats(): MerkleCacheStats {
  const stats = getStatsCounter();
  return {
    hits: stats.hits,
    misses: stats.misses,
    memorySize: getMemoryCache().size,
  };
}

/**
 * Caches a loader result strictly keyed by `(namespace, stateKey)` (e.g. `maxSeq:rootHash`).
 * Uses a bounded in-process memory cache + single-flight dedup backed by Next.js `unstable_cache`
 * with transparent gzip compression for payloads up to ~1.8 MB compressed.
 * Safely falls back to in-process memory caching outside Next.js (e.g., CLI scripts / unit tests).
 */
export async function getOrLoadMerkleCached<T>(options: MerkleCacheOptions<T>): Promise<T> {
  const { namespace, stateKey, tags, ttlSeconds = 3600, loader } = options;
  const fullKey = `${namespace}::${stateKey}`;
  const memCache = getMemoryCache();
  const stats = getStatsCounter();

  const existing = memCache.get(fullKey);
  if (existing && existing.expiresAt > Date.now()) {
    stats.hits += 1;
    // Refresh recency order
    memCache.delete(fullKey);
    memCache.set(fullKey, existing);
    return existing.value as T;
  }
  if (existing) {
    memCache.delete(fullKey);
  }

  const inFlight = getInFlightMap();
  const pending = inFlight.get(fullKey);
  if (pending) {
    stats.hits += 1;
    return (await pending) as T;
  }

  stats.misses += 1;
  const promise = (async (): Promise<T> => {
    let loadedValue: T | undefined;
    let hasLoaded = false;

    const trackedLoader = async (): Promise<T> => {
      const val = await loader();
      loadedValue = val;
      hasLoaded = true;
      return val;
    };

    try {
      const { unstable_cache } = await import("next/cache");
      const cachedNextFn = unstable_cache(
        async (): Promise<T | CompressedCacheEnvelope> => {
          const val = await trackedLoader();
          return encodeForNextCache(val);
        },
        [namespace, stateKey],
        {
          tags: tags && tags.length > 0 ? tags : [namespace],
          revalidate: ttlSeconds,
        },
      );
      const raw = await cachedNextFn();
      const decoded = decodeFromNextCache(raw);
      setBoundedMemoryEntry(fullKey, decoded, ttlSeconds);
      return decoded;
    } catch (err) {
      if (hasLoaded) {
        setBoundedMemoryEntry(fullKey, loadedValue as T, ttlSeconds);
        return loadedValue as T;
      }
      // Outside Next.js request/cache store or CACHE_TOO_LARGE before load: run directly
      const val = await loader();
      setBoundedMemoryEntry(fullKey, val, ttlSeconds);
      return val;
    }
  })();

  inFlight.set(fullKey, promise);
  try {
    return await promise;
  } finally {
    if (inFlight.get(fullKey) === promise) {
      inFlight.delete(fullKey);
    }
  }
}
