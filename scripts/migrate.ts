import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db, sqlite } from '../db/client';

migrate(db, { migrationsFolder: './db/migrations' });
console.log('Migrations applied.');
sqlite.close();
