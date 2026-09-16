/**
 * Agent 10 — Supplier & Deal Scout (master spec section 9 / 10, 13, 34).
 * Computes total landed cost for a specific job's required quantity and compares
 * supplier observations. A "discount"/"sale" label without an evidence URL is
 * rejected — never claim a discount without evidence.
 */

export interface SupplierObservationInput {
  supplierId: string;
  supplierName: string;
  unitPrice: number;
  vatIncluded: boolean;
  vatRatePercent: number;
  deliveryFee: number;
  pickupAvailable: boolean;
  minimumOrder: number;
  discountLabel?: string;
  discountEvidenceUrl?: string;
  distanceKm: number;
  preferred: boolean;
  observedAt: Date;
  staleAfter?: Date;
}

export interface LandedCostResult extends SupplierObservationInput {
  landedCostForJob: number;
  isStale: boolean;
  discountAccepted: boolean;
  rejectionReason?: string;
}

export function validateDiscountClaim(input: SupplierObservationInput): {
  accepted: boolean;
  reason?: string;
} {
  if (!input.discountLabel) return { accepted: true };
  if (!input.discountEvidenceUrl) {
    return {
      accepted: false,
      reason: 'Kanıt (URL) olmadan "indirim/fırsat" etiketi kabul edilmez.',
    };
  }
  return { accepted: true };
}

export function calculateLandedCost(
  input: SupplierObservationInput,
  quantityNeeded: number,
  now: Date = new Date(),
): LandedCostResult {
  const unitPriceExVat = input.vatIncluded
    ? input.unitPrice / (1 + input.vatRatePercent / 100)
    : input.unitPrice;
  const effectiveQuantity = Math.max(quantityNeeded, input.minimumOrder);
  const materialCost = unitPriceExVat * effectiveQuantity;
  const deliveryCost = input.pickupAvailable ? 0 : input.deliveryFee;
  const landedCostForJob = materialCost + deliveryCost;

  const discountCheck = validateDiscountClaim(input);
  const isStale = Boolean(input.staleAfter && now > input.staleAfter);

  return {
    ...input,
    landedCostForJob,
    isStale,
    discountAccepted: discountCheck.accepted,
    rejectionReason: discountCheck.reason,
  };
}

export interface SupplierComparison {
  cheapest: LandedCostResult | null;
  bestMargin: LandedCostResult | null;
  fastest: LandedCostResult | null;
  preferred: LandedCostResult | null;
  recommendation: 'buy_now' | 'wait' | 'verify';
}

export function compareSuppliers(
  observations: SupplierObservationInput[],
  quantityNeeded: number,
  now: Date = new Date(),
): SupplierComparison {
  const results = observations.map((o) => calculateLandedCost(o, quantityNeeded, now));
  const usable = results.filter((r) => !r.isStale);

  const cheapest =
    usable.length > 0
      ? usable.reduce((min, r) => (r.landedCostForJob < min.landedCostForJob ? r : min))
      : null;
  const fastest = usable.find((r) => r.pickupAvailable) ?? usable[0] ?? null;
  const preferred = usable.find((r) => r.preferred) ?? null;

  let recommendation: SupplierComparison['recommendation'] = 'verify';
  if (usable.length === 0) {
    recommendation = 'verify';
  } else if (cheapest && cheapest.discountAccepted) {
    recommendation = 'buy_now';
  } else {
    recommendation = 'wait';
  }

  return { cheapest, bestMargin: cheapest, fastest, preferred, recommendation };
}
