'use server';

import { revalidatePath } from 'next/cache';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { db } from '@/db/client';
import {
  leads,
  customers,
  messageThreads,
  messages,
  estimates,
  estimateLines,
  crewMembers,
  quotes,
  quoteVersions,
  auditLogs,
  scopes,
  scopeItems,
  measurements,
  assumptions,
  riskFlags,
  attachments,
  photoAnalyses,
  inventoryItems,
} from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/guard';
import { getCompanyProfile } from '@/lib/server/repo';
import { renderTemplate, type MessageTemplateKey } from '@/lib/messaging/templates';
import { decideSend, type ApprovalMode } from '@/lib/messaging/approval';
import {
  buildCeramicTerraceScope,
  computeCeramicTerraceJob,
  applyInventoryOffset,
  type CeramicTerraceInputs,
} from '@/lib/pricing/ceramic-terrace-template';
import { runQaGate } from '@/lib/pricing/qa-gate';
import { computeQuoteConfidence, customerFacingLanguageLevel } from '@/lib/pricing/confidence';
import { categoryLabelNl } from '@/lib/pricing/category-labels';
import { generateQuotePdf } from '@/lib/documents/quote-pdf';
import { buildMethodPlan } from '@/lib/pricing/method-planner';
import { validateUpload, sanitizeOriginalFilename } from '@/lib/storage/upload-validation';
import { findExistingAnalysisByHash } from '@/lib/pricing/image-dedupe';
import { buildManualReviewSkeleton, sanitizeMeasurementClaims, computePhotoConfidence } from '@/lib/agents/vision-inspector';
import { eventBus, ensureHandlersRegistered, recordAgentRun } from '@/lib/orchestration';

ensureHandlersRegistered();

const MATERIAL_LABELS_NL: Record<string, string> = {
  ceramic_tiles: 'Keramische tegels',
  sand_subbase: 'Zand/funderingslaag',
};

async function getOrCreateThread(leadId: string, customerId: string | null) {
  const [existing] = await db.select().from(messageThreads).where(eq(messageThreads.leadId, leadId)).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(messageThreads).values({ leadId, customerId }).returning();
  return created!;
}

export async function sendMessageAction(formData: FormData): Promise<void> {
  const auth = await requireAuth();
  if (!auth.authenticated) throw new Error('Unauthorized');

  const leadId = String(formData.get('leadId') ?? '');
  const templateKey = String(formData.get('templateKey') ?? '') as MessageTemplateKey;
  const approved = formData.get('approved') === 'on';

  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  if (!lead) throw new Error('Lead not found');
  const company = await getCompanyProfile();
  if (!company) throw new Error('Company profile missing');

  const thread = await getOrCreateThread(leadId, lead.customerId);
  const priorOutbound = (await db.select().from(messages).where(eq(messages.threadId, thread.id))).filter(
    (m) => m.direction === 'outbound',
  );
  const isFirstContact = priorOutbound.length === 0;

  const body = renderTemplate(templateKey, { facts: { companyName: company.companyName, baseCity: company.baseCity, phone: company.phone ?? undefined } });

  const decision = decideSend({
    mode: company.approvalMode as ApprovalMode,
    messageKind: isFirstContact ? 'first_contact' : 'other',
    approved,
  });

  const [message] = await db
    .insert(messages)
    .values({
      threadId: thread.id,
      direction: 'outbound',
      body,
      templateKey,
      language: 'nl',
      status: decision.canSend ? 'sent' : 'draft',
      approvedBy: approved ? auth.displayName : null,
      approvedAt: approved ? new Date() : null,
      sentAt: decision.canSend ? new Date() : null,
    })
    .returning();

  await db.insert(auditLogs).values({
    actor: auth.displayName ?? 'owner',
    action: decision.canSend ? 'message_sent' : 'message_drafted',
    entityType: 'message',
    entityId: message!.id,
    after: { reason: decision.reason },
  });

  revalidatePath(`/dashboard/leads/${leadId}`);
}

/**
 * Manual inbound-message logging (no live channel connector exists yet, see
 * docs/FACEBOOK_CONNECTOR.md) — the owner pastes what the customer replied.
 * This is what feeds the message.received event (section 47).
 */
