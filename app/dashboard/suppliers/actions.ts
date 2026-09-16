'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { suppliers, supplierProducts, supplierPriceObservations } from '@/db/schema';
import { requireAuth } from '@/lib/auth/guard';

export async function addSupplierObservationAction(formData: FormData): Promise<void> {
  const auth = await requireAuth();
  if (!auth.authenticated) throw new Error('Unauthorized');

  const supplierName = String(formData.get('supplierName') ?? '');
  const material = String(formData.get('material') ?? '');
  const unit = String(formData.get('unit') ?? '');
  const unitPrice = Number(formData.get('unitPrice') ?? 0);
  const sourceUrl = String(formData.get('sourceUrl') ?? '') || null;
  const discountLabel = String(formData.get('discountLabel') ?? '') || null;
  const discountEvidenceUrl = String(formData.get('discountEvidenceUrl') ?? '') || null;

  const [supplier] = await db.insert(suppliers).values({ name: supplierName, category: material }).returning();
  const [product] = await db
    .insert(supplierProducts)
    .values({ supplierId: supplier!.id, material, unit })
    .returning();

  await db.insert(supplierPriceObservations).values({
    supplierProductId: product!.id,
    unitPrice,
    vatIncluded: false,
    source: sourceUrl ? 'owner_pasted_url' : 'manual_verification',
    sourceUrl,
    discountLabel,
    discountEvidenceUrl,
    mode: sourceUrl ? 'owner_pasted_url' : 'manual_verification',
    verificationConfidence: sourceUrl ? 'medium' : 'unverified',
    observedAt: new Date(),
    staleAfter: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  });

  revalidatePath('/dashboard/suppliers');
}
