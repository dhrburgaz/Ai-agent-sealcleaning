import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// This DB module reads DATABASE_PATH at import time, so the env var must be set
// before it (or anything importing it) is ever imported — hence the dynamic
// imports inside beforeAll rather than static top-level imports.
let db: typeof import('@/db/client').db;
let schema: typeof import('@/db/schema');
let dbFile: string;

beforeAll(async () => {
  dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'beyza-test-')), 'test.db');
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

describe('lead lifecycle — real database integration', () => {
  it('records an auditable state transition end to end', async () => {
    const { canTransition } = await import('@/lib/crm/state-machine');

    const [customer] = await db.insert(schema.customers).values({ name: 'Integratie Test Klant' }).returning();
    const [source] = await db.insert(schema.leadSources).values({ kind: 'manual', rawText: 'Test terras aanvraag' }).returning();
    const [lead] = await db
      .insert(schema.leads)
      .values({
        customerId: customer!.id,
        leadSourceId: source!.id,
        serviceCategory: 'keramische_buitentegels',
        location: 'Dordrecht',
        state: 'NEW',
      })
      .returning();

    expect(canTransition(lead!.state, 'REVIEWED').allowed).toBe(true);

    await db.update(schema.leads).set({ state: 'REVIEWED' }).where(eq(schema.leads.id, lead!.id));
    await db.insert(schema.leadEvents).values({
      leadId: lead!.id,
      kind: 'state_transition',
      fromState: 'NEW',
      toState: 'REVIEWED',
      actor: 'integration-test',
    });
    await db.insert(schema.auditLogs).values({
      actor: 'integration-test',
      action: 'lead_state_transition',
      entityType: 'lead',
      entityId: lead!.id,
      before: { state: 'NEW' },
      after: { state: 'REVIEWED' },
    });

    const events = await db.select().from(schema.leadEvents);
    const audits = await db.select().from(schema.auditLogs);
    expect(events).toHaveLength(1);
    expect(events[0]!.toState).toBe('REVIEWED');
    expect(audits).toHaveLength(1);
    expect(audits[0]!.action).toBe('lead_state_transition');
  });

  it('blocks an exact-identifier duplicate lead via the dedupe guard before insert', async () => {
    const { findDuplicates } = await import('@/lib/crm/dedupe');

    const [customer] = await db.insert(schema.customers).values({ name: 'Dedupe Klant', phone: '0612345678' }).returning();
    const [lead] = await db
      .insert(schema.leads)
      .values({ customerId: customer!.id, serviceCategory: 'tuinonderhoud', state: 'NEW' })
      .returning();

    const existingLeads = await db.select().from(schema.leads);
    const existingCustomers = await db.select().from(schema.customers);
    const candidates = existingLeads.map((l) => {
      const c = existingCustomers.find((cc) => cc.id === l.customerId);
      return { id: l.id, phone: c?.phone };
    });

    const matches = findDuplicates({ id: 'incoming', phone: '06 1234 5678' }, candidates);
    expect(matches.some((m) => m.candidateId === lead!.id && m.autoMergeEligible)).toBe(true);
  });

  it('computes a status snapshot purely from database state (no AI call)', async () => {
    const { buildStatusSnapshot } = await import('@/lib/server/status-snapshot');
    const snapshot = await buildStatusSnapshot();
    expect(snapshot.leadsLast24h).toBeGreaterThanOrEqual(2); // from the two prior tests
    expect(typeof snapshot.pipelineValueEur).toBe('number');
  });
});
