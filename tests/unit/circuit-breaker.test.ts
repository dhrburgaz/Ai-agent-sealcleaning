import { describe, it, expect } from 'vitest';
import { initialCircuitState, canAttempt, recordSuccess, recordFailure } from '@/lib/ai/circuit-breaker';

const CONFIG = { failureThreshold: 3, cooldownMs: 60_000 };

describe('AI provider circuit breaker', () => {
  it('starts closed and allows calls', () => {
    const state = initialCircuitState();
    expect(canAttempt(state, 0, CONFIG).allowed).toBe(true);
  });

  it('opens after reaching the failure threshold', () => {
    let state = initialCircuitState();
    state = recordFailure(state, 1000, CONFIG);
    state = recordFailure(state, 1001, CONFIG);
    expect(state.state).toBe('closed');
    state = recordFailure(state, 1002, CONFIG);
    expect(state.state).toBe('open');
  });

  it('blocks calls while open and within the cooldown window', () => {
    let state = initialCircuitState();
    state = recordFailure(state, 0, CONFIG);
    state = recordFailure(state, 0, CONFIG);
    state = recordFailure(state, 0, CONFIG);
    expect(canAttempt(state, 10_000, CONFIG).allowed).toBe(false);
  });

  it('allows a single half-open trial once the cooldown has elapsed', () => {
    let state = initialCircuitState();
    state = recordFailure(state, 0, CONFIG);
    state = recordFailure(state, 0, CONFIG);
    state = recordFailure(state, 0, CONFIG);
    const decision = canAttempt(state, 60_001, CONFIG);
    expect(decision.allowed).toBe(true);
    expect(decision.nextState.state).toBe('half_open');
  });

  it('recovers to closed on a successful half-open trial', () => {
    let state = initialCircuitState();
    state = recordFailure(state, 0, CONFIG);
    state = recordFailure(state, 0, CONFIG);
    state = recordFailure(state, 0, CONFIG);
    canAttempt(state, 60_001, CONFIG);
    const recovered = recordSuccess();
    expect(recovered.state).toBe('closed');
    expect(recovered.consecutiveFailures).toBe(0);
  });

  it('re-opens for a fresh cooldown if the half-open trial also fails', () => {
    let state = initialCircuitState();
    state = recordFailure(state, 0, CONFIG);
    state = recordFailure(state, 0, CONFIG);
    state = recordFailure(state, 0, CONFIG);
    const { nextState } = canAttempt(state, 60_001, CONFIG);
    const stillFailing = recordFailure(nextState, 60_001, CONFIG);
    expect(stillFailing.state).toBe('open');
    expect(canAttempt(stillFailing, 60_002, CONFIG).allowed).toBe(false);
  });
});
