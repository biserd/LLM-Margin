import { ArrowRight, Calculator, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { SeoFooter } from "@/components/SeoFooter";
import { ToolIcon } from "@/components/ToolIcon";
import { ACQUISITION_TOOLS } from "@/lib/acquisitionTools";

const title = "Free AI SaaS Pricing & LLM Cost Tools | LLM Margin";
const description =
  "Eight free calculators for AI SaaS pricing, credits, usage limits, fallback chains, context costs, prompt caching, feature profitability, and model price changes.";

export default function ToolsIndex() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Free AI SaaS unit economics tools",
    description,
    url: "https://llmmargin.com/tools",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: ACQUISITION_TOOLS.length,
      itemListElement: ACQUISITION_TOOLS.map((tool, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: tool.title,
        url: `https://llmmargin.com/tools/${tool.slug}`,
      })),
    },
  };

  return (
    <div className="min-h-screen bg-background">
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta
        name="keywords"
        content="AI SaaS calculator, LLM cost calculator, AI pricing calculator, prompt caching calculator, AI unit economics"
      />
      <link rel="canonical" href="https://llmmargin.com/tools" />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content="https://llmmargin.com/tools" />
      <meta property="og:image" content="https://llmmargin.com/opengraph.jpg" />
      <meta property="og:site_name" content="LLM Margin" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content="https://llmmargin.com/opengraph.jpg" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <section className="border-b bg-gradient-to-b from-primary/10 via-primary/5 to-background">
        <div className="container mx-auto px-4 py-14 md:py-20 text-center">
          <div className="mx-auto mb-4 flex w-fit items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Free calculators built for AI SaaS
          </div>
          <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight md:text-6xl">
            Find the unit-economics problem hiding behind your AI feature
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Model the expensive edge cases that average token calculators miss. Every tool uses current model pricing and produces an actionable answer—no signup required.
          </p>
        </div>
      </section>

      <main className="container mx-auto px-4 py-12">
        <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-2">
          {ACQUISITION_TOOLS.map((tool, index) => (
            <Link
              key={tool.slug}
              href={`/tools/${tool.slug}`}
              className="group relative overflow-hidden rounded-2xl border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg"
              data-testid={`link-tool-${tool.slug}`}
            >
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ToolIcon name={tool.icon} className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Tool {String(index + 1).padStart(2, "0")} · {tool.eyebrow}
                  </p>
                  <h2 className="mt-1 text-xl font-bold leading-snug">{tool.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{tool.promise}</p>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between gap-4 border-t pt-4">
                <p className="text-xs text-muted-foreground">{tool.uniqueAngle}</p>
                <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-primary">
                  Calculate <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        <section className="mx-auto mt-12 max-w-6xl rounded-2xl border bg-primary px-6 py-8 text-primary-foreground md:flex md:items-center md:justify-between md:px-10">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary-foreground/80">
              <Calculator className="h-4 w-4" /> From one answer to a living model
            </div>
            <h2 className="text-2xl font-bold">Want to monitor the full business?</h2>
            <p className="mt-2 max-w-2xl text-sm text-primary-foreground/80">
              Use the complete margin simulator to combine plan revenue, model routing, infrastructure costs, and customer usage in one scenario.
            </p>
          </div>
          <Link
            href="/"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition-opacity hover:opacity-90 md:mt-0"
          >
            Open margin simulator <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        <SeoFooter
          paragraph="LLM Margin's free tools focus on the business mechanics that determine whether an AI product scales profitably: uneven customer usage, credit redemption, retries, growing context, cache reuse, human review, and provider price risk. Results are estimates—validate them against your own production telemetry."
          links={[
            { href: "/llm-pricing", anchor: "Current LLM pricing" },
            { href: "/compare", anchor: "Model cost comparisons" },
            { href: "/budget-planner", anchor: "AI budget planner" },
          ]}
        />
      </main>
    </div>
  );
}
