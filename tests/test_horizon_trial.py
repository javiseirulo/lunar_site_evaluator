"""Geometry and missing-data regressions for the independent horizon prototype."""
import unittest
import tempfile
from pathlib import Path
import numpy as np
import rasterio
from rasterio.transform import from_origin
from python.terrain.horizon_trial import ROOT, POLAR_CRS, RADIUS, bilinear, compute, destination, elevation_angle, radial_samples


class HorizonGeometryTest(unittest.TestCase):
    def test_spherical_horizon_matches_analytic_dip(self):
        height = 5
        angle = np.arccos(RADIUS / (RADIUS + height))
        self.assertAlmostEqual(float(elevation_angle(RADIUS * angle, 0, 0, height)),
                               -np.rad2deg(angle), places=10)

    def test_far_surface_includes_curvature_once(self):
        distance = 300000
        self.assertAlmostEqual(float(elevation_angle(distance, 0, 0, 0)),
                               -np.rad2deg(distance / RADIUS / 2), places=9)
        self.assertGreater(float(elevation_angle(1000, 500, 0)), 20)

    def test_absolute_ground_height_and_observer_height(self):
        self.assertAlmostEqual(float(elevation_angle(100, 1000, 1000, 5)),
                               float(elevation_angle(100 * (RADIUS + 1000) / RADIUS, 0, 0, 5,
                                                     radius=RADIUS + 1000)), places=9)
        self.assertLess(float(elevation_angle(100, 0, 0, 20)), float(elevation_angle(100, 0, 0, 5)))

    def test_geodesic_north_east_and_dateline(self):
        lat, lon = destination(0, 179.99, [0, 90], [1000])
        self.assertGreater(lat[0, 0], 0)
        self.assertAlmostEqual(lat[1, 0], 0)
        self.assertLess(lon[1, 0], -179)
        for pole in (-90, 90):
            lat, lon = destination(pole, 45, [0, 90, 180, 270], [1000])
            self.assertTrue(np.isfinite(lat + lon).all())
            np.testing.assert_allclose(np.abs(lat), 90 - np.rad2deg(1000 / RADIUS))
            self.assertEqual(len(np.unique(np.round(lon, 4))), 4)

    def test_holes_remain_unknown_and_longitude_wraps(self):
        values = np.array([[1., 2, 3], [4, 5, 6], [7, 8, 9]])
        self.assertEqual(float(bilinear(values, np.array([.5]), np.array([.5]))[0]), 3)
        self.assertTrue(np.isnan(bilinear(values, np.array([-.5]), np.array([.5]))[0]))
        self.assertTrue(np.isfinite(bilinear(values, np.array([.5]), np.array([-.5]), wrap=True)[0]))
        values[1, 1] = np.nan
        self.assertTrue(np.isnan(bilinear(values, np.array([.5]), np.array([.5]))[0]))

    def test_radial_boundaries_and_refinement(self):
        coarse, fine = radial_samples(310000), radial_samples(310000, 2)
        self.assertTrue(np.all(np.diff(coarse) > 0))
        self.assertTrue(set(coarse).issubset(set(fine)))
        for value in (5000, 80000, 150000, 200000, 300000, 310000):
            self.assertIn(value, coarse)
        self.assertEqual(coarse[-1], 310000)

    def test_full_profile_on_known_sphere_and_missing_obstruction(self):
        scratch = ROOT / "data/test-scratch"
        scratch.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=scratch) as temporary:
            root = Path(temporary)
            folder = root / "lola-south-pole-5m"
            folder.mkdir()
            path = folder / "ldem_87s_5mpp.tif"
            values = np.full((512, 512), 100., dtype="float32")
            def write():
                with rasterio.open(path, "w", driver="GTiff", width=512, height=512, count=1,
                                   dtype="float32", crs=POLAR_CRS,
                                   transform=from_origin(-1280, 1280, 5, 5), nodata=np.nan) as dataset:
                    dataset.write(values, 1)
            write()
            profile = compute(-90, 0, root, az_step=5, max_range=1000)
            self.assertEqual(sum(profile["complete"]), 72)
            np.testing.assert_allclose(profile["elev_deg"], float(elevation_angle(1000, 100, 100)))
            values[100:150, 230:280] = np.nan
            write()
            incomplete = compute(-90, 0, root, az_step=5, max_range=1000)
            self.assertLess(sum(incomplete["complete"]), 72)
            self.assertGreater(sum(incomplete["complete"]), 0)
            self.assertIsNone(incomplete["elev_deg"][0])


if __name__ == '__main__':
    unittest.main()
