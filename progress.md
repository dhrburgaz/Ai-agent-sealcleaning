# Beyza Security — Build Progress

**Phase 1–3: COMPLETE. Phase 4–6: COMPLETE.** Overall product (all 10 phases
in the master spec): **IN PROGRESS** — Phases 7–10 remain. This file,
`tests.json`, and `CLAUDE.md` are maintained together so a future session (or
a compacted context) can resume without re-deriving state.

Scope for Phase 1–3 was explicitly agreed with the user: production-quality
and fully working (not placeholders), maintain `progress.md`/`tests.json`,
spend no money, use no paid APIs, and don't stop until
lint/typecheck/tests/build all pass. That phase is done and verified.

The Phase 4–6 build (this session) was scoped by explicit user instruction:
implement the full 20-agent architecture and orchestration, an AI provider
router with strict €0 paid-budget mode, caching/token optimization, the
vision pipeline, supplier/deal intelligence, inventory, live-data
provenance, and expanded Beyza voice/command coverage — all real logical
modules with triggers/structured I/O/confidence/caching/fallbacks/audit,
never fake UI cards or always-on chat loops, never a paid API call, and never
a regression to Phase 1–3 behavior. All of that is done and verified below.
Calendar UI and automated follow-up scheduling were deliberately **not**
pulled forward — the master spec places them in Phase 7, and the instruction
was to build "calendar/follow-up where scheduled by the master plan," which
is read as respecting that placement rather than overriding it.

## What's actually built and working (not scaffolding)

### Foundation
- Next.js 15 (App Router) + React 19 + TypeScript strict, Tailwind CSS.
- Full SQLite schema via Drizzle ORM covering every entity in master-spec
  section 24 (56 tables) — `db/schema/*.ts`, migrated via `db/migrations/`.
- Single-owner auth: first-run password creation, bcrypt hashing, iron-session
  cookie, CSRF token utilities, configurable idle timeout enforced via a
  Server-Action heartbeat (`app/dashboard/session-actions.ts`) — see the
  "Bugs found and fixed" section below for why it's built that way.
- First-run setup wizard (Turkish, 9 screens covering all of section 25's
  content) — `app/setup/`.
- Theme system: Ay-Yıldız Dark Red (default) / Classic Premium Dark / Neutral
  Business Light, plus Customer Demo Mode as a fourth toggle that masks
  sensitive fields — `lib/theme/`, `app/dashboard/settings/theme/`.
- Command Center dashboard shell + nav, working "Beyza'ya Sor" box and a
  deterministic Turkish status briefing, all computed from real DB state with
  zero AI calls — `lib/agents/beyza-orchestrator.ts`, `lib/server/status-snapshot.ts`.

### CRM (Agents 02–04, 17)
- Manual lead capture, exact-identifier deduplication (phone/email/URL/platform
  id) with fuzzy-text matches flagged for review only (never auto-merged),
  qualification scoring (hot/warm/cold/insufficient/decline/bundle) with no
  protected-trait inputs, and the full 22-state lead state machine with an
  audit trail on every transition.

### Pricing (Agents 07, 09, 11–14, 20)
- Deterministic pricing engine with the exact section-9 formulas (margin, not
  markup), €1,200 profit floor, minimum job charge, owner override (always
  preserved separately from the system recommendation).
- BOM/quantity, waste/disposal (refuses to price suspected hazardous waste as
  normal waste), equipment-vs-extra-labour, and labour/crew calculators.
- The 40 m² ceramic terrace job template (section 12), verified to produce
  different totals for customer-supplied vs. company-supplied tiles and to
  never hardcode a total.
- QA/compliance gate (Agent 20): blocks below-floor pricing without a reasoned
  override, unresolved must-verify-on-site facts on a binding quote, stale
  prices, missing fields, and unapproved sends.

### Quotes & messaging (Agents 05, 21, 19-mode)
- Dutch, zero-AI message templates covering the full section-5/41 set.
- Approval modes (Draft Only / Smart Approval default / Autopilot with
  per-connector opt-in); the system can never self-enable autopilot.
- Quote generation with a neutral, premium-business PDF (pdf-lib), version
  history/diff, "prijsindicatie" vs "offerte" language keyed to confidence.

### Jobs & finance (Agent 18, partial)
- Job creation from a won lead, status transitions, a Turkish-dictation
  actuals parser (with mandatory manual confirmation before saving — nothing
  auto-saves from a dictation guess), and an estimate-vs-actual comparison
  that reports whether the €1,200 floor was actually achieved.

