/**
 * Section 55 — restore with confirmation. Usage: `npm run restore -- <backup-file>`.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import readline from 'node:readline';

const archivePath = process.argv[2];

async function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'evet');
    });
  });
}

async function main() {
  if (!archivePath) {
    console.error('Kullanım: npm run restore -- <backup-dosyasi.tar.gz>');
    process.exit(1);
  }
  if (!fs.existsSync(archivePath)) {
    console.error(`Dosya bulunamadı: ${archivePath}`);
    process.exit(1);
  }

  const confirmed = await confirm(
    `UYARI: Bu işlem mevcut veritabanını ve dosyaları "${archivePath}" içeriğiyle değiştirecek. Devam etmek için "evet" yazın: `,
  );
  if (!confirmed) {
    console.log('İptal edildi.');
    return;
  }

  execFileSync('tar', ['-xzf', archivePath, '-C', '.']);
  console.log('Geri yükleme tamamlandı.');
}

main();
