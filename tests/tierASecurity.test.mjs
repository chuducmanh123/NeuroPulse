import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import zlib from "node:zlib";
import {
  resolveSafeChildPath,
  isValidUploadId,
  parseSafeYear,
  isPrivateOrReservedIp,
  validateSafeExternalUrl,
} from "../src/lib/neuroguide/safePath.ts";
import { extractTextFromPdfNative } from "../src/lib/neuroguide/documentParser.ts";
import {
  verifyAdminPasscode,
  isAdminAuthConfigured,
  generateAdminAuthToken,
  verifyAdminToken,
} from "../src/utils/security.ts";

describe("Tier A Safe Path & SSRF Validation", () => {
  it("resolveSafeChildPath confines filenames inside baseDir", () => {
    const base = path.resolve("data/guidelines_store");
    assert.equal(resolveSafeChildPath(base, "aha-2026_latest.json"), path.join(base, "aha-2026_latest.json"));
    assert.throws(() => resolveSafeChildPath(base, "../secret.json"));
    assert.throws(() => resolveSafeChildPath(base, "sub/file.json"));
    assert.throws(() => resolveSafeChildPath(base, "sub\\file.json"));
    assert.throws(() => resolveSafeChildPath(base, ".."));
    assert.throws(() => resolveSafeChildPath(base, ""));
  });

  it("isValidUploadId rejects traversal and accepts safe upload IDs", () => {
    assert.equal(isValidUploadId("upload_1732412345_abc123"), true);
    assert.equal(isValidUploadId("../etc/passwd"), false);
    assert.equal(isValidUploadId("a/b"), false);
    assert.equal(isValidUploadId(""), false);
  });

  it("parseSafeYear validates 4-digit years in [1900, 2100]", () => {
    assert.equal(parseSafeYear(2026), 2026);
    assert.equal(parseSafeYear("2025"), 2025);
    assert.equal(parseSafeYear("../../public/data/x"), undefined);
    assert.equal(parseSafeYear("1800"), undefined);
    assert.equal(parseSafeYear(NaN), undefined);
  });

  it("isPrivateOrReservedIp and validateSafeExternalUrl block internal targets", () => {
    assert.equal(isPrivateOrReservedIp("127.0.0.1"), true);
    assert.equal(isPrivateOrReservedIp("169.254.169.254"), true);
    assert.equal(isPrivateOrReservedIp("10.0.0.5"), true);
    assert.equal(isPrivateOrReservedIp("192.168.1.1"), true);
    assert.equal(isPrivateOrReservedIp("::1"), true);
    assert.equal(isPrivateOrReservedIp("8.8.8.8"), false);

    assert.throws(() => validateSafeExternalUrl("http://127.0.0.1:3000/api/neurocase"));
    assert.throws(() => validateSafeExternalUrl("http://169.254.169.254/latest/meta-data/"));
    assert.throws(() => validateSafeExternalUrl("https://localhost/admin"));
    assert.throws(() => validateSafeExternalUrl("file:///etc/passwd"));
    assert.throws(() =>
      validateSafeExternalUrl("https://evil.example.com/a.pdf", {
        httpsOnly: true,
        allowedHosts: ["*.public.blob.vercel-storage.com"],
      })
    );

    const allowed = validateSafeExternalUrl("https://abc123.public.blob.vercel-storage.com/guideline.pdf", {
      httpsOnly: true,
      allowedHosts: ["*.public.blob.vercel-storage.com"],
    });
    assert.equal(allowed.hostname, "abc123.public.blob.vercel-storage.com");
  });
});

describe("Tier A Admin Auth Hardening", () => {
  it("enforces exact case-sensitive passcode comparison and production fail-closed", () => {
    assert.equal(verifyAdminPasscode("@Neuro2026", { adminPasscode: "@Neuro2026", adminAuthSecret: "sec" }), true);
    assert.equal(verifyAdminPasscode("neuro2026", { adminPasscode: "@Neuro2026", adminAuthSecret: "sec" }), false);
    assert.equal(verifyAdminPasscode("@neuro2026", { adminPasscode: "@Neuro2026", adminAuthSecret: "sec" }), false);

    const origPass = process.env.ADMIN_PASSCODE;
    const origSecret = process.env.ADMIN_AUTH_SECRET;
    delete process.env.ADMIN_PASSCODE;
    delete process.env.ADMIN_AUTH_SECRET;
    try {
      assert.equal(isAdminAuthConfigured({ nodeEnv: "production" }), false);
      assert.throws(() => generateAdminAuthToken(undefined, undefined, { nodeEnv: "production" }), /ADMIN_AUTH_NOT_CONFIGURED/);
      assert.equal(verifyAdminToken("token_v2.9999999999999.00", { nodeEnv: "production" }), false);
    } finally {
      if (origPass !== undefined) process.env.ADMIN_PASSCODE = origPass;
      if (origSecret !== undefined) process.env.ADMIN_AUTH_SECRET = origSecret;
    }
  });
});

describe("Tier A Decompression Bomb Bound", () => {
  it("extractTextFromPdfNative safely bounds oversized FlateDecode streams", () => {
    const bigZeros = Buffer.alloc(32 * 1024 * 1024, 0x20); // 32 MB > 25 MB per-stream cap
    const deflated = zlib.deflateSync(bigZeros);
    const pdfPayload = Buffer.concat([
      Buffer.from("%PDF-1.4\n1 0 obj\n<< /Filter /FlateDecode >>\nstream\n"),
      deflated,
      Buffer.from("\nendstream\nendobj\n%%EOF"),
    ]);
    const text = extractTextFromPdfNative(pdfPayload);
    assert.equal(text, "");
  });
});
