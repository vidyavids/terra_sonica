#!/usr/bin/env python3
"""Terra Sonica track 5: validate Forest data and finalize the Forest JSON.

Reads ``data/terrasonica_modis_forest_2001_2024.csv`` (verified annual
mean Percent_Tree_Cover over the Brazilian Legal Amazon, 2001-2024),
validates gates (24 contiguous years, exact values, constant product /
region / scale columns, valid-area band and stability, unique min/max,
year-on-year step bound), applies the finalized frequency mapping, and
writes ``src/data/forest-amazon.json``.

Fails (exit 1) on any gap, range violation, or failed spot-check.
"""

import csv
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "terrasonica_modis_forest_2001_2024.csv"
OUT = ROOT / "src" / "data" / "forest-amazon.json"

FIRST_YEAR = 2001
LAST_YEAR = 2024
EXPECTED_YEARS = 24
MIN_COVER = 54.496  # 2016, verified (mapping endpoint, 3 decimals)
MAX_COVER = 57.705  # 2011, verified (mapping endpoint, 3 decimals)
MIN_YEAR = 2016
MAX_YEAR = 2011
AREA_LO = 4_980_000.0  # km^2; observed 4,987,428..4,990,883
AREA_HI = 5_000_000.0
MAX_STEP_PP = 2.5  # max observed YoY step is ~1.76 pp

DATA_CITATION = ("Annual mean Percent_Tree_Cover over the Brazilian Legal "
                 "Amazon (IBGE 2024 boundary per provider), NASA MODIS "
                 "MOD44B Collection 6.1, area-weighted annual mean at "
                 "2000 m analysis scale, provided as "
                 "terrasonica_modis_forest_2001_2024.csv (accessed Nov "
                 "2026). Quality filtering: none documented in the "
                 "supplied CSV -- no quality columns and no export script "
                 "were provided, so no quality claim is made.")
VISUAL_CITATION = ("Amazon rainforest, northern Brazil, MODIS, 1 Jul 2002. "
                   "Credit: NASA Earth Observatory image by Jacques "
                   "Descloitres, MODIS Land Rapid Response Team, NASA/GSFC.")

# E-natural-minor pitch set, same as tracks 1-4.
NOTES: list[tuple[str, float]] = [
    ("E3", 164.81), ("F#3", 185.0), ("G3", 196.0), ("A3", 220.0),
    ("B3", 246.94), ("C4", 261.63), ("D4", 293.66), ("E4", 329.63),
    ("F#4", 369.99), ("G4", 392.0), ("A4", 440.0), ("B4", 493.88),
    ("C5", 523.25), ("D5", 587.33), ("E5", 659.25), ("F#5", 739.99),
    ("G5", 783.99), ("A5", 880.0), ("B5", 987.77),
]


def linear_freq(value: float) -> float:
    """Finalized track-5 mapping: clamp to [54.496, 57.705], then
    220 + (value - 54.496) / (57.705 - 54.496) * 440 (Hz), i.e. a
    220-660 Hz (A3-E5) span so the small data range is not exaggerated."""
    clamped = min(MAX_COVER, max(MIN_COVER, value))
    return 220.0 + (clamped - MIN_COVER) / (MAX_COVER - MIN_COVER) * 440.0


def quantize(raw: float) -> tuple[str, float]:
    """Nearest E-minor note by |log2(raw/note)|; ties keep the higher note
    (scan is high-to-low with strict <); raw outside [E3, B5] clamps."""
    if raw <= NOTES[0][1]:
        return NOTES[0]
    if raw >= NOTES[-1][1]:
        return NOTES[-1]
    best: tuple[str, float] = NOTES[-1]
    best_d = math.inf
    for name, freq in reversed(NOTES):
        dist = abs(math.log2(raw / freq))
        if dist < best_d:
            best, best_d = (name, freq), dist
    return best


TIE_RAW_E4_F4 = 349.2274383550067

