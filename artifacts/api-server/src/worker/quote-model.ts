/** The same deterministic model is used by the UI, REST, MCP, and A2A. USD only. */
export const QUOTE_PRICE_CENTS = 2900;
export const QUOTE_VERSION = "1.0";
export const quoteFields = {
  monthlyRequests: { label: "Client requests / month", default: 10000, max: 100000000, step: 100 },
  callsPerRequest: { label: "Model calls / request", default: 2, max: 1000, step: 1 },
  inputTokens: { label: "Input tokens / model call", default: 2000, max: 10000000, step: 100 },
  outputTokens: { label: "Output tokens / model call", default: 500, max: 1000000, step: 100 },
  inputPrice: { label: "Input price ($ / million tokens)", default: 3, max: 10000, step: 0.01 },
  outputPrice: { label: "Output price ($ / million tokens)", default: 15, max: 10000, step: 0.01 },
  platformCost: { label: "Hosting + tools ($ / month)", default: 50, max: 1000000, step: 1 },
  supportHours: { label: "Support hours / month", default: 3, max: 10000, step: 0.5 },
  hourlyCost: { label: "Your delivery cost ($ / hour)", default: 60, max: 10000, step: 1 },
  setupHours: { label: "Setup + implementation hours", default: 20, max: 10000, step: 1 },
  contingencyPercent: { label: "Cost contingency (%)", default: 20, max: 200, step: 1 },
  marginPercent: { label: "Target gross margin (%)", default: 60, max: 95, step: 1 },
} as const;
export type NumericKey = keyof typeof quoteFields;
export type QuoteInput = Record<NumericKey, number> & { title: string; agency: string; client: string; scope: string; model: string };
export const defaultQuote: QuoteInput = {
  ...Object.fromEntries(Object.entries(quoteFields).map(([key, f]) => [key, f.default])) as Record<NumericKey, number>,
  title: "AI support assistant", agency: "", client: "", model: "Custom model rates",
  scope: "Build and maintain a support assistant using approved knowledge-base content. Includes monthly monitoring and the usage allowance below. Human review is required for sensitive answers. Integrations, new data sources, and out-of-scope changes are quoted separately.",
};
export const quoteInputSchema = {
  type: "object", additionalProperties: false,
  properties: {
    ...Object.fromEntries(Object.entries(quoteFields).map(([k, f]) => [k, { type: "number", minimum: k === "monthlyRequests" || k === "callsPerRequest" ? 1 : 0, maximum: f.max, description: f.label, default: f.default }])),
    title: { type: "string", maxLength: 120 }, agency: { type: "string", maxLength: 120 },
    client: { type: "string", maxLength: 120 }, model: { type: "string", maxLength: 120 }, scope: { type: "string", maxLength: 4000 },
  },
};
export function parseQuote(value: unknown): QuoteInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Quote inputs must be an object.");
  const input = value as Record<string, unknown>;
  const result = { ...defaultQuote };
  for (const key of Object.keys(input)) if (!Object.hasOwn(quoteInputSchema.properties,key)) throw new Error(`Unknown quote field: ${key}`);
  for (const key of Object.keys(quoteFields) as NumericKey[]) {
    const number = Object.hasOwn(input,key) ? input[key] : defaultQuote[key];
    const minimum = key === "monthlyRequests" || key === "callsPerRequest" ? 1 : 0;
    if (typeof number !== "number" || !Number.isFinite(number) || number < minimum || number > quoteFields[key].max) throw new Error(`${quoteFields[key].label} must be between ${minimum} and ${quoteFields[key].max}.`);
    result[key] = number;
  }
  for (const key of ["title", "agency", "client", "scope", "model"] as const) {
    const field = Object.hasOwn(input,key) ? input[key] : defaultQuote[key];
    if (typeof field !== "string" || field.length > (key === "scope" ? 4000 : 120)) throw new Error(`Invalid ${key}.`);
    result[key] = field.trim();
  }
  if (!result.title) throw new Error("A project title is required.");
  return result;
}
const cents = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export function calculateQuote(q: QuoteInput) {
  const modelCostPerRequest = q.callsPerRequest * (q.inputTokens * q.inputPrice + q.outputTokens * q.outputPrice) / 1000000;
  const modelCost = modelCostPerRequest * q.monthlyRequests;
  const supportCost = q.supportHours * q.hourlyCost;
  const cost = modelCost + supportCost + q.platformCost;
  const bufferedCost = cost * (1 + q.contingencyPercent / 100);
  const marginDivisor = 1 - q.marginPercent / 100;
  const minimumRetainer = Math.ceil(bufferedCost / marginDivisor * 100) / 100;
  const setupFee = Math.ceil(q.setupHours * q.hourlyCost * (1 + q.contingencyPercent / 100) / marginDivisor * 100) / 100;
  return {
    currency: "USD", version: QUOTE_VERSION, modelCost: cents(modelCost), supportCost: cents(supportCost),
    platformCost: q.platformCost, baseCost: cents(cost), bufferedCost: cents(bufferedCost),
    contingency: cents(bufferedCost - cost), minimumRetainer, setupFee,
    firstMonthTotal: cents(minimumRetainer + setupFee), monthlyGrossProfit: cents(minimumRetainer - bufferedCost),
    includedRequests: q.monthlyRequests,
    overagePer1000: Math.ceil(modelCostPerRequest * 1000 * (1 + q.contingencyPercent / 100) / marginDivisor * 100) / 100,
    doubledUsageMarginPercent: minimumRetainer ? cents((minimumRetainer - (cost + modelCost) * (1 + q.contingencyPercent / 100)) / minimumRetainer * 100) : null,
    assumptions: ["Estimates, not provider quotes or guaranteed profits.", "Model prices are supplied by you; verify current provider rates.", "Gross margin includes the entered delivery costs and contingency, but excludes taxes, sales costs, and unentered overhead.", "Overage covers model usage only. Extra support and platform costs must be scoped separately."],
  };
}
export type QuoteResult = ReturnType<typeof calculateQuote>;
export const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