export async function logInboundMessageAction(formData: FormData): Promise<void> {
  const auth = await requireAuth();
  if (!auth.authenticated) throw new Error('Unauthorized');

  const leadId = String(formData.get('leadId') ?? '');
  const body = String(formData.get('body') ?? '').trim();
  if (!body) throw new Error('Mesaj metni boş olamaz.');

  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  if (!lead) throw new Error('Lead not found');

  const thread = await getOrCreateThread(leadId, lead.customerId);
  const [message] = await db
    .insert(messages)
    .values({ threadId: thread.id, direction: 'inbound', body, language: 'nl', status: 'sent', sentAt: new Date() })
    .returning();

  await db.insert(auditLogs).values({
    actor: auth.displayName ?? 'owner',
    action: 'inbound_message_logged',
    entityType: 'message',
    entityId: message!.id,
  });

  await eventBus.emit('message.received', { leadId, threadId: thread.id, messageId: message!.id });

  revalidatePath(`/dashboard/leads/${leadId}`);
}

export interface CeramicEstimateFormInput {
  leadId: string;
  areaM2: number;
  tileSuppliedBy: 'customer' | 'company';
  tileUnitCostPerM2: number | null;
  disposalIncluded: boolean;
  accessWidthCm: number | null;
}

export async function createCeramicEstimateAction(formData: FormData): Promise<void> {
  const auth = await requireAuth();
  if (!auth.authenticated) throw new Error('Unauthorized');

  const leadId = String(formData.get('leadId') ?? '');
  const areaM2 = Number(formData.get('areaM2') ?? 0);
  const tileSuppliedBy = String(formData.get('tileSuppliedBy') ?? 'company') as 'customer' | 'company';
  const tileUnitCostPerM2Raw = formData.get('tileUnitCostPerM2');
  const tileUnitCostPerM2 = tileUnitCostPerM2Raw ? Number(tileUnitCostPerM2Raw) : null;
  const disposalIncluded = formData.get('disposalIncluded') === 'on';
  const accessWidthCmRaw = formData.get('accessWidthCm');
  const accessWidthCm = accessWidthCmRaw ? Number(accessWidthCmRaw) : null;

  const company = await getCompanyProfile();
  if (!company) throw new Error('Company profile missing');
  const [ownerCrew] = await db.select().from(crewMembers).limit(1);

  const input: CeramicTerraceInputs = {
    areaM2,
    tileSuppliedBy,
    tileUnitCostPerM2,
    currentPavingKnown: true,
    excavationNeeded: true,
    excavationDepthCm: 20,
    accessWidthCm,
    carryingDistanceM: 10,
    levelDifferencesKnown: true,
    drainageKnown: true,
    edging: true,
    disposalIncluded,
    crew: ownerCrew ? [{ kind: 'owner', hourlyCost: ownerCrew.hourlyCost }] : [{ kind: 'owner', hourlyCost: 35 }],
    labourHourlyRateForDisposalLoading: ownerCrew?.hourlyCost ?? 35,
    sandCostPerM3: 45,
    disposalTippingFeePerContainer: 180,
    disposalContainerFeePerContainer: 90,
    productionRateM2PerHourPerPerson: 1.2,
  };

  const scopeResult = buildCeramicTerraceScope(input);
  const policy = {
    targetMarginRate: company.defaultTargetMarginRate,
    minimumTargetGrossProfit: company.defaultMinimumTargetGrossProfit,
    minimumJobCharge: company.defaultMinimumJobCharge,
    vatRatePercent: company.vatRatePercent,
    estimatedLabourHours: 0,
  };
  const breakdown = computeCeramicTerraceJob(input, policy);

  // Agent 10/33: check inventory before recommending a purchase.
  const existingInventory = await db.select().from(inventoryItems);
  const tileInventoryItem = existingInventory.find((i) => i.label === MATERIAL_LABELS_NL.ceramic_tiles);
  const sandInventoryItem = existingInventory.find((i) => i.label === MATERIAL_LABELS_NL.sand_subbase);
  const { tileOffset, sandOffset, inventorySavingsEur, adjustedCosts, pricing } = applyInventoryOffset(
    input,
    breakdown,
    { ceramicTilesOnHand: tileInventoryItem?.quantityOnHand ?? 0, sandSubbaseOnHand: sandInventoryItem?.quantityOnHand ?? 0 },
    policy,
  );

  const confidence = computeQuoteConfidence(scopeResult.factStatuses, {
    unclearAccess: !accessWidthCm,
  });

  // Agent 07 persists a real scope record (previously computed only in-memory)
  // so Agent 08's method plan and the QA gate have durable scope/assumption/
  // risk rows to work from, per section 24's shared database model.
  const [scope] = await db
    .insert(scopes)
    .values({ leadId, templateKey: 'ceramic_terrace_40m2', materialSourcing: tileSuppliedBy, status: 'active' })
    .returning();

  const offsetByMaterialLabel: Record<string, { quantityFromInventory: number; quantityToBuy: number }> = {
    ceramic_tiles: tileOffset,
    sand_subbase: sandOffset,
  };
  await db.insert(scopeItems).values(
    breakdown.materials.map((m) => {
      const offset = offsetByMaterialLabel[m.label];
      return {
        scopeId: scope!.id,
        key: m.label,
        label: MATERIAL_LABELS_NL[m.label] ?? m.label,
        quantity: m.finalQuantity,
        unit: m.unit,
        status: 'known' as const,
        customerSupplied: m.suppliedBy === 'customer',
        notes:
          offset && offset.quantityFromInventory > 0
            ? `Envanterden karşılanan: ${offset.quantityFromInventory} ${m.unit}. Satın alınacak: ${offset.quantityToBuy} ${m.unit}.`
            : null,
      };
    }),
  );
  if (inventorySavingsEur > 0) {
    await recordAgentRun({
      agentKey: 'agent10_supplier_scout',
      triggeredBy: auth.displayName ?? 'owner',
      entityType: 'scope',
      entityId: scope!.id,
      outputSummary: { inventorySavingsEur, tileOffset, sandOffset },
    });
  }
  await db.insert(measurements).values({
    scopeId: scope!.id,
    kind: 'm2',
    value: areaM2,
    status: 'known',
  });

  const methodPlan = buildMethodPlan({
    hasExistingSurfaceToRemove: true,
    currentSurfaceKnown: input.currentPavingKnown,
    excavationNeeded: input.excavationNeeded,
    excavationDepthKnown: input.excavationDepthCm !== null,
    drainageKnown: input.drainageKnown,
    soilOrSubbaseKnown: input.currentPavingKnown,
    levelDifferencesKnown: input.levelDifferencesKnown,
    accessWidthCm: input.accessWidthCm,
    disposalIncluded: input.disposalIncluded,
    edging: input.edging,
    cuttingComplexity: 'low',
    retainingWallInvolved: false,
    suspectedUtilitiesNearby: false,
    suspectedAsbestos: false,
    permitLikelyRequired: 'unknown',
  });

  if (methodPlan.verificationNeeded.length > 0) {
    await db.insert(assumptions).values(
      methodPlan.verificationNeeded.map((description) => ({
        scopeId: scope!.id,
        description,
        impactsPrice: true,
        mustVerifyOnSite: true,
      })),
    );
  }
  if (methodPlan.risks.length > 0) {
    await db.insert(riskFlags).values(
      methodPlan.risks.map((description) => ({
        scopeId: scope!.id,
        kind: 'general',
        severity: 'medium' as const,
        description,
        blocksBindingQuote: false,
      })),
    );
  }

  await recordAgentRun({
    agentKey: 'agent08_method_planner',
    triggeredBy: auth.displayName ?? 'owner',
    entityType: 'scope',
    entityId: scope!.id,
    outputSummary: { stepCount: methodPlan.steps.length, overallCertainty: methodPlan.overallCertainty },
  });

  const [estimate] = await db
    .insert(estimates)
    .values({
      leadId,
      scopeId: scope!.id,
      status: 'ready',
      directCost: pricing.directCost,
      costWithOverhead: pricing.costWithOverhead,
      priceForMargin: pricing.priceForMargin,
      priceForProfitFloor: pricing.priceForProfitFloor,
      minimumJobCharge: pricing.minimumJobCharge,
      recommendedExVat: pricing.recommendedExVat,
      vatRatePercent: company.vatRatePercent,
      targetMarginRate: company.defaultTargetMarginRate,
      minimumTargetGrossProfit: company.defaultMinimumTargetGrossProfit,
      breakEven: pricing.breakEven,
      grossProfit: pricing.grossProfit,
      grossMargin: pricing.grossMargin,
      profitPerLabourHour: pricing.profitPerLabourHour,
      lowEstimate: pricing.lowEstimate,
      expectedEstimate: pricing.expectedEstimate,
      highEstimate: pricing.highEstimate,
      quoteConfidence: confidence,
      commercialFit: pricing.commercialFit,
      qaBlocked: false,
      qaBlockReasons: [],
    })
    .returning();

  for (const material of breakdown.materials) {
    await db.insert(estimateLines).values({
      estimateId: estimate!.id,
      category: 'materials_detail',
      label: material.label,
      quantity: material.finalQuantity,
      unit: material.unit,
      totalCost: 0,
      source: 'calculated',
    });
  }
  await db.insert(estimateLines).values([
    { estimateId: estimate!.id, category: 'materials', label: 'Malzeme (toplam)', totalCost: adjustedCosts.materials, source: 'calculated' },
    { estimateId: estimate!.id, category: 'labour', label: 'İşçilik', totalCost: breakdown.costs.labour, source: 'calculated' },
    { estimateId: estimate!.id, category: 'waste', label: 'Atık/Bertaraf', totalCost: breakdown.costs.waste, source: 'calculated' },
    { estimateId: estimate!.id, category: 'consumables', label: 'Sarf malzeme', totalCost: breakdown.costs.consumables, source: 'calculated' },
    { estimateId: estimate!.id, category: 'overhead', label: 'Genel gider', totalCost: breakdown.costs.overhead, source: 'calculated' },
    { estimateId: estimate!.id, category: 'risk', label: 'Risk payı', totalCost: breakdown.costs.riskReserve, source: 'calculated' },
  ]);

  await db.update(leads).set({ state: 'ESTIMATE_READY', updatedAt: new Date() }).where(eq(leads.id, leadId));

  await db.insert(auditLogs).values({
    actor: auth.displayName ?? 'owner',
    action: 'estimate_created',
    entityType: 'estimate',
    entityId: estimate!.id,
    after: { recommendedExVat: pricing.recommendedExVat, commercialFit: pricing.commercialFit },
  });

  await recordAgentRun({
    agentKey: 'agent07_scope_builder',
    triggeredBy: auth.displayName ?? 'owner',
    entityType: 'estimate',
    entityId: estimate!.id,
    outputSummary: { missingInfo: scopeResult.missingInfo, factStatuses: scopeResult.factStatuses },
    confidence,
  });
  await recordAgentRun({
    agentKey: 'agent09_pricing',
    triggeredBy: auth.displayName ?? 'owner',
    entityType: 'estimate',
    entityId: estimate!.id,
    outputSummary: {
      recommendedExVat: pricing.recommendedExVat,
      commercialFit: pricing.commercialFit,
    },
    confidence,
  });

  // scope.changed -> Agent 20 (QA) re-checks immediately, per section 47.
  await eventBus.emit('scope.changed', { leadId, estimateId: estimate!.id });

  revalidatePath(`/dashboard/leads/${leadId}`);
}

