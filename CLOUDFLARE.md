# LLM Margin on Cloudflare

LLM Margin runs as one Cloudflare Worker:

- the Vite/React site is served with Workers Static Assets;
- `/api/*` requests are handled by the Worker;
- users, one-time codes, and rate limits are stored in D1;
- email is sent through the Resend HTTP API;
- subscriptions are managed through Stripe's HTTP API.

No continuously running Node.js server or PostgreSQL service is required.

## Requirements

- Node.js 22 or newer
- pnpm 11
- a Cloudflare account with the `llmmargin.com` zone

## Cloudflare resources

Create a D1 database named `llm-margin`, then copy the returned database ID into the `d1_databases` entry in `wrangler.jsonc`:

```shell
pnpm exec wrangler d1 create llm-margin
```

Configure these encrypted Worker secrets. Preserve the existing production values during migration so current sessions, email delivery, and Stripe webhook verification continue to work:

- `SESSION_SECRET`
- `RESEND_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

The non-secret values `APP_BASE_URL` and `EMAIL_FROM` are defined in `wrangler.jsonc`.

## Local development

Copy `.dev.vars.example` to `.dev.vars`, fill in development-only values, and run:

```shell
pnpm install
pnpm dev
```

The local D1 schema can be applied with:

```shell
pnpm exec wrangler d1 migrations apply llm-margin --local
```

## Validation and deployment

```shell
pnpm build
pnpm deploy
```

The deploy command validates the TypeScript projects, builds and prerenders the site, checks the Worker bundle, applies pending D1 migrations, and deploys the Worker.

## Production data migration

Import the existing `users` rows before switching the domain. Keep IDs, timestamps, Stripe IDs, plan, subscription status, interval, and current-period end unchanged. Expired or consumed one-time codes do not need to be migrated.

After importing, compare the source and D1 row counts and spot-check the Stripe fields. Then verify the Worker preview URL before adding the custom domains.

## DNS cutover

Only after the Worker preview passes the health, login, billing, and representative-page checks:

1. Remove the old Replit DNS records for the apex and `www` names.
2. Attach `llmmargin.com` and `www.llmmargin.com` to the Worker as Cloudflare Custom Domains.
3. Verify HTTPS, authentication, checkout, customer portal, and Stripe webhook delivery.
4. Stop the Replit deployment after the Cloudflare site has remained healthy.

Cloudflare creates the DNS records and certificates for Worker Custom Domains. Keeping the Stripe webhook path at `/api/stripe/webhook` avoids changing its public URL during cutover.

## Rollback

If a critical issue appears immediately after cutover, remove the Worker custom domains and restore the prior DNS records while the Replit deployment is still available. Do not delete the Replit deployment until the Cloudflare production checks are complete.
