import { describe, it, expect } from 'vitest';
import {
  computeCeramicTerraceJob,
  applyInventoryOffset,
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

describe('Agent 10/33 — inventory offset applied to the ceramic terrace estimate', () => {
  it('never changes the price when there is no inventory on hand', () => {
    const input = baseInput();
    const breakdown = computeCeramicTerraceJob(input, policy);
    const result = applyInventoryOffset(input, breakdown, { ceramicTilesOnHand: 0, sandSubbaseOnHand: 0 }, policy);

    expect(result.inventorySavingsEur).toBe(0);
    expect(result.pricing.recommendedExVat).toBeCloseTo(breakdown.pricing.recommendedExVat, 2);
  });

  it('reduces the materials cost and the final price when tiles are already in stock', () => {
    const input = baseInput();
    const breakdown = computeCeramicTerraceJob(input, policy);
    const tileQuantity = breakdown.materials.find((m) => m.label === 'ceramic_tiles')!.finalQuantity;

    const result = applyInventoryOffset(
      input,
      breakdown,
      { ceramicTilesOnHand: tileQuantity, sandSubbaseOnHand: 0 },
      policy,
    );

    expect(result.tileOffset.quantityFromInventory).toBeCloseTo(tileQuantity, 2);
    expect(result.tileOffset.quantityToBuy).toBeCloseTo(0, 2);
    expect(result.inventorySavingsEur).toBeGreaterThan(0);
    expect(result.adjustedCosts.materials).toBeLessThan(breakdown.costs.materials);
    // A lower cost still respects the profit floor — it just changes the total less than the naive cost delta would suggest.
    expect(result.pricing.grossProfit).toBeGreaterThanOrEqual(1200 - 0.01);
  });

  it('never gives an inventory offset for customer-supplied tiles (there is no cost to save)', () => {
    const input = baseInput({ tileSuppliedBy: 'customer', tileUnitCostPerM2: null });
    const breakdown = computeCeramicTerraceJob(input, policy);
    const tileQuantity = breakdown.materials.find((m) => m.label === 'ceramic_tiles')!.finalQuantity;

    const result = applyInventoryOffset(
      input,
      breakdown,
      { ceramicTilesOnHand: tileQuantity, sandSubbaseOnHand: 0 },
      policy,
    );

    expect(result.inventorySavingsEur).toBe(0);
  });

  it('only offsets the portion actually available, buying the rest', () => {
    const input = baseInput();
    const breakdown = computeCeramicTerraceJob(input, policy);
    const tileQuantity = breakdown.materials.find((m) => m.label === 'ceramic_tiles')!.finalQuantity;
    const partialStock = tileQuantity / 2;

    const result = applyInventoryOffset(
      input,
      breakdown,
      { ceramicTilesOnHand: partialStock, sandSubbaseOnHand: 0 },
      policy,
    );

    expect(result.tileOffset.quantityFromInventory).toBeCloseTo(partialStock, 2);
    expect(result.tileOffset.quantityToBuy).toBeCloseTo(tileQuantity - partialStock, 2);
  });
});
