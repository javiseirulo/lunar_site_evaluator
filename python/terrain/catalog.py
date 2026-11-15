"""Terrain handoff for Javi's sourced catalogue. AI-assisted: OpenAI Codex.

Never changes sites.json or mission scores. Profiles are sampled terrain
estimates with explicit numerical checks and source resolutions, not certified
landing predictions. Resume only when catalogue, code and source hashes match.
"""
import argparse
import csv
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path

import numpy as np
import rasterio
from rasterio.windows import Window
import yaml

from .horizon_trial import ROOT, RADIUS, GlobalDem, PolarDem, compute, destination


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def write_json(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(data, separators=(',', ':'), allow_nan=False) + '\n',
                         encoding='utf8', newline='\n')
    temporary.replace(path)


def catalog_sites(path):
    data = yaml.safe_load(Path(path).read_text(encoding='utf8'))
    sites = data['sites']
    ids = set()
    for site in sites:
        if site['id'] in ids or not site.get('source_url') or not (-90 <= site['lat'] <= 90 and -180 <= site['lon'] <= 180):
            raise ValueError('Invalid or unsourced catalogue coordinate')
        ids.add(site['id'])
    return sites


def sources(root):
    result = {}
    for path in sorted(root.glob('*/provenance.json')):
        p = json.loads(path.read_text(encoding='utf8'))
        if p.get('sha256_local'):
            result[p['id']] = {key: p.get(key) for key in
                ('url', 'actual_bytes', 'sha256_local', 'quantity', 'reference_frame')}
    return result


def nearest_value(path, lat, lon):
    """Publisher slope at its native pixel, not slope of the display mesh."""
    if not path.exists():
        return None
    from rasterio.warp import transform
    with rasterio.open(path) as ds:
        geographic = ds.crs.geodetic_crs if hasattr(ds.crs, 'geodetic_crs') else None
        # Geographic sphere with the same radius and prime meridian as the DEM.
        x, y = transform(f'+proj=longlat +R={RADIUS} +no_defs', ds.crs, [lon], [lat])
        row, col = ds.index(x[0], y[0])
        if not (0 <= row < ds.height and 0 <= col < ds.width):
            return None
        value = ds.read(1, window=Window(col, row, 1, 1), masked=True)
        if not value.count():
            return None
        result = float(value[0, 0] * ds.scales[0] + ds.offsets[0])
        return result if np.isfinite(result) else None


def point_terrain(site, root, global_dem):
    lat, lon = site['lat'], site['lon']
    candidates = []
    if lat <= -80:
        candidates = [('lola-south-pole-5m', 'ldem_87s_5mpp.tif', -1),
                      ('lola-south-pole-80m', 'LDEM_80S_80MPP_ADJ.TIF', -1),
                      ('lola-south-pole-far-240m', 'LDEM_60S_240MPP_ADJ.TIF', -1)]
    elif lat >= 80:
        candidates = [('lola-north-pole-80m', 'LDEM_80N_80MPP_ADJ.TIF', 1),
                      ('lola-north-pole-far-240m', 'LDEM_60N_240MPP_ADJ.TIF', 1)]
    elevation = None
    elevation_source = None
    for source_id, filename, pole in candidates:
        path = root / source_id / filename
        if not path.exists():
            continue
        value = float(PolarDem(path, lat, lon, 1000, pole).sample(np.array([lat]), np.array([lon]))[0])
        if np.isfinite(value):
            elevation, elevation_source = value, source_id
            break
    if elevation is None:
        elevation = float(global_dem.sample(np.array([lat]), np.array([lon]))[0])
        elevation_source = 'lola-global-64ppd'
    pole = 'south' if lat < 0 else 'north'
    suffix = 'S' if lat < 0 else 'N'
    slope_source = f'lola-{pole}-pole-slope-80m'
    slope = nearest_value(root / slope_source / f'LDSM_80{suffix}_80MPP_ADJ.TIF', lat, lon)
    coarse = slope is None
    if coarse:
        # 1 km baseline on the global ~474 m DEM, never a landing-scale slope.
        ll, ln = destination(lat, lon, [0, 90, 180, 270], [500])
        z = global_dem.sample(ll[:, 0], ln[:, 0])
        slope = float(np.rad2deg(np.arctan(np.hypot((z[0]-z[2])/1000, (z[1]-z[3])/1000))))
        slope_source = 'lola-global-64ppd; central differences over 1000 m'
    return {**site, 'elev_m': elevation, 'elevation_source': elevation_source,
            'slope_deg': slope, 'slope_source': slope_source, 'slope_coarse': coarse,
            'psr_dist_km': None, 'psr_source': 'not yet processed'}


