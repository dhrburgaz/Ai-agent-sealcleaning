'use client';

import { useEffect } from 'react';
import { touchSessionAction } from '@/app/dashboard/session-actions';

const HEARTBEAT_INTERVAL_MS = 60_000;

/** Keeps the session's idle-timeout clock alive while the owner is actively viewing the dashboard. */
export function SessionHeartbeat() {
  useEffect(() => {
    const interval = setInterval(() => {
      touchSessionAction().catch(() => {
        // Best-effort: a failed heartbeat just means the next navigation re-checks auth normally.
      });
    }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return null;
}
