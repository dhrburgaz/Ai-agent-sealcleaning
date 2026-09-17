import { db } from '@/db/client';
import { inventoryItems } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { createInventoryItemAction, adjustInventoryQuantityAction } from './actions';

export default async function InventoryPage() {
  const items = await db.select().from(inventoryItems).orderBy(desc(inventoryItems.updatedAt));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Envanter</h1>
        <p className="text-sm text-muted">
          Section 33: yeni malzeme satın almadan önce Beyza önce burayı kontrol eder (bkz. 40 m² şablon sonuçları).
        </p>
      </div>

      <form action={createInventoryItemAction} className="grid gap-3 rounded-xl border border-border bg-surface-raised p-5 sm:grid-cols-4">
        <input name="label" placeholder="Malzeme adı" required className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
        <input name="unit" placeholder="Birim (m2, adet, kg...)" required className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
        <input name="quantityOnHand" type="number" step="0.01" placeholder="Miktar" required className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
        <input name="reorderThreshold" type="number" step="0.01" placeholder="Yeniden sipariş eşiği (opsiyonel)" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
        <input name="notes" placeholder="Not (opsiyonel)" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm sm:col-span-3" />
        <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90">
          Ekle
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-raised text-left text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Malzeme</th>
              <th className="px-4 py-3">Miktar</th>
              <th className="px-4 py-3">Eşik</th>
              <th className="px-4 py-3">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const low = item.reorderThreshold !== null && item.quantityOnHand <= item.reorderThreshold;
              return (
                <tr key={item.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    {item.label}
                    {item.notes && <span className="ml-2 text-xs text-muted">({item.notes})</span>}
                  </td>
                  <td className={`px-4 py-3 ${low ? 'text-accent' : ''}`}>
                    {item.quantityOnHand} {item.unit}
                    {low && ' — düşük stok'}
                  </td>
                  <td className="px-4 py-3 text-muted">{item.reorderThreshold ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <form action={adjustInventoryQuantityAction}>
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="delta" value="-1" />
                        <button type="submit" className="rounded border border-border px-2 py-1 text-xs hover:border-accent">
                          -1
                        </button>
                      </form>
                      <form action={adjustInventoryQuantityAction}>
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="delta" value="1" />
                        <button type="submit" className="rounded border border-border px-2 py-1 text-xs hover:border-accent">
                          +1
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-muted" colSpan={4}>
                  Henüz envanter kaydı yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
