import { describe, it, expect } from 'vitest';
import { offsetRequirementWithInventory } from '@/lib/pricing/inventory';

describe('inventory offset before purchasing (section 33)', () => {
  it('buys nothing when inventory fully covers the requirement', () => {
    const result = offsetRequirementWithInventory(10, 20);
    expect(result.quantityFromInventory).toBe(10);
    expect(result.quantityToBuy).toBe(0);
  });

  it('buys only the shortfall when inventory partially covers the requirement', () => {
    const result = offsetRequirementWithInventory(30, 12);
    expect(result.quantityFromInventory).toBe(12);
    expect(result.quantityToBuy).toBe(18);
  });

  it('buys the full amount when there is no inventory on hand', () => {
    const result = offsetRequirementWithInventory(15, 0);
    expect(result.quantityToBuy).toBe(15);
  });
});
