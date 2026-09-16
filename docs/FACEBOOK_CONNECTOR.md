# Facebook / Social Lead Strategy (section 16)

## Status: Level A only (manual capture) is implemented

`app/dashboard/leads/page.tsx` supports pasting a message/post's text and
manually entering a lead. This is deliberately the most robust path: it never
breaks when a platform changes its UI or terms, and it never risks the
account.

## Levels B and C — not built yet, and why that's the honest answer

- **Level B (official/authorized connectors)** — business page messages, forms,
  webhooks, official APIs. Requires real credentials/app review from the
  platform; there is nothing to fake here. `external_connectors` table exists
  and defaults to `enabled: false` for exactly this reason.
- **Level C (user-controlled browser assistant)** — optional, off by default
  even once built. It would operate in the owner's own logged-in browser,
  read visible content, and draft (never auto-send, unless autopilot is
  explicitly enabled and compliant) — see `lib/messaging/approval.ts` for the
  approval-mode logic it would plug into.

## Hard rules (never to be relaxed, in code or in a future session)

- Never scrape private data the owner's own account can't already see.
- Never bypass CAPTCHA.
- Never create fake accounts.
- Never rotate accounts to evade rate limits.
- Never mass-message.
- Never claim Facebook automation is live without a demonstrable, credentialed
  connection — a mocked/demo integration must be labeled as such.

## Browser extension (section 17)

Not built in this phase. When it is, its job is capture-only: selected text,
current URL, visible post text — sent to the local app, which returns a lead
score / missing-info list / suggested Dutch reply. No stealth scraping, ever.
