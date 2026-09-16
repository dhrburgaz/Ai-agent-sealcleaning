/**
 * Section 20 — Quote Confidence.
 * Suggested thresholds (configurable): 0.85-1.00 high, 0.65-0.84 medium, <0.65 low.
 */
import type { FactStatus } from '@/db/schema/scope';

export interface ConfidenceThresholds {
  high: number; // default 0.85
  medium: number; // default 0.65
}

export const DEFAULT_CONFIDENCE_THRESHOLDS: ConfidenceThresholds = { high: 0.85, medium: 0.65 };

export type ConfidenceTier = 'high' | 'medium' | 'low';

export function tierForScore(
  score: number,
  thresholds: ConfidenceThresholds = DEFAULT_CONFIDENCE_THRESHOLDS,
): ConfidenceTier {
  if (score >= thresholds.high) return 'high';
  if (score >= thresholds.medium) return 'medium';
  return 'low';
}

export interface ConfidencePenaltyFlags {
  noDimensions?: boolean;
  photoOnlyScale?: boolean;
  unclearAccess?: boolean;
  unclearExcavation?: boolean;
  drainageUnknown?: boolean;
  disposalUnknown?: boolean;
  supplierStale?: boolean;
  customerSuppliedMaterialUnclear?: boolean;
  technicallySensitiveNoVisit?: boolean;
}

const PENALTY_WEIGHTS: Record<keyof ConfidencePenaltyFlags, number> = {
  noDimensions: 0.15,
  photoOnlyScale: 0.1,
  unclearAccess: 0.08,
  unclearExcavation: 0.1,
  drainageUnknown: 0.07,
  disposalUnknown: 0.05,
  supplierStale: 0.05,
  customerSuppliedMaterialUnclear: 0.05,
  technicallySensitiveNoVisit: 0.15,
};

/**
 * Computes a quote confidence score from the known/assumed/unknown mix of facts plus
 * the explicit penalty flags called out in section 20. Never returns above 1 or below 0.
 */
export function computeQuoteConfidence(
  factStatuses: FactStatus[],
  penalties: ConfidencePenaltyFlags = {},
): number {
  const total = factStatuses.length;
  let base: number;
  if (total === 0) {
    base = 0.5;
  } else {
    const known = factStatuses.filter((s) => s === 'known').length;
    const assumed = factStatuses.filter((s) => s === 'assumed').length;
    const unknownOrVerify = total - known - assumed;
    base = (known * 1 + assumed * 0.6 + unknownOrVerify * 0.15) / total;
  }

  const penaltyTotal = (Object.keys(penalties) as (keyof ConfidencePenaltyFlags)[]).reduce(
    (sum, key) => sum + (penalties[key] ? PENALTY_WEIGHTS[key] : 0),
    0,
  );

  return Math.max(0, Math.min(1, base - penaltyTotal));
}

/** Section 20: "preliminary = prijsindicatie, sufficient = offerte". */
export function customerFacingLanguageLevel(confidence: number): 'prijsindicatie' | 'offerte' {
  return tierForScore(confidence) === 'low' || tierForScore(confidence) === 'medium'
    ? 'prijsindicatie'
    : 'offerte';
}
