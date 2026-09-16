import { describe, it, expect } from 'vitest';
import { parseActualsDictation } from '@/lib/jobs/actuals-dictation-parser';

describe('actuals dictation parser (section 22)', () => {
  it('parses the exact example from the master spec', () => {
    const result = parseActualsDictation(
      'Beyza, bu iş 2 gün sürdü. Ben ve bir eleman çalıştık. Çöpe 310 euro, kiraya 145 euro, malzemeye 620 euro gitti.',
    );
    expect(result.daysWorked).toBe(2);
    expect(result.crewSize).toBe(2);
    expect(result.costs).toContainEqual({ category: 'waste', amount: 310 });
    expect(result.costs).toContainEqual({ category: 'rental', amount: 145 });
    expect(result.costs).toContainEqual({ category: 'materials', amount: 620 });
  });

  it('always requires confirmation before saving', () => {
    const result = parseActualsDictation('Bu iş 1 gün sürdü.');
    expect(result.requiresConfirmation).toBe(true);
  });

  it('returns null fields gracefully for unrecognized text', () => {
    const result = parseActualsDictation('Her şey yolunda gitti.');
    expect(result.daysWorked).toBeNull();
    expect(result.costs).toEqual([]);
  });
});
