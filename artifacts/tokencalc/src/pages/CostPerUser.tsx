import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from "recharts";
import { fetchModels, type ModelPrice } from "@/lib/pricing";
import { calcCallCost, formatUSD, formatPct } from "@/lib/calculator";
import { ModelDropdown } from "@/components/ModelDropdown";
import { MarginHealthBadge } from "@/components/MarginHealthBadge";
import { InlineCostPreview } from "@/components/InlineCostPreview";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";

const CHART_COLORS = ['#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed', '#0891b2'];

const DEFAULT_MODEL_ID = "openai/gpt-4o";

export default function CostPerUser() {
  const [models, setModels] = useState<ModelPrice[]>([]);
  const [modelId, setModelId] = useState(DEFAULT_MODEL_ID);
  const [model, setModel] = useState<ModelPrice | null>(null);
  const [callsPerUserPerDay, setCallsPerUserPerDay] = useState(5);
  const [avgInputTokens, setAvgInputTokens] = useState(500);
  const [avgOutputTokens, setAvgOutputTokens] = useState(300);
  const [daysActivePerMonth, setDaysActivePerMonth] = useState(20);
  const [mau, setMau] = useState(1000);
  const [mauTarget, setMauTarget] = useState(10000);
  const [arpu, setArpu] = useState(19);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  useEffect(() => {
    fetchModels().then((m) => {
      setModels(m);
      const found = m.find((x) => x.id === DEFAULT_MODEL_ID) ?? m[Math.floor(m.length / 2)];
      setModel(found);
    });
  }, []);

  const handleModelChange = (m: ModelPrice) => {
    setModel(m);
    setModelId(m.id);
  };

  const callCost = model ? calcCallCost(avgInputTokens, avgOutputTokens, model) : 0;
  const cpau = callCost * callsPerUserPerDay * daysActivePerMonth;
  const totalMonthlyBill = cpau * mau;
  const projectedAtTarget = cpau * mauTarget;
  const projectedMRR = mauTarget * arpu;

  function getCPAU(m: ModelPrice) {
    const cost = calcCallCost(avgInputTokens, avgOutputTokens, m);
    return cost * callsPerUserPerDay * daysActivePerMonth;
  }

  const comparisons = compareIds
    .map((id) => models.find((m) => m.id === id))
    .filter(Boolean) as ModelPrice[];

  const allChartModels = model ? [model, ...comparisons] : [];

  const minMAU = Math.max(10, Math.floor(mau / 10));
  const maxMAU = mauTarget * 2;
  const chartPoints: Record<string, number>[] = [];
  for (let i = 0; i <= 30; i++) {
    const x = Math.round(minMAU * Math.pow(maxMAU / minMAU, i / 30));
    const point: Record<string, number> = { mau: x };
    for (const m of allChartModels) {
      point[m.id] = getCPAU(m) * x;
    }
    chartPoints.push(point);
  }

  const milestones = [500, 1000, 5000, 10000, 50000, 100000].filter(
    (v) => v >= minMAU && v <= maxMAU
  );

  const nearbyModels = models
    .filter((m) => m.id !== modelId)
    .sort((a, b) => Math.abs(getCPAU(a) - cpau) - Math.abs(getCPAU(b) - cpau))
    .slice(0, 4);

  const toggleCompare = (id: string) => {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const cpauColor = cpau < 1 ? "#16a34a" : cpau < 5 ? "#d97706" : cpau < 15 ? "#ea580c" : "#dc2626";

  function generateInsight() {
    if (!model) return "";
    const cheaper = nearbyModels.filter((m) => getCPAU(m) < cpau);
    if (cheaper.length > 0) {
      const alt = cheaper[0];
      const saving = cpau - getCPAU(alt);
      const savingAtMAU = saving * mau;
      const savingAtTarget = saving * mauTarget;
      return `At your current usage pattern (${callsPerUserPerDay} calls/day, ${avgInputTokens} input + ${avgOutputTokens} output tokens each), each user costs ${formatUSD(cpau, 4)}/month in ${model.name} API fees. Switching to ${alt.name} would drop that to ${formatUSD(getCPAU(alt), 4)}/user/month — saving ${formatUSD(savingAtMAU, 0)}/month at ${mau.toLocaleString()} MAU, or ${formatUSD(savingAtTarget, 0)}/month at ${mauTarget.toLocaleString()} MAU.`;
    }
    return `At your current usage pattern (${callsPerUserPerDay} calls/day, ${avgInputTokens} input + ${avgOutputTokens} output tokens each), each user costs ${formatUSD(cpau, 4)}/month in ${model.name} API fees. Total monthly bill at ${mau.toLocaleString()} MAU: ${formatUSD(totalMonthlyBill, 0)}.`;
  }

  return (
    <div className="min-h-screen bg-background">
      <title>LLM Cost Per User Calculator — AI API Cost Per MAU for SaaS</title>
      <meta name="description" content="Calculate exactly what each user costs you in LLM API fees per month. Enter your model, usage pattern, and user count to get cost per MAU, AI COGS, and margin impact." />

      <div className="bg-gradient-to-b from-primary/5 to-background border-b">
        <div className="container mx-auto px-4 py-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">What Does Each User Actually Cost You?</h1>
          <p className="text-lg text-muted-foreground max-w-2xl">Your LLM bill is a function of how many users you have and how much they use the AI. This calculator maps your token usage to a real dollar cost per user — the number that determines whether your SaaS is financially viable.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Inputs */}
          <div className="space-y-5 lg:col-span-1">
            <div className="bg-card border rounded-xl p-5 shadow-sm">
              <h2 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-4">Model & Usage</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Which model does your app use?</label>
                  <ModelDropdown value={modelId} onChange={handleModelChange} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">AI calls per active user per day: {callsPerUserPerDay}</label>
                  <input type="range" min={0.1} max={100} step={0.1} value={callsPerUserPerDay} onChange={(e) => setCallsPerUserPerDay(parseFloat(e.target.value))} className="w-full accent-primary" data-testid="slider-calls" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium block mb-1">Avg input tokens</label>
                    <input type="number" value={avgInputTokens} onChange={(e) => setAvgInputTokens(parseInt(e.target.value) || 0)} className="w-full border border-input rounded-lg px-2 py-1.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" data-testid="input-input-tokens" />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Avg output tokens</label>
                    <input type="number" value={avgOutputTokens} onChange={(e) => setAvgOutputTokens(parseInt(e.target.value) || 0)} className="w-full border border-input rounded-lg px-2 py-1.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" data-testid="input-output-tokens" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Days active per month: {daysActivePerMonth}</label>
                  <input type="range" min={1} max={31} value={daysActivePerMonth} onChange={(e) => setDaysActivePerMonth(parseInt(e.target.value))} className="w-full accent-primary" data-testid="slider-days-active" />
                  <p className="text-xs text-muted-foreground mt-1">Not everyone uses it daily — default 20 is realistic</p>
                </div>
                <InlineCostPreview callCost={callCost} cpau={cpau} monthlyCost={totalMonthlyBill} mau={mau} />
              </div>
            </div>

            <div className="bg-card border rounded-xl p-5 shadow-sm">
              <h2 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-4">Scale</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Current MAU: {mau.toLocaleString()}</label>
                  <div className="flex items-center gap-2">
                    <input type="range" min={10} max={500000} step={10} value={mau} onChange={(e) => setMau(parseInt(e.target.value))} className="flex-1 accent-primary" data-testid="slider-mau" />
                    <input type="number" value={mau} onChange={(e) => setMau(Math.max(10, parseInt(e.target.value) || 10))} className="w-24 border border-input rounded-lg px-2 py-1 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" data-testid="input-mau" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">MAU target (6 months)</label>
                  <input type="number" value={mauTarget} onChange={(e) => setMauTarget(Math.max(mau, parseInt(e.target.value) || mau))} className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" data-testid="input-mau-target" />
                  <p className="text-xs text-muted-foreground mt-1">Used to show projected future cost</p>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">What do you charge per user? ($)</label>
                  <input type="number" value={arpu} onChange={(e) => setArpu(parseFloat(e.target.value) || 0)} className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" data-testid="input-arpu" />
                  <p className="text-xs text-muted-foreground mt-1">Used to show danger zone in chart</p>
                </div>
              </div>
            </div>

            {/* Compare models */}
            {nearbyModels.length > 0 && (
              <div className="bg-card border rounded-xl p-5 shadow-sm">
                <h2 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-3">Compare with:</h2>
                <div className="flex flex-wrap gap-2">
                  {nearbyModels.map((m, i) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleCompare(m.id)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${compareIds.includes(m.id) ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-accent"}`}
                      style={compareIds.includes(m.id) ? { background: CHART_COLORS[i + 1] ?? CHART_COLORS[0] } : undefined}
                      data-testid={`button-compare-${m.id}`}
                    >
                      {m.name.split(":").pop()?.trim() ?? m.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Outputs */}
          <div className="lg:col-span-2 space-y-5">
            {/* KPI Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-card border rounded-xl p-5 shadow-sm" data-testid="card-cpau">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Cost Per Active User</p>
                <p className="text-3xl font-bold" style={{ color: cpauColor }} data-testid="value-cpau">{formatUSD(cpau, 4)}</p>
                <p className="text-xs text-muted-foreground mt-1">Based on {callsPerUserPerDay} calls/day × {daysActivePerMonth} active days/mo</p>
              </div>
              <div className="bg-card border rounded-xl p-5 shadow-sm" data-testid="card-monthly-bill">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Total Monthly AI Bill</p>
                <p className="text-3xl font-bold text-foreground" data-testid="value-monthly-bill">{formatUSD(totalMonthlyBill, 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">{mau.toLocaleString()} users × {formatUSD(cpau, 4)}</p>
              </div>
              <div className={`bg-card border rounded-xl p-5 shadow-sm ${projectedAtTarget > projectedMRR * 0.5 ? "border-destructive/30 bg-destructive/5" : ""}`} data-testid="card-projected">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Projected at {mauTarget.toLocaleString()} MAU</p>
                <p className={`text-3xl font-bold ${projectedAtTarget > projectedMRR * 0.5 ? "text-destructive" : "text-foreground"}`} data-testid="value-projected">
                  {formatUSD(projectedAtTarget, 0)}
                </p>
                {projectedAtTarget > projectedMRR * 0.5 && (
                  <p className="text-xs text-destructive mt-1">Warning: exceeds 50% of projected MRR</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">At your {mauTarget.toLocaleString()} MAU target</p>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-card border rounded-xl p-5 shadow-sm" data-testid="card-scaling-chart">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">AI Cost Scaling</h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartPoints} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="mau"
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}`} tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(val: number, name: string) => [formatUSD(val, 0), models.find((m) => m.id === name)?.name ?? name]}
                    labelFormatter={(label) => `MAU: ${Number(label).toLocaleString()}`}
                  />
                  <Legend />
                  {milestones.map((m) => (
                    <ReferenceLine key={m} x={m} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  ))}
                  {/* Danger zone reference */}
                  {arpu > 0 && model && (
                    <ReferenceLine
                      y={arpu * mau * 0.3}
                      stroke="#dc2626"
                      strokeDasharray="4 2"
                      label={{ value: "30% of MRR", position: "insideTopLeft", fill: "#dc2626", fontSize: 10 }}
                    />
                  )}
                  {allChartModels.map((m, i) => (
                    <Line
                      key={m.id}
                      type="monotone"
                      dataKey={m.id}
                      name={m.id}
                      stroke={CHART_COLORS[i % CHART_COLORS.length]}
                      strokeWidth={i === 0 ? 2.5 : 1.5}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Model comparison table */}
            {model && nearbyModels.length > 0 && (
              <div className="bg-card border rounded-xl p-5 shadow-sm overflow-x-auto" data-testid="card-model-comparison">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Model Comparison</h3>
                <table className="w-full text-sm min-w-max">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="text-left pb-2">Model</th>
                      <th className="text-right pb-2">Input $/M</th>
                      <th className="text-right pb-2">Output $/M</th>
                      <th className="text-right pb-2 flex items-center gap-1 justify-end">
                        CPAU
                        <span title="Cost Per Active User per month based on your usage pattern" className="cursor-help text-muted-foreground">?</span>
                      </th>
                      <th className="text-right pb-2">Monthly @ {mau.toLocaleString()}</th>
                      <th className="text-right pb-2">vs. Current</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[model, ...nearbyModels].map((m, i) => {
                      const mCpau = getCPAU(m);
                      const monthly = mCpau * mau;
                      const diff = monthly - totalMonthlyBill;
                      const isSelected = m.id === modelId;
                      return (
                        <tr key={m.id} className={isSelected ? "bg-primary/5" : ""} data-testid={`row-model-${m.id}`}>
                          <td className="py-2">
                            <span className="font-medium">{m.name}</span>
                            {isSelected && <span className="ml-2 text-xs text-primary font-semibold">current</span>}
                          </td>
                          <td className="text-right text-muted-foreground">${m.inputPricePerMillion.toFixed(2)}</td>
                          <td className="text-right text-muted-foreground">${m.outputPricePerMillion.toFixed(2)}</td>
                          <td className="text-right">{formatUSD(mCpau, 4)}</td>
                          <td className="text-right">{formatUSD(monthly, 0)}</td>
                          <td className="text-right">
                            {isSelected ? (
                              <span className="text-muted-foreground">—</span>
                            ) : diff < 0 ? (
                              <span className="text-green-600 dark:text-green-400 font-medium">Save {formatUSD(-diff, 0)}/mo</span>
                            ) : (
                              <span className="text-muted-foreground">+{formatUSD(diff, 0)}/mo</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Insight */}
            <div className="bg-card border rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Insight</h3>
              <p className="text-sm text-foreground">{generateInsight()}</p>
            </div>

            <DisclaimerFooter />
          </div>
        </div>
      </div>
    </div>
  );
}
