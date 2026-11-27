import type { ReactNode } from "react";
import { Link } from "wouter";

const published = "2026-11-27";
const site = "https://llmmargin.com";
const image = `${site}/opengraph.jpg`;

interface ArticleProps {
  slug: string;
  title: string;
  seoTitle: string;
  description: string;
  intro: string;
  children: ReactNode;
}

function PricingArticle({ slug, title, seoTitle, description, intro, children }: ArticleProps) {
  const canonical = `${site}/blog/${slug}`;
  return (
    <article className="min-h-screen bg-background">
      <title>{seoTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta property="og:type" content="article" />
      <meta property="og:title" content={title} />
      <meta property="article:published_time" content={published} />
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
            author: { "@type": "Organization", name: "LLM Margin", url: `${site}/` },
            publisher: { "@type": "Organization", name: "LLM Margin" },
            mainEntityOfPage: canonical,
          }),
        }}
      />
      <header className="border-b bg-gradient-to-b from-primary/5 to-background">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <Link href="/blog" className="text-sm font-medium text-primary hover:underline">← Back to blog</Link>
          <h1 className="mt-3 text-3xl font-bold leading-tight md:text-4xl">{title}</h1>
          <p className="mt-4 leading-relaxed text-muted-foreground">{intro}</p>
          <time className="mt-4 block text-sm text-muted-foreground" dateTime={published}>November 27, 2026</time>
        </div>
      </header>
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 leading-relaxed">
        {children}
      </div>
    </article>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

