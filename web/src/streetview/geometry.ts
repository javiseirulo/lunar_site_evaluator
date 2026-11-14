import terrainSettings from '../../../config/terrain-processing.json';
/** Lunar local sky geometry. AI-assisted implementation: OpenAI Codex. */
import type { Timeseries } from '@lunar/contracts';
import { sampleAt } from '@/core/timeseries';

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/** Unit direction in lunar body-fixed axes, azimuth clockwise from local north. */
export function skyDirection(
  latDeg: number,
  lonDeg: number,
  azDeg: number,
  elDeg: number,
): Vector3 {
  const rad = Math.PI / 180;
  const lat = latDeg * rad;
  const lon = lonDeg * rad;
  const az = azDeg * rad;
  const el = elDeg * rad;
  const east = Math.cos(el) * Math.sin(az);
  const north = Math.cos(el) * Math.cos(az);
  const up = Math.sin(el);
  // At a pole longitude defines the local north/east convention.
  return {
    x:
      -Math.sin(lon) * east -
      Math.sin(lat) * Math.cos(lon) * north +
      Math.cos(lat) * Math.cos(lon) * up,
    y:
      Math.cos(lon) * east -
      Math.sin(lat) * Math.sin(lon) * north +
      Math.cos(lat) * Math.sin(lon) * up,
    z: Math.cos(lat) * north + Math.sin(lat) * up,
  };
}

/** Refuse clamped extrapolation and series belonging to a different observer. */
export function sampleSiteSky(ts: Timeseries | null, siteId: string, timeUtc: string) {
  if (!ts || ts.site_id !== siteId || !ts.t_utc.length) return null;
  const time = Date.parse(timeUtc);
  const first = Date.parse(ts.t_utc[0]!);
  const last = Date.parse(ts.t_utc.at(-1)!);
  if (!Number.isFinite(time) || time < first || time > last) return null;
  return sampleAt(ts, timeUtc);
}

export function limitLook(heading: number, pitch: number) {
  return { heading: ((heading % 360) + 360) % 360, pitch: Math.max(-85, Math.min(85, pitch)) };
}

/** Javi J0: scientific observer default; visual overrides never recalculate visibility. */
export const DEFAULT_OBSERVER_HEIGHT_M = terrainSettings.observer_height_m;
