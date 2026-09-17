import { describe, it, expect } from 'vitest';
import { decideRetry, DEFAULT_RETRY_CONFIG } from '@/lib/ai/retry';

describe('AI call retry/backoff (never a retry storm)', () => {
  it('retries a network-level failure (null status) with exponential backoff', () => {
    const first = decideRetry(1, null);
    const second = decideRetry(2, null);
    expect(first.shouldRetry).toBe(true);
    expect(second.shouldRetry).toBe(true);
    expect(second.delayMs).toBeGreaterThan(first.delayMs);
  });

  it('retries a 5xx server error', () => {
    expect(decideRetry(1, 503).shouldRetry).toBe(true);
    expect(decideRetry(1, 500).shouldRetry).toBe(true);
  });

  it('never retries a 4xx client error — it is a wrong request, not a transient failure', () => {
    expect(decideRetry(1, 400).shouldRetry).toBe(false);
    expect(decideRetry(1, 401).shouldRetry).toBe(false);
    expect(decideRetry(1, 429).shouldRetry).toBe(false);
  });

  it('stops retrying once maxAttempts is reached, preventing a retry storm', () => {
    const config = { ...DEFAULT_RETRY_CONFIG, maxAttempts: 2 };
    expect(decideRetry(1, 503, config).shouldRetry).toBe(true);
    expect(decideRetry(2, 503, config).shouldRetry).toBe(false);
  });

  it('caps the backoff delay at maxDelayMs', () => {
    const config = { maxAttempts: 10, baseDelayMs: 1000, maxDelayMs: 3000 };
    const decision = decideRetry(5, 503, config);
    expect(decision.delayMs).toBeLessThanOrEqual(3000);
  });
});
