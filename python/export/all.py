"""Real data export: replaces the mock files in ``web/public/data`` (same shapes, ``mock: false``).

    uv run python -m export.all

Writes ``timeseries/<id>.json`` (hourly, flat 5 m horizon), ``sites.json`` and ``manifest.json``
for every site of ``export/catalog.yaml`` over 2027 ``[2027-01-01, 2028-01-01)``. Does not touch
``layers.json``, ``layers/`` or ``terrain/``. Every output is validated against
``contracts/*.schema.json``.

Evaluation window (contracts/README v1.1, SitesFile.evaluation): ``Site.metrics`` are over the
manifest window (all of 2027); ``valid``/``score``/``checks`` are over the default mission window
``missionWindow(DEFAULT_MISSION_CONFIG)`` (7 days from 2027-11-08), because the default thresholds
are sized for a 7-day stay. The web re-evaluates any other window with ``@/scoring``.
"""

from __future__ import annotations

import json
import math
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import jsonschema
import numpy as np
import yaml

from ephem import jsonfmt
from ephem.kernels import REPO_ROOT
from ephem.timeseries import build_timeseries, window_metrics
from ephem.vectors import STEP_S, load_window, read_index

from .scoring import DEFAULT_MISSION_CONFIG, evaluate_site

DATA = REPO_ROOT / "web" / "public" / "data"
CONTRACTS = REPO_ROOT / "contracts"
CATALOG = Path(__file__).with_name("catalog.yaml")
START_UTC = "2027-01-01T00:00:00Z"
END_UTC = "2028-01-01T00:00:00Z"
ANTENNA_MARGIN_DEG = 2.0
EVAL_START = DEFAULT_MISSION_CONFIG["landing_utc"]
_eval_start = datetime.strptime(EVAL_START, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=UTC)
_eval_end = _eval_start + timedelta(days=DEFAULT_MISSION_CONFIG["surface_days"])
EVAL_END = _eval_end.strftime("%Y-%m-%dT%H:%M:%SZ")
_year0 = datetime(2027, 1, 1, tzinfo=UTC)
EVAL_SLICE = (
    int((_eval_start - _year0).total_seconds() // STEP_S),
    int((_eval_end - _year0).total_seconds() // STEP_S),
)
PENDING = ["slope_deg", "psr_dist_km"]  # need terrain (not published yet); placeholder 0
CORE_KEYS = ["illum_pct", "earth_vis_pct", "slope_deg", "max_dark_hours", "psr_dist_km"]


def _schema(name: str) -> dict:
    return json.loads((CONTRACTS / f"{name}.schema.json").read_text())


def _validate(obj: Any, name: str) -> None:
    jsonschema.Draft202012Validator(_schema(name)).validate(obj)


def _r2(x: float) -> float:
    return round(float(x), 2) + 0.0


def publish_timeseries(site: dict, t, sun, earth) -> dict:
    ts = build_timeseries(site, t, sun, earth, antenna_margin_deg=ANTENNA_MARGIN_DEG)
    # Files publish 2 decimals (README); lit is re-derived from the published sun_frac so that
    # lit == (sun_frac >= 0.5) holds exactly in the file.
    frac = [_r2(f) for f in ts["sun_frac"]]
    ts["sun_frac"] = frac
    ts["lit"] = [1 if f >= 0.5 else 0 for f in frac]
    return ts


def _slice(ts: dict, i0: int, i1: int) -> dict:
    n = len(ts["t_utc"])
    return {k: (v[i0:i1] if isinstance(v, list) and len(v) == n else v) for k, v in ts.items()}


def site_record(entry: dict, ts: dict) -> dict:
    wm = {k: _r2(v) for k, v in window_metrics(ts).items()}
    metrics = {**wm, "slope_deg": 0.0, "psr_dist_km": 0.0}
    # valid/score/checks: over the default mission window (SitesFile.evaluation), not the year.
    i0, i1 = EVAL_SLICE
    ew = {k: _r2(v) for k, v in window_metrics(_slice(ts, i0, i1)).items()}
    ev = evaluate_site(
        {**ew, "slope_deg": 0.0, "psr_dist_km": 0.0}, DEFAULT_MISSION_CONFIG, pending=PENDING
    )
    ordered = {k: metrics[k] for k in CORE_KEYS}
    ordered.update({k: wm[k] for k in ("sun_el_mean_deg", "max_blackout_hours", "sun_earth_pct")})
    return {
        "id": entry["id"],
        "name": entry["name"],
        "lat": float(entry["lat"]),
        "lon": float(entry["lon"]),
        "elev_m": float(entry.get("elev_m", 0.0)),
        "valid": ev["valid"],
        "score": ev["score"],
        "metrics": ordered,
        "reasons": ev["reasons"],
        "source": entry.get("source_ref") or entry.get("source_url", ""),
        "region": entry["region"],
        "kind": entry["kind"],
        "group": entry["group"],
        "checks": ev["checks"],
        "pending_metrics": PENDING,
    }


def main() -> int:
    catalog = yaml.safe_load(CATALOG.read_text())
    t, sun, earth = load_window(START_UTC, END_UTC)
    generated = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
    weights = {k: 0 for k in CORE_KEYS} | dict(DEFAULT_MISSION_CONFIG["weights"])

    ts_dir = DATA / "timeseries"
    ts_dir.mkdir(parents=True, exist_ok=True)
    for old in ts_dir.glob("*.json"):
        old.unlink()
    sites, total = [], 0
    for entry in catalog["sites"]:
        site = {"id": entry["id"], "lat": entry["lat"], "lon": entry["lon"], "elev_m": 0.0}
        ts = publish_timeseries(site, t, sun, earth)
        _validate(ts, "timeseries")
        text = json.dumps(ts, separators=(",", ":"), allow_nan=False)
        (ts_dir / f"{entry['id']}.json").write_text(text)
        total += len(text)
        sites.append(site_record(entry, ts))

    sites_file = {
        "version": 1,
        "mock": False,
        "generated_utc": generated,
        "weights": weights,
        "evaluation": {"start_utc": EVAL_START, "end_utc": EVAL_END, "config": "default"},
        "sites": sites,
    }
    _validate(sites_file, "sites")
    assert all(math.isfinite(s["score"]) for s in sites)
    jsonfmt.write(DATA / "sites.json", sites_file)

    idx = read_index()
    manifest = {
        "version": 1,
        "mock": False,
        "generated_utc": generated,
        "time_range": {"start_utc": START_UTC, "end_utc": END_UTC, "step_s": STEP_S},
        "sources": [
            f"SPICE kernels: {', '.join(Path(k).name for k in idx.get('kernels', []))}",
            f"Frame {idx['spice_frame']}, aberration {idx['abcorr']} (python/ephem/vectors.py)",
            "Horizon: flat (no terrain), observer 5 m; antenna margin 2 deg",
            "Sites: python/export/catalog.yaml (cited sources per site)",
            "slope_deg / psr_dist_km pending terrain (placeholder 0, see pending_metrics)",
        ],
    }
    _validate(manifest, "manifest")
    jsonfmt.write(DATA / "manifest.json", manifest)
    n = int(np.asarray(t).size)
    print(f"{len(sites)} sites x {n} h; timeseries {total / 1e6:.1f} MB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
