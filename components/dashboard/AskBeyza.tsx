'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { askBeyzaAction, type AskBeyzaState } from '@/app/dashboard/actions';

const initialState: AskBeyzaState = {};

// Section 28 — browser-native voice I/O (Web Speech API). Entirely client-side,
// zero cost, no paid API: feature-detected and gracefully hidden when the
// browser doesn't support it, per section 2's "system remains useful with
// zero AI keys" rule extended to "and with no speech support either."
interface SpeechRecognitionResultLike {
  results: { [index: number]: { [index: number]: { transcript: string } } };
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionResultLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function speakTurkish(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'tr-TR';
  const voices = window.speechSynthesis.getVoices();
  const turkishVoice =
    voices.find((v) => v.lang.startsWith('tr') && /male|erkek/i.test(v.name)) ??
    voices.find((v) => v.lang.startsWith('tr'));
  if (turkishVoice) utterance.voice = turkishVoice;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export function AskBeyza({ leadId }: { leadId?: string }) {
  const [state, formAction, pending] = useActionState(askBeyzaAction, initialState);
  const [commandText, setCommandText] = useState('');
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    setVoiceSupported(getSpeechRecognitionCtor() !== null);
    try {
      setTtsEnabled(localStorage.getItem('beyza_tts_enabled') === 'true');
    } catch {
      // localStorage can throw in a private window; TTS just stays off.
    }
  }, []);

  useEffect(() => {
    if (state.answer && ttsEnabled) {
      speakTurkish(state.answer);
    }
  }, [state.answer, ttsEnabled]);

  function toggleTts() {
    const next = !ttsEnabled;
    setTtsEnabled(next);
    try {
      localStorage.setItem('beyza_tts_enabled', String(next));
    } catch {
      // Best-effort preference only.
    }
  }

  function startListening() {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    const recognition = new Ctor();
    recognition.lang = 'tr-TR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      if (transcript) {
        setCommandText(transcript);
        formRef.current?.requestSubmit();
      }
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  return (
    <div className="rounded-2xl border border-border bg-surface-raised/80 p-6 shadow-premium backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide text-gold">Beyza&apos;ya Sor</h2>
        {voiceSupported && (
          <button
            type="button"
            onClick={toggleTts}
            className={`text-xs ${ttsEnabled ? 'text-accent' : 'text-muted'} hover:underline`}
            aria-pressed={ttsEnabled}
          >
            {ttsEnabled ? '🔊 Sesli yanıt açık' : '🔇 Sesli yanıt kapalı'}
          </button>
        )}
      </div>
      <form ref={formRef} action={formAction} className="flex gap-2">
        {leadId && <input type="hidden" name="leadId" value={leadId} />}
        <input
          name="command"
          placeholder="Beyza, durumlar ne?"
          required
          value={commandText}
          onChange={(e) => setCommandText(e.target.value)}
          className="flex-1 rounded-lg border border-border bg-surface px-4 py-3 text-ink outline-none focus:border-accent"
        />
        {voiceSupported && (
          <button
            type="button"
            onClick={listening ? stopListening : startListening}
            className={`rounded-lg border px-4 py-3 text-sm ${
              listening ? 'border-accent text-accent' : 'border-border text-ink'
            } hover:border-accent`}
            aria-pressed={listening}
            title="Türkçe sesli komut"
          >
            {listening ? '● Dinleniyor' : '🎤'}
          </button>
        )}
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-5 py-3 font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {pending ? '…' : 'Sor'}
        </button>
      </form>
      {state.answer && (
        <p className="mt-4 whitespace-pre-line rounded-lg bg-surface p-4 text-sm text-ink/90">{state.answer}</p>
      )}
    </div>
  );
}
