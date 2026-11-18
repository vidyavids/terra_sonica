#!/usr/bin/env python3
"""Terra Sonica track 2: validate Nino 3.4 data and finalize the El Nino JSON.

Reads ``ONI_NINO34_v6.txt`` (McNoldy/NOAA ERSSTv6 monthly Nino 3.4 series),
extracts NINO34_ANOM for Jan 2020 - Aug 2026 (80 months), writes the named
artifact ``nino34-monthly-2020-2026.csv``, validates it (contiguity, range,
spot-checks), applies the finalized frequency mapping, and writes
``src/data/nino34.json``.

Fails (exit 1) on any gap, range violation, or failed spot-check.
"""

import csv
import hashlib
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ONI = ROOT / "ONI_NINO34_v6.txt"
CSV = ROOT / "nino34-monthly-2020-2026.csv"
OUT = ROOT / "src" / "data" / "nino34.json"

FIRST = (2020, 1)
LAST = (2026, 8)
EXPECTED_MONTHS = 80
MISSING = -99.99

DATA_CITATION = ("Niño 3.4 monthly SST anomalies, NOAA ERSSTv6, via McNoldy, B. "
                 "(University of Miami), ONI_NINO34_v6.txt, "
                 "https://bmcnoldy.earth.miami.edu/tropics/oni/ONI_NINO34_v6.txt "
                 "(accessed Nov 2026). Underlying dataset: NOAA PSL, "
                 "https://psl.noaa.gov/data/gridded/data.noaa.ersst.v6.html. "
                 "Region 5°S–5°N, 170°W–120°W; anomalies vs 30-year climatology, "
                 "updated every 5 years.")
VISUAL_CITATION = ("NASA Scientific Visualization Studio, 'Signs of El Niño "
                   "in 2026' (SVS 5683), https://svs.gsfc.nasa.gov/5683/.")

# E-natural-minor pitch set, same as track 1.
NOTES: list[tuple[str, float]] = [
    ("E3", 164.81), ("F#3", 185.0), ("G3", 196.0), ("A3", 220.0),
    ("B3", 246.94), ("C4", 261.63), ("D4", 293.66), ("E4", 329.63),
    ("F#4", 369.99), ("G4", 392.0), ("A4", 440.0), ("B4", 493.88),
    ("C5", 523.25), ("D5", 587.33), ("E5", 659.25), ("F#5", 739.99),
    ("G5", 783.99), ("A5", 880.0), ("B5", 987.77),
]

MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
               "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def linear_freq(anomaly: float) -> float:
    """Finalized track-2 mapping: clamp A to [-1.5, +2.5], then
    220 + (A + 1.5) / 4.0 * 660 (Hz)."""
    clamped = min(2.5, max(-1.5, anomaly))
    return 220.0 + (clamped + 1.5) / 4.0 * 660.0


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
    (312.4, "E4"),  # Feb 2021 linearHz: nearer E4 than D4
    (624.25, "E5"),  # Jul 2023 linearHz: nearer E5 than D5
    (825.55, "G5"),  # Aug 2026 linearHz: nearer G5 than A5
    (100.0, "E3"),  # below E3 clamps to E3
    (2000.0, "B5"),  # above B5 clamps to B5
    (TIE_RAW_E4_F4, "F#4"),  # exact tie resolves to the higher note
]

# (anomaly, expected raw Hz): pins for the finalized linear mapping,
# including the anomaly clamp endpoints.
LINEAR_CASES: list[tuple[float, float]] = [
    (-0.94, 312.4),
    (0.95, 624.25),
    (2.17, 825.55),
    (-2.0, 220.0),  # below -1.5 clamps to 220 Hz
    (3.0, 880.0),  # above +2.5 clamps to 880 Hz
]

# ((year, month), anomaly, raw Hz, note): end-to-end pins on built events.
EVENT_CASES: list[tuple[tuple[int, int], float, float, str]] = [
    ((2021, 2), -0.94, 312.4, "E4"),
    ((2023, 7), 0.95, 624.25, "E5"),
    ((2026, 8), 2.17, 825.55, "G5"),
]


def change_gain(change: float | None, lo: float, hi: float) -> float:
    """Change-voice gain: Jan 2020 (no previous month) is silent; otherwise
    0.02 + 0.08 * (change - lo) / (hi - lo), well under the 0.3 main peak."""
    if change is None:
        return 0.0
    return 0.02 + 0.08 * (change - lo) / (hi - lo)


