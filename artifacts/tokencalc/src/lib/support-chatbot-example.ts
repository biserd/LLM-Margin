import type { QuoteInput } from "../../../api-server/src/worker/quote-model";

export const supportChatbotExampleSlug = "ai-support-chatbot";

export const supportChatbotExample: QuoteInput = {
  title: "AI support chatbot",
  agency: "",
  client: "",
  model: "Illustrative model rates",
  scope: "Build and maintain one website support chatbot using client-approved help-center content. Includes installation, answer testing, human handoff for questions outside scope, and monthly monitoring. New data sources, integrations, additional channels, and extra support are quoted separately.",
  monthlyRequests: 10000,
  callsPerRequest: 2,
  inputTokens: 2000,
  outputTokens: 500,
  inputPrice: 3,
  outputPrice: 15,
  platformCost: 50,
  supportHours: 3,
  hourlyCost: 60,
  setupHours: 20,
  contingencyPercent: 20,
  marginPercent: 60,
};
