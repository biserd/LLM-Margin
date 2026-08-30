import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Link, useRoute } from "wouter";
import { ModelDropdown } from "@/components/ModelDropdown";
import { SeoFooter } from "@/components/SeoFooter";
import { ToolIcon } from "@/components/ToolIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import NotFound from "@/pages/not-found";
import {
  ACQUISITION_TOOLS,
  calculateAcquisitionTool,
  defaultValuesForTool,
  getAcquisitionTool,
  type AcquisitionToolDefinition,
  type MetricTone,
} from "@/lib/acquisitionTools";
import { fetchModels, pickLatestModel, type ModelPrice } from "@/lib/pricing";

const metricToneClasses: Record<MetricTone, string> = {
  default: "border-border bg-card",
  positive: "border-emerald-500/30 bg-emerald-500/5",
  warning: "border-amber-500/30 bg-amber-500/5",
  danger: "border-red-500/30 bg-red-500/5",
};

function queryValues(tool: AcquisitionToolDefinition): Record<string, number> {
  const defaults = defaultValuesForTool(tool);
  if (typeof window === "undefined") return defaults;
  const params = new URLSearchParams(window.location.search);
  for (const field of tool.fields) {
    const raw = params.get(field.key);
    if (raw === null) continue;
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) defaults[field.key] = parsed;
  }
  return defaults;
}

function scoreColor(score: number): string {
  if (score >= 70) return "bg-emerald-500";
  if (score >= 45) return "bg-amber-500";
  return "bg-red-500";
}

