/**
 * Simple orbital model for "when do we actually land?" (owner: Javi).
 * Used by Explore (mission time mode) and by Mission scenarios (docs/10 §5 Javi, J8).
 *
 *   landing = launch + Earth→Moon transfer + wait in low lunar orbit + descent
 *
 * Deliberately simple and declared as such in the UI: no Δv budget, no launch windows from
 * Earth, no NRHO, no perturbations. Constants: IAU/JPL standard values.
 */
import type { MissionConfig, Trajectory } from '@lunar/contracts';

const DEG = Math.PI / 180;
const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

export const MU_EARTH_KM3_S2 = 398_600.4418;
export const MU_MOON_KM3_S2 = 4_902.8;
export const R_EARTH_KM = 6_378.137;
export const R_MOON_KM = 1_737.4;
/** Parking orbit the transfer starts from. */
export const LEO_ALT_KM = 200;
/** The Moon rotates once per sidereal month (27.321661 d) under an inertially fixed orbit plane. */
export const MOON_ROTATION_DEG_PER_DAY = 360 / 27.321661;
/** Powered descent from low lunar orbit, hours. */
export const DESCENT_HOURS = 1;
/** How far off the ground track a lander can still reach (cross-range), km. */
export const CROSSRANGE_KM = 30;

/** Fixed transfer durations for the non-computed trajectories, days. */
export const FIXED_TRANSFER_DAYS: Record<Exclude<Trajectory, 'hohmann'>, number> = {
  fast: 3, // Apollo-like direct transfer
  low_energy: 105, // ballistic lunar transfer, ~3–4 months
};

export const TRAJECTORY_LABEL: Record<Trajectory, string> = {
  hohmann: 'Hohmann (computed)',
  fast: 'Fast, Apollo-like (~3 d)',
  low_energy: 'Low-energy (~3.5 months)',
};

// Meeus, "Astronomical Algorithms" (2nd ed.), ch. 47: largest terms of the Earth–Moon distance
// series (Table 47.A), coefficients in 0.001 km. Arguments: D, M, M', F multipliers.
const DISTANCE_TERMS: ReadonlyArray<readonly [number, number, number, number, number]> = [
  [0, 0, 1, 0, -20_905_355],
  [2, 0, -1, 0, -3_699_111],
  [2, 0, 0, 0, -2_955_968],
  [0, 0, 2, 0, -569_925],
  [0, 1, 0, 0, 48_888],
  [0, 0, 0, 2, -3_149],
  [2, 0, -2, 0, 246_158],
  [2, -1, -1, 0, -152_138],
  [2, 0, 1, 0, -170_733],
  [2, -1, 0, 0, -204_586],
  [0, 1, -1, 0, -129_620],
  [1, 0, 0, 0, 108_743],
  [0, 1, 1, 0, 104_755],
  [2, 0, 0, -2, 10_321],
  [0, 0, 1, -2, 79_661],
  [4, 0, -1, 0, -34_782],
  [0, 0, 3, 0, -23_210],
  [4, 0, -2, 0, -21_636],
  [2, 1, -1, 0, 24_208],
  [2, 1, 0, 0, 30_824],
  [1, 0, -1, 0, -8_379],
  [1, 1, 0, 0, -16_675],
  [2, -1, 1, 0, -12_831],
  [2, 0, 2, 0, -10_445],
  [4, 0, 0, 0, -11_650],
  [2, 0, -3, 0, 14_403],
  [0, 1, -2, 0, -7_003],
  [2, -1, -2, 0, 10_056],
  [1, 0, 1, 0, 6_322],
  [2, -2, 0, 0, -9_884],
];

/**
 * Geocentric Earth–Moon distance (centre to centre), km. Truncated Meeus series: good to a few
 * hundred km, which moves the Hohmann transfer time by well under an hour. Fallback for
 * `computeArrival` when no SPICE distance is available (`opts.earthMoonKm`, e.g. from `@/ephem`).
 */
export function earthMoonDistanceKm(date: Date): number {
  const jd = date.getTime() / DAY_MS + 2_440_587.5;
  const T = (jd - 2_451_545.0) / 36_525;
  const D = (297.8501921 + 445_267.1114034 * T) * DEG;
  const M = (357.5291092 + 35_999.0502909 * T) * DEG;
  const Mp = (134.9633964 + 477_198.8675055 * T) * DEG;
  const F = (93.272095 + 483_202.0175233 * T) * DEG;
  const E = 1 - 0.002516 * T - 0.0000074 * T * T;
  let sum = 0;
  for (const [d, m, mp, f, c] of DISTANCE_TERMS) {
    sum += c * E ** Math.abs(m) * Math.cos(d * D + m * M + mp * Mp + f * F);
  }
  return 385_000.56 + sum / 1000;
}

/** Half-ellipse transfer time between two circular radii around Earth, days. */
export function hohmannTransferDays(r1Km: number, r2Km: number): number {
  const a = (r1Km + r2Km) / 2;
  return (Math.PI * Math.sqrt(a ** 3 / MU_EARTH_KM3_S2)) / 86_400;
}

/** Period of a circular low lunar orbit at the given altitude, hours. */
export function lloPeriodHours(altKm: number): number {
  return (2 * Math.PI * Math.sqrt((R_MOON_KM + altKm) ** 3 / MU_MOON_KM3_S2)) / 3_600;
}

