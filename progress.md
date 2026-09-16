# Beyza Security — Build Progress

**Phase 1–3: COMPLETE.** Overall product (all 10 phases in the master spec):
**IN PROGRESS** — Phases 4–10 remain. This file, `tests.json`, and `CLAUDE.md`
are maintained together so a future session (or a compacted context) can
resume without re-deriving state.

Scope for this build was explicitly agreed with the user: build Phase 1–3
production-quality and fully working (not placeholders), maintain
`progress.md`/`tests.json`, spend no money, use no paid APIs, and don't stop
until lint/typecheck/tests/build all pass. All of that is done and verified —
see "Verification" below.

## What's actually built and working (not scaffolding)

### Foundation
- Next.js 15 (App Router) + React 19 + TypeScript strict, Tailwind CSS.
- Full SQLite schema via Drizzle ORM covering every entity in master-spec
  section 24 (56 tables) — `db/schema/*.ts`, migrated via `db/migrations/`.
- Single-owner auth: first-run password creation, bcrypt hashing, iron-session
  cookie, CSRF token utilities, configurable idle timeout enforced via a
  Server-Action heartbeat (`app/dashboard/session-actions.ts`) — see the
  "Bugs found and fixed" section below for why it's built that way.
- First-run setup wizard (Turkish, 9 screens covering all of section 25's
  content) — `app/setup/`.
- Theme system: Ay-Yıldız Dark Red (default) / Classic Premium Dark / Neutral
  Business Light, plus Customer Demo Mode as a fourth toggle that masks
  sensitive fields — `lib/theme/`, `app/dashboard/settings/theme/`.
- Command Center dashboard shell + nav, working "Beyza'ya Sor" box and a
  deterministic Turkish status briefing, all computed from real DB state with
  zero AI calls — `lib/agents/beyza-orchestrator.ts`, `lib/server/status-snapshot.ts`.

### CRM (Agents 02–04, 17)
- Manual lead capture, exact-identifier deduplication (phone/email/URL/platform
  id) with fuzzy-text matches flagged for review only (never auto-merged),
  qualification scoring (hot/warm/cold/insufficient/decline/bundle) with no
  protected-trait inputs, and the full 22-state lead state machine with an
  audit trail on every transition.

### Pricing (Agents 07, 09, 11–14, 20)
- Deterministic pricing engine with the exact section-9 formulas (margin, not
  markup), €1,200 profit floor, minimum job charge, owner override (always
  preserved separately from the system recommendation).
- BOM/quantity, waste/disposal (refuses to price suspected hazardous waste as
  normal waste), equipment-vs-extra-labour, and labour/crew calculators.
- The 40 m² ceramic terrace job template (section 12), verified to produce
  different totals for customer-supplied vs. company-supplied tiles and to
  never hardcode a total.
- QA/compliance gate (Agent 20): blocks below-floor pricing without a reasoned
  override, unresolved must-verify-on-site facts on a binding quote, stale
  prices, missing fields, and unapproved sends.

### Quotes & messaging (Agents 05, 21, 19-mode)
- Dutch, zero-AI message templates covering the full section-5/41 set.
- Approval modes (Draft Only / Smart Approval default / Autopilot with
  per-connector opt-in); the system can never self-enable autopilot.
- Quote generation with a neutral, premium-business PDF (pdf-lib), version
  history/diff, "prijsindicatie" vs "offerte" language keyed to confidence.

### Jobs & finance (Agent 18, partial)
- Job creation from a won lead, status transitions, a Turkish-dictation
  actuals parser (with mandatory manual confirmation before saving — nothing
  auto-saves from a dictation guess), and an estimate-vs-actual comparison
  that reports whether the €1,200 floor was actually achieved.

### Suppliers (Agent 10, partial)
- Manual supplier price observation entry, landed-cost calculation for a
  specific job quantity, discount-evidence requirement (a "sale" label
  without an evidence URL is rejected), and staleness flags.

### Cross-cutting
- Full docs set (see `docs/`), `.env.example`, Docker + docker-compose,
  backup/restore scripts, upload validation (MIME/size/path-traversal),
  secret redaction helpers, and the AI provider router enforcing the €0
  default budget.

## Bugs found and fixed during the build (via actual browser testing, not just `npm run check`)

`npm run check` (lint + typecheck + tests + build) was green well before the
app actually worked end to end. Two real runtime bugs only surfaced when the
app was driven through a real browser (Playwright) against a fresh database:

