import { db } from '@/db/client';
import { priceBookItems } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { createPriceBookItemAction, verifyPriceBookItemAction, deactivatePriceBookItemAction } from './actions';

export default async function PriceBookPage() {
  const items = await db.select().from(priceBookItems).orderBy(desc(priceBookItems.createdAt));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Fiyat Listesi</h1>
        <p className="text-sm text-muted">
          Sahte &quot;güncel piyasa fiyatı&quot; asla eklenmez. Doğrulanmamış kalemler
          <span className="mx-1 rounded bg-accent-soft px-1.5 py-0.5 text-accent">NEEDS_OWNER_VERIFICATION</span>
          olarak işaretlenir.
        </p>
      </div>

      <form action={createPriceBookItemAction} className="grid gap-3 glass-panel rounded-xl p-5 sm:grid-cols-5">
        <input name="category" placeholder="Kategori" required className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
        <input name="nameNl" placeholder="Ad (NL)" required className="rounded-lg border border-border bg-surface px-3 py-2 text-sm sm:col-span-2" />
        <input name="unit" placeholder="Birim (m2, lm, ...)" required className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
        <input name="baseCost" type="number" step="0.01" placeholder="Maliyet €" required className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
        <input name="source" placeholder="Kaynak (opsiyonel)" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm sm:col-span-4" />
        <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90">
          Ekle
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-raised text-left text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Kategori</th>
              <th className="px-4 py-3">Ad</th>
              <th className="px-4 py-3">Birim</th>
              <th className="px-4 py-3">Maliyet</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-border">
                <td className="px-4 py-3">{item.category}</td>
                <td className="px-4 py-3">{item.nameNl}</td>
                <td className="px-4 py-3">{item.unit}</td>
                <td className="px-4 py-3">€{item.baseCost.toFixed(2)}</td>
                <td className="px-4 py-3">
                  {item.needsOwnerVerification ? (
                    <span className="rounded bg-accent-soft px-2 py-0.5 text-xs text-accent">NEEDS_OWNER_VERIFICATION</span>
                  ) : (
                    <span className="rounded bg-gold/20 px-2 py-0.5 text-xs text-gold">Doğrulandı</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <form action={verifyPriceBookItemAction} className="flex items-center gap-1">
                      <input type="hidden" name="id" value={item.id} />
                      <input
                        name="baseCost"
                        type="number"
                        step="0.01"
                        defaultValue={item.baseCost}
                        className="w-20 rounded border border-border bg-surface px-2 py-1 text-xs"
                      />
                      <button type="submit" className="text-xs text-accent hover:underline">
                        Doğrula
                      </button>
                    </form>
                    {item.active && (
                      <form action={deactivatePriceBookItemAction}>
                        <input type="hidden" name="id" value={item.id} />
                        <button type="submit" className="text-xs text-muted hover:underline">
                          Pasifleştir
                        </button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