# (raw Hz, expected note): durable regression pins for quantize().
QUANTIZE_CASES: list[tuple[float, str]] = [
    (220.0, "A3"),  # verified minimum maps exactly to A3
    (880.0, "A5"),  # verified maximum maps exactly to A5
    (100.0, "E3"),  # below E3 clamps to E3
    (2000.0, "B5"),  # above B5 clamps to B5
    (TIE_RAW_E4_F4, "F#4"),  # exact tie resolves to the higher note
]

# (cover %, expected raw Hz): pins for the finalized linear mapping,
# including the clamp endpoints.
LINEAR_CASES: list[tuple[float, float]] = [
    (54.496, 220.0),
    (57.705, 660.0),
    (0.0, 220.0),  # below MIN_COVER clamps to 220 Hz
    (100.0, 660.0),  # above MAX_COVER clamps to 660 Hz
]

# (year, expected note, expected raw Hz at 0.1 Hz): end-to-end pins on
# built events. Raw values pre-computed independently of this script.
EVENT_CASES: list[tuple[int, str, float]] = [
    (2001, "B4", 485.1),
    (2011, "E5", 660.0),
    (2016, "A3", 220.0),
    (2024, "E4", 322.7),
]


def run_self_tests() -> None:
    """Durable regression pins for the finalized track-5 mapping."""
    d_lo = abs(math.log2(TIE_RAW_E4_F4 / 329.63))
    d_hi = abs(math.log2(369.99 / TIE_RAW_E4_F4))
    assert d_lo == d_hi, "tie premise broken: midpoint distances differ"
    for raw, want in QUANTIZE_CASES:
        got = quantize(raw)[0]
        assert got == want, f"quantize({raw}) = {got}, want {want}"
    for value, want in LINEAR_CASES:
        got = linear_freq(value)
        assert abs(got - want) < 1e-9, f"linear({value}) = {got}, want {want}"


