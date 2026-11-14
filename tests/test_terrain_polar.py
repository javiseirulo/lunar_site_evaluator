"""Projection, registration, NoData and consumer checks on synthetic rasters."""

import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.transform import from_origin

ROOT = Path(__file__).parents[1]
SPEC = importlib.util.spec_from_file_location("export_polar", ROOT / "python/terrain/export_polar.py")
module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(module)
PROJECTION = "+proj=stere +lat_0=-90 +lon_0=0 +k=1 +R=1737400 +units=m +no_defs"


class PolarTerrainContracts(unittest.TestCase):
    def setUp(self):
        scratch = ROOT / "data/test-scratch"
        scratch.mkdir(parents=True, exist_ok=True)
        self.temporary = tempfile.TemporaryDirectory(dir=scratch)
        self.folder = Path(self.temporary.name)
        self.layers = {"version": 1, "mock": True, "projection": PROJECTION, "radius_m": 1737400,
                       "bounds_m": [-240, -240, 240, 240], "lat_limit": -80,
                       "width_px": 4, "height_px": 4,
                       "layers": [{"id": name, "label": name, "encoding": "gray8"}
                                  for name in ("elevation", "slope")]}
        self.height = self.folder / "height.TIF"
        self.slope = self.folder / "slope.TIF"
        x, y = np.meshgrid(np.arange(-280, 320, 80), np.arange(280, -320, -80))
        # A plane gives an analytic answer, independently of the resampling code.
        values = 1000 + 0.02 * x + 0.01 * y
        for path, pixels in ((self.height, values), (self.slope, np.full((8, 8), 12))):
            with rasterio.open(path, "w", driver="GTiff", width=8, height=8, count=1,
                               dtype="float32", crs=PROJECTION, nodata=np.nan,
                               transform=from_origin(-320, 320, 80, 80)) as dataset:
                dataset.write(pixels.astype("float32"), 1)
        self.catalog = {"sources": [
            {"filename": path.name, "expected_bytes": path.stat().st_size,
             "quantity": quantity, "reference_frame": "MOON_ME, JPL DE421", "url": "https://example.invalid/source"}
            for path, quantity in ((self.height, "surface height, meters"),
                                   (self.slope, "publisher digital slope map, degrees"))]}
        module.write_json(self.folder / "layers.json", self.layers)
        module.write_json(self.folder / "catalog.json", self.catalog)
        module.write_json(self.folder / "sites.json", {"mock": True, "sites": [
            {"id": "pole", "lat": -90, "lon": 0}, {"id": "outside", "lat": -60, "lon": 0}]})

    def tearDown(self):
        self.temporary.cleanup()

    def export(self):
        return module.export_polar(self.height, self.slope, self.folder / "layers.json",
            self.folder / "sites.json", self.folder / "terrain", catalog_file=self.folder / "catalog.json", size=5,
            verification_output=self.folder / "gis")

    def test_vertices_include_extrema_and_preserve_orientation_and_height(self):
        values, transform = module.resample(self.height, self.layers, 5, "vertices", Resampling.bilinear)
        self.assertEqual(transform * (0.5, 0.5), (-240, 240))
        self.assertEqual(transform * (4.5, 4.5), (240, -240))
        np.testing.assert_allclose(values[[0, 2, 4], [0, 2, 4]], [997.6, 1000, 1002.4], atol=0.001)
        self.assertGreater(values[0, 2], values[-1, 2])

    def test_scale_offset_applied_once_and_missing_source_stays_nan(self):
        with rasterio.open(self.height, "r+") as dataset:
            dataset.scales, dataset.offsets = (2,), (-500,)
        values, _ = module.resample(self.height, self.layers, 5, "vertices", Resampling.bilinear)
        self.assertAlmostEqual(values[2, 2], 1500)
        with rasterio.open(self.height, "r+") as dataset:
            dataset.write(np.full((8, 8), np.nan, dtype="float32"), 1)
        values, _ = module.resample(self.height, self.layers, 5, "vertices", Resampling.bilinear)
        self.assertTrue(np.isnan(values).all())

    def test_square_corners_outside_latitude_cap_are_invalid(self):
        manifest = {**self.layers, "lat_limit": -89.995}
        values, _ = module.resample(self.height, manifest, 5, "vertices", Resampling.bilinear)
        self.assertTrue(np.isnan(values[0, 0]))
        self.assertTrue(np.isfinite(values[2, 2]))

    def test_deliverable_binary_mask_alpha_sites_and_checksums(self):
        result = self.export()
        folder = self.folder / "terrain"
        heights = np.fromfile(folder / "heights.f32", dtype="<f4").reshape(5, 5)
        valid = np.fromfile(folder / "valid.u8", dtype="uint8").reshape(5, 5)
        self.assertEqual((folder / "heights.f32").stat().st_size, 100)
        self.assertEqual(heights[2, 2], 1000)
        np.testing.assert_array_equal(valid, np.isfinite(heights))
        with rasterio.open(self.folder / "gis/heightmap.tif") as dataset:
            self.assertEqual(dataset.xy(0, 0), (-240, 240))
            self.assertEqual(dataset.units[0], "m")
            np.testing.assert_array_equal(dataset.read(1), heights)
        with rasterio.open(folder / "slope.png") as image:
            gray, alpha = image.read()
            self.assertTrue((alpha == 255).all())
            self.assertTrue((gray == 0).all())  # constant field; range is [12, 12]
        sites = json.loads((folder / "site-terrain.json").read_text())
        self.assertTrue(sites["input_sites_mock"])
        self.assertEqual(sites["sites"][0]["slope_deg"], 12)
        self.assertFalse(sites["sites"][1]["terrain_valid"])
        self.assertIsNone(sites["sites"][1]["elevation_m"])
        for filename, digest in result["sha256"].items():
            self.assertEqual(module.fingerprint(folder / filename), digest)

    def test_partial_and_wrong_frame_are_rejected(self):
        with self.assertRaisesRegex(ValueError, "complete"):
            module.source_info(self.height.with_suffix(".TIF.part"), self.catalog)
        self.catalog["sources"][0]["reference_frame"] = "MOON_PA"
        module.write_json(self.folder / "catalog.json", self.catalog)
        with self.assertRaisesRegex(ValueError, "frame"):
            self.export()

    def test_js_consumer_accepts_export_and_rejects_corrupted_binary(self):
        self.export()
        command = ["node", str(ROOT / "scripts/check-terrain-delivery.mjs"), str(self.folder)]
        good = subprocess.run(command, capture_output=True, text=True)
        self.assertEqual(good.returncode, 0, good.stderr)
        path = self.folder / "terrain/heights.f32"
        payload = bytearray(path.read_bytes())
        payload[0] ^= 1
        path.write_bytes(payload)
        bad = subprocess.run(command, capture_output=True, text=True)
        self.assertNotEqual(bad.returncode, 0)
        self.assertIn("SHA-256 mismatch", bad.stderr)

    def test_projection_mismatch_is_not_silently_reinterpreted(self):
        with rasterio.open(self.height, "r+") as dataset:
            dataset.crs = "EPSG:4326"
        with self.assertRaisesRegex(ValueError, "projection"):
            module.resample(self.height, self.layers, 5, "vertices", Resampling.bilinear)


if __name__ == "__main__":
    unittest.main()
