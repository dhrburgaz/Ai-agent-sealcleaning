import { describe, it, expect } from 'vitest';
import { calculateLabourPlan, suggestProductionRateCalibration } from '@/lib/pricing/labour';

describe('crew cost calculation', () => {
  it('multiplies total hours by crew size and applies employer burden', () => {
    const result = calculateLabourPlan({
      crew: [
        { kind: 'owner', hourlyCost: 35 },
        { kind: 'employee', hourlyCost: 20, employerBurdenPercent: 25 },
      ],
      taskHours: 8,
      setupHours: 1,
    });
    expect(result.totalHoursPerCrewMember).toBe(9);
    expect(result.totalCrewHours).toBe(18);
    const expectedCost = 35 * 9 + 20 * 1.25 * 9;
    expect(result.totalLabourCost).toBeCloseTo(expectedCost, 5);
  });

  it('shows the profit effect of adding a worker via increased total labour cost', () => {
    const onePerson = calculateLabourPlan({ crew: [{ kind: 'owner', hourlyCost: 35 }], taskHours: 10 });
    const twoPeople = calculateLabourPlan({
      crew: [
        { kind: 'owner', hourlyCost: 35 },
        { kind: 'helper', hourlyCost: 22 },
      ],
      taskHours: 10,
    });
    expect(twoPeople.totalLabourCost).toBeGreaterThan(onePerson.totalLabourCost);
  });
});

describe('production rate calibration — never silent', () => {
  it('refuses to suggest calibration with too little evidence', () => {
    const suggestion = suggestProductionRateCalibration({
      taskKey: 'tile_install_m2',
      currentUnitsPerHour: 1.2,
      observedUnitsPerHour: 1.5,
      sampleSize: 1,
    });
    expect(suggestion.suggestedUnitsPerHour).toBeNull();
  });

  it('only ever suggests a calibration for the owner to approve, never applies it', () => {
    const suggestion = suggestProductionRateCalibration({
      taskKey: 'tile_install_m2',
      currentUnitsPerHour: 1.2,
      observedUnitsPerHour: 1.5,
      sampleSize: 5,
    });
    expect(suggestion.suggestedUnitsPerHour).toBe(1.5);
    expect(suggestion.reason).toContain('Onayınız gerekli');
  });
});
