/** Section 6.3 — Theme Settings page options 1-3 (option 4, Customer Demo Mode, is the separate toggle in lib/theme/demo-mode.ts). */
export const THEME_KEYS = ['ay-yildiz-dark-red', 'classic-premium-dark', 'neutral-business-light'] as const;
export type ThemeKey = (typeof THEME_KEYS)[number];
export const DEFAULT_THEME: ThemeKey = 'ay-yildiz-dark-red';

export function isValidTheme(value: string): value is ThemeKey {
  return (THEME_KEYS as readonly string[]).includes(value);
}
