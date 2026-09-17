'use client';

import { useEffect } from 'react';

/** Phase 8 — registers the minimal service worker (public/sw.js) for PWA
 *  installability. Feature-detected and silently a no-op where unsupported,
 *  same "degrades cleanly" rule as the rest of the app. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Registration failing (e.g. unsupported browser, blocked storage) must
      // never break the app — the dashboard works identically without it.
    });
  }, []);

  return null;
}
