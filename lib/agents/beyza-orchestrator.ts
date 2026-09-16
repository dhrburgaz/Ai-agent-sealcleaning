/**
 * Agent 01 — Beyza / Command Orchestrator (master spec section 9 / 1, 45, 46).
 * Zero-AI by design: the status briefing and the sample owner commands are handled
 * with database state + deterministic parsing (Tier 0 in the routing model from
 * section 15), so "Beyza, durumlar ne?" keeps working with no AI keys configured.
 */

export interface StatusSnapshot {
  leadsLast24h: number;
  hotLeads: number;
  warmLeads: number;
  unansweredInbound: number;
  draftsWaiting: number;
  quotesPending: number;
  quotesPendingValueEur: number;
  visitsNext72h: number;
  jobsNext7d: number;
  pipelineValueEur: number;
  expectedProfitEur: number;
  overdueFollowUps: number;
  supplierAlerts: number;
  budgetAlert: boolean;
  connectorFailures: number;
  generatedAt: Date;
}

function euro(n: number): string {
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(Math.round(n));
}

/** Renders the Turkish deterministic status briefing (section 45). Works with zero AI. */
export function renderStatusBriefing(s: StatusSnapshot): string {
  const parts: string[] = [];
  parts.push('Durum net.');
  parts.push(`Son 24 saatte ${s.leadsLast24h} yeni lead geldi.`);
  if (s.hotLeads > 0 || s.warmLeads > 0) {
    parts.push(`${s.hotLeads} tanesi sıcak, ${s.warmLeads} tanesi ılık.`);
  }
  if (s.unansweredInbound > 0) {
    parts.push(`${s.unansweredInbound} müşteri mesajı cevap bekliyor.`);
  }
  if (s.draftsWaiting > 0) {
    parts.push(`${s.draftsWaiting} taslak mesaj onay bekliyor.`);
  }
  if (s.quotesPending > 0) {
    parts.push(
      `Bekleyen tekliflerin toplam değeri ${euro(s.quotesPendingValueEur)} euro (${s.quotesPending} teklif).`,
    );
  }
  if (s.visitsNext72h > 0) {
    parts.push(`Önümüzdeki 72 saatte ${s.visitsNext72h} keşif var.`);
  }
  if (s.jobsNext7d > 0) {
    parts.push(`Önümüzdeki 7 günde ${s.jobsNext7d} iş planlanmış.`);
  }
  parts.push(
    `Boru hattı değeri ${euro(s.pipelineValueEur)} euro, tahmini kâr ${euro(s.expectedProfitEur)} euro.`,
  );
  if (s.overdueFollowUps > 0) {
    parts.push(`${s.overdueFollowUps} müşteri takibi gecikti.`);
  }
  if (s.supplierAlerts > 0) {
    parts.push(`${s.supplierAlerts} tedarikçi fiyat uyarısı var.`);
  }
  if (s.budgetAlert) {
    parts.push('AI bütçesi eşiğe yaklaştı.');
  }
  if (s.connectorFailures > 0) {
    parts.push(`${s.connectorFailures} bağlayıcı hata veriyor.`);
  }
  return parts.join(' ');
}

export type OwnerCommandIntent =
  | { intent: 'status_briefing' }
  | { intent: 'leads_today_count' }
  | { intent: 'top_hot_leads'; count: number }
  | { intent: 'leads_in_city'; city: string }
  | { intent: 'pending_quotes' }
  | { intent: 'unanswered_leads' }
  | { intent: 'weekly_profit' }
  | { intent: 'tomorrow_availability' }
  | { intent: 'hypothetical_price'; amountEur: number }
  | { intent: 'set_target_margin'; percent: number }
  | { intent: 'set_area_m2'; value: number }
  | { intent: 'set_material_sourcing'; material: 'tiles' | 'sand'; suppliedBy: 'customer' | 'company' }
  | { intent: 'set_disposal_included'; included: boolean }
  | { intent: 'cheapest_supplier_for'; material: string }
  | { intent: 'job_remaining_days' }
  | { intent: 'crew_size_needed' }
  | { intent: 'photo_analysis_summary' }
  | { intent: 'missing_info_for_job' }
  | { intent: 'last_job_hours_variance' }
  | { intent: 'price_freshness_check' }
  | { intent: 'generate_quote_pdf' }
  | { intent: 'profit_floor_check' }
  | { intent: 'unsupported'; raw: string };

