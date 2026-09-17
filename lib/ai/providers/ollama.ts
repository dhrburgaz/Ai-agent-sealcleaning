/**
 * Tier 1 (local/free) adapter — Ollama-compatible `/api/generate` endpoint.
 * Local inference has no per-call cost, so it is intentionally not gated by
 * the €0 paid-budget check (see lib/ai/router.ts) — only Tier 2+ are.
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

export function createOllamaProvider(config: ProviderConfig): ModelProvider {
  const baseUrl = config.baseUrl ?? 'http://localhost:11434';
  const transport = config.transport ?? defaultTransport;

  return {
    key: 'ollama',
    capabilities: {
      text: true,
      vision: false,
      json: true,
      toolCalls: false,
      contextWindowTokens: 8192,
      freeOrPaid: 'free',
    },
    async complete(request: ModelCompletionRequest): Promise<ModelCompletionResult> {
      const fullPrompt = request.systemPrompt ? `${request.systemPrompt}\n\n${request.prompt}` : request.prompt;
      const response = await transport(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model,
          prompt: fullPrompt,
          stream: false,
          format: request.responseFormat === 'json' ? 'json' : undefined,
        }),
      });

      if (!response.ok) {
        throw new ProviderHttpError(response.status, `Ollama request failed with status ${response.status}`);
      }

      const data = (await response.json()) as { response?: string };
      const text = data.response ?? '';
      return {
        text,
        estimatedTokensIn: estimateTokens(fullPrompt),
        estimatedTokensOut: estimateTokens(text),
        raw: data,
      };
    },
  };
}
