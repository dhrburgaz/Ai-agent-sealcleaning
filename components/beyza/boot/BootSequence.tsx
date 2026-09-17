'use client';

import { useEffect, useState } from 'react';
import { AICore } from '../core/AICore';
import { playBeyzaSound } from '@/lib/beyza-sound';

export interface BootLine {
  label: string;
  status: string;
}

const FULL_BOOT_LINES: BootLine[] = [
  { label: 'VERİTABANI', status: 'AKTİF' },
  { label: 'CRM', status: 'AKTİF' },
  { label: 'FİYAT MOTORU', status: 'AKTİF' },
  { label: 'TEDARİK AĞI', status: 'HAZIR' },
  { label: 'AJAN AĞI', status: '20/20' },
  { label: 'MALİYET KORUMASI', status: 'AKTİF (€0)' },
  { label: 'SES SİSTEMİ', status: 'HAZIR' },
];

const LINE_INTERVAL_MS = 220;
const POST_LINES_PAUSE_MS = 350;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener('change', handler);
    return () => query.removeEventListener('change', handler);
  }, []);
  return reduced;
}

/**
 * The full cinematic boot (login / manual "reboot"). Shows real, honest
 * module statuses (no fabricated activity) then hands off to the caller.
 * Skippable at any point; instant (no stepped reveal) under
 * prefers-reduced-motion.
 */
export function BootSequence({ onComplete }: { onComplete: () => void }) {
  const reducedMotion = usePrefersReducedMotion();
  const [visibleLines, setVisibleLines] = useState(reducedMotion ? FULL_BOOT_LINES.length : 0);
  const [phase, setPhase] = useState<'lines' | 'verified' | 'welcome'>('lines');

  useEffect(() => {
    playBeyzaSound('startup');
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setPhase('verified');
      const t = setTimeout(() => setPhase('welcome'), 300);
      return () => clearTimeout(t);
    }
    if (visibleLines < FULL_BOOT_LINES.length) {
      const t = setTimeout(() => setVisibleLines((n) => n + 1), LINE_INTERVAL_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setPhase('verified'), POST_LINES_PAUSE_MS);
    return () => clearTimeout(t);
  }, [visibleLines, reducedMotion]);

  useEffect(() => {
    if (phase !== 'verified') return;
    const t = setTimeout(() => setPhase('welcome'), reducedMotion ? 150 : 650);
    return () => clearTimeout(t);
  }, [phase, reducedMotion]);

  useEffect(() => {
    if (phase !== 'welcome') return;
    const t = setTimeout(onComplete, reducedMotion ? 200 : 900);
    return () => clearTimeout(t);
  }, [phase, reducedMotion, onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
      <div className="grid-overlay pointer-events-none absolute inset-0 opacity-40" />
      <div className="mosque-skyline-backdrop pointer-events-none absolute inset-x-0 bottom-0 h-40 opacity-60" />

      <button
        type="button"
        onClick={onComplete}
        className="absolute right-6 top-6 rounded-lg border border-border/60 px-3 py-1.5 text-xs text-muted transition hover:border-accent hover:text-ink"
      >
        Atla
      </button>

      <AICore state={phase === 'lines' ? 'initializing' : 'ready'} size="xl" />

      <div className="relative mt-8 w-full max-w-md px-6 text-center">
        <h1 className="mb-1 text-2xl font-semibold tracking-[0.3em] text-ink">BEYZA SECURITY</h1>
        <p className="mb-6 text-xs tracking-[0.35em] text-muted">SİSTEM BAŞLATILIYOR</p>

        <div className="space-y-1.5 text-left font-mono text-xs text-muted">
          {FULL_BOOT_LINES.slice(0, visibleLines).map((line) => (
            <div key={line.label} className="flex justify-between animate-fade-in-up">
              <span>{line.label}</span>
              <span className="text-glow text-accent">{line.status}</span>
            </div>
          ))}
        </div>

        {phase !== 'lines' && (
          <div className="mt-6 animate-fade-in-up text-sm text-ink">
            <p>Kimlik doğrulandı.</p>
            {phase === 'welcome' && <p className="mt-1 text-gold">Hoş geldiniz.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

/** Abbreviated wake shown on a normal return to the dashboard (not a fresh
 * login) — brief, no module checklist, never annoying on repeat navigation. */
export function WakeSequence({ onComplete }: { onComplete: () => void }) {
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    playBeyzaSound('wake');
    const t = setTimeout(onComplete, reducedMotion ? 50 : 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (reducedMotion) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black animate-fade-in-up" style={{ animationDuration: '0.7s', animationFillMode: 'forwards', animationName: 'fade-out-wake' }}>
      <AICore state="ready" size="lg" />
      <style>{`
        @keyframes fade-out-wake {
          0% { opacity: 1; }
          60% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
