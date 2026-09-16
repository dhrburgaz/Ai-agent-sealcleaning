/**
 * Section 55 — backup DB + settings + documents into a single timestamped archive.
 * No secrets are included (`.env*` is excluded); document that .env must be backed
 * up separately and encrypted if the owner wants full disaster recovery.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const STORAGE_DIR = process.env.STORAGE_DIR ?? './storage';
const BACKUP_DIR = path.join(STORAGE_DIR, 'backups');

function main() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archivePath = path.join(BACKUP_DIR, `beyza-backup-${timestamp}.tar.gz`);

  const dbPath = process.env.DATABASE_PATH ?? './storage/beyza.db';
  const includePaths = [dbPath, path.join(STORAGE_DIR, 'uploads'), path.join(STORAGE_DIR, 'quotes')].filter(
    (p) => fs.existsSync(p),
  );

  if (includePaths.length === 0) {
    console.error('Nothing to back up yet — no database or storage files found.');
    process.exit(1);
  }

  execFileSync('tar', ['-czf', archivePath, ...includePaths]);
  console.log(`Backup created: ${archivePath}`);
  console.log('Note: .env / .env.local (secrets) are intentionally excluded. Back those up separately, encrypted.');
}

main();
