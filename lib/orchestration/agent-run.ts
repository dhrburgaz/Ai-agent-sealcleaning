/**
 * Section 9/44 — every agent invocation gets an audit record: agent, timestamp,
 * inputs, output, confidence, provider, cost, approval, cache hit, source evidence.
 * This is a thin, additive logging wrapper — it never changes the behavior or
 * return value of the wrapped call, so it's safe to drop into existing Phase 1-3
 * call sites without risking a regression.
 */
import { db } from '@/db/client';
import { agentRuns } from '@/db/schema';

export interface AgentRunRecord {
  agentKey: string;
  triggeredBy?: string;
  entityType?: string;
  entityId?: string;
  inputSummary?: Record<string, unknown>;
  outputSummary?: Record<string, unknown>;
  confidence?: number | null;
  provider?: string;
  modelCostEur?: number;
  cacheHit?: boolean;
  status?: 'completed' | 'failed' | 'blocked';
  errorMessage?: string;
}

export async function recordAgentRun(record: AgentRunRecord): Promise<void> {
  try {
    await db.insert(agentRuns).values({
      agentKey: record.agentKey,
      triggeredBy: record.triggeredBy ?? 'system',
      entityType: record.entityType,
      entityId: record.entityId,
      inputSummary: record.inputSummary,
      outputSummary: record.outputSummary,
      confidence: record.confidence ?? null,
      provider: record.provider ?? 'deterministic',
      modelCostEur: record.modelCostEur ?? 0,
      cacheHit: record.cacheHit ?? false,
      status: record.status ?? 'completed',
      errorMessage: record.errorMessage,
    });
  } catch {
    // Audit logging must never break the actual operation it's observing.
    // A failure here is swallowed deliberately (there is nowhere safe to
    // surface it without risking the caller's real work).
  }
}

/**
 * Wraps a synchronous or async agent computation with an audit record.
 * The wrapped function's return value and thrown errors pass through unchanged;
 * only a side-effect audit row is added.
 */
export async function withAgentRun<T>(
  meta: Omit<AgentRunRecord, 'outputSummary' | 'status' | 'errorMessage'>,
  fn: () => T | Promise<T>,
  summarize?: (result: T) => Record<string, unknown>,
): Promise<T> {
  try {
    const result = await fn();
    await recordAgentRun({
      ...meta,
      outputSummary: summarize ? summarize(result) : undefined,
      status: 'completed',
    });
    return result;
  } catch (error) {
    await recordAgentRun({
      ...meta,
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
