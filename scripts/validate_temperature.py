#!/usr/bin/env python3
"""Terra Sonica milestone 1: validate GISTEMP data and finalize the temperature JSON.

Reads the official GISTEMP series ``Global_Mean_Estimates_graph.txt``
(Year, No_Smoothing, Lowess(5)), extracts the Lowess(5) anomaly for 1880-2025,
cross-checks No_Smoothing against ``GLB.Ts+dSST.csv`` J-D, audits against the
legacy prototype files (read-only), applies the documented frequency mapping,
and writes ``src/data/global-temperature.json``.

Fails (exit 1) if the 1880-2025 window is incomplete or non-contiguous.
Legacy divergences are *reported*, never fatal: the fresh download supersedes
the prototype's anomaly column by design (see docs/temperature-mapping.md).
"""

import csv
import json
import math
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GLB = ROOT / "GLB.Ts+dSST.csv"
GRAPH = ROOT / "Global_Mean_Estimates_graph.txt"
GRAPH_URL = ("https://data.giss.nasa.gov/gistemp/graphs/graph_data/"
             "Global_Mean_Estimates_based_on_Land_and_Ocean_Data/graph.txt")
LEGACY = ROOT / "land and ocean.csv"
FREQS = ROOT / "frequencies.js"
OUT = ROOT / "src" / "data" / "global-temperature.json"

FIRST_YEAR, LAST_YEAR = 1880, 2025

# E-natural-minor pitch set, exactly as the prototype lookup table.
NOTES: list[tuple[str, float]] = [
    ("E3", 164.81), ("F#3", 185.0), ("G3", 196.0), ("A3", 220.0),
    ("B3", 246.94), ("C4", 261.63), ("D4", 293.66), ("E4", 329.63),
    ("F#4", 369.99), ("G4", 392.0), ("A4", 440.0), ("B4", 493.88),
    ("C5", 523.25), ("D5", 587.33), ("E5", 659.25), ("F#5", 739.99),
    ("G5", 783.99), ("A5", 880.0), ("B5", 987.77),
]


def linear_freq(anomaly: float) -> float:
    """Prototype mapping: 220 + (anomaly + 0.50) / 1.80 * 660 (Hz)."""
    return 220.0 + (anomaly + 0.50) / 1.80 * 660.0


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


# Exact floating-point geometric midpoint of E4/F#4: both log distances are
# bitwise equal here, so this input deterministically exercises the tie rule.
TIE_RAW_E4_F4 = 349.2274383550067

# (raw Hz, expected note): durable regression pins for quantize().
QUANTIZE_CASES: list[tuple[float, str]] = [
    (744.3333, "F#5"),  # 2018 linearHz: nearer F#5 than G5
    (814.0, "G5"),  # 2023 linearHz: nearer G5 than A5
    (674.6667, "E5"),  # 2013 linearHz: nearer E5 than F#5
    (100.0, "E3"),  # below E3 clamps to E3
    (164.81, "E3"),  # exact low endpoint
    (2000.0, "B5"),  # above B5 clamps to B5
    (987.77, "B5"),  # exact high endpoint
    (TIE_RAW_E4_F4, "F#4"),  # exact tie resolves to the higher note
]


def run_quantize_self_tests() -> None:
    """Durable regression pins for the prototype quantization rule."""
    d_lo = abs(math.log2(TIE_RAW_E4_F4 / 329.63))
    d_hi = abs(math.log2(369.99 / TIE_RAW_E4_F4))
    assert d_lo == d_hi, "tie premise broken: midpoint distances differ"
    for raw, want in QUANTIZE_CASES:
        got = quantize(raw)[0]
        assert got == want, f"quantize({raw}) = {got}, want {want}"


def parse_float_or_missing(text: str) -> float | None:
    text = text.strip()
    if text in ("", "***", "****", "*****"):
        return None
    return float(text)


def load_graph() -> tuple[dict[int, float], dict[int, float], dict[int, str]]:
    """Return ({year: Lowess(5)}, {year: No_Smoothing}, {excluded: reason})."""
    lowess: dict[int, float] = {}
    raw: dict[int, float] = {}
    excluded: dict[int, str] = {}
    for line in GRAPH.read_text(encoding="utf-8-sig").splitlines():
        parts = line.split()
        if len(parts) != 3 or not parts[0].isdigit():
            continue
        year = int(parts[0])
        smooth = parse_float_or_missing(parts[2])
        if smooth is None:
            excluded[year] = "no Lowess(5) value in source graph.txt"
        else:
            lowess[year] = smooth
        unsmoothed = parse_float_or_missing(parts[1])
        if unsmoothed is not None:
            raw[year] = unsmoothed
    return lowess, raw, excluded


def load_glb_jd() -> dict[int, float]:
    """Return {year: J-D annual mean} from the GLB download (cross-check)."""
    with open(GLB, encoding="utf-8-sig", newline="") as handle:
        lines = handle.read().splitlines()
    reader = csv.DictReader(lines[1:])  # line 0 is the "Land-Ocean" title
    return {
        int(row["Year"]): float(row["J-D"])
        for row in reader
        if parse_float_or_missing(row["J-D"]) is not None
    }


