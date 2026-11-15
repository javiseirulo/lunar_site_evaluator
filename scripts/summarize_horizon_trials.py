"""Summarize reproducible trial horizons; never publish production profiles."""
import csv
import json
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
FOLDER = ROOT / "web/public/data/terrain/trials"


def main():
    profiles = {}
    for path in sorted(FOLDER.glob("*.json")):
        if path.name == "benchmark.json":
            continue
        profile = json.loads(path.read_text(encoding="utf-8"))
        if "elevation_deg" in profile:  # first pilot, produced before adapter names
            profile["elev_deg"] = profile.pop("elevation_deg")
            profile["site_id"] = "shackleton_rim_01"
            profile["max_range_km"] = profile["max_range_m"] / 1000
            profile["source"] = "; ".join(k for k, v in profile["source_sample_counts"].items() if v)
        profile["source_integrity"] = {}
        for source_id, count in profile["source_sample_counts"].items():
            provenance = ROOT / "data/terrain" / source_id / "provenance.json"
            if count and provenance.exists():
                source = json.loads(provenance.read_text(encoding="utf-8"))
                profile["source_integrity"][source_id] = {key: source.get(key) for key in
                    ("url", "sha256_local", "actual_bytes", "reference_frame")}
        path.write_text(json.dumps(profile, separators=(",", ":"), allow_nan=False) + "\n", encoding="utf-8", newline="\n")
        values = np.array(profile["elev_deg"], dtype=float)
        profiles[path.name] = {"lat": profile["lat"], "lon": profile["lon"],
                              "azimuths": len(values), "az_step_deg": profile["az_step_deg"],
                              "refinement": profile["radial_refinement"], "elapsed_s": profile["elapsed_s"],
                              "complete_rays": sum(profile["complete"]),
                              "minimum_deg": float(np.nanmin(values)), "maximum_deg": float(np.nanmax(values))}
    def load(name):
        return json.loads((FOLDER / name).read_text(encoding="utf-8"))
    base = load("shackleton_fixture_01deg.json")
    refined = load("shackleton_fixture_01deg_refined.json")
    finest = load("shackleton_fixture_01deg_refined4.json")
    def compare(a, b):
        difference = np.abs(np.array(a["elev_deg"]) - np.array(b["elev_deg"]))
        return {"max_difference_deg": float(difference.max()),
                "rays_exceeding_005_deg": int((difference > .05).sum())}
    summary = {"version": 1, "status": "experimental_not_for_mission_scoring",
               "production_profiles_ready": 0, "profiles": profiles,
               "radial_1x_vs_2x": compare(base, refined), "radial_2x_vs_4x": compare(refined, finest),
               "range_difference_from_310km_deg": {key: float(np.max(np.abs(np.array(values) -
                    np.array(finest["elev_deg"])))) for key, values in finest["range_comparison_deg"].items()},
               "notes": ["Benchmark on one fixture coordinate, not the approved polar catalogue.",
                         "Runtime varies with disk cache and concurrent UI/build workload.",
                         "0.1 degree azimuth sampling is not yet independently converged against a finer angular step.",
                         "Coarse global DEM does not resolve local metre-scale obstructions."]}
    (FOLDER / "benchmark.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8", newline="\n")
    with (FOLDER / "shackleton_fixture_01deg.csv").open("w", encoding="utf-8", newline="") as stream:
        writer = csv.writer(stream, lineterminator="\n")
        writer.writerow(["azimuth_deg", "horizon_elevation_deg", "peak_distance_m"])
        writer.writerows(zip(finest["azimuth_deg"], finest["elev_deg"], finest["peak_distance_m"]))
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