### Suppliers (Agent 10, partial)
- Manual supplier price observation entry, landed-cost calculation for a
  specific job quantity, discount-evidence requirement (a "sale" label
  without an evidence URL is rejected), and staleness flags.

### Cross-cutting
- Full docs set (see `docs/`), `.env.example`, Docker + docker-compose,
  backup/restore scripts, upload validation (MIME/size/path-traversal),
  secret redaction helpers, and the AI provider router enforcing the €0
  default budget.

## Phase 4–6 additions (this session)

### Orchestration (section 47) — Agent 01/17/20 cross-cutting
- `lib/orchestration/events.ts`: a synchronous, in-process `EventBus`
  (singleton `eventBus`), typed `OrchestrationEventMap` covering
  `lead.created`, `message.received`, `photo.added`, `scope.changed`,
  `quote.approved`, `job.completed`.
- `lib/orchestration/register-handlers.ts` wires all six events to real
  handlers (`ensureHandlersRegistered()`), each wrapped in
  `withAgentRun()` (`lib/orchestration/agent-run.ts`) so every invocation
  writes a real `agent_runs` audit row (agent key, trigger, entity,
  input/output summary, confidence, provider, cost, cache-hit, status) — a
  handler throwing is caught and recorded as a failed run, never crashes the
  emitting action.
- Wired into existing Server Actions additively: `lead.created` from
  `app/dashboard/leads/actions.ts`, `quote.approved` from
  `app/dashboard/quotes/actions.ts`, `job.completed` from
  `app/dashboard/jobs/actions.ts`, `photo.added`/`message.received`/
  `scope.changed` from `app/dashboard/leads/[id]/actions.ts`.

### Agent 08 — Technical Method Planner (deterministic)
- `lib/pricing/method-planner.ts#buildMethodPlan()`: rule-based technical
  method plan for the ceramic-terrace template (excavation depth, base
  layers, jointing method, cure time, verification-required flags) — pure
  function, no LLM, fully deterministic per section-12 job parameters.
  Persists to `risk_flags`/scope tables and renders on the lead detail page.

### Agent 06 — Photo/Vision Inspector (deterministic skeleton, AI-router gated)
- `lib/agents/vision-inspector.ts`: `buildManualReviewSkeleton()` (always
  produces a usable "awaiting manual review" result with zero AI spend),
  `sanitizeMeasurementClaims()` (strips any measurement claim lacking a real
  scale reference — never fabricates dimensions from a photo alone),
  `computePhotoConfidence()`.
- `uploadPhotoAction`/`updatePhotoAnalysisAction`
  (`app/dashboard/leads/[id]/actions.ts`) persist to `attachments`/
  `photo_analyses`, with upload validation reused from Phase 1-3
  (`validateUpload`, `sanitizeOriginalFilename`) and image-hash dedupe
  (`findExistingAnalysisByHash`) so re-uploading an identical photo never
  triggers a second analysis. UI: "Fotoğraflar (Agent 06)" section on the
  lead detail page.

### AI provider router, caching, resilience (Phase 5, section 14–15/49)
- `lib/ai/providers/{types,ollama,openai-compatible,gemini,nvidia,
  anthropic}.ts`: real adapters behind a common interface, each taking an
  injectable `Transport` so no test ever makes a real network call.
- `lib/ai/model-router.ts`: single entry point for any agent needing a
  model. Pipeline order: (1) budget gate — unchanged Phase 1-3 logic,
  blocks unless key configured + provider enabled + both caps `> 0` + cost
  fits remaining budget; (2) prompt cache (`lib/ai/cache.ts`,
  `prompt_cache` table, hash of task type + context-pack) — a hit costs €0
  and skips the network call; (3) circuit breaker
  (`lib/ai/circuit-breaker.ts`, pure closed/open/half-open state machine per
  provider) — an open circuit is skipped, router falls back to the next
  tier; (4) retry/backoff (`lib/ai/retry.ts`, exponential, never retries a
  4xx).
- `lib/ai/context-pack.ts`: compact structured lead summaries
  (status/key facts/recent events) instead of raw conversation history,
  versioned and persisted to `context_packs` for cache traceability.
- **Nothing here activates by default** — with the shipped €0 budget and no
  keys configured, every call is blocked at the budget gate; deterministic
  fallbacks (already required by every agent) are what actually run.

