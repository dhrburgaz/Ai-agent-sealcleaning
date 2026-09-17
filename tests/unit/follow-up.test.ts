import { describe, it, expect } from 'vitest';
import { canScheduleFollowUp, computeNextFollowUpDate } from '@/lib/crm/follow-up';

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

describe('computeNextFollowUpDate', () => {
  const from = new Date('2026-01-01T00:00:00Z');

  it('schedules the first reminder 3 days out', () => {
    expect(computeNextFollowUpDate(1, from).toISOString()).toBe('2026-01-04T00:00:00.000Z');
  });

  it('schedules the second reminder 7 days out', () => {
    expect(computeNextFollowUpDate(2, from).toISOString()).toBe('2026-01-08T00:00:00.000Z');
  });

  it('falls back to the longest interval beyond the configured steps', () => {
    expect(computeNextFollowUpDate(5, from).toISOString()).toBe('2026-01-08T00:00:00.000Z');
  });
});
