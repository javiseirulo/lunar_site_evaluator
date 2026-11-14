/**
 * Checks that whatever is in public/data (mock or real pipeline output) follows the contract.
 * Run after regenerating data: `pnpm test`.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { DataManifest, LayersManifest, SitesFile, Timeseries } from '@lunar/contracts';

const DATA = join(__dirname, '..', '..', 'public', 'data');
const read = <T>(p: string): T => JSON.parse(readFileSync(join(DATA, p), 'utf8')) as T;

describe('public/data follows contracts/types.ts', () => {
  const manifest = read<DataManifest>('manifest.json');
  const sites = read<SitesFile>('sites.json');
  const layers = read<LayersManifest>('layers.json');

  it('manifest has a valid time window', () => {
    expect(manifest.version).toBe(1);
    expect(Date.parse(manifest.time_range.start_utc)).toBeLessThan(
      Date.parse(manifest.time_range.end_utc),
    );
  });

  it('sites have unique ids, sane coordinates and 0–1 fractions', () => {
    const ids = sites.sites.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of sites.sites) {
      expect(s.lat).toBeGreaterThanOrEqual(-90);
      expect(s.lat).toBeLessThanOrEqual(0);
      expect(Math.abs(s.lon)).toBeLessThanOrEqual(180);
      expect(s.score).toBeGreaterThanOrEqual(0);
      expect(s.score).toBeLessThanOrEqual(1);
      expect(s.metrics.illum_pct).toBeGreaterThanOrEqual(0);
      expect(s.metrics.illum_pct).toBeLessThanOrEqual(1);
      expect(s.metrics.earth_vis_pct).toBeGreaterThanOrEqual(0);
      expect(s.metrics.earth_vis_pct).toBeLessThanOrEqual(1);
    }
  });

  it('every site has a timeseries with equal-length arrays inside the window', () => {
    const files = new Set(readdirSync(join(DATA, 'timeseries')));
    for (const s of sites.sites) {
      expect(files.has(`${s.id}.json`), `timeseries/${s.id}.json`).toBe(true);
      const ts = read<Timeseries>(`timeseries/${s.id}.json`);
      expect(ts.site_id).toBe(s.id);
      const n = ts.t_utc.length;
      expect(n).toBeGreaterThan(0);
      for (const key of ['sun_az', 'sun_el', 'earth_az', 'earth_el', 'lit'] as const) {
        expect(ts[key].length, `${s.id}.${key}`).toBe(n);
      }
      if (ts.earth_visible) expect(ts.earth_visible.length).toBe(n);
      expect(ts.t_utc[0]).toBe(manifest.time_range.start_utc);
    }
  });

  it('every layer points to an existing PNG and has a usable palette', () => {
    expect(layers.bounds_m).toHaveLength(4);
    for (const l of layers.layers) {
      expect(existsSync(join(DATA, l.file)), l.file).toBe(true);
      expect(l.palette.length).toBeGreaterThanOrEqual(2);
      expect(l.value_range[0]).toBeLessThan(l.value_range[1]);
    }
  });
});