function PricingTable({ caption, headers, rows }: { caption: string; headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead><tr className="border-b">{headers.map((header) => (
          <th key={header} scope="col" className="px-2 py-2 align-bottom">{header}</th>
        ))}</tr></thead>
        <tbody>{rows.map(([label, ...values]) => (
          <tr key={label} className="border-b">
            <th scope="row" className="px-2 py-2 align-top font-medium">{label}</th>
            {values.map((value, index) => <td key={headers[index + 1]} className="px-2 py-2 align-top tabular-nums">{value}</td>)}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

const quoteBuilder = "/ai-service-pricing-calculator";
const creditCalculator = "/tools/ai-credits-pricing-calculator";
const linkStyle = "font-medium text-primary underline underline-offset-4";

export function AiAutomationRetainer() {
  return (
    <PricingArticle
      slug="ai-automation-retainer-pricing"
      title="How to Price an AI Automation Retainer"
      seoTitle="AI Automation Retainer Pricing Guide | LLM Margin"
      description="Set an AI automation retainer from support, hosting, and model costs. Compare bundled usage with pass-through billing and see what happens when usage doubles."
      intro="Price an AI automation retainer by budgeting the work needed to keep the automation running, adding the usage you cover, and dividing the buffered cost by one minus your target margin. Quote the included usage and the price of extra work before the client signs."
    >
      <Section title="Decide what the monthly fee covers">
        <p>List the workflows you monitor, what counts as an incident, and how quickly you will acknowledge an issue during your support hours. Set a limit on minor changes, such as four combined hours of monitoring, fixes, and small adjustments per month. Quote new integrations, additional workflows, or on-call coverage separately.</p>
        <p>Pick a unit the client can see in a report, such as a completed workflow run. Include the average cost of retries and failed attempts in your internal estimate. Define how you count duplicates and failed runs when you bill the client.</p>
      </Section>
      <Section title="Work out the monthly price floor">
        <p>Consider a lead-triage workflow that classifies an inquiry and prepares a draft for staff review. The example below assumes 3,000 completed runs per month and a 55% target gross margin. Costs are illustrative, and the client-facing prices are in whole US dollars.</p>
        <PricingTable
          caption="Illustrative monthly retainer cost calculation"
          headers={["Monthly item", "Cost"]}
          rows={[
            ["4 service hours × $55", "$220"],
            ["Hosting and tools", "$30"],
            ["3,000 runs × $0.03", "$90"],
            ["Cost before contingency", "$340"],
            ["20% contingency", "$68"],
            ["Buffered delivery cost", "$408"],
          ]}
        />
        <p>Divide $408 by 0.45 to get a $906.67 monthly price floor. A rounded <strong>$907 monthly retainer</strong> clears the target at the included volume. Price the initial build as a separate one-time line so changes in operating volume stay visible.</p>
      </Section>
      <Section title="Bundle usage or let the client pay the provider">
        <p>Bundling keeps the included service and usage on one invoice. With direct vendor billing, the client pays the provider and the agency prices the service and hosting it still supplies. With the same contingency and margin target, the agency’s direct-billing retainer works out to $667 before provider fees.</p>
        <PricingTable
          caption="Estimated client cost at normal and higher usage"
          headers={["Monthly runs", "Bundled with overages", "Client pays vendor directly"]}
          rows={[
            ["3,000", "$907 total", "$667 service + $90 vendor = $757"],
            ["6,000", "$907 + $240 overage = $1,147", "$667 service + $180 vendor = $847"],
          ]}
        />
        <p>The bundled overage is $80 per additional 1,000 runs. The calculation is $30 in model cost × 1.20 ÷ 0.45. At 6,000 runs, the buffered delivery cost rises to $516. Keeping the price at $907 would lower modeled margin to 43.1%. Billing the overage brings it back to about 55% if support and hosting stay constant.</p>
        <p>The direct-billing example assumes the vendor charges the same per-run rate and the client owns that bill. Before quoting it, agree who owns the vendor account, who watches its spending, and who can approve a limit increase.</p>
      </Section>
      <Section title="Put the usage rules on the quote">
        <p>State the included runs, overage charge, notification threshold, and who can approve extra volume. For this example, notify the client at 2,400 completed runs and get their consent before billing beyond the allowance. Review the rate if usage repeatedly exceeds the allowance or the workflow changes.</p>
        <p>Use the <Link href={quoteBuilder} className={linkStyle}>AI service pricing calculator</Link> to try your own costs. For the client-facing scope, use the <Link href="/blog/ai-automation-proposal-template" className={linkStyle}>AI automation proposal template</Link>.</p>
      </Section>
    </PricingArticle>
  );
}

export function AiAutomationProposal() {
  return (
    <PricingArticle
      slug="ai-automation-proposal-template"
      title="AI Automation Proposal Template for Client Projects"
      seoTitle="AI Automation Proposal Template | LLM Margin"
      description="Use a client-ready AI automation proposal template covering deliverables, acceptance tests, setup fees, recurring support, usage limits, and exclusions."
      intro="An AI automation proposal should say which workflow you will deliver, how the client will verify it, what they need to provide, and what they will pay. Use the template and invoice-intake example below to turn your estimate into a proposal the client can review."
    >
      <Section title="Copy this proposal outline">
        <dl className="space-y-3 rounded-xl border bg-card p-5">
          <div><dt className="font-semibold">Outcome</dt><dd>For [team], turn [input] into [result], with [person] approving [action].</dd></div>
          <div><dt className="font-semibold">Deliverables</dt><dd>Build [workflow count] for [named systems]. Include [test set, documentation, and training].</dd></div>
          <div><dt className="font-semibold">Acceptance</dt><dd>Approve the pilot when [measurable result] passes on [agreed samples]. Send exceptions to [owner].</dd></div>
          <div><dt className="font-semibold">Client responsibilities</dt><dd>Provide [access and sample data] by [date]. Assign [reviewer] to make decisions and approve launch.</dd></div>
          <div><dt className="font-semibold">Price and usage</dt><dd>Setup [fee], recurring service [fee], included [unit and allowance], and overage [price and approval rule]. State who pays vendor bills.</dd></div>
          <div><dt className="font-semibold">Timeline and changes</dt><dd>Allow [duration] after access is ready. Agree excluded work, how to price changes, and who receives the handoff.</dd></div>
        </dl>
      </Section>
      <Section title="Worked example for invoice intake">
        <p>Process PDF invoices from one approved mailbox. Extract vendor, invoice number, date, currency, and total into one review queue. A finance team member approves each record before it can be written to the accounting system.</p>
        <p>Test an agreed set of 30 representative, anonymized invoices. Require all five fields to match the verified values on at least 27 of the 30 documents. Route every unreadable or flagged duplicate in the test set to a reviewer. Verify that no record reaches the accounting system without approval. Record failures and rerun the agreed cases before launch.</p>
        <p>The client supplies the examples, the mailbox and accounting access, and a named reviewer. Allow two weeks after access is ready. Exclude handwritten invoices, additional inboxes, payments, and tax coding from this quote. Confirm the cost and timing of any added scope before work starts.</p>
        <PricingTable
          caption="Illustrative invoice-intake proposal in US dollars"
          headers={["Proposal line", "Example"]}
          rows={[
            ["One-time setup and pilot", "$2,400"],
            ["Monitoring and support", "$780 per month"],
            ["Included usage", "2,000 processed PDFs per month"],
            ["Approved additional usage", "$20 per extra 500 PDFs"],
            ["First month before overages and taxes", "$3,180"],
          ]}
        />
      </Section>
      <Section title="Keep the pricing assumptions behind the quote">
        <p>The example uses 16 setup hours at $60 per hour. Monthly costs are four service hours at $60, $40 for tools, and $32 to process 2,000 documents at $0.016 each. Applying a 20% buffer and dividing by 0.48 for a 52% margin target gives the $2,400 setup fee and $780 retainer. The same formula gives a $20 overage per 500 documents and assumes no extra labor or hosting.</p>
        <p>Send the scope, quote, and client responsibilities together. Keep internal rates in your cost worksheet. Use the <Link href={quoteBuilder} className={linkStyle}>AI service pricing calculator</Link> to price a project, or read how to <Link href="/blog/ai-automation-retainer-pricing" className={linkStyle}>set the recurring support fee</Link> before sending the quote.</p>
      </Section>
    </PricingArticle>
  );
}

export function AiCreditsPricing() {
  return (
    <PricingArticle
      slug="how-to-price-ai-credits"
      title="How to Price AI Credits for a SaaS Product"
      seoTitle="How to Price AI Credits for SaaS | LLM Margin"
      description="Price AI credits from the cost of each action. Work through credit weights, discounted packs, payment fees, and margin when every credit is redeemed."
      intro="Price AI credits by calculating what each customer action costs to deliver, then setting its credit charge from the lowest effective price in your packs. Check the margin when customers spend their entire balance on the most expensive available actions."
    >
      <Section title="Define what a customer spends credits on">
        <p>Choose actions customers recognize, such as a standard summary or a full document review. Measure the model calls, retries, storage, and other variable delivery costs that make up each action. Use the <Link href="/blog/how-to-calculate-llm-cost-per-user" className={linkStyle}>LLM cost calculation guide</Link> to turn model usage into dollars.</p>
        <p>In this example, a summary costs $0.025 and a review costs $0.085. These USD amounts are illustrative fully loaded variable costs. If large documents cost more, cap the document size or add a separate priced action before offering a fixed credit charge.</p>
      </Section>
      <Section title="Find the delivery budget per credit">
        <p>Multiply the pack price by one minus your target margin. Subtract the fees and fixed delivery costs allocated to the pack. Divide what remains by the number of credits sold. Use the smallest result across your available packs to set a credit schedule shared by all customers.</p>
        <PricingTable
          caption="Illustrative credit packs at a 60% modeled margin target"
          headers={["Pack calculation", "Starter", "Discounted"]}
          rows={[
            ["Price and credits", "$29 for 1,000", "$49 for 2,500"],
            ["Maximum delivery cost at 60% target margin", "$11.60", "$19.60"],
            ["Illustrative payment fee", "$1.15", "$1.72"],
            ["Fixed delivery cost allocation", "$3.00", "$3.00"],
            ["Left for variable usage", "$7.45", "$14.88"],
            ["Variable cost budget per credit", "$0.00745", "$0.005952"],
          ]}
        />
        <p>At $0.005952 of variable budget per credit, divide the action’s cost by $0.005952 and round up. The standard summary uses <strong>5 credits</strong> and the document review uses <strong>15 credits</strong>. A starter-only calculation would suggest 4 and 12 credits, which leaves less room on the discounted pack.</p>
      </Section>
      <Section title="Stress-test full redemption before adding a discount">
        <p>With a charge of 12 credits, a 2,500-credit pack funds 208 full reviews. Those reviews cost $17.68 to deliver. With the assumed fee and fixed cost, the modeled margin is about 54.3% even before the remaining four credits are used.</p>
        <p>With a charge of 15 credits, the same pack funds 166 reviews and leaves 10 credits for two standard summaries. Modeled variable cost is $14.16. After fees and fixed delivery costs, the example has about 61.5% margin. Test heavy users, slower model calls, fuller documents, and your deepest discount with the same method.</p>
      </Section>
      <Section title="Make usage predictable for customers">
        <p>Show the credit cost before the action runs. State how failed jobs, refunds, expiry, rollover, and top-ups work, and make the remaining balance easy to find. Model the delivery cost of free credits separately so trial usage has its own budget.</p>
        <p>Use the <Link href={creditCalculator} className={linkStyle}>AI credits pricing calculator</Link> to explore price and margin for a representative action. Use the pack worksheet above to check fees, discounts, and a mix of different credit charges.</p>
      </Section>
    </PricingArticle>
  );
}