/**
 * Days until a polar orbit with a fixed plane passes within cross-range of the site.
 * The plane's body-fixed longitude drifts west at the Moon's rotation rate and covers both
 * `planeLon` and `planeLon + 180°`, so the worst case is ~13.7 days. Sites close enough to the
 * pole are reachable on every orbit (0 days).
 */
export function trackAlignmentWaitDays(
  siteLatDeg: number,
  siteLonDeg: number,
  planeLonDeg: number,
  crossrangeKm = CROSSRANGE_KM,
): number {
  const reach = Math.sin(crossrangeKm / R_MOON_KM);
  const cosLat = Math.cos(siteLatDeg * DEG);
  if (cosLat <= reach) return 0;
  const tol = Math.asin(reach / cosLat) / DEG;
  const offset = (((siteLonDeg - planeLonDeg) % 180) + 180) % 180;
  if (offset <= tol || offset >= 180 - tol) return 0;
  return (180 - tol - offset) / MOON_ROTATION_DEG_PER_DAY;
}

export interface Arrival {
  launch_utc: string;
  /** Arrival in low lunar orbit. */
  lunar_orbit_utc: string;
  landing_utc: string;
  /** End of the surface stay = end of the evaluated window. */
  surface_end_utc: string;
  transfer_days: number;
  wait_hours: number;
  descent_hours: number;
  llo_period_hours: number;
  /** Earth–Moon distance used for the transfer, km (Hohmann only). */
  earth_moon_km: number | null;
  /** Where that distance came from: the SPICE ephemeris (`@/ephem`) or the Meeus series. */
  earth_moon_source: 'spice' | 'meeus' | null;
}

export interface ArrivalOptions {
  /**
   * Earth–Moon distance provider, km (e.g. `earthMoonDistanceKmAt` from `@/ephem`). When it returns
   * null (data not loaded / out of range) the Meeus series is used instead.
   */
  earthMoonKm?: (date: Date) => number | null;
}

export interface SiteLocation {
  lat: number;
  lon: number;
}

/**
 * Timeline from launch to the end of the surface stay.
 * - Hohmann: transfer time depends on the Earth–Moon distance at arrival (≈4.5 d at perigee,
 *   ≈5.4 d at apogee), solved by a few fixed-point iterations.
 * - Wait in orbit: one orbital period (upper bound) when the arrival is targeted at the site;
 *   with `start_in_orbit`, the wait for the fixed plane to pass over the site plus one period.
 */
export function computeArrival(
  config: MissionConfig,
  site?: SiteLocation | null,
  opts: ArrivalOptions = {},
): Arrival {
  const launch = Date.parse(config.launch_utc);
  const r1 = R_EARTH_KM + LEO_ALT_KM;
  let transferDays: number;
  let earthMoonKm: number | null = null;
  let source: Arrival['earth_moon_source'] = null;

  if (config.start_in_orbit) {
    transferDays = 0;
  } else if (config.trajectory === 'hohmann') {
    transferDays = 5;
    for (let i = 0; i < 4; i++) {
      const at = new Date(launch + transferDays * DAY_MS);
      const spice = opts.earthMoonKm?.(at);
      if (typeof spice === 'number' && Number.isFinite(spice) && spice > 0) {
        earthMoonKm = spice;
        source = 'spice';
      } else {
        earthMoonKm = earthMoonDistanceKm(at);
        source = 'meeus';
      }
      transferDays = hohmannTransferDays(r1, earthMoonKm);
    }
  } else {
    transferDays = FIXED_TRANSFER_DAYS[config.trajectory];
  }

  const period = lloPeriodHours(config.llo_alt_km);
  let waitHours = period;
  if (config.start_in_orbit && site) {
    const planeLon = config.orbit_plane_lon_deg ?? 0;
    waitHours += trackAlignmentWaitDays(site.lat, site.lon, planeLon) * 24;
  }

  const orbit = launch + transferDays * DAY_MS;
  const landing = orbit + (waitHours + DESCENT_HOURS) * HOUR_MS;
  const end = landing + config.surface_days * DAY_MS;
  const iso = (ms: number) => new Date(ms).toISOString();

  return {
    launch_utc: iso(launch),
    lunar_orbit_utc: iso(orbit),
    landing_utc: iso(landing),
    surface_end_utc: iso(end),
    transfer_days: transferDays,
    wait_hours: waitHours,
    descent_hours: DESCENT_HOURS,
    llo_period_hours: period,
    earth_moon_km: earthMoonKm,
    earth_moon_source: source,
  };
}

/** Landing time for either time mode. */
export function landingTime(
  config: MissionConfig,
  site?: SiteLocation | null,
  opts?: ArrivalOptions,
): string {
  return config.time_mode === 'design'
    ? new Date(Date.parse(config.landing_utc)).toISOString()
    : computeArrival(config, site, opts).landing_utc;
}

/** The window the site is evaluated / simulated over: [landing, landing + surface_days]. */
export function missionWindow(
  config: MissionConfig,
  site?: SiteLocation | null,
  opts?: ArrivalOptions,
): { start_utc: string; end_utc: string } {
  const start = Date.parse(landingTime(config, site, opts));
  return {
    start_utc: new Date(start).toISOString(),
    end_utc: new Date(start + config.surface_days * DAY_MS).toISOString(),
  };
}
