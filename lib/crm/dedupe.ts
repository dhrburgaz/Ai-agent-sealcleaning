/**
 * Agent 03 — Lead Enrichment & Deduplication (master spec section 9 / 3).
 * Creates one clean record per real opportunity. Auto-merge only fires on a strong
 * identifier match (phone/email/source URL/platform id) — never on name/text
 * similarity alone, per the explicit spec guard: "must never merge unrelated
 * leads just because names look similar."
 */

export interface DedupeCandidate {
  id: string;
  phone?: string | null;
  email?: string | null;
  sourceUrl?: string | null;
  sourceExternalId?: string | null;
  rawText?: string | null;
}

export type DedupeMatchReason = 'phone' | 'email' | 'source_url' | 'source_external_id' | 'fuzzy_text';

export interface DedupeMatch {
  candidateId: string;
  reason: DedupeMatchReason;
  autoMergeEligible: boolean;
  similarity?: number;
}

export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 6 ? digits : null;
}

export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed.includes('@') ? trimmed : null;
}

function normalizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.trim().replace(/\/+$/, '').toLowerCase();
}

function wordSet(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );
}

/** Jaccard similarity over word sets. Used only to flag possible duplicates for human review. */
export function textSimilarity(a: string, b: string): number {
  const setA = wordSet(a);
  const setB = wordSet(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const word of setA) {
    if (setB.has(word)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

const FUZZY_TEXT_REVIEW_THRESHOLD = 0.6;

export function findDuplicates(
  incoming: DedupeCandidate,
  existing: DedupeCandidate[],
): DedupeMatch[] {
  const matches: DedupeMatch[] = [];
  const incomingPhone = normalizePhone(incoming.phone);
  const incomingEmail = normalizeEmail(incoming.email);
  const incomingUrl = normalizeUrl(incoming.sourceUrl);

  for (const candidate of existing) {
    if (candidate.id === incoming.id) continue;

    if (incomingPhone && incomingPhone === normalizePhone(candidate.phone)) {
      matches.push({ candidateId: candidate.id, reason: 'phone', autoMergeEligible: true });
      continue;
    }
    if (incomingEmail && incomingEmail === normalizeEmail(candidate.email)) {
      matches.push({ candidateId: candidate.id, reason: 'email', autoMergeEligible: true });
      continue;
    }
    if (incoming.sourceExternalId && incoming.sourceExternalId === candidate.sourceExternalId) {
      matches.push({
        candidateId: candidate.id,
        reason: 'source_external_id',
        autoMergeEligible: true,
      });
      continue;
    }
    if (incomingUrl && incomingUrl === normalizeUrl(candidate.sourceUrl)) {
      matches.push({ candidateId: candidate.id, reason: 'source_url', autoMergeEligible: true });
      continue;
    }

    if (incoming.rawText && candidate.rawText) {
      const similarity = textSimilarity(incoming.rawText, candidate.rawText);
      if (similarity >= FUZZY_TEXT_REVIEW_THRESHOLD) {
        // Fuzzy text alone is never auto-merge eligible — flagged for owner review only.
        matches.push({
          candidateId: candidate.id,
          reason: 'fuzzy_text',
          autoMergeEligible: false,
          similarity,
        });
      }
    }
  }

  return matches;
}

export interface MergeGuardResult {
  allowed: boolean;
  reason?: string;
}

/** Guards the actual merge operation against the "name-similarity-only" failure mode. */
export function canAutoMerge(match: DedupeMatch): MergeGuardResult {
  if (match.autoMergeEligible) return { allowed: true };
  return {
    allowed: false,
    reason:
      'Sadece metin/isim benzerliği otomatik birleştirme için yeterli değil; sahibin onayı gerekli.',
  };
}