export interface GenerateQuoteResult {
  blocked: boolean;
  reasons: string[];
  quoteNumber?: string;
}

/**
 * Shared core for creating a quote from a ready estimate — used by both the
 * "Teklif oluştur (PDF)" form action and Beyza's "Bunun PDF teklifini
 * hazırla" voice/text command (lib/agents/beyza-orchestrator.ts,
 * generate_quote_pdf intent), so there is exactly one QA-gated code path
 * that ever produces a quote PDF.
 */
export async function generateQuoteForEstimate(
  leadId: string,
  estimateId: string,
  actorDisplayName: string,
): Promise<GenerateQuoteResult> {
  const [estimate] = await db.select().from(estimates).where(eq(estimates.id, estimateId)).limit(1);
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  if (!estimate || !lead) throw new Error('Not found');
  const [customer] = lead.customerId ? await db.select().from(customers).where(eq(customers.id, lead.customerId)).limit(1) : [];
  const company = await getCompanyProfile();
  if (!company) throw new Error('Company profile missing');

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
    bindingQuote: true,
    factStatuses: [],
    criticalUnknownLabels: [],
    requiredFields: { customerName: customer?.name, recommendedExVat: estimate.recommendedExVat },
  });

  if (qa.blocked) {
    await db.update(estimates).set({ qaBlocked: true, qaBlockReasons: qa.reasons }).where(eq(estimates.id, estimateId));
    revalidatePath(`/dashboard/leads/${leadId}`);
    return { blocked: true, reasons: qa.reasons };
  }

  const vatAmount = (estimate.recommendedExVat ?? 0) * (estimate.vatRatePercent / 100);
  const totalIncVat = (estimate.recommendedExVat ?? 0) + vatAmount;
  const quoteNumber = `Q-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000 + 10000)}`;
  const languageLevel = customerFacingLanguageLevel(estimate.quoteConfidence ?? 0.5);

  const [quote] = await db
    .insert(quotes)
    .values({
      leadId,
      estimateId,
      quoteNumber,
      status: 'draft',
      languageLevel,
      totalExVat: estimate.recommendedExVat ?? 0,
      vatAmount,
      totalIncVat,
      currentVersion: 1,
    })
    .returning();

  const pdfBytes = await generateQuotePdf({
    companyName: company.companyName,
    companyAddress: company.address ?? undefined,
    companyPhone: company.phone ?? undefined,
    companyEmail: company.email ?? undefined,
    companyKvk: company.kvkNumber ?? undefined,
    companyVat: company.vatNumber ?? undefined,
    customerName: customer?.name ?? 'Klant',
    projectAddress: lead.location ?? undefined,
    quoteNumber,
    date: new Date(),
    languageLevel,
    scope: lines
      .filter((l) => l.category === 'materials_detail')
      .map((l) => ({
        label: MATERIAL_LABELS_NL[l.label] ?? l.label,
        quantity: l.quantity ?? undefined,
        unit: l.unit ?? undefined,
      })),
    inclusions: ['Materiaal (indien door ons geleverd)', 'Arbeid', 'Afvoer indien aangevinkt'],
    exclusions: ['Onvoorziene ondergrondse obstakels'],
    customerSuppliedItems: [],
    companySuppliedItems: [],
    disposalIncluded: true,
    pricingLines: lines
      .filter((l) => l.category !== 'materials_detail')
      .map((l) => ({ label: categoryLabelNl(l.category), amount: l.totalCost })),
    totalExVat: estimate.recommendedExVat ?? 0,
    vatRatePercent: estimate.vatRatePercent,
    vatAmount,
    totalIncVat,
    paymentTerms: '50% bij opdracht, 50% bij oplevering.',
    assumptions: ['Ondergrond zoals besproken; afwijkingen kunnen prijs beïnvloeden.'],
    optionalItems: [],
    acceptanceNote: 'Door ondertekening gaat u akkoord met bovenstaande offerte.',
  });

  const storageDir = process.env.STORAGE_DIR ?? './storage';
  const pdfDir = path.join(storageDir, 'quotes');
  fs.mkdirSync(pdfDir, { recursive: true });
  const pdfPath = path.join(pdfDir, `${quote!.id}.pdf`);
  fs.writeFileSync(pdfPath, pdfBytes);

  await db.update(quotes).set({ pdfPath }).where(eq(quotes.id, quote!.id));
  await db.insert(quoteVersions).values({
    quoteId: quote!.id,
    version: 1,
    totalExVat: estimate.recommendedExVat ?? 0,
    changedLines: [],
    reason: 'İlk oluşturma',
    snapshot: { lines: lines.map((l) => ({ label: l.label, amount: l.totalCost })) },
  });

  await db.update(leads).set({ state: 'QUOTE_DRAFTED', updatedAt: new Date() }).where(eq(leads.id, leadId));

  await db.insert(auditLogs).values({
    actor: actorDisplayName,
    action: 'quote_created',
    entityType: 'quote',
    entityId: quote!.id,
    after: { quoteNumber, totalExVat: estimate.recommendedExVat },
  });

  revalidatePath(`/dashboard/leads/${leadId}`);
  revalidatePath('/dashboard/quotes');
  return { blocked: false, reasons: [], quoteNumber };
}

