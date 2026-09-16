import { db } from '@/db/client';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSession, isSessionExpired } from './session';

export interface AuthResult {
  authenticated: boolean;
  userId?: string;
  displayName?: string;
  reason?: 'no_session' | 'idle_timeout' | 'user_not_found';
}

/**
 * Validates the current session, including the configurable idle timeout (section 36).
 *
 * Read-only by design: Next.js only allows cookie writes from a Server Action or
 * Route Handler, never from a Server Component render (layouts/pages). This is
 * called from both, so it never mutates the session itself — `touchSessionAction`
 * (a real Server Action, see components/dashboard/SessionHeartbeat.tsx) is what
 * keeps `lastSeenAt` fresh, and `logoutAction` is what actually clears the cookie.
 */
export async function requireAuth(): Promise<AuthResult> {
  const session = await getSession();
  if (!session.userId) {
    return { authenticated: false, reason: 'no_session' };
  }

  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  if (!user) {
    return { authenticated: false, reason: 'user_not_found' };
  }

  if (isSessionExpired(session, user.idleTimeoutMinutes)) {
    return { authenticated: false, reason: 'idle_timeout' };
  }

  return { authenticated: true, userId: user.id, displayName: user.displayName };
}
