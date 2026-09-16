import { db } from '@/db/client';
import { leads, customers } from '@/db/schema';
import { desc } from 'drizzle-orm';
import Link from 'next/link';
import { createLeadAction } from './actions';
import { SERVICE_CATEGORIES } from '@/lib/business/service-categories';

const PRIORITY_COLORS: Record<string, string> = {
  hot: 'bg-accent text-white',
  warm: 'bg-gold/30 text-gold',
  cold: 'bg-border text-muted',
  insufficient_info: 'bg-border text-muted',
  probably_decline: 'bg-border text-muted',
  bundle_opportunity: 'bg-accent-soft text-accent',
};

export default async function LeadsPage() {
  const allLeads = await db.select().from(leads).orderBy(desc(leads.createdAt));
  const allCustomers = await db.select().from(customers);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-ink">Lead&apos;ler</h1>

      <details className="rounded-xl border border-border bg-surface-raised p-5">
        <summary className="cursor-pointer text-sm font-medium text-ink">+ Yeni lead (manuel giriş)</summary>
        <form action={createLeadAction} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input name="customerName" placeholder="Müşteri adı" required className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
          <input name="phone" placeholder="Telefon" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
          <input name="email" placeholder="E-posta" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
          <input name="location" placeholder="Konum (bijv. Dordrecht)" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
          <select name="serviceCategory" required className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
            {SERVICE_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.labelNl}
              </option>
            ))}
          </select>
          <select name="estimatedScale" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
            <option value="unknown">Ölçek bilinmiyor</option>
            <option value="small">Küçük</option>
            <option value="medium">Orta</option>
            <option value="large">Büyük</option>
          </select>
          <select name="urgency" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
            <option value="unknown">Aciliyet bilinmiyor</option>
            <option value="low">Düşük</option>
            <option value="medium">Orta</option>
            <option value="high">Yüksek</option>
          </select>
          <textarea
            name="rawText"
            placeholder="Müşteri mesajı / talep metni"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm sm:col-span-2"
          />
          <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 sm:col-span-2">
            Lead oluştur
          </button>
        </form>
      </details>

      <div className="space-y-2">
        {allLeads.map((lead) => {
          const customer = allCustomers.find((c) => c.id === lead.customerId);
          return (
            <Link
              key={lead.id}
              href={`/dashboard/leads/${lead.id}`}
              className="flex items-center justify-between rounded-xl border border-border bg-surface-raised p-4 hover:border-accent"
            >
              <div>
                <div className="font-medium text-ink">{customer?.name ?? 'Bilinmeyen müşteri'}</div>
                <div className="text-sm text-muted">
                  {lead.serviceCategory} · {lead.location || 'konum yok'} · {lead.state}
                </div>
              </div>
              {lead.priority && (
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${PRIORITY_COLORS[lead.priority]}`}>
                  {lead.priority}
                </span>
              )}
            </Link>
          );
        })}
        {allLeads.length === 0 && <p className="text-sm text-muted">Henüz lead yok.</p>}
      </div>
    </div>
  );
}
