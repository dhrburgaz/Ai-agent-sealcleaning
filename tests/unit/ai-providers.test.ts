import { describe, it, expect, vi } from 'vitest';
import { createOllamaProvider } from '@/lib/ai/providers/ollama';
import { createOpenAiCompatibleProvider } from '@/lib/ai/providers/openai-compatible';
import { createGeminiProvider } from '@/lib/ai/providers/gemini';
import { createNvidiaProvider } from '@/lib/ai/providers/nvidia';
import { createAnthropicProvider } from '@/lib/ai/providers/anthropic';
import { ProviderHttpError, type Transport } from '@/lib/ai/providers/types';

function mockTransport(responseBody: unknown, ok = true, status = 200): Transport {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => responseBody,
    text: async () => JSON.stringify(responseBody),
  });
}

describe('AI provider adapters — no real network call, ever', () => {
  it('ollama: sends the prompt and parses the response field', async () => {
    const transport = mockTransport({ response: 'merhaba' });
    const provider = createOllamaProvider({ model: 'llama3', transport });

    const result = await provider.complete({ prompt: 'test' });

    expect(result.text).toBe('merhaba');
    expect(transport).toHaveBeenCalledWith(
      expect.stringContaining('/api/generate'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('ollama: never gets called with a hardcoded real endpoint outside localhost by default', async () => {
    const transport = mockTransport({ response: 'ok' });
    const provider = createOllamaProvider({ model: 'llama3', transport });
    await provider.complete({ prompt: 'test' });
    const [url] = (transport as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(url).toContain('localhost');
  });

  it('openai-compatible: requires an API key', () => {
    expect(() => createOpenAiCompatibleProvider({ model: 'gpt', transport: mockTransport({}) })).toThrow();
  });

  it('openai-compatible: sends Bearer auth and parses choices[0].message.content', async () => {
    const transport = mockTransport({ choices: [{ message: { content: 'hello' } }] });
    const provider = createOpenAiCompatibleProvider({ model: 'gpt-4o-mini', apiKey: 'sk-test', transport });

    const result = await provider.complete({ prompt: 'hi' });

    expect(result.text).toBe('hello');
    const [, init] = (transport as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(init.headers.Authorization).toBe('Bearer sk-test');
  });

  it('gemini: requires an API key and parses candidates[0]', async () => {
    expect(() => createGeminiProvider({ model: 'gemini-pro', transport: mockTransport({}) })).toThrow();

    const transport = mockTransport({ candidates: [{ content: { parts: [{ text: 'merhaba' }] } }] });
    const provider = createGeminiProvider({ model: 'gemini-pro', apiKey: 'key123', transport });
    const result = await provider.complete({ prompt: 'hi' });
    expect(result.text).toBe('merhaba');
  });

  it('nvidia: reuses the OpenAI-compatible shape with its own default base URL', async () => {
    const transport = mockTransport({ choices: [{ message: { content: 'nvidia says hi' } }] });
    const provider = createNvidiaProvider({ model: 'nemotron', apiKey: 'nv-key', transport });
    const result = await provider.complete({ prompt: 'hi' });
    expect(result.text).toBe('nvidia says hi');
    expect(provider.key).toBe('nvidia');
    const [url] = (transport as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(url).toContain('integrate.api.nvidia.com');
  });

  it('anthropic: sends x-api-key header and parses the text content block', async () => {
    const transport = mockTransport({ content: [{ type: 'text', text: 'merhaba dünya' }] });
    const provider = createAnthropicProvider({ model: 'claude-x', apiKey: 'ant-key', transport });

    const result = await provider.complete({ prompt: 'hi' });

    expect(result.text).toBe('merhaba dünya');
    const [, init] = (transport as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(init.headers['x-api-key']).toBe('ant-key');
  });

  it('throws a typed ProviderHttpError on a non-ok response instead of silently returning empty text', async () => {
    const transport = mockTransport({ error: 'bad request' }, false, 400);
    const provider = createOllamaProvider({ model: 'llama3', transport });
    await expect(provider.complete({ prompt: 'x' })).rejects.toBeInstanceOf(ProviderHttpError);
  });
});
