/**
 * Section 14 dashboard: AI spend this month, free/local vs paid calls, blocked
 * calls, cache hit rate, calls avoided, avg cost/lead, avg cost/quote.
 */
import { db } from '@/db/client';
import { apiUsage } from '@/db/schema';
import { getOrCreateBudgetPolicy } from './repo';

export interface AiUsageStats {
  monthlyCapEur: number;
  dailyCapEur: number;
  spentThisMonthEur: number;
  spentTodayEur: number;
  totalCalls: number;
  blockedCalls: number;
  cacheHits: number;
  successfulPaidCalls: number;
  cacheHitRatePercent: number;
  callsAvoidedByCache: number;
  byProvider: { provider: string; calls: number; costEur: number }[];
}

export function computeAiUsageStats(
  rows: {
    provider: string;
    blocked: boolean;
    cacheHit: boolean;
    actualCostEur: number | null;
  }[],
  budget: { monthlyCapEur: number; dailyCapEur: number; spentThisMonthEur: number; spentTodayEur: number },
): AiUsageStats {
  const totalCalls = rows.length;
  const blockedCalls = rows.filter((r) => r.blocked).length;
  const cacheHits = rows.filter((r) => r.cacheHit).length;
  const successfulPaidCalls = rows.filter((r) => !r.blocked && !r.cacheHit && r.provider !== 'deterministic').length;
  const nonBlockedCalls = totalCalls - blockedCalls;
  const cacheHitRatePercent = nonBlockedCalls > 0 ? (cacheHits / nonBlockedCalls) * 100 : 0;

  const byProviderMap = new Map<string, { calls: number; costEur: number }>();
  for (const row of rows) {
    const entry = byProviderMap.get(row.provider) ?? { calls: 0, costEur: 0 };
    entry.calls += 1;
    entry.costEur += row.actualCostEur ?? 0;
    byProviderMap.set(row.provider, entry);
  }

  return {
    monthlyCapEur: budget.monthlyCapEur,
    dailyCapEur: budget.dailyCapEur,
    spentThisMonthEur: budget.spentThisMonthEur,
    spentTodayEur: budget.spentTodayEur,
    totalCalls,
    blockedCalls,
    cacheHits,
    successfulPaidCalls,
    cacheHitRatePercent,
    callsAvoidedByCache: cacheHits, // each cache hit is one avoided provider call
    byProvider: Array.from(byProviderMap.entries()).map(([provider, v]) => ({ provider, ...v })),
  };
}

export async function buildAiUsageStats(): Promise<AiUsageStats> {
  const rows = await db.select().from(apiUsage);
  const budget = await getOrCreateBudgetPolicy();
  return computeAiUsageStats(rows, budget);
}
