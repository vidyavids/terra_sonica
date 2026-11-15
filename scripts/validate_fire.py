#!/usr/bin/env python3
"""Terra Sonica track 3: validate Fire data and finalize the Fire JSON.

Reads ``data/fire-brazil-monthly-2020-2025.csv`` (verified FIRMS MODIS
monthly detection counts for Brazil, Jan 2020-Dec 2025) plus the fetch
log, validates gates (72 contiguous months, exact range, full day
coverage, MODIS-only with both satellites every month), merges the
verified monthly mean FRP layer, applies the finalized frequency
mapping, and writes ``src/data/fire-amazon.json``.

Fails (exit 1) on any gap, range violation, or failed spot-check.
"""

import csv
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSV = ROOT / "data" / "fire-brazil-monthly-2020-2025.csv"
LOG = ROOT / "data" / "fire-brazil-fetch-log.json"
FRP_CSV = ROOT / "data" / "fire-brazil-frp-monthly-2020-2025.csv"
FRP_LOG = ROOT / "data" / "fire-brazil-frp-fetch-log.json"
OUT = ROOT / "src" / "data" / "fire-amazon.json"

FIRST = (2020, 1)
LAST = (2025, 12)
EXPECTED_MONTHS = 72
MIN_COUNT = 2914  # Apr 2025, verified
MAX_COUNT = 164682  # Sep 2024, verified
FRP_MIN = 21.6736  # Mar 2023, verified (rounded to 4 decimals)
FRP_MAX = 63.2162  # Aug 2024, verified (rounded to 4 decimals)

DATA_CITATION = ("Monthly counts of MODIS active-fire detections over "
                 "Brazil, NASA FIRMS API (product MODIS_SP, area query), "
                 "masked to the GADM 4.1 Brazil level-0 boundary "
                 "(accessed Nov 2026). Counts are detection observations, "
                 "not unique wildfires or area burned.")
VISUAL_CITATION = ("Fires in Greece, MODIS on Aqua, 22 Aug 2009. Credit: "
                   "NASA Earth Observatory image by Jeff Schmaltz, MODIS "
                   "Rapid Response Team, NASA GSFC.")

# E-natural-minor pitch set, same as tracks 1-2.
NOTES: list[tuple[str, float]] = [
    ("E3", 164.81), ("F#3", 185.0), ("G3", 196.0), ("A3", 220.0),
    ("B3", 246.94), ("C4", 261.63), ("D4", 293.66), ("E4", 329.63),
    ("F#4", 369.99), ("G4", 392.0), ("A4", 440.0), ("B4", 493.88),
    ("C5", 523.25), ("D5", 587.33), ("E5", 659.25), ("F#5", 739.99),
    ("G5", 783.99), ("A5", 880.0), ("B5", 987.77),
]

MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
               "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def linear_freq(count: float) -> float:
    """Finalized track-3 mapping: clamp C to [2914, 164682], then
    220 + (C - 2914) / (164682 - 2914) * 660 (Hz)."""
    clamped = min(MAX_COUNT, max(MIN_COUNT, count))
    return 220.0 + (clamped - MIN_COUNT) / (MAX_COUNT - MIN_COUNT) * 660.0


def drone_gain(frp: float) -> float:
    """FRP drone gain: 0.03 + 0.09 * (FRP - lo) / (hi - lo), well under
    the 0.3 main-note peak at every month."""
    clamped = min(FRP_MAX, max(FRP_MIN, frp))
    return 0.03 + 0.09 * (clamped - FRP_MIN) / (FRP_MAX - FRP_MIN)


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

# (count, expected raw Hz): pins for the finalized linear mapping,
# including the count clamp endpoints.
LINEAR_CASES: list[tuple[float, float]] = [
    (2914, 220.0),
    (164682, 880.0),
    (0, 220.0),  # below MIN_COUNT clamps to 220 Hz
    (999999, 880.0),  # above MAX_COUNT clamps to 880 Hz
]

# (frp, expected drone gain): pins for the FRP drone mapping.
DRONE_CASES: list[tuple[float, float]] = [
    (21.6736, 0.03),
    (63.2162, 0.12),
    (0.0, 0.03),  # below FRP_MIN clamps to 0.03
    (999.0, 0.12),  # above FRP_MAX clamps to 0.12
]

# ((year, month), count, raw Hz, note): end-to-end pins on built events.
# Mid values verified by independent recomputation (nearest-3 distances).
EVENT_CASES: list[tuple[tuple[int, int], int, float, str]] = [
    ((2025, 4), 2914, 220.0, "A3"),
    ((2024, 9), 164682, 880.0, "A5"),
    ((2020, 1), 6172, 233.2924, "B3"),
    ((2020, 9), 138598, 773.5794, "G5"),
]

