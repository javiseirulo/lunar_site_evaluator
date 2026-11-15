"""Numeric export contracts for Pablo's terrain producer, with a synthetic DEM."""

import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

import numpy as np
import rasterio
from rasterio.transform import from_origin

SPEC = importlib.util.spec_from_file_location("export_patch", Path(__file__).parents[1] / "python/terrain/export_patch.py")
module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(module)


class TerrainPatchContracts(unittest.TestCase):
    def setUp(self):
        scratch = Path(__file__).parents[1] / "data" / "test-scratch"
        scratch.mkdir(parents=True, exist_ok=True)
        self.temporary = tempfile.TemporaryDirectory(dir=scratch)
        self.folder = Path(self.temporary.name)
        self.source = self.folder / "source.tif"
        values = np.arange(64, dtype="float32").reshape(8, 8) - 32
        values[1, 1] = np.nan
        with rasterio.open(self.source, "w", driver="GTiff", width=8, height=8,
                           count=1, dtype="float32", nodata=np.nan,
                           crs="+proj=stere +lat_0=-90 +lon_0=0 +R=1737400 +units=m +no_defs",
                           transform=from_origin(-20, 20, 5, 5)) as target:
            target.write(values, 1)
            target.scales = (0.5,)
            target.offsets = (-100,)

    def tearDown(self):
        self.temporary.cleanup()

    def export(self, **options):
        defaults = dict(column=1, row=1, width=4, height=4, height_unit="m", frame="MOON_ME_DE421")
        defaults.update(options)
        return module.export_patch(self.source, self.folder / "export", **defaults)

    def test_mask_quantization_scale_and_pixel_center_roundtrip(self):
        result = self.export()
        output = self.folder / "export"
        with rasterio.open(output / "heightmap.png") as dataset:
            encoded = dataset.read(1)
            self.assertEqual(dataset.dtypes[0], "uint16")
        with rasterio.open(output / "valid.png") as dataset:
            valid = dataset.read(1).astype(bool)
        raw = np.fromfile(output / "heights.f32", dtype="<f4").reshape(4, 4)
        decoded = result["heightmap"]["offset_m"] + encoded * result["heightmap"]["scale_m"]
        self.assertFalse(valid[0, 0])
        self.assertTrue(np.isnan(raw[0, 0]))
        self.assertEqual(raw[0, 1], -111.0)  # source DN -22 * 0.5 - 100
        np.testing.assert_allclose(decoded[valid], raw[valid], rtol=0,
                                   atol=result["heightmap"]["maximum_quantization_error_m"] + 1e-8)
        self.assertEqual(result["sample_0_0_center_projected"], [-12.5, 12.5])
        self.assertEqual(result["sample_step_row_projected"], [0, -5])
        self.assertEqual(json.loads((output / "manifest.json").read_text())["valid_pixels"], 15)

    def test_outside_coverage_is_rejected_without_export(self):
        with self.assertRaisesRegex(ValueError, "outside"):
            self.export(column=6)
        self.assertFalse((self.folder / "export").exists())

    def test_infinite_source_sample_becomes_masked_nan(self):
        with rasterio.open(self.source, "r+") as dataset:
            values = dataset.read(1)
            values[1, 2] = np.inf
            dataset.write(values, 1)
        result = self.export()
        raw = np.fromfile(self.folder / "export/heights.f32", dtype="<f4").reshape(4, 4)
        self.assertTrue(np.isnan(raw[0, 1]))
        self.assertEqual(result["valid_pixels"], 14)

    def test_empty_patch_is_rejected(self):
        with rasterio.open(self.source, "r+") as dataset:
            dataset.write(np.full((8, 8), np.nan, dtype="float32"), 1)
        with self.assertRaisesRegex(ValueError, "no valid"):
            self.export()

    def test_partial_source_requires_explicit_opt_in(self):
        partial = self.source.with_suffix(".tif.part")
        self.source.rename(partial)
        with self.assertRaisesRegex(ValueError, "Incomplete source"):
            module.export_patch(partial, self.folder / "export", column=0, row=0,
                                width=4, height=4, height_unit="m", frame="MOON_ME_DE421")


if __name__ == "__main__":
    unittest.main()
