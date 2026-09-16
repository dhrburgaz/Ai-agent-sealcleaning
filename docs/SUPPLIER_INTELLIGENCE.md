# Supplier & Deal Intelligence (sections 10, 13, 34)

## What works today

- `app/dashboard/suppliers/page.tsx` — manually record a supplier price
  observation (material, unit price, source URL, discount label + evidence).
- `lib/suppliers/landed-cost.ts` — computes **total landed cost for a specific
  job's quantity** (unit price, ex-VAT normalization, delivery vs. pickup,
  minimum order), and compares multiple observations for cheapest / fastest
  (pickup available) / preferred supplier, with a `buy_now` / `wait` / `verify`
  recommendation.
- **Discount evidence requirement**: a `discountLabel` without a
  `discountEvidenceUrl` is rejected outright (`validateDiscountClaim`) — the
  UI shows "Reddedildi: kanıt yok" rather than silently trusting an
  unsubstantiated "sale" claim.
- **Staleness**: every observation carries `observedAt` / `staleAfter`; a
  stale observation is excluded from comparisons and flagged in the table.
- **Inventory offset** (`lib/pricing/inventory.ts`): before recommending a
  purchase, the required quantity should be reduced by what's already in
  `inventory_items` — implemented as pure logic, not yet wired into the
  supplier comparison UI end-to-end.

## Not implemented yet (Phase 6)

- Automated/scheduled price scanning of supplier product pages.
- Price-drop / restock alerts feeding into `system_notifications`.
- A live "Fırsatlar" board with historical price trend charts.

## Why manual-first is the right default

The spec is explicit: never seed fake "current market prices," never call
something a "sale" without evidence, and always show a source + timestamp for
any live fact. A manual entry with a real URL and a real date is more
trustworthy than an unverified scraper — automating the *capture* of that same
data (Phase 6) doesn't change any of these rules, it just reduces typing.
