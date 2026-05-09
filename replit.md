# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Authentication

Passwordless email OTP (no Clerk).

- **Backend** (`artifacts/api-server`):
  - `POST /api/auth/request-otp` — generates a 6-digit code (10 min expiry), HMAC-hashes with `SESSION_SECRET`, stores in `otp_codes`, sends via `lib/email.ts`. Rate-limited 5 / 15 min per email and per IP (in-memory).
  - `POST /api/auth/verify-otp` — checks code (timing-safe), marks consumed, upserts `users` row, sets `lm_session` httpOnly cookie (signed `userId.expiresAt.hmac`, 30 days, Secure, SameSite=Lax).
  - `GET /api/auth/me` — returns `{ user }` if cookie valid, else 401.
  - `POST /api/auth/logout` — clears the cookie.
  - Session helpers in `src/lib/session.ts`; OTP helpers in `src/lib/otp.ts`; rate limiter in `src/lib/rateLimit.ts`; email sender in `src/lib/email.ts`.
  - `attachSession` middleware (in `src/middlewares/requireAuth.ts`) populates `req.session`. `requireAuth` enforces it.
- **Database** (`lib/db/src/schema/`):
  - `users` — `id` uuid pk, `email` unique, `created_at`, `last_login_at`, nullable `stripe_customer_id` (reserved for Stripe).
  - `otp_codes` — `id`, `email`, `code_hash`, `expires_at`, `consumed_at`, `created_at`, indexed on email and `expires_at`.
- **Frontend** (`artifacts/tokencalc`):
  - `src/lib/auth.tsx` exposes `<AuthProvider>` and `useAuth()` (returns `{ user, isLoading, refresh, signOut }`). Wraps `QueryClientProvider`'s children in `App.tsx`. Clears React Query cache on user identity change.
  - `/sign-in` — two-step OTP flow (email → code), uses `input-otp`. `/sign-up` redirects to `/sign-in`.
  - `/account` — wrapped in `<ProtectedRoute>`, shows email + sign out.
  - `Navigation` shows "Sign in" link when signed out, avatar dropdown (account, sign out) when signed in.
- **Email**: `lib/email.ts` uses Resend if `RESEND_API_KEY` is set, otherwise logs the OTP code to the api-server console (dev fallback). If Resend rejects the message we log the error AND log the OTP code, and still return 200 to the client so sign-in is never blocked by a Resend setup issue. `EMAIL_FROM` is set in shared env to `LLM Margin <noreply@llmmargin.com>` — the `llmmargin.com` domain is verified at https://resend.com/domains, so OTPs deliver to arbitrary recipients (verified 2026-04-25 with a successful test send to a non-account-owner Gmail address). If you ever rotate to a new domain, re-verify it at Resend and update `EMAIL_FROM` accordingly.
- **Env**: `SESSION_SECRET` (required, used for cookie + OTP HMAC), `RESEND_API_KEY` (required for real email delivery), `EMAIL_FROM` (set to a verified-domain address — currently `LLM Margin <noreply@llmmargin.com>`).
- **Note on Resend setup**: Replit's first-class Resend connector was offered but the user opted to provide `RESEND_API_KEY` directly as a secret instead. If you ever need to swap to OAuth-based Resend, search integrations and follow the connector flow.

## Billing (Stripe)

Live Stripe is wired into both api-server and tokencalc.

- **Stripe objects** (live mode):
  - Product `prod_UUBi6HfivWPwJe` "LLM Margin Pro"
  - Price `price_1TVDLT2Lf3YOal78QxofbT4s` — $19/mo, lookup_key `pro_monthly`
  - Price `price_1TVDLU2Lf3YOal78GOXHGhoW` — $149/yr, lookup_key `pro_annual`
  - Frontend/backend reference prices by **lookup_key**, never raw price IDs.
- **Backend** (`artifacts/api-server`):
  - `lib/stripe.ts` — initializes the Stripe client (`STRIPE_SECRET_KEY`), exposes `STRIPE_WEBHOOK_SECRET`, the `pro_monthly`/`pro_annual` allowlist, and `appBaseUrl()` (uses `APP_BASE_URL` if set, else first `REPLIT_DOMAINS` entry, else `http://localhost:80`).
  - `routes/stripe.ts`:
    - `POST /api/stripe/checkout` (auth required) — body `{ lookupKey }`. Creates a Stripe customer if missing, persists `stripe_customer_id` on the user, creates a subscription Checkout Session, returns `{ url }`. Success URL `/account?upgraded=1`, cancel URL `/pricing?canceled=1`. Sets `client_reference_id` and `subscription_data.metadata.userId`.
    - `POST /api/stripe/portal` (auth required) — opens Stripe Billing Portal, returns `{ url }`. Returns 400 if user has no `stripe_customer_id`.
    - `POST /api/stripe/webhook` — exported as `webhookRouter`, **mounted in `app.ts` BEFORE `express.json()`** with `express.raw({ type: 'application/json' })` so signature verification works. Handles `checkout.session.completed`, `customer.subscription.created/updated/deleted`. `applySubscription()` resolves the user via `subscription.metadata.userId` (preferred) or `stripe_customer_id` lookup, then writes `plan`, `subscription_status`, `subscription_interval`, `current_period_end`, `stripe_subscription_id`.
  - `/auth/me` now returns `plan`, `subscriptionStatus`, `subscriptionInterval`, `currentPeriodEnd`.
