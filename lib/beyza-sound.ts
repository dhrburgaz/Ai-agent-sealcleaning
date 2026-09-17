/**
 * Section 9 sound design — small, ORIGINAL, procedurally generated tones via
 * the Web Audio API (oscillators + gain envelopes). No audio files, no
 * copyrighted movie/assistant sound effects. Silent until:
 *   1. the owner has not muted it (localStorage 'beyza_sound_level'), and
 *   2. the browser has registered a real user interaction (autoplay policies
 *      block audio before that anyway, but we gate explicitly too so this
 *      never even attempts to play and log a console warning).
 */

export type SoundLevel = 'off' | 'low' | 'normal';
export type BeyzaSoundKind =
  | 'startup'
  | 'wake'
  | 'listening'
  | 'task-complete'
  | 'warning'
  | 'connection'
  | 'call-connected';

const STORAGE_KEY = 'beyza_sound_level';
let userInteracted = false;
let audioCtx: AudioContext | null = null;

if (typeof window !== 'undefined') {
  const markInteracted = () => {
    userInteracted = true;
    window.removeEventListener('pointerdown', markInteracted);
    window.removeEventListener('keydown', markInteracted);
  };
  window.addEventListener('pointerdown', markInteracted, { once: true });
  window.addEventListener('keydown', markInteracted, { once: true });
}

export function getSoundLevel(): SoundLevel {
  if (typeof window === 'undefined') return 'off';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'off' || stored === 'low' || stored === 'normal') return stored;
  } catch {
    // localStorage can throw in a private window; default to off.
  }
  return 'off';
}

export function setSoundLevel(level: SoundLevel): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, level);
  } catch {
    // Best-effort preference only.
  }
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  audioCtx ??= new Ctor();
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
}

interface ToneStep {
  freq: number;
  startOffset: number;
  duration: number;
  type?: OscillatorType;
  peakGain?: number;
}

const TONE_RECIPES: Record<BeyzaSoundKind, ToneStep[]> = {
  startup: [
    { freq: 220, startOffset: 0, duration: 0.18, type: 'sine' },
    { freq: 330, startOffset: 0.14, duration: 0.18, type: 'sine' },
    { freq: 440, startOffset: 0.28, duration: 0.3, type: 'sine' },
  ],
  wake: [{ freq: 392, startOffset: 0, duration: 0.14, type: 'sine' }],
  listening: [{ freq: 660, startOffset: 0, duration: 0.08, type: 'sine', peakGain: 0.15 }],
  'task-complete': [
    { freq: 523, startOffset: 0, duration: 0.1, type: 'sine' },
    { freq: 784, startOffset: 0.08, duration: 0.16, type: 'sine' },
  ],
  warning: [
    { freq: 300, startOffset: 0, duration: 0.12, type: 'square', peakGain: 0.12 },
    { freq: 260, startOffset: 0.16, duration: 0.12, type: 'square', peakGain: 0.12 },
  ],
  connection: [
    { freq: 300, startOffset: 0, duration: 0.1, type: 'sine' },
    { freq: 500, startOffset: 0.1, duration: 0.1, type: 'sine' },
    { freq: 700, startOffset: 0.2, duration: 0.14, type: 'sine' },
  ],
  'call-connected': [
    { freq: 440, startOffset: 0, duration: 0.1, type: 'sine' },
    { freq: 554, startOffset: 0.1, duration: 0.1, type: 'sine' },
    { freq: 659, startOffset: 0.2, duration: 0.22, type: 'sine' },
  ],
};

export function playBeyzaSound(kind: BeyzaSoundKind): void {
  const level = getSoundLevel();
  if (level === 'off' || !userInteracted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const volumeMultiplier = level === 'low' ? 0.4 : 1;
  const now = ctx.currentTime;

  for (const step of TONE_RECIPES[kind]) {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.type = step.type ?? 'sine';
    oscillator.frequency.value = step.freq;

    const peak = (step.peakGain ?? 0.1) * volumeMultiplier;
    const start = now + step.startOffset;
    const end = start + step.duration;
    gainNode.gain.setValueAtTime(0, start);
    gainNode.gain.linearRampToValueAtTime(peak, start + Math.min(0.02, step.duration / 3));
    gainNode.gain.linearRampToValueAtTime(0, end);

    oscillator.connect(gainNode).connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(end + 0.02);
  }
}
