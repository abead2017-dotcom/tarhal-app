import { createHmac, randomBytes, randomInt, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(nodeScrypt);
const OTP_TTL_MS = 10 * 60 * 1000;

export function normalizeEmail(email: string): string {
  return email.trim().normalize("NFKC").toLowerCase();
}

export function validPassword(password: unknown): password is string {
  return typeof password === "string" && password.length >= 10 && password.length <= 128;
}

export async function hashPassword(password: string, salt = randomBytes(32).toString("hex")) {
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return { salt, hash: derived.toString("hex") };
}

export async function verifyPassword(password: string, salt: string, expectedHash: string) {
  try {
    const actual = (await scrypt(password, salt, 64)) as Buffer;
    const expected = Buffer.from(expectedHash, "hex");
    return expected.length === actual.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function authSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("Authentication secret is not configured");
  return secret;
}

export function assertAuthSecretConfigured(): void {
  authSecret();
}

export function hmacValue(purpose: string, value: string): string {
  return createHmac("sha256", authSecret()).update(`${purpose}\0${value}`).digest("hex");
}

export function createOtp(): { code: string; expiresAt: Date } {
  return {
    code: randomInt(0, 100_000_000).toString().padStart(8, "0"),
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  };
}

export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function safeEqualHex(left: string, right: string): boolean {
  try {
    const a = Buffer.from(left, "hex");
    const b = Buffer.from(right, "hex");
    return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export const EMAIL_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const OTP_TTL_MILLISECONDS = OTP_TTL_MS;
