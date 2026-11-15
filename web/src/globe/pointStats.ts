/**
 * Statistics of ANY point on the Moon — owner: Marta (src/globe). v3 of docs/10 §5 Marta.
 *
 * Sun and Earth come from Javi's `@/ephem` (`buildTimeseries`, hourly MOON_ME vectors 2026–2055),
 * and the verdict reuses exactly `missionStats` + `evaluateSite` from the candidate list, so a free
 * point and a catalogue site are judged by the same rules.
 *
 * - Horizon: FLAT unless the point is a catalogue site (same coordinates) with a published profile.
 *   A horizon profile is never reused for another point.
 * - Elevation: the polar heightmap where it has data (south of −80°); otherwise 0 m, flagged.
 * - The pure part (`computePointStats`) is synchronous; `usePointStats` only loads data around it.
 */
import { useEffect, useMemo } from 'react';
import type { HorizonProfile, Site, Timeseries } from '@lunar/contracts';
import { hoursUntilChange, projectSouthPolar, sampleAt, useAppStore, useData } from '@/core';
import {
  EPHEM_UNAVAILABLE,
  FLAT_HORIZON_SOURCE,
  buildTimeseries,
  useEphem,
  useHorizon,
} from '@/ephem';
import {
  evaluateSite,
  missionStats,
  type MissionStats,
  type Requirements,
  type ResolvedWindow,
  type SiteEvaluation,
} from './missionStats';
import { useRequirements } from './requirementsStore';
import { sampleHeight, type HeightmapHeader } from './terrain';
import { loadTerrain, useTerrain } from './terrainStore';
import { useMissionWindow } from './useCandidates';

// ---------------------------------------------------------------------------
// Coverage and constants
// ---------------------------------------------------------------------------

/** The ephemeris covers 2026-01-01 .. 2055-12-31 (docs/10 J0 #5). */
const EPHEM_START_MS = Date.UTC(2026, 0, 1);
const EPHEM_END_MS = Date.UTC(2056, 0, 1);
const HOUR = 3_600_000;
/** How far ahead "hours until the next change" looks. */
const LOOKAHEAD_MS = 30 * 24 * HOUR;
/** A point this close to a catalogue site IS that site (≈ 20 m). */
const CATALOG_TOL_DEG = 0.0002;

export const NO_EPHEMERIS_TEXT = 'No ephemeris for this date';
export const FLAT_HORIZON_TEXT = 'Flat horizon — terrain not included at this point';
export const NO_ELEVATION_TEXT = 'Elevation not available, 0 m assumed';

/** True when [start, end) lies inside the ephemeris coverage. */
export function inCoverage(startIso: string, endIso: string): boolean {
  const s = Date.parse(startIso);
  const e = Date.parse(endIso);
  return (
    Number.isFinite(s) && Number.isFinite(e) && s >= EPHEM_START_MS && e <= EPHEM_END_MS && e > s
  );
}

/** "38 h" up to four days, then "6.5 days". */
export function fmtHours(h: number | null | undefined): string {
  if (h == null) return '—';
  if (h < 1) return '< 1 h';
  if (h < 96) return `${Math.round(h)} h`;
  return `${(h / 24).toFixed(1)} days`;
}

export const fmtPct = (f: number | null | undefined) =>
  f == null ? '—' : `${Math.round(f * 100)}%`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ElevationInfo {
  elevM: number;
  /** False: no terrain data at this point, 0 m was assumed. */
  available: boolean;
  source: 'catalog' | 'heightmap' | 'none';
}

export interface PointNow {
  /** Sun elevation at the Mission Clock hour, degrees. */
  sunElevationDeg: number;
  sunlit: boolean;
  /** null if the series has no Earth-visibility data. */
  earthVisible: boolean | null;
  /** Hours until sunrise/sunset (null: no change in the next 30 days). */
  hoursToNextChange: number | null;
  hoursToEarthChange: number | null;
}

