/**
 * Section 15 — retry/backoff calculator. Pure function (no actual sleeping
 * here — the caller awaits `delayMs`), and it deliberately never retries a
 * client error (4xx): those are wrong requests, not transient failures, and
 * retrying them just wastes budget-relevant call attempts. Prevents "retry
 * storms" per section 14, rule #17.
 */

export interface RetryDecision {
  shouldRetry: boolean;
  delayMs: number;
  attemptNumber: number;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 8000,
};

/**
 * `errorStatus` is the HTTP status of the failure, or `null` for a network-level
 * error (which is treated as transient/retryable, like a 5xx).
 */
export function decideRetry(
  attemptNumber: number,
  errorStatus: number | null,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
): RetryDecision {
  const isClientError = errorStatus !== null && errorStatus >= 400 && errorStatus < 500;
  if (isClientError) {
    return { shouldRetry: false, delayMs: 0, attemptNumber };
  }
  if (attemptNumber >= config.maxAttempts) {
    return { shouldRetry: false, delayMs: 0, attemptNumber };
  }
  const exponential = config.baseDelayMs * 2 ** (attemptNumber - 1);
  const delayMs = Math.min(exponential, config.maxDelayMs);
  return { shouldRetry: true, delayMs, attemptNumber: attemptNumber + 1 };
}
