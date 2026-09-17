/**
 * Section 14/50 — prompt/output cache. Cache key is a hash of {taskKey, input},
 * so identical work (same lead facts, same question) never triggers a second
 * paid call. Backed by the `prompt_cache` table already in the schema.
 */
import crypto from 'node:crypto';
import { eq, and, gt, isNull, or } from 'drizzle-orm';
import { db } from '@/db/client';
import { promptCache } from '@/db/schema';

export function hashCacheInput(input: unknown): string {
  const stable = JSON.stringify(input, Object.keys(input as Record<string, unknown>).sort());
  return crypto.createHash('sha256').update(stable).digest('hex');
}

export async function getCachedOutput(
  taskKey: string,
  input: unknown,
  now: Date = new Date(),
): Promise<Record<string, unknown> | null> {
  const inputHash = hashCacheInput(input);
  const [row] = await db
    .select()
    .from(promptCache)
    .where(
      and(
        eq(promptCache.taskKey, taskKey),
        eq(promptCache.inputHash, inputHash),
        or(isNull(promptCache.expiresAt), gt(promptCache.expiresAt, now)),
      ),
    )
    .limit(1);
  return row?.output ?? null;
}

export async function setCachedOutput(
  taskKey: string,
  input: unknown,
  output: Record<string, unknown>,
  ttlMs: number = 24 * 60 * 60 * 1000,
): Promise<void> {
  const inputHash = hashCacheInput(input);
  await db.insert(promptCache).values({
    taskKey,
    inputHash,
    output,
    expiresAt: new Date(Date.now() + ttlMs),
  });
}
