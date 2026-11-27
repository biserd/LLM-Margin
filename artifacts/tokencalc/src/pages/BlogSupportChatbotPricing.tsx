import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { supportChatbotExample, supportChatbotExampleSlug } from "@/lib/support-chatbot-example";
import { calculateQuote, money } from "../../../api-server/src/worker/quote-model";

const title = "How to Price an AI Support Chatbot for a Client";
const seoTitle = "How to Price an AI Support Chatbot | LLM Margin";
const description = "Price a client’s AI support chatbot with a setup fee, monthly retainer, and usage allowance. See the cost math, overage rate, and a worked proposal.";
const canonical = "https://llmmargin.com/blog/how-to-price-ai-support-chatbot";
const published = "2026-11-27";
const image = "https://llmmargin.com/opengraph.jpg";
const calculator = `/ai-service-pricing-calculator?example=${supportChatbotExampleSlug}`;
const example = calculateQuote(supportChatbotExample);

const proposalTerms = [
  ["One-time setup", money(example.setupFee)],
  ["Managed support", `${money(example.minimumRetainer)} per month`],
  ["Included usage", `${example.includedRequests.toLocaleString("en-US")} requests per month`],
  ["Additional usage", `${money(example.overagePer1000)} per additional 1,000 requests`],
  ["First month, before overages and taxes", money(example.firstMonthTotal)],
];

