import { db } from '@/db/client';
import { jobs, leads, customers } from '@/db/schema';
import { desc } from 'drizzle-orm';
import Link from 'next/link';
import { createJobFromLeadAction } from './actions';

export default async function JobsPage() {
  const allJobs = await db.select().from(jobs).orderBy(desc(jobs.createdAt));
  const allLeads = await db.select().from(leads);
  const allCustomers = await db.select().from(customers);
  const wonWithoutJob = allLeads.filter((l) => l.state === 'WON' && !allJobs.some((j) => j.leadId === l.id));

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-ink">İşler</h1>

      {wonWithoutJob.length > 0 && (
        <section className="glass-panel rounded-xl p-5">
          <h2 className="mb-3 text-sm font-medium text-ink">Kazanılan, planlanmayı bekleyen</h2>
          <div className="space-y-2">
            {wonWithoutJob.map((lead) => {
              const customer = allCustomers.find((c) => c.id === lead.customerId);
              return (
                <form key={lead.id} action={createJobFromLeadAction} className="flex items-center justify-between rounded-lg bg-surface p-3 text-sm">
                  <input type="hidden" name="leadId" value={lead.id} />
                  <span>{customer?.name} — {lead.serviceCategory}</span>
                  <button type="submit" className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90">
                    İş oluştur
                  </button>
                </form>
              );
            })}
          </div>
        </section>
      )}

      <div className="space-y-2">
        {allJobs.map((job) => {
          const lead = allLeads.find((l) => l.id === job.leadId);
          const customer = allCustomers.find((c) => c.id === lead?.customerId);
          return (
            <Link
              key={job.id}
              href={`/dashboard/jobs/${job.id}`}
              className="flex items-center justify-between rounded-xl border border-border bg-surface-raised p-4 hover:border-accent"
            >
              <span>{customer?.name} — {lead?.serviceCategory}</span>
              <span className="text-xs text-muted">{job.status}</span>
            </Link>
          );
        })}
        {allJobs.length === 0 && <p className="text-sm text-muted">Henüz iş yok.</p>}
      </div>
    </div>
  );
}
