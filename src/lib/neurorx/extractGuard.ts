// Quote-Guard for NeuroRx AI In-App Extractor
// Reference: NEURORX-GUARDRAILS.md (G1) & SPEC-neurorx.md Section 5

import { normalizeForQuote } from "./integrity.ts";
import type { DrugRecord, SourceRef } from "@/types/neurorx";

export interface RejectedValue {
  path: string;
  field: string;
  reason: string;
  attempted_quote?: string;
  original_value: unknown;
}

export interface ExtractGuardResult {
  guardedDraft: DrugRecord;
  rejectedValues: RejectedValue[];
}

/**
 * Checks if a single SourceRef has a valid verbatim quote in the source text.
 */
export function verifyQuoteInSource(
  ref: unknown,
  normalizedSourceText: string
): { valid: boolean; reason?: string } {
  if (!ref || typeof ref !== "object") {
    return { valid: false, reason: "SourceRef is not a valid object" };
  }
  const r = ref as Partial<SourceRef>;
  if (!r.quote || typeof r.quote !== "string" || r.quote.trim().length === 0) {
    return { valid: false, reason: "Quote is missing or empty" };
  }
  if (r.quote.length > 400) {
    return {
      valid: false,
      reason: `Quote exceeds 400 characters (${r.quote.length} chars)`,
    };
  }
  const normalizedQuote = normalizeForQuote(r.quote);
  if (!normalizedQuote) {
    return { valid: false, reason: "Quote is empty after normalization" };
  }
  if (!normalizedSourceText.includes(normalizedQuote)) {
    return {
      valid: false,
      reason: `Quote not found verbatim in source text: "${r.quote.slice(0, 100)}${r.quote.length > 100 ? "…" : ""}"`,
    };
  }
  return { valid: true };
}

function isSourced(
  obj: unknown
): obj is { value: unknown; refs: SourceRef[]; note?: string } {
  return (
    obj !== null &&
    typeof obj === "object" &&
    "refs" in obj &&
    "value" in obj &&
    Array.isArray((obj as Record<string, unknown>).refs)
  );
}

/**
 * Server-side guard that traverses an extracted drug draft and verifies
 * every quote verbatim against the provided source text.
 * Any field failing the quote check is set to null and recorded in rejectedValues.
 * Also strictly enforces `status: "draft"` and clears all verification metadata.
 */
export function applyQuoteGuard(
  draft: unknown,
  sourceText: string
): ExtractGuardResult {
  const rejectedValues: RejectedValue[] = [];
  const normalizedSourceText = normalizeForQuote(sourceText || "");

  if (!draft || typeof draft !== "object") {
    throw new Error("Draft must be a non-null object");
  }

  // Deep clone to avoid mutating original
  const guarded = JSON.parse(JSON.stringify(draft)) as Record<string, unknown>;

  // Recursively inspect and guard nodes
  function traverse(node: unknown, currentPath: string, keyName: string): void {
    if (!node || typeof node !== "object") {
      return;
    }

    // 1. If it's a Sourced<T> field
    if (isSourced(node)) {
      if (node.value !== null) {
        if (!node.refs || node.refs.length === 0) {
          rejectedValues.push({
            path: currentPath,
            field: keyName,
            reason: "Non-null value has no source references",
            original_value: node.value,
          });
          node.value = null;
        } else {
          // Check all refs
          let firstFailure: { reason: string; quote?: string } | null = null;
          for (const ref of node.refs) {
            const check = verifyQuoteInSource(ref, normalizedSourceText);
            if (!check.valid) {
              firstFailure = {
                reason: check.reason || "Invalid quote",
                quote: ref?.quote,
              };
              break;
            }
          }

          if (firstFailure) {
            rejectedValues.push({
              path: currentPath,
              field: keyName,
              reason: firstFailure.reason,
              attempted_quote: firstFailure.quote,
              original_value: node.value,
            });
            node.value = null;
            // Filter out corrupt refs
            node.refs = node.refs.filter(
              (r) => verifyQuoteInSource(r, normalizedSourceText).valid
            );
          }
        }
      }
      return;
    }

    // 2. If it's an array, traverse each element
    if (Array.isArray(node)) {
      node.forEach((item, idx) => {
        traverse(item, `${currentPath}[${idx}]`, `${keyName}[${idx}]`);
      });
      return;
    }

    // 3. Check for specific non-Sourced structures that hold refs
    const obj = node as Record<string, unknown>;

    // Handle items like Regimen, RenalBand, McmEntry, TitrationSchedule
    if (Array.isArray(obj.refs)) {
      const rawRefs = obj.refs as SourceRef[];
      let hasInvalid = false;
      let firstFailure: { reason: string; quote?: string } | null = null;

      for (const ref of rawRefs) {
        const check = verifyQuoteInSource(ref, normalizedSourceText);
        if (!check.valid) {
          hasInvalid = true;
          firstFailure = {
            reason: check.reason || "Invalid quote",
            quote: ref?.quote,
          };
          break;
        }
      }

      if (hasInvalid && firstFailure) {
        rejectedValues.push({
          path: `${currentPath}.refs`,
          field: keyName,
          reason: firstFailure.reason,
          attempted_quote: firstFailure.quote,
          original_value: obj.dose ?? obj.dose_text ?? obj.indication ?? obj.percent ?? obj.label ?? null,
        });

        // Filter valid refs
        obj.refs = rawRefs.filter(
          (r) => verifyQuoteInSource(r, normalizedSourceText).valid
        );

        // If all refs failed, null out associated dose or numbers
        if ((obj.refs as SourceRef[]).length === 0) {
          if ("dose" in obj) obj.dose = null;
          if ("dose_text" in obj) obj.dose_text = "No verified source quote";
        }
      }
    }

    // Recurse into all keys
    for (const [k, v] of Object.entries(obj)) {
      if (k === "refs" || k === "verification") continue;
      traverse(v, currentPath ? `${currentPath}.${k}` : k, k);
    }
  }

  traverse(guarded, "", "");

  // Strict guardrail G1 & G2 invariants:
  // Agents NEVER set status: "verified", verified_by, verified_at, or content_hash.
  guarded.status = "draft";
  guarded.verification = {
    verified_by: null,
    verified_at: null,
    content_hash: null,
  };

  return {
    guardedDraft: guarded as unknown as DrugRecord,
    rejectedValues,
  };
}
