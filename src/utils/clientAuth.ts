"use client";

/**
 * Utility to retrieve stored admin authentication token from browser storage (sessionStorage / localStorage)
 */
export function getStoredAdminToken(): string {
  if (typeof window === "undefined") return "";
  try {
    return (
      sessionStorage.getItem("neurocase_admin_token") ||
      localStorage.getItem("neurocase_admin_token") ||
      sessionStorage.getItem("adminToken") ||
      localStorage.getItem("adminToken") ||
      ""
    );
  } catch {
    return "";
  }
}

/**
 * Returns authorization headers containing x-admin-token and Bearer token if available.
 */
export function getAdminHeaders(overrideToken?: string): Record<string, string> {
  const token = overrideToken || getStoredAdminToken();
  if (!token) return {};
  return {
    "x-admin-token": token,
    Authorization: `Bearer ${token}`,
  };
}
