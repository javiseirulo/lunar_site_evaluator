"""Real ``web/public/data/layers.json`` (contract ``LayersManifest``, layers.schema.json).

    uv run python -m export.layers [--psr-tif PATH/LPSR_80S_20MPP_ADJ.TIF]

Replaces the old mock manifest. Every layer is a ``gray8`` PNG (gray value + alpha = data mask)
over the shared south polar stereographic ``bounds_m`` (same as terrain/heightmap.json and
grid/south_5km.bin):

* ``elevation``, ``slope``: Pablo's real LOLA PNGs, reused as-is (``terrain/layers.json``).
* ``psr``: NASA PGDA ``LPSR_80S_20MPP_ADJ.TIF`` (Barker et al. 2023 PSR mask, 20 m), reduced
  to ``width_px`` with "any PSR in the output pixel" (same any-positive rule as terrain/psr.py).
  Only rebuilt when ``--psr-tif`` is given (needs rasterio: ``uv run --with rasterio``);
  otherwise the existing ``layers/psr.png`` is kept if it is real (manifest entry not mock).
* ``illumination`` / ``earth_vis``: ``illum_pct`` / ``earth_vis_pct`` of grid/south_5km.bin
  (python/export/grids.py; flat horizon, 2027 hourly), nearest-cell upsampled to ``width_px``.

No per-cell "score" exists (scores are per site), so the mock ``score`` layer is dropped.
PNGs are written with the standard library (zlib), no imaging dependency.
"""

from __future__ import annotations

import argparse
import json
import struct
import zlib
from pathlib import Path

import jsonschema
import numpy as np

from .all import CONTRACTS, DATA

PSR_URL = "https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LPSR_80S_20MPP_ADJ.TIF"
GRID_SOURCE = "python/export/grids.py → grid/south_5km.bin (SPICE DE440, flat horizon, 2027 hourly)"


def write_gray8(path: Path, gray: np.ndarray, valid: np.ndarray) -> None:
    """8-bit gray+alpha PNG (colour type 4); alpha 0 where ``valid`` is False."""
    h, w = gray.shape
    px = np.zeros((h, w, 2), np.uint8)
    px[..., 0] = np.where(valid, gray, 0)
    px[..., 1] = np.where(valid, 255, 0)
    raw = b"".join(b"\x00" + px[r].tobytes() for r in range(h))

    def chunk(kind: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))
        )

    path.write_bytes(
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 4, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )


def scale8(v: np.ndarray, lo: float, hi: float) -> np.ndarray:
    return np.clip(np.round((v - lo) / (hi - lo) * 255), 0, 255).astype(np.uint8)


def grid_layers(manifest: dict, out: Path) -> list[dict]:
    index = json.loads((DATA / "grid" / "index.json").read_text())
    g = next(d for d in index["grids"] if d["id"] == "south_5km")
    assert g["bounds_m"] == manifest["bounds_m"], "grid and layers bounds differ"
    planes = np.fromfile(DATA / g["file"], "<f4").reshape(
        len(g["metrics"]), g["height"], g["width"]
    )
    n = manifest["width_px"]
    idx = np.minimum((np.arange(n) + 0.5) * g["height"] / n, g["height"] - 1).astype(int)
    specs = [
        (
            "illumination",
            "illum_pct",
            "Sunlight",
            "#09090d",
            "#9a5b19",
            "#ffe7a3",
            "Share of 2027 with the Sun above a flat local horizon (no terrain shadowing yet).",
        ),
        (
            "earth_vis",
            "earth_vis_pct",
            "Earth visibility",
            "#0b1026",
            "#2f6fb0",
            "#bfe6ff",
            "Share of 2027 with Earth above a flat horizon + 2° antenna margin.",
        ),
    ]
    layers = []
    for lid, metric, label, c0, c1, c2, desc in specs:
        v = planes[g["metrics"].index(metric)][np.ix_(idx, idx)]
        ok = np.isfinite(v)
        lo = float(np.floor(np.nanmin(v) * 100) / 100)
        hi = float(np.ceil(np.nanmax(v) * 100) / 100)
        if hi <= lo:
            hi = lo + 0.01
        write_gray8(out / f"{lid}.png", scale8(np.nan_to_num(v), lo, hi), ok)
        layers.append(
            {
                "id": lid,
                "label": label,
                "kind": "continuous",
                "units": "% of time",
                "value_range": [lo, hi],
                "palette": [[0, c0], [0.5, c1], [1, c2]],
                "default_visible": False,
                "default_opacity": 0.75,
                "description": desc,
                "file": f"layers/{lid}.png",
                "encoding": "gray8",
                "source": f"{GRID_SOURCE}, metric {metric}; window {index['window']['start_utc']}"
                f" to {index['window']['end_utc']}",
            }
        )
    return layers


