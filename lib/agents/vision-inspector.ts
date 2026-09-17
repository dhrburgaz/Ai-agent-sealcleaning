/**
 * Agent 06 — Photo / Vision Inspector (master spec section 9 / 6).
 *
 * Honest by construction: with no vision-capable AI provider configured
 * (the default, per the €0 budget), this agent cannot actually "see" a photo.
 * Rather than fabricate observations, a newly uploaded photo gets an empty,
 * clearly-unanalyzed skeleton the owner fills in themselves — every field the
 * spec requires (observations, possible scope items, hazards, access,
 * measurement claims, follow-up questions, confidence) still exists and is
 * auditable, it's just owner-sourced instead of model-sourced until a real
 * vision provider is configured and budgeted (`lib/ai/router.ts`).
 *
 * The one thing this module refuses to do, ever, matches the spec exactly:
 * claim an exact measurement from a photo without a reliable scale reference.
 */

export interface PhotoAnalysisSkeleton {
  observations: string[];
  possibleScopeItems: string[];
  hazardsOrRisks: string[];
  accessObservations: string[];
  measurementClaims: Record<string, unknown> | null;
  questionsToAsk: string[];
  overallConfidence: number;
}

const DEFAULT_QUESTIONS_TO_ASK = [
  'Fotoğraftaki alanın yaklaşık ölçüsü nedir (bir referans nesne veya ölçüm var mı)?',
  'Zeminin mevcut durumu (beton/toprak/eski taş) net mi?',
  'Erişim genişliği fotoğraftan anlaşılıyor mu, yoksa sahada mı ölçülmeli?',
];

/** The skeleton created the moment a photo is uploaded — before anyone (owner or model) has looked at it. */
export function buildManualReviewSkeleton(): PhotoAnalysisSkeleton {
  return {
    observations: [],
    possibleScopeItems: [],
    hazardsOrRisks: [],
    accessObservations: [],
    measurementClaims: null,
    questionsToAsk: DEFAULT_QUESTIONS_TO_ASK,
    overallConfidence: 0,
  };
}

/**
 * Section 6: "never claim exact m² from photo without reliable scale." Any
 * measurement claim attached to a photo is dropped unless a scale reference
 * (a known-size object, a tape measure in frame, etc.) was actually recorded.
 */
export function sanitizeMeasurementClaims(
  claims: Record<string, unknown> | null,
  hasScaleReference: boolean,
): Record<string, unknown> | null {
  if (!claims) return null;
  if (!hasScaleReference) return null;
  return claims;
}

export interface PhotoConfidenceInput {
  ownerAnnotated: boolean;
  observationCount: number;
  hasScaleReference: boolean;
}

/**
 * Owner-sourced text notes are more trustworthy than nothing, but they are
 * still not a verified on-site measurement — this never reaches "high"
 * confidence (>=0.85, see lib/pricing/confidence.ts) on photo data alone.
 */
export function computePhotoConfidence(input: PhotoConfidenceInput): number {
  if (!input.ownerAnnotated) return 0;
  const base = 0.5 + 0.05 * Math.min(input.observationCount, 5);
  const scaleBonus = input.hasScaleReference ? 0.1 : 0;
  return Math.max(0, Math.min(0.8, base + scaleBonus));
}

// Duplicate-image detection is not reimplemented here — see
// lib/pricing/image-dedupe.ts#findExistingAnalysisByHash, used by the upload
// Server Action to decide whether a new photo_analyses row is needed at all.
