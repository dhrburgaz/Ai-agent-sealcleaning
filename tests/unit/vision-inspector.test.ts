import { describe, it, expect } from 'vitest';
import {
  buildManualReviewSkeleton,
  sanitizeMeasurementClaims,
  computePhotoConfidence,
} from '@/lib/agents/vision-inspector';

describe('Agent 06 — photo/vision inspector (no fabrication)', () => {
  it('starts every new photo at zero confidence with no fabricated observations', () => {
    const skeleton = buildManualReviewSkeleton();
    expect(skeleton.overallConfidence).toBe(0);
    expect(skeleton.observations).toEqual([]);
    expect(skeleton.measurementClaims).toBeNull();
    expect(skeleton.questionsToAsk.length).toBeGreaterThan(0);
  });

  it('never claims a measurement from a photo without a reliable scale reference', () => {
    const claims = { areaM2: 40 };
    expect(sanitizeMeasurementClaims(claims, false)).toBeNull();
    expect(sanitizeMeasurementClaims(claims, true)).toEqual(claims);
  });

  it('keeps null claims null regardless of scale reference', () => {
    expect(sanitizeMeasurementClaims(null, true)).toBeNull();
  });

  it('gives zero confidence to an un-annotated photo', () => {
    expect(computePhotoConfidence({ ownerAnnotated: false, observationCount: 5, hasScaleReference: true })).toBe(0);
  });

  it('never reaches high confidence (>=0.85) from owner text notes alone', () => {
    const confidence = computePhotoConfidence({ ownerAnnotated: true, observationCount: 10, hasScaleReference: true });
    expect(confidence).toBeLessThan(0.85);
  });

  it('gives a small bonus for having a scale reference', () => {
    const without = computePhotoConfidence({ ownerAnnotated: true, observationCount: 2, hasScaleReference: false });
    const withScale = computePhotoConfidence({ ownerAnnotated: true, observationCount: 2, hasScaleReference: true });
    expect(withScale).toBeGreaterThan(without);
  });
});
