// Single source of truth for the /compare programmatic SEO pages.
// Each entry maps a short URL slug to the canonical OpenRouter model id
// and a display label used in titles, charts, and tables.
//
// IMPORTANT: when this list changes, also update scripts/seo-routes.mjs
// and re-run `node scripts/build-seo-files.mjs` from artifacts/tokencalc.

export interface CompareModel {
  slug: string;
  id: string;
  name: string;
  provider: string;
  shortName: string;
}

export const COMPARE_MODELS: CompareModel[] = [
  { slug: "gpt-5-5",               id: "openai/gpt-5.5",                                name: "GPT-5.5",                provider: "OpenAI",     shortName: "GPT-5.5" },
  { slug: "gpt-5-4",               id: "openai/gpt-5.4",                                name: "GPT-5.4",                provider: "OpenAI",     shortName: "GPT-5.4" },
  { slug: "gpt-5-1",               id: "openai/gpt-5.1",                                name: "GPT-5.1",                provider: "OpenAI",     shortName: "GPT-5.1" },
  { slug: "gpt-5",                 id: "openai/gpt-5",                                  name: "GPT-5",                  provider: "OpenAI",     shortName: "GPT-5" },
  { slug: "gpt-4o",                id: "openai/gpt-4o",                                 name: "GPT-4o",                 provider: "OpenAI",     shortName: "GPT-4o" },
  { slug: "gpt-4o-mini",           id: "openai/gpt-4o-mini",                            name: "GPT-4o mini",            provider: "OpenAI",     shortName: "GPT-4o mini" },
  { slug: "gpt-4-turbo",           id: "openai/gpt-4-turbo",                            name: "GPT-4 Turbo",            provider: "OpenAI",     shortName: "GPT-4 Turbo" },
  { slug: "o1",                    id: "openai/o1",                                     name: "OpenAI o1",              provider: "OpenAI",     shortName: "o1" },
  { slug: "o3",                    id: "openai/o3",                                     name: "OpenAI o3",              provider: "OpenAI",     shortName: "o3" },
  { slug: "o4-mini",               id: "openai/o4-mini",                                name: "OpenAI o4-mini",         provider: "OpenAI",     shortName: "o4-mini" },
  { slug: "claude-opus-4-7",       id: "anthropic/claude-opus-4.7",                     name: "Claude Opus 4.7",        provider: "Anthropic",  shortName: "Claude Opus 4.7" },
  { slug: "claude-opus-4-5",       id: "anthropic/claude-opus-4.5",                     name: "Claude Opus 4.5",        provider: "Anthropic",  shortName: "Claude Opus 4.5" },
  { slug: "claude-sonnet-4-6",     id: "anthropic/claude-sonnet-4.6",                   name: "Claude Sonnet 4.6",      provider: "Anthropic",  shortName: "Claude Sonnet 4.6" },
  { slug: "claude-sonnet-4-5",     id: "anthropic/claude-sonnet-4.5",                   name: "Claude Sonnet 4.5",      provider: "Anthropic",  shortName: "Claude Sonnet 4.5" },
  { slug: "claude-3-7-sonnet",     id: "anthropic/claude-3.7-sonnet",                   name: "Claude 3.7 Sonnet",      provider: "Anthropic",  shortName: "Claude 3.7 Sonnet" },
  { slug: "claude-haiku-4-5",      id: "anthropic/claude-haiku-4.5",                    name: "Claude Haiku 4.5",       provider: "Anthropic",  shortName: "Claude Haiku 4.5" },
  { slug: "claude-3-5-haiku",      id: "anthropic/claude-3.5-haiku",                    name: "Claude 3.5 Haiku",       provider: "Anthropic",  shortName: "Claude 3.5 Haiku" },
  { slug: "claude-3-haiku",        id: "anthropic/claude-3-haiku",                      name: "Claude 3 Haiku",         provider: "Anthropic",  shortName: "Claude 3 Haiku" },
  { slug: "gemini-3-1-pro",        id: "google/gemini-3.1-pro-preview",                 name: "Gemini 3.1 Pro",         provider: "Google",     shortName: "Gemini 3.1 Pro" },
  { slug: "gemini-2-5-pro",        id: "google/gemini-2.5-pro",                         name: "Gemini 2.5 Pro",         provider: "Google",     shortName: "Gemini 2.5 Pro" },
  { slug: "gemini-2-5-flash",      id: "google/gemini-2.5-flash",                       name: "Gemini 2.5 Flash",       provider: "Google",     shortName: "Gemini 2.5 Flash" },
  { slug: "gemini-2-0-flash",      id: "google/gemini-2.0-flash-001",                   name: "Gemini 2.0 Flash",       provider: "Google",     shortName: "Gemini 2.0 Flash" },
  { slug: "llama-3-3-70b",         id: "meta-llama/llama-3.3-70b-instruct",             name: "Llama 3.3 70B",          provider: "Meta",       shortName: "Llama 3.3 70B" },
  { slug: "llama-3-1-70b",         id: "meta-llama/llama-3.1-70b-instruct",             name: "Llama 3.1 70B",          provider: "Meta",       shortName: "Llama 3.1 70B" },
  { slug: "llama-3-1-8b",          id: "meta-llama/llama-3.1-8b-instruct",              name: "Llama 3.1 8B",           provider: "Meta",       shortName: "Llama 3.1 8B" },
  { slug: "mixtral-8x22b",         id: "mistralai/mixtral-8x22b-instruct",              name: "Mixtral 8x22B",          provider: "Mistral",    shortName: "Mixtral 8x22B" },
  { slug: "mistral-large",         id: "mistralai/mistral-large",                       name: "Mistral Large",          provider: "Mistral",    shortName: "Mistral Large" },
  { slug: "deepseek-v3",           id: "deepseek/deepseek-chat",                        name: "DeepSeek V3",            provider: "DeepSeek",   shortName: "DeepSeek V3" },
  { slug: "deepseek-v3-2",         id: "deepseek/deepseek-v3.2",                        name: "DeepSeek V3.2",          provider: "DeepSeek",   shortName: "DeepSeek V3.2" },
  { slug: "qwen-2-5-72b",          id: "qwen/qwen-2.5-72b-instruct",                    name: "Qwen 2.5 72B",           provider: "Qwen",       shortName: "Qwen 2.5 72B" },
  { slug: "command-r-plus",        id: "cohere/command-r-plus-08-2024",                 name: "Command R+",             provider: "Cohere",     shortName: "Command R+" },
  { slug: "sonar",                 id: "perplexity/sonar",                              name: "Perplexity Sonar",       provider: "Perplexity", shortName: "Sonar" },
  { slug: "grok-4",                id: "x-ai/grok-4",                                   name: "Grok 4",                 provider: "xAI",        shortName: "Grok 4" },
  { slug: "grok-4-3",              id: "x-ai/grok-4.3",                                 name: "Grok 4.3",               provider: "xAI",        shortName: "Grok 4.3" },
  { slug: "llama-4-maverick",      id: "meta-llama/llama-4-maverick",                   name: "Llama 4 Maverick",       provider: "Meta",       shortName: "Llama 4 Maverick" },
];

