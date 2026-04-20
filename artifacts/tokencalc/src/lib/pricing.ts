export interface ModelPrice {
  id: string;
  name: string;
  provider: string;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
  cacheReadPricePerMillion: number | null;
  cacheWritePricePerMillion: number | null;
  contextLength: number;
  tokenizer: 'cl100k_base' | 'o200k_base' | 'claude' | 'sentencepiece' | 'unknown';
}

function inferTokenizer(modelId: string): ModelPrice['tokenizer'] {
  if (modelId.includes('gpt-4o') || modelId.includes('gpt-5')) return 'o200k_base';
  if (modelId.includes('gpt-4') || modelId.includes('gpt-3.5')) return 'cl100k_base';
  if (modelId.includes('claude')) return 'claude';
  if (modelId.includes('gemini') || modelId.includes('llama') || modelId.includes('mistral')) return 'sentencepiece';
  return 'unknown';
}

export async function fetchModels(): Promise<ModelPrice[]> {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models');
    if (!res.ok) throw new Error('OpenRouter API error');
    const data = await res.json();
    const models = data.data
      .filter((m: any) => parseFloat(m.pricing?.prompt) > 0)
      .map((m: any) => ({
        id: m.id,
        name: m.name,
        provider: m.id.split('/')[0],
        inputPricePerMillion: parseFloat(m.pricing.prompt) * 1_000_000,
        outputPricePerMillion: parseFloat(m.pricing.completion) * 1_000_000,
        cacheReadPricePerMillion: m.pricing.input_cache_read
          ? parseFloat(m.pricing.input_cache_read) * 1_000_000 : null,
        cacheWritePricePerMillion: m.pricing.input_cache_write
          ? parseFloat(m.pricing.input_cache_write) * 1_000_000 : null,
        contextLength: m.context_length,
        tokenizer: inferTokenizer(m.id),
      }))
      .sort((a: ModelPrice, b: ModelPrice) => a.inputPricePerMillion - b.inputPricePerMillion);
    return models;
  } catch {
    const res = await fetch('/model-prices-fallback.json');
    const data = await res.json();
    return data;
  }
}

export const PROVIDER_COLORS: Record<string, string> = {
  openai: '#10a37f',
  anthropic: '#d4a27f',
  google: '#4285f4',
  meta: '#0668e1',
  mistralai: '#ff7000',
  cohere: '#39594d',
  deepmind: '#4285f4',
  qwen: '#ef4444',
  deepseek: '#6366f1',
  perplexity: '#20808d',
};

export function getProviderColor(provider: string): string {
  return PROVIDER_COLORS[provider.toLowerCase()] ?? '#6b7280';
}
