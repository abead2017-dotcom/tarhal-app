import { afterEach, describe, expect, it, vi } from "vitest";
import { assertAuthSecretConfigured, createOtp, createSessionToken, hashPassword, hmacValue, normalizeEmail, safeEqualHex, verifyPassword } from "../server/email-auth-crypto";
import { readSmtpConfig } from "../server/email-smtp";

afterEach(() => vi.unstubAllEnvs());

describe("email authentication cryptography", () => {
  it("normalizes address whitespace, compatibility form, and case", () => {
    expect(normalizeEmail("  TEST@ＥＸＡＭＰＬＥ.com ")).toBe("test@example.com");
  });

  it("uses a unique salt and verifies a scrypt password hash", async () => {
    const first = await hashPassword("correct horse battery staple");
    const second = await hashPassword("correct horse battery staple");
    expect(first.salt).not.toBe(second.salt);
    expect(first.hash).not.toBe(second.hash);
    expect(await verifyPassword("correct horse battery staple", first.salt, first.hash)).toBe(true);
    expect(await verifyPassword("incorrect password", first.salt, first.hash)).toBe(false);
  });

  it("generates an eight-digit OTP with a ten-minute expiry", () => {
    const before = Date.now();
    const otp = createOtp();
    expect(otp.code).toMatch(/^\d{8}$/);
    expect(otp.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 10 * 60_000);
    expect(otp.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 10 * 60_000);
  });

  it("HMACs OTPs and session tokens with purpose separation", () => {
    vi.stubEnv("AUTH_SECRET", "unit-test-auth-secret-that-is-long-enough-123456");
    const otpHash = hmacValue("otp:verify:test@example.com", "12345678");
    const sessionHash = hmacValue("session", "12345678");
    expect(otpHash).not.toBe("12345678");
    expect(otpHash).not.toBe(sessionHash);
    expect(safeEqualHex(otpHash, otpHash)).toBe(true);
    expect(safeEqualHex(otpHash, sessionHash)).toBe(false);
    expect(createSessionToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("fails closed when AUTH_SECRET is absent or too short", () => {
    vi.stubEnv("AUTH_SECRET", "short");
    expect(() => assertAuthSecretConfigured()).toThrow();
    expect(() => hmacValue("session", "token")).toThrow();
    vi.stubEnv("AUTH_SECRET", "unit-test-auth-secret-that-is-long-enough-123456");
    expect(() => assertAuthSecretConfigured()).not.toThrow();
  });
});

describe("Gmail SMTP configuration", () => {
  it("requires SMTP_USER, SMTP_PASSWORD, and SMTP_FROM without inventing a sender", () => {
    expect(() => readSmtpConfig({ SMTP_USER: "sender@gmail.com", SMTP_PASSWORD: "app-password" })).toThrow();
    expect(readSmtpConfig({ SMTP_USER: " sender@gmail.com ", SMTP_PASSWORD: "application-password", SMTP_FROM: "sender@gmail.com" })).toEqual({
      user: "sender@gmail.com",
      password: "application-password",
      from: "sender@gmail.com",
    });
  });
});
