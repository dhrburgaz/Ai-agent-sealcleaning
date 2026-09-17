# BEYZA Design System — Futuristic Ay-Yıldız Identity

This documents the visual redesign that replaced the original flat dark
admin-dashboard look with an original, premium AI-command-center identity.
It is an ADDITIVE visual layer on top of the existing theme system
(`lib/theme/constants.ts`, `app/globals.css`) — no business logic, pricing,
CRM, or test behavior changed to build this.

## Why this exists

The original Phase 1-6 build was functionally complete but looked like a
generic SaaS dashboard: thin borders, flat surfaces, no sense that "the
system is awake." This redesign gives BEYZA an original identity —
Turkish/Ay-Yıldız, dark crimson/graphite/gold, futuristic — centered on a
living AI presence (the AI Core) rather than a form-and-table UI with a
chatbox bolted on. See `docs/AVATAR.md` for the AI Core/avatar architecture
specifically, and `docs/VOICE.md` for the voice/call experience it powers.

## Palette (CSS custom properties, `app/globals.css`)

Per theme, in `rgb(r g b)` component form so Tailwind's `<alpha-value>`
opacity modifiers work (e.g. `bg-accent/50`):

| Token | Ay-Yıldız Dark Red (default) | Purpose |
|---|---|---|
| `--color-surface` | near-black (8 7 9) | Page background |
| `--color-surface-raised` | slightly lifted black | Cards, panels |
| `--color-graphite` | dark warm gray | Secondary surface depth |
| `--color-border` | dark maroon-gray | Hairline borders |
| `--color-accent` | crimson (176 24 34) | Primary actions, active states |
| `--color-accent-soft` | muted crimson | Hover/soft backgrounds |
| `--color-glow` | brighter crimson (214 40 52) | Glow/shadow effects, distinct from flat `--color-accent` so light can be layered without fighting contrast |
| `--color-gold` | warm gold (205 172 96) | Section labels, secondary emphasis, boot-sequence status text |
| `--color-silver` | light gray | Grid textures, subtle geometry |
| `--color-ink` / `--color-muted` | text colors | Primary/secondary text |

The other two themes (`classic-premium-dark`, `neutral-business-light`)
define the same token set with their own values, so every component built
against these tokens (glass panels, glow shadows, the AI Core) works
correctly under all three themes — the futuristic *treatment* (glow, glass,
grid) applies everywhere; only the *color* changes per theme.

**Customer Demo Mode** (`lib/theme/demo-mode.ts`) no longer forces a
different (blue, "neutral") color palette — it keeps whatever theme is
active and only masks sensitive *data* (profit, labour cost, API keys, PII).
This is a deliberate reversal of the original Phase 1-3 decision: the
master spec's Phase 10 instruction is for demo mode to be the strongest
demonstration of the product, not a watered-down one.

## Utility classes (`app/globals.css`)

- `.glass-panel` — the standard card/panel treatment: a soft vertical
  gradient, a hairline border, and `backdrop-filter: blur(14px)`. This
  replaced the flat `border border-border bg-surface-raised` pattern used
  throughout Phase 1-6 pages.
- `.hud-divider` — a thin horizontal line that fades to transparent at both
  ends with a glow-colored center, used instead of a plain border to
  separate sections inside a panel.
- `.grid-overlay` — a faint square grid background (HUD/blueprint texture),
  used behind the AI Core and the Agent Network orbit.
- `.radial-core-glow` — a radial gradient glow, used behind the AI Core.
  `.text-glow` — a small text-shadow glow for emphasized numbers/labels.
- `.mosque-skyline-backdrop` — pre-existing (Phase 1-3), a low-opacity
  generated SVG minaret/dome silhouette used as a bottom-of-panel backdrop
  on the Command Center hero and the boot sequence.

All of the above respect `prefers-reduced-motion: reduce` (animations
disabled outright) and the explicit "Pil tasarrufu" (battery saver)
preference in Settings > Beyza Ayarları
(`components/beyza/AnimationQualityGate.tsx`, `.beyza-battery-saver` class).

## Animation tokens (`tailwind.config.ts`)

`core-rotate-slow`/`core-rotate-reverse` (ring rotation), `core-pulse`
(breathing glow), `core-ping-slow` (listening rings), `hud-scan` (unused
today, reserved for a future HUD scan-line effect), `fade-in-up` (list/panel
entrance). All are plain CSS `@keyframes` + Tailwind `animation` utilities —
no WebGL, no canvas, no animation library dependency.

## Where this shows up

- **Boot sequence** (`components/beyza/boot/`): full cinematic boot on
  login/setup completion, abbreviated "wake" on a normal return.
- **Command Center** (`app/dashboard/page.tsx` +
  `components/beyza/CommandCenterHero.tsx`): the AI Core at the center of
  the page, a real live-activity feed sourced from `agent_runs`
  (`lib/server/activity-feed.ts`), glass-panel stat cards.
- **Full-screen voice/call mode** (`app/dashboard/beyza/`,
  `components/beyza/call/BeyzaCallScreen.tsx`).
- **Agent Network** (`app/dashboard/agents/`,
  `components/beyza/AgentNetwork.tsx`): the 20 agents as an orbit around
  Beyza, grouped by category (`lib/agents/agent-groups.ts`), state derived
  from real `agent_runs` (`lib/server/agent-network.ts`).
- **Lead intelligence cards** (`app/dashboard/leads/page.tsx`): replaced the
  flat list rows with data-dense cards (temperature, expected value/profit,
  confidence, photo count, next site visit, response timer).
- Every other dashboard page (calendar, follow-ups, finance, suppliers,
  inventory, pricebook, quotes, jobs, settings) got the `.glass-panel`/
  `.hud-divider` treatment applied to its existing section containers —
  visually consistent, but their *layout* (forms, tables, lists) was not
  rebuilt into a different interaction model. See "Known gaps" below.

## Known gaps (honest scope boundary, not an oversight)

The redesign brief asked for several secondary screens to be rebuilt as
genuinely different visual experiences, not just re-skinned. Given the
scope of everything else in this pass, these were **not** done and remain
exactly what they were before, only reskinned:

- **Calendar**: still a list of appointments/events plus forms, not a real
  day/week/agenda grid with draggable timeline blocks.
- **Pricing**: the ceramic-terrace estimate form is unchanged; no live
  "what-if" scenario sliders (extra worker, different margin, etc.) were
  added on top of the existing deterministic pricing engine.
- **Supplier Radar**: the suppliers page still shows a raw table, not the
  "EN UCUZ TOPLAM / EN HIZLI / EN İYİ MARJ" stat-card framing described in
  the brief (though it already showed confidence/staleness per row from
  Phase 6).

These would each be a substantial, focused follow-up in their own right —
attempting all of them in this same pass risked shipping shallow, half-done
versions of each rather than the deep, working experiences already built
for the Command Center/Agent Network/Call Mode/Lead Intelligence. See
`progress.md` for the same list tracked against the numbered redesign
instructions.
