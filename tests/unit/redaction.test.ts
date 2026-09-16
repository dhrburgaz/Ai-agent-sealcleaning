import { describe, it, expect } from 'vitest';
import { redactSecrets, redactString } from '@/lib/audit/redaction';

describe('secret redaction (sections 37/44)', () => {
  it('redacts object keys that look like secrets, recursively', () => {
    const input = {
      provider: 'openai',
      apiKey: 'sk-verysecret1234567890',
      nested: { password: 'hunter2', ok: 'fine' },
    };
    const result = redactSecrets(input) as typeof input;
    expect(result.apiKey).toBe('[REDACTED]');
    expect(result.nested.password).toBe('[REDACTED]');
    expect(result.nested.ok).toBe('fine');
    expect(result.provider).toBe('openai');
  });

  it('redacts secrets embedded in free text log lines', () => {
    const line = 'Calling provider with password: hunter2 and token=abc123';
    const redacted = redactString(line);
    expect(redacted).not.toContain('hunter2');
    expect(redacted).not.toContain('abc123');
  });

  it('redacts OpenAI-style API keys embedded in strings', () => {
    const line = 'Using key sk-abcdefghijklmnopqrst for this call';
    expect(redactString(line)).not.toContain('sk-abcdefghijklmnopqrst');
  });
});
