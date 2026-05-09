import { useState, useEffect, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";
import { ChevronDown, ChevronUp, Share2, Lock } from "lucide-react";
import { fetchModels, pickLatestModel, type ModelPrice } from "@/lib/pricing";
import {
  calcCallCost, calcGrossMargin, calcBreakevenMAU, calcPowerUserRisk,
  formatUSD, formatPct, getMarginColor, getMarginLabel
} from "@/lib/calculator";
import { ModelDropdown } from "@/components/ModelDropdown";
import { MarginHealthBadge } from "@/components/MarginHealthBadge";
import { InlineCostPreview } from "@/components/InlineCostPreview";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";
import { SeoFooter } from "@/components/SeoFooter";

function parseQP() {
  const p = new URLSearchParams(window.location.search);
  return {
    arpu: parseFloat(p.get("arpu") ?? "19"),
    mau: parseInt(p.get("mau") ?? "1000"),
    fixedCosts: parseFloat(p.get("fixedCosts") ?? "2000"),
    modelId: p.get("model") ?? "",
    callsPerUserPerDay: parseFloat(p.get("calls") ?? "5"),
    avgInputTokens: parseInt(p.get("input") ?? "500"),
    avgOutputTokens: parseInt(p.get("output") ?? "300"),
    otherCOGSPerUser: parseFloat(p.get("otherCOGS") ?? "1.50"),
    lightPct: parseFloat(p.get("lightPct") ?? "60"),
    avgPct: parseFloat(p.get("avgPct") ?? "30"),
    heavyPct: parseFloat(p.get("heavyPct") ?? "10"),
  };
}

function generateMarginCurveData(
  arpu: number,
  callsPerUserPerDay: number,
  avgInputTokens: number,
  avgOutputTokens: number,
  model: ModelPrice,
  otherCOGSPerUser: number,
  currentMAU: number
) {
  const points = [];
  for (let i = 0; i <= 50; i++) {
    const mau = Math.round(100 * Math.pow(500, i / 50));
    const result = calcGrossMargin(mau, arpu, callsPerUserPerDay, avgInputTokens, avgOutputTokens, model, otherCOGSPerUser);
    points.push({ mau, margin: Math.max(-100, result.grossMarginPct) });
  }
  return points;
}

function getInterpretation(marginPct: number, model: ModelPrice | null, inputTokens: number, callsPerDay: number) {
  if (marginPct < 0) {
    return "At current pricing and usage, you lose money on every user. You need to either raise prices, reduce calls per user, or switch to a cheaper model.";
  }
  if (marginPct < 50) {
    return `Your margins are below software norms (70–80%). Consider reducing input tokens or calls per day, or switching to a cheaper model to improve margins.`;
  }
  if (marginPct < 70) {
    return "Decent, but below the 70% software benchmark. You have room to grow before this becomes a problem.";
  }
  return "Healthy margins. Your AI costs are under control at current scale.";
}

export default function MarginSimulator() {
  const qp = parseQP();
  const [arpu, setArpu] = useState(qp.arpu);
  const [mau, setMau] = useState(qp.mau);
  const [fixedCosts, setFixedCosts] = useState(qp.fixedCosts);
  const [modelId, setModelId] = useState(qp.modelId);
  const [model, setModel] = useState<ModelPrice | null>(null);
  const [callsPerUserPerDay, setCallsPerUserPerDay] = useState(qp.callsPerUserPerDay);
  const [avgInputTokens, setAvgInputTokens] = useState(qp.avgInputTokens);
  const [avgOutputTokens, setAvgOutputTokens] = useState(qp.avgOutputTokens);
  const [otherCOGSPerUser, setOtherCOGSPerUser] = useState(qp.otherCOGSPerUser);
  const [lightPct, setLightPct] = useState(qp.lightPct);
  const [avgPct, setAvgPct] = useState(qp.avgPct);
  const [heavyPct, setHeavyPct] = useState(qp.heavyPct);
  const [showCOGS, setShowCOGS] = useState(false);
  const [showPowerUser, setShowPowerUser] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchModels().then((models) => {
      const found = (modelId && models.find((m) => m.id === modelId)) || pickLatestModel(models);
      if (found) {
        setModel(found);
        if (!modelId) setModelId(found.id);
      }
    });
  }, []);

  useEffect(() => {
    if (!model) return;
    const found = null; // model is already set by dropdown selection
  }, [modelId]);

  const callCost = model ? calcCallCost(avgInputTokens, avgOutputTokens, model) : 0;
  const cpau = callCost * callsPerUserPerDay * 30;
  const monthlyCost = cpau * mau;

  const marginResult = model
    ? calcGrossMargin(mau, arpu, callsPerUserPerDay, avgInputTokens, avgOutputTokens, model, otherCOGSPerUser)
    : { mrr: 0, aiCOGS: 0, otherCOGS: 0, grossProfit: 0, grossMarginPct: 0, cpau: 0, revenuePerUser: 0, contributionMarginPerUser: 0 };

  const breakevenMAU = calcBreakevenMAU(fixedCosts, arpu, marginResult.cpau, otherCOGSPerUser);

  const powerUserResult = calcPowerUserRisk(
    marginResult.cpau, mau,
    lightPct / 100, avgPct / 100, heavyPct / 100
  );

  const curveData = model
    ? generateMarginCurveData(arpu, callsPerUserPerDay, avgInputTokens, avgOutputTokens, model, otherCOGSPerUser, mau)
    : [];

  const marginColor = getMarginColor(marginResult.grossMarginPct);
  const pctSum = lightPct + avgPct + heavyPct;

  const handleShare = () => {
    const params = new URLSearchParams({
      arpu: String(arpu),
      mau: String(mau),
      fixedCosts: String(fixedCosts),
      model: modelId,
      calls: String(callsPerUserPerDay),
      input: String(avgInputTokens),
      output: String(avgOutputTokens),
      otherCOGS: String(otherCOGSPerUser),
      lightPct: String(lightPct),
      avgPct: String(avgPct),
      heavyPct: String(heavyPct),
    });
    const url = `${window.location.origin}${window.location.pathname}?${params}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleModelChange = (m: ModelPrice) => {
    setModel(m);
    setModelId(m.id);
  };

  return (
    <div className="min-h-screen bg-background">
      <title>LLM Margin Calculator for SaaS Founders | LLM Margin</title>
      <meta name="description" content="Model gross margin, cost-per-user, and breakeven MAU for any AI product. Plug in your LLM pricing and see if your unit economics actually work. Free." />
      <meta property="og:title" content="Will your AI SaaS actually make money? Find out in 60 seconds." />
      <meta property="og:description" content="LLM Margin simulates gross margin and power-user risk for AI products. Built by founders, for founders staring at OpenAI invoices." />
      <link rel="canonical" href="https://tokencalc.com/" />

      {/* Hero */}
      <div className="bg-gradient-to-b from-primary/5 to-background border-b">
        <div className="container mx-auto px-4 py-10">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Model your AI SaaS margins before your OpenAI bill eats them.</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mb-3">LLM Margin is a margin simulator for founders shipping AI products. Enter your pricing, token usage, and MAU — get gross margin, cost-per-user, and breakeven in seconds.</p>
          <ul className="space-y-1 max-w-2xl mb-3">
            {[
              "See your true gross margin % after LLM costs — not the back-of-napkin version your board deck uses.",
              "Spot power-user risk before one heavy customer wipes out margin on the other 500.",
              "Find the MAU number where you actually break even at your current pricing.",
            ].map((b) => (
              <li key={b} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-primary mt-1">·</span>{b}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground italic">Used by 400+ SaaS founders to pressure-test AI unit economics before raising or repricing.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">

          {/* Left: Inputs */}
          <div className="space-y-6">
            {/* Section 1: SaaS Pricing */}
            <div className="bg-card border rounded-xl p-6 shadow-sm">
              <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-4">Your SaaS Pricing</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Monthly price per user (ARPU) ($)</label>
                  <input
                    type="number"
                    value={arpu}
                    onChange={(e) => setArpu(parseFloat(e.target.value) || 0)}
                    className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    min={0}
                    step={1}
                    data-testid="input-arpu"
                  />
                  <p className="text-xs text-muted-foreground mt-1">What you charge per user per month. If you have tiers, use your most common paid tier.</p>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Monthly Active Users (MAU): {mau.toLocaleString()}</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={10}
                      max={100000}
                      step={10}
                      value={mau}
                      onChange={(e) => setMau(parseInt(e.target.value))}
                      className="flex-1 accent-primary"
                      data-testid="slider-mau"
                    />
                    <input
                      type="number"
                      value={mau}
                      onChange={(e) => setMau(Math.max(10, Math.min(100000, parseInt(e.target.value) || 10)))}
                      className="w-24 border border-input rounded-lg px-2 py-1 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      data-testid="input-mau"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Fixed monthly costs ($)</label>
                  <input
                    type="number"
                    value={fixedCosts}
                    onChange={(e) => setFixedCosts(parseFloat(e.target.value) || 0)}
                    className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    min={0}
                    data-testid="input-fixed-costs"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Hosting, tools, your own salary if applicable. Used for breakeven calculation.</p>
                </div>
              </div>
            </div>

            {/* Section 2: AI Usage */}
            <div className="bg-card border rounded-xl p-6 shadow-sm">
              <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-4">Your AI Usage</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-1">LLM Model</label>
                  <ModelDropdown value={modelId} onChange={handleModelChange} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">AI calls per user per day: {callsPerUserPerDay}</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0.1}
                      max={100}
                      step={0.1}
                      value={callsPerUserPerDay}
                      onChange={(e) => setCallsPerUserPerDay(parseFloat(e.target.value))}
                      className="flex-1 accent-primary"
                      data-testid="slider-calls"
                    />
                    <input
                      type="number"
                      value={callsPerUserPerDay}
                      onChange={(e) => setCallsPerUserPerDay(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                      className="w-20 border border-input rounded-lg px-2 py-1 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      step={0.1}
                      data-testid="input-calls"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">How many times does your app call the LLM per active user per day?</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium block mb-1">Avg input tokens/call</label>
                    <input
                      type="number"
                      value={avgInputTokens}
                      onChange={(e) => setAvgInputTokens(parseInt(e.target.value) || 0)}
                      className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      min={0}
                      data-testid="input-input-tokens"
                    />
                    <p className="text-xs text-muted-foreground mt-1">System prompt + user message + history</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Avg output tokens/call</label>
                    <input
                      type="number"
                      value={avgOutputTokens}
                      onChange={(e) => setAvgOutputTokens(parseInt(e.target.value) || 0)}
                      className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      min={0}
                      data-testid="input-output-tokens"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Typical AI response length</p>
                  </div>
                </div>
                <InlineCostPreview callCost={callCost} cpau={cpau} monthlyCost={monthlyCost} mau={mau} />
              </div>
            </div>

            {/* Section 3: Other COGS (collapsible) */}
            <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => setShowCOGS((v) => !v)}
                className="w-full flex items-center justify-between px-6 py-4 text-sm font-semibold hover:bg-accent/50 transition-colors"
                data-testid="toggle-other-cogs"
              >
                <span>Other COGS (per user/month)</span>
                {showCOGS ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showCOGS && (
                <div className="px-6 pb-4 border-t">
                  <div className="mt-3">
                    <label className="text-sm font-medium block mb-1">Other COGS per user/month ($)</label>
                    <input
                      type="number"
                      value={otherCOGSPerUser}
                      onChange={(e) => setOtherCOGSPerUser(parseFloat(e.target.value) || 0)}
                      step={0.01}
                      className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      data-testid="input-other-cogs"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Stripe fees (~2.9% of ARPU), hosting per user, support cost. Default $1.50 is a reasonable estimate.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Section 4: Power User Risk (collapsible) */}
            <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => setShowPowerUser((v) => !v)}
                className="w-full flex items-center justify-between px-6 py-4 text-sm font-semibold hover:bg-accent/50 transition-colors"
                data-testid="toggle-power-user"
              >
                <span>Advanced: Power User Risk</span>
                {showPowerUser ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showPowerUser && (
                <div className="px-6 pb-4 border-t">
                  <p className="text-xs text-muted-foreground mt-3 mb-3">Research shows top 10% of AI SaaS users typically consume 3× average usage. Adjust based on your product.</p>
                  {Math.round(pctSum) !== 100 && (
                    <p className="text-xs text-destructive font-medium mb-2" data-testid="power-user-validation">
                      Percentages must sum to 100% (currently {pctSum.toFixed(0)}%)
                    </p>
                  )}
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium block mb-1">Light users (0.33× avg): {lightPct}%</label>
                      <input type="range" min={0} max={100} value={lightPct} onChange={(e) => setLightPct(parseInt(e.target.value))} className="w-full accent-primary" data-testid="slider-light-pct" />
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-1">Average users (1.67× avg): {avgPct}%</label>
                      <input type="range" min={0} max={100} value={avgPct} onChange={(e) => setAvgPct(parseInt(e.target.value))} className="w-full accent-primary" data-testid="slider-avg-pct" />
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-1">Heavy users (3× avg): {heavyPct}%</label>
                      <input type="range" min={0} max={100} value={heavyPct} onChange={(e) => setHeavyPct(parseInt(e.target.value))} className="w-full accent-primary" data-testid="slider-heavy-pct" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Outputs */}
          <div className="space-y-4">
            {/* KPI Cards 2x2 */}
            <div className="grid grid-cols-2 gap-4">
              {/* Card 1: Gross Margin */}
              <div className="bg-card border rounded-xl p-5 shadow-sm" data-testid="card-gross-margin">
                <div className="flex items-start justify-between mb-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Gross Margin</p>
                  <MarginHealthBadge pct={marginResult.grossMarginPct} />
                </div>
                <p className="text-4xl font-bold" style={{ color: marginColor }} data-testid="value-gross-margin">
                  {formatPct(marginResult.grossMarginPct)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Software target: 70–80%. AI SaaS avg: 45–60%.</p>
              </div>

              {/* Card 2: MRR */}
              <div className="bg-card border rounded-xl p-5 shadow-sm" data-testid="card-mrr">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">MRR</p>
                <p className="text-4xl font-bold text-foreground" data-testid="value-mrr">{formatUSD(marginResult.mrr, 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">{mau.toLocaleString()} users × {formatUSD(arpu)}/mo</p>
              </div>

              {/* Card 3: AI COGS */}
              <div className={`bg-card border rounded-xl p-5 shadow-sm ${marginResult.aiCOGS > marginResult.mrr * 0.4 ? "border-destructive/30 bg-destructive/5" : ""}`} data-testid="card-ai-cogs">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">AI COGS / month</p>
                <p className={`text-4xl font-bold ${marginResult.aiCOGS > marginResult.mrr * 0.4 ? "text-destructive" : "text-foreground"}`} data-testid="value-ai-cogs">
                  {formatUSD(marginResult.aiCOGS, 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{formatUSD(marginResult.cpau, 4)}/user/mo · {model?.name ?? "—"}</p>
              </div>

              {/* Card 4: Breakeven */}
              <div className="bg-card border rounded-xl p-5 shadow-sm" data-testid="card-breakeven">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Breakeven MAU</p>
                {marginResult.contributionMarginPerUser <= 0 ? (
                  <p className="text-sm font-bold text-destructive mt-2" data-testid="value-breakeven-never">
                    ⚠ Never breaks even at current pricing
                  </p>
                ) : (
                  <p className={`text-4xl font-bold ${mau >= breakevenMAU ? "text-green-600 dark:text-green-400" : "text-destructive"}`} data-testid="value-breakeven">
                    {isFinite(breakevenMAU) ? breakevenMAU.toLocaleString() : "∞"}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">Min paying users needed to cover fixed costs.</p>
              </div>
            </div>

            {/* Margin Chart */}
            <div className="bg-card border rounded-xl p-5 shadow-sm" data-testid="card-margin-chart">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Gross Margin vs. Scale</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={curveData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="marginGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={marginColor} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={marginColor} stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="mau"
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
                    tick={{ fontSize: 10 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis
                    domain={[-100, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 10 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip
                    formatter={(val: number) => [`${val.toFixed(1)}%`, "Gross Margin"]}
                    labelFormatter={(label) => `MAU: ${Number(label).toLocaleString()}`}
                  />
                  <ReferenceLine y={70} stroke="#16a34a" strokeDasharray="4 2" label={{ value: "Target (70%)", position: "insideTopRight", fill: "#16a34a", fontSize: 10 }} />
                  <ReferenceLine x={mau} stroke="#2563eb" strokeDasharray="4 2" />
                  <Area type="monotone" dataKey="margin" stroke={marginColor} fill="url(#marginGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground mt-3">
                {getInterpretation(marginResult.grossMarginPct, model, avgInputTokens, callsPerUserPerDay)}
              </p>
            </div>

            {/* Power User Risk Table */}
            {showPowerUser && (
              <div className="bg-card border rounded-xl p-5 shadow-sm" data-testid="card-power-user">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Power User Risk</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="text-left pb-2">Segment</th>
                      <th className="text-right pb-2">% Users</th>
                      <th className="text-right pb-2">Cost/User/Mo</th>
                      <th className="text-right pb-2">Monthly Burden</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr>
                      <td className="py-1.5 text-muted-foreground">Light users</td>
                      <td className="text-right">{lightPct}%</td>
                      <td className="text-right">{formatUSD(powerUserResult.lightUserCost, 4)}</td>
                      <td className="text-right">{formatUSD(mau * (lightPct / 100) * powerUserResult.lightUserCost, 0)}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 text-muted-foreground">Average users</td>
                      <td className="text-right">{avgPct}%</td>
                      <td className="text-right">{formatUSD(powerUserResult.avgUserCost, 4)}</td>
                      <td className="text-right">{formatUSD(mau * (avgPct / 100) * powerUserResult.avgUserCost, 0)}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 text-muted-foreground">Heavy users</td>
                      <td className="text-right">{heavyPct}%</td>
                      <td className="text-right font-semibold text-destructive">{formatUSD(powerUserResult.heavyUserCost, 4)}</td>
                      <td className="text-right font-semibold text-destructive">{formatUSD(powerUserResult.top10PctMonthlyBurden, 0)}</td>
                    </tr>
                    <tr className="border-t-2">
                      <td className="py-1.5 font-semibold">Blended (real)</td>
                      <td className="text-right font-semibold">100%</td>
                      <td className="text-right font-semibold">{formatUSD(powerUserResult.blendedCPAU, 4)}</td>
                      <td className="text-right font-semibold">{formatUSD(mau * powerUserResult.blendedCPAU, 0)}</td>
                    </tr>
                  </tbody>
                </table>
                <p className="text-xs text-muted-foreground mt-3">
                  Your top {heavyPct}% of users cost {formatUSD(powerUserResult.top10PctMonthlyBurden, 0)} more per month than your flat CPAU estimate suggests. That's {powerUserResult.upliftVsFlatPct.toFixed(1)}% higher than if usage were uniform.
                </p>
              </div>
            )}

            {/* Share / Export */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card hover:bg-accent transition-colors text-sm font-medium"
                data-testid="button-share"
              >
                <Share2 className="w-4 h-4" />
                {copied ? "Copied!" : "Share this calculation"}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card hover:bg-accent transition-colors text-sm font-medium text-muted-foreground"
                data-testid="button-export"
              >
                <Lock className="w-4 h-4" />
                Export PDF (Pro)
              </button>
            </div>

            <DisclaimerFooter />

            <SeoFooter
              paragraph="LLM Margin is a free LLM margin calculator built for SaaS founders, indie hackers, and AI startup CTOs who need real answers about AI cost per user, gross margin, and breakeven MAU. Instead of spreadsheets and Reddit threads, plug your OpenAI, Anthropic, or open-source LLM pricing into the SaaS margin simulator and get cost-per-user, power-user risk, and monthly burn in one view. If you're pricing an AI product or defending margin to investors, this is the fastest way to stress-test the model."
              links={[
                { href: "/cost-per-user", anchor: "LLM cost per user calculator" },
                { href: "/budget-planner", anchor: "AI budget planner for founders" },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
