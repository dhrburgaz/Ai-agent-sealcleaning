import { describe, it, expect } from 'vitest';
import { calculateMaterialRequirement, materialsCostForJob } from '@/lib/pricing/bom';

describe('bill of materials quantity math', () => {
  it('applies waste/cutting/breakage/spare percentages compounded, then rounds up', () => {
    const result = calculateMaterialRequirement({
      label: 'ceramic_tiles',
      unit: 'm2',
      netQuantity: 40,
      wastePercent: 5,
      cuttingPercent: 5,
      suppliedBy: 'company',
    });
    // 40 * 1.05 * 1.05 = 44.1
    expect(result.finalQuantity).toBeCloseTo(44.1, 2);
  });

  it('rounds up to the package size when one is specified', () => {
    const result = calculateMaterialRequirement({
      label: 'sand_subbase',
      unit: 'm3',
      netQuantity: 4.1,
      packageRoundingUnit: 1,
      suppliedBy: 'company',
    });
    expect(result.finalQuantity).toBe(5);
  });
});

describe('materials cost — customer-supplied vs company-supplied', () => {
  it('excludes customer-supplied and in-stock items from job cost', () => {
    const items = [
      calculateMaterialRequirement({ label: 'tiles', unit: 'm2', netQuantity: 40, suppliedBy: 'customer' }),
      calculateMaterialRequirement({ label: 'sand', unit: 'm3', netQuantity: 4, suppliedBy: 'company' }),
    ];
    const cost = materialsCostForJob(items, { tiles: 30, sand: 45 });
    expect(cost).toBeCloseTo(items[1]!.finalQuantity * 45, 2);
  });

  it('includes company-supplied items in job cost', () => {
    const items = [calculateMaterialRequirement({ label: 'tiles', unit: 'm2', netQuantity: 40, suppliedBy: 'company' })];
    const cost = materialsCostForJob(items, { tiles: 30 });
    expect(cost).toBeCloseTo(items[0]!.finalQuantity * 30, 2);
    expect(cost).toBeGreaterThan(0);
  });
});
