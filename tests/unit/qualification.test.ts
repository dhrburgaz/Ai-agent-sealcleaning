import { describe, it, expect } from 'vitest';
import { qualifyLead, assertNoSensitiveTraits, FORBIDDEN_TRAIT_KEYS, type QualificationInput } from '@/lib/crm/qualification';

function baseInput(overrides: Partial<QualificationInput> = {}): QualificationInput {
  return {
    withinServiceRadius: true,
    serviceFit: true,
    estimatedScale: 'medium',
    urgency: 'medium',
    informationQuality: 0.6,
    hasPhotos: true,
    accessKnown: true,
    complexity: 'low',
    quoteConfidence: 0.7,
    hoursSinceLastResponse: null,
    requiresSiteVisit: false,
    seeksCheapOnly: false,
    bundleOpportunityNearby: false,
    ...overrides,
  };
}

describe('lead qualification scoring', () => {
  it('declines leads outside the service radius or service fit', () => {
    expect(qualifyLead(baseInput({ serviceFit: false })).priority).toBe('probably_decline');
    expect(qualifyLead(baseInput({ withinServiceRadius: false })).priority).toBe('probably_decline');
  });

  it('flags insufficient info when quality is very low and there are no photos', () => {
    const result = qualifyLead(baseInput({ informationQuality: 0.1, hasPhotos: false }));
    expect(result.priority).toBe('insufficient_info');
  });

  it('scores a large, urgent, well-documented lead as hot', () => {
    const result = qualifyLead(
      baseInput({ estimatedScale: 'large', urgency: 'high', informationQuality: 0.9, quoteConfidence: 0.9 }),
    );
    expect(result.priority).toBe('hot');
  });

  it('never accepts protected-trait fields in the qualification input', () => {
    expect(() => assertNoSensitiveTraits({ ethnicity: 'x' })).toThrow();
    expect(() => assertNoSensitiveTraits({ withinServiceRadius: true })).not.toThrow();
    expect(FORBIDDEN_TRAIT_KEYS.length).toBeGreaterThan(0);
  });

  it('penalizes leads that seem to be shopping for the cheapest option only', () => {
    const normal = qualifyLead(baseInput({ seeksCheapOnly: false }));
    const cheapOnly = qualifyLead(baseInput({ seeksCheapOnly: true }));
    expect(cheapOnly.score).toBeLessThan(normal.score);
  });
});
