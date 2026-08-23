import Stripe from "stripe";

const SESSION_COOKIE_NAME = "lm_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const OTP_TTL_MS = 10 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const MAX_JSON_BYTES = 16 * 1024;
const ALLOWED_LOOKUP_KEYS = new Set(["pro_monthly", "pro_annual"]);

type Session = { userId: string; expiresAt: number };

type UserRow = {
  id: string;
  email: string;
  created_at: string;
  last_login_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: string;
  subscription_status: string | null;
  subscription_interval: string | null;
  current_period_end: string | null;
};

type OtpRow = {
  id: string;
  code_hash: string;
};

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function apiHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  headers.set("Cache-Control", "no-store");
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("X-Content-Type-Options", "nosniff");
  return headers;
}

function json(data: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: apiHeaders(headers),
  });
}

function redirect(location: string, headers?: HeadersInit): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Location", location);
  responseHeaders.set("Cache-Control", "no-store");
  return new Response(null, { status: 303, headers: responseHeaders });
}

function log(
  level: "info" | "warn" | "error",
  message: string,
  details: Record<string, unknown> = {},
): void {
  const line = JSON.stringify({ level, message, ...details });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function readSmallJson(request: Request): Promise<Record<string, unknown>> {
  if (!request.body) return {};
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_JSON_BYTES) {
    throw new HttpError(413, "Request body is too large.");
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_JSON_BYTES) {
        await reader.cancel();
        throw new HttpError(413, "Request body is too large.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("Body must be an object");
    }
    return value as Record<string, unknown>;
  } catch {
    throw new HttpError(400, "Invalid JSON body.");
  }
}

function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

function isValidEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input) && input.length <= 254;
}

function generateOtpCode(): string {
  const max = 1_000_000;
  const unbiasedLimit = Math.floor(0x1_0000_0000 / max) * max;
  const random = new Uint32Array(1);
  do {
    crypto.getRandomValues(random);
  } while (random[0] >= unbiasedLimit);
  return String(random[0] % max).padStart(6, "0");
}

async function hmac(secret: string, value: string): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  return crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
}

function bytesToHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(value: string): Uint8Array | null {
  if (!/^[0-9a-f]{64}$/i.test(value)) return null;
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function bytesToBase64Url(buffer: ArrayBuffer): string {
  let binary = "";
  for (const value of new Uint8Array(buffer)) binary += String.fromCharCode(value);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array | null {
  try {
    const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const binary = atob(padded);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

async function hashOtpCode(code: string, env: Env): Promise<string> {
  return bytesToHex(await hmac(env.SESSION_SECRET, code));
}

async function timingSafeHexEqual(left: string, right: string): Promise<boolean> {
  const leftBytes = hexToBytes(left);
  const rightBytes = hexToBytes(right);
  if (!leftBytes || !rightBytes) return false;
  return crypto.subtle.timingSafeEqual(leftBytes, rightBytes);
}

async function createSessionToken(
  userId: string,
  env: Env,
): Promise<{ token: string; expiresAt: Date }> {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = `${userId}.${expiresAt}`;
  const signature = bytesToBase64Url(await hmac(env.SESSION_SECRET, payload));
  return {
    token: `${payload}.${signature}`,
    expiresAt: new Date(expiresAt),
  };
}

async function verifySessionToken(
  token: string | undefined,
  env: Env,
): Promise<Session | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expiresString, signature] = parts;
  if (!userId || !expiresString || !signature) return null;
  const expiresAt = Number(expiresString);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;

  const signatureBytes = base64UrlToBytes(signature);
  if (!signatureBytes) return null;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    new TextEncoder().encode(`${userId}.${expiresString}`),
  );
  return valid ? { userId, expiresAt } : null;
}

function parseCookies(request: Request): Map<string, string> {
  const cookies = new Map<string, string>();
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (name) cookies.set(name, value);
  }
  return cookies;
}