- **Database** (`lib/db/src/schema/users.ts`): added `stripe_subscription_id`, `plan` (default `"free"`), `subscription_status`, `subscription_interval`, `current_period_end`. `stripe_customer_id` already existed.
- **Frontend** (`artifacts/tokencalc`):
  - `src/lib/billing.ts` — `startCheckout(lookupKey)` (POST `/api/stripe/checkout`, redirects to returned URL; on 401 redirects to `/sign-in?next=...&plan=...`) and `openBillingPortal()`.
  - `src/lib/auth.tsx` — `AuthUser` extended with plan fields.
  - `src/pages/Pricing.tsx` — Both "Upgrade to Pro" buttons call `startCheckout` with the price matching the monthly/annual toggle. If the user is already Pro, the buttons become "Manage subscription" linking to `/account`. Reads `?canceled=1` for the cancel banner.
  - `src/pages/SignInPage.tsx` — After successful sign-in honors `?next=` and `?plan=` (auto-starts checkout if `plan=pro_monthly|pro_annual`), enabling "click Upgrade → sign in → land on Stripe Checkout" in one flow.
  - `src/pages/AccountPage.tsx` — Shows current plan + "Manage billing" (portal) or "Upgrade" link. After `?upgraded=1` it polls `/auth/me` every 1.5s up to 6 times to wait for the webhook to flip the plan.
- **Env**: `STRIPE_SECRET_KEY` (live `sk_live_...`, set), `STRIPE_WEBHOOK_SECRET` (`whsec_...`, required for webhook signature verification). Optional `APP_BASE_URL` to override the success/cancel URL host.
- **Stripe dashboard webhook setup** (one-time, after first deploy):
  - https://dashboard.stripe.com/webhooks → Add endpoint
  - URL: `https://llmmargin.com/api/stripe/webhook`
  - Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
  - Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
- **Note on Stripe SDK / API version**: We pass `{ typescript: true }` only and let the SDK use its pinned `apiVersion` default. If a future Stripe SDK upgrade moves `current_period_end` between subscription and item levels, `applySubscription()` already reads from both via a small cast.

## Artifacts

### TokenCalc (`artifacts/tokencalc`)
A business planning tool for SaaS founders to understand the real cost of running LLM-powered features.
- **Route**: `/` (homepage)
- **Tech**: React + Vite, Tailwind CSS, Recharts, TypeScript
- **No backend required** — all calculations run client-side
- **Pages**:
  - `/` — SaaS Margin Simulator (hero tool)
  - `/cost-per-user` — Cost-Per-User Calculator
  - `/budget-planner` — AI Budget Planner for Founders
- **Key libs** (`src/lib/`):
  - `pricing.ts` — fetchModels() from OpenRouter API, fallback to `/model-prices-fallback.json`
  - `calculator.ts` — All calculation formulas (gross margin, breakeven, power user risk, caching savings)
- **Shared components** (`src/components/`):
  - `ModelDropdown` — Searchable model picker grouped by provider
  - `MarginHealthBadge` — Color-coded health pill
  - `InlineCostPreview` — Live cost calculation text
  - `DisclaimerFooter` — Pricing disclaimer
  - `Navigation` — Sticky top nav
- **SEO / pre-rendering**:
  - `scripts/prerender.mjs` runs after `vite build`. Spins up a static server, uses Puppeteer (system Chromium) to render each route, and writes the resulting HTML to `dist/public/<route>/index.html`. This gives crawlers fully-rendered HTML with per-page `<title>`, meta tags, and H1 baked in. React still hydrates client-side after.
  - Routes prerendered: `/`, `/cost-per-user`, `/budget-planner`, `/pricing`, `/terms`, `/privacy`, `/contact`.
  - `artifact.toml` has explicit per-route rewrites pointing to the prerendered files BEFORE the SPA `/* → /index.html` catch-all, so the prerendered HTML is served instead of the empty shell.
  - Adding a new prerendered route requires: (1) add to `ROUTES` in `prerender.mjs`, (2) add a per-route rewrite in `artifact.toml` before the catch-all.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
