import Stripe from "stripe";

const secret = process.env["STRIPE_SECRET_KEY"];

if (!secret) {
  throw new Error(
    "STRIPE_SECRET_KEY environment variable is required for billing.",
  );
}

export const stripe: Stripe = new Stripe(secret, { typescript: true });

export const STRIPE_WEBHOOK_SECRET = process.env["STRIPE_WEBHOOK_SECRET"] ?? "";

export const ALLOWED_LOOKUP_KEYS = ["pro_monthly", "pro_annual"] as const;
export type AllowedLookupKey = (typeof ALLOWED_LOOKUP_KEYS)[number];

export function isAllowedLookupKey(value: unknown): value is AllowedLookupKey {
  return (
    typeof value === "string" &&
    (ALLOWED_LOOKUP_KEYS as readonly string[]).includes(value)
  );
}

export function appBaseUrl(): string {
  const explicit = process.env["APP_BASE_URL"];
  if (explicit) return explicit.replace(/\/$/, "");
  const domains = (process.env["REPLIT_DOMAINS"] ?? "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);
  if (domains[0]) return `https://${domains[0]}`;
  return "http://localhost:80";
}
