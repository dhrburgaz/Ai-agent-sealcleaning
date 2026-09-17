'use client';

import { useMemo, useState } from 'react';
import { AICore } from './core/AICore';
import { AGENT_GROUPS, type AgentGroupKey } from '@/lib/agents/agent-groups';
import type { AgentNetworkNode, AgentNetworkState } from '@/lib/server/agent-network';

const STATE_COLOR: Record<AgentNetworkState, string> = {
  idle: 'rgb(var(--color-muted))',
  working: 'rgb(var(--color-gold))',
  waiting: 'rgb(217 119 6)',
  blocked: 'rgb(217 119 6)',
  error: 'rgb(220 38 38)',
};

const STATE_LABEL_TR: Record<AgentNetworkState, string> = {
  idle: 'Beklemede',
  working: 'Çalışıyor',
  waiting: 'Onay bekliyor',
  blocked: 'Engellendi',
  error: 'Hata',
};

const GROUP_ORDER: AgentGroupKey[] = ['control', 'commercial', 'operations', 'communication', 'intelligence'];
const SECTOR_PADDING_DEG = 10;

/** Evenly divides the full circle into one non-overlapping angular sector per
 *  group (regardless of how many agents each group has), so two groups can
 *  never place a node at the same angle — unlike a hand-picked range table,
 *  this stays correct if a group's membership ever changes. */
function sectorFor(groupKey: AgentGroupKey): [number, number] {
  const sectorWidth = 360 / GROUP_ORDER.length;
  const index = GROUP_ORDER.indexOf(groupKey);
  return [index * sectorWidth + SECTOR_PADDING_DEG, (index + 1) * sectorWidth - SECTOR_PADDING_DEG];
}

function polarToXY(angleDeg: number, radius: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  // Rounded to a fixed precision so the server-rendered and client-hydrated
  // inline styles are always byte-identical, even if Math.cos/sin ever
  // differ at the last ULP between the server and browser JS engines.
  return {
    x: Math.round((50 + radius * Math.cos(rad)) * 1000) / 1000,
    y: Math.round((50 + radius * Math.sin(rad)) * 1000) / 1000,
  };
}

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'az önce';
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function AgentNetwork({ nodes }: { nodes: AgentNetworkNode[] }) {
  const [selected, setSelected] = useState<AgentNetworkNode | null>(null);
  const nodeByKey = useMemo(() => new Map(nodes.map((n) => [n.definition.key, n])), [nodes]);

  const positioned = (Object.entries(AGENT_GROUPS) as [AgentGroupKey, (typeof AGENT_GROUPS)[AgentGroupKey]][]).flatMap(
    ([groupKey, group]) => {
      const [start, end] = sectorFor(groupKey);
      const count = group.agentKeys.length;
      return group.agentKeys.map((key, i) => {
        const angle = count === 1 ? (start + end) / 2 : start + ((end - start) * i) / (count - 1);
        const node = nodeByKey.get(key);
        return node ? { node, angle, groupKey, groupLabel: group.label } : null;
      });
    },
  ).filter((v): v is NonNullable<typeof v> => v !== null);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="glass-panel grid-overlay relative aspect-square w-full overflow-hidden rounded-2xl">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <AICore state="thinking" size="lg" />
        </div>

        <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full">
          <circle cx="50" cy="50" r="38" fill="none" stroke="rgb(var(--color-border))" strokeWidth="0.2" />
        </svg>

        {positioned.map(({ node, angle }) => {
          const { x, y } = polarToXY(angle, 38);
          const color = STATE_COLOR[node.state];
          const isActive = node.state !== 'idle';
          return (
            <button
              key={node.definition.key}
              type="button"
              onClick={() => setSelected(node)}
              className="group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
              style={{ left: `${x}%`, top: `${y}%` }}
              title={node.definition.displayName}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full border text-[10px] font-semibold transition group-hover:scale-110 ${
                  isActive ? 'animate-core-pulse' : ''
                }`}
                style={{ borderColor: color, color, boxShadow: isActive ? `0 0 12px -2px ${color}` : undefined }}
              >
                {node.definition.key.replace(/^agent(\d+).*/, '$1')}
              </span>
              <span className="max-w-[70px] truncate text-[9px] text-muted opacity-0 transition group-hover:opacity-100">
                {node.definition.displayName}
              </span>
            </button>
          );
        })}
      </div>

      <div className="glass-panel rounded-2xl p-5">
        {!selected && (
          <>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold">Ajan Ağı</h2>
            <p className="text-sm text-muted">
              {nodes.length}/20 ajan tanımlı. Bir ajana tıklayarak son çalıştırmasını, girdi/çıktısını ve güven
              skorunu görebilirsiniz.
            </p>
            <ul className="mt-4 space-y-2 text-xs">
              {(Object.keys(STATE_LABEL_TR) as AgentNetworkState[]).map((s) => (
                <li key={s} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: STATE_COLOR[s] }} />
                  <span className="text-muted">{STATE_LABEL_TR[s]}</span>
                </li>
              ))}
            </ul>
          </>
        )}
        {selected && (
          <div className="animate-fade-in-up">
            <button type="button" onClick={() => setSelected(null)} className="mb-3 text-xs text-muted hover:text-ink">
              ← Geri
            </button>
            <div className="mb-1 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: STATE_COLOR[selected.state] }} />
              <h2 className="text-sm font-semibold text-ink">{selected.definition.displayName}</h2>
            </div>
            <p className="mb-3 text-xs text-muted">{STATE_LABEL_TR[selected.state]}</p>
            <p className="mb-4 text-sm text-ink/90">{selected.definition.purpose}</p>

            <dl className="space-y-2 text-xs">
              <div>
                <dt className="text-muted">Maliyet katmanı</dt>
                <dd className="text-ink">{selected.definition.costTier}</dd>
              </div>
              <div>
                <dt className="text-muted">Yapı durumu</dt>
                <dd className="text-ink">{selected.definition.buildStatus}</dd>
              </div>
              {selected.lastRun ? (
                <>
                  <div>
                    <dt className="text-muted">Son çalıştırma</dt>
                    <dd className="text-ink">{formatRelativeTime(selected.lastRun.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Neden aktif oldu</dt>
                    <dd className="text-ink">{selected.lastRun.triggeredBy ?? 'bilinmiyor'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Sonuç</dt>
                    <dd className="break-words font-mono text-[10px] text-ink/80">
                      {JSON.stringify(selected.lastRun.outputSummary ?? {})}
                    </dd>
                  </div>
                  {selected.lastRun.confidence !== null && (
                    <div>
                      <dt className="text-muted">Güven</dt>
                      <dd className="text-ink">%{Math.round((selected.lastRun.confidence ?? 0) * 100)}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-muted">Sağlayıcı / önbellek</dt>
                    <dd className="text-ink">
                      {selected.lastRun.provider}
                      {selected.lastRun.cacheHit && ' · önbellek isabeti'}
                      {selected.lastRun.modelCostEur > 0 && ` · €${selected.lastRun.modelCostEur.toFixed(4)}`}
                    </dd>
                  </div>
                </>
              ) : (
                <p className="text-muted">Bu ajan henüz hiç çalıştırılmadı.</p>
              )}
            </dl>

            <p className="mt-4 border-t border-border pt-3 text-[11px] text-muted">{selected.definition.buildNote}</p>
          </div>
        )}
      </div>
    </div>
  );
}
