import { describe, it, expect } from 'vitest';
import { hashCacheInput } from '@/lib/ai/cache';

describe('prompt cache key hashing', () => {
  it('produces the same hash for the same input regardless of key order', () => {
    const a = hashCacheInput({ leadId: 'x', question: 'durum ne' });
    const b = hashCacheInput({ question: 'durum ne', leadId: 'x' });
    expect(a).toBe(b);
  });

  it('produces different hashes for different input', () => {
    const a = hashCacheInput({ leadId: 'x' });
    const b = hashCacheInput({ leadId: 'y' });
    expect(a).not.toBe(b);
  });
});
