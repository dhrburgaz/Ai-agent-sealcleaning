/**
 * Section 19 — Approval Modes.
 *   Mode 1 Draft Only     — never sends automatically.
 *   Mode 2 Smart Approval — default. First contact, quotes and appointments need approval.
 *   Mode 3 Autopilot      — explicit opt-in per connector; high-value/low-margin can still
 *                           require approval if configured. The system must never enable
 *                           autopilot on its own (see `changeApprovalMode`).
 */

export type ApprovalMode = 'draft_only' | 'smart_approval' | 'autopilot';
export type MessageKind = 'first_contact' | 'quote' | 'appointment' | 'follow_up' | 'other';

export interface SendDecisionInput {
  mode: ApprovalMode;
  messageKind: MessageKind;
  approved: boolean;
  connectorAutopilotOptIn?: boolean;
  requiresApprovalEvenInAutopilot?: boolean;
  lowRiskFollowUpAutoSendEnabled?: boolean;
}

export interface SendDecision {
  canSend: boolean;
  reason: string;
}

export function decideSend(input: SendDecisionInput): SendDecision {
  if (input.mode === 'draft_only') {
    return { canSend: false, reason: 'Draft Only modunda hiçbir mesaj otomatik gönderilmez.' };
  }

  if (input.mode === 'smart_approval') {
    if (input.messageKind === 'follow_up' && input.lowRiskFollowUpAutoSendEnabled) {
      return {
        canSend: true,
        reason: 'Düşük riskli takip mesajı otomatik gönderim için yapılandırılmış.',
      };
    }
    if (input.approved) {
      return { canSend: true, reason: 'Sahibi tarafından onaylandı.' };
    }
    return { canSend: false, reason: 'Smart Approval modunda gönderim için onay gerekli.' };
  }

  // autopilot
  if (!input.connectorAutopilotOptIn) {
    return { canSend: false, reason: 'Bu bağlayıcı için otopilot ayrı ayrı açılmamış.' };
  }
  if (input.requiresApprovalEvenInAutopilot) {
    return input.approved
      ? { canSend: true, reason: 'Yüksek değerli/düşük marjlı işlem onaylandı.' }
      : { canSend: false, reason: 'Yüksek değerli/düşük marjlı işlemler otopilotta bile onay gerektirir.' };
  }
  return { canSend: true, reason: 'Otopilot: bağlayıcı için gönderim izinli.' };
}

export interface ModeChangeRequest {
  requestedMode: ApprovalMode;
  ownerInitiated: boolean;
}

export interface ModeChangeResult {
  allowed: boolean;
  reason?: string;
}

/** The system must never self-enable autopilot; only an explicit owner action may. */
export function changeApprovalMode(request: ModeChangeRequest): ModeChangeResult {
  if (request.requestedMode === 'autopilot' && !request.ownerInitiated) {
    return {
      allowed: false,
      reason: 'Otopilot modu yalnızca sahibin açık onayıyla etkinleştirilebilir.',
    };
  }
  return { allowed: true };
}
