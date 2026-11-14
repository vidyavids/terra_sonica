#!/usr/bin/env python3
"""Terra Sonica track 2: download the SVS 5683 contextual still frame.

Fetches the verified no-labels still from
https://svs.gsfc.nasa.gov/5683/ ("Signs of El Nino in 2026", released
Oct 15 2026, visualizations by Kel Elkins) into public/media/.
(The no-labels video was removed from the track card; this script no
longer fetches it.)

Verifies the file by size bounds and magic bytes (JPEG SOI).
Exits non-zero on any failure. Re-runnable: re-downloads every time.
"""

import os
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://svs.gsfc.nasa.gov/vis/a000000/a005600/a005683"

FILES: list[tuple[str, str, int, int]] = [
    # (filename, kind, min_bytes, max_bytes)
    ("elnino_2026_ssta_avw_ssha_1010_nolabels.02200_preview.jpg", "jpg",
     600_000, 1_500_000),  # page lists 796.2 KB; observed 1186965 bytes
]


def check(path: Path, kind: str, lo: int, hi: int) -> None:
    size = path.stat().st_size
    print(f"  {path.name}: {size} bytes")
    assert lo <= size <= hi, f"{path.name}: size {size} outside bounds"
    with open(path, "rb") as handle:
        head = handle.read(12)
    if kind == "mp4":
        assert head[4:8] == b"ftyp", f"{path.name}: missing ftyp box"
    elif kind == "jpg":
        assert head[:3] == b"\xff\xd8\xff", f"{path.name}: missing JPEG SOI"
    print(f"  {path.name}: magic bytes ok")


def main() -> int:
    media = ROOT / "public" / "media"
    media.mkdir(parents=True, exist_ok=True)
    try:
        for name, kind, lo, hi in FILES:
            dest = media / name
            print(f"fetch {BASE}/{name}")
            urllib.request.urlretrieve(f"{BASE}/{name}", dest)
            check(dest, kind, lo, hi)
    except Exception as err:  # noqa: BLE001 - report any download failure
        print(f"FATAL: {err}", file=sys.stderr)
        return 1
    print("media ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
