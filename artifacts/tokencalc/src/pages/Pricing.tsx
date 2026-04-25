import { useState } from "react";
import { Link } from "wouter";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const FREE_FEATURES = [
  "Full margin, CPAU, and breakeven calculations",
  "Compare any 2 models side-by-side",
  "3-month projection preview",
  "Shareable URLs for every scenario",
  "p50 power user risk estimate",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Export to PDF (investor-ready)",
  "Export to CSV (drops into your model)",
  "Full 12-month projection",
  "Compare up to 6 models at once",
  "Full p50 / p75 / p95 / p99 power user risk",
  "Save up to 50 scenarios",
  "Unlimited tiers & features in Budget Planner",
];

const FAQS = [
  {
    q: 'What does "save scenarios" actually mean?',
    a: "A named snapshot of your inputs (MAU, pricing, model, feature mix) that you can pull up later without re-typing. Saved to your account — not to your browser — so you can access them anywhere.",
  },
  {
    q: "Does this work with non-OpenAI models?",
    a: "Yes. Anthropic (Claude 3.5, 3.7, Opus 4), Google (Gemini 1.5 / 2.0), Meta (Llama 3.1 / 3.3), Mistral, DeepSeek, and custom pricing for self-hosted or negotiated rates. We update pricing within a week of any provider change.",
  },
  {
    q: "What happens to my saved scenarios if I cancel?",
    a: "You keep read-only and export access for 30 days after your subscription ends. After that, scenarios stay in your account but become read-only until you resubscribe. We never delete your data.",
  },
  {
    q: "Are the PDF exports actually investor-ready?",
    a: "Yes — clean typography, your scenario name, the inputs you used, the model(s) compared, a margin chart, and a methodology note at the bottom so the person reading it knows what they're looking at. Founders have used these in seed and Series A decks.",
  },
  {
    q: "Will the free tier stay free forever?",
    a: "Yes. The core calculations — margin, CPAU, breakeven — will always be free. The Free tier may change at the edges (e.g., we may add things to it), but we're not going to take the calculator away from you.",
  },
];

export default function Pricing() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  const proPrice = billing === "monthly" ? 19 : 149;
  const proSuffix = billing === "monthly" ? "/mo" : "/yr";

  return (
    <div className="min-h-screen bg-background">
      <title>Pricing — Free Forever + Pro for Teams | LLM Margin</title>
      <meta name="description" content="LLM Margin is free for founders. Pro unlocks saved scenarios, team sharing, and CSV export for $19/mo. No credit card for the free tier." />
      <meta property="og:title" content="Simple pricing for founders who hate pricing pages" />
      <meta property="og:description" content="Free forever for solo founders. Pro ($19/mo) adds saved scenarios, team sharing, and CSV export when your cap table needs it." />
      <link rel="canonical" href="https://tokencalc.com/pricing" />

      <div className="bg-gradient-to-b from-primary/5 to-background border-b">
        <div className="container mx-auto px-4 py-14 text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-3 max-w-3xl mx-auto">
            Simple pricing for founders who hate pricing pages
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Free forever for solo founders. Pro ($19/mo) adds saved scenarios, team sharing, and CSV export when your cap table needs it.
          </p>

          <div className="inline-flex items-center gap-1 bg-card border rounded-full p-1 mt-8" data-testid="billing-toggle">
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                billing === "monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="button-billing-monthly"
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBilling("annual")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                billing === "annual" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="button-billing-annual"
            >
              Annual
              <span className={`text-xs px-2 py-0.5 rounded-full ${billing === "annual" ? "bg-primary-foreground/20" : "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400"}`}>
                Save $79
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Free Tier */}
          <div className="bg-card border rounded-2xl p-8 shadow-sm flex flex-col" data-testid="card-tier-free">
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-1">Free</h2>
              <p className="text-sm text-muted-foreground">Run the numbers. As many times as you want.</p>
            </div>
            <div className="mb-6">
              <span className="text-5xl font-bold">$0</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link href="/">
              <Button variant="outline" className="w-full" data-testid="button-cta-free">
                Start calculating
              </Button>
            </Link>
          </div>

          {/* Pro Tier */}
          <div className="bg-card border-2 border-primary rounded-2xl p-8 shadow-lg flex flex-col relative" data-testid="card-tier-pro">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
              Most popular
            </div>
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
                Pro
                <Sparkles className="w-4 h-4 text-primary" />
              </h2>
              <p className="text-sm text-muted-foreground">Everything you need to turn a calculation into a deliverable.</p>
            </div>
            <div className="mb-6">
              <span className="text-5xl font-bold" data-testid="value-pro-price">${proPrice}</span>
              <span className="text-muted-foreground ml-1">{proSuffix}</span>
              {billing === "annual" && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">
                  Save $79 — the equivalent of 4 months free
                </p>
              )}
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {PRO_FEATURES.map((f, i) => (
                <li key={f} className="flex items-start gap-3 text-sm">
                  {i === 0 ? (
                    <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  ) : (
                    <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  )}
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Button className="w-full" data-testid="button-cta-pro">
              Upgrade to Pro
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-3">
              Cancel anytime. No credit card required to explore the free tools.
            </p>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto mt-20">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently asked questions</h2>
          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <details key={i} className="bg-card border rounded-xl p-5 group" data-testid={`faq-${i}`}>
                <summary className="cursor-pointer font-semibold text-foreground list-none flex items-center justify-between">
                  <span>{faq.q}</span>
                  <span className="text-primary text-xl group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-20 text-center bg-gradient-to-br from-primary/10 via-primary/5 to-background border rounded-2xl p-10 max-w-3xl mx-auto">
          <h3 className="text-2xl font-bold mb-2">Like what you're seeing?</h3>
          <p className="text-muted-foreground mb-6">
            Export this scenario as a PDF, save it, and get the full 12-month view with Pro.
          </p>
          <Button size="lg" data-testid="button-cta-bottom">Upgrade to Pro</Button>
        </div>
      </div>
    </div>
  );
}
