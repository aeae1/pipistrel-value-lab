# Pipistrel Value Lab

**An independent, source-linked interactive purchase-price estimator for Pipistrel Virus and Sinus aircraft.** Snapshot: **16 October 2026**.

> **Important:** The tool is a transparent *asking-price* comparison model, **not an aircraft appraisal, live sale tracker, tax opinion, or a database of confirmed completed transaction prices**. No genuine closed-sale prices have been verified. The displayed estimated transaction range assumes a user-adjustable negotiation percentage and may differ substantially from prices actually paid.

## Open the calculator

- **Use it offline:** open [`index.html`](index.html) in a modern browser. It is a **single, self-contained HTML file**: no servers, dependencies, build services, trackers, analytics, or API keys. It works on desktop and mobile.
- **GitHub Pages:** in the public repository, enable **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)` → Save**. The default site will be at `https://<owner>.github.io/<repo>/` once Pages completes deployment. Repository creation and initial Pages setting require GitHub account authorization.
- **Saved settings:** inputs persist locally in the browser, where storage is allowed. **Copy scenario link** builds a shareable URL with the controls embedded. Private/offline `file:` opening may restrict storage or clipboard; estimates continue to work.

<!-- Optional screenshot: available in the downloadable research package. -->

## What's included

**92** source-linked price observations, including **46** individually priced and model-eligible asking records, **31** historical Sinus archive entries intentionally *excluded* from statistical price weighting, 3 factory/new pricing records, and other held-out, duplicate, or uncertain records. **Parts-only, salvage and known non-airworthy project listings are not in the database.** **35** curated supporting research references. Source-linked search and CSV export are built in.

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

The 38-record leave-one-listing-out audit (only records with stated airframe hours) measured **9.9% median absolute difference against asking prices**, with **31/38 asks (81.6%)** inside their corresponding *no-negotiation* heuristic bands. This is a **within-corpus consistency check**, not an out-of-sample sale-price accuracy claim; related listings, prior assumptions and scarcity of independent observations limit its implications. The full row-by-row result is in `tests/backtest-results.csv`.

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
 tests/backtest.py          Asking-price leave-one-listing-out analysis
 tests/backtest-results.csv Results of the holdout audit
 docs/desktop-preview.png   Optional representative screenshot (download package only)
 docs/mobile-preview.png    Optional mobile screenshot (download package only)
```

No build tooling is required to **use** the application. Developers updating JSON should run:

```sh
python3 scripts/validate_data.py
python3 scripts/build.py
node --check scripts/app.js
python3 tests/smoke.py     # optional: requires Playwright Python + a local Chromium
python3 tests/backtest.py  # optional: same prerequisites
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