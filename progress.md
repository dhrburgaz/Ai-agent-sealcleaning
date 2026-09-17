# Beyza Security — Build Progress

**Phase 1–3: COMPLETE. Phase 4–6: COMPLETE. Phase 7–10: COMPLETE.** All 10
phases of the master spec are now built and verified. This file, `tests.json`,
and `CLAUDE.md` are maintained together so a future session (or a compacted
context) can resume without re-deriving state — resumption now means
*extending/hardening* what exists, not starting a new phase from scratch.

Scope for Phase 1–3 was explicitly agreed with the user: production-quality
and fully working (not placeholders), maintain `progress.md`/`tests.json`,
spend no money, use no paid APIs, and don't stop until
lint/typecheck/tests/build all pass. That phase is done and verified.

The Phase 4–6 build was scoped by explicit user instruction: implement the
full 20-agent architecture and orchestration, an AI provider router with
strict €0 paid-budget mode, caching/token optimization, the vision pipeline,
supplier/deal intelligence, inventory, live-data provenance, and expanded
Beyza voice/command coverage — all real logical modules with
triggers/structured I/O/confidence/caching/fallbacks/audit, never fake UI
cards or always-on chat loops, never a paid API call, and never a regression
to Phase 1–3 behavior. Done and verified.

The Phase 7–10 build was scoped by the user's explicit instruction to
"finish everything now": calendar/scheduling with ICS export, automated
follow-up sequencing, full finance/BI reporting, PWA packaging, a review of
the Phase 9 connector docs, and a Phase 10 pass (CI workflow, richer demo
data, security hardening). Same non-negotiables throughout: €0 AI budget, no
paid dependency, no fabricated data, every new agent capability has
triggers/structured I/O/audit, and the full Phase 1-6 test suite kept
passing throughout. Done and verified.

**A major UX/UI + AI-interaction redesign (this session)** was then
explicitly requested on top of the finished backend: the original UI looked
like a generic dark admin dashboard, and the instruction was to rebuild the
*experience* — an original, futuristic, Ay-Yıldız-identity AI command
center with a living central AI presence, a cinematic boot sequence, a
full-screen voice/call mode, an Agent Network visualization, and premium
lead intelligence cards — while leaving 100% of the working backend (pricing
engine, €1,200 profit floor, CRM, database, 20-agent architecture, €0-budget
protections, audit trail, all existing passing tests) untouched. This is
documented in full in its own section below and in `docs/DESIGN_SYSTEM.md`
/ `docs/AVATAR.md`. Done and verified, with an honestly-scoped list of what
was **not** attempted (a real visual calendar grid, interactive pricing
scenarios, a supplier "radar" stat-card framing) rather than a shallow pass
at all of it.

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

## Phase 7–10 additions (this session)

### Calendar & scheduling (Agents 15/16, section 16/47)
- `lib/scheduling/calendar.ts`: `findSchedulingConflicts()` — deterministic
  double-booking prevention. Every candidate and existing booking is expanded
  by its own travel-buffer minutes before checking for overlap, so a site
  visit or job can never be scheduled on top of (or too close to) another;
  back-to-back bookings whose buffered windows exactly touch are not flagged.
  `validateAppointmentWindow()` rejects an inverted or past slot.
- `lib/scheduling/ics.ts`: dependency-free RFC 5545 ICS generation
  (`buildIcsCalendar`) and parsing (`parseIcsCalendar`), including line
  folding/escaping and a round-trip test.
- `app/dashboard/calendar/`: propose/confirm/cancel a site-visit appointment
  (wired to the lead state machine: QUALIFIED → SITE_VISIT_PROPOSED on
  propose, → SITE_VISIT_BOOKED on confirm), schedule a job's start/end,
  and add manual calendar events (supplier pickup, rental pickup/return,
  disposal trip, private block) — every one of these paths runs the same
  conflict check before writing. `/api/calendar/ics` exports every calendar
  event as a downloadable/importable .ics file.
- `lib/server/status-snapshot.ts#visitsNext72h` now reads real `appointments`
  rows instead of the Phase 4-6 placeholder `0`.

### Automated follow-up sequencing (Agent 17, section 17/35)
- `lib/crm/follow-up.ts#computeNextFollowUpDate()`: first reminder 3 days
  after `quote.sent`, a second/final reminder 7 days after that, then the
  sequence stops — never a third unattended reminder.
