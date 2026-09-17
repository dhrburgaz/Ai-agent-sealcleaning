/**
 * Client-side BEYZA presence preferences (redesign instruction #23's
 * "Avatar Settings"). Stored in localStorage next to the existing
 * beyza_tts_enabled/beyza_sound_level keys (lib/beyza-voice.ts,
 * lib/beyza-sound.ts) — this app has no per-owner settings sync need
 * beyond "this browser remembers what I chose", so a DB round-trip isn't
 * warranted for cosmetic/interaction preferences like these.
 */

export type AvatarStyle = 'ai_core' | 'cinematic_human';
export type AnimationQuality = 'auto' | 'high' | 'balanced' | 'battery_saver';
export type BootMode = 'full' | 'short' | 'off';

export interface BeyzaPreferences {
  avatarEnabled: boolean;
  avatarStyle: AvatarStyle;
  animationQuality: AnimationQuality;
  autoGreeting: boolean;
  bootMode: BootMode;
  speakingRate: number; // 0.5 .. 2, passed to SpeechSynthesisUtterance.rate
}

export const DEFAULT_PREFERENCES: BeyzaPreferences = {
  avatarEnabled: true,
  avatarStyle: 'ai_core',
  animationQuality: 'auto',
  autoGreeting: true,
  bootMode: 'full',
  speakingRate: 1,
};

const KEYS: Record<keyof BeyzaPreferences, string> = {
  avatarEnabled: 'beyza_pref_avatar_enabled',
  avatarStyle: 'beyza_pref_avatar_style',
  animationQuality: 'beyza_pref_animation_quality',
  autoGreeting: 'beyza_pref_auto_greeting',
  bootMode: 'beyza_pref_boot_mode',
  speakingRate: 'beyza_pref_speaking_rate',
};

function readString(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeString(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Best-effort preference only.
  }
}

export function getPreferences(): BeyzaPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  const avatarEnabled = readString(KEYS.avatarEnabled);
  const avatarStyle = readString(KEYS.avatarStyle);
  const animationQuality = readString(KEYS.animationQuality);
  const autoGreeting = readString(KEYS.autoGreeting);
  const bootMode = readString(KEYS.bootMode);
  const speakingRate = readString(KEYS.speakingRate);

  return {
    avatarEnabled: avatarEnabled === null ? DEFAULT_PREFERENCES.avatarEnabled : avatarEnabled === 'true',
    avatarStyle: avatarStyle === 'cinematic_human' ? 'cinematic_human' : 'ai_core',
    animationQuality: (['auto', 'high', 'balanced', 'battery_saver'] as const).includes(animationQuality as AnimationQuality)
      ? (animationQuality as AnimationQuality)
      : DEFAULT_PREFERENCES.animationQuality,
    autoGreeting: autoGreeting === null ? DEFAULT_PREFERENCES.autoGreeting : autoGreeting === 'true',
    bootMode: (['full', 'short', 'off'] as const).includes(bootMode as BootMode)
      ? (bootMode as BootMode)
      : DEFAULT_PREFERENCES.bootMode,
    speakingRate: speakingRate ? Math.min(2, Math.max(0.5, Number(speakingRate) || 1)) : DEFAULT_PREFERENCES.speakingRate,
  };
}

export function setPreference<K extends keyof BeyzaPreferences>(key: K, value: BeyzaPreferences[K]): void {
  writeString(KEYS[key], String(value));
}
