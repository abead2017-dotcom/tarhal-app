import { and, desc, eq, isNull, inArray } from "drizzle-orm";
import type { Express, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { emailAuthLimits, emailCredentials, emailOtpChallenges, emailSessions, rideLocations, rides, users } from "../drizzle/schema";
import { getDb } from "./db";
import { sdk } from "./_core/sdk";
import { currentEmailSessionCookie, getEmailSessionCookieName, getSessionCookieName, getSessionCookieOptions } from "./_core/cookies";
import { assertAuthSecretConfigured, createOtp, createSessionToken, EMAIL_SESSION_TTL_MS, hashPassword, hmacValue, normalizeEmail, safeEqualHex, verifyPassword, validPassword } from "./email-auth-crypto";
import { sendEmailOtp } from "./email-smtp";
import { readSmtpConfig } from "./email-smtp";

const GENERIC_MESSAGE = "إذا كان بالإمكان إتمام الطلب فستصلك رسالة إلى البريد المدخل.";
const SESSION_COOKIE_MAX_AGE = EMAIL_SESSION_TTL_MS;
class HttpError extends Error { constructor(public status: number, public message: string) { super(message); } }
function sendError(res: Response, error: unknown) {
  if (error instanceof HttpError) return res.status(error.status).json({ error: error.message });
  return res.status(500).json({ error: "تعذر إتمام الطلب حاليًا." });
}
function string(value: unknown): value is string { return typeof value === "string"; }
function inputEmail(body: any): string {
  if (!string(body?.email) || body.email.length > 320) throw new HttpError(400, "بيانات الطلب غير صالحة.");
  const email = normalizeEmail(body.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "بيانات الطلب غير صالحة.");
  return email;
}
function inputCode(body: any): string {
  if (!string(body?.code) || !/^\d{8}$/.test(body.code)) throw new HttpError(400, "الرمز غير صالح أو منتهي.");
  return body.code;
}
async function database() {
  try { assertAuthSecretConfigured(); }
  catch { throw new HttpError(503, "خدمة المصادقة غير مهيأة حاليًا."); }
  const db = await getDb();
  if (!db) throw new HttpError(503, "الخدمة غير متاحة حاليًا.");
  return db;
}

async function enforceRate(tx: any, email: string, action: "send" | "login", now = new Date()) {
  const [limit] = await tx.select().from(emailAuthLimits).where(and(eq(emailAuthLimits.emailNormalized, email), eq(emailAuthLimits.action, action))).limit(1).for("update");
  if (action === "send") {
    if (limit?.lastSentAt && now.getTime() - limit.lastSentAt.getTime() < 60_000) throw new HttpError(429, "يرجى الانتظار قبل إعادة المحاولة.");
    if (limit && now.getTime() - limit.windowStartedAt.getTime() < 3_600_000 && limit.count >= 5) throw new HttpError(429, "تم بلوغ حد الرسائل المؤقت.");
    if (!limit) await tx.insert(emailAuthLimits).values({ emailNormalized: email, action, count: 1, windowStartedAt: now, lastSentAt: now });
    else if (now.getTime() - limit.windowStartedAt.getTime() >= 3_600_000) await tx.update(emailAuthLimits).set({ count: 1, windowStartedAt: now, lastSentAt: now }).where(and(eq(emailAuthLimits.emailNormalized, email), eq(emailAuthLimits.action, action)));
    else await tx.update(emailAuthLimits).set({ count: limit.count + 1, lastSentAt: now }).where(and(eq(emailAuthLimits.emailNormalized, email), eq(emailAuthLimits.action, action)));
    return;
  }
  if (limit && now.getTime() - limit.windowStartedAt.getTime() < 15 * 60_000 && limit.count >= 10) throw new HttpError(429, "تعذر تسجيل الدخول مؤقتًا.");
  if (!limit) await tx.insert(emailAuthLimits).values({ emailNormalized: email, action, count: 1, windowStartedAt: now });
  else if (now.getTime() - limit.windowStartedAt.getTime() >= 15 * 60_000) await tx.update(emailAuthLimits).set({ count: 1, windowStartedAt: now }).where(and(eq(emailAuthLimits.emailNormalized, email), eq(emailAuthLimits.action, action)));
  else await tx.update(emailAuthLimits).set({ count: limit.count + 1 }).where(and(eq(emailAuthLimits.emailNormalized, email), eq(emailAuthLimits.action, action)));
}

async function issueOtp(db: any, email: string, userId: number | null, purpose: "verify" | "reset" | "delete") {
  try { readSmtpConfig(); }
  catch { throw new HttpError(503, "خدمة البريد غير مهيأة حاليًا."); }
  const generated = createOtp();
  const now = new Date();
  await db.transaction(async (tx: any) => {
    await enforceRate(tx, email, "send", now);
    await tx.update(emailOtpChallenges).set({ consumedAt: now }).where(and(eq(emailOtpChallenges.emailNormalized, email), eq(emailOtpChallenges.purpose, purpose), isNull(emailOtpChallenges.consumedAt)));
    await tx.insert(emailOtpChallenges).values({ userId, emailNormalized: email, purpose, otpHmac: hmacValue(`otp:${purpose}:${email}`, generated.code), expiresAt: generated.expiresAt, attempts: 0 });
  });
  await sendEmailOtp(email, generated.code, purpose);
}

async function newestChallenge(db: any, email: string, purpose: "verify" | "reset" | "delete", userId?: number) {
  const conditions = [eq(emailOtpChallenges.emailNormalized, email), eq(emailOtpChallenges.purpose, purpose), isNull(emailOtpChallenges.consumedAt)];
  if (userId !== undefined) conditions.push(eq(emailOtpChallenges.userId, userId));
  const [challenge] = await db.select().from(emailOtpChallenges).where(and(...conditions)).orderBy(desc(emailOtpChallenges.createdAt)).limit(1);
  return challenge;
}
async function verifyChallenge(db: any, challenge: any, email: string, purpose: "verify" | "reset" | "delete", code: string) {
  const now = new Date();
  if (!challenge) throw new HttpError(400, "الرمز غير صالح أو منتهي.");
  const expected = hmacValue(`otp:${purpose}:${email}`, code);
  const valid = await db.transaction(async (tx: any) => {
    const [current] = await tx.select().from(emailOtpChallenges).where(eq(emailOtpChallenges.id, challenge.id)).limit(1).for("update");
    if (!current || current.consumedAt || current.expiresAt <= now || current.attempts >= 5) return false;
    if (!safeEqualHex(current.otpHmac, expected)) {
      const attempts = current.attempts + 1;
      await tx.update(emailOtpChallenges).set({ attempts, consumedAt: attempts >= 5 ? now : null }).where(eq(emailOtpChallenges.id, current.id));
      return false;
    }
    await tx.update(emailOtpChallenges).set({ consumedAt: now }).where(eq(emailOtpChallenges.id, current.id));
    return true;
  });
  if (!valid) throw new HttpError(400, "الرمز غير صالح أو منتهي.");
  return now;
}
async function createEmailSession(db: any, userId: number) {
  const rawToken = createSessionToken();
  await db.insert(emailSessions).values({ userId, tokenHmac: hmacValue("session", rawToken), expiresAt: new Date(Date.now() + EMAIL_SESSION_TTL_MS) });
  return rawToken;
}
function setAuthSession(req: Request, res: Response, token: string) {
  if (req.get("X-Tarhal-Client") === "mobile") return res.json({ app_session_id: token });
  res.cookie(getEmailSessionCookieName(req), token, { ...getSessionCookieOptions(req), maxAge: SESSION_COOKIE_MAX_AGE });
  return res.json({ success: true });
}
async function authenticatedUser(req: Request) {
  try { return await sdk.authenticateRequest(req); }
  catch { throw new HttpError(401, "يلزم تسجيل الدخول."); }
}
async function revokeRequestSession(req: Request) {
  const header = req.headers.authorization;
  const bearer = typeof header === "string" && header.startsWith("Bearer ") ? header.slice(7).trim() : undefined;
  const token = bearer || currentEmailSessionCookie(req);
  if (!token) return;
  const db = await getDb();
  if (!db) return;
  try {
    await db.update(emailSessions).set({ revokedAt: new Date() }).where(and(eq(emailSessions.tokenHmac, hmacValue("session", token)), isNull(emailSessions.revokedAt)));
  } catch { /* Manus JWTs do not correspond to email-session hashes. */ }
}

export function registerEmailAuthRoutes(app: Express) {
  app.post("/api/auth/email/register", async (req, res) => {
    try {
      const email = inputEmail(req.body);
      const password = req.body?.password;
      if (!validPassword(password) || (req.body?.name != null && (!string(req.body.name) || req.body.name.trim().length > 120))) throw new HttpError(400, "بيانات التسجيل غير صالحة.");
      try { readSmtpConfig(); }
      catch { throw new HttpError(503, "خدمة البريد غير مهيأة حاليًا."); }
      const db = await database();
      const [existing] = await db.select({ userId: emailCredentials.userId }).from(emailCredentials).where(eq(emailCredentials.emailNormalized, email)).limit(1);
      if (existing) return res.json({ message: GENERIC_MESSAGE });
      const secret = await hashPassword(password);
      const userId = await db.transaction(async (tx: any) => {
        const displayName = string(req.body?.name) && req.body.name.trim() ? req.body.name.trim() : null;
        const [created] = await tx.insert(users).values({ openId: `email_${randomUUID()}`, name: displayName, email, loginMethod: "email", role: "user" }).$returningId();
        await tx.insert(emailCredentials).values({ userId: created.id, emailNormalized: email, passwordHash: secret.hash, passwordSalt: secret.salt });
        return created.id as number;
      });
      await issueOtp(db, email, userId, "verify");
      return res.status(202).json({ message: GENERIC_MESSAGE });
    } catch (error) { return sendError(res, error); }
  });

  app.post("/api/auth/email/verify", async (req, res) => {
    try {
      const email = inputEmail(req.body), code = inputCode(req.body), db = await database();
      const [credential] = await db.select().from(emailCredentials).where(eq(emailCredentials.emailNormalized, email)).limit(1);
      if (!credential) throw new HttpError(400, "الرمز غير صالح أو منتهي.");
      const challenge = await newestChallenge(db, email, "verify", credential.userId);
      const now = await verifyChallenge(db, challenge, email, "verify", code);
      await db.transaction(async (tx: any) => {
        await tx.update(emailOtpChallenges).set({ consumedAt: now }).where(eq(emailOtpChallenges.id, challenge.id));
        await tx.update(emailCredentials).set({ verifiedAt: now }).where(eq(emailCredentials.userId, credential.userId));
      });
      const token = await createEmailSession(db, credential.userId);
      return setAuthSession(req, res, token);
    } catch (error) { return sendError(res, error); }
  });

  app.post("/api/auth/email/login", async (req, res) => {
    try {
      const email = inputEmail(req.body);
      if (!string(req.body?.password)) throw new HttpError(400, "البريد أو كلمة المرور غير صحيحة.");
      const db = await database();
      await db.transaction(async (tx: any) => enforceRate(tx, email, "login"));
      const [credential] = await db.select().from(emailCredentials).where(eq(emailCredentials.emailNormalized, email)).limit(1);
      const valid = credential ? await verifyPassword(req.body.password, credential.passwordSalt, credential.passwordHash) : false;
      if (!valid || !credential?.verifiedAt) throw new HttpError(401, "البريد أو كلمة المرور غير صحيحة.");
      await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, credential.userId));
      const token = await createEmailSession(db, credential.userId);
      return setAuthSession(req, res, token);
    } catch (error) { return sendError(res, error); }
  });

  app.post("/api/auth/email/resend", async (req, res) => {
    try {
      const email = inputEmail(req.body), db = await database();
      try { readSmtpConfig(); }
      catch { throw new HttpError(503, "خدمة البريد غير مهيأة حاليًا."); }
      const [credential] = await db.select().from(emailCredentials).where(eq(emailCredentials.emailNormalized, email)).limit(1);
      if (credential && !credential.verifiedAt) {
        try { await issueOtp(db, email, credential.userId, "verify"); } catch { /* Same response whether the address exists or not. */ }
      }
      return res.json({ message: GENERIC_MESSAGE });
    } catch (error) { return sendError(res, error); }
  });

  app.post("/api/auth/email/request-password-reset", async (req, res) => {
    try {
      const email = inputEmail(req.body), db = await database();
      try { readSmtpConfig(); }
      catch { throw new HttpError(503, "خدمة البريد غير مهيأة حاليًا."); }
      const [credential] = await db.select().from(emailCredentials).where(eq(emailCredentials.emailNormalized, email)).limit(1);
      if (credential?.verifiedAt) {
        try { await issueOtp(db, email, credential.userId, "reset"); } catch { /* Same response whether the address exists or not. */ }
      }
      return res.json({ message: GENERIC_MESSAGE });
    } catch (error) { return sendError(res, error); }
  });

  app.post("/api/auth/email/reset-password", async (req, res) => {
    try {
      const email = inputEmail(req.body), code = inputCode(req.body), password = req.body?.password;
      if (!validPassword(password)) throw new HttpError(400, "كلمة المرور يجب أن تكون بين 10 و128 حرفًا.");
      const db = await database(), [credential] = await db.select().from(emailCredentials).where(eq(emailCredentials.emailNormalized, email)).limit(1);
      if (!credential?.verifiedAt) throw new HttpError(400, "الرمز غير صالح أو منتهي.");
      const challenge = await newestChallenge(db, email, "reset", credential.userId), now = await verifyChallenge(db, challenge, email, "reset", code), secret = await hashPassword(password);
      await db.transaction(async (tx: any) => {
        await tx.update(emailOtpChallenges).set({ consumedAt: now }).where(eq(emailOtpChallenges.id, challenge.id));
        await tx.update(emailCredentials).set({ passwordHash: secret.hash, passwordSalt: secret.salt }).where(eq(emailCredentials.userId, credential.userId));
        await tx.update(emailSessions).set({ revokedAt: now }).where(and(eq(emailSessions.userId, credential.userId), isNull(emailSessions.revokedAt)));
      });
      return res.json({ success: true });
    } catch (error) { return sendError(res, error); }
  });

  app.post("/api/auth/email/request-delete", async (req, res) => {
    try {
      const user = await authenticatedUser(req), db = await database();
      const [credential] = await db.select().from(emailCredentials).where(eq(emailCredentials.userId, user.id)).limit(1);
      if (!credential?.verifiedAt || !string(req.body?.password) || !(await verifyPassword(req.body.password, credential.passwordSalt, credential.passwordHash))) throw new HttpError(401, "تعذر التحقق من كلمة المرور.");
      if (user.role === "admin") throw new HttpError(403, "لا يمكن حذف حساب المشرف.");
      try { await issueOtp(db, credential.emailNormalized, user.id, "delete"); }
      catch (error) { if (error instanceof HttpError) throw error; throw new HttpError(503, "تعذر إرسال الرسالة حاليًا."); }
      return res.status(202).json({ message: GENERIC_MESSAGE });
    } catch (error) { return sendError(res, error); }
  });

  app.post("/api/auth/email/delete", async (req, res) => {
    try {
      const user = await authenticatedUser(req), db = await database();
      if (user.role === "admin") throw new HttpError(403, "لا يمكن حذف حساب المشرف.");
      if (req.body?.confirm !== true) throw new HttpError(400, "يلزم تأكيد حذف الحساب صراحةً.");
      const [credential] = await db.select().from(emailCredentials).where(eq(emailCredentials.userId, user.id)).limit(1);
      if (!credential?.verifiedAt || !string(req.body?.password) || !(await verifyPassword(req.body.password, credential.passwordSalt, credential.passwordHash))) throw new HttpError(401, "تعذر التحقق من كلمة المرور.");
      const challenge = await newestChallenge(db, credential.emailNormalized, "delete", user.id), code = inputCode(req.body), now = await verifyChallenge(db, challenge, credential.emailNormalized, "delete", code);
      await db.transaction(async (tx: any) => {
        const [active] = await tx.select({ id: rides.id }).from(rides).where(and(inArray(rides.status, ["accepted", "in_progress"]), inArray(rides.passengerId, [user.id]))).limit(1).for("update");
        const [driving] = await tx.select({ id: rides.id }).from(rides).where(and(inArray(rides.status, ["accepted", "in_progress"]), eq(rides.driverId, user.id))).limit(1).for("update");
        if (active || driving) throw new HttpError(409, "لا يمكن حذف الحساب أثناء رحلة نشطة.");
        await tx.delete(rideLocations).where(eq(rideLocations.driverId, user.id));
        await tx.delete(rides).where(eq(rides.passengerId, user.id));
        await tx.delete(emailOtpChallenges).where(eq(emailOtpChallenges.emailNormalized, credential.emailNormalized));
        await tx.delete(emailAuthLimits).where(eq(emailAuthLimits.emailNormalized, credential.emailNormalized));
        await tx.delete(emailSessions).where(eq(emailSessions.userId, user.id));
        await tx.delete(emailCredentials).where(eq(emailCredentials.userId, user.id));
        await tx.delete(users).where(eq(users.id, user.id));
      });
      res.clearCookie(getEmailSessionCookieName(req), { ...getSessionCookieOptions(req), maxAge: -1 });
      return res.json({ success: true });
    } catch (error) { return sendError(res, error); }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      const options = getSessionCookieOptions(req);
      const authorization = req.headers.authorization;
      const bearer = typeof authorization === "string" && authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : undefined;
      const token = bearer || currentEmailSessionCookie(req);
      if (token) await revokeRequestSession(req);
      res.clearCookie(getEmailSessionCookieName(req), { ...options, maxAge: -1 });
      res.clearCookie(getSessionCookieName(req), { ...options, maxAge: -1 });
      return res.json({ success: true });
    } catch { return res.status(500).json({ error: "تعذر تسجيل الخروج حاليًا." }); }
  });
}
