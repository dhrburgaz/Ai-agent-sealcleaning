/**
 * Section 60 — demo data. Clearly labeled DEMO, never real people. Safe to run
 * repeatedly against a fresh database (fails loudly if company profile already
 * exists, to avoid silently duplicating demo records over real data).
 */
import { eq } from 'drizzle-orm';
import { db, sqlite } from '../db/client';
import {
  companyProfile,
  users,
  themeConfigs,
  budgetPolicies,
  crewMembers,
  agentConfig,
  priceBookItems,
  customers,
  leadSources,
  leads,
  leadEvents,
  messageThreads,
  messages,
  suppliers,
  supplierProducts,
  supplierPriceObservations,
  estimates,
  quotes,
  jobs,
  actualCosts,
  reviewRequests,
  inventoryItems,
  appointments,
  calendarEvents,
  followUps,
} from '../db/schema';
import { hashPassword } from '../lib/auth/password';
import { AGENT_DEFINITIONS } from '../lib/agents/definitions';
import { qualifyLead } from '../lib/crm/qualification';

async function main() {
  const [existing] = await db.select().from(companyProfile).limit(1);
  if (existing) {
    console.error('Company profile already exists. Refusing to reseed over existing data.');
    process.exit(1);
  }

  console.log('Seeding DEMO data (labeled, no real people)...');

  const [company] = await db
    .insert(companyProfile)
    .values({
      companyName: 'DEMO Hovenier Dordrecht',
      phone: '+31 6 00000000',
      email: 'demo@example.invalid',
      baseCity: 'Dordrecht',
      province: 'Zuid-Holland',
      serviceRadiusKm: 35,
      enabledServiceCategories: [
        'tuinonderhoud',
        'bestrating_verwijderen',
        'bestrating_leggen',
        'keramische_buitentegels',
        'terrassen_aanleggen',
        'schuur_leegmaken',
      ],
      defaultTargetMarginRate: 0.3,
      defaultMinimumTargetGrossProfit: 1200,
      defaultMinimumJobCharge: 150,
      vatRatePercent: 21,
      approvalMode: 'smart_approval',
      setupCompleted: true,
    })
    .returning();

  await db.insert(users).values({
    displayName: 'DEMO Sahip',
    passwordHash: await hashPassword('DemoPassword123'),
  });

  await db.insert(themeConfigs).values({ activeTheme: 'ay-yildiz-dark-red', customerDemoMode: false });
  await db.insert(budgetPolicies).values({ scope: 'global', monthlyCapEur: 0, dailyCapEur: 0 });

  await db.insert(crewMembers).values([
    { name: 'DEMO Sahip', kind: 'owner', hourlyCost: 35 },
    { name: 'DEMO Yardımcı', kind: 'helper', hourlyCost: 22 },
  ]);

  for (const agent of AGENT_DEFINITIONS) {
    await db.insert(agentConfig).values({
      agentKey: agent.key,
      displayName: agent.displayName,
      costTier: agent.costTier,
      enabled: true,
      notes: agent.buildNote,
    });
  }

  await db.insert(priceBookItems).values([
    { category: 'bestrating', nameNl: 'Bestrating verwijderen (DEMO)', unit: 'm2', baseCost: 12, source: 'DEMO', confidence: 'low', needsOwnerVerification: true, notes: 'NEEDS_OWNER_VERIFICATION' },
    { category: 'terras', nameNl: 'Keramische tegel leggen (DEMO)', unit: 'm2', baseCost: 28, source: 'DEMO', confidence: 'low', needsOwnerVerification: true, notes: 'NEEDS_OWNER_VERIFICATION' },
    { category: 'afvoer', nameNl: 'Puin afvoer (DEMO)', unit: 'm3', baseCost: 35, source: 'DEMO', confidence: 'low', needsOwnerVerification: true, notes: 'NEEDS_OWNER_VERIFICATION' },
  ]);

  const demoLeadsData = [
    { name: 'DEMO Klant A', service: 'keramische_buitentegels', location: 'Dordrecht', scale: 'large' as const, urgency: 'medium' as const, text: '40 m2 terras, oude tegels eruit, nieuwe keramische tegels erin.', state: 'QUALIFIED' as const },
    { name: 'DEMO Klant B', service: 'schuttingen_plaatsen', location: 'Dordrecht', scale: 'medium' as const, urgency: 'low' as const, text: 'Nieuwe schutting rondom achtertuin.', state: 'SITE_VISIT_BOOKED' as const },
    { name: 'DEMO Klant C', service: 'tuin_opruimen', location: 'Papendrecht', scale: 'small' as const, urgency: 'high' as const, text: 'Tuin snel opruimen voor verkoop huis.', state: 'NEW' as const },
    { name: 'DEMO Klant D', service: 'schuur_leegmaken', location: 'Zwijndrecht', scale: 'small' as const, urgency: 'medium' as const, text: 'Schuur leegmaken en oud hout afvoeren.', state: 'NEW' as const },
    { name: 'DEMO Klant E', service: 'tuinonderhoud', location: 'Dordrecht', scale: 'medium' as const, urgency: 'low' as const, text: 'Maandelijks tuinonderhoud gezocht.', state: 'NEW' as const },
    { name: 'DEMO Klant F', service: 'terrassen_aanleggen', location: 'Dordrecht', scale: 'medium' as const, urgency: 'medium' as const, text: 'Terras vervangen, offerte al verstuurd, nog geen reactie.', state: 'QUOTE_SENT' as const },
  ];

  const leadsByName = new Map<string, { id: string; customerId: string }>();

  for (const d of demoLeadsData) {
    const [customer] = await db.insert(customers).values({ name: d.name, phone: '+31 6 00000001', email: null }).returning();
    const [source] = await db.insert(leadSources).values({ kind: 'manual', rawText: d.text }).returning();
    const qualification = qualifyLead({
      withinServiceRadius: true,
      serviceFit: true,
      estimatedScale: d.scale,
      urgency: d.urgency,
      informationQuality: 0.6,
      hasPhotos: false,
      accessKnown: false,
      complexity: 'unknown',
      quoteConfidence: null,
      hoursSinceLastResponse: null,
      requiresSiteVisit: true,
      seeksCheapOnly: null,
      bundleOpportunityNearby: false,
    });
    const [lead] = await db
      .insert(leads)
      .values({
        customerId: customer!.id,
        leadSourceId: source!.id,
        serviceCategory: d.service,
        location: d.location,
        urgency: d.urgency,
        estimatedScale: d.scale,
        priority: qualification.priority,
        priorityScore: qualification.score,
        priorityReasons: qualification.reasons,
        nextBestAction: qualification.nextBestAction,
        state: d.state,
      })
      .returning();
    leadsByName.set(d.name, { id: lead!.id, customerId: customer!.id });
    await db.insert(leadEvents).values({
      leadId: lead!.id,
      kind: 'state_transition',
      toState: d.state,
      actor: 'seed',
      detail: d.state === 'NEW' ? 'DEMO seed' : `DEMO seed (collapsed state history to ${d.state})`,
    });
    const [thread] = await db.insert(messageThreads).values({ leadId: lead!.id, customerId: customer!.id }).returning();
    await db.insert(messages).values({ threadId: thread!.id, direction: 'inbound', body: d.text, language: 'nl', status: 'sent' });
  }

  const [supplier] = await db.insert(suppliers).values({ name: 'DEMO Bouwmarkt', category: 'tegels', preferred: true }).returning();
  const [product] = await db.insert(supplierProducts).values({ supplierId: supplier!.id, material: 'Keramische tegel 60x60', unit: 'm2', packageQuantity: 1.44 }).returning();
  await db.insert(supplierPriceObservations).values({
    supplierProductId: product!.id,
    unitPrice: 24.95,
    vatIncluded: true,
    source: 'DEMO',
    mode: 'manual_verification',
    verificationConfidence: 'medium',
    observedAt: new Date(),
    staleAfter: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  });

  // Inventory on hand (Phase 6), so the inventory page and offset logic have
  // real DEMO stock to check against.
  await db.insert(inventoryItems).values([
    { label: 'Keramische tegel 60x60 (DEMO)', unit: 'm2', quantityOnHand: 18, reorderThreshold: 20 },
    { label: 'Straatzand (DEMO)', unit: 'm3', quantityOnHand: 2.5, reorderThreshold: 3 },
  ]);

  // A confirmed site-visit appointment for Klant B (SITE_VISIT_BOOKED), so
  // the calendar page and ICS export have something real to show.
  const klantB = leadsByName.get('DEMO Klant B');
  if (klantB) {
    const visitStart = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const visitEnd = new Date(visitStart.getTime() + 60 * 60 * 1000);
    const [appointment] = await db
      .insert(appointments)
      .values({ leadId: klantB.id, kind: 'site_visit', startsAt: visitStart, endsAt: visitEnd, status: 'confirmed' })
      .returning();
    await db.insert(calendarEvents).values({
      appointmentId: appointment!.id,
      kind: 'site_visit',
      title: 'Keşif randevusu (DEMO)',
      startsAt: visitStart,
      endsAt: visitEnd,
      icsUid: `appointment-${appointment!.id}@beyza`,
    });
  }

  // A due follow-up for Klant F (QUOTE_SENT 4 days ago, no reply yet), so the
  // follow-ups queue has a real due reminder to demonstrate Agent 17.
  const klantF = leadsByName.get('DEMO Klant F');
  if (klantF) {
    await db.insert(followUps).values({
      leadId: klantF.id,
      sequenceStep: 1,
      scheduledAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      status: 'scheduled',
    });
  }

  // One completed demo job with variance, to exercise the job-costing and
  // finance-report screens (Agent 18) and the review-request draft (Agent 19).
  const klantA = leadsByName.get('DEMO Klant A');
  if (klantA) {
    const [demoEstimate] = await db
      .insert(estimates)
      .values({
        leadId: klantA.id,
        status: 'ready',
        directCost: 1800,
        costWithOverhead: 1990,
        recommendedExVat: 3200,
        vatRatePercent: 21,
        targetMarginRate: 0.3,
        minimumTargetGrossProfit: 1200,
        grossProfit: 1210,
        grossMargin: 0.378,
        commercialFit: 'strong',
      })
      .returning();
    const [demoQuote] = await db
      .insert(quotes)
      .values({
        leadId: klantA.id,
        estimateId: demoEstimate!.id,
        quoteNumber: 'Q-DEMO-0001',
        status: 'accepted',
        languageLevel: 'offerte',
        totalExVat: 3200,
        vatAmount: 672,
        totalIncVat: 3872,
      })
      .returning();
    const [demoJob] = await db
      .insert(jobs)
      .values({ leadId: klantA.id, quoteId: demoQuote!.id, status: 'completed', completedAt: new Date() })
      .returning();
    await db.insert(actualCosts).values([
      { jobId: demoJob!.id, category: 'labour', amount: 900, enteredVia: 'form', confirmedAt: new Date() },
      { jobId: demoJob!.id, category: 'materials', amount: 850, enteredVia: 'form', confirmedAt: new Date() },
      { jobId: demoJob!.id, category: 'disposal', amount: 220, enteredVia: 'form', confirmedAt: new Date() },
    ]);
    await db.insert(reviewRequests).values({ jobId: demoJob!.id, status: 'draft', draftText: null });
    await db.update(leads).set({ state: 'REVIEW_REQUESTED' }).where(eq(leads.id, klantA.id));
    await db.insert(leadEvents).values({
      leadId: klantA.id,
      kind: 'state_transition',
      fromState: 'QUALIFIED',
      toState: 'REVIEW_REQUESTED',
      actor: 'seed',
      detail: 'DEMO seed (collapsed state history: job completed, review request drafted)',
    });
  }

  console.log(`DEMO seed complete for company: ${company!.companyName}`);
  console.log('Login password: DemoPassword123 (DEMO only — change in a real deployment).');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => sqlite.close());
