import { buildStatusSnapshot } from '@/lib/server/status-snapshot';
import { renderStatusBriefing } from '@/lib/agents/beyza-orchestrator';
import { AskBeyza } from '@/components/dashboard/AskBeyza';

function StatCard({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-surface-raised p-5">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${warn ? 'text-accent' : 'text-ink'}`}>{value}</div>
    </div>
  );
}

export default async function CommandCenterPage() {
  const snapshot = await buildStatusSnapshot();
  const briefing = renderStatusBriefing(snapshot);

  return (
    <div className="space-y-8">
      <section className="mosque-skyline-backdrop rounded-2xl border border-border bg-gradient-to-b from-surface-raised to-surface p-8">
        <h1 className="mb-1 text-3xl font-semibold text-ink">Komuta Merkezi</h1>
        <p className="mb-6 text-sm text-muted">{new Intl.DateTimeFormat('tr-TR', { dateStyle: 'full' }).format(snapshot.generatedAt)}</p>
        <AskBeyza />
        <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-ink/90">{briefing}</p>
      </section>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Sıcak lead" value={snapshot.hotLeads} />
        <StatCard label="Bekleyen teklif" value={snapshot.quotesPending} />
        <StatCard label="Bu hafta iş" value={snapshot.jobsNext7d} />
        <StatCard label="Cevap bekleyen" value={snapshot.unansweredInbound} warn={snapshot.unansweredInbound > 0} />
        <StatCard label="Gecikmiş takip" value={snapshot.overdueFollowUps} warn={snapshot.overdueFollowUps > 0} />
        <StatCard label="Tedarikçi uyarısı" value={snapshot.supplierAlerts} warn={snapshot.supplierAlerts > 0} />
        <StatCard label="Boru hattı (€)" value={Math.round(snapshot.pipelineValueEur)} />
        <StatCard label="Bağlayıcı hatası" value={snapshot.connectorFailures} warn={snapshot.connectorFailures > 0} />
      </section>
    </div>
  );
}
