import { describe, it, expect } from 'vitest';
import { calculateLandedCost, compareSuppliers, validateDiscountClaim, type SupplierObservationInput } from '@/lib/suppliers/landed-cost';

function baseObservation(overrides: Partial<SupplierObservationInput> = {}): SupplierObservationInput {
  return {
    supplierId: 's1',
    supplierName: 'DEMO Bouwmarkt',
    unitPrice: 24.95,
    vatIncluded: true,
    vatRatePercent: 21,
    deliveryFee: 15,
    pickupAvailable: false,
    minimumOrder: 0,
    distanceKm: 10,
    preferred: false,
    observedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

describe('supplier landed cost', () => {
  it('computes landed cost excluding VAT and including delivery', () => {
    const result = calculateLandedCost(baseObservation(), 40, new Date('2024-01-05'));
    const expectedUnitExVat = 24.95 / 1.21;
    expect(result.landedCostForJob).toBeCloseTo(expectedUnitExVat * 40 + 15, 2);
  });

  it('skips delivery cost when pickup is available', () => {
    const result = calculateLandedCost(baseObservation({ pickupAvailable: true }), 40, new Date('2024-01-05'));
    const expectedUnitExVat = 24.95 / 1.21;
    expect(result.landedCostForJob).toBeCloseTo(expectedUnitExVat * 40, 2);
  });

  it('respects the supplier minimum order quantity', () => {
    const result = calculateLandedCost(baseObservation({ minimumOrder: 100, pickupAvailable: true }), 40, new Date('2024-01-05'));
    const expectedUnitExVat = 24.95 / 1.21;
    expect(result.landedCostForJob).toBeCloseTo(expectedUnitExVat * 100, 2);
  });

  it('flags an observation as stale once past its stale-after date', () => {
    const result = calculateLandedCost(
      baseObservation({ staleAfter: new Date('2024-01-10') }),
      40,
      new Date('2024-02-01'),
    );
    expect(result.isStale).toBe(true);
  });
});

describe('discount evidence requirement', () => {
  it('rejects a discount label without an evidence URL', () => {
    const check = validateDiscountClaim(baseObservation({ discountLabel: 'Aanbieding' }));
    expect(check.accepted).toBe(false);
  });

  it('accepts a discount label backed by an evidence URL', () => {
    const check = validateDiscountClaim(
      baseObservation({ discountLabel: 'Aanbieding', discountEvidenceUrl: 'https://example.com/deal' }),
    );
    expect(check.accepted).toBe(true);
  });

  it('accepts observations with no discount claim at all', () => {
    expect(validateDiscountClaim(baseObservation()).accepted).toBe(true);
  });
});

describe('supplier comparison', () => {
  it('picks the cheapest non-stale supplier and recommends buy_now for an evidenced discount', () => {
    const comparison = compareSuppliers(
      [
        baseObservation({ supplierId: 'expensive', unitPrice: 40 }),
        baseObservation({
          supplierId: 'cheap',
          unitPrice: 20,
          discountLabel: 'Aanbieding',
          discountEvidenceUrl: 'https://example.com/deal',
        }),
      ],
      40,
      new Date('2024-01-05'),
    );
    expect(comparison.cheapest?.supplierId).toBe('cheap');
    expect(comparison.recommendation).toBe('buy_now');
  });

  it('excludes stale observations from the comparison', () => {
    const comparison = compareSuppliers(
      [baseObservation({ supplierId: 'stale', unitPrice: 5, staleAfter: new Date('2024-01-01') })],
      40,
      new Date('2024-02-01'),
    );
    expect(comparison.cheapest).toBeNull();
    expect(comparison.recommendation).toBe('verify');
  });
});
