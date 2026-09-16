'use server';

import { redirect } from 'next/navigation';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { verifyPassword } from '@/lib/auth/password';
import { getSession } from '@/lib/auth/session';

export interface LoginState {
  error?: string;
}

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const password = String(formData.get('password') ?? '');
  const [user] = await db.select().from(users).limit(1);

  if (!user) {
    return { error: 'Henüz bir hesap oluşturulmamış. Kuruluma yönlendiriliyorsunuz.' };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { error: 'Şifre hatalı.' };
  }

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
