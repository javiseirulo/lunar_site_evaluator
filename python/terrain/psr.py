"""Distance to NASA mapped polar PSRs, with explicit coverage/error bounds."""
import json
from pathlib import Path
import numpy as np
import rasterio
from rasterio.crs import CRS
from rasterio.windows import Window
from .horizon_trial import ROOT, RADIUS
from .export_polar import same_projection


def mapped_cells(path, pole, sha, cache_root):
    """Any-positive 240 m cells from full-resolution 20 m binary masks.

    Never use COG overviews: their averaging does not preserve binary PSR data.
    Process bounded native strips instead of allocating a 30400² float raster.
    """
    cache_root.mkdir(parents=True, exist_ok=True)
    cache = cache_root / f'psr-{pole}-{sha[:12]}.npz'
    with rasterio.open(path) as ds:
        expected=CRS.from_string(f'+proj=stere +lat_0={90*pole} +k=1 +R={RADIUS} +units=m')
        if not same_projection(ds.crs,expected) or ds.scales != (1.0,) or ds.offsets != (0.0,):
            raise ValueError('Unexpected PSR reference frame, projection or pixel scaling')
        if ds.count != 1 or not np.isclose(ds.res[0],20) or not np.isclose(ds.res[1],20):
            raise ValueError('Expected the documented 20 m polar PSR mask')
        transform = ds.transform
        factor = 12
        if cache.exists():
            with np.load(cache, allow_pickle=False) as data:
                occupied = data['occupied']
        else:
            height, width = (ds.height+factor-1)//factor, (ds.width+factor-1)//factor
            occupied = np.zeros((height,width), dtype=bool)
            for start in range(0,ds.height,factor*32):
                rows=min(factor*32,ds.height-start)
                values=ds.read(1,window=Window(0,start,ds.width,rows),masked=True)
                raw=values.compressed()
                if np.any((raw != 0) & (raw != 1)):
                    raise ValueError('PSR mask must contain only 0, 1 and NoData')
                binary=np.asarray(values.filled(0)>0)
                padded=np.zeros(((rows+factor-1)//factor*factor,width*factor),dtype=bool)
                padded[:rows,:ds.width]=binary
                coarse=padded.reshape(-1,factor,width,factor).any(axis=(1,3))
                occupied[start//factor:start//factor+coarse.shape[0]]=coarse
            np.savez_compressed(cache,occupied=occupied)
        row,col=np.nonzero(occupied)
        x=transform.c+(col*factor+factor/2)*transform.a
        y=transform.f+(row*factor+factor/2)*transform.e
        rho=np.hypot(x,y)
        lat=pole*(np.pi/2-2*np.arctan(rho/(2*RADIUS)))
        lon=np.arctan2(x,-pole*y)
        vectors=np.column_stack((np.cos(lat)*np.cos(lon),np.cos(lat)*np.sin(lon),np.sin(lat)))
    return vectors


def distances(points, root, source_info):
    groups=[]
    for pole,hemisphere,letter in [(-1,'south','S'),(1,'north','N')]:
        source=f'psr-{hemisphere}-20m'
        path=root/source/f'LPSR_80{letter}_20MPP_ADJ.TIF'
        if not path.exists() or source not in source_info:
            return None
        cells=mapped_cells(path,pole,source_info[source]['sha256_local'],ROOT/'data/derived/psr')
        groups.append((pole,source,path,cells))
    result={}
    for point in points:
        lat,lon=np.deg2rad([point['lat'],point['lon']])
        unit=np.array([np.cos(lat)*np.cos(lon),np.cos(lat)*np.sin(lon),np.sin(lat)])
        best=float('inf'); source=None
        inside=False
        for pole,source_id,path,cells in groups:
            if not len(cells): continue
            dot=float(np.max(cells@unit))
            estimate=RADIUS*np.arccos(np.clip(dot,-1,1))/1000
            if estimate<best: best,source=estimate,source_id
            if point['lat']*pole>=80:
                # Native pixel classification, separate from the aggregated distance.
                from .catalog import nearest_value
                inside=inside or nearest_value(path,point['lat'],point['lon'])==1
        if inside:best=0.
        # The nearest mapped PSR is also globally nearest only when a closer
        # unsurveyed region outside the 80-degree cap is geometrically impossible.
        boundary=max(0,abs(point['lat'])-80)*np.pi/180*RADIUS/1000
        uncertainty=.19 # 240 m aggregation half diagonal + native pixel scale
        covered=inside or best+uncertainty<boundary
        result[point['id']]={'psr_dist_km':best if covered else None,
            'psr_mapped_distance_km':best,'psr_distance_uncertainty_km':uncertainty,
            'psr_source':source,'psr_coverage':'80–90 degrees north and south',
            'psr_distance_is_upper_bound':not covered,'inside_mapped_psr':inside}
    return result
