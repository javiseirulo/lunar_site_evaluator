"""Hourly Sun/Earth vectors in the lunar Mean-Earth frame, one binary file per year.

CLI (needs the kernels, see ``ephem.kernels``)::

    uv run python -m ephem.vectors --start 2026 --end 2055

writes ``web/public/data/ephem/<YYYY>.bin`` and ``web/public/data/ephem/index.json``.

File format (shared with the TypeScript loader in ``web/src/ephem``):

* Float32, little-endian, row-major, 6 values per hour:
  ``sun_ux, sun_uy, sun_uz, earth_x_km, earth_y_km, earth_z_km``.
* Row ``k`` of ``<YYYY>.bin`` is the instant ``YYYY-01-01T00:00:00Z + k * 3600 s`` (UTC); the last
  row is ``YYYY-12-31T23:00:00Z`` (8760 rows, 8784 in leap years).
* Both vectors are seen from the centre of the Moon (``observer = MOON``) with ``LT+S`` aberration
  correction (apparent positions), expressed in ``MOON_ME`` (Mean-Earth / polar axis, DE440
  realisation aligned with DE421: ``MOON_ME_DE440_ME421``). The Sun is a unit vector; the Earth
  vector is in km so that the topocentric parallax can be applied exactly (``earth - r_site``).

``load_vectors`` / ``interp_vectors`` read the binary files back, so everything downstream (exports,
tests, golden fixtures) runs without SPICE.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import UTC, datetime
from pathlib import Path

import numpy as np

from .kernels import KERNELS, ME_FRAME, REPO_ROOT

EPHEM_DIR = REPO_ROOT / "web" / "public" / "data" / "ephem"
"""Where the yearly ``.bin`` files and ``index.json`` live."""

SPICE_FRAME = "MOON_ME_DE440_ME421"
"""Frame name passed to ``spkpos``. ``MOON_ME`` is an identity alias of it in moon_de440_250416.tf;
the explicit name keeps the output stable if a future FK re-points the alias."""

OBSERVER = "MOON"
ABCORR = "LT+S"
STEP_S = 3600
LAYOUT = ("sun_ux", "sun_uy", "sun_uz", "earth_x_km", "earth_y_km", "earth_z_km")
GENERATOR = "python/ephem/vectors.py"


# ---------------------------------------------------------------------------------------------
# Time helpers
# ---------------------------------------------------------------------------------------------
def to_datetime64(t: str | np.datetime64 | datetime) -> np.datetime64:
    """Parse an ISO UTC string (``Z`` suffix allowed) or datetime into ``datetime64[s]``."""
    if isinstance(t, np.datetime64):
        return t.astype("datetime64[s]")
    if isinstance(t, datetime):
        if t.tzinfo is not None:
            t = t.astimezone(UTC).replace(tzinfo=None)
        return np.datetime64(t, "s")
    s = str(t).strip()
    if s.endswith("Z"):
        s = s[:-1]
    return np.datetime64(s, "s")


def iso_utc(t: np.ndarray | np.datetime64) -> np.ndarray | str:
    """``datetime64`` -> ``'YYYY-MM-DDTHH:MM:SSZ'`` (no fractional seconds)."""
    out = np.char.add(np.datetime_as_string(np.asarray(t).astype("datetime64[s]"), unit="s"), "Z")
    return str(out) if np.ndim(out) == 0 else out


def hours_of_year(year: int) -> np.ndarray:
    """Every whole UTC hour of ``year``: Jan 1 00:00 ... Dec 31 23:00, as ``datetime64[s]``."""
    start = np.datetime64(f"{year:04d}-01-01T00:00:00", "s")
    end = np.datetime64(f"{year + 1:04d}-01-01T00:00:00", "s")
    return np.arange(start, end, np.timedelta64(STEP_S, "s"))


def utc_to_et(t: np.ndarray) -> np.ndarray:
    """UTC ``datetime64`` array -> SPICE ephemeris time (TDB s past J2000). Needs the LSK loaded."""
    from spiceypy import cyice

    strings = np.datetime_as_string(np.asarray(t).astype("datetime64[s]"), unit="s")
    return np.asarray(cyice.utc2et_v(np.asarray(strings, dtype=object)), dtype=np.float64)


# ---------------------------------------------------------------------------------------------
# SPICE computation
# ---------------------------------------------------------------------------------------------
def spice_vectors(
    ets: np.ndarray, frame: str = SPICE_FRAME, abcorr: str = ABCORR
) -> tuple[np.ndarray, np.ndarray]:
    """Sun unit vector and Earth vector (km) seen from the Moon centre, in ``frame``.

    Uses the vectorised CSPICE wrapper (``spiceypy.cyice.spkpos_v``). Kernels must be loaded.
    """
    from spiceypy import cyice

    ets = np.ascontiguousarray(np.atleast_1d(ets), dtype=np.float64)
    sun, _ = cyice.spkpos_v("SUN", ets, frame, abcorr, OBSERVER)
    earth, _ = cyice.spkpos_v("EARTH", ets, frame, abcorr, OBSERVER)
    sun = np.asarray(sun, dtype=np.float64).reshape(-1, 3)
    earth = np.asarray(earth, dtype=np.float64).reshape(-1, 3)
    sun_unit = sun / np.linalg.norm(sun, axis=1, keepdims=True)
    return sun_unit, earth


def compute_year(year: int) -> np.ndarray:
    """(n, 6) float64 array for every hour of ``year`` (kernels must be loaded)."""
    t = hours_of_year(year)
    sun_unit, earth = spice_vectors(utc_to_et(t))
    return np.hstack([sun_unit, earth])


def write_year(year: int, out_dir: Path = EPHEM_DIR) -> dict[str, object]:
    """Compute and write ``<year>.bin``; return its entry for ``index.json``."""
    data = compute_year(year)
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"{year:04d}.bin"
    data.astype("<f4").tofile(path)
    return {
        "year": year,
        "file": path.name,
        "start_utc": f"{year:04d}-01-01T00:00:00Z",
        "n": int(data.shape[0]),
    }


def write_index(years: list[dict[str, object]], out_dir: Path = EPHEM_DIR) -> Path:
    """Write ``index.json`` describing the yearly files."""
    years = sorted(years, key=lambda y: int(y["year"]))  # type: ignore[arg-type]
    first, last = int(years[0]["year"]), int(years[-1]["year"])  # type: ignore[arg-type]
    index = {
        "version": 1,
        "frame": ME_FRAME,
        "spice_frame": SPICE_FRAME,
        "observer": OBSERVER,
        "abcorr": ABCORR,
        "start_utc": f"{first:04d}-01-01T00:00:00Z",
        "end_utc": f"{last:04d}-12-31T23:00:00Z",
        "step_s": STEP_S,
        "layout": list(LAYOUT),
        "dtype": "float32-le",
        "years": years,
        "kernels": [k.name for k in KERNELS],
        "generated_utc": datetime.now(UTC).replace(microsecond=0).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "generator": GENERATOR,
    }
    path = out_dir / "index.json"
    path.write_text(json.dumps(index, indent=2) + "\n")
    return path


# ---------------------------------------------------------------------------------------------
# Loaders (no SPICE needed)
# ---------------------------------------------------------------------------------------------
def read_index(data_dir: Path = EPHEM_DIR) -> dict:
    return json.loads((Path(data_dir) / "index.json").read_text())


def read_year(year: int, data_dir: Path = EPHEM_DIR) -> np.ndarray:
    """Raw (n, 6) float32 rows of ``<year>.bin``."""
    raw = np.fromfile(Path(data_dir) / f"{year:04d}.bin", dtype="<f4")
    if raw.size % 6:
        raise ValueError(f"{year}.bin: size {raw.size} is not a multiple of 6")
    return raw.reshape(-1, 6)


def load_vectors(
    start_utc: str | np.datetime64,
    end_utc: str | np.datetime64,
    data_dir: Path = EPHEM_DIR,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Hourly samples with ``start_utc <= t <= end_utc`` from the yearly ``.bin`` files.

    Returns ``(t, sun_unit, earth_km)``: ``t`` is ``datetime64[s]`` (n,), the vectors are float64
    (n, 3) widened from the stored float32 values (the Sun vector is *not* re-normalised, so the
    numbers are exactly what the web app reads).
    """
    index = read_index(data_dir)
    step = np.timedelta64(int(index["step_s"]), "s")
    t0, t1 = to_datetime64(start_utc), to_datetime64(end_utc)
    if t1 < t0:
        raise ValueError("end_utc is before start_utc")
    ts, rows = [], []
    for entry in index["years"]:
        y_start = to_datetime64(entry["start_utc"])
        n = int(entry["n"])
        y_end = y_start + (n - 1) * step
        if y_end < t0 or y_start > t1:
            continue
        data = read_year(int(entry["year"]), data_dir)
        if data.shape[0] != n:
            raise ValueError(f"{entry['file']}: {data.shape[0]} rows, index says {n}")
        t = y_start + np.arange(n) * step
        keep = (t >= t0) & (t <= t1)
        ts.append(t[keep])
        rows.append(data[keep])
    if not ts:
        raise ValueError(f"no ephemeris data between {start_utc} and {end_utc}")
    t = np.concatenate(ts)
    data = np.concatenate(rows).astype(np.float64)
    if t.size > 1 and np.any(np.diff(t) != step):
        raise ValueError("gap in the ephemeris files for the requested window")
    return t, data[:, 0:3], data[:, 3:6]


