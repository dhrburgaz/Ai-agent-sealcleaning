import { describe, it, expect } from 'vitest';
import { THEME_KEYS, DEFAULT_THEME, isValidTheme } from '@/lib/theme/constants';
import { maskSensitiveFields, isFieldHiddenInDemoMode } from '@/lib/theme/demo-mode';

describe('theme system (section 6.3)', () => {
  it('includes Ay-Yıldız Dark Red as the default theme', () => {
    expect(DEFAULT_THEME).toBe('ay-yildiz-dark-red');
    expect(THEME_KEYS).toContain('ay-yildiz-dark-red');
  });

  it('offers exactly the three documented color themes', () => {
    expect(THEME_KEYS).toEqual(['ay-yildiz-dark-red', 'classic-premium-dark', 'neutral-business-light']);
  });

  it('rejects unknown theme keys', () => {
    expect(isValidTheme('made-up-theme')).toBe(false);
    expect(isValidTheme('classic-premium-dark')).toBe(true);
  });
});

describe('Customer Demo Mode (section 6.4)', () => {
  it('hides API keys, labour costs, margins and internal notes when enabled', () => {
    const data = {
      customerName: 'Jan de Vries',
      apiKey: 'sk-secret',
      hourlyCost: 35,
      grossMargin: 0.32,
      internalNote: 'onbetrouwbare klant',
    };
    const masked = maskSensitiveFields(data, true);
    expect(masked.customerName).toBe('Jan de Vries');
    expect(masked.apiKey).toBeNull();
    expect(masked.hourlyCost).toBeNull();
    expect(masked.grossMargin).toBeNull();
    expect(masked.internalNote).toBeNull();
  });

  it('leaves data untouched when demo mode is disabled', () => {
    const data = { apiKey: 'sk-secret', grossMargin: 0.32 };
    expect(maskSensitiveFields(data, false)).toEqual(data);
  });

  it('identifies which field names are considered sensitive', () => {
    expect(isFieldHiddenInDemoMode('grossMargin')).toBe(true);
    expect(isFieldHiddenInDemoMode('customerName')).toBe(false);
  });
});
