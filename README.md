# Pipistrel Value Lab

**An independent, source-linked interactive purchase-price estimator for Pipistrel Virus and Sinus aircraft.** Snapshot: **16 October 2026**.

> **Important:** The tool is a transparent *asking-price* comparison model, **not an aircraft appraisal, live sale tracker, tax opinion, or a database of confirmed completed transaction prices**. No genuine closed-sale prices have been verified. The displayed estimated transaction range assumes a user-adjustable negotiation percentage and may differ substantially from prices actually paid.

## Open the calculator

- **Use it offline:** open [`index.html`](index.html) in a modern browser. It is a **single, self-contained HTML file**: no servers, dependencies, build services, trackers, analytics, or API keys. It works on desktop and mobile.
- **Live website:** [Open Pipistrel Value Lab](https://aeae1.github.io/pipistrel-value-lab/). GitHub Pages publishes `main` / root. Publication and live controls verified 16 October 2026.
- **Saved settings:** inputs persist locally in the browser, where storage is allowed. **Copy scenario link** builds a shareable URL with the controls embedded. Private/offline `file:` opening may restrict storage or clipboard; estimates continue to work.

**Continuing in ChatGPT Work?** See [WORK_HANDOFF.md](WORK_HANDOFF.md) for the complete technical/research takeover brief and publication checklist.

## What's included

**98** source-linked price observations, including **48** individually priced and model-eligible asking records, **31** historical Sinus archive entries intentionally *excluded* from statistical price weighting, 3 factory/new pricing records, and other held-out, duplicate, or uncertain records. **Parts-only, salvage and known non-airworthy project listings are not in the database.** **45** curated supporting research references. Source-linked search and CSV export are built in.

The calculator covers these **seven distinct variant groups**:

1. Virus original long wing
2. Virus SW (short wing 80/100/100iS/approved 914 specifications where applicable)
3. Certified Virus SW121
4. Virus SW121A Explorer
5. Classic Sinus 912
6. Sinus Flex / Max Flex
7. Recent Sinus Max

A Virus SW100 912iS should **not** be conflated with a certified SW121 or Explorer using the **carbureted** Rotax 912 S3. Similarly, distinguish Sinus Flex / Max wingtip equipment and approved MTOW from classic Sinus.

### Controls

- **Aircraft:** model variant, year, airframe time, seller-described airworthy condition, professionally repaired damage history, storage/logbook condition, FAA/EASA/European UL paperwork category, nosewheel/tailwheel.
- **Powerplant:** Rotax 912 UL 80hp, 912 ULS 100hp, 912 iS fuel-injected, certified 912 S3, 914 turbo; engine hours since new/overhaul; service/overhaul year; serial-specific 1,000–2,500-hour selected TBO; 1–30 calendar years; documentation confidence.
- **Safety and periodic maintenance:** GRS/BRS fitted or not, last parachute repack and interval, rocket expiration year, propeller overhaul status, Rotax five-year hose/rubber status, gearbox status.
- **Avionics:** analog instruments, legacy Dynon/Kanardia glass, Dynon SkyView HDX, Garmin G3X, Garmin G1000 class, no/basic/two-axis autopilot, Garmin portable or GTN navigator, dual displays, ADS-B, FLARM, heated pitot, electric trim.
- **Other options:** fixed/ground/in-flight/constant-speed propeller, oxygen, tow kit, both wingtip sets, long-range tanks, interior/paint, Beringer brakes, LED lighting, engine preheater, wheel fairings.
- **Acquisition:** seller's market (US/Europe/Canada/other), euro exchange rate, negotiated concession, US budget, domestic ferry/foreign freight, inspection/assembly, manual tariff allowance, manual Texas sales/use tax, VAT refund hypothesis.
- **Offer checker:** supply a seller's ask in USD or EUR and compare with a matched *asking* benchmark, separate from the hypothetical purchase midpoint.
- **Price database:** 16 clickable **sortable** column headings (price in USD equivalent throughout), known engine/airframe hours, seller-stated TBO hours/calendar remaining, avionics, autopilot, parachute due/expired status, propeller, region and date; listing-to-estimator presets, preserved original asking currency in the secondary caption and CSV, search, status filters and CSV export. Unknown values are explicitly unknown and sorted last. USD conversion defaults to an editable **1 EUR = $1.16** scenario rate—not a historical spot rate or live quote.
- **Whole-dollar display:** estimator midpoint and range show the nearest $1 (rather than $100 increments), with a dollar change indicator; this is useful for sensitivity, **not** one-dollar appraisal accuracy.
- **Other-studio ideas:** a categorized resale-option reference guide and loadable listing presets were adapted conceptually. None of the other studio’s uncalibrated purchase-price assumptions or salvage records are imported.

## Market methodology

`index.html` contains the complete implementation in transparent JavaScript. The source is in `scripts/app.js`, input assumptions are in the `vs`, `PREMIUM`, `EXTRA`, and `REGIONS` constants, and observations are editable in `data/observations.json`. Every estimate blends an explicit reference-year asking-price prior with adjusted same-variant asking-price comps, discounted for age, source quality and cross-border market differences. Known TBO and repack deadlines are then adjusted, along with history and condition. Widely separated or thin comps create a wider displayed interval; price ranges are **heuristic judgment bands, not 90%/95% statistical confidence intervals**.

To understand exactly where these numbers come from, read **[Research findings, original links, limitations, and backtest](RESEARCH.md)**.

The **41-aircraft identity-group holdout** (known airframe hours, zero negotiation) measures **14.58% median absolute difference against asking prices**, **17.71% mean absolute difference**, and **−10.02% mean signed difference**. **34/41 asks (82.9%)** fall within the heuristic bands. Each held-out aircraft and its grouped duplicates are excluded, using the same preset assumptions as the UI. The former 38-record / 9.92% result used different imputation and holdout rules and is not directly comparable. This is retrospective corpus consistency, **not sale-price accuracy**. Full results and variant bias are in [the audit summary](tests/backtest-summary.json) and [row-level results](tests/backtest-results.csv).

### October 16 source and model corrections

- Corrected SP-SFLY to **1,185 engine hours**; **841 is propeller time**. Its advertised engine model/serial and rescue brand conflict remain flagged.
- Added six dated or source-linked offers, including N10ZG, N678WX and N82DX; unidentified offers stay context-only. No sale proceeds were verified.
- Presets clear previous aircraft maintenance, show missing fields as unknown, retain exact due months, and exclude the selected aircraft from its own comps. Runtime grouping prevents identified/suspected duplicates from inflating weight.
- Explorer standard equipment and Flex tip sets are included once in the variant baseline. Unknown autopilot axes no longer become a claimed basic or two-axis installation.
- Added exact-variant, region, max-ask, autopilot and unknown-parachute filters; the FI + parachute shortcut reports an empty result when the evidence does not establish both requirements.
- FAA eligibility is an explicit, separate acquisition gate. Research includes the FAA MOSAIC certification FAQ and 2026 SW121-family airbrake/door-lock directives; individual compliance remains unverified.
- Removed website preview images from this README.

## Code and data structure

```
index.html                  Single-file deployable site (generated)
template.html               HTML and CSS template
scripts/app.js              Model + offline UI
scripts/build.py            Rebuild the single HTML artifact
scripts/validate_data.py    Data schema / ID / source integrity checks
data/observations.json      Each aircraft offer, original price, source, source quality
 data/sources.json          Relevant manufacturer, FAA, Rotax, BRS, GRS, tax resources
RESEARCH.md                 Assumptions, findings, caveats, source bibliography
CONTRIBUTING.md             How to add/correct a listing
LICENSE                     MIT license for original site code
.nojekyll                   Makes GitHub Pages serve directly
 tests/smoke.py             Chromium interaction checks, mobile + desktop
 tests/backtest.py          Aircraft-group asking-price holdout (Node engine)
 tests/model.test.cjs       Pure calculation / provenance regressions
 .github/workflows/validate.yml  Data, build, model and desktop/mobile browser CI
 tests/backtest-results.csv Results of the holdout audit
```

The CI workflow runs these checks on pushes and pull requests. Smoke screenshots are temporary test output and are not embedded in the README. No build tooling is required to **use** the application. Developers updating JSON should run:

```sh
python3 scripts/validate_data.py
python3 scripts/build.py
node --check scripts/app.js
node tests/model.test.cjs
python3 tests/backtest.py  # executes the production JavaScript via Node
python3 -m pip install playwright==1.56.0
python3 -m playwright install chromium
python3 tests/smoke.py     # uses managed Chromium, or CHROMIUM_EXECUTABLE
```

**Scope:** Explicitly non-airworthy airframes, dismantled/parts-only aircraft, salvage and repair projects are completely omitted—not used as low-end comparables or displayed in the research database. Remaining classified ads are seller claims, not independently verified proof of current airworthiness.

The site does **not** fetch refreshed listings by itself. The research date is fixed. Every current listing must be reverified with the advertiser before negotiating, and buyers should ask for current logs, registration/certificate, serial numbers, service and parachute paperwork, and prebuy inspection results.

## Caveats a buyer cannot ignore

- **An advertised airplane is not proof of a completed sale.** Aggregator labels such as “sold” can preserve only the last advertised price. No final sale price has been authenticated here.
- **Different airworthiness markets are not equivalent.** A European 600kg ultralight cannot be presumed eligible for FAA S-LSA/experimental/motorglider documentation merely because it can be shipped to Texas. Exact serial and original factory declarations matter.
- **TBO is not purely hourly.** Applicable Rotax bulletin, engine serial, installation/overhaul date and authority determine effective hour and calendar limits. Parachute repack and rocket replacement are distinct service items; some systems have different lifetimes.
- **Equipment adjustments are modeling priors, not aftermarket invoice prices.** A costly installed Garmin or propeller upgrade may command much less incremental resale money than it cost new.
- **Import estimates are planning assumptions only.** Exchange rates, special tariffs, freight, VAT refunds, applicable sales/use tax, FAA certification path, rigging, insurance and freight damage can dominate the difference. Do not use a model quote as a shipping or tax quotation.

## License and acknowledgements

Original site code, charts, and derived documentation: [MIT License](LICENSE). Listing facts are independently summarized with original source URLs; linked images and seller content remain the property of their respective owners. Do not treat inclusion of a listing as endorsement or a representation that it is still on the market. Independent project, unaffiliated with Pipistrel, Textron, Rotax, GRS, BRS, brokers and price aggregators.