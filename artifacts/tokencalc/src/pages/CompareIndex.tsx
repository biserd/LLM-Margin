import { Link } from "wouter";
import { COMPARE_PAIRS, PAIRS_BY_CATEGORY } from "@/lib/comparePairs";
import { SeoFooter } from "@/components/SeoFooter";

export default function CompareIndex() {
  const categories = Object.keys(PAIRS_BY_CATEGORY);
  const totalPairs = COMPARE_PAIRS.length;

  return (
    <div className="min-h-screen bg-background">
      <title>Compare LLM Pricing: GPT-4o, Claude, Gemini, Llama Side-by-Side | LLM Margin</title>
      <meta
        name="description"
        content={`Side-by-side token pricing and total cost comparisons across ${totalPairs} popular LLM matchups — GPT-4o, Claude 3.5 Sonnet, Gemini, Llama, DeepSeek, and more. Live prices via OpenRouter.`}
      />
      <meta
        name="keywords"
        content="LLM price comparison, GPT vs Claude, Claude vs Gemini, OpenAI pricing comparison, AI model cost comparison, LLM token cost comparison"
      />
      <link rel="canonical" href="https://llmmargin.com/compare" />
      <meta property="og:type" content="website" />
      <meta property="og:title" content="Compare LLM Pricing — Side-by-Side Token Costs" />
      <meta property="og:description" content="Pick any two models. See input, output, and total monthly cost compared at your usage level." />
      <meta property="og:url" content="https://llmmargin.com/compare" />
      <meta property="og:image" content="https://llmmargin.com/opengraph.jpg" />
      <meta property="og:site_name" content="LLM Margin" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Compare LLM Pricing — Side-by-Side Token Costs" />
      <meta name="twitter:description" content="Pick any two models. See input, output, and total monthly cost compared at your usage level." />
      <meta name="twitter:image" content="https://llmmargin.com/opengraph.jpg" />

      <div className="bg-gradient-to-b from-primary/5 to-background border-b">
        <div className="container mx-auto px-4 py-12">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">
            LLM Comparison Hub
          </p>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Compare LLM pricing, side by side
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Pick a matchup. We show you input vs output token prices, total
            monthly cost at any MAU, and which model wins for your usage
            profile. Live prices via OpenRouter.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10">
        <div className="max-w-4xl mx-auto space-y-10">
          {categories.map((cat) => (
            <section key={cat} data-testid={`section-${cat.replace(/\s+/g, "-").toLowerCase()}`}>
              <h2 className="text-xl font-bold mb-4">{cat}</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {PAIRS_BY_CATEGORY[cat].map((pair) => (
                  <Link
                    key={pair.slug}
                    href={`/compare/${pair.slug}`}
                    className="block bg-card border rounded-lg p-4 hover:border-primary/40 hover:shadow-sm transition-all group"
                    data-testid={`link-pair-${pair.slug}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <span className="truncate">{pair.a.shortName}</span>
                          <span className="text-muted-foreground text-xs">vs</span>
                          <span className="truncate">{pair.b.shortName}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {pair.a.provider} · {pair.b.provider}
                        </p>
                      </div>
                      <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity text-sm">
                        →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}

          <SeoFooter
            paragraph="LLM pricing changes monthly and the differences across providers run 100×. These comparisons are kept fresh against live OpenRouter prices and are designed to answer one question: for my usage profile, which model is actually cheaper?"
            links={[
              { href: "/cost-per-user", anchor: "Cost Per User Calculator" },
              { href: "/", anchor: "SaaS Margin Simulator" },
              { href: "/budget-planner", anchor: "AI Budget Planner" },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
