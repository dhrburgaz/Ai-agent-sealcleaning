# The 20 Logical Agents

Per the product spec, these are 20 **logical** capabilities, not 20 always-on LLM
chat loops (rule #12, section 14). Most are — and should stay — plain
deterministic code; only a few genuinely need a model, and even those only at
Tier 3/4 when a paid provider is explicitly configured and budgeted (see
`AI_COST_CONTROL.md`).

The authoritative machine-readable list, including build status, lives in
`lib/agents/definitions.ts` (seeded into the `agent_config` table on first run).
This document is the human-readable companion.

| # | Agent | Status | Where |
|---|---|---|---|
| 01 | Beyza / Command Orchestrator | **Implemented (deterministic + voice I/O)** | `lib/agents/beyza-orchestrator.ts`, `app/dashboard/actions.ts`, `components/dashboard/AskBeyza.tsx` |
| 02 | Lead Radar | Partial — manual capture only; social connectors are Phase 9 | `app/dashboard/leads` |
| 03 | Lead Enrichment & Deduplication | **Implemented (deterministic)** | `lib/crm/dedupe.ts` |
| 04 | Qualification & Priority | **Implemented (deterministic)** | `lib/crm/qualification.ts` |
| 05 | Dutch Sales & Messaging | **Implemented (deterministic)** | `lib/messaging/templates.ts` |
| 06 | Photo / Vision Inspector | **Implemented (deterministic skeleton + AI-router gated)** | `lib/agents/vision-inspector.ts`, `app/dashboard/leads/[id]/actions.ts` (`uploadPhotoAction`, `updatePhotoAnalysisAction`) |
| 07 | Measurement & Scope Builder | **Implemented (deterministic)** | `lib/pricing/ceramic-terrace-template.ts`, `db/schema/scope.ts` |
| 08 | Technical Method Planner | **Implemented (deterministic)** | `lib/pricing/method-planner.ts` |
| 09 | Pricing & Margin Engine | **Implemented (deterministic)** | `lib/pricing/engine.ts` |
| 10 | Supplier & Deal Scout | **Implemented (manual entry + owner-pasted URL fetch + landed-cost math)** — automated scanning/scraping is out of scope (no paid scraping API) | `lib/suppliers/landed-cost.ts`, `lib/suppliers/url-price-fetcher.ts` |
| 11 | Bill of Materials / Quantity Agent | **Implemented (deterministic)** | `lib/pricing/bom.ts` |
| 12 | Waste & Disposal Agent | **Implemented (deterministic)** | `lib/pricing/waste.ts` |
| 13 | Equipment & Rental Agent | **Implemented (deterministic)** | `lib/pricing/equipment.ts` |
| 14 | Labour & Crew Planner | **Implemented (deterministic)** | `lib/pricing/labour.ts` |
| 15 | Scheduling & Route Agent | **Implemented (deterministic)** | `lib/scheduling/calendar.ts`, `app/dashboard/calendar/actions.ts` (`scheduleJobAction`) |
| 16 | Calendar & Appointment Agent | **Implemented (deterministic)** | `app/dashboard/calendar/`, `lib/scheduling/ics.ts`, `/api/calendar/ics` |
| 17 | CRM, Memory & Follow-up Agent | **Implemented (deterministic)**, including automated follow-up scheduling | `lib/crm/state-machine.ts`, `lib/crm/follow-up.ts`, `app/dashboard/follow-ups/`, `lib/orchestration/register-handlers.ts` |
| 18 | Finance & Job Costing Agent | **Implemented (deterministic)** — per-job actual-vs-estimate plus monthly/pipeline/win-rate reporting | `lib/jobs/costing.ts`, `lib/jobs/finance-report.ts`, `app/dashboard/finance/` |
| 19 | Reputation & Content Agent | **Implemented (deterministic)** — review-request drafting; broader content marketing out of scope | `lib/orchestration/register-handlers.ts` (`job.completed` handler), `db/schema/leads.ts#reviewRequests` |
| 20 | QA, Compliance & System Health Agent | **Implemented (deterministic)**, now also records `agent_runs` for every agent invocation across the system | `lib/pricing/qa-gate.ts`, `lib/orchestration/agent-run.ts` |

## Why so many agents are "deterministic" rather than "AI"

The spec is explicit (section 2, 14): the product must be **fully useful at €0
AI spend**. Every agent that can be correctly modeled as arithmetic, a lookup,
or a rule (pricing, BOM, waste, qualification scoring, dedupe, state
transitions, QA gates) is implemented as plain code — this is strictly better
than an LLM call here: it's free, instant, deterministic, and auditable.

Only genuinely open-ended tasks (interpreting an arbitrary photo, holding a
free-form conversation) actually need a model. Agent 06 (Photo/Vision
Inspector) is the one implemented agent that is AI-gated: its deterministic
skeleton (`buildManualReviewSkeleton`, `sanitizeMeasurementClaims`,
`computePhotoConfidence`) always runs first and produces an honest
"awaiting manual review" result with zero AI spend; a real vision-model call
would layer on top through `lib/ai/model-router.ts` only if a provider is
configured, budgeted, and enabled — never silently, and never above the
configured budget. With no key configured (the shipped default), Agent 06
is fully usable as a manual-review queue.

## Orchestration (section 47)

`lib/orchestration/events.ts` implements a synchronous, in-process event bus
(`EventBus`, singleton `eventBus`) so agents react to real state changes
instead of polling or chat-looping. Six events are wired end-to-end via
`lib/orchestration/register-handlers.ts`: `lead.created`, `message.received`,
`photo.added`, `scope.changed`, `quote.approved`, `job.completed`. Every
handler invocation is wrapped in `withAgentRun()`
(`lib/orchestration/agent-run.ts`), which writes a row to `agent_runs`
(agent key, trigger, entity, input/output summary, confidence, provider,
cost, cache-hit flag, status) — this is the audit trail section 9 requires,
now populated for real instead of only by deterministic pricing/QA code.
Emitting an event is synchronous and in-process: no queue, no network hop,
no added latency budget, and no failure mode where an event is silently
dropped — a handler that throws is caught and recorded as a failed
`agent_run`, it does not take down the emitting action.

## AI provider router, caching, and resilience (Phase 5)

`lib/ai/model-router.ts` is the single entry point any agent must use to
reach a model — direct provider calls from agent code are not permitted.
Before ever reaching a network call it runs, in order:

1. **Budget gate** (unchanged from Phase 1-3, `lib/ai/router.ts`) — blocks
   outright unless a key is configured, the provider is owner-enabled, both
   monthly and daily caps are `> 0`, and the estimated cost fits the
   remaining budget.
2. **Prompt cache** (`lib/ai/cache.ts`, `prompt_cache` table) — hashes the
   task type + a compact context pack; an identical hash within the cache
   TTL returns the stored output with zero cost and `cacheHit: true` on the
   `agent_runs`/`api_usage` row, no provider call made.
3. **Circuit breaker** (`lib/ai/circuit-breaker.ts`) — a pure state machine
   (closed → open after N consecutive failures → half-open after a cooldown)
   per provider; an open circuit is skipped without attempting the network
   call, and the router falls back to the next configured tier.
4. **Retry/backoff** (`lib/ai/retry.ts`) — exponential backoff, but never
   retries a 4xx (the request itself is wrong, retrying wastes budget).

Provider adapters (`lib/ai/providers/{ollama,openai-compatible,gemini,nvidia,
anthropic}.ts`) share a common `types.ts` interface and take an injectable
`Transport` so tests never make a real network call. **None of this activates
anything by default** — with the shipped €0 budget and no keys configured,
every call is blocked at step 1 and the deterministic fallback (already
required by every agent) is what actually runs.

## Context packs (section 49)

`lib/ai/context-pack.ts` builds a compact, structured summary of a lead
(status, key facts, recent events) instead of ever prompting with raw
conversation history — smaller prompts, deterministic cache keys, and no
unbounded token growth as a lead's history lengthens. Packs are versioned and
persisted to `context_packs` so a cache hit can be traced back to exactly
what input produced it.

## Scheduling, calendar, follow-up, and finance (Phase 7)

- **Scheduling/calendar (Agents 15/16)**: `lib/scheduling/calendar.ts`
  provides deterministic double-booking prevention — `findSchedulingConflicts`
  expands every candidate and existing slot by its travel buffer before
  checking for overlap, so a site visit or job can never be booked on top of
  an existing one. `lib/scheduling/ics.ts` generates (and can parse) RFC 5545
  ICS text with no external dependency; `/api/calendar/ics` exports every
  calendar event as a downloadable/importable file for any standard calendar
  app. `app/dashboard/calendar/` proposes/confirms/cancels appointments (with
  the appropriate lead-state-machine transitions), schedules jobs, and lets
  the owner add manual calendar events (supplier pickups, rental
  pickup/return, disposal trips, private blocks).
- **Follow-up automation (Agent 17)**: `quote.sent` schedules the first
  follow-up 3 days out (`lib/crm/follow-up.ts#computeNextFollowUpDate`);
  `app/dashboard/follow-ups/` lists what's due, and sending one goes through
  the exact same template/approval/audit path as any other outbound message
  (`decideSend`) — never an unattended send. A successful send automatically
  queues the next step (day 7) unless the customer has opted out or the max
  step is reached, in which case the sequence stops.
- **Finance/BI reporting (Agent 18)**: `lib/jobs/finance-report.ts` adds
  monthly revenue/cost/margin aggregation, win rate (over decided leads
  only), and the €1,200 profit-floor achievement rate, all computed strictly
  from completed jobs, sent quotes, and decided leads — never a forecast
  presented as an actual. Rendered on `app/dashboard/finance/`.

## Agent Network visualization (UX redesign)

`app/dashboard/agents/` renders all 20 agents as an orbit around a central
BEYZA (Agent 01) — grouped into İstihbarat/Ticari/Operasyon/İletişim/Kontrol
(`lib/agents/agent-groups.ts`), never a flat grid of cards. Each node's
visual state (idle/working/waiting/blocked/error) is derived from that
agent's most recent real `agent_runs` row (`lib/server/agent-network.ts`) —
an agent that has never run shows idle, not a fabricated "busy" state.
Clicking a node opens a detail panel with its purpose, last run's trigger,
output summary, confidence, provider/cache-hit/cost, and build-status note.
The Command Center's "Canlı Akış" panel (`lib/server/activity-feed.ts`)
renders the same `agent_runs` data as a chronological feed with a short,
per-agent-key description — also real, also empty-when-nothing-happened.

## Cost/audit discipline per agent

Every agent, deterministic or not, is expected to have (per section 9):
trigger conditions, allowed/required inputs, structured output, a confidence
value, a cost policy, a cache policy, an approval boundary, a fallback
behavior, and an audit trail. For the implemented deterministic agents this is
satisfied by: pure, typed functions (inputs/outputs), confidence scoring
(`lib/pricing/confidence.ts`), the QA gate as the shared approval boundary, and
`audit_logs`/`lead_events`/`agent_runs` tables for the trail. As of this
phase, `agent_runs` is populated by every orchestration-event handler and
every model-router call, not just pricing/QA — see "Orchestration" above.
