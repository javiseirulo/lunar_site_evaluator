import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Site, SitesFile, Timeseries } from '@lunar/contracts';
import { __resetEphemForTests, __setEphemYearForTests } from '@/ephem';
import {
  __buildCount,
  __clearPointCache,
  computePointStats,
  elevationAt,
  findCatalogSite,
  inCoverage,
  pointTimeseries,
  type PointInput,
} from './pointStats';
import { evaluateSite, missionStats } from './missionStats';

const DATA = join(__dirname, '..', '..', 'public', 'data');
const have = existsSync(join(DATA, 'ephem', '2027.bin'));
const read = <T>(p: string) => JSON.parse(readFileSync(join(DATA, p), 'utf8')) as T;

const FLAT = { elevM: 0, available: false, source: 'none' } as const;
const WINDOW = { startUtc: '2027-03-01T00:00:00Z', endUtc: '2027-04-01T00:00:00Z' };

function input(over: Partial<PointInput> = {}): PointInput {
  return {
    lat: 0.67416,
    lon: 23.47314,
    elevation: { elevM: -1925.6, available: true, source: 'catalog' },
    horizon: null,
    catalogSite: null,
    window: WINDOW,
    nowIso: '2027-03-10T06:30:00Z',
    req: {},
    ...over,
  };
}

function loadYear2027() {
  const buf = readFileSync(join(DATA, 'ephem', '2027.bin'));
  __setEphemYearForTests(
    2027,
    new Float32Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)),
  );
}

beforeEach(() => __clearPointCache());
afterEach(() => __resetEphemForTests());

describe.skipIf(!have)('computePointStats with real ephemeris', () => {
  it('matches the published Apollo 11 timeseries (flat horizon) over the same window', () => {
    loadYear2027();
    const apollo = read<SitesFile>('sites.json').sites.find((s) => s.id === 'apollo_11');
    const py = read<Timeseries>('timeseries/apollo_11.json');
    expect(py.horizon_source).toBe('flat (no terrain)');
    expect(apollo).toBeDefined();
    const win = { startUtc: '2027-01-01T00:00:00Z', endUtc: '2028-01-01T00:00:00Z' };
    const res = computePointStats(
      input({
        lat: apollo!.lat,
        lon: apollo!.lon,
        elevation: { elevM: apollo!.elev_m, available: true, source: 'catalog' },
        window: win,
        req: { batteryWh: 100, loadW: 10, maxCommGapH: 100 },
      }),
    );
    expect(res.status).toBe('ready');
    if (res.status !== 'ready') return;
    const ref = missionStats(py, win);
    expect(res.windowStats.samples).toBe(ref.samples);
    // The published series was exported by python/; the web port agrees to ±1 sample at the edges.
    expect(Math.abs(res.windowStats.sunlitFraction! - ref.sunlitFraction!)).toBeLessThan(0.002);
    expect(Math.abs(res.windowStats.longestNightH! - ref.longestNightH!)).toBeLessThanOrEqual(2);
    expect(Math.abs(res.windowStats.longestCommGapH! - ref.longestCommGapH!)).toBeLessThanOrEqual(
      2,
    );
    expect(res.flatHorizon).toBe(true);
  });

  it('describes "now" and the next change', () => {
    loadYear2027();
    const res = computePointStats(input());
    expect(res.status).toBe('ready');
    if (res.status !== 'ready') return;
    const { now } = res;
    expect(now.sunlit).toBe(now.sunElevationDeg > -1);
    expect(now.earthVisible).not.toBeNull();
    expect(now.hoursToNextChange === null || now.hoursToNextChange > 0).toBe(true);
  });

  it('uses the same evaluation as the candidate list', () => {
    loadYear2027();
    const req = { batteryWh: 50, loadW: 10 };
    const res = computePointStats(input({ req }));
    if (res.status !== 'ready') throw new Error('not ready');
    const same = evaluateSite(res.evaluation.site, missionStats(res.ts, WINDOW), req);
    expect(res.evaluation.checks.map((c) => c.status)).toEqual(same.checks.map((c) => c.status));
    expect(res.evaluation.checks).toHaveLength(1);
  });

  it('caches by rounded point, window and horizon', () => {
    loadYear2027();
    const a = pointTimeseries(input());
    const built = __buildCount();
    const b = pointTimeseries(input({ lat: 0.674161, lon: 23.473139 })); // same 4-decimal point
    expect(b).toBe(a);
    expect(__buildCount()).toBe(built);
    const c = pointTimeseries(input({ lat: 1.5 }));
    expect(c).not.toBe(a);
    expect(__buildCount()).toBe(built + 1);
    const d = pointTimeseries(input({ window: { ...WINDOW, endUtc: '2027-03-15T00:00:00Z' } }));
    expect(d).not.toBe(a);
    // Moving the Mission Clock inside the same hour does not rebuild "now" either.
    computePointStats(input({ nowIso: '2027-03-10T06:10:00Z' }));
    const n = __buildCount();
    computePointStats(input({ nowIso: '2027-03-10T06:50:00Z' }));
    expect(__buildCount()).toBe(n);
  });
});

describe('states', () => {
  it('is no_ephemeris outside 2026–2055', () => {
    expect(computePointStats(input({ nowIso: '2060-01-01T00:00:00Z' })).status).toBe(
      'no_ephemeris',
    );
    expect(
      computePointStats(
        input({ window: { startUtc: '2020-01-01T00:00:00Z', endUtc: '2020-02-01T00:00:00Z' } }),
      ).status,
    ).toBe('no_ephemeris');
    expect(inCoverage('2026-01-01T00:00:00Z', '2056-01-01T00:00:00Z')).toBe(true);
    expect(inCoverage('2025-12-31T00:00:00Z', '2026-02-01T00:00:00Z')).toBe(false);
  });

  it('is loading while the ephemeris is not in memory', () => {
    expect(computePointStats(input()).status).toBe('loading');
  });

  it.skipIf(!have)('is ready once the year is loaded', () => {
    loadYear2027();
    expect(computePointStats(input()).status).toBe('ready');
  });
});

describe('catalogue match and elevation', () => {
  const sites = [
    { id: 'a', lat: -89.5, lon: 170 },
    { id: 'b', lat: 0, lon: 179.9999 },
  ] as Site[];
  it('finds a site only at its own coordinates', () => {
    expect(findCatalogSite(sites, -89.5, 170)?.id).toBe('a');
    expect(findCatalogSite(sites, -89.5, 170.5)).toBeNull();
    expect(findCatalogSite(sites, 0, -179.9999)?.id).toBe('b'); // across the antimeridian
    expect(findCatalogSite(null, 0, 0)).toBeNull();
  });

  it('has no elevation outside the heightmap', () => {
    expect(elevationAt(null, null, null, -85, 0)).toEqual(FLAT);
  });
});
