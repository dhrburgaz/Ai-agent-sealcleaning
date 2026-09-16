/**
 * Section 37 — secure file upload: sanitize filenames, validate MIME, enforce size
 * limits, never execute uploads, prevent path traversal.
 */
import { randomUUID } from 'node:crypto';
import path from 'node:path';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
]);

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'application/pdf': '.pdf',
};

export interface UploadValidationInput {
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  maxSizeBytes: number;
}

export interface UploadValidationResult {
  valid: boolean;
  reasons: string[];
  /** Safe, random, extension-locked filename to store on disk. Never derived from user input. */
  safeStoredFilename?: string;
}

export function sanitizeOriginalFilename(name: string): string {
  const base = path.basename(name);
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
}

export function validateUpload(input: UploadValidationInput): UploadValidationResult {
  const reasons: string[] = [];

  if (!ALLOWED_MIME_TYPES.has(input.mimeType)) {
    reasons.push(`Desteklenmeyen dosya türü: ${input.mimeType}`);
  }
  if (input.sizeBytes <= 0) {
    reasons.push('Dosya boş.');
  }
  if (input.sizeBytes > input.maxSizeBytes) {
    reasons.push(`Dosya boyutu limiti aşıyor (${input.maxSizeBytes} bayt).`);
  }
  if (input.originalFilename.includes('..') || input.originalFilename.includes('/')) {
    reasons.push('Dosya adı geçersiz karakterler içeriyor.');
  }

  if (reasons.length > 0) {
    return { valid: false, reasons };
  }

  const extension = EXTENSION_BY_MIME[input.mimeType] ?? '';
  const safeStoredFilename = `${randomUUID()}${extension}`;

  return { valid: true, reasons: [], safeStoredFilename };
}
