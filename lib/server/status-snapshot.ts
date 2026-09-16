import { db } from '@/db/client';
import { leads, messages, messageThreads, quotes, jobs, followUps, supplierPriceObservations, externalConnectors } from '@/db/schema';
import type { StatusSnapshot } from '@/lib/agents/beyza-orchestrator';
import { getOrCreateBudgetPolicy } from '@/lib/server/repo';

const DAY_MS = 24 * 60 * 60 * 1000;

export async function buildStatusSnapshot(): Promise<StatusSnapshot> {
  const now = new Date();
  const since24h = new Date(now.getTime() - DAY_MS);
  const since72h = new Date(now.getTime() + 3 * DAY_MS);
  const since7d = new Date(now.getTime() + 7 * DAY_MS);

  const allLeads = await db.select().from(leads);
  const leadsLast24h = allLeads.filter((l) => l.createdAt >= since24h).length;
  const hotLeads = allLeads.filter((l) => l.priority === 'hot').length;
  const warmLeads = allLeads.filter((l) => l.priority === 'warm').length;

  const allThreads = await db.select().from(messageThreads);
  const allMessages = await db.select().from(messages);
  let unansweredInbound = 0;
  let draftsWaiting = 0;
  for (const thread of allThreads) {
    const threadMessages = allMessages
      .filter((m) => m.threadId === thread.id)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const last = threadMessages[threadMessages.length - 1];
    if (last && last.direction === 'inbound') unansweredInbound += 1;
  }
  draftsWaiting = allMessages.filter((m) => m.direction === 'outbound' && m.status === 'draft').length;

  const allQuotes = await db.select().from(quotes);
  const pendingQuotes = allQuotes.filter((q) => q.status === 'draft' || q.status === 'sent');
  const quotesPending = pendingQuotes.length;
  const quotesPendingValueEur = pendingQuotes.reduce((sum, q) => sum + q.totalExVat, 0);

  const allJobs = await db.select().from(jobs);
  const jobsNext7d = allJobs.filter(
    (j) => j.scheduledStart && j.scheduledStart >= now && j.scheduledStart <= since7d,
  ).length;

  const pipelineValueEur = quotesPendingValueEur;
  const expectedProfitEur = 0; // requires estimate join; refined once estimate service is wired to a lead in the UI

  const overdueFollowUps = (await db.select().from(followUps)).filter(
    (f) => f.status === 'scheduled' && f.scheduledAt < now,
  ).length;

  const staleSuppliers = (await db.select().from(supplierPriceObservations)).filter(
    (s) => s.staleAfter && s.staleAfter < now,
  ).length;

  const budget = await getOrCreateBudgetPolicy();
  const budgetAlert =
    budget.monthlyCapEur > 0 && budget.spentThisMonthEur / budget.monthlyCapEur >= 0.8;

  const connectorFailures = (await db.select().from(externalConnectors)).filter(
    (c) => c.lastHealthStatus === 'failed',
  ).length;

  void since72h;
  const visitsNext72h = 0; // appointments UI is Phase 7; kept at 0 deterministically rather than faked

  return {
    leadsLast24h,
    hotLeads,
    warmLeads,
    unansweredInbound,
    draftsWaiting,
    quotesPending,
    quotesPendingValueEur,
    visitsNext72h,
    jobsNext7d,
    pipelineValueEur,
    expectedProfitEur,
    overdueFollowUps,
    supplierAlerts: staleSuppliers,
    budgetAlert,
    connectorFailures,
    generatedAt: now,
  };
}
