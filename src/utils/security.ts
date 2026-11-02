import crypto from "crypto";
import type { ClinicalCase } from "../types/clinicalCase";

/**
 * Validates and sanitizes external URLs to prevent Stored XSS via javascript: or data: URIs.
 * Only http:// and https:// protocols are permitted.
 */
export function sanitizeUrl(url: string | undefined): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return "";
}

const DEFAULT_AUTH_SECRET = "neuropulse-neurocase-auth-secret-key-2026";
const DEFAULT_PASSCODE = "@neuro2026";
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours session TTL

/**
 * Creates an authentication token for admin authorization.
 * Supports timestamped session tokens with expiration (TTL) while maintaining compatibility.
 */
export function generateAdminAuthToken(
  adminAuthSecret = process.env.ADMIN_AUTH_SECRET,
  adminPasscode = process.env.ADMIN_PASSCODE,
  options?: { expiresInHours?: number; legacyStatic?: boolean }
): string {
  const secret = adminAuthSecret || DEFAULT_AUTH_SECRET;
  const passcode = adminPasscode || DEFAULT_PASSCODE;

  if (options?.legacyStatic) {
    return crypto.createHmac("sha256", secret).update(passcode).digest("hex");
  }

  const hours = options?.expiresInHours ?? 24;
  const expiresAt = Date.now() + hours * 60 * 60 * 1000;
  const payload = `${passcode}:${expiresAt}`;
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");

  // Format: token_v2.<expiresAt>.<signature>
  return `token_v2.${expiresAt}.${signature}`;
}

/**
 * Timing-safe admin authorization verification.
 * Supports both modern TTL-based tokens (token_v2) and legacy static SHA-256 tokens.
 */
export function verifyAdminToken(
  token: string | null | undefined,
  options?: {
    adminAuthSecret?: string;
    adminPasscode?: string;
    nodeEnv?: string;
  }
): boolean {
  if (!token) return false;

  const adminPasscode = options?.adminPasscode ?? process.env.ADMIN_PASSCODE ?? DEFAULT_PASSCODE;
  const adminAuthSecret = options?.adminAuthSecret ?? process.env.ADMIN_AUTH_SECRET ?? DEFAULT_AUTH_SECRET;

  // 1. Check TTL-based token_v2 format (token_v2.<expiresAt>.<signature>)
  if (token.startsWith("token_v2.")) {
    const parts = token.split(".");
    if (parts.length === 3) {
      const expiresAt = parseInt(parts[1], 10);
      const signature = parts[2];

      // Session expired check
      if (isNaN(expiresAt) || Date.now() > expiresAt) {
        return false;
      }

      const payload = `${adminPasscode}:${expiresAt}`;
      const expectedSignature = crypto.createHmac("sha256", adminAuthSecret).update(payload).digest("hex");

      if (signature.length !== expectedSignature.length) return false;
      try {
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
      } catch {
        return false;
      }
    }
  }

  // 2. Fallback check: Legacy static SHA-256 token format
  const expectedLegacy = crypto.createHmac("sha256", adminAuthSecret).update(adminPasscode).digest("hex");
  if (token.length === expectedLegacy.length) {
    try {
      if (crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedLegacy))) {
        return true;
      }
    } catch {}
  }

  return false;
}

/**
 * Sanitizes community case submissions:
 * - Generates unguessable server ID (prevents ID hijacking)
 * - Forces status to 'pending'
 * - Restricts daily challenge and archive flags
 * - Cleanses external URLs (prevents stored XSS)
 */
export function sanitizeCommunityCaseSubmission(candidate: ClinicalCase): ClinicalCase {
  const newCaseId = `nc-user-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const sanitizedDoi = sanitizeUrl(candidate.source_journal?.doi_url);
  const sanitizedImaging = (candidate.presentation?.imaging || []).map((img) => ({
    ...img,
    doi_url: sanitizeUrl(img.doi_url),
  }));

  return {
    ...candidate,
    id: newCaseId,
    case_code: candidate.case_code || `NC-COMMUNITY-${newCaseId.slice(-6).toUpperCase()}`,
    status: "pending",
    is_daily_challenge: false,
    archive_only: false,
    source_journal: candidate.source_journal
      ? {
          ...candidate.source_journal,
          doi_url: sanitizedDoi,
        }
      : undefined,
    presentation: {
      ...candidate.presentation,
      imaging: sanitizedImaging,
    },
  };
}
