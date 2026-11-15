#!/usr/bin/env python3
"""Independent georeferencing + value sanity check for M6 aggregation.

Locates bright-city and dark-land pixels by coordinates (validates the
lat/lon georeferencing independently of the aggregation script), prints
the platform flag legend, and shows the per-tile pixel distribution.
"""

import json
from pathlib import Path

import h5py
import numpy as np

RAW = Path("data/raw/vnp46a4_c002")
BASE = "HDFEOS/GRIDS/VIIRS_Grid_DNB_2d/Data Fields/"
VAR = BASE + "NearNadir_Composite_Snow_Free"
PLAT = BASE + "DNB_Platform"


def main() -> int:
    spots = {"Delhi": (28.6, 77.2), "Mumbai": (19.1, 72.9),
             "Himalaya-dark": (30.5, 80.0)}
    files = sorted(RAW.glob("VNP46A4.A2025001.*.h5"))
    assert len(files) == 11, len(files)
    for name, (lat0, lon0) in spots.items():
        for f in files:
            with h5py.File(f, "r") as h5:
                lat = h5[BASE + "lat"][:]
                lon = h5[BASE + "lon"][:]
                if lat.min() <= lat0 <= lat.max() and lon.min() <= lon0 <= lon.max():
                    i = int(np.argmin(abs(lat - lat0)))
                    j = int(np.argmin(abs(lon - lon0)))
                    v = float(h5[VAR][i, j])
                    print(f"{name} in {f.name.split('.')[2]} "
                          f"@ ({lat[i]:.3f},{lon[j]:.3f}) = {v:.2f}")
                    break
    with h5py.File(files[0], "r") as h5:
        ds = h5[PLAT]
        print("platform attrs:",
              {k: str(v)[:120] for k, v in ds.attrs.items()})
    doc = json.load(open("data/india-nightlights-2012-2025.json"))
    v25 = next(v for v in doc["values"] if v["year"] == 2025)
    print("2025 tilePixels:", dict(sorted(v25["tilePixels"].items())))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
