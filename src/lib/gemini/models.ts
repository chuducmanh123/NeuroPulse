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

export interface GeminiWaterfallJsonOptions {
  source: string;
  apiKey: string;
  parts: ReadonlyArray<Record<string, unknown>>;
  temperature?: number;
  responseMimeType?: string;
  models?: readonly string[];
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export type GeminiWaterfallJsonResult<T = unknown> =
  | { ok: true; data: T; model: string }
  | { ok: false; lastErrorReason: string };

/**
 * Calls the shared Gemini model waterfall (`config/gemini-models.json`, prioritizing
 * Gen-4 `gemini-4-hydrogen` first) with per-model timeout and structured JSON parsing.
 */
export async function callGeminiWaterfallJson<T = unknown>(
  options: GeminiWaterfallJsonOptions
): Promise<GeminiWaterfallJsonResult<T>> {
  const models = options.models ?? GEMINI_WATERFALL_MODELS;
  const fetchFn = options.fetchImpl ?? fetch;
  const temperature = options.temperature ?? 0.15;
  const responseMimeType = options.responseMimeType ?? "application/json";
  const timeoutMs = options.timeoutMs ?? 45_000;

  let lastErrorReason = "Unknown Gemini extraction failure";

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const nextModel = models[i + 1];

    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const signal =
        timeoutMs > 0 && typeof AbortSignal?.timeout === "function"
          ? AbortSignal.timeout(timeoutMs)
          : undefined;

      const res = await fetchFn(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": options.apiKey,
        },
        ...(signal ? { signal } : {}),
        body: JSON.stringify({
          contents: [{ parts: [...options.parts] }],
          generationConfig: {
            temperature,
            responseMimeType,
          },
        }),
      });

      if (!res.ok) {
        lastErrorReason = res.statusText || `HTTP ${res.status}`;
        recordGeminiFallback({
          source: options.source,
          failedModel: model,
          status: res.status,
          reason: lastErrorReason,
          nextModel,
        });
        continue;
      }

      const data = (await res.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string; thought?: boolean }>;
          };
        }>;
      };
      const parts = data?.candidates?.[0]?.content?.parts || [];
      const textParts = parts
        .filter((p) => Boolean(p?.text) && !p?.thought)
        .map((p) => p.text as string);
      let rawJson = textParts.join("").trim();
      if (!rawJson && parts[0]?.text) {
        rawJson = parts[0].text.trim();
      }

      if (!rawJson) {
        lastErrorReason = "Empty response from Gemini";
        recordGeminiFallback({
          source: options.source,
          failedModel: model,
          reason: lastErrorReason,
          nextModel,
        });
        continue;
      }

      rawJson = rawJson.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      let parsed: unknown;
      try {
        parsed = JSON.parse(rawJson);
      } catch {
        const objMatch = rawJson.match(/\{[\s\S]*\}/);
        if (!objMatch) {
          throw new Error("Invalid JSON response from Gemini");
        }
        parsed = JSON.parse(objMatch[0]);
      }

      return { ok: true, data: parsed as T, model };
    } catch (err) {
      lastErrorReason =
        err instanceof Error ? err.message : "Network or JSON parse error";
      recordGeminiFallback({
        source: options.source,
        failedModel: model,
        reason: lastErrorReason,
        nextModel,
      });
    }
  }

  return { ok: false, lastErrorReason };
}
