/**
 * Google Gemini adapter (generateContent REST endpoint). Tier 2 (hosted-free)
 * when using a free-quota key, or Tier 3 for paid usage — the caller decides
 * which tier this counts as when routing; only ever invoked once the budget
 * gate in lib/ai/router.ts has explicitly allowed the call.
 */
import {
  defaultTransport,
  estimateTokens,
  ProviderHttpError,
  type ModelCompletionRequest,
  type ModelCompletionResult,
  type ModelProvider,
  type ProviderConfig,
} from './types';

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
}

export function createGeminiProvider(config: ProviderConfig): ModelProvider {
  const baseUrl = config.baseUrl ?? 'https://generativelanguage.googleapis.com';
  const transport = config.transport ?? defaultTransport;

  if (!config.apiKey) {
    throw new Error('Gemini provider requires an API key.');
  }

  return {
    key: 'gemini',
    capabilities: {
      text: true,
      vision: true,
      json: true,
      toolCalls: true,
      contextWindowTokens: 1000000,
      freeOrPaid: 'paid',
    },
    async complete(request: ModelCompletionRequest): Promise<ModelCompletionResult> {
      const parts: { text: string }[] = [{ text: request.prompt }];
      const url = `${baseUrl}/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;

      const response = await transport(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          systemInstruction: request.systemPrompt ? { parts: [{ text: request.systemPrompt }] } : undefined,
          generationConfig: {
            maxOutputTokens: request.maxOutputTokens,
            responseMimeType: request.responseFormat === 'json' ? 'application/json' : undefined,
          },
        }),
      });

      if (!response.ok) {
        throw new ProviderHttpError(response.status, `Gemini request failed with status ${response.status}`);
      }

      const data = (await response.json()) as GeminiResponse;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      return {
        text,
        estimatedTokensIn: data.usageMetadata?.promptTokenCount ?? estimateTokens(request.prompt),
        estimatedTokensOut: data.usageMetadata?.candidatesTokenCount ?? estimateTokens(text),
        raw: data,
      };
    },
  };
}
