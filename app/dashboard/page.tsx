import { buildStatusSnapshot } from '@/lib/server/status-snapshot';
import { renderStatusBriefing } from '@/lib/agents/beyza-orchestrator';
import { buildActivityFeed } from '@/lib/server/activity-feed';
import { AGENT_DEFINITIONS } from '@/lib/agents/definitions';
import { CommandCenterHero } from '@/components/beyza/CommandCenterHero';
import { ActivityFeed } from '@/components/beyza/ActivityFeed';

function StatCard({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div className="glass-panel rounded-xl p-5 transition hover:shadow-glow-sm">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${warn ? 'text-accent text-glow' : 'text-ink'}`}>{value}</div>
    </div>
  );
}

export default async function CommandCenterPage() {
  const snapshot = await buildStatusSnapshot();
  const briefing = renderStatusBriefing(snapshot);
  const activity = await buildActivityFeed(10);

  return (
    <div className="space-y-6">
      <div className="hud-divider mb-2" />
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-[0.2em] text-muted">
        <span>
          Sistem Durumu · <span className="text-gold">{AGENT_DEFINITIONS.length}/20 AJAN HAZIR</span>
        </span>
        <span>{new Intl.DateTimeFormat('tr-TR', { dateStyle: 'full', timeStyle: 'short' }).format(snapshot.generatedAt)}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <CommandCenterHero
          dateLabel={new Intl.DateTimeFormat('tr-TR', { dateStyle: 'full' }).format(snapshot.generatedAt)}
          briefing={briefing}
        />
        <ActivityFeed items={activity} />
      </div>

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
