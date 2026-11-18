/**
 * Zero-dependency pure TypeScript primitives shared across sync collections:
 *   1. Deterministic canonicalization & pure-JS FIPS 180-4 SHA-256 (client + server safe, no node:* imports)
 *   2. Merkle root hash calculation
 *   3. RFC 6902 JSON Patch generation & application (`computeJsonPatch`, `applyJsonPatch`)
 *   4. Generic section-aware 3-way merge
 */

import type { JsonPatchOp, MergeConflict, ThreeWayMergeResult } from "./types.ts";

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits));
}

/**
 * Pure-JS UTF-8 SHA-256 digest returning 64 lowercase hex characters.
 * Identical output to `crypto.createHash("sha256").update(str, "utf8").digest("hex")`.
 */
export function sha256Hex(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const bitLen = bytes.length * 8;

  const paddedLen = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(bytes);
  padded[bytes.length] = 0x80;

  const view = new DataView(padded.buffer);
  const highBits = Math.floor(bitLen / 0x100000000);
  const lowBits = bitLen >>> 0;
  view.setUint32(paddedLen - 8, highBits, false);
  view.setUint32(paddedLen - 4, lowBits, false);

  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const w = new Uint32Array(64);

  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h[0];
    let b = h[1];
    let c = h[2];
    let d = h[3];
    let e = h[4];
    let f = h[5];
    let g = h[6];
    let hh = h[7];

    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (hh + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      hh = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h[0] = (h[0] + a) >>> 0;
    h[1] = (h[1] + b) >>> 0;
    h[2] = (h[2] + c) >>> 0;
    h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0;
    h[5] = (h[5] + f) >>> 0;
    h[6] = (h[6] + g) >>> 0;
    h[7] = (h[7] + hh) >>> 0;
  }

  let hex = "";
  for (let i = 0; i < h.length; i++) {
    hex += h[i].toString(16).padStart(8, "0");
  }
  return hex;
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Recursively sorts object keys for deterministic serialization.
 */
export function canonicalizeSyncValue(
  value: unknown,
  omitVerification = false
): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => canonicalizeSyncValue(item, omitVerification));
  }

  const record = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  const keys = Object.keys(record).sort();

  for (const key of keys) {
    if (omitVerification && key === "verification") continue;
    if (record[key] === undefined) continue;
    sorted[key] = canonicalizeSyncValue(record[key], omitVerification);
  }

  return sorted;
}

export function computeRecordContentHashSync(record: unknown, omitVerification = true): string {
  return sha256Hex(JSON.stringify(canonicalizeSyncValue(record, omitVerification)));
}

export function cloneJson<T>(value: T): T {
  if (value === undefined) return value;
  return structuredClone(value);
}

/**
 * Computes root Merkle hash over live rows sorted by uid:
 * sha256(join('|', `${uid}:${rev}:${contentHash}`))
 */
export function computeRootHashFromEntries(
  entries: ReadonlyArray<{ uid: string; rev: number; contentHash: string }>
): string {
  const payload = [...entries]
    .sort((a, b) => (a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0))
    .map((e) => `${e.uid}:${e.rev}:${e.contentHash}`)
    .join("|");
  return sha256Hex(payload);
}

export function escapePointerSegment(segment: string): string {
  return segment.replace(/~/g, "~0").replace(/\//g, "~1");
}

function unescapePointerSegment(segment: string): string {
  return segment.replace(/~1/g, "/").replace(/~0/g, "~");
}

export function deepEqualSync(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== "object") {
    return false;
  }

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (!deepEqualSync(a[i], b[i])) return false;
    }
    return true;
  }

  const recA = a as Record<string, unknown>;
  const recB = b as Record<string, unknown>;
  const keysA = Object.keys(recA).filter((k) => recA[k] !== undefined);
  const keysB = Object.keys(recB).filter((k) => recB[k] !== undefined);
  if (keysA.length !== keysB.length) return false;

  for (const k of keysA) {
    if (!Object.prototype.hasOwnProperty.call(recB, k) || recB[k] === undefined) {
      return false;
    }
    if (!deepEqualSync(recA[k], recB[k])) return false;
  }
  return true;
}