- New orchestration event `quote.sent` (emitted from
  `app/dashboard/quotes/actions.ts#markQuoteSentAction`) schedules the first
  `follow_ups` row unless the customer has opted out.
- `app/dashboard/follow-ups/`: lists due/upcoming reminders; sending one
  reuses the *exact* same template/approval-gate/audit path as any other
  outbound message (`decideSend`) — there is no separate, less-audited "auto
  follow-up" code path, and nothing sends without the mode-appropriate
  approval. A successful send automatically queues the next step (or stops
  the sequence at the max step / on opt-out). An explicit "customer'ı
  takipten çıkar" action cancels every scheduled reminder for that customer
  and prevents any future one.

### Finance & BI reporting (Agent 18, section 18)
- `lib/jobs/finance-report.ts`: `bucketFinancialsByMonth()` (revenue/cost/
  gross-profit/margin per calendar month from completed jobs only),
  `computeWinRate()` (over decided leads only — in-progress leads don't
  dilute the rate either direction), `computeProfitFloorAchievementRate()`
  (what fraction of completed jobs actually cleared €1,200 in the field).
- `app/dashboard/finance/page.tsx`: pipeline value, win rate, profit-floor
  achievement rate, and a monthly table — computed strictly from real
  completed jobs / sent quotes / decided leads, never a projection presented
  as an actual.

### PWA packaging (Phase 8, section 8)
- `public/manifest.webmanifest` + `public/icon.svg` (installable, themed to
  the default Ay-Yıldız Dark Red palette) and `public/sw.js`, registered via
  `components/pwa/ServiceWorkerRegister.tsx` (feature-detected, silent no-op
  where unsupported).
- The service worker deliberately does **not** cache any dashboard route —
  this is a live operational app (`force-dynamic`), and caching stale
  lead/price/quote data for offline use would be exactly the kind of
  fabrication the master spec forbids. It only cache-first-serves the two
  static assets (icon, manifest); everything else passes straight to the
  network. See `docs/PWA.md` for the full reasoning and known limitations
  (SVG-only icons).

### Phase 9 review (connectors / browser extension)
- Reviewed `docs/FACEBOOK_CONNECTOR.md` against the current build: still
  accurate — Level A (manual paste-in capture) is implemented, Level B
  (official API connectors) and Level C (browser extension) remain
  explicitly not built, for the reasons already documented there (no
  credentials to fake, and a browser extension posting into a production app
  needs real auth/CORS design this session judged too risky to rush). No
  code changes were needed.

### Phase 10 hardening pass
- `.github/workflows/ci.yml`: a `check` job (lint + typecheck + unit/
  integration tests + build) and a separate `e2e` job (fresh migrated
  database, production build, real server, Playwright smoke test) — the
  Playwright suite is no longer "run it yourself when you remember to."
- `scripts/seed.ts`: richer demo data — a lead in every meaningful state
  (QUALIFIED, SITE_VISIT_BOOKED, QUOTE_SENT, REVIEW_REQUESTED, plus fresh
  NEW leads), inventory on hand, a confirmed site-visit appointment +
  mirrored calendar event, a due follow-up reminder, and a completed job
  with a drafted review request — so every new Phase 7 page has real demo
  content instead of an empty state. Verified by actually running the
  seeded app through a browser (not just the seed script exiting 0).
- `next.config.mjs`: baseline security headers (`X-Content-Type-Options`,
  `X-Frame-Options: DENY`, `Referrer-Policy`, a restrictive
  `Permissions-Policy`) on every response.
- `lib/auth/login-rate-limit.ts`: in-process brute-force lockout on the
  single-owner login (5 failures → exponential backoff up to 15 minutes,
  keyed by client IP, resets on a successful login). Documented as
  single-instance-only, matching this app's self-hosted single-process
  deployment model — a horizontally-scaled deployment would need a shared
  store instead, which is out of scope.
- `npm audit`: no new vulnerabilities introduced this session; the one
  pre-existing high-severity advisory (transitive `postcss` inside Next.js's
  own build tooling) is unchanged — see "Known accepted risks" below.

## UX/UI + AI-interaction redesign (this session)

Full detail in `docs/DESIGN_SYSTEM.md` (visual system) and `docs/AVATAR.md`
(AI Core/avatar architecture). Summary by redesign brief section:

- **Design system**: new CSS tokens (`--color-glow`, `--color-graphite`,
  `--color-silver`) layered onto the existing 3-theme system, `.glass-panel`/
  `.hud-divider`/`.grid-overlay`/`.radial-core-glow` utility classes, an
  original crescent+star emblem component (`AyYildizEmblem`). Every existing
  Phase 1-6 page got the glass-panel treatment on its section containers —
  visual only, no layout/logic change.
