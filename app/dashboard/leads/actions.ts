'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/db/client';
import { leads, leadSources, customers, leadEvents, auditLogs } from '@/db/schema';
import type { LeadState } from '@/db/schema/leads';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/guard';
import { findDuplicates, type DedupeCandidate } from '@/lib/crm/dedupe';
import { qualifyLead, assertNoSensitiveTraits } from '@/lib/crm/qualification';
import { canTransition } from '@/lib/crm/state-machine';
import { getCompanyProfile } from '@/lib/server/repo';
import { eventBus, ensureHandlersRegistered, recordAgentRun } from '@/lib/orchestration';

ensureHandlersRegistered();

export async function createLeadAction(formData: FormData): Promise<void> {
  const auth = await requireAuth();
  if (!auth.authenticated) throw new Error('Unauthorized');

  const customerName = String(formData.get('customerName') ?? '');
  const phone = String(formData.get('phone') ?? '') || null;
  const email = String(formData.get('email') ?? '') || null;
  const serviceCategory = String(formData.get('serviceCategory') ?? '');
  const location = String(formData.get('location') ?? '');
  const rawText = String(formData.get('rawText') ?? '') || null;
  const urgency = String(formData.get('urgency') ?? 'unknown') as 'low' | 'medium' | 'high' | 'unknown';
  const estimatedScale = String(formData.get('estimatedScale') ?? 'unknown') as
    | 'small'
    | 'medium'
    | 'large'
    | 'unknown';

  const intake = { phone, email, serviceCategory, location, urgency, estimatedScale };
  assertNoSensitiveTraits(intake);

  const company = await getCompanyProfile();
  const serviceFit = company ? company.enabledServiceCategories.includes(serviceCategory) : true;
  const withinServiceRadius = true; // distance geocoding is Phase 6; assumed within radius until verified

  const existingLeads = await db.select().from(leads);
  const existingCustomers = await db.select().from(customers);
  const candidates: DedupeCandidate[] = existingLeads.map((l) => {
    const cust = existingCustomers.find((c) => c.id === l.customerId);
    return { id: l.id, phone: cust?.phone, email: cust?.email, rawText: l.location ?? undefined };
  });

  const incoming: DedupeCandidate = { id: 'incoming', phone, email, rawText };
  const matches = findDuplicates(incoming, candidates);
  const autoMergeMatch = matches.find((m) => m.autoMergeEligible);

  await recordAgentRun({
    agentKey: 'agent03_dedupe',
    triggeredBy: auth.displayName ?? 'owner',
    entityType: 'lead',
    entityId: autoMergeMatch?.candidateId ?? 'incoming',
    inputSummary: { phone: Boolean(phone), email: Boolean(email), hasRawText: Boolean(rawText) },
    outputSummary: { matchCount: matches.length, autoMerged: Boolean(autoMergeMatch) },
  });

  if (autoMergeMatch) {
    await db.insert(leadEvents).values({
      leadId: autoMergeMatch.candidateId,
      kind: 'dedupe_merge',
      actor: auth.displayName ?? 'owner',
      detail: `Yinelenen kayıt engellendi (${autoMergeMatch.reason}).`,
    });
    revalidatePath('/dashboard/leads');
    redirect(`/dashboard/leads/${autoMergeMatch.candidateId}`);
  }

  const [source] = await db.insert(leadSources).values({ kind: 'manual', rawText }).returning();
  const [customer] = await db.insert(customers).values({ name: customerName, phone, email }).returning();

  const qualification = qualifyLead({
    withinServiceRadius,
    serviceFit,
    estimatedScale,
    urgency,
    informationQuality: rawText ? 0.6 : 0.3,
    hasPhotos: false,
    accessKnown: false,
    complexity: 'unknown',
    quoteConfidence: null,
    hoursSinceLastResponse: null,
    requiresSiteVisit: true,
    seeksCheapOnly: null,
    bundleOpportunityNearby: false,
  });

  await recordAgentRun({
    agentKey: 'agent04_qualification',
    triggeredBy: auth.displayName ?? 'owner',
    entityType: 'lead',
    entityId: 'pending', // the lead id doesn't exist until the insert just below
    inputSummary: { serviceFit, estimatedScale, urgency },
    outputSummary: { priority: qualification.priority, score: qualification.score },
    confidence: qualification.score / 100,
  });

  const [lead] = await db
    .insert(leads)
    .values({
      customerId: customer!.id,
      leadSourceId: source!.id,
      serviceCategory,
      location,
      urgency,
      estimatedScale,
      priority: qualification.priority,
      priorityScore: qualification.score,
      priorityReasons: qualification.reasons,
      nextBestAction: qualification.nextBestAction,
      state: 'NEW',
    })
    .returning();

  await db.insert(leadEvents).values({
    leadId: lead!.id,
    kind: 'state_transition',
    toState: 'NEW',
    actor: auth.displayName ?? 'owner',
    detail: 'Manuel lead girişi.',
  });

  await db.insert(auditLogs).values({
    actor: auth.displayName ?? 'owner',
    action: 'lead_created',
    entityType: 'lead',
    entityId: lead!.id,
    after: lead as unknown as Record<string, unknown>,
  });

  await eventBus.emit('lead.created', { leadId: lead!.id });

  revalidatePath('/dashboard/leads');
  redirect(`/dashboard/leads/${lead!.id}`);
}

export async function transitionLeadStateAction(formData: FormData): Promise<void> {
  const auth = await requireAuth();
  if (!auth.authenticated) throw new Error('Unauthorized');

  const leadId = String(formData.get('leadId') ?? '');
  const toState = String(formData.get('toState') ?? '') as LeadState;

  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  if (!lead) throw new Error('Lead not found');

  const check = canTransition(lead.state, toState);
  if (!check.allowed) {
    throw new Error(check.reason);
  }

  await db.update(leads).set({ state: toState, updatedAt: new Date() }).where(eq(leads.id, leadId));

  await db.insert(leadEvents).values({
    leadId,
    kind: 'state_transition',
    fromState: lead.state,
    toState,
    actor: auth.displayName ?? 'owner',
  });

  await db.insert(auditLogs).values({
    actor: auth.displayName ?? 'owner',
    action: 'lead_state_transition',
    entityType: 'lead',
    entityId: leadId,
    before: { state: lead.state },
    after: { state: toState },
  });

  revalidatePath(`/dashboard/leads/${leadId}`);
}
