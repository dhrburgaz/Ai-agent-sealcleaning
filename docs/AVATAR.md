# BEYZA Avatar / AI Core (redesign instruction #23)

## What this is

The avatar is the visual/voice embodiment of **Agent 01 — Beyza / Command
Orchestrator**, not a 21st agent. The 20 specialist agents stay behind the
scenes; Beyza is how the owner sees and hears their results.

## Architecture: renderer abstraction

```
components/beyza/
  types.ts                 BeyzaCoreState (sleeping/initializing/ready/
                            listening/thinking/executing/speaking/warning/error)
  core/AICore.tsx           The actual rendering: layered SVG rings + glow +
                            Ay-Yıldız emblem + audio-reactive listening pulse +
                            approximate speaking waveform. This IS the
                            AbstractAICoreRenderer.
  avatar/AvatarRenderer.tsx Dispatches by `AvatarStyle` ('ai_core' |
                            'cinematic_human') to the right renderer.
  useMicLevel.ts             Real microphone amplitude (Web Audio
                            AnalyserNode), used for the "listening" pulse.
```

Every surface that shows Beyza — the Command Center hero
(`components/beyza/CommandCenterHero.tsx`), the full-screen call mode
(`components/beyza/call/BeyzaCallScreen.tsx`), the boot sequence
(`components/beyza/boot/BootSequence.tsx`), the mobile nav button
(`components/dashboard/MobileNav.tsx`) — renders through `AvatarRenderer`
(or `AICore` directly where the surface intentionally always wants the core,
like the boot sequence), never a hardcoded assumption about *how* Beyza is
drawn. Conversation/business logic only ever deals in `BeyzaCoreState` and a
numeric mic `level` — never in renderer-specific detail.

## Implemented: AbstractAICoreRenderer (style `ai_core`)

The only renderer actually shipped, and the default everywhere. A layered
SVG — outer/middle/inner rings, a pulsing core disc, the Ay-Yıldız emblem at
center — that visibly reacts to state:

- **listening**: real microphone amplitude (via `useMicLevel`, a Web Audio
  `AnalyserNode`) drives ping rings and a subtle scale pulse — not a canned
  loop.
- **thinking**: the middle ring's rotation speeds up.
- **speaking**: five small bars animate with staggered timing as an
  *approximate* voice waveform. Since output goes through the browser's
  `SpeechSynthesisUtterance` (no raw audio buffer to analyze), this is
  intentionally approximate — matching the spec's own acceptance bar
  ("does not need movie-quality... must feel alive"), not synced to real
  phonemes.
- **warning/error**: color shifts to amber/red.

## Documented, NOT implemented: Cinematic2DAvatarRenderer (style `cinematic_human`)

An original, charismatic Turkish-inspired AI-operator character with
approximate lip-sync, as described in the redesign brief. This is a
dedicated character-design and animation project — art direction, rigging,
viseme timing — not something a code session should fabricate with a stock
photo or a crude sprite; either would look worse than the AI Core and would
misrepresent what's actually running, which this codebase's "never
fabricate" rule (see `CLAUDE.md`) extends to visual claims, not just data.

Selecting this style in Settings (`app/dashboard/settings/beyza/page.tsx`)
is accepted and persisted, but `AvatarRenderer` currently always falls back
to rendering the AI Core, and logs a dev-only console notice saying so — it
never silently pretends a human avatar is on screen. Swapping in a real
implementation later is exactly one new case in `AvatarRenderer.tsx`; no
other file needs to change.

## Voice pipeline (zero-cost default)

```
SpeechInputProvider   -> browser SpeechRecognition (lib/beyza-voice.ts)
ConversationEngine    -> existing Beyza orchestrator (lib/agents/beyza-orchestrator.ts,
                          app/dashboard/actions.ts#askBeyzaAction) — unchanged
                          by the redesign, just now also invoked from the
                          full-screen call mode, not only the compact widget
SpeechOutputProvider  -> browser SpeechSynthesis (lib/beyza-voice.ts)
AvatarRenderer        -> AICore (see above)
```

No paid speech-to-text, TTS, or avatar/video provider is wired in, and none
activates automatically — the €0 AI budget rule (`docs/AI_COST_CONTROL.md`)
applies to voice/avatar exactly as it does to the 20 agents. A future paid
adapter (hosted realtime voice, a photorealistic avatar API) would plug in
as a new `SpeechInputProvider`/`SpeechOutputProvider`/`AvatarRenderer`
implementation, gated by the same budget/opt-in gate as every other paid
provider.

## Settings

`app/dashboard/settings/beyza/page.tsx` — avatar on/off, avatar style,
speaking rate, sound level (`lib/beyza-sound.ts`), animation quality
(auto/high/balanced/battery saver), auto-greeting on/off, boot sequence
mode (full/short/off). All stored client-side (`lib/beyza-preferences.ts`)
next to the existing `beyza_tts_enabled`/`beyza_sound_level` keys — this is
per-browser UI preference, not business data, so it doesn't need a database
round-trip or to sync across devices.
