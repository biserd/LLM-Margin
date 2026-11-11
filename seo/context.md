# LLM Margin

- Production origin is defined by `vars.APP_BASE_URL` in `wrangler.jsonc`.
- AI freelancers and small agencies can calculate the cost, margin, setup fee, and retainer of a client project. Verify claims in `artifacts/tokencalc/src/pages/QuoteBuilder.tsx` and on [the live calculator](https://llmmargin.com/ai-service-pricing-calculator).
- Paid proposal export is the conversion. Verify the current price and terms against `artifacts/tokencalc/src/pages/Pricing.tsx` and [live pricing](https://llmmargin.com/pricing) before changing any marketing claims.
- React pages live in `artifacts/tokencalc/src/pages`. Follow `App.tsx`, `scripts/seo-routes.mjs`, `scripts/build-seo-files.mjs`, and the existing prerender pipeline for discoverable pages. Model comparison data lives in `src/lib/comparePairs.ts`.
- Competitors are query-specific. Confirm their relevance in the actual SERP before writing a comparison.
