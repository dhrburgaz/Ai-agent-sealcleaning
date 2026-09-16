import { describe, it, expect } from 'vitest';
import { renderStatusBriefing, parseOwnerCommand, type StatusSnapshot } from '@/lib/agents/beyza-orchestrator';

function snapshot(overrides: Partial<StatusSnapshot> = {}): StatusSnapshot {
  return {
    leadsLast24h: 8,
    hotLeads: 3,
    warmLeads: 2,
    unansweredInbound: 1,
    draftsWaiting: 0,
    quotesPending: 2,
    quotesPendingValueEur: 4200,
    visitsNext72h: 2,
    jobsNext7d: 1,
    pipelineValueEur: 4200,
    expectedProfitEur: 1500,
    overdueFollowUps: 0,
    supplierAlerts: 0,
    budgetAlert: false,
    connectorFailures: 0,
    generatedAt: new Date('2026-01-01T09:00:00Z'),
    ...overrides,
  };
}

describe('"Durumlar ne?" status briefing — works with zero AI', () => {
  it('renders a Turkish briefing purely from the snapshot, no network/AI call involved', () => {
    const text = renderStatusBriefing(snapshot());
    expect(text).toContain('8 yeni lead');
    expect(text).toContain('3 tanesi sıcak');
    expect(text).toContain('Boru hattı değeri');
  });

  it('omits sections with zero counts to stay concise', () => {
    const text = renderStatusBriefing(snapshot({ overdueFollowUps: 0, supplierAlerts: 0, connectorFailures: 0 }));
    expect(text).not.toContain('gecikti');
    expect(text).not.toContain('tedarikçi fiyat uyarısı');
  });
});

describe('owner command parser (section 46 sample commands)', () => {
  it('recognizes "Beyza, durumlar ne?"', () => {
    expect(parseOwnerCommand('Beyza, durumlar ne?')).toEqual({ intent: 'status_briefing' });
  });

  it('recognizes "Bugün kaç lead geldi?"', () => {
    expect(parseOwnerCommand('Bugün kaç lead geldi?')).toEqual({ intent: 'leads_today_count' });
  });

  it('recognizes a hypothetical price question and extracts the amount', () => {
    const result = parseOwnerCommand('Bu işi 2400 euroya verirsek ne kalır?');
    expect(result).toEqual({ intent: 'hypothetical_price', amountEur: 2400 });
  });

  it('recognizes a margin change command and extracts the percentage', () => {
    const result = parseOwnerCommand('Marjı yüzde 30 yap.');
    expect(result).toEqual({ intent: 'set_target_margin', percent: 30 });
  });

  it('recognizes an area statement like "Bu iş 40 metrekare."', () => {
    expect(parseOwnerCommand('Bu iş 40 metrekare.')).toEqual({ intent: 'set_area_m2', value: 40 });
  });

  it('never guesses on genuinely open-ended text — returns unsupported instead of fabricating an answer', () => {
    const result = parseOwnerCommand('Bana rastgele bir şiir yaz.');
    expect(result.intent).toBe('unsupported');
  });
});
