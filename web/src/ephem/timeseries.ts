/**
 * Client-side Timeseries for any site/point and window (owner: Javi; docs/10 J10).
 * Returns the SAME `Timeseries` type as the static v1 files, so every consumer (time bar, Street
 * View, game, scoring) works unchanged.
 *
 *   await ensureEphem(start, end);
 *   const ts = buildTimeseries({ id: 'custom', lat: 0.674, lon: 23.473 }, null, start, end);
 */
import type { HorizonProfile, Timeseries } from '@lunar/contracts';
import { vectorsAt } from './ephem';
import { skyFromVectors } from './sky';
import {
  DEFAULT_ANTENNA_MARGIN_DEG,
  FLAT_HORIZON_SOURCE,
  horizonAt,
  OBSERVER_HEIGHT_M,
  sunDiscFraction,
  wrap360,
} from './topo';

const HOUR_MS = 3_600_000;

export interface TimeseriesSite {
  id: string;
  lat: number;
  lon: number;
  elev_m?: number;
}

/**
 * `Timeseries` plus the v1.1 field `antenna_margin_deg` (margin baked into `earth_visible`; contract
 * PR #70). Kept as an intersection so it also compiles against the contract before that PR.
 */
export type EphemTimeseries = Timeseries & { antenna_margin_deg: number };

export interface BuildTimeseriesOptions {
  /** Earth must clear the horizon by this much to count as visible, degrees (default 2). */
  antennaMarginDeg?: number;
  /** Seconds between samples (default 3600 = the ephemeris step). */
  stepS?: number;
}

/** ISO 8601 UTC without milliseconds, as in the static files: 2027-01-01T00:00:00Z. */
export const isoSeconds = (ms: number) => `${new Date(ms).toISOString().slice(0, 19)}Z`;

const round = (v: number, digits: number) => {
  const f = 10 ** digits;
  return Math.round(v * f) / f + 0; // + 0 turns −0 into 0
};

/**
 * Hourly (or `stepS`) Sun/Earth sky for `site` over [start, end): first sample = start rounded UP
 * to the hour (half-open window), last sample < end. Returns null if the ephemeris for that window is not loaded.
 *
 * - az/el rounded to 2 decimals (az in [0, 360)), `sun_frac` to 3 decimals.
 * - `lit` = rounded `sun_frac` ≥ 0.5, so the published arrays are self-consistent.
 * - `earth_visible` = earth_el > h(earth_az) + antenna margin (unrounded values).
 * - Horizon: the profile (with its observer height) or the flat horizon, "flat (no terrain)".
 * - `antenna_margin_deg` records the margin used for `earth_visible`.
 */
export function buildTimeseries(
  site: TimeseriesSite,
  horizon: HorizonProfile | null,
  startIso: string,
  endIso: string,
  opts: BuildTimeseriesOptions = {},
): EphemTimeseries | null {
  const stepS = opts.stepS ?? 3600;
  const margin = opts.antennaMarginDeg ?? DEFAULT_ANTENNA_MARGIN_DEG;
  const hObs = horizon?.observer_height_m ?? OBSERVER_HEIGHT_M;
  const skyOpts = { elev_m: site.elev_m ?? 0, h_obs_m: hObs };
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  if (!Number.isFinite(start) || !Number.isFinite(end) || !(stepS > 0)) return null;

  const t_utc: string[] = [];
  const sun_az: number[] = [];
  const sun_el: number[] = [];
  const earth_az: number[] = [];
  const earth_el: number[] = [];
  const lit: (0 | 1)[] = [];
  const earth_visible: (0 | 1)[] = [];
  const sun_frac: number[] = [];

  for (let t = Math.ceil(start / HOUR_MS) * HOUR_MS; t < end; t += stepS * 1000) {
    const v = vectorsAt(t);
    if (!v) return null;
    const sky = skyFromVectors(site.lat, site.lon, v.sunUnit, v.earthKm, skyOpts);
    const frac = round(sunDiscFraction(sky.sun_el, horizonAt(horizon, sky.sun_az, hObs)), 3);
    const earthUp = sky.earth_el > horizonAt(horizon, sky.earth_az, hObs) + margin;
    t_utc.push(isoSeconds(t));
    sun_az.push(wrap360(round(sky.sun_az, 2)));
    sun_el.push(round(sky.sun_el, 2));
    earth_az.push(wrap360(round(sky.earth_az, 2)));
    earth_el.push(round(sky.earth_el, 2));
    sun_frac.push(frac);
    lit.push(frac >= 0.5 ? 1 : 0);
    earth_visible.push(earthUp ? 1 : 0);
  }

  return {
    version: 1,
    mock: false,
    site_id: site.id,
    step_s: stepS,
    t_utc,
    sun_az,
    sun_el,
    earth_az,
    earth_el,
    lit,
    earth_visible,
    sun_frac,
    horizon_source: horizon?.source ?? FLAT_HORIZON_SOURCE,
    antenna_margin_deg: margin,
  };
}
