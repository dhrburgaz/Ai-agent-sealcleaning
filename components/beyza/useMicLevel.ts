'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Real microphone amplitude (0..1), sampled via Web Audio's AnalyserNode,
 * active only while `enabled` is true (i.e. while the AI Core is in the
 * "listening" state). This is what makes the listening animation genuinely
 * audio-reactive rather than a canned loop — but it's a UI nicety layered on
 * top of the separate SpeechRecognition stream already used for the actual
 * transcript (components/dashboard/AskBeyza.tsx); losing mic permission or
 * AudioContext support here degrades to a level of 0 (a calm, static core),
 * never an error, matching the app's zero-cost / graceful-degradation rule.
 */
export function useMicLevel(enabled: boolean): number {
  const [level, setLevel] = useState(0);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLevel(0);
      return;
    }
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;

    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        const audioCtx = new AudioCtx();
        audioCtxRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);

        let lastQuantized = -1;
        function tick() {
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((sum, v) => sum + v, 0) / data.length;
          const quantized = Math.round(Math.min(1, avg / 100) * 20) / 20; // quantized to
          // 5% steps so React only re-renders on a perceptible change, not
          // on every 16ms animation frame.
          if (quantized !== lastQuantized) {
            lastQuantized = quantized;
            setLevel(quantized);
          }
          rafRef.current = requestAnimationFrame(tick);
        }
        tick();
      } catch {
        // No mic permission / no AudioContext: calm static core, not an error.
        setLevel(0);
      }
    }
    start();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close().catch(() => {});
    };
  }, [enabled]);

  return level;
}
