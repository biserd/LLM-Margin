import type Stripe from "stripe";
import { HttpError, json, readSmallJson, loadUser, stripeClient, appBaseUrl } from "../worker";
import { calculateQuote, parseQuote, money, QUOTE_PRICE_CENTS, type QuoteInput } from "./quote-model";

type QuoteRow = { id: string; user_id: string; input_json: string; revision: number; created_at: string; updated_at: string };
export function validatedInput(value: unknown): QuoteInput {
  try { return parseQuote(value); } catch (error) { throw new HttpError(400, (error as Error).message); }
}
export async function quoteById(env: Env, userId: string, id: string): Promise<QuoteRow> {
  const row = await env.DB.prepare("SELECT * FROM quotes WHERE id = ? AND user_id = ?").bind(id, userId).first<QuoteRow>();
  if (!row) throw new HttpError(404, "Quote not found.");
  return row;
}
export async function canExport(env: Env, userId: string, quoteId: string) {
  const row = await env.DB.prepare("SELECT 1 AS allowed FROM quote_purchases WHERE quote_id = ? AND user_id = ? AND revoked_at IS NULL UNION SELECT 1 FROM users WHERE id = ? AND plan = 'pro' AND subscription_status IN ('active','trialing') LIMIT 1").bind(quoteId, userId, userId).first();
  return !!row;
}
export async function quoteData(env: Env, row: QuoteRow) {
  const input = parseQuote(JSON.parse(row.input_json));
  return { id: row.id, input, result: calculateQuote(input), revision: row.revision, createdAt: row.created_at, updatedAt: row.updated_at, exportUnlocked: await canExport(env, row.user_id, row.id) };
}
export async function saveQuote(env: Env, userId: string, value: unknown, id?: string, revision?: number) {
  const input = validatedInput(value);
  const now = new Date().toISOString();
  if (id) {
    if (!Number.isInteger(revision)) throw new HttpError(400, "revision is required when updating a quote.");
    await quoteById(env, userId, id);
    const updated = await env.DB.prepare("UPDATE quotes SET input_json = ?, updated_at = ?, revision = revision + 1 WHERE id = ? AND user_id = ? AND revision = ?").bind(JSON.stringify(input), now, id, userId, revision).run();
    if (!updated.meta.changes) throw new HttpError(409, "This quote changed in another tab. Reload before saving.");
  } else {
    id = crypto.randomUUID();
    const inserted = await env.DB.prepare("INSERT INTO quotes (id,user_id,input_json,created_at,updated_at) SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM quotes WHERE user_id = ?) < 100").bind(id, userId, JSON.stringify(input), now, now, userId).run();
    if (!inserted.meta.changes) throw new HttpError(409, "Your account has reached the 100 saved quote limit.");
  }
  return quoteData(env, await quoteById(env, userId, id));
}
export async function listQuotes(env: Env, userId: string) {
  const rows = await env.DB.prepare("SELECT id,input_json,revision,created_at,updated_at FROM quotes WHERE user_id = ? ORDER BY updated_at DESC LIMIT 100").bind(userId).all<QuoteRow>();
  return rows.results.map(row => ({ id: row.id, title: parseQuote(JSON.parse(row.input_json)).title, updatedAt: row.updated_at, revision: row.revision }));
}
/** Called only with a signature-verified event or a session retrieved from Stripe. */
export async function fulfillQuote(env: Env, checkout: Stripe.Checkout.Session) {
  if (checkout.metadata?.product !== "quote_export_v1") return false;
  if (checkout.payment_status !== "paid") return true;
  const { quoteId, userId } = checkout.metadata;
  if (checkout.mode !== "payment" || checkout.amount_total !== QUOTE_PRICE_CENTS || checkout.currency !== "usd" || !quoteId || !userId || checkout.client_reference_id !== userId) throw new Error("Quote purchase did not match the expected offer.");
  await quoteById(env, userId, quoteId);
  const intentId = typeof checkout.payment_intent === "string" ? checkout.payment_intent : checkout.payment_intent?.id ?? null;
  await env.DB.prepare("INSERT INTO quote_purchases (quote_id,user_id,checkout_session_id,payment_intent_id,amount_cents,currency,paid_at,revoked_at) VALUES (?,?,?,?,?,?,?,(SELECT reversed_at FROM quote_payment_reversals WHERE payment_intent_id = ?)) ON CONFLICT(quote_id) DO NOTHING").bind(quoteId, userId, checkout.id, intentId, QUOTE_PRICE_CENTS, "usd", new Date().toISOString(), intentId).run();
  return true;
}
export const escapeHtml = (text: string) => text.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
export function renderProposal(q: QuoteInput, id: string) {
  const r = calculateQuote(q);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="robots" content="noindex,nofollow"><title>${escapeHtml(q.title)} — proposal</title><style>body{font:16px/1.6 system-ui,sans-serif;color:#172034;max-width:800px;margin:48px auto;padding:24px}h1{font-size:36px;line-height:1.2}h2{font-size:21px;border-top:1px solid #ddd;padding-top:24px}small{color:#566274}.scope{white-space:pre-wrap}table{border-collapse:collapse;width:100%}td{padding:12px 0;border-bottom:1px solid #ddd}td:last-child{text-align:right;font-weight:650}.brand{letter-spacing:.15em;text-transform:uppercase;color:#086953}@media print{body{margin:0;max-width:none;font-size:11pt;padding:12mm}h2,table{break-inside:avoid}.help{display:none}}</style></head><body><p class="brand">${escapeHtml(q.agency || "Service proposal")}</p><h1>${escapeHtml(q.title)}</h1><p>Prepared for ${escapeHtml(q.client || "your client")}</p><small>Proposal ${escapeHtml(id.slice(0,8))} · USD · Estimate for review</small><h2>Scope of service</h2><p class="scope">${escapeHtml(q.scope)}</p><h2>Investment</h2><table><tr><td>One-time implementation</td><td>${money(r.setupFee)}</td></tr><tr><td>Monthly service retainer</td><td>${money(r.minimumRetainer)}</td></tr><tr><td>First month total</td><td>${money(r.firstMonthTotal)}</td></tr></table><h2>Usage and boundaries</h2><p>Includes ${q.monthlyRequests.toLocaleString("en-US")} requests per month, modeled at ${q.callsPerRequest} model calls per request and ${q.inputTokens.toLocaleString("en-US")} input / ${q.outputTokens.toLocaleString("en-US")} output tokens per call. Includes ${q.supportHours} support hours per month.</p><p>Additional model usage: ${money(r.overagePer1000)} per 1,000 requests at the modeled token size. Extra support, scope changes, platform overages, and higher-token requests require separate agreement. No unlimited usage is included.</p><h2>Assumptions and next steps</h2><p>Based on ${escapeHtml(q.model)} at the rates used when preparing this estimate. Provider prices and actual usage can change. Taxes are excluded. Confirm scope, delivery timeline, payment terms, acceptance criteria, data handling, and overage approval in a separate written agreement before work starts. This estimate is not a signed contract.</p><p class="help">Use your browser’s Print → Save as PDF to deliver this proposal. Internal costs and margin targets are omitted from this client-facing document.</p></body></html>`;
}
async function startQuoteCheckout(env: Env, userId: string, quoteId: string) {
  await quoteById(env, userId, quoteId);
  if (await canExport(env, userId, quoteId)) return json({ url: `${appBaseUrl(env)}/quote/${quoteId}` });
  if (await env.DB.prepare("SELECT 1 FROM quote_purchases WHERE quote_id = ? AND user_id = ? AND revoked_at IS NOT NULL").bind(quoteId,userId).first()) throw new HttpError(409,"This purchase was refunded. Create a new quote before purchasing another export.");
  const user = await loadUser(env, userId);
  if (!user) throw new HttpError(401, "Sign in to purchase an export.");
  const stripe = stripeClient(env);
  const now = Math.floor(Date.now() / 1000);
  // One active checkout per quote. D1 serializes this upsert; Stripe deduplicates concurrent calls.
  // Never replace a known session before retrieving its state: a completed
  // delayed payment may still be processing after the checkout expiry time.
  const attempt = await env.DB.prepare("INSERT INTO quote_checkout_attempts (quote_id,attempt_id,expires_at) VALUES (?,?,?) ON CONFLICT(quote_id) DO UPDATE SET attempt_id = excluded.attempt_id, checkout_session_id = NULL, expires_at = excluded.expires_at WHERE quote_checkout_attempts.checkout_session_id IS NULL AND quote_checkout_attempts.expires_at < ? RETURNING *").bind(quoteId, crypto.randomUUID(), now + 3600, now + 1800).first<{ attempt_id: string; checkout_session_id: string | null; expires_at: number }>() ?? await env.DB.prepare("SELECT * FROM quote_checkout_attempts WHERE quote_id = ?").bind(quoteId).first<{ attempt_id: string; checkout_session_id: string | null; expires_at: number }>();
  if (!attempt) throw new Error("Could not reserve checkout.");
  if (attempt.checkout_session_id) {
    const existing = await stripe.checkout.sessions.retrieve(attempt.checkout_session_id);
    if (existing.status === "complete") {
      await fulfillQuote(env, existing);
      return json({ url: `${appBaseUrl(env)}/quote/${quoteId}?payment=processing` });
    }
    if (existing.status === "open" && existing.url) return json({ url: existing.url });
    await env.DB.prepare("UPDATE quote_checkout_attempts SET expires_at = 0, checkout_session_id = NULL WHERE quote_id = ? AND attempt_id = ?").bind(quoteId,attempt.attempt_id).run();
    return startQuoteCheckout(env,userId,quoteId);
  }
  const checkout = await stripe.checkout.sessions.create({
    mode: "payment", client_reference_id: userId,
    ...(user.stripe_customer_id ? { customer: user.stripe_customer_id } : { customer_email: user.email }),
    line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: QUOTE_PRICE_CENTS, product_data: { name: "LLM Margin — one client quote export", description: "Client-ready proposal and internal CSV for this saved quote, including revisions. No subscription." } } }],
    metadata: { product: "quote_export_v1", quoteId, userId },
    payment_intent_data: { metadata: { product: "quote_export_v1", quoteId, userId } },
    success_url: `${appBaseUrl(env)}/quote/${quoteId}?checkout_session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appBaseUrl(env)}/quote/${quoteId}?canceled=1`,
    expires_at: attempt.expires_at,
    integration_identifier: "llmmargin_quote_cphqwrtn",
  }, { idempotencyKey: `quote:${attempt.attempt_id}` });
  await env.DB.prepare("UPDATE quote_checkout_attempts SET checkout_session_id = ? WHERE quote_id = ? AND attempt_id = ?").bind(checkout.id, quoteId, attempt.attempt_id).run();
  if (!checkout.url) throw new Error("Stripe did not return a checkout URL.");
  return json({ url: checkout.url });
}
export async function routeQuotes(request: Request, env: Env, userId: string) {
  const path = new URL(request.url).pathname.replace(/^\/agent/, "/api");
  const match = path.match(/^\/api\/quotes(?:\/([a-f0-9-]{36})(?:\/(checkout|payment|export))?)?$/);
  if (!match) throw new HttpError(404, "Not found.");
  const [, id, action] = match;
  if (!id && request.method === "GET") return json({ quotes: await listQuotes(env, userId) });
  if (!id && request.method === "POST") return json(await saveQuote(env, userId, (await readSmallJson(request)).input), 201);
  if (!id) throw new HttpError(405, "Method not allowed.");
  const row = await quoteById(env, userId, id);
  if (!action && request.method === "GET") return json(await quoteData(env, row));
  if (!action && request.method === "PUT") {
    const body = await readSmallJson(request);
    return json(await saveQuote(env, userId, body.input, id, body.revision as number));
  }
  if (action === "checkout" && request.method === "POST") return startQuoteCheckout(env, userId, id);
  if (action === "payment" && request.method === "POST") {
    const { sessionId } = await readSmallJson(request);
    if (typeof sessionId !== "string" || !/^cs_[\w]+$/.test(sessionId)) throw new HttpError(400, "Invalid checkout session.");
    const checkout = await stripeClient(env).checkout.sessions.retrieve(sessionId);
    if (checkout.metadata?.userId !== userId || checkout.metadata?.quoteId !== id) throw new HttpError(404, "Checkout not found.");
    await fulfillQuote(env, checkout);
    return json({ exportUnlocked: await canExport(env, userId, id), paymentStatus: checkout.payment_status });
  }
  if (action === "export" && request.method === "GET") {
    if (!await canExport(env, userId, id)) return json({ error: "Purchase this quote export or use an active Pro subscription.", checkoutUrl: `/quote/${id}`, priceCents: QUOTE_PRICE_CENTS, currency: "usd" }, 402);
    const input = parseQuote(JSON.parse(row.input_json));
    const format = new URL(request.url).searchParams.get("format") ?? "html";
    const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", "X-Content-Type-Options": "nosniff" };
    if (format === "csv") {
      const cell = (v: unknown) => {
        let text = String(v);
        if (typeof v === "string" && (/^[\s\uFEFF]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text))) text = "'" + text;
        return `"${text.replaceAll('"', '""')}"`;
      };
      const csv = ["Section,Field,Value", ...Object.entries(input).map(([k,v]) => ["Input",k,v].map(cell).join(",")), ...Object.entries(calculateQuote(input)).filter(([,v]) => !Array.isArray(v)).map(([k,v]) => ["Result",k,v].map(cell).join(","))].join("\r\n");
      return new Response(csv, { headers: { ...headers, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="quote-${id}.csv"` } });
    }
    if (format !== "html") throw new HttpError(400, "Supported formats: html, csv.");
    return new Response(renderProposal(input,id), { headers: { ...headers, "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'" } });
  }
  throw new HttpError(405, "Method not allowed.");
}
