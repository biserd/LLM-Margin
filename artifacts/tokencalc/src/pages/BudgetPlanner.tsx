import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";
import { Plus, Trash2, Lock } from "lucide-react";
import { fetchModels, type ModelPrice } from "@/lib/pricing";
import { calcCallCost, formatUSD, formatPct, getMarginColor } from "@/lib/calculator";
import { ModelDropdown } from "@/components/ModelDropdown";
import { MarginHealthBadge } from "@/components/MarginHealthBadge";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";

const CHART_COLORS = ['#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed', '#0891b2', '#f59e0b', '#8b5cf6'];

interface Tier {
  id: string;
  name: string;
  mau: number;
  pricePerMonth: number;
  isPaying: boolean;
}

interface FeatureUsageRow {
  tierId: string;
  callsPerUserPerDay: number;
  inputTokens: number;
  outputTokens: number;
}

interface Feature {
  id: string;
  name: string;
  modelId: string;
  usage: FeatureUsageRow[];
}

function mkId() {
  return Math.random().toString(36).slice(2, 8);
}

function defaultFeature(tiers: Tier[], modelId: string): Feature {
  return {
    id: mkId(),
    name: "AI Feature",
    modelId,
    usage: tiers.map((t) => ({
      tierId: t.id,
      callsPerUserPerDay: t.isPaying ? 8 : 2,
      inputTokens: t.isPaying ? 600 : 300,
      outputTokens: t.isPaying ? 400 : 150,
    })),
  };
}

const DEFAULT_MODEL_ID = "openai/gpt-4o";

