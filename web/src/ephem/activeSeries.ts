/**
 * The series the Mission Clock shows: the selected catalogue site's published timeseries, or — for
 * a free lat/lon ("Go to coordinates", store `selectedPoint`) — one computed client-side with
 * `buildTimeseries` over the same range, flat horizon (no terrain exists for arbitrary points).
 */
import { useMemo } from 'react';
import type { Timeseries } from '@lunar/contracts';
import { useAppStore } from '@/core/store';
import { useData, useSelectedSite, useTimeseries } from '@/core/data';
import { buildTimeseries } from './timeseries';
import { DEFAULT_ANTENNA_MARGIN_DEG } from './topo';
import { useEphem, useEphemVersion } from './ephem';

export interface ActiveSite {
  /** Catalogue id, or 'point' for a free lat/lon. */
  id: string;
  name: string;
  lat: number;
  lon: number;
}

export interface ActiveSeries {
  kind: 'site' | 'point' | null;
  site: ActiveSite | null;
  ts: Timeseries | null;
  /** True while the ephemeris (free point) is still loading. */
  computing: boolean;
  /** True for a free point: no terrain, so the horizon is flat. */
  flatHorizon: boolean;
  error: string | null;
}

/** Cache key: ~1 m precision is plenty; the margin changes the Earth windows. */
export const pointSeriesKey = (
  lat: number,
  lon: number,
  marginDeg: number,
  start: string,
  end: string,
) => `${lat.toFixed(5)},${lon.toFixed(5)}|${marginDeg}|${start}|${end}`;

/** Display name of a free point: "6.5°S, 21.0°E"-style, from coordinates only. */
export function pointName(lat: number, lon: number): string {
  const f = (v: number, pos: string, neg: string) =>
    `${Math.abs(v).toFixed(2)}°${v < 0 ? neg : pos}`;
  return `${f(lat, 'N', 'S')}, ${f(lon, 'E', 'W')}`;
}

export const pointSite = (lat: number, lon: number): ActiveSite => ({
  id: 'point',
  name: pointName(lat, lon),
  lat,
  lon,
});

const cache = new Map<string, Timeseries>();
const MAX_CACHE = 8;

/** Memoised per point; returns null until the ephemeris for the range is loaded. */
export function pointSeries(
  lat: number,
  lon: number,
  start: string,
  end: string,
  marginDeg: number,
): Timeseries | null {
  const key = pointSeriesKey(lat, lon, marginDeg, start, end);
  const hit = cache.get(key);
  if (hit) return hit;
  const ts = buildTimeseries({ id: 'point', lat, lon, elev_m: 0 }, null, start, end, {
    antennaMarginDeg: marginDeg,
  });
  if (!ts) return null;
  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value as string);
  cache.set(key, ts);
  return ts;
}

export const __clearPointSeriesCache = () => cache.clear();

export function useActiveSeries(): ActiveSeries {
  const site = useSelectedSite();
  const point = useAppStore((s) => s.selectedPoint);
  const range = useData((s) => s.manifest?.time_range);
  const siteTs = useTimeseries(site?.id);
  const wantPoint = !site && !!point && !!range;
  const ephem = useEphem(wantPoint ? range.start_utc : null, wantPoint ? range.end_utc : null);
  const version = useEphemVersion();

  const pointTs = useMemo(
    () =>
      wantPoint && ephem.ready
        ? pointSeries(
            point.lat,
            point.lon,
            range.start_utc,
            range.end_utc,
            DEFAULT_ANTENNA_MARGIN_DEG,
          )
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wantPoint, ephem.ready, version, point?.lat, point?.lon, range?.start_utc, range?.end_utc],
  );

  if (site)
    return {
      kind: 'site',
      site: { id: site.id, name: site.name, lat: site.lat, lon: site.lon },
      ts: siteTs,
      computing: false,
      flatHorizon: false,
      error: null,
    };
  if (point)
    return {
      kind: 'point',
      site: pointSite(point.lat, point.lon),
      ts: pointTs,
      computing: !pointTs && !ephem.error,
      flatHorizon: true,
      error: ephem.error,
    };
  return { kind: null, site: null, ts: null, computing: false, flatHorizon: false, error: null };
}