export const MODELS_BY_SLUG: Record<string, CompareModel> = Object.fromEntries(
  COMPARE_MODELS.map((m) => [m.slug, m]),
);

export interface ComparePair {
  a: CompareModel;
  b: CompareModel;
  slug: string;
  category: string;
}

const PAIR_DEFS: Array<[string, string, string]> = [
  // Frontier vs Frontier
  ["gpt-5-5",           "claude-opus-4-7",    "Frontier vs Frontier"],
  ["gpt-5-5",           "gemini-3-1-pro",     "Frontier vs Frontier"],
  ["gpt-5-5",           "grok-4",             "Frontier vs Frontier"],
  ["claude-opus-4-7",   "gemini-3-1-pro",     "Frontier vs Frontier"],
  ["claude-opus-4-7",   "grok-4",             "Frontier vs Frontier"],
  ["gemini-3-1-pro",    "grok-4",             "Frontier vs Frontier"],
  ["claude-opus-4-5",   "gpt-5-4",            "Frontier vs Frontier"],
  ["claude-sonnet-4-6", "gpt-5-1",            "Frontier vs Frontier"],
  ["claude-sonnet-4-6", "gemini-3-1-pro",     "Frontier vs Frontier"],
  ["gpt-5-1",           "claude-sonnet-4-5",  "Frontier vs Frontier"],

  // Reasoning Models
  ["o1",                "o3",                 "Reasoning Models"],
  ["o3",                "o4-mini",            "Reasoning Models"],
  ["o4-mini",           "claude-sonnet-4-6",  "Reasoning Models"],
  ["o3",                "claude-opus-4-7",    "Reasoning Models"],
  ["o3",                "gpt-5-1",            "Reasoning Models"],
  ["o1",                "claude-3-7-sonnet",  "Reasoning Models"],
  ["o1",                "gpt-4o",             "Reasoning Models"],

  // Cheap & Fast
  ["gpt-4o-mini",       "claude-3-5-haiku",   "Cheap & Fast"],
  ["gpt-4o-mini",       "gemini-2-5-flash",   "Cheap & Fast"],
  ["gpt-4o-mini",       "claude-haiku-4-5",   "Cheap & Fast"],
  ["gpt-4o-mini",       "gemini-2-0-flash",   "Cheap & Fast"],
  ["claude-3-5-haiku",  "gemini-2-5-flash",   "Cheap & Fast"],
  ["claude-haiku-4-5",  "gemini-2-5-flash",   "Cheap & Fast"],
  ["claude-3-5-haiku",  "deepseek-v3",        "Cheap & Fast"],
  ["gemini-2-5-flash",  "deepseek-v3",        "Cheap & Fast"],
  ["claude-3-haiku",    "claude-3-5-haiku",   "Cheap & Fast"],

  // Open Source vs Hosted
  ["llama-3-3-70b",     "gpt-4o-mini",        "Open Source vs Hosted"],
  ["llama-3-3-70b",     "claude-3-5-haiku",   "Open Source vs Hosted"],
  ["deepseek-v3",       "gpt-4o-mini",        "Open Source vs Hosted"],
  ["deepseek-v3-2",     "gpt-4o-mini",        "Open Source vs Hosted"],
  ["llama-3-1-70b",     "llama-3-3-70b",      "Open Source vs Hosted"],
  ["mixtral-8x22b",     "llama-3-3-70b",      "Open Source vs Hosted"],
  ["qwen-2-5-72b",      "llama-3-3-70b",      "Open Source vs Hosted"],
  ["qwen-2-5-72b",      "deepseek-v3",        "Open Source vs Hosted"],

  // OpenAI Lineup
  ["gpt-5-5",           "gpt-5-1",            "OpenAI Lineup"],
  ["gpt-5-1",           "gpt-5",              "OpenAI Lineup"],
  ["gpt-5",             "gpt-4o",             "OpenAI Lineup"],
  ["gpt-4o",            "gpt-4o-mini",        "OpenAI Lineup"],
  ["gpt-4o",            "gpt-4-turbo",        "OpenAI Lineup"],

  // Anthropic Lineup
  ["claude-opus-4-7",   "claude-sonnet-4-6",  "Anthropic Lineup"],
  ["claude-sonnet-4-6", "claude-3-7-sonnet",  "Anthropic Lineup"],
  ["claude-3-7-sonnet", "claude-3-5-haiku",   "Anthropic Lineup"],
  ["claude-3-7-sonnet", "claude-haiku-4-5",   "Anthropic Lineup"],
  ["claude-haiku-4-5",  "claude-3-5-haiku",   "Anthropic Lineup"],

  // Google Lineup
  ["gemini-3-1-pro",    "gemini-2-5-pro",     "Google Lineup"],
  ["gemini-2-5-pro",    "gemini-2-5-flash",   "Google Lineup"],
  ["gemini-2-5-flash",  "gemini-2-0-flash",   "Google Lineup"],

  // Meta Lineup
  ["llama-3-1-70b",     "llama-3-1-8b",       "Meta Lineup"],

  // Specialty
  ["mistral-large",     "mixtral-8x22b",      "Specialty"],
  ["command-r-plus",    "gpt-4o",             "Specialty"],
  ["sonar",             "gpt-4o-mini",        "Specialty"],
  ["grok-4-3",          "gpt-5-1",            "Specialty"],
  ["grok-4",            "claude-sonnet-4-6",  "Specialty"],
  ["llama-4-maverick",  "gpt-4o-mini",        "Specialty"],
];

