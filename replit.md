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
