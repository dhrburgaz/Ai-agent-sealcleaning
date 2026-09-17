'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BootSequence, WakeSequence } from './BootSequence';
import { getPreferences } from '@/lib/beyza-preferences';

const SESSION_FLAG = 'beyza_boot_seen';

/**
 * Decides which boot experience (if any) to show when the dashboard shell
 * mounts: the full cinematic boot right after login (`?boot=full` on the
 * redirect from app/login/actions.ts), a short "wake" the first time this
 * browser tab lands on the dashboard without that flag, or nothing at all
 * once this tab has already seen either this session — so navigating
 * between dashboard pages never re-triggers it (see CLAUDE.md's app-router
 * layout-persistence note: this component only remounts on a hard
 * navigation, not on client-side route changes within /dashboard).
 */
export function BootGate() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<'full' | 'wake' | null>(null);

  useEffect(() => {
    const { bootMode } = getPreferences();
    if (bootMode === 'off') {
      setMode(null);
      return;
    }

    let alreadySeen = false;
    try {
      alreadySeen = window.sessionStorage.getItem(SESSION_FLAG) === 'true';
    } catch {
      // Private window: treat as not-yet-seen, just never persists.
    }

    if (searchParams.get('boot') === 'full' && bootMode === 'full') {
      setMode('full');
      return;
    }
    if (!alreadySeen) {
      setMode('wake');
    }
  }, [searchParams]);

  function markSeenAndClear() {
    try {
      window.sessionStorage.setItem(SESSION_FLAG, 'true');
    } catch {
      // Best-effort only.
    }
    setMode(null);
    if (searchParams.get('boot')) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('boot');
      const query = params.toString();
      router.replace(query ? `/dashboard?${query}` : '/dashboard');
    }
  }

  if (mode === 'full') return <BootSequence onComplete={markSeenAndClear} />;
  if (mode === 'wake') return <WakeSequence onComplete={markSeenAndClear} />;
  return null;
}
