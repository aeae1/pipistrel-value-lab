# Broader-evidence review — 18 October 2026

Baseline: commit `71c5459`, 41 grouped aircraft holdouts, median absolute asking-price error 14.48%, mean 17.75%, signed mean -10.42%, 34/41 inside the heuristic band. The target listing corpus stays fixed during this review.

## Rules set before fitting candidates

- Other airframes never enter the Virus/Sinus comparable-price pool. External asking records are a separate research dataset.
- Only original seller/dealer advertisements and manufacturer/distributor/service-provider material establish inputs. Aggregators help discovery, not independent sample counts. Asking and completed-sale prices remain distinct.
- Record the exact variant, currency, market, observed date, known equipment, engine history and identity. Missing values remain missing. Never infer engine hours or a recent overhaul from airframe hours.
- Exclude non-airworthy projects, shares, wanted ads, unpriced offers and identity conflicts from fitting. Keep reviewed exclusions and reasons. A surprising price alone is not an exclusion reason.
- Use within-model relationships, robust residual weighting, grouped aircraft exclusion, leave-one-family-out checks and bootstrap sensitivity. Compare ordinary and robust fits so outliers remain visible.
- Attempt to estimate age and TTAF jointly, accounting for equipment and engine-history differences where known. A fitted TTAF coefficient from mostly original engines is a combined-use association, not an isolated airframe-wear coefficient.
- Transfer an empirical age/hour coefficient only with at least 30 independent usable airframes, at least three model families, the expected sign in at least 90% of resamples, and no sign reversal in leave-one-family-out fits. Missing service history and age/hour collinearity can veto transfer even when those numerical thresholds pass.
- Prefer low-complexity curves. A complicated curve needs independently supported shape and better validation; it does not earn credibility by passing through more asking prices.
- Published component prices can anchor scale, but installation, shipping, core value, overhaul scope and configuration must be distinguished. They do not identify the fraction of service expense capitalized into resale value.
- Keep unsupported coefficient/exponent assumptions explicitly labeled. A new source does not convert an existing judgment into a measured market coefficient.
- Evaluate predeclared, evidence-motivated changes on the unchanged 41-aircraft target holdout. Do not sweep parameters to optimize that score. Show aggregate, per-variant and row-level effects; no empirical transfer if both median and mean worsen, or a well-sampled variant materially deteriorates without an independently supported correction.
- Preserve finite prices, nonnegative/ordered ranges, sensible one-variable directions, exact selected graph values, category identities, offline use and existing unknown-data behavior.

The target audit is a regression/transfer check. Because this corpus has already informed development, it is not a fresh independent sales-price test.

## Candidates declared before running the new target audit

1. Replace the engine-cost scale with the 18 October 2026 Rotech USD new-engine catalog references: 912 UL $20,625, ULS $23,718, iS $30,092, 914 UL $37,571. These packages differ in included accessories; they are cost-scale references, not installed overhaul quotes or equipment upgrade premiums. No S3 quotation was established: retain its $24,500 assumption with an explicit label. Keep the existing 49% capitalization assumption and 1.27 wear exponent unchanged. Used engine ads are too sparse and inconsistently scoped to fit either.
2. Replace parachute calendar buckets with continuous, piecewise-linear interpolation through the existing allowance milestones: repack years remaining/cost-pressure deduction `(0,3200), (2,2000), (4,1100), (6,250), (8,0)`; rocket `(0,1800), (2,700), (4,0)`. Keep overdue caps, the $1,850 undocumented-repack allowance and the $250 reference credit. This removes artificial cliffs without claiming a newly observed depreciation curve. BRS published US service costs bound the approximate scale, but the model remains a generic allowance, not a GRS/BRS quotation. No change to physical service intervals or expiry.
3. Retain baseline age/hour/equipment priors unless the external transfer gate above passes. No parameter sweep against the Virus/Sinus audit. Evaluate engine-only, service-only and the combined declared changes for attribution; do not choose parameters to minimize holdout error.
