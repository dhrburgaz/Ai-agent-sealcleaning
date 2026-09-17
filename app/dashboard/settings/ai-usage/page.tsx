import { buildAiUsageStats } from '@/lib/server/ai-usage-stats';
import { db } from '@/db/client';
import { agentRuns } from '@/db/schema';
import { desc } from 'drizzle-orm';

export default async function AiUsagePage() {
  const stats = await buildAiUsageStats();
  const recentRuns = await db.select().from(agentRuns).orderBy(desc(agentRuns.createdAt)).limit(20);

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink">AI Kullanım Panosu</h1>
        <p className="text-sm text-muted">
          Section 14/15: token/maliyet disiplini görünürlüğü. Varsayılan €0 bütçede hiçbir ücretli çağrı yapılmaz —
          aşağıdaki sayılar sıfırsa bu beklenen ve doğru davranıştır.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Aylık bütçe" value={`€${stats.monthlyCapEur.toFixed(2)}`} />
        <StatCard label="Bu ay harcanan" value={`€${stats.spentThisMonthEur.toFixed(2)}`} />
        <StatCard label="Günlük bütçe" value={`€${stats.dailyCapEur.toFixed(2)}`} />
        <StatCard label="Bugün harcanan" value={`€${stats.spentTodayEur.toFixed(2)}`} />
      </section>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Toplam çağrı" value={stats.totalCalls} />
        <StatCard label="Engellenen çağrı" value={stats.blockedCalls} warn={stats.blockedCalls > 0} />
        <StatCard label="Önbellek isabeti" value={stats.cacheHits} />
        <StatCard label="Önbellek oranı" value={`${stats.cacheHitRatePercent.toFixed(0)}%`} />
      </section>

      {stats.byProvider.length > 0 && (
        <section className="rounded-xl border border-border bg-surface-raised p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gold">Sağlayıcıya göre</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted">
              <tr>
                <th className="py-1">Sağlayıcı</th>
                <th className="py-1">Çağrı</th>
                <th className="py-1">Maliyet</th>
              </tr>
            </thead>
            <tbody>
              {stats.byProvider.map((p) => (
                <tr key={p.provider} className="border-t border-border">
                  <td className="py-1">{p.provider}</td>
                  <td className="py-1">{p.calls}</td>
                  <td className="py-1">€{p.costEur.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="rounded-xl border border-border bg-surface-raised p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gold">Son ajan çalışmaları (audit)</h2>
        <ul className="space-y-1 text-xs text-muted">
          {recentRuns.map((run) => (
            <li key={run.id}>
              {new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(run.createdAt)} —{' '}
              <span className="text-ink">{run.agentKey}</span> · {run.provider} · {run.status}
              {run.cacheHit && ' · önbellek'}
            </li>
          ))}
          {recentRuns.length === 0 && <li>Henüz ajan çalışması kaydı yok.</li>}
        </ul>
      </section>
    </div>
  );
}

function StatCard({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-surface-raised p-4">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${warn ? 'text-accent' : 'text-ink'}`}>{value}</div>
    </div>
  );
}
