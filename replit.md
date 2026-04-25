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
- **Email**: `lib/email.ts` uses Resend if `RESEND_API_KEY` is set, otherwise logs the OTP code to the api-server console (dev fallback). `EMAIL_FROM` env var optional, defaults to `LLM Margin <onboarding@resend.dev>`.
- **Env**: `SESSION_SECRET` (required, used for cookie + OTP HMAC), optionally `RESEND_API_KEY`, `EMAIL_FROM`.

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
