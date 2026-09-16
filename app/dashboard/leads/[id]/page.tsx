import { notFound } from 'next/navigation';
import { db } from '@/db/client';
import { leads, customers, messageThreads, messages, estimates, quotes, leadEvents } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { LEAD_STATES } from '@/lib/crm/state-machine';
import { canTransition } from '@/lib/crm/state-machine';
import { availableTemplateKeys } from '@/lib/messaging/templates';
import { transitionLeadStateAction } from '../actions';
import { sendMessageAction, createCeramicEstimateAction, createQuoteFromEstimateAction } from './actions';

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [lead] = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  if (!lead) notFound();

  const customer = lead.customerId
    ? (await db.select().from(customers).where(eq(customers.id, lead.customerId)).limit(1))[0]
    : null;
  const [thread] = await db.select().from(messageThreads).where(eq(messageThreads.leadId, id)).limit(1);
  const threadMessages = thread
    ? await db.select().from(messages).where(eq(messages.threadId, thread.id)).orderBy(messages.createdAt)
    : [];
  const leadEstimates = await db.select().from(estimates).where(eq(estimates.leadId, id)).orderBy(desc(estimates.createdAt));
  const latestEstimate = leadEstimates[0];
  const leadQuotes = await db.select().from(quotes).where(eq(quotes.leadId, id));
  const events = await db.select().from(leadEvents).where(eq(leadEvents.leadId, id)).orderBy(desc(leadEvents.createdAt));

  const validNextStates = LEAD_STATES.filter((s) => canTransition(lead.state, s).allowed);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{customer?.name ?? 'Bilinmeyen müşteri'}</h1>
          <p className="text-sm text-muted">
            {lead.serviceCategory} · {lead.location || 'konum yok'} · Durum: <strong>{lead.state}</strong>
          </p>
        </div>
        {lead.priority && (
          <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">{lead.priority}</span>
        )}
      </div>

      {lead.priorityReasons && lead.priorityReasons.length > 0 && (
        <div className="rounded-xl border border-border bg-surface-raised p-4 text-sm text-muted">
          <div className="mb-1 font-medium text-ink">Neden? (nitelendirme skoru: {lead.priorityScore})</div>
          <ul className="list-inside list-disc">
            {lead.priorityReasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          {lead.nextBestAction && <p className="mt-2 text-ink">Önerilen aksiyon: {lead.nextBestAction}</p>}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {validNextStates.map((s) => (
          <form key={s} action={transitionLeadStateAction}>
            <input type="hidden" name="leadId" value={lead.id} />
            <input type="hidden" name="toState" value={s} />
            <button type="submit" className="rounded-lg border border-border px-3 py-1.5 text-xs text-ink hover:border-accent">
              → {s}
            </button>
          </form>
        ))}
      </div>

      <section className="rounded-xl border border-border bg-surface-raised p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gold">Müşteri iletişimi</h2>
        <div className="mb-4 space-y-2">
          {threadMessages.map((m) => (
            <div key={m.id} className={`rounded-lg p-3 text-sm ${m.direction === 'outbound' ? 'bg-accent-soft/40 text-ink' : 'bg-surface text-ink'}`}>
              <div className="mb-1 text-xs text-muted">
                {m.direction === 'outbound' ? 'Biz' : 'Müşteri'} · {m.status}
              </div>
              {m.body}
            </div>
          ))}
          {threadMessages.length === 0 && <p className="text-sm text-muted">Henüz mesaj yok.</p>}
        </div>
        <form action={sendMessageAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="leadId" value={lead.id} />
          <select name="templateKey" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
            {availableTemplateKeys().map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1 text-xs text-muted">
            <input type="checkbox" name="approved" /> Onaylıyorum (Smart Approval)
          </label>
          <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            Taslak oluştur / Gönder
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-surface-raised p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gold">
          40 m² Keramik Teras Şablonu — Fiyat Teklifi
        </h2>
        <form action={createCeramicEstimateAction} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="leadId" value={lead.id} />
          <input name="areaM2" type="number" step="0.1" placeholder="Alan (m²)" defaultValue="40" required className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
          <select name="tileSuppliedBy" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
            <option value="company">Tegels: wij leveren</option>
            <option value="customer">Tegels: klant levert</option>
          </select>
          <input name="tileUnitCostPerM2" type="number" step="0.01" placeholder="Tegel kosten €/m² (wij leveren)" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
          <input name="accessWidthCm" type="number" placeholder="Toegangsbreedte (cm)" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" name="disposalIncluded" defaultChecked /> Afvoer inbegrepen
          </label>
          <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            Fiyat hesapla
          </button>
        </form>

        {latestEstimate && (
          <div className="mt-5 space-y-2 rounded-lg bg-surface p-4 text-sm">
            <div>Direkt maliyet: €{latestEstimate.directCost?.toFixed(2)}</div>
            <div>Genel gider dahil maliyet: €{latestEstimate.costWithOverhead?.toFixed(2)}</div>
            <div>Kâr hedefi fiyatı: €{latestEstimate.priceForProfitFloor?.toFixed(2)}</div>
            <div className="text-lg font-semibold text-ink">
              Önerilen fiyat (KDV hariç): €{latestEstimate.recommendedExVat?.toFixed(2)}
            </div>
            <div>Beklenen kâr: €{latestEstimate.grossProfit?.toFixed(2)} ({((latestEstimate.grossMargin ?? 0) * 100).toFixed(1)}% marj)</div>
            <div>Ticari uyum: <strong>{latestEstimate.commercialFit}</strong></div>
            <div>Teklif güveni: {((latestEstimate.quoteConfidence ?? 0) * 100).toFixed(0)}%</div>
            {latestEstimate.qaBlocked && (
              <div className="rounded bg-accent-soft p-2 text-accent">
                QA engeli: {latestEstimate.qaBlockReasons?.join(' ')}
              </div>
            )}
            <form action={createQuoteFromEstimateAction}>
              <input type="hidden" name="leadId" value={lead.id} />
              <input type="hidden" name="estimateId" value={latestEstimate.id} />
              <button type="submit" className="mt-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90">
                Teklif oluştur (PDF)
              </button>
            </form>
          </div>
        )}
      </section>

      {leadQuotes.length > 0 && (
        <section className="rounded-xl border border-border bg-surface-raised p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gold">Teklifler</h2>
          <ul className="space-y-1 text-sm">
            {leadQuotes.map((q) => (
              <li key={q.id}>
                <a href={`/dashboard/quotes/${q.id}`} className="text-accent hover:underline">
                  {q.quoteNumber} — €{q.totalExVat.toFixed(2)} ({q.status})
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-xl border border-border bg-surface-raised p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gold">Geçmiş (audit)</h2>
        <ul className="space-y-1 text-xs text-muted">
          {events.map((e) => (
            <li key={e.id}>
              {new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(e.createdAt)} —{' '}
              {e.kind} {e.fromState && `${e.fromState} → ${e.toState}`} {e.detail}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
