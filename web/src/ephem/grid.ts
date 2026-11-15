/**
 * Heat-map grids `data/grid/index.json` + `grid/<id>.bin` (python/export/grids.py; contract GridIndex).
 *
 *   const grid = await loadGrid('global_1deg');
 *   sampleGrid(grid, 'earth_vis_pct', lat, lon);   // number, NaN = no data / outside the grid
 *
 * Float32 LE, one width×height plane per metric in `def.metrics` order, row 0 = north (max_y).
 * Sampling is nearest cell (cell centres); no interpolation.
 */
import type { GridDef, GridIndex, RequirementKey } from '@lunar/contracts';
import { dataUrl } from '@/core';

export interface Grid {
  def: GridDef;
  window: GridIndex['window'];
  /** metrics.length × height × width values. */
  data: Float32Array;
}

let indexPromise: Promise<GridIndex> | null = null;
const cache = new Map<string, Promise<Grid>>();

function toFloat32LE(buf: ArrayBuffer): Float32Array {
  const view = new DataView(buf);
  const out = new Float32Array(buf.byteLength / 4);
  for (let i = 0; i < out.length; i++) out[i] = view.getFloat32(i * 4, true);
  return out;
}

/** Build a Grid from its index entry and the raw .bin bytes (checks the size). */
export function parseGrid(index: GridIndex, id: string, buf: ArrayBuffer): Grid {
  const def = index.grids.find((g) => g.id === id);
  if (!def) throw new Error(`grid "${id}" not in grid/index.json`);
  const expected = def.metrics.length * (def.n_times ?? 1) * def.width * def.height * 4;
  if (buf.byteLength !== expected)
    throw new Error(`${def.file}: ${buf.byteLength} bytes, expected ${expected}`);
  return { def, window: index.window, data: toFloat32LE(buf) };
}

/** Fetch (once) and decode a grid by id. */
export function loadGrid(id: string): Promise<Grid> {
  const hit = cache.get(id);
  if (hit) return hit;
  indexPromise ??= fetch(dataUrl('grid/index.json')).then((r) => {
    if (!r.ok) throw new Error(`grid/index.json: HTTP ${r.status}`);
    return r.json() as Promise<GridIndex>;
  });
  const p = indexPromise.then(async (index) => {
    const def = index.grids.find((g) => g.id === id);
    if (!def) throw new Error(`grid "${id}" not in grid/index.json`);
    const res = await fetch(dataUrl(def.file));
    if (!res.ok) throw new Error(`${def.file}: HTTP ${res.status}`);
    return parseGrid(index, id, await res.arrayBuffer());
  });
  p.catch(() => {
    cache.delete(id);
    indexPromise = null;
  });
  cache.set(id, p);
  return p;
}

/** Row/column of the cell containing lat/lon (degrees, lon east), or null when outside the grid. */
export function gridCell(def: GridDef, lat: number, lon: number): [number, number] | null {
  let fx: number;
  let fy: number;
  if (def.projection === 'equirectangular') {
    const l = ((((lon + 180) % 360) + 360) % 360) - 180;
    fx = (l + 180) / 360;
    fy = (90 - lat) / 180;
  } else {
    const [x0, y0, x1, y1] = def.bounds_m!;
    if (lat > def.lat_limit!) return null;
    const c = ((90 + lat) * Math.PI) / 180;
    const rho = 2 * def.radius_m! * Math.tan(c / 2);
    const lo = (lon * Math.PI) / 180;
    fx = (rho * Math.sin(lo) - x0) / (x1 - x0);
    fy = (y1 - rho * Math.cos(lo)) / (y1 - y0);
  }
  const col = Math.min(def.width - 1, Math.floor(fx * def.width));
  const row = Math.min(def.height - 1, Math.floor(fy * def.height));
  if (col < 0 || row < 0 || fx > 1 || fy > 1) return null;
  return [row, col];
}

/** Value of `metric` at lat/lon (nearest cell; first time slice). NaN when no data. */
export function sampleGrid(grid: Grid, metric: RequirementKey, lat: number, lon: number): number {
  const { def, data } = grid;
  const k = def.metrics.indexOf(metric);
  const cell = gridCell(def, lat, lon);
  if (k < 0 || !cell) return NaN;
  const plane = def.width * def.height;
  return data[k * plane * (def.n_times ?? 1) + cell[0] * def.width + cell[1]] ?? NaN;
}

/** Test hook: drop cached grids and index. */
export function __resetGridsForTests(): void {
  cache.clear();
  indexPromise = null;
}
