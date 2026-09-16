'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/db/client';
import { companyProfile, users, themeConfigs, budgetPolicies, crewMembers, agentConfig, priceBookItems } from '@/db/schema';
import { hashPassword, validatePasswordStrength } from '@/lib/auth/password';
import { getSession } from '@/lib/auth/session';
import { AGENT_DEFINITIONS } from '@/lib/agents/definitions';
import { hasAnyUser } from '@/lib/server/repo';

const setupSchema = z.object({
  companyName: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  kvkNumber: z.string().optional(),
  vatNumber: z.string().optional(),
  address: z.string().optional(),
  baseCity: z.string().min(1),
  province: z.string().min(1),
  serviceRadiusKm: z.coerce.number().int().positive(),
  enabledServiceCategories: z.array(z.string()).min(1),
  targetMarginPercent: z.coerce.number().min(0).max(95),
  minimumTargetGrossProfit: z.coerce.number().min(0),
  minimumJobCharge: z.coerce.number().min(0),
  vatRatePercent: z.coerce.number().min(0),
  aiMonthlyBudgetEur: z.coerce.number().min(0),
  aiDailyBudgetEur: z.coerce.number().min(0),
  activeTheme: z.enum(['ay-yildiz-dark-red', 'classic-premium-dark', 'neutral-business-light']),
  ownerDisplayName: z.string().min(1),
  ownerPassword: z.string(),
  ownerHourlyCost: z.coerce.number().min(0),
});

export interface SetupState {
  error?: string;
}

export async function completeSetupAction(
  _prevState: SetupState,
  formData: FormData,
): Promise<SetupState> {
  if (await hasAnyUser()) {
    redirect('/dashboard');
  }

  const raw = Object.fromEntries(formData.entries());
  const enabledServiceCategories = formData.getAll('enabledServiceCategories').map(String);

  const parsed = setupSchema.safeParse({ ...raw, enabledServiceCategories });
  if (!parsed.success) {
    return { error: 'Formda eksik veya geçersiz alan var: ' + parsed.error.issues[0]?.message };
  }
  const data = parsed.data;

  const passwordCheck = validatePasswordStrength(data.ownerPassword);
  if (!passwordCheck.valid) {
    return { error: passwordCheck.reasons.join(' ') };
  }

  const passwordHash = await hashPassword(data.ownerPassword);

  await db.transaction((tx) => {
    tx.insert(companyProfile)
      .values({
        companyName: data.companyName,
        phone: data.phone || null,
        email: data.email || null,
        website: data.website || null,
        kvkNumber: data.kvkNumber || null,
        vatNumber: data.vatNumber || null,
        address: data.address || null,
        baseCity: data.baseCity,
        province: data.province,
        serviceRadiusKm: data.serviceRadiusKm,
        enabledServiceCategories: data.enabledServiceCategories,
        ownerLanguage: 'tr',
        customerLanguage: 'nl',
        vatRatePercent: data.vatRatePercent,
        defaultTargetMarginRate: data.targetMarginPercent / 100,
        defaultMinimumTargetGrossProfit: data.minimumTargetGrossProfit,
        defaultMinimumJobCharge: data.minimumJobCharge,
        approvalMode: 'smart_approval',
        setupCompleted: true,
      })
      .run();

    tx.insert(users)
      .values({ displayName: data.ownerDisplayName, passwordHash, idleTimeoutMinutes: 30 })
      .run();

    tx.insert(themeConfigs)
      .values({ activeTheme: data.activeTheme, customerDemoMode: false })
      .run();

    tx.insert(budgetPolicies)
      .values({
        scope: 'global',
        monthlyCapEur: data.aiMonthlyBudgetEur,
        dailyCapEur: data.aiDailyBudgetEur,
      })
      .run();

    tx.insert(crewMembers)
      .values({ name: data.ownerDisplayName, kind: 'owner', hourlyCost: data.ownerHourlyCost })
      .run();

    for (const agent of AGENT_DEFINITIONS) {
      tx.insert(agentConfig)
        .values({
          agentKey: agent.key,
          displayName: agent.displayName,
          costTier: agent.costTier,
          enabled: true,
          notes: agent.buildNote,
        })
        .run();
    }

    tx.insert(priceBookItems)
      .values([
        {
          category: 'bestrating',
          nameNl: 'Bestrating verwijderen',
          unit: 'm2',
          baseCost: 0,
          minQuantity: 1,
          confidence: 'low',
          needsOwnerVerification: true,
          notes: 'NEEDS_OWNER_VERIFICATION — demo placeholder, gerçek fiyat girilmeli.',
        },
        {
          category: 'terras',
          nameNl: 'Keramische tegel leggen',
          unit: 'm2',
          baseCost: 0,
          minQuantity: 1,
          confidence: 'low',
          needsOwnerVerification: true,
          notes: 'NEEDS_OWNER_VERIFICATION — demo placeholder, gerçek fiyat girilmeli.',
        },
        {
          category: 'afvoer',
          nameNl: 'Puin afvoer',
          unit: 'm3',
          baseCost: 0,
          minQuantity: 1,
          confidence: 'low',
          needsOwnerVerification: true,
          notes: 'NEEDS_OWNER_VERIFICATION — demo placeholder, gerçek fiyat girilmeli.',
        },
      ])
      .run();
  });

  const session = await getSession();
  const [createdUser] = await db.select().from(users).limit(1);
  if (createdUser) {
    session.userId = createdUser.id;
    session.displayName = createdUser.displayName;
    session.loggedInAt = Date.now();
    session.lastSeenAt = Date.now();
    await session.save();
  }

  redirect('/dashboard');
}
