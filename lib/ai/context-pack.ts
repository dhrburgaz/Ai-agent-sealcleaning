/**
 * Section 49 — Context Packs. A compact, structured summary of a lead's
 * current state, built fresh each time instead of ever replaying raw message
 * history into a model call. This is what `model-router.ts` would attach to
 * a real provider request — nothing here calls a model itself.
 */
import { eq, desc } from 'drizzle-orm';
import { db } from '@/db/client';
import { leads, customers, estimates, messageThreads, messages, quotes, assumptions, measurements, contextPacks } from '@/db/schema';

export interface ContextPackData {
  leadId: string;
  customerName: string | null;
  location: string | null;
  serviceCategory: string | null;
  leadState: string;
  keyMeasurements: { kind: string; value: number | null; status: string }[];
  missingInfo: string[];
  latestMessage: { direction: string; body: string } | null;
  quoteStatus: string | null;
  expectedProfitEur: number | null;
  commercialFit: string | null;
}

/** Pure summarizer — takes already-fetched rows so it's trivially unit-testable. */
export function summarizeContextPack(input: {
  lead: { id: string; state: string; location: string | null; serviceCategory: string | null };
  customerName: string | null;
  latestEstimate: { recommendedExVat: number | null; grossProfit: number | null; commercialFit: string | null } | null;
  latestQuoteStatus: string | null;
  scopeMeasurements: { kind: string; value: number | null; status: string }[];
  scopeAssumptions: { description: string; mustVerifyOnSite: boolean }[];
  latestMessage: { direction: string; body: string } | null;
}): ContextPackData {
  return {
    leadId: input.lead.id,
    customerName: input.customerName,
    location: input.lead.location,
    serviceCategory: input.lead.serviceCategory,
    leadState: input.lead.state,
    keyMeasurements: input.scopeMeasurements,
    missingInfo: input.scopeAssumptions.filter((a) => a.mustVerifyOnSite).map((a) => a.description),
    latestMessage: input.latestMessage,
    quoteStatus: input.latestQuoteStatus,
    expectedProfitEur: input.latestEstimate?.grossProfit ?? null,
    commercialFit: input.latestEstimate?.commercialFit ?? null,
  };
}

/** DB-touching wrapper: fetches current state, summarizes it, and persists a new context_packs version. */
export async function buildAndPersistContextPack(leadId: string): Promise<ContextPackData> {
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  if (!lead) throw new Error('Lead not found');

  const customer = lead.customerId
    ? (await db.select().from(customers).where(eq(customers.id, lead.customerId)).limit(1))[0]
    : null;
  const [latestEstimate] = await db
    .select()
    .from(estimates)
    .where(eq(estimates.leadId, leadId))
    .orderBy(desc(estimates.createdAt))
    .limit(1);
  const [latestQuote] = await db.select().from(quotes).where(eq(quotes.leadId, leadId)).orderBy(desc(quotes.createdAt)).limit(1);

  const scopeMeasurements = latestEstimate?.scopeId
    ? await db.select().from(measurements).where(eq(measurements.scopeId, latestEstimate.scopeId))
    : [];
  const scopeAssumptions = latestEstimate?.scopeId
    ? await db.select().from(assumptions).where(eq(assumptions.scopeId, latestEstimate.scopeId))
    : [];

  const [thread] = await db.select().from(messageThreads).where(eq(messageThreads.leadId, leadId)).limit(1);
  const [latestMessageRow] = thread
    ? await db.select().from(messages).where(eq(messages.threadId, thread.id)).orderBy(desc(messages.createdAt)).limit(1)
    : [];

  const data = summarizeContextPack({
    lead: { id: lead.id, state: lead.state, location: lead.location, serviceCategory: lead.serviceCategory },
    customerName: customer?.name ?? null,
    latestEstimate: latestEstimate
      ? {
          recommendedExVat: latestEstimate.recommendedExVat,
          grossProfit: latestEstimate.grossProfit,
          commercialFit: latestEstimate.commercialFit,
        }
      : null,
    latestQuoteStatus: latestQuote?.status ?? null,
    scopeMeasurements: scopeMeasurements.map((m) => ({ kind: m.kind, value: m.value, status: m.status })),
    scopeAssumptions: scopeAssumptions.map((a) => ({ description: a.description, mustVerifyOnSite: a.mustVerifyOnSite })),
    latestMessage: latestMessageRow ? { direction: latestMessageRow.direction, body: latestMessageRow.body } : null,
  });

  const [previous] = await db
    .select()
    .from(contextPacks)
    .where(eq(contextPacks.leadId, leadId))
    .orderBy(desc(contextPacks.version))
    .limit(1);

  await db.insert(contextPacks).values({
    leadId,
    data: data as unknown as Record<string, unknown>,
    version: (previous?.version ?? 0) + 1,
  });

  return data;
}
