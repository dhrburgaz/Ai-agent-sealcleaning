import { randomBytes, timingSafeEqual } from 'node:crypto';
import { getSession } from './session';

export async function ensureCsrfToken(): Promise<string> {
  const session = await getSession();
  if (!session.csrfToken) {
    session.csrfToken = randomBytes(32).toString('hex');
    await session.save();
  }
  return session.csrfToken;
}

export async function verifyCsrfToken(candidate: string | null | undefined): Promise<boolean> {
  const session = await getSession();
  if (!session.csrfToken || !candidate) return false;
  const expected = Buffer.from(session.csrfToken);
  const actual = Buffer.from(candidate);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
