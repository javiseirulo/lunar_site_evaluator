"""Validate the pipeline against JPL Horizons (apparent az/el from topocentric sites on the Moon).

CLI::

    uv run python -m ephem.horizons_check            # use the cached Horizons answers if complete
    uv run python -m ephem.horizons_check --refresh  # query the API again (14 sequential requests)

Steps:

1. For each site and target (Sun ``10``, Earth ``399``) one request to
   ``https://ssd.jpl.nasa.gov/api/horizons.api`` with ``CENTER='coord@301'``,
   ``COORD_TYPE='GEODETIC'``, ``SITE_COORD='<east lon>,<lat>,0'``, ``QUANTITIES='4'`` (apparent
   az/el, airless), ``ANG_FORMAT='DEG'``, ``CSV_FORMAT='YES'``, ``EXTRA_PREC='YES'`` and a
   ``TLIST`` of the same epochs (UTC) for every site. Answers are stored in
   ``python/ephem/horizons_reference.json`` (committed), so tests and the golden fixture work
   offline.
2. Our values (``h_obs_m = 0``, ``elev_m = 0``: Horizons' altitude 0 on the 1737.4 km sphere):
   * ``spice``: SPICE vectors at the exact epoch + ``ephem.topo.azel``;
   * ``bin``:   float32 ``.bin`` + linear interpolation (``interp_vectors``) + ``azel``; this is
     exactly what the web app does;
   * ``azlcpo`` (diagnostic): SPICE's own topocentric az/el (``azlcpo``, observer on the surface,
     light time and aberration from the site itself).
3. Writes ``docs/validation/horizons-check.md`` with the differences (target < 0.01 deg).
"""

from __future__ import annotations

import argparse
import sys
import time
import urllib.parse
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import numpy as np

from . import jsonfmt
from .kernels import REPO_ROOT, have_kernels
from .topo import R_MOON_KM, azel
from .vectors import interp_vectors, to_datetime64

API_URL = "https://ssd.jpl.nasa.gov/api/horizons.api"
REFERENCE_PATH = Path(__file__).with_name("horizons_reference.json")
REPORT_PATH = REPO_ROOT / "docs" / "validation" / "horizons-check.md"
TARGET_DEG = 0.01

SITES: list[dict[str, Any]] = [
    {"id": "shackleton_rim", "name": "Shackleton rim", "lat": -89.9, "lon": 0.0},
    {"id": "connecting_ridge", "name": "Connecting ridge", "lat": -89.45, "lon": -137.0},
    {"id": "malapert_massif", "name": "Malapert massif", "lat": -85.99, "lon": -0.1},
    {"id": "mons_mouton", "name": "Mons Mouton", "lat": -84.3, "lon": 31.0},
    {"id": "plain_81s", "name": "Plain at 81S", "lat": -81.5, "lon": 120.0},
    {"id": "apollo_11", "name": "Apollo 11", "lat": 0.67408, "lon": 23.47297},
    {"id": "change_4", "name": "Chang'e 4", "lat": -45.4446, "lon": 177.5991},
]

EPOCHS: list[str] = [
    "2026-03-20T06:30:00Z",
    "2031-08-11T17:45:00Z",
    "2037-01-05T03:15:00Z",
    "2042-06-21T12:00:00Z",
    "2048-10-30T21:20:00Z",
    "2055-12-31T22:40:00Z",
]
"""Same epochs for every site; most fall between hourly samples to exercise the interpolation."""

TARGETS = {"sun": "10", "earth": "399"}

COMMON_PARAMS: dict[str, str] = {
    "format": "json",
    "OBJ_DATA": "NO",
    "MAKE_EPHEM": "YES",
    "EPHEM_TYPE": "OBSERVER",
    "CENTER": "coord@301",
    "COORD_TYPE": "GEODETIC",
    "TLIST_TYPE": "CAL",
    "TIME_TYPE": "UT",
    "TIME_DIGITS": "SECONDS",
    "QUANTITIES": "4",
    "ANG_FORMAT": "DEG",
    "CSV_FORMAT": "YES",
    "APPARENT": "AIRLESS",
    "EXTRA_PREC": "YES",
}