export interface PointReady {
  status: 'ready';
  lat: number;
  lon: number;
  elevation: ElevationInfo;
  /** Series over the mission window (null if the window is empty). */
  ts: Timeseries;
  now: PointNow;
  windowStats: MissionStats;
  evaluation: SiteEvaluation;
  /** True when no terrain horizon was used (free point, or a catalogue site without a profile). */
  flatHorizon: boolean;
  /** Catalogue site this point coincides with, if any. */
  catalogSite: Site | null;
}

export type PointStatsState =
  | { status: 'loading' }
  | { status: 'no_ephemeris'; message: string }
  | { status: 'error'; message: string }
  | PointReady;

export interface PointInput {
  lat: number;
  lon: number;
  elevation: ElevationInfo;
  /** Profile of the catalogue site at this point; null for a flat horizon. */
  horizon: HorizonProfile | null;
  catalogSite: Site | null;
  window: Pick<ResolvedWindow, 'startUtc' | 'endUtc'>;
  /** Mission Clock, ISO UTC. */
  nowIso: string;
  req: Requirements;
}

// ---------------------------------------------------------------------------
// Cache (point rounded to ~3 m + window + horizon)
// ---------------------------------------------------------------------------

const r4 = (v: number) => Math.round(v * 1e4) / 1e4 + 0;

const windowCache = new Map<string, Timeseries>();
const nowCache = new Map<string, Timeseries>();
const WINDOW_CACHE_MAX = 16; // ~1 MB each for a year of hourly samples
const NOW_CACHE_MAX = 400;

let builds = 0;
/** How many series were actually computed (tests: a cache hit does not add to it). */
export const __buildCount = () => builds;
export function __clearPointCache() {
  windowCache.clear();
  nowCache.clear();
  builds = 0;
}

function remember(map: Map<string, Timeseries>, max: number, key: string, ts: Timeseries) {
  map.set(key, ts);
  if (map.size > max) map.delete(map.keys().next().value!);
}

function cached(
  map: Map<string, Timeseries>,
  max: number,
  key: string,
  build: () => Timeseries | null,
): Timeseries | null {
  const hit = map.get(key);
  if (hit) {
    map.delete(key); // refresh recency
    map.set(key, hit);
    return hit;
  }
  const ts = build();
  if (ts) {
    builds += 1;
    remember(map, max, key, ts);
  }
  return ts;
}

const horizonKey = (input: PointInput) =>
  input.horizon ? `h:${input.catalogSite?.id ?? '?'}:${input.horizon.source}` : 'flat';

/** The ISO hour at or before `iso` (the sample the Mission Clock falls in). */
function hourFloor(iso: string): number {
  return Math.floor(Date.parse(iso) / HOUR) * HOUR;
}

/** Series over the mission window for this point. null if the ephemeris is not loaded. */
export function pointTimeseries(input: PointInput): Timeseries | null {
  const lat = r4(input.lat);
  const lon = r4(input.lon);
  const elev = Math.round(input.elevation.elevM);
  const { startUtc, endUtc } = input.window;
  const key = `${lat},${lon},${elev}|${startUtc}|${endUtc}|${horizonKey(input)}`;
  return cached(windowCache, WINDOW_CACHE_MAX, key, () =>
    buildTimeseries(
      { id: input.catalogSite?.id ?? 'point', lat, lon, elev_m: elev },
      input.horizon,
      startUtc,
      endUtc,
    ),
  );
}

/** Next 30 days from the Mission Clock hour (for "now" and "hours until the next change"). */
export function nowRange(nowIso: string): [string, string] {
  const start = hourFloor(nowIso);
  const end = Math.min(start + LOOKAHEAD_MS, EPHEM_END_MS);
  return [new Date(start).toISOString(), new Date(end).toISOString()];
}

