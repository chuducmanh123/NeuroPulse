/**
 * Validates and sanitizes external URLs to prevent Stored XSS via javascript: or data: URIs
 * and non-web schemes such as file://, upload://, or smb://.
 * Only http:// and https:// protocols with a valid hostname are permitted.
 */
export function sanitizeUrl(url: string | undefined | null): string {
  if (typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/[\u0000-\u001F\u007F]/.test(trimmed)) return "";

  try {
    const parsed = new URL(trimmed);
    if ((parsed.protocol === "http:" || parsed.protocol === "https:") && parsed.hostname.length > 0) {
      return trimmed;
    }
  } catch {
    return "";
  }
  return "";
}
