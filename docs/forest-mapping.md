# Hear the Forest — Amazon Tree Cover (2001–2024): data and mapping audit

Fifth playable track. Annual mean Percent_Tree_Cover over the Brazilian
Legal Amazon, 2001–2024 (24 values), sonified one year per note at
700 ms per note (~16.8 s).

## Source (as supplied)

- NASA MODIS MOD44B (Vegetation Continuous Fields Yearly L3 Global),
  Collection 6.1, variable Percent_Tree_Cover, units %.
  Product page: https://lpdaac.usgs.gov/products/mod44bv061/ (verified
  live, Nov 2026).
- Provided as `terrasonica_modis_forest_2001_2024.csv` (24 rows,
  accessed Nov 2026): area-weighted annual mean at 2000 m analysis
  scale. Every row carries the same product, region, and scale. Exact
  file: https://github.com/vidyavids/terra_sonica/blob/main/data/terrasonica_modis_forest_2001_2024.csv
- Boundary: Brazilian Legal Amazon, IBGE 2024 boundary per the
  provider; the CSV labels the region "Brazilian Legal Amazon".
- Valid land area 4,987,428–4,990,883 km² across the 24 rows
  (variation 0.0692%, under 0.1%) — consistent.

## Quality gate (read before citing)

The supplied CSV carries NO quality columns, and no GEE export script
or quality-bit description was provided with it. Quality filtering is
therefore NOT claimed anywhere on the site or in the dataset
provenance: the values are used exactly as supplied. If a quality
filter is documented later, re-run `scripts/validate_forest.py`
against the filtered export before finalising.

## What the numbers are

Each yearly value is the area-weighted annual mean of satellite-estimated
tree-canopy cover (Percent_Tree_Cover, %) across valid land in the
Brazilian Legal Amazon. In plain words: the average percent of each
pixel covered by tree canopy. This is NOT the share of the Amazon
that is forest, and it is NOT a measure of clearing — never convert
it to hectares, never "we lost X% of the forest". The series
fluctuates year to year (max year-on-year step 1.756 pp).

Verified range over the 24 yearly means: **54.496** (2016) to **57.705**
(2011) %. The 2001→2024 change is 56.429% → 55.245%, a decline of
**1.18 percentage points** in mean canopy cover — a change in cover %,
not a measure of deforested area.

## Mapping (finalized, documented before notes were generated)

For yearly mean cover V (full precision as supplied), clamped to the
verified endpoints first:

```
f_raw = 220 + (V - 54.496) / (57.705 - 54.496) × 440
```

The data spans only 3.209 percentage points (54.496%–57.705%), about
a 6% relative change, so it maps to a NARROWER 220–660 Hz span
(A3–E5, 1.5 octaves) rather than the full two octaves: the full range
would make this small change sound as dramatic as the temperature or
fire tracks. Eleven distinct E-minor notes sound across the 24 years.

Snap to the nearest E-natural-minor note by log-frequency distance
(ABS(LOG(raw/note, 2))), ties to the higher note, clamp to E3/B5.
The endpoints map to 220 Hz (A3, 2016) and 660 Hz (E5, 2011).

Spot-checks (validator-pinned): 2001 (56.429%) → B4; 2011 (57.705%) →
E5; 2016 (54.496%) → A3; 2024 (55.245%) → E4.

Disclosure (also on the page): pitch is stretched so the small
year-to-year differences are audible; the size of the pitch swing
does not mean the forest changed by that much.

## Structural note (read before touching the JSON)

`TrackEventBase` requires an `anomalyC` number, which the shared chart
and readout channel plot. Tree cover has no anomaly: every forest
event stores the observed mean cover in `treeCoverPct`, and `anomalyC`
mirrors it purely as the shared chart channel. Display units NEVER
come from that field for this track — the forest panel passes its own
percent formatter and its own chart unit, so no forest value is ever
labeled °C. The validator asserts `anomalyC == treeCoverPct` and exact
equality with the CSV on every event.

## Validation

`scripts/validate_forest.py` asserts: 24 contiguous years, no missing
values; constant product/region/scale columns; valid area in band and
stable under 0.1%; unique min year 2016 and max year 2011; all values
inside the mapping endpoints; max YoY step under 2.5 pp; the
min/max/tie/clamp mapping pins; the four event spot-checks; exact
CSV equality per event; and writes `src/data/forest-amazon.json`.
