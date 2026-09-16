import { notFound } from 'next/navigation';
import { db } from '@/db/client';
import { jobs, leads, customers, actualCosts, estimates, quotes } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { markJobStatusAction, saveActualCostsAction } from '../actions';
import { DictationParser } from '@/components/jobs/DictationParser';
import { compareEstimateToActuals, sumActualCosts } from '@/lib/jobs/costing';

const CATEGORIES = ['labour', 'materials', 'rental', 'disposal', 'travel', 'subcontractor', 'unexpected'] as const;

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [job] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  if (!job) notFound();

  const [lead] = await db.select().from(leads).where(eq(leads.id, job.leadId)).limit(1);
  const customer = lead?.customerId
    ? (await db.select().from(customers).where(eq(customers.id, lead.customerId)).limit(1))[0]
    : null;
  const costs = await db.select().from(actualCosts).where(eq(actualCosts.jobId, id));

  const [quote] = job.quoteId ? await db.select().from(quotes).where(eq(quotes.id, job.quoteId)).limit(1) : [];
  const [estimate] = quote ? await db.select().from(estimates).where(eq(estimates.id, quote.estimateId)).limit(1) : [];

  const actualsByCategory = {
    labour: costs.filter((c) => c.category === 'labour').reduce((s, c) => s + c.amount, 0),
    materials: costs.filter((c) => c.category === 'materials').reduce((s, c) => s + c.amount, 0),
    rental: costs.filter((c) => c.category === 'rental').reduce((s, c) => s + c.amount, 0),
    disposal: costs.filter((c) => c.category === 'disposal').reduce((s, c) => s + c.amount, 0),
    travel: costs.filter((c) => c.category === 'travel').reduce((s, c) => s + c.amount, 0),
    subcontractor: costs.filter((c) => c.category === 'subcontractor').reduce((s, c) => s + c.amount, 0),
    unexpected: costs.filter((c) => c.category === 'unexpected').reduce((s, c) => s + c.amount, 0),
  };

  const comparison =
    estimate && quote
      ? compareEstimateToActuals(
          {
            directCost: estimate.directCost ?? 0,
            costWithOverhead: estimate.costWithOverhead ?? 0,
            recommendedExVat: estimate.recommendedExVat ?? 0,
            minimumTargetGrossProfit: estimate.minimumTargetGrossProfit,
          },
          actualsByCategory,
          quote.totalExVat,
        )
      : null;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold text-ink">{customer?.name} — {lead?.serviceCategory}</h1>
      <p className="text-sm text-muted">Durum: {job.status}</p>

      <div className="flex gap-2">
        {(['scheduled', 'in_progress', 'completed'] as const).map((s) => (
          <form key={s} action={markJobStatusAction}>
            <input type="hidden" name="jobId" value={job.id} />
            <input type="hidden" name="status" value={s} />
            <button type="submit" className="rounded-lg border border-border px-3 py-1.5 text-xs text-ink hover:border-accent">
              {s}
            </button>
          </form>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gold">
          Gerçek maliyetler — sesli/metin dikte (önizleme)
        </h2>
        <DictationParser />
      </section>

      <section className="rounded-xl border border-border bg-surface-raised p-5">
        <h2 className="mb-3 text-sm font-medium text-ink">Maliyet ekle</h2>
        <form action={saveActualCostsAction} className="grid gap-3 sm:grid-cols-4">
          <input type="hidden" name="jobId" value={job.id} />
          <select name="category" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input name="amount" type="number" step="0.01" placeholder="€" required className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
          <input name="description" placeholder="Açıklama" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm sm:col-span-2" />
          <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 sm:col-span-4">
            Kaydet
          </button>
        </form>
        <ul className="mt-4 space-y-1 text-sm text-muted">
          {costs.map((c) => (
            <li key={c.id}>
              {c.category}: €{c.amount.toFixed(2)} {c.description && `— ${c.description}`}
            </li>
          ))}
        </ul>
        <div className="mt-2 text-sm text-ink">Toplam gerçek maliyet: €{sumActualCosts(actualsByCategory).toFixed(2)}</div>
      </section>

      {comparison && (
        <section className="rounded-xl border border-border bg-surface-raised p-5 text-sm">
          <h2 className="mb-3 font-medium text-ink">Tahmin vs. gerçek</h2>
          <div>Tahmini maliyet: €{comparison.estimatedTotalCost.toFixed(2)}</div>
          <div>Gerçek maliyet: €{comparison.actualTotalCost.toFixed(2)} ({(comparison.costVariancePercent * 100).toFixed(1)}% sapma)</div>
          <div>Gerçekleşen kâr: €{comparison.realizedGrossProfit.toFixed(2)} ({(comparison.realizedGrossMargin * 100).toFixed(1)}% marj)</div>
          <div className={comparison.profitFloorAchieved ? 'text-gold' : 'text-accent'}>
            {comparison.profitFloorAchieved
              ? '€1.200 kâr hedefi tutturuldu.'
              : `Kâr hedefinin €${comparison.profitFloorShortfall.toFixed(2)} altında.`}
          </div>
        </section>
      )}
    </div>
  );
}