1. **Cookie writes from a Server Component.** `requireAuth()` was called from
   `app/dashboard/layout.tsx` (a Server Component render) and tried to call
   `session.save()`/`session.destroy()`, which Next.js only permits from a
   Server Action or Route Handler. Fixed by making `requireAuth()` read-only
   and adding a dedicated Server Action + client heartbeat component to keep
   the idle-timeout clock fresh. See `CLAUDE.md` for the pattern to follow.
2. **WinAnsi font crash on Turkish characters.** The PDF library's standard
   font can't encode İ/ı/Ğ/ğ/Ş/ş. This surfaced because internal (Turkish)
   estimate-line labels like "İşçilik" were being reused directly in the
   customer-facing (Dutch) PDF — itself a correctness bug, not just an
   encoding one. Fixed by (a) translating cost-category labels to Dutch for
   the PDF (`lib/pricing/category-labels.ts`) and (b) adding a defensive
   WinAnsi transliteration fallback in the PDF writer so a Turkish customer
   name never crashes quote generation.

Both are covered by regression tests (`tests/e2e/smoke.spec.ts` for the first;
`tests/unit/quote-pdf.test.ts`'s "İbrahim Şahin" case for the second).

There was also a genuine QA-gate data bug: the estimate's stored materials
cost and the QA gate's recomputed materials cost disagreed (one used the real
tile/sand cost, the other hardcoded 0), which meant **every** company-supplied
material quote was silently blocked by the math-consistency check. Fixed by
storing a real `materials` cost line and having the QA gate read it instead of
hardcoding zero.

## Verification

```
npm run check   →  lint ✓  typecheck ✓  139 unit/integration tests ✓  production build ✓
```

Plus a real end-to-end run: fresh DB → setup wizard → login → lead creation →
dedupe → 40 m² estimate → QA-gated quote → downloadable PDF, driven through
actual Chromium via Playwright (`tests/e2e/smoke.spec.ts`), not just asserted
by the build.

**Not verified**: `docker build` — Docker is installed in this environment but
there is no daemon running, so the Dockerfile/compose files are written and
reviewed but not actually built here. Verify in your own environment before
relying on them.

## Known accepted risks

- `npm audit` still reports one **high**-severity advisory: a `postcss`
  vulnerability nested inside Next.js's own internal build tooling
  (`next/node_modules/postcss`), only fixed by upgrading to Next.js 16 — a
  major version with breaking changes (React 19→a newer baseline, App Router
  changes) that was judged too large a rewrite to fold into this scope
  without explicit sign-off. Revisit when Phase 4+ work touches routing
  anyway, or if the user asks for it explicitly.
- Two **moderate** advisories are transitive dev-only tooling issues (`tsx`'s
  bundled `esbuild`, used only for scripts/migrations, never shipped to
  production) with no non-breaking fix currently available upstream.

## What's deferred, and why (by phase)

- **Phase 4** — remaining agent modules (photo/vision inspection, technical
  method planning), full event orchestration, deeper audit surfacing.
- **Phase 5** — real AI provider adapters (Ollama/OpenAI-compatible/Gemini/
  NVIDIA/Anthropic), prompt caching wired to a real provider, AI usage
  dashboard visualization.
- **Phase 6** — automated supplier price scanning, inventory wired end-to-end
  into the supplier comparison UI, live "Fırsatlar" board with trend charts.
- **Phase 7** — calendar UI + ICS import/export, routing/scheduling,
  automated follow-up sequencing, full finance/BI reporting.
- **Phase 8** — voice interface (push-to-talk, TTS), PWA packaging.
- **Phase 9** — browser extension, Facebook/social connector stubs beyond
  manual capture.
- **Phase 10** — richer demo data set, CI wiring for the Playwright suite,
  further hardening pass.

None of these are stubbed with fake UI — see `docs/AGENTS.md`,
`docs/FACEBOOK_CONNECTOR.md`, `docs/VOICE.md`, `docs/SUPPLIER_INTELLIGENCE.md`,
and `docs/AI_COST_CONTROL.md` for exactly what exists (schema, partial logic)
vs. what's genuinely not started, agent by agent.

## Resuming this work

1. Read `CLAUDE.md` first.
2. `npm run check` to confirm the baseline.
3. Pick a phase from "What's deferred" above, or ask the user which is next.
4. Keep this file and `tests.json` current as you go.
