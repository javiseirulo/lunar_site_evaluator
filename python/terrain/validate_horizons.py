"""Midpoint angular validation of the catalogue's sampled terrain horizons."""
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
import numpy as np
from .catalog import write_json
from .horizon_trial import ROOT, compute


def publish_delivery(folder, profiles, catalogue):
    """Advertise only the complete, validated handoff; preserve Marta's mesh."""
    path=folder/'terrain/delivery.json'
    delivery=json.loads(path.read_text())
    delivery['context_commit']='0b8f028'
    delivery['site_terrain']={'status':'ready','file':'terrain/catalog.json',
        'csv_file':'terrain/catalog-terrain.csv','input_sites_mock':False,
        'valid_sites':len(catalogue['sites']),
        'legacy_fixture_file':'terrain/site-terrain.json'}
    delivery['horizon'].update(status='sampled_terrain_not_flight_certified',
        ready_profiles=len(profiles),catalogue_issue=48,max_range_km=310,
        validation_file='terrain/catalog-delivery.json',
        ready_ids=[p['site_id'] for p in profiles],
        nominal_settings_file='terrain/processing.json')
    delivery['horizon'].pop('candidate_fixture_ids',None)
    delivery['ephemerides'].update(status='available_and_integrated',
        last_sample_utc='2055-12-31T23:00:00Z',
        frame_realization_confirmation_required=False,
        frame='MOON_ME_DE440_ME421',validation_report='docs/validation/horizons-check.md',
        legacy_timeseries='real 2027 flat-horizon export; recompute when terrain is consumed')
    delivery['sources']=[{'id':key,**value} for key,value in catalogue['sources'].items()]
    delivery['limitations']=[
        'Sampled terrain estimates: numerical convergence is not flight certification or DEM accuracy',
        '310 km is the tested reach; farther terrain is not asserted absent',
        'Free points and altered eye heights use a labelled geometric horizon, not a reused site profile',
        'PSR distances are approximate with 0.19 km spatial bound; uncovered metrics are null',
        'The 18 non-polar slopes use the coarse global DEM and are not landing safety measurements',
        'Cesium mesh heights are uncalibrated against the independent LOLA DEM; no offset is applied']
    write_json(path,delivery)


def validate(path):
    profile=json.loads(path.read_text())
    if 'angular_max_delta_deg' in profile.get('validation',{}):
        print('Angular check reused',profile['site_id'],flush=True)
        return profile
    base=profile
    refinement=base['radial_refinement']
    step=base['az_step_deg']
    for finer_step in (.05,.025):
        if finer_step>=step: continue
        fine=compute(base['lat'],base['lon'],ROOT/'data/terrain',finer_step,refinement=refinement)
        if not all(fine['complete']): raise ValueError('Missing fine-grid samples')
        coarse_values=np.asarray(base['elev_deg']); fine_values=np.asarray(fine['elev_deg'])
        difference=max(float(np.max(np.abs(fine_values[::2]-coarse_values))),
                       float(np.max(np.abs(fine_values[1::2]-(coarse_values+np.roll(coarse_values,-1))/2))))
        if difference<=.05:
            profile=base
            profile['validation']['angular_max_delta_deg']=difference
            profile['validation']['angular_check_step_deg']=finer_step
            profile['validation']['angular_target_deg']=.05
            profile['validation']['complete_rays']=len(profile['elev_deg'])
            profile['validation']['validator_sha256']=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
            write_json(path,profile)
            print('Angular ready',profile['site_id'],step,'delta',round(difference,6),flush=True)
            return profile
        # The v1.1 consumer accepts arbitrary uniform grids. Publish a finer
        # grid only when needed, retaining the sourced identity and diagnostics.
        metadata={key:base[key] for key in ('site_id','processing_signature','input_source_hashes',
                  'catalog_source','coordinate_precision','source_integrity','status')}
        fine.update(metadata)
        fine['validation']={**base['validation'],'azimuth_sampling_deg':finer_step}
        fine.pop('range_comparison_deg',None)
        base=fine;step=finer_step
    raise ValueError(f"Angular interpolation has not converged for {profile['site_id']}")


def main():
    folder=ROOT/'web/public/data'
    paths=sorted((folder/'horizon').glob('*.json'))
    with ThreadPoolExecutor(max_workers=2) as pool:
        profiles=list(pool.map(validate,paths))
    catalogue=json.loads((folder/'terrain/catalog.json').read_text())
    by_id={p['site_id']:p for p in profiles}
    for site in catalogue['sites']:
        if site['id'] in by_id:site['horizon_validation']=by_id[site['id']]['validation']
    write_json(folder/'terrain/catalog.json',catalogue)
    delivery=json.loads((folder/'terrain/catalog-delivery.json').read_text())
    delivery['angular_midpoint_validation']='passed for all published profiles'
    delivery['processing_signatures']=sorted({p['processing_signature'] for p in profiles})
    delivery['profiles']=[{'id':p['site_id'],'validation':p['validation'],'processing_signature':p['processing_signature'],
                          'az_step_deg':p['az_step_deg'],'radial_refinement':p['radial_refinement']} for p in profiles]
    write_json(folder/'terrain/catalog-delivery.json',delivery)
    publish_delivery(folder,profiles,catalogue)


if __name__=='__main__':main()
