/**
 * Section 21 — Quote PDF. Customer-facing default is a neutral premium business
 * design; the internal "Beyza Security" aesthetic is never applied unless
 * explicitly enabled (Customer Demo Mode / theme settings never leak in here).
 */
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from 'pdf-lib';

/**
 * The standard Helvetica font only supports WinAnsi (Latin-1) encoding, which
 * covers Dutch diacritics (ë, ï, ö, ü, ç, ...) fine but not the Turkish-specific
 * letters İ/ı/Ğ/ğ/Ş/ş. Free-text fields (customer names, addresses) can contain
 * those — transliterate just those few instead of letting pdf-lib throw and
 * losing the whole quote generation over a single name.
 */
const WINANSI_FALLBACKS: Record<string, string> = {
  İ: 'I',
  ı: 'i',
  Ğ: 'G',
  ğ: 'g',
  Ş: 'S',
  ş: 's',
};

function toWinAnsiSafe(text: string): string {
  return text.replace(/[İıĞğŞş]/g, (char) => WINANSI_FALLBACKS[char] ?? char);
}

export interface QuoteScopeLine {
  label: string;
  quantity?: number;
  unit?: string;
}

export interface QuotePricingLine {
  label: string;
  amount: number;
}

export interface QuotePdfData {
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyKvk?: string;
  companyVat?: string;
  customerName: string;
  projectAddress?: string;
  quoteNumber: string;
  date: Date;
  validUntil?: Date;
  languageLevel: 'prijsindicatie' | 'offerte';
  scope: QuoteScopeLine[];
  inclusions: string[];
  exclusions: string[];
  customerSuppliedItems: string[];
  companySuppliedItems: string[];
  disposalIncluded: boolean;
  planningNote?: string;
  pricingLines: QuotePricingLine[];
  totalExVat: number;
  vatRatePercent: number;
  vatAmount: number;
  totalIncVat: number;
  paymentTerms: string;
  assumptions: string[];
  optionalItems: string[];
  acceptanceNote: string;
}

const MARGIN = 50;
const PAGE_WIDTH = 595.28; // A4 pt
const PAGE_HEIGHT = 841.89;

function eur(n: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n);
}

