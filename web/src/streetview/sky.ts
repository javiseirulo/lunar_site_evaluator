/** Shared ephemeris adapter for the visual observer, never a copied mock series. */
import type { HorizonProfile } from '@lunar/contracts';
import type { SkySample } from '@/core';
import { horizonAt, skyAt, sunDiscFraction, type Sky } from '@/ephem';
import type { Observer } from './lunarScene';
import { surfaceDistance } from './navigation';

export interface TerrainSite extends Observer {
  id: string;
  name: string;
  elev_m: number;
  slope_deg: number | null;
  slope_coarse: boolean;
  source_url: string;
  precision: string;
  elevation_source: string;
  psr_dist_km: number | null;
  horizon_file: string | null;
  region?: string;
  group?: string;
}
export interface ViewerSky extends SkySample, Sky {
  sunFraction: number;
  earthRadiusDeg: number;
  earthDiscFraction: number;
  sunHorizon: number;
  earthHorizon: number;
  horizonSource: string;
  terrainMatched: boolean;
  elevationKnown: boolean;
}

export function matchesHorizon(profile: HorizonProfile | null, observer: Observer, height: number) {
  return (
    !!profile &&
    Math.abs(profile.observer_height_m - height) < 1e-6 &&
    surfaceDistance(profile, observer) < 0.01 &&
    profile.elev_deg.length * profile.az_step_deg === 360 &&
    profile.elev_deg.every(Number.isFinite)
  );
}

export function observerSky(
  observer: Observer,
  time: string,
  height = 5,
  terrain: TerrainSite | null = null,
  horizon: HorizonProfile | null = null,
  antennaMargin = 2,
): ViewerSky | null {
  const pointMatches = !!terrain && surfaceDistance(terrain, observer) < 0.01;
  const geometry = skyAt(observer.lat, observer.lon, time, {
    elev_m: pointMatches ? terrain.elev_m : 0,
    h_obs_m: height,
  });
  if (!geometry) return null;
  const terrainMatched = matchesHorizon(horizon, observer, height);
  const profile = terrainMatched ? horizon : null;
  const sunHorizon = horizonAt(profile, geometry.sun_az, height);
  const earthHorizon = horizonAt(profile, geometry.earth_az, height);
  const fraction = sunDiscFraction(geometry.sun_el, sunHorizon);
  // Mean Earth radius, km. A straight local skyline approximates clipping across the disc.
  const earthRadiusDeg = (Math.asin(6371 / geometry.earth_km) * 180) / Math.PI;
  return {
    earthRadiusDeg,
    earthDiscFraction: sunDiscFraction(geometry.earth_el, earthHorizon, earthRadiusDeg),
    ...geometry,
    index: -1,
    t_utc: time,
    lit: fraction >= 0.5,
    earthVisible: geometry.earth_el > earthHorizon + antennaMargin,
    sunFraction: fraction,
    sunHorizon,
    earthHorizon,
    terrainMatched,
    elevationKnown: pointMatches,
    horizonSource: profile?.source ?? 'flat (no terrain)',
  };
}
