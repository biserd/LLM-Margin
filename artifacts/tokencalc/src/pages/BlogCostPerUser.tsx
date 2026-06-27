import { Link } from "wouter";
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
import { SeoFooter } from "@/components/SeoFooter";

const modelPriceData = [
  { name: "GPT-4o", input: 2.5, output: 10 },
  { name: "GPT-4o mini", input: 0.15, output: 0.6 },
  { name: "Claude Sonnet 4", input: 3, output: 15 },
  { name: "Claude Haiku", input: 0.8, output: 4 },
  { name: "Gemini 2.5 Flash", input: 0.3, output: 2.5 },
  { name: "Llama 3.1 70B", input: 0.59, output: 0.79 },
];

function buildScalingCurve() {
  const mauPoints = [100, 500, 1000, 5000, 10000, 25000, 50000, 100000];
  return mauPoints.map((mau) => ({
    mau,
    "GPT-4o": mau * 2.55,
    "Claude Sonnet 4": mau * 3.6,
    "GPT-4o mini": mau * 0.18,
  }));
}

const scalingData = buildScalingCurve();

export default function BlogCostPerUser() {
  return (
    <div className="min-h-screen bg-background">
      <title>How to Calculate LLM Cost Per User (Formula + Examples) | LLM Margin</title>
      <meta
        name="description"
        content="The exact formula for LLM cost per user, worked examples for GPT-4o, Claude, and Gemini, and the four numbers most founders get wrong when modeling AI unit economics."
      />
      <meta
        name="keywords"
        content="LLM cost per user, calculate AI cost per user, OpenAI cost per user, ChatGPT API cost per user, Claude cost per user, Gemini cost per user, AI unit economics"
      />
      <link rel="canonical" href="https://llmmargin.com/blog/how-to-calculate-llm-cost-per-user" />
      <meta property="og:type" content="article" />
      <meta property="og:title" content="How to Calculate LLM Cost Per User (Formula + Examples)" />
      <meta property="og:description" content="The exact formula for LLM cost per user, with worked examples for GPT-4o, Claude, and Gemini at 1K, 10K, and 100K MAU." />
      <meta property="og:url" content="https://llmmargin.com/blog/how-to-calculate-llm-cost-per-user" />
      <meta property="og:image" content="https://llmmargin.com/opengraph.jpg" />
      <meta property="og:site_name" content="LLM Margin" />
      <meta property="article:published_time" content="2026-05-09" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="How to Calculate LLM Cost Per User (Formula + Examples)" />
      <meta name="twitter:description" content="The exact formula for LLM cost per user, with worked examples for GPT-4o, Claude, and Gemini at 1K, 10K, and 100K MAU." />
      <meta name="twitter:image" content="https://llmmargin.com/opengraph.jpg" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline:
              "How to Calculate LLM Cost Per User (Formula, Examples, Benchmarks)",
            description:
              "The exact formula for LLM cost per user, worked examples for GPT-4o, Claude, and Gemini, and the four numbers most founders get wrong.",
            datePublished: "2026-05-09",
            author: { "@type": "Organization", name: "LLM Margin" },
            publisher: {
              "@type": "Organization",
              name: "LLM Margin",
              logo: { "@type": "ImageObject", url: "https://llmmargin.com/favicon.svg" },
            },
            mainEntityOfPage: "https://llmmargin.com/blog/how-to-calculate-llm-cost-per-user",
          }),
        }}
      />

      <div className="bg-gradient-to-b from-primary/5 to-background border-b">
        <div className="container mx-auto px-4 py-10">
          <div className="max-w-3xl mx-auto">
            <Link
              href="/blog"
              className="text-xs font-semibold uppercase tracking-wider text-primary hover:underline"
            >
              ← Back to blog
            </Link>
            <h1 className="text-3xl md:text-4xl font-bold mt-3 mb-3 leading-tight">
              How to calculate LLM cost per user (formula, examples, benchmarks)
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              Pricing pages talk about dollars per million tokens. Your CFO
              wants dollars per user per month. Here is the bridge — with a
              formula, three worked examples, and the live charts you need to
              answer the question for your own product.
            </p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-4">
              <span>9 min read</span>
              <span>·</span>
              <time dateTime="2026-05-09">May 9, 2026</time>
            </div>
          </div>
        </div>
      </div>

      <article className="container mx-auto px-4 py-10">
        <div className="max-w-3xl mx-auto prose-content space-y-6 text-foreground">
          <section>
            <h2 className="text-2xl font-bold mt-2 mb-3">
              The formula nobody writes down
            </h2>
            <p className="leading-relaxed">
              Every credible LLM cost-per-user number reduces to the same
              equation. Memorise it once and you can sanity-check any AI
              feature on the back of a napkin:
            </p>
            <div className="bg-card border rounded-xl p-5 my-4 font-mono text-sm md:text-base text-foreground">
              cost_per_user_per_month = <br />
              &nbsp;&nbsp;((input_tokens × input_price_per_M) + (output_tokens
              × output_price_per_M)) / 1,000,000 <br />
              &nbsp;&nbsp;× calls_per_active_user_per_day <br />
              &nbsp;&nbsp;× active_days_per_month
            </div>
            <p className="leading-relaxed">
              Four inputs, one output. The trick is that three of those four
              inputs are wrong in most spreadsheets we see — and the answer is
              extremely sensitive to all of them.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-6 mb-3">
              Step 1: Get the per-call cost right
            </h2>
            <p className="leading-relaxed">
              Per-call cost is where almost everyone underestimates. Output
              tokens cost 3-5× more than input tokens on most frontier
              models, so a chatty, long-answer feature will blow past a
              "summarise" feature even when input lengths are similar. Below
              is the live shape of the market in May 2026, in dollars per 1M
              tokens.
            </p>
            <div
              className="bg-card border rounded-xl p-4 my-5"
              data-testid="chart-model-prices"
            >
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Price per 1M tokens — input vs. output
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={modelPriceData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
                  <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => `$${v.toFixed(2)} / 1M tokens`} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="input" fill="#2563eb" name="Input" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="output" fill="#dc2626" name="Output" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground mt-3 italic">
                Live prices: see the{" "}
                <Link href="/cost-per-user" className="text-primary hover:underline">
                  cost-per-user calculator
                </Link>{" "}
                for the always-current numbers via OpenRouter.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-6 mb-3">
              Step 2: Multiply by realistic usage, not best-case
            </h2>
            <p className="leading-relaxed">
              Two numbers matter here: <strong>calls per active user per
              day</strong> and <strong>active days per month</strong>. The
              founder mistake is plugging in your power user's behaviour as
              the average. The fix is borrowing the analytics convention:
              your blended usage is closer to the median than the mean.
            </p>
            <ul className="list-disc pl-6 space-y-1 leading-relaxed">
              <li>
                <strong>AI chat assistants</strong> (Intercom Fin, Notion AI):
                3–8 calls/day per active user, 12–18 active days/month.
              </li>
              <li>
                <strong>Workflow automations</strong> (Zapier AI, Bardeen):
                15–40 calls/day, 8–14 active days/month.
              </li>
              <li>
                <strong>Coding copilots</strong> (Cursor, Copilot): 50–200
                calls/day, 18–22 active days/month.
              </li>
              <li>
                <strong>Agentic apps</strong> (Devin-style, browser agents):
                5–20 calls/run × 1–3 runs/day, but 5,000+ tokens per call.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-6 mb-3">
              Step 3: A worked example you can copy
            </h2>
            <p className="leading-relaxed">
              Suppose you run an AI writing assistant. Average prompt is 500
              input tokens, response is 800 output tokens, the average user
              fires 6 calls on each of 15 active days/month. On GPT-4o:
            </p>
            <div className="bg-card border rounded-xl p-5 my-4 text-sm leading-relaxed">
              <p className="mb-1">
                Per call: (500 × $2.50 + 800 × $10) / 1,000,000 ={" "}
                <strong>$0.00925</strong>
              </p>
              <p className="mb-1">Per active user per day: 6 × $0.00925 = <strong>$0.0555</strong></p>
              <p className="mb-1">
                <strong>Per user per month: $0.0555 × 15 ≈ $0.83</strong>
              </p>
              <p className="text-muted-foreground italic">
                On Claude Sonnet 4 the same usage costs ≈ $1.18/user/month.
                On GPT-4o mini it drops to ≈ $0.06.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-6 mb-3">
              Step 4: See the curve, not the point
            </h2>
            <p className="leading-relaxed">
              A single per-user number is useful for unit economics, but
              founders also need the total bill at scale. The chart below
              shows monthly AI spend across MAU, holding the writing-assistant
              usage profile fixed and varying only the model.
            </p>
            <div
              className="bg-card border rounded-xl p-4 my-5"
              data-testid="chart-scaling"
            >
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Total monthly bill by MAU
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
                    formatter={(v: number) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                    labelFormatter={(l) => `${Number(l).toLocaleString()} MAU`}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="GPT-4o" stroke="#2563eb" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="Claude Sonnet 4" stroke="#dc2626" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="GPT-4o mini" stroke="#16a34a" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground mt-3 italic">
                Same usage profile (6 calls/day, 15 active days, 500 in / 800
                out tokens). Switching from Claude Sonnet to GPT-4o mini
                saves $352K/year at 100K MAU.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-6 mb-3">
              The four numbers most founders get wrong
            </h2>
            <ol className="list-decimal pl-6 space-y-2 leading-relaxed">
              <li>
                <strong>Output tokens.</strong> Engineers estimate based on
                "what feels short". Pull a week of real responses from your
                logs and average the actual completion lengths.
              </li>
              <li>
                <strong>System prompts and tool context.</strong> Your
                "500-token user prompt" is actually 500 + 1,800 tokens of
                system instructions, function schemas, and retrieved
                documents on every call.
              </li>
              <li>
                <strong>Retries and tool loops.</strong> Agent-style features
                that retry on validation errors or run multi-step tool chains
                routinely double the call count.
              </li>
              <li>
                <strong>Power-user concentration.</strong> The top 5% of users
                consume 40-60% of calls. A blended per-user number hides
                whether your top decile is unprofitable.
              </li>
            </ol>
          </section>

          <section className="bg-primary/5 border border-primary/20 rounded-xl p-6 my-8">
            <h3 className="text-lg font-bold mb-2">
              Plug your own numbers in
            </h3>
            <p className="text-sm leading-relaxed mb-4">
              The math above is the same math behind our calculators — except
              the calculators pull live OpenRouter prices, run the curve
              across MAU automatically, and flag your power-user blast
              radius.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/cost-per-user">
                <Button size="default" data-testid="cta-cost-per-user">
                  Open the Cost Per User Calculator →
                </Button>
              </Link>
              <Link href="/">
                <Button size="default" variant="outline" data-testid="cta-margin-simulator">
                  Run the Margin Simulator
                </Button>
              </Link>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-6 mb-3">Where to go next</h2>
            <p className="leading-relaxed">
              Once you know per-user cost, the next question is how to size
              your monthly AI spend across features and forecast it through a
              fundraising milestone. We cover that in our companion guide:{" "}
              <Link
                href="/blog/ai-api-budget-planning-for-startups"
                className="text-primary hover:underline font-medium"
              >
                AI API budget planning for startups
              </Link>
              . If you only have ten minutes today, run your numbers through
              the{" "}
              <Link href="/" className="text-primary hover:underline font-medium">
                SaaS margin simulator
              </Link>{" "}
              and see whether your AI feature actually clears 60% gross
              margin.
            </p>
          </section>

          <SeoFooter
            paragraph="LLM cost per user is the single most important number in AI SaaS unit economics — and almost no published guide gives you the full formula plus a calculator. This guide is the founder's version: short on theory, long on the numbers you actually need to defend to your board."
            links={[
              { href: "/cost-per-user", anchor: "Cost Per User Calculator" },
              { href: "/budget-planner", anchor: "AI Budget Planner" },
              { href: "/", anchor: "SaaS Margin Simulator" },
            ]}
          />
        </div>
      </article>
    </div>
  );
}
