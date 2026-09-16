/** Section 6/50 — hash photos so a repeated upload never triggers a second (paid) vision call. */

export function findExistingAnalysisByHash(
  knownHashes: string[],
  newImageHash: string,
): { alreadyAnalyzed: boolean } {
  return { alreadyAnalyzed: knownHashes.includes(newImageHash) };
}
