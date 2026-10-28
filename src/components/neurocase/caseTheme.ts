import { CaseDifficulty } from "@/types/clinicalCase";

export const DIFFICULTY_BADGES: Record<CaseDifficulty, string> = {
  Resident: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  Fellow: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  Attending: "bg-rose-500/15 text-rose-500 border-rose-500/30",
};

export interface SpecialtyTheme {
  borderLeft: string;
  cardBg: string;
  cardBorder: string;
  badge: string;
  accentText: string;
  dotColor: string;
}

export function getSpecialtyTheme(subspecialty: string): SpecialtyTheme {
  const norm = (subspecialty || "").toLowerCase();
  if (norm.includes("stroke") || norm.includes("vascular")) {
    return {
      borderLeft: "border-l-rose-500",
      cardBg: "bg-rose-50/40 dark:bg-rose-950/20",
      cardBorder: "border-rose-200 dark:border-rose-900/60 hover:border-rose-400 dark:hover:border-rose-500",
      badge: "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/50 dark:text-rose-300 dark:border-rose-800",
      accentText: "text-rose-600 dark:text-rose-400",
      dotColor: "bg-rose-500",
    };
  }
  if (norm.includes("critical") || norm.includes("neurocritical") || norm.includes("icu")) {
    return {
      borderLeft: "border-l-amber-500",
      cardBg: "bg-amber-50/40 dark:bg-amber-950/20",
      cardBorder: "border-amber-200 dark:border-amber-900/60 hover:border-amber-400 dark:hover:border-amber-500",
      badge: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-800",
      accentText: "text-amber-600 dark:text-amber-400",
      dotColor: "bg-amber-500",
    };
  }
  if (norm.includes("epilepsy") || norm.includes("seizure")) {
    return {
      borderLeft: "border-l-purple-500",
      cardBg: "bg-purple-50/40 dark:bg-purple-950/20",
      cardBorder: "border-purple-200 dark:border-purple-900/60 hover:border-purple-400 dark:hover:border-purple-500",
      badge: "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-800",
      accentText: "text-purple-600 dark:text-purple-400",
      dotColor: "bg-purple-500",
    };
  }
  if (norm.includes("immuno") || norm.includes("neuroimmunology") || norm.includes("sclerosis")) {
    return {
      borderLeft: "border-l-emerald-500",
      cardBg: "bg-emerald-50/40 dark:bg-emerald-950/20",
      cardBorder: "border-emerald-200 dark:border-emerald-900/60 hover:border-emerald-400 dark:hover:border-emerald-500",
      badge: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-800",
      accentText: "text-emerald-600 dark:text-emerald-400",
      dotColor: "bg-emerald-500",
    };
  }
  if (norm.includes("cognit") || norm.includes("dementia") || norm.includes("memory") || norm.includes("alzheimer")) {
    return {
      borderLeft: "border-l-blue-500",
      cardBg: "bg-blue-50/40 dark:bg-blue-950/20",
      cardBorder: "border-blue-200 dark:border-blue-900/60 hover:border-blue-400 dark:hover:border-blue-500",
      badge: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800",
      accentText: "text-blue-600 dark:text-blue-400",
      dotColor: "bg-blue-500",
    };
  }
  if (norm.includes("movement") || norm.includes("parkinson") || norm.includes("tremor") || norm.includes("ataxia")) {
    return {
      borderLeft: "border-l-teal-500",
      cardBg: "bg-teal-50/40 dark:bg-teal-950/20",
      cardBorder: "border-teal-200 dark:border-teal-900/60 hover:border-teal-400 dark:hover:border-teal-500",
      badge: "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900/50 dark:text-teal-300 dark:border-teal-800",
      accentText: "text-teal-600 dark:text-teal-400",
      dotColor: "bg-teal-500",
    };
  }
  if (norm.includes("neuro-onc") || norm.includes("tumor") || norm.includes("glioma") || norm.includes("oncol")) {
    return {
      borderLeft: "border-l-indigo-500",
      cardBg: "bg-indigo-50/40 dark:bg-indigo-950/20",
      cardBorder: "border-indigo-200 dark:border-indigo-900/60 hover:border-indigo-400 dark:hover:border-indigo-500",
      badge: "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-900/50 dark:text-indigo-300 dark:border-indigo-800",
      accentText: "text-indigo-600 dark:text-indigo-400",
      dotColor: "bg-indigo-500",
    };
  }
  if (norm.includes("pediatric") || norm.includes("child") || norm.includes("peds")) {
    return {
      borderLeft: "border-l-pink-500",
      cardBg: "bg-pink-50/40 dark:bg-pink-950/20",
      cardBorder: "border-pink-200 dark:border-pink-900/60 hover:border-pink-400 dark:hover:border-pink-500",
      badge: "bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-900/50 dark:text-pink-300 dark:border-pink-800",
      accentText: "text-pink-600 dark:text-pink-400",
      dotColor: "bg-pink-500",
    };
  }
  if (norm.includes("neuro-ophthalm") || norm.includes("vision") || norm.includes("optic")) {
    return {
      borderLeft: "border-l-cyan-500",
      cardBg: "bg-cyan-50/40 dark:bg-cyan-950/20",
      cardBorder: "border-cyan-200 dark:border-cyan-900/60 hover:border-cyan-400 dark:hover:border-cyan-500",
      badge: "bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-900/50 dark:text-cyan-300 dark:border-cyan-800",
      accentText: "text-cyan-600 dark:text-cyan-400",
      dotColor: "bg-cyan-500",
    };
  }
  if (norm.includes("neuromuscular") || norm.includes("als") || norm.includes("mg") || norm.includes("myasthenia")) {
    return {
      borderLeft: "border-l-amber-600",
      cardBg: "bg-amber-50/40 dark:bg-amber-950/20",
      cardBorder: "border-amber-200 dark:border-amber-900/60 hover:border-amber-400 dark:hover:border-amber-500",
      badge: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-800",
      accentText: "text-amber-600 dark:text-amber-400",
      dotColor: "bg-amber-600",
    };
  }
  return {
    borderLeft: "border-l-slate-400",
    cardBg: "bg-slate-50/50 dark:bg-slate-900/40",
    cardBorder: "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700",
    badge: "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700",
    accentText: "text-slate-600 dark:text-slate-400",
    dotColor: "bg-slate-400",
  };
}
