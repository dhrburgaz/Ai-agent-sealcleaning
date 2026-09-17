/**
 * Section 15 — circuit breaker for AI provider calls. Pure state machine, no
 * timers: the caller passes "now" so it's fully deterministic and testable.
 * After `failureThreshold` consecutive failures the circuit opens for
 * `cooldownMs`; a single trial call is allowed through in the half-open state
 * to test recovery without a full flood of retries.
 */

export type CircuitState = 'closed' | 'open' | 'half_open';

export interface CircuitBreakerState {
  state: CircuitState;
  consecutiveFailures: number;
  openedAt: number | null;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  cooldownMs: number;
}

export const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 3,
  cooldownMs: 60_000,
};

export function initialCircuitState(): CircuitBreakerState {
  return { state: 'closed', consecutiveFailures: 0, openedAt: null };
}

/** Call before attempting a provider request. */
export function canAttempt(
  state: CircuitBreakerState,
  now: number,
  config: CircuitBreakerConfig = DEFAULT_CIRCUIT_CONFIG,
): { allowed: boolean; nextState: CircuitBreakerState; reason: string } {
  if (state.state === 'closed') {
    return { allowed: true, nextState: state, reason: 'Devre kapalı, çağrıya izin verildi.' };
  }
  if (state.state === 'open') {
    if (state.openedAt !== null && now - state.openedAt >= config.cooldownMs) {
      return {
        allowed: true,
        nextState: { ...state, state: 'half_open' },
        reason: 'Soğuma süresi doldu, deneme çağrısına izin verildi (half-open).',
      };
    }
    return { allowed: false, nextState: state, reason: 'Devre açık: sağlayıcı art arda başarısız oldu.' };
  }
  // half_open: only one trial in flight at a time; this function itself doesn't
  // mutate concurrency, the caller is expected to have already transitioned in.
  return { allowed: true, nextState: state, reason: 'Deneme çağrısı devam ediyor (half-open).' };
}

export function recordSuccess(): CircuitBreakerState {
  return { state: 'closed', consecutiveFailures: 0, openedAt: null };
}

export function recordFailure(
  state: CircuitBreakerState,
  now: number,
  config: CircuitBreakerConfig = DEFAULT_CIRCUIT_CONFIG,
): CircuitBreakerState {
  if (state.state === 'half_open') {
    // Recovery attempt failed — back to fully open for another full cooldown.
    return { state: 'open', consecutiveFailures: state.consecutiveFailures + 1, openedAt: now };
  }
  const consecutiveFailures = state.consecutiveFailures + 1;
  if (consecutiveFailures >= config.failureThreshold) {
    return { state: 'open', consecutiveFailures, openedAt: now };
  }
  return { state: 'closed', consecutiveFailures, openedAt: null };
}
