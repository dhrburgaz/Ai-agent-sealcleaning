'use client';

import { useEffect, useState } from 'react';
import { AskBeyza } from '@/components/dashboard/AskBeyza';
import { speakTurkish, getTtsEnabled } from '@/lib/beyza-voice';
import { getPreferences } from '@/lib/beyza-preferences';
import { AvatarRenderer } from './avatar/AvatarRenderer';
import type { BeyzaCoreState } from './types';

const GREETED_SESSION_KEY = 'beyza_greeted';

/**
 * Command Center hero (redesign instruction #6/#16): BEYZA at the center,
 * speaking a truthful, real-data status briefing exactly once per browser
 * session (never a fabricated "impressive activity" script) if the owner
 * has voice replies enabled, then settling into "ready" for the Ask Beyza
 * box below it.
 */
export function CommandCenterHero({ dateLabel, briefing }: { dateLabel: string; briefing: string }) {
  const [state, setState] = useState<BeyzaCoreState>('initializing');
  const [avatarEnabled, setAvatarEnabled] = useState(true);
  const [avatarStyle, setAvatarStyle] = useState<ReturnType<typeof getPreferences>['avatarStyle']>('ai_core');

  useEffect(() => {
    const prefs = getPreferences();
    setAvatarEnabled(prefs.avatarEnabled);
    setAvatarStyle(prefs.avatarStyle);
  }, []);

  useEffect(() => {
    let alreadyGreeted = false;
    try {
      alreadyGreeted = window.sessionStorage.getItem(GREETED_SESSION_KEY) === 'true';
    } catch {
      // Private window: just won't persist across reloads this session.
    }

    const prefs = getPreferences();
    if (alreadyGreeted || !prefs.autoGreeting || !getTtsEnabled()) {
      setState('ready');
      return;
    }

    const timer = setTimeout(() => {
      const utterance = speakTurkish(`Hoş geldiniz. ${briefing}`, {
        onStart: () => setState('speaking'),
        onEnd: () => setState('ready'),
        rate: prefs.speakingRate,
      });
      if (!utterance) setState('ready');
      try {
        window.sessionStorage.setItem(GREETED_SESSION_KEY, 'true');
      } catch {
        // Best-effort only.
      }
    }, 900); // let the boot/wake sequence (if any) settle first

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="glass-panel grid-overlay relative overflow-hidden rounded-2xl">
      <div className="mosque-skyline-backdrop pointer-events-none absolute inset-x-0 bottom-0 h-32 opacity-70" />
      <div className="relative flex flex-col items-center gap-6 p-8 text-center lg:flex-row lg:items-start lg:text-left">
        {avatarEnabled ? (
          <AvatarRenderer style={avatarStyle} state={state} size="lg" className="shrink-0" />
        ) : (
          <div className="flex h-[180px] w-[180px] shrink-0 items-center justify-center rounded-full border border-border text-xs uppercase tracking-widest text-muted">
            Beyza (metin modu)
          </div>
        )}
        <div className="flex-1">
          <h1 className="mb-1 text-3xl font-semibold tracking-wide text-ink">Komuta Merkezi</h1>
          <p className="mb-4 text-sm text-muted">{dateLabel}</p>
          <p className="whitespace-pre-line text-sm leading-relaxed text-ink/90">{briefing}</p>
        </div>
      </div>
      <div className="hud-divider" />
      <div className="p-6 pt-5">
        <AskBeyza />
      </div>
    </section>
  );
}