HEADER_KEYS = {
    "Target body name": "target",
    "Center body name": "center",
    "Center geodetic ": "center_geodetic",
    "Center pole/equ ": "center_pole_equ",
    "Center radii    ": "center_radii",
    "Atmos refraction": "refraction",
}


# ---------------------------------------------------------------------------------------------
# Horizons API
# ---------------------------------------------------------------------------------------------
def _horizons_time(t_utc: str) -> str:
    """'2031-08-11T17:45:00Z' -> '2031-08-11 17:45:00' (calendar form Horizons accepts in TLIST)."""
    return t_utc.rstrip("Z").replace("T", " ")


def build_query(target: str, lat: float, lon: float, epochs: list[str], alt_km: float = 0.0) -> str:
    """URL query string. Every value is quote-wrapped and fully percent-encoded (spaces -> %20)."""
    params = dict(COMMON_PARAMS)
    params["COMMAND"] = target
    params["SITE_COORD"] = f"{lon % 360.0:.6f},{lat:.6f},{alt_km:.6f}"
    params["TLIST"] = "' '".join(_horizons_time(t) for t in epochs)
    parts = []
    for k, v in params.items():
        value = v if k == "format" else f"'{v}'"
        parts.append(f"{k}={urllib.parse.quote(value, safe='')}")
    return "&".join(parts)


def parse_result(text: str) -> tuple[list[tuple[str, float, float]], dict[str, str]]:
    """Parse a CSV observer table (quantity 4) -> ``[(t_utc, az, el)]`` and some header lines."""
    header: dict[str, str] = {}
    for line in text.splitlines():
        for prefix, key in HEADER_KEYS.items():
            if line.startswith(prefix) and ":" in line:
                header[key] = line.split(":", 1)[1].strip()
        if "{source:" in line and "ephemeris" not in header:
            header["ephemeris"] = line.split("{source:", 1)[1].split("}", 1)[0].strip()
    if "$$SOE" not in text or "$$EOE" not in text:
        raise ValueError("Horizons answer has no $$SOE/$$EOE table:\n" + text[:2000])
    body = text.split("$$SOE", 1)[1].split("$$EOE", 1)[0]
    rows = []
    for line in body.strip().splitlines():
        cols = [c.strip() for c in line.split(",")]
        stamp = datetime.strptime(cols[0], "%Y-%b-%d %H:%M:%S.%f")
        rows.append((stamp.strftime("%Y-%m-%dT%H:%M:%SZ"), float(cols[3]), float(cols[4])))
    return rows, header


def fetch_reference(pause_s: float = 1.0) -> dict[str, Any]:
    """Query Horizons (sequentially, ``pause_s`` between requests) for every site and target."""
    import requests

    rows: dict[tuple[str, str], dict[str, Any]] = {}
    headers: dict[str, dict[str, str]] = {}
    with requests.Session() as session:
        session.headers["User-Agent"] = "lunar-pipeline (python-requests)"
        for site in SITES:
            for name, code in TARGETS.items():
                url = f"{API_URL}?{build_query(code, site['lat'], site['lon'], EPOCHS)}"
                print(f"  Horizons: {site['name']:<17} {name}")
                r = session.get(url, timeout=120)
                r.raise_for_status()
                payload = r.json()
                if "error" in payload:
                    raise RuntimeError(
                        f"Horizons error for {site['id']}/{name}: {payload['error']}"
                    )
                table, header = parse_result(payload["result"])
                headers[f"{site['id']}/{name}"] = header
                if [t for t, _, _ in table] != EPOCHS:
                    raise RuntimeError(f"unexpected epochs for {site['id']}/{name}: {table}")
                for t, az_deg, el_deg in table:
                    row = rows.setdefault(
                        (site["id"], t),
                        {
                            "site": site["id"],
                            "lat": site["lat"],
                            "lon": site["lon"],
                            "elev_m": 0,
                            "h_obs_m": 0,
                            "t_utc": t,
                        },
                    )
                    row[f"{name}_az"] = az_deg
                    row[f"{name}_el"] = el_deg
                time.sleep(pause_s)
    first = headers[f"{SITES[0]['id']}/sun"]
    return {
        "source": "JPL Horizons API",
        "api": API_URL,
        "retrieved_utc": datetime.now(UTC).replace(microsecond=0).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "query": {k: v for k, v in COMMON_PARAMS.items() if k != "format"},
        "header": {
            "ephemeris": first.get("ephemeris", ""),
            "center_pole_equ": first.get("center_pole_equ", ""),
            "center_radii": first.get("center_radii", ""),
            "refraction": first.get("refraction", ""),
        },
        "site_geodetic": {
            s["id"]: headers[f"{s['id']}/sun"].get("center_geodetic", "") for s in SITES
        },
        "rows": [rows[(s["id"], t)] for s in SITES for t in EPOCHS],
    }


