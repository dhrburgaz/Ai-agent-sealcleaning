import { describe, it, expect } from 'vitest';
import { summarizeContextPack } from '@/lib/ai/context-pack';

describe('context pack summarizer (section 49) — compact, not raw history', () => {
  it('collapses full DB rows into a compact structured summary', () => {
    const pack = summarizeContextPack({
      lead: { id: 'lead-1', state: 'QUALIFIED', location: 'Dordrecht', serviceCategory: 'terrassen_aanleggen' },
      customerName: 'Jan de Vries',
      latestEstimate: { recommendedExVat: 3200, grossProfit: 1400, commercialFit: 'strong' },
      latestQuoteStatus: 'sent',
      scopeMeasurements: [{ kind: 'm2', value: 40, status: 'known' }],
      scopeAssumptions: [
        { description: 'Kazı derinliği doğrulanmalı.', mustVerifyOnSite: true },
        { description: 'Fiyat teklife dahil.', mustVerifyOnSite: false },
      ],
      latestMessage: { direction: 'inbound', body: 'Evet, ilgileniyorum.' },
    });

    expect(pack.leadId).toBe('lead-1');
    expect(pack.customerName).toBe('Jan de Vries');
    expect(pack.keyMeasurements).toHaveLength(1);
    // Only must-verify assumptions surface as "missing info" — not every assumption.
    expect(pack.missingInfo).toEqual(['Kazı derinliği doğrulanmalı.']);
    expect(pack.expectedProfitEur).toBe(1400);
    expect(pack.commercialFit).toBe('strong');
    expect(pack.quoteStatus).toBe('sent');
  });

  it('handles a brand-new lead with no estimate/quote/message yet', () => {
    const pack = summarizeContextPack({
      lead: { id: 'lead-2', state: 'NEW', location: null, serviceCategory: 'tuinonderhoud' },
      customerName: null,
      latestEstimate: null,
      latestQuoteStatus: null,
      scopeMeasurements: [],
      scopeAssumptions: [],
      latestMessage: null,
    });

    expect(pack.missingInfo).toEqual([]);
    expect(pack.expectedProfitEur).toBeNull();
    expect(pack.latestMessage).toBeNull();
  });
});