function sessionCookie(token: string, expiresAt: Date): string {
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; Expires=${expiresAt.toUTCString()}; HttpOnly; Secure; SameSite=Lax`;
}

function clearSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

async function getSession(request: Request, env: Env): Promise<Session | null> {
  return verifySessionToken(parseCookies(request).get(SESSION_COOKIE_NAME), env);
}

async function checkRateLimit(
  env: Env,
  key: string,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const now = Date.now();
  const resetAt = now + RATE_LIMIT_WINDOW_MS;
  const row = await env.DB.prepare(
    `INSERT INTO rate_limits (key, count, reset_at)
     VALUES (?, 1, ?)
     ON CONFLICT(key) DO UPDATE SET
       count = CASE WHEN rate_limits.reset_at <= ? THEN 1 ELSE rate_limits.count + 1 END,
       reset_at = CASE WHEN rate_limits.reset_at <= ? THEN excluded.reset_at ELSE rate_limits.reset_at END
     RETURNING count, reset_at`,
  )
    .bind(key, resetAt, now, now)
    .first<{ count: number; reset_at: number }>();

  if (!row) throw new Error("Rate limiter did not return a result");
  return {
    allowed: row.count <= RATE_LIMIT_MAX,
    retryAfterSeconds:
      row.count <= RATE_LIMIT_MAX ? 0 : Math.max(1, Math.ceil((row.reset_at - now) / 1000)),
  };
}

async function sendOtpEmail(env: Env, to: string, code: string): Promise<void> {
  const text =
    `Your LLM Margin sign-in code is: ${code}\n\n` +
    "This code expires in 10 minutes. If you didn't request it, you can safely ignore this email.";
  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px"><h2 style="color:#0f172a;margin:0 0 16px">Your sign-in code</h2><p style="color:#475569;font-size:14px;margin:0 0 24px">Enter this code in the LLM Margin sign-in page. It expires in 10 minutes.</p><div style="font-size:32px;font-weight:700;letter-spacing:8px;padding:16px 24px;background:#f1f5f9;color:#0f172a;border-radius:8px;text-align:center">${code}</div><p style="color:#94a3b8;font-size:12px;margin:24px 0 0">If you didn't request this code, you can safely ignore this email.</p></div>`;

  await env.EMAIL.send({
    from: { email: env.EMAIL_FROM, name: "LLM Margin" },
    to,
    subject: "Your LLM Margin sign-in code",
    text,
    html,
  });
}

function stripeClient(env: Env): Stripe {
  if (!env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(env.STRIPE_SECRET_KEY, {
    typescript: true,
    httpClient: Stripe.createFetchHttpClient(),
  });
}

function appBaseUrl(env: Env): string {
  return env.APP_BASE_URL.replace(/\/$/, "");
}

async function loadUser(env: Env, userId: string): Promise<UserRow | null> {
  return env.DB.prepare("SELECT * FROM users WHERE id = ? LIMIT 1")
    .bind(userId)
    .first<UserRow>();
}

async function ensureStripeCustomer(
  env: Env,
  stripe: Stripe,
  user: UserRow,
): Promise<string> {
  if (user.stripe_customer_id) return user.stripe_customer_id;
  const customer = await stripe.customers.create({
    email: user.email,
    metadata: { userId: user.id },
  });
  await env.DB.prepare("UPDATE users SET stripe_customer_id = ? WHERE id = ?")
    .bind(customer.id, user.id)
    .run();
  return customer.id;
}

function subscriptionPeriodEnd(subscription: Stripe.Subscription): number | null {
  const item = subscription.items.data[0];
  const candidates: unknown[] = [
    Reflect.get(subscription, "current_period_end"),
    item ? Reflect.get(item, "current_period_end") : undefined,
  ];
  return candidates.find(
    (value): value is number => typeof value === "number" && Number.isFinite(value),
  ) ?? null;
}

async function applySubscription(
  env: Env,
  subscription: Stripe.Subscription,
): Promise<void> {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;
  let userId = subscription.metadata?.userId || null;
  if (!userId) {
    userId =
      (await env.DB.prepare(
        "SELECT id FROM users WHERE stripe_customer_id = ? LIMIT 1",
      )
        .bind(customerId)
        .first<{ id: string }>())?.id ?? null;
  }
  if (!userId) {
    log("warn", "Stripe subscription has no matching user", {
      customerId,
      subscriptionId: subscription.id,
    });
    return;
  }

  const periodEnd = subscriptionPeriodEnd(subscription);
  const interval = subscription.items.data[0]?.price?.recurring?.interval ?? null;
  const active = subscription.status === "active" || subscription.status === "trialing";
  await env.DB.prepare(
    `UPDATE users SET
       stripe_customer_id = ?, stripe_subscription_id = ?, plan = ?,
       subscription_status = ?, subscription_interval = ?, current_period_end = ?
     WHERE id = ?`,
  )
    .bind(
      customerId,
      subscription.id,
      active ? "pro" : "free",
      subscription.status,
      interval,
      periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      userId,
    )
    .run();
}

async function clearSubscription(
  env: Env,
  stripe: Stripe,
  subscription: Stripe.Subscription,
): Promise<void> {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 10,
  });
  const stillActive = subscriptions.data.find(
    (candidate) =>
      candidate.id !== subscription.id &&
      (candidate.status === "active" || candidate.status === "trialing"),
  );
  if (stillActive) {
    await applySubscription(env, stillActive);
    return;
  }
  await env.DB.prepare(
    `UPDATE users SET plan = 'free', subscription_status = ?,
       stripe_subscription_id = NULL, current_period_end = NULL
     WHERE stripe_customer_id = ?`,
  )
    .bind(subscription.status, customerId)
    .run();
}

