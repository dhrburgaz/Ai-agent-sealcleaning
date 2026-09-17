import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// See tests/integration/lead-lifecycle.test.ts for why these are dynamic
// imports: DATABASE_PATH must be set before @/db/client (or anything
// importing it) is ever imported.
let db: typeof import('@/db/client').db;
let schema: typeof import('@/db/schema');
let dbFile: string;

beforeAll(async () => {
  dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'beyza-orch-test-')), 'test.db');
  process.env.DATABASE_PATH = dbFile;

  const { migrate } = await import('drizzle-orm/better-sqlite3/migrator');
  const clientModule = await import('@/db/client');
  db = clientModule.db;
  schema = await import('@/db/schema');

  migrate(db, { migrationsFolder: path.resolve(process.cwd(), 'db/migrations') });
});

afterAll(() => {
  if (fs.existsSync(dbFile)) fs.rmSync(path.dirname(dbFile), { recursive: true, force: true });
});

describe('orchestration event handlers — real database integration (section 47)', () => {
  it('recordAgentRun writes a real, queryable audit row', async () => {
    const { recordAgentRun } = await import('@/lib/orchestration/agent-run');

    await recordAgentRun({
      agentKey: 'agent09_pricing',
      triggeredBy: 'test',
      entityType: 'estimate',
      entityId: 'estimate-xyz',
      outputSummary: { recommendedExVat: 1234 },
      confidence: 0.9,
    });

    const rows = await db.select().from(schema.agentRuns).where(eq(schema.agentRuns.agentKey, 'agent09_pricing'));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.entityId).toBe('estimate-xyz');
    expect(rows[0]!.status).toBe('completed');
  });

  it('scope.changed handler re-runs the QA gate and persists qaBlocked/reasons onto the estimate', async () => {
    const { eventBus } = await import('@/lib/orchestration/events');
    const { ensureHandlersRegistered } = await import('@/lib/orchestration/register-handlers');
    ensureHandlersRegistered();

    const [customer] = await db.insert(schema.customers).values({ name: 'Orchestration Klant' }).returning();
    const [lead] = await db
      .insert(schema.leads)
      .values({ customerId: customer!.id, serviceCategory: 'terrassen_aanleggen', state: 'NEW' })
      .returning();

    // A deliberately below-floor estimate with no owner override, so the QA
    // gate must block it once the handler recomputes.
    const [estimate] = await db
      .insert(schema.estimates)
      .values({
        leadId: lead!.id,
        status: 'ready',
        directCost: 100,
        costWithOverhead: 100,
        priceForMargin: 142.86,
        priceForProfitFloor: 1300,
        minimumJobCharge: 0,
        recommendedExVat: 50, // artificially low vs. the stored priceForProfitFloor
        vatRatePercent: 21,
        targetMarginRate: 0.3,
        minimumTargetGrossProfit: 1200,
        qaBlocked: false,
        qaBlockReasons: [],
      })
      .returning();

    await db.insert(schema.estimateLines).values([
      { estimateId: estimate!.id, category: 'labour', label: 'Arbeid', totalCost: 100 },
    ]);

    await eventBus.emit('scope.changed', { leadId: lead!.id, estimateId: estimate!.id });

    const [updated] = await db.select().from(schema.estimates).where(eq(schema.estimates.id, estimate!.id)).limit(1);
    expect(updated!.qaBlocked).toBe(true);
    expect(updated!.qaBlockReasons!.length).toBeGreaterThan(0);
  });

  it('job.completed handler drafts a review request and advances COMPLETED -> REVIEW_REQUESTED', async () => {
    const { eventBus } = await import('@/lib/orchestration/events');
    const { ensureHandlersRegistered } = await import('@/lib/orchestration/register-handlers');
    ensureHandlersRegistered();

    const [customer] = await db.insert(schema.customers).values({ name: 'Reputation Klant' }).returning();
    const [lead] = await db
      .insert(schema.leads)
      .values({ customerId: customer!.id, serviceCategory: 'tuinonderhoud', state: 'COMPLETED' })
      .returning();
    const [job] = await db.insert(schema.jobs).values({ leadId: lead!.id, status: 'completed' }).returning();

    await eventBus.emit('job.completed', { leadId: lead!.id, jobId: job!.id });

    const reviewRequests = await db.select().from(schema.reviewRequests).where(eq(schema.reviewRequests.jobId, job!.id));
    expect(reviewRequests).toHaveLength(1);
    expect(reviewRequests[0]!.status).toBe('draft');

    const [updatedLead] = await db.select().from(schema.leads).where(eq(schema.leads.id, lead!.id)).limit(1);
    expect(updatedLead!.state).toBe('REVIEW_REQUESTED');
  });

  it('job.completed handler is idempotent — never drafts a second review request', async () => {
    const { eventBus } = await import('@/lib/orchestration/events');
    const { ensureHandlersRegistered } = await import('@/lib/orchestration/register-handlers');
    ensureHandlersRegistered();

    const [customer] = await db.insert(schema.customers).values({ name: 'Idempotent Klant' }).returning();
    const [lead] = await db
      .insert(schema.leads)
      .values({ customerId: customer!.id, serviceCategory: 'tuinonderhoud', state: 'COMPLETED' })
      .returning();
    const [job] = await db.insert(schema.jobs).values({ leadId: lead!.id, status: 'completed' }).returning();

    await eventBus.emit('job.completed', { leadId: lead!.id, jobId: job!.id });
    await eventBus.emit('job.completed', { leadId: lead!.id, jobId: job!.id });

    const reviewRequests = await db.select().from(schema.reviewRequests).where(eq(schema.reviewRequests.jobId, job!.id));
    expect(reviewRequests).toHaveLength(1);
  });

  it('photo.added handler reports a cache hit when the same image hash was seen before', async () => {
    const { eventBus } = await import('@/lib/orchestration/events');
    const { ensureHandlersRegistered } = await import('@/lib/orchestration/register-handlers');
    ensureHandlersRegistered();

    const [customer] = await db.insert(schema.customers).values({ name: 'Photo Klant' }).returning();
    const [lead] = await db
      .insert(schema.leads)
      .values({ customerId: customer!.id, serviceCategory: 'tuinonderhoud', state: 'NEW' })
      .returning();

    const sharedHash = 'deadbeef'.repeat(8);
    const [firstAttachment] = await db
      .insert(schema.attachments)
      .values({
        leadId: lead!.id,
        kind: 'photo',
        originalFilename: 'tuin1.jpg',
        storedFilename: 'stored-1.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1000,
        sha256: sharedHash,
      })
      .returning();
    await eventBus.emit('photo.added', {
      leadId: lead!.id,
      attachmentId: firstAttachment!.id,
      imageHash: sharedHash,
    });

    const [secondAttachment] = await db
      .insert(schema.attachments)
      .values({
        leadId: lead!.id,
        kind: 'photo',
        originalFilename: 'tuin1-again.jpg',
        storedFilename: 'stored-2.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1000,
        sha256: sharedHash,
      })
      .returning();
    await eventBus.emit('photo.added', {
      leadId: lead!.id,
      attachmentId: secondAttachment!.id,
      imageHash: sharedHash,
    });

    const runs = await db
      .select()
      .from(schema.agentRuns)
      .where(eq(schema.agentRuns.entityId, secondAttachment!.id));
    expect(runs).toHaveLength(1);
    expect(runs[0]!.cacheHit).toBe(true);
  });

  it('message.received handler advances CONTACTED -> REPLIED', async () => {
    const { eventBus } = await import('@/lib/orchestration/events');
    const { ensureHandlersRegistered } = await import('@/lib/orchestration/register-handlers');
    ensureHandlersRegistered();

    const [customer] = await db.insert(schema.customers).values({ name: 'Reply Klant' }).returning();
    const [lead] = await db
      .insert(schema.leads)
      .values({ customerId: customer!.id, serviceCategory: 'tuinonderhoud', state: 'CONTACTED' })
      .returning();

    await eventBus.emit('message.received', { leadId: lead!.id, threadId: 'thread-x', messageId: 'message-x' });

    const [updatedLead] = await db.select().from(schema.leads).where(eq(schema.leads.id, lead!.id)).limit(1);
    expect(updatedLead!.state).toBe('REPLIED');
  });
});
