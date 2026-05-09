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

const allocationData = [
  { stage: "Pre-launch", core: 200, ops: 150, experiments: 400, buffer: 250 },
  { stage: "Beta (200 MAU)", core: 600, ops: 300, experiments: 500, buffer: 600 },
  { stage: "Launch (1K MAU)", core: 1800, ops: 500, experiments: 700, buffer: 1000 },
  { stage: "Growth (10K MAU)", core: 12000, ops: 1500, experiments: 1500, buffer: 4000 },
  { stage: "Scale (50K MAU)", core: 48000, ops: 4000, experiments: 3000, buffer: 12000 },
];

const scenarioData = Array.from({ length: 12 }, (_, i) => {
  const month = i + 1;
  const baseGrowth = 1.18;
  const expected = 800 * Math.pow(baseGrowth, i);
  return {
    month: `M${month}`,
    Best: Math.round(expected * 0.7),
    Expected: Math.round(expected),
    Worst: Math.round(expected * 1.6 + month * 200),
  };
});

export default function BlogBudgetPlanning() {
  return (
    <div className="min-h-screen bg-background">
      <title>AI API Budget Planning for Startups: A Practical Framework | LLM Margin</title>
      <meta
        name="description"
        content="How to size, allocate, and stress-test your OpenAI, Anthropic, and Gemini budgets across 12 months — with three scenarios every founder should model before raising."
      />
      <meta
        name="keywords"
        content="AI API budget, OpenAI budget for startups, AI cost forecast, LLM budget planning, AI startup spend, GPT-4 budget, Claude budget"
      />
      <link
        rel="canonical"
        href="https://tokencalc.com/blog/ai-api-budget-planning-for-startups"
      />
      <meta property="og:type" content="article" />
      <meta
        property="og:title"
        content="AI API Budget Planning for Startups: A Practical 12-Month Framework"
      />
      <meta
        property="og:description"
        content="The framework for sizing your OpenAI, Anthropic, and Gemini budgets through your next fundraising milestone."
      />
      <meta property="article:published_time" content="2026-05-09" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline:
              "AI API Budget Planning for Startups: A Practical 12-Month Framework",
            description:
              "How early-stage startups should size, allocate, and stress-test their LLM API budgets across 12 months.",
            datePublished: "2026-05-09",
            author: { "@type": "Organization", name: "LLM Margin" },
            publisher: {
              "@type": "Organization",
              name: "LLM Margin",
              logo: { "@type": "ImageObject", url: "https://tokencalc.com/favicon.svg" },
            },
            mainEntityOfPage:
              "https://tokencalc.com/blog/ai-api-budget-planning-for-startups",
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
              AI API budget planning for startups: a practical 12-month
              framework
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              The OpenAI invoice is now the second-biggest line item on most
              early-stage P&Ls. Here is how to size it, split it across
              features, and stress-test it through your next fundraising
              milestone — without pretending you know exactly what GPT-5 will
              cost.
            </p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-4">
              <span>11 min read</span>
              <span>·</span>
              <time dateTime="2026-05-09">May 9, 2026</time>
            </div>
          </div>
        </div>
      </div>

      <article className="container mx-auto px-4 py-10">
        <div className="max-w-3xl mx-auto space-y-6 text-foreground">
          <section>
            <h2 className="text-2xl font-bold mt-2 mb-3">
              Why "what we spent last month × 12" is dangerous
            </h2>
            <p className="leading-relaxed">
              Most founder budgets for AI APIs are extrapolations of last
              month's invoice. That works until any one of five things
              happens: a viral marketing moment, a power-user discovering a
              loophole, a model deprecation, a context-window expansion in
              your product, or your team shipping an agentic feature. Each of
              these can 3-10× your spend in a week. A real budget has to
              handle all five.
            </p>
            <p className="leading-relaxed">
              Use the framework below: <strong>size, allocate, scenario,
              guardrail.</strong>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-6 mb-3">
              1. Size: start from cost per user, not from a number you like
            </h2>
            <p className="leading-relaxed">
              Your AI budget is a derived number, not a chosen one. The
              honest path:
            </p>
            <ul className="list-disc pl-6 space-y-1 leading-relaxed">
              <li>Compute cost per active user per month for each AI feature.</li>
              <li>Multiply by your MAU forecast for each month.</li>
              <li>Add 20-30% for non-user traffic (cron jobs, evals, internal tools, abuse).</li>
              <li>Add a separate experimentation line — usually 10-25% of feature spend.</li>
            </ul>
            <p className="leading-relaxed">
              Founders who have not built a per-user number first end up
              underwriting a fixed budget that gets blown the first month
              they hit a growth spike. If you have not done this exercise yet,
              start with our{" "}
              <Link
                href="/blog/how-to-calculate-llm-cost-per-user"
                className="text-primary hover:underline font-medium"
              >
                guide to calculating LLM cost per user
              </Link>{" "}
              and bring the resulting numbers back here.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-6 mb-3">
              2. Allocate: budget across four buckets
            </h2>
            <p className="leading-relaxed">
              We see four spend categories repeat across every AI startup
              that has crossed $10K/month in API spend. Naming them
              separately lets your team make trade-offs without breaking the
              whole forecast.
            </p>
            <div
              className="bg-card border rounded-xl p-4 my-5"
              data-testid="chart-allocation"
            >
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Suggested monthly AI budget allocation by stage (USD)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={allocationData}
                  margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="stage" tick={{ fontSize: 10 }} interval={0} />
                  <YAxis
                    tickFormatter={(v) =>
                      v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`
                    }
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(v: number) =>
                      `$${v.toLocaleString()}`
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="core" stackId="a" fill="#2563eb" name="Core features" />
                  <Bar dataKey="ops" stackId="a" fill="#7c3aed" name="Ops & evals" />
                  <Bar dataKey="experiments" stackId="a" fill="#16a34a" name="Experiments" />
                  <Bar dataKey="buffer" stackId="a" fill="#d97706" name="Buffer (overage)" />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground mt-3 italic">
                Numbers are illustrative starting points. Adjust ratios for
                your product — agentic tools push core higher, content tools
                push experiments higher.
              </p>
            </div>
            <ul className="list-disc pl-6 space-y-1 leading-relaxed">
              <li>
                <strong>Core features</strong> — user-facing AI that drives
                retention. Forecastable from cost-per-user × MAU.
              </li>
              <li>
                <strong>Ops &amp; evals</strong> — eval suites, regression
                runs, observability sampling. Often overlooked, runs 10-15%
                of core in a healthy team.
              </li>
              <li>
                <strong>Experiments</strong> — prompt rewrites, new model
                trials, prototype features. Cap this explicitly each month
                and review weekly.
              </li>
              <li>
                <strong>Buffer</strong> — viral spikes, abuse, and the
                inevitable "we shipped a regression that doubled output
                tokens." Plan 15-30% on top.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-6 mb-3">
              3. Scenario: model best, expected, and worst
            </h2>
            <p className="leading-relaxed">
              The single biggest difference between hobby budgets and
              fundable budgets is showing three lines, not one. Best case is
              you ship the caching and routing improvements that have been
              backlogged. Expected is the baseline above. Worst case is a
              growth spike, an output-length regression, and a heavier model
              you had to swap to for quality.
            </p>
            <div
              className="bg-card border rounded-xl p-4 my-5"
              data-testid="chart-scenarios"
            >
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                12-month AI spend forecast — three scenarios
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart
                  data={scenarioData}
                  margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis
                    tickFormatter={(v) =>
                      v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`
                    }
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(v: number) =>
                      `$${v.toLocaleString()}`
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="Best" stroke="#16a34a" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="Expected" stroke="#2563eb" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="Worst" stroke="#dc2626" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground mt-3 italic">
                Best = caching + cheaper model routing land on time. Worst =
                viral spike + an output-length regression you don't catch
                for two weeks.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-6 mb-3">
              4. Guardrail: turn the budget into limits in code
            </h2>
            <p className="leading-relaxed">
              A budget that lives in a deck is decoration. A budget that
              lives in your code is policy. The cheapest controls to
              implement, ranked by ROI:
            </p>
            <ul className="list-disc pl-6 space-y-1 leading-relaxed">
              <li>
                <strong>Per-user daily token caps</strong> — kills
                power-user blast radius without affecting 95% of users.
              </li>
              <li>
                <strong>Per-feature monthly hard cap</strong> with a paging
                alert at 70%. Buys you a week to react before billing.
              </li>
              <li>
                <strong>Model fallback router</strong> — degrade gracefully
                from premium to mid-tier when spend rate exceeds budget.
              </li>
              <li>
                <strong>Eval-gated prompt changes</strong> — prevents the
                "we doubled the system prompt and didn't notice" failure
                mode.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-6 mb-3">
              The benchmarks investors are actually checking
            </h2>
            <p className="leading-relaxed">
              For seed-and-A AI startups, the questions on the budget slide
              are predictable. Have a number for each:
            </p>
            <ul className="list-disc pl-6 space-y-1 leading-relaxed">
              <li>AI cost as a % of revenue at current MAU and at 10× MAU.</li>
              <li>Gross margin including AI cost — &gt;60% earns no questions.</li>
              <li>Cost per active user, with the per-feature breakdown.</li>
              <li>What changes if your primary model gets 50% cheaper or 100% more expensive.</li>
              <li>Hard caps in place that prevent a 3× monthly overrun.</li>
            </ul>
          </section>

          <section className="bg-primary/5 border border-primary/20 rounded-xl p-6 my-8">
            <h3 className="text-lg font-bold mb-2">
              Build the forecast in 5 minutes
            </h3>
            <p className="text-sm leading-relaxed mb-4">
              The Budget Planner runs the size-allocate-scenario steps for
              you. Plug in your MAU growth and per-feature usage; it gives
              you the 12-month forecast, the three-scenario chart, and the
              guardrails worth shipping first.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/budget-planner">
                <Button size="default" data-testid="cta-budget-planner">
                  Open the AI Budget Planner →
                </Button>
              </Link>
              <Link href="/cost-per-user">
                <Button size="default" variant="outline" data-testid="cta-cost-per-user">
                  Or start with cost per user
                </Button>
              </Link>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-6 mb-3">Where to go next</h2>
            <p className="leading-relaxed">
              Budgeting is the macro view. To actually defend the numbers in
              a board meeting, you need the micro view too: gross margin per
              feature and per user. Run your assumptions through the{" "}
              <Link href="/" className="text-primary hover:underline font-medium">
                SaaS margin simulator
              </Link>{" "}
              and our companion guide on{" "}
              <Link
                href="/blog/how-to-calculate-llm-cost-per-user"
                className="text-primary hover:underline font-medium"
              >
                calculating LLM cost per user
              </Link>
              .
            </p>
          </section>

          <SeoFooter
            paragraph="AI API budget planning is the new financial planning. The startups that get it right treat their LLM bill the way SaaS founders treat infrastructure: a derived line item with hard guardrails, three scenarios, and a model that updates as fast as prices change."
            links={[
              { href: "/budget-planner", anchor: "AI Budget Planner" },
              { href: "/cost-per-user", anchor: "Cost Per User Calculator" },
              { href: "/", anchor: "SaaS Margin Simulator" },
            ]}
          />
        </div>
      </article>
    </div>
  );
}