- **Central AI Core** (`components/beyza/core/AICore.tsx`): a layered SVG
  (rotating rings, pulsing core, the emblem at center) with 9 real states
  (sleeping/initializing/ready/listening/thinking/executing/speaking/
  warning/error). Listening is driven by real microphone amplitude
  (`useMicLevel`, a Web Audio `AnalyserNode`) — not a canned loop. Speaking
  shows an approximate voice waveform (staggered bar animation), honestly
  documented as approximate since the browser's `SpeechSynthesisUtterance`
  exposes no real audio buffer to analyze.
- **Cinematic boot sequence** (`components/beyza/boot/`): a full boot
  (module-status checklist, "Kimlik doğrulandı." / "Hoş geldiniz.") on
  login/setup completion (`?boot=full`), an abbreviated "wake" on a normal
  return, both skippable, both respecting `prefers-reduced-motion`, gated
  once per browser session (`sessionStorage`) so it never repeats on
  ordinary navigation.
- **Command Center redesign**: `CommandCenterHero` puts the AI Core at the
  center with a real, once-per-session spoken briefing (real DB data, never
  a fabricated "impressive activity" script), plus a genuine live activity
  feed (`lib/server/activity-feed.ts`) rendering real `agent_runs` rows —
  empty state renders honestly when nothing has happened yet.
- **Full-screen voice/call mode** ("Beyza'yı Ara",
  `app/dashboard/beyza/`): connecting/connected states with a call timer,
  continuous listen→answer→speak→re-listen loop (no press-to-talk per
  sentence), a text fallback, mic-mute/speaker/end-call controls, and a
  live display of which real agent(s) the current command invoked
  (`lib/agents/intent-agent-map.ts`, a truthful map to the actual
  deterministic code path each intent runs, not a decorative list).
  Explicitly distinct from a real PSTN phone call, which remains out of
  scope (needs a paid telephony provider — see `docs/VOICE.md`).
- **Agent Network** (`app/dashboard/agents/`): exactly 20 agents as an
  orbit around Beyza, grouped by category
  (`lib/agents/agent-groups.ts`), each node's state derived from its most
  recent real `agent_runs` row (`lib/server/agent-network.ts`) — never
  fabricated activity. Click a node for its purpose, last run, input/output
  summary, confidence, provider/cache-hit/cost.
- **AI-controlled navigation**: `askBeyzaAction` gained a `navigateTo` field
  and three new intents (`open_hottest_lead`, `open_quote_for_customer`,
  and an improved `tomorrow_availability` now backed by real `appointments`
  data instead of the old Phase 4-6 "calendar not built yet" placeholder) —
  "En sıcak lead'i aç." genuinely opens that lead's page.
