import { describe, it, expect } from 'vitest';
import { compareEstimateToActuals, sumActualCosts } from '@/lib/jobs/costing';

describe('job actual costing', () => {
  const estimated = { directCost: 1800, costWithOverhead: 1990, recommendedExVat: 3200, minimumTargetGrossProfit: 1200 };

  it('sums actual costs across all categories', () => {
    const actuals = { labour: 900, materials: 850, rental: 0, disposal: 220, travel: 0, subcontractor: 0, unexpected: 0 };
    expect(sumActualCosts(actuals)).toBe(1970);
  });

  it('reports the profit floor as achieved when realized profit clears it', () => {
    const actuals = { labour: 900, materials: 850, rental: 0, disposal: 220, travel: 0, subcontractor: 0, unexpected: 0 };
    const result = compareEstimateToActuals(estimated, actuals, 3200);
    expect(result.realizedGrossProfit).toBeCloseTo(3200 - 1970, 2);
    expect(result.profitFloorAchieved).toBe(result.realizedGrossProfit >= 1200);
  });

  it('flags a shortfall when actual costs blow past the estimate', () => {
    const actuals = { labour: 1800, materials: 1200, rental: 0, disposal: 400, travel: 0, subcontractor: 0, unexpected: 300 };
    const result = compareEstimateToActuals(estimated, actuals, 3200);
    expect(result.profitFloorAchieved).toBe(false);
    expect(result.profitFloorShortfall).toBeGreaterThan(0);
    expect(result.costVariance).toBeGreaterThan(0);
  });
});
