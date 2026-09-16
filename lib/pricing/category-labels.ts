/**
 * Section 4/21 — the customer-facing quote PDF must be Dutch. Internal estimate
 * line labels (e.g. "İşçilik") are Turkish for the owner's own breakdown view and
 * must never leak into a customer document — translate by category instead of
 * reusing the stored label.
 */
const CATEGORY_LABELS_NL: Record<string, string> = {
  materials: 'Materiaal',
  labour: 'Arbeid',
  waste: 'Afvoer / verwerking',
  rentals: 'Materieelhuur',
  logistics: 'Transport',
  subcontractors: 'Onderaanneming',
  permits: 'Vergunningen',
  consumables: 'Verbruiksmateriaal',
  overhead: 'Algemene kosten',
  risk: 'Risico-opslag',
};

export function categoryLabelNl(category: string): string {
  return CATEGORY_LABELS_NL[category] ?? category;
}
