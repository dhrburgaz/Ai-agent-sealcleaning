import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import * as schema from './schema';

const DATABASE_PATH = process.env.DATABASE_PATH ?? './storage/beyza.db';

function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __beyzaSqlite: Database.Database | undefined;
}

function createConnection(): Database.Database {
  ensureDir(DATABASE_PATH);
  const sqlite = new Database(DATABASE_PATH);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  return sqlite;
}

// Reuse a single connection across Next.js hot reloads / server module reuse.
const sqlite = globalThis.__beyzaSqlite ?? createConnection();
if (process.env.NODE_ENV !== 'production') {
  globalThis.__beyzaSqlite = sqlite;
}

export const db = drizzle(sqlite, { schema });
export type DbClient = typeof db;
export { sqlite };
