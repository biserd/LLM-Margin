# Daily SEO for LLM Margin

The local Codex Scheduled task is the daily runner at 7:15 a.m. America/New_York. It uses the existing ChatGPT sign-in, checkout, and Wrangler login. Keep the computer on and the desktop app running. See [the local run instructions](codex-daily.md).

To connect Search Console, enable the Search Console API in an existing Google Cloud project you control and grant a dedicated service account access to the verified `sc-domain:llmmargin.com` property. Supply its credential as `GSC_SERVICE_ACCOUNT_JSON` in the local runner environment. Keep the credential outside the repository and out of logs. The collector requests Google's read-only scope. On Windows, install Python's `tzdata` package for Pacific dates. The collector can use OpenSSL bundled with Git for Windows if OpenSSL is absent from `PATH`.

The [GitHub workflow](https://github.com/biserd/LLM-Margin/actions/workflows/seo-daily.yml) is available for manual dispatch as a fallback. Its runner credentials below are only relevant to the GitHub path.

The [pinned skills](../.agents/skills/UPSTREAM.md) are invoked by the [daily prompt](../.github/codex/seo-daily.md). The collector uses the production origin in Wrangler, and Codex edits the existing React pages and SEO templates. The candidate scope is checked by `scripts/seo/release.py`. Editable state is `keyword-map.csv`, `context.md`, and `backlog.md`. A clean job builds and prerenders the candidate, then the release job pushes and deploys with the repo's Wrangler deployment. The release verifies rendered production pages and rolls its Worker version back if a new regression is confirmed. Content-only runs use the existing D1 schema.

## GitHub configuration

Add credentials to [Actions secrets](https://github.com/biserd/LLM-Margin/settings/secrets/actions).

| Name | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | API project key for the official Codex Action. The production crawl and evidence logging still run if this is missing. |
| `CLOUDFLARE_API_TOKEN` | Workers deploy token scoped to the existing Cloudflare account and zone. Grant the Wrangler permissions needed to list versions, deploy the existing Worker and its bindings, and roll it back. The existing account ID is the default, with optional Actions variable `CLOUDFLARE_ACCOUNT_ID`. |
| `GSC_SERVICE_ACCOUNT_JSON` | Google service-account JSON. Enable Search Console API and add the service account to the verified `sc-domain:llmmargin.com` property with read access. An Actions variable `SEO_GSC_PROPERTY` can select the verified URL-prefix property instead. |
| `SERPAPI_API_KEY` | Google organic rankings and Google AI Overviews. A successful search that lacks an AI Overview is recorded as not shown. |
| `PERPLEXITY_API_KEY` | Perplexity Sonar visibility observations, explicitly labeled as API results. |
| `SEO_GITHUB_TOKEN` | Optional for the current unprotected main branch. If branch rules later require a PR, use a repository-scoped identity with contents and pull request write access, enable repository auto-merge and allow squash merges. Its authenticated merge event starts the validated release. |

Set the Actions variable `SEO_GA4_PROPERTY_ID` to the numeric GA4 property ID and grant the same Google service account Viewer access to reuse analytics. ChatGPT Search is recorded as unchecked until a measurement integration for that exact surface is connected.

## Evidence and history

The runner reads Search Console finalized data in Pacific time. Blog candidates use page/query rows with at least 30 impressions and average positions 8–20. CTR candidates need at least 100 impressions and a materially weaker CTR than peers in the same device and two-position bucket. The peer pool requires five other pages and 500 impressions. These are eligibility thresholds. The skills still check search intent, quality and evidence before selecting an edit.

The [seo-history branch](https://github.com/biserd/LLM-Margin/tree/seo-history/seo) keeps run records and pending measurements. GitHub also retains each run's record artifact. Only verified production changes open a measurement. Each title test locks the URL until the 28 complete post-release days can be measured. Source windows, clicks, impressions, CTR, average position, rendered metadata, indexing findings, AI mentions and cited URLs, and release status are recorded where available.
