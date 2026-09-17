import { db } from '@/db/client';
import { leads, customers, estimates, attachments, appointments, messageThreads, messages } from '@/db/schema';
import { desc } from 'drizzle-orm';
import Link from 'next/link';
import { createLeadAction } from './actions';
import { SERVICE_CATEGORIES } from '@/lib/business/service-categories';

const PRIORITY_COLORS: Record<string, string> = {
  hot: 'bg-accent text-white shadow-glow-sm',
  warm: 'bg-gold/30 text-gold',
  cold: 'bg-border text-muted',
  insufficient_info: 'bg-border text-muted',
  probably_decline: 'bg-border text-muted',
  bundle_opportunity: 'bg-accent-soft text-accent',
};

function formatEur(value: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
}

function formatRelative(date: Date): string {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  return `${Math.floor(hours / 24)} gün önce`;
}

export default async function LeadsPage() {
  const allLeads = await db.select().from(leads).orderBy(desc(leads.createdAt));
  const allCustomers = await db.select().from(customers);
  const allEstimates = await db.select().from(estimates).orderBy(desc(estimates.createdAt));
  const allAttachments = await db.select().from(attachments);
  const allAppointments = await db.select().from(appointments);
  const allThreads = await db.select().from(messageThreads);
  const allMessages = await db.select().from(messages);

  const now = new Date();

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-ink">Lead&apos;ler</h1>

      <details className="glass-panel rounded-xl p-5">
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {allLeads.map((lead) => {
          const customer = allCustomers.find((c) => c.id === lead.customerId);
          const estimate = allEstimates.find((e) => e.leadId === lead.id);
          const photoCount = allAttachments.filter((a) => a.leadId === lead.id && a.kind === 'photo').length;
          const nextVisit = allAppointments
            .filter((a) => a.leadId === lead.id && a.kind === 'site_visit' && a.status !== 'cancelled' && a.startsAt >= now)
            .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0];
          const thread = allThreads.find((t) => t.leadId === lead.id);
          const threadMessages = thread
            ? allMessages.filter((m) => m.threadId === thread.id).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            : [];
          const lastMessage = threadMessages[0];
          const awaitingReply = lastMessage?.direction === 'inbound';

          return (
            <Link
              key={lead.id}
              href={`/dashboard/leads/${lead.id}`}
              className="glass-panel group flex flex-col gap-3 rounded-2xl p-5 transition hover:shadow-glow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-ink">{customer?.name ?? 'Bilinmeyen müşteri'}</div>
                  <div className="text-xs text-muted">
                    {lead.serviceCategory} · {lead.location || 'konum yok'}
                  </div>
                </div>
                {lead.priority && (
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide ${PRIORITY_COLORS[lead.priority]}`}>
                    {lead.priority}
                  </span>
                )}
              </div>

              <div className="hud-divider" />

              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                <div className="text-muted">Durum</div>
                <div className="text-right text-ink">{lead.state}</div>

                {estimate?.recommendedExVat != null && (
                  <>
                    <div className="text-muted">Tahmini değer</div>
                    <div className="text-right text-ink">{formatEur(estimate.recommendedExVat)}</div>
                  </>
                )}
                {estimate?.grossProfit != null && (
                  <>
                    <div className="text-muted">Tahmini kâr</div>
                    <div className="text-right text-ink">{formatEur(estimate.grossProfit)}</div>
                  </>
                )}
                {estimate?.quoteConfidence != null && (
                  <>
                    <div className="text-muted">Güven</div>
                    <div className="text-right text-ink">%{Math.round(estimate.quoteConfidence * 100)}</div>
                  </>
                )}

                <div className="text-muted">Fotoğraf</div>
                <div className="text-right text-ink">{photoCount}</div>

                <div className="text-muted">Keşif</div>
                <div className="text-right text-ink">
                  {nextVisit ? new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(nextVisit.startsAt) : '—'}
                </div>
              </div>

              <div className="hud-divider" />

              <div className="flex items-center justify-between text-xs">
                <span className="truncate text-muted">
                  {lastMessage ? `Son mesaj: ${formatRelative(lastMessage.createdAt)}` : 'Henüz mesaj yok'}
                </span>
                {awaitingReply && (
                  <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-accent">Cevap bekliyor</span>
                )}
              </div>
              {lead.nextBestAction && (
                <p className="text-xs text-gold">→ {lead.nextBestAction}</p>
              )}
            </Link>
          );
        })}
        {allLeads.length === 0 && <p className="text-sm text-muted">Henüz lead yok.</p>}
      </div>
    </div>
  );
}
