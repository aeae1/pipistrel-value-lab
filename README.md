[![Pipistrel Value Lab — Virus + Sinus aircraft market research, with a Virus SW flying over alpine lakes](docs/readme-banner.png)](https://aeae1.github.io/pipistrel-value-lab/)

# Pipistrel Value Lab

An interactive tool for researching **Pipistrel Virus and Sinus asking prices**, comparing aircraft configurations, and exploring purchase-cost scenarios.

**[Open the live tool →](https://aeae1.github.io/pipistrel-value-lab/)**

Use the GitHub Pages website directly in your desktop or mobile browser. No installation, account, or API key is required.

## Get started

1. **Configure an aircraft** — choose a variant, year, airframe and engine hours, equipment, condition, and maintenance status to explore an estimated price range.
2. **Compare the market** — search and filter the source-linked price database, sort comparable offers, and load a listing into the estimator.
3. **Explore a purchase** — check a seller's asking price in USD or EUR, adjust negotiation and acquisition costs, then copy a scenario link or export the database as CSV.

Settings are saved locally in your browser where storage is available. Use **Copy scenario link** to share a configuration through the hosted website.

> Estimates are based on advertised asking prices. No completed-sale prices have been verified. The purchase range includes your chosen negotiation assumption and is a research aid, not an aircraft appraisal.

## What you can explore

- **Live price curves and equipment steps:** explore model year, airframe and engine hours, avionics, autopilot, propeller, engine type, condition, and negotiation. A moving marker follows your setting; pin a scenario to compare it with later changes.
- **Visual price explanations:** see the adjustments that form the purchase midpoint and the mix of acquisition costs. Small graphs sit beside key inputs, and a pinned price-and-range bar stays visible while you scroll.
- **Aircraft and equipment:** seven variant groups, multiple Rotax engine configurations, avionics, autopilot, propeller, parachute, wingtip sets, and other options.
- **Maintenance and history:** engine hour and calendar limits, parachute repack and rocket deadlines, propeller overhaul, hose replacement, gearbox service, damage history, and logbook quality.
- **Comparable offers:** sortable listing details, filters for variant, region, asking price, autopilot and parachute status, original source links, and CSV export with provenance. Missing information stays marked as unknown.
- **Asking-price checks:** compare a seller's quote with the model's matched asking benchmark, separately from a hypothetical negotiated purchase price.
- **Acquisition scenarios:** change the EUR/USD rate, negotiation allowance, ferry or freight costs, inspection and assembly costs, and manual tax, tariff, or VAT assumptions. FAA eligibility is tracked as a separate acquisition requirement.
- **Transparent assumptions:** inspect the model, underlying observations, research references, and retrospective checks in this repository.

### Aircraft coverage

| Family | Variant groups |
| --- | --- |
| Virus | Original long wing; Virus SW; certified Virus SW121; Virus SW121A Explorer |
| Sinus | Classic Sinus 912; Sinus Flex / Max Flex; recent Sinus Max |

The model distinguishes fuel-injected Virus SW100 912iS aircraft from certified SW121/Explorer configurations with the carbureted Rotax 912 S3. Sinus wingtip equipment and approved maximum takeoff weight also matter when comparing variants.

## Data and methodology

**Research snapshot: 16 October 2026.** The database contains **98 source-linked price observations**, including **48 individually priced, model-eligible asking records**, **31 historical Sinus archive entries**, and **3 factory/new pricing references**, plus other held-out, duplicate, or uncertain records. There are **45 supporting research references**. Historical archive entries are excluded from statistical price weighting; parts-only, salvage, and known non-airworthy projects are omitted from the database.

Estimates blend an explicit reference-year asking-price baseline with adjusted same-variant comparables, accounting for age, source quality, market, equipment, maintenance, and condition. Thin or widely scattered comparables produce wider ranges. These ranges are heuristic judgment bands, not statistical confidence intervals. Loading a listing excludes that aircraft and its grouped duplicates from its own comparables.

A retrospective **41-aircraft holdout check**, using known airframe hours and zero negotiation, found a **14.58% median absolute difference from advertised asking prices**; **34 of 41 asks (82.9%)** fell inside the displayed bands. This checks consistency with the collected asking-price data, not accuracy against completed sales. See the [audit summary](tests/backtest-summary.json) and [row-level results](tests/backtest-results.csv) for full results and variant bias.

Read [RESEARCH.md](RESEARCH.md) for original sources, model assumptions, source corrections, and limitations.

### Interpreting the results

- **Listings are a dated snapshot.** The site does not automatically refresh offers. Confirm availability, current asking price, logs, and condition with the seller.
- **Documentation and eligibility need separate verification.** A listing or an import-cost estimate does not establish airworthiness or eligibility for registration in another country.
- **Maintenance depends on the actual aircraft.** Engine serial, installation history, applicable service requirements, and records determine hour and calendar limits. Parachute repack and rocket replacement are separate items.
- **Adjustments are estimates.** Equipment resale value can differ substantially from installation cost. Whole-dollar output helps compare scenarios; it does not imply one-dollar accuracy.
- **Acquisition costs are planning inputs.** The editable default of 1 EUR = $1.16 is a scenario rate, not a live quote. Tax, tariff, shipping, VAT, and certification assumptions need independent confirmation.

## Offline use

The [hosted tool](https://aeae1.github.io/pipistrel-value-lab/) is the easiest way to get started. For an offline copy, download [`index.html`](index.html) and open it in a modern browser. It contains the complete application and bundled data in one self-contained file, with no server or dependencies required.

Local `file:` opening may restrict browser storage or clipboard access. Estimates still work; use the hosted website when sharing scenario links. Source links require an internet connection.

## Development and contributions

The website is published through GitHub Pages from `main` / the repository root. No build tools are needed to use it. To improve the dataset or model, start with [CONTRIBUTING.md](CONTRIBUTING.md).

| File or directory | Purpose |
| --- | --- |
| [`scripts/app.js`](scripts/app.js) | Estimator logic and browser interface |
| [`scripts/visuals.js`](scripts/visuals.js) | Interactive curves, equipment steps, and price breakdowns using the same estimator |
| [`template.html`](template.html) | HTML and CSS template |
| [`data/observations.json`](data/observations.json) | Aircraft offers, original prices, sources, and evidence quality |
| [`data/sources.json`](data/sources.json) | Supporting manufacturer, maintenance, regulatory, and acquisition references |
| [`scripts/build.py`](scripts/build.py) | Generates the deployable `index.html` |
| [`scripts/validate_data.py`](scripts/validate_data.py) | Data schema, identifiers, and source checks |
| [`tests/`](tests/) | Model regressions, asking-price audit, and desktop/mobile browser checks |
| [Validation workflow](.github/workflows/validate.yml) | Automated checks on pushes and pull requests |

After changing data or application source, rebuild and check the generated site:

```sh
python3 scripts/validate_data.py
python3 scripts/build.py
node --check scripts/app.js
node tests/model.test.cjs
python3 tests/backtest.py
```

For desktop and mobile browser checks:

```sh
python3 -m pip install playwright==1.56.0
python3 -m playwright install chromium
python3 tests/smoke.py
```

[WORK_HANDOFF.md](WORK_HANDOFF.md) contains the technical and research continuation notes.

## License and acknowledgements

Original site code, charts, and derived documentation are available under the [MIT License](LICENSE). Listing facts are summarized with original source URLs; seller content remains the property of its owners. Inclusion is not an endorsement or a claim that an aircraft is still available.

An independent project, unaffiliated with Pipistrel, Textron, Rotax, GRS, BRS, brokers, or price aggregators.
