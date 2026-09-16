import { describe, it, expect } from 'vitest';
import { validateUpload, sanitizeOriginalFilename } from '@/lib/storage/upload-validation';

describe('upload validation (section 37)', () => {
  it('accepts a normal photo within size limits', () => {
    const result = validateUpload({
      originalFilename: 'tuin.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 2_000_000,
      maxSizeBytes: 15 * 1024 * 1024,
    });
    expect(result.valid).toBe(true);
    expect(result.safeStoredFilename).toMatch(/\.jpg$/);
  });

  it('rejects disallowed MIME types (never allows execution of uploads)', () => {
    const result = validateUpload({
      originalFilename: 'script.exe',
      mimeType: 'application/x-msdownload',
      sizeBytes: 1000,
      maxSizeBytes: 15 * 1024 * 1024,
    });
    expect(result.valid).toBe(false);
  });

  it('rejects files over the size limit', () => {
    const result = validateUpload({
      originalFilename: 'huge.png',
      mimeType: 'image/png',
      sizeBytes: 100 * 1024 * 1024,
      maxSizeBytes: 15 * 1024 * 1024,
    });
    expect(result.valid).toBe(false);
  });

  it('rejects path traversal attempts in the filename', () => {
    const result = validateUpload({
      originalFilename: '../../etc/passwd',
      mimeType: 'image/png',
      sizeBytes: 1000,
      maxSizeBytes: 15 * 1024 * 1024,
    });
    expect(result.valid).toBe(false);
  });

  it('sanitizes filenames to a safe character set', () => {
    expect(sanitizeOriginalFilename('../../weird name!@#.jpg')).not.toContain('/');
    expect(sanitizeOriginalFilename('foo bar.jpg')).toMatch(/^[a-zA-Z0-9._-]+$/);
  });

  it('never derives the stored filename from user input', () => {
    const result = validateUpload({
      originalFilename: 'hello.png',
      mimeType: 'image/png',
      sizeBytes: 100,
      maxSizeBytes: 1000,
    });
    expect(result.safeStoredFilename).not.toContain('hello');
  });
});