# ((year, month), expected MoM change in C): pins for the derived series.
CHANGE_CASES: list[tuple[tuple[int, int], float]] = [
    ((2020, 5), -0.64),  # min MoM change
    ((2026, 6), 0.53),  # max MoM change
    ((2023, 7), 0.16),
]


def run_self_tests() -> None:
    """Durable regression pins for the finalized track-2 mapping."""
    d_lo = abs(math.log2(TIE_RAW_E4_F4 / 329.63))
    d_hi = abs(math.log2(369.99 / TIE_RAW_E4_F4))
    assert d_lo == d_hi, "tie premise broken: midpoint distances differ"
    for raw, want in QUANTIZE_CASES:
        got = quantize(raw)[0]
        assert got == want, f"quantize({raw}) = {got}, want {want}"
    for anomaly, want in LINEAR_CASES:
        got = linear_freq(anomaly)
        assert abs(got - want) < 1e-9, f"linear({anomaly}) = {got}, want {want}"
    assert change_gain(None, -1.0, 1.0) == 0.0, "Jan 2020 must be silent"
    assert change_gain(1.0, 0.0, 1.0) == 0.10, "max change gain must be 0.10"
    assert change_gain(0.0, 0.0, 1.0) == 0.02, "min change gain must be 0.02"


def month_range():
    """Yield (year, month) tuples from FIRST through LAST inclusive."""
    year, month = FIRST
    while (year, month) <= LAST:
        yield year, month
        month += 1
        if month > 12:
            year, month = year + 1, 1


def load_oni() -> dict[tuple[int, int], dict[str, float]]:
    """Return {(year, month): {mean, clim, anom}} for rows with real data."""
    rows: dict[tuple[int, int], dict[str, float]] = {}
    text = ONI.read_text(encoding="latin-1")
    for line in text.splitlines():
        parts = line.split()
        if len(parts) < 6 or not parts[0].isdigit():
            continue
        key = (int(parts[0]), int(parts[1]))
        mean, clim, anom = float(parts[2]), float(parts[3]), float(parts[4])
        if anom == MISSING:
            continue
        rows[key] = {"mean": mean, "clim": clim, "anom": anom}
    return rows


