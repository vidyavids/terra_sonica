#!/usr/bin/env python3
"""Aggregate India mean nighttime radiance from VNP46A4 C002 tiles.

For each year 2012-2025: read NearNadir_Composite_Snow_Free from all 11
India tiles, georeference via each file's own lat/lon vectors, mask to
the GADM India boundary, apply the file's own scale/offset, exclude fill
and out-of-range pixels (genuinely dark pixels are KEPT), and pool an
arithmetic mean across all kept pixels. Writes yearly values only --
no frequencies or notes here.
"""

import datetime
import json
import sys
from pathlib import Path

import geopandas
import h5py
import numpy as np
import rasterio.features
from rasterio.transform import Affine

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw" / "vnp46a4_c002"
BOUNDARY = ROOT / "data" / "boundary" / "gadm41_IND_0.json"
OUT = ROOT / "data" / "india-nightlights-2012-2025.json"
YEARS = list(range(2012, 2026))
VAR = "HDFEOS/GRIDS/VIIRS_Grid_DNB_2d/Data Fields/NearNadir_Composite_Snow_Free"
QF = "HDFEOS/GRIDS/VIIRS_Grid_DNB_2d/Data Fields/NearNadir_Composite_Snow_Free_Quality"
PLATFORM = "HDFEOS/GRIDS/VIIRS_Grid_DNB_2d/Data Fields/DNB_Platform"


def tile_transform(h5) -> Affine:
    base = "HDFEOS/GRIDS/VIIRS_Grid_DNB_2d/Data Fields/"
    lat = h5[base + "lat"][:]
    lon = h5[base + "lon"][:]
    dlat = np.diff(lat)
    dlon = np.diff(lon)
    assert np.all(np.diff(lat) < 0), "lat vector not N-to-S"
    assert dlon.min() > 0, "lon vector not W-to-E"
    assert (abs(dlat - dlat.mean()) < 1e-9).all(), "lat spacing not uniform"
    assert (abs(dlon - dlon.mean()) < 1e-9).all(), "lon spacing not uniform"
    dy = float(dlat.mean())
    dx = float(dlon.mean())
    return Affine(dx, 0.0, float(lon[0]) - dx / 2, 0.0, dy,
                  float(lat[0]) - dy / 2)


def main() -> int:
    gdf = geopandas.read_file(BOUNDARY).to_crs("EPSG:4326").dissolve()
    shapes = [(geom, 1) for geom in gdf.geometry]
    values = []
    scale_seen = set()
    for year in YEARS:
        files = sorted(RAW.glob(f"VNP46A4.A{year}001.*.002.*.h5"))
        non_c2 = [f for f in
                  RAW.glob(f"VNP46A4.A{year}001.*.h5")
                  if ".002." not in f.name]
        if non_c2:
            print(f"FATAL: non-C002 files for {year}: {non_c2}")
            return 2
        if len(files) != 11:
            print(f"FATAL: {year} has {len(files)} tiles, want 11: "
                  + ", ".join(f.name for f in files))
            return 2
        total = 0.0
        total_sq = 0.0
        count = 0
        vmax = float("-inf")
        plat: dict[int, int] = {}
        qual: dict[int, int] = {}
        tile_n = {}
        for f in files:
            with h5py.File(f, "r") as h5:
                ds = h5[VAR]
                scale = float(np.asarray(ds.attrs["scale_factor"]).ravel()[0])
                offset = float(np.asarray(ds.attrs.get("offset", [0.0])).ravel()[0])
                fill = float(np.asarray(ds.attrs["_FillValue"]).ravel()[0])
                scale_seen.add((scale, offset, fill, str(ds.shape)))
                mask = rasterio.features.rasterize(
                    shapes, out_shape=ds.shape,
                    transform=tile_transform(h5), fill=0,
                    all_touched=False, dtype="uint8").astype(bool)
                raw = ds[:].astype(np.float64)
                kept = mask & (raw != fill) & (raw >= 0.0)
                vals = raw[kept] * scale + offset
                total += float(vals.sum())
                total_sq += float((vals ** 2).sum())
                count += int(kept.sum())
                tile_n[f.name.split(".")[2]] = int(kept.sum())
                if len(vals):
                    vmax = max(vmax, float(vals.max()))
                for code, n in zip(*np.unique(h5[PLATFORM][:][kept],
                                             return_counts=True)):
                    plat[int(code)] = plat.get(int(code), 0) + int(n)
                for code, n in zip(*np.unique(h5[QF][:][kept],
                                             return_counts=True)):
                    qual[int(code)] = qual.get(int(code), 0) + int(n)
        mean = total / count
        std = float(np.sqrt(max(total_sq / count - mean ** 2, 0.0)))
        values.append({"year": year, "meanRadiance": mean,
                       "stdRadiance": std, "nPixels": count,
                       "nTiles": len(files), "maxRadiance": vmax,
                       "platformMix": {str(k): v for k, v in sorted(plat.items())},
                       "qualityDist": {str(k): v for k, v in sorted(qual.items())},
                       "tilePixels": tile_n})
        print(f"{year}: mean={mean:.4f} std={std:.4f} n={count} "
              f"platforms={dict(sorted(plat.items()))}", flush=True)
    if len(scale_seen) != 1:
        print(f"FATAL: inconsistent scale/offset/fill/shape: {scale_seen}")
        return 2
    means = [v["meanRadiance"] for v in values]
    ratios = [b / a if a else float("inf")
              for a, b in zip(means, means[1:])]
    print(f"range: {min(means):.4f}..{max(means):.4f} nW/(cm^2 sr)")
    print(f"max YoY ratio: {max(ratios):.3f}")
    if max(ratios) > 2.0 or min(ratios) < 0.5:
        print("WARNING: large YoY jump -- investigate before mapping.")
    doc = {
        "product": "VNP46A4",
        "collection": "002",
        "doi": "10.5067/VIIRS/VNP46A4.002",
        "variable": "NearNadir_Composite_Snow_Free",
        "units": "nW/(cm^2 sr)",
        "mask": "GADM 4.1 India level-0 dissolved polygon",
        "aggregation": "arithmetic mean of scaled radiance over kept pixels "
                       "pooled across all 11 tiles per year",
        "qualityPolicy": "exclude _FillValue and valid_range violations "
                         "only; genuinely dark pixels kept; no confidence "
                         "filtering (Quality/Num distributions recorded, not "
                         "used as filters)",
        "scaleNote": "scale_factor/offset read from each file (all 1.0/0.0); "
                     "C001 0.1 factor NOT applied",
        "accessDate": datetime.datetime.now(datetime.UTC).date().isoformat(),
        "values": values,
    }
    OUT.write_text(json.dumps(doc, indent=2))
    print(f"wrote {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
