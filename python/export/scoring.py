"""Python port of ``web/src/scoring/{utility,evaluate}.ts`` (README "Validity and score").

One-to-one with the TypeScript: same order of checks (``config["requirements"]`` order), same
pending rule, same rounding of the score (``Math.round(x * 1000) / 1000``, half-up). Both are
checked against ``contracts/fixtures/golden-score.json``.
"""

from __future__ import annotations

import math
from collections.abc import Iterable, Mapping
from typing import Any

LESS_IS_BETTER = frozenset({"slope_deg", "max_dark_hours", "max_blackout_hours", "psr_dist_km"})

# Same values as web/src/scoring/defaults.ts DEFAULT_MISSION_CONFIG (keep in sync).
DEFAULT_MISSION_CONFIG: dict[str, Any] = {
    "time_mode": "design",
    "landing_utc": "2027-11-08T00:00:00Z",
    "launch_utc": "2027-11-03T00:00:00Z",
    "trajectory": "hohmann",
    "llo_alt_km": 100,
    "surface_days": 7,
    "antenna_margin_deg": 2,
    "requirements": {
        "slope_deg": {"threshold": 8, "objective": 2},
        "illum_pct": {"threshold": 0.5, "objective": 0.85},
        "max_dark_hours": {"threshold": 100, "objective": 24},
        "earth_vis_pct": {"threshold": 0.5, "objective": 0.95},
        "max_blackout_hours": {"threshold": 72, "objective": 12},
    },
    "weights": {
        "slope_deg": 0.2,
        "illum_pct": 0.2,
        "max_dark_hours": 0.2,
        "earth_vis_pct": 0.2,
        "max_blackout_hours": 0.2,
    },
}

REASON_CODES = {
    "slope_deg": ("slope_ok", "slope_high"),
    "illum_pct": ("illum_ok", "illum_low"),
    "earth_vis_pct": ("earth_ok", "earth_low"),
    "max_dark_hours": ("dark_ok", "dark_long"),
    "max_blackout_hours": ("blackout_ok", "blackout_long"),
    "sun_el_mean_deg": ("sun_el_ok", "sun_el_low"),
    "sun_earth_pct": ("sun_earth_ok", "sun_earth_low"),
    "psr_dist_km": ("psr_ok", "psr_far"),
}


def _is_number(v: Any) -> bool:
    return isinstance(v, int | float) and not isinstance(v, bool) and math.isfinite(v)


def passes(key: str, value: float, req: Mapping[str, float]) -> bool:
    t = req["threshold"]
    return value <= t if key in LESS_IS_BETTER else value >= t


def margin(key: str, value: float, req: Mapping[str, float]) -> float:
    t = req["threshold"]
    diff = t - value if key in LESS_IS_BETTER else value - t
    return diff if t == 0 else diff / abs(t)


def utility(key: str, value: float, req: Mapping[str, float]) -> float:
    ok = passes(key, value, req)
    t = req["threshold"]
    o = req.get("objective")
    less = key in LESS_IS_BETTER
    if o is None or (o >= t if less else o <= t):
        return 1.0 if ok else 0.0
    u = (t - value) / (t - o) if less else (value - t) / (o - t)
    return min(1.0, max(0.0, u))


def reason_for(check: Mapping[str, Any]) -> str:
    if check.get("pending"):
        return f"{check['key']}_pending"
    codes = REASON_CODES.get(check["key"])
    if codes is None:
        return f"{check['key']}_{'ok' if check['ok'] else 'fail'}"
    return codes[0] if check["ok"] else codes[1]


def js_round3(x: float) -> float:
    """``Math.round(x * 1000) / 1000`` (round half towards +inf, as JavaScript)."""
    return math.floor(x * 1000 + 0.5) / 1000


def evaluate_site(
    metrics: Mapping[str, float | None],
    config: Mapping[str, Any],
    pending: Iterable[str] = (),
) -> dict[str, Any]:
    """Mirror of ``evaluateSite``: ``{valid, score, checks, contributions, reasons}``."""
    pend = set(pending)
    checks: list[dict[str, Any]] = []
    contributions: list[dict[str, Any]] = []
    valid = True
    sum_w = 0.0
    sum_wu = 0.0
    weights = config.get("weights", {})
    for key, req in config["requirements"].items():
        if not req:
            continue
        value = metrics.get(key)
        base: dict[str, Any] = {"key": key, "threshold": req["threshold"]}
        if req.get("objective") is not None:
            base["objective"] = req["objective"]
        if key in pend or not _is_number(value):
            checks.append({**base, "ok": True, "value": None, "margin": None, "pending": True})
            continue
        ok = passes(key, value, req)
        valid = valid and ok
        checks.append({**base, "ok": ok, "value": value, "margin": margin(key, value, req)})
        w = weights.get(key, 0)
        if _is_number(w) and w > 0:
            u = utility(key, value, req)
            sum_w += w
            sum_wu += w * u
            contributions.append({"key": key, "weight": w, "utility": u, "share": 0.0})
    for c in contributions:
        c["share"] = c["weight"] * c["utility"] / sum_w
    score = js_round3(sum_wu / sum_w) if sum_w > 0 else 0
    return {
        "valid": valid,
        "score": score,
        "checks": checks,
        "contributions": contributions,
        "reasons": [reason_for(c) for c in checks],
    }