function pointNowSeries(input: PointInput): Timeseries | null {
  const lat = r4(input.lat);
  const lon = r4(input.lon);
  const elev = Math.round(input.elevation.elevM);
  const [start, end] = nowRange(input.nowIso);
  const key = `${lat},${lon},${elev}|${start}|${horizonKey(input)}`;
  return cached(nowCache, NOW_CACHE_MAX, key, () =>
    buildTimeseries(
      { id: input.catalogSite?.id ?? 'point', lat, lon, elev_m: elev },
      input.horizon,
      start,
      end,
    ),
  );
}

// ---------------------------------------------------------------------------
// Pure computation
// ---------------------------------------------------------------------------

/** A catalogue-shaped stand-in for a free point: no slope, so the slope check stays "pending". */
function freeSite(lat: number, lon: number, elevM: number): Site {
  return {
    id: 'point',
    name: 'Point on the Moon',
    lat,
    lon,
    elev_m: elevM,
    valid: false,
    score: 0,
    reasons: [],
    metrics: { illum_pct: 0, earth_vis_pct: 0, slope_deg: 0, max_dark_hours: 0, psr_dist_km: 0 },
    pending_metrics: ['slope_deg'],
  };
}

/**
 * Statistics of a point for a mission window and Mission Clock. Synchronous: returns `loading`
 * while the ephemeris of the window is not in memory (the hook above triggers its download) and
 * `no_ephemeris` outside 2026–2055.
 */
export function computePointStats(input: PointInput): PointStatsState {
  const [nowStart, nowEnd] = nowRange(input.nowIso);
  if (
    !Number.isFinite(Date.parse(input.nowIso)) ||
    !inCoverage(input.window.startUtc, input.window.endUtc) ||
    !inCoverage(nowStart, nowEnd)
  ) {
    return { status: 'no_ephemeris', message: NO_EPHEMERIS_TEXT };
  }
  const ts = pointTimeseries(input);
  const nowTs = pointNowSeries(input);
  if (!ts || !nowTs) return { status: 'loading' };
  const sample = sampleAt(nowTs, nowStart);
  if (!sample) return { status: 'loading' };

  const windowStats = missionStats(ts, input.window);
  const site = input.catalogSite ?? freeSite(input.lat, input.lon, input.elevation.elevM);
  return {
    status: 'ready',
    lat: input.lat,
    lon: input.lon,
    elevation: input.elevation,
    ts,
    now: {
      sunElevationDeg: sample.sun_el,
      sunlit: sample.lit,
      earthVisible: sample.earthVisible,
      hoursToNextChange: hoursUntilChange(nowTs, nowTs.lit, input.nowIso),
      hoursToEarthChange: nowTs.earth_visible
        ? hoursUntilChange(nowTs, nowTs.earth_visible, input.nowIso)
        : null,
    },
    windowStats,
    evaluation: evaluateSite(site, windowStats, input.req),
    flatHorizon: input.horizon === null || ts.horizon_source === FLAT_HORIZON_SOURCE,
    catalogSite: input.catalogSite,
  };
}

// ---------------------------------------------------------------------------
// Catalogue match and elevation
// ---------------------------------------------------------------------------

/** The catalogue site at (lat, lon), if the point is that site (≈ 20 m). */
export function findCatalogSite(sites: Site[] | null, lat: number, lon: number): Site | null {
  if (!sites) return null;
  const dLon = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
  return (
    sites.find(
      (s) => Math.abs(s.lat - lat) <= CATALOG_TOL_DEG && dLon(s.lon, lon) <= CATALOG_TOL_DEG * 4,
    ) ?? null
  );
}

