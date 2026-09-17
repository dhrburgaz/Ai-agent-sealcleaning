import { describe, it, expect, vi } from 'vitest';
import { validateSupplierUrl, extractPriceFromHtml, fetchSupplierPriceFromUrl } from '@/lib/suppliers/url-price-fetcher';

describe('supplier URL validation — basic SSRF guard', () => {
  it('accepts a normal https product URL', () => {
    expect(validateSupplierUrl('https://example.com/product/123').valid).toBe(true);
  });

  it('rejects non-http(s) protocols', () => {
    expect(validateSupplierUrl('file:///etc/passwd').valid).toBe(false);
    expect(validateSupplierUrl('ftp://example.com').valid).toBe(false);
  });

  it('rejects localhost and private network addresses', () => {
    expect(validateSupplierUrl('http://localhost:3000/admin').valid).toBe(false);
    expect(validateSupplierUrl('http://127.0.0.1/secret').valid).toBe(false);
    expect(validateSupplierUrl('http://192.168.1.1/').valid).toBe(false);
    expect(validateSupplierUrl('http://10.0.0.5/').valid).toBe(false);
    expect(validateSupplierUrl('http://169.254.169.254/latest/meta-data').valid).toBe(false);
  });

  it('rejects a malformed URL', () => {
    expect(validateSupplierUrl('not a url').valid).toBe(false);
  });
});

describe('price extraction heuristics', () => {
  it('prefers JSON-LD structured price data over plain text', () => {
    const html = `<script type="application/ld+json">{"@type":"Offer","price":"24.95","priceCurrency":"EUR"}</script><p>was €40.00 now €24,95</p>`;
    const result = extractPriceFromHtml(html);
    expect(result.extractionMethod).toBe('structured_data');
    expect(result.priceEur).toBeCloseTo(24.95, 2);
  });

  it('reads a meta itemprop=price tag', () => {
    const html = `<meta itemprop="price" content="19.99">`;
    const result = extractPriceFromHtml(html);
    expect(result.priceEur).toBeCloseTo(19.99, 2);
  });

  it('falls back to a €X,XX text pattern when no structured data exists', () => {
    const html = `<div class="price">€ 24,95</div>`;
    const result = extractPriceFromHtml(html);
    expect(result.extractionMethod).toBe('text_heuristic');
    expect(result.priceEur).toBeCloseTo(24.95, 2);
  });

  it('handles thousand separators in the text fallback', () => {
    const html = `<div>€1.234,56</div>`;
    const result = extractPriceFromHtml(html);
    expect(result.priceEur).toBeCloseTo(1234.56, 2);
  });

  it('returns null when no price can be found anywhere', () => {
    const result = extractPriceFromHtml('<html><body>Geen prijs beschikbaar</body></html>');
    expect(result.priceEur).toBeNull();
    expect(result.extractionMethod).toBeNull();
  });
});

describe('fetchSupplierPriceFromUrl — honest about being unverified', () => {
  it('never fetches a blocked (private/localhost) URL', async () => {
    const fetchImpl = vi.fn();
    const result = await fetchSupplierPriceFromUrl('http://localhost/admin', { fetchImpl });
    expect(result.success).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('extracts a price from a mocked successful response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: null,
      text: async () => '<meta itemprop="price" content="24.95">',
    });
    const result = await fetchSupplierPriceFromUrl('https://shop.example.com/tegel', { fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(result.success).toBe(true);
    expect(result.priceEur).toBeCloseTo(24.95, 2);
    expect(result.currency).toBe('EUR');
  });

  it('reports a clear error for a non-ok HTTP response instead of guessing', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 404, body: null, text: async () => '' });
    const result = await fetchSupplierPriceFromUrl('https://shop.example.com/missing', {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('404');
  });

  it('reports an honest failure when the page has no extractable price', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200, body: null, text: async () => '<p>no price here</p>' });
    const result = await fetchSupplierPriceFromUrl('https://shop.example.com/nopricehere', {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.success).toBe(false);
    expect(result.priceEur).toBeNull();
  });
});
