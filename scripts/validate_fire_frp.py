#!/usr/bin/env python3
"""Terra Sonica track 3 FRP layer: validate the FRP monthly means.

Reads ``data/fire-brazil-frp-monthly-2020-2025.csv`` (verified FIRMS
MODIS monthly mean FRP for Brazil, Jan 2020-Dec 2025) and validates
gates (72 contiguous months aligned with the counts CSV, detection
counts match exactly, all means finite and non-negative, exact range).
Reports the range. This validator checks only; the merge into the
dataset lives in ``validate_fire.py``.

Fails (exit 1) on any gap, mismatch, or range violation.
"""

import csv
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FRP_CSV = ROOT / "data" / "fire-brazil-frp-monthly-2020-2025.csv"
COUNTS_CSV = ROOT / "data" / "fire-brazil-monthly-2020-2025.csv"

EXPECTED_MONTHS = 72
FRP_MIN = 21.6736  # Mar 2023, verified (rounded to 4 decimals)
FRP_MAX = 63.2162  # Aug 2024, verified (rounded to 4 decimals)


def main() -> int:
    with open(FRP_CSV, encoding="utf-8", newline="") as handle:
        frp_rows = list(csv.DictReader(handle))
    with open(COUNTS_CSV, encoding="utf-8", newline="") as handle:
        count_rows = list(csv.DictReader(handle))
    if len(frp_rows) != EXPECTED_MONTHS:
        print(f"FATAL: FRP CSV has {len(frp_rows)} rows, want 72.",
              file=sys.stderr)
        return 1
    if len(count_rows) != EXPECTED_MONTHS:
        print(f"FATAL: counts CSV has {len(count_rows)} rows, want 72.",
              file=sys.stderr)
        return 1
    means = []
    for frp_row, count_row in zip(frp_rows, count_rows):
        ym = (int(frp_row["year"]), int(frp_row["month"]))
        if ym != (int(count_row["year"]), int(count_row["month"])):
            print(f"FATAL: month misalignment at {frp_row}.", file=sys.stderr)
            return 1
        if int(frp_row["nDetections"]) != int(count_row["count"]):
            print(f"FATAL: {ym} FRP n={frp_row['nDetections']} != counts "
                  f"n={count_row['count']}.", file=sys.stderr)
            return 1
        mean_frp = float(frp_row["meanFRP_MW"])
        if not math.isfinite(mean_frp) or mean_frp < 0:
            print(f"FATAL: {ym} meanFRP {mean_frp} invalid.", file=sys.stderr)
            return 1
        means.append(round(mean_frp, 4))
    lo, hi = min(means), max(means)
    print(f"FRP range: {lo}..{hi} MW (verified {FRP_MIN}..{FRP_MAX})")
    if lo != FRP_MIN or hi != FRP_MAX:
        print("FATAL: range mismatch; refusing to finalize.", file=sys.stderr)
        return 1
    print("FRP gate: 72/72 months, counts match, non-negative, range exact. PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
