'use client';

import { AyYildizEmblem } from '../AyYildizEmblem';
import type { BeyzaCoreState } from '../types';

export interface AICoreProps {
  state: BeyzaCoreState;
  /** 0..1 real microphone amplitude, only meaningful while state === 'listening'. */
  level?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_PX: Record<NonNullable<AICoreProps['size']>, number> = {
  sm: 56,
  md: 96,
  lg: 180,
  xl: 320,
};

const STATE_COLOR: Record<BeyzaCoreState, string> = {
  sleeping: 'rgb(var(--color-muted))',
  initializing: 'rgb(var(--color-gold))',
  ready: 'rgb(var(--color-glow))',
  listening: 'rgb(var(--color-glow))',
  thinking: 'rgb(var(--color-gold))',
  executing: 'rgb(var(--color-gold))',
  speaking: 'rgb(var(--color-glow))',
  warning: 'rgb(217 119 6)',
  error: 'rgb(220 38 38)',
};

const STATE_LABEL_TR: Record<BeyzaCoreState, string> = {
  sleeping: 'Uyku modunda',
  initializing: 'Başlatılıyor',
  ready: 'Hazır',
  listening: 'Dinliyor',
  thinking: 'Düşünüyor',
  executing: 'Çalıştırıyor',
  speaking: 'Konuşuyor',
  warning: 'Uyarı',
  error: 'Hata',
};

/**
 * BEYZA's central AI presence (Agent 01). A layered SVG core — never a flat
 * spinning circle — whose rings, glow, and pulse react to real interaction
 * state, not a canned decorative loop. See docs/DESIGN_SYSTEM.md for the
 * full state table and docs/AVATAR.md for how this fits the AvatarRenderer
 * abstraction (this component IS the default AbstractAICoreRenderer).
 */
export function AICore({ state, level = 0, size = 'lg', className }: AICoreProps) {
  const px = SIZE_PX[size];
  const color = STATE_COLOR[state];
  const isActive = state !== 'sleeping';
  const isAlert = state === 'warning' || state === 'error';
  const listeningScale = 1 + level * 0.18;

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className ?? ''}`}
      style={{ width: px, height: px }}
      role="img"
      aria-label={`Beyza durumu: ${STATE_LABEL_TR[state]}`}
    >
      {/* Ambient glow behind everything */}
      <div
        className="radial-core-glow absolute inset-[-30%] rounded-full transition-opacity duration-700"
        style={{ opacity: isActive ? (isAlert ? 0.5 : 0.7) : 0.15 }}
      />

      {/* Listening: real audio-reactive ping rings */}
      {state === 'listening' && (
        <>
          <span
            className="absolute inset-0 rounded-full border animate-core-ping-slow"
            style={{ borderColor: color }}
          />
          <span
            className="absolute inset-[10%] rounded-full border animate-core-ping-slow"
            style={{ borderColor: color, animationDelay: '0.6s' }}
          />
        </>
      )}

      <svg
        viewBox="0 0 200 200"
        className="relative h-full w-full"
        style={{
          transform: state === 'listening' ? `scale(${listeningScale})` : undefined,
          transition: 'transform 90ms ease-out',
        }}
      >
        {/* Outer thin rotating ring */}
        <circle
          cx="100"
          cy="100"
          r="92"
          fill="none"
          stroke={color}
          strokeWidth="1"
          strokeOpacity="0.35"
          strokeDasharray="2 6"
          className={isActive ? 'origin-center animate-core-rotate-slow' : ''}
        />
        {/* Middle dashed ring, opposite rotation, speeds up while thinking/executing */}
        <circle
          cx="100"
          cy="100"
          r="74"
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeOpacity="0.55"
          strokeDasharray="10 14"
          className={
            isActive
              ? `origin-center ${state === 'thinking' || state === 'executing' ? 'animate-core-rotate-reverse [animation-duration:6s]' : 'animate-core-rotate-reverse'}`
              : ''
          }
        />
        {/* Inner solid ring */}
        <circle cx="100" cy="100" r="58" fill="none" stroke={color} strokeWidth="1" strokeOpacity="0.8" />

        {/* Core disc */}
        <circle
          cx="100"
          cy="100"
          r="46"
          fill={color}
          fillOpacity="0.12"
          className={isActive ? 'origin-center animate-core-pulse' : ''}
        />
        <circle cx="100" cy="100" r="46" fill="none" stroke={color} strokeWidth="1.5" strokeOpacity="0.9" />
      </svg>

      {/* Emblem at the center */}
      <AyYildizEmblem
        className="absolute h-[34%] w-[34%]"
        opacity={isActive ? 0.92 : 0.35}
      />

      {/* Speaking: approximate voice waveform bars */}
      {state === 'speaking' && (
        <div className="absolute bottom-[14%] flex items-end gap-[3px]" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="w-[3px] rounded-full"
              style={{
                background: color,
                height: 6,
                animation: `core-pulse ${0.5 + i * 0.09}s ease-in-out infinite`,
                animationDelay: `${i * 0.07}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export { STATE_LABEL_TR as BEYZA_STATE_LABEL_TR };
