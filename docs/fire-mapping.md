# Hear the Fire — Amazon (2020–2025): data and mapping audit

Third playable track. Monthly counts of MODIS active-fire detections
over Brazil, Jan 2020–Dec 2025 (72 months), sonified one month per note
at 500 ms per note (~36 s).

## Source (verified)

- NASA FIRMS API, area query over the Brazil bounding box,
  product **MODIS_SP** (standard science-quality processing; the
  MODIS_NRT fallback was implemented but never needed).
- Accessed 2026-11-15. API version field: none (the versioned URL shape
  returns HTTP 400; the working shape is
  `/api/area/csv/{MAP_KEY}/{PRODUCT}/{bbox}/{days}/{date}`, max 5 days
  per query, verified by probe 2026-11-15).
- Region: Brazil, filtered to the GADM 4.1 Brazil level-0 dissolved
  polygon (same boundary approach as the India mask). The global
  fallback was NOT needed — say so here explicitly if that ever changes.
- Sensor: MODIS only (Terra + Aqua; both present in every month).
  VIIRS was never mixed in.

## What the numbers are

Each monthly value is a **count of MODIS active-fire detection pixels**
inside Brazil that month. It is an observation count, NOT a count of
unique wildfires and NOT area burned. Burned area is a different product
(MCD64A1) and is never presented as a FIRMS variable. Fire radiative
power (FRP) comes back in the same API rows but is **not used** here.

Verified range over the 72 months: **2,914** (Apr 2025) to **164,682**
(Sep 2024) detections/month, 2,230,722 total. All 72 months have full
day coverage (28/29/30/31 days as the calendar requires); every month
is MODIS-only with both Terra and Aqua present. Largest month-to-month
ratio is 3.5 (seasonal onset) and largest same-month year-over-year
ratio is 2.53 (the record 2024 drought fire season) — both consistent
with known fire seasonality, not a product or sensor change.

## Mapping (finalized, documented before notes were generated)

For monthly count C, clamped to the verified range first:

```
f_raw = 220 + (C - 2914) / (164682 - 2914) × 660
```

Snap to the nearest E-natural-minor note by log-frequency distance
(ABS(LOG(raw/note, 2))), ties to the higher note, clamp to E3/B5.
By construction the minimum maps to 220 Hz (A3) and the maximum to
880 Hz (A5).

## Second layer: FRP drone (user decision)

Under every main note, a fixed low E3 drone (164.81 Hz, sine) sounds
for the same 500 ms. Its gain follows the monthly mean FRP (MW),
min–max normalized across the 72 verified months:

```
gain = 0.03 + 0.09 × (FRP − 21.6736) / (63.2162 − 21.6736)
```

with verified min 21.6736 MW (Mar 2023) and max 63.2162 MW (Aug 2024).
The main note is unchanged and stays dominant (peak gain 0.3 vs drone
≤ 0.12). FRP values come from the same FIRMS rows as the counts
(`scripts/firms_frp.py`, validated by
`scripts/validate_fire_frp.py`); per-month detection counts were
asserted identical between the two fetches.

## Structural note (read before touching the JSON)

`TrackEventBase` requires an `anomalyC` number, which the shared chart
and readout channel plot. Fire has no anomaly: every fire event stores
the observed monthly count in `count`, and `anomalyC` mirrors it purely
as the shared chart channel. Display units NEVER come from that field
for this track — the fire panel passes its own count formatter and its
own chart unit, so no fire value is ever labeled °C. The validator
asserts `anomalyC == count` on every event.

## Validation

`scripts/validate_fire.py` asserts: 72 contiguous months; exact range
2,914–164,682; full day coverage per month; MODIS-only with both
satellites every month (from the fetch log); the min/max/tie/clamp
mapping pins; and writes `src/data/fire-amazon.json`.
