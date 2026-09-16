import { describe, it, expect } from 'vitest';
import { findDuplicates, canAutoMerge, textSimilarity, type DedupeCandidate } from '@/lib/crm/dedupe';

describe('lead deduplication', () => {
  const existing: DedupeCandidate[] = [
    { id: 'lead-1', phone: '06-1234 5678', email: 'jan@example.com', rawText: 'Terras aanleggen in Dordrecht' },
    { id: 'lead-2', phone: '06-9999 0000', email: 'piet@example.com', rawText: 'Schutting plaatsen' },
  ];

  it('auto-merges on an exact phone match regardless of formatting', () => {
    const incoming: DedupeCandidate = { id: 'incoming', phone: '0612345678' };
    const matches = findDuplicates(incoming, existing);
    expect(matches[0]?.candidateId).toBe('lead-1');
    expect(matches[0]?.reason).toBe('phone');
    expect(canAutoMerge(matches[0]!).allowed).toBe(true);
  });

  it('auto-merges on an exact email match', () => {
    const incoming: DedupeCandidate = { id: 'incoming', email: 'JAN@example.com  ' };
    const matches = findDuplicates(incoming, existing);
    expect(matches[0]?.reason).toBe('email');
  });

  it('never auto-merges on text/name similarity alone', () => {
    const incoming: DedupeCandidate = {
      id: 'incoming',
      rawText: 'Terras aanleggen in Dordrecht aub',
    };
    const matches = findDuplicates(incoming, existing);
    const fuzzyMatch = matches.find((m) => m.reason === 'fuzzy_text');
    expect(fuzzyMatch).toBeDefined();
    expect(fuzzyMatch!.autoMergeEligible).toBe(false);
    expect(canAutoMerge(fuzzyMatch!).allowed).toBe(false);
  });

  it('does not flag unrelated leads as duplicates', () => {
    const incoming: DedupeCandidate = { id: 'incoming', phone: '0611112222', rawText: 'Onkruid verwijderen' };
    const matches = findDuplicates(incoming, existing);
    expect(matches).toHaveLength(0);
  });

  it('textSimilarity is 0 for completely unrelated text', () => {
    expect(textSimilarity('Terras aanleggen', 'Onkruid verwijderen achtertuin')).toBeLessThan(0.2);
  });
});
