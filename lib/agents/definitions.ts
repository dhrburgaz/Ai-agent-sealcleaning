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
    buildStatus: 'planned',
    buildNote: 'DB tables (photo_analyses, attachments) and upload validation exist; vision inference is Phase 5.',
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
    costTier: 'tier2',
    buildStatus: 'planned',
    buildNote: 'risk_flags table exists; narrative method planning is Phase 4+.',
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
    buildNote: 'lib/suppliers/landed-cost.ts + schema implemented; live scanning connectors are Phase 6.',
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
    costTier: 'tier1',
    buildStatus: 'planned',
    buildNote: 'Phase 7.',
  },
  {
    key: 'agent16_calendar',
    displayName: 'Calendar & Appointment Agent',
    purpose: 'Book site visits/jobs.',
    costTier: 'tier0',
    buildStatus: 'planned',
    buildNote: 'appointments/calendar_events tables exist; UI and ICS import/export are Phase 7.',
  },
  {
    key: 'agent17_crm_followup',
    displayName: 'CRM, Memory & Follow-up Agent',
    purpose: 'Never forget a useful customer opportunity.',
    costTier: 'tier0',
    buildStatus: 'implemented_deterministic',
    buildNote: 'Lead state machine, CRM tables. Automated follow-up scheduling is Phase 7.',
  },
  {
    key: 'agent18_finance_costing',
    displayName: 'Finance & Job Costing Agent',
    purpose: 'Know actual job economics.',
    costTier: 'tier0',
    buildStatus: 'partially_implemented',
    buildNote: 'lib/jobs/costing.ts covers estimate-vs-actual + profit floor check. Full monthly/pipeline reports are Phase 7.',
  },
  {
    key: 'agent19_reputation_content',
    displayName: 'Reputation & Content Agent',
    purpose: 'Turn completed work into proof and future leads.',
    costTier: 'tier2',
    buildStatus: 'planned',
    buildNote: 'review_requests table exists; content drafting is Phase 7.',
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
