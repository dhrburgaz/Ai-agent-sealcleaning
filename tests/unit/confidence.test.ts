import { describe, it, expect } from 'vitest';
import { computeQuoteConfidence, tierForScore, customerFacingLanguageLevel } from '@/lib/pricing/confidence';

describe('quote confidence tiers', () => {
  it('classifies scores per the configured thresholds (0.85 high, 0.65 medium)', () => {
    expect(tierForScore(0.9)).toBe('high');
    expect(tierForScore(0.7)).toBe('medium');
    expect(tierForScore(0.3)).toBe('low');
  });

  it('uses "prijsindicatie" for anything below high confidence and "offerte" once high', () => {
    expect(customerFacingLanguageLevel(0.9)).toBe('offerte');
    expect(customerFacingLanguageLevel(0.7)).toBe('prijsindicatie');
    expect(customerFacingLanguageLevel(0.2)).toBe('prijsindicatie');
  });
});

describe('computeQuoteConfidence', () => {
  it('scores all-known facts near the top', () => {
    const score = computeQuoteConfidence(['known', 'known', 'known']);
    expect(score).toBeGreaterThan(0.9);
  });

  it('scores all-unknown facts low', () => {
    const score = computeQuoteConfidence(['unknown', 'unknown', 'must_verify_on_site']);
    expect(score).toBeLessThan(0.3);
  });

  it('never claims exact scale from a photo-only measurement without a real scale reference', () => {
    const withPhotoScale = computeQuoteConfidence(['known', 'known'], { photoOnlyScale: true });
    const withoutPenalty = computeQuoteConfidence(['known', 'known']);
    expect(withPhotoScale).toBeLessThan(withoutPenalty);
  });

  it('applies additional penalties for unclear access/excavation/drainage', () => {
    const clean = computeQuoteConfidence(['known', 'known', 'known']);
    const penalized = computeQuoteConfidence(['known', 'known', 'known'], {
      unclearAccess: true,
      unclearExcavation: true,
      drainageUnknown: true,
    });
    expect(penalized).toBeLessThan(clean);
  });

  it('never returns a score outside [0, 1]', () => {
    const score = computeQuoteConfidence([], {
      noDimensions: true,
      photoOnlyScale: true,
      unclearAccess: true,
      unclearExcavation: true,
      drainageUnknown: true,
      disposalUnknown: true,
      supplierStale: true,
      customerSuppliedMaterialUnclear: true,
      technicallySensitiveNoVisit: true,
    });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});
