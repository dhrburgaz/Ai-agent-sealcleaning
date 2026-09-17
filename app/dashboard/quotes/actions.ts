'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { quotes, leads, leadEvents, auditLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/guard';
import { canTransition } from '@/lib/crm/state-machine';
import { eventBus, ensureHandlersRegistered } from '@/lib/orchestration';

ensureHandlersRegistered();

export async function approveQuoteAction(formData: FormData): Promise<void> {
  const auth = await requireAuth();
  if (!auth.authenticated) throw new Error('Unauthorized');
  const id = String(formData.get('id') ?? '');

  await db
    .update(quotes)
    .set({ status: 'approved', approvedBy: auth.displayName, approvedAt: new Date(), updatedAt: new Date() })
    .where(eq(quotes.id, id));

  await db.insert(auditLogs).values({
    actor: auth.displayName ?? 'owner',
    action: 'quote_approved',
    entityType: 'quote',
    entityId: id,
  });

  const [quote] = await db.select().from(quotes).where(eq(quotes.id, id)).limit(1);
  if (quote) {
    await eventBus.emit('quote.approved', { leadId: quote.leadId, quoteId: id });
  }

  revalidatePath('/dashboard/quotes');
}

export async function markQuoteSentAction(formData: FormData): Promise<void> {
  const auth = await requireAuth();
  if (!auth.authenticated) throw new Error('Unauthorized');
  const id = String(formData.get('id') ?? '');

  const [quote] = await db.select().from(quotes).where(eq(quotes.id, id)).limit(1);
  if (!quote || quote.status !== 'approved') {
    throw new Error('Onaylanmamış teklif gönderilemez (Smart Approval).');
  }

  await db.update(quotes).set({ status: 'sent', sentAt: new Date(), updatedAt: new Date() }).where(eq(quotes.id, id));
  await db.update(leads).set({ state: 'QUOTE_SENT', updatedAt: new Date() }).where(eq(leads.id, quote.leadId));

  await db.insert(auditLogs).values({
    actor: auth.displayName ?? 'owner',
    action: 'quote_sent',
    entityType: 'quote',
    entityId: id,
  });

  await eventBus.emit('quote.sent', { leadId: quote.leadId, quoteId: id });

  revalidatePath('/dashboard/quotes');
}

export async function markQuoteAcceptedAction(formData: FormData): Promise<void> {
  const auth = await requireAuth();
  if (!auth.authenticated) throw new Error('Unauthorized');
  const id = String(formData.get('id') ?? '');
  const [quote] = await db.select().from(quotes).where(eq(quotes.id, id)).limit(1);
  if (!quote) throw new Error('Quote not found');

  await db.update(quotes).set({ status: 'accepted', updatedAt: new Date() }).where(eq(quotes.id, id));

  const [lead] = await db.select().from(leads).where(eq(leads.id, quote.leadId)).limit(1);
  if (lead && canTransition(lead.state, 'WON').allowed) {
    await db.update(leads).set({ state: 'WON', updatedAt: new Date() }).where(eq(leads.id, quote.leadId));
    await db.insert(leadEvents).values({
      leadId: quote.leadId,
      kind: 'state_transition',
      fromState: lead.state,
      toState: 'WON',
      actor: auth.displayName ?? 'owner',
      detail: 'Teklif kabul edildi.',
    });
  }

  revalidatePath('/dashboard/quotes');
}
