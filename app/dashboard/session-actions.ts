'use server';

import { getSession } from '@/lib/auth/session';

/** Runs as a real Server Action (cookie writes are allowed here) to keep the idle timeout fresh. */
export async function touchSessionAction(): Promise<void> {
  const session = await getSession();
  if (!session.userId) return;
  session.lastSeenAt = Date.now();
  await session.save();
}
