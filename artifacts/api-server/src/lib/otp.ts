import crypto from "node:crypto";

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_LENGTH = 6;

function getPepper(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET environment variable is required.");
  }
  return secret;
}

export function generateOtpCode(): string {
  const max = 10 ** OTP_LENGTH;
  return crypto.randomInt(0, max).toString().padStart(OTP_LENGTH, "0");
}

export function hashOtpCode(code: string): string {
  return crypto
    .createHmac("sha256", getPepper())
    .update(code)
    .digest("hex");
}

export function timingSafeCompare(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export function otpExpiry(): Date {
  return new Date(Date.now() + OTP_TTL_MS);
}

export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(input: string): boolean {
  return EMAIL_REGEX.test(input) && input.length <= 254;
}
