import crypto from "node:crypto";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const SESSION_COOKIE_NAME = "lm_session";

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET environment variable is required.");
  }
  return secret;
}

function sign(payload: string): string {
  return crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("base64url");
}

function timingSafeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export interface SessionPayload {
  userId: string;
  expiresAt: number;
}

export function createSessionToken(userId: string): {
  token: string;
  expiresAt: Date;
} {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = `${userId}.${expiresAt}`;
  const sig = sign(payload);
  return { token: `${payload}.${sig}`, expiresAt: new Date(expiresAt) };
}

export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expiresStr, providedSig] = parts;
  const payload = `${userId}.${expiresStr}`;
  const expectedSig = sign(payload);
  if (!timingSafeEqual(providedSig, expectedSig)) return null;
  const expiresAt = Number(expiresStr);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;
  if (!userId) return null;
  return { userId, expiresAt };
}

export const sessionCookieOptions = (expiresAt: Date) => ({
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
  expires: expiresAt,
});

export const clearSessionCookieOptions = () => ({
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
  expires: new Date(0),
});
