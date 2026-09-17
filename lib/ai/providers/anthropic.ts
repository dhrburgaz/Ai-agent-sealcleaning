/**
 * Anthropic Messages API adapter. Tier 4 (premium reasoning) by default.
 * Only ever invoked once the router's budget gate has explicitly allowed it —
 * this repository never sets an ANTHROPIC_API_KEY or calls this in tests.
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

interface AnthropicResponse {
  content?: { type: string; text?: string }[];
  usage?: { input_tokens?: number; output_tokens?: number };
}

export function createAnthropicProvider(config: ProviderConfig): ModelProvider {
  const baseUrl = config.baseUrl ?? 'https://api.anthropic.com';
  const transport = config.transport ?? defaultTransport;

  if (!config.apiKey) {
    throw new Error('Anthropic provider requires an API key.');
  }

  return {
    key: 'anthropic',
    capabilities: {
      text: true,
      vision: true,
      json: true,
      toolCalls: true,
      contextWindowTokens: 200000,
      freeOrPaid: 'paid',
    },
    async complete(request: ModelCompletionRequest): Promise<ModelCompletionResult> {
      const response = await transport(`${baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: request.maxOutputTokens ?? 1024,
          system: request.systemPrompt,
          messages: [{ role: 'user', content: request.prompt }],
        }),
      });

      if (!response.ok) {
        throw new ProviderHttpError(response.status, `Anthropic request failed with status ${response.status}`);
      }

      const data = (await response.json()) as AnthropicResponse;
      const text = data.content?.find((block) => block.type === 'text')?.text ?? '';
      return {
        text,
        estimatedTokensIn: data.usage?.input_tokens ?? estimateTokens(request.prompt),
        estimatedTokensOut: data.usage?.output_tokens ?? estimateTokens(text),
        raw: data,
      };
    },
  };
}
