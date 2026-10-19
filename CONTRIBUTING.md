# Maintaining the price research

Snapshot starting point: **2026-10-16**. Listings are evidence, not sales. Update carefully.

## Adding or updating an aircraft

1. Prefer the seller/broker original listing over a syndicated copy. Preserve the URL to a specific aircraft whenever possible, not a generic model or search page.
2. **Flying-aircraft scope first:** exclude any aircraft expressly described as unairworthy, requiring airframe/prop repairs before flight, salvage, parts-only, or incomplete restoration. A completed, documented repair with valid airworthiness may qualify; verify the seller’s assertion. Never turn a salvage asking price into a “cheap Virus” comparable.
3. **Deduplicate** by registration, serial number, owner, photos and equipment. A price reduction for the same aircraft belongs in the original record's `priceHistory[]`, not a new row. Never count removed listings as sold.
4. In `data/observations.json`, use a new unique ID; include `family`, `variant`, `year` (or `null`), `price` in **original currency**, `currency`, `location`, `region`, `date` (ISO YYYY-MM-DD), `url`, `source`, `status`, `quality`, `notes`.
5. Preserve unknown equipment as **absent field** or `null`. A missing parachute mention does not prove no parachute. `autopilot: true` means described as installed, not just software-ready.
6. `status` can be `current`, `historical`, `archive`, or `new`. **Never add a non-airworthy, salvage, parts-only or restoration-project aircraft, even as an excluded archive or price floor.** Set `skipModel: true` for factory anchors, ambiguous model identification, duplicates and archives.
7. If a listing's aircraft category is uncertain (e.g. an entry says SW121 built before certified production), explain the conflict, flag `classification` and exclude until resolved.
8. Update `sources.json` only for relevant background research links, not every classified. Advert links belong in `observations.json`.
9. Run validator, builder, smoke suite and LOO audit (commands in README). Commit source edits **and generated `index.html`**. Update the displayed as-of date only when the new evidence truly warrants it.

## Basic record illustration

```json
{
  "id": "EXAMPLE",
  "aircraftId": "record:EXAMPLE",
  "family": "virus",
  "variant": "virus_sw",
  "year": 2019,
  "price": 112000,
  "currency": "EUR",
  "location": "Slovenia",
  "region": "Europe",
  "date": "2026-10-16",
  "dateBasis": "Seller posting date",
  "observedAt": "2026-10-16",
  "priceType": "asking",
  "access": "full-page",
  "fieldEvidence": {
    "engine": {"state": "seller-stated", "url": "https://example.com/actual-ad"}
  },
  "url": "https://example.com/actual-ad",
  "reg": null,
  "hours": 540,
  "engineHours": null,
  "engine": "is100",
  "avionics": "hdx",
  "autopilot": true,
  "parachute": null,
  "quality": 0.7,
  "source": "Direct owner listing",
  "notes": "Seller claims 912iS; confirm serial and engine documentation before quoting this as fuel injected.",
  "status": "current"
}
```

*This is a schema example, not a real aircraft offer. Do not add it as evidence.*

## A correct sale record requires stronger evidence

A closed listing, an ownership transfer, a broker's statement of “sold”, or last asking price marked “sold” **does not establish the achieved purchase price**. Introduce a transaction record only if a publicly verifiable closing price or competent documentary confirmation is available; record date, currency and source of the **transaction**, not just the ask. Keep sold and asking databases visibly separate.

## Suggested evidence grading

- 0.90–1.00: direct original dealer/owner listing with matching reg and detailed configuration.
- 0.70–0.89: identified broker/aggregator with aircraft-specific price and details.
- 0.40–0.69: secondary index, incomplete identification, or older listing.
- Below 0.40: ambiguous, heavily discounted confidence / context only.

These grades are editorial judgments, not objective statistical probabilities.

New records also require `aircraftId`, `priceType: "asking"`, `dateBasis`, `access`, and `fieldEvidence`. Keep `observedAt` separate from the advertisement date and do not claim a retrieval for inherited evidence. `fieldEvidence[field]` may identify `seller-stated`, `inferred`, `conflicting`, or a legacy claim, with its URL. Unpopulated fields are unknown; no record is independently verified merely because a page was accessible. Use `duplicateOf` plus the canonical `aircraftId` for suspected repeats and exclude them. Each price-history event has its own currency and URL. Unordered conflicting offers belong in `alternateOffers`, not an invented dated price sequence.

Never encode “repack due, exact date unknown” as a numeric month. Supply `repackStatus: "due"`; use `repackDue` only for an actual YYYY-MM deadline. Engine hours, propeller hours and airframe hours are different fields. `autopilotType` is optional: installed-but-unspecified is distinct from verified axes.

The example includes required provenance fields; replace every example fact with actual evidence before submitting a real record. `node tests/model.test.cjs` checks calculation invariants, `python3 tests/backtest.py` holds out entire identity groups through the production engine, and browser CI tests all sortable headings, presets, filters and export. Do not adjust priors solely to optimize this retrospective asking corpus.
