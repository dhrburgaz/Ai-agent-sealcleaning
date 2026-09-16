import { cookies } from 'next/headers';
import { getIronSession, type IronSession, type SessionOptions } from 'iron-session';

export interface SessionData {
  userId?: string;
  displayName?: string;
  loggedInAt?: number;
  lastSeenAt?: number;
  csrfToken?: string;
}

function requireSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'SESSION_SECRET is missing or shorter than 32 characters. Set it in .env.local (see .env.example).',
    );
  }
  return secret;
}

export function sessionOptions(): SessionOptions {
  return {
    password: requireSecret(),
    cookieName: 'beyza_session',
    cookieOptions: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
    },
  };
}

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions());
}

/** Idle timeout is enforced against the configured user preference, checked on each request. */
export function isSessionExpired(session: SessionData, idleTimeoutMinutes: number): boolean {
  if (!session.lastSeenAt) return true;
  const elapsedMs = Date.now() - session.lastSeenAt;
  return elapsedMs > idleTimeoutMinutes * 60 * 1000;
}
