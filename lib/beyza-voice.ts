/**
 * Shared Web Speech API helpers (section 28). Extracted so both the compact
 * AskBeyza widget (lead-scoped Q&A) and the full-screen voice/call
 * experiences (components/beyza/*) use the exact same browser-native
 * speech-recognition/TTS detection and Turkish-voice preference — one
 * implementation, not three drifting copies.
 */

export interface SpeechRecognitionResultLike {
  results: { [index: number]: { [index: number]: { transcript: string } } };
}
export interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionResultLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && !!window.speechSynthesis;
}

/**
 * Speaks Turkish text via the browser's built-in TTS, preferring an
 * available Turkish male voice per the master spec's stated preference,
 * falling back to any Turkish voice, then the browser default. Returns the
 * SpeechSynthesisUtterance so callers can hook onstart/onend/onboundary for
 * UI state (e.g. driving the AI Core into "speaking").
 */
export function speakTurkish(
  text: string,
  handlers?: { onStart?: () => void; onEnd?: () => void; onBoundary?: () => void; rate?: number },
): SpeechSynthesisUtterance | null {
  if (!isSpeechSynthesisSupported()) return null;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'tr-TR';
  if (handlers?.rate) utterance.rate = handlers.rate;
  const voices = window.speechSynthesis.getVoices();
  const turkishVoice =
    voices.find((v) => v.lang.startsWith('tr') && /male|erkek/i.test(v.name)) ??
    voices.find((v) => v.lang.startsWith('tr'));
  if (turkishVoice) utterance.voice = turkishVoice;
  if (handlers?.onStart) utterance.onstart = handlers.onStart;
  if (handlers?.onEnd) utterance.onend = handlers.onEnd;
  if (handlers?.onBoundary) utterance.onboundary = handlers.onBoundary;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return utterance;
}

export function stopSpeaking(): void {
  if (isSpeechSynthesisSupported()) window.speechSynthesis.cancel();
}

const TTS_STORAGE_KEY = 'beyza_tts_enabled';

export function getTtsEnabled(): boolean {
  try {
    return window.localStorage.getItem(TTS_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Same preference, but for surfaces (the full-screen call mode) where voice
 * output is the whole point and should default ON the first time — as
 * opposed to the compact AskBeyza widget, which defaults OFF until the
 * owner opts in. Once the owner has ever explicitly chosen either way
 * (anywhere), that choice is respected everywhere.
 */
export function getTtsEnabledDefaultOn(): boolean {
  try {
    const stored = window.localStorage.getItem(TTS_STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  } catch {
    return true;
  }
}

export function setTtsEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(TTS_STORAGE_KEY, String(enabled));
  } catch {
    // Best-effort preference only.
  }
}
