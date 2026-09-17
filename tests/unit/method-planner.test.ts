import { describe, it, expect } from 'vitest';
import { buildMethodPlan, type MethodPlannerInput } from '@/lib/pricing/method-planner';

function baseInput(overrides: Partial<MethodPlannerInput> = {}): MethodPlannerInput {
  return {
    hasExistingSurfaceToRemove: true,
    currentSurfaceKnown: true,
    excavationNeeded: true,
    excavationDepthKnown: true,
    drainageKnown: true,
    soilOrSubbaseKnown: true,
    levelDifferencesKnown: true,
    accessWidthCm: 120,
    disposalIncluded: true,
    edging: true,
    cuttingComplexity: 'low',
    retainingWallInvolved: false,
    suspectedUtilitiesNearby: false,
    suspectedAsbestos: false,
    permitLikelyRequired: 'no',
    ...overrides,
  };
}

describe('Agent 08 — technical method planner', () => {
  it('produces a full, all-certain plan when every fact is known', () => {
    const plan = buildMethodPlan(baseInput());
    expect(plan.overallCertainty).toBe('high');
    expect(plan.verificationNeeded).toHaveLength(0);
    expect(plan.steps.every((s) => s.certain)).toBe(true);
    expect(plan.steps.map((s) => s.phase)).toContain('excavation');
    expect(plan.steps.map((s) => s.phase)).toContain('joints');
  });

  it('flags drainage, soil, and excavation-depth uncertainty for verification instead of guessing', () => {
    const plan = buildMethodPlan(
      baseInput({ drainageKnown: false, soilOrSubbaseKnown: false, excavationDepthKnown: false }),
    );
    expect(plan.verificationNeeded.length).toBeGreaterThanOrEqual(3);
    expect(plan.overallCertainty).not.toBe('high');
  });

  it('never claims excavation depth certainty when excavation need itself is unknown', () => {
    const plan = buildMethodPlan(baseInput({ excavationNeeded: null }));
    const excavationStep = plan.steps.find((s) => s.phase === 'excavation');
    expect(excavationStep?.certain).toBe(false);
    expect(plan.verificationNeeded.some((v) => v.includes('Kazı'))).toBe(true);
  });

  it('flags utilities and retaining-wall risk during excavation', () => {
    const plan = buildMethodPlan(baseInput({ suspectedUtilitiesNearby: true, retainingWallInvolved: true }));
    expect(plan.risks.some((r) => r.includes('tesisat'))).toBe(true);
    expect(plan.risks.some((r) => r.includes('İstinat'))).toBe(true);
  });

  it('refuses to treat suspected asbestos as a normal disposal step', () => {
    const plan = buildMethodPlan(baseInput({ suspectedAsbestos: true }));
    const disposalStep = plan.steps.find((s) => s.phase === 'disposal');
    expect(disposalStep?.certain).toBe(false);
    expect(plan.risks.some((r) => r.includes('asbest'))).toBe(true);
  });

  it('skips the removal step entirely when there is no existing surface to remove', () => {
    const plan = buildMethodPlan(baseInput({ hasExistingSurfaceToRemove: false }));
    expect(plan.steps.some((s) => s.phase === 'removal')).toBe(false);
  });

  it('flags a narrow access width as a risk', () => {
    const plan = buildMethodPlan(baseInput({ accessWidthCm: 60 }));
    expect(plan.risks.some((r) => r.includes('Dar erişim'))).toBe(true);
  });

  it('surfaces permit uncertainty distinctly from a confirmed permit requirement', () => {
    const unknown = buildMethodPlan(baseInput({ permitLikelyRequired: 'unknown' }));
    const required = buildMethodPlan(baseInput({ permitLikelyRequired: 'yes' }));
    expect(unknown.verificationNeeded.some((v) => v.includes('İzin'))).toBe(true);
    expect(required.risks.some((r) => r.includes('İzin'))).toBe(true);
  });
});