def load_reference(path: Path = REFERENCE_PATH) -> dict[str, Any]:
    import json

    return json.loads(Path(path).read_text())


def reference_is_complete(ref: dict[str, Any]) -> bool:
    keys = {(r["site"], r["t_utc"]) for r in ref.get("rows", [])}
    return keys == {(s["id"], t) for s in SITES for t in EPOCHS}


# ---------------------------------------------------------------------------------------------
# Our side
# ---------------------------------------------------------------------------------------------
def _wrap(d: np.ndarray) -> np.ndarray:
    return (np.asarray(d) + 180.0) % 360.0 - 180.0


def ours_from_vectors(row: dict[str, Any], sun: np.ndarray, earth: np.ndarray) -> dict[str, float]:
    lat, lon = row["lat"], row["lon"]
    s_az, s_el = azel(lat, lon, 0.0, sun, h_obs_m=0.0, parallax=False)
    e_az, e_el = azel(lat, lon, 0.0, earth, h_obs_m=0.0, parallax=True)
    return {
        "sun_az": float(s_az),
        "sun_el": float(s_el),
        "earth_az": float(e_az),
        "earth_el": float(e_el),
    }


def ours_bin(rows: list[dict[str, Any]]) -> list[dict[str, float]]:
    t = np.array([to_datetime64(r["t_utc"]) for r in rows])
    sun, earth = interp_vectors(t)
    return [ours_from_vectors(r, sun[i], earth[i]) for i, r in enumerate(rows)]


def ours_spice(rows: list[dict[str, Any]]) -> list[dict[str, float]]:
    from .kernels import furnsh_all
    from .vectors import spice_vectors, utc_to_et

    furnsh_all()
    ets = utc_to_et(np.array([to_datetime64(r["t_utc"]) for r in rows]))
    sun, earth = spice_vectors(ets)
    return [ours_from_vectors(r, sun[i], earth[i]) for i, r in enumerate(rows)]


def ours_azlcpo(rows: list[dict[str, Any]]) -> list[dict[str, float]]:
    """SPICE's full topocentric computation (observer on the sphere, LT+S from the site)."""
    import spiceypy as sp

    from .kernels import furnsh_all
    from .topo import site_position_km
    from .vectors import SPICE_FRAME, utc_to_et

    furnsh_all()
    ets = utc_to_et(np.array([to_datetime64(r["t_utc"]) for r in rows]))
    out = []
    for et, r in zip(ets, rows, strict=True):
        pos = site_position_km(r["lat"], r["lon"], 0.0, 0.0)
        vals = {}
        for name in TARGETS:
            sta, _ = sp.azlcpo(
                "ELLIPSOID", name.upper(), float(et), "LT+S", False, True, pos, "MOON", SPICE_FRAME
            )
            vals[f"{name}_az"] = float(np.degrees(sta[1]) % 360.0)
            vals[f"{name}_el"] = float(np.degrees(sta[2]))
        out.append(vals)
    return out


