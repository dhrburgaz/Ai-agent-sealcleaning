# Voice Interface (section 28)

The Command Center's "Beyza'ya Sor" box (`components/dashboard/AskBeyza.tsx`)
supports both text and voice, entirely client-side and at zero cost, via the
browser-native Web Speech API. It answers a defined set of Turkish commands
deterministically (`lib/agents/beyza-orchestrator.ts` for status questions,
`app/dashboard/actions.ts#askBeyzaAction` for the wider command set — creating
estimates, checking method plans, inventory, quote status, and more).

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

## Deliberately not implemented (out of scope for this build)

- A dedicated full-screen push-to-talk mode with transcript preview and quick
  command chips — the compact mic button in the existing box was judged
  sufficient; a redesign is a UI polish task, not a capability gap.
- `voice_configs`' `preferredVoice` column is not yet read by the client (the
  heuristic voice match above is used instead) — wiring an owner-selected
  voice through Settings is a small follow-up, not attempted here to avoid
  touching Settings' Phase 1-3-tested surface without being asked.
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
