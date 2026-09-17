/**
 * Which real agent module each owner-command intent actually invokes
 * (app/dashboard/actions.ts#askBeyzaAction). Used only to show the owner
 * which agents are genuinely active while a voice/text command executes
 * (redesign instruction #23's "EXECUTING" display) — this mirrors the real
 * code path per case, it is not a decorative/fabricated list.
 */
import type { OwnerCommandIntent } from './beyza-orchestrator';

export const AGENTS_FOR_INTENT: Record<OwnerCommandIntent['intent'], string[]> = {
  status_briefing: ['agent01_orchestrator'],
  leads_today_count: ['agent01_orchestrator'],
  top_hot_leads: ['agent04_qualification'],
  leads_in_city: ['agent02_lead_radar'],
  pending_quotes: ['agent09_pricing'],
  unanswered_leads: ['agent17_crm_followup'],
  weekly_profit: ['agent18_finance_costing'],
  tomorrow_availability: ['agent16_calendar'],
  hypothetical_price: ['agent09_pricing'],
  set_target_margin: ['agent09_pricing'],
  set_area_m2: ['agent07_scope_builder'],
  set_material_sourcing: ['agent07_scope_builder'],
  set_disposal_included: ['agent12_waste_disposal'],
  cheapest_supplier_for: ['agent10_supplier_scout'],
  job_remaining_days: ['agent14_labour'],
  crew_size_needed: ['agent14_labour'],
  photo_analysis_summary: ['agent06_photo_vision'],
  missing_info_for_job: ['agent07_scope_builder'],
  last_job_hours_variance: ['agent18_finance_costing'],
  price_freshness_check: ['agent10_supplier_scout'],
  generate_quote_pdf: ['agent09_pricing', 'agent20_qa_compliance'],
  profit_floor_check: ['agent20_qa_compliance'],
  open_hottest_lead: ['agent04_qualification'],
  open_quote_for_customer: ['agent05_messaging'],
  unsupported: ['agent01_orchestrator'],
};
