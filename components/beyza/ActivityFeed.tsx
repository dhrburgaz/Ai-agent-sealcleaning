import type { ActivityFeedItem } from '@/lib/server/activity-feed';

function formatTime(d: Date): string {
  return new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(d);
}

const STATUS_DOT: Record<string, string> = {
  completed: 'bg-emerald-500',
  failed: 'bg-red-500',
  blocked: 'bg-amber-500',
};

/**
 * Command Center "live feed" (redesign instruction #6). Renders real
 * agent_runs rows only — an empty list renders an honest empty state rather
 * than fabricated sample rows, matching the master spec's "never fabricate"
 * rule extended to UI chrome, not just business data.
 */
export function ActivityFeed({ items }: { items: ActivityFeedItem[] }) {
  return (
    <div className="glass-panel rounded-2xl p-5">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-gold">Canlı Akış</h2>
      {items.length === 0 && (
        <p className="text-sm text-muted">Henüz kaydedilmiş ajan aktivitesi yok.</p>
      )}
      <ol className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="flex gap-3 text-sm animate-fade-in-up">
            <div className="flex flex-col items-center pt-1">
              <span className={`h-2 w-2 rounded-full ${STATUS_DOT[item.status] ?? 'bg-muted'}`} />
              <span className="mt-1 h-full w-px bg-border" />
            </div>
            <div className="pb-1">
              <div className="text-xs text-muted">
                {formatTime(item.createdAt)} · {item.agentDisplayName}
                {item.cacheHit && ' · önbellek'}
              </div>
              <div className="text-ink/90">{item.description}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
