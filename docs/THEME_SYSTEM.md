# Theme System (section 6)

## Themes

Defined as CSS custom properties in `app/globals.css`, switched via
`data-theme` on `<html>` (set server-side in `app/layout.tsx` from the
`theme_configs` table, so there's no flash of the wrong theme):

1. **Ay-Yıldız Dark Red** (`ay-yildiz-dark-red`) — default. Deep black/charcoal
   surfaces, rich Turkish red accent, restrained gold, a low-opacity mosque
   skyline silhouette (`.mosque-skyline-backdrop`, an inline SVG data URI — no
   external asset, no giant religious imagery, decorative only).
2. **Classic Premium Dark** (`classic-premium-dark`) — neutral dark, blue accent.
3. **Neutral Business Light** (`neutral-business-light`) — light, corporate blue accent.

Switching themes is one write to `theme_configs` (`app/dashboard/settings/theme/actions.ts`)
plus a `revalidatePath('/', 'layout')`; no client-side flicker, no page reload
required beyond the server round-trip.

`lib/theme/constants.ts` is the single source of truth for the valid theme
keys — both the setup wizard and the settings page validate against it.

## 4. Customer Demo Mode

A separate boolean (`theme_configs.customerDemoMode`), toggled on the same
Theme Settings page as option 4. When enabled:

- `lib/theme/demo-mode.ts#maskSensitiveFields` nulls out any field whose name
  matches API keys, hourly/labour costs, margins, profit, or internal notes —
  applied wherever server data is shaped for a screen a customer/partner might
  see.
- The `[data-demo-mode="true"]` CSS attribute swaps to a calmer, neutral accent
  regardless of the active color theme, so a demo never shows the full
  internal Ay-Yıldız aesthetic to an outside viewer.

This is a display/data-shaping concern, not a permissions system — it does not
replace authentication. Anyone who can log in can also toggle it off.

## Design constraints (do not relax)

- No giant flags/religious imagery, ever.
- Decorative motifs stay low-opacity and atmospheric — legibility first.
- Color is never the only signal for status (icons/text always pair with color).
- The customer-facing quote PDF is a separate, neutral design — it never uses
  the internal Ay-Yıldız aesthetic (`lib/documents/quote-pdf.ts`), per section 21.
