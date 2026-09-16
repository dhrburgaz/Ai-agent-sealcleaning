/**
 * Agent 09 — Pricing & Margin Engine (master spec section 9 / 10).
 *
 * Deterministic, code-only arithmetic. No LLM involvement, so it runs identically
 * at zero AI budget. Formulas are taken verbatim from the master spec:
 *
 *   direct_cost           = labour + materials + rentals + waste + logistics
 *                            + subcontractors + permits + consumables
 *   cost_with_overhead    = direct_cost + overhead + risk_reserve
 *   price_for_margin      = cost_with_overhead / (1 - target_margin_rate)
 *   price_for_profit_floor= cost_with_overhead + minimum_target_gross_profit
 *   recommended_ex_vat    = max(price_for_margin, price_for_profit_floor, minimum_job_charge)
 *
 * `price_for_margin` divides by (1 - rate) — a MARGIN formula, not a markup
 * formula (`cost * (1 + rate)`). Margin and markup are not interchangeable:
 * for the same rate, markup pricing under-delivers the target margin.
 */

export interface PricingCostInputs {
  labour: number;
  materials: number;
  rentals: number;
  waste: number;
  logistics: number;
  subcontractors: number;
  permits: number;
  consumables: number;
  overhead: number;
  riskReserve: number;
}

export interface PricingPolicyInputs {
  targetMarginRate: number; // 0..1
  minimumTargetGrossProfit: number; // euros, default 1200
  minimumJobCharge: number; // euros
  vatRatePercent: number; // e.g. 21
  estimatedLabourHours: number;
  uncertaintyMultiplierLow?: number; // default 0.9
  uncertaintyMultiplierHigh?: number; // default 1.2
}

export type CommercialFit = 'strong' | 'acceptable' | 'weak' | 'below_floor';

export interface PricingResult {
  directCost: number;
  costWithOverhead: number;
  priceForMargin: number;
  priceForProfitFloor: number;
  minimumJobCharge: number;
  recommendedExVat: number;
  vatAmount: number;
  recommendedIncVat: number;
  breakEven: number;
  grossProfit: number;
  grossMargin: number;
  markupIfMisappliedWarning: boolean;
  profitPerLabourHour: number | null;
  lowEstimate: number;
  expectedEstimate: number;
  highEstimate: number;
  commercialFit: CommercialFit;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function calculateDirectCost(c: PricingCostInputs): number {
  return (
    c.labour +
    c.materials +
    c.rentals +
    c.waste +
    c.logistics +
    c.subcontractors +
    c.permits +
    c.consumables
  );
}

export function calculatePrice(
  costs: PricingCostInputs,
  policy: PricingPolicyInputs,
): PricingResult {
  if (policy.targetMarginRate < 0 || policy.targetMarginRate >= 1) {
    throw new Error('targetMarginRate must be within [0, 1).');
  }

  const directCost = calculateDirectCost(costs);
  const costWithOverhead = directCost + costs.overhead + costs.riskReserve;

  const priceForMargin = costWithOverhead / (1 - policy.targetMarginRate);
  const priceForProfitFloor = costWithOverhead + policy.minimumTargetGrossProfit;
  const recommendedExVat = Math.max(
    priceForMargin,
    priceForProfitFloor,
    policy.minimumJobCharge,
  );

  const vatAmount = recommendedExVat * (policy.vatRatePercent / 100);
  const recommendedIncVat = recommendedExVat + vatAmount;

  const breakEven = costWithOverhead;
  const grossProfit = recommendedExVat - costWithOverhead;
  const grossMargin = recommendedExVat > 0 ? grossProfit / recommendedExVat : 0;

  const profitPerLabourHour =
    policy.estimatedLabourHours > 0 ? grossProfit / policy.estimatedLabourHours : null;

  const lowMultiplier = policy.uncertaintyMultiplierLow ?? 0.9;
  const highMultiplier = policy.uncertaintyMultiplierHigh ?? 1.2;
  const lowEstimate = recommendedExVat * lowMultiplier;
  const highEstimate = recommendedExVat * highMultiplier;

  // Margin-supported vs floor-propped: does the target margin alone clear the profit floor,
  // or is the floor the only thing keeping this job's absolute profit acceptable?
  let commercialFit: CommercialFit;
  if (recommendedExVat < costWithOverhead + policy.minimumTargetGrossProfit) {
    commercialFit = 'below_floor';
  } else if (priceForMargin >= priceForProfitFloor * 1.05) {
    commercialFit = 'strong';
  } else if (priceForMargin >= priceForProfitFloor) {
    commercialFit = 'acceptable';
  } else {
    commercialFit = 'weak';
  }

  return {
    directCost: round2(directCost),
    costWithOverhead: round2(costWithOverhead),
    priceForMargin: round2(priceForMargin),
    priceForProfitFloor: round2(priceForProfitFloor),
    minimumJobCharge: round2(policy.minimumJobCharge),
    recommendedExVat: round2(recommendedExVat),
    vatAmount: round2(vatAmount),
    recommendedIncVat: round2(recommendedIncVat),
    breakEven: round2(breakEven),
    grossProfit: round2(grossProfit),
    grossMargin: round2(grossMargin),
    markupIfMisappliedWarning: false,
    profitPerLabourHour: profitPerLabourHour === null ? null : round2(profitPerLabourHour),
    lowEstimate: round2(lowEstimate),
    expectedEstimate: round2(recommendedExVat),
    highEstimate: round2(highEstimate),
    commercialFit,
  };
}

/**
 * "What if we sell this job at `hypotheticalPrice`?" — answers owner questions like
 * "Bu işi 2400 euroya verirsek ne kalır?" without mutating the stored recommendation.
 */
export function evaluateHypotheticalPrice(
  costs: PricingCostInputs,
  hypotheticalExVatPrice: number,
  minimumTargetGrossProfit: number,
) {
  const directCost = calculateDirectCost(costs);
  const costWithOverhead = directCost + costs.overhead + costs.riskReserve;
  const grossProfit = hypotheticalExVatPrice - costWithOverhead;
  const grossMargin = hypotheticalExVatPrice > 0 ? grossProfit / hypotheticalExVatPrice : 0;
  const meetsProfitFloor = grossProfit >= minimumTargetGrossProfit;
  return {
    costWithOverhead: round2(costWithOverhead),
    grossProfit: round2(grossProfit),
    grossMargin: round2(grossMargin),
    meetsProfitFloor,
    shortfallVsFloor: round2(Math.max(0, minimumTargetGrossProfit - grossProfit)),
  };
}

/** Owner override is always stored separately; the system recommendation is never overwritten. */
export interface OwnerOverride {
  price: number;
  reason: string;
  appliesToQuoteOnly: boolean;
  decidedBy: string;
}

export function applyOwnerOverride(
  systemRecommendation: PricingResult,
  override: OwnerOverride,
): { systemRecommendation: PricingResult; ownerOverride: OwnerOverride; belowFloor: boolean } {
  const belowFloor = override.price < systemRecommendation.priceForProfitFloor;
  return { systemRecommendation, ownerOverride: override, belowFloor };
}
