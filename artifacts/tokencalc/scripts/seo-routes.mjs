// Source of truth for prerendered routes and sitemap entries.
// Mirrors COMPARE_PAIRS in src/lib/comparePairs.ts — keep in sync.
// Re-run `node scripts/build-seo-files.mjs` after editing this list.

export const STATIC_ROUTES = [
  "/",
  "/cost-per-user",
  "/budget-planner",
  "/pricing",
  "/terms",
  "/privacy",
  "/contact",
  "/blog",
  "/blog/how-to-calculate-llm-cost-per-user",
  "/blog/ai-api-budget-planning-for-startups",
  "/compare",
];

export const COMPARE_PAIR_SLUGS = [
  "gpt-5-vs-claude-3-7-sonnet",
  "gpt-5-vs-gemini-2-5-pro",
  "gpt-5-vs-o3",
  "claude-3-7-sonnet-vs-gemini-2-5-pro",
  "gpt-4o-vs-claude-3-7-sonnet",
  "gpt-4o-vs-gemini-2-5-pro",
  "claude-3-7-sonnet-vs-gpt-4-turbo",
  "gpt-4o-vs-gpt-4-turbo",
  "o1-vs-o3",
  "o3-vs-claude-3-7-sonnet",
  "o3-vs-gpt-4o",
  "o1-vs-claude-3-7-sonnet",
  "o1-vs-gpt-4o",
  "gpt-4o-mini-vs-claude-3-5-haiku",
  "gpt-4o-mini-vs-gemini-2-5-flash",
  "gpt-4o-mini-vs-claude-haiku-4-5",
  "gpt-4o-mini-vs-gemini-2-0-flash",
  "claude-3-5-haiku-vs-gemini-2-5-flash",
  "claude-haiku-4-5-vs-gemini-2-5-flash",
  "claude-3-5-haiku-vs-deepseek-v3",
  "gemini-2-5-flash-vs-deepseek-v3",
  "claude-3-haiku-vs-claude-3-5-haiku",
  "llama-3-3-70b-vs-gpt-4o-mini",
  "llama-3-3-70b-vs-claude-3-5-haiku",
  "deepseek-v3-vs-gpt-4o-mini",
  "deepseek-v3-2-vs-gpt-4o-mini",
  "llama-3-1-70b-vs-llama-3-3-70b",
  "mixtral-8x22b-vs-llama-3-3-70b",
  "qwen-2-5-72b-vs-llama-3-3-70b",
  "qwen-2-5-72b-vs-deepseek-v3",
  "gpt-5-vs-gpt-4o",
  "gpt-4o-vs-gpt-4o-mini",
  "gpt-4o-vs-gpt-4-turbo",
  "claude-3-7-sonnet-vs-claude-3-5-haiku",
  "claude-3-7-sonnet-vs-claude-haiku-4-5",
  "claude-haiku-4-5-vs-claude-3-5-haiku",
  "gemini-2-5-pro-vs-gemini-2-5-flash",
  "gemini-2-5-flash-vs-gemini-2-0-flash",
  "llama-3-1-70b-vs-llama-3-1-8b",
  "mistral-large-vs-mixtral-8x22b",
  "command-r-plus-vs-gpt-4o",
  "sonar-vs-gpt-4o-mini",
];

export const COMPARE_ROUTES = COMPARE_PAIR_SLUGS.map((s) => `/compare/${s}`);

export const ALL_ROUTES = [...STATIC_ROUTES, ...COMPARE_ROUTES];
