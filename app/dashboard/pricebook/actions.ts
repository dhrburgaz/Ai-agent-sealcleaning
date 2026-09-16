'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { priceBookItems, auditLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/guard';

export async function createPriceBookItemAction(formData: FormData): Promise<void> {
  const auth = await requireAuth();
  if (!auth.authenticated) throw new Error('Unauthorized');

  const category = String(formData.get('category') ?? '');
  const nameNl = String(formData.get('nameNl') ?? '');
  const unit = String(formData.get('unit') ?? '');
  const baseCost = Number(formData.get('baseCost') ?? 0);
  const source = String(formData.get('source') ?? '') || null;

  const [created] = await db
    .insert(priceBookItems)
    .values({
      category,
      nameNl,
      unit,
      baseCost,
      source,
      confidence: source ? 'medium' : 'low',
      needsOwnerVerification: !source,
    })
    .returning();

  await db.insert(auditLogs).values({
    actor: auth.displayName ?? 'owner',
    action: 'pricebook_item_created',
    entityType: 'price_book_item',
    entityId: created!.id,
    after: created as unknown as Record<string, unknown>,
  });

  revalidatePath('/dashboard/pricebook');
}

export async function verifyPriceBookItemAction(formData: FormData): Promise<void> {
  const auth = await requireAuth();
  if (!auth.authenticated) throw new Error('Unauthorized');

  const id = String(formData.get('id') ?? '');
  const baseCost = Number(formData.get('baseCost') ?? 0);

  const [before] = await db.select().from(priceBookItems).where(eq(priceBookItems.id, id)).limit(1);

  await db
    .update(priceBookItems)
    .set({
      baseCost,
      needsOwnerVerification: false,
      confidence: 'high',
      verifiedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(priceBookItems.id, id));

  await db.insert(auditLogs).values({
    actor: auth.displayName ?? 'owner',
    action: 'pricebook_item_verified',
    entityType: 'price_book_item',
    entityId: id,
    before: before as unknown as Record<string, unknown>,
  });

  revalidatePath('/dashboard/pricebook');
}

export async function deactivatePriceBookItemAction(formData: FormData): Promise<void> {
  const auth = await requireAuth();
  if (!auth.authenticated) throw new Error('Unauthorized');
  const id = String(formData.get('id') ?? '');
  await db.update(priceBookItems).set({ active: false, updatedAt: new Date() }).where(eq(priceBookItems.id, id));
  revalidatePath('/dashboard/pricebook');
}
