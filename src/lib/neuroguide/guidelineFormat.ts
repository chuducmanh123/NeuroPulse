/**
 * Guideline Form Architecture & Detection Engine
 * 
 * Manages the available clinical guideline forms (AHA, ESO, Standard)
 * and provides association (society) detection to automatically select
 * the matching form when guidelines are searched or uploaded.
 * 
 * Easily extensible for future medical societies (e.g., AAN, ESC, etc.).
 */

export type GuidelineFormFormat = "ESO" | "AHA" | "STANDARD";

export interface GuidelineFormDefinition {
  id: GuidelineFormFormat;
  label: string;
  badgeLabel: (society?: string) => string;
  activeClasses: string;
  inactiveClasses: string;
  badgeClasses: string;
  description: string;
  /**
   * Evaluates whether a given society / title / content matches this form format.
   */
  matchesSociety: (params: {
    societyUpper: string;
    titleLower: string;
    docIdLower?: string;
    contentLower?: string;
    hasPico?: boolean;
    hasCorLoe?: boolean;
  }) => boolean;
}

export const GUIDELINE_FORMS: GuidelineFormDefinition[] = [
  {
    id: "ESO",
    label: "ESO Format",
    badgeLabel: () => "🔵 ESO GRADE (PICO) FORMAT",
    activeClasses: "bg-blue-600 text-white shadow-2xs font-extrabold",
    inactiveClasses: "text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40",
    badgeClasses: "border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40",
    description: "European Stroke Organisation (GRADE methodology with PICO clinical questions & expert consensus)",
    matchesSociety: ({ societyUpper, titleLower, docIdLower = "", contentLower = "", hasPico }) => {
      if (societyUpper.includes("ESO") || societyUpper.includes("EUROPEAN STROKE")) return true;
      if (titleLower.includes("eso") || titleLower.includes("european stroke")) return true;
      if (docIdLower.includes("eso")) return true;
      if (hasPico) return true;
      if (contentLower.includes("pico ") || contentLower.includes("grade ") || contentLower.includes("synoptic table")) {
        return true;
      }
      return false;
    },
  },
  {
    id: "AHA",
    label: "AHA Format",
    badgeLabel: () => "🔴 AHA/ASA (COR & LOE) FORMAT",
    activeClasses: "bg-rose-600 text-white shadow-2xs font-extrabold",
    inactiveClasses: "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40",
    badgeClasses: "border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40",
    description: "ACC/AHA / ASA (Class of Recommendation [COR] & Level of Evidence [LOE])",
    matchesSociety: ({ societyUpper, titleLower, docIdLower = "", contentLower = "", hasCorLoe }) => {
      if (
        societyUpper.includes("AHA") ||
        societyUpper.includes("ASA") ||
        societyUpper.includes("ACC") ||
        societyUpper.includes("AMERICAN HEART") ||
        societyUpper.includes("AMERICAN STROKE")
      ) {
        return true;
      }
      if (
        titleLower.includes("aha") ||
        titleLower.includes("asa") ||
        titleLower.includes("acc") ||
        titleLower.includes("american heart") ||
        titleLower.includes("stroke association") ||
        titleLower.includes("atrial fibrillation")
      ) {
        return true;
      }
      if (docIdLower.includes("aha") || docIdLower.includes("asa") || docIdLower.includes("acc")) {
        return true;
      }
      if (hasCorLoe) return true;
      if (
        contentLower.includes("class 1") ||
        contentLower.includes("class 2a") ||
        contentLower.includes("class 2b") ||
        contentLower.includes("class 3") ||
        contentLower.includes("cor ") ||
        contentLower.includes("loe ")
      ) {
        return true;
      }
      return false;
    },
  },
  {
    id: "STANDARD",
    label: "Standard",
    badgeLabel: (society?: string) => `🟢 Standard Format (${society || "Standard"})`,
    activeClasses: "bg-slate-700 text-white shadow-2xs font-extrabold",
    inactiveClasses: "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700",
    badgeClasses: "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40",
    description: "Standard clinical recommendation structure (universal free-text grading & clinical trials)",
    matchesSociety: () => true, // Fallback format for other societies (AAN, ESC, NCS, ILAE, etc.)
  },
];

/**
 * Automatically inspects a guideline's metadata and content to detect
 * the issuing society/organization and returns the matching form format.
 */
export function detectGuidelineFormFormat(params: {
  society?: string;
  title?: string;
  docId?: string;
  content?: string;
  hasPico?: boolean;
  hasCorLoe?: boolean;
}): GuidelineFormFormat {
  const societyUpper = (params.society || "").toUpperCase().trim();
  const titleLower = (params.title || "").toLowerCase().trim();
  const docIdLower = (params.docId || "").toLowerCase().trim();
  const contentLower = (params.content || "").toLowerCase().slice(0, 5000);

  // Check ESO first (or AHA first if AHA explicit)
  const isAhaExplicit =
    societyUpper.includes("AHA") ||
    societyUpper.includes("ASA") ||
    societyUpper.includes("ACC") ||
    societyUpper.includes("AMERICAN HEART") ||
    societyUpper.includes("AMERICAN STROKE") ||
    titleLower.includes("american heart") ||
    titleLower.includes("american stroke");

  const isEsoExplicit =
    societyUpper.includes("ESO") ||
    societyUpper.includes("EUROPEAN STROKE") ||
    titleLower.includes("european stroke") ||
    titleLower.includes("eso guideline");

  if (isEsoExplicit) return "ESO";
  if (isAhaExplicit) return "AHA";

  // Check form matchers in order
  for (const form of GUIDELINE_FORMS) {
    if (form.id === "STANDARD") continue; // Checked last as fallback
    if (
      form.matchesSociety({
        societyUpper,
        titleLower,
        docIdLower,
        contentLower,
        hasPico: params.hasPico,
        hasCorLoe: params.hasCorLoe,
      })
    ) {
      return form.id;
    }
  }

  return "STANDARD";
}

/**
 * Gets the definition object for a specific form format.
 */
export function getGuidelineFormDef(format: GuidelineFormFormat): GuidelineFormDefinition {
  return GUIDELINE_FORMS.find((f) => f.id === format) || GUIDELINE_FORMS[GUIDELINE_FORMS.length - 1];
}

/**
 * Strips any legacy or trailing 'AI VERIFIED' / '(AI VERIFIED)' suffixes from guideline titles.
 */
export function cleanGuidelineTitle(title?: string | null): string {
  if (!title) return "";
  return title
    .replace(/\s*[-–—|•]?\s*(\[|\()?AI\s+VERIFIED(\]|\))?\s*$/i, "")
    .trim();
}
