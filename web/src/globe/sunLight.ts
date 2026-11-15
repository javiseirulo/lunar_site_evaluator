/**
 * Sun direction for the globe lighting — owner: Marta (src/globe). v2 of docs/10 §5 Marta.
 *
 * Javi's `@/ephem` loads the yearly MOON_ME vectors (cached) and interpolates between hours
 * (`sunDirectionMoonME`); this module only converts them to the globe's axes and says when there is
 * no ephemeris for the date (outside 2026–2055 or not loadable), so the globe falls back to a fixed light.
 *
 * Axes: MOON_ME has X at lon 0, Y at lon 90°E and Z at the north pole. The globe (geo.ts) has
 * y up, lon 0 on +X and lon 90°E on −Z, so three = (X, Z, −Y).
 */
import { getEphemIndex, sunDirectionMoonME, useEphem, type Vec3 } from '@/ephem';
import type { Vec3Tuple } from './geo';

const HOUR_MS = 3_600_000;

/** MOON_ME vector → globe (Three.js) axes. */
export function moonMeToThree(v: Vec3): Vec3Tuple {
  return [v[0], v[2], -v[1]];
}

export type SunStatus = 'ok' | 'loading' | 'no_ephemeris';

/** The part of ephem/index.json that says which dates are covered. */
export interface EphemCoverage {
  start_utc: string;
  end_utc: string;
  step_s: number;
}

export interface SunState {
  /** Unit vector Moon → Sun in globe axes, or null when there is none for this date. */
  dir: Vec3Tuple | null;
  status: SunStatus;
}

/** True when `isoUtc` lies inside the ephemeris coverage of the index. */
export function inEphemRange(isoUtc: string, index: EphemCoverage): boolean {
  const t = Date.parse(isoUtc);
  return t >= Date.parse(index.start_utc) && t <= Date.parse(index.end_utc) + index.step_s * 1000;
}

/**
 * Decide the lighting state from what @/ephem knows. Pure, so it can be tested without React.
 * `dirMoonMe` is `sunDirectionMoonME(isoUtc)`; `error` is @/ephem's reason when the data cannot load.
 */
export function sunStateFrom(
  isoUtc: string,
  index: EphemCoverage | null,
  dirMoonMe: Vec3 | null,
  error: string | null,
): SunState {
  if (index && !inEphemRange(isoUtc, index)) return { dir: null, status: 'no_ephemeris' };
  if (dirMoonMe) return { dir: moonMeToThree(dirMoonMe), status: 'ok' };
  if (error) return { dir: null, status: 'no_ephemeris' };
  return { dir: null, status: 'loading' };
}

/** Hour-aligned window [t, t + 2 h) so interpolation at `t` has both neighbours loaded. */
export function ephemWindow(isoUtc: string): [string, string] | [null, null] {
  const t = Date.parse(isoUtc);
  if (!Number.isFinite(t)) return [null, null];
  const start = Math.floor(t / HOUR_MS) * HOUR_MS;
  return [new Date(start).toISOString(), new Date(start + 2 * HOUR_MS).toISOString()];
}

/** Sun direction for the Mission Clock time; loads the needed ephemeris year on demand. */
export function useSunDirection(isoUtc: string): SunState {
  const [start, end] = ephemWindow(isoUtc);
  const { error } = useEphem(start, end); // loads the year(s) and re-renders when they arrive
  // Ask for the hour itself: it answers as soon as its year is loaded, even if the next one is not,
  // so the terminator does not jump at year boundaries while the next file loads.
  return sunStateFrom(isoUtc, getEphemIndex(), sunDirectionMoonME(isoUtc), error);
}