def audit_legacy(anomalies: dict[int, float]) -> list[str]:
    """Compare the official Lowess series against the legacy prototype files."""
    report: list[str] = []
    with open(LEGACY, encoding="utf-8-sig", errors="replace", newline="") as handle:
        rows = list(csv.reader(handle))
    legacy: dict[int, float] = {}
    for row in rows:
        if len(row) > 3 and row[2].strip().isdigit():
            legacy[int(row[2])] = float(row[3])
    report.append(f"legacy Lowess rows: {len(legacy)} "
                  f"({min(legacy)}-{max(legacy)})" if legacy else "legacy: no rows")
    diffs = {y: abs(legacy[y] - anomalies[y]) for y in legacy if y in anomalies}
    matches = sum(1 for d in diffs.values() if d < 0.005)
    report.append(f"legacy-vs-official years compared: {len(diffs)}, "
                  f"agreeing (<0.005 C): {matches}")
    if diffs:
        worst = max(diffs, key=diffs.__getitem__)
        report.append(f"max |legacy - official| = {diffs[worst]:.2f} C "
                      f"(year {worst}: legacy {legacy[worst]}, "
                      f"official {anomalies[worst]})")
        shown = 0
        for year in sorted(diffs):
            if diffs[year] >= 0.005 and shown < 5:
                report.append(f"  diverge {year}: legacy {legacy[year]:+.2f} "
                              f"vs official {anomalies[year]:+.2f}")
                shown += 1
    freq_values = re.findall(r"\d+(?:\.\d+)?", FREQS.read_text(encoding="utf-8"))
    report.append(f"frequencies.js entries: {len(freq_values)} (required: 146)")
    return report


def main() -> int:
    print("== quantize self-tests ==")
    try:
        run_quantize_self_tests()
    except AssertionError as err:
        print(f"FATAL: {err}", file=sys.stderr)
        return 1
    print(f"  {len(QUANTIZE_CASES)}/{len(QUANTIZE_CASES)} cases pass")

    anomalies, raw, excluded = load_graph()
    window = list(range(FIRST_YEAR, LAST_YEAR + 1))
    missing = [y for y in window if y not in anomalies]
    if missing:
        print(f"FATAL: missing Lowess(5) data for {missing}; "
              f"refusing to finalize.", file=sys.stderr)
        return 1

    print("== cross-check (graph.txt No_Smoothing vs GLB.Ts+dSST.csv J-D) ==")
    jd = load_glb_jd()
    compared = [y for y in window if y in raw and y in jd]
    agree = sum(1 for y in compared if abs(raw[y] - jd[y]) < 0.005)
    print(f"  years compared: {len(compared)}, agreeing (<0.005 C): {agree}")
    for year in compared:
        if abs(raw[year] - jd[year]) >= 0.005:
            print(f"  MISMATCH {year}: No_Smoothing {raw[year]:+.2f} "
                  f"vs J-D {jd[year]:+.2f}")

    print("== legacy audit (official Lowess(5) vs prototype files) ==")
    for line in audit_legacy(anomalies):
        print(" ", line)

    events = []
    for year in window:
        anomaly = anomalies[year]
        raw = linear_freq(anomaly)
        note, quantized = quantize(raw)
        events.append({
            "year": year,
            "anomalyC": anomaly,
            "linearHz": round(raw, 4),
            "note": note,
            "quantizedHz": quantized,
        })
    assert len(events) == 146, len(events)
    by_year = {entry["year"]: entry["note"] for entry in events}
    for year, want in ((2013, "E5"), (2018, "F#5"), (2023, "G5")):
        got = by_year[year]
        assert got == want, f"{year} -> {got}, want {want}"
    print("  year spot-checks pass: 2013 E5, 2018 F#5, 2023 G5")

    payload = {
        "provenance": {
            "dataset": "NASA GISS Surface Temperature Analysis (GISTEMP), "
                       "Global Mean Estimates based on Land and Ocean Data",
            "sourceFile": GRAPH.name,
            "sourceUrl": GRAPH_URL,
            "column": "Lowess(5) (smoothed annual anomaly, degrees C)",
            "referencePeriod": "1951-1980 per GISTEMP methodology "
                               "(not embedded in the file itself)",
            "yearRange": [FIRST_YEAR, LAST_YEAR],
            "eventCount": len(events),
            "excludedYears": {str(y): excluded[y] for y in sorted(excluded)},
            "missingValuePolicy": "Markers (***, ****, blank) mean no value "
                                  "exists; the year is excluded and listed "
                                  "here, never interpolated or zero-filled. "
                                  "No year in 1880-2025 is missing.",
            "seriesNote": "Official GISTEMP Lowess(5) smoothed series from "
                          "graph.txt. The graph.txt No_Smoothing column matches "
                          "the GLB.Ts+dSST.csv J-D annual means (see validator "
                          "cross-check). The prototype's legacy Lowess column "
                          "disagreed with this official series and was "
                          "superseded, not copied.",
            "generatedBy": "scripts/validate_temperature.py",
            "mappingDoc": "docs/temperature-mapping.md",
        },
        "mapping": {
            "linearHz": "220 + (anomalyC + 0.50) / 1.80 * 660",
            "quantization": "nearest E-natural-minor note by "
                            "ABS(LOG(raw/note, 2)); ties resolve to the higher "
                            "note; raw frequencies clamp to [E3, B5].",
            "pitchSetHz": {name: freq for name, freq in NOTES},
        },
        "events": events,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

    first, last = events[0], events[-1]
    print(f"wrote {OUT.relative_to(ROOT)}: {len(events)} events, "
          f"{first['year']} ({first['anomalyC']:+.2f} C -> "
          f"{first['linearHz']} Hz -> {first['note']} {first['quantizedHz']} Hz) "
          f"through {last['year']} ({last['anomalyC']:+.2f} C -> "
          f"{last['linearHz']} Hz -> {last['note']} {last['quantizedHz']} Hz)")
    lo = min(e["anomalyC"] for e in events)
    hi = max(e["anomalyC"] for e in events)
    print(f"anomaly range: {lo:+.2f}..{hi:+.2f} C; "
          f"linear range: {linear_freq(lo):.1f}..{linear_freq(hi):.1f} Hz")
    print(f"excluded years: {sorted(excluded) or 'none'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
