# Hear the Lights — Earth at Night — India (2012–2025): data and mapping audit

Fourth playable track. Annual mean corrected nighttime radiance over
India, 2012–2025 (14 values), sonified one year per note at 700 ms per
note (~9.8 s).

## Source (verified)

- NASA Black Marble VNP46A4 (VIIRS/NPP Lunar BRDF-Adjusted Nighttime
  Lights Yearly L3 Global, 15 arc-second), Collection 002,
  DOI 10.5067/VIIRS/VNP46A4.002.
- Variable NearNadir_Composite_Snow_Free, units nW/(cm^2 sr), stored as
  float32 with scale_factor 1.0 / offset 0.0 read from each file (the
  Collection 001 scale factor 0.1 was NOT applied).
- Sensor: Suomi NPP only — every kept pixel in all 14 years carries
  DNB platform code 0 (Suomi-NPP); no NOAA-20/21 pixels, so no
  inter-calibration step. Single collection across all years.
- Mask: GADM 4.1 India level-0 dissolved polygon; ~16.047M kept land
  pixels per year, stable to ±0.001% across all 14 years.
- Accessed Nov 2026 (granules downloaded 2026-11-15).

## What the numbers are

Each yearly value is the arithmetic mean of corrected nighttime
radiance across valid land pixels within India, pooled over the 11
intersecting tiles. Nighttime radiance is NOT a direct measurement of
electricity consumption or population; it is affected by illumination,
sensor characteristics, atmosphere, seasonal conditions, and data
processing. Fill and out-of-range pixels are excluded; genuinely dark
pixels are kept.

Verified range over the 14 yearly means: **0.4417** (2013) to **1.1153**
(2025) nW/(cm^2 sr). Year-on-year steps are smooth (max ratio 1.26),
consistent with steady brightening, not a product or sensor change.
2020 dips slightly (0.6051→0.5814), consistent with documented
lockdown dimming; recorded as an observation, not a claim.

## Mapping (finalized, documented before notes were generated)

For yearly mean radiance R (rounded to 4 decimals), clamped to the
verified range first:

```
f_raw = 220 + (R - 0.4417) / (1.1153 - 0.4417) × 660
```

Snap to the nearest E-natural-minor note by log-frequency distance
(ABS(LOG(raw/note, 2))), ties to the higher note, clamp to E3/B5.
By construction the minimum maps to 220 Hz (A3) and the maximum to
880 Hz (A5).

## Structural note (read before touching the JSON)

`TrackEventBase` requires an `anomalyC` number, which the shared chart
and readout channel plot. Night lights have no anomaly: every sky
event stores the observed mean radiance in `radianceC`, and `anomalyC`
mirrors it purely as the shared chart channel. Display units NEVER
come from that field for this track — the sky panel passes its own
radiance formatter and its own chart unit, so no sky value is ever
labeled °C. The validator asserts `anomalyC == radianceC` on every
event.

## Validation

`scripts/validate_sky.py` asserts: 14 contiguous years; exact range
0.4417–1.1153 on rounded values; single platform code 0 and full tile
set every year; pixel counts in band; YoY ratio below 1.5; the
min/max/tie/clamp mapping pins; and writes
`src/data/nightlights-india.json`.
