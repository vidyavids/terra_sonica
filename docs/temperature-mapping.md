# Global Temperature — data mapping

## Source and provenance

- Dataset: NASA GISS Surface Temperature Analysis (GISTEMP), Global Mean
  Estimates based on Land and Ocean Data, file
  `Global_Mean_Estimates_graph.txt` at the workspace root, downloaded from
  <https://data.giss.nasa.gov/gistemp/graphs/graph_data/Global_Mean_Estimates_based_on_Land_and_Ocean_Data/graph.txt>.
- Columns in file: `Year`, `No_Smoothing`, `Lowess(5)`. Column sonified:
  `Lowess(5)`, the official smoothed annual anomaly in °C.
- Reference period: 1951–1980 per GISTEMP methodology. It is not embedded
  in the file itself, so treat that attribution as methodology, not file content.
- Window: 1880–2025, exactly 146 year-aligned events, all present, none missing.
- Cross-check: `GLB.Ts+dSST.csv` (GISTEMP v4 Land-Ocean Global Means, kept
  as reference) has its `J-D` annual means compared against the graph.txt
  `No_Smoothing` column on every validator run: 146/146 agree within 0.005 °C.

## The Lowess(5) series

The track sonifies the official GISTEMP `Lowess(5)` smoothed series — the
same smoothing NASA applies for its global-mean graph — so brief spikes
are softened relative to raw annual means. The unsmoothed means travel in
the same file (`No_Smoothing`) and match the `GLB.Ts+dSST.csv` `J-D`
column exactly (see cross-check above), which grounds this file in the
already-accepted download. (An interim build sonified `J-D` directly while
no official Lowess column was on hand; it was superseded, never shipped
as Lowess.)

## Normalization (linear frequency)

Preserved verbatim from the prototype spreadsheet header:

```text
linearHz = 220 + (anomalyC + 0.50) / 1.80 * 660
```

Input range in this window (−0.41…+1.23 °C) maps to ≈ 253.0…854.3 Hz.

## Musical quantization (E natural minor)

The linear frequency is quantized to the prototype's 19-note E-minor set:

| Note | Hz | Note | Hz | Note | Hz |
|------|------|------|------|------|------|
| E3 | 164.81 | E4 | 329.63 | E5 | 659.25 |
| F#3 | 185.00 | F#4 | 369.99 | F#5 | 739.99 |
| G3 | 196.00 | G4 | 392.00 | G5 | 783.99 |
| A3 | 220.00 | A4 | 440.00 | A5 | 880.00 |
| B3 | 246.94 | B4 | 493.88 | B5 | 987.77 |
| C4 | 261.63 | C5 | 523.25 | | |
| D4 | 293.66 | D5 | 587.33 | | |

Rule, exactly as specified for the tested prototype:

1. Clamp: `raw <= E3` → E3; `raw >= B5` → B5.
2. Otherwise pick the note minimizing `ABS(LOG(raw / note, 2))`
   (nearest pitch in log-frequency space).
3. Ties resolve to the higher note (implemented as a strict-`<` scan
   from the highest note down, so an exact tie keeps the higher pitch).

With the current data range the clamp never triggers; it exists so the
rule is total for any future input.

## Missing values

`J-D` markers (`***`, `****`, blank) mean no annual mean exists. The year
is excluded from the events array, recorded in
`provenance.excludedYears` with its reason, and never interpolated,
zero-filled, or forward-filled. The validator refuses to finalize if any
year in 1880–2025 is missing.

## Legacy audit (why the prototype data was superseded)

`python scripts/validate_temperature.py` replays this audit on every run:

- `land and ocean.csv` carries 146 Lowess rows for 1880–2025, but only
  4 of 146 agree with the official Lowess(5) series within 0.005 °C; the
  worst divergence is 0.55 °C (2025: legacy +1.78 vs official +1.23). The
  legacy column is a different series (consistent with a land-only file,
  matching the `Lowess_Land Data.html` prototype name), not the official
  global smoothing.
- `frequencies.js` holds 147 entries, one more than the 146 required;
  the extra leading `196` duplicates the CSV's header-row artifact.
- The legacy linear/quantized columns are also shifted one year forward
  (each row's frequencies describe the *next* year's anomaly).

The originals stay byte-identical in git (`54aba20`); only the tested
*playback logic* was ported, never the stale numbers.

## Regenerating

```powershell
python scripts/validate_temperature.py
```

This re-audits, re-derives, and rewrites
`src/data/global-temperature.json` (146 events) or exits non-zero.
