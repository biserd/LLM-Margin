import { Link } from "wouter";
import { ArrowRight, Calculator, FileText, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
export default function QuoteHome() {
  return (
    <>
      <title>
        Price Your AI Service. Send a Better Client Quote. | LLM Margin
      </title>
      <meta
        name="description"
        content="AI service pricing for freelancers and small agencies. Calculate delivery costs, protect your margin, and turn your estimate into a client-ready proposal. Start free."
      />
      <link rel="canonical" href="https://llmmargin.com/" />
      <meta
        property="og:title"
        content="Price your AI service. Send a better client quote."
      />
      <meta
        property="og:description"
        content="From model costs and delivery hours to a retainer, setup fee, and client-ready proposal."
      />
      <meta property="og:url" content="https://llmmargin.com/" />
      <section className="bg-gradient-to-b from-emerald-50/60 to-background dark:from-emerald-950/20 border-b">
        <div className="container mx-auto px-4 py-20 md:py-28 grid lg:grid-cols-[1.2fr_1fr] gap-14 items-center max-w-6xl">
          <div>
            <p className="uppercase tracking-widest text-xs text-primary font-semibold mb-5">
              For AI freelancers & small agencies
            </p>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.08]">
              Price your AI service.
              <br />
              <span className="text-primary">Protect your margin.</span>
            </h1>
            <p className="text-lg text-muted-foreground mt-6 max-w-xl">
              Your client wants a quote—not a token spreadsheet. Turn model
              costs, delivery hours, and support into a clear setup fee and
              monthly retainer.
            </p>
            <Button asChild size="lg" className="mt-8">
              <Link href="/ai-service-pricing-calculator">
                Build my client quote <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
            <p className="mt-3 text-sm text-muted-foreground">
              Free estimate. No signup required. Export when you’re ready.
            </p>
          </div>
          <div className="bg-slate-950 text-white rounded-3xl p-8 shadow-xl">
            <p className="text-emerald-300 text-xs uppercase tracking-widest">
              Example · AI support assistant
            </p>
            <div className="border-b border-slate-700 py-6">
              <p className="text-slate-400 text-sm">Monthly retainer</p>
              <p className="text-5xl font-semibold mt-2">$1,500</p>
              <p className="text-slate-400 mt-2 text-sm">
                + $3,600 implementation
              </p>
            </div>
            <dl className="space-y-4 mt-6 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-400">Usage allowance</dt>
                <dd>10,000 requests / month</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Buffered delivery cost</dt>
                <dd>$600 / month</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Target gross margin</dt>
                <dd className="text-emerald-300">60%</dd>
              </div>
            </dl>
            <p className="text-xs text-slate-400 mt-6">
              Illustrative starting assumptions. Replace them with your own
              costs.
            </p>
          </div>
        </div>
      </section>
      <section className="container mx-auto px-4 py-16 max-w-6xl">
        <h2 className="text-3xl font-bold">A quote you can explain.</h2>
        <div className="grid md:grid-cols-3 gap-7 mt-9">
          {[
            {
              icon: Calculator,
              title: "Count the real delivery cost",
              text: "Model calls, token usage, hosting, setup work, and ongoing support—all in one estimate.",
            },
            {
              icon: ShieldCheck,
              title: "Set boundaries before you sell",
              text: "Include a usage allowance, estimate overages, and see what happens if usage doubles.",
            },
            {
              icon: FileText,
              title: "Send a clear proposal",
              text: "Preview free. Pay $29 once to export one saved quote, with revisions included. No subscription required.",
            },
          ].map((item) => (
            <article className="border rounded-2xl p-7" key={item.title}>
              <item.icon className="text-primary w-6 h-6" />
              <h3 className="font-semibold text-lg mt-4">{item.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                {item.text}
              </p>
            </article>
          ))}
        </div>
      </section>
      <section className="container mx-auto px-4 py-8 max-w-6xl grid md:grid-cols-2 gap-10">
        <div>
          <h2 className="text-2xl font-bold">
            For the work you’re already selling
          </h2>
          <p className="mt-4 text-muted-foreground">
            Support assistants. Document-processing workflows. Content
            operations. Internal knowledge tools. Start with one client project
            and make the assumptions explicit.
          </p>
        </div>
        <div className="border-l-4 border-primary pl-6">
          <h2 className="text-xl font-semibold">
            Works with your AI agent, too
          </h2>
          <p className="text-muted-foreground mt-3">
            Deterministic calculations, visible assumptions, and client-ready
            scope. Your agent can use the same calculator through our API or MCP
            server.
          </p>
          <Link
            href="/agents"
            className="inline-block text-primary underline mt-4"
          >
            Agent integration guide
          </Link>
        </div>
      </section>
      <section className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold">
          Start with the numbers. Sell the outcome.
        </h2>
        <Button asChild size="lg" className="mt-6">
          <Link href="/ai-service-pricing-calculator">
            Create a free estimate
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground mt-5">
          Building a SaaS?{" "}
          <Link href="/margin-calculator" className="underline">
            The original margin calculator is still free.
          </Link>
        </p>
      </section>
    </>
  );
}
