'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { inventoryItems, auditLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/guard';

export async function createInventoryItemAction(formData: FormData): Promise<void> {
  const auth = await requireAuth();
  if (!auth.authenticated) throw new Error('Unauthorized');

  const label = String(formData.get('label') ?? '');
  const unit = String(formData.get('unit') ?? '');
  const quantityOnHand = Number(formData.get('quantityOnHand') ?? 0);
  const reorderThreshold = formData.get('reorderThreshold') ? Number(formData.get('reorderThreshold')) : null;
  const notes = String(formData.get('notes') ?? '') || null;

  const [item] = await db.insert(inventoryItems).values({ label, unit, quantityOnHand, reorderThreshold, notes }).returning();

  await db.insert(auditLogs).values({
    actor: auth.displayName ?? 'owner',
    action: 'inventory_item_created',
    entityType: 'inventory_item',
    entityId: item!.id,
    after: item as unknown as Record<string, unknown>,
  });

  revalidatePath('/dashboard/inventory');
}

export async function adjustInventoryQuantityAction(formData: FormData): Promise<void> {
  const auth = await requireAuth();
  if (!auth.authenticated) throw new Error('Unauthorized');

  const id = String(formData.get('id') ?? '');
  const delta = Number(formData.get('delta') ?? 0);

  const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id)).limit(1);
  if (!item) throw new Error('Inventory item not found');

  const newQuantity = Math.max(0, item.quantityOnHand + delta);
  await db.update(inventoryItems).set({ quantityOnHand: newQuantity, updatedAt: new Date() }).where(eq(inventoryItems.id, id));

  await db.insert(auditLogs).values({
    actor: auth.displayName ?? 'owner',
    action: 'inventory_quantity_adjusted',
    entityType: 'inventory_item',
    entityId: id,
    before: { quantityOnHand: item.quantityOnHand },
    after: { quantityOnHand: newQuantity },
  });

  revalidatePath('/dashboard/inventory');
}
