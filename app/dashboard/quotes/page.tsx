import { db } from '@/db/client';
import { quotes, leads, customers } from '@/db/schema';
import { desc } from 'drizzle-orm';
import Link from 'next/link';

export default async function QuotesPage() {
  const allQuotes = await db.select().from(quotes).orderBy(desc(quotes.createdAt));
  const allLeads = await db.select().from(leads);
  const allCustomers = await db.select().from(customers);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-ink">Teklifler</h1>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-raised text-left text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Numara</th>
              <th className="px-4 py-3">Müşteri</th>
              <th className="px-4 py-3">Tutar (excl. BTW)</th>
              <th className="px-4 py-3">Dil düzeyi</th>
              <th className="px-4 py-3">Durum</th>
            </tr>
          </thead>
          <tbody>
            {allQuotes.map((q) => {
              const lead = allLeads.find((l) => l.id === q.leadId);
              const customer = allCustomers.find((c) => c.id === lead?.customerId);
              return (
                <tr key={q.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/quotes/${q.id}`} className="text-accent hover:underline">
                      {q.quoteNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{customer?.name ?? '—'}</td>
                  <td className="px-4 py-3">€{q.totalExVat.toFixed(2)}</td>
                  <td className="px-4 py-3">{q.languageLevel}</td>
                  <td className="px-4 py-3">{q.status}</td>
                </tr>
              );
            })}
            {allQuotes.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-muted" colSpan={5}>
                  Henüz teklif yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
