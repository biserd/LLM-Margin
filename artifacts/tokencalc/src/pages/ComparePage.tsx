import { useEffect, useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { fetchModels, type ModelPrice } from "@/lib/pricing";
import { calcCallCost, formatUSD } from "@/lib/calculator";
import {
  pairFromSlug,
  pairsRelatedTo,
  type ComparePair,
} from "@/lib/comparePairs";
import { SeoFooter } from "@/components/SeoFooter";
import NotFound from "@/pages/not-found";

const FALLBACK_PRICE: Pick<ModelPrice, "inputPricePerMillion" | "outputPricePerMillion" | "contextLength"> = {
  inputPricePerMillion: 0,
  outputPricePerMillion: 0,
  contextLength: 0,
};

function priceFor(models: ModelPrice[], id: string): ModelPrice | null {
  return models.find((m) => m.id === id) ?? null;
}

function verdict(a: { in: number; out: number; name: string }, b: { in: number; out: number; name: string }): string {
  if (a.in === b.in && a.out === b.out) {
    return `${a.name} and ${b.name} are priced identically per token — pick on quality, latency, or context window instead.`;
  }
  const aHeavyOut = a.in + a.out * 4;
  const bHeavyOut = b.in + b.out * 4;
  const aHeavyIn = a.in * 4 + a.out;
  const bHeavyIn = b.in * 4 + b.out;
  const aWinsOut = aHeavyOut < bHeavyOut;
  const bWinsOut = bHeavyOut < aHeavyOut;
  const aWinsIn = aHeavyIn < bHeavyIn;
  const bWinsIn = bHeavyIn < aHeavyIn;
  if (aWinsOut && aWinsIn) return `${a.name} is cheaper across the board for typical workloads.`;
  if (bWinsOut && bWinsIn) return `${b.name} is cheaper across the board for typical workloads.`;
  const cheaperOut = aWinsOut ? a.name : bWinsOut ? b.name : null;
  const cheaperIn = aWinsIn ? a.name : bWinsIn ? b.name : null;
  if (!cheaperOut || !cheaperIn) {
    return `${a.name} and ${b.name} land in roughly the same price band — your usage profile won't materially change the answer.`;
  }
  return `${cheaperOut} wins for output-heavy work (chat, generation). ${cheaperIn} wins for input-heavy work (RAG, summarisation, classification).`;
}

interface PairViewProps {
  pair: ComparePair;
}

function PairView({ pair }: PairViewProps) {
  const [models, setModels] = useState<ModelPrice[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [inTokens, setInTokens] = useState(500);
  const [outTokens, setOutTokens] = useState(500);
  const [callsPerDay, setCallsPerDay] = useState(5);
  const [activeDays, setActiveDays] = useState(20);
  const [mau, setMau] = useState(1000);

  useEffect(() => {
    fetchModels().then((m) => {
      setModels(m);
      setLoaded(true);
    });
  }, []);

  const modelA = priceFor(models, pair.a.id);
  const modelB = priceFor(models, pair.b.id);

  const a = {
    name: pair.a.shortName,
    in: modelA?.inputPricePerMillion ?? FALLBACK_PRICE.inputPricePerMillion,
    out: modelA?.outputPricePerMillion ?? FALLBACK_PRICE.outputPricePerMillion,
    ctx: modelA?.contextLength ?? FALLBACK_PRICE.contextLength,
  };
  const b = {
    name: pair.b.shortName,
    in: modelB?.inputPricePerMillion ?? FALLBACK_PRICE.inputPricePerMillion,
    out: modelB?.outputPricePerMillion ?? FALLBACK_PRICE.outputPricePerMillion,
    ctx: modelB?.contextLength ?? FALLBACK_PRICE.contextLength,
  };

  const callCostA = modelA ? calcCallCost(inTokens, outTokens, modelA) : 0;
  const callCostB = modelB ? calcCallCost(inTokens, outTokens, modelB) : 0;
  const cpauA = callCostA * callsPerDay * activeDays;
  const cpauB = callCostB * callsPerDay * activeDays;
  const monthlyA = cpauA * mau;
  const monthlyB = cpauB * mau;

  const priceChartData = [
    { metric: "Input ($/1M)", [a.name]: a.in, [b.name]: b.in },
    { metric: "Output ($/1M)", [a.name]: a.out, [b.name]: b.out },
  ];

  const scalingData = useMemo(() => {
    const points = [100, 500, 1000, 5000, 10000, 50000, 100000];
    return points.map((users) => ({
      mau: users,
      [a.name]: cpauA * users,
      [b.name]: cpauB * users,
    }));
  }, [a.name, b.name, cpauA, cpauB]);

  const verdictText = verdict(
    { in: a.in, out: a.out, name: a.name },
    { in: b.in, out: b.out, name: b.name },
  );

  const winnerCheaper =
    cpauA === cpauB
      ? null
      : cpauA < cpauB
      ? { name: a.name, saved: cpauB - cpauA, savedAtMau: (cpauB - cpauA) * mau }
      : { name: b.name, saved: cpauA - cpauB, savedAtMau: (cpauA - cpauB) * mau };

  const related = pairsRelatedTo(pair);

  const titleStr = `${a.name} vs ${b.name}: Token Pricing & Cost Compared (2026)`;
  const descStr = `Side-by-side ${a.name} vs ${b.name} pricing — input, output, total monthly cost at any MAU. Live OpenRouter prices for ${pair.a.provider} and ${pair.b.provider}.`;
  const keywordsStr = `${a.name} vs ${b.name}, ${a.name} pricing, ${b.name} pricing, ${a.name} cost, ${b.name} cost, ${pair.a.provider} vs ${pair.b.provider}, LLM price comparison`;
  const canonical = `https://tokencalc.com/compare/${pair.slug}`;

  return (
    <div className="min-h-screen bg-background">
      <title>{`${titleStr} | LLM Margin`}</title>
      <meta name="description" content={descStr} />
      <meta name="keywords" content={keywordsStr} />
      <link rel="canonical" href={canonical} />
      <meta property="og:type" content="article" />
      <meta property="og:title" content={titleStr} />
      <meta property="og:description" content={descStr} />
      <meta property="og:url" content={canonical} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: titleStr,
            description: descStr,
            datePublished: "2026-05-09",
            dateModified: "2026-05-09",
            author: { "@type": "Organization", name: "LLM Margin" },
            publisher: {
              "@type": "Organization",
              name: "LLM Margin",
              logo: { "@type": "ImageObject", url: "https://tokencalc.com/favicon.svg" },
            },
            mainEntityOfPage: canonical,
            about: [
              { "@type": "Product", name: a.name, brand: pair.a.provider },
              { "@type": "Product", name: b.name, brand: pair.b.provider },
            ],
          }),
        }}
      />

      <div className="bg-gradient-to-b from-primary/5 to-background border-b">
        <div className="container mx-auto px-4 py-10">
          <div className="max-w-4xl mx-auto">
            <Link
              href="/compare"
              className="text-xs font-semibold uppercase tracking-wider text-primary hover:underline"
            >
              ← All comparisons
            </Link>
            <h1 className="text-3xl md:text-4xl font-bold mt-3 mb-3 leading-tight">
              {a.name} vs {b.name}: token pricing &amp; cost compared
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed max-w-3xl">
              How {a.name} ({pair.a.provider}) and {b.name} ({pair.b.provider})
              actually compare on price — input, output, and total monthly cost
              at the MAU you care about. Updated against live OpenRouter
              pricing.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Headline price table */}
          <div className="grid md:grid-cols-2 gap-4" data-testid="card-price-summary">
            {[a, b].map((m, i) => (
              <div
                key={m.name}
                className="bg-card border rounded-xl p-5 shadow-sm"
                data-testid={`card-model-${i === 0 ? "a" : "b"}`}
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  {i === 0 ? pair.a.provider : pair.b.provider}
                </p>
                <h2 className="text-xl font-bold mb-3">{m.name}</h2>
                <dl className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Input</dt>
                    <dd className="font-mono">${m.in.toFixed(2)} / 1M tokens</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Output</dt>
                    <dd className="font-mono">${m.out.toFixed(2)} / 1M tokens</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Output / Input ratio</dt>
                    <dd className="font-mono">
                      {m.in > 0 ? `${(m.out / m.in).toFixed(1)}×` : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Context window</dt>
                    <dd className="font-mono">
                      {m.ctx ? `${(m.ctx / 1000).toLocaleString()}K` : "—"}
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>

          {/* Verdict */}
          <div
            className="bg-primary/5 border border-primary/20 rounded-xl p-5"
            data-testid="card-verdict"
          >
            <h3 className="text-sm font-semibold uppercase tracking-wider text-primary mb-2">
              The short answer
            </h3>
            <p className="text-base leading-relaxed">{verdictText}</p>
          </div>

          {/* Price chart */}
          <div className="bg-card border rounded-xl p-5 shadow-sm" data-testid="chart-prices">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Token pricing side-by-side
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={priceChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="metric" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `$${v.toFixed(3)} / 1M tokens`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey={a.name} fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey={b.name} fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Cost calculator */}
          <div className="bg-card border rounded-xl p-5 shadow-sm" data-testid="card-calculator">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Cost at your usage
            </h3>
            <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-3">
                <div>
                  <label htmlFor="cmp-in-tokens" className="text-sm font-medium block mb-1">
                    Avg input tokens / call
                  </label>
                  <input
                    id="cmp-in-tokens"
                    type="number"
                    min={0}
                    value={inTokens}
                    onChange={(e) => setInTokens(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    data-testid="input-in-tokens"
                  />
                </div>
                <div>
                  <label htmlFor="cmp-out-tokens" className="text-sm font-medium block mb-1">
                    Avg output tokens / call
                  </label>
                  <input
                    id="cmp-out-tokens"
                    type="number"
                    min={0}
                    value={outTokens}
                    onChange={(e) => setOutTokens(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    data-testid="input-out-tokens"
                  />
                </div>
                <div>
                  <label htmlFor="cmp-calls" className="text-sm font-medium block mb-1">
                    Calls per active user / day: {callsPerDay}
                  </label>
                  <input
                    id="cmp-calls"
                    type="range"
                    min={0.1}
                    max={50}
                    step={0.1}
                    value={callsPerDay}
                    onChange={(e) => setCallsPerDay(parseFloat(e.target.value))}
                    className="w-full accent-primary"
                    data-testid="slider-calls"
                  />
                </div>
                <div>
                  <label htmlFor="cmp-days" className="text-sm font-medium block mb-1">
                    Active days / month: {activeDays}
                  </label>
                  <input
                    id="cmp-days"
                    type="range"
                    min={1}
                    max={31}
                    value={activeDays}
                    onChange={(e) => setActiveDays(parseInt(e.target.value))}
                    className="w-full accent-primary"
                    data-testid="slider-days"
                  />
                </div>
                <div>
                  <label htmlFor="cmp-mau" className="text-sm font-medium block mb-1">
                    MAU: {mau.toLocaleString()}
                  </label>
                  <input
                    id="cmp-mau"
                    type="range"
                    min={10}
                    max={100000}
                    step={10}
                    value={mau}
                    onChange={(e) => setMau(parseInt(e.target.value))}
                    className="w-full accent-primary"
                    data-testid="slider-mau"
                  />
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { name: a.name, callCost: callCostA, cpau: cpauA, monthly: monthlyA, color: "#2563eb" },
                  { name: b.name, callCost: callCostB, cpau: cpauB, monthly: monthlyB, color: "#dc2626" },
                ].map((row) => (
                  <div
                    key={row.name}
                    className="border rounded-lg p-3"
                    style={{ borderColor: row.color + "33" }}
                    data-testid={`result-${row.name.replace(/\s+/g, "-").toLowerCase()}`}
                  >
                    <p className="text-sm font-semibold mb-2" style={{ color: row.color }}>
                      {row.name}
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Per call</p>
                        <p className="font-mono font-medium">{formatUSD(row.callCost, 5)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Per user / mo</p>
                        <p className="font-mono font-medium">{formatUSD(row.cpau, 4)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total / mo</p>
                        <p className="font-mono font-medium">{formatUSD(row.monthly, 0)}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {winnerCheaper && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm">
                    <strong>{winnerCheaper.name}</strong> is cheaper by{" "}
                    <strong>{formatUSD(winnerCheaper.saved, 4)}/user/month</strong> —{" "}
                    a saving of <strong>{formatUSD(winnerCheaper.savedAtMau, 0)}/month</strong>{" "}
                    at {mau.toLocaleString()} MAU.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Scaling chart */}
          <div className="bg-card border rounded-xl p-5 shadow-sm" data-testid="chart-scaling">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Total monthly bill across MAU
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={scalingData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="mau"
                  tickFormatter={(v) => (v >= 1000 ? `${v / 1000}K` : v)}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  tickFormatter={(v) =>
                    v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`
                  }
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(v: number) => formatUSD(v, 0)}
                  labelFormatter={(l) => `${Number(l).toLocaleString()} MAU`}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey={a.name} stroke="#2563eb" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey={b.name} stroke="#dc2626" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground mt-3">
              Same usage profile applied to both models; only the per-token
              price differs.
            </p>
          </div>

          {/* CTAs */}
          <div className="bg-card border rounded-xl p-6">
            <h3 className="text-lg font-bold mb-2">Run this against your real numbers</h3>
            <p className="text-sm text-muted-foreground mb-4">
              The mini-calculator above is a preview. Use the full tools to
              model power-user blast radius, gross margin, and 12-month spend
              forecasts.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/cost-per-user">
                <Button data-testid="cta-cost-per-user">Cost Per User Calculator →</Button>
              </Link>
              <Link href="/">
                <Button variant="outline" data-testid="cta-margin-simulator">
                  Margin Simulator
                </Button>
              </Link>
              <Link href="/budget-planner">
                <Button variant="outline" data-testid="cta-budget-planner">
                  Budget Planner
                </Button>
              </Link>
            </div>
          </div>

          {/* Related comparisons */}
          {related.length > 0 && (
            <div data-testid="card-related">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Other comparisons
              </h3>
              <div className="grid sm:grid-cols-2 gap-2">
                {related.map((r) => (
                  <Link
                    key={r.slug}
                    href={`/compare/${r.slug}`}
                    className="block bg-card border rounded-lg p-3 hover:border-primary/40 transition-colors text-sm"
                    data-testid={`related-${r.slug}`}
                  >
                    <span className="font-medium">{r.a.shortName}</span>
                    <span className="text-muted-foreground"> vs </span>
                    <span className="font-medium">{r.b.shortName}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <SeoFooter
            paragraph={`Comparing ${a.name} vs ${b.name} on price alone never tells the whole story — output-token weighting, context length, and your usage profile change the answer dramatically. Use the calculators below for the full picture.`}
            links={[
              { href: "/compare", anchor: "All comparisons" },
              { href: "/cost-per-user", anchor: "Cost Per User Calculator" },
              { href: "/blog/how-to-calculate-llm-cost-per-user", anchor: "How to calculate LLM cost per user" },
            ]}
          />

          {!loaded && (
            <p className="text-xs text-muted-foreground text-center">
              Loading live prices…
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ComparePage() {
  const [, params] = useRoute("/compare/:slug");
  const slug = params?.slug;
  const pair = slug ? pairFromSlug(slug) : null;
  if (!pair) return <NotFound />;
  return <PairView pair={pair} />;
}