# ((year, month), meanFRP, drone gain): pins on the merged FRP layer.
FRP_EVENT_CASES: list[tuple[tuple[int, int], float, float]] = [
    ((2023, 3), 21.6736, 0.03),
    ((2024, 8), 63.2162, 0.12),
]


def run_self_tests() -> None:
    """Durable regression pins for the finalized track-3 mapping."""
    d_lo = abs(math.log2(TIE_RAW_E4_F4 / 329.63))
    d_hi = abs(math.log2(369.99 / TIE_RAW_E4_F4))
    assert d_lo == d_hi, "tie premise broken: midpoint distances differ"
    for raw, want in QUANTIZE_CASES:
        got = quantize(raw)[0]
        assert got == want, f"quantize({raw}) = {got}, want {want}"
    for count, want in LINEAR_CASES:
        got = linear_freq(count)
        assert abs(got - want) < 1e-9, f"linear({count}) = {got}, want {want}"
    for frp, want in DRONE_CASES:
        got = drone_gain(frp)
        assert abs(got - want) < 1e-9, f"drone({frp}) = {got}, want {want}"


def month_range():
    """Yield (year, month) tuples from FIRST through LAST inclusive."""
    year, month = FIRST
    while (year, month) <= LAST:
        yield year, month
        month += 1
        if month > 12:
            year, month = year + 1, 1


def month_length(year: int, month: int) -> int:
    if month == 12:
        nxt = (year + 1, 1)
    else:
        nxt = (year, month + 1)
    import datetime
    return (datetime.date(*nxt, 1) - datetime.date(year, month, 1)).days


