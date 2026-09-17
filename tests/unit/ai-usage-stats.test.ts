import { describe, it, expect } from 'vitest';
import { computeAiUsageStats } from '@/lib/server/ai-usage-stats';

const budget = { monthlyCapEur: 20, dailyCapEur: 5, spentThisMonthEur: 0, spentTodayEur: 0 };

describe('AI usage dashboard stats (section 14)', () => {
  it('reports zero everything when no calls have ever happened (fresh €0 install)', () => {
    const stats = computeAiUsageStats([], { monthlyCapEur: 0, dailyCapEur: 0, spentThisMonthEur: 0, spentTodayEur: 0 });
    expect(stats.totalCalls).toBe(0);
    expect(stats.cacheHitRatePercent).toBe(0);
  });

  it('counts blocked calls separately from successful ones', () => {
    const stats = computeAiUsageStats(
      [
        { provider: 'openai_compatible', blocked: true, cacheHit: false, actualCostEur: 0 },
        { provider: 'openai_compatible', blocked: false, cacheHit: false, actualCostEur: 0.02 },
      ],
      budget,
    );
    expect(stats.blockedCalls).toBe(1);
    expect(stats.successfulPaidCalls).toBe(1);
  });

  it('computes cache hit rate over non-blocked calls only', () => {
    const stats = computeAiUsageStats(
      [
        { provider: 'openai_compatible', blocked: true, cacheHit: false, actualCostEur: 0 },
        { provider: 'openai_compatible', blocked: false, cacheHit: true, actualCostEur: 0 },
        { provider: 'openai_compatible', blocked: false, cacheHit: false, actualCostEur: 0.02 },
      ],
      budget,
    );
    // 1 cache hit out of 2 non-blocked calls = 50%
    expect(stats.cacheHitRatePercent).toBe(50);
    expect(stats.callsAvoidedByCache).toBe(1);
  });

  it('breaks down total cost by provider', () => {
    const stats = computeAiUsageStats(
      [
        { provider: 'openai_compatible', blocked: false, cacheHit: false, actualCostEur: 0.02 },
        { provider: 'openai_compatible', blocked: false, cacheHit: false, actualCostEur: 0.03 },
        { provider: 'ollama', blocked: false, cacheHit: false, actualCostEur: 0 },
      ],
      budget,
    );
    const openai = stats.byProvider.find((p) => p.provider === 'openai_compatible');
    expect(openai?.calls).toBe(2);
    expect(openai?.costEur).toBeCloseTo(0.05, 5);
  });
});
