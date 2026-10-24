import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { quoteApi } from "@/pages/QuoteBuilder";
type Connection = { id: string; clientId: string; scope: string[]; metadata?: Record<string,unknown> };
export function SavedQuotes() {
  const [quotes,setQuotes] = useState<{id:string;title:string;updatedAt:string}[]>([]);
  const [connections,setConnections] = useState<Connection[]>([]);
  const [error,setError] = useState("");
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState("");
  async function reload() {
    const results = await Promise.allSettled([quoteApi<{quotes:typeof quotes}>("/api/quotes"),quoteApi<{items:Connection[]}>("/api/agent-connections")]);
    if(results[0].status === "fulfilled") setQuotes(results[0].value.quotes);
    if(results[1].status === "fulfilled") setConnections(results[1].value.items);
    const failure = results.find(r=>r.status === "rejected");
    if(failure?.status === "rejected") setError(String(failure.reason));
    setLoading(false);
  }
  useEffect(()=>{void reload();},[]);
  async function revoke(id:string) {
    if(!window.confirm("Revoke this agent’s access to your private quotes?")) return;
    setBusy(id);setError("");
    try { await quoteApi("/api/agent-connections","POST",{grantId:id});await reload(); }
    catch(e){setError((e as Error).message);} finally {setBusy("");}
  }
  return <div className="max-w-3xl mx-auto mt-8 px-4 space-y-8">
    <section className="border rounded-xl p-6"><div className="flex flex-wrap justify-between gap-3"><h2 className="text-xl font-semibold">Your private quotes</h2><Link href="/ai-service-pricing-calculator" className="text-primary underline">New quote</Link></div>{loading ? <p className="mt-4">Loading…</p> : quotes.length ? <ul className="divide-y mt-4">{quotes.map(q=><li key={q.id} className="py-3"><Link href={`/quote/${q.id}`} className="text-primary font-medium underline">{q.title}</Link><p className="text-xs text-muted-foreground">Updated {new Date(q.updatedAt).toLocaleDateString()}</p></li>)}</ul> : <p className="mt-4 text-muted-foreground">No saved quotes yet. Start with a free estimate.</p>}</section>
    <section className="border rounded-xl p-6"><h2 className="text-xl font-semibold">Connected agents</h2><p className="mt-2 text-sm text-muted-foreground">Only agents you explicitly approve can access private quotes. Revocation may take a short time to propagate.</p>{connections.length ? <ul className="mt-4 space-y-4">{connections.map(c=><li key={c.id} className="flex justify-between gap-3"><div className="min-w-0"><p className="text-sm break-all">{c.clientId}</p><p className="text-xs text-muted-foreground">{c.scope.join(", ")}</p></div><Button size="sm" variant="outline" disabled={busy===c.id} onClick={()=>revoke(c.id)}>Revoke</Button></li>)}</ul> : <p className="mt-4 text-sm">No active agent connections.</p>}</section>
    {error && <p role="alert" className="text-red-700">{error}</p>}
  </div>;
}
