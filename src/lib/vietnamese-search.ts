/**
 * Vietnamese Diacritic-Insensitive Search Utility
 * Normalizes unicode diacritics and special characters for instant fuzzy matching.
 */

export function normalizeVietnamese(text: string): string {
  if (!text) return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove combining diacritical marks
    .replace(/[đĐ]/g, (m) => (m === "đ" ? "d" : "D"))
    .toLowerCase()
    .trim();
}

/**
 * Checks whether query words exist in target string (ignoring case & diacritics)
 */
export function matchesQuery(target: string, query: string): boolean {
  if (!query) return true;
  if (!target) return false;

  const normTarget = normalizeVietnamese(target);
  const normQuery = normalizeVietnamese(query);

  const tokens = normQuery.split(/\s+/).filter(Boolean);
  return tokens.every((token) => normTarget.includes(token));
}