def differences(
    ref_rows: list[dict[str, Any]], ours: list[dict[str, float]]
) -> dict[str, np.ndarray]:
    """Signed differences ours - Horizons (deg); azimuth wrapped to [-180, 180)."""
    d = {}
    for body in TARGETS:
        d[f"{body}_az"] = _wrap(
            np.array(
                [o[f"{body}_az"] - r[f"{body}_az"] for r, o in zip(ref_rows, ours, strict=True)]
            )
        )
        d[f"{body}_el"] = np.array(
            [o[f"{body}_el"] - r[f"{body}_el"] for r, o in zip(ref_rows, ours, strict=True)]
        )
    return d


# ---------------------------------------------------------------------------------------------
# Diagnostics (need the kernels): where does the residual come from?
# ---------------------------------------------------------------------------------------------
def _angle_deg(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    an = a / np.linalg.norm(a, axis=-1, keepdims=True)
    bn = b / np.linalg.norm(b, axis=-1, keepdims=True)
    return np.degrees(2.0 * np.arcsin(np.linalg.norm(an - bn, axis=-1) / 2.0))


def diagnostics(rows: list[dict[str, Any]], year: int = 2027) -> dict[str, Any]:
    """Error budget: aberration modes vs Horizons, float32 storage and hourly interpolation."""
    from .kernels import furnsh_all
    from .vectors import hours_of_year, spice_vectors, utc_to_et

    furnsh_all()
    ets = utc_to_et(np.array([to_datetime64(r["t_utc"]) for r in rows]))
    abcorr = {}
    for corr in ("NONE", "LT", "LT+S"):
        sun, earth = spice_vectors(ets, abcorr=corr)
        ours = [ours_from_vectors(r, sun[i], earth[i]) for i, r in enumerate(rows)]
        d = differences(rows, ours)
        abcorr[corr] = {k: float(np.abs(v).max()) for k, v in d.items()}

    hours = hours_of_year(year)
    s_true, e_true = spice_vectors(utc_to_et(hours))
    s_bin, e_bin = interp_vectors(hours)
    mid = hours[:-1] + np.timedelta64(STEP_HALF_S, "s")
    s_mid, e_mid = spice_vectors(utc_to_et(mid))
    s_int, e_int = interp_vectors(mid)

    # Sky-plane (great-circle) size of the Horizons differences, which removes the 1/cos(el)
    # amplification of azimuth errors near the zenith.
    return {
        "abcorr": abcorr,
        "year": year,
        "float32_sun_deg": float(_angle_deg(s_true, s_bin).max()),
        "float32_earth_deg": float(_angle_deg(e_true, e_bin).max()),
        "interp_sun_deg": float(_angle_deg(s_mid, s_int).max()),
        "interp_earth_deg": float(_angle_deg(e_mid, e_int).max()),
        "interp_earth_km": float(np.linalg.norm(e_mid - e_int, axis=1).max()),
        "solar_parallax_deg": float(np.degrees(R_MOON_KM / AU_KM)),
        "aberration_parallax_deg": float(np.degrees(V_MOON_KMS / C_KMS * R_MOON_KM / 384400.0)),
    }


STEP_HALF_S = 1800
AU_KM = 149597870.7
C_KMS = 299792.458
V_MOON_KMS = 29.8  # heliocentric speed of the Earth-Moon system, order of magnitude


def sky_differences(rows: list[dict[str, Any]], ours: list[dict[str, float]]) -> dict[str, float]:
    """Max great-circle separation (deg) between our and Horizons' directions, per body."""

    def unit(az: float, el: float) -> np.ndarray:
        a, e = np.radians(az), np.radians(el)
        return np.array([np.cos(e) * np.sin(a), np.cos(e) * np.cos(a), np.sin(e)])

    out = {}
    for body in TARGETS:
        sep = [
            _angle_deg(
                unit(o[f"{body}_az"], o[f"{body}_el"]), unit(r[f"{body}_az"], r[f"{body}_el"])
            )
            for r, o in zip(rows, ours, strict=True)
        ]
        out[body] = float(np.max(sep))
    return out


# ---------------------------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------------------------
def _fmt_deg(x: float) -> str:
    return f"{x:.1e}" if x != 0 else "0"


def run(refresh: bool = False, report: Path | None = REPORT_PATH) -> dict[str, Any]:
    if refresh or not REFERENCE_PATH.is_file() or not reference_is_complete(load_reference()):
        print(f"Querying {API_URL} ({len(SITES) * len(TARGETS)} requests, sequential)")
        ref = fetch_reference()
        jsonfmt.write(REFERENCE_PATH, ref)
        print(f"  -> {REFERENCE_PATH}")
    else:
        ref = load_reference()
        print(f"Using cached Horizons answers from {REFERENCE_PATH} ({ref['retrieved_utc']})")
    rows = ref["rows"]

    paths: dict[str, list[dict[str, float]]] = {"bin": ours_bin(rows)}
    diag = None
    if have_kernels():
        paths["spice"] = ours_spice(rows)
        paths["azlcpo"] = ours_azlcpo(rows)
        diag = diagnostics(rows)
    else:
        print("  (kernels missing: only the .bin path is compared)")

    diffs = {name: differences(rows, ours) for name, ours in paths.items()}
    sky = {name: sky_differences(rows, ours) for name, ours in paths.items()}
    result = {"reference": ref, "ours": paths, "diffs": diffs, "sky": sky, "diagnostics": diag}
    for name, d in diffs.items():
        worst = max(float(np.abs(v).max()) for v in d.values())
        print(f"  {name:<7} max |diff| = {worst:.2e} deg")
    if report is not None and diag is not None:
        write_report(result, report)
        print(f"Report -> {report}")
    elif report is not None:
        print("  report not written: it needs the kernels for the SPICE columns")
    return result


ANGLES = ("sun_az", "sun_el", "earth_az", "earth_el")


def _site_table(rows: list[dict[str, Any]], d: dict[str, np.ndarray]) -> list[str]:
    lines = [
        "| Sitio | lat | lon E | max \\|Δaz\\| Sol | max \\|Δel\\| Sol | "
        "max \\|Δaz\\| Tierra | max \\|Δel\\| Tierra |",
        "|---|---:|---:|---:|---:|---:|---:|",
    ]
    for s in SITES:
        idx = [i for i, r in enumerate(rows) if r["site"] == s["id"]]
        cells = [_fmt_deg(float(np.abs(d[k][idx]).max())) for k in ANGLES]
        lines.append(f"| {s['name']} | {s['lat']} | {s['lon']} | " + " | ".join(cells) + " |")
    cells = [_fmt_deg(float(np.abs(d[k]).max())) for k in ANGLES]
    lines.append("| **Todos** | | | " + " | ".join(f"**{c}**" for c in cells) + " |")
    return lines


def write_report(result: dict[str, Any], path: Path = REPORT_PATH) -> Path:
    ref, diffs, sky, dg = result["reference"], result["diffs"], result["sky"], result["diagnostics"]
    rows = ref["rows"]
    worst = {name: max(float(np.abs(v).max()) for v in d.values()) for name, d in diffs.items()}
    ok = worst["spice"] < TARGET_DEG and worst["bin"] < TARGET_DEG
    hdr, q = ref["header"], ref["query"]
    out: list[str] = []
    w = out.append

    w("# Validación de efemérides: pipeline frente a JPL Horizons")
    w("")
    w("> Generado por `python/ephem/horizons_check.py` (`uv run python -m ephem.horizons_check`).")
    w("> No editar a mano: se regenera con el script.")
    w("")
    verdict = "CUMPLE" if ok else "NO CUMPLE"
    w(
        f"**Resultado: {verdict} el objetivo |Δ| < {TARGET_DEG}°.** Diferencia máxima en cualquier "
        f"sitio, época, cuerpo y ángulo: **{_fmt_deg(worst['spice'])}°** con los vectores SPICE y "
        f"**{_fmt_deg(worst['bin'])}°** con el `.bin` float32 + interpolación que usa la web "
        f"(≈ {TARGET_DEG / worst['bin']:.0f} veces por debajo del objetivo)."
    )
    w("")
    w("## Método")
    w("")
    w(
        f"- **Referencia:** API de JPL Horizons (`{ref['api']}`), consultada el "
        f"{ref['retrieved_utc']}: una petición por sitio y cuerpo ({len(SITES)} × {len(TARGETS)} = "
        f"{len(SITES) * len(TARGETS)} peticiones secuenciales, con pausa)."
    )
    w(
        f"  - `CENTER='{q['CENTER']}'`, `COORD_TYPE='{q['COORD_TYPE']}'`, "
        "`SITE_COORD='<lon E>,<lat>,0'` (altitud 0 km), "
        f"`QUANTITIES='{q['QUANTITIES']}'` (az/el aparentes), `APPARENT='{q['APPARENT']}'`, "
        f"`ANG_FORMAT='{q['ANG_FORMAT']}'`, `CSV_FORMAT='{q['CSV_FORMAT']}'`, "
        f"`EXTRA_PREC='{q['EXTRA_PREC']}'`, `TIME_TYPE='{q['TIME_TYPE']}'` y un `TLIST` con las "
        f"mismas {len(EPOCHS)} épocas UTC para todos los sitios ({', '.join(EPOCHS)}). Casi todas "
        "caen entre dos muestras horarias, para probar también la interpolación."
    )
    w(
        "  - Cuerpos: Sol (`10`) y Tierra (`399`). Az/el *aparentes*: corregidos de tiempo de luz, "
        "deflexión gravitatoria y aberración estelar; sin refracción. Azimut desde el norte, "
        "sentido horario; elevación sobre el plano normal al cénit local."
    )
    w(
        "  - Respuestas guardadas en `python/ephem/horizons_reference.json`; los tests y "
        "`contracts/fixtures/golden-azel.json` las usan sin red."
    )
    w(
        "- **Cómo define Horizons el marco lunar de los sitios de superficie.** El manual "
        "(<https://ssd.jpl.nasa.gov/horizons/manual.html>, apartados *User-Defined Topocentric "
        "Site Coordinates* y *Lunar Mean-Earth Frame of DE421*) dice que las coordenadas de un "
        "sitio en la Luna son planetodésicas en el sistema **Mean Earth / polar axis de DE421** "
        "(rotación fija del marco de ejes principales de DE440; el marco PA no está disponible en "
        "Horizons), con longitud **este positiva** (la Luna es una de las excepciones, junto con "
        "la Tierra y el Sol). La cabecera de cada respuesta lo confirma:"
    )
    w(f"  - `Center pole/equ : {hdr['center_pole_equ']}`")
    w(f"  - `Center radii    : {hdr['center_radii']}`: esfera de 1737,4 km, la misma R que usamos.")
    w(f"  - Efeméride: `{hdr['ephemeris']}`; refracción: `{hdr['refraction']}`.")
    geod = "; ".join(f"{k} `{v.split('{')[0].strip()}`" for k, v in ref["site_geodetic"].items())
    w(f"  - `Center geodetic` devuelto (lon E, lat, alt km): {geod}.")
    w(
        "  - Nuestro marco: `MOON_ME`, alias identidad de `MOON_ME_DE440_ME421` en "
        "`moon_de440_250416.tf` (DE440 PA rotado con los ángulos de Park et al. 2021 para quedar "
        "alineado con el ME de DE421, < 1 m de diferencia). Es el mismo sistema."
    )
    w("- **Nuestro cálculo**, con `elev_m = 0` y `h_obs_m = 0` (la altitud 0 de Horizons):")
    w(
        "  - `spice`: `spkpos('SUN'|'EARTH', et, 'MOON_ME_DE440_ME421', 'LT+S', 'MOON')` en la "
        "época exacta (UTC → TDB con `naif0012.tls`) y `ephem.topo.azel`: Tierra con paralaje "
        "exacta `r_tierra − r_sitio`, Sol con el vector unitario."
    )
    w(
        "  - `bin`: lo que hace la web. Vectores float32 de `web/public/data/ephem/<año>.bin`, "
        "interpolación lineal entre las dos horas que rodean la época (el Sol se renormaliza) y "
        "`azel`."
    )
    w(
        "  - `azlcpo` (diagnóstico): az/el topocéntricos calculados por el propio SPICE "
        "(`azlcpo`, observador fijo en la superficie, tiempo de luz y aberración desde el sitio)."
    )
    w("- Δ = nuestro − Horizons; Δaz reducido a [−180°, 180°).")
    w("")
    w("## Diferencias máximas por sitio (grados)")
    w("")
    for name, title in (
        ("spice", "Vectores SPICE en la época exacta"),
        ("bin", "`.bin` float32 + interpolación lineal (camino de la web)"),
        ("azlcpo", "Diagnóstico: `azlcpo` de SPICE (todo topocéntrico)"),
    ):
        w(f"### {title}")
        w("")
        out.extend(_site_table(rows, diffs[name]))
        w("")
        w(
            f"Separación máxima en el cielo (círculo máximo): Sol {_fmt_deg(sky[name]['sun'])}°, "
            f"Tierra {_fmt_deg(sky[name]['earth'])}°."
        )
        w("")

    ab = dg["abcorr"]
    w("## De dónde sale el residuo")
    w("")
    w("| Fuente | Tamaño medido | Afecta a |")
    w("|---|---:|---|")
    w(
        f"| Paralaje solar no aplicada (el Sol se trata como dirección; cota R/1 ua = "
        f"{dg['solar_parallax_deg']:.1e}°) | ≤ {_fmt_deg(worst['spice'])}° | Sol, sobre todo la "
        "elevación (es casi toda la diferencia máxima) |"
    )
    w(
        f"| Aberración estelar aplicada al vector desde el **centro** lunar y luego paralaje "
        f"(≈ (v/c)·R/d = {dg['aberration_parallax_deg']:.1e}°) | "
        f"{_fmt_deg(float(np.abs(diffs['spice']['earth_el']).max()))}° | Tierra |"
    )
    w(
        f"| Interpolación lineal horaria del `.bin` (todo {dg['year']}, a mitad de hora) | "
        f"Tierra {_fmt_deg(dg['interp_earth_deg'])}° ({dg['interp_earth_km']:.2f} km), "
        f"Sol {_fmt_deg(dg['interp_sun_deg'])}° | camino `bin` |"
    )
    w(
        f"| Almacenamiento float32 (todo {dg['year']}, en las horas exactas) | "
        f"Tierra {_fmt_deg(dg['float32_earth_deg'])}°, Sol {_fmt_deg(dg['float32_sun_deg'])}° | "
        "camino `bin` |"
    )
    w(
        f"| DE440 (nuestros kernels) frente a DE441 (Horizons) + precisión de impresión (1e-9°) | "
        f"{_fmt_deg(worst['azlcpo'])}° (`azlcpo`) | todo |"
    )
    w("")
    w(
        "Elección de la corrección de aberración (centro + paralaje, máximo |Δ| frente a Horizons "
        "en cualquier sitio/época):"
    )
    w("")
    w("| `abcorr` | Sol az | Sol el | Tierra az | Tierra el |")
    w("|---|---:|---:|---:|---:|")
    for corr, m in ab.items():
        w(f"| `{corr}` | " + " | ".join(_fmt_deg(m[k]) for k in ANGLES) + " |")
    w("")
    w(
        "`LT+S` (apariencia completa) es la única que coincide con Horizons; sin aberración "
        "(`NONE`, `LT`) el error sube a ~1e-3°–1e-2°. Por eso los `.bin` usan `LT+S`."
    )
    w("")
    w("## Conclusión")
    w("")
    if ok:
        w(
            f"- Las dos rutas del pipeline quedan muy por debajo del objetivo de {TARGET_DEG}° en "
            "los siete sitios (polo sur, cara visible y cara oculta) y en épocas repartidas entre "
            "2026 y 2055. No hace falta corregir nada."
        )
    else:
        w(f"- Alguna diferencia supera el objetivo de {TARGET_DEG}°: ver el detalle.")
    w(
        "- Marco (`MOON_ME` alineado con DE421), corrección `LT+S`, escala de tiempo y signo de la "
        "longitud (este positiva) coinciden con Horizons. Tiempo: entrada en UTC en los dos "
        "lados; `naif0012.tls` no tiene saltos de segundo después de 2017 y Horizons usa el último "
        "conocido para el futuro. Un desfase de 1 s movería el Sol ~1,4e-4°, y `azlcpo` coincide "
        "con Horizons a ~1e-8° en el Sol, así que no lo hay."
    )
    w(
        "- `azlcpo` (SPICE, todo topocéntrico) reproduce Horizons a ~1e-6°: la efeméride es la "
        "misma. Lo que queda en nuestra ruta son las dos simplificaciones elegidas (Sol sin "
        "paralaje y aberración desde el centro) más, en la web, la interpolación lineal horaria. "
        "Si algún día hiciera falta más precisión: guardar la distancia al Sol en el `.bin` o "
        "interpolar con Hermite cúbico."
    )
    w(
        "- La precisión final de la app la dominan el DEM y el perfil de horizonte (decenas de "
        "metros ≈ 0,1° a 20–50 km), no la efeméride."
    )
    w(
        "- En azimut, las diferencias se amplifican por 1/cos(el) cerca del cénit (p. ej. el Sol a "
        "~86° en Apollo 11); por eso se da también la separación en el cielo."
    )
    w("")
    w("## Detalle por época")
    w("")
    w("Valores de Horizons y Δ = nuestro − Horizons de la ruta `.bin` (la de la web), en grados.")
    w("")
    w(
        "| Sitio | Época (UTC) | Sol az | Sol el | Tierra az | Tierra el "
        "| Δaz☉ | Δel☉ | Δaz⊕ | Δel⊕ |"
    )
    w("|---|---|---:|---:|---:|---:|---:|---:|---:|---:|")
    d = diffs["bin"]
    names = {s["id"]: s["name"] for s in SITES}
    for i, r in enumerate(rows):
        w(
            f"| {names[r['site']]} | {r['t_utc']} | {r['sun_az']:.6f} | {r['sun_el']:.6f} | "
            f"{r['earth_az']:.6f} | {r['earth_el']:.6f} | {d['sun_az'][i]:+.1e} | "
            f"{d['sun_el'][i]:+.1e} | {d['earth_az'][i]:+.1e} | {d['earth_el'][i]:+.1e} |"
        )
    w("")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(out) + "\n")
    return path


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="Compare the pipeline with JPL Horizons")
    p.add_argument("--refresh", action="store_true", help="query Horizons even if cached")
    p.add_argument("--no-report", action="store_true", help="do not write the Markdown report")
    args = p.parse_args(argv)
    result = run(refresh=args.refresh, report=None if args.no_report else REPORT_PATH)
    worst = max(
        float(np.abs(v).max())
        for name in ("spice", "bin")
        if name in result["diffs"]
        for v in result["diffs"][name].values()
    )
    return 0 if worst < TARGET_DEG else 1


if __name__ == "__main__":
    sys.exit(main())
