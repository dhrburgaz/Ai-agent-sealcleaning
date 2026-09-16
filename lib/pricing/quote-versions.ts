/** Section 21 — quote versions carry a version number, diff, previous total, changed lines, reason. */

export interface QuoteLineSnapshot {
  label: string;
  amount: number;
}

export interface QuoteSnapshot {
  totalExVat: number;
  lines: QuoteLineSnapshot[];
}

export interface QuoteVersionDiff {
  previousTotal: number;
  newTotal: number;
  totalDelta: number;
  changedLines: string[];
}

export function diffQuoteVersions(previous: QuoteSnapshot, next: QuoteSnapshot): QuoteVersionDiff {
  const changedLines: string[] = [];
  const previousByLabel = new Map(previous.lines.map((l) => [l.label, l.amount]));
  const nextByLabel = new Map(next.lines.map((l) => [l.label, l.amount]));

  for (const [label, amount] of nextByLabel) {
    const prevAmount = previousByLabel.get(label);
    if (prevAmount === undefined) {
      changedLines.push(`+ ${label} (${amount.toFixed(2)})`);
    } else if (Math.abs(prevAmount - amount) > 0.005) {
      changedLines.push(`${label}: ${prevAmount.toFixed(2)} -> ${amount.toFixed(2)}`);
    }
  }
  for (const [label] of previousByLabel) {
    if (!nextByLabel.has(label)) {
      changedLines.push(`- ${label}`);
    }
  }

  return {
    previousTotal: previous.totalExVat,
    newTotal: next.totalExVat,
    totalDelta: next.totalExVat - previous.totalExVat,
    changedLines,
  };
}
