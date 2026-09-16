import { describe, it, expect } from 'vitest';
import { diffQuoteVersions } from '@/lib/pricing/quote-versions';

describe('quote version diff (section 21)', () => {
  it('detects changed, added, and removed lines between versions', () => {
    const v1 = { totalExVat: 3200, lines: [{ label: 'Arbeid', amount: 1500 }, { label: 'Materiaal', amount: 1000 }] };
    const v2 = {
      totalExVat: 3600,
      lines: [{ label: 'Arbeid', amount: 1500 }, { label: 'Materiaal', amount: 1200 }, { label: 'Afvoer', amount: 200 }],
    };
    const diff = diffQuoteVersions(v1, v2);
    expect(diff.previousTotal).toBe(3200);
    expect(diff.newTotal).toBe(3600);
    expect(diff.totalDelta).toBe(400);
    expect(diff.changedLines.some((l) => l.startsWith('Materiaal'))).toBe(true);
    expect(diff.changedLines.some((l) => l.startsWith('+ Afvoer'))).toBe(true);
  });

  it('detects removed lines', () => {
    const v1 = { totalExVat: 1000, lines: [{ label: 'Optie A', amount: 200 }] };
    const v2 = { totalExVat: 800, lines: [] };
    const diff = diffQuoteVersions(v1, v2);
    expect(diff.changedLines).toContain('- Optie A');
  });

  it('reports no changes for identical versions', () => {
    const v1 = { totalExVat: 500, lines: [{ label: 'Arbeid', amount: 500 }] };
    const diff = diffQuoteVersions(v1, { ...v1, lines: [...v1.lines] });
    expect(diff.changedLines).toHaveLength(0);
    expect(diff.totalDelta).toBe(0);
  });
});
