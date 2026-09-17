/**
 * Section 47 — wires the named downstream agents to each orchestration event.
 * Import `ensureHandlersRegistered()` once (from `lib/orchestration/index.ts`)
 * before emitting; registration is idempotent so it's safe to call from every
 * Server Action that emits.
 */
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { estimates, jobs, reviewRequests, leads, leadEvents, estimateLines, attachments } from '@/db/schema';
import { eventBus } from './events';
import { recordAgentRun } from './agent-run';
import { runQaGate } from '@/lib/pricing/qa-gate';
import { findExistingAnalysisByHash } from '@/lib/pricing/image-dedupe';

let registered = false;

export function ensureHandlersRegistered(): void {
  if (registered) return;
  registered = true;

  // lead.created -> dedupe/classify/qualify already ran synchronously in
  // createLeadAction before this event is emitted (section 47's ordering is
  // preserved; it just isn't re-run here). This handler closes the audit loop
  // for the orchestrator having routed the new lead.
  eventBus.on('lead.created', async ({ leadId }) => {
    await recordAgentRun({
      agentKey: 'agent01_orchestrator',
      triggeredBy: 'event:lead.created',
      entityType: 'lead',
      entityId: leadId,
      outputSummary: { routed: true },
    });
  });

  // photo.added -> hash -> vision -> scope update (section 47). The actual
  // photo_analyses row (skeleton or reused-by-hash) is created synchronously
  // by the upload Server Action, since it needs the freshly-inserted
  // attachment id before this event even fires. This handler's job is the
  // audit record and the cache-hit signal for the AI cost dashboard.
  eventBus.on('photo.added', async ({ leadId, attachmentId, imageHash }) => {
    const priorAttachments = (await db.select().from(attachments).where(eq(attachments.leadId, leadId))).filter(
      (a) => a.id !== attachmentId,
    );
    const { alreadyAnalyzed } = findExistingAnalysisByHash(
      priorAttachments.map((a) => a.sha256),
      imageHash,
    );
    await recordAgentRun({
      agentKey: 'agent06_photo_vision',
      triggeredBy: 'event:photo.added',
      entityType: 'attachment',
      entityId: attachmentId,
      outputSummary: { reusedExistingAnalysis: alreadyAnalyzed },
      cacheHit: alreadyAnalyzed,
    });
  });

  // scope.changed -> BOM/waste/labour/pricing already recomputed inline by the
  // action that changed the scope (createCeramicEstimateAction). What this
  // handler adds: re-run the QA gate (Agent 20) immediately and persist the
  // result onto the estimate, so a blocked estimate is visible on the lead
  // page right away instead of only being discovered when a quote is attempted.
  eventBus.on('scope.changed', async ({ estimateId }) => {
    if (!estimateId) return;
    const [estimate] = await db.select().from(estimates).where(eq(estimates.id, estimateId)).limit(1);
    if (!estimate) return;

    const lines = await db.select().from(estimateLines).where(eq(estimateLines.estimateId, estimateId));
    const qa = runQaGate({
      costs: {
        labour: lines.find((l) => l.category === 'labour')?.totalCost ?? 0,
        materials: lines.find((l) => l.category === 'materials')?.totalCost ?? 0,
        rentals: 0,
        waste: lines.find((l) => l.category === 'waste')?.totalCost ?? 0,
        logistics: 0,
        subcontractors: 0,
        permits: 0,
        consumables: lines.find((l) => l.category === 'consumables')?.totalCost ?? 0,
        overhead: lines.find((l) => l.category === 'overhead')?.totalCost ?? 0,
        riskReserve: lines.find((l) => l.category === 'risk')?.totalCost ?? 0,
      },
      policy: {
        targetMarginRate: estimate.targetMarginRate,
        minimumTargetGrossProfit: estimate.minimumTargetGrossProfit,
        minimumJobCharge: estimate.minimumJobCharge ?? 0,
        vatRatePercent: estimate.vatRatePercent,
        estimatedLabourHours: 1,
      },
      storedResult: {
        directCost: estimate.directCost ?? 0,
        costWithOverhead: estimate.costWithOverhead ?? 0,
        priceForMargin: estimate.priceForMargin ?? 0,
        priceForProfitFloor: estimate.priceForProfitFloor ?? 0,
        minimumJobCharge: estimate.minimumJobCharge ?? 0,
        recommendedExVat: estimate.recommendedExVat ?? 0,
        vatAmount: 0,
        recommendedIncVat: 0,
        breakEven: estimate.breakEven ?? 0,
        grossProfit: estimate.grossProfit ?? 0,
        grossMargin: estimate.grossMargin ?? 0,
        markupIfMisappliedWarning: false,
        profitPerLabourHour: estimate.profitPerLabourHour,
        lowEstimate: estimate.lowEstimate ?? 0,
        expectedEstimate: estimate.expectedEstimate ?? 0,
        highEstimate: estimate.highEstimate ?? 0,
        commercialFit: (estimate.commercialFit as 'strong' | 'acceptable' | 'weak' | 'below_floor') ?? 'acceptable',
      },
      bindingQuote: false, // this is the prijsindicatie/estimate stage, not yet a binding offerte
      factStatuses: [],
      criticalUnknownLabels: [],
      requiredFields: { recommendedExVat: estimate.recommendedExVat },
    });

    await db
      .update(estimates)
      .set({ qaBlocked: qa.blocked, qaBlockReasons: qa.reasons, updatedAt: new Date() })
      .where(eq(estimates.id, estimateId));

    await recordAgentRun({
      agentKey: 'agent20_qa_compliance',
      triggeredBy: 'event:scope.changed',
      entityType: 'estimate',
      entityId: estimateId,
      outputSummary: { blocked: qa.blocked, reasons: qa.reasons },
      confidence: estimate.quoteConfidence,
    });
  });

  // quote.approved -> PDF/send-ready. The PDF itself is generated synchronously
  // by createQuoteFromEstimateAction; this handler just closes the audit loop.
  eventBus.on('quote.approved', async ({ quoteId }) => {
    await recordAgentRun({
      agentKey: 'agent20_qa_compliance',
      triggeredBy: 'event:quote.approved',
      entityType: 'quote',
      entityId: quoteId,
      outputSummary: { sendReady: true },
    });
  });

  // job.completed -> actual costing (already handled by the actual-costs form)
  // + reputation flow: draft a review request from the zero-AI template so the
  // owner has a one-click starting point instead of a blank page.
  eventBus.on('job.completed', async ({ jobId }) => {
    const [existing] = await db.select().from(reviewRequests).where(eq(reviewRequests.jobId, jobId)).limit(1);
    if (existing) return;

    await db.insert(reviewRequests).values({
      jobId,
      status: 'draft',
      draftText: null, // rendered on demand from lib/messaging/templates.ts so it always reflects the current company name
    });

    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
    if (job) {
      const [lead] = await db.select().from(leads).where(eq(leads.id, job.leadId)).limit(1);
      if (lead && lead.state !== 'REVIEW_REQUESTED' && lead.state !== 'ARCHIVED') {
        // Only advance automatically from COMPLETED, matching the state machine's
        // own allowed transitions — never force a state the machine would reject.
        if (lead.state === 'COMPLETED') {
          await db.update(leads).set({ state: 'REVIEW_REQUESTED', updatedAt: new Date() }).where(eq(leads.id, lead.id));
          await db.insert(leadEvents).values({
            leadId: lead.id,
            kind: 'state_transition',
            fromState: 'COMPLETED',
            toState: 'REVIEW_REQUESTED',
            actor: 'system',
            detail: 'İş tamamlandı, review talebi taslağı oluşturuldu (Agent 19).',
          });
        }
      }
    }

    await recordAgentRun({
      agentKey: 'agent19_reputation_content',
      triggeredBy: 'event:job.completed',
      entityType: 'job',
      entityId: jobId,
      outputSummary: { reviewRequestDrafted: true },
    });
  });

  // message.received -> extract delta / update facts / re-run affected logic.
  // Minimal, honest version for Phase 4: no NLP "fact extraction" is invented
  // (that would need a model); the concrete, safe action a Tier-0 agent can
  // take is to flag the lead as needing owner attention (state -> REPLIED)
  // when it's currently waiting on the customer.
  eventBus.on('message.received', async ({ leadId }) => {
    const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
    if (!lead) return;
    if (lead.state === 'CONTACTED' || lead.state === 'NEEDS_INFO') {
      await db.update(leads).set({ state: 'REPLIED', updatedAt: new Date() }).where(eq(leads.id, leadId));
      await db.insert(leadEvents).values({
        leadId,
        kind: 'state_transition',
        fromState: lead.state,
        toState: 'REPLIED',
        actor: 'system',
        detail: 'Gelen mesaj kaydedildi (Agent 17).',
      });
    }
    await recordAgentRun({
      agentKey: 'agent17_crm_followup',
      triggeredBy: 'event:message.received',
      entityType: 'lead',
      entityId: leadId,
    });
  });
}