function dateNl(d: Date): string {
  return new Intl.DateTimeFormat('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
}

interface Cursor {
  page: PDFPage;
  y: number;
}

function ensureSpace(doc: PDFDocument, cursor: Cursor, needed: number): Cursor {
  if (cursor.y - needed < MARGIN) {
    const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    return { page, y: PAGE_HEIGHT - MARGIN };
  }
  return cursor;
}

function writeLine(
  doc: PDFDocument,
  cursor: Cursor,
  text: string,
  font: PDFFont,
  size: number,
  color = rgb(0.1, 0.1, 0.12),
): Cursor {
  const next = ensureSpace(doc, cursor, size + 6);
  next.page.drawText(toWinAnsiSafe(text), {
    x: MARGIN,
    y: next.y,
    size,
    font,
    color,
    maxWidth: PAGE_WIDTH - MARGIN * 2,
  });
  return { page: next.page, y: next.y - size - 6 };
}

function writeHeading(doc: PDFDocument, cursor: Cursor, text: string, font: PDFFont): Cursor {
  const withSpace = ensureSpace(doc, cursor, 26);
  const next = writeLine(doc, { page: withSpace.page, y: withSpace.y - 10 }, text, font, 13, rgb(0.05, 0.05, 0.05));
  return next;
}

export async function generateQuotePdf(data: QuotePdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let cursor: Cursor = { page, y: PAGE_HEIGHT - MARGIN };

  cursor = writeLine(doc, cursor, data.companyName, bold, 18);
  const companyMeta = [data.companyAddress, data.companyPhone, data.companyEmail]
    .filter(Boolean)
    .join(' · ');
  if (companyMeta) cursor = writeLine(doc, cursor, companyMeta, font, 9, rgb(0.35, 0.35, 0.35));
  const legalMeta = [data.companyKvk ? `KVK: ${data.companyKvk}` : null, data.companyVat ? `BTW: ${data.companyVat}` : null]
    .filter(Boolean)
    .join(' · ');
  if (legalMeta) cursor = writeLine(doc, cursor, legalMeta, font, 9, rgb(0.35, 0.35, 0.35));

  cursor = { page: cursor.page, y: cursor.y - 10 };
  const title = data.languageLevel === 'offerte' ? 'Offerte' : 'Prijsindicatie';
  cursor = writeLine(doc, cursor, title, bold, 16);

  cursor = writeLine(doc, cursor, `Nummer: ${data.quoteNumber}`, font, 10);
  cursor = writeLine(doc, cursor, `Datum: ${dateNl(data.date)}`, font, 10);
  if (data.validUntil) {
    cursor = writeLine(doc, cursor, `Geldig tot: ${dateNl(data.validUntil)}`, font, 10);
  }

  cursor = writeHeading(doc, cursor, 'Klant', bold);
  cursor = writeLine(doc, cursor, data.customerName, font, 10);
  if (data.projectAddress) cursor = writeLine(doc, cursor, data.projectAddress, font, 10);

  cursor = writeHeading(doc, cursor, 'Werkzaamheden', bold);
  for (const line of data.scope) {
    const qty = line.quantity !== undefined ? ` (${line.quantity}${line.unit ? ' ' + line.unit : ''})` : '';
    cursor = writeLine(doc, cursor, `• ${line.label}${qty}`, font, 10);
  }

  if (data.inclusions.length) {
    cursor = writeHeading(doc, cursor, 'Inbegrepen', bold);
    for (const item of data.inclusions) cursor = writeLine(doc, cursor, `• ${item}`, font, 10);
  }
  if (data.exclusions.length) {
    cursor = writeHeading(doc, cursor, 'Niet inbegrepen', bold);
    for (const item of data.exclusions) cursor = writeLine(doc, cursor, `• ${item}`, font, 10);
  }
  if (data.customerSuppliedItems.length) {
    cursor = writeHeading(doc, cursor, 'Door klant geleverd', bold);
    for (const item of data.customerSuppliedItems) cursor = writeLine(doc, cursor, `• ${item}`, font, 10);
  }
  if (data.companySuppliedItems.length) {
    cursor = writeHeading(doc, cursor, 'Door ons geleverd', bold);
    for (const item of data.companySuppliedItems) cursor = writeLine(doc, cursor, `• ${item}`, font, 10);
  }

  cursor = writeHeading(doc, cursor, 'Afvoer', bold);
  cursor = writeLine(
    doc,
    cursor,
    data.disposalIncluded ? 'Afvoer van oud materiaal is inbegrepen.' : 'Afvoer van oud materiaal is niet inbegrepen.',
    font,
    10,
  );

  if (data.planningNote) {
    cursor = writeHeading(doc, cursor, 'Planning', bold);
    cursor = writeLine(doc, cursor, data.planningNote, font, 10);
  }

  cursor = writeHeading(doc, cursor, 'Prijsopbouw', bold);
  for (const line of data.pricingLines) {
    cursor = writeLine(doc, cursor, `${line.label}: ${eur(line.amount)}`, font, 10);
  }
  cursor = writeLine(doc, cursor, `Subtotaal excl. BTW: ${eur(data.totalExVat)}`, bold, 11);
  cursor = writeLine(doc, cursor, `BTW (${data.vatRatePercent}%): ${eur(data.vatAmount)}`, font, 10);
  cursor = writeLine(doc, cursor, `Totaal incl. BTW: ${eur(data.totalIncVat)}`, bold, 12);

  cursor = writeHeading(doc, cursor, 'Betalingsvoorwaarden', bold);
  cursor = writeLine(doc, cursor, data.paymentTerms, font, 10);

  if (data.assumptions.length) {
    cursor = writeHeading(doc, cursor, 'Aannames', bold);
    for (const item of data.assumptions) cursor = writeLine(doc, cursor, `• ${item}`, font, 9, rgb(0.3, 0.3, 0.3));
  }
  if (data.optionalItems.length) {
    cursor = writeHeading(doc, cursor, 'Optionele items', bold);
    for (const item of data.optionalItems) cursor = writeLine(doc, cursor, `• ${item}`, font, 9, rgb(0.3, 0.3, 0.3));
  }

  cursor = writeHeading(doc, cursor, 'Akkoord', bold);
  cursor = writeLine(doc, cursor, data.acceptanceNote, font, 9, rgb(0.3, 0.3, 0.3));

  return doc.save();
}
