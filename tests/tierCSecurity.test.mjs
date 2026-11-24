import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { sanitizeUrl } from "../src/utils/safeUrl.ts";
import {
  storeAdminToken,
  clearStoredAdminToken,
  getStoredAdminToken,
} from "../src/utils/clientAuth.ts";
import {
  convertGuidelineRecordToDoc,
  buildGuidelineRecordFromDoc,
} from "../src/lib/neuroguide/storeAdapter.ts";
import { validateLocalDrugForPush } from "../scripts/neurorx/push_local_to_v2.ts";

const ROOT = process.cwd();

test("sanitizeUrl allows http/https and rejects javascript/data/file/upload/control chars", () => {
  assert.equal(sanitizeUrl("https://doi.org/10.1161/STR.0000000000000513"), "https://doi.org/10.1161/STR.0000000000000513");
  assert.equal(sanitizeUrl("http://example.org/guideline"), "http://example.org/guideline");
  assert.equal(sanitizeUrl("javascript:alert(1)"), "");
  assert.equal(sanitizeUrl("data:text/html,<script>alert(1)</script>"), "");
  assert.equal(sanitizeUrl("file:///etc/passwd"), "");
  assert.equal(sanitizeUrl("upload://sample.pdf"), "");
  assert.equal(sanitizeUrl("smb://evil.local/share"), "");
  assert.equal(sanitizeUrl("https://evil.com/\nInjected"), "");
  assert.equal(sanitizeUrl(""), "");
  assert.equal(sanitizeUrl(undefined), "");
});

test("next.config.mjs configures CSP and core security headers", async () => {
  const { default: nextConfig } = await import("../next.config.mjs");
  assert.equal(typeof nextConfig.headers, "function");
  const rules = await nextConfig.headers();
  assert.ok(Array.isArray(rules) && rules.length > 0);
  const rootRule = rules.find((r) => r.source === "/:path*");
  assert.ok(rootRule);
  const headerMap = Object.fromEntries(rootRule.headers.map((h) => [h.key, h.value]));
  assert.equal(headerMap["X-Content-Type-Options"], "nosniff");
  assert.equal(headerMap["X-Frame-Options"], "SAMEORIGIN");
  assert.ok(headerMap["Referrer-Policy"]);
  assert.ok(headerMap["Permissions-Policy"]);
  assert.ok(headerMap["Content-Security-Policy"].includes("default-src 'self'"));
  assert.ok(headerMap["Content-Security-Policy"].includes("object-src 'none'"));
});

test("clientAuth storeAdminToken uses sessionStorage only and clearStoredAdminToken clears legacy keys", () => {
  const makeStorage = () => {
    const store = new Map();
    return {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    };
  };

  const prevWindow = globalThis.window;
  const prevSession = globalThis.sessionStorage;
  const prevLocal = globalThis.localStorage;

  try {
    globalThis.window = {};
    globalThis.sessionStorage = makeStorage();
    globalThis.localStorage = makeStorage();

    globalThis.localStorage.setItem("adminToken", "legacy-local");
    globalThis.localStorage.setItem("neurocase_admin_token", "old-local");
    globalThis.sessionStorage.setItem("adminToken", "legacy-session");

    storeAdminToken("fresh-token-v2");
    assert.equal(globalThis.sessionStorage.getItem("neurocase_admin_token"), "fresh-token-v2");
    assert.equal(globalThis.localStorage.getItem("neurocase_admin_token"), null);
    assert.equal(globalThis.localStorage.getItem("adminToken"), null);
    assert.equal(globalThis.sessionStorage.getItem("adminToken"), null);
    assert.equal(getStoredAdminToken(), "fresh-token-v2");

    globalThis.localStorage.setItem("adminToken", "stale-legacy");
    clearStoredAdminToken();
    assert.equal(globalThis.sessionStorage.getItem("neurocase_admin_token"), null);
    assert.equal(globalThis.localStorage.getItem("adminToken"), null);
    assert.equal(getStoredAdminToken(), "");
  } finally {
    globalThis.window = prevWindow;
    globalThis.sessionStorage = prevSession;
    globalThis.localStorage = prevLocal;
  }
});