/** Elevation of a free point from the polar heightmap; 0 m and `available: false` elsewhere. */
export function elevationAt(
  header: HeightmapHeader | null,
  heights: Float32Array | null,
  mask: Uint8Array | null,
  lat: number,
  lon: number,
): ElevationInfo {
  if (header && heights && lat <= header.lat_limit) {
    const [x, y] = projectSouthPolar(lat, lon, header.radius_m);
    const m = sampleHeight(header, heights, x, y, mask);
    if (Number.isFinite(m)) {
      // Heights are relative to the reference sphere, the same convention as sites.json elev_m.
      return {
        elevM: m + (header.height_reference_radius_m - header.radius_m),
        available: true,
        source: 'heightmap',
      };
    }
  }
  return { elevM: 0, available: false, source: 'none' };
}

// ---------------------------------------------------------------------------
// React hook
// ---------------------------------------------------------------------------

/**
 * Live statistics of a point. Follows the Mission Clock, the mission window and the requirements,
 * keeps showing the previous result while the new one is being computed, and loads what it needs
 * (ephemeris years, terrain, horizon of a catalogue site) in the background.
 */
export function usePointStats(
  point: { lat: number; lon: number } | null,
  siteAtPoint?: Site | null,
): PointStatsState {
  const nowIso = useAppStore((s) => s.currentTimeUTC);
  const window = useMissionWindow();
  const req = useRequirements((s) => s.req);
  const sites = useData((s) => s.sites);
  const terrain = useTerrain();

  const lat = point?.lat ?? 0;
  const lon = point?.lon ?? 0;
  const has = point !== null;
  const catalogSite = useMemo(
    () => (has ? (siteAtPoint ?? findCatalogSite(sites, lat, lon)) : null),
    [has, siteAtPoint, sites, lat, lon],
  );

  // Data this point needs. The window's ephemeris and the 30 days from "now".
  const [nowStart, nowEnd] = nowRange(nowIso);
  const wanted = point && window && inCoverage(window.startUtc, window.endUtc);
  const winEphem = useEphem(wanted ? window.startUtc : null, wanted ? window.endUtc : null);
  const nowEphem = useEphem(
    point && inCoverage(nowStart, nowEnd) ? nowStart : null,
    point ? nowEnd : null,
  );
  const horizonState = useHorizon(catalogSite?.id);

  // The heightmap is only needed south of −80° (and is loaded once for the whole session).
  const needsTerrain = !!point && !catalogSite && lat <= -80;
  useEffect(() => {
    if (needsTerrain) void loadTerrain();
  }, [needsTerrain]);
  const terrainPending =
    needsTerrain && (terrain.status === 'idle' || terrain.status === 'loading');

  return useMemo<PointStatsState>(() => {
    if (!has || !window) return { status: 'loading' };
    if (!inCoverage(window.startUtc, window.endUtc) || !inCoverage(nowStart, nowEnd)) {
      return { status: 'no_ephemeris', message: NO_EPHEMERIS_TEXT };
    }
    const err = winEphem.error ?? nowEphem.error;
    if (err) {
      return err.startsWith(EPHEM_UNAVAILABLE)
        ? { status: 'no_ephemeris', message: NO_EPHEMERIS_TEXT }
        : { status: 'error', message: err };
    }
    if (terrainPending || (catalogSite && horizonState.status === 'loading')) {
      return { status: 'loading' };
    }
    const elevation: ElevationInfo = catalogSite
      ? { elevM: catalogSite.elev_m, available: true, source: 'catalog' }
      : elevationAt(terrain.header, terrain.heights, terrain.mask, lat, lon);
    return computePointStats({
      lat,
      lon,
      elevation,
      horizon: catalogSite ? horizonState.horizon : null,
      catalogSite,
      window,
      nowIso,
      req,
    });
    // winEphem/nowEphem `ready` re-trigger the compute when the years arrive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    has,
    lat,
    lon,
    window,
    nowIso,
    nowStart,
    nowEnd,
    req,
    catalogSite,
    horizonState,
    terrain.header,
    terrain.heights,
    terrain.mask,
    terrainPending,
    winEphem.ready,
    winEphem.error,
    nowEphem.ready,
    nowEphem.error,
  ]);
}
