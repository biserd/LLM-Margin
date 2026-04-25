import { Router, type IRouter } from "express";
import { and, desc, eq, isNull, gt, lte, or, isNotNull } from "drizzle-orm";
import { db, usersTable, otpCodesTable } from "@workspace/db";
import {
  generateOtpCode,
  hashOtpCode,
  isValidEmail,
  normalizeEmail,
  otpExpiry,
  timingSafeCompare,
} from "../lib/otp";
import { checkRateLimit } from "../lib/rateLimit";
import { sendOtpEmail } from "../lib/email";
import {
  SESSION_COOKIE_NAME,
  clearSessionCookieOptions,
  createSessionToken,
  sessionCookieOptions,
} from "../lib/session";
import { logger } from "../lib/logger";

const router: IRouter = Router();

async function pruneStaleOtpCodes(email: string, now: Date): Promise<void> {
  try {
    await db
      .delete(otpCodesTable)
      .where(
        and(
          eq(otpCodesTable.email, email),
          or(
            isNotNull(otpCodesTable.consumedAt),
            lte(otpCodesTable.expiresAt, now),
          ),
        ),
      );
  } catch (err) {
    logger.warn({ err, email }, "Failed to prune stale OTP codes (non-fatal)");
  }
}

router.post("/auth/request-otp", async (req, res) => {
  try {
    const rawEmail = String(req.body?.email ?? "");
    const email = normalizeEmail(rawEmail);

    if (!isValidEmail(email)) {
      res.status(400).json({ error: "Invalid email address." });
      return;
    }

    const ip = req.ip ?? "unknown";

    const emailLimit = checkRateLimit(`otp:email:${email}`);
    const ipLimit = checkRateLimit(`otp:ip:${ip}`);
    if (!emailLimit.allowed || !ipLimit.allowed) {
      const retry = Math.max(
        emailLimit.retryAfterSeconds,
        ipLimit.retryAfterSeconds,
      );
      res.set("Retry-After", String(retry));
      res.status(429).json({
        error: "Too many requests. Please try again later.",
        retryAfter: retry,
      });
      return;
    }

    const code = generateOtpCode();
    const codeHash = hashOtpCode(code);
    const expiresAt = otpExpiry();

    await pruneStaleOtpCodes(email, new Date());
    await db.insert(otpCodesTable).values({ email, codeHash, expiresAt });
    await sendOtpEmail(email, code);

    res.status(200).json({ ok: true });
  } catch (err) {
    logger.error({ err }, "request-otp failed");
    res.status(500).json({ error: "Failed to request code." });
  }
});

router.post("/auth/verify-otp", async (req, res) => {
  try {
    const rawEmail = String(req.body?.email ?? "");
    const code = String(req.body?.code ?? "").trim();
    const email = normalizeEmail(rawEmail);

    if (!isValidEmail(email) || !/^\d{6}$/.test(code)) {
      res.status(400).json({ error: "Invalid email or code." });
      return;
    }

    const ip = req.ip ?? "unknown";

    const emailLimit = checkRateLimit(`verify:email:${email}`);
    const ipLimit = checkRateLimit(`verify:ip:${ip}`);
    if (!emailLimit.allowed || !ipLimit.allowed) {
      const retry = Math.max(
        emailLimit.retryAfterSeconds,
        ipLimit.retryAfterSeconds,
      );
      res.set("Retry-After", String(retry));
      res.status(429).json({
        error: "Too many attempts. Please try again later.",
        retryAfter: retry,
      });
      return;
    }

    const now = new Date();
    const candidates = await db
      .select()
      .from(otpCodesTable)
      .where(
        and(
          eq(otpCodesTable.email, email),
          isNull(otpCodesTable.consumedAt),
          gt(otpCodesTable.expiresAt, now),
        ),
      )
      .orderBy(desc(otpCodesTable.createdAt))
      .limit(1);

    const record = candidates[0];
    if (!record) {
      res.status(401).json({ error: "Invalid or expired code." });
      return;
    }

    const providedHash = hashOtpCode(code);
    if (!timingSafeCompare(providedHash, record.codeHash)) {
      res.status(401).json({ error: "Invalid or expired code." });
      return;
    }

    const consumed = await db
      .update(otpCodesTable)
      .set({ consumedAt: now })
      .where(
        and(eq(otpCodesTable.id, record.id), isNull(otpCodesTable.consumedAt)),
      )
      .returning({ id: otpCodesTable.id });

    if (consumed.length === 0) {
      res.status(401).json({ error: "Invalid or expired code." });
      return;
    }

    const inserted = await db
      .insert(usersTable)
      .values({ email, lastLoginAt: now })
      .onConflictDoUpdate({
        target: usersTable.email,
        set: { lastLoginAt: now },
      })
      .returning({ id: usersTable.id, email: usersTable.email });

    const user = inserted[0];
    if (!user) {
      throw new Error("Failed to upsert user");
    }

    const { token, expiresAt } = createSessionToken(user.id);
    res.cookie(SESSION_COOKIE_NAME, token, sessionCookieOptions(expiresAt));

    void pruneStaleOtpCodes(email, now);

    res.status(200).json({ user: { id: user.id, email: user.email } });
  } catch (err) {
    logger.error({ err }, "verify-otp failed");
    res.status(500).json({ error: "Failed to verify code." });
  }
});

router.post("/auth/logout", (_req, res) => {
  res.cookie(SESSION_COOKIE_NAME, "", clearSessionCookieOptions());
  res.status(200).json({ ok: true });
});

router.get("/auth/me", async (req, res) => {
  if (!req.session) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const rows = await db
    .select({ id: usersTable.id, email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId))
    .limit(1);
  const user = rows[0];
  if (!user) {
    res.cookie(SESSION_COOKIE_NAME, "", clearSessionCookieOptions());
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.status(200).json({ user });
});

export default router;
