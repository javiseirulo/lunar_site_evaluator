"""Download the NAIF SPICE kernels used by the pipeline and write a meta-kernel.

CLI::

    uv run python -m ephem.kernels           # download into <repo>/data_raw/kernels (skip present)
    uv run python -m ephem.kernels --force   # re-download everything

The kernels are NOT committed (``data_raw/`` and ``*.bsp`` are git-ignored). Only the derived
products (``web/public/data/ephem/*.bin``) go into the repo, so the rest of the pipeline and the web
app can run without SPICE.

Set ``LUNAR_KERNELS_DIR`` to use another directory.
"""

from __future__ import annotations

import argparse
import os
import sys
from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
"""Repository root (``python/ephem/kernels.py`` -> ``<repo>``)."""

NAIF = "https://naif.jpl.nasa.gov/pub/naif/generic_kernels"


@dataclass(frozen=True)
class Kernel:
    name: str
    url: str
    what: str


KERNELS: tuple[Kernel, ...] = (
    Kernel("naif0012.tls", f"{NAIF}/lsk/naif0012.tls", "Leapseconds (UTC <-> TDB)"),
    Kernel("pck00011.tpc", f"{NAIF}/pck/pck00011.tpc", "Body radii / orientation constants"),
    Kernel("de440s.bsp", f"{NAIF}/spk/planets/de440s.bsp", "Planetary ephemeris DE440 (1849-2150)"),
    Kernel(
        "moon_pa_de440_200625.bpc",
        f"{NAIF}/pck/moon_pa_de440_200625.bpc",
        "Lunar Principal-Axes orientation (DE440 libration)",
    ),
    Kernel(
        "moon_de440_250416.tf",
        f"{NAIF}/fk/satellites/moon_de440_250416.tf",
        "Lunar frames: MOON_PA / MOON_ME (Mean-Earth / polar axis)",
    ),
)

ME_FRAME = "MOON_ME"
"""Generic name of the lunar Mean-Earth/polar-axis body-fixed frame (what the contract calls it).

In ``moon_de440_250416.tf`` (header table, "Frame Specifications"), ``MOON_ME`` (id 31001) is a
fixed, identity-matrix alias (``TKFRAME_31001_RELATIVE = 'MOON_ME_DE440_ME421'``) of
``MOON_ME_DE440_ME421`` (id 31009): the DE440 principal-axes frame ``MOON_PA_DE440`` rotated by the
constant angles of Park et al. (2021) so that it stays within ~1 m of the DE421 Mean-Earth frame
used by the LOLA/LRO cartographic products. No ``moon_assoc_me.tf`` is needed because every call
names its frame explicitly. ``frame_info()`` resolves the alias at run time.
"""

META_KERNEL = "lunar.tm"


def kernels_dir() -> Path:
    """Directory holding the kernels (``$LUNAR_KERNELS_DIR`` or ``<repo>/data_raw/kernels``)."""
    env = os.environ.get("LUNAR_KERNELS_DIR")
    return Path(env).expanduser().resolve() if env else REPO_ROOT / "data_raw" / "kernels"


def have_kernels(directory: Path | None = None) -> bool:
    """True if every kernel file is present (used by tests to skip when offline)."""
    d = directory or kernels_dir()
    return all((d / k.name).is_file() for k in KERNELS)


def download(directory: Path | None = None, force: bool = False) -> list[Path]:
    """Download the kernels that are missing (or all with ``force``). Returns their paths."""
    import requests  # imported lazily: the loaders/tests that need no network stay light

    d = directory or kernels_dir()
    d.mkdir(parents=True, exist_ok=True)
    paths = []
    with requests.Session() as session:
        session.headers["User-Agent"] = "lunar-pipeline (python-requests)"
        for k in KERNELS:
            dest = d / k.name
            paths.append(dest)
            if dest.is_file() and dest.stat().st_size > 0 and not force:
                print(f"  ok   {k.name} (present)")
                continue
            print(f"  get  {k.url}")
            tmp = dest.with_suffix(dest.suffix + ".part")
            with session.get(k.url, stream=True, timeout=120) as r:
                r.raise_for_status()
                with tmp.open("wb") as fh:
                    for chunk in r.iter_content(chunk_size=1 << 20):
                        fh.write(chunk)
            tmp.replace(dest)
            print(f"       -> {dest} ({dest.stat().st_size / 1e6:.1f} MB)")
    return paths


