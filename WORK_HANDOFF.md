# Work-mode takeover brief — Pipistrel Value Lab

**Owner:** GitHub account `aeae1` · **Repository:** https://github.com/aeae1/pipistrel-value-lab · **Branch:** `main` · **Snapshot:** 16 October 2026.

## Your task

Take over a substantive ongoing research/software project: build and maintain the most credible, auditable, user-friendly interactive **purchase-price estimator** for airworthy **Pipistrel Virus and Sinus** aircraft. Start by inspecting the public GitHub repository, its actual latest commit, README, RESEARCH.md, data, model source, and test scripts. Continue real work and push improved code/data to the repository; don't merely produce a plan or status. The chat's previous working files may not be automatically present in Work, but the repository is authoritative. When additional source files are available, prioritize exact latest GitHub versions.

## User's non-negotiable requirements

1. Only Pipistrel **Virus** and **Sinus** variants: classic long-wing Virus, Virus SW, SW121, SW121A Explorer, classic Sinus, Sinus Flex / Max Flex, and Sinus Max. Do **not** add Alpha, Taurus, Panthera, electric aircraft or unrelated competitors as valuation records. Contextual comparisons are okay if clearly segregated and not allowed to change the selected-model pricing.
2. **Completely exclude known non-airworthy, damaged salvage, parts-only, dismantled, and restoration/project aircraft.** Do not quietly include a broken aircraft to establish a low price. Other listings' advertised airworthiness remains an unverified seller claim until documentation is inspected.
3. User prefers **fuel injection + a ballistic parachute**, speed and practical usable payload. Glass panel preferred, autopilot nice but not mandatory. Target **under roughly $200,000** if possible. Search internationally as well as in the US. Import fees may be estimated, but eligibility to obtain an acceptable **U.S. FAA airworthiness basis and registration** is a separate gate, not an assumed cheap line item. The user is in the San Antonio / Helotes area of Texas.
4. Focus on **purchase price / market value**, not cost-of-ownership, maintenance budget or insurance premiums except as they change asset value or delivered acquisition price.
5. Treat **airframe hours and engine hours separately**, plus engine TBO remaining by hours **AND** calendar years, based on serial/service-bulletin eligibility if known. Handle newly installed/overhauled engines distinctly. Parachute repack time left and rocket replacement, propeller condition, Rotax rubber/hose age, gearbox and avionics/autopilot type must be selectable or displayed if genuinely documented.
6. Display estimator midpoint and range rounded to the **nearest dollar**, and ideally show how much each edit changed the estimated midpoint. This is display granularity for *sensitivity*, not a claim of one-dollar accuracy.
7. Market table must have **sortable columns** with numeric sorting, unknown-last behavior, search and filters, a direct original-listing link, and ideally **load this advertisement into calculator**. Display **all principal asking prices in USD equivalent**; keep original currency and user-editable exchange-rate provenance as secondary information. Do not conflate live FX, listing-date FX, and model-year inflation.
8. Public GitHub repository and a functioning GitHub Pages site; no need to keep an interactive app inside ChatGPT itself.

## Current implementation and verified work

The repo is `aeae1/pipistrel-value-lab`. A working offline-capable **self-contained** `index.html` is generated from editable `template.html`, `scripts/app.js`, `data/observations.json`, and `data/sources.json` with `scripts/build.py`. Do not edit only `index.html`: update the sources, build, and commit all changes together.

It currently includes **92 price observations**, of which **46** were model-eligible current/historical asking-price records, plus **35** additional cited research references, and seven model groups. Some archive/uncertain records are intentionally held out from the valuation formula; records for known non-airworthy aircraft were removed. Duplicate registrations and syndicated listings were investigated. Prices are advertisements, *not confirmed actual completed sale amounts*. A 38-listing leave-one-listing-out sanity check against asking prices yielded **9.92% median absolute percent error**, 31/38 within the tool's heuristic range. It is not an independently validated transaction-price forecast and has data leakage/small-n limitations.

The estimator uses editable benchmark-year asking-price priors blended with adjusted weighted same-variant advertisement comps, discounting age, geography, source quality, model mismatch, and missing fields; maintenance and documentation adjustments are applied explicitly. The other AI's separate app uses mostly a fixed depreciation curve and fixed equipment bonuses with an unrealistically tight nominal ±8% band. Its visually attractive option guide, itemized changes and comparable-presets were ideas for interface improvements, but **its fixed price model and sparse/unverified records were not adopted**.

The latest version already adds: a 16-column clickable sortable market table, numeric USD-equivalent first prices, a secondary original EUR/USD display, engine and airframe hours, hours to seller-advertised TBO, months to seller-stated calendar TBO, avionics details, autopilot, propeller, parachute/GRS repack deadline (when stated), seller location/date, evidence links, and load-as-scenario controls; a resale-option-prior reference table; whole-dollar midpoint and range; an edit-to-edit delta indicator; and informative **Unknown** values instead of invented intervals. An unverified listing preset marks engine evidence uncertain, rescue status unknown if not stated, and repack status unknown if not supported. Preset text warns that missing TBO/service-year numeric inputs are hypothetical sensitivity placeholders. The UX works on desktop/mobile and avoids external JavaScript/CDN dependencies.

