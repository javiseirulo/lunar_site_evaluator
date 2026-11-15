"""Historical mode of the Mission game (#114): Sun/Earth at each real landing date, per option.

CLI::

    LUNAR_KERNELS_DIR=... python -m export.historic   # needs the SPICE kernels (ephem.kernels)

Reads ``historic_missions.yaml`` (content + options) and writes, in ``web/public/data/historic/``:

* ``missions.json``  the mission list for the picker (no timeseries, small);
* ``<mission>.json`` the mission with every option as a contract ``Site`` plus its ``Timeseries``
  (hourly, from the landing hour to 15 days later: the 7-day rule plus room for the coaching's
  "what if it lasted longer").

The year-long ``ephem/<YYYY>.bin`` files only cover 2026-2055, so the vectors are computed straight
from SPICE here (same frame, aberration correction and topocentric code as ``export.all``).
Options with ``catalog_id`` reuse that South Pole site's position, elevation and terrain horizon.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import numpy as np
import yaml

from ephem import jsonfmt
from ephem.kernels import REPO_ROOT, furnsh_all
from ephem.topo import DEFAULT_H_OBS_M, azel
from ephem.vectors import spice_vectors, utc_to_et

from .all import (
    CATALOG,
    _slice,
    load_horizon,
    load_terrain,
    publish_timeseries,
    site_elev_m,
    site_record,
)

CONTENT = Path(__file__).with_name("historic_missions.yaml")
OUT = REPO_ROOT / "web" / "public" / "data" / "historic"
WINDOW_DAYS = 15
SOURCE = "python/export/historic_missions.yaml (sources listed per mission)"
# Same thresholds as web/src/game/engine/requirements.ts (DEFAULT_REQUIREMENTS); the game re-checks
# every mission with the TypeScript engine (historic tests), this only pre-computes ``playable``.
MAX_DARK_H, MAX_BLACKOUT_H, MIN_ILLUM, MIN_COMM = 100, 72, 0.5, 0.5


def _longest(flags: list[bool]) -> int:
    best = cur = 0
    for f in flags:
        cur = cur + 1 if f else 0
        best = max(best, cur)
    return best


def outcome(option: dict, light: dict | None, days: int, relay: bool) -> str:
    """'win' or the first failed rule, as the game will judge it."""
    ts, n = option["timeseries"], days * 24
    s0 = option["landing_sun_el"]
    if light and s0 < light["min"]:
        return "dark_landing"
    if light and s0 > light["max"]:
        return "glare_landing"
    lit = ts["lit"][:n]
    linked = [1] * n if relay else ts["earth_visible"][:n]
    if _longest([not x for x in lit]) > MAX_DARK_H:
        return "cold"
    if _longest([not x for x in linked]) > MAX_BLACKOUT_H:
        return "blackout"
    if sum(lit) / n < MIN_ILLUM:
        return "low_sun"
    if sum(linked) / n < MIN_COMM:
        return "low_comm"
    return "win"


def landing_hours(landing_utc: str, days: int = WINDOW_DAYS) -> np.ndarray:
    """Hourly instants from the landing hour (rounded down) for ``days`` days."""
    t0 = np.datetime64(landing_utc.rstrip("Z"), "h").astype("datetime64[s]")
    return t0 + np.arange(days * 24).astype("timedelta64[h]").astype("timedelta64[s]")


def option_site(
    mission: dict, opt: dict, catalog: dict[str, dict], terrain: dict
) -> tuple[dict, dict | None, dict]:
    """(catalog-like entry, horizon or None, terrain or None) for one option."""
    if "catalog_id" in opt:
        base = catalog[opt["catalog_id"]]
        lat, lon, cid = base["lat"], base["lon"], opt["catalog_id"]
    else:
        lat, lon, cid = opt["lat"], opt["lon"], None
    t = terrain.get(cid) if cid else None
    entry = {
        "id": f"{mission['id']}__{opt['id']}",
        "name": opt["name"],
        "lat": float(lat),
        "lon": float(lon),
        "elev_m": 0.0,
        "region": "historic",
        "kind": "historic",
        "group": mission["id"],
        "source_ref": opt.get("source", SOURCE),
    }
    return entry, (load_horizon(cid, t) if cid else None), t


def build_mission(mission: dict, rules: dict, catalog: dict[str, dict], terrain: dict) -> dict:
    t = landing_hours(mission["landing_utc"])
    sun, earth = spice_vectors(utc_to_et(t))
    # The Sun at the exact touchdown minute (the hourly series starts at the hour before).
    exact = np.array([np.datetime64(mission["landing_utc"].rstrip("Z"), "s")])
    sun_exact, _ = spice_vectors(utc_to_et(exact))
    days = int(mission.get("surface_days", 7))
    options = []
    for opt in mission["options"]:
        entry, horizon, ter = option_site(mission, opt, catalog, terrain)
        site = {
            "id": entry["id"],
            "lat": entry["lat"],
            "lon": entry["lon"],
            "elev_m": site_elev_m(entry, ter),
        }
        ts = publish_timeseries(site, t, sun, earth, horizon)
        # Card bars: the mission's own stay, not the whole 15-day series.
        stay = _slice(ts, 0, days * 24)
        record = site_record(entry, stay, ter, (0, days * 24))
        h_obs = (
            float(horizon.get("observer_height_m", DEFAULT_H_OBS_M)) if horizon else DEFAULT_H_OBS_M
        )
        _, el = azel(site["lat"], site["lon"], site["elev_m"], sun_exact, h_obs, parallax=False)
        options.append(
            {
                "landing_sun_el": round(float(np.atleast_1d(el)[0]), 2),
                "option": opt["id"],
                "basis": opt["basis"],
                "history": bool(opt.get("history", False)),
                "terrain_horizon": horizon is not None,
                "site": record,
                "timeseries": ts,
            }
        )
    light = rules.get(mission["light"])
    relay = bool(mission.get("relay", False))
    for o in options:
        o["outcome"] = outcome(o, light, days, relay)
    real = next(o for o in options if o["history"])
    wins = sum(o["outcome"] == "win" for o in options)
    return {
        "id": mission["id"],
        "name": mission["name"],
        "country": mission["country"],
        "year": mission["year"],
        "landing_utc": mission["landing_utc"],
        "light": {"rule": mission["light"], **(light or {})},
        "surface_days": days,
        "relay": relay,
        # Playable only if the real choice works and the choice matters (1-3 winners of 4).
        "playable": real["outcome"] == "win" and 1 <= wins <= len(options) - 1,
        "narrator": mission["narrator"],
        "intro": mission["intro"],
        "briefing": mission["briefing"],
        "fact": mission["fact"],
        "alarm": mission.get("alarm"),
        "options": options,
    }


def summary(m: dict) -> dict[str, Any]:
    """Picker entry: no timeseries."""
    real = next(o for o in m["options"] if o["history"])
    return {
        "id": m["id"],
        "name": m["name"],
        "country": m["country"],
        "year": m["year"],
        "landing_utc": m["landing_utc"],
        "narrator": m["narrator"],
        "alarm": m["alarm"] is not None,
        "playable": m["playable"],
        "lat": real["site"]["lat"],
        "lon": real["site"]["lon"],
    }


def main() -> int:
    furnsh_all()
    content = yaml.safe_load(CONTENT.read_text(encoding="utf-8"))
    catalog = {s["id"]: s for s in yaml.safe_load(CATALOG.read_text(encoding="utf-8"))["sites"]}
    terrain = load_terrain()
    OUT.mkdir(parents=True, exist_ok=True)
    generated = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
    index = []
    for mission in content["missions"]:
        m = build_mission(mission, content["light_rules"], catalog, terrain)
        text = json.dumps(
            {"version": 1, "generated_utc": generated, **m}, separators=(",", ":"), allow_nan=False
        )
        (OUT / f"{m['id']}.json").write_text(text, encoding="utf-8")
        index.append(summary(m))
        cells = " ".join(
            f"{o['option']}:{o['landing_sun_el']:+.1f}:{o['outcome']}" for o in m["options"]
        )
        print(f"{'PLAY' if m['playable'] else '----'} {m['id']:22s} {cells}")
    jsonfmt.write(
        OUT / "missions.json",
        {
            "version": 1,
            "generated_utc": generated,
            "source": "SPICE (DE440, MOON_ME) at each real landing time; content in " + SOURCE,
            "missions": index,
        },
    )
    print(f"{len(index)} missions -> {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
