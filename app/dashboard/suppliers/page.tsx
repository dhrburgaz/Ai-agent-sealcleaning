import { db } from '@/db/client';
import { suppliers, supplierProducts, supplierPriceObservations } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { validateDiscountClaim } from '@/lib/suppliers/landed-cost';
import { addSupplierObservationAction } from './actions';

export default async function SuppliersPage() {
  const observations = await db.select().from(supplierPriceObservations).orderBy(desc(supplierPriceObservations.observedAt));
  const products = await db.select().from(supplierProducts);
  const supplierRows = await db.select().from(suppliers);
  const now = new Date();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Tedarikçiler &amp; Fırsatlar</h1>
        <p className="text-sm text-muted">Kanıtsız &quot;indirim&quot; etiketi kabul edilmez. Her fiyat kaynağı ve tarihiyle görünür.</p>
      </div>

      <form action={addSupplierObservationAction} className="grid gap-3 rounded-xl border border-border bg-surface-raised p-5 sm:grid-cols-3">
        <input name="supplierName" placeholder="Tedarikçi" required className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
        <input name="material" placeholder="Malzeme" required className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
        <input name="unit" placeholder="Birim" required className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
        <input name="unitPrice" type="number" step="0.01" placeholder="Birim fiyat €" required className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
        <input name="sourceUrl" placeholder="Kaynak URL (opsiyonel)" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm sm:col-span-2" />
        <input name="discountLabel" placeholder="İndirim etiketi (opsiyonel)" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
        <input name="discountEvidenceUrl" placeholder="İndirim kanıt URL (etiket varsa zorunlu)" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm sm:col-span-2" />
        <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90">
          Ekle
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-raised text-left text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Tedarikçi</th>
              <th className="px-4 py-3">Malzeme</th>
              <th className="px-4 py-3">Fiyat</th>
              <th className="px-4 py-3">Kontrol edildi</th>
              <th className="px-4 py-3">İndirim</th>
              <th className="px-4 py-3">Durum</th>
            </tr>
          </thead>
          <tbody>
            {observations.map((o) => {
              const product = products.find((p) => p.id === o.supplierProductId);
              const supplier = supplierRows.find((s) => s.id === product?.supplierId);
              const isStale = Boolean(o.staleAfter && o.staleAfter < now);
              const discountCheck = validateDiscountClaim({
                supplierId: supplier?.id ?? '',
                supplierName: supplier?.name ?? '',
                unitPrice: o.unitPrice,
                vatIncluded: o.vatIncluded,
                vatRatePercent: 21,
                deliveryFee: 0,
                pickupAvailable: Boolean(o.pickupAvailable),
                minimumOrder: 0,
                discountLabel: o.discountLabel ?? undefined,
                discountEvidenceUrl: o.discountEvidenceUrl ?? undefined,
                distanceKm: 0,
                preferred: false,
                observedAt: o.observedAt,
              });
              return (
                <tr key={o.id} className="border-t border-border">
                  <td className="px-4 py-3">{supplier?.name}</td>
                  <td className="px-4 py-3">{product?.material}</td>
                  <td className="px-4 py-3">€{o.unitPrice.toFixed(2)} / {product?.unit}</td>
                  <td className="px-4 py-3">{new Intl.DateTimeFormat('tr-TR').format(o.observedAt)}</td>
                  <td className="px-4 py-3">
                    {o.discountLabel ? (
                      discountCheck.accepted ? (
                        <span className="text-gold">{o.discountLabel}</span>
                      ) : (
                        <span className="text-accent">Reddedildi: kanıt yok</span>
                      )
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isStale ? <span className="text-accent">Güncelliğini yitirdi</span> : <span className="text-muted">Güncel</span>}
                  </td>
                </tr>
              );
            })}
            {observations.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-muted" colSpan={6}>
                  Henüz tedarikçi verisi yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
