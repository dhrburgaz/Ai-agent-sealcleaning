# Beyza Security

An AI-assisted operations system for a Dordrecht-based garden/maintenance company (hovenier / onderhoudbedrijf): lead intake, deterministic pricing with a profit floor, Dutch customer messaging, quotes with PDF export, and a Turkish "Beyza" command center — all fully functional at **€0 AI spend**.

This repository currently implements **Phase 1–3** of the full product specification (see `progress.md` for exact scope and what remains). It is a real, working application — not a mockup: migrations run, the setup wizard creates a working tenant, leads flow through qualification and a deterministic pricing engine, and quotes render to a downloadable PDF.

## Stack

- Next.js 15 (App Router, Server Actions), React 19, TypeScript (strict)
- SQLite via Drizzle ORM (`better-sqlite3`)
- Zod, iron-session, bcryptjs, pdf-lib
- Tailwind CSS
- Vitest (unit + integration), Playwright (e2e smoke test)

## Quick start

```bash
cp .env.example .env.local
# edit .env.local — at minimum set SESSION_SECRET (openssl rand -hex 32)

npm install
npm run db:migrate
npm run dev
```

Open http://localhost:3000 — you'll land on the first-run setup wizard (Turkish). After setup, sign in and you're on the Command Center.

To try it with realistic demo data instead of starting from scratch:

```bash
rm -f storage/beyza.db*
npm run db:migrate
npm run seed   # creates a DEMO company, leads, pricebook, one completed job
```

Demo login password is printed by the seed script (`DemoPassword123`). **Never use demo data or the demo password in a real deployment.**

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Local development server |
| `npm run build` / `npm run start` | Production build / run |
| `npm run db:generate` | Generate a new Drizzle migration from schema changes |
| `npm run db:migrate` | Apply migrations to `storage/beyza.db` |
| `npm run seed` | Load labeled DEMO data (refuses to run over existing data) |
| `npm run backup` / `npm run restore -- <file>` | Timestamped backup / confirmed restore of DB + storage (not secrets) |
| `npm run check` | lint + typecheck + unit/integration tests + production build |

## Architecture

- `db/schema/` — the full data model (companies, leads, scope, pricing, suppliers, quotes, jobs, agent/audit infrastructure) per the product spec's "shared database model."
- `lib/pricing/` — the deterministic pricing engine (Agent 09), QA/compliance gate (Agent 20), BOM/waste/equipment/labour calculators, and the 40 m² ceramic terrace job template.
- `lib/crm/` — lead deduplication, qualification scoring, and the lead state machine.
- `lib/messaging/` — Dutch customer message templates and approval-mode send gating.
- `lib/agents/` — the Beyza command orchestrator (status briefing + rule-based command parsing) and the design registry for all 20 logical agents (`docs/AGENTS.md`).
- `app/` — Next.js App Router pages, Server Actions, and the one PDF-download Route Handler.

See `docs/` for deeper documentation of specific subsystems, `CLAUDE.md` for instructions to a future coding session continuing this work, and `progress.md` / `tests.json` for exactly what is and isn't built yet.

## Zero-AI operation

Every feature shipped in this phase — status briefing, lead qualification, pricing, messaging, quotes — runs on deterministic code, not an LLM. The AI provider router (`lib/ai/router.ts`) exists and enforces a hard €0 default budget; no paid call can go out without an explicit key, an enabled provider, and a non-zero budget. See `docs/AI_COST_CONTROL.md`.
