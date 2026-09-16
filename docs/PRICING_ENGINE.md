# Pricing & Margin Engine (Agent 09)

Implementation: `lib/pricing/engine.ts`. Fully deterministic — code arithmetic
only, per the master spec's explicit requirement ("MUST use code for
arithmetic").

## Formulas (verbatim from the spec)

```
direct_cost            = labour + materials + rentals + waste + logistics
                          + subcontractors + permits + consumables
cost_with_overhead      = direct_cost + overhead + risk_reserve
price_for_margin        = cost_with_overhead / (1 - target_margin_rate)
price_for_profit_floor  = cost_with_overhead + minimum_target_gross_profit
recommended_ex_vat      = max(price_for_margin, price_for_profit_floor, minimum_job_charge)
```

## Margin vs. markup — the one mistake this engine refuses to make

`price_for_margin` divides by `(1 - rate)`, not `cost * (1 + rate)`. Those are
different numbers for the same "30%": a markup formula under-delivers the
target margin. Given cost €700 and a 30% target:

- Margin (correct): `700 / (1 - 0.30) = €1,000` → profit €300 / price €1,000 = **30% margin**.
- Markup (wrong): `700 * 1.30 = €910` → profit €210 / price €910 = **23.1% margin**.

`tests/unit/pricing-engine.test.ts` asserts this explicitly.

## Profit floor

`minimum_target_gross_profit` defaults to **€1,200** (section 10), configurable
in Settings. Because `recommended_ex_vat` is a `max(...)` that always includes
`price_for_profit_floor`, the system can never recommend a price below the
floor on its own. It can still be *proposed* to fall below the floor only via
an explicit **owner override** with a recorded reason — never silently. See
`PROFIT_FLOOR.md`.

## Commercial fit

A heuristic on whether the profit is coming from healthy margin economics or
is only propped up by the floor:

- `strong` — margin pricing alone clears the floor with room to spare.
- `acceptable` — margin pricing alone just clears the floor.
- `weak` — margin pricing alone would fall short of the floor; the floor is
  what's keeping this job's absolute profit acceptable (small/thin job).
- `below_floor` — the recommended price still doesn't clear the floor even
  after the `max(...)`, which only happens if the inputs themselves are
  inconsistent (should not occur in normal operation; the QA gate treats this
  as a hard block).

## Confidence and customer-facing language

`lib/pricing/confidence.ts` scores 0–1 from the known/assumed/unknown mix of
scope facts plus explicit penalties (no dimensions, photo-only scale, unclear
access/excavation/drainage, stale supplier data, unclear material sourcing, no
site visit on a technically sensitive job). Per section 20:

- ≥ 0.85 → high confidence → customer-facing **"offerte"**
- 0.65–0.84 → medium → **"prijsindicatie"**
- < 0.65 → low → **"prijsindicatie"**

## QA gate (Agent 20)

`lib/pricing/qa-gate.ts` is the last check before a quote can be marked
binding or sent: math consistency, required fields, negative margin, below-floor
pricing without a reasoned override, unresolved `must_verify_on_site` facts on
a binding quote, stale price sources, and unapproved sends. It returns
`{ blocked, reasons }` — the UI always shows the reasons, never a silent
failure.
