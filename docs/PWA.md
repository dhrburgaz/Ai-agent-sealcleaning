# PWA Packaging (Phase 8)

## What's implemented

- `public/manifest.webmanifest`: name, short name, start URL (`/dashboard`),
  standalone display mode, theme/background colors matching the default
  Ay-Yıldız Dark Red theme, and an SVG icon (`purpose: any` and
  `purpose: maskable`).
- `public/sw.js`: a minimal service worker registered client-side
  (`components/pwa/ServiceWorkerRegister.tsx`, feature-detected, silently a
  no-op where unsupported), giving the app "Add to Home Screen" /
  installability.
- `app/layout.tsx` links the manifest and icon and sets `theme-color` via
  Next.js's `viewport` export.

## What's deliberately NOT cached, and why

The service worker does **not** cache any dashboard route or API response.
This app is a live operational dashboard (`app/layout.tsx` forces
`dynamic = 'force-dynamic'` for exactly this reason) — every page reflects
current leads, prices, quotes, and inventory. Caching that HTML for offline
use would mean showing the owner stale business data presented as current,
which is exactly the kind of fabrication the master spec (section 2) forbids.
The service worker only cache-first-serves the two genuinely static assets
(`/icon.svg`, `/manifest.webmanifest`); every other request passes straight
through to the network untouched.

**Practical consequence**: offline use of the dashboard is out of scope by
design, not an oversight. Opening the installed app with no network shows
the browser's normal offline error for dynamic pages, same as opening it in
a regular tab.

## Known limitation: icon format

Icons are SVG only (`purpose: any` and `purpose: maskable` both point at the
same `icon.svg`). Modern Chrome/Edge/Android accept an SVG manifest icon;
some older Android launchers and some maskable-icon previews still expect a
raster PNG. Generating properly cropped multi-resolution PNGs would need an
image-processing dependency this build didn't add — revisit if real-device
install testing surfaces a problem with a specific launcher.
