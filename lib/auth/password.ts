import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 10;

export interface PasswordValidationResult {
  valid: boolean;
  reasons: string[];
}

/** Basic strength floor for the single owner password created on first run (section 36). */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  const reasons: string[] = [];
  if (password.length < MIN_PASSWORD_LENGTH) {
    reasons.push(`En az ${MIN_PASSWORD_LENGTH} karakter olmalı.`);
  }
  if (!/[0-9]/.test(password)) {
    reasons.push('En az bir rakam içermeli.');
  }
  if (!/[a-zA-Z]/.test(password)) {
    reasons.push('En az bir harf içermeli.');
  }
  return { valid: reasons.length === 0, reasons };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
