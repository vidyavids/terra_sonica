# Forest track reproducibility record

What is published, what was checked, and what is still needed to
reproduce the MODIS aggregation behind Hear the Forest from scratch.

## Published inputs (in this repo)

- Exact CSV: `data/terrasonica_modis_forest_2001_2024.csv`
  (https://github.com/vidyavids/terra_sonica/blob/main/data/terrasonica_modis_forest_2001_2024.csv),
  sha256 `230951D91F8FB6614C3B1B254CD1ED65880B702173EF30758A27EDFFACF81A04`,
  24 rows, accessed Nov 2026. Columns: `year`,
  `mean_tree_cover_pct`, `valid_land_area_km2`, `dataset`,
  `region`, `analysis_scale_m`.
- Validator: `scripts/validate_forest.py` — asserts 24 contiguous
  years, exact transcription, constant product/region/scale columns,
  valid-area band and <0.1% stability, unique min/max years, YoY step
  bound, mapping pins, and writes `src/data/forest-amazon.json`.
- Mapping audit: `docs/forest-mapping.md`.
- Upstream product: NASA MODIS MOD44B Collection 6.1
  (https://lpdaac.usgs.gov/products/mod44bv061/, verified live, Nov
  2026), variable Percent_Tree_Cover. NASA documents MOD44B V061 as
  a native 250 m product with a quality layer.

## Method as documented in the CSV

- Area-weighted annual mean Percent_Tree_Cover at 2000 m analysis
  scale over the Brazilian Legal Amazon (IBGE 2024 boundary per the
  provider; the boundary file itself is not on hand).
- Valid land area 4,987,428–4,990,883 km² (variation 0.0692%).
- Quality filtering: none documented in the supplied file — no
  quality columns and no export script were provided, so no quality
  claim is made anywhere on the site or in this record.

## What the checks prove (and do not prove)

The validator gates prove the track faithfully transcribes the
supplied export: no gaps, no substitutions, exact values, stable
mask area, sane year-to-year steps. They do NOT reproduce the
export itself (pixel extraction, resampling 250 m → 2000 m,
masking, quality filtering, area weighting). Until that process is
published, the site calls these "annual means from the supplied
export", never "verified annual means".

## Still needed from the data provider

- Google Earth Engine export script (or equivalent processing code).
- IBGE 2024 Legal Amazon boundary file (version + exact polygon).
- Resampling details (native 250 m → 2000 m analysis scale).
- Mask definitions (land/water/quality masks applied, if any).
- QA rules and methodology note (quality-bit filtering, if any).

When these arrive, re-run `scripts/validate_forest.py` against a
fresh export before finalising, and update this record.
