# Voice Interface (section 28) — Phase 8, not yet built

The Command Center's "Beyza'ya Sor" text input is functional today
(`components/dashboard/AskBeyza.tsx`) and answers a defined set of Turkish
commands deterministically (`lib/agents/beyza-orchestrator.ts`). This is the
foundation the voice UI will sit on top of: a push-to-talk mic feeding the
same command parser, plus browser `SpeechSynthesis` for the spoken reply.

## Not implemented yet

- Push-to-talk UI, transcript preview, quick command chips.
- Browser `SpeechRecognition`/Web Speech API wiring for Turkish input.
- Confirmation flow for high-impact commands (send message, send quote, delete
  customer, book/reschedule/cancel, change price rules, enable paid budget,
  enable autopilot) — the *logic* for several of these confirmations already
  exists (e.g. `lib/messaging/approval.ts` decides whether a send needs
  approval); the voice UI would call the same functions, not duplicate them.
- Preferred male Turkish TTS voice selection (`voice_configs` table exists
  with a `preferredVoice` column for this).

## Telephony (section 29)

Out of scope entirely for now, and deliberately not faked. A phone-in "call
Beyza" feature needs a paid telephony provider (Twilio or similar) — there is
no free way to receive calls, and this document says so plainly rather than
implying otherwise. The core system does not and will not depend on
telephony being available.
