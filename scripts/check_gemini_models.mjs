#!/usr/bin/env node
/**
 * Weekly / on-demand health check for the Gemini Waterfall models
 * defined in config/gemini-models.json.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function loadApiKey() {
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 10) {
    return process.env.GEMINI_API_KEY.trim().replace(/^['"]|['"]$/g, "");
  }
  for (const envFile of [".env.local", ".env"]) {
    const p = path.join(repoRoot, envFile);
    if (!fs.existsSync(p)) continue;
    const raw = fs.readFileSync(p, "utf8");
    const match = raw.match(/^GEMINI_API_KEY\s*=\s*(.+)$/m);
    if (match && match[1].trim().length > 10) {
      return match[1].trim().replace(/^['"]|['"]$/g, "");
    }
  }
  return "";
}

const configPath = path.join(repoRoot, "config", "gemini-models.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const waterfall = Array.isArray(config.waterfall) ? config.waterfall : [];

const apiKey = loadApiKey();
if (!apiKey) {
  console.error("ERROR: GEMINI_API_KEY is not configured in environment or .env/.env.local.");
  process.exit(1);
}

console.log(`Checking ${waterfall.length} Gemini Waterfall models from config/gemini-models.json...\n`);

let workingCount = 0;
let primaryDeprecated = false;

for (let i = 0; i < waterfall.length; i++) {
  const model = waterfall[i];
  const startedAt = Date.now();
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Reply with OK" }] }],
          generationConfig: { maxOutputTokens: 16 },
        }),
        signal: AbortSignal.timeout(15000),
      }
    );
    const latency = Date.now() - startedAt;
    if (res.ok) {
      workingCount++;
      console.log(`  [PASS] #${i + 1} ${model} -> HTTP ${res.status} (${latency}ms)`);
    } else {
      let msg = res.statusText;
      try {
        const err = await res.json();
        msg = err?.error?.status || err?.error?.message || msg;
      } catch {}
      if (i === 0 && res.status === 404) {
        primaryDeprecated = true;
      }
      console.warn(`  [FAIL] #${i + 1} ${model} -> HTTP ${res.status} (${latency}ms): ${String(msg).slice(0, 120)}`);
    }
  } catch (err) {
    const latency = Date.now() - startedAt;
    console.warn(`  [ERR ] #${i + 1} ${model} -> ${err.message} (${latency}ms)`);
  }
}

console.log(`\nSummary: ${workingCount}/${waterfall.length} models operational.`);

if (workingCount === 0) {
  console.error("CRITICAL: No Gemini waterfall models responded successfully.");
  process.exit(1);
}

if (primaryDeprecated) {
  console.error(`WARNING: Primary model (${waterfall[0]}) returned 404 NOT_FOUND (deprecated). Please update config/gemini-models.json.`);
  process.exit(1);
}
