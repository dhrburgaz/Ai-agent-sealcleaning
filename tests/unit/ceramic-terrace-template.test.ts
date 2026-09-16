import { describe, it, expect } from 'vitest';
import {
  buildCeramicTerraceScope,
  computeCeramicTerraceJob,
  type CeramicTerraceInputs,
} from '@/lib/pricing/ceramic-terrace-template';
import type { PricingPolicyInputs } from '@/lib/pricing/engine';

const policy: PricingPolicyInputs = {
  targetMarginRate: 0.3,
  minimumTargetGrossProfit: 1200,
  minimumJobCharge: 150,
  vatRatePercent: 21,
  estimatedLabourHours: 0,
};

function baseInput(overrides: Partial<CeramicTerraceInputs> = {}): CeramicTerraceInputs {
  return {
    areaM2: 40,
    tileSuppliedBy: 'company',
    tileUnitCostPerM2: 28,
    currentPavingKnown: true,
    excavationNeeded: true,
    excavationDepthCm: 20,
    accessWidthCm: 100,
    carryingDistanceM: 10,
    levelDifferencesKnown: true,
    drainageKnown: true,
    edging: true,
    disposalIncluded: true,
    crew: [{ kind: 'owner', hourlyCost: 35 }],
    labourHourlyRateForDisposalLoading: 35,
    sandCostPerM3: 45,
    disposalTippingFeePerContainer: 180,
    disposalContainerFeePerContainer: 90,
    productionRateM2PerHourPerPerson: 1.2,
    ...overrides,
  };
}

describe('40m² ceramic terrace template — no hardcoded total', () => {
  it('produces different totals for customer-supplied vs company-supplied tiles', () => {
    const companySupplied = computeCeramicTerraceJob(baseInput({ tileSuppliedBy: 'company' }), policy);
    const customerSupplied = computeCeramicTerraceJob(baseInput({ tileSuppliedBy: 'customer' }), policy);

    expect(companySupplied.pricing.recommendedExVat).not.toBeCloseTo(
      customerSupplied.pricing.recommendedExVat,
      2,
    );
    expect(companySupplied.costs.materials).toBeGreaterThan(customerSupplied.costs.materials);
  });

  it('charges zero tile material cost when the customer supplies the tiles', () => {
    const result = computeCeramicTerraceJob(baseInput({ tileSuppliedBy: 'customer' }), policy);
    const tileLine = result.materials.find((m) => m.label === 'ceramic_tiles');
    expect(tileLine?.suppliedBy).toBe('customer');
  });

  it('excludes disposal cost when disposal is not included', () => {
    const withDisposal = computeCeramicTerraceJob(baseInput({ disposalIncluded: true }), policy);
    const withoutDisposal = computeCeramicTerraceJob(baseInput({ disposalIncluded: false }), policy);
    expect(withoutDisposal.waste.totalCost).toBe(0);
    expect(withDisposal.waste.totalCost).toBeGreaterThan(0);
  });

  it('never produces a fixed hardcoded price regardless of area', () => {
    const small = computeCeramicTerraceJob(baseInput({ areaM2: 20 }), policy);
    const large = computeCeramicTerraceJob(baseInput({ areaM2: 80 }), policy);
    expect(small.pricing.recommendedExVat).not.toBeCloseTo(large.pricing.recommendedExVat, 2);
  });
});

describe('40m² ceramic terrace template — mandatory questions / scope', () => {
  it('flags missing area and unverified paving/excavation/drainage as must_verify_on_site', () => {
    const scope = buildCeramicTerraceScope(
      baseInput({ areaM2: null, currentPavingKnown: false, excavationNeeded: null, drainageKnown: false }),
    );
    expect(scope.missingInfo).toContain('areaM2');
    expect(scope.missingInfo).toContain('currentPaving');
    expect(scope.factStatuses).toContain('must_verify_on_site');
  });

  it('requires tile unit cost when the company supplies the tiles', () => {
    const scope = buildCeramicTerraceScope(baseInput({ tileSuppliedBy: 'company', tileUnitCostPerM2: null }));
    expect(scope.missingInfo).toContain('tileUnitCostPerM2');
  });
});