export default function BlogSupportChatbotPricing() {
  return (
    <article className="min-h-screen bg-background">
      <title>{seoTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta property="og:type" content="article" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="LLM Margin" />
      <meta property="article:published_time" content={published} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: title,
            description,
            datePublished: published,
            image,
            author: { "@type": "Organization", name: "LLM Margin", url: "https://llmmargin.com/" },
            publisher: { "@type": "Organization", name: "LLM Margin" },
            mainEntityOfPage: canonical,
          }),
        }}
      />

      <header className="border-b bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 py-10">
          <div className="mx-auto max-w-3xl">
            <Link href="/blog" className="text-sm font-medium text-primary hover:underline">
              ← Back to blog
            </Link>
            <h1 className="mt-3 text-3xl font-bold leading-tight md:text-4xl">{title}</h1>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Quote a one-time fee to build and launch the chatbot, then a monthly retainer that
              covers hosting, model usage, and support. State how much usage is included and what
              extra requests cost. In the example below, that works out to {money(example.setupFee)} for
              setup and {money(example.minimumRetainer)} per month, with 10,000 requests included.
            </p>
            <time className="mt-4 block text-sm text-muted-foreground" dateTime={published}>
              November 27, 2026
            </time>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-10">
        <div className="mx-auto max-w-3xl space-y-10 leading-relaxed">
          <section aria-labelledby="scope">
            <h2 id="scope" className="mb-3 text-2xl font-bold">Scope the work before you price it</h2>
            <p>
              Ask for the client’s busiest and quietest weeks, their approved help-center content,
              and the kinds of questions a person must handle. Use a small test set to estimate
              how many model calls and tokens a typical request uses. A request is one user message
              the chatbot processes. One conversation can contain several requests, and each
              request can trigger more than one model call.
            </p>
            <p className="mt-3">
              This illustrative quote covers one website chatbot using an existing help center.
              Setup includes content preparation, installation, handoff rules, and testing.
              Estimate a new help-desk integration or an additional channel as separate work.
            </p>
          </section>

          <section aria-labelledby="cost-math">
            <h2 id="cost-math" className="mb-3 text-2xl font-bold">Calculate the setup fee and retainer</h2>
            <p className="mb-4">
              Start with 10,000 requests per month and two model calls per request. Each call
              averages 2,000 input tokens and 500 output tokens. For this example, assume $3 per
              million input tokens and $15 per million output tokens. Replace those illustrative
              rates with the rates your provider actually charges.
            </p>
            <table className="w-full border-collapse text-left text-sm">
              <caption className="sr-only">Illustrative monthly delivery costs in US dollars</caption>
              <thead>
                <tr className="border-b">
                  <th scope="col" className="pb-2 pr-3 font-semibold">Monthly delivery cost</th>
                  <th scope="col" className="pb-2 text-right font-semibold">USD</th>
                </tr>
              </thead>
              <tbody>
                {([
                  ["Model usage (40M input tokens and 10M output tokens)", example.modelCost],
                  ["Hosting and tools", example.platformCost],
                  ["Support (3 hours × $60 internal hourly cost)", example.supportCost],
                  ["Subtotal", example.baseCost],
                  ["20% contingency", example.contingency],
                  ["Buffered monthly delivery cost", example.bufferedCost],
                ] as const).map(([label, amount]) => (
                  <tr key={label} className="border-b">
                    <th scope="row" className="py-2 pr-3 font-medium">{label}</th>
                    <td className="py-2 text-right tabular-nums">{money(amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4">
              For a 60% gross margin, delivery costs can take up 40% of the selling price.
              Divide the buffered delivery cost by 0.40 to find your price floor.
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li><strong>Monthly retainer</strong> = $600 ÷ 0.40 = {money(example.minimumRetainer)}.</li>
              <li><strong>One-time setup</strong> = 20 hours × $60 × 1.20 ÷ 0.40 = {money(example.setupFee)}.</li>
            </ul>
            <p className="mt-3">
              Use this as a cost-based floor. The price you present can also reflect the
              value of the service. Add any costs missing from your estimate before relying
              on the margin, including payment fees and subcontractor time.
            </p>
          </section>

          <section aria-labelledby="usage">
            <h2 id="usage" className="mb-3 text-2xl font-bold">Set the usage allowance and overage rate</h2>
            <p>
              The model costs $0.027 per request in this example. An extra 1,000 requests costs
              $27 in model usage. Applying the same 20% buffer and 60% margin makes the overage
              {" "}<strong>{money(example.overagePer1000)} per 1,000 extra requests</strong>.
              Scope extra hosting or support separately if higher traffic adds those costs.
            </p>
            <p className="mt-3">
              At 20,000 monthly requests, with no overage fee and the same hosting and support
              costs, modeled gross margin drops from 60% to {example.doubledUsageMarginPercent}%.
              Tell the client how you count usage, when you’ll notify them, and whether
              they can approve an overage or pause usage when they reach the allowance.
            </p>
          </section>

          <section aria-labelledby="worked-quote" className="rounded-xl border bg-card p-5 sm:p-7">
            <h2 id="worked-quote" className="mb-2 text-2xl font-bold">Sample client quote for a support chatbot</h2>
            <p className="text-sm text-muted-foreground">Illustrative proposal in USD</p>
            <p className="mt-4">{supportChatbotExample.scope}</p>
            <dl className="mt-4 divide-y border-y">
              {proposalTerms.map(([term, amount]) => (
                <div key={term} className="grid gap-0.5 py-2.5 sm:grid-cols-2 sm:gap-4">
                  <dt className="font-medium">{term}</dt>
                  <dd className="text-muted-foreground sm:text-right">{amount}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-sm text-muted-foreground">
              Client to approve source content and name a contact for escalations before launch.
              We’ll share usage in the monthly report and confirm any additional work separately.
            </p>
          </section>

          <section aria-labelledby="build-quote" className="rounded-xl border border-primary/20 bg-primary/5 p-5 sm:p-7">
            <h2 id="build-quote" className="mb-2 text-xl font-bold">Build a quote from your own costs</h2>
            <p className="mb-4">
              Open the example, adjust the scope and numbers, and preview your quote free without signing in.
            </p>
            <Button asChild>
              <a href={calculator}>Open the example in the calculator</a>
            </Button>
          </section>
        </div>
      </div>
    </article>
  );
}
