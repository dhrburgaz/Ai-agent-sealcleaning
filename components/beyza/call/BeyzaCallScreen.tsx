'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AvatarRenderer } from '../avatar/AvatarRenderer';
import { useMicLevel } from '../useMicLevel';
import { getPreferences } from '@/lib/beyza-preferences';
import { askBeyzaAction, type AskBeyzaState } from '@/app/dashboard/actions';
import { parseOwnerCommand } from '@/lib/agents/beyza-orchestrator';
import { AGENTS_FOR_INTENT } from '@/lib/agents/intent-agent-map';
import { AGENT_DEFINITIONS } from '@/lib/agents/definitions';
import {
  getSpeechRecognitionCtor,
  isSpeechSynthesisSupported,
  speakTurkish,
  stopSpeaking,
  getTtsEnabledDefaultOn,
  setTtsEnabled,
  type SpeechRecognitionLike,
} from '@/lib/beyza-voice';
import { playBeyzaSound } from '@/lib/beyza-sound';
import type { BeyzaCoreState } from '../types';

type CallPhase = 'connecting' | 'connected';

interface TranscriptEntry {
  id: string;
  role: 'owner' | 'beyza';
  text: string;
}

const AGENT_LABEL = new Map(AGENT_DEFINITIONS.map((a) => [a.key, a.displayName]));

