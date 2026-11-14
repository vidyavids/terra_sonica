# El Niño (Niño 3.4) — data mapping

## Source and provenance

- Upstream table: `ONI_NINO34_v6.txt` (McNoldy, B., University of Miami),
  downloaded from
  <https://bmcnoldy.earth.miami.edu/tropics/oni/ONI_NINO34_v6.txt>.
  Underlying dataset: NOAA ERSSTv6,
  <https://psl.noaa.gov/data/gridded/data.noaa.ersst.v6.html>.
- Columns in file: `YEAR`, `MON/MMM`, `NINO34_MEAN`, `NINO34_CLIM`,
  `NINO34_ANOM`, `ONI`, `PHASE`. Column sonified: `NINO34_ANOM`, the
  monthly SST anomaly in °C (difference between the monthly mean and the
  climatological value). The 3-month `ONI` column is not used.
- Region: Niño 3.4, 5S–5N, 190E–240E per the file header
  (= 5°S–5°N, 170°W–120°W).
- Reference period: 1991–2020 per ONI convention. The base-period years
  are not embedded in the file header, which documents a 30-year
  climatology updated every 5 years; supporting evidence: `NINO34_CLIM`
  is constant per calendar month across the whole window (checked on
  every validator run), i.e. a single base period applies throughout.
- Window: Jan 2020–Aug 2026, exactly 80 contiguous monthly events, all
  present, none missing. Observed range −1.13…+2.17 °C
  (min Nov 2020, max Aug 2026).
- Derived artifact: `nino34-monthly-2020-2026.csv`
  (Year, Month, AnomalyC, MeanC, ClimC), written by the validator and
  verified by re-read round-trip on every run.

## Normalization (linear frequency)

Finalized mapping, applied exactly as specified:

```text
A' = clamp(A, -1.5, +2.5)
linearHz = 220 + (A' + 1.5) / 4.0 * 660
```

Input range in this window (−1.13…+2.17 °C) maps to ≈ 281.1…825.6 Hz,
inside the E3–B5 table, so the note clamp never triggers; it exists so
the rule is total for any future input.

Pinned spot-checks (asserted by the validator, end to end):

| Month | Anomaly | Raw Hz | Note |
|-------|---------|--------|------|
| Feb 2021 | −0.94 °C | 312.4 | E4 |
| Jul 2023 | +0.95 °C | 624.25 | E5 |
| Aug 2026 | +2.17 °C | 825.55 | G5 |

## Musical quantization (E natural minor)

Same 19-note E-minor set and rule as track 1
(see `docs/temperature-mapping.md` for the table):

1. Clamp: `raw <= E3` → E3; `raw >= B5` → B5.
2. Otherwise pick the note minimizing `ABS(LOG(raw / note, 2))`.
3. Ties resolve to the higher note.

Timing: 500 ms per monthly observation, 80 notes ≈ 40 s total.

## Missing values

`NINO34_ANOM` of −99.99 means no observation. No month in
Jan 2020–Aug 2026 is missing. (For the record, the source file shows
Nov/Dec 2026 as missing — outside the track window.) Missing months
would fail validation; they are never interpolated or zero-filled.

## Scrub presets

- "La Niña 2021" → Feb 2021 (−0.94 °C, E4), the pinned cool contrast.
- "El Niño 2023" → Jul 2023 (+0.95 °C, E5), the pinned warm contrast.
- The window minimum (−1.13 °C) falls in Nov 2020, reachable via the
  timeline slider.

## Contextual visual (SVS 5683)

Not synchronized with the sound — shown alongside as context.

- Page: NASA Scientific Visualization Studio, "Signs of El Niño in
  2026" (SVS 5683), <https://svs.gsfc.nasa.gov/5683/>, released
  Oct 15 2026, updated Oct 21 2026. Visualizations by Kel Elkins.
- Video: `elnino_2026_ssta_avw_ssha_1010_nolabels_1080p60.mp4`
  (1920×1080, observed 37,784,743 bytes ≈ 36.0 MB as listed),
  stored at `public/media/`.
- Still: `elnino_2026_ssta_avw_ssha_1010_nolabels.02200_preview.jpg`
  (1920×1080, observed 1,186,965 bytes; the page lists 796.2 KB),
  used as the track's main visual and the video poster.
- Verified coverage: the animations run Jan 29–Oct 10 of 2025 vs
  2026 (same months compared; "1010" = Oct 10). The sound covers
  Jan 2020–Aug 2026 monthly. Products shown: SSTA, AVW (ocean
  colour), SSHA — only the SST anomaly is sonified.
- Reuse: U.S. government visualization; credit NASA SVS as above.
  The SVS page links NASA's reproduction guidelines for terms.
- Acquisition: `python scripts/download_svs_media.py` (checks sizes
  and MP4/JPEG magic bytes, exits non-zero on failure).

## Regenerating

```powershell
python scripts/validate_nino34.py
```

This re-derives the CSV, re-validates, and rewrites
`src/data/nino34.json` (80 events) or exits non-zero.
