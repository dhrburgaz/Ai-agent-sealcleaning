# AI / Token Cost Discipline (section 14–15)

## The rule

Default paid AI budget is **€0/month**. Nothing in this codebase makes a paid
model call in Phase 1–3 — status briefing, qualification, pricing, messaging,
and quotes are all deterministic code. The provider router
(`lib/ai/router.ts`) exists now so the gate is real and tested (see
`tests/unit/ai-router.test.ts`), even though no adapter uses it yet.

## The gate, precisely

`routeProviderRequest(...)` allows a call only when **all** of:

1. The tier is paid (Tier 2 hosted-free and above still route through the same
   gate; Tier 0/1 are always allowed).
2. `providerConfigured` — an API key is actually set.
3. `providerEnabled` — the owner has explicitly turned it on.
4. `monthlyCapEur > 0` **and** `dailyCapEur > 0`.
5. The call's estimated cost doesn't exceed the remaining monthly or daily budget.

Any single failure blocks the call outright. There is no "just this once."

## Cost honesty (section 2)

Never assumed by this codebase or its documentation:

- A Claude/ChatGPT/Gemini/NVIDIA **subscription** is not API credit.
- A "free tier" is not permanently free.
- A browser session/cookie is not a legitimate API credential.
- Telephony is not free.

## Planned token-efficiency mechanisms (Phase 5, not yet wired to a real provider)

The schema and design already account for these so Phase 5 doesn't need a
redesign: `prompt_cache` (cache by task+input hash), `context_packs` (compact
structured context instead of raw history), `api_usage` (tokens/cost/cache-hit
per call), image hashing on `attachments`/`photo_analyses` to avoid re-analyzing
the same photo (`lib/pricing/image-dedupe.ts`), and per-agent cost tiers in
`agent_config`.

## What "AI usage dashboard" means once wired up

`api_usage` and `budget_policies` already have the columns for monthly/daily
spend, cache hit rate, blocked calls, and avoided calls. The Settings page
already lets the owner view/edit the budget. The dashboard visualization of
historical usage trends is Phase 5 (needs an actual provider adapter emitting
`api_usage` rows to visualize).
