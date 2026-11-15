#!/usr/bin/env python3
"""Terra Sonica track 4: validate Sky data and finalize the Sky JSON.

Reads ``data/india-nightlights-2012-2025.json`` (verified annual mean
nighttime radiance over India, 2012-2025), validates gates (14
contiguous years, exact range, single platform, full tile set,
year-on-year bound), applies the finalized frequency mapping, and
writes ``src/data/nightlights-india.json``.

Fails (exit 1) on any gap, range violation, or failed spot-check.
"""

import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "india-nightlights-2012-2025.json"
OUT = ROOT / "src" / "data" / "nightlights-india.json"

FIRST_YEAR = 2012
LAST_YEAR = 2025
EXPECTED_YEARS = 14
MIN_RADIANCE = 0.4417  # 2013, verified (rounded to 4 decimals)
MAX_RADIANCE = 1.1153  # 2025, verified (rounded to 4 decimals)

DATA_CITATION = ("Annual mean corrected nighttime radiance over India, "
                 "NASA Black Marble VNP46A4 Collection 002, DOI "
                 "10.5067/VIIRS/VNP46A4.002, variable "
                 "NearNadir_Composite_Snow_Free, Suomi NPP only "
                 "(accessed Nov 2026).")
VISUAL_CITATION = ("Asia and Australia at night, Black Marble composite, "
                   "Suomi NPP VIIRS, Apr-Oct 2012. Credit: NASA Earth "
                   "Observatory image by Robert Simmon, using Suomi NPP "
                   "VIIRS data courtesy of Chris Elvidge (NOAA National "
                   "Geophysical Data Center).")

# E-natural-minor pitch set, same as tracks 1-3.
NOTES: list[tuple[str, float]] = [
    ("E3", 164.81), ("F#3", 185.0), ("G3", 196.0), ("A3", 220.0),
    ("B3", 246.94), ("C4", 261.63), ("D4", 293.66), ("E4", 329.63),
    ("F#4", 369.99), ("G4", 392.0), ("A4", 440.0), ("B4", 493.88),
    ("C5", 523.25), ("D5", 587.33), ("E5", 659.25), ("F#5", 739.99),
    ("G5", 783.99), ("A5", 880.0), ("B5", 987.77),
]


def linear_freq(radiance: float) -> float:
    """Finalized track-4 mapping: clamp R to [0.4417, 1.1153], then
    220 + (R - 0.4417) / (1.1153 - 0.4417) * 660 (Hz)."""
    clamped = min(MAX_RADIANCE, max(MIN_RADIANCE, radiance))
    return 220.0 + (clamped - MIN_RADIANCE) / (MAX_RADIANCE - MIN_RADIANCE) * 660.0


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

# (radiance, expected raw Hz): pins for the finalized linear mapping,
# including the count clamp endpoints.
LINEAR_CASES: list[tuple[float, float]] = [
    (0.4417, 220.0),
    (1.1153, 880.0),
    (0.0, 220.0),  # below MIN_RADIANCE clamps to 220 Hz
    (5.0, 880.0),  # above MAX_RADIANCE clamps to 880 Hz
]

# (year, radiance, raw Hz, note): end-to-end pins on built events.
# Mid values verified by independent recomputation (nearest-3 distances).
EVENT_CASES: list[tuple[int, float, float, str]] = [
    (2013, 0.4417, 220.0, "A3"),
    (2021, 0.6774, 450.9412, "A4"),
    (2024, 1.0258, 792.307, "G5"),
    (2025, 1.1153, 880.0, "A5"),
]


def run_self_tests() -> None:
    """Durable regression pins for the finalized track-4 mapping."""
    d_lo = abs(math.log2(TIE_RAW_E4_F4 / 329.63))
    d_hi = abs(math.log2(369.99 / TIE_RAW_E4_F4))
    assert d_lo == d_hi, "tie premise broken: midpoint distances differ"
    for raw, want in QUANTIZE_CASES:
        got = quantize(raw)[0]
        assert got == want, f"quantize({raw}) = {got}, want {want}"
    for radiance, want in LINEAR_CASES:
        got = linear_freq(radiance)
        assert abs(got - want) < 1e-9, f"linear({radiance}) = {got}, want {want}"