async function requestOtp(request: Request, env: Env): Promise<Response> {
  const body = await readSmallJson(request);
  const email = normalizeEmail(String(body.email ?? ""));
  if (!isValidEmail(email)) return json({ error: "Invalid email address." }, 400);

  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const [emailLimit, ipLimit] = await Promise.all([
    checkRateLimit(env, `otp:email:${email}`),
    checkRateLimit(env, `otp:ip:${ip}`),
  ]);
  if (!emailLimit.allowed || !ipLimit.allowed) {
    const retryAfter = Math.max(
      emailLimit.retryAfterSeconds,
      ipLimit.retryAfterSeconds,
    );
    return json(
      { error: "Too many requests. Please try again later.", retryAfter },
      429,
      { "Retry-After": String(retryAfter) },
    );
  }

  const now = new Date();
  const code = generateOtpCode();
  const codeHash = await hashOtpCode(code, env);
  await env.DB.prepare(
    "DELETE FROM otp_codes WHERE email = ? AND (consumed_at IS NOT NULL OR expires_at <= ?)",
  )
    .bind(email, now.toISOString())
    .run();
  await sendOtpEmail(env, email, code);
  await env.DB.prepare(
    `INSERT INTO otp_codes (id, email, code_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(
      crypto.randomUUID(),
      email,
      codeHash,
      new Date(now.getTime() + OTP_TTL_MS).toISOString(),
      now.toISOString(),
    )
    .run();
  return json({ ok: true });
}

async function verifyOtp(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  const body = await readSmallJson(request);
  const email = normalizeEmail(String(body.email ?? ""));
  const code = String(body.code ?? "").trim();
  if (!isValidEmail(email) || !/^\d{6}$/.test(code)) {
    return json({ error: "Invalid email or code." }, 400);
  }

  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const [emailLimit, ipLimit] = await Promise.all([
    checkRateLimit(env, `verify:email:${email}`),
    checkRateLimit(env, `verify:ip:${ip}`),
  ]);
  if (!emailLimit.allowed || !ipLimit.allowed) {
    const retryAfter = Math.max(
      emailLimit.retryAfterSeconds,
      ipLimit.retryAfterSeconds,
    );
    return json(
      { error: "Too many attempts. Please try again later.", retryAfter },
      429,
      { "Retry-After": String(retryAfter) },
    );
  }

  const now = new Date().toISOString();
  const record = await env.DB.prepare(
    `SELECT id, code_hash FROM otp_codes
     WHERE email = ? AND consumed_at IS NULL AND expires_at > ?
     ORDER BY created_at DESC LIMIT 1`,
  )
    .bind(email, now)
    .first<OtpRow>();
  if (!record) return json({ error: "Invalid or expired code." }, 401);

  const providedHash = await hashOtpCode(code, env);
  if (!(await timingSafeHexEqual(providedHash, record.code_hash))) {
    return json({ error: "Invalid or expired code." }, 401);
  }

  const consumed = await env.DB.prepare(
    "UPDATE otp_codes SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL RETURNING id",
  )
    .bind(now, record.id)
    .first<{ id: string }>();
  if (!consumed) return json({ error: "Invalid or expired code." }, 401);

  const user = await env.DB.prepare(
    `INSERT INTO users (id, email, created_at, last_login_at, plan)
     VALUES (?, ?, ?, ?, 'free')
     ON CONFLICT(email) DO UPDATE SET last_login_at = excluded.last_login_at
     RETURNING id, email`,
  )
    .bind(crypto.randomUUID(), email, now, now)
    .first<{ id: string; email: string }>();
  if (!user) throw new Error("Failed to upsert user");

  const session = await createSessionToken(user.id, env);
  ctx.waitUntil(
    env.DB.prepare(
      "DELETE FROM otp_codes WHERE email = ? AND (consumed_at IS NOT NULL OR expires_at <= ?)",
    )
      .bind(email, now)
      .run(),
  );
  return json(
    { user },
    200,
    { "Set-Cookie": sessionCookie(session.token, session.expiresAt) },
  );
}

async function authMe(request: Request, env: Env): Promise<Response> {
  const session = await getSession(request, env);
  if (!session) return json({ error: "Unauthorized" }, 401);
  const user = await env.DB.prepare(
    `SELECT id, email, plan, subscription_status, subscription_interval, current_period_end
     FROM users WHERE id = ? LIMIT 1`,
  )
    .bind(session.userId)
    .first<{
      id: string;
      email: string;
      plan: string;
      subscription_status: string | null;
      subscription_interval: string | null;
      current_period_end: string | null;
    }>();
  if (!user) {
    return json(
      { error: "Unauthorized" },
      401,
      { "Set-Cookie": clearSessionCookie() },
    );
  }
  return json({
    user: {
      id: user.id,
      email: user.email,
      plan: user.plan,
      subscriptionStatus: user.subscription_status,
      subscriptionInterval: user.subscription_interval,
      currentPeriodEnd: user.current_period_end,
    },
  });
}

async function startCheckout(request: Request, env: Env): Promise<Response> {
  const body = await readSmallJson(request);
  const lookupKey = body.lookupKey;
  if (typeof lookupKey !== "string" || !ALLOWED_LOOKUP_KEYS.has(lookupKey)) {
    return json({ error: "Invalid plan." }, 400);
  }

  const stripe = stripeClient(env);
  const session = await getSession(request, env);
  const user = session ? await loadUser(env, session.userId) : null;
  if (user?.stripe_customer_id) {
    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripe_customer_id,
      status: "all",
      limit: 10,
    });
    const active = subscriptions.data.find(
      (candidate) => candidate.status === "active" || candidate.status === "trialing",
    );
    if (active) {
      const portal = await stripe.billingPortal.sessions.create({
        customer: user.stripe_customer_id,
        return_url: `${appBaseUrl(env)}/account`,
      });
      return json({ url: portal.url, alreadySubscribed: true });
    }
  }

  const prices = await stripe.prices.list({
    lookup_keys: [lookupKey],
    active: true,
    limit: 1,
    expand: ["data.product"],
  });
  const price = prices.data[0];
  if (!price) return json({ error: "Pricing unavailable. Try again." }, 503);

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    line_items: [{ price: price.id, quantity: 1 }],
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    payment_method_collection: "always",
    success_url: `${appBaseUrl(env)}/api/stripe/checkout/complete?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appBaseUrl(env)}/pricing?canceled=1`,
    subscription_data: {
      trial_period_days: 7,
      metadata: user ? { userId: user.id } : {},
    },
    metadata: { lookupKey, ...(user ? { userId: user.id } : {}) },
  };
  if (user) {
    params.customer = await ensureStripeCustomer(env, stripe, user);
    params.client_reference_id = user.id;
  }
  const checkout = await stripe.checkout.sessions.create(params);
  if (!checkout.url) return json({ error: "Could not create checkout session." }, 500);
  return json({ url: checkout.url });
}

async function completeCheckout(request: Request, env: Env): Promise<Response> {
  const base = appBaseUrl(env);
  const sessionId = new URL(request.url).searchParams.get("session_id") ?? "";
  if (!sessionId.startsWith("cs_")) return redirect(`${base}/pricing?error=invalid_session`);

  const stripe = stripeClient(env);
  try {
    const checkout = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "customer"],
    });
    if (checkout.payment_status !== "paid" && checkout.status !== "complete") {
      return redirect(`${base}/pricing?error=payment_incomplete`);
    }
    const customerId =
      typeof checkout.customer === "string"
        ? checkout.customer
        : checkout.customer?.id ?? null;
    const email = normalizeEmail(
      String(
        checkout.customer_details?.email ??
          (typeof checkout.customer === "object" &&
          checkout.customer &&
          "email" in checkout.customer
            ? checkout.customer.email
            : ""),
      ),
    );
    if (!customerId || !email) return redirect(`${base}/pricing?error=session_incomplete`);

    const existing = await env.DB.prepare(
      "SELECT id, stripe_customer_id FROM users WHERE email = ? LIMIT 1",
    )
      .bind(email)
      .first<{ id: string; stripe_customer_id: string | null }>();
    const isNewUser = !existing;
    const now = new Date().toISOString();
    let userId: string;
    if (existing) {
      userId = existing.id;
      if (!existing.stripe_customer_id) {
        await env.DB.prepare(
          "UPDATE users SET stripe_customer_id = ? WHERE id = ? AND stripe_customer_id IS NULL",
        )
          .bind(customerId, userId)
          .run();
      }
    } else {
      userId = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO users (id, email, created_at, last_login_at, stripe_customer_id, plan)
         VALUES (?, ?, ?, ?, ?, 'free')`,
      )
        .bind(userId, email, now, now, customerId)
        .run();
    }

    if (checkout.subscription) {
      const subscription =
        typeof checkout.subscription === "string"
          ? await stripe.subscriptions.retrieve(checkout.subscription)
          : checkout.subscription;
      if (!subscription.metadata?.userId) {
        await stripe.subscriptions.update(subscription.id, {
          metadata: { ...subscription.metadata, userId },
        });
        subscription.metadata = { ...subscription.metadata, userId };
      }
      await applySubscription(env, subscription);
    }

    if (isNewUser) {
      const session = await createSessionToken(userId, env);
      return redirect(`${base}/account?upgraded=1`, {
        "Set-Cookie": sessionCookie(session.token, session.expiresAt),
      });
    }
    const next = encodeURIComponent("/account?upgraded=1");
    return redirect(
      `${base}/sign-in?next=${next}&email=${encodeURIComponent(email)}&upgraded=1`,
    );
  } catch (error) {
    log("error", "Stripe checkout completion failed", {
      error: errorMessage(error),
      sessionId,
    });
    return redirect(`${base}/pricing?error=complete_failed`);
  }
}

