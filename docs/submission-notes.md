# Terra Sonica — submission notes (data sources)

Every playable track sonifies verified observations. No values are
fabricated, interpolated, or gap-filled; validators refuse to finalize
on any missing or inconsistent input.

## Track 1 — Global Surface Temperature (1880–2025)

- NASA GISTEMP Global Mean Estimates based on Land and Ocean Data,
  official Lowess(5) series (`graph.txt`), 146 yearly values.
- Audit: `docs/temperature-mapping.md`. Validator:
  `scripts/validate_temperature.py`.

## Track 2 — El Niño (Jan 2020–Aug 2026)

- Niño 3.4 monthly SST anomalies, NOAA ERSSTv6 via McNoldy (University
  of Miami) `ONI_NINO34_v6.txt` (accessed Nov 2026), 80 months.
- Visual: NASA SVS 5683 still (Jan 29–Oct 10, 2025 vs 2026), contextual,
  not synchronized with the sound.
- Audit: `docs/nino34-mapping.md`. Validator:
  `scripts/validate_nino34.py`.

## Track 3 — Hear the Fire — Brazil (2020–2025)

- Monthly counts of MODIS active-fire detections over Brazil, NASA
  FIRMS API, product MODIS_SP (Terra + Aqua), masked to the GADM 4.1
  Brazil boundary; 72 months, Jan 2020–Dec 2025 (accessed Nov 2026).
- Counts are detection observations, not unique wildfires or area
  burned. FRP and burned area (MCD64A1) are different variables and
  are not sonified.
- Visual: MODIS Greece fires still (Aug 2009), contextual, not
  synchronized with the sound.
- Audit: `docs/fire-mapping.md`. Validator:
  `scripts/validate_fire.py`. Fetch: `scripts/firms_brazil.py`.
- Drone layer: monthly mean FRP (MW) from the same FIRMS rows
  (`scripts/firms_frp.py`, accessed Nov 2026, validated by
  `scripts/validate_fire_frp.py`).

## Track 4 — Hear the Lights — Earth at Night — India (2012–2025)

- Annual mean corrected nighttime radiance over India, NASA Black
  Marble VNP46A4 Collection 002, DOI 10.5067/VIIRS/VNP46A4.002,
  variable NearNadir_Composite_Snow_Free, Suomi NPP only, 14 yearly
  values (accessed Nov 2026).
- Radiance is not a direct measurement of electricity use or
  population.
- Visual: Black Marble Asia night-lights still (2012), contextual,
  not synchronized with the sound.
- Audit: `docs/sky-mapping.md`. Validator: `scripts/validate_sky.py`.
  Aggregation: `scripts/aggregate_nightlights.py`.

## Track 5 — Hear the Forest — Amazon Tree Cover (2001–2024)

- Annual mean Percent_Tree_Cover over the Brazilian Legal Amazon
  (IBGE 2024 boundary per provider), NASA MODIS MOD44B Collection
  6.1, area-weighted annual mean at 2000 m analysis scale, provided
  as `terrasonica_modis_forest_2001_2024.csv`; 24 yearly values
  (accessed Nov 2026).
- Quality filtering: none documented in the supplied file, none
  claimed. Boundary and area figures verified (area stable within
  0.1%).
- Mean canopy-cover %, not a share of the Amazon that is forest and
  not a measure of clearing; the 1.18-point 2001–2024 change is a
  change in mean cover. Narrow 220–660 Hz pitch span with an
  on-page disclosure that pitch is stretched to keep small
  differences audible.
- Visual: MODIS Amazon rainforest still (1 Jul 2002), contextual,
  not synchronized with the sound.
- Audit: `docs/forest-mapping.md`. Validator:
  `scripts/validate_forest.py`. Reproducibility record:
  `docs/forest-reproducibility.md`.
