import { db } from '@/db/client';
import { companyProfile, themeConfigs, budgetPolicies, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function getCompanyProfile() {
  const [profile] = await db.select().from(companyProfile).limit(1);
  return profile ?? null;
}

export async function getThemeConfig() {
  const [theme] = await db.select().from(themeConfigs).limit(1);
  return theme ?? null;
}

export async function getOrCreateThemeConfig() {
  const existing = await getThemeConfig();
  if (existing) return existing;
  const [created] = await db
    .insert(themeConfigs)
    .values({ activeTheme: 'ay-yildiz-dark-red', customerDemoMode: false })
    .returning();
  if (!created) throw new Error('Failed to create theme config.');
  return created;
}

export async function getOrCreateBudgetPolicy() {
  const [existing] = await db.select().from(budgetPolicies).where(eq(budgetPolicies.scope, 'global')).limit(1);
  if (existing) return existing;
  const [created] = await db
    .insert(budgetPolicies)
    .values({ scope: 'global', monthlyCapEur: 0, dailyCapEur: 0 })
    .returning();
  if (!created) throw new Error('Failed to create budget policy.');
  return created;
}

export async function isSetupCompleted(): Promise<boolean> {
  const profile = await getCompanyProfile();
  return Boolean(profile?.setupCompleted);
}

export async function hasAnyUser(): Promise<boolean> {
  const [row] = await db.select({ id: users.id }).from(users).limit(1);
  return Boolean(row);
}
