'use client';

import { useEffect } from 'react';
import { getPreferences } from '@/lib/beyza-preferences';

/**
 * Applies the "Animasyon kalitesi > Pil tasarrufu" preference
 * (Settings > Beyza Ayarları) as a global class, so the setting has a real
 * effect instead of being stored but inert. 'auto'/'high'/'balanced' all
 * leave animations at full quality today — 'battery_saver' is the one
 * level that visibly does something, matching what the redesign brief
 * actually asked this control to guarantee (a way to turn heavy motion
 * off), rather than fabricating four genuinely different rendering tiers.
 */
export function AnimationQualityGate() {
  useEffect(() => {
    const { animationQuality } = getPreferences();
    document.documentElement.classList.toggle('beyza-battery-saver', animationQuality === 'battery_saver');
  }, []);

  return null;
}
