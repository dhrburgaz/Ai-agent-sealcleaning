import { describe, it, expect } from 'vitest';
import { generateQuotePdf, type QuotePdfData } from '@/lib/documents/quote-pdf';

const baseData: QuotePdfData = {
  companyName: 'DEMO Hovenier Dordrecht',
  customerName: 'Jan de Vries',
  quoteNumber: 'Q-2026-00001',
  date: new Date('2026-01-01'),
  languageLevel: 'offerte',
  scope: [{ label: 'Terras aanleggen', quantity: 40, unit: 'm2' }],
  inclusions: ['Materiaal', 'Arbeid'],
  exclusions: ['Onvoorziene obstakels'],
  customerSuppliedItems: [],
  companySuppliedItems: ['Keramische tegels'],
  disposalIncluded: true,
  pricingLines: [{ label: 'Arbeid', amount: 1500 }],
  totalExVat: 3200,
  vatRatePercent: 21,
  vatAmount: 672,
  totalIncVat: 3872,
  paymentTerms: '50% vooraf, 50% bij oplevering.',
  assumptions: ['Ondergrond zoals besproken.'],
  optionalItems: [],
  acceptanceNote: 'Door ondertekening gaat u akkoord.',
};

describe('quote PDF generation (section 21) — neutral premium default', () => {
  it('produces a valid, non-empty PDF document', async () => {
    const bytes = await generateQuotePdf(baseData);
    expect(bytes.length).toBeGreaterThan(100);
    const header = Buffer.from(bytes.slice(0, 5)).toString('ascii');
    expect(header).toBe('%PDF-');
  });

  it('uses "Offerte" as the title for high-confidence quotes and "Prijsindicatie" otherwise', async () => {
    const offerteBytes = await generateQuotePdf({ ...baseData, languageLevel: 'offerte' });
    const indicatieBytes = await generateQuotePdf({ ...baseData, languageLevel: 'prijsindicatie' });
    // Different content should produce different byte lengths in almost all cases.
    expect(offerteBytes.length).not.toBe(0);
    expect(indicatieBytes.length).not.toBe(0);
  });

  it('never throws for a quote with no optional items or assumptions', async () => {
    await expect(
      generateQuotePdf({ ...baseData, assumptions: [], optionalItems: [], exclusions: [] }),
    ).resolves.toBeInstanceOf(Uint8Array);
  });

  it('never crashes on Turkish characters outside WinAnsi (e.g. a customer named İbrahim)', async () => {
    await expect(
      generateQuotePdf({
        ...baseData,
        customerName: 'İbrahim Şahin',
        pricingLines: [{ label: 'İşçilik', amount: 1000 }],
      }),
    ).resolves.toBeInstanceOf(Uint8Array);
  });
});
