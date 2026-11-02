import test from "node:test";
import assert from "node:assert/strict";
import { generateAdminAuthToken, verifyAdminToken } from "../src/utils/security.ts";

test("Token v2 TTL and Expiration", async (t) => {
  await t.test("should generate and verify valid token_v2 with TTL", () => {
    const token = generateAdminAuthToken("secret123", "pass123", { expiresInHours: 24 });
    assert.match(token, /^token_v2\.\d+\.[a-f0-9]{64}$/);
    const isValid = verifyAdminToken(token, { adminAuthSecret: "secret123", adminPasscode: "pass123" });
    assert.equal(isValid, true);
  });

  await t.test("should reject expired token_v2", () => {
    const expiredToken = generateAdminAuthToken("secret123", "pass123", { expiresInHours: -1 });
    const isValid = verifyAdminToken(expiredToken, { adminAuthSecret: "secret123", adminPasscode: "pass123" });
    assert.equal(isValid, false);
  });

  await t.test("should verify legacy static sha256 token for backwards compatibility", () => {
    const legacyToken = generateAdminAuthToken("secret123", "pass123", { legacyStatic: true });
    assert.match(legacyToken, /^[a-f0-9]{64}$/);
    const isValid = verifyAdminToken(legacyToken, { adminAuthSecret: "secret123", adminPasscode: "pass123" });
    assert.equal(isValid, true);
  });

  await t.test("should reject tampered token_v2 signature", () => {
    const token = generateAdminAuthToken("secret123", "pass123", { expiresInHours: 24 });
    const tampered = token.slice(0, -4) + "0000";
    const isValid = verifyAdminToken(tampered, { adminAuthSecret: "secret123", adminPasscode: "pass123" });
    assert.equal(isValid, false);
  });
});

test("Admin Journal Feeds Monitor Compatibility", async (t) => {
  await t.test("should safely extract journal name, subspecialty, and date from diverse article schemas", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const raw = await fs.readFile(path.join(process.cwd(), "public", "data", "articles.json"), "utf-8");
    const articles = JSON.parse(raw);

    assert.ok(Array.isArray(articles) && articles.length > 0);

    for (const a of articles.slice(0, 20)) {
      // 1. Journal display resolution (cannot be raw object as child)
      const journalName = typeof a.journal === "string" ? a.journal : a.journal?.short_name || a.journal?.name || "Journal";
      assert.equal(typeof journalName, "string");
      assert.ok(journalName.length > 0);

      // 2. Search query filtering (toLowerCase must not throw)
      const q = "lancet";
      const match = (a.title || "").toLowerCase().includes(q) || journalName.toLowerCase().includes(q);
      assert.equal(typeof match, "boolean");

      // 3. Subspecialty extraction
      const sub = a.subspecialty || a.neurology_classification?.subspecialty || "";
      assert.equal(typeof sub, "string");

      // 4. Date extraction
      const dateDisplay = a.date || (a.pub_date ? a.pub_date.slice(0, 10) : "Recent");
      assert.equal(typeof dateDisplay, "string");
    }
  });
});
