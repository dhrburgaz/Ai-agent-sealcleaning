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
