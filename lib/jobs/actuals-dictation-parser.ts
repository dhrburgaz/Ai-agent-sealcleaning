/**
 * Section 22 — Job Cost Learning. Parses owner Turkish dictation like:
 *   "Beyza, bu iş 2 gün sürdü. Ben ve bir eleman çalıştık. Çöpe 310 euro,
 *    kiraya 145 euro, malzemeye 620 euro gitti."
 * into structured actuals. Deterministic regex parsing — zero AI required.
 * The caller must always show a confirmation screen before saving (never auto-save).
 */

export type ActualCostCategory = 'waste' | 'rental' | 'materials' | 'travel' | 'subcontractor' | 'unexpected';

export interface ParsedActualCost {
  category: ActualCostCategory;
  amount: number;
}

export interface ParsedActuals {
  daysWorked: number | null;
  crewSize: number | null;
  costs: ParsedActualCost[];
  requiresConfirmation: true;
}

const NUMBER_WORDS: Record<string, number> = {
  bir: 1,
  iki: 2,
  üç: 3,
  dört: 4,
  beş: 5,
  altı: 6,
  yedi: 7,
};

const CATEGORY_KEYWORDS: [RegExp, ActualCostCategory][] = [
  [/çöp|atık|bertaraf/i, 'waste'],
  [/kira/i, 'rental'],
  [/malzeme/i, 'materials'],
  [/yol|benzin|seyahat/i, 'travel'],
  [/taşeron/i, 'subcontractor'],
  [/beklenmedik|ekstra/i, 'unexpected'],
];

function categoryFromSegment(segment: string): ActualCostCategory | null {
  for (const [pattern, category] of CATEGORY_KEYWORDS) {
    if (pattern.test(segment)) return category;
  }
  return null;
}

export function parseActualsDictation(raw: string): ParsedActuals {
  const text = raw.trim();

  const daysMatch = text.match(/(\d+)\s*gün/i);
  const daysWorked = daysMatch ? parseInt(daysMatch[1] ?? '', 10) : null;

  let crewSize: number | null = null;
  const hasOwner = /\bben\b/i.test(text);
  const crewNumberMatch = text.match(
    /(\d+|bir|iki|üç|dört|beş|altı|yedi)\s*(?:eleman|işçi|kişi|çalışan)/i,
  );
  if (hasOwner || crewNumberMatch) {
    const extra = crewNumberMatch
      ? (Number.isFinite(parseInt(crewNumberMatch[1] ?? '', 10))
          ? parseInt(crewNumberMatch[1] ?? '', 10)
          : (NUMBER_WORDS[(crewNumberMatch[1] ?? '').toLowerCase()] ?? 0))
      : 0;
    crewSize = (hasOwner ? 1 : 0) + extra;
  }

  const costs: ParsedActualCost[] = [];
  const segments = text.split(/[.,]/);
  for (const segment of segments) {
    const amountMatch = segment.match(/(\d+(?:[.,]\d+)?)\s*euro/i);
    const category = categoryFromSegment(segment);
    if (category && amountMatch) {
      costs.push({ category, amount: parseFloat((amountMatch[1] ?? '0').replace(',', '.')) });
    }
  }

  return { daysWorked, crewSize, costs, requiresConfirmation: true };
}
