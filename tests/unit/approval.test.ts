import { describe, it, expect } from 'vitest';
import { decideSend, changeApprovalMode } from '@/lib/messaging/approval';

describe('approval modes — send gating', () => {
  it('Draft Only never sends, even when marked approved', () => {
    const result = decideSend({ mode: 'draft_only', messageKind: 'quote', approved: true });
    expect(result.canSend).toBe(false);
  });

  it('Smart Approval requires approval for first contact', () => {
    const denied = decideSend({ mode: 'smart_approval', messageKind: 'first_contact', approved: false });
    expect(denied.canSend).toBe(false);
    const allowed = decideSend({ mode: 'smart_approval', messageKind: 'first_contact', approved: true });
    expect(allowed.canSend).toBe(true);
  });

  it('Smart Approval requires approval for quotes and appointments', () => {
    expect(decideSend({ mode: 'smart_approval', messageKind: 'quote', approved: false }).canSend).toBe(false);
    expect(decideSend({ mode: 'smart_approval', messageKind: 'appointment', approved: false }).canSend).toBe(false);
  });

  it('Smart Approval can auto-send low-risk follow-ups only when explicitly configured', () => {
    const notConfigured = decideSend({ mode: 'smart_approval', messageKind: 'follow_up', approved: false });
    expect(notConfigured.canSend).toBe(false);
    const configured = decideSend({
      mode: 'smart_approval',
      messageKind: 'follow_up',
      approved: false,
      lowRiskFollowUpAutoSendEnabled: true,
    });
    expect(configured.canSend).toBe(true);
  });

  it('Autopilot requires per-connector opt-in', () => {
    const result = decideSend({ mode: 'autopilot', messageKind: 'quote', approved: true, connectorAutopilotOptIn: false });
    expect(result.canSend).toBe(false);
  });

  it('Autopilot still requires approval for high-value/low-margin quotes when configured', () => {
    const denied = decideSend({
      mode: 'autopilot',
      messageKind: 'quote',
      approved: false,
      connectorAutopilotOptIn: true,
      requiresApprovalEvenInAutopilot: true,
    });
    expect(denied.canSend).toBe(false);
    const allowed = decideSend({
      mode: 'autopilot',
      messageKind: 'quote',
      approved: true,
      connectorAutopilotOptIn: true,
      requiresApprovalEvenInAutopilot: true,
    });
    expect(allowed.canSend).toBe(true);
  });
});

describe('approval mode changes — never self-enable autopilot', () => {
  it('rejects a system-initiated switch to autopilot', () => {
    const result = changeApprovalMode({ requestedMode: 'autopilot', ownerInitiated: false });
    expect(result.allowed).toBe(false);
  });

  it('allows an explicit owner-initiated switch to autopilot', () => {
    const result = changeApprovalMode({ requestedMode: 'autopilot', ownerInitiated: true });
    expect(result.allowed).toBe(true);
  });

  it('allows switching to draft_only or smart_approval regardless of initiator', () => {
    expect(changeApprovalMode({ requestedMode: 'draft_only', ownerInitiated: false }).allowed).toBe(true);
  });
});
