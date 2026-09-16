'use server';

import { revalidatePath } from 'next/cache';
import fs from 'node:fs';
import path from 'node:path';
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
} from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/guard';
import { getCompanyProfile } from '@/lib/server/repo';
import { renderTemplate, type MessageTemplateKey } from '@/lib/messaging/templates';
import { decideSend, type ApprovalMode } from '@/lib/messaging/approval';
import {
  buildCeramicTerraceScope,
  computeCeramicTerraceJob,
  type CeramicTerraceInputs,
} from '@/lib/pricing/ceramic-terrace-template';
import { runQaGate } from '@/lib/pricing/qa-gate';
import { computeQuoteConfidence, customerFacingLanguageLevel } from '@/lib/pricing/confidence';
import { categoryLabelNl } from '@/lib/pricing/category-labels';
import { generateQuotePdf } from '@/lib/documents/quote-pdf';

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

  const confidence = computeQuoteConfidence(scopeResult.factStatuses, {
    unclearAccess: !accessWidthCm,
  });

  const [estimate] = await db
    .insert(estimates)
    .values({
      leadId,
      status: 'ready',
      directCost: breakdown.pricing.directCost,
      costWithOverhead: breakdown.pricing.costWithOverhead,
      priceForMargin: breakdown.pricing.priceForMargin,
      priceForProfitFloor: breakdown.pricing.priceForProfitFloor,
      minimumJobCharge: breakdown.pricing.minimumJobCharge,
      recommendedExVat: breakdown.pricing.recommendedExVat,
      vatRatePercent: company.vatRatePercent,
      targetMarginRate: company.defaultTargetMarginRate,
      minimumTargetGrossProfit: company.defaultMinimumTargetGrossProfit,
      breakEven: breakdown.pricing.breakEven,
      grossProfit: breakdown.pricing.grossProfit,
      grossMargin: breakdown.pricing.grossMargin,
      profitPerLabourHour: breakdown.pricing.profitPerLabourHour,
      lowEstimate: breakdown.pricing.lowEstimate,
      expectedEstimate: breakdown.pricing.expectedEstimate,
      highEstimate: breakdown.pricing.highEstimate,
      quoteConfidence: confidence,
      commercialFit: breakdown.pricing.commercialFit,
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
    { estimateId: estimate!.id, category: 'materials', label: 'Malzeme (toplam)', totalCost: breakdown.costs.materials, source: 'calculated' },
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
    after: { recommendedExVat: breakdown.pricing.recommendedExVat, commercialFit: breakdown.pricing.commercialFit },
  });

  revalidatePath(`/dashboard/leads/${leadId}`);
}

export async function createQuoteFromEstimateAction(formData: FormData): Promise<void> {
  const auth = await requireAuth();
  if (!auth.authenticated) throw new Error('Unauthorized');

  const leadId = String(formData.get('leadId') ?? '');
  const estimateId = String(formData.get('estimateId') ?? '');

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
    return;
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
    actor: auth.displayName ?? 'owner',
    action: 'quote_created',
    entityType: 'quote',
    entityId: quote!.id,
    after: { quoteNumber, totalExVat: estimate.recommendedExVat },
  });

  revalidatePath(`/dashboard/leads/${leadId}`);
  revalidatePath('/dashboard/quotes');
}
