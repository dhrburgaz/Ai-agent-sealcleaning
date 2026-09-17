import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkLoginRateLimit,
  recordLoginFailure,
  recordLoginSuccess,
  resetLoginRateLimit,
} from '@/lib/auth/login-rate-limit';

describe('login rate limiting (hardening)', () => {
  beforeEach(() => resetLoginRateLimit());

  it('allows attempts before the failure threshold', () => {
    const key = '1.2.3.4';
    for (let i = 0; i < 4; i++) recordLoginFailure(key);
    expect(checkLoginRateLimit(key).allowed).toBe(true);
  });

  it('locks out after reaching the failure threshold', () => {
    const key = '1.2.3.4';
    for (let i = 0; i < 5; i++) recordLoginFailure(key);
    const result = checkLoginRateLimit(key);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it('unlocks after the retry window passes', () => {
    const key = '1.2.3.4';
    const now = Date.now();
    for (let i = 0; i < 5; i++) recordLoginFailure(key, now);
    expect(checkLoginRateLimit(key, now + 1000).allowed).toBe(false);
    expect(checkLoginRateLimit(key, now + 60_000).allowed).toBe(true);
  });

  it('clears the failure count on a successful login', () => {
    const key = '1.2.3.4';
    for (let i = 0; i < 5; i++) recordLoginFailure(key);
    recordLoginSuccess(key);
    expect(checkLoginRateLimit(key).allowed).toBe(true);
  });

  it('tracks separate keys independently', () => {
    for (let i = 0; i < 5; i++) recordLoginFailure('1.1.1.1');
    expect(checkLoginRateLimit('1.1.1.1').allowed).toBe(false);
    expect(checkLoginRateLimit('2.2.2.2').allowed).toBe(true);
  });
});