export function BeyzaCallScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<CallPhase>('connecting');
  const [coreState, setCoreState] = useState<BeyzaCoreState>('initializing');
  const [micMuted, setMicMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [textInput, setTextInput] = useState('');
  const [activeAgents, setActiveAgents] = useState<string[]>([]);
  const [seconds, setSeconds] = useState(0);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const speakerOnRef = useRef(speakerOn);
  const level = useMicLevel(coreState === 'listening');

  speakerOnRef.current = speakerOn;

  useEffect(() => {
    setVoiceSupported(getSpeechRecognitionCtor() !== null);
    setSpeakerOn(getTtsEnabledDefaultOn());
    playBeyzaSound('connection');
    const connectTimer = setTimeout(() => {
      setPhase('connected');
      playBeyzaSound('call-connected');
      setCoreState('ready');
    }, 1100);
    return () => clearTimeout(connectTimer);
  }, []);

  useEffect(() => {
    if (phase !== 'connected') return;
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    // Auto-start listening once connected, if the mic isn't muted — this is
    // what makes the conversation feel continuous instead of a
    // press-to-talk-every-sentence form.
    if (phase === 'connected' && coreState === 'ready' && !micMuted && voiceSupported) {
      startListening();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, coreState, micMuted, voiceSupported]);

  useEffect(() => stopSpeaking, []); // never leave TTS talking after unmount

  function startListening() {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    const recognition = new Ctor();
    recognition.lang = 'tr-TR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const said = event.results[0]?.[0]?.transcript ?? '';
      if (said) void handleUtterance(said);
    };
    recognition.onend = () => {
      // Only clear the "listening" visual if nothing else has since taken
      // over (thinking/speaking) — recognition naturally ends after a
      // result or silence.
      setCoreState((prev) => (prev === 'listening' ? 'ready' : prev));
    };
    recognition.onerror = () => setCoreState('ready');
    recognitionRef.current = recognition;
    setCoreState('listening');
    recognition.start();
  }

  function stopListening() {
    recognitionRef.current?.stop();
  }

  async function handleUtterance(text: string) {
    setTranscript((t) => [...t, { id: crypto.randomUUID(), role: 'owner', text }]);
    const parsed = parseOwnerCommand(text);
    setActiveAgents(AGENTS_FOR_INTENT[parsed.intent] ?? []);
    setCoreState('thinking');

    const formData = new FormData();
    formData.set('command', text);
    let result: AskBeyzaState;
    try {
      result = await askBeyzaAction({}, formData);
    } catch {
      result = { answer: 'Bir sorun oluştu, tekrar deneyin.' };
    }
    setActiveAgents([]);

    const answer = result.answer ?? '…';
    setTranscript((t) => [...t, { id: crypto.randomUUID(), role: 'beyza', text: answer }]);

    // Only ever transition to 'ready' here — never call startListening()
    // directly. The effect below is the single place that decides whether
    // to start listening (it reacts to coreState becoming 'ready'), so
    // there is exactly one recognition cycle per turn instead of a race
    // between an explicit call here and the effect firing on the same
    // state change.
    if (speakerOnRef.current && isSpeechSynthesisSupported()) {
      speakTurkish(answer, {
        rate: getPreferences().speakingRate,
        onStart: () => setCoreState('speaking'),
        onEnd: () => setCoreState('ready'),
      });
    } else {
      setCoreState('ready');
    }

    if (result.navigateTo) {
      setTimeout(() => router.push(result.navigateTo!), 1400);
    }
  }

  function toggleMic() {
    if (!micMuted) {
      stopListening();
      setMicMuted(true);
      setCoreState('ready');
    } else {
      setMicMuted(false);
    }
  }

  function toggleSpeaker() {
    const next = !speakerOn;
    setSpeakerOn(next);
    setTtsEnabled(next);
    if (!next) stopSpeaking();
  }

  function endCall() {
    stopListening();
    stopSpeaking();
    router.push('/dashboard');
  }

  function submitText(e: React.FormEvent) {
    e.preventDefault();
    if (!textInput.trim()) return;
    const text = textInput.trim();
    setTextInput('');
    void handleUtterance(text);
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black">
      <div className="grid-overlay pointer-events-none absolute inset-0 opacity-30" />
      <div className="mosque-skyline-backdrop pointer-events-none absolute inset-x-0 bottom-0 h-40 opacity-50" />

      <div className="relative flex items-center justify-between p-6 text-sm text-muted">
        <span className="tracking-[0.3em]">BEYZA</span>
        <span>
          {phase === 'connecting'
            ? 'BAĞLANIYOR...'
            : `BAĞLANDI · ${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`}
        </span>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center gap-4 px-6">
        <AvatarRenderer
          style={getPreferences().avatarStyle}
          state={phase === 'connecting' ? 'initializing' : coreState}
          level={level}
          size="xl"
        />

        {activeAgents.length > 0 && (
          <div className="w-full max-w-xs space-y-1 font-mono text-xs text-muted animate-fade-in-up">
            {activeAgents.map((key) => (
              <div key={key} className="flex justify-between">
                <span>{(AGENT_LABEL.get(key) ?? key).toUpperCase()}</span>
                <span className="text-glow text-gold">AKTİF</span>
              </div>
            ))}
          </div>
        )}

        {!voiceSupported && phase === 'connected' && (
          <p className="max-w-sm text-center text-xs text-muted">
            Bu tarayıcıda sesli tanıma desteklenmiyor — aşağıdaki metin kutusunu kullanabilirsiniz.
          </p>
        )}

        <div className="mt-2 max-h-40 w-full max-w-md space-y-2 overflow-y-auto text-sm">
          {transcript.slice(-6).map((entry) => (
            <p key={entry.id} className={entry.role === 'owner' ? 'text-right text-ink/70' : 'text-left text-ink'}>
              <span className="text-xs text-muted">{entry.role === 'owner' ? 'Siz: ' : 'Beyza: '}</span>
              {entry.text}
            </p>
          ))}
        </div>
      </div>

      <div className="relative flex flex-col items-center gap-4 p-6">
        <form onSubmit={submitText} className="flex w-full max-w-md gap-2">
          <input
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Yazarak da konuşabilirsiniz..."
            className="min-w-0 flex-1 rounded-lg border border-border bg-surface-raised px-4 py-2.5 text-sm text-ink outline-none focus:border-accent"
          />
          <button type="submit" className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:opacity-90">
            Gönder
          </button>
        </form>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={toggleMic}
            disabled={!voiceSupported}
            aria-pressed={!micMuted}
            aria-label={micMuted ? 'Mikrofonu aç' : 'Mikrofonu kapat'}
            className={`flex h-12 w-12 items-center justify-center rounded-full border text-lg disabled:opacity-30 ${
              micMuted ? 'border-border text-muted' : 'border-accent text-accent shadow-glow-sm'
            }`}
            title={micMuted ? 'Mikrofonu aç' : 'Mikrofonu kapat'}
          >
            {micMuted ? '🎙️' : '🎤'}
          </button>
          <button
            type="button"
            onClick={endCall}
            aria-label="Görüşmeyi bitir"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-xl text-white shadow-glow-md hover:opacity-90"
            title="Görüşmeyi bitir"
          >
            ✕
          </button>
          <button
            type="button"
            onClick={toggleSpeaker}
            aria-pressed={speakerOn}
            aria-label={speakerOn ? 'Sesli yanıtı kapat' : 'Sesli yanıtı aç'}
            className={`flex h-12 w-12 items-center justify-center rounded-full border text-lg ${
              speakerOn ? 'border-accent text-accent shadow-glow-sm' : 'border-border text-muted'
            }`}
            title={speakerOn ? 'Sesli yanıtı kapat' : 'Sesli yanıtı aç'}
          >
            {speakerOn ? '🔊' : '🔇'}
          </button>
        </div>
      </div>
    </div>
  );
}
