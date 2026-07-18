import { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import { fetchModels, type ModelPrice, getProviderColor } from "@/lib/pricing";
import { COMPARE_PAIRS } from "@/lib/comparePairs";
import { SeoFooter } from "@/components/SeoFooter";

const HIGHLIGHTED_IDS = [
  "openai/gpt-4o-mini",
  "anthropic/claude-haiku-4.5",
  "google/gemini-2.5-flash",
  "deepseek/deepseek-v3.2",
  "meta-llama/llama-3.3-70b-instruct",
  "openai/gpt-4o",
];

const FAQS = [
  {
    q: "How much does GPT-4o mini cost?",
    a: "GPT-4o mini is priced at $0.15 per million input tokens and $0.60 per million output tokens via the OpenAI API (routed through OpenRouter). It is OpenAI's most cost-efficient hosted model and is optimised for high-volume, latency-sensitive workloads.",
  },
  {
    q: "What is the cheapest LLM API available in 2026?",
    a: "Open-source models hosted via OpenRouter — including Llama 3.1 8B, Gemini 2.0 Flash, and DeepSeek V3 — are among the cheapest options, often under $0.05 per million input tokens. For hosted frontier budget models, GPT-4o mini, Claude Haiku 4.5, and Gemini 2.5 Flash lead the pack.",
  },
  {
    q: "How does Claude Haiku 4.5 pricing compare to GPT-4o mini?",
    a: "Both sit in the budget tier of their respective providers and are comparably priced. The cheaper model for your workload depends on your input/output token ratio — use the table and the compare calculator to find out which wins for your specific usage.",
  },
  {
    q: "Why do input and output token prices differ?",
    a: "Generating (output) tokens is computationally more expensive than reading (input) tokens. Most models price output at 2–4× the input rate. For output-heavy workloads like chat or code generation, the output price dominates your bill.",
  },
  {
    q: "What is a token in LLM pricing?",
    a: "A token is roughly 0.75 English words, or approximately 4 characters. A 1,000-word document contains around 1,333 tokens. All prices in this table are quoted per million tokens ($/1M) to allow direct comparison across models.",
  },
  {
    q: "What is prompt caching and how does it affect cost?",
    a: "Prompt caching lets you reuse expensive input context across multiple calls at a reduced rate — often 80–90% cheaper than a fresh input read. Models that support it (Claude, Gemini 2.5) charge a slightly higher cache-write rate on first use, then discounted cache-read rates on subsequent calls. The 'Cache Read' column in the table above shows where it's available.",
  },
];

const CANONICAL = "https://llmmargin.com/llm-pricing";
const OG_IMAGE = "https://llmmargin.com/opengraph.jpg";
const TITLE_STR = "LLM API Pricing (July 2026): GPT-4o mini, Claude, Gemini & 200+ Models";
const DESC = "Complete LLM pricing table — GPT-4o mini, Claude Haiku 4.5, Gemini 2.5 Flash, DeepSeek V3.2, Llama, and 200+ models. Input, output, and cache prices per million tokens. Live data via OpenRouter.";

type SortCol = "name" | "input" | "output" | "ctx";

export default function LlmPricingPage() {
  const [models, setModels] = useState<ModelPrice[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortCol>("input");
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchModels().then((m) => {
      setModels(m);
      setLoaded(true);
    });
  }, []);

  const highlighted = useMemo(
    () =>
      HIGHLIGHTED_IDS.map((id) => models.find((m) => m.id === id)).filter(
        Boolean,
      ) as ModelPrice[],
    [models],
  );

  const providers = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of models) counts[m.provider] = (counts[m.provider] ?? 0) + 1;
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([p]) => p);
  }, [models]);

  const filtered = useMemo(() => {
    let list = models;
    if (providerFilter !== "all") list = list.filter((m) => m.provider === providerFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) => m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => {
      if (sortBy === "input") return (a.inputPricePerMillion - b.inputPricePerMillion) * sortDir;
      if (sortBy === "output")
        return (a.outputPricePerMillion - b.outputPricePerMillion) * sortDir;
      if (sortBy === "ctx") return (a.contextLength - b.contextLength) * sortDir;
      return a.name.localeCompare(b.name) * sortDir;
    });
  }, [models, providerFilter, search, sortBy, sortDir]);

  function toggleSort(col: SortCol) {
    if (sortBy === col) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortBy(col);
      setSortDir(1);
    }
  }

  function SortIcon({ col }: { col: SortCol }) {
    if (sortBy !== col) return <span className="opacity-25 ml-1">↕</span>;
    return <span className="ml-1">{sortDir === 1 ? "↑" : "↓"}</span>;
  }

  const TOP_PROVIDERS = providers.slice(0, 8);

  return (
    <div className="min-h-screen bg-background">
      <title>{`${TITLE_STR} | LLM Margin`}</title>
      <meta name="description" content={DESC} />
      <meta
        name="keywords"
        content="LLM pricing 2026, gpt-4o mini pricing, claude haiku 4.5 pricing, gemini 2.5 flash pricing, llama pricing, openai api cost, anthropic api cost, deepseek pricing, AI model pricing comparison"
      />
      <link rel="canonical" href={CANONICAL} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={TITLE_STR} />
      <meta property="og:description" content={DESC} />
      <meta property="og:url" content={CANONICAL} />
      <meta property="og:image" content={OG_IMAGE} />
      <meta property="og:site_name" content="LLM Margin" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={TITLE_STR} />
      <meta name="twitter:description" content={DESC} />
      <meta name="twitter:image" content={OG_IMAGE} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "LLM Margin", item: "https://llmmargin.com" },
                { "@type": "ListItem", position: 2, name: "LLM API Pricing", item: CANONICAL },
              ],
            },
            {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: FAQS.map(({ q, a }) => ({
                "@type": "Question",
                name: q,
                acceptedAnswer: { "@type": "Answer", text: a },
              })),
            },
          ]),
        }}
      />

      <div className="bg-gradient-to-b from-primary/5 to-background border-b">
        <div className="container mx-auto px-4 py-10">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">
              LLM API Pricing
            </p>
            <h1 className="text-3xl md:text-4xl font-bold mt-1 mb-3 leading-tight">
              LLM API pricing — {loaded ? models.length : "200+"} models, July 2026
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed max-w-3xl">
              Input price, output price, context window, and cache rates for every major model —
              GPT-4o mini, Claude Haiku 4.5, Gemini 2.5 Flash, DeepSeek V3.2, Llama 3.3 70B, and
              more. Prices pulled live from OpenRouter and updated on every deploy.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-8">

          {highlighted.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Most-searched models
              </h2>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                {highlighted.map((m) => {
                  const provColor = getProviderColor(m.provider);
                  const pair = COMPARE_PAIRS.find(
                    (p) => p.a.id === m.id || p.b.id === m.id,
                  );
                  return (
                    <div key={m.id} className="bg-card border rounded-xl p-4 shadow-sm">
                      <p
                        className="text-xs font-semibold uppercase tracking-wider mb-1"
                        style={{ color: provColor }}
                      >
                        {m.provider.replace("meta-llama", "Meta")}
                      </p>
                      <p className="font-semibold text-sm mb-2 leading-tight">{m.name}</p>
                      <dl className="text-xs space-y-0.5">
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Input</dt>
                          <dd className="font-mono">${m.inputPricePerMillion.toFixed(3)}/1M</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Output</dt>
                          <dd className="font-mono">${m.outputPricePerMillion.toFixed(3)}/1M</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Context</dt>
                          <dd className="font-mono">
                            {m.contextLength
                              ? `${(m.contextLength / 1000).toLocaleString()}K`
                              : "—"}
                          </dd>
                        </div>
                      </dl>
                      {pair && (
                        <Link
                          href={`/compare/${pair.slug}`}
                          className="mt-2.5 block text-xs text-primary hover:underline"
                        >
                          Compare {pair.a.shortName} vs {pair.b.shortName} →
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3 items-center">
            <input
              type="text"
              placeholder="Search models…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-input rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary w-52"
            />
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setProviderFilter("all")}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  providerFilter === "all"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                All
              </button>
              {TOP_PROVIDERS.map((p) => (
                <button
                  key={p}
                  onClick={() => setProviderFilter(p)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    providerFilter === p
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {p.replace("meta-llama", "Meta")}
                </button>
              ))}
            </div>
            {loaded && (
              <span className="text-xs text-muted-foreground ml-auto">
                {filtered.length} model{filtered.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="border rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    {(
                      [
                        { col: "name" as SortCol, label: "Model" },
                        { col: "input" as SortCol, label: "Input $/1M" },
                        { col: "output" as SortCol, label: "Output $/1M" },
                        { col: "ctx" as SortCol, label: "Context" },
                      ] as const
                    ).map(({ col, label }) => (
                      <th
                        key={col}
                        onClick={() => toggleSort(col)}
                        className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground select-none whitespace-nowrap"
                      >
                        {label}
                        <SortIcon col={col} />
                      </th>
                    ))}
                    <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                      Cache Read
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {!loaded ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        <td className="px-4 py-3">
                          <div className="h-4 bg-muted animate-pulse rounded w-40" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-4 bg-muted animate-pulse rounded w-16" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-4 bg-muted animate-pulse rounded w-16" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-4 bg-muted animate-pulse rounded w-12" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-4 bg-muted animate-pulse rounded w-10" />
                        </td>
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-10 text-center text-muted-foreground text-sm"
                      >
                        No models match your search.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((m) => {
                      const provColor = getProviderColor(m.provider);
                      return (
                        <tr key={m.id} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-medium leading-tight">{m.name}</p>
                            <p
                              className="text-xs mt-0.5"
                              style={{ color: provColor }}
                            >
                              {m.provider.replace("meta-llama", "Meta")}
                            </p>
                          </td>
                          <td className="px-4 py-3 font-mono tabular-nums">
                            ${m.inputPricePerMillion.toFixed(3)}
                          </td>
                          <td className="px-4 py-3 font-mono tabular-nums">
                            ${m.outputPricePerMillion.toFixed(3)}
                          </td>
                          <td className="px-4 py-3 font-mono tabular-nums text-xs text-muted-foreground">
                            {m.contextLength
                              ? `${(m.contextLength / 1000).toLocaleString()}K`
                              : "—"}
                          </td>
                          <td className="px-4 py-3 font-mono tabular-nums text-xs">
                            {m.cacheReadPricePerMillion != null ? (
                              `$${m.cacheReadPricePerMillion.toFixed(3)}`
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-card border rounded-xl p-5">
            <h3 className="font-semibold mb-1">Turn these prices into a margin forecast</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Plug any model's price into the Margin Simulator to see gross margin, cost per user,
              and breakeven MAU for your product — or compare two models head-to-head.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/">
                <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2">
                  Margin Simulator →
                </button>
              </Link>
              <Link href="/compare">
                <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
                  Compare two models
                </button>
              </Link>
              <Link href="/cost-per-user">
                <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
                  Cost Per User Calculator
                </button>
              </Link>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-5">LLM API pricing — frequently asked questions</h2>
            <div className="space-y-4">
              {FAQS.map(({ q, a }) => (
                <div key={q} className="bg-card border rounded-xl p-5">
                  <h3 className="font-semibold mb-2">{q}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </div>

          <SeoFooter
            paragraph="LLM token prices change frequently — OpenAI, Anthropic, and Google all adjust rates as competition intensifies. This table reflects live prices from OpenRouter and is updated on every deploy. For per-model cost forecasting, use the Margin Simulator to model gross margin at your MAU."
            links={[
              { href: "/compare", anchor: "Compare two LLM models side-by-side" },
              { href: "/cost-per-user", anchor: "LLM cost per user calculator" },
              { href: "/blog/how-to-calculate-llm-cost-per-user", anchor: "How to calculate LLM cost per user" },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
