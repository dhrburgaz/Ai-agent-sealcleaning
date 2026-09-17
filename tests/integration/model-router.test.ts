import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
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
let runModelTask: typeof import('@/lib/ai/model-router').runModelTask;
let resetCircuits: typeof import('@/lib/ai/model-router').__resetCircuitStatesForTests;

const zeroBudget = { monthlyCapEur: 0, dailyCapEur: 0, spentThisMonthEur: 0, spentTodayEur: 0 };
const openBudget = { monthlyCapEur: 20, dailyCapEur: 5, spentThisMonthEur: 0, spentTodayEur: 0 };

beforeAll(async () => {
  dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'beyza-router-test-')), 'test.db');
  process.env.DATABASE_PATH = dbFile;

  const { migrate } = await import('drizzle-orm/better-sqlite3/migrator');
  const clientModule = await import('@/db/client');
  db = clientModule.db;
  schema = await import('@/db/schema');
  migrate(db, { migrationsFolder: path.resolve(process.cwd(), 'db/migrations') });

  const routerModule = await import('@/lib/ai/model-router');
  runModelTask = routerModule.runModelTask;
  resetCircuits = routerModule.__resetCircuitStatesForTests;
});

afterAll(() => {
  if (fs.existsSync(dbFile)) fs.rmSync(path.dirname(dbFile), { recursive: true, force: true });
});

beforeEach(() => {
  resetCircuits();
});

function fakeProvider(complete: () => Promise<{ text: string; estimatedTokensIn: number; estimatedTokensOut: number }>) {
  return { key: 'openai_compatible' as const, capabilities: { text: true, vision: false, json: false, toolCalls: false, contextWindowTokens: 1000, freeOrPaid: 'paid' as const }, complete };
}

describe('AI model router — full gate, real database (section 15)', () => {
  it('blocks a paid-tier task at the default €0 budget and logs it', async () => {
    const result = await runModelTask({
      taskKey: 'test_task_1',
      agentKey: 'agent06_photo_vision',
      tier: 'tier3_economical_paid',
      provider: fakeProvider(async () => ({ text: 'should never run', estimatedTokensIn: 1, estimatedTokensOut: 1 })),
      providerConfigured: true,
      providerEnabled: true,
      budget: zeroBudget,
      estimatedCostEur: 0.01,
      request: { prompt: 'unique-prompt-1' },
    });

    expect(result.outcome).toBe('blocked');
    const usageRows = await db.select().from(schema.apiUsage).where(eq(schema.apiUsage.agentKey, 'agent06_photo_vision'));
    expect(usageRows.some((r) => r.blocked)).toBe(true);
  });

  it('serves a cache hit without ever calling the provider, even at €0 budget', async () => {
    let calls = 0;
    const provider = fakeProvider(async () => {
      calls += 1;
      return { text: 'first answer', estimatedTokensIn: 1, estimatedTokensOut: 1 };
    });

    await runModelTask({
      taskKey: 'test_task_cache',
      agentKey: 'agent06_photo_vision',
      tier: 'tier3_economical_paid',
      provider,
      providerConfigured: true,
      providerEnabled: true,
      budget: openBudget,
      estimatedCostEur: 0.01,
      request: { prompt: 'cache-me' },
    });
    expect(calls).toBe(1);

    // Same task+input again, this time with a €0 budget — a cache hit must
    // still succeed because it costs nothing new.
    const second = await runModelTask({
      taskKey: 'test_task_cache',
      agentKey: 'agent06_photo_vision',
      tier: 'tier3_economical_paid',
      provider,
      providerConfigured: true,
      providerEnabled: true,
      budget: zeroBudget,
      estimatedCostEur: 0.01,
      request: { prompt: 'cache-me' },
    });

    expect(second.outcome).toBe('cache_hit');
    expect(second.text).toBe('first answer');
    expect(calls).toBe(1); // provider was not called a second time
  });

  it('opens the circuit breaker after repeated provider failures and blocks further attempts', async () => {
    const failingProvider = fakeProvider(async () => {
      throw new (await import('@/lib/ai/providers/types')).ProviderHttpError(503, 'temporarily unavailable');
    });

    const attempt = () =>
      runModelTask(
        {
          taskKey: 'test_task_circuit',
          agentKey: 'agent06_photo_vision',
          tier: 'tier3_economical_paid',
          provider: failingProvider,
          providerConfigured: true,
          providerEnabled: true,
          budget: openBudget,
          estimatedCostEur: 0.01,
          request: { prompt: `unique-${Math.random()}` }, // never hit cache
        },
        { sleep: async () => {} }, // no real waiting in tests
      );

    const results = [await attempt(), await attempt(), await attempt()];
    expect(results.every((r) => r.outcome === 'failed')).toBe(true);

    const afterCircuitOpen = await attempt();
    expect(afterCircuitOpen.outcome).toBe('circuit_open');
  });

  it('succeeds and logs api_usage + agent_runs when everything is configured and healthy', async () => {
    const provider = fakeProvider(async () => ({ text: 'merhaba', estimatedTokensIn: 10, estimatedTokensOut: 5 }));

    const result = await runModelTask({
      taskKey: 'test_task_success',
      agentKey: 'agent06_photo_vision',
      entityType: 'attachment',
      entityId: 'att-1',
      tier: 'tier3_economical_paid',
      provider,
      providerConfigured: true,
      providerEnabled: true,
      budget: openBudget,
      estimatedCostEur: 0.02,
      request: { prompt: 'unique-success-prompt' },
    });

    expect(result.outcome).toBe('success');
    expect(result.text).toBe('merhaba');

    const runs = await db.select().from(schema.agentRuns).where(eq(schema.agentRuns.entityId, 'att-1'));
    expect(runs.length).toBeGreaterThan(0);
    expect(runs[0]!.provider).toBe('openai_compatible');
  });
});
