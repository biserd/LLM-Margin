import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { calculateQuote, defaultQuote, money, parseQuote, quoteFields, quoteInputSchema, type NumericKey, type QuoteInput } from "../../../api-server/src/worker/quote-model";

type SavedQuote = { id: string; input: QuoteInput; revision: number; exportUnlocked: boolean };
const draftKey = "llmmargin_quote_draft_v1";
export function trackQuote(event: string) {
  (window as Window & { gtag?: (...args: unknown[]) => void }).gtag?.("event", event, { product: "client_quote" });
}
export async function quoteApi<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(path, { method, credentials: "same-origin", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
  return data as T;
}
export default function QuoteBuilder() {
  const { id } = useParams<{ id?: string }>();
  const { user, isLoading } = useAuth();
  const [input, setInput] = useState<QuoteInput>({ ...defaultQuote });
  const [saved, setSaved] = useState<SavedQuote | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const calculation = useMemo(() => {
    try { return { result: calculateQuote(parseQuote(input)), error: "" }; }
    catch (e) { return { result: null, error: (e as Error).message }; }
  }, [input]);
  const r = calculation.result;
  const dirty = !saved || JSON.stringify(input) !== JSON.stringify(saved.input);
  useEffect(() => {
    if (id) return;
    try { const raw = sessionStorage.getItem(draftKey); if (raw) setInput(parseQuote(JSON.parse(raw))); } catch { /* Storage is optional. */ }
    setReady(true); trackQuote("quote_builder_opened");
  }, [id]);
  useEffect(() => {
    if (!ready || id) return;
    try { sessionStorage.setItem(draftKey, JSON.stringify(input)); } catch { /* Storage is optional. */ }
  }, [input, ready, id]);
  useEffect(() => {
    if (!id || !user) return;
    let active = true;
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get("checkout_session_id");
        if (sessionId) {
          const payment = await quoteApi<{ exportUnlocked: boolean }>(`/api/quotes/${id}/payment`, "POST", { sessionId });
          if (active) setNotice(payment.exportUnlocked ? "Payment confirmed. Your exports are ready." : "Payment is processing. Exports unlock when it is confirmed; refresh this page to check.");
          if (payment.exportUnlocked) trackQuote("quote_purchase_confirmed");
          window.history.replaceState({}, "", `/quote/${id}`);
        }
        if (params.has("canceled")) setNotice("Checkout canceled. This checkout has not charged you.");
        const quote = await quoteApi<SavedQuote>(`/api/quotes/${id}`);
        if (active) { setInput(quote.input); setSaved(quote); setReady(true); }
      } catch (e) { if (active) { setError((e as Error).message); setReady(true); } }
    })();
    return () => { active = false; };
  }, [id, user?.id]);
  useEffect(() => {
    type ToolHost = { modelContext?: { registerTool: (tool: unknown) => void; unregisterTool: (name: string) => void } };
    const context = (document as Document & ToolHost).modelContext ?? (navigator as Navigator & ToolHost).modelContext;
    if (!context) return;
    context.registerTool({ name: "estimate_ai_service", description: "Estimate an AI service retainer, setup fee and usage guardrails in USD. Does not save data or make purchases.", inputSchema: quoteInputSchema, annotations: { readOnlyHint: true }, execute: async (args: unknown) => ({ content: [{ type: "text", text: JSON.stringify(calculateQuote(parseQuote(args))) }] }) });
    return () => context.unregisterTool("estimate_ai_service");
  }, []);
  function signIn() {
    try { sessionStorage.setItem(draftKey, JSON.stringify(input)); } catch { /* Storage is optional. */ }
    window.location.href = `/sign-in?next=${encodeURIComponent(id ? `/quote/${id}` : "/ai-service-pricing-calculator")}`;
  }
  async function persist() {
    const quote = await quoteApi<SavedQuote>(saved ? `/api/quotes/${saved.id}` : "/api/quotes", saved ? "PUT" : "POST", { input: parseQuote(input), ...(saved ? { revision: saved.revision } : {}) });
    setSaved(quote); setInput(quote.input); trackQuote("quote_saved"); return quote;
  }
  async function save() {
    if (!user) return signIn();
    setBusy(true); setError("");
    try { const quote = await persist(); window.location.href = `/quote/${quote.id}`; }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function checkout() {
    if (!user) return signIn();
    setBusy(true); setError("");
    try {
      const quote = dirty ? await persist() : saved!;
      trackQuote("quote_checkout_started");
      const result = await quoteApi<{ url: string }>(`/api/quotes/${quote.id}/checkout`, "POST", {});
      window.location.assign(result.url);
    } catch (e) { setError((e as Error).message); setBusy(false); }
  }
  return <div className="container mx-auto px-4 py-12 max-w-6xl">
    <title>AI Service Pricing Calculator & Client Quote Builder | LLM Margin</title>
    <meta name="description" content="Price your AI agency service from token costs, delivery hours, hosting and target margin. Preview a client quote free. Export one quote for $29, no subscription." />
    {id ? <meta name="robots" content="noindex,nofollow" /> : <link rel="canonical" href="https://llmmargin.com/ai-service-pricing-calculator" />}
    <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-3">For AI freelancers & small agencies</p>
    <h1 className="text-3xl md:text-5xl font-bold tracking-tight max-w-3xl">What should you charge for this AI service?</h1>
    <p className="text-muted-foreground mt-4 max-w-2xl text-lg">Turn delivery costs into a retainer, setup fee, and usage allowance. Explore free; sign in to save. All amounts are USD.</p>
    {id && !user && !isLoading ? <div className="border rounded-xl p-8 mt-8"><h2 className="text-xl font-semibold">This is a private saved quote.</h2><Button onClick={signIn} className="mt-4">Sign in to open it</Button></div> : <div className="grid lg:grid-cols-[1fr_0.95fr] gap-8 mt-10">
      <section className="space-y-6" aria-label="Quote inputs">
        <fieldset className="border rounded-2xl p-6 space-y-4 bg-card"><legend className="px-2 font-semibold">1. Your client project</legend>
          {(["title", "agency", "client", "model"] as const).map(key => <label key={key} className="block text-sm font-medium" htmlFor={`quote-${key}`}>{({ title: "Project title", agency: "Your business name", client: "Client name", model: "Model / pricing reference" })[key]}<input id={`quote-${key}`} value={input[key]} maxLength={120} onChange={e => setInput({ ...input, [key]: e.target.value })} className="mt-1 w-full rounded-md border bg-background p-2.5" /></label>)}
          <label className="block text-sm font-medium" htmlFor="quote-scope">Scope and exclusions<textarea id="quote-scope" value={input.scope} onChange={e => setInput({ ...input, scope: e.target.value })} maxLength={4000} rows={5} className="mt-1 w-full rounded-md border bg-background p-2.5" /></label>
          <p className="text-xs text-muted-foreground">Do not include API keys or sensitive client records. Saved quotes are private.</p>
        </fieldset>
        <fieldset className="border rounded-2xl p-6 bg-card"><legend className="px-2 font-semibold">2. Costs, usage & target margin</legend><div className="grid sm:grid-cols-2 gap-4">
          {(Object.keys(quoteFields) as NumericKey[]).map(key => <label key={key} htmlFor={`quote-${key}`} className="text-sm font-medium">{quoteFields[key].label}<input id={`quote-${key}`} type="number" inputMode="decimal" min={key === "monthlyRequests" || key === "callsPerRequest" ? 1 : 0} max={quoteFields[key].max} step={quoteFields[key].step} value={input[key]} onChange={e => setInput({ ...input, [key]: Number(e.target.value) })} className="mt-1 w-full rounded-md border bg-background p-2.5" /></label>)}
        </div><p className="mt-4 text-xs text-muted-foreground">Example rates are illustrative. <Link href="/llm-pricing" className="underline">Check model prices</Link> before sending a proposal.</p></fieldset>
      </section>
      <section className="lg:sticky lg:top-20 self-start space-y-5" aria-label="Quote preview">
        {r && <><div className="rounded-2xl bg-slate-950 text-white p-7"><p className="text-emerald-300 text-xs uppercase tracking-widest">Suggested monthly retainer</p><p className="text-5xl font-bold mt-3" data-testid="quote-retainer">{money(r.minimumRetainer)}</p><p className="mt-3 text-slate-300">Plus {money(r.setupFee)} one-time setup</p><div className="grid grid-cols-2 gap-5 mt-6 pt-5 border-t border-slate-700"><div><p className="text-sm text-slate-400">Buffered delivery cost</p><p className="text-xl font-semibold">{money(r.bufferedCost)}/mo</p></div><div><p className="text-sm text-slate-400">Target gross margin</p><p className="text-xl font-semibold">{input.marginPercent}%</p></div></div></div>
          <div className="border rounded-2xl p-6 bg-card"><p className="uppercase text-xs tracking-widest text-muted-foreground">Client proposal preview</p><h2 className="font-semibold text-xl mt-3">{input.title}</h2><p className="text-sm text-muted-foreground mt-1">{input.agency || "Your business"} → {input.client || "Your client"}</p><p className="text-sm mt-4 whitespace-pre-wrap">{input.scope}</p><dl className="mt-5 space-y-3 text-sm">{[["Included requests / month",input.monthlyRequests.toLocaleString()],["Additional 1,000 requests",money(r.overagePer1000)],["First month including setup",money(r.firstMonthTotal)]].map(([label,value]) => <div key={label} className="flex justify-between gap-4"><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p className="text-xs text-muted-foreground mt-4">Extra support and platform costs are scoped separately. Final contract terms and taxes are excluded.</p></div>
          <details className="border rounded-xl p-5"><summary className="cursor-pointer font-medium text-sm">Internal costs & risk check</summary><dl className="mt-4 text-sm space-y-2">{[["Model usage",r.modelCost],["Support",r.supportCost],["Hosting + tools",r.platformCost],["Contingency",r.contingency],["Gross profit",r.monthlyGrossProfit]].map(([label,value]) => <div key={String(label)} className="flex justify-between"><dt>{label}</dt><dd>{money(Number(value))}</dd></div>)}</dl><p className="text-sm mt-4">If usage doubles without overage charges, modeled margin is {r.doubledUsageMarginPercent ?? 0}% (support and platform costs held fixed).</p><p className="mt-3 text-xs text-muted-foreground">Retainer = buffered delivery cost ÷ (1 − target margin). Margin is not markup. Internal costs are omitted from the client export.</p></details></>}
        {(error || calculation.error) && <p role="alert" className="text-sm text-red-700 border border-red-200 rounded-lg p-3">{error || calculation.error}</p>}
        {notice && <p role="status" className="text-sm p-3 bg-muted rounded-lg">{notice}</p>}
        <div className="border rounded-xl p-5 space-y-3"><Button className="w-full" variant="outline" onClick={save} disabled={busy || !r || (!!id && !ready)}>{busy ? "Working…" : user ? "Save private draft" : "Sign in to save draft"}</Button>
          {saved?.exportUnlocked ? <><p className="text-sm text-emerald-700">Export unlocked for this quote</p>{dirty ? <p className="text-sm">Save changes to export this revision.</p> : <div className="flex flex-wrap gap-3"><a className="underline text-sm" href={`/api/quotes/${saved.id}/export`} target="_blank" rel="noopener" onClick={() => trackQuote("quote_proposal_exported")}>Open proposal / Save as PDF</a><a className="underline text-sm" href={`/api/quotes/${saved.id}/export?format=csv`} onClick={() => trackQuote("quote_csv_exported")}>Internal CSV</a></div>}</> : <><Button className="w-full" onClick={checkout} disabled={busy || !r || (!!id && !ready)}>{user?.plan === "pro" ? "Unlock with your Pro plan" : "Export this client quote — $29"}</Button><p className="text-xs text-muted-foreground">One-time payment. One saved quote, revisions included. Client-ready print/PDF view and internal CSV. No subscription. You complete payment on Stripe.</p></>}
        </div><p className="text-xs text-muted-foreground">Estimates, not guaranteed profits. Verify provider rates, scope, taxes, and all operating costs before agreeing to a price.</p>
      </section>
    </div>}
    <section className="mt-16 border-t pt-10 max-w-3xl"><h2 className="text-2xl font-bold">How to price an AI automation service</h2><p className="mt-4 text-muted-foreground">Start with monthly usage and every model call in the workflow. Include hosting, tools, and delivery labor. Add contingency for retries and uneven usage. Divide the buffered cost by one minus your target margin for a cost-based price floor—not the maximum your client will pay.</p><h3 className="text-lg font-semibold mt-6">Setup fee or retainer?</h3><p className="mt-2 text-muted-foreground">Use a setup fee for implementation and a retainer for ongoing service. Set a usage allowance and overage policy. Revisit assumptions when the model, workflow, or volume changes.</p><Link href="/agents" className="inline-block mt-4 text-primary underline">Use this calculator from an AI agent →</Link></section>
  </div>;
}
