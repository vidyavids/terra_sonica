#!/usr/bin/env python3
"""Manifest VNP46A4 C002 annual granules covering India via CMR.

Queries CMR with full pagination, keys granules by the year parsed from
their own filenames (CMR temporal extents can spill across year
boundaries), dedupes reprocessings by production timestamp, and writes
data/manifest_vnp46a4_c002.json for the downloader.
"""

import datetime
import json
import re
import sys
from pathlib import Path

import geopandas
import httpx
from blackmarble import TILES

ROOT = Path(__file__).resolve().parent.parent
BOUNDARY = ROOT / "data" / "boundary" / "gadm41_IND_0.json"
OUT = ROOT / "data" / "manifest_vnp46a4_c002.json"
YEARS = list(range(2012, 2026))
FILE_RE = re.compile(r"VNP46A4\.A(\d{4})\d{3}\.(h\d{2}v\d{2})\.002\.(\d{13})\.h5")
CMR = "https://cmr.earthdata.nasa.gov/search/granules.json"


def want_tiles() -> list[str]:
    gdf = geopandas.read_file(BOUNDARY)
    overlay = geopandas.overlay(
        gdf.to_crs("EPSG:4326").dissolve(), TILES, how="intersection"
    )
    return sorted(overlay["TileID"].unique().tolist())


def cmr_year(client: httpx.Client, year: int) -> list[dict]:
    entries: list[dict] = []
    page = 1
    while True:
        params = {
            "short_name": "VNP46A4",
            "version": "2",
            "temporal": f"{year}-01-01T00:00:00Z,{year}-12-31T23:59:59Z",
            "page_size": 2000,
            "page_num": page,
        }
        r = client.get(CMR, params=params, timeout=60.0)
        r.raise_for_status()
        batch = r.json()["feed"].get("entry", [])
        if not batch:
            break
        entries.extend(batch)
        try:
            hits = int(r.headers.get("CMR-Hits", len(entries)))
        except ValueError:
            hits = len(entries)
        if len(entries) >= hits:
            break
        page += 1
    print(f"{year}: {len(entries)} entries", file=sys.stderr)
    return entries


def data_link(entry: dict) -> str | None:
    for link in entry.get("links", []):
        href = link.get("href", "")
        if "ladsweb" in href and href.endswith(".h5"):
            return href
    for link in entry.get("links", []):
        href = link.get("href", "")
        if href.endswith(".h5"):
            return href
    return None


def main() -> int:
    tiles = want_tiles()
    print(f"want tiles ({len(tiles)}): {tiles}")
    granules: dict[tuple[int, str], dict] = {}
    dupes = 0
    skipped = 0
    spillover = 0
    with httpx.Client() as client:
        for year in YEARS:
            for entry in cmr_year(client, year):
                name = entry.get("producer_granule_id", "")
                m = FILE_RE.fullmatch(name)
                if not m:
                    skipped += 1
                    continue
                file_year, tile = int(m.group(1)), m.group(2)
                if tile not in tiles:
                    continue
                if file_year != year:
                    spillover += 1
                url = data_link(entry)
                if not url:
                    print(f"WARNING: no .h5 link for {name}")
                    continue
                key = (file_year, tile)
                rec = {"year": file_year, "tile": tile, "name": name,
                       "url": url, "cmr_date": entry.get("date"),
                       "revision_date": entry.get("revision_date")}
                if key in granules:
                    dupes += 1
                    old_ts = re.search(r"\.002\.(\d{13})\.",
                                       granules[key]["name"]).group(1)
                    if m.group(3) < old_ts:
                        continue
                granules[key] = rec
    print(f"non-matching names skipped: {skipped}")
    print(f"year-spillover entries seen: {spillover}")
    print(f"duplicate (year, tile) versions superseded: {dupes}")
    missing = [(y, t) for y in YEARS for t in tiles if (y, t) not in granules]
    if missing:
        print(f"WARNING: {len(missing)} (year, tile) pairs absent:")
        for y, t in missing:
            print(f"  {y} {t}")
    else:
        print("completeness: all expected (year, tile) pairs present")
    manifest = {
        "product": "VNP46A4",
        "collection": "002",
        "doi": "10.5067/VIIRS/VNP46A4.002",
        "generated_utc": datetime.datetime.now(datetime.UTC).isoformat(),
        "want_tiles": tiles,
        "granules": [granules[k] for k in sorted(granules)],
    }
    OUT.write_text(json.dumps(manifest, indent=2))
    print(f"kept {len(granules)} granules -> {OUT}")
    return 0 if not missing else 2


if __name__ == "__main__":
    sys.exit(main())