### AI usage dashboard (Phase 5)
- `lib/server/ai-usage-stats.ts#computeAiUsageStats()`/`buildAiUsageStats()`
  and `app/dashboard/settings/ai-usage/page.tsx`: real aggregates from
  `api_usage`/`budget_policies` (monthly/daily spend vs. cap, cache-hit
  rate, blocked-call count, per-provider breakdown). Renders honestly as
  all-zero when no AI call has ever been made, never fabricated sample data.

### Supplier live-data (Phase 6, section 2 "never fabricate")
- `lib/suppliers/url-price-fetcher.ts`: `validateSupplierUrl()` (SSRF
  protection — rejects localhost/private-IP/link-local targets),
  `extractPriceFromHtml()`, `fetchSupplierPriceFromUrl()`. The owner pastes
  a real supplier URL; the fetched price is stored with its source URL and
  a timestamp — never presented without both. No paid scraping/search API
  used or required. UI: URL-fetch form + confidence column on
  `app/dashboard/suppliers/page.tsx`
  (`fetchAndAddSupplierObservationAction`).

### Inventory (Phase 6)
- `app/dashboard/inventory/{actions,page}.tsx`: CRUD for `inventory_items`.
- `lib/pricing/ceramic-terrace-template.ts#applyInventoryOffset()`: checks
  on-hand inventory before pricing a purchase quantity, recomputes the
  ceramic-terrace pricing breakdown with the offset applied via the
  existing `calculatePrice` engine (no parallel pricing path). Wired into
  both estimate creation and quote generation in
  `app/dashboard/leads/[id]/actions.ts`. UI: "Envanter kontrolü (Agent
  10/33)" section on the lead detail page.

### Expanded Beyza command coverage + voice I/O (section 28)
- `app/dashboard/actions.ts` (`askBeyzaAction`): now accepts an optional
  `leadId` so a command resolves against a specific lead's real state, plus
  roughly a dozen new/expanded intents (method-plan status, inventory
  status, quote status, "what's missing for this job", etc.) — every reply
  is generated from real DB state or is an honest "can't do that yet"
  message; no command silently mutates state it can't actually perform
  (e.g. `set_area_m2`/`set_target_margin` return specific guidance instead
  of either faking a save or a generic refusal).
- `components/dashboard/AskBeyza.tsx`: Web Speech API voice I/O — mic input
  via `SpeechRecognition`/`webkitSpeechRecognition` (`tr-TR`) auto-submitting
  through the same form/action as typed text (identical validation/approval/
  audit path, no separate voice code path), and spoken replies via
  `window.speechSynthesis` preferring a Turkish voice, toggle persisted to
  `localStorage`. Fully feature-detected; text input always works regardless
  of browser support. See `docs/VOICE.md` for exactly what is and isn't
  implemented.

### generateQuoteForEstimate refactor
- `createQuoteFromEstimateAction` (`app/dashboard/leads/[id]/actions.ts`) was
  refactored into a thin wrapper around a newly exported
  `generateQuoteForEstimate(leadId, estimateId, actorDisplayName)` so both
  the existing form action and the new Beyza "create quote" voice/text
  command call the identical underlying logic — verified behavior-preserving
  via the full test suite and e2e smoke test (no QA-gate or pricing logic
  changed, only the call surface).

## Bugs found and fixed during the build (via actual browser testing, not just `npm run check`)

`npm run check` (lint + typecheck + tests + build) was green well before the
app actually worked end to end. Two real runtime bugs only surfaced when the
app was driven through a real browser (Playwright) against a fresh database:

1. **Cookie writes from a Server Component.** `requireAuth()` was called from
   `app/dashboard/layout.tsx` (a Server Component render) and tried to call
   `session.save()`/`session.destroy()`, which Next.js only permits from a
   Server Action or Route Handler. Fixed by making `requireAuth()` read-only
   and adding a dedicated Server Action + client heartbeat component to keep
   the idle-timeout clock fresh. See `CLAUDE.md` for the pattern to follow.
2. **WinAnsi font crash on Turkish characters.** The PDF library's standard
   font can't encode İ/ı/Ğ/ğ/Ş/ş. This surfaced because internal (Turkish)
   estimate-line labels like "İşçilik" were being reused directly in the
   customer-facing (Dutch) PDF — itself a correctness bug, not just an
   encoding one. Fixed by (a) translating cost-category labels to Dutch for
   the PDF (`lib/pricing/category-labels.ts`) and (b) adding a defensive
   WinAnsi transliteration fallback in the PDF writer so a Turkish customer
   name never crashes quote generation.