def profile_for(site, root, output, source_info, signature):
    path = output / 'horizon' / f"{site['id']}.json"
    hemisphere = 'south' if site['lat'] < 0 else 'north'
    input_hashes = {key: value['sha256_local'] for key, value in source_info.items()
                    if ('global' in key or hemisphere in key) and 'slope' not in key and key.startswith('lola-')}
    if path.exists():
        previous = json.loads(path.read_text())
        if (previous.get('processing_signature') == signature and previous.get('input_source_hashes') == input_hashes
                and previous['lat'] == site['lat'] and previous['lon'] == site['lon']):
            print('Reusing', site['id'], flush=True)
            return previous
    print('Computing', site['id'], flush=True)
    low = compute(site['lat'], site['lon'], root, az_step=.1, refinement=1)
    high = None
    delta = float('inf')
    for refinement in (2, 4, 8, 16):
        high = compute(site['lat'], site['lon'], root, az_step=.1, refinement=refinement)
        if not all(high['complete']):
            raise ValueError('Missing ray samples for ' + site['id'])
        delta = float(np.max(np.abs(np.asarray(high['elev_deg']) - np.asarray(low['elev_deg']))))
        if delta <= .05:
            break
        low = high
    if delta > .05:
        raise ValueError(f"Radial refinement not converged for {site['id']}: {delta}")
    assert high is not None
    high['site_id'] = site['id']
    high['status'] = 'sampled_terrain_not_flight_certified'
    high['processing_signature'] = signature
    high['input_source_hashes'] = input_hashes
    high['catalog_source'] = site['source_url']
    high['coordinate_precision'] = site['precision']
    high['source_integrity'] = {key: source_info[key] for key, count in high['source_sample_counts'].items() if count}
    high['validation'] = {
        'complete_rays': 3600, 'radial_max_delta_deg': delta, 'radial_target_deg': .05,
        'range_300_to_310_max_delta_deg': float(np.max(np.abs(np.asarray(high['elev_deg']) - np.asarray(high['range_comparison_deg']['300000'])))),
        'azimuth_sampling_deg': .1,
        'accuracy_statement': 'Numerical checks passed; finite DEM resolution and angular interpolation are not certified physical accuracy.',
    }
    # Keep the production payload small; diagnostic comparisons are summarized above.
    high.pop('range_comparison_deg')
    write_json(path, high)
    print('Ready', site['id'], 'refinement', high['radial_refinement'], 'delta', round(delta, 6), flush=True)
    return high


def build(catalog, root, output, workers=2, limit=None, pole='both'):
    sites = catalog_sites(catalog)
    source_info = sources(root)
    signature = hashlib.sha256((digest(catalog) + 'catalog-horizons-v1' +
        digest(ROOT/'python/terrain/horizon_trial.py')).encode()).hexdigest()
    global_dem = GlobalDem(root/'lola-global-64ppd/ldem_64.img')
    points = [point_terrain(site, root, global_dem) for site in sites]
    polar = [s for s in sites if abs(s['lat']) >= 80]
    if pole != 'both':
        polar = [s for s in polar if (s['lat'] < 0) == (pole == 'south')]
    if limit:
        polar = polar[:limit]
    with ThreadPoolExecutor(max_workers=workers) as pool:
        profiles = list(pool.map(lambda s: profile_for(s, root, output, source_info, signature), polar))
    by_id = {p['site_id']: p for p in profiles}
    for point in points:
        p = by_id.get(point['id'])
        if p:
            point['horizon_file'] = f"horizon/{point['id']}.json"
            point['horizon_validation'] = p['validation']
            point['elev_m'] = p['observer_ground_m']
        else:
            point['horizon_file'] = None
    from .psr import distances
    psr=distances(points,root,source_info)
    if psr:
        for point in points:
            point.update(psr[point['id']])
    result = {'version': 1, 'mock': False, 'frame': 'MOON_ME_DE421', 'radius_m': RADIUS,
              'catalog_sha256': digest(catalog), 'generated_utc': datetime.now(timezone.utc).isoformat(),
              'catalog_source': 'python/export/catalog.yaml', 'sources': source_info,
              'note': 'Coarse global slopes are approximate; no landing safety certification. PSR distances have mapped-cap coverage and stated uncertainty.',
              'sites': points}
    write_json(output/'terrain/catalog.json', result)
    with (output/'terrain/catalog-terrain.csv').open('w',encoding='utf8',newline='') as stream:
        writer=csv.writer(stream,lineterminator='\n')
        writer.writerow(['id','lat','lon','elev_m','slope_deg','slope_coarse','psr_dist_km','psr_mapped_distance_km','horizon_file','coordinate_source'])
        for p in points:
            writer.writerow([p['id'],p['lat'],p['lon'],p['elev_m'],p['slope_deg'],p['slope_coarse'],p['psr_dist_km'],p.get('psr_mapped_distance_km'),p['horizon_file'],p['source_url']])
    summary = {'version': 1, 'catalog_sites': len(points), 'polar_sites': len([s for s in sites if abs(s['lat'])>=80]),
               'ready_profiles': len(profiles), 'observer_height_m': 5, 'az_step_deg': .1,
               'max_range_km': 310, 'catalog_sha256': digest(catalog), 'processing_signature': signature,
               'profiles': [{'id': p['site_id'], 'validation': p['validation'], 'sources': p['source_sample_counts']} for p in profiles]}
    write_json(output/'terrain/catalog-delivery.json', summary)
    print('Delivered', len(points), 'catalogue points and', len(profiles), 'profiles', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--catalog', type=Path, default=ROOT/'python/export/catalog.yaml')
    parser.add_argument('--terrain-root', type=Path, default=ROOT/'data/terrain')
    parser.add_argument('--output', type=Path, default=ROOT/'web/public/data')
    parser.add_argument('--workers', type=int, default=2)
    parser.add_argument('--limit', type=int)
    parser.add_argument('--pole', choices=['both', 'south', 'north'], default='both')
    args = parser.parse_args()
    build(args.catalog, args.terrain_root, args.output, args.workers, args.limit, args.pole)
