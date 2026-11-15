"""Attach truthful production settings to the existing DEM handoff.

AI-assisted: OpenAI Codex. This does not calculate or publish horizon profiles
or ephemerides. Existing heightmap bytes and their manifest are preserved.
"""

import argparse
from copy import deepcopy
import hashlib
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def write(path, value):
    path = Path(path)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, indent=2, allow_nan=False) + "\n", encoding="utf-8", newline="\n")
    temporary.replace(path)


def azimuths(settings, preset):
    item = settings["horizon"][preset]
    step, count = item["az_step_deg"], item["sample_count"]
    if not (math.isfinite(step) and step > 0 and isinstance(count, int)
            and count > 0 and math.isclose(step * count, 360, abs_tol=1e-9)):
        raise ValueError("Azimuth samples must cover exactly 360 degrees without duplicating the endpoint")
    return [index * step for index in range(count)]


def validate(settings, catalog):
    if settings["version"] != 1 or settings["observer_height_m"] != 5:
        raise ValueError("Javi J0 requires a 5 m observer")
    if settings["reference_frame"] != "MOON_ME_DE421" or settings["radius_m"] != 1737400:
        raise ValueError("DEM frame and reference sphere must be explicit")
    for preset, count in (("curated", 3600), ("heatmap", 360)):
        if len(azimuths(settings, preset)) != count:
            raise ValueError("Azimuth preset differs from Javi J0")
    h = settings["horizon"]
    if h["max_range_km"] < 150 or h["validation_ranges_km"][-1] < h["max_range_km"]:
        raise ValueError("Far terrain and convergence radius are insufficient")
    if h["curvature"] != "spherical_geometry" or h["missing_terrain"] != "unknown_never_zero":
        raise ValueError("Curvature and unknown coverage must be preserved")
    previous = 0
    sources = {item["id"]: item for item in catalog["sources"]}
    for ring in h["source_rings"]:
        if ring["from_km"] != previous or ring["to_km"] <= previous:
            raise ValueError("Source rings must be contiguous and increasing")
        for ident in (ring["preferred_source"], ring["fallback_source"]):
            if ident is not None and (ident not in sources or sources[ident]["reference_frame"] != "MOON_ME, JPL DE421"):
                raise ValueError("Every source must have the same documented DEM frame")
        previous = ring["to_km"]
    if previous < h["validation_ranges_km"][-1]:
        raise ValueError("Source rings must reach the convergence radius")
    e = settings["ephemerides"]
    if e["values_per_sample"] != 6 or len(e["layout"]) != 6 or e["encoding"] != "float32-le":
        raise ValueError("Annual ephemerides require six little-endian Float32 values")
    if e["earth_origin"] != "moon_center" or not e["frame_realization_confirmation_required"]:
        raise ValueError("Earth parallax and lunar frame realization must be explicit")


def prepare(settings_file, catalog_file, data_root, raw_root):
    settings, catalog = read(settings_file), read(catalog_file)
    validate(settings, catalog)
    data_root, raw_root = Path(data_root), Path(raw_root)
    if any((data_root / "horizon").glob("*.json")):
        raise ValueError("Horizon files already exist; do not replace their production status with this planning handoff")
    terrain = data_root / "terrain"
    mesh = read(terrain / "heightmap.json")
    for name, expected in mesh["sha256"].items():
        if digest(terrain / name) != expected:
            raise ValueError(f"Existing terrain payload changed: {name}")
    source_states = []
    for source in catalog["sources"]:
        if "slope" in source["id"]:
            continue
        status_path = raw_root / source["id"] / "download-status.json"
        status = read(status_path) if status_path.exists() else {}
        local_file = raw_root / source["id"] / source["filename"]
        complete = (status.get("status") == "complete" and local_file.is_file()
                    and local_file.stat().st_size == source["expected_bytes"])
        source_states.append({"id": source["id"], "source": source["url"],
                              "pixel_spacing_m": source["pixel_spacing_m"],
                              "coverage": source["coverage"], "available_locally": complete,
                              "sha256_local": status.get("sha256") if complete else None})
    sites = read(terrain / "site-terrain.json")
    write(terrain / "processing.json", settings)
    delivery = {
        "version": 1, "context_commit": settings["context_commit"],
        "heightmap": {"status": "ready", "file": "terrain/heightmap.json",
                      "sha256": digest(terrain / "heightmap.json"), "observer_offset_applied": False},
        "layers": {"status": "ready", "file": "terrain/layers.json"},
        "site_terrain": {"status": "ready", "file": "terrain/site-terrain.json",
                         "input_sites_mock": sites["input_sites_mock"],
                         "valid_sites": sum(item["terrain_valid"] for item in sites["sites"])},
        "production_settings": {"file": "terrain/processing.json", "sha256": digest(terrain / "processing.json")},
        "horizon": {**deepcopy(settings["horizon"]), "observer_height_m": settings["observer_height_m"],
                    "status": "pending_computation_and_validation", "ready_profiles": 0,
                    "catalogue_issue": settings["coverage"]["catalogue_issue"],
                    "candidate_fixture_ids": [item["id"] for item in sites["sites"]]},
        "sources": source_states,
        "ephemerides": {**settings["ephemerides"], "status": "pending_Javi_contract_and_data",
                        "legacy_mock_timeseries_are_not_30_year_ephemerides": True},
        "limitations": ["Source availability does not prove full ray coverage or validated horizons",
                        "The catalogue is decided by product issue #48; fixture coordinates are not curated landing sites",
                        "MOON_ME DE421 versus DE440 alignment must be confirmed before combining real data"]}
    write(terrain / "delivery.json", delivery)
    return delivery


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--settings", type=Path, default=ROOT / "config/terrain-processing.json")
    parser.add_argument("--catalog", type=Path, default=ROOT / "config/terrain-sources.json")
    parser.add_argument("--data", type=Path, default=ROOT / "web/public/data")
    parser.add_argument("--raw", type=Path, default=ROOT / "data/terrain")
    args = parser.parse_args()
    value = prepare(args.settings, args.catalog, args.data, args.raw)
    print(json.dumps({"heightmap": value["heightmap"]["status"], "horizon": value["horizon"]["status"],
                      "ready_profiles": value["horizon"]["ready_profiles"]}, indent=2))


if __name__ == "__main__":
    main()
