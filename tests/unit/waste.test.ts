import { describe, it, expect } from 'vitest';
import { calculateWasteEstimate } from '@/lib/pricing/waste';

describe('waste & disposal estimate', () => {
  it('computes a full disposal cost breakdown for normal waste', () => {
    const result = calculateWasteEstimate({
      category: 'concrete_pavers',
      volumeM3: 4,
      containerCount: 1,
      tripCount: 1,
      loadingLabourHours: 2,
      loadingLabourHourlyRate: 35,
      transportCostPerTrip: 45,
      tippingFeePerContainer: 180,
      containerFeePerContainer: 90,
    });
    expect(result.isHazardous).toBe(false);
    expect(result.totalCost).toBeCloseTo(2 * 35 + 45 + 180 + 90, 2);
  });

  it('never prices suspected asbestos as normal waste, even if a cost breakdown is provided', () => {
    const result = calculateWasteEstimate({
      category: 'concrete_pavers',
      volumeM3: 4,
      containerCount: 1,
      tripCount: 1,
      loadingLabourHours: 2,
      loadingLabourHourlyRate: 35,
      transportCostPerTrip: 45,
      tippingFeePerContainer: 180,
      containerFeePerContainer: 90,
      suspectedAsbestos: true,
    });
    expect(result.isHazardous).toBe(true);
    expect(result.requiresSpecialistDisposal).toBe(true);
    expect(result.totalCost).toBe(0);
    expect(result.blockingHazardWarning).not.toBeNull();
  });

  it('treats the unknown_hazardous category as hazardous even without explicit flags', () => {
    const result = calculateWasteEstimate({
      category: 'unknown_hazardous',
      volumeM3: 1,
      containerCount: 1,
      tripCount: 1,
      loadingLabourHours: 1,
      loadingLabourHourlyRate: 35,
      transportCostPerTrip: 45,
      tippingFeePerContainer: 180,
      containerFeePerContainer: 90,
    });
    expect(result.isHazardous).toBe(true);
  });
});
