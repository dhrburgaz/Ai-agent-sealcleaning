# Instructions for future Claude Code sessions

This is **Beyza Security**, a production-minded Dutch field-service AI
operating system for a Dordrecht gardening/maintenance company. It is being
built in phases against `Beyza_Security_Master_Prompt.txt` (the original full
spec). Phase 1–3 (foundation, CRM, deterministic pricing/quotes) is complete
and fully tested. Read this file, `progress.md`, and `tests.json` before
touching anything.

## Before you write a line of code

1. Read `progress.md` for exactly what's built, what's deferred, and why.
2. Read `tests.json` for the spec's own test checklist and its status.
3. Run `git log --oneline -20` and `git diff` (or `git status`) to see what's
   already in flight — don't assume the working tree matches `progress.md`
   if there are uncommitted changes.
4. Run `npm run check` to confirm the baseline is actually green before you
   start. If it isn't, that's a pre-existing regression to understand first,
   not something to route around.

## Non-negotiables (carried over from the master spec)

- **€0 AI budget must keep working.** Every feature you add must degrade
  gracefully with no AI key configured. If a feature genuinely needs a model,
  route it through `lib/ai/router.ts` — never call a provider directly, and
  never make the app's core loop (status, CRM, pricing, quotes) depend on a
  model responding.
- **Exactly 20 logical agents**, per `lib/agents/definitions.ts` and
  `docs/AGENTS.md`. Don't add a 21st or collapse two into one; don't turn any
  of them into an always-on chat loop — deterministic code beats an LLM call
  wherever the logic is actually just arithmetic or rules.
- **Turkish owner-facing, Dutch customer-facing, English code.** Don't mix
  these up — a bug we already found and fixed once (see the WinAnsi fix in
  `lib/documents/quote-pdf.ts`): internal Turkish labels must never leak into
  the customer PDF; use `lib/pricing/category-labels.ts`-style translation
  instead of reusing internal labels.
- **Never fabricate**: live prices without a source+timestamp, photo
  measurements without a real scale reference, connector status that isn't
  real, discounts without evidence. If something can't be verified, say so in
  the UI rather than guessing.
- **The €1,200 profit floor is never silently bypassed.** An owner override
  below it requires a recorded reason (`lib/pricing/qa-gate.ts`). Don't change
  this gate to make a feature easier to ship.
- **Do not delete tests** to make CI pass. If a test is wrong, fix the test
  with a clear reason in the commit; don't delete it to dodge a real bug.
- **No paid dependency or paid API without the user's explicit approval** —
  this includes adding a paid npm package with ongoing costs, not just AI
  providers.

## Architecture notes for continuation

- **Server Components cannot write cookies.** `lib/auth/guard.ts#requireAuth`
  is intentionally read-only for this reason (see the git history / the
  `session.save()` bug that was here originally). Session writes only happen
  in Server Actions (`app/dashboard/session-actions.ts#touchSessionAction`,
  login/logout) or Route Handlers. If you add a new place that needs to touch
  the session, follow this pattern — don't call `session.save()`/`destroy()`
  from a page or layout.
- **Estimate line categories are load-bearing.** `createCeramicEstimateAction`
  and `createQuoteFromEstimateAction` (`app/dashboard/leads/[id]/actions.ts`)
  communicate cost totals via `estimate_lines.category` strings (`materials`,
  `labour`, `waste`, `consumables`, `overhead`, `risk`, and the display-only
  `materials_detail`). If you add a new cost category, update both the
  estimate-creation insert and the QA-gate recompute in the same commit — a
  mismatch here silently blocks every quote (this happened once; there's a
  regression test in `tests/integration/` you should extend, not bypass).
- **DB schema changes**: edit `db/schema/*.ts`, then `npm run db:generate` to
  produce a new migration, then `npm run db:migrate`. Never hand-edit a file
  under `db/migrations/`.
- **Tests that touch the database** must set `process.env.DATABASE_PATH` to a
  fresh temp file *before* any static import of `@/db/client` (or anything
  importing it) — use dynamic `await import(...)` inside `beforeAll`, per
  `tests/integration/lead-lifecycle.test.ts`. A static top-level import would
  bind to whatever `DATABASE_PATH` was set before the test file loaded.
- **E2E**: `tests/e2e/smoke.spec.ts` needs a real dev server against a fresh,
  empty database. See the Playwright section of `progress.md` for the exact
  gotchas (stale `.next` cache after a `next build`, orphaned dev server
  processes holding the old SQLite file open, port 3000 already in use) — run
  `rm -rf .next storage/beyza.db*` and fully kill old `node` processes before
  a clean run, not just `rm` the db file underneath a live server.

## Continuing into later phases

Follow the phase order in the master prompt (§63) unless the user says
otherwise: Phase 4 (remaining agent modules: photo/vision, technical method
planning, event orchestration) → Phase 5 (real AI provider adapters + caching)
→ Phase 6 (live supplier scanning, inventory integration) → Phase 7 (calendar,
routing, follow-up automation, full finance reporting) → Phase 8 (voice, PWA,
Customer Demo Mode polish) → Phase 9 (browser extension, connector stubs) →
Phase 10 (hardening, full demo data, CI for Playwright).

Update `progress.md` and `tests.json` as you go — they are the continuity
mechanism across context compaction and across sessions.

## Checks before claiming anything is done

```bash
npm run check   # lint + typecheck + vitest + production build
```

For any UI change, also actually run it: `npm run dev`, exercise the feature
in a browser (or via Playwright), don't rely on the build passing as a proxy
for the feature working — `npm run check` passing did not catch the two real
runtime bugs found during the Phase 1-3 build (a Server-Component cookie
write, and a WinAnsi font crash on Turkish characters). Both were only caught
by actually running the app end to end.