def psr_png(tif: Path, manifest: dict, out: Path) -> None:
    """Share of PSR 20 m cells per output pixel, from native-resolution strips (never the COG
    overviews, whose averaging breaks the binary mask; see terrain/psr.py). PSR = share >= 0.5."""
    import rasterio  # optional: only to rebuild PSR

    x0, _, _, y1 = manifest["bounds_m"]
    n = manifest["width_px"]
    px = (manifest["bounds_m"][2] - x0) / n
    with rasterio.open(tif) as ds:
        t = ds.transform
        cols = np.clip(((t.c + (np.arange(ds.width) + 0.5) * t.a - x0) // px).astype(int), 0, n - 1)
        hits = np.zeros((n, n))
        count = np.zeros((n, n))
        for start in range(0, ds.height, 512):
            rows = min(512, ds.height - start)
            v = ds.read(1, window=((start, start + rows), (0, ds.width)))
            yr = t.f + (start + np.arange(rows) + 0.5) * t.e
            r = np.clip(((y1 - yr) // px).astype(int), 0, n - 1)
            ok = np.isfinite(v)
            rr = np.broadcast_to(r[:, None], v.shape)[ok]
            cc = np.broadcast_to(cols[None, :], v.shape)[ok]
            np.add.at(count, (rr, cc), 1)
            np.add.at(hits, (rr, cc), v[ok])
    valid = count > 0
    share = np.divide(hits, count, out=np.zeros_like(hits), where=valid)
    write_gray8(out / "psr.png", np.where(share >= 0.5, 255, 0).astype(np.uint8), valid)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--psr-tif", type=Path, help=f"local copy of {PSR_URL}")
    args = ap.parse_args()

    terrain = json.loads((DATA / "terrain" / "layers.json").read_text())
    out = DATA / "layers"
    out.mkdir(exist_ok=True)
    manifest = {k: v for k, v in terrain.items() if k != "layers"}
    manifest["mock"] = False

    if args.psr_tif:
        psr_png(args.psr_tif, manifest, out)
    elif not (out / "psr.png").exists():
        raise SystemExit("layers/psr.png missing: pass --psr-tif")

    psr = {
        "id": "psr",
        "label": "Permanent shadow",
        "kind": "categorical",
        "units": "",
        "value_range": [0, 1],
        "palette": [[0, "#00000000"], [1, "#7c6cff"]],
        "categories": {"0": "Sometimes lit", "1": "Permanently shadowed"},
        "default_visible": False,
        "default_opacity": 0.8,
        "description": "Mapped permanently shadowed regions (cold traps, possible ice); a pixel is"
        " PSR if at least half of its 20 m source cells are.",
        "file": "layers/psr.png",
        "encoding": "gray8",
        "source": f"NASA PGDA LOLA 20 m PSR mask, LPSR_80S_20MPP_ADJ.TIF ({PSR_URL});"
        " Barker et al. (2023); majority (>=50 %) reduction to 512² in python/export/layers.py",
    }
    # All layers start off: the first view is Marta's shaded LOLA patch (layers are an Expert tool).
    pablo = [{**layer, "default_visible": False} for layer in terrain["layers"]]
    manifest["layers"] = [*pablo, psr, *grid_layers(manifest, out)]
    jsonschema.validate(manifest, json.loads((CONTRACTS / "layers.schema.json").read_text()))
    (DATA / "layers.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
    print(f"layers.json: {[layer['id'] for layer in manifest['layers']]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
