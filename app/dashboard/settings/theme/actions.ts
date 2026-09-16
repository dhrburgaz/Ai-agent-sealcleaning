'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { themeConfigs } from '@/db/schema';
import { requireAuth } from '@/lib/auth/guard';
import { getOrCreateThemeConfig } from '@/lib/server/repo';
import { eq } from 'drizzle-orm';
import { isValidTheme } from '@/lib/theme/constants';

export async function updateThemeAction(formData: FormData): Promise<void> {
  const auth = await requireAuth();
  if (!auth.authenticated) throw new Error('Unauthorized');

  const activeTheme = String(formData.get('activeTheme') ?? '');
  if (!isValidTheme(activeTheme)) throw new Error('Geçersiz tema.');
  const customerDemoMode = formData.get('customerDemoMode') === 'on';

  const current = await getOrCreateThemeConfig();
  await db
    .update(themeConfigs)
    .set({ activeTheme, customerDemoMode, updatedAt: new Date() })
    .where(eq(themeConfigs.id, current.id));

  revalidatePath('/', 'layout');
}