export default function AcquisitionToolPage() {
  const [, params] = useRoute<{ slug: string }>("/tools/:slug");
  const requestedTool = getAcquisitionTool(params?.slug);
  const tool = requestedTool ?? ACQUISITION_TOOLS[0];
  const [values, setValues] = useState<Record<string, number>>(() => queryValues(tool));
  const [primaryModel, setPrimaryModel] = useState<ModelPrice | null>(null);
  const [secondaryModel, setSecondaryModel] = useState<ModelPrice | null>(null);
  const [modelError, setModelError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setValues(queryValues(tool));
    setCopied(false);
  }, [tool.slug]);

  useEffect(() => {
    let cancelled = false;
    async function loadModels() {
      try {
        const models = await fetchModels();
        if (cancelled) return;
        const query = typeof window === "undefined" ? null : new URLSearchParams(window.location.search);
        const requestedPrimary = query?.get("model");
        const requestedSecondary = query?.get("secondaryModel");
        const primary = models.find((model) => model.id === requestedPrimary) ?? pickLatestModel(models) ?? null;
        const alternative = models.find((model) => model.id === requestedSecondary)
          ?? models.find((model) => model.id !== primary?.id)
          ?? primary;
        setPrimaryModel(primary);
        setSecondaryModel(alternative);
      } catch {
        if (!cancelled) setModelError("Model pricing could not be loaded. Refresh to try again.");
      }
    }
    void loadModels();
    return () => {
      cancelled = true;
    };
  }, []);

  const result = useMemo(() => {
    if (!primaryModel) return null;
    return calculateAcquisitionTool(tool.slug, values, primaryModel, secondaryModel ?? undefined);
  }, [primaryModel, secondaryModel, tool.slug, values]);

  if (!requestedTool) return <NotFound />;

  const canonical = `https://llmmargin.com/tools/${tool.slug}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: tool.title,
        description: tool.description,
        url: canonical,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Any",
        offers: { "@type": "Offer", price: 0, priceCurrency: "USD" },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://llmmargin.com/" },
          { "@type": "ListItem", position: 2, name: "Tools", item: "https://llmmargin.com/tools" },
          { "@type": "ListItem", position: 3, name: tool.title, item: canonical },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: tool.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      },
    ],
  };

  function updateValue(key: string, raw: string) {
    const parsed = Number(raw);
    setValues((current) => ({ ...current, [key]: Number.isFinite(parsed) ? parsed : 0 }));
  }

  function reset() {
    setValues(defaultValuesForTool(tool));
    setCopied(false);
  }

  async function copyShareLink() {
    const url = new URL(canonical);
    Object.entries(values).forEach(([key, value]) => url.searchParams.set(key, String(value)));
    if (primaryModel) url.searchParams.set("model", primaryModel.id);
    if (secondaryModel && tool.usesSecondaryModel) url.searchParams.set("secondaryModel", secondaryModel.id);
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.history.replaceState({}, "", `${url.pathname}${url.search}`);
      setCopied(true);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <title>{`${tool.seoTitle} | LLM Margin`}</title>
      <meta name="description" content={tool.description} />
      <meta name="keywords" content={`${tool.shortTitle}, LLM cost calculator, AI SaaS pricing, AI unit economics`} />
      <link rel="canonical" href={canonical} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={`${tool.seoTitle} | LLM Margin`} />
      <meta property="og:description" content={tool.description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content="https://llmmargin.com/opengraph.jpg" />
      <meta property="og:site_name" content="LLM Margin" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={`${tool.seoTitle} | LLM Margin`} />
      <meta name="twitter:description" content={tool.description} />
      <meta name="twitter:image" content="https://llmmargin.com/opengraph.jpg" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <header className="border-b bg-gradient-to-b from-primary/10 to-background">
        <div className="container mx-auto max-w-6xl px-4 py-10 md:py-14">
          <Link href="/tools" className="mb-7 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> All free tools
          </Link>
          <div className="flex max-w-4xl items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <ToolIcon name={tool.icon} className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">{tool.eyebrow}</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight md:text-5xl">{tool.title}</h1>
              <p className="mt-4 max-w-3xl text-lg leading-relaxed text-muted-foreground">{tool.description}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-10">
        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
          <section className="rounded-2xl border bg-card p-5 shadow-sm md:p-7" aria-labelledby="calculator-inputs">
            <div className="mb-6">
              <h2 id="calculator-inputs" className="text-xl font-bold">Your scenario</h2>
              <p className="mt-1 text-sm text-muted-foreground">Adjust the assumptions. Results update instantly.</p>
            </div>

            <div className={`grid gap-5 ${tool.usesSecondaryModel ? "md:grid-cols-2" : ""}`}>
              <div>
                <label className="mb-2 block text-sm font-semibold">{tool.usesSecondaryModel ? "Primary model" : "Model"}</label>
                <ModelDropdown value={primaryModel?.id ?? ""} onChange={setPrimaryModel} />
              </div>
              {tool.usesSecondaryModel && (
                <div>
                  <label className="mb-2 block text-sm font-semibold">Alternative / fallback model</label>
                  <ModelDropdown value={secondaryModel?.id ?? ""} onChange={setSecondaryModel} />
                </div>
              )}
            </div>
            {modelError && <p className="mt-2 text-sm text-red-600">{modelError}</p>}

            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              {tool.fields.map((field) => (
                <div key={field.key}>
                  <label htmlFor={field.key} className="mb-1.5 block text-sm font-semibold">{field.label}</label>
                  <div className="relative">
                    {field.prefix && (
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">{field.prefix}</span>
                    )}
                    <Input
                      id={field.key}
                      type="number"
                      value={values[field.key] ?? 0}
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      onChange={(event) => updateValue(field.key, event.target.value)}
                      className={`${field.prefix ? "pl-7" : ""} ${field.suffix ? "pr-16" : ""}`}
                      data-testid={`input-${field.key}`}
                    />
                    {field.suffix && (
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">{field.suffix}</span>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{field.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-7 flex flex-wrap gap-3 border-t pt-5">
              <Button variant="outline" onClick={reset} className="gap-2" data-testid="button-reset-tool">
                <RotateCcw className="h-4 w-4" /> Reset
              </Button>
              <Button variant="outline" onClick={() => void copyShareLink()} className="gap-2" data-testid="button-share-tool">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Link copied" : "Copy share link"}
              </Button>
            </div>
          </section>

          <aside className="lg:sticky lg:top-20" aria-live="polite">
            <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
              {!result ? (
                <div className="flex min-h-80 items-center justify-center p-8 text-center text-sm text-muted-foreground">
                  Loading current model pricing…
                </div>
              ) : (
                <>
                  <div className="border-b bg-muted/30 p-6">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{result.scoreLabel}</p>
                        <p className="mt-1 text-5xl font-bold tabular-nums">{result.score}<span className="text-xl text-muted-foreground">/100</span></p>
                      </div>
                      <Sparkles className="h-7 w-7 text-primary" />
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                      <div className={`h-full rounded-full transition-all ${scoreColor(result.score)}`} style={{ width: `${result.score}%` }} />
                    </div>
                    <h2 className="mt-5 text-xl font-bold leading-snug">{result.verdict}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{result.explanation}</p>
                  </div>

                  <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    {result.metrics.map((metric) => (
                      <div key={metric.label} className={`rounded-xl border p-4 ${metricToneClasses[metric.tone ?? "default"]}`}>
                        <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
                        <p className="mt-1 text-2xl font-bold tabular-nums">{metric.value}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{metric.note}</p>
                      </div>
                    ))}
                  </div>

                  <div className="border-t p-5">
                    <h3 className="text-sm font-bold">Recommended next moves</h3>
                    <ul className="mt-3 space-y-3">
                      {result.actions.map((action) => (
                        <li key={action} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>

            <div className="mt-4 rounded-2xl bg-primary p-5 text-primary-foreground">
              <p className="text-sm font-semibold">Turn this snapshot into an operating model</p>
              <p className="mt-1 text-xs leading-relaxed text-primary-foreground/80">Save scenarios, monitor assumptions, and model your complete AI SaaS margin.</p>
              <Link href="/pricing" className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold hover:underline">
                See LLM Margin plans <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </aside>
        </div>

        <section className="mx-auto mt-16 max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Methodology</p>
          <h2 className="mt-2 text-3xl font-bold">How this calculator works</h2>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {tool.howItWorks.map((step, index) => (
              <div key={step} className="rounded-xl border bg-card p-5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{index + 1}</span>
                <p className="mt-4 text-sm leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-2xl border-l-4 border-l-primary bg-muted/40 p-6">
            <h3 className="font-bold">What makes this useful</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{tool.uniqueAngle}</p>
          </div>
        </section>

        <section className="mx-auto mt-16 max-w-4xl">
          <h2 className="text-3xl font-bold">Frequently asked questions</h2>
          <div className="mt-6 divide-y rounded-2xl border bg-card px-5 md:px-7">
            {tool.faqs.map((faq) => (
              <details key={faq.question} className="group py-5">
                <summary className="cursor-pointer list-none pr-8 font-semibold marker:hidden">{faq.question}</summary>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-16 max-w-5xl">
          <h2 className="text-2xl font-bold">Continue your analysis</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {tool.related.map((slug) => {
              const related = getAcquisitionTool(slug);
              if (!related) return null;
              return (
                <Link key={related.slug} href={`/tools/${related.slug}`} className="group rounded-xl border bg-card p-5 hover:border-primary/50">
                  <ToolIcon name={related.icon} className="h-5 w-5 text-primary" />
                  <h3 className="mt-3 font-bold">{related.shortTitle}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{related.promise}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary">Open tool <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></span>
                </Link>
              );
            })}
          </div>
        </section>

        <SeoFooter
          paragraph={`${tool.title} uses current model prices and your operating assumptions to estimate business impact. Treat the output as a planning model, then replace defaults with p50, p95, and p99 telemetry from your own product.`}
          links={[
            { href: "/tools", anchor: "All AI SaaS tools" },
            { href: "/llm-pricing", anchor: "LLM pricing database" },
            { href: "/", anchor: "Full margin simulator" },
          ]}
        />
      </main>
    </div>
  );
}
