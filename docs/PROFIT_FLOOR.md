# Profit Floor (section 10)

Every standard paid job targets at least **€1,200 expected gross profit**
(`minimum_target_gross_profit`, configurable in Settings, default 1200).

This is a **floor, not a guarantee**. The system will never silently reduce
this target to make a weak job look acceptable. Instead, when a job can't
comfortably clear it, the estimate is flagged (`commercial_fit: weak` or
`below_floor`) and the owner sees the real numbers before deciding.

## What happens when a job is commercially weak

The system surfaces the situation rather than hiding it. The owner's options
(all manual, per section 10):

- Rescope the job (smaller/larger footprint, different materials)
- Bundle with another nearby job
- Exclude disposal, or have the customer supply material
- Require a site visit before committing to a binding price
- Upsell additional work
- Decline the job
- Explicitly override the price, with a recorded reason (see below)

## Owner override

An owner can price a quote below the floor, but:

1. The system's own recommendation is always preserved separately
   (`estimates.recommendedExVat` is never overwritten by an override).
2. A reason is required — the QA gate (`lib/pricing/qa-gate.ts`) blocks any
   below-floor quote that has no override, and blocks a below-floor override
   that has no reason text.
3. The override can be scoped to "this quote only" so it doesn't quietly
   become the new normal for similar jobs.

## Visibility

- Command Center cards surface pending quotes and pipeline value.
- Every estimate shows its `commercial_fit`, `grossProfit`, and `grossMargin`.
- After a job completes, `lib/jobs/costing.ts` compares actual costs to the
  estimate and reports whether the €1,200 floor was actually achieved —
  not just quoted.

## Small-job considerations

For small jobs, the profit floor calculation should account for travel,
messaging time, setup/cleanup, disposal hassle, and schedule fragmentation —
this is why `minimum_job_charge` exists as a separate, always-enforced floor
alongside the €1,200 target (see `PRICING_ENGINE.md`).
