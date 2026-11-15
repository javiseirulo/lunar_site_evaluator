"""Real data export: replaces the mock files in ``web/public/data`` (same shapes, ``mock: false``).

    uv run python -m export.all

Writes ``timeseries/<id>.json`` (hourly; terrain horizon from
``horizon/<id>.json`` when Pablo published one, else flat 5 m), ``sites.json`` and ``manifest.json``
for every site of ``export/catalog.yaml`` over 2027 ``[2027-01-01, 2028-01-01)``.
Reads (never writes)
``terrain/catalog.json`` (elev_m, slope_deg, psr_dist_km) and ``horizon/``; does not touch
``layers.json``, ``layers/``, ``terrain/`` or ``horizon/``. Every output is validated against
``contracts/*.schema.json``.

Evaluation window (contracts/README v1.1, SitesFile.evaluation): ``Site.metrics`` are over the
manifest window (all of 2027); ``valid``/``score``/``checks`` are over the default mission window
``missionWindow(DEFAULT_MISSION_CONFIG)`` (7 days from 2027-10-12), because the default thresholds
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
from ephem.topo import DEFAULT_H_OBS_M
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
TERRAIN_KEYS = ("slope_deg", "psr_dist_km")  # from terrain/catalog.json; pending when null
CORE_KEYS = ["illum_pct", "earth_vis_pct", "slope_deg", "max_dark_hours", "psr_dist_km"]


def _schema(name: str) -> dict:
    return json.loads((CONTRACTS / f"{name}.schema.json").read_text())


def _validate(obj: Any, name: str) -> None:
    jsonschema.Draft202012Validator(_schema(name)).validate(obj)


def _r2(x: float) -> float:
    return round(float(x), 2) + 0.0


def load_terrain() -> dict[str, dict]:
    """``terrain/catalog.json`` (Pablo) by site id; empty if not published."""
    path = DATA / "terrain" / "catalog.json"
    if not path.exists():
        return {}
    return {s["id"]: s for s in json.loads(path.read_text())["sites"]}


def load_horizon(site_id: str, terrain: dict | None) -> dict | None:
    """Pablo's ``horizon/<id>.json`` (extra fields are allowed by the schema), or None (flat)."""
    rel = (terrain or {}).get("horizon_file") or f"horizon/{site_id}.json"
    path = DATA / rel
    if not path.exists():
        return None
    h = json.loads(path.read_text())
    if h.get("site_id") != site_id:
        raise ValueError(f"{rel}: site_id {h.get('site_id')!r} != {site_id!r}")
    _validate(h, "horizon")
    return h


def _num(v: Any) -> float | None:
    ok = isinstance(v, int | float) and not isinstance(v, bool) and math.isfinite(v)
    return float(v) if ok else None


def site_elev_m(entry: dict, terrain: dict | None) -> float:
    """Published ``elev_m`` (2 decimals): terrain/catalog.json, else the catalog.yaml value."""
    elev = _num((terrain or {}).get("elev_m"))
    return _r2(elev if elev is not None else entry.get("elev_m", 0.0))


def publish_timeseries(site: dict, t, sun, earth, horizon: dict | None = None) -> dict:
    # Same inputs as the web (SiteCheckPanel -> buildTimeseries): elev_m as published in
    # sites.json, observer height from the profile (default 5 m), h(az) from the profile.
    h_obs = float(horizon.get("observer_height_m", DEFAULT_H_OBS_M)) if horizon else DEFAULT_H_OBS_M
    ts = build_timeseries(
        site, t, sun, earth, horizon=horizon, antenna_margin_deg=ANTENNA_MARGIN_DEG, h_obs_m=h_obs
    )
    # Files publish 2 decimals (README); lit is re-derived from the published sun_frac so that
    # lit == (sun_frac >= 0.5) holds exactly in the file.
    frac = [_r2(f) for f in ts["sun_frac"]]
    ts["sun_frac"] = frac
    ts["lit"] = [1 if f >= 0.5 else 0 for f in frac]
    return ts


def _slice(ts: dict, i0: int, i1: int) -> dict:
    n = len(ts["t_utc"])
    return {k: (v[i0:i1] if isinstance(v, list) and len(v) == n else v) for k, v in ts.items()}


def terrain_metrics(terrain: dict | None) -> tuple[dict[str, float], list[str]]:
    """``{slope_deg, psr_dist_km}`` (placeholder 0 when unknown) and the pending list."""
    vals, pending = {}, []
    for k in TERRAIN_KEYS:
        v = _num((terrain or {}).get(k))
        if v is None:
            pending.append(k)
        vals[k] = _r2(v) if v is not None else 0.0
    return vals, pending


def site_record(
    entry: dict, ts: dict, terrain: dict | None = None, i_slice: tuple[int, int] | None = None
) -> dict:
    wm = {k: _r2(v) for k, v in window_metrics(ts).items()}
    tm, pending = terrain_metrics(terrain)
    metrics = {**wm, **tm}
    # valid/score/checks: over the default mission window (SitesFile.evaluation), not the year.
    i0, i1 = i_slice or EVAL_SLICE
    ew = {k: _r2(v) for k, v in window_metrics(_slice(ts, i0, i1)).items()}
    ev = evaluate_site({**ew, **tm}, DEFAULT_MISSION_CONFIG, pending=pending)
    ordered = {k: metrics[k] for k in CORE_KEYS}
    ordered.update({k: wm[k] for k in ("sun_el_mean_deg", "max_blackout_hours", "sun_earth_pct")})
    return {
        "id": entry["id"],
        "name": entry["name"],
        "lat": float(entry["lat"]),
        "lon": float(entry["lon"]),
        "elev_m": site_elev_m(entry, terrain),
        "valid": ev["valid"],
        "score": ev["score"],
        "metrics": ordered,
        "reasons": ev["reasons"],
        "source": entry.get("source_ref") or entry.get("source_url", ""),
        "region": entry["region"],
        "kind": entry["kind"],
        "group": entry["group"],
        "checks": ev["checks"],
        "pending_metrics": pending,
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
    terrain_by_id = load_terrain()
    sites, total, n_terrain = [], 0, 0
    for entry in catalog["sites"]:
        terrain = terrain_by_id.get(entry["id"])
        horizon = load_horizon(entry["id"], terrain)
        n_terrain += horizon is not None
        elev = site_elev_m(entry, terrain)
        if horizon is not None:  # the profile was cast from this ground height
            assert abs(float(horizon["observer_ground_m"]) - elev) < 0.01, entry["id"]
        site = {"id": entry["id"], "lat": entry["lat"], "lon": entry["lon"], "elev_m": elev}
        ts = publish_timeseries(site, t, sun, earth, horizon)
        _validate(ts, "timeseries")
        text = json.dumps(ts, separators=(",", ":"), allow_nan=False)
        (ts_dir / f"{entry['id']}.json").write_text(text)
        total += len(text)
        sites.append(site_record(entry, ts, terrain))

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
            f"Horizon: terrain profiles horizon/<id>.json for {n_terrain} polar sites "
            "(LOLA, Pablo), flat (no terrain) elsewhere; observer 5 m; antenna margin 2 deg",
            "Sites: python/export/catalog.yaml (cited sources per site)",
            "elev_m / slope_deg / psr_dist_km: terrain/catalog.json (Pablo); "
            "psr_dist_km pending where unknown (see pending_metrics)",
        ],
    }
    _validate(manifest, "manifest")
    jsonfmt.write(DATA / "manifest.json", manifest)
    n = int(np.asarray(t).size)
    print(f"{len(sites)} sites x {n} h; timeseries {total / 1e6:.1f} MB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
