import { notFound } from 'next/navigation';
import { db } from '@/db/client';
import { quotes, leads, customers, quoteVersions } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { approveQuoteAction, markQuoteSentAction, markQuoteAcceptedAction } from '../actions';

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [quote] = await db.select().from(quotes).where(eq(quotes.id, id)).limit(1);
  if (!quote) notFound();

  const [lead] = await db.select().from(leads).where(eq(leads.id, quote.leadId)).limit(1);
  const customer = lead?.customerId
    ? (await db.select().from(customers).where(eq(customers.id, lead.customerId)).limit(1))[0]
    : null;
  const versions = await db.select().from(quoteVersions).where(eq(quoteVersions.quoteId, id)).orderBy(desc(quoteVersions.version));

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold text-ink">{quote.quoteNumber}</h1>
      <p className="text-sm text-muted">
        {customer?.name} · {quote.languageLevel} · Durum: <strong>{quote.status}</strong>
      </p>

      <div className="rounded-xl border border-border bg-surface-raised p-5 text-sm">
        <div>Toplam (excl. BTW): €{quote.totalExVat.toFixed(2)}</div>
        <div>BTW: €{quote.vatAmount.toFixed(2)}</div>
        <div className="text-lg font-semibold text-ink">Toplam (incl. BTW): €{quote.totalIncVat.toFixed(2)}</div>
      </div>

      <div className="flex flex-wrap gap-3">
        <a
          href={`/api/quotes/${quote.id}/pdf`}
          className="rounded-lg border border-border px-4 py-2 text-sm text-ink hover:border-accent"
        >
          PDF indir
        </a>
        {quote.status === 'draft' && (
          <form action={approveQuoteAction}>
            <input type="hidden" name="id" value={quote.id} />
            <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90">
              Onayla
            </button>
          </form>
        )}
        {quote.status === 'approved' && (
          <form action={markQuoteSentAction}>
            <input type="hidden" name="id" value={quote.id} />
            <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90">
              Gönderildi olarak işaretle
            </button>
          </form>
        )}
        {quote.status === 'sent' && (
          <form action={markQuoteAcceptedAction}>
            <input type="hidden" name="id" value={quote.id} />
            <button type="submit" className="rounded-lg bg-gold/80 px-4 py-2 text-sm font-medium text-white hover:opacity-90">
              Müşteri kabul etti
            </button>
          </form>
        )}
      </div>

      {versions.length > 0 && (
        <div className="rounded-xl border border-border bg-surface-raised p-5 text-sm">
          <h2 className="mb-2 font-medium text-ink">Versiyon geçmişi</h2>
          <ul className="space-y-1 text-muted">
            {versions.map((v) => (
              <li key={v.id}>
                v{v.version} — €{v.totalExVat.toFixed(2)} {v.reason && `(${v.reason})`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
