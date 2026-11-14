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
      // Whole Moon (docs/10 §10): any latitude.
      expect(s.lat).toBeLessThanOrEqual(90);
      // v1.1: region, when present, follows the documented rule (contracts/types.ts SiteRegion).
      if (s.region) {
        const expected =
          s.lat <= -80
            ? 'south_pole'
            : s.lat >= 80
              ? 'north_pole'
              : Math.abs(s.lon) <= 90
                ? 'near_side'
                : 'far_side';
        expect(s.region, `${s.id} region`).toBe(expected);
      }
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
      // Real data must include earth_visible (contracts/README.md v1.1).
      if (!ts.mock) expect(ts.earth_visible, `${s.id}.earth_visible`).toBeDefined();
      if (ts.earth_visible) expect(ts.earth_visible.length).toBe(n);
      // v1.1: sun_frac has the same length and lit = sun_frac >= 0.5.
      if (ts.sun_frac) {
        expect(ts.sun_frac.length, `${s.id}.sun_frac`).toBe(n);
        // One assertion per file (real data: 8760 samples × 59 sites); first bad index reported.
        const badFrac = ts.sun_frac.findIndex((f) => !(f >= 0 && f <= 1));
        expect(badFrac, `${s.id} sun_frac out of [0, 1] at`).toBe(-1);
        const badLit = ts.sun_frac.findIndex((f, i) => ts.lit[i] !== (f >= 0.5 ? 1 : 0));
        expect(badLit, `${s.id} lit vs sun_frac mismatch at`).toBe(-1);
      }
      expect(ts.t_utc[0]).toBe(manifest.time_range.start_utc);
    }
  }, 60_000);

  it("site metrics agree with that site's timeseries (same time window)", () => {
    for (const s of sites.sites) {
      const ts = read<Timeseries>(`timeseries/${s.id}.json`);
      const frac = (f: number[]) => f.reduce<number>((a, b) => a + b, 0) / f.length;
      // v1.1: illum_pct = mean(sun_frac) when the file has it, else mean(lit).
      expect(s.metrics.illum_pct, `${s.id} illum_pct vs sun_frac[]/lit[]`).toBeCloseTo(
        frac(ts.sun_frac ?? ts.lit),
        ts.sun_frac ? 2 : 1,
      );
      if (ts.earth_visible) {
        expect(s.metrics.earth_vis_pct, `${s.id} earth_vis_pct vs earth_visible[]`).toBeCloseTo(
          frac(ts.earth_visible),
          1,
        );
      }
      let run = 0;
      let longest = 0;
      for (const f of ts.lit) {
        run = f ? 0 : run + 1;
        longest = Math.max(longest, run);
      }
      // max_dark_hours can only be >= the longest night visible inside the file's window.
      expect(s.metrics.max_dark_hours, `${s.id} max_dark_hours`).toBeGreaterThanOrEqual(
        (longest * ts.step_s) / 3600 - 1,
      );
    }
  }, 60_000);

  it('every layer points to an existing PNG and has a usable palette', () => {
    expect(layers.bounds_m).toHaveLength(4);
    for (const l of layers.layers) {
      expect(existsSync(join(DATA, l.file)), l.file).toBe(true);
      expect(l.palette.length).toBeGreaterThanOrEqual(2);
      expect(l.value_range[0]).toBeLessThan(l.value_range[1]);
    }
  });
});
