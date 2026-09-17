import { db } from '@/db/client';
import { jobs, quotes, estimates, actualCosts, invoiceReferences, leads } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  bucketFinancialsByMonth,
  computeWinRate,
  computeProfitFloorAchievementRate,
  type CompletedJobFinancials,
} from '@/lib/jobs/finance-report';

function formatEur(value: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(value);
}

const WON_PATH_STATES = ['WON', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'INVOICED_REFERENCE', 'REVIEW_REQUESTED'];

export default async function FinancePage() {
  const completedJobs = await db.select().from(jobs).where(eq(jobs.status, 'completed'));
  const allQuotes = await db.select().from(quotes);
  const allEstimates = await db.select().from(estimates);
  const allActualCosts = await db.select().from(actualCosts);
  const allInvoiceRefs = await db.select().from(invoiceReferences);
  const allLeads = await db.select().from(leads);

  const estimateById = new Map(allEstimates.map((e) => [e.id, e]));
  const invoiceRefByJobId = new Map(allInvoiceRefs.map((r) => [r.jobId, r]));

  const financials: CompletedJobFinancials[] = completedJobs
    .filter((j) => j.completedAt)
    .map((job) => {
      const actual = allActualCosts.filter((c) => c.jobId === job.id).reduce((sum, c) => sum + c.amount, 0);
      const quote = job.quoteId ? allQuotes.find((q) => q.id === job.quoteId) : undefined;
      const invoiceRef = invoiceRefByJobId.get(job.id);
      const revenue = invoiceRef?.finalRevenue ?? quote?.totalExVat ?? 0;
      const estimate = quote ? estimateById.get(quote.estimateId) : undefined;
      const minimumTargetGrossProfit = estimate?.minimumTargetGrossProfit ?? 1200;
      const profitFloorAchieved = revenue - actual >= minimumTargetGrossProfit;
      return {
        jobId: job.id,
        completedAt: job.completedAt!,
        revenueExVat: revenue,
        actualCost: actual,
        profitFloorAchieved,
      };
    });

  const monthlyBuckets = bucketFinancialsByMonth(financials);
  const winRate = computeWinRate({
    wonCount: allLeads.filter((l) => WON_PATH_STATES.includes(l.state)).length,
    lostCount: allLeads.filter((l) => l.state === 'LOST').length,
  });
  const profitFloorRate = computeProfitFloorAchievementRate({
    achievedCount: financials.filter((f) => f.profitFloorAchieved).length,
    totalCount: financials.length,
  });

  const pendingQuotes = allQuotes.filter((q) => q.status === 'draft' || q.status === 'sent');
  const pipelineValueEur = pendingQuotes.reduce((sum, q) => sum + q.totalExVat, 0);

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="text-2xl font-semibold text-ink">Finans & Raporlama</h1>
      <p className="text-sm text-muted">
        Agent 18 — sadece gerçekleşmiş verilerden hesaplanır: tamamlanmış işler, gönderilmiş
        teklifler, karara bağlanmış lead&apos;ler. Hiçbir sayı tahmin veya varsayım değildir.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface-raised p-5">
          <div className="text-xs uppercase tracking-wide text-muted">Boru hattı değeri</div>
          <div className="mt-1 text-xl font-semibold text-ink">{formatEur(pipelineValueEur)}</div>
          <div className="text-xs text-muted">{pendingQuotes.length} bekleyen teklif</div>
        </div>
        <div className="rounded-xl border border-border bg-surface-raised p-5">
          <div className="text-xs uppercase tracking-wide text-muted">Kazanma oranı</div>
          <div className="mt-1 text-xl font-semibold text-ink">{winRate.winRatePercent.toFixed(1)}%</div>
          <div className="text-xs text-muted">{winRate.totalDecided} karara bağlanmış lead</div>
        </div>
        <div className="rounded-xl border border-border bg-surface-raised p-5">
          <div className="text-xs uppercase tracking-wide text-muted">€1.200 kâr hedefi tutturma</div>
          <div className="mt-1 text-xl font-semibold text-ink">{profitFloorRate.toFixed(1)}%</div>
          <div className="text-xs text-muted">{financials.length} tamamlanmış iş</div>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-surface-raised p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gold">Aylık özet</h2>
        {monthlyBuckets.length === 0 && (
          <p className="text-sm text-muted">Henüz tamamlanmış iş yok; aylık rapor için veri gerekli.</p>
        )}
        {monthlyBuckets.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted">
                <th className="pb-2">Ay</th>
                <th className="pb-2">İş sayısı</th>
                <th className="pb-2">Ciro</th>
                <th className="pb-2">Maliyet</th>
                <th className="pb-2">Brüt kâr</th>
                <th className="pb-2">Marj</th>
              </tr>
            </thead>
            <tbody>
              {monthlyBuckets.map((b) => (
                <tr key={b.monthKey} className="border-t border-border">
                  <td className="py-2 text-ink">{b.monthKey}</td>
                  <td className="py-2 text-ink">{b.jobCount}</td>
                  <td className="py-2 text-ink">{formatEur(b.revenueExVat)}</td>
                  <td className="py-2 text-ink">{formatEur(b.actualCost)}</td>
                  <td className="py-2 text-ink">{formatEur(b.grossProfit)}</td>
                  <td className="py-2 text-ink">{b.grossMarginPercent.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
