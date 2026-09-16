import { describe, it, expect } from 'vitest';
import { findExistingAnalysisByHash } from '@/lib/pricing/image-dedupe';

describe('image hash prevents duplicate vision calls (section 50)', () => {
  it('recognizes a previously seen image hash', () => {
    expect(findExistingAnalysisByHash(['abc123', 'def456'], 'abc123').alreadyAnalyzed).toBe(true);
  });

  it('treats a new image hash as unseen', () => {
    expect(findExistingAnalysisByHash(['abc123'], 'zzz999').alreadyAnalyzed).toBe(false);
  });
});