Both are covered by regression tests (`tests/e2e/smoke.spec.ts` for the first;
`tests/unit/quote-pdf.test.ts`'s "İbrahim Şahin" case for the second).

There was also a genuine QA-gate data bug: the estimate's stored materials
cost and the QA gate's recomputed materials cost disagreed (one used the real
tile/sand cost, the other hardcoded 0), which meant **every** company-supplied
material quote was silently blocked by the math-consistency check. Fixed by
storing a real `materials` cost line and having the QA gate read it instead of
hardcoding zero.

## Verification

```
npm run check   →  lint ✓  typecheck ✓  213 unit/integration tests (40 files) ✓  production build ✓
```

Plus a real end-to-end run: fresh DB → setup wizard → login → lead creation →
dedupe → 40 m² estimate → QA-gated quote → downloadable PDF → Agent 06 photo
section renders → lead-scoped Ask Beyza reply → `/dashboard/inventory`,
`/dashboard/settings/ai-usage`, `/dashboard/suppliers` all render without a
server error — driven through actual Chromium via Playwright
(`tests/e2e/smoke.spec.ts`), not just asserted by the build.

**Not verified**: `docker build` — Docker is installed in this environment but
there is no daemon running, so the Dockerfile/compose files are written and
reviewed but not actually built here. Verify in your own environment before
relying on them.

## Known accepted risks

- `npm audit` still reports one **high**-severity advisory: a `postcss`
  vulnerability nested inside Next.js's own internal build tooling
  (`next/node_modules/postcss`), only fixed by upgrading to Next.js 16 — a
  major version with breaking changes (React 19→a newer baseline, App Router
  changes) that was judged too large a rewrite to fold into this scope
  without explicit sign-off. Revisit when Phase 4+ work touches routing
  anyway, or if the user asks for it explicitly.
- Two **moderate** advisories are transitive dev-only tooling issues (`tsx`'s
  bundled `esbuild`, used only for scripts/migrations, never shipped to
  production) with no non-breaking fix currently available upstream.

## What's deferred, and why (by phase)

- **Phase 4** — DONE this session (orchestration events, Agent 06, Agent 08).
- **Phase 5** — DONE this session (real AI provider adapters, model router,
  prompt cache, circuit breaker/retry, context packs, AI usage dashboard).
- **Phase 6** — DONE this session (supplier owner-pasted-URL live price fetch
  with SSRF protection, inventory CRUD + offset wired into pricing). Not
  built: a live "Fırsatlar" trend-chart board and automated (unattended)
  supplier scanning — both would require either a paid scraping/search API
  or a scheduled background job, and the master spec's zero-paid-API
  constraint plus this session's scope (owner-triggered, not automated) rule
  those out for now; the manual-trigger URL fetch satisfies the "no
  fabricated live prices" requirement without either.
- **Phase 7** — calendar UI + ICS import/export, routing/scheduling,
  automated follow-up sequencing, full finance/BI reporting. Deliberately
  not pulled forward — see the note at the top of this file.
- **Phase 8** — PWA packaging (voice I/O itself was pulled forward and is
  DONE — see "Expanded Beyza command coverage + voice I/O" above; Customer
  Demo Mode polish is also DONE from Phase 1-3).
- **Phase 9** — browser extension, Facebook/social connector stubs beyond
  manual capture.
- **Phase 10** — richer demo data set, CI wiring for the Playwright suite,
  further hardening pass.

None of these are stubbed with fake UI — see `docs/AGENTS.md`,
`docs/FACEBOOK_CONNECTOR.md`, `docs/VOICE.md`, `docs/SUPPLIER_INTELLIGENCE.md`,
and `docs/AI_COST_CONTROL.md` for exactly what exists (schema, partial logic)
vs. what's genuinely not started, agent by agent.

## Resuming this work

1. Read `CLAUDE.md` first.
2. `npm run check` to confirm the baseline (as of this update: lint ✓,
   typecheck ✓, 213 tests ✓, build ✓, plus the extended
   `tests/e2e/smoke.spec.ts` passing against a fresh DB).
3. Pick a phase from "What's deferred" above (Phase 7 is next in spec order),
   or ask the user which is next.
4. Keep this file and `tests.json` current as you go.