function diffIntoOps(
  before: unknown,
  after: unknown,
  basePath: string,
  ops: JsonPatchOp[]
): void {
  if (deepEqualSync(before, after)) return;

  if (Array.isArray(before) && Array.isArray(after)) {
    const minLen = Math.min(before.length, after.length);
    for (let i = 0; i < minLen; i++) {
      diffIntoOps(before[i], after[i], `${basePath}/${i}`, ops);
    }
    for (let i = minLen; i < after.length; i++) {
      ops.push({
        op: "add",
        path: `${basePath}/${i}`,
        new_value: cloneJson(after[i]),
      });
    }
    for (let i = before.length - 1; i >= after.length; i--) {
      ops.push({
        op: "remove",
        path: `${basePath}/${i}`,
        old_value: cloneJson(before[i]),
      });
    }
    return;
  }

  if (isPlainObject(before) && isPlainObject(after)) {
    const allKeys = Array.from(
      new Set([...Object.keys(before), ...Object.keys(after)])
    ).sort();

    for (const key of allKeys) {
      const hasBefore = Object.prototype.hasOwnProperty.call(before, key) && before[key] !== undefined;
      const hasAfter = Object.prototype.hasOwnProperty.call(after, key) && after[key] !== undefined;
      const path = `${basePath}/${escapePointerSegment(key)}`;

      if (hasBefore && !hasAfter) {
        ops.push({
          op: "remove",
          path,
          old_value: cloneJson(before[key]),
        });
      } else if (!hasBefore && hasAfter) {
        ops.push({
          op: "add",
          path,
          new_value: cloneJson(after[key]),
        });
      } else if (hasBefore && hasAfter) {
        diffIntoOps(before[key], after[key], path, ops);
      }
    }
    return;
  }

  ops.push({
    op: "replace",
    path: basePath || "/",
    old_value: cloneJson(before),
    new_value: cloneJson(after),
  });
}

/**
 * Computes RFC 6902 patch ops (augmented with old_value/new_value for audit UI).
 */
export function computeJsonPatch(before: unknown, after: unknown): JsonPatchOp[] {
  const ops: JsonPatchOp[] = [];
  diffIntoOps(before, after, "", ops);
  return ops;
}

/**
 * Applies JsonPatchOp operations to a cloned copy of `doc` without mutating the input.
 */
export function applyJsonPatch<T>(doc: T, ops: readonly JsonPatchOp[]): T {
  let root: unknown = cloneJson(doc);

  for (const op of ops) {
    if (op.path === "" || op.path === "/") {
      if (op.op === "replace" || op.op === "add") {
        root = cloneJson(op.new_value);
      } else if (op.op === "remove") {
        root = undefined;
      }
      continue;
    }

    if (!op.path.startsWith("/")) {
      throw new Error(`Invalid JSON Pointer path: ${op.path}`);
    }

    const tokens = op.path.slice(1).split("/").map(unescapePointerSegment);
    let cursor: unknown = root;

    for (let i = 0; i < tokens.length - 1; i++) {
      const token = tokens[i];
      if (Array.isArray(cursor)) {
        const idx = Number(token);
        if (!Number.isInteger(idx) || idx < 0 || idx >= cursor.length) {
          throw new Error(`Array index out of bounds at segment "${token}" in "${op.path}"`);
        }
        cursor = cursor[idx];
      } else if (isPlainObject(cursor)) {
        if (!Object.prototype.hasOwnProperty.call(cursor, token)) {
          cursor[token] = {};
        }
        cursor = cursor[token];
      } else {
        throw new Error(`Cannot traverse non-container at "${op.path}"`);
      }
    }

    const leaf = tokens[tokens.length - 1];
    if (Array.isArray(cursor)) {
      if (op.op === "add") {
        const idx = leaf === "-" ? cursor.length : Number(leaf);
        if (!Number.isInteger(idx) || idx < 0 || idx > cursor.length) {
          throw new Error(`Invalid array add index "${leaf}" at "${op.path}"`);
        }
        cursor.splice(idx, 0, cloneJson(op.new_value));
      } else if (op.op === "remove") {
        const idx = Number(leaf);
        if (!Number.isInteger(idx) || idx < 0 || idx >= cursor.length) {
          throw new Error(`Invalid array remove index "${leaf}" at "${op.path}"`);
        }
        cursor.splice(idx, 1);
      } else {
        const idx = Number(leaf);
        if (!Number.isInteger(idx) || idx < 0 || idx >= cursor.length) {
          throw new Error(`Invalid array replace index "${leaf}" at "${op.path}"`);
        }
        cursor[idx] = cloneJson(op.new_value);
      }
    } else if (isPlainObject(cursor)) {
      if (op.op === "remove") {
        delete cursor[leaf];
      } else {
        cursor[leaf] = cloneJson(op.new_value);
      }
    } else {
      throw new Error(`Cannot apply patch op on primitive container at "${op.path}"`);
    }
  }

  return root as T;
}