test("outbound fetchers and offline scripts do not disable TLS verification", () => {
  const filesToCheck = [
    "core/analyze/gemini_client.py",
    "core/discovery/adapters.py",
    "src/lib/neuroguide/fullTextFetcher.ts",
    "src/lib/neuroguide/pubmedDiscovery.ts",
    "scripts/download_official_atlases.py",
    "scripts/probe_guideline_sources.py",
    "scripts/download_eso_html.js",
    "scripts/test_download_eso_pdf.js",
    "scripts/test_eso_article.js",
  ];

  for (const relPath of filesToCheck) {
    const content = fs.readFileSync(path.join(ROOT, relPath), "utf-8");
    assert.equal(/verify\s*=\s*False/.test(content), false, `${relPath} must not set verify=False`);
    assert.equal(
      /rejectUnauthorized\s*:\s*false/.test(content),
      false,
      `${relPath} must not set rejectUnauthorized: false`
    );
    assert.equal(/CERT_NONE/.test(content), false, `${relPath} must not use ssl.CERT_NONE`);
    assert.equal(
      /NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]0['"]/.test(content),
      false,
      `${relPath} must not set NODE_TLS_REJECT_UNAUTHORIZED=0`
    );
  }
});

test("storeAdapter strips unsafe non-http(s) officialUrl and source_url schemes", () => {
  const record = {
    guideline_id: "test-guide-1",
    version: 1,
    metadata: {
      title: "Test Guideline",
      society: "ESO",
      year: 2026,
      source_url: "file:///C:/secret.pdf",
    },
    recommendations: [
      {
        rec_id: "rec-1",
        statement: "Administer treatment.",
        approval_status: "APPROVED",
        cor: "1",
        loe: "A",
      },
    ],
    approved_count: 1,
  };

  const doc = convertGuidelineRecordToDoc(record, false);
  assert.ok(doc);
  assert.equal(doc.officialUrl, "https://pubmed.ncbi.nlm.nih.gov/");

  const rebuilt = buildGuidelineRecordFromDoc({
    ...doc,
    officialUrl: "javascript:alert(1)",
  });
  assert.equal(rebuilt.metadata.source_url, "");
});

test("push_local_to_v2 validateLocalDrugForPush rejects unsealed or tampered verified records", () => {
  const sources = JSON.parse(
    fs.readFileSync(path.join(ROOT, "data/neurorx/sources.json"), "utf-8")
  );
  const knownSourceIds = new Set(sources.map((s) => s.id));
  const sampleDrugPath = path
    .join(ROOT, "data/neurorx/drugs")
    .replace(/\\/g, "/");
  const firstFile = fs.readdirSync(sampleDrugPath).find((f) => f.endsWith(".json"));
  assert.ok(firstFile);
  const validDrug = JSON.parse(fs.readFileSync(path.join(sampleDrugPath, firstFile), "utf-8"));
  const slug = firstFile.replace(/\.json$/, "");

  const okErrors = validateLocalDrugForPush(validDrug, slug, knownSourceIds);
  assert.deepEqual(okErrors, []);

  const tampered = structuredClone(validDrug);
  tampered.status = "verified";
  tampered.verification = {
    verified_by: "tester",
    verified_at: "2026-11-24",
    content_hash: "0000deadbeef",
  };
  const hashErrors = validateLocalDrugForPush(tampered, slug, knownSourceIds);
  assert.ok(hashErrors.some((e) => e.includes("content_hash mismatch")));

  const withEnvelope = structuredClone(validDrug);
  withEnvelope.uid = "hijack";
  const envErrors = validateLocalDrugForPush(withEnvelope, slug, knownSourceIds);
  assert.ok(envErrors.some((e) => e.includes("forbidden sync envelope key")));
});

test("05_benchmark_fps.py binds to 127.0.0.1 and blocks dotfiles", () => {
  const content = fs.readFileSync(path.join(ROOT, "scripts/05_benchmark_fps.py"), "utf-8");
  assert.ok(content.includes('("127.0.0.1", PORT)'));
  assert.equal(content.includes('("", PORT)'), false);
  assert.ok(content.includes("_is_allowed_benchmark_path"));
});
