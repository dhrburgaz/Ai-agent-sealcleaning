/**
 * Section 10/13 — "owner_pasted_url" supplier price mode. A plain HTTP fetch
 * plus heuristic price extraction, no paid API and no headless browser. This
 * is inherently fragile (real product pages vary enormously) so every result
 * is returned with an honest low/unverified confidence and the raw HTML
 * snippet it was extracted from, for the owner to actually check — it is
 * never treated as authoritative on its own (see lib/suppliers/landed-cost.ts,
 * which still requires evidence for any discount claim regardless of source).
 */

export interface FetchPriceOptions {
  timeoutMs?: number;
  maxBytes?: number;
  fetchImpl?: typeof fetch;
}

export interface FetchedPriceResult {
  success: boolean;
  priceEur: number | null;
  currency: string | null;
  extractionMethod: 'structured_data' | 'text_heuristic' | null;
  rawSnippet: string | null;
  sourceUrl: string;
  fetchedAt: Date;
  error?: string;
}

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024; // 2MB — a product page is never legitimately larger than this for our purposes

const BLOCKED_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^\[?::1\]?$/,
  /^\[?fc[0-9a-f]{2}:/i,
  /^\[?fe80:/i,
];

function isBlockedHost(hostname: string): boolean {
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)) return true;
  return BLOCKED_HOSTNAME_PATTERNS.some((pattern) => pattern.test(hostname));
}

export function validateSupplierUrl(rawUrl: string): { valid: boolean; reason?: string; url?: URL } {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { valid: false, reason: 'Geçersiz URL.' };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { valid: false, reason: 'Yalnızca http/https URL kabul edilir.' };
  }
  if (isBlockedHost(url.hostname)) {
    return { valid: false, reason: 'İç ağ/localhost adreslerine istek yapılamaz.' };
  }
  return { valid: true, url };
}

// Structured-data price patterns, checked in order of reliability.
const STRUCTURED_PRICE_PATTERNS = [
  /"price"\s*:\s*"?(\d+[.,]\d{1,2})"?/i, // JSON-LD Product/Offer
  /<meta[^>]+itemprop=["']price["'][^>]+content=["'](\d+[.,]\d{1,2})["']/i,
  /<meta[^>]+property=["']product:price:amount["'][^>]+content=["'](\d+[.,]\d{1,2})["']/i,
];

const TEXT_HEURISTIC_PATTERN = /€\s?(\d{1,4}(?:[.,]\d{3})*[.,]\d{2})/;

export function extractPriceFromHtml(html: string): {
  priceEur: number | null;
  extractionMethod: FetchedPriceResult['extractionMethod'];
  rawSnippet: string | null;
} {
  for (const pattern of STRUCTURED_PRICE_PATTERNS) {
    const match = html.match(pattern);
    if (match) {
      const price = parseFloat(match[1]!.replace(',', '.'));
      if (Number.isFinite(price)) {
        return { priceEur: price, extractionMethod: 'structured_data', rawSnippet: match[0] };
      }
    }
  }

  const textMatch = html.match(TEXT_HEURISTIC_PATTERN);
  if (textMatch) {
    // Normalize "1.234,56" or "1234.56" style thousand/decimal separators.
    const normalized = textMatch[1]!.replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.');
    const price = parseFloat(normalized);
    if (Number.isFinite(price)) {
      return { priceEur: price, extractionMethod: 'text_heuristic', rawSnippet: textMatch[0] };
    }
  }

  return { priceEur: null, extractionMethod: null, rawSnippet: null };
}

export async function fetchSupplierPriceFromUrl(
  rawUrl: string,
  options: FetchPriceOptions = {},
): Promise<FetchedPriceResult> {
  const fetchedAt = new Date();
  const validation = validateSupplierUrl(rawUrl);
  if (!validation.valid) {
    return {
      success: false,
      priceEur: null,
      currency: null,
      extractionMethod: null,
      rawSnippet: null,
      sourceUrl: rawUrl,
      fetchedAt,
      error: validation.reason,
    };
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetchImpl(validation.url!.toString(), {
      signal: controller.signal,
      headers: { 'User-Agent': 'BeyzaSecurity-SupplierPriceCheck/1.0' },
      redirect: 'follow',
    });

    if (!response.ok) {
      return {
        success: false,
        priceEur: null,
        currency: null,
        extractionMethod: null,
        rawSnippet: null,
        sourceUrl: rawUrl,
        fetchedAt,
        error: `Sayfa alınamadı (HTTP ${response.status}).`,
      };
    }

    const reader = response.body?.getReader();
    let html = '';
    if (reader) {
      const decoder = new TextDecoder();
      let totalBytes = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.length;
        html += decoder.decode(value, { stream: true });
        if (totalBytes > (options.maxBytes ?? DEFAULT_MAX_BYTES)) break;
      }
    } else {
      html = await response.text();
    }

    const extracted = extractPriceFromHtml(html);
    return {
      success: extracted.priceEur !== null,
      priceEur: extracted.priceEur,
      currency: extracted.priceEur !== null ? 'EUR' : null,
      extractionMethod: extracted.extractionMethod,
      rawSnippet: extracted.rawSnippet,
      sourceUrl: rawUrl,
      fetchedAt,
      error: extracted.priceEur === null ? 'Sayfada fiyat bulunamadı, manuel kontrol gerekli.' : undefined,
    };
  } catch (error) {
    return {
      success: false,
      priceEur: null,
      currency: null,
      extractionMethod: null,
      rawSnippet: null,
      sourceUrl: rawUrl,
      fetchedAt,
      error: error instanceof Error ? error.message : 'Bilinmeyen hata.',
    };
  } finally {
    clearTimeout(timeout);
  }
}
