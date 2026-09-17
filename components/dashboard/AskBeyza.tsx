'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useRef, useState } from 'react';
import { askBeyzaAction, type AskBeyzaState } from '@/app/dashboard/actions';
import { AICore } from '@/components/beyza/core/AICore';
import type { BeyzaCoreState } from '@/components/beyza/types';
import {
  getSpeechRecognitionCtor,
  speakTurkish,
  getTtsEnabled,
  setTtsEnabled as persistTtsEnabled,
  type SpeechRecognitionLike,
} from '@/lib/beyza-voice';

const initialState: AskBeyzaState = {};

export function AskBeyza({ leadId }: { leadId?: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(askBeyzaAction, initialState);
  const [commandText, setCommandText] = useState('');
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [ttsEnabled, setTtsEnabledState] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    setVoiceSupported(getSpeechRecognitionCtor() !== null);
    setTtsEnabledState(getTtsEnabled());
  }, []);

  useEffect(() => {
    if (state.answer && ttsEnabled) {
      speakTurkish(state.answer, { onStart: () => setSpeaking(true), onEnd: () => setSpeaking(false) });
    }
  }, [state.answer, ttsEnabled]);

  useEffect(() => {
    if (!state.navigateTo) return;
    const t = setTimeout(() => router.push(state.navigateTo!), 900);
    return () => clearTimeout(t);
  }, [state.navigateTo, router]);

  function toggleTts() {
    const next = !ttsEnabled;
    setTtsEnabledState(next);
    persistTtsEnabled(next);
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

  const coreState: BeyzaCoreState = speaking ? 'speaking' : listening ? 'listening' : pending ? 'thinking' : 'ready';

  return (
    <div className="glass-panel rounded-2xl p-6 shadow-premium">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AICore state={coreState} size="sm" />
          <h2 className="text-sm font-medium uppercase tracking-wide text-gold">Beyza&apos;ya Sor</h2>
        </div>
        <div className="flex items-center gap-3">
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
          <Link href="/dashboard/beyza" className="text-xs text-muted hover:text-accent hover:underline">
            Tam ekran sesli mod →
          </Link>
        </div>
      </div>
      <form ref={formRef} action={formAction} className="flex gap-2">
        {leadId && <input type="hidden" name="leadId" value={leadId} />}
        <input
          name="command"
          placeholder="Beyza, durumlar ne?"
          required
          value={commandText}
          onChange={(e) => setCommandText(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-4 py-3 text-ink outline-none focus:border-accent"
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
          className="rounded-lg bg-accent px-5 py-3 font-medium text-white shadow-glow-sm hover:opacity-90 disabled:opacity-50"
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
