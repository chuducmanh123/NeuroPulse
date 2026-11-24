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

function timingSafeEqualStrings(a: string, b: string): boolean {
  const digestA = crypto.createHash("sha256").update(a, "utf8").digest();
  const digestB = crypto.createHash("sha256").update(b, "utf8").digest();
  return crypto.timingSafeEqual(digestA, digestB);
}

export function isProductionRuntime(nodeEnv?: string): boolean {
  const effectiveEnv = nodeEnv ?? process.env.NODE_ENV;
  return effectiveEnv === "production" || Boolean(process.env.VERCEL);
}

export function resolveAdminCredentials(options?: {
  adminAuthSecret?: string;
  adminPasscode?: string;
  nodeEnv?: string;
}): { secret: string; passcode: string } | null {
  const rawSecret = (options?.adminAuthSecret ?? process.env.ADMIN_AUTH_SECRET ?? "").trim();
  const rawPasscode = (options?.adminPasscode ?? process.env.ADMIN_PASSCODE ?? "").trim();

  if (isProductionRuntime(options?.nodeEnv)) {
    if (!rawSecret || !rawPasscode) {
      return null;
    }
    return { secret: rawSecret, passcode: rawPasscode };
  }

  return {
    secret: rawSecret || DEFAULT_AUTH_SECRET,
    passcode: rawPasscode || DEFAULT_PASSCODE,
  };
}

export function isAdminAuthConfigured(options?: {
  adminAuthSecret?: string;
  adminPasscode?: string;
  nodeEnv?: string;
}): boolean {
  return resolveAdminCredentials(options) !== null;
}

export function verifyAdminPasscode(
  input: string | null | undefined,
  options?: {
    adminAuthSecret?: string;
    adminPasscode?: string;
    nodeEnv?: string;
  }
): boolean {
  if (typeof input !== "string") return false;
  const trimmedInput = input.trim();
  if (!trimmedInput) return false;

  const creds = resolveAdminCredentials(options);
  if (!creds) return false;

  return timingSafeEqualStrings(trimmedInput, creds.passcode);
}

/**
 * Creates an authentication token for admin authorization.
 * Supports timestamped session tokens with expiration (TTL).
 * Fails closed in production when ADMIN_AUTH_SECRET or ADMIN_PASSCODE is missing.
 */
export function generateAdminAuthToken(
  adminAuthSecret?: string,
  adminPasscode?: string,
  options?: { expiresInHours?: number; legacyStatic?: boolean; nodeEnv?: string }
): string {
  const creds = resolveAdminCredentials({
    adminAuthSecret,
    adminPasscode,
    nodeEnv: options?.nodeEnv,
  });
  if (!creds) {
    throw new Error("ADMIN_AUTH_NOT_CONFIGURED");
  }

  if (options?.legacyStatic) {
    return crypto.createHmac("sha256", creds.secret).update(creds.passcode).digest("hex");
  }

  const hours = options?.expiresInHours ?? 24;
  const expiresAt = Date.now() + hours * 60 * 60 * 1000;
  const payload = `${creds.passcode}:${expiresAt}`;
  const signature = crypto.createHmac("sha256", creds.secret).update(payload).digest("hex");

  // Format: token_v2.<expiresAt>.<signature>
  return `token_v2.${expiresAt}.${signature}`;
}

/**
 * Timing-safe admin authorization verification.
 * Accepts expiring HMAC-signed token_v2 credentials only (plaintext passcode rejected).
 * Legacy static HMAC tokens are rejected unless explicitly opted in via allowLegacyStatic.
 */
export function verifyAdminToken(
  token: string | null | undefined,
  options?: {
    adminAuthSecret?: string;
    adminPasscode?: string;
    nodeEnv?: string;
    allowLegacyStatic?: boolean;
  }
): boolean {
  if (typeof token !== "string" || !token) return false;

  const creds = resolveAdminCredentials({
    adminAuthSecret: options?.adminAuthSecret,
    adminPasscode: options?.adminPasscode,
    nodeEnv: options?.nodeEnv,
  });
  if (!creds) return false;

  // 1. Check TTL-based token_v2 format (token_v2.<expiresAt>.<signature>)
  if (token.startsWith("token_v2.")) {
    const parts = token.split(".");
    if (parts.length === 3 && /^\d+$/.test(parts[1])) {
      const expiresAt = Number.parseInt(parts[1], 10);
      const signature = parts[2];

      if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
        return false;
      }

      const payload = `${creds.passcode}:${expiresAt}`;
      const expectedSignature = crypto.createHmac("sha256", creds.secret).update(payload).digest("hex");

      if (signature.length !== expectedSignature.length) return false;
      try {
        return crypto.timingSafeEqual(Buffer.from(signature, "utf8"), Buffer.from(expectedSignature, "utf8"));
      } catch {
        return false;
      }
    }
    return false;
  }

  // 2. Optional legacy static HMAC token (disabled by default)
  const allowLegacy =
    options?.allowLegacyStatic === true || process.env.ALLOW_LEGACY_STATIC_ADMIN_TOKEN === "1";
  if (allowLegacy) {
    const expectedLegacy = crypto.createHmac("sha256", creds.secret).update(creds.passcode).digest("hex");
    if (token.length === expectedLegacy.length) {
      try {
        if (crypto.timingSafeEqual(Buffer.from(token, "utf8"), Buffer.from(expectedLegacy, "utf8"))) {
          return true;
        }
      } catch {}
    }
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
