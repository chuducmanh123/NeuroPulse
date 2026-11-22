"use client";

import React from "react";

export interface AutoResizeTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minRows?: number;
  maxRows?: number;
  value: string;
}

/**
 * Auto-resize textarea that grows and shrinks to fit its content without manual dragging.
 */
export function AutoResizeTextarea({
  minRows = 2,
  maxRows,
  value,
  onChange,
  className = "",
  ...props
}: AutoResizeTextareaProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const adjustHeight = React.useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    // Reset to 0px so scrollHeight reflects true text height when shrinking
    el.style.height = "0px";
    const computed = window.getComputedStyle(el);
    const lineHeight = parseFloat(computed.lineHeight) || 20;
    const paddingTop = parseFloat(computed.paddingTop) || 0;
    const paddingBottom = parseFloat(computed.paddingBottom) || 0;
    const borderTop = parseFloat(computed.borderTopWidth) || 0;
    const borderBottom = parseFloat(computed.borderBottomWidth) || 0;
    const minH = minRows * lineHeight + paddingTop + paddingBottom + borderTop + borderBottom;
    const maxH =
      maxRows !== undefined
        ? maxRows * lineHeight + paddingTop + paddingBottom + borderTop + borderBottom
        : Infinity;
    const contentH = el.scrollHeight + borderTop + borderBottom;
    const targetH = Math.min(Math.max(contentH, minH), maxH);
    el.style.height = `${targetH}px`;
    el.style.overflowY = contentH > maxH ? "auto" : "hidden";
  }, [minRows, maxRows]);

  React.useLayoutEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let lastWidth = el.clientWidth;
    const observer = new ResizeObserver((entries) => {
      const nextWidth = entries[0]?.contentRect.width ?? el.clientWidth;
      if (Math.abs(nextWidth - lastWidth) > 1) {
        lastWidth = nextWidth;
        adjustHeight();
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [adjustHeight]);

  return (
    <textarea
      ref={textareaRef}
      rows={minRows}
      value={value}
      onChange={(e) => {
        onChange?.(e);
        adjustHeight();
      }}
      className={`resize-none ${className}`}
      {...props}
    />
  );
}
