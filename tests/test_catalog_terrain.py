"""Scientific geometry and actual publication checks for the curated handoff."""
import json
import unittest
from pathlib import Path
import tempfile
import numpy as np
import rasterio
from rasterio.crs import CRS
from rasterio.transform import from_origin
from python.terrain.horizon_trial import RADIUS, polar_xy
from python.terrain.export_polar import same_projection
from python.terrain.catalog import ROOT, catalog_sites
from python.terrain.psr import mapped_cells


class CatalogTerrainTest(unittest.TestCase):
    def test_north_stereographic_axes_and_equivalent_crs(self):
        x,y=polar_xy(np.array([89.,89.]),np.array([0.,90.]),pole=1)
        self.assertAlmostEqual(float(x[0]),0,places=8)
        self.assertLess(y[0],0)
        self.assertGreater(x[1],0)
        self.assertAlmostEqual(float(y[1]),0,places=8)
        a=CRS.from_string(f'+proj=stere +lat_0=90 +lat_ts=90 +R={RADIUS} +units=m')
        b=CRS.from_string(f'+proj=stere +lat_0=90 +k=1 +R={RADIUS} +units=m')
        self.assertTrue(same_projection(a,b))

    def test_published_profiles_match_current_sourced_coordinates(self):
        catalog=catalog_sites(ROOT/'python/export/catalog.yaml')
        self.assertEqual(len(catalog),59)
        polar=[s for s in catalog if abs(s['lat'])>=80]
        self.assertEqual(len(polar),41)
        for site in polar:
            path=ROOT/'web/public/data/horizon'/f"{site['id']}.json"
            self.assertTrue(path.is_file(),site['id'])
            p=json.loads(path.read_text())
            self.assertEqual((p['lat'],p['lon']),(site['lat'],site['lon']))
            self.assertEqual(p['site_id'],site['id'])
            self.assertEqual(p['observer_height_m'],5)
            self.assertEqual(len(p['elev_deg']),3600)
            self.assertTrue(np.isfinite(p['elev_deg']).all())
            self.assertEqual(p['az_step_deg'],.1)
            self.assertEqual(p['max_range_km'],310)
            self.assertLessEqual(p['validation']['radial_max_delta_deg'],.05)
            self.assertTrue(all(p['complete']))
            self.assertTrue(p['source_integrity'])

    def test_binary_psr_aggregation_keeps_isolated_native_pixel(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'mask.tif'
            crs=CRS.from_string(f'+proj=stere +lat_0=90 +k=1 +R={RADIUS} +units=m')
            values=np.zeros((24,24),dtype='float32')
            values[1,1]=1
            with rasterio.open(path,'w',driver='GTiff',width=24,height=24,count=1,
                dtype='float32',crs=crs,transform=from_origin(-240,240,20,20),nodata=float('nan')) as ds:
                ds.write(values,1)
            vectors=mapped_cells(path,1,'synthetic',Path(folder)/'cache')
            self.assertEqual(vectors.shape,(1,3))
            self.assertAlmostEqual(float(np.linalg.norm(vectors[0])),1.)
            with self.assertRaises(ValueError):
                mapped_cells(path,-1,'wrong-pole',Path(folder)/'cache')

    def test_published_terrain_does_not_invent_unmapped_psr_metrics(self):
        payload=json.loads((ROOT/'web/public/data/terrain/catalog.json').read_text())
        self.assertFalse(payload['mock'])
        self.assertEqual(len(payload['sites']),59)
        for site in payload['sites']:
            self.assertTrue(np.isfinite([site['elev_m'],site['slope_deg']]).all())
            self.assertLessEqual(site['slope_deg'],90)
            self.assertGreaterEqual(site['slope_deg'],0)
            self.assertEqual(site['slope_coarse'],abs(site['lat'])<80)
            if abs(site['lat'])<80:
                self.assertIsNone(site['psr_dist_km'])
                self.assertTrue(site['psr_distance_is_upper_bound'])
            else:
                self.assertGreaterEqual(site['psr_dist_km'],0)


if __name__=='__main__':
    unittest.main()
