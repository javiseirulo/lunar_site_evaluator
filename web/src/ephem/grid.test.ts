import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { GridIndex } from '@lunar/contracts';
import { gridCell, parseGrid, sampleGrid } from '.';

const DIR = join(__dirname, '../../public/data/grid');
const index = JSON.parse(readFileSync(join(DIR, 'index.json'), 'utf8')) as GridIndex;

function load(id: string) {
  const def = index.grids.find((g) => g.id === id)!;
  const b = readFileSync(join(DIR, '..', def.file));
  return parseGrid(index, id, b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
}

describe('heat-map grids (real files)', () => {
  it('global_1deg: dims and near/far side Earth visibility', () => {
    const g = load('global_1deg');
    expect([g.def.width, g.def.height]).toEqual([360, 180]);
    expect(g.def.projection).toBe('equirectangular');
    expect(gridCell(g.def, 89.9, -179.9)).toEqual([0, 0]);
    expect(sampleGrid(g, 'earth_vis_pct', 0.5, 0.5)).toBeCloseTo(1, 2);
    expect(sampleGrid(g, 'earth_vis_pct', 0.5, 179.5)).toBe(0);
    expect(sampleGrid(g, 'max_blackout_hours', 0, 180)).toBe(8760);
    const illum = sampleGrid(g, 'illum_pct', 10, 20);
    expect(illum).toBeGreaterThan(0.4);
    expect(illum).toBeLessThan(0.6);
  });

  it('south_5km: same bounds as layers.json, NaN outside lat_limit', () => {
    const g = load('south_5km');
    expect(g.def.width).toBe(g.def.height);
    expect(g.def.lat_limit).toBe(-80);
    expect(sampleGrid(g, 'illum_pct', -79, 0)).toBeNaN();
    expect(Number.isNaN(g.data[0])).toBe(true); // corner of row 0
    const pole = sampleGrid(g, 'illum_pct', -89.9, 0);
    expect(pole).toBeGreaterThan(0.4);
    expect(pole).toBeLessThan(0.7);
    expect(sampleGrid(g, 'sun_el_mean_deg', -89.9, 0)).toBeLessThan(1.5);
  });
});