async function openPortal(request: Request, env: Env): Promise<Response> {
  const session = await getSession(request, env);
  if (!session) return json({ error: "Unauthorized" }, 401);
  const user = await loadUser(env, session.userId);
  if (!user) return json({ error: "Unauthorized" }, 401);
  if (!user.stripe_customer_id) return json({ error: "No active subscription." }, 400);
  const portal = await stripeClient(env).billingPortal.sessions.create({
    customer: user.stripe_customer_id,
    return_url: `${appBaseUrl(env)}/account`,
  });
  return json({ url: portal.url });
}

async function handleWebhook(request: Request, env: Env): Promise<Response> {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });
  if (!env.STRIPE_WEBHOOK_SECRET) {
    log("error", "Stripe webhook secret is not configured");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const stripe = stripeClient(env);
  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch (error) {
    log("warn", "Stripe webhook signature verification failed", {
      error: errorMessage(error),
    });
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const checkout = event.data.object;
        if (!checkout.subscription) break;
        const subscriptionId =
          typeof checkout.subscription === "string"
            ? checkout.subscription
            : checkout.subscription.id;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        let userId =
          checkout.client_reference_id || checkout.metadata?.userId || null;

        if (!userId) {
          const customerId =
            typeof checkout.customer === "string"
              ? checkout.customer
              : checkout.customer?.id ?? null;
          const email = normalizeEmail(String(checkout.customer_details?.email ?? ""));
          if (customerId && email) {
            const existing = await env.DB.prepare(
              "SELECT id, stripe_customer_id FROM users WHERE email = ? LIMIT 1",
            )
              .bind(email)
              .first<{ id: string; stripe_customer_id: string | null }>();
            if (existing) {
              userId = existing.id;
              if (!existing.stripe_customer_id) {
                await env.DB.prepare(
                  "UPDATE users SET stripe_customer_id = ? WHERE id = ? AND stripe_customer_id IS NULL",
                )
                  .bind(customerId, userId)
                  .run();
              }
            } else {
              const id = crypto.randomUUID();
              await env.DB.prepare(
                `INSERT INTO users (id, email, created_at, stripe_customer_id, plan)
                 VALUES (?, ?, ?, ?, 'free') ON CONFLICT(email) DO NOTHING`,
              )
                .bind(id, email, new Date().toISOString(), customerId)
                .run();
              userId =
                (await env.DB.prepare("SELECT id FROM users WHERE email = ? LIMIT 1")
                  .bind(email)
                  .first<{ id: string }>())?.id ?? null;
            }
          }
        }
        if (userId && !subscription.metadata?.userId) {
          subscription.metadata = { ...subscription.metadata, userId };
        }
        await applySubscription(env, subscription);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await applySubscription(env, event.data.object);
        break;
      case "customer.subscription.deleted":
        await clearSubscription(env, stripe, event.data.object);
        break;
      default:
        log("info", "Ignored Stripe event", { type: event.type });
    }
    return json({ received: true });
  } catch (error) {
    log("error", "Stripe webhook handler failed", {
      error: errorMessage(error),
      type: event.type,
    });
    return json({ error: "Webhook handler error" }, 500);
  }
}

