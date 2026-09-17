/**
 * Section 15 — AI Provider Router adapter contract. Every adapter implements
 * this interface so the router can treat Ollama/OpenAI-compatible/Gemini/
 * NVIDIA/Anthropic uniformly. None of these are ever called with real
 * credentials in this repository or its test suite — see model-router.ts for
 * the budget/capability/circuit-breaker gate that sits in front of all of them.
 */

export interface ModelCapabilities {
  text: boolean;
  vision: boolean;
  json: boolean;
  toolCalls: boolean;
  contextWindowTokens: number;
  freeOrPaid: 'free' | 'paid';
}

export interface ModelCompletionRequest {
  systemPrompt?: string;
  prompt: string;
  images?: { base64: string; mimeType: string }[];
  maxOutputTokens?: number;
  responseFormat?: 'text' | 'json';
}

export interface ModelCompletionResult {
  text: string;
  estimatedTokensIn: number;
  estimatedTokensOut: number;
  raw?: unknown;
}

/** Injectable HTTP transport so provider adapters are unit-testable without a real network call. */
export type Transport = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown>; text: () => Promise<string> }>;

export const defaultTransport: Transport = (url, init) => fetch(url, init);

export interface ProviderConfig {
  baseUrl?: string;
  apiKey?: string;
  model: string;
  transport?: Transport;
}

export interface ModelProvider {
  key: 'ollama' | 'openai_compatible' | 'gemini' | 'nvidia' | 'anthropic';
  capabilities: ModelCapabilities;
  complete(request: ModelCompletionRequest): Promise<ModelCompletionResult>;
}

/** A rough, deliberately conservative token estimate (chars/4) — good enough for budget guarding, not billing. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export class ProviderHttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ProviderHttpError';
  }
}
