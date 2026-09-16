/**
 * Section 37 / 44 — never let secrets reach logs or the audit trail.
 */

const SECRET_KEY_PATTERN = /(key|secret|token|password|pwd|credential|authorization)/i;
const REDACTED = '[REDACTED]';

export function redactSecrets<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map((item) => redactSecrets(item)) as unknown as T;
  }
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      result[key] = SECRET_KEY_PATTERN.test(key) ? REDACTED : redactSecrets(v);
    }
    return result as T;
  }
  return value;
}

export function redactString(text: string): string {
  return text
    .replace(/sk-[A-Za-z0-9]{10,}/g, REDACTED)
    .replace(/(password|secret|token)\s*[:=]\s*\S+/gi, `$1: ${REDACTED}`);
}
