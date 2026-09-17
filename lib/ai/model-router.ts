/**
 * Section 15 — the full AI Provider Router: budget gate (lib/ai/router.ts,
 * unchanged from Phase 1-3) + prompt cache + circuit breaker + retry/backoff,
 * all logged to `api_usage` and `agent_runs`.
 *
 * This is real, callable infrastructure — not a mock — but nothing in this
 * codebase currently configures a provider (no API key is set anywhere, see
 * .env.example), so `routeProviderRequest` blocks every paid-tier call by
 * construction and this module is inert in practice until an owner
 * explicitly configures and budgets a provider from Settings. It is unit
 * tested end to end with a fake provider — never against a real network call.
 */
import { db } from '@/db/client';
import { apiUsage } from '@/db/schema';
import { routeProviderRequest, type ProviderTier, type BudgetPolicySnapshot } from './router';
import { getCachedOutput, setCachedOutput } from './cache';
import {
  canAttempt,
  recordFailure,
  recordSuccess,
  initialCircuitState,
  type CircuitBreakerState,
} from './circuit-breaker';
import { decideRetry, DEFAULT_RETRY_CONFIG } from './retry';
import { ProviderHttpError, type ModelCompletionRequest, type ModelProvider } from './providers/types';
import { recordAgentRun } from '@/lib/orchestration/agent-run';

export interface ModelTaskRequest {
  taskKey: string;
  agentKey: string;
  entityType?: string;
  entityId?: string;
  tier: ProviderTier;
  provider: ModelProvider | null;
  providerConfigured: boolean;
  providerEnabled: boolean;
  budget: BudgetPolicySnapshot;
  estimatedCostEur: number;
  request: ModelCompletionRequest;
  cacheable?: boolean;
}

export type ModelTaskOutcome = 'cache_hit' | 'success' | 'blocked' | 'circuit_open' | 'failed';

export interface ModelTaskResult {
  outcome: ModelTaskOutcome;
  text?: string;
  reason: string;
}

export interface RunModelTaskOptions {
  now?: Date;
  sleep?: (ms: number) => Promise<void>;
  circuitState?: CircuitBreakerState;
}

const circuitStatesByProvider = new Map<string, CircuitBreakerState>();

function getCircuitState(providerKey: string): CircuitBreakerState {
  return circuitStatesByProvider.get(providerKey) ?? initialCircuitState();
}

function setCircuitState(providerKey: string, state: CircuitBreakerState): void {
  circuitStatesByProvider.set(providerKey, state);
}

async function logApiUsage(fields: {
  provider: string;
  agentKey: string;
  tier: string;
  estimatedTokensIn?: number;
  estimatedTokensOut?: number;
  estimatedCostEur?: number;
  actualCostEur?: number;
  cacheHit?: boolean;
  blocked?: boolean;
  blockedReason?: string;
}): Promise<void> {
  try {
    await db.insert(apiUsage).values(fields);
  } catch {
    // Usage logging must never take down the actual task it's observing.
  }
}

/**
 * Runs one model task through the full gate: budget -> cache -> circuit
 * breaker -> provider call with retry. Never throws for an expected outcome
 * (blocked/circuit_open/failed) — callers should always have a deterministic
 * fallback for any outcome other than 'success'/'cache_hit', per section 2's
 * "system remains useful even with zero AI keys" rule.
 */
