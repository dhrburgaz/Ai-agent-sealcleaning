/** Section 17 / 35 — follow-up scheduling must respect opt-out. */

export interface FollowUpCheckInput {
  customerOptedOut: boolean;
  sequenceStep: number;
  maxSteps?: number;
}

export interface FollowUpDecision {
  allowed: boolean;
  reason: string;
}

const DEFAULT_MAX_STEPS = 2; // first reminder + second/final reminder, then archive (section 17)

export function canScheduleFollowUp(input: FollowUpCheckInput): FollowUpDecision {
  if (input.customerOptedOut) {
    return { allowed: false, reason: 'Müşteri takip mesajlarından çıkmış (opt-out).' };
  }
  const maxSteps = input.maxSteps ?? DEFAULT_MAX_STEPS;
  if (input.sequenceStep > maxSteps) {
    return { allowed: false, reason: 'Maksimum takip adımına ulaşıldı; kayıt arşivlenmeli.' };
  }
  return { allowed: true, reason: 'Takip mesajı planlanabilir.' };
}

/** Days to wait before each sequence step (section 17): first reminder after
 *  3 days, a final reminder 7 days after that, then archive. Steps beyond the
 *  configured map fall back to the longest interval rather than guessing. */
const FOLLOW_UP_INTERVAL_DAYS: Record<number, number> = { 1: 3, 2: 7 };
const DAY_MS = 24 * 60 * 60 * 1000;

export function computeNextFollowUpDate(sequenceStep: number, from: Date): Date {
  const days = FOLLOW_UP_INTERVAL_DAYS[sequenceStep] ?? 7;
  return new Date(from.getTime() + days * DAY_MS);
}
