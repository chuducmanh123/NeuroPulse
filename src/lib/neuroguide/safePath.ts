import path from "node:path";
import net from "node:net";

/**
 * Safely resolves a single-level child filename inside `baseDir`.
 * Rejects empty values, null bytes, path separators, `..`, and trailing dots/spaces.
 */
export function resolveSafeChildPath(baseDir: string, fileName: string): string {
  if (typeof fileName !== "string" || fileName.length === 0 || fileName.includes("\0")) {
    throw new Error("Invalid file path: empty or contains null byte.");
  }
  const trimmed = fileName.trim();
  if (
    trimmed !== fileName ||
    trimmed === "." ||
    trimmed === ".." ||
    trimmed.includes("/") ||
    trimmed.includes("\\") ||
    trimmed.includes(":") ||
    /[ .]$/.test(trimmed)
  ) {
    throw new Error(`Invalid file path segment: ${trimmed}`);
  }

  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(resolvedBase, trimmed);
  const baseWithSep = resolvedBase.endsWith(path.sep) ? resolvedBase : `${resolvedBase}${path.sep}`;

  if (!resolvedTarget.startsWith(baseWithSep)) {
    throw new Error(`Path traversal rejected outside ${resolvedBase}`);
  }
  return resolvedTarget;
}

/**
 * Validates chunked upload IDs to strict alphanumeric/underscore/hyphen characters.
 */
export function isValidUploadId(uploadId: unknown): uploadId is string {
  return typeof uploadId === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(uploadId);
}

/**
 * Parses a guideline publication year into a safe integer in [1900, 2100].
 */
export function parseSafeYear(value: unknown): number | undefined {
  if (typeof value === "number") {
    if (Number.isInteger(value) && value >= 1900 && value <= 2100) {
      return value;
    }
    return undefined;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{4}$/.test(trimmed)) {
      const parsed = Number.parseInt(trimmed, 10);
      if (parsed >= 1900 && parsed <= 2100) return parsed;
    }
  }
  return undefined;
}

function isPrivateOrReservedIpv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => Number.parseInt(p, 10));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === 0) return true; // 0.0.0.0/8 ("this" network)
  if (a === 10) return true; // 10.0.0.0/8 (RFC1918)
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 (CGNAT)
  if (a === 127) return true; // 127.0.0.0/8 (loopback)
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 (link-local / cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 (RFC1918)
  if (a === 192 && b === 0 && parts[2] === 0) return true; // 192.0.0.0/24
  if (a === 192 && b === 0 && parts[2] === 2) return true; // 192.0.2.0/24 (TEST-NET-1)
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 (RFC1918)
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 (benchmarking)
  if (a === 198 && b === 51 && parts[2] === 100) return true; // 198.51.100.0/24
  if (a === 203 && b === 0 && parts[2] === 113) return true; // 203.0.113.0/24
  if (a >= 224) return true; // Multicast & reserved (224.0.0.0/4+)
  return false;
}

/**
 * Checks whether an IPv4 or IPv6 literal belongs to loopback, private, link-local, or reserved space.
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  const cleaned = ip.trim().replace(/^\[|\]$/g, "").split("%")[0].toLowerCase();
  const ipVer = net.isIP(cleaned);
  if (ipVer === 4) {
    return isPrivateOrReservedIpv4(cleaned);
  }
  if (ipVer === 6) {
    if (cleaned === "::" || cleaned === "::1") return true;
    if (cleaned.startsWith("fc") || cleaned.startsWith("fd")) return true; // ULA fc00::/7
    if (/^fe[89ab][0-9a-f]:/i.test(cleaned) || /^fe[89ab][0-9a-f]$/i.test(cleaned)) return true; // fe80::/10 link-local
    if (cleaned.startsWith("ff")) return true; // multicast
    if (cleaned.startsWith("::ffff:")) {
      const mapped = cleaned.slice("::ffff:".length);
      if (net.isIP(mapped) === 4) return isPrivateOrReservedIpv4(mapped);
    }
    return false;
  }
  return false;
}

/**
 * Validates an external URL against SSRF and optional host/path allowlists.
 */
export function validateSafeExternalUrl(
  rawUrl: string,
  options?: {
    allowedHosts?: string[];
    allowedPathPrefix?: string;
    httpsOnly?: boolean;
  }
): URL {
  if (typeof rawUrl !== "string" || rawUrl.trim().length === 0) {
    throw new Error("Empty URL.");
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new Error("Malformed URL.");
  }

  const httpsOnly = options?.httpsOnly ?? false;
  if (httpsOnly) {
    if (parsed.protocol !== "https:") {
      throw new Error("Only https:// URLs are permitted.");
    }
  } else if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Only http:// and https:// URLs are permitted.");
  }

  if (parsed.username || parsed.password) {
    throw new Error("URL credentials are not permitted.");
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    !hostname ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new Error(`Blocked local/internal hostname: ${hostname}`);
  }

  if (net.isIP(hostname.replace(/^\[|\]$/g, "")) !== 0 && isPrivateOrReservedIp(hostname)) {
    throw new Error(`Blocked private or reserved IP address: ${hostname}`);
  }

  if (options?.allowedHosts && options.allowedHosts.length > 0) {
    const normalizedAllowed = options.allowedHosts.map((h) => h.toLowerCase());
    const hostAllowed = normalizedAllowed.some((allowed) => {
      if (allowed.startsWith("*.")) {
        const suffix = allowed.slice(1); // ".example.com"
        return hostname.endsWith(suffix) && hostname.length > suffix.length;
      }
      return hostname === allowed;
    });
    if (!hostAllowed) {
      throw new Error(`URL host ${hostname} is not in the allowed host list.`);
    }
  }

  if (options?.allowedPathPrefix && !parsed.pathname.startsWith(options.allowedPathPrefix)) {
    throw new Error(`URL path ${parsed.pathname} is not permitted.`);
  }

  return parsed;
}
