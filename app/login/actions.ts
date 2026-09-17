'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { verifyPassword } from '@/lib/auth/password';
import { getSession } from '@/lib/auth/session';
import { checkLoginRateLimit, recordLoginFailure, recordLoginSuccess } from '@/lib/auth/login-rate-limit';

export interface LoginState {
  error?: string;
}

async function rateLimitKey(): Promise<string> {
  const headerList = await headers();
  return headerList.get('x-forwarded-for') ?? headerList.get('x-real-ip') ?? 'unknown';
}

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const key = await rateLimitKey();
  const rateLimit = checkLoginRateLimit(key);
  if (!rateLimit.allowed) {
    const seconds = Math.ceil((rateLimit.retryAfterMs ?? 0) / 1000);
    return { error: `Çok fazla hatalı deneme. ${seconds} saniye sonra tekrar deneyin.` };
  }

  const password = String(formData.get('password') ?? '');
  const [user] = await db.select().from(users).limit(1);

  if (!user) {
    return { error: 'Henüz bir hesap oluşturulmamış. Kuruluma yönlendiriliyorsunuz.' };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    recordLoginFailure(key);
    return { error: 'Şifre hatalı.' };
  }
  recordLoginSuccess(key);

  const session = await getSession();
  session.userId = user.id;
  session.displayName = user.displayName;
  session.loggedInAt = Date.now();
  session.lastSeenAt = Date.now();
  await session.save();

  redirect('/dashboard');
}

export async function logoutAction(): Promise<void> {
  const session = await getSession();
  session.destroy();
  redirect('/login');
}