def _kernel_string(value: str, width: int = 70) -> str:
    """Quote a text-kernel string, splitting it with the ``+`` continuation marker.

    SPICE stores kernel-pool strings in 80-character slots; longer values (absolute paths) must be
    continued over several quoted pieces ending in ``+``.
    """
    pieces = [value[i : i + width] for i in range(0, len(value), width)] or [""]
    quoted = [f"'{p}+'" for p in pieces[:-1]] + [f"'{pieces[-1]}'"]
    return "\n                     ".join(quoted)


def write_meta_kernel(directory: Path | None = None) -> Path:
    """Write ``lunar.tm`` next to the kernels, with an absolute ``PATH_VALUES``."""
    d = directory or kernels_dir()
    d.mkdir(parents=True, exist_ok=True)
    files = ",\n                       ".join(f"'$KERNELS/{k.name}'" for k in KERNELS)
    text = f"""KPL/MK

   Meta-kernel for the Lunar Landing Site Navigator pipeline.
   Written by python/ephem/kernels.py; regenerate it instead of editing it.

\\begindata

   PATH_VALUES     = ( {_kernel_string(str(d))} )
   PATH_SYMBOLS    = ( 'KERNELS' )
   KERNELS_TO_LOAD = ( {files} )

\\begintext
"""
    mk = d / META_KERNEL
    mk.write_text(text)
    return mk


_LOADED = False


def furnsh_all(directory: Path | None = None) -> Path:
    """Load every kernel (via the meta-kernel) into SPICE once per process. Returns the meta-kernel.

    Raises ``FileNotFoundError`` with a hint if the kernels have not been downloaded.
    """
    global _LOADED
    import spiceypy as sp

    d = directory or kernels_dir()
    if not have_kernels(d):
        raise FileNotFoundError(
            f"SPICE kernels not found in {d}. Run: uv run python -m ephem.kernels"
        )
    mk = write_meta_kernel(d)  # cheap; keeps PATH_VALUES in sync with the directory
    if not _LOADED:
        sp.furnsh(str(mk))
        _LOADED = True
    return mk


def frame_info(name: str = ME_FRAME) -> dict[str, object]:
    """Resolve a frame through SPICE (kernels must be loaded).

    Returns its id, class and, for a TK frame, the frame it is defined relative to
    (``resolved_name``); e.g. ``MOON_ME`` -> ``MOON_ME_DE440_ME421``.
    """
    import spiceypy as sp

    code = sp.namfrm(name)
    if code == 0:
        raise ValueError(f"SPICE does not know frame {name!r}")
    cent, frclss, clssid = sp.frinfo(code)
    resolved = sp.frmnam(code)
    if frclss == 4:  # TK frame: report what it is attached to
        var = f"TKFRAME_{clssid}_RELATIVE"
        n, _ = sp.dtpool(var)
        if n:
            resolved = sp.gcpool(var, 0, 1)[0]
    return {
        "name": name,
        "code": code,
        "resolved_name": resolved,
        "center": cent,
        "class": frclss,
        "class_id": clssid,
    }


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    p.add_argument("--dir", type=Path, default=None, help="kernel directory")
    p.add_argument("--force", action="store_true", help="re-download even if present")
    args = p.parse_args(argv)
    d = (args.dir or kernels_dir()).resolve()
    print(f"Kernels -> {d}")
    download(d, force=args.force)
    mk = write_meta_kernel(d)
    print(f"Meta-kernel -> {mk}")
    furnsh_all(d)
    info = frame_info(ME_FRAME)
    print(
        f"Frame {ME_FRAME!r} -> {info['resolved_name']} (id {info['code']}, class {info['class']})"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
