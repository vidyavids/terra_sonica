#!/usr/bin/env python3
"""Inspect VNP46A4 structure (first file) + validate all 154 granules."""

from pathlib import Path

import h5py

RAW = Path("data/raw/vnp46a4_c002")
CANDIDATES = ("NearNadir_Composite_Snow_Free", "AllAngle_Composite_Snow_Free")


def find_var(h5):
    found = {}

    def visit(name, obj):
        if isinstance(obj, h5py.Dataset) and name.split("/")[-1] in CANDIDATES:
            found[name.split("/")[-1]] = name

    h5.visititems(visit)
    return found


def main() -> int:
    files = sorted(RAW.glob("*.h5"))
    print("files:", len(files))
    print("total GB:", round(sum(f.stat().st_size for f in files) / 1e9, 2))
    with h5py.File(files[0], "r") as h5:
        print("---", files[0].name, "---")
        shown = 0

        def visit(name, obj):
            nonlocal shown
            if shown < 60:
                shown += 1
                print(f"  {name} [{type(obj).__name__} "
                      f"{getattr(obj, 'shape', '')} {getattr(obj, 'dtype', '')}]")

        h5.visititems(visit)
        found = find_var(h5)
        print("variables:", found)
        for short, path in found.items():
            ds = h5[path]
            print(f"{short}: shape={ds.shape} dtype={ds.dtype}")
            for k, v in ds.attrs.items():
                print(f"  @{k} = {str(v)[:120]}")
        for meta in ("StructMetadata.0",
                     "HDFEOS INFORMATION/StructMetadata.0"):
            if meta in h5:
                try:
                    raw = h5[meta][()]
                    txt = bytes(raw).decode("utf-8", "replace")
                except Exception as e:  # noqa: BLE001 - probe
                    txt = f"<unreadable: {e}>"
                print(f"--- {meta} (head) ---")
                print(txt[:900])
    problems = []
    sigs: dict[tuple, list] = {}
    for f in files:
        try:
            with h5py.File(f, "r") as h5:
                found = find_var(h5)
                if "NearNadir_Composite_Snow_Free" not in found:
                    problems.append((f.name, "missing NearNadir"))
                    continue
                ds = h5[found["NearNadir_Composite_Snow_Free"]]
                sig = (str(ds.shape), str(ds.dtype),
                       str(ds.attrs.get("scale_factor", "?")),
                       str(ds.attrs.get("add_offset", "?")),
                       str(ds.attrs.get("_FillValue", "?")))
                sigs.setdefault(sig, []).append(f.name)
        except Exception as e:  # noqa: BLE001 - collected
            problems.append((f.name, f"{type(e).__name__}: {e}"[:100]))
    print("distinct (shape,dtype,scale,offset,fill) signatures:", len(sigs))
    for sig, names in sigs.items():
        print(" ", sig, "n=", len(names))
    print("problems:", len(problems))
    for name, e in problems[:10]:
        print(" ", name, e)
    return 0 if not problems and len(files) == 154 else 2


if __name__ == "__main__":
    raise SystemExit(main())
