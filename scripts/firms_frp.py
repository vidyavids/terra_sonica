#!/usr/bin/env python3
"""Fetch FIRMS MODIS mean FRP for Brazil (same rows as the counts fetch).

Re-queries the FIRMS area API (MODIS_SP only -- no fallback, so FRP can
never come from a different processing version than the counts), masks
to the GADM Brazil boundary, and writes monthly mean FRP plus a
detection-count cross-check against the counts CSV.

MAP_KEY travels only via FIRMS_MAP_KEY env or the project .env file.
"""

import datetime
import io
import json
import math
import os
import sys
import time
from pathlib import Path

import geopandas
import httpx
import pandas as pd

from ts_env import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
BOUNDARY = ROOT / "data" / "boundary" / "gadm41_BRA_0.json"
COUNTS_CSV = ROOT / "data" / "fire-brazil-monthly-2020-2025.csv"
CSV_OUT = ROOT / "data" / "fire-brazil-frp-monthly-2020-2025.csv"
LOG_OUT = ROOT / "data" / "fire-brazil-frp-fetch-log.json"
API = "https://firms.modaps.eosdis.nasa.gov/api"
PRODUCT = "MODIS_SP"
MONTHS = [(y, m) for y in range(2020, 2026) for m in range(1, 13)]


def api_get(client: httpx.Client, path: str) -> pd.DataFrame:
    last: Exception | None = None
    for attempt in range(1, 4):
        try:
            r = client.get(f"{API}{path}", timeout=120.0)
            text = r.text
            if r.status_code < 400 and text.startswith("latitude,"):
                return pd.read_csv(io.StringIO(text))
            raise RuntimeError(f"HTTP {r.status_code}: {text[:200]}")
        except Exception as e:  # noqa: BLE001 - retried, then reported
            last = e
            print(f"  attempt {attempt}: {type(e).__name__}: {str(e)[:120]}")
            time.sleep(5 * attempt)
    assert last is not None
    raise last


def month_frame(client, key, bbox, year, month) -> pd.DataFrame:
    start = datetime.date(year, month, 1)
    end = (datetime.date(year + 1, 1, 1) if month == 12
           else datetime.date(year, month + 1, 1))
    frames = []
    day = start
    while day < end:
        n = min(5, (end - day).days)
        frames.append(api_get(
            client,
            f"/area/csv/{key}/{PRODUCT}/{bbox}/{n}/{day.isoformat()}"))
        time.sleep(0.5)
        day += datetime.timedelta(days=n)
    return pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()


def main() -> int:
    for _k in load_dotenv():
        print(f"sourced {_k} from .env")
    key = os.environ.get("FIRMS_MAP_KEY", "")
    if not key:
        print("FATAL: set FIRMS_MAP_KEY or add it to .env.", file=sys.stderr)
        return 1
    gdf = geopandas.read_file(BOUNDARY).to_crs("EPSG:4326").dissolve()
    wb, sb, eb, nb = gdf.total_bounds
    bbox = f"{math.floor(wb)},{math.floor(sb)},{math.ceil(eb)},{math.ceil(nb)}"
    want_counts = {}
    with open(COUNTS_CSV, encoding="utf-8", newline="") as handle:
        for row in __import__("csv").DictReader(handle):
            want_counts[(int(row["year"]), int(row["month"]))] = int(row["count"])
    access = datetime.datetime.now(datetime.UTC).date().isoformat()
    months: dict[str, dict] = {}
    rows = []
    with httpx.Client() as client:
        for year, month in MONTHS:
            tag = f"{year}-{month:02d}"
            df = month_frame(client, key, bbox, year, month)
            if "frp" not in df.columns:
                print(f"FATAL: {tag} has no frp column: "
                      f"{list(df.columns)}", file=sys.stderr)
                return 1
            pts = geopandas.GeoDataFrame(
                df, geometry=geopandas.points_from_xy(df.longitude, df.latitude),
                crs="EPSG:4326")
            kept = pts.sjoin(gdf[["geometry"]], how="inner", predicate="within")
            n = len(kept)
            if n != want_counts[(year, month)]:
                print(f"FATAL: {tag} n={n} != counts CSV "
                      f"{want_counts[(year, month)]} (API drift?)",
                      file=sys.stderr)
                return 2
            mean_frp = float(kept["frp"].astype(float).mean())
            months[tag] = {"n": n, "meanFRP_MW": mean_frp,
                           "minFRP_MW": float(kept["frp"].astype(float).min()),
                           "maxFRP_MW": float(kept["frp"].astype(float).max())}
            print(f"{tag}: n={n} meanFRP={mean_frp:.4f}", flush=True)
            rows.append({"year": year, "month": month,
                         "meanFRP_MW": mean_frp, "nDetections": n})
    means = [r["meanFRP_MW"] for r in rows]
    print(f"FRP range: {min(means):.4f}..{max(means):.4f} MW")
    pd.DataFrame(rows).to_csv(CSV_OUT, index=False)
    LOG_OUT.write_text(json.dumps(
        {"source": "NASA FIRMS API", "params": {"product": PRODUCT},
         "access_date": access,
         "mask": "GADM 4.1 Brazil level-0 dissolved polygon",
         "months": months}, indent=2))
    print(f"wrote {CSV_OUT} and {LOG_OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
