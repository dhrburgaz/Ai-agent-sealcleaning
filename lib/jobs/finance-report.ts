/**
 * Agent 18 — Finance & Job Costing Agent, full reporting slice (section 18,
 * Phase 7). Pure aggregation functions over already-fetched real data —
 * never a projection or a forecast presented as an actual, only what
 * genuinely happened (completed jobs, sent quotes, decided leads).
 */

export interface CompletedJobFinancials {
  jobId: string;
  completedAt: Date;
  revenueExVat: number;
  actualCost: number;
  profitFloorAchieved: boolean;
}

export interface MonthlyFinanceBucket {
  monthKey: string; // YYYY-MM, UTC
  jobCount: number;
  revenueExVat: number;
  actualCost: number;
  grossProfit: number;
  grossMarginPercent: number;
}

function monthKeyOf(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function bucketFinancialsByMonth(jobs: CompletedJobFinancials[]): MonthlyFinanceBucket[] {
  const buckets = new Map<string, { revenue: number; cost: number; count: number }>();
  for (const job of jobs) {
    const key = monthKeyOf(job.completedAt);
    const bucket = buckets.get(key) ?? { revenue: 0, cost: 0, count: 0 };
    bucket.revenue += job.revenueExVat;
    bucket.cost += job.actualCost;
    bucket.count += 1;
    buckets.set(key, bucket);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, b]) => ({
      monthKey,
      jobCount: b.count,
      revenueExVat: b.revenue,
      actualCost: b.cost,
      grossProfit: b.revenue - b.cost,
      grossMarginPercent: b.revenue > 0 ? ((b.revenue - b.cost) / b.revenue) * 100 : 0,
    }));
}

export interface WinRateInput {
  wonCount: number;
  lostCount: number;
}

export interface WinRateResult {
  totalDecided: number;
  winRatePercent: number;
}

/** Win rate over leads that have actually been decided one way or the other —
 *  leads still in progress are neither a win nor a loss and must not dilute
 *  the rate either direction. */
export function computeWinRate(input: WinRateInput): WinRateResult {
  const totalDecided = input.wonCount + input.lostCount;
  return {
    totalDecided,
    winRatePercent: totalDecided > 0 ? (input.wonCount / totalDecided) * 100 : 0,
  };
}

export interface ProfitFloorAchievementInput {
  achievedCount: number;
  totalCount: number;
}

/** What fraction of completed jobs actually cleared the €1,200 profit floor —
 *  the ground-truth check on whether the pricing engine's promise held up in
 *  the field, not just on paper. */
export function computeProfitFloorAchievementRate(input: ProfitFloorAchievementInput): number {
  return input.totalCount > 0 ? (input.achievedCount / input.totalCount) * 100 : 0;
}
