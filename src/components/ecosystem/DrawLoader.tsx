import React from "react";

export type DrawLoaderVariant =
  | "compass"
  | "pathway"
  | "queue"
  | "book"
  | "case"
  | "rx"
  | "calc"
  | "pulse"
  | "brain";

interface DrawLoaderIconProps {
  variant: DrawLoaderVariant;
  className?: string;
}

/**
 * Editorial ink-stroke SVG icon with continuous stroke-draw loop animation
 * (`pathLength={1}` + `.ink-draw-loop` in `globals.css`) for loading states.
 */
export function DrawLoaderIcon({
  variant,
  className = "w-9 h-9",
}: DrawLoaderIconProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.65}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`ink-draw-loop ${className}`}
    >
      {variant === "compass" && (
        <>
          <circle pathLength={1} cx="20" cy="20" r="14.5" />
          <path
            pathLength={1}
            className="ink-delay-1"
            d="M25.5 14.5 L21.8 21.8 L14.5 25.5 L18.2 18.2 Z"
          />
          <circle
            className="ink-static"
            cx="20"
            cy="20"
            r="1.4"
            fill="currentColor"
            stroke="none"
          />
          <path
            pathLength={1}
            className="ink-delay-2"
            d="M20 3.5 V6.2 M20 33.8 V36.5 M3.5 20 H6.2 M33.8 20 H36.5"
          />
        </>
      )}

      {variant === "pathway" && (
        <>
          <rect pathLength={1} x="14.5" y="5" width="11" height="7" rx="2" />
          <path
            pathLength={1}
            className="ink-delay-1"
            d="M20 12 V17.5 C20 19.5, 11 19, 11 22.5 V26 M20 17.5 C20 19.5, 29 19, 29 22.5 V26"
          />
          <rect
            pathLength={1}
            className="ink-delay-2"
            x="5.5"
            y="26"
            width="11"
            height="8"
            rx="2"
          />
          <rect
            pathLength={1}
            className="ink-delay-2"
            x="23.5"
            y="26"
            width="11"
            height="8"
            rx="2"
          />
        </>
      )}

      {variant === "queue" && (
        <>
          <path
            pathLength={1}
            d="M14 7 H10.5 C8.8 7 7.5 8.3 7.5 10 V32.5 C7.5 34.2 8.8 35.5 10.5 35.5 H29.5 C31.2 35.5 32.5 34.2 32.5 32.5 V10 C32.5 8.3 31.2 7 29.5 7 H26"
          />
          <rect
            pathLength={1}
            className="ink-delay-1"
            x="14"
            y="4.5"
            width="12"
            height="4.8"
            rx="1.5"
          />
          <path
            pathLength={1}
            className="ink-delay-1"
            d="M13 18 L15.5 20.5 L20 15.5 M23 18.5 H27.5"
          />
          <path
            pathLength={1}
            className="ink-delay-2"
            d="M13 26.5 L15.5 29 L20 24 M23 27 H27.5"
          />
        </>
      )}

      {variant === "book" && (
        <>
          <path
            pathLength={1}
            d="M20 10.5 C16.5 7.8 10.5 7.5 6 9 V30.5 C10.5 29 16.5 29.3 20 32"
          />
          <path
            pathLength={1}
            d="M20 10.5 C23.5 7.8 29.5 7.5 34 9 V30.5 C29.5 29 23.5 29.3 20 32"
          />
          <path pathLength={1} className="ink-delay-1" d="M20 10.5 V32" />
          <path
            pathLength={1}
            className="ink-delay-2"
            d="M10 14.5 H16 M10 19.5 H16 M10 24.5 H14.5 M24 14.5 H30 M24 19.5 H30 M24 24.5 H28.5"
          />
        </>
      )}

      {variant === "case" && (
        <>
          <rect pathLength={1} x="6" y="7.5" width="28" height="25" rx="3.5" />
          <ellipse
            pathLength={1}
            className="ink-delay-1"
            cx="20"
            cy="20"
            rx="7.5"
            ry="9"
          />
          <path
            pathLength={1}
            className="ink-delay-2"
            d="M20 11 V29 M14.5 20 H25.5"
          />
          <circle
            pathLength={1}
            className="ink-delay-2"
            cx="23.5"
            cy="16.5"
            r="2.2"
          />
        </>
      )}

      {variant === "rx" && (
        <>
          <path
            pathLength={1}
            d="M10 28 V9.5 H17.5 C20.8 9.5 23 11.5 23 14.5 C23 17.5 20.8 19.5 17.5 19.5 H10"
          />
          <path pathLength={1} className="ink-delay-1" d="M16 19.5 L28 31.5" />
          <path pathLength={1} className="ink-delay-2" d="M28 21.5 L18 31.5" />
        </>
      )}

      {variant === "pulse" && (
        <>
          <path
            pathLength={1}
            d="M4 21 H11 L14 14.5 L17.5 27.5 L21.5 9.5 L25 30 L28 18 L30.5 21 H36"
          />
          <circle
            className="ink-static"
            cx="36"
            cy="21"
            r="1.6"
            fill="currentColor"
            stroke="none"
          />
        </>
      )}

      {variant === "brain" && (
        <>
          <ellipse pathLength={1} cx="20" cy="20" rx="11.5" ry="14" />
          <path
            pathLength={1}
            className="ink-delay-1"
            d="M20 6 V34 M16.5 15 C18 17.5 18 22.5 16.5 25 M23.5 15 C22 17.5 22 22.5 23.5 25"
          />
          <path
            pathLength={1}
            className="ink-delay-2"
            d="M10.5 16.5 C12.5 16.5 14 18 14 20 M29.5 16.5 C27.5 16.5 26 18 26 20"
          />
        </>
      )}

      {variant === "calc" && (
        <>
          <rect pathLength={1} x="9" y="5.5" width="22" height="29" rx="3" />
          <rect
            pathLength={1}
            className="ink-delay-1"
            x="13"
            y="9.5"
            width="14"
            height="5.5"
            rx="1"
          />
          <path
            pathLength={1}
            className="ink-delay-2"
            d="M14 20.5 H16.5 M20 20.5 H22.5 M25.5 20.5 H27 M14 25.5 H16.5 M20 25.5 H22.5 M14 30.5 H16.5 M20 30.5 H22.5 M25.5 25.5 V30.5"
          />
        </>
      )}
    </svg>
  );
}

interface DrawLoaderProps {
  variant: DrawLoaderVariant;
  label: string;
  sublabel?: string;
  accentClassName?: string;
  iconClassName?: string;
  labelClassName?: string;
  className?: string;
}

/**
 * Centered loading state with an editorial draw-animated SVG icon.
 */
export function DrawLoader({
  variant,
  label,
  sublabel,
  accentClassName = "text-[var(--text-ink)]",
  iconClassName = "w-10 h-10",
  labelClassName = "text-xs sm:text-sm font-semibold tracking-tight text-[var(--text-ink)]",
  className = "",
}: DrawLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center text-center gap-2.5 ${className}`}
    >
      <div className={accentClassName}>
        <DrawLoaderIcon variant={variant} className={iconClassName} />
      </div>
      <p className={labelClassName}>{label}</p>
      {sublabel && (
        <p className="text-xs text-[var(--text-muted)] font-mono">{sublabel}</p>
      )}
    </div>
  );
}
