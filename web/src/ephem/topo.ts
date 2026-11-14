/**
 * Topocentric sky geometry on the Moon (owner: Javi). Pure functions, no data loading.
 * Same definitions as `python/ephem` (contracts/README.md v1.1, "Topocentric sky and visibility"):
 *
 *   site   = (R + elev + h_obs) · (cos φ cos λ, cos φ sin λ, sin φ)       MOON_ME, km
 *   E      = (−sin λ, cos λ, 0)
 *   N      = (−sin φ cos λ, −sin φ sin λ, cos φ)
 *   U      = radial unit vector
 *   az     = atan2(E·v, N·v) in [0, 360), clockwise from local north
 *   el     = asin(U·v / |v|)   (computed with atan2, see azEl)
 */
import type { HorizonProfile } from '@lunar/contracts';

/** Mean lunar radius used by the whole team (IAU), km. */
export const R_MOON_KM = 1737.4;
/** Observer (antenna / camera) height above the terrain, metres (team decision). */
export const OBSERVER_HEIGHT_M = 5;
/** Apparent solar radius seen from the Moon, degrees. */
export const SUN_RADIUS_DEG = 0.2666;
/** Minimum Earth elevation above the horizon for a direct link, degrees. */
export const DEFAULT_ANTENNA_MARGIN_DEG = 2;
/** `horizon_source` when no terrain profile is used. */
export const FLAT_HORIZON_SOURCE = 'flat (no terrain)';

const DEG = Math.PI / 180;

export type Vec3 = [number, number, number];

/** Local East / North / Up unit vectors in MOON_ME. */
export interface EnuBasis {
  e: Vec3;
  n: Vec3;
  u: Vec3;
}

export interface AzEl {
  /** Degrees clockwise from local north, [0, 360). */
  az: number;
  /** Degrees above the mathematical (tangent-plane) horizon, [−90, 90]. */
  el: number;
}

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Wrap an angle in degrees to [0, 360). */
export function wrap360(deg: number): number {
  const w = deg % 360;
  const r = w < 0 ? w + 360 : w;
  // −1e-15 + 360 rounds to 360 in floating point.
  return r >= 360 ? 0 : r;
}

export function enuBasis(latDeg: number, lonDeg: number): EnuBasis {
  const phi = latDeg * DEG;
  const lam = lonDeg * DEG;
  const sp = Math.sin(phi);
  const cp = Math.cos(phi);
  const sl = Math.sin(lam);
  const cl = Math.cos(lam);
  return {
    e: [-sl, cl, 0],
    n: [-sp * cl, -sp * sl, cp],
    u: [cp * cl, cp * sl, sp],
  };
}

/** Site position from the Moon centre in MOON_ME, km (sphere of R_MOON_KM + elevation + observer). */
export function siteVectorKm(
  latDeg: number,
  lonDeg: number,
  elev_m = 0,
  h_obs_m = OBSERVER_HEIGHT_M,
): Vec3 {
  const r = R_MOON_KM + (elev_m + h_obs_m) / 1000;
  const { u } = enuBasis(latDeg, lonDeg);
  return [r * u[0], r * u[1], r * u[2]];
}

/**
 * Azimuth/elevation of a direction `vec` (any length, MOON_ME) in the local ENU frame.
 * Elevation uses atan2(U·v, √((E·v)² + (N·v)²)): the same angle as asin(U·v/|v|), but without the
 * ~1e-6° rounding loss of asin next to the zenith.
 */
export function azEl(vec: Vec3, basis: EnuBasis): AzEl {
  const e = dot(basis.e, vec);
  const n = dot(basis.n, vec);
  const u = dot(basis.u, vec);
  return { az: wrap360(Math.atan2(e, n) / DEG), el: Math.atan2(u, Math.sqrt(e * e + n * n)) / DEG };
}

/** Elevation of the geometric horizon of a smooth sphere seen from height `h_obs_m`, degrees (< 0). */
export function flatHorizonDeg(h_obs_m = OBSERVER_HEIGHT_M): number {
  return -Math.acos(R_MOON_KM / (R_MOON_KM + h_obs_m / 1000)) / DEG;
}

/**
 * Terrain horizon elevation at azimuth `azDeg`, degrees: linear interpolation with wrap-around
 * between the profile samples. `null` (or an empty profile) → flat horizon for `h_obs_m`.
 */
export function horizonAt(
  profile: HorizonProfile | null | undefined,
  azDeg: number,
  h_obs_m = OBSERVER_HEIGHT_M,
): number {
  const values = profile?.elev_deg;
  const step = profile?.az_step_deg ?? 0;
  if (!values || values.length === 0 || !(step > 0)) return flatHorizonDeg(h_obs_m);
  const n = values.length;
  const x = wrap360(azDeg) / step;
  const i = Math.floor(x);
  const f = x - i;
  const a = values[i % n]!;
  const b = values[(i + 1) % n]!;
  return a + (b - a) * f;
}

/**
 * Visible fraction of the solar disc (0–1) when its centre is at `sunEl` and the horizon at
 * `horizonEl` (flat-chord approximation): x = clamp((sunEl − h)/r, −1, 1),
 * fraction = 1 − (acos x − x·√(1 − x²))/π. 0.5 = centre on the horizon.
 */
export function sunDiscFraction(sunEl: number, horizonEl: number, r = SUN_RADIUS_DEG): number {
  const x = Math.min(1, Math.max(-1, (sunEl - horizonEl) / r));
  return 1 - (Math.acos(x) - x * Math.sqrt(1 - x * x)) / Math.PI;
}
