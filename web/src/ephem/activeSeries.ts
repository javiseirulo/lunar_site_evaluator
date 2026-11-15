/**
 * The series the Mission Clock shows: the selected catalogue site's published timeseries, or — for
 * a free lat/lon ("Go to coordinates", store `selectedPoint`) — one computed client-side with
 * `buildTimeseries` over the same range, flat horizon (no terrain exists for arbitrary points).
 */
import { useMemo } from 'react';
import type { HorizonProfile, Timeseries } from '@lunar/contracts';
import { useAppStore } from '@/core/store';
import { useSelectedSite, useTimeseries } from '@/core/data';
import { useClockRange } from '@/core/clockRange';
import { buildTimeseries } from './timeseries';
import { DEFAULT_ANTENNA_MARGIN_DEG } from './topo';
import { useEphem, useEphemVersion } from './ephem';
import { useHorizon } from './horizon';

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
  /** A catalogue site computed for a non-default window: its id, elevation and terrain horizon. */
  site?: { id: string; elev_m?: number; horizon: HorizonProfile | null },
): Timeseries | null {
  const key =
    pointSeriesKey(lat, lon, marginDeg, start, end) +
    (site ? `|${site.id}|${site.horizon?.source ?? 'flat'}` : '');
  const hit = cache.get(key);
  if (hit) return hit;
  const ts = buildTimeseries(
    { id: site?.id ?? 'point', lat, lon, elev_m: site?.elev_m ?? 0 },
    site?.horizon ?? null,
    start,
    end,
    { antennaMarginDeg: marginDeg },
  );
  if (!ts) return null;
  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value as string);
  cache.set(key, ts);
  return ts;
}

export const __clearPointSeriesCache = () => cache.clear();

export function useActiveSeries(): ActiveSeries {
  const site = useSelectedSite();
  const point = useAppStore((s) => s.selectedPoint);
  const margin = useAppStore((s) => s.missionConfig.antenna_margin_deg);
  const range = useClockRange();
  const siteTs = useTimeseries(site?.id);
  // The published timeseries only cover the default window; any other date is computed here.
  const wantSite = !!site && !!range?.custom;
  const wantPoint = !site && !!point && !!range;
  const want = wantSite || wantPoint;
  const ephem = useEphem(want ? range.start_utc : null, want ? range.end_utc : null);
  const horizon = useHorizon(wantSite ? site.id : null);
  const version = useEphemVersion();
  const m = margin ?? DEFAULT_ANTENNA_MARGIN_DEG;

  const computed = useMemo(() => {
    if (!want || !ephem.ready) return null;
    if (wantSite) {
      if (horizon.status === 'loading' || horizon.status === 'idle') return null;
      return pointSeries(site.lat, site.lon, range.start_utc, range.end_utc, m, {
        id: site.id,
        elev_m: site.elev_m,
        horizon: horizon.horizon,
      });
    }
    return pointSeries(point!.lat, point!.lon, range.start_utc, range.end_utc, m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    want,
    wantSite,
    ephem.ready,
    version,
    horizon.status,
    horizon.horizon,
    site?.id,
    point?.lat,
    point?.lon,
    range?.start_utc,
    range?.end_utc,
    m,
  ]);

  if (site)
    return {
      kind: 'site',
      site: { id: site.id, name: site.name, lat: site.lat, lon: site.lon },
      ts: wantSite ? computed : siteTs,
      computing: wantSite && !computed && !ephem.error,
      flatHorizon: false,
      error: wantSite ? ephem.error : null,
    };
  if (point)
    return {
      kind: 'point',
      site: pointSite(point.lat, point.lon),
      ts: computed,
      computing: !computed && !ephem.error,
      flatHorizon: true,
      error: ephem.error,
    };
  return { kind: null, site: null, ts: null, computing: false, flatHorizon: false, error: null };
}
