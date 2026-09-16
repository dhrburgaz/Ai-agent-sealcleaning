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
| 01 | Beyza / Command Orchestrator | **Implemented (deterministic)** | `lib/agents/beyza-orchestrator.ts` |
| 02 | Lead Radar | Partial — manual capture only | `app/dashboard/leads` |
| 03 | Lead Enrichment & Deduplication | **Implemented (deterministic)** | `lib/crm/dedupe.ts` |
| 04 | Qualification & Priority | **Implemented (deterministic)** | `lib/crm/qualification.ts` |
| 05 | Dutch Sales & Messaging | **Implemented (deterministic)** | `lib/messaging/templates.ts` |
| 06 | Photo / Vision Inspector | Planned (Phase 5) | schema only: `photo_analyses`, `attachments` |
| 07 | Measurement & Scope Builder | **Implemented (deterministic)** | `lib/pricing/ceramic-terrace-template.ts`, `db/schema/scope.ts` |
| 08 | Technical Method Planner | Planned (Phase 4+) | schema only: `risk_flags` |
| 09 | Pricing & Margin Engine | **Implemented (deterministic)** | `lib/pricing/engine.ts` |
| 10 | Supplier & Deal Scout | Partial — manual entry + landed-cost math | `lib/suppliers/landed-cost.ts` |
| 11 | Bill of Materials / Quantity Agent | **Implemented (deterministic)** | `lib/pricing/bom.ts` |
| 12 | Waste & Disposal Agent | **Implemented (deterministic)** | `lib/pricing/waste.ts` |
| 13 | Equipment & Rental Agent | **Implemented (deterministic)** | `lib/pricing/equipment.ts` |
| 14 | Labour & Crew Planner | **Implemented (deterministic)** | `lib/pricing/labour.ts` |
| 15 | Scheduling & Route Agent | Planned (Phase 7) | — |
| 16 | Calendar & Appointment Agent | Planned (Phase 7) | schema only: `appointments`, `calendar_events` |
| 17 | CRM, Memory & Follow-up Agent | **Implemented (deterministic)** — automation is Phase 7 | `lib/crm/state-machine.ts`, `lib/crm/follow-up.ts` |
| 18 | Finance & Job Costing Agent | Partial — actual-vs-estimate only | `lib/jobs/costing.ts` |
| 19 | Reputation & Content Agent | Planned (Phase 7) | schema only: `review_requests` |
| 20 | QA, Compliance & System Health Agent | **Implemented (deterministic)** | `lib/pricing/qa-gate.ts` |

## Why so many agents are "deterministic" rather than "AI"

The spec is explicit (section 2, 14): the product must be **fully useful at €0
AI spend**. Every agent that can be correctly modeled as arithmetic, a lookup,
or a rule (pricing, BOM, waste, qualification scoring, dedupe, state
transitions, QA gates) is implemented as plain code — this is strictly better
than an LLM call here: it's free, instant, deterministic, and auditable.

Only genuinely open-ended tasks (interpreting an arbitrary photo, planning a
technically novel method, holding a free-form conversation) actually need a
model. Those are marked "Planned" above and will route through `lib/ai/router.ts`
once a provider is configured — never silently, and never above the configured
budget.

## Cost/audit discipline per agent

Every agent, deterministic or not, is expected to have (per section 9):
trigger conditions, allowed/required inputs, structured output, a confidence
value, a cost policy, a cache policy, an approval boundary, a fallback
behavior, and an audit trail. For the implemented deterministic agents this is
satisfied by: pure, typed functions (inputs/outputs), confidence scoring
(`lib/pricing/confidence.ts`), the QA gate as the shared approval boundary, and
`audit_logs`/`lead_events`/`agent_runs` tables for the trail.
