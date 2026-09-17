'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { suppliers, supplierProducts, supplierPriceObservations } from '@/db/schema';
import { requireAuth } from '@/lib/auth/guard';
import { fetchSupplierPriceFromUrl } from '@/lib/suppliers/url-price-fetcher';
import { recordAgentRun } from '@/lib/orchestration';

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

/**
 * Section 10/13 "owner_pasted_url" mode — a real, zero-cost HTTP fetch plus
 * heuristic extraction (no paid API, no headless browser). Always stored with
 * an honest low/medium confidence and never auto-trusted as a verified price.
 */
export async function fetchAndAddSupplierObservationAction(formData: FormData): Promise<void> {
  const auth = await requireAuth();
  if (!auth.authenticated) throw new Error('Unauthorized');

  const supplierName = String(formData.get('supplierName') ?? '');
  const material = String(formData.get('material') ?? '');
  const unit = String(formData.get('unit') ?? '');
  const sourceUrl = String(formData.get('sourceUrl') ?? '');
  if (!sourceUrl) throw new Error('URL gerekli.');

  const fetched = await fetchSupplierPriceFromUrl(sourceUrl);

  await recordAgentRun({
    agentKey: 'agent10_supplier_scout',
    triggeredBy: auth.displayName ?? 'owner',
    entityType: 'supplier_price_observation',
    inputSummary: { sourceUrl },
    outputSummary: { success: fetched.success, priceEur: fetched.priceEur, method: fetched.extractionMethod },
    confidence: fetched.extractionMethod === 'structured_data' ? 0.5 : fetched.extractionMethod === 'text_heuristic' ? 0.25 : 0,
  });

  if (!fetched.success || fetched.priceEur === null) {
    throw new Error(fetched.error ?? 'Fiyat bulunamadı.');
  }

  const [supplier] = await db.insert(suppliers).values({ name: supplierName, category: material }).returning();
  const [product] = await db.insert(supplierProducts).values({ supplierId: supplier!.id, material, unit }).returning();

  await db.insert(supplierPriceObservations).values({
    supplierProductId: product!.id,
    unitPrice: fetched.priceEur,
    vatIncluded: true,
    source: `Otomatik çekildi (${fetched.extractionMethod}): ${fetched.rawSnippet ?? ''}`.slice(0, 500),
    sourceUrl,
    mode: 'owner_pasted_url',
    verificationConfidence: fetched.extractionMethod === 'structured_data' ? 'medium' : 'low',
    observedAt: fetched.fetchedAt,
    staleAfter: new Date(fetched.fetchedAt.getTime() + 14 * 24 * 60 * 60 * 1000),
  });

  revalidatePath('/dashboard/suppliers');
}