const CITY_PATTERN = /\b([A-ZÇĞİÖŞÜ][\wçğıöşü]+)\s+içinde/i;
const EURO_AMOUNT_PATTERN = /(\d+(?:[.,]\d+)?)\s*euro/i;
const PERCENT_PATTERN = /(?:yüzde|%)\s*(\d+(?:[.,]\d+)?)/i;
const M2_PATTERN = /(\d+(?:[.,]\d+)?)\s*(?:m2|metrekare|m²)/i;

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Rule-based Turkish command parser for the sample commands in section 46.
 * Anything outside this known set returns `unsupported` rather than guessing —
 * open-ended natural language is Tier 1+ (section 15) and requires a configured,
 * budgeted AI provider.
 */
export function parseOwnerCommand(raw: string): OwnerCommandIntent {
  const text = normalize(raw);

  if (/durum(lar)?\s*ne/.test(text)) return { intent: 'status_briefing' };
  if (/bugün kaç lead/.test(text)) return { intent: 'leads_today_count' };

  const hotMatch = text.match(/en (?:iyi|sıcak) (\w+)/);
  if (hotMatch) {
    const numberWords: Record<string, number> = { bir: 1, iki: 2, üç: 3, dört: 4, beş: 5 };
    const digit = parseInt(hotMatch[1] ?? '', 10);
    const count = Number.isFinite(digit) ? digit : (numberWords[hotMatch[1] ?? ''] ?? 3);
    return { intent: 'top_hot_leads', count };
  }

  const cityMatch = text.match(CITY_PATTERN);
  if (cityMatch && /göster|içindekiler/.test(text)) {
    return { intent: 'leads_in_city', city: cityMatch[1] ?? '' };
  }

  if (/bekleyen teklif/.test(text)) return { intent: 'pending_quotes' };
  if (/cevap vermeyen/.test(text)) return { intent: 'unanswered_leads' };
  if (/bu hafta ne kazandık|realized profit|bu hafta.*kar/.test(text)) {
    return { intent: 'weekly_profit' };
  }
  if (/yarın.*boş muyuz|yarın.*keşif/.test(text)) return { intent: 'tomorrow_availability' };

  const euroMatch = text.match(EURO_AMOUNT_PATTERN);
  if (euroMatch && /verirsem|verirsek|ne kalır/.test(text)) {
    return { intent: 'hypothetical_price', amountEur: parseFloat((euroMatch[1] ?? '0').replace(',', '.')) };
  }

  const percentMatch = text.match(PERCENT_PATTERN);
  if (percentMatch && /marj/.test(text)) {
    return { intent: 'set_target_margin', percent: parseFloat((percentMatch[1] ?? '0').replace(',', '.')) };
  }

  const m2Match = text.match(M2_PATTERN);
  if (m2Match) {
    return { intent: 'set_area_m2', value: parseFloat((m2Match[1] ?? '0').replace(',', '.')) };
  }

  if (/taşları müşteri alacak|müşteri.*taş/.test(text)) {
    return { intent: 'set_material_sourcing', material: 'tiles', suppliedBy: 'customer' };
  }
  if (/kumu.*biz halledeceğiz|kum.*biz/.test(text)) {
    return { intent: 'set_material_sourcing', material: 'sand', suppliedBy: 'company' };
  }
  if (/çöpe gidecek|çöp.*götür/.test(text)) {
    return { intent: 'set_disposal_included', included: true };
  }

  if (/en ucuz.*(maliyet|toplam)/.test(text)) {
    const materialMatch = text.match(/(keramik|seramik|kum|tegel)/);
    return { intent: 'cheapest_supplier_for', material: materialMatch?.[1] ?? 'malzeme' };
  }

  if (/kaç gün sürer/.test(text)) return { intent: 'job_remaining_days' };
  if (/kaç kişi lazım/.test(text)) return { intent: 'crew_size_needed' };
  if (/fotoğraf.*(ne görüyorsun|analiz)/.test(text)) return { intent: 'photo_analysis_summary' };
  if (/ne eksik|hangi bilgi eksik/.test(text)) return { intent: 'missing_info_for_job' };
  if (/kaç saat sapmışız|saat.*sap/.test(text)) return { intent: 'last_job_hours_variance' };
  if (/ne zaman kontrol edildi|güncel mi/.test(text)) return { intent: 'price_freshness_check' };
  if (/pdf.*hazırla|teklif.*pdf/.test(text)) return { intent: 'generate_quote_pdf' };
  if (/1200 euro kâr|kâr hedefini tuttur/.test(text)) return { intent: 'profit_floor_check' };

  return { intent: 'unsupported', raw };
}

export const UNSUPPORTED_COMMAND_REPLY =
  'Bu komutu şu an güvenli şekilde yorumlayamıyorum. Daha net ifade eder misiniz, ya da ilgili sayfadan (Lead\'ler, Teklifler, Fiyatlandırma) işlemi yapabilirim.';
