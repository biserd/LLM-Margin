import Stripe from "stripe";

let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const secret = process.env["STRIPE_SECRET_KEY"];
  if (!secret) {
    throw new Error(
      "STRIPE_SECRET_KEY environment variable is required for billing.",
    );
  }
  _stripe = new Stripe(secret, { typescript: true });
  return _stripe;
}

// Proxy so existing `import { stripe } from "../lib/stripe"` call sites keep
// working, but the Stripe client is only constructed on first actual use —
// the server can still boot without STRIPE_SECRET_KEY (auth, etc. unaffected).
export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    const client = getStripe() as unknown as Record<string | symbol, unknown>;
    const value = client[prop as string];
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(client)
      : (Reflect.get(client, prop, receiver) as unknown);
  },
});

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
