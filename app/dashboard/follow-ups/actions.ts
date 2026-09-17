'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { followUps, leads, customers, messageThreads, messages, auditLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/guard';
import { getCompanyProfile } from '@/lib/server/repo';
import { renderTemplate } from '@/lib/messaging/templates';
import { decideSend, type ApprovalMode } from '@/lib/messaging/approval';
import { canScheduleFollowUp, computeNextFollowUpDate } from '@/lib/crm/follow-up';
import { recordAgentRun } from '@/lib/orchestration';

async function getOrCreateThread(leadId: string, customerId: string | null) {
  const [existing] = await db.select().from(messageThreads).where(eq(messageThreads.leadId, leadId)).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(messageThreads).values({ leadId, customerId }).returning();
  return created!;
}

/**
 * Agent 17 — sends (or drafts, per the approval mode) the due follow-up
 * reminder and, only if it actually sent and the sequence hasn't hit its max
 * step, queues the next one. Reuses the exact same template/approval/audit
 * path as `sendMessageAction` — a follow-up is not a separate, less-audited
 * code path.
 */
export async function sendFollowUpAction(formData: FormData): Promise<void> {
  const auth = await requireAuth();
  if (!auth.authenticated) throw new Error('Unauthorized');

  const followUpId = String(formData.get('followUpId') ?? '');
  const approved = formData.get('approved') === 'on';

  const [followUp] = await db.select().from(followUps).where(eq(followUps.id, followUpId)).limit(1);
  if (!followUp || followUp.status !== 'scheduled') throw new Error('Takip bulunamadı veya zaten işlendi.');

  const [lead] = await db.select().from(leads).where(eq(leads.id, followUp.leadId)).limit(1);
  if (!lead) throw new Error('Lead not found');
  const customer = lead.customerId
    ? (await db.select().from(customers).where(eq(customers.id, lead.customerId)).limit(1))[0]
    : null;
  const company = await getCompanyProfile();
  if (!company) throw new Error('Company profile missing');

  if (customer?.optedOut) {
    await db.update(followUps).set({ status: 'opted_out', updatedAt: new Date() }).where(eq(followUps.id, followUpId));
    revalidatePath('/dashboard/follow-ups');
    return;
  }

  const thread = await getOrCreateThread(followUp.leadId, lead.customerId);
  const body = renderTemplate('follow_up', {
    facts: { companyName: company.companyName, baseCity: company.baseCity, phone: company.phone ?? undefined },
  });

  const decision = decideSend({
    mode: company.approvalMode as ApprovalMode,
    messageKind: 'follow_up',
    approved,
  });

  const [message] = await db
    .insert(messages)
    .values({
      threadId: thread.id,
      direction: 'outbound',
      body,
      templateKey: 'follow_up',
      language: 'nl',
      status: decision.canSend ? 'sent' : 'draft',
      approvedBy: approved ? auth.displayName : null,
      approvedAt: approved ? new Date() : null,
      sentAt: decision.canSend ? new Date() : null,
    })
    .returning();

  await db.insert(auditLogs).values({
    actor: auth.displayName ?? 'owner',
    action: decision.canSend ? 'follow_up_sent' : 'follow_up_drafted',
    entityType: 'follow_up',
    entityId: followUpId,
    after: { reason: decision.reason, messageId: message!.id },
  });

  if (!decision.canSend) {
    // Left as 'scheduled' — a draft was created for the owner to approve and
    // send from the lead's message thread, but the reminder is still "due"
    // until an actual send happens.
    await recordAgentRun({
      agentKey: 'agent17_crm_followup',
      triggeredBy: 'sendFollowUpAction',
      entityType: 'follow_up',
      entityId: followUpId,
      outputSummary: { sent: false, reason: decision.reason },
    });
    revalidatePath('/dashboard/follow-ups');
    return;
  }

  await db.update(followUps).set({ status: 'sent', sentAt: new Date(), updatedAt: new Date() }).where(eq(followUps.id, followUpId));

  const nextStepDecision = canScheduleFollowUp({
    customerOptedOut: customer?.optedOut ?? false,
    sequenceStep: followUp.sequenceStep + 1,
  });
  if (nextStepDecision.allowed) {
    const scheduledAt = computeNextFollowUpDate(followUp.sequenceStep + 1, new Date());
    await db.insert(followUps).values({
      leadId: followUp.leadId,
      sequenceStep: followUp.sequenceStep + 1,
      scheduledAt,
      status: 'scheduled',
    });
  }

  await recordAgentRun({
    agentKey: 'agent17_crm_followup',
    triggeredBy: 'sendFollowUpAction',
    entityType: 'follow_up',
    entityId: followUpId,
    outputSummary: { sent: true, nextStepScheduled: nextStepDecision.allowed },
  });

  revalidatePath('/dashboard/follow-ups');
  revalidatePath(`/dashboard/leads/${followUp.leadId}`);
}

export async function cancelFollowUpAction(formData: FormData): Promise<void> {
  const auth = await requireAuth();
  if (!auth.authenticated) throw new Error('Unauthorized');
  const followUpId = String(formData.get('followUpId') ?? '');

  await db.update(followUps).set({ status: 'cancelled', updatedAt: new Date() }).where(eq(followUps.id, followUpId));

  await db.insert(auditLogs).values({
    actor: auth.displayName ?? 'owner',
    action: 'follow_up_cancelled',
    entityType: 'follow_up',
    entityId: followUpId,
  });

  revalidatePath('/dashboard/follow-ups');
}

/** Section 17/35 — explicit customer opt-out: cancels every scheduled
 *  follow-up for the lead's customer and records the choice permanently, so
 *  no future quote.sent event schedules a new one either. */
export async function optOutCustomerAction(formData: FormData): Promise<void> {
  const auth = await requireAuth();
  if (!auth.authenticated) throw new Error('Unauthorized');
  const customerId = String(formData.get('customerId') ?? '');

  await db.update(customers).set({ optedOut: true, updatedAt: new Date() }).where(eq(customers.id, customerId));

  const affectedLeads = await db.select().from(leads).where(eq(leads.customerId, customerId));
  for (const lead of affectedLeads) {
    const scheduled = await db.select().from(followUps).where(eq(followUps.leadId, lead.id));
    for (const f of scheduled) {
      if (f.status === 'scheduled') {
        await db.update(followUps).set({ status: 'opted_out', updatedAt: new Date() }).where(eq(followUps.id, f.id));
      }
    }
  }

  await db.insert(auditLogs).values({
    actor: auth.displayName ?? 'owner',
    action: 'customer_opted_out',
    entityType: 'customer',
    entityId: customerId,
  });

  revalidatePath('/dashboard/follow-ups');
}
