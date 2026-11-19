/**
 * Shared Dark Mode / Night Shift synchronization across the Neuro Ecosystem.
 * Keeps `document.documentElement` classes (`dark`, `night-shift`), legacy
 * app-specific localStorage keys, and custom events in sync.
 */

const THEME_EVENT = "neuro-theme-change";

const LEGACY_BOOL_KEYS = ["neuro_dark_mode"] as const;
const LEGACY_STRING_KEYS = [
  "neuropulse_theme",
  "neurorx_theme",
  "neurocase_theme",
] as const;

export function getEcosystemDarkMode(): boolean {
  if (typeof document !== "undefined") {
    if (
      document.documentElement.classList.contains("dark") ||
      document.documentElement.classList.contains("night-shift")
    ) {
      return true;
    }
  }
  if (typeof window === "undefined") return false;
  try {
    if (window.localStorage.getItem("neuro_dark_mode") === "true") return true;
    for (const key of LEGACY_STRING_KEYS) {
      if (window.localStorage.getItem(key) === "dark") return true;
    }
  } catch {
    // Ignore storage access errors in restricted environments
  }
  return false;
}

export function setEcosystemDarkMode(next: boolean): void {
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("dark", next);
    document.documentElement.classList.toggle("night-shift", next);
  }
  if (typeof window !== "undefined") {
    try {
      for (const key of LEGACY_BOOL_KEYS) {
        window.localStorage.setItem(key, String(next));
      }
      for (const key of LEGACY_STRING_KEYS) {
        window.localStorage.setItem(key, next ? "dark" : "light");
      }
    } catch {
      // Ignore storage access errors
    }
    window.dispatchEvent(
      new CustomEvent<{ darkMode: boolean }>(THEME_EVENT, {
        detail: { darkMode: next },
      })
    );
  }
}

export function subscribeEcosystemDarkMode(
  callback: (isDark: boolean) => void
): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => {};
  }

  const handleThemeEvent = (event: Event) => {
    const customEvent = event as CustomEvent<{ darkMode?: boolean }>;
    if (typeof customEvent.detail?.darkMode === "boolean") {
      callback(customEvent.detail.darkMode);
    } else {
      callback(getEcosystemDarkMode());
    }
  };

  const handleStorage = (event: StorageEvent) => {
    if (
      event.key === "neuro_dark_mode" ||
      event.key === "neuropulse_theme" ||
      event.key === "neurorx_theme" ||
      event.key === "neurocase_theme"
    ) {
      const next = getEcosystemDarkMode();
      document.documentElement.classList.toggle("dark", next);
      document.documentElement.classList.toggle("night-shift", next);
      callback(next);
    }
  };

  const observer = new MutationObserver(() => {
    const isDark =
      document.documentElement.classList.contains("dark") ||
      document.documentElement.classList.contains("night-shift");
    callback(isDark);
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });

  window.addEventListener(THEME_EVENT, handleThemeEvent);
  window.addEventListener("storage", handleStorage);

  return () => {
    observer.disconnect();
    window.removeEventListener(THEME_EVENT, handleThemeEvent);
    window.removeEventListener("storage", handleStorage);
  };
}
