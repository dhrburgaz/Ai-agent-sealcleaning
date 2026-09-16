import { describe, it, expect } from 'vitest';
import { compareEquipmentVsExtraLabour, equipmentTotalCost } from '@/lib/pricing/equipment';

describe('equipment vs extra labour comparison', () => {
  it('recommends renting when equipment is cheaper than the extra labour it saves', () => {
    const result = compareEquipmentVsExtraLabour(
      { label: 'Trilplaat', ownership: 'rented', days: 1, dailyRentalCost: 60, fuelCostPerDay: 10, labourHoursSavedTotal: 6 },
      { extraHours: 6, hourlyCost: 35 },
    );
    expect(result.equipmentTotalCost).toBe(70);
    expect(result.extraLabourTotalCost).toBe(210);
    expect(result.recommendedOption).toBe('equipment');
    expect(result.hoursSaved).toBe(6);
  });

  it('recommends extra labour when equipment rental is more expensive', () => {
    const result = compareEquipmentVsExtraLabour(
      { label: 'Minigraver', ownership: 'rented', days: 2, dailyRentalCost: 300, transportCost: 100, labourHoursSavedTotal: 4 },
      { extraHours: 4, hourlyCost: 35 },
    );
    expect(result.recommendedOption).toBe('extra_labour');
  });

  it('computes total equipment cost including deposit and damage waiver', () => {
    const cost = equipmentTotalCost({
      label: 'Tegelzaag',
      ownership: 'rented',
      days: 1,
      dailyRentalCost: 40,
      depositCost: 100,
      damageWaiverCost: 15,
      labourHoursSavedTotal: 2,
    });
    expect(cost).toBe(40 + 100 + 15);
  });
});
