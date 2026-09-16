'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { companyProfile, budgetPolicies } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/guard';
import { getCompanyProfile, getOrCreateBudgetPolicy } from '@/lib/server/repo';
import { changeApprovalMode, type ApprovalMode } from '@/lib/messaging/approval';

export async function updateCompanySettingsAction(formData: FormData): Promise<void> {
  const auth = await requireAuth();
  if (!auth.authenticated) throw new Error('Unauthorized');

  const company = await getCompanyProfile();
  if (!company) throw new Error('Company profile missing');

  const targetMarginPercent = Number(formData.get('targetMarginPercent') ?? 30);
  const minimumTargetGrossProfit = Number(formData.get('minimumTargetGrossProfit') ?? 1200);
  const minimumJobCharge = Number(formData.get('minimumJobCharge') ?? 150);
  const vatRatePercent = Number(formData.get('vatRatePercent') ?? 21);
  const requestedApprovalMode = String(formData.get('approvalMode') ?? 'smart_approval') as ApprovalMode;

  const modeCheck = changeApprovalMode({ requestedMode: requestedApprovalMode, ownerInitiated: true });
  if (!modeCheck.allowed) {
    throw new Error(modeCheck.reason);
  }

  await db
    .update(companyProfile)
    .set({
      defaultTargetMarginRate: targetMarginPercent / 100,
      defaultMinimumTargetGrossProfit: minimumTargetGrossProfit,
      defaultMinimumJobCharge: minimumJobCharge,
      vatRatePercent,
      approvalMode: requestedApprovalMode,
      updatedAt: new Date(),
    })
    .where(eq(companyProfile.id, company.id));

  revalidatePath('/dashboard/settings');
}

export async function updateBudgetAction(formData: FormData): Promise<void> {
  const auth = await requireAuth();
  if (!auth.authenticated) throw new Error('Unauthorized');

  const monthlyCapEur = Number(formData.get('monthlyCapEur') ?? 0);
  const dailyCapEur = Number(formData.get('dailyCapEur') ?? 0);

  const budget = await getOrCreateBudgetPolicy();
  await db
    .update(budgetPolicies)
    .set({ monthlyCapEur, dailyCapEur, updatedAt: new Date() })
    .where(eq(budgetPolicies.id, budget.id));

  revalidatePath('/dashboard/settings');
}
