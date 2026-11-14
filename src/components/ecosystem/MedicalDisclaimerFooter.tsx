import React from "react";

export const MEDICAL_DISCLAIMER_TEXT =
  "For educational and clinical reference only. Not a substitute for professional medical judgment; verify all clinical decisions and dosing against current guidelines and official product labeling.";

interface MedicalDisclaimerFooterProps {
  darkMode?: boolean;
  className?: string;
}

export function MedicalDisclaimerFooter({
  darkMode,
  className = "",
}: MedicalDisclaimerFooterProps) {
  const borderTextClasses =
    darkMode === true
      ? "border-slate-800/80 text-slate-400"
      : darkMode === false
      ? "border-slate-200/80 text-slate-500"
      : "border-slate-200/80 dark:border-slate-800/80 text-slate-500 dark:text-slate-400";

  const labelClasses =
    darkMode === true
      ? "text-slate-300"
      : darkMode === false
      ? "text-slate-600"
      : "text-slate-600 dark:text-slate-300";

  return (
    <footer
      className={`mt-12 pt-5 pb-2 border-t text-center text-[11px] leading-relaxed transition-colors ${borderTextClasses} ${className}`}
    >
      <p>
        <span className={`font-semibold ${labelClasses}`}>
          Medical Disclaimer:
        </span>{" "}
        {MEDICAL_DISCLAIMER_TEXT}
      </p>
    </footer>
  );
}