export default function BudgetPlanner() {
  const [models, setModels] = useState<ModelPrice[]>([]);
  const [productName, setProductName] = useState("My AI Product");
  const [growthRate, setGrowthRate] = useState(15);
  const [churnRate, setChurnRate] = useState(5);
  const [fixedCosts, setFixedCosts] = useState(2000);
  const [stripeFeePct, setStripeFeePct] = useState(2.9);
  const [otherVariableCost, setOtherVariableCost] = useState(0.5);

  const freeId = mkId();
  const proId = mkId();

  const [tiers, setTiers] = useState<Tier[]>([
    { id: freeId, name: "Free", mau: 5000, pricePerMonth: 0, isPaying: false },
    { id: proId, name: "Pro", mau: 800, pricePerMonth: 19, isPaying: true },
  ]);

  const [features, setFeatures] = useState<Feature[]>(() => [
    {
      id: mkId(),
      name: "AI Chat Assistant",
      modelId: DEFAULT_MODEL_ID,
      usage: [
        { tierId: freeId, callsPerUserPerDay: 2, inputTokens: 300, outputTokens: 150 },
        { tierId: proId, callsPerUserPerDay: 8, inputTokens: 600, outputTokens: 400 },
      ],
    },
  ]);

  useEffect(() => {
    fetchModels().then(setModels);
  }, []);

  function getModel(modelId: string): ModelPrice | undefined {
    return models.find((m) => m.id === modelId);
  }

  function featureCostForTier(feature: Feature, tier: Tier): number {
    const model = getModel(feature.modelId);
    if (!model) return 0;
    const usage = feature.usage.find((u) => u.tierId === tier.id);
    if (!usage) return 0;
    const callCost = calcCallCost(usage.inputTokens, usage.outputTokens, model);
    return callCost * usage.callsPerUserPerDay * 30 * tier.mau;
  }

  function totalAISpend(): number {
    return features.reduce((sum, f) => sum + tiers.reduce((s2, t) => s2 + featureCostForTier(f, t), 0), 0);
  }

  function mrr(): number {
    return tiers.filter((t) => t.isPaying).reduce((sum, t) => sum + t.pricePerMonth * t.mau, 0);
  }

  function stripeFees(): number {
    return mrr() * (stripeFeePct / 100);
  }

  function otherCOGS(): number {
    return tiers.filter((t) => t.isPaying).reduce((sum, t) => sum + t.mau * otherVariableCost, 0);
  }

  function grossMarginPct(): number {
    const revenue = mrr();
    if (revenue <= 0) return 0;
    const profit = revenue - totalAISpend() - stripeFees() - otherCOGS() - fixedCosts;
    return (profit / revenue) * 100;
  }

  function aiAsRevenuePercent(): number {
    const revenue = mrr();
    if (revenue <= 0) return 0;
    return (totalAISpend() / revenue) * 100;
  }

  // Bar chart: X=tiers, stacked by feature
  const barData = tiers.map((t) => {
    const row: Record<string, string | number> = { tier: t.name };
    for (const f of features) {
      row[f.id] = featureCostForTier(f, t);
    }
    return row;
  });

  // 12-month projection
  const projectionData = [];
  let currentMAU = tiers.reduce((s, t) => s + t.mau, 0);
  let currentMRRPaying = mrr();
  for (let month = 1; month <= 12; month++) {
    const growthFactor = 1 + growthRate / 100 - churnRate / 100;
    currentMAU = currentMAU * growthFactor;
    currentMRRPaying = currentMRRPaying * growthFactor;
    const aiCost = totalAISpend() * Math.pow(growthFactor, month - 1);
    projectionData.push({
      month: `Mo ${month}`,
      "AI Cost": Math.round(aiCost),
      MRR: Math.round(currentMRRPaying * Math.pow(growthFactor, month - 2) || currentMRRPaying),
      "Gross Margin %": currentMRRPaying > 0 ? Math.round(grossMarginPct()) : 0,
    });
  }

  const totalMAU = tiers.reduce((s, t) => s + t.mau, 0);
  const freeTierCost = tiers
    .filter((t) => !t.isPaying)
    .reduce((sum, t) => sum + features.reduce((s2, f) => s2 + featureCostForTier(f, t), 0), 0);

  const addTier = () => {
    if (tiers.length >= 5) return;
    const newTier: Tier = { id: mkId(), name: `Tier ${tiers.length + 1}`, mau: 100, pricePerMonth: 49, isPaying: true };
    setTiers((prev) => [...prev, newTier]);
    setFeatures((prev) =>
      prev.map((f) => ({
        ...f,
        usage: [...f.usage, { tierId: newTier.id, callsPerUserPerDay: 10, inputTokens: 500, outputTokens: 300 }],
      }))
    );
  };

  const removeTier = (id: string) => {
    setTiers((prev) => prev.filter((t) => t.id !== id));
    setFeatures((prev) =>
      prev.map((f) => ({ ...f, usage: f.usage.filter((u) => u.tierId !== id) }))
    );
  };

  const addFeature = () => {
    if (features.length >= 8) return;
    const defaultModelId = models[Math.floor(models.length / 2)]?.id ?? DEFAULT_MODEL_ID;
    const f = defaultFeature(tiers, defaultModelId);
    setFeatures((prev) => [...prev, f]);
  };

  const removeFeature = (id: string) => {
    setFeatures((prev) => prev.filter((f) => f.id !== id));
  };

  const updateTier = (id: string, field: keyof Tier, value: string | number | boolean) => {
    setTiers((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  };

  const updateFeatureName = (id: string, name: string) => {
    setFeatures((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)));
  };

  const updateFeatureModel = (id: string, model: ModelPrice) => {
    setFeatures((prev) => prev.map((f) => (f.id === id ? { ...f, modelId: model.id } : f)));
  };

  const updateUsage = (featureId: string, tierId: string, field: keyof FeatureUsageRow, value: number) => {
    setFeatures((prev) =>
      prev.map((f) =>
        f.id === featureId
          ? { ...f, usage: f.usage.map((u) => (u.tierId === tierId ? { ...u, [field]: value } : u)) }
          : f
      )
    );
  };

  const aiRevPct = aiAsRevenuePercent();
  const aiRevColor = aiRevPct < 20 ? "#16a34a" : aiRevPct < 40 ? "#d97706" : "#dc2626";
  const gm = grossMarginPct();

  return (
    <div className="min-h-screen bg-background">
      <title>AI Budget Planner for Founders — Plan Your LLM Costs Before You Build</title>
      <meta name="description" content="Plan your AI API budget before you ship. Model your costs across multiple features, usage tiers, and growth scenarios." />

      <div className="bg-gradient-to-b from-primary/5 to-background border-b">
        <div className="container mx-auto px-4 py-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Plan Your AI Costs Before Your Investors Ask</h1>
          <p className="text-lg text-muted-foreground max-w-2xl">Every AI feature has a unit economics story. This planner helps you model that story across multiple features, user tiers, and growth scenarios — so you're never surprised by your cloud bill.</p>
          <ul className="mt-3 space-y-1">
            {["Add multiple AI features to your product and see the combined monthly cost",
              "Model Free vs. Pro tier usage separately — because free users still cost you",
              "Export a shareable cost projection to include in your pitch deck or board update",
            ].map((item) => (
              <li key={item} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-primary">·</span> {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Summary Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border rounded-xl p-5 shadow-sm" data-testid="card-total-ai-spend">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Total Monthly AI Spend</p>
            <p className="text-3xl font-bold text-foreground" data-testid="value-total-ai-spend">{formatUSD(totalAISpend(), 0)}</p>
          </div>
          <div className="bg-card border rounded-xl p-5 shadow-sm" data-testid="card-mrr">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">MRR</p>
            <p className="text-3xl font-bold text-foreground" data-testid="value-mrr">{formatUSD(mrr(), 0)}</p>
          </div>
          <div className="bg-card border rounded-xl p-5 shadow-sm" data-testid="card-gross-margin">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Blended Gross Margin</p>
            <div className="flex items-center gap-2">
              <p className="text-3xl font-bold" style={{ color: getMarginColor(gm) }} data-testid="value-gross-margin">{formatPct(gm)}</p>
              <MarginHealthBadge pct={gm} />
            </div>
          </div>
          <div className="bg-card border rounded-xl p-5 shadow-sm" data-testid="card-ai-revenue-pct">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">AI as % of Revenue</p>
            <p className="text-3xl font-bold" style={{ color: aiRevColor }} data-testid="value-ai-revenue-pct">{formatPct(aiRevPct)}</p>
            <p className="text-xs text-muted-foreground mt-1">{aiRevPct < 20 ? "Under control" : aiRevPct < 40 ? "Watch closely" : "Dangerously high"}</p>
          </div>
        </div>

        {/* Step 1: Tiers */}
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-4">Step 1: Your User Tiers</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-max">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left pb-2 pr-3">Tier Name</th>
                  <th className="text-right pb-2 pr-3">Users (MAU)</th>
                  <th className="text-right pb-2 pr-3">Price/Month ($)</th>
                  <th className="text-center pb-2 pr-3">Paying?</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tiers.map((t) => (
                  <tr key={t.id} data-testid={`row-tier-${t.id}`}>
                    <td className="py-2 pr-3">
                      <input
                        type="text"
                        value={t.name}
                        onChange={(e) => updateTier(t.id, "name", e.target.value)}
                        className="border border-input rounded px-2 py-1 bg-background text-sm w-24 focus:outline-none focus:ring-1 focus:ring-primary"
                        data-testid={`input-tier-name-${t.id}`}
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="number"
                        value={t.mau}
                        onChange={(e) => updateTier(t.id, "mau", parseInt(e.target.value) || 0)}
                        className="border border-input rounded px-2 py-1 bg-background text-sm w-24 text-right focus:outline-none focus:ring-1 focus:ring-primary"
                        data-testid={`input-tier-mau-${t.id}`}
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="number"
                        value={t.pricePerMonth}
                        onChange={(e) => updateTier(t.id, "pricePerMonth", parseFloat(e.target.value) || 0)}
                        className="border border-input rounded px-2 py-1 bg-background text-sm w-20 text-right focus:outline-none focus:ring-1 focus:ring-primary"
                        data-testid={`input-tier-price-${t.id}`}
                      />
                    </td>
                    <td className="py-2 pr-3 text-center">
                      <input
                        type="checkbox"
                        checked={t.isPaying}
                        onChange={(e) => updateTier(t.id, "isPaying", e.target.checked)}
                        className="accent-primary"
                        data-testid={`checkbox-tier-paying-${t.id}`}
                      />
                    </td>
                    <td className="py-2">
                      {tiers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTier(t.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          data-testid={`button-remove-tier-${t.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {tiers.length < 5 && (
            <button
              type="button"
              onClick={addTier}
              className="mt-3 flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
              data-testid="button-add-tier"
            >
              <Plus className="w-4 h-4" /> Add Tier
            </button>
          )}
        </div>

        {/* Step 2: Features */}
        <div>
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-4">Step 2: Your AI Features</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {features.map((f, fi) => (
              <div key={f.id} className="bg-card border rounded-xl p-5 shadow-sm relative" data-testid={`card-feature-${f.id}`}>
                <button
                  type="button"
                  onClick={() => removeFeature(f.id)}
                  className="absolute top-4 right-4 text-muted-foreground hover:text-destructive transition-colors"
                  data-testid={`button-remove-feature-${f.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="space-y-3 pr-6">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Feature name</label>
                    <input
                      type="text"
                      value={f.name}
                      onChange={(e) => updateFeatureName(f.id, e.target.value)}
                      className="w-full border border-input rounded px-2 py-1.5 bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                      data-testid={`input-feature-name-${f.id}`}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Model</label>
                    <ModelDropdown
                      value={f.modelId}
                      onChange={(m) => updateFeatureModel(f.id, m)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-2">Usage per tier</label>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b text-muted-foreground">
                            <th className="text-left pb-1 pr-2">Tier</th>
                            <th className="text-right pb-1 pr-2">Calls/day</th>
                            <th className="text-right pb-1 pr-2">In tokens</th>
                            <th className="text-right pb-1">Out tokens</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {tiers.map((t) => {
                            const usage = f.usage.find((u) => u.tierId === t.id);
                            if (!usage) return null;
                            return (
                              <tr key={t.id}>
                                <td className="py-1 pr-2 font-medium">{t.name}</td>
                                <td className="py-1 pr-2">
                                  <input
                                    type="number"
                                    value={usage.callsPerUserPerDay}
                                    onChange={(e) => updateUsage(f.id, t.id, "callsPerUserPerDay", parseFloat(e.target.value) || 0)}
                                    className="w-14 border border-input rounded px-1 py-0.5 bg-background text-right focus:outline-none focus:ring-1 focus:ring-primary"
                                    step={0.5}
                                  />
                                </td>
                                <td className="py-1 pr-2">
                                  <input
                                    type="number"
                                    value={usage.inputTokens}
                                    onChange={(e) => updateUsage(f.id, t.id, "inputTokens", parseInt(e.target.value) || 0)}
                                    className="w-16 border border-input rounded px-1 py-0.5 bg-background text-right focus:outline-none focus:ring-1 focus:ring-primary"
                                  />
                                </td>
                                <td className="py-1">
                                  <input
                                    type="number"
                                    value={usage.outputTokens}
                                    onChange={(e) => updateUsage(f.id, t.id, "outputTokens", parseInt(e.target.value) || 0)}
                                    className="w-16 border border-input rounded px-1 py-0.5 bg-background text-right focus:outline-none focus:ring-1 focus:ring-primary"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground pt-1 border-t">
                    Total cost: <span className="font-semibold text-foreground">
                      {formatUSD(tiers.reduce((sum, t) => sum + featureCostForTier(f, t), 0), 0)}/mo
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {features.length < 8 && (
            <button
              type="button"
              onClick={addFeature}
              className="mt-4 flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
              data-testid="button-add-feature"
            >
              <Plus className="w-4 h-4" /> Add Feature
            </button>
          )}
        </div>

        {/* Step 3: Fixed Costs */}
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-4">Step 3: Fixed Costs</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Monthly fixed costs ($)</label>
              <input type="number" value={fixedCosts} onChange={(e) => setFixedCosts(parseFloat(e.target.value) || 0)} className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" data-testid="input-fixed-costs" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Stripe fee (%)</label>
              <input type="number" value={stripeFeePct} onChange={(e) => setStripeFeePct(parseFloat(e.target.value) || 0)} step={0.1} className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" data-testid="input-stripe-fee" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Other variable cost/paying user ($)</label>
              <input type="number" value={otherVariableCost} onChange={(e) => setOtherVariableCost(parseFloat(e.target.value) || 0)} step={0.01} className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" data-testid="input-other-variable" />
            </div>
          </div>
        </div>

        {/* Cost Breakdown by Feature */}
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-4">Cost Breakdown by Feature</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="tier" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => formatUSD(v, 0)} />
              <Legend />
              {features.map((f, i) => (
                <Bar key={f.id} dataKey={f.id} name={f.name} fill={CHART_COLORS[i % CHART_COLORS.length]} stackId="a" />
              ))}
            </BarChart>
          </ResponsiveContainer>

          {/* Breakdown Table */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm min-w-max">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left pb-2 pr-3">Feature</th>
                  <th className="text-right pb-2 pr-3">Model</th>
                  {tiers.map((t) => <th key={t.id} className="text-right pb-2 pr-3">{t.name} Cost</th>)}
                  <th className="text-right pb-2">Total/Mo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {features.map((f) => (
                  <tr key={f.id}>
                    <td className="py-1.5 pr-3 font-medium">{f.name}</td>
                    <td className="py-1.5 pr-3 text-right text-muted-foreground text-xs">
                      {models.find((m) => m.id === f.modelId)?.name?.split(":").pop()?.trim() ?? "—"}
                    </td>
                    {tiers.map((t) => (
                      <td key={t.id} className="py-1.5 pr-3 text-right">{formatUSD(featureCostForTier(f, t), 0)}</td>
                    ))}
                    <td className="py-1.5 text-right font-semibold">
                      {formatUSD(tiers.reduce((sum, t) => sum + featureCostForTier(f, t), 0), 0)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 font-bold">
                  <td className="py-1.5 pr-3">Total</td>
                  <td></td>
                  {tiers.map((t) => (
                    <td key={t.id} className="py-1.5 pr-3 text-right">
                      {formatUSD(features.reduce((sum, f) => sum + featureCostForTier(f, t), 0), 0)}
                    </td>
                  ))}
                  <td className="py-1.5 text-right">{formatUSD(totalAISpend(), 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Key insight */}
          {freeTierCost > 0 && mrr() > 0 && (
            <p className="text-xs text-muted-foreground mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              Your Free tier costs {formatUSD(freeTierCost, 0)}/month but generates $0 in revenue. That's {((freeTierCost / totalAISpend()) * 100).toFixed(0)}% of your total AI spend going to non-paying users. Consider adding a usage cap for free users.
            </p>
          )}
        </div>

        {/* 12-Month Projection */}
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">12-Month Cost Projection</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Growth/mo:</label>
                <input
                  type="number"
                  value={growthRate}
                  onChange={(e) => setGrowthRate(parseFloat(e.target.value) || 0)}
                  className="w-14 border border-input rounded px-2 py-1 bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  data-testid="input-growth-rate"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Churn/mo:</label>
                <input
                  type="number"
                  value={churnRate}
                  onChange={(e) => setChurnRate(parseFloat(e.target.value) || 0)}
                  className="w-14 border border-input rounded px-2 py-1 bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  data-testid="input-churn-rate"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={projectionData} margin={{ top: 10, right: 40, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="aiGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#dc2626" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}`} tick={{ fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(val: number, name: string) => [name === "Gross Margin %" ? `${val}%` : formatUSD(val, 0), name]} />
              <Legend />
              <Area yAxisId="left" type="monotone" dataKey="AI Cost" stroke="#dc2626" fill="url(#aiGrad)" strokeWidth={2} />
              <Area yAxisId="left" type="monotone" dataKey="MRR" stroke="#16a34a" fill="url(#mrrGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted-foreground mt-3">
            At {growthRate}% monthly growth, you'll reach roughly {Math.round(totalMAU * Math.pow(1 + (growthRate - churnRate) / 100, 11)).toLocaleString()} MAU in 12 months. Projected AI spend at that point: {formatUSD(totalAISpend() * Math.pow(1 + (growthRate - churnRate) / 100, 11), 0)}/month. Projected MRR: {formatUSD(mrr() * Math.pow(1 + (growthRate - churnRate) / 100, 11), 0)}/month. Gross margin: {formatPct(gm)}.
          </p>
        </div>

        {/* Export */}
        <div className="flex items-center gap-3">
          <div>
            <label className="text-sm font-medium block mb-1">Product name</label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="border border-input rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              data-testid="input-product-name"
            />
          </div>
          <div className="pt-5">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card hover:bg-accent transition-colors text-sm font-medium text-muted-foreground"
              data-testid="button-export-budget"
            >
              <Lock className="w-4 h-4" />
              Export Budget Summary (Pro)
            </button>
          </div>
        </div>

        <DisclaimerFooter />
      </div>
    </div>
  );
}
