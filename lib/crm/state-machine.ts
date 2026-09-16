/**
 * Section 23 — Lead State Machine. All transitions must be audited (section 44).
 */
import { LEAD_STATES, type LeadState } from '@/db/schema/leads';

export { LEAD_STATES };

const TRANSITIONS: Record<LeadState, LeadState[]> = {
  NEW: ['REVIEWED', 'LOST', 'ARCHIVED'],
  REVIEWED: ['NEEDS_INFO', 'CONTACT_DRAFTED', 'QUALIFIED', 'LOST', 'ARCHIVED'],
  NEEDS_INFO: ['CONTACT_DRAFTED', 'CONTACTED', 'LOST', 'ARCHIVED'],
  CONTACT_DRAFTED: ['CONTACTED', 'LOST', 'ARCHIVED'],
  CONTACTED: ['REPLIED', 'LOST', 'ARCHIVED'],
  REPLIED: ['QUALIFIED', 'NEEDS_INFO', 'LOST', 'ARCHIVED'],
  QUALIFIED: ['SITE_VISIT_PROPOSED', 'ESTIMATE_IN_PROGRESS', 'LOST', 'ARCHIVED'],
  SITE_VISIT_PROPOSED: ['SITE_VISIT_BOOKED', 'LOST', 'ARCHIVED'],
  SITE_VISIT_BOOKED: ['ESTIMATE_IN_PROGRESS', 'LOST', 'ARCHIVED'],
  ESTIMATE_IN_PROGRESS: ['ESTIMATE_READY', 'LOST', 'ARCHIVED'],
  ESTIMATE_READY: ['QUOTE_DRAFTED', 'LOST', 'ARCHIVED'],
  QUOTE_DRAFTED: ['QUOTE_SENT', 'LOST', 'ARCHIVED'],
  QUOTE_SENT: ['NEGOTIATING', 'WON', 'LOST', 'ARCHIVED'],
  NEGOTIATING: ['QUOTE_DRAFTED', 'WON', 'LOST', 'ARCHIVED'],
  WON: ['SCHEDULED', 'ARCHIVED'],
  SCHEDULED: ['IN_PROGRESS', 'ARCHIVED'],
  IN_PROGRESS: ['COMPLETED', 'ARCHIVED'],
  COMPLETED: ['INVOICED_REFERENCE', 'REVIEW_REQUESTED', 'ARCHIVED'],
  INVOICED_REFERENCE: ['REVIEW_REQUESTED', 'ARCHIVED'],
  REVIEW_REQUESTED: ['ARCHIVED'],
  LOST: ['ARCHIVED'],
  ARCHIVED: [],
};

export interface TransitionCheck {
  allowed: boolean;
  reason?: string;
}

export function canTransition(from: LeadState, to: LeadState): TransitionCheck {
  if (from === to) {
    return { allowed: false, reason: 'Lead zaten bu durumda.' };
  }
  const allowedTargets = TRANSITIONS[from];
  if (!allowedTargets.includes(to)) {
    return {
      allowed: false,
      reason: `${from} durumundan ${to} durumuna geçiş tanımlı değil.`,
    };
  }
  return { allowed: true };
}

export interface StateTransitionRecord {
  fromState: LeadState;
  toState: LeadState;
  actor: string;
  detail?: string;
  timestamp: number;
}

export function buildTransitionRecord(
  from: LeadState,
  to: LeadState,
  actor: string,
  detail?: string,
): StateTransitionRecord {
  const check = canTransition(from, to);
  if (!check.allowed) {
    throw new Error(check.reason);
  }
  return { fromState: from, toState: to, actor, detail, timestamp: Date.now() };
}

export function isTerminalState(state: LeadState): boolean {
  return TRANSITIONS[state].length === 0;
}
