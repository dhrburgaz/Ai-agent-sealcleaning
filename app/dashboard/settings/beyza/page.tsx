'use client';

import { useEffect, useState } from 'react';
import { getPreferences, setPreference, type BeyzaPreferences } from '@/lib/beyza-preferences';
import { getSoundLevel, setSoundLevel, type SoundLevel } from '@/lib/beyza-sound';
import { AvatarRenderer } from '@/components/beyza/avatar/AvatarRenderer';

/**
 * Redesign instruction #23's "Avatar Settings". Client-only page: every
 * value here is a per-browser UI preference (lib/beyza-preferences.ts,
 * lib/beyza-sound.ts), not business data, so there's nothing to fetch from
 * the server and no Server Action to write to.
 */
export default function BeyzaSettingsPage() {
  const [prefs, setPrefs] = useState<BeyzaPreferences | null>(null);
  const [sound, setSound] = useState<SoundLevel>('off');

  useEffect(() => {
    setPrefs(getPreferences());
    setSound(getSoundLevel());
  }, []);

  function update<K extends keyof BeyzaPreferences>(key: K, value: BeyzaPreferences[K]) {
    setPreference(key, value);
    setPrefs((p) => (p ? { ...p, [key]: value } : p));
  }

  if (!prefs) return null;

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold text-ink">Beyza Ayarları</h1>
      <p className="text-sm text-muted">
        Bu tercihler yalnızca bu tarayıcıda saklanır (iş verisi değildir). Ses/animasyon her zaman
        tarayıcı desteğine ve €0 bütçe kuralına uygun şekilde çalışır — bkz. docs/AVATAR.md.
      </p>

      <section className="flex items-center gap-4 glass-panel rounded-xl p-5">
        <AvatarRenderer style={prefs.avatarStyle} state="ready" size="md" />
        <div>
          <div className="text-sm font-medium text-ink">Önizleme</div>
          <div className="text-xs text-muted">
            {prefs.avatarStyle === 'cinematic_human'
              ? 'Cinematic Human seçili — henüz uygulanmadı, AI Core olarak gösteriliyor.'
              : 'AI Core'}
          </div>
        </div>
      </section>

      <section className="space-y-4 glass-panel rounded-xl p-5">
        <label className="flex items-center justify-between text-sm">
          <span className="text-ink">Avatar</span>
          <select
            value={prefs.avatarEnabled ? 'on' : 'off'}
            onChange={(e) => update('avatarEnabled', e.target.value === 'on')}
            className="rounded-lg border border-border bg-surface px-3 py-1.5"
          >
            <option value="on">AÇIK</option>
            <option value="off">KAPALI</option>
          </select>
        </label>

        <label className="flex items-center justify-between text-sm">
          <span className="text-ink">Avatar stili</span>
          <select
            value={prefs.avatarStyle}
            onChange={(e) => update('avatarStyle', e.target.value as BeyzaPreferences['avatarStyle'])}
            className="rounded-lg border border-border bg-surface px-3 py-1.5"
          >
            <option value="ai_core">AI CORE</option>
            <option value="cinematic_human">CINEMATIC HUMAN (yakında)</option>
          </select>
        </label>

        <label className="flex items-center justify-between text-sm">
          <span className="text-ink">Konuşma hızı ({prefs.speakingRate.toFixed(1)}x)</span>
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.1}
            value={prefs.speakingRate}
            onChange={(e) => update('speakingRate', Number(e.target.value))}
            className="w-40"
          />
        </label>

        <label className="flex items-center justify-between text-sm">
          <span className="text-ink">Ses seviyesi</span>
          <select
            value={sound}
            onChange={(e) => {
              const next = e.target.value as SoundLevel;
              setSoundLevel(next);
              setSound(next);
            }}
            className="rounded-lg border border-border bg-surface px-3 py-1.5"
          >
            <option value="off">KAPALI</option>
            <option value="low">DÜŞÜK</option>
            <option value="normal">NORMAL</option>
          </select>
        </label>

        <label className="flex items-center justify-between text-sm">
          <span className="text-ink">Animasyon kalitesi</span>
          <select
            value={prefs.animationQuality}
            onChange={(e) => update('animationQuality', e.target.value as BeyzaPreferences['animationQuality'])}
            className="rounded-lg border border-border bg-surface px-3 py-1.5"
          >
            <option value="auto">OTOMATİK</option>
            <option value="high">YÜKSEK</option>
            <option value="balanced">DENGELİ</option>
            <option value="battery_saver">PİL TASARRUFU</option>
          </select>
        </label>

        <label className="flex items-center justify-between text-sm">
          <span className="text-ink">Otomatik karşılama</span>
          <select
            value={prefs.autoGreeting ? 'on' : 'off'}
            onChange={(e) => update('autoGreeting', e.target.value === 'on')}
            className="rounded-lg border border-border bg-surface px-3 py-1.5"
          >
            <option value="on">AÇIK</option>
            <option value="off">KAPALI</option>
          </select>
        </label>

        <label className="flex items-center justify-between text-sm">
          <span className="text-ink">Açılış (boot) dizisi</span>
          <select
            value={prefs.bootMode}
            onChange={(e) => update('bootMode', e.target.value as BeyzaPreferences['bootMode'])}
            className="rounded-lg border border-border bg-surface px-3 py-1.5"
          >
            <option value="full">TAM</option>
            <option value="short">KISA</option>
            <option value="off">KAPALI</option>
          </select>
        </label>
      </section>
    </div>
  );
}
