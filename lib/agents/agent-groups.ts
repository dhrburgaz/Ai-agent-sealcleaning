/**
 * Agent Network layout grouping (redesign instruction #7). Deliberately
 * has NO server/database imports — it's used directly by the client-side
 * orbit visualization (components/beyza/AgentNetwork.tsx), and pulling in
 * anything from lib/server/* here would drag better-sqlite3 into the
 * browser bundle.
 */
export type AgentGroupKey = 'intelligence' | 'commercial' | 'operations' | 'communication' | 'control';

export const AGENT_GROUPS: Record<AgentGroupKey, { label: string; agentKeys: string[] }> = {
  intelligence: {
    label: 'İSTİHBARAT',
    agentKeys: ['agent02_lead_radar', 'agent03_dedupe', 'agent04_qualification', 'agent06_photo_vision', 'agent07_scope_builder'],
  },
  commercial: {
    label: 'TİCARİ',
    agentKeys: [
      'agent09_pricing',
      'agent10_supplier_scout',
      'agent11_bom',
      'agent12_waste_disposal',
      'agent13_equipment',
      'agent14_labour',
    ],
  },
  operations: {
    label: 'OPERASYON',
    agentKeys: ['agent15_scheduling_route', 'agent16_calendar', 'agent17_crm_followup', 'agent18_finance_costing'],
  },
  communication: {
    label: 'İLETİŞİM',
    agentKeys: ['agent05_messaging', 'agent19_reputation_content'],
  },
  control: {
    label: 'KONTROL',
    agentKeys: ['agent08_method_planner', 'agent20_qa_compliance'],
  },
};