def main() -> int:
    print("== mapping self-tests ==")
    try:
        run_self_tests()
    except AssertionError as err:
        print(f"FATAL: {err}", file=sys.stderr)
        return 1
    total = len(QUANTIZE_CASES) + len(LINEAR_CASES) + len(DRONE_CASES)
    print(f"  {total}/{total} cases pass")

    with open(CSV, encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))
    window = list(month_range())
    assert len(window) == EXPECTED_MONTHS, len(window)
    if len(rows) != EXPECTED_MONTHS:
        print(f"FATAL: CSV has {len(rows)} rows, want {EXPECTED_MONTHS}.",
              file=sys.stderr)
        return 1
    counts: dict[tuple[int, int], int] = {}
    for row, ym in zip(rows, window):
        if (int(row["year"]), int(row["month"])) != ym:
            print(f"FATAL: CSV row out of order: {row}, want {ym}.",
                  file=sys.stderr)
            return 1
        counts[ym] = int(row["count"])
    print(f"window: {len(window)} contiguous months, "
          f"{FIRST[0]}-{FIRST[1]:02d} through {LAST[0]}-{LAST[1]:02d}, no gaps")

    lo, hi = min(counts.values()), max(counts.values())
    print(f"count range: {lo}..{hi} (verified {MIN_COUNT}..{MAX_COUNT})")
    if lo != MIN_COUNT or hi != MAX_COUNT:
        print("FATAL: range mismatch; refusing to finalize.", file=sys.stderr)
        return 1

    log = json.loads(LOG.read_text(encoding="utf-8"))
    if log["params"].get("product") != "MODIS_SP":
        print(f"FATAL: product is {log['params'].get('product')}, want MODIS_SP.",
              file=sys.stderr)
        return 1
    for ym in window:
        tag = f"{ym[0]}-{ym[1]:02d}"
        entry = log["months"][tag]
        if entry["instruments"] != ["MODIS"]:
            print(f"FATAL: {tag} instruments {entry['instruments']}.",
                  file=sys.stderr)
            return 1
        if set(entry["satellites"]) != {"Aqua", "Terra"}:
            print(f"FATAL: {tag} satellites {entry['satellites']}.",
                  file=sys.stderr)
            return 1
        if entry["days_covered"] != month_length(*ym):
            print(f"FATAL: {tag} covers {entry['days_covered']} days.",
                  file=sys.stderr)
            return 1
        if entry["kept"] != counts[ym]:
            print(f"FATAL: {tag} log/CSV count mismatch.", file=sys.stderr)
            return 1
    print("  fetch log: MODIS-only, Terra+Aqua, full day coverage, "
          "log/CSV agree, all 72 months")

    with open(FRP_CSV, encoding="utf-8", newline="") as handle:
        frp_rows = list(csv.DictReader(handle))
    if len(frp_rows) != EXPECTED_MONTHS:
        print(f"FATAL: FRP CSV has {len(frp_rows)} rows, want 72.",
              file=sys.stderr)
        return 1
    frp: dict[tuple[int, int], float] = {}
    for frp_row, ym in zip(frp_rows, window):
        if (int(frp_row["year"]), int(frp_row["month"])) != ym:
            print(f"FATAL: FRP CSV row out of order: {frp_row}.",
                  file=sys.stderr)
            return 1
        if int(frp_row["nDetections"]) != counts[ym]:
            print(f"FATAL: {ym} FRP n != counts n.", file=sys.stderr)
            return 1
        frp[ym] = round(float(frp_row["meanFRP_MW"]), 4)
    flo, fhi = min(frp.values()), max(frp.values())
    print(f"FRP range: {flo}..{fhi} MW (verified {FRP_MIN}..{FRP_MAX})")
    if flo != FRP_MIN or fhi != FRP_MAX:
        print("FATAL: FRP range mismatch.", file=sys.stderr)
        return 1
    frp_log = json.loads(FRP_LOG.read_text(encoding="utf-8"))
    frp_access = frp_log.get("access_date", "unknown")

    events = []
    for ym in window:
        count = counts[ym]
        raw = linear_freq(count)
        note, quantized = quantize(raw)
        frp_mean = frp[ym]
        events.append({
            "year": ym[0],
            "month": ym[1],
            "label": f"{MONTH_NAMES[ym[1] - 1]} {ym[0]}",
            "count": count,
            "anomalyC": count,
            "linearHz": round(raw, 4),
            "note": note,
            "quantizedHz": quantized,
            "meanFRP_MW": frp_mean,
            "droneGain": round(drone_gain(frp_mean), 4),
        })
    by_ym = {(e["year"], e["month"]): e for e in events}
    for ym, count, raw, note in EVENT_CASES:
        event = by_ym[ym]
        assert event["count"] == count, (ym, event["count"])
        assert event["anomalyC"] == count, (ym, event["anomalyC"])
        assert abs(event["linearHz"] - raw) < 1e-9, (ym, event["linearHz"])
        assert event["note"] == note, (ym, event["note"])
    for ym, frp_mean, gain in FRP_EVENT_CASES:
        event = by_ym[ym]
        assert event["meanFRP_MW"] == frp_mean, (ym, event["meanFRP_MW"])
        assert abs(event["droneGain"] - gain) < 1e-9, (ym, event["droneGain"])
    print("  event spot-checks pass: "
          + ", ".join(f"{ym[0]}-{ym[1]:02d} {note}"
                      for ym, _, _, note in EVENT_CASES))

    payload = {
        "provenance": {
            "dataset": DATA_CITATION,
            "visual": VISUAL_CITATION,
            "visualCoverage": "Fires in Greece, Aug 2009 (single MODIS "
                              "still). The visual is contextual, not "
                              "synchronized with the sound.",
            "soundCoverage": "Jan 2020-Dec 2025 monthly (72 months).",
            "sourceFile": CSV.name,
            "fetchLog": LOG.name,
            "frpSource": "Same FIRMS MODIS_SP detections; monthly mean FRP "
                         f"(MW), accessed {frp_access}.",
            "column": "count (monthly MODIS active-fire detections, integer)",
            "referencePeriod": "n/a (raw detection counts, no baseline).",
            "satelliteCheck": "Terra and Aqua both present in all 72 "
                              "months; no sensor dropout.",
            "region": "Brazil, GADM 4.1 level-0 dissolved polygon "
                      "(bbox approx -74,-34,-28,6).",
            "eventCount": len(events),
            "missingValuePolicy": "No month is missing. Missing months "
                                  "would fail validation, never be "
                                  "interpolated or zero-filled.",
            "generatedBy": "scripts/validate_fire.py",
            "mappingDoc": "docs/fire-mapping.md",
        },
        "mapping": {
            "linearHz": f"clamp(C, {MIN_COUNT}, {MAX_COUNT}); 220 + "
                        f"(C - {MIN_COUNT}) / ({MAX_COUNT} - {MIN_COUNT}) * 660",
            "quantization": "nearest E-natural-minor note by "
                            "ABS(LOG(raw/note, 2)); ties resolve to the higher "
                            "note; raw frequencies clamp to [E3, B5].",
            "droneGain": f"0.03 + 0.09 * (FRP - {FRP_MIN}) / "
                         f"({FRP_MAX} - {FRP_MIN}); fixed E3 drone.",
            "noteMs": 500,
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
