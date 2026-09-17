/**
 * NVIDIA NIM adapter. NVIDIA's hosted model catalog exposes an
 * OpenAI-compatible `/v1/chat/completions` endpoint, so this is a thin
 * wrapper with NVIDIA's own default base URL rather than a reimplementation.
 */
import { createOpenAiCompatibleProvider } from './openai-compatible';
import type { ModelProvider, ProviderConfig } from './types';

export function createNvidiaProvider(config: ProviderConfig): ModelProvider {
  const provider = createOpenAiCompatibleProvider({
    ...config,
    baseUrl: config.baseUrl ?? 'https://integrate.api.nvidia.com',
  });
  return { ...provider, key: 'nvidia' };
}
