#!/usr/bin/env python3
"""Fetch FIRMS MODIS active-fire detections for Brazil, count per month.

Queries the FIRMS area API over the Brazil bounding box in 5-day
windows, masks detections to the GADM Brazil national boundary, and
writes monthly counts for Jan 2020-Dec 2025 plus a fetch log with gate
diagnostics.

MAP_KEY travels only via the FIRMS_MAP_KEY environment variable or the
project .env file: it is never printed, never written to disk, and never
committed.
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
CSV_OUT = ROOT / "data" / "fire-brazil-monthly-2020-2025.csv"
LOG_OUT = ROOT / "data" / "fire-brazil-fetch-log.json"
API = "https://firms.modaps.eosdis.nasa.gov/api"
PRODUCTS = ["MODIS_SP", "MODIS_NRT"]
MONTHS = [(y, m) for y in range(2020, 2026) for m in range(1, 13)]


def api_get(client: httpx.Client, path: str) -> pd.DataFrame:
    """GET a FIRMS CSV endpoint; raise with the API message on error."""
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


def month_frame(client, key, product, bbox, year, month) -> pd.DataFrame:
    start = datetime.date(year, month, 1)
    end = (
        datetime.date(year + 1, 1, 1)
        if month == 12
        else datetime.date(year, month + 1, 1)
    )
    frames = []
    day = start
    while day < end:
        n = min(5, (end - day).days)
        frames.append(
            api_get(
                client,
                f"/area/csv/{key}/{product}/{bbox}/{n}/{day.isoformat()}",
            )
        )
        time.sleep(0.5)
        day += datetime.timedelta(days=n)
    return pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()


def main() -> int:
    for _k in load_dotenv():
        print(f"sourced {_k} from .env")
    key = os.environ.get("FIRMS_MAP_KEY", "")
    if not key:
        print("FATAL: set the FIRMS_MAP_KEY environment variable or add it "
              "to the project .env file.",
              file=sys.stderr)
        return 1
    gdf = geopandas.read_file(BOUNDARY).to_crs("EPSG:4326").dissolve()
    wb, sb, eb, nb = gdf.total_bounds
    bbox = f"{math.floor(wb)},{math.floor(sb)},{math.ceil(eb)},{math.ceil(nb)}"
    print(f"boundary: bbox={bbox}")
    access = datetime.datetime.now(datetime.UTC).date().isoformat()
    months: dict[str, dict] = {}
    product = None
    with httpx.Client() as client:
        for pi, candidate in enumerate(PRODUCTS):
            try:
                probe = month_frame(client, key, candidate, bbox, 2020, 1)
                product = candidate
                print(f"API settled: product={product} "
                      f"(Jan 2020 rows: {len(probe)})")
                if pi > 0:
                    print("NOTE: fell back from preferred MODIS_SP")
                break
            except RuntimeError as e:
                print(f"product={candidate} unusable: {str(e)[:150]}")
        if not product:
            print("FATAL: no working FIRMS product.", file=sys.stderr)
            return 1
        rows = []
        for year, month in MONTHS:
            tag = f"{year}-{month:02d}"
            df = month_frame(client, key, product, bbox, year, month)
            raw = len(df)
            instruments = sorted(df["instrument"].unique().tolist()) if raw else []
            sats = df["satellite"].value_counts().to_dict() if raw else {}
            conf = df["confidence"].value_counts().to_dict() if raw else {}
            if raw:
                pts = geopandas.GeoDataFrame(
                    df, geometry=geopandas.points_from_xy(df.longitude, df.latitude),
                    crs="EPSG:4326")
                kept = pts.sjoin(gdf[["geometry"]], how="inner",
                                 predicate="within")
                kept_n = len(kept)
                days = sorted(kept["acq_date"].unique().tolist()) if kept_n else []
            else:
                kept_n, days = 0, []
            months[tag] = {"raw": raw, "kept": kept_n,
                           "days_covered": len(days),
                           "instruments": instruments,
                           "satellites": {str(k): int(v) for k, v in sats.items()},
                           "confidence": {str(k): int(v) for k, v in conf.items()}}
            print(f"{tag}: raw={raw} kept={kept_n} days={len(days)}", flush=True)
            rows.append({"year": year, "month": month, "count": kept_n})
    counts = [r["count"] for r in rows]
    print(f"range: {min(counts)}..{max(counts)} detections/month")
    print(f"total: {sum(counts)} detections over {len(rows)} months")
    missing = [t for t, d in months.items() if d["days_covered"] == 0]
    non_modis = {t: d["instruments"] for t, d in months.items()
                 if set(d["instruments"]) - {"MODIS"}}
    print(f"months with zero covered days: {missing or 'none'}")
    print(f"months with non-MODIS rows: {non_modis or 'none'}")
    pd.DataFrame(rows).to_csv(CSV_OUT, index=False)
    LOG_OUT.write_text(json.dumps(
        {"source": "NASA FIRMS API", "params": {"product": product},
         "access_date": access,
         "mask": "GADM 4.1 Brazil level-0 dissolved polygon",
         "months": months}, indent=2))
    print(f"wrote {CSV_OUT} and {LOG_OUT}")
    if missing or non_modis:
        print("GATE BLOCKED: see missing/non-MODIS months above.")
        return 2
    print("GATE: 72/72 months present, MODIS-only. PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
