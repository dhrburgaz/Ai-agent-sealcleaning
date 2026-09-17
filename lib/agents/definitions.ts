/**
 * Section 9 — the 20 logical agents. This is metadata (trigger/cost-tier/status),
 * not 20 always-on chat loops (section 14 rule #12). Seeded into `agent_config` on
 * first-run setup and documented in docs/AGENTS.md.
 */

export type BuildStatus = 'implemented_deterministic' | 'partially_implemented' | 'planned';

export interface AgentDefinition {
  key: string;
  displayName: string;
  purpose: string;
  costTier: 'tier0' | 'tier1' | 'tier2' | 'tier3' | 'tier4';
  buildStatus: BuildStatus;
  buildNote: string;
}

export const AGENT_DEFINITIONS: AgentDefinition[] = [
  {
    key: 'agent01_orchestrator',
    displayName: 'Beyza / Command Orchestrator',
    purpose: 'Owner interface, status briefing, command routing.',
    costTier: 'tier0',
    buildStatus: 'implemented_deterministic',
    buildNote: 'Deterministic status briefing + rule-based command parser (lib/agents/beyza-orchestrator.ts).',
  },
  {
    key: 'agent02_lead_radar',
    displayName: 'Lead Radar',
    purpose: 'Find/ingest customer opportunities from permitted sources.',
    costTier: 'tier0',
    buildStatus: 'partially_implemented',
    buildNote: 'Manual lead capture form implemented; Facebook/platform connectors are Phase 9.',
  },
  {
    key: 'agent03_dedupe',
    displayName: 'Lead Enrichment & Deduplication',
    purpose: 'One clean record per real opportunity.',
    costTier: 'tier0',
    buildStatus: 'implemented_deterministic',
    buildNote: 'lib/crm/dedupe.ts: exact-identifier auto-merge, fuzzy text flagged for review only.',
  },
  {
    key: 'agent04_qualification',
    displayName: 'Qualification & Priority',
    purpose: 'Prioritize leads by business value.',
    costTier: 'tier0',
    buildStatus: 'implemented_deterministic',
    buildNote: 'lib/crm/qualification.ts, no protected-trait inputs accepted.',
  },
  {
    key: 'agent05_messaging',
    displayName: 'Dutch Sales & Messaging',
    purpose: 'Customer communication in natural Dutch.',
    costTier: 'tier0',
    buildStatus: 'implemented_deterministic',
    buildNote: 'lib/messaging/templates.ts, works with zero AI budget.',
  },
  {
    key: 'agent06_photo_vision',
    displayName: 'Photo / Vision Inspector',
    purpose: 'Analyze customer photos.',
    costTier: 'tier3',
    buildStatus: 'implemented_deterministic',
    buildNote:
      'lib/agents/vision-inspector.ts: deterministic manual-review skeleton always runs at €0; a real vision-model call layers on top only if a paid provider is configured/budgeted via lib/ai/model-router.ts.',
  },
  {
    key: 'agent07_scope_builder',
    displayName: 'Measurement & Scope Builder',
    purpose: 'Turn text/photos/measurements into structured scope.',
    costTier: 'tier0',
    buildStatus: 'implemented_deterministic',
    buildNote: 'db/schema/scope.ts + lib/pricing/ceramic-terrace-template.ts (known/assumed/unknown/must_verify_on_site).',
  },
  {
    key: 'agent08_method_planner',
    displayName: 'Technical Method Planner',
    purpose: 'Create a practical work method.',
    costTier: 'tier0',
    buildStatus: 'implemented_deterministic',
    buildNote: 'lib/pricing/method-planner.ts: rule-based method plan for the ceramic-terrace template, no model needed.',
  },
  {
    key: 'agent09_pricing',
    displayName: 'Pricing & Margin Engine',
    purpose: 'Deterministic commercial pricing.',
    costTier: 'tier0',
    buildStatus: 'implemented_deterministic',
    buildNote: 'lib/pricing/engine.ts, exact formulas from section 9, fully tested.',
  },
  {
    key: 'agent10_supplier_scout',
    displayName: 'Supplier & Deal Scout',
    purpose: 'Find cheapest acceptable procurement paths.',
    costTier: 'tier1',
    buildStatus: 'partially_implemented',
    buildNote:
      'lib/suppliers/landed-cost.ts + schema implemented; lib/suppliers/url-price-fetcher.ts adds owner-pasted-URL live price fetch with SSRF protection and mandatory source+timestamp. Fully automated (unattended) scanning is intentionally out of scope — it would need a paid scraping/search API or a scheduled job, neither available at €0.',
  },
  {
    key: 'agent11_bom',
    displayName: 'Bill of Materials / Quantity Agent',
    purpose: 'Calculate quantities.',
    costTier: 'tier0',
    buildStatus: 'implemented_deterministic',
    buildNote: 'lib/pricing/bom.ts.',
  },
  {
    key: 'agent12_waste_disposal',
    displayName: 'Waste & Disposal Agent',
    purpose: 'Prevent underpricing of disposal.',
    costTier: 'tier0',
    buildStatus: 'implemented_deterministic',
    buildNote: 'lib/pricing/waste.ts, refuses to price hazardous waste as normal disposal.',
  },
  {
    key: 'agent13_equipment',
    displayName: 'Equipment & Rental Agent',
    purpose: 'Determine machinery/tools.',
    costTier: 'tier0',
    buildStatus: 'implemented_deterministic',
    buildNote: 'lib/pricing/equipment.ts.',
  },
  {
    key: 'agent14_labour',
    displayName: 'Labour & Crew Planner',
    purpose: 'Estimate crew and time.',
    costTier: 'tier0',
    buildStatus: 'implemented_deterministic',
    buildNote: 'lib/pricing/labour.ts; calibration is suggestion-only, never auto-applied.',
  },
  {
    key: 'agent15_scheduling_route',
    displayName: 'Scheduling & Route Agent',
    purpose: 'Build efficient days.',
    costTier: 'tier0',
    buildStatus: 'implemented_deterministic',
    buildNote:
      'lib/scheduling/calendar.ts: deterministic double-booking prevention with a per-slot travel buffer, wired into job scheduling (app/dashboard/calendar/actions.ts#scheduleJobAction). Multi-stop route optimization across a full day is not attempted — a single-crew business books one job at a time.',
  },
  {
    key: 'agent16_calendar',
    displayName: 'Calendar & Appointment Agent',
    purpose: 'Book site visits/jobs.',
    costTier: 'tier0',
    buildStatus: 'implemented_deterministic',
    buildNote:
      'app/dashboard/calendar/: propose/confirm/cancel appointments (wired to the lead state machine), manual calendar events, and ICS export (lib/scheduling/ics.ts) via /api/calendar/ics. ICS import is implemented in the library (parseIcsCalendar) but has no UI entry point yet — external calendars are exported to, not synced from.',
  },
  {
    key: 'agent17_crm_followup',
    displayName: 'CRM, Memory & Follow-up Agent',
    purpose: 'Never forget a useful customer opportunity.',
    costTier: 'tier0',
    buildStatus: 'implemented_deterministic',
    buildNote:
      'Lead state machine, CRM tables, plus automated follow-up scheduling: quote.sent queues a first reminder 3 days out, app/dashboard/follow-ups/ lets the owner review/approve/send each due reminder (never an unattended send) and automatically queues the next step or opted-out otherwise.',
  },
  {
    key: 'agent18_finance_costing',
    displayName: 'Finance & Job Costing Agent',
    purpose: 'Know actual job economics.',
    costTier: 'tier0',
    buildStatus: 'implemented_deterministic',
    buildNote:
      'lib/jobs/costing.ts covers per-job estimate-vs-actual + profit floor check. lib/jobs/finance-report.ts adds monthly revenue/cost/margin aggregation, win rate, and profit-floor achievement rate, rendered on app/dashboard/finance/page.tsx — all computed only from real completed jobs/quotes/leads, never projected.',
  },
  {
    key: 'agent19_reputation_content',
    displayName: 'Reputation & Content Agent',
    purpose: 'Turn completed work into proof and future leads.',
    costTier: 'tier0',
    buildStatus: 'implemented_deterministic',
    buildNote:
      'job.completed orchestration handler (lib/orchestration/register-handlers.ts) drafts a review_requests row from the zero-AI review_request template as soon as a job completes, and advances the lead to REVIEW_REQUESTED. Owner-authored content marketing beyond the review-ask draft is out of scope — that is a creative task, not something to fabricate.',
  },
  {
    key: 'agent20_qa_compliance',
    displayName: 'QA, Compliance & System Health Agent',
    purpose: 'Final gatekeeper before send.',
    costTier: 'tier0',
    buildStatus: 'implemented_deterministic',
    buildNote: 'lib/pricing/qa-gate.ts blocks below-floor/unverified/unapproved sends.',
  },
];
