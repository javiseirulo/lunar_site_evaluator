"""Closed team decisions, absent scientific data and unchanged surface bytes."""
from copy import deepcopy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).parents[1]
SPEC = importlib.util.spec_from_file_location("prepare_handoff", ROOT / "python/terrain/prepare_handoff.py")
module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(module)


class TerrainHandoffDecisions(unittest.TestCase):
    def setUp(self):
        self.settings = module.read(ROOT / "config/terrain-processing.json")
        self.catalog = module.read(ROOT / "config/terrain-sources.json")

    def test_azimuth_grids_cover_full_circle_without_duplicate_north(self):
        module.validate(self.settings, self.catalog)
        curated = module.azimuths(self.settings, "curated")
        cells = module.azimuths(self.settings, "heatmap")
        self.assertEqual(len(curated), 3600)
        self.assertEqual(curated[0], 0)
        self.assertAlmostEqual(curated[-1], 359.9)
        self.assertEqual(len(cells), 360)
        self.assertEqual(cells[-1], 359)

    def test_wrong_observer_coarse_curated_grid_and_short_range_rejected(self):
        for key, value in (("height", 1.7), ("azimuth", 1), ("range", 20)):
            config = deepcopy(self.settings)
            if key == "height":
                config["observer_height_m"] = value
            elif key == "azimuth":
                config["horizon"]["curated"] = {"az_step_deg": value, "sample_count": 360}
            else:
                config["horizon"]["max_range_km"] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                module.validate(config, self.catalog)

    def test_gap_in_source_rings_and_ambiguous_earth_origin_rejected(self):
        config = deepcopy(self.settings)
        config["horizon"]["source_rings"][1]["from_km"] = 6
        with self.assertRaisesRegex(ValueError, "contiguous"):
            module.validate(config, self.catalog)
        config = deepcopy(self.settings)
        config["ephemerides"]["earth_origin"] = "earth_center"
        with self.assertRaisesRegex(ValueError, "parallax"):
            module.validate(config, self.catalog)

    def test_non_divisor_step_and_filled_missing_coverage_rejected(self):
        config = deepcopy(self.settings)
        config["horizon"]["curated"]["az_step_deg"] = 0.7
        with self.assertRaisesRegex(ValueError, "exactly"):
            module.validate(config, self.catalog)
        config = deepcopy(self.settings)
        config["horizon"]["missing_terrain"] = "zero"
        with self.assertRaisesRegex(ValueError, "unknown"):
            module.validate(config, self.catalog)

    def test_preparation_never_adds_five_metres_or_invents_ready_profiles(self):
        scratch = ROOT / "data/test-scratch"
        scratch.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=scratch) as temporary:
            folder = Path(temporary)
            terrain = folder / "data/terrain"
            terrain.mkdir(parents=True)
            heights = terrain / "heights.f32"
            heights.write_bytes(bytes(16))
            module.write(terrain / "heightmap.json", {"sha256": {"heights.f32": module.digest(heights)}})
            original_manifest = (terrain / "heightmap.json").read_bytes()
            module.write(terrain / "site-terrain.json", {"input_sites_mock": True,
                         "sites": [{"id": "fixture", "terrain_valid": True}]})
            result = module.prepare(ROOT / "config/terrain-processing.json", ROOT / "config/terrain-sources.json",
                                    folder / "data", folder / "raw")
            self.assertEqual(heights.read_bytes(), bytes(16))
            self.assertEqual((terrain / "heightmap.json").read_bytes(), original_manifest)
            self.assertFalse(result["heightmap"]["observer_offset_applied"])
            self.assertEqual(result["horizon"]["ready_profiles"], 0)
            self.assertEqual(result["horizon"]["status"], "pending_computation_and_validation")
            self.assertTrue(result["site_terrain"]["input_sites_mock"])
            self.assertTrue(all(not item["available_locally"] for item in result["sources"]))
            self.assertFalse((folder / "data/horizon").exists())
            self.assertEqual(result["ephemerides"]["status"], "pending_Javi_contract_and_data")
