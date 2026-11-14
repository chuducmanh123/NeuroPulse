import geminiModelsConfig from "../../../config/gemini-models.json" with { type: "json" };

export const GEMINI_WATERFALL_MODELS: readonly string[] =
  geminiModelsConfig.waterfall;

export const PRIMARY_GEMINI_MODEL: string =
  GEMINI_WATERFALL_MODELS[0] ?? "gemini-4-hydrogen";

export interface GeminiFallbackEvent {
  timestamp: string;
  source: string;
  failedModel: string;
  status?: number;
  reason: string;
  nextModel?: string;
}

const MAX_FALLBACK_LOGS = 50;
const fallbackLogs: GeminiFallbackEvent[] = [];

/**
 * Records a waterfall fallback event and emits a structured console warning
 * so administrators can detect failing or deprecated primary models early.
 */
export function recordGeminiFallback(event: Omit<GeminiFallbackEvent, "timestamp">): void {
  const entry: GeminiFallbackEvent = {
    timestamp: new Date().toISOString(),
    ...event,
  };
  fallbackLogs.unshift(entry);
  if (fallbackLogs.length > MAX_FALLBACK_LOGS) {
    fallbackLogs.length = MAX_FALLBACK_LOGS;
  }
  const statusPart = entry.status ? ` (HTTP ${entry.status})` : "";
  const nextPart = entry.nextModel ? ` -> falling back to ${entry.nextModel}` : " -> no more fallback models";
  console.warn(
    `[Gemini Waterfall Fallback] [${entry.source}] ${entry.failedModel}${statusPart}: ${entry.reason}${nextPart}`
  );
}

/**
 * Returns recent waterfall fallback events (newest first).
 */
export function getGeminiFallbackLogs(): GeminiFallbackEvent[] {
  return [...fallbackLogs];
}
