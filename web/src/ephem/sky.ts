/**
 * Sun and Earth in the local sky of any lat/lon (owner: Javi). Street View, the globe and the
 * client-side Timeseries all use this, so everyone sees the same sky.
 *
 *   const sky = skyAt(-89.45, -137.3, '2027-03-02T12:00:00Z');   // null until the year is loaded
 */
import { vectorsAt, type TimeInput } from './ephem';
import { azEl, enuBasis, OBSERVER_HEIGHT_M, siteVectorKm, type Vec3 } from './topo';

export interface SkyOptions {
  /** Terrain elevation of the site, metres (default 0 = on the reference sphere). */
  elev_m?: number;
  /** Observer height above the terrain, metres (default OBSERVER_HEIGHT_M = 5). */
  h_obs_m?: number;
}

export interface Sky {
  sun_az: number;
  sun_el: number;
  earth_az: number;
  earth_el: number;
  /** Site → Earth centre distance, km (topocentric). */
  earth_km: number;
}

/**
 * Pure transform from MOON_ME vectors to the local sky. Sun from the unit vector (its parallax is
 * negligible); Earth with exact parallax, v = earth_km − r_site.
 */
export function skyFromVectors(
  lat: number,
  lon: number,
  sunUnit: Vec3,
  earthKm: Vec3,
  opts: SkyOptions = {},
): Sky {
  const basis = enuBasis(lat, lon);
  const r = siteVectorKm(lat, lon, opts.elev_m ?? 0, opts.h_obs_m ?? OBSERVER_HEIGHT_M);
  const sun = azEl(sunUnit, basis);
  const v: Vec3 = [earthKm[0] - r[0], earthKm[1] - r[1], earthKm[2] - r[2]];
  const earth = azEl(v, basis);
  return {
    sun_az: sun.az,
    sun_el: sun.el,
    earth_az: earth.az,
    earth_el: earth.el,
    earth_km: Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]),
  };
}

/** Sun/Earth az/el at (lat, lon) and time `t`, or null if that year of ephemeris is not loaded. */
export function skyAt(lat: number, lon: number, t: TimeInput, opts: SkyOptions = {}): Sky | null {
  const v = vectorsAt(t);
  return v ? skyFromVectors(lat, lon, v.sunUnit, v.earthKm, opts) : null;
}
