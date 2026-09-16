import { describe, it, expect } from 'vitest';
import { calculatePrice, evaluateHypotheticalPrice, applyOwnerOverride, type PricingCostInputs } from '@/lib/pricing/engine';

const baseCosts: PricingCostInputs = {
  labour: 500,
  materials: 300,
  rentals: 0,
  waste: 100,
  logistics: 0,
  subcontractors: 0,
  permits: 0,
  consumables: 50,
  overhead: 95,
  riskReserve: 47.5,
};

describe('pricing engine — quote arithmetic', () => {
  it('computes direct cost as the sum of all direct cost categories', () => {
    const result = calculatePrice(baseCosts, {
      targetMarginRate: 0.3,
      minimumTargetGrossProfit: 1200,
      minimumJobCharge: 150,
      vatRatePercent: 21,
      estimatedLabourHours: 20,
    });
    expect(result.directCost).toBeCloseTo(950, 5);
    expect(result.costWithOverhead).toBeCloseTo(950 + 95 + 47.5, 5);
  });

  it('applies VAT using the configured rate', () => {
    const result = calculatePrice(baseCosts, {
      targetMarginRate: 0.3,
      minimumTargetGrossProfit: 1200,
      minimumJobCharge: 150,
      vatRatePercent: 9,
      estimatedLabourHours: 20,
    });
    expect(result.vatAmount).toBeCloseTo(result.recommendedExVat * 0.09, 1);
  });
});

describe('pricing engine — margin vs markup', () => {
  it('price_for_margin uses margin formula (cost / (1 - rate)), not markup (cost * (1 + rate))', () => {
    const costWithOverhead = 700;
    const flatCosts: PricingCostInputs = {
      labour: costWithOverhead,
      materials: 0,
      rentals: 0,
      waste: 0,
      logistics: 0,
      subcontractors: 0,
      permits: 0,
      consumables: 0,
      overhead: 0,
      riskReserve: 0,
    };
    const result = calculatePrice(flatCosts, {
      targetMarginRate: 0.3,
      minimumTargetGrossProfit: 0,
      minimumJobCharge: 0,
      vatRatePercent: 0,
      estimatedLabourHours: 10,
    });

    // Margin formula: 700 / (1 - 0.3) = 1000. A markup formula would give 700 * 1.3 = 910.
    expect(result.priceForMargin).toBeCloseTo(1000, 2);
    expect(result.priceForMargin).not.toBeCloseTo(910, 2);

    const achievedMargin = (result.priceForMargin - costWithOverhead) / result.priceForMargin;
    expect(achievedMargin).toBeCloseTo(0.3, 5);
  });
});

describe('pricing engine — profit floor and minimum job charge', () => {
  it('never recommends below the €1,200 profit floor', () => {
    const cheapCosts: PricingCostInputs = {
      labour: 50,
      materials: 20,
      rentals: 0,
      waste: 0,
      logistics: 0,
      subcontractors: 0,
      permits: 0,
      consumables: 0,
      overhead: 0,
      riskReserve: 0,
    };
    const result = calculatePrice(cheapCosts, {
      targetMarginRate: 0.3,
      minimumTargetGrossProfit: 1200,
      minimumJobCharge: 150,
      vatRatePercent: 21,
      estimatedLabourHours: 2,
    });
    expect(result.grossProfit).toBeGreaterThanOrEqual(1200 - 0.01);
    expect(result.recommendedExVat).toBeCloseTo(70 + 1200, 2);
  });

  it('falls back to the minimum job charge when it exceeds margin/floor pricing', () => {
    const tinyCosts: PricingCostInputs = {
      labour: 5,
      materials: 0,
      rentals: 0,
      waste: 0,
      logistics: 0,
      subcontractors: 0,
      permits: 0,
      consumables: 0,
      overhead: 0,
      riskReserve: 0,
    };
    const result = calculatePrice(tinyCosts, {
      targetMarginRate: 0.3,
      minimumTargetGrossProfit: 0,
      minimumJobCharge: 500,
      vatRatePercent: 21,
      estimatedLabourHours: 0.5,
    });
    expect(result.recommendedExVat).toBe(500);
  });

  it('flags commercial fit as weak/below_floor for small jobs propped up only by the floor', () => {
    const smallJobCosts: PricingCostInputs = {
      labour: 100,
      materials: 0,
      rentals: 0,
      waste: 0,
      logistics: 0,
      subcontractors: 0,
      permits: 0,
      consumables: 0,
      overhead: 0,
      riskReserve: 0,
    };
    const result = calculatePrice(smallJobCosts, {
      targetMarginRate: 0.3,
      minimumTargetGrossProfit: 1200,
      minimumJobCharge: 0,
      vatRatePercent: 21,
      estimatedLabourHours: 3,
    });
    expect(['weak', 'below_floor']).toContain(result.commercialFit);
  });

  it('reports a strong commercial fit when margin pricing alone comfortably clears the floor', () => {
    const bigJobCosts: PricingCostInputs = {
      labour: 8000,
      materials: 3000,
      rentals: 500,
      waste: 300,
      logistics: 0,
      subcontractors: 0,
      permits: 0,
      consumables: 100,
      overhead: 800,
      riskReserve: 400,
    };
    const result = calculatePrice(bigJobCosts, {
      targetMarginRate: 0.3,
      minimumTargetGrossProfit: 1200,
      minimumJobCharge: 150,
      vatRatePercent: 21,
      estimatedLabourHours: 200,
    });
    expect(result.commercialFit).toBe('strong');
  });
});

describe('evaluateHypotheticalPrice — "what if we sell at X" owner questions', () => {
  it('reports the shortfall against the profit floor without mutating stored data', () => {
    const result = evaluateHypotheticalPrice(baseCosts, 1000, 1200);
    expect(result.meetsProfitFloor).toBe(false);
    expect(result.shortfallVsFloor).toBeGreaterThan(0);
  });

  it('confirms when the hypothetical price meets the profit floor', () => {
    const result = evaluateHypotheticalPrice(baseCosts, 3000, 1200);
    expect(result.meetsProfitFloor).toBe(true);
    expect(result.shortfallVsFloor).toBe(0);
  });
});

describe('owner override', () => {
  it('preserves the system recommendation separately from the owner override', () => {
    const systemResult = calculatePrice(baseCosts, {
      targetMarginRate: 0.3,
      minimumTargetGrossProfit: 1200,
      minimumJobCharge: 150,
      vatRatePercent: 21,
      estimatedLabourHours: 20,
    });
    const applied = applyOwnerOverride(systemResult, {
      price: 900,
      reason: 'Müşteri sadık, ilişki için düşük fiyat.',
      appliesToQuoteOnly: true,
      decidedBy: 'owner',
    });
    expect(applied.systemRecommendation.recommendedExVat).toBe(systemResult.recommendedExVat);
    expect(applied.ownerOverride.price).toBe(900);
    expect(applied.belowFloor).toBe(true);
  });
});
