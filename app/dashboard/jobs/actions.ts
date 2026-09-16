'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/db/client';
import { jobs, leads, quotes, actualCosts, auditLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/guard';
import { parseActualsDictation, type ActualCostCategory } from '@/lib/jobs/actuals-dictation-parser';

export async function createJobFromLeadAction(formData: FormData): Promise<void> {
  const auth = await requireAuth();
  if (!auth.authenticated) throw new Error('Unauthorized');
  const leadId = String(formData.get('leadId') ?? '');

  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  if (!lead || lead.state !== 'WON') throw new Error('Lead WON durumunda değil.');

  const [quote] = await db.select().from(quotes).where(eq(quotes.leadId, leadId)).limit(1);

  const [job] = await db.insert(jobs).values({ leadId, quoteId: quote?.id, status: 'scheduled', wonAt: new Date() }).returning();

  await db.update(leads).set({ state: 'SCHEDULED', updatedAt: new Date() }).where(eq(leads.id, leadId));

  await db.insert(auditLogs).values({
    actor: auth.displayName ?? 'owner',
    action: 'job_created',
    entityType: 'job',
    entityId: job!.id,
  });

  revalidatePath('/dashboard/jobs');
  redirect(`/dashboard/jobs/${job!.id}`);
}

export async function markJobStatusAction(formData: FormData): Promise<void> {
  const auth = await requireAuth();
  if (!auth.authenticated) throw new Error('Unauthorized');
  const jobId = String(formData.get('jobId') ?? '');
  const status = String(formData.get('status') ?? '') as 'scheduled' | 'in_progress' | 'completed';

  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job) throw new Error('Job not found');

  await db
    .update(jobs)
    .set({ status, completedAt: status === 'completed' ? new Date() : job.completedAt, updatedAt: new Date() })
    .where(eq(jobs.id, jobId));

  if (status === 'completed') {
    await db.update(leads).set({ state: 'COMPLETED', updatedAt: new Date() }).where(eq(leads.id, job.leadId));
  } else if (status === 'in_progress') {
    await db.update(leads).set({ state: 'IN_PROGRESS', updatedAt: new Date() }).where(eq(leads.id, job.leadId));
  }

  revalidatePath(`/dashboard/jobs/${jobId}`);
}

export interface ParseDictationState {
  daysWorked?: number | null;
  crewSize?: number | null;
  costs?: { category: ActualCostCategory; amount: number }[];
  raw?: string;
}

export async function parseDictationAction(
  _prev: ParseDictationState,
  formData: FormData,
): Promise<ParseDictationState> {
  const raw = String(formData.get('dictation') ?? '');
  const parsed = parseActualsDictation(raw);
  return { ...parsed, raw };
}

export async function saveActualCostsAction(formData: FormData): Promise<void> {
  const auth = await requireAuth();
  if (!auth.authenticated) throw new Error('Unauthorized');
  const jobId = String(formData.get('jobId') ?? '');
  const category = String(formData.get('category') ?? '') as ActualCostCategory;
  const amount = Number(formData.get('amount') ?? 0);
  const description = String(formData.get('description') ?? '') || null;

  await db.insert(actualCosts).values({
    jobId,
    category,
    amount,
    description,
    enteredVia: 'form',
    confirmedAt: new Date(),
  });

  await db.insert(auditLogs).values({
    actor: auth.displayName ?? 'owner',
    action: 'actual_cost_recorded',
    entityType: 'job',
    entityId: jobId,
    after: { category, amount },
  });

  revalidatePath(`/dashboard/jobs/${jobId}`);
}