async function routeApi(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  const { pathname } = new URL(request.url);
  const method = request.method.toUpperCase();

  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Origin": new URL(request.url).origin,
        "Access-Control-Max-Age": "86400",
      },
    });
  }
  if (method === "GET" && pathname === "/api/healthz") {
    return json({ status: "ok" });
  }
  if (method === "POST" && pathname === "/api/auth/request-otp") {
    return requestOtp(request, env);
  }
  if (method === "POST" && pathname === "/api/auth/verify-otp") {
    return verifyOtp(request, env, ctx);
  }
  if (method === "POST" && pathname === "/api/auth/logout") {
    return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie() });
  }
  if (method === "GET" && pathname === "/api/auth/me") {
    return authMe(request, env);
  }
  if (method === "POST" && pathname === "/api/stripe/checkout") {
    return startCheckout(request, env);
  }
  if (method === "GET" && pathname === "/api/stripe/checkout/complete") {
    return completeCheckout(request, env);
  }
  if (method === "POST" && pathname === "/api/stripe/portal") {
    return openPortal(request, env);
  }
  if (method === "POST" && pathname === "/api/stripe/webhook") {
    return handleWebhook(request, env);
  }
  return json({ error: "Not found" }, 404);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);

    try {
      return await routeApi(request, env, ctx);
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      log(status >= 500 ? "error" : "warn", "API request failed", {
        error: errorMessage(error),
        method: request.method,
        path: url.pathname,
        status,
      });
      return json(
        { error: error instanceof HttpError ? error.message : "Internal server error" },
        status,
      );
    }
  },
} satisfies ExportedHandler<Env>;
