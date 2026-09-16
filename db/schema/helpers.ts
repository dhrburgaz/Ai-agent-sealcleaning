import { sql } from 'drizzle-orm';
import { text, integer } from 'drizzle-orm/sqlite-core';
import { nanoid } from 'nanoid';

/** Standard primary key: a nanoid-based text id, generated in application code. */
export function idColumn() {
  return text('id')
    .primaryKey()
    .$defaultFn(() => nanoid());
}

/** Unix-epoch-ms timestamp columns, defaulted to now on insert. */
export function timestamps() {
  return {
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch('subsec') * 1000)`),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch('subsec') * 1000)`),
  };
}

/** Fields shared by every "live/external" record per master spec section 24. */
export function provenanceColumns() {
  return {
    source: text('source'),
    sourceUrl: text('source_url'),
    fetchedAt: integer('fetched_at', { mode: 'timestamp_ms' }),
    confidence: text('confidence'),
    lastVerifiedAt: integer('last_verified_at', { mode: 'timestamp_ms' }),
    staleAfter: integer('stale_after', { mode: 'timestamp_ms' }),
    rawEvidenceRef: text('raw_evidence_ref'),
  };
}

export const boolInt = { mode: 'boolean' as const };
