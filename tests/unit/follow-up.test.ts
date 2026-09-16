import { describe, it, expect } from 'vitest';
import { canScheduleFollowUp } from '@/lib/crm/follow-up';

describe('follow-up opt-out (sections 17/35)', () => {
  it('never schedules a follow-up for an opted-out customer', () => {
    const result = canScheduleFollowUp({ customerOptedOut: true, sequenceStep: 1 });
    expect(result.allowed).toBe(false);
  });

  it('allows the first and second reminder for an opted-in customer', () => {
    expect(canScheduleFollowUp({ customerOptedOut: false, sequenceStep: 1 }).allowed).toBe(true);
    expect(canScheduleFollowUp({ customerOptedOut: false, sequenceStep: 2 }).allowed).toBe(true);
  });

  it('archives instead of sending a third reminder by default', () => {
    const result = canScheduleFollowUp({ customerOptedOut: false, sequenceStep: 3 });
    expect(result.allowed).toBe(false);
  });
});
