/**
 * Generic OpenAI-compatible Chat Completions adapter — works for OpenAI itself
 * and for any provider exposing the same `/v1/chat/completions` shape.
 * Tier 3 (economical paid) by default; only ever called once the router's
 * budget gate (lib/ai/router.ts) has explicitly allowed it.
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

interface ChatCompletionResponse {
  choices?: { message?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export function createOpenAiCompatibleProvider(config: ProviderConfig): ModelProvider {
  const baseUrl = config.baseUrl ?? 'https://api.openai.com';
  const transport = config.transport ?? defaultTransport;

  if (!config.apiKey) {
    throw new Error('OpenAI-compatible provider requires an API key.');
  }

  return {
    key: 'openai_compatible',
    capabilities: {
      text: true,
      vision: true,
      json: true,
      toolCalls: true,
      contextWindowTokens: 128000,
      freeOrPaid: 'paid',
    },
    async complete(request: ModelCompletionRequest): Promise<ModelCompletionResult> {
      const messages = [
        ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
        { role: 'user', content: request.prompt },
      ];

      const response = await transport(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          max_tokens: request.maxOutputTokens,
          response_format: request.responseFormat === 'json' ? { type: 'json_object' } : undefined,
        }),
      });

      if (!response.ok) {
        throw new ProviderHttpError(response.status, `OpenAI-compatible request failed with status ${response.status}`);
      }

      const data = (await response.json()) as ChatCompletionResponse;
      const text = data.choices?.[0]?.message?.content ?? '';
      return {
        text,
        estimatedTokensIn: data.usage?.prompt_tokens ?? estimateTokens(request.prompt),
        estimatedTokensOut: data.usage?.completion_tokens ?? estimateTokens(text),
        raw: data,
      };
    },
  };
}
