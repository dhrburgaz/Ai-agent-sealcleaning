import { describe, it, expect } from 'vitest';
import { canTransition, buildTransitionRecord, isTerminalState, LEAD_STATES } from '@/lib/crm/state-machine';

describe('lead state machine', () => {
  it('allows the natural NEW -> REVIEWED -> QUALIFIED -> ... -> WON path', () => {
    expect(canTransition('NEW', 'REVIEWED').allowed).toBe(true);
    expect(canTransition('REVIEWED', 'QUALIFIED').allowed).toBe(true);
    expect(canTransition('QUALIFIED', 'ESTIMATE_IN_PROGRESS').allowed).toBe(true);
    expect(canTransition('QUOTE_SENT', 'WON').allowed).toBe(true);
  });

  it('rejects a transition that skips required states', () => {
    expect(canTransition('NEW', 'WON').allowed).toBe(false);
    expect(canTransition('NEW', 'COMPLETED').allowed).toBe(false);
  });

  it('rejects a no-op transition to the same state', () => {
    expect(canTransition('NEW', 'NEW').allowed).toBe(false);
  });

  it('allows LOST and ARCHIVED from most active states', () => {
    expect(canTransition('NEGOTIATING', 'LOST').allowed).toBe(true);
    expect(canTransition('SITE_VISIT_BOOKED', 'ARCHIVED').allowed).toBe(true);
  });

  it('treats ARCHIVED as a true terminal state', () => {
    expect(isTerminalState('ARCHIVED')).toBe(true);
    expect(canTransition('ARCHIVED', 'NEW').allowed).toBe(false);
  });

  it('builds an auditable transition record for a valid move and throws for an invalid one', () => {
    const record = buildTransitionRecord('NEW', 'REVIEWED', 'owner', 'ilk inceleme');
    expect(record.fromState).toBe('NEW');
    expect(record.toState).toBe('REVIEWED');
    expect(() => buildTransitionRecord('NEW', 'WON', 'owner')).toThrow();
  });

  it('covers all 22 states from the master spec (section 23)', () => {
    expect(LEAD_STATES).toHaveLength(22);
  });
});