export async function runModelTask(req: ModelTaskRequest, options: RunModelTaskOptions = {}): Promise<ModelTaskResult> {
  const now = options.now ?? new Date();
  const sleep = options.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));

  // A valid cache hit costs nothing new, so it's served regardless of the
  // current budget state — checking it before the budget gate is what makes
  // caching actually save money instead of just saving a redundant call
  // within an already-allowed budget.
  if (req.cacheable !== false) {
    const cached = await getCachedOutput(req.taskKey, req.request, now);
    if (cached) {
      await logApiUsage({
        provider: req.provider?.key ?? 'cache',
        agentKey: req.agentKey,
        tier: req.tier,
        cacheHit: true,
      });
      await recordAgentRun({
        agentKey: req.agentKey,
        entityType: req.entityType,
        entityId: req.entityId,
        cacheHit: true,
        outputSummary: cached,
      });
      return { outcome: 'cache_hit', text: (cached as { text?: string }).text, reason: 'Önbellekten yanıtlandı.' };
    }
  }

  const routing = routeProviderRequest({
    tier: req.tier,
    providerConfigured: req.providerConfigured,
    providerEnabled: req.providerEnabled,
    estimatedCostEur: req.estimatedCostEur,
    budget: req.budget,
  });

  if (!routing.allowed) {
    await logApiUsage({
      provider: req.provider?.key ?? 'none',
      agentKey: req.agentKey,
      tier: req.tier,
      estimatedCostEur: req.estimatedCostEur,
      blocked: true,
      blockedReason: routing.reason,
    });
    await recordAgentRun({
      agentKey: req.agentKey,
      entityType: req.entityType,
      entityId: req.entityId,
      status: 'blocked',
      errorMessage: routing.reason,
    });
    return { outcome: 'blocked', reason: routing.reason };
  }

  if (!req.provider) {
    return { outcome: 'blocked', reason: 'Sağlayıcı yapılandırılmamış.' };
  }

  const providerKey = req.provider.key;
  const circuitState = options.circuitState ?? getCircuitState(providerKey);
  const attemptCheck = canAttempt(circuitState, now.getTime());
  if (!attemptCheck.allowed) {
    setCircuitState(providerKey, attemptCheck.nextState);
    await logApiUsage({
      provider: providerKey,
      agentKey: req.agentKey,
      tier: req.tier,
      blocked: true,
      blockedReason: attemptCheck.reason,
    });
    return { outcome: 'circuit_open', reason: attemptCheck.reason };
  }
  setCircuitState(providerKey, attemptCheck.nextState);

  let attempt = 1;
  for (;;) {
    try {
      const result = await req.provider.complete(req.request);

      setCircuitState(providerKey, recordSuccess());
      if (req.cacheable !== false) {
        await setCachedOutput(req.taskKey, req.request, { text: result.text });
      }
      await logApiUsage({
        provider: providerKey,
        agentKey: req.agentKey,
        tier: req.tier,
        estimatedTokensIn: result.estimatedTokensIn,
        estimatedTokensOut: result.estimatedTokensOut,
        estimatedCostEur: req.estimatedCostEur,
        actualCostEur: req.estimatedCostEur,
      });
      await recordAgentRun({
        agentKey: req.agentKey,
        entityType: req.entityType,
        entityId: req.entityId,
        provider: providerKey,
        modelCostEur: req.estimatedCostEur,
        outputSummary: { textLength: result.text.length },
      });
      return { outcome: 'success', text: result.text, reason: 'Başarılı.' };
    } catch (error) {
      const status = error instanceof ProviderHttpError ? error.status : null;
      const retryDecision = decideRetry(attempt, status, DEFAULT_RETRY_CONFIG);

      if (!retryDecision.shouldRetry) {
        setCircuitState(providerKey, recordFailure(getCircuitState(providerKey), now.getTime()));
        const message = error instanceof Error ? error.message : String(error);
        await logApiUsage({
          provider: providerKey,
          agentKey: req.agentKey,
          tier: req.tier,
          blocked: true,
          blockedReason: message,
        });
        await recordAgentRun({
          agentKey: req.agentKey,
          entityType: req.entityType,
          entityId: req.entityId,
          status: 'failed',
          errorMessage: message,
        });
        return { outcome: 'failed', reason: message };
      }

      await sleep(retryDecision.delayMs);
      attempt = retryDecision.attemptNumber;
    }
  }
}

/** Test-only escape hatch: production code never needs to reset provider circuit state. */
export function __resetCircuitStatesForTests(): void {
  circuitStatesByProvider.clear();
}
