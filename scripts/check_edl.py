#!/usr/bin/env python3
"""Validate the .env Earthdata token before a full download.

Checks URS user_info plus one classic-archive GET (HDF5 magic bytes).
Prints statuses only -- never the token. Exit 0 means good to download.
"""

import os
import sys

import httpx

from ts_env import load_dotenv


def main() -> int:
    print("sourced from .env:", load_dotenv() or "none")
    token = os.environ.get("EARTHDATA_TOKEN", "")
    if not token:
        print("FATAL: no EARTHDATA_TOKEN in env or .env")
        return 1
    headers = {"Authorization": "Bearer " + token}
    r = httpx.get(
        "https://urs.earthdata.nasa.gov/oauth/user_info",
        headers=headers,
        timeout=30.0,
        follow_redirects=False,
    )
    print("user_info:", r.status_code)
    url = (
        "https://ladsweb.modaps.eosdis.nasa.gov/archive/allData/5200/"
        "VNP46A4/2012/001/VNP46A4.A2012001.h24v06.002.2025086172814.h5"
    )
    r = httpx.get(url, headers=headers, timeout=60.0, follow_redirects=True)
    print("classic GET:", r.status_code, "magic:", r.content[:4].hex(),
          "bytes:", len(r.content))
    if r.status_code == 200 and r.content[:8] == b"\x89HDF\r\n\x1a\n":
        print("TOKEN GOOD: classic archive serves real HDF5")
        return 0
    print("TOKEN BAD: no HDF5 content")
    return 1


if __name__ == "__main__":
    sys.exit(main())
