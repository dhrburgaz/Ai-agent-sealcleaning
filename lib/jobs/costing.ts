/**
 * Minimal slice of Agent 18 — Finance & Job Costing, scoped to what Phase 1-3
 * needs: comparing estimate vs actuals and checking the €1,200 profit floor was
 * actually achieved. Full monthly/pipeline reporting is Phase 7 (see progress.md).
 */

export interface EstimatedCosts {
  directCost: number;
  costWithOverhead: number;
  recommendedExVat: number;
  minimumTargetGrossProfit: number;
}

export interface ActualCosts {
  labour: number;
  materials: number;
  rental: number;
  disposal: number;
  travel: number;
  subcontractor: number;
  unexpected: number;
}

export interface JobCostingComparison {
  estimatedTotalCost: number;
  actualTotalCost: number;
  costVariance: number;
  costVariancePercent: number;
  finalRevenue: number;
  realizedGrossProfit: number;
  realizedGrossMargin: number;
  profitFloorAchieved: boolean;
  profitFloorShortfall: number;
}

export function sumActualCosts(actuals: ActualCosts): number {
  return (
    actuals.labour +
    actuals.materials +
    actuals.rental +
    actuals.disposal +
    actuals.travel +
    actuals.subcontractor +
    actuals.unexpected
  );
}

export function compareEstimateToActuals(
  estimated: EstimatedCosts,
  actuals: ActualCosts,
  finalRevenue: number,
): JobCostingComparison {
  const actualTotalCost = sumActualCosts(actuals);
  const costVariance = actualTotalCost - estimated.costWithOverhead;
  const costVariancePercent =
    estimated.costWithOverhead > 0 ? costVariance / estimated.costWithOverhead : 0;

  const realizedGrossProfit = finalRevenue - actualTotalCost;
  const realizedGrossMargin = finalRevenue > 0 ? realizedGrossProfit / finalRevenue : 0;
  const profitFloorAchieved = realizedGrossProfit >= estimated.minimumTargetGrossProfit;

  return {
    estimatedTotalCost: estimated.costWithOverhead,
    actualTotalCost,
    costVariance,
    costVariancePercent,
    finalRevenue,
    realizedGrossProfit,
    realizedGrossMargin,
    profitFloorAchieved,
    profitFloorShortfall: Math.max(0, estimated.minimumTargetGrossProfit - realizedGrossProfit),
  };
}
