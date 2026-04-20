import type { ModelPrice } from './pricing';

export function calcCallCost(
  inputTokens: number,
  outputTokens: number,
  model: ModelPrice
): number {
  return (
    (inputTokens * model.inputPricePerMillion) / 1_000_000 +
    (outputTokens * model.outputPricePerMillion) / 1_000_000
  );
}

export function calcMonthlyCost(
  callCostUSD: number,
  callsPerDay: number
): number {
  return callCostUSD * callsPerDay * 30;
}

export interface MarginResult {
  mrr: number;
  aiCOGS: number;
  otherCOGS: number;
  grossProfit: number;
  grossMarginPct: number;
  cpau: number;
  revenuePerUser: number;
  contributionMarginPerUser: number;
}

export function calcGrossMargin(
  mau: number,
  arpu: number,
  callsPerUserPerDay: number,
  avgInputTokens: number,
  avgOutputTokens: number,
  model: ModelPrice,
  otherCOGSPerUser: number = 1.50
): MarginResult {
  const callCost = calcCallCost(avgInputTokens, avgOutputTokens, model);
  const cpau = callCost * callsPerUserPerDay * 30;
  const mrr = mau * arpu;
  const aiCOGS = mau * cpau;
  const otherCOGS = mau * otherCOGSPerUser;
  const grossProfit = mrr - aiCOGS - otherCOGS;
  return {
    mrr,
    aiCOGS,
    otherCOGS,
    grossProfit,
    grossMarginPct: mrr > 0 ? (grossProfit / mrr) * 100 : 0,
    cpau,
    revenuePerUser: arpu,
    contributionMarginPerUser: arpu - cpau - otherCOGSPerUser,
  };
}

export function calcBreakevenMAU(
  fixedCostsPerMonth: number,
  arpu: number,
  cpau: number,
  otherCOGSPerUser: number = 1.50
): number {
  const contributionMargin = arpu - cpau - otherCOGSPerUser;
  if (contributionMargin <= 0) return Infinity;
  return Math.ceil(fixedCostsPerMonth / contributionMargin);
}

export interface PowerUserResult {
  blendedCPAU: number;
  lightUserCost: number;
  avgUserCost: number;
  heavyUserCost: number;
  upliftVsFlatPct: number;
  top10PctMonthlyBurden: number;
}

export function calcPowerUserRisk(
  baseCPAU: number,
  mau: number,
  lightPct: number = 0.60,
  avgPct: number = 0.30,
  heavyPct: number = 0.10,
  lightMultiplier: number = 0.33,
  avgMultiplier: number = 1.67,
  heavyMultiplier: number = 3.00
): PowerUserResult {
  const lightUserCost = baseCPAU * lightMultiplier;
  const avgUserCost = baseCPAU * avgMultiplier;
  const heavyUserCost = baseCPAU * heavyMultiplier;
  const blendedCPAU =
    lightPct * lightUserCost +
    avgPct * avgUserCost +
    heavyPct * heavyUserCost;
  return {
    blendedCPAU,
    lightUserCost,
    avgUserCost,
    heavyUserCost,
    upliftVsFlatPct: baseCPAU > 0 ? ((blendedCPAU - baseCPAU) / baseCPAU) * 100 : 0,
    top10PctMonthlyBurden: mau * heavyPct * heavyUserCost,
  };
}

export function calcCachingSavings(
  sysPromptTokens: number,
  callsPerDay: number,
  model: ModelPrice
): { monthlySavings: number; savingsPct: number } {
  if (!model.cacheReadPricePerMillion) return { monthlySavings: 0, savingsPct: 0 };
  const withoutCaching =
    (sysPromptTokens * model.inputPricePerMillion) / 1_000_000;
  const withCaching =
    (sysPromptTokens * model.cacheReadPricePerMillion) / 1_000_000;
  const savingsPerCall = withoutCaching - withCaching;
  const totalCalls = callsPerDay * 30;
  const monthlySavings = savingsPerCall * (totalCalls - 1);
  const savingsPct = withoutCaching > 0
    ? (savingsPerCall / withoutCaching) * 100 : 0;
  return { monthlySavings, savingsPct };
}

export function formatUSD(n: number, decimals = 2): string {
  if (!isFinite(n)) return '$∞';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

export function formatCompact(n: number): string {
  if (!isFinite(n)) return '∞';
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n);
}

export function formatPct(n: number, decimals = 1): string {
  return `${n.toFixed(decimals)}%`;
}

export function getMarginColor(pct: number): string {
  if (pct >= 70) return '#16a34a';
  if (pct >= 50) return '#d97706';
  if (pct >= 30) return '#ea580c';
  return '#dc2626';
}

export function getMarginLabel(pct: number): string {
  if (pct >= 70) return 'Healthy';
  if (pct >= 50) return 'Watch';
  if (pct >= 30) return 'At Risk';
  if (pct >= 0) return 'Danger';
  return 'Unprofitable';
}
