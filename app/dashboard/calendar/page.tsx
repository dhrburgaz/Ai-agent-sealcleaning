import { db } from '@/db/client';
import { appointments, calendarEvents, leads, customers, jobs } from '@/db/schema';
import { isNull } from 'drizzle-orm';
import { confirmAppointmentAction, cancelAppointmentAction } from './actions';
import { ProposeAppointmentForm } from '@/components/calendar/ProposeAppointmentForm';
import { ScheduleJobForm } from '@/components/calendar/ScheduleJobForm';
import { AddCalendarEventForm } from '@/components/calendar/AddCalendarEventForm';

function formatDateTime(d: Date): string {
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
}

export default async function CalendarPage() {
  const allAppointments = await db.select().from(appointments);
  const allCalendarEvents = await db.select().from(calendarEvents);
  const allLeads = await db.select().from(leads);
  const allCustomers = await db.select().from(customers);
  const customerById = new Map(allCustomers.map((c) => [c.id, c]));
  const leadById = new Map(allLeads.map((l) => [l.id, l]));

  const qualifiedLeads = allLeads.filter((l) =>
    ['QUALIFIED', 'SITE_VISIT_PROPOSED'].includes(l.state),
  );
  const unscheduledJobs = await db.select().from(jobs).where(isNull(jobs.scheduledStart));

  const pendingAppointments = allAppointments
    .filter((a) => a.status === 'proposed' || a.status === 'confirmed')
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  const upcomingEvents = allCalendarEvents
    .filter((e) => e.startsAt.getTime() >= Date.now() - 24 * 60 * 60 * 1000)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">Takvim</h1>
        <a
          href="/api/calendar/ics"
          className="rounded-lg border border-border px-4 py-2 text-sm text-ink hover:border-accent"
        >
          Takvimi indir (.ics)
        </a>
      </div>
      <p className="text-sm text-muted">
        Agent 15/16 — çakışma kontrolü yol payı ile birlikte yapılır; hiçbir randevu mevcut bir
        rezervasyonun üzerine planlanamaz.
      </p>

      <section className="glass-panel rounded-xl p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gold">Randevular</h2>
        {pendingAppointments.length === 0 && <p className="text-sm text-muted">Planlanmış randevu yok.</p>}
        <ul className="space-y-3">
          {pendingAppointments.map((a) => {
            const lead = a.leadId ? leadById.get(a.leadId) : null;
            const customer = lead?.customerId ? customerById.get(lead.customerId) : null;
            return (
              <li key={a.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-ink">
                      {a.kind === 'site_visit' ? 'Keşif' : 'İş'} — {customer?.name ?? 'lead yok'}
                    </div>
                    <div className="text-xs text-muted">
                      {formatDateTime(a.startsAt)} → {formatDateTime(a.endsAt)} · durum: {a.status}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {a.status === 'proposed' && (
                      <form action={confirmAppointmentAction}>
                        <input type="hidden" name="appointmentId" value={a.id} />
                        <button type="submit" className="rounded-lg border border-border px-3 py-1.5 text-xs text-ink hover:border-accent">
                          Onayla
                        </button>
                      </form>
                    )}
                    <form action={cancelAppointmentAction}>
                      <input type="hidden" name="appointmentId" value={a.id} />
                      <button type="submit" className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:border-accent">
                        İptal
                      </button>
                    </form>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="glass-panel rounded-xl p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gold">Takvim etkinlikleri</h2>
        {upcomingEvents.length === 0 && <p className="text-sm text-muted">Yaklaşan etkinlik yok.</p>}
        <ul className="space-y-2 text-sm">
          {upcomingEvents.map((e) => (
            <li key={e.id} className="rounded-lg border border-border p-3">
              <div className="text-ink">{e.title}</div>
              <div className="text-xs text-muted">
                {formatDateTime(e.startsAt)} → {formatDateTime(e.endsAt)} · {e.kind}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="glass-panel rounded-xl p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gold">Keşif randevusu öner</h2>
        <ProposeAppointmentForm
          leads={qualifiedLeads.map((l) => ({
            id: l.id,
            label: `${l.customerId ? customerById.get(l.customerId)?.name ?? '—' : '—'} · ${l.serviceCategory ?? ''}`,
          }))}
        />
      </section>

      <section className="glass-panel rounded-xl p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gold">İş planla</h2>
        <ScheduleJobForm
          jobs={unscheduledJobs.map((j) => {
            const lead = leadById.get(j.leadId);
            const customer = lead?.customerId ? customerById.get(lead.customerId) : null;
            return { id: j.id, label: `${customer?.name ?? '—'} · ${lead?.serviceCategory ?? ''}` };
          })}
        />
      </section>

      <section className="glass-panel rounded-xl p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gold">Manuel etkinlik ekle</h2>
        <AddCalendarEventForm />
      </section>
    </div>
  );
}
