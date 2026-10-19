# How the price model and curves work

This is a transparent, assumption-based valuation model with weighted comparable listings. **It is not a neural network.** Every displayed estimate can be traced through a short set of formulas in [scripts/app.js](scripts/app.js). The separate [broader-airframe study](research/README.md) uses conventional regression to challenge those assumptions; it does not train the live calculator.

## From listings to a price

1. **Start with a variant baseline.** Each Virus/Sinus variant has a disclosed reference year, asking price and typical equipment. These are judgment-based anchors, not factory quotations. Adjust that reference for the selected build year, airframe hours and equipment.
2. **Select independent comparable aircraft.** Use eligible asking records, deduplicate aircraft identities, and exclude a loaded listing from its own comparison pool. With at least three exact-variant records, use those alone. Otherwise, lightly weighted same-family records can supply context. External Flight Design, SportCruiser and Remos records never enter this pool.
3. **Normalize known differences.** Adjust each comparable's ask for model/year, known TTAF and known equipment. Missing equipment is not treated as absent. Seller-stated overdue repacks are normalized to the same service reference whether recorded as a due flag or a due status. The target aircraft's service exposure and condition are applied after the blend.
4. **Give each comparable an evidence weight.** The weight multiplies source quality, exact-model/family match, recency, market match, reference-year/hour proximity and documented issue factors. These are disclosed judgment factors, not learned probabilities. Exact-model match has factor 1; another variant in the same family has 0.08; an unrelated family has zero. A different market has factor 0.55.
5. **Build a robust comparable midpoint.** Find the weighted median. For the weighted mean, cap adjusted asks at 69–131% of that median. Combine 55% of this capped mean with 45% of the median. This is *winsorization*: extremes are limited for the mean, not deleted. Their uncapped dispersion can still widen the displayed range.
6. **Blend evidence with the baseline, then apply the scenario.** Apply condition/history, maintenance and the assumed negotiation discount. The asking benchmark and purchase midpoint each have a $10,000 floor; the latter cannot exceed the former. Freight, tax and other acquisition costs are calculated separately.

The basic blend is:

`blended asking reference = comparable share × robust comparable midpoint + (1 − comparable share) × baseline`

Let `Q` be the sum of exact-variant evidence weights. When exact-variant evidence exists:

`comparable share = min(0.82, Q / (1 + Q))`

For example, **Q = 3 means a 75% comparable / 25% baseline blend**. That is not “75% confidence,” and Q is not the raw aircraft count or a formal statistical effective sample size. If only other variants in the family are available, their summed weights are used with a 15% ceiling. With no usable evidence, the share is zero.

The October 19 housekeeping review removed fixed 28%/43% shares for one/two exact records. Those quotas gave a very weak listing the same aggregate influence as a well-documented one and could cause a large jump when a weak second record was added. Influence now follows evidence strength continuously within the selected comparison pool. The pool-selection rule and caps are still explicit assumptions.

**Moving a year or TTAF slider does not change the evidence weights.** Proximity weights use each variant's fixed reference year and 500 hours. Prices are adjusted to your scenario without switching which advertisement dominates simply because you moved the slider. Changing variant or market can legitimately change the evidence pool and weights.

## Why each curve has its shape

| Control | Shape and meaning | What is assumed |
| --- | --- | --- |
| Build year | Compound 2.9% per newer build year in the reference price, with distant-year caps | A comparison between aircraft at the research date, not a forecast of one aircraft's future depreciation |
| TTAF | Bounded linear discount, $11–$20/hour depending on variant, relative to 500 hours | The rate and cap; engine hours remain separate |
| Engine hours / service year | Curved loss controlled by whichever of the selected hour/calendar horizons has less life remaining | Partial capitalization, curve exponent and any unverified service limits |
| Repack year / rocket expiry | Straight segments between disclosed cost-allowance milestones | Monetary allowances, not a manufacturer service-life rule |
| Engine type / avionics / propeller / autopilot | Discrete whole-aircraft price steps, sorted by actual modeled price | Resale premiums and installation compatibility; a new component's price is not its used-aircraft premium |
| Negotiation | An assumed percentage reduction from the asking benchmark, subject to the floor | The selected discount, not an observed closing-price relationship |

For the engine, the deduction before comparing it to the reference engine is:

`engine cost reference × 0.49 × used fraction^1.27`

The used fraction is bounded between zero and one and follows the more restrictive selected hour/calendar horizon. A stated calendar deadline overrides the service-year calculation. The model then compares that deduction with a **same-build-year, 500-hour reference engine**. Thus engine exposure is applied once, and changing airframe hours alone does not invent a fresh-engine credit. Missing dimensions use the stated neutral-reference fallback; the interface still labels those dimensions unknown.

The engine cost references are source-backed where available; **0.49 and 1.27 are assumptions**, not coefficients fitted from sales. Likewise, the generic repack allowance runs through $3,200 due, $2,000 at two years remaining, $1,100 at four, $250 at six and $0 at eight. Rocket pressure is separate. Flat sections usually reflect a cap, an inactive input, or the other service horizon controlling the result.

## What “curve fitting” means in the research

The external diagnostic estimates a small equation:

`log(asking price) = exact-model intercept + build-year coefficient × year + hours coefficient × TTAF`

An intercept gives each exact model its own price level, so the fit does not treat an expensive model's absolute price as evidence that its hours are more valuable. Fitting year and hours jointly tries to separate their associations. It cannot eliminate missing engine-calendar history, training use, condition or equipment differences.

The ordinary fit is compared with a **Huber robust fit**. The latter combines source-quality weights with reduced influence for unusually large residuals—the gap between an ad and the fitted equation. It does not simply discard whichever price disagrees with expectations. The analysis also resamples independent aircraft within model groups 2,000 times and checks what happens when a family or documentation category is removed.

Only 19 external aircraft supplied repeated-model comparisons, below the predeclared 30-aircraft gate; calendar/service separation was also inadequate. **No external fitted year, hour or equipment coefficient was adopted.** The study improved cost references and exposed uncertainty, rather than establishing a learned depreciation law. A neural network would add many parameters without supplying the missing evidence.

## What the graphs and ranges do—and do not—show

Every scenario curve calls the **same calculator as the price card**, changes one input and holds the others fixed. Numeric lines are sampled with additional points around bends; they are not decorative smoothing splines. The selected marker uses the exact calculation. Equipment remains categorical, and calendar tick labels are positioned at the year they display.

The shaded band is a **heuristic judgment range**, widened for thin, scattered or incomplete evidence. It is not a 95% confidence interval or a promise about a sale. The separate market scatter shows raw advertisements, including repeated offers and excluded context records; hollow markers identify records excluded from valuation. Its price axis expands rather than clipping expensive listings.

The current 41-aircraft identity holdout has **14.56% median / 17.71% mean absolute asking-price error**, with **34/41 asks inside the band** and **−10.33% mean signed error**. Underprediction and large individual misses remain. The October 19 fixes changed the mean from 17.79% to 17.71% while leaving the median and band coverage unchanged: essentially the same performance, not demonstrated sales-price accuracy. See [current audit results](tests/backtest-summary.json) and [row-level errors](tests/backtest-results.csv).

The dataset, baseline prices, age/hour slopes, equipment premiums and engine capitalization/exponent were not refitted during housekeeping. Better independent aircraft records and verified sale prices are needed before stronger accuracy claims or a more complicated fitted model would be justified.
