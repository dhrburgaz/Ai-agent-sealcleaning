import { db } from '@/db/client';
import { followUps, leads, customers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCompanyProfile } from '@/lib/server/repo';
import { sendFollowUpAction, cancelFollowUpAction, optOutCustomerAction } from './actions';

function formatDateTime(d: Date): string {
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
}

export default async function FollowUpsPage() {
  const company = await getCompanyProfile();
  const allFollowUps = await db.select().from(followUps).where(eq(followUps.status, 'scheduled'));
  const allLeads = await db.select().from(leads);
  const allCustomers = await db.select().from(customers);
  const leadById = new Map(allLeads.map((l) => [l.id, l]));
  const customerById = new Map(allCustomers.map((c) => [c.id, c]));

  const now = new Date();
  const due = allFollowUps
    .filter((f) => f.scheduledAt <= now)
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  const upcoming = allFollowUps
    .filter((f) => f.scheduledAt > now)
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

  const needsApproval = company?.approvalMode !== 'autopilot';

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-semibold text-ink">Takip mesajları</h1>
      <p className="text-sm text-muted">
        Agent 17 — teklif gönderildiğinde otomatik olarak ilk takip planlanır (3 gün sonra), yanıt
        yoksa 7 gün sonra ikinci ve son takip. Müşteri opt-out ise hiçbir takip planlanmaz.{' '}
        {company?.approvalMode === 'draft_only' && 'Şu an Draft Only modundasınız: hiçbir mesaj onaysız gönderilmez.'}
      </p>

      <section className="rounded-xl border border-border bg-surface-raised p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gold">Gecikmiş / bugün ({due.length})</h2>
        {due.length === 0 && <p className="text-sm text-muted">Gecikmiş takip yok.</p>}
        <ul className="space-y-3">
          {due.map((f) => {
            const lead = leadById.get(f.leadId);
            const customer = lead?.customerId ? customerById.get(lead.customerId) : null;
            return (
              <li key={f.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="mb-2">
                  <div className="text-ink">
                    {customer?.name ?? 'Bilinmeyen müşteri'} — adım {f.sequenceStep}
                  </div>
                  <div className="text-xs text-muted">Planlandı: {formatDateTime(f.scheduledAt)}</div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <form action={sendFollowUpAction} className="flex items-center gap-2">
                    <input type="hidden" name="followUpId" value={f.id} />
                    {needsApproval && (
                      <label className="flex items-center gap-1 text-xs text-muted">
                        <input type="checkbox" name="approved" />
                        Onaylıyorum
                      </label>
                    )}
                    <button type="submit" className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90">
                      Gönder
                    </button>
                  </form>
                  <form action={cancelFollowUpAction}>
                    <input type="hidden" name="followUpId" value={f.id} />
                    <button type="submit" className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:border-accent">
                      İptal
                    </button>
                  </form>
                  {customer && !customer.optedOut && (
                    <form action={optOutCustomerAction}>
                      <input type="hidden" name="customerId" value={customer.id} />
                      <button type="submit" className="text-xs text-muted hover:underline">
                        Müşteriyi takipten çıkar
                      </button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-xl border border-border bg-surface-raised p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gold">Yaklaşan ({upcoming.length})</h2>
        {upcoming.length === 0 && <p className="text-sm text-muted">Yaklaşan takip yok.</p>}
        <ul className="space-y-2 text-sm">
          {upcoming.map((f) => {
            const lead = leadById.get(f.leadId);
            const customer = lead?.customerId ? customerById.get(lead.customerId) : null;
            return (
              <li key={f.id} className="rounded-lg border border-border p-3">
                <div className="text-ink">{customer?.name ?? 'Bilinmeyen müşteri'} — adım {f.sequenceStep}</div>
                <div className="text-xs text-muted">Planlandı: {formatDateTime(f.scheduledAt)}</div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
