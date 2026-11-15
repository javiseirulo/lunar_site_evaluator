import { afterEach, expect, it } from 'vitest';
import { __resetEphemForTests, __setEphemYearForTests } from '@/ephem';
import { matchesHorizon, observerSky, type TerrainSite } from './sky';
import type { HorizonProfile } from '@lunar/contracts';

afterEach(__resetEphemForTests);
const point: TerrainSite = {
  id: 'a',
  name: 'a',
  lat: 0,
  lon: 0,
  elev_m: 1000,
  slope_deg: 1,
  slope_coarse: false,
  source_url: 'https://example.test',
  precision: 'published_point',
  elevation_source: 'test',
  psr_dist_km: null,
  horizon_file: 'horizon/a.json',
};
const horizon: HorizonProfile = {
  version: 1,
  site_id: 'a',
  lat: 0,
  lon: 0,
  observer_height_m: 5,
  az_step_deg: 1,
  elev_deg: Array(360).fill(10),
  max_range_km: 310,
  source: 'test ridge',
};
function load() {
  const data = new Float32Array(12);
  for (let i = 0; i < 2; i++) data.set([0.01, 1, 0, 384400, 0, 0], i * 6);
  __setEphemYearForTests(2027, data);
}
it('uses real vectors and terrain at the current coordinates, not a static series', () => {
  load();
  const sky = observerSky(point, '2027-01-01T00:30:00Z', 5, point, horizon)!;
  expect(sky.sun_el).toBeLessThan(1);
  expect(sky.sun_az).toBeCloseTo(90);
  expect(sky.lit).toBe(false);
  expect(sky.terrainMatched).toBe(true);
  expect(sky.earth_km).toBeCloseTo(384400 - 1738.405);
  expect(sky.t_utc).toBe('2027-01-01T00:30:00Z');
});
it('recomputes the opposite side sky after moving and drops mismatched terrain', () => {
  load();
  const moved = observerSky({ lat: 0, lon: 180 }, '2027-01-01T00:00:00Z', 5, point, horizon)!;
  expect(moved.earth_el).toBeCloseTo(-90);
  expect(moved.earthVisible).toBe(false);
  expect(moved.terrainMatched).toBe(false);
  expect(moved.elevationKnown).toBe(false);
  expect(moved.horizonSource).toBe('flat (no terrain)');
});
it('does not reuse a 5 m horizon after changing eye height', () => {
  expect(matchesHorizon(horizon, point, 20)).toBe(false);
  expect(matchesHorizon({ ...horizon, elev_deg: [NaN] }, point, 5)).toBe(false);
});
it('leaves unavailable and out-of-range epochs unknown', () => {
  expect(observerSky(point, '2027-01-01T00:00:00Z')).toBeNull();
  load();
  expect(observerSky(point, '2056-01-01T00:00:00Z')).toBeNull();
});
