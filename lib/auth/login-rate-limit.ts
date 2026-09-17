/**
 * Phase 10 hardening — brute-force protection on the single owner login.
 * In-process, in-memory, deterministic: no external service, no paid
 * dependency. Single-instance-only by design (this app runs as one process
 * on one machine per the master spec's self-hosted, single-owner model —
 * see CLAUDE.md); a multi-instance deployment would need a shared store
 * instead, which is out of scope here.
 */

const MAX_ATTEMPTS_BEFORE_LOCK = 5;
const BASE_LOCK_MS = 30_000; // 30s, doubling per additional failure past the threshold
const MAX_LOCK_MS = 15 * 60_000; // cap at 15 minutes

interface AttemptRecord {
  failures: number;
  lockedUntil: number | null;
}

const attemptsByKey = new Map<string, AttemptRecord>();

export interface RateLimitCheck {
  allowed: boolean;
  retryAfterMs?: number;
}

export function checkLoginRateLimit(key: string, now: number = Date.now()): RateLimitCheck {
  const record = attemptsByKey.get(key);
  if (!record || !record.lockedUntil) return { allowed: true };
  if (now >= record.lockedUntil) return { allowed: true };
  return { allowed: false, retryAfterMs: record.lockedUntil - now };
}

export function recordLoginFailure(key: string, now: number = Date.now()): void {
  const record = attemptsByKey.get(key) ?? { failures: 0, lockedUntil: null };
  record.failures += 1;
  if (record.failures >= MAX_ATTEMPTS_BEFORE_LOCK) {
    const extraFailures = record.failures - MAX_ATTEMPTS_BEFORE_LOCK;
    const lockMs = Math.min(BASE_LOCK_MS * 2 ** extraFailures, MAX_LOCK_MS);
    record.lockedUntil = now + lockMs;
  }
  attemptsByKey.set(key, record);
}

export function recordLoginSuccess(key: string): void {
  attemptsByKey.delete(key);
}

/** Test-only reset so unit tests don't leak state between cases. */
export function resetLoginRateLimit(): void {
  attemptsByKey.clear();
}
