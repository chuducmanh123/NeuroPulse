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

/**
 * Creates a deterministic authentication token for admin authorization based on secret & passcode.
 */
export function generateAdminAuthToken(
  adminAuthSecret = process.env.ADMIN_AUTH_SECRET,
  adminPasscode = process.env.ADMIN_PASSCODE
): string {
  const secret = adminAuthSecret || "neuropulse-neurocase-auth-secret-key-2026";
  const passcode = adminPasscode || "@neuro2026";
  return crypto.createHmac("sha256", secret).update(passcode).digest("hex");
}

/**
 * Timing-safe admin authorization verification.
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

  const nodeEnv = options?.nodeEnv ?? process.env.NODE_ENV;
  const adminPasscode = options?.adminPasscode ?? process.env.ADMIN_PASSCODE;
  const adminAuthSecret = options?.adminAuthSecret ?? process.env.ADMIN_AUTH_SECRET;

  // In production, refuse admin auth if secrets are not explicitly configured
  if (nodeEnv === "production" && (!adminPasscode || !adminAuthSecret)) {
    console.error("[SECURITY] ADMIN_PASSCODE or ADMIN_AUTH_SECRET missing in production!");
    return false;
  }

  const expected = generateAdminAuthToken(adminAuthSecret, adminPasscode);
  if (token.length !== expected.length) return false;

  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
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
