import { describe, it, expect } from 'vitest';
import {
  bucketFinancialsByMonth,
  computeWinRate,
  computeProfitFloorAchievementRate,
  type CompletedJobFinancials,
} from '@/lib/jobs/finance-report';

describe('bucketFinancialsByMonth', () => {
  const jobs: CompletedJobFinancials[] = [
    { jobId: 'j1', completedAt: new Date('2026-01-05T00:00:00Z'), revenueExVat: 2000, actualCost: 700, profitFloorAchieved: true },
    { jobId: 'j2', completedAt: new Date('2026-01-20T00:00:00Z'), revenueExVat: 1500, actualCost: 900, profitFloorAchieved: false },
    { jobId: 'j3', completedAt: new Date('2026-02-01T00:00:00Z'), revenueExVat: 3000, actualCost: 1200, profitFloorAchieved: true },
  ];

  it('groups jobs by UTC month and sums revenue/cost', () => {
    const buckets = bucketFinancialsByMonth(jobs);
    expect(buckets).toHaveLength(2);
    expect(buckets[0]).toMatchObject({ monthKey: '2026-01', jobCount: 2, revenueExVat: 3500, actualCost: 1600 });
    expect(buckets[1]).toMatchObject({ monthKey: '2026-02', jobCount: 1, revenueExVat: 3000, actualCost: 1200 });
  });

  it('computes gross profit and margin percent per bucket', () => {
    const [jan] = bucketFinancialsByMonth(jobs);
    expect(jan!.grossProfit).toBe(1900);
    expect(jan!.grossMarginPercent).toBeCloseTo((1900 / 3500) * 100);
  });

  it('returns an empty array for no jobs', () => {
    expect(bucketFinancialsByMonth([])).toEqual([]);
  });

  it('reports zero margin for a month with zero revenue rather than dividing by zero', () => {
    const [bucket] = bucketFinancialsByMonth([
      { jobId: 'j4', completedAt: new Date('2026-03-01T00:00:00Z'), revenueExVat: 0, actualCost: 500, profitFloorAchieved: false },
    ]);
    expect(bucket!.grossMarginPercent).toBe(0);
  });
});

describe('computeWinRate', () => {
  it('computes the rate over decided leads only', () => {
    expect(computeWinRate({ wonCount: 3, lostCount: 1 })).toEqual({ totalDecided: 4, winRatePercent: 75 });
  });

  it('returns 0% with no decided leads rather than NaN', () => {
    expect(computeWinRate({ wonCount: 0, lostCount: 0 })).toEqual({ totalDecided: 0, winRatePercent: 0 });
  });
});

describe('computeProfitFloorAchievementRate', () => {
  it('computes the percentage of completed jobs that cleared the floor', () => {
    expect(computeProfitFloorAchievementRate({ achievedCount: 3, totalCount: 4 })).toBe(75);
  });

  it('returns 0 with no completed jobs rather than NaN', () => {
    expect(computeProfitFloorAchievementRate({ achievedCount: 0, totalCount: 0 })).toBe(0);
  });
});
