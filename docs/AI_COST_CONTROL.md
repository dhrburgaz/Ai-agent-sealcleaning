# AI / Token Cost Discipline (section 14–15)

## The rule

Default paid AI budget is **€0/month**. Nothing in this codebase makes a paid
model call by default — status briefing, qualification, pricing, messaging,
quotes, method planning, and the photo-review skeleton are all deterministic
code and stay fully usable with zero AI keys configured. As of Phase 5,
real provider adapters and a full router pipeline exist
(`lib/ai/model-router.ts`) — but they only ever get reached if an owner
explicitly configures a key, enables the provider, and sets both budget caps
above zero. The router's own tests (`tests/unit/ai-providers.test.ts`,
`tests/integration/model-router.test.ts`) run entirely against injected fake
transports; no test in this repo makes a real network call to a paid API.

## The gate, precisely

`routeProviderRequest(...)` (the underlying budget check inside
`lib/ai/model-router.ts`) allows a call only when **all** of:

1. The tier is paid (Tier 2 hosted-free and above still route through the same
   gate; Tier 0/1 are always allowed).
2. `providerConfigured` — an API key is actually set.
3. `providerEnabled` — the owner has explicitly turned it on.
4. `monthlyCapEur > 0` **and** `dailyCapEur > 0`.
5. The call's estimated cost doesn't exceed the remaining monthly or daily budget.

Any single failure blocks the call outright. There is no "just this once."
On top of the budget gate, `lib/ai/model-router.ts` also checks the prompt
cache and the per-provider circuit breaker before ever attempting a network
call — see `docs/AGENTS.md`'s "AI provider router, caching, and resilience"
section for the full pipeline order.

## Cost honesty (section 2)

Never assumed by this codebase or its documentation:

- A Claude/ChatGPT/Gemini/NVIDIA **subscription** is not API credit.
- A "free tier" is not permanently free.
- A browser session/cookie is not a legitimate API credential.
- Telephony is not free.

## Token-efficiency mechanisms (implemented)

- `prompt_cache` (`lib/ai/cache.ts`) — cache by task type + context-pack hash;
  a hit costs €0 and skips the network call entirely.
- `context_packs` (`lib/ai/context-pack.ts`) — compact structured context
  instead of raw conversation history, versioned so a cache hit is traceable.
- `api_usage` — tokens/cost/cache-hit logged per attempted call by
  `lib/ai/model-router.ts`.
- Image hashing on `attachments`/`photo_analyses`
  (`lib/pricing/image-dedupe.ts`, wired into `uploadPhotoAction` via
  `findExistingAnalysisByHash`) — re-uploading the same photo never triggers a
  second analysis.
- Per-agent cost tiers in `agent_config`, and a circuit breaker
  (`lib/ai/circuit-breaker.ts`) so a failing provider doesn't burn retries and
  latency on every subsequent call until it cools down.
- Deterministic-first design throughout: Agent 06's manual-review skeleton
  and Agent 08's method planner produce complete, useful output with zero
  model calls; a model is only ever a later enhancement layer, never a
  dependency of the core loop.

## AI usage dashboard

`app/dashboard/settings/ai-usage/page.tsx` (`lib/server/ai-usage-stats.ts`)
renders real aggregates from `api_usage`/`budget_policies`: monthly/daily
spend vs. cap, cache-hit rate, blocked-call count, and per-provider
breakdown. With zero AI calls ever made (the shipped default), it renders
honestly as all-zero rather than fabricating sample data.