export function mergeValuesThreeWay(
  baseVal: unknown,
  mineVal: unknown,
  cloudVal: unknown,
  path: string,
  section: string,
  conflicts: MergeConflict[],
  autoMergedPaths: string[]
): unknown {
  if (deepEqualSync(mineVal, cloudVal)) {
    if (!deepEqualSync(mineVal, baseVal)) {
      autoMergedPaths.push(path);
    }
    return cloneJson(mineVal);
  }

  if (deepEqualSync(mineVal, baseVal)) {
    autoMergedPaths.push(path);
    return cloneJson(cloudVal);
  }

  if (deepEqualSync(cloudVal, baseVal)) {
    autoMergedPaths.push(path);
    return cloneJson(mineVal);
  }

  if (isPlainObject(baseVal) && isPlainObject(mineVal) && isPlainObject(cloudVal)) {
    const mergedObj: Record<string, unknown> = {};
    const keys = Array.from(
      new Set([
        ...Object.keys(baseVal),
        ...Object.keys(mineVal),
        ...Object.keys(cloudVal),
      ])
    ).sort();

    for (const key of keys) {
      const mHas = Object.prototype.hasOwnProperty.call(mineVal, key) && mineVal[key] !== undefined;
      const cHas = Object.prototype.hasOwnProperty.call(cloudVal, key) && cloudVal[key] !== undefined;
      const mergedChild = mergeValuesThreeWay(
        baseVal[key],
        mineVal[key],
        cloudVal[key],
        `${path}/${escapePointerSegment(key)}`,
        section,
        conflicts,
        autoMergedPaths
      );
      if (mergedChild !== undefined || mHas || cHas) {
        if (mergedChild !== undefined) {
          mergedObj[key] = mergedChild;
        }
      }
    }
    return mergedObj;
  }

  conflicts.push({
    path,
    section,
    baseValue: cloneJson(baseVal),
    mineValue: cloneJson(mineVal),
    cloudValue: cloneJson(cloudVal),
  });
  return cloneJson(cloudVal);
}

/**
 * Generic section-aware 3-way merge using Tier-3 section hashes.
 */
export function threeWayMergeSections<T extends Record<string, unknown>>(
  base: T,
  mine: T,
  cloud: T,
  options: {
    sections: readonly string[];
    computeHashes: (record: T) => Record<string, string>;
    omitCoreKey?: string;
  }
): ThreeWayMergeResult<T> {
  const { sections, computeHashes, omitCoreKey } = options;
  const namedSet = new Set(sections);
  const baseHashes = computeHashes(base);
  const mineHashes = computeHashes(mine);
  const cloudHashes = computeHashes(cloud);

  const mergedRecord = cloneJson(cloud) as Record<string, unknown>;
  const conflicts: MergeConflict[] = [];
  const autoMergedPaths: string[] = [];

  for (const section of sections) {
    const bHash = baseHashes[section];
    const mHash = mineHashes[section];
    const cHash = cloudHashes[section];

    if (mHash === cHash || mHash === bHash) {
      if (cHash !== bHash && mHash === bHash) {
        autoMergedPaths.push(`/${section}`);
      }
      continue;
    }

    if (cHash === bHash) {
      const mineSec = mine[section];
      if (mineSec === undefined) {
        delete mergedRecord[section];
      } else {
        mergedRecord[section] = cloneJson(mineSec);
      }
      autoMergedPaths.push(`/${section}`);
      continue;
    }

    const mergedSec = mergeValuesThreeWay(
      base[section],
      mine[section],
      cloud[section],
      `/${section}`,
      section,
      conflicts,
      autoMergedPaths
    );
    if (mergedSec === undefined) {
      delete mergedRecord[section];
    } else {
      mergedRecord[section] = mergedSec;
    }
  }

  if (mineHashes.core !== cloudHashes.core && mineHashes.core !== baseHashes.core) {
    if (cloudHashes.core === baseHashes.core) {
      for (const k of Object.keys(mergedRecord)) {
        if (k !== omitCoreKey && !namedSet.has(k) && !Object.prototype.hasOwnProperty.call(mine, k)) {
          delete mergedRecord[k];
        }
      }
      for (const k of Object.keys(mine)) {
        if (k !== omitCoreKey && !namedSet.has(k) && mine[k] !== undefined) {
          mergedRecord[k] = cloneJson(mine[k]);
        }
      }
      autoMergedPaths.push("/core");
    } else {
      const coreKeys = Array.from(
        new Set([...Object.keys(base), ...Object.keys(mine), ...Object.keys(cloud)])
      )
        .filter((k) => k !== omitCoreKey && !namedSet.has(k))
        .sort();

      for (const key of coreKeys) {
        const mergedVal = mergeValuesThreeWay(
          base[key],
          mine[key],
          cloud[key],
          `/${escapePointerSegment(key)}`,
          "core",
          conflicts,
          autoMergedPaths
        );
        if (mergedVal === undefined) {
          delete mergedRecord[key];
        } else {
          mergedRecord[key] = mergedVal;
        }
      }
    }
  } else if (cloudHashes.core !== baseHashes.core && mineHashes.core === baseHashes.core) {
    autoMergedPaths.push("/core");
  }

  return {
    merged: mergedRecord as T,
    conflicts,
    autoMergedPaths,
  };
}