def main() -> int:
    print("== mapping self-tests ==")
    try:
        run_self_tests()
    except AssertionError as err:
        print(f"FATAL: {err}", file=sys.stderr)
        return 1
    print(f"  {len(QUANTIZE_CASES) + len(LINEAR_CASES)}/"
          f"{len(QUANTIZE_CASES) + len(LINEAR_CASES)} cases pass")

    rows = load_oni()
    window = list(month_range())
    assert len(window) == EXPECTED_MONTHS, len(window)
    missing = [ym for ym in window if ym not in rows]
    if missing:
        print(f"FATAL: missing NINO34_ANOM for {missing}; refusing to finalize.",
              file=sys.stderr)
        return 1
    print(f"window: {len(window)} contiguous months, "
          f"{FIRST[0]}-{FIRST[1]:02d} through {LAST[0]}-{LAST[1]:02d}, no gaps")

    anomalies = [rows[ym]["anom"] for ym in window]
    lo, hi = min(anomalies), max(anomalies)
    print(f"anomaly range: {lo:+.2f}..{hi:+.2f} C "
          f"(expected -1.13..+2.17 C)")
    if round(lo, 2) != -1.13 or round(hi, 2) != 2.17:
        print("FATAL: range mismatch; refusing to finalize.", file=sys.stderr)
        return 1
    lo_ym = window[anomalies.index(lo)]
    hi_ym = window[anomalies.index(hi)]
    print(f"  min {lo:+.2f} at {lo_ym[0]}-{lo_ym[1]:02d}, "
          f"max {hi:+.2f} at {hi_ym[0]}-{hi_ym[1]:02d}")

    by_cal_month: dict[int, set[float]] = {}
    for ym in window:
        by_cal_month.setdefault(ym[1], set()).add(rows[ym]["clim"])
    drifting = {m: s for m, s in by_cal_month.items() if len(s) > 1}
    if drifting:
        clim_note = ("NINO34_CLIM varies within calendar months across the "
                     f"window ({len(drifting)} months affected): base-period "
                     "update inside the window, see ONI_NINO34_v6.txt file header.")
    else:
        clim_note = ("NINO34_CLIM constant per calendar month across "
                     "Jan 2020-Aug 2026: single base period across the window.")
    print(f"  climatology check: {clim_note}")

    with open(CSV, "w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["Year", "Month", "AnomalyC", "MeanC", "ClimC"])
        for ym in window:
            writer.writerow([ym[0], ym[1], rows[ym]["anom"],
                             rows[ym]["mean"], rows[ym]["clim"]])
    with open(CSV, encoding="utf-8", newline="") as handle:
        reread = list(csv.DictReader(handle))
    assert len(reread) == EXPECTED_MONTHS, len(reread)
    for row, ym in zip(reread, window):
        assert (int(row["Year"]), int(row["Month"])) == ym, row
        assert abs(float(row["AnomalyC"]) - rows[ym]["anom"]) < 1e-9, row
    print(f"wrote {CSV.name}: {len(reread)} rows, round-trip verified")

    changes = {ym: rows[ym]["anom"] - rows[prev]["anom"]
               for ym, prev in zip(window[1:], window)}
    ch_lo, ch_hi = min(changes.values()), max(changes.values())
    print(f"MoM change range: {ch_lo:+.2f}..{ch_hi:+.2f} C "
          f"(min {min(changes, key=changes.__getitem__)}, "
          f"max {max(changes, key=changes.__getitem__)})")

    events = []
    for ym in window:
        anomaly = rows[ym]["anom"]
        raw = linear_freq(anomaly)
        note, quantized = quantize(raw)
        change = changes.get(ym)
        events.append({
            "year": ym[0],
            "month": ym[1],
            "label": f"{MONTH_NAMES[ym[1] - 1]} {ym[0]}",
            "anomalyC": anomaly,
            "linearHz": round(raw, 4),
            "note": note,
            "quantizedHz": quantized,
            "changeRate": None if change is None else round(change, 6),
            "changeGain": round(change_gain(change, ch_lo, ch_hi), 4),
        })
    by_ym = {(e["year"], e["month"]): e for e in events}
    for ym, anom, raw, note in EVENT_CASES:
        event = by_ym[ym]
        assert event["anomalyC"] == anom, (ym, event["anomalyC"])
        assert abs(event["linearHz"] - raw) < 1e-9, (ym, event["linearHz"])
        assert event["note"] == note, (ym, event["note"])
    print("  event spot-checks pass: Feb 2021 E4, Jul 2023 E5, Aug 2026 G5")
    for ym, rate in CHANGE_CASES:
        assert by_ym[ym]["changeRate"] == rate, (ym, by_ym[ym]["changeRate"])
    assert by_ym[(2020, 1)]["changeRate"] is None, "Jan 2020 needs no rate"
    assert by_ym[(2020, 1)]["changeGain"] == 0.0, "Jan 2020 voice silent"
    print("  change spot-checks pass: May 2020 -0.64, Jun 2026 +0.53 C")

    payload = {
        "provenance": {
            "dataset": DATA_CITATION,
            "visual": VISUAL_CITATION,
            "visualCoverage": "Jan 29-Oct 10, 2025 vs 2026 "
                              "(verified on the SVS 5683 page, Nov 2026). "
                              "The visual is contextual, not synchronized "
                              "with the sound.",
            "soundCoverage": "Jan 2020-Aug 2026 monthly (80 months).",
            "sourceFile": ONI.name,
            "derivedFile": CSV.name,
            "inputSha256": hashlib.sha256(ONI.read_bytes()).hexdigest(),
            "column": "NINO34_ANOM (monthly SST anomaly, degrees C)",
            "referencePeriod": "1996–2025 (verified on the provider page, "
                               "Nov 2026: 2016-present uses the 1996-2025 "
                               "climatology because the 2001-2030 "
                               "climatology does not exist yet).",
            "climatologyCheck": clim_note,
            "region": "Nino 3.4: 5S-5N, 190E-240E (= 5S-5N, 170W-120W) "
                      "per ONI_NINO34_v6.txt file header.",
            "eventCount": len(events),
            "missingValuePolicy": "NINO34_ANOM of -99.99 means no observation; "
                                  "no month in Jan 2020-Aug 2026 is missing. "
                                  "Missing months would fail validation, never "
                                  "be interpolated or zero-filled.",
            "generatedBy": "scripts/validate_nino34.py",
            "mappingDoc": "docs/nino34-mapping.md",
        },
        "mapping": {
            "linearHz": "clamp(A, -1.5, +2.5); 220 + (A + 1.5) / 4.0 * 660",
            "quantization": "nearest E-natural-minor note by "
                            "ABS(LOG(raw/note, 2)); ties resolve to the higher "
                            "note; raw frequencies clamp to [E3, B5].",
            "changeVoice": "second voice at quantizedHz * 1.5; gain "
                           "0.02 + 0.08 * (change - lo) / (hi - lo) over "
                           "the Feb 2020-Aug 2026 MoM-change range; "
                           "Jan 2020 silent (gain 0.0).",
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