- **Avatar renderer abstraction** (`components/beyza/avatar/
  AvatarRenderer.tsx`, `docs/AVATAR.md`): dispatches by style
  (`ai_core` implemented; `cinematic_human` documented but deliberately
  NOT implemented — an original animated human character is a dedicated
  illustration/animation project, and faking one with a stock image would
  misrepresent what's running). Settings page
  (`app/dashboard/settings/beyza/`) for avatar on/off, style, speaking rate,
  sound level, animation quality (a real "pil tasarrufu"/battery-saver
  toggle disables the core's animations, `AnimationQualityGate.tsx`),
  auto-greeting, boot mode — all client-side preferences
  (`lib/beyza-preferences.ts`), no DB round-trip needed for UI prefs.
- **Sound system** (`lib/beyza-sound.ts`): short, original, procedurally
  generated tones (Web Audio oscillators, no audio files, no copyrighted
  sounds), silent until a real user interaction has occurred (pointerdown/
  keydown gate) and until the owner has explicitly enabled a sound level
  above "off".
- **Lead intelligence cards** (`app/dashboard/leads/page.tsx`): replaced the
  flat list rows with cards showing customer/location/service/status/
  temperature/expected value & profit/confidence/photo count/next site
  visit/last-message age/next-best-action, computed from real
  estimates/attachments/appointments/messages data.
- **Mobile UX**: a dedicated bottom nav (`components/dashboard/MobileNav.tsx`)
  with a prominent elevated central Beyza button opening call mode, hidden
  specifically on the call-mode route itself (it's a full-screen surface
  with its own end-call control; the nav would otherwise render on top of
  its mic/speaker/end-call buttons — found and fixed via an actual mobile
  viewport screenshot, not just code review).
- **Demo Mode**: the visual theme is no longer swapped to a generic
  neutral/blue palette in Customer Demo Mode — the premium look is kept
  (matching the redesign brief's explicit "strongest demonstration of the
  product" instruction), while sensitive *data* masking
  (`lib/theme/demo-mode.ts`) is completely unchanged.

**Deliberately not done** (honestly scoped, not an oversight — see
`docs/DESIGN_SYSTEM.md`'s "Known gaps" for the full reasoning): a real
day/week/agenda calendar grid with draggable timeline blocks (the calendar
page kept its list+forms layout, just reskinned); interactive pricing
"what-if" scenario sliders on the ceramic-terrace estimate form; a
"Tedarik Radarı" stat-card framing for the suppliers page (still a table,
though it already showed confidence/staleness per row from Phase 6); a real
animated human avatar (`Cinematic2DAvatarRenderer`, architected in
`docs/AVATAR.md` but not built).

### Real bugs found and fixed while verifying this redesign in an actual browser

1. **Hydration mismatch on the Agent Network page.** The orbit layout's
   `left`/`top` inline-style percentages were computed via raw
   `Math.cos`/`Math.sin` and interpolated into a template string; on a
   fresh page load React logged a server/client hydration mismatch because
   the two environments' floating-point `toString()` output didn't match
   digit-for-digit. Fixed by rounding to a fixed precision
   (`Math.round(x * 1000) / 1000`) before rendering, so both sides always
   produce byte-identical strings — never rely on raw float-to-string output
   being deterministic across two separate JS engine instances.
2. **A real double-listening race in the call screen.** `BeyzaCallScreen`
   had two separate code paths that could call `startListening()` for the
   same turn — an explicit call after speaking finished, and a `useEffect`
   reacting to the same state change — occasionally starting two
   `SpeechRecognition` instances back to back. In a sandboxed/headless
   browser environment (no real mic, no real speech backend) this
   manifested as an immediate spurious recognition error that could
   overwrite the visible transcript window before the first turn's answer
   was ever seen. Fixed by making the `useEffect` the single source of
   truth for "should we be listening now" and removing the duplicate
   explicit calls — a real correctness fix (a race that shouldn't exist),
   not merely a test workaround.
3. **A stray `encType="multipart/form-data"` on the photo-upload form**
   (pre-existing from Phase 4-6, only surfaced once this session's e2e test
   started asserting zero console errors across the full flow) — React
   warns that a form using a Server Action as its `action` sets `encType`
   automatically and an explicit one is ignored/conflicting. Fixed by
   removing the redundant attribute.
4. **Mobile bottom nav rendering on top of the full-screen call mode** —
   both are `fixed ... z-40`, and the nav painted later in the DOM. Fixed by
   hiding `MobileNav` specifically on the `/dashboard/beyza` route, found
   via an actual mobile-viewport screenshot (not visible from source review
   alone — this is exactly the kind of bug `CLAUDE.md`'s "actually run it"
   rule exists to catch).

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
npm run check   →  lint ✓  typecheck ✓  243 unit/integration tests (45 files) ✓  production build ✓
```

Plus a real end-to-end run: fresh DB → setup wizard → login → cinematic boot
sequence → lead creation → dedupe → 40 m² estimate → QA-gated quote →
downloadable PDF → Agent 06 photo section renders → lead-scoped Ask Beyza
reply → `/dashboard/inventory`, `/dashboard/settings/ai-usage`,
`/dashboard/suppliers`, `/dashboard/calendar`, `/dashboard/follow-ups`,
`/dashboard/finance` all render without a server error, the `/api/calendar/ics`
route returning a real `BEGIN:VCALENDAR`/`text/calendar` response, the Agent
Network showing exactly 20 agents, the full-screen call mode answering a
typed command through the real conversation engine, and zero console/page
errors across the entire run (asserted explicitly, not just absence of a
crash) — driven through actual Chromium via Playwright
(`tests/e2e/smoke.spec.ts`), not just asserted by the build. A second test
confirms `prefers-reduced-motion` actually disables the AI Core's CSS
animations.

Additionally verified by hand against a fresh migrated + seeded database,
logged in as the DEMO owner, with real browser screenshots reviewed at
desktop (1440×900), tablet (834×1112), and mobile (390×844) viewports: the
calendar page shows the seeded confirmed site-visit appointment and lets an
unscheduled job be picked from a real dropdown; the follow-ups page shows
the seeded due reminder; the finance page's win rate (100%), profit-floor
achievement (100%), and monthly gross-profit/margin numbers match the
seeded job's real numbers by hand calculation (€3,200 revenue − €1,970
actual cost = €1,230 gross profit, 38.4% margin); the inventory page
correctly flags both seeded items as low stock against their reorder
thresholds; the boot sequence, Command Center, Agent Network, call mode,
and lead intelligence cards were all visually reviewed against the redesign
brief's own acceptance question ("does this look like a generic admin
dashboard, or an original futuristic AI command system?") — two real UI
bugs were found this way (see "Real bugs found and fixed" above) that no
amount of source review would have caught.

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

All 10 master-spec phases are now built. What remains is scoped-out by
design (never a paid dependency, never fabricated data, never a rushed
security-sensitive feature), not left unfinished by oversight:

- **Phase 6** — a live "Fırsatlar" trend-chart board and automated
  (unattended) supplier scanning are not built: both would require either a
  paid scraping/search API or a scheduled background job. The manual-trigger
  URL fetch (owner pastes a real supplier URL) satisfies the "no fabricated
  live prices" requirement without either.
- **Phase 7** — ICS *import* has a working library function
  (`parseIcsCalendar`) but no UI entry point yet; external calendars are
  exported to, not synced from. Route optimization across multiple stops in
  a day is not attempted (a single-crew business books one job at a time,
  which the conflict-detection scheduling already handles).
- **Phase 8** — PWA icons are SVG-only; some older Android launchers may
  prefer a raster PNG (see `docs/PWA.md`). Offline dashboard use is
  out of scope by design (see the PWA section above) — this is a live
  operational app, not an offline-first one.
- **Phase 9** — Level B (official platform API connectors) and Level C
  (browser extension) remain not built, per `docs/FACEBOOK_CONNECTOR.md`:
  Level B needs real platform credentials there is nothing to fake, and
  Level C (a browser extension posting into the production app) needs a real
  auth/CORS design this session judged too risky to rush without dedicated
  scoping.
- **Phase 10** — the login rate limiter is in-process/single-instance only
  (documented in `lib/auth/login-rate-limit.ts`); a horizontally-scaled
  deployment would need a shared store. `docker build` is still unverified
  in this environment (no daemon running) — see "Not verified" below.

None of these are stubbed with fake UI — see `docs/AGENTS.md`,
`docs/FACEBOOK_CONNECTOR.md`, `docs/VOICE.md`, `docs/PWA.md`,
`docs/SUPPLIER_INTELLIGENCE.md`, and `docs/AI_COST_CONTROL.md` for exactly
what exists vs. what's genuinely not started, agent by agent.

**UX/UI redesign gaps** (see `docs/DESIGN_SYSTEM.md`'s "Known gaps" for the
full reasoning): the calendar page was not rebuilt into a real day/week/
agenda visual grid (still list+forms, reskinned); the pricing/estimate form
has no interactive "what-if" scenario sliders; the suppliers page has no
"Tedarik Radarı" stat-card framing (still a table). A real animated human
avatar (`Cinematic2DAvatarRenderer`) is architected (`docs/AVATAR.md`) but
not implemented — selecting it in Settings falls back to the AI Core with a
dev-console notice, never a silent claim that a human avatar is rendering.

## Resuming this work

1. Read `CLAUDE.md` first.
2. `npm run check` to confirm the baseline (as of this update: lint ✓,
   typecheck ✓, 243 tests ✓, build ✓, plus the extended
   `tests/e2e/smoke.spec.ts` — including the redesign's boot/Agent Network/
   call-mode/zero-console-errors assertions and a `prefers-reduced-motion`
   test — passing against a fresh DB, and `.github/workflows/ci.yml`
   running both automatically on push/PR).
3. Read `docs/DESIGN_SYSTEM.md` and `docs/AVATAR.md` before touching any
   `components/beyza/*` file — they explain the state model (`BeyzaCoreState`)
   and renderer abstraction that the boot sequence, Command Center, call
   mode, and Agent Network all share.
4. Everything in "What's deferred" above is a deliberate scope boundary, not
   an in-progress phase — pick one only if the user explicitly asks for it
   (it likely means adding a paid dependency, building a browser extension,
   or another security-sensitive feature that genuinely needs sign-off).
5. Keep this file and `tests.json` current as you go.
