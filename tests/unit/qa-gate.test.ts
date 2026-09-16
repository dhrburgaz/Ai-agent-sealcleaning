import { describe, it, expect } from 'vitest';
import { runQaGate, type QaGateInput } from '@/lib/pricing/qa-gate';
import { calculatePrice, type PricingCostInputs, type PricingPolicyInputs } from '@/lib/pricing/engine';

const costs: PricingCostInputs = {
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
const policy: PricingPolicyInputs = {
  targetMarginRate: 0.3,
  minimumTargetGrossProfit: 1200,
  minimumJobCharge: 150,
  vatRatePercent: 21,
  estimatedLabourHours: 20,
};

function baseInput(overrides: Partial<QaGateInput> = {}): QaGateInput {
  const storedResult = calculatePrice(costs, policy);
  return {
    costs,
    policy,
    storedResult,
    bindingQuote: true,
    factStatuses: ['known', 'known'],
    criticalUnknownLabels: [],
    requiredFields: { customerName: 'Jan de Vries' },
    ...overrides,
  };
}

describe('QA gate — math and required fields', () => {
  it('passes a consistent, complete quote', () => {
    const result = runQaGate(baseInput());
    expect(result.blocked).toBe(false);
  });

  it('flags a math mismatch when the stored price drifted from current inputs', () => {
    const stale = calculatePrice(costs, policy);
    const result = runQaGate(
      baseInput({ storedResult: { ...stale, recommendedExVat: stale.recommendedExVat + 500 } }),
    );
    expect(result.blocked).toBe(true);
    expect(result.reasons.some((r) => r.includes('güncel değil'))).toBe(true);
  });

  it('flags missing required fields', () => {
    const result = runQaGate(baseInput({ requiredFields: { customerName: '', address: null } }));
    expect(result.blocked).toBe(true);
    expect(result.reasons.some((r) => r.includes('customerName'))).toBe(true);
  });
});

describe('QA gate — profit floor and owner override', () => {
  it('blocks a quote priced below the profit floor without an owner override', () => {
    const belowFloor = calculatePrice(costs, policy);
    const result = runQaGate(
      baseInput({ storedResult: { ...belowFloor, recommendedExVat: belowFloor.priceForProfitFloor - 100 } }),
    );
    expect(result.blocked).toBe(true);
    expect(result.reasons.some((r) => r.includes('kâr hedefinin altında'))).toBe(true);
  });

  it('requires a reason when the owner override goes below the profit floor', () => {
    const stored = calculatePrice(costs, policy);
    const result = runQaGate(
      baseInput({
        ownerOverride: { price: stored.priceForProfitFloor - 200, reason: '', appliesToQuoteOnly: true, decidedBy: 'owner' },
      }),
    );
    expect(result.blocked).toBe(true);
    expect(result.reasons.some((r) => r.includes('gerekçe'))).toBe(true);
  });

  it('allows a below-floor owner override once a reason is recorded', () => {
    const stored = calculatePrice(costs, policy);
    const result = runQaGate(
      baseInput({
        ownerOverride: {
          price: stored.priceForProfitFloor - 200,
          reason: 'Uzun vadeli müşteri ilişkisi.',
          appliesToQuoteOnly: true,
          decidedBy: 'owner',
        },
      }),
    );
    expect(result.blocked).toBe(false);
  });
});

describe('QA gate — unverified measurements block binding quotes', () => {
  it('blocks a binding quote (offerte) when must_verify_on_site items remain', () => {
    const result = runQaGate(
      baseInput({ bindingQuote: true, factStatuses: ['known', 'must_verify_on_site'], criticalUnknownLabels: ['excavation depth'] }),
    );
    expect(result.blocked).toBe(true);
    expect(result.reasons.some((r) => r.includes('doğrulanmamış'))).toBe(true);
  });

  it('does not block a non-binding prijsindicatie for the same unknowns', () => {
    const result = runQaGate(
      baseInput({ bindingQuote: false, factStatuses: ['known', 'must_verify_on_site'], criticalUnknownLabels: ['excavation depth'] }),
    );
    expect(result.blocked).toBe(false);
  });
});

describe('QA gate — stale prices and unapproved sends', () => {
  it('flags a stale price book / supplier observation', () => {
    const result = runQaGate(
      baseInput({
        staleItems: [{ label: 'Keramische tegel 60x60', staleAfter: new Date('2020-01-01'), now: new Date('2024-01-01') }],
      }),
    );
    expect(result.blocked).toBe(true);
    expect(result.reasons.some((r) => r.includes('Güncelliğini yitirmiş'))).toBe(true);
  });

  it('blocks a send that was requested without approval', () => {
    const result = runQaGate(baseInput({ sendRequested: true, approved: false }));
    expect(result.blocked).toBe(true);
    expect(result.reasons.some((r) => r.includes('onay olmadan engellendi'))).toBe(true);
  });

  it('allows a send once approved', () => {
    const result = runQaGate(baseInput({ sendRequested: true, approved: true }));
    expect(result.blocked).toBe(false);
  });
});
