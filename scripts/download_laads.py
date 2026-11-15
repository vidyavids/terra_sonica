#!/usr/bin/env python3
"""Download manifested VNP46A4 granules from the classic LAADS archive.

Token travels only via the EARTHDATA_TOKEN environment variable or the
project .env file: it is never printed, never written to disk, and never
committed. Files land in data/raw/vnp46a4_c002/ under their original
names; completed files whose size matches the server are skipped. Every
downloaded file is verified to be real HDF5 (login walls are rejected).

NOTE: the Earthdata Cloud HTTPS links from CMR 401 on GET with a Bearer
token (HEAD mints a signed URL, but GET bounces to URS OAuth), so this
script uses the classic ladsweb archive path derived from each granule
name instead. The manifest keeps the CMR-advertised URLs as provenance.
"""

import json
import os
import re
import sys
import time
from pathlib import Path

import httpx

from ts_env import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "data" / "manifest_vnp46a4_c002.json"
OUT = ROOT / "data" / "raw" / "vnp46a4_c002"
_HDF_MAGIC = b"\x89HDF\r\n\x1a\n"


def classic_url(name: str) -> str:
    """Classic LAADS archive URL derived from the granule name."""
    m = re.search(r"\.A(\d{4})(\d{3})\.", name)
    if not m:
        raise ValueError(f"cannot parse year/day from {name}")
    return (
        "https://ladsweb.modaps.eosdis.nasa.gov/archive/allData/5200/"
        f"VNP46A4/{m.group(1)}/{m.group(2)}/{name}"
    )


def remote_size(client: httpx.Client, url: str) -> int | None:
    try:
        r = client.head(url, timeout=30.0)
        if r.status_code < 400 and "Content-Length" in r.headers:
            return int(r.headers["Content-Length"])
    except httpx.HTTPError:
        pass
    return None


def fetch(client: httpx.Client, url: str, dest: Path) -> int:
    tmp = dest.with_suffix(dest.suffix + ".part")
    for attempt in range(1, 4):
        try:
            total = 0
            with client.stream("GET", url, timeout=300.0) as r:
                r.raise_for_status()
                with open(tmp, "wb") as f:
                    for chunk in r.iter_bytes(1 << 20):
                        f.write(chunk)
                        total += len(chunk)
            tmp.replace(dest)
            with open(dest, "rb") as _v:
                if _v.read(8) != _HDF_MAGIC:
                    dest.unlink()
                    raise RuntimeError("not an HDF5 file (login wall?)")
            return total
        except httpx.HTTPError as e:
            print(f"  attempt {attempt} failed: {type(e).__name__}")
            if attempt == 3:
                raise
            time.sleep(5 * attempt)
    raise RuntimeError("unreachable")


def main() -> int:
    for _k in load_dotenv():
        print(f"sourced {_k} from .env")
    token = os.environ.get("EARTHDATA_TOKEN", "")
    if not token:
        print(
            "FATAL: set the EARTHDATA_TOKEN environment variable or add it "
            "to the project .env file.",
            file=sys.stderr,
        )
        return 1
    manifest = json.loads(MANIFEST.read_text())
    granules = manifest["granules"]
    OUT.mkdir(parents=True, exist_ok=True)
    headers = {"Authorization": "Bearer " + token}
    failures: list[str] = []
    done_bytes = 0
    with httpx.Client(headers=headers, follow_redirects=True) as client:
        for i, g in enumerate(granules, 1):
            dest = OUT / g["name"]
            url = classic_url(g["name"])
            if dest.exists() and dest.stat().st_size > 0:
                size = remote_size(client, url)
                if size is not None and dest.stat().st_size == size:
                    print(f"[{i}/{len(granules)}] skip {g['name']}")
                    continue
            print(f"[{i}/{len(granules)}] get {g['name']} ...", flush=True)
            try:
                nbytes = fetch(client, url, dest)
                done_bytes += nbytes
                print(f"  wrote {nbytes / 1e6:.1f} MB")
            except Exception as e:  # noqa: BLE001 - collected, reported
                print(f"  FAILED: {type(e).__name__}: {e}")
                failures.append(g["name"])
    print(f"downloaded {done_bytes / 1e9:.2f} GB this run")
    if failures:
        print(f"FAILURES ({len(failures)}):")
        for name in failures:
            print(f"  {name}")
        return 2
    print("all manifest files present")
    return 0


if __name__ == "__main__":
    sys.exit(main())
