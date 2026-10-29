import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeUrl,
  generateAdminAuthToken,
  verifyAdminToken,
  sanitizeCommunityCaseSubmission,
} from "../src/utils/security.ts";

describe("NeuroCase API Security & URL Sanitization", () => {
  it("should permit valid https and http URLs", () => {
    assert.equal(sanitizeUrl("https://doi.org/10.1056/NEJMcpc24001"), "https://doi.org/10.1056/NEJMcpc24001");
    assert.equal(sanitizeUrl("http://neurology.org/article/123"), "http://neurology.org/article/123");
    assert.equal(sanitizeUrl("   https://stroke.ahajournals.org/content   "), "https://stroke.ahajournals.org/content");
  });

  it("should strip javascript: and data: URIs to prevent Stored XSS", () => {
    assert.equal(sanitizeUrl("javascript:alert(document.cookie)"), "");
    assert.equal(sanitizeUrl("JAVASCRIPT:alert(1)"), "");
    assert.equal(sanitizeUrl("data:text/html,<script>alert(1)</script>"), "");
    assert.equal(sanitizeUrl("vbscript:msgbox(1)"), "");
    assert.equal(sanitizeUrl("file:///etc/passwd"), "");
  });

  it("should handle undefined and empty input safely", () => {
    assert.equal(sanitizeUrl(undefined), "");
    assert.equal(sanitizeUrl(""), "");
    assert.equal(sanitizeUrl("   "), "");
  });
});

describe("Admin Authorization & Token Verification", () => {
  const mockSecret = "test-secret-key-12345678901234567890";
  const mockPasscode = "SecretAdminPass2026!";

  it("should verify valid admin token successfully", () => {
    const validToken = generateAdminAuthToken(mockSecret, mockPasscode);
    const isValid = verifyAdminToken(validToken, {
      adminAuthSecret: mockSecret,
      adminPasscode: mockPasscode,
      nodeEnv: "development",
    });
    assert.equal(isValid, true);
  });

  it("should reject tampered or invalid token", () => {
    const validToken = generateAdminAuthToken(mockSecret, mockPasscode);
    const tamperedToken = validToken.slice(0, -4) + "ffff";

    const isTamperedValid = verifyAdminToken(tamperedToken, {
      adminAuthSecret: mockSecret,
      adminPasscode: mockPasscode,
      nodeEnv: "development",
    });
    assert.equal(isTamperedValid, false);

    assert.equal(verifyAdminToken("short", { adminAuthSecret: mockSecret, adminPasscode: mockPasscode }), false);
    assert.equal(verifyAdminToken(null, { adminAuthSecret: mockSecret, adminPasscode: mockPasscode }), false);
    assert.equal(verifyAdminToken(undefined, { adminAuthSecret: mockSecret, adminPasscode: mockPasscode }), false);
  });

  it("should verify deterministic admin token with default environment fallback", () => {
    const token = generateAdminAuthToken();
    const result = verifyAdminToken(token);
    assert.equal(result, true, "Must verify admin token using standard fallback when env vars are unset");
  });
});

describe("Community Case Submission Security Lockdown", () => {
  it("should lock status to pending and prevent privilege escalation", () => {
    const maliciousPayload = {
      id: "nc-daily-2026-03-30", // attempting to overwrite daily case
      case_code: "NC-2026-HIJACK",
      status: "approved", // attempting to bypass moderation
      is_daily_challenge: true, // attempting to overwrite active daily challenge
      archive_only: true,
      subspecialty: "Stroke",
      presentation: {
        chief_complaint: "Sudden onset right hemiparesis and global aphasia",
        history: "A 65-year-old patient presented within 90 minutes of onset.",
        imaging: [
          {
            type: "MRI",
            label: "DWI sequence",
            url: "https://example.com/dwi.jpg",
            doi_url: "javascript:evil()", // XSS attack in imaging URL
          },
        ],
      },
      source_journal: {
        title: "NEJM Clinical Problem Solving",
        doi_url: "javascript:evil()", // XSS attack in source journal URL
      },
    };

    const sanitized = sanitizeCommunityCaseSubmission(maliciousPayload);

    // 1. Status must always be strictly 'pending'
    assert.equal(sanitized.status, "pending");

    // 2. is_daily_challenge must always be false
    assert.equal(sanitized.is_daily_challenge, false);

    // 3. ID must be newly generated and not the hijacked ID
    assert.notEqual(sanitized.id, "nc-daily-2026-03-30");
    assert.ok(sanitized.id.startsWith("nc-user-"));

    // 4. Injected javascript: URLs must be stripped
    assert.equal(sanitized.source_journal.doi_url, "");
    assert.equal(sanitized.presentation.imaging[0].doi_url, "");

    // 5. Preserves legitimate clinical fields
    assert.equal(sanitized.subspecialty, "Stroke");
    assert.equal(sanitized.presentation.chief_complaint, "Sudden onset right hemiparesis and global aphasia");
  });
});