def load_window(
    start_utc: str | np.datetime64,
    end_utc: str | np.datetime64,
    data_dir: Path = EPHEM_DIR,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Window sampling, half-open ``[start_utc, end_utc)``.

    The first sample is ``start_utc`` rounded *up* to the hour; the run length of ``k`` samples
    is ``k * step_s``. Returns the same tuple as :func:`load_vectors`.
    """
    t0, t1 = to_datetime64(start_utc), to_datetime64(end_utc)
    if t1 <= t0:
        raise ValueError("end_utc must be after start_utc")
    step = np.timedelta64(STEP_S, "s")
    first = t0 + (-(t0 - np.datetime64("1970-01-01T00:00:00", "s"))) % step
    last = t1 - step if (t1 - first) % step == np.timedelta64(0, "s") else t1
    if first > last:
        raise ValueError("window contains no hourly sample")
    return load_vectors(first, last, data_dir)


def interp_vectors(
    t_query: np.ndarray | str, data_dir: Path = EPHEM_DIR
) -> tuple[np.ndarray, np.ndarray]:
    """Vectors at arbitrary instants, linearly interpolated between the hourly ``.bin`` samples.

    The Sun direction is interpolated component-wise and then re-normalised ("nlerp"); the Earth
    vector is interpolated component-wise. Over one hour the Sun moves ~0.5 deg in ``MOON_ME``, so
    the nlerp error is < 1e-6 deg. This is the same scheme the web app uses.
    """
    tq = np.atleast_1d(np.asarray(t_query, dtype="datetime64[ms]"))
    step_ms = np.timedelta64(STEP_S * 1000, "ms")
    lo = tq.min().astype("datetime64[h]").astype("datetime64[s]")
    hi = (tq.max().astype("datetime64[h]") + np.timedelta64(1, "h")).astype("datetime64[s]")
    t, sun, earth = load_vectors(lo, hi, data_dir)
    rel = (tq - t[0].astype("datetime64[ms]")) / step_ms
    i0 = np.clip(np.floor(rel).astype(int), 0, len(t) - 1)
    i1 = np.clip(i0 + 1, 0, len(t) - 1)
    f = (rel - i0)[:, None]
    s = sun[i0] * (1 - f) + sun[i1] * f
    s /= np.linalg.norm(s, axis=1, keepdims=True)
    e = earth[i0] * (1 - f) + earth[i1] * f
    return s, e


# ---------------------------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------------------------
def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="Write web/public/data/ephem/<YYYY>.bin + index.json")
    p.add_argument("--start", type=int, default=2026, help="first year (default 2026)")
    p.add_argument("--end", type=int, default=2055, help="last year, inclusive (default 2055)")
    p.add_argument("--out", type=Path, default=EPHEM_DIR, help="output directory")
    args = p.parse_args(argv)
    if args.end < args.start:
        p.error("--end must be >= --start")

    from .kernels import frame_info, furnsh_all

    furnsh_all()
    alias = frame_info(ME_FRAME)
    print(f"{ME_FRAME} -> {alias['resolved_name']} (id {alias['code']}); spkpos uses {SPICE_FRAME}")
    years = []
    for year in range(args.start, args.end + 1):
        entry = write_year(year, args.out)
        years.append(entry)
        print(f"  {entry['file']}: {entry['n']} rows")
    path = write_index(years, args.out)
    print(f"index -> {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
