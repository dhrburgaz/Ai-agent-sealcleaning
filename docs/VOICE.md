# Voice Interface (section 28)

Two surfaces support voice, both entirely client-side and at zero cost, via
the browser-native Web Speech API, and both driven by the exact same
conversation engine: `lib/agents/beyza-orchestrator.ts` (Turkish command
parsing) + `app/dashboard/actions.ts#askBeyzaAction` (status questions,
estimates, method plans, inventory, quote status, calendar, and more).

1. **The compact "Beyza'ya Sor" box** (`components/dashboard/AskBeyza.tsx`)
   embedded on the Command Center and every lead detail page.
2. **The full-screen "Beyza'yı Ara" call mode**
   (`app/dashboard/beyza/`, `components/beyza/call/BeyzaCallScreen.tsx`) —
   see "Call mode" below.

Shared voice plumbing lives in `lib/beyza-voice.ts` (speech-recognition
detection, Turkish TTS with voice/rate selection) and `lib/beyza-sound.ts`
(short procedurally-generated UI tones), so neither surface duplicates the
other's browser-API handling.

## What's implemented

- **Speech-to-text input**: a mic button feeds `SpeechRecognition` /
  `webkitSpeechRecognition` (Turkish locale, `lang: 'tr-TR'`), auto-submitting
  the recognized transcript through the same form/action the text input uses
  — there is no separate voice code path, so voice commands get identical
  validation, approval gating, and audit behavior as typed ones.
- **Text-to-speech output**: replies are spoken back via
  `window.speechSynthesis`, preferring a Turkish voice
  (`lang.startsWith('tr')`, with a best-effort preference for a male voice
  matching the master spec's "erkek sesi" default) when the browser exposes
  one. Off by default; the owner toggles it per-browser, persisted to
  `localStorage` (a UI preference only, never sent to the server).
- **Progressive enhancement**: both features are feature-detected
  (`getSpeechRecognitionCtor()`, `window.speechSynthesis`) and hidden
  entirely when unsupported — the text input and button always work
  regardless of browser support, matching the "system remains useful with
  zero AI keys" rule extended to "and with no speech support either."
- **Lead-scoped commands**: `AskBeyza` optionally takes a `leadId` prop
  (used on `app/dashboard/leads/[id]/page.tsx`) so a command like "Bu iş için
  ne eksik?" resolves against that lead's real state, not just global status.

## Call mode ("Beyza'yı Ara")

A dedicated full-screen conversation screen, distinct from the compact box:
connecting/connected states with a call timer, the AI Core reacting to
listening/thinking/executing/speaking in real time (including a real
microphone-amplitude-driven pulse while listening — `useMicLevel`, a Web
Audio `AnalyserNode`), a scrolling transcript, a text fallback input that
always works, and mic-mute/speaker/end-call controls. After BEYZA answers,
if the mic isn't muted, recognition restarts automatically — a continuous
back-and-forth rather than press-to-talk per sentence. While a command
executes, the screen shows which real agent(s) it invoked (from
`lib/agents/intent-agent-map.ts`, a truthful map from intent to the actual
deterministic module `askBeyzaAction` calls for that case — never a
decorative list of "busy" agents unrelated to what actually ran).

This is explicitly **not** a telephone call — see "Telephony" below for the
separate, unbuilt PSTN concept.

## Deliberately not implemented (out of scope for this build)

- `voice_configs`' `preferredVoice` DB column is not read by the client (a
  heuristic Turkish-voice match is used instead, per `lib/beyza-voice.ts`);
  the equivalent preference now lives client-side instead
  (`lib/beyza-preferences.ts`, Settings > Beyza Ayarları) rather than in that
  table.
- Confirmation flow for high-impact commands (send message, send quote,
  delete customer, book/reschedule/cancel, enable paid budget, enable
  autopilot): the underlying approval logic already exists and is respected
  (e.g. `lib/messaging/approval.ts` decides whether a send needs approval,
  and the QA gate blocks below-floor quotes regardless of how the command
  arrived) — a dedicated *voice* confirmation UX (e.g. "Emin misiniz?" spoken
  back before executing) was not added; today a high-impact voice command
  goes through the same server-side approval checks as a typed one, just
  without an extra spoken confirmation step in between.

## Telephony (section 29)

Out of scope entirely, and deliberately not faked. A phone-in "call Beyza"
feature needs a paid telephony provider (Twilio or similar) — there is no
free way to receive calls, and this document says so plainly rather than
implying otherwise. The core system does not and will not depend on
telephony being available.
