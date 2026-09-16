/**
 * Section 6.4 — Customer Demo Mode. Hides API keys, internal labour costs, profit
 * margins, sensitive notes, and developer logs from anything rendered while a
 * customer/partner is looking at the screen.
 */

const SENSITIVE_FIELD_PATTERN =
  /(apikey|api_key|secret|token|labourcost|labour_cost|hourlycost|hourly_cost|margin|profit|internalnote|internal_note|devlog|dev_log)/i;

export function maskSensitiveFields<T extends Record<string, unknown>>(
  data: T,
  demoModeEnabled: boolean,
): T {
  if (!demoModeEnabled) return data;

  const result = { ...data } as Record<string, unknown>;
  for (const key of Object.keys(result)) {
    if (SENSITIVE_FIELD_PATTERN.test(key)) {
      result[key] = null;
    }
  }
  return result as T;
}

export function isFieldHiddenInDemoMode(fieldName: string): boolean {
  return SENSITIVE_FIELD_PATTERN.test(fieldName);
}
