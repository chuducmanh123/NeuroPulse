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
