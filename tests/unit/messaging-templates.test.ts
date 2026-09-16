import { describe, it, expect } from 'vitest';
import { renderTemplate, availableTemplateKeys } from '@/lib/messaging/templates';

const facts = { companyName: 'DEMO Hovenier Dordrecht', baseCity: 'Dordrecht' };

describe('Dutch messaging templates — work with zero AI budget', () => {
  it('renders every template key deterministically without any network/AI call', () => {
    for (const key of availableTemplateKeys()) {
      const text = renderTemplate(key, { facts });
      expect(typeof text).toBe('string');
      expect(text.length).toBeGreaterThan(0);
    }
  });

  it('renders the first response in Dutch, mentioning the base city', () => {
    const text = renderTemplate('first_response', { facts });
    expect(text).toContain('Dordrecht');
    expect(text.toLowerCase()).toContain('goedenavond');
  });

  it('renders an indicative price range using the provided bounds', () => {
    const text = renderTemplate('indicative_price_range', {
      facts,
      lowPrice: 2500,
      highPrice: 3200,
      unknownFactors: ['toegangsbreedte'],
    });
    expect(text).toContain('2.500');
    expect(text).toContain('3.200');
    expect(text).toContain('€');
    expect(text).toContain('prijsindicatie');
  });

  it('falls back to a neutral message when no price range is available yet', () => {
    const text = renderTemplate('indicative_price_range', { facts });
    expect(text).toContain('niet vast te stellen');
  });

  it('never fabricates business facts not present in the context (e.g. phone in decline)', () => {
    const withoutPhone = renderTemplate('polite_decline', { facts });
    expect(withoutPhone).not.toMatch(/\+31|bereiken op/);
  });
});
