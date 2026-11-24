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
 * Persists the admin token in sessionStorage only and removes any legacy persistent copies.
 */
export function storeAdminToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem("neurocase_admin_token", token);
    sessionStorage.removeItem("adminToken");
    localStorage.removeItem("neurocase_admin_token");
    localStorage.removeItem("adminToken");
  } catch {
    // Ignore storage quota/access errors
  }
}

/**
 * Clears both current and legacy admin token keys across sessionStorage and localStorage.
 */
export function clearStoredAdminToken(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem("neurocase_admin_token");
    sessionStorage.removeItem("adminToken");
    localStorage.removeItem("neurocase_admin_token");
    localStorage.removeItem("adminToken");
  } catch {
    // Ignore storage access errors
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