## Project files and test commands

- `index.html` — built standalone site for branch-root GitHub Pages deployment.
- `template.html` — editable markup/CSS and database column labels.
- `scripts/app.js` — valuation algorithm, sort logic, UI, source loading, FX conversion.
- `scripts/build.py` — embeds JavaScript and JSON into the standalone site.
- `scripts/validate_data.py` — checks record shapes, links, IDs, exclusions/duplicates.
- `data/observations.json` — curated records with individual source URLs, seller asking prices, original currencies, notes, evidentiary quality flags, optional technical fields.
- `data/sources.json` — curated research bibliography.
- `RESEARCH.md`, `README.md`, `CONTRIBUTING.md` — valuation rationale, methodology, sources, edit process, caveats.
- `tests/smoke.py` — Playwright+Chromium end-to-end desktop and mobile tests.
- `tests/backtest.py` / `tests/backtest-summary.json` / `tests/backtest-results.csv` — requesting-price holdouts.

Suggested tests after any code or data change:

```bash
python3 scripts/validate_data.py
node --check scripts/app.js
python3 scripts/build.py
python3 tests/smoke.py
python3 tests/backtest.py
```

Use a Chromium installation with Playwright for UI tests; smoke test currently calls `/usr/bin/chromium` explicitly and may need a configurable browser path in Work.

## Immediate GitHub Pages task

Check `https://github.com/aeae1/pipistrel-value-lab` for current code and check if `https://aeae1.github.io/pipistrel-value-lab/` is live. If Pages is not yet enabled, use Work's cloud browser if available to open **repository Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)` → Save**. Wait for verified deployment via GitHub Pages status, then open the public site and run an interactive smoke test. The earlier chat's connected GitHub API lacked an action to enable Pages programmatically. If authorization is requested, ask the user to approve only that necessary action; do not ask for their password or one-time-code in chat. Do not claim the site is live until checked.

## Further research & engineering priorities

**Priority A — reliability/data quality.** Check every model-eligible source and questionable nameplate/engine serial; verify SW121 versus SW121A Explorer classifications and certification years. Specifically review SP-SFLY: several live advertisements identify a 2008 airframe, 1,185 airframe hours, 841 engine hours, claimed Rotax 912 ULS serial 4409165, 2,000-hour claimed TBO and calendar TBO expired May 2023; historical pricing €59,000 versus a later €55,000 broker advertisement. Don't assert the engine serial and official applicability are confirmed just because a seller gives a model label. Preserve price-history as **one plane**, not two comps. Check source snapshots, dates, seller price changes, repeat ads and exact aircraft registration/serial.

**Priority B — technical evidence.** Record type-certification and U.S. operating eligibility by exact model/year/serial; engine serial-specific TBO limits with service bulletin/rebuild paperwork; GRS/BRS repack versus rocket expiration, avionics suite and compatible autopilot, propeller overhaul/permit, wingtip options and approved MTOW. Design separate `known`, `seller-stated`, `inferred`, and `unknown` evidence states, and show what is actually documented. If unknown, don't fabricate a numeric due date. Certification/model/engine combinations that are impossible under standard approvals must be blocked or prominently flagged.

**Priority C — price model.** Prioritize additional genuine comparable *asks* and as many independently documented *sold transaction prices* as possible. Never relabel listing-disappearance or broker “sold” with last asking price as an actual sale. Investigate valuation bias by model and era, weighted temporal comps, region, and configuration; hold out entire aircraft identities/registrations to avoid repeated-price-history leakage. Assess calibration and coverage, and make heuristic range honestly wide when data are sparse. Be cautious about overcrediting recent Garmin upgrades or factory-standard kit. Compare international asking prices and Texas-delivered estimates while treating U.S. airworthiness eligibility as a hard gating question.

**Priority D — UX.** Retain the dashboard's sortable, horizontally scrollable sticky-first-column table, USD equivalents, copyable scenario URLs, local settings and one-dollar sensitivity. Improve filters and shareable side-by-side comparable views; make unknown technical data legible on mobile. Include “show me what changed this quote” explanation, plus scenario export if useful. Keep the app fast and offline-capable. It is okay to improve visual polish inspired by another studio, but do not blindly paste the other studio's model or unverifiable database.

## Ground truth and caveats

Our 92 records are a **research corpus, not 92 independently confirmed aircraft sales**. The 46 eligible pricing observations are **asking prices**, often potentially stale; the rest are archived/history/context/new-price anchors, held out as noted. A seller stating “ready to fly” is insufficient to independently verify airworthiness. The user expressly does not want any “parts plane,” salvage aircraft, or restoration project even shown in the market database. The original dashboard from another AI was supplied separately as an HTML upload in the prior chat and is not necessarily available in Work. The earlier comparative audit found its estimates frequently overpredict asks, it mishandled some aircraft details, and it included salvage: **keep our curated data model unless independently verified information warrants changing it**.

When reporting results, distinguish (i) repo files successfully committed, (ii) GitHub Pages enabled, (iii) public page loaded/tested, and (iv) data-source changes validated. Do not claim completed steps without verification. Finish with actual GitHub URLs, a concise changelog, valuation/backtest caveats, and any specific blocking authorization steps; avoid repeated status-only messages.