def main() -> int:
    print("== mapping self-tests ==")
    try:
        run_self_tests()
    except AssertionError as err:
        print(f"FATAL: {err}", file=sys.stderr)
        return 1
    print(f"  {len(QUANTIZE_CASES) + len(LINEAR_CASES)}/"
          f"{len(QUANTIZE_CASES) + len(LINEAR_CASES)} cases pass")

    doc = json.loads(SRC.read_text(encoding="utf-8"))
    values = doc["values"]
    years = [v["year"] for v in values]
    want_years = list(range(FIRST_YEAR, LAST_YEAR + 1))
    assert len(want_years) == EXPECTED_YEARS, len(want_years)
    if years != want_years:
        print(f"FATAL: years {years}, want {want_years}.",
              file=sys.stderr)
        return 1
    print(f"window: {len(values)} contiguous years, "
          f"{FIRST_YEAR} through {LAST_YEAR}, no gaps")

    by_year = {v["year"]: v for v in values}
    for year in want_years:
        entry = by_year[year]
        if entry["nTiles"] != 11:
            print(f"FATAL: {year} has {entry['nTiles']} tiles.",
                  file=sys.stderr)
            return 1
        if set(entry["platformMix"]) != {"0"}:
            print(f"FATAL: {year} platforms {entry['platformMix']}.",
                  file=sys.stderr)
            return 1
        if not 16_000_000 <= entry["nPixels"] <= 16_100_000:
            print(f"FATAL: {year} nPixels {entry['nPixels']}.",
                  file=sys.stderr)
            return 1
    print("  all years: 11 tiles, platform 0 only, pixel counts in band")

    rounded = {y: round(by_year[y]["meanRadiance"], 4) for y in want_years}
    lo, hi = min(rounded.values()), max(rounded.values())
    print(f"radiance range: {lo}..{hi} (verified "
          f"{MIN_RADIANCE}..{MAX_RADIANCE})")
    if lo != MIN_RADIANCE or hi != MAX_RADIANCE:
        print("FATAL: range mismatch; refusing to finalize.", file=sys.stderr)
        return 1
    means = [rounded[y] for y in want_years]
    ratios = [b / a for a, b in zip(means, means[1:])]
    print(f"  max YoY ratio: {max(ratios):.3f}")
    if max(ratios) >= 1.5 or min(ratios) <= 0.5:
        print("FATAL: YoY jump outside [0.5, 1.5).", file=sys.stderr)
        return 1

    events = []
    for year in want_years:
        radiance = rounded[year]
        raw = linear_freq(radiance)
        note, quantized = quantize(raw)
        events.append({
            "year": year,
            "radianceC": radiance,
            "anomalyC": radiance,
            "linearHz": round(raw, 4),
            "note": note,
            "quantizedHz": quantized,
        })
    by_ev = {e["year"]: e for e in events}
    for year, radiance, raw, note in EVENT_CASES:
        event = by_ev[year]
        assert event["radianceC"] == radiance, (year, event["radianceC"])
        assert event["anomalyC"] == radiance, (year, event["anomalyC"])
        assert abs(event["linearHz"] - raw) < 1e-9, (year, event["linearHz"])
        assert event["note"] == note, (year, event["note"])
    print("  event spot-checks pass: "
          + ", ".join(f"{y} {n}" for y, _, _, n in EVENT_CASES))

    payload = {
        "provenance": {
            "dataset": DATA_CITATION,
            "visual": VISUAL_CITATION,
            "visualCoverage": "Asia and Australia at night, single Black "
                              "Marble composite, Apr-Oct 2012. The visual is "
                              "contextual, not synchronized with the sound.",
            "soundCoverage": "2012-2025 yearly (14 values).",
            "sourceFile": SRC.name,
            "column": "meanRadiance (annual mean nW/(cm^2 sr), rounded to "
                      "4 decimals for events)",
            "referencePeriod": "n/a (raw annual means, no baseline).",
            "sensorCheck": "DNB platform code 0 (Suomi-NPP) on every kept "
                           "pixel in all 14 years; single sensor, single "
                           "collection, no inter-calibration.",
            "region": "India, GADM 4.1 level-0 dissolved polygon.",
            "eventCount": len(events),
            "missingValuePolicy": "No year is missing. Missing years would "
                                  "fail validation, never be interpolated.",
            "generatedBy": "scripts/validate_sky.py",
            "mappingDoc": "docs/sky-mapping.md",
        },
        "mapping": {
            "linearHz": f"clamp(R, {MIN_RADIANCE}, {MAX_RADIANCE}); 220 + "
                        f"(R - {MIN_RADIANCE}) / ({MAX_RADIANCE} - {MIN_RADIANCE}) * 660",
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