export const COMPARE_PAIRS: ComparePair[] = PAIR_DEFS
  .map(([aSlug, bSlug, category]) => {
    const a = MODELS_BY_SLUG[aSlug];
    const b = MODELS_BY_SLUG[bSlug];
    if (!a || !b) return null;
    return { a, b, slug: `${aSlug}-vs-${bSlug}`, category };
  })
  .filter((p): p is ComparePair => p !== null);

export const PAIRS_BY_SLUG: Record<string, ComparePair> = Object.fromEntries(
  COMPARE_PAIRS.map((p) => [p.slug, p]),
);

export function pairFromSlug(slug: string): ComparePair | null {
  if (PAIRS_BY_SLUG[slug]) return PAIRS_BY_SLUG[slug];
  // Allow reversed slug: foo-vs-bar matches the canonical bar-vs-foo entry
  const idx = slug.indexOf("-vs-");
  if (idx < 0) return null;
  const aSlug = slug.slice(0, idx);
  const bSlug = slug.slice(idx + 4);
  const reversed = `${bSlug}-vs-${aSlug}`;
  return PAIRS_BY_SLUG[reversed] ?? null;
}

export function pairsRelatedTo(pair: ComparePair, n = 6): ComparePair[] {
  return COMPARE_PAIRS
    .filter((p) =>
      p.slug !== pair.slug &&
      (p.a.slug === pair.a.slug || p.a.slug === pair.b.slug ||
       p.b.slug === pair.a.slug || p.b.slug === pair.b.slug),
    )
    .slice(0, n);
}

export const PAIRS_BY_CATEGORY = COMPARE_PAIRS.reduce<Record<string, ComparePair[]>>(
  (acc, p) => {
    (acc[p.category] ??= []).push(p);
    return acc;
  },
  {},
);
