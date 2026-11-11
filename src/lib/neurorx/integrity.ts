// Integrity utilities for NeuroRx (CDSS)
// Reference: NEURORX-GUARDRAILS.md (G1, G2) & SPEC-neurorx.md Section 5

import crypto from "node:crypto";
import type { DrugRecord, RecordStatus } from "@/types/neurorx";

/**
 * Normalizes text for substring search in source documents.
 * - Lowercase
 * - Collapse whitespace (spaces, tabs, newlines)
 * - Join hyphenated line breaks (e.g. "adminis-\ntration" -> "administration")
 * - Unify single/double unicode quotes and dashes
 */
export function normalizeForQuote(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/(\w+)-\s*\n\s*(\w+)/g, "$1$2") // rejoin words broken by hyphen at line break
    .replace(/[\u2018\u2019\u201A\u201B']/g, "'") // single quotes
    .replace(/[\u201C\u201D\u201E\u201F"]/g, '"') // double quotes
    .replace(/[\u2013\u2014\u2015\u2212]/g, "-") // en-dash, em-dash, minus
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Canonicalizes an object to produce deterministic JSON representation.
 * Keys are sorted recursively, and the `verification` field is omitted
 * so that content_hash can be calculated independently of the verification signature.
 */
export function canonicalize(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(canonicalize);
  }

  const sortedObj: Record<string, unknown> = {};
  const keys = Object.keys(obj as Record<string, unknown>).sort();

  for (const key of keys) {
    if (key === "verification") {
      continue; // Exclude verification metadata from hash computation
    }
    sortedObj[key] = canonicalize((obj as Record<string, unknown>)[key]);
  }

  return sortedObj;
}

/**
 * Computes deterministic SHA-256 hex string for a drug record.
 * Works across Node.js runtime and modern browsers (Web Crypto subtle.digest or Node crypto).
 */
export async function computeContentHash(record: unknown): Promise<string> {
  const canonical = canonicalize(record);
  const jsonStr = JSON.stringify(canonical);

  if (typeof globalThis.crypto?.subtle?.digest === "function") {
    const encoder = new TextEncoder();
    const data = encoder.encode(jsonStr);
    const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Fallback for older Node environments without subtle on globalThis
  const nodeCrypto = await import("node:crypto");
  return nodeCrypto.createHash("sha256").update(jsonStr, "utf8").digest("hex");
}

/**
 * Synchronous version for CLI scripts running in Node.js
 */
export function computeContentHashSync(record: unknown): string {
  const canonical = canonicalize(record);
  const jsonStr = JSON.stringify(canonical);
  return crypto.createHash("sha256").update(jsonStr, "utf8").digest("hex");
}

/**
 * Determines the effective status of a drug record.
 * If status is 'verified' but content_hash does not match the actual content,
 * it is automatically downgraded to 'draft' at runtime.
 */
export async function getEffectiveStatus(record: DrugRecord): Promise<RecordStatus> {
  if (record.status !== "verified") {
    return "draft";
  }

  const storedHash = record.verification?.content_hash;
  if (!storedHash) {
    return "draft";
  }

  const currentHash = await computeContentHash(record);
  if (currentHash !== storedHash) {
    return "draft";
  }

  return "verified";
}