export async function createQuoteFromEstimateAction(formData: FormData): Promise<void> {
  const auth = await requireAuth();
  if (!auth.authenticated) throw new Error('Unauthorized');

  const leadId = String(formData.get('leadId') ?? '');
  const estimateId = String(formData.get('estimateId') ?? '');

  await generateQuoteForEstimate(leadId, estimateId, auth.displayName ?? 'owner');
}

const MAX_PHOTO_BYTES = Number(process.env.MAX_UPLOAD_MB ?? 15) * 1024 * 1024;

/**
 * Agent 06 — photo upload. Validates (section 37), hashes (section 6/50),
 * and either reuses a prior analysis for an identical file or creates an
 * honest, empty-until-reviewed skeleton. Never fabricates an observation.
 */
export async function uploadPhotoAction(formData: FormData): Promise<void> {
  const auth = await requireAuth();
  if (!auth.authenticated) throw new Error('Unauthorized');

  const leadId = String(formData.get('leadId') ?? '');
  const file = formData.get('photo');
  if (!(file instanceof File) || file.size === 0) {
    throw new Error('Bir fotoğraf seçilmedi.');
  }

  const validation = validateUpload({
    originalFilename: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    maxSizeBytes: MAX_PHOTO_BYTES,
  });
  if (!validation.valid) {
    throw new Error(validation.reasons.join(' '));
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

  const storageDir = process.env.STORAGE_DIR ?? './storage';
  const uploadsDir = path.join(storageDir, 'uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.writeFileSync(path.join(uploadsDir, validation.safeStoredFilename!), buffer);

  const [attachment] = await db
    .insert(attachments)
    .values({
      leadId,
      kind: 'photo',
      originalFilename: sanitizeOriginalFilename(file.name),
      storedFilename: validation.safeStoredFilename!,
      mimeType: file.type,
      sizeBytes: file.size,
      sha256,
    })
    .returning();

  const priorAttachments = (await db.select().from(attachments).where(eq(attachments.leadId, leadId))).filter(
    (a) => a.id !== attachment!.id,
  );
  const { alreadyAnalyzed } = findExistingAnalysisByHash(
    priorAttachments.map((a) => a.sha256),
    sha256,
  );

  if (alreadyAnalyzed) {
    const duplicateOf = priorAttachments.find((a) => a.sha256 === sha256);
    const [priorAnalysis] = duplicateOf
      ? await db.select().from(photoAnalyses).where(eq(photoAnalyses.attachmentId, duplicateOf.id)).limit(1)
      : [];
    await db.insert(photoAnalyses).values({
      attachmentId: attachment!.id,
      imageHash: sha256,
      observations: priorAnalysis?.observations ?? [],
      possibleScopeItems: priorAnalysis?.possibleScopeItems ?? [],
      hazardsOrRisks: priorAnalysis?.hazardsOrRisks ?? [],
      accessObservations: priorAnalysis?.accessObservations ?? [],
      measurementClaims: priorAnalysis?.measurementClaims ?? null,
      questionsToAsk: priorAnalysis?.questionsToAsk ?? [],
      overallConfidence: priorAnalysis?.overallConfidence ?? 0,
      ownerCorrection: 'Aynı fotoğraf daha önce yüklenmiş; analiz sonucu yeniden kullanıldı (tekrar analiz yapılmadı).',
    });
  } else {
    const skeleton = buildManualReviewSkeleton();
    await db.insert(photoAnalyses).values({ attachmentId: attachment!.id, imageHash: sha256, ...skeleton });
  }

  await eventBus.emit('photo.added', { leadId, attachmentId: attachment!.id, imageHash: sha256 });

  revalidatePath(`/dashboard/leads/${leadId}`);
}

export async function updatePhotoAnalysisAction(formData: FormData): Promise<void> {
  const auth = await requireAuth();
  if (!auth.authenticated) throw new Error('Unauthorized');

  const leadId = String(formData.get('leadId') ?? '');
  const analysisId = String(formData.get('analysisId') ?? '');
  const splitLines = (raw: FormDataEntryValue | null) =>
    String(raw ?? '')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

  const observations = splitLines(formData.get('observations'));
  const hazardsOrRisks = splitLines(formData.get('hazardsOrRisks'));
  const accessObservations = splitLines(formData.get('accessObservations'));
  const hasScaleReference = formData.get('hasScaleReference') === 'on';
  const measurementNote = String(formData.get('measurementNote') ?? '').trim();

  const measurementClaims = sanitizeMeasurementClaims(
    measurementNote ? { note: measurementNote } : null,
    hasScaleReference,
  );
  const confidence = computePhotoConfidence({
    ownerAnnotated: true,
    observationCount: observations.length,
    hasScaleReference,
  });

  await db
    .update(photoAnalyses)
    .set({
      observations,
      hazardsOrRisks,
      accessObservations,
      measurementClaims,
      overallConfidence: confidence,
      updatedAt: new Date(),
    })
    .where(eq(photoAnalyses.id, analysisId));

  await recordAgentRun({
    agentKey: 'agent06_photo_vision',
    triggeredBy: auth.displayName ?? 'owner',
    entityType: 'photo_analysis',
    entityId: analysisId,
    outputSummary: { observationCount: observations.length, hasScaleReference },
    confidence,
    provider: 'owner_manual', // honest: no AI provider is configured/used for this
  });

  revalidatePath(`/dashboard/leads/${leadId}`);
}
