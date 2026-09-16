/**
 * Agent 04 — Qualification & Priority (master spec section 9 / 4).
 * Deterministic scoring — no protected-trait inputs are accepted (see
 * `FORBIDDEN_TRAIT_KEYS` / `assertNoSensitiveTraits`, enforced at the intake boundary).
 */
import type { LeadPriority } from '@/db/schema/leads';

export const FORBIDDEN_TRAIT_KEYS = [
  'ethnicity',
  'religion',
  'sex',
  'gender',
  'nationality',
  'politicalViews',
  'disability',
  'race',
] as const;

export function assertNoSensitiveTraits(input: Record<string, unknown>): void {
  const present = FORBIDDEN_TRAIT_KEYS.filter((key) => key in input);
  if (present.length > 0) {
    throw new Error(
      `Qualification input must not contain protected-trait fields: ${present.join(', ')}`,
    );
  }
}

export interface QualificationInput {
  withinServiceRadius: boolean;
  serviceFit: boolean;
  estimatedScale: 'small' | 'medium' | 'large' | 'unknown';
  urgency: 'low' | 'medium' | 'high' | 'unknown';
  informationQuality: number; // 0..1, higher = more complete
  hasPhotos: boolean;
  accessKnown: boolean;
  complexity: 'low' | 'medium' | 'high' | 'unknown';
  quoteConfidence: number | null; // 0..1
  hoursSinceLastResponse: number | null;
  requiresSiteVisit: boolean;
  seeksCheapOnly: boolean | null;
  bundleOpportunityNearby: boolean;
}

export interface QualificationResult {
  priority: LeadPriority;
  score: number; // 0..100
  reasons: string[];
  nextBestAction: string;
}

export function qualifyLead(input: QualificationInput): QualificationResult {
  const reasons: string[] = [];

  if (!input.serviceFit) {
    return {
      priority: 'probably_decline',
      score: 0,
      reasons: ['Talep edilen hizmet şu anda sunulan kategoriler dışında.'],
      nextBestAction: 'Kibar bir ret mesajı hazırla.',
    };
  }

  if (!input.withinServiceRadius) {
    return {
      priority: 'probably_decline',
      score: 10,
      reasons: ['Hizmet bölgesi/yarıçapı dışında.'],
      nextBestAction: 'Kibar bir ret mesajı hazırla veya yönlendirme öner.',
    };
  }

  if (input.informationQuality < 0.25 && !input.hasPhotos) {
    reasons.push('Bilgi kalitesi çok düşük, fotoğraf yok.');
    return {
      priority: 'insufficient_info',
      score: 20,
      reasons,
      nextBestAction: 'En yüksek değerli 2-4 soruyu sor.',
    };
  }

  let score = 50;

  if (input.estimatedScale === 'large') {
    score += 15;
    reasons.push('Büyük ölçekli iş.');
  } else if (input.estimatedScale === 'medium') {
    score += 8;
    reasons.push('Orta ölçekli iş.');
  } else if (input.estimatedScale === 'small') {
    score -= 5;
    reasons.push('Küçük ölçekli iş.');
  }

  if (input.urgency === 'high') {
    score += 10;
    reasons.push('Aciliyet yüksek.');
  } else if (input.urgency === 'low') {
    score -= 3;
  }

  score += Math.round(input.informationQuality * 15);
  if (input.informationQuality >= 0.7) reasons.push('Bilgi kalitesi iyi.');

  if (input.hasPhotos) {
    score += 8;
    reasons.push('Fotoğraflar mevcut.');
  }

  if (input.accessKnown) {
    score += 5;
  } else {
    score -= 3;
    reasons.push('Erişim bilgisi eksik.');
  }

  if (input.complexity === 'high') {
    score -= 8;
    reasons.push('Teknik karmaşıklık yüksek, keşif önerilir.');
  }

  if (input.quoteConfidence !== null) {
    score += Math.round((input.quoteConfidence - 0.5) * 20);
  }

  if (input.hoursSinceLastResponse !== null && input.hoursSinceLastResponse > 72) {
    score -= 10;
    reasons.push('Uzun süredir cevap yok.');
  }

  if (input.seeksCheapOnly) {
    score -= 12;
    reasons.push('Sadece en ucuzu arıyor gibi görünüyor.');
  }

  score = Math.max(0, Math.min(100, score));

  let priority: LeadPriority;
  let nextBestAction: string;

  if (input.bundleOpportunityNearby && score >= 40) {
    priority = 'bundle_opportunity';
    nextBestAction = 'Aynı bölgedeki diğer işle birleştirerek planla.';
  } else if (score >= 70) {
    priority = 'hot';
    nextBestAction = input.requiresSiteVisit ? 'Keşif için hemen teklif ver.' : 'Fiyat teklifini hazırla.';
  } else if (score >= 50) {
    priority = 'warm';
    nextBestAction = 'Eksik bilgileri tamamlamak için takip et.';
  } else {
    priority = 'cold';
    nextBestAction = 'Düşük öncelikli takip listesine ekle.';
  }

  return { priority, score, reasons, nextBestAction };
}
