'use client';

import { AICore, type AICoreProps } from '../core/AICore';
import type { AvatarStyle } from '@/lib/beyza-preferences';

/**
 * Renderer abstraction (redesign instruction #23's "Avatar Renderer
 * Abstraction"). Every surface that shows BEYZA (Command Center hero, the
 * full-screen call mode, the mobile nav button) renders through THIS
 * component, never `<AICore>` directly with a hardcoded assumption — so a
 * future renderer (3D/WebGL/photorealistic video) can be added by adding
 * one case here, with no change to conversation/business logic anywhere
 * else in the app.
 *
 * Implemented today:
 *  - AbstractAICoreRenderer (style: 'ai_core') — the AICore component
 *    (components/beyza/core/AICore.tsx). This is the only renderer actually
 *    shipped, and the default for every surface.
 *
 * Documented, deliberately NOT implemented:
 *  - Cinematic2DAvatarRenderer (style: 'cinematic_human') — an original,
 *    charismatic AI-operator character with approximate lip-sync. A real
 *    animated face (character design, rigging, viseme timing) is a
 *    dedicated illustration/animation project; faking it with a stock
 *    photo or a crude sprite would look worse than the AI Core and would
 *    misrepresent what's actually running. Selecting this style falls back
 *    to the AI Core and logs a dev-only console notice — never a silent
 *    claim that a human avatar is rendering when it isn't. See
 *    docs/AVATAR.md.
 */
export function AvatarRenderer({ style, ...coreProps }: { style: AvatarStyle } & AICoreProps) {
  if (style === 'cinematic_human' && process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.info('[Beyza] "Cinematic Human" avatar style is not implemented yet — falling back to the AI Core.');
  }
  return <AICore {...coreProps} />;
}