def main() -> int:
    print("== mapping self-tests ==")
    try:
        run_self_tests()
    except AssertionError as err:
        print(f"FATAL: {err}", file=sys.stderr)
        return 1
    print(f"  {len(QUANTIZE_CASES) + len(LINEAR_CASES)}/"
          f"{len(QUANTIZE_CASES) + len(LINEAR_CASES)} cases pass")

    with SRC.open(encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))
    want_years = list(range(FIRST_YEAR, LAST_YEAR + 1))
    assert len(want_years) == EXPECTED_YEARS, len(want_years)
    if len(rows) != EXPECTED_YEARS:
        print(f"FATAL: {len(rows)} rows, want {EXPECTED_YEARS}.",
              file=sys.stderr)
        return 1
    years: list[int] = []
    values: dict[int, float] = {}
    areas: dict[int, float] = {}
    for row in rows:
        if not row["year"] or not row["mean_tree_cover_pct"] \
                or not row["valid_land_area_km2"]:
            print(f"FATAL: missing value in row {row}.", file=sys.stderr)
            return 1
        year = int(float(row["year"]))
        years.append(year)
        values[year] = float(row["mean_tree_cover_pct"])
        areas[year] = float(row["valid_land_area_km2"])
        if not row["dataset"].startswith("NASA MODIS MOD44B"):
            print(f"FATAL: {year} dataset {row['dataset']!r}.",
                  file=sys.stderr)
            return 1
        if row["region"] != "Brazilian Legal Amazon":
            print(f"FATAL: {year} region {row['region']!r}.", file=sys.stderr)
            return 1
        if row["analysis_scale_m"] != "2000":
            print(f"FATAL: {year} scale {row['analysis_scale_m']!r}.",
                  file=sys.stderr)
            return 1
    if years != want_years:
        print(f"FATAL: years {years}, want {want_years}.", file=sys.stderr)
        return 1
    print(f"window: {len(rows)} contiguous years, "
          f"{FIRST_YEAR} through {LAST_YEAR}, no gaps; single product, "
          f"region, and scale across all rows")

    lo_area, hi_area = min(areas.values()), max(areas.values())
    print(f"  valid area: {lo_area:,.0f}..{hi_area:,.0f} km^2 "
          f"(variation {(hi_area - lo_area) / hi_area * 100:.4f}%)")
    if lo_area < AREA_LO or hi_area > AREA_HI:
        print("FATAL: valid area outside band.", file=sys.stderr)
        return 1
    if (hi_area - lo_area) / hi_area >= 0.001:
        print("FATAL: valid-area variation >= 0.1%.", file=sys.stderr)
        return 1

    lo_year = min(values, key=values.__getitem__)
    hi_year = max(values, key=values.__getitem__)
    print(f"cover range: {values[lo_year]:.3f}..{values[hi_year]:.3f} % "
          f"(min {lo_year}, max {hi_year}; endpoints "
          f"{MIN_COVER}..{MAX_COVER})")
    if lo_year != MIN_YEAR or hi_year != MAX_YEAR:
        print("FATAL: min/max years mismatch.", file=sys.stderr)
        return 1
    if not (MIN_COVER <= values[lo_year] and values[hi_year] <= MAX_COVER):
        print("FATAL: values outside mapping endpoints.", file=sys.stderr)
        return 1
    steps = [abs(values[y] - values[y - 1]) for y in want_years[1:]]
    print(f"  max YoY step: {max(steps):.3f} pp "
          f"(2001->2024 change: {values[2001] - values[2024]:.2f} pp)")
    if max(steps) >= MAX_STEP_PP:
        print("FATAL: YoY step outside bound.", file=sys.stderr)
        return 1

    events = []
    for year in want_years:
        value = values[year]
        raw = linear_freq(value)
        note, quantized = quantize(raw)
        events.append({
            "year": year,
            "treeCoverPct": value,
            "anomalyC": value,
            "linearHz": round(raw, 4),
            "note": note,
            "quantizedHz": quantized,
        })
    by_ev = {e["year"]: e for e in events}
    for year, note, raw1 in EVENT_CASES:
        event = by_ev[year]
        assert event["treeCoverPct"] == values[year], (year, "value drift")
        assert event["anomalyC"] == values[year], (year, "mirror drift")
        assert event["note"] == note, (year, event["note"])
        assert abs(event["linearHz"] - raw1) < 0.06, (year, event["linearHz"])
    print("  event spot-checks pass: "
          + ", ".join(f"{y} {n}" for y, n, _ in EVENT_CASES))

    payload = {
        "provenance": {
            "dataset": DATA_CITATION,
            "visual": VISUAL_CITATION,
            "visualCoverage": "Amazon rainforest, northern Brazil, single "
                              "MODIS still, 1 Jul 2002. The visual is "
                              "contextual, not synchronized with the sound.",
            "soundCoverage": "2001-2024 yearly (24 values).",
            "sourceFile": SRC.name,
            "column": "mean_tree_cover_pct (annual mean Percent_Tree_Cover "
                      "in %, full precision as supplied)",
            "referencePeriod": "n/a (raw annual means, no baseline).",
            "sensorCheck": "Single product (MOD44B C6.1), single region, "
                           "single 2000 m analysis scale on every row; no "
                           "quality-bit information supplied with the CSV.",
            "region": "Brazilian Legal Amazon (IBGE 2024 boundary per "
                      "provider; CSV labels the region 'Brazilian Legal "
                      "Amazon').",
            "eventCount": len(events),
            "missingValuePolicy": "No year is missing. Missing years would "
                                  "fail validation, never be interpolated.",
            "generatedBy": "scripts/validate_forest.py",
            "mappingDoc": "docs/forest-mapping.md",
        },
        "mapping": {
            "linearHz": f"clamp(value, {MIN_COVER}, {MAX_COVER}); 220 + "
                        f"(value - {MIN_COVER}) / ({MAX_COVER} - {MIN_COVER}) * 440",
            "quantization": "nearest E-natural-minor note by "
                            "ABS(LOG(raw/note, 2)); ties resolve to the higher "
                            "note; raw frequencies clamp to [E3, B5].",
            "noteMs": 700,
            "pitchSetHz": {name: freq for name, freq in NOTES},
        },
        "events": events,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
                   encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}: {len(events)} events")
    return 0


if __name__ == "__main__":
    sys.exit(main())